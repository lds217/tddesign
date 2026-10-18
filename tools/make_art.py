#!/usr/bin/env python3
"""Build the flower artwork in art/ from public-domain botanical plates.

Downloads each source plate from Wikimedia Commons (cached in tools/.cache/),
crops the parts we use, removes the paper background and writes WebP files
with transparency to art/.

Background removal: paper pixels connected to the image border are found by
flood fill (so enclosed white petals stay opaque); those pixels get a
"colour to alpha" value against the measured paper colour so soft edges and
shadows fade out smoothly.

Usage:  python3 tools/make_art.py          (needs Pillow, numpy, scipy)
"""
import json
import os
import urllib.parse
import urllib.request

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', '.cache')
OUT = os.path.join(ROOT, 'art')
UA = {'User-Agent': 'ThiepYen-art-builder/1.0'}

# All plates are in the public domain (artists died more than 100 years ago).
SOURCES = {
    'rose': 'File:Redoute - Rosa centifolia foliacea.jpg',                    # P.-J. Redouté, Les Roses (1817–24)
    'peony': 'File:Description des plantes rares cultivees a Malmaison et a Navarre '
             '(Paeonia suffruticosa subsp. suffruticosa) BHL275853.jpg',      # P.-J. Redouté (1812–17)
    'lotus': 'File:Nelumbo nucifera Blanco1.158.png',                         # F. M. Blanco, Flora de Filipinas (1880–83)
    'mume': 'File:Prunus mume SZ11.png',                                      # Siebold & Zuccarini, Flora Japonica (1835–70)
    'frangi': 'File:Frangipani - Unknown - 19 1927 2 69.jpg',                 # Company-school watercolour, Plumeria acutifolia
}

# name: (source, crop box (x0, y0, x1, y1) in source pixels, longest output side, options)
CROPS = {
    'rose-heads': ('rose', (20, 50, 1330, 880), 1000, {}),
    'rose-bud': ('rose', (20, 300, 470, 700), 420, {}),
    'peony-head': ('peony', (380, 300, 1880, 1150), 950, {'tol': 46, 'holes': True, 'q': 82}),
    'peony-bud': ('peony', (1360, 430, 1880, 1380), 520, {'tol': 46, 'holes': True, 'q': 82}),
    'lotus': ('lotus', (60, 130, 1330, 1610), 900, {}),
    'lotus-top': ('lotus', (60, 130, 1330, 1010), 1000, {}),
    'peach': ('mume', (250, 560, 480, 1650), 900, {'kill_grey': True}),
    'frangipani': ('frangi', (985, 2090, 1228, 2312), 600, {'tol': 30, 'rotated': -38}),
    # single peach blossoms for the scattered ("hoa nhí") tile
    'b-pink1': ('mume', (290, 1085, 465, 1240), 260, {'kill_grey': True}),
    'b-pink2': ('mume', (270, 1390, 445, 1560), 260, {'kill_grey': True}),
    'b-pink3': ('mume', (345, 705, 455, 812), 200, {'kill_grey': True}),
}


def fetch(key):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, key + '.img')
    if not os.path.exists(path):
        q = urllib.parse.urlencode({'action': 'query', 'titles': SOURCES[key], 'prop': 'imageinfo', 'iiprop': 'url', 'format': 'json'})
        d = json.load(urllib.request.urlopen(urllib.request.Request('https://commons.wikimedia.org/w/api.php?' + q, headers=UA)))
        url = next(iter(d['query']['pages'].values()))['imageinfo'][0]['url']
        with open(path, 'wb') as fh:
            fh.write(urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read())
    return Image.open(path).convert('RGB')


def paper_colour(img):
    a = np.asarray(img, dtype=np.float32)
    h, w, _ = a.shape
    b = max(8, int(min(w, h) * 0.02))
    border = np.concatenate([a[:b].reshape(-1, 3), a[-b:].reshape(-1, 3), a[:, :b].reshape(-1, 3), a[:, -b:].reshape(-1, 3)])
    return np.median(border, axis=0)


def cut_out(crop, paper, tol=20, kill_grey=False, holes=False):
    a = np.asarray(crop, dtype=np.float32)
    # colour-to-alpha against the paper colour (handles darker and lighter than paper)
    lo = np.where(a < paper, (paper - a) / np.maximum(paper, 1), 0)
    hi = np.where(a > paper, (a - paper) / np.maximum(255 - paper, 1), 0)
    c2a = np.clip(np.max(np.maximum(lo, hi), axis=2), 0, 1)
    # paper region = near-paper pixels connected to the crop border
    near = np.linalg.norm(a - paper, axis=2) < tol
    lab, _ = ndimage.label(near)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    if holes:
        # paper showing between branches is enclosed, so it never touches the border: drop big patches too
        sizes = ndimage.sum(near, lab, index=np.arange(lab.max() + 1))
        bg |= np.isin(lab, np.nonzero(sizes > near.size * 0.0015)[0][1:])
    bg = ndimage.binary_opening(bg, iterations=1)
    alpha = np.where(bg, c2a, 1.0)
    # remove paper grain / faint marks, keep soft edges
    alpha = np.clip((alpha - 0.08) / 0.5, 0, 1)
    if kill_grey:
        # drop the faint pencil sketches beside the painted sprig (low saturation, light)
        mx, mn = a.max(axis=2), a.min(axis=2)
        sat = (mx - mn) / np.maximum(mx, 1)
        alpha = np.where((sat < 0.18) & (mx > 120), alpha * 0.0, alpha)
    # despeckle: drop tiny isolated specks (paper stains, dust)
    lab2, n2 = ndimage.label(alpha > 0.1)
    if n2:
        sizes = ndimage.sum(np.ones_like(alpha), lab2, index=np.arange(n2 + 1))
        alpha = np.where(np.isin(lab2, np.nonzero(sizes < max(40, alpha.size * 0.00004))[0]) & (lab2 > 0), 0, alpha)
    alpha = ndimage.gaussian_filter(alpha, 0.6)
    # un-mix the paper colour from semi-transparent edge pixels
    am = np.maximum(alpha[..., None], 1e-3)
    rgb = np.where(alpha[..., None] < 0.999, (a - paper * (1 - am)) / am, a)
    rgb = np.clip(rgb, 0, 255)
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    # trim fully transparent margins
    ys, xs = np.nonzero(out[..., 3] > 8)
    if len(xs):
        out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return Image.fromarray(out, 'RGBA')


def build():
    os.makedirs(OUT, exist_ok=True)
    srcs = {}
    for name, (src, box, size, opt) in CROPS.items():
        if src not in srcs:
            img = fetch(src)
            srcs[src] = (img, paper_colour(img))
        img, _ = srcs[src]
        crop = img.crop(box)
        paper = paper_colour(crop)  # measure the paper next to this crop (plates are unevenly aged)
        art = cut_out(crop, paper, tol=opt.get('tol', 20), kill_grey=opt.get('kill_grey', False), holes=opt.get('holes', False))
        k = size / max(art.size)
        if k < 1:
            art = art.resize((round(art.width * k), round(art.height * k)), Image.LANCZOS)
        art.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=opt.get('q', 86), method=6)
        if opt.get('rotated'):
            r = art.rotate(opt['rotated'], expand=True, resample=Image.BICUBIC)
            r.crop(r.getbbox()).save(os.path.join(OUT, name + '-r.webp'), 'WEBP', quality=86, method=6)
        print(f'{name:12} {art.size}  {os.path.getsize(os.path.join(OUT, name + ".webp")) // 1024} KB')
    build_tile()


def build_tile(size=640):
    """Seamless tile of scattered blossoms for the "hoa nhí" background."""
    rng = np.random.default_rng(7)
    big = Image.new('RGBA', (size * 3, size * 3), (0, 0, 0, 0))
    names = ['b-pink1', 'b-pink3', 'b-pink2']
    flowers = [Image.open(os.path.join(OUT, n + '.webp')) for n in names]
    pts = [(80, 90), (300, 60), (520, 150), (180, 300), (420, 340), (600, 460), (90, 520), (320, 560), (470, 610)]
    for i, (x, y) in enumerate(pts):
        f = flowers[i % len(flowers)]
        s = rng.uniform(0.5, 0.72)
        g = f.resize((round(f.width * s), round(f.height * s)), Image.LANCZOS).rotate(rng.uniform(0, 360), expand=True, resample=Image.BICUBIC)
        for dx in (0, size, 2 * size):  # draw into all 9 copies so the tile wraps seamlessly
            for dy in (0, size, 2 * size):
                big.alpha_composite(g, (int(x + dx - g.width / 2 + size * 0), int(y + dy - g.height / 2)))
    tile = big.crop((size, size, size * 2, size * 2))
    tile.save(os.path.join(OUT, 'tile-blossoms.webp'), 'WEBP', quality=86, method=6)
    print('tile-blossoms', tile.size, os.path.getsize(os.path.join(OUT, 'tile-blossoms.webp')) // 1024, 'KB')


if __name__ == '__main__':
    build()

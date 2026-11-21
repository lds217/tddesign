#!/usr/bin/env python3
"""Build the flower artwork in art/ from public-domain botanical plates.

Downloads each source plate from Wikimedia Commons (cached in tools/.cache/),
crops the parts we use, removes the paper background and writes WebP files
with transparency to art/.

Background removal: paper pixels connected to the image border are found by
flood fill (so enclosed white petals stay opaque); those pixels get a
"colour to alpha" value against the measured paper colour so soft edges and
shadows fade out smoothly.

Usage:  python3 tools/make_art.py [crop ...]   (needs Pillow, numpy, scipy; no names = rebuild all)
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
    'tea': 'File:Camellia sinensis - Köhler–s Medizinal-Pflanzen-025.jpg',    # F. E. Köhler, Köhler's Medizinal-Pflanzen (1887)
}

# name: (source, crop box (x0, y0, x1, y1) in source pixels, longest output side, options)
CROPS = {
    'rose-heads': ('rose', (20, 50, 1330, 880), 1000, {'save': False, 'corners': {'rose-tl': ('tl', 800, True), 'rose-br': ('br', 900, False)}}),
    'peony-head': ('peony', (380, 300, 1880, 1150), 950, {'tol': 46, 'floor': 0.17, 'q': 82, 'save': False,
                   'corners': {'peony-tl': ('tl', 800, False), 'peony-br': ('br', 900, True)}}),
    'lotus': ('lotus', (60, 130, 1330, 1610), 900, {}),
    'lotus-top': ('lotus', (60, 130, 1330, 1010), 1000, {}),
    'peach': ('mume', (250, 560, 480, 1650), 900, {'kill_grey': True}),
    'frangipani': ('frangi', (978, 2092, 1235, 2400), 600, {'tol': 13, 'blur': 1.5, 'fill': 8, 'fill_to': 0.7, 'floor': 0.18, 'holes': False,
                   'keep_top': 0.715, 'fade': 0.05, 'rotated': -38}),
    # single peach blossoms for the scattered ("hoa nhí") tile
    'b-pink1': ('mume', (290, 1085, 465, 1240), 260, {'kill_grey': True}),
    'b-pink2': ('mume', (270, 1390, 445, 1560), 260, {'kill_grey': True}),
    'b-pink3': ('mume', (345, 705, 455, 812), 200, {'kill_grey': True}),
    # tea branch (green leaves, white flowers) for the usage-guide card. The scan's paper is lighter at the top
    # and grainy, so it is matched against a fitted paper surface; small numbered diagrams beside the branch are erased.
    'tea-branch': ('tea', (150, 30, 1235, 1420), 1000, {'surface': True, 'flat': True, 'gap': 4, 'tol': 22, 'blur': 3, 'floor': 0.12, 'hi_floor': 60,
                   'erase': [(150, 150, 262, 510), (140, 600, 200, 880), (140, 1180, 242, 1330), (575, 1362, 610, 1402),
                             (1165, 1262, 1235, 1420), (1040, 30, 1235, 110)],
                   'save': False, 'corners': {'tea-bl': ('bl', 1000, False)}}),
    'tea-sprig': ('tea', (320, 30, 1010, 490), 700, {'surface': True, 'flat': True, 'gap': 4, 'tol': 22, 'blur': 3, 'floor': 0.12, 'hi_floor': 60,
                  'save': False, 'corners': {'tea-tr': ('tr', 640, False)}}),
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


def paper_surface(a):
    """Per-pixel paper colour for unevenly lit scans: a quadratic surface fitted to clean, unpainted paper."""
    h, w, _ = a.shape
    mx, mn = a.max(2), a.min(2)
    cand = ((mx - mn) / np.maximum(mx, 1) < 0.06) & (mx > 190)
    cand = ndimage.binary_erosion(cand, iterations=12)  # stay well away from paint (and white petals)
    ys, xs = np.nonzero(cand)
    pick = np.random.default_rng(0).choice(len(xs), min(40000, len(xs)), replace=False)
    ys, xs = ys[pick], xs[pick]
    X, Y = xs / w, ys / h
    A = np.stack([np.ones_like(X), X, Y, X * X, X * Y, Y * Y], 1)
    gx, gy = np.meshgrid(np.arange(w) / w, np.arange(h) / h)
    G = np.stack([np.ones_like(gx), gx, gy, gx * gx, gx * gy, gy * gy], -1)
    out = np.zeros_like(a)
    for c in range(3):
        coef = np.linalg.lstsq(A, a[ys, xs, c], rcond=None)[0]
        out[..., c] = G @ coef
    return out


def enclosed_paper(a, paper, near, gap, flat_sd=3.5):
    """Paper mask for plates whose white petals have broken pencil outlines.
    Small gaps in the outlines are closed first so the border flood fill cannot leak into a petal.
    Patches the fill cannot reach count as paper only when flat and neutral grey (paper trapped between
    stems); white petals are shaded or tinted cream, so they stay."""
    barrier = ndimage.binary_closing(~near, iterations=gap) if gap else ~near
    open_ = near & ~barrier
    lab, n = ndimage.label(open_)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    idx = np.arange(n + 1)
    lum = a.mean(2)
    m1 = ndimage.mean(lum, lab, idx)
    sd = np.sqrt(np.maximum(ndimage.mean(lum * lum, lab, idx) - m1 * m1, 0))
    chroma = (a[..., 0] + a[..., 1]) / 2 - a[..., 2] - ((paper[..., 0] + paper[..., 1]) / 2 - paper[..., 2])
    isbg = (ndimage.sum(open_, lab, idx) >= 150) & (sd < flat_sd) & (ndimage.mean(chroma, lab, idx) < 0.6)
    isbg[edge] = True
    isbg[0] = False
    bg = isbg[lab]
    # give back the strip of paper the closing took next to each outline
    return bg | (ndimage.binary_dilation(bg, iterations=gap + 1) & near) if gap else bg


def cut_out(crop, paper, tol=20, kill_grey=False, holes=True, floor=0.08, blur=0, fill=0, fill_to=1.0,
            surface=False, flat=False, gap=0, hi_floor=1):
    a = np.asarray(crop, dtype=np.float32)
    if surface:
        paper = paper_surface(a)
    # colour-to-alpha against the paper colour (handles darker and lighter than paper)
    # (hi_floor: on near-white paper, don't let faint grain brighter than the paper turn fully opaque)
    lo = np.where(a < paper, (paper - a) / np.maximum(paper, 1), 0)
    hi = np.where(a > paper, (a - paper) / np.maximum(255 - paper, hi_floor), 0)
    c2a = np.clip(np.max(np.maximum(lo, hi), axis=2), 0, 1)
    # paper region = near-paper pixels connected to the crop border
    # blur first for white flowers on cream paper: smooths the paper grain so pale petals separate cleanly
    ab = ndimage.gaussian_filter(a, (blur, blur, 0)) if blur else a
    near = np.linalg.norm(ab - paper, axis=2) < tol
    if flat:
        bg = enclosed_paper(a, paper, near, gap)
        holes = False
    else:
        lab, _ = ndimage.label(near)
        edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        bg = np.isin(lab, edge[edge > 0])
    if holes:
        # paper showing between stems and leaves is enclosed, so it never touches the border: drop those patches too
        # (stricter colour match than the outer paper, so pale petals are not mistaken for paper)
        near2 = np.linalg.norm(a - paper, axis=2) < tol * 0.55
        lab2, _ = ndimage.label(near2)
        sizes = ndimage.sum(near2, lab2, index=np.arange(lab2.max() + 1))
        bg |= np.isin(lab2, np.nonzero(sizes > max(60, near2.size * 0.0002))[0][1:])
    bg = ndimage.binary_opening(bg, iterations=1)
    if fill:
        # white petals on cream paper: the pencil outline encloses each petal, so fill everything inside it
        fg = ndimage.binary_fill_holes(ndimage.binary_closing(~bg, iterations=fill))
        fg[int(fg.shape[0] * fill_to):] = False  # only fill the petals, not the paper beside a stem below them
        bg &= ~fg
    alpha = np.where(bg, c2a, 1.0)
    # remove paper grain / faint marks, keep soft edges
    alpha = np.clip((alpha - floor) / 0.5, 0, 1)
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


def fade_cut_edges(img, frac=0.18, min_touch=0.02):
    """Fade out any side where the crop cut through paint, so it never shows as a hard line."""
    a = np.asarray(img).astype(np.float32)
    al = a[..., 3] / 255
    h, w = al.shape
    sides = []
    for side, edge in (('top', al[:2].max(0)), ('bottom', al[-2:].max(0)), ('left', al[:, :2].max(1)), ('right', al[:, -2:].max(1))):
        if (edge > 0.35).mean() > min_touch:
            sides.append(side)
            n = max(4, int((h if side in ('top', 'bottom') else w) * frac))
            t = np.linspace(0, 1, n)
            ramp = t * t * (3 - 2 * t)  # smoothstep
            if side == 'top':
                al[:n] *= ramp[:, None]
            elif side == 'bottom':
                al[-n:] *= ramp[::-1][:, None]
            elif side == 'left':
                al[:, :n] *= ramp[None, :]
            else:
                al[:, -n:] *= ramp[::-1][None, :]
    a[..., 3] = al * 255
    return Image.fromarray(a.astype(np.uint8), 'RGBA'), sides


def corner_piece(art, corner='tl', flip=False):
    """Rotate a crop whose bottom edge is a cut, so that the cut points diagonally out of a card corner,
    then crop it so the cut line passes exactly through that corner of the image.
    Placed flush in the card corner, the cut is never visible: the art seems to grow out of the corner."""
    if flip:
        art = art.transpose(Image.FLIP_LEFT_RIGHT)
    theta = {'tl': -135, 'tr': 135, 'br': 45, 'bl': -45}[corner]  # degrees, counter-clockwise as PIL.rotate
    w, h = art.size
    r = art.rotate(theta, expand=True, resample=Image.BICUBIC)
    W, H = r.size
    t = np.radians(theta)

    def to_rot(x, y):
        dx, dy = x - w / 2, y - h / 2
        return (dx * np.cos(t) + dy * np.sin(t) + W / 2, -dx * np.sin(t) + dy * np.cos(t) + H / 2)

    (x1, y1), (x2, y2) = to_rot(0, h), to_rot(w, h)
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    fx, fy, cx, cy = int(np.floor(mx)), int(np.floor(my)), int(np.ceil(mx)), int(np.ceil(my))
    out = r.crop({'tl': (fx, fy, W, H), 'tr': (0, fy, cx, H), 'br': (0, 0, cx, cy), 'bl': (fx, 0, W, cy)}[corner])
    bb = out.getbbox()
    # keep the corner itself fixed; only trim transparent margin on the far sides
    w, h = out.size
    return out.crop({'tl': (0, 0, bb[2], bb[3]), 'tr': (bb[0], 0, w, bb[3]), 'br': (bb[0], bb[1], w, h), 'bl': (0, bb[1], bb[2], h)}[corner])


def build(only=None):
    os.makedirs(OUT, exist_ok=True)
    srcs = {}
    for name, (src, box, size, opt) in CROPS.items():
        if only and name not in only:
            continue
        if src not in srcs:
            img = fetch(src)
            srcs[src] = (img, paper_colour(img))
        img, _ = srcs[src]
        crop = img.crop(box)
        if opt.get('erase'):
            # paint over small labelled diagrams that overlap the crop (boxes in plate pixels)
            a = np.asarray(crop, dtype=np.float32)
            p = paper_surface(a)
            for x0, y0, x1, y1 in opt['erase']:
                x0, y0, x1, y1 = max(0, x0 - box[0]), max(0, y0 - box[1]), x1 - box[0], y1 - box[1]
                a[y0:y1, x0:x1] = p[y0:y1, x0:x1]
            crop = Image.fromarray(a.astype(np.uint8))
        paper = paper_colour(crop)  # measure the paper next to this crop (plates are unevenly aged)
        art = cut_out(crop, paper, tol=opt.get('tol', 20), kill_grey=opt.get('kill_grey', False),
                      holes=opt.get('holes', True), floor=opt.get('floor', 0.08), blur=opt.get('blur', 0), fill=opt.get('fill', 0), fill_to=opt.get('fill_to', 1.0),
                      surface=opt.get('surface', False), flat=opt.get('flat', False), gap=opt.get('gap', 0), hi_floor=opt.get('hi_floor', 1))
        if 'keep_top' in opt:
            # trim away what hangs below the flower (e.g. a bare stem) after the cut-out is done
            art = art.crop((0, 0, art.width, round(art.height * opt['keep_top'])))
            art = art.crop(art.getbbox())
        for cname, (corner, size_c, flip) in opt.get('corners', {}).items():
            c = corner_piece(art, corner, flip)
            k2 = size_c / max(c.size)
            if k2 < 1:
                c = c.resize((round(c.width * k2), round(c.height * k2)), Image.LANCZOS)
            c.save(os.path.join(OUT, cname + '.webp'), 'WEBP', quality=opt.get('q', 86), method=6)
            print(f'{cname:12} {c.size}  {os.path.getsize(os.path.join(OUT, cname + ".webp")) // 1024} KB  corner {corner}')
        cut = []
        if not opt.get('keep_edges'):
            art, cut = fade_cut_edges(art, frac=opt.get('fade', 0.18))
        k = size / max(art.size)
        if k < 1:
            art = art.resize((round(art.width * k), round(art.height * k)), Image.LANCZOS)
        if opt.get('save', True) is False:  # only used to make the corner pieces
            print(f'{name:12} (source for corners only)')
            continue
        art.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=opt.get('q', 86), method=6)
        if opt.get('rotated'):
            r = art.rotate(opt['rotated'], expand=True, resample=Image.BICUBIC)
            r.crop(r.getbbox()).save(os.path.join(OUT, name + '-r.webp'), 'WEBP', quality=86, method=6)
        print(f'{name:12} {art.size}  {os.path.getsize(os.path.join(OUT, name + ".webp")) // 1024} KB  faded: {",".join(cut) or "-"}')
    if not only or 'tile-blossoms' in only:
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
    import sys
    build(sys.argv[1:] or None)  # optional: names of crops to rebuild, e.g. tea-branch tea-sprig

#!/usr/bin/env python3
"""Cut a product photo out of its background and save it as a WebP with transparency in art/.

Two modes:
  light  the object sits on a plain white/light background (typical product shot):
         background pixels connected to the photo border are removed by flood fill.
  red    pick out red/red-brown things (dried red dates, goji berries) from a busy,
         lighter background by colour; parts touching the crop border are dropped.

Usage:
  python3 tools/cut_photo.py light photo.jpg art/nest-board.webp
  python3 tools/cut_photo.py red   photo.png art/dates.webp --box 760,700,1060,990
Options: --box x0,y0,x1,y1 (crop first, photo pixels)  --tol N (light: colour tolerance, default 14)
         --size N (longest side of the output, default 900)

Needs Pillow, numpy, scipy.
"""
import argparse

import numpy as np
from PIL import Image
from scipy import ndimage


def keep_big(mask, min_frac):
    lab, n = ndimage.label(mask)
    if not n:
        return mask
    sizes = ndimage.sum(mask, lab, range(n + 1))
    keep = np.nonzero(sizes > mask.size * min_frac)[0]
    return np.isin(lab, keep[keep > 0])


def light_bg(img, tol=14):
    a = np.asarray(img.convert('RGB'), dtype=np.float32)
    rim = np.concatenate([a[:3].reshape(-1, 3), a[-3:].reshape(-1, 3), a[:, :3].reshape(-1, 3), a[:, -3:].reshape(-1, 3)])
    bgc = np.median(rim, 0)
    dist = np.linalg.norm(a - bgc, axis=2)
    lab, _ = ndimage.label(dist < tol)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    fg = ~np.isin(lab, edge[edge > 0])
    fg = keep_big(ndimage.binary_opening(fg, iterations=1), 0.002)
    fg = ndimage.binary_erosion(ndimage.binary_fill_holes(fg), iterations=1)
    alpha = ndimage.gaussian_filter(fg.astype(np.float32), 1.0)
    # wispy edges close to the background colour fade out instead of keeping a white fringe
    alpha = np.where(alpha < 0.999, alpha * np.maximum(np.clip(dist / (tol * 2.5), 0, 1), 0.35), alpha)
    return np.dstack([a, alpha * 255])


def red_things(img):
    a = np.asarray(img.convert('RGBA'), dtype=np.float32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx, mn = a[..., :3].max(2), a[..., :3].min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    red = (r > g * 1.35) & (r > b * 1.35) & (sat > 0.45) & (al > 200)
    m = red | ((mx < 90) & (al > 200))  # + the deep dark folds of dried fruit
    m = ndimage.binary_opening(ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=2)), iterations=2)
    # drop anything yellow/beige that the hole filling pulled in (a spoon, a wheat crumb)
    m &= ~((g > r * 0.72) & (mx > 70))
    m = ndimage.binary_opening(m, iterations=2)
    lab, n = ndimage.label(m)
    keep = []
    for i in range(1, n + 1):
        part = lab == i
        ys, xs = np.nonzero(part)
        touches = ys.min() == 0 or xs.min() == 0 or ys.max() == m.shape[0] - 1 or xs.max() == m.shape[1] - 1
        if part.sum() > 400 and not touches and red[part].mean() > 0.35:  # whole red things only
            keep.append(i)
    m = np.isin(lab, keep)
    alpha = ndimage.gaussian_filter(m.astype(np.float32), 0.8) * (al / 255)
    return np.dstack([a[..., :3], alpha * 255])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('mode', choices=['light', 'red'])
    ap.add_argument('src')
    ap.add_argument('out')
    ap.add_argument('--box')
    ap.add_argument('--tol', type=float, default=14)
    ap.add_argument('--size', type=int, default=900)
    o = ap.parse_args()
    img = Image.open(o.src)
    if o.box:
        img = img.crop(tuple(int(v) for v in o.box.split(',')))
    out = light_bg(img, o.tol) if o.mode == 'light' else red_things(img)
    out = out.astype(np.uint8)
    ys, xs = np.nonzero(out[..., 3] > 8)
    res = Image.fromarray(out[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')
    k = o.size / max(res.size)
    if k < 1:
        res = res.resize((round(res.width * k), round(res.height * k)), Image.LANCZOS)
    res.save(o.out, 'WEBP', quality=86, method=6)
    print(o.out, res.size)


if __name__ == '__main__':
    main()

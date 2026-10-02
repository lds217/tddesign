/* Viền cắt ôm theo hình chữ (contour) cho sticker.
 * Cách làm: vẽ chữ của thiệp lên canvas → tính khoảng cách tới nét chữ gần nhất
 * → lấy đường đồng mức ở khoảng cách D (lấp các lỗ bên trong) → đường SVG mượt (đơn vị mm). */
(function (global) {
  'use strict';

  const PX = 96 / 25.4;

  // Biến đổi khoảng cách 1 chiều (Felzenszwalb & Huttenlocher)
  function edt1d(f, n, d, v, z) {
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      const dq = q - v[k];
      d[q] = dq * dq + f[v[k]];
    }
  }

  // Khoảng cách (px) từ mỗi điểm tới điểm mực gần nhất
  function distanceField(mask, w, h) {
    const INF = 1e20;
    const g = new Float64Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = mask[i] ? 0 : INF;
    const n = Math.max(w, h);
    const f = new Float64Array(n);
    const d = new Float64Array(n);
    const v = new Int32Array(n);
    const z = new Float64Array(n + 1);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) f[y] = g[y * w + x];
      edt1d(f, h, d, v, z);
      for (let y = 0; y < h; y++) g[y * w + x] = d[y];
    }
    for (let y = 0; y < h; y++) {
      const o = y * w;
      for (let x = 0; x < w; x++) f[x] = g[o + x];
      edt1d(f, w, d, v, z);
      for (let x = 0; x < w; x++) g[o + x] = Math.sqrt(d[x]);
    }
    return g;
  }

  // Vẽ hình chữ (và logo) của thiệp lên canvas. Thiệp phải ở trạng thái không xoay.
  function drawInk(card, ctx, R, margin, wmm, hmm) {
    const cr = card.getBoundingClientRect();
    const kx = (wmm * R) / cr.width;
    const ky = (hmm * R) / cr.height;
    const content = card.querySelector('.content') || card;
    const range = document.createRange();
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    let any = false;
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'alphabetic';
    let node;
    while ((node = walker.nextNode())) {
      const el = node.parentElement;
      const text = node.textContent;
      if (!el || !text.trim()) continue;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize) * ky;
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
      const upper = cs.textTransform === 'uppercase';
      const asc = (() => {
        const m = ctx.measureText('Hg');
        return m.fontBoundingBoxAscent != null ? m.fontBoundingBoxAscent : size * 0.85;
      })();
      let run = '';
      let rx = 0;
      let ry = null;
      const flush = () => {
        if (run.trim()) {
          ctx.fillText(run, rx, ry + asc);
          any = true;
        }
        run = '';
        ry = null;
      };
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '\n') { flush(); continue; }
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const rects = range.getClientRects();
        if (!rects.length) continue;
        const r = rects[0];
        const top = (r.top - cr.top) * ky + margin;
        const left = (r.left - cr.left) * kx + margin;
        if (ry === null || Math.abs(top - ry) > size * 0.3) {
          flush();
          if (ch === ' ') continue;
          ry = top;
          rx = left;
        }
        run += upper ? ch.toUpperCase() : ch;
      }
      flush();
    }
    content.querySelectorAll('img').forEach((img) => {
      const r = img.getBoundingClientRect();
      try {
        ctx.drawImage(img, (r.left - cr.left) * kx + margin, (r.top - cr.top) * ky + margin, r.width * kx, r.height * ky);
        any = true;
      } catch (e) { /* ảnh chưa tải xong */ }
    });
    return any;
  }

  // Dò đường đồng mức val = 0 (marching squares), trả về các vòng khép kín
  function trace(val, w, h) {
    const nb = new Map();
    const link = (a, b) => {
      let x = nb.get(a);
      if (!x) nb.set(a, (x = []));
      x.push(b);
      let y = nb.get(b);
      if (!y) nb.set(b, (y = []));
      y.push(a);
    };
    const H = (x, y) => (y * w + x) * 2; // cạnh ngang (x,y)-(x+1,y)
    const V = (x, y) => (y * w + x) * 2 + 1; // cạnh dọc (x,y)-(x,y+1)
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const tl = val[y * w + x];
        const tr = val[y * w + x + 1];
        const br = val[(y + 1) * w + x + 1];
        const bl = val[(y + 1) * w + x];
        const c = (tl < 0 ? 8 : 0) | (tr < 0 ? 4 : 0) | (br < 0 ? 2 : 0) | (bl < 0 ? 1 : 0);
        if (c === 0 || c === 15) continue;
        const T = H(x, y), B = H(x, y + 1), L = V(x, y), Rr = V(x + 1, y);
        switch (c) {
          case 1: case 14: link(L, B); break;
          case 2: case 13: link(B, Rr); break;
          case 3: case 12: link(L, Rr); break;
          case 4: case 11: link(T, Rr); break;
          case 6: case 9: link(T, B); break;
          case 7: case 8: link(L, T); break;
          case 5: case 10: {
            const mid = (tl + tr + br + bl) / 4 < 0;
            if ((c === 5) === mid) { link(L, T); link(B, Rr); } else { link(T, Rr); link(L, B); }
            break;
          }
          default: break;
        }
      }
    }
    const pt = (key) => {
      const e = key >> 1;
      const x = e % w;
      const y = (e - x) / w;
      if (key & 1) {
        const a = val[y * w + x], b = val[(y + 1) * w + x];
        return [x + 0.5, y + 0.5 + a / (a - b)];
      }
      const a = val[y * w + x], b = val[y * w + x + 1];
      return [x + 0.5 + a / (a - b), y + 0.5];
    };
    const seen = new Set();
    const loops = [];
    for (const start of nb.keys()) {
      if (seen.has(start)) continue;
      const loop = [];
      let prev = -1;
      let cur = start;
      while (cur !== undefined && !seen.has(cur)) {
        seen.add(cur);
        loop.push(pt(cur));
        const n = nb.get(cur);
        const next = n[0] !== prev && !seen.has(n[0]) ? n[0] : n[1] !== prev && !seen.has(n[1]) ? n[1] : undefined;
        prev = cur;
        cur = next;
      }
      if (loop.length > 6) loops.push(loop);
    }
    return loops;
  }

  function area(p) {
    let s = 0;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]);
    return Math.abs(s / 2);
  }

  // Thưa điểm rồi nối bằng đường cong bậc hai qua trung điểm → viền mượt
  function smoothPath(loop, step, toMm) {
    const pts = [loop[0]];
    for (let i = 1; i < loop.length; i++) {
      const l = pts[pts.length - 1];
      if (Math.hypot(loop[i][0] - l[0], loop[i][1] - l[1]) >= step) pts.push(loop[i]);
    }
    if (pts.length < 4) return '';
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const fmt = (p) => `${toMm(p[0])} ${toMm(p[1])}`;
    let d = `M${fmt(mid(pts[n - 1], pts[0]))}`;
    for (let i = 0; i < n; i++) d += `Q${fmt(pts[i])} ${fmt(mid(pts[i], pts[(i + 1) % n]))}`;
    return d + 'Z';
  }

  /* card: phần tử .card không xoay; offsetMm: khoảng cách viền tới chữ (mm) */
  function path(card, offsetMm) {
    const wmm = parseFloat(card.style.width);
    const hmm = parseFloat(card.style.height);
    if (!(wmm > 0 && hmm > 0)) return '';
    const R = Math.max(2.5, Math.min(6, Math.sqrt(1.3e6 / (wmm * hmm)))); // px mỗi mm
    const D = offsetMm * R;
    const margin = Math.ceil(D + 4);
    const W = Math.ceil(wmm * R + 2 * margin);
    const Hh = Math.ceil(hmm * R + 2 * margin);
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = Hh;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    if (!drawInk(card, ctx, R, margin, wmm, hmm)) return '';
    const px = ctx.getImageData(0, 0, W, Hh).data;
    const N = W * Hh;
    const mask = new Uint8Array(N);
    for (let i = 0; i < N; i++) mask[i] = px[i * 4 + 3] > 90 ? 1 : 0;
    const dist = distanceField(mask, W, Hh);

    // Vùng ngoài nối với mép canvas; phần còn lại (kể cả lỗ bên trong) coi là bên trong
    const outside = new Uint8Array(N);
    const queue = new Int32Array(N);
    let qh = 0, qt = 0;
    const push = (i) => { if (!outside[i] && dist[i] > D) { outside[i] = 1; queue[qt++] = i; } };
    for (let x = 0; x < W; x++) { push(x); push((Hh - 1) * W + x); }
    for (let y = 0; y < Hh; y++) { push(y * W); push(y * W + W - 1); }
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % W;
      if (x > 0) push(i - 1);
      if (x < W - 1) push(i + 1);
      if (i >= W) push(i - W);
      if (i < N - W) push(i + W);
    }
    const val = new Float32Array(N);
    for (let i = 0; i < N; i++) val[i] = outside[i] ? dist[i] - D : Math.min(-0.01, dist[i] - D);

    const toMm = (p) => Math.round(((p - margin) / R) * 100) / 100;
    const minArea = Math.max(4, D * D * 0.3);
    return trace(val, W, Hh)
      .filter((l) => area(l) > minArea)
      .map((l) => smoothPath(l, Math.max(1.5, R * 0.35), toMm))
      .join('');
  }

  global.Contour = { path };
})(window);

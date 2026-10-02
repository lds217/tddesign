/* Họa tiết trang trí (SVG).
 * Mọi hàm trả về chuỗi SVG, toạ độ tính bằng mm của chính tấm thiệp
 * nên hình không bị méo khi đổi kích thước thiệp. */
(function (global) {
  'use strict';

  const f = (n) => Math.round(n * 100) / 100;

  /* ---------- Chim yến (nhìn từ dưới lên, cánh xoè) — khung 100 x 64, tâm (50, 35) ---------- */
  const SWALLOW =
    'M50 12C53 12 55 15 55 18C55 20 54.6 22 54 24C64 18 80 10 98 8C86 16 70 26 56 32' +
    'C55 35 54.5 37 54 39L61 62L50 48L39 62L46 39C45.5 37 45 35 44 32C30 26 14 16 2 8' +
    'C20 10 36 18 46 24C45.4 22 45 20 45 18C45 15 47 12 50 12Z';

  function swallow(cx, cy, size, color, rot = 0, flip = false) {
    const s = size / 100;
    return `<path d="${SWALLOW}" fill="${color}" transform="translate(${f(cx)} ${f(cy)}) rotate(${rot}) scale(${f(flip ? -s : s)} ${f(s)}) translate(-50 -35)"/>`;
  }

  // Đàn chim yến, (cx, cy) là tâm đàn
  const FLOCK = [
    [0, 0, 1, -14], [-0.95, 0.3, 0.78, -8], [0.9, -0.32, 0.7, -20],
    [-0.4, -0.5, 0.5, -10], [0.45, 0.5, 0.45, -16], [1.55, 0.15, 0.42, -22],
  ];
  function flock(cx, cy, size, color, n = 3) {
    return FLOCK.slice(0, n)
      .map(([dx, dy, k, r]) => swallow(cx + dx * size, cy + dy * size, size * k, color, r))
      .join('');
  }

  /* ---------- Hoa mai / hoa đào 5 cánh ---------- */
  const FLOWER = {
    mai: { petal: '#FFD43B', edge: '#E9A800', heart: '#D9480F', bud: '#F5B700' },
    dao: { petal: '#FFC2D4', edge: '#F08AAA', heart: '#C2255C', bud: '#F783AC' },
  };

  function blossom(cx, cy, r, kind = 'mai', rot = 0) {
    const c = FLOWER[kind] || FLOWER.mai;
    let o = `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${rot})">`;
    for (let i = 0; i < 5; i++) {
      const a = ((i * 72 - 90) * Math.PI) / 180;
      o += `<circle cx="${f(Math.cos(a) * r * 0.52)}" cy="${f(Math.sin(a) * r * 0.52)}" r="${f(r * 0.46)}" fill="${c.petal}" stroke="${c.edge}" stroke-width="${f(r * 0.05)}"/>`;
    }
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = ((i * 36 + 18) * Math.PI) / 180;
      d += `M0 0L${f(Math.cos(a) * r * 0.38)} ${f(Math.sin(a) * r * 0.38)}`;
    }
    o += `<path d="${d}" stroke="${c.heart}" stroke-width="${f(r * 0.045)}" stroke-linecap="round"/>`;
    for (let i = 0; i < 10; i++) {
      const a = ((i * 36 + 18) * Math.PI) / 180;
      o += `<circle cx="${f(Math.cos(a) * r * 0.4)}" cy="${f(Math.sin(a) * r * 0.4)}" r="${f(r * 0.065)}" fill="${c.heart}"/>`;
    }
    o += `<circle r="${f(r * 0.15)}" fill="${c.heart}"/></g>`;
    return o;
  }

  function bud(cx, cy, r, kind = 'mai', rot = 0) {
    const c = FLOWER[kind] || FLOWER.mai;
    return `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${rot})"><ellipse rx="${f(r * 0.75)}" ry="${f(r)}" fill="${c.bud}" stroke="${c.edge}" stroke-width="${f(r * 0.1)}"/><path d="M${f(-r * 0.6)} ${f(r * 0.7)}Q0 ${f(r * 1.5)} ${f(r * 0.6)} ${f(r * 0.7)}" fill="#6B8E23"/></g>`;
  }

  // Cành mai/đào mọc từ (x, y) sang phải (flip = sang trái). Khung gốc rộng 100.
  function branch(x, y, width, kind = 'mai', flip = false) {
    const s = width / 100;
    const tr = `translate(${f(x)} ${f(y)}) scale(${f(flip ? -s : s)} ${f(s)})`;
    const bark = '#5B3A24';
    let o = `<g transform="${tr}" fill="none" stroke="${bark}" stroke-linecap="round">`;
    o += '<path d="M-3 4C14 6 26 12 40 12C54 12 66 18 80 17C88 16.5 94 18 99 20" stroke-width="2.6"/>';
    o += '<path d="M24 10C29 18 33 25 41 31" stroke-width="1.5"/>';
    o += '<path d="M50 13C55 7 61 3 69 1" stroke-width="1.3"/>';
    o += '<path d="M70 17C74 25 77 31 80 38" stroke-width="1.3"/>';
    o += '<path d="M9 6C11 13 10 19 13 25" stroke-width="1.1"/>';
    o += '<path d="M88 17.5C92 12 95 10 99 9" stroke-width="1"/>';
    o += '</g>';
    o += `<g transform="${tr}">`;
    [[3, 8, 2.2, 10], [32, 22, 2, -20], [58, 6, 2, 30], [76, 28, 2.1, -10], [95, 11, 1.8, 40], [92, 22, 1.7, 5]]
      .forEach(([bx, by, r, rot]) => (o += bud(bx, by, r, kind, rot)));
    [[18, 9, 6, 10], [41, 31, 6.5, 30], [44, 13, 7, 0], [69, 1, 5.5, 20], [80, 38, 5.8, 50],
      [99, 20, 5, 15], [13, 25, 4.8, 40], [29, 15, 4.2, 25], [84, 16.5, 4.4, 60]]
      .forEach(([cx, cy, r, rot]) => (o += blossom(cx, cy, r, kind, rot)));
    o += '</g>';
    return o;
  }

  /* ---------- Đèn lồng ---------- */
  function lantern(cx, top, string, size, red, gold) {
    const s = size / 57;
    let o = `<line x1="${f(cx)}" y1="${f(top)}" x2="${f(cx)}" y2="${f(top + string)}" stroke="${gold}" stroke-width="${f(s * 0.9)}"/>`;
    o += `<g transform="translate(${f(cx)} ${f(top + string)}) scale(${f(s)})">`;
    o += `<rect x="-6" y="0" width="12" height="4" rx="1" fill="${gold}"/>`;
    o += `<ellipse cx="0" cy="21" rx="14" ry="17.5" fill="${red}" stroke="${gold}" stroke-width="0.9"/>`;
    o += `<ellipse cx="0" cy="21" rx="8.5" ry="17.5" fill="none" stroke="${gold}" stroke-width="0.7" opacity=".8"/>`;
    o += `<ellipse cx="0" cy="21" rx="3" ry="17.5" fill="none" stroke="${gold}" stroke-width="0.7" opacity=".8"/>`;
    o += `<rect x="-6" y="38" width="12" height="4" rx="1" fill="${gold}"/>`;
    o += `<circle cx="0" cy="44" r="1.5" fill="${gold}"/>`;
    o += `<path d="M0 44.5V57M-1.7 45L-2.6 56M1.7 45L2.6 56" stroke="${gold}" stroke-width="0.8" stroke-linecap="round"/>`;
    o += '</g>';
    return o;
  }

  /* ---------- Hoa sen — khung 120 x 90, gốc ở (60, 80) ---------- */
  const LOTUS = {
    outerL: 'M60 74C38 76 18 66 6 46C26 46 46 56 60 74Z',
    outerR: 'M60 74C82 76 102 66 114 46C94 46 74 56 60 74Z',
    sideL: 'M60 74C40 64 30 42 33 20C46 30 56 50 60 74Z',
    sideR: 'M60 74C80 64 90 42 87 20C74 30 64 50 60 74Z',
    center: 'M60 6C73 24 75 52 60 74C45 52 47 24 60 6Z',
    pad: 'M8 80C30 72 90 72 112 80C92 88 28 88 8 80Z',
    veins: 'M60 22V64',
  };

  // mode 'color' = sen hồng; 'line' = nét vẽ một màu (hợp nền đỏ)
  function lotus(cx, baseY, width, mode = 'color', color = '#C9A227', bg = '#fff') {
    const s = width / 120;
    let o = `<g transform="translate(${f(cx)} ${f(baseY)}) scale(${f(s)}) translate(-60 -80)" stroke-linejoin="round">`;
    if (mode === 'line') {
      const st = `fill="${bg}" stroke="${color}" stroke-width="1.7"`;
      o += `<path d="${LOTUS.pad}" ${st}/>`;
      o += ['outerL', 'outerR', 'sideL', 'sideR', 'center'].map((k) => `<path d="${LOTUS[k]}" ${st}/>`).join('');
      o += `<path d="${LOTUS.veins}" fill="none" stroke="${color}" stroke-width="1" opacity=".75"/>`;
    } else {
      o += `<path d="${LOTUS.pad}" fill="#7DB07F"/><path d="M16 80C38 75 82 75 104 80" fill="none" stroke="#4E8A53" stroke-width="1.2"/>`;
      o += `<path d="${LOTUS.outerL}" fill="#F9CFDC" stroke="#E68AA6" stroke-width="1"/>`;
      o += `<path d="${LOTUS.outerR}" fill="#F9CFDC" stroke="#E68AA6" stroke-width="1"/>`;
      o += `<path d="${LOTUS.sideL}" fill="#F6A9C0" stroke="#DD6F92" stroke-width="1"/>`;
      o += `<path d="${LOTUS.sideR}" fill="#F6A9C0" stroke="#DD6F92" stroke-width="1"/>`;
      o += `<path d="${LOTUS.center}" fill="#EF84A4" stroke="#D45A80" stroke-width="1"/>`;
      o += `<path d="${LOTUS.veins}" fill="none" stroke="#FFE3EC" stroke-width="1" opacity=".9"/>`;
    }
    return o + '</g>';
  }

  /* ---------- Quả đào tiên (chúc thọ) ---------- */
  function peach(cx, cy, size, rot = 0) {
    const s = size / 60;
    return `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${rot}) scale(${f(s)}) translate(-30 -32)">` +
      '<path d="M30 53C21 60 8 60 1 52C10 48 21 49 30 53Z" fill="#5E9E62"/>' +
      '<path d="M30 53C39 60 52 60 59 52C50 48 39 49 30 53Z" fill="#4E8A53"/>' +
      '<path d="M30 8C40 12 53 22 50 38C48 50 38 55 30 55C22 55 12 50 10 38C7 22 20 12 30 8Z" fill="#FFB49A"/>' +
      '<path d="M30 8C40 12 53 22 50 38C49 44 45 48 40 51C44 40 42 22 30 8Z" fill="#F27B8F" opacity=".75"/>' +
      '<path d="M30 10C25 22 25 40 30 54" fill="none" stroke="#E0697F" stroke-width="1.3"/>' +
      '</g>';
  }

  /* ---------- Mây (tường vân) — khung 64 x 26, góc trên-trái ở (x, y) ---------- */
  const CLOUD = [
    'M9 25H54',
    'M9 25C3 25 1 18 5 14C9 10 15 12 15 16.5C15 19.5 11 20 10.5 17.5',
    'M54 25C61 25 64 18 60 13.5C56.5 10 50.5 12 51 16.5C51.5 19 55 19 55 16.5',
    'M13 12.5C13 5 21 1 28 4.5C32 -0.5 44 0 47 7C49.5 8.5 51 10.5 51 13',
    'M28 4.5C25 8 26 14.5 32 15C37 15.5 38.5 9.5 34.5 8.5C32 8 31 11 33 12',
  ].join('');
  function cloud(x, y, width, color, flip = false) {
    const s = width / 64;
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(flip ? -s : s)} ${f(s)})"><path d="${CLOUD}" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }

  /* ---------- Mặt trống đồng Đông Sơn (làm hình chìm) ---------- */
  function drum(cx, cy, R, color, op = 0.08) {
    const sw = f(R * 0.011);
    const ring = (r, k = 1) => `<circle r="${f(R * r)}" fill="none" stroke="${color}" stroke-width="${f(R * 0.011 * k)}"/>`;
    const ticks = (r1, r2, step) => {
      let d = '';
      for (let a = 0; a < 360; a += step) {
        const t = (a * Math.PI) / 180;
        d += `M${f(Math.cos(t) * R * r1)} ${f(Math.sin(t) * R * r1)}L${f(Math.cos(t) * R * r2)} ${f(Math.sin(t) * R * r2)}`;
      }
      return `<path d="${d}" stroke="${color}" stroke-width="${sw}"/>`;
    };
    const dots = (r, step, dr) => {
      let o = '';
      for (let a = 0; a < 360; a += step) {
        const t = (a * Math.PI) / 180;
        o += `<circle cx="${f(Math.cos(t) * R * r)}" cy="${f(Math.sin(t) * R * r)}" r="${f(R * dr)}" fill="${color}"/>`;
      }
      return o;
    };
    const pts = [];
    for (let i = 0; i < 28; i++) {
      const r = i % 2 ? R * 0.085 : R * 0.25;
      const a = (i * Math.PI) / 14 - Math.PI / 2;
      pts.push(`${f(Math.cos(a) * r)},${f(Math.sin(a) * r)}`);
    }
    let o = `<g transform="translate(${f(cx)} ${f(cy)})" opacity="${op}">`;
    o += `<polygon points="${pts.join(' ')}" fill="${color}"/>`;
    o += ring(0.29) + ring(0.32) + ticks(0.32, 0.38, 6) + ring(0.38) + dots(0.42, 10, 0.012) + ring(0.46) + ring(0.48);
    for (let i = 0; i < 8; i++) {
      const a = i * 45 + 22.5;
      const t = (a * Math.PI) / 180;
      o += swallow(Math.cos(t) * R * 0.59, Math.sin(t) * R * 0.59, R * 0.17, color, a);
    }
    o += ring(0.7) + ring(0.72) + ticks(0.72, 0.79, 4) + ring(0.79) + dots(0.845, 6, 0.011) + ring(0.9) + ring(0.93) + ring(1, 1.6);
    return o + '</g>';
  }

  /* ---------- Khung viền ---------- */
  // Khung đôi, góc khuyết vuông + hạt thoi
  function frameClassic(w, h, m, c) {
    const a = m * 0.03, b = m * 0.054, n = m * 0.05;
    const x0 = b, y0 = b, x1 = w - b, y1 = h - b;
    const d = `M${f(x0 + n)} ${f(y0)}H${f(x1 - n)}V${f(y0 + n)}H${f(x1)}V${f(y1 - n)}H${f(x1 - n)}V${f(y1)}H${f(x0 + n)}V${f(y1 - n)}H${f(x0)}V${f(y0 + n)}H${f(x0 + n)}Z`;
    let o = `<rect x="${f(a)}" y="${f(a)}" width="${f(w - 2 * a)}" height="${f(h - 2 * a)}" fill="none" stroke="${c}" stroke-width="${f(m * 0.006)}"/>`;
    o += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f(m * 0.003)}"/>`;
    const k = n * 0.24;
    [[x0 + n / 2, y0 + n / 2], [x1 - n / 2, y0 + n / 2], [x0 + n / 2, y1 - n / 2], [x1 - n / 2, y1 - n / 2]].forEach(([cx, cy]) => {
      o += `<path d="M${f(cx)} ${f(cy - k)}L${f(cx + k)} ${f(cy)}L${f(cx)} ${f(cy + k)}L${f(cx - k)} ${f(cy)}Z" fill="${c}"/>`;
    });
    return o;
  }

  // Khung đôi với ô hồi văn (hoa văn chữ "hồi") ở 4 góc
  function frameHoivan(w, h, m, c) {
    const a = m * 0.03, b = m * 0.055, s = m * 0.085;
    const sw2 = m * 0.0032;
    let o = `<rect x="${f(a)}" y="${f(a)}" width="${f(w - 2 * a)}" height="${f(h - 2 * a)}" fill="none" stroke="${c}" stroke-width="${f(m * 0.006)}"/>`;
    o += `<path d="M${f(b + s)} ${f(b)}H${f(w - b - s)}M${f(b + s)} ${f(h - b)}H${f(w - b - s)}M${f(b)} ${f(b + s)}V${f(h - b - s)}M${f(w - b)} ${f(b + s)}V${f(h - b - s)}" fill="none" stroke="${c}" stroke-width="${f(sw2)}"/>`;
    const spiral = 'M0 0H1V1H0ZM0.2 0.8V0.2H0.8V0.66H0.36V0.36H0.64V0.5H0.5';
    [[b, b, 1, 1], [w - b, b, -1, 1], [b, h - b, 1, -1], [w - b, h - b, -1, -1]].forEach(([x, y, sx, sy]) => {
      o += `<path d="${spiral}" fill="none" stroke="${c}" stroke-width="${f(sw2 / s * 1.4)}" stroke-linejoin="miter" transform="translate(${f(x)} ${f(y)}) scale(${f(sx * s)} ${f(sy * s)})"/>`;
    });
    return o;
  }

  // Khung song hồi văn: đường viền đơn, 4 góc là các thanh đan bậc thang và móc chữ "hồi"
  // (vẽ cho góc trên-trái theo đơn vị lưới u, rồi lật cho các góc khác)
  function frameLattice(w, h, m, c) {
    const u = m * 0.02;
    const b = m * 0.085;
    const half = [
      [[5, 0], [5, 1.8], [-1, 1.8]],
      [[5, 1.8], [8.2, 1.8], [8.2, -1]],
      [[8.2, 1.8], [8.2, 3.8], [3.8, 3.8]],
      [[13, 0], [13, -2.4], [15.6, -2.4], [15.6, -1.2], [14.3, -1.2]],
      [[10.4, 1.3], [12.2, 1.3], [12.2, 3.3], [10.2, 3.3], [10.2, 2.3]],
    ];
    const all = half.concat(half.map((p) => p.map(([x, y]) => [y, x])));
    let d = `M${f(b + 5 * u)} ${f(b)}H${f(w - b - 5 * u)}M${f(b + 5 * u)} ${f(h - b)}H${f(w - b - 5 * u)}` +
      `M${f(b)} ${f(b + 5 * u)}V${f(h - b - 5 * u)}M${f(w - b)} ${f(b + 5 * u)}V${f(h - b - 5 * u)}`;
    [[b, b, 1, 1], [w - b, b, -1, 1], [b, h - b, 1, -1], [w - b, h - b, -1, -1]].forEach(([ox, oy, sx, sy]) => {
      all.forEach((pts) => {
        d += pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(ox + sx * x * u)} ${f(oy + sy * y * u)}`).join('');
      });
    });
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f(u * 0.42)}" stroke-linecap="square" stroke-linejoin="miter"/>`;
  }

  // Khung bo tròn (đơn hoặc đôi)
  function frameSimple(w, h, m, c, double = false) {
    const a = m * 0.035, r = m * 0.03;
    let o = `<rect x="${f(a)}" y="${f(a)}" width="${f(w - 2 * a)}" height="${f(h - 2 * a)}" rx="${f(r)}" fill="none" stroke="${c}" stroke-width="${f(m * 0.005)}"/>`;
    if (double) {
      const b = a + m * 0.018;
      o += `<rect x="${f(b)}" y="${f(b)}" width="${f(w - 2 * b)}" height="${f(h - 2 * b)}" rx="${f(r * 0.6)}" fill="none" stroke="${c}" stroke-width="${f(m * 0.0025)}"/>`;
    }
    return o;
  }

  // Đường gạch hoa văn dưới tiêu đề (HTML inline, màu ghi rõ để in/PDF đúng màu)
  function divider(color) {
    return `<svg class="t-divider" viewBox="0 0 120 8" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="M4 4H49M71 4H116" stroke="${color}" stroke-width=".8"/><path d="M60 .6L63.4 4L60 7.4L56.6 4Z" fill="${color}"/><circle cx="52.5" cy="4" r="1.2" fill="${color}"/><circle cx="67.5" cy="4" r="1.2" fill="${color}"/></svg>`;
  }

  global.Orn = { swallow, flock, blossom, bud, branch, lantern, lotus, peach, cloud, drum, frameClassic, frameHoivan, frameLattice, frameSimple, divider, SWALLOW };
})(window);

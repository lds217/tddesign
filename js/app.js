/* Thiệp Yến — làm thiệp và in nhiều thiệp trên một tờ A4 */
(function () {
  'use strict';

  const { FONTS, THEMES, TEXT_COLORS, TEMPLATES, TITLE_PRESETS, PHRASES } = window.TD;
  const O = window.Orn;
  const TPL = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PX = 96 / 25.4; // 1 mm = 3.78 px
  const SHEET = { w: 210, h: 297, m: 6 }; // A4, chừa lề trắng 6 mm
  const FIELDS = ['title', 'to', 'msg', 'sign'];
  const r2 = (n) => Math.round(n * 100) / 100;

  const LAYOUTS = [
    { id: '1', cols: 1, rows: 1, label: '1 thiệp' },
    { id: '2', cols: 1, rows: 2, label: '2 thiệp' },
    { id: '4', cols: 2, rows: 2, label: '4 thiệp' },
    { id: '6', cols: 2, rows: 3, label: '6 thiệp' },
    { id: '8', cols: 2, rows: 4, label: '8 thiệp' },
    { id: '10', cols: 2, rows: 5, label: '10 thẻ' },
    { id: '12', cols: 3, rows: 4, label: '12 thẻ' },
    { id: '21', cols: 3, rows: 7, label: '21 nhãn' },
    { id: 'strip', cols: 1, rows: 0, label: 'Dải chữ' },
  ];
  const LAYOUT = Object.fromEntries(LAYOUTS.map((l) => [l.id, l]));

  /* ================= Lưu trữ trên máy ================= */
  const KEY = { state: 'thiepyen.state.v1', shop: 'thiepyen.shop.v1', saved: 'thiepyen.saved.v1', seen: 'thiepyen.seen.v1' };
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
  };

  const DEFAULT_STYLE = { font: 'Lora', size: 1, bold: false, italic: false, upper: false, align: 'center' };
  const CONTOUR = { off: 0, sat: 0.03, vua: 0.05, rong: 0.08 }; // khoảng cách viền cắt (× cạnh ngắn)

  // Các phần chỉnh kiểu chữ riêng: mẫu thường có 2 phần, mẫu "nhiều dòng" mỗi dòng một phần
  function partsFor(t) {
    return t.lines
      ? [['title', 'Dòng 1'], ['to', 'Dòng 2'], ['msg', 'Dòng 3'], ['sign', 'Dòng 4']]
      : [['title', 'Tiêu đề'], ['body', 'Lời nhắn & tên']];
  }

  function fromTemplate(id, prev) {
    const t = TPL[id] || TEMPLATES[0];
    const style = {};
    ['title', 'body', ...(t.lines ? ['to', 'msg', 'sign'] : [])].forEach((k) => {
      style[k] = { ...DEFAULT_STYLE, ...(t.style[k] || (k === 'title' ? {} : t.style.body) || {}) };
    });
    const s = {
      v: 1,
      tpl: t.id,
      theme: t.theme,
      layout: t.layout,
      orient: t.orient,
      rows: prev ? prev.rows : 10,
      cut: prev ? prev.cut : true,
      deco: true,
      contour: t.contour || 'off',
      showShop: !!t.shop,
      text: { ...t.text },
      edited: { title: false, to: false, msg: false, sign: false },
      style,
      colors: { title: null, body: null, to: null, msg: null, sign: null, ...(t.colors || {}) },
    };
    // Giữ lại chữ người dùng đã tự gõ khi đổi mẫu
    if (prev) FIELDS.forEach((k) => {
      if (prev.edited && prev.edited[k]) { s.text[k] = prev.text[k]; s.edited[k] = true; }
    });
    return s;
  }

  function merge(base, s) {
    const out = { ...base, ...s };
    ['text', 'edited', 'colors'].forEach((k) => (out[k] = { ...base[k], ...((s && s[k]) || {}) }));
    out.style = {};
    Object.keys(base.style).forEach((k) => {
      out.style[k] = { ...base.style[k], ...((s.style && s.style[k]) || {}) };
    });
    if (!THEMES[out.theme]) out.theme = base.theme;
    if (!LAYOUT[out.layout]) out.layout = base.layout;
    if (!(out.contour in CONTOUR)) out.contour = base.contour;
    return out;
  }

  function loadState() {
    const s = store.get(KEY.state, null);
    if (s && s.v === 1 && TPL[s.tpl]) return merge(fromTemplate(s.tpl), s);
    return fromTemplate('camon');
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));

  let state = loadState();
  let shop = Object.assign({ name: '', phone: '', extra: '', logo: '', showLogo: true }, store.get(KEY.shop, {}));
  let saved = store.get(KEY.saved, []);
  if (!Array.isArray(saved)) saved = [];
  let part = 'title'; // phần đang chỉnh kiểu chữ

  const saveState = debounce(() => store.set(KEY.state, state), 300);
  const saveShop = () => store.set(KEY.shop, shop);

  /* ================= Vẽ thiệp ================= */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function fontStack(fam) {
    const f = FONTS.find((x) => x.family === fam);
    const fb = !f ? 'serif' : f.kind === 'serif' ? 'serif' : f.kind === 'script' ? 'cursive' : 'sans-serif';
    return `'${fam}', 'Be Vietnam Pro', ${fb}`;
  }

  function geometry(st) {
    const L = LAYOUT[st.layout] || LAYOUT['4'];
    const cols = L.cols;
    const rows = L.rows || st.rows;
    const sw = (SHEET.w - 2 * SHEET.m) / cols;
    const sh = (SHEET.h - 2 * SHEET.m) / rows;
    const slotPortrait = sh >= sw;
    const square = Math.max(sw, sh) / Math.min(sw, sh) < 1.15;
    const canRotate = !square && L.id !== 'strip';
    const rotate = canRotate && (st.orient === 'portrait') !== slotPortrait;
    return {
      cols, rows, sw, sh, rotate, canRotate,
      cw: rotate ? sh : sw, // kích thước thật của thiệp (theo chiều đọc)
      ch: rotate ? sw : sh,
      per: cols * rows,
    };
  }

  function recipients(st) {
    return String(st.text.to || '').split('\n').map((s) => s.trim()).filter(Boolean);
  }

  // Kiểu chữ thực tế của từng ô chữ
  function fieldStyles(st, t, th) {
    const ff = t.fieldFont || {};
    const out = {};
    FIELDS.forEach((f) => {
      let s;
      let color;
      if (t.lines) {
        s = st.style[f] || st.style.body;
        color = st.colors[f] || th.title;
      } else if (f === 'title' || ff[f] === 'title') {
        s = st.style.title;
        color = st.colors.title || th.title;
      } else {
        s = st.style.body;
        color = st.colors.body || th.text;
      }
      out[f] = { ...s, color };
    });
    return out;
  }

  function contourMm(st, w, h) {
    const k = CONTOUR[st.contour] || 0;
    return k ? r2(Math.min(7, Math.max(1.2, Math.min(w, h) * k))) : 0;
  }

  function cardHTML(st, w, h, to, rotate, key) {
    const t = TPL[st.tpl];
    const th = THEMES[st.theme];
    const deco = st.deco && t.deco;
    const pad = deco || t.plain ? t.pad : [9, 10, 9, 10];
    const sz = t.sizes;
    const fs = fieldStyles(st, t, th);
    const align = t.lines ? 'center' : st.style.body.align;
    const vars = {
      '--bg': th.bg,
      '--bg2': th.bg2,
      '--c-title': fs.title.color,
      '--c-body': t.lines ? fs.msg.color : st.colors.body || th.text,
      '--s-shop': sz.shop,
      '--s-logo': r2(Math.max(9, sz.title * 0.9)),
      '--gap': t.gap != null ? t.gap : 1.7,
      '--pt': pad[0], '--pr': pad[1], '--pb': pad[2], '--pl': pad[3],
      '--align': align,
      '--sign-align': align === 'left' ? 'right' : align,
    };
    FIELDS.forEach((f) => {
      const x = fs[f];
      vars[`--f-${f}`] = fontStack(x.font);
      vars[`--w-${f}`] = x.bold ? 700 : 400;
      vars[`--i-${f}`] = x.italic ? 'italic' : 'normal';
      vars[`--u-${f}`] = x.upper ? 'uppercase' : 'none';
      vars[`--c-${f}`] = x.color;
      vars[`--s-${f}`] = r2(sz[f] * x.size);
    });
    const style = `width:${r2(w)}mm;height:${r2(h)}mm;` + Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
    const cls = (field) => {
      const extra = field === 'to' ? t.toStyle : field === 'sign' ? t.signStyle : null;
      return extra ? 'st-' + extra : '';
    };

    const tx = st.text;
    const withShop = st.showShop && (shop.name || shop.phone || shop.extra);
    let stack = '';
    if (st.showShop && shop.logo && shop.showLogo) stack += `<img class="t-logo" src="${shop.logo}" alt="">`;
    if (tx.title) stack += `<div class="t-title">${esc(tx.title)}</div>`;
    if (tx.title && t.divider && deco) stack += O.divider(th.frame);
    if (to) stack += `<div class="t-to ${cls('to')}">${esc(to)}</div>`;
    if (tx.msg) stack += `<div class="t-msg">${esc(tx.msg)}</div>`;
    if (tx.sign) stack += `<div class="t-sign al-auto ${cls('sign')}">${esc(tx.sign)}</div>`;

    let shopHTML = '';
    if (withShop) {
      const line1 = [shop.name && `<b>${esc(shop.name)}</b>`, shop.phone && esc(shop.phone)].filter(Boolean).join(' · ');
      shopHTML = `<div class="t-shop">${line1}${shop.extra ? (line1 ? '<br>' : '') + esc(shop.extra) : ''}</div>`;
    }

    const box = `viewBox="0 0 ${r2(w)} ${r2(h)}" width="${r2(w)}mm" height="${r2(h)}mm" preserveAspectRatio="none" aria-hidden="true"`;
    const svg = deco ? `<svg class="deco" ${box}>${t.deco(w, h, Math.min(w, h), th)}</svg>` : '';
    const ct = contourMm(st, w, h);
    const ctSvg = ct ? `<svg class="contour" ${box}><path d="" fill="none" stroke="${fs.title.color}" stroke-width="0.25" stroke-linejoin="round"/></svg>` : '';
    const classes = ['card', rotate && 'rot', t.tight && 'tight'].filter(Boolean).join(' ');
    return `<div class="${classes}" data-k="${esc(key)}"${ct ? ` data-ct="${ct}"` : ''} style="${esc(style)}">${svg}${ctSvg}<div class="content"><div class="main-c"><div class="stack">${stack}</div></div>${shopHTML}</div></div>`;
  }

  function cutLinesSVG(g, used) {
    const m = SHEET.m;
    const rows = Math.min(g.rows, Math.ceil(used / g.cols));
    const bottom = m + rows * g.sh;
    let d = '';
    for (let c = 0; c <= g.cols; c++) {
      const x = r2(m + c * g.sw);
      d += `M${x} 0V${r2(Math.min(SHEET.h, bottom + m))}`;
    }
    for (let r = 0; r <= rows; r++) {
      const y = r2(m + r * g.sh);
      d += `M0 ${y}H${SHEET.w}`;
    }
    return `<svg class="cutlines" viewBox="0 0 ${SHEET.w} ${SHEET.h}" width="${SHEET.w}mm" height="${SHEET.h}mm" aria-hidden="true"><path d="${d}" fill="none" stroke="#8C8C8C" stroke-width="0.22" stroke-dasharray="2 1.5"/></svg>`;
  }

  function buildSheets(st) {
    const g = geometry(st);
    const names = recipients(st);
    const multi = names.length > 1;
    const total = multi ? names.length : g.per;
    const nSheets = Math.max(1, Math.ceil(total / g.per));
    let html = '';
    for (let p = 0; p < nSheets; p++) {
      let slots = '';
      let used = 0;
      for (let i = 0; i < g.per; i++) {
        const idx = p * g.per + i;
        if (idx >= total) break;
        used++;
        const r = Math.floor(i / g.cols);
        const c = i % g.cols;
        const to = multi ? names[idx] : names[0] || '';
        slots += `<div class="slot" style="left:${r2(SHEET.m + c * g.sw)}mm;top:${r2(SHEET.m + r * g.sh)}mm;width:${r2(g.sw)}mm;height:${r2(g.sh)}mm">${cardHTML(st, g.cw, g.ch, to, g.rotate, multi ? 'n' + idx : 'all')}</div>`;
      }
      const label = nSheets > 1 ? `Tờ ${p + 1}/${nSheets}` : '';
      html += `<div class="sheet-wrap${nSheets > 1 ? '' : ' one'}" data-page="${label}"><div class="sheet" style="width:${SHEET.w}mm;height:${SHEET.h}mm">${slots}${st.cut ? cutLinesSVG(g, used) : ''}</div></div>`;
    }
    return { html, nSheets, total, g };
  }

  // Thu nhỏ chữ cho vừa thiệp (tìm nhị phân trên biến --fit)
  function fitOne(card) {
    const content = card.querySelector('.content');
    const main = card.querySelector('.main-c');
    const stack = card.querySelector('.stack');
    if (!content || !main || !stack) return 1;
    const fits = () =>
      stack.offsetHeight <= main.clientHeight + 0.5 &&
      stack.scrollWidth <= stack.clientWidth + 1 &&
      content.scrollWidth <= content.clientWidth + 1;
    card.style.setProperty('--fit', '1');
    if (fits()) return 1;
    let lo = 0.2;
    let hi = 1;
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      card.style.setProperty('--fit', mid.toFixed(4));
      if (fits()) lo = mid;
      else hi = mid;
    }
    card.style.setProperty('--fit', lo.toFixed(4));
    return lo;
  }

  function fitCards(root) {
    const done = new Map();
    $$('.card', root).forEach((card) => {
      const k = card.closest('.tpl, .saved-item') ? null : card.dataset.k;
      if (k && done.has(k)) card.style.setProperty('--fit', done.get(k));
      else {
        const v = fitOne(card).toFixed(4);
        if (k) done.set(k, v);
      }
    });
  }

  /* Viền cắt quanh chữ: đo trên bản sao không xoay/không thu nhỏ, kết quả dùng chung cho các thiệp giống nhau */
  const contourCache = new Map();
  let measureStage = null;
  function contourFor(card) {
    const key = card.style.cssText + '|' + card.querySelector('.content').innerHTML;
    if (contourCache.has(key)) return contourCache.get(key);
    let d = '';
    try {
      if (!card.closest('.card-host, .sheet') || card.closest('.pdf-stage')) {
        d = window.Contour.path(card, parseFloat(card.dataset.ct));
      } else {
        if (!measureStage) {
          measureStage = document.createElement('div');
          measureStage.className = 'measure-stage';
          document.body.appendChild(measureStage);
        }
        const c = card.cloneNode(true);
        c.classList.remove('rot');
        measureStage.appendChild(c);
        d = window.Contour.path(c, parseFloat(card.dataset.ct));
        measureStage.removeChild(c);
      }
    } catch (e) {
      console.error(e);
    }
    if (contourCache.size > 80) contourCache.clear();
    contourCache.set(key, d);
    return d;
  }
  function applyContours(root) {
    $$('.card[data-ct]', root).forEach((card) => {
      const p = card.querySelector('.contour path');
      if (p) p.setAttribute('d', contourFor(card));
    });
  }
  function finish(root) {
    fitCards(root);
    applyContours(root);
  }

  function thumbHTML(st, maxW, maxH) {
    const g = geometry(st);
    const w = g.cw * PX;
    const h = g.ch * PX;
    const s = Math.min(maxW / w, maxH / h);
    const to = recipients(st)[0] || '';
    return `<div class="thumb-box" style="width:${r2(w * s)}px;height:${r2(h * s)}px"><div class="card-host" style="transform:scale(${s.toFixed(4)})">${cardHTML(st, g.cw, g.ch, to, false, 'thumb')}</div></div>`;
  }

  /* ================= Xem trước ================= */
  let last = null;

  function render() {
    last = buildSheets(state);
    $('#sheets').innerHTML = last.html;
    sizePreview();
    finish($('#sheets'));
    const { g, nSheets, total } = last;
    $('#sheetInfo').textContent = `${nSheets} tờ A4 · ${total} thiệp · ${cm(g.cw)}×${cm(g.ch)} cm`;
  }

  function cm(mm) {
    return (Math.round(mm) / 10).toFixed(1).replace(/\.0$/, '').replace('.', ',');
  }

  function scaleSheets(container, s) {
    const sw = SHEET.w * PX;
    const sh = SHEET.h * PX;
    $$('.sheet-wrap', container).forEach((el) => {
      el.style.width = `${sw * s}px`;
      el.style.height = `${sh * s}px`;
      el.firstElementChild.style.transform = `scale(${s})`;
    });
  }

  function sizePreview() {
    const box = $('#preview');
    const cs = getComputedStyle(box);
    const W = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.max(0.08, Math.min(W / (SHEET.w * PX), H / (SHEET.h * PX)));
    scaleSheets($('#sheets'), s);
  }

  function refitAll() {
    contourCache.clear();
    finish($('#sheets'));
    finish($('#tplGrid'));
    finish($('#savedList'));
  }

  /* ================= Giao diện ================= */
  function buildTemplates() {
    $('#tplGrid').innerHTML = TEMPLATES.map((t) =>
      `<button type="button" class="tpl" data-tpl="${t.id}" aria-pressed="false"><div class="tpl-thumb">${thumbHTML(fromTemplate(t.id), 90, 114)}</div><span class="tpl-name">${esc(t.name)}</span></button>`
    ).join('');
    finish($('#tplGrid'));
    markTemplates();
  }

  function markTemplates() {
    $$('.tpl').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tpl === state.tpl)));
  }

  function fmtDate(ts) {
    try {
      const d = new Date(ts);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch (e) { return ''; }
  }

  function buildSaved() {
    $('#savedEmpty').hidden = saved.length > 0;
    $('#savedList').innerHTML = saved.map((it, i) => {
      const st = merge(fromTemplate(it.state.tpl), it.state);
      return `<div class="saved-item"><button type="button" class="saved-open" data-load="${i}"><span class="thumb-wrap">${thumbHTML(st, 52, 62)}</span><span style="min-width:0"><span class="saved-name">${esc(it.name)}</span><br><span class="saved-date">Lưu ngày ${fmtDate(it.ts)}</span></span></button><button type="button" class="saved-del" data-del="${i}" aria-label="Xóa mẫu ${esc(it.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13M10 10.5v6M14 10.5v6"/></svg></button></div>`;
    }).join('');
    finish($('#savedList'));
  }

  function buildFonts() {
    $('#fontGrid').innerHTML = FONTS.map((f) =>
      `<button type="button" class="font-btn" data-font="${esc(f.family)}" aria-pressed="false"><span class="sample" style="font-family:${esc(fontStack(f.family))}">Cảm ơn</span><small>${esc(f.label)}</small></button>`
    ).join('');
  }

  function buildThemes() {
    $('#themeGrid').innerHTML = Object.entries(THEMES).map(([id, th]) =>
      `<button type="button" class="theme-btn" data-theme="${id}" aria-pressed="false"><span class="theme-dot" style="background:${th.bg};color:${th.title};box-shadow:inset 0 0 0 4px ${th.bg},inset 0 0 0 5.5px ${th.frame},0 0 0 1px rgba(0,0,0,.08)">Yến</span>${esc(th.name)}</button>`
    ).join('');
  }

  function swatchesHTML(which) {
    return TEXT_COLORS.map((c) =>
      c.c
        ? `<button type="button" class="swatch" data-color="${c.c}" style="background:${c.c}" aria-label="${esc(c.name)}" title="${esc(c.name)}" aria-pressed="false"></button>`
        : `<button type="button" class="swatch auto" data-color="" aria-label="Tự động theo màu thiệp" title="Tự động theo màu thiệp" aria-pressed="false"></button>`
    ).join('') + `<label class="swatch custom" title="Màu khác"><input type="color" aria-label="Chọn màu khác"></label>`;
  }

  // Các nút theo mẫu đang dùng: phần chỉnh kiểu chữ + hàng màu chữ
  let partsTpl = null;
  function buildParts() {
    const t = TPL[state.tpl];
    if (partsTpl === t.id) return;
    partsTpl = t.id;
    const parts = partsFor(t);
    if (!parts.some(([k]) => k === part)) part = 'title';
    $('#partSeg').innerHTML = parts.map(([k, label]) => `<button type="button" data-part="${k}" aria-pressed="false">${label}</button>`).join('');
    $('#partSeg').classList.toggle('many', parts.length > 2);
    $('#colorRows').innerHTML = parts.map(([k, label]) =>
      `<h2>Màu chữ ${t.lines ? label : label.toLowerCase()}</h2><div class="swatches" data-which="${k}">${swatchesHTML(k)}</div>`
    ).join('');
    const L = t.lines
      ? { title: ['Dòng 1', 'VD: CÔNG TY'], to: ['Dòng 2 (tên)', 'VD: Chị Trà'], msg: ['Dòng 3', 'VD: Kính Biếu'], sign: ['Dòng 4 (không bắt buộc)', ''] }
      : { title: ['Tiêu đề', 'VD: Lời Cảm Ơn'], to: ['Gửi đến', 'VD: Kính gửi Cô Lan'], msg: ['Lời nhắn', 'Gõ lời chúc ở đây'], sign: ['Ký tên / Người gửi', 'VD: Trân trọng cảm ơn!'] };
    FIELDS.forEach((f) => {
      $(`#lb-${f}`).textContent = L[f][0];
      $(`[data-field="${f}"]`).placeholder = L[f][1];
    });
  }

  function buildLayouts() {
    $('#layoutGrid').innerHTML = LAYOUTS.map((l) => {
      const rows = l.rows || 7;
      const cells = '<i></i>'.repeat(l.cols * rows);
      return `<button type="button" class="layout-btn" data-layout="${l.id}" aria-pressed="false"><span class="mini-a4" style="grid-template-columns:repeat(${l.cols},1fr);grid-template-rows:repeat(${rows},1fr)">${cells}</span><b>${l.label}</b><small data-size="${l.id}"></small></button>`;
    }).join('');
  }

  function buildChips() {
    $('#titleChips').innerHTML = TITLE_PRESETS.map((t) => `<button type="button" class="chip" data-title="${esc(t)}">${esc(t)}</button>`).join('');
    $('#phraseList').innerHTML = PHRASES.map((g) =>
      `<h4>${esc(g.group)}</h4>` + g.items.map((p) => `<button type="button" class="phrase" data-phrase="${esc(p)}">${esc(p)}</button>`).join('')
    ).join('');
  }

  function setPressed(sel, fn) {
    $$(sel).forEach((b) => b.setAttribute('aria-pressed', String(!!fn(b))));
  }

  function syncUI() {
    // Ô chữ (không ghi đè khi đang gõ)
    const map = { title: '#fTitle', to: '#fTo', msg: '#fMsg', sign: '#fSign' };
    FIELDS.forEach((k) => {
      const el = $(map[k]);
      if (document.activeElement !== el && el.value !== state.text[k]) el.value = state.text[k];
    });
    const n = recipients(state).length;
    $('#toCount').textContent = n > 1 ? `Đang có ${n} người → ${n} thiệp.` : '';
    $('#shopMissing').hidden = !(state.showShop && !shop.name && !shop.phone);

    markTemplates();

    buildParts();
    const t = TPL[state.tpl];
    const st = state.style[part] || state.style.body;
    setPressed('#partSeg button', (b) => b.dataset.part === part);
    setPressed('.font-btn', (b) => b.dataset.font === st.font);
    $('#sizeOut').textContent = `${Math.round(st.size * 100)}%`;
    $('#togBold').setAttribute('aria-pressed', String(!!st.bold));
    $('#togItalic').setAttribute('aria-pressed', String(!!st.italic));
    $('#togUpper').setAttribute('aria-pressed', String(!!st.upper));
    $('#alignCtrl').hidden = t.lines || part !== 'body';
    $('#swPart').dataset.which = part;
    setPressed('#alignToggles .tog', (b) => b.dataset.align === state.style.body.align);

    setPressed('.theme-btn', (b) => b.dataset.theme === state.theme);
    $$('.swatches[data-which]').forEach((row) => {
      const cur = state.colors[row.dataset.which] || null;
      row.querySelectorAll('.swatch[data-color]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.color || null) === cur)));
    });
    setPressed('#contourSeg button', (b) => b.dataset.ct === state.contour);

    setPressed('.layout-btn', (b) => b.dataset.layout === state.layout);
    LAYOUTS.forEach((l) => {
      const g = geometry({ ...state, layout: l.id });
      const el = $(`[data-size="${l.id}"]`);
      if (el) el.textContent = `${cm(g.cw)} × ${cm(g.ch)} cm`;
    });
    const g = geometry(state);
    $('#stripCtrl').hidden = state.layout !== 'strip';
    $('#rowsOut').textContent = state.rows;
    $('#orientCtrl').hidden = !g.canRotate;
    setPressed('#orientSeg button', (b) => b.dataset.orient === state.orient);
    $('#rotateHint').hidden = !g.rotate;

    $$('[data-bind]').forEach((el) => {
      const k = el.dataset.bind;
      el.checked = k === 'showLogo' ? !!shop.showLogo : !!state[k];
    });
    $$('[data-shop]').forEach((el) => {
      if (document.activeElement !== el) el.value = shop[el.dataset.shop] || '';
    });
    const box = $('#logoBox');
    box.innerHTML = shop.logo ? `<img src="${shop.logo}" alt="Logo tiệm">` : '<span>Chưa có logo</span>';
    $('#btnLogoRemove').hidden = !shop.logo;
  }

  let renderQueued = false;
  function commit() {
    saveState();
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      render();
      syncUI();
    });
  }
  const commitSoon = debounce(commit, 140);
  const rebuildThumbs = debounce(() => { buildTemplates(); buildSaved(); }, 400);

  /* ================= Tab ================= */
  function showTab(name) {
    $$('.tabbar [role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    $$('.tab').forEach((t) => (t.hidden = t.dataset.tab !== name));
    $('#panelScroll').scrollTop = 0;
  }

  /* ================= Hộp thoại & thông báo ================= */
  function openModal(sel) {
    const m = $(sel);
    m.hidden = false;
    const focusable = m.querySelector('.modal-x, [data-close]');
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 30);
  }
  function closeModal(m) {
    if (!m || m.hidden) return;
    m.hidden = true;
    if (m.id === 'mHelp') {
      store.set(KEY.seen, 1);
      $('#welcomeShop').hidden = true;
    }
    if (m.id === 'mZoom') $('#zoomBody').innerHTML = '';
  }

  let toastTimer = null;
  function toast(msg, undo) {
    $('#toastText').textContent = msg;
    const b = $('#toastAction');
    b.hidden = !undo;
    b.onclick = () => { if (undo) undo(); hideToast(); };
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undo ? 6000 : 2600);
  }
  function hideToast() { $('#toast').hidden = true; }

  function busy(on, text) {
    $('#busy').hidden = !on;
    if (text) $('#busyText').textContent = text;
  }

  /* ================= Phông chữ ================= */
  let fontsLoaded = false;
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) {
      fontsLoaded = true;
      return Promise.resolve();
    }
    const sample = 'AaĂăÂâĐđÊêÔôƠơƯư ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ 0123';
    const jobs = [];
    FONTS.forEach((f) => {
      jobs.push(document.fonts.load(`400 20px "${f.family}"`, sample));
      jobs.push(document.fonts.load(`700 20px "${f.family}"`, sample));
    });
    return Promise.all(jobs.map((p) => p.catch(() => null))).then(() => { fontsLoaded = true; });
  }
  function fontsReady() {
    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return Promise.all([fontsLoaded ? null : loadFonts(), ready]);
  }

  /* ================= In ================= */
  function doPrint() {
    const go = () => {
      refitAll();
      window.print();
    };
    if (fontsLoaded) go();
    else fontsReady().then(go);
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('Không tải được ' + src));
      document.head.appendChild(s);
    });
  }

  let pdfUrl = null;
  let pdfFile = null;

  function drawCutLines(ctx, g, used, k) {
    const m = SHEET.m;
    const rows = Math.min(g.rows, Math.ceil(used / g.cols));
    const bottom = Math.min(SHEET.h, m + rows * g.sh + m);
    ctx.save();
    ctx.strokeStyle = '#8C8C8C';
    ctx.lineWidth = 0.22 * k;
    ctx.setLineDash([2 * k, 1.5 * k]);
    ctx.beginPath();
    for (let c = 0; c <= g.cols; c++) {
      const x = (m + c * g.sw) * k;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, bottom * k);
    }
    for (let r = 0; r <= rows; r++) {
      const y = (m + r * g.sh) * k;
      ctx.moveTo(0, y);
      ctx.lineTo(SHEET.w * k, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Chụp từng thiệp (để thẳng) rồi tự ghép lên tờ A4 — html2canvas không xử lý tốt thiệp bị xoay
  const PDF_SCALE = 2.4; // ≈ 230 dpi
  async function captureCard(stage, html) {
    stage.innerHTML = html;
    const card = stage.firstElementChild;
    fitOne(card);
    if (card.dataset.ct) {
      const p = card.querySelector('.contour path');
      if (p) p.setAttribute('d', window.Contour.path(card, parseFloat(card.dataset.ct)));
    }
    return window.html2canvas(card, {
      scale: PDF_SCALE,
      backgroundColor: null,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(1000, document.documentElement.clientWidth),
    });
  }

  async function makePdf() {
    busy(true, 'Đang tạo file PDF… (vài giây)');
    let stage = null;
    try {
      if (!window.html2canvas) await loadScript('vendor/html2canvas.min.js');
      if (!window.jspdf) await loadScript('vendor/jspdf.umd.min.js');
      await fontsReady();
      stage = document.createElement('div');
      stage.className = 'pdf-stage';
      document.body.appendChild(stage);

      const g = geometry(state);
      const names = recipients(state);
      const multi = names.length > 1;
      const total = multi ? names.length : g.per;
      const nSheets = Math.max(1, Math.ceil(total / g.per));
      const k = PDF_SCALE * PX; // px trên mỗi mm
      const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      let shared = null;

      for (let p = 0; p < nSheets; p++) {
        busy(true, `Đang tạo file PDF… tờ ${p + 1}/${nSheets}`);
        const page = document.createElement('canvas');
        page.width = Math.round(SHEET.w * k);
        page.height = Math.round(SHEET.h * k);
        const ctx = page.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, page.width, page.height);
        let used = 0;
        for (let i = 0; i < g.per; i++) {
          const idx = p * g.per + i;
          if (idx >= total) break;
          used++;
          let img = shared;
          if (!img || multi) {
            img = await captureCard(stage, cardHTML(state, g.cw, g.ch, multi ? names[idx] : names[0] || '', false, 'pdf'));
            if (!multi) shared = img;
          }
          const cx = (SHEET.m + (i % g.cols) * g.sw + g.sw / 2) * k;
          const cy = (SHEET.m + Math.floor(i / g.cols) * g.sh + g.sh / 2) * k;
          const w = g.cw * k;
          const h = g.ch * k;
          ctx.save();
          ctx.translate(cx, cy);
          if (g.rotate) ctx.rotate(Math.PI / 2);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.restore();
          if (multi) { img.width = 0; img.height = 0; }
        }
        if (state.cut) drawCutLines(ctx, g, used, k);
        if (p) pdf.addPage('a4', 'portrait');
        pdf.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, SHEET.w, SHEET.h, undefined, 'FAST');
        page.width = 0;
        page.height = 0;
      }
      const blob = pdf.output('blob');
      const d = new Date();
      const name = `thiep-${state.tpl}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.pdf`;
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      pdfUrl = URL.createObjectURL(blob);
      try { pdfFile = new File([blob], name, { type: 'application/pdf' }); } catch (e) { pdfFile = null; }
      const a = $('#btnPdfOpen');
      a.href = pdfUrl;
      a.setAttribute('download', name);
      $('#btnPdfShare').hidden = !(pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] }));
      busy(false);
      openModal('#mPdf');
    } catch (err) {
      busy(false);
      toast('Không tạo được PDF. Kiểm tra mạng rồi thử lại.');
      console.error(err);
    } finally {
      if (stage) stage.remove();
    }
  }

  async function sharePdf() {
    if (!pdfFile) return;
    try {
      await navigator.share({ files: [pdfFile], title: 'Thiệp in A4' });
    } catch (e) {
      if (e && e.name !== 'AbortError') window.open(pdfUrl, '_blank');
    }
  }

  /* ================= Logo ================= */
  function handleLogo(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 360;
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let data = c.toDataURL('image/png');
      if (data.length > 400000) data = c.toDataURL('image/jpeg', 0.9);
      const old = shop.logo;
      shop.logo = data;
      shop.showLogo = true;
      if (!saveShop()) {
        shop.logo = old;
        toast('Ảnh quá lớn, hãy chọn ảnh khác.');
        return;
      }
      if (!state.showShop) state.showShop = true;
      toast('Đã thêm logo');
      commit();
      rebuildThumbs();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast('Không đọc được ảnh này.');
    };
    img.src = url;
  }

  /* ================= Xem to ================= */
  let zoomK = 1;
  function sizeZoom() {
    const body = $('#zoomBody');
    const W = body.clientWidth - 24;
    const base = Math.min(W / (SHEET.w * PX), 1.4);
    scaleSheets(body, base * zoomK);
  }
  function openZoom() {
    $('#zoomBody').innerHTML = `<div class="sheets">${$('#sheets').innerHTML}</div>`;
    zoomK = 1;
    openModal('#mZoom');
    sizeZoom();
  }

  /* ================= Gắn sự kiện ================= */
  function debounce(fn, ms) {
    let t = null;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  }

  function bind() {
    // Tab
    $$('.tabbar [role="tab"]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

    // Chọn mẫu
    $('#tplGrid').addEventListener('click', (e) => {
      const b = e.target.closest('.tpl');
      if (!b) return;
      if (b.dataset.tpl === state.tpl) {
        toast('Đang dùng mẫu này. Sang mục Chữ để sửa lời.');
        return;
      }
      state = fromTemplate(b.dataset.tpl, state);
      part = 'title';
      commit();
      toast(`Đã chọn: ${TPL[state.tpl].name}`);
    });

    // Mẫu của tôi
    $('#savedList').addEventListener('click', (e) => {
      const open = e.target.closest('[data-load]');
      const del = e.target.closest('[data-del]');
      if (open) {
        const it = saved[+open.dataset.load];
        if (!it) return;
        const prev = clone(state);
        state = merge(fromTemplate(it.state.tpl), clone(it.state));
        commit();
        toast(`Đã mở “${it.name}”`, () => { state = prev; commit(); });
      } else if (del) {
        const i = +del.dataset.del;
        const it = saved[i];
        if (!it || !window.confirm(`Xóa mẫu “${it.name}”?`)) return;
        saved.splice(i, 1);
        store.set(KEY.saved, saved);
        buildSaved();
      }
    });
    $('#btnSave').addEventListener('click', () => {
      const def = (state.text.title || TPL[state.tpl].name).replace(/\s+/g, ' ').trim();
      const name = window.prompt('Đặt tên cho mẫu này:', def);
      if (name === null) return;
      saved.unshift({ name: name.trim() || def, ts: Date.now(), state: clone(state) });
      if (!store.set(KEY.saved, saved)) {
        saved.shift();
        toast('Bộ nhớ đầy, hãy xóa bớt mẫu cũ.');
        return;
      }
      buildSaved();
      toast('Đã lưu vào “Mẫu của tôi”');
    });

    // Ô chữ
    $$('[data-field]').forEach((el) => {
      el.addEventListener('input', () => {
        const k = el.dataset.field;
        state.text[k] = el.value;
        state.edited[k] = true;
        commitSoon();
      });
    });
    $('#titleChips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-title]');
      if (!b) return;
      const prev = state.text.title;
      state.text.title = b.dataset.title;
      state.edited.title = true;
      commit();
      toast('Đã đổi tiêu đề', () => { state.text.title = prev; commit(); });
    });
    $('#btnPhrases').addEventListener('click', () => openModal('#mPhrases'));
    $('#phraseList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-phrase]');
      if (!b) return;
      const prev = state.text.msg;
      state.text.msg = b.dataset.phrase;
      state.edited.msg = true;
      closeModal($('#mPhrases'));
      commit();
      toast('Đã thay lời nhắn', () => { state.text.msg = prev; commit(); });
    });
    $('#btnResetText').addEventListener('click', () => {
      const prev = clone(state);
      state.text = { ...TPL[state.tpl].text };
      state.edited = { title: false, to: false, msg: false, sign: false };
      commit();
      toast('Đã dùng lại chữ mẫu', () => { state = prev; commit(); });
    });

    // Ẩn thanh tab khi đang gõ để có thêm chỗ
    document.addEventListener('focusin', (e) => {
      if (e.target.matches('input[type="text"], input[type="tel"], textarea')) document.body.classList.add('typing');
    });
    document.addEventListener('focusout', () => setTimeout(() => {
      if (!document.activeElement || !document.activeElement.matches('input[type="text"], input[type="tel"], textarea')) {
        document.body.classList.remove('typing');
      }
    }, 60));

    // Công tắc
    $$('[data-bind]').forEach((el) => el.addEventListener('change', () => {
      const k = el.dataset.bind;
      if (k === 'showLogo') {
        shop.showLogo = el.checked;
        saveShop();
        rebuildThumbs();
      } else {
        state[k] = el.checked;
      }
      commit();
    }));

    // Thông tin tiệm
    $$('[data-shop]').forEach((el) => el.addEventListener('input', () => {
      shop[el.dataset.shop] = el.value;
      saveShop();
      $$(`[data-shop="${el.dataset.shop}"]`).forEach((o) => { if (o !== el) o.value = el.value; });
      commitSoon();
      rebuildThumbs();
    }));
    $('#logoInput').addEventListener('change', (e) => {
      handleLogo(e.target.files && e.target.files[0]);
      e.target.value = '';
    });
    $('#btnLogoRemove').addEventListener('click', () => {
      if (!window.confirm('Xóa logo?')) return;
      shop.logo = '';
      saveShop();
      commit();
      rebuildThumbs();
    });

    // Kiểu chữ
    $('#partSeg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-part]');
      if (!b) return;
      part = b.dataset.part;
      syncUI();
    });
    const ps = () => state.style[part] || state.style.body;
    $('#fontGrid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-font]');
      if (!b) return;
      ps().font = b.dataset.font;
      commit();
    });
    const step = (d) => {
      const s = ps();
      s.size = Math.min(2.5, Math.max(0.5, Math.round((s.size + d) * 10) / 10));
      commit();
    };
    $('#sizeDown').addEventListener('click', () => step(-0.1));
    $('#sizeUp').addEventListener('click', () => step(0.1));
    $('#togBold').addEventListener('click', () => { ps().bold = !ps().bold; commit(); });
    $('#togItalic').addEventListener('click', () => { ps().italic = !ps().italic; commit(); });
    $('#togUpper').addEventListener('click', () => { ps().upper = !ps().upper; commit(); });
    $('#alignToggles').addEventListener('click', (e) => {
      const b = e.target.closest('[data-align]');
      if (!b) return;
      state.style.body.align = b.dataset.align;
      commit();
    });

    // Màu
    $('#themeGrid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-theme]');
      if (!b) return;
      state.theme = b.dataset.theme;
      state.colors = { title: null, body: null };
      commit();
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.swatches[data-which] button.swatch');
      if (!b) return;
      state.colors[b.closest('.swatches').dataset.which] = b.dataset.color || null;
      commit();
    });
    document.addEventListener('input', (e) => {
      const row = e.target.type === 'color' && e.target.closest('.swatches[data-which]');
      if (!row) return;
      state.colors[row.dataset.which] = e.target.value;
      commitSoon();
    });
    $('#contourSeg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ct]');
      if (!b) return;
      state.contour = b.dataset.ct;
      commit();
    });

    // Khổ giấy
    $('#layoutGrid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-layout]');
      if (!b) return;
      state.layout = b.dataset.layout;
      commit();
    });
    $('#orientSeg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-orient]');
      if (!b) return;
      state.orient = b.dataset.orient;
      commit();
    });
    const rows = (d) => {
      state.rows = Math.min(20, Math.max(2, state.rows + d));
      commit();
    };
    $('#rowsDown').addEventListener('click', () => rows(-1));
    $('#rowsUp').addEventListener('click', () => rows(1));

    // In
    $('#btnPrint').addEventListener('click', () => {
      const r = last || buildSheets(state);
      $('#printSummary').textContent = `Sẽ in ${r.nSheets} tờ A4, tổng ${r.total} thiệp (mỗi thiệp ${cm(r.g.cw)} × ${cm(r.g.ch)} cm).`;
      openModal('#mPrint');
    });
    $('#btnDoPrint').addEventListener('click', () => {
      closeModal($('#mPrint'));
      doPrint();
    });
    $('#btnPdf').addEventListener('click', () => {
      closeModal($('#mPrint'));
      makePdf();
    });
    $('#btnPdfShare').addEventListener('click', sharePdf);

    // Hướng dẫn, xem to
    $('#btnHelp').addEventListener('click', () => openModal('#mHelp'));
    $('#btnZoom').addEventListener('click', openZoom);
    $('#preview').addEventListener('click', (e) => { if (e.target.closest('.sheet-wrap')) openZoom(); });
    $('#zoomIn').addEventListener('click', () => { zoomK = Math.min(3, zoomK * 1.35); sizeZoom(); });
    $('#zoomOut').addEventListener('click', () => { zoomK = Math.max(0.4, zoomK / 1.35); sizeZoom(); });

    // Đóng hộp thoại
    $$('.modal').forEach((m) => {
      m.addEventListener('click', (e) => {
        if (e.target === m || e.target.closest('[data-close]')) closeModal(m);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') $$('.modal').forEach(closeModal);
    });

    // Đổi kích thước màn hình
    const onResize = debounce(() => {
      sizePreview();
      if (!$('#mZoom').hidden) sizeZoom();
    }, 80);
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe($('#preview'));

    // Trước khi in (kể cả bấm Ctrl+P), đảm bảo chữ đã vừa thiệp
    window.addEventListener('beforeprint', () => finish($('#sheets')));
  }

  /* ================= Khởi động ================= */
  function detectInApp() {
    const ua = navigator.userAgent || '';
    const apps = [[/Zalo/i, 'Zalo'], [/FBAN|FBAV|FB_IAB/i, 'Facebook'], [/Messenger/i, 'Messenger'], [/Instagram/i, 'Instagram'], [/TikTok|musical_ly|Bytedance/i, 'TikTok'], [/Line\//i, 'Line']];
    const hit = apps.find(([re]) => re.test(ua));
    if (hit) {
      $('#inappName').textContent = hit[1];
      $('#inappBanner').hidden = false;
    }
    const iOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    if (!iOS || standalone) $('#a2hsTip').hidden = true;
  }

  function applyQuery() {
    const q = new URLSearchParams(location.search);
    if (TPL[q.get('mau')]) state = fromTemplate(q.get('mau'));
    if (LAYOUT[q.get('giay')]) state.layout = q.get('giay');
    if (q.get('huong')) state.orient = q.get('huong') === 'ngang' ? 'landscape' : 'portrait';
    if (THEMES[q.get('mausac')]) state.theme = q.get('mausac');
    if (q.has('nguoinhan')) {
      state.text.to = q.get('nguoinhan').split('|').join('\n');
      state.edited.to = true;
    }
    return { tab: q.get('tab'), quiet: q.has('test') };
  }

  function init() {
    const opts = applyQuery();
    buildFonts();
    buildThemes();
    $('#swPart').innerHTML = swatchesHTML('title');
    buildLayouts();
    buildChips();
    bind();
    detectInApp();
    render();
    syncUI();
    buildTemplates();
    buildSaved();
    if (opts.tab && $(`.tab[data-tab="${opts.tab}"]`)) showTab(opts.tab);

    loadFonts().then(() => { refitAll(); });
    if (document.fonts && document.fonts.addEventListener) {
      document.fonts.addEventListener('loadingdone', debounce(refitAll, 150));
    }

    if (!store.get(KEY.seen, 0) && !opts.quiet) {
      $('#welcomeShop').hidden = false;
      openModal('#mHelp');
    } else {
      $('#welcomeShop').hidden = true;
    }

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
})();

# Thiệp Yến

A static, dependency-free web app for designing and printing Vietnamese greeting cards, thank-you cards, lettering stickers and product labels, laid out several to a sheet on A4. The UI is in Vietnamese and works on mobile and desktop.

No build step, no backend. All state is kept in `localStorage`.

## Features

- 13 templates with SVG artwork in a Vietnamese style (swallows, hoa mai and hoa đào, lotus, lanterns, a Đông Sơn drum medallion, hồi văn and lattice frames, tường vân clouds)
- Lettering templates: up to 4 lines, each with its own font, size, color, weight, italic and uppercase setting
- Cut contour: an offset outline that follows the shape of the text, for cutting out stickers
- 14 Google Fonts, each checked for full Vietnamese diacritic support
- 7 color themes, plus a text color for each part of the card
- Sheet layouts of 1, 2, 4, 6, 8, 10, 12 or 21 cards per A4, or 2–20 strips. Cards are rotated automatically when the card and slot orientations differ.
- One card per recipient: a multi-line recipient field generates one card per line and paginates across sheets
- Auto-fit: text shrinks until it fits the card
- Saved designs, shop name and phone, and a logo, all persisted locally
- Two print paths: native `window.print()` at A4 with zero margins, and a PDF fallback (html2canvas + jsPDF) that is shared through the Web Share API
- PWA: web manifest, home-screen icons, and a network-first service worker

## Getting started

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Any static file server works. The app has to be served over HTTP(S), not `file://`, for the service worker and fonts to work.

## Deployment

The repo root is the site root. To publish it on GitHub Pages, go to **Settings → Pages** and choose **Deploy from a branch**, then `main` and `/ (root)`. `.nojekyll` is included so Jekyll processing is skipped.

When you deploy changes, bump `CACHE` in `sw.js` so clients drop the old cache.

## Project structure

```
index.html            app shell and dialogs
css/style.css         UI, card styles, print rules
js/ornaments.js       SVG artwork generators (mm coordinates)
js/contour.js         text contour: distance field, marching squares, smoothed SVG path
js/templates.js       fonts, themes, templates, title presets, phrases
js/app.js             state, rendering, auto-fit, UI bindings, print/PDF
vendor/               html2canvas 1.4.1, jsPDF 4.2.1 (lazy-loaded for PDF export)
icons/                app icons
manifest.webmanifest  PWA manifest
sw.js                 service worker
```

## How it works

### Layout

Sheets are 210 × 297 mm with a 6 mm safe margin, split into a `cols × rows` grid. Each card is rendered at its real size in `mm`. When the card orientation doesn't match the slot, the card is rotated 90°. In the preview, sheets are scaled down with a CSS transform, and print removes the transform.

### Scaling

Each card is a size container (`container-type: size`), so font sizes, padding and gaps are written in `cqmin` units. The same template therefore scales to any card size.

### Auto-fit

Each card has a `--fit` multiplier on all of its text sizes. The app binary-searches `--fit` until the text block fits inside its box. Identical cards share one result, so the search runs once per distinct card.

### Artwork

The `deco(w, h, m, theme)` functions return SVG drawn in the card's own mm coordinate space, where `m` is the card's short side. Artwork is therefore never stretched.

### Contour

`js/contour.js` builds the cut outline in five steps:

1. Read the position of every rendered glyph with `Range.getClientRects()`.
2. Redraw the text onto a canvas at 2.5–6 px/mm.
3. Compute an exact Euclidean distance transform (Felzenszwalb–Huttenlocher).
4. Flood-fill from the canvas border to find the outside region, which fills in any holes.
5. Trace the iso-line at the offset distance with marching squares, then smooth it into quadratic Béziers.

The result is a vector path in mm. It is measured on an off-screen copy of the card that is neither rotated nor scaled, and it is cached by card content.

### Print

`@page { size: A4; margin: 0 }`, with `print-color-adjust: exact` so background colors print.

### PDF fallback

Each distinct card is rasterized upright with html2canvas, because html2canvas does not handle rotated elements reliably. The cards are then composited onto an A4 canvas at about 230 dpi, with rotation and cut lines drawn in, and written out with jsPDF.

### Storage

`localStorage` keys:

| Key | Holds |
| --- | --- |
| `thiepyen.state.v1` | current design |
| `thiepyen.shop.v1` | shop name, phone and logo |
| `thiepyen.saved.v1` | saved designs |
| `thiepyen.seen.v1` | whether the first-run dialog has been shown |

## Template schema

Templates are defined in `TEMPLATES` in `js/templates.js`:

| Field | Description |
| --- | --- |
| `id`, `name` | Identifier and display name |
| `theme`, `layout`, `orient` | Defaults (`orient`: `portrait` / `landscape`) |
| `text` | Default `title`, `to`, `msg`, `sign` |
| `style` | Per-part font settings (`font`, `bold`, `italic`, `upper`, `align`) |
| `colors` | Optional per-part text colors |
| `sizes` | Font sizes as a % of the card's short side (`title`, `to`, `msg`, `sign`, `shop`) |
| `pad` | Inner padding `[top, right, bottom, left]`, as a % of the short side |
| `deco(w, h, m, theme)` | Returns the SVG artwork, or `null` for none |
| `lines` | `true`: each of the 4 fields is styled as its own line |
| `contour` | Default contour offset (`off`, `sat`, `vua`, `rong`) |
| `shop` | Whether the shop footer is on by default |
| `divider`, `gap`, `tight`, `fieldFont`, `toStyle`, `signStyle` | Optional layout tweaks |

## URL parameters

```
index.html?mau=tet&giay=8&huong=ngang&mausac=do&nguoinhan=A|B
```

| Param | Values |
| --- | --- |
| `mau` | template id: `camon`, `camonnho`, `kinhtang`, `dongchu`, `khung`, `sticker`, `tet`, `bieu`, `maukhoe`, `phunu`, `chaomung`, `huongdan`, `nhan` |
| `giay` | layout: `1`, `2`, `4`, `6`, `8`, `10`, `12`, `21`, `strip` |
| `huong` | `doc` or `ngang` |
| `mausac` | theme: `kem`, `do`, `trang`, `hong`, `ngoc`, `vang`, `dem` |
| `nguoinhan` | recipients, separated by `\|` |
| `tab` | tab to open: `mau`, `chu`, `mau-sac`, `giay`, `tiem` |
| `test` | skip the first-run dialog |

## Browser support

The app targets current Safari (iOS and macOS), Chrome and Edge.

- **Container query units:** required, so the minimum is Safari 16 or Chrome 105.
- **Print margins:** `@page` margins are respected from Safari 18.2. On older Safari, use the PDF export.
- **In-app browsers:** Zalo, Facebook and similar in-app browsers are detected and shown a hint to open the page in Safari, because `window.print()` may not work inside them.

## Third-party

- [html2canvas](https://github.com/niklasvh/html2canvas) (MIT)
- [jsPDF](https://github.com/parallax/jsPDF) (MIT)
- Fonts from [Google Fonts](https://fonts.google.com) (SIL Open Font License)

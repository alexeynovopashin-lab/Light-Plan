// Generator of the boards «Семья виджетов» (Braun чёрный / Braun белый) and «Семья: размеры».
// node family.js <outDir> [--test]   → <outDir>/project/*.dc.html ; --test also writes test.html (dc-import → placeholders)
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || '/tmp/family_out';
const TEST = process.argv.includes('--test');

// ---------- icons: the app library tools/icons.html ----------
const src = fs.readFileSync(path.resolve(__dirname, '../../../tools/icons.html'), 'utf8');
const SETS = JSON.parse(src.match(/var SETS = (\[.*\]);/)[1]);
const ICON = {};
for (const s of SETS) for (const i of s.items) if (!ICON[i.n]) ICON[i.n] = i.body.replace(/<(circle|path|rect)([^>]*?)\s*\/>/g, '<$1$2></$1>');
// Two signs drawn here 2026-10-27, candidates for the library (not yet in tools/icons.html):
// golden_dial — golden hour: the sun whose disc is a clock face (a span of time, not a moment);
// sunset_glow — sunset rating: sun at the horizon with its reflection on water (how good the sunset will be).
ICON.golden_dial = '<circle cx="12" cy="12" r="5.6"></circle><path d="M12 12V8.7M12 12l2.5 1.5"></path><path d="M12 3.8V1.6M12 20.2v2.2M20.2 12h2.2M3.8 12H1.6M17.8 6.2l1.55-1.55M6.2 6.2L4.65 4.65M17.8 17.8l1.55 1.55M6.2 17.8l-1.55 1.55"></path>';
ICON.sunset_glow = '<path d="M2.5 14.5h19M7.4 14.5a4.6 4.6 0 0 1 9.2 0M4.6 7.4l1.7 1.7M19.4 7.4l-1.7 1.7M12 2v4.6"></path><path d="M7.6 18h8.8M9.8 21h4.4"></path>';

// ---------- themes (copied from Widget.dc.html, not changed) ----------
const TH = {
  dark: { key: 'braunDark', bg: '#161616', text: '#ececea', muted: '#9b9b9b', dim: '#6b6b6b', amber: '#f4b400', dot: '#ececea', dotOff: '#2e2e2e', tickOff: '#303030', tickMinor: '#8c8c8c', tickHour: '#ececea', pill: 'rgba(255,255,255,0.07)', dial: '#0d0d0d', dialEdge: 'rgba(255,255,255,0.08)', win: '#0a0a0a', winShadow: 'inset 0 1px 2px rgba(0,0,0,0.7), inset 0 0 0 0.5px rgba(255,255,255,0.12), inset 0 -0.5px 0 rgba(255,255,255,0.08)', flag: '#c8102e', hand: '#f4b400',
    ground: '#2a2d29', gText: '#f2efe8', gMuted: '#9a968c', gAccent: '#e0a85a', lockInk: '#ffffff', lockPlate: 'linear-gradient(160deg,#4a4d49,#262826)', name: 'Braun чёрный' },
  light: { key: 'light', bg: '#e4e4e2', text: '#111111', muted: '#5b5b5b', dim: '#7a7a7a', amber: '#111111', dot: '#111111', dotOff: '#dcdcda', tickOff: '#cbcbc9', tickMinor: '#6e6e6e', tickHour: '#111111', pill: '#f4b400', dial: '#fafafa', dialEdge: 'rgba(0,0,0,0.08)', win: '#d3d3d1', winShadow: 'inset 0 1px 2px rgba(0,0,0,0.25), inset 0 -0.5px 0 rgba(255,255,255,0.8)', flag: '#ad0a15', hand: '#f4b400',
    ground: '#9aa39b', gText: '#1f1e1b', gMuted: '#3d443e', gAccent: '#ffffff', lockInk: '#111111', lockPlate: 'linear-gradient(160deg,#dcdedb,#b7bbb4)', name: 'Braun белый' }
};

// ---------- data ----------
const T = (h, m) => h * 60 + m;
const LIGHT = { rise: T(8, 10), golden: T(17, 1), set: T(17, 56), tomRise: T(8, 12) }; // tomorrow's 08:12 is a placeholder for the frame
const WED = { names: 'Анна и Игорь', genre: 'wedding', start: T(12, 0), end: T(24, 30) };
const ROUTE = [
  { t: T(12, 0), n: 'Сборы', ic: 'makeup' }, { t: T(13, 0), e: T(14, 0), n: 'Обед', ic: 'feast' },
  { t: T(15, 0), n: 'Прогулка', ic: 'park' }, { t: T(16, 0), n: 'Фотозона', ic: 'camera' },
  { t: T(16, 40), n: 'Банкет', ic: 'feast' }, { t: T(19, 0), n: 'Танцы', ic: 'dance' }
];
const STU = { names: 'Ольга Ветрова', genre: 'portrait', start: T(12, 0), end: T(16, 0), place: 'Студия, пр. Ленина, 46' }; // address is a placeholder
const STU_ROUTE = [
  { t: T(12, 0), n: 'Грим', ic: 'makeup' }, { t: T(13, 0), e: T(13, 54), n: 'Зал «Лофт»', ic: 'studio' },
  { t: T(14, 0), e: T(14, 54), n: 'Зал «Белый»', ic: 'studio' }, { t: T(15, 0), n: 'Отбор кадров', ic: 'camera' }
];
const WEEK_IVA = { d: 'ср 28', t: '11:00', n: 'Семья Ивановых', g: 'family' };
const WEEK_MD = { d: 'пт 30', t: '13:00', n: 'Мария и Дмитрий', g: 'wedding' };
const ASSESS = 'хороший', SCORE = 62; // beta: «хороший» = облачность 35–70 %, балл = 100 − облачность − поправки, значит ≤ 65

// ---------- helpers ----------
const f1 = n => +n.toFixed(2);
const hm = t => { const h = Math.floor(t / 60) % 24, m = t % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; };
const tw = (s, size, w) => [...s].length * size * (w >= 600 ? 0.58 : 0.55);
const partsOf = m => m >= 60 ? [{ n: String(Math.floor(m / 60)), u: 'ч' }].concat(m % 60 ? [{ n: String(m % 60), u: 'мин' }] : []) : [{ n: String(m), u: 'мин' }];
const words = m => partsOf(m).map(p => p.n + ' ' + p.u).join(' ');
const box = (x, y, w, h, css, inner = '', cls = '') => `<div${cls ? ` class="${cls}"` : ''} style="position:absolute;left:${f1(x)}px;top:${f1(y)}px;width:${f1(w)}px;height:${f1(h)}px;${css}">${inner}</div>`;
const txt = (x, y, w, h, s, css, cls = '') => box(x, y, w, h, `line-height:${h}px;white-space:nowrap;${css}`, s, cls);
const ic = (n, x, y, s, color) => `<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" style="position:absolute;left:${f1(x)}px;top:${f1(y)}px;color:${color}">${ICON[n]}</svg>`;
const icf = (n, s, color) => `<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" style="color:${color}">${ICON[n]}</svg>`;
const frame = (W, H, R, c, inner) => `<div style="position:relative;width:${W}px;height:${H}px;border-radius:${R}px;background:${c.bg};overflow:hidden;font-family:-apple-system,'SF Pro Text','SF Pro',system-ui,sans-serif;color:${c.text};-webkit-font-smoothing:antialiased">${inner}</div>`;
const hair = c => `rgba(${c.key === 'light' ? '17,17,17' : '236,236,234'},0.28)`;

// ---------- perimeter ticks (port of Widget.ticks, N generic) ----------
function ticks(W, H, R, N, passFrac, hourIdx, c) {
  const o = 3, rp = R - o, x0 = o, y0 = o, x1 = W - o, y1 = H - o;
  const sw = (x1 - x0) - 2 * rp, sh = (y1 - y0) - 2 * rp, arc = Math.PI * rp / 2;
  const arcAt = (cx, cy, p0) => s => { const p = p0 + s / rp; return [cx + rp * Math.cos(p), cy + rp * Math.sin(p), -Math.cos(p), -Math.sin(p)]; };
  const segs = [
    { L: sw / 2, f: s => [W / 2 + s, y0, 0, 1] }, { L: arc, f: arcAt(x1 - rp, y0 + rp, -Math.PI / 2) },
    { L: sh, f: s => [x1, y0 + rp + s, -1, 0] }, { L: arc, f: arcAt(x1 - rp, y1 - rp, 0) },
    { L: sw, f: s => [x1 - rp - s, y1, 0, -1] }, { L: arc, f: arcAt(x0 + rp, y1 - rp, Math.PI / 2) },
    { L: sh, f: s => [x0, y1 - rp - s, 1, 0] }, { L: arc, f: arcAt(x0 + rp, y0 + rp, Math.PI) },
    { L: sw / 2, f: s => [x0 + rp + s, y0, 0, 1] }];
  let P = 0; segs.forEach(g => P += g.L);
  let out = '';
  for (let i = 0; i < N; i++) {
    let s = i / N * P, k = 0;
    while (k < segs.length - 1 && s > segs[k].L) { s -= segs[k].L; k++; }
    const q = segs[k].f(s), hr = hourIdx.has(i), past = i / N < passFrac, w = hr ? 1.75 : 1.25;
    out += `<div style="position:absolute;left:${f1(q[0] - w / 2)}px;top:${f1(q[1])}px;width:${w}px;height:${hr ? 7.5 : 4}px;border-radius:${w / 2}px;background:${past ? c.tickOff : (hr ? c.tickHour : c.tickMinor)};transform-origin:50% 0;transform:rotate(${f1(Math.atan2(-q[2], q[3]) * 180 / Math.PI)}deg)"></div>`;
  }
  return out;
}
function hourSet(start, end, N) { const s = new Set(); for (let h = Math.ceil(start / 60) * 60; h <= end; h += 60) s.add(Math.round((h - start) / (end - start) * N) % N); return s; }
// ring for a span [start,end] at minute `now`
function ring(W, H, R, c, start, end, now, N = 150) {
  const fr = Math.min(1, Math.max(0, (now - start) / (end - start)));
  return ticks(W, H, R, N, fr, hourSet(start, end, N), c);
}

// ---------- pieces ----------
function header(c, x, y, w, sign, names) {
  return box(x, y, w, 18, 'display:flex;align-items:center;gap:6px', (sign ? icf(sign, 16, c.text) : '') + `<span style="font-size:15px;line-height:18px;font-weight:600;letter-spacing:-0.1px;white-space:nowrap">${names}</span>`);
}
function win(c, W, text) {
  // red flag = the window's left edge: V-notch 5 deep, 4 pt red band along it (as on the Braun watch)
  const w = Math.ceil([...text].reduce((a, ch) => a + (ch === ':' ? 3.6 : 7.8), 0)) + 12 + (c.flag ? 9 : 0);
  const flag = c.flag ? `<div style="position:absolute;left:0;top:0;width:9px;height:18px;background:${c.flag};clip-path:polygon(0 0,4px 0,9px 50%,4px 100%,0 100%,5px 50%)"></div>` : '';
  return box(W - 16 - w, 16, w, 18, `box-sizing:border-box;${c.flag ? 'padding-left:9px;border-radius:0 4px 4px 0;clip-path:polygon(0 0,100% 0,100% 100%,0 100%,5px 50%);' : 'border-radius:4px;'}background:${c.win};box-shadow:${c.winShadow};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:${c.text};white-space:nowrap`, flag + text, 'tn');
}
const partsHTML = (c, parts, fs, us) => parts.map(p => `<span style="display:flex;align-items:baseline;gap:2px"><span class="tn" style="font-size:${fs}px;line-height:26px;font-weight:600;color:${c.text};letter-spacing:-0.3px">${p.n}</span><span style="font-size:${us}px;font-weight:500;color:${c.muted}">${p.u}</span></span>`).join('');
function dial(c, cx, cy, D, litFrom, sign, parts, caption) {
  const rad = D / 2, rd = rad - 6, big = D >= 112;
  let o = box(cx - rad, cy - rad, D, D, `border-radius:50%;background:${c.dial};box-shadow:inset 0 0 0 0.5px ${c.dialEdge}`);
  for (let k = 0; k < 60; k++) {
    const a = k * 6 * Math.PI / 180, s = k % 5 === 0 ? 3.2 : 2;
    o += box(cx + rd * Math.sin(a) - s / 2, cy - rd * Math.cos(a) - s / 2, s, s, `border-radius:50%;background:${k >= litFrom ? c.dot : c.dotOff}`);
  }
  o += ic(sign, cx - 10, cy - 25, 20, c.amber);
  o += box(cx - rd, cy - 1, 2 * rd, 26, 'display:flex;align-items:baseline;justify-content:center;gap:4px', partsHTML(c, parts, big && !(parts.length > 1 && parts.every(p => p.n.length > 1)) ? 22 : 20, big && !(parts.length > 1 && parts.every(p => p.n.length > 1)) ? 13 : 12));
  if (caption) o += txt(cx - rd, cy + 26, 2 * rd, 14, caption, `text-align:center;font-size:11px;font-weight:500;color:${c.muted}`);
  return o;
}
// drum: slots {m2,m1,c0,p1,p2} each {time, sign, text, extra}. Times line up on the colon: hours right of a 21 box, colon centred in 4, minutes left of 21, in every row. Rows of one height; far rows fade out at the top and bottom
// edges by an opacity mask (no window, same mask as Widget.dc.html): on white they go pale, on black they go dark.
const DRUM_MASK = "linear-gradient(180deg, transparent 0, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.55) 9px, rgba(0,0,0,0.8) 15px, rgba(0,0,0,0.95) 20px, #000 26px, #000 calc(100% - 26px), rgba(0,0,0,0.95) calc(100% - 20px), rgba(0,0,0,0.8) calc(100% - 15px), rgba(0,0,0,0.55) calc(100% - 9px), rgba(0,0,0,0.3) calc(100% - 4px), transparent 100%)";
function drum(c, x, y, w, D, slots) {
  const hc = 28, hs = (D - hc) / 4, pt = D / 2 - hc / 2;
  const pos = { m2: [pt - 2 * hs, hs], m1: [pt - hs, hs], c0: [pt, hc], p1: [pt + hc, hs], p2: [pt + hc + hs, hs] };
  let rows = '';
  for (const k of Object.keys(pos)) {
    const it = slots[k]; if (!it) continue;
    const ctr = k === 'c0', fs = ctr ? 16 : 13, col = ctr ? c.amber : c.muted, ss = ctr ? 16 : 13;
    rows += box(0, pos[k][0], w, pos[k][1], `box-sizing:border-box;padding:0 10px;display:flex;align-items:center;gap:8px;border-radius:9px;background:${ctr ? c.pill : 'transparent'};color:${col};font-weight:${ctr ? 600 : 500}`,
      `<span class="tn" style="flex:none;width:46px;display:flex;font-size:${fs}px;line-height:20px;white-space:nowrap"><span style="flex:none;width:21px;display:flex;justify-content:flex-end">${it.time.split(':')[0]}</span><span style="flex:none;width:4px;display:flex;justify-content:center">:</span><span style="flex:none;width:21px">${it.time.split(':')[1]}</span></span><span style="min-width:0;display:flex;align-items:center;gap:5px;font-size:${fs}px;white-space:nowrap">${it.sign ? icf(it.sign, ss, 'currentColor') : ''}<span>${it.text}</span>${it.extra ? `<span style="display:flex;align-items:center;gap:3px;margin-left:3px;font-size:11px;font-weight:500;color:${c.muted}">${icf('sunset_glow', 12, 'currentColor')}${it.extra}</span>` : ''}</span>`);
  }
  return box(x, y, w, D, `overflow:hidden;-webkit-mask-image:${DRUM_MASK};mask-image:${DRUM_MASK}`, rows);
}
// the app's light rail (beta PATH_STOPS / stopAt): colour by the sun's height. Tomsk, late October: lat 56.5, declination
// fitted so that rise/set land on 08:10 / 17:56 (−10.8°), noon between them. Golden hour start comes out at +6.8° — matches 17:01.
const PATH_STOPS = [[90, [138, 132, 120], 0.40], [20, [176, 160, 132], 0.50], [6, [226, 164, 76], 0.95], [0, [226, 164, 76], 0.95],
  [-4, [150, 110, 170], 0.88], [-6, [124, 156, 196], 0.85], [-12, [64, 92, 140], 0.48], [-18, [40, 54, 92], 0.28]];
function sunAlt(m) {
  const rd = Math.PI / 180, lat = 56.5 * rd, dec = -10.8 * rd, H = (m - (LIGHT.rise + LIGHT.set) / 2) / 60 * 15 * rd;
  return Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)) / rd;
}
function railColor(alt) {
  const S = PATH_STOPS;
  if (alt >= S[0][0]) return S[0]; if (alt <= S[S.length - 1][0]) return S[S.length - 1];
  for (let i = 0; i < S.length - 1; i++) { const hi = S[i], lo = S[i + 1]; if (alt <= hi[0] && alt >= lo[0]) { const k = (alt - lo[0]) / (hi[0] - lo[0]); return [0, lo[1].map((v, j) => Math.round(v + (hi[1][j] - v) * k)), lo[2] + (hi[2] - lo[2]) * k]; } }
}
function lightRail(c, x0, x1, y, a, b) {
  const st = []; for (let m = a; m <= b; m += 10) { const r = railColor(sunAlt(m)); st.push(`rgba(${r[1].join(',')},${r[2].toFixed(2)}) ${((m - a) / (b - a) * 100).toFixed(1)}%`); }
  return box(x0, y, x1 - x0, 4, `border-radius:2px;background:linear-gradient(90deg,${st.join(',')})`);
}
// "now" on the rail = a thin upright stripe across it (Alexey 27.10: a stripe, not a bead), light with a dark hairline in both themes
const knob = (x, y) => box(x - 1.25, y - 5, 2.5, 14, 'border-radius:1.25px;background:#f6f3ec;box-shadow:0 0 0 0.5px rgba(0,0,0,0.6),0 1px 2px rgba(0,0,0,0.4)');
const sep = (c, x, y, h) => box(x, y, 0.5, h, `background:${hair(c)}`);
const hsep = (c, x, y, w) => box(x, y, w, 0.5, `background:${hair(c)}`);

// shoot list row, medium column (w=166)
function shootM(c, x, y, w, it, near, rel) {
  const h = near ? 46 : 40;
  const l2 = it.d + ' · ' + it.t + (rel ? ' · ' + rel : '');
  return box(x, y, w, h, `box-sizing:border-box;padding:0 10px;border-radius:9px;background:${near ? c.pill : 'transparent'};display:flex;flex-direction:column;justify-content:center;gap:1px`,
    `<div style="display:flex;align-items:center;gap:6px;color:${near ? c.amber : c.muted}">${icf(it.g, 14, 'currentColor')}<span style="font-size:13px;line-height:16px;font-weight:${near ? 600 : 500};white-space:nowrap">${it.n}</span></div><div class="tn" style="font-size:11px;line-height:14px;font-weight:500;color:${near ? c.muted : c.dim};white-space:nowrap">${l2}</div>`);
}
function shootList(c, x, y, w, items, rel) {
  let o = '', yy = y;
  items.forEach((it, i) => { const h = i === 0 ? 46 : 40; o += shootM(c, x, yy, w, it, i === 0, i === 0 ? rel : ''); yy += h + 2; });
  return o;
}
// shoot list row, large (w=332)
function shootL(c, x, y, w, it, near, rel) {
  return box(x, y, w, 38, `box-sizing:border-box;padding:0 10px;border-radius:9px;background:${near ? c.pill : 'transparent'};display:flex;align-items:center;gap:8px;color:${near ? c.amber : c.muted};font-weight:${near ? 600 : 500}`,
    `<span class="tn" style="flex:none;width:48px;font-size:12px;white-space:nowrap">${it.d}</span>${icf(it.g, 14, 'currentColor')}<span class="tn" style="flex:none;width:40px;font-size:13px">${it.t}</span><span style="font-size:14px;white-space:nowrap">${it.n}</span>${rel ? `<span style="margin-left:auto;font-size:11px;font-weight:500;color:${c.muted};white-space:nowrap">${rel}</span>` : ''}`);
}
function weekL(c, y, items, rel, emptyText) {
  if (!items.length) return txt(16, y + 8, 332, 18, emptyText, `font-size:13px;font-weight:500;color:${c.muted}`);
  return items.map((it, i) => shootL(c, 16, y + i * 40, 332, it, i === 0, i === 0 ? rel : '')).join('');
}

// light times
const lstate = (now, t) => now >= t ? 'past' : null;
function lightColor(c, now, which) {
  const times = [LIGHT.rise, LIGHT.golden, LIGHT.set];
  const next = times.findIndex(t => now < t), i = ['rise', 'golden', 'set'].indexOf(which);
  return next === -1 || i < next ? c.dim : (i === next ? c.amber : c.text);
}
// medium left column
// Sunset score 0–100 as an upright gauge (Alexey 27.10, after a thermometer reference, not a copy): faint capsule,
// filled from the bottom to the score in the app's light-rail colours (blue hour → lilac → golden by 45 → amber), Braun hairlines
// at 20/40/60/80, the level marked by the same light stripe as "now" on the rail, the number above the capsule.
function rateGauge(c, x, y, w, h, score) {
  const ink = a => `rgba(${c.key === 'light' ? '17,17,17' : '236,236,234'},${a})`, fh = h * score / 100;
  let o = txt(x - 6, y - 18, w + 12, 14, String(score), `text-align:center;font-size:12px;font-weight:600;color:${c.text}`, 'tn');
  o += box(x, y, w, h, `border-radius:${w / 2}px;background:${ink(0.10)};overflow:hidden`,
    box(0, h - fh, w, fh, `background:linear-gradient(0deg,rgba(64,92,140,.75) 0%,rgba(150,110,170,.9) 20%,rgba(226,164,76,.95) 45%,${c.amber === '#111111' ? '#f4b400' : c.amber} 100%);background-size:100% ${h}px;background-position:0 ${-(h - fh)}px`));
  for (const k of [20, 40, 60, 80]) o += box(x + w / 2 - 3, y + h - h * k / 100 - 0.25, 6, 0.5, `background:${ink(0.35)}`);
  o += box(x - 2, y + h - fh - 1.25, w + 4, 2.5, 'border-radius:1.25px;background:#f6f3ec;box-shadow:0 0 0 0.5px rgba(0,0,0,0.6),0 1px 2px rgba(0,0,0,0.4)');
  return o;
}
function lightColM(c, now, night) {
  let o = txt(16, 16, 120, 16, 'Томск', `font-size:12px;font-weight:500;color:${c.muted}`);
  if (!night) {
    const cr = lightColor(c, now, 'rise'), cg = lightColor(c, now, 'golden'), cs = lightColor(c, now, 'set');
    o += ic('sunrise', 16, 42, 18, cr) + txt(42, 40, 90, 22, hm(LIGHT.rise), `font-size:14px;font-weight:600;color:${cr}`, 'tn');
    o += ic('golden_dial', 16, 68, 18, cg) + txt(42, 66, 90, 22, hm(LIGHT.golden), `font-size:14px;font-weight:600;color:${cg}`, 'tn');
    o += ic('sunset', 16, 96, 26, cs) + txt(50, 94, 100, 30, hm(LIGHT.set), `font-size:22px;font-weight:600;color:${cs};letter-spacing:-0.3px`, 'tn');
    o += ic('sunset_glow', 16, 129, 14, c.muted) + txt(36, 128, 100, 16, ASSESS, `font-size:12px;font-weight:500;color:${c.muted}`);
    o += rateGauge(c, 136, 38, 18, 116, SCORE);
  } else {
    o += ic('sunrise', 16, 44, 26, c.amber) + txt(50, 42, 100, 30, hm(LIGHT.tomRise), `font-size:22px;font-weight:600;color:${c.amber};letter-spacing:-0.3px`, 'tn');
    o += txt(16, 76, 120, 14, 'завтра', `font-size:12px;font-weight:500;color:${c.muted}`);
    o += ic('golden_dial', 16, 106, 14, c.dim) + txt(36, 104, 90, 18, hm(LIGHT.golden), `font-size:13px;font-weight:500;color:${c.dim}`, 'tn');
    o += ic('sunset', 16, 128, 14, c.dim) + txt(36, 126, 90, 18, hm(LIGHT.set), `font-size:13px;font-weight:500;color:${c.dim}`, 'tn');
  }
  return o;
}

// ---------- widgets ----------
const SM = { W: 170, H: 170, R: 22 }, MD = { W: 364, H: 170, R: 22 }, LG = { W: 364, H: 382, R: 22 };
const dcImport = (c, scen, size, w, h) => TEST ? `<div style="width:${w}px;height:${h}px;border-radius:22px;background:${c.bg};opacity:.6;display:flex;align-items:center;justify-content:center;font:12px sans-serif;color:${c.text}">Widget ${scen} ${size}</div>` : `<dc-import name="Widget" scenario="${scen}" theme="${c.key}" size="${size}" hint-size="${w}px,${h}px"></dc-import>`;

// B small: 1 = whole shoot, 2 = light until sunset
function smallB(c, v) {
  const now = T(15, 18), leftShoot = WED.end - now, leftLight = LIGHT.set - now;
  let inner = ring(170, 170, 22, c, WED.start, WED.end, now) + header(c, 16, 16, 138, 'wedding', WED.names);
  if (v === 1) inner += dial(c, 85, 96, 116, 60 - Math.round(60 * leftShoot / (WED.end - WED.start)), 'wedding', partsOf(leftShoot));
  else inner += dial(c, 85, 96, 116, 60 - Math.round(60 * leftLight / (LIGHT.set - LIGHT.rise)), 'sunset', partsOf(leftLight), 'до заката');
  return frame(170, 170, 22, c, inner);
}
// G small: nearest shoot today, 09:30
function smallG(c) {
  const now = T(9, 30);
  return frame(170, 170, 22, c, ring(170, 170, 22, c, LIGHT.rise, LIGHT.set, now) + header(c, 16, 16, 138, 'wedding', WED.names) +
    dial(c, 85, 96, 116, 0, 'wedding', partsOf(WED.start - now), 'до 12:00'));
}
// D / E small: light
function smallDE(c, night) {
  const now = night ? T(21, 0) : T(14, 0);
  const inner = header(c, 16, 16, 138, null, night ? 'Томск, завтра' : 'Томск') +
    (night ? dial(c, 85, 96, 116, 0, 'sunrise', partsOf(T(24, 0) - now + LIGHT.tomRise), 'рассвет')
      : dial(c, 85, 96, 116, 0, 'golden_dial', partsOf(LIGHT.golden - now), 'золотой час'));
  return frame(170, 170, 22, c, inner);
}
// medium B
function mediumB(c, v) {
  const now = T(15, 18), leftShoot = WED.end - now, leftLight = LIGHT.set - now;
  let inner = ring(364, 170, 22, c, WED.start, WED.end, now) + header(c, 16, 16, 220, 'wedding', WED.names) + win(c, 364, Math.floor(leftShoot / 60) + ':' + String(leftShoot % 60).padStart(2, '0') + ':00');
  if (v === 1) {
    inner += dial(c, 74, 96, 116, 60 - Math.round(60 * leftShoot / (WED.end - WED.start)), 'wedding', partsOf(leftShoot));
    inner += drum(c, 146, 38, 202, 116, {
      m1: { time: hm(LIGHT.rise), sign: 'sunrise', text: 'Рассвет' },
      c0: { time: hm(LIGHT.golden), sign: 'golden_dial', text: 'Золотой час' },
      p1: { time: hm(LIGHT.set), sign: 'sunset', text: 'Закат', extra: ASSESS } });
  } else {
    inner += dial(c, 74, 96, 116, 60 - Math.round(60 * leftLight / (LIGHT.set - LIGHT.rise)), 'sunset', partsOf(leftLight), 'до заката');
    inner += drum(c, 146, 38, 202, 116, {
      m1: { time: hm(WED.start), sign: 'wedding', text: 'Начало' },
      c0: { time: hm(WED.end), sign: 'wedding', text: 'Конец съёмки' } });
  }
  return frame(364, 170, 22, c, inner);
}
// medium G / D / E: light left, shoots right; perimeter ticks only on a shoot day (G)
function mediumGDE(c, st) {
  const now = { G: T(9, 30), D: T(14, 0), E: T(21, 0) }[st];
  let inner = (st === 'G' ? ring(364, 170, 22, c, LIGHT.rise, LIGHT.set, now) : '') + lightColM(c, now, st === 'E') + sep(c, 168, 16, 138);
  const list = st === 'G' ? [{ d: 'сегодня', t: '12:00', n: WED.names, g: 'wedding' }, WEEK_IVA, WEEK_MD] : [WEEK_IVA, WEEK_MD];
  inner += shootList(c, 182, 16, 166, list, st === 'G' ? '' : 'через 3 дня');
  return frame(364, 170, 22, c, inner);
}
function mediumEmpty(c) {
  const now = T(14, 0);
  return frame(364, 170, 22, c, lightColM(c, now, false) + sep(c, 168, 16, 138) +
    txt(182, 16, 166, 18, 'до сб 31 съёмок нет', `font-size:13px;font-weight:500;color:${c.muted}`));
}

// day line for large (G, D, E, empty): 06:00 → 24:00, light marks above, hours below
function sunArc(c, now, night, shootToday) {
  const a = 360, b = 1440, x0 = 16, x1 = 348, y = 96, X = m => x0 + (x1 - x0) * (Math.min(b, Math.max(a, m)) - a) / (b - a);
  let o = txt(16, 16, 200, 16, 'Томск · вс 25', `font-size:12px;font-weight:500;color:${c.muted}`);
  const xr = X(LIGHT.rise), xg = X(LIGHT.golden), xs = X(LIGHT.set), xn = X(now);
  // the app's light rail: colour by the sun's height (night, blue hour, golden hour, day)
  o += lightRail(c, x0, x1, y - 1, a, b);
  // hours
  for (let h = 6; h <= 24; h += 3) {
    const x = X(h * 60);
    o += box(x - 0.5, y + 5, 1, 4, `background:${c.dim}`);
    o += txt(Math.min(x1 - 9, Math.max(x0 + 9, x)) - 9, y + 11, 18, 12, String(h % 24).padStart(2, '0'), `text-align:center;font-size:10px;font-weight:500;color:${c.dim}`, 'tn');
  }
  // signs with leaders
  const cr = night ? c.dim : lightColor(c, now, 'rise'), cg = lightColor(c, now, 'golden'), cs = lightColor(c, now, 'set');
  [[xr, xr, 'sunrise', cr], [xg, xg - 12, 'golden_dial', cg], [xs, xs + 12, 'sunset', cs]].forEach(t => {
    o += box(t[0] - 0.25, 78, 0.5, y - 78, `background:${hair(c)}`) + ic(t[2], t[1] - 9, 58, 18, t[3]);
  });
  o += knob(xn, y);
  if (shootToday) {
    o += box(X(WED.start), 134, X(b) - X(WED.start), 4, `border-radius:2px;background:${c.muted}`);
    o += txt(X(WED.start), 140, 220, 12, 'свадьба 12:00–00:30', `font-size:10px;font-weight:500;color:${c.muted}`);
  }
  // times under the line
  const y2 = 154, cr2 = night ? c.amber : lightColor(c, now, 'rise');
  o += ic('sunrise', 16, y2, 16, cr2) + txt(36, y2, 70, 16, night ? hm(LIGHT.tomRise) : hm(LIGHT.rise), `font-size:13px;font-weight:600;color:${cr2}`, 'tn') +
    txt(16, y2 + 19, 90, 14, night ? 'завтра' : 'Рассвет', `font-size:11px;font-weight:500;color:${night ? c.muted : c.dim}`);
  o += ic('golden_dial', 128, y2, 16, cg) + txt(148, y2, 60, 16, hm(LIGHT.golden), `font-size:13px;font-weight:600;color:${cg}`, 'tn') +
    txt(128, y2 + 19, 90, 14, 'Золотой час', `font-size:11px;font-weight:500;color:${c.dim}`);
  o += box(208, y2 - 4, 140, 24, 'display:flex;justify-content:flex-end;align-items:center;gap:6px', icf('sunset', 20, cs) + `<span class="tn" style="font-size:17px;font-weight:600;letter-spacing:-0.2px;color:${cs}">${hm(LIGHT.set)}</span>`) +
    box(208, y2 + 19, 140, 14, `display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:11px;font-weight:500;color:${c.muted}`, `Закат · ${icf('sunset_glow', 12, 'currentColor')}${ASSESS}`);
  return o;
}
function largeGDE(c, st) {
  const now = { G: T(9, 30), D: T(14, 0), E: T(21, 0), Z: T(14, 0) }[st];
  let inner = (st === 'G' ? ring(364, 382, 22, c, LIGHT.rise, LIGHT.set, now, 200) : '') + sunArc(c, now, st === 'E', st === 'G') + hsep(c, 16, 210, 332);
  const list = st === 'G' ? [{ d: 'сегодня', t: '12:00', n: WED.names, g: 'wedding' }, WEEK_IVA, WEEK_MD] : st === 'Z' ? [] : [WEEK_IVA, WEEK_MD];
  inner += weekL(c, 222, list, st === 'G' || st === 'Z' ? '' : 'через 3 дня', 'до сб 31 съёмок нет');
  return frame(364, 382, 22, c, inner);
}

// route line for large A / V
function routeLine(c, y, sh, route, now) {
  const x0 = 16, x1 = 348, X = m => x0 + (x1 - x0) * (m - sh.start) / (sh.end - sh.start);
  let ci = 0; route.forEach((p, i) => { if (p.t <= now) ci = i; });
  // A pale progress bar of one thickness (Alexey 27.10: no thick insert for the point's span): faint track, the passed part filled a shade stronger
  const ink = a => `rgba(${c.key === 'light' ? '17,17,17' : '236,236,234'},${a})`;
  let o = box(x0, y - 1, x1 - x0, 4, `border-radius:2px;background:${ink(0.12)}`);
  o += box(x0, y - 1, X(now) - x0, 4, `border-radius:2px;background:${ink(0.42)}`);
  route.forEach((p, i) => {
    const x = X(p.t), cur = i === ci, past = i < ci, col = cur ? c.amber : past ? c.dim : c.muted;
    const s = cur ? 7 : 5;
    o += box(x - s / 2, y + 1 - s / 2, s, s, `border-radius:50%;background:${cur ? c.amber : ink(0.42)}`);
    // the current point's sign a touch larger: 17 against 14, bottom on the same line
    const is = cur ? 17 : 14;
    o += ic(p.ic, x - is / 2, y - 10 - is, is, col);
  });
  o += box(X(now) - 0.75, y - 7, 1.5, 16, `border-radius:1px;background:${c.amber}`);
  const lab = (m, col, fw) => { const x = Math.min(x1 - 16, Math.max(x0 + 16, X(m))); return txt(x - 16, y + 12, 32, 14, hm(m), `text-align:center;font-size:11px;font-weight:${fw};color:${col}`, 'tn'); };
  o += lab(route[ci].t, c.amber, 600);
  if (route[ci + 1]) o += lab(route[ci + 1].t, c.muted, 500);
  o += lab(sh.end, c.dim, 500);
  return o;
}
// day line for large B (no route): light marks + shoot bar
function dayLine(c, y, now) {
  const a = 360, b = 1500, x0 = 16, x1 = 348, X = m => x0 + (x1 - x0) * (m - a) / (b - a);
  let o = lightRail(c, x0, x1, y - 1, a, b);
  // the shoot under the rail: gone part dim
  o += box(X(WED.start), y + 6, X(WED.end) - X(WED.start), 2, `border-radius:1px;background:${c.muted}`);
  o += box(X(WED.start), y + 6, X(now) - X(WED.start), 2, `border-radius:1px;background:${c.dotOff}`);
  o += ic('sunrise', X(LIGHT.rise) - 7, y - 24, 14, c.dim) + ic('golden_dial', X(LIGHT.golden) - 7, y - 24, 14, c.amber) + ic('sunset', X(LIGHT.set) - 7, y - 24, 14, c.text);
  o += knob(X(now), y);
  const lab = (m, col, fw, dx = 0) => txt(Math.min(x1 - 16, Math.max(x0 + 16, X(m) + dx)) - 16, y + 12, 32, 14, hm(m), `text-align:center;font-size:11px;font-weight:${fw};color:${col}`, 'tn');
  o += lab(LIGHT.rise, c.dim, 500) + lab(WED.start, c.dim, 500) + lab(LIGHT.set, c.text, 600, 8) + lab(WED.end, c.dim, 500);
  return o;
}
// large V: right of the dial, the in-progress card of the app (11_EVENT_CARD): now, next, place, call
function nowCard(c, x, y, w, cur, curEnd, next) {
  let o = box(x, y, w, 46, `box-sizing:border-box;padding:0 10px;border-radius:9px;background:${c.pill};display:flex;flex-direction:column;justify-content:center;gap:2px`,
    `<div style="display:flex;align-items:center;gap:6px;color:${c.amber}"><span style="font-size:15px;line-height:18px;font-weight:600;white-space:nowrap">${cur.n}</span></div><div class="tn" style="font-size:11px;line-height:14px;font-weight:500;color:${c.muted};white-space:nowrap">сейчас · до ${hm(curEnd)}</div>`);
  const row = (yy, inner) => box(x + 10, yy, w - 10, 18, 'display:flex;align-items:center;gap:6px;white-space:nowrap', inner);
  if (next) o += row(y + 54, `<span style="font-size:11px;font-weight:500;color:${c.dim}">далее</span><span class="tn" style="font-size:13px;font-weight:600;color:${c.text}">${hm(next.t)}</span><span style="font-size:13px;font-weight:500;color:${c.text}">${next.n}</span>`);
  o += row(y + 76, `${icf('pin', 14, c.muted)}<span style="font-size:12px;font-weight:500;color:${c.muted}">${STU.place}</span>`);
  o += row(y + 98, `${icf('call', 14, c.text)}<span style="font-size:12px;font-weight:500;color:${c.text}">Позвонить Ольге</span>`);
  return o;
}
function largeShoot(c, st) {
  let sh, route, now, nm, sign;
  if (st === 'A') { sh = WED; route = ROUTE; now = T(13, 48); nm = WED.names; sign = 'wedding'; }
  if (st === 'V') { sh = STU; route = STU_ROUTE; now = T(13, 48); nm = STU.names; sign = 'portrait'; }
  if (st === 'B') { sh = WED; now = T(15, 18); nm = WED.names; sign = 'wedding'; }
  let inner = ring(364, 382, 22, c, sh.start, sh.end, now, 200) + header(c, 16, 16, 220, sign, nm);
  const leftShoot = sh.end - now;
  inner += win(c, 364, Math.floor(leftShoot / 60) + ':' + String(leftShoot % 60).padStart(2, '0') + ':00');
  if (st === 'B') {
    inner += dial(c, 74, 96, 116, 60 - Math.round(60 * leftShoot / (sh.end - sh.start)), 'wedding', partsOf(leftShoot));
    inner += drum(c, 146, 38, 202, 116, { m1: { time: hm(LIGHT.rise), sign: 'sunrise', text: 'Рассвет' }, c0: { time: hm(LIGHT.golden), sign: 'golden_dial', text: 'Золотой час' }, p1: { time: hm(LIGHT.set), sign: 'sunset', text: 'Закат', extra: ASSESS } });
    inner += dayLine(c, 214, now);
  } else {
    let ci = 0; route.forEach((p, i) => { if (p.t <= now) ci = i; });
    const cur = route[ci], curEnd = cur.e ?? (route[ci + 1] ? route[ci + 1].t : sh.end), rem = Math.max(0, curEnd - now);
    inner += dial(c, 74, 96, 116, 60 - Math.min(60, rem), cur.ic, partsOf(rem).length ? partsOf(rem) : [{ n: '0', u: 'мин' }]);
    if (st === 'V') inner += nowCard(c, 146, 38, 202, cur, curEnd, route[ci + 1]);
    else {
      const dn = i => route[ci + i] ? { time: hm(route[ci + i].t), sign: route[ci + i].ic, text: route[ci + i].n } : null;
      inner += drum(c, 146, 38, 202, 116, { m2: dn(-2), m1: dn(-1), c0: dn(0), p1: dn(1), p2: dn(2) });
    }
    inner += routeLine(c, 214, sh, route, now);
  }
  inner += hsep(c, 16, 252, 332) + weekL(c, 264, [WEEK_IVA, WEEK_MD], 'через 3 дня');
  return frame(364, 382, 22, c, inner);
}

// ---------- lock screen (system draws one tint, no theme, no client names) ----------
function lockPlate(c, w, h, inner) { return `<div style="position:relative;width:${w + 24}px;height:${h + 24}px;border-radius:18px;background:${c.lockPlate};font-family:-apple-system,'SF Pro Text',system-ui,sans-serif;color:${c.lockInk}"><div style="position:absolute;left:12px;top:12px;width:${w}px;height:${h}px">${inner}</div></div>`; }
function lockCirc(c, mode, now) {
  const ink = c.lockInk, rr = 34, L = 2 * Math.PI * rr;
  const fr = Math.min(1, Math.max(0, (now - LIGHT.rise) / (LIGHT.golden - LIGHT.rise)));
  const ringSvg = (arc) => `<svg width="76" height="76" viewBox="0 0 76 76" style="position:absolute;left:0;top:0"><circle cx="38" cy="38" r="${rr}" fill="none" stroke="${ink}" stroke-opacity="0.25" stroke-width="4"></circle>${arc ? `<circle cx="38" cy="38" r="${rr}" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${f1(fr * L)} ${f1(L)}" transform="rotate(-90 38 38)"></circle>` : ''}</svg>`;
  let o = box(0, 0, 76, 76, `border-radius:50%;background:${ink};opacity:0.12`) + ringSvg(mode === 'count');
  if (mode === 'count') {
    const m = LIGHT.golden - now;
    o += ic('golden_dial', 30, 13, 16, ink) + txt(8, 33, 60, 22, Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'), 'text-align:center;font-size:17px;font-weight:600;letter-spacing:-0.3px', 'tn');
  } else o += ic('sunset', 23, 23, 30, ink);
  return lockPlate(c, 76, 76, o);
}
function lockRect(c, l1, l2, l3) {
  const ink = c.lockInk;
  return lockPlate(c, 172, 76, box(0, 0, 172, 76, `border-radius:18px;background:${ink};opacity:0.12`) +
    txt(14, 12, 150, 16, l1, 'font-size:13px;font-weight:600', 'tn') + txt(14, 30, 150, 20, l2, 'font-size:16px;font-weight:600') + txt(14, 52, 150, 16, l3, 'font-size:13px;font-weight:500;opacity:0.6'));
}
function lockLine(c, sign, text) { return lockPlate(c, 257, 26, ic(sign, 0, 5, 16, c.lockInk) + txt(24, 3, 233, 20, text, 'font-size:14px;font-weight:600', 'tn')); }
const LOCK = {
  A: { circ: ['count', T(13, 48)], rect: ['13:00–14:00', 'Обед', 'Томск'], line: ['feast', 'Обед · ещё 12 мин'] },
  B: { circ: ['count', T(15, 18)], rect: ['12:00–00:30', 'Свадьба', 'Томск'], line: ['wedding', 'Свадьба · ещё 9 ч 12 мин'] },
  V: { circ: ['count', T(13, 48)], rect: ['13:00–13:54', 'Студия', 'Зал «Лофт»'], line: ['studio', 'Зал «Лофт» · ещё 6 мин'] },
  G: { circ: ['count', T(9, 30)], rect: ['12:00–00:30', 'Свадьба', 'Томск'], line: ['wedding', 'Свадьба через 2 ч 30 мин'] },
  D: { circ: ['count', T(14, 0)], rect: ['17:56', 'Закат', 'Томск'], line: ['golden_dial', 'Золотой час через 3 ч 1 мин'] },
  E: { circ: ['sun'], rect: ['08:12, завтра', 'Рассвет', 'Томск'], line: ['sunrise', 'Рассвет через 11 ч 12 мин'] }
};

// ---------- board ----------
const COL = { lab: 40, sm: 218, md: 416, lg: 808, ci: 1200, re: 1328, li: 1552 };
const ROWS = [
  { id: 'А', k: 'A', title: 'Съёмка идёт, есть маршрут', sub: '13:48 · Обед (готово)' },
  { id: 'Б', k: 'B', title: 'Съёмка идёт, маршрута нет', sub: '15:18 · свадьба 12:00–00:30 без точек' },
  { id: 'В', k: 'V', title: 'Студийный час', sub: '13:48 · аренда до 13:54 (готово)' },
  { id: 'Г', k: 'G', title: 'Съёмка сегодня впереди', sub: '09:30 · свадьба в 12:00' },
  { id: 'Д', k: 'D', title: 'День без съёмок', sub: '14:00 · ближайшая через 3 дня' },
  { id: 'Е', k: 'E', title: 'Вечер после заката', sub: '21:00 · дальше завтрашний рассвет' },
  { id: '+', k: 'Z', title: 'На неделе съёмок нет', sub: '14:00 · особый случай' }
];
const PITCH = 462, Y0 = 170;

function board(c) {
  const W = 1873, H = Y0 + ROWS.length * PITCH + 20;
  let o = '';
  const put = (x, y, html) => o += box(x, y, 0, 0, 'overflow:visible', `<div style="position:absolute;left:0;top:0">${html}</div>`);
  const T2 = (x, y, w, h, s, css) => o += txt(x, y, w, h, s, css);
  T2(40, 34, 900, 30, `Семья виджетов · ${c.name}`, `font-size:24px;font-weight:700;letter-spacing:-0.4px;color:${c.gText}`);
  T2(40, 70, 1400, 36, 'Строки — состояния, столбцы — формы iPhone Pro Max. Размеры в pt, 1 px = 1 pt, кадры статичные. Малый и средний в строках А и В — готовый компонент «Виджет». Экран блокировки рисует система одним тоном: темы нет, имён клиентов нет.', `font-size:12px;line-height:18px;color:${c.gMuted};white-space:normal`);
  const heads = [[COL.sm, 'Малый', '170×170 · r22'], [COL.md, 'Средний', '364×170 · r22'], [COL.lg, 'Большой', '364×382 · r22'], [COL.ci, 'Блок., круглый', '76×76'], [COL.re, 'Блок., прямоугольный', '172×76'], [COL.li, 'Блок., строка', '257×26']];
  heads.forEach(h => { T2(h[0], 122, 330, 18, h[1], `font-size:13px;font-weight:600;color:${c.gText}`); T2(h[0], 140, 330, 16, h[2], `font-size:11px;color:${c.gMuted}`); });
  ROWS.forEach((r, i) => {
    const y = Y0 + i * PITCH, k = r.k;
    T2(COL.lab, y, 150, 40, r.id, `font-size:34px;font-weight:700;color:${c.gAccent}`);
    o += txt(COL.lab, y + 46, 150, 18, r.title, `font-size:13px;font-weight:600;color:${c.gText}`).replace('white-space:nowrap', 'white-space:normal').replace(`height:18px;line-height:18px`, 'height:54px;line-height:18px');
    o += txt(COL.lab, y + 104, 150, 36, r.sub, `font-size:11px;line-height:16px;color:${c.gMuted}`).replace('white-space:nowrap', 'white-space:normal').replace(`height:36px;line-height:36px`, 'height:54px;line-height:16px');
    const cap = (x, s, w = 360) => o += txt(x, y + 392, w, 34, s, `font-size:11px;line-height:16px;color:${c.gMuted};white-space:normal`).replace('white-space:nowrap;', '');
    // small
    if (k === 'A') put(COL.sm, y, dcImport(c, 'lunch', 'small', 170, 170));
    if (k === 'V') put(COL.sm, y, dcImport(c, 'studio', 'small', 170, 170));
    if (k === 'B') { put(COL.sm, y, smallB(c, 1)); put(COL.sm, y + 186, smallB(c, 2)); cap(COL.sm, '▲ 1 круг = вся съёмка ▼ 2 круг = свет до заката', 170); }
    if (k === 'G') { put(COL.sm, y, smallG(c)); cap(COL.sm, 'главное — ближайшая съёмка', 170); }
    if (k === 'D') { put(COL.sm, y, smallDE(c, false)); cap(COL.sm, 'главное — свет'); }
    if (k === 'E') { put(COL.sm, y, smallDE(c, true)); cap(COL.sm, 'главное — свет, рассвет завтра', 170); }
    if (k === 'Z') T2(COL.sm, y, 170, 36, 'как в Д: на малом неделя не видна', `font-size:11px;line-height:16px;color:${c.gMuted};white-space:normal`);
    // medium
    if (k === 'A') put(COL.md, y, dcImport(c, 'lunch', 'pro', 364, 170));
    if (k === 'V') put(COL.md, y, dcImport(c, 'studio', 'pro', 364, 170));
    if (k === 'B') { put(COL.md, y, mediumB(c, 1)); put(COL.md, y + 186, mediumB(c, 2)); cap(COL.md, '▲ 1 справа свет дня · ▼ 2 круг — свет, справа съёмка'); }
    if (k === 'G' || k === 'D' || k === 'E') { put(COL.md, y, mediumGDE(c, k)); cap(COL.md, k === 'G' ? 'риски = световой день, в день съёмки' : 'без рисок: съёмок сегодня нет'); }
    if (k === 'Z') { put(COL.md, y, mediumEmpty(c)); cap(COL.md, 'одна строка вместо списка'); }
    // large
    if (k === 'A' || k === 'B' || k === 'V') put(COL.lg, y, largeShoot(c, k));
    else put(COL.lg, y, largeGDE(c, k));
    cap(COL.lg, k === 'B' ? 'круг и справа как в среднем 1; вариант 2 — по той же замене' : k === 'V' ? 'как карточка съёмки: сейчас, далее, место, звонок; ниже маршрут и неделя' : k === 'A' ? 'сверху как средний, ниже линия маршрута и неделя' : 'линия дня, ниже неделя');
    // lock
    const L = LOCK[k === 'Z' ? 'D' : k];
    put(COL.ci, y, lockCirc(c, L.circ[0], L.circ[1]));
    put(COL.re, y, lockRect(c, ...L.rect));
    put(COL.li, y + 25, lockLine(c, ...L.line));
  });
  return `<div style="position:relative;width:${W}px;height:${H}px;background:${c.ground};font-family:-apple-system,'SF Pro Text',system-ui,sans-serif;overflow:hidden">${o}</div>`;
}

// ---------- sizes board ----------
function sizesBoard() {
  const sec = (h, lines) => `<section style="display:flex;flex-direction:column;gap:8px"><h2 style="margin:0;font-size:15px;font-weight:600;color:#e0a85a">${h}</h2>${lines.map(l => `<div>${l}</div>`).join('')}</section>`;
  const K = s => `<span class="k">${s}</span>`, V = s => `<span class="v">${s}</span>`;
  const S = [
    sec('Общее', [
      K('Поля содержимого:') + ' ' + V('16') + ' со всех сторон; скругление всех форм Домой ' + V('22') + '. Темы — только Braun чёрный и Braun белый, цвета те же, что в «Размеры, цвета, правила».',
      K('Круг, шапка, окошко, барабан:') + ' как в «Размеры, цвета, правила». Флажок с 27.10 — сам левый край окошка: треугольный вырез ' + V('5') + ' на всю высоту, красная полоса ' + V('4') + ' вдоль него, окошко шире на ' + V('9') + '; в обеих темах.',
      K('Риски:') + ' малый и средний ' + V('150') + ', большой ' + V('200') + ' (шаг по длине пути остаётся около 6,5–7). Правило: риски по периметру есть только в день со съёмкой (А, Б, В, Г), в будний день без съёмок (Д, Е, «+») периметр чистый. Пока идёт съёмка (А, Б, В), риски = вся съёмка; съёмка впереди (Г) — риски = световой день ' + V('08:10 → 17:56') + '. Пройденное гаснет, часовая риска — ближайшая к каждому ровному часу.'
    ]),
    sec('Малый 170 × 170 — новые состояния', [
      K('Геометрия:') + ' как А: шапка ' + V('18') + ', круг D ' + V('116') + ', центр ' + V('(85; 96)') + '.',
      K('Б 1:') + ' горят ' + V('round(60 × осталось / вся съёмка)') + ' точек (15:18 → ' + V('44') + ', гаснут с верха по часовой). В центре знак жанра и «9 ч 12 мин».',
      K('Б 2:') + ' горят ' + V('round(60 × свет до заката / световой день)') + ' (→ ' + V('16') + '). Знак закат, «2 ч 38 мин», подпись «до заката».',
      K('Подпись под числом (Б 2, Г, Д, Е):') + ' ' + V('11 medium') + ', приглушённая, по центру, верх на ' + V('26') + ' ниже центра круга, высота ' + V('14') + '. Шире ' + V('58') + ' не должна: ниже она упирается в точки.',
      K('Г:') + ' шапка — знак жанра и имена, круг горит весь (до начала больше часа), «2 ч 30 мин», подпись «до 12:00».',
      K('Д, Е:') + ' шапка «Томск» (Е — «Томск, завтра») без знака; в круге знак золотого часа / рассвета и время до него, горят все точки.'
    ]),
    sec('Средний 364 × 170 — без идущей съёмки (Г, Д, Е)', [
      K('Слева свет:') + ' подпись «Томск» ' + V('12 medium') + ' в (16; 16). Рассвет: знак ' + V('18') + ', время ' + V('14 semibold') + ', верх строки ' + V('40') + '. Золотой час — то же, верх ' + V('66') + '. Закат: знак ' + V('26') + ', время ' + V('22 semibold') + ', верх ' + V('94') + '. Оценка: знак погоды ' + V('14') + ' + слово ' + V('12 medium') + ', верх ' + V('128') + '.',
      K('Цвет времени:') + ' прошедшее — тусклый, ближайшее — текущая точка (янтарь / чёрный), дальнее — основной текст.',
      K('Оценка заката:') + ' знак «закат с отражением» (sunset_glow) + слово: отличный / хороший / обычный / плохой / туман. Погода облаком тут не рисуется: облако читалось как знак заката.',
      K('Балл заката столбиком (средний Г / Д / пустой, 27.10):') + ' балл заката беты 0–100 (для «хорошего» взят ' + V('62') + ') — капсула ' + V('18 × 116') + ' на x ' + V('136') + ', y ' + V('38') + '; дорожка — чернила × ' + V('0,10') + ', снизу до балла заливка цветами рейки света: синий час (0) → сирень (20) → золото (45) → янтарь (100), так что от «хорошего» и выше верх тёплый; риски ' + V('6 × 0,5') + ' на 20 / 40 / 60 / 80; уровень — та же светлая полоска, что «сейчас» на рейке, ' + V('22 × 2,5') + '; число ' + V('12 semibold') + ' над капсулой. Ночью (Е) столбика нет: заката сегодня уже не будет.',
      K('Е:') + ' ближайшее — завтрашний рассвет: знак ' + V('26') + ', время ' + V('22 semibold') + ' янтарём, подпись «завтра» ' + V('12') + '; золотой час и закат сегодняшние, тусклые.',
      K('Вертикальная полоска:') + ' x = ' + V('168') + ', ширина ' + V('0,5') + ', от y ' + V('16') + ' высотой ' + V('138') + ', чёрный / белый 28 %.',
      K('Список съёмок:') + ' x = ' + V('182') + ', ширина ' + V('166') + '. Строка — день: знак жанра ' + V('14') + ' + имена ' + V('13') + ' (ближайшая semibold), вторая строка «ср 28 · 11:00» ' + V('11 medium') + '. Высота ближайшей ' + V('46') + ' (подложка радиус ' + V('9') + ', как центр барабана), остальных ' + V('40') + ', зазор ' + V('2') + '. «Через 3 дня» — в конце второй строки ближайшей.',
      K('Нет съёмок на неделе:') + ' одна строка «до сб 31 съёмок нет», ' + V('13 medium') + ', приглушённая, верх ' + V('16') + '.',
      K('Риски:') + ' в Г есть (световой день), в Д, Е и «нет съёмок на неделе» нет — периметр чистый, содержимое стоит там же, где стояло бы с рисками.'
    ]),
    sec('Средний 364 × 170 — Б (съёмка без маршрута)', [
      K('Б 1:') + ' круг как у малого Б 1, справа барабан света: «рассвет» ' + V('±1') + ', «золотой час» в центре на подложке, «закат» ' + V('+1') + ' с оценкой. Окошко Braun — «9:12:00», как в А.',
      K('Строка с оценкой:') + ' знак погоды ' + V('12') + ' + слово ' + V('11 medium') + ' после названия, отступ ' + V('3') + '.',
      K('Б 2:') + ' круг — свет до заката (как малый Б 2), справа барабан съёмки: «начало» ' + V('±1') + ', «конец съёмки» в центре.'
    ]),
    sec('Большой 364 × 382', [
      K('Сверху (А, Б, В):') + ' блок среднего: шапка, окошко, круг ' + V('D 116') + ', барабан — те же координаты, высота до ' + V('154') + '.',
      K('В — справа карточка вместо барабана:') + ' x ' + V('146') + ', ширина ' + V('202') + '. Сейчас — подложка ' + V('46') + ' на y ' + V('38') + ', радиус ' + V('9') + ', поля ' + V('10') + ': название ' + V('15 semibold') + ' текущей точкой, ниже «сейчас · до 13:54» ' + V('11') + '. Строки по ' + V('18') + ' с x ' + V('156') + ' на y ' + V('92 / 114 / 136') + ': «далее» ' + V('11') + ' + время ' + V('13 semibold') + ' + точка ' + V('13') + '. Знака точки в карточке нет: он уже в круге и на линии маршрута; место — знак pin ' + V('14') + ' + адрес ' + V('12') + ' приглушённо; звонок — знак call ' + V('14') + ' + «Позвонить Ольге» ' + V('12') + ' (нажатие — звонок заказчику). Барабан убран: точки маршрута уже на линии ниже.',
      K('Линия маршрута (А, В):') + ' рейка x ' + V('16 → 348') + ', y ' + V('214') + ', толщина ' + V('4') + ', радиус ' + V('2') + ', блеклая шкала прогресса (27.10): дорожка — чернила × ' + V('0,12') + ', пройденное до «сейчас» заливается чернилами × ' + V('0,42') + ', толщина одна, вставок у промежутков нет; точка ' + V('5') + ' цветом заливки (текущая ' + V('7') + ' янтарём); знак точки ' + V('14') + ', у текущей ' + V('17') + ' (× 1,2), низ знака на ' + V('10') + ' выше рейки; «сейчас» — чёрточка ' + V('1,5 × 16') + '. Подписи времени ' + V('11') + ' на ' + V('12') + ' ниже рейки: текущая, следующая, конец.',
      K('Линия дня (Б):') + ' рейка света 06:00 → 01:00 той же длины, под ней съёмка — полоса ' + V('2') + ' на ' + V('6') + ' ниже, пройденное гаснет; знаки рассвета / золотого часа / заката ' + V('14') + '.',
      K('Рейка света (Б, Г, Д, Е, «+», 27.10):') + ' та же, что у ползунка в приложении: цвет по высоте солнца (ночь → синий час → золотой → день → золотой → синий → ночь), остановки PATH_STOPS из беты, шаг ' + V('10 мин') + ', толщина ' + V('4') + ', радиус ' + V('2') + '. Высота солнца — Томск ' + V('56,5°') + ', склонение подогнано под восход и закат 08:10 / 17:56 (' + V('−10,8°') + '): золотой час выходит с ' + V('+6,8°') + ', как 17:01. «Сейчас» — светлая полоска поперёк рейки ' + V('2,5 × 14') + ', радиус ' + V('1,25') + ', тёмный волосок по краю ' + V('0,5') + ' (не бусина).',
      K('Разделитель:') + ' ' + V('0,5') + ', на y ' + V('252') + ' (Г, Д, Е — ' + V('210') + '). Неделя (Г, Д, Е — с y ' + V('222') + ', у А, Б, В — с ' + V('264') + '): строки высотой ' + V('38') + ', шаг ' + V('40') + ', поля ' + V('10') + '; колонки «день» ' + V('48') + ', знак ' + V('14') + ', время ' + V('40') + ', имена ' + V('14') + '.',
      K('Линия дня (Г, Д, Е, «+»):') + ' рейка 06:00 → 24:00, x ' + V('16 → 348') + ', y ' + V('96') + ', толщина ' + V('4') + '; рейка — рейка света (см. ниже), «сейчас» — полоска поперёк рейки. Знаки рассвета / золотого часа / заката ' + V('18') + ' на y ' + V('58') + ', золотой сдвинут на ' + V('12') + ' влево, закат на ' + V('12') + ' вправо, от знака к рейке волосок ' + V('0,5') + '. Часы через ' + V('3') + ' ч: риска ' + V('1 × 4') + ' и число ' + V('10') + '. В Г под рейкой полоса свадьбы ' + V('4') + ' на y ' + V('134') + ' и подпись ' + V('10') + '.',
      K('Время под линией (y 154):') + ' рассвет слева, золотой час с x ' + V('128') + ', закат справа: знак ' + V('20') + ', время ' + V('17 semibold') + ', под ним «Закат · знак ' + V('12') + ' + оценка» ' + V('11') + '.'
    ]),
    sec('Знаки света (новые 27.10 — кандидаты в библиотеку)', [
      (() => { const row = (n, lab) => `<div style="display:flex;align-items:center;gap:14px;color:#f2efe8">${[48, 26, 18, 14].map(z => icf(n, z, 'currentColor')).join('')}<span><span class="k">${lab}</span></span></div>`;
        return row('sunrise', 'рассвет — миг, стрелка вверх (есть)') + row('sunset', 'закат — миг, стрелка вниз (есть)') + row('golden_dial', '<b style="color:#e0a85a">золотой час — новый:</b> солнце с циферблатом, промежуток времени') + row('sunset_glow', '<b style="color:#e0a85a">оценка заката — новый:</b> солнце у горизонта с отражением') + row('golden', 'прежний золотой час — солнце у горизонта без стрелки; на досках больше не стоит'); })(),
      K('Сетка:') + ' 24 × 24, линия ' + V('1,5') + ', круглые концы, как вся библиотека. Циферблат: диск ' + V('r 5,6') + ', стрелки ' + V('3,3') + ' и ' + V('2,9') + ' (на «пять минут третьего»), лучи ' + V('8,2 → 10,4') + ' от центра. Отражение: горизонт поднят на ' + V('2') + ' против рассвета и заката, под ним две полосы воды ' + V('8,8') + ' и ' + V('4,4') + ' через ' + V('3') + '.'
    ]),
    sec('Блокировка (по таблице Apple, на телефоне не мерено)', [
      K('Тон:') + ' один, ставит система (на плашке: белый / тёмный по обоям). Цветов, подложек и имён клиентов нет. Фон виджета — тон ' + V('12 %') + '.',
      K('Круглый 76 × 76:') + ' кольцо радиус ' + V('34') + ', ' + V('4') + ', дорожка ' + V('25 %') + '; дуга = доля пути от рассвета до золотого часа. Знак золотого часа ' + V('16') + ' (верх ' + V('13') + '), число ' + V('17 semibold') + ' «3:13» (верх ' + V('33') + '). После начала золотого часа — знак «закат» ' + V('30') + ' без цифр и дуги.',
      K('Прямоугольный 172 × 76:') + ' поля слева ' + V('14') + '; три строки: время ' + V('13 semibold') + ' (верх 12), название ' + V('16 semibold') + ' (верх 30), место ' + V('13 medium') + ' 60 % (верх 52). Скругление ' + V('18') + '. Если места нет — город.',
      K('Строка 257 × 26:') + ' знак ' + V('16') + ' + текст ' + V('14 semibold') + ', отступ ' + V('8') + '. Шаблон: «название · ещё N мин» или «событие через N».'
    ]),
    sec('Допущения этого кадра', [
      'Рассвет завтра ' + V('08:12') + ' — для кадра, считает приложение.',
      'Неделя: ср 28 11:00 Семья Ивановых, пт 30 13:00 Мария и Дмитрий; «вс 25 16:30 Ольга Ветрова» в строках Г и Д не показана (иначе день не «без съёмок» / пересечение со свадьбой), в Е она уже прошла.',
      '«До сб 31»: 31 октября 2026 — суббота.'
    ])
  ];
  return `<div style="width:1200px;height:2120px;box-sizing:border-box;padding:48px;background:#1f1e1b;color:#f2efe8;font-family:-apple-system,'SF Pro Text',system-ui,sans-serif;font-size:13px;line-height:19px;display:flex;flex-direction:column;gap:28px">
<div style="display:flex;flex-direction:column;gap:6px"><h1 style="margin:0;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.4px">Семья виджетов: размеры новых форм</h1>
<p style="margin:0;color:#9a968c;max-width:900px">Все числа в pt, 1 px = 1 pt. Дополняет «Размеры, цвета, правила» (средний с идущей съёмкой там остаётся как есть).</p></div>
<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:48px;row-gap:28px;align-items:start">${S.join('')}</div></div>`;
}

// ---------- write ----------
const head = (title, w, h) => `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0}
.tn{font-variant-numeric:tabular-nums}
.k{color:#9a968c}
.v{font-variant-numeric:tabular-nums;color:#f2efe8}
.ic{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;flex:none;display:block}
</style>
</helmet>
`;
const tail = (w, h) => `
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
`;
fs.mkdirSync(path.join(OUT, 'project'), { recursive: true });
const dims = {};
for (const [file, key, title] of [['Family.dc.html', 'dark', 'Семья виджетов · Braun чёрный'], ['FamilyLight.dc.html', 'light', 'Семья виджетов · Braun белый']]) {
  const html = board(TH[key]); const H = Y0 + ROWS.length * PITCH + 20;
  fs.writeFileSync(path.join(OUT, 'project', file), head(title) + html + tail(1873, H));
  dims[file] = { w: 1873, h: H };
}
const sz = sizesBoard();
fs.writeFileSync(path.join(OUT, 'project', 'FamilySizes.dc.html'), head('Семья виджетов: размеры') + sz + tail(1200, 2120));
if (TEST) {
  const tpl = k => `<!doctype html><meta charset=utf-8><style>body{margin:0}.tn{font-variant-numeric:tabular-nums}.ic{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;flex:none;display:block}.k{color:#9a968c}.v{color:#f2efe8}</style>`;
  fs.writeFileSync(path.join(OUT, 'test_dark.html'), tpl() + board(TH.dark));
  fs.writeFileSync(path.join(OUT, 'test_light.html'), tpl() + board(TH.light));
  fs.writeFileSync(path.join(OUT, 'test_sizes.html'), tpl() + sz);
}
console.log(JSON.stringify(dims));

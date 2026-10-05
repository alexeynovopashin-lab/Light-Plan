// Pinterest reader for the Light Plan app (Yandex Cloud Functions, Node.js 22, no dependencies).
// Same three modes and the same answer shape as the Cloudflare worker of the beta (og-reader/worker.js),
// so the client changes only the address and adds the key header. Unlike the worker this is NOT an open proxy:
// only Pinterest hosts are reachable (see allowedHost), on every redirect hop too.
// Spec: docs/pinterest_reference.md (§ 3.2–3.4).
//
//   GET <function url>?board=<board link or pin.it link>  → JSON { name, pinCount, truncated, pins:[{ id, permalink, image }] }
//   GET <function url>?url=<pin page / pin.it link>       → bytes of the og:image of the page
//   GET <function url>?img=<https://i.pinimg.com/...>     → bytes of the picture
//   GET <function url>?pic=<https://any.host/photo.jpg>   → bytes of a picture at ANY public https address (28n.1, picfetch.js:
//                                                           internal addresses refused at connect time, ≤ 3 redirects, ≤ 2.5 MB, JPEG/PNG/WebP/HEIC by bytes)
//   header X-LP-Key: <app key>
//
// Errors are JSON { error: "<reason>", reason: "<reason>" }:
//   400 bad request | bad url | not a board url | host not allowed   403 forbidden (no/wrong key, not GET)
//   404 board not found | no og:image | not found | not an image     413 too large (?pic= : over 2.5 MB)
//   429 rate (per IP) | daily ceiling                                 502 upstream (Pinterest did not answer / refused)
//   500 internal
//
// Settings (function environment variables, never in the repository):
//   LP_KEY     — the app key (own key of this function, not the weather one)
//   DAILY_CAP  — optional, ceiling of upstream requests per UTC day for one instance (default 3000)
//   PIC_DAILY_CAP — optional, the same for ?pic= (default 1500; separate, so a flood of direct pictures cannot eat the Pinterest budget)
//
// Caches live in the memory of the running instance (no bucket, nothing is stored outside it): a cold instance starts empty.
// Nothing is logged except mode, status and time — no links, no IPs.
const crypto = require('node:crypto');
const { Fail, fetchPicture } = require('./picfetch');

const UA = 'LightPlanLinkPreview/1.0 (+https://alexeynovopashin-lab.github.io/Light-Plan/)';
const PWS_HANDLER = 'www/[username]/[slug].js';
const UPSTREAM_TIMEOUT = 8000;
const MAX_HOPS = 5;
const IMG_MAX = 2.5 * 1024 * 1024; // raw bytes; the answer goes out base64 (+33 %) under the 3.5 MB response limit of the platform
const HTML_MAX = 3 * 1024 * 1024; // a Pinterest pin page is ~1.2 MB and its og:image sits at ~1.1 MB, after </head> (measured 2026-10-03)
const PIN_CAP = 100;
const DAILY_CAP = Number(process.env.DAILY_CAP) || 3000;
const PIC_DAILY_CAP = Number(process.env.PIC_DAILY_CAP) || 1500;
const PER_IP_PER_MINUTE = 240;
const PIC_PER_IP_PER_MINUTE = 30;

const BOARD_TTL = 10 * 60 * 1000;
const SHORT_TTL = 60 * 60 * 1000;
const OG_TTL = 60 * 60 * 1000;
const IMG_TTL = 60 * 60 * 1000;
const IMG_CACHE_BYTES = 40 * 1024 * 1024;

// ---------- host allow-list ----------
// pinterest.<tld> and subdomains, pin.it, pinimg.com and subdomains. https, default port, no credentials.
const PINTEREST_RE = /(^|\.)pinterest\.(com|ru|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/;
function parse(href) {
  let u;
  try { u = new URL(href); } catch (e) { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
  return u;
}
const isPinimg = (h) => h === 'pinimg.com' || h.endsWith('.pinimg.com');
const isPinterest = (h) => PINTEREST_RE.test(h);
const allowedHost = (h) => isPinterest(h) || h === 'pin.it' || isPinimg(h);

// ---------- caches / limits (instance memory) ----------
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const boardCache = new Map(); // "user/slug" → { data, at }
const shortCache = new Map(); // sha(link) → { href, at }
const ogCache = new Map(); // sha(page url) → { image, at }
const imgCache = new Map(); // sha(image url) → { buf, type, at }
let imgBytes = 0;
let day = '';
let spent = 0; // upstream requests used today by this instance
let picSpent = 0; // the same for ?pic=
const ipHits = new Map();

const fresh = (e, ttl, now) => e && now - e.at < ttl;
function imgPut(key, buf, type, now) {
  const old = imgCache.get(key);
  if (old) { imgBytes -= old.buf.length; imgCache.delete(key); }
  imgCache.set(key, { buf, type, at: now });
  imgBytes += buf.length;
  while (imgBytes > IMG_CACHE_BYTES && imgCache.size) {
    const k = imgCache.keys().next().value;
    imgBytes -= imgCache.get(k).buf.length;
    imgCache.delete(k);
  }
}
function smallPut(map, key, val, max = 500) {
  map.delete(key);
  map.set(key, val);
  while (map.size > max) map.delete(map.keys().next().value);
}

// ---------- upstream ----------
// One request to an allowed host; redirects are followed by hand and every hop is checked against the allow-list.
async function safeFetch(href, headers, wantFinal) {
  let url = href;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const u = parse(url);
    if (!u || !allowedHost(u.hostname)) throw new Fail(400, 'host not allowed');
    if (spent >= DAILY_CAP) throw new Fail(429, 'daily ceiling');
    spent += 1;
    let res;
    try {
      res = await fetch(u.href, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT), redirect: 'manual', headers: { 'user-agent': UA, ...headers } });
    } catch (e) { throw new Fail(502, 'upstream'); }
    if (res.status >= 300 && res.status < 400) {
      try { if (res.body) res.body.cancel(); } catch (e) {}
      const loc = res.headers.get('location');
      if (!loc) throw new Fail(502, 'upstream');
      try { url = new URL(loc, u.href).href; } catch (e) { throw new Fail(502, 'upstream'); }
      if (wantFinal === false) return { redirect: url };
      continue;
    }
    return { res, url: u.href };
  }
  throw new Fail(502, 'upstream');
}

// Body of a response up to `max` bytes; `stop(textSoFar)` may end the read early (stops at the first og:image).
async function readBody(res, max, stop) {
  const reader = res.body.getReader();
  const chunks = [];
  let n = 0, text = '';
  const dec = stop ? new TextDecoder() : null;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.length;
      if (n > max) {
        if (stop) break;
        throw new Fail(413, 'too large');
      }
      chunks.push(value);
      if (stop) { text += dec.decode(value, { stream: true }); if (stop(text)) break; }
    }
  } catch (e) {
    if (e instanceof Fail) throw e;
    throw new Fail(502, 'upstream');
  } finally { try { reader.cancel(); } catch (e) {} }
  return stop ? text : Buffer.concat(chunks);
}

const unent = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");
function findOgImage(html) {
  let tw = null;
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const key = (/\b(?:property|name)\s*=\s*"([^"]*)"/i.exec(tag) || [])[1];
    const val = (/\bcontent\s*=\s*"([^"]*)"/i.exec(tag) || [])[1];
    if (!key || !val) continue;
    if (key === 'og:image' || key === 'og:image:secure_url') return unent(val);
    if (key === 'twitter:image' && !tw) tw = unent(val);
  }
  return tw;
}

async function getImage(href, now) {
  const key = sha(href);
  const hit = imgCache.get(key);
  if (fresh(hit, IMG_TTL, now)) return { buf: hit.buf, type: hit.type, state: 'hit' };
  const { res } = await safeFetch(href, { accept: 'image/*' });
  // i.pinimg.com answers 403 (not 404) for a picture that does not exist (measured 2026-10-03): the client must see 404, not 502.
  if (res.status === 404 || res.status === 410 || res.status === 403) { try { res.body.cancel(); } catch (e) {} throw new Fail(404, 'not found'); }
  if (!res.ok || !res.body) throw new Fail(502, 'upstream');
  const type = res.headers.get('content-type') || 'image/jpeg';
  if (!/^image\//.test(type)) throw new Fail(404, 'not an image');
  const len = Number(res.headers.get('content-length'));
  if (len > IMG_MAX) { try { res.body.cancel(); } catch (e) {} throw new Fail(413, 'too large'); }
  const buf = await readBody(res, IMG_MAX);
  imgPut(key, buf, type, now);
  return { buf, type, state: 'miss' };
}

// ---------- modes ----------
function boardParts(u) {
  if (!isPinterest(u.hostname) || /^api\./.test(u.hostname)) return null;
  let segs;
  try { segs = u.pathname.split('/').filter(Boolean).map(decodeURIComponent); } catch (e) { return null; }
  if (segs.length < 2 || segs[0] === 'pin') return null;
  return { username: segs[0], slug: segs[1] };
}

async function resolveShort(href, now) {
  const key = sha(href);
  const hit = shortCache.get(key);
  if (fresh(hit, SHORT_TTL, now)) return hit.href;
  let url = href;
  for (let i = 0; i < MAX_HOPS; i++) {
    const u = parse(url);
    if (!u || !allowedHost(u.hostname)) throw new Fail(400, 'host not allowed');
    if (boardParts(u)) break; // recognisable board: do not request the page itself
    const r = await safeFetch(url, {}, false);
    if (!r.redirect) break;
    url = r.redirect;
  }
  smallPut(shortCache, key, { href: url, at: now });
  return url;
}

async function resourceGet(origin, resource, data) {
  const u = `${origin}/resource/${resource}/get/?data=${encodeURIComponent(JSON.stringify(data))}`;
  const { res } = await safeFetch(u, { accept: 'application/json', 'x-pinterest-pws-handler': PWS_HANDLER });
  if (res.status === 404) { try { res.body.cancel(); } catch (e) {} return null; }
  if (!res.ok) { try { res.body.cancel(); } catch (e) {} throw new Fail(502, 'upstream'); }
  try { return JSON.parse((await readBody(res, 4 * 1024 * 1024)).toString('utf8')); } catch (e) { if (e instanceof Fail) throw e; throw new Fail(502, 'upstream'); }
}

async function modeBoard(link, now) {
  let u = parse(link);
  if (!u || !allowedHost(u.hostname)) throw new Fail(400, u ? 'host not allowed' : 'bad url');
  if (!boardParts(u)) {
    u = parse(await resolveShort(u.href, now));
    if (!u || !boardParts(u)) throw new Fail(400, 'not a board url');
  }
  const parts = boardParts(u);
  const ckey = `${parts.username}/${parts.slug}`.toLowerCase();
  const hit = boardCache.get(ckey);
  if (fresh(hit, BOARD_TTL, now)) return { body: hit.data, state: 'hit' };

  const bd = await resourceGet(u.origin, 'BoardResource', { options: { field_set_key: 'detailed', username: parts.username, slug: parts.slug }, context: {} });
  const board = bd && bd.resource_response && bd.resource_response.data;
  if (!board || !board.id) throw new Fail(404, 'board not found');
  const pageSize = Math.max(1, Math.min(board.pin_count || 25, PIN_CAP));
  const fd = await resourceGet(u.origin, 'BoardFeedResource', { options: { board_id: board.id, board_url: u.pathname, page_size: pageSize }, context: {} });
  const pins = (fd && fd.resource_response && fd.resource_response.data) || [];
  const out = [];
  for (const p of pins) {
    if (!p || !p.id || !p.images) continue;
    const img = p.images['736x'] || p.images['474x'] || p.images['236x'] || p.images.orig;
    if (!img || !img.url) continue;
    out.push({ id: String(p.id), permalink: `https://www.pinterest.com/pin/${p.id}/`, image: img.url });
  }
  const pinCount = board.pin_count || out.length;
  const data = JSON.stringify({ name: board.name || '', pinCount, truncated: pinCount > pageSize, pins: out });
  smallPut(boardCache, ckey, { data, at: now }, 100);
  return { body: data, state: 'miss' };
}

async function modeUrl(page, now) {
  const u = parse(page);
  if (!u || !allowedHost(u.hostname)) throw new Fail(400, u ? 'host not allowed' : 'bad url');
  const okey = sha(u.href);
  let hit = ogCache.get(okey);
  let image;
  if (fresh(hit, OG_TTL, now)) image = hit.image;
  else {
    const { res, url } = await safeFetch(u.href, { accept: 'text/html,application/xhtml+xml' });
    if (res.status === 404 || res.status === 410) throw new Fail(404, 'no og:image');
    if (!res.ok || !res.body) throw new Fail(502, 'upstream');
    let found = null;
    const html = await readBody(res, HTML_MAX, (t) => { found = findOgImage(t); return !!found; });
    image = found || findOgImage(html);
    if (!image) throw new Fail(404, 'no og:image');
    try { image = new URL(image, url).href; } catch (e) { throw new Fail(404, 'no og:image'); }
    smallPut(ogCache, okey, { image, at: now });
  }
  const iu = parse(image);
  if (!iu || !isPinimg(iu.hostname)) throw new Fail(404, 'no og:image');
  return getImage(iu.href, now);
}

// Any public https picture. Nothing is cached or stored: the instance forgets it as soon as the answer is out.
async function modePic(href, _now, deps) {
  if (picSpent >= PIC_DAILY_CAP) throw new Fail(429, 'daily ceiling');
  picSpent += 1;
  const r = await fetchPicture(href, deps);
  return { buf: r.buf, type: r.type, state: 'none', nosniff: true };
}

async function modeImg(href, now) {
  const u = parse(href);
  if (!u) throw new Fail(400, 'bad url');
  if (!isPinimg(u.hostname)) throw new Fail(400, 'host not allowed');
  return getImage(u.href, now);
}

// ---------- plumbing ----------
const json = (statusCode, body, extra = {}) => ({ statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra }, body });
const fail = (f) => json(f.status, JSON.stringify({ error: f.reason, reason: f.reason }), f.extra || {});

function keyOk(given) {
  const want = process.env.LP_KEY || '';
  if (!want || typeof given !== 'string') return false;
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(given).digest(), crypto.createHash('sha256').update(want).digest());
}

exports.handler = async (event) => {
  const t0 = Date.now();
  const h = {};
  for (const [k, v] of Object.entries(event.headers || {})) h[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
  if ((event.httpMethod || 'GET') !== 'GET' || !keyOk(h['x-lp-key'])) return fail(new Fail(403, 'forbidden'));

  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) { day = today; spent = 0; picSpent = 0; }
  const ip = (event.requestContext && event.requestContext.identity && event.requestContext.identity.sourceIp) || h['x-forwarded-for'] || '';
  const minute = Math.floor(now / 60000);
  const hit = ipHits.get(ip) || { minute, n: 0 };
  if (hit.minute !== minute) { hit.minute = minute; hit.n = 0; }
  hit.n += 1;
  ipHits.set(ip, hit);
  if (ipHits.size > 2000) for (const [k, v] of ipHits) if (v.minute !== minute) ipHits.delete(k);
  if (hit.n > PER_IP_PER_MINUTE) return fail(new Fail(429, 'rate', { 'Retry-After': '60' }));

  const q = event.queryStringParameters || {};
  let mode = 'none', result;
  try {
    if (q.board) {
      mode = 'board';
      const r = await modeBoard(q.board, now);
      result = json(200, r.body, { 'Cache-Control': 'no-store', 'X-LP-Cache': r.state });
    } else if (q.pic) {
      mode = 'pic';
      if (hit.picN === undefined || hit.picMinute !== minute) { hit.picN = 0; hit.picMinute = minute; }
      if (++hit.picN > PIC_PER_IP_PER_MINUTE) throw new Fail(429, 'rate', { 'Retry-After': '60' });
      const r = await modePic(q.pic, now);
      result = {
        statusCode: 200,
        headers: { 'Content-Type': r.type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
        isBase64Encoded: true,
        body: r.buf.toString('base64'),
      };
    } else if (q.img || q.url) {
      mode = q.img ? 'img' : 'url';
      const r = q.img ? await modeImg(q.img, now) : await modeUrl(q.url, now);
      result = {
        statusCode: 200,
        headers: { 'Content-Type': r.type, 'Cache-Control': 'public, max-age=86400', 'X-LP-Cache': r.state },
        isBase64Encoded: true,
        body: r.buf.toString('base64'),
      };
    } else throw new Fail(400, 'bad request');
  } catch (e) {
    if (e instanceof Fail) result = fail(e);
    else result = fail(new Fail(500, 'internal'));
  }
  if (result.statusCode === 429 && result.headers['Retry-After'] === undefined) {
    result.headers['Retry-After'] = String(Math.ceil((Date.parse(today) + 86400000 - Date.now()) / 1000));
  }
  console.log(`${mode} ${result.statusCode} ${Date.now() - t0}ms`);
  return result;
};

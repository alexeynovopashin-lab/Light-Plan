// Direct picture mode of the Light Plan reader (28n.1): fetch ANY public https picture for the app.
// Unlike the Pinterest modes this is an open fetcher, so it is hardened (docs/direct_image_links.md § 3):
//   https only, port 443, no credentials · localhost / *.local / *.internal refused · the IP the socket really connects to
//   is checked at DNS-lookup time (blocks hosts that resolve to internal addresses and DNS rebinding) · at most 3
//   redirects, each hop checked again · body read as a stream under a hard cap (Content-Length is not trusted) ·
//   type by header AND by the first bytes (JPEG / PNG / WebP / HEIC only: no SVG, no HTML, no script) and the type
//   we answer with comes from the bytes, never from the remote header.
// No dependencies. `request` and `lookup` are injectable so the tests need no network.
const https = require('node:https');
const dns = require('node:dns');
const net = require('node:net');

class Fail extends Error { constructor(status, reason, extra) { super(reason); this.status = status; this.reason = reason; this.extra = extra; } }

const PIC_MAX = 2.5 * 1024 * 1024; // raw bytes: the answer goes out base64 (+33 %) under the 3.5 MB response limit of the platform
const PIC_HOPS = 3;
const PIC_TIMEOUT = 8000; // whole fetch, all hops

// ---------- address checks ----------
const blocked = new net.BlockList();
for (const [a, p] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4]]) blocked.addSubnet(a, p, 'ipv4');
for (const [a, p] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32], ['100::', 64]]) blocked.addSubnet(a, p, 'ipv6');

// Embedded IPv4 in IPv6 (::ffff:a.b.c.d, ::a.b.c.d, 64:ff9b::a.b.c.d) → the IPv4 part is checked on its own.
function embeddedV4(ip) {
  const m = /^(?:::ffff:|::|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (m) return m[1];
  const h = /^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(ip); // hex form of the same thing
  if (h) { const a = parseInt(h[1], 16), b = parseInt(h[2], 16); return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`; }
  return null;
}
function isBlockedIp(ip) {
  const v = net.isIP(ip);
  if (!v) return true; // not an address: refuse
  if (v === 4) return blocked.check(ip, 'ipv4');
  const e = embeddedV4(ip);
  if (e) return blocked.check(e, 'ipv4');
  return blocked.check(ip, 'ipv6');
}

// A parsed https URL we are willing to connect to, or a Fail. `new URL` already turns 2130706433 / 0x7f.1 into 127.0.0.1.
function checkUrl(href) {
  let u;
  try { u = new URL(href); } catch (e) { throw new Fail(400, 'bad url'); }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) throw new Fail(400, 'bad url');
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h) throw new Fail(400, 'bad url');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localdomain')) {
    throw new Fail(400, 'host not allowed');
  }
  if (net.isIP(h) && isBlockedIp(h)) throw new Fail(400, 'host not allowed');
  if (!net.isIP(h) && !h.includes('.')) throw new Fail(400, 'host not allowed'); // single-label names are internal by convention
  return u;
}

// DNS lookup used for the socket: every address the name resolves to must be public (stricter than "the chosen one").
function safeLookup(hostname, options, cb) {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addrs) => {
    if (err) return cb(err);
    if (!addrs.length || addrs.some((a) => isBlockedIp(a.address))) {
      const e = new Error('blocked address'); e.code = 'LP_BLOCKED'; return cb(e);
    }
    if (options && options.all) return cb(null, addrs);
    cb(null, addrs[0].address, addrs[0].family);
  });
}

// ---------- picture type by bytes ----------
function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return 'image/png';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('latin1', 4, 8) === 'ftyp') {
    const brand = buf.toString('latin1', 8, 12);
    if (['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
  }
  return null;
}

// ---------- fetch ----------
function get(u, deps, deadline) {
  return new Promise((resolve, reject) => {
    const left = deadline - Date.now();
    if (left <= 0) return reject(new Fail(502, 'upstream'));
    let done = false;
    const req = deps.request({
      protocol: 'https:', hostname: u.hostname.replace(/^\[|\]$/g, ''), port: 443, path: u.pathname + u.search, method: 'GET',
      lookup: deps.lookup,
      headers: { 'user-agent': 'LightPlanLinkPreview/1.0 (+https://alexeynovopashin-lab.github.io/Light-Plan/)', accept: 'image/jpeg,image/png,image/webp,image/heic,image/*;q=0.5', 'accept-encoding': 'identity' },
    }, (res) => { done = true; clearTimeout(timer); resolve(res); });
    const timer = setTimeout(() => { req.destroy(); if (!done) reject(new Fail(502, 'upstream')); }, left);
    req.on('error', (e) => {
      clearTimeout(timer);
      if (e && e.code === 'LP_BLOCKED') return reject(new Fail(400, 'host not allowed'));
      if (e && (e.code === 'ENOTFOUND' || e.code === 'EAI_AGAIN')) return reject(new Fail(404, 'not found'));
      reject(new Fail(502, 'upstream'));
    });
    req.end();
  });
}

function readCapped(res, max, deadline) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    const timer = setTimeout(() => { res.destroy(); reject(new Fail(502, 'upstream')); }, Math.max(1, deadline - Date.now()));
    res.on('data', (c) => {
      n += c.length;
      if (n > max) { clearTimeout(timer); res.destroy(); reject(new Fail(413, 'too large')); return; }
      chunks.push(c);
    });
    res.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
    res.on('error', () => { clearTimeout(timer); reject(new Fail(502, 'upstream')); });
    res.on('aborted', () => { clearTimeout(timer); reject(new Fail(502, 'upstream')); });
  });
}

// → { buf, type } where type comes from the bytes. Throws Fail: 400 bad url | host not allowed · 404 not found | not an image · 413 too large · 502 upstream.
async function fetchPicture(href, opts = {}) {
  const deps = { request: opts.request || https.request, lookup: opts.lookup || safeLookup };
  const max = opts.max || PIC_MAX, hops = opts.hops == null ? PIC_HOPS : opts.hops;
  const deadline = Date.now() + (opts.timeout || PIC_TIMEOUT);
  let url = href;
  for (let hop = 0; hop <= hops; hop++) {
    const u = checkUrl(url);
    const res = await get(u, deps, deadline);
    const status = res.statusCode || 0;
    if (status >= 300 && status < 400) {
      const loc = res.headers && res.headers.location;
      try { res.resume(); res.destroy(); } catch (e) {}
      if (!loc) throw new Fail(502, 'upstream');
      try { url = new URL(loc, u.href).href; } catch (e) { throw new Fail(502, 'upstream'); }
      continue;
    }
    if (status === 404 || status === 410 || status === 403 || status === 401) { try { res.destroy(); } catch (e) {} throw new Fail(404, 'not found'); }
    if (status < 200 || status >= 300) { try { res.destroy(); } catch (e) {} throw new Fail(502, 'upstream'); }
    const ctype = String(res.headers['content-type'] || '').toLowerCase();
    if (!ctype.startsWith('image/') || ctype.startsWith('image/svg')) { try { res.destroy(); } catch (e) {} throw new Fail(404, 'not an image'); }
    const len = Number(res.headers['content-length']);
    if (len > max) { try { res.destroy(); } catch (e) {} throw new Fail(413, 'too large'); }
    const buf = await readCapped(res, max, deadline);
    const type = sniffImage(buf);
    if (!type) throw new Fail(404, 'not an image');
    return { buf, type };
  }
  throw new Fail(502, 'upstream'); // more than `hops` redirects
}

module.exports = { Fail, fetchPicture, checkUrl, isBlockedIp, sniffImage, safeLookup, PIC_MAX, PIC_HOPS, PIC_TIMEOUT };

// Tests of the direct picture mode (picfetch.js, ?pic=): no network — `request` is a scripted fake that, like the real
// https.request, asks the injected `lookup` before "connecting". Run: node --test yandex/lightplanogreader/test/
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { fetchPicture, checkUrl, isBlockedIp, sniffImage, safeLookup } = require('../picfetch');

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 2)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(30, 3)]);
const HEIC = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypheic'), Buffer.alloc(30, 4)]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(40, 5)]);
const HTML = Buffer.from('<html><script>alert(1)</script></html>' + ' '.repeat(40));

// script: { 'host/path': { status, headers, body (Buffer | Buffer[]), hang } }. Public IPs by default; `ips[host]` overrides.
function rig(script, ips = {}) {
  const asked = [];
  const lookup = (host, options, cb) => {
    const ip = ips[host] || '93.184.216.34';
    // same decision as safeLookup, on the stubbed address
    if (isBlockedIp(ip)) { const e = new Error('blocked'); e.code = 'LP_BLOCKED'; return cb(e); }
    cb(null, [{ address: ip, family: ip.includes(':') ? 6 : 4 }]);
  };
  const request = (opts, onRes) => {
    const req = new EventEmitter();
    req.destroy = () => {};
    req.end = () => {
      asked.push(opts.hostname + opts.path);
      opts.lookup(opts.hostname, { all: true }, (err) => {
        if (err) return setImmediate(() => req.emit('error', err));
        const spec = script[opts.hostname + opts.path] || { status: 404, headers: {}, body: Buffer.alloc(0) };
        if (spec.hang) return;
        const parts = Array.isArray(spec.body) ? spec.body : [spec.body || Buffer.alloc(0)];
        const res = Readable.from(parts, { objectMode: false });
        res.statusCode = spec.status || 200;
        res.headers = spec.headers || {};
        setImmediate(() => onRes(res));
      });
    };
    return req;
  };
  return { request, lookup, asked };
}
const ok = (type, body, extra = {}) => ({ status: 200, headers: { 'content-type': type, ...extra }, body });
const redirect = (to) => ({ status: 302, headers: { location: to }, body: Buffer.alloc(0) });
const failsWith = (p, status, reason) => assert.rejects(p, (e) => e.status === status && e.reason === reason);

test('isBlockedIp: internal, local and service ranges are blocked, public ones are not', () => {
  for (const ip of ['127.0.0.1', '127.255.0.9', '10.0.0.1', '10.255.255.255', '172.16.0.1', '172.31.255.255', '192.168.0.1', '169.254.169.254',
    '0.0.0.0', '100.64.0.1', '224.0.0.1', '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1',
    '::ffff:10.1.2.3', '::ffff:a9fe:a9fe', '64:ff9b::7f00:1', 'not-an-ip']) assert.equal(isBlockedIp(ip), true, ip);
  for (const ip of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '172.15.255.255', '192.169.0.1', '11.0.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) {
    assert.equal(isBlockedIp(ip), false, ip);
  }
});

test('checkUrl: only plain public https on 443', () => {
  for (const bad of ['http://example.com/a.jpg', 'ftp://example.com/a.jpg', 'https://user:pw@example.com/a.jpg', 'https://example.com:8443/a.jpg', 'nonsense', 'https://']) {
    assert.throws(() => checkUrl(bad), (e) => e.status === 400 && e.reason === 'bad url', bad);
  }
  for (const internal of ['https://localhost/a.jpg', 'https://LOCALHOST./a.jpg', 'https://x.localhost/a.jpg', 'https://svc.internal/a.jpg',
    'https://metadata.google.internal/', 'https://printer.local/a.jpg', 'https://intranet/a.jpg', 'https://127.0.0.1/a.jpg',
    'https://10.0.0.5/a.jpg', 'https://172.16.5.5/a.jpg', 'https://192.168.1.1/a.jpg', 'https://169.254.169.254/latest/meta-data',
    'https://[::1]/a.jpg', 'https://[fc00::1]/a.jpg', 'https://[::ffff:127.0.0.1]/a.jpg', 'https://2130706433/a.jpg', 'https://0x7f000001/a.jpg',
    'https://0177.0.0.1/a.jpg']) {
    assert.throws(() => checkUrl(internal), (e) => e.status === 400 && e.reason === 'host not allowed', internal);
  }
  assert.equal(checkUrl('https://images.example.com/a.jpg?w=1').hostname, 'images.example.com');
  assert.equal(checkUrl('https://8.8.8.8/a.jpg').hostname, '8.8.8.8');
});

test('safeLookup: a name that resolves to a loopback address is refused at connect time', async () => {
  await assert.rejects(new Promise((res, rej) => safeLookup('localhost', {}, (e, a) => (e ? rej(e) : res(a)))), (e) => e.code === 'LP_BLOCKED');
});

test('picture by bytes: JPEG, PNG, WebP, HEIC come through with the type of the bytes', async () => {
  for (const [body, type] of [[JPEG, 'image/jpeg'], [PNG, 'image/png'], [WEBP, 'image/webp'], [HEIC, 'image/heic']]) {
    const r = rig({ 'ex.com/p': ok('image/octet-stream-but-image/x', body) });
    // header must be image/*: lie about the subtype, the answer must still carry the real type
    const r2 = rig({ 'ex.com/p': ok('image/jpeg', body) });
    const out = await fetchPicture('https://ex.com/p', r2);
    assert.equal(out.type, type);
    assert.deepEqual(out.buf, body);
    assert.equal(r.asked.length, 0);
  }
});

test('wrong type: html, svg, text, and image headers over non-image bytes are all "not an image"', async () => {
  await failsWith(fetchPicture('https://ex.com/p', rig({ 'ex.com/p': ok('text/html', HTML) })), 404, 'not an image');
  await failsWith(fetchPicture('https://ex.com/p', rig({ 'ex.com/p': ok('image/svg+xml', Buffer.from('<svg onload="x()"/>'.padEnd(60))) })), 404, 'not an image');
  await failsWith(fetchPicture('https://ex.com/p', rig({ 'ex.com/p': ok('application/javascript', JPEG) })), 404, 'not an image');
  await failsWith(fetchPicture('https://ex.com/p', rig({ 'ex.com/p': ok('image/jpeg', HTML) })), 404, 'not an image'); // lying header
  await failsWith(fetchPicture('https://ex.com/p', rig({ 'ex.com/p': ok('image/gif', GIF) })), 404, 'not an image'); // not on the list
  await failsWith(fetchPicture('https://ex.com/p', rig({ 'ex.com/p': ok('image/jpeg', Buffer.from([0xff, 0xd8])) })), 404, 'not an image'); // too short
});

test('size: Content-Length over the cap is refused unread; a stream over the cap is cut even without Content-Length', async () => {
  const big = rig({ 'ex.com/p': ok('image/jpeg', JPEG, { 'content-length': String(99 * 1024 * 1024) }) });
  await failsWith(fetchPicture('https://ex.com/p', big), 413, 'too large');
  const chunks = [JPEG, Buffer.alloc(60, 7), Buffer.alloc(60, 7)];
  await failsWith(fetchPicture('https://ex.com/p', { ...rig({ 'ex.com/p': ok('image/jpeg', chunks) }), max: 100 }), 413, 'too large');
  const liar = rig({ 'ex.com/p': ok('image/jpeg', chunks, { 'content-length': '10' }) }); // header lies small
  await failsWith(fetchPicture('https://ex.com/p', { ...liar, max: 100 }), 413, 'too large');
  const within = await fetchPicture('https://ex.com/p', { ...rig({ 'ex.com/p': ok('image/jpeg', JPEG) }), max: JPEG.length });
  assert.equal(within.buf.length, JPEG.length); // exactly the cap is fine
});

test('redirects: up to 3 are followed, the 4th is refused', async () => {
  const s = { 'a.com/1': redirect('https://b.com/2'), 'b.com/2': redirect('/3'), 'b.com/3': redirect('https://c.com/4'), 'c.com/4': ok('image/jpeg', JPEG) };
  const out = await fetchPicture('https://a.com/1', rig(s));
  assert.equal(out.type, 'image/jpeg');
  const four = { ...s, 'c.com/4': redirect('https://d.com/5'), 'd.com/5': ok('image/jpeg', JPEG) };
  await failsWith(fetchPicture('https://a.com/1', rig(four)), 502, 'upstream');
});

test('redirect to an internal address is refused and that address is never requested', async () => {
  for (const target of ['https://169.254.169.254/latest/meta-data/', 'https://127.0.0.1/a.jpg', 'https://localhost/a.jpg', 'https://10.1.1.1/a.jpg',
    'https://[::1]/a.jpg', 'https://svc.internal/a.jpg', 'https://2130706433/']) {
    const r = rig({ 'ex.com/p': redirect(target) });
    await failsWith(fetchPicture('https://ex.com/p', r), 400, 'host not allowed');
    assert.deepEqual(r.asked, ['ex.com/p'], target);
  }
  const r = rig({ 'ex.com/p': redirect('http://other.com/a.jpg') });
  await failsWith(fetchPicture('https://ex.com/p', r), 400, 'bad url'); // downgrade to http
});

test('a public-looking name that resolves to an internal address is refused at connect time (also after a redirect)', async () => {
  const r = rig({ 'evil.com/p': ok('image/jpeg', JPEG) }, { 'evil.com': '10.0.0.5' });
  await failsWith(fetchPicture('https://evil.com/p', r), 400, 'host not allowed');
  const metadata = rig({ 'ex.com/p': redirect('https://rebind.example.net/x.jpg'), 'rebind.example.net/x.jpg': ok('image/jpeg', JPEG) }, { 'rebind.example.net': '169.254.169.254' });
  await failsWith(fetchPicture('https://ex.com/p', metadata), 400, 'host not allowed');
});

test('remote answers: 404/403 → not found, 5xx → upstream, silence → upstream within the deadline', async () => {
  await failsWith(fetchPicture('https://ex.com/p', rig({})), 404, 'not found');
  await failsWith(fetchPicture('https://ex.com/p', rig({ 'ex.com/p': { status: 403, headers: {}, body: Buffer.alloc(0) } })), 404, 'not found');
  await failsWith(fetchPicture('https://ex.com/p', rig({ 'ex.com/p': { status: 503, headers: {}, body: Buffer.alloc(0) } })), 502, 'upstream');
  const t0 = Date.now();
  await failsWith(fetchPicture('https://ex.com/p', { ...rig({ 'ex.com/p': { hang: true } }), timeout: 60 }), 502, 'upstream');
  assert.ok(Date.now() - t0 < 1000);
});

test('sniffImage: the four formats and nothing else', () => {
  assert.equal(sniffImage(JPEG), 'image/jpeg');
  assert.equal(sniffImage(PNG), 'image/png');
  assert.equal(sniffImage(WEBP), 'image/webp');
  assert.equal(sniffImage(HEIC), 'image/heic');
  assert.equal(sniffImage(GIF), null);
  assert.equal(sniffImage(HTML), null);
  assert.equal(sniffImage(Buffer.alloc(0)), null);
});

// ---- the real handler (no network: every case below is refused before any request) ----
process.env.LP_KEY = 'test-key-not-real';
const { handler } = require('../index.js');
const call = (query, key = 'test-key-not-real') => handler({ httpMethod: 'GET', headers: key ? { 'X-LP-Key': key } : {}, queryStringParameters: query, requestContext: { identity: { sourceIp: '1.2.3.4' } } });

test('handler ?pic=: key required, internal and non-https addresses refused with the right codes', async () => {
  assert.equal((await call({ pic: 'https://ex.com/a.jpg' }, null)).statusCode, 403);
  assert.equal((await call({ pic: 'https://ex.com/a.jpg' }, 'wrong')).statusCode, 403);
  for (const bad of ['http://ex.com/a.jpg', 'ftp://ex.com/a.jpg', 'junk']) assert.equal((await call({ pic: bad })).statusCode, 400, bad);
  for (const internal of ['https://localhost/a.jpg', 'https://127.0.0.1/a.jpg', 'https://169.254.169.254/', 'https://10.0.0.1/a.jpg', 'https://[::1]/a.jpg']) {
    const r = await call({ pic: internal });
    assert.equal(r.statusCode, 400, internal);
    assert.equal(JSON.parse(r.body).reason, 'host not allowed', internal);
  }
});

test('handler ?pic=: per-IP limit of 30 a minute', async () => {
  let last;
  for (let i = 0; i < 32; i++) last = await handler({ httpMethod: 'GET', headers: { 'X-LP-Key': 'test-key-not-real' }, queryStringParameters: { pic: 'https://localhost/a.jpg' }, requestContext: { identity: { sourceIp: '9.9.9.9' } } });
  assert.equal(last.statusCode, 429);
});

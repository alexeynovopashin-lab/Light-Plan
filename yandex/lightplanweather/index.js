// Weather proxy for the Light Plan app (Yandex Cloud Functions, Node.js, no dependencies).
// The app cannot reach api.open-meteo.com from Russia without a VPN; this function can.
// It is a thin wrapper: takes a point, returns the same JSON Open-Meteo returns, keeps a cache.
// Spec: docs/weather_proxy_reference.md (§ 2, § 3).
//
//   GET <function url>?kind=forecast&lat=56.488&lon=84.947   → body of /v1/forecast
//   GET <function url>?kind=air&lat=56.488&lon=84.947        → body of /v1/air-quality
// (a direct function link takes no path after the id — "invalid functionID" — hence kind in the query)
//
// The Open-Meteo parameters are fixed below: a stranger cannot order anything else through us.
//
// Settings (function environment variables, never in the repository):
//   LP_KEY     — the app key, expected in the X-LP-Key header
//   DAILY_CAP  — optional, ceiling of Open-Meteo "calls" per UTC day for one instance (default 3000)
//
// Cache lives in the memory of the running instance (no bucket): a cold instance starts empty.
// The daily ceiling is therefore per instance too — see the report of step 2.
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const SOURCES = {
  forecast: {
    url: 'https://api.open-meteo.com/v1/forecast',
    params: {
      hourly: 'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,weather_code',
      forecast_days: '16', past_days: '5', timezone: 'auto', windspeed_unit: 'ms',
    },
    ttl: 60 * 60 * 1000, // models refresh about hourly
    weight: 1.65, // Open-Meteo counts 11 variables × 21 days as ≈ 1.65 calls (docs formula, not measured)
  },
  air: {
    url: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    params: { hourly: 'aerosol_optical_depth,dust', forecast_days: '5', timezone: 'auto' },
    ttl: 3 * 60 * 60 * 1000,
    weight: 1,
  },
};
const STALE_MAX = 24 * 60 * 60 * 1000; // an old answer is still better than a made-up one
const UPSTREAM_TIMEOUT = 8000;
const MAX_ENTRIES = 400; // ~30 KB each → ~12 MB of the 128 MB
const DAILY_CAP = Number(process.env.DAILY_CAP) || 3000;
const PER_IP_PER_MINUTE = 60;

const cache = new Map(); // "<kind>|<lat2>,<lon2>" → { body, gz, at }
let day = '';
let spent = 0; // Open-Meteo calls used today by this instance
const ipHits = new Map(); // ip → { minute, n }

const json = (statusCode, obj, extra = {}) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  body: JSON.stringify(obj),
});
const fail = (statusCode, reason, extra) => json(statusCode, { error: true, reason }, extra);

function keyOk(given) {
  const want = process.env.LP_KEY || '';
  if (!want || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

function parseCoord(v, lim) {
  if (typeof v !== 'string' || !/^-?\d{1,3}(\.\d{1,8})?$/.test(v)) return null;
  const n = Number(v);
  return Math.abs(n) <= lim ? Math.round(n * 100) / 100 : null;
}

async function fetchUpstream(kind, lat, lon) {
  const src = SOURCES[kind];
  const url = `${src.url}?${new URLSearchParams({ latitude: lat.toFixed(2), longitude: lon.toFixed(2), ...src.params })}`;
  let last = 'upstream';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT), headers: { 'User-Agent': 'LightPlanWeatherProxy' } });
      const body = await r.text();
      if (r.status === 200) return { ok: true, body };
      if (r.status >= 400 && r.status < 500 && r.status !== 429) return { ok: false, client: true, status: r.status, body };
      last = `status ${r.status}`;
    } catch (e) { last = String(e.name || e); }
  }
  return { ok: false, client: false, reason: last };
}

function respond(entry, acceptsGzip, state) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-LP-Cache': state,
  };
  if (state === 'stale') headers['X-LP-Stale'] = '1';
  if (acceptsGzip) {
    return { statusCode: 200, headers: { ...headers, 'Content-Encoding': 'gzip' }, isBase64Encoded: true, body: entry.gz.toString('base64') };
  }
  return { statusCode: 200, headers, body: entry.body };
}

exports.handler = async (event) => {
  const h = {};
  for (const [k, v] of Object.entries(event.headers || {})) h[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;

  if ((event.httpMethod || 'GET') !== 'GET' || !keyOk(h['x-lp-key'])) return fail(403, 'forbidden');

  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) { day = today; spent = 0; }

  // per-IP brake (instance memory, coarse): one phone should never need more than a few requests a minute
  const ip = (event.requestContext && event.requestContext.identity && event.requestContext.identity.sourceIp) || h['x-forwarded-for'] || '';
  const minute = Math.floor(now / 60000);
  const hit = ipHits.get(ip) || { minute, n: 0 };
  if (hit.minute !== minute) { hit.minute = minute; hit.n = 0; }
  hit.n += 1;
  ipHits.set(ip, hit);
  if (ipHits.size > 2000) for (const [k, v] of ipHits) if (v.minute !== minute) ipHits.delete(k);
  if (hit.n > PER_IP_PER_MINUTE) return fail(429, 'rate', { 'Retry-After': '60' });

  const q = event.queryStringParameters || {};
  const kind = q.kind;
  if (!Object.hasOwn(SOURCES, kind)) return fail(400, 'unknown kind: use kind=forecast or kind=air');
  const lat = parseCoord(q.lat, 90);
  const lon = parseCoord(q.lon, 180);
  if (lat === null) return fail(400, 'Latitude must be a number in range of -90 to 90°.');
  if (lon === null) return fail(400, 'Longitude must be a number in range of -180 to 180°.');

  const acceptsGzip = /\bgzip\b/.test(h['accept-encoding'] || '');
  const key = `${kind}|${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cache.get(key);
  if (cached && now - cached.at < SOURCES[kind].ttl) return respond(cached, acceptsGzip, 'hit');

  const stale = cached && now - cached.at < STALE_MAX ? cached : null;
  if (spent + SOURCES[kind].weight > DAILY_CAP) {
    if (stale) return respond(stale, acceptsGzip, 'stale');
    const secondsToMidnight = Math.ceil((Date.parse(today) + 86400000 - now) / 1000);
    return fail(429, 'daily ceiling', { 'Retry-After': String(secondsToMidnight) });
  }
  spent += SOURCES[kind].weight;

  const up = await fetchUpstream(kind, lat, lon);
  if (up.ok) {
    const entry = { body: up.body, gz: zlib.gzipSync(up.body), at: now };
    cache.delete(key);
    cache.set(key, entry);
    while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
    return respond(entry, acceptsGzip, 'miss');
  }
  if (up.client) return { statusCode: up.status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: up.body };
  if (stale) return respond(stale, acceptsGzip, 'stale');
  return fail(502, 'upstream');
};

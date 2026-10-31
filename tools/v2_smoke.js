// Проба 2.0 без сервера: бета и v2 открываются в Chromium (файлы с диска,
// сеть наружу закрыта), ошибки страниц и раздельность хранилищ.
//   NODE_PATH=$(npm root -g) node tools/v2_smoke.js <папка для снимков>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css' };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 393, height: 852 } });
  await ctx.route('http://lp.test/**', r => {
    let u = new URL(r.request().url()).pathname; if (u.endsWith('/')) u += 'index.html';
    const f = path.join(ROOT, decodeURIComponent(u));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' });
  });
  await ctx.route(/^(?!http:\/\/lp\.test).*/, r => r.abort());   // никакой сети наружу
  const out = {};
  for (const ch of ['beta', 'v2']) {
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
    await p.goto(`http://lp.test/${ch}/`, { waitUntil: 'load' });
    await p.waitForTimeout(3000);
    out[ch] = { errs, title: await p.title() };
    await p.screenshot({ path: process.argv[2] + `/shot-${ch}.png` });
    await p.close();
  }
  const p = await ctx.newPage(); await p.goto('http://lp.test/v2/'); await p.waitForTimeout(1500);
  out.keys = await p.evaluate(() => Object.keys(localStorage).sort());
  out.idb = await p.evaluate(async () => (await indexedDB.databases()).map(d => d.name));
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();

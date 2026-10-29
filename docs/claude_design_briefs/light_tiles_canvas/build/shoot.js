/* Screenshot local test pages. Usage: node shoot.js <dir> <w> <h> name[:lpH] ... */
const path = require('path');
const { chromium } = require(path.join(process.env.LP_WEB, 'node_modules', 'playwright'));
const [dir, w, h, ...names] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const spec of names) {
    const [name, lpH] = spec.split(':');
    const p = await (await b.newContext({ viewport: { width: +w, height: +(lpH || h) }, deviceScaleFactor: 2 })).newPage();
    await p.goto('file://' + path.join(dir, name + '.test.html'));
    if (lpH) await p.evaluate(v => document.querySelector('.lp-html').style.setProperty('--lp-h', v + 'px'), lpH);
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(dir, name + (lpH ? '_' + lpH : '') + '.png') });
  }
  await b.close();
})();

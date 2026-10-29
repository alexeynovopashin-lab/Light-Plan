/* WCAG contrast of key texts on the rendered glass boards: the text is hidden, the backdrop under its box is averaged.
   Usage: node check_contrast.js <dir> Board:selector ... (selector is matched inside .gl; first match) */
const path = require('path');
const { chromium } = require(path.join(process.env.LP_WEB, 'node_modules', 'playwright'));
const [dir, ...specs] = process.argv.slice(2);
const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
(async () => {
  const b = await chromium.launch();
  for (const s of specs) {
    const [name, sel] = [s.slice(0, s.indexOf(':')), s.slice(s.indexOf(':') + 1)];
    const page = await (await b.newContext({ viewport: { width: 860, height: 1600 }, deviceScaleFactor: 1 })).newPage();
    await page.goto('file://' + path.join(dir, name + '.test.html'));
    await page.waitForTimeout(500);
    const info = await page.evaluate(q => {
      const e = document.querySelector('.gl ' + q); if (!e) return null;
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      const col = cs.color, size = cs.fontSize, weight = cs.fontWeight;
      document.querySelectorAll('.gl *').forEach(x => { x.dataset.c = x.style.color; });
      e.style.setProperty('color', 'transparent', 'important'); e.style.setProperty('text-shadow', 'none', 'important');
      e.querySelectorAll('*').forEach(x => { x.style.setProperty('color', 'transparent', 'important'); x.style.setProperty('text-shadow', 'none', 'important'); });
      return { x: r.x, y: r.y, w: r.width, h: r.height, color: col, size: size, weight: weight };
    }, sel);
    if (!info) { console.log(name, sel, 'NOT FOUND'); continue; }
    const buf = await page.screenshot({ clip: { x: info.x, y: info.y, width: Math.max(1, info.w), height: Math.max(1, info.h) } });
    const png = require('fs'); const tmp = path.join(dir, '_c.png'); png.writeFileSync(tmp, buf);
    const px = require('child_process').execFileSync('python3', ['-c', `from PIL import Image;im=Image.open('${tmp}').convert('RGB');p=list(im.getdata());n=len(p);print(sum(c[0] for c in p)/n,sum(c[1] for c in p)/n,sum(c[2] for c in p)/n)`]).toString().trim().split(' ').map(Number);
    const m = info.color.match(/[\d.]+/g).map(Number);
    const a = m[3] === undefined ? 1 : m[3];
    const fg = [0, 1, 2].map(i => m[i] * a + px[i] * (1 - a));
    const L1 = lum(fg), L2 = lum(px), r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    console.log(name.padEnd(20), sel.padEnd(26), info.size + '/' + info.weight, 'ratio', r.toFixed(2));
  }
  await b.close();
})();

/* Snapshot of the beta's «Свет» screen: visible DOM (scripts out, hidden screens out,
   canvases → images) + only the CSS rules that match it. Live network for weather/geo,
   clock pinned. Usage: node extract_light.js <outDir> <at> <tz> <theme> <pro> <spoiler 0|1> <name> */
const path = require('path');
const fs = require('fs');
const LP = process.env.LP_WEB;
const { chromium } = require(path.join(LP, 'node_modules', 'playwright'));
const [outDir, at, tz, theme, pro, spoiler, name] = process.argv.slice(2);

function instant(at, tz) {
  const m = at.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/);
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const off = ms => {
    const p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric',
      day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
  };
  return new Date(wall - off(wall));
}

(async () => {
  const root = LP;
  const seed = { sessions: [], me: {}, loc: { lat: 56.476, lon: 84.977 }, theme, pro: pro === '1', sync: 'off' };
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    locale: 'ru-RU', timezoneId: tz, colorScheme: theme === 'light' ? 'light' : 'dark' });
  const page = await context.newPage();
  await context.route(/^http:\/\/lp\.test\//, route => {
    const file = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname));
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    let body = fs.readFileSync(file);
    if (file.endsWith('.html')) body = body.toString('utf8').replace(/env\(\s*safe-area-inset-(top|bottom|left|right)\s*(?:,[^)]*)?\)/g,
      (m, side) => (side === 'top' ? 59 : side === 'bottom' ? 34 : 0) + 'px');
    const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
    route.fulfill({ status: 200, body, contentType: T[path.extname(file)] || 'application/octet-stream' });
  });
  await page.clock.install({ time: instant(at, tz) });
  await page.addInitScript(s => { try { localStorage.setItem('lightplan.beta.v1', s); } catch (e) {} }, JSON.stringify(seed));
  await page.goto('http://lp.test/beta/index.html');
  await page.waitForTimeout(4000);
  await page.evaluate(() => { document.querySelector('.tab[data-go="s-today"]').click(); });
  await page.waitForTimeout(1500);
  if (process.argv[9] === 'moon') { await page.click('#skySwap'); await page.waitForTimeout(900); }
  if (spoiler === '1') { await page.click('#spoilerBtn'); await page.waitForTimeout(1200); }
  await page.screenshot({ path: path.join(outDir, name + '_live.png') });

  const snap = await page.evaluate(() => {
    // canvases → images (before cloning)
    document.querySelectorAll('canvas').forEach((c, i) => {
      if (!c.offsetWidth) return;
      try { c.setAttribute('data-snap', c.toDataURL('image/png')); } catch (e) {}
    });
    const body = document.body.cloneNode(true);
    // drop hidden things in the live tree, mirrored by index paths
    const live = [...document.body.querySelectorAll('*')];
    const copy = [...body.querySelectorAll('*')];
    const drop = [];
    live.forEach((e, i) => {
      const cs = getComputedStyle(e);
      if (e.tagName === 'SCRIPT' || e.tagName === 'TEMPLATE' || e.tagName === 'NOSCRIPT') drop.push(copy[i]);
      else if (cs.display === 'none' && !(e.closest('svg') && e.tagName !== 'svg')) drop.push(copy[i]);
      else if (e.classList && e.classList.contains('screen') && !e.classList.contains('active')) drop.push(copy[i]);
    });
    drop.forEach(e => e.remove());
    body.querySelectorAll('canvas[data-snap]').forEach(c => {
      const img = document.createElement('img');
      img.src = c.getAttribute('data-snap');
      img.className = c.className; img.id = c.id;
      img.setAttribute('style', (c.getAttribute('style') || '') + ';width:' + c.style.width + ';height:' + c.style.height);
      c.replaceWith(img);
    });
    // scroll positions → inline
    const scrolled = [...document.querySelectorAll('*')].filter(e => e.scrollTop || e.scrollLeft)
      .map(e => ({ id: e.id, cls: e.className, top: e.scrollTop, left: e.scrollLeft }));
    // CSS: rules matching anything left
    const all = [document.documentElement, document.body, ...document.body.querySelectorAll('*')]
      .filter(e => body.contains(copy[live.indexOf(e)]) || e === document.documentElement || e === document.body);
    const clean = sel => sel.replace(/::?(before|after|placeholder|selection|-webkit-[a-z-]+|backdrop|marker|first-letter|first-line)\b/g, '')
      .replace(/:(hover|active|focus|focus-visible|focus-within|visited)\b/g, '').trim() || '*';
    const used = sel => sel.split(',').some(s => { try { return all.some(e => e.matches(clean(s))); } catch (e) { return false; } });
    const keep = [];
    const walk = (rules, wrap) => {
      for (const r of rules) {
        if (r.type === 1) { if (r.selectorText.includes(':root') || used(r.selectorText)) keep.push(wrap(r.cssText)); }
        else if (r.type === 4) { const inner = []; walk(r.cssRules, t => inner.push(t) && ''); if (inner.length) keep.push(wrap('@media ' + r.conditionText + '{' + inner.join('\n') + '}')); }
        else if (r.type === 12) { const inner = []; walk(r.cssRules, t => inner.push(t) && ''); if (inner.length) keep.push(wrap('@supports ' + r.conditionText + '{' + inner.join('\n') + '}')); }
        else if (r.type === 7 || r.type === 5) keep.push(wrap(r.cssText));
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules, t => t); } catch (e) {} }
    return { html: body.innerHTML, css: keep.join('\n'), htmlAttrs: [...document.documentElement.attributes].map(a => [a.name, a.value]),
      bodyAttrs: [...document.body.attributes].map(a => [a.name, a.value]), scrolled };
  });
  fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(snap));
  console.log(name, 'html', snap.html.length, 'css', snap.css.length, 'scrolled', JSON.stringify(snap.scrolled).slice(0, 300));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

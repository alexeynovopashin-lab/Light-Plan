/* Рендер беты в headless Chromium: снимок плюс отчёт о том, что нарисовано.
   Ставится один раз через `npm install` в корне проекта.

   Зачем: визуальную правку нельзя закрывать верой на слово, а симулятор
   отвечает медленно и требует пуша. Здесь секунда до картинки и числа рядом с
   ней — сколько делений, сколько осей, что стоит первым элементом, есть ли
   ошибки на странице. Тайлы карты в файловом протоколе не грузятся, поэтому
   всё, что про подложку, проверяется только на устройстве.

   Примеры:
     node tools/shot.js --out /tmp/a.png
     node tools/shot.js --layers sun,moon,mw --theme light --out /tmp/b.png
     node tools/shot.js --clip page --time 1300 --out /tmp/c.png
*/
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const args = {};
  process.argv.slice(2).forEach((a, i, all) => {
    if (a.startsWith('--')) args[a.slice(2)] = all[i + 1];
  });
  const out = args.out || 'shot.png';
  const layers = (args.layers === '' ? [] : (args.layers || 'sun,moon').split(',')).filter(Boolean);
  const theme = args.theme || 'dark';
  const target = args.file || path.join(__dirname, '..', 'beta', 'index.html');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file://' + path.resolve(target));
  await page.waitForTimeout(700);

  await page.evaluate(t => {
    const b = document.querySelector('#themeSeg button[data-theme="' + t + '"]');
    if (b) b.click();
  }, theme);
  await page.click('.tab[data-go="s-map"]');
  await page.waitForTimeout(300);

  /* Слои ставятся кликами по настоящему меню, а не подменой переменной: так
     проверяется и то, что переключатель вообще работает */
  await page.evaluate(want => {
    document.getElementById('mapLayersBtn').click();
    document.querySelectorAll('#mapLayersMenu button').forEach(b => {
      if (want.includes(b.dataset.layer) !== b.classList.contains('on')) b.click();
    });
    document.getElementById('mapLayersScrim').click();
  }, layers);

  if (args.time) {
    await page.evaluate(t => {
      const s = document.getElementById('scrub');
      s.value = t; s.dispatchEvent(new Event('input', { bubbles: true }));
    }, +args.time);
  }
  await page.waitForTimeout(500);

  const report = await page.evaluate(() => {
    const svg = document.getElementById('mapLight');
    const kids = [...svg.children];
    const n = sel => svg.querySelectorAll(sel).length;
    const rail = document.querySelector('.scrub');
    const row = id => {
      const el = document.getElementById(id);
      const tr = el && el.closest('.t-row');
      return el && tr && !tr.hidden ? el.textContent : null;
    };
    return {
      элементов: kids.length,
      первый: kids[0] ? kids[0].tagName + ' ' + (kids[0].getAttribute('fill') || '') : null,
      линий: n('line'), окружностей: n('circle'), путей: n('path'), подписей: n('text'),
      рельс: rail ? getComputedStyle(rail).background.slice(0, 160) : null,
      ядро: row('mwCore'), ночь: row('mwNight'), вердикт: row('mwVerdict'),
      время: document.getElementById('mrTime') ? document.getElementById('mrTime').textContent : null
    };
  });

  const shot = args.clip === 'page' ? page : page.locator('.map-frame');
  await shot.screenshot({ path: out });
  await browser.close();
  console.log(JSON.stringify({ снимок: out, ошибки: errors, ...report }, null, 1));
})();

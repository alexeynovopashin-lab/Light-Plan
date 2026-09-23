/* Рендер беты в headless-браузере: снимок плюс отчёт о том, что нарисовано.
   Ставится один раз через `npm install` в корне проекта.

   Зачем: визуальную правку нельзя закрывать верой на слово, а симулятор
   отвечает медленно и требует пуша. Здесь секунда до картинки и числа рядом с
   ней — сколько делений, сколько осей, что стоит первым элементом, есть ли
   ошибки на странице. Тайлы карты в файловом протоколе не грузятся, поэтому
   всё, что про подложку, проверяется только на устройстве.

   Экраны (`--screen`):
     map       — карта, как было до итерации 19б (по умолчанию); с `--at` —
                 половина пары веб / натив (итерация 20а): прибор, шапка,
                 строка показания, таймбар; `--svg f.svg` кладёт разметку
                 прибора в файл;
     today     — «Свет»: шапка, купол, телеметрия, таймбар;
     settings  — «Настройки»: первая страница, главы; `--chapter view`
                 открывает главу кликом по её строке.
   Для today и settings снимок — половина пары веб / натив (миграция, § 5.4
   плана): момент, место, погода и настройки прибиты, чтобы приложение
   открылось в той же минуте с тем же небом. Отчёт — рамки ключевых узлов в
   точках экрана, текст, цвет и кегль; имена узлов те же, что пишет
   Debug-сборка приложения (native/Tools/shots/).

   Примеры:
     node tools/shot.js --out /tmp/a.png
     node tools/shot.js --layers sun,moon,mw --theme light --out /tmp/b.png
     node tools/shot.js --clip page --time 1300 --out /tmp/c.png
     node tools/shot.js --screen today --at 2026-09-23T13:00 --tz Asia/Barnaul \
       --seed seed.json --forecast f.json --air a.json --name place.json --theme light \
       --safe 62,34 --out /tmp/today.png --report /tmp/today.json
*/
const path = require('path');
const fs = require('fs');

const args = {};
process.argv.slice(2).forEach((a, i, all) => {
  if (a.startsWith('--')) args[a.slice(2)] = all[i + 1];
});
const screen = args.screen || 'map';

if (screen === 'map' && !args.at) mapShot().catch(fail);
else if (screen === 'today' || screen === 'settings' || screen === 'map') screenShot().catch(fail);
else fail(new Error('неизвестный экран: ' + screen + ' (map | today | settings)'));

function fail(e) { console.error(String(e && e.stack || e)); process.exit(1); }

async function mapShot() {
  const { chromium } = require('playwright');
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
}

/* Настенное время места → момент. `--at 2026-09-23T13:00` читается в поясе
   `--tz`, а не в поясе машины, на которой идёт прогон; строка со смещением
   (`…+07:00`, `…Z`) берётся как есть. */
function instant(at, tz) {
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(at)) return new Date(at);
  const m = at.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?$/);
  if (!m) throw new Error('--at: ждал ГГГГ-ММ-ДДTЧЧ:ММ, получил ' + at);
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  const offsetAt = ms => {
    const p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric',
      day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(new Date(ms)).forEach(x => { p[x.type] = +x.value; });
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms;
  };
  // Два прохода: смещение на границе перевода часов уточняется по ответу.
  let ms = wall - offsetAt(wall);
  ms = wall - offsetAt(ms);
  return new Date(ms);
}

/* Узлы отчёта. Имя — общий язык с приложением: Debug-сборка пишет рамки под
   теми же именами, сверка идёт по ним. Узел, которого нет или который скрыт,
   попадает в отчёт с `visible: false` — отсутствие тоже расхождение. */
/* Панель вкладок — на обоих экранах: знак и подпись каждой вкладки
   (после 19б натив перенёс панель веба вместо системной). */
const TABS = {};
[['light', 's-today'], ['map', 's-map'], ['shoots', 's-plan'], ['settings', 's-set']].forEach(([n, go]) => {
  TABS['tab.' + n] = `.tabbar .tab[data-go="${go}"] svg`;
  TABS['tab.' + n + '.label'] = `.tabbar .tab[data-go="${go}"] span`;
});
const NODES = {
  today: {
    'header.name': '#hLocName', 'header.sub': '#hLocSub', 'header.date': '#hDate', 'header.note': '#hNote',
    'wx.icon': '#hwIcon svg', 'wx.temp': '#hwTemp', 'wx.cond': '#hwCond', 'wx.lo': '#hwLo', 'wx.hi': '#hwHi',
    'dome': '#s-today .dome > svg', 'dome.arc': '#arcPath', 'dome.horizon': '#s-today .horizon-line',
    'dome.sun': '#sunCore', 'dome.sunGlow': '#sunGlow', 'dome.ring': '#nowRing', 'dome.moon': '#moonDisc',
    'dome.swap': '#skySwap',
    'readout.time': '#drTime', 'readout.phase': '#drPhase', 'readout.sense': '#drSense',
    'next.label': '#nlLabel', 'next.value': '#nlValue', 'next.spark': '#nlSpark', 'next.word': '#nlWord',
    'tele.rec': '#tRec', 'tele.sunset': '#tSunset', 'tele.golden': '#tGolden', 'tele.light': '#tLight',
    'tele.shadow': '#tShadow', 'tele.sky': '#tSky', 'tele.wind': '#tWind', 'tele.air': '#tAir',
    'spoiler': '#spoilerBtn', 'action': '#planToday', 'action.sub': '#actionSub',
    'timebar': '#timebar', 'edge.rise': '#edgeRise', 'edge.set': '#edgeSet', 'now': '#nowTick',
    'ribbon': '#ribbonScroll', 'ribbon.frame': '#ribbonFrame', 'ribbon.day0': '#ribbonTrack .ribbon-day:nth-child(2)', 'track': '#timebar .track-wrap', 'scrub': '#scrub', 'ruler': '#ruler',
    'tabbar': '.tabbar', ...TABS
  },
  /* Карта (итерация 20а). Узлы прибора — элементы SVG `#mapLight` без id:
     берутся по признакам, которые ставит `renderMap` (радиус, цвет, кегль).
     Числа, которых рамкой не сказать, идут текстом узла: прозрачность вуали
     (`map.veil`, рамка — кадр карты), точки облака по пяти ярусам
     (`map.optic`) и число часовых засечек (`map.rim`). */
  map: {
    'header.name': '#mLocName', 'header.sub': '#mLocSub', 'header.date': '#mDate',
    'readout.time': '#mrTime', 'readout.phase': '#mrPhase',
    'map.optic': '#mapLight', 'map.pin': '.map-pin i', 'map.credit': '.map-credit', 'map.veil': '.map-frame',
    'map.horizon': '#mapLight circle[r="118"]', 'map.rim': '#mapLight circle[r="154"]',
    'map.sun': '#mapLight circle[r="5.5"][stroke-width="2"]',
    'map.sunGhost': '#mapLight circle[r="5.5"][stroke="#7C9CC4"]',
    'map.moon': '#mapLight circle[r="4.5"]',
    'map.core': '#mapLight circle[r="5.5"][fill="none"]:not([stroke="#7C9CC4"])',
    'map.north': '#mapLight text[fill="#E2A44C"]',
    'map.rise': '#mapLight text[text-anchor="start"][font-size="11"]',
    'map.set': '#mapLight text[text-anchor="end"][font-size="11"]',
    'timebar': '#timebar', 'edge.rise': '#edgeRise', 'edge.set': '#edgeSet', 'now': '#nowTick',
    'ribbon': '#ribbonScroll', 'ribbon.frame': '#ribbonFrame', 'ribbon.day0': '#ribbonTrack .ribbon-day:nth-child(2)',
    'track': '#timebar .track-wrap', 'scrub': '#scrub', 'ruler': '#ruler',
    'tabbar': '.tabbar', ...TABS
  },
  settings: {
    'header.name': '#s-set .header .name', 'header.date': '#s-set .header .date',
    'mode': '#modeSeg', 'mode.simple': '#modeSeg button[data-mode="simple"]',
    'mode.pro': '#modeSeg button[data-mode="pro"]', 'mode.note': '#s-set .set-mode .seg-note',
    'nav': '#s-set .set-nav',
    'tabbar': '.tabbar', ...TABS
  }
};

async function screenShot() {
  const engine = args.engine || 'chromium';
  const browserType = require('playwright')[engine];
  if (!browserType) throw new Error('--engine: chromium | webkit');
  const out = args.out || screen + '.png';
  const tz = args.tz || 'Asia/Barnaul';
  const target = args.file || path.join(__dirname, '..', 'beta', 'index.html');
  const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));

  const seed = args.seed ? read(args.seed) : null;
  if (seed && args.theme) seed.theme = args.theme;
  if (seed && args.pro != null) seed.pro = args.pro === '1' || args.pro === 'true';
  const forecast = args.forecast ? fs.readFileSync(args.forecast, 'utf8') : null;
  const air = args.air ? fs.readFileSync(args.air, 'utf8') : null;
  /* Имя места — `{ city, sub }`, отдаётся ответом Nominatim: геокодер тоже
     сеть, без заглушки шапка садится на координаты */
  const name = args.name ? read(args.name) : null;

  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport: { width: 440, height: 956 }, deviceScaleFactor: +(args.scale || 3),
    locale: args.locale || 'ru-RU', timezoneId: tz,
    colorScheme: (seed && seed.theme === 'light') || args.theme === 'light' ? 'light' : 'dark'
  });
  const page = await context.newPage();
  const errors = [], blocked = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  /* Сеть закрыта целиком: погода — из файлов, всё остальное (пояс, геокодер,
     тайлы) отказывает, и отказ записан в отчёт. Живая сеть сделала бы снимок
     неповторяемым — небо меняется каждый час. */
  /* Бета отдаётся с диска под http://lp.test/ — файловый протокол не даёт
     подменить отступы выреза. PWA на iPhone стоит с `viewport-fit=cover` и
     прозрачной строкой состояния: страница идёт под вырез и полосу «домой»,
     шапку и вкладки отодвигает `env(safe-area-inset-*)`. Headless-браузер
     отдаёт ноль, поэтому `--safe 62,34` (верх, низ — числа Debug-сборки на
     том же телефоне) вписывается в CSS вместо `env()` */
  const root = path.resolve(path.dirname(target), '..');
  const safe = (args.safe || '0,0').split(',').map(Number);
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
  await context.route(/^https?:/, route => {
    const url = route.request().url();
    if (url.startsWith('http://lp.test/')) {
      const file = path.join(root, decodeURIComponent(new URL(url).pathname));
      if (!file.startsWith(root) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      let body = fs.readFileSync(file);
      if (file.endsWith('.html')) {
        body = body.toString('utf8').replace(/env\(\s*safe-area-inset-(top|bottom|left|right)\s*(?:,[^)]*)?\)/g,
          (m, side) => (side === 'top' ? safe[0] : side === 'bottom' ? safe[1] : 0) + 'px');
      }
      return route.fulfill({ status: 200, body, contentType: TYPES[path.extname(file)] || 'application/octet-stream' });
    }
    if (forecast && url.startsWith('https://api.open-meteo.com/v1/forecast'))
      return route.fulfill({ status: 200, contentType: 'application/json', body: forecast });
    if (air && url.startsWith('https://air-quality-api.open-meteo.com/'))
      return route.fulfill({ status: 200, contentType: 'application/json', body: air });
    if (name && url.startsWith('https://nominatim.openstreetmap.org/reverse'))
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ address: { city: name.city, state: name.sub } }) });
    blocked.push(url.slice(0, 100));
    return route.abort();
  });

  if (args.at) await page.clock.install({ time: instant(args.at, tz) });
  /* Засев до первого скрипта страницы: признак «уже видел» — сам факт
     сохранённых данных, без него поверх экрана встаёт знакомство */
  if (seed) {
    await page.addInitScript(s => {
      try { localStorage.setItem('lightplan.beta.v1', s); } catch (e) {}
    }, JSON.stringify(seed));
  }

  await page.goto('http://lp.test/' + path.relative(root, path.resolve(target)).split(path.sep).join('/'));
  await page.waitForTimeout(900);
  await page.evaluate(go => {
    const t = document.querySelector('.tab[data-go="' + go + '"]');
    if (t) t.click();
    const s = document.getElementById(go);
    if (s) s.scrollTop = 0;
    window.scrollTo(0, 0);
  }, screen === 'today' ? 's-today' : screen === 'map' ? 's-map' : 's-set');
  // Экран въезжает анимацией `rise` 0.45 с — снимать после неё.
  await page.waitForTimeout(800);
  /* Глава настроек (`--chapter view|shoots|locale|…`) — кликом по строке
     корня, как палец: так проверяется и то, что строка открывает свою главу */
  const chapter = screen === 'settings' && args.chapter ? args.chapter : null;
  if (chapter) {
    await page.evaluate(ch => {
      const row = document.getElementById('setNav' + ch[0].toUpperCase() + ch.slice(1));
      if (row) row.click();
    }, chapter);
    await page.waitForTimeout(700);
  }

  const report = await page.evaluate(nodes => {
    const r1 = v => Math.round(v * 2) / 2;
    const bg = el => {
      for (let e = el; e; e = e.parentElement) {
        const c = getComputedStyle(e).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
      }
      return null;
    };
    const out = {};
    /* Главы настроек перечисляются по разметке: их порядок и число — часть
       сверки, список в коде инструмента отстал бы от беты */
    const nav = nodes._nav, chapter = nodes._chapter;
    delete nodes._nav; delete nodes._chapter;
    const mapFlags = { _map: nodes._map, _mw: nodes._mw };
    delete nodes._map; delete nodes._mw;
    /* Узлы главы — по порядку в разметке: назад, заголовок, подписи
       разделов, сегменты, пояснения, фишки, строки. Имя — вид и номер
       (`sec.0`, `seg.1`, `note.2`, `chips.0`, `item.3`); приложение
       нумерует свои так же, сверка по порядку, а не по смыслу. */
    if (chapter) {
      const ov = document.getElementById('setOv' + chapter[0].toUpperCase() + chapter.slice(1));
      if (ov) {
        const tag = (el, n) => { if (!el.id) el.id = '__shot_' + n; return '#' + el.id; };
        let k = 0;
        const put = (name, el) => { nodes[name] = tag(el, k++); };
        const b = ov.querySelector('.back'); if (b) put('back', b);
        const g = ov.querySelector('.grp-label'); if (g) put('title', g);
        const count = {};
        ov.querySelectorAll('.sec-label, .seg, .seg-note, .chips, .item, .set-in, .drum-preview').forEach(el => {
          if (el.closest('[hidden]') || getComputedStyle(el).display === 'none') return;
          const kind = el.classList.contains('sec-label') ? 'sec' : el.classList.contains('seg') ? 'seg'
            : el.classList.contains('seg-note') ? 'note' : el.classList.contains('chips') ? 'chips'
            : el.classList.contains('item') ? 'item' : el.classList.contains('set-in') ? 'input' : 'preview';
          count[kind] = (count[kind] || 0);
          put(kind + '.' + count[kind]++, el);
        });
      }
      for (const k of Object.keys(nodes)) if (/^(header|mode|nav)/.test(k)) delete nodes[k];
    }
    if (nav) document.querySelectorAll('#s-set .set-nav .item').forEach(el => {
      if (el.id) nodes['nav.' + el.id.replace(/^setNav/, '').toLowerCase()] = '#' + el.id;
    });
    for (const [name, sel] of Object.entries(nodes)) {
      const el = document.querySelector(sel);
      if (!el) { out[name] = { visible: false, missing: true }; continue; }
      /* У текста мерится строка, а не блок: блок подписи тянется на всю
         ширину колонки (`#nlLabel` — 392 при слове в 130), и сравнивать с ним
         рамку текста приложения бессмысленно. Контейнеры — по блоку. */
      const textual = /^(header|readout|tele)\.|^map\.(north|rise|set)$|^next\.(label|value|word)$|^wx\.(temp|cond|lo|hi)$|^action\.sub$|^edge\.|^now$|^mode\.note$|^(sec|note|title)\.|^tab\.\w+\.label$/.test(name) || name === 'title';
      let b = el.getBoundingClientRect();
      if (textual && el.textContent.trim()) {
        const rg = document.createRange(); rg.selectNodeContents(el);
        const rb = rg.getBoundingClientRect();
        if (rb.width > 0) b = rb;
      }
      const cs = getComputedStyle(el);
      let hidden = b.width === 0 || b.height === 0 || cs.visibility === 'hidden' || cs.display === 'none';
      for (let e = el; e && !hidden; e = e.parentElement) {
        if (e.hidden || getComputedStyle(e).display === 'none' || +getComputedStyle(e).opacity === 0) hidden = true;
      }
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      out[name] = {
        visible: !hidden,
        x: r1(b.left), y: r1(b.top), w: r1(b.width), h: r1(b.height),
        text: text ? text.slice(0, 80) : undefined,
        color: cs.color, font: cs.fontSize + ' ' + cs.fontWeight,
        bg: bg(el)
      };
    }
    if (mapFlags._map) {
      const svg = document.getElementById('mapLight');
      const veil = document.getElementById('mapNight');
      if (out['map.veil'] && veil) out['map.veil'].text = (+getComputedStyle(veil).opacity).toFixed(3);
      // Текст самого SVG — все его подписи подряд; сверяется только облако.
      if (out['map.optic']) out['map.optic'].text = undefined;
      if (svg && out['map.optic'] && mapFlags._mw) {
        const count = w => {
          const p = [...svg.querySelectorAll('path[stroke="#C6AAE8"]')].find(e => e.getAttribute('stroke-width') === w);
          return p ? (p.getAttribute('d').match(/M/g) || []).length : 0;
        };
        out['map.optic'].text = ['1.5', '1.1', '0.85', '0.62', '0.45'].map(count).join(' ');
      }
      if (svg && out['map.rim']) out['map.rim'].text =
        String(svg.querySelectorAll('circle[r="1.9"], circle[r="1.5"][fill-opacity="0.55"]').length);
    }
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      body: getComputedStyle(document.body).backgroundColor,
      nodes: out
    };
  }, screen === 'settings' ? { ...NODES.settings, _nav: !chapter, _chapter: chapter }
    : screen === 'map' ? { ...NODES.map, _map: true, _mw: !!(seed && seed.mapLayers && seed.mapLayers.mw) }
    : NODES.today);

  await page.screenshot({ path: out });
  // Разметка прибора карты целиком — эталон снимка сцены в нативе
  // (native/Tools/map_ref.js): числа и порядок узлов, а не рамки.
  if (args.svg && screen === 'map') {
    const svg = await page.evaluate(() => { const s = document.getElementById('mapLight'); return s && s.outerHTML; });
    if (svg) fs.writeFileSync(args.svg, svg);
  }
  const meta = {
    снимок: out, экран: screen, движок: engine, момент: args.at || null, пояс: tz,
    ошибки: errors, отказано: [...new Set(blocked)], ...report
  };
  if (args.report) fs.writeFileSync(args.report, JSON.stringify(meta, null, 1));
  await browser.close();
  console.log(JSON.stringify({ снимок: out, ошибки: errors, отказано: meta.отказано.length,
    узлов: Object.keys(report.nodes).length, тема: report.theme }, null, 1));
}

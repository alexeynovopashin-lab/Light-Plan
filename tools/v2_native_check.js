// Проба «файл с телефона в 2.0» (Веб 2.0, шаг 1): снимок с ключами натива
// кладётся в хранилище 2.0, страница правит блок и съёмку своими листами,
// и всё, чего 2.0 не знает, должно пережить запись. Заодно — мелочи шага 1:
// шаг гостей, «Неделя начинается», «Фотосъёмка», «сдвинуто» у блока.
// Без сервера и без сети, как tools/v2_smoke.js.
//   NODE_PATH=$(npm root -g) node tools/v2_native_check.js
// Выход 0 — всё «да»; 1 — есть «нет» (строки с ✗).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css' };
const pad = n => String(n).padStart(2, '0');
const t = new Date(); const TODAY = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
const SEED = {
  sessions: [
    { id: 's1', kind: 'shoot', date: TODAY, min: 1300, dur: 60, type: 'portrait', contact: 'Ольга',
      clientId: 'c1', via: { r: 'girlfriend', n: 'Алёна', tel: '+79990001122' }, calTitle: 'Портрет' },
    { id: 's2', kind: 'shoot', date: TODAY, min: 1370, dur: 30 }                    // без жанра
  ],
  blocks: [{ id: 'b1', k: 'busy', note: '', from: TODAY, allDay: false, days: 1, min: 840, dur: 120,
             mvd: { from: TODAY, allDay: false, days: 1, min: 600, dur: 120 } }],
  clients: [{ id: 'c1', kind: 'person', people: [{ name: 'Ольга', tel: ['+79161234567'] }], mt: 1 }],
  clientsAssembled: true, weekStart: 'sun', myDocs: [{ id: 'd1', n: 'Договор' }],
  notif: { all: true, wx: true, clash: true, srv: true, studio: true, remind: 30 }
};
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 393, height: 852 } });
  await ctx.route('http://lp.test/**', r => {
    let u = new URL(r.request().url()).pathname; if (u.endsWith('/')) u += 'index.html';
    const f = path.join(ROOT, decodeURIComponent(u));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' });
  });
  await ctx.route(/^(?!http:\/\/lp\.test).*/, r => r.abort());
  await ctx.addInitScript(seed => {
    if (!localStorage.getItem('lightplan.v2')) localStorage.setItem('lightplan.v2', seed);
  }, JSON.stringify(SEED));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  await p.goto('http://lp.test/v2/', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const rows = []; const ok = (name, v, info) => rows.push([v ? '✓' : '✗', name, info === undefined ? '' : JSON.stringify(info)]);
  const store = () => p.evaluate(() => JSON.parse(localStorage.getItem('lightplan.v2')));
  const click = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel);

  // Неделя с воскресенья: первая клетка шапки — воскресенье, выходные — первая и последняя
  const head = await p.evaluate(() => [...document.querySelectorAll('#calHead span')].map(s => [s.textContent, s.className]));
  ok('шапка месяца с воскресенья', head.length === 7 && /^вс/i.test(head[0][0]) && head[0][1] === 'we' && head[6][1] === 'we'
     && head.filter(h => h[1] === 'we').length === 2, head.map(h => h[0] + (h[1] ? '*' : '')).join(' '));
  const weCells = await p.evaluate(() => [...document.querySelectorAll('#cal .d')].slice(0, 7).map(d => d.classList.contains('we')));
  ok('в сетке выходные — 1-я и 7-я колонки', weCells[0] && weCells[6] && weCells.filter(Boolean).length === 2, weCells);

  // «Фотосъёмка» и «сдвинуто» в строках дня
  const panel = await p.evaluate(() => [...document.querySelectorAll('#dpSessions .plan-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  ok('съёмка без жанра — «Фотосъёмка»', panel.some(r => /Фотосъёмка/.test(r)) && !panel.some(r => /undefined/.test(r)), panel);
  ok('строка блока говорит «сдвинуто»', panel.some(r => /Время сдвинуто в календаре\. Было 10:00 – 12:00, стало 14:00 – 16:00\./.test(r)));

  // Лист блока: плашка, «Готово» — ключи натива на месте
  await click('#dpSessions .plan-row.busy[data-b="b1"]'); await p.waitForTimeout(400);
  const plate = await p.evaluate(() => { const e = document.getElementById('blkMoved'), t = document.getElementById('blkMovedT');
    return !!e && !e.hidden && !!t && t.textContent.replace(/\s+/g, ' '); });
  ok('плашка «сдвинуто» в листе блока', /Было 10:00 – 12:00, стало 14:00 – 16:00/.test(plate || ''), plate);
  await click('#blkDone'); await p.waitForTimeout(400);
  let s = await store();
  ok('clients пережил запись', JSON.stringify(s.clients) === JSON.stringify(SEED.clients));
  ok('clientsAssembled, myDocs пережили запись', s.clientsAssembled === true && JSON.stringify(s.myDocs) === JSON.stringify(SEED.myDocs));
  ok('weekStart = sun', s.weekStart === 'sun', s.weekStart);
  ok('notif.remind = 30', s.notif && s.notif.remind === 30, s.notif);
  ok('mvd блока пережил «Готово»', s.blocks[0] && JSON.stringify(s.blocks[0].mvd) === JSON.stringify(SEED.blocks[0].mvd), s.blocks[0]);
  ok('clientId/via/calTitle съёмки на месте', s.sessions[0].clientId === 'c1' && s.sessions[0].via && s.sessions[0].via.n === 'Алёна' && s.sessions[0].calTitle === 'Портрет');

  // Форма съёмки: правка и «Сохранить» не отрывают съёмку от клиента
  const i0 = await p.evaluate(() => { const r = [...document.querySelectorAll('#dpSessions .plan-row[data-i]')].find(x => /Ольга/.test(x.textContent)); return r ? r.dataset.i : null; });
  await click(`#dpSessions .plan-row[data-i="${i0}"]`); await p.waitForTimeout(500);
  await click('#cardEdit'); await p.waitForTimeout(600);
  // Шаг гостей: «+» ×12 → 1…10, 20, 30; «−» ×3 → 20, 10, 9
  const steps = [];
  for (let k = 0; k < 12; k++) { await click('#fGuestsPlus'); steps.push(await p.evaluate(() => document.getElementById('fGuestsVal').value)); }
  for (let k = 0; k < 3; k++) { await click('#fGuestsMinus'); steps.push(await p.evaluate(() => document.getElementById('fGuestsVal').value)); }
  ok('шаг гостей как в нативе', steps.join(',') === '1,2,3,4,5,6,7,8,9,10,20,30,20,10,9', steps.join(','));
  await click('#fSave'); await p.waitForTimeout(600);
  s = await store();
  const s1 = s.sessions.find(x => x.id === 's1') || {};
  ok('форма сохранила съёмку', s1.guests === 9, s1.guests);
  ok('clientId/via/calTitle пережили форму', s1.clientId === 'c1' && s1.via && s1.via.tel === '+79990001122' && s1.calTitle === 'Портрет', s1);

  // ✕ на плашке блока стирает mvd
  await click('#dpSessions .plan-row.busy[data-b="b1"]'); await p.waitForTimeout(400);
  await click('#blkMovedX'); await p.waitForTimeout(300); await click('#blkScrim');
  s = await store();
  ok('✕ стирает mvd', s.blocks[0] && !('mvd' in s.blocks[0]));

  // «Неделя начинается»: суббота
  await click('#wsChips [data-ws="sat"]'); await p.waitForTimeout(400);
  const head2 = await p.evaluate(() => [...document.querySelectorAll('#calHead span')].map(s => [s.textContent, s.className]));
  s = await store();
  ok('чип «Суббота» → шапка с субботы', /^сб/i.test(head2[0][0]) && head2[0][1] === 'we' && head2[1][1] === 'we' && s.weekStart === 'sat',
     head2.map(h => h[0] + (h[1] ? '*' : '')).join(' '));

  // Слова подвидов на пяти языках
  const words = await p.evaluate(() => ['ru', 'en', 'es', 'ja', 'zh'].map(l => {
    const d = (window.LANG.dict && window.LANG.dict[l]) || null; return d ? [l, d['sub.bachelor'], d['sub.bachelorette'], d['genre.photoshoot'], d['set.weekStart']].join('|') : l + ':?';
  }));
  ok('слова на 5 языках', words.every(w => !/undefined|:\?/.test(w)), words);
  ok('нет ошибок страницы', errs.length === 0, errs);

  rows.forEach(r => console.log(r.join('  ')));
  await b.close(); process.exit(rows.some(r => r[0] === '✗') ? 1 : 0);
})();

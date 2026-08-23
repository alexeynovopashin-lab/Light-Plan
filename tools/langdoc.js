/* Выгрузка словаря в Markdown — для сверки носителями и переводчиками.

   Правило одно: этот файл читает `lang.js` и порождает таблицу, а не
   наоборот. Поправки, найденные носителем, идут обратно в `lang.js` —
   вручную MD не редактируется, при следующей выгрузке правка потеряется.

   Порядок строк — как в `DICT.ru`: экраны идут в том порядке, в котором
   стоят в словаре (см. заголовки секций «---- Экран ... ----» в файле),
   а не по алфавиту — переводчик идёт экранами, а не читает список наугад.

   Формы числа показаны все, через « / »: у русского их три, у английского
   и испанского — две, у японского и китайского — одна (число не
   согласуется со словом вовсе).

   Столбец «Где встречается» — грубый перебор `beta/index.html`: ищет
   буквальную строку ключа в кавычках. Ключ, собранный на лету
   («dealN.» + kind), так не найдётся — колонка Экран и русский текст
   тогда остаются единственной подсказкой места.

   Пример:
     node tools/langdoc.js
     node tools/langdoc.js --file beta/lang.js --out LANG_TABLE.md
*/
const fs = require('fs');
const path = require('path');

const args = {};
process.argv.slice(2).forEach((a, i, all) => {
  if (a.startsWith('--')) args[a.slice(2)] = all[i + 1];
});
const root = path.join(__dirname, '..');
const target = args.file || path.join(root, 'beta', 'lang.js');
const appFile = path.join(root, 'beta', 'index.html');
const outFile = args.out || path.join(root, 'LANG_TABLE.md');

const src = fs.readFileSync(target, 'utf8');

/* ---------- 1. Порядок ключей и разбивка на экраны — из исходника DICT.ru ----------
   DICT — вычисленный объект, порядок и комментарии в нём не живут: их надо
   взять из текста файла, пока он ещё текст. */
function extractBlock(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0) throw new Error('не нашли ' + marker);
  const bodyStart = start + marker.length;
  const closeRe = /\n {2}\};/g;
  closeRe.lastIndex = bodyStart;
  const m = closeRe.exec(text);
  if (!m) throw new Error('не нашли закрытие блока ' + marker);
  return text.slice(bodyStart, m.index);
}

const ruBlock = extractBlock(src, 'DICT.ru = {');
const SECTION_RE = /\/\*\s*----\s*(.+?)\s*----/;
const KEY_RE = /^\s*"([\w.\-]+)":/;

const order = [];
let section = '—';
ruBlock.split('\n').forEach((line) => {
  const sm = line.match(SECTION_RE);
  if (sm) { section = sm[1].trim(); return; }
  const km = line.match(KEY_RE);
  if (km) order.push({ key: km[1], section });
});

/* ---------- 2. Значения — тем же способом, что и langcheck.js ---------- */
const fakeGlobal = {
  navigator: { language: 'ru-RU' },
  document: { documentElement: {} },
  localStorage: { getItem: () => null, setItem: () => {} }
};
new Function(src).call(fakeGlobal);
const dict = fakeGlobal.LANG.dict;

function cell(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(' / ');
  return String(v).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/* ---------- 3. Где встречается — буквальный grep по index.html ---------- */
const appLines = fs.readFileSync(appFile, 'utf8').split('\n');
const usageCache = {};
function usage(key) {
  if (usageCache[key] !== undefined) return usageCache[key];
  const needle = '"' + key + '"';
  const hits = [];
  for (let i = 0; i < appLines.length && hits.length < 3; i++) {
    if (appLines[i].indexOf(needle) >= 0) hits.push(i + 1);
  }
  const text = hits.length ? hits.map((n) => 'index.html:' + n).join(', ') : 'не найдено статикой';
  usageCache[key] = text;
  return text;
}

/* ---------- 4. Таблица ---------- */
const lines = [];
lines.push('# Light Plan — словарь на вычитку');
lines.push('');
lines.push('Сгенерировано из `beta/lang.js` инструментом `tools/langdoc.js` — не '
  + 'редактируется руками, следующая выгрузка перезапишет правку. Найденные '
  + 'поправки вносятся в `lang.js`, а таблица выгружается заново.');
lines.push('');
lines.push('Generated from `beta/lang.js`. Do not hand-edit — corrections go into '
  + '`lang.js`, then re-run `node tools/langdoc.js`. Where a word has more than '
  + 'one numeric form, all forms are shown separated by " / ": Russian has three '
  + '(1 / 2–4 / 5+), English and Spanish have two (1 / other), Japanese and '
  + 'Chinese have one (no agreement). "Not found by static scan" in the last '
  + 'column means the key is assembled by code at runtime — use the Screen and '
  + 'Russian/English columns to place it.');
lines.push('');
lines.push(`Ключей: ${order.length}. Пустые столбцы es/ja/zh ждут переводчика.`);
lines.push('');
lines.push('| Ключ | Экран | Русский | Английский | en-US | en-GB | Español | 日本語 | 中文 | Где встречается |');
lines.push('|---|---|---|---|---|---|---|---|---|---|');

order.forEach(({ key, section }) => {
  const row = [
    '`' + key + '`',
    section,
    cell(dict.ru[key]),
    cell(dict.en[key]),
    cell(dict['en-US'] ? dict['en-US'][key] : null),
    cell(dict['en-GB'] ? dict['en-GB'][key] : null),
    cell(dict.es ? dict.es[key] : null),
    cell(dict.ja ? dict.ja[key] : null),
    cell(dict.zh ? dict.zh[key] : null),
    usage(key)
  ];
  lines.push('| ' + row.join(' | ') + ' |');
});

fs.writeFileSync(outFile, lines.join('\n') + '\n');
console.log(`Записано ${order.length} строк в ${path.relative(root, outFile)}`);

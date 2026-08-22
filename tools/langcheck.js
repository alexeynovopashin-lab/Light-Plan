/* Сверка словарей lang.js.

   Три разные проверки, потому что три разных рода словарей:

   1. Основы (ru, en) должны совпадать ключ в ключ. Разошлись — это ошибка,
      и скрипт падает с ненулевым кодом.
   2. Заготовки (es, ja, zh) заполняются переводчиком и пока пусты. Отчёт
      показывает «0 из N» — это ожидаемо, не ошибка.
   3. Наложения говоров (en-US, en-GB) хранят только отличия от основы.
      Полнота от них не требуется вовсе. Но каждый их ключ обязан быть в
      основе: ключ, которого в основе нет, — это опечатка, и он молча
      никогда не сработает. Такое роняет скрипт.

   Пример:
     node tools/langcheck.js
     node tools/langcheck.js --file beta/lang.js
*/
const fs = require('fs');
const path = require('path');

const args = {};
process.argv.slice(2).forEach((a, i, all) => {
  if (a.startsWith('--')) args[a.slice(2)] = all[i + 1];
});
const target = args.file || path.join(__dirname, '..', 'beta', 'lang.js');

const fakeGlobal = {
  navigator: { language: 'ru-RU' },
  document: { documentElement: {} },
  localStorage: { getItem: () => null, setItem: () => {} }
};
new Function(fs.readFileSync(target, 'utf8')).call(fakeGlobal);
const LANG = fakeGlobal.LANG;
const dict = LANG.dict;

const base = new Set([...Object.keys(dict.ru), ...Object.keys(dict.en)]);
const codes = Object.keys(dict);
const regional = codes.filter((c) => c.indexOf('-') >= 0);
const plain = codes.filter((c) => c.indexOf('-') < 0 && c !== 'ru' && c !== 'en');

let bad = false;

console.log(`Основы: русский ${Object.keys(dict.ru).length}, английский ${Object.keys(dict.en).length}`);
const ruMissing = [...base].filter((k) => dict.ru[k] == null);
const enMissing = [...base].filter((k) => dict.en[k] == null);
if (ruMissing.length) { bad = true; console.log(`РУССКИЙ не хватает ${ruMissing.length}: ${ruMissing.join(', ')}`); }
if (enMissing.length) { bad = true; console.log(`АНГЛИЙСКИЙ не хватает ${enMissing.length}: ${enMissing.join(', ')}`); }
if (!ruMissing.length && !enMissing.length) console.log('ru/en разошлись на 0 ключей — сверены полностью.');

if (regional.length) {
  console.log('\nГоворы — только отличия от основы, полнота не требуется:');
  regional.forEach((c) => {
    const own = Object.keys(dict[c]);
    /* Ключ говора, которого нет в его основе, не сработает никогда:
       поиск идёт от говора к основе, и лишний ключ просто повисает. */
    const baseCode = LANG.base(c);
    const parent = dict[baseCode] || {};
    const orphans = own.filter((k) => parent[k] == null);
    console.log(`  ${c}: ${own.length} отличий от ${baseCode}`);
    if (orphans.length) {
      bad = true;
      console.log(`    ОШИБКА — этих ключей нет в основе: ${orphans.join(', ')}`);
    }
  });
}

if (plain.length) {
  console.log('\nЗаготовки — ждут переводчика:');
  plain.forEach((c) => {
    const have = Object.keys(dict[c]).length;
    console.log(`  ${c}: ${have} из ${base.size}`);
  });
}

process.exit(bad ? 1 : 0);

/* Сверка словарей lang.js: у какого языка каких ключей не хватает против
   английского (запасного) и русского (боевого). Гонять перед каждым пушем
   бета-словаря — иначе пропажа ключа всплывает не тут, а на экране.

   Пустые словари (es/ja/zh, см. lang.js) — не ошибка, а заявленный этап:
   отчёт покажет их как "0 из N", это ожидаемо до перевода.

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
const src = fs.readFileSync(target, 'utf8');
new Function(src).call(fakeGlobal);
const LANG = fakeGlobal.LANG;
const dict = LANG.dict;

const base = new Set([...Object.keys(dict.ru), ...Object.keys(dict.en)]);
const langs = Object.keys(dict).filter((l) => l !== 'ru' && l !== 'en');

console.log(`Ключей в русском: ${Object.keys(dict.ru).length}, в английском: ${Object.keys(dict.en).length}`);
const ruMissing = [...base].filter((k) => dict.ru[k] == null);
const enMissing = [...base].filter((k) => dict.en[k] == null);
if (ruMissing.length) console.log(`РУССКИЙ не хватает ${ruMissing.length}: ${ruMissing.join(', ')}`);
if (enMissing.length) console.log(`АНГЛИЙСКИЙ не хватает ${enMissing.length}: ${enMissing.join(', ')}`);
if (!ruMissing.length && !enMissing.length) console.log('ru/en разошлись на 0 ключей — сверены полностью.');

langs.forEach((l) => {
  const have = Object.keys(dict[l]).length;
  const missing = [...base].filter((k) => dict[l][k] == null);
  const stub = LANG.stub && LANG.stub.indexOf(l) >= 0;
  console.log(`\n${l}${stub ? ' (заготовка)' : ''}: ${have} из ${base.size}`);
  if (missing.length && missing.length <= 20) console.log('  не хватает: ' + missing.join(', '));
  else if (missing.length) console.log(`  не хватает ${missing.length} ключей`);
});

const badExit = ruMissing.length > 0 || enMissing.length > 0;
process.exit(badExit ? 1 : 0);

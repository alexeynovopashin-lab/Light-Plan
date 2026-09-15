/* Слияние двух снимков: проверка парами. Функция чистая — облако не нужно.
     node tools/mergecheck.js                 — прогон по beta/index.html
     node tools/mergecheck.js старый/index.html — по другой странице:
       git show e96fcd8^:beta/index.html > /tmp/index_old.html
   С 16-й проверки — деньги группы повтора: предоплата при заведении и
   продлении, доли месяца после слияния и смены суммы. */
const fs = require("fs"), vm = require("vm");
const h = fs.readFileSync(process.argv[2] || "beta/index.html", "utf8");
const grab = (sig) => { const i = h.indexOf(sig); if (i < 0) throw new Error("нет: " + sig);
  let d = 0; for (let k = h.indexOf("{", i); k < h.length; k++) {
    if (h[k] === "{") d++; else if (h[k] === "}") { d--; if (!d) return h.slice(i, k + 1); } } };
const src = ["var MERGE_LISTS = [", "var SET_SKIP = {", "function mtOf(r)",
  "function mergePick(a, devA, b, devB)", "function mergeStores(a, b)"]
  .map(s => s.startsWith("var") ? h.slice(h.indexOf(s), h.indexOf(";", h.indexOf(s)) + 1) : grab(s)).join("\n");
const ctx = {}; vm.createContext(ctx); new vm.Script(src).runInContext(ctx);
const M = ctx.mergeStores;

let pass = 0, fail = 0;
function ok(name, cond, got) {
  if (cond) { pass++; console.log("  ok  " + name); }
  else { fail++; console.log("МИМО  " + name + "   получили: " + JSON.stringify(got)); }
}
const ids = o => (o || []).map(r => r.id).sort();

// 1. Объединение: чего нет у меня, но есть у соседа — приходит
{
  const a = { dev: "A", sessions: [{ id: "s1", mt: 10, n: "моя" }] };
  const b = { dev: "B", sessions: [{ id: "s2", mt: 10, n: "чужая" }] };
  ok("объединение списков", JSON.stringify(ids(M(a, b).sessions)) === '["s1","s2"]', ids(M(a, b).sessions));
}
// 2. Спор двух правок: побеждает позднейшая, с обеих сторон одинаково
{
  const a = { dev: "A", sessions: [{ id: "s1", mt: 20, n: "новее" }] };
  const b = { dev: "B", sessions: [{ id: "s1", mt: 10, n: "старее" }] };
  ok("позднейшая правка побеждает", M(a, b).sessions[0].n === "новее", M(a, b).sessions[0]);
  ok("порядок сторон не важен", M(b, a).sessions[0].n === "новее", M(b, a).sessions[0]);
}
// 3. Равные отметки: обе стороны выбирают одно и то же
{
  const a = { dev: "A", sessions: [{ id: "s1", mt: 10, n: "от A" }] };
  const b = { dev: "B", sessions: [{ id: "s1", mt: 10, n: "от B" }] };
  ok("равенство разрешается одинаково", M(a, b).sessions[0].n === M(b, a).sessions[0].n, [M(a, b).sessions[0].n, M(b, a).sessions[0].n]);
}
// 4. Пустое устройство не стирает книгу
{
  const a = { dev: "A", sessions: [{ id: "s1", mt: 10 }, { id: "s2", mt: 11 }] };
  const b = { dev: "B", sessions: [], trashed: [], graves: [] };
  ok("пустой сосед ничего не стирает", M(a, b).sessions.length === 2, M(a, b).sessions);
  ok("и в обратную сторону", M(b, a).sessions.length === 2, M(b, a).sessions);
}
// 5. Удаление позже правки — запись уходит в корзину
{
  const a = { dev: "A", sessions: [{ id: "s1", mt: 10 }] };
  const b = { dev: "B", sessions: [], trashed: [{ rec: { id: "s1", mt: 10 }, at: 0, del: 20 }] };
  const r = M(a, b);
  ok("удаление после правки — в корзину", r.sessions.length === 0 && r.trashed.length === 1, r);
}
// 6. Правка позже удаления — запись остаётся живой
{
  const a = { dev: "A", sessions: [{ id: "s1", mt: 30, n: "правил после" }] };
  const b = { dev: "B", sessions: [], trashed: [{ rec: { id: "s1", mt: 10 }, at: 0, del: 20 }] };
  const r = M(a, b);
  ok("правка после удаления — жива", r.sessions.length === 1 && r.trashed.length === 0, r);
}
// 7. Возврат из корзины переживает слияние (ради этого возврат ставит отметку)
{
  const a = { dev: "A", sessions: [{ id: "s1", mt: 40 }], trashed: [] };          // вернули в 40
  const b = { dev: "B", sessions: [], trashed: [{ rec: { id: "s1", mt: 10 }, at: 0, del: 30 }] };
  ok("возврат переживает слияние", M(a, b).sessions.length === 1, M(a, b));
}
// 8. Похороненная запись не воскресает
{
  const a = { dev: "A", sessions: [{ id: "s1", mt: 10 }] };
  const b = { dev: "B", sessions: [], graves: [{ id: "s1", del: 20 }] };
  const r = M(a, b);
  ok("тень не даёт воскреснуть", r.sessions.length === 0 && r.graves.length === 1, r);
}
// 9. Но заново созданная под тем же ключом — да (правка новее тени)
{
  const a = { dev: "A", sessions: [{ id: "s1", mt: 40 }] };
  const b = { dev: "B", sessions: [], graves: [{ id: "s1", del: 20 }] };
  ok("правка новее тени — запись жива", M(a, b).sessions.length === 1, M(a, b));
}
// 10. Настройки по ключу: тема с одного, язык с другого
{
  const a = { dev: "A", theme: "dark", lang: "ru", setMt: { theme: 50, lang: 10 } };
  const b = { dev: "B", theme: "light", lang: "en", setMt: { theme: 10, lang: 50 } };
  const r = M(a, b);
  ok("тема от новейшей", r.theme === "dark", r.theme);
  ok("язык от новейшей", r.lang === "en", r.lang);
  ok("настройки не спорят между собой", M(b, a).theme === "dark" && M(b, a).lang === "en", [M(b, a).theme, M(b, a).lang]);
}
// 11. Цепочка прежних ID объединяется
{
  const a = { dev: "A", me: { phone: "1", ids: [{ was: "idA", at: "2026-01-01" }] }, setMt: { me: 10 } };
  const b = { dev: "B", me: { phone: "2", ids: [{ was: "idB", at: "2026-02-01" }] }, setMt: { me: 20 } };
  const r = M(a, b);
  ok("цепочка ID объединяется", r.me.ids.map(x => x.was).join(",") === "idA,idB", r.me.ids);
  ok("сам номер — от новейшей", r.me.phone === "2", r.me.phone);
}
// 12. Три устройства: слияние подряд, порядок не влияет
{
  const a = { dev: "A", sessions: [{ id: "s1", mt: 10, n: "a" }] };
  const b = { dev: "B", sessions: [{ id: "s1", mt: 30, n: "b" }, { id: "s2", mt: 5 }] };
  const c = { dev: "C", sessions: [{ id: "s1", mt: 20, n: "c" }, { id: "s3", mt: 5 }] };
  const r1 = M(M(a, b), c), r2 = M(M(c, a), b), r3 = M(M(b, c), a);
  const key = r => JSON.stringify(ids(r.sessions)) + "|" + r.sessions.find(x => x.id === "s1").n;
  ok("три устройства в любом порядке дают одно", key(r1) === key(r2) && key(r2) === key(r3), [key(r1), key(r2), key(r3)]);
}
// 13. Слияние с самим собой ничего не меняет
{
  const a = { dev: "A", sessions: [{ id: "s1", mt: 10 }], orgs: [{ id: "o1", mt: 5 }],
              trashed: [{ rec: { id: "s9", mt: 1 }, at: 0, del: 7 }], graves: [{ id: "s8", del: 3 }],
              theme: "dark", setMt: { theme: 4 } };
  const r = M(a, a);
  ok("слияние с собой — тождество", JSON.stringify(ids(r.sessions)) === '["s1"]'
     && r.trashed.length === 1 && r.graves.length === 1 && r.theme === "dark", r);
}
// 14. Все четыре коллекции, не только съёмки
{
  const a = { dev: "A", orgs: [{ id: "o1", mt: 10 }], spots: [{ id: "p1", mt: 10 }], blocks: [{ id: "b1", mt: 10 }] };
  const b = { dev: "B", orgs: [{ id: "o2", mt: 10 }], spots: [{ id: "p2", mt: 10 }], blocks: [{ id: "b2", mt: 10 }] };
  const r = M(a, b);
  ok("организации, места и занятое время тоже сливаются",
     r.orgs.length === 2 && r.spots.length === 2 && r.blocks.length === 2, r);
}
// 15. Запись без отметки — самая старая
{
  const a = { dev: "A", sessions: [{ id: "s1", n: "без отметки" }] };
  const b = { dev: "B", sessions: [{ id: "s1", mt: 1, n: "с отметкой" }] };
  ok("без отметки проигрывает любой известной правке", M(a, b).sessions[0].n === "с отметкой", M(a, b).sessions[0]);
}

/* ---------- Повтор: деньги группы ----------
   Заведение, продление и доля месяца вырезаются из той же страницы и идут в
   своей песочнице. Форма подменена тем, что она передаёт: правило, число
   карточек, способ оплаты. Смены суммы (`repSumAt`, `repSumsOf`) у старых
   страниц нет — тогда их нет и здесь, и проверки долей должны не сойтись. */
const has = sig => h.indexOf(sig) >= 0;
const repSrc = ["var PAY = {", "function dayOf(", "function dayText(", "function repDates(", "function repPeriodIndex(",
  "function repShare(", "function repSumAt(", "function repSumsOf(", "function repMates(",
  "function repCopy(", "function repMake(", "function repExtend(", "function sessionIncome("]
  .filter(s => s.startsWith("var") || has(s) || !/repSumAt|repSumsOf/.test(s))
  .map(s => s.startsWith("var") ? h.slice(h.indexOf(s), h.indexOf("};", h.indexOf(s)) + 2) : grab(s)).join("\n");
const R = {};
vm.createContext(R);
new vm.Script(`var sessions = [], boards = [], trashed = [], LAT = 56.47, LON = 84.95, me = {};
  var fRep = "never", fRepN = 2, fRepOn = { client: 1, route: 1, notes: 1, kit: 1, playlist: 1, brief: 1, docs: 1, wish: 1, delivery: 1, refs: 1 };
  var fPay = "flat", fRepMonthly = 0, idN = 0;
  function newId() { return "n" + (++idN); }
  function notWork() { return false; }
  function myCity() { return ""; }
  function boardOfSession() { return null; }
  function syncBoardGenre() {}
  function wishesCheck() { return null; }
  ${repSrc}`).runInContext(R);
const dd = (y, m, d) => new Date(y, m, d);
const rec = (id, date, extra) => Object.assign({ id, kind: "shoot", type: "report", date, min: 600, dur: 60, end: 660,
  pay: "flat", rate: 15000, prepay: 0, wish: [], route: [], mt: 10 }, extra || {});
/* Снимок — как его пишет saveAll: день строкой. Обратно — как читает загрузка */
const snap = (dev, list) => ({ dev, sessions: JSON.parse(JSON.stringify(list.map(s => Object.assign({}, s, { date: R.dayText(s.date) })))) });
const load = list => { R.sessions = list.map(s => Object.assign({}, s, { date: R.dayOf(s.date) })); };
const byDate = f => R.sessions.slice().sort((a, b) => a.date - b.date).map(f).join(" ");
const dm = d => ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2);
const pre = () => byDate(s => dm(s.date) + ":" + (s.prepay || 0));
const inc = () => byDate(s => dm(s.date) + "=" + Math.round(R.sessionIncome(s)));

// 16. Заведение: предоплата только у первой карточки, копии по нулям
{
  const first = rec("g1", dd(2026, 8, 14), { prepay: 5000 });
  R.sessions = [first]; R.fRep = "week"; R.fRepN = 3; R.fPay = "flat";
  R.repMake(first);
  ok("заведение: предоплата только у первой", pre() === "14.09:5000 21.09:0 28.09:0", pre());
}
// 17. Продление: копии по нулям, у первой и у последней — своя, поставленная руками
{
  const last = R.sessions.slice().sort((a, b) => a.date - b.date)[2];
  last.prepay = 3000;
  R.fRepN = 2;
  R.repExtend(last);
  ok("продление: копии по нулям, свои предоплаты не тронуты", pre() === "14.09:5000 21.09:0 28.09:3000 05.10:0 12.10:0", pre());
}
// 18. Помесячная группа: доля месяца и предоплата первой
{
  const first = rec("m1", dd(2026, 8, 14), { pay: "monthly", prepay: 12000 });
  R.sessions = [first]; R.fRep = "week"; R.fRepN = 4; R.fPay = "monthly"; R.fRepMonthly = 40000;
  R.repMake(first);
  ok("помесячная: четыре доли по 10 000, предоплата у первой",
     inc() === "14.09=10000 21.09=10000 28.09=10000 05.10=10000" && pre() === "14.09:12000 21.09:0 28.09:0 05.10:0", [inc(), pre()]);
}
/* 19–21. Два устройства. A продлил группу из 18 на четыре недели и смены
   суммы ещё не видел; B поставил 60 000 с первого месяца на своих четырёх
   карточках, правка новее. Месяц 0 — 14.09…13.10 (пять карточек), месяц 1 —
   19.10, 26.10, 02.11 */
{
  const base = snap("B", R.sessions);
  R.fRepN = 4;
  R.repExtend(R.sessions.slice().sort((a, b) => a.date - b.date)[3]);
  const a = snap("A", R.sessions);
  const b = JSON.parse(JSON.stringify(base));
  b.sessions.forEach(s => { s.rep.sums = [{ k: 0, sum: 60000, at: 100 }]; s.mt = 20; });
  const want = "14.09=12000 21.09=12000 28.09=12000 05.10=12000 12.10=12000 19.10=20000 26.10=20000 02.11=20000";
  load(M(a, b).sessions);
  const ab = inc();
  ok("слияние: смена суммы доходит до копий продления", ab === want, ab);
  load(M(b, a).sessions);
  ok("слияние групп: порядок сторон не важен", inc() === ab, [ab, inc()]);
  /* C правил заметку 21.09 позже всех, а смену суммы не получал: его версия
     карточки побеждает, но сумму месяца держат соседи */
  const c = JSON.parse(JSON.stringify(base));
  c.dev = "C"; c.sessions = c.sessions.filter(s => s.date === "2026-09-21");
  c.sessions[0].notes = "с другого"; c.sessions[0].mt = 30;
  const abc = M(M(a, b), c);
  load(abc.sessions);
  ok("слияние со старой версией карточки держит сумму",
     inc() === want && abc.sessions.find(s => s.date === "2026-09-21").notes === "с другого", inc());
}
// 22. Новая смена перекрывает поставленную раньше на более поздний месяц
{
  const g = [0, 1, 2, 3].map(i => rec("p" + i, dd(2026, 6 + i, 14), { pay: "monthly", rate: null,
    rep: { g: "P", rule: "month", i: i + 1, n: 4, monthly: 50000, start: "2026-07-14", sums: [{ k: 3, sum: 70000, at: 1 }] } }));
  g[1].rep.sums = g[1].rep.sums.concat([{ k: 1, sum: 55000, at: 2 }]);
  R.sessions = g;
  ok("смена суммы: новая перекрывает прежнюю на поздний месяц", inc() === "14.07=50000 14.08=55000 14.09=55000 14.10=55000", inc());
}
console.log("\nсошлось: " + pass + "   не сошлось: " + fail);
process.exit(fail ? 1 : 0);

/* Слияние двух снимков: проверка парами. Функция чистая — облако не нужно */
const fs = require("fs"), vm = require("vm");
const h = fs.readFileSync("beta/index.html", "utf8");
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
console.log("\nсошлось: " + pass + "   не сошлось: " + fail);
process.exit(fail ? 1 : 0);

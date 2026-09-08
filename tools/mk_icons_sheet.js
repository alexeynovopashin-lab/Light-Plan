/* Собирает tools/icons.html — лист всей библиотеки знаков.
   Запуск из корня проекта: node tools/mk_icons_sheet.js
   Гонять после каждой правки icons.js, иначе лист отстанет. */
var fs = require("fs");
var path = require("path");
var ROOT = path.join(__dirname, "..") + path.sep;
global.window = {};
require(ROOT + "beta/icons.js");
var I = global.window.ICONS;

/* Где знак живёт. Считаем по делу, а не поиском имени в файле: половина
   знаков стоит в таблицах самой библиотеки (слова точек дня, жанры,
   пожелания), и вырезать её из поиска значило бы объявить их лишними. */
var app = fs.readFileSync(ROOT + "beta/index.html", "utf8");
/* Режем не по первому `</script>` — им закрывается тег maplibre в шапке, —
   а по концу самой библиотеки: иначе её таблицы попадут в поиск. */
var libEnd = app.indexOf("</script>", app.indexOf("root.ICONS = ICONS;"));
if (libEnd < 0) throw new Error("не нашёл конца встроенной библиотеки");
var appScript = app.slice(libEnd);
var use = {};
function mark(name, why) {
  if (!name) return;
  (use[name] = use[name] || []).indexOf(why) < 0 && use[name].push(why);
}
/* 1. Слова точек дня: [/регулярка/, "имя"] */
(I.pointWords || []).forEach(function (r) { mark(r[1], "точка дня"); });
/* 2. Жанры и пожелания часто не рисуют своё, а ссылаются на готовое:
      GENRES.lovestory === SIGNS.heart. Сверяем по самому телу знака. */
var ALL = {};
["points", "ui", "gear", "weather", "signs", "themes"].forEach(function (g) {
  for (var k in I[g]) if (!ALL[k]) ALL[k] = I[g][k];
});
[["genres", "жанр"], ["wishes", "пожелание"]].forEach(function (pair) {
  for (var code in I[pair[0]]) {
    for (var n in ALL) if (ALL[n] === I[pair[0]][code]) mark(n, pair[1]);
  }
});
/* 3. Уточнения жанра: значение в таблице SUBGENRE — имя знака */
var sub = appScript.match(/var SUBGENRE = \{[\s\S]*?\n  \};/);
if (sub) (sub[0].match(/:\s*"([a-z_]+)"/g) || []).forEach(function (m) {
  mark(m.replace(/.*"([a-z_]+)"/, "$1"), "уточнение");
});
/* 4. Всё остальное — прямой вызов по имени в коде экрана */
Object.keys(ALL).concat(Object.keys(I.genres), Object.keys(I.wishes)).forEach(function (n) {
  if (appScript.indexOf('"' + n + '"') >= 0) mark(n, "в коде");
});

var GROUPS = [
  ["signs",   "Знаки",        "Три общих символа: кольца, сердце, семья."],
  ["genres",  "Жанры съёмки", "Кнопка жанра в форме и знак съёмки в карточке."],
  ["points",  "Точки дня",    "Подставляются по словам в названии точки маршрута."],
  ["themes",  "Темы",         "Предметы и поводы: часть ловится словами точки, часть стоит уточнениями жанра."],
  ["gear",    "Съёмочное",    "Оптика, свет, студия."],
  ["weather", "Погода",       "Состояния неба и светила."],
  ["wishes",  "Пожелания",    "Кнопки «каким хочу небо» в форме."],
  ["ui",      "Интерфейс",    "Служебные знаки экрана."]
];

var DATA = GROUPS.map(function (g) {
  var set = I[g[0]];
  return {
    key: g[0], title: g[1], note: g[2],
    items: Object.keys(set).map(function (n) {
      var why = use[n] || [];
      /* Жанр и пожелание — сами наборы, а не ссылки: их знак по определению
         при деле, даже если имя нигде больше не встречается */
      if (g[0] === "genres" || g[0] === "wishes") why = [g[1].toLowerCase()];
      return { n: n, body: set[n], used: why.length > 0, why: why.join(", ") };
    })
  };
});
var total = DATA.reduce(function (a, g) { return a + g.items.length; }, 0);
var idle = DATA.reduce(function (a, g) { return a + g.items.filter(function (x) { return !x.used; }).length; }, 0);

var html = `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Библиотека знаков — Light Plan</title>
<!--
  БИБЛИОТЕКА ЗНАКОВ ЦЕЛИКОМ

  Все ${total} знаков icons.js, разложенные по наборам. Лист для разбора:
  тапом отмечают знак к перерисовке, отметки копятся внизу готовым списком
  и переживают перезагрузку. Инструмент, не часть продукта.

  Пометка «нигде не стоит» считается по делу: слова точек дня, наборы жанров
  и пожеланий, таблица уточнений и прямые вызовы по имени. Такой знак либо
  ждёт замысла, либо лишний. Наведите на знак — подпись скажет, чем он занят.
-->
<style>
  :root {
    --bg:#101114; --card:#17181d; --sunk:#131418; --line:#24262c;
    --ink:#E6E3DC; --ink-2:#9A9384; --ink-3:#6B6559; --brass:#D8B98A; --warn:#C9663D;
  }
  :root[data-t="light"] {
    --bg:#F4F1EA; --card:#FFFFFF; --sunk:#ECE8DF; --line:#DED9CE;
    --ink:#22201C; --ink-2:#6B6559; --ink-3:#8B8474; --brass:#8A6A33; --warn:#C9663D;
  }
  * { box-sizing: border-box; }
  body { margin:0; padding:20px 16px 40px; background:var(--bg); color:var(--ink);
    font:14px/1.55 -apple-system,BlinkMacSystemFont,system-ui,"Segoe UI",Roboto,sans-serif;
    -webkit-font-smoothing:antialiased; }
  .wrap { max-width: 1000px; margin: 0 auto; }
  h1 { font-size:21px; margin:0 0 4px; letter-spacing:-0.2px; }
  .lede { color:var(--ink-2); margin:0 0 18px; max-width:64ch; }
  h2 { font-size:15px; margin:26px 0 2px; }
  .gnote { color:var(--ink-3); font-size:12.5px; margin:0 0 12px; }
  .gnote b { color:var(--ink-2); font-weight:600; }

  .bar { display:flex; gap:8px; flex-wrap:wrap; margin:0 0 6px;
    position:sticky; top:0; padding:10px 0; background:var(--bg); z-index:5; }
  button { font:inherit; font-size:13px; padding:8px 13px; border-radius:10px;
    border:1px solid var(--line); background:var(--card); color:var(--ink); cursor:pointer; }
  button.on { border-color:var(--brass); color:var(--brass); }
  button.go { background:var(--brass); border-color:var(--brass); color:#17140E; font-weight:600; }
  .tally { align-self:center; color:var(--ink-3); font-size:12.5px; }

  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:7px; }
  .cell { background:var(--card); border:1px solid var(--line); border-radius:12px;
    padding:12px 4px 9px; display:flex; flex-direction:column; align-items:center; gap:7px;
    cursor:pointer; position:relative; user-select:none;
    transition:border-color .15s ease, background .15s ease; }
  .cell:hover { border-color:var(--ink-3); }
  .cell.pick { border-color:var(--brass); background:var(--sunk); }
  .cell.pick::after { content:"✓"; position:absolute; top:5px; right:7px;
    color:var(--brass); font-size:11px; line-height:1; }
  .cell svg { fill:none; stroke:var(--brass); stroke-linecap:round; stroke-linejoin:round;
    stroke-width:1.5; width:22px; height:22px; }
  .cell .n { font:11px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;
    color:var(--ink-2); text-align:center; word-break:break-all; }
  .cell.idle .n { color:var(--ink-3); }
  .cell.idle::before { content:""; position:absolute; top:7px; left:7px;
    width:4px; height:4px; border-radius:50%; background:var(--warn); opacity:.65; }
  body.onlyidle .cell:not(.idle) { display:none; }
  body.onlyidle .grid:not(:has(.cell.idle)) { display:none; }

  .out { margin-top:26px; background:var(--sunk); border:1px solid var(--line);
    border-radius:14px; padding:14px 16px; }
  .out h2 { margin-top:0; }
  textarea { width:100%; min-height:120px; resize:vertical; background:var(--card);
    color:var(--ink); border:1px solid var(--line); border-radius:10px; padding:10px 12px;
    font:12.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace; }
  .empty { color:var(--ink-3); font-size:13px; }
</style>
</head><body>
<div class="wrap">

<h1>Библиотека знаков</h1>
<p class="lede">Все ${total} знаков <code>icons.js</code>, по наборам.
Тапните знак — он отметится к перерисовке; отметки копятся внизу готовым
списком и переживают перезагрузку страницы.
<b>Точкой слева</b> помечены ${idle} знаков, которые нигде не стоят: ни точкой
дня, ни жанром, ни уточнением, ни вызовом по имени. Они либо ждут замысла,
либо лишние. Наведите на любой знак — подпись скажет, чем он занят.</p>

<div class="bar">
  <button id="theme">Светлая тема</button>
  <button id="idle">Только неиспользуемые</button>
  <button id="clear">Снять отметки</button>
  <span class="tally" id="tally"></span>
</div>

<div id="sets"></div>

<div class="out">
  <h2>Отмечено к перерисовке</h2>
  <div id="empty" class="empty">Пока ничего. Тапните знак выше.</div>
  <textarea id="list" spellcheck="false" hidden></textarea>
</div>

</div>
<script>
var SETS = ${JSON.stringify(DATA)};
var KEY = "lp_sign_picks";
var picks = (function () {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
})();

var sets = document.getElementById("sets");
SETS.forEach(function (g) {
  var h = document.createElement("h2");
  h.textContent = g.title + " · " + g.items.length;
  var p = document.createElement("p");
  p.className = "gnote"; p.textContent = g.note;
  var grid = document.createElement("div");
  grid.className = "grid";
  g.items.forEach(function (it) {
    var b = document.createElement("div");
    b.className = "cell" + (it.used ? "" : " idle") + (picks.indexOf(it.n) >= 0 ? " pick" : "");
    b.dataset.n = it.n;
    b.title = it.n + (it.used ? " — " + it.why : " — нигде не стоит");
    b.innerHTML = '<svg viewBox="0 0 24 24">' + it.body + '</svg>'
      + '<span class="n">' + it.n + '</span>';
    b.addEventListener("click", function () {
      var i = picks.indexOf(it.n);
      if (i >= 0) picks.splice(i, 1); else picks.push(it.n);
      b.classList.toggle("pick", i < 0);
      save();
    });
    grid.appendChild(b);
  });
  sets.appendChild(h); sets.appendChild(p); sets.appendChild(grid);
});

/* Порядок списка — порядок отметок, а не алфавит: так его и диктуют */
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(picks)); } catch (e) {}
  var ta = document.getElementById("list");
  ta.hidden = !picks.length;
  document.getElementById("empty").hidden = !!picks.length;
  ta.value = picks.join("\\n");
  ta.style.height = "auto";
  ta.style.height = Math.max(120, ta.scrollHeight + 4) + "px";
  document.getElementById("tally").textContent =
    picks.length ? "отмечено: " + picks.length : "";
}
save();

document.getElementById("theme").addEventListener("click", function () {
  var light = document.documentElement.getAttribute("data-t") === "light";
  document.documentElement.setAttribute("data-t", light ? "dark" : "light");
  this.textContent = light ? "Светлая тема" : "Тёмная тема";
});
document.getElementById("idle").addEventListener("click", function () {
  document.body.classList.toggle("onlyidle");
  this.classList.toggle("on", document.body.classList.contains("onlyidle"));
});
document.getElementById("clear").addEventListener("click", function () {
  picks = [];
  document.querySelectorAll(".cell.pick").forEach(function (c) { c.classList.remove("pick"); });
  save();
});
</script>
</body></html>
`;
fs.writeFileSync(ROOT + "tools/icons.html", html);
console.log("tools/icons.html:", total, "знаков,", idle, "без места в коде");

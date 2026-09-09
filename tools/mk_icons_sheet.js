/* Собирает два инструмента из одной библиотеки:
     tools/icons.html — лист всех знаков, где их отмечают к перерисовке;
     tools/signs.html — стол, где отмеченное правят и собирают обратно.
   Стол читает отметки листа (общий localStorage одного адреса) или список
   из хвоста ссылки: signs.html#arch,bus,couple.
   Запуск из корня проекта: node tools/mk_icons_sheet.js
   Гонять после каждой правки icons.js, иначе оба отстанут. */
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
  a#bench { align-self:center; font-size:13px; padding:8px 13px; border-radius:10px;
    border:1px solid var(--line); background:var(--card); color:var(--brass);
    text-decoration:none; }
  a#bench.off { opacity:.45; pointer-events:none; }

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
  <a id="bench" href="signs.html">К столу перерисовки</a>
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
  /* Стол открывается на отмеченном, а список едет и хвостом ссылки — чтобы
     его можно было переслать, а не только унести в своём браузере */
  var b = document.getElementById("bench");
  b.classList.toggle("off", !picks.length);
  b.href = "signs.html" + (picks.length ? "#" + picks.join(",") : "");
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

/* ---------- Стол перерисовки ----------
   Те же знаки, но по одному и с полем правки. Список берётся из хвоста
   ссылки или из отметок листа: у обоих файлов один адрес, значит и один
   localStorage. Знаки вшиты все — стол должен уметь показать любой. */
var FLAT = [];
DATA.forEach(function (g) {
  g.items.forEach(function (it) {
    FLAT.push({ n: it.n, body: it.body.replace(/></g, ">\n<"), set: g.title,
                why: it.used ? it.why : "нигде не стоит" });
  });
});

var bench = `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Стол перерисовки — Light Plan</title>
<!--
  СТОЛ ПЕРЕРИСОВКИ ЗНАКОВ

  Собирается tools/mk_icons_sheet.js вместе с листом библиотеки. Какие знаки
  показать — решает хвост ссылки (signs.html#arch,bus) или отметки, сделанные
  в icons.html: файлы лежат по одному адресу и делят localStorage.

  Правьте разметку — знак перерисовывается на месте, во всех размерах, в
  которых он стоит в приложении. Внизу кнопка собирает готовый кусок
  для icons.js. Инструмент, не часть продукта.
-->
<style>
  :root { --bg:#101114; --card:#17181d; --sunk:#131418; --line:#24262c;
    --ink:#E6E3DC; --ink-2:#9A9384; --ink-3:#6B6559; --brass:#D8B98A; --warn:#C9663D; }
  :root[data-t="light"] { --bg:#F4F1EA; --card:#FFFFFF; --sunk:#ECE8DF; --line:#DED9CE;
    --ink:#22201C; --ink-2:#6B6559; --ink-3:#8B8474; --brass:#8A6A33; --warn:#C9663D; }
  * { box-sizing:border-box; }
  body { margin:0; padding:20px 16px 60px; background:var(--bg); color:var(--ink);
    font:14px/1.55 -apple-system,BlinkMacSystemFont,system-ui,"Segoe UI",Roboto,sans-serif;
    -webkit-font-smoothing:antialiased; }
  .wrap { max-width:860px; margin:0 auto; }
  h1 { font-size:21px; margin:0 0 4px; letter-spacing:-0.2px; }
  .lede { color:var(--ink-2); margin:0 0 18px; max-width:62ch; }
  .lede a, .rules a { color:var(--brass); }
  .rules { background:var(--sunk); border:1px solid var(--line); border-radius:14px;
    padding:13px 16px; margin:0 0 20px; color:var(--ink-2); font-size:13px; }
  .rules b { color:var(--ink); font-weight:600; }
  .rules ul { margin:8px 0 0; padding-left:18px; }
  .rules li { margin:3px 0; }
  .bar { display:flex; gap:8px; flex-wrap:wrap; margin:0 0 20px; }
  button { font:inherit; font-size:13px; padding:8px 14px; border-radius:10px;
    border:1px solid var(--line); background:var(--card); color:var(--ink); cursor:pointer; }
  button.on { border-color:var(--brass); color:var(--brass); }
  button.go { background:var(--brass); border-color:var(--brass); color:#17140E; font-weight:600; }
  .sign { background:var(--card); border:1px solid var(--line); border-radius:16px;
    padding:16px; margin:0 0 14px; }
  .head { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:3px; }
  .name { font:600 15px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--brass); }
  .idx { color:var(--ink-3); font-size:12px; }
  .note { color:var(--ink-2); font-size:13px; margin:0 0 14px; }
  .cols { display:grid; grid-template-columns:200px 1fr; gap:16px; align-items:start; }
  @media (max-width:620px) { .cols { grid-template-columns:1fr; } }
  .board { background:var(--sunk); border-radius:12px; padding:10px; }
  .board svg { display:block; width:100%; height:auto; }
  .board .art { fill:none; stroke:var(--brass); stroke-width:1.5;
    stroke-linecap:round; stroke-linejoin:round; }
  .grid line { stroke:var(--line); stroke-width:0.06; }
  .grid line.mid { stroke:var(--line); stroke-width:0.12; }
  .grid rect { fill:none; stroke:var(--line); stroke-width:0.12; stroke-dasharray:0.5 0.5; }
  body.nogrid .grid { display:none; }
  .sizes { display:flex; gap:14px; align-items:flex-end; margin:0 0 12px; flex-wrap:wrap; }
  .sz { text-align:center; }
  .sz .cap { display:block; font-size:10px; color:var(--ink-3); margin-top:5px; letter-spacing:0.2px; }
  .sz svg { fill:none; stroke:var(--ink); stroke-linecap:round; stroke-linejoin:round; display:block; }
  .sz.brass svg { stroke:var(--brass); }
  textarea { width:100%; min-height:128px; resize:vertical; background:var(--sunk);
    color:var(--ink); border:1px solid var(--line); border-radius:10px; padding:10px 12px;
    font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
  textarea.bad { border-color:var(--warn); }
  .err { color:var(--warn); font-size:12px; min-height:16px; margin-top:5px; }
  #out { width:100%; min-height:300px; margin-top:12px; display:none; }
  #out.show { display:block; }
  .none { background:var(--sunk); border:1px solid var(--line); border-radius:14px;
    padding:20px; color:var(--ink-2); }
</style>
</head><body>
<div class="wrap">

<h1>Стол перерисовки</h1>
<p class="lede">Знак правят разметкой — он меняется на месте, сразу во всех размерах,
в которых стоит в приложении. Внизу готовый кусок для <code>beta/icons.js</code>.
Какие знаки показать, решают отметки в <a href="icons.html">листе библиотеки</a>.</p>

<div class="rules">
  <b>Холст</b> — квадрат 24×24, начало в левом верхнем углу.
  <ul>
    <li>Только обводка: <b>заливку не задаём</b>. Цвет знак берёт у <code>stroke</code>, а заливка — у <code>color</code>, которого в приложении нет: залитое выйдет чёрным пятном. Нужен закрашенный квадрат — рисуйте его толстым штрихом с <code>stroke-linecap="butt"</code>, как клетки у <code>flag_finish</code>.</li>
    <li>Толщина линии одна на всю библиотеку — <b>1.5</b>; концы и стыки скруглённые. В разметке знака их не пишем, это делает обёртка.</li>
    <li>Поля по краю <b>1,8–2,6 единицы</b>: знак не должен упираться в рамку.</li>
    <li>Внутрь идут только фигуры: <code>path</code>, <code>circle</code>, <code>ellipse</code>, <code>rect</code>, <code>line</code>, <code>polyline</code>. Ни <code>svg</code>, ни <code>g</code>, ни <code>transform</code>.</li>
    <li>Дроби — до десятых. Библиотека читается глазами, и «12.35» в ней шум.</li>
  </ul>
</div>

<div class="bar">
  <button id="theme">Светлая тема</button>
  <button id="grid" class="on">Сетка</button>
  <button id="reset">Вернуть исходные</button>
  <button id="build" class="go">Собрать для icons.js</button>
</div>

<div id="list"></div>
<textarea id="out" spellcheck="false" readonly></textarea>

</div>
<script>
var ALL = ${JSON.stringify(FLAT)};
var BY = {}; ALL.forEach(function (s) { BY[s.n] = s; });

/* Хвост ссылки главнее отметок: присланная ссылка должна открыть своё,
   а не то, что осталось в браузере получателя */
function wanted() {
  var h = decodeURIComponent(location.hash.replace(/^#/, "")).trim();
  if (h) return h.split(/[\\s,]+/).filter(function (n) { return BY[n]; });
  try {
    var p = JSON.parse(localStorage.getItem("lp_sign_picks")) || [];
    return p.filter(function (n) { return BY[n]; });
  } catch (e) { return []; }
}

var SIZES = [
  { px:17, sw:1.6, cap:"в строке", brass:true },
  { px:19, sw:1.6, cap:"в плашке", brass:true },
  { px:22, sw:1.5, cap:"в сетке",  brass:false },
  { px:30, sw:1.6, cap:"в шапке",  brass:false }
];
function el(t, c) { var e = document.createElement(t); if (c) e.className = c; return e; }
function gridSvg() {
  var s = '<g class="grid">';
  for (var i = 1; i < 24; i++) {
    var m = (i % 6 === 0) ? ' class="mid"' : '';
    s += '<line' + m + ' x1="' + i + '" y1="0" x2="' + i + '" y2="24"/>';
    s += '<line' + m + ' x1="0" y1="' + i + '" x2="24" y2="' + i + '"/>';
  }
  return s + '<rect x="2.2" y="2.2" width="19.6" height="19.6"/></g>';
}
/* Разбором, а не глазами: невалидный знак иначе просто исчезает, и непонятно,
   опечатка это или неудачный рисунок */
function parseBody(src) {
  var doc = new DOMParser().parseFromString(
    '<svg xmlns="http://www.w3.org/2000/svg">' + src + '</svg>', "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length) return "разметка не разбирается";
  var ok = { path:1, circle:1, ellipse:1, rect:1, line:1, polyline:1, polygon:1 };
  var kids = doc.documentElement.children;
  if (!kids.length) return "пусто";
  for (var i = 0; i < kids.length; i++) {
    var t = kids[i].tagName.toLowerCase();
    if (!ok[t]) return "лишний узел <" + t + ">";
    if (kids[i].hasAttribute("transform")) return "transform в знаке не держим";
    var f = kids[i].getAttribute("fill");
    if (f && f !== "none") return "заливка: цвет берётся у color, которого в приложении нет";
  }
  return null;
}

var names = wanted();
var list = document.getElementById("list");
var rows = [];

if (!names.length) {
  var n = el("div", "none");
  n.innerHTML = 'Ничего не выбрано. Отметьте знаки в <a href="icons.html">листе библиотеки</a> '
    + '— стол откроется на них. Или назовите их прямо в ссылке: <code>signs.html#arch,bus,couple</code>.';
  list.appendChild(n);
} else {
  rows = names.map(function (nm, i) {
    var s = BY[nm];
    var card = el("div", "sign");
    var head = el("div", "head");
    var a = el("span", "name"); a.textContent = s.n;
    var b = el("span", "idx"); b.textContent = (i + 1) + " из " + names.length + " · " + s.set;
    head.appendChild(a); head.appendChild(b); card.appendChild(head);
    var note = el("p", "note"); note.textContent = "Где стоит: " + s.why + ".";
    card.appendChild(note);

    var cols = el("div", "cols");
    var board = el("div", "board"); cols.appendChild(board);
    var right = el("div");
    var sizes = el("div", "sizes");
    var art = SIZES.map(function (z) {
      var box = el("div", "sz" + (z.brass ? " brass" : ""));
      var holder = el("div"); box.appendChild(holder);
      var cap = el("span", "cap"); cap.textContent = z.px + " · " + z.cap;
      box.appendChild(cap); sizes.appendChild(box);
      return { holder: holder, z: z };
    });
    right.appendChild(sizes);
    var ta = el("textarea"); ta.spellcheck = false; ta.value = s.body; right.appendChild(ta);
    var err = el("div", "err"); right.appendChild(err);
    cols.appendChild(right); card.appendChild(cols);

    function draw() {
      var src = ta.value.trim();
      var bad = parseBody(src);
      err.textContent = bad || "";
      ta.classList.toggle("bad", !!bad);
      if (bad) return;
      board.innerHTML = '<svg viewBox="0 0 24 24">' + gridSvg() + '<g class="art">' + src + '</g></svg>';
      art.forEach(function (x) {
        x.holder.innerHTML = '<svg viewBox="0 0 24 24" width="' + x.z.px + '" height="' + x.z.px
          + '" stroke-width="' + x.z.sw + '">' + src + '</svg>';
      });
    }
    ta.addEventListener("input", draw);
    draw();
    list.appendChild(card);
    return { s: s, ta: ta, draw: draw };
  });
}

document.getElementById("theme").addEventListener("click", function () {
  var light = document.documentElement.getAttribute("data-t") === "light";
  document.documentElement.setAttribute("data-t", light ? "dark" : "light");
  this.textContent = light ? "Светлая тема" : "Тёмная тема";
});
document.getElementById("grid").addEventListener("click", function () {
  document.body.classList.toggle("nogrid");
  this.classList.toggle("on", !document.body.classList.contains("nogrid"));
});
document.getElementById("reset").addEventListener("click", function () {
  rows.forEach(function (r) { r.ta.value = r.s.body; r.draw(); });
  document.getElementById("out").classList.remove("show");
});
/* Собираем ровно тем видом, каким знаки лежат в icons.js */
document.getElementById("build").addEventListener("click", function () {
  if (!rows.length) return;
  var pad = Math.max.apply(null, rows.map(function (r) { return r.s.n.length; })) + 2;
  var text = rows.map(function (r) {
    var parts = r.ta.value.trim().split(/\\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var head = (r.s.n + ":");
    while (head.length < pad) head += " ";
    var out = "    " + head + " '" + parts[0] + "'";
    for (var i = 1; i < parts.length; i++) out += "\\n      + '" + parts[i] + "'";
    return out + ",";
  }).join("\\n");
  var o = document.getElementById("out");
  o.value = text; o.classList.add("show");
  o.scrollIntoView({ behavior: "smooth", block: "nearest" });
  o.select();
});
window.addEventListener("hashchange", function () { location.reload(); });
</script>
</body></html>
`;
fs.writeFileSync(ROOT + "tools/signs.html", bench);
console.log("tools/signs.html: стол на", FLAT.length, "знаков, список берёт у листа");

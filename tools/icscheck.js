/* Сверка разбора чужих календарей: тот же слой, что в бете, против набора
   файлов, какие выдают настоящие календари. Слой вырезается из
   beta/index.html — проверяется он сам, а не копия.

   Зачем: разбор ошибается молча. Событие либо исчезает из списка (нет даты —
   нет строки), либо приходит переодетым (название взято у будильника), и на
   экране это выглядит как «в календаре было мало съёмок». Первый прогон
   поймал три таких случая: `VALARM` затирал поля события, двоеточие внутри
   `TZID` рвало дату пополам, а имя жанра из словаря языка ловило «221B Baker
   Street» в стрит-съёмку — с готовой галочкой.

   Пример:
     node tools/icscheck.js
*/
var fs = require('fs'), path = require('path');
var s = fs.readFileSync(path.join(__dirname, '..', 'beta', 'index.html'), 'utf8');
var re = /<script>([\s\S]*?)<\/script>/g, main = "", m;
while ((m = re.exec(s))) if (m[1].length > main.length) main = m[1];
var layer = main.slice(main.indexOf('var ICS_GENRE_HINTS = {'), main.indexOf('  function renderIcs() {'));

/* Подпорки: слою нужны жанры, их имена на языке экрана, включённые жанры и
   список съёмок для дедупликации. Всё остальное он делает сам */
var GENRE = { portrait: 1, wedding: 1, party: 1, lovestory: 1, family: 1, landscape: 1,
  architecture: 1, street: 1, report: 1, product: 1, ad: 1 };
var NAMES = {
  ru: { portrait: "Портрет", wedding: "Свадьбы", party: "Праздник", lovestory: "Лавстори",
    family: "Семья", landscape: "Пейзаж", architecture: "Архитектура", street: "Стрит",
    report: "Репортаж", product: "Предметка", ad: "Реклама" },
  en: { portrait: "Portrait", wedding: "Weddings", party: "Celebration", lovestory: "Couples",
    family: "Family", landscape: "Landscape", architecture: "Architecture", street: "Street",
    report: "Reportage", product: "Product", ad: "Advertising" }
};
var lang = "ru", genresOn = {}, sessions = [];
for (var g in GENRE) genresOn[g] = 1;
function genreName(g2) { return NAMES[lang][g2] || g2; }
/* Словам всё равно, что показывать: подписи проверяются формой, а не
   переводом — перевод сверяет langcheck */
var LANG = {
  t: function (k, v) { return k + (v ? "(" + JSON.stringify(v) + ")" : ""); },
  count: function (k, n) { return n + " " + k; }
};
function dMonShort(d) { return d.getDate() + "." + (d.getMonth() + 1); }
function fmt(mn) {
  mn = ((mn % 1440) + 1440) % 1440;
  var h = Math.floor(mn / 60), mm = mn % 60;
  return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
}
eval(layer);

var bad = 0, checked = 0;
function chk(name, got, want) {
  checked++;
  if (String(got) !== String(want)) { bad++; console.log(name + ": «" + got + "» вместо «" + want + "»"); }
}
function ics(lines) { return ["BEGIN:VCALENDAR", "VERSION:2.0"].concat(lines, ["END:VCALENDAR"]).join("\r\n"); }
function ev(lines) { return ics(["BEGIN:VEVENT"].concat(lines, ["END:VEVENT"])); }
function one(lines) { var r = buildIcsRows(ev(lines)); return r.rows[0] || {}; }

/* ---------- Разбор: что календари пишут на самом деле ---------- */

// Google с обычным напоминанием: поля события не должен трогать никто
var r1 = one(["DTSTART:20260902T100000Z", "DTEND:20260902T140000Z", "SUMMARY:Свадьба Ани и Пети",
  "DESCRIPTION:Загс в 12\\, потом прогулка", "LOCATION:Москва\\, Тверская 1", "UID:g-1",
  "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:This is an event reminder", "TRIGGER:-PT30M", "END:VALARM"]);
chk("VALARM: название", r1.summary, "Свадьба Ани и Пети");
chk("VALARM: заметка", r1.notes, "Загс в 12, потом прогулка");
chk("VALARM: жанр", r1.type, "wedding");

// Apple с почтовым напоминанием: у будильника есть и своё название
var r2 = one(["DTSTART:20260915T090000", "DTEND:20260915T130000", "SUMMARY:Свадьба Кати", "UID:a-1",
  "BEGIN:VALARM", "ACTION:EMAIL", "SUMMARY:Alarm notification", "DESCRIPTION:Событие через 30 минут",
  "TRIGGER:-PT30M", "END:VALARM"]);
chk("VALARM почтовый: название", r2.summary, "Свадьба Кати");

// Exchange: зона в кавычках, внутри двоеточие
var r3 = one(['DTSTART;TZID="(GMT+03:00) Москва":20260903T120000',
  'DTEND;TZID="(GMT+03:00) Москва":20260903T150000', "SUMMARY:Фотосъёмка каталога", "UID:o-1"]);
chk("TZID в кавычках: начало", r3.min, 12 * 60);
chk("TZID в кавычках: длина", r3.dur, 180);

// Экспортёр без кавычек — дата всё равно последняя
var r4 = one(["DTSTART;TZID=(GMT+03:00) Москва:20260903T120000", "SUMMARY:Фотосессия у моря", "UID:o-2"]);
chk("TZID без кавычек", r4.min, 12 * 60);

// DURATION вместо DTEND
chk("DURATION", one(["DTSTART:20260904T090000", "DURATION:PT4H", "SUMMARY:Репортаж с конференции", "UID:d-1"]).dur, 240);
chk("DURATION с днями", one(["DTSTART:20260904T090000", "DURATION:P1DT2H", "SUMMARY:Репортаж с форума", "UID:d-2"]).dur, 1560);

// Многодневное не режется сутками
chk("Три дня", one(["DTSTART:20260906T140000", "DTEND:20260908T180000", "SUMMARY:Свадьба в Сочи", "UID:m-1"]).dur, 2 * 1440 + 240);

// Весь день: время подставное, но подпись о нём говорит
var r5 = one(["DTSTART;VALUE=DATE:20260907", "DTEND;VALUE=DATE:20260908", "SUMMARY:Фотосессия семейная", "UID:w-1"]);
chk("Весь день: признак", r5.allDay, true);
chk("Весь день: подпись", icsTimeLabel(r5).indexOf("day.allDay") > -1, true);
chk("Весь день: подпись со временем", icsTimeLabel(r5).indexOf("10:00–12:00") > -1, true);
chk("Три дня: подпись", icsTimeLabel(one(["DTSTART:20260906T140000", "DTEND:20260908T180000",
  "SUMMARY:Свадьба в Сочи", "UID:m-2"])).indexOf("when.inDays") > -1, true);

// Отменённое в календаре уже не стоит
chk("CANCELLED", buildIcsRows(ev(["DTSTART:20260909T100000", "SUMMARY:Свадьба Ивановых",
  "STATUS:CANCELLED", "UID:c-1"])).rows.length, 0);

// Склейка длинных строк — пробелом и табом
var r6 = one(["DTSTART:20260911T100000", "SUMMARY:Съёмка длинное название кото", "\tрое перенесено",
  "DESCRIPTION:часть один", " часть два", "UID:f-1"]);
chk("Folding: название", r6.summary, "Съёмка длинное название которое перенесено");
chk("Folding: заметка", r6.notes, "часть одинчасть два");

// Перевод строк без \r
chk("Только LF", buildIcsRows("BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20260912T100000\nSUMMARY:Лавстори у моря\nUID:n-1\nEND:VEVENT\nEND:VCALENDAR").rows.length, 1);

/* ---------- Дедупликация ---------- */

var two = ics(["BEGIN:VEVENT", "DTSTART:20260905T100000", "SUMMARY:Портретная съёмка", "UID:rr-1", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART:20260912T100000", "RECURRENCE-ID:20260912T100000", "SUMMARY:Портретная съёмка",
  "UID:rr-1", "END:VEVENT"]);
chk("Повтор с правкой — две записи", buildIcsRows(two).rows.length, 2);
var same = ics(["BEGIN:VEVENT", "DTSTART:20260905T100000", "SUMMARY:Портретная съёмка", "UID:x-9", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART:20260905T100000", "SUMMARY:Портретная съёмка", "UID:x-9", "END:VEVENT"]);
chk("Один ключ дважды в файле", buildIcsRows(same).rows.length, 1);
chk("Один ключ дважды — счёт дублей", buildIcsRows(same).dup, 1);
sessions = [{ icsSig: "u:g-1" }];
chk("Уже ввезённое", buildIcsRows(ev(["DTSTART:20260902T100000Z", "SUMMARY:Свадьба Ани", "UID:g-1"])).dup, 1);
sessions = [];

/* ---------- Раскладка по вёдрам ----------
   Съёмочное само отмечается, бытовое не должно попасть в список вовсе, а
   спорное ждёт решения фотографа. Второй столбец — ожидаемое ведро и жанр */
var CASES = {
  ru: [
    ["Свадьба Ани и Пети", "match wedding"],
    ["Свадебный портрет Ани", "match wedding"],
    ["Фотосъёмка каталога обуви", "maybe portrait"],
    ["Предметка для магазина", "match product"],
    ["ДР Маши, снимаю", "match party"],
    ["Лавстори на закате", "match lovestory"],
    ["Стоматолог", "нет"],
    ["Забрать права", "нет"],
    ["Встреча с друзьями", "нет"],
    ["Ужин у мамы", "нет"],
    ["Праздник в школе", "match party"],
    ["Отвезти машину на ТО", "нет"]
  ],
  en: [
    ["Dentist appointment · 221B Baker Street", "maybe street"],
    ["Family dinner at mum's", "maybe family"],
    ["Team meeting · Product review room", "maybe product"],
    ["Yoga class · Architecture museum", "maybe architecture"],
    ["Call with bank · Advertising budget", "maybe ad"],
    ["Photoshoot for the shop", "maybe portrait"],
    ["Wedding of Anna and Pete", "нет"],
    ["Road trip", "нет"]
  ]
};
Object.keys(CASES).forEach(function (code) {
  lang = code;
  CASES[code].forEach(function (c) {
    var cls = icsClassify(c[0]);
    chk(code + ": " + c[0], cls ? cls.bucket + " " + cls.type : "нет", c[1]);
  });
});
lang = "ru";
/* Выключенный жанр сам не отмечается: галочка спорила бы с настройкой */
genresOn.wedding = 0;
chk("Выключенный жанр", icsClassify("Свадьба Ани").bucket, "maybe");
genresOn.wedding = 1;

console.log((bad ? bad + " расхождений из " : "Сверено ") + checked + " проверок"
  + (bad ? "" : " — разбор совпал с ожидаемым."));
process.exit(bad ? 1 : 0);

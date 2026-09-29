/* Знак точки по 40 словам (итерация 27, шаг 1): что отвечает бета и какое
   правило решило. Для таблицы в docs/card_reference.md и как эталон теста
   натива «подбор знака по 40 словам».
     node tools/pointwords_check.js          — таблица по beta/icons.js
     node tools/pointwords_check.js --plain  — строки «название | знак | правила»
   Берёт настоящие правила беты (`ICONS.pointWords`), а не копию: разошлись
   правила — разошёлся и вывод. Проверка самого словаря — `tools/pointcheck.js`. */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var box = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "beta", "icons.js"), "utf8"), { window: box });
var I = box.ICONS, W = I.pointWords;

var WORDS = ["Сборы невесты", "Мехенди", "ЗАГС", "Венчание", "Выездная церемония", "Первый взгляд",
  "Рассвет у реки", "Закат на мосту", "Золотой час", "Золотой мост", "Светлана", "Свет в окне", "Банкет",
  "Бар-мицва", "Подарки гостям", "Усадьба", "Сад усадьбы", "Кот", "Катерина", "Прогулка",
  "Прогулка у водопада", "Съёмка на крыше", "Фотосессия", "Пара", "Автобус гостей", "Уборка площадки",
  "Тост", "Торт со свечами", "Первый танец", "Смотровая площадка", "Дворцовая площадь", "Djemaa el-Fna",
  "Парковка", "Сад", "Портреты", "Шикарный вид", "Boat trip", "Волейбол на пляже", "Никях", "Тадж-Махал"];
var PAIRS = [["Фотосессия", "Gardens by the Bay"], ["Церемония", "пляж"], ["Прогулка", "гора"],
  ["Съёмка", "Уюни"], ["Портреты", "Тадж-Махал"], ["Прогулка", "Кинтамани"]];
var DAY12 = ["Сборы невесты", "Сборы жениха", "Первый взгляд", "ЗАГС", "Прогулка", "Венчание", "Фуршет",
  "Банкет", "Первый танец", "Торт", "Закат", "Салют"];

function fold(s) { return String(s || "").normalize("NFD").replace(/([A-Za-z])[̀-ͯ]+/g, "$1").normalize("NFC"); }
function hits(text) {
  var t = fold(text), out = [];
  for (var i = 0; i < W.length; i++) if (W[i][0].test(t)) out.push((i + 1) + ":" + W[i][1] + "/T" + W[i][2]);
  return out;
}

var plain = process.argv.indexOf("--plain") >= 0;
console.log("правил " + W.length);
if (plain) {
  WORDS.forEach(function (w) { console.log(w + " | " + I.pointSign(w, "") + " | " + hits(w).join(" ")); });
} else {
  console.log("| # | название | знак | первым (№:знак/ярус) | проиграли по порядку |");
  console.log("|---|---|---|---|---|");
  WORDS.forEach(function (w, i) {
    var h = hits(w);
    console.log("| " + (i + 1) + " | " + w + " | `" + I.pointSign(w, "") + "` | " + (h[0] || "— (никто)") + " | " + h.slice(1, 3).join(" ") + " |");
  });
  console.log("");
  console.log("| название | место | знак |");
  console.log("|---|---|---|");
  PAIRS.forEach(function (p) { console.log("| " + p[0] + " | " + p[1] + " | `" + I.pointSign(p[0], p[1]) + "` |"); });
  console.log("");
  console.log("день из 12 точек: " + DAY12.map(function (w) { return w + " `" + I.pointSign(w, "") + "`"; }).join(" · "));
}

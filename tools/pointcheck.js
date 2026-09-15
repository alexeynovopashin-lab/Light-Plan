/* Проверка словаря точек маршрута: название [+ место] → знак.
     node tools/pointcheck.js                  — прогон по beta/icons.js
     node tools/pointcheck.js старый/icons.js  — и сверка со старой библиотекой:
       git show origin/main:beta/icons.js > /tmp/icons_old.js
   Ожидаемый знак — тот, что должен стоять, когда нарисовано всё. Поэтому
   считается дважды: что понял словарь (`all`) и что стоит на экране сейчас.
   «Ждёт рисунка» — словарь прав, а знака ещё нет, и экран показывает
   запасной. Место: "" — нет, "@studio" — ячейка ссылается на студию,
   "@studio:текст" — ссылка и строка. */
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var ROOT = path.join(__dirname, "..") + path.sep;

function load(file) {
  var box = {};
  vm.runInNewContext(fs.readFileSync(file, "utf8"), { window: box });
  return box.ICONS;
}

var CASES = [
  /* ---- То, что словарь умел до ярусов: сверка на регресс ---- */
  ["Сборы невесты", "", "rings"], ["Сборы жениха", "", "rings"], ["Getting ready", "", "rings"],
  ["Утро невесты", "", "rings"], ["Макияж невесты", "", "rings"], ["Визажист", "", "makeup"],
  ["Причёска", "", "hair"], ["Hair and makeup", "", "hair"],
  ["ЗАГС", "", "hall"], ["Роспись", "", "hall"], ["Выкуп", "", "hall"], ["Registry office", "", "hall"],
  ["Дворец бракосочетания", "", "hall"],
  ["Венчание", "", "church"], ["Храм", "", "church"], ["Исаакиевский собор", "", "church"],
  ["Church", "", "church"], ["Cathedral", "", "church"],
  ["Костёл", "", "chapel"], ["Кирха", "", "chapel"], ["Chapel", "", "chapel"],
  ["Мечеть", "", "mosque"], ["Никах", "", "mosque"], ["Никях", "", "mosque"], ["Nikah", "", "mosque"],
  ["Никах в зале", "", "mosque"],
  ["Прогулка", "", "park"], ["Парк", "", "park"], ["Сквер", "", "park"], ["Сад", "", "park"],
  ["Park", "", "park"], ["Garden", "", "park"], ["Лагерный сад", "", "park"],
  ["Фотосессия", "", "camera"], ["Съёмка", "", "camera"], ["Локация", "", "camera"],
  ["Портреты", "", "camera"], ["Photoshoot", "", "camera"], ["Portraits", "", "camera"],
  ["Уборка площадки", "", "broom"],
  ["Город", "", "city"], ["Центр", "", "city"], ["Downtown", "", "city"], ["Экспоцентр", "", "city"],
  ["Тост", "", "toast"], ["Шампанское", "", "toast"], ["Фуршет", "", "toast"], ["Поздравления", "", "toast"],
  ["Первый взгляд", "", "couple"], ["Молодожёны", "", "couple"], ["Пара", "", "couple"], ["Couple", "", "couple"],
  ["Автобус гостей", "", "bus"], ["Shuttle", "", "bus"],
  ["Гости", "", "guests"], ["Свидетели", "", "guests"], ["Bridal party", "", "guests"],
  ["Выездная церемония", "", "arch"], ["Арка", "", "arch"], ["Церемония", "", "arch"], ["Altar", "", "arch"],
  ["Диджей", "", "dj"], ["DJ", "", "dj"], ["Живая музыка", "", "music"], ["Живой звук", "", "guitar"], ["Band", "", "guitar"],
  ["Ведущий", "", "mic"], ["MC", "", "mic"], ["Танцпол", "", "music"],
  ["Альбом", "", "album"], ["Печать альбома в типографии", "", "album"],
  ["Улица", "", "street"], ["Проспект", "", "street"], ["Street", "", "street"],
  ["Велопрогулка", "", "bike"], ["Лавочка", "", "lamp_bench"], ["Фонари", "", "lamp_bench"],
  ["Студия", "", "studio"], ["Studio", "", "studio"],
  ["Банкет", "", "feast"], ["Ресторан", "", "feast"], ["Ужин", "", "feast"], ["Dinner", "", "feast"],
  ["Именинный торт", "", "cake_bd"], ["Торт", "", "cake"], ["Танцы и торт", "", "cake"],
  ["Первый танец", "", "dance"], ["Букет", "", "bouquet"], ["Flowers", "", "bouquet"],
  ["Салют", "", "fireworks"], ["Рассвет у реки", "", "sunrise"], ["Закат на мосту", "", "sunset"],
  ["Золотой час", "", "golden"], ["Солнце", "", "sun"],
  ["Трансфер", "", "car"], ["Переезд", "", "car"], ["Transfer", "", "car"],
  ["Подарки", "", "gift"], ["Ёлка", "", "tree"], ["Воздушный шар", "", "balloon_air"],
  ["Hot air balloon", "", "balloon_air"], ["День рождения", "", "balloons"], ["Корпоратив", "", "bunting"],
  ["Футбол", "", "ball"], ["Забег", "", "runner"], ["Олимпиада", "", "olympics"], ["Турнир", "", "flag_finish"],
  ["Переговоры", "", "briefcase"], ["Беременность", "", "pregnant"], ["Выписка", "", "baby"],
  ["Крестины", "", "baby"], ["Выступление", "", "speaker"], ["Форум", "", "forum"],
  ["Наладка станка", "", "gears"], ["Завод", "", "factory"],
  ["Яхта", "", "yacht"], ["Катер", "", "yacht"], ["Прогулка на теплоходе", "", "yacht"], ["Boat trip", "", "boat"],
  ["Порт", "", "anchor"], ["Причал", "", "anchor"], ["Marina", "", "anchor"], ["Pier", "", "anchor"],
  ["Снеговик", "", "snowman"], ["Снегопад", "", "snow"], ["Каток", "", "snowflake"], ["Снег", "", "snowflake"],
  ["Мороз", "", "snowflake"], ["Балет", "", "ballet"], ["Лыжи", "", "ski"], ["Конная прогулка", "", "horse"],
  ["Кот", "", "cat"], ["Собака", "", "dog"], ["Питомцы", "", "paw"], ["Бассейн", "", "swimmer"],
  ["Завтрак", "", "croissant"], ["Рюкзак", "", "backpack"], ["Подписание договора", "", "stamp"],
  ["Дети", "", "child"], ["Сутки", "", "sun_moon"], ["Волейбол на пляже", "", "volleyball"],
  ["Баскетбол", "", "basketball"], ["Клубника", "", "strawberry"], ["Кортеж", "", "cars"],
  ["Индейка", "", "turkey"], ["Кейтеринг", "", "chef"], ["Перерыв", "", "clock_quarter"],
  ["Офис", "", "office_car"], ["Паром", "", "ship"], ["Жара", "", "thermometer"],
  ["Будильник", "", "alarm"], ["Поход", "", "hiker"], ["Выпускной", "", "graduation"],
  ["Школа", "", "school"], ["Годовщина", "", "wedding_day"], ["Коляска", "", "stroller"],
  ["Бабушки и дедушки", "", "generations"], ["Пеленание", "", "infant"], ["Второй фотограф", "", "partner"],

  /* ---- Ловушки: корень внутри чужого слова ---- */
  ["Встреча с Мариной", "", "dot"], ["Прогулка с Катериной", "", "park"], ["Встреча со Светланой", "", "dot"],
  ["Сборы у Светланы", "", "rings"], ["Шикарный вид", "", "dot"],
  ["Вручение подарков", "", "gift"], ["Усадьба", "", "manor"], ["Посадка на катер", "", "yacht"],
  ["Садимся в машину", "", "car"], ["Парковка", "", "cars"], ["Парковка у ЗАГСа", "", "hall"],
  ["Смотровая площадка", "", "viewpoint"], ["Площадка для церемонии", "", "arch"],
  ["Детская площадка", "", "child"], ["Детский сад", "", "child"], ["Вертолётная площадка", "", "helicopter"],
  ["Бизнес-центр", "", "office_car"], ["Торговый центр", "", "city"],
  ["Портретная съёмка в порту", "", "anchor"], ["Аэропорт", "", "plane"], ["Спорт", "", "flag_finish"],
  ["Замок на мосту", "", "bridge"], ["Замок Нойшванштайн", "", "castle"],
  ["Двор-колодец", "", "courtyard"], ["Дворец", "", "castle"], ["Дворцовая площадь", "", "plaza"],
  ["Букет тюльпанов", "", "bouquet"], ["Тюльпановое поле", "", "field"],
  ["Съёмка в парадной", "", "camera"], ["Терраса ресторана", "", "feast"],
  ["Огород", "", "dot"], ["Колесо обозрения", "", "dot"], ["Полёт на шаре", "", "dot"],
  ["Полет на воздушном шаре", "", "balloon_air"], ["Реклама", "", "dot"], ["Лесенка", "", "dot"],
  ["Новособорная площадь", "", "plaza"], ["Золотой мост", "", "bridge"], ["Бар-мицва", "", "dot"],
  ["Djemaa el-Fna", "", "plaza"], ["Зоопарк", "", "paw"], ["Каскад фонтанов", "", "dot"],
  ["Пара в студии", "", "studio"],

  /* ---- Сценарии: разные свадьбы ---- */
  ["Прогулка у водопада", "", "waterfall"], ["Прогулка на яхте по реке", "", "yacht"],
  ["Катание на слонах", "", "elephant"], ["Elephant ride", "", "elephant"],
  ["Пляжная церемония", "", "arch"], ["Церемония в отеле", "", "arch"], ["Церемония на пляже, Гавайи", "", "arch"],
  ["Beach ceremony Maui", "", "arch"], ["Чайная церемония", "", "arch"], ["Tea ceremony", "", "arch"],
  ["Хупа", "", "arch"], ["Chuppah", "", "arch"], ["Мандап", "", "arch"], ["Saat phere", "", "arch"],
  ["Ктуба", "", "stamp"], ["Ketubah signing", "", "stamp"],
  ["Мехенди", "", "mehendi"], ["Mehndi night", "", "mehendi"], ["Роспись хной", "", "mehendi"],
  ["Сангит", "", "dance"], ["Sangeet", "", "dance"],
  ["Барат", "", "horse"], ["Baraat", "", "horse"], ["Барат на слоне", "", "elephant"],
  ["Валима", "", "feast"], ["Выкуп невесты", "", "hall"], ["Door games", "", "hall"], ["接亲", "", "hall"],
  ["婚宴", "", "feast"], ["婚纱照", "", "camera"], ["Pre-wedding", "", "camera"],
  ["Смена образа", "", "hanger"], ["Costume change", "", "hanger"], ["Студия с декорациями", "", "backdrop"],
  ["Фотосессия на Карловом мосту", "", "bridge"], ["Съёмка на крыше небоскрёба", "", "rooftop"],
  ["Rooftop, Manhattan", "", "rooftop"], ["Руфтоп Москва-Сити", "", "rooftop"],
  ["Rustic barn wedding", "", "barn"], ["Свадьба в деревенском стиле", "", "barn"], ["Амбар в Техасе", "", "barn"],
  ["Ранчо", "", "horse"], ["Лобби отеля", "", "hotel"], ["Сборы в номере отеля", "", "rings"],
  ["Ресторан на крыше", "", "feast"], ["Pre-wedding в ханоке", "", "hanok"],

  /* ---- Каталог мест: типы и слова носителей ---- */
  ["Набережная", "", "waterfront"], ["Крымская наб.", "", "waterfront"], ["Promenade des Anglais", "", "waterfront"],
  ["Corniche Abu Dhabi", "", "waterfront"], ["Malecón", "", "waterfront"], ["Lungomare", "", "waterfront"],
  ["Uferpromenade", "", "waterfront"], ["The Bund", "", "waterfront"], ["外滩", "", "waterfront"],
  ["Мост", "", "bridge"], ["Ponte Vecchio", "", "bridge"], ["Golden Gate", "", "bridge"], ["Puente", "", "bridge"],
  ["Brücke", "", "bridge"], ["Köprü", "", "bridge"], ["Каналы Амстердама", "", "bridge"],
  ["Santa Monica Pier", "", "anchor"], ["Пирс", "", "anchor"], ["Boardwalk", "", "anchor"],
  ["Dubai Marina", "", "anchor"], ["Port Hercule", "", "anchor"], ["Яхт-клуб", "", "anchor"], ["Марина Бэй", "", "anchor"],
  ["Пляж", "", "beach"], ["Beach", "", "beach"], ["Playa del Carmen", "", "beach"], ["Spiaggia", "", "beach"],
  ["Praia", "", "beach"], ["海滩", "", "beach"], ["شاطئ", "", "beach"], ["Нгапали", "", "beach"],
  ["У моря", "", "beach"], ["Балтика в дюнах", "", "beach"],
  ["Гондола", "", "boat"], ["Шикара на Дал-Лейк", "", "boat"], ["Dhow cruise", "", "boat"], ["Лодка", "", "boat"],
  ["Озеро", "", "lake"], ["У реки", "", "lake"], ["Lake Como", "", "lake"], ["Кавагутико с Фудзи", "", "lake"],
  ["Водопад", "", "waterfall"], ["Skógafoss", "", "waterfall"], ["Скоугафосс", "", "waterfall"],
  ["Cascada", "", "waterfall"], ["瀑布", "", "waterfall"], ["شلال", "", "waterfall"],
  ["Соляная равнина", "", "salt_flat"], ["Уюни", "", "salt_flat"], ["Salinas Grandes", "", "salt_flat"],
  ["Центральный парк", "", "park"], ["Люксембургский сад", "", "park"], ["公园", "", "park"], ["Jardin", "", "park"],
  ["Уэно", "", "park"],
  ["Ботанический сад", "", "glasshouse"], ["Оранжерея", "", "glasshouse"], ["Kew Gardens", "", "glasshouse"],
  ["Gardens by the Bay", "", "glasshouse"], ["Аптекарский огород", "", "glasshouse"], ["Зимний сад", "", "glasshouse"],
  ["Лес", "", "forest"], ["Бамбуковая роща Арасияма", "", "forest"], ["Секвойи", "", "forest"],
  ["Сосновый бор", "", "forest"], ["Bosque", "", "forest"], ["森林", "", "forest"], ["Лесная поляна", "", "forest"],
  ["Лавандовое поле", "", "field"], ["Подсолнухи Тосканы", "", "field"], ["Кёкенхоф", "", "field"],
  ["Поле рапса", "", "field"], ["Луг", "", "field"], ["Meadow", "", "field"],
  ["Рисовые террасы Тегалаланг", "", "terraces"], ["Чайная плантация", "", "terraces"], ["Tea estate", "", "terraces"],
  ["Виноградник", "", "vineyard"], ["Винодельня", "", "vineyard"], ["Bodega", "", "vineyard"],
  ["Винный погреб", "", "vineyard"], ["Winery", "", "vineyard"], ["Оливковая роща", "", "olive"],
  ["Горы", "", "mountain"], ["Доломиты", "", "mountain"], ["Cliffs of Moher", "", "mountain"], ["Обрыв", "", "mountain"],
  ["Смотровая на горе", "", "viewpoint"], ["Mirador", "", "viewpoint"], ["展望台", "", "viewpoint"],
  ["Пустыня", "", "desert"], ["Дюны Al Qudra", "", "desert"], ["Бедуинский лагерь", "", "desert"],
  ["Вади-Рам", "", "desert"], ["Сахара", "", "desert"], ["White Sands", "", "desert"],
  ["Ледник", "", "glacier"], ["Йёкюльсаурлоун", "", "glacier"], ["Jökulsárlón", "", "glacier"],
  ["Северное сияние", "", "aurora"], ["Aurora", "", "aurora"], ["Зимний лес", "", "snowflake"],
  ["Старый город", "", "old_town"], ["Медина Марракеша", "", "old_town"], ["Altstadt", "", "old_town"],
  ["Casco antiguo", "", "old_town"], ["Хутуны", "", "old_town"], ["Hutong", "", "old_town"],
  ["Площадь", "", "plaza"], ["Пьяцца Навона", "", "plaza"], ["Piazza", "", "plaza"],
  ["Джемаа-эль-Фна", "", "plaza"], ["广场", "", "plaza"],
  ["Двор", "", "courtyard"], ["Дворы-колодцы", "", "courtyard"], ["Патио", "", "courtyard"],
  ["Риад", "", "courtyard"], ["四合院", "", "courtyard"],
  ["Лестница", "", "stairs"], ["Испанская лестница", "", "stairs"], ["Escadaria Selarón", "", "stairs"],
  ["Потёмкинская лестница", "", "stairs"],
  ["Рынок", "", "market"], ["Гранд-базар", "", "market"], ["Сук Марракеша", "", "market"],
  ["Mercado de San Miguel", "", "market"],
  ["Крыша", "", "rooftop"], ["Руфтоп", "", "rooftop"], ["Azotea", "", "rooftop"], ["Terrazza", "", "rooftop"],
  ["Небоскрёбы", "", "skyline"], ["Москва-Сити", "", "skyline"], ["Манхэттен", "", "skyline"],
  ["Пудун", "", "skyline"], ["La Défense", "", "skyline"], ["Skyline", "", "skyline"], ["Деловой квартал", "", "skyline"],
  ["Лофт", "", "loft"], ["Граффити", "", "loft"], ["Шордич", "", "loft"], ["Новая Голландия", "", "loft"],
  ["Индустриальный квартал", "", "loft"],
  ["Вокзал", "", "station"], ["Метро", "", "station"], ["Grand Central", "", "station"], ["Atocha", "", "station"],
  ["Трамвай", "", "tram"], ["Фуникулёр", "", "tram"],
  ["Университет", "", "campus"], ["Кампус", "", "campus"], ["Лига плюща", "", "campus"],
  ["Музей", "", "museum"], ["Библиотека", "", "museum"], ["Галерея", "", "museum"],
  ["Biblioteca Vasconcelos", "", "museum"], ["Стеделейк", "", "museum"],
  ["Пассаж", "", "arcade"], ["Galleria Vittorio Emanuele", "", "arcade"], ["ГУМ", "", "arcade"],
  ["Театр", "", "theatre"], ["Опера", "", "theatre"], ["Teatro Colón", "", "theatre"], ["Оперный театр Одессы", "", "theatre"],
  ["Особняк", "", "manor"], ["Шато", "", "manor"], ["Château", "", "manor"], ["Вилла", "", "manor"],
  ["Hacienda", "", "manor"], ["Поместье", "", "manor"],
  ["Замок", "", "castle"], ["Крепость", "", "castle"], ["Альгамбра", "", "castle"], ["Топкапы", "", "castle"],
  ["Айт-Бен-Хадду", "", "castle"], ["Kasbah", "", "castle"], ["Кремль", "", "castle"],
  ["Руины", "", "ruins"], ["Амфитеатр", "", "ruins"], ["Эфес", "", "ruins"], ["Джераш", "", "ruins"],
  ["Ангкор-Ват", "", "temple"], ["Фусими Инари", "", "temple"], ["Ват Арун", "", "temple"],
  ["Буддийский храм", "", "temple"], ["Храмы Бали", "", "temple"], ["Храм Христа Спасителя", "", "church"],
  ["Ханок", "", "hanok"], ["Букчон", "", "hanok"], ["Сиракава-го", "", "hanok"],
  ["Мельницы", "", "windmill"], ["Заансе-Сханс", "", "windmill"], ["Kinderdijk", "", "windmill"],
  ["Тадж-Махал", "", "mausoleum"], ["Мавзолей Хумаюна", "", "mausoleum"],
  ["Отель", "", "hotel"], ["Гостиница", "", "hotel"], ["Suite", "", "hotel"],
  ["Бар", "", "feast"], ["Izakaya", "", "feast"],
  ["Хаммам", "", "bathhouse"], ["Онсэн", "", "bathhouse"], ["Рёкан", "", "bathhouse"],
  ["Чайный дом", "", "teahouse"], ["茶室", "", "teahouse"],
  ["Амбар", "", "barn"], ["Ферма", "", "barn"], ["Granero", "", "barn"],
  ["Конюшня", "", "horse"], ["Эстансия", "", "horse"],
  ["Глэмпинг", "", "tent"], ["Кемпинг", "", "tent"], ["Шатёр", "", "tent"],
  ["Ледяной отель", "", "snowflake"], ["Icehotel", "", "snowflake"],
  ["Вертолёт", "", "helicopter"], ["Каппадокия, воздушные шары", "", "balloon_air"],

  /* ---- Города, страны и края знака не дают ---- */
  ["Прага", "", "dot"], ["Дубай", "", "dot"], ["Сингапур", "", "dot"], ["Тоскана", "", "dot"], ["Гавайи", "", "dot"],

  /* ---- Место вторым источником ---- */
  ["Фотосессия", "Gardens by the Bay", "glasshouse"], ["Прогулка", "Карлов мост", "bridge"],
  ["Церемония", "Пляж Ваикики", "arch"], ["Банкет", "Руфтоп Sky Lounge", "feast"],
  ["Съёмка", "@studio", "studio"], ["Пара", "@studio:Томсон, зал Эдисон", "studio"],
  ["Портреты", "Тадж-Махал", "mausoleum"], ["Сборы невесты", "Отель Four Seasons", "rings"],
  ["Фотосессия", "Лагерный сад", "park"], ["Встреча", "Дом с драконами", "dot"],
  ["Точка 3", "", "dot"], ["Прогулка", "Новособорная площадь", "plaza"], ["Пара", "", "couple"]
];

function place(c) {
  var p = c[1] || "";
  if (p.indexOf("@studio") === 0) return { text: p.slice(8), studio: true };
  return { text: p, studio: false };
}

var I = load(ROOT + "beta/icons.js");
var drawn = {};
["points", "ui", "gear", "weather", "signs", "themes", "places"].forEach(function (g) {
  for (var k in (I[g] || {})) drawn[k] = 1;
});
drawn.dot = 1;

var old = process.argv[2] ? load(process.argv[2]) : null;
function oldSign(name) {
  var W = old.pointWords;
  for (var i = 0; i < W.length; i++) if (W[i][0].test(name)) return W[i][1];
  return "dot";
}

var ok = 0, wait = 0, miss = [], waiting = {}, regress = [], changed = [];
CASES.forEach(function (c) {
  var pl = place(c);
  var logic = I.pointSign(c[0], pl.text, pl.studio, true);
  var screen = I.pointSign(c[0], pl.text, pl.studio, false);
  var label = c[0] + (c[1] ? " | " + c[1] : "");
  if (logic !== c[2]) { miss.push(label + " → " + logic + ", ждали " + c[2]); }
  else if (!drawn[c[2]]) { wait++; (waiting[c[2]] = waiting[c[2]] || []).push(c[0]); }
  else ok++;
  if (old) {
    var was = oldSign(c[0]);
    if (was === c[2] && screen !== c[2]) regress.push(label + ": было " + was + ", на экране " + screen);
    else if (was !== screen) changed.push(label + ": " + was + " → " + screen);
  }
});

console.log("случаев " + CASES.length + ": верно " + ok + ", ждут рисунка " + wait + ", промахов " + miss.length);
miss.forEach(function (m) { console.log("  промах  " + m); });
var keys = Object.keys(waiting).sort();
console.log("знаков ждут рисунка: " + keys.length + " — " + keys.join(" "));
if (old) {
  console.log("регрессов (было верно, стало иначе): " + regress.length);
  regress.forEach(function (m) { console.log("  регресс " + m); });
  console.log("экран изменился ещё в " + changed.length + " случаях");
  if (process.argv.indexOf("--changed") >= 0) changed.forEach(function (m) { console.log("  " + m); });
}
process.exitCode = miss.length || regress.length ? 1 : 0;

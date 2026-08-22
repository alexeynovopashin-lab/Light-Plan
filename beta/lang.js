/* Light Plan — словарь строк и согласование.
 *
 * Файл отдельный по той же причине, что и библиотека знаков: словарь удобно
 * править и отдавать переводчику целиком, а index.html и без него 9700 строк.
 * Когда словарь устоится, в прототип уедет его слепок.
 *
 * Ценность здесь не в механизме подстановки — он простой и в Swift не поедет.
 * Ценность в классификации: строки разобраны по смыслу и по местам, где они
 * склеиваются с данными. Это переживёт порт, код — нет.
 *
 * Три правила набора:
 *
 * 1. Ключ называет смысл, а не текст. `unit.shoot`, а не `shoot_word_ru`:
 *    перевод меняет слова, но не смысл, и ключ не должен устаревать.
 *
 * 2. Число согласуется языком, а не строкой. У русского три формы, у
 *    английского две, у испанского две, у японского и китайского форм нет
 *    вовсе — правило живёт в языке, а слова в словаре массивом.
 *
 * 3. Склейка с данными — это шаблон, а не сложение. «В этот день уже есть
 *    „Имя", 13:00 — 21:00» нельзя собрать из кусков: в другом языке порядок
 *    слов другой. Поэтому подстановка идёт по имени: {name}, {from}, {to}.
 *
 * Пять языков: en и ru заполнены, es/ja/zh заведены пустыми словарями с
 * готовыми правилами числа и разделителем счёта — переводчик получает файл,
 * а не задачу. Пропавший ключ падает в английский, а не в сам ключ: пустой
 * словарь должен показывать понятный экран, а не список ключей
 * (см. DECISIONS.md, «Языки»). */
(function (global) {
  "use strict";

  /* Правило множественного числа. Возвращает номер формы, а не слово:
     слово знает словарь, а сколько у языка форм и как их выбирать — язык.
     Русский: 1 стол, 2 стола, 5 столов, при этом 11–14 всегда «столов».
     Английский и испанский: одна форма для 1, другая для всего остального.
     Японский и китайский: числительное не согласуется со словом вовсе —
     одна форма на все числа. */
  var RULES = {
    ru: function (n) {
      var t = n % 100, o = n % 10;
      if (t >= 11 && t <= 14) return 2;
      if (o === 1) return 0;
      if (o >= 2 && o <= 4) return 1;
      return 2;
    },
    en: function (n) { return n === 1 ? 0 : 1; },
    es: function (n) { return n === 1 ? 0 : 1; },
    ja: function () { return 0; },
    zh: function () { return 0; }
  };

  /* Разделитель между числом и словом в count(). У ru/en/es число и слово —
     разные слова, у ja/zh счётное слово прилипает к числу без пробела. */
  var COUNT_SEP = { ru: " ", en: " ", es: " ", ja: "", zh: "" };

  /* Языки-заготовки: правило числа и разделитель есть, словаря нет — заполнит
     переводчик. До этого момента пропавшие ключи падают в английский. */
  var STUB_LANGS = ["es", "ja", "zh"];

  var DICT = {};

  /* ---- Русский ---------------------------------------------------------
     Массив значит формы числа в порядке правила языка; строка значит строку.
     Порядок разделов — по месту в приложении, чтобы переводчик шёл экранами,
     а не алфавитом. */
  DICT.ru = {
    /* Единицы счёта. Ими меряют съёмки и время, и они встречаются всюду */
    "unit.shoot":  ["съёмка", "съёмки", "съёмок"],
    "unit.hour":   ["час", "часа", "часов"],
    "unit.minute": ["мин", "мин", "мин"],
    "unit.day":    ["день", "дня", "дней"],

    /* Длительность. Половина часа названа отдельно: при дробном числительном
       русский всегда требует «часа» — «1,5 часа», а не «1,5 час» */
    "dur.minutes":   "{m} мин",
    "dur.hours":     "{h} {hourWord}",
    "dur.halfHour":  "{h},5 часа",
    "dur.hoursMins": "{h} ч {m} мин",

    /* Жанры. Показываемое имя жанра; ключ логики — код, а не это слово */
    "genre.portrait":     "Портрет",
    "genre.wedding":      "Свадьбы",
    "genre.party":        "Праздник",
    "genre.lovestory":    "Лавстори",
    "genre.family":       "Семья",
    "genre.landscape":    "Пейзаж",
    "genre.architecture": "Архитектура",
    "genre.street":       "Стрит",
    "genre.report":       "Репортаж",
    "genre.product":      "Предметка",
    "genre.ad":           "Реклама",

    /* Пожелания к погоде — форма и список съёмок */
    "wish.any":    "Неважно",
    "wish.clear":  "Ясно",
    "wish.sunset": "Закат",
    "wish.cloudy": "Облачно",
    "wish.fog":    "Туман",
    "wish.rain":   "Осадки",
    "wish.moon":   "Луна",
    "wish.stars":  "Звёзды",

    /* Жанр со счётом — «5 свадеб · 8 портретов» в итогах года */
    "genreN.portrait":     ["портрет", "портрета", "портретов"],
    "genreN.wedding":      ["свадьба", "свадьбы", "свадеб"],
    "genreN.party":        ["праздник", "праздника", "праздников"],
    "genreN.lovestory":    ["лавстори", "лавстори", "лавстори"],
    "genreN.family":       ["семья", "семьи", "семей"],
    "genreN.landscape":    ["пейзаж", "пейзажа", "пейзажей"],
    "genreN.architecture": ["архитектура", "архитектуры", "архитектур"],
    "genreN.street":       ["стрит", "стрита", "стритов"],
    "genreN.report":       ["репортаж", "репортажа", "репортажей"],
    "genreN.product":      ["предметка", "предметки", "предметок"],
    "genreN.ad":           ["реклама", "рекламы", "реклам"]
  };

  /* ---- Английский --------------------------------------------------------
     Запасной язык для всех пустых словарей — держим его полным всегда. */
  DICT.en = {
    "unit.shoot":  ["shoot", "shoots"],
    "unit.hour":   ["hour", "hours"],
    "unit.minute": ["min", "min"],
    "unit.day":    ["day", "days"],

    "dur.minutes":   "{m} min",
    "dur.hours":     "{h} {hourWord}",
    "dur.halfHour":  "{h}.5 hours",
    "dur.hoursMins": "{h}h {m}m",

    "genre.portrait":     "Portrait",
    "genre.wedding":      "Weddings",
    "genre.party":        "Party",
    "genre.lovestory":    "Love story",
    "genre.family":       "Family",
    "genre.landscape":    "Landscape",
    "genre.architecture": "Architecture",
    "genre.street":       "Street",
    "genre.report":       "Reportage",
    "genre.product":      "Product",
    "genre.ad":           "Advertising",

    "wish.any":    "Any",
    "wish.clear":  "Clear",
    "wish.sunset": "Sunset",
    "wish.cloudy": "Cloudy",
    "wish.fog":    "Fog",
    "wish.rain":   "Rain",
    "wish.moon":   "Moon",
    "wish.stars":  "Stars",

    "genreN.portrait":     ["portrait", "portraits"],
    "genreN.wedding":      ["wedding", "weddings"],
    "genreN.party":        ["party", "parties"],
    "genreN.lovestory":    ["love story", "love stories"],
    "genreN.family":       ["family", "families"],
    "genreN.landscape":    ["landscape", "landscapes"],
    "genreN.architecture": ["architecture shoot", "architecture shoots"],
    "genreN.street":       ["street shoot", "street shoots"],
    "genreN.report":       ["reportage", "reportages"],
    "genreN.product":      ["product shoot", "product shoots"],
    "genreN.ad":           ["ad shoot", "ad shoots"]
  };

  /* ---- Испанский, японский, китайский -------------------------------------
     Пустые: правило числа и разделитель счёта уже верны для языка, слов нет.
     `t`/`word` подставят английский, пока переводчик не заполнит словарь. */
  DICT.es = {};
  DICT.ja = {};
  DICT.zh = {};

  var STORE_KEY = "lp_lang";

  /* Пока в настройках нет переключателя языка (веха 1), почти весь экран
     остаётся зашитым русским текстом вне словаря. Автовыбор по языку
     браузера здесь дал бы смешанный экран — часть по-английски, часть
     по-русски — для фотографов, которыми приложение уже пользуется.
     Поэтому без явного выбора в `localStorage` язык всегда «ru»;
     автоопределение по `navigator.language` включится вместе с экраном
     настроек, где его можно будет тут же поправить. */
  function detectLang() {
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (saved && DICT[saved]) return saved;
    } catch (e) {}
    return "ru";
  }

  var lang = detectLang();

  function applyDocLang() {
    try {
      if (global.document && global.document.documentElement) {
        global.document.documentElement.lang = lang;
      }
    } catch (e) {}
  }
  applyDocLang();

  /* Формы ключа с запасным языком: текущий язык → английский → ничего.
     Пустой словарь (es/ja/zh до перевода) не должен показывать список
     ключей на экране — честнее показать английский, чем мусор.

     Возвращает и язык, который слово дал. Это не мелочь: правило числа и
     пробел перед словом принадлежат языку слова, а не языку экрана. Иначе
     японские правила применяются к английскому слову и «3 shoots»
     превращается в «3shoot» — форма единственного числа, слипшаяся с
     числом. Первый же второй язык это и вскрыл. */
  function sourceOf(key) {
    var d = DICT[lang];
    if (d && d[key] != null) return { v: d[key], lang: lang };
    if (DICT.en[key] != null) return { v: DICT.en[key], lang: "en" };
    return { v: null, lang: lang };
  }
  function forms(key) { return sourceOf(key).v; }

  /* Строка по ключу. Подстановка по имени, а не по порядку: в другом языке
     порядок слов другой, и «{from} — {to}» может встать как угодно.
     Ключа нет нигде, даже в английском, — возвращаем сам ключ: пропажа
     должна быть видна на экране, а не молча превращаться в пустоту. */
  function t(key, vars) {
    var s = forms(key);
    if (s == null) return key;
    if (Array.isArray(s)) s = s[0];
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, function (m, name) {
      return vars[name] != null ? vars[name] : m;
    });
  }

  /* Слово, согласованное с числом. Само число не подставляет: где-то оно
     стоит перед словом, где-то внутри фразы, а где-то набрано другим шрифтом.
     Согласуется по языку слова: у английского запасного слова английские
     формы, даже когда на экране японский */
  function word(key, n) {
    var src = sourceOf(key);
    if (!Array.isArray(src.v)) return t(key);
    var rule = RULES[src.lang] || RULES.en;
    var f = src.v;
    return f[rule(n)] != null ? f[rule(n)] : f[f.length - 1];
  }

  /* Число со словом — самый частый случай: «3 съёмки», «12 часов», «12件».
     Пробел тоже принадлежит языку слова: японское счётное слово прилипает
     к числу, английское — нет, и запасное английское слово остаётся
     английским даже на японском экране */
  function count(key, n) {
    var src = sourceOf(key);
    var from = src.v != null ? src.lang : lang;
    var sep = COUNT_SEP[from] != null ? COUNT_SEP[from] : " ";
    return n + sep + word(key, n);
  }

  /* Номер формы для числа по правилу языка экрана. */
  function index(n) { return (RULES[lang] || RULES.en)(n); }

  /* То же, но по правилу названного языка. Нужен мосту `plural` в index.html:
     там формы ещё набраны русскими словами прямо на месте, и согласовывать
     их надо русским правилом, каким бы ни был язык экрана — иначе на
     английском экране русское слово встаёт в форму по английскому правилу
     («5 съёмки» вместо «5 съёмок»). Мост тает волнами, по мере переезда
     строк в словарь; вместе с последней строкой уйдёт и он. */
  function indexIn(code, n) { return (RULES[code] || RULES.en)(n); }

  global.LANG = {
    t: t,
    word: word,
    count: count,
    index: index,
    indexIn: indexIn,
    get code() { return lang; },
    /* Смена языка возвращает false, если правил нет вовсе: молча остаться на
       прежнем честнее, чем сломать согласование числа. Пустой словарь (es/
       ja/zh) переключить можно — экран уедет в английский по ключам. */
    set: function (code) {
      if (!RULES[code]) return false;
      lang = code;
      try { localStorage.setItem(STORE_KEY, code); } catch (e) {}
      applyDocLang();
      return true;
    },
    /* Есть ли у языка заполненный словарь (а не только правило числа) —
       для экрана настроек: язык без перевода честнее не предлагать совсем,
       либо показывать пометкой "скоро". */
    has: function (code) { return !!(DICT[code] && Object.keys(DICT[code]).length); },
    /* Доступен ли язык вообще — правило числа заведено, словарь может быть
       пуст и упадёт в английский */
    known: function (code) { return !!RULES[code]; },
    stub: STUB_LANGS,
    /* Словарь наружу — для проверок и будущего экрана языка */
    dict: DICT
  };
})(this);

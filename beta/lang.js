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

    /* ---- Экран «Сегодня» ----
       Состояния света. Ключ — код состояния, а не слово: состояние выбирает
       высота солнца, и от языка она не зависит. У каждого четыре подписи:
       `label` — имя на куполе, `sense` — что со светом происходит,
       `light` — каков свет в строке телеметрии, `rec` — оценка одним словом */
    "sun.noon.label":  "Полдень",
    "sun.noon.sense":  "солнце в зените — свет жёсткий",
    "sun.noon.light":  "Жёсткий и яркий",
    "sun.noon.rec":    "Жёсткий свет",

    "sun.morning.label":  "Утро",
    "sun.morning.sense":  "свет прохладный, контраст растёт",
    "sun.morning.light":  "Прохладный, довольно жёсткий",
    "sun.morning.rec":    "Ровный свет",

    "sun.day.label":  "День",
    "sun.day.sense":  "свет ещё жёсткий",
    "sun.day.light":  "Довольно жёсткий",
    "sun.day.rec":    "Ровный свет",

    "sun.morningWarm.label":  "Утро",
    "sun.morningWarm.sense":  "свет теплеет, тени растут",
    "sun.morningWarm.light":  "Тёплый, мягчает",
    "sun.morningWarm.rec":    "Мягкий свет",

    "sun.evening.label":  "Вечереет",
    "sun.evening.sense":  "свет теплеет, тени растут",
    "sun.evening.light":  "Тёплый, мягчает",
    "sun.evening.rec":    "Мягкий свет",

    "sun.golden.label":  "Золотой час",
    "sun.golden.sense":  "тёплый мягкий свет, длинные тени",
    "sun.golden.light":  "Тёплый и мягкий",
    "sun.golden.rec":    "Отличный свет",

    "sun.dawn.label":  "Рассвет",
    "sun.dawn.sense":  "небо алеет у горизонта",
    "sun.dawn.light":  "Алый, уходит быстро",
    "sun.dawn.rec":    "Отличный свет",

    "sun.sunset.label":  "Закат",
    "sun.sunset.sense":  "небо алеет у горизонта",
    "sun.sunset.light":  "Алый, уходит быстро",
    "sun.sunset.rec":    "Отличный свет",

    "sun.dawning.label":  "Светает",
    "sun.dawning.sense":  "небо теплеет розовым",
    "sun.dawning.light":  "Мягкий, розовый",
    "sun.dawning.rec":    "Мягкий свет",

    "sun.dusk.label":  "Сумерки",
    "sun.dusk.sense":  "закат догорает розовым",
    "sun.dusk.light":  "Мягкий, розовый",
    "sun.dusk.rec":    "Мягкий свет",

    "sun.blue.label":  "Синий час",
    "sun.blue.sense":  "глубокое синее небо",
    "sun.blue.light":  "Синий и ровный",
    "sun.blue.rec":    "Отличный свет",

    "sun.deepDusk.label":  "Глубокие сумерки",
    "sun.deepDusk.sense":  "света мало, небо ещё светлое",
    "sun.deepDusk.light":  "Очень слабый",
    "sun.deepDusk.rec":    "Слабый свет",

    "sun.astroDawn.label":  "Астрономические сумерки",
    "sun.astroDawn.sense":  "звёзды гаснут, скоро рассвет",
    "sun.astroDawn.light":  "Темно, видны яркие звёзды",
    "sun.astroDawn.rec":    "Звёздное небо",

    "sun.astroDusk.label":  "Астрономические сумерки",
    "sun.astroDusk.sense":  "проступают яркие звёзды",
    "sun.astroDusk.light":  "Темно, видны яркие звёзды",
    "sun.astroDusk.rec":    "Звёздное небо",

    "sun.astroNight.label":  "Астрономическая ночь",
    "sun.astroNight.sense":  "небо полностью тёмное",
    "sun.astroNight.light":  "Темно, звёздное небо",
    "sun.astroNight.rec":    "Звёздная ночь",

    /* Небо закрыто — погода перебивает свет, и оценка падает в самый низ */
    "sun.overcast.rec": "Небо закрыто",

    /* Тени: длина по высоте солнца */
    "shadow.none":      "Теней нет",
    "shadow.veryShort": "Очень короткие",
    "shadow.short":     "Короткие",
    "shadow.long":      "Длинные",
    "shadow.veryLong":  "Очень длинные",

    /* Ближайшее световое событие — подпись над обратным отсчётом */
    "next.polarDay":   "Полярный день",
    "next.polarNight": "Полярная ночь",
    "next.toDawn":     "До рассвета",
    "next.goldenLeft": "Золотой час, ещё",
    "next.toGolden":   "До золотого часа",
    "next.toSunset":   "До заката",
    "next.blueLeft":   "Синий час, ещё",

    /* Погода дня. Ключ — код качества, слова к нему: вердикт, причина,
       небо в телеметрии и короткое имя условий в шапке */
    "qual.excellent": "Отличный день",
    "qual.fog":       "Туманный рассвет",
    "qual.good":      "Хороший день",
    "qual.plain":     "Обычный день",
    "qual.poor":      "Пасмурно",

    "qualWhy.excellent": "Чистое небо, золотой закат",
    "qualWhy.fog":       "Туман на рассвете",
    "qualWhy.good":      "Переменная облачность",
    "qualWhy.plain":     "Ничего примечательного",
    "qualWhy.poor":      "Плотная облачность, дождь",

    "qualSky.excellent": "Ясно",
    "qualSky.fog":       "Туман утром",
    "qualSky.good":      "Облачно с прояснениями",
    "qualSky.plain":     "Переменно",
    "qualSky.poor":      "Дождь",

    "qualCond.excellent": "Ясно",
    "qualCond.fog":       "Туман",
    "qualCond.good":      "Облачно",
    "qualCond.plain":     "Переменно",
    "qualCond.poor":      "Дождь",

    /* Насколько прогнозу верить — зависит от того, как далеко день */
    "trust.past":   "прошедший день · архив",
    "trust.sure":   "прогноз уверенный",
    "trust.week":   "уверенность 70% · уточнится ближе к дате",
    "trust.far":    "уверенность низкая · пока ориентир",


    /* Астро-панель «Подробно». Заголовки групп и подписи строк */
    "pro.moonNow":   "Луна в этот момент",
    "pro.sunNow":    "Солнце в этот момент",
    "pro.dayCourse": "Ход дня",
    "pro.goldenBlue": "Золотой и синий час",
    "pro.twilight":  "Сумерки",
    "pro.weather":   "Погода",
    "pro.sunsetForecast": "Прогноз заката",

    "pro.phase":     "Фаза",
    "pro.azimuth":   "Азимут",
    "pro.altitude":  "Высота",
    "pro.rise":      "Восход",
    "pro.set":       "Заход",
    "pro.distance":  "Расстояние",
    "pro.shadowLen": "Длина тени",
    "pro.solarNoon": "Солнечный полдень",
    "pro.sunset":    "Закат",
    "pro.dayLen":    "Длина дня",
    "pro.goldenAM":  "Золотой час утром",
    "pro.goldenPM":  "Золотой час вечером",
    "pro.blueAM":    "Синий час утром",
    "pro.bluePM":    "Синий час вечером",
    "pro.civil":     "Гражданские",
    "pro.nautical":  "Навигационные",
    "pro.astro":     "Астрономические",
    "pro.astroNight": "Астрономическая ночь",
    "pro.whiteNight": "не наступает · белая ночь",
    "pro.sky":       "Небо",
    "pro.cloud":     "Облачность",
    "pro.temp":      "Температура",
    "pro.wind":      "Ветер",
    "pro.source":    "Источник",
    "pro.srcLive":   "Open-Meteo · прогноз",
    "pro.srcMock":   "прогноз имитируется",
    "pro.score":     "Оценка",
    "pro.layerLow":  "Нижний ярус",
    "pro.layerMid":  "Средний ярус",
    "pro.layerHigh": "Верхний ярус",
    "pro.humidity":  "Влажность",
    "pro.layerLowNote":  "экран горизонта",
    "pro.layerMidNote":  "текстура",
    "pro.layerHighNote": "догорание зари",

    /* Склейки: величина и её единица. Порядок и пробел — тоже язык */
    "pro.shadowOf":  "×{n} роста",
    "pro.dayLenFmt": "{h} ч {m} м",
    "pro.windAt":    "{n} м/с · {word}",
    "pro.distKm":    "{n} км",
    "pro.scoreOf":   "{n} / 100 · {word}",
    "pro.pctNote":   "{n}% · {note}",

    /* Каким обещает быть закат — словами, а не баллом */
    "sunsetW.beautiful": "закат обещает быть красивым",
    "sunsetW.color":     "закат с цветом",
    "sunsetW.calm":      "спокойный закат",
    "sunsetW.none":      "цвета почти не будет",

    /* Румбы компаса, по кругу от севера через восток. Одной строкой:
       порядок задан кругом, и разорвать его на 16 ключей значит потерять
       связь между ними — переводчику нужен весь круг разом */
    "dirs": "С,ССВ,СВ,ВСВ,В,ВЮВ,ЮВ,ЮЮВ,Ю,ЮЮЗ,ЮЗ,ЗЮЗ,З,ЗСЗ,СЗ,ССЗ",

    /* Обратный отсчёт в шапке «Свет идёт»: коротко, без слова «минут» */
    "durS.minutes":   "{m} мин",
    "durS.hours":     "{h} ч",
    "durS.hoursMins": "{h} ч {m} м",

    /* Куда идёт облачность к окну съёмки */
    "trend.clearing": "проясняется",
    "trend.closing":  "затягивает",
    "trend.same":     "без изменений",

    /* Закат одним словом — в строке телеметрии рядом с баллом */
    "sunsetS.beautiful": "красивый",
    "sunsetS.color":     "с цветом",
    "sunsetS.calm":      "спокойный",
    "sunsetS.none":      "серый",

    /* Солнце за полярным кругом: не всходит или не садится вовсе */
    "sun.noRiseFull": "солнце не восходит",
    "sun.noSetFull":  "солнце не заходит",
    "sun.noRise": "не восходит",
    "sun.noSet":  "не заходит",

    /* Золотой час вечером и до какого времени ещё светло */
    "tele.goldenTill": "{range} · до заката {t}",

    /* ---- Экран «Карта» ----
       Подписи телеметрии карты и слоёв */
    "map.lightFrom":   "Свет идёт",
    "map.sunElev":     "Высота солнца",
    "map.shadow":      "Тень",
    "map.golden":      "Золотой час",
    "map.blue":        "Синий час",
    "map.moon":        "Луна",
    "map.spot":        "Точка съёмки",
    "map.next":        "Ближайшее",
    "map.twilight":    "Сумерки",
    "map.eclipse":     "Затмение",
    "map.night":       "Ночь",
    "map.moonGlare":   "Луна для звёзд",
    "map.verdict":     "Съёмка",
    "map.savePoint":   "Сохранить точку",
    "map.layers":      "Слои карты",
    "map.liveCompass": "Живой компас",
    "map.myPlace":     "Моё место",

    "layer.sun":  "Солнце",
    "layer.moon": "Луна",
    "layer.mw":   "Млечный Путь",

    /* Откуда свет и откуда заря — предлог тоже часть строки, в другом языке
       он другой или его нет вовсе */
    "map.dirFrom":     "с {dir} · {az}°",
    "map.glowFrom":    "заря с {dir} · {az}°",
    "map.shadowTo":    "×{n} роста · на {dir}",
    "map.rangeDir":    "{range} · {dir}",
    "map.spotLit":     "освещается",
    "map.spotShade":   "в тени",
    "map.nextIn":      "{name} через {gap}",

    /* Луна в своде карты */
    "map.moonPro":     "{dir} · {alt}° · {pct}%",
    "map.moonLit":     "освещена {pct}%",
    "map.moonSetsAt":  " · зайдёт {t}",
    "map.moonNoRise":  "сегодня не восходит",
    "map.moonBelow":   "под горизонтом · взойдёт {t}",

    /* Ближайшее световое событие — имена коротко, для строки с отсчётом */
    "ev.dawn":   "рассвет",
    "ev.blue":   "синий час",
    "ev.rise":   "восход",
    "ev.day":    "день",
    "ev.golden": "золотой час",
    "ev.sunset": "закат",
    "ev.dark":   "тьма",

    /* Сумерки: какая ступень идёт и до которого часа */
    "twi.civil":     "гражданские",
    "twi.nautical":  "навигационные",
    "twi.astro":     "астрономические",
    "twi.till":      "{step} · до {t} · {gap}",

    /* Разрыв во времени: до часа — минуты, дальше — часы с двоеточием */
    "gap.minutes": "{m} мин",

    /* Фазы луны */
    "moon.new":        "Новолуние",
    "moon.waxCres":    "Растущий серп",
    "moon.firstQ":     "Первая четверть",
    "moon.waxGib":     "Растущая луна",
    "moon.full":       "Полнолуние",
    "moon.wanGib":     "Убывающая луна",
    "moon.lastQ":      "Последняя четверть",
    "moon.wanCres":    "Убывающий серп",

    /* Ветер словом */
    "wind.calm":     "штиль",
    "wind.light":    "слабый",
    "wind.moderate": "умеренный",
    "wind.strong":   "сильный",

    /* Млечный Путь: тёмная ночь, помеха от луны, вердикт «ехать или нет» */
    "mw.nightYes":    "есть",
    "mw.nightNo":     "нет",
    "mw.nightUntil":  "нет до {date}",
    "mw.glareWash":   "засветит · диск {pct}%",
    "mw.glareDim":    "помешает · диск {pct}%",
    "mw.noDark":      "темноты нет",
    "mw.coreLow":     "ядро низко · {alt}° из {need}",
    "mw.moonWashes":  "луна засветит",
    "mw.moonBlocks":  "мешает луна",
    "mw.noWindow":    "окна нет",
    "mw.moonDims":    " · луна мешает",

    /* Затмение: вид — ключ, место — данные таблицы, их переводит переводчик */
    "ecl.annular": "кольцевое",
    "ecl.total":   "полное",
    "ecl.partial": "частное",
    "ecl.line":    "{kind} · {where}",

    /* Астро-панель карты: азимуты дня, место, Млечный Путь, затмение */
    "mpro.dayAzimuths": "Азимуты дня",
    "mpro.place":       "Место",
    "mpro.shadowFalls": "Тень падает на",
    "mpro.sector":      "Сектор за день",
    "mpro.lat":         "Широта",
    "mpro.lon":         "Долгота",
    "mpro.tz":          "Часовой пояс",
    "mpro.tzGuess":     "UTC{off} · оценка по долготе",
    "mpro.azDir":       "{az}° · {dir}",

    "mpro.mw":          "Млечный Путь",
    "mpro.coreAz":      "Азимут ядра",
    "mpro.coreAlt":     "Высота ядра",
    "mpro.maxDay":      "Максимум за сутки",
    "mpro.noRise":      "не восходит",
    "mpro.altAt":       "{alt}° в {t}",
    "mpro.workAlt":     "Рабочая высота",
    "mpro.workRange":   "{lo}–{hi}° · {verdict}",
    "mpro.reaches":     "достаётся",
    "mpro.barely":      "с натяжкой",
    "mpro.reachesNot":  "не достаётся",
    "mpro.moonNow":     "Луна сейчас",
    "mpro.moonUp":      "над горизонтом · {alt}° · {pct}%",
    "mpro.moonDown":    "под горизонтом · не мешает",
    "mpro.window":      "Окно съёмки",
    "mpro.windowMoon":  "закрыто луной",

    "mpro.nextEcl":     "Ближайшее затмение",
    "mpro.when":        "Когда",
    "mpro.kind":        "Вид",
    "mpro.whereSeen":   "Где видно",
    "mpro.eclToday":    "сегодня",
    "mpro.eclIn":       "{date} {year} · через {days}",

    /* Где видно затмение. Ключ — дата затмения: она и есть его имя,
       единственная и неизменная, а список из двенадцати строк переводчик
       пройдёт разом */
    "eclW.2026-02-17": "Антарктида, юг Атлантики",
    "eclW.2026-08-12": "Исландия, север Испании",
    "eclW.2027-02-06": "юг Аргентины и Чили",
    "eclW.2027-08-02": "Испания, север Африки, Египет",
    "eclW.2028-01-26": "Америка, Испания, Португалия",
    "eclW.2028-07-22": "Австралия, Сидней",
    "eclW.2029-01-14": "Северная и Центральная Америка",
    "eclW.2029-06-12": "север Европы, Гренландия",
    "eclW.2029-07-11": "юг Южной Америки",
    "eclW.2029-12-05": "юг Южной Америки, Антарктида",
    "eclW.2030-06-01": "Европа, Россия, Китай, Япония",
    "eclW.2030-11-25": "юг Африки, Австралия",

    /* Четыре стороны света на самом компасе карты. Отдельно от круга румбов:
       здесь только четыре, и в вёрстку компаса они вписаны по одной букве */
    "card.n": "С",
    "card.e": "В",
    "card.s": "Ю",
    "card.w": "З",

    /* Настройки: часы и штамп сборки */
    "set.clock":      "Часы",
    "set.clockAuto":  "Как в языке",
    "set.clock24":    "24 часа",
    "set.clock12":    "12 · AM/PM",
    "set.clockNote":  "Время показывается как {sample}.",
    "set.clockNoteAuto": "Время показывается как {sample} — так принято в выбранном языке.",
    "set.build":      "сборка {stamp}",

    /* Шторка выбора дня и времени */
    "pick.dayToday":    "Сегодня",
    "pick.dayTomorrow": "Завтра",
    "pick.title":  "Когда смотрим",
    "pick.sub":    "Свет пересчитается на выбранный день",
    "pick.today":  "Сегодня",
    "pick.week":   "Через неделю",
    "pick.month":  "Через месяц",
    "pick.done":   "Готово",

    /* Окно света дня: рассвет или закат. Ключ — код, по нему же выбирается
       знак, а не по русскому слову */
    "win.dawn":   "рассвет",
    "win.sunset": "закат",

    /* Панель дня */
    "day.noWindow":   "окна света нет",
    /* То же самое, но первой строкой виджета — с прописной */
    "day.noWindowCap": "Окна света нет",
    "day.startsAt":   "начало {t}",
    "day.allDay":     "весь день",
    "day.meet":       "Встреча",
    "day.meetLower":  "встреча · {genre}",
    "day.fromDate":   "с {date}",
    "day.tillTime":   " · до {t}",
    "day.busyDay":    "день занят",
    "day.freeDay":    "день свободен",
    "day.blockedTime": "занятое время",
    "day.busyFor":    "занято {dur}",
    "day.freeLabel":  "Свободный день",
    "day.addMore":    "Добавить съёмку",
    "day.inBin":      "{name} · в корзине",
    "day.actShoot":   "съёмка",
    "day.actMeet":    "встреча",
    "day.actBusy":    "занять",
    "unit.meet":      ["встреча", "встречи", "встреч"],

    /* Итоги года */
    "year.next":      " · ближайшая {date}",
    "year.free":      "Год пока свободен — время планировать",
    "year.shot":      "Отснято",
    "year.todo":      "Предстоит",
    "year.lateBy":    "в среднем на {days} позже срока",
    "plan.empty":     "Пока пусто. Выберите день с хорошим светом.",
    "plan.inCalendar": "→ в календаре {service}",

    "year.months":     "Занятость по месяцам",
    "year.monthsNote": "Число — съёмок в месяце",
    "year.profit":     "Прибыль",
    "year.delivery":   "Сроки сдачи",
    "year.back":       "Год",

    /* Сдача материала: состояние съёмки в списке и в карточке */
    "delv.done":     "материал сдан",
    "delv.ahead":    "предстоит",
    "delv.noTerm":   "без срока",
    "delv.overdue":  "просрочено на {days}",
    "delv.dueIn":    "сдать за {days}",
    "unit.dayShort": ["дн.", "дн.", "дн."],

    /* Строка съёмки в списке */
    "sess.expect":   " · жду: {list}",
    "sess.till":     "до {t}",

    /* Неделя: строка дня */
    "week.meetWith":  "Встреча · {genre}",
    "week.free":      "свободно",
    "week.sunsetAt":  "закат {t}",
    "week.goldenAt":  "золотой час {t}",
    "week.dueList":   "сдать {list}",
    "week.wx":        "{cond} · облачность {cloud}% · ветер {wind} м/с",

    /* ---- Экран «Съёмки» ----
       Перегрузка: сколько просрочено и сколько ещё впереди. Оба числа
       приходят готовыми — вместе с тегом и согласованным словом */
    "year.overload": "Просрочено сдачей: {overdue}. Впереди ещё {upcoming} за ближайший месяц.",

    "plan.viewMonth":  "Один месяц",
    "plan.viewWeek":   "Неделя",
    "plan.viewDay":    "Один день",
    "plan.viewPick":   "Вид календаря",
    "plan.newShoot":   "Новая съёмка",
    "plan.stats":      "Статистика",
    "plan.search":     "Поиск",
    "plan.legendGood": "Отличный свет",
    "plan.legendOk":   "Хороший",
    "plan.legendBad":  "Плохая погода",
    "plan.seeLight":   "Свет этого дня →",
    "plan.planned":    "Запланировано",
    "plan.shootDeleted": "Съёмка удалена",
    "plan.undo":       "Вернуть",
    "plan.planShoot":  "Запланировать съёмку",
    "plan.meet":       "Встреча",
    "plan.meetSub":    "обсудить съёмку",
    "plan.block":      "Занять время — выходной, дорога, перелёт",

    /* Строки телеметрии — подписи слева */
    "tele.cond":   "Условия",
    "tele.sunset": "Закат",
    "tele.golden": "Золотой час",
    "tele.light":  "Свет",
    "tele.shadow": "Тени",
    "tele.sky":    "Небо",
    "tele.wind":   "Ветер",

    /* Кнопки и подписи экрана */
    "today.details":  "Подробно",
    "today.planShoot": "Запланировать съёмку",
    "today.changePlace": "Сменить место",
    "today.sunOrMoon": "Солнце или луна",
    "today.now": "сегодня",
    "today.ahead": "прогноз",
    "today.past": "архив",

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
    "genreN.ad":           ["реклама", "рекламы", "реклам"],

    /* ---- Карточка съёмки ----
       Верхний уровень: съёмка для чтения. Разделы, плитки, цепочка сделки. */
    "card.close":       "Закрыть",
    "card.tune":        "Настроить карточку",
    "card.fill":        "Заполнить",
    "card.bin":         "Корзина",
    "card.when":        "Когда",
    "card.date":        "Дата",
    "card.time":        "Время",
    "card.place":       "Место",
    "card.lightWx":     "Свет и погода",
    "card.delivery":    "Сдача материала",
    "card.status":      "Статус",
    "card.refs":        "Референсы",
    "card.notes":       "Заметки",
    "card.route":       "Маршрут дня",
    "card.docs":        "Документы",
    "card.money":       "Деньги",
    "card.income":      "Доход",
    "card.expense":     "Расходы",
    "card.profit":      "Прибыль",
    "card.none":        "нет",
    "card.orderReset":  "По умолчанию",
    "card.orderDone":   "Готово",
    "card.delShoot":    "Удалить съёмку",
    "card.delMeet":     "Удалить встречу",
    "card.growT":       "Назначить съёмку",
    "card.growS":       "встреча останется в календаре",
    "card.grownOn":     "Съёмка назначена на {d}.",

    /* Имена в шапке: «Алексей и Елена». Соединитель — со своими пробелами,
       потому что в японском их не будет, а список собирается склейкой */
    "card.and":         " и ",
    "card.noClient":    "без клиента",
    "card.meetTopic":   "по теме: {genre}",
    "card.meetAbout":   "Встреча · {genre}",

    /* Свет и погода в карточке */
    "card.byDate":      "до {d}",
    "card.noDataDay":   "нет данных на этот день",
    "card.forecastFake": "прогноз имитируется",
    "card.wxOtherPlace": "погода показана для места, выбранного в приложении",
    "card.wishMissed":  "Съёмка ждала: {wish}. Прогноз на этот день — {cond}.",
    "card.clashMore":   "И ещё {n}.",
    "card.shootPoint":  "Съёмка",
    "card.refsAt":      "Референсы: {stage}",
    "card.refsFrom":    "набор жанра и съёмки",

    /* Реплика о свете: одна из трёх, и каждая — законченная фраза.
       Собирать её из кусков нельзя: в английском порядок слов другой */
    "light.waitedSunset": "{name} ждала закат, а прогноз обещает {cond} · облачность {cloud}%.",
    "light.inGolden":     "«{name}» попадает в золотой час: {range}. Свет тёплый и мягкий.",
    "light.missGolden":   "Золотой час {range} — ближайшая точка «{name}» мимо на {gap}. Сдвиньте, если свет важен.",

    /* Плитка дня: навигатор по съёмке. Жирным набрано то, что меняется
       на глазах, — поэтому {left} приходит уже размеченным */
    "day.running":    "Идёт съёмка",
    "day.leftUntil":  "осталось {left} · до {t}",
    "day.meetDone":   "Встреча прошла",
    "day.shootDone":  "Съёмка отработана",
    "day.startsIn":   "через {in}",
    "day.nowAt":      "Сейчас: {name}",
    "day.leftNext":   "осталось {left} · дальше {next}",
    "day.lastPoint":  "последняя точка дня",
    "day.soonAt":     "Скоро: {name}",
    "day.inAt":       "через {left} · в {t}",

    /* Лента дня: два-три знака подписаны одним словом */
    "lane.start":  "Начало",
    "lane.end":    "Конец",
    "lane.golden": "Золотой",

    /* Студийный час: буфер выхода из почасового места */
    "studio.leaveIn":  "Студийный час — выйти через {left}",
    "studio.leaveNow": "Студийный час — пора выходить",
    "studio.late":     "Студийный час — вышли {over} назад",

    /* Плитки: подпись сверху мелким, значение крупным */
    "pane.next":       "Дальше",
    "pane.inAt":       "через {in} · {t}",
    "pane.guests":     "Гостей",
    "pane.trip":       "Выезд",
    "pane.tripAny":    "в другой город",
    "pane.fee":        "Гонорар",
    /* Неразрывный пробел после минуса: иначе строка рвётся сразу за ним,
       и на первой строке остаётся висячий «−», а слово уезжает вниз */
    "pane.minusExp":   "−\u00A0расходы {sum}",
    "pane.prepayRest": "предоплата {prepay} · остаток {rest}",
    "pane.handover":   "Сдача",
    "pane.models":     "Модели · {n}",

    /* Имена блоков в режиме перестановки. Ключи те же, что у самих блоков */
    "cdBlock.deal":     "Сделка",
    "cdBlock.day":      "Плитка дня",
    "cdBlock.clash":    "Наложение",
    "cdBlock.light":    "Свет",
    "cdBlock.place":    "Место и дальше",
    "cdBlock.weather":  "Погода",
    "cdBlock.route":    "Маршрут дня",
    "cdBlock.refs":     "Референсы",
    "cdBlock.brief":    "Задание",
    "cdBlock.models":   "Модели",
    "cdBlock.docs":     "Документы",
    "cdBlock.notes":    "Заметки",
    "cdBlock.delivery": "Сдача",
    "cdBlock.money":    "Гонорар",

    /* Цепочка сделки. Два набора имён: чипс в цепочке и слово внутри фразы.
       Строчную букву даёт словарь, а не `toLowerCase`: регистр — правило
       языка, и русское «ТЗ» от него превращалось в «тз» */
    "deal.title":    "Сделка",
    "deal.allDone":  "всё закрыто",
    "deal.prepaid":  "внесена предоплата · ждём остаток",
    "deal.waitOne":  "ждём: {step}",
    "deal.left":     "осталось {n}",
    "deal.step":     ["шаг", "шага", "шагов"],
    "dealN.brief":    "ТЗ",
    "dealN.contract": "Договор",
    "dealN.invoice":  "Счёт",
    "dealN.pay":      "Оплата",
    "dealN.act":      "Акт",
    "dealW.brief":    "техзадание",
    "dealW.contract": "договор",
    "dealW.invoice":  "счёт",
    "dealW.pay":      "оплату",
    "dealW.act":      "акт",

    /* Вид документа: код внутри записи, имя на экране */
    "doc.contract": "Договор",
    "doc.invoice":  "Счёт",
    "doc.receipt":  "Чек",
    "doc.act":      "Акт",
    "doc.brief":    "ТЗ",
    "doc.req":      "Реквизиты",
    "doc.any":      "документ",
    "doc.file":     "файл",
    "doc.kb":       "{n} КБ",
    "doc.mb":       "{n} МБ",
    "doc.openFail": "Файл не открылся: нет связи с Диском.",

    /* Референсы на весь экран */
    "refs.all":   "Все",
    "refs.empty": "Пусто. Набор жанра собирается в «Мои жанры» — он подскажет, что снять, когда мысль встала.",

    /* Счёт дней до съёмки и после неё */
    "when.tomorrow":  "завтра",
    "when.yesterday": "вчера",
    "when.inDays":    "через {n}",
    "when.daysAgo":   "{n} назад",

    "unit.point": ["точка", "точки", "точек"],
    "unit.frame": ["кадр", "кадра", "кадров"],
    "unit.doc":   ["документ", "документа", "документов"],
    "unit.min":   ["минуту", "минуты", "минут"],

    "bin.wipeAsk": "Стереть {n} насовсем? Вернуть их будет нечем.",

    /* Короткое имя жанра — для ячеек календаря и ленты. Заводится только
       там, где обычное имя не влезает; остальные падают на `genre.*`. */
    "genreShort.wedding":      "Свадьба",
    "genreShort.architecture": "Архитект.",
    "genreShort.product":      "Предметка",

    /* Имя события в единственном числе: чипс жанра говорит «Свадьбы»,
       а конкретная съёмка — «Свадьба» */
    "genreEv.wedding": "Свадьба",
    "genreEv.party":   "Праздник"
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
    "genre.party":        "Celebration",
    "genre.lovestory":    "Couples",
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

    "sun.noon.label":  "Noon",
    "sun.noon.sense":  "sun overhead — the light is harsh",
    "sun.noon.light":  "Harsh and bright",
    "sun.noon.rec":    "Harsh light",

    "sun.morning.label":  "Morning",
    "sun.morning.sense":  "cool light, contrast building",
    "sun.morning.light":  "Cool, fairly harsh",
    "sun.morning.rec":    "Even light",

    "sun.day.label":  "Day",
    "sun.day.sense":  "light still harsh",
    "sun.day.light":  "Fairly harsh",
    "sun.day.rec":    "Even light",

    "sun.morningWarm.label":  "Morning",
    "sun.morningWarm.sense":  "light warming, shadows lengthening",
    "sun.morningWarm.light":  "Warm, softening",
    "sun.morningWarm.rec":    "Soft light",

    "sun.evening.label":  "Evening",
    "sun.evening.sense":  "light warming, shadows lengthening",
    "sun.evening.light":  "Warm, softening",
    "sun.evening.rec":    "Soft light",

    "sun.golden.label":  "Golden hour",
    "sun.golden.sense":  "warm soft light, long shadows",
    "sun.golden.light":  "Warm and soft",
    "sun.golden.rec":    "Excellent light",

    "sun.dawn.label":  "Sunrise",
    "sun.dawn.sense":  "sky glowing red at the horizon",
    "sun.dawn.light":  "Scarlet, fading fast",
    "sun.dawn.rec":    "Excellent light",

    "sun.sunset.label":  "Sunset",
    "sun.sunset.sense":  "sky glowing red at the horizon",
    "sun.sunset.light":  "Scarlet, fading fast",
    "sun.sunset.rec":    "Excellent light",

    "sun.dawning.label":  "First light",
    "sun.dawning.sense":  "sky warming to pink",
    "sun.dawning.light":  "Soft, pink",
    "sun.dawning.rec":    "Soft light",

    "sun.dusk.label":  "Dusk",
    "sun.dusk.sense":  "sunset burning down to pink",
    "sun.dusk.light":  "Soft, pink",
    "sun.dusk.rec":    "Soft light",

    "sun.blue.label":  "Blue hour",
    "sun.blue.sense":  "deep blue sky",
    "sun.blue.light":  "Blue and even",
    "sun.blue.rec":    "Excellent light",

    "sun.deepDusk.label":  "Deep dusk",
    "sun.deepDusk.sense":  "little light left, sky still pale",
    "sun.deepDusk.light":  "Very weak",
    "sun.deepDusk.rec":    "Weak light",

    "sun.astroDawn.label":  "Astronomical twilight",
    "sun.astroDawn.sense":  "stars fading, dawn is close",
    "sun.astroDawn.light":  "Dark, bright stars visible",
    "sun.astroDawn.rec":    "Starry sky",

    "sun.astroDusk.label":  "Astronomical twilight",
    "sun.astroDusk.sense":  "bright stars coming out",
    "sun.astroDusk.light":  "Dark, bright stars visible",
    "sun.astroDusk.rec":    "Starry sky",

    "sun.astroNight.label":  "Astronomical night",
    "sun.astroNight.sense":  "sky fully dark",
    "sun.astroNight.light":  "Dark, starry sky",
    "sun.astroNight.rec":    "Starry night",

    "sun.overcast.rec": "Sky closed in",

    "shadow.none":      "No shadows",
    "shadow.veryShort": "Very short",
    "shadow.short":     "Short",
    "shadow.long":      "Long",
    "shadow.veryLong":  "Very long",

    "next.polarDay":   "Polar day",
    "next.polarNight": "Polar night",
    "next.toDawn":     "Until sunrise",
    "next.goldenLeft": "Golden hour, left",
    "next.toGolden":   "Until golden hour",
    "next.toSunset":   "Until sunset",
    "next.blueLeft":   "Blue hour, left",

    "qual.excellent": "Excellent day",
    "qual.fog":       "Foggy sunrise",
    "qual.good":      "Good day",
    "qual.plain":     "Ordinary day",
    "qual.poor":      "Overcast",

    "qualWhy.excellent": "Clear sky, golden sunset",
    "qualWhy.fog":       "Fog at sunrise",
    "qualWhy.good":      "Broken cloud",
    "qualWhy.plain":     "Nothing remarkable",
    "qualWhy.poor":      "Heavy cloud, rain",

    "qualSky.excellent": "Clear",
    "qualSky.fog":       "Fog in the morning",
    "qualSky.good":      "Cloudy with clear spells",
    "qualSky.plain":     "Changeable",
    "qualSky.poor":      "Rain",

    "qualCond.excellent": "Clear",
    "qualCond.fog":       "Fog",
    "qualCond.good":      "Cloudy",
    "qualCond.plain":     "Changeable",
    "qualCond.poor":      "Rain",

    "trust.past":   "past day · archive",
    "trust.sure":   "forecast is firm",
    "trust.week":   "70% confidence · will sharpen nearer the date",
    "trust.far":    "low confidence · a rough guide for now",


    "pro.moonNow":   "Moon right now",
    "pro.sunNow":    "Sun right now",
    "pro.dayCourse": "Course of the day",
    "pro.goldenBlue": "Golden and blue hour",
    "pro.twilight":  "Twilight",
    "pro.weather":   "Weather",
    "pro.sunsetForecast": "Sunset forecast",

    "pro.phase":     "Phase",
    "pro.azimuth":   "Azimuth",
    "pro.altitude":  "Altitude",
    "pro.rise":      "Rise",
    "pro.set":       "Set",
    "pro.distance":  "Distance",
    "pro.shadowLen": "Shadow length",
    "pro.solarNoon": "Solar noon",
    "pro.sunset":    "Sunset",
    "pro.dayLen":    "Day length",
    "pro.goldenAM":  "Golden hour, morning",
    "pro.goldenPM":  "Golden hour, evening",
    "pro.blueAM":    "Blue hour, morning",
    "pro.bluePM":    "Blue hour, evening",
    "pro.civil":     "Civil",
    "pro.nautical":  "Nautical",
    "pro.astro":     "Astronomical",
    "pro.astroNight": "Astronomical night",
    "pro.whiteNight": "does not fall · white night",
    "pro.sky":       "Sky",
    "pro.cloud":     "Cloud cover",
    "pro.temp":      "Temperature",
    "pro.wind":      "Wind",
    "pro.source":    "Source",
    "pro.srcLive":   "Open-Meteo · forecast",
    "pro.srcMock":   "forecast is simulated",
    "pro.score":     "Score",
    "pro.layerLow":  "Low layer",
    "pro.layerMid":  "Mid layer",
    "pro.layerHigh": "High layer",
    "pro.humidity":  "Humidity",
    "pro.layerLowNote":  "screens the horizon",
    "pro.layerMidNote":  "texture",
    "pro.layerHighNote": "afterglow",

    "pro.shadowOf":  "×{n} of height",
    "pro.dayLenFmt": "{h}h {m}m",
    "pro.windAt":    "{n} m/s · {word}",
    "pro.distKm":    "{n} km",
    "pro.scoreOf":   "{n} / 100 · {word}",
    "pro.pctNote":   "{n}% · {note}",

    "sunsetW.beautiful": "the sunset promises to be beautiful",
    "sunsetW.color":     "sunset with colour",
    "sunsetW.calm":      "a calm sunset",
    "sunsetW.none":      "almost no colour",

    "dirs": "N,NNE,NE,ENE,E,ESE,SE,SSE,S,SSW,SW,WSW,W,WNW,NW,NNW",

    "durS.minutes":   "{m} min",
    "durS.hours":     "{h}h",
    "durS.hoursMins": "{h}h {m}m",

    "trend.clearing": "clearing",
    "trend.closing":  "closing in",
    "trend.same":     "no change",

    "sunsetS.beautiful": "beautiful",
    "sunsetS.color":     "with colour",
    "sunsetS.calm":      "calm",
    "sunsetS.none":      "grey",

    "sun.noRiseFull": "the sun does not rise",
    "sun.noSetFull":  "the sun does not set",
    "sun.noRise": "does not rise",
    "sun.noSet":  "does not set",

    "tele.goldenTill": "{range} · sunset {t}",

    "map.lightFrom":   "Light from",
    "map.sunElev":     "Sun altitude",
    "map.shadow":      "Shadow",
    "map.golden":      "Golden hour",
    "map.blue":        "Blue hour",
    "map.moon":        "Moon",
    "map.spot":        "Shooting spot",
    "map.next":        "Next",
    "map.twilight":    "Twilight",
    "map.eclipse":     "Eclipse",
    "map.night":       "Night",
    "map.moonGlare":   "Moon vs stars",
    "map.verdict":     "Shooting",
    "map.savePoint":   "Save this spot",
    "map.layers":      "Map layers",
    "map.liveCompass": "Live compass",
    "map.myPlace":     "My location",

    "layer.sun":  "Sun",
    "layer.moon": "Moon",
    "layer.mw":   "Milky Way",

    "map.dirFrom":     "from {dir} · {az}°",
    "map.glowFrom":    "glow from {dir} · {az}°",
    "map.shadowTo":    "×{n} of height · towards {dir}",
    "map.rangeDir":    "{range} · {dir}",
    "map.spotLit":     "in sunlight",
    "map.spotShade":   "in shade",
    "map.nextIn":      "{name} in {gap}",

    "map.moonPro":     "{dir} · {alt}° · {pct}%",
    "map.moonLit":     "{pct}% lit",
    "map.moonSetsAt":  " · sets {t}",
    "map.moonNoRise":  "does not rise today",
    "map.moonBelow":   "below horizon · rises {t}",

    "ev.dawn":   "dawn",
    "ev.blue":   "blue hour",
    "ev.rise":   "sunrise",
    "ev.day":    "day",
    "ev.golden": "golden hour",
    "ev.sunset": "sunset",
    "ev.dark":   "dark",

    "twi.civil":     "civil",
    "twi.nautical":  "nautical",
    "twi.astro":     "astronomical",
    "twi.till":      "{step} · until {t} · {gap}",

    "gap.minutes": "{m} min",

    "moon.new":        "New moon",
    "moon.waxCres":    "Waxing crescent",
    "moon.firstQ":     "First quarter",
    "moon.waxGib":     "Waxing gibbous",
    "moon.full":       "Full moon",
    "moon.wanGib":     "Waning gibbous",
    "moon.lastQ":      "Last quarter",
    "moon.wanCres":    "Waning crescent",

    "wind.calm":     "calm",
    "wind.light":    "light",
    "wind.moderate": "moderate",
    "wind.strong":   "strong",

    "mw.nightYes":    "yes",
    "mw.nightNo":     "none",
    "mw.nightUntil":  "none until {date}",
    "mw.glareWash":   "washes it out · disc {pct}%",
    "mw.glareDim":    "will interfere · disc {pct}%",
    "mw.noDark":      "no darkness",
    "mw.coreLow":     "core low · {alt}° of {need}",
    "mw.moonWashes":  "moon washes it out",
    "mw.moonBlocks":  "moon in the way",
    "mw.noWindow":    "no window",
    "mw.moonDims":    " · moon interferes",

    "ecl.annular": "annular",
    "ecl.total":   "total",
    "ecl.partial": "partial",
    "ecl.line":    "{kind} · {where}",

    "mpro.dayAzimuths": "Azimuths of the day",
    "mpro.place":       "Location",
    "mpro.shadowFalls": "Shadow falls towards",
    "mpro.sector":      "Sector across the day",
    "mpro.lat":         "Latitude",
    "mpro.lon":         "Longitude",
    "mpro.tz":          "Time zone",
    "mpro.tzGuess":     "UTC{off} · estimated from longitude",
    "mpro.azDir":       "{az}° · {dir}",

    "mpro.mw":          "Milky Way",
    "mpro.coreAz":      "Core azimuth",
    "mpro.coreAlt":     "Core altitude",
    "mpro.maxDay":      "Peak over the day",
    "mpro.noRise":      "does not rise",
    "mpro.altAt":       "{alt}° at {t}",
    "mpro.workAlt":     "Working altitude",
    "mpro.workRange":   "{lo}–{hi}° · {verdict}",
    "mpro.reaches":     "reached",
    "mpro.barely":      "barely",
    "mpro.reachesNot":  "not reached",
    "mpro.moonNow":     "Moon now",
    "mpro.moonUp":      "above horizon · {alt}° · {pct}%",
    "mpro.moonDown":    "below horizon · no interference",
    "mpro.window":      "Shooting window",
    "mpro.windowMoon":  "closed by the moon",

    "mpro.nextEcl":     "Next eclipse",
    "mpro.when":        "When",
    "mpro.kind":        "Kind",
    "mpro.whereSeen":   "Where visible",
    "mpro.eclToday":    "today",
    "mpro.eclIn":       "{date} {year} · in {days}",

    "eclW.2026-02-17": "Antarctica, South Atlantic",
    "eclW.2026-08-12": "Iceland, northern Spain",
    "eclW.2027-02-06": "southern Argentina and Chile",
    "eclW.2027-08-02": "Spain, North Africa, Egypt",
    "eclW.2028-01-26": "the Americas, Spain, Portugal",
    "eclW.2028-07-22": "Australia, Sydney",
    "eclW.2029-01-14": "North and Central America",
    "eclW.2029-06-12": "northern Europe, Greenland",
    "eclW.2029-07-11": "southern South America",
    "eclW.2029-12-05": "southern South America, Antarctica",
    "eclW.2030-06-01": "Europe, Russia, China, Japan",
    "eclW.2030-11-25": "southern Africa, Australia",

    "card.n": "N",
    "card.e": "E",
    "card.s": "S",
    "card.w": "W",

    "set.clock":      "Clock",
    "set.clockAuto":  "Follow language",
    "set.clock24":    "24-hour",
    "set.clock12":    "12 · AM/PM",
    "set.clockNote":  "Times are shown as {sample}.",
    "set.clockNoteAuto": "Times are shown as {sample} — the usual form for the chosen language.",
    "set.build":      "build {stamp}",

    "pick.dayToday":    "Today",
    "pick.dayTomorrow": "Tomorrow",
    "pick.title":  "When to look",
    "pick.sub":    "The light will be recalculated for the chosen day",
    "pick.today":  "Today",
    "pick.week":   "In a week",
    "pick.month":  "In a month",
    "pick.done":   "Done",

    "win.dawn":   "sunrise",
    "win.sunset": "sunset",

    "day.noWindow":   "no light window",
    "day.noWindowCap": "No light window",
    "day.startsAt":   "starts {t}",
    "day.allDay":     "all day",
    "day.meet":       "Meeting",
    "day.meetLower":  "meeting · {genre}",
    "day.fromDate":   "from {date}",
    "day.tillTime":   " · until {t}",
    "day.busyDay":    "day is full",
    "day.freeDay":    "day is free",
    "day.blockedTime": "blocked time",
    "day.busyFor":    "{dur} booked",
    "day.freeLabel":  "Free day",
    "day.addMore":    "Add a shoot",
    "day.inBin":      "{name} · in the bin",
    "day.actShoot":   "shoot",
    "day.actMeet":    "meeting",
    "day.actBusy":    "block",
    "unit.meet":      ["meeting", "meetings"],

    "year.next":      " · next {date}",
    "year.free":      "The year is still free — time to plan",
    "year.shot":      "Shot",
    "year.todo":      "Ahead",
    "year.lateBy":    "{days} late on average",
    "plan.empty":     "Nothing yet. Pick a day with good light.",
    "plan.inCalendar": "→ in {service} calendar",

    "delv.done":     "delivered",
    "delv.ahead":    "ahead",
    "delv.noTerm":   "no deadline",
    "delv.overdue":  "{days} overdue",
    "delv.dueIn":    "{days} to deliver",
    "unit.dayShort": ["d", "d"],

    "sess.expect":   " · want: {list}",
    "sess.till":     "till {t}",

    "week.meetWith":  "Meeting · {genre}",
    "week.free":      "free",
    "week.sunsetAt":  "sunset {t}",
    "week.goldenAt":  "golden hour {t}",
    "week.dueList":   "deliver {list}",
    "week.wx":        "{cond} · cloud {cloud}% · wind {wind} m/s",

    "year.months":     "Load by month",
    "year.monthsNote": "The number is shoots that month",
    "year.profit":     "Profit",
    "year.delivery":   "Delivery times",
    "year.back":       "Year",

    "year.overload": "Overdue for delivery: {overdue}. Another {upcoming} in the month ahead.",
    "plan.viewMonth":  "One month",
    "plan.viewWeek":   "Week",
    "plan.viewDay":    "One day",
    "plan.viewPick":   "Calendar view",
    "plan.newShoot":   "New shoot",
    "plan.stats":      "Statistics",
    "plan.search":     "Search",
    "plan.legendGood": "Excellent light",
    "plan.legendOk":   "Good",
    "plan.legendBad":  "Bad weather",
    "plan.seeLight":   "Light for this day →",
    "plan.planned":    "Planned",
    "plan.shootDeleted": "Shoot deleted",
    "plan.undo":       "Undo",
    "plan.planShoot":  "Plan a shoot",
    "plan.meet":       "Meeting",
    "plan.meetSub":    "to discuss a shoot",
    "plan.block":      "Block out time — day off, travel, flight",

    "tele.cond":   "Conditions",
    "tele.sunset": "Sunset",
    "tele.golden": "Golden hour",
    "tele.light":  "Light",
    "tele.shadow": "Shadows",
    "tele.sky":    "Sky",
    "tele.wind":   "Wind",

    "today.details":  "Details",
    "today.planShoot": "Plan a shoot",
    "today.changePlace": "Change location",
    "today.sunOrMoon": "Sun or moon",
    "today.now": "today",
    "today.ahead": "forecast",
    "today.past": "archive",

    "genreN.portrait":     ["portrait", "portraits"],
    "genreN.wedding":      ["wedding", "weddings"],
    "genreN.party":        ["celebration", "celebrations"],
    "genreN.lovestory":    ["couple shoot", "couple shoots"],
    "genreN.family":       ["family", "families"],
    "genreN.landscape":    ["landscape", "landscapes"],
    "genreN.architecture": ["architecture shoot", "architecture shoots"],
    "genreN.street":       ["street shoot", "street shoots"],
    "genreN.report":       ["reportage", "reportages"],
    "genreN.product":      ["product shoot", "product shoots"],
    "genreN.ad":           ["advertising shoot", "advertising shoots"],

    /* ---- Карточка съёмки ---- */
    "card.close":       "Close",
    "card.tune":        "Arrange card",
    "card.fill":        "Fill in",
    "card.bin":         "Bin",
    "card.when":        "When",
    "card.date":        "Date",
    "card.time":        "Time",
    "card.place":       "Place",
    "card.lightWx":     "Light and weather",
    "card.delivery":    "Delivery",
    "card.status":      "Status",
    "card.refs":        "References",
    "card.notes":       "Notes",
    "card.route":       "Day route",
    "card.docs":        "Documents",
    "card.money":       "Money",
    "card.income":      "Income",
    "card.expense":     "Expenses",
    "card.profit":      "Profit",
    "card.none":        "none",
    "card.orderReset":  "Default",
    "card.orderDone":   "Done",
    "card.delShoot":    "Delete shoot",
    "card.delMeet":     "Delete meeting",
    "card.growT":       "Schedule the shoot",
    "card.growS":       "the meeting stays in the calendar",
    "card.grownOn":     "Shoot scheduled for {d}.",

    "card.and":         " and ",
    "card.noClient":    "no client",
    "card.meetTopic":   "about: {genre}",
    "card.meetAbout":   "Meeting · {genre}",

    "card.byDate":      "by {d}",
    "card.noDataDay":   "no data for this day",
    "card.forecastFake": "forecast is simulated",
    "card.wxOtherPlace": "weather shown for the place selected in the app",
    "card.wishMissed":  "The shoot wanted {wish}. The forecast for that day is {cond}.",
    "card.clashMore":   "And {n} more.",
    "card.shootPoint":  "The shoot",
    "card.refsAt":      "References: {stage}",
    "card.refsFrom":    "genre set and this shoot",

    "light.waitedSunset": "{name} wanted the sunset, but the forecast says {cond} · {cloud}% cloud.",
    "light.inGolden":     "“{name}” falls in the golden hour: {range}. Warm, soft light.",
    "light.missGolden":   "Golden hour {range} — the nearest stop, “{name}”, misses it by {gap}. Shift it if the light matters.",

    "day.running":    "Shoot in progress",
    "day.leftUntil":  "{left} left · until {t}",
    "day.meetDone":   "Meeting is over",
    "day.shootDone":  "Shoot is done",
    "day.startsIn":   "in {in}",
    "day.nowAt":      "Now: {name}",
    "day.leftNext":   "{left} left · next {next}",
    "day.lastPoint":  "last stop of the day",
    "day.soonAt":     "Soon: {name}",
    "day.inAt":       "in {left} · at {t}",

    "lane.start":  "Start",
    "lane.end":    "End",
    "lane.golden": "Golden",

    "studio.leaveIn":  "Studio hour — leave in {left}",
    "studio.leaveNow": "Studio hour — time to leave",
    "studio.late":     "Studio hour — {over} over",

    "pane.next":       "Next",
    "pane.inAt":       "in {in} · {t}",
    "pane.guests":     "Guests",
    "pane.trip":       "Travel",
    "pane.tripAny":    "another city",
    "pane.fee":        "Fee",
    "pane.minusExp":   "−\u00A0expenses {sum}",
    "pane.prepayRest": "prepaid {prepay} · {rest} left",
    "pane.handover":   "Delivery",
    "pane.models":     "Models · {n}",

    "cdBlock.deal":     "Deal",
    "cdBlock.day":      "Day tile",
    "cdBlock.clash":    "Overlap",
    "cdBlock.light":    "Light",
    "cdBlock.place":    "Place and next",
    "cdBlock.weather":  "Weather",
    "cdBlock.route":    "Day route",
    "cdBlock.refs":     "References",
    "cdBlock.brief":    "Brief",
    "cdBlock.models":   "Models",
    "cdBlock.docs":     "Documents",
    "cdBlock.notes":    "Notes",
    "cdBlock.delivery": "Delivery",
    "cdBlock.money":    "Fee",

    /* «Акт выполненных работ» — постсоветский документ, и слова к слову у
       него на Западе нет. По делу это согласие заказчика, что работа принята,
       то есть «sign-off». Термин помечен к проверке носителем. */
    "deal.title":    "Deal",
    "deal.allDone":  "all closed",
    "deal.prepaid":  "deposit paid · balance outstanding",
    "deal.waitOne":  "waiting on {step}",
    "deal.left":     "{n} to go",
    "deal.step":     ["step", "steps"],
    "dealN.brief":    "Brief",
    "dealN.contract": "Contract",
    "dealN.invoice":  "Invoice",
    "dealN.pay":      "Payment",
    "dealN.act":      "Sign-off",
    "dealW.brief":    "the brief",
    "dealW.contract": "the contract",
    "dealW.invoice":  "the invoice",
    "dealW.pay":      "payment",
    "dealW.act":      "the sign-off",

    "doc.contract": "Contract",
    "doc.invoice":  "Invoice",
    "doc.receipt":  "Receipt",
    "doc.act":      "Sign-off",
    "doc.brief":    "Brief",
    "doc.req":      "Bank details",
    "doc.any":      "document",
    "doc.file":     "file",
    "doc.kb":       "{n} KB",
    "doc.mb":       "{n} MB",
    "doc.openFail": "The file did not open: no connection to the Drive.",

    "refs.all":   "All",
    "refs.empty": "Empty. The genre set is built in “My genres” — it prompts what to shoot when your mind goes blank.",

    "when.tomorrow":  "tomorrow",
    "when.yesterday": "yesterday",
    "when.inDays":    "in {n}",
    "when.daysAgo":   "{n} ago",

    "unit.point": ["stop", "stops"],
    "unit.frame": ["frame", "frames"],
    "unit.doc":   ["document", "documents"],
    "unit.min":   ["minute", "minutes"],

    "bin.wipeAsk": "Erase {n} for good? There will be no way to bring them back.",

    "genreShort.wedding":      "Wedding",
    "genreShort.architecture": "Architecture",
    "genreShort.product":      "Product",

    "genreEv.wedding": "Wedding",
    "genreEv.party":   "Celebration"
  };


  /* ---- Американский английский ------------------------------------------
     Только отличия от `DICT.en`; всё прочее приходит из основы по цепочке
     (см. `chainOf`). Держать здесь копию словаря нельзя: две копии одного
     разъезжаются при первой же правке, и найти это потом нечем.

     Термины даны фотографом, а не переводом со словарём:
     — «Лавстори» за океаном не говорят вовсе, это калька из СНГ. Общее слово
       для съёмки пары — Couples: оно накрывает и engagement, и годовщину,
       поэтому стоит в основе, а не в наложении.
     — «Репортаж» в Европе держит французский корень (Reportage), в Штатах
       говорят разговорнее — Photojournalism.
     — Рекламная съёмка: в Британии Advertising, в Штатах Commercial. */
  DICT["en-US"] = {
    "genre.report": "Photojournalism",
    "genre.ad":     "Commercial",

    "genreN.report": ["photojournalism shoot", "photojournalism shoots"],
    "genreN.ad":     ["commercial shoot", "commercial shoots"],

    /* Корзина: британская «bin» против американской «trash» */
    "card.bin": "Trash",

    /* Предоплата — не вкусовое расхождение, а юридическое. У американского
       фотографа «deposit» возвращается, а «retainer» нет, и это первое, что
       спрашивает клиент. Британец говорит «deposit» и в том же смысле. */
    "deal.prepaid":    "retainer paid · balance outstanding",
    "pane.prepayRest": "retainer {prepay} · {rest} left"
  };

  /* Британский — это и есть основа: своих отличий у него нет. Словарь заведён
     пустым нарочно, а не пропущен: по нему видно, что говор существует и
     обслуживается, а не забыт. */
  DICT["en-GB"] = {};

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
      /* «en» без говора остался у тех, кто выбирал язык до разделения на
         британский и американский. Держим его британским: основа словаря
         британская, и переучивать сохранённый выбор молча нечестно. */
      if (saved === "en") return "en-GB";
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

  /* Цепочка словарей, в которой ищется ключ: сам говор, его основа и
     английский последним рубежом. У «en-US» это ["en-US", "en"], у «es» —
     ["es", "en"], у «ru» — ["ru", "en"].

     Отсюда главное свойство говора: **он хранит только отличия**. Британский
     и американский расходятся на два десятка слов из четырёхсот, и держать
     две полные копии значило бы обречь их разъезжаться при каждой правке.
     Наложение поверх основы этого не допускает: где не переопределено — там
     ровно то же слово, и всегда. Тем же способом потом заведутся es-MX,
     pt-BR и zh-TW: основа общая, поверх — местные слова. */
  function chainOf(code) {
    var out = [code], base = baseOf(code);
    if (base !== code) out.push(base);
    if (base !== "en") out.push("en");
    return out;
  }
  function baseOf(code) { return String(code).split("-")[0]; }

  /* Формы ключа по цепочке. Пустой словарь (es/ja/zh до перевода) не должен
     показывать список ключей на экране — честнее показать английский.

     Возвращает и язык, который слово дал. Это не мелочь: правило числа и
     пробел перед словом принадлежат языку слова, а не языку экрана. Иначе
     японские правила применяются к английскому слову и «3 shoots»
     превращается в «3shoot» — форма единственного числа, слипшаяся с
     числом. Первый же второй язык это и вскрыл. */
  function sourceOf(key) {
    var ch = chainOf(lang);
    for (var i = 0; i < ch.length; i++) {
      var d = DICT[ch[i]];
      if (d && d[key] != null) return { v: d[key], lang: ch[i] };
    }
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
    var rule = ruleFor(src.lang);
    var f = src.v;
    return f[rule(n)] != null ? f[rule(n)] : f[f.length - 1];
  }

  /* Число со словом — самый частый случай: «3 съёмки», «12 часов», «12件».
     Пробел тоже принадлежит языку слова: японское счётное слово прилипает
     к числу, английское — нет, и запасное английское слово остаётся
     английским даже на японском экране */
  function count(key, n) {
    var src = sourceOf(key);
    return n + sepFor(src.v != null ? src.lang : lang) + word(key, n);
  }

  /* Разделитель между числом и словом для этого ключа. Нужен там, где число
     набрано отдельно — другим начертанием или в своём теге, — и `count`
     собрать строку не может: «<b>5</b> свадеб». Язык берётся у слова, как
     и в `count`, поэтому запасное английское слово получит пробел даже на
     японском экране, а японское счётное слово прилипнет к числу. */
  function sep(key) {
    var src = sourceOf(key);
    return sepFor(src.v != null ? src.lang : lang);
  }

  /* Правило числа и разделитель принадлежат основе, а не говору: у
     британского и американского английского они одни и те же, и заводить их
     дважды значило бы завести две правды об одном. */
  function ruleFor(code) { return RULES[code] || RULES[baseOf(code)] || RULES.en; }
  function sepFor(code) {
    var v = COUNT_SEP[code] != null ? COUNT_SEP[code] : COUNT_SEP[baseOf(code)];
    return v != null ? v : " ";
  }

  /* Номер формы для числа по правилу языка экрана. */
  function index(n) { return ruleFor(lang)(n); }

  /* То же, но по правилу названного языка. Нужен мосту `plural` в index.html:
     там формы ещё набраны русскими словами прямо на месте, и согласовывать
     их надо русским правилом, каким бы ни был язык экрана — иначе на
     английском экране русское слово встаёт в форму по английскому правилу
     («5 съёмки» вместо «5 съёмок»). Мост тает волнами, по мере переезда
     строк в словарь; вместе с последней строкой уйдёт и он. */
  function indexIn(code, n) { return ruleFor(code)(n); }

  global.LANG = {
    t: t,
    word: word,
    count: count,
    index: index,
    indexIn: indexIn,
    sep: sep,
    get code() { return lang; },
    /* Смена языка возвращает false, если правил нет вовсе: молча остаться на
       прежнем честнее, чем сломать согласование числа. Пустой словарь (es/
       ja/zh) переключить можно — экран уедет в английский по ключам. */
    set: function (code) {
      if (!RULES[code] && !RULES[baseOf(code)]) return false;
      lang = code;
      try { localStorage.setItem(STORE_KEY, code); } catch (e) {}
      applyDocLang();
      return true;
    },
    /* Есть ли у языка заполненный словарь (а не только правило числа) —
       для экрана настроек: язык без перевода честнее не предлагать совсем,
       либо показывать пометкой "скоро". */
    /* Есть ли у языка слова — считая по всей цепочке: у говора свой словарь
       может быть крошечным (одни отличия), но экран у него полный */
    has: function (code) {
      var ch = chainOf(code);
      for (var i = 0; i < ch.length; i++) {
        if (ch[i] !== "en" && DICT[ch[i]] && Object.keys(DICT[ch[i]]).length) return true;
      }
      return code === "en" || baseOf(code) === "en";
    },
    /* Доступен ли язык вообще — правило числа заведено, словарь может быть
       пуст и упадёт в английский */
    known: function (code) { return !!(RULES[code] || RULES[baseOf(code)]); },
    base: baseOf,
    chain: chainOf,
    stub: STUB_LANGS,
    /* Словарь наружу — для проверок и будущего экрана языка */
    dict: DICT
  };
})(this);

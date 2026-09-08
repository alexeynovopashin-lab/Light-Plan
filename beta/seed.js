/* ============================================================
   ПОСЕВ СЕЗОНА — тестовые данные на три месяца работы

   Файл живёт только в бете и грузится по требованию, кнопкой из настроек:
   в основном канале раздела нет, а значит нет и запроса за этим файлом.
   Так посев не попадает в релиз, хотя `index.html` копируется побайтово.

   Замысел: не «пара записей для проверки», а сезон, каким он бывает —
   прошлый месяц закрыт (снято, сдано, оплачено), текущий идёт (просрочка,
   съёмка прямо сейчас, наложение, встречи), следующий набирается
   (предоплаты, выезды, перелёт). На таком наборе видно то, чего не видно
   на пустом приложении: как ведёт себя карточка каждого жанра, что
   показывает календарь, где ломается вёрстка.

   Даты считаются от сегодняшнего дня — посев не протухает и остаётся
   годным через месяц.

   Все записи помечены знаком `sd_`: по нему посев узнаёт своё и снимается,
   не задев настоящих съёмок.
   ============================================================ */
(function () {
  "use strict";

  var P = "sd_";
  var TOMSK = { lat: 56.4846, lon: 84.9482 };
  var ST_TOMSON = P + "st_tomson", ST_SFERA = P + "st_sfera";
  var ORG_AG = P + "org_agency", ORG_REST = P + "org_rest",
      ORG_CULT = P + "org_cult", ORG_FAB = P + "org_fab", ORG_MARK = P + "org_mark";

  function H(h, m) { return h * 60 + (m || 0); }

  /* Полночь сегодняшнего дня — точка отсчёта для всех дат посева */
  function T0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function D(n, h, m) { var d = T0(); d.setDate(d.getDate() + n); if (h != null) d.setHours(h, m || 0, 0, 0); return d; }

  /* Ссылкой, а не файлом: файл потребовал бы облака, а вид документа
     («договор», «акт») карточка читает из поля kind, а не из байтов */
  function doc(kind, name) {
    return { k: "link", kind: kind, url: "https://disk.yandex.ru/d/" + P + kind, name: name };
  }

  function studios() {
    return [
      { id: ST_TOMSON, name: "Томсон", addr: "Томск, Красноармейская, 101", tel: "+7 961 887-80-78",
        town: "Томск", lat: 56.4720, lon: 84.9700, mt: Date.now(),
        halls: [{ id: P + "h_edison", name: "Эдисон" }, { id: P + "h_tesla", name: "Тесла" }] },
      /* Длинное имя нарочно: на нём и видно, как карточка обходится с тем,
         что не влезает в строку места */
      { id: ST_SFERA, name: "Студия «Сфера» на Набережной", addr: "Томск, Набережная реки Ушайки, 12",
        tel: "+7 913 800-15-15", town: "Томск", lat: 56.4881, lon: 84.9633, mt: Date.now(),
        halls: [{ id: P + "h_cyc", name: "Циклорама" }, { id: P + "h_loft", name: "Лофт" }] }
    ];
  }

  function spots() {
    return [
      { id: P + "sp_park",  name: "Лагерный сад",    addr: "Томск, Лагерный сад",        town: "Томск", lat: 56.4520, lon: 84.9370, mt: Date.now() },
      { id: P + "sp_bereg", name: "Берег Томи",      addr: "Томск, Московский тракт",    town: "Томск", lat: 56.4655, lon: 84.9280, mt: Date.now() },
      { id: P + "sp_bau",   name: "Дом с драконами", addr: "Томск, Красноармейская, 68", town: "Томск", lat: 56.4703, lon: 84.9698, mt: Date.now() },
      { id: P + "sp_sol",   name: "Ресторан «Соль»", addr: "Томск, Набережная, 20",      town: "Томск", lat: 56.4890, lon: 84.9600, mt: Date.now() }
    ];
  }

  function orgs() {
    return [
      { id: ORG_AG,   name: "Агентство «Ольга и Ко»",   person: "Ольга Титова",  phone: "+7 913 111-22-33", mt: Date.now(),
        req: "Свадебное агентство, ведёт день, отдаёт тайминг за неделю", reqFiles: [], docs: [] },
      { id: ORG_REST, name: "Ресторан «Соль»",          person: "Марат Шаев",    phone: "+7 913 222-33-44", mt: Date.now(),
        req: "Банкетный зал, съёмка интерьеров раз в сезон", reqFiles: [], docs: [] },
      { id: ORG_CULT, name: "Отдел культуры города",    person: "Ирина Белых",   phone: "+7 913 333-44-55", mt: Date.now(),
        req: "Городские праздники, отчётная съёмка, оплата по счёту", reqFiles: [], docs: [] },
      { id: ORG_FAB,  name: "Мебельная фабрика «Бауэр»", person: "Пётр Гринёв",  phone: "+7 913 444-55-66", mt: Date.now(),
        req: "Каталог мебели, съёмка предметки в студии", reqFiles: [], docs: [] },
      { id: ORG_MARK, name: "Марка «Фэшан»",            person: "Дина Крюкова",  phone: "+7 495 100-20-30", mt: Date.now(),
        req: "Одежда, кампания на сезон, съёмка в Москве", reqFiles: [], docs: [] }
    ];
  }

  /* Поля — те же, что кладёт «Сохранить» в форме съёмки. `date` уходит
     объектом Date: в памяти приложения она именно такая, строку оно ждёт
     только в снимке хранилища */
  function S(o) {
    var r = {
      kind: o.meet ? "meet" : "shoot", id: P + o.k, mt: Date.now() - 1000,
      date: D(o.d), min: o.min, dur: o.dur,
      end: o.end != null ? o.end : (o.dur != null ? o.min + o.dur : null),
      type: o.t, contact: o.c || "", clientTel: o.tel || "", notes: o.notes || "",
      orgId: o.org || null, person: o.person || "", phone: o.personTel || "", persons: o.persons || [],
      place: o.place || "", placeTown: o.town || "Томск", placeAddr: o.addr || "",
      placeLat: o.lat != null ? o.lat : TOMSK.lat, placeLon: o.lon != null ? o.lon : TOMSK.lon,
      placeCity: o.city !== false,
      studioId: o.studio || null, hallId: o.hall || null,
      rentFrom: o.rentFrom || null, rentTo: o.rentTo || null,
      wish: o.wish || [], guests: o.guests || 0,
      deadlineChoice: o.dl === undefined ? "auto" : o.dl,
      delivered: !!o.delivered, deliveredAt: o.deliveredAt || null,
      pay: o.pay || "hourly", rate: o.rate || 0, units: o.units || 0,
      expense: o.expense || 0, prepay: o.prepay || 0, currency: "RUB",
      trip: !!o.trip, tripManual: false, tripPlace: o.trip ? (o.town || "") : "",
      brief: o.brief || "", models: o.models || "",
      docs: o.docs || [], gear: [], playlist: null,
      route: o.route || []
    };
    if (o.doneAt != null) r.doneAt = o.doneAt;
    return r;
  }
  function pt(t, t2, n, p, studio, hall) {
    return { t: t, t2: t2, n: n, p: p, placeId: null, studioId: studio || null, hallId: hall || null };
  }

  function sessions() {
    var nowM = (function () { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); })();
    return [
      /* ——— прошлый месяц: закрыт ——— */
      S({ k: "aug_wed", d: -33, t: "wedding", min: H(9), dur: 14 * 60, c: "Аня и Марк", tel: "+7 913 555-66-77",
          org: ORG_AG, guests: 60, pay: "pack", rate: 95000, prepay: 30000, expense: 6000,
          persons: [{ n: "Аня", tel: "+7 913 555-66-77" }, { n: "Марк", tel: "+7 913 555-66-78" }],
          place: "Дом невесты", addr: "Томск, Дзержинского, 14", lat: 56.4880, lon: 84.9480,
          delivered: true, deliveredAt: D(-18, 14).toISOString(),
          docs: [doc("contract", "Договор — Аня и Марк"), doc("act", "Акт выполненных работ")],
          notes: "Первый заказ через агентство. Тайминг прислали за неделю.",
          route: [pt(H(9), H(11), "Сборы невесты", "Дом невесты"),
                  pt(H(11, 30), H(12, 30), "Сборы жениха", "Гостиница «Магистрат»"),
                  pt(H(13), H(15), "Пара в студии", "Томсон, зал Эдисон", ST_TOMSON, P + "h_edison"),
                  pt(H(15, 30), H(16, 30), "Церемония", "Сад «Заречье»"),
                  pt(H(17), H(19), "Прогулка", "Берег Томи"),
                  pt(H(19, 30), H(23), "Банкет", "Ресторан «Соль»")] }),
      S({ k: "aug_portr", d: -30, t: "portrait", min: H(12), dur: 60, c: "Сергей Плахов", tel: "+7 913 606-70-80",
          place: "Томсон", addr: "Томск, Красноармейская, 101", lat: 56.4720, lon: 84.9700,
          studio: ST_TOMSON, hall: P + "h_tesla", rentFrom: H(12), rentTo: H(13),
          pay: "hourly", rate: 4500, expense: 1500, delivered: true, deliveredAt: D(-27, 19).toISOString(),
          notes: "Низкий ключ, портфолио на визитку." }),
      S({ k: "aug_fam", d: -26, t: "family", min: H(17), dur: 90, c: "Семья Кравцовых", tel: "+7 913 707-80-90",
          place: "Лагерный сад", addr: "Томск, Лагерный сад", lat: 56.4520, lon: 84.9370,
          pay: "flat", rate: 12000, delivered: true, deliveredAt: D(-6, 22).toISOString(),
          notes: "Сдал с опозданием: болел. Срок стоял на четырнадцать дней." }),
      S({ k: "aug_burger", d: -22, t: "product", min: H(10), dur: 240, c: "Кофейня «Гренка»", tel: "+7 913 808-90-10",
          place: "Студия «Сфера» на Набережной", addr: "Томск, Набережная реки Ушайки, 12",
          lat: 56.4881, lon: 84.9633, studio: ST_SFERA, hall: P + "h_cyc", rentFrom: H(10), rentTo: H(14),
          pay: "item", rate: 900, units: 24, expense: 3000, delivered: true, deliveredAt: D(-16, 13).toISOString(),
          brief: "Двадцать четыре позиции меню, белый и деревянный фон.",
          docs: [doc("invoice", "Счёт на съёмку меню")],
          notes: "Реквизит привозили сами, свет — постоянный." }),
      S({ k: "aug_conf", d: -12, t: "report", min: H(9), dur: 9 * 60, c: "Форум «Сибирь»", tel: "+7 383 200-10-10",
          org: ORG_CULT, trip: true, town: "Новосибирск", place: "Экспоцентр", addr: "Новосибирск, Станционная, 104",
          lat: 55.0084, lon: 82.9357, pay: "flat", rate: 60000, expense: 9000, prepay: 20000,
          delivered: true, deliveredAt: D(-9, 11).toISOString(),
          docs: [doc("contract", "Договор на форум"), doc("invoice", "Счёт"), doc("act", "Акт")],
          notes: "Выезд на два дня, ночевал в гостинице рядом." }),
      /* Своя съёмка: ни клиента, ни сдачи, ни денег — время задаёт свет */
      S({ k: "aug_land", d: -8, t: "landscape", min: H(5, 20), dur: null, end: H(8), wish: ["clear"],
          place: "Берег Томи", addr: "Томск, Московский тракт", lat: 56.4655, lon: 84.9280,
          pay: "flat", rate: 0, notes: "Для себя. Туман по воде на рассвете." }),

      /* ——— текущий месяц: идёт ——— */
      S({ k: "sep_love", d: -6, t: "lovestory", min: H(18), dur: 120, c: "Даша и Егор", tel: "+7 913 909-10-20",
          place: "Лагерный сад", addr: "Томск, Лагерный сад", lat: 56.4520, lon: 84.9370,
          pay: "flat", rate: 15000, prepay: 5000, dl: 7, wish: ["sunset"],
          notes: "Сдача горит: неделя вышла, материал не отдан." }),
      S({ k: "sep_party", d: -3, t: "party", min: H(15), dur: 300, c: "Юбилей Нины Петровны", tel: "+7 913 010-20-30",
          org: ORG_REST, guests: 35, pay: "pack", rate: 28000, prepay: 10000,
          person: "Нина Петровна", personTel: "+7 913 010-20-30",
          place: "Ресторан «Соль»", addr: "Томск, Набережная, 20", lat: 56.4890, lon: 84.9600,
          docs: [doc("contract", "Договор на юбилей")],
          notes: "Материал в работе, срок ещё есть.",
          route: [pt(H(15), H(16), "Сбор гостей", "Ресторан «Соль»"),
                  pt(H(16), H(18), "Поздравления", "Ресторан «Соль»"),
                  pt(H(18), H(20), "Танцы и торт", "Ресторан «Соль»")] }),
      /* Идёт прямо сейчас: началась сорок минут назад, кончится через пятьдесят */
      S({ k: "sep_now", d: 0, t: "portrait", min: Math.max(0, nowM - 40), dur: 90, c: "Марина Ю.", tel: "+7 913 121-31-41",
          place: "Томсон", addr: "Томск, Красноармейская, 101", lat: 56.4720, lon: 84.9700,
          studio: ST_TOMSON, hall: P + "h_edison",
          rentFrom: Math.max(0, nowM - 40), rentTo: Math.min(1439, nowM + 50),
          pay: "hourly", rate: 5000, prepay: 2500, notes: "Съёмка идёт: карточка должна показывать «сейчас»." }),
      S({ k: "sep_meet", meet: true, d: 0, t: "wedding", min: H(19), dur: 60, c: "Катя и Слава", tel: "+7 913 232-42-52",
          place: "Кофейня «Гренка»", addr: "Томск, Ленина, 82", lat: 56.4700, lon: 84.9550,
          pay: "hourly", rate: 0, notes: "Знакомство, разговор про август будущего года." }),
      S({ k: "sep_wed", d: 1, t: "wedding", min: H(11), dur: 11 * 60, c: "Лена и Тимур", tel: "+7 913 343-53-63",
          org: ORG_AG, guests: 45, pay: "pack", rate: 88000, prepay: 44000, expense: 5000,
          persons: [{ n: "Лена", tel: "+7 913 343-53-63" }, { n: "Тимур", tel: "+7 913 343-53-64" }],
          place: "Томсон", addr: "Томск, Красноармейская, 101", lat: 56.4720, lon: 84.9700,
          studio: ST_TOMSON, hall: P + "h_edison", rentFrom: H(13), rentTo: H(15),
          docs: [doc("contract", "Договор — Лена и Тимур"), doc("invoice", "Счёт на остаток")],
          notes: "Завтра. Половина внесена.",
          route: [pt(H(11), H(12, 30), "Сборы", "Гостиница «Магистрат»"),
                  pt(H(13), H(15), "Пара в студии", "Томсон, зал Эдисон", ST_TOMSON, P + "h_edison"),
                  pt(H(15, 30), H(16, 30), "Роспись", "ЗАГС на Розы Люксембург"),
                  pt(H(17), H(19), "Прогулка", "Дом с драконами"),
                  pt(H(19, 30), H(22), "Банкет", "Ресторан «Соль»")] }),
      /* Наложение: вторая начинается за полчаса до конца первой, и в другом конце города */
      S({ k: "sep_clash_a", d: 3, t: "portrait", min: H(14), dur: 90, c: "Олег Дан", tel: "+7 913 454-64-74",
          place: "Томсон", addr: "Томск, Красноармейская, 101", lat: 56.4720, lon: 84.9700,
          studio: ST_TOMSON, hall: P + "h_tesla", rentFrom: H(14), rentTo: H(15, 30),
          pay: "hourly", rate: 5000, notes: "Наложение с семейной — проверка предупреждения." }),
      S({ k: "sep_clash_b", d: 3, t: "family", min: H(15), dur: 90, c: "Семья Ким", tel: "+7 913 565-75-85",
          place: "Лагерный сад", addr: "Томск, Лагерный сад", lat: 56.4520, lon: 84.9370,
          pay: "flat", rate: 13000, notes: "Наложение с портретом и переезд через город." }),
      /* Съёмка в помещении: погода в карточке тут лишняя */
      S({ k: "sep_inter", d: 5, t: "architecture", min: H(11), dur: 180, c: "Ресторан «Соль»", tel: "+7 913 222-33-44",
          org: ORG_REST, place: "Студия «Сфера» на Набережной", addr: "Томск, Набережная реки Ушайки, 12",
          lat: 56.4881, lon: 84.9633, studio: ST_SFERA, hall: P + "h_loft", rentFrom: H(11), rentTo: H(14),
          pay: "object", rate: 7000, units: 5, prepay: 15000,
          docs: [doc("brief", "Бриф на интерьеры")],
          brief: "Пять залов, съёмка со штатива, вечерний свет не нужен.",
          notes: "Съёмка в помещении: погода в карточке тут лишняя." }),
      S({ k: "sep_team", d: 9, t: "report", min: H(10), dur: 150, c: "Компания «Сибтех»", tel: "+7 913 676-86-96",
          place: "Офис «Сибтех»", addr: "Томск, Учебная, 39", lat: 56.4620, lon: 84.9520,
          pay: "hourly", rate: 6000, notes: "Портреты коллектива, восемнадцать человек." }),

      /* ——— следующий месяц: набирается ——— */
      S({ k: "oct_meet", meet: true, d: 12, t: "family", min: H(18, 30), dur: 45, c: "Ирина Со", tel: "+7 913 787-97-07",
          place: "Кофейня «Гренка»", addr: "Томск, Ленина, 82", lat: 56.4700, lon: 84.9550,
          pay: "hourly", rate: 0, notes: "Разговор про съёмку с новорождённым." }),
      S({ k: "oct_ad", d: 25, t: "ad", min: H(10), dur: 8 * 60, c: "Марка «Фэшан»", tel: "+7 495 100-20-30",
          org: ORG_MARK, trip: true, town: "Москва", place: "Лофт «Депо»", addr: "Москва, Лесная, 20",
          lat: 55.7799, lon: 37.5872, pay: "flat", rate: 180000, expense: 35000, prepay: 90000,
          models: "Три модели от агентства, визажист свой",
          brief: "Осенняя капсула, восемь образов, съёмка в движении.",
          docs: [doc("contract", "Договор на кампанию"), doc("invoice", "Счёт, предоплата")],
          notes: "Перелёт и гостиница на заказчике." }),
      S({ k: "oct_wed_kem", d: 31, t: "wedding", min: H(12), dur: 10 * 60, c: "Настя и Родион", tel: "+7 923 898-08-18",
          trip: true, town: "Кемерово", guests: 80, pay: "pack", rate: 110000, prepay: 40000, expense: 12000,
          persons: [{ n: "Настя", tel: "+7 923 898-08-18" }, { n: "Родион", tel: "+7 923 898-08-19" }],
          place: "Усадьба «Красная горка»", addr: "Кемерово, Красная Горка, 1", lat: 55.3600, lon: 86.0800,
          docs: [doc("contract", "Договор — Настя и Родион")],
          notes: "Выезд в другой город, дорога четыре часа.",
          route: [pt(H(12), H(14), "Сборы", "Отель «Кристалл»"),
                  pt(H(14, 30), H(15, 30), "Церемония", "Усадьба «Красная горка»"),
                  pt(H(16), H(18), "Прогулка", "Набережная Томи"),
                  pt(H(19), H(22), "Банкет", "Усадьба «Красная горка»")] }),
      S({ k: "oct_street", d: 36, t: "street", min: H(17), dur: 180, wish: ["cloudy"],
          place: "Проспект Ленина", addr: "Томск, проспект Ленина", lat: 56.4700, lon: 84.9520,
          pay: "flat", rate: 0, notes: "Для себя. Дождь не помеха." }),
      S({ k: "oct_love", d: 40, t: "lovestory", min: H(16), dur: 120, c: "Вика и Паша", tel: "+7 913 909-19-29",
          place: "Дом с драконами", addr: "Томск, Красноармейская, 68", lat: 56.4703, lon: 84.9698,
          pay: "flat", rate: 16000, prepay: 5000, wish: ["sunset"],
          notes: "Просили закат — окно света решает время." }),
      S({ k: "oct_cat", d: 45, t: "product", min: H(11), dur: 300, c: "Фабрика «Бауэр»", tel: "+7 913 444-55-66",
          org: ORG_FAB, place: "Студия «Сфера» на Набережной", addr: "Томск, Набережная реки Ушайки, 12",
          lat: 56.4881, lon: 84.9633, studio: ST_SFERA, hall: P + "h_cyc", rentFrom: H(11), rentTo: H(16),
          pay: "item", rate: 1200, units: 40, prepay: 24000,
          brief: "Каталог: сорок предметов, белый фон, три ракурса.",
          docs: [doc("invoice", "Счёт на каталог")],
          notes: "Дальний план ждёт подтверждения по количеству." }),
      S({ k: "oct_city", d: 52, t: "party", min: H(12), dur: 360, c: "День города", tel: "+7 913 333-44-55",
          org: ORG_CULT, guests: 300, pay: "flat", rate: 45000,
          place: "Новособорная площадь", addr: "Томск, Новособорная площадь", lat: 56.4690, lon: 84.9530,
          docs: [doc("contract", "Муниципальный договор")],
          notes: "Отчётная съёмка города. Оплата по счёту после акта.",
          route: [pt(H(12), H(14), "Открытие", "Новособорная площадь"),
                  pt(H(14), H(16), "Ярмарка", "Проспект Ленина"),
                  pt(H(16), H(18), "Концерт", "Новособорная площадь")] })
    ];
  }

  /* Занятость: у неё нет ни жанра, ни клиента, ни сдачи — свой список */
  function blk(o) {
    return { id: P + o.k, k: o.k2, note: o.note, from: D(o.d), allDay: !!o.allDay,
             days: o.allDay ? o.days : 1,
             min: o.allDay ? null : o.min, dur: o.allDay ? null : o.dur,
             tzFrom: null, tzTo: null, mt: Date.now() };
  }
  function blocks() {
    return [
      blk({ k: "b_vac",   k2: "off",    d: -19, allDay: true, days: 6, note: "Отпуск на Алтае" }),
      blk({ k: "b_we",    k2: "off",    d: 6,   allDay: true, days: 2, note: "Выходные с семьёй" }),
      blk({ k: "b_print", k2: "busy",   d: 15,  allDay: false, min: H(14), dur: 180, note: "Печать альбома в типографии" }),
      blk({ k: "b_road",  k2: "road",   d: 30,  allDay: true, days: 2, note: "Дорога в Кемерово и обратно" }),
      blk({ k: "b_fly",   k2: "flight", d: 24,  allDay: true, days: 3, note: "Москва: перелёт, съёмка, возврат" })
    ];
  }

  /* Доски Pinterest фотографа: подборка жанра ссылается на доску, и та же
     читалка, что работает при обычном добавлении ссылки, разворачивает её
     в кадры. Пока кадры не подтянуты, в подборке лежит одна ссылка — тоже
     годное состояние для проверки вёрстки */
  var PINS = [
    { g: "wedding",      url: "https://pin.it/52U81zj19", name: "Свадьба" },
    { g: "report",       url: "https://pin.it/3qVvzLDZl", name: "Коллектив" },
    { g: "portrait",     url: "https://pin.it/6ZG1Ycpmq", name: "Мужской портрет" },
    { g: "party",        url: "https://pin.it/7E6ZyUJeo", name: "День рождения" },
    { g: "family",       url: "https://pin.it/Ly8xZQAlQ", name: "Семья" },
    { g: "architecture", url: "https://pin.it/6GOuIc7ix", name: "Интерьер" },
    { g: "product",      url: "https://pin.it/2DdESd5nh", name: "Бургеры" },
    { g: "ad",           url: "https://pin.it/L8mumdP43", name: "Реклама" },
    { g: "landscape",    url: "https://pin.it/1aYuvSyzt", name: "Пейзаж" },
    { g: "street",       url: "https://pin.it/3BuEyjGsU", name: "Небо" }
  ];
  /* У этих съёмок мудборд свой, а не только жанровая заготовка */
  var SHOOT_BOARDS = [
    { sid: P + "sep_wed",   g: "wedding" },
    { sid: P + "sep_inter", g: "architecture" },
    { sid: P + "oct_ad",    g: "ad" },
    { sid: P + "oct_cat",   g: "product" }
  ];
  function boards() {
    var out = [], shots = [];
    PINS.forEach(function (b) {
      var sid = P + "sh_" + b.g;
      shots.push({ id: sid, k: "link", url: b.url, tags: [b.g], mt: Date.now() });
      out.push({ id: P + "bd_" + b.g, kind: "tpl", genre: b.g, name: b.name,
                 items: [sid], cover: null, mt: Date.now() });
    });
    SHOOT_BOARDS.forEach(function (s) {
      out.push({ id: P + "bd_s_" + s.g, kind: "shoot", sid: s.sid, genre: s.g, name: null,
                 items: [P + "sh_" + s.g], cover: null, mt: Date.now() });
    });
    return { boards: out, shots: shots };
  }

  window.SEED = {
    P: P,
    town: { name: "Томск", lat: TOMSK.lat, lon: TOMSK.lon, cc: "RU" },
    phone: "+7 923 412-33-30",
    studios: studios, spots: spots, orgs: orgs,
    sessions: sessions, blocks: blocks, boards: boards,
    pins: PINS
  };
})();

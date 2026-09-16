# Архив Light Plan

Сюда ложится то, что вырезано из беты, но может вернуться. Смысл файла —
вернуть фичу, не раскапывая историю: у каждой вырезанной фичи здесь описание,
причина, коммит, код целиком в том виде, в каком он стоял в бете, и список
того, что нужно для возврата.

Мёртвый код — функции без вызовов и заплатки под записи прежних версий беты —
в архив целиком не кладётся: у него одна строка в оглавлении. Код при
необходимости достаётся из родителя коммита вырезки
(`git show <коммит>^:beta/index.html`).

Номера строк в разделах — по `beta/index.html` и `beta/lang.js` родителя
коммита вырезки, то есть там, где код стоял до неё.

## Оглавление

### Фичи — раздел с кодом

| Фича | Что это | Вырезано | Раздел |
|---|---|---|---|
| Радар осадков | слой RainViewer на карте, выключенный флагом `RAIN_OK` с 31 августа 2026 | `bdb00eb`, 15.09.2026 | [↓](#радар-осадков) |
| Старый блок света карточки | строки «Свет / Тени / Небо / Закат / Золотой час» и строка доверия прогнозу в карточке съёмки, спрятанные новым видом карточки | `bdb00eb`, 15.09.2026 | [↓](#старый-блок-света-карточки) |
| Старый вид карточки | заголовок с клиентом и группы «Когда», «Сдача материала», «Референсы», «Заметки» — остальные списки «ярлык — значение», спрятанные новым видом; строка денег досталась заходу Г | `8bacaa6`, 16.09.2026; строка денег — `«хвосты Г»`, 16.09.2026 | [↓](#старый-вид-карточки) |

### Мёртвые функции и переменные — строка оглавления

Замер перед вырезкой у всех один: одно вхождение имени в `beta/index.html` —
само объявление; в `beta/lang.js`, `beta/icons.js`, `tools/` — ноль; обращений
через `window[…]`, `eval`, `new Function`, строковые таймеры в бете нет вовсе.
Если не сказано иначе — вырезано в `bdb00eb`, 15.09.2026.

| Функция | Что делала | Последний вызов снят коммитом |
|---|---|---|
| `CLOUD_NAMES` (вырезана в `8bacaa6`, 16.09.2026) | список облаков `["yandex", "google", "dropbox"]` рядом с ключами приложений; выбор облака живёт своими путями | вызова не было с рождения |
| `SORT_LABELS` (вырезана 16.09.2026, хвосты заход Г) | три ключа порядка мудборда `["mb.sortManual", "mb.sortNewest", "mb.sortByTag"]`; живой список того же состава лежит рядом под именем `SORT_KEYS` | `af3e185`, 30.08.2026, «Мудборд по макету: верх одной строкой, настройки, папки внутри жанра» |
| `attachSwipe`, `closeSwipes`, `SWIPE_W`, CSS `.swipe*` | свайп влево по строке съёмки открывал кнопку удаления | `50918a7`, 11.08.2026, «Линия „сейчас“ на ленте, утро открывается с девяти» |
| `weekLabel` | подпись недели для заголовка календаря | `67bc6f9`, 02.08.2026, «Give the calendar one header line and a third view» |
| `dMonRange` | промежуток дат одной строкой через `Intl.DateTimeFormat.formatRange`, с запасной склейкой через тире; в комментарии: порядок и знак промежутка — свойство языка | единственный вызов стоял в уже мёртвой `weekLabel`; сама функция — `3225d88`, 22.08.2026 |
| `dateIndex` | номер даты в списке барабана выбора дня | `c5fc791`, 10.08.2026, «Бета получает новую карту и починенные имена городов» |
| `genreBoard` | подборка жанра с созданием по первому обращению (`boardTpl(g, true)`) | вызова не было с рождения: `0c8658b`, 27.08.2026 |
| `mbRkOrder` | порядок плиток ряда мудборда, прочитанный из `data-rk` | `0436b8c`, 31.08.2026, «Жест сортировки подборок перенесён из рабочей демки» |
| `mbMyArt` | `transform` картинки поднятой плитки мудборда | `8c37f37`, 31.08.2026, «Объединение подборок жестом убрано, месяц не листается при переносе» |
| `sessionTz` | часовой пояс съёмки по её точке | вызова не было с рождения: `e6adac0`, 04.09.2026 |
| `firstScenePlace` | место первой точки маршрута, у которой оно есть | `fc129f3`, 12.09.2026, «Плитка места называет точку дня, а не якорь записи» |

### Заплатки под записи прежних версий беты — строка оглавления

Все вырезаны в `bdb00eb`, 15.09.2026. Тестовые данные прототипа
одноразовые (DECISIONS). У каждой проверено, что текущий код и посев сезона
(`beta/seed.js`) старую форму не пишут.

| Заплатка | Какую старую форму принимала | Кто пишет новую форму |
|---|---|---|
| `migrateThumbs`, `dataToBlob`, чтение `r.thumb` в `refImg` и полосе референсов | превью кадра строкой `data:` в самой записи | все кадры хранят `im` — ключ в базе блобов |
| `migrateGenres`, `GENRE_CODE`, перевод русского имени в `genreName`/`shortGenre`/`evName` | жанр русским словом («Свадьбы») ключом и значением | жанр везде кодом (`wedding`), имя — словарь |
| `migrateWishes`, `WISH_CODE`, перевод в `wishName` | пожелание к погоде русским словом | набор пожеланий `WISHES` — коды |
| `migrateDocKinds`, `DOC_KIND_CODE`, перевод в `docKindName` | вид документа русским словом («Договор») | выбор и угадывание вида пишут коды |
| `migrateRefTags` (таблица `TAG_CODE` осталась — по ней живой `tagCanon` приводит набранные руками папки) | папка кадра русским словом | теги пишутся через `tagCanon` |
| `migrateSpotIds` | сохранённая точка без `id` | каждое создание точки даёт `newSpotId()` |
| Выдача `id` записям при запуске | съёмка без `id` | все пять мест, где запись добавляется (форма, повтор, рост встречи, импорт календаря, посев), дают `id` |
| Практика «ru» тем, у кого есть записи и нет практики | запись практики до появления настройки | знакомство (`closeStartSheet`) и посев ставят `practiceAsked`, практика сохраняется |
| `adoptRefs` | референсы списками `s.refs` у съёмки и `genreRefs[жанр]` | кадры живут в фонде `shots`, места — строками в подборках |
| Слияние `tag` → `tags` и чтение `r.tag` в просмотрщике | кадр с отдельным полем раздела `tag` | `tag` ставил только `adoptRefs` |
| `relPath` | путь облака, начинающийся с «app:/» | загрузка в облако возвращает путь без него |
| `rentFrom/rentTo` у точки маршрута в форме | часы аренды в полях точки | точка хранит часы в `t/t2` |
| Поиск выросшей встречи по строке даты | встреча без `grewToId` | `grewToId` ставится в том же месте, что и `grewOn` |
| Пожелание строкой, а не массивом (5 мест) | `wish: "sunset"` | форма, повтор, рост встречи и посев пишут массив |

## Радар осадков

**Что делал.** Пункт «Осадки» в меню слоёв карты клал поверх карты растровый
слой RainViewer: последний прошедший кадр радара, полупрозрачно, чтобы метки
съёмки читались сквозь ливень. В панели под картой строка «Радар» говорила
время кадра и давность («12:40 · 8 мин назад»). В правовой информации стояла
атрибуция RainViewer — условие бесплатного доступа. Слой включался только по
запросу, без сети просто не появлялся.

**Почему выключен.** DECISIONS, «Осадки сняты с карты (31 августа 2026)».
Замерены две границы, обе — политика поставщика:

1. Бесплатный кэш RainViewer отдаёт радар только до z7. С z8 на любую точку
   мира приходит одна и та же серая плашка «Zoom Level Not Supported»
   (1370 байт, код 200). Карта открывается на z15 — слой не работал ни на
   одном рабочем масштабе.
2. Радар мозаичный, из национальных сетей: кадр 31 августа дал данные в 15
   точках из 26; пусто — Москва, Томск, Новосибирск, Екатеринбург, Стамбул,
   Дубай, Каир, Алматы, Бали, Кейптаун, Мальдивы. Маска покрытия
   (`/v2/coverage/`) это подтвердила.

С 31 августа код стоял под `RAIN_OK = false`: пункт меню и строка правовой
информации прятались, запросов к RainViewer не было. Вырезан 15 сентября 2026
(волна 7а): итерация 32 плана миграции сверяет Swift с вебом, и слой под
выключенным флагом стал бы там ложным требованием.

**Коммит вырезки:** `bdb00eb`.

**Что нужно для возврата.**

- Поставщик, который отдаёт радар на z8–z15 и покрывает нужные страны. Ключом
  RainViewer чинится в лучшем случае граница зума, покрытие — нет. Перед
  возвратом перемерить обе границы тем же способом (плитка на z15 в
  нескольких городах, маска покрытия).
- Вставить код обратно: пункт меню — в `#mapLayersMenu` после «Мои места»;
  строку «Радар» — в панель карты после строки «Луна»; атрибуцию — в
  правовую информацию после Open-Meteo; ключ `rain: false` — в умолчание
  `mapLayers`; раздел слоя — перед «Отметки сохранённых точек на холсте»;
  подписку на `load` — после `lmap.touchZoomRotate.disableRotation()`; ветку
  `k === "rain"` — в обработчик кнопок меню слоёв.
- Ключи словаря вернуть во все четыре языка (ru, en, es, zh).
- Знак `rain` в `icons.js` не удалялся — им пользуется погода.
- Правила `.scope-menu button[hidden]` и `.lg-row[hidden]`, дописанные ради
  прятания, остались в CSS — они общие.

### Код

Пункт меню слоёв (строки 7393–7396):

```html
<!-- Осадки: радар, а не прогноз. Прогноз говорит «дождь», радар говорит
     «ливень пройдёт мимо через двадцать минут» — на съёмке это разные
     сведения, и переносить нельзя как раз тогда, когда важен второй -->
<button data-layer="rain"><span class="mk" data-ic="check"></span><span class="ic" data-ic="rain"></span><span data-i18n="layer.rain">Осадки</span></button>
```

Строка «Радар» в панели карты (7416–7418):

```html
<!-- Радар говорит «сейчас», но снимок сделан до десяти минут назад:
     без времени кадра это обещание, которое слой не держит -->
<div class="t-row" id="mRadarRow" hidden><span class="t-label" data-i18n="map.radar">Радар</span><span class="t-value" id="mRadar">—</span></div>
```

Атрибуция в правовой информации (8156–8157):

```html
<div class="lg-row" id="lgRadarRow"><span class="lg-k" data-i18n="lg.radar">Радар осадков</span>
  <span class="lg-v"><a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a></span></div>
```

Флаг и умолчание слоёв (13348–13366):

```js
/* Осадки временно сняты с карты (Алексей, 31 августа 2026). Две причины,
   обе замерены, а не предположены:
   1. Бесплатный кэш RainViewer отдаёт радар только до z7. С z8 и выше
      вместо осадков приходит серая плашка «Zoom Level Not Supported» —
      картинка одна и та же на весь мир, 1370 байт. Карта открывается на
      z15, то есть слой не работал ни на одном рабочем масштабе, а честно
      сообщал об этом ватермарком поверх города.
   2. Радар мозаичный, из национальных сетей, и дыр в нём больше, чем
      покрытия. Кадр от 31 августа: из 26 проверенных точек данные были в
      15; пусто — Москва, Томск, Новосибирск, Екатеринбург, Стамбул, Дубай,
      Каир, Алматы, Бали, Кейптаун, Мальдивы. Маска покрытия RainViewer
      подтверждает: это не ясная погода, это край мозаики.
   Слой без ключа не чинится: обе границы — политика поставщика. Код
   оставлен целиком, флага достаточно, чтобы вернуть его вместе с ключом
   RainViewer (тогда проверить заново обе границы — зум и покрытие). */
var RAIN_OK = false;
var mapLayers = (saved && saved.mapLayers) || { sun: true, moon: true, mw: false, rain: false };
if (mapLayers.rain === undefined) mapLayers.rain = false;   /* слой заведён позже прежних настроек */
if (!RAIN_OK) mapLayers.rain = false;   /* включённый прежде слой гаснет вместе с флагом */
```

Слой (15971–16031):

```js
/* ---------- Радар осадков ----------
   RainViewer: открытый каталог кадров без ключа. Отдаёт список снимков за
   последние два часа и ближайший прогноз; берём последний прошедший — это
   «сейчас», а не модель.

   Слой необязателен во всех смыслах: выключен по умолчанию, при отсутствии
   сети просто не появляется, и карта работает как работала. Условие
   бесплатного доступа — видимая атрибуция; она в «Правовой информации»
   вместе с CARTO и OSM. */
var rainTiles = null, rainFrame = null, rainHost = "", rainAt = 0;
function fetchRadar() {
  if (typeof fetch === "undefined" || rainFrame) return Promise.resolve();
  return fetch("https://api.rainviewer.com/public/weather-maps.json")
    .then(function (r) { return r.json(); })
    .then(function (j) {
      var past = j && j.radar && j.radar.past;
      if (!past || !past.length) return;
      rainHost = j.host || "https://tilecache.rainviewer.com";
      rainFrame = past[past.length - 1].path;
      rainAt = past[past.length - 1].time * 1000;
    }).catch(function () {});
}
/* Строка со временем снимка: она и есть честность слоя. Кадр обновляется
   раз в десять минут, и «сейчас» на карте — это всегда немного «только
   что» */
function renderRadarRow() {
  var row = $("mRadarRow"); if (!row) return;
  var show = !!(mapLayers.rain && rainAt);
  row.hidden = !show;
  if (!show) return;
  var mins = Math.max(0, Math.round((Date.now() - rainAt) / 60000));
  var d = new Date(rainAt);
  $("mRadar").textContent = fmt(d.getHours() * 60 + d.getMinutes())
    + (mins ? " · " + LANG.t("radar.ago", { n: mins }) : "");
}
function dropRain() {
  if (!lmap || !rainTiles) return;
  if (lmap.getLayer("rain")) lmap.removeLayer("rain");
  if (lmap.getSource("rain")) lmap.removeSource("rain");
  rainTiles = null;
}
function setMapRain(on) {
  mapLayers.rain = RAIN_OK && !!on;
  if (!lmap) return;
  dropRain();
  if (!mapLayers.rain) { renderRadarRow(); return; }
  fetchRadar().then(function () {
    renderRadarRow();
    if (!mapLayers.rain || !rainFrame || !lmap || !lmap.isStyleLoaded()) return;
    dropRain();
    /* 256 — размер плитки, 2 — цветовая схема, 1_1 — сглаживание и снег
       отдельным цветом. Полупрозрачно: радар кладётся на карту, а не вместо
       неё, и метки съёмки должны читаться сквозь ливень. Растровый слой
       поверх векторного стиля — движку это всё равно, источники смешиваются */
    lmap.addSource("rain", { type: "raster", tileSize: 256, maxzoom: 7,
      tiles: [rainHost + rainFrame + "/256/{z}/{x}/{y}/2/1_1.png"] });
    lmap.addLayer({ id: "rain", type: "raster", source: "rain",
      paint: { "raster-opacity": 0.62 } });
    rainTiles = true;
  });
}
```

Подписка на загрузку карты (16991–16993):

```js
/* Плитка приходит одна на всю колонку зумов, и проявлять её незачем:
   затухание только растягивало бы подмену масштаба. */
lmap.on("load", function () { if (mapLayers.rain) setMapRain(true); });
```

Прятание пункта меню и атрибуции под флагом (32884–32891):

```js
/* Пункт «Осадки» не отключается, а убирается: серый тумблер обещает, что
   слой есть и его когда-то дадут, а его нет — см. RAIN_OK у настроек слоёв */
if (!RAIN_OK) {
  var rainItem = $("mapLayersMenu").querySelector('[data-layer="rain"]');
  if (rainItem) rainItem.hidden = true;
  var rainCredit = $("lgRadarRow");
  if (rainCredit) rainCredit.hidden = true;   /* ссылка на поставщика, чьих плиток мы не берём */
}
```

Ветка в обработчике кнопок меню слоёв (32906–32908):

```js
if (k === "rain") setMapRain(mapLayers.rain);
else if (k === "mw") applyDate(viewMin);
else renderMap();
```

Ключи словаря — ru (492–495), en (2284–2287), es (3922–3925), zh (5395–5398):

```js
"lg.radar":      "Радар осадков",
"map.radar":     "Радар",
"radar.ago":     "{n} мин назад",
"layer.rain":    "Осадки",
```

```js
"lg.radar":      "Precipitation radar",
"map.radar":     "Radar",
"radar.ago":     "{n} min ago",
"layer.rain":    "Precipitation",
```

```js
"lg.radar": "Radar de precipitación",
"map.radar": "Radar",
"radar.ago": "hace {n} min",
"layer.rain": "Precipitación",
```

```js
"lg.radar": "降水雷达",
"map.radar": "雷达",
"radar.ago": "{n}分钟前",
"layer.rain": "降水",
```

## Старый блок света карточки

**Что делал.** Первый вид карточки съёмки был списком «ярлык — значение».
Группа «Свет и погода» в нём говорила: характер света на время съёмки и тени
(`cardSun`), небо и облачность по месту съёмки, закатный балл с цветом по
шкале, золотой час. Под группой строка доверия прогнозу: «прогноз надёжен» /
«на неделю» / «далеко» (`trustOf`) с припиской, что погода считается для
другого места, если точка съёмки далеко от места приложения (`placeFar`).

**Почему вырезан.** С переходом на новый вид карточки (`renderEventCard`,
docs/11_EVENT_CARD.md) старый вид прятался при каждом открытии, без
исключений: «Старый вид карточки — списки „ярлык — значение“ — не
показывается нигде». При этом `openCard` на каждом открытии считал для него
свет и тень (`cardSun` — второй раз, новый вид считает свой) и заполнял
спрятанные строки. Новый вид говорит свет и погоду своими блоками
(`renderDayTile`, `renderPanes`, `renderWxPane`). Вырезан 15 сентября 2026 (волна 7а), решение Алексея.

Расчёт `q` (качество неба по месту съёмки) оставлен: по нему живёт строка
`cdWarn` — «ждали заката, а прогноз обещает другое». Остальные группы старого
вида (`cdWhenGroup`, `cdDelvGroup`, `cdNotes`, `cdMoney`, `cdRefs`,
`cardTitle`/`cardSub`) в этой волне не трогались.

**Коммит вырезки:** `bdb00eb`.

**Что нужно для возврата.**

- Вернуть разметку в `#cardOverlay` после группы `cdWhenGroup` (перед
  `#cdWarn`), правило `.card-trust` — в CSS перед `.card-warn`.
- Вернуть `trustOf` (рядом с `qualityOf`) и `placeFar` (после `cardSun`).
- В `openCard` вернуть `sun = cardSun(s)` и заполнение строк на место
  укороченного расчёта `q`.
- Решить, где блок живёт: в `renderEventCard` старый вид прятался строками
  ниже; без нового места в новом виде возвращать нечего.
- Ключи словаря не удалялись: `card.lightWx`, `tele.light`, `tele.shadow`,
  `tele.sky`, `tele.sunset`, `tele.golden`, `trust.past`, `trust.sure`,
  `trust.week`, `trust.far`, `card.noDataDay`, `card.forecastFake`,
  `card.wxOtherPlace` — на месте во всех языках.

### Код

Разметка (8502–8512):

```html
<!-- Ради этого блока планировщик и существует: обычный календарь
     знает время, но не знает, какой свет в это время будет -->
<div class="g-label" id="cdLightLabel" data-i18n="card.lightWx">Свет и погода</div>
<div class="group" id="cdLightGroup">
  <div class="row"><span class="rl" data-i18n="tele.light">Свет</span><span class="rv" id="cdLight">—</span></div>
  <div class="row sep"><span class="rl" data-i18n="tele.shadow">Тени</span><span class="rv" id="cdShadow">—</span></div>
  <div class="row sep"><span class="rl" data-i18n="tele.sky">Небо</span><span class="rv" id="cdSky">—</span></div>
  <div class="row sep" id="cdSunsetRow"><span class="rl" data-i18n="tele.sunset">Закат</span><span class="rv" id="cdSunset">—</span></div>
  <div class="row"><span class="rl" data-i18n="tele.golden">Золотой час</span><span class="rv" id="cdGold">—</span></div>
</div>
<p class="card-trust" id="cdTrust">—</p>
```

CSS (5227):

```css
.card-trust { font-size: 11px; color: var(--ink-7); margin: 9px 4px 0; }
```

`trustOf` (10904–10910):

```js
function trustOf(d) {
  var days = Math.round((d - new Date().setHours(0,0,0,0)) / 86400000);
  if (days < 0) return LANG.t("trust.past");
  if (days <= 2) return LANG.t("trust.sure");
  if (days <= 6) return LANG.t("trust.week");
  return LANG.t("trust.far");
}
```

`placeFar` (26370–26377):

```js
/* Погода приходит на место, выбранное в приложении, а не на место съёмки:
   прогноз тянется одной точкой. Если точки разъехались — говорим об этом,
   а не выдаём чужую облачность за здешнюю. */
function placeFar(s) {
  var at = shootAt(s);
  if (at.lat == null) return false;
  return Math.abs(at.lat - LAT) > 0.35 || Math.abs(at.lon - LON) > 0.6;
}
```

Прятание в `renderEventCard` (27089–27090):

```js
$("cdLightLabel").hidden = true; $("cdLightGroup").hidden = true;
$("cdTrust").hidden = true;
```

Начало `openCard` (28536):

```js
var spec = genreSpec(s.type), sun = cardSun(s);
```

Заполнение в `openCard` (28623–28651):

```js
// Свет на время съёмки: характер, тени, небо
$("cdLight").textContent = sun.st.label + " · " + sun.st.light;
$("cdShadow").textContent = sun.shadow;

/* Небо и закатный балл — про место съёмки. `wxReal` знает только место
   приложения: у фотографа из Лобни свадьба в Сочи получала лобненские
   облака и лобненский балл заката, то есть ответ про другое небо */
var q = qualityOf(s.date), wx = dayWeather(s.date), real = wxReal[dkey(s.date)];
var skyAt = shootAt(s), skyRec = ptAt(skyAt, s.date), skyDay = skyRec && skyRec.day;
var skyWait = !skyDay && (ptOnWay(skyAt, s.date) || (!skyRec && ptReach(s.date)));
if (skyDay) { q = skyDay.q; real = skyDay; }
$("cdSky").textContent = skyWait ? "—" : QUAL[q].cond + " · " + (skyDay ? skyDay.cloud : wx.cloud) + "%";

var sc = real ? real.sunset : null;
if (skyWait) sc = null;
if (isFinite(sc) && sc !== null) {
  $("cdSunset").textContent = sunsetShort(sc) + " · " + sc + " / 100";
  $("cdSunset").style.color = sc >= 75 ? "#E2A44C" : sc >= 50 ? "#A8B49B" : sc >= 28 ? "#C0B8AA" : "#7C9CC4";
} else if (skyWait) {
  $("cdSunset").textContent = "—";
  $("cdSunset").style.color = "#8A8478";
} else {
  $("cdSunset").textContent = LANG.t(wxLive ? "card.noDataDay" : "card.forecastFake");
  $("cdSunset").style.color = "#8A8478";
}
$("cdGold").textContent = (sun.goldB === null || sun.set === null) ? "—" : range(sun.goldB, sun.blueB);

$("cdTrust").textContent = trustOf(s.date)
  + (placeFar(s) ? " · " + LANG.t("card.wxOtherPlace") : "");
```

## Старый вид карточки

**Что делал.** До перехода на карточку события (`renderEventCard`,
docs/11_EVENT_CARD.md) карточка съёмки была списком «ярлык — значение».
Заголовком стояло имя жанра и клиент (`cardTitle`/`cardSub`), ниже шли
группы: «Когда» — дата, время с длительностью и поясом, место одной строкой
от точки до улицы (`cdWhenGroup`); «Сдача материала» — статус и срок
(`cdDelvGroup`); «Референсы» — те же карточки, что в форме, но без крестика
удаления (`cdRefs`); «Заметки» — текст записи (`cdNotes`).

**Почему вырезан.** Новый вид прятал их все при каждом открытии, без
исключений и без ветвлений: строки стояли подряд в `renderEventCard`, а сама
она зовётся в конце каждого `openCard`. При этом `openCard` на каждом открытии
продолжал их заполнять — считать адрес со студией и залом, собирать сетку
референсов и вешать на неё обработчики, спрашивать пояс места. То же самое
говорят плитки нового вида: шапка события (`renderEvHead`), плитка дня
(`renderDayTile`), плитки места и сдачи (`renderPanes`), разворот маршрута
(`renderRouteFold`) и разворот референсов (`renderRefFold`). Вырезан
16 сентября 2026 (хвосты, заход В), решение Алексея 15 сентября.

**Что осталось жить рядом.** Строка `cdWarn` — «ждали закат, а прогноз обещает
другое» — стояла между `cdWhenGroup` и `cdDelvLabel`, но новым видом не
прячется и в фазе «до» видна. Она и её расчёт (`q`, `skyRec`, `want`, `bad`)
не тронуты. Строка денег старого вида (`cdMoneyBtn`, `cdMoneyGroup`,
`cdMoneySum`, `cdIncome`, `cdExpense`, `cdProfit`) в вырезке `8bacaa6` тоже
осталась — в решении Алексея 15 сентября её не было; спрошено отдельно,
16 сентября он сказал резать, и она ушла заходом Г (ниже своим подразделом).
Разворот референсов волны 5 (`18e825e`) живёт на `#rfGrid`, а не на `#cdRefs`,
и вырезки не касается.

**Коммит вырезки:** `8bacaa6`; строка денег — вырезка захода Г, 16 сентября
2026.

### Строка денег (вырезана заходом Г)

**Что делала.** Свёрнутая строка «Деньги» со сводной суммой; тап разворачивал
группу из трёх строк — «Доход», «Расходы», «Прибыль». Показывалась, только
если у съёмки заданы суммы (`hasMoney`).

**Почему вырезана.** Та же причина, что у остальных групп старого вида:
`renderEventCard` прятала её безусловно при каждом открытии карточки, а
`openCard` продолжала считать суммы и заполнять строки. Замер 16 сентября:
свадьба с гонораром 90 000 ₽ во всех трёх видах карточки и встреча — кнопка
`hidden`, `display: none`, при этом сводная сумма посчитана. То, что говорила
строка, говорит блок гонорара нового вида (`cdMoneyBlk`, ключи `pane.fee`,
`pane.minusExp`) — его вырезка не касается.

**Что нужно для возврата.**

- Разметку вернуть в `#cardOverlay` между `#cdGrown` и комментарием про
  удаление.
- В `openCard` вернуть заполнение сразу после блока `cdWarn`, до вызова
  `renderEventCard`.
- В `renderEventCard` вернуть прячущую строку рядом с `$("cardOrder").hidden`.
- Вернуть обработчик разворота — он стоял после обработчика `cdRenewGo`.
- Вернуть CSS `.card-money` и `.card-money[hidden]` в общее правило с
  `.g-label[hidden]`.
- Вернуть четыре ключа словаря в четыре языка: `card.money`, `card.income`,
  `card.expense`, `card.profit`. `card.none` не трогать — его читают и другие
  места.

Разметка (8710–8716):

```html
<!-- Деньги не первое, что видишь: строка сворачивается (04_ANTI_GOALS) -->
<button class="card-money" id="cdMoneyBtn" hidden><span class="rl" data-i18n="card.money">Деньги</span><span class="rv" id="cdMoneySum">—</span></button>
<div class="group" id="cdMoneyGroup" hidden>
  <div class="row sep"><span class="rl" data-i18n="card.income">Доход</span><span class="rv" id="cdIncome">—</span></div>
  <div class="row sep"><span class="rl" data-i18n="card.expense">Расходы</span><span class="rv" id="cdExpense">—</span></div>
  <div class="row"><span class="rl" data-i18n="card.profit">Прибыль</span><span class="rv" id="cdProfit">—</span></div>
</div>
```

Заполнение в `openCard` (28598–28610):

```js
// Деньги — свёрнуты и появляются, только если суммы заданы
var inc = sessionIncome(s), exp = +s.expense || 0;
var hasMoney = inc > 0 || exp > 0;
$("cdMoneyBtn").hidden = !hasMoney;
$("cdMoneyGroup").hidden = true;
$("cdMoneyBtn").classList.remove("open");
if (hasMoney) {
  var cc = sessionCurrency(s);
  $("cdMoneySum").textContent = money(inc - exp, cc);
  $("cdIncome").textContent = money(inc, cc);
  $("cdExpense").textContent = exp ? money(exp, cc) : LANG.t("card.none");
  $("cdProfit").textContent = money(inc - exp, cc);
}
```

Обработчик разворота (28789–28793):

```js
$("cdMoneyBtn").addEventListener("click", function () {
  var open = $("cdMoneyGroup").hidden;
  $("cdMoneyGroup").hidden = !open;
  this.classList.toggle("open", open);
});
```

CSS (6280–6287):

```css
.card-money {
  display: flex; justify-content: space-between; align-items: center;
  width: 100%; margin-top: 30px; padding: 14px 15px; min-height: 52px;
  background: var(--sheet); border: none; border-radius: 14px; corner-shape: squircle;
  font-family: inherit; font-size: 16px; color: var(--ink); cursor: pointer;
}
.card-money.open { border-radius: 14px 14px 0 0; corner-shape: squircle; }
.card-money.open + .group { border-radius: 0 0 14px 14px; }
```

Прячущая строка в `renderEventCard` (27091–27094):

```js
/* Последний остаток старого вида — строка денег. Она так же не
   показывается нигде: всё, что говорил старый вид, говорят плитки
   (archive/ARCHIVE.md, «Старый вид карточки») */
$("cdMoneyBtn").hidden = true; $("cdMoneyGroup").hidden = true;
```

**Что нужно для возврата.**

- Вернуть разметку: `cardTitle`/`cardSub` — сразу после панели кнопок
  `.card-bar-r`, перед комментарием «Карточка события»; остальные группы — в
  `#cardOverlay` после `</div><!-- /stack-wrap -->`, причём `cdWhenGroup` до
  строки `#cdWarn`, а `cdDelvLabel` и ниже — после неё.
- Вернуть в `openCard` объявления `spec`, `dur`, `end` (они были вырезаны
  вместе с последними их читателями) и заполнение — код ниже, в том же
  порядке: заголовок сразу за `wasAt`, дата и место перед расчётом `q`,
  сдача, референсы и заметки — сразу после блока `cdWarn`.
- Вернуть прячущие строки в `renderEventCard` перед `renderBinBtn()` — иначе
  старый вид покажется поверх нового.
- Вернуть CSS: правило `.card-notes` (стояло сразу за `.card-warn`),
  `#cdRefs .kill` (за `.quest-row:disabled`) и `.card-notes[hidden]` в общее
  правило с `.g-label[hidden]`.
- Вернуть семь ключей словаря в четыре языка: `card.when`, `card.date`,
  `card.time`, `card.place`, `card.status`, `card.meetTopic`, `card.noClient`.
  Остальные ключи разметки (`card.shootPoint`, `card.delivery`, `card.refs`,
  `card.notes`, `card.byDate`, `plan.meet`, `plan.event`) на месте: их читают
  и другие места.

### Код

Заголовок и подзаголовок, разметка (8500–8501):

```html
<h2 class="form-title" id="cardTitle" data-i18n="card.shootPoint">Съёмка</h2>
<p class="form-sub" id="cardSub">—</p>
```

Группы, разметка (8709–8729; строка `#cdWarn` между ними — живая, приведена
для места вставки):

```html
<div class="g-label" id="cdWhenLabel" data-i18n="card.when">Когда</div>
<div class="group" id="cdWhenGroup">
  <div class="row"><span class="rl" data-i18n="card.date">Дата</span><span class="rv" id="cdDate">—</span></div>
  <div class="row sep"><span class="rl" data-i18n="card.time">Время</span>
    <span class="rv"><span id="cdTime">—</span><span class="sub" id="cdDur">—</span><span class="sub tz-tag" id="cdTz" hidden></span></span>
  </div>
  <div class="row sep" id="cdPlaceLine"><span class="rl" data-i18n="card.place">Место</span><span class="rv" id="cdPlace">—</span></div>
</div>

<p class="card-warn" id="cdWarn" hidden></p>

<div class="g-label" id="cdDelvLabel" data-i18n="card.delivery">Сдача материала</div>
<div class="group" id="cdDelvGroup">
  <div class="row" id="cdDelvRow"><span class="rl" data-i18n="card.status">Статус</span><span class="rv" id="cdDelv">—</span></div>
</div>

<div class="g-label" id="cdRefsLabel" data-i18n="card.refs">Референсы</div>
<div class="ref-grid" id="cdRefs"></div>

<div class="g-label" id="cdNotesLabel" data-i18n="card.notes">Заметки</div>
<p class="card-notes" id="cdNotes"></p>
```

CSS (`.card-notes` — 5448–5452, `#cdRefs .kill` — 6346–6347, и одно слово из
общего правила 6294–6295):

```css
.card-notes {
  font-size: 15px; color: var(--ink-2); line-height: 1.5;
  background: var(--sheet); border-radius: 14px; corner-shape: squircle; padding: 14px 15px;
  white-space: pre-wrap; word-break: break-word;
}

/* В карточке референсы только смотрят: удаление живёт в форме */
#cdRefs .kill { display: none; }

/* display перебивает hidden — прячем явно (грабли из DECISIONS) */
.card-money[hidden], #cardOverlay .group[hidden], #cardOverlay .row[hidden],
.card-notes[hidden], .g-label[hidden], .card-warn[hidden] { display: none; }
```

Прячущие строки в `renderEventCard` (27123–27129; строка денег осталась в
коде, приведена целиком ради порядка):

```js
// Старый вид карточки — списки «ярлык — значение» — не показывается нигде
$("cardTitle").hidden = true; $("cardSub").hidden = true;
$("cdWhenLabel").hidden = true; $("cdWhenGroup").hidden = true;
$("cdDelvLabel").hidden = true; $("cdDelvGroup").hidden = true;
$("cdNotesLabel").hidden = true; $("cdNotes").hidden = true;
$("cdMoneyBtn").hidden = true; $("cdMoneyGroup").hidden = true;
$("cdRefsLabel").hidden = true; $("cdRefs").innerHTML = "";
```

Заполнение в `openCard`. Заголовок (28569–28582; `meet`/`soft` остались в
коде — их читает кнопка «Назначить съёмку»):

```js
var spec = genreSpec(s.type);
var dur = s.dur || 90, end = s.end != null ? s.end : s.min + dur;

/* Встреча — та же карточка, но заголовком «Встреча»: жанр уходит в
   подзаголовок, потому что он тут предмет разговора, а не вид работы */
var meet = isMeet(s), soft = notWork(s);
/* Заголовок брал `s.type` напрямую — это работало, пока жанр был русским
   словом. После разделения кода и имени он показывал бы «wedding»:
   перевод вскрывает такие места сразу, потому что имя видно на экране. */
$("cardTitle").textContent = soft ? LANG.t(meet ? "plan.meet" : "plan.event") : typeName(s);
$("cardSub").textContent = soft
  ? (s.contact ? s.contact + " · " + shortType(s).toLowerCase()
               : LANG.t("card.meetTopic", { genre: shortType(s).toLowerCase() }))
  : (s.contact || LANG.t("card.noClient"));
```

Дата, время, пояс и место (28625–28654):

```js
$("cdDate").textContent = wdShort(s.date) + " · " + dMon(s.date);
$("cdTime").textContent = range(s.min, end);
/* Время карточки — местное время съёмки. Когда оно расходится с часами
   телефона, рядом стоит пояс: иначе «18:00» читается как своё */
var cdTz = $("cdTz");
if (cdTz) {
  var atTz = shootAt(s);
  var tzt = tzTag(atTz.lat, atTz.lon, s.date);

  cdTz.textContent = tzt;
  cdTz.hidden = !tzt;
}
$("cdDur").textContent = durLabel(dur);
/* Строка места в карточке говорит адрес целиком: точка, город, улица.
   Ради этого адрес и доезжает до записи — иначе он лежал бы в закладке,
   где фотографу его не видно в момент выезда. */
/* Зал стоит сразу за именем студии и до города: «Томсон, Сфера, Томск,
   Красноармейская 101а» — так адрес читается от частного к общему, как его
   и произносят вслух */
var pStudio = studioById(s.studioId);
var pHall = "";
if (pStudio && s.hallId && Array.isArray(pStudio.halls)) {
  for (var hi = 0; hi < pStudio.halls.length; hi++) {
    if (pStudio.halls[hi].id === s.hallId) { pHall = pStudio.halls[hi].name || ""; break; }
  }
}
var pLine = [placeText(s), pHall, s.place && s.placeTown ? s.placeTown : "", s.placeAddr || ""]
  .filter(Boolean).join(", ");
$("cdPlaceLine").hidden = !pLine;
$("cdPlace").textContent = pLine;
```

Сдача, референсы, заметки (28673–28703):

```js
// Сдача материала — только у жанров, где есть что сдавать
var hasDelv = spec.delivery !== false;
$("cdDelvLabel").hidden = !hasDelv;
$("cdDelvGroup").hidden = !hasDelv;
if (hasDelv) {
  var ds = deliveryState(s), dd = deadlineDate(s);
  $("cdDelv").textContent = ds.label + (dd && !s.delivered
    ? " · " + LANG.t("card.byDate", { d: dMon(dd) }) : "");
  $("cdDelv").style.color = ds.color;
}

// Референсы — те же карточки, что в форме, но без крестика удаления
var refs = sessionShots(s);
$("cdRefsLabel").hidden = !refs.length;
$("cdRefs").innerHTML = refs.map(function (r, i) {
  if (r.k === "link") {
    return '<button type="button" class="ref-card link" data-i="' + i + '">'
      + '<span class="host">' + refHost(r.url) + "</span>"
      + '<span class="path">' + refTail(r.url) + "</span></button>";
  }
  return '<button type="button" class="ref-card" data-i="' + i + '">'
    + refImg(r) + "</button>";
}).join("");
$("cdRefs").querySelectorAll(".ref-card").forEach(function (b) {
  b.addEventListener("click", function () { openRef(refs[+b.dataset.i]); });
});

$("cdNotesLabel").hidden = !s.notes;
$("cdNotes").hidden = !s.notes;
$("cdNotes").textContent = s.notes || "";
```

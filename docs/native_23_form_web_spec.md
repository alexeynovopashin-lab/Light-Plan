# Iteration 23 — web event form as the porting reference

Written 2026-09-25 by an iteration-23 subagent. Read from code at `bbfa16f`
(last commit touching `beta/index.html`, 2026-09-24), not measured on screen.
The web is frozen as the reference, so line numbers hold. All line numbers
refer to `beta/index.html` unless marked `lang.js`, `DECISIONS`, `12_CARD`
(`docs/12_CARD_ARCHITECTURE.md`) or a Swift file. No CSS file exists: all
styling is inline `<style>` in index.html.

Native names: `Genre.swift`, `Records/Session.swift`, `Entities.swift` in
`native:Packages/LightPlanDomain/Sources/LightPlanDomain/`.

## 1. Genres and groups — 12 genres, 4 groups (not 11)

`ALL_GENRES` (L25134) holds **12** codes in chip order: portrait, wedding,
party, lovestory, family, animals, landscape, architecture, street, report,
product, ad. The plan's «11 genres» is the pre-`animals` count: comment
L1110-1112 still says «у десяти из одиннадцати», and `12_CARD` §«Группа 2»
(L45-50) lists only Портрет · Лавстори · Семья. Native `Genre` (12 cases,
`Genre.swift` L10-12) is right.

Genre table `GENRE` (L25162-25189), group map `GENRE_GROUP` (L25193-25198),
group table `GROUP` (L25199-25211), persons `GENRE_PERSONS` (L25275-25279).
Native already mirrors them one to one: `Genre.spec` (L21-34), `Genre.group`
(L39-44), `GenreGroup.spec` (L187-192), `Genre.persons` (L56-59), and the
field predicate table is already ported as `Rules/FormShape.swift`
(`FormShape.shows`, same 15 rows as web `FORM_FIELDS` L26165-26197).

| genre | group | `dur` min (L25168-25188) | client | delivery | route seeded | persons | extra |
|---|---|---|---|---|---|---|---|
| portrait | people | 60 | yes | yes | no | — | — |
| lovestory | people | 90 | yes | yes | no | — | — |
| family | people | 90 | yes | yes | no | — | — |
| animals | people | 60 | yes | yes | no | — | `breed` |
| wedding | event | 480 | yes | yes | yes (`route:true`) | bride, groom | — |
| party | event | 240 | yes | yes | yes | celebrant | — |
| architecture | client | 120 | yes | yes | no | — | — |
| report | client | 180 | yes | yes | no | — | — |
| product | client | 180 | yes | yes | no | — | `models` |
| ad | client | 240 | yes | yes | no | — | `models` |
| landscape | own | `null` = by light | no | no | no | — | — |
| street | own | 180 | no | no | no | — | — |

`GROUP` flags: event `{route:"always", pack, guests, prepay, org}`; people
`{route:"opt", pack, prepay}`; client `{route:"opt", org, prepay, order}`;
own `{route:"off", prepay}`. Unknown genre falls back to `{delivery, client,
dur:90, pay:[hourly,flat]}` and group `people` (L25822-25826).

`genreSpec(g)` (L25825-25833) derives `route = group.route === "always"`
unless the genre sets it, and `routeOpt = group.route === "opt"`. **`routeOpt`
is never read** (grep: only L25832) — «opt» and «off» behave identically; see
Traps.

### 1.1 Genre × form block matrix (code, `FORM_FIELDS` L26165-26197)

`•` shown, `—` hidden, `M` shown only in shoot mode (hidden in a meeting),
`s` seeded with 3 empty route rows on a new record (`applyGenreShape`
L26240-26243, `seedRoute` L26676-26678). «Place/route», «Notes+kit+playlist»,
«Genre», «Time» are shown for every genre and mode (no rule hides them;
the place ways row and route list hide in meeting mode, L26606, L26631-26632).

| genre (group) | who label | name+tel (`fContact`,`fClientTel`) | P1 name+tel | P2 name+tel | breed | org row | contact person+tel (`fPerson`,`fPhone`) | guests | route | order (brief, docs) | models | wish | pay | prepay | delivery | refs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| portrait (people) | Клиент | • | — | — | — | — | — | — | opt | — | — | M | M | M | M | M |
| lovestory (people) | Клиент | • | — | — | — | — | — | — | opt | — | — | M | M | M | M | M |
| family (people) | Клиент | • | — | — | — | — | — | — | opt | — | — | M | M | M | M | M |
| animals (people) | Клиент | • | — | — | M | — | — | — | opt | — | — | M | M | M | M | M |
| wedding (event) | Пара | — | • невеста | • жених | — | • Организатор | — | M | s | — | — | M | M | M | M | M |
| party (event) | Пара* | — | • виновник | — | — | • Организатор | — | M | s | — | — | M | M | M | M | M |
| architecture (client) | Заказчик | — | — | — | — | • Заказчик | • | — | opt | M | — | M | M | M | M | M |
| report (client) | Заказчик | — | — | — | — | • | • | — | opt | M | — | M | M | M | M | M |
| product (client) | Заказчик | — | — | — | — | • | • | — | opt | M | • | M | M | M | M | M |
| ad (client) | Заказчик | — | — | — | — | • | • | — | opt | M | • | M | M | M | M | M |
| landscape (own) | (group hidden) | — | — | — | — | — | — | — | opt† | — | — | M | M | M | — | M |
| street (own) | (group hidden) | — | — | — | — | — | — | — | opt† | — | — | M | M | M | — | M |

\* Who-group heading is `LANG.t("who." + group)` (L26236; `lang.js` L1126-1129:
event «Пара», people «Клиент», client «Заказчик», own «клиент» — lower-case,
never visible because own hides the group). Party therefore reads «Пара» over
a single «Имя · виновник торжества» field — a wording gap, not a rule.
† `own` is declared `route:"off"` but nothing reads it: landscape and street
get the same «＋ Точка» as people (Trap T1).
Group «Who» (`fWhoLabel`+`fWhoGroup`) hides entirely when `!sp.client`
(L26178). `fModels` has no meet check (L26193) but lives inside
`fOrderGroup`, which is hidden in a meeting — native `FormShape` copies this.
The `rep-blk` toggles (§8) are not in `FORM_FIELDS`; they are driven by the
repeat rule.

### 1.2 Code vs `12_CARD` «Матрица полей» (L120-161) — disagreements

| # | doc says | code does | lines |
|---|---|---|---|
| D1 | Group 2 = Портрет, Лавстори, Семья (11 genres total) | + `animals` in `people`, 12 genres | L25179, L25195 |
| D2 | «Организация, контактное лицо»: event `—` | event shows the org row, labelled «Организатор»; the doc's own prose (L38-41) agrees with code, its table does not | L25203, L26185, L26233 |
| D3 | Гости: event `( )` collapsed | shown open (stepper) for event, no fold | L26188 |
| D4 | Таймлайн: own `—` | own can add points like people (`routeOpt` dead) | L25832, L26631 |
| D5 | Several blocks `( )` collapsed by default (studio, trip, timeline, docs, models, refs, notes) | only payment folds (`fPayFold`/`payFolded`); nothing else collapses | L9512-9516, L26735 |
| D6 | «Порядок блоков» (L185-204): Жанр → Когда → Кто → Где → Сколько → Срок, then folded extras | Жанр → Кто → Время → Место → Заметки → Заказ → Погода → Оплата → Сдать → Референсы. Comment L9226-9227: «Время отделено от жанра: между ними встал клиент» — deliberate | §2 |
| D7 | No weather/light block in the matrix («Свет — условие», L163-174) | `fWishLabel`/`fWishGroup` (weather wish chips) shown for every genre in shoot mode | L9492-9495, L26168 |
| D8 | Модели `( )` for group 3 | only product and ad (`sp.models`); matches the doc's «поправки жанров» (L147-152), not the table cell | L26193 |
| D9 | «Имена, телефон» • for people and event | event shows P1/P2 pairs instead of one name+phone line; people show one line | L26180-26183 |

## 2. Visual layout, top to bottom (markup L9143-9603)

`#formOverlay` is a full-screen sheet sliding up (`.overlay` L6754-6760:
`background: var(--surface)`, `padding: 0 24px 40px`, `translateY(101%)` →
`none` over 0.42 s `cubic-bezier(0.25,1,0.4,1)`). One scroll column; no
sections fold except payment.

| # | block (heading, `lang.js` key) | ids | lines | shown when |
|---|---|---|---|---|
| 0 | sticky bar: ✕ `#formBack` (aria `form.cancel`), ✓ `#fSave` (aria `form.save`) | `.form-bar` | L9144-9151 | always |
| 1 | title `#formTitle` («Новая съёмка» `plan.newShoot`, text swapped per mode, §5), sub `#formSub`, `#savedNote` | | L9152-9154 | always |
| 2 | draft strip «Черновик восстановлен · Начать заново» | `#draftNote`, `#fDraftReset` | L9161-9164 | form raised from a draft (§6) |
| 3 | overlap warning (out of scope) | `#wishWarn` | L9170 | overlap found |
| 4 | **Жанр** `form.genre` + gear «Мои жанры» | `#fGear`, chips `#fType` | L9174-9184 | always |
| 5 | **Клиент / Пара / Заказчик** `who.<group>` | `#fWhoGroup`: `fContact`, `fClientTel`, `fBreed`, `fP1Name`, `fP1Tel`, `fP2Name`, `fP2Tel`, `fOrgRow`, `fPerson`, `fPhone`, `fGuestsRow`, `rep-blk[client]` | L9188-9224 | §1.1 |
| 6 | nesting warning (route, out of scope) | `#fNestWarn` | L9231 | on save attempt |
| 7 | **Время** `form.time`: Начало (date cap + time cap, hint `#fWhenHint`, `#fTzTag`), date grid, H/M wheels; Конец (date cap + time cap, duration `#fDurVal`), date grid, H/M wheels; repeat rows | `fStart…`, `fEnd…`, `fRepRow`, `fRepNRow`, `fRepNPick`, `fRepSum` | L9232-9293 | always |
| 8 | **Место и адрес** `form.placeAddr` → «Маршрут дня» `card.route` when > 1 point (L26602) — OUT of scope, keep slot | `fCity`, `fTripRow`, `fRoadRow`, `fLinkRow`, hall/stop wheels, `fRouteList`, `fPlaceWays` (Место / Фотостудия / Геопозиция), `fRouteAdd` «＋ Точка», `rep-blk[route]` | L9305-9425 | always (ways/list hidden in meet) |
| 9 | **Заметки** `card.notes`: textarea, «Оборудование» row (out of scope), «Плейлист» toggle + wheel (out of scope) | `fNotes`, `fKitRow`, `fMusicRow`, `fMusicPick`, `rep-blk[notes/kit/playlist]` | L9430-9464 | always; playlist row only if a playlist list exists |
| 10 | **Заказ** `form.order`: brief, models, documents (out of scope) | `fOrderGroup`: `fBrief`, `fModels`, `docKinds`, `docGrid`, `docFileBtn`, `docLink`, `rep-blk[brief/docs]` | L9471-9490 | group `client`, shoot mode |
| 11 | **Нужна погода** `form.wish` chips | `fWish`, `rep-blk[wish]` | L9492-9496 | shoot mode |
| 12 | **Оплата** `form.pay` + gear «Ставка и пакеты» (`#fPayGear`) — OUT of scope | `fPayGroup` (fold row `fPayFold`, body `fPayBody`) | L9502-9568 | shoot mode |
| 13 | **Сдать материал** `form.deliver`: dial 0-6, «Материал сдан» toggle — OUT of scope | `fDelvGroup`, `fDelvDial`, `fDone`, `rep-blk[delivery]` | L9571-9583 | `sp.delivery`, shoot mode |
| 14 | **Референсы** `card.refs`: «Мудборд» row + strip — OUT of scope | `fRefsGroup`, `fMbRow`, `fMbStrip`, `rep-blk[refs]` | L9590-9600 | shoot mode |
| 15 | «Удалить» danger button — OUT of scope | `#fDelete` | L9602 | editing only |

### 2.1 Placeholders (markup value → `lang.js` key, RU line)

| field | placeholder | key (`lang.js`) |
|---|---|---|
| `fContact` | overwritten per group by `whoHint.<group>` (L26225): people «Имя клиента», event «Имена и телефон», client «Организация и контактное лицо» | `form.clientName` L1016 in markup; `whoHint.*` L1130-1133 |
| `fClientTel`, `fP1Tel`, `fP2Tel`, `fPhone` | «Телефон» | `form.phone` L1017 |
| `fBreed` | «Порода или вид» in markup, «Порода или вид животного» from dict | `form.breedPh` L1052 |
| `fP1Name`, `fP2Name` | «Имя невесты/жениха» in markup, replaced by «Имя · невеста» (`form.namePh` with `{role}` lower-cased, L26231-26232) | `form.namePh` L1020, `person.*` L1138-1140 |
| `fPerson` | «Контактное лицо» | `form.person` L1018 |
| `fOrgName` (row value) | «выбрать» until an org is picked | `form.pick` L1019 |
| `fOrgLabel` | `orgRole.<group>`: event «Организатор», else «Заказчик» | L1134-1137 |
| `fGuestsVal` | «—» placeholder; shows «нет» (`card.none` L757) when 0 | `form.guestsAria` L1026 |
| `fNotes` | «Оборудование, договорённости, заметки» | `form.notesPh` L1021 |
| `fCity` | «Город» | `form.city` L1014 |

### 2.2 Sizes and tokens that matter (inline CSS)

| element | rule | lines |
|---|---|---|
| sticky bar | `padding: 46px 0 8px`; `background: var(--bar)` + `backdrop-filter: blur(20px) saturate(1.5)` — **glass imitation** | L6806-6811 |
| ✕ / ✓ buttons | 40×40 circle; ✕ `var(--overlay-3)` + `blur(14px) saturate(1.5)` + `inset 0 1px 0 var(--glass-shine)` — **glass imitation**; ✓ solid `var(--ink)` on `var(--surface)` glyph; icon 18 px, stroke 2.2 | L6823-6835 |
| title | 30 px, weight 650, letter-spacing −0.5 px, margin-top 10 | L7362 |
| sub / saved note | 14 px `--ink-4` / 13 px `--ink-4` | L7363, L7421 |
| draft strip | flex, `padding 10px 14px`, `--sheet-3`, radius 12, 13 px `--ink-3`; button 13 px 600 `--brass` | L7422-7431 |
| group heading `.g-label` | 10 px, uppercase, letter-spacing 1.2 px, weight 600, `--ink-7`, margin `30px 4px 9px` | L6840-6844 |
| group `.group` | `--sheet`, radius 14 squircle, clip | L6845 |
| separator `.sep` | not a line: `inset 0 1px 0 var(--surface)` — a 1 px slit of page colour (memory: «separators are slits») | L6846 |
| row `.row` | `padding 14px 15px`, `min-height 52px`, font 16, gap 12 | L6849-6854 |
| value capsule `.rv-v` | pill `radius 999px`, `padding 5px 12px`, `--field`, 16 px tabular; open → `rgba(226,164,76,.16)` + `--brass`; min-width 72 inside `.caps` (gap 6) | L6924-6942 |
| row subline `.sub`/`.sub2` | 11 px `--ink-6`, max-width 190 under values | L6947-6951 |
| text inputs in group | 16 px, `padding 15px`, no background; placeholder `--ink-8` | L7035-7043 |
| textarea | min-height 92, line-height 1.5 | L7062 |
| genre grid `.tool-grid` | 4 columns, gap 6; tile padding `11px 2px 9px`, radius 12, label 10 px `--ink-5`, icon 22 px stroke 1.5; active `--brass` on `--press-warm`; subgenre drop `--press`, radius 14 | L5627-5654 |
| chips padding in group | `13px 15px 15px` | L6847 |
| gear | padding 8, `--ink-4`, icon 21 px stroke 1.6 | L7356-7361 |
| pay-row (guests) | `padding 13px 15px`, min-height 50; key 15 px | L7065-7069 |
| stepper | buttons 38×34 radius 10 `--press`, 19 px; field 58 px wide, radius 9, `--field` | L7264-7280 |
| toggle | 51×31, radius 20, off `--rail-2`, on `--brass`, knob 27 px white | L5364-5373 |
| inline wheel | height 102 = 3 rows × 34; band `rgba(120,120,128,.16)` radius 9 at top 34; narrow wheel 66 px; mask 24 %/76 % | L5590-5612, L7009-7013 |
| inline expand | `max-height 0 → 136` (wheels), `→ 420` (date grid), 0.34 s | L6995-7002 |
| date grid padding | `4px 10px 12px` | L6964 |

Dark tokens (L1278-1345): surface `#0F0E0C`, sheet `#17150F`, field `#1C1A16`,
ink `#EFEAE0`, ink-4 `#8A8478`, brass `#E2A44C`; light overrides L1369-1413.

**Glass in the form**: only the sticky bar and ✕ use `backdrop-filter`;
groups, capsules, chips are flat fills → `.glassEffect` for the bar buttons only.

## 3. Time group: date grid, hour and minute wheels

State (module vars, L20267-20300): `fDate` (Date, day only), `fMin` (minutes
from local midnight of `fDate`, may be ≥ 0 only), `fDur` (minutes), `fAuto`
(time proposed by light/rule, may be moved by a genre change), `fLight`
(time came from the sun, never rounded). **End is not stored**: end =
`fMin + fDur`, end date = `fDate + floor((fMin+fDur)/1440)` (`endDayOff`,
`endDate`, `endMinOfDay`, L24498-24502).

Rows (L9238-9275) each hold two capsules: date `fStartDate`/`fEndDate` →
text `dMonShortYear` («8 авг 2026», year always, L27540-27544), time
`fStartVal`/`fEndVal` → `fmt(m)` (L10836, obeys the 12/24 setting). Under
start: `fWhenHint` = light window «label a – b», or `form.whenNoPlace` when the
place has no coordinates, or `day.noWindow` (L27547-27549); `fTzTag` for a
foreign time zone. Under end: `fDurVal` = `durLabel(fDur)` + «· на
следующий день» / «через N дн» when the end crosses midnight (L27554-27556).
Form subtitle `#formSub` explains where the time came from (L27559-27570):
`form.subMeet` in a meeting, `form.subNoPlace`, `form.subNoWindow`,
`form.subFromLight`, `form.subLongerThanLight`, `form.subWindow`.

Only one picker is open at a time: `ROWS` (L24635-24642), `toggleRow`
(L24672-24720), `closeRows` (L24652-24659). Open capsule gets class `open`
(brass tint).

| picker | web values | limits | on change | lines |
|---|---|---|---|---|
| start date grid `#fwSDate` | month grid Mon-first, header «Месяц ГГГГ» ▾ toggles a 12-month grid; arrows step months (years in month mode) | **none** — past and any future date allowed | `fDate = d`, `fMin`,`fDur` kept (end moves with it) | L24406-24469, L24681-24687 |
| start hour `#fwSH` | `"00"…"23"` always (L24357) — **24 h even when the app shows 12 h** | 0-23 | `fMin = h*60 + min`, `fAuto=fLight=false`, duration kept | L24621-24626 |
| start minute `#fwSM` | `0, step, 2·step …` + the current minute if off-step (so 19:38 from the sun is shown) | step from settings | same | L20296-20301, L24361-24372 |
| end date grid `#fwEDate` | same grid | min = start date, max = start + 7 days (`MAX_DUR = 10080`); out-of-range days are rendered disabled, not clamped after | `setEndFrom(dayDiff, endMinOfDay)` | L24688-24697, L24470-24476 |
| end hour / minute `#fwEH`/`#fwEM` | as start | — | `setEndFrom`: `d = off*1440 + minOfDay − fMin`; while `d < 15` add 1440 (end before start = next day); `fDur = min(d, 10080)`; **`rememberGenre("dur", fDur)`** | L24505-24510, L24627-24631 |

Step setting (`#stepSeg` L8446-8451, handler L35045-35051): **5 / 10 / 30
minutes, default 5** (`STEPS` L20281, `timeStep` L20282, persisted as
`saved.timeStep`). Changing it refills only the minute wheels; stored times
are not rounded. The plan's and DECISIONS' «шаг 15 и 30» (DECISIONS L21200)
does not match code — flag to Alexey; the native wheel's `minuteInterval`
should take 5/10/30.

`snapMin(m) = round(m/step)*step` (L20293) rounds a passed-in start unless
it came from light (`openForm` L30496).

12/24 h: `clockPref` `auto|24|12` (L10815-10828), `is12()` → `fmt` uses
`Intl` with `hour12:true` and a non-breaking space before AM/PM; `hm24` is
the machine form. The wheels ignore it (always 00-23). DECISIONS L21208-21211
leaves «set the system wheel's locale explicitly» for iteration 23 — the web
gives no reference to copy for 12 h wheels.

The web wheel (3 rows × 34 px, `syncWheel` L24379-24391) is replaced by the
system wheel (DECISIONS L21189-21211); match values, limits and step only.

Initial time on a new record (`applyGenrePreset` L26714-26776), in order:
1. duration: meeting → 60; else `genreDur(g)` = remembered `genrePrefs[g].dur`
   or `GENRE[g].dur`; `null` (landscape) → length of the light window rounded
   to `DURS = [30,60,90,120,180]` (`nearestDur`, 90 when the window is poor).
2. start, only while `fAuto` and not a meeting: event-day genres (wedding,
   party — `sp.route`) or a day with no light window → **12:00** (`fLight =
   false`); otherwise the start of the golden window `round(w.a)` (`fLight =
   true`); if `fDur` is longer than the window (and ≤ 1440) the start moves
   back so the window ends the shoot: `fMin = round(w.b) − fDur`, wrapped
   into 0…1439.

## 4. How the form opens — `openForm(d, startMin, idx, fromLight, kind)` L30471-30570

`idx != null` → edit `sessions[idx]` (`fAuto = false`, `fillFormFrom`
L30356-30470; kind taken from the record: `notWork(s) ? "meet" : "shoot"`,
L30479). Otherwise new: `fAuto = startMin == null || fromLight`, `fLight =
fromLight`, `fMin = fromLight ? round(startMin) : snapMin(startMin)`, all
fields cleared (L30496-30530), `fId = newId()` at open (the moodboard folder
hangs on it before save), place = home city `myCity() || geoCity`, no point.
**Genre is not reset**: `shootType` is a module var (initial `"portrait"`,
L20267) and a new form opens with the last genre used; the subgenre is reset
(L30510). If that genre was switched off in «Мои жанры», `renderGenres`
swaps to the first enabled one (L26837-26838).

| entry | call | day | start | mode | lines |
|---|---|---|---|---|---|
| planner «＋» `#planAdd` | `openForm(calSel, round(dayWindow(calSel).a), null, true)` | selected calendar day | start of that day's light window, `fromLight` | shoot | L34560-34562 |
| year view «＋» `#yearAdd` | same, closes the year overlay first | `calSel` | light window | shoot | L34508-34511 |
| day actions «Съёмка» `#planDay` | same as `#planAdd` | `calSel` | light window | shoot | L34104 |
| day actions «Встреча» `#planMeet` | `openForm(calSel, snapMin(840), null, false, "meet")` | `calSel` | **14:00** («в кафе идут к двум») | meet | L34107-34109 |
| «Свет» screen «Запланировать съёмку» `#planToday` | `openForm(selDate, round(SUN.goldB || viewMin), null, true)` | the day viewed on the light screen | golden-window value, else the scrubbed minute | shoot | L7802-7806, L34103 |
| tap on an hour slot → fan «Съёмка / Встреча / Занять» | `openForm(d, at, null, false[, "meet"])` | that day | tapped minute, snapped; `fAuto=false` | shoot / meet | L19284-19287 |
| week «free» row | `openForm(dd, null)` | that day | chosen by light (`fAuto`) | shoot | L18268 |
| card «＋» `#cardAdd` | `openForm(s.date, null)` | the card's day | by light | shoot | L30132-30137 |
| card «Изменить» `#cardEdit`, event fan «Заполнить» | `openForm(null, null, idx)` | record | record | record's kind | L30103-30105, L35953-35955 |
| «Продлить» repeat | edit + `fRepExt = true` | | | | L30107-30110 |
| meeting → shoot | pushes a new shoot record, then `openForm(null,null,last)` (edit) | | | shoot | L30230-30253 |
| questionnaire answers | edit, or a new meeting at 14:00 with genre forced to wedding if enabled | | | meet | L31308-31321 |
| map route draft | sets `shootType`, `openForm(selDate, goldB, null, true)` then overwrites `fRoute` | | | shoot | L17191-17200 |

After filling: route editor, docs, kit, playlist rendered; `fDoneRow` shown
only when editing (L30550); title (L30552-30554): meet → «Новая встреча» /
«Встреча» (`form.newMeet`, `plan.meet`), shoot → «Новая съёмка» / «Съёмка»
(`plan.newShoot`, `card.shootPoint`); `fDelete` only when editing; then
`applyGenreShape()` for edit/draft (keeps stored numbers) or
`applyGenrePreset()` for a new record (genre defaults, §3, §7); scroll to
top; `.open` added.

## 5. Meetings are the same form in `formKind = "meet"`

One form, one save path; `meetMode()` = `formKind === "meet"` (L26146,
L26163). Record `kind: "meet"` (native `RecordKind.meet`). Differences:

| aspect | meet | lines |
|---|---|---|
| hidden blocks | payment, weather wish, references, delivery, guests, prepay, order (brief/docs/models), breed | L26165-26197 |
| still shown | genre, who (client / couple / org per genre), time, notes + kit + playlist, place group heading + city | same |
| place | three ways row, route list and «＋ Точка» hidden (`off = meetMode()`) | L26606-26632 |
| default duration | 60 min, not the genre's | L26719 |
| default start | 14:00 from `#planMeet`; `applyGenrePreset` never moves it by light | L34108, L26757-26760 |
| title / subtitle | «Новая встреча» / «Встреча»; `form.subMeet` | L30552, L27559 |
| on save | same `rec` literal, `kind:"meet"`; money fields are still written with the genre's preset values (hidden, not cleared) | L31753-31814 |

## 6. Draft of a new record (autosave)

| aspect | web | lines |
|---|---|---|
| scope | new records only (`editIdx === null`); editing has no draft | L30264-30265, L30338, L30344 |
| key | `localStorage["lightplan.beta.draft"]` (beta) / `"lightplan.draft"` (main) | L30266 |
| when written | `input` and `change` on the whole overlay → 600 ms debounce (L31631-31632, L30343-30347); click-driven edits call `scheduleDraftSave` themselves (genre L26912, route wheels L24539, hall L24613, playlist L24619); ✕ writes synchronously (`draftSaveNow`, L31613) | |
| what | `draftBuild()` (L30273-30303): same keys as the save record minus `warn`, `questSent`, meet links, `synced`; plus `sid` (the form's `fId`, ties the moodboard folder) and `repDraft {rule,n,on,monthly}` | |
| «typed by hand» (`draftHasContent`, L30308-30327) | any non-blank of contact, clientTel, notes, person, phone, brief, models, breed; any person name/tel; guests, prepay or rate > 0; repeat monthly > 0; any doc or kit item; moodboard folder `sid` has shots; trip on; any weather wish. **Not counted**: genre, subgenre, date, time, duration, place/city (auto from home city), seeded route rows, org id | |
| empty snapshot | removes the key instead of writing (L30340-30341) | |
| restore | every new `openForm` loads it; if it has content, `fillFormFrom(draft)` runs **over** the prefill — the draft's own date/time/kind win over the button pressed (L30532-30543, comment: «молча меняем её на черновую») | |
| banner | `#draftNote` «Черновик восстановлен · Начать заново» | L9161-9164, L30557 |
| «Начать заново» | deletes the draft's moodboard folder, clears the key, reopens a clean form on the same day with `form.draftGone` note | L31633-31643 |
| discard on ✕ with no draft | the unsaved record's moodboard folder is dropped | L31620-31623 |
| cleared | on successful save of a new record (`draftClear`, synchronous) | L31849 |

## 7. Save (`#fSave` L31746-31873) — validation, record, defaults

**Validation: there is no required field.** An empty form saves. The only
block is the nesting check: if route points fall outside `[fMin, fMin+fDur]`,
`#fNestWarn` shows («form.nestT/nestM»), the overlay scrolls to it and save
aborts (L31747-31751, `formNestBad` L31721-31725). Overlaps and weather are
warnings only (L9166-9170, L27583-27588).

Record literal (L31753-31814), rebuilt from form fields on every save
(`sessions[editIdx] = rec`, L31827). In-scope fields with native mapping
(`Session.swift`, JSON keys in `Session+Codable.swift` L10-20):

| web key | value on save | native | note |
|---|---|---|---|
| `kind` | `formKind` `"shoot"`/`"meet"` | `kind: RecordKind` | |
| `id` | `fId` (given at open) | `id` | |
| `date` | `dayOf(fDate)` | `day: CivilDate` | |
| `min` | `fMin` | `start` | |
| `end` | `fMin + fDur` (can exceed 1440) | `end: Int?` | |
| `dur` | `fDur` | `duration: Int?` | |
| `type`, `sub` | `shootType`, `shootSub` (`""` = none) | `genre`, `subGenre` | |
| `contact` | **derived** `contactLine()` (L31706-31717): persons → first names joined by `card.and`; group `client` → «org · person · phone»; else `fContact` | `contact` | the raw `fContact` of an event or client genre is not kept |
| `clientTel` | `fClientTel` trimmed display string | `clientPhone` | |
| `persons` | `[{n, tel}]`, empty persons dropped (L31696-31703) | `persons: [Person(name, phone)]` | |
| `orgId` | `fOrgId` | `orgId` | |
| `person`, `phone` | `fPerson`, `fPhone` | `orderPerson`, `orderPhone` | prefilled from the org only if empty (L26319-26326) |
| `breed` | `fBreed` | `breed` | |
| `guests` | `fGuests || 0` (0-2000) | `guests: Int` | |
| `notes` | `fNotes` | `notes` | |
| `telLog` | numbers that vanished from the record go to its archive (`telRetire`, L31820-31823) | `telLog: [TelLogEntry]` | |
| `rep` | kept for a group card (`fRepOf`) or made by `repMake` | `repeatInfo: Repeat` | §8 |
| `questSent`, `fromMeetOn/Id`, `grewOn/ToId`, `dayMoved` | copied by hand from the old record | same names | |
| `synced` | `syncTarget` or null | `calendar` | |

Out-of-scope keys written in the same literal (keep the slots): `place,
placeTown, placeAddr, placeLat, placeLon, placeCity, studioId, hallId,
rentFrom, rentTo, bookingRef, rentReq, route, trip, tripManual, tripPlace,
wish, warn, deadlineChoice, delivered, deliveredAt, pay, rate, units,
expense, prepay, currency, brief, models, docs, gear, playlist` — all present
in native `Session` (L48-117).

Missing in native: none of the form's keys. Present in native but **not in
the form's literal** (dropped on edit, from code, not measured): `questOff`
(L28310), `doneAt` (L31521), `icsSig`, `icsAt`. Native should keep unknown
fields on edit instead of copying this.

Defaults filled for a new record (`applyGenrePreset` L26714-26776): duration
by genre (§3), start by light or 12:00, delivery choice `genrePrefs[g].delv`
or `"auto"`, pay = remembered or first of `GENRE[g].pay`, hourly rate by
genre, units 1, expense 0, prepay auto from the genre share, route seeded
with three empty rows for wedding/party (not saved while empty,
`routeFromEditor` filter L26709). Edits persist to the genre: a new end
time → `rememberGenre("dur")` (L24509).

After save: draft cleared (new only), lists re-rendered, `#savedNote` shows
`form.savedEdit` / `form.saved` / `form.savedSync`, and 850 ms later the form
closes → back to the card if it was an edit from the card, else to the
planner (L31844-31872).

## 8. Repeat blocks — `.rep-blk[data-rep=…]`

A shoot can be repeated at save time into independent copies (ROADMAP
«Повтор съёмки»). Row «Повтор» `#fRepRow` (fan with a check mark, rules
`never, day, week, week2, month, year`, L20329), row «Сколько раз» with a
wheel 2-100, default 4 (L20330, L9284-9291), summary `#fRepSum` (dates, clashes).
Each `.rep-blk` is a toggle row placed at the end of the block it copies:
«Повторять клиента / место и маршрут / заметки / оборудование / плейлист /
задание и модели / документы / пожелания к погоде / срок сдачи / мудборд»
(L9223, 9424, 9433, 9441, 9463, 9475, 9489, 9495, 9582, 9599). Defaults
`REP_BLOCKS` (L20331-20332): all on except `notes`. Rows are hidden unless a
rule is chosen (`renderRep` L31013-31033); the playlist row also needs a
playlist library. Available only for `kind:"shoot"` not already in a group
(`repEditable` L30856). Native `Repeat`/`RepeatRule` exist in `Entities.swift`
L183-216. For iteration 23: leave the rows' slots; the port of repeat
itself is not in the listed scope.

## 9. Phone input in the form

Fields `fClientTel, fP1Tel, fP2Tel, fPhone` (+ `oPhone`, `locStudioTel`)
share one handler (L26261-26309). **The form has no country-code block**:
every number is formatted by `formatTel(v, pasted)` (L25442-25505) against
the photographer's own country `telCountry` (L25371; `saved.telCountry`, else
guessed from time zone `TEL_TZ` L25344-25360, then locale, else RU). Table
`TEL_CC` (L25306-25334): 27 countries, each `{cc, trunk, nsn lengths, fmt,
mob regex, ex}`.

`formatTel`: keep a leading `+`; digits after `+` in another country's code
→ `"+" + digits` unformatted; own code after `+` → `"+cc "` + groups; own
trunk (`8`, `0`) → trunk + groups (`"8 "` with space, `"0"` glued); own code
without plus («79161234567») → `"7 "` + groups; else plain groups by `fmt`
(`telGroups` L25510-25517, stops at the last digit, no dangling separator).
With `pasted` and a digit count equal to a local number, the trunk (or code
under `+`) is prepended.

`pasted` is set when digits jump by > 1, when `inputType` looks like
paste/autofill, **and on any growth without a leading `+`** (L26270-26289,
iOS contact autofill arrives digit by digit and without `+7`). On blur a
number without `+` is re-run with `pasted = true` (L26302-26308). Cursor is
kept at the end only if it was at the end. Stored value = the trimmed display
string («8 923 412-33-33»), never normalised.

Comparison and identity never use the string: `telFull` (L25633-25645) →
international digits; `telKey = telFull` (L25706); `appId = "id" + telFull`
only for a mobile (`telMobile` L25670-25684); `telE164` for tel: links.
DECISIONS «Три формы номера» (L8241-8250) and «Сверка ответов» (L6393-6405)
still describe a 9- / 10-digit tail key — superseded by code (comment
L25690-25705); the native port must follow `telFull`.

## 10. Settings «Профиль»: my phone, app ID, previous IDs

| element | web | lines |
|---|---|---|
| `#myTelCc` | button «+7 ▾» showing `TEL_CC[telCountry].cc`; opens `#ccSheet` | L8338-8340, L35551 |
| `#myTel` | national part only, `autocomplete="tel-national"`; input → `telNatIn` strips a pasted `+cc`/trunk, switches `telCountry` if the pasted code is another country's; value shown by `telNatFmt`; stored `me.phone = telJoin(nat)` = `formatTel("+" + cc + nat)`; then `telCcFollow` (country follows the number when only one code fits), `saveAll`, re-render | L8341-8342, L35375-35409, L25556-25601 |
| placeholder | the country's `ex` number formatted | L33315-33330 |
| `#ccAsk` | chips «Страна +cc» shown only when a number exists, gives no ID, and `telCcFit` finds candidate countries; tap rewrites `me.phone` to the international form | L8353-8356, L33289-33310 |
| `#ccSheet` «Код страны» | search field `#ccFind` (name, `+cc`, ISO code) and list `.cc-row` sorted by localised name, current one `.on`; pick keeps the typed digits, re-groups them, re-joins `me.phone` | L10253-10259, L35526-35564 |
| `#appIdRow` «ID приложения» | `myId() = appId(me.phone)`; empty → `set.appIdNone` / `set.appIdNotMobile`; tap copies (clipboard, fallback `execCommand`) and flashes `set.appIdCopied` 1.6 s; no ID → focuses `#myTel` | L8357, L35582-35583, L35608-35640 |
| «Прежние ID» `#appIdWas` | `me.ids` newest first, rows «idNNN · d MMM YYYY»; label and note hidden when empty; max 12 kept (`MY_IDS_MAX`) | L8360-8364, L35588-35595, L14165 |
| commit | not on each key: on `blur`, on app hide (`visibilitychange`) and on leaving settings → `myTelCommit` (L14219-14223): if `telAskNeeded` open `#telSheet`, else `telTake` → `myIdRetire` pushes the old ID (only if it was an ID; going back to an earlier number truncates the chain) and stamps `me.telAt` | L35404-35419, L14187-14236 |
| `telAskNeeded` | new number is real (≥ 5 key digits) and differs by key, data not empty (sessions, orgs, trash or spots), and the last change was > 15 min ago | L14245-14262 |

`#telSheet` — three steps in one sheet (`telStep` L35446-35450), backdrop
`#telScrim` = cancel:

1. **Copy** «Сначала копия», `#telFromTo` «idOLD → idNEW»: «Сохранить копию»
   (`doBackup` → step 2), «Продолжить без копии» disabled for a 10 s
   countdown (`tel.skipWait`, L35454-35468), «Отмена».
2. **Who** «Чей это номер»: «Это мой новый номер» → `telTake` (old ID kept
   as previous); «Телефоном пользуется другой человек» → step 3; «Отмена».
3. **Hand** «Это чужая работа»: counts «N съёмок, N организаций, N номеров»;
   «Очистить и начать своё» enabled only if the copy was saved, asks again
   then `wipeAll`; «Назад» → step 2.

Cancel (L35477-35486) restores the previous `me.phone` and field.

First-run sheet `#startSheet` «Откуда вы работаете» (L10209-10237):
`#startCity` + `#startTel` («Телефон», optional, `start.note` explains it
is your external address). `#startTel` uses the **old whole-number
formatter** (`formatTel` with the autofill rule, L33629-33646) — no code
block — writes `me.phone` on each key, no ID-change question. «Готово» or
backdrop sets `me.met = true` and closes; never asked again (L33607-33624).

Native mapping of these settings (`native:Packages/LightPlanData`):
`timeStep` → `AppSettings.timeStep`, `steps = [5, 10, 30]` (AppSettings.swift
L21, L29); `genres` → `Snapshot.genres: [Genre]` (web stores an object
`{genre: 0|1}`, L12373); `genrePrefs` → `Snapshot.genrePrefs` /
`GenrePrefs` (`Delivery.swift`: pay, duration, deadline, rate, prepayShare,
deliveryDays); `clock` → `Snapshot.clock`. **Missing**: `me` (`phone`,
`ids`, `telAt`, `met`) and `telCountry` — today they survive only in
`Snapshot.extra` as unknown keys; iteration 23 needs typed fields.

## 11. «Мои жанры» sheet `#gSheet` (from the form's genre gear)

`#fGear` → `renderGenreList` + `renderGenreDefaults`, sheet opens
(L30751-30758). Markup L10522-10543.

- Title «Мои жанры», sub `gen.sub` «Оставьте только то, что снимаете —
  остальное уйдёт из формы».
- `#gList`: all 12 genres as tool tiles; tap toggles `genresOn[g]` (active
  vs `.off` at 40 % opacity); the last enabled genre cannot be switched off
  (L30593-30607). Default: all on; genres unknown to saved data are on
  (L26782-26789).
- «Жанр · <open genre>» group: «Длительность» chips `GEN_DURS = [30, 60,
  90, 120, 180, 240, 360, 480, 600]` + current value; «по свету» chip only
  for a genre whose factory `dur` is null (landscape); writes
  `genrePrefs[g].dur` (L30615-30643). «Срок сдачи» chips `DELV_DAYS = [3, 7,
  14, 30, 90]` + current, hidden for genres without delivery; writes
  `genrePrefs[g].delvDays` (L30645-30666). Footnote `gen.dfltNote`
  «Подставляется в новую съёмку — уже назначенные не трогаем».
- «Готово» / backdrop closes (L30756-30760).

The settings block is for the genre **open in the form**, not the tile
tapped. Genre chips in the form (`renderGenres` L26834-26879): 4-column
grid of enabled genres; tap an unselected genre → `pickGenre` (re-applies
the preset, drops seeded route rows if the new genre has no route); tap the
selected one or long-press → subgenre drawer inserted at the end of that row
(`SUBGENRE` L25227-25252; native `SubGenre.swift`). A picked subgenre replaces
the tile's label and icon.

## 12. Traps (do not port; from code, not measured unless marked)

| # | trap | lines |
|---|---|---|
| T1 | `routeOpt` is computed and never read; group `own` (`route:"off"`) gets «＋ Точка» like `people`. Doc `12_CARD` says own has no timeline. Ask Alexey before porting either way | L25832, L26631 |
| T2 | `genreSpec` writes `base.route` into the shared `GENRE[g]` object (mutates the table on first read). Native `GenreProfile.hasRoute` is pure — keep it | L25826-25831 |
| T3 | Hour wheels are always 00-23 while capsules follow the 12 h setting | L24357, L10836 |
| T4 | Step is 5/10/30 in code, «15 и 30» in the plan and DECISIONS L21200 | L20281 |
| T5 | Ending time edits call `rememberGenre("dur")` even in a meeting — a one-hour meeting rewrites the genre's default duration | L24509 |
| T6 | Draft restore wins over the entry point: «Встреча» with a shoot draft opens a shoot; the tapped day and hour are replaced by the draft's | L30538-30543 |
| T7 | «Мои жанры» toggle does not call `saveAll`; the change is written only by the next save of anything | L30603-30604 |
| T8 | `#fGuestsVal` has two `blur` handlers (same effect) | L26371, L26373 |
| T9 | Name clash: `var fGear` = kit picks array, `#fGear` = genre gear button | L20349, L9175 |
| T10 | Save rebuilds the record from form fields: `questOff`, `doneAt`, `icsSig`, `icsAt` are dropped on edit | L31753-31827 |
| T11 | Editing a non-work record sets `formKind = "meet"`, and save writes `kind: formKind` — an imported calendar event (`kind:"event"`) edited here would become a meeting | L30479, L31754 |
| T12 | Org row value colour is hard-coded `#EFEAE0` / `#8A8478` (dark-theme ink) — wrong in the light theme; use tokens | L26315 |
| T13 | No required fields: an empty record saves. `contact` of event/client genres is derived; what was typed in the hidden `fContact` is lost | L31706-31717 |
| T14 | Meeting save still writes the genre's preset `pay`, `rate`, `units`, `prepay` though the blocks are hidden | L26729-26733, L31780 |
| T15 | Party shows the group heading «Пара» over one person | L26236, `lang.js` L1126 |
| T16 | Stale comments: «Девять описаний сжимаются в четыре» (L25192), «десяти из одиннадцати» (L1111), «Гости … живут в блоке таймлайна» (L26187 — they live in the who group) | |
| T17 | First-run `#startTel` uses the whole-number formatter; profile `#myTel` uses the code block + national field — two input models for one value | L33629-33646, L35388-35403 |
| T18 | CSS `[hidden]` overrides (`.row[hidden]`, `.rv-v[hidden]`, `.group input[hidden]`, `:where()` specificity) exist only to fight the web cascade — nothing to port | L6858, L6941, L7031-7042 |
| T19 | Genre is not reset between new forms (module `shootType`); a new form opens on the last genre used. Keep or decide — it is behaviour, not a documented rule | L20267, L30471-30530 |

## 13. Open questions for Alexey (product, not code)

1. Group «Свои» (landscape, street): may it add route points (code) or not (doc)?
2. Minute step: 5/10/30 (code, settings screen) or 15/30 (plan)?
3. 12 h clock: should the native wheel follow the app's 12/24 setting (web
   wheels never did)?
4. Block order: doc «Жанр → Когда → Кто», code «Жанр → Кто → Время» (comment
   L9226 says deliberate). Port the code order unless told otherwise.

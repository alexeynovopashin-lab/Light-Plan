# Iteration 21 — web planner as the porting reference

Written 2026-09-24 by the first iteration-21 chat (Sonnet subagent read of
`beta/index.html` at `fbc323e`; the web is frozen as the reference, so line
numbers hold). Everything below was read from code, not measured on screen,
unless a line says «verified».

**Corrections verified by the orchestrator (they override the text below):**
- `openGaps` is dead code (grep: declared L12271, reset L34389, nothing else).
  The plan's «free windows (`openGaps`)» is void — port the tap-on-hour slot
  with three actions instead (§4, §7).
- `deliveryState` colours: `ahead` → `urgencyCalm()` (start of the scale, not
  grey); no deadline (`noTerm`) → `GREY`; `lerp` rounds channels to integers.
  Ported in `native:Packages/LightPlanUI/.../Planner/PlannerDay.swift`,
  checked by `Fixtures/planner.json` (`make planner`).
- Lane layout (§4) ported and checked against the live code on 400 days
  (`make planner`, `PlannerParityTests`), spoiling caught.
- `topOf(min) = min/60*38` starts at 00:00 — «hour axis 04:00» in §4 is not
  confirmed; read L18987–19022 before drawing the grid.

# Planner screen ("Съёмки" tab) — porting spec

Source: `beta/index.html` (36900 lines), `beta/lang.js`. All line numbers refer to
`index.html` unless marked `lang.js`. No project CSS file exists — all styling is
inline `<style>` in index.html (grep `.dl-`, `.cal `, `.wk-` for rule blocks).

Out of scope per assignment (noted only where they intersect): year view
(`buildMonthEl` L18284, `buildMiniMonth12` L18340, `zoomYear12ToMonth` L18421,
`renderMonthBars` L18592), statistics, trash, event form, event card. Tapping a
shoot opens the card via `openCard(+i)` (L19216); tapping a busy block opens
`openBlock(id)` (L19215); long-press opens the action fan via `holdForFan`/`dlOpenFan`
(L19225, L19620). None of those internals are covered here.

## 1. State

All are plain module-level `var`s (no framework), declared ~L12263-12294:

| var | type | default | persisted? | who writes |
|---|---|---|---|---|
| `selDate` (L12263) | Date | `new Date()` | no | global "viewed day" used by sun/moon/map screens; NOT the calendar's own selection — see trap #1 |
| `calMonth` (L12265) | Date (day=1) | `new Date()` | no | month currently shown in month grid / used to sync scope switches |
| `calSel` (L12266) | Date, midnight | `dayOf(new Date())` | no | the day selected/open in month, week and day views |
| `calScope` (L12267) | `"month"\|"week"\|"day"` | `"month"` | no | `setScope(s)` (L34119); read everywhere to branch rendering |
| `openGaps` (L12271) | object `{}` | `{}` | no | **dead state** — declared and reset on day-step (L34389) but nothing ever reads or writes a key into it. The "open gap by hand" feature it documents (comment L12268-12270) does not exist in current code; see trap #2 |
| `dayScrollDay` (L12272) | number (epoch ms) or null | `null` | no | guards the one-time auto-scroll to 09:00 in day view (L19300) |
| `dayShift` (L12276) | `-1\|0\|1` | `0` | no | set by date-strip tap (L18829), swipe (`stepCal`, L34391), set to `0` again after the slide animation is applied (L19206) |
| `dayPanelOpen` (L12281) | bool | `!(saved && saved.dayFold)` | **yes** — `saved.dayFold` inverted, in the main app store (`STORE` key, `lightplan.beta.v1` in beta channel, L12293) | toggled by the day-summary chevron; persists across restarts |
| `dlSel` (L19385) | session id / record / null | `null` | no | which timeline event has drag-handles; timeline-only, reset to `null` whenever scope isn't `"day"` (L18923) |
| `dlG` (L19386) | gesture object / null | `null` | no | in-flight pointer drag on the timeline |

Records themselves: `sessions` array (L13750, `saved.sessions || []`), `blocks`
(busy/occupied time, read via `blocksOn`/`blockCovers` L13992-14004), `trashed`
(L13596, deletions — out of scope but filtered out of `sessions` display already).

### calScope switching
- Tap the scope button → fan menu (`scopeMenu`, wired L34278-34287). Picking a
  scope calls `setScope(s)` (just sets `calScope`+icon+menu-checkmark, L34119) then
  `renderCal()`. **Exception**: month → day does NOT call `setScope` directly; it
  calls `zoomMonthToDay()` (L34269) which runs a custom "unzip the week row"
  animation (`partMonthIntoDay`, L34166-34267) before setting scope.
- Second tap on an already-selected day cell in month view also zooms into day
  view the same way (`partMonthIntoDay` called from the cell click handler,
  L18014-18021); a first tap on a day only selects it.
- **No pinch gesture anywhere** (`grep pinch` → zero hits). Scope changes are
  button/menu-driven or the double-tap-day shortcut above.

### selDate moves
- Tap on the week-strip date (L18827-18835): `dayShift` set by comparing dates,
  `calSel = day`, `calMonth` resynced, `renderCal(); renderDayPanel()`.
- Swipe left/right anywhere on `#s-plan` (touchstart/touchend, L34407-34432):
  needs `|dx| >= 60px` and `|dy| <= 40px`, ignores drags in progress
  (`mbSorting`, `mbDrag`, `dlG.armed`) → calls `stepCal(dir)`.
- `stepCal(dir)` (L34388-34404): in day scope steps `calSel` by 1 day and sets
  `dayShift`; in week scope steps `calSel` by 7 days; in month scope steps
  `calMonth` by 1 month (no `dayShift`, no per-day animation). Always resets
  `openGaps = {}` first (dead code — see trap #2).
- `selDate` itself is **not** touched by planner navigation; it's a separate
  "viewed day" for the Today/Map/Light screens. `dayWindow`/`daySky`/`qualityAt`
  swap `selDate` temporarily via `computeSun(d)` then restore it (`keep` pattern,
  e.g. L17832-17845, L18051-18057) so planner reads never leak into other screens.

## 2. Render entry points

- `renderCal()` — **L17914-18045**. Top-level dispatcher: sets header/legend
  visibility for the active scope, calls `setDayPanel`, `setPlanTitle`, then:
  - `calScope === "day"` → calls `renderDayPanel()`, `markScopeNow()`, returns.
  - `calScope === "week"` → calls `renderWeek()`, `markScopeNow()`, returns.
  - else (month) → also calls `renderDayPanel()` (keeps the day-summary strip
    in sync even in month view), then builds the month grid itself inline
    (no separate `renderMonth` function — the grid-building `cell()` closure
    lives at L17968-18029, called in three loops L18031-18040).
- `renderWeek()` — **L18058-18276**. Builds the 7 week rows.
- `renderDayPanel()` — **L18765-19367**. Builds dashboard strip (rise/set/golden/
  weather), date strip (`#dayDates`), and — branching on `calScope` — either the
  month/week flat list (`.plan-row`, L18922-18973) or the full hour-grid timeline
  (`.dl-grid`/`.dl-layer`, L18974-19171), then the free-day placeholder
  (L19172-19196), the slide-in animation (L19198-19207), click wiring
  (L19209-19289), the tap-to-create slot menu (L19234-19289), the once-per-day
  autoscroll (L19292-19316), and finally the day-summary line `#dpLoad`
  (L19318-19367).
- `setPlanTitle()` — L17853-17875 (header text per scope).
- `markScopeNow()` — L17877-17883 ("↺ today" pill visibility).
- `setDayPanel(open)` — L17907-17912 (summary collapse chrome only).
- `qualityAt`/`dayWindow`/`daySky` — L17811-17849, L18051-18057: light/weather
  lookups shared by all three views.
- Drag-to-move/resize on the timeline: `dlGrip` L19395, `dlWireHandle` L19412,
  `dlWireSel` L19421, `dlBegin` L19449, `dlMove` L19480, `dlPaint` L19525,
  `dlEnd`/`dlUp` L19569/19589, `dlCommit` L19652 (writes `s.min/s.end/s.dur` and
  an edit-note). Out of assignment scope (not one of the listed parts) but flagged
  since it lives inside `renderDayPanel`'s wiring — do not confuse its handle
  markup (`.dl-selbox`, `.dl-h`) with the timeline layout itself.

Call graph (day view): `renderCal → renderDayPanel → dayWindow/daySky/qualityAt`
(light), `→` inline layout IIFE (lane assignment, L19037-19063) `→ dlWireSel,
dlGrip` (gesture wiring) `→` autoscroll. Month/week cells call `qualityOf`,
`dayMark`→`deliveryState`, `onDay`→`partOfDay` per session per day.

## 3. Per view

### Month (`#cal`, grid built in `renderCal`, L17957-18041)
- Grid: CSS grid `7×minmax(0,1fr)` (`.cal`, L4374), Monday-first week
  (`offset = (first.getDay()+6)%7`, L17960).
- Each cell (`cell(d, out)`, L17968-18029): button `.d` with modifiers
  `.out` (adjacent month, dimmed), `.past`, `.today`, `.sel`.
  - Date number in `.d-n`, background (`--mark`) = `dayMark(d).fill`, i.e. the
    **worst delivery-urgency color** among that day's sessions (rank≥3 →
    filled, else transparent), pulsing (`.breath`) if `deliveryState.breath`
    (overdue). This is the closest thing to a "day quality dot" in month view
    and it encodes **delivery urgency, not sky quality** — see trap #3.
  - Up to 2 labels (3rd+ collapse to `+N`, L17995-18003): each session on that
    day shown via `shortType(x)` colored `QUAL[qualityOf(x.date)].dot` (sky
    quality color) unless `notWork(x)` (meet/event) which get an uncolored
    `.busy` label instead. `blocksOn(d)` (vacations/occupied time) appended
    with `blockLabel(b)`, uncolored.
  - Sort: sessions `x.min` ascending (L17979); busy blocks appended after,
    unsorted relative to sessions.
  - Empty state: no special markup, cell just shows the bare date.
  - First tap selects (`calSel = d`); second tap on an already-selected
    in-month cell zooms into day view (L18014-18022, see §1).
- Weekend styling: header cells 6/7 (Sat/Sun) lighter ink (`.cal-head
  span:nth-child(6),:nth-child(7)`, L4368) — grid cells themselves are not
  weekend-styled.
- Today marker: `.cal .d.today` → brass ink + bold (L4418).
- Legend (3 quality dots: excellent `#E2A44C`, good `#A8B49B`, poor `#7C9CC4`,
  L8096-8100) shown only `monthHasShoots` (L18043) — see trap #4, legend colors
  don't fully match `QUAL_C`.

### Week (`#week`, `renderWeek`, L18058-18276)
- Not 7 light-strips (removed by design decision, comment L18059-18062) — 7
  rows of **occupancy**, one `<div class="wk-day-row">` per day
  (`weekStart(calSel)` Monday start, L18049, L18064).
- Head: date number, weekday abbrev, weather icon+temp (`wk-head`, L18092-18095).
- Body: sorted shoots (`hasRoute` sessions first, then by `.min`, L18073-18076)
  as `.wk-card` rows (icon, name/genre, time range), or a `.wk-free` placeholder
  if none (L18121-18131, two text variants toggled by CSS for collapsed vs.
  expanded row).
- Deadlines due that day get a separate `.wk-due` line (L18078-18081,
  L18164-18168) listing client names.
- Trash for that day surfaces as `.wk-bin` link into the shared bin
  (L18154-18158) — out of scope but present in this view only.
- Light: one line — sunset time if the day has shoots, else golden-hour start
  (L18135-18146) — deliberately reduced from the old "3 numbers" design
  (comment L18172-18205).
- Tap on `.wk-head` expands/collapses that row (accordion, only one open at a
  time, L18253-18264) and calls `renderDayPanel()` so the shared day-summary/
  timeline strip below reflects it.
- Today/past/selected styling: `.wk-day-row.today/.past/.sel` (L18085-18087).
- No "first weekday" ambiguity beyond Monday-start, same as month.

### Day (`renderDayPanel`, non-day branches vs. day branch)
- **Pinned week strip** `#dayDates` (only visible `calScope==="day"`,
  L18804-18841): 7 `.dd-day` buttons, Monday-start week of `calSel`. Each shows
  weekday abbrev, date number, and up to 3 small icons for that day's sessions
  (`typeSvg`/guests/view_month icon) + `+N` overflow (L18812-18819), or a lock
  icon if only busy blocks exist. Tapping sets `calSel`/`dayShift`/`calMonth`
  and re-renders (L18827-18835), plus a haptic tick if the day actually changed.
- **Day summary** (dashboard row above the strip, "сводка дня"): rise/set icons
  + times (`#dpRise`,`#dpSet`, L18860-18861), golden-hour duration if finite
  (`#dpGold`/`#dpGoldVal`, L18864-18867), sunset-quality color-only cue on
  `#dpSetItem` (no word, thresholds below, L18868-18879), weather icon+temp
  (`#dpIcon`,`#dpTemp`, L18881-18883). Collapsible via `dayPanelOpen`
  (persisted). Below it: `#dpLoad` load line built from item counts + busy
  minutes (L19318-19367).
- **Timeline** (`.dl-grid`+`.dl-layer` inside `#dpSessions`): see §4.
- Empty state: if the flat list (month/week) is empty, and it's month/week
  scope, `.day-free` placeholder line with golden-hour text (L19172-19196); in
  day scope the hour grid itself is always drawn (empty hours are tappable
  slots, never collapsed) so there's no "day-free" placeholder there.
- Today marker in day view: `nowMin`/now-line on the timeline (§4) plus
  `.dd-day.today` in the strip.
- Records read via `sessions.forEach` + `partOfDay(s, calSel)` (session→minutes
  overlapping this calendar day, handles multi-day shoots, L14520-14529) and
  `blocksOn(calSel)`. Filter: `shownRec(s)` (L26160) hides ICS-imported
  `"event"` records unless `icsLayer` is on; deleted (`trashed`) records are
  never in `sessions` to begin with.

## 4. Timeline (day scope only, inside `renderDayPanel`, L18974-19171)

- **Hour axis**: 04:00 → 01:00 next day (`h = 0..24` where `h>=24` renders as
  the 00:00-next-day closing line), `HOUR_H = 38` px/hour (L18987-18988,
  `topOf(min) = (min/60)*HOUR_H`). Comment explains the 04:00 start: summer
  sunrise ~4am and banquets past midnight (L18914-18920).
- **Axis color**: `phaseCol(m)` (L18783-18793) — gradient through night(DEEP,
  0.5 alpha) → blue hour(BLUE) → dawn→golden(GOLD→SILVER lerp) → day(SILVER) →
  golden→sunset(SILVER→GOLD) → sunset→night(SCARLET→BLUE), keyed off that day's
  `sky.blueA/rise/goldA/goldB/set/blueB`. Each hour cell gets its own linear
  gradient from its start-minute color to its end-minute color
  (`axisStyle(h)`, L18796-18800) so the transition is continuous, not stepped.
- **Layout / overlap columns** (L19036-19063, copy verbatim below — this is the
  logic to port exactly):
```js
var LANE_GAP = 4;
(function () {
  var lay = items.filter(function (x) { return !(x.kind === "busy" && x.blk.allDay); });
  lay.forEach(function (x) {
    x.top = topOf(x.a);
    x.bot = x.top + Math.max(34, topOf(x.b) - x.top);
  });
  var i = 0;
  while (i < lay.length) {
    // cluster = chain of segments linked by overlap, possibly via a neighbor
    var end = lay[i].bot, j = i + 1;
    while (j < lay.length && lay[j].top < end) { end = Math.max(end, lay[j].bot); j++; }
    // first free column: an item starting after a column's last item ended
    // reuses that column instead of opening a new one
    var ends = [];
    for (var k = i; k < j; k++) {
      var c = 0;
      while (c < ends.length && ends[c] > lay[k].top) c++;
      if (c === ends.length) ends.push(0);
      ends[c] = lay[k].bot;
      lay[k].col = c;
    }
    for (var m = i; m < j; m++) lay[m].cols = ends.length;
    i = j;
  }
})();
```
  Notes: `items` is pre-sorted by `(a, b)` (L18906). `x.a`/`x.b` are minutes
  from midnight (from `partOfDay`, clipped 0-1440) for shoots/meets/events,
  or `{a: allDay?0:b.min, b: allDay?1440:b.min+b.dur}` for busy blocks — but
  **all-day busy blocks are excluded from lane layout entirely** (they never
  compete for width; they're background, not a "neighbor", per the code
  comment L19034-19035). Minimum pixel height per item is 34px (not 34
  minutes) — this is what makes two 10-minute-apart short shoots still split
  into lanes even though they don't overlap in time (comment L19031-19033).
  A cluster can end up needing >2 columns; `.narrow` (cols>1) / `.tiny`
  (cols>2) CSS classes shrink the card content accordingly (L19122).
- **Busy/occupied time kinds**: rendered as `.dl-ev.busy` blocks, icon from
  `blockKind(b.k).ic`, label `blockLabel(b)` (note or `blkKind.<k>` translation,
  L14008). All-day blocks render full height/width but sit outside the
  overlap-lane math (background only, see above).
- **openGaps / free windows**: **there is no free-window/"open gap" rendering
  code in the current timeline.** `openGaps` (L12271) is declared, reset on
  every day-step (L34389), and never read or written elsewhere — it's a dead
  leftover from an earlier "lente" design (see the big comment block
  L4896-4904: a prior `.dl-row`/`.dl-free`/`.dl-gap`/`.dl-nowline` layer was
  deleted wholesale on 2026 Alexey's request; only `.dl-dot` survived under a
  new layout). Empty hours today are simply tappable `.dl-slot` buttons
  (L19018-19022) that open the 3-action slot menu — there is no "collapsed gap"
  visual or duration label anywhere on the hour grid. **Do not port an
  `openGaps` algorithm — there isn't one; port the tap-to-create slots
  instead.** (Month/week views *do* still call `gapLabel(d)` (L15227-15231,
  minutes → "h:mm" or "{m} min" string) but only for prose elsewhere, not for
  a free-window layer on this timeline.)
- **Now-line**: `.dl-mark.now` at `topOf(nowMin)`, label = current time
  (L19166-19169), only when `isToday`. Hour label hides itself
  (`.dl-slot.hushed`) when the now-capsule would visually collide with it —
  thresholds `HUSH_UP = 12.2px` (approaching from below), `HUSH_DN = 15.7px`
  (leaving upward), measured empirically against the 38px hour (L18991-19017,
  see trap #5 for why these aren't round numbers).
- **Sunrise/sunset marks**: `.dl-mark.light` at `topOf(round(sky.rise))` and
  `topOf(round(sky.set))`, always shown regardless of weather (L19149-19165) —
  explicitly not hidden on cloudy days, unlike the sunset-quality color cue in
  the summary strip.
- **Scroll position**: once per `calSel` change (`dayScrollDay !== +calSel`
  guard, L19300-19301), scrolls `#s-plan` so the 09:00 slot (or the event
  occupying 09:00, matched by `.dl-time` text `/^09:/`) sits just below the
  sticky header (`#daySticky`), with an extra 10px clearance (L19305-19314).
  After that one auto-scroll, the view holds scroll position across
  re-renders ("наводка одна на день", L19298-19299).
- **Event card body** (per `.dl-ev`, L19068-19141): icon, title = client name
  or fallback (meet/event/genre), subtitle = time range or "from {date} till
  {time}" for a tail continuation, delivery-due label (`.dl-due`, only if
  `hgt >= 2*HOUR_H` i.e. ≥2 hours tall and `ds.rank >= 2`). A `.dl-dot` node
  per item marks its start minute on the axis (rendered after all bars, so
  early dots aren't covered by later fills — comment L19136-19138).

## 5. Colours and numbers

### Delivery-deadline urgency ("срочность сдачи") — `urgencyRGB(p)`, L14456-14465
Continuous scale, `p = (now - shotDate) / (deadlineDate - shotDate)`, clamped
0..1, piecewise-lerp through named RGB stops:
- Dark theme: `p=0` → `[239,234,224]` (near-white ink) · `p=0.5` →
  `[232,208,122]` (yellow) · `p=0.8` → `[226,164,76]` (amber, = `--brass`) ·
  `p=1` → `[201,102,61]` (terracotta).
- Light theme: `p=0` → `[23,21,15]` (ink) · `p=0.5` → `[122,90,34]` (warm
  ochre) · `p=0.8` → `[166,86,45]` · `p=1` → `[138,63,34]` (terracotta).
- `p >= 1` (overdue) uses a fixed color instead of the scale's `p=1` stop:
  light `[138,63,34]`, dark `[201,102,61]` (`deliveryState`, L14498-14500) —
  same terracotta family but not literally `urgencyRGB(1)`; check both if
  porting, they happen to be very close/identical for dark, different-ish
  wording only for light (verify numerically before assuming equality).
- Grey `[107,101,91]` = delivered or not-work records (`GREY`, L14466).
- Overdue rows additionally get a background fill `rgba(color, 0.32)`
  (`r.fill`, L14507) — this is what lights up the month-cell date ring.
- `deliveryState.rank`: 0=delivered/not-work, 1=ahead-of-shoot or no-deadline,
  2=counting down, 3=overdue (drives `.breath` pulse + fill, and which UI
  spots show the color at all — e.g. timeline `.dl-due` only shows for
  `rank>=2`).

### Sky/day quality ("качество дня") — `qualityOf(d)`, L11473-11481
- If a real Open-Meteo forecast is cached (`wxReal[key]`) use its `.q`;
  else deterministic mock via seeded PRNG (`mulberry32(y*10000+m*100+d)`,
  same day always gives the same mock value).
- Buckets (mock only, real forecast has its own thresholds elsewhere — not in
  scope here): `r>0.80` → `excellent`, `r>0.62` → `good`, `r>0.38` → `plain`,
  `r>0.22` → `fog`, else `poor`.
- Colors (`QUAL_C`, L11454-11460): excellent `#E2A44C` · fog `#E2A44C` (same
  as excellent — fog reuses the "good light" color because it's an alternate
  *dawn* window, not a quality demotion) · good `#A8B49B` · plain: **no dot**
  (`null`) · poor `#7C9CC4`.
- This is the color used for the genre label text in month cells
  (`QUAL[qualityOf(x.date)].dot`) — see trap #3/#4 for why this is *not* the
  same signal as the delivery-urgency ring around the date number.

### Sizes (grep the literal rule for full declarations)
- Month cell: `min-height:47px` (`.cal .d`, L4381); date plate `40×40px`,
  `border-radius:11px` squircle (`.d-plate`, L4392-4394); label text
  `font-size:8.5px` (`.cal-lb`, L4409-4413); date number circle `26×26px`
  (`.d-n`, L4421-4425).
- Week card row padding `9px 12px` (`.wk-card`, L4949-4953); row radius `14px`
  squircle (`.wk-list`, L4945-4948).
- Timeline: hour row `height:38px` (`.dl-slot`, L4637); event card padding
  `2px 10px 2px 28px` (`.dl-ev`, L4666); title `font-size:14px`, subtitle
  `12px` (L4758-4759); drag-handle hit target `36×36px` around a visible
  `10×10px` dot (`.dl-h`, L4705-4709); lane gap `4px` (`LANE_GAP`, L19036);
  minimum event pixel height `34px` (L19041, L19074).
- Event fills: shoot = brass gradient `rgba(226,164,76, 0.16→0.05→0)` over 3
  stops with matching border-top/bottom alphas 0.55/0.30 (L4666-4670); meet =
  ink-tinted `var(--ink-a10)→transparent`; busy = fainter ink `var(--ink-a08)`.

## 6. `dayShift` — direction & animation

- Set to `+1`/`-1`/`0` by comparing the newly-selected day to the previous
  `calSel` (week-strip tap, L18829) or directly by swipe direction (`stepCal`,
  L34391). `0` means "same day tapped again" → no slide.
- Consumed once in `renderDayPanel` (L19202-19207): adds CSS class
  `slide-l` (content entered from the right, day moved forward) or `slide-r`
  (from the left, day moved backward) to `#dpSessions`, forces a reflow
  (`box.offsetWidth`) so re-adding the class restarts the animation even if
  it's the same class as last time, then immediately resets `dayShift = 0`.
- Animation (`@keyframes dl-slide-l/-r`, L4541-4546): `0.22s
  cubic-bezier(0.25,1,0.4,1)`, translateX from `±18px` to `0` + opacity `0→1`.
  Horizontal only — vertical is reserved for meaning "time" on this screen
  (explicit design rule in the comment, L19198-19201). Disabled entirely under
  `prefers-reduced-motion: reduce` (L4545-4547).
- Note this animates the **entire day content box** (`#dpSessions`, both the
  flat list in month/week and the hour grid in day scope share this), not
  just the timeline.

## 7. Three action buttons ("Запланировать / Встреча / Занять")

Not a persistent toolbar — a `.slot-menu` popup (L19259-19288) that appears
above the tapped hour slot (`.dl-slot`, day scope only, L19242-19289) or, in
month/week, presumably reached differently (not observed in scope — month/week
create shoots via `.wk-free` tap → `openForm(dd,null)`, L18266, no 3-button
menu; that's a single default action, out of scope detail).

Slot-menu buttons (`lang.js` keys, all under `day.act*`):
1. **`day.actShoot`** — "съёмка"/"shoot" (lang.js L635/2424) — camera icon
   (`IC.svg("camera")`) — `openForm(d, at, null, false)` → opens the new-shoot
   form pre-filled with the tapped date+time.
2. **`day.actMeet`** — "встреча"/"meeting" (L636/2425) — guests icon
   (`IC.svg("guests")`) — `openForm(d, at, null, false, "meet")` → same form,
   `kind:"meet"`.
3. **`day.actBusy`** — "занять"/"block" (L637/2426) — lock icon
   (`IC.svg("lock")`) — `openBlockSheet(null, at, d)` → opens the busy-block
   sheet, not the shoot form.

Half-hour precision: tap position within the slot (`e.clientY` vs. slot
midpoint) picks `:00` vs `:30` (L19253-19255) before the menu even opens; the
picked time is echoed in the menu header `.sm-at` (L19261).

## 8. Records — how the planner reads them

- `sessions` (L13750) — flat array, `saved.sessions || []`. No dedicated
  "planner records" accessor; every view filters this array directly.
- `onDay(s, d)` (L14530) / `partOfDay(s, d)` (L14520-14529, **verbatim, short,
  port exactly**):
```js
function partOfDay(s, d) {
  var end = s.end != null ? s.end : s.min + (s.dur || 90);
  for (var k = 0; k <= 2; k++) {
    if (!sameDay(s.date, addDays(d, -k))) continue;
    var a = s.min - k * 1440, b = end - k * 1440;
    if (b <= 0 || a >= 1440) return null;
    return { a: Math.max(0, a), b: Math.min(1440, b), tail: a < 0, cut: b > 1440 };
  }
  return null;
}
```
  Looks back up to 2 calendar days to catch a shoot that started earlier and
  spans into `d` (ceiling on shoot length = 2 days). `tail: true` = this is
  the continuation of a shoot that started the day before (starts at 00:00 in
  `d`'s frame, must not print its start time as if it began at midnight,
  L18975-18979/L19080-19084). `cut: true` = shoot continues past `d` into
  tomorrow.
- `shownRec(s)` (L26160) = `icsLayer || !isEvent(s)` — hides ICS-imported
  calendar events unless that layer is toggled on. Applied everywhere sessions
  are listed for display (`.filter(shownRec)` in month/week/day).
- `notWork(s)` (L26156) = `isMeet(s) || isEvent(s)` — meets/events are "not a
  shoot": no delivery deadline, muted styling, different label vocabulary.
- `blocksOn(d)` (L14002-14004) → `blocks.filter(blockCovers)`; `blockCovers`
  (L13996-14001) handles both single-day and multi-day (`allDay` + `days`)
  blocks.
- `dayMark(d)` (L14531-14539) — used only by month cells — scans all sessions
  on `d`, returns the highest-`rank` `deliveryState` (i.e. the worst/most
  urgent one) to color that day's ring.
- `deliveryState(s)` (L14480-14509) and `resolveDeadlineDays`/`deadlineDate`
  (L14428-14445) — deadline resolution order: per-record override
  (`s.deadlineChoice` as a number) > genre has no delivery field at all
  (`GENRE[s.type].delivery === false`, e.g. street/landscape) > global
  delivery mode `"none"`/`"single"`(fixed days)/else genre-specific
  (`genreDeadline`).
- `qualityOf(d)` / `qualityAt(at,d)` — §5 above; `dayWindow(d, at)` /
  `windowAt(d, at)` (L17822-17849) compute the golden/blue-hour window for a
  day, optionally at a saved location's coordinates (temporarily swaps global
  `LAT/LON/TZ`, always restores them — same pattern used by `daySky`,
  `windowAt`).

## 9. Surprising / traps

1. **`selDate` ≠ the planner's selected day.** `selDate` is the cross-screen
   "viewed day" (Today/Map/Light screens); the planner's own selection is
   `calSel`. Functions that need "the calendar's day's" sun/weather
   (`dayWindow`, `daySky`, `windowAt`) temporarily hijack `selDate`/`LAT`/`LON`
   via `computeSun(d)` and always restore the original before returning. Port
   this as two separate pieces of state, not one, or cross-screen light calc
   will silently start reading the wrong day.
2. **`openGaps` is dead code.** Declared (L12271), reset on every day-step
   (L34389), never read or written. The comment above its declaration
   (L12268-12270) describes a "which free hours has the photographer expanded"
   feature that does not exist in the current render path — confirmed by the
   explicit dead-code removal note at L4896-4904 (a prior gap/free-window CSS
   layer, `.dl-free`/`.dl-gap`/`.dl-nowline`, was deleted wholesale). **Do not
   implement an "open gaps" mechanism when porting — there is nothing to
   replicate**, only the tap-to-create hour slots (§7).
3. **Two unrelated colors both look like "day quality".** The date-number ring
   in month cells (`.d-n::before`, background = `--mark`) is colored by
   **delivery urgency** (`dayMark`→`deliveryState`, worst session that day),
   not by sky/weather quality. The genre *label text* next to it is colored by
   **sky quality** (`QUAL[qualityOf].dot`). If the native rewrite needs one
   "day quality dot" concept, decide explicitly which of these two signals it
   should represent — they diverge often (a day can have great light and a
   badly overdue delivery, or vice versa).
4. **`.cal .d .dot` CSS class exists but is never instantiated in markup** —
   `grep '\.dot'` finds a styled 5×5px transparent dot rule (L4435) with no
   matching `<span class="dot">` anywhere in `cell()`. Likely another
   leftover from a prior design; don't treat its presence in CSS as evidence
   of a feature to port. Similarly `.legend .ring`/`.ring.due` (L4912-4913)
   are styled but never referenced from JS.
5. **Now-line hour-hiding thresholds are hand-measured, not round numbers**:
   `HUSH_UP = 12.2`, `HUSH_DN = 15.7` (L19012), asymmetric because the
   now-capsule sits 1.75px below its own gridline and the hour-label is
   raised 6px above its line — see the full derivation comment at
   L18991-19011. If SwiftUI lays out the now-line/hour-label differently
   (different fonts, different vertical rhythm), these two numbers must be
   re-derived from the new layout, not copied verbatim.
6. Multi-day shoots (`partOfDay` 2-day lookback) mean a single `sessions[]`
   entry can produce **up to 3 timeline items** across 3 different day
   renders (start day, any full middle day, end day) — the item's `tail`/`cut`
   flags are what keep the label text honest about which fragment is showing.
7. Week view deliberately dropped per-day light-strips in favor of occupancy
   cards (design decision quoted at L18059-18062) — if asked for "weekly
   light overview" during porting, that's explicitly *not* what this screen
   currently shows; only one light line (sunset or golden-hour start) survives
   per day row.
8. The month→day transition is a hand-rolled DOM clone/clip-path animation
   (`partMonthIntoDay`, L34166-34267) that splits the source screen into two
   clipped halves and promotes the real week-row cells (not clones) into the
   date-strip position — a non-trivial custom transition with detailed
   comments about why simpler approaches (opacity fades, cloning `.screen`)
   broke. Do not assume a plain cross-fade is equivalent; re-read the comments
   if the native transition needs to feel the same.
9. Sunrise/sunset marks on the timeline are unconditional (always drawn) while
   the "sunset quality" color cue in the day-summary strip is conditional on
   having a *real* forecast (`dw0.real`, L18876) — cloudy-day handling differs
   between these two nearby UI elements by design, not by oversight.

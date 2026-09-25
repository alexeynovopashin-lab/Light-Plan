# Iteration 22 — web planner (year, year-12, stats, search, trash, busy time) as the porting reference

Written 2026-09-25 by the iteration-22 chat: three Opus subagent reads of `beta/index.html` (frozen web, line numbers hold). Read from code, not measured on screen, unless a line says «verified».

**Corrections verified by the executor (override the text below):**
- Search results ARE tappable: `renderSearch` wires `.plan-row` → close search + `openCard` (L34619–34624). The `.dl-ev` loop above it is dead, the rows are not. The bin part (§C.1 of part 3) says otherwise — wrong.

# Part 1 — year and year-12


Source: `beta/index.html` (= `IX`), `beta/lang.js` (= `LJ`). All line numbers refer to these files as of 2026-09-25.
Tokens: dark `:root` L1269–1345, light `:root[data-theme="light"]` L1349–1420.

## 0. Naming — the two views are NOT the same thing

| Code name | User name | What it is |
|---|---|---|
| `#yearOverlay` (IX L9607) | «лента месяцев», header number = year | Vertically scrolling list of 24 mini-month calendars (yearShown and yearShown+1), each ~full width. Tap a DAY → planner day scope. Tap a MONTH NAME → planner month scope. |
| `#year12Overlay` (IX L9673) | «Год целиком» | Non-scrolling 3×4 grid of 12 tiny months for `yearShown`. Tap a month → ZOOM into `#yearOverlay` (the lenta), scrolled to that month. **It does NOT go to the planner month view.** |

Neither is a `calScope` value. `calScope` ∈ {`month`,`week`,`day`} only: `SCOPE_IC` L34119, scope menu HTML L10338–10341 (3 buttons: `plan.viewMonth` «Один месяц», `plan.viewWeek` «Неделя», `plan.viewDay` «Один день»). Both year views are `.overlay` layers stacked above the planner screen `#s-plan`. The scope fan has no year entry.

Navigation graph:
```
planner (any calScope) --tap #planTitle--> #yearOverlay (slide up)
#yearOverlay --tap #yTitle (year number)--> #year12Overlay (slide up, lenta stays open under it)
#year12Overlay --#year12Back--> #yearOverlay (overlay close)
#year12Overlay --tap month tile--> ZOOM --> #yearOverlay scrolled to that month (year12 closed)
#yearOverlay --#yearClose--> planner, calScope unchanged (overlay close)
#yearOverlay --tap month name--> planner, setScope("month") (overlay close)
#yearOverlay --tap day number--> planner, setScope("day") via partMonthIntoDay (split animation, no slide)
#yearOverlay --#yearAdd--> closes lenta, opens new-shoot form
```

## 1. Entry / exit / state

State vars: `yearShown` (int year, IX L18282, init `calMonth.getFullYear()`), shared by both views and the stats screen. `calMonth` (first of month), `calSel` (selected day), `calScope`.

- **Open lenta** — `#planTitle` click, IX L34439–34451 (`#planTitle` HTML L8068: left-pointing chevron `.pt-chev chv lt` icon `chevron` + `#calMonth` text). Steps: `yearShown = calMonth.getFullYear()`; `renderYear()`; `scrollYearTo(calMonth.y, calMonth.m, then)` → in next rAF sets `#yearScroll.scrollTop = monthEl.offsetTop - 8` (L18492–18507), then adds `.open`. Order matters: scroll is set while overlay is still `visibility:hidden`, THEN it slides in (comment L34442–34448: WebKit glitch otherwise). Works from month, week and day scope alike.
- **Close lenta** — `#yearClose` (L34452): remove `.open` only. No state change: `calScope`, `calMonth`, `calSel` untouched; `yearShown` keeps its value (re-seeded on next open).
- **Open year-12** — `#yTitle` click (L34465–34468): `renderYear12()` + add `.open`. Uses `yearShown`, NOT the year currently shown in `#yTitle` (see Trap T3). Lenta stays open underneath.
- **Close year-12** — `#year12Back` (L34469): remove `.open`. Lenta beneath keeps its scrollTop, but its content was re-rendered for the new `yearShown` if the user paged years (L34474) — «inferred»: lenta then shows the new year's months at the old scroll offset.
- **Stats** (`#statsOverlay`, `.overlay-right`, L9696) is reachable from lenta header `#statsBtn` (L34547, hidden when year has 0 work shoots, L18565) and from planner `#planStats` (L34456: seeds `yearShown`, `renderYear()`, opens). `renderMonthBars` lives there (§3.3).
- Overlay base (IX L6754–6762): `.overlay { position:absolute; inset:0; background:var(--surface); z-index:80; padding:0 24px 40px; overflow-y:auto; transform:translateY(101%); transition: transform 0.42s cubic-bezier(0.25,1,0.4,1); visibility:hidden }`, `.open { transform:none; visibility:visible }`. So open = slide up from bottom, 420 ms, that curve. `visibility` is not in the `transition` list, so it flips at once in both directions: on close the layer becomes invisible immediately and the slide-down is not seen «inferred from CSS, not measured».
- z-order: `#yearOverlay { z-index:25 }` L3395, `#year12Overlay { z-index:25 }` L3401 (later in DOM → above lenta). Tab bar z 30 (L5391) stays visible over both (comment L3396–3400). During zoom `#yearOverlay.zoom-in { z-index:26 }` L3406.

## 2. Layout

Assume phone width 390 → content width 342 (24 px side padding). Derived sizes marked «computed».

### 2.1 `#yearOverlay` (lenta)
- `#yearOverlay { overflow:hidden; padding:0 }` L3395 — overlay itself does not scroll. Two children:
- **Header** `.year-sticky-head` L3410–3416: `position:absolute; top:0; left:0; right:0; z-index:5; background:var(--surface); padding:0 24px 4px`; ≤500px: `padding-top: calc(env(safe-area-inset-top) + 14px)`. Not sticky — a separate fixed layer (reason: L3384–3394).
  - Row 1 `.form-top` (L6802: flex, space-between, center):
    - Left `#yearClose.back` (L7351: 15px, color `--ink-4`, padding 8px 0, inline-flex gap 7px): chevron icon `chevron` rotated 180° (`.chv.lt`, L7609–7616: 16×16, stroke 2.4 round, color inherit) + text `nav.shoots` = «Съёмки» (LJ L971).
    - Right `.year-head-acts` (L3427: flex, gap 2px) with 3 `.icon-btn` (effective rule L4351–4355 overrides L3584: padding 6px, color `--brass`, svg 22×22 stroke 1.6, no fill):
      1. `#yearAdd` inline SVG calendar+plus (`rect 3,4.5 18×17 rx2.5; M3 9.5h18 M8 2.5v4 M16 2.5v4 M12 12.5v5 M9.5 15h5`), aria `plan.newShoot` «Новая съёмка».
      2. `#statsBtn` bar chart (`M6 20V13 M12 20V8 M18 20V4`), aria `plan.stats` «Статистика», `hidden` unless year has work shoots.
      3. `#yearSearchBtn` magnifier (`circle 11,11 r7; M16.5 16.5L21 21`), aria `plan.search` «Поиск» → `openSearch` (L34633).
      These are inline SVGs, not icons.js.
  - Row 2 `.year-nav` (L3428: flex, margin-top 10px; `#yearOverlay .year-nav {justify-content:center}` L3433): only `#yTitle` `.y` (L3434: 30px, weight 650, letter-spacing −0.5px, tabular-nums, color inherits `--ink`). Tappable (L3438 cursor pointer). No arrows (removed, comment L9638–9642).
- **Scroller** `#yearScroll.year-scroll` L3421–3425: absolute, left/right/bottom 0, `top` set in JS = header offsetHeight (`syncYearHeadSpace` L18513, called at end of `renderYear`); `overflow-y:auto; overscroll-behavior:contain; padding: 0 24px calc(var(--tabh,84px) + 16px)`.
  - `#yearGrid.year-cal-list` margin-top 22px (L3447). Two `.year-block[data-year]` (L18530–18540): yearShown then yearShown+1; the second starts with `.year-divider` (L3454–3458): text = year, `margin:6px 0 24px; padding-top:24px; border-top:1px solid var(--hair); 26px/650; letter-spacing −0.5px; color --ink-4; tabular-nums`.
  - Each month `.year-cal-month` margin-bottom 26px (L3448):
    - `.year-cal-name` button L3459–3463: full width, left-aligned, `padding:0 0 8px; 15px/600; letter-spacing −0.1px; color --ink`; `.now` (current month) → `--brass` L3464. Text `monthTitleN(m)` (L10790 → `Intl {month:"long"}` + capitalised, ru «Январь»…).
    - `.year-cal-wd` L3466–3469: 7-col grid, margin-bottom 4px, 10px, `--ink-7`, uppercase, letter-spacing 0.5px, centred. Cells from `wdRowCells()` L10801: Monday-first always, `Intl weekday:"short"` cut to 3 chars, capitalised → «ПН ВТ … ВС».
    - `.year-cal-grid` L3470: 7 cols, row-gap 3px. Leading blank `<span>`s = `(first.getDay()+6)%7` (Mon-first); NO trailing blanks. Day `<button>` L3471–3475: `aspect-ratio:1; border-radius:50%; color --ink-3; 13.5px; tabular-nums`, weight normal. Cell ≈ 48.9×48.9 «computed at 342 width». Pressed `:active` → background `--sheet` on the whole round cell (L3476).
    - Today L3483–3491: text `--on-brass` (#16120C dark / #FFFFFF light), weight 700; `::before` 30×30 circle `--brass` centred behind (same diameter as day view `.dd-num`).
  - `#yearSum.year-sum` after both years (L3541–3545): margin-top 34, padding-top 18, border-top 1px `--hair`, 13px `--ink-6`; `<b>` `--ink-3` 600 tabular. Content L18550–18555: `<b>N</b>` + `LANG.sep` + plural of `unit.shoot` (съёмка/съёмки/съёмок) + `year.next` « · ближайшая {date}» (date=`dMon`, bold) if a work shoot is ≥ today's midnight; if N=0 → `year.free` «Год пока свободен — время планировать». Counts only `yearShown`, only `!notWork(s)` (meetings/events excluded, `notWork` L26158).
- **`#yearNow`** `.now-back.day-float` (L9664). Effective style (cascade L3375 + L4356 + L4473): `position:fixed; left:50%; translateX(-50%); bottom: calc(var(--tabh,74px)+12px); z-index:12; padding:9px 16px; border-radius:999px; background --overlay-3 (dark rgba(44,41,36,.68)/light rgba(214,208,195,.74)); backdrop blur(18px) saturate(1.5); shadow 0 6px 20px --glass-cast + inset 0 1px 0 --glass-shine + inset 0 0 0 1px --hairline; 12.5px/600, letter-spacing .4px, color --brass-deep`. Text `today.backToday` «↺ сегодня». Shown only when `yearShown !== current year` (L18520).

### 2.2 `#year12Overlay` (Год целиком)
- `.overlay.pad`: padding `56px 24px` top/sides (L6763); ≤500px top = `safe-area-top + 14px` (L6785); bottom `calc(var(--tabh,84px)+16px)` (L3401). Scrolls itself if taller (base `.overlay`).
- `#year12Back.back` (as §2.1 back): chevron-left + `year.one` «Год» (LJ L976).
- `.year-nav` with inline `margin-top:14px` (L9680), justify **space-between** (the centring override is lenta-only): `#year12Prev` | `#year12Title` | `#year12Next`. Buttons L3440–3443: no bg, color `--ink-4`, padding 9px 14px; icon `chevron` (prev rotated 180° via `.lt`). Title 30px/650 as `.y`; `.now` (yearShown == current year) → `--brass` (L3439, L18482).
- `#year12Grid.year12-grid` L3498: 3 columns, `gap: 22px 12px` (row 22, col 12), `padding: 4px 0 20px`. Tile width ≈ (342−24)/3 = 106 «computed».
- Tile `button.year12-month` L3499–3502: no bg/border, padding 0, text-align center.
  - `.year12-name` L3503: 12.5px/650, letter-spacing .1px, `--ink`, margin-bottom 7px; current month → `--brass` (L3504). Same `monthTitleN` text.
  - NO weekday header row.
  - `.year12-days` L3505: 7 cols, row-gap 2px. Leading blanks as lenta, no trailing. Day `span` L3506–3509: 8.5px, line-height 1.9 (≈16.15px row «computed»), `--ink-4`, tabular.
  - Today L3510–3517: text `--on-brass` 700; `::before` 14×14 brass circle centred (fixed size, not %: cell is wider than tall).
  - Busy dot L3522–3527: `.busy::after` 3×3 circle, bottom 1px, centred, `--brass-soft` (#D9AC6B / #9B6A22). `.busy.many::after` 4.5×4.5 `--brass`; `.busy.many` text `--ink` 700.
- `#year12Now` same `.now-back.day-float` pill, «↺ сегодня», shown when yearShown ≠ current year (L18483).

Colour tokens used (dark / light): `--surface` #0F0E0C/#FAF8F3 · `--sheet` #17150F/#FFFFFF · `--ink` #EFEAE0/#17150F · `--ink-3` #A8A093/#55504A · `--ink-4` #8A8478/#6B6559 · `--ink-6` #635E54/#8C8578 · `--ink-7` #55504A/#9A9385 · `--brass` #E2A44C/#A9721F · `--brass-soft` #D9AC6B/#9B6A22 · `--brass-deep` #C9853F/#8A5A18 · `--on-brass` #16120C/#FFFFFF · `--hair` rgba(255,255,255,.05)/rgba(0,0,0,.07) · `--meter-off` #3A352E/#D2CBBC.

## 3. What cells show

### 3.1 Lenta (`buildMonthEl`, L18286–18335)
Per day: only the number. **No** shoot marks, no urgency/quality colour, no weekend style, no past-day dimming, no selected (`calSel`) mark, no other-month days (blank spans). Only marks: today circle; current month name in brass. Deliberate: «чистая навигация» (L3441–3446, L9646–9650).

### 3.2 Year-12 (`buildMiniMonth12`, L18342–18381)
- `counts[d]` = number of sessions with `!notWork(s)` and `s.date` in (y,m), keyed by `s.date.getDate()` (L18349–18353). Uses the start date only — multi-day shoots (e.g. 19:10–03:10) mark only the start day.
- n=1 → `busy` (small soft dot); n≥2 → `busy many` (bigger brass dot + bold ink number). No count digit.
- Today circle as §2.2. No weekend/past/selected styling, no urgency colour.

### 3.3 `renderMonthBars` (L18594–18619) — on the STATS screen, not in either year view
- For m in 0..11: `n` = count of ALL sessions with year==yearShown & month==m (**no notWork filter** — see T5); `worst` = session with max `deliveryState(s).rank` (strict `>`, first wins ties).
- `maxN = max(1, ...n)`. `has` = any n>0; hides `#monthsLabel`, `#monthsNote`, `#yearMonthBars` if not.
- Row `.ym-row` (L3531–3540): flex gap 12, padding 8px 2px, border-bottom 1px `--hair` (not last). Name `.ym-n` width 70, 13.5px/600 `--ink` (empty month: `--ink-7`, 500). Bar `.ym-bar` flex 1, height 4, radius 2, bg `--meter-off`; fill `<i>` width `pct = n ? max(8, round(n/maxN*100)) : 0` %, background `worst.color`. Count `.ym-c` width 16, right, 12.5px `--ink-4`, blank for 0.
- `deliveryState` (L14482–14510) → colour: notWork → GREY rgb(107,101,91) rank 0; delivered → GREY rank 0; future (`shot > now`) → `urgencyCalm()` (dark [239,234,224] / light [23,21,15]) rank 1; past without deadline → GREY rank 1; past with deadline: `p=(now−shot)/(deadline−shot)`; p≥1 → rank 3, dark [201,102,61] / light [138,63,34]; else rank 2 `urgencyRGB(p)` (L14458: piecewise-linear stops dark 0:[239,234,224] .5:[232,208,122] .8:[226,164,76] 1:[201,102,61]; light 0:[23,21,15] .5:[122,90,34] .8:[166,86,45] 1:[138,63,34]).
- Labels: `year.months` «Занятость по месяцам», `year.monthsNote` «Число — съёмок в месяце» (LJ L651–652). Rows are not tappable.

## 4. Interactions

Lenta:
- **Tap day** (L18304–18320): `calMonth = first of (y,m)`, `calSel = (y,m,d)`; `partMonthIntoDay(cells, idx, #yearOverlay, "year-cal-grid", commit)`; commit = lenta `transition:none`, remove `.open`, restore transition next rAF, `setScope("day")`, `renderCal()`, `renderDayPanel()`. Animation (L34162–34258): the source overlay is replaced by two clones clipped above/below the tapped week row (z 28, opaque `--surface`); the 7 real cells of that row are moved into absolutely positioned shells (z 29); after `commit()`, next rAF: upper clone `translateY(−(rowTop−devTop+12))`, lower `translateY(devBottom−rowBot+12)`, both `transform 0.34s cubic-bezier(0.4,0,0.2,1)`, `opacity→0 0.1s ease delay 0.24s`; each shell flies (transform-origin top-left) to the matching `.dd-day` cell of `#dayDates` with non-uniform `scale(tw/w, th/h)`, same 0.34s curve, opacity 0.1s delay 0.26s. `#dayDates` hidden until 280 ms; clones removed at 400 ms. If the row has <7 cells → no animation, commit immediately (T1).
- **Tap month name** (L18322–18333): `calMonth=(y,m,1)`; `calSel` = today if (y,m) is current month else (y,m,1); `setScope("month")`; remove `.open` (normal overlay close, see §1 note on visibility); `renderCal(); renderDayPanel()`.
- **Tap `#yTitle`** → year-12 (§1).
- **`#yearNow`** (L34498–34502): `yearShown = current`, `renderYear()`, `scrollYearTo(now.y, now.m)` (instant scrollTop, no smooth).
- **`#yearAdd`** (L34508–34511): remove lenta `.open`, then `openForm(calSel, round(dayWindow(calSel).a), null, true)` — form for the planner's selected day at the start of its light window; nothing year-specific.
- **Scroll** (L34518–34529): `#yTitle` text = `data-year` of the last `.year-block` with `offsetTop − scrollTop ≤ 4`. Does NOT change `yearShown`.
- No swipe handler on the lenta.

Year-12:
- **Prev/Next** (L34474–34476): `yearShown ± 1`, `renderYear12()`, `renderYear()`. Instant, no animation.
- **Swipe** (L34480–34493) on the whole `#year12Overlay`: touchstart records single-finger x0,y0 (multi-touch cancels); touchend: ignore if `|dx| < 60` or `|dy| > 40` (px); `dx<0` (swipe left) → next year, `dx>0` → previous. No drag-follow, no animation; passive listeners.
- **`#year12Now`** (L34494–34497): `yearShown=current`, both renders; lenta not re-scrolled.
- **Tap tile** (L18374–18378) → `zoomYear12ToMonth(y, m, e.target !== btn ? e.target : null, btn)`.

## 5. Zoom `zoomYear12ToMonth(yy, mm, originEl, tileEl)` (L18423–18476)

Moves two live layers; nothing is cloned. `yo = #year12Overlay` (source), `target = #yearOverlay` (lenta, already open underneath).
1. `srcGrid = tile .year12-days`. `day = +originEl.textContent` iff `originEl.parentNode === srcGrid`, else 0 (tap on name, tile padding, or a blank span → 0).
2. `scrollYearTo(yy, mm, cb)` — waits one rAF, sets lenta scrollTop to that month (−8), then cb. Everything below runs in that rAF.
3. Rects: `dstGrid` = lenta `.year-block[data-year=yy]` → month mm → `.year-cal-grid`; `dstEl` = its button whose text == day. `from` = rect of originEl if day else srcGrid; `to` = rect of dstEl || dstGrid || target. `k = dstGrid.width / max(1, srcGrid.width)` (≈342/106 ≈ 3.2 «computed»).
4. `o` = yo rect, `q` = target rect (both inset 0 → normally equal). Centres `f=(fx,fy)` of from, `g=(gx,gy)` of to.
   `tx = gx − o.left − k·(fx − o.left)`, `ty = gy − o.top − k·(fy − o.top)`.
   `ux = o.left − q.left + (q.left − o.left − tx)/k`, `uy` likewise (with o=q: `ux = −tx/k`, `uy = −ty/k`).
5. Start frame (transition none, `transform-origin: 0 0` on both):
   - yo: `translate(0,0) scale(1)`; class `zoom-out`.
   - target: `translate(ux,uy) scale(1/k)`, `opacity 0`; class `zoom-in` (z 26, background transparent, header background transparent — L3406–3407).
   - Force layout (`offsetWidth` reads).
6. End values with transitions: `DUR = 460 ms`, `EASE = cubic-bezier(0.3,0.7,0.1,1)`.
   - yo: `transform DUR EASE` → `translate(tx,ty) scale(k)`.
   - target: `transform DUR EASE, opacity 160ms linear` → `translate(0,0) scale(1)`, opacity 1.
   - yo gets `fading`: its direct children fade `opacity 1→0`, `200ms linear`, delay `60ms` (L3408–3409). yo's own `--surface` background stays opaque the whole time (covers the app beneath the transparent lenta).
7. Math check (verified algebraically from L18446–18461): with shared progress e∈[0,1] (CSS interpolates translate and scale linearly each), yo maps f to `(1−e)f + e·g`; target maps g to the same point; target scale / yo scale = 1/k on every frame. So the tapped date on both layers coincides on every frame and moves in a straight line from f to g. **Swift: drive both layers from one progress value with the same curve.**
8. Cleanup at `DUR + 20 = 480 ms` (setTimeout): both layers `transition:none`, clear transform / transform-origin / opacity; yo remove `open`, `zoom-out`, `fading` (it disappears instantly — no slide); target remove `zoom-in` (background back to opaque); next rAF restore both `transition` to CSS default.
9. State: `calScope`, `calMonth`, `calSel` are NOT touched; `yearShown` unchanged (tile year == yearShown). Final state = lenta open, scrolled so month mm's name is 8 px below the scroller top. `#yTitle` follows via scroll listener.
10. Timeline summary: 0–16 ms wait (rAF) · 0–160 lenta fades in · 60–260 year-12 content fades out · 0–460 both transforms · 480 teardown.

**Reverse animation: none.** Lenta → year-12 is the plain overlay slide-up (420 ms, cubic-bezier(0.25,1,0.4,1)); `#year12Back` is a plain overlay close. Lenta → planner month is a plain overlay close (§1); lenta → day is `partMonthIntoDay`. No planner-month → year zoom exists.

## 6. Traps / dead code (verified by grep)

- **T1** Day tap in the last week of a lenta month: grid has leading blanks only, so the last row usually has <7 children → `partMonthIntoDay` hits `row.length !== 7` (L34164) → commit without any animation (overlay just vanishes: `transition:none`). Also the first row is always full (blanks count). Port: pad trailing cells or accept.
- **T2** `#year12Next` has `data-i18n-aria="year.next"` (L9683), but `year.next` = « · ближайшая {date}» (LJ L643, the year-sum template). i18n applier L33341–33342 sets aria-label from the key → VoiceOver reads the template. `year.prev` is correct «Прошлый год». No «Следующий год» key exists in LJ (grep). Port: new key.
- **T3** `#yTitle` shows the scrolled-into year (yearShown+1 after the divider, L34528), but tapping it opens year-12 for `yearShown` (L34466). `#yearNow` visibility also ignores the scrolled year.
- **T4** `renderYear()` is called only from: `#planTitle`, `#planStats`, `stepYear12`, `#year12Now`, `#yearNow` (grep L18515 callers). Lenta content is not refreshed on data or language change while open.
- **T5** Inconsistent counting: year-12 dots and `#yearSum` exclude `notWork` (meetings/events); `renderMonthBars` counts all sessions (L18598–18600); their colour is GREY rank 0 so they don't affect worst colour but inflate `n`/bar length. Also `renderMonthBars` colour ignores ties (`>`), first session in iteration order wins.
- **T6** Dead CSS: `.year-cal-grid span.pad` (L3491 — blanks are created without class; grep `"pad"` no hits), `.year-cal-name.empty` (L3465 — never set, only L18293 assigns the class). `.year-sum`/`#yearSum` covers only `yearShown` although two years are listed.
- **T7** Dead lang key: `year.back` «Год» (LJ L655) — no use in IX (grep). Back buttons use `year.one`.
- **T8** Duplicate `.icon-btn` / `.now-back` rules (L3584 vs L4351, L3375 vs L4356): later ones win (padding 6px, svg 22px/1.6 not 23px/1.7). `.icon-btn[hidden]` (L3591) needed because `display:flex` beats `[hidden]`.
- **T9** No `prefers-reduced-motion` handling for the zoom, the split, or overlay slides (grep: none in L6754–6790, L18280–18480, L34160–34520).
- **T10** `partMonthIntoDay` moves the 7 real day buttons out of the lenta DOM (L34217–34229) and deletes them at 400 ms; the lenta is only whole again after the next `renderYear()` (on next `#planTitle` open it is).
- **T11** Zoom origin: taps on the year-12 month NAME or on blank area zoom from the whole grid centre to the lenta month grid centre (not a date). Multi-day shoots mark only their start day in year-12 (`s.date.getDate()`).
- **T12** `yearShown` persists between opens only until the next `#planTitle` tap re-seeds it from `calMonth`; `#planStats` also re-seeds it. `.day-float` pills are `position:fixed` inside a transformed overlay during slides/zoom → they move with the layer «inferred from CSS containing-block rules, not measured».
- **T13** `.year-sticky-head` has 0 top padding above 500 px width (padding-top only in the ≤500 px media query, L3414–3416); desktop preview differs from phone.

# Part 2 — statistics, search, delivery setting


Source: `Light_Plan/beta/index.html` (= IDX, 36902 lines) and `beta/lang.js` (= LJS). Line numbers are IDX unless marked LJS.
All claims read from code; nothing measured on device. «inferred» = my reading, not verified by a grep.

---------------------------------------------------------------------------------------------------
## 0. Shared data model (fields read by all three features)

`sessions[]` — live records (Date `date` normalised to local midnight by `dayOf`, L13328). Fields used here:
`date` (midnight), `min` (start minute of day), `end` (end minute, may exceed 1440) | `dur` (fallback 90),
`type` (genre code: wedding, party, lovestory, family, portrait, animals, landscape, architecture, street, report, product, ad),
`sub` (sub-genre), `kind` ("meet" | "event" | undefined=shoot), `contact` (string; mirrors persons' first names / org name, see L31706 `contactLine`),
`place`, `placeTown`, `currency`, `pay`, `rate`, `units`, `expense`, `delivered` (bool), `deliveredAt` (ISO string | null; set/cleared together at L29524-29525),
`deadlineChoice` ("auto" | number of days | null = no deadline | undefined = auto).

Trash: deleting moves the record OUT of `sessions` into `trashed[]` (L19716-19722). So every feature below that iterates `sessions` automatically excludes trashed records. No other "status" (cancelled etc.) exists — grep for `cancel` finds only UI buttons.

Predicates (L26147-26162):
- `isMeet(s)` = kind==="meet"; `isEvent(s)` = kind==="event" (imported ICS); `notWork(s)` = meet || event.
- `shownRec(s)` = `icsLayer || !isEvent(s)` (ICS layer toggle hides events).

Money (L14344-14421):
- `sessionIncome(s)`: 0 if notWork or no `pay`. mech = `PAY[s.pay].m` or `s.pay`. hourly → `rate*(dur/60)`; unit → `rate*units`; monthly → `rate==null ? repShare(s) : rate`; else (flat/pack/object/item) → `rate`.
- `sessionNet(s)` = `sessionIncome(s) - (+s.expense||0)`.
- `sessionCurrency(s)` = `s.currency` if in `CURRENCIES` else global `currency`. `CURRENCIES = ["RUB","USD","EUR","GBP","JPY","CNY"]` (L13644), global default "RUB" (`saved.currency`).
- `money(n, cur)` (L14374): `Math.round(n)`, `Intl.NumberFormat(LANG.code, {style:"currency", currency: cur||currency, currencyDisplay:"narrowSymbol", min/maxFractionDigits:0})`; fallback `currencyDisplay:"symbol"`, then `n.toLocaleString()+" "+currencySign`. RU result e.g. `12 345 ₽` (NBSP grouping from locale). Swift: `NumberFormatter` currency, locale = app language, maxFractionDigits 0, round half-away (JS Math.round rounds .5 up toward +∞ — note for negatives: −2.5→−2).
- `sumByCurrency(list, fn)` (L14396): sum per `sessionCurrency`; drop codes whose sum is exactly 0; sort: home currency first, then by sum descending. Returns `[{code,sum}]`.

Deadline (L14424-14505):
- `GENRE_DEADLINE = {wedding:90, party:14, lovestory:14, family:14, portrait:7, animals:7, landscape:14, architecture:5, street:14, report:3, product:5, ad:10}`.
- `DELV_DAYS = [3,7,14,30,90]`. `delivery = saved.delivery || {mode:"genre", days:7}`.
- `genreDeadline(g)` (L26121) = `genrePrefs[g].delvDays` if not null/undefined, else `GENRE_DEADLINE[g]`, else 7.
- `resolveDeadlineDays(s)` — ORDER MATTERS:
  1. `s.deadlineChoice === null` → null (no deadline)
  2. `typeof s.deadlineChoice === "number"` → that number (beats global "none"!)
  3. `GENRE[s.type].delivery === false` (landscape, street; L25181/25183) → null
  4. `delivery.mode==="none"` → null
  5. `delivery.mode==="single"` → `delivery.days`
  6. else → `genreDeadline(s.type)` (sub-genre ignored)
- `deadlineDate(s)` = null or `s.date` (midnight) + d calendar days → deadline = 00:00 of that day.
- `deliveryState(s)` (L14482) → `{rank, c:[r,g,b], breath, label, short?, color, fill}`:
  - notWork → rank 0, GREY [107,101,91], label "".
  - delivered → rank 0, GREY, `delv.done` «материал сдан».
  - `s.date > now` (date is midnight, so today's shoot is NOT "ahead") → rank 1, `urgencyCalm()` (dark [239,234,224], light [23,21,15]), `delv.ahead` «предстоит».
  - no deadline → rank 1, GREY, `delv.noTerm` «без срока».
  - else p = (now−shot)/(deadline−shot); left = ceil((deadline−now)/86400000 ms).
    p ≥ 1 → rank 3 overdue, c = light [138,63,34] / dark [201,102,61], breath true, short = count(unit.dayShort, |left|), label `delv.overdue` «просрочено на {days}».
    p < 1 → rank 2, c = `urgencyRGB(p)`, short, label `delv.dueIn` «сдать за {days}».
  - `color = rgb(c)`; `fill = rank≥3 ? rgba(c,0.32) : null`.
- `urgencyRGB(p)` (L14458), p clamped 0..1, piecewise-linear lerp between stops:
  dark: 0 [239,234,224] → 0.5 [232,208,122] → 0.8 [226,164,76] → 1 [201,102,61];
  light: 0 [23,21,15] → 0.5 [122,90,34] → 0.8 [166,86,45] → 1 [138,63,34].

Theme tokens used below (dark / light, L1276-1413): `--surface` #0F0E0C/#FAF8F3; `--sheet` #17150F/#FFFFFF; `--sheet-2` #131109/#F1EDE4; `--sheet-3` #1A1710/#FFFFFF; `--seg-on` #2A2724/#DDD6C8; `--press` #221F19/#EDE9E1; `--press-brass` #33291A/#F7E9CF; `--ink` #EFEAE0/#17150F; `--ink-3` #A8A093/#55504A; `--ink-4` #8A8478/#6B6559; `--ink-6` #635E54/#8C8578; `--ink-7` #55504A/#9A9385; `--ink-8` #4A453E/#ADA697; `--brass` #E2A44C/#A9721F; `--brass-deep` #C9853F/#8A5A18; `--green` #A8B49B/#5F6B4E; `--terra` #C9663D/#A84E27; `--hair` rgba(255,255,255,.05)/rgba(0,0,0,.07); `--meter-off` #3A352E/#D2CBBC; `--bar-2` rgba(23,21,15,.55)/rgba(255,255,255,.62); `--glass-shine` rgba(255,255,255,.30)/(.95); `--glass-cast` rgba(0,0,0,.45)/rgba(23,21,15,.16).

---------------------------------------------------------------------------------------------------
## A. STATISTICS screen (`#statsOverlay`)

### A.1 Entry / exit
- Entry 1: `#planStats` in the Plan header `.plan-acts` (L8080), visible in month/week/day. Click (L34456): `yearShown = calMonth.getFullYear(); renderYear(); open`. Always enabled, even for an empty year.
- Entry 2: `#statsBtn` in the Year screen header `.year-head-acts` (L9630). Hidden unless the shown year has ≥1 work record (`$("statsBtn").hidden = !all.length`, L18562). Click (L34547) just adds `.open` — content was built at the last `renderYear()`.
- `renderYear()` is called only on: opening Year (L34439-34440), planStats, year12 prev/next/now, yearNow (L34455-34500). NOT on data edits, settings change or language change → stats can be stale if opened via statsBtn after edits made while Year stayed open (inferred low-impact). Swift: recompute on appear.
- Tour step `{k:"stats", sel:["#planStats","#statsBtn"]}` (L33670) — onboarding highlight.
- Exit: `#statsClose` (`.back` with chevron-left + «Год» `year.one`) removes `.open` (L34550). Label says «Год» even when opened from Plan (returns to Plan, not Year) — trap/quirk. Tab switch closes all `.overlay-right.open` (L36697).
- No period switcher inside stats. Year = `yearShown` (from calMonth on planStats; from Year screen's year12 arrows otherwise; scrolling the year list does NOT change it, L34514-34517 comment).

### A.2 Container CSS
`.overlay-right` (L6792): absolute inset 0; bg `--surface`; z-index 85 (above `.overlay` 80); padding 0 24px 40px; overflow-y auto, scrollbar hidden; overscroll contain; `transform: translateX(101%)`, transition `transform 0.36s cubic-bezier(0.25,1,0.4,1)`, visibility hidden → `.open` transform none, visible. `.pad` padding-top 56px. NOTE: the phone safe-area override (L6785, `.overlay.pad{padding-top: calc(env(safe-area-inset-top)+14px)}` at ≤500px, and L1475 `.overlay`) does NOT match `.overlay-right` → stats top padding stays fixed 56px on phone (trap; in Swift use safe area + 14).
Slides in from the right (a "page" of the Year, not a modal sheet).
`.form-top` flex space-between center. `.back` (L7351): no bg, color `--ink-4`, 15px, padding 8px 0, inline-flex gap 7px; chevron icon `M8 4l8 8-8 8` rotated (`.chv.lt`).

### A.3 Layout order (L9696-9732) and render
1. `#statsEmpty` `.plan-empty` (14px, `--ink-7`), inline padding 20px 0. Text `stats.empty` (LJS 1441): «Пока не о чем рассказать — здесь появится занятость по месяцам, жанры и прибыль, как только в году будут съёмки.» Shown iff overload, monthsLabel, profitLabel and delvLabel are ALL hidden (L18586). (`#yearStat` genre lines are not part of the check.)
2. Overload `#yearOverload` `.say.bad` (§A.7).
3. `#monthsLabel` `.sec-label` «Занятость по месяцам» (`year.months`) + `#monthsNote` `.seg-note` «Число — съёмок в месяце» (`year.monthsNote`), inline margin -4px 0 10px + `#yearMonthBars` (§A.4).
4. `#yearStat` genre lines, inline margin-top 18px (§A.5).
5. `#profitLabel` «Прибыль» (`year.profit`), inline margin-top 22px + `#yearProfitVal` plate (§A.6).
6. `#delvLabel` «Сроки сдачи» (`year.delivery`), inline margin-top 22px + `#yearDelvVal` (§A.8).
All `.sec-label` here: 10px, letter-spacing 1.2px, uppercase, `--ink-7`, weight 600, padding 30px 24px 8px with inline padding-left 0 (L5106).
`.seg-note`: 12px, `--ink-6`, padding 10px 24px 0, line-height 1.5 (L5223) — inline margin overrides only margin.

### A.4 Months occupancy bars — `renderMonthBars()` L18594
- For m in 0..11: n = count of `sessions` with `date.year == yearShown && month == m`. NO filter on notWork and NO shownRec → meetings and (even hidden) ICS events are counted (trap; differs from every other year number, which excludes notWork). Past + future both counted.
- worst = deliveryState with max `rank` (strict `>` → first record wins ties); bar colour = `worst.color`. So month colour = overdue terra if any overdue; else urgency gradient of the first rank-2 record; else calm/grey.
- `maxN = max(n…, 1)`; `has = any n>0`; if !has hide label, note and list.
- Row HTML: `.ym-row[.empty]` > `.ym-n` (monthTitleN(m) = capitalised standalone month name, `Intl {month:"long"}`) + `.ym-bar` > `<i style="width:pct%;background:color">` (only if n) + `.ym-c` (n or "").
- `pct = n ? max(8, round(n/maxN*100)) : 0`.
- CSS (L3531-3540): `.year-months` margin-top 10; `.ym-row` flex center gap 12, padding 8px 2px, border-bottom 1px `--hair` (none on last); `.ym-n` width 70, 13.5px/600 `--ink` (empty row: `--ink-7`, 500); `.ym-bar` flex 1, height 4, radius 2, bg `--meter-off`, overflow hidden; `i` full height radius 2; `.ym-c` width 16, right-aligned, 12.5px `--ink-4`, tabular nums. Non-interactive.
- Comment conflict: CSS comment L3528 says bar carries urgency colour; JS comment L18686-18690 says month bars "lost urgency colour". Code: they DO use deliveryState colour (which includes urgencyRGB). Port the code.

### A.5 Genre lines — `#yearStat` L18554-18560
- `all` = sessions in yearShown with `!notWork` (L18537). `midnight` = today 00:00.
- `shot` = all with date < midnight; `todo` = date ≥ midnight (today counts as ahead).
- Lines: `<div><span.ys-k>Отснято</span>genreLine(shot)</div>` and same with «Предстоит» (`year.shot`/`year.todo`, LJS 645-646). Each omitted if empty.
- `genreLine(list)` (L18756): count by `type`, sort desc by count, each `<b>N</b>` + `LANG.sep("genreN.<type>")` + `LANG.word("genreN.<type>", N)`, joined " · ". E.g. «5 свадеб · 8 портретов». Plural forms `genreN.*` (LJS ~733, e.g. wedding ["свадьба","свадьбы","свадеб"]).
- CSS (L3546-3548): 13px `--ink-6`, line-height 2; `b` `--ink-3` 600 tabular; `.ys-k` `--ink-7` 10px letter-spacing 1.1 uppercase 600 margin-right 8.

### A.6 Profit plate — `renderProfitPlate(all.length>0)` L18622, data L18569-18581
- Records: `all` (year, !notWork). Includes FUTURE booked shoots and undelivered/unpaid ones — no paid/past filter (it is "expected profit of the year", inferred intent).
- `homeAll` = all where sessionCurrency == global `currency`.
- `yearProfitAmt = Σ sessionNet(homeAll)`.
- `yearProfitOther = sumByCurrency(all, sessionNet).filter(code != currency)` (non-zero sums, sorted by sum desc).
- `yearProfitCum[m]` = running Σ sessionNet of homeAll for months 0..m (12 points, cumulative).
- Shown whenever the year has ≥1 work record, even if sum = 0 (shows «0 ₽» in green).
- neg = amt < 0 → number and line use `--terra`, else `--green`.
- Plate HTML: `.year-profit-lbl` (year number) · `.year-profit-num` `money(amt)` · SVG sparkline · optional `.year-profit-other` list of `money(sum, code)` spans (`.neg` if <0).
- Sparkline `sparkPoints(vals, 320, 42, 4)` (L34522): min = min(vals ∪ {0}), max = max(vals ∪ {0}), range = (max−min)||1, n=12; x_i = 4 + 312·i/11; y_i = 4 + 34·(1 − (v−min)/range); toFixed(1). SVG viewBox 0 0 320 42, preserveAspectRatio none; polyline no fill, stroke lineColor, width 2, round caps/joins; end dot circle r 3.2 at last point, fill same colour.
- CSS (L3559-3577): `.year-profit-val` margin-top 12, bg `--sheet-2`, radius 16 squircle, padding 18 18 16. `.year-profit-lbl` 11px `--ink-4` uppercase letter-spacing 1.3 600. `.year-profit-num` 30px weight 300 `--green` letter-spacing −0.5 tabular, margin-top 6; `.neg` `--terra`. `.year-profit-spark` block, margin-top 14, width 100%, height 42. `.year-profit-other` margin-top 10, column gap 3; span 14px `--ink-3` tabular; `.neg` `--terra`.
- Dead CSS: `.year-profit` / `.year-profit:active` (L3549-3553, old "hidden profit button") — no element uses class `year-profit` alone (inferred from grep of the id list; comment L34519 «Скрытая кнопка прибыли» is stale).

### A.7 Overload signal — `renderOverloadSignal()` L18727, called first in renderYear
- Independent of yearShown (facts of "now").
- Constants: `OVERLOAD_OVERDUE_MIN = 3`, `OVERLOAD_UPCOMING_MIN = 3`, `OVERLOAD_WINDOW_DAYS = 30` (comment: uncalibrated placeholders).
- For each session with `!notWork`: overdue++ if `!s.delivered && deadlineDate(s) && deadline < now`; upcoming++ if `s.date > now && s.date <= now + 30·86400000`. (date = midnight → today's shoots are NOT upcoming.)
- Shown iff overdue ≥ 3 AND upcoming ≥ 3.
- Text `year.overload` (LJS 684): «Просрочено сдачей: {overdue}. Впереди ещё {upcoming} за ближайший месяц.» with overdue = `<b>N</b>`, upcoming = `<b>N</b>` + sep + shootWord(N) (`unit.shoot` ["съёмка","съёмки","съёмок"]).
- Where shown: ONLY in stats overlay (grep `yearOverload` → only L9712/18586/18734-18740). Not in month/week views. No dismiss button.
- Visual `.say.bad` (L6321-6387): flex gap 9, align start, margin-top 9, padding 11px 14px, radius 14 squircle, bg `--sheet`, 13.5px line-height 1.45 `--ink-3`. Icon `.s-ic` = `warn` icon (`M12 8v5M12 16.5v.5M3.5 19.5h17L12 4z`), 16×16, stroke `--terra` 1.5, margin-top 1. `b` colour `--ink`, weight 400. Glow: `--glow: 201,102,61`, `--glow-a` 0.32 (light 0.55); box-shadow `0 0 16px 1px rgba(glow, a)`; animation `glow-flow` 14s linear infinite — shadow centre orbits radius 3px (8 keyframes: (3,0),(2.1,2.1)×1.15a,(0,3),(−2.1,2.1)×0.85a,(−3,0),(−2.1,−2.1)×1.15a,(0,−3),(2.1,−2.1)×0.85a), blur 16 spread 1. Off under reduced motion.

### A.8 Delivery-time statistics — `renderDeliveryStats()` L18673
- Scope: ALL sessions, all time (not yearShown). No notWork filter (meetings practically never have deliveredAt — inferred).
- For each s with truthy `deliveredAt` and non-null `deadlineDate(s)`: `lateDays = (Date(deliveredAt) − deadline)/86400000` (fractional, can be negative). Grouped by `s.type` (genre code, not sub).
- Deadline is recomputed with CURRENT settings (mode, genre prefs, record choice) — retroactive, not the deadline in force at delivery time (trap).
- Deadline = 00:00 of deadline day, so delivering during the deadline day counts 0..1 day late; avg threshold 0.5 → a genre consistently delivered in the afternoon of the deadline day reads "late by 1 day" (trap; port literally or flag to Alexey).
- Per genre: skip if samples < `DELV_STAT_MIN = 5`; avg = mean; skip if avg < 0.5; n = round(avg); skip if n < 1. Early / on-time genres are NEVER shown (Alexey: no "shorten deadlines" advice).
- There is NO on-time / late / pending count breakdown anywhere — only this per-genre average lateness list.
- Sort rows by n desc. Hidden (label + list) if no rows.
- Row: `.delv-row` > gauge SVG + `<div>` > `.delv-name` «<genreName>» (in guillemets) + `.delv-sub` `year.lateBy` «в среднем на {days} позже срока» with days = `LANG.count("unit.day", n)` («3 дня»).
- Gauge `halfGaugeSVG(frac, color)` L18705: frac = min(1, n/10); color = rgb(urgencyRGB(frac)). viewBox 0 0 56 32; cx=28, cy=28, r=24; θ = π(1−frac); x = 28+24cosθ, y = 28−24sinθ. Track path `M4 28 A24 24 0 0 1 52 28` stroke `--sheet-3` width 4 round; filled arc `M4 28 A24 24 0 0 1 x y` same width, only if frac > 0.03; marker circle r 3 at (x,y) fill color.
- CSS (L3578-3583): `.year-delv-list` margin-top 12; `.delv-row` flex center gap 14 padding 10px 2px; `+ .delv-row` border-top 1px `--hair`; `.delv-gauge` 52×30; `.delv-name` 14px `--ink` 600; `.delv-sub` 12px `--ink-4` margin-top 2.

### A.9 Header buttons
- Icons: stats = `M6 20V13M12 20V8M18 20V4` (3 vertical bars); search = circle cx11 cy11 r7 + `M16.5 16.5L21 21`. viewBox 24, round caps/joins.
- `.icon-btn` effective (later rule L4351 wins over L3584): no bg, padding 6px, flex centred, colour `--brass`; svg 22×22, stroke currentColor 1.6, no fill. `[hidden]` → display none (L3591). `#planSearch` colour `--ink` (L3593) but `#yearSearchBtn` stays brass (inconsistency). `.plan-acts` gap 8; `.year-head-acts` gap 2.
- aria: `plan.stats` «Статистика», `plan.search` «Поиск».

---------------------------------------------------------------------------------------------------
## B. SEARCH (`#searchOverlay`)

### B.1 Entry / exit
- `#planSearch` (Plan header) and `#yearSearchBtn` (Year header) → `openSearch()` (L34626): clear input, `renderSearch()`, add `.open`, focus input after 350 ms (after the 0.42 s slide-up has mostly run).
- Exit: `#searchBack` («Назад» `nav.back`, chevron-left) removes `.open`; tapping a result closes search then opens the card; tab switch closes it.
- Container `.overlay.pad` (L6754): absolute inset 0, bg `--surface`, z 80, padding 0 24 40, slide up `translateY(101%)` → none, 0.42s cubic-bezier(0.25,1,0.4,1); padding-top 56 (phone ≤500px: safe-area-top + 14). DOM order puts it above the Year overlay.

### B.2 Layout
- `.back`, then `.field` (margin-top 22 class; inline margin-top 14 wins) with `input#searchInput` type text, placeholder `search.ph` «Клиент, тип съёмки или место». Input CSS (L7412): full width, bg `--sheet`, no border, radius 12 squircle, `--ink`, 16px, padding 14px 15px; placeholder `--ink-8`; focus bg `--press`.
- `#searchResults` list, then `#searchJumpWrap.mb-jump-wrap.gap` with `#searchJump`.

### B.3 Matching — `renderSearch()` L34587 (runs on every `input` event, no debounce)
- `qs = input.value.trim().toLowerCase()` (JS default lowercasing; NO ё→е folding, NO diacritic folding, NO locale-aware compare).
- Empty qs → `.plan-empty` (inline padding 8px 0) «Начните вводить имя клиента.» (`search.startTyping`).
- Stem: `searchStem(q)` (L34583): regex `^(.*[^аеёиоуыэюяйьъ])[аеёиоуыэюяйьъ]{1,2}$`; if it matches and group1 length ≥ 5 → use group1, else q. (Strips a 1-2 letter Cyrillic vowel/soft-sign ending if ≥5 letters remain: «свадьба»→«свадьб», «ольга» stays.) Applied to the whole query string (multi-word queries: only the last word's ending is stripped; phrase must be contiguous).
- Haystack per record: `(contact||"") + " " + typeName(s) + " " + (place||"") + " " + (placeTown||"")`, lowercased; hit if `indexOf(stem) > -1`.
  - `typeName(s)` (L25262) = localized sub-genre name if valid `sub`, else `genreName(type)` (localized, e.g. «Свадьбы»; unknown code returned raw).
  - `contact` holds persons' FIRST names joined by `card.and` or org·person·phone (L31706) → surnames typed in persons are not searchable; phone numbers in contact are.
  - Not searched: notes, client tel field, org name beyond contact, dates.
- Filter: `shownRec(s)` (hides ICS events when layer off). Meetings ARE included. Trashed excluded (not in sessions). Past + future all.
- Sort: `date` descending (latest/future first); ties keep array order (stable sort, inferred).
- No hits → «Ничего не найдено.» (`search.nothing`).

### B.4 Result row
`<button class="plan-row" data-i=idx style="border-bottom:1px solid rgba(255,255,255,0.04)">` — hard-coded white hairline (invisible in light theme; trap — use `--hair` in Swift or flag).
- `.pr-time` = `dMonShort(date)` — «21 авг», NO YEAR even though results span years (trap).
- `.pr-who` = `clientName(s)` || (meet ? «Встреча» `day.meet` : event ? «Событие» `day.event` : typeName(s)) + " · " + fmt(min) + "–" + fmt(end), end = `s.end ?? s.min + (s.dur||90)`; `fmt` = HH:MM 24h, wraps mod 1440 (e.g. «Алексей и Елена · 19:10–03:10»).
- CSS: `.plan-row` (L4119) flex center gap 10, full width, padding 9px 0, left aligned, `--ink`; `:active` opacity 0.6. `.pr-time` `--brass` 16px tabular nowrap. `.pr-who` flex 1, 16px, single line ellipsis.
- Tap → close search, `openCard(idx)` (card overlay). Does NOT move the calendar to that day.
- Dead code: `box.querySelectorAll(".dl-ev")` handler (L34613) — search never renders `.dl-ev`.
- Keyboard: no Enter/submit handler; no explicit blur; keyboard stays until card opens (inferred).

### B.5 Jump button — `jumpAttach(searchOverlay, wrap, #searchJump, #searchResults)` L22853/22896
- Shown iff `scrollHeight − clientHeight ≥ 0.6·clientHeight` (`JUMP_MIN`); re-synced on scroll and ResizeObserver of results.
- Direction: if scrollTop < overflow/2 → "to end" (chevron down, aria `mb.jumpEnd` «В конец») else "to top" (chevron up, `mb.jumpTop` «В начало»). Click scrolls smoothly (instant under reduced motion).
- CSS: `.mb-jump-wrap` sticky bottom 10, height 0, z 6, flex justify end, pointer-events none; `.gap` margin-top 48. `.mb-jump` 38×38 circle, `translateY(-100%)`, bg `--bar-2`, `backdrop-filter: blur(12px) saturate(1.6)`, shadow `inset 0 1px 0 --glass-shine, 0 2px 8px --glass-cast`, colour `--ink-3`, active `--brass`. (Measured by the author 14.09.2026: 160 hits ≈ 5.9 screens.)

---------------------------------------------------------------------------------------------------
## C. Settings «Сдача материала» (`#delvSeg`)

### C.1 Location and texts
- Settings → group «Съёмки» overlay `#setOvShoots` (`.overlay.pad.flush`, L8420), after «Календарь». Section label is `card.delivery` «Сдача материала» (not «Срок сдачи»; «Срок сдачи» = `gen.delvDflt`, the per-genre gear row, C.4).
- `.seg#delvSeg` buttons: `data-mode="genre"` «По жанру» (`set.delvGenre`), `single` «Единый» (`set.delvSingle`), `none` «Без срока» (`set.delvNone`).
- `.chips#delvDays` inline padding 12px 24px 0 (+ class margin-top 12) — visible (`display:flex`) only in single mode. Chips for `DELV_DAYS` [3,7,14,30,90]: d<30 → `LANG.count("unit.dayShort", d)` «3 дн.», «7 дн.», «14 дн.»; 30 → «Месяц» (`set.delvMonth`); 90 → «3 месяца» (`set.delv3Months`).
- `#delvNote` `.seg-note`: genre → `set.delvNoteGenre` «Срок зависит от жанра: свадьба 3 месяца, репортаж 3 дня, архитектура 5 дней.»; single → `set.delvNoteSingle` «Один срок для всех съёмок. У каждой можно переопределить.»; none → `set.delvNoteNone` «Сроки сдачи не отслеживаются.» (The genre note is static text; it does not reflect per-genre overrides — trap.)
- CSS: `.seg` (L5211) flex, bg `--sheet`, radius 12 squircle, padding 3, margin 12px 24px 0; button flex 1, radius 10, `--ink-4`, 14px weight 550, padding 11, transition bg/colour 0.3s; `.active` bg `--seg-on` colour `--ink`. `.chip` (L5619) bg `--press`, radius 20, `--ink-3`, 13px, padding 10px 15px; `.active` bg `--press-brass` colour `--brass` 600. `.chips` flex wrap gap 8.

### C.2 Behaviour — `renderDelvSettings()` L35008, handlers L35020/35028
- Seg tap: `delivery.mode = mode; saveAll(); renderDelvSettings(); renderCal(); renderDayPanel()`.
- Chip tap: `delivery.days = d; saveAll(); …same…`. `delivery.days` is kept when switching mode away and back.
- Not re-rendered: Year/stats (recomputed on next entry), open card (inferred).
- Also called on language change (L33382) and at boot (L36820).

### C.3 Storage
- Saved state key `delivery: {mode: "genre"|"single"|"none", days: number}` (L12373); default `{mode:"genre", days:7}` (L14427). Per-genre: `genrePrefs[g].delvDays` (number) and `genrePrefs[g].delv` (form default choice). Per record: `s.deadlineChoice`.

### C.4 Related controls feeding the same resolver (not in this section, but required for parity)
- Genre gear (L10539, `renderGenreDefaults` L30645): row «Срок сдачи» (`gen.delvDflt`), chips = DELV_DAYS ∪ {current genreDeadline(g)} sorted, labels via `delvDaysName` (30→«Месяц», 90→«3 месяца», else «N дн.»). Tap → `genrePrefs[g].delvDays = d`. Hidden for genres with `delivery:false` (landscape, street). Only affects mode "genre".
- Form dial (L20366) `DELV_OPTS`: ["auto" «жанр»], 3 «3 дн», 7 «нед», 14 «2 нед», 30 «мес», 90 «3 мес», [null «∞»] → `s.deadlineChoice`; remembered per genre as `genrePrefs[g].delv`. Hint: «по жанру · сдать до 21 августа» / «сдать до …» / «срок не отслеживается» (`delv.byGenre`, `delv.until`, `delv.untracked`). Label «по жанру» shows even when mode is single (text says genre but uses single days — minor trap).
- Resolution order: see §0 `resolveDeadlineDays`. Consequence: a record with an explicit number keeps its deadline even when global mode = «Без срока».

---------------------------------------------------------------------------------------------------
## D. Traps / dead code checklist (verified by grep unless marked)
1. Month bars count meetings + hidden ICS events; all other year numbers exclude notWork (L18599 vs L18537).
2. Stats `.overlay-right.pad` misses the safe-area rule → fixed 56px top on phone (L6801 vs L6785).
3. Back button says «Год» even when opened from Plan.
4. Stats content built only in `renderYear()`; entry via `#statsBtn` shows last build.
5. Delivery stats use current settings retroactively; deadline at 00:00 → same-day delivery counts ~0.5 day late.
6. No on-time / pending counts exist; only avg lateness per genre with ≥5 samples and avg ≥0.5.
7. Profit includes future and unpaid shoots; other currencies are listed, never converted; zero-sum currencies dropped.
8. Search: no ё/е folding; one contiguous substring; only first names/org via `contact`; date shown without year; hard-coded white row hairline; dead `.dl-ev` handler.
9. `#yearSearchBtn` brass vs `#planSearch` ink colour.
10. `.year-profit` CSS is dead; comment «Скрытая кнопка прибыли» (L34519) is stale.
11. Overload shown only in stats; thresholds 3/3/30 are declared uncalibrated.
12. Conflicting comments about month-bar urgency colour (L3528 vs L18686); code uses deliveryState colour.

# Part 3 — trash, undo, busy-time sheet, long-press fan


Source (frozen): `Light_Plan/beta/index.html` (36902 lines) = `IX:<line>`, `Light_Plan/beta/lang.js` = `LJ:<line>` (ru block, lines < 1900).
All line numbers verified by grep/sed on 2026-09-25. «inferred» = read from code, not run.

---------------------------------------------------------------------------
## 0. Invariant and the one place the web breaks it

- Sessions (shoots, meetings, imported events — all live in `sessions[]`) are never deleted directly:
  every path goes `removeSession(i)` → `trashed[]` (IX:19716). Only «Очистить корзину» erases, and it asks first.
- **BUSY BLOCKS BREAK THE INVARIANT.** `removeBlock(id)` (IX:34980) = `bury(id)` + filter out + save. No trash,
  no undo bar, no confirmation. The only caller is `#blkDel` «Убрать из календаря» (IX:34987). A mis-tap
  loses the block for good. Swift must not copy this silently — see §4.9 (needs Alexey's go, rule 7/26).

---------------------------------------------------------------------------
## A. DELETE → TRASH → RESTORE

### A.1 Data
- `trashed: [{ rec, at, del }]` (IX:13598–13601), newest first (`unshift`).
  - `rec` — the **full session record object**, same object that lived in `sessions` (all fields kept:
    docs, rep, payments, route…). `date` stored as day text, revived via `dayOf` on load.
  - `at` — index it occupied in `sessions[]` at deletion (restore puts it back there, clamped).
  - `del` — `Date.now()` ms at deletion.
- Persistence: part of the single JSON blob in `localStorage["lightplan.beta.v1"]` (main: `"lightplan.v1"`,
  IX:12296), key `trashed` (IX:12393–12396). `SET_SKIP` excludes it from settings-merge (IX:12348).
- `graves: [{ id, del }]` (IX:13617–13625) — tombstones of permanently erased records. `GRAVE_DAYS = 90`:
  graves older than 90 d are dropped **on load** (filter at IX:13618). `bury(id)` replaces any existing grave
  for id with a fresh one. Always written, even empty (IX:12405–12408: empty array ≠ missing key for merge).
- **Retention of trash: none.** No auto-purge of `trashed` anywhere (grep: only `unshift` IX:19722,
  `splice` IX:19731, `= []` IX:30211). Items stay until restored or «Очистить корзину». Only graves expire.
- Merge (multi-device, IX:13163–13216): trash keyed by `rec.id`, latest `del` wins; a record's fate =
  latest of {grave time, trash `del`, live `mt`} (`whereIs`, IX:13196). Ties: grave ≥ others wins; trash needs
  `del > mt`. Out `trashed` sorted by `del` desc. Port this 3-state model as-is.

### A.2 `removeSession(i)` — the single delete primitive (IX:19716–19726)
1. `rec = sessions[i]`; return if missing. `sessions.splice(i,1)`.
2. `trashed.unshift({ rec, at: i, del: Date.now() })`.
3. `saveAll()`; re-render sessions list, calendar, day panel, bin button, moodboard strip.
4. `showUndo(LANG.t("day.inBin",{name: rec.contact || typeName(rec)}), () => restoreTrashed(0), "session")`.
   Text ru: «{name} · в корзине» (LJ:634). Note: uses raw `rec.contact`, not `clientName()`.

### A.3 `restoreTrashed(k)` — shared by undo bar and bin sheet (IX:19728–19745)
1. `t = trashed[k]`; return if missing; `trashed.splice(k,1)`.
2. `sessions.splice(min(t.at, sessions.length), 0, t.rec)`.
3. `t.rec.mt = Date.now()` — mandatory: restore is an event; without it merge would send the record back
   to trash (its `del` would be newer than its `mt`).
4. Remove any grave with that id (could arrive via merge).
5. `saveAll()`; re-render sessions, cal, day panel, bin button, bin sheet, moodboard strip.

### A.4 Every entry point that deletes
| Entry | Where | Path | Motion |
|---|---|---|---|
| Card «Удалить» `#cdDelete` | IX:9138, handler IX:30190 | `deleteToBin(cardIdx)` → `removeSession` | genie (A.6) |
| Form «Удалить» `#fDelete` | IX:9602, handler IX:30578 | `editIdx=null; removeSession(i); closeRows(); close form; closeCard(); go("s-plan")` | none |
| Fan «Удалить» (long-press) | IX:35959 | `closeCard(); removeSession(idx)` | none |
| Block «Убрать из календаря» `#blkDel` | IX:10164, IX:34987 | `removeBlock` — **irreversible** | none |
- `#cdDelete` label: `card.delMeet` for meetings else `card.delShoot` (both «Удалить», LJ:760–761), set by
  `setDeleteLabel` (IX:30144). Hidden in card «order mode» (`setOrderMode(on)`, IX:28114).
- `#fDelete` hidden when creating a new record (`editIdx === null`, IX:30555); label always `card.delShoot`.
- No confirmation on any session delete — by design; reversibility replaces the question (comment IX:35955).

### A.5 Swipe-left on rows — verified: DOES NOT EXIST
- grep `swipe|touchstart|touchmove` over IX: no swipe handler on `.plan-row`, `.dl-ev`, `.wk-card` or
  `#sessionList` rows. `renderSessions` (IX:20078) wires only `click → openCard` (IX:20121).
- Keys `swipe.del`/`swipe.delSub` (LJ:1444–1445) are legacy names reused by the long-press fan.
- Comment IX:35932 («свайп по строке уже занят в списке съёмок») is **stale** — nothing claims that swipe.
- Web decision recorded in that comment: hold, not swipe, because swipe on the day lane fights scrolling.
  Swift: long-press is the parity behaviour; adding `.swipeActions` on list rows is a new product decision.

### A.6 Card genie to bin — `deleteToBin(i)` (IX:30152–30189)
- `prefers-reduced-motion` → `closeCard(); removeSession(i)` instantly.
- Else: `initAudio()`; `#binTarget` unhidden, next frame `.up`.
  t=200 ms: compute bin-target centre in sheet coords → `transform-origin`; `trashSound()` (vibrate 18 ms +
  sample at gain 0.165, only if sound toggle on, IX:32745); sheet gets `.to-bin` + `scale(0.05)`.
  t=630 ms: target `.gulp`; `closeCard()`; reset sheet transform; `removeSession(i)`.
  t=950 ms: target loses `.up .gulp`; t=1290 ms: target hidden.
- CSS `.bin-target` IX:1829–1850: absolute, left 50%, `bottom: calc(var(--tabh,74px) + 26px)`, 56×56 circle,
  `translate(-50%,120px)` → `.up` `translate(-50%,0)`, transition 0.34 s cubic-bezier(0.25,1,0.4,1), z 96,
  glass (`--overlay-3`, blur 18 saturate 1.5, shadow `0 10px 30px --glass-cast`, inset shine+hairline).
  Icon `trash` 24 px stroke `--ink-3` 1.6. `.gulp` = `binGulp` 0.3 s: scale 1 → 1.16 (40%) → 1.
- `.card-sheet.to-bin` IX:1853: transform 0.42 s cubic-bezier(0.55,0,0.85,0.35) + opacity→0 0.42 s ease-in.

### A.7 Undo bar `#undoBar` / `#undoBtn`
- Markup IX:10176: `<div class="undo" id="undoBar"><span id="undoText">Съёмка удалена</span><button id="undoBtn">Вернуть</button>`.
  Direct child of `.device` — floats over any tab (deleting happens from «Сегодня» too).
- CSS `.undo` IX:4192–4213: absolute, left/right 14 px, `bottom: calc(var(--tabh,74px) + 14px)`, z 95; flex
  space-between; padding 12 15; bg `--overlay-3` + blur 24 saturate 1.5; radius 14 squircle; shadow
  `0 10px 30px --glass-cast` + inset 1 px `--hairline`; font 13 `--ink-4`. Hidden state
  `translateY(140%)`, opacity 0, no pointer events; `.show` → translateY(0), opacity 1. Transition 0.32 s
  cubic-bezier(0.25,1,0.4,1) on transform and opacity. Button: 13 px, 600, `--brass`, no bg, padding 2 0.
- Duration: **6000 ms** (`setTimeout(hideUndo, 6000)`, IX:19713). Timer restarts on each `showUndo`.
- Text for session delete: «{name} · в корзине». Static fallback `plan.shootDeleted` «Съёмка удалена» (LJ:696)
  only as initial markup. Button `plan.undo` «Вернуть» (LJ:697).
- Shared owner (IX:19688–19715): one bar for three kinds — `"session"`, route cleared (IX:17259,
  `map.routeCleared`), moodboard merge (`"merge"`, IX:23328). Last caller of `showUndo` owns the click.
  `undoOver(el)` can place the bar over an element (route editor); `showUndo` resets that to default first.
- Click (IX:19746): if owner → `hideUndo()` then `restore()`.
- **Second delete while bar visible** (inferred from code): bar stays shown (no re-animation), text replaced,
  timer restarted at 6 s, owner replaced; undo restores `trashed[0]` = the newest deletion. The first
  deleted item is still in trash, reachable only via the bin sheet.
- **TRAP (real bug, inferred):** undo closure is index-based `restoreTrashed(0)`, not id-based, and the bin
  sheet's restore does not `hideUndo()`. Sequence: delete A → open bin → «Вернуть» A in sheet → tap bar
  «Вернуть» within 6 s → restores the older B. After «Очистить корзину» the bar undo is a silent no-op.
  Swift: capture the record id in the undo action; hide the bar when that id leaves the trash.

### A.8 Bin sheet `#binSheet`
- Markup IX:10186–10194: scrim `#binScrim` + `.sheet#binSheet`: `.grip`, `.sheet-title` `card.bin` «Корзина»
  (LJ:750), `.sheet-sub` `bin.sub` «Удалённые съёмки лежат здесь, пока их не вернут или не сотрут насовсем.
  Клиент возвращается чаще, чем кажется.» (LJ:1446), `#binList`, `button.ghost#binClear` (margin-top 14,
  hidden when empty) `bin.clear` «Очистить корзину» (LJ:1447).
- z: scrim 84, sheet 86 (IX:5450–5451) — above settings overlays (80) and card (78).
- Generic `.sheet` IX:5414: bottom sheet, radius 24 24 0 0 squircle, padding 10 24 34, max-height 86vh,
  scroll, bg `--sheet`, `translateY(101%)` → none, 0.38 s cubic-bezier(0.25,1,0.4,1). `.scrim` rgba(0,0,0,.55),
  0.3 s fade. `.grip` 38×4 r3 `--edge` mb 18; title 19/650/-0.2; sub 13 `--ink-4` mt 5 (IX:5585–5587).
- Close: tap scrim only (`#binScrim` click → `closeBin`, IX:30195). No close button, no swipe-down found.
- `renderBin()` (IX:19770–19791):
  - empty → `<div class="bin-empty">` `bin.empty` «Пока пусто.» (LJ:1403), clear hidden.
  - else one `.bin-row` per `trashed[k]` in array order (newest first):
    icon `typeSvg(rec)` (genre icon) · `t1` = `clientName(rec) || typeName(rec)` · `t2` =
    `dMonShort(date) + " · " + fmt(min) + " – " + fmt(end)`, `end = rec.end ?? rec.min + (rec.dur || 90)` ·
    button `.back` «Вернуть» → `restoreTrashed(k)`. No deletion date shown, no per-row erase.
  - CSS IX:1857–1872: row flex gap 12 padding 12 0, bottom 1 px `--hair-2`; icon 18 px stroke `--brass` 1.5;
    t1 15 px `--ink` ellipsis nowrap; t2 12 px `--ink-5` mt 2; `.back` pill r999 padding 8 14, bg `--press`,
    13 px `--brass-deep`. `.bin-empty` padding 16 0 4, 14 px `--ink-5`.
- Meetings also land here; the list and the wipe question count them as «съёмки» (`unit.shoot`).

### A.9 «Очистить корзину» (IX:30196–30215) — the only irreversible act on records
- If empty → return. `askYes(title="Очистить корзину", sub=bin.wipeAsk {n=LANG.count("unit.shoot",len)},
  ok=ask.wipe)`; ru: «В корзине {n}. Стереть насовсем? Вернуть будет нечем.» (LJ:952), OK «Стереть»
  (LJ:1296), cancel «Отмена» (`ask.cancel`, LJ:1294). `unit.shoot` = съёмка/съёмки/съёмок (LJ:73).
- Yes sheet `#yesSheet` z 99 / scrim 98 (IX:5458): title, sub, `button.danger#yesOk` (terracotta
  `--terra-2`, 15 px, no bg, full width, mt 26, IX:7432), `button.ghost#yesCancel`. Scrim tap = cancel.
- On yes: re-check non-empty (could be emptied by restore meanwhile); for each item `bury(rec.id)` and
  `dropSessionBoard(rec)` (deletes the session's moodboard and orphan shots, IX:26008–26014);
  `trashed = []`; save; re-render bin and bin button. Bin sheet stays open showing «Пока пусто.».
- inferred: cloud documents of erased records are not deleted here (`cloudDelete` only in `docsGone`,
  IX:20997–21007, which counts trashed records as still using their files).

### A.10 Bin entry points (count badges)
- Card `#cdBin` (IX:9123): pill in `.card-acts` row left of «Удалить»; hidden when trash empty; trash icon
  17 px stroke `--ink-4` + count `#cdBinN` tabular. CSS IX:1759: padding 10 14, r999, bg `--press`, 13 px
  `--ink-3`, gap 7. → `openBin`.
- Settings row `#binSetRow` (IX:8581) in overlay «Хранилище» `#setOvStore` (IX:8560): icon `trash`, label
  «Корзина», value `#binSetN` = count, or `bin.emptyShort` «пусто» (LJ:1404), + chevron. Always visible,
  even when empty (deliberate: place must be known in advance). → `openBin` (IX:35297).
- Week view per-day marker `.wk-bin` (IX:18156–18160, CSS IX:5093): if trashed records have that day's
  date → trash icon 14 px + `week.trashN` «удалено: {n}» (LJ:678), 12 px `--ink-6`, in the light row
  `.wk-sun.has-bin`. Tap opens the whole bin (no per-day filter) (IX:18269–18270).
- Tour step `bin` highlights `#binSetRow`, 7400 ms (IX:33672).
- `renderBinBtn()` (IX:19754–19768) updates all counts; called after every trash mutation.

---------------------------------------------------------------------------
## B. «Занять время» — busy block sheet `#blkSheet`

### B.1 Model — `blocks[]` (IX:13980–14013)
`{ id, k, note, from, allDay, days, min, dur, tzFrom, tzTo, mt }`
- `id` = `"b" + Date.now().toString(36) + 3 random base36 chars` (`newBlockId`, IX:14012).
- `k` ∈ `off` (icon home) · `road` (car) · `flight` (plane) · `busy` (clock) (`BLOCK_KINDS`, IX:13982);
  unknown → `busy`. ru: Выходной / Дорога / Перелёт / Занято (LJ:1461–1464).
- `note` trimmed string ('' allowed). Display label = `note || blkKind.<k>` (`blockLabel`, IX:14011).
- `from` = day (midnight Date; saved as day text, IX:12400–12403).
- `allDay` true: `days` ≥ 1 (span stored as day count, not end date); `min/dur/tzFrom/tzTo = null`.
- `allDay` false: `days = 1`; `min` minutes from midnight; `dur` minutes 15…2880 (may cross midnight);
  `tzFrom/tzTo` UTC offset in hours snapshot or null.
- `mt` stamped by `stampList(blocks)` in `saveAll` (IX:12365). Blocks are a MERGE_LIST (IX:13133).
- Separate list on purpose: not in `sessions` (no client/genre/money/delivery; must not hit stats).
- Coverage: `blockCovers(b,d)` — timed = same day as `from`; all-day = `from` 00:00 … `from+days-1` 23:59:59.999.

### B.2 Entry points
| Entry | Call | Prefill |
|---|---|---|
| Plan toolbar «Занять» `#planBlock` (IX:8186, dim, lock icon stroke `--ink-5`, `plan.shortBlock` «Занять» LJ:707) | `openBlockSheet(null)` | all-day, day = `calSel` |
| Day-lane hour menu «занять» (IX:19282–19287) | `openBlockSheet(null, at, d)` | timed, `min = at`, dur 120, kind `off` |
| Form road row (IX:31649–31672) | existing road/flight block within ±3 days → `openBlockSheet(near[0])`; else `pre` | `k` flight/road, note = town, timed, min 540, dur 240 (flight) or travel minutes or 120, tz of home and venue |
| Tap busy row in month/week list `.plan-row.busy[data-b]` or day lane `.dl-ev[data-b]`, year view | `openBlock(id)` → `openBlockSheet(block)` | edit |
- Hour menu (IX:19244–19289): tap `.dl-slot` → `.armed` + `.half-0/.half-30` (tap in lower half = +30 min);
  `.slot-menu` inserted absolutely below the hour (or above if no room): `.sm-at` time + 3 buttons
  camera «съёмка» / guests «встреча» / lock «занять» (`day.actShoot/actMeet/actBusy`, LJ:635–637).
  Second tap on the same hour closes. `at` for hour 24 row → next day (`data-next`). CSS `.slot-menu`
  IX:4602–4622: left 64 right 0, z 4, flex gap 8, padding 4 0 8, bg `--surface`; buttons flex 1, column,
  gap 4, padding 9 4, r12 squircle, bg `--sheet`, 11 px `--ink-3`; icons 19 px stroke `--brass` 1.5;
  `.sm-at` 13 px 650 `--brass` tabular.
- No long-press fan on blocks (IX:19224: `if (b.dataset.b) return`).

### B.3 Sheet layout (IX:10102–10168)
- Scrim `#blkScrim` (z 60 default — only sheet is lifted to 86, IX:5472; inferred trap: when opened over the
  form (z 80) the scrim lies under the form, so tapping the form area does not close the sheet).
- `.grip`; title `#blkTitle` = `blk.title` «Занять время» / edit `blk.titleEdit` «Занятое время» (LJ:1450–51).
- Sub `blk.sub` «День не для съёмки — но день занятый: календарь должен об этом знать» (LJ:1452).
- Kind row `#blkKind` in `.g-chips` (padding 0): 4 `.tool` buttons (icon 22 px + label; 10 px `--ink-5`;
  active: `--brass` on `--press-warm`, r12 squircle, padding 11 2 9; IX:5628–5636), flex-wrap gap 8
  (`.chips` IX:5618). Tap → `blk.k = kind`, re-render.
- `.group` (mt 14) rows:
  1. «Весь день» (`blk.allDay`, LJ:1453) + `.toggle#blkAllDay` (default on for toolbar entry).
  2. «С» (`blk.from`) row: `#blkFromDate` (text `dMonShortYear`), `#blkFromTime` (hidden if all-day), tz tag
     `#blkTzFrom`. Inline pickers: `#blkFromDatePick` (day grid `bwFD`), `#blkFromTimePick` (hour+minute
     wheels `bwFH/bwFM`).
  3. «По» (`blk.to`) / «Прилёт» (`blk.arrive`, when tz shift ≠ 0) row: `#blkToDate` (only all-day),
     `#blkToTime` (only timed), `#blkTzTo`, right sub `#blkSpan`. Pickers `bwTD`, `bwTH/bwTM`.
  4. `input#blkNote` placeholder «Заметка — необязательно» (`blk.notePh`).
- `button.sheet-done#blkDone` «Готово» (`pick.done`); CSS IX:5698: full width, mt 20, padding 16, bg
  `--brass`, r14 squircle, `--on-brass`, 16 px 650.
- `button.data-btn.ghost-btn#blkDel` (mt 8 inline; hidden unless editing): ✕ svg + «Убрать из календаря»
  (`blk.remove`). CSS IX:5250/5258: width calc(100%-48px), margin 10 24 0, padding 13 15, r12, 15 px 600,
  ghost variant bg `--sheet` colour `--ink-3`, icon 18 px.

### B.4 Rendering rules `renderBlk()` (IX:34842–34882)
- `#blkSpan`: all-day → `LANG.count("unit.day", days)` if >1 else «один день» (`blk.oneDay`); timed →
  `durLabel(dur)` + (end past midnight ? « · следующий день» (`blk.nextDay`) : "").
- Displayed arrival time = `fmt(min + dur − shift)`, `shift = round((tzFrom − tzTo)·60)`; tz tags shown only
  when timed and shift ≠ 0 (`tzText`).
- Only one picker open at a time (`blkToggle`, IX:34894); toggling all-day closes pickers.

### B.5 Editing logic
- From date: day grid, unbounded. To date (all-day only): grid limited `from … from+60 d` →
  `days = max(1, dayDiff(d, from)+1)` (max 61).
- From time wheel → `min = hour·60 + minute` (keeps `dur`, so end moves).
- To time wheel → `d = hh·60+mm − min + shift`; `while d < 15: d += 1440` (end ≤ start ⇒ next day);
  `dur = min(d, 2880)`.
- Note: live `input` → `blk.note`.
- **Validation: none on «Готово».** Constraints come only from wheels (dur ≥ 15, ≤ 2880) and date limit.
  No overlap check here (clashes are surfaced elsewhere, inferred).
- Save (IX:34991–35004): build rec (fields per B.1; allDay nulls timed fields); replace by id or push;
  `saveAll`, close, re-render cal + day panel; if the shoot form is open underneath → `renderRoadRow()` +
  `refreshForm()`.
- Close without saving: scrim tap → `closeBlockSheet` (changes discarded; nothing persisted before Done).

### B.6 Traps (verified in code)
- **`openBlockSheet(b)` uses `min: b.min || 600, dur: b.dur || 120`** (IX:34963): a timed block at 00:00
  reopens as 10:00, and re-saving writes 10:00. Swift: use `?? 600`.
- Default new-block `min` 600 / dur 120 also when switching an all-day block to timed.
- Block delete irreversible (§0). `removeBlock` also re-renders only cal/day panel — no undo, no toast.
- `blockLabel` once referenced a nonexistent `n` field (comment IX:14007) — fixed; label key is `blkKind.<k>`.

### 4.9 Proposal for Swift (needs Alexey's go — do not implement silently)
Option 1 (recommended): block delete → same undo bar 6 s («{label} · убрано», restore re-inserts and removes
grave); no trash row. Option 2: blocks join the bin sheet. Option 3: keep web parity (irreversible).

---------------------------------------------------------------------------
## C. Long-press fan on a record (`#evFan`)

### C.1 Where it is wired
- Day panel list rows `.plan-row[data-i]` in **month and week** scope (IX:19212–19228) → `holdForFan`.
- Day lane `.dl-ev[data-i]` in **day** scope → `dlGrip` (hold lifts / shows handles; see C.3). Night-shoot
  continuation (`data-tail`) → `holdForFan`.
- Busy rows (`data-b`) → no fan. Week grid `.wk-card` → tap only, no fan (IX:18272). `#sessionList` rows and
  search results → tap only. Search results wire `.dl-ev` but render `.plan-row` (IX:34604 vs 34612) —
  separate issue, inferred unclickable; not part of this task.

### C.2 `holdForFan(el, idx)` (IX:35979–35996)
- `pointerdown` → start 450 ms timer, remember x/y. `pointermove` > 8 px on either axis → cancel.
  `pointerup/cancel/leave` → cancel. On fire: `fired = true; openEvFan(el, idx)`.
- Capture-phase click after a fire is swallowed (else card opens under the fan).

### C.3 Day lane hold (`dlGrip`, IX:19397; `dlBegin` 19453; `dlArm` 19464; release 19600–19615)
- Non-empty «матрёшка» shoot (`nestSpan`) → mode `pin`: after 450 ms select + handles + `tickClick()` +
  `dlOpenFan` immediately.
- Other events → mode `move`: after 450 ms (immediately if already selected) event lifts (`.lift`), handles
  appear, click tick. Drag → retime (`dlCommit`); release without move → `dlOpenFan`.
- `dlOpenFan` (IX:19620): `openEvFan(el, idx, quiet=true)` (no second tick), hides the scrim (handles stay
  reachable), `dlFanOpen = true`; if fan sits below the event, nudged +14 px down. Closed by any pointerdown
  outside `#evFan` / selection (IX:19660–19669).

### C.4 `openEvFan(anchor, idx, quiet)` (IX:35938–35976)
- Items (button: `.ic` icon + `.tx` with `t1`/`t2`):
  1. icon `note_edit`, t1 `card.fill` «Заполнить» (LJ:749), t2 `clientName(s) || typeName(s)` →
     `openForm(null, null, idx)` (edit form).
  2. class `del`, icon `trash`, t1 `swipe.del` «Удалить», t2 `swipe.delSub` «вернуть можно сразу после»
     (LJ:1444–1445) → `closeCard(); removeSession(idx)`. No confirm.
- Every item click closes the fan first. `#spotScrim` (fixed inset 0, z 96, transparent) shown; tap on it
  closes (IX:35997). `tickClick()` unless `quiet`.
- Geometry (relative to `.device`): `left = clamp(anchor.left, 10, devW − fanW − 10)`;
  `top = anchor.bottom + 6`; if `top + fanH > devH − 10` → `top = max(10, anchor.top − fanH − 6)` (opens up).
- CSS `.spot-fan` (shared with saved-spots fan) IX:1729–1742, 1900–1915: absolute, z 97, min-w 216, max-w
  280, max-h 320 scroll, bg `--sheet`, r16 squircle, padding 6, shadow `0 18px 40px rgba(0,0,0,.55)`,
  `scopeIn` 0.16 s ease-out. Button: flex gap 10, full width, padding 11 12, r11 squircle, text-left
  `--ink`; `:active` bg `--press`. Icon 18 px stroke `--ink-4` 1.6. t1 15 px ellipsis; t2 11 px `--ink-4`,
  hidden when empty. `.del` t1 + icon stroke `--bad-ink` (terracotta, «caution not danger»).
- Haptic: web uses click sound `tickClick` (Taptic unavailable). Swift: `.impact(.light)` at fire (inferred
  equivalent; confirm with the timebar haptics note).

---------------------------------------------------------------------------
## D. Checklist for the Swift port
1. One `trash(record)` primitive; all delete UIs call it; store full record + original index + deletedAt.
2. Undo bar: 6 s, restart on each delete, owner-by-kind, undo bound to **record id** (fix A.7 trap).
3. Restore sets `mt = now`, removes grave. Clear-all asks once, buries ids (90-day graves), drops moodboard.
4. No trash expiry. Settings row always visible («пусто»); card pill hidden when empty; week-day marker.
5. Blocks: port sheet 1:1 incl. tz shift and 15…2880 min clamp; fix `|| 600`; get Alexey's call on §4.9.
6. Fan: 450 ms, 8 px slop, two items, geometry above; day lane: lift/handles first, fan on release.

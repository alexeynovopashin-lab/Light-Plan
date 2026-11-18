# Dawn vs sunset audit — native at 437fd8d0 (2026-11-18)

Why: Alexey 18.11 «приложение не про закаты, оно про свет, закаты и рассветы равнозначны»; after 31.5 he
suspected more places. Read-only audit (subagent, `git show`/`git grep` at `437fd8d0`, branch
`wt/31-5-dawn-equal`). Orchestrator re-read items marked **checked**; the rest is the auditor's word —
verify before changing. Paths are relative to `native/`. Line numbers are at `437fd8d0`.

Already equal after 31.5 (not findings): sunrise score, dawn layers/quality/precip, `SkyEvent`, «Подробно»
both forecasts, palette per event, form wish «Рассвет», card «Ожидался» for early shoots, «Прогноз сменился»
for morning shoots, medium widget via `SkyEvent`, day sign `ofDay`. Decided, not a finding: after sunset the
widget shows tomorrow's dawn (30.10); big/small widgets show both scores without emphasis.

## 1 — wrong word or number for the dawn

1. **checked** `AppModel+CardLight.swift:354` — card «Ожидался …» uses `wish.was.<wish>`; `wish.was.sunrise`
   exists nowhere (catalog has clear/cloudy/fog/moon/rain/stars/sunset) → raw key. **Given to 31.5в.**
2. **checked** `LightScreenModel.swift:168-170` — «Воздух» on «Свет» always samples aerosol at the sunset hour,
   also when the top is the dawn (the dawn score uses the dawn-hour aerosol).
3. **checked** `WeatherDay.swift:400` → `LightTelemetry.swift:272-277` — cloud trend (sparkline + «затягивает /
   проясняется» under the countdown) uses fixed hours 16–21: in the morning it describes the evening.
4. **checked** `AppModel+Form.swift:53-66` (+ `FormScreen.swift:180,480`) — form time hint: evening window by
   default; morning window only when `quality == .fog` (since 31.4 that is sunset fog); `.poor` at sunset →
   «окна нет» even with a clear dawn.
5. `FormRoute.swift:364,405-409` + `AppModel+FormRoute.swift:86` — form wishes «Ясно», «Облачно», «Дождь» (and the
   cloud check under «Луна») judged by the sunset-window sky for morning shoots; the card judges them by the dawn
   sky (`AppModel+CardLight.swift:347-358`) → form and card can disagree.
6. `WidgetLightNow.swift:33` — big widget «Свет сейчас» «Небо закрыто» from `rating.category` (sunset sky) in the morning.
7. `AppModel+CardLight.swift:276` — morning blue hour on card points drawn with the sunset sign.
8. `PlannerMonthView.swift:346-349` — month row golden-hour length is the morning one only when the sunset window is foggy.

## 2 — dawn missing where the sunset has it

9. Card golden-hour line: `LightCase.swift:71,74` handles only the «Закат» wish («в золотом часе / мимо на N /
   ждали заката», `light.waitedSunset`); day-lane golden band follows (`AppModel+CardLight.swift:244`).
10. Widgets / Live Activity golden hour for a shoot only when it wishes sunset, evening only: `WidgetFrame.swift:158`,
    `LockView.swift:38`, `ActivityFrame.swift:199`.
11. «3 days ahead» rows are sunsets only (time + score + cloud of the sunset hour): `WidgetFrame.swift:98,196`,
    `BraunIdle.sunsetRows` (`WidgetBraunIdle.swift:184-191`), big widget CountdownBlock, small widget window
    `WidgetSmallSky.swift:117`.
12. Widgets show only the evening golden hour (`DayLight.golden = goldenB`, `WidgetFeed.swift:355`): medium drum and
    left column (`WidgetBraunIdle.swift:100`, `BraunIdleWidget.swift:342,396`), big middle column (`LargeView.swift:150`),
    round lock widget counts only to the evening golden hour (`LockView.swift:57`).
13. Planner: month row sunset time coloured by sunset score, sunrise always ink (`PlannerMonthView.swift:350-351`,
    `PlannerLightLine.swift:92-93`); free day evening span only (`PlannerMonthView.swift:594-597`); week busy day
    sunset + golden only, expanded day evening golden only (`PlannerWeekView.swift:112-133,205`).
14. Map summary «Золотой час», «Синий час» — evening windows only (`MapSummary.swift:92-93`).
15. «Без блоков» view of «Свет»: sunset at the arc base is a button, sunrise is not (`LightScreenView.swift:586` vs `:589`).
16. Two shoots clash only for «both want sunset» (`Overlaps.swift:244`); two dawn shoots get no warning.
17. AR line under the time: «после заката N» exists, no «после рассвета» (`SunTrack.swift:70-72`).
18. «что дальше» on «Свет» and big widget (`SolarDay+Light.swift:61-65`, web logic): morning blue hour reads «До
    рассвета», no «Синий час, ещё»; evening golden hour reads «До заката», not «Золотой час, ещё».
19. Route step hints: lovestory suggests «Закат», architecture «eveningLight» whatever the time (`FormRoute.swift:42,49`). Low.

## 3 — internal only

`Wish.light = [.sunset, .stars, .moon]` / `asksLight` without sunrise (`Kinds.swift:58,61`, no users); stale comment
`DomeSky.swift:30-32`; names `SkySnap.sunset`, `EveningLight`.

## Not determined

`Lexicon.find` fallback table (only `t()` read); contents of `set.notifyEve` / `set.notifyMorn` reminders;
`MapInstrument`, `DomeDrag`, AR label layout only grepped.

## Split (orchestrator's proposal, Alexey 18.11 «Да, 31.6»)

- **31.6** «Рассвет — остальные места»: section 1 items 2–8 + section 2 items that do not change a screen's
  construction: 9, 14, 15, 16, 17, 18 (19 if cheap). After 31.5 is merged.
- **31.7** widgets and planner rows (10–13): they change what the screens look like → «было → станет» sketch first,
  Alexey decides.

# Prompt: native iteration 7 — Solar Engine

Written 2026-09-21 for one Claude Code session, **Sonnet** (plan § 8,
«Итоговая таблица»). Paste everything below the line.

---

Reply to Alexey in Russian. Run native iteration 7 of the Light Plan
migration: **Solar Engine**. Do only this iteration.

## Read first (headings first, then the matched lines)

1. `git -C <native> log --oneline -10` and the same for the web repo. Memory
   and docs lag the code.
2. `light_plan:native/CLAUDE.md`: layout, layers, commands, parity bench.
3. `light_plan:Light_Plan/SWIFT_MIGRATION_PLAN.md`: § 5.1 (API shape),
   § 5.2 (bench, tolerances, the 6.05 threshold), § 8 «Итерация 7». The plan's
   `tz: Int` is **superseded**, see item 4.
4. `light_plan:Light_Plan/docs/17_NATIVE_ARCHITECTURE.md` § 1 (last
   paragraph: `Place` carries `ZoneID`; `SolarDay(date:place:)` takes the
   offset for its own date) and § 5 (time).
5. `light_plan:native/Tools/parity/README.md`: the three measurements,
   especially the unmeasured V8-vs-Darwin `sin` risk.
6. The reference: `light_plan:Light_Plan/beta/index.html`, block from
   `var decl = 0, solarNoon = 720` to `var dirOf = function (az)`, plus
   `rad`/`deg`/`clamp` near `var rad = function (d)`. About 60 lines:
   `computeSun`, `elevAt`, `azAt`, `tAtElev`, `shadowAt`. Resolve paths with
   `~/Documents/workspace/40_instructions/where.sh <tag>:<path>`.

## Scope

**Do:** `LightPlanCore/Solar/*`. Port declination, equation of time, solar
noon, `MINT`/`MAXT`, all twelve event times (−0.833, 6, −4, −6, −12, −18,
each rising and setting), `maxElev`, `polar` (1 / 0 / −1), dome arc
`arcA`/`arcB`, and `elevation(at:)`, `azimuth(at:)`, `shadowRatio(at:)`. Use
a value type with no globals. The next day is just a second instance, and
the web's save/compute/restore trick disappears.

**Two entry points:**
- A parity core that takes latitude, longitude and an explicit
  `utcOffsetHours: Double`. Fixtures use fractional offsets (5.75, 12.75), so
  `Int` is wrong. This is what the bench checks.
- A thin `SolarDay(date:place:)` that gets the offset for that date from the
  place's `ZoneID` (`TimeZone(identifier:)?.secondsFromGMT(for:)`). Take the
  instant to sample from how the web's `offsetAt(zone, date)` callers pass
  the date. Read the code, don't guess. Record the choice in DECISIONS as
  «решение исполнителя, из кода». Create only the minimal `ZoneID` and
  `Place` this needs, with a comment that iteration 11 extends them.

**The date is a civil date (year, month, day), never a `Date` read through
the system calendar.** The web computes day-of-year via local
`new Date(y, 0, 0)`, which is why the bench runs under `TZ=UTC`. In UTC it is
the plain ordinal day (Jan 1 → 1). The Swift result must not depend on the
machine's zone.

**Don't:** moon, weather, UI, light states (`state(at:)` is iteration 8, so
leave it out of the type for now), `WallTime`/`Moment`/matryoshka rules
(iteration 11), any edit to `beta/`, any hand edit of `Fixtures/`, any
`project.pbxproj` change.

## Porting rules (each one has broken a port like this before)

- Port expression by expression **in the same operation order**. Don't
  simplify the algebra: floating point is not associative, and near
  `c = ±1` in `tAtElev` the null/non-null result hangs on the last bit.
- `Double` everywhere. `decl` is in radians, not degrees.
- JS `%` on doubles is `truncatingRemainder(dividingBy:)`, **not**
  `remainder` (which rounds to nearest and flips sign).
- `Math.floor` → `.rounded(.down)`; `Math.asin(clamp(s, -1, 1))` keeps its
  clamp.
- Only `import Foundation` in Core. It already provides `sin`/`cos`.
  `import Darwin` fails `Tools/check_boundaries.sh`.

## Tests: done when all of these pass

Add `SolarParityTests` next to `ParityFixturesTests` and reuse the loader
in `ParityFixtures.swift`.
1. `solar_day.json`, all 4 316 days: `decl`, `solarNoon`, `mint`, `maxt`,
   `maxElev`, `arcA`, `arcB` and the twelve event times. Times within `1e-6`
   minutes, degrees within `1e-9`, `polar` and null-is-null strict.
2. `solar_sample.json`, all 104 series: `elev`, `az`, `shadow` within
   `1e-9`, null strict.
3. Edges named in the plan: 66.6° is in the grid, and so are 29 February and
   the DST-change dates (at a constant offset). **90° is not in the grid**:
   add ±90 to `LATS` in `Tools/parity/generate.js`, run `make parity` (it
   must say «побайтово то же» on the repeat), and commit the regenerated
   fixtures with the code. One more test: on a DST-change day for
   `Europe/Berlin`, `SolarDay(date:place:)` equals the core with the offset
   the web would use.
4. Performance: build 10 000 `SolarDay` in a **release** build and report the
   milliseconds. The target is under one frame: 8.3 ms, because Alexey's
   iPhone 15 Pro and 15 Pro Max run at 120 Hz. If it's slower, report the
   number; don't optimize blind.
5. `swift test` in `Packages/LightPlanCore` and `xcodebuild … test` through
   the `LightPlan-iOS` scheme both pass. The app build also runs the
   boundary check.

**If a comparison fails:** it's a porting bug until measured otherwise. If
you can't explain it in one pass, stop and report numbers (which field,
which place and date, JS vs Swift, the difference). Don't loosen a
tolerance, and don't touch the thresholds. A last-bit `sin` difference
shows only at boundaries. The plan's cure for it is a tolerance on
elevation, and that call is Alexey's, after he sees the numbers. If the
web's formula itself looks inaccurate, parity beats correctness: add it to
«Potential Native Improvements» and don't fix it.

## Git and records

- Before starting, run `git worktree list` in `native/` and read the tail of
  `light_plan:Light_Plan/SESSIONS_CHAT.md`. If another native session is
  active, work in your own worktree and set
  `LIGHT_PLAN_WEB=<abs path of Light_Plan>` for `make parity`, because
  `extract.js` resolves the web as `../Light_Plan` from the repo root.
  Announce yourself in `SESSIONS_CHAT.md` (append only).
- Checkpoint commit in `native/`: `migration: солнечный движок`. Stage files
  by name, then push `origin main`. Commit title is for a person; the body
  says why and what it cost.
- In the web repo (docs only, main folder is fine, stage by name,
  `git pull --ff-only` first):
  - `SWIFT_MIGRATION_PLAN.md`: add «✔ закрыта» to the iteration 7 heading
    and a «**Итог <date>.**» paragraph with the measured numbers;
  - `ROADMAP.md`: one paragraph after «Итерация 6 закрыта…» in the state
    block of «План закрытия хвостов»;
  - `DECISIONS.md`, append only: the offset-sampling choice, plus anything a
    measurement overturned. If a measurement contradicts something already
    written, rewrite that record instead of adding a caveat.
- Report to Alexey in Russian, in product terms: what now works, the
  numbers, what's open. One question at most, with 2–3 concrete options and
  your pick.

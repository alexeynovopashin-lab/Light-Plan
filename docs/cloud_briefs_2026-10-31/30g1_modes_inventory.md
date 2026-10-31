Step 30г.1 — inventory for the three modes. Read-only on code; the only output is one document on its own branch.

## Context

Light Plan is an iPhone planner for photographers (light, sun, weather, shoots, clients) built by Alexey, a photographer. This repo (`alexeynovopashin-lab/LightPlan`) is the native SwiftUI port of an earlier web PWA (packages LightPlanCore, LightPlanDomain, LightPlanUI; app in App-iOS; widget in LightPlanWidget). This cloud environment cannot build iOS or run a simulator — reading code is the whole job.

Alexey's decision of 31.10.2026, verbatim: «с сегодняшнего дня мы больше не добавляем новые функции… К релизу мы должны сделать упрощенную версию приложения. Простая версия должна быть максимально минималистичной. У нас уже сейчас есть две версии, просто и астро. Должно быть три версии просто, про и астро. Просто - практически без настроек, минимум подменю. Про - максимум функций. Астро - вкл и выкл луна/звезды/азимуты/термины/млечный путь (астро работает только в про режиме).»
He then chose the look: three equal options in one choice, Просто · Про · Астро; Астро includes everything from Про, and the five sky switches are visible only in Астро. This step only describes; Alexey marks the table, the build is a later step.

## Task

Build `docs/30g1_modes_inventory.md`: a table of every user-facing setting, submenu, sheet, menu and in-screen switch of the app, so Alexey can mark what stays in each mode.

1. Find them all: the Settings screen and every sub-screen (`Packages/LightPlanUI/Sources/LightPlanUI/Screens/Settings/*`), plus switches, menus and sheets inside the other screens (Light, Planner/«Съёмки», card, form, map, moodboard, documents, AR/sky layers, clients, widget configuration). Use `git grep` for `Toggle(`, `Picker(`, `Menu {`, `.sheet(`, `.confirmationDialog(`, `NavigationLink`, `@AppStorage`, settings model properties.
2. For each row: **where** (screen → submenu, in product words, Russian), **what it does for the user** (one plain Russian phrase), **file:line**, **current default**, and three columns **Просто / Про / Астро** with your PROPOSAL: «есть» / «нет, фиксировано: <value>» / «только Астро». Rule of thumb from Alexey: Просто — practically no settings, minimum submenus; Про — everything; Астро — Про plus on/off for луна / звёзды / азимуты / термины / Млечный Путь. When hidden in Просто, say which value is fixed.
3. Section «Астро-элементы»: every place on every screen where the moon, stars, azimuths, astronomy terms (астрономические сумерки etc.) and the Milky Way appear — so each of the 5 Astro switches knows what it hides. file:line for each.
4. Section «Что уже есть»: how the current «Просто/Астро» switch works (iteration 19а, `LightScreenModel`, `LightScreenView`): what exactly it changes today, from code.
5. Section «Вопросы Алексею»: only real forks, each with 2–3 concrete options, a pro and a con, and your pick. Product words, no code terms.
6. Counts at the top: total rows; how many you propose for Просто / Про / Астро.

## Rules

- Russian for the document text (Alexey reads it; he is a photographer, not a programmer).
- Every claim comes from code — no guessing; where unsure, write «из кода не ясно».
- Do not change any Swift, plist or project file. No secrets (the repo is public).

## Git

- Branch `wt/30g-1-modes-inventory` from `main`. Commit only the document.
- Commit title in Russian, what changed for a person; body says why; end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push once at the end (a second push cancels the GPT review CI runs on `wt/*`). No PR, no merge into `main`.

**Done when:** the document is on `origin/wt/30g-1-modes-inventory`; your final message gives the commit sha, the counts and the questions to Alexey.

Step 34.0 — release papers for TestFlight. Read-only on code; the only output is one document on its own branch.

## Context

Light Plan is an iPhone planner for photographers (light, sun, weather, shoots, clients) built by Alexey, a photographer. This repo (`alexeynovopashin-lab/LightPlan`) is the native SwiftUI port of an earlier web PWA (packages LightPlanCore, LightPlanDomain, LightPlanUI; app in App-iOS; widget in LightPlanWidget). This cloud environment cannot build iOS or run a simulator — reading code is the whole job.

Release plan (iteration 34): signing, App Store Connect, TestFlight, privacy page («данные не покидают устройство» — this has to be said truthfully), description, screenshots; every permission gets an explanation line in `Info.plist`; legal info (OpenStreetMap, CARTO, MapLibre, Open-Meteo, light-pollution atlas) and a Telegram link in «О приложении». The app is free for at least the first year: no in-app purchases; no direct donation link in TestFlight/App Store builds. From 31.10.2026 no new features are added; before release the app gets three modes Просто · Про · Астро. TestFlight target ≈ end of December 2026 (estimate).

## Task

Write `docs/34_release_papers.md` with these sections:

1. **Разрешения.** Every permission the app uses or may trigger: find `NS*UsageDescription` keys and `INFOPLIST_KEY_*` build settings (`Config/`, `App-iOS/`, `LightPlan.xcodeproj` — grep only, never read `project.pbxproj` whole), and every API that needs one (CoreLocation, camera/AVCaptureDevice, Contacts, EventKit, Photos, UserNotifications, CoreMotion, microphone, local network, etc.). For each: key, where in the app it is asked (product words), whether a string exists now, and a proposed explanation line in 5 languages: ru, en, es, ja, zh. Flag missing keys (a missing key crashes the app or fails App Review).
2. **Сеть и данные.** Every external host the code contacts (grep URLs, `URLSession`, `URLComponents`, proxy/worker names; `docs/network_reference.md` if present): what the request carries (coordinates? dates? phone numbers? photos?), whether it goes through the Yandex Cloud proxy. Then the honest answers for App Store Connect «App Privacy» (data types collected, linked to user, tracking) — measured from code, each with file:line.
3. **Страница конфиденциальности.** Draft text, ru and en, short and plain, matching section 2 exactly.
4. **Правовая информация.** Every third-party data/library/asset that needs attribution or has a licence: maps, tiles, fonts, routing, weather, light-pollution atlas, star catalogues, Milky Way panorama (check `MilkyWayData/README.md` and other READMEs/licences in the repo), Swift packages. For each: what we use, licence, required attribution text, whether it is shown in the app today (file:line).
5. **Описание для App Store.** Draft, ru and en: name, subtitle (≤30 chars), promo text (≤170), description (short), keywords (≤100 chars). Product words a photographer understands. Do not promise features that are not in `main`.
6. **Что сделать Алексею руками.** A checklist of what only he can do (Apple Developer Program, App Store Connect records, privacy URL hosting, screenshots on the phone), in plain words.
7. Open questions: each with 2–3 concrete options, a pro and a con, and your pick.

## Rules

- Russian for explanations (Alexey reads it; he is a photographer, not a programmer); the per-language strings in their languages.
- Every claim comes from code — no guessing; where unsure, write «из кода не ясно».
- Do not change any Swift, plist, xcstrings or project file — propose only. No secrets (the repo is public).

## Git

- Branch `wt/34-0-release-papers` from `main`. Commit only the document.
- Commit title in Russian, what changed for a person; body says why; end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push once at the end (a second push cancels the GPT review CI runs on `wt/*`). No PR, no merge into `main`.

**Done when:** the document is on `origin/wt/34-0-release-papers`; your final message gives the commit sha, the number of permissions and hosts found, missing keys, and the questions to Alexey.

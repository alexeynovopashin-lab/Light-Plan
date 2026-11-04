# Header title: month name only, whole, 22 pt — day, week, month (30.10.2026)

Alexey 30.10: «не надо писать сверху 29 октября, только Октябрь» → «Октябрь целиком» → «я бы ещё увеличил шрифт» → «все три вида».
Branch `wt/day-title-month` (light_plan:native).

- Day title = month name only (nominative of the app language, `DateText.monthTitle`); week and month titles were already month-only.
- Font 18 → 22 pt in all three views (`PlanTitleLayout.titleFont`).
- Whole word first (`PlanTitleLayout.choose(wholeFirst: true)`, default): fits on the axis → on the axis; else fits in the free place
  between the buttons → whole there (shifted left of the axis); else the old ladder (short month, squeeze).

Pictures (simulator iPhone 17 Pro, 393 pt, ru, dark, 29 Oct):
- `before_phone_393_alexey.webp` — Alexey's phone before: «‹ 29 октября».
- `after3_day_ru_dark_393_size22.png` — «Октябрь» 87.5 × 26.5 pt, x 122, chevron x 105.
- `after3_week_ru_dark_393_size22.png` — «Окт – Ноя» (week 26 Oct – 1 Nov) 100.5 × 26.5 pt, x 115.5, chevron x 98.5.
- `after3_month_ru_dark_393_size22.png` — «Октябрь» 87.5 × 26.5 pt.

Without the whole-first step at 393 pt (room on the axis 69 pt, 18 pt font) the ru months Февраль, Сентябрь, Октябрь, Декабрь were shortened
(«Окт.»); at 375 pt also Январь, Апрель, Август, Ноябрь; at 320 pt the word left the axis. Now every ru / en-US month and the two-month week
titles are whole at 440, 430, 393, 375 pt (test `headerTitleKeepsTheWholeWordAtSize22`); at 320 pt the whole word does not fit anywhere → old ladder.
Cost: at 393 pt and 375 pt the title of a long month is not on the screen axis (centred between the buttons instead).
Not run: web/native shot pairs (`make shots`) — the title frame `plan.title` is now 22 pt, the web beta has 18 pt.

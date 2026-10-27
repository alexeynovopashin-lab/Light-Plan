# Medium and small widget — Claude Design demo (2026-10-26)

Source of Alexey's design (his decisions; Claude Design only drew it), canvas «Виджет Light Plan»:
https://claude.ai/artifact/Me6areEztgbrsWYDMnm9Xh (version 1793012741-a435).
Copied here because artifacts live in one account (workspace rule 24).

- `Spec.dc.html` — all numbers (pt), colours, rules. Start here.
- `Widget.dc.html` — the component; layout formulas are in its `renderVals()` JS.
- `Main` / `Light` — medium, dark and light (Braun white), 13:48 lunch.
- `Sizes` — 364×170 (Pro Max) and 338×158.
- `Edges` — long names, long point name, 2 h 30 min point (A = last hour, B = whole point),
  first / last point, studio 13:54 and 13:57.
- `SmallSet` — small 170×170 / 158×158.
- `Header` — wedding-countdown variants; **6 «окошко Braun» is marked chosen**.
- `Braun` — colours sampled from real Braun watches: `light` = Braun white, `braunDark` = Braun black.
  Alexey 2026-10-26: the widget palette is the Braun one (dark theme = `braunDark`, not the warm `dark`).

`.dc.html` files need the Design type's `support.js`, which is not copied: read them as source.

## «Семья виджетов» (2026-10-27)

All forms × all states, two themes. Boards `Family` (Braun black), `FamilyLight` (Braun white), `FamilySizes` (numbers of the new forms).
The three files are GENERATED: `node _gen/family.js <outDir>` (reads icons from `Light_Plan/tools/icons.html`); edit the generator, not the output.
Rows А/В small and medium are the existing `Widget` component (dc-import); everything else is drawn by the generator.
Assumptions are listed at the end of `FamilySizes`. Lock-screen sizes come from Apple's table, not measured on the phone.

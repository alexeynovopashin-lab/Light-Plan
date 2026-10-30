# Weather tiles: frosted-glass guide (v2)

Brief for Claude Design and for a developer. Goal: the 8 "Погода" tiles
(`docs/claude_design_briefs/light_tiles_canvas/renders/Glass_Weather.png`, built by
`build/gen_glass.py`) look like an Apple Liquid Glass app: **a matte glass card with
the weather behind it**, not weather illustrations.

Working reference: `weather_demo.html` here (one self-contained file, Canvas 2D, no
WebGL, no external files). Published copy: https://claude.ai/artifact/7SsKp118DF2Wuj3jCisSba
(private until shared). Screenshots: `shots/`.

## Contents

1. Direction and what was rejected
2. Rules for all tiles
3. The glass (shared by every tile)
4. Behind the glass: sky, sun, moon, clouds, rain, snow, lightning
5. On the glass: water drops, frost, snow
6. Per-state recipes
7. How the demo is built
8. References
9. Measurements

---

## 1. Direction and what was rejected

Alexey's feedback on v1 (2026-10-30): clouds looked like crumpled sheets, frost looked
like twigs; "we are not doing Web 2.0, we are doing Apple Liquid Glass app design;
concentrate on matte glass, show the weather as gradients behind the blur". He sent photo
references of rain drops on glass, cumulus clouds, frost ferns and feathers, and a
frosted-glass weather UI.

| v1 (rejected) | Why it failed | v2 |
|---|---|---|
| Clouds from warped fbm noise with lighting | wrinkled texture, "crumpled sheets" | cumulus built from puffs of 3 sizes, lit as one body, then **blurred by the glass** |
| Frost as thin branching lines | read as twigs | dense fern fronds and curved feathers with barbs, granular rime between them |
| Sharp sun with rays and lens ghosts | illustration, not material | a soft light behind matte glass + a rim highlight on the glass edge facing it |
| Lightning as a drawn bolt | cartoon | a blurred flash behind wet glass |
| Every effect sharp | busy, no hierarchy | **two planes**: everything behind the glass is blurred; only things on the glass are sharp |

## 2. Rules for all tiles

- **Two planes.** Behind the glass (sky, sun, moon, clouds, rain, snow, lightning) is always
  blurred. On the glass (drops, rivulets, frost, stuck snow, the rim highlight) is sharp.
  That contrast is what makes it read as glass.
- **One light direction per tile.** The rim highlight sits on the side of the card facing
  the sun or moon. Cloud tops are lit from the same side, and frost sparks appear near
  the sun. With no visible light source, the light comes from above.
- **Calm motion.** Clouds drift at 1–5 px/s. Drops hold for 0.5–5 s, then slide at 20–70 px/s.
  Frost grows once, in ~3–4 s, then stays still.
- **Text stays readable.** White text with `0 1px 3px rgba(0,0,0,.3), 0 0 14px rgba(0,0,0,.14)`.
  Frost and drops are thinner in the text area (left 60 % of the card, below the header).
- **Budget** (8 tiles on an iPhone PWA): Canvas 2D baseline, no WebGL required; pause
  tiles outside the viewport (`IntersectionObserver`) and in hidden pages; 30 fps cap for
  the glass, 15 fps for the blurred scene (30 when rain streaks or a flash need it); canvas
  DPR capped at 2; no `ctx.filter`, `shadowBlur` or CSS `filter` per frame; frame-time
  governor (if mean frame > 24 ms, all tiles halve then third their rate).
- **`prefers-reduced-motion`**: one still frame per tile, no flashes, frost shown fully grown.
- **Lightning**: at most 2 bright pulses per strike, at least 6 s between strikes.

## 3. The glass (shared by every tile)

Pipeline per tile, back to front:

1. **Scene** at CSS resolution (1×): everything behind the glass.
2. **Glass blur**: halve the scene repeatedly (½, ¼ …) down to `1/blur` of its size, then
   scale up in two steps. `blur` is in CSS px: 3.5 (night) to 6 (overcast, storm). Cheap
   blur without filters; the radius stays the same on any tile size.
3. **Edge lens** (the Liquid Glass hallmark): draw the blurred scene again scaled ×1.07 from
   the centre, masked by a soft ring 14 px wide inside the rounded edge. Content near the
   rim looks bent outward.
4. **Glass overlay** (built once per tile): uniform white veil (alpha 0.035–0.07), thicker
   frosting toward the rim (+0.10–0.20 within 13 px), grain (±5 % alpha per pixel), a dark
   lip at the bottom edge (0 → 0.12 over 16 px), a rim highlight stroke (1.3 px, radial
   gradient from the light position: 0.95 → 0.42 → 0.10 alpha), a fainter inner rim
   (inset 2.2 px), and a weaker counter-highlight in the opposite corner (0.5 → 0).
5. **On-glass layers**: frost, snow ledge, water.
6. **Text** (DOM, above the canvas).

## 4. Behind the glass

All of this is drawn sharp into the scene and softened by step 2.

**Sky.** Vertical gradient per state (table in §6) plus 1–2 very wide radial washes
(far corner deeper, horizon warmer at night).

**Sun.** Three additive radial gradients: wide halo (1.5 H, alpha 0.32), glow (0.55 H, 0.55),
core (0.12 H, 1.0). Warm for day, white-blue for cold. After the blur it is a soft light,
which is what a sun looks like through frosted glass.

**Moon.** Per-pixel sphere with a real phase (`lit = smoothstep(−0.05, 0.12, n·L)`,
`L = (sin α, 0, cos α)`, `α = acos(2k − 1)`), soft maria from noise, dark side at 50 %
alpha. Radius 0.1 H. A cold radial wash (0.9 H) around it.

**Cumulus.** One sprite per cloud, built once:
- 4–6 large puffs along a base line (radius 0.19–0.27 h, taller in the middle), 3× as many
  medium puffs (0.42–0.66 of a parent) on the upper half of the large ones, 7× small puffs
  (0.3–0.55) on the medium ones: cauliflower tops.
- Each puff: radial gradient with its centre shifted toward the light by 0.45 r; lit colour
  → mid colour, alpha fading at the edge. **No dark ring on a puff**, which made v2's first
  attempt look like soap bubbles.
- Whole-cloud shading after the puffs: flat base (alpha cut over the bottom 12 %), a
  vertical gradient from clear at the top to shade/base colour at the bottom, and a light
  wash on the side facing the light.
- Colour sets: fair-weather `lit 255/255/255, shade 176/192/214, base 118/136/166`; overcast
  `216/221/228 · 150/158/170 · 102/110/124`; rain `150/162/178 · 92/104/120 · 56/64/78`;
  storm `118/112/140 · 62/58/82 · 28/26/38`; snow `228/233/240 · 170/180/194 · 130/142/158`.
  For sunset, set `base` to a warm gold (e.g. 255/170/90) and the light low on one side
  (see the cloud references).
- Two depths: far clouds smaller and paler, 2 px/s; near clouds larger, 4.5 px/s.
- Sun dimming: approximate each cloud by an ellipse; sun intensity × (1 − 0.85 · overlap).

**Rain streaks.** 44 (rain) / 80 (storm) lines, 1.3 px, length 12–26 px, 500–1080 px/s,
slant 0.12 / 0.25, alpha 0.22–0.38. After the blur they read as rain beyond wet glass.

**Snow.** 60 small (0.8–1.6 px, 10–20 px/s), 24 medium (1.8–3 px), 4 large (5–8 px); sway
3–18 px at 0.2–0.5 Hz; soft disc sprite.

**Lightning.** A midpoint-displaced bolt line and a radial flash (0.7 W, alpha 0.7 · e) drawn
additively into the scene; the glass blurs both into a diffuse flash. Envelope: pulses at
0 ms (1.0, τ 35 ms), 150 ms (0.8), afterglow at 220 ms (0.4, τ 180 ms).

## 5. On the glass

**Water drops** (rain, storm; references: drops on light and dark glass):
- Sizes: 70 % tiny beads (0.4–1.1 px), 24 % medium (1.2–2.4 px), 6 % large (2.6–4 px);
  slightly elliptical and tilted (±12 %, ±0.4 rad). Count 200 (rain) / 270 (storm), new
  beads appear at 5 / 9 per second, the oldest disappear.
- Beads under 1.2 px: a sprite with a dark rim thicker at the bottom (gradient centre
  shifted up), a bright caustic low inside, a small specular top-left.
- Larger drops are **lenses**: clip to the ellipse, draw the *sharp* scene from a region
  12 r wide around the drop, flipped both ways, then the rim sprite. Sharp, inverted sky
  inside a drop against the blurred sky outside is what the photos show.
- The bead layer is drawn into its own canvas and fully rebuilt every 2 s (tiles staggered),
  new beads are added in between, so the per-frame cost is one `drawImage`.
- 2–3 sliding drops (2.8–5 px): hold 0.5–5 s, then accelerate to 22–70 px/s with a slight
  wobble, pause at random (0.25 /s), absorb beads they touch (r = ∛(r³ + ½ r_bead³)), erase
  beads from the layer along the path, and leave a rivulet: a dark line 0.75 r wide with
  a light core 0.25 r, fading over 6 s.

**Frost** (references: fern frost, feather frost, warm low sun behind):
- 42 starts: 22 along the bottom, 12 on the sides, 8 from the top right; shuffled.
- Two growth forms: **fern** (2 of 3): stem, barbs every step on both sides, sub-barbs every
  2nd step; **feather** (1 of 3): stem with long dense curved barbs. Barbs leave at 0.5–0.8 rad,
  length follows `sin(π·u)^0.7 · (1 − 0.45u)` along the stem, one side may be shorter
  (asymmetry 0.55–1). Stem curvature ±0.02 rad/px.
- Lengths 0.3–0.62 H; ×0.4 in the text area. Budget ~60 000 short strokes per tile, shared
  equally between fronds.
- Strokes 0.8 / 0.5 / 0.36 px, alpha 0.7 / 0.45 / 0.32 by depth; colour 234/243/255, warm
  255/232/212 within 0.3 W of the sun.
- Granular rime between fronds at half resolution: coverage grows toward the edges and the
  bottom, ×0.3 in the text area, modulated by low-frequency noise and per-pixel grain.
- Growth: strokes sorted by distance from their root, revealed at 30 px/s into an
  offscreen canvas (one `Path2D` per depth and colour per frame), then static.
- 10 warm sparks on stems near the sun, each lit for 12 % of a 3–7 s period.
- Sky behind frost must be **darker than the frost** (`#2a5f9e → #4f80bb`), otherwise
  white frost disappears (first attempt).

**Stuck snow**: a ledge on the bottom edge (noise profile 3–13 px, white with a blue shadow
above) and 9 tiny six-armed crystals.

## 6. Per-state recipes

| State | Sky top → bottom | Behind glass | Blur px | Veil / edge | Light for rim | On glass |
|---|---|---|---|---|---|---|
| Clear day | `#1f68c8 → #8cc4f0` | sun at (0.8 W, 0.2 H) | 5 | .05 / .14 | sun | — |
| Clear night | `#040918 → #22355f` | moon (phase 0.72), 31 stars, cold wash | 3.5 | .035 / .10 | moon | — |
| Partly cloudy | `#2a6cbb → #94bfe2` | sun + 2 far + 2 near cumulus | 4 | .05 / .14 | sun | — |
| Overcast | `#6a7682 → #97a2ad` | 6 grey cumulus in 2 depths | 6 | .07 / .16 | top | — |
| Rain | `#2d3949 → #64758b` | 5 dark clouds + streaks | 5 | .06 / .16 | top-left | beads, lenses, rivulets |
| Thunderstorm | `#15141e → #403a54` | 5 storm clouds + heavy streaks + flash | 6 | .06 / .16 | top-left | more beads |
| Snow | `#4d5e73 → #93a3b4` | 2 light clouds + flakes | 4 | .07 / .20 | top | ledge, crystals |
| Frost | `#2a5f9e → #4f80bb` | low sun at (0.8 W, 0.68 H) | 5 | .07 / .20 | sun | ferns, feathers, rime, sparks |

## 7. How the demo is built

- `SCENES[kind]` → `glassTile(W, H, dpr, rng, seed, cfg)`; `cfg.paint` draws the scene,
  `cfg.blur`, `cfg.glass`, `cfg.water`, `cfg.frost`, `cfg.ledge` switch layers on. Each
  layer can be turned off independently.
- One `requestAnimationFrame` loop; per-tile clock; 30 fps cap; the blurred scene and edge
  lens refresh at 15 fps (30 for rain/storm or during a flash); governor; visibility pause;
  `ResizeObserver` rebuild; seeded random per tile.
- «Замерить 5 с» button and `window.wxLab.measure(ms, only)` for device measurements;
  `wxLab.strike(hold)` forces lightning for screenshots.
- The file follows the claude.ai artifact skeleton (no `<html>/<head>/<body>`).

Porting to SwiftUI later: the scene blur maps to `.blur(radius:)` on a background layer
or a `Material`; the rim highlight to a stroked `RoundedRectangle` with a gradient; drops
and frost to `Canvas` drawings baked into images. WidgetKit can only take still frames.

## 8. References

Statuses as checked on 2026-10-29 unless stated.

| Reference | Status | Use it for |
|---|---|---|
| Alexey's photo references (2026-10-30, in the chat, not in the repo) | — | drops on glass, cumulus, fern and feather frost, glass weather UI |
| https://github.com/dpawlikowski/liquid-glass | MIT; 4 stars | frosted surface via `backdrop-filter`, fake refraction on a duplicated layer; Safari artifacts above displacement scale 18 (its README) |
| https://github.com/takustaqu/atmosphere | MIT; 6 stars, pushed 2026-10-24 | sky colour by sun elevation, layered clouds (reference) |
| https://github.com/nimeshm05/sunset-shader | MIT; 0 stars | scattering sky + sun glint shader (reference, too heavy for tiles) |
| https://css-tricks.com/drawing-realistic-clouds-with-svg-and-css/ | HTTP 200 on 2026-10-29 | SVG `feTurbulence` clouds (v1 base, not used in v2) |
| https://github.com/greywen/web-weather | 50 stars | Canvas 2D weather effects structure |
| https://github.com/codrops/RainEffect | 1785 stars, **no licence** | idea only: refraction through drops; do not copy code |
| https://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/ | HTTP 403 to curl | article for RainEffect |
| https://dev.to/_carson_ye_/atmos-fx-040-an-evolution-in-visual-quality-47hj | HTTP 200 | CPU drops + Canvas map + WebGL normals |
| https://threejs.org/examples/webgl_shaders_sky.html | HTTP 200 | physical sky reference |
| Shadertoy "Heartfelt" (BigWings, id `ltffzl` unverified) | site licence default likely CC BY-NC-SA (unverified) | idea only |

Not cited on purpose: `sfplabs/circadian` (404), `@hallencj/weather-maker` (unverified),
Nom-nom-hub/World-CSS, Realistic-Water-Effect, CLIMATIC_APP.

## 9. Measurements (v2, 2026-10-30)

**Environment.** Headless Chromium 153 (Playwright), Linux cloud container, **no GPU**;
phone emulation 393 × 852 pt, DPR 2, tile 168 × 120 pt. **Not an iPhone, not Safari.**
"JS ms" = time to issue canvas commands for one tile frame; rasterisation is not included
and shows only in the frame interval.

### 9.1 All 8 tiles forced to animate, 5 s, CPU not throttled

| Tile | Draws/s | JS ms mean | p95 | max | Setup ms | Animated elements |
|---|---|---|---|---|---|---|
| clear-day | 29.6 | 0.51 | 1.5 | 1.7 | 26.7 | 1 (sun) |
| clear-night | 29.6 | 0.37 | 1.1 | 1.4 | 21.4 | 32 (31 stars, moon) |
| partly | 29.6 | 0.56 | 1.7 | 2.4 | 12.7 | 5 (4 clouds, sun) |
| overcast | 29.6 | 0.44 | 1.3 | 1.9 | 11.0 | 6 (clouds) |
| rain | 29.6 | 3.33 | 4.9 | 7.9 | 12.1 | 255 (44 streaks, 5 clouds, 206 drops) |
| storm | 29.6 | 4.43 | 6.4 | 8.3 | 13.3 | 361 (80 streaks, 5 clouds, 275 drops, flash) |
| snow | 29.6 | 0.57 | 1.7 | 2.4 | 10.4 | 90 (88 flakes, 2 clouds) |
| frost | 29.6 | 0.65 | 1.7 | 4.7 | 30.4 | 11 (sun, 10 sparks; frost strokes drawn once during growth) |

Frame interval: mean 16.9 ms, p95 16.8 ms, max 99.9 ms (one hitch); 1 frame over 20 ms.
JS for all 8 together: **321 ms per second**. v1 was 71 ms/s: the glass costs about 4.5×
more, mostly the blur chain and the drop lenses. Before the 15 fps scene refresh it was
506 ms/s.

### 9.2 Realistic case and slow-CPU proxy

| Scenario | Frames / 5 s | Interval mean | p95 | max | Governor | JS ms/s |
|---|---|---|---|---|---|---|
| Visible tiles only (4 at load), CPU 1× | 300 | 16.7 | 16.7 | 16.8 | 1 | 61 |
| All 8 forced, CPU 4× | 49 | 106.2 | 133.4 | 133.4 | 3 | 781 |
| Visible only, CPU 4× | 279 | 17.9 | 33.3 | 33.4 | 1 | 256 |

**Reading.** With the tiles actually on screen the page holds 60 Hz even at 4× CPU
slowdown (3 frames over 33 ms in 5 s). Eight tiles animating at once on a slow CPU do not
fit: ~9 fps. Rain and storm are the expensive tiles (3–4 ms each per frame at 1×). Next
optimisations, if the iPhone run shows a problem: draw the sliding-drop lenses at 15 fps,
render rain streaks at half resolution, or share one canvas for all tiles.

### 9.3 Behaviour checks

- Hidden tiles: 0 draws while off-screen.
- `prefers-reduced-motion: reduce`: clocks stay at 0, `measure()` refuses, still frames
  drawn (`shots/board_phone_reduced_motion.png`).
- Page and console errors in all runs: 0.

### 9.4 Not measured

iPhone frame time, Safari/WebKit rendering (`Path2D`, `ellipse`, `globalCompositeOperation
'copy'` and `'lighter'` are used and are standard, but untested on WebKit here), GPU raster
time, memory (estimate: ~4 canvases of 336 × 240 px per tile ≈ 1.3 MB), battery and heat.

## Screenshots (`shots/`)

`board_desktop_dark/light.png` (1440 px, DPR 1), `board_phone_dark/light.png` (393 pt,
DPR 2), `board_phone_reduced_motion.png`, `tile_<kind>.png` (each tile, DPR 2;
`tile_storm.png` with a flash held; `tile_frost.png` after 4.5 s of growth). In the board
shots, tiles below the first screen were paused until scrolled to, so their frost or
drops may be in an early state.

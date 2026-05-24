# 2026-05-24 — Light-mode hue pass (gold + status hues + sector compass)

**Branch.** `feat/atlas-permaculture`. Fetched before push; local 1 ahead / 0 behind (clean fast-forward, no external rebase to reconcile).

## Why

Part 2 of the light-mode repair (`~/.claude/plans/light-mode-of-the-splendid-crayon.md`). Parts A–E shipped the chrome/neutral/overlay tokenisation and deliberately deferred **hues** ("neutrals now, hues later"). Three hue families still rendered wrong in light mode:

1. **Estate gold washed out.** `--color-gold-brand` (`#d4af5f`) had no dark override, so it was the same bright gold in both modes; used as text / thin strokes / faint borders in 100+ places it was illegible on the now-white surfaces.
2. **Status-hue pills/labels were light-on-light.** ~9 files hardcoded pastel text (`rgba(220,140,140,.95)` etc.) on a translucent hue fill; the pastel text vanished on white while the translucent backgrounds read fine on both.
3. **Compass data-viz was dark-tuned.** `SectorCompassDiagram.tsx` hardcoded ~6 structural SVG colours inline (dark disc/grid/centre/labels) with no own background, so they read muddy/invisible on white glass.

**Top constraint (unchanged):** dark mode must not regress — every new/changed token's **dark value equals the exact pre-existing literal**. Identity colours (zone/structure/path, compass `MANUAL_COLORS` + wind/solar wedge fills) stay theme-agnostic, untouched.

## What shipped (3 explicit-path slices)

**Slice 1 — token layer (`081ef6d3`).** `apps/web/src/styles/tokens.css` + `apps/web/src/styles/dark-mode.css`:
- **Gold:** `--color-gold-brand` light `#d4af5f → #b08a3a`; `--color-gold-active` light `→ #9a771f`; `--color-gold-rgb` light `→ 176,138,58`. Dark overrides added to **both** dark blocks (`:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`) so dark stays exact (`#d4af5f` / `#e0b56d` / `212,175,95`).
- **Status-text (RGB form, per-site alpha preserved):** `--color-pos-text-rgb` light `46,125,79` / dark `140,220,170`; `--color-neg-text-rgb` light `184,58,42` / dark `220,140,140`; `--color-info-text-rgb` light `58,86,176` / dark `170,190,240`.
- **Compass (5+1):** disc light `#cdd8c4` / dark `#1a2a1a`; grid `#7d9275` / `#4a6a4a`; centre `#4a7c3f` / `#7aaa7a`; label `#4a6b4a` / `#8aaa8a`; empty `#7d7864` / `#5a7a5a`; **`--color-compass-north`** light `#9a771f` / dark `#c4a265` (see north-regression note).

**Slice 2 — consumer CSS, contrast failures only (`a0ef956c`).** Seven modules routed broken pastel text to the status-text tokens (`rgba(var(--color-*-text-rgb), α)`), leaving their translucent backgrounds/borders intact: `v3/_shared/stageCard/stageCard.module.css` (pillMet/Success→pos, pillUnmet/Fail→neg, pillPlanned→info), `features/dashboard/pages/AffinityTelemetryDashboard.module.css` (.errorBox→neg), `features/act/WeatherForecastCard.module.css` (→pos), `features/soil-samples/SoilSamples.module.css` (→neg), `features/plan/WasteVectorDashboardView.module.css` (kpiDeltaUp/toneMet→pos, Down/Unmet→neg), `v3/plan/draw/InlineFeaturePopover.module.css` (.dangerBtn→neg), `features/livestock/RotationScheduleCard.module.css` (→pos). Scientific gauges (climate/slope/aspect/elevation) and opaque-fill cells left for a later pass.

**Slice 3 — compass data-viz (`a23fbb66`).** New `apps/web/src/v3/observe/modules/sectors-zones/SectorCompassDiagram.module.css` (SVG presentation attributes don't resolve `var()`, so structural colours come through CSS-module classes `.disc/.grid/.centre/.label/.empty/.north/.northLabel`); `SectorCompassDiagram.tsx` switched those structural elements from hardcoded hex to `className`. `MANUAL_COLORS` + wind/solar wedge fills stay inline (data identity).

## North-arrow regression — caught & fixed

First cut routed the compass north triangle/`N` through `--color-gold-brand`, which after Slice 1 resolves dark to `#d4af5f` — but the **original** inline literal was `#c4a265`. That would have shifted dark mode. Fixed by giving north its **own** token `--color-compass-north` (light `#9a771f`, dark `#c4a265`) in all three locations, keeping dark byte-exact. The north stroke `#2a2218` (dark outline) stays inline — works on gold in both modes.

## Verification

Per project rules, `preview_screenshot` times out in this env (known WebGL issue) — stated, and fell back to **computed-style probes**: set `data-theme`, `getComputedStyle` to read resolved token values. Confirmed in **both** modes that every one of the 11 light-mode tokens resolves **byte-identical to the pre-change literal in dark** (e.g. `--color-compass-north` dark = `rgb(196,162,101)` = `#c4a265`) and to the darkened variants in light. Typecheck (`tsc --noEmit`, 8 GB heap) clean for all touched files — the only 3 errors in the tree are pre-existing in untouched files (`StepBoundary.tsx`, two `HostUnion*` tests).

## Discipline notes

Pure presentation — no schema/store/model/migration; covenant clean. Three slices staged by **explicit path** per [[feedback-commit-immediately-on-rebased-branches]]; large foreign WIP in the tree (`EconomicsPanel*`, `CapitalPartnerSummary*`, `capitalPartner*`, `MapCanvas`, `*Map.tsx` trio, `ZoneSomSidebar*`, `MapCoordinateReadout*`, `launch.json`, observe draw/layers/tools WIP) left untouched per [[feedback-no-deletion]]. Plan: `~/.claude/plans/light-mode-of-the-splendid-crayon.md` (Part 2).

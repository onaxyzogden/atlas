# 2026-05-24 — Global wheel fill-to-fit standard + proportional center overlays

**Branch.** `feat/atlas-permaculture`. In sync with upstream (0 behind / 0 ahead) before push.

## Why

Follow-on to the same-day Observe-compass wheel fit ([[2026-05-24-compass-wheel-fit-and-true-north-banner]], commit `73d2678e`). Three steward asks:

1. The Observe compass **center overlay** (the hub hotspot ring + hint pill) was fixed-px (130px hotspot, `top: calc(50% + 70px)` hint) sized for the old 440px wheel, so on the now-944px wheel it no longer sat on the hub.
2. Apply the same fill-to-fit to the **True North** wheel (still capped at 440px).
3. Make it the **global standard** for every wheel, via a **shared CSS module (DRY)** (steward-chosen scope + mechanism).

## Key finding — two layout contexts

The four wheels split into two families, which forced a split standard rather than one literal rule:

- **Dedicated full-bleed surfaces** — Observe / Plan / Act stage compasses (all three share `ObserveCompassWheel`) + **True North**. The wheel is the sole focal element in a `flex:1` cell with a **definite height** (`.center` flex column → page-level `.wheelHost{flex:1; min-height:0}`). True height-driven fill-to-fit works.
- **Content-flow surfaces** — **Cycle page** (`CyclePage`: title/subtitle/wheel/hint stacked in a scrolling `max-width:720px` column) + **Workflow/OPA dashboard** (`WorkflowWheelDashboard`: OPA wheel card sits **above** a `StageNavigator` in a scrolling column). No definite-height ancestor — literal `height:100%` collapses, and forcing it would shove sibling content off-layout.

Steward decision: **"Relaxed cap"** — dedicated surfaces get true fill-to-fit; content-flow surfaces instead get their fixed px cap **removed** so they grow to the column width (honors "don't limit max size") while staying width-driven so the stacked layouts stay intact.

## What shipped

**New `apps/web/src/components/wheel-shared/wheelFit.module.css`** — the shared standard, consumed via CSS-Modules `composes` (transparent to TSX — local class names preserved, zero component changes). Classes:
- `.fillHost` — `height:100%; aspect-ratio:1; max-width:100%` + `:global(.mcw-svg){max-width:100%}` (lifts the shared wheel's built-in 540px self-cap). Height-driven so it sizes to `min(width,height)` and never overflows tall cells (the canonical fit pattern from the prior session).
- `.relaxedHost` — `width:100%` + the same `mcw-svg` cap lift; width-driven, no fixed cap.
- `.quiet` — `:global(.mcw-band){fill-opacity:.22}` + `:global(.mcw-seg-current){fill-opacity:.5}` (biophilic register; composed by the stage compasses only — the OPA dashboard wheel keeps its saturated fills).
- `.hotspot` (+`[data-ready]`/hover) and `.hint` (+`[data-ready]`/hover) — proportional center overlay.

**Consumers** (all CSS-only, no TSX):
- `apps/web/src/v3/compass/ObserveCompassWheel.module.css` — `.wheelHost{composes: fillHost quiet}`, `.centerHotspot{composes: hotspot}`, `.centerHint{composes: hint}`. (Replaces the local fill/quiet/overlay rules shipped in `73d2678e` with the shared source.)
- `apps/web/src/v3/true-north/TrueNorthCompassWheel.module.css` — same (drops the old `width:100%; max-width:440px`).
- `apps/web/src/components/opa-wheel/OPAComparisonWheel.module.css` — `.wheelWrapper{composes: relaxedHost}` (drops `max-width:400px`; redundant mobile max-width override removed).
- `apps/web/src/pages/CyclePage.module.css` — `.wheel` `min(360px,70vw,60vh)` → `width:100%`.
- `apps/web/src/components/CycleWheel/CycleWheel.css` — `.cw-svg max-width:540px` → `100%`. (Plain CSS with its own `.cw-*` impl — can't `composes`; pattern applied in-place, the one documented DRY exception.)

### Proportional overlay math (the subtle bit)
The hotspot's containing block is the **host** (`.wheelHost`, `position:relative`), so `width:29.5%` (was 130/440) scales with the wheel and stays centered on the hub (~28% disc). The **hint**, however, is a **child of the hotspot button** — its `top` resolves against the *button* box, not the host. Original `calc(50% + 70px)` on the 130px button = `50% + 70/130 = 103.8%`. First attempt used `65.9%` (mistakenly dividing the 70px offset by the 440px wheel instead of the 130px button) which put the pill *on* the hub; corrected to `top: 103.8%`. Because the button itself is 29.5% of the wheel, a button-relative % scales the offset with the wheel automatically.

## Verification

Live preview (`web` dev server, port 5200), `getBoundingClientRect` probes + screenshots. (Note: the dev server caches compiled CSS-module `composes` output across HMR — a server restart was needed to pick up the shared-module edit; worth remembering.)

- **Observe compass** `/v3/project/mtc/compass`:
  - **1920×1080**: wheel **944×944** (fills, exceeds the old 540 cap → proves cap lifted), hotspot **29.5%** of wheel and exactly centered on the hub, hint pill **18px below** the hub bottom (no overlap). Setup state (`data-ready` absent → "Locked" pill).
  - **375 mobile**: wheel **300×300** square, fits viewport, hotspot 29.5%, hint gap 6px (scales proportionally).
- **True North** `/v3/project/mtc/true-north`: wheel **777×777** (was 440), hotspot 29.5% centered, hint 15px below hub, `data-ready=""` → the unlocked accent ring + "Open Fit Gate" hint render via the composed `.hotspot[data-ready]` (confirms composed attribute/descendant selectors fire — composed class list `_centerHotspot_… _hotspot_…`).
- **OPA dashboard** + **Cycle page**: legacy/parked surfaces — `/project/mtc` redirects into the v3 lifecycle (lands on true-north), and `CyclePage` is `void`-parked in `routes/index.tsx`. Not reachable in current routing to live-verify; their changes are safe-by-construction (width-driven relaxed cap can't collapse) and the shared module compiles cleanly (proven by the two dedicated surfaces composing from it).
- Build: `tsc --noEmit` clean (exit 0); production `vite build` to confirm `composes` extraction.

## Discipline notes

Pure presentation — no schema/store/model/migration; covenant clean; 3-item Observe/Plan/Act IA unchanged. Six files staged by explicit path per [[feedback-commit-immediately-on-rebased-branches]]; large foreign WIP in the tree left untouched per [[feedback-no-deletion]]. Fetched + confirmed 0/0 divergence before push. Plan: `~/.claude/plans/there-s-a-floating-message-sprightly-sparkle.md`.

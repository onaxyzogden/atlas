# Atlas Plan Module 5 (Soil Fertility & Closed-Loop) — BUILD_FRESH per Scholar verdict

**Date:** 2026-05-07
**Stage:** Atlas / Plan / Module 5 — Soil Fertility & Closed-Loop
**Verdict:** BUILD_FRESH (additive — Atlas cards preserved)
**Adjudicator:** NotebookLM Permaculture Scholar (`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`), 2026-05-07

## Options compared

- **A · Atlas current** — `SoilFertilityDesignerCard` (4-node taxonomy: composter / hugelkultur / biochar / worm bin) + `WasteVectorTool` (directed-edge editor between any two features). Both store-wired but neither offers diagnosis or graph visualisation.
- **B · OGDEN prototype** — none. OGDEN ships no soil-fertility page.

## Scholar verdict

1. **Four-node taxonomy is too narrow.** Orthodox permaculture frames soil fertility as the "digestive system" of the design and includes (a) composting + structural (compost / vermicompost / biochar / hugelkultur / sheet mulch); (b) vegetative/biological (cover-cropping, chop-and-drop, dynamic accumulators like comfrey & persimmon); (c) animal integration (rotational grazing, manures); (d) mechanical/earthworks (Keyline plowing, swale-fed moisture).
2. **Both vector model and baseline diagnosis are required, in sequence.** First: jar test (sand/silt/clay %), percolation (in/hr), pH → identify limiting factors → set time-bound *Soil Building Goals & Plan* (OSU PDC). Then: closed-loop vectors (Holmgren P6 *Produce no waste*) — every output a sink, every sink an input.
3. **Bare-minimum visualisations:** soil-management spatial subdivisions, USDA texture-triangle classifier, browns/greens (C/N) inventory, vector graph with orphan detection.
4. **Verdict: BUILD_FRESH.** Sketched as 3-tab workflow: Baseline → Resource inventory & management areas → Closed-loop graph + plan.

## Implementation

Additive build (legacy retained per `feedback_no_deletion.md`):

- **`SoilBaselineCard`** (`apps/web/src/v3/plan/cards/soil-fertility/SoilBaselineCard.tsx`):
  - Form: sand/silt/clay %, percolation in/hr, pH.
  - **USDA 12-class texture-triangle classifier** (Sand · Loamy sand · Sandy loam · Loam · Silt loam · Silt · Sandy clay loam · Clay loam · Silty clay loam · Sandy clay · Silty clay · Clay) rendered as an equilateral SVG with the steward's sample plotted barycentrically (sand bottom-left, silt bottom-right, clay top).
  - **Auto-derived limiting factors** with permaculture-grounded remedies: sand-dominant ⇒ sheet-mulch + biochar + N-fixing cover; clay-dominant ⇒ daikon/Keyline subsoiling; silt-dominant ⇒ permanent groundcover; perc < 0.25 in/hr ⇒ hugelkultur lift; perc > 4 ⇒ compost+biochar; pH < 5.5 ⇒ wood-ash/lime; pH > 7.8 ⇒ sulphur+pine-needle mulch.
  - v1: ephemeral form state. Persistence (a `soilTestStore`) is a follow-up.
- **`ClosedLoopGraphCard`** (`apps/web/src/v3/plan/cards/soil-fertility/ClosedLoopGraphCard.tsx`):
  - Pulls all features (zones, structures, crops, fertility units) into a ring-layout SVG, draws all `wasteVectors` as arrowed edges.
  - **Three validations**:
    - Orphan fertility (in == 0 && out == 0) — outlined in warning colour.
    - Fertility producing without feedstock (out > 0 && in == 0) — also flagged.
    - Isolated zones / structures / crops (no flows) — counted but not flagged (they may be passive features).
  - Lists each fertility unit needing wiring with a one-line remedy.
- **Wire-up:** `types.ts` adds `'plan-closed-loop-graph'` and `'plan-soil-baseline'` as 3rd & 4th tabs under `'soil-fertility'`. `PlanModuleSlideUp.tsx` adds lazy imports + switch cases. `PlanChecklistAside.tsx` rewrites WHY/HOW with diagnose-then-amend workflow grounded in OSU PDC + Holmgren P6.

## Why additive

Scholar said the existing 4-node fertility designer and the directed-edge waste vectors are "conceptually sound but useless without [a] graphical validation of the nutrient cycle" and a baseline. Keeping them as the data-entry layer and adding the visualisation/validation cards on top satisfies the Scholar without disturbing existing wired data.

## Follow-ups (not in this commit)

- ✅ **Persist soil baseline** — landed 2026-05-07 as `apps/web/src/store/soilTestStore.ts` (Zustand+persist, byProject, optional zoneId per reading). `SoilBaselineCard` now lists saved readings (with auto-load of the most recent on project switch), a label + zone dropdown, save/load/remove buttons, ghost-dots for prior readings on the texture triangle, and a notes field. Multiple readings per project per the Scholar's "soil management areas" guidance.
- **Resource inventory tab** (Scholar's tab 2): split-panel polygon-draw for soil-management areas + a Greens/Browns inventory checklist. Not built v1.
- **Soil-building plan** (Scholar's tab 3 "chronological plan"): time-keyed Gantt of vector executions + amendment applications. Defer until phasing module is rebuilt.
- **Expand fertility taxonomy** to include cover-cropping, chop-and-drop, dynamic accumulators, rotational grazing as first-class node kinds (currently only the 4 structural types).
- ✅ **Spatial graph layout** — landed 2026-05-07. `ClosedLoopGraphCard` now exposes a Ring / Spatial layout toggle. Spatial mode derives a `[lng, lat]` centroid for each node (zone/crop/structure-without-center → average of polygon vertices; structure → `center` field; fertility → `center` field), normalises the cloud into the SVG viewport with N up, and lays nodes that have no centroid on a small inner ring so they don't pile up at the origin. The Spatial button auto-disables when no node has a centroid. Vector length now reflects real haul distance, surfacing Holmgren P3 *Obtain a yield* (short haul = positive yield; long haul = energy debt).

## Verification

- `npx tsc --noEmit` (NODE_OPTIONS=--max-old-space-size=8192) — exit 0 for the new code; pre-existing `elementCatalog.ts` error from user's WIP Vision-Layout work is unrelated.

## Sources cited by Scholar

OSU Permaculture Design Course "Soil Building Goals & Plan"; Mollison B. *Permaculture Designer's Manual* ch.8 (soils); Holmgren D. *Permaculture: Principles & Pathways* P6 *Produce No Waste*; USDA NRCS *Soil Texture Triangle*.

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
- ✅ **Resource inventory tab — Greens/Browns leg landed 2026-05-07.**
  New 5th tab `plan-soil-resources` under Soil — `SoilResourcesCard.tsx` —
  inventories common high-N (greens) and high-C (browns) feedstocks with
  Cornell/USDA reference C:N ratios. Volume input (m³) per checked
  feedstock drives a mass-weighted aggregate C:N (constant 200 kg/m³
  density v1, so density cancels and ratio depends only on volumes ×
  per-feedstock C-fraction). Verdict bands keyed to Cornell hot-composting
  guidance: < 20:1 too-green (ammonia/anaerobic), 25–35:1 ideal,
  > 50:1 too-brown (won't heat), all-green / all-brown each get their
  own remedy. Per-feedstock notes carry field-realistic warnings
  ("strip tape and glossy print", "rinse seaweed to drop salt", "compost
  fresh manure ≥ 90 days before food-crop contact"). ✅ Persistence
  landed 2026-05-07 via `apps/web/src/store/compostInventoryStore.ts`
  (Zustand + persist, key `ogden-compost-inventory` v1) — flat
  `byProject: { [projectId]: { [feedstockId]: m³ } }` shape; `setVolume`
  drops keys at ≤ 0; the card owns the static GREENS/BROWNS catalog so
  catalog evolution doesn't invalidate persisted volumes (unknown ids
  are quietly ignored at read time). The split-panel polygon-draw for
  soil-management areas remains deferred (needs map-draw integration).
- **Soil-building plan** (Scholar's tab 3 "chronological plan"): time-keyed Gantt of vector executions + amendment applications. Defer until phasing module is rebuilt.
- ✅ **Expand fertility taxonomy** — landed 2026-05-07. `FertilityInfraType` in `closedLoopStore.ts` now includes `cover_crop`, `chop_and_drop`, `dynamic_accumulator`, `rotational_grazing` alongside the original four structural types. The Scholar's three-pillar framing (structural · vegetative/biological · animal-integration) is now representable in the closed-loop graph. Picker in `SoilFertilityDesignerCard` extended to all eight options with permaculture-grounded taglines. Defaults in `TransectVerticalEditorCard.FERTILITY_DEFAULT_HEIGHT_M` extended so the cross-section view doesn't render phantom stacks for the new vegetative kinds (cover-crop 0.3 m, chop-and-drop 0.1 m, dynamic accumulator 1.0 m, rotational grazing 0.1 m). `ClosedLoopGraphCard` label generation collapses underscores to spaces. No persist-version bump — additive union members; legacy entries persist unchanged.
- ✅ **Type-aware orphan remedies in `ClosedLoopGraphCard`** — landed
  2026-05-07. The "Fertility units to wire up" list previously read a
  single generic line per orphan ("No vectors — declare both a
  feedstock source and a destination"). Replaced with a per-type
  `FERTILITY_REMEDY` lookup keyed on `FertilityInfraType` (composter /
  hugelkultur / biochar / worm_bin / cover_crop / chop_and_drop /
  dynamic_accumulator / rotational_grazing), each with an `orphan`
  message (no flows declared) and a `noFeedstock` message (outgoing
  but no incoming). Sourced from Mollison ch.8 and Cornell composting
  guidance — composters want greens + browns, hugel beds want logs +
  brash, biochar wants prunings, worm bins want fine kitchen scraps,
  chop-and-drop wants the planting it's cut from. Fallback to the
  generic line when type lookup fails. Closes the gap noted in the
  Scholar's "every fertility unit needs a wired-in flow" remedy
  guidance — stewards now see *which* flow each type expects, not
  just that one is missing.
- ✅ **Spatial graph layout** — landed 2026-05-07. `ClosedLoopGraphCard` now exposes a Ring / Spatial layout toggle. Spatial mode derives a `[lng, lat]` centroid for each node (zone/crop/structure-without-center → average of polygon vertices; structure → `center` field; fertility → `center` field), normalises the cloud into the SVG viewport with N up, and lays nodes that have no centroid on a small inner ring so they don't pile up at the origin. The Spatial button auto-disables when no node has a centroid. Vector length now reflects real haul distance, surfacing Holmgren P3 *Obtain a yield* (short haul = positive yield; long haul = energy debt).

## Verification

- `npx tsc --noEmit` (NODE_OPTIONS=--max-old-space-size=8192) — exit 0 for the new code; pre-existing `elementCatalog.ts` error from user's WIP Vision-Layout work is unrelated.

## Sources cited by Scholar

OSU Permaculture Design Course "Soil Building Goals & Plan"; Mollison B. *Permaculture Designer's Manual* ch.8 (soils); Holmgren D. *Permaculture: Principles & Pathways* P6 *Produce No Waste*; USDA NRCS *Soil Texture Triangle*.

# Atlas Plan Module 1 (Dynamic Layering & Permanence) — BUILD_FRESH per Scholar verdict

**Date:** 2026-05-07
**Stage:** Atlas / Plan / Module 1 — Dynamic Layering & Permanence
**Verdict:** BUILD_FRESH (additive — Atlas card preserved)
**Adjudicator:** NotebookLM Permaculture Scholar (`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`), turn 1 / conversation `48a34396-5525-4a57-9884-108d93b1872f`

## Options compared

- **A · Atlas current** — `apps/web/src/features/plan/PermanenceScalesCard.tsx`. Read-only banner; 9-rank Yeomans rollup; live counts from 9 Zustand stores (transects, water earthworks + storage, paths, structures, fertility, food-production zones, crops + guilds, ecology). One-line prompt per rank. No spatial view, no ordering check.
- **B · OGDEN prototype** — `PlanDynamicLayeringPage.jsx` + `PlanPermanenceScalesPage.jsx`. Visual dashboard with hero imagery, 6 metric tiles (mocked), and a sub-page that renders a 5-level *collapsed* scale (Climate/Landform → Water → Access/Structures → Trees/Perennials → Annual/Short-term) with anchor inventory and design implications. All numbers mocked; no store wiring.

## Scholar verdict

Verbatim from Scholar (full transcript stored at `.scholar-prompt-layering.txt` + conversation id above):

1. **Orthodox 9-rank Yeomans is preferable to OGDEN's collapsed 5-level scale.** Collapsing Access + Structures into a single tier "violates a core Keyline principle" — roads must follow water before trees are planted, and structures are placed only after windbreaks and water catchments are designed. Atlas's rank ordering is correct.
2. **A static rank+count rollup misses the spatial-relational core of permaculture.** Permaculture is "an interconnection of systems… water, roads, trees, buildings, gardens, fences." A rigorous module must (a) visualise anchors on the map, (b) surface relationships *between* layers (each rank dictates the rank below it), and (c) enforce integration (Holmgren P8 *Integrate rather than segregate*).
3. **Verdict: BUILD_FRESH.** Combine Atlas's 9-rank store wiring with OGDEN's visual / relational UX, and add **conditional warnings** when the steward places lower-permanence elements before their higher-permanence prerequisites.

## Implementation

Additive build (legacy retained per `feedback_no_deletion.md`):

- New card: `apps/web/src/v3/plan/cards/dynamic-layering/PermanenceLadderCard.tsx`. Reuses the 9 Zustand stores from the legacy card and adds:
  - **Permanence ladder** — vertical list of all 9 Yeomans ranks, each with timescale, blurb, count + countLabel, and a proportional bar coloured by rank position (warm → cool top-down).
  - **Ordering check** — for each rank with `count > 0`, walks its `prereqs[]` and lists any prerequisite rank with `count == 0`. Encodes the canonical Keyline ordering: Water requires Climate + Landform; Access requires Climate + Landform + Water; Structures requires …+Access; Vegetation requires Water + Access + Soil; Fauna requires Water + Access + Vegetation; etc.
  - **"Why this ladder"** footer citing Holmgren P8.
- `apps/web/src/v3/plan/types.ts` — added `'plan-permanence-ladder'` as second sub-tab under `'dynamic-layering'`. Original `'plan-permanence-scales'` tab kept.
- `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` — added lazy import + switch case + provenance comment.
- `apps/web/src/v3/plan/PlanChecklistAside.tsx` — rewrote `dynamic-layering` WHY/HOW with Scholar-grounded language (Keyline ordering rationale + the two-tab workflow).

## Why additive (not replacement)

Scholar explicitly endorsed Atlas's 9-rank data model as orthodox. The legacy `PermanenceScalesCard` *is* the rank+count rollup the Scholar said was correct but incomplete; the new ladder card supplies the spatial/relational layer it lacked. Keeping both gives stewards a fast-read prompt (legacy banner) and a deeper diagnostic view (ladder + warnings) within the same module.

## Follow-ups (not in this commit)

- **Map overlay of anchors.** Scholar called for visualising anchors on a map (sectors / zones / topography). Pending: a sector-and-anchor overlay layer that draws each high-permanence element onto the live MapLibre map. Likely a Plan-stage map-overlay control rather than a card.
- **Layer-relationship graph.** Scholar wanted relationships *between* ranks surfaced beyond ordering warnings. A small force-directed or Sankey-style visual ("water feeds soil feeds vegetation") could augment the ladder.
- ✅ **Ordering-violation suggestions** — landed 2026-05-07. Each missing-prerequisite chip in the ordering-check panel is now a deep-link button that switches the slide-up to the Plan module where that rank is authored (rank 2 → `cross-section-solar`, 3 → `water-management`, 4 → `zone-circulation`, 7 → `soil-fertility`, 8 → `plant-systems`). Wired through a new `onSwitchModule?: (mod: PlanModule) => void` prop on `PermanenceLadderCard` + `PlanModuleSlideUp`; `PlanLayout` calls `handleSelectModule(mod)` then re-opens the sheet. Ranks without a Plan module home (Climate, Structures, Subsystems, Fauna) remain plain chips.
- ✅ **Score weighting (extent dimension)** — landed 2026-05-07. Each ladder row now shows a per-rank extent metric alongside the count: rank 3 Water sums `earthwork.lengthM` (formatted as m / km), rank 4 Access sums `path.lengthM`, rank 7 Soil sums `areaM2` of food-production zones (m² / ha), rank 8 Vegetation sums `crop.areaM2`. Ranks without a natural extent metric (Climate, Landform, Structures, Subsystems, Fauna) display count only. The bar still uses count as the primary signal — the extent line gives stewards the magnitude, surfacing the "single 1-acre swale system out-weights five toy footprints" insight without conflating two metrics in one bar. Age and function-count weighting remain deferred.

## Verification

- `npx tsc --noEmit` (NODE_OPTIONS=--max-old-space-size=8192) — exit 0.
- Pre-existing unrelated build error (`elementCatalog.ts` referencing missing `useMapboxDrawTool.js` from user's WIP Vision-Layout work) is **not** caused by this change and tracked separately.

## Sources cited by Scholar

Yeomans P.A. *The Keyline Plan*; Mollison B. *Permaculture Designer's Manual* ch.5; Holmgren D. *Permaculture: Principles & Pathways Beyond Sustainability* — P8 Integrate Rather Than Segregate; OSU PDC pedagogical sequence.

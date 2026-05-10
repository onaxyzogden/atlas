# 2026-05-10 — Stocking-input canonical: per-paddock `pastureQuality` (Path B)

## Context

Two stocking-rate input paths coexisted in `apps/web/src/features/livestock/`:

- **Path A** — `computeForageQuality()` + `computeRecommendedStocking()` in
  `livestockAnalysis.ts`. Site-level. Inputs: organic-matter %, canopy %,
  slope °, growing-season days. Output buckets `high` / `good` / `moderate`
  / `poor` with stocking multipliers `1.1 / 1.0 / 0.75 / 0.5`. Used in 6 v2
  dashboards/cards (GrazingDashboard, HerdRotationDashboard, LivestockDashboard,
  BrowsePressureRiskCard, ErosionGrazingRecoveryCard, CarryingCapacityCard).
- **Path B** — `paddock.pastureQuality` enum (`poor | fair | good | excellent`)
  set per paddock by the steward in PaddockTool's popover. Multipliers
  `0.28 / 0.48 / 1.0 / 1.48` derived from AUE/ha (0.7 / 1.2 / 2.5 / 3.7) and
  normalised to `good = 1.0`. Used only in `LivestockWelfarePhasingCard.tsx`.

The two paths never met. Multiplier scales disagreed (only `good = 1.0`
aligned). Both encoded "pasture quality" but at different granularities and
from different epistemic sources.

## Decision

**Path B is canonical.** Per-paddock `pastureQuality` is the ground truth
for stocking-rate decisions. `computeForageQuality` does not go away — it
becomes a *fallback suggester* for paddocks the steward has not yet graded.

Reasoning:

- Pasture state really is paddock-level. Two paddocks 200 m apart on the
  same parcel can have very different forage (north-slope wet meadow vs.
  south-facing dry knoll). A site-wide scalar discards information the
  steward already collects.
- `pastureQuality` is anchored to recognised AUE/ha figures from grazing
  literature; A's multipliers (`1.1 / 1.0 / 0.75 / 0.5`) were always a
  rough heuristic.
- B's authoring path is already wired: PaddockTool popover writes the
  field, `livestockStore` persists it, the welfare card surfaces it.

## Implementation

Two files touched:

1. **`apps/web/src/features/livestock/livestockAnalysis.ts`** — added two
   new exports:
   - `PASTURE_QUALITY_MULTIPLIER: Record<PastureQuality, number>` —
     canonical mapping (single source of truth).
   - `computePaddockRecommendedStocking(paddock, fallbackForage?)` —
     reads `paddock.pastureQuality` first, falls back to a passed
     `ForageQuality`, else returns the catalog `typicalStocking`
     unchanged. Returns head|birds|hives per hectare, rounded to 0.1.
   - JSDoc note on legacy `computeRecommendedStocking(species, forage)`
     pointing future per-paddock callers at the new helper.

2. **`apps/web/src/features/livestock/LivestockWelfarePhasingCard.tsx`** —
   removed the local `PASTURE_QUALITY_MULTIPLIER` constant; imports the
   canonical export from `livestockAnalysis.ts`. No render-path change.

## Out of scope

- The 6 v2-dashboard call-sites of `computeRecommendedStocking(species,
  forage)` keep working unchanged. Future per-paddock revisions of those
  cards adopt `computePaddockRecommendedStocking` opportunistically.
- Site-level dashboards (LivestockDashboard, GrazingDashboard,
  CarryingCapacityCard) still consume `computeForageQuality` for
  site-wide forage *potential*; that's the right model at their level.
- No A→B bucket-name mapping (`high → excellent`, etc.) is exported yet
  — premature until a caller needs it. Adding it later is one named
  helper.

## Verification

- `apps/web npx tsc --noEmit` clean (exit 0).
- Welfare card populated branch (`/v3/project/mtc/plan/livestock` →
  Welfare phasing tab) with test paddocks `sheep+good`, `sheep+poor`,
  `poultry+poor`, `goats+excellent` rendered:
  - Sheep avg `(1.0 + 0.28) / 2 = 0.64` → `12 × 0.64 = 7.7 head/ha` ✓
  - Poultry `0.28` → `250 × 0.28 = 70 birds/ha` ✓
  - Goats `1.48` → `10 × 1.48 = 14.8 head/ha` ✓
- Welfare card empty-state picker re-scaling:
  - Sheep `poor` (`0.28`) → `3.4 head/ha` ✓
  - Sheep `excellent` (`1.48`) → `17.8 head/ha` ✓
- `grep PASTURE_QUALITY_MULTIPLIER` confirms one declaration site, two
  usage sites in the welfare card, plus the new helper in analysis.

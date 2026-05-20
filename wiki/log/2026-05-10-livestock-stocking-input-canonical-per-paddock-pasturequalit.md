# 2026-05-10 — Livestock stocking-input canonical: per-paddock `pastureQuality`


Unified the two stocking-rate input paths in `livestockAnalysis.ts`:

- `PASTURE_QUALITY_MULTIPLIER` (canonical AUE/ha-derived mapping) hoisted
  from `LivestockWelfarePhasingCard.tsx` into `livestockAnalysis.ts` as a
  named export. Single source of truth.
- New helper `computePaddockRecommendedStocking(paddock, fallbackForage?)`
  reads `paddock.pastureQuality` first (steward observation = ground
  truth) and falls back to a passed `ForageQuality` from
  `computeForageQuality(...)` when the paddock has not been graded.
- Legacy `computeRecommendedStocking(species, forage)` keeps its signature
  and the 6 v2-dashboard call-sites (Grazing/HerdRotation/Livestock
  dashboards + BrowsePressureRiskCard/ErosionGrazingRecoveryCard/
  CarryingCapacityCard). JSDoc note steers future per-paddock callers at
  the new helper.
- `LivestockWelfarePhasingCard.tsx` imports the canonical multiplier;
  local constant removed.

ADR: [`wiki/decisions/2026-05-10-atlas-stocking-input-canonical-pasture-quality.md`](decisions/2026-05-10-atlas-stocking-input-canonical-pasture-quality.md).

**Verification.** `apps/web npx tsc --noEmit` clean (exit 0). Welfare
populated branch and empty-state picker both replayed identical numbers
post-refactor (sheep 7.7 / poultry 70 / goats 14.8 in populated; sheep
3.4 poor / 17.8 excellent in empty-state).

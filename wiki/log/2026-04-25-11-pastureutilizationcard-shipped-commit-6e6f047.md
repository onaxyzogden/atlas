# 2026-04-25 — §11 PastureUtilizationCard shipped (commit `6e6f047`)


Paddock-by-paddock stocking-density feedback card mounted on
`LivestockDashboard` after `BiosecurityBufferCard`. Closes the manifest
gap where `paddock-sizing-stocking-density` had a sizing calculator but
no utilization-vs-recommendation feedback.

For each paddock with a primary species and a `stockingDensity` value,
the card classifies utilization against the species' `typicalStocking`
from the local catalog, scaled by a precipitation-based forage capacity
factor derived from `climate.annual_precip_mm`:

  capFactor = 0.5 (≤300 mm) → 1.0 (~800 mm) → 1.1 (≥1500 mm)

Bands: **under** (<60%), **aligned** (60–110%), **high** (110–150%),
**over** (>150%). Each row carries density, recommended density,
utilization %, head count, AU load, AU/ha, plus an actionable advisory
(grow herd, shrink paddock, reduce intensity, watch parasite pressure).

Whole-parcel rollup: paddock count + idle subset, total area, total AU
loaded, parcel-wide AU/ha (tone-coded against 1.5/2.5 thresholds), and
an out-of-band/in-stocked count summarized in the header badge.

**Files (4):**
- `apps/web/src/features/livestock/PastureUtilizationCard.tsx` (new, 275 lines)
- `apps/web/src/features/livestock/PastureUtilizationCard.module.css` (new, 271 lines)
- `apps/web/src/features/dashboard/pages/LivestockDashboard.tsx` (mount + import)
- `packages/shared/src/featureManifest.ts` (`paddock-sizing-stocking-density`
  §11 partial → done)

Pure presentation — uses `useLivestockStore`, `LIVESTOCK_SPECIES`,
`AU_FACTORS`, and the climate site-data layer. No shared-package math,
no new persistence, no map writes. Type-check clean (`tsc --noEmit` exit 0).

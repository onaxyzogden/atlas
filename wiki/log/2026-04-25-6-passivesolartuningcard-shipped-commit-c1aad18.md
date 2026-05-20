# 2026-04-25 — §6 PassiveSolarTuningCard shipped (commit `c1aad18`)


Feature → per-structure rotate-by-X advisory card mounted on
`SolarClimateDashboard` between the Microclimate Insights section and the
Microclimate Zones grid. `PlacementScoringCard` already scores per-structure
long-axis alignment against the equator; this new card translates that score
into actionable rotation deltas — "rotate counter-clockwise 22°" — and rolls
the fleet into a parcel-level tuning summary so a steward can see at a
glance which dwellings still need a footprint adjustment before final
stake-out.

**Files:**
- `apps/web/src/features/climate/PassiveSolarTuningCard.tsx` (~300 lines)
- `apps/web/src/features/climate/PassiveSolarTuningCard.module.css` (~300 lines)
- `apps/web/src/features/climate/SolarClimateDashboard.tsx` — import + mount
- `packages/shared/src/featureManifest.ts` — `passive-solar-building-siting`
  (§6) `partial` → `done` (this flip rode along in `dffc2b1`, the parallel
  fieldwork commit)

**Logic:**
- `HABITABLE_TYPES` covers cabin / yurt / greenhouse / bathhouse /
  prayer_space / classroom / earthship / pavilion / workshop /
  tent_glamping. Non-habitable structures (water tanks, sheds) excluded.
- `buildRow(s, lat)` derives `longIsWidth = widthM >= depthM`, sets
  `idealRot = longIsWidth ? 0 : 90`, reduces rotation mod 180 (so 180° ≡
  0°), then computes `deviation = min(r180, 180 - r180)` ∈ [0, 90] and a
  signed delta in the range −45..+45 (positive = clockwise).
- `axisScore = round((1 − deviation/90) × 40)` mirrors the
  PlacementScoringCard convention exactly, so the two cards stay in lockstep
  with no shared-package math drift. `potentialGain = 40 − axisScore`.
- Bands: aligned ≤ 15°, tunable 15–45°, critical > 45°.
- Each row renders a 0–90° gauge, four figure cells (current rot, ideal rot,
  suggested signed Δ, axis score N/40), and a plain-language advisory
  ("Rotate clockwise 22° … projected gain +9 axis pts").
- Parcel rollup tallies aligned/tunable/critical counts plus total
  recoverable axis points and total degrees of rotation needed across the
  fleet.
- Hemisphere-aware glazing primer at the top: `lat ≥ 0 →` south-facing
  long wall, else north — reminds the steward that axis alignment is
  necessary but not sufficient if the glazed facade looks at the wrong sky.

**Type-check:** clean (`tsc --noEmit` exit 0). Initial draft typed
`parcelBoundaryGeojson` as `Polygon | MultiPolygon` and threaded the full
`LocalProject` shape; refactored to take `{ projectId: string; lat: number }`
since the parent already derives `lat` via `turf.centroid` upstream.

**Verification:** type-check only. No live preview attempted this iteration.

**Pure presentation.** Reads `useStructureStore` + parent-derived `lat`. No
new shared math, no map overlays, no new entity types, no server work.

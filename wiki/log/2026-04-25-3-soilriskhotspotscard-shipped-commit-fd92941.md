# 2026-04-25 — §3 SoilRiskHotspotsCard shipped (commit `fd92941`)


Feature → per-zone soil-risk advisory card mounted on `EcologicalDashboard`
between `EcologicalProtectionCard` and the carbon / seasonality / samples
stack. Closes the dry / wet / erosion / compaction half of §3
`sun-trap-dry-wet-erosion-compaction` (the sun-trap half is already
covered by `MicroclimateInsightsCard`). Mid-iteration the user pointed out
that the Livestock tab was missing an in-panel "Draw Paddock" button — that
shipped first as a small fix (`448a1ac`) before this card.

**Files:**
- `apps/web/src/features/soil-fertility/SoilRiskHotspotsCard.tsx` (~385 lines)
- `apps/web/src/features/soil-fertility/SoilRiskHotspotsCard.module.css` (~250 lines)
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` — import + mount
- `packages/shared/src/featureManifest.ts` — `sun-trap-dry-wet-erosion-compaction`
  (§3) `partial` → `done`

**Logic (per zone):**
- **Compaction:** if a paddock centroid lies within 200 m of the zone
  centroid, use its `stockingDensity` — ≥ 14 head/ha = high, ≥ 8 = medium.
  Fallback medium for `livestock` / `infrastructure` / `access` zones with
  no stocking recorded.
- **Erosion:** zone `successionStage = 'bare'` → high; `'pioneer'` → medium;
  cleared access corridors bump medium when not yet climax.
- **Dry-prone:** centroid distance to nearest water utility (`well_pump` /
  `water_tank` / `rain_catchment`) — > 250 m = high (beyond hose run),
  120–250 m = medium (constrains irrigation lines), no water utility placed
  yet = medium for any non-conservation, non-water-retention zone.
- **Wet-prone:** `category = water_retention` (by-design wet) or ≥ 2 water
  utilities clustered within 80 m of the centroid (likely a low pocket).

Worst severity per zone drives the row tone (high / watch / clear). Parcel
rollup shows a tile per risk class with a hit count, and a footnote spells
out the heuristic thresholds so a steward knows what to interpret as
"walk-the-land prompt" vs. "engineering call."

**Type-check:** clean (`tsc --noEmit` exit 0). Manifest flip was reverted
once mid-commit by a parallel session (line 158 sprung back to `partial`)
and re-applied before staging — final cached diff shows just the single
intended line change.

**Pure presentation.** Reads `useZoneStore` + `useLivestockStore` +
`useUtilityStore` only. No new shared math, no new entity types, no map
writes, no server work.

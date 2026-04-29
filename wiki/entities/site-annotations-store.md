# Site Annotations Store
**Type:** module (Zustand store)
**Status:** active
**Path:** `apps/web/src/store/siteAnnotationsStore.ts`

## Purpose
Persisted store for user-authored OBSERVE-stage annotations: hazard events,
A–B transects, sector arrows, ecology observations, succession stage per
project, and SWOT entries. Distinct from `siteDataStore` (which caches
fetch-driven layer pulls) — this store is the canonical home for annotations
the steward types in.

## Key Files
- `siteAnnotationsStore.ts` — store definition, types, actions, persist
  config (`ogden-site-annotations` v1)

## API / Interface
```ts
type HazardType = 'hurricane' | 'ice_storm' | 'blizzard' | 'flood'
  | 'wildfire' | 'lightning' | 'drought' | 'heatwave' | 'pest' | 'other';
type HazardSeverity = 'low' | 'med' | 'high';
type SectorType = 'sun_summer' | 'sun_winter' | 'wind_prevailing'
  | 'wind_storm' | 'fire' | 'noise' | 'wildlife' | 'view';
type SectorIntensity = 'low' | 'med' | 'high';
type TrophicLevel = 'producer' | 'primary' | 'secondary' | 'tertiary' | 'decomposer';
type SuccessionStage = 'disturbed' | 'pioneer' | 'mid' | 'late' | 'climax';
type SwotBucket = 'S' | 'W' | 'O' | 'T';

interface State {
  hazards: HazardEvent[];
  transects: Transect[];
  sectors: SectorArrow[];
  ecology: EcologyObservation[];
  successionStageByProject: Record<string, SuccessionStage>;
  swot: SwotEntry[];
}

// Add/update/remove for each family + setSuccessionStage(projectId, stage).
```

Helper: `newAnnotationId(prefix: string)` returns
`${prefix}-${Date.now()}-${random}`.

## Dependencies
- `zustand` + `zustand/middleware/persist`
- Read by: `ObserveHub`, `HazardsLogCard`, `CrossSectionTool`,
  `FoodChainCard`, `SectorCompassCard`, `SwotJournalCard`,
  `DiagnosisReportExport`
- Independent of `siteDataStore` and `soilSampleStore`

## Current State
- All 6 record families ship in v1.
- Persisted under key `ogden-site-annotations`, version 1, no migrations.
- All entries are project-scoped via `projectId` field; consumers filter via
  the subscribe-then-derive pattern (raw store array → `useMemo` filter)
  per [2026-04-26 Zustand Selector Stability](../decisions/2026-04-26-zustand-selector-stability.md).

## Notes
The plan called for extending `siteDataStore`, but siteDataStore is
fetch-driven (cached layer pulls keyed by project + AbortController
registry). Mixing user annotations into that lifecycle would have made
abort + cache-invalidation reasoning brittle. Decision recorded in
[2026-04-29 OBSERVE Stage IA Restructure](../decisions/2026-04-29-observe-stage-ia-restructure.md).

# CONTEXT — Section 5: Hydrology & Water Systems Planning

> This folder is the canonical public surface for §5. All §5
> components (`HydrologyWaterPage`, `HydrologyPanel`) live here and
> import from `@/features/hydrology-water`.

## Phase tags
P1 (done), P2 (planned) — see `packages/shared/src/featureManifest.ts`
for the authoritative item list.

## Purpose
Visualizes and plans every water-relevant layer of a property: surface
flow paths, watershed and catchment boundaries, drainage network, flood
accumulation, pond/swale/berm/check-dam candidate zones, overflow
routing, roof catchment and rainwater storage sizing, gravity-fed
irrigation and livestock water access, wetland and riparian
restoration, seasonal water budget, and retention/drought/storm
resilience scoring. This is the water "design atlas" that sits between
Section 4 (diagnostic) and the design sections that place structures,
crops, livestock, and access routes.

## File inventory

### Canonical surface (this folder)
- `HydrologyWaterPage.tsx` — server-data stats card. Reads the typed
  `HydrologyWaterResponse` from `/api/v1/hydrology-water/:projectId`
  (runoff max/mean, high-concentration pct, flood detention zones,
  drainage divides, drainage density, pond/swale candidate counts,
  confidence, data sources). Handles `not_ready` reasons (no_boundary
  / pipeline_pending / pipeline_failed).
- `HydrologyPanel.tsx` — Mapbox overlay for flow paths, watershed,
  drainage, wetlands. Takes map props and renders via MapLibre layers.
- `HydrologyPanel.module.css`
- `index.ts` — exports `HydrologyWaterPage` and `HydrologyPanel`.

### Related (outside this folder)
- `apps/web/src/features/dashboard/pages/HydrologyDashboard.tsx` —
  dashboard view over the same data.

### Server route
- `apps/api/src/routes/hydrology-water/index.ts` —
  `GET /api/v1/hydrology-water/:projectId` gated at P1. Reads
  `project_layers` where `layer_type='watershed_derived'` and returns a
  `HydrologyWaterResponse` discriminated union (`ready` | `not_ready`).
  Ownership enforced via `resolveProjectRole`.

### Server-side backing (pipeline)
- `apps/api/src/services/terrain/WatershedRefinementProcessor.ts` —
  watershed delineation, catchment area, drainage divides, and pond /
  swale / berm / check-dam candidate generation (Tier-3 pipeline). Writes
  into `project_layers` as `watershed_derived`.
- `apps/api/src/services/terrain/TerrainAnalysisProcessor.ts` — TWI flow
  accumulation, flood-prone flagging, curvature inputs.
- `apps/api/src/services/terrain/algorithms/hydro.ts` — drainage line
  extraction algorithm.
- `apps/api/src/adapters/NHDAdapter.ts` — NHD national drainage network
  (US).
- `apps/api/src/adapters/OhnAdapter.ts` — Ontario Hydro Network (CA
  equivalent), surfaced via Country INTL routing.
- `apps/api/src/adapters/NwiFemaAdapter.ts` — NWI wetlands + FEMA
  floodplain overlays.
- `apps/api/src/adapters/SsurgoAdapter.ts` — drainage class per soil map
  unit.
- `apps/api/src/db/migrations/007_twi_tri.sql` — persists TWI/TRI.
- `apps/api/src/db/migrations/008_erosion_cutfill.sql` — erosion +
  cut/fill detector.

### Shared schema
- `packages/shared/src/schemas/section5.schema.ts` — canonical response
  types: `HydrologyWaterSummary`, `HydrologyWaterResponse` discriminated
  union, plus `FloodDetentionZone`, `PondCandidate`, `SwaleCandidate`
  record shapes. Exported through the main `@ogden/shared` barrel.

## Stores touched
- `useProjectStore` — active project id, boundary, layer summaries.
- `useHydrologyWater(projectId)` (React Query hook in
  `apps/web/src/hooks/useProjectQueries.ts`) — fetches the typed
  response with a 60s stale window.

## API routes consumed
- `GET /api/v1/hydrology-water/:projectId` — primary read-path (this
  folder). Returns `{ status: 'ready'|'not_ready', ... }`.
- `GET /api/v1/elevation/*` — DEM underpinning flow / watershed / TWI
  (used by the pipeline, not directly by this folder).
- `GET /api/v1/layers/*` — wetland, floodplain, NHD/OHN drainage layer
  access (used by the map overlay).
- `GET /api/v1/pipeline/*` — pipeline job status.
- (Pond/swale suggestion, rainwater sizing, water budget, phasing, and
  retention/drought/storm scoring endpoints do NOT exist yet; those
  items are `planned` in the manifest.)

## Cross-section dependencies
- §2 Basemap — terrain / contour / hillshade layers used to render flow
  paths and watershed boundaries.
- §3 Data Layers — NHD / OHN / NWI / FEMA / SSURGO drainage feed this
  section.
- §4 Site Assessment — reads flood-prone flag, water resilience score,
  and pond/swale candidate zones for the diagnostic dossier.
- §7 Soil & Ecology — drainage class and infiltration inputs.
- §11 Livestock — trough placement + livestock water access (§5 P2
  plans the water side; placement UX lives in §11).
- §12 Crops — gravity-fed irrigation layout feeds crop plan.
- §15 Timeline / §16 Simulation — water system phasing and dependency
  mapping (planned).

## Known gotchas
- The dashboard page at `features/dashboard/pages/HydrologyDashboard.tsx`
  renders the same data in a different shell. Do not duplicate the
  overlay component — import `HydrologyPanel` from
  `@/features/hydrology-water` if you need it elsewhere.
- Pond/swale/berm/check-dam items are `partial`: the candidate zones
  are computed by `WatershedRefinementProcessor` and persisted (and the
  counts render in `HydrologyWaterPage`), but the UI "placement
  suggestion" flow (pick a candidate → propose a structure) is not
  shipped. Do not flip those items to `done` until the design surface
  exists.
- `water-retention-drought-storm-scores` is `done`. The three labels
  (`Water Retention`, `Drought Resilience`, `Storm Resilience`) are
  emitted by `computeScores` alongside the existing 8 weighted scores,
  weighted **0** in `computeOverallScore` (same pattern as FAO / USDA
  LCC) so they render as diagnostic facets without shifting overall
  scores on existing rows. They are exercised by the parity-test
  fixture's `watershed_derived` layer; do NOT remove that fixture entry.
- Country-specific drainage networks: US = NHD, CA = OHN. Consumers of
  drainage data must go through the Country INTL routing layer, not
  hardcode NHD. See the `IntlCountryAdapter` pattern introduced in
  commit `0ea1351`.
- `GET /api/v1/hydrology-water/:projectId` is gated behind
  `fastify.requirePhase('P1')` per the generator default — if
  `ATLAS_PHASE_MAX` is set below P1 the route 404s; trust
  `featureGatePlugin`, don't reimplement gating in the handler.
- `not_ready` is an expected non-error state. The three `reason` codes
  (`no_boundary`, `pipeline_pending`, `pipeline_failed`) each have
  distinct UI copy in `HydrologyWaterPage`; do not collapse them into a
  generic "loading" banner.
- `summary.waterBudget` is an **optional** block on the ready response.
  The route derives it on demand via `computeHydrologyMetrics` from the
  climate/soils/elevation/wetlands/watershed layers; it is omitted when
  annual precip or project acreage is missing. The UI conditionally
  renders a "Water budget" section — do not assume the block is always
  present.

## Test surface
- `apps/api/src/services/terrain/__tests__/` — WatershedRefinementProcessor
  and TerrainAnalysisProcessor unit tests cover the existing flow,
  watershed, drainage, TWI, and candidate-zone outputs.
- `apps/api/scripts/verify-scoring-parity.ts` — must remain green; even
  though water scores are `planned`, any future addition must preserve
  parity between the shared engine and the server writer.
- Highest-value tests to add next: an integration test that seeds a
  `project_layers.watershed_derived` row and asserts
  `HydrologyWaterPage` renders the expected stats, and a 404 test under
  `ATLAS_PHASE_MAX` below P1.

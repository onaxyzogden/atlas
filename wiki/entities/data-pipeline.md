# Data Pipeline
**Type:** service
**Status:** partial
**Path:** `apps/api/src/services/pipeline/`

## Purpose
BullMQ-based job queue that fetches geospatial data layers for a project. Fan-out pattern: enqueue one job, fetch all 7 layers in parallel.

## Key Files
- `DataPipelineOrchestrator.ts` — Queue management, worker startup, job processing
- `apps/api/src/db/migrations/001_initial.sql` — `data_pipeline_jobs` table

## Layers (7 types)
| Layer | US Adapter | CA Adapter | Status |
|-------|-----------|------------|--------|
| Elevation | UsgsElevationAdapter (LIVE) | NrcanHrdemAdapter (LIVE) | **Live** |
| Soils | SsurgoAdapter (LIVE) | OmafraCanSisAdapter (LIVE) | **Live** |
| Watershed | NhdAdapter (LIVE) | OhnAdapter (LIVE) | **Live** |
| Wetlands/Flood | NwiFemaAdapter (LIVE) | ConservationAuthorityAdapter (LIVE) | **Live** |
| Land Cover | **NlcdAdapter (LIVE)** | **AafcLandCoverAdapter (LIVE)** | **Live** |
| Climate | **NoaaClimateAdapter (LIVE)** | **EcccClimateAdapter (LIVE)** | **Live** |
| Zoning | **UsCountyGisAdapter (LIVE)** | **OntarioMunicipalAdapter (LIVE)** | **Live** |

## Workers
- `tier1-data` — Main layer fetcher (all 7 layers)
- `tier3-terrain` — Terrain analysis (slope, aspect)
- `tier3-watershed` — Watershed delineation
- `tier3-microclimate` — Microclimate modeling
- `tier3-soil-regeneration` — Soil health scoring

All workers start automatically on app ready (if `redis.status === 'ready'`).

## Connection Pattern
BullMQ requires dedicated connections — it cannot share the Fastify ioredis instance. The orchestrator extracts `ConnectionOptions` (host, port, password, family, `maxRetriesPerRequest: null`) from `redis.options` and passes them to each Queue/Worker constructor.

## Current State (as of 2026-04-19)
- Orchestration: **working** (BullMQ + Redis, dedicated connections)
- Fan-out pattern: **working**
- Adapter registry: **14/14 live** — ALL Tier 1 layers covered: soils (SsurgoAdapter + OmafraCanSisAdapter), elevation (UsgsElevationAdapter + NrcanHrdemAdapter), watershed (NhdAdapter + OhnAdapter), wetlands/flood (NwiFemaAdapter + ConservationAuthorityAdapter), climate (NoaaClimateAdapter + EcccClimateAdapter), land_cover (NlcdAdapter + AafcLandCoverAdapter), zoning (UsCountyGisAdapter + OntarioMunicipalAdapter)
- Combined completeness coverage from live adapters: soils 20% + elevation 15% + watershed 15% + wetlands_flood 15% + zoning 15% + climate 10% + land_cover 10% = **100% of total completeness weight**
- Job tracking: **working** (queued/running/complete/failed/retrying states)
- Frontend layerFetcher: **19 live layer types** — 7 Tier 1 + infrastructure (Sprint K) + 11 extended layers added Sprints M–W: groundwater (USGS NWIS + Ontario PGMN), water_quality (EPA WQP + ECCC/PWQMN), superfund (EPA Envirofacts), critical_habitat (USFWS ArcGIS), storm_events (FEMA), crop_validation (USDA NASS CDL), air_quality (EPA EJSCREEN), earthquake_hazard (USGS Design Maps), census_demographics (US Census ACS), proximity_data (OSM Overpass)
- Test coverage: 298/298 tests pass (14 adapter test files + integration tests)
- **Scoring engine: complete** (Sprint M, 2026-04-16) — 8 weighted dimensions + 2-3 formal classifications, ~140+ components, all outputs use `ScoredResult` with `score_breakdown` + `WithConfidence` fields. Plan file `clever-enchanting-moler.md` is fully implemented.
- **Next focus:** Groundwater + water quality UI surfacing in SiteIntelligencePanel (data already fetched + scored, no display section yet), or US county zoning registry expansion.

## Pipeline Fixes (Sprint M, 2026-04-16)
- **Orphan `compute_assessment` job removed:** An INSERT into `data_pipeline_jobs` with layer_type `compute_assessment` had no corresponding BullMQ queue or worker — dead code. Removed from orchestrator.
- **BullMQ retry status-tracking fix:** All 4 Tier 3 workers had `AND status = 'queued'` in their UPDATE query to mark jobs `running`. After a BullMQ retry (job already `failed`), the UPDATE matched 0 rows. Fixed to `AND status IN ('queued', 'failed')` across all 4 workers.
- **design-features type fix:** Cast `body.properties` and `body.style` to `Record<string, string>` to satisfy `db.json()` TS2345 in `routes/design-features/index.ts`.

## Strategic Gaps
The current 7-layer model covers elevation, soils, watershed, wetlands/flood, land cover, climate, and zoning. The [Gap Analysis](gap-analysis.md) identifies ~120 additional parameters across 13 categories that global frameworks require — including crop suitability (entirely missing), renewable energy, environmental risk, and regulatory/legal layers. Future adapter work should reference that inventory.

## Completeness Scoring
Weighted by layer type: soils 20%, elevation/watershed/wetlands/zoning 15% each, land_cover/climate 10% each. Stored as `data_completeness_score` on the project.

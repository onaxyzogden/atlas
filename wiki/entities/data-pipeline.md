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
| Elevation | USGS EPQS | NRCan HRDEM (needs proxy) | Partial |
| Soils | **SsurgoAdapter (LIVE)** | LIO ArcGIS REST | **Backend live** |
| Watershed | USGS WBD | Ontario Hydro Network | Connected |
| Wetlands/Flood | FEMA NFHL + NWI | Latitude model | Partial |
| Land Cover | MRLC NLCD WMS | AAFC Crop Inventory | Partial |
| Climate | Latitude model | ECCC OGC API | Partial |
| Zoning | Not connected | Not connected | Stub |

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
- Adapter registry: **8/14 live** — soils (SsurgoAdapter + OmafraCanSisAdapter), elevation (UsgsElevationAdapter + NrcanHrdemAdapter), watershed (NhdAdapter + OhnAdapter), wetlands/flood (NwiFemaAdapter + ConservationAuthorityAdapter). Remaining 6 adapters resolve to `ManualFlagAdapter`.
- Combined completeness coverage from live adapters: soils 20% + elevation 15% + watershed 15% + wetlands_flood 15% = **65% of total completeness weight**
- Job tracking: **working** (queued/running/complete/failed/retrying states)
- Frontend layerFetcher: has 10 **live** external API connections (USGS 3DEP, SSURGO SDA, NOAA LCD, FEMA NFHL, NWI, MRLC NLCD, ECCC, LIO ArcGIS, AAFC, NRCan HRDEM) with mock fallback — this is NOT equivalent to the backend pipeline being connected
- Test coverage: 126/126 adapter tests pass (8 test files)
- Next priority: climate adapters (NOAA Normals US + ECCC Normals CA, 10% weight)

## Pipeline Fixes (Sprint M, 2026-04-16)
- **Orphan `compute_assessment` job removed:** An INSERT into `data_pipeline_jobs` with layer_type `compute_assessment` had no corresponding BullMQ queue or worker — dead code. Removed from orchestrator.
- **BullMQ retry status-tracking fix:** All 4 Tier 3 workers had `AND status = 'queued'` in their UPDATE query to mark jobs `running`. After a BullMQ retry (job already `failed`), the UPDATE matched 0 rows. Fixed to `AND status IN ('queued', 'failed')` across all 4 workers.
- **design-features type fix:** Cast `body.properties` and `body.style` to `Record<string, string>` to satisfy `db.json()` TS2345 in `routes/design-features/index.ts`.

## Strategic Gaps
The current 7-layer model covers elevation, soils, watershed, wetlands/flood, land cover, climate, and zoning. The [Gap Analysis](gap-analysis.md) identifies ~120 additional parameters across 13 categories that global frameworks require — including crop suitability (entirely missing), renewable energy, environmental risk, and regulatory/legal layers. Future adapter work should reference that inventory.

## Completeness Scoring
Weighted by layer type: soils 20%, elevation/watershed/wetlands/zoning 15% each, land_cover/climate 10% each. Stored as `data_completeness_score` on the project.

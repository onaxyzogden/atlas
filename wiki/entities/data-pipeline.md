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
| Soils | SSURGO SDA | LIO ArcGIS REST | Connected |
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

## Current State (as of 2026-04-14 deep audit)
- Orchestration: **working** (BullMQ + Redis, dedicated connections)
- Fan-out pattern: **working**
- Adapter registry: **100% stubbed** — all 14 adapters (7 layers × 2 countries) resolve to `ManualFlagAdapter` (returns `{ unavailable: true, reason: 'no_adapter_for_region', confidence: 'low' }`)
- Job tracking: **working** (queued/running/complete/failed/retrying states)
- Frontend layerFetcher: has 10 **live** external API connections (USGS 3DEP, SSURGO SDA, NOAA LCD, FEMA NFHL, NWI, MRLC NLCD, ECCC, LIO ArcGIS, AAFC, NRCan HRDEM) with mock fallback — this is NOT equivalent to the backend pipeline being connected
- Critical gap: The backend pipeline is the intended production path, and it has 0% real adapter implementations

## Strategic Gaps
The current 7-layer model covers elevation, soils, watershed, wetlands/flood, land cover, climate, and zoning. The [Gap Analysis](gap-analysis.md) identifies ~120 additional parameters across 13 categories that global frameworks require — including crop suitability (entirely missing), renewable energy, environmental risk, and regulatory/legal layers. Future adapter work should reference that inventory.

## Completeness Scoring
Weighted by layer type: soils 20%, elevation/watershed/wetlands/zoning 15% each, land_cover/climate 10% each. Stored as `data_completeness_score` on the project.

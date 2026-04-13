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

All workers start automatically on app ready (if Redis is available).

## Current State
- Orchestration: **working** (BullMQ + Redis)
- Fan-out pattern: **working**
- Adapter registry: **stub** — all resolve to `ManualFlagAdapter` (hardcoded low-confidence)
- Job tracking: **working** (queued/running/complete/failed/retrying states)

## Completeness Scoring
Weighted by layer type: soils 20%, elevation/watershed/wetlands/zoning 15% each, land_cover/climate 10% each. Stored as `data_completeness_score` on the project.

# 2026-04-19 — Deep Technical Audit v2 (supersedes 04-14)


Produced `ATLAS_DEEP_AUDIT_2026-04-19.md` (392 lines, repo root) via 5 parallel Explore agents across structure/secrets/flags, DB schema+tsc-api, API routes+services+jobs+adapters, frontend components+stores+layerFetcher+tsc-web, data-integration + feature-completeness matrices; synthesized Phase H (revised %, critical path, data-pipeline gap map, user-journey, top-10 leverage tasks).

### Documentation corrections required (findings)
- **Adapter count was stale**: 2026-04-19 log entry stated "Adapters live: 8/14, remaining: wetlands/flood, climate, land_cover, zoning". Direct inspection of `apps/api/src/services/pipeline/adapters/` confirmed **all 14 adapters are LIVE** (Ssurgo, OmafraCanSis, UsgsElevation, NrcanHrdem, Nhd, Ohn, NwiFema, ConservationAuthority, NoaaClimate, EcccClimate, Nlcd, AafcLandCover, UsCountyGis, OntarioMunicipal). Zoning adapters are LIVE but PARTIAL (county/municipal-level only; parcel setbacks + overlays missing).
- **Store count was stale**: global CLAUDE.md references "18 stores"; actual `apps/web/src/stores/` count is **26**.

### Revised completion (vs 04-14 ~65% DONE headline)
Broken down: core infra ~95%, Tier-1 pipeline ~85% (full roadmap ~15%), scoring ~55%, frontend real-data ~75%, exports ~80%, AI ~5%. Aggregate: **~55% DONE · 25% PARTIAL · 20% STUB** when roadmap width is honoured (NWIS, StreamStats, EPA suite, GWA, PVWatts, Regrid, PAD-US, WDPA, WorldClim, WorldCover, SRTM still absent).

### Top-3 leverage for next session
1. Correct documentation drift (this entry + CLAUDE.md store count).
2. NasaPowerAdapter (solar radiation) — unblocks PET, LGP, PVWatts wiring, solar-PV score.
3. Wire Anthropic SDK into `ClaudeClient.ts` — activates the AtlasAI panel end-to-end.

### Other findings worth tracking
- `site_assessments` table is read by routes but **never written** from TypeScript. Either populate from Tier-3 completion callback or remove.
- `@scalar/fastify-api-reference` is a declared dep but no OpenAPI spec is registered — wire or drop.
- 3 layer types (zoning/infrastructure/mine_hazards) fall through to `mockLayerData.ts` silently; UI should badge them "demo" or gate.
- TypeScript strict passes cleanly on both api and web (0 errors each). Secrets scan clean.

Commit pending: audit file only; no code changes.

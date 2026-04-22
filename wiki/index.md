# Atlas Wiki Index

Authoritative accumulated-context source for the OGDEN Atlas project.
Read this first at the start of every session.

## Orientation
- [SCHEMA.md](SCHEMA.md) — Wiki conventions and page templates
- [log.md](log.md) — Chronological operation log
- [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md) — Pre-commercial blockers (legal, ops, compliance)

## Entities
- [Atlas Platform](entities/atlas-platform.md) — Project overview, stack, completion status, launch blockers
- [API Backend](entities/api.md) — Fastify routes, patterns, services, dependencies
- [Web App](entities/web-app.md) — React SPA, dashboard groups, Zustand stores, feature structure
- [Shared Package](entities/shared-package.md) — Zod schemas, utilities, constants
- [Database](entities/database.md) — PostgreSQL/PostGIS schema (12 tables), connection pattern
- [Data Pipeline](entities/data-pipeline.md) — BullMQ orchestration, layer adapters, workers
- [PDF Export Service](entities/pdf-export-service.md) — Puppeteer templates, S3 storage, 7 export types
- [Gap Analysis](entities/gap-analysis.md) — ~120 gaps against global frameworks (FAO, USDA, ASTM, IUCN), triage roadmap

## Concepts
- [Design System](concepts/design-system.md) — Earth Green + Harvest Gold, Fira Code/Sans, component tokens
- [Scoring Engine](concepts/scoring-engine.md) — 8 weighted dimensions + 2-3 classifications, ~140+ components, WithConfidence, Tier 3 integration
- [Financial Model](concepts/financial-model.md) — Cost/revenue/cashflow engine, CostRange, mission scoring
- [Local-First Architecture](concepts/local-first-architecture.md) — Zustand + localStorage, no backend sync yet

## Decisions
- [2026-04-11 PDF Export Architecture](decisions/2026-04-11-pdf-export-architecture.md) — Puppeteer, sync rendering, template literals, client payload
- [2026-04-11 Dashboard Sidebar Groups](decisions/2026-04-11-dashboard-sidebar-groups.md) — Finance + Compliance groups added
- [2026-04-20 GAEZ v4 Self-Hosting](decisions/2026-04-20-gaez-self-hosting.md) — Self-host FAO GAEZ v4 Theme 4 COGs behind Fastify point-query; geotiff.js byte-range reads; CC BY-NC-SA 3.0 IGO flagged for legal review
- [2026-04-20 Atlas Staging Provisioning](decisions/2026-04-20-atlas-staging-provisioning.md) — Proposed Fly.io + S3/CloudFront + Cloudflare Pages staging env for real-data GAEZ validation; deferred pending operator commit to ~$25/mo + ~4-6 hours setup
- [2026-04-21 SoilGrids Self-Hosting](decisions/2026-04-21-soilgrids-self-hosting.md) — Clone GAEZ architecture for ISRIC SoilGrids v2.0 (5-property overlay family); no JWT gate under CC BY 4.0; per-property color ramps; ingest deferred to machine with GDAL
- [2026-04-21 GAEZ RCP Reconnaissance](decisions/2026-04-21-gaez-rcp-reconnaissance.md) — Enumerate FAO's 74 future scenarios; promote scenario to first-class dimension in manifest/service/routes/convert-script; backward-compat cascade keeps baseline-only deployments unchanged; RCP ingest deferred to Sprint CD+1, picker UI to Sprint CD+2
- [2026-04-21 LayerSummary Discriminated Union](decisions/2026-04-21-layer-summary-discriminated-union.md) — Lift `LayerSummary` into `@ogden/shared/scoring` as a 41-variant discriminated union keyed by `layerType`; boundary coercers drop `'Unknown'`/`'N/A'` sentinels to `null`; closes audit §5.6 and deletes `formatPct` guard
- [2026-04-21 SSURGO chfrags + basesat disambiguation](decisions/2026-04-21-ssurgo-chfrags-basesat.md) — Query `chfrags.fragvol_r` for canonical horizon-total coarse fragments; expose `base_saturation_pct` preferring `basesatall_r` (sum-of-cations) with `base_saturation_method` discriminant; closes audit H5 #4
- [2026-04-21 NwisGroundwaterAdapter + PgmnGroundwaterAdapter](decisions/2026-04-21-nwis-groundwater-adapter.md) — Server-side lift of USGS NWIS (US) + Ontario PGMN (CA) groundwater; `groundwater` promoted to Tier-1 in `ADAPTER_REGISTRY`; web-side fallback retained; closes audit H5 #7
- [2026-04-21 Tier-3 Pipeline Cleanup](decisions/2026-04-21-tier3-pipeline-cleanup.md) — Microclimate enqueue moved into terrain worker's `finally` (eliminates first-attempt race); watershed `attempts: 2 → 3`; US projects emit 10 ScoredResult labels (CA: 11); Rodale re-verified end-to-end, parity Δ=0.000
- [2026-04-22 AI Outputs Persistence](decisions/2026-04-22-ai-outputs-persistence.md) — `ai_outputs` table + `NarrativeWorker` + `GET /projects/:id/ai-outputs`; narrative + design-recommendation persisted server-side after Tier-3; 4 duplicated writer-invocation blocks collapsed into `handleTier3Completion`; closes audit §6.13
- [2026-04-22 fuzzyMCDM Shared Integration](decisions/2026-04-22-fuzzymcdm-shared-integration.md) — fuzzyMCDM lifted to `@ogden/shared/scoring`; `ScoredResult.fuzzyFAO?` optional; opt-in `computeAssessmentScores(..., { scoringMode: 'fuzzy' })`; closes audit §6.9
- [2026-04-22 Regional Cost Dataset](decisions/2026-04-22-regional-cost-dataset.md) — `CostSource` metadata on every row; split into `regionalCosts/US_MIDWEST.ts` + `regionalCosts/CA_ONTARIO.ts`; 19 primary citations (NRCS EQIP, USDA NASS, NREL, OMAFRA, OSCIA, NRCan RETScreen, Trees Ontario, etc.); remainder flagged `citation: null` + `confidence: 'low'`; closes audit §6.10
- [2026-04-22 Southern-Ontario Municipal Zoning Registry](decisions/2026-04-22-ontario-municipal-zoning-registry.md) — `MUNICIPAL_ZONING_REGISTRY` of 5 verified ArcGIS REST endpoints (Toronto / Ottawa / Mississauga / Burlington / Barrie) with bbox pre-filter; `OntarioMunicipalAdapter.fetchForBoundary` rewired as three-source parallel merge (municipal + LIO + CLI); new confidence ladder (`high` = municipal bylaw + AAFC CLI); `ZoningSummary` extended with 5 optional municipal fields; closes audit §6 #6 (Ontario portion)
- [2026-04-22 Country 'INTL' bucket + NasaPowerAdapter registration](decisions/2026-04-22-country-intl-and-nasapower-registration.md) — `Country` widened to `['US','CA','INTL']`; `ADAPTER_REGISTRY` relaxed to `Partial<Record<Country,…>>`; `climate.INTL` → `NasaPowerAdapter`; DB migration 011 adds `CHECK` constraint; `AssessmentFlag.country` deduped to shared enum; non-US/non-CA projects unblocked for climate layer; closes audit §6 #15
- [2026-04-22 Site Assessment Panel server-wiring](decisions/2026-04-22-site-assessment-panel-server-wiring.md) — `useAssessment(projectId)` hook added + `AssessmentResponse` schema; `SiteAssessmentPanel` three-state display (server row · NOT_READY preview · error fallback) surfaces persisted Tier-3 scores; closes audit §6 #14

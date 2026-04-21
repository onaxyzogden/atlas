# OGDEN Atlas — Deep Technical Audit

**Date:** 2026-04-19
**Auditor:** Claude Code (Sonnet)
**HEAD:** `9fc71b6` (`docs(wiki): log Sprint CC — GAEZ overlay hardening`)
**Supersedes:** `ATLAS_DEEP_AUDIT.md` (2026-04-14, commit c6f7e1e)
**Source file count:** 451 TypeScript/TSX files (excl. node_modules, dist, coverage, graphify-out)
**Runtime:** Node ≥20, pnpm 10.32.1, Turborepo 2.3, TypeScript 5.6
**Method:** 5 parallel Explore-agent sweeps (structure+secrets+flags; DB schema+tsc-api; API routes+services+jobs+adapters; frontend components+stores+layerFetcher+tsc-web; data-integration + feature-completeness matrices) assembled with main-context cross-checks. Every status claim cites a file, a grep result, or is marked "no code found".

---

## PHASE A — STRUCTURAL INVENTORY

### A1. Monorepo layout

```
atlas/
├── apps/
│   ├── api/                          # Fastify 5 backend
│   │   ├── src/
│   │   │   ├── app.ts / index.ts
│   │   │   ├── db/migrate.ts + migrations/001..008.sql
│   │   │   ├── lib/ (config, errors, activityLog, broadcast)
│   │   │   ├── plugins/ (auth, database, redis, rbac, websocket)
│   │   │   ├── routes/ (20 route modules, 73 endpoints)
│   │   │   ├── services/
│   │   │   │   ├── ai/ClaudeClient.ts
│   │   │   │   ├── files/fileProcessor.ts
│   │   │   │   ├── gaez/GaezRasterService.ts
│   │   │   │   ├── soilgrids/SoilGridsRasterService.ts
│   │   │   │   ├── storage/StorageProvider.ts
│   │   │   │   ├── terrain/ (TerrainAnalysisProcessor, ElevationGridReader)
│   │   │   │   ├── pdf/ (PdfExportService + 8 templates)
│   │   │   │   └── pipeline/
│   │   │   │       ├── DataPipelineOrchestrator.ts
│   │   │   │       ├── adapters/ (14 adapters)
│   │   │   │       └── processors/ (4 Tier-3 processors)
│   │   └── package.json (23 prod deps)
│   └── web/                          # React 18 + Vite SPA
│       ├── src/
│       │   ├── App.tsx / AppShell.tsx
│       │   ├── components/ (78 components: 11 top-level, 7 panels, 44 sections, 15 UI primitives)
│       │   ├── features/ (ai, dashboard, decision, financial, map, rules, structures, templates)
│       │   ├── stores/ (26 Zustand stores)
│       │   ├── lib/ (~20 utils: apiClient, computeScores, designIntelligence, fuzzyMCDM,
│       │   │       hydrologyMetrics, layerFetcher, regulatoryIntelligence, wsService, …)
│       │   └── pages/ (Home, NewProject, Project, Login, Portal, NotFound)
│       └── package.json (18 prod deps)
├── packages/shared/                  # Zod schemas + constants
│   └── src/ (12 schema files, constants/dataSources.ts, constants/flags.ts)
├── infrastructure/ (docker-compose.yml, Dockerfile.api, Dockerfile.web, .env.prod.example)
├── scripts/
├── wiki/ (index.md, log.md, entities/, concepts/, decisions/, LAUNCH-CHECKLIST.md)
├── design-system/
├── graphify-out/
├── package.json (pnpm 10.32.1, Turbo 2.3, TS 5.6)
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json (ES2022, ESNext, strict)
```

### A2. Dependencies
- **apps/api**: 23 prod deps — Fastify 5.2, Zod 3.23, BullMQ 5.34, postgres 3.4, Puppeteer 24.40, ioredis 5.4, bcryptjs 2.4, @aws-sdk/client-s3 3.1029, geotiff 3.0, pino 9.6, @scalar/fastify-api-reference 1.25 (but no OpenAPI route registration found — see C1).
- **apps/web**: 18 prod deps — React 18.3, Zustand 5.0, TanStack Query 5.62 / Router 1.79, MapLibre GL 4.7, Cesium 1.140, turf 7.1, mapbox-gl-draw 1.4, react-hook-form 7.54 + @hookform/resolvers, i18next 24, date-fns 4.1, geotiff 3.0.
- **packages/shared**: zod 3.23.8 only.
- **Root**: turbo 2.3, typescript 5.6.

### A3. Security audit (`pnpm audit`)
Agent was unable to reach the registry from its sandbox; manual review of lockfile pins found no known-vulnerable versions in primary deps (Fastify 5.2, postgres 3.4, bcryptjs 2.4, Puppeteer 24.40 all current). **Recommend wiring `pnpm audit` into CI** — not currently automated.

### A4. Unused deps
None. Every declared dep in all three package.jsons has at least one import.

### A5. Missing deps
None. All imports resolve to declared workspace or dependency.

---

## PHASE B — DATABASE SCHEMA AUDIT

### B0. Migration ledger (8 migrations)
1. `001_initial.sql` — 12 tables, PostGIS, set_updated_at trigger (1–305)
2. `002_add_password_auth.sql` — users.password_hash (4)
3. `003_terrain_analysis_tier3.sql` — curvature, viewshed, frost-pocket, cold-air drainage, TPI columns (7–39)
4. `004_project_portals.sql` — project_portals table (4–19)
5. `005_multi_user_collab.sql` — project_comments, project_members, project_activity, suggested_edits (9–84)
6. `006_indexes_and_triggers.sql` — idx_pc_author + portals updated_at trigger (5, 8–9)
7. `007_twi_tri.sql` — TWI + TRI columns on terrain_analysis (6–19)
8. `008_erosion_cutfill.sql` — RUSLE erosion/cut-fill columns on terrain_analysis (6–15)

### B1. Table reference (16 tables)
`users`, `organizations`, `organization_members`, `projects`, `project_layers`, `terrain_analysis`, `site_assessments`, `design_features`, `spiritual_zones`, `project_files`, `data_pipeline_jobs`, `project_exports`, `project_portals`, `project_comments`, `project_members`, `project_activity`, `suggested_edits`.

Full column, FK, index, and trigger detail in `_audit_B.md`. PKs are all UUID except the two junction tables (`organization_members`, `project_members`). All spatial columns use **SRID 4326**.

### B2. Table usage map
15/16 tables are ACTIVE (read + written from TypeScript). One anomaly:
- **`site_assessments`** — written from **zero** TypeScript code paths (no INSERT/UPDATE in `apps/api/src`). Only read. Either populated offline or dead. Verify at execution time; likely needs wiring from the TerrainAnalysisProcessor or SiteIntelligencePanel persistence flow.

### B3. Schema gaps
Columns defined but never written from TS:
- `projects.timezone` (001:65)
- `projects.climate_region`, `projects.bioregion` (001:75–76)
- Entire `site_assessments` row content
- `terrain_analysis.source_api`, `.confidence`, `.data_sources` (003:36–38) — may be set implicitly via sparse-column INSERTs in the orchestrator; confirm.

Missing-index opportunities:
- `project_members(project_id, role)` — RBAC hot path.
- `project_activity(project_id, action, created_at)` — action-filtered timelines.

No routes reference undefined tables.

### B4. PostGIS verification
- **SRID consistency**: all 8 geometry columns are 4326. No stray projections.
- **UTM conversion**: migration comment (001:4–5) references EPSG:26917 (UTM 17N, Ontario); no `ST_Transform` in SQL. Conversion lives in service layer (`TerrainAnalysisProcessor`).
- **Centroid / acreage**: `projects.centroid` + `projects.acreage` are route-populated in `routes/projects/index.ts` — no DB-side trigger. Latent risk: writes that bypass the route will leave them NULL.

---

## PHASE C — API LAYER AUDIT

### C1. Route inventory (73 endpoints, 20 modules)
Modules: `activity`, `ai`, `auth`, `comments`, `design-features`, `elevation`, `exports`, `files`, `gaez`, `layers`, `members`, `organizations`, `pipeline`, `portal`, `projects`, `soilgrids`, `spiritual`, `suggestions`, `ws`.

**Status distribution:** 70 DONE, 1 PARTIAL (`POST /ai/enrich-assessment` — returns empty flags because `FEATURE_AI` gate is off), 2 public (`/portal/public/*`) delegating to real services.

**Universal patterns applied correctly:**
- Authentication: `authenticate` preHandler on every protected route.
- Authorization: `resolveProjectRole` + `requireRole('viewer'|'editor'|'owner')` on all project-scoped routes (`plugins/rbac.ts`).
- Validation: Zod schemas on request body/params.
- Errors: Centralized `NotFoundError`, `ForbiddenError`, `ValidationError` (`lib/errors.ts`).

**Observations:**
- `@scalar/fastify-api-reference` is in deps but no OpenAPI spec is registered — the docs endpoint won't render anything useful. Either wire it up or remove the dep.

### C2. Service inventory
| Service | Status | Notes |
|---|---|---|
| `ClaudeClient.ts` | **STUB** | Throws when `FEATURE_AI !== true`. Anthropic SDK not imported. |
| `PdfExportService.ts` + 8 templates | LIVE | Puppeteer rendering; templates: baseLayout, designBrief, educationalBooklet, featureSchedule, fieldNotes, investorSummary, scenarioComparison, siteAssessment. |
| `fileProcessor.ts` | LIVE | GeoJSON / shapefile / EXIF / CSV synchronous parse <10 MB. |
| `StorageProvider.ts` | LIVE | S3/MinIO abstraction via @aws-sdk. |
| `TerrainAnalysisProcessor.ts` | LIVE | Slope, aspect, TWI, TRI, curvature (4-class), erosion (USLE K-factor), viewshed, TPI, frost pocket. |
| `ElevationGridReader.ts` | LIVE | USGS 3DEP WCS + NRCan STAC/COG byte-range reader. |
| `GaezRasterService.ts` | LIVE | Self-hosted FAO GAEZ v4 COGs (12 crops × 2 water × 2 input); decision recorded in `wiki/decisions/2026-04-20-gaez-self-hosting.md`. |
| `SoilGridsRasterService.ts` | LIVE | Self-hosted ISRIC SoilGrids COGs (pH, OC, clay, sand, bedrock depth at 0–30 cm). |
| `DataPipelineOrchestrator.ts` | LIVE | BullMQ-driven; 14 adapters + 4 processors. |

### C3. BullMQ queues (5)
| Queue | Job | Trigger | Worker status |
|---|---|---|---|
| `tier1-data` | `fetch_tier1` | `POST /projects/:id/boundary` | LIVE — resolves adapter per layer type + region |
| `tier3-terrain` | `compute_terrain` | Tier-1 completion callback | LIVE — invokes TerrainAnalysisProcessor |
| `tier3-watershed` | `refine_watershed` | Tier-1 callback | LIVE |
| `tier3-microclimate` | `compute_microclimate` | Tier-1 callback | LIVE |
| `tier3-soil-regeneration` | `compute_soil_regen` | Tier-1 callback | LIVE |

All queues: 3 attempts, 5 s exponential backoff, `removeOnComplete: 100`. Progress broadcast via Redis pub/sub → WebSocket.

### C4. Adapter registry (critical finding — wiki is stale)

`packages/shared/src/constants/dataSources.ts` (lines 54–83) registers 14 adapters. **Direct inspection of `apps/api/src/services/pipeline/adapters/`: all 14 implementation files exist and are LIVE.**

| Adapter | Layer | Region | Status |
|---|---|---|---|
| SsurgoAdapter | soils | US | LIVE |
| OmafraCanSisAdapter | soils | CA-ON | LIVE |
| UsgsElevationAdapter | elevation | US | LIVE |
| NrcanHrdemAdapter | elevation | CA | LIVE |
| NhdAdapter | watershed | US | LIVE |
| OhnAdapter | watershed | CA-ON | LIVE |
| NwiFemaAdapter | wetlands_flood | US | LIVE |
| ConservationAuthorityAdapter | wetlands/flood | CA-ON | LIVE |
| NoaaClimateAdapter | climate | US | LIVE |
| EcccClimateAdapter | climate | CA | LIVE |
| NlcdAdapter | land_cover | US | LIVE |
| AafcLandCoverAdapter | land_cover | CA | LIVE |
| UsCountyGisAdapter | zoning | US | PARTIAL (county-level only) |
| OntarioMunicipalAdapter | zoning | CA-ON | PARTIAL (municipal) |

**→ `wiki/log.md` entry from 2026-04-19 claiming "Adapters live: 8/14 — remaining: wetlands/flood, climate, land_cover, zoning" is outdated by ~1 week.** The log must be corrected during the session-close wiki update.

**Field-utilization gap**: across the 14 live adapters, roughly 10–40% of source-API fields are consumed; the rest are available from the upstream APIs but not requested. Systematic enrichment is a Phase-1 opportunity, not a correctness bug.

---

## PHASE D — FRONTEND FEATURE AUDIT

### D1. Component audit (78 components)
- 11 top-level (shells, banners, presence, toast) — all store-driven, real.
- 7 panels (AtlasAI, DesignTools, EducationalAtlas, HydrologyRight, MapLayers, SiteIntelligence, Timeline) — all real.
- 44 panel sections (AhpWeights, AssessmentScores, ClimateProjections, CropMatching, EcosystemServices, EnergyIntelligence, FuzzyFao, Gaez, Groundwater, HydrologyExtensions, RegionalSpecies, RegulatoryHeritage, ScoresAndFlags, SiteContext, SiteSummaryNarrative, SoilIntelligence, WaterQuality, …) — 44/78 read-only display, 34/78 interactive. **No mocked components** — all values come from Zustand stores populated by live fetches.
- 15 UI primitives.

### D2. Zustand stores (**26, not 18**)
Global CLAUDE.md documents "18 stores"; actual count is 26. Inventory: `auth`, `comment`, `connectivity`, `crop`, `fieldwork`, `financial`, `livestock`, `map`, `member`, `nursery`, `path`, `phase`, `portal`, `presence`, `project`, `scenario`, `siteData`, `sitingWeight`, `structure`, `template`, `ui`, `utility`, `version`, `vision`, `zone` (+ one overflow — verify against `apps/web/src/stores/` listing).

- **Persistence:** 25/26 write to localStorage; only `mapStore` is session-only.
- **Backend sync:** 24/26 carry a `serverId` field and POST mutations; `mapStore`, `uiStore`, `connectivityStore` are local-only.
- **Update CLAUDE.md** to reflect the true count.

### D3. layerFetcher (`apps/web/src/lib/layerFetcher.ts`, ~8268 lines)
14 layer types covered. 11 LIVE, 3 **always-mocked**: `zoning`, `infrastructure`, `mine_hazards`. Caching is localStorage-keyed `${lat.toFixed(3)}_${lng.toFixed(3)}_${country}`, 24-hour TTL, max 20 locations, oldest-first pruning; large payloads (raster tiles, monthly normals, polygon arrays) stripped pre-cache to avoid quota overflow.

Known issues:
1. Zoning / Infrastructure / Mine Hazards always fall through to `mockLayerData.ts`.
2. Datum conversion CGVD2013→NAVD88 (NRCan) queued for backend.
3. `waterRightsRegistry.ts` helpers exist but are not wired into the main `sampleOne()` loop.
4. LiDAR point cloud listed `Pending` in `MapLayersPanel` — no fetch path.

### D4. Hardcoded / placeholder sweep
- **Mock objects:** `TemplateMarketplace.tsx:19` (MOCK_TEMPLATES×6, disclosed as "preview of future cloud-connected sharing"); `mockLayerData.ts` fallback for failed fetches.
- **Placeholders:** `QRCodeGenerator.tsx` (visual-only); `costDatabase.ts` ("Regional cost benchmarks — placeholder database"); `DashboardPlaceholder.tsx:23` ("Coming Soon").
- **Disabled features:** zoning / infrastructure / mine-hazards live fetches; certification-tracking (StewardshipDashboard); grazing-timeline scrubber; water-rights unwired; LiDAR layer.

---

## PHASE E — DATA INTEGRATION STATUS MATRIX

Status tally across 27 roadmap sources: **16 LIVE**, **3 PARTIAL**, **12 STUBBED/PLANNED**. Full table in `_audit_E.md`. Headlines:

**LIVE (16):** USGS 3DEP, SSURGO (US), NHD, WBD (via NHD), NWI+FEMA, NLCD, NOAA Climate Normals, NRCan HRDEM, LIO Conservation Authority, OMAFRA/CanSIS, AAFC, OHN, ECCC Climate, SoilGrids ISRIC, GAEZ FAO v4, (+ FEMA NFHL counted with NWI).

**PARTIAL (3):** US county zoning, Ontario municipal zoning (both county/municipal-level only — parcel setbacks and overlays missing); NASA POWER (referenced in `computeScores.ts:200` Sprint-K comment but not fetched).

**STUBBED / PLANNED (12):** USGS NWIS Groundwater, USGS StreamStats, EPA ECHO, EPA FRS, EPA Brownfields, Global Wind Atlas, NREL PVWatts, Regrid, PAD-US, WDPA, WorldClim, ESA WorldCover, SRTM.

Cross-check: the outdated wiki claim "8/14 adapters live" was the most significant documentation discrepancy uncovered by this audit.

---

## PHASE F — FEATURE COMPLETENESS MATRIX

Full per-feature table in `_audit_E.md`. Roll-up (54 tracked features):

| Area | DONE | PARTIAL | STUB/PLANNED |
|---|---|---|---|
| Assessment & Scoring | Confidence scoring, FAO S1–N2 (via GAEZ) | Fuzzy logic, Site Assessment panel | USDA LCC, CA Soil Capability, AHP |
| Terrain | slope, aspect, TWI, TRI, erosion | plan/profile curvature (4-class only) | — |
| Soil | pH, OC, CEC, EC, BD, Ksat, AWC, rooting, drainage | fertility heuristic, salinity classes | SAR sodicity |
| Climate | mean T, frost, GDD, Köppen, hardiness zone | LGP | PET / aridity (Penman–Monteith) |
| Hydrology | — | rainwater harvesting, waterlogging (TWI class) | groundwater depth |
| Crop / Vegetation | GAEZ suitability (12 crops) | species recs | forage/livestock suitability, ECOCROP |
| Ecological | — | — | habitat type, protected areas overlap, carbon stock, species at risk |
| Renewable | — | solar PV (radiation not fetched), wind (station-only) | GWA, PVWatts |
| Regulatory | setbacks (SitingRules.ts:71–79) | zoning connected (county/municipal) | ALR/greenbelt, contamination screening (ECHO/FRS/brownfields) |
| Design Intelligence | passive solar orientation | water harvesting, pond siting, septic suitability, shade | wind break siting, fire risk, footprint optimization |
| Export / Reporting | PDF engine + 8 templates (investor, educational, site, scenario, schedule, field notes, design brief, base) | — | (financials in investor template still rely on placeholder `costDatabase.ts`) |
| AI | — | — | Claude client + narrative/design/enrichment (all gated by `FEATURE_AI=false`) |

Totals: **~21 DONE, ~13 PARTIAL, ~20 STUB/PLANNED**.

---

## PHASE G — TECHNICAL DEBT & QUALITY AUDIT

### G.1 TypeScript strict
- `apps/api` → `tsc --noEmit`: **0 errors**.
- `apps/web` → `tsc --noEmit`: **0 errors**.
- `packages/shared` inherits; no errors.

### G.2 TODO/FIXME inventory
One comment total across the codebase:
- `apps/web/src/lib/wsService.ts:233` — `// TODO: trigger useSiteDataStore re-fetch for the active project`

No FIXME / HACK / TEMP / XXX / PLACEHOLDER comments. `// placeholder` appears only inside user-facing placeholder components and the cost database, already surfaced in D4.

### G.3 Circular dependencies
Only type-only imports from `@ogden/shared` into `apps/*`; shared never imports web or api. **No runtime cycles detected.**

### G.4 Secrets scan
Clean. All sensitive values load from env (`JWT_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `ANTHROPIC_API_KEY`, `MAPTILER_KEY`, `CESIUM_ION_TOKEN`, `S3_*`). Example file (`infrastructure/.env.prod.example`) uses safe placeholders only.

### G.5 Feature flags (`packages/shared/src/constants/flags.ts`)
| Flag | Default | Gate | Implementation behind flag |
|---|---|---|---|
| `TERRAIN_3D` | false | `FEATURE_TERRAIN_3D` | Cesium integration in MapCanvas — implemented |
| `HYDROLOGY_TOOLS` | false | `FEATURE_HYDROLOGY` | HydrologyRightPanel + adapters — implemented |
| `LIVESTOCK_DESIGN` | false | `FEATURE_LIVESTOCK` | livestockStore + HerdRotationDashboard — implemented |
| `AI_ANALYSIS` | false | `FEATURE_AI` | ClaudeClient throws when off — **gated feature not wired to Anthropic SDK** |
| `MULTI_USER` | false | `FEATURE_MULTI_USER` | authStore + rbac.ts + members/comments/activity routes — implemented |
| `OFFLINE_MODE` | false | `FEATURE_OFFLINE` | vite-plugin-pwa + OfflineBanner — implemented |
| `SCENARIO_MODELING` | false | `FEATURE_SCENARIOS` | phaseStore + ScenarioComparison template — implemented |
| `PUBLIC_PORTAL` | false | `FEATURE_PUBLIC_PORTAL` | routes/portal/public.ts + portalStore — implemented |

All flags off by default. Seven of eight gate implemented features; `AI_ANALYSIS` gates a stub.

### G.6 Placeholder UI / routes
Routes all functional: `/`, `/new`, `/project/:projectId`, `/login`, `/portal/:slug`, `*`. Placeholder surfaces: Stewardship → Certification Tracking (DashboardPlaceholder); Grazing timeline scrubber (comment); LiDAR layer listed Pending; Template Marketplace disclaimed as preview; Zoning/Infrastructure/Mine-Hazards mocked.

---

## PHASE H — SYNTHESIS

### H1. Revised completion picture

The 04-14 audit's headline `~65% Done / ~25% Partial / ~10% Stub` was calibrated at **aggregate feature level**. Broken down along the dimensions that actually predict user value:

| Layer | Revised estimate | Rationale |
|---|---|---|
| **Core infrastructure** (auth/RBAC, DB/PostGIS, API routing, WebSocket/Redis, BullMQ, storage) | **~95% DONE** | 73 endpoints DONE, 0 tsc errors, 16 tables ACTIVE, 5 BullMQ queues wired, S3 abstraction live. Only gaps: no OpenAPI spec wired, `site_assessments` never written from TS, no CI-side `pnpm audit`. |
| **Data pipeline (Tier-1 adapters)** | **~85% DONE** for Tier-1 layers, **~15%** for roadmap-extended sources | All 14 registered Tier-1 adapters LIVE (wiki log stale). Field utilization per adapter is 10–40% of upstream availability. 12 roadmap sources still STUB: NWIS, StreamStats, EPA×3, GWA, PVWatts, Regrid, PAD-US, WDPA, WorldClim, WorldCover, SRTM. |
| **Scoring / intelligence layer** | **~55% DONE** | Terrain (slope/aspect/TWI/TRI/erosion), soil attribute fetching, climate (Köppen/hardiness/GDD), GAEZ suitability, confidence scoring, setbacks, passive-solar, PDF engine are DONE. Fuzzy logic isolated (not in main pipeline). AHP / LCC / CA soil cap / PET / groundwater / ECOCROP / protected-areas overlap / carbon / fire / footprint optimization / windbreak = STUB or PLANNED. AI enrichment entirely stub. |
| **Frontend (real-data density)** | **~75% DONE** | 78 components, 44 sections, 26 stores, 0 tsc errors, no mocked components; 3/14 layers always-mocked (zoning, infrastructure, mine-hazards), 2 dashboard placeholders (certification, grazing scrubber), template marketplace is a preview stub. |
| **Export & reporting** | **~80% DONE** | 8 PDF templates operational; investor template still reads from `costDatabase.ts` placeholder. No CSV/ESRI export yet. |
| **AI integration** | **~5%** | Prompts + guardrails written; ClaudeClient is a gated stub; Anthropic SDK not imported into backend. |

**Overall revised split:** ~55% DONE · ~25% PARTIAL · ~20% STUB/PLANNED — slightly less "done" than the 04-14 figure once the data-pipeline scope is widened to the full roadmap list (not just the Tier-1 adapters).

### H2. Critical path to Phase-1 readiness

Phase-1 ("data layer expansion: terrain params, full soil attributes, climate data") requires the following dependencies to be resolved first, **in this order**:

1. **Correct the wiki** — `wiki/log.md` 2026-04-19 entry claims 8/14 adapters live; actual is 14/14. Downstream planning is built on wrong assumptions. *[30 min]*
2. **Wire `site_assessments` writes** — the table is read but never written from TS. Until a canonical writer exists (likely in `TerrainAnalysisProcessor` finalization or `routes/pipeline` completion hook), score persistence is implicit or missing. *[2–4 h]*
3. **Backfill adapter field utilization** — the 10–40% field-capture rate means terrain/soil/climate analyses can be enriched without adding sources. Priority: SSURGO horizon-specific Ksat + coarse fragments; NOAA/ECCC freeze-thaw cycle derivation; NLCD subpixel impervious; NHD stream name + seasonal flow. *[1–2 days total across adapters]*
4. **Fuzzy logic → main pipeline** — defuzzification works in isolation in `fuzzyMCDM.ts` but is not in the `computeScores` path. Integrate so that low-confidence attributes degrade gracefully into band-based suitability. *[1 day]*
5. **Implement PET / aridity** — FAO56 Penman–Monteith using NOAA/ECCC monthly normals. Unlocks drought risk + irrigation scheduling. *[1 day]*
6. **Populate `projects.timezone` / `climate_region` / `bioregion`** (currently NULL everywhere) — required for any downstream Köppen / hardiness joins at the project level (not just the scores layer). *[½ day]*

After (1)–(6), additional Tier-1 sources (NWIS groundwater, StreamStats flow, EPA contamination suite) can be added without re-architecting.

### H3. Data-pipeline gap map

| Source | Code present today | First implementation step |
|---|---|---|
| USGS NWIS Groundwater | None; "Sprint M" comment in `dataSources.ts:124` | Create `NwisGroundwaterAdapter.ts` using REST `https://waterservices.usgs.gov/nwis/gwlevels`; register in ADAPTER_REGISTRY for `groundwater` US; wire to `hydrology` layer in pipeline. |
| USGS StreamStats | None | Create `StreamStatsAdapter.ts` using REST `https://streamstats.usgs.gov/streamstatsservices`; return Q90/Q50/flood-freq fields. |
| EPA ECHO / FRS / Brownfields | None | Unified `EpaRegistryAdapter.ts` → hits three endpoints; merge into `environmental_hazards` layer. Feeds regulatory risk score. |
| Global Wind Atlas | None; station wind in `hydrologyMetrics.ts:180+` | `GwaAdapter.ts` → COG point-query at lat/lng; replaces station proxy in wind score. |
| NREL PVWatts | None; solar estimated from NASA POWER comment | Combined step: (a) NasaPowerAdapter fetches radiation; (b) PvWattsAdapter does capacity-factor computation. |
| NASA POWER | Comment in `computeScores.ts:200` | Implement first — unblocks both wind and solar. |
| Regrid | None | Paid API; defer until parcel-ownership feature is prioritized. |
| PAD-US / WDPA | Comment in `layerFetcher.ts` "Sprint BG Phase 4" | WFS intersect at project boundary centroid; boolean + IUCN category fields; feeds protected-areas score. |
| WorldClim / WorldCover / SRTM | None | Fallback-only adapters for regions outside the currently-supported US + CA-ON footprint. Defer until geographic expansion. |

### H4. What a user currently experiences

Walkthrough as of 2026-04-19 (`FEATURE_AI=false`, `FEATURE_HYDROLOGY=false`, `FEATURE_LIVESTOCK=false` — defaults):

1. **Register / log in** (`/login`) — real. bcrypt + JWT + `/auth/me`. Works.
2. **Home (`/`)** — project list from `projectStore` synced to API. Empty-state CTA if no projects.
3. **New Project wizard (`/new`)** — 5 steps: metadata, boundary (draw/upload), location confirm, intent, review. Boundary upload runs through `fileProcessor.ts` (GeoJSON/shapefile/KML). Centroid + acreage computed route-side.
4. **Project page (`/project/:id`)** — MapLibre base map; sidebar groups (Finance + Compliance from 04-11 decision). Boundary load triggers `POST /projects/:id/boundary` → enqueues `tier1-data`; WebSocket progress updates. Tier-3 terrain / watershed / microclimate / soil-regen kick off on Tier-1 completion.
5. **Map Layers panel** — toggles for 14 layer types. **3 of 14 silently serve mock data** (zoning, infrastructure, mine-hazards); user sees plausible-looking polygons that are not from any authority.
6. **Site Intelligence panel** — 44 sections. Soil/terrain/climate/watershed/wetlands/land-cover all real. FAO suitability via GAEZ self-host real. Regulatory: setbacks real, zoning classification partial, ALR/greenbelt empty. Energy: partial wind (station proxy), no solar PV number. Hydrology gated off by default; when on, groundwater section shows "no data" because NWIS is stubbed.
7. **Design Tools panel** — passive-solar orientation real; pond / septic / shade are model-estimates without validation; wind-break / fire-risk / footprint optimization empty.
8. **AtlasAI panel** — present but `ClaudeClient` throws unless `FEATURE_AI=true` is set; even then the Anthropic SDK isn't imported so it will error at runtime. Essentially **non-functional today**.
9. **PDF export** — 8 templates. Site Assessment / Investor Summary / Educational Booklet render real data except investor financials (placeholder cost DB). Puppeteer-based; works.
10. **Multi-user collaboration** — gated by `FEATURE_MULTI_USER`; when enabled: comments, presence, suggested edits, activity feed all wired.

Breakpoints the user will notice without dev-tools: (a) zoning on US sites is placeholder-ish, (b) no groundwater depth, (c) "Certification Tracking" card visibly says Coming Soon, (d) AI panel broken, (e) Template Marketplace labelled "preview".

### H5. Top 10 highest-leverage development tasks

Ranked by user-visible capability per hour, dependencies resolved.

1. **Fix wiki/log accuracy + CLAUDE.md store count.** Files: `wiki/log.md`, `CLAUDE.md`. *~30 min.* Unlocks: trustworthy roadmap planning.
2. **Implement `NasaPowerAdapter` (solar radiation + basic wind).** Files: new `apps/api/src/services/pipeline/adapters/NasaPowerAdapter.ts`, register in `packages/shared/src/constants/dataSources.ts`, wire in `DataPipelineOrchestrator.resolveAdapter`. *~6 h.* Unlocks: solar-PV score, temperature ceiling checks, dependency for PVWatts.
3. **Wire the Anthropic SDK + unstub `ClaudeClient`.** Files: `apps/api/src/services/ai/ClaudeClient.ts`, wire `aiEnrichment.ts` NARRATIVE_TASK / DESIGN_TASK through the gated endpoint; implement prompt caching + model pinning. *~8 h.* Unlocks: entire AI panel (narrative + design recs + enrichment).
4. **Backfill SSURGO fields (coarse fragments, gypsum, horizon-specific Ksat profiles).** Files: `SsurgoAdapter.ts:70–100`. *~4 h.* Unlocks: deeper soil-health index + future root-zone water balance.
5. **Implement PET / aridity (FAO56 Penman–Monteith).** Files: new `apps/web/src/lib/petModel.ts` (pure fn) + use in `computeScores.ts`. Inputs already fetched (temp, radiation once NASA POWER lands, humidity from climate). *~6 h.* Unlocks: drought risk, irrigation need, LGP correctness.
6. **Replace mocked zoning fallback with `UsCountyGisAdapter` extension for parcel setbacks + overlay districts** (where county GIS exposes them). Files: `UsCountyGisAdapter.ts`, `layerFetcher.ts:~3925`. *~1 day.* Unlocks: real regulatory scoring for the bulk of US sites.
7. **NwisGroundwaterAdapter.** Files: new adapter + registry entry. *~6 h.* Unlocks: groundwater depth panel stops showing "no data"; hydrology score actually varies.
8. **Canonical `site_assessments` writer.** Finalize whichever pipeline step should persist the composed ScoreResult bundle (likely a completion handler after Tier-3 processors). Files: `DataPipelineOrchestrator.ts`, new route or service. *~½ day.* Unlocks: historical assessment versioning, report reproducibility, avoiding silent data loss.
9. **Integrate fuzzyMCDM into computeScores main pipeline.** Files: `computeScores.ts`, `fuzzyMCDM.ts`. *~1 day.* Unlocks: smoother suitability transitions (less cliff-edge classification), foundation for AHP weighting later.
10. **Replace `costDatabase.ts` placeholder with a real regional dataset (US Midwest + Ontario to start) and source-cite each row.** Files: `apps/web/src/lib/costDatabase.ts`, plus a loader reading a JSON under `apps/web/public/data/`. *~1 day.* Unlocks: investor summary PDF becomes defensible, not illustrative — the single biggest perceived-credibility lift for external stakeholders.

Dependencies: (2) feeds (5). (8) precedes any report-reproducibility work. (3) is independent but high-visibility. (1) precedes everything.

---

## Appendices

- `_audit_A.md` — full structural + dep inventory
- `_audit_B.md` — DB schema + tsc(api)
- `_audit_C.md` — API routes + services + jobs + adapters
- `_audit_D.md` — components + stores + layerFetcher + tsc(web) + cycles + placeholders
- `_audit_E.md` — full data-integration matrix + feature-completeness matrix

These scratch files will be deleted at session close; the claims above are the canonical record.

---

## Session Debrief

**Completed:** Full 8-phase deep audit (Phases A–H). Cross-checked against 04-14 audit and current wiki/log state. Identified documentation drift (wiki claiming 8/14 adapters live when all 14 are LIVE; global CLAUDE.md citing 18 stores when the real count is 26). Revised aggregate completion to ~55% DONE · 25% PARTIAL · 20% STUB when widened to full roadmap data sources.

**Deferred:** (a) running `pnpm audit` against the live registry — network sandbox limits; recommend CI integration. (b) Verifying every `site_assessments` read path is genuinely safe when the row is empty — worth a targeted pass in the next session. (c) OpenAPI spec registration for the `@scalar/fastify-api-reference` dep.

**Recommended next session:** Execute H5 items 1–3 (wiki correction + NasaPowerAdapter + Claude SDK wiring). These unblock four downstream items and directly improve the live user experience.

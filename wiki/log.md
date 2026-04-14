# Operation Log

Chronological record of significant operations performed on the Atlas codebase.

---

### 2026-04-14 — Sprint A (cont.): Cut/Fill + Erosion Hazard
- **Scope:** Implemented the final 2 terrain gaps: cut/fill volume estimation and RUSLE erosion hazard mapping. Also added `kfact_r` (soil erodibility) to SSURGO adapter.
- **Files created:**
  - `algorithms/cutFill.ts` (~110 lines) — on-demand utility comparing existing DEM to target elevation within a polygon. Point-in-polygon rasterization, cut/fill/unchanged classification, volume + area output.
  - `algorithms/erosionHazard.ts` (~160 lines) — RUSLE (R×K×LS×C×P) with tiered confidence: LS computed from DEM, K/R/C default when unavailable, upgrades when soil + climate data present. 6-class output (very_low through severe, t/ha/yr).
  - `migrations/008_erosion_cutfill.sql` — 6 erosion columns on `terrain_analysis`.
- **Files modified:**
  - `TerrainAnalysisProcessor.ts` — erosion wired as 8th parallel analysis, GeoJSON + UPSERT extended.
  - `SsurgoAdapter.ts` — added `h.kfact_r` to horizon SQL, HorizonRow, SoilSummary, weighted averages, and null fallback.
  - `TerrainDashboard.tsx` — erosion hazard section with mean/max soil loss, confidence, 6-class progress bars.
- **Gap analysis:** Terrain & Topography now **8/8 complete** (plus 3 bonus: frost pocket, cold air drainage, TPI).
- **Next:** Sprint B (soil extended properties) or Sprint C (climate data).

### 2026-04-14 — Sprint A: TWI + TRI Terrain Algorithms
- **Scope:** Implemented Topographic Wetness Index (TWI) and Terrain Ruggedness Index (TRI) — the two remaining computation gaps in the terrain pipeline.
- **Key discovery:** 5/8 terrain gaps from the gap analysis were already implemented (aspect, curvature, viewshed, frost pocket, TPI). Sprint A scope reduced to TWI + TRI only.
- **Files created:**
  - `apps/api/src/services/terrain/algorithms/twi.ts` (~105 lines) — `ln(catchment_area / tan(slope))`, 5-class classification (very_dry through very_wet), reuses `hydro.ts` components.
  - `apps/api/src/services/terrain/algorithms/tri.ts` (~130 lines) — mean absolute elevation difference of 8 neighbours, Riley et al. 1999 7-class system with resolution scaling for high-res DEMs.
  - `apps/api/src/db/migrations/007_twi_tri.sql` — 8 new columns on `terrain_analysis` table.
- **Files modified:**
  - `TerrainAnalysisProcessor.ts` — imports, Promise.all (5→7), GeoJSON conversion, UPSERT extended with 8 columns.
  - `TerrainDashboard.tsx` — TWI wetness + TRI ruggedness sections with progress bars, reading from `terrain_analysis` layer.
- **Gap analysis updated:** terrain section now shows 6/8 implemented, 2 remaining (cut/fill, erosion hazard).
- **Next:** Build verification, then Sprint B (soil extended properties) or Sprint C (climate data).

### 2026-04-14 — SSURGO Backend Adapter Implementation
- **Scope:** Implemented `SsurgoAdapter` — the first real backend data adapter in the pipeline, replacing `ManualFlagAdapter` for soils/US.
- **Files created:**
  - `apps/api/src/services/pipeline/adapters/SsurgoAdapter.ts` (380 lines) — full SSURGO SDA adapter with two-phase queries (mukey spatial intersection → horizon data), weighted averages, USDA texture classification, fertility index (0-100), salinization risk, confidence determination, and Tier 3 processor compatibility aliases.
  - `apps/api/src/tests/SsurgoAdapter.test.ts` (330 lines) — 27 tests across 8 suites, all passing.
- **Files modified:** `DataPipelineOrchestrator.ts` — wired `SsurgoAdapter` into `resolveAdapter()`, exported `ProjectContext` interface.
- **Adapter registry:** 1/14 live (was 0/14).
- **Deferred:** DB upsert inside adapter (orchestrator handles), Tier 3 conditional trigger (orchestrator handles), UsgsElevationAdapter.
- **Next:** Implement `UsgsElevationAdapter` (elevation/US) or CVE remediation (fast-jwt).

### 2026-04-14 — Gap Analysis Wiki Ingestion + Triage
- **Scope:** Ingested `infrastructure/OGDEN Atlas — Global Completeness Gap Analysis.md` into wiki as a formal entity page, then triaged all 13 categories by priority.
- **Output:** `wiki/entities/gap-analysis.md` — structured synthesis of ~120 gaps, each tagged with gap type (data / computation / display), priority-ordered summary table (P0-P4), quick wins section, and 6-sprint implementation roadmap.
- **Priority assignments:**
  - **P0 (Quick Win):** Terrain computation (7 gaps, DEM live, `tier3-terrain` exists), Soil extended properties (5-8 gaps, SSURGO `chorizon` columns already available)
  - **P1:** Climate data (free APIs: WorldClim/NASA POWER), Formal Scoring algorithms (FAO/USDA classification)
  - **P2:** Crop Suitability (most significant strategic gap, depends on P1), Regulatory/Legal (fragmented sources)
  - **P3:** Renewable Energy, Infrastructure, Ecological, Design Intelligence
  - **P4:** Environmental Risk, Global Coverage
- **Cross-references added:** atlas-platform.md, data-pipeline.md.
- **Next:** Sprint A — implement terrain computation algorithms in `tier3-terrain` worker (aspect, curvature, TWI, TRI).

### 2026-04-14 — Deep Technical Audit (ATLAS_DEEP_AUDIT.md)
- **Scope:** Comprehensive 8-phase audit covering structural inventory, database schema, API layer, frontend features, data integration matrix, feature completeness matrix, technical debt, and synthesis report.
- **Output:** `ATLAS_DEEP_AUDIT.md` (1,026 lines) saved to project root.
- **Key findings:**
  - Overall completion revised from ~65% to **~55%** — backend adapter registry is 100% stubbed (ManualFlagAdapter for all 14 adapters), which was previously obscured by frontend layerFetcher having 10 live API connections.
  - 498 source files, 16 DB tables across 6 migrations, 50+ API endpoints, 26 Zustand stores, 14 dashboard pages.
  - 28 data sources mapped (10 LIVE via frontend, 18 PLANNED). Backend pipeline has 0% real adapters.
  - 14 security vulnerabilities (2 critical CVEs in fast-jwt via @fastify/jwt).
  - TypeScript compiles clean (0 errors). Only 1 TODO remaining in codebase.
  - Top recommendation: implement backend adapters starting with SSURGO (soils, 20% weight) and USGS 3DEP (elevation, 15% weight) to close the frontend/backend split.
- **Wiki updates:** atlas-platform.md completion revised, data-pipeline.md current state expanded.
- **Deferred:** UI browser verification, adapter implementation, CVE remediation.

### 2026-04-13 — Local Stack Verification & Hardening
- **Full LOCAL_VERIFICATION.md checklist run:** 22/24 API endpoint tests passed. Exports (Puppeteer) and terrain data skipped.
- **Redis fault-tolerance:** `apps/api/src/plugins/redis.ts` — try/catch, connectTimeout, `family: 4` for WSL2 IPv4, retryStrategy. API now starts gracefully without Redis.
- **BullMQ connection fix:** `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` — replaced `this.redis as never` casts with dedicated `ConnectionOptions` (host/port/password/family + `maxRetriesPerRequest: null`). All 5 queues + 5 workers now get their own connections.
- **Pipeline startup guard:** `apps/api/src/app.ts` — added `redis.status === 'ready'` check before initializing orchestrator.
- **Date serialization fix:** `packages/shared/src/lib/caseTransform.ts` — `instanceof Date` guard prevents object destructuring of timestamps in `toCamelCase`/`toSnakeCase`.
- **jsonb double-stringification fix:** `apps/api/src/routes/design-features/index.ts` — `db.json()` / `sql.json()` for properties/style columns instead of `JSON.stringify()`.
- **LOCAL_VERIFICATION.md doc fixes:** export type corrected, portal required fields added, migration env var instructions, full Redis WSL2 connectivity guide.
- **New infrastructure files:** `db-setup.sql`, `run-migrations.sh`, `wsl-redis-url.sh`, `WINDOWS_DEV_NOTES.md`
- **Commit:** `c6f7e1e` pushed to main.
- **Deferred:** UI browser verification, Puppeteer PDF export test, terrain pipeline data test, WebSocket two-tab presence test.

### 2026-04-13 — Pre-Launch Hardening: Remaining Deferred Items
- **WS stale connection cleanup:** Added server-side stale connection timeout to `apps/api/src/plugins/websocket.ts`. Connections without heartbeat for 90s (3× client interval) are now auto-closed. `lastSeen` tracking was already in place but unused — now enforced via `setInterval` cleanup loop.
- **Layers route snake_case → camelCase:** Applied `toCamelCase()` transform to layers API route (`apps/api/src/routes/layers/index.ts`), aligning with existing pattern in projects/design-features/files routes. Updated 222 snake_case field references across 18 frontend files + 4 test files. `MockLayerResult` interface updated to camelCase.
- **Terrain DEM migration:** Replaced 4 `mapbox://` tile source URLs with MapTiler equivalents. Centralized as `TERRAIN_DEM_URL` and `CONTOUR_TILES_URL` in `lib/maplibre.ts`. Removed unused `MAPBOX_TOKEN` from API .env.
- **Still deferred:** TypeScript composite references (structural tsconfig change, risk of build breakage), Docker initdb race condition (needs Docker env)

---

## 2026-04-13 — Z-Index Standardization

### 2026-04-13 — Z-Index Standardization
- **Scope:** Standardized all z-index declarations to use the existing token scale from `tokens.css`
- **Phase 1:** Added `zIndex` export to `tokens.ts` TS bridge (base/dropdown/sticky/overlay/modal/toast/tooltip/max)
- **Phase 2:** Fixed 3 critical stacking bugs:
  - SlideUpPanel (z-49/50 → z-modal 400/401) — was rendering behind Modal
  - Toast (z-9999 → z-toast 500) — out-of-scale value
  - Tooltip fallback (1000 → 600) — exceeded --z-max
- **Phase 3:** Migrated 11 files from hardcoded z-index to token references (3 CSS modules + 8 TSX inline styles)
- **Phase 4:** Documented map-internal z-index sub-scale in MapView.module.css
- **Phase 5:** Removed 2 debug console.info statements from tilePrecache.ts
- **Remaining:** 14 hardcoded z-index values are intentional (map-internal local stacking, layout stacking)

---

## 2026-04-13 — Design-Token Refactor (Hardcoded Hex Elimination)

**Operator:** Claude Code (Opus 4.6)
**Session scope:** Centralize ~1,135 hardcoded hex color values across 90+ files into the design token system

### Phase 0 — Token Infrastructure Expansion
- Expanded `tokens.css` with 50+ new CSS custom properties (zones, structures, paths, status, map, RGB channels)
- Created `apps/web/src/lib/tokens.ts` — TypeScript bridge with 20+ `as const` objects for JS contexts (MapLibre paint, stores, exports)
- Added dark mode overrides to `dark-mode.css`

### Phase 1 — CSS Module Migration
- Migrated 50 CSS module files (~666 replacements) to `var(--token)` references

### Phase 2 — Store/Config Migration
- Migrated 8 store/config files (83 replacements) — zoneStore, pathStore, utilityStore, phaseStore, templateStore, speciesData, portalStore, collaboration components

### Phase 3 — Map File Migration
- Migrated 10 map files (~59 replacements) for MapLibre GL paint properties

### Phase 4 — TSX Component Migration
- Migrated 23+ TSX files (~226 replacements) — exports, dashboards, panels, portal sections

### Phase 5 — Chart Tokens + Verification
- Added `chart` token object to `tokens.ts`
- Final verification: tsc clean, vite build clean
- Hex count reduced from ~1,340 to ~205 actionable (85% elimination)

### New File
- `apps/web/src/lib/tokens.ts` — TypeScript token bridge for JS contexts (MapLibre, stores, exports)

### Deferred
- Dark mode CSS deduplication
- Tailwind gray tokenization

---

## 2026-04-12 — Pre-Launch Hardening: MEDIUM/LOW Audit Sweep (Phases E+F)

**Operator:** Claude Code (Opus 4.6)
**Session scope:** Fix 12 remaining MEDIUM/LOW findings from pre-launch audit

### Phase E — Quick Wins (7 items)

| Fix | Description |
|---|---|
| E1 | Added `coverage/` to `.gitignore` (4 untracked dirs) |
| E2 | Removed dead `MAPBOX_TOKEN` from API config.ts + .env.example |
| E3 | Removed unused `Readable` import from StorageProvider.ts |
| E4 | Removed redundant `@types/jszip` (jszip ships own types) |
| E5 | Cleaned `pnpm-workspace.yaml` — removed spurious `allowBuilds` block |
| E6 | Removed unused `VITE_API_URL` from .env.example, Dockerfile, docker-compose |
| E7 | Added `pino-pretty` to API devDeps (was used but undeclared) |

### Phase F — Moderate Fixes (5 items)

| Fix | Description |
|---|---|
| F1 | Renamed `mapboxToken`→`maptilerKey`, `mapboxTransformRequest`→`maptilerTransformRequest`, `useMapbox`→`useMaplibre`. Deleted dead `mapbox.ts` shim. Updated 4 doc files. |
| F2 | Added WS broadcast for bulk feature insert + `features_bulk_created` to WsEventType enum |
| F3 | Added layer refresh deduplication (skip insert+enqueue if queued/running job exists) |
| F4 | New migration 006: `idx_pc_author` index + `set_updated_at_portals` trigger |
| F5 | Updated README roadmap table (phases 1–4 status) |

### Additional Fixes

- Fixed PWA `maximumFileSizeToCacheInBytes` for Cesium 4.1MB bundle (vite.config.ts)
- Fixed postgres.js `TransactionSql` typing issue with `any` annotation + eslint comment
- Reverted unnecessary `onlyBuiltDependencies` in root package.json (`.npmrc` is authoritative)

### Verification

- **Build:** 3/3 workspaces pass (shared + api + web)
- **Tests:** 420 passing (64 API + 356 web) across 25 test files

### Deferred (documented in plan)

- Hardcoded hex colors (510 occ, 59 files) — design-token refactor session
- Console statements (79 occ) — needs policy decision
- Z-index standardization — stacking context audit
- WS stale connection cleanup — heartbeat interval logic
- TypeScript composite references — structural tsconfig change
- Docker initdb race condition — needs Docker testing
- Layers route snake_case → camelCase — 170 frontend refs, coordinated breaking change

---

## 2026-04-12 — MapTiler Migration Completion + Design Token Fixes + Coverage Verification

**Operator:** Claude Code (Sonnet 4.6)
**Session scope:** Complete MapTiler migration, fix tokens.css critical errors, verify branch coverage

### Changes

**Branch coverage verification:**
- Ran `vitest --coverage` on `computeScores.test.ts` (138 tests written in prior session)
- Result: all 138 pass, branch coverage = **84.61%** — target >80% met
- Remaining uncovered: lines 437, 738–739 (unreachable defensive paths)

**tokens.css — critical font fixes:**
- Line 6: replaced `@import Lora` with Fira Code (400–700) + Fira Sans (300–700)
- `--font-sans`: changed from `'Inter'` to `'Fira Sans'`
- Added `--font-serif: 'Fira Code', monospace` (was referenced in components but never defined)
- Group color tokens: added 7 `--color-group-*` tokens (livestock/forestry/hydrology/finance/compliance/reporting/general) matching values hardcoded in `DashboardSidebar.tsx`

**MapTiler geocoding migration:**
- `apps/web/src/features/map/MapCanvas.tsx` line 559: Mapbox geocoding → MapTiler
- `apps/web/src/features/project/wizard/StepBoundary.tsx` line 88: Mapbox geocoding → MapTiler
- Both use `https://api.maptiler.com/geocoding/${query}.json?key=${mapboxToken}`
- Response parsing unchanged (`features[0].center` — identical structure)
- HMR confirmed clean in browser preview

### Design Audit Findings (no changes — documented only)
- ~500 hardcoded hex instances across ~97 CSS module files
- ~64 font fallback violations (Lora/Georgia/DM Mono in 5 key files)
- Terrain DEM (`mapbox://` protocol) in TerrainControls.tsx + HydrologyPanel.tsx — deferred

### Deferred
- Replace wrong font fallbacks in HydrologyRightPanel.module.css, ProjectTabBar.module.css, Modal.module.css, StewardshipDashboard.tsx
- Terrain DEM migration (TerrainControls.tsx + HydrologyPanel.tsx)
- apps/api server-side MAPBOX_TOKEN in config.ts

---

## 2026-04-11 — Sprint 10 Start: Navigation Wiring + PDF Export Service

**Operator:** Claude Code (Opus 4.6 + Sonnet 4.6)
**Session scope:** DashboardSidebar navigation wiring + full PDF export service implementation

### Changes

**Navigation wiring (Sonnet 4.6):**
- Added Finance group (Economics, Scenarios, Investor Summary) to DashboardSidebar
- Added Compliance group (Regulatory) to DashboardSidebar
- Added 4 SVG icons + 4 DashboardRouter lazy-import cases
- Files: `DashboardSidebar.tsx`, `DashboardRouter.tsx`

**PDF export service (Opus 4.6):**
- Installed `puppeteer` dependency
- Created Zod schemas: `packages/shared/src/schemas/export.schema.ts`
- Created browser manager: `apps/api/src/services/pdf/browserManager.ts`
- Created PdfExportService orchestrator
- Created 7 HTML templates (site_assessment, design_brief, feature_schedule, field_notes, investor_summary, scenario_comparison, educational_booklet)
- Created shared base layout with Atlas design system (Earth Green, Harvest Gold, Fira Code/Sans)
- Created export routes: `POST/GET /api/v1/projects/:id/exports`
- Registered routes + browser cleanup in `app.ts`
- Total: 13 new files, 4 modified files

**Wiki initialization:**
- Created wiki structure: SCHEMA.md, entities/, concepts/, decisions/
- 6 entity pages, 4 concept pages, 2 decision records

### Verification
- TypeScript compilation: clean (shared + API + web)
- Web app Vite build: passes
- Preview verified: Finance + Compliance groups visible in sidebar at desktop viewport

### Deferred
- Frontend integration (wire export buttons to API)
- E2E test with live DB
- Puppeteer Chromium download approval in CI

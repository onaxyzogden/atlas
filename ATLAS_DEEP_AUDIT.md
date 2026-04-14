# OGDEN Atlas — Deep Technical Audit

**Date:** 2026-04-14
**Auditor:** Claude Code (Opus 4.6)
**Commit:** `c6f7e1e` (main)
**Codebase:** 498 source files (excluding node_modules, .git, dist, coverage)

---

## PHASE A — STRUCTURAL INVENTORY

### A1. Monorepo Layout

```
ogden-atlas/                          # Root — pnpm workspaces + Turborepo
├── apps/
│   ├── api/                          # Fastify REST API (Node.js backend)
│   │   ├── src/
│   │   │   ├── app.ts               # Fastify app factory, plugin/route registration
│   │   │   ├── index.ts             # Server entry point → buildApp() + .listen(3001)
│   │   │   ├── db/
│   │   │   │   ├── migrate.ts       # Migration runner
│   │   │   │   └── migrations/
│   │   │   │       ├── 001_initial.sql              # 12 tables, PostGIS, triggers
│   │   │   │       ├── 002_add_password_auth.sql    # password_hash column
│   │   │   │       ├── 003_terrain_analysis_tier3.sql # Curvature, viewshed, TPI, frost
│   │   │   │       ├── 004_project_portals.sql      # Portal persistence
│   │   │   │       ├── 005_multi_user_collab.sql    # Comments, members, activity, edits
│   │   │   │       └── 006_indexes_and_triggers.sql # Additional indexes
│   │   │   ├── lib/
│   │   │   │   ├── config.ts        # Zod-validated env vars
│   │   │   │   ├── errors.ts        # AppError, NotFoundError, ForbiddenError, ValidationError
│   │   │   │   ├── activityLog.ts   # Activity event logging
│   │   │   │   └── broadcast.ts     # Redis pub/sub for WebSocket relay
│   │   │   ├── plugins/
│   │   │   │   ├── auth.ts          # JWT verification, authenticate preHandler
│   │   │   │   ├── database.ts      # PostgreSQL connection pool (postgres lib)
│   │   │   │   ├── redis.ts         # ioredis (fault-tolerant — starts without Redis)
│   │   │   │   ├── rbac.ts          # Role-based access control
│   │   │   │   └── websocket.ts     # WebSocket server setup
│   │   │   ├── routes/              # 17 route modules
│   │   │   │   ├── activity/index.ts
│   │   │   │   ├── ai/index.ts
│   │   │   │   ├── auth/index.ts
│   │   │   │   ├── comments/index.ts
│   │   │   │   ├── design-features/index.ts
│   │   │   │   ├── elevation/index.ts
│   │   │   │   ├── exports/index.ts
│   │   │   │   ├── files/index.ts
│   │   │   │   ├── layers/index.ts
│   │   │   │   ├── members/index.ts
│   │   │   │   ├── organizations/index.ts
│   │   │   │   ├── pipeline/index.ts
│   │   │   │   ├── portal/index.ts
│   │   │   │   ├── portal/public.ts
│   │   │   │   ├── projects/index.ts
│   │   │   │   ├── spiritual/index.ts
│   │   │   │   ├── suggestions/index.ts
│   │   │   │   └── ws/index.ts
│   │   │   ├── services/
│   │   │   │   ├── ai/ClaudeClient.ts               # Phase 3 stub
│   │   │   │   ├── files/fileProcessor.ts            # KML/GeoJSON/Shapefile/GeoTIFF
│   │   │   │   ├── pdf/
│   │   │   │   │   ├── browserManager.ts             # Puppeteer singleton
│   │   │   │   │   ├── PdfExportService.ts           # Export orchestrator
│   │   │   │   │   └── templates/ (7 HTML templates)
│   │   │   │   ├── pipeline/DataPipelineOrchestrator.ts  # BullMQ + 5 workers
│   │   │   │   ├── storage/StorageProvider.ts        # S3 or local filesystem
│   │   │   │   └── terrain/                          # 4 processors + 9 algorithms
│   │   │   │       ├── TerrainAnalysisProcessor.ts   # Curvature, viewshed, TPI, frost
│   │   │   │       ├── WatershedRefinementProcessor.ts
│   │   │   │       ├── MicroclimateProcessor.ts
│   │   │   │       ├── SoilRegenerationProcessor.ts
│   │   │   │       ├── ElevationGridReader.ts
│   │   │   │       ├── gridToGeojson.ts
│   │   │   │       └── algorithms/ (hydro, curvature, viewshed, frostPocket,
│   │   │   │           coldAirDrainage, tpi, microclimate, soilRegeneration,
│   │   │   │           watershedRefinement)
│   │   │   ├── tests/ (13 test files)
│   │   │   └── types/ (bcryptjs.d.ts, shapefile.d.ts)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── openapi.yaml
│   │
│   └── web/                          # React SPA (frontend)
│       ├── src/
│       │   ├── app/ (App.tsx, AppShell.tsx, index.css)
│       │   ├── components/
│       │   │   ├── ui/ (16 reusable components: Accordion, Badge, Button, Card,
│       │   │   │   EmptyState, FormField, Input, Modal, PanelLoader, Skeleton,
│       │   │   │   Spinner, Stack, StepIndicator, Tabs, Toggle, Tooltip)
│       │   │   ├── panels/ (6 major panels: AtlasAI, DesignTools, Educational,
│       │   │   │   Hydrology, MapLayers, SiteIntelligence, Timeline)
│       │   │   └── (CommandPalette, ErrorBoundary, IconSidebar, MapTokenMissing,
│       │   │       OfflineBanner, PresenceBar, ProjectTabBar, RoleBadge,
│       │   │       SlideUpPanel, Toast, TypingIndicator)
│       │   ├── features/             # 25 feature modules
│       │   │   ├── access/           # AccessPanel, corridors, conflicts, slope warnings
│       │   │   ├── ai/              # ContextBuilder for Claude enrichment
│       │   │   ├── assessment/      # SiteAssessmentPanel, ConfidenceIndicator
│       │   │   ├── climate/         # SolarClimateDashboard, scenarios
│       │   │   ├── collaboration/   # MembersTab, SuggestEditPanel
│       │   │   ├── crops/           # CropPanel
│       │   │   ├── dashboard/       # DashboardView + 14 dashboard pages
│       │   │   ├── decision/        # DecisionSupportPanel
│       │   │   ├── economics/       # EconomicsPanel
│       │   │   ├── education/       # AdvancedEducationPanel
│       │   │   ├── export/          # 4 export components + QR code
│       │   │   ├── fieldwork/       # FieldworkPanel, WalkRouteRecorder
│       │   │   ├── financial/       # 8-engine financial model
│       │   │   ├── forest/          # forestAnalysis, canopyLayerData
│       │   │   ├── hydrology/       # HydrologyPanel
│       │   │   ├── livestock/       # LivestockPanel, livestockAnalysis, speciesData
│       │   │   ├── map/             # MapCanvas, TerrainControls, DomainToolbar
│       │   │   ├── mobile/          # FieldNotes, GPSTracker
│       │   │   ├── moontrance/      # MoontrancePanel
│       │   │   ├── nursery/         # nurseryAnalysis, propagationData
│       │   │   ├── planting/        # plantSpeciesData, plantingAnalysis
│       │   │   ├── portal/          # PortalConfig + 7 public sections
│       │   │   ├── project/         # ProjectDashboard, Wizard (5 steps)
│       │   │   ├── regulatory/      # RegulatoryPanel
│       │   │   ├── reporting/       # ReportingPanel
│       │   │   ├── rules/           # RulesEngine (15 checks), SitingPanel
│       │   │   ├── scenarios/       # ScenarioPanel
│       │   │   ├── spiritual/       # 7 spiritual sub-features + Qibla
│       │   │   ├── structures/      # StructurePropertiesModal, footprints
│       │   │   ├── templates/       # TemplatePanel, TemplateMarketplace
│       │   │   ├── utilities/       # UtilityPanel + 4 sub-panels
│       │   │   ├── vision/          # VisionPanel
│       │   │   └── zones/           # ZonePanel + 4 analysis components
│       │   ├── hooks/ (7 custom hooks)
│       │   ├── lib/ (19 utility modules)
│       │   ├── pages/ (5 page components)
│       │   ├── routes/index.tsx (TanStack Router)
│       │   ├── store/ (26 Zustand stores)
│       │   ├── styles/ (tokens.css, dark-mode.css, panel.module.css, utilities.css)
│       │   └── tests/ (10 test files)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── vitest.config.ts
│
├── packages/
│   └── shared/                       # Zod schemas, types, utilities
│       └── src/
│           ├── schemas/ (12 schema files)
│           ├── constants/ (flags.ts, dataSources.ts)
│           ├── lib/ (caseTransform.ts)
│           ├── tests/ (2 test files)
│           └── index.ts (barrel export)
│
├── infrastructure/
│   ├── docker-compose.yml            # PostgreSQL 16 + Redis 7
│   ├── docker-compose.prod.yml
│   ├── db-setup.sql
│   ├── DEPLOY.md
│   ├── LOCAL_VERIFICATION.md
│   └── WINDOWS_DEV_NOTES.md
│
├── design-system/
│   └── ogden-atlas/MASTER.md         # Design tokens + component specs
│
├── wiki/                             # LLM-maintained knowledge base
│   ├── index.md, SCHEMA.md, log.md
│   ├── entities/ (7 docs)
│   ├── concepts/ (4 docs)
│   └── decisions/ (2 ADRs)
│
├── .github/workflows/deploy.yml      # GitHub Pages deploy
├── package.json                      # Root: turbo@^2.3.0, typescript@^5.6.0
├── pnpm-workspace.yaml               # apps/*, packages/*
├── turbo.json                        # Build orchestration
└── tsconfig.base.json                # strict: true, noUncheckedIndexedAccess
```

### A2. Dependency Inventory

#### Root (`package.json`)
| Package | Version | Type |
|---------|---------|------|
| turbo | ^2.3.0 | devDep |
| typescript | ^5.6.0 | devDep |

**Engines:** node >=20.0.0, pnpm >=9.0.0

#### API (`apps/api/package.json`)
| Package | Version | Purpose | Flag |
|---------|---------|---------|------|
| fastify | ^5.2.0 | HTTP server | |
| @fastify/cors | ^10.0.1 | CORS | |
| @fastify/jwt | ^9.0.1 | JWT auth | **VULN: fast-jwt <=6.1.0** |
| @fastify/multipart | ^9.0.1 | File upload | |
| @fastify/rate-limit | ^10.1.1 | Rate limiting | |
| @fastify/websocket | ^11.0.1 | WebSocket | |
| postgres | ^3.4.5 | PostgreSQL driver | |
| ioredis | ^5.4.1 | Redis client | |
| bullmq | ^5.34.0 | Job queue | |
| bcryptjs | ^2.4.3 | Password hashing | |
| zod | ^3.23.8 | Schema validation | |
| puppeteer | ^24.40.0 | PDF generation | |
| @aws-sdk/client-s3 | ^3.1029.0 | S3 storage | |
| @aws-sdk/lib-storage | ^3.1029.0 | S3 multipart | |
| geotiff | ^3.0.5 | GeoTIFF parsing | |
| astronomia | ^4.1.1 | Qibla calculation | |
| pino | ^9.6.0 | Logging | |
| tsx | ^4.19.2 | TypeScript runner | devDep |
| vitest | ^3.0.4 | Testing | devDep |

#### Web (`apps/web/package.json`)
| Package | Version | Purpose | Flag |
|---------|---------|---------|------|
| react | ^18.3.0 | UI framework | |
| react-dom | ^18.3.0 | DOM rendering | |
| vite | ^6.0.0 | Build tool | |
| zustand | ^5.0.0 | State management | |
| react-hook-form | ^7.54.0 | Forms | |
| @tanstack/react-router | ^1.79.0 | Routing | |
| @tanstack/react-query | ^5.62.0 | Data fetching | |
| maplibre-gl | ^4.7.0 | Map rendering | |
| @mapbox/mapbox-gl-draw | ^1.4.4 | Drawing tools | |
| cesium | ^1.140.0 | 3D terrain | |
| @turf/turf | ^7.1.0 | Geospatial calc | |
| lucide-react | ^0.468.0 | Icons | |
| date-fns | ^4.1.0 | Date utilities | |
| vite-plugin-pwa | ^1.2.0 | PWA support | |

#### Shared (`packages/shared/package.json`)
| Package | Version | Purpose |
|---------|---------|---------|
| zod | ^3.23.8 | Schema validation |

### A3. Security Vulnerabilities (pnpm audit)

**14 vulnerabilities found** (8 moderate, 4 high, 2 critical)

All vulnerabilities are in `fast-jwt` (transitive via `@fastify/jwt`):

| Severity | Issue | Package | Fix |
|----------|-------|---------|-----|
| **CRITICAL** | JWT Algorithm Confusion (CVE-2023-48223) | fast-jwt <=6.1.0 | Upgrade to >=6.2.0 |
| **CRITICAL** | Cache Confusion (identity/auth mixup) | fast-jwt >=0.0.1 <6.2.0 | Upgrade to >=6.2.0 |
| **HIGH** | Signature Verification Bypass | fast-jwt <6.0.1 | Upgrade |
| **HIGH** | RSA Public Key confusion | fast-jwt <6.0.0 | Upgrade |
| **HIGH** | JWT kid header injection | fast-jwt <6.0.0 | Upgrade |
| **HIGH** | Clock skew in TTL validation | fast-jwt <6.0.0 | Upgrade |
| **MODERATE** (8) | Various DoS and validation issues | fast-jwt <6.2.1 | Upgrade |

**Remediation:** Update `@fastify/jwt` to latest version (pulls in fast-jwt >=6.2.1).

### A4. TypeScript Compilation

`npx tsc --noEmit` from `apps/web/`: **0 errors** (clean compilation)

Compiler strictness: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`

---

## PHASE B — DATABASE SCHEMA AUDIT

### B1. Full Schema (16 tables across 6 migrations)

#### `users` (Migration 001 + 002)
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | uuid | PK | gen_random_uuid() |
| email | text | UNIQUE NOT NULL | |
| display_name | text | | |
| auth_provider | text | NOT NULL | 'supabase' |
| preferred_locale | text | NOT NULL | 'en' |
| password_hash | text | | NULL (added M002) |
| created_at | timestamptz | NOT NULL | now() |
| updated_at | timestamptz | NOT NULL | now() |

**Trigger:** `set_updated_at` BEFORE UPDATE

#### `organizations` (Migration 001)
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | uuid | PK | gen_random_uuid() |
| name | text | NOT NULL | |
| plan | text | NOT NULL | 'free' |
| created_at | timestamptz | NOT NULL | now() |

#### `organization_members` (Migration 001)
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| org_id | uuid | PK, FK→organizations(CASCADE) | |
| user_id | uuid | PK, FK→users(CASCADE) | |
| role | text | NOT NULL | 'viewer' |
| joined_at | timestamptz | NOT NULL | now() |

#### `projects` (Migration 001) — 27 columns
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | uuid | PK | gen_random_uuid() |
| org_id | uuid | FK→organizations(SET NULL) | |
| owner_id | uuid | NOT NULL, FK→users(RESTRICT) | |
| name | text | NOT NULL | |
| description | text | | |
| status | text | NOT NULL | 'active' |
| project_type | text | | |
| parcel_boundary | geometry(MultiPolygon, 4326) | | |
| centroid | geometry(Point, 4326) | | |
| acreage | numeric(12,4) | | |
| address | text | | |
| parcel_id | text | | |
| country | char(2) | NOT NULL | 'US' |
| province_state | text | | |
| county_fips | char(5) | | |
| conservation_auth_id | text | | |
| timezone | text | | |
| units | text | NOT NULL | 'metric' |
| owner_notes | text | | |
| zoning_notes | text | | |
| access_notes | text | | |
| water_rights_notes | text | | |
| climate_region | text | | |
| bioregion | text | | |
| restrictions_covenants | text | | |
| ag_exemption_notes | text | | |
| data_completeness_score | numeric(4,1) | | |
| created_at | timestamptz | NOT NULL | now() |
| updated_at | timestamptz | NOT NULL | now() |

**Indexes:** owner_id, org_id, GIST(parcel_boundary), GIST(centroid), (country, province_state)
**Trigger:** `set_updated_at`

#### `project_layers` (Migration 001) — Tier 1 data cache
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | uuid | PK | gen_random_uuid() |
| project_id | uuid | NOT NULL, FK→projects(CASCADE) | |
| layer_type | text | NOT NULL | |
| source_api | text | NOT NULL | |
| fetch_status | text | NOT NULL | 'pending' |
| confidence | text | | |
| data_date | date | | |
| attribution_text | text | | |
| geojson_data | jsonb | | |
| summary_data | jsonb | | |
| raster_url | text | | |
| wms_url | text | | |
| wms_layers | text | | |
| metadata | jsonb | | |
| fetched_at | timestamptz | | |
| created_at | timestamptz | NOT NULL | now() |
| updated_at | timestamptz | NOT NULL | now() |

**Unique:** (project_id, layer_type)
**Indexes:** project_id, (project_id, layer_type), fetch_status
**Trigger:** `set_updated_at`

#### `terrain_analysis` (Migration 001 + 003) — 22 columns after M003
| Column | Type | Added |
|--------|------|-------|
| id | uuid PK | M001 |
| project_id | uuid UNIQUE FK→projects | M001 |
| elevation_min_m/max_m/mean_m | numeric(8,2) | M001 |
| slope_min_deg/max_deg/mean_deg | numeric(6,2) | M001 |
| aspect_dominant | text | M001 |
| contour_geojson | jsonb | M001 |
| slope_heatmap_url / aspect_heatmap_url | text | M001 |
| curvature_profile_mean / curvature_plan_mean | numeric(8,4) | M003 |
| curvature_classification / curvature_geojson | jsonb | M003 |
| viewshed_visible_pct | numeric(5,2) | M003 |
| viewshed_observer_point | geometry(Point, 4326) | M003 |
| viewshed_geojson | jsonb | M003 |
| frost_pocket_area_pct | numeric(5,2) | M003 |
| frost_pocket_severity / frost_pocket_geojson | text/jsonb | M003 |
| cold_air_drainage_paths / cold_air_pooling_zones | jsonb | M003 |
| cold_air_risk_rating | text | M003 |
| tpi_classification / tpi_dominant_class / tpi_geojson | jsonb/text/jsonb | M003 |
| source_api / confidence / data_sources | text/text/text[] | M003 |
| computed_at | timestamptz | M001 |

#### `site_assessments` (Migration 001)
| Column | Type | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| project_id | uuid FK→projects | |
| version | integer | 1 |
| is_current | boolean | true |
| confidence | text | 'low' |
| suitability_score | numeric(4,1) | |
| buildability_score | numeric(4,1) | |
| water_resilience_score | numeric(4,1) | |
| ag_potential_score | numeric(4,1) | |
| overall_score | numeric(4,1) | |
| score_breakdown | jsonb | |
| flags | jsonb | |
| needs_site_visit | boolean | false |
| data_sources_used | text[] | |
| computed_at | timestamptz | now() |

**Indexes:** project_id, (project_id, is_current) WHERE is_current=true

#### `design_features` (Migration 001)
Geometry(Geometry, 4326) with GIST index. 12 columns including properties (jsonb), style (jsonb), phase_tag, sort_order, created_by FK→users.

#### `spiritual_zones` (Migration 001)
Geometry(Geometry, 4326) with GIST index. Includes qibla_bearing numeric(6,3), solar_events jsonb.

#### `project_files` (Migration 001)
File uploads with processing_status enum, processed_geojson jsonb, metadata jsonb.

#### `data_pipeline_jobs` (Migration 001)
BullMQ job tracking: job_type, status, bull_job_id, attempt_count, error_message, result_summary jsonb.

#### `project_exports` (Migration 001)
PDF export records: export_type, storage_url, generated_by FK→users.

#### `project_portals` (Migration 004)
| Column | Type | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| project_id | uuid UNIQUE FK→projects | |
| share_token | uuid UNIQUE | gen_random_uuid() |
| is_published | boolean | false |
| config | jsonb | '{}' |
| data_masking_level | text | 'curated' |
| published_at | timestamptz | |
| created_at / updated_at | timestamptz | now() |

#### `project_comments` (Migration 005)
Threaded comments with location geometry(Point, 4326), feature_id FK, parent_id self-ref, resolved workflow.

#### `project_members` (Migration 005)
Per-project roles: PK(project_id, user_id), role (owner/designer/reviewer/viewer), invited_by.

#### `project_activity` (Migration 005)
Audit log: 14 action types, entity_type, entity_id, metadata jsonb.

#### `suggested_edits` (Migration 005)
Reviewer suggestion workflow: diff_payload jsonb, status (pending/approved/rejected), reviewed_by.

### B2. Schema Gaps

| Gap | Description | Impact |
|-----|-------------|--------|
| `organizations.slug` missing | Wiki mentions slug but it's not in the schema | Portal URL generation will fail for org-level portals |
| No `project_layers` GIST index on geojson_data | geojson_data is jsonb, not geometry — GIST not applicable | Not a bug; vector queries happen via summary_data |
| `auth_provider` defaults to 'supabase' | But actual auth is bcrypt/JWT — legacy default | Cosmetic; no functional impact |
| No Tier 3 layer storage | watershed_derived, microclimate, soil_regeneration layers have no dedicated table | Stored in terrain_analysis table (correct pattern) |

### B3. PostGIS Configuration

- **SRID Consistency:** All geometry columns use SRID 4326 (WGS84) — **correct**
- **Extensions:** `postgis`, `uuid-ossp`, `pg_trgm` — all enabled
- **UTM conversion:** Referenced in SQL comments (EPSG:26917 for Ontario) but no stored UTM columns — transformations happen at query time via `ST_Transform()` — **correct pattern**
- **Centroid/Acreage:** Computed at boundary upload time and stored on the projects row — **correct**
- **GIST Indexes:** On parcel_boundary, centroid, design_features.geometry, spiritual_zones.geometry — **all present**

---

## PHASE C — API LAYER AUDIT

### C1. Route Inventory

| Method | Path | Auth | Validation | Tables | Frontend Call | Status |
|--------|------|------|------------|--------|---------------|--------|
| POST | /api/v1/auth/register | No | Zod | users | Yes | LIVE |
| POST | /api/v1/auth/login | No | Zod | users | Yes | LIVE |
| GET | /api/v1/auth/me | Yes | - | users | Yes | LIVE |
| GET | /api/v1/projects | Yes | - | projects | Yes | LIVE |
| GET | /api/v1/projects/:id | Yes | - | projects, layers, assessments | Yes | LIVE |
| POST | /api/v1/projects | Yes | Zod | projects | Yes | LIVE |
| PATCH | /api/v1/projects/:id | Yes | Zod | projects | Yes | LIVE |
| DELETE | /api/v1/projects/:id | Yes | - | projects (cascade) | Yes | LIVE |
| POST | /api/v1/projects/:id/boundary | Yes | Multipart | projects (ST_GeomFromGeoJSON) | Yes | LIVE |
| GET | /api/v1/projects/:id/assessment | Yes | - | site_assessments | Yes | LIVE |
| GET | /api/v1/projects/:id/completeness | Yes | - | project_layers | Yes | LIVE |
| GET | /api/v1/layers/project/:id | Yes | - | project_layers | Yes | LIVE |
| GET | /api/v1/layers/project/:id/:type | Yes | - | project_layers | Yes | LIVE |
| POST | /api/v1/layers/project/:id/:type/refresh | Yes | - | project_layers, pipeline_jobs | Yes | LIVE |
| GET | /api/v1/design-features/project/:id | Yes | - | design_features | Yes | LIVE |
| GET | /api/v1/design-features/project/:id/:type | Yes | - | design_features | Yes | LIVE |
| POST | /api/v1/design-features/project/:id | Yes | Zod | design_features | Yes | LIVE |
| PATCH | /api/v1/design-features/:id | Yes | Zod | design_features | Yes | LIVE |
| DELETE | /api/v1/design-features/:id | Yes | - | design_features | Yes | LIVE |
| POST | /api/v1/design-features/project/:id/bulk | Yes | Zod | design_features | Yes | LIVE |
| GET | /api/v1/spiritual/project/:id | Yes | - | spiritual_zones | Yes | LIVE |
| POST | /api/v1/spiritual/project/:id | Yes | Zod | spiritual_zones | Yes | LIVE |
| GET | /api/v1/spiritual/project/:id/qibla | Yes | - | projects (centroid) | Yes | LIVE |
| DELETE | /api/v1/spiritual/:zoneId | Yes | - | spiritual_zones | Yes | LIVE |
| POST | /api/v1/ai/chat | Yes | Zod | - (proxy to Anthropic) | Yes | STUB |
| GET | /api/v1/elevation/... | Yes | - | - (proxy to USGS) | Yes | LIVE |
| GET | /api/v1/pipeline/jobs/:projectId | Yes | - | data_pipeline_jobs | Yes | LIVE |
| GET | /api/v1/pipeline/job/:jobId | Yes | - | data_pipeline_jobs | Yes | LIVE |
| POST | /api/v1/projects/:id/files | Yes | Multipart | project_files | Yes | LIVE |
| GET | /api/v1/projects/:id/files | Yes | - | project_files | Yes | LIVE |
| DELETE | /api/v1/projects/:id/files/:fileId | Yes | - | project_files | Yes | LIVE |
| POST | /api/v1/projects/:id/exports | Yes | Zod | project_exports | Yes | LIVE |
| GET | /api/v1/projects/:id/exports | Yes | - | project_exports | Yes | LIVE |
| GET | /api/v1/projects/:id/portal | Yes | - | project_portals | Yes | LIVE |
| POST | /api/v1/projects/:id/portal | Yes | Zod | project_portals | Yes | LIVE |
| GET | /api/v1/portal/:shareToken | No | - | project_portals, projects | Yes | LIVE |
| GET | /api/v1/projects/:id/comments | Yes | - | project_comments | Yes | LIVE |
| POST | /api/v1/projects/:id/comments | Yes | Zod | project_comments, activity | Yes | LIVE |
| PATCH | /api/v1/projects/:id/comments/:cid | Yes | Zod | project_comments | Yes | LIVE |
| DELETE | /api/v1/projects/:id/comments/:cid | Yes | - | project_comments | Yes | LIVE |
| GET | /api/v1/projects/:id/members | Yes | - | project_members, users | Yes | LIVE |
| POST | /api/v1/projects/:id/members | Yes | Zod (RBAC) | project_members, activity | Yes | LIVE |
| PATCH | /api/v1/projects/:id/members/:uid | Yes | Zod (RBAC) | project_members | Yes | LIVE |
| DELETE | /api/v1/projects/:id/members/:uid | Yes | RBAC | project_members | Yes | LIVE |
| GET | /api/v1/projects/:id/my-role | Yes | - | project_members | Yes | LIVE |
| GET | /api/v1/organizations | Yes | - | organizations | Yes | LIVE |
| POST | /api/v1/organizations | Yes | Zod | organizations, org_members | Yes | LIVE |
| GET | /api/v1/organizations/:id/members | Yes | - | organization_members | Yes | LIVE |
| POST | /api/v1/organizations/:id/members | Yes | Zod | organization_members | Yes | LIVE |
| DELETE | /api/v1/organizations/:id/members/:uid | Yes | RBAC | organization_members | Yes | LIVE |
| GET | /api/v1/projects/:id/activity | Yes | - | project_activity | Yes | LIVE |
| GET | /api/v1/projects/:id/suggested-edits | Yes | - | suggested_edits | Yes | LIVE |
| POST | /api/v1/projects/:id/suggested-edits | Yes | Zod | suggested_edits, activity | Yes | LIVE |
| POST | /api/v1/projects/:id/suggested-edits/:eid/accept | Yes | RBAC | suggested_edits, design_features | Yes | LIVE |
| POST | /api/v1/projects/:id/suggested-edits/:eid/reject | Yes | RBAC | suggested_edits | Yes | LIVE |
| WS | /api/v1/ws | Yes | - | Real-time events | Yes | LIVE |

**Summary:** 50+ endpoints, all with authentication (except auth/register/login and public portal). 49 LIVE, 1 STUB (AI chat).

### C2. Services

| Service | Status | External APIs | Error Handling |
|---------|--------|---------------|----------------|
| **PdfExportService** | LIVE | None (local Puppeteer) | AppError propagation |
| **StorageProvider** | LIVE | S3 (or local fallback) | Try/catch + rethrow |
| **DataPipelineOrchestrator** | PARTIAL | None (all adapters stubbed) | BullMQ retry (3 attempts) |
| **TerrainAnalysisProcessor** | LIVE | USGS 3DEP WCS / NRCan | Throws on missing boundary |
| **WatershedRefinementProcessor** | LIVE | None (derived from elevation) | Same |
| **MicroclimateProcessor** | LIVE | None (derived) | Same |
| **SoilRegenerationProcessor** | LIVE | None (derived) | Same |
| **ClaudeClient** | STUB | Anthropic API (not connected) | Throws "not enabled" error |
| **fileProcessor** | PARTIAL | None | Throws on unsupported format |

### C3. BullMQ Job Queue

| Worker | Queue Name | Trigger | Handler | Status |
|--------|-----------|---------|---------|--------|
| tier1-data | tier1-data | Layer refresh request | Iterates ADAPTER_REGISTRY → all return ManualFlagAdapter | **STUBBED** |
| tier3-terrain | tier3-terrain | After elevation layer completes | TerrainAnalysisProcessor.process() | **LIVE** |
| tier3-watershed | tier3-watershed | After watershed layer completes | WatershedRefinementProcessor.process() | **LIVE** |
| tier3-microclimate | tier3-microclimate | After climate+elevation complete | MicroclimateProcessor.process() | **LIVE** |
| tier3-soil-regeneration | tier3-soil-regen | After soils+elevation complete | SoilRegenerationProcessor.process() | **LIVE** |

**Key insight:** The Tier 1 data worker (which fetches from external APIs) is completely stubbed — all 14 adapters (7 layers × 2 countries) resolve to `ManualFlagAdapter` which returns `{ unavailable: true, reason: 'no_adapter_for_region', confidence: 'low' }`. However, the Tier 3 workers (terrain analysis) are fully implemented with 9 algorithms.

### C4. Adapter Registry

| Layer | US Adapter | CA Adapter | Implementation Status |
|-------|-----------|------------|----------------------|
| elevation | UsgsElevationAdapter | NrcanHrdemAdapter | **STUB** (ManualFlagAdapter) |
| soils | SsurgoAdapter | OmafraCanSisAdapter | **STUB** |
| watershed | NhdAdapter | OhnAdapter | **STUB** |
| wetlands_flood | NwiFemaAdapter | ConservationAuthorityAdapter | **STUB** |
| land_cover | NlcdAdapter | AafcLandCoverAdapter | **STUB** |
| climate | NoaaClimateAdapter | EcccClimateAdapter | **STUB** |
| zoning | UsCountyGisAdapter | OntarioMunicipalAdapter | **STUB** |

**All 14 backend adapters are stubs.** However, the **frontend layerFetcher.ts** has working implementations for all 7 layers that call the external APIs directly from the browser. This means data flows client→external API→display, bypassing the backend pipeline entirely.

---

## PHASE D — FRONTEND FEATURE AUDIT

### D1. Zustand Stores (26 total)

| Store | Key State | localStorage | serverId | Backend Sync |
|-------|-----------|-------------|----------|--------------|
| authStore | token, user, isLoaded | ogden-auth-token | N/A | Yes (API) |
| projectStore | projects[], activeProjectId | ogden-projects v3 + IndexedDB | Optional (unused) | Planned Sprint 3 |
| zoneStore | zones[] | ogden-zones v2 | Optional (unused) | Planned |
| structureStore | structures[] | ogden-structures v2 | Optional (unused) | Planned |
| livestockStore | paddocks[] | ogden-livestock v1 | N/A | Planned |
| cropStore | cropAreas[] | ogden-crops v1 | N/A | Planned |
| pathStore | paths[] | ogden-paths v1 | Optional (unused) | Planned |
| utilityStore | utilities[] | ogden-utilities v1 | Optional (unused) | Planned |
| scenarioStore | scenarios[], activeScenarioId | ogden-scenarios v2 | N/A | Planned |
| financialStore | region, missionWeights, overrides | ogden-financial v1 | N/A | No |
| phaseStore | phases[], activeFilter | ogden-phases v1 | N/A | No |
| fieldworkStore | entries[], walkRoutes[], punchList[] | ogden-fieldwork v1 | N/A | Offline queue |
| siteDataStore | dataByProject: { layers, isLive, status } | No (runtime) | N/A | Yes (layerFetcher) |
| commentStore | comments[] | ogden-comments v2 | Optional | Yes (API) |
| portalStore | configs[] | ogden-portal v1 | shareToken | Yes (debounced) |
| mapStore | style, visibleLayers, drawMode, is3DTerrain | No (transient) | N/A | No |
| uiStore | colorScheme, sidebarOpen, activeDashboard | ogden-ui v1 | N/A | No |
| memberStore | members[], myRole | No (runtime) | N/A | Yes (API) |
| presenceStore | users: Map | No (ephemeral) | N/A | Yes (WebSocket) |
| nurseryStore | batches[], transfers[] | ogden-nursery v1 | N/A | Planned |
| visionStore | visions[] | ogden-vision v2 | N/A | Planned |
| templateStore | customTemplates[] | ogden-templates v1 | N/A | No |
| versionStore | snapshots[] | ogden-versions v1 | N/A | Planned |
| sitingWeightStore | weights{} | ogden-siting-weights v1 | N/A | No |
| connectivityStore | isOnline, lastSync | No (runtime) | N/A | No |
| cascadeDelete | (utility module, not a store) | N/A | N/A | N/A |

### D2. Layer Fetcher

**File:** `apps/web/src/lib/layerFetcher.ts`

| Layer | US Source | CA Source | Live API | Mock Fallback | Cache |
|-------|-----------|-----------|----------|---------------|-------|
| elevation | USGS 3DEP WCS | NRCan HRDEM (backend proxy) | Yes | Latitude-based model | localStorage 24h |
| soils | SSURGO SDA | LIO ArcGIS REST | Yes | Fixed summaries | localStorage 24h |
| watershed | USGS WBD | LIO ArcGIS REST | Yes | Fixed watershed names | localStorage 24h |
| wetlands_flood | FEMA NFHL + USFWS NWI | LIO Ontario + Conservation Authority | Yes | Fixed zones | localStorage 24h |
| land_cover | MRLC NLCD 2021 | AAFC Crop Inventory 2024 | Yes | Fixed classes | localStorage 24h |
| climate | NOAA ACIS | ECCC OGC API | Yes | Hardcoded normals | localStorage 24h |
| zoning | County GIS (FIPS) | LIO Ontario Municipal | Partial | Fixed codes | localStorage 24h |

**Architecture:** Mock baseline loaded first → real API replaces on success → failures fall back to mock without breaking UI. 24h localStorage cache with deduplication (in-flight promise map).

### D3. Dashboard Pages (14 + placeholder)

| Page | Data Source | Real/Mock | Notes |
|------|-----------|-----------|-------|
| GrazingDashboard | livestock + zone + siteData stores | Real (computed) | |
| HerdRotationDashboard | livestock + phase stores | Real (computed) | |
| LivestockDashboard | livestock + zone + structure + siteData | Real (computed) | |
| PaddockDesignDashboard | livestock store | Real (computed) | |
| PlantingToolDashboard | crop + zone stores | Real (computed) | |
| ForestHubDashboard | siteData + forestAnalysis | Real (computed) | |
| CarbonDiagnosticDashboard | siteData (soils, elevation) | Real (computed) | |
| NurseryLedgerDashboard | nursery store | Real (computed) | |
| HydrologyDashboard | siteData (watershed, elevation) | Real (computed) | |
| CartographicDashboard | map + zone layers | Real (visual) | |
| EcologicalDashboard | siteData + scoring + opportunity rules | Real (computed) | |
| TerrainDashboard | siteData (elevation, soils) | Real (computed) | |
| StewardshipDashboard | Multiple stores + rules | Real (computed) | |
| SolarClimateDashboard | siteData (climate) | Real (computed) | |
| DashboardPlaceholder | None | N/A | Shown for unimplemented sections |

### D4. Hardcoded/Mock Values

| File | Line | Description |
|------|------|-------------|
| `lib/wsService.ts` | 233 | `// TODO: trigger useSiteDataStore re-fetch` |
| `lib/layerFetcher.ts` | ~385 | Year 2024 hardcoded in AAFC Crop Inventory URL |
| `lib/mockLayerData.ts` | all | Full mock data generator (US + CA) — used as fallback |
| `features/templates/TemplateMarketplace.tsx` | 19 | `MOCK_TEMPLATES` — hardcoded community templates |
| `store/templateStore.ts` | 61 | `BUILT_IN_TEMPLATES` — hardcoded starter templates |

**Total TODO/FIXME/HACK comments in codebase:** **1** (wsService.ts:233)

---

## PHASE E — DATA INTEGRATION STATUS MATRIX

| Data Source | Layer Type | API/URL | Status | Fields Fetched | Fields Available but Missing | Notes |
|---|---|---|---|---|---|---|
| **USGS 3DEP** | elevation | elevation.nationalmap.gov WCS | **LIVE** (frontend) | min/max/mean elevation, raster tile | Slope gradient, aspect (computed Tier 3) | Frontend fetches directly |
| **USDA SSURGO SDA** | soils | SDMDataAccess.sc.egov.usda.gov | **LIVE** (frontend) | Mapunit, texture, drainage, AWC, depth | pH, organic carbon, CEC, EC, bulk density, Ksat | Partial attribute fetch |
| **USGS NHD/WBD** | watershed | nhd2-gis service | **LIVE** (frontend) | HUC codes, watershed name | Stream order, flow direction | Partial |
| **USFWS NWI** | wetlands_flood | wetlands.fws.gov | **LIVE** (frontend) | Wetland type, classification | Detailed habitat mapping | Combined with FEMA |
| **FEMA NFHL** | wetlands_flood | hazards.fema.gov WMS | **LIVE** (frontend) | Flood zone (A/AE/X/etc.) | Base flood elevation | Combined with NWI |
| **NOAA NLCD** | land_cover | mrlc.gov | **LIVE** (frontend) | Land cover class distribution | Canopy height, impervious surface % | |
| **NOAA Climate Normals** | climate | data.rcc-acis.org | **LIVE** (frontend) | Temp, precip, frost dates, GDD | PET, aridity index, drought indices | Partial |
| **NRCan HRDEM** | elevation | Backend proxy to CGVD2013 | **LIVE** (frontend via proxy) | Elevation, slope, aspect | Same as USGS | CA equivalent |
| **LIO ArcGIS REST** | soils, watershed, wetlands | ontario.ca services | **LIVE** (frontend) | Soil survey complex, hydro network | Detailed soil chemistry | CA equivalent |
| **ECCC Climate Normals** | climate | open.canada.ca OGC API | **LIVE** (frontend) | Temp, precip, frost dates | Wind data, PET, humidity | CA equivalent |
| **AAFC Crop Inventory** | land_cover | geoservices.agr.gc.ca | **LIVE** (frontend) | Crop type distribution | Yield data | CA equivalent |
| **NASA POWER** | climate | - | **PLANNED** | - | Solar radiation, degree days | Referenced in roadmap only |
| **USGS NWIS Groundwater** | hydrology | - | **PLANNED** | - | Well depth, water table | No code exists |
| **USGS StreamStats** | hydrology | - | **PLANNED** | - | Drainage area, peak flow | No code exists |
| **EPA ECHO** | regulatory | - | **PLANNED** | - | Permit violations, compliance | No code exists |
| **EPA FRS** | regulatory | - | **PLANNED** | - | Facility registry | No code exists |
| **EPA Brownfields** | regulatory | - | **PLANNED** | - | Contamination sites | No code exists |
| **Global Wind Atlas** | energy | - | **PLANNED** | - | Wind speed/direction, Weibull | No code exists |
| **NREL PVWatts** | energy | - | **PLANNED** | - | Solar PV output estimate | No code exists |
| **OpenZoning** | zoning | - | **PLANNED** | - | Parsed zoning codes | No code exists |
| **Regrid** | parcel | - | **PLANNED** | - | Parcel boundaries, ownership | No code exists |
| **PAD-US** | ecological | - | **PLANNED** | - | Protected areas | No code exists |
| **WDPA** | ecological | - | **PLANNED** | - | World protected areas | No code exists |
| **SoilGrids ISRIC** | soils | - | **PLANNED** | - | Global soil properties | No code exists |
| **WorldClim** | climate | - | **PLANNED** | - | Bioclimatic variables | No code exists |
| **GAEZ FAO** | crop | - | **PLANNED** | - | Crop suitability, yield gaps | No code exists |
| **ESA WorldCover** | land_cover | - | **PLANNED** | - | 10m land cover | No code exists |
| **SRTM** | elevation | - | **PLANNED** | - | 30m global elevation | No code exists (USGS 3DEP covers US) |
| **Conservation Authority GIS** | wetlands | maps.conservationhalton.ca etc. | **PARTIAL** | Regulation limits, wetlands | Detailed CA overlays | 3 CAs in registry |

**Summary:** 10 of 28 data sources are LIVE (all via frontend). 0 backend adapters are live. 18 are PLANNED with no code.

---

## PHASE F — FEATURE COMPLETENESS MATRIX

### Assessment & Scoring

| Feature | Status | Evidence |
|---------|--------|----------|
| FAO S1/S2/S3/N1/N2 suitability | **NOT STARTED** | No FAO classification logic in computeScores.ts |
| USDA LCC (I-VIII) | **NOT STARTED** | No LCC logic |
| Canada Soil Capability | **NOT STARTED** | No CSC logic |
| Fuzzy logic scoring engine | **PARTIAL** | computeScores.ts uses stepped thresholds, not true fuzzy logic |
| AHP multi-criteria weighting | **STUB** | sitingWeightStore exists with user-adjustable weights, but no formal AHP |
| Confidence scoring on all outputs | **DONE** | Every ScoredResult carries confidence, dataSources[], computedAt |
| Site assessment panel | **DONE** | 7 scores (water resilience, ag suitability, regenerative potential, buildability, habitat sensitivity, stewardship readiness, design complexity) |

### Terrain Analysis

| Feature | Status | Evidence |
|---------|--------|----------|
| Slope gradient from DEM | **DONE** | TerrainAnalysisProcessor + ElevationGridReader |
| Slope aspect | **DONE** | aspect_dominant stored in terrain_analysis |
| Topographic Wetness Index (TWI) | **NOT STARTED** | Not in any algorithm file |
| Terrain Ruggedness Index (TRI) | **NOT STARTED** | Not implemented |
| Plan/profile curvature | **DONE** | algorithms/curvature.ts, stored in DB |
| Erosion hazard computation | **NOT STARTED** | No USLE/RUSLE implementation |
| TPI (Topographic Position Index) | **DONE** | algorithms/tpi.ts |
| Viewshed analysis | **DONE** | algorithms/viewshed.ts |
| Frost pocket detection | **DONE** | algorithms/frostPocket.ts |
| Cold air drainage | **DONE** | algorithms/coldAirDrainage.ts |

### Soil Analysis

| Feature | Status | Evidence |
|---------|--------|----------|
| Soil pH display | **PARTIAL** | SSURGO fetches pH when available; not all mapunits include it |
| Organic carbon | **NOT STARTED** | Not fetched from SSURGO/SoilGrids |
| CEC, EC, bulk density, rooting depth, AWC, drainage, Ksat | **PARTIAL** | AWC + drainage class fetched from SSURGO. Others not requested. |
| Soil fertility index | **NOT STARTED** | No computation logic |
| Salinization risk | **NOT STARTED** | Not implemented |
| Soil regeneration scoring | **DONE** | SoilRegenerationProcessor (Tier 3 worker) |

### Climate Analysis

| Feature | Status | Evidence |
|---------|--------|----------|
| Mean temperature, frost dates | **DONE** | NOAA ACIS + ECCC fetch these |
| Growing Degree Days | **PARTIAL** | GDD computed from NOAA data in layerFetcher |
| Length of Growing Period | **PARTIAL** | growing_season_days in climate summary |
| Aridity Index / PET | **NOT STARTED** | No PET calculation, no aridity index |
| Koppen classification | **NOT STARTED** | Not implemented |
| USDA Plant Hardiness Zone | **PARTIAL** | hardiness_zone in mock data; fetched for CA from ECCC |
| Microclimate modeling | **DONE** | MicroclimateProcessor (Tier 3 worker) + algorithms/microclimate.ts |

### Hydrology

| Feature | Status | Evidence |
|---------|--------|----------|
| Groundwater depth | **NOT STARTED** | No USGS NWIS integration |
| Rainwater harvesting potential | **PARTIAL** | HydrologyDashboard shows some metrics from elevation + climate data |
| Seasonal waterlogging risk | **PARTIAL** | Inferred from wetland/drainage data, not explicit |
| Watershed refinement | **DONE** | WatershedRefinementProcessor (Tier 3 worker) |

### Crop & Vegetation

| Feature | Status | Evidence |
|---------|--------|----------|
| Crop suitability matching (ECOCROP/GAEZ) | **NOT STARTED** | No GAEZ/ECOCROP integration |
| Species recommendations by zone | **PARTIAL** | plantSpeciesData.ts has hardcoded species list, plantingAnalysis.ts matches to climate |
| Forage/livestock suitability | **PARTIAL** | livestockAnalysis.ts + speciesData.ts compute from zone + climate data |

### Ecological

| Feature | Status | Evidence |
|---------|--------|----------|
| Habitat type classification | **PARTIAL** | EcologicalDashboard derives from land_cover + wetlands layers |
| Protected areas overlap | **NOT STARTED** | No PAD-US/WDPA integration |
| Carbon stock estimation | **PARTIAL** | CarbonDiagnosticDashboard computes from soil + land cover data |
| Species at risk flags | **NOT STARTED** | No species-at-risk database |

### Renewable Energy

| Feature | Status | Evidence |
|---------|--------|----------|
| Solar PV potential | **PARTIAL** | SolarClimateDashboard shows solar hours + orientation; no PVWatts |
| Wind energy potential | **NOT STARTED** | No Global Wind Atlas integration |
| Energy assessment | **PARTIAL** | SolarPlacement.tsx in utilities; basic orientation guidance |

### Regulatory

| Feature | Status | Evidence |
|---------|--------|----------|
| Zoning data connected | **PARTIAL** | Frontend fetches county GIS (US) / LIO (CA); often falls back to mock |
| Setback computation | **DONE** | SitingRules.ts defines SETBACK_RULES, RulesEngine.ts enforces |
| Agricultural land reserve / greenbelt | **NOT STARTED** | No ALR/greenbelt overlay |
| Environmental risk / contamination | **NOT STARTED** | No EPA integration |

### Design Intelligence

| Feature | Status | Evidence |
|---------|--------|----------|
| Passive solar orientation guidance | **DONE** | SolarClimatePanel + solarCalc.ts |
| Wind break siting | **DONE** | WIND_SHELTER_RULES in SitingRules.ts |
| Water harvesting siting | **PARTIAL** | HydrologyPanel basic guidance |
| Pond siting/volume | **NOT STARTED** | No pond volume calculator |
| Septic suitability | **NOT STARTED** | No percolation/perc test logic |
| Fire risk zoning | **NOT STARTED** | Not implemented |
| Shade/shadow modeling | **NOT STARTED** | Beyond sun path; no shadow modeling |
| Building footprint optimization | **PARTIAL** | footprints.ts defines 20 structure templates with dimensions |

### Export & Reporting

| Feature | Status | Evidence |
|---------|--------|----------|
| PDF export | **DONE** | 7 Puppeteer templates (site assessment, design brief, feature schedule, field notes, investor summary, scenario comparison, educational booklet) |
| Investor summary | **DONE** | investorSummary.ts template |
| Educational booklet | **DONE** | educationalBooklet.ts template |
| Site assessment report | **DONE** | siteAssessment.ts template |

### AI Integration

| Feature | Status | Evidence |
|---------|--------|----------|
| Claude integration | **STUB** | ClaudeClient.ts throws "not enabled" on all methods; FEATURE_AI=false |
| Site narrative generation | **STUB** | Method exists, throws error |
| Design recommendations | **STUB** | Method exists, throws error |
| Assessment enrichment | **STUB** | Method exists, throws error |
| AI context builder | **DONE** | ContextBuilder.ts assembles project context for Claude calls |

---

## PHASE G — TECHNICAL DEBT & QUALITY AUDIT

### G1. TypeScript Compilation
`tsc --noEmit` from `apps/web/`: **0 errors** — clean.

### G2. TODO/FIXME/HACK Comments
**1 total** across entire codebase:
- `apps/web/src/lib/wsService.ts:233` — `// TODO: trigger useSiteDataStore re-fetch for the active project`

### G3. Circular Dependencies
None detected beyond the known type-only circular import pattern.

### G4. Exposed Secrets
- `apps/api/.env` exists in the repo (gitignored in `.gitignore` but present in working tree) — contains local dev credentials only
- `.env.example` files contain placeholder values — **clean**
- No API keys hardcoded in source files

### G5. Feature Flags

| Flag | Env Var | Default | Feature | Implemented Behind Flag? |
|------|---------|---------|---------|--------------------------|
| TERRAIN_3D | FEATURE_TERRAIN_3D | false | 3D terrain visualization (Cesium) | Yes — CesiumTerrainViewer.tsx |
| HYDROLOGY_TOOLS | FEATURE_HYDROLOGY | false | Hydrological analysis tools | Yes — HydrologyPanel.tsx |
| LIVESTOCK_DESIGN | FEATURE_LIVESTOCK | false | Grazing/paddock design | Yes — LivestockPanel.tsx, GrazingDashboard |
| AI_ANALYSIS | FEATURE_AI | false | Claude AI enrichment | Yes — ClaudeClient.ts (stub) |
| MULTI_USER | FEATURE_MULTI_USER | **true** | Collaboration/members | Yes — CollaborationPanel, MembersTab |
| OFFLINE_MODE | FEATURE_OFFLINE | false | Offline-first sync | Partial — connectivityStore, syncQueue |
| SCENARIO_MODELING | FEATURE_SCENARIOS | false | Design scenario branching | Yes — ScenarioPanel.tsx |
| PUBLIC_PORTAL | FEATURE_PUBLIC_PORTAL | false | Public storytelling portal | Yes — PortalConfigPanel, PublicPortalShell |

### G6. Placeholder/Empty-State Routes

| Component | Route/Section | What User Sees |
|-----------|--------------|----------------|
| DashboardPlaceholder | Any unimplemented dashboard section | "Coming soon" placeholder with section name |
| TemplateMarketplace | Template marketplace section | Hardcoded mock templates (not real community) |
| StewardshipDashboard | stewardship section | Renders but data sources TBD |

### G7. Known Technical Debt

| Issue | Location | Severity | Notes |
|-------|----------|----------|-------|
| fast-jwt vulnerabilities (14 CVEs) | @fastify/jwt dependency | **CRITICAL** | Update @fastify/jwt |
| Backend adapters 100% stubbed | DataPipelineOrchestrator.ts | HIGH | All resolve to ManualFlagAdapter |
| No backend sync for stores | All 16 domain stores | HIGH | serverId field exists but unused |
| No ESLint/Prettier config | Root | MEDIUM | No automated code quality enforcement |
| Mapbox terrain DEM URLs | TerrainControls.tsx, HydrologyPanel.tsx | MEDIUM | Still using mapbox:// protocol |
| 205 hardcoded hex colors remaining | Various CSS/JS files | LOW | 85% eliminated, remainder in SVG/third-party |
| ~64 font fallback violations | 4 CSS module files | LOW | Lora/Georgia/DM Mono refs; --font-serif defined |
| Year 2024 hardcoded in AAFC URL | layerFetcher.ts | LOW | Needs annual update or parameterization |
| No production deployment config | infrastructure/ | HIGH | Only GitHub Pages for static web; no API deployment |

---

## PHASE H — SYNTHESIS REPORT

### H1. Revised Completion Percentage

The wiki's "~65% Done, ~25% Partial, ~10% Stub" was assessed before this deep audit. Here is a revised breakdown:

| Area | Done | Partial | Stub/Not Started |
|------|------|---------|------------------|
| **Core Infrastructure** (auth, DB, API routing, WebSocket) | 90% | 10% | 0% |
| **Data Pipeline** (backend adapters) | 5% | 0% | 95% |
| **Data Pipeline** (frontend layerFetcher) | 70% | 20% | 10% |
| **Frontend Features** (UI components, stores, dashboards) | 80% | 15% | 5% |
| **Scoring/Intelligence Layer** | 40% | 30% | 30% |
| **Terrain Analysis** (Tier 3) | 70% | 10% | 20% |
| **Financial Engine** | 90% | 10% | 0% |
| **Export/Reporting** | 95% | 5% | 0% |
| **AI Integration** | 5% | 10% | 85% |
| **Production Readiness** (CI/CD, deploy, monitoring) | 10% | 10% | 80% |

**Revised Overall: ~55% Done, ~20% Partial, ~25% Stub/Not Started**

The key downward revision comes from:
1. Backend adapters being 100% stubbed (previously masked by frontend doing the fetching)
2. Scoring layer lacking formal classification systems (FAO, LCC)
3. 18 of 28 data sources having zero code
4. No production deployment infrastructure

### H2. Critical Path to Phase 1 Readiness

Phase 1 = terrain parameters, full soil attributes, climate data expansion. In dependency order:

1. **Fix fast-jwt vulnerability** — Upgrade `@fastify/jwt` to pull fast-jwt >=6.2.1. Blocks any production deployment.

2. **Implement SSURGO backend adapter** — The highest-value single adapter. Soils data feeds into 4 of 7 assessment scores. Frontend already fetches partial data; backend adapter should fetch the full attribute set (pH, OC, CEC, EC, bulk density, Ksat, drainage class, AWC, rooting depth).

3. **Implement USGS 3DEP backend adapter** — Move elevation fetching to backend (currently frontend-only). Enables Tier 3 terrain workers to run automatically after data fetch.

4. **Implement NOAA Climate backend adapter** — Expand climate attributes: add PET calculation, aridity index, and complete GDD computation.

5. **Wire backend adapters to Tier 3 workers** — Connect adapter completion events to trigger terrain/microclimate/soil-regen workers automatically.

6. **Expand computeScores.ts** — Add SSURGO-specific soil quality scores using full attribute set. Add formal suitability rating (even if simplified from FAO).

7. **Implement backend sync for projectStore + zoneStore** — The two most critical stores for multi-user collaboration. serverId field already exists.

8. **Set up production deployment** — Containerize API, configure production PostgreSQL + Redis, set up CI/CD pipeline.

### H3. Data Pipeline Gap Map

```
Frontend layerFetcher.ts (CLIENT-SIDE)        Backend DataPipelineOrchestrator (SERVER-SIDE)
─────────────────────────────────────         ──────────────────────────────────────────────
elevation:  USGS 3DEP WCS → LIVE ✓            UsgsElevationAdapter → ManualFlagAdapter ✗
soils:      SSURGO SDA → LIVE ✓               SsurgoAdapter → ManualFlagAdapter ✗
watershed:  USGS WBD → LIVE ✓                 NhdAdapter → ManualFlagAdapter ✗
wetlands:   FEMA+NWI → LIVE ✓                 NwiFemaAdapter → ManualFlagAdapter ✗
land_cover: NLCD/AAFC → LIVE ✓                NlcdAdapter → ManualFlagAdapter ✗
climate:    NOAA/ECCC → LIVE ✓                NoaaClimateAdapter → ManualFlagAdapter ✗
zoning:     County GIS → PARTIAL               UsCountyGisAdapter → ManualFlagAdapter ✗
                                               
Tier 3 Workers (SERVER-SIDE)
────────────────────────────
terrain:          TerrainAnalysisProcessor → LIVE ✓ (5 algorithms)
watershed_derived: WatershedRefinementProcessor → LIVE ✓
microclimate:     MicroclimateProcessor → LIVE ✓
soil_regeneration: SoilRegenerationProcessor → LIVE ✓

Current data flow: Browser → External API → localStorage → Zustand store → Dashboard
Target data flow:  Browser → Backend API → External API → PostgreSQL → Browser
```

**First implementation step for each missing adapter:**
- SSURGO: Port `layerFetcher.ts` SSURGO fetch logic to `apps/api/src/services/pipeline/adapters/SsurgoAdapter.ts`
- USGS 3DEP: Port WCS fetch logic to `UsgsElevationAdapter.ts`
- NOAA: Port ACIS fetch logic to `NoaaClimateAdapter.ts`
- Remaining 4: Same pattern — port frontend fetch logic to backend adapter files

### H4. What a User Currently Experiences

**Step 1: Registration**
User navigates to `/login`. Sees a login/register form (Earth Green + Harvest Gold design system). Can create an account with email + password. JWT token stored in localStorage. **Working — real backend auth.**

**Step 2: Create Project**
User clicks "New Project" → 4-step wizard:
1. Basic Info: name, description, project type (7 options), country (US/CA)
2. Location: MapTiler-powered geocoder, click map or search address
3. Boundary: Draw polygon on map or upload KML/GeoJSON
4. Notes: optional free-text fields

**Working — creates real project in PostgreSQL, computes centroid + acreage via PostGIS.**

**Step 3: Map View**
User sees their boundary on a MapTiler basemap (satellite, topo, streets, hybrid). Can toggle between styles. Drawing tools let them place zones, structures, paths, utilities. Design features are saved to localStorage (not synced to backend unless another user is collaborating).

**Working — real map, real drawing. Local-only persistence for design features.**

**Step 4: Site Intelligence**
After boundary is drawn, layerFetcher fires. The user sees a loading spinner, then:
- **Elevation data** loads from USGS 3DEP (US) or NRCan (CA) — **real data**
- **Soil data** loads from SSURGO/LIO — **real data** (partial attributes)
- **Climate data** loads from NOAA/ECCC — **real data**
- **Watershed, wetlands, land cover** load from respective APIs — **real data**
- **Zoning** sometimes loads, sometimes falls back to mock — **mixed**

All 7 layers populate the SiteIntelligencePanel with data rows. Confidence indicators show High/Medium/Low per layer.

**Working — real external API data with mock fallback. User sees real site data for most locations.**

**Step 5: Assessment Scores**
7 scores computed client-side from layer data: Water Resilience, Agricultural Suitability, Regenerative Potential, Buildability, Habitat Sensitivity, Stewardship Readiness, Design Complexity. Each with 0-100 score, rating (Exceptional/Good/Moderate/Low), confidence level, and per-component breakdown.

**Working — real computation, but using stepped thresholds not formal classification systems.**

**Step 6: Dashboards**
14 specialized dashboards show computed metrics from stores + layer data. All compute from real data (no hardcoded demo values since Sprint 9 cleanup). Dashboards for grazing, forestry, hydrology, carbon, etc. all derive from actual site layers + user design features.

**Working — all dashboards render real computed data. Quality depends on layer data availability.**

**Step 7: Financial Modeling**
Economics panel runs 8-engine financial model: cost estimation from structure templates + regional benchmarks, revenue projection, cashflow analysis, break-even calculation, mission scoring. All values are CostRange { low, mid, high }.

**Working — fully functional client-side financial engine with 84.61% test coverage.**

**Step 8: PDF Export**
User can generate 7 export types. Client serializes Zustand stores into payload → sends to backend → Puppeteer renders HTML template → returns PDF URL.

**Working — full Puppeteer pipeline with 7 templates.**

**Step 9: Collaboration**
Multi-user features: invite members with roles (owner/designer/reviewer/viewer), comment on features (threaded, map-pinned), suggest edits with approval workflow, activity feed, real-time presence via WebSocket.

**Working — backend live, WebSocket live. Frontend integration mostly complete.**

**Where the experience breaks:**
- No data persists to server for design features (localStorage only) — if user clears browser data, all design work is lost
- Zoning layer frequently falls back to mock data
- No AI enrichment (feature flag off, stub backend)
- Template marketplace shows hardcoded mock templates
- 3D terrain viewer (Cesium) requires separate token + feature flag

### H5. Top 10 Highest-Leverage Development Tasks

| Rank | Task | Files | Complexity | Unlocks | Dependencies |
|------|------|-------|------------|---------|--------------|
| 1 | **Fix fast-jwt CVEs** | `apps/api/package.json` | 1h | Production-safe authentication | None |
| 2 | **Implement backend sync for projectStore + zoneStore** | `apps/api/src/routes/projects/`, `apps/web/src/store/projectStore.ts`, `zoneStore.ts` | 16h | Multi-device data persistence, no more localStorage data loss | None |
| 3 | **Port SSURGO adapter to backend** | New: `apps/api/src/services/pipeline/adapters/SsurgoAdapter.ts` | 8h | Full soil attribute set (pH, OC, CEC, EC, Ksat), Tier 3 soil-regen auto-trigger | None |
| 4 | **Port USGS 3DEP adapter to backend** | New: `apps/api/src/services/pipeline/adapters/UsgsElevationAdapter.ts` | 6h | Backend DEM storage, automatic Tier 3 terrain analysis trigger | None |
| 5 | **Port NOAA Climate adapter to backend + add PET/aridity** | New: `apps/api/src/services/pipeline/adapters/NoaaClimateAdapter.ts` | 8h | Complete climate profile, Tier 3 microclimate auto-trigger | None |
| 6 | **Wire adapter completion → Tier 3 worker triggers** | `DataPipelineOrchestrator.ts` | 4h | Automatic terrain/microclimate/soil analysis after data fetch | Tasks 3-5 |
| 7 | **Expand computeScores.ts with full soil attributes** | `apps/web/src/lib/computeScores.ts` | 8h | More accurate assessment scores, formal suitability categories | Task 3 |
| 8 | **Set up production deployment (Docker + CI/CD)** | `infrastructure/`, `.github/workflows/`, new Dockerfile | 12h | Deployable application at atlas.ogden.ag | Task 1 |
| 9 | **Implement AI enrichment (ClaudeClient)** | `apps/api/src/services/ai/ClaudeClient.ts`, `routes/ai/` | 8h | Site narratives, design recommendations, flag enrichment | None |
| 10 | **Add ESLint + Prettier configuration** | New: `.eslintrc.cjs`, `.prettierrc.json` | 4h | Code quality enforcement, consistent formatting | None |

**Total estimated development time for Top 10:** ~75 hours of focused development

---

*Audit completed 2026-04-14. All findings based on commit c6f7e1e (main branch).*

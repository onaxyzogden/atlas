# API Backend
**Type:** package
**Status:** active
**Path:** `apps/api/`

## Purpose
Fastify REST API serving project management, data pipeline orchestration, geospatial analysis, authentication, AI chat proxy, and PDF export generation.

## Key Files
- `src/app.ts` — Fastify app factory, plugin/route registration, error handler
- `src/index.ts` — Server entry point (calls `buildApp()` + `.listen()`)
- `src/lib/config.ts` — Zod-validated env vars (DATABASE_URL, JWT_SECRET, S3_*, etc.)
- `src/lib/errors.ts` — AppError, NotFoundError, ForbiddenError, ValidationError
- `src/plugins/database.ts` — PostgreSQL connection pool (`postgres` library)
- `src/plugins/redis.ts` — Redis/ioredis connection (fault-tolerant: API starts without Redis)
- `src/plugins/auth.ts` — JWT verification, `authenticate` preHandler, `req.userId`
- `src/db/migrations/001_initial.sql` — Full schema (12 tables)

## Routes
| Prefix | Module | Key Operations |
|--------|--------|----------------|
| `/api/v1/auth` | `routes/auth/` | register, login, me |
| `/api/v1/projects` | `routes/projects/` | CRUD, boundary upload, assessment, completeness |
| `/api/v1/projects/:id/exports` | `routes/exports/` | PDF export generation + listing |
| `/api/v1/projects/:id/files` | `routes/files/` | File upload/processing |
| `/api/v1/projects/:id/regeneration-events` | `routes/regeneration-events/` | §7 stage-tagged intervention log — list (filters: `eventType`/`interventionType`/`phase`/`since`/`until`/`parentId`), create, patch, delete. Author-or-owner mutation guard. Geometry round-trip via `ST_GeomFromGeoJSON`/`ST_AsGeoJSON::jsonb`. Manual `mapRow()` (not `toCamelCase`) keeps geometry+jsonb handling visible. |
| `/api/v1/layers` | `routes/layers/` | Data layer fetching/refresh |
| `/api/v1/design-features` | `routes/design-features/` | Zone/structure/path CRUD |
| `/api/v1/spiritual` | `routes/spiritual/` | Qibla computation |
| `/api/v1/ai` | `routes/ai/` | Anthropic chat proxy |
| `/api/v1/elevation` | `routes/elevation/` | Terrain queries |
| `/api/v1/gaez` | `routes/gaez/` | FAO GAEZ v4 agro-climatic point queries (self-hosted COGs); **Sprint CB** added `/catalog` (manifest summary for the map-side crop picker) and `/raster/:crop/:waterSupply/:inputLevel/:variable` (COG byte-streaming with HTTP `Range` + 206 Partial Content; manifest-lookup-only path resolution as path-traversal guard). **Sprint CC** gated `/raster/*` behind `fastify.authenticate` as defense-in-depth against anonymous redistribution of FAO CC BY-NC-SA bytes (the NC-license business decision itself remains tracked in `wiki/LAUNCH-CHECKLIST.md`); `/catalog` + `/query` stay public. **Sprint CD** promoted scenario to a first-class dimension: `/raster/:crop/...` became `/raster/:scenario/:crop/:waterSupply/:inputLevel/:variable` (breaking; exactly one caller — `GaezOverlay.rasterUrl` — retrofitted to hardcode `baseline_1981_2010`), and `/query` + `/catalog` accept an optional `?scenario=<id>` filter. Scenario IDs validated against `/^[a-z0-9_]{1,64}$/` as the path-traversal guard. Baseline-only deployments unaffected via the `entry.scenario ?? manifest.climate_scenario ?? 'baseline_1981_2010'` cascade. No RCP bytes ingested yet — reconnaissance committed at `apps/api/data/gaez/futures-inventory.{json,md}` (74 future scenarios enumerated). |
| `/api/v1/pipeline` | `routes/pipeline/` | Data pipeline job management |
| `/api/v1/<slug>` (×28) | `routes/<slug>/` (§§2-29) | Scaffolded stubs from the [[feature-manifest]] pass. Gated by `fastify.requirePhase(…)` — see `src/plugins/featureGate.ts`. Real handlers land in downstream section-implementation sessions. §1 keeps its legacy `routes/projects/` path. §27's import is aliased to `publicPortalSectionRoutes` in `app.ts` to avoid colliding with the legacy `/api/v1/portal` public endpoint. |

## Patterns
- **Route registration:** Async function exports, `const { db, authenticate } = fastify;`
- **Database:** Raw SQL via `postgres` template literals (no ORM). Parameterized `${value}` syntax.
- **Auth:** `preHandler: [authenticate]`, sets `req.userId`
- **Response envelope:** `{ data, meta, error }` on every response
- **Ownership:** Always JOIN projects + check `owner_id = req.userId`
- **Geometry:** PostGIS functions — `ST_AsGeoJSON()`, `ST_GeomFromGeoJSON()`, `ST_Transform()`

## Services
- `services/gaez/GaezRasterService.ts` — Self-hosted FAO GAEZ v4 COG point-query (geotiff.js byte-range reads, local FS or S3 HTTPS). Manifest-driven; disabled cleanly if no manifest present. See `scripts/ingest-gaez.md`. **Sprint BZ + CA:** FAO uses a **two-sentinel convention** on each raster pair: (1) the standard GDAL NoData (`-9` on yield, `0` on suitability) marks truly-off-raster pixels and flows through `geotiff.js` as `null`; (2) an in-band second sentinel (`-1` on yield, `9` on suitability) marks "pixel is on-raster but not viable for this crop" (deserts, ice, water). Sprint BZ's classifier handles both: `yield null/<0` → `UNKNOWN`, suitability code `9` with `yield >= 0` → `WATER`. Sprint CA probed the conversion (`convert-gaez-to-cog.ts`) and confirmed `-a_nodata` IS preserved from source through COG — the `-1` values Sprint BZ observed are FAO semantics, not an ingest defect, so no code change needed. The `yield < 0` guard is load-bearing, not defensive scaffolding. **Sprint CD** added `scenario` as the first argument of `resolveLocalFilePath(scenario, crop, waterSupply, inputLevel, variable)` and made it an optional filter on `query(lat, lng, scenario?)` and `getManifestEntries(scenario?)`. Manifest entries gained an optional `scenario?: string` field; lookup cascades `entry.scenario ?? manifest.climate_scenario ?? 'baseline_1981_2010'` so pre-Sprint-CD manifests keep working. The composite key `${crop}_${ws}_${il}:${scenario}` is only used when scenario is non-baseline — baseline keeps the legacy `${crop}_${ws}_${il}` shape.
- `scripts/download-gaez.ts` (Sprint BY) — Automated raster acquisition via FAO's `res05` ArcGIS Image Service. Resolves 94/96 target rasters through `/query` calls, streams direct S3 `.tif`s into `data/gaez/raw/`. Replaces 96 manual Data Viewer clicks. Idempotent; supports `--filter`, `--dry-run`, `--concurrency`. `npm run download:gaez`.
- `scripts/enumerate-gaez-futures.ts` (Sprint CD) — One-shot reconnaissance script that enumerates every (rcp, model, year) tuple FAO's ArcGIS ImageServer publishes for Theme 4 beyond the 1981-2010 baseline. Emits `data/gaez/futures-inventory.{json,md}` — 74 future scenarios (72 RCP = 4 RCP × 6 GCM × 3 periods, plus 2 historical CRUTS32 baselines). Every future scenario shows 12 crop gaps vs our 96-cell target grid because FAO only publishes the High input-level series for futures. Pure helpers (`extractEmissions`, `computeScenarioId`, `computeCompleteness`) are unit-tested in `enumerate-gaez-futures.test.ts`; the live-query main is side-effect-only. `npm run enumerate:gaez-futures`.
- `scripts/convert-gaez-to-cog.ts` — **Sprint CD** added a `--scenario <id>` flag (default `baseline_1981_2010`, validated against `/^[a-z0-9_]{1,64}$/`). Every emitted manifest entry carries its `scenario` field; non-baseline scenarios generate composite manifest keys; baseline keeps the legacy key shape for backward compatibility.
- `services/pdf/` — Puppeteer browser manager + PdfExportService + 7 HTML templates
- `services/storage/StorageProvider.ts` — S3 or local filesystem abstraction
- `services/pipeline/DataPipelineOrchestrator.ts` — BullMQ job queue (tier1, tier3 workers)
- `services/ai/ClaudeClient.ts` — Anthropic API wrapper (mostly stubbed)
- `services/terrain/` — Terrain analysis service
- `services/files/` — File processing (KML, GeoJSON, photos, soil tests)

## Dependencies
Key: fastify, postgres, puppeteer, @aws-sdk/client-s3, bullmq, ioredis, zod, bcryptjs, pino

## Current State
All 16+ routes functional. PDF export service complete. Data pipeline orchestration works but adapters are stubbed. AI enrichment stubbed.

Vitest suite: **548 tests / 50 files** green (as of 2026-05-17).

## Testing harness (read before adding api tests)

`src/tests/helpers/testApp.ts` is a **faithful postgres.js double**, not a
naive stub (reworked 2026-05-17, see
`decisions/2026-05-17-atlas-faithful-postgres-test-mock.md`):

- A tagged-template call `db`…`` returns a **lazy `PendingQuery`**. The
  next queued row-set is shifted **only on `await`** (`.then`). Embedding
  a `db`…`` fragment as an interpolation value (`WHERE ${userFilter}`,
  `INSERT … ${locationExpr}`) does **not** await it → it consumes
  **nothing**. This mirrors real postgres.js.
- Helper calls — dynamic `db(value)`, `db.json`, `db.array`, `db.typed` —
  return an inert `SQL_FRAGMENT` and consume nothing. `db.unsafe`
  executes; `db.begin(cb)` runs `cb` with the same handle.
- **Write fixtures against the real query sequence**, not against
  eager-mock artefacts. Do **not** `enqueue()` a row for an embedded
  sub-fragment or a `db.json(...)` — that re-introduces the off-by-one
  that produced 10 of 11 failures in the 2026-05-17 cleanup.
- `mockDb` is typed `MockDb`, deliberately **not** assignable to
  `postgres.Sql`, so the `// @ts-expect-error — mock` directive each test
  places before `fastify.decorate('db', mockDb)` stays "used". A bare
  `: any` silently breaks `@ogden/api typecheck` with TS2578 — do not.

**Validation parsing:** per-route parsing of `@ogden/shared` schemas must
use the `safeParse`→`ValidationError` precedent
(`routes/relationships/index.ts`, `routes/telemetry/index.ts`), **not**
bare `.parse()`: shared can resolve a different `zod` instance, so a
thrown `ZodError` misses `instanceof ZodError` in the global handler and
escapes as a 500. Codebase-wide validation status is **422**.

**Known latent issue:** `app.ts` registers `setNotFoundHandler` /
`setErrorHandler` *after* the route plugins, so Fastify's default handler
serves route errors (status codes survive via `AppError.statusCode`, but
the response envelope is the default shape, not `{data:null,error:{…}}`).

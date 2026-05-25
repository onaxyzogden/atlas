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

Error handling (2026-05-17, commit `6ac716b4`): the custom `setNotFoundHandler` / `setErrorHandler` in `src/app.ts` are now registered **before** the route plugins, so all route contexts return the app envelope `{data:null,error:{code,message}}` — `AppError` (with `details`), `ZodError` → `VALIDATION_ERROR` 422, everything else → `INTERNAL_ERROR`. Previously they were registered after the routes and Fastify's default handler served route contexts (correct status, wrong body shape). See `decisions/2026-05-17-atlas-error-handler-ordering.md`.

Tests: **550/550** passing in `@ogden/api` (Vitest, 50 files). The suite is **mock-DB by design** — `vitest.config.ts` hardcodes a dummy `DATABASE_URL` and every test `vi.mock`s the database plugin with an in-process FIFO queue; no real Postgres/PostGIS is ever consulted. The long-recurring "~11 fail without a provisioned test DB" note was **false** (provisioning a DB changes nothing); those 11 were mock-harness deficiencies, closed 2026-05-17 by the lazy-thenable mock upgrade (`tests/helpers/testApp.ts` shifts the queue only when a query is awaited, mirroring real `postgres`; non-awaited SQL fragments no longer drain it; `+.json`/`.begin`). See `decisions/2026-05-17-atlas-mock-db-lazy-thenable.md`.

The deferred real-DB harness now exists as an **opt-in** suite alongside the fast mock suite (which is byte-identical: 550/550, no container). `corepack pnpm --filter @ogden/api test:integration` runs 4 `*.pgtest.ts` against a single `postgis/postgis:16-3.4` testcontainer (geodetic boundary acreage, `SiteAssessmentWriter` single-`is_current`+debounce, telemetry swallowed per-event FK 23503, regeneration-events SRID round-trip + RBAC). Docker absent or container-start failure → **green-skip, never red** (sentinel JSON in `tmpdir` bridges Vitest `globalSetup` → forked workers). `migrate.ts` now exports a shared `runMigrations(sql)`. Branch `claude/pgtest-testcontainers` (`ee58e371`). See `decisions/2026-05-17-atlas-pgtest-testcontainers-suite.md`. **CI-gated since 2026-05-25** — no longer local-only; see the strict-mode entry below.

`project_type` enum-conformance fix (2026-05-25, `feat/atlas-permaculture`, `4ab1e52d`): builtin seeds `029_builtin_three_streams_farm.sql` and `032_builtin_apricot_lane_citrus.sql` inserted `project_type='farm'`, which is **not** in the `ProjectSummary` Zod `ProjectType` enum (`regenerative_farm | retreat_center | homestead | educational_farm | conservation | multi_enterprise | moontrance`). The column is plain `text` with no DB constraint, so the value persisted silently — but the **public** `GET /projects/builtins` and `GET /projects` both `ProjectSummary.parse` every row (`routes/projects/index.ts:75`, `:205`) and threw a `ZodError` → **422** for any list containing those two builtins. The web client's `initialSync` only `console.error`s and falls back to local data, so server sync had been silently dead; critically this also blocked the `FLAGS.SYNC_STATE_BLOBS` hydration path (`hydrateProjectStateBlobs` runs later in the same `initialSync` try-block that step 1 aborted). Fix: corrected both seeds to `'regenerative_farm'` (fresh DBs) + new forward migration `042_fix_farm_project_type.sql` (`UPDATE projects SET project_type='regenerative_farm' WHERE project_type='farm'`) for already-migrated DBs. New `builtins-project-type.pgtest.ts` proves the corrected type → 200, reproduces the legacy-`'farm'` 422, and runs the real 042 file to repair → 200. Prerequisite for the blob-sync flag's hydration to work end-to-end ([[concepts/local-first-architecture]]). A pre-existing fixture bug surfaced during verification (shared `seedProject` in `tests/integration/fixtures.ts` omits `org_id`, which migration 036 made NOT NULL — fails 7 unrelated pgtests; flagged for separate fix).

pgtest fixture `org_id` fix (2026-05-25, `feat/atlas-permaculture`): closed the fixture bug flagged above. `seedProject` (`tests/integration/fixtures.ts:29`) now provisions an organization internally via the existing `seedOrganization(sql)` helper when no org is supplied and inserts `org_id`, satisfying migration `036_org_id_required_on_projects.sql`'s NOT NULL constraint; an optional `orgId` opt was also added for callers that want to share one. No existing callers (boundary, replay-evidence-audit, site-assessment-writer, regeneration-events, telemetry-client-errors, telemetry-act-interactions) needed edits — least-disruptive Option (a). Full suite verified against a live `postgis/postgis:16-3.4` container: **7 files / 12 tests green** (was 7 red at insert time). Redis `ECONNREFUSED:6379` log noise is environmental and assertion-independent — left untouched.

Integration suite CI-gated (2026-05-25, `feat/atlas-permaculture`): new workflow `.github/workflows/api-integration.yml` runs `test:integration` on `pull_request` + `push` (path-filtered `apps/api/**`, `packages/shared/**`, lockfile, the workflow) on ubuntu-latest (Docker preinstalled → testcontainers works). Adds a **strict mode**: `globalSetup.ts` now reads `PGTEST_REQUIRE_DB` and, when set (CI sets `=1`), **throws** on Docker-unavailable / container-start-failure instead of green-skipping — so a CI run can never silently test nothing (the whole point: the `org_id` regression above could never slip through green). Default (flag unset) keeps the local green-skip. `test:integration` added to `turbo.json` with `cache:false`. Verified locally: strict mode + Docker up → 12/12 green; strict mode + Docker forced-unavailable (`DOCKER_HOST=tcp://127.0.0.1:1`) → red exit 1 with the guard message. The workflow runs the suite via the pnpm filter (esbuild, **no `tsc`**); the fast mock `test` suite and `lint` remain ungated (deferred — no PR CI exists for them). A pre-existing `tsc` error at `builtins-project-type.pgtest.ts:112` is unaffected by this workflow. See `decisions/2026-05-25-atlas-pgtest-ci-gating-strict-mode.md`.

`lint` (tsc) restored to green (2026-05-25, `feat/atlas-permaculture`, `34c146e4`): the pre-existing `builtins-project-type.pgtest.ts:112` error flagged above is fixed. Under `noUncheckedIndexedAccess`, `const [{ count }] = await sql<{count:string}[]>...` typed the first element `{count}|undefined` → TS2339. Switched to `const [row]` + `row!.count`, matching the `row!.id` non-null-assertion idiom already used in-file and in `fixtures.ts`. Test-only, no behavior change; `corepack pnpm --filter @ogden/api lint` now exits 0. See [[log/2026-05-25-builtins-pgtest-tsc-row-guard-fix]].

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
| `/api/v1/layers` | `routes/layers/` | Data layer fetching/refresh |
| `/api/v1/design-features` | `routes/design-features/` | Zone/structure/path CRUD |
| `/api/v1/spiritual` | `routes/spiritual/` | Qibla computation |
| `/api/v1/ai` | `routes/ai/` | Anthropic chat proxy |
| `/api/v1/elevation` | `routes/elevation/` | Terrain queries |
| `/api/v1/gaez` | `routes/gaez/` | FAO GAEZ v4 agro-climatic point queries (self-hosted COGs) |
| `/api/v1/pipeline` | `routes/pipeline/` | Data pipeline job management |

## Patterns
- **Route registration:** Async function exports, `const { db, authenticate } = fastify;`
- **Database:** Raw SQL via `postgres` template literals (no ORM). Parameterized `${value}` syntax.
- **Auth:** `preHandler: [authenticate]`, sets `req.userId`
- **Response envelope:** `{ data, meta, error }` on every response
- **Ownership:** Always JOIN projects + check `owner_id = req.userId`
- **Geometry:** PostGIS functions — `ST_AsGeoJSON()`, `ST_GeomFromGeoJSON()`, `ST_Transform()`

## Services
- `services/gaez/GaezRasterService.ts` — Self-hosted FAO GAEZ v4 COG point-query (geotiff.js byte-range reads, local FS or S3 HTTPS). Manifest-driven; disabled cleanly if no manifest present. See `scripts/ingest-gaez.md`.
- `scripts/download-gaez.ts` (Sprint BY) — Automated raster acquisition via FAO's `res05` ArcGIS Image Service. Resolves 94/96 target rasters through `/query` calls, streams direct S3 `.tif`s into `data/gaez/raw/`. Replaces 96 manual Data Viewer clicks. Idempotent; supports `--filter`, `--dry-run`, `--concurrency`. `npm run download:gaez`.
- `services/pdf/` — Puppeteer browser manager + PdfExportService + 7 HTML templates
- `services/storage/StorageProvider.ts` — S3 or local filesystem abstraction
- `services/pipeline/DataPipelineOrchestrator.ts` — BullMQ job queue (tier1, tier3 workers)
- `services/ai/ClaudeClient.ts` — Anthropic API wrapper (mostly stubbed)
- `services/terrain/` — Terrain analysis service
- `services/files/` — File processing (KML, GeoJSON, photos, soil tests)

## Dependencies
Key: fastify, postgres, puppeteer, @aws-sdk/client-s3, bullmq, ioredis, zod, bcryptjs, pino

## Current State
All 16+ routes functional. PDF export service complete. Data pipeline orchestration works but adapters are stubbed. AI enrichment stubbed. No tests.

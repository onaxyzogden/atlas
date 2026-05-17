# 2026-05-17 — Backend acreage integrity (Full hardening): FeatureCollection → PostGIS + applyServerAcreage clobber guard

**Status:** Accepted · `feat/atlas-permaculture` · landed in commit `ddb7e0e4`
**Scope:** new [packages/shared/src/lib/geojsonGeometry.ts](packages/shared/src/lib/geojsonGeometry.ts) · [packages/shared/src/index.ts](packages/shared/src/index.ts) · [packages/shared/src/schemas/project.schema.ts](packages/shared/src/schemas/project.schema.ts) · [apps/api/src/routes/projects/index.ts](apps/api/src/routes/projects/index.ts) · [apps/api/src/routes/templates/index.ts](apps/api/src/routes/templates/index.ts) · [apps/web/src/lib/syncService.ts](apps/web/src/lib/syncService.ts) · tests (shared `geojsonGeometry.test.ts`, api `boundary.test.ts`, web `syncService.test.ts`)
**Builds on:** [[2026-05-16-atlas-parcel-integrity-guard]] (that ADR makes the integrity guarantee hold *offline*; this one closes the *online* hole it explicitly deferred)

## Context

The P0 integrity guard guarantees an unknown/zero parcel area can never present as "0 ha · Supported" — but only offline. Online, two independent root causes still produced a confident zero:

1. **Backend FeatureCollection → NULL.** `POST /api/v1/projects/:id/boundary` and the template-instantiate path passed the client's raw GeoJSON straight into PostGIS `ST_GeomFromGeoJSON`. The web client persists boundaries as a **`FeatureCollection`**; `ST_GeomFromGeoJSON` accepts only a bare **Geometry**, so it returned `NULL` → `parcel_boundary` NULL → `ST_Area(NULL)` → server `acreage = 0`.
2. **Frontend clobber.** `applyServerAcreage` only rejected non-finite/non-number values — it **accepted `0`** — and overwrote the canonical client-computed geodesic `parcelAcreage()` with the bogus server `0`.

User-approved scope (AskUserQuestion): **Full hardening** — backend root-cause fix at both call sites via one shared helper + `applyServerAcreage` `<= 0` guard + tighten the shared Zod schema to reject malformed/non-GeoJSON bodies at the API boundary.

**Amanah Gate:** Passed — data-integrity / honesty fix for a halal land-stewardship tool. No riba/gharar.

## Decision

- **`packages/shared/src/lib/geojsonGeometry.ts`** (new): `extractPolygonalGeometry(input): Polygon | MultiPolygon | null` — pure GeoJSON tree-walk (no geometry math; PostGIS still computes area). Unwraps FeatureCollection / Feature / GeometryCollection, keeps only Polygon/MultiPolygon, merges multiple polygons into a single MultiPolygon, returns `null` (never throws) when nothing extractable. Exported from `index.ts`.
- **`project.schema.ts`** — `parcelBoundaryGeojson: z.unknown()` replaced with a shape-only Zod union (`FeatureCollection | Feature | Polygon | MultiPolygon`); rejects non-GeoJSON at the API boundary. Exported as `ParcelBoundaryGeojson`.
- **Both backend call sites** (`projects` `/boundary`, `templates` `/instantiate`) normalize via `extractPolygonalGeometry` before SQL. When extraction yields nothing: the boundary route throws a `ValidationError` (4xx); the template path **skips** the geom/acreage UPDATE leaving `parcel_boundary` NULL — **never writes a confident acreage 0**. The NULL self-heals on the next client boundary re-sync.
- **`applyServerAcreage`** (`syncService.ts`) guard tightened to `acreage <= 0` rejection; exported for unit testing.

## Why

- **One shared normalizer, two call sites.** Both ingestion paths share the identical PostGIS constraint; one pure helper (no turf — none in api/shared) covers both and is unit-testable in isolation.
- **Never write a confident 0.** Mirrors the offline "Insufficient Data" honesty: absence of a valid area must read as absence, not as zero.
- **Defense in depth.** Schema rejects junk at the boundary; normalizer handles valid-but-wrapped GeoJSON; the `<= 0` frontend guard is the last line so a server 0 (from any cause) can never clobber the canonical client acreage.

## How to apply

Any new PostGIS geometry-ingestion path must run client GeoJSON through `extractPolygonalGeometry` first and must skip/4xx rather than persist acreage 0 on extraction failure. Any new server→client acreage write must reject non-positive values.

## Consequences

- A client `FeatureCollection` boundary now yields a correct positive server acreage online (both paths). Malformed bodies are rejected at the API boundary. Bug-zeroed rows (NULL `parcel_boundary`) self-heal on next re-sync — no DB backfill possible.
- `design-features` route's `ST_GeomFromGeoJSON` uses are bare geometries — verified untouched, out of scope.

## Verification

- `@ogden/shared` tests: 201 passed incl. 9 new `geojsonGeometry` (FeatureCollection→Polygon/MultiPolygon, multi-feature merge, bare-geometry passthrough, junk→null, schema accept/reject). `tsc --noEmit` clean.
- `@ogden/api`: `tsc --noEmit` clean; boundary route's pre-DB "no polygonal geometry" rejection passes (4xx before any DB call). Integration tests that build the full app (`boundary`/`projects`/`smoke`/`telemetry`, 11) fail **on baseline with my changes stashed too** — pre-existing mock-db-queue breakage from the co-landed durable-syncService (blob) work, not introduced here.
- `@ogden/web`: `syncService.test.ts` 12 passed incl. 3 new `applyServerAcreage` guard cases. Web `tsc --noEmit` has one remaining error — `syncService.ts:765 'd.store' possibly undefined` — located in the co-landed blob-sync `SYNCED_STORES` descriptor loop (confirmed outside the acreage guard: stashing only `syncService.ts` removed line 765 entirely). Flagged to the blob-sync owner; not fixed here to avoid undiscussed edits to another contributor's just-landed code.
- Branch rebased out-of-band mid-session (`4f7b04be`→`ddb7e0e4`); all acreage-hardening files were folded into `ddb7e0e4` alongside the blob-sync work. Working tree clean; no manual push.

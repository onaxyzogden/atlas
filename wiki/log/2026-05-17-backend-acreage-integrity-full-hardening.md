# 2026-05-17 — Backend acreage integrity (Full hardening)


Closed the online hole the P0 guard deferred. Root causes: (1) both backend
boundary-ingestion paths fed the client's raw GeoJSON **FeatureCollection**
to PostGIS `ST_GeomFromGeoJSON` (bare-Geometry only) → NULL → `ST_Area(NULL)`
→ server `acreage 0`; (2) `applyServerAcreage` accepted `0`, clobbering the
canonical client geodesic acreage. User scope (AskUserQuestion): **Full
hardening**. New pure shared `lib/geojsonGeometry.ts` `extractPolygonalGeometry`
(no turf; FC/Feature/GeometryCollection walk, polygon→MultiPolygon merge,
`null`/no-throw on nothing) exported from `index.ts`; `project.schema.ts`
`parcelBoundaryGeojson` tightened `z.unknown()`→shape-only GeoJSON union;
both `projects` `/boundary` (4xx) and `templates` `/instantiate` (skip
UPDATE, NULL self-heals) normalize before SQL — never write acreage 0;
`syncService.applyServerAcreage` guard → `<= 0`, exported for test.
Verified: `@ogden/shared` 201 tests (9 new geojsonGeometry) + tsc clean;
`@ogden/api` tsc clean + pre-DB rejection passes (the 11 build-app
integration fails are pre-existing mock-db breakage from the co-landed
durable-syncService blob work — reproduced on baseline with my changes
stashed); `@ogden/web` syncService 12/12 (3 new guard cases). One remaining
web tsc error `syncService.ts:765 'd.store' undefined` sits in the co-landed
blob-sync `SYNCED_STORES` loop (outside the acreage guard — confirmed by
stash); flagged to its owner, not fixed here (no undiscussed edits to
another contributor's just-landed code). Branch rebased out-of-band
mid-session (`4f7b04be`→`ddb7e0e4`); all acreage-hardening files folded
into commit `ddb7e0e4` alongside the blob-sync work. Working tree clean; no
manual push. New ADR `decisions/2026-05-17-atlas-backend-acreage-hardening.md`
+ index pointer + `entities/web-app.md` Current State updated.

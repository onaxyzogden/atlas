# 2026-05-10 — Phase 4.5: BE kinds wired into annotation geometry registry


`apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts`
now dispatches geometry-only mutations for the 8 Built-Environment
annotation kinds that were missing from `POINT_KINDS`,
`LINESTRING_KINDS`, and `POLYGON_KINDS`:

- **Points (drag-reposition):** `well`, `gate` — routed to V1 facade
  `updateWell` / `updateGate` with the new `position`.
- **Lines (vertex-edit):** `powerLine`, `buriedUtility`, `fence`,
  `existingDriveway` — routed to V1 facade `update<X>` with `geometry`
  + `lengthM` recomputed via `turf.length(...)` (matches the
  `accessRoad` precedent that cached length stays in sync with the
  shape).
- **Polygons (vertex-edit):** `building`, `septic` — routed with
  `geometry` + `areaM2` recomputed via `turf.area(...)`.

Matching `readPointPosition` / `readLineString` / `readPolygon`
selectors added so the drag handler + direct-select hook can fetch
the live shape before mutation. Single-file edit, +112 LOC,
self-contained.

Phase 4.5 of the V2 unification ADR
`2026-05-10-atlas-built-environment-unification.md`. Commit `62980eb`.

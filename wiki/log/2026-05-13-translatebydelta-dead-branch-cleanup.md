# 2026-05-13 — `translateByDelta` dead-branch cleanup


**Closed.** The generic-over-all-Geometry signature
`translateByDelta<G extends GeoJSON.Geometry>` carried three
unreachable `Multi*` branches plus a `default: return geom;`
fall-through. No call site ever produces MultiPoint, MultiLineString,
or MultiPolygon — Atlas's drawing modes and seed data only emit
Point / LineString / Polygon, and `writeRecordGeometry` already
guards on `geom.type === 'Polygon'` before persisting.

**Changes.**
- `apps/web/src/v3/plan/layers/translateGeometry.ts` — narrowed the
  generic constraint to `Point | LineString | Polygon` and removed
  the three Multi* `case` arms plus the `default` clause. Updated
  the jsdoc to reflect "the geometry types Atlas actually places."
- `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` — narrowed the
  polygon-drag `DragState.origGeom` from `GeoJSON.Geometry` to
  `GeoJSON.Polygon`, and tightened `readRecordGeometry`'s return
  type from `Geometry | null` to `Polygon | null` via a small
  `asPolygon` type guard (zone/crop record geometries are schema-
  typed `Polygon | MultiPolygon`; only Polygons participate in
  drag, matching the existing `writeRecordGeometry` guard).

**Verification.** `tsc --noEmit -p apps/web` exits 0. No runtime
behaviour change — the deleted branches were unreachable; the
new guard mirrors a write-side guard that already existed.

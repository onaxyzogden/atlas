/**
 * Polygonal-geometry extraction for PostGIS ingestion.
 *
 * PostGIS `ST_GeomFromGeoJSON` accepts only a bare Geometry — never a
 * Feature or FeatureCollection. The web client persists boundaries as a
 * `FeatureCollection`, so the raw payload must be normalized to a single
 * Polygon/MultiPolygon Geometry before it reaches SQL, or the geometry
 * silently becomes NULL and acreage collapses to a confident 0.
 *
 * Pure GeoJSON tree-walking — no geometry math. PostGIS still computes area.
 */

type Position = number[];

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

export type PolygonalGeometry = PolygonGeometry | MultiPolygonGeometry;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isPositionRing(v: unknown): v is Position[][] {
  return Array.isArray(v);
}

/** Collect every Polygon/MultiPolygon geometry reachable from `input`. */
function collectPolygons(input: unknown, out: PolygonalGeometry[], depth = 0): void {
  if (depth > 8 || !isObject(input)) return;
  const type = input.type;

  if (type === 'FeatureCollection' && Array.isArray(input.features)) {
    for (const f of input.features) collectPolygons(f, out, depth + 1);
    return;
  }
  if (type === 'Feature') {
    collectPolygons(input.geometry, out, depth + 1);
    return;
  }
  if (type === 'GeometryCollection' && Array.isArray(input.geometries)) {
    for (const g of input.geometries) collectPolygons(g, out, depth + 1);
    return;
  }
  if (type === 'Polygon' && isPositionRing(input.coordinates)) {
    out.push({ type: 'Polygon', coordinates: input.coordinates as Position[][] });
    return;
  }
  if (type === 'MultiPolygon' && Array.isArray(input.coordinates)) {
    out.push({ type: 'MultiPolygon', coordinates: input.coordinates as Position[][][] });
  }
}

/**
 * Normalize any GeoJSON-ish value to a single Polygon/MultiPolygon Geometry
 * suitable for `ST_GeomFromGeoJSON`. Returns `null` (never throws) when no
 * polygonal geometry can be extracted — callers must NOT write a confident
 * acreage 0 in that case.
 */
export function extractPolygonalGeometry(input: unknown): PolygonalGeometry | null {
  const polys: PolygonalGeometry[] = [];
  collectPolygons(input, polys, 0);
  const first = polys[0];
  if (!first) return null;
  if (polys.length === 1 && first.type === 'Polygon') return first;

  const coordinates: Position[][][] = [];
  for (const p of polys) {
    if (p.type === 'Polygon') coordinates.push(p.coordinates);
    else coordinates.push(...p.coordinates);
  }
  const onlyPoly = coordinates[0];
  if (!onlyPoly) return null;
  if (coordinates.length === 1) return { type: 'Polygon', coordinates: onlyPoly };
  return { type: 'MultiPolygon', coordinates };
}

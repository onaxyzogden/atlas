// geometry.schema.ts
//
// Minimal GeoJSON geometry shape used by OLOS records that may carry a
// spatial reference (observation point, plan area, task footprint). Kept
// permissive on coordinates — PostGIS validates the real shape on persist;
// the frontend just needs round-trip safety.

import { z } from 'zod';

export const GeoJSONGeometryType = z.enum([
  'Point',
  'LineString',
  'Polygon',
  'MultiPoint',
  'MultiLineString',
  'MultiPolygon',
  'GeometryCollection',
]);
export type GeoJSONGeometryType = z.infer<typeof GeoJSONGeometryType>;

export const GeoJSONGeometrySchema: z.ZodType<{
  type: GeoJSONGeometryType;
  coordinates?: unknown;
  geometries?: unknown;
}> = z.object({
  type: GeoJSONGeometryType,
  coordinates: z.unknown().optional(),
  geometries: z.unknown().optional(),
});
export type GeoJSONGeometry = z.infer<typeof GeoJSONGeometrySchema>;

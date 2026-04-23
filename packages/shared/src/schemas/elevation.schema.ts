/**
 * Elevation profile — sample a LineString against the terrain COG to produce
 * distance/elevation pairs for the cross-section chart surface under §2.
 */
import { z } from 'zod';

// Minimal LineString schema — [ [lng, lat], ... ] with 2..256 vertices.
const LineStringGeometry = z.object({
  type: z.literal('LineString'),
  coordinates: z
    .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
    .min(2)
    .max(256),
});

export const ElevationProfileRequest = z.object({
  projectId: z.string(),
  geometry: LineStringGeometry,
  sampleCount: z.number().int().min(2).max(512).optional(),
});
export type ElevationProfileRequest = z.infer<typeof ElevationProfileRequest>;

export const ElevationProfileSample = z.object({
  distanceM: z.number(),
  elevationM: z.number().nullable(),
  lng: z.number(),
  lat: z.number(),
});
export type ElevationProfileSample = z.infer<typeof ElevationProfileSample>;

export const ElevationProfileResponse = z.object({
  projectId: z.string(),
  totalDistanceM: z.number(),
  minM: z.number().nullable(),
  maxM: z.number().nullable(),
  meanM: z.number().nullable(),
  reliefM: z.number().nullable(),
  samples: z.array(ElevationProfileSample),
  sourceApi: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
});
export type ElevationProfileResponse = z.infer<typeof ElevationProfileResponse>;

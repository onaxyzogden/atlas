import { z } from 'zod';
import { ConfidenceLevel } from './confidence.schema.js';

// Section 2 — Base Map, Imagery & Terrain Visualization
//
// Response envelope for `GET /api/v1/basemap-terrain/:projectId`. Surfaces
// the `terrain_analysis` row (DEM-derived slope/aspect/curvature/TPI/TWI/TRI/
// viewshed/frost) alongside the basemap style catalog and layer catalog the
// UI consumes to populate its map controls.

export const BasemapStyle = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  kind: z.enum(['satellite', 'aerial', 'topographic', 'street', 'hybrid']),
});
export type BasemapStyle = z.infer<typeof BasemapStyle>;

export const VectorOverlay = z.object({
  key: z.string(),
  label: z.string(),
  layerType: z.string(),
  available: z.boolean(),
});
export type VectorOverlay = z.infer<typeof VectorOverlay>;

export const SlopeAspect = z.object({
  slopeMinDeg: z.number(),
  slopeMaxDeg: z.number(),
  slopeMeanDeg: z.number(),
  slopeClass: z.enum(['flat', 'gentle', 'moderate', 'steep', 'very_steep']),
  aspectDominant: z.string().nullable(),
  slopeHeatmapUrl: z.string().nullable(),
  aspectHeatmapUrl: z.string().nullable(),
});
export type SlopeAspect = z.infer<typeof SlopeAspect>;

export const TerrainFeatures = z.object({
  tpiDominantClass: z.string().nullable(),
  twiDominantClass: z.string().nullable(),
  triMeanM: z.number().nullable(),
  triDominantClass: z.string().nullable(),
  curvatureProfileMean: z.number().nullable(),
  curvaturePlanMean: z.number().nullable(),
  frostPocketAreaPct: z.number().nullable(),
  frostPocketSeverity: z.enum(['high', 'medium', 'low', 'none']).nullable(),
  coldAirRiskRating: z.enum(['high', 'medium', 'low', 'none']).nullable(),
});
export type TerrainFeatures = z.infer<typeof TerrainFeatures>;

export const Viewshed = z.object({
  observerSet: z.boolean(),
  visiblePct: z.number().nullable(),
  hasGeojson: z.boolean(),
});
export type Viewshed = z.infer<typeof Viewshed>;

export const MeasurementEndpoints = z.object({
  distance: z.string(),
  area: z.string(),
  elevation: z.string(),
  crossSection: z.string(),
});
export type MeasurementEndpoints = z.infer<typeof MeasurementEndpoints>;

export const BasemapTerrainSummary = z.object({
  elevation: z.object({
    minM: z.number().nullable(),
    maxM: z.number().nullable(),
    meanM: z.number().nullable(),
    reliefM: z.number().nullable(),
    hasContours: z.boolean(),
  }),
  slopeAspect: SlopeAspect.optional(),
  terrainFeatures: TerrainFeatures.optional(),
  viewshed: Viewshed.optional(),
  basemapStyles: z.array(BasemapStyle),
  vectorOverlays: z.array(VectorOverlay),
  mapModes: z.array(z.enum(['2d', '2.5d', '3d'])),
  measurementEndpoints: MeasurementEndpoints,
  confidence: ConfidenceLevel,
  dataSources: z.array(z.string()),
  computedAt: z.string().nullable(),
});
export type BasemapTerrainSummary = z.infer<typeof BasemapTerrainSummary>;

export const BasemapTerrainResponse = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ready'),
    projectId: z.string().uuid(),
    summary: BasemapTerrainSummary,
  }),
  z.object({
    status: z.literal('not_ready'),
    projectId: z.string().uuid(),
    reason: z.enum([
      'no_boundary',
      'terrain_pending',
      'terrain_failed',
    ]),
  }),
]);
export type BasemapTerrainResponse = z.infer<typeof BasemapTerrainResponse>;

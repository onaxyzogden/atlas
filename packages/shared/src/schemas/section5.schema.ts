import { z } from 'zod';
import { ConfidenceLevel } from './confidence.schema.js';

// Section 5 — Hydrology & Water Systems Planning
// Shape of the `GET /api/v1/hydrology-water/:projectId` response, mirroring
// the `summary_data` written by `WatershedRefinementProcessor` into
// `project_layers.watershed_derived`. The GeoJSON overlay is surfaced as a
// FeatureCollection alongside the scalar summary so the client can render
// flow accumulation, watershed divides, flood detention zones, and
// pond/swale candidates without a second fetch.

const LonLat = z.tuple([z.number(), z.number()]);

export const FloodDetentionZone = z.object({
  location: LonLat,
  cellCount: z.number().int().nonnegative(),
  meanElevation: z.number(),
  maxDepth: z.number(),
});

export const PondCandidate = z.object({
  location: LonLat,
  cellCount: z.number().int().nonnegative(),
  meanSlope: z.number(),
  meanAccumulation: z.number(),
  suitabilityScore: z.number(),
});

export const SwaleCandidate = z.object({
  start: LonLat,
  end: LonLat,
  lengthCells: z.number().int().nonnegative(),
  meanSlope: z.number(),
  elevation: z.number(),
  suitabilityScore: z.number(),
});

export const HydrologyWaterSummary = z.object({
  runoff: z.object({
    maxAccumulation: z.number(),
    meanAccumulation: z.number(),
    highConcentrationPct: z.number(),
  }),
  flood: z.object({
    detentionZoneCount: z.number().int().nonnegative(),
    detentionAreaPct: z.number(),
    zones: z.array(FloodDetentionZone),
  }),
  drainageDivides: z.object({
    divideCount: z.number().int().nonnegative(),
    divideCellPct: z.number(),
  }),
  pondCandidates: z.object({
    candidateCount: z.number().int().nonnegative(),
    candidates: z.array(PondCandidate),
  }),
  swaleCandidates: z.object({
    candidateCount: z.number().int().nonnegative(),
    candidates: z.array(SwaleCandidate),
  }),
  drainageDensity: z.object({
    drainageDensityKmPerKm2: z.number(),
    drainageDensityClass: z.string(),
  }),
  // Wetland & riparian planning — optional block. Derived from the
  // `wetlands_flood` layer (NWI + FEMA NFHL); omitted when that layer
  // is absent or incomplete. Buffer/setback recommendations are rule-based
  // lookups (wetland system type + slope); coverage % is estimated from
  // feature count until polygon-area intersection is available.
  wetlandPlanning: z
    .object({
      coveragePct: z.number().min(0).max(100),
      dominantSystem: z.string(),
      hasForested: z.boolean(),
      hasEmergent: z.boolean(),
      nwiCodes: z.array(z.string()),
      sfha: z.boolean(),
      regulated: z.boolean(),
      requiresPermits: z.boolean(),
      recommendedSetbackM: z.number().nonnegative(),
      recommendedBufferM: z.number().nonnegative(),
      restorationOpportunity: z.boolean(),
      regulatoryNotes: z.string(),
    })
    .optional(),
  // Water budget — optional block. Derived on-demand from climate/soils/
  // elevation/wetlands via `computeHydrologyMetrics`; omitted when any of
  // those inputs are missing or incomplete.
  waterBudget: z
    .object({
      annualRainfallGal: z.number().nonnegative(),
      rwhPotentialGal: z.number().nonnegative(),
      recommendedStorageGal: z.number().nonnegative(),
      irrigationDemandGal: z.number().nonnegative(),
      surplusGal: z.number(),
      droughtBufferDays: z.number().nonnegative(),
      waterBalanceMm: z.number(),
      aridityClass: z.enum(['Hyperarid', 'Arid', 'Semi-arid', 'Dry sub-humid', 'Humid']),
    })
    .optional(),
  confidence: ConfidenceLevel,
  dataSources: z.array(z.string()),
  computedAt: z.string(),
});
export type HydrologyWaterSummary = z.infer<typeof HydrologyWaterSummary>;

export const HydrologyWaterFeatureCollection = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(z.unknown()),
});
export type HydrologyWaterFeatureCollection = z.infer<typeof HydrologyWaterFeatureCollection>;

export const HydrologyWaterResponse = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ready'),
    projectId: z.string().uuid(),
    summary: HydrologyWaterSummary,
    geojson: HydrologyWaterFeatureCollection,
    attribution: z.string().nullable(),
    dataDate: z.string().nullable(),
    fetchedAt: z.string().nullable(),
  }),
  z.object({
    status: z.literal('not_ready'),
    projectId: z.string().uuid(),
    reason: z.enum([
      'no_boundary',
      'pipeline_pending',
      'pipeline_failed',
    ]),
  }),
]);
export type HydrologyWaterResponse = z.infer<typeof HydrologyWaterResponse>;

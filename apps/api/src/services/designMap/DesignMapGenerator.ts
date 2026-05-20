/**
 * Design Map generator — orchestrator.
 *
 * Pure-function service that emits candidate design features for a parcel
 * (orchards, swales, paddocks, habitat corridors) given baseline geospatial
 * inputs already produced by the terrain / watershed pipelines. The
 * generator is deliberately decoupled from persistence: it returns plain
 * `CreateDesignFeatureInput` records; the API route layer decides whether
 * to write them.
 *
 * **Status (B.1):** scaffolding only — no algorithms are registered yet.
 * Each algorithm lands in its own per-algorithm commit (B.2.orchard,
 * B.2.swale, B.2.paddock, B.2.corridor) and the orchestrator wires them
 * in incrementally.
 */

import type { CreateDesignFeatureInput } from '@ogden/shared';
import type { LineString, LonLat, Ring } from './geometry.js';

// ── Input types ────────────────────────────────────────────────────────────

export interface ParcelInput {
  /** Exterior ring of the parcel boundary in GeoJSON `[lon, lat]` order. */
  boundary: Ring;
}

export interface ContourInput {
  /** Polyline along a constant elevation line. */
  line: LineString;
  /** Elevation of the contour, metres above sea level. */
  elevationM?: number;
  /** Mean slope on the contour, percent rise/run. */
  meanSlopePct?: number;
}

/**
 * Swale candidate shape from `WatershedRefinementProcessor`
 * (`summary_data.swaleCandidates.candidates[]`). Field names match the
 * stored JSON so the route layer can pass them through unchanged.
 */
export interface SwaleCandidateInput {
  start: LonLat;
  end: LonLat;
  lengthCells: number;
  meanSlope: number;
  elevation: number;
  suitabilityScore: number;
}

/**
 * Enterprise enum — matches the `EnterpriseType` union in
 * `apps/web/src/features/financial/types.ts`. The generator filters
 * algorithms by the caller-provided subset; default is `['orchard',
 * 'livestock']`.
 */
export type EnterpriseKind =
  | 'livestock'
  | 'orchard'
  | 'market_garden'
  | 'retreat'
  | 'education'
  | 'agritourism'
  | 'carbon'
  | 'grants';

export const DEFAULT_ENTERPRISES: readonly EnterpriseKind[] = [
  'orchard',
  'livestock',
];

export interface GenerateDesignMapInput {
  parcel: ParcelInput;
  acres: number;
  contours?: ContourInput[];
  swaleCandidates?: SwaleCandidateInput[];
  /**
   * Optional centreline polylines for waterways / drainage spines.
   * Initial pass (B.5.1) passes `undefined` here because the
   * `drainage_divide` features in `watershed_derived.geojson_data` are
   * polygons from `binaryMaskToGeoJSON`, not LineStrings. A dedicated
   * line extraction task may populate this later.
   */
  riparianLines?: LineString[];
  enterprises?: EnterpriseKind[];
}

// ── Output types ───────────────────────────────────────────────────────────

export interface DesignMapSummary {
  orchardRows: number;
  swales: number;
  paddocks: number;
  corridors: number;
  totalSpongeCapacityM3: number;
  estimatedTreeCount: number;
  totalPaddockAuDays: number;
}

export interface GenerateDesignMapOutput {
  features: CreateDesignFeatureInput[];
  summary: DesignMapSummary;
  warnings: string[];
}

export function emptySummary(): DesignMapSummary {
  return {
    orchardRows: 0,
    swales: 0,
    paddocks: 0,
    corridors: 0,
    totalSpongeCapacityM3: 0,
    estimatedTreeCount: 0,
    totalPaddockAuDays: 0,
  };
}

// ── Orchestrator ───────────────────────────────────────────────────────────

export function generateDesignMap(
  input: GenerateDesignMapInput,
): GenerateDesignMapOutput {
  const warnings: string[] = [];

  if (!input.parcel || input.parcel.boundary.length < 3) {
    warnings.push('parcel boundary missing or invalid');
    return { features: [], summary: emptySummary(), warnings };
  }
  if (!(input.acres > 0)) {
    warnings.push('parcel acres must be positive');
    return { features: [], summary: emptySummary(), warnings };
  }

  const enterprises = input.enterprises ?? DEFAULT_ENTERPRISES;
  void enterprises;

  // B.2.* algorithms wire in here incrementally.
  warnings.push('no algorithms registered');

  return {
    features: [],
    summary: emptySummary(),
    warnings,
  };
}

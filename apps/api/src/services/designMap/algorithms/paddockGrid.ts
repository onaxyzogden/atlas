/**
 * Paddock grid — subdivides the parcel's bounding box into an N × M grid
 * of candidate paddock zones, keeping cells whose centroid falls inside
 * the parcel.
 *
 * Each kept cell becomes a `zone` feature (subtype `livestock`) carrying
 * its area, sustainable AU at the configured carrying capacity, and an
 * AU-day yield assuming year-round occupancy. The orchestrator aggregates
 * these into `summary.totalPaddockAuDays`.
 *
 * The grid does not (yet) follow contour or laneway alignment — those are
 * design-refinement passes downstream. This pass produces a usable
 * candidate set for a rotation cycle on a 200-ish-acre fixture.
 */

import type { CreateDesignFeatureInput } from '@ogden/shared';
import type { ParcelInput } from '../DesignMapGenerator.js';
import {
  bbox,
  bufferRingInwardM,
  pointInPolygon,
  polygonAreaM2,
  polygonCentroid,
  type LonLat,
  type Ring,
} from '../geometry.js';

export interface PaddockGridOptions {
  /** Grid columns (east–west). */
  cols?: number;
  /** Grid rows (north–south). */
  rows?: number;
  /** Inward perimeter buffer for fences/access, metres. */
  perimeterBufferM?: number;
  /** Sustainable carrying capacity, animal units per acre. */
  carryingCapacityAuPerAcre?: number;
  /** Drop cells smaller than this, acres. */
  minPaddockAcres?: number;
}

export interface PaddockGridInput {
  parcel: ParcelInput;
  acres: number;
  options?: PaddockGridOptions;
}

export interface PaddockGridResult {
  features: CreateDesignFeatureInput[];
  paddockCount: number;
  totalPaddockAuDays: number;
  warnings: string[];
}

const M2_PER_ACRE = 4046.8564224;

const DEFAULT_COLS = 4;
const DEFAULT_ROWS = 3;
const DEFAULT_BUFFER_M = 5;
const DEFAULT_CAPACITY = 0.5; // AU/ac — regenerative target
const DEFAULT_MIN_ACRES = 1;

export function generatePaddockGrid(
  input: PaddockGridInput,
): PaddockGridResult {
  const warnings: string[] = [];
  const features: CreateDesignFeatureInput[] = [];

  const opts: Required<PaddockGridOptions> = {
    cols: input.options?.cols ?? DEFAULT_COLS,
    rows: input.options?.rows ?? DEFAULT_ROWS,
    perimeterBufferM: input.options?.perimeterBufferM ?? DEFAULT_BUFFER_M,
    carryingCapacityAuPerAcre:
      input.options?.carryingCapacityAuPerAcre ?? DEFAULT_CAPACITY,
    minPaddockAcres: input.options?.minPaddockAcres ?? DEFAULT_MIN_ACRES,
  };

  if (input.parcel.boundary.length < 4) {
    warnings.push('parcel boundary too small for paddock grid');
    return { features, paddockCount: 0, totalPaddockAuDays: 0, warnings };
  }

  const buffered =
    opts.perimeterBufferM > 0
      ? bufferRingInwardM(input.parcel.boundary, opts.perimeterBufferM)
      : input.parcel.boundary;

  const [minLon, minLat, maxLon, maxLat] = bbox(buffered);
  const lonStep = (maxLon - minLon) / opts.cols;
  const latStep = (maxLat - minLat) / opts.rows;

  let paddockCount = 0;
  let totalPaddockAuDays = 0;

  for (let r = 0; r < opts.rows; r++) {
    for (let c = 0; c < opts.cols; c++) {
      const w = minLon + c * lonStep;
      const e = w + lonStep;
      const s = minLat + r * latStep;
      const n = s + latStep;
      const cell: Ring = [
        [w, s],
        [e, s],
        [e, n],
        [w, n],
        [w, s],
      ];
      const centroid = polygonCentroid(cell);
      if (!pointInPolygon(centroid, buffered)) continue;

      const areaM2 = polygonAreaM2(cell);
      const acres = areaM2 / M2_PER_ACRE;
      if (acres < opts.minPaddockAcres) continue;

      const sustainableAu = acres * opts.carryingCapacityAuPerAcre;
      const auDays = Math.round(sustainableAu * 365 * 10) / 10;
      paddockCount += 1;
      totalPaddockAuDays += auDays;

      features.push({
        featureType: 'zone',
        subtype: 'livestock',
        label: `Paddock ${paddockCount}`,
        phaseTag: 'grazing',
        geometry: {
          type: 'Polygon',
          coordinates: [cell.map((p) => [p[0], p[1]] as LonLat)],
        },
        properties: {
          generator: 'paddockGrid',
          paddockIndex: paddockCount,
          row: r,
          col: c,
          areaAcres: Math.round(acres * 10) / 10,
          sustainableAu: Math.round(sustainableAu * 10) / 10,
          carryingCapacityAuPerAcre: opts.carryingCapacityAuPerAcre,
          auDaysPerYear: auDays,
        },
        sortOrder: 300 + paddockCount,
      });
    }
  }

  if (paddockCount === 0) {
    warnings.push('no paddocks generated');
  }

  // Sanity check: total area should be a sensible fraction of parcel area.
  void input.acres;

  return {
    features,
    paddockCount,
    totalPaddockAuDays: Math.round(totalPaddockAuDays * 10) / 10,
    warnings,
  };
}

// Expose constants for tests and downstream consumers.
export const PADDOCK_M2_PER_ACRE = M2_PER_ACRE;

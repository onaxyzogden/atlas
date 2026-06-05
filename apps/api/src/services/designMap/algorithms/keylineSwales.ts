/**
 * Keyline swales — promotes high-suitability swale candidates from the
 * watershed-refinement layer into design features.
 *
 * Each surviving candidate becomes a `path` feature (subtype `farm_lane`,
 * `phaseTag` `'water'`). Sponge capacity is computed from a trapezoidal
 * cross-section approximation (`depth × width × fillFactor × length`).
 *
 * The algorithm does not (yet) curve the swale centreline to match
 * contour — candidates from `WatershedRefinementProcessor` come as
 * straight start→end segments and the curvature refinement is downstream
 * work. Sponge-capacity math is therefore length-based and slope-
 * independent (good to ±25 % vs a curved cross-section).
 */

import type { CreateDesignFeatureInput } from '@ogden/shared';
import type {
  ParcelInput,
  SwaleCandidateInput,
} from '../DesignMapGenerator.js';
import { haversineDistanceM, pointInPolygon } from '../geometry.js';

export interface KeylineSwalesOptions {
  /** Reject candidates below this suitability score (0..1). */
  minSuitability?: number;
  /** Reject candidates whose `meanSlope` (percent) exceeds this. */
  maxSlopePct?: number;
  /** Reject swales shorter than this, metres. */
  minLengthM?: number;
  /** Trapezoidal cross-section depth, metres. */
  depthM?: number;
  /** Trapezoidal cross-section top width, metres. */
  widthM?: number;
  /** Effective fill factor (0..1) accounting for berm + sloped sides. */
  fillFactor?: number;
}

export interface KeylineSwalesInput {
  parcel: ParcelInput;
  candidates: SwaleCandidateInput[];
  options?: KeylineSwalesOptions;
}

export interface KeylineSwalesResult {
  features: CreateDesignFeatureInput[];
  swaleCount: number;
  totalSpongeCapacityM3: number;
  warnings: string[];
}

const DEFAULT_MIN_SUITABILITY = 0.5;
const DEFAULT_MAX_SLOPE_PCT = 15;
const DEFAULT_MIN_LENGTH_M = 25;
const DEFAULT_DEPTH_M = 0.5;
const DEFAULT_WIDTH_M = 1.2;
const DEFAULT_FILL_FACTOR = 0.7;

export function generateKeylineSwales(
  input: KeylineSwalesInput,
): KeylineSwalesResult {
  const warnings: string[] = [];
  const features: CreateDesignFeatureInput[] = [];

  const opts: Required<KeylineSwalesOptions> = {
    minSuitability: input.options?.minSuitability ?? DEFAULT_MIN_SUITABILITY,
    maxSlopePct: input.options?.maxSlopePct ?? DEFAULT_MAX_SLOPE_PCT,
    minLengthM: input.options?.minLengthM ?? DEFAULT_MIN_LENGTH_M,
    depthM: input.options?.depthM ?? DEFAULT_DEPTH_M,
    widthM: input.options?.widthM ?? DEFAULT_WIDTH_M,
    fillFactor: input.options?.fillFactor ?? DEFAULT_FILL_FACTOR,
  };

  if (input.candidates.length === 0) {
    warnings.push('no swale candidates provided — no swales generated');
    return { features, swaleCount: 0, totalSpongeCapacityM3: 0, warnings };
  }

  const spongePerM = opts.depthM * opts.widthM * opts.fillFactor;
  let swaleCount = 0;
  let totalSpongeCapacityM3 = 0;

  for (const c of input.candidates) {
    if (c.suitabilityScore < opts.minSuitability) continue;
    if (c.meanSlope > opts.maxSlopePct) continue;

    const lengthM = haversineDistanceM(c.start, c.end);
    if (lengthM < opts.minLengthM) continue;

    // Sanity check: midpoint must fall inside the parcel.
    const mid: [number, number] = [
      (c.start[0] + c.end[0]) / 2,
      (c.start[1] + c.end[1]) / 2,
    ];
    if (!pointInPolygon(mid, input.parcel.boundary)) continue;

    const capacityM3 = Math.round(lengthM * spongePerM * 10) / 10;
    swaleCount += 1;
    totalSpongeCapacityM3 += capacityM3;
    features.push({
      featureType: 'path',
      subtype: 'farm_lane',
      label: `Keyline Swale ${swaleCount}`,
      phaseTag: 'water',
      geometry: {
        type: 'LineString',
        coordinates: [
          [c.start[0], c.start[1]],
          [c.end[0], c.end[1]],
        ],
      },
      properties: {
        generator: 'keylineSwales',
        swaleIndex: swaleCount,
        lengthM: Math.round(lengthM * 10) / 10,
        depthM: opts.depthM,
        widthM: opts.widthM,
        fillFactor: opts.fillFactor,
        spongeCapacityM3: capacityM3,
        meanSlopePct: c.meanSlope,
        elevationM: c.elevation,
        suitabilityScore: c.suitabilityScore,
      },
      sortOrder: 200 + swaleCount,
    });
  }

  if (swaleCount === 0) {
    warnings.push('no swales generated');
  }

  // Round the running sum so consumers see a tidy aggregate.
  totalSpongeCapacityM3 = Math.round(totalSpongeCapacityM3 * 10) / 10;

  return { features, swaleCount, totalSpongeCapacityM3, warnings };
}

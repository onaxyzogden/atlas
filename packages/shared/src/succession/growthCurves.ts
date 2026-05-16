/**
 * succession/growthCurves — pure helpers for sampling a species growth
 * curve at an arbitrary age. Linear interpolation between adjacent
 * samples, clamped to mature canopy above `matureAtYears`. Designed for
 * the temporal slider's hot path: called once per vegetation point per
 * scrub event, so cheap and allocation-free per call.
 */

import {
  GENERIC_GROWTH_CURVES,
  SPECIES_GROWTH,
  type GrowthCurve,
  type GrowthSample,
} from './speciesData.js';

export interface CanopySample {
  /** Crown diameter in metres at the queried age. */
  canopyM: number;
  /** Above-ground height in metres at the queried age. */
  heightM: number;
}

/** Resolve a curve from a `DesignElementSpec.kind`. Returns the
 *  generic 'medium' curve when the kind is not in the seed table.
 *  Exported so callers (the canvas effect, the scenegraph layer, the
 *  card) all share one fallback policy. */
export function resolveGrowthCurve(speciesId: string): GrowthCurve {
  return SPECIES_GROWTH[speciesId] ?? GENERIC_GROWTH_CURVES.medium;
}

/** Crown diameter + height at `ageYears`. Linear interpolation between
 *  the two surrounding samples; values clamp to the mature sample once
 *  `ageYears >= matureAtYears`. Negative ages return the first sample. */
export function canopyAtAge(speciesId: string, ageYears: number): CanopySample {
  const curve = resolveGrowthCurve(speciesId);
  return canopyFromCurve(curve, ageYears);
}

/** Same as `canopyAtAge` but with a pre-resolved curve, for hot loops. */
export function canopyFromCurve(curve: GrowthCurve, ageYears: number): CanopySample {
  const samples = curve.samples;
  if (samples.length === 0) return { canopyM: 0, heightM: 0 };

  const clampedAge = Math.max(0, Math.min(ageYears, curve.matureAtYears));

  const first = samples[0] as GrowthSample;
  // Below first sample.
  if (clampedAge <= first.y) {
    return { canopyM: first.c, heightM: first.h };
  }
  // At/above last sample (or at mature plateau).
  const last = samples[samples.length - 1] as GrowthSample;
  if (clampedAge >= last.y) {
    return { canopyM: last.c, heightM: last.h };
  }
  // Find bracketing pair.
  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i] as GrowthSample;
    const b = samples[i + 1] as GrowthSample;
    if (clampedAge >= a.y && clampedAge <= b.y) {
      const span = b.y - a.y;
      const t = span === 0 ? 0 : (clampedAge - a.y) / span;
      return {
        canopyM: a.c + (b.c - a.c) * t,
        heightM: a.h + (b.h - a.h) * t,
      };
    }
  }
  // Unreachable given the bounds above; defensive return.
  return { canopyM: last.c, heightM: last.h };
}

/** Mature crown diameter for a kind — used by the scenegraph layer to
 *  derive a per-instance scale factor (canopyAtAge / mature). */
export function matureCanopyM(speciesId: string): number {
  const curve = resolveGrowthCurve(speciesId);
  return canopyFromCurve(curve, curve.matureAtYears).canopyM;
}

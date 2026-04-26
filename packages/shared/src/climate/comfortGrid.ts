/**
 * Per-cell outdoor-comfort scoring for the §6 comfort map overlay.
 *
 * Planning-grade: takes a parcel's base annual climate (mean-max / mean-min),
 * adjusts each DEM cell by elevation adiabatic lapse (-6.5 °C per 1000 m)
 * and a modest solar-exposure bias, then classifies the cell into the same
 * thermal band as `comfortCalendar.classifyMonthComfort` so the map overlay
 * and the monthly strip stay visually consistent.
 *
 * Horizon shading, aspect-specific wind channelling, and structure/tree
 * effects are intentionally excluded — those require an obstacle model
 * (§9 Structures) that is not yet wired.
 */

import { classifyMonthComfort, type ComfortBand } from './comfortCalendar.js';

export type { ComfortBand };

/** Dry adiabatic lapse rate in °C per metre. Standard value is 6.5 °C/km. */
export const ADIABATIC_LAPSE_C_PER_M = 0.0065;

/**
 * Swing applied to the cell's mean-max temperature based on solar-exposure
 * fraction. `exposureFrac` is the annual-insolation score (0..1) that
 * `computeAnnualExposure` already emits; a value of 0.5 is neutral, 1.0 adds
 * SUN_BIAS_C / 2, 0.0 subtracts the same. Small by design — this is a
 * comfort proxy, not a full radiative balance.
 */
export const SUN_BIAS_C = 4;

export interface ComfortCellInput {
  /** Cell elevation in metres. */
  elevationM: number;
  /** Annual solar-exposure fraction 0..1 (from `computeAnnualExposure`). */
  solarExposureFrac: number;
}

export interface ComfortBaseClimate {
  /** Annual mean of monthly mean-max temperatures at the reference point. */
  annualMeanMaxC: number;
  /** Annual mean of monthly mean-min temperatures at the reference point. */
  annualMeanMinC: number;
  /** Elevation of the reference point (parcel centroid) in metres. */
  referenceElevationM: number;
}

export interface ComfortCellResult {
  meanMaxC: number;
  meanMinC: number;
  band: ComfortBand;
}

/**
 * Compute adjusted annual temps for a single DEM cell and classify into a
 * comfort band. Pure function — safe to call in a tight per-cell loop.
 */
export function computeCellComfort(
  cell: ComfortCellInput,
  base: ComfortBaseClimate,
): ComfortCellResult {
  const deltaZ = cell.elevationM - base.referenceElevationM;
  const lapseAdjust = -deltaZ * ADIABATIC_LAPSE_C_PER_M;

  const sunAdjust = (clamp01(cell.solarExposureFrac) - 0.5) * SUN_BIAS_C;

  const meanMaxC = base.annualMeanMaxC + lapseAdjust + sunAdjust;
  // Mean-min gets the lapse but only a fraction of the sun bias — nights are
  // less affected by aspect/slope than days are.
  const meanMinC = base.annualMeanMinC + lapseAdjust + sunAdjust * 0.25;

  const band = classifyMonthComfort({
    month: 0,
    mean_max_c: meanMaxC,
    mean_min_c: meanMinC,
  });

  return { meanMaxC, meanMinC, band };
}

/**
 * Derive the base-climate inputs from a set of `MonthlyNormal` rows. Returns
 * null when there are no usable normals so callers can bail out early.
 */
export function buildComfortBaseClimate(
  normals: Array<{ mean_max_c?: number | null; mean_min_c?: number | null }> | null | undefined,
  referenceElevationM: number,
): ComfortBaseClimate | null {
  if (!normals || normals.length === 0) return null;

  let maxSum = 0;
  let maxCount = 0;
  let minSum = 0;
  let minCount = 0;
  for (const n of normals) {
    if (n.mean_max_c != null && Number.isFinite(n.mean_max_c)) {
      maxSum += n.mean_max_c;
      maxCount++;
    }
    if (n.mean_min_c != null && Number.isFinite(n.mean_min_c)) {
      minSum += n.mean_min_c;
      minCount++;
    }
  }
  if (maxCount === 0 || minCount === 0) return null;

  return {
    annualMeanMaxC: maxSum / maxCount,
    annualMeanMinC: minSum / minCount,
    referenceElevationM,
  };
}

/** Ordinal for band → integer codes used in classified GeoJSON output. */
export const COMFORT_BAND_CODES: Record<ComfortBand, number> = {
  freezing: 1,
  cold: 2,
  cool: 3,
  comfortable: 4,
  hot: 5,
};

export const COMFORT_BAND_LABELS: ComfortBand[] = [
  'freezing',
  'cold',
  'cool',
  'comfortable',
  'hot',
];

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.5;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

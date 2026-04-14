/**
 * Erosion Hazard Mapping — RUSLE (Revised Universal Soil Loss Equation)
 *
 * A = R x K x LS x C x P   (tonnes / hectare / year)
 *
 * Factors:
 *   R  — Rainfall erosivity (MJ·mm/ha·h·yr). Estimated from annual
 *         precipitation via Renard & Freimund (1994) regression when
 *         no direct erosivity data is available.
 *   K  — Soil erodibility (t·h/MJ·mm). From SSURGO kfact_r when
 *         available; defaults to 0.032 (loamy soil).
 *   LS — Slope length and steepness. Computed from DEM using
 *         Moore & Wilson (1992): (flowAcc × cellSize / 22.13)^0.4
 *         × (sin(slope) / 0.0896)^1.3
 *   C  — Cover management (0–1). From NLCD/AAFC land cover when
 *         available; defaults to 0.1 (moderate cover).
 *   P  — Support practice (0–1). Defaults to 1.0 (no conservation).
 *
 * Classification (t/ha/yr):
 *   very_low   < 2
 *   low        2–5
 *   moderate   5–10
 *   high       10–20
 *   very_high  20–50
 *   severe     ≥ 50
 */

import type { ElevationGrid } from '../ElevationGridReader.js';
import { computeD8FlowDirection, computeFlowAccumulation, computeSlopeGrid } from './hydro.js';

export interface ErosionHazardResult {
  meanErosionRate: number;    // t/ha/yr
  maxErosionRate: number;     // t/ha/yr
  classification: {
    very_low_pct: number;
    low_pct: number;
    moderate_pct: number;
    high_pct: number;
    very_high_pct: number;
    severe_pct: number;
  };
  dominantClass: string;
  erosionGrid: Float32Array;  // A value per cell (t/ha/yr)
  classGrid: Int8Array;       // 0–5 for the 6 classes
  confidence: 'high' | 'medium' | 'low';
}

export interface RUSLEInputs {
  kFactor?: number;           // soil erodibility (default 0.032)
  annualPrecipMm?: number;    // annual precipitation in mm (to estimate R)
  rFactor?: number;           // direct R-factor if known (overrides precip estimate)
  cFactor?: number;           // cover management (default 0.1)
  pFactor?: number;           // support practice (default 1.0)
}

const CLASS_LABELS = [
  'very_low', 'low', 'moderate', 'high', 'very_high', 'severe',
];
const CLASS_THRESHOLDS = [2, 5, 10, 20, 50]; // t/ha/yr

// Default RUSLE factor values
const DEFAULT_K = 0.032;      // loamy soil
const DEFAULT_R = 150;        // moderate erosivity (~900mm precip)
const DEFAULT_C = 0.1;        // moderate cover
const DEFAULT_P = 1.0;        // no conservation practice

/**
 * Estimate rainfall erosivity (R-factor) from annual precipitation.
 * Renard & Freimund (1994) regression for MJ·mm/ha·h·yr.
 */
function estimateRFactor(annualPrecipMm: number): number {
  if (annualPrecipMm <= 0) return DEFAULT_R;
  // R = 0.0483 × P^1.610 (P in mm)
  return 0.0483 * Math.pow(annualPrecipMm, 1.610);
}

export function computeErosionHazard(
  grid: ElevationGrid,
  inputs?: RUSLEInputs,
): ErosionHazardResult {
  const { data, width, height, cellSizeX, noDataValue } = grid;
  const size = width * height;

  // Resolve RUSLE factors
  const K = inputs?.kFactor ?? DEFAULT_K;
  const R = inputs?.rFactor ?? (inputs?.annualPrecipMm ? estimateRFactor(inputs.annualPrecipMm) : DEFAULT_R);
  const C = inputs?.cFactor ?? DEFAULT_C;
  const P = inputs?.pFactor ?? DEFAULT_P;

  // Determine confidence based on which factors are provided
  const factorsProvided = [inputs?.kFactor, inputs?.rFactor ?? inputs?.annualPrecipMm, inputs?.cFactor]
    .filter(v => v !== undefined).length;
  const confidence: 'high' | 'medium' | 'low' =
    factorsProvided >= 3 ? 'high' : factorsProvided >= 1 ? 'medium' : 'low';

  // Compute LS factor components
  const flowDir = computeD8FlowDirection(grid);
  const flowAcc = computeFlowAccumulation(flowDir, width, height);
  const slopeGrid = computeSlopeGrid(grid);

  const erosionGrid = new Float32Array(size);
  const classGrid = new Int8Array(size).fill(-1);
  const counts = [0, 0, 0, 0, 0, 0];
  let erosionSum = 0;
  let maxErosion = 0;
  let validCount = 0;

  for (let i = 0; i < size; i++) {
    const z = data[i]!;
    if (z === noDataValue || z < -1000) continue;

    const slopeDeg = slopeGrid[i]!;
    const slopeRad = slopeDeg * (Math.PI / 180);
    const sinSlope = Math.sin(slopeRad);

    // LS factor — Moore & Wilson (1992)
    // L component: (flowAcc × cellSize / 22.13)^0.4
    // S component: (sin(slope) / 0.0896)^1.3
    const slopeLength = flowAcc[i]! * cellSizeX;
    const L = Math.pow(Math.max(slopeLength / 22.13, 0.001), 0.4);
    const S = Math.pow(Math.max(sinSlope / 0.0896, 0.001), 1.3);
    const LS = L * S;

    // RUSLE: A = R × K × LS × C × P (t/ha/yr)
    const A = R * K * LS * C * P;
    erosionGrid[i] = A;
    erosionSum += A;
    if (A > maxErosion) maxErosion = A;
    validCount++;

    // Classify
    let cls = 5; // severe by default
    for (let c = 0; c < CLASS_THRESHOLDS.length; c++) {
      if (A < CLASS_THRESHOLDS[c]!) {
        cls = c;
        break;
      }
    }

    classGrid[i] = cls;
    counts[cls]!++;
  }

  if (validCount === 0) {
    return {
      meanErosionRate: 0,
      maxErosionRate: 0,
      classification: {
        very_low_pct: 0, low_pct: 0, moderate_pct: 0,
        high_pct: 0, very_high_pct: 0, severe_pct: 0,
      },
      dominantClass: 'very_low',
      erosionGrid,
      classGrid,
      confidence: 'low',
    };
  }

  const total = Math.max(1, validCount);
  const classification = {
    very_low_pct: +((counts[0]! / total) * 100).toFixed(1),
    low_pct: +((counts[1]! / total) * 100).toFixed(1),
    moderate_pct: +((counts[2]! / total) * 100).toFixed(1),
    high_pct: +((counts[3]! / total) * 100).toFixed(1),
    very_high_pct: +((counts[4]! / total) * 100).toFixed(1),
    severe_pct: +((counts[5]! / total) * 100).toFixed(1),
  };

  const maxIdx = counts.indexOf(Math.max(...counts));
  const dominantClass = CLASS_LABELS[maxIdx] ?? 'very_low';

  return {
    meanErosionRate: +(erosionSum / validCount).toFixed(2),
    maxErosionRate: +maxErosion.toFixed(2),
    classification,
    dominantClass,
    erosionGrid,
    classGrid,
    confidence,
  };
}

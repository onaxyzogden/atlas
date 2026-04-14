/**
 * Topographic Wetness Index (TWI) — predicts soil moisture distribution
 * and waterlogging potential from terrain shape.
 *
 * Formula:  TWI = ln(a / tan(β))
 *   a = specific catchment area (flow accumulation × cell area, per unit contour width)
 *   β = local slope in radians
 *
 * Classification thresholds follow standard hydrological practice:
 *   very_dry  — TWI < 4
 *   dry       — 4 ≤ TWI < 6
 *   moist     — 6 ≤ TWI < 8
 *   wet       — 8 ≤ TWI < 10
 *   very_wet  — TWI ≥ 10
 */

import type { ElevationGrid } from '../ElevationGridReader.js';
import { computeD8FlowDirection, computeFlowAccumulation, computeSlopeGrid } from './hydro.js';

export interface TWIResult {
  meanTWI: number;
  classification: {
    very_dry_pct: number;
    dry_pct: number;
    moist_pct: number;
    wet_pct: number;
    very_wet_pct: number;
  };
  dominantClass: string;
  twiGrid: Float32Array;
  classGrid: Int8Array; // 0=very_dry, 1=dry, 2=moist, 3=wet, 4=very_wet
}

const CLASS_VERY_DRY = 0;
const CLASS_DRY = 1;
const CLASS_MOIST = 2;
const CLASS_WET = 3;
const CLASS_VERY_WET = 4;

const CLASS_LABELS = ['very_dry', 'dry', 'moist', 'wet', 'very_wet'];

// Minimum tan(slope) to avoid division by zero on flat terrain (~0.06°)
const MIN_TAN_BETA = 0.001;

export function computeTWI(grid: ElevationGrid): TWIResult {
  const { data, width, height, cellSizeX, cellSizeY, noDataValue } = grid;
  const size = width * height;

  // Compute hydro components
  const flowDir = computeD8FlowDirection(grid);
  const flowAcc = computeFlowAccumulation(flowDir, width, height);
  const slopeGrid = computeSlopeGrid(grid);

  const cellArea = cellSizeX * cellSizeY; // m²
  const contourWidth = Math.max(cellSizeX, cellSizeY); // m

  const twiGrid = new Float32Array(size);
  const classGrid = new Int8Array(size).fill(-1);
  const counts = [0, 0, 0, 0, 0];
  let twiSum = 0;
  let validCount = 0;

  for (let i = 0; i < size; i++) {
    const z = data[i]!;
    if (z === noDataValue || z < -1000) continue;

    // Specific catchment area: upstream cells × cell area / contour width
    const a = (flowAcc[i]! * cellArea) / contourWidth;

    // Slope in radians, clamped to avoid ln(Infinity)
    const slopeDeg = slopeGrid[i]!;
    const tanBeta = Math.max(Math.tan(slopeDeg * (Math.PI / 180)), MIN_TAN_BETA);

    const twi = Math.log(a / tanBeta);
    twiGrid[i] = twi;
    twiSum += twi;
    validCount++;

    // Classify
    let cls: number;
    if (twi < 4) cls = CLASS_VERY_DRY;
    else if (twi < 6) cls = CLASS_DRY;
    else if (twi < 8) cls = CLASS_MOIST;
    else if (twi < 10) cls = CLASS_WET;
    else cls = CLASS_VERY_WET;

    classGrid[i] = cls;
    counts[cls]!++;
  }

  if (validCount === 0) {
    return {
      meanTWI: 0,
      classification: { very_dry_pct: 0, dry_pct: 0, moist_pct: 0, wet_pct: 0, very_wet_pct: 0 },
      dominantClass: 'moist',
      twiGrid,
      classGrid,
    };
  }

  const total = Math.max(1, validCount);
  const classification = {
    very_dry_pct: +((counts[CLASS_VERY_DRY]! / total) * 100).toFixed(1),
    dry_pct: +((counts[CLASS_DRY]! / total) * 100).toFixed(1),
    moist_pct: +((counts[CLASS_MOIST]! / total) * 100).toFixed(1),
    wet_pct: +((counts[CLASS_WET]! / total) * 100).toFixed(1),
    very_wet_pct: +((counts[CLASS_VERY_WET]! / total) * 100).toFixed(1),
  };

  const maxIdx = counts.indexOf(Math.max(...counts));
  const dominantClass = CLASS_LABELS[maxIdx] ?? 'moist';

  return {
    meanTWI: +((twiSum / validCount).toFixed(2)),
    classification,
    dominantClass,
    twiGrid,
    classGrid,
  };
}

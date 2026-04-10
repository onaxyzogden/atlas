/**
 * Frost pocket probability — identifies topographic depressions where
 * cold air accumulates on calm, clear nights.
 *
 * Method: cold air is denser and flows downhill like water. Invert the DEM
 * (negate elevations) so that valleys become peaks, then run D8 flow
 * accumulation on the inverted surface. High accumulation on the inverted
 * DEM = topographic depressions where cold air pools.
 *
 * A cell is flagged as a frost pocket when:
 *   1. Its inverted flow accumulation exceeds the 90th percentile
 *   2. Its slope is below 5 degrees (flat enough for air to pool)
 */

import type { ElevationGrid } from '../ElevationGridReader.js';
import { computeD8FlowDirection, computeFlowAccumulation, computeSlopeGrid } from './hydro.js';

export interface FrostPocketResult {
  areaPct: number;
  severity: 'high' | 'medium' | 'low' | 'none';
  probabilityGrid: Float32Array; // 0.0-1.0 per cell
}

const SLOPE_THRESHOLD_DEG = 5;

export function computeFrostPocketProbability(grid: ElevationGrid): FrostPocketResult {
  const { data, width, height, noDataValue } = grid;

  // Invert the DEM
  const invertedData = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const v = data[i]!;
    invertedData[i] = (v === noDataValue || v < -1000) ? noDataValue : -v;
  }

  const invertedGrid: ElevationGrid = { ...grid, data: invertedData };
  const flowDir = computeD8FlowDirection(invertedGrid);
  const flowAcc = computeFlowAccumulation(flowDir, width, height);
  const slopeGrid = computeSlopeGrid(grid);

  // Find 90th percentile of flow accumulation for valid cells
  const validAccValues: number[] = [];
  for (let i = 0; i < flowAcc.length; i++) {
    if (data[i]! !== noDataValue && data[i]! > -1000) {
      validAccValues.push(flowAcc[i]!);
    }
  }

  if (validAccValues.length === 0) {
    return {
      areaPct: 0,
      severity: 'none',
      probabilityGrid: new Float32Array(width * height),
    };
  }

  validAccValues.sort((a, b) => a - b);
  const p90 = validAccValues[Math.floor(validAccValues.length * 0.9)]!;
  const maxAcc = validAccValues[validAccValues.length - 1]!;
  const accRange = Math.max(1, maxAcc - p90);

  // Compute probability grid
  const probabilityGrid = new Float32Array(width * height);
  let frostCellCount = 0;
  let totalValid = 0;

  for (let i = 0; i < width * height; i++) {
    if (data[i]! === noDataValue || data[i]! < -1000) continue;
    totalValid++;

    const acc = flowAcc[i]!;
    const slope = slopeGrid[i]!;

    if (acc >= p90 && slope < SLOPE_THRESHOLD_DEG) {
      // Normalise probability: how far above p90 threshold (0-1)
      probabilityGrid[i] = Math.min(1, (acc - p90) / accRange);
      frostCellCount++;
    }
  }

  const areaPct = totalValid > 0 ? +((frostCellCount / totalValid) * 100).toFixed(1) : 0;

  let severity: 'high' | 'medium' | 'low' | 'none';
  if (areaPct > 20) severity = 'high';
  else if (areaPct > 10) severity = 'medium';
  else if (areaPct > 2) severity = 'low';
  else severity = 'none';

  return { areaPct, severity, probabilityGrid };
}

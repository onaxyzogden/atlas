/**
 * Terrain Position Index (TPI) — classifies each cell's landscape
 * position by comparing its elevation to the mean elevation of a
 * surrounding annular neighbourhood.
 *
 * Classification follows Weiss (2001):
 *   ridge        — TPI > 1 SD  and slope > 5 deg
 *   upper_slope  — TPI > 0.5 SD
 *   mid_slope    — |TPI| <= 0.5 SD and slope > 5 deg
 *   flat         — |TPI| <= 0.5 SD and slope <= 5 deg
 *   lower_slope  — TPI < -0.5 SD
 *   valley       — TPI < -1 SD  and slope < 5 deg
 */

import type { ElevationGrid } from '../ElevationGridReader.js';
import { computeSlopeGrid } from './hydro.js';

export interface TPIResult {
  classification: {
    ridge_pct: number;
    upper_slope_pct: number;
    mid_slope_pct: number;
    flat_pct: number;
    lower_slope_pct: number;
    valley_pct: number;
  };
  dominantClass: string;
  tpiGrid: Float32Array;
  classGrid: Int8Array; // 0=ridge, 1=upper, 2=mid, 3=flat, 4=lower, 5=valley
}

const CLASS_RIDGE = 0;
const CLASS_UPPER = 1;
const CLASS_MID = 2;
const CLASS_FLAT = 3;
const CLASS_LOWER = 4;
const CLASS_VALLEY = 5;

const CLASS_LABELS = ['ridge', 'upper_slope', 'mid_slope', 'flat', 'lower_slope', 'valley'];
const SLOPE_THRESHOLD = 5; // degrees

export function computeTPI(grid: ElevationGrid, radiusCells?: number): TPIResult {
  const { data, width, height, noDataValue, resolution_m } = grid;
  const size = width * height;

  // Default radius: ~30m neighbourhood
  const R = radiusCells ?? Math.max(3, Math.round(30 / Math.max(1, resolution_m)));

  const tpiGrid = new Float32Array(size);
  const classGrid = new Int8Array(size).fill(-1);
  const slopeGrid = computeSlopeGrid(grid);

  // Pre-build integral image for fast mean computation
  const integralSum = new Float64Array((width + 1) * (height + 1));
  const integralCount = new Float64Array((width + 1) * (height + 1));

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const v = data[row * width + col]!;
      const valid = (v !== noDataValue && v > -1000) ? 1 : 0;
      const iIdx = (row + 1) * (width + 1) + (col + 1);
      integralSum[iIdx] =
        (valid ? v : 0) +
        integralSum[(row) * (width + 1) + (col + 1)]! +
        integralSum[(row + 1) * (width + 1) + col]! -
        integralSum[row * (width + 1) + col]!;
      integralCount[iIdx] =
        valid +
        integralCount[(row) * (width + 1) + (col + 1)]! +
        integralCount[(row + 1) * (width + 1) + col]! -
        integralCount[row * (width + 1) + col]!;
    }
  }

  // Helper: sum over rectangle [r0, c0] to [r1, c1] (inclusive)
  const rectSum = (r0: number, c0: number, r1: number, c1: number): number => {
    r0 = Math.max(0, r0); c0 = Math.max(0, c0);
    r1 = Math.min(height - 1, r1); c1 = Math.min(width - 1, c1);
    return (
      integralSum[(r1 + 1) * (width + 1) + (c1 + 1)]! -
      integralSum[r0 * (width + 1) + (c1 + 1)]! -
      integralSum[(r1 + 1) * (width + 1) + c0]! +
      integralSum[r0 * (width + 1) + c0]!
    );
  };

  const rectCount = (r0: number, c0: number, r1: number, c1: number): number => {
    r0 = Math.max(0, r0); c0 = Math.max(0, c0);
    r1 = Math.min(height - 1, r1); c1 = Math.min(width - 1, c1);
    return (
      integralCount[(r1 + 1) * (width + 1) + (c1 + 1)]! -
      integralCount[r0 * (width + 1) + (c1 + 1)]! -
      integralCount[(r1 + 1) * (width + 1) + c0]! +
      integralCount[r0 * (width + 1) + c0]!
    );
  };

  // Compute TPI for each cell
  const tpiValues: number[] = [];

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;

      // Outer box
      const outerSum = rectSum(row - R, col - R, row + R, col + R);
      const outerCnt = rectCount(row - R, col - R, row + R, col + R);

      // Inner box (exclude center cell from neighbourhood mean)
      // For annular: subtract the inner ring. Simple approach: use full box minus center cell.
      const neighbourSum = outerSum - z;
      const neighbourCnt = outerCnt - 1;

      if (neighbourCnt < 1) continue;

      const neighbourMean = neighbourSum / neighbourCnt;
      tpiGrid[idx] = z - neighbourMean;
      tpiValues.push(tpiGrid[idx]!);
    }
  }

  if (tpiValues.length === 0) {
    return {
      classification: { ridge_pct: 0, upper_slope_pct: 0, mid_slope_pct: 0, flat_pct: 0, lower_slope_pct: 0, valley_pct: 0 },
      dominantClass: 'flat',
      tpiGrid,
      classGrid,
    };
  }

  // Compute standard deviation of TPI
  const tpiMean = tpiValues.reduce((a, b) => a + b, 0) / tpiValues.length;
  const tpiVariance = tpiValues.reduce((a, b) => a + (b - tpiMean) ** 2, 0) / tpiValues.length;
  const tpiSD = Math.sqrt(tpiVariance);

  // Classify cells
  const counts = [0, 0, 0, 0, 0, 0]; // ridge, upper, mid, flat, lower, valley
  let totalClassified = 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;

      const tpi = tpiGrid[idx]!;
      if (tpi === 0 && tpiValues.indexOf(tpi) === -1) continue; // not computed

      const slope = slopeGrid[idx]!;
      let cls: number;

      if (tpi > tpiSD && slope > SLOPE_THRESHOLD) {
        cls = CLASS_RIDGE;
      } else if (tpi > 0.5 * tpiSD) {
        cls = CLASS_UPPER;
      } else if (tpi > -0.5 * tpiSD && slope > SLOPE_THRESHOLD) {
        cls = CLASS_MID;
      } else if (tpi > -0.5 * tpiSD && slope <= SLOPE_THRESHOLD) {
        cls = CLASS_FLAT;
      } else if (tpi < -tpiSD && slope < SLOPE_THRESHOLD) {
        cls = CLASS_VALLEY;
      } else {
        cls = CLASS_LOWER;
      }

      classGrid[idx] = cls;
      counts[cls]!++;
      totalClassified++;
    }
  }

  const total = Math.max(1, totalClassified);
  const classification = {
    ridge_pct: +((counts[CLASS_RIDGE]! / total) * 100).toFixed(1),
    upper_slope_pct: +((counts[CLASS_UPPER]! / total) * 100).toFixed(1),
    mid_slope_pct: +((counts[CLASS_MID]! / total) * 100).toFixed(1),
    flat_pct: +((counts[CLASS_FLAT]! / total) * 100).toFixed(1),
    lower_slope_pct: +((counts[CLASS_LOWER]! / total) * 100).toFixed(1),
    valley_pct: +((counts[CLASS_VALLEY]! / total) * 100).toFixed(1),
  };

  // Dominant class = highest percentage
  const maxIdx = counts.indexOf(Math.max(...counts));
  const dominantClass = CLASS_LABELS[maxIdx] ?? 'flat';

  return { classification, dominantClass, tpiGrid, classGrid };
}

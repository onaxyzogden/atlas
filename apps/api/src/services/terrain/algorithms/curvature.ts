/**
 * Profile and plan curvature from an elevation grid.
 *
 * Uses the Zevenbergen-Thorne (1987) method: fit a quadratic surface
 * to each 3x3 neighbourhood and derive second-order partial derivatives.
 *
 * Profile curvature — rate of change of slope in the steepest descent direction.
 *   Positive = concave (valley), negative = convex (ridge).
 * Plan curvature — rate of change of aspect perpendicular to slope.
 *   Positive = convergent flow, negative = divergent flow.
 *
 * Classification:
 *   ridgeline — strongly negative profile curvature
 *   valley    — strongly positive profile curvature
 *   saddle    — near-zero profile but significant plan curvature
 *   planar   — both curvatures near zero
 */

import type { ElevationGrid } from '../ElevationGridReader.js';

export interface CurvatureResult {
  profileMean: number;
  planMean: number;
  classification: {
    ridgeline_pct: number;
    valley_pct: number;
    saddle_pct: number;
    planar_pct: number;
  };
  classifiedGrid: Int8Array; // -1=ridge, 0=planar, 1=valley, 2=saddle
}

// Classification codes
const RIDGE = -1;
const PLANAR = 0;
const VALLEY = 1;
const SADDLE = 2;

export function computeCurvature(grid: ElevationGrid): CurvatureResult {
  const { data, width, height, cellSizeX, cellSizeY, noDataValue } = grid;
  const size = width * height;
  const classifiedGrid = new Int8Array(size);
  const cx = cellSizeX;
  const cy = cellSizeY;

  let profileSum = 0;
  let planSum = 0;
  let validCount = 0;
  let ridgeCount = 0;
  let valleyCount = 0;
  let saddleCount = 0;
  let planarCount = 0;

  // Curvature threshold (1/m). Values below this are considered flat.
  const THRESHOLD = 0.001;

  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const idx = row * width + col;
      const z5 = data[idx]!;
      if (z5 === noDataValue || z5 < -1000) continue;

      // 3x3 neighbourhood (Zevenbergen-Thorne numbering)
      // z1 z2 z3
      // z4 z5 z6
      // z7 z8 z9
      const z1 = data[(row - 1) * width + (col - 1)]!;
      const z2 = data[(row - 1) * width + col]!;
      const z3 = data[(row - 1) * width + (col + 1)]!;
      const z4 = data[row * width + (col - 1)]!;
      const z6 = data[row * width + (col + 1)]!;
      const z7 = data[(row + 1) * width + (col - 1)]!;
      const z8 = data[(row + 1) * width + col]!;
      const z9 = data[(row + 1) * width + (col + 1)]!;

      // Skip if any neighbour is nodata
      if (
        z1 === noDataValue || z2 === noDataValue || z3 === noDataValue ||
        z4 === noDataValue || z6 === noDataValue ||
        z7 === noDataValue || z8 === noDataValue || z9 === noDataValue ||
        z1 < -1000 || z2 < -1000 || z3 < -1000 ||
        z4 < -1000 || z6 < -1000 ||
        z7 < -1000 || z8 < -1000 || z9 < -1000
      ) continue;

      // Zevenbergen-Thorne coefficients
      const D = ((z4 + z6) / 2 - z5) / (cx * cx);
      const E = ((z2 + z8) / 2 - z5) / (cy * cy);
      const F = (-z1 + z3 + z7 - z9) / (4 * cx * cy);
      const G = (-z4 + z6) / (2 * cx);
      const H = (z2 - z8) / (2 * cy);

      const p = G;
      const q = H;
      const p2 = p * p;
      const q2 = q * q;
      const p2q2 = p2 + q2;

      let profileCurv = 0;
      let planCurv = 0;

      if (p2q2 > 1e-10) {
        profileCurv = -2 * (D * p2 + E * q2 + F * p * q) / (p2q2);
        planCurv = 2 * (D * q2 - F * p * q + E * p2) / Math.pow(p2q2, 1.5);
      }

      profileSum += profileCurv;
      planSum += planCurv;
      validCount++;

      // Classify
      if (profileCurv < -THRESHOLD) {
        classifiedGrid[idx] = RIDGE;
        ridgeCount++;
      } else if (profileCurv > THRESHOLD) {
        classifiedGrid[idx] = VALLEY;
        valleyCount++;
      } else if (Math.abs(planCurv) > THRESHOLD) {
        classifiedGrid[idx] = SADDLE;
        saddleCount++;
      } else {
        classifiedGrid[idx] = PLANAR;
        planarCount++;
      }
    }
  }

  const total = Math.max(1, validCount);
  return {
    profileMean: validCount > 0 ? profileSum / validCount : 0,
    planMean: validCount > 0 ? planSum / validCount : 0,
    classification: {
      ridgeline_pct: +((ridgeCount / total) * 100).toFixed(1),
      valley_pct: +((valleyCount / total) * 100).toFixed(1),
      saddle_pct: +((saddleCount / total) * 100).toFixed(1),
      planar_pct: +((planarCount / total) * 100).toFixed(1),
    },
    classifiedGrid,
  };
}

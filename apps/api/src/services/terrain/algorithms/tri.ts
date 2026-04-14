/**
 * Terrain Ruggedness Index (TRI) — quantifies terrain heterogeneity
 * as the mean absolute elevation difference between each cell and
 * its 8 neighbours. Riley et al. (1999).
 *
 * Classification thresholds are resolution-dependent: the original
 * Riley thresholds assume ~30m DEM cells. When resolution < 20m
 * (e.g. 1m LiDAR), thresholds are scaled by resolution_m / 30
 * to avoid classifying everything as "level".
 *
 *   level                 — TRI < 80m  (×scale)
 *   nearly_level          — 80–116m
 *   slightly_rugged       — 116–161m
 *   intermediately_rugged — 161–239m
 *   moderately_rugged     — 239–497m
 *   highly_rugged         — 497–958m
 *   extremely_rugged      — ≥ 958m
 */

import type { ElevationGrid } from '../ElevationGridReader.js';

export interface TRIResult {
  meanTRI_m: number;
  classification: {
    level_pct: number;
    nearly_level_pct: number;
    slightly_rugged_pct: number;
    intermediately_rugged_pct: number;
    moderately_rugged_pct: number;
    highly_rugged_pct: number;
    extremely_rugged_pct: number;
  };
  dominantClass: string;
  triGrid: Float32Array;
  classGrid: Int8Array; // 0–6 for the 7 Riley classes
}

const CLASS_LABELS = [
  'level',
  'nearly_level',
  'slightly_rugged',
  'intermediately_rugged',
  'moderately_rugged',
  'highly_rugged',
  'extremely_rugged',
];

// Base thresholds (Riley et al. 1999, designed for 30m cells)
const BASE_THRESHOLDS = [80, 116, 161, 239, 497, 958];

// 8-neighbour offsets [dCol, dRow]
const NEIGHBOURS: [number, number][] = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

export function computeTRI(grid: ElevationGrid): TRIResult {
  const { data, width, height, noDataValue, resolution_m } = grid;
  const size = width * height;

  // Scale thresholds for high-resolution DEMs
  const scale = resolution_m < 20 ? resolution_m / 30 : 1;
  const thresholds = BASE_THRESHOLDS.map(t => t * scale);

  const triGrid = new Float32Array(size);
  const classGrid = new Int8Array(size).fill(-1);
  const counts = [0, 0, 0, 0, 0, 0, 0];
  let triSum = 0;
  let validCount = 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;

      let diffSum = 0;
      let neighbourCount = 0;

      for (const [dc, dr] of NEIGHBOURS) {
        const nc = col + dc;
        const nr = row + dr;
        if (nc < 0 || nc >= width || nr < 0 || nr >= height) continue;

        const nz = data[nr * width + nc]!;
        if (nz === noDataValue || nz < -1000) continue;

        diffSum += Math.abs(z - nz);
        neighbourCount++;
      }

      if (neighbourCount === 0) continue;

      const tri = diffSum / neighbourCount;
      triGrid[idx] = tri;
      triSum += tri;
      validCount++;

      // Classify
      let cls = 6; // extremely_rugged by default
      for (let c = 0; c < thresholds.length; c++) {
        if (tri < thresholds[c]!) {
          cls = c;
          break;
        }
      }

      classGrid[idx] = cls;
      counts[cls]!++;
    }
  }

  if (validCount === 0) {
    return {
      meanTRI_m: 0,
      classification: {
        level_pct: 0, nearly_level_pct: 0, slightly_rugged_pct: 0,
        intermediately_rugged_pct: 0, moderately_rugged_pct: 0,
        highly_rugged_pct: 0, extremely_rugged_pct: 0,
      },
      dominantClass: 'level',
      triGrid,
      classGrid,
    };
  }

  const total = Math.max(1, validCount);
  const classification = {
    level_pct: +((counts[0]! / total) * 100).toFixed(1),
    nearly_level_pct: +((counts[1]! / total) * 100).toFixed(1),
    slightly_rugged_pct: +((counts[2]! / total) * 100).toFixed(1),
    intermediately_rugged_pct: +((counts[3]! / total) * 100).toFixed(1),
    moderately_rugged_pct: +((counts[4]! / total) * 100).toFixed(1),
    highly_rugged_pct: +((counts[5]! / total) * 100).toFixed(1),
    extremely_rugged_pct: +((counts[6]! / total) * 100).toFixed(1),
  };

  const maxIdx = counts.indexOf(Math.max(...counts));
  const dominantClass = CLASS_LABELS[maxIdx] ?? 'level';

  return {
    meanTRI_m: +(triSum / validCount).toFixed(2),
    classification,
    dominantClass,
    triGrid,
    classGrid,
  };
}

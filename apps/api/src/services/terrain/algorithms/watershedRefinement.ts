/**
 * Watershed refinement analyses — derived from elevation raster + watershed geometry.
 *
 * Five analyses:
 *   1. Runoff accumulation — D8 flow accumulation grid (reuses hydro.ts)
 *   2. Flood accumulation — low-point detention zones within the parcel
 *   3. Drainage divide — internal watershed divides within the property
 *   4. Pond candidates — high flow accumulation + low slope intersections
 *   5. Swale candidates — contour-aligned locations suitable for swale placement
 *
 * All algorithms operate on the same ElevationGrid and reuse
 * computeD8FlowDirection, computeFlowAccumulation, and computeSlopeGrid
 * from hydro.ts.
 */

import type { ElevationGrid } from '../ElevationGridReader.js';
import { computeD8FlowDirection, computeFlowAccumulation, computeSlopeGrid } from './hydro.js';

// D8 neighbour offsets (matches hydro.ts order: E, SE, S, SW, W, NW, N, NE)
const D8: [number, number][] = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];

// ── Shared pre-computation ──────────────────────────────────────────────────

export interface WatershedGrids {
  flowDir: Int8Array;
  flowAcc: Float32Array;
  slope: Float32Array;
}

/** Pre-compute grids shared by all 5 analyses. */
export function precomputeWatershedGrids(grid: ElevationGrid): WatershedGrids {
  const flowDir = computeD8FlowDirection(grid);
  const flowAcc = computeFlowAccumulation(flowDir, grid.width, grid.height);
  const slope = computeSlopeGrid(grid);
  return { flowDir, flowAcc, slope };
}

// ── 1. Runoff accumulation ──────────────────────────────────────────────────

export interface RunoffAccumulationResult {
  maxAccumulation: number;
  meanAccumulation: number;
  highConcentrationPct: number; // % of cells above 90th percentile
  accumulationGrid: Float32Array;
}

export function computeRunoffAccumulation(
  grid: ElevationGrid,
  grids: WatershedGrids,
): RunoffAccumulationResult {
  const { flowAcc } = grids;
  const { noDataValue, data, width, height } = grid;

  const validValues: number[] = [];
  for (let i = 0; i < width * height; i++) {
    if (data[i]! === noDataValue || data[i]! < -1000) continue;
    validValues.push(flowAcc[i]!);
  }

  if (validValues.length === 0) {
    return {
      maxAccumulation: 0,
      meanAccumulation: 0,
      highConcentrationPct: 0,
      accumulationGrid: flowAcc,
    };
  }

  validValues.sort((a, b) => a - b);
  const p90 = validValues[Math.floor(validValues.length * 0.9)]!;
  const maxAcc = validValues[validValues.length - 1]!;
  const meanAcc = validValues.reduce((a, b) => a + b, 0) / validValues.length;
  const highCount = validValues.filter((v) => v >= p90).length;

  return {
    maxAccumulation: maxAcc,
    meanAccumulation: +meanAcc.toFixed(1),
    highConcentrationPct: +((highCount / validValues.length) * 100).toFixed(1),
    accumulationGrid: flowAcc,
  };
}

// ── 2. Flood accumulation simulation ────────────────────────────────────────

export interface FloodAccumulationResult {
  detentionZoneCount: number;
  detentionAreaPct: number;
  zones: Array<{
    centroidCol: number;
    centroidRow: number;
    cellCount: number;
    meanElevation: number;
    maxDepth: number;
  }>;
  detentionMask: Uint8Array; // 1 = detention zone cell
}

/**
 * Identify natural detention zones: local elevation minima (sinks)
 * where water pools. A sink is a cell with no downhill D8 neighbour
 * (flowDir === -1) that is NOT a nodata or edge cell. Flood fills
 * from each sink to find the connected depression basin.
 */
export function computeFloodAccumulation(
  grid: ElevationGrid,
  grids: WatershedGrids,
): FloodAccumulationResult {
  const { data, width, height, noDataValue } = grid;
  const { flowDir, slope } = grids;
  const size = width * height;
  const detentionMask = new Uint8Array(size);
  const visited = new Uint8Array(size);

  // Find sink cells: valid cells with no outflow direction
  const sinks: number[] = [];
  for (let i = 0; i < size; i++) {
    if (data[i]! === noDataValue || data[i]! < -1000) continue;
    const row = Math.floor(i / width);
    const col = i % width;
    // Exclude grid edges (those are natural pour points, not detention zones)
    if (row === 0 || row === height - 1 || col === 0 || col === width - 1) continue;
    if (flowDir[i] === -1 && slope[i]! < 5) {
      sinks.push(i);
    }
  }

  const zones: FloodAccumulationResult['zones'] = [];
  let totalDetentionCells = 0;
  let totalValidCells = 0;

  for (let i = 0; i < size; i++) {
    if (data[i]! !== noDataValue && data[i]! > -1000) totalValidCells++;
  }

  // BFS flood fill from each sink to find connected depression basins
  for (const sinkIdx of sinks) {
    if (visited[sinkIdx]) continue;

    const sinkElev = data[sinkIdx]!;
    // Depression threshold: cells within 2m above the sink elevation
    const pourThreshold = sinkElev + 2.0;

    const component: number[] = [];
    const queue = [sinkIdx];
    visited[sinkIdx] = 1;

    while (queue.length > 0) {
      const ci = queue.pop()!;
      component.push(ci);
      detentionMask[ci] = 1;

      const crow = Math.floor(ci / width);
      const ccol = ci % width;

      for (const [dc, dr] of D8) {
        const nc = ccol + dc;
        const nr = crow + dr;
        if (nc < 0 || nc >= width || nr < 0 || nr >= height) continue;
        const ni = nr * width + nc;
        if (visited[ni]) continue;
        const nz = data[ni]!;
        if (nz === noDataValue || nz < -1000) continue;
        // Include if below pour threshold and relatively flat
        if (nz <= pourThreshold && slope[ni]! < 8) {
          visited[ni] = 1;
          queue.push(ni);
        }
      }
    }

    if (component.length < 3) {
      // Too small — unmark
      for (const ci of component) detentionMask[ci] = 0;
      continue;
    }

    // Compute zone stats
    let sumElev = 0;
    let sumCol = 0;
    let sumRow = 0;
    let maxDepth = 0;
    for (const ci of component) {
      const z = data[ci]!;
      sumElev += z;
      sumCol += ci % width;
      sumRow += Math.floor(ci / width);
      const depth = pourThreshold - z;
      if (depth > maxDepth) maxDepth = depth;
    }

    zones.push({
      centroidCol: Math.round(sumCol / component.length),
      centroidRow: Math.round(sumRow / component.length),
      cellCount: component.length,
      meanElevation: +(sumElev / component.length).toFixed(1),
      maxDepth: +maxDepth.toFixed(2),
    });
    totalDetentionCells += component.length;
  }

  return {
    detentionZoneCount: zones.length,
    detentionAreaPct: totalValidCells > 0
      ? +((totalDetentionCells / totalValidCells) * 100).toFixed(1)
      : 0,
    zones,
    detentionMask,
  };
}

// ── 3. Drainage divide detection ────────────────────────────────────────────

export interface DrainageDivideResult {
  divideCount: number;
  divideCellPct: number;
  divideMask: Uint8Array; // 1 = divide cell
}

/**
 * Internal watershed divides: cells where adjacent cells flow in
 * divergent directions (to different terminal sinks). Simplified
 * approach: a cell is on a divide if its 4-connected neighbours
 * do NOT all share the same terminal pour point.
 *
 * We trace each cell to its terminal sink and mark cells where
 * neighbours drain to different sinks.
 */
export function computeDrainageDivides(
  grid: ElevationGrid,
  grids: WatershedGrids,
): DrainageDivideResult {
  const { data, width, height, noDataValue } = grid;
  const { flowDir } = grids;
  const size = width * height;

  // Trace each cell to its terminal sink (pour point)
  const sinkId = new Int32Array(size).fill(-1);

  // Assign each terminal cell (flowDir === -1) a unique sink ID
  let nextSinkId = 0;
  for (let i = 0; i < size; i++) {
    if (data[i]! === noDataValue || data[i]! < -1000) continue;
    if (flowDir[i] === -1) {
      sinkId[i] = nextSinkId++;
    }
  }

  // Trace from each cell downstream until reaching a cell with a sink ID
  function traceSink(startIdx: number): number {
    if (sinkId[startIdx]! >= 0) return sinkId[startIdx]!;

    const path: number[] = [startIdx];
    let cur = startIdx;
    const pathVisited = new Set<number>();
    pathVisited.add(cur);

    while (true) {
      const dir = flowDir[cur]!;
      if (dir < 0) break;

      const row = Math.floor(cur / width);
      const col = cur % width;
      const [dc, dr] = D8[dir]!;
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nc >= width || nr < 0 || nr >= height) break;

      cur = nr * width + nc;
      if (pathVisited.has(cur)) break; // cycle
      pathVisited.add(cur);

      if (sinkId[cur]! >= 0) {
        // Found terminal — assign all cells in path
        const id = sinkId[cur]!;
        for (const pi of path) sinkId[pi] = id;
        return id;
      }
      path.push(cur);
    }

    // Reached a cell without a sink ID — assign a new one
    const id = nextSinkId++;
    for (const pi of path) sinkId[pi] = id;
    sinkId[cur] = id;
    return id;
  }

  // Trace all cells
  for (let i = 0; i < size; i++) {
    if (data[i]! === noDataValue || data[i]! < -1000) continue;
    if (sinkId[i]! < 0) traceSink(i);
  }

  // Mark divide cells: 4-connected neighbours with different sink IDs
  const divideMask = new Uint8Array(size);
  let divideCount = 0;
  let totalValid = 0;

  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const idx = row * width + col;
      if (data[idx]! === noDataValue || data[idx]! < -1000) continue;
      totalValid++;

      const myId = sinkId[idx]!;
      if (myId < 0) continue;

      // Check 4-connected neighbours
      const n = sinkId[(row - 1) * width + col]!;
      const s = sinkId[(row + 1) * width + col]!;
      const w = sinkId[row * width + (col - 1)]!;
      const e = sinkId[row * width + (col + 1)]!;

      if (
        (n >= 0 && n !== myId) ||
        (s >= 0 && s !== myId) ||
        (w >= 0 && w !== myId) ||
        (e >= 0 && e !== myId)
      ) {
        divideMask[idx] = 1;
        divideCount++;
      }
    }
  }

  return {
    divideCount,
    divideCellPct: totalValid > 0 ? +((divideCount / totalValid) * 100).toFixed(1) : 0,
    divideMask,
  };
}

// ── 4. Pond candidate zones ─────────────────────────────────────────────────

export interface PondCandidateResult {
  candidateCount: number;
  candidates: Array<{
    centroidCol: number;
    centroidRow: number;
    cellCount: number;
    meanSlope: number;
    meanAccumulation: number;
    suitabilityScore: number; // 0-100
  }>;
  candidateMask: Uint8Array;
}

/**
 * Pond candidate zones: cells where flow accumulation is high (water
 * concentrates) AND slope is gentle (can hold water). Intersection of:
 *   - Flow accumulation >= 75th percentile
 *   - Slope < 3 degrees
 *   - Connected components of qualifying cells >= 4 cells
 *
 * Each cluster is scored by a suitability index combining accumulation
 * magnitude (catchment size) and flatness.
 */
export function computePondCandidates(
  grid: ElevationGrid,
  grids: WatershedGrids,
): PondCandidateResult {
  const { data, width, height, noDataValue } = grid;
  const { flowAcc, slope } = grids;
  const size = width * height;

  const SLOPE_MAX = 3;     // degrees
  const MIN_CLUSTER = 4;   // minimum cells for a viable pond site

  // Find accumulation threshold (75th percentile)
  const validAccValues: number[] = [];
  for (let i = 0; i < size; i++) {
    if (data[i]! === noDataValue || data[i]! < -1000) continue;
    validAccValues.push(flowAcc[i]!);
  }
  if (validAccValues.length === 0) {
    return { candidateCount: 0, candidates: [], candidateMask: new Uint8Array(size) };
  }

  validAccValues.sort((a, b) => a - b);
  const p75 = validAccValues[Math.floor(validAccValues.length * 0.75)]!;
  const maxAcc = validAccValues[validAccValues.length - 1]!;

  // Mark qualifying cells
  const qualifying = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    if (data[i]! === noDataValue || data[i]! < -1000) continue;
    if (flowAcc[i]! >= p75 && slope[i]! < SLOPE_MAX) {
      qualifying[i] = 1;
    }
  }

  // Find connected components via BFS
  const candidateMask = new Uint8Array(size);
  const visited = new Uint8Array(size);
  const candidates: PondCandidateResult['candidates'] = [];

  for (let i = 0; i < size; i++) {
    if (!qualifying[i] || visited[i]) continue;

    const component: number[] = [];
    const queue = [i];
    visited[i] = 1;

    while (queue.length > 0) {
      const ci = queue.pop()!;
      component.push(ci);
      const crow = Math.floor(ci / width);
      const ccol = ci % width;

      for (const [dc, dr] of D8) {
        const nc = ccol + dc;
        const nr = crow + dr;
        if (nc < 0 || nc >= width || nr < 0 || nr >= height) continue;
        const ni = nr * width + nc;
        if (!qualifying[ni] || visited[ni]) continue;
        visited[ni] = 1;
        queue.push(ni);
      }
    }

    if (component.length < MIN_CLUSTER) continue;

    let sumSlope = 0;
    let sumAcc = 0;
    let sumCol = 0;
    let sumRow = 0;
    for (const ci of component) {
      candidateMask[ci] = 1;
      sumSlope += slope[ci]!;
      sumAcc += flowAcc[ci]!;
      sumCol += ci % width;
      sumRow += Math.floor(ci / width);
    }

    const meanSlope = sumSlope / component.length;
    const meanAccumulation = sumAcc / component.length;

    // Suitability: 50% from accumulation (normalized), 50% from flatness
    const accScore = maxAcc > 0 ? Math.min(1, meanAccumulation / maxAcc) * 50 : 0;
    const flatScore = Math.max(0, (1 - meanSlope / SLOPE_MAX)) * 50;
    const suitabilityScore = Math.round(accScore + flatScore);

    candidates.push({
      centroidCol: Math.round(sumCol / component.length),
      centroidRow: Math.round(sumRow / component.length),
      cellCount: component.length,
      meanSlope: +meanSlope.toFixed(1),
      meanAccumulation: +meanAccumulation.toFixed(0),
      suitabilityScore,
    });
  }

  // Sort by suitability (best first)
  candidates.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  return {
    candidateCount: candidates.length,
    candidates: candidates.slice(0, 20), // cap at 20
    candidateMask,
  };
}

// ── 5. Swale candidate zones ────────────────────────────────────────────────

export interface SwaleCandidateResult {
  candidateCount: number;
  candidates: Array<{
    startCol: number;
    startRow: number;
    endCol: number;
    endRow: number;
    lengthCells: number;
    meanSlope: number;
    elevation: number;
    suitabilityScore: number; // 0-100
  }>;
  swaleMask: Uint8Array;
}

/**
 * Swale candidate zones: locations suitable for on-contour swale placement.
 *
 * A swale is a shallow trench dug along a contour line to slow, spread, and
 * infiltrate runoff. Ideal swale locations have:
 *   - Moderate slope (2-15 degrees) — too flat won't collect, too steep erodes
 *   - Moderate flow accumulation (above median, below 90th pct) — enough water
 *     to justify a swale but not so much that it overwhelms
 *   - Consistent elevation along the swale line (follows contour)
 *
 * Method: scan rows of the elevation grid for runs of cells at similar
 * elevation (within 0.5m) where slope and accumulation qualify.
 */
export function computeSwaleCandidates(
  grid: ElevationGrid,
  grids: WatershedGrids,
): SwaleCandidateResult {
  const { data, width, height, noDataValue } = grid;
  const { flowAcc, slope } = grids;
  const size = width * height;

  const SLOPE_MIN = 2;
  const SLOPE_MAX = 15;
  const ELEV_TOLERANCE = 0.5; // metres — contour tolerance
  const MIN_RUN_LENGTH = 5;   // cells

  // Find accumulation thresholds
  const validAccValues: number[] = [];
  for (let i = 0; i < size; i++) {
    if (data[i]! === noDataValue || data[i]! < -1000) continue;
    validAccValues.push(flowAcc[i]!);
  }
  if (validAccValues.length === 0) {
    return { candidateCount: 0, candidates: [], swaleMask: new Uint8Array(size) };
  }

  validAccValues.sort((a, b) => a - b);
  const p50 = validAccValues[Math.floor(validAccValues.length * 0.5)]!;
  const p90 = validAccValues[Math.floor(validAccValues.length * 0.9)]!;
  const maxAcc = validAccValues[validAccValues.length - 1]!;

  const swaleMask = new Uint8Array(size);
  const candidates: SwaleCandidateResult['candidates'] = [];

  // Scan each row for contour-following runs
  for (let row = 1; row < height - 1; row++) {
    let runStart = -1;
    let runElev = 0;

    for (let col = 0; col <= width; col++) {
      const idx = row * width + col;
      let qualifies = false;

      if (col < width) {
        const z = data[idx]!;
        if (z !== noDataValue && z > -1000) {
          const s = slope[idx]!;
          const acc = flowAcc[idx]!;
          if (s >= SLOPE_MIN && s <= SLOPE_MAX && acc >= p50 && acc < p90) {
            if (runStart < 0) {
              qualifies = true;
              runStart = col;
              runElev = z;
            } else if (Math.abs(z - runElev) <= ELEV_TOLERANCE) {
              qualifies = true;
            }
          }
        }
      }

      if (!qualifies) {
        // End of run
        if (runStart >= 0 && col - runStart >= MIN_RUN_LENGTH) {
          const startIdx = row * width + runStart;
          const endIdx = row * width + (col - 1);

          let sumSlope = 0;
          let sumAcc = 0;
          const runLen = col - runStart;
          for (let c = runStart; c < col; c++) {
            const ri = row * width + c;
            swaleMask[ri] = 1;
            sumSlope += slope[ri]!;
            sumAcc += flowAcc[ri]!;
          }

          const meanSlope = sumSlope / runLen;
          const meanAcc = sumAcc / runLen;

          // Suitability: moderate slope is best (~8 deg), moderate accumulation
          const slopeOpt = 1 - Math.abs(meanSlope - 8) / 8;
          const accNorm = maxAcc > 0 ? Math.min(1, meanAcc / (p90 * 0.5)) : 0;
          const lenNorm = Math.min(1, runLen / 20);
          const suitabilityScore = Math.round(
            (Math.max(0, slopeOpt) * 35 + accNorm * 35 + lenNorm * 30),
          );

          candidates.push({
            startCol: runStart,
            startRow: row,
            endCol: col - 1,
            endRow: row,
            lengthCells: runLen,
            meanSlope: +meanSlope.toFixed(1),
            elevation: +runElev.toFixed(1),
            suitabilityScore,
          });
        }

        runStart = -1;
      }
    }
  }

  // Sort by suitability (best first)
  candidates.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  return {
    candidateCount: candidates.length,
    candidates: candidates.slice(0, 30), // cap at 30
    swaleMask,
  };
}

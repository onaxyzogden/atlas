/**
 * D8 flow direction and flow accumulation on a DEM grid.
 *
 * D8 assigns each cell a single flow direction — the steepest descent
 * among 8 neighbours. Flow accumulation counts upstream cells draining
 * through each cell. Used by frost pocket and cold air drainage analyses.
 */

import type { ElevationGrid } from '../ElevationGridReader.js';

// D8 neighbour offsets: [dCol, dRow, distance weight]
// Order: E, SE, S, SW, W, NW, N, NE
const D8_OFFSETS: [number, number, number][] = [
  [ 1,  0, 1.0],
  [ 1,  1, 1.414],
  [ 0,  1, 1.0],
  [-1,  1, 1.414],
  [-1,  0, 1.0],
  [-1, -1, 1.414],
  [ 0, -1, 1.0],
  [ 1, -1, 1.414],
];

/**
 * Compute D8 flow direction for each cell.
 * Returns an Int8Array where each value is 0-7 (index into D8_OFFSETS)
 * or -1 for no-flow (flat / nodata / edge sink).
 */
export function computeD8FlowDirection(grid: ElevationGrid): Int8Array {
  const { data, width, height, cellSizeX, cellSizeY, noDataValue } = grid;
  const flowDir = new Int8Array(width * height).fill(-1);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;

      let maxDrop = 0;
      let bestDir = -1;

      for (let d = 0; d < 8; d++) {
        const [dc, dr, distWeight] = D8_OFFSETS[d]!;
        const nc = col + dc;
        const nr = row + dr;
        if (nc < 0 || nc >= width || nr < 0 || nr >= height) continue;

        const nz = data[nr * width + nc]!;
        if (nz === noDataValue || nz < -1000) continue;

        // Weighted drop: elevation difference / distance (in metres)
        const dist = distWeight * ((dc !== 0 ? cellSizeX : 0) + (dr !== 0 ? cellSizeY : 0)) / (Math.abs(dc) + Math.abs(dr));
        const drop = (z - nz) / dist;

        if (drop > maxDrop) {
          maxDrop = drop;
          bestDir = d;
        }
      }

      flowDir[idx] = bestDir;
    }
  }

  return flowDir;
}

/**
 * Compute flow accumulation from a D8 flow direction grid.
 * Returns a Float32Array where each value = number of upstream cells
 * draining through that cell (including itself).
 */
export function computeFlowAccumulation(
  flowDir: Int8Array,
  width: number,
  height: number,
): Float32Array {
  const size = width * height;
  const acc = new Float32Array(size).fill(1); // each cell counts itself
  const inDegree = new Int32Array(size);

  // Count in-degree for each cell
  for (let i = 0; i < size; i++) {
    const dir = flowDir[i]!;
    if (dir < 0) continue;

    const row = Math.floor(i / width);
    const col = i % width;
    const [dc, dr] = D8_OFFSETS[dir]!;
    const nc = col + dc;
    const nr = row + dr;
    if (nc >= 0 && nc < width && nr >= 0 && nr < height) {
      inDegree[nr * width + nc]!++;
    }
  }

  // Topological sort (Kahn's algorithm)
  const queue: number[] = [];
  for (let i = 0; i < size; i++) {
    if (inDegree[i] === 0 && flowDir[i]! >= 0) {
      queue.push(i);
    }
    // Also enqueue cells with no outflow but accumulation of 1
    if (flowDir[i]! < 0 && inDegree[i] === 0) {
      // leaf with no flow — skip
    }
  }

  // Also add headwater cells (in-degree 0, even if no outflow)
  for (let i = 0; i < size; i++) {
    if (inDegree[i] === 0 && flowDir[i]! < 0) {
      // These are sinks or nodata — no processing needed
    }
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++]!;
    const dir = flowDir[idx]!;
    if (dir < 0) continue;

    const row = Math.floor(idx / width);
    const col = idx % width;
    const [dc, dr] = D8_OFFSETS[dir]!;
    const nc = col + dc;
    const nr = row + dr;

    if (nc >= 0 && nc < width && nr >= 0 && nr < height) {
      const nIdx = nr * width + nc;
      acc[nIdx]! += acc[idx]!;
      inDegree[nIdx]!--;
      if (inDegree[nIdx] === 0) {
        queue.push(nIdx);
      }
    }
  }

  return acc;
}

/**
 * Compute slope in degrees for each cell using finite differences.
 * Returns a Float32Array of slope values.
 */
export function computeSlopeGrid(grid: ElevationGrid): Float32Array {
  const { data, width, height, cellSizeX, cellSizeY, noDataValue } = grid;
  const slope = new Float32Array(width * height);

  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;

      const zL = data[idx - 1]!;
      const zR = data[idx + 1]!;
      const zU = data[idx - width]!;
      const zD = data[idx + width]!;

      if (zL === noDataValue || zR === noDataValue || zU === noDataValue || zD === noDataValue) continue;
      if (zL < -1000 || zR < -1000 || zU < -1000 || zD < -1000) continue;

      const dzdx = (zR - zL) / (2 * cellSizeX);
      const dzdy = (zD - zU) / (2 * cellSizeY);
      slope[idx] = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);
    }
  }

  return slope;
}

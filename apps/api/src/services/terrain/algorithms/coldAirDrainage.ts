/**
 * Cold air drainage — traces downslope flow paths where cold air
 * travels and pools at night on calm, clear evenings.
 *
 * Method:
 *   1. Compute D8 flow direction on the original DEM
 *   2. Identify ridge cells (local maxima — no higher neighbour)
 *   3. Trace flow paths from ridge cells downhill following D8
 *   4. Pooling zones = terminal cells with high flow accumulation + low slope
 */

import type { ElevationGrid } from '../ElevationGridReader.js';
import { computeD8FlowDirection, computeFlowAccumulation, computeSlopeGrid } from './hydro.js';

export interface ColdAirDrainageResult {
  flowPaths: Array<[number, number][]>;    // arrays of [lng, lat] coords
  poolingZones: Array<[number, number][]>; // polygon rings of pooling areas
  riskRating: 'high' | 'medium' | 'low' | 'none';
}

const MAX_FLOW_PATHS = 50;       // cap to avoid massive GeoJSON
const MIN_PATH_LENGTH = 5;       // skip very short paths
const SLOPE_POOL_THRESHOLD = 3;  // degrees

export function computeColdAirDrainage(grid: ElevationGrid): ColdAirDrainageResult {
  const { data, width, height, bbox, noDataValue } = grid;
  const [minLon, minLat, maxLon, maxLat] = bbox;

  const flowDir = computeD8FlowDirection(grid);
  const flowAcc = computeFlowAccumulation(flowDir, width, height);
  const slopeGrid = computeSlopeGrid(grid);

  // D8 neighbour offsets
  const D8: [number, number][] = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1],
  ];

  // Find ridge cells: cells where no neighbour is higher
  const ridgeCells: number[] = [];
  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;

      let isRidge = true;
      for (const [dc, dr] of D8) {
        const nz = data[(row + dr) * width + (col + dc)]!;
        if (nz !== noDataValue && nz > -1000 && nz > z) {
          isRidge = false;
          break;
        }
      }
      if (isRidge) ridgeCells.push(idx);
    }
  }

  // Sort ridges by elevation (highest first) and take top N
  ridgeCells.sort((a, b) => (data[b]! - data[a]!));
  const selectedRidges = ridgeCells.slice(0, MAX_FLOW_PATHS);

  // Helper: pixel to geographic coords
  const pixToGeo = (col: number, row: number): [number, number] => [
    minLon + (col / (width - 1)) * (maxLon - minLon),
    maxLat - (row / (height - 1)) * (maxLat - minLat),
  ];

  // Trace flow paths from each ridge cell
  const flowPaths: Array<[number, number][]> = [];
  const visited = new Uint8Array(width * height);

  for (const startIdx of selectedRidges) {
    const path: [number, number][] = [];
    let currentIdx = startIdx;
    const pathVisited = new Set<number>();

    while (currentIdx >= 0 && !pathVisited.has(currentIdx)) {
      pathVisited.add(currentIdx);
      const row = Math.floor(currentIdx / width);
      const col = currentIdx % width;
      path.push(pixToGeo(col, row));

      const dir = flowDir[currentIdx]!;
      if (dir < 0) break;

      const [dc, dr] = D8[dir]!;
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nc >= width || nr < 0 || nr >= height) break;

      currentIdx = nr * width + nc;
    }

    if (path.length >= MIN_PATH_LENGTH) {
      flowPaths.push(path);
      for (const idx of pathVisited) visited[idx] = 1;
    }
  }

  // Identify pooling zones: high flow accumulation + low slope
  const validAccValues: number[] = [];
  for (let i = 0; i < flowAcc.length; i++) {
    if (data[i]! !== noDataValue && data[i]! > -1000) {
      validAccValues.push(flowAcc[i]!);
    }
  }
  validAccValues.sort((a, b) => a - b);
  const p85 = validAccValues[Math.floor(validAccValues.length * 0.85)] ?? 1;

  // Collect pooling cells and group into simple rectangular zones
  const poolingCells: number[] = [];
  for (let i = 0; i < width * height; i++) {
    if (data[i]! === noDataValue || data[i]! < -1000) continue;
    if (flowAcc[i]! >= p85 && slopeGrid[i]! < SLOPE_POOL_THRESHOLD) {
      poolingCells.push(i);
    }
  }

  // Convert pooling cells to polygon rings (simplified: bounding box per connected group)
  const poolingZones: Array<[number, number][]> = [];
  const poolVisited = new Set<number>();

  for (const cellIdx of poolingCells) {
    if (poolVisited.has(cellIdx)) continue;

    // BFS to find connected component
    const component: number[] = [];
    const bfsQueue = [cellIdx];
    poolVisited.add(cellIdx);

    while (bfsQueue.length > 0) {
      const ci = bfsQueue.pop()!;
      component.push(ci);
      const crow = Math.floor(ci / width);
      const ccol = ci % width;

      for (const [dc, dr] of D8) {
        const ni = (crow + dr) * width + (ccol + dc);
        if (ni >= 0 && ni < width * height && !poolVisited.has(ni) && poolingCells.includes(ni)) {
          poolVisited.add(ni);
          bfsQueue.push(ni);
        }
      }
    }

    if (component.length < 3) continue;

    // Bounding box of the component
    let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
    for (const ci of component) {
      const r = Math.floor(ci / width);
      const c = ci % width;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
    }

    const sw = pixToGeo(minC, maxR);
    const ne = pixToGeo(maxC, minR);
    poolingZones.push([
      [sw[0], sw[1]],
      [ne[0], sw[1]],
      [ne[0], ne[1]],
      [sw[0], ne[1]],
      [sw[0], sw[1]], // close ring
    ]);
  }

  // Risk rating based on pooling area
  const poolingAreaPct = validAccValues.length > 0
    ? (poolingCells.length / validAccValues.length) * 100
    : 0;

  let riskRating: 'high' | 'medium' | 'low' | 'none';
  if (poolingAreaPct > 15) riskRating = 'high';
  else if (poolingAreaPct > 7) riskRating = 'medium';
  else if (poolingAreaPct > 2) riskRating = 'low';
  else riskRating = 'none';

  return { flowPaths, poolingZones, riskRating };
}

/**
 * Cut/Fill Volume Estimation — compares existing terrain surface to a
 * proposed design surface (target elevation) within a polygon boundary.
 *
 * This is an on-demand utility (called per design feature), not a batch
 * analysis. It is NOT wired into TerrainAnalysisProcessor.
 *
 * Cut = material to remove (existing > target)
 * Fill = material to add  (existing < target)
 */

import type { ElevationGrid } from '../ElevationGridReader.js';

export interface CutFillResult {
  cutVolumeM3: number;
  fillVolumeM3: number;
  netVolumeM3: number;       // positive = net fill, negative = net cut
  cutAreaM2: number;
  fillAreaM2: number;
  balanceRatio: number;       // cut / fill (1.0 = perfectly balanced)
  cellCount: number;          // cells inside polygon
  diffGrid: Float32Array;     // target - existing (positive = fill, negative = cut)
  classGrid: Int8Array;       // 0=outside, 1=cut, 2=fill, 3=unchanged (within ±0.1m)
}

const UNCHANGED_THRESHOLD = 0.1; // metres — differences smaller than this are "unchanged"

/**
 * Simple ray-casting point-in-polygon test.
 * Polygon is an array of [lng, lat] rings (first ring = exterior).
 */
function pointInPolygon(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Compute cut/fill volumes for a graded area.
 *
 * @param grid           Existing elevation DEM
 * @param polygonRing    Exterior ring of the grading polygon as [lng, lat][]
 * @param targetElevM    Desired elevation in metres (NAVD88)
 */
export function computeCutFill(
  grid: ElevationGrid,
  polygonRing: [number, number][],
  targetElevM: number,
): CutFillResult {
  const { data, width, height, bbox, cellSizeX, cellSizeY, noDataValue } = grid;
  const [minLon, minLat, , ] = bbox;
  const cellArea = cellSizeX * cellSizeY; // m²

  // Longitude/latitude step per cell
  const lonStep = (bbox[2] - bbox[0]) / width;
  const latStep = (bbox[3] - bbox[1]) / height;

  const size = width * height;
  const diffGrid = new Float32Array(size);
  const classGrid = new Int8Array(size); // 0=outside by default

  let cutVolume = 0;
  let fillVolume = 0;
  let cutArea = 0;
  let fillArea = 0;
  let cellCount = 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;

      // Cell centre coordinates
      const lng = minLon + (col + 0.5) * lonStep;
      const lat = minLat + (row + 0.5) * latStep;

      if (!pointInPolygon(lng, lat, polygonRing)) continue;

      const diff = targetElevM - z; // positive = fill, negative = cut
      diffGrid[idx] = diff;
      cellCount++;

      if (diff < -UNCHANGED_THRESHOLD) {
        // Cut
        cutVolume += Math.abs(diff) * cellArea;
        cutArea += cellArea;
        classGrid[idx] = 1;
      } else if (diff > UNCHANGED_THRESHOLD) {
        // Fill
        fillVolume += diff * cellArea;
        fillArea += cellArea;
        classGrid[idx] = 2;
      } else {
        // Unchanged
        classGrid[idx] = 3;
      }
    }
  }

  const balanceRatio = fillVolume > 0 ? cutVolume / fillVolume : cutVolume > 0 ? Infinity : 1;

  return {
    cutVolumeM3: +cutVolume.toFixed(1),
    fillVolumeM3: +fillVolume.toFixed(1),
    netVolumeM3: +(fillVolume - cutVolume).toFixed(1),
    cutAreaM2: +cutArea.toFixed(1),
    fillAreaM2: +fillArea.toFixed(1),
    balanceRatio: +(Math.min(balanceRatio, 999)).toFixed(2),
    cellCount,
    diffGrid,
    classGrid,
  };
}

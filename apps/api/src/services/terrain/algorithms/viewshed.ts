/**
 * Viewshed analysis — computes visible area from an observer point.
 *
 * Uses a radial line-of-sight sweep: casts 720 rays (0.5-degree steps)
 * from the observer outward. Along each ray, tracks the maximum elevation
 * angle seen. A cell is visible if its elevation angle exceeds the current
 * maximum. This is the R3 (reference plane) approach.
 */

import type { ElevationGrid } from '../ElevationGridReader.js';

export interface ViewshedResult {
  visiblePct: number;
  observerPoint: [number, number]; // [lng, lat]
  visibleMask: Uint8Array;         // 1=visible, 0=not visible
}

const DEG_TO_RAD = Math.PI / 180;
const NUM_RAYS = 720; // 0.5-degree angular resolution

export function computeViewshed(
  grid: ElevationGrid,
  observerLngLat: [number, number],
  observerHeightM = 1.7,
): ViewshedResult {
  const { data, width, height, cellSizeX, cellSizeY, bbox, noDataValue } = grid;
  const [minLon, minLat, maxLon, maxLat] = bbox;

  // Convert observer geographic coords to grid pixel coords
  const obsCol = Math.round(((observerLngLat[0] - minLon) / (maxLon - minLon)) * (width - 1));
  const obsRow = Math.round(((maxLat - observerLngLat[1]) / (maxLat - minLat)) * (height - 1));

  // Clamp to grid
  const oc = Math.max(0, Math.min(width - 1, obsCol));
  const or_ = Math.max(0, Math.min(height - 1, obsRow));

  const obsIdx = or_ * width + oc;
  const obsElev = data[obsIdx]!;
  const observerZ = (obsElev !== noDataValue && obsElev > -1000)
    ? obsElev + observerHeightM
    : observerHeightM;

  const visibleMask = new Uint8Array(width * height);
  // Observer cell is always visible
  visibleMask[obsIdx] = 1;

  const maxRadius = Math.sqrt(width * width + height * height);

  for (let ray = 0; ray < NUM_RAYS; ray++) {
    const angle = (ray * 360) / NUM_RAYS * DEG_TO_RAD;
    const dx = Math.sin(angle); // column direction
    const dy = -Math.cos(angle); // row direction (north = -row)

    let maxAngle = -Infinity;

    // Step outward along the ray
    for (let step = 1; step < maxRadius; step++) {
      const col = Math.round(oc + dx * step);
      const row = Math.round(or_ + dy * step);

      if (col < 0 || col >= width || row < 0 || row >= height) break;

      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;

      // Distance in metres from observer
      const distX = (col - oc) * cellSizeX;
      const distY = (row - or_) * cellSizeY;
      const dist = Math.sqrt(distX * distX + distY * distY);
      if (dist < 0.001) continue;

      // Elevation angle from observer to cell top
      const elevAngle = Math.atan2(z - observerZ, dist);

      if (elevAngle >= maxAngle) {
        visibleMask[idx] = 1;
        maxAngle = elevAngle;
      }
    }
  }

  // Count visible cells
  let visibleCount = 0;
  let totalValid = 0;
  for (let i = 0; i < width * height; i++) {
    const z = data[i]!;
    if (z === noDataValue || z < -1000) continue;
    totalValid++;
    if (visibleMask[i]) visibleCount++;
  }

  return {
    visiblePct: totalValid > 0 ? +((visibleCount / totalValid) * 100).toFixed(1) : 0,
    observerPoint: observerLngLat,
    visibleMask,
  };
}

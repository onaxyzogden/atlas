/**
 * SolarExposureService — computes per-cell annual solar exposure across a
 * parcel boundary by combining DEM-derived slope/aspect with sun-path math.
 *
 * Output is a GeoJSON FeatureCollection of polygon grid cells classified
 * into exposure bands (low/medium/high/excellent), suitable for map overlay
 * and placement-zone identification. Does NOT model horizon shading.
 */

import type { Country } from '@ogden/shared';
import { computeAnnualExposure } from '@ogden/shared';
import { readElevationGrid } from './ElevationGridReader.js';
import { computeSlopeGrid, computeAspectGrid } from './algorithms/hydro.js';
import { classifiedGridToGeoJSON } from './gridToGeojson.js';
import { boundaryToBbox } from '../pipeline/adapters/UsgsElevationAdapter.js';

export interface SolarExposureResult {
  geojson: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: Record<string, unknown>;
      geometry: { type: 'Polygon' | 'LineString' | 'Point'; coordinates: unknown };
    }>;
  };
  summary: {
    mean_exposure: number;
    min_exposure: number;
    max_exposure: number;
    excellent_pct: number;
    high_pct: number;
    medium_pct: number;
    low_pct: number;
    sample_grid_size: number;
    resolution_m: number;
    source_api: string;
  };
}

/** Stride the DEM so we never generate more than this many exposure cells. */
const MAX_EXPOSURE_CELLS = 64 * 64;

export async function computeSolarExposure(
  boundary: unknown,
  country: Country,
): Promise<SolarExposureResult> {
  const bbox = boundaryToBbox(boundary);
  const grid = await readElevationGrid(bbox, country);

  const slope = computeSlopeGrid(grid);
  const aspect = computeAspectGrid(grid);

  // Stride so the output grid stays manageable for vector rendering.
  const stride = Math.max(
    1,
    Math.ceil(Math.sqrt((grid.width * grid.height) / MAX_EXPOSURE_CELLS)),
  );
  const outW = Math.floor(grid.width / stride);
  const outH = Math.floor(grid.height / stride);

  // Per-row latitude (N→S within bbox).
  const [minLon, minLat, maxLon, maxLat] = grid.bbox;
  void minLon; void maxLon;

  const scores = new Float32Array(outW * outH);
  const bands = new Int8Array(outW * outH);

  let sum = 0;
  let validCount = 0;
  let minScore = Infinity;
  let maxScore = -Infinity;
  const bandCounts = [0, 0, 0, 0, 0]; // nodata, low, medium, high, excellent

  for (let oRow = 0; oRow < outH; oRow++) {
    const srcRow = oRow * stride + Math.floor(stride / 2);
    const rowFrac = srcRow / grid.height;
    const cellLat = maxLat - rowFrac * (maxLat - minLat);

    for (let oCol = 0; oCol < outW; oCol++) {
      const srcCol = oCol * stride + Math.floor(stride / 2);
      const srcIdx = srcRow * grid.width + srcCol;
      const slopeDeg = slope[srcIdx] ?? 0;
      const aspectDeg = aspect[srcIdx] ?? NaN;

      const outIdx = oRow * outW + oCol;
      const z = grid.data[srcIdx]!;
      if (z === grid.noDataValue || z < -1000) {
        bands[outIdx] = 0;
        bandCounts[0]!++;
        continue;
      }

      const score = computeAnnualExposure(slopeDeg, aspectDeg, cellLat);
      scores[outIdx] = score;
      sum += score;
      validCount++;
      if (score < minScore) minScore = score;
      if (score > maxScore) maxScore = score;

      let band: number;
      if (score < 0.35) band = 1;
      else if (score < 0.55) band = 2;
      else if (score < 0.75) band = 3;
      else band = 4;
      bands[outIdx] = band;
      bandCounts[band]!++;
    }
  }

  const total = validCount || 1;
  const featureCollection = classifiedGridToGeoJSON(
    bands,
    outW,
    outH,
    grid.bbox,
    [
      { value: 1, label: 'low', band: 'low', min_score: 0, max_score: 0.35 },
      { value: 2, label: 'medium', band: 'medium', min_score: 0.35, max_score: 0.55 },
      { value: 3, label: 'high', band: 'high', min_score: 0.55, max_score: 0.75 },
      { value: 4, label: 'excellent', band: 'excellent', min_score: 0.75, max_score: 1 },
    ],
  );

  return {
    geojson: featureCollection,
    summary: {
      mean_exposure: validCount > 0 ? sum / validCount : 0,
      min_exposure: minScore === Infinity ? 0 : minScore,
      max_exposure: maxScore === -Infinity ? 0 : maxScore,
      excellent_pct: (bandCounts[4]! / total) * 100,
      high_pct: (bandCounts[3]! / total) * 100,
      medium_pct: (bandCounts[2]! / total) * 100,
      low_pct: (bandCounts[1]! / total) * 100,
      sample_grid_size: outW * outH,
      resolution_m: grid.resolution_m * stride,
      source_api: grid.sourceApi,
    },
  };
}

/**
 * ComfortExposureService — per-DEM-cell outdoor-comfort grid for the §6
 * Climate dashboard. Combines the parcel's base monthly normals with
 * elevation adiabatic lapse and solar-exposure bias to classify each cell
 * into the same comfort bands as the monthly calendar strip.
 *
 * Output is a classified GeoJSON FeatureCollection (freezing / cold / cool /
 * comfortable / hot) + band-area summary. On-demand compute — no persistence.
 * Horizon shading, wind channelling, and structure shadows are intentionally
 * out of scope; see §9 Structures for when those inputs land.
 */

import type { Country } from '@ogden/shared';
import {
  computeAnnualExposure,
  buildComfortBaseClimate,
  computeCellComfort,
  COMFORT_BAND_CODES,
  COMFORT_BAND_LABELS,
  type ComfortBand,
  type ComfortBaseClimate,
} from '@ogden/shared';
import { readElevationGrid } from './ElevationGridReader.js';
import { computeSlopeGrid, computeAspectGrid } from './algorithms/hydro.js';
import { classifiedGridToGeoJSON } from './gridToGeojson.js';
import { boundaryToBbox } from '../pipeline/adapters/UsgsElevationAdapter.js';

export interface ComfortExposureResult {
  geojson: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: Record<string, unknown>;
      geometry: { type: 'Polygon' | 'LineString' | 'Point'; coordinates: unknown };
    }>;
  };
  summary: {
    reference_mean_max_c: number;
    reference_mean_min_c: number;
    reference_elevation_m: number;
    freezing_pct: number;
    cold_pct: number;
    cool_pct: number;
    comfortable_pct: number;
    hot_pct: number;
    dominant_band: ComfortBand;
    sample_grid_size: number;
    resolution_m: number;
    source_api: string;
  };
}

export interface ComfortExposureNormal {
  mean_max_c?: number | null;
  mean_min_c?: number | null;
}

const MAX_COMFORT_CELLS = 64 * 64;

export async function computeComfortExposure(
  boundary: unknown,
  country: Country,
  normals: ComfortExposureNormal[] | null,
): Promise<ComfortExposureResult> {
  const bbox = boundaryToBbox(boundary);
  const grid = await readElevationGrid(bbox, country);

  const slope = computeSlopeGrid(grid);
  const aspect = computeAspectGrid(grid);

  const stride = Math.max(
    1,
    Math.ceil(Math.sqrt((grid.width * grid.height) / MAX_COMFORT_CELLS)),
  );
  const outW = Math.floor(grid.width / stride);
  const outH = Math.floor(grid.height / stride);

  // Reference elevation = grid centroid cell (fallback 0 if nodata there).
  const cRow = Math.floor(grid.height / 2);
  const cCol = Math.floor(grid.width / 2);
  const cZ = grid.data[cRow * grid.width + cCol];
  const referenceElevationM =
    cZ != null && cZ !== grid.noDataValue && cZ > -1000 ? cZ : 0;

  const base = buildComfortBaseClimate(normals, referenceElevationM);
  if (!base) {
    throw new Error('NO_CLIMATE_NORMALS');
  }

  const [minLon, minLat, maxLon, maxLat] = grid.bbox;
  void minLon;
  void maxLon;

  const bands = new Int8Array(outW * outH);
  const bandCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (let oRow = 0; oRow < outH; oRow++) {
    const srcRow = oRow * stride + Math.floor(stride / 2);
    const rowFrac = srcRow / grid.height;
    const cellLat = maxLat - rowFrac * (maxLat - minLat);

    for (let oCol = 0; oCol < outW; oCol++) {
      const srcCol = oCol * stride + Math.floor(stride / 2);
      const srcIdx = srcRow * grid.width + srcCol;
      const outIdx = oRow * outW + oCol;

      const z = grid.data[srcIdx]!;
      if (z === grid.noDataValue || z < -1000) {
        bands[outIdx] = 0;
        bandCounts[0]!++;
        continue;
      }

      const slopeDeg = slope[srcIdx] ?? 0;
      const aspectDeg = aspect[srcIdx] ?? NaN;
      const exposureFrac = computeAnnualExposure(slopeDeg, aspectDeg, cellLat);

      const result = computeCellComfort(
        { elevationM: z, solarExposureFrac: exposureFrac },
        base,
      );
      const code = COMFORT_BAND_CODES[result.band];
      bands[outIdx] = code;
      bandCounts[code] = (bandCounts[code] ?? 0) + 1;
    }
  }

  const validCount =
    bandCounts[1]! + bandCounts[2]! + bandCounts[3]! + bandCounts[4]! + bandCounts[5]!;
  const total = validCount || 1;

  const featureCollection = classifiedGridToGeoJSON(
    bands,
    outW,
    outH,
    grid.bbox,
    COMFORT_BAND_LABELS.map((label, i) => ({
      value: i + 1,
      label,
      band: label,
    })),
  );

  const dominantBand = pickDominantBand(bandCounts);

  return {
    geojson: featureCollection,
    summary: {
      reference_mean_max_c: base.annualMeanMaxC,
      reference_mean_min_c: base.annualMeanMinC,
      reference_elevation_m: base.referenceElevationM,
      freezing_pct: (bandCounts[1]! / total) * 100,
      cold_pct: (bandCounts[2]! / total) * 100,
      cool_pct: (bandCounts[3]! / total) * 100,
      comfortable_pct: (bandCounts[4]! / total) * 100,
      hot_pct: (bandCounts[5]! / total) * 100,
      dominant_band: dominantBand,
      sample_grid_size: outW * outH,
      resolution_m: grid.resolution_m * stride,
      source_api: grid.sourceApi,
    },
  };
}

function pickDominantBand(counts: Record<number, number>): ComfortBand {
  let bestCode = 4;
  let bestCount = -1;
  for (let code = 1; code <= 5; code++) {
    const c = counts[code] ?? 0;
    if (c > bestCount) {
      bestCount = c;
      bestCode = code;
    }
  }
  return COMFORT_BAND_LABELS[bestCode - 1]!;
}

export interface ComfortExposureBaseSummary extends ComfortBaseClimate {}

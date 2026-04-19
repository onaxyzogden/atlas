/**
 * UsgsElevationAdapter — Fetches elevation data from the USGS 3DEP WCS service
 * and returns summary statistics for a project boundary.
 *
 * API: https://elevation.nationalmap.gov/arcgis/services/3DEPElevation/ImageServer/WCSServer
 *
 * This adapter delegates actual raster acquisition to ElevationGridReader.read3dep(),
 * which already handles WCS parameters, GeoTIFF parsing, and nodata filtering.
 * The adapter computes elevation/slope summary statistics from the returned grid
 * and packages them as an AdapterResult for the pipeline.
 *
 * Second live adapter in the pipeline (after SsurgoAdapter).
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { readElevationGrid, type ElevationGrid } from '../../terrain/ElevationGridReader.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'UsgsElevationAdapter' });

// ─── Types ────────────────────────────────────────────────────────────────────

type Position = [number, number];
type Ring = Position[];

interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: Ring[];
}

interface GeoJsonMultiPolygon {
  type: 'MultiPolygon';
  coordinates: Ring[][];
}

type BoundaryGeometry = GeoJsonPolygon | GeoJsonMultiPolygon;

interface ElevationSummary {
  min_elevation_m: number;
  max_elevation_m: number;
  mean_elevation_m: number;
  elevation_range_m: number;
  median_elevation_m: number;
  std_dev_m: number;
  mean_slope_deg: number;
  max_slope_deg: number;
  predominant_aspect: string;
  terrain_ruggedness: string;
  raster_width: number;
  raster_height: number;
  resolution_m: number;
  valid_cell_pct: number;
  data_date: string;
  source_api: 'USGS 3DEP (WCS)';
  confidence: 'high' | 'medium' | 'low';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract bounding box [minLon, minLat, maxLon, maxLat] from GeoJSON geometry.
 */
export function boundaryToBbox(geojson: unknown): [number, number, number, number] {
  const geo = (geojson && typeof geojson === 'object' && 'type' in geojson)
    ? geojson as BoundaryGeometry
    : null;

  if (!geo) {
    throw new AppError('ADAPTER_INVALID_INPUT', 'Invalid GeoJSON boundary', 400);
  }

  let allCoords: Position[];

  if (geo.type === 'Polygon') {
    allCoords = geo.coordinates.flat();
  } else if (geo.type === 'MultiPolygon') {
    allCoords = geo.coordinates.flat(2);
  } else {
    throw new AppError(
      'ADAPTER_INVALID_INPUT',
      `Unsupported geometry type: ${(geo as { type: string }).type}`,
      400,
    );
  }

  if (allCoords.length === 0) {
    throw new AppError('ADAPTER_INVALID_INPUT', 'Boundary has no coordinates', 400);
  }

  let minLon = Infinity, minLat = Infinity;
  let maxLon = -Infinity, maxLat = -Infinity;

  for (const [lng, lat] of allCoords) {
    if (lng < minLon) minLon = lng;
    if (lng > maxLon) maxLon = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Compute slope in degrees between two adjacent cells using rise/run.
 */
function slopeAtCell(
  data: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  cellSizeX: number,
  cellSizeY: number,
  noData: number,
): number | null {
  // Need at least one neighbor in each direction
  if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1) return null;

  const idx = (i: number, j: number) => j * width + i;

  const z = data[idx(x, y)]!;
  if (z === noData) return null;

  const zW = data[idx(x - 1, y)]!;
  const zE = data[idx(x + 1, y)]!;
  const zN = data[idx(x, y - 1)]!;
  const zS = data[idx(x, y + 1)]!;

  if (zW === noData || zE === noData || zN === noData || zS === noData) return null;

  const dzdx = (zE - zW) / (2 * cellSizeX);
  const dzdy = (zS - zN) / (2 * cellSizeY);

  return Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);
}

/**
 * Compute aspect (compass direction of steepest descent) at a cell.
 * Returns degrees clockwise from north (0-360).
 */
function aspectAtCell(
  data: Float32Array,
  width: number,
  x: number,
  y: number,
  cellSizeX: number,
  cellSizeY: number,
  noData: number,
): number | null {
  if (x <= 0 || x >= width - 1 || y <= 0 || y >= (data.length / width) - 1) return null;

  const idx = (i: number, j: number) => j * width + i;

  const zW = data[idx(x - 1, y)]!;
  const zE = data[idx(x + 1, y)]!;
  const zN = data[idx(x, y - 1)]!;
  const zS = data[idx(x, y + 1)]!;

  if (zW === noData || zE === noData || zN === noData || zS === noData) return null;

  const dzdx = (zE - zW) / (2 * cellSizeX);
  const dzdy = (zS - zN) / (2 * cellSizeY);

  if (dzdx === 0 && dzdy === 0) return -1; // Flat

  // atan2 returns radians; convert to degrees CW from north
  let aspect = Math.atan2(dzdx, -dzdy) * (180 / Math.PI);
  if (aspect < 0) aspect += 360;
  return aspect;
}

/**
 * Convert aspect degrees to cardinal direction string.
 */
function aspectToCardinal(degrees: number): string {
  if (degrees < 0) return 'Flat';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(degrees / 45) % 8;
  return dirs[idx]!;
}

/**
 * Classify terrain ruggedness by elevation range and mean slope.
 */
function classifyRuggedness(rangeM: number, meanSlopeDeg: number): string {
  if (meanSlopeDeg > 20 || rangeM > 300) return 'Rugged';
  if (meanSlopeDeg > 10 || rangeM > 100) return 'Moderately Rugged';
  if (meanSlopeDeg > 5 || rangeM > 30) return 'Gently Rolling';
  return 'Flat to Gentle';
}

/**
 * Compute elevation summary statistics from a grid.
 */
export function computeElevationSummary(grid: ElevationGrid): ElevationSummary {
  const { data, width, height, cellSizeX, cellSizeY, noDataValue } = grid;

  // ── Elevation stats ──
  const validValues: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const v = data[i]!;
    if (v !== noDataValue && v > -1000 && v < 9000) {
      validValues.push(v);
    }
  }

  const validCellPct = data.length > 0
    ? Math.round((validValues.length / data.length) * 10000) / 100
    : 0;

  if (validValues.length === 0) {
    return {
      min_elevation_m: 0,
      max_elevation_m: 0,
      mean_elevation_m: 0,
      elevation_range_m: 0,
      median_elevation_m: 0,
      std_dev_m: 0,
      mean_slope_deg: 0,
      max_slope_deg: 0,
      predominant_aspect: 'Unknown',
      terrain_ruggedness: 'Unknown',
      raster_width: width,
      raster_height: height,
      resolution_m: grid.resolution_m,
      valid_cell_pct: 0,
      data_date: new Date().toISOString().split('T')[0]!,
      source_api: 'USGS 3DEP (WCS)',
      confidence: 'low',
    };
  }

  const minElev = Math.min(...validValues);
  const maxElev = Math.max(...validValues);
  const meanElev = validValues.reduce((s, v) => s + v, 0) / validValues.length;
  const rangeElev = maxElev - minElev;

  // Median
  const sorted = [...validValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianElev = sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;

  // Standard deviation
  const variance = validValues.reduce((s, v) => s + (v - meanElev) ** 2, 0) / validValues.length;
  const stdDev = Math.sqrt(variance);

  // ── Slope stats ──
  const slopes: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const s = slopeAtCell(data, width, height, x, y, cellSizeX, cellSizeY, noDataValue);
      if (s !== null) slopes.push(s);
    }
  }

  const meanSlope = slopes.length > 0
    ? slopes.reduce((s, v) => s + v, 0) / slopes.length
    : 0;
  const maxSlope = slopes.length > 0 ? Math.max(...slopes) : 0;

  // ── Aspect stats (predominant direction) ──
  const aspectCounts = new Map<string, number>();
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const a = aspectAtCell(data, width, x, y, cellSizeX, cellSizeY, noDataValue);
      if (a !== null) {
        const dir = aspectToCardinal(a);
        aspectCounts.set(dir, (aspectCounts.get(dir) ?? 0) + 1);
      }
    }
  }

  let predominantAspect = 'Flat';
  let maxCount = 0;
  for (const [dir, count] of aspectCounts) {
    if (count > maxCount) {
      maxCount = count;
      predominantAspect = dir;
    }
  }

  const ruggedness = classifyRuggedness(rangeElev, meanSlope);

  // Confidence: high if >80% valid cells, medium if >50%, low otherwise
  const confidence: 'high' | 'medium' | 'low' =
    validCellPct >= 80 ? 'high' : validCellPct >= 50 ? 'medium' : 'low';

  return {
    min_elevation_m: +minElev.toFixed(1),
    max_elevation_m: +maxElev.toFixed(1),
    mean_elevation_m: +meanElev.toFixed(1),
    elevation_range_m: +rangeElev.toFixed(1),
    median_elevation_m: +medianElev.toFixed(1),
    std_dev_m: +stdDev.toFixed(2),
    mean_slope_deg: +meanSlope.toFixed(1),
    max_slope_deg: +maxSlope.toFixed(1),
    predominant_aspect: predominantAspect,
    terrain_ruggedness: ruggedness,
    raster_width: width,
    raster_height: height,
    resolution_m: grid.resolution_m,
    valid_cell_pct: validCellPct,
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: 'USGS 3DEP (WCS)',
    confidence,
  };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class UsgsElevationAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, _context: ProjectContext): Promise<AdapterResult> {
    // Step 1: Extract bounding box from GeoJSON boundary
    const bbox = boundaryToBbox(boundary);
    logger.info({ bbox }, 'Fetching USGS 3DEP elevation for boundary');

    // Step 2: Fetch elevation raster via ElevationGridReader
    let grid: ElevationGrid;
    try {
      grid = await readElevationGrid(bbox, 'US');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // WCS timeout or network failure
      if (message.includes('timeout') || message.includes('abort')) {
        throw new AppError('ADAPTER_TIMEOUT', `USGS 3DEP request timed out: ${message}`, 504);
      }

      // XML/error response from WCS
      if (message.includes('XML') || message.includes('error')) {
        throw new AppError('ADAPTER_HTTP_ERROR', `USGS 3DEP returned error: ${message}`, 502);
      }

      throw new AppError('ADAPTER_NETWORK', `USGS 3DEP request failed: ${message}`, 502);
    }

    // Step 3: Compute summary statistics
    const summary = computeElevationSummary(grid);

    logger.info(
      {
        resolution: summary.resolution_m,
        validCells: summary.valid_cell_pct,
        elevRange: summary.elevation_range_m,
        confidence: summary.confidence,
      },
      'USGS 3DEP fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: 'USGS 3DEP (WCS)',
      attributionText: this.getAttributionText(),
      confidence: summary.confidence,
      dataDate: summary.data_date,
      summaryData: summary,
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'U.S. Geological Survey, 3D Elevation Program (3DEP), The National Map';
  }
}

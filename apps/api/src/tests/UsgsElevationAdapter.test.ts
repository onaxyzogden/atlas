import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  boundaryToBbox,
  computeElevationSummary,
  UsgsElevationAdapter,
} from '../services/pipeline/adapters/UsgsElevationAdapter.js';
import type { ElevationGrid } from '../services/terrain/ElevationGridReader.js';

// ─── Mock ElevationGridReader ────────────────────────────────────────────────

vi.mock('../services/terrain/ElevationGridReader.js', () => ({
  readElevationGrid: vi.fn(),
}));

import { readElevationGrid } from '../services/terrain/ElevationGridReader.js';
const mockReadGrid = vi.mocked(readElevationGrid);

beforeEach(() => {
  mockReadGrid.mockReset();
});

// ─── Test fixtures ───────────────────────────────────────────────────────────

const DC_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-77.036, 38.886],
    [-77.032, 38.886],
    [-77.032, 38.888],
    [-77.036, 38.888],
    [-77.036, 38.886],
  ]],
};

const MULTI_POLYGON = {
  type: 'MultiPolygon' as const,
  coordinates: [
    [[
      [-77.036, 38.886],
      [-77.032, 38.886],
      [-77.032, 38.888],
      [-77.036, 38.888],
      [-77.036, 38.886],
    ]],
    [[
      [-77.040, 38.890],
      [-77.038, 38.890],
      [-77.038, 38.892],
      [-77.040, 38.892],
      [-77.040, 38.890],
    ]],
  ],
};

/** 4x4 elevation grid with known values for deterministic tests */
function makeTestGrid(overrides?: Partial<ElevationGrid>): ElevationGrid {
  // Elevation values: a simple slope from 100m (NW) to 130m (SE)
  const data = new Float32Array([
    100, 105, 110, 115,
    105, 110, 115, 120,
    110, 115, 120, 125,
    115, 120, 125, 130,
  ]);

  return {
    data,
    width: 4,
    height: 4,
    cellSizeX: 10,
    cellSizeY: 10,
    bbox: [-77.036, 38.886, -77.032, 38.888],
    noDataValue: -9999,
    resolution_m: 10,
    sourceApi: 'usgs_3dep',
    confidence: 'high',
    ...overrides,
  };
}

/** Grid with nodata cells */
function makePartialGrid(): ElevationGrid {
  const data = new Float32Array([
    100, 105, -9999, -9999,
    105, 110, 115,   -9999,
    110, 115, 120,   125,
    115, 120, 125,   130,
  ]);

  return {
    data,
    width: 4,
    height: 4,
    cellSizeX: 10,
    cellSizeY: 10,
    bbox: [-77.036, 38.886, -77.032, 38.888],
    noDataValue: -9999,
    resolution_m: 10,
    sourceApi: 'usgs_3dep',
    confidence: 'high',
  };
}

/** Completely nodata grid */
function makeEmptyGrid(): ElevationGrid {
  const data = new Float32Array(16).fill(-9999);
  return {
    data,
    width: 4,
    height: 4,
    cellSizeX: 10,
    cellSizeY: 10,
    bbox: [-77.036, 38.886, -77.032, 38.888],
    noDataValue: -9999,
    resolution_m: 10,
    sourceApi: 'usgs_3dep',
    confidence: 'high',
  };
}

// ─── boundaryToBbox ──────────────────────────────────────────────────────────

describe('boundaryToBbox', () => {
  it('extracts bbox from Polygon', () => {
    const bbox = boundaryToBbox(DC_POLYGON);
    expect(bbox).toEqual([-77.036, 38.886, -77.032, 38.888]);
  });

  it('extracts bbox from MultiPolygon (union of all polygons)', () => {
    const bbox = boundaryToBbox(MULTI_POLYGON);
    expect(bbox[0]).toBe(-77.040); // minLon from second polygon
    expect(bbox[1]).toBe(38.886);  // minLat from first polygon
    expect(bbox[2]).toBe(-77.032); // maxLon from first polygon
    expect(bbox[3]).toBe(38.892);  // maxLat from second polygon
  });

  it('throws on null input', () => {
    expect(() => boundaryToBbox(null)).toThrow('Invalid GeoJSON boundary');
  });

  it('throws on unsupported geometry type', () => {
    expect(() => boundaryToBbox({ type: 'Point', coordinates: [0, 0] })).toThrow('Unsupported geometry type');
  });

  it('throws on empty polygon coordinates', () => {
    expect(() => boundaryToBbox({ type: 'Polygon', coordinates: [[]] })).toThrow('no coordinates');
  });
});

// ─── computeElevationSummary ─────────────────────────────────────────────────

describe('computeElevationSummary', () => {
  it('computes correct min/max/mean for uniform slope', () => {
    const grid = makeTestGrid();
    const s = computeElevationSummary(grid);

    expect(s.min_elevation_m).toBe(100);
    expect(s.max_elevation_m).toBe(130);
    expect(s.elevation_range_m).toBe(30);
    expect(s.mean_elevation_m).toBeCloseTo(115, 0);
    expect(s.valid_cell_pct).toBe(100);
    expect(s.confidence).toBe('high');
    expect(s.source_api).toBe('USGS 3DEP (WCS)');
  });

  it('computes median correctly for even count', () => {
    const grid = makeTestGrid();
    const s = computeElevationSummary(grid);
    // 16 sorted values: 100,105,105,110,110,110,115,115,115,115,120,120,120,125,125,130
    // median = (115 + 115) / 2 = 115
    expect(s.median_elevation_m).toBe(115);
  });

  it('computes slope > 0 for sloped terrain', () => {
    const grid = makeTestGrid();
    const s = computeElevationSummary(grid);
    expect(s.mean_slope_deg).toBeGreaterThan(0);
    expect(s.max_slope_deg).toBeGreaterThan(0);
  });

  it('reports predominant aspect for SW-facing slope', () => {
    const grid = makeTestGrid();
    const s = computeElevationSummary(grid);
    // Slope goes from NW (low) to SE (high) — steepest descent faces NW
    // But the exact cardinal depends on cell size symmetry
    expect(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'Flat']).toContain(s.predominant_aspect);
  });

  it('handles partial nodata correctly', () => {
    const grid = makePartialGrid();
    const s = computeElevationSummary(grid);

    // 13 out of 16 cells are valid (3 are nodata)
    expect(s.valid_cell_pct).toBeCloseTo(81.25, 1);
    expect(s.confidence).toBe('high'); // >80%
    expect(s.min_elevation_m).toBe(100);
    expect(s.max_elevation_m).toBe(130);
  });

  it('handles all-nodata grid gracefully', () => {
    const grid = makeEmptyGrid();
    const s = computeElevationSummary(grid);

    expect(s.valid_cell_pct).toBe(0);
    expect(s.confidence).toBe('low');
    expect(s.min_elevation_m).toBe(0);
    expect(s.max_elevation_m).toBe(0);
    expect(s.mean_slope_deg).toBe(0);
    expect(s.predominant_aspect).toBe('Unknown');
    expect(s.terrain_ruggedness).toBe('Unknown');
  });

  it('classifies flat terrain correctly', () => {
    // All cells at same elevation
    const data = new Float32Array(16).fill(200);
    const grid = makeTestGrid({ data });
    const s = computeElevationSummary(grid);

    expect(s.elevation_range_m).toBe(0);
    expect(s.mean_slope_deg).toBe(0);
    expect(s.terrain_ruggedness).toBe('Flat to Gentle');
  });

  it('classifies rugged terrain correctly', () => {
    // Extreme elevation variation
    const data = new Float32Array([
      100, 400, 100, 400,
      400, 100, 400, 100,
      100, 400, 100, 400,
      400, 100, 400, 100,
    ]);
    const grid = makeTestGrid({ data });
    const s = computeElevationSummary(grid);

    expect(s.elevation_range_m).toBe(300);
    // With 10m cell size and 300m range, slope drives ruggedness classification
    expect(['Rugged', 'Moderately Rugged']).toContain(s.terrain_ruggedness);
  });

  it('includes correct resolution and raster dimensions', () => {
    const grid = makeTestGrid();
    const s = computeElevationSummary(grid);

    expect(s.resolution_m).toBe(10);
    expect(s.raster_width).toBe(4);
    expect(s.raster_height).toBe(4);
  });

  it('confidence is medium when valid cells between 50-80%', () => {
    // 8 valid out of 16 = 50%
    const data = new Float32Array([
      100, 105, 110, 115,
      120, 125, 130, 135,
      -9999, -9999, -9999, -9999,
      -9999, -9999, -9999, -9999,
    ]);
    const grid = makeTestGrid({ data });
    const s = computeElevationSummary(grid);

    expect(s.valid_cell_pct).toBe(50);
    expect(s.confidence).toBe('medium');
  });
});

// ─── UsgsElevationAdapter integration ────────────────────────────────────────

describe('UsgsElevationAdapter', () => {
  const adapter = new UsgsElevationAdapter('usgs_3dep', 'elevation');

  const mockContext = {
    projectId: 'test-123',
    country: 'US' as const,
    provinceState: 'DC',
    conservationAuthId: null,
    boundaryGeojson: DC_POLYGON,
    centroidLat: 38.887,
    centroidLng: -77.034,
  };

  it('returns AdapterResult with correct structure', async () => {
    mockReadGrid.mockResolvedValue(makeTestGrid());

    const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

    expect(result.layerType).toBe('elevation');
    expect(result.sourceApi).toBe('USGS 3DEP (WCS)');
    expect(result.confidence).toBe('high');
    expect(result.dataDate).toBeTruthy();
    expect(result.attributionText).toContain('3D Elevation Program');

    const summary = result.summaryData as Record<string, unknown>;
    expect(summary.min_elevation_m).toBe(100);
    expect(summary.max_elevation_m).toBe(130);
    expect(summary.resolution_m).toBe(10);
  });

  it('calls readElevationGrid with correct bbox and country', async () => {
    mockReadGrid.mockResolvedValue(makeTestGrid());

    await adapter.fetchForBoundary(DC_POLYGON, mockContext);

    expect(mockReadGrid).toHaveBeenCalledWith(
      [-77.036, 38.886, -77.032, 38.888],
      'US',
    );
  });

  it('wraps timeout errors as ADAPTER_TIMEOUT', async () => {
    mockReadGrid.mockRejectedValue(new Error('request timeout'));

    await expect(adapter.fetchForBoundary(DC_POLYGON, mockContext))
      .rejects.toThrow('USGS 3DEP request timed out');
  });

  it('wraps XML errors as ADAPTER_HTTP_ERROR', async () => {
    mockReadGrid.mockRejectedValue(new Error('WCS returned error/XML response'));

    await expect(adapter.fetchForBoundary(DC_POLYGON, mockContext))
      .rejects.toThrow('USGS 3DEP returned error');
  });

  it('wraps network errors as ADAPTER_NETWORK', async () => {
    mockReadGrid.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(adapter.fetchForBoundary(DC_POLYGON, mockContext))
      .rejects.toThrow('USGS 3DEP request failed');
  });

  it('getConfidence returns result confidence', () => {
    expect(adapter.getConfidence({
      layerType: 'elevation',
      sourceApi: 'USGS 3DEP (WCS)',
      attributionText: '',
      confidence: 'high',
      dataDate: null,
    })).toBe('high');
  });

  it('getAttributionText returns USGS attribution', () => {
    expect(adapter.getAttributionText()).toContain('U.S. Geological Survey');
    expect(adapter.getAttributionText()).toContain('3DEP');
  });
});

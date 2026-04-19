import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NrcanHrdemAdapter } from '../services/pipeline/adapters/NrcanHrdemAdapter.js';

// ─── Mock ElevationGridReader ────────────────────────────────────────────────

vi.mock('../services/terrain/ElevationGridReader.js', () => ({
  readElevationGrid: vi.fn(),
}));

import { readElevationGrid } from '../services/terrain/ElevationGridReader.js';
const mockReadGrid = vi.mocked(readElevationGrid);

beforeEach(() => {
  mockReadGrid.mockReset();
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ON_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-79.400, 43.650],
    [-79.396, 43.650],
    [-79.396, 43.654],
    [-79.400, 43.654],
    [-79.400, 43.650],
  ]],
};

const mockContext = {
  projectId: 'test-ca',
  country: 'CA' as const,
  provinceState: 'ON',
  conservationAuthId: null,
  boundaryGeojson: ON_POLYGON,
  centroidLat: 43.652,
  centroidLng: -79.398,
};

function makeGrid(confidence: 'high' | 'medium' = 'high') {
  const data = new Float32Array([
    150, 155, 160,
    155, 160, 165,
    160, 165, 170,
  ]);
  return {
    data,
    width: 3,
    height: 3,
    cellSizeX: 10,
    cellSizeY: 10,
    bbox: [-79.400, 43.650, -79.396, 43.654] as [number, number, number, number],
    noDataValue: -9999,
    resolution_m: 10,
    sourceApi: confidence === 'high' ? 'nrcan_hrdem' : 'nrcan_cdem',
    confidence,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NrcanHrdemAdapter', () => {
  const adapter = new NrcanHrdemAdapter('nrcan_hrdem', 'elevation');

  it('returns AdapterResult with NRCan source info', async () => {
    mockReadGrid.mockResolvedValue(makeGrid());

    const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

    expect(result.layerType).toBe('elevation');
    expect(result.sourceApi).toBe('NRCan HRDEM (STAC/COG)');
    expect(result.confidence).toBe('high');
    expect(result.attributionText).toContain('Natural Resources Canada');
  });

  it('calls readElevationGrid with CA country', async () => {
    mockReadGrid.mockResolvedValue(makeGrid());

    await adapter.fetchForBoundary(ON_POLYGON, mockContext);

    expect(mockReadGrid).toHaveBeenCalledWith(
      [-79.400, 43.650, -79.396, 43.654],
      'CA',
    );
  });

  it('passes through CDEM fallback confidence (medium)', async () => {
    mockReadGrid.mockResolvedValue(makeGrid('medium'));

    const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

    expect(result.confidence).toBe('medium');
  });

  it('returns unavailable result when no HRDEM coverage', async () => {
    mockReadGrid.mockRejectedValue(new Error('No HRDEM coverage found for this bounding box'));

    const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

    expect(result.confidence).toBe('low');
    const summary = result.summaryData as Record<string, unknown>;
    expect(summary.unavailable).toBe(true);
    expect(summary.reason).toBe('outside_hrdem_coverage');
  });

  it('wraps timeout errors', async () => {
    mockReadGrid.mockRejectedValue(new Error('request timeout'));

    await expect(adapter.fetchForBoundary(ON_POLYGON, mockContext))
      .rejects.toThrow('timed out');
  });

  it('wraps STAC errors', async () => {
    mockReadGrid.mockRejectedValue(new Error('STAC search failed: HTTP 503'));

    await expect(adapter.fetchForBoundary(ON_POLYGON, mockContext))
      .rejects.toThrow('STAC error');
  });

  it('computes elevation summary from grid', async () => {
    mockReadGrid.mockResolvedValue(makeGrid());

    const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
    const summary = result.summaryData as Record<string, unknown>;

    expect(summary.min_elevation_m).toBe(150);
    expect(summary.max_elevation_m).toBe(170);
    expect(summary.elevation_range_m).toBe(20);
    expect(summary.resolution_m).toBe(10);
  });

  it('getAttributionText references NRCan', () => {
    expect(adapter.getAttributionText()).toContain('HRDEM');
  });
});

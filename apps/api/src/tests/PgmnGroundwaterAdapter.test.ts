import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgmnGroundwaterAdapter } from '../services/pipeline/adapters/PgmnGroundwaterAdapter.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

const CENTROID_LAT = 43.55;
const CENTROID_LNG = -79.66;

const ON_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-79.67, 43.54], [-79.65, 43.54],
    [-79.65, 43.56], [-79.67, 43.56],
    [-79.67, 43.54],
  ]],
};

const mockContext = {
  projectId: 'test-pgmn',
  country: 'CA' as const,
  provinceState: 'ON',
  conservationAuthId: null,
  boundaryGeojson: ON_POLYGON,
  centroidLat: CENTROID_LAT,
  centroidLng: CENTROID_LNG,
};

function mockLioSuccess(features: Array<Record<string, unknown>>, geometry?: Array<{ x: number; y: number }>) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      features: features.map((attrs, i) => ({
        attributes: attrs,
        geometry: geometry?.[i],
      })),
    }),
  });
}

function mockLioEmpty() {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ features: [] }) });
}

describe('PgmnGroundwaterAdapter', () => {
  const adapter = new PgmnGroundwaterAdapter('ontario_pgmn', 'groundwater');

  it('picks the nearest well by haversine distance and returns medium confidence on valid depth', async () => {
    mockLioSuccess([
      { LATITUDE: 43.60, LONGITUDE: -79.70, WELL_NAME: 'Far well', WATER_LEVEL_M: 8.5, SAMPLE_DATE: '2026-02-01T00:00:00' }, // ~6 km
      { LATITUDE: 43.551, LONGITUDE: -79.661, WELL_NAME: 'Near well', WATER_LEVEL_M: 3.2, SAMPLE_DATE: '2026-03-10T00:00:00' }, // ~0.1 km
    ]);
    const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
    const s = result.summaryData as Record<string, unknown>;
    expect(s.station_name).toBe('Near well');
    expect(s.station_count).toBe(2);
    expect(s.groundwater_depth_m).toBe(3.2);
    expect(s.groundwater_depth_ft).toBeCloseTo(10.5, 1);
    expect(result.confidence).toBe('medium');
    expect(result.sourceApi).toBe('Ontario PGMN (LIO)');
    expect(result.dataDate).toBe('2026-03-10');
  });

  it('falls back through LIO layers when the first returns empty', async () => {
    // First two layers empty, third returns a well
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            attributes: { LATITUDE: 43.55, LONGITUDE: -79.66, WELL_NAME: 'Layer-3 well', WATER_LEVEL_M: 5, SAMPLE_DATE: '2026-01-15T00:00:00' },
          }],
        }),
      });
    const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
    const s = result.summaryData as Record<string, unknown>;
    expect(s.station_name).toBe('Layer-3 well');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('returns low-confidence unavailable when all LIO layers fail', async () => {
    mockLioEmpty();
    const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
    const s = result.summaryData as Record<string, unknown>;
    expect(result.confidence).toBe('low');
    expect(result.dataDate).toBeNull();
    expect(s.station_count).toBe(0);
    expect(s.groundwater_depth_m).toBeNull();
  });

  it('uses geometry.x/y when attributes lack LATITUDE/LONGITUDE', async () => {
    mockLioSuccess(
      [{ WELL_NAME: 'Geom-only well', WATER_LEVEL_M: 4.0, SAMPLE_DATE: '2026-03-01T00:00:00' }],
      [{ x: -79.66, y: 43.55 }],
    );
    const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
    const s = result.summaryData as Record<string, unknown>;
    expect(s.station_name).toBe('Geom-only well');
    expect(s.station_count).toBe(1);
  });

  it('survives non-OK HTTP on all layers and returns unavailable without throwing', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
    const s = result.summaryData as Record<string, unknown>;
    expect(s.station_count).toBe(0);
    expect(result.confidence).toBe('low');
  });

  it('attribution text mentions PGMN / Ontario', () => {
    expect(adapter.getAttributionText()).toMatch(/PGMN|Ontario/);
  });
});

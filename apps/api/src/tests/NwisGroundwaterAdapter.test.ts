import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NwisGroundwaterAdapter } from '../services/pipeline/adapters/NwisGroundwaterAdapter.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

const CENTROID_LAT = 38.887;
const CENTROID_LNG = -77.034;

const DC_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-77.036, 38.886], [-77.032, 38.886],
    [-77.032, 38.888], [-77.036, 38.888],
    [-77.036, 38.886],
  ]],
};

const mockContext = {
  projectId: 'test-nwis',
  country: 'US' as const,
  provinceState: 'DC',
  conservationAuthId: null,
  boundaryGeojson: DC_POLYGON,
  centroidLat: CENTROID_LAT,
  centroidLng: CENTROID_LNG,
};

function mockNwisSuccess(wells: Array<{ lat: number; lng: number; name: string; depthFt: number; dateTime: string }>) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      value: {
        timeSeries: wells.map((w) => ({
          sourceInfo: {
            siteName: w.name,
            geoLocation: { geogLocation: { latitude: w.lat, longitude: w.lng } },
          },
          values: [{ value: [{ value: String(w.depthFt), dateTime: w.dateTime }] }],
        })),
      },
    }),
  });
}

describe('NwisGroundwaterAdapter', () => {
  const adapter = new NwisGroundwaterAdapter('usgs_nwis', 'groundwater');

  it('picks the nearest well by haversine distance', async () => {
    mockNwisSuccess([
      { lat: 38.800, lng: -77.100, name: 'Far well', depthFt: 50, dateTime: '2026-03-01T00:00:00' }, // ~12 km
      { lat: 38.888, lng: -77.035, name: 'Near well', depthFt: 32.8, dateTime: '2026-03-15T00:00:00' }, // ~0.1 km
      { lat: 38.950, lng: -77.200, name: 'Middle well', depthFt: 80, dateTime: '2026-03-10T00:00:00' }, // ~16 km
    ]);
    const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
    const s = result.summaryData as Record<string, unknown>;
    expect(s.station_name).toBe('Near well');
    expect(s.station_count).toBe(3);
    // 32.8 ft / 3.28084 = 10.0 m
    expect(s.groundwater_depth_m).toBeCloseTo(10.0, 1);
    expect(s.groundwater_depth_ft).toBe(32.8);
    expect(result.confidence).toBe('high');
    expect(result.sourceApi).toBe('USGS NWIS');
    expect(result.dataDate).toBe('2026-03-15');
  });

  it('filters wells without coordinates or with non-finite depth', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: {
          timeSeries: [
            // No geoLocation — skipped
            {
              sourceInfo: { siteName: 'No coords' },
              values: [{ value: [{ value: '42.0', dateTime: '2026-03-01T00:00:00' }] }],
            },
            // Empty value string — skipped
            {
              sourceInfo: { siteName: 'Empty value', geoLocation: { geogLocation: { latitude: 38.9, longitude: -77.05 } } },
              values: [{ value: [{ value: '', dateTime: '2026-03-01T00:00:00' }] }],
            },
            // Negative depth — skipped
            {
              sourceInfo: { siteName: 'Negative', geoLocation: { geogLocation: { latitude: 38.9, longitude: -77.05 } } },
              values: [{ value: [{ value: '-5', dateTime: '2026-03-01T00:00:00' }] }],
            },
            // Good well
            {
              sourceInfo: { siteName: 'Good', geoLocation: { geogLocation: { latitude: 38.889, longitude: -77.035 } } },
              values: [{ value: [{ value: '20', dateTime: '2026-03-05T00:00:00' }] }],
            },
          ],
        },
      }),
    });
    const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
    const s = result.summaryData as Record<string, unknown>;
    expect(s.station_count).toBe(1);
    expect(s.station_name).toBe('Good');
  });

  it('returns unavailable (low confidence, station_count=0) when NWIS yields no wells', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: { timeSeries: [] } }),
    });
    const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
    const s = result.summaryData as Record<string, unknown>;
    expect(result.confidence).toBe('low');
    expect(result.dataDate).toBeNull();
    expect(s.station_count).toBe(0);
    expect(s.groundwater_depth_m).toBeNull();
    expect(typeof s.heuristic_note).toBe('string');
  });

  it('treats HTTP 404 as empty (NWIS returns 404 for zero matching sites)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'No sites found',
    });
    const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
    const s = result.summaryData as Record<string, unknown>;
    expect(s.station_count).toBe(0);
  });

  it('throws ADAPTER_HTTP_ERROR on non-404 HTTP errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'internal error',
    });
    await expect(adapter.fetchForBoundary(DC_POLYGON, mockContext)).rejects.toThrow(/NWIS gwlevels/);
  });

  it('builds a 1° bbox around the centroid with siteType=GW and parameterCd=72019', async () => {
    mockNwisSuccess([{ lat: 38.888, lng: -77.035, name: 'One', depthFt: 30, dateTime: '2026-03-15T00:00:00' }]);
    await adapter.fetchForBoundary(DC_POLYGON, mockContext);
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain('siteType=GW');
    expect(url).toContain('parameterCd=72019');
    expect(url).toContain('format=json');
    // bbox corners: centroid ± 0.5°
    expect(url).toContain('bBox=-77.5340,38.3870,-76.5340,39.3870');
  });

  it('attribution text mentions USGS NWIS', () => {
    expect(adapter.getAttributionText()).toMatch(/USGS|National Water Information System/i);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EcccClimateAdapter } from '../services/pipeline/adapters/EcccClimateAdapter.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ON_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-79.400, 43.650], [-79.396, 43.650],
    [-79.396, 43.654], [-79.400, 43.654],
    [-79.400, 43.650],
  ]],
};

const mockContext = {
  projectId: 'test-eccc',
  country: 'CA' as const,
  provinceState: 'ON',
  conservationAuthId: null,
  boundaryGeojson: ON_POLYGON,
  centroidLat: 43.652,
  centroidLng: -79.398,
};

// Full ECCC OGC API response — Toronto station close to centroid
const ECCC_FULL_RESPONSE = {
  features: [
    {
      geometry: { coordinates: [-79.380, 43.670] as [number, number] },
      properties: {
        STATION_NAME: 'TORONTO PEARSON INTL A',
        ANNUAL_PRECIP: 784.0,
        MEAN_TEMP: 8.9,
        FROST_FREE_PERIOD: 168,
        LAST_SPRING_FROST_DATE: 'Apr 22',
        FIRST_FALL_FROST_DATE: 'Oct 7',
        HARDINESS_ZONE: '6a',
        NORMAL_CODE: '1981-2010',
      },
    },
  ],
};

// Response with only precipitation and temp (no frost dates)
const ECCC_PARTIAL_RESPONSE = {
  features: [
    {
      geometry: { coordinates: [-79.380, 43.670] as [number, number] },
      properties: {
        STATION_NAME: 'TORONTO PARTIAL',
        ANNUAL_PRECIP: 750.0,
        MEAN_TEMP: 9.1,
        FROST_FREE_PERIOD: null,
        LAST_SPRING_FROST_DATE: null,
        FIRST_FALL_FROST_DATE: null,
        HARDINESS_ZONE: null,
        NORMAL_CODE: '1981-2010',
      },
    },
  ],
};

// Response using alternate field names (dataset v2)
const ECCC_ALT_FIELDS_RESPONSE = {
  features: [
    {
      geometry: { coordinates: [-79.380, 43.670] as [number, number] },
      properties: {
        STATION_NAME: 'TORONTO ALT',
        TOTAL_PRECIP: 800.0,             // alternate precip field
        ANNUAL_MEAN_TEMP: 9.2,           // alternate temp field
        FROST_FREE_DAYS: 170,            // alternate frost-free field
        LAST_FROST_DATE: 'Apr 20',       // alternate last frost field
        FIRST_FROST_DATE: 'Oct 10',      // alternate first frost field
        CLIMATE_ZONE: '6b',              // alternate hardiness field
        NORMAL_CODE: '1991-2020',
      },
    },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EcccClimateAdapter', () => {
  const adapter = new EcccClimateAdapter('eccc_normals', 'climate');

  describe('successful query with full ECCC data', () => {
    it('returns climate layer type and correct source API', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_FULL_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.layerType).toBe('climate');
      expect(result.sourceApi).toBe('ECCC Climate Normals (OGC API)');
    });

    it('returns annual precipitation in mm', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_FULL_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.annual_precip_mm).toBe(784.0);
    });

    it('returns annual mean temperature in Celsius', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_FULL_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.annual_temp_mean_c).toBe(8.9);
    });

    it('returns frost-free period as growing_season_days', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_FULL_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.growing_season_days).toBe(168);
    });

    it('returns last and first frost dates', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_FULL_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.last_frost_date).toBe('Apr 22');
      expect(s.first_frost_date).toBe('Oct 7');
    });

    it('returns hardiness zone', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_FULL_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.hardiness_zone).toBe('6a');
    });

    it('returns station name and distance', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_FULL_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.eccc_station).toBe('TORONTO PEARSON INTL A');
      expect(typeof s.eccc_station_distance_km).toBe('number');
      expect(s.eccc_station_distance_km as number).toBeGreaterThanOrEqual(0);
    });

    it('returns high confidence when station is nearby with full data', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_FULL_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      // Station at [-79.380, 43.670] → ~2.4 km from centroid → high confidence
      expect(result.confidence).toBe('high');
    });

    it('returns data_period from NORMAL_CODE field', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_FULL_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.data_period).toBe('1981-2010');
    });
  });

  describe('alternate ECCC field names', () => {
    it('reads TOTAL_PRECIP when ANNUAL_PRECIP is absent', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_ALT_FIELDS_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.annual_precip_mm).toBe(800.0);
    });

    it('reads ANNUAL_MEAN_TEMP when MEAN_TEMP is absent', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_ALT_FIELDS_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.annual_temp_mean_c).toBeCloseTo(9.2, 1);
    });

    it('reads FROST_FREE_DAYS when FROST_FREE_PERIOD is absent', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_ALT_FIELDS_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.growing_season_days).toBe(170);
    });

    it('reads CLIMATE_ZONE when HARDINESS_ZONE is absent', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_ALT_FIELDS_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.hardiness_zone).toBe('6b');
    });
  });

  describe('partial data', () => {
    it('returns non-null precip and temp when only core fields are present', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ECCC_PARTIAL_RESPONSE });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.annual_precip_mm).toBe(750.0);
      expect(s.annual_temp_mean_c).toBeCloseTo(9.1, 1);
      expect(s.growing_season_days).toBeNull();
      expect(s.last_frost_date).toBeNull();
      expect(s.first_frost_date).toBeNull();
      expect(s.hardiness_zone).toBeNull();
    });
  });

  describe('fallback behavior', () => {
    it('falls back to latitude estimate when no stations found', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.eccc_station).toBeNull();
      expect(s.annual_precip_mm).not.toBeNull(); // latitude estimate fills it
    });

    it('falls back when both core fields are null in the response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            geometry: { coordinates: [-79.380, 43.670] },
            properties: { STATION_NAME: 'EMPTY', ANNUAL_PRECIP: null, MEAN_TEMP: null },
          }],
        }),
      });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
    });

    it('falls back gracefully on HTTP error (never throws)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'unavailable' });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      expect(result.layerType).toBe('climate');
    });
  });

  it('getAttributionText references ECCC', () => {
    const text = adapter.getAttributionText();
    expect(text).toContain('Environment and Climate Change Canada');
    expect(text).toContain('ECCC');
  });
});

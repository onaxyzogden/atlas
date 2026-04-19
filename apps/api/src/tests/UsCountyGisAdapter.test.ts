import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsCountyGisAdapter } from '../services/pipeline/adapters/UsCountyGisAdapter.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Lancaster County, PA (FIPS 42071) — in the registry
const LANCASTER_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-76.310, 40.040], [-76.306, 40.040],
    [-76.306, 40.044], [-76.310, 40.044],
    [-76.310, 40.040],
  ]],
};

const mockContext = {
  projectId: 'test-us-zoning',
  country: 'US' as const,
  provinceState: 'PA',
  conservationAuthId: null,
  boundaryGeojson: LANCASTER_POLYGON,
  centroidLat: 40.042,
  centroidLng: -76.308,
};

// Dane County, WI (FIPS 55025) — also in registry, dairy country
const mockDaneContext = {
  ...mockContext,
  provinceState: 'WI',
  centroidLat: 43.073,
  centroidLng: -89.401,
};

// FCC geocoder → Lancaster County, PA
const FCC_LANCASTER_RESPONSE = {
  results: [{
    county_fips: '42071',
    county_name: 'Lancaster',
    state_code: 'PA',
    state_fips: '42',
  }],
};

// FCC geocoder → Dane County, WI
const FCC_DANE_RESPONSE = {
  results: [{
    county_fips: '55025',
    county_name: 'Dane',
    state_code: 'WI',
    state_fips: '55',
  }],
};

// FCC geocoder → Adams County, NE (FIPS 31001 — not in registry)
const FCC_UNLISTED_RESPONSE = {
  results: [{
    county_fips: '31001',
    county_name: 'Adams',
    state_code: 'NE',
    state_fips: '31',
  }],
};

// Lancaster County GIS — agricultural zoning
const COUNTY_AG_RESPONSE = {
  features: [{
    attributes: {
      ZONING: 'AG',
      FULLNAME: 'Agricultural General',
    },
  }],
};

// Dane County GIS — residential zoning
const COUNTY_RESIDENTIAL_RESPONSE = {
  features: [{
    attributes: {
      ZONING_DISTRICT: 'R-1',
      ZONING_CATAGORY: 'Residential Single Family',
    },
  }],
};

// County GIS — no features at point
const EMPTY_FEATURES = { features: [] };

function mockFccThenCounty(fcc: object, county: object) {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => fcc })
    .mockResolvedValueOnce({ ok: true, json: async () => county });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UsCountyGisAdapter', () => {
  const adapter = new UsCountyGisAdapter('county_gis', 'zoning');

  describe('successful query — registered county with agricultural zoning', () => {
    it('returns zoning layer type and county GIS as sourceApi', async () => {
      mockFccThenCounty(FCC_LANCASTER_RESPONSE, COUNTY_AG_RESPONSE);

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);

      expect(result.layerType).toBe('zoning');
      expect(result.sourceApi).toContain('Lancaster County');
    });

    it('returns medium confidence for registered county', async () => {
      mockFccThenCounty(FCC_LANCASTER_RESPONSE, COUNTY_AG_RESPONSE);

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);

      expect(result.confidence).toBe('medium');
    });

    it('extracts zoning_code from county GIS response', async () => {
      mockFccThenCounty(FCC_LANCASTER_RESPONSE, COUNTY_AG_RESPONSE);

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.zoning_code).toBe('AG');
    });

    it('builds zoning_description with code and full name', async () => {
      mockFccThenCounty(FCC_LANCASTER_RESPONSE, COUNTY_AG_RESPONSE);

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.zoning_description as string).toContain('AG');
      expect(s.zoning_description as string).toContain('Agricultural');
    });

    it('sets is_agricultural true for AG zone code', async () => {
      mockFccThenCounty(FCC_LANCASTER_RESPONSE, COUNTY_AG_RESPONSE);

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.is_agricultural).toBe(true);
    });

    it('returns non-empty permitted_uses for agricultural zone', async () => {
      mockFccThenCounty(FCC_LANCASTER_RESPONSE, COUNTY_AG_RESPONSE);

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(Array.isArray(s.permitted_uses)).toBe(true);
      expect((s.permitted_uses as string[]).length).toBeGreaterThan(0);
    });

    it('captures county_name and state_code from FCC response', async () => {
      mockFccThenCounty(FCC_LANCASTER_RESPONSE, COUNTY_AG_RESPONSE);

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.county_name).toBe('Lancaster');
      expect(s.state_code).toBe('PA');
    });

    it('sets registry_coverage true for registered county', async () => {
      mockFccThenCounty(FCC_LANCASTER_RESPONSE, COUNTY_AG_RESPONSE);

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.registry_coverage).toBe(true);
    });
  });

  describe('residential zoning inference (Dane County)', () => {
    it('sets is_agricultural false for R-1 residential zone', async () => {
      mockFccThenCounty(FCC_DANE_RESPONSE, COUNTY_RESIDENTIAL_RESPONSE);

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockDaneContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.is_agricultural).toBe(false);
      expect(s.zoning_code).toBe('R-1');
    });
  });

  describe('unregistered county — structured unavailable result', () => {
    it('returns low confidence for county not in registry', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FCC_UNLISTED_RESPONSE });

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
    });

    it('returns informative zoning_description for unlisted county', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FCC_UNLISTED_RESPONSE });

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.zoning_description as string).toContain('Adams');
      expect(s.zoning_description as string).toContain('NE');
    });

    it('sets registry_coverage false for unlisted county', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FCC_UNLISTED_RESPONSE });

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.registry_coverage).toBe(false);
    });
  });

  describe('FCC geocoder failure', () => {
    it('returns low confidence when FCC geocoder fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, text: async () => '' });

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
    });

    it('returns structured unavailable when FCC returns empty results', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.county_name).toBeNull();
    });
  });

  describe('county GIS query failure', () => {
    it('falls back to unavailable when county endpoint returns no features', async () => {
      mockFccThenCounty(FCC_LANCASTER_RESPONSE, EMPTY_FEATURES);

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.registry_coverage).toBe(false);
    });

    it('falls back gracefully when county GIS returns HTTP error', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => FCC_LANCASTER_RESPONSE })
        .mockResolvedValueOnce({ ok: false, status: 503, text: async () => '' });

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);

      expect(result.layerType).toBe('zoning');
      expect(result.confidence).toBe('low');
    });
  });

  describe('overlay district', () => {
    it('captures overlay_districts when present in county response', async () => {
      mockFccThenCounty(FCC_LANCASTER_RESPONSE, {
        features: [{
          attributes: {
            ZONING: 'A-1',
            FULLNAME: 'Agricultural',
            // No overlay field for Lancaster
          },
        }],
      });

      const result = await adapter.fetchForBoundary(LANCASTER_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(Array.isArray(s.overlay_districts)).toBe(true);
    });
  });

  it('getAttributionText references county planning departments', () => {
    const text = adapter.getAttributionText();
    expect(text).toContain('county');
    expect(text).toContain('zoning');
  });
});

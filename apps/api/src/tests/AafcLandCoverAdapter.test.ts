import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AafcLandCoverAdapter } from '../services/pipeline/adapters/AafcLandCoverAdapter.js';

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
  projectId: 'test-aafc',
  country: 'CA' as const,
  provinceState: 'ON',
  conservationAuthId: null,
  boundaryGeojson: ON_POLYGON,
  centroidLat: 43.652,
  centroidLng: -79.398,
};

function makeAafcResponse(code: number | string) {
  return {
    ok: true,
    json: async () => ({ value: code }),
  };
}

const NODATA_RESPONSE = {
  ok: true,
  json: async () => ({ value: 'NoData' }),
};

const CLOUD_RESPONSE = {
  ok: true,
  json: async () => ({ value: 1 }), // Cloud — not usable
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AafcLandCoverAdapter', () => {
  const adapter = new AafcLandCoverAdapter('aafc_annual_crop', 'land_cover');

  describe('successful AAFC query', () => {
    it('returns land_cover layer type and correct source API', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(3)); // Soybeans

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.layerType).toBe('land_cover');
      expect(result.sourceApi).toBe('AAFC Annual Crop Inventory 2024');
    });

    it('returns high confidence when AAFC returns a usable code', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(10)); // Spring Wheat

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('high');
    });

    it('returns correct primary_class for soybeans (code 3)', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(3));

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.primary_class).toBe('Soybeans');
      expect(s.aafc_code).toBe(3);
    });

    it('returns Agriculture dominant_system for crop codes', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(13)); // Barley

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.dominant_system).toBe('Agriculture');
      expect(s.is_agricultural).toBe(true);
      expect(s.is_natural).toBe(false);
    });

    it('returns Wetland dominant_system for code 131', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(131)); // Wetland

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.dominant_system).toBe('Wetland');
      expect(s.is_natural).toBe(true);
      expect(s.is_agricultural).toBe(false);
    });

    it('returns Developed dominant_system for code 134', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(134)); // Developed / Urban

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.dominant_system).toBe('Developed');
    });

    it('returns high tree_canopy_pct for orchards (code 50)', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(50)); // Orchards & Vineyards

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.tree_canopy_pct as number).toBeGreaterThan(40);
    });

    it('returns near-zero tree_canopy_pct for row crops', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(2)); // Corn

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.tree_canopy_pct as number).toBeLessThan(5);
    });

    it('returns high impervious_pct for developed code (134)', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(134));

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.impervious_pct as number).toBeGreaterThan(30);
    });

    it('returns classes distribution as a non-empty object', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(5)); // Canola

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      const classes = s.classes as Record<string, number>;
      expect(typeof classes).toBe('object');
      expect(Object.keys(classes).length).toBeGreaterThan(0);
    });

    it('returns data_year 2024', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(3));

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.data_year).toBe('2024');
    });

    it('accepts value as a string number (e.g. "3")', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse('3')); // string "3" = Soybeans

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.primary_class).toBe('Soybeans');
    });
  });

  describe('NoData and cloud fallback', () => {
    it('falls back to latitude estimate when AAFC returns NoData', async () => {
      mockFetch.mockResolvedValueOnce(NODATA_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.aafc_code).toBeNull();
    });

    it('falls back to latitude estimate when AAFC returns cloud code (1)', async () => {
      mockFetch.mockResolvedValueOnce(CLOUD_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
    });

    it('falls back gracefully on HTTP error (never throws)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'unavailable' });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      expect(result.layerType).toBe('land_cover');
    });

    it('latitude fallback produces reasonable agricultural distribution for Ontario lat', async () => {
      mockFetch.mockResolvedValueOnce(NODATA_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      const classes = s.classes as Record<string, number>;
      // Ontario at lat 43.6 should show significant crop/forage + some forest
      const total = Object.values(classes).reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThan(50);
    });
  });

  describe('Grassland and natural codes', () => {
    it('returns Grassland dominant_system for code 110', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(110));

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.dominant_system).toBe('Grassland');
      expect(s.is_natural).toBe(true);
    });

    it('returns Shrubland dominant_system for code 120', async () => {
      mockFetch.mockResolvedValueOnce(makeAafcResponse(120));

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.dominant_system).toBe('Shrubland');
    });
  });

  it('getAttributionText references AAFC and 2024', () => {
    const text = adapter.getAttributionText();
    expect(text).toContain('Agriculture and Agri-Food Canada');
    expect(text).toContain('AAFC');
    expect(text).toContain('2024');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NlcdAdapter } from '../services/pipeline/adapters/NlcdAdapter.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

// ─── Fixtures ────────────────────────────────────────────────────────────────

const DC_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-77.036, 38.886], [-77.032, 38.886],
    [-77.032, 38.888], [-77.036, 38.888],
    [-77.036, 38.886],
  ]],
};

const mockContext = {
  projectId: 'test-nlcd',
  country: 'US' as const,
  provinceState: 'DC',
  conservationAuthId: null,
  boundaryGeojson: DC_POLYGON,
  centroidLat: 38.887,
  centroidLng: -77.034,
};

// NLCD WMS response — deciduous forest (code 41)
function makeNlcdResponse(grayIndex: number) {
  return {
    ok: true,
    json: async () => ({
      features: [{ properties: { GRAY_INDEX: grayIndex } }],
    }),
  };
}

// WMS response using 'value' property instead of GRAY_INDEX
function makeNlcdValueResponse(val: number) {
  return {
    ok: true,
    json: async () => ({
      features: [{ properties: { value: val } }],
    }),
  };
}

const EMPTY_FEATURES_RESPONSE = {
  ok: true,
  json: async () => ({ features: [] }),
};

const NO_FEATURES_RESPONSE = {
  ok: true,
  json: async () => ({}),
};

// Mock 5 identical responses (centroid + 4 offsets)
function mockAllSamples(code: number) {
  for (let i = 0; i < 5; i++) {
    mockFetch.mockResolvedValueOnce(makeNlcdResponse(code));
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NlcdAdapter', () => {
  const adapter = new NlcdAdapter('nlcd', 'land_cover');

  describe('successful NLCD query — forest site', () => {
    it('returns land_cover layer type and correct source API', async () => {
      mockAllSamples(41); // Deciduous Forest

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.layerType).toBe('land_cover');
      expect(result.sourceApi).toBe('USGS NLCD 2021');
    });

    it('returns high confidence when centroid (first sample) returns a value', async () => {
      mockAllSamples(41);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('high');
    });

    it('returns primary_class as Deciduous Forest for code 41', async () => {
      mockAllSamples(41);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.primary_class).toBe('Deciduous Forest');
      expect(s.nlcd_code).toBe(41);
    });

    it('returns dominant_system as Forest for forest codes', async () => {
      mockAllSamples(42); // Evergreen Forest

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.dominant_system).toBe('Forest');
    });

    it('returns tree_canopy_pct > 50 for forest sites', async () => {
      mockAllSamples(41);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.tree_canopy_pct as number).toBeGreaterThan(50);
    });

    it('returns tree_canopy_pct near 0 for cropland sites (code 82)', async () => {
      mockAllSamples(82); // Cultivated Crops

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.tree_canopy_pct as number).toBeLessThan(10);
    });

    it('returns impervious_pct > 50 for high-density developed sites (code 24)', async () => {
      mockAllSamples(24); // Developed, High Intensity

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.impervious_pct as number).toBeGreaterThan(50);
      expect(s.dominant_system).toBe('Developed');
    });

    it('returns impervious_pct near 0 for natural land', async () => {
      mockAllSamples(71); // Grassland/Herbaceous

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.impervious_pct as number).toBeLessThan(5);
    });

    it('returns classes distribution as a non-empty object', async () => {
      mockAllSamples(41);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      const classes = s.classes as Record<string, number>;
      expect(typeof classes).toBe('object');
      expect(Object.keys(classes).length).toBeGreaterThan(0);
    });

    it('returns sample_count = 5 when all samples succeed', async () => {
      mockAllSamples(82);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.sample_count).toBe(5);
    });

    it('reads value property when GRAY_INDEX is absent', async () => {
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce(makeNlcdValueResponse(81)); // Pasture/Hay
      }

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.primary_class).toBe('Pasture/Hay');
    });

    it('returns data_year 2021', async () => {
      mockAllSamples(41);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.data_year).toBe('2021');
    });
  });

  describe('mixed class distribution', () => {
    it('builds a distribution when samples return different codes', async () => {
      // 3× forest (41), 2× cropland (82)
      mockFetch
        .mockResolvedValueOnce(makeNlcdResponse(41))
        .mockResolvedValueOnce(makeNlcdResponse(41))
        .mockResolvedValueOnce(makeNlcdResponse(41))
        .mockResolvedValueOnce(makeNlcdResponse(82))
        .mockResolvedValueOnce(makeNlcdResponse(82));

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      // Forest (3/5 = 60%) is dominant
      expect(s.primary_class).toBe('Deciduous Forest');
      expect(s.sample_count).toBe(5);
    });
  });

  describe('partial success — some samples fail', () => {
    it('returns medium confidence when only offset samples succeed (centroid failed)', async () => {
      mockFetch
        .mockResolvedValueOnce(EMPTY_FEATURES_RESPONSE) // centroid → null
        .mockResolvedValueOnce(makeNlcdResponse(41))
        .mockResolvedValueOnce(makeNlcdResponse(41))
        .mockResolvedValueOnce(makeNlcdResponse(41))
        .mockResolvedValueOnce(makeNlcdResponse(41));

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('medium');
      expect((result.summaryData as Record<string, unknown>).sample_count).toBe(4);
    });

    it('still returns a result when some HTTP requests fail', async () => {
      mockFetch
        .mockResolvedValueOnce(makeNlcdResponse(82))
        .mockResolvedValueOnce({ ok: false, status: 503, text: async () => '' })
        .mockResolvedValueOnce(makeNlcdResponse(82))
        .mockResolvedValueOnce({ ok: false, status: 503, text: async () => '' })
        .mockResolvedValueOnce(makeNlcdResponse(82));

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.layerType).toBe('land_cover');
      expect((result.summaryData as Record<string, unknown>).sample_count).toBe(3);
    });
  });

  describe('fallback behavior', () => {
    it('falls back to latitude estimate when all samples return empty features', async () => {
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce(EMPTY_FEATURES_RESPONSE);
      }

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.nlcd_code).toBeNull();
      expect(s.sample_count).toBe(0);
    });

    it('falls back when WMS returns no features property', async () => {
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce(NO_FEATURES_RESPONSE);
      }

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
    });
  });

  it('getAttributionText references MRLC and National Land Cover Database 2021', () => {
    const text = adapter.getAttributionText();
    expect(text).toContain('MRLC');
    expect(text).toContain('National Land Cover Database');
    expect(text).toContain('2021');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NhdAdapter } from '../services/pipeline/adapters/NhdAdapter.js';

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
  projectId: 'test-nhd',
  country: 'US' as const,
  provinceState: 'DC',
  conservationAuthId: null,
  boundaryGeojson: DC_POLYGON,
  centroidLat: 38.887,
  centroidLng: -77.034,
};

const HUC8_RESPONSE = {
  features: [{ attributes: { HUC8: '02070010', NAME: 'Middle Potomac-Anacostia-Occoquan', STATES: 'DC,MD,VA', AREASQKM: '4252.8' } }],
};
const HUC10_RESPONSE = {
  features: [{ attributes: { HUC10: '0207001001', NAME: 'Watts Branch', STATES: 'DC,MD', AREASQKM: '48.3' } }],
};
const HUC12_RESPONSE = {
  features: [{ attributes: { HUC12: '020700100101', NAME: 'Rock Creek', STATES: 'DC', AREASQKM: '12.6' } }],
};
const EMPTY_RESPONSE = { features: [] };

function mockAllLayers(huc8 = HUC8_RESPONSE, huc10 = HUC10_RESPONSE, huc12 = HUC12_RESPONSE) {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => huc8 })
    .mockResolvedValueOnce({ ok: true, json: async () => huc10 })
    .mockResolvedValueOnce({ ok: true, json: async () => huc12 });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NhdAdapter', () => {
  const adapter = new NhdAdapter('nhd', 'watershed');

  describe('successful full HUC hierarchy', () => {
    it('returns high-confidence result with all three HUC levels', async () => {
      mockAllLayers();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.layerType).toBe('watershed');
      expect(result.confidence).toBe('high'); // HUC12 found
      expect(result.sourceApi).toBe('USGS WBD (NHD Plus)');
    });

    it('returns full HUC hierarchy in summaryData', async () => {
      mockAllLayers();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.huc8).toBe('02070010');
      expect(s.huc8_name).toBe('Middle Potomac-Anacostia-Occoquan');
      expect(s.huc10).toBe('0207001001');
      expect(s.huc10_name).toBe('Watts Branch');
      expect(s.huc12).toBe('020700100101');
      expect(s.huc12_name).toBe('Rock Creek');
    });

    it('uses most specific HUC as huc_code + watershed_name', async () => {
      mockAllLayers();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.huc_code).toBe('020700100101');
      expect(s.watershed_name).toBe('Rock Creek');
    });

    it('converts area from km² to ha', async () => {
      mockAllLayers();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      // 12.6 km² × 100 = 1260 ha
      expect(s.drainage_area_ha).toBe(1260);
    });

    it('includes states field', async () => {
      mockAllLayers();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.states).toBe('DC');
    });
  });

  describe('partial HUC hierarchy (only HUC8+10)', () => {
    it('returns medium confidence when HUC12 missing', async () => {
      mockAllLayers(HUC8_RESPONSE, HUC10_RESPONSE, EMPTY_RESPONSE);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('medium');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.huc12).toBeNull();
      expect(s.huc_code).toBe('0207001001'); // Falls back to HUC10
    });
  });

  describe('no WBD features', () => {
    it('returns unavailable result outside CONUS', async () => {
      mockAllLayers(EMPTY_RESPONSE, EMPTY_RESPONSE, EMPTY_RESPONSE);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.unavailable).toBe(true);
      expect(s.reason).toBe('outside_nhd_coverage');
    });
  });

  describe('error handling', () => {
    it('returns unavailable result when all layers fail (allSettled swallows errors)', async () => {
      // Simulate gateway timeout via HTTP 504 — same fallback path as an AbortError/network timeout.
      // mockRejectedValue triggers a vitest unhandledRejection false-positive for these adapters.
      mockFetch.mockResolvedValue({ ok: false, status: 504, text: async () => 'gateway timeout' });

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.unavailable).toBe(true);
      expect(s.reason).toBe('outside_nhd_coverage');
    });

    it('returns unavailable result when all layers return HTTP error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'unavailable' });

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
    });
  });

  describe('flow direction', () => {
    it('derives flow direction from longitude and latitude', async () => {
      mockAllLayers();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      // DC: lng -77 (> -105 so east of divide), lat 38.887 (< 40) → 'S'
      expect(s.flow_direction).toBe('S');
    });

    it('returns SE for northern sites east of the divide', async () => {
      mockAllLayers();

      const northernContext = { ...mockContext, centroidLat: 45, centroidLng: -72 };
      const result = await adapter.fetchForBoundary(DC_POLYGON, northernContext);
      const s = result.summaryData as Record<string, unknown>;

      // lat 45 > 40, lng -72 > -105 → 'SE'
      expect(s.flow_direction).toBe('SE');
    });
  });

  it('getAttributionText references WBD + NHD Plus', () => {
    const text = adapter.getAttributionText();
    expect(text).toContain('Watershed Boundary Dataset');
    expect(text).toContain('NHD Plus');
  });
});

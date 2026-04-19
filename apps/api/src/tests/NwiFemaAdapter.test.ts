import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NwiFemaAdapter } from '../services/pipeline/adapters/NwiFemaAdapter.js';

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
  projectId: 'test-nwi-fema',
  country: 'US' as const,
  provinceState: 'DC',
  conservationAuthId: null,
  boundaryGeojson: DC_POLYGON,
  centroidLat: 38.887,
  centroidLng: -77.034,
};

// FEMA NFHL: AE zone (100-year SFHA)
const FEMA_AE_RESPONSE = {
  features: [{
    attributes: { FLD_ZONE: 'AE', STUDY_TYP: 'FIS', EFF_DATE: '20210801', SFHA_TF: 'T' },
  }],
};

// FEMA NFHL: Zone X (minimal hazard)
const FEMA_X_RESPONSE = {
  features: [{
    attributes: { FLD_ZONE: 'X', STUDY_TYP: 'FIS', EFF_DATE: '20210801', SFHA_TF: 'F' },
  }],
};

// FEMA NFHL: Zone VE (coastal)
const FEMA_VE_RESPONSE = {
  features: [{ attributes: { FLD_ZONE: 'VE', STUDY_TYP: 'FIS', EFF_DATE: '20220101' } }],
};

// NWI: palustrine forested + emergent wetlands
const NWI_RESPONSE = {
  features: [
    { attributes: { WETLAND_TYPE: 'Freshwater Forested/Shrub Wetland', ATTRIBUTE: 'PFO1A', ACRES: 2.3 } },
    { attributes: { WETLAND_TYPE: 'Freshwater Emergent Wetland', ATTRIBUTE: 'PEM1C', ACRES: 0.8 } },
    { attributes: { WETLAND_TYPE: 'Freshwater Emergent Wetland', ATTRIBUTE: 'PEM1C', ACRES: 0.4 } },
  ],
};

// NWI: estuarine wetlands only
const NWI_ESTUARINE = {
  features: [
    { attributes: { WETLAND_TYPE: 'Estuarine and Marine Wetland', ATTRIBUTE: 'E2EM1P', ACRES: 5.1 } },
  ],
};

const EMPTY_RESPONSE = { features: [] };

function mockBothSources(
  fema: object = FEMA_AE_RESPONSE,
  nwi: object = NWI_RESPONSE,
) {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => fema })
    .mockResolvedValueOnce({ ok: true, json: async () => nwi });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NwiFemaAdapter', () => {
  const adapter = new NwiFemaAdapter('nwi_fema_nfhl', 'wetlands_flood');

  describe('successful query with FEMA + NWI data', () => {
    it('returns high confidence when both sources have data', async () => {
      mockBothSources();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.layerType).toBe('wetlands_flood');
      expect(result.sourceApi).toBe('FEMA NFHL + NWI');
      expect(result.confidence).toBe('high');
    });

    it('returns correct flood zone and SFHA flag for Zone AE', async () => {
      mockBothSources();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.flood_zone).toBe('AE');
      expect(s.sfha).toBe(true);
      expect(s.flood_study_type).toBe('FIS');
    });

    it('returns sfha: false and regulated: false for Zone X', async () => {
      mockBothSources(FEMA_X_RESPONSE, EMPTY_RESPONSE);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.flood_zone).toBe('X');
      expect(s.sfha).toBe(false);
    });

    it('returns sfha: true for VE coastal zone', async () => {
      mockBothSources(FEMA_VE_RESPONSE, EMPTY_RESPONSE);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.sfha).toBe(true);
    });

    it('returns wetland feature count and type flags from NWI', async () => {
      mockBothSources();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.wetland_feature_count).toBe(3);
      expect(s.has_forested_wetland).toBe(true);
      expect(s.has_emergent_wetland).toBe(true);
    });

    it('extracts unique NWI attribute codes (max 5)', async () => {
      mockBothSources();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;
      const codes = s.nwi_codes as string[];

      expect(Array.isArray(codes)).toBe(true);
      expect(codes).toContain('PFO1A');
      expect(codes).toContain('PEM1C');
      expect(codes.length).toBeLessThanOrEqual(5);
    });

    it('identifies Palustrine as dominant system from PFO/PEM codes', async () => {
      mockBothSources();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.dominant_wetland_system).toBe('Palustrine');
    });

    it('identifies Estuarine as dominant system from E-coded features', async () => {
      mockBothSources(FEMA_AE_RESPONSE, NWI_ESTUARINE);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.dominant_wetland_system).toBe('Estuarine');
    });

    it('sets regulated: true when sfha=true or wetlands present', async () => {
      mockBothSources();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.regulated).toBe(true);
    });

    it('sets requires_permits: true when sfha + forested wetland present', async () => {
      mockBothSources();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.requires_permits).toBe(true);
    });
  });

  describe('partial data scenarios', () => {
    it('returns medium confidence when FEMA only (no NWI features)', async () => {
      mockBothSources(FEMA_AE_RESPONSE, EMPTY_RESPONSE);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('medium');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.wetland_feature_count).toBe(0);
    });

    it('returns medium confidence when NWI only (FEMA empty)', async () => {
      mockBothSources(EMPTY_RESPONSE, NWI_RESPONSE);

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      // No flood zone → floodZone null → hasFema false → medium
      expect(result.confidence).toBe('medium');
    });
  });

  describe('unavailable / error scenarios', () => {
    it('returns unavailable when both sources empty with a service error', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ error: { message: 'Service unavailable' } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ error: { message: 'Service unavailable' } }) });

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.unavailable).toBe(true);
      expect(s.reason).toBe('outside_nwi_fema_coverage');
    });

    it('returns unavailable when all HTTP requests fail', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'unavailable' });

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
    });
  });

  it('getAttributionText references FEMA NFHL and NWI', () => {
    const text = adapter.getAttributionText();
    expect(text).toContain('FEMA');
    expect(text).toContain('National Flood Hazard Layer');
    expect(text).toContain('National Wetlands Inventory');
  });
});

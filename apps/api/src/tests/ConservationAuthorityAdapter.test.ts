import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConservationAuthorityAdapter } from '../services/pipeline/adapters/ConservationAuthorityAdapter.js';

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

// Mock context without a specific CA (most common case)
const mockContext = {
  projectId: 'test-ca',
  country: 'CA' as const,
  provinceState: 'ON',
  conservationAuthId: null,
  boundaryGeojson: ON_POLYGON,
  centroidLat: 43.652,
  centroidLng: -79.398,
};

// Mock context with TRCA (3518 = Toronto and Region Conservation Authority)
const trkaContext = {
  ...mockContext,
  conservationAuthId: '3518',
};

// LIO Wetlands: swamp + marsh features, one PSW
const LIO_WETLANDS_RESPONSE = {
  features: [
    {
      attributes: {
        WETLAND_TYPE: 'Swamp',
        WETLAND_CLASS: 'Swamp',
        EVALUATION_STATUS: 'PSW Evaluated',
        PSW_EVAL: 'PSW',
      },
    },
    {
      attributes: {
        WETLAND_TYPE: 'Marsh',
        WETLAND_CLASS: 'Marsh',
        EVALUATION_STATUS: 'Evaluated',
        PSW_EVAL: null,
      },
    },
  ],
};

// LIO Regulated Areas: in TRCA regulated zone
const LIO_REGULATED_RESPONSE = {
  features: [{
    attributes: {
      REGULATION_NAME: 'Ontario Regulation 97/04',
      AUTHORITY_NAME: 'Toronto and Region Conservation Authority',
      REGULATION_CODE: 'ON_REG_97_04',
      CA_NAME: 'TRCA',
    },
  }],
};

const EMPTY_RESPONSE = { features: [] };

function mockBothLayers(
  wetlands: object = LIO_WETLANDS_RESPONSE,
  regulated: object = LIO_REGULATED_RESPONSE,
) {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => wetlands })
    .mockResolvedValueOnce({ ok: true, json: async () => regulated });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ConservationAuthorityAdapter', () => {
  const adapter = new ConservationAuthorityAdapter('conservation_authority', 'wetlands_flood');

  describe('successful query with wetland + regulated area data', () => {
    it('returns high confidence when both LIO layers have data', async () => {
      mockBothLayers();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.layerType).toBe('wetlands_flood');
      expect(result.sourceApi).toContain('Ontario LIO');
      expect(result.confidence).toBe('high');
    });

    it('detects PSW (Provincially Significant Wetland) from EVALUATION_STATUS', async () => {
      mockBothLayers();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.psw_present).toBe(true);
      expect(s.evaluated_wetland_present).toBe(true);
    });

    it('returns feature count and dominant wetland type', async () => {
      mockBothLayers();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.wetland_feature_count).toBe(2);
      // Swamp appears once, Marsh once — either could be dominant; both are valid
      expect(['Swamp', 'Marsh']).toContain(s.dominant_wetland_type);
    });

    it('returns regulated: true and CA name from LIO regulated areas response', async () => {
      mockBothLayers();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.regulated).toBe(true);
      expect(s.regulation_name).toBe('Ontario Regulation 97/04');
      // LIO AUTHORITY_NAME takes precedence
      expect(s.ca_name).toBe('Toronto and Region Conservation Authority');
    });

    it('falls back to registry CA name when LIO has no AUTHORITY_NAME', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => LIO_WETLANDS_RESPONSE })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            features: [{
              attributes: { REGULATION_NAME: 'Ontario Regulation 97/04', AUTHORITY_NAME: '', CA_NAME: '' },
            }],
          }),
        });

      const result = await adapter.fetchForBoundary(ON_POLYGON, trkaContext);
      const s = result.summaryData as Record<string, unknown>;

      // Registry provides TRCA name when LIO field is blank
      expect(s.ca_name).toBe('Toronto and Region Conservation Authority');
    });
  });

  describe('partial data scenarios', () => {
    it('returns medium confidence when wetlands only (no regulated area)', async () => {
      mockBothLayers(LIO_WETLANDS_RESPONSE, EMPTY_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('medium');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.regulated).toBe(false);
    });

    it('returns medium confidence when regulated area only (no wetlands)', async () => {
      mockBothLayers(EMPTY_RESPONSE, LIO_REGULATED_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('medium');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.wetland_feature_count).toBe(0);
    });
  });

  describe('fallback behavior', () => {
    it('returns regional estimate when both LIO layers return errors', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ error: { message: 'Service error' } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ error: { message: 'Service error' } }) });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.wetland_feature_count).toBe(0);
      expect(s.regulated).toBe(false);
    });

    it('returns flood risk estimate for southern Ontario lat/lng', async () => {
      mockBothLayers(EMPTY_RESPONSE, EMPTY_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      // lat 43.652, lng -79.398 → Lake Ontario basin → 'medium'
      expect(s.flood_risk_estimate).toBe('medium');
    });

    it('falls back gracefully on HTTP errors (never throws)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'unavailable' });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
    });
  });

  describe('PSW detection', () => {
    it('detects PSW from PSW_EVAL field containing "PSW"', async () => {
      mockBothLayers(
        {
          features: [{
            attributes: { WETLAND_TYPE: 'Bog', PSW_EVAL: 'PSW', EVALUATION_STATUS: '' },
          }],
        },
        EMPTY_RESPONSE,
      );

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.psw_present).toBe(true);
    });

    it('does not flag PSW when EVALUATION_STATUS is generic evaluated', async () => {
      mockBothLayers(
        {
          features: [{
            attributes: { WETLAND_TYPE: 'Marsh', EVALUATION_STATUS: 'Evaluated', PSW_EVAL: null },
          }],
        },
        EMPTY_RESPONSE,
      );

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.psw_present).toBe(false);
      expect(s.evaluated_wetland_present).toBe(true);
    });
  });

  it('getAttributionText references MNRF + OWES + LIO + CA', () => {
    const text = adapter.getAttributionText();
    expect(text).toContain('Ontario Ministry of Natural Resources');
    expect(text).toContain('OWES');
    expect(text).toContain('LIO');
    expect(text).toContain('Conservation Authority');
  });
});

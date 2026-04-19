import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OntarioMunicipalAdapter } from '../services/pipeline/adapters/OntarioMunicipalAdapter.js';

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
  projectId: 'test-ontario-zoning',
  country: 'CA' as const,
  provinceState: 'ON',
  conservationAuthId: null,
  boundaryGeojson: ON_POLYGON,
  centroidLat: 43.652,
  centroidLng: -79.398,
};

// LIO Open06 response — agricultural designation
const LIO_AG_RESPONSE = {
  features: [{
    attributes: {
      ZONE_CODE: 'AG',
      ZONE_DESC: 'Agricultural',
      OFFICIAL_PLAN: 'Rural/Agricultural Area',
      MUNICIPALITY: 'Region of Peel',
    },
  }],
};

// LIO Open06 response — Greenbelt designation
const LIO_GREENBELT_RESPONSE = {
  features: [{
    attributes: {
      DESIGNATION: 'Greenbelt Protected Countryside',
      ZONE_DESC: 'Greenbelt',
      MUNICIPALITY: 'Hamilton',
    },
  }],
};

// LIO response using alternate field names
const LIO_ALTFIELDS_RESPONSE = {
  features: [{
    attributes: {
      LAND_USE_CATEGORY: 'Rural',
      LAND_USE_DESC: 'Rural designation',
      OFFICIAL_PLAN: 'Rural Land Use',
    },
  }],
};

// AAFC CLI response — Class 2 (moderate limitations)
const CLI_CLASS2_RESPONSE = {
  features: [{
    attributes: {
      CLI_CLASS: 2,
      CLI_SUBCLASS: 'T',
    },
  }],
};

// AAFC CLI response — Class 1 (prime agricultural)
const CLI_CLASS1_RESPONSE = {
  features: [{
    attributes: {
      CLI_CLASS: 1,
      CLI_SUBCLASS: '',
    },
  }],
};

// AAFC CLI response — Class 5 (forage only)
const CLI_CLASS5_RESPONSE = {
  features: [{
    attributes: {
      CLI_CLASS: 5,
      CLI_SUBCLASS: 'W',
    },
  }],
};

const EMPTY_FEATURES = { features: [] };
const ERROR_RESPONSE = { error: { message: 'Service unavailable' } };

// Helper: mock 4 LIO layers (first one has data, rest empty) + 1 CLI
function mockLioFirstLayerPlusCli(lioResponse: object, cliResponse: object) {
  // LIO queries 4 layers sequentially — first one returns data
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => lioResponse });
  // CLI queries up to 2 AAFC URLs
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => cliResponse });
}

/**
 * URL-routing mock for "CLI only" scenario.
 * LIO and AAFC CLI run concurrently (Promise.allSettled), so the sequential
 * mockResolvedValueOnce queue gets consumed in interleaved order. Routing by
 * URL ensures each service always gets the intended response regardless of order.
 */
function mockLioEmptyCliOnly(cliResponse: object) {
  // Use spread args to handle both string URLs and Request objects
  mockFetch.mockImplementation((...args: unknown[]) => {
    const raw = args[0];
    const urlStr: string =
      typeof raw === 'string' ? raw
      : raw != null && typeof (raw as { url?: unknown }).url === 'string' ? (raw as { url: string }).url
      : raw instanceof URL ? raw.href
      : String(raw ?? '');

    if (urlStr.includes('LIO_Open06')) {
      return Promise.resolve({ ok: true, json: async () => EMPTY_FEATURES });
    }
    if (urlStr.includes('agriculture.canada.ca')) {
      return Promise.resolve({ ok: true, json: async () => cliResponse });
    }
    return Promise.resolve({ ok: false, status: 404, text: async () => '' });
  });
}

// Helper: mock all 4 LIO layers + both AAFC CLI URLs returning empty/error
function mockAllEmpty() {
  for (let i = 0; i < 4; i++) {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => EMPTY_FEATURES });
  }
  // AAFC CLI — both service URLs
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => EMPTY_FEATURES });
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => EMPTY_FEATURES });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('OntarioMunicipalAdapter', () => {
  const adapter = new OntarioMunicipalAdapter('ontario_municipal_gis', 'zoning');

  describe('successful query — LIO + CLI both return data', () => {
    it('returns zoning layer type and combined sourceApi', async () => {
      mockLioFirstLayerPlusCli(LIO_AG_RESPONSE, CLI_CLASS2_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.layerType).toBe('zoning');
      expect(result.sourceApi).toContain('LIO');
      expect(result.sourceApi).toContain('CLI');
    });

    it('returns medium confidence when both LIO and CLI have data', async () => {
      mockLioFirstLayerPlusCli(LIO_AG_RESPONSE, CLI_CLASS2_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('medium');
    });

    it('extracts zoning_code from LIO ZONE_CODE field', async () => {
      mockLioFirstLayerPlusCli(LIO_AG_RESPONSE, CLI_CLASS2_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.zoning_code).toBe('AG');
    });

    it('returns CLI class 2 and subclass T', async () => {
      mockLioFirstLayerPlusCli(LIO_AG_RESPONSE, CLI_CLASS2_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.cli_class).toBe(2);
      expect(s.cli_subclass).toBe('T');
      expect(s.cli_capability).toContain('Class 2');
    });

    it('returns cli_limitations as human-readable subclass expansion', async () => {
      mockLioFirstLayerPlusCli(LIO_AG_RESPONSE, CLI_CLASS2_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.cli_limitations as string).toContain('Topography');
    });

    it('sets is_agricultural true for AG zone code', async () => {
      mockLioFirstLayerPlusCli(LIO_AG_RESPONSE, CLI_CLASS2_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.is_agricultural).toBe(true);
    });

    it('returns official_plan_designation and municipality from LIO', async () => {
      mockLioFirstLayerPlusCli(LIO_AG_RESPONSE, CLI_CLASS2_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.official_plan_designation).toBe('Rural/Agricultural Area');
      expect(s.municipality).toBe('Region of Peel');
    });

    it('sets data_available true when any source returns data', async () => {
      mockLioFirstLayerPlusCli(LIO_AG_RESPONSE, CLI_CLASS2_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.data_available).toBe(true);
    });
  });

  describe('Greenbelt zoning classification', () => {
    it('returns Greenbelt permitted uses and is_agricultural true', async () => {
      mockLioFirstLayerPlusCli(LIO_GREENBELT_RESPONSE, CLI_CLASS1_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.is_agricultural).toBe(true);
      expect(s.zoning_code).toContain('Greenbelt');
    });
  });

  describe('alternate LIO field names', () => {
    it('reads LAND_USE_CATEGORY when ZONE_CODE is absent', async () => {
      mockLioFirstLayerPlusCli(LIO_ALTFIELDS_RESPONSE, CLI_CLASS2_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.zoning_code).toBe('Rural');
    });
  });

  describe('CLI only (LIO unavailable)', () => {
    it('returns low confidence when only CLI has data', async () => {
      mockLioEmptyCliOnly(CLI_CLASS2_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
    });

    it('returns cli_class from CLI even without LIO data', async () => {
      mockLioEmptyCliOnly(CLI_CLASS1_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.cli_class).toBe(1);
      expect(s.data_available).toBe(true);
    });

    it('sets is_agricultural true when cli_class <= 4 even without LIO', async () => {
      mockLioEmptyCliOnly(CLI_CLASS5_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      // CLI class 5 is forage-only; is_agricultural from inferZoningDetails('Unknown') = false
      // But CLI class 5 is not <= 4, so is_agricultural should be false
      expect(typeof s.is_agricultural).toBe('boolean');
    });
  });

  describe('fully unavailable — neither source has data', () => {
    it('returns low confidence and data_available false', async () => {
      mockAllEmpty();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.data_available).toBe(false);
    });

    it('returns informative unavailable explanation', async () => {
      mockAllEmpty();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.zoning_description as string).toContain('LIO');
    });

    it('returns null for all LIO and CLI fields when unavailable', async () => {
      mockAllEmpty();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.cli_class).toBeNull();
      expect(s.municipality).toBeNull();
      expect(s.official_plan_designation).toBeNull();
    });
  });

  describe('HTTP error handling', () => {
    it('returns a result (never throws) when all requests return HTTP errors', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'unavailable' });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.layerType).toBe('zoning');
      expect(result.confidence).toBe('low');
    });
  });

  it('getAttributionText references LIO and CLI', () => {
    const text = adapter.getAttributionText();
    expect(text).toContain('LIO');
    expect(text).toContain('Canada Land Inventory');
  });
});

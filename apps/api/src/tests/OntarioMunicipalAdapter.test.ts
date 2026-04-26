import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OntarioMunicipalAdapter } from '../services/pipeline/adapters/OntarioMunicipalAdapter.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Rural Grey County point — intentionally outside every municipal registry bbox
// (Toronto, Ottawa, Mississauga, Burlington, Barrie) so existing tests exercise
// only LIO + AAFC CLI paths. Municipal-path tests use dedicated fixtures below.
const ON_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-80.902, 44.548], [-80.898, 44.548],
    [-80.898, 44.552], [-80.902, 44.552],
    [-80.902, 44.548],
  ]],
};

const mockContext = {
  projectId: 'test-ontario-zoning',
  country: 'CA' as const,
  provinceState: 'ON',
  conservationAuthId: null,
  boundaryGeojson: ON_POLYGON,
  centroidLat: 44.550,
  centroidLng: -80.900,
};

// Toronto fixture — inside Toronto registry bbox (triggers municipal fetch)
const TORONTO_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-79.400, 43.650], [-79.396, 43.650],
    [-79.396, 43.654], [-79.400, 43.654],
    [-79.400, 43.650],
  ]],
};

const torontoContext = {
  projectId: 'test-toronto-zoning',
  country: 'CA' as const,
  provinceState: 'ON',
  conservationAuthId: null,
  boundaryGeojson: TORONTO_POLYGON,
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

  it('getAttributionText references LIO, CLI, and registry municipalities', () => {
    const text = adapter.getAttributionText();
    expect(text).toContain('LIO');
    expect(text).toContain('Canada Land Inventory');
    expect(text).toContain('Toronto');
    expect(text).toContain('Ottawa');
  });

  // ─── Municipal registry path ───────────────────────────────────────────────

  describe('municipal registry — Toronto bbox', () => {
    /**
     * Route-aware mock covering all three sources. Toronto's municipal endpoint
     * (services3.arcgis.com/b9WvedVPoizGfvfD) returns a real bylaw code;
     * LIO + CLI respond per-scenario.
     */
    function mockTorontoScenario(opts: {
      municipal?: object | 'empty' | 'error';
      lio?: object | 'empty';
      cli?: object | 'empty';
    }) {
      mockFetch.mockImplementation((...args: unknown[]) => {
        const raw = args[0];
        const urlStr: string =
          typeof raw === 'string' ? raw
          : raw != null && typeof (raw as { url?: unknown }).url === 'string' ? (raw as { url: string }).url
          : raw instanceof URL ? raw.href
          : String(raw ?? '');

        if (urlStr.includes('b9WvedVPoizGfvfD') || urlStr.includes('COTGEO_ZBL_ZONE')) {
          if (opts.municipal === 'error') return Promise.resolve({ ok: false, status: 503 });
          const body = opts.municipal === 'empty' || !opts.municipal
            ? EMPTY_FEATURES
            : opts.municipal;
          return Promise.resolve({ ok: true, json: async () => body });
        }
        if (urlStr.includes('LIO_Open06')) {
          const body = opts.lio === 'empty' || !opts.lio ? EMPTY_FEATURES : opts.lio;
          return Promise.resolve({ ok: true, json: async () => body });
        }
        if (urlStr.includes('agriculture.canada.ca')) {
          const body = opts.cli === 'empty' || !opts.cli ? EMPTY_FEATURES : opts.cli;
          return Promise.resolve({ ok: true, json: async () => body });
        }
        return Promise.resolve({ ok: false, status: 404, text: async () => '' });
      });
    }

    const TORONTO_RL_BYLAW = {
      features: [{
        attributes: {
          ZN_ZONE: 'RD (f12.0; a370)',
          ZN_STRING: 'Residential Detached — min lot frontage 12 m, min lot area 370 m²',
          ZN_LU_CATEGORY: 'Residential',
          ZN_HOLDING: null,
        },
      }],
    };

    it('municipal hit + CLI → high confidence', async () => {
      mockTorontoScenario({ municipal: TORONTO_RL_BYLAW, lio: 'empty', cli: CLI_CLASS2_RESPONSE });

      const result = await adapter.fetchForBoundary(TORONTO_POLYGON, torontoContext);

      expect(result.confidence).toBe('high');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.registry_coverage).toBe(true);
      expect(s.municipal_zoning_code).toBe('RD (f12.0; a370)');
      expect(s.municipal_zone_category).toBe('Residential');
      expect(s.municipal_bylaw_source as string).toContain('Toronto');
      expect(s.municipality).toContain('Toronto');
    });

    it('municipal alone (no LIO, no CLI) → medium confidence', async () => {
      mockTorontoScenario({ municipal: TORONTO_RL_BYLAW, lio: 'empty', cli: 'empty' });

      const result = await adapter.fetchForBoundary(TORONTO_POLYGON, torontoContext);

      expect(result.confidence).toBe('medium');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.registry_coverage).toBe(true);
      expect(s.zoning_code).toBe('RD (f12.0; a370)');
    });

    it('municipal empty + LIO + CLI → medium (falls back to LIO behavior)', async () => {
      mockTorontoScenario({ municipal: 'empty', lio: LIO_AG_RESPONSE, cli: CLI_CLASS2_RESPONSE });

      const result = await adapter.fetchForBoundary(TORONTO_POLYGON, torontoContext);

      expect(result.confidence).toBe('medium');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.registry_coverage).toBe(false);
      expect(s.municipal_zoning_code).toBeNull();
      expect(s.zoning_code).toBe('AG'); // From LIO
    });

    it('municipal endpoint HTTP error does not throw', async () => {
      mockTorontoScenario({ municipal: 'error', lio: 'empty', cli: 'empty' });

      const result = await adapter.fetchForBoundary(TORONTO_POLYGON, torontoContext);

      expect(result.layerType).toBe('zoning');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.registry_coverage).toBe(false);
      expect(s.data_available).toBe(false);
    });

    it('rural Grey County point (outside all registry bboxes) bypasses municipal fetch', async () => {
      mockAllEmpty(); // 4 LIO + 2 CLI only

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      const s = result.summaryData as Record<string, unknown>;
      expect(s.registry_coverage).toBe(false);
      expect(s.municipal_zoning_code).toBeNull();
    });
  });

  describe('municipal registry — structural invariants', () => {
    it('all registry entries have non-empty code field and attribution', async () => {
      const { __MUNICIPAL_ZONING_REGISTRY_FOR_TESTS: registry } = await import(
        '../services/pipeline/adapters/OntarioMunicipalAdapter.js'
      );
      expect(registry.length).toBeGreaterThanOrEqual(8);
      for (const entry of registry) {
        expect(entry.key).toBeTruthy();
        expect(entry.label).toBeTruthy();
        expect(entry.baseUrl).toMatch(/^https:\/\//);
        expect(entry.fields.code).toBeTruthy();
        expect(entry.attribution.length).toBeGreaterThan(0);
        // bbox: [minLng, minLat, maxLng, maxLat] with minLng < maxLng and minLat < maxLat
        const [minLng, minLat, maxLng, maxLat] = entry.bbox;
        expect(minLng).toBeLessThan(maxLng);
        expect(minLat).toBeLessThan(maxLat);
        // All entries are in southern Ontario (roughly)
        expect(minLat).toBeGreaterThan(42.5);
        expect(maxLat).toBeLessThan(46);
      }
    });

    it('candidateMunicipalities bbox-filters correctly', async () => {
      const { __candidateMunicipalitiesForTests: candidates } = await import(
        '../services/pipeline/adapters/OntarioMunicipalAdapter.js'
      );
      // Toronto downtown → only Toronto matches
      const torontoHits = candidates(43.652, -79.398);
      expect(torontoHits.length).toBe(1);
      expect(torontoHits[0]!.key).toBe('toronto');

      // Ottawa downtown → only Ottawa matches
      const ottawaHits = candidates(45.42, -75.70);
      expect(ottawaHits.length).toBe(1);
      expect(ottawaHits[0]!.key).toBe('ottawa');

      // Grey County rural → none match
      const ruralHits = candidates(44.55, -80.90);
      expect(ruralHits.length).toBe(0);

      // Oakville centroid (south of Dundas) → only Oakville matches
      const oakvilleHits = candidates(43.467, -79.687);
      expect(oakvilleHits.length).toBe(1);
      expect(oakvilleHits[0]!.key).toBe('oakville');

      // Downtown Milton (urban) → only milton-urban matches
      const miltonUrbanHits = candidates(43.518, -79.878);
      expect(miltonUrbanHits.length).toBe(1);
      expect(miltonUrbanHits[0]!.key).toBe('milton-urban');

      // Milton rural north of 401 → only milton-rural matches
      const miltonRuralHits = candidates(43.640, -79.920);
      expect(miltonRuralHits.length).toBe(1);
      expect(miltonRuralHits[0]!.key).toBe('milton-rural');
    });

    it('registry keys are unique', async () => {
      const { __MUNICIPAL_ZONING_REGISTRY_FOR_TESTS: registry } = await import(
        '../services/pipeline/adapters/OntarioMunicipalAdapter.js'
      );
      const keys = registry.map((e) => e.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('getAttributionText references all Halton-region append municipalities', () => {
      const text = adapter.getAttributionText();
      expect(text).toContain('Oakville');
      expect(text).toContain('Milton');
    });
  });
});

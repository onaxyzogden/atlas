import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  boundaryToWkt,
  computeWeightedAverages,
  deriveTextureClass,
  computeFertilityIndex,
  computeSalinizationRisk,
  determineConfidence,
  SsurgoAdapter,
} from '../services/pipeline/adapters/SsurgoAdapter.js';

// ─── Mock global fetch ────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── Realistic SSURGO SDA response fixtures ──────────────────────────────────
// Based on USDA HQ area: 38.887, -77.034 (Washington DC)

const MUKEY_RESPONSE = {
  Table: [
    ['mukey', 'musym', 'muname', 'comppct_r', 'majcompflag', 'compname', 'taxclname', 'drainagecl', 'slope_r', 'elev_r'],
    ['658812', 'UdB', 'Urban land-Udorthents complex, 0 to 8 percent slopes', '60', 'Yes', 'Urban land', 'Udorthents', 'Well drained', '4', '50'],
    ['658813', 'ChA', 'Christiana silt loam, 0 to 2 percent slopes', '40', 'Yes', 'Christiana', 'Fine, kaolinitic, mesic Typic Paleudults', 'Well drained', '1', '45'],
  ],
};

const HORIZON_RESPONSE = {
  Table: [
    ['mukey', 'comppct_r', 'hzdept_r', 'hzdepb_r', 'ph', 'organic_matter_pct', 'cec_meq_100g', 'ec_ds_m', 'bulk_density_g_cm3', 'ksat_um_s', 'awc_cm_cm', 'rooting_depth_cm', 'claytotal_r', 'silttotal_r', 'sandtotal_r', 'caco3_pct', 'gypsum_pct', 'sodium_adsorption_ratio', 'drainage_class', 'taxonomy_class', 'component_name', 'component_pct'],
    ['658812', '60', '0', '30', '6.2', '2.5', '12.0', '0.5', '1.35', '14.0', '0.18', '100', '18', '42', '40', '0', '0', '1.0', 'Well drained', 'Udorthents', 'Urban land', '60'],
    ['658813', '40', '0', '25', '5.8', '3.2', '18.5', '0.3', '1.28', '8.5', '0.22', '120', '35', '45', '20', '0', '0', '0.5', 'Well drained', 'Fine, kaolinitic, mesic Typic Paleudults', 'Christiana', '40'],
  ],
};

const EMPTY_RESPONSE = { Table: [['mukey']] };

const DC_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-77.036, 38.886],
    [-77.032, 38.886],
    [-77.032, 38.888],
    [-77.036, 38.888],
    [-77.036, 38.886],
  ]],
};

const DC_MULTIPOLYGON = {
  type: 'MultiPolygon' as const,
  coordinates: [
    // Small polygon
    [[
      [-77.040, 38.890],
      [-77.039, 38.890],
      [-77.039, 38.891],
      [-77.040, 38.891],
      [-77.040, 38.890],
    ]],
    // Larger polygon (should be selected)
    [[
      [-77.036, 38.886],
      [-77.032, 38.886],
      [-77.032, 38.890],
      [-77.036, 38.890],
      [-77.036, 38.886],
    ]],
  ],
};

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('WKT polygon construction', () => {
  it('converts GeoJSON Polygon to WKT', () => {
    const wkt = boundaryToWkt(DC_POLYGON);
    expect(wkt).toBe('POLYGON((-77.036 38.886, -77.032 38.886, -77.032 38.888, -77.036 38.888, -77.036 38.886))');
  });

  it('converts GeoJSON MultiPolygon using the largest ring', () => {
    const wkt = boundaryToWkt(DC_MULTIPOLYGON);
    // The larger polygon should be selected
    expect(wkt).toContain('-77.036 38.886');
    expect(wkt).toContain('-77.032 38.89');
    expect(wkt.startsWith('POLYGON((')).toBe(true);
    expect(wkt.endsWith('))')).toBe(true);
  });

  it('throws on invalid geometry', () => {
    expect(() => boundaryToWkt(null)).toThrow('Invalid GeoJSON boundary');
    expect(() => boundaryToWkt({ type: 'Point', coordinates: [0, 0] })).toThrow('Unsupported geometry type');
  });
});

describe('Weighted average computation', () => {
  it('computes correct weighted averages for 60/40 split', () => {
    const rows = [
      {
        mukey: '658812', comppct_r: 60, hzdept_r: 0, hzdepb_r: 30,
        ph: 6.2, organic_matter_pct: 2.5, cec_meq_100g: 12.0, ec_ds_m: 0.5,
        bulk_density_g_cm3: 1.35, ksat_um_s: 14.0, kfact: 0.32, awc_cm_cm: 0.18,
        rooting_depth_cm: 100, claytotal_r: 18, silttotal_r: 42, sandtotal_r: 40,
        caco3_pct: 0, gypsum_pct: 0, sodium_adsorption_ratio: 1.0,
        surface_stoniness: null, texture_description: 'Silt loam',
        drainage_class: 'Well drained', taxonomy_class: 'Udorthents',
        component_name: 'Urban land', component_pct: 60,
      },
      {
        mukey: '658813', comppct_r: 40, hzdept_r: 0, hzdepb_r: 25,
        ph: 5.8, organic_matter_pct: 3.2, cec_meq_100g: 18.5, ec_ds_m: 0.3,
        bulk_density_g_cm3: 1.28, ksat_um_s: 8.5, kfact: 0.28, awc_cm_cm: 0.22,
        rooting_depth_cm: 120, claytotal_r: 35, silttotal_r: 45, sandtotal_r: 20,
        caco3_pct: 0, gypsum_pct: 0, sodium_adsorption_ratio: 0.5,
        surface_stoniness: null, texture_description: 'Silty clay loam',
        drainage_class: 'Well drained', taxonomy_class: 'Paleudults',
        component_name: 'Christiana', component_pct: 40,
      },
    ];

    const result = computeWeightedAverages(rows);

    // pH: (6.2*60 + 5.8*40) / 100 = 6.04
    expect(result.ph).toBeCloseTo(6.04, 1);

    // OM: (2.5*60 + 3.2*40) / 100 = 2.78
    expect(result.organic_matter_pct).toBeCloseTo(2.78, 1);

    // CEC: (12.0*60 + 18.5*40) / 100 = 14.6
    expect(result.cec_meq_100g).toBeCloseTo(14.6, 1);

    // Dominant component (highest comppct_r = 60)
    expect(result.dominant_component_name).toBe('Urban land');
    expect(result.drainage_class).toBe('Well drained');
  });

  it('returns nulls for empty rows', () => {
    const result = computeWeightedAverages([]);
    expect(result.ph).toBeNull();
    expect(result.organic_matter_pct).toBeNull();
    expect(result.drainage_class).toBeNull();
  });
});

describe('fertility_index computation', () => {
  it('scores optimal soil at maximum (100)', () => {
    // pH 6.5 (optimal) = 25, OC 3.5% = 25, CEC 25 = 25, Well drained = 25
    const index = computeFertilityIndex(6.5, 3.5, 25, 'Well drained');
    expect(index).toBe(100);
  });

  it('scores poor soil low', () => {
    // pH 4.5 (<5.5) = 8, OC 0.3% (<0.5) = 2, CEC 3 (<5) = 3, Very poorly = 2
    const index = computeFertilityIndex(4.5, 0.3, 3, 'Very poorly drained');
    expect(index).toBe(15);
  });

  it('scores mid-range values correctly', () => {
    // pH 5.7 (5.5-6.0) = 18, OC 1.5% (1-2) = 12, CEC 15 (10-20) = 18, Moderately well = 20
    const index = computeFertilityIndex(5.7, 1.5, 15, 'Moderately well drained');
    expect(index).toBe(68);
  });

  it('returns null when all inputs are null', () => {
    expect(computeFertilityIndex(null, null, null, null)).toBeNull();
  });

  it('handles partial null inputs', () => {
    // pH 6.5 = 25, rest null = 0
    const index = computeFertilityIndex(6.5, null, null, null);
    expect(index).toBe(25);
  });
});

describe('salinization_risk computation', () => {
  it('returns Low for normal soils', () => {
    expect(computeSalinizationRisk(0.5, 2)).toBe('Low');
    expect(computeSalinizationRisk(null, null)).toBe('Low');
  });

  it('returns Moderate for ec 2-4 or sar 6-10', () => {
    expect(computeSalinizationRisk(2.5, 1)).toBe('Moderate');
    expect(computeSalinizationRisk(0.5, 7)).toBe('Moderate');
  });

  it('returns High for ec 4-8 or sar 10-15', () => {
    expect(computeSalinizationRisk(5, 1)).toBe('High');
    expect(computeSalinizationRisk(0.5, 12)).toBe('High');
  });

  it('returns Severe for ec >= 8 or sar >= 15', () => {
    expect(computeSalinizationRisk(9, 1)).toBe('Severe');
    expect(computeSalinizationRisk(0.5, 16)).toBe('Severe');
  });

  it('uses the more severe of ec or sar', () => {
    // ec=1 (Low) but sar=16 (Severe) → Severe
    expect(computeSalinizationRisk(1, 16)).toBe('Severe');
  });
});

describe('confidence level determination', () => {
  it('returns high when mukeys >= 3 and all key props present', () => {
    expect(determineConfidence(3, 6.5, 2.0, 15, 'Well drained')).toBe('high');
    expect(determineConfidence(5, 6.5, 2.0, 15, 'Well drained')).toBe('high');
  });

  it('returns medium when mukeys >= 1 and >= 50% key props', () => {
    expect(determineConfidence(1, 6.5, 2.0, null, null)).toBe('medium');
    expect(determineConfidence(2, 6.5, null, 15, null)).toBe('medium');
  });

  it('returns low when mukeys = 0', () => {
    expect(determineConfidence(0, 6.5, 2.0, 15, 'Well drained')).toBe('low');
  });

  it('returns low when mukeys >= 1 but < 50% key props', () => {
    expect(determineConfidence(1, 6.5, null, null, null)).toBe('low');
    expect(determineConfidence(2, null, null, null, null)).toBe('low');
  });
});

describe('Zero-mukey response (outside SSURGO coverage)', () => {
  it('returns low-confidence result with nulls and does NOT throw', async () => {
    // First call returns mukeys, second returns horizon data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => EMPTY_RESPONSE,
    });

    const adapter = new SsurgoAdapter('ssurgo', 'soils');
    const result = await adapter.fetchForBoundary(DC_POLYGON, {
      projectId: 'test-123',
      country: 'US',
      provinceState: 'DC',
      conservationAuthId: null,
      boundaryGeojson: DC_POLYGON,
      centroidLat: 38.887,
      centroidLng: -77.034,
    });

    expect(result.confidence).toBe('low');
    expect(result.layerType).toBe('soils');
    expect(result.sourceApi).toBe('USDA SSURGO SDA');

    const summary = result.summaryData as Record<string, unknown>;
    expect(summary.unavailable).toBe(true);
    expect(summary.reason).toBe('outside_ssurgo_coverage');
    expect(summary.ph).toBeNull();
    expect(summary.organic_matter_pct).toBeNull();
    expect(summary.mukeys_found).toBe(0);
    expect(summary.coverage_pct).toBe(0);
  });
});

describe('Full adapter fetch (mocked SDA)', () => {
  it('fetches and processes SSURGO data correctly', async () => {
    // Mock two sequential SDA calls
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MUKEY_RESPONSE,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => HORIZON_RESPONSE,
      });

    const adapter = new SsurgoAdapter('ssurgo', 'soils');
    const result = await adapter.fetchForBoundary(DC_POLYGON, {
      projectId: 'test-123',
      country: 'US',
      provinceState: 'DC',
      conservationAuthId: null,
      boundaryGeojson: DC_POLYGON,
      centroidLat: 38.887,
      centroidLng: -77.034,
    });

    expect(result.layerType).toBe('soils');
    expect(result.sourceApi).toBe('USDA SSURGO SDA');
    expect(result.attributionText).toContain('USDA');
    expect(result.confidence).toBeDefined();
    expect(result.dataDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const summary = result.summaryData as Record<string, unknown>;
    expect(summary.mukeys_found).toBe(2);
    expect(summary.source_api).toBe('USDA SSURGO SDA');
    expect(summary.ph).toBeDefined();
    expect(summary.organic_matter_pct).toBeDefined();
    expect(summary.fertility_index).toBeDefined();
    expect(summary.salinization_risk).toBeDefined();
    expect(summary.soil_health_summary).toBeDefined();

    // Tier 3 compatibility aliases
    expect(summary.drainageClass).toBeDefined();
    expect(summary.organicMatterPct).toBeDefined();
    expect(summary.textureClass).toBeDefined();

    // Verify two SDA calls were made
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('deriveTextureClass', () => {
  it('classifies clay (>= 40% clay)', () => {
    expect(deriveTextureClass(45, 30, 25)).toBe('clay');
  });

  it('classifies silt loam', () => {
    expect(deriveTextureClass(15, 60, 25)).toBe('silt_loam');
  });

  it('classifies loamy sand (70% sand, 10% clay)', () => {
    expect(deriveTextureClass(10, 20, 70)).toBe('loamy_sand');
  });

  it('classifies sandy loam (55% sand, 15% clay)', () => {
    expect(deriveTextureClass(15, 30, 55)).toBe('sandy_loam');
  });

  it('classifies loam', () => {
    expect(deriveTextureClass(20, 40, 40)).toBe('loam');
  });

  it('returns null when inputs are null', () => {
    expect(deriveTextureClass(null, null, null)).toBeNull();
    expect(deriveTextureClass(20, null, 40)).toBeNull();
  });
});

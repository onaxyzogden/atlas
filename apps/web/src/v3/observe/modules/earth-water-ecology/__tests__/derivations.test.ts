import { describe, it, expect } from 'vitest';
import type { EcologyObservation, EcologyZone } from '../../../../../store/ecologyStore.js';
import type { Earthwork, StorageInfra, Watercourse } from '../../../../../store/waterSystemsStore.js';
import type { SoilSample } from '../../../../../store/soilSampleStore.js';
import {
  earthwaterKpis,
  ecologyCounts,
  ecologyDetailKpis,
  getSoilsLayer,
  getWatershedLayer,
  getWetlandsLayer,
  getCriticalHabitatLayer,
  hydrologyKpis,
  jprKpis,
  percRating,
  roofAnnualCaptureL,
  soilStats,
  waterCounts,
} from '../derivations.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SOIL_LAYER = {
  layerType: 'soils' as const,
  fetchStatus: 'complete' as const,
  confidence: 'high' as const,
  dataDate: '2024-01-01',
  sourceApi: 'test',
  attribution: 'test',
  summary: {
    predominant_texture: 'Clay loam',
    organic_matter_pct: 3.8,
    ph_range: '6.1 - 6.8',
    hydrologic_group: 'C',
  },
};

const WATERSHED_LAYER = {
  layerType: 'watershed' as const,
  fetchStatus: 'complete' as const,
  confidence: 'medium' as const,
  dataDate: '2024-01-01',
  sourceApi: 'test',
  attribution: 'test',
  summary: {
    watershed_name: 'Sixteen Mile Creek',
    nearest_stream_m: 380,
    stream_order: 2,
    catchment_area_ha: null,
    flow_direction: 'SE to NW',
  },
};

const makeSample = (overrides: Partial<SoilSample> = {}): SoilSample => ({
  id: 'sample-1',
  projectId: 'p1',
  sampleDate: '2026-01-15',
  label: 'Test sample',
  location: null,
  depth: 'surface',
  ph: 6.5,
  organicMatterPct: 4.2,
  texture: 'loam',
  cecMeq100g: null,
  ecDsM: null,
  bulkDensityGCm3: null,
  npkPpm: null,
  biologicalActivity: 'moderate',
  notes: null,
  lab: null,
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
  ...overrides,
});

const makeObservation = (overrides: Partial<EcologyObservation> = {}): EcologyObservation => ({
  id: 'obs-1',
  projectId: 'p1',
  species: 'Oak (Quercus robur)',
  trophicLevel: 'producer',
  observedAt: '2026-01-15',
  ...overrides,
});

const makeEarthwork = (overrides: Partial<Earthwork> = {}): Earthwork => ({
  id: 'ew-1',
  projectId: 'p1',
  type: 'swale',
  geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
  lengthM: 50,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ── Layer getters ─────────────────────────────────────────────────────────────

describe('layer getters', () => {
  it('returns null when layers undefined', () => {
    expect(getSoilsLayer(undefined)).toBeNull();
    expect(getWatershedLayer(undefined)).toBeNull();
    expect(getWetlandsLayer(undefined)).toBeNull();
    expect(getCriticalHabitatLayer(undefined)).toBeNull();
  });

  it('returns null when layer type missing', () => {
    expect(getSoilsLayer([WATERSHED_LAYER as any])).toBeNull();
  });

  it('returns the matching layer', () => {
    expect(getSoilsLayer([SOIL_LAYER as any])?.summary.predominant_texture).toBe('Clay loam');
    expect(getWatershedLayer([WATERSHED_LAYER as any])?.summary.nearest_stream_m).toBe(380);
  });
});

// ── waterCounts ───────────────────────────────────────────────────────────────

describe('waterCounts', () => {
  it('returns zeros for empty arrays', () => {
    const r = waterCounts([], [], []);
    expect(r).toEqual({ earthworks: 0, storage: 0, watercourses: 0, total: 0 });
  });

  it('sums correctly', () => {
    const ew: Earthwork[] = [makeEarthwork(), makeEarthwork({ id: 'ew-2' })];
    const si: StorageInfra[] = [{ id: 's1', projectId: 'p1', type: 'pond', center: [0, 0], createdAt: '' }];
    const wc: Watercourse[] = [];
    const r = waterCounts(ew, si, wc);
    expect(r.earthworks).toBe(2);
    expect(r.storage).toBe(1);
    expect(r.watercourses).toBe(0);
    expect(r.total).toBe(3);
  });
});

// ── ecologyCounts ─────────────────────────────────────────────────────────────

describe('ecologyCounts', () => {
  it('returns zeros and null stage for empty', () => {
    const r = ecologyCounts([], [], undefined);
    expect(r.observations).toBe(0);
    expect(r.zones).toBe(0);
    expect(r.successionStage).toBeNull();
    expect(r.trophicLevels).toEqual([]);
  });

  it('deduplicates trophic levels', () => {
    const obs = [
      makeObservation({ trophicLevel: 'producer' }),
      makeObservation({ id: 'o2', trophicLevel: 'producer' }),
      makeObservation({ id: 'o3', trophicLevel: 'primary' }),
    ];
    const r = ecologyCounts(obs, [], 'mid');
    expect(r.observations).toBe(3);
    expect(r.trophicLevels).toHaveLength(2);
    expect(r.successionStage).toBe('mid');
  });
});

// ── soilStats ─────────────────────────────────────────────────────────────────

describe('soilStats', () => {
  it('returns nulls for empty', () => {
    const r = soilStats([]);
    expect(r.count).toBe(0);
    expect(r.avgPh).toBeNull();
    expect(r.avgOm).toBeNull();
    expect(r.hasJar).toBe(false);
    expect(r.latestSample).toBeNull();
  });

  it('averages ph and om', () => {
    const samples = [makeSample({ ph: 6.0, organicMatterPct: 4.0 }), makeSample({ id: 's2', ph: 7.0, organicMatterPct: 6.0 })];
    const r = soilStats(samples);
    expect(r.avgPh).toBeCloseTo(6.5);
    expect(r.avgOm).toBeCloseTo(5.0);
  });

  it('detects jar/perc/roof', () => {
    const s = makeSample({
      jarTest: { sandPct: 40, siltPct: 40, clayPct: 20 },
      percolationInPerHr: 1.5,
      roofCatchment: { roofAreaM2: 100 },
    });
    const r = soilStats([s]);
    expect(r.hasJar).toBe(true);
    expect(r.hasPerc).toBe(true);
    expect(r.hasRoof).toBe(true);
  });
});

// ── percRating ────────────────────────────────────────────────────────────────

describe('percRating', () => {
  it('rates very_slow below 0.2', () => {
    expect(percRating(0.1).rating).toBe('very_slow');
  });
  it('rates slow between 0.2 and 1.0', () => {
    expect(percRating(0.5).rating).toBe('slow');
  });
  it('rates ideal between 1.0 and 3.0', () => {
    expect(percRating(1.0).rating).toBe('ideal');
    expect(percRating(2.5).rating).toBe('ideal');
  });
  it('rates fast above 3.0', () => {
    expect(percRating(4.0).rating).toBe('fast');
  });
});

// ── roofAnnualCaptureL ────────────────────────────────────────────────────────

describe('roofAnnualCaptureL', () => {
  it('computes correctly: 100m² × 800mm × 0.85 = 68,000 L', () => {
    expect(roofAnnualCaptureL(100, 800, 0.85)).toBeCloseTo(68000);
  });
  it('uses default coeff 0.85', () => {
    expect(roofAnnualCaptureL(100, 800)).toBeCloseTo(68000);
  });
});

// ── earthwaterKpis ────────────────────────────────────────────────────────────

describe('earthwaterKpis', () => {
  it('returns 6 dashed items for empty stores and no layers', () => {
    const kpis = earthwaterKpis(undefined, [], [], [], [], []);
    expect(kpis).toHaveLength(6);
    expect(kpis[2].value).toBe('0'); // observations
    expect(kpis[3].value).toBe('—'); // water features
  });

  it('shows field sample ph when samples present', () => {
    const kpis = earthwaterKpis(undefined, [makeSample({ ph: 6.4 })], [], [], [], []);
    expect(kpis[0].value).toBe('6.4');
    expect(kpis[0].note).toContain('field samples');
  });

  it('falls back to layer ph_range when no samples', () => {
    const kpis = earthwaterKpis([SOIL_LAYER as any], [], [], [], [], []);
    expect(kpis[0].value).toBe('6.1 - 6.8');
  });

  it('shows watershed name in note', () => {
    const kpis = earthwaterKpis([WATERSHED_LAYER as any], [], [], [], [], []);
    expect(kpis[5].value).toBe('380 m');
    expect(kpis[5].note).toContain('Sixteen Mile Creek');
  });
});

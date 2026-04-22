/**
 * fuzzyMCDM — membership, AHP weights, and opt-in integration with
 * computeAssessmentScores.
 */

import { describe, it, expect } from 'vitest';
import {
  computeFuzzyFAOMembership,
  computeAhpWeights,
  DEFAULT_ATLAS_AHP_MATRIX,
  defaultAtlasWeights,
  computeAssessmentScores,
  type MockLayerResult,
} from '../scoring/index.js';

function soilsLayer(overrides: Record<string, unknown> = {}): MockLayerResult {
  return {
    layerType: 'soils',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2026-01-01',
    sourceApi: 'test',
    attribution: 'test',
    summary: {
      ph: 6.5,
      rooting_depth_cm: 120,
      drainage_class: 'well drained',
      awc_cm_cm: 0.18,
      ec_ds_m: 1.0,
      cec_cmol_kg: 22,
      ...overrides,
    },
  } as MockLayerResult;
}

function climateLayer(overrides: Record<string, unknown> = {}): MockLayerResult {
  return {
    layerType: 'climate',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2026-01-01',
    sourceApi: 'test',
    attribution: 'test',
    summary: { annual_precip_mm: 900, gdd: 2800, ...overrides },
  } as MockLayerResult;
}

function elevationLayer(overrides: Record<string, unknown> = {}): MockLayerResult {
  return {
    layerType: 'elevation',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2026-01-01',
    sourceApi: 'test',
    attribution: 'test',
    summary: {
      min_elevation_m: 180,
      max_elevation_m: 220,
      mean_slope_deg: 2,
      ...overrides,
    },
  } as MockLayerResult;
}

describe('computeFuzzyFAOMembership', () => {
  it('returns S1-dominant membership for optimal inputs', () => {
    const r = computeFuzzyFAOMembership({
      pH: 6.5,
      rootingDepthCm: 150,
      slopeDeg: 2,
      awcCmCm: 0.18,
      ecDsM: 1,
      cecCmolKg: 22,
      gdd: 2800,
      drainageClass: 'well drained',
    });
    expect(r.defuzzifiedClass).toBe('S1');
    expect(r.aggregate.S1).toBeGreaterThan(r.aggregate.S2);
    expect(r.aggregate.S1).toBeGreaterThan(r.aggregate.N2);
  });

  it('returns N2-dominant for extreme pH and shallow soils', () => {
    const r = computeFuzzyFAOMembership({
      pH: 3.0,
      rootingDepthCm: 5,
      slopeDeg: 60,
      awcCmCm: null,
      ecDsM: 30,
      cecCmolKg: null,
      gdd: null,
      drainageClass: null,
    });
    expect(['N1', 'N2']).toContain(r.defuzzifiedClass);
  });

  it('memberships sum to ≈1 after normalization', () => {
    const r = computeFuzzyFAOMembership({
      pH: 6.5, rootingDepthCm: 80, slopeDeg: 8, awcCmCm: 0.12,
      ecDsM: 2, cecCmolKg: 12, gdd: 2000, drainageClass: 'moderately well',
    });
    const sum = r.aggregate.S1 + r.aggregate.S2 + r.aggregate.S3 + r.aggregate.N1 + r.aggregate.N2;
    expect(sum).toBeCloseTo(1, 2);
  });
});

describe('computeAhpWeights', () => {
  it('produces 8 weights that sum to 1 for the default Atlas matrix', () => {
    const r = computeAhpWeights(DEFAULT_ATLAS_AHP_MATRIX);
    expect(r.weights).toHaveLength(8);
    const sum = r.weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 3);
  });

  it('default Atlas matrix is consistent (CR ≤ 0.10)', () => {
    const r = computeAhpWeights(DEFAULT_ATLAS_AHP_MATRIX);
    expect(r.consistent).toBe(true);
  });

  it('defaultAtlasWeights returns 8 normalized weights', () => {
    const w = defaultAtlasWeights();
    expect(w).toHaveLength(8);
  });

  it('rejects non-square matrices', () => {
    expect(() => computeAhpWeights([[1, 2], [3]])).toThrow(/square/);
  });
});

describe('computeAssessmentScores — scoringMode opt-in', () => {
  const layers = [soilsLayer(), climateLayer(), elevationLayer()];

  it('crisp mode (default) does not attach fuzzyFAO', () => {
    const scores = computeAssessmentScores(layers, 100, 'US', '2026-04-22T00:00:00Z');
    const fao = scores.find((s) => s.label === 'FAO Land Suitability');
    expect(fao).toBeDefined();
    expect(fao!.fuzzyFAO).toBeUndefined();
  });

  it('fuzzy mode attaches fuzzyFAO to FAO Suitability entry', () => {
    const scores = computeAssessmentScores(layers, 100, 'US', '2026-04-22T00:00:00Z', {
      scoringMode: 'fuzzy',
    });
    const fao = scores.find((s) => s.label === 'FAO Land Suitability');
    expect(fao).toBeDefined();
    expect(fao!.fuzzyFAO).toBeDefined();
    expect(fao!.fuzzyFAO!.defuzzifiedClass).toBe('S1');
    expect(fao!.fuzzyFAO!.confidence).toBeGreaterThan(0);
  });

  it('fuzzy mode does not alter crisp scores', () => {
    const crisp = computeAssessmentScores(layers, 100, 'US', '2026-04-22T00:00:00Z');
    const fuzzy = computeAssessmentScores(layers, 100, 'US', '2026-04-22T00:00:00Z', {
      scoringMode: 'fuzzy',
    });
    for (let i = 0; i < crisp.length; i++) {
      expect(fuzzy[i]!.score).toBe(crisp[i]!.score);
      expect(fuzzy[i]!.rating).toBe(crisp[i]!.rating);
    }
  });
});

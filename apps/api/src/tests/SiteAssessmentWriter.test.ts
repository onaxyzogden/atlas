import { describe, it, expect } from 'vitest';
import {
  layerRowsToMockLayers,
  SCORE_LABEL_TO_COLUMN,
} from '../services/assessments/SiteAssessmentWriter.js';
import { computeAssessmentScores } from '@ogden/shared/scoring';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

type DbRow = {
  layer_type: string;
  summary_data: Record<string, unknown> | null;
  confidence: string | null;
  data_date: string | null;
  source_api: string | null;
  attribution: string | null;
};

function row(
  type: string,
  summary: Record<string, unknown>,
  confidence: string | null = 'high',
): DbRow {
  return {
    layer_type: type,
    summary_data: summary,
    confidence,
    data_date: '2026-01-01',
    source_api: 'test',
    attribution: 'test fixture',
  };
}

// ─── Adapter: layerRowsToMockLayers ──────────────────────────────────────────

describe('layerRowsToMockLayers', () => {
  it('converts DB rows to MockLayerResult shape with sensible defaults', () => {
    const mocks = layerRowsToMockLayers([
      row('climate', { annual_precip_mm: 900 }, 'high'),
      row('soils', { drainage_class: 'well drained' }, 'medium'),
    ]);

    expect(mocks).toHaveLength(2);
    expect(mocks[0]).toMatchObject({
      layerType: 'climate',
      fetchStatus: 'complete',
      confidence: 'high',
      summary: { annual_precip_mm: 900 },
    });
    expect(mocks[1]?.confidence).toBe('medium');
  });

  it('coerces invalid confidence strings to "low" (defensive)', () => {
    const [mock] = layerRowsToMockLayers([row('climate', {}, 'bogus')]);
    expect(mock?.confidence).toBe('low');
  });

  it('tolerates null summary_data by substituting an empty object', () => {
    const [mock] = layerRowsToMockLayers([
      { ...row('climate', {}), summary_data: null },
    ]);
    expect(mock?.summary).toEqual({});
  });

  it('propagates optional metadata fields when present', () => {
    const [mock] = layerRowsToMockLayers([
      {
        ...row('elevation', { mean_slope_deg: 3 }),
        data_date: '2025-06-15',
        source_api: 'USGS-3DEP',
        attribution: 'US Geological Survey',
      },
    ]);
    expect(mock?.dataDate).toBe('2025-06-15');
    expect(mock?.sourceApi).toBe('USGS-3DEP');
    expect(mock?.attribution).toBe('US Geological Survey');
  });
});

// ─── Label → DB column mapping ───────────────────────────────────────────────

describe('SCORE_LABEL_TO_COLUMN', () => {
  it('declares all 4 DB score columns', () => {
    expect(Object.keys(SCORE_LABEL_TO_COLUMN).sort()).toEqual([
      'ag_potential_score',
      'buildability_score',
      'suitability_score',
      'water_resilience_score',
    ]);
  });

  it('each label is still emitted by the shared scorer for a realistic layer set', () => {
    const mocks = layerRowsToMockLayers([
      row('climate', { annual_precip_mm: 900, annual_temp_mean_c: 9 }),
      row('soils', {
        drainage_class: 'well drained',
        hydrologic_group: 'B',
        fertility_index: 70,
        texture_class: 'silt_loam',
        organic_matter_pct: 3,
        rooting_depth_cm: 120,
      }),
      row('elevation', { mean_slope_deg: 3 }),
      row('wetlands_flood', { flood_zone: 'Zone X', wetland_pct: 3 }),
      row('land_cover', { tree_canopy_pct: 35 }),
      row('watershed', { catchment_area_ha: 60 }),
    ]);

    const scores = computeAssessmentScores(mocks, 40, 'US', '2026-04-21T00:00:00.000Z');
    const labels = scores.map((s) => s.label);

    for (const expectedLabel of Object.values(SCORE_LABEL_TO_COLUMN)) {
      expect(labels).toContain(expectedLabel);
    }
  });
});

// ─── computedAt determinism ──────────────────────────────────────────────────

describe('computeAssessmentScores — computedAt override', () => {
  it('stamps the provided computedAt on every ScoredResult', () => {
    const mocks = layerRowsToMockLayers([
      row('climate', { annual_precip_mm: 900, annual_temp_mean_c: 9 }),
      row('soils', { drainage_class: 'well drained', hydrologic_group: 'B' }),
      row('elevation', { mean_slope_deg: 3 }),
    ]);

    const scores = computeAssessmentScores(mocks, 10, 'US', '2026-04-21T12:00:00.000Z');
    for (const s of scores) {
      expect(s.computedAt).toBe('2026-04-21T12:00:00.000Z');
    }
  });

  it('falls back to live timestamps when computedAt is omitted', () => {
    const mocks = layerRowsToMockLayers([
      row('climate', { annual_precip_mm: 900 }),
    ]);
    const before = new Date().toISOString();
    const scores = computeAssessmentScores(mocks, 10, 'US');
    const after = new Date().toISOString();
    for (const s of scores) {
      expect(s.computedAt >= before && s.computedAt <= after).toBe(true);
    }
  });
});

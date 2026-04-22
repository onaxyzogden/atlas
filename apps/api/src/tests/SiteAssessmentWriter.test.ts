import { describe, it, expect } from 'vitest';
import { layerRowsToMockLayers } from '../services/assessments/SiteAssessmentWriter.js';
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

  it('tolerates null summary_data (unmigrated layer types pass through as empty object)', () => {
    const [mock] = layerRowsToMockLayers([
      { ...row('watershed', {}), summary_data: null },
    ]);
    expect(mock?.summary).toEqual({});
  });

  it('null summary_data on a typed layer yields a schema-shaped object of nulls', () => {
    const [mock] = layerRowsToMockLayers([
      { ...row('climate', {}), summary_data: null },
    ]);
    // Validator fills every known key with null when input is empty.
    const summary = mock?.summary as Record<string, unknown>;
    expect(summary.annual_precip_mm).toBeNull();
    expect(summary.annual_temp_mean_c).toBeNull();
    expect(summary.hardiness_zone).toBeNull();
  });

  it('coerces stale sentinel strings in typed summaries to null (DB-boundary guard)', () => {
    // A pre-2026-04-21 persisted row may still contain 'N/A' / 'Unknown' in
    // slots the scoring types declare as `number | null`. The adapter must
    // coerce those to null rather than let them reach the scorer.
    const [wetlands] = layerRowsToMockLayers([
      row('wetlands_flood', {
        flood_zone: 'Zone X',
        wetland_pct: 'Unknown',
        riparian_buffer_m: 'N/A',
        wetland_types: ['Palustrine'],
        regulated_area_pct: 'Yes',
      }),
    ]);
    const summary = wetlands?.summary as Record<string, unknown>;
    expect(summary.wetland_pct).toBeNull();
    expect(summary.riparian_buffer_m).toBeNull();
    expect(summary.flood_zone).toBe('Zone X');
    expect(summary.regulated_area_pct).toBe('Yes');
    expect(summary.wetland_types).toEqual(['Palustrine']);
  });

  it('coerces non-numeric soil numeric fields to null', () => {
    const [soils] = layerRowsToMockLayers([
      row('soils', {
        drainage_class: 'well drained',
        organic_matter_pct: 'N/A',
        depth_to_bedrock_m: 'Unknown',
        hydrologic_group: 'B',
      }),
    ]);
    const summary = soils?.summary as Record<string, unknown>;
    expect(summary.organic_matter_pct).toBeNull();
    expect(summary.depth_to_bedrock_m).toBeNull();
    expect(summary.drainage_class).toBe('well drained');
    expect(summary.hydrologic_group).toBe('B');
  });

  it('passes unmigrated layer types through untouched', () => {
    const [lc] = layerRowsToMockLayers([
      row('land_cover', { tree_canopy_pct: 'N/A', whatever: 123 }),
    ]);
    const summary = lc?.summary as Record<string, unknown>;
    // No schema for land_cover yet — raw passthrough.
    expect(summary.tree_canopy_pct).toBe('N/A');
    expect(summary.whatever).toBe(123);
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

// ─── Canonical ScoredResult[] shape emitted by the scorer ────────────────────
//
// Post migration 009 the DB stores the full ScoredResult[] in
// `score_breakdown` (no 4-column projection). Lock in the shape the writer
// depends on: every element has the 4 fields the PDF + route consumers read.

describe('computeAssessmentScores — canonical shape', () => {
  it('emits ScoredResult[] with label/score/confidence/score_breakdown on every element', () => {
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

    // The shared scorer currently emits 10 canonical labels; lock in that
    // none is silently dropped on a realistic layer set.
    expect(scores.length).toBeGreaterThanOrEqual(10);

    for (const s of scores) {
      expect(typeof s.label).toBe('string');
      expect(s.label.length).toBeGreaterThan(0);
      expect(typeof s.score).toBe('number');
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
      expect(['high', 'medium', 'low']).toContain(s.confidence);
      expect(Array.isArray(s.score_breakdown)).toBe(true);
    }
  });

  it('retains the 4 labels the educational-booklet PDF has explanations for', () => {
    // Graceful-coverage guard: the booklet template keys SCORE_EXPLANATIONS
    // on these exact strings. If the shared scorer renames one, the 4
    // rich cards silently drop to graceful-degradation mode with no type
    // error. This test catches the rename.
    const mocks = layerRowsToMockLayers([
      row('climate', { annual_precip_mm: 900 }),
      row('soils', { drainage_class: 'well drained' }),
      row('elevation', { mean_slope_deg: 3 }),
      row('wetlands_flood', { flood_zone: 'Zone X' }),
      row('land_cover', { tree_canopy_pct: 35 }),
    ]);
    const scores = computeAssessmentScores(mocks, 40, 'US', '2026-04-21T00:00:00.000Z');
    const labels = scores.map((s) => s.label);
    for (const expected of ['Water Resilience', 'Buildability', 'Agricultural Suitability', 'Regenerative Potential']) {
      expect(labels).toContain(expected);
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

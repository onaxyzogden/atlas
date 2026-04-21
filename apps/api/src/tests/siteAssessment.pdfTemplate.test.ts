/**
 * PDF template test for `renderSiteAssessment`.
 *
 * Purpose: before migration 009 this template iterated `score_breakdown` as
 * `Record<string, Record<string, number>>` (the legacy dict-of-dicts shape
 * from the 001 DDL comment). The writer shipped 2026-04-21 stores
 * `ScoredResult[]` instead — so `Object.entries([...])` produced numeric
 * section headers ("0","1","2"…) with gibberish tables. The bug was invisible
 * only because no `site_assessments` rows existed in dev yet. Migration 009
 * dropped the legacy columns + this template was rewritten to iterate the
 * canonical `ScoredResult[]`. This test locks in the correct rendering.
 *
 * Strategy: use real output from `computeAssessmentScores` (the shared
 * scorer the writer also uses) so any rename/shape drift on the shared side
 * shows up here as well.
 */

import { describe, it, expect } from 'vitest';
import { computeAssessmentScores } from '@ogden/shared/scoring';
import { renderSiteAssessment } from '../services/pdf/templates/siteAssessment.js';
import type {
  ExportDataBag,
  ProjectRow,
  AssessmentRow,
} from '../services/pdf/templates/index.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeProject(): ProjectRow {
  return {
    id: 'proj-test',
    name: 'Test Farm',
    description: null,
    project_type: 'small_homestead',
    country: 'US',
    province_state: 'NC',
    address: '123 Test Rd',
    parcel_id: null,
    acreage: 40,
    data_completeness_score: 85,
    owner_notes: null,
    zoning_notes: null,
    access_notes: null,
    water_rights_notes: null,
    climate_region: 'Piedmont',
    bioregion: null,
    restrictions_covenants: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-21T00:00:00Z',
  };
}

function makeAssessment(): AssessmentRow {
  const scores = computeAssessmentScores(
    [
      {
        layerType: 'climate',
        fetchStatus: 'complete',
        confidence: 'high',
        dataDate: '2025-09-01',
        sourceApi: 'NOAA',
        attribution: 'NOAA NCEI',
        summary: { annual_precip_mm: 950, annual_temp_mean_c: 9 },
      },
      {
        layerType: 'soils',
        fetchStatus: 'complete',
        confidence: 'high',
        dataDate: '2025-06-01',
        sourceApi: 'SSURGO',
        attribution: 'USDA NRCS',
        summary: {
          drainage_class: 'well drained',
          hydrologic_group: 'B',
          fertility_index: 72,
          texture_class: 'silt_loam',
          organic_matter_pct: 3.2,
          rooting_depth_cm: 140,
        },
      },
      {
        layerType: 'elevation',
        fetchStatus: 'complete',
        confidence: 'high',
        dataDate: '2023-01-01',
        sourceApi: 'USGS-3DEP',
        attribution: 'USGS',
        summary: { mean_slope_deg: 3.1, min_elevation_m: 210, max_elevation_m: 240 },
      },
      {
        layerType: 'wetlands_flood',
        fetchStatus: 'complete',
        confidence: 'high',
        dataDate: '2025-07-01',
        sourceApi: 'FEMA-NFHL',
        attribution: 'FEMA',
        summary: { flood_zone: 'Zone X', wetland_pct: 3 },
      },
      {
        layerType: 'land_cover',
        fetchStatus: 'complete',
        confidence: 'high',
        dataDate: '2024-01-01',
        sourceApi: 'NLCD',
        attribution: 'USGS MRLC',
        summary: { tree_canopy_pct: 32, crop_pct: 40 },
      },
      {
        layerType: 'watershed',
        fetchStatus: 'complete',
        confidence: 'medium',
        dataDate: '2025-01-01',
        sourceApi: 'NHD',
        attribution: 'USGS NHD',
        summary: { catchment_area_ha: 85, nearest_stream_m: 120 },
      },
    ],
    40,
    'US',
    '2026-04-21T00:00:00.000Z',
  );

  return {
    id: 'sa-test',
    overall_score: 66.0,
    score_breakdown: scores,
    flags: [],
    data_sources_used: ['climate', 'soils', 'elevation', 'wetlands_flood', 'land_cover', 'watershed'],
    confidence: 'medium',
    needs_site_visit: false,
  };
}

function makeDataBag(): ExportDataBag {
  return {
    project: makeProject(),
    assessment: makeAssessment(),
    layers: [],
    designFeatures: [],
    payload: undefined,
    generatedAt: '2026-04-21T00:00:00Z',
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('renderSiteAssessment — post migration 009', () => {
  it('renders a gauge for Overall + every ScoredResult label', () => {
    const bag = makeDataBag();
    const html = renderSiteAssessment(bag);

    // Overall gauge is always first.
    expect(html).toContain('>Overall<');

    // Every label the shared scorer emitted shows up as a gauge label. The
    // template uses esc() on labels, so they land verbatim in the HTML.
    for (const s of bag.assessment!.score_breakdown!) {
      expect(html).toContain(`>${s.label}<`);
    }
  });

  it('renders a per-component factor table card for each ScoredResult', () => {
    const bag = makeDataBag();
    const html = renderSiteAssessment(bag);

    // Every label should have a card heading in the breakdown section.
    for (const s of bag.assessment!.score_breakdown!) {
      expect(html).toContain(`<h4>${s.label}</h4>`);
    }

    // Every ScoreComponent name appears at least once in the breakdown tables
    // (sampled — if the shape drifted we'd see none of them).
    const firstLabel = bag.assessment!.score_breakdown![0]!;
    if (firstLabel.score_breakdown.length > 0) {
      const firstComponentName = firstLabel.score_breakdown[0]!.name;
      expect(html).toContain(firstComponentName.replace(/_/g, ' '));
    }
  });

  it('does NOT render numeric section headers from the legacy dict-of-dicts shape', () => {
    // Regression guard: the pre-009 template iterated score_breakdown as
    // a dict, so `Object.entries(ScoredResult[])` produced section headers
    // "0","1","2"… Match the exact <h4>N</h4> pattern the old bug produced.
    const html = renderSiteAssessment(makeDataBag());
    expect(html).not.toMatch(/<h4>\d+<\/h4>/);
  });

  it('includes the overall confidence + site-visit flag in the scores section', () => {
    const html = renderSiteAssessment(makeDataBag());
    expect(html).toContain('Confidence level:');
    expect(html).toContain('<strong>medium</strong>');
  });
});

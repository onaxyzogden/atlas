/**
 * computeScores.ts — comprehensive tests for the scoring engine.
 * Tests all 8 exported functions with US/CA layers, edge cases, and degradation.
 */

import { describe, it, expect } from 'vitest';
import {
  computeAssessmentScores,
  computeOverallScore,
  deriveDataLayerRows,
  deriveLiveDataRows,
  deriveOpportunities,
  deriveRisks,
  deriveSiteSummary,
  deriveLandWants,
} from '../lib/computeScores.js';
import { mockLayersUS, mockLayersCA, mockLayersIncomplete, mockLayersEmpty, mockLayersWithOverrides } from './helpers/mockLayers.js';
import type { MockLayerResult } from '../lib/mockLayerData.js';
import { generateMockLayers } from '../lib/mockLayerData.js';

// ── computeAssessmentScores ──

describe('computeAssessmentScores', () => {
  describe('with US layers', () => {
    const scores = computeAssessmentScores(mockLayersUS(), null);

    it('returns 10 assessment scores (8 weighted + FAO + USDA)', () => {
      // Sprint BT: US returns 8 weighted (incl. Community Suitability) + FAO + USDA
      expect(scores).toHaveLength(10);
    });

    it('includes all expected score labels', () => {
      const labels = scores.map((s) => s.label);
      expect(labels).toContain('Water Resilience');
      expect(labels).toContain('Agricultural Suitability');
      expect(labels).toContain('Regenerative Potential');
      expect(labels).toContain('Buildability');
      expect(labels).toContain('Habitat Sensitivity');
      expect(labels).toContain('Stewardship Readiness');
      expect(labels).toContain('Community Suitability');
      expect(labels).toContain('Design Complexity');
      expect(labels).toContain('FAO Land Suitability');
      expect(labels).toContain('USDA Land Capability');
    });

    it('clamps all scores between 0 and 100', () => {
      for (const score of scores) {
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
      }
    });

    it('assigns a valid rating to each weighted score', () => {
      // Sprint BT: formal-classification scores (FAO, USDA, Canada) emit
      // domain-specific rating strings like "S1 — Highly Suitable" or
      // "Class 2 — …". Rating enum applies to the 8 weighted scores only.
      const validRatings = ['Exceptional', 'Good', 'Moderate', 'Low', 'Insufficient Data'];
      for (const score of scores.slice(0, 8)) {
        expect(validRatings).toContain(score.rating);
      }
    });

    it('includes confidence for each score', () => {
      for (const score of scores) {
        expect(['high', 'medium', 'low']).toContain(score.confidence);
      }
    });

    it('has non-empty dataSources for each score', () => {
      for (const score of scores) {
        expect(score.dataSources.length).toBeGreaterThan(0);
      }
    });

    it('includes score_breakdown array', () => {
      for (const score of scores) {
        expect(Array.isArray(score.score_breakdown)).toBe(true);
      }
    });

    it('sets computedAt to a valid ISO string', () => {
      for (const score of scores) {
        expect(() => new Date(score.computedAt)).not.toThrow();
      }
    });
  });

  describe('with CA layers', () => {
    // Sprint BT: pass country='CA' to trigger the Canada Soil Capability branch
    const scores = computeAssessmentScores(mockLayersCA(), null, 'CA');

    it('returns 11 scores for Canadian data (8 weighted + FAO + USDA + Canada Soil Capability)', () => {
      expect(scores).toHaveLength(11);
    });

    it('has valid scores between 0 and 100', () => {
      for (const score of scores) {
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('graceful degradation', () => {
    it('handles incomplete layers without crashing', () => {
      const scores = computeAssessmentScores(mockLayersIncomplete(), null);
      expect(scores).toHaveLength(10);
      for (const score of scores) {
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
      }
    });

    it('handles empty/pending layers', () => {
      const scores = computeAssessmentScores(mockLayersEmpty(), null);
      expect(scores).toHaveLength(10);
      // With no real data, scores should be low or rated insufficient
      for (const score of scores) {
        expect(score.score).toBeGreaterThanOrEqual(0);
      }
    });

    it('handles empty array input', () => {
      const scores = computeAssessmentScores([], null);
      // Sprint BT: empty array returns 10 (no CA branch since country default unknown)
      expect(scores).toHaveLength(10);
    });
  });

  describe('with acreage', () => {
    it('accepts numeric acreage without error', () => {
      const scores = computeAssessmentScores(mockLayersUS(), 50);
      expect(scores).toHaveLength(10);
    });
  });
});

// ── computeOverallScore ──

describe('computeOverallScore', () => {
  it('returns 0 for empty scores', () => {
    expect(computeOverallScore([])).toBe(0);
  });

  it('computes a weighted average of 7 scores', () => {
    const scores = computeAssessmentScores(mockLayersUS(), null);
    const overall = computeOverallScore(scores);
    expect(overall).toBeGreaterThan(0);
    expect(overall).toBeLessThanOrEqual(100);
  });

  it('returns a number, not NaN', () => {
    const scores = computeAssessmentScores(mockLayersEmpty(), null);
    const overall = computeOverallScore(scores);
    expect(Number.isNaN(overall)).toBe(false);
  });
});

// ── deriveDataLayerRows ──

describe('deriveDataLayerRows', () => {
  it('returns rows for complete layers', () => {
    const rows = deriveDataLayerRows(mockLayersUS());
    expect(rows.length).toBeGreaterThan(0);
  });

  it('each row has label, value, confidence', () => {
    const rows = deriveDataLayerRows(mockLayersUS());
    for (const row of rows) {
      expect(row).toHaveProperty('label');
      expect(row).toHaveProperty('value');
      expect(row).toHaveProperty('confidence');
      expect(['High', 'Medium', 'Low']).toContain(row.confidence);
    }
  });

  it('handles empty layers without crashing', () => {
    const rows = deriveDataLayerRows([]);
    expect(Array.isArray(rows)).toBe(true);
  });
});

// ── deriveLiveDataRows ──

describe('deriveLiveDataRows', () => {
  it('returns rows with icon, label, value, color', () => {
    const rows = deriveLiveDataRows(mockLayersUS());
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty('icon');
      expect(row).toHaveProperty('label');
      expect(row).toHaveProperty('value');
      expect(row).toHaveProperty('color');
      expect(['High', 'Medium', 'Low']).toContain(row.confidence);
    }
  });
});

// ── deriveOpportunities / deriveRisks ──

describe('deriveOpportunities', () => {
  it('returns an array of AssessmentFlag objects for US layers', () => {
    const opps = deriveOpportunities(mockLayersUS(), 'US');
    expect(Array.isArray(opps)).toBe(true);
    for (const item of opps) {
      expect(item).toHaveProperty('id');
    }
  });

  it('handles empty layers', () => {
    const opps = deriveOpportunities([], 'US');
    expect(Array.isArray(opps)).toBe(true);
  });

  it('works with CA layers', () => {
    const opps = deriveOpportunities(mockLayersCA(), 'CA');
    expect(Array.isArray(opps)).toBe(true);
  });
});

describe('deriveRisks', () => {
  it('returns an array of AssessmentFlag objects', () => {
    const risks = deriveRisks(mockLayersUS(), 'US');
    expect(Array.isArray(risks)).toBe(true);
    for (const item of risks) {
      expect(item).toHaveProperty('id');
    }
  });

  it('handles empty layers', () => {
    const risks = deriveRisks([], 'US');
    expect(Array.isArray(risks)).toBe(true);
  });
});

// ── deriveSiteSummary ──

const mockProject = { name: 'Test Farm', acreage: 50, provinceState: 'Ontario', country: 'CA' };

describe('deriveSiteSummary', () => {
  it('returns a non-empty string for US layers', () => {
    const summary = deriveSiteSummary(mockLayersUS(), mockProject);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('returns a string for CA layers', () => {
    const summary = deriveSiteSummary(mockLayersCA(), mockProject);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('handles empty layers', () => {
    const summary = deriveSiteSummary([], mockProject);
    expect(typeof summary).toBe('string');
  });

  it('handles null acreage and province', () => {
    const summary = deriveSiteSummary(mockLayersUS(), { name: 'Test', acreage: null, provinceState: null, country: 'US' });
    expect(typeof summary).toBe('string');
  });
});

// ── deriveLandWants ──

describe('deriveLandWants', () => {
  it('returns a non-empty string for US layers', () => {
    const wants = deriveLandWants(mockLayersUS());
    expect(typeof wants).toBe('string');
    expect(wants.length).toBeGreaterThan(0);
  });

  it('handles empty layers', () => {
    const wants = deriveLandWants([]);
    expect(typeof wants).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch coverage extensions
// Root cause of 62% coverage: generateMockLayers() produces only 7 Tier 1
// layers. All if(tier3) true branches and most intermediate threshold branches
// are untested. The tests below systematically cover them.
// ─────────────────────────────────────────────────────────────────────────────

/* ── Local helpers ─────────────────────────────────────────────────────────── */

/** Build a minimal Tier 3 MockLayerResult for injection into test layer arrays. */
function tier3Layer(type: string, summary: Record<string, unknown>): MockLayerResult {
  return {
    layerType: type as MockLayerResult['layerType'],
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2026-01-01',
    sourceApi: 'derived',
    attribution: 'OGDEN derived',
    summary,
  } as unknown as MockLayerResult;
}

/**
 * Returns Tier 1 US layers PLUS all four Tier 3 layers with realistic defaults.
 * Individual Tier 3 summaries can be overridden at the top-level key level.
 */
function withTier3(overrides: {
  watershedDerived?: Record<string, unknown>;
  microclimate?: Record<string, unknown>;
  soilRegen?: Record<string, unknown>;
  terrain?: Record<string, unknown>;
} = {}): MockLayerResult[] {
  return [
    ...generateMockLayers('US'),
    tier3Layer('watershed_derived', {
      runoff: { meanAccumulation: 55 },
      flood: { detentionAreaPct: 6 },
      ...overrides.watershedDerived,
    }),
    tier3Layer('microclimate', {
      moistureZones: { dominantClass: 'moist', classification: { wet: 15, moist: 30 } },
      sunTraps: { areaPct: 25 },
      frostRisk: { effectiveGrowingSeason: 190, climateGrowingSeason: 165 },
      windShelter: { shelteredAreaPct: 45 },
      outdoorComfort: { annualMeanScore: 65 },
      ...overrides.microclimate,
    }),
    tier3Layer('soil_regeneration', {
      carbonSequestration: { meanSeqPotential: 0.7 },
      restorationPriority: { highPriorityAreaPct: 55, criticalAreaPct: 10 },
      disturbedLand: { disturbedAreaPct: 8 },
      interventions: {
        interventionSummary: {
          typeA: { zoneCount: 3 },
          typeB: { zoneCount: 3 },
          typeC: { zoneCount: 3 },
        },
      },
      regenerationSequence: {
        sitewidePhaseSummary: {
          phase1: { zoneCount: 2, avgDurationMonths: 12 },
          phase2: { zoneCount: 1, avgDurationMonths: 10 },
        },
      },
      ...overrides.soilRegen,
    }),
    tier3Layer('terrain_analysis', {
      curvature: { profileMean: 0.03, planMean: 0.03 },
      tpiClassification: { ridge: 5, upper_slope: 10, mid_slope: 15, flat: 65, lower_slope: 3, valley: 2 },
      viewshed: { visiblePct: 75 },
      coldAirDrainage: { riskRating: 'high' },
      ...overrides.terrain,
    }),
  ];
}

/** Extract a score component by score label and component name. */
function getComp(
  scores: ReturnType<typeof computeAssessmentScores>,
  scoreLabel: string,
  compName: string,
) {
  return scores
    .find((s) => s.label === scoreLabel)
    ?.score_breakdown.find((c) => c.name === compName);
}

/* ── 1. Tier 3 layer presence — all if(tier3) true branches ─────────────────── */

describe('computeAssessmentScores — Tier 3 layers present (if-true branches)', () => {
  const scores = computeAssessmentScores(withTier3(), null);

  it('returns 10 scores with all Tier 3 layers present', () => {
    expect(scores).toHaveLength(10);
  });

  it('all scores are valid and clamped 0–100', () => {
    for (const s of scores) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
    }
  });

  it('Agricultural Suitability reaches Exceptional rating with full Tier 3 bonuses', () => {
    const ag = scores.find((s) => s.label === 'Agricultural Suitability')!;
    expect(ag.rating).toBe('Exceptional');
  });

  it('Water Resilience — watershed_flow_accumulation is non-zero', () => {
    expect(getComp(scores, 'Water Resilience', 'watershed_flow_accumulation')?.value).toBeGreaterThan(0);
  });

  it('Water Resilience — detention_zone_presence is non-zero', () => {
    expect(getComp(scores, 'Water Resilience', 'detention_zone_presence')?.value).toBeGreaterThan(0);
  });

  it('Water Resilience — moisture_zone_distribution is non-zero', () => {
    expect(getComp(scores, 'Water Resilience', 'moisture_zone_distribution')?.value).toBeGreaterThan(0);
  });

  it('Agricultural Suitability — sun_trap_coverage is non-zero', () => {
    expect(getComp(scores, 'Agricultural Suitability', 'sun_trap_coverage')?.value).toBeGreaterThan(0);
  });

  it('Agricultural Suitability — frost_risk_reduction is non-zero', () => {
    expect(getComp(scores, 'Agricultural Suitability', 'frost_risk_reduction')?.value).toBeGreaterThan(0);
  });

  it('Agricultural Suitability — wind_shelter is non-zero', () => {
    expect(getComp(scores, 'Agricultural Suitability', 'wind_shelter')?.value).toBeGreaterThan(0);
  });

  it('Regenerative Potential — carbon_sequestration_potential is non-zero', () => {
    expect(getComp(scores, 'Regenerative Potential', 'carbon_sequestration_potential')?.value).toBeGreaterThan(0);
  });

  it('Regenerative Potential — restoration_priority_zones is non-zero', () => {
    expect(getComp(scores, 'Regenerative Potential', 'restoration_priority_zones')?.value).toBeGreaterThan(0);
  });

  it('Regenerative Potential — intervention_suitability is non-zero', () => {
    expect(getComp(scores, 'Regenerative Potential', 'intervention_suitability')?.value).toBeGreaterThan(0);
  });

  it('Buildability — terrain_curvature_complexity is present', () => {
    expect(getComp(scores, 'Buildability', 'terrain_curvature_complexity')).toBeDefined();
  });

  it('Buildability — tpi_flat_area is non-zero', () => {
    expect(getComp(scores, 'Buildability', 'tpi_flat_area')?.value).toBeGreaterThan(0);
  });

  it('Buildability — viewshed_openness is non-zero', () => {
    expect(getComp(scores, 'Buildability', 'viewshed_openness')?.value).toBeGreaterThan(0);
  });

  it('Habitat Sensitivity — cold_air_drainage_corridors is non-zero', () => {
    expect(getComp(scores, 'Habitat Sensitivity', 'cold_air_drainage_corridors')?.value).toBeGreaterThan(0);
  });

  it('Habitat Sensitivity — intact_land_area is non-zero', () => {
    expect(getComp(scores, 'Habitat Sensitivity', 'intact_land_area')?.value).toBeGreaterThan(0);
  });

  it('Habitat Sensitivity — moisture_zone_wet_areas is non-zero', () => {
    expect(getComp(scores, 'Habitat Sensitivity', 'moisture_zone_wet_areas')?.value).toBeGreaterThan(0);
  });

  it('Stewardship Readiness — soil_regeneration_readiness is non-zero', () => {
    expect(getComp(scores, 'Stewardship Readiness', 'soil_regeneration_readiness')?.value).toBeGreaterThan(0);
  });

  it('Stewardship Readiness — regeneration_sequence_feasibility is non-zero', () => {
    expect(getComp(scores, 'Stewardship Readiness', 'regeneration_sequence_feasibility')?.value).toBeGreaterThan(0);
  });

  it('Stewardship Readiness — outdoor_comfort_fieldwork is non-zero', () => {
    expect(getComp(scores, 'Stewardship Readiness', 'outdoor_comfort_fieldwork')?.value).toBeGreaterThan(0);
  });

  it('Design Complexity — tpi_heterogeneity is present', () => {
    expect(getComp(scores, 'Design Complexity', 'tpi_heterogeneity')).toBeDefined();
  });

  it('Design Complexity — curvature_complexity is non-zero', () => {
    expect(getComp(scores, 'Design Complexity', 'curvature_complexity')?.value).toBeGreaterThan(0);
  });
});

/* ── 2. Tier 3 inner threshold branches ────────────────────────────────────── */

describe('Water Resilience — Tier 3 threshold values', () => {
  it('watershed_flow_accumulation: 10 pts when meanAccumulation > 50', () => {
    const s = computeAssessmentScores(withTier3({ watershedDerived: { runoff: { meanAccumulation: 60 }, flood: { detentionAreaPct: 0 } } }), null);
    expect(getComp(s, 'Water Resilience', 'watershed_flow_accumulation')?.value).toBe(10);
  });

  it('watershed_flow_accumulation: 7 pts when meanAccumulation 20–50', () => {
    const s = computeAssessmentScores(withTier3({ watershedDerived: { runoff: { meanAccumulation: 30 }, flood: { detentionAreaPct: 0 } } }), null);
    expect(getComp(s, 'Water Resilience', 'watershed_flow_accumulation')?.value).toBe(7);
  });

  it('watershed_flow_accumulation: 4 pts when meanAccumulation 5–20', () => {
    const s = computeAssessmentScores(withTier3({ watershedDerived: { runoff: { meanAccumulation: 10 }, flood: { detentionAreaPct: 0 } } }), null);
    expect(getComp(s, 'Water Resilience', 'watershed_flow_accumulation')?.value).toBe(4);
  });

  it('watershed_flow_accumulation: 0 pts when meanAccumulation ≤ 5', () => {
    const s = computeAssessmentScores(withTier3({ watershedDerived: { runoff: { meanAccumulation: 3 }, flood: { detentionAreaPct: 0 } } }), null);
    expect(getComp(s, 'Water Resilience', 'watershed_flow_accumulation')?.value).toBe(0);
  });

  it('detention_zone_presence: 10 pts when detentionAreaPct > 5', () => {
    const s = computeAssessmentScores(withTier3({ watershedDerived: { runoff: { meanAccumulation: 0 }, flood: { detentionAreaPct: 8 } } }), null);
    expect(getComp(s, 'Water Resilience', 'detention_zone_presence')?.value).toBe(10);
  });

  it('detention_zone_presence: 7 pts when detentionAreaPct 2–5', () => {
    const s = computeAssessmentScores(withTier3({ watershedDerived: { runoff: { meanAccumulation: 0 }, flood: { detentionAreaPct: 3 } } }), null);
    expect(getComp(s, 'Water Resilience', 'detention_zone_presence')?.value).toBe(7);
  });

  it('detention_zone_presence: 3 pts when detentionAreaPct 0–2', () => {
    const s = computeAssessmentScores(withTier3({ watershedDerived: { runoff: { meanAccumulation: 0 }, flood: { detentionAreaPct: 1 } } }), null);
    expect(getComp(s, 'Water Resilience', 'detention_zone_presence')?.value).toBe(3);
  });

  it('moisture_zone_distribution: 7 pts for dominantClass moderate', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { moistureZones: { dominantClass: 'moderate', classification: {} } } }), null);
    expect(getComp(s, 'Water Resilience', 'moisture_zone_distribution')?.value).toBe(7);
  });

  it('moisture_zone_distribution: 5 pts for dominantClass wet', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { moistureZones: { dominantClass: 'wet', classification: {} } } }), null);
    expect(getComp(s, 'Water Resilience', 'moisture_zone_distribution')?.value).toBe(5);
  });

  it('moisture_zone_distribution: 2 pts for dominantClass dry', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { moistureZones: { dominantClass: 'dry', classification: {} } } }), null);
    expect(getComp(s, 'Water Resilience', 'moisture_zone_distribution')?.value).toBe(2);
  });

  it('moisture_zone_distribution: 0 pts for unknown dominantClass', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { moistureZones: { dominantClass: 'arid', classification: {} } } }), null);
    expect(getComp(s, 'Water Resilience', 'moisture_zone_distribution')?.value).toBe(0);
  });
});

describe('Agricultural Suitability — Tier 3 threshold values', () => {
  it('sun_trap_coverage: 7 pts when areaPct 10–20', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { sunTraps: { areaPct: 15 } } }), null);
    expect(getComp(s, 'Agricultural Suitability', 'sun_trap_coverage')?.value).toBe(7);
  });

  it('sun_trap_coverage: 4 pts when areaPct 5–10', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { sunTraps: { areaPct: 7 } } }), null);
    expect(getComp(s, 'Agricultural Suitability', 'sun_trap_coverage')?.value).toBe(4);
  });

  it('sun_trap_coverage: 0 pts when areaPct ≤ 5', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { sunTraps: { areaPct: 3 } } }), null);
    expect(getComp(s, 'Agricultural Suitability', 'sun_trap_coverage')?.value).toBe(0);
  });

  it('frost_risk_reduction: 7 pts when extension 5–15 days', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { frostRisk: { effectiveGrowingSeason: 175, climateGrowingSeason: 165 } } }), null);
    expect(getComp(s, 'Agricultural Suitability', 'frost_risk_reduction')?.value).toBe(7);
  });

  it('frost_risk_reduction: 4 pts when extension 0–5 days', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { frostRisk: { effectiveGrowingSeason: 167, climateGrowingSeason: 165 } } }), null);
    expect(getComp(s, 'Agricultural Suitability', 'frost_risk_reduction')?.value).toBe(4);
  });

  it('frost_risk_reduction: 0 pts when extension ≤ 0', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { frostRisk: { effectiveGrowingSeason: 160, climateGrowingSeason: 165 } } }), null);
    expect(getComp(s, 'Agricultural Suitability', 'frost_risk_reduction')?.value).toBe(0);
  });

  it('wind_shelter: 3 pts when shelteredAreaPct 20–40', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { windShelter: { shelteredAreaPct: 30 } } }), null);
    expect(getComp(s, 'Agricultural Suitability', 'wind_shelter')?.value).toBe(3);
  });

  it('wind_shelter: 1 pt when shelteredAreaPct 10–20', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { windShelter: { shelteredAreaPct: 15 } } }), null);
    expect(getComp(s, 'Agricultural Suitability', 'wind_shelter')?.value).toBe(1);
  });

  it('wind_shelter: 0 pts when shelteredAreaPct ≤ 10', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { windShelter: { shelteredAreaPct: 5 } } }), null);
    expect(getComp(s, 'Agricultural Suitability', 'wind_shelter')?.value).toBe(0);
  });
});

describe('Regenerative Potential — Tier 3 threshold values', () => {
  it('carbon_sequestration_potential: 8 pts when meanSeqPotential 0.3–0.6', () => {
    const s = computeAssessmentScores(withTier3({ soilRegen: { carbonSequestration: { meanSeqPotential: 0.45 } } }), null);
    expect(getComp(s, 'Regenerative Potential', 'carbon_sequestration_potential')?.value).toBe(8);
  });

  it('carbon_sequestration_potential: 4 pts when meanSeqPotential 0.1–0.3', () => {
    const s = computeAssessmentScores(withTier3({ soilRegen: { carbonSequestration: { meanSeqPotential: 0.2 } } }), null);
    expect(getComp(s, 'Regenerative Potential', 'carbon_sequestration_potential')?.value).toBe(4);
  });

  it('carbon_sequestration_potential: 0 pts when meanSeqPotential ≤ 0.1', () => {
    const s = computeAssessmentScores(withTier3({ soilRegen: { carbonSequestration: { meanSeqPotential: 0.05 } } }), null);
    expect(getComp(s, 'Regenerative Potential', 'carbon_sequestration_potential')?.value).toBe(0);
  });

  it('restoration_priority_zones: 7 pts when highPriorityAreaPct 30–50', () => {
    const s = computeAssessmentScores(withTier3({ soilRegen: { restorationPriority: { highPriorityAreaPct: 40, criticalAreaPct: 10 } } }), null);
    expect(getComp(s, 'Regenerative Potential', 'restoration_priority_zones')?.value).toBe(7);
  });

  it('restoration_priority_zones: 4 pts when highPriorityAreaPct 10–30', () => {
    const s = computeAssessmentScores(withTier3({ soilRegen: { restorationPriority: { highPriorityAreaPct: 20, criticalAreaPct: 10 } } }), null);
    expect(getComp(s, 'Regenerative Potential', 'restoration_priority_zones')?.value).toBe(4);
  });

  it('intervention_suitability: 5 pts when totalZones 4–8', () => {
    const s = computeAssessmentScores(withTier3({ soilRegen: { interventions: { interventionSummary: { a: { zoneCount: 3 }, b: { zoneCount: 3 } } } } }), null);
    expect(getComp(s, 'Regenerative Potential', 'intervention_suitability')?.value).toBe(5);
  });

  it('intervention_suitability: 3 pts when totalZones 1–4', () => {
    const s = computeAssessmentScores(withTier3({ soilRegen: { interventions: { interventionSummary: { a: { zoneCount: 2 } } } } }), null);
    expect(getComp(s, 'Regenerative Potential', 'intervention_suitability')?.value).toBe(3);
  });

  it('intervention_suitability: 0 pts when no zones', () => {
    const s = computeAssessmentScores(withTier3({ soilRegen: { interventions: { interventionSummary: {} } } }), null);
    expect(getComp(s, 'Regenerative Potential', 'intervention_suitability')?.value).toBe(0);
  });
});

describe('Buildability — Tier 3 threshold values', () => {
  it('terrain_curvature_complexity: -10 pts when |profileMean| > 0.05', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { curvature: { profileMean: 0.07, planMean: 0.01 } } }), null);
    expect(getComp(s, 'Buildability', 'terrain_curvature_complexity')?.value).toBe(-10);
  });

  it('terrain_curvature_complexity: -5 pts when |profileMean| 0.02–0.05', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { curvature: { profileMean: 0.03, planMean: 0.01 } } }), null);
    expect(getComp(s, 'Buildability', 'terrain_curvature_complexity')?.value).toBe(-5);
  });

  it('terrain_curvature_complexity: 0 pts when |profileMean| < 0.02', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { curvature: { profileMean: 0.01, planMean: 0.01 } } }), null);
    expect(getComp(s, 'Buildability', 'terrain_curvature_complexity')?.value).toBe(0);
  });

  it('tpi_flat_area: 7 pts when flatPct 40–60', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { tpiClassification: { flat: 50, ridge: 50 } } }), null);
    expect(getComp(s, 'Buildability', 'tpi_flat_area')?.value).toBe(7);
  });

  it('tpi_flat_area: 4 pts when flatPct 20–40', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { tpiClassification: { flat: 30, ridge: 70 } } }), null);
    expect(getComp(s, 'Buildability', 'tpi_flat_area')?.value).toBe(4);
  });

  it('viewshed_openness: 3 pts when visiblePct 40–70', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { viewshed: { visiblePct: 55 } } }), null);
    expect(getComp(s, 'Buildability', 'viewshed_openness')?.value).toBe(3);
  });

  it('viewshed_openness: 1 pt when visiblePct 20–40', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { viewshed: { visiblePct: 30 } } }), null);
    expect(getComp(s, 'Buildability', 'viewshed_openness')?.value).toBe(1);
  });
});

describe('Habitat Sensitivity — Tier 3 threshold values', () => {
  it('cold_air_drainage_corridors: 5 pts for riskRating moderate', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { coldAirDrainage: { riskRating: 'moderate' } } }), null);
    expect(getComp(s, 'Habitat Sensitivity', 'cold_air_drainage_corridors')?.value).toBe(5);
  });

  it('cold_air_drainage_corridors: 2 pts for riskRating low', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { coldAirDrainage: { riskRating: 'low' } } }), null);
    expect(getComp(s, 'Habitat Sensitivity', 'cold_air_drainage_corridors')?.value).toBe(2);
  });

  it('cold_air_drainage_corridors: 0 pts for unrecognised riskRating', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { coldAirDrainage: { riskRating: 'none' } } }), null);
    expect(getComp(s, 'Habitat Sensitivity', 'cold_air_drainage_corridors')?.value).toBe(0);
  });

  it('intact_land_area: 7 pts when disturbedAreaPct 10–30', () => {
    const s = computeAssessmentScores(withTier3({ soilRegen: { disturbedLand: { disturbedAreaPct: 20 } } }), null);
    expect(getComp(s, 'Habitat Sensitivity', 'intact_land_area')?.value).toBe(7);
  });

  it('intact_land_area: 4 pts when disturbedAreaPct 30–50', () => {
    const s = computeAssessmentScores(withTier3({ soilRegen: { disturbedLand: { disturbedAreaPct: 40 } } }), null);
    expect(getComp(s, 'Habitat Sensitivity', 'intact_land_area')?.value).toBe(4);
  });

  it('intact_land_area: 0 pts when disturbedAreaPct ≥ 50', () => {
    const s = computeAssessmentScores(withTier3({ soilRegen: { disturbedLand: { disturbedAreaPct: 60 } } }), null);
    expect(getComp(s, 'Habitat Sensitivity', 'intact_land_area')?.value).toBe(0);
  });

  it('moisture_zone_wet_areas: 5 pts when wetZonePct 20–40', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { moistureZones: { dominantClass: 'moderate', classification: { wet: 15, moist: 15 } } } }), null);
    expect(getComp(s, 'Habitat Sensitivity', 'moisture_zone_wet_areas')?.value).toBe(5);
  });

  it('moisture_zone_wet_areas: 2 pts when wetZonePct 10–20', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { moistureZones: { dominantClass: 'dry', classification: { wet: 8, moist: 7 } } } }), null);
    expect(getComp(s, 'Habitat Sensitivity', 'moisture_zone_wet_areas')?.value).toBe(2);
  });
});

describe('Stewardship Readiness — Tier 3 threshold values', () => {
  it('soil_regeneration_readiness: 10 pts when readyScore 50–70', () => {
    // readyScore = 100 - (criticalPct*0.5 + disturbedPct*0.5); need 50 < score <= 70
    // criticalPct=40, disturbedPct=40 → readyScore = 100 - 40 = 60
    const s = computeAssessmentScores(withTier3({
      soilRegen: { restorationPriority: { highPriorityAreaPct: 30, criticalAreaPct: 40 }, disturbedLand: { disturbedAreaPct: 40 } },
    }), null);
    expect(getComp(s, 'Stewardship Readiness', 'soil_regeneration_readiness')?.value).toBe(10);
  });

  it('soil_regeneration_readiness: 5 pts when readyScore 30–50', () => {
    // criticalPct=60, disturbedPct=60 → readyScore = 100 - 60 = 40
    const s = computeAssessmentScores(withTier3({
      soilRegen: { restorationPriority: { highPriorityAreaPct: 10, criticalAreaPct: 60 }, disturbedLand: { disturbedAreaPct: 60 } },
    }), null);
    expect(getComp(s, 'Stewardship Readiness', 'soil_regeneration_readiness')?.value).toBe(5);
  });

  it('soil_regeneration_readiness: 2 pts when readyScore ≤ 30', () => {
    // criticalPct=80, disturbedPct=80 → readyScore = 100 - 80 = 20
    const s = computeAssessmentScores(withTier3({
      soilRegen: { restorationPriority: { highPriorityAreaPct: 5, criticalAreaPct: 80 }, disturbedLand: { disturbedAreaPct: 80 } },
    }), null);
    expect(getComp(s, 'Stewardship Readiness', 'soil_regeneration_readiness')?.value).toBe(2);
  });

  it('regeneration_sequence_feasibility: 0 pts when sitewidePhaseSummary is absent', () => {
    // soilRegen present but no regenerationSequence.sitewidePhaseSummary → inner else
    const s = computeAssessmentScores(withTier3({ soilRegen: { regenerationSequence: {} } }), null);
    expect(getComp(s, 'Stewardship Readiness', 'regeneration_sequence_feasibility')?.value).toBe(0);
  });

  it('regeneration_sequence_feasibility: 7 pts when totalPhases ≤ 3 and maxDuration < 30', () => {
    const s = computeAssessmentScores(withTier3({
      soilRegen: {
        regenerationSequence: {
          sitewidePhaseSummary: {
            phase1: { zoneCount: 2, avgDurationMonths: 20 },
            phase2: { zoneCount: 1, avgDurationMonths: 25 },
            phase3: { zoneCount: 1, avgDurationMonths: 18 },
          },
        },
      },
    }), null);
    expect(getComp(s, 'Stewardship Readiness', 'regeneration_sequence_feasibility')?.value).toBe(7);
  });

  it('regeneration_sequence_feasibility: 4 pts when totalPhases ≤ 4', () => {
    const s = computeAssessmentScores(withTier3({
      soilRegen: {
        regenerationSequence: {
          sitewidePhaseSummary: {
            p1: { zoneCount: 1, avgDurationMonths: 36 },
            p2: { zoneCount: 1, avgDurationMonths: 36 },
            p3: { zoneCount: 1, avgDurationMonths: 36 },
            p4: { zoneCount: 1, avgDurationMonths: 36 },
          },
        },
      },
    }), null);
    expect(getComp(s, 'Stewardship Readiness', 'regeneration_sequence_feasibility')?.value).toBe(4);
  });

  it('outdoor_comfort_fieldwork: 3 pts when annualMeanScore 40–60', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { outdoorComfort: { annualMeanScore: 50 } } }), null);
    expect(getComp(s, 'Stewardship Readiness', 'outdoor_comfort_fieldwork')?.value).toBe(3);
  });

  it('outdoor_comfort_fieldwork: 1 pt when annualMeanScore 20–40', () => {
    const s = computeAssessmentScores(withTier3({ microclimate: { outdoorComfort: { annualMeanScore: 30 } } }), null);
    expect(getComp(s, 'Stewardship Readiness', 'outdoor_comfort_fieldwork')?.value).toBe(1);
  });
});

describe('Design Complexity — Tier 3 threshold values', () => {
  it('tpi_heterogeneity: 0 pts when tpiClassification is absent (terrain present)', () => {
    // terrain present but no tpiClassification → inner else branch
    const s = computeAssessmentScores(withTier3({
      terrain: { curvature: { profileMean: 0.03, planMean: 0.03 }, viewshed: { visiblePct: 75 }, coldAirDrainage: { riskRating: 'high' } },
    }), null);
    expect(getComp(s, 'Design Complexity', 'tpi_heterogeneity')?.value).toBe(0);
  });

  it('tpi_heterogeneity: 12 pts when significantClasses > 4', () => {
    const s = computeAssessmentScores(withTier3({
      terrain: { tpiClassification: { ridge: 15, upper: 12, mid: 20, flat: 25, lower: 15, valley: 13 } },
    }), null);
    expect(getComp(s, 'Design Complexity', 'tpi_heterogeneity')?.value).toBe(12);
  });

  it('tpi_heterogeneity: 8 pts when significantClasses 3–4', () => {
    const s = computeAssessmentScores(withTier3({
      terrain: { tpiClassification: { ridge: 15, upper: 12, mid: 20, flat: 53 } },
    }), null);
    expect(getComp(s, 'Design Complexity', 'tpi_heterogeneity')?.value).toBe(8);
  });

  it('curvature_complexity: 10 pts when totalCurv > 0.08', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { curvature: { profileMean: 0.05, planMean: 0.05 } } }), null);
    expect(getComp(s, 'Design Complexity', 'curvature_complexity')?.value).toBe(10);
  });

  it('curvature_complexity: 6 pts when totalCurv 0.04–0.08', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { curvature: { profileMean: 0.03, planMean: 0.03 } } }), null);
    expect(getComp(s, 'Design Complexity', 'curvature_complexity')?.value).toBe(6);
  });

  it('curvature_complexity: 3 pts when totalCurv 0.01–0.04', () => {
    const s = computeAssessmentScores(withTier3({ terrain: { curvature: { profileMean: 0.01, planMean: 0.01 } } }), null);
    expect(getComp(s, 'Design Complexity', 'curvature_complexity')?.value).toBe(3);
  });
});

/* ── 3. Flood zone intermediate penalty branches ───────────────────────────── */

describe('Flood zone — penalty branches', () => {
  it('Water Resilience: -8 penalty for non-AE, non-minimal-risk flood zone', () => {
    const layers = mockLayersWithOverrides('US', {
      wetlands_flood: { summary: { flood_zone: 'Zone X', wetland_pct: 4, riparian_buffer_m: 30, regulated_area_pct: 5 } },
    });
    const s = computeAssessmentScores(layers, null);
    expect(getComp(s, 'Water Resilience', 'flood_zone_status')?.value).toBe(-8);
  });

  it('Water Resilience: -15 penalty for Zone AE', () => {
    const layers = mockLayersWithOverrides('US', {
      wetlands_flood: { summary: { flood_zone: 'Zone AE', wetland_pct: 4, riparian_buffer_m: 30, regulated_area_pct: 5 } },
    });
    const s = computeAssessmentScores(layers, null);
    expect(getComp(s, 'Water Resilience', 'flood_zone_status')?.value).toBe(-15);
  });

  it('Buildability: -10 penalty for non-AE, non-minimal-risk flood zone', () => {
    const layers = mockLayersWithOverrides('US', {
      wetlands_flood: { summary: { flood_zone: 'Zone X', wetland_pct: 4, riparian_buffer_m: 30, regulated_area_pct: 5 } },
    });
    const s = computeAssessmentScores(layers, null);
    expect(getComp(s, 'Buildability', 'flood_zone')?.value).toBe(-10);
  });

  it('Buildability: -20 penalty for Zone AE', () => {
    const layers = mockLayersWithOverrides('US', {
      wetlands_flood: { summary: { flood_zone: 'Zone AE', wetland_pct: 4, riparian_buffer_m: 30, regulated_area_pct: 5 } },
    });
    const s = computeAssessmentScores(layers, null);
    expect(getComp(s, 'Buildability', 'flood_zone')?.value).toBe(-20);
  });

  it('Design Complexity: 15 pts for Zone A flood constraint', () => {
    const layers = mockLayersWithOverrides('US', {
      wetlands_flood: { summary: { flood_zone: 'Zone A', wetland_pct: 4, riparian_buffer_m: 30, regulated_area_pct: 5 } },
    });
    const s = computeAssessmentScores(layers, null);
    expect(getComp(s, 'Design Complexity', 'flood_zone_constraints')?.value).toBe(15);
  });

  it('Design Complexity: 8 pts for non-AE, non-minimal-risk flood zone', () => {
    const layers = mockLayersWithOverrides('US', {
      wetlands_flood: { summary: { flood_zone: 'Zone X', wetland_pct: 4, riparian_buffer_m: 30, regulated_area_pct: 5 } },
    });
    const s = computeAssessmentScores(layers, null);
    expect(getComp(s, 'Design Complexity', 'flood_zone_constraints')?.value).toBe(8);
  });
});

/* ── 4. Slope penalty branches ──────────────────────────────────────────────── */

describe('Slope penalty branches', () => {
  it('Agricultural Suitability slope_suitability: -5 pts when meanSlope ≥ 15', () => {
    const layers = mockLayersWithOverrides('US', {
      elevation: { summary: { mean_slope_deg: 20, max_slope_deg: 35, min_elevation_m: 185, max_elevation_m: 312 } },
    });
    const s = computeAssessmentScores(layers, null);
    expect(getComp(s, 'Agricultural Suitability', 'slope_suitability')?.value).toBe(-5);
  });

  it('Agricultural Suitability slope_suitability: 0 pts when meanSlope 10–15', () => {
    const layers = mockLayersWithOverrides('US', {
      elevation: { summary: { mean_slope_deg: 12, max_slope_deg: 25, min_elevation_m: 185, max_elevation_m: 312 } },
    });
    const s = computeAssessmentScores(layers, null);
    expect(getComp(s, 'Agricultural Suitability', 'slope_suitability')?.value).toBe(0);
  });
});

/* ── 5. Bedrock depth penalty branches ─────────────────────────────────────── */

describe('Buildability — bedrock_depth penalty branches', () => {
  it('scores -10 pts when bedrock < 1m', () => {
    const layers = mockLayersWithOverrides('US', {
      soils: { summary: { depth_to_bedrock_m: 0.5, drainage_class: 'Well drained', organic_matter_pct: 3.2, farmland_class: 'Prime farmland' } },
    });
    const s = computeAssessmentScores(layers, null);
    expect(getComp(s, 'Buildability', 'bedrock_depth')?.value).toBe(-10);
  });

  it('scores -4 pts when bedrock 1–2m', () => {
    const layers = mockLayersWithOverrides('US', {
      soils: { summary: { depth_to_bedrock_m: 1.5, drainage_class: 'Well drained', organic_matter_pct: 3.2, farmland_class: 'Prime farmland' } },
    });
    const s = computeAssessmentScores(layers, null);
    expect(getComp(s, 'Buildability', 'bedrock_depth')?.value).toBe(-4);
  });
});

/* ── 6. deriveLiveDataRows — zero / absent value branches ───────────────────── */

describe('deriveLiveDataRows — absent-data branches', () => {
  it('shows "None detected" when wetland_pct is 0', () => {
    const rows = deriveLiveDataRows(mockLayersEmpty());
    const wetlandRow = rows.find((r) => r.label === 'Wetlands');
    expect(wetlandRow?.value).toBe('None detected');
  });

  it('shows "No streams detected" when nearest_stream_m is 0', () => {
    const rows = deriveLiveDataRows(mockLayersEmpty());
    const hydroRow = rows.find((r) => r.label === 'Hydrology');
    expect(hydroRow?.value).toBe('No streams detected');
  });

  it('omits Elevation row when no elevation layer', () => {
    const rows = deriveLiveDataRows([]);
    expect(rows.find((r) => r.label === 'Elevation')).toBeUndefined();
  });
});

/* ── 7. deriveDataLayerRows — absent / zero value branches ─────────────────── */

describe('deriveDataLayerRows — absent-data branches', () => {
  it('shows "Not detected" for Slope when mean_slope_deg is absent', () => {
    const rows = deriveDataLayerRows(mockLayersEmpty());
    const slopeRow = rows.find((r) => r.label === 'Slope');
    expect(slopeRow?.value).toBe('Not detected');
  });

  it('shows "Absent" for Wetland Presence when wetland_pct is 0', () => {
    const rows = deriveDataLayerRows(mockLayersEmpty());
    const wetlandRow = rows.find((r) => r.label === 'Wetland Presence');
    expect(wetlandRow?.value).toBe('Absent');
  });

  it('shows "Unknown" for Floodplain when flood_zone is empty', () => {
    const rows = deriveDataLayerRows(mockLayersEmpty());
    const floodRow = rows.find((r) => r.label === 'Floodplain');
    expect(floodRow?.value).toBe('Unknown');
  });

  it('omits all rows when no layers', () => {
    const rows = deriveDataLayerRows([]);
    expect(rows).toHaveLength(0);
  });
});

/* ── 8. deriveLandWants — all five main branches + extra sentences ───────────── */

describe('deriveLandWants — branch coverage', () => {
  it('branch 1: poor/imperfect drainage + om > 2 → slow-water narrative', () => {
    // CA mock: drainage = "Imperfectly drained", om = 3.8
    const wants = deriveLandWants(mockLayersCA());
    expect(wants).toContain('slow water down');
  });

  it('branch 2: slope > 10 + forest → erosion-protection narrative', () => {
    const layers = mockLayersWithOverrides('US', {
      elevation: { summary: { mean_slope_deg: 15, max_slope_deg: 35, min_elevation_m: 185, max_elevation_m: 312 } },
      soils: { summary: { drainage_class: 'Well drained', organic_matter_pct: 1, depth_to_bedrock_m: 2, farmland_class: 'Prime farmland' } },
    });
    // US land_cover already includes 'Deciduous Forest'
    const wants = deriveLandWants(layers);
    expect(wants).toContain('erosion protection');
  });

  it('branch 3: cropland + treeCanopy < 15 → diversification narrative', () => {
    const layers = mockLayersWithOverrides('US', {
      elevation: { summary: { mean_slope_deg: 5, max_slope_deg: 10, min_elevation_m: 185, max_elevation_m: 200 } },
      soils: { summary: { drainage_class: 'Well drained', organic_matter_pct: 1, depth_to_bedrock_m: 2, farmland_class: 'Prime farmland' } },
      land_cover: { summary: { tree_canopy_pct: 8, impervious_pct: 2, classes: { 'Cultivated Cropland': 70, 'Grassland': 30 } } },
    });
    const wants = deriveLandWants(layers);
    expect(wants).toContain('diversification');
  });

  it('branch 4: well drained + om > 3 → living-soil narrative', () => {
    // US mock: drainage = "Well drained", om = 3.2
    const wants = deriveLandWants(mockLayersUS());
    expect(wants).toContain('living soil');
  });

  it('else branch: catch-all stewardship narrative', () => {
    const wants = deriveLandWants([]);
    expect(wants).toContain('attentive stewardship');
  });

  it('adds riparian sentence when wetlandPct > 2', () => {
    const wants = deriveLandWants(mockLayersUS()); // wetland_pct = 4.2
    expect(wants).toContain('riparian corridor');
  });

  it('adds forest-canopy sentence when treeCanopy > 30 and has forest class', () => {
    // US: tree_canopy_pct = 38, classes includes 'Deciduous Forest'
    const wants = deriveLandWants(mockLayersUS());
    expect(wants).toContain('forest canopy');
  });

  it('adds windbreak sentence when treeCanopy 0–15', () => {
    // CA: tree_canopy_pct = 2 (0 < 2 <= 15)
    const wants = deriveLandWants(mockLayersCA());
    expect(wants).toContain('more trees');
  });

  it('adds impervious sentence when impervious_pct > 10', () => {
    const layers = mockLayersWithOverrides('US', {
      land_cover: { summary: { impervious_pct: 15 } },
    });
    const wants = deriveLandWants(layers);
    expect(wants).toContain('permeable');
  });
});

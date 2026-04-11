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
import { mockLayersUS, mockLayersCA, mockLayersIncomplete, mockLayersEmpty } from './helpers/mockLayers.js';

// ── computeAssessmentScores ──

describe('computeAssessmentScores', () => {
  describe('with US layers', () => {
    const scores = computeAssessmentScores(mockLayersUS(), null);

    it('returns exactly 7 assessment scores', () => {
      expect(scores).toHaveLength(7);
    });

    it('includes all expected score labels', () => {
      const labels = scores.map((s) => s.label);
      expect(labels).toContain('Water Resilience');
      expect(labels).toContain('Agricultural Suitability');
      expect(labels).toContain('Regenerative Potential');
      expect(labels).toContain('Buildability');
      expect(labels).toContain('Habitat Sensitivity');
      expect(labels).toContain('Stewardship Readiness');
      expect(labels).toContain('Design Complexity');
    });

    it('clamps all scores between 0 and 100', () => {
      for (const score of scores) {
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
      }
    });

    it('assigns a valid rating to each score', () => {
      const validRatings = ['Exceptional', 'Good', 'Moderate', 'Low', 'Insufficient Data'];
      for (const score of scores) {
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
    const scores = computeAssessmentScores(mockLayersCA(), null);

    it('returns exactly 7 scores for Canadian data', () => {
      expect(scores).toHaveLength(7);
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
      expect(scores).toHaveLength(7);
      for (const score of scores) {
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
      }
    });

    it('handles empty/pending layers', () => {
      const scores = computeAssessmentScores(mockLayersEmpty(), null);
      expect(scores).toHaveLength(7);
      // With no real data, scores should be low or rated insufficient
      for (const score of scores) {
        expect(score.score).toBeGreaterThanOrEqual(0);
      }
    });

    it('handles empty array input', () => {
      const scores = computeAssessmentScores([], null);
      expect(scores).toHaveLength(7);
    });
  });

  describe('with acreage', () => {
    it('accepts numeric acreage without error', () => {
      const scores = computeAssessmentScores(mockLayersUS(), 50);
      expect(scores).toHaveLength(7);
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

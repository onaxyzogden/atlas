/**
 * visionFit.ts — comprehensive tests for vision-to-land fit analysis.
 * Target: 100% coverage on 176-line module.
 */

import { describe, it, expect } from 'vitest';
import {
  computeVisionFit,
  fitStatusLabel,
  projectTypeLabel,
  PROJECT_TYPES,
} from '../lib/visionFit.js';
import type { ScoredResult } from '../lib/computeScores.js';

// ── Helper: build a minimal ScoredResult for a given label + score ──

function scoredResult(label: string, score: number, confidence: 'high' | 'medium' | 'low' = 'high'): ScoredResult {
  return {
    label,
    score,
    rating: score >= 85 ? 'Exceptional' : score >= 65 ? 'Good' : score >= 40 ? 'Moderate' : 'Low',
    confidence,
    dataSources: ['test'],
    computedAt: new Date().toISOString(),
    score_breakdown: [],
  };
}

/** Build a full set of 7 assessment scores with the same value */
function fullScores(value: number): ScoredResult[] {
  return [
    scoredResult('Water Resilience', value),
    scoredResult('Agricultural Suitability', value),
    scoredResult('Regenerative Potential', value),
    scoredResult('Buildability', value),
    scoredResult('Habitat Sensitivity', value),
    scoredResult('Stewardship Readiness', value),
    scoredResult('Design Complexity', value),
  ];
}

// ── Tests ──

describe('computeVisionFit', () => {
  it('returns empty array for null project type', () => {
    expect(computeVisionFit(null, fullScores(80))).toEqual([]);
  });

  it('returns empty array for unknown project type', () => {
    expect(computeVisionFit('unknown_type', fullScores(80))).toEqual([]);
  });

  describe('status resolution: strong / moderate / challenge', () => {
    it('returns "strong" when actual >= threshold + 15', () => {
      // regenerative_farm requires Agricultural Suitability >= 55
      // Score 80: 80 >= 55 + 15 = 70 → strong
      const results = computeVisionFit('regenerative_farm', fullScores(80));
      const agri = results.find((r) => r.scoreName === 'Agricultural Suitability');
      expect(agri?.status).toBe('strong');
    });

    it('returns "moderate" when actual >= threshold - 10 but < threshold + 15', () => {
      // regenerative_farm requires Agricultural Suitability >= 55
      // Score 60: 60 >= 55 - 10 = 45 ✓ but 60 < 55 + 15 = 70 ✗ → moderate
      const results = computeVisionFit('regenerative_farm', fullScores(60));
      const agri = results.find((r) => r.scoreName === 'Agricultural Suitability');
      expect(agri?.status).toBe('moderate');
    });

    it('returns "challenge" when actual < threshold - 10', () => {
      // regenerative_farm requires Agricultural Suitability >= 55
      // Score 20: 20 < 55 - 10 = 45 → challenge
      const results = computeVisionFit('regenerative_farm', fullScores(20));
      const agri = results.find((r) => r.scoreName === 'Agricultural Suitability');
      expect(agri?.status).toBe('challenge');
    });
  });

  describe('inverted scoring for Design Complexity', () => {
    it('high Design Complexity score → challenge for retreat_center', () => {
      // retreat_center: Design Complexity threshold=50, inverted=true
      // Score 90: inverted = 100 - 90 = 10, 10 < 50 - 10 = 40 → challenge
      const scores = fullScores(90);
      const results = computeVisionFit('retreat_center', scores);
      const dc = results.find((r) => r.scoreName === 'Design Complexity');
      expect(dc?.status).toBe('challenge');
    });

    it('low Design Complexity score → strong for retreat_center', () => {
      // Score 30: inverted = 100 - 30 = 70, 70 >= 50 + 15 = 65 → strong
      const scores = fullScores(30);
      const results = computeVisionFit('retreat_center', scores);
      const dc = results.find((r) => r.scoreName === 'Design Complexity');
      expect(dc?.status).toBe('strong');
    });

    it('actual field still stores the non-inverted score', () => {
      const scores = fullScores(40);
      const results = computeVisionFit('retreat_center', scores);
      const dc = results.find((r) => r.scoreName === 'Design Complexity');
      expect(dc?.actual).toBe(40);
    });
  });

  describe('weight sorting', () => {
    it('sorts results: critical → important → supportive', () => {
      const results = computeVisionFit('regenerative_farm', fullScores(70));
      expect(results.length).toBeGreaterThanOrEqual(3);

      const weights = results.map((r) => r.weight);
      const criticalIdx = weights.indexOf('critical');
      const importantIdx = weights.indexOf('important');
      const supportiveIdx = weights.indexOf('supportive');

      if (criticalIdx >= 0 && importantIdx >= 0) {
        expect(criticalIdx).toBeLessThan(importantIdx);
      }
      if (importantIdx >= 0 && supportiveIdx >= 0) {
        expect(importantIdx).toBeLessThan(supportiveIdx);
      }
    });
  });

  describe('all 7 project types produce results', () => {
    for (const type of PROJECT_TYPES) {
      it(`${type} produces non-empty results`, () => {
        const results = computeVisionFit(type, fullScores(60));
        expect(results.length).toBeGreaterThan(0);
      });
    }
  });

  it('skips requirements for scores not present in the input', () => {
    // Only provide one score — requirements for other scores are skipped
    const results = computeVisionFit('regenerative_farm', [
      scoredResult('Agricultural Suitability', 80),
    ]);
    expect(results.length).toBe(1);
    expect(results[0]!.scoreName).toBe('Agricultural Suitability');
  });

  it('propagates confidence from ScoredResult', () => {
    const scores = [scoredResult('Buildability', 80, 'low')];
    const results = computeVisionFit('homestead', scores);
    const build = results.find((r) => r.scoreName === 'Buildability');
    expect(build?.confidence).toBe('low');
  });
});

describe('fitStatusLabel', () => {
  it('returns correct labels', () => {
    expect(fitStatusLabel('strong')).toBe('Supports vision');
    expect(fitStatusLabel('moderate')).toBe('Workable');
    expect(fitStatusLabel('challenge')).toBe('Needs attention');
  });
});

describe('projectTypeLabel', () => {
  it('returns human-readable labels for all 7 types', () => {
    expect(projectTypeLabel('regenerative_farm')).toBe('Regenerative Farm');
    expect(projectTypeLabel('retreat_center')).toBe('Retreat Center');
    expect(projectTypeLabel('homestead')).toBe('Homestead');
    expect(projectTypeLabel('educational_farm')).toBe('Educational Farm');
    expect(projectTypeLabel('conservation')).toBe('Conservation');
    expect(projectTypeLabel('multi_enterprise')).toBe('Multi-Enterprise');
    expect(projectTypeLabel('moontrance')).toBe('Moontrance');
  });

  it('returns the raw string for unknown types', () => {
    expect(projectTypeLabel('something_unknown')).toBe('something_unknown');
  });
});

describe('PROJECT_TYPES', () => {
  it('contains exactly 7 entries', () => {
    expect(PROJECT_TYPES).toHaveLength(7);
  });

  it('is a readonly tuple', () => {
    expect(PROJECT_TYPES).toContain('regenerative_farm');
    expect(PROJECT_TYPES).toContain('moontrance');
  });
});

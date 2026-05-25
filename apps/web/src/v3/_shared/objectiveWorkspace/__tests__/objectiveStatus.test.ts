import { describe, expect, it } from 'vitest';
import {
  OBJECTIVE_STATUS_LABEL,
  progressFromChecks,
  statusFromPct,
} from '../objectiveStatus.js';

describe('statusFromPct', () => {
  it('maps 0 to not-started', () => {
    expect(statusFromPct(0)).toBe('not-started');
  });
  it('treats negatives as not-started', () => {
    expect(statusFromPct(-10)).toBe('not-started');
  });
  it('maps an in-between value to in-progress', () => {
    expect(statusFromPct(1)).toBe('in-progress');
    expect(statusFromPct(50)).toBe('in-progress');
    expect(statusFromPct(99)).toBe('in-progress');
  });
  it('maps 100 (and over) to complete', () => {
    expect(statusFromPct(100)).toBe('complete');
    expect(statusFromPct(150)).toBe('complete');
  });
  it('has a label for every status', () => {
    expect(OBJECTIVE_STATUS_LABEL['not-started']).toBeTruthy();
    expect(OBJECTIVE_STATUS_LABEL['in-progress']).toBeTruthy();
    expect(OBJECTIVE_STATUS_LABEL.complete).toBeTruthy();
  });
});

describe('progressFromChecks', () => {
  it('returns zeroed progress when total is 0', () => {
    expect(progressFromChecks([], 0)).toEqual({ verified: 0, total: 0, pct: 0 });
    expect(progressFromChecks([0, 1], 0)).toEqual({
      verified: 0,
      total: 0,
      pct: 0,
    });
  });
  it('computes a rounded percentage', () => {
    expect(progressFromChecks([0], 3)).toEqual({
      verified: 1,
      total: 3,
      pct: 33,
    });
    expect(progressFromChecks([0, 1], 3)).toEqual({
      verified: 2,
      total: 3,
      pct: 67,
    });
  });
  it('reports 100% when all steps are checked', () => {
    expect(progressFromChecks([0, 1, 2], 3)).toEqual({
      verified: 3,
      total: 3,
      pct: 100,
    });
  });
  it('ignores out-of-range and duplicate indices (never exceeds 100%)', () => {
    expect(progressFromChecks([0, 0, 1, 5, -1, 2], 3)).toEqual({
      verified: 3,
      total: 3,
      pct: 100,
    });
  });
  it('ignores non-integer indices', () => {
    expect(progressFromChecks([0.5, 1.2, 0], 2)).toEqual({
      verified: 1,
      total: 2,
      pct: 50,
    });
  });
});

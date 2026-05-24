import { describe, it, expect } from 'vitest';
import {
  isVerified,
  resolveNodeStates,
  objectiveProgress,
  aggregateProgress,
  type RawEvidenceMap,
} from '../compassGating.js';

const NONE: readonly number[] = [];

describe('isVerified', () => {
  it('is true when the raw map marks the node verified', () => {
    expect(isVerified({ 0: 'verified' }, NONE, 0)).toBe(true);
  });

  it('is true when the steward checked the step in the map', () => {
    expect(isVerified({}, [2], 2)).toBe(true);
  });

  it('is false for evidence-in (logged but not verified)', () => {
    expect(isVerified({ 0: 'evidence-in' }, NONE, 0)).toBe(false);
  });

  it('is false when neither source marks it', () => {
    expect(isVerified({}, NONE, 0)).toBe(false);
  });
});

describe('resolveNodeStates', () => {
  it('opens node 0 even with no evidence', () => {
    expect(resolveNodeStates(3, {}, NONE)).toEqual(['open', 'locked', 'locked']);
  });

  it('locks a node until its predecessor is verified', () => {
    const raw: RawEvidenceMap = { 0: 'verified' };
    expect(resolveNodeStates(3, raw, NONE)).toEqual([
      'verified',
      'open',
      'locked',
    ]);
  });

  it('shows evidence-in on an unlocked node that has evidence logged', () => {
    const raw: RawEvidenceMap = { 0: 'verified', 1: 'evidence-in' };
    expect(resolveNodeStates(3, raw, NONE)).toEqual([
      'verified',
      'evidence-in',
      'locked',
    ]);
  });

  it('treats a checked step as verified even out of sequence', () => {
    // node 2 checked in the map, but node 1 is not verified → node 2 still
    // reads verified (a checked step can land out of order), node 1 stays open.
    expect(resolveNodeStates(3, { 0: 'verified' }, [2])).toEqual([
      'verified',
      'open',
      'verified',
    ]);
  });

  it('unions compass-verified and map-checked sources', () => {
    expect(resolveNodeStates(2, { 0: 'verified' }, [1])).toEqual([
      'verified',
      'verified',
    ]);
  });
});

describe('objectiveProgress', () => {
  it('counts verified nodes from both sources and rounds pct', () => {
    expect(objectiveProgress(3, { 0: 'verified' }, [1])).toEqual({
      verified: 2,
      total: 3,
      pct: 67,
    });
  });

  it('does not count evidence-in as verified', () => {
    expect(objectiveProgress(2, { 0: 'evidence-in' }, NONE)).toEqual({
      verified: 0,
      total: 2,
      pct: 0,
    });
  });

  it('handles a zero-node objective without dividing by zero', () => {
    expect(objectiveProgress(0, {}, NONE)).toEqual({
      verified: 0,
      total: 0,
      pct: 0,
    });
  });

  it('reports 100% when every node is verified', () => {
    expect(objectiveProgress(2, { 0: 'verified', 1: 'verified' }, NONE)).toEqual(
      { verified: 2, total: 2, pct: 100 },
    );
  });
});

describe('aggregateProgress', () => {
  it('sums verified and total across objectives', () => {
    const parts = [
      { verified: 2, total: 3, pct: 67 },
      { verified: 1, total: 2, pct: 50 },
    ];
    expect(aggregateProgress(parts)).toEqual({ verified: 3, total: 5, pct: 60 });
  });

  it('returns 0% for an empty set', () => {
    expect(aggregateProgress([])).toEqual({ verified: 0, total: 0, pct: 0 });
  });
});

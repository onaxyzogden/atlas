import { describe, it, expect } from 'vitest';
import {
  isVerified,
  resolveNodeStates,
  objectiveProgress,
  aggregateProgress,
  type RawEvidenceMap,
} from '../compassGating.js';
// NOTE: planCompassConfig is intentionally NOT imported here — it pulls in
// PlanChecklistAside.tsx, whose transitive store chain (waterSystemsStore →
// persistRehydrate) runs a top-level rehydrate that throws under vitest. The
// Plan gating is exercised through its store seed instead; the Act config is
// data-only and safe to import directly.
import { planSeedFor } from '../../../store/planCompassStore.js';
import {
  ACT_COMPASS_OBJECTIVES,
  actObjectiveById,
} from '../../act/compass/actCompassConfig.js';
import { actSeedFor } from '../../../store/actCompassStore.js';

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

describe('Plan compass seed', () => {
  it('resolves the goal-compass seed (2 verified, 1 evidence-in)', () => {
    const seed = planSeedFor('goal-compass'); // { 0: verified, 1: verified, 2: evidence-in }
    expect(seed).toEqual({ 0: 'verified', 1: 'verified', 2: 'evidence-in' });
    // Against a 3+ node objective the first three nodes resolve in order.
    const states = resolveNodeStates(3, seed, NONE);
    expect(states).toEqual(['verified', 'verified', 'evidence-in']);
    expect(objectiveProgress(3, seed, NONE).verified).toBe(2);
  });

  it('returns an empty seed for an unstarted Plan module (machinery)', () => {
    const seed = planSeedFor('machinery'); // {}
    expect(seed).toEqual({});
    expect(resolveNodeStates(2, seed, NONE)).toEqual(['open', 'locked']);
  });
});

describe('Act compass config + seed', () => {
  it('builds one objective per Act module with full metadata', () => {
    expect(ACT_COMPASS_OBJECTIVES).toHaveLength(8);
    ACT_COMPASS_OBJECTIVES.forEach((o, i) => {
      expect(o.ordinal).toBe(i + 1);
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.accent).toMatch(/^#/);
      expect(o.icon).toBeTruthy(); // lucide icon (forwardRef component)
      expect(o.nodes.length).toBeGreaterThan(0);
      expect(o.pitfall && o.pitfall.length).toBeGreaterThan(0);
      o.nodes.forEach((n, idx) => expect(n.index).toBe(idx));
    });
  });

  it('resolves the tracker seed against its node count', () => {
    const obj = actObjectiveById('tracker');
    const seed = actSeedFor('tracker'); // { 0: verified, 1: verified, 2: evidence-in }
    const progress = objectiveProgress(obj.nodes.length, seed, NONE);
    expect(progress.verified).toBe(2);
    expect(progress.total).toBe(obj.nodes.length);
    const states = resolveNodeStates(obj.nodes.length, seed, NONE);
    expect(states[0]).toBe('verified');
    expect(states[1]).toBe('verified');
    expect(states[2]).toBe('evidence-in');
  });

  it('locks every node for an unstarted Act module (review)', () => {
    const obj = actObjectiveById('review');
    const seed = actSeedFor('review'); // {}
    const states = resolveNodeStates(obj.nodes.length, seed, NONE);
    expect(states[0]).toBe('open');
    states.slice(1).forEach((s) => expect(s).toBe('locked'));
    expect(objectiveProgress(obj.nodes.length, seed, NONE).verified).toBe(0);
  });
});

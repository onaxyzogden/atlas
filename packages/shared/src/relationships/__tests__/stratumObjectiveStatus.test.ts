import { describe, it, expect } from 'vitest';
import {
  computeObjectiveStatus,
  computeAllObjectiveStatuses,
} from '../stratumObjectiveStatus.js';
import type { PlanStratumObjective } from '../../schemas/plan/planStratumObjective.schema.js';
import { obj, ck } from '../../constants/plan/catalogues/authoring.js';

// A minimal two-objective chain: B requires A. A carries one required item.
function makeA(): PlanStratumObjective {
  return obj({
    id: 'a',
    stratumId: 's1-project-foundation',
    title: 'A',
    focusedQuestion: 'A?',
    checklist: [ck('a-1', 'do a')],
    completionGate: 'gate a',
    actHandoff: 'handoff a',
    source: 'universal',
    ref: 'U-S1.1',
  });
}

function makeB(): PlanStratumObjective {
  return {
    ...obj({
      id: 'b',
      stratumId: 's2-land-reading',
      title: 'B',
      focusedQuestion: 'B?',
      checklist: [ck('b-1', 'do b')],
      completionGate: 'gate b',
      actHandoff: 'handoff b',
      source: 'universal',
      ref: 'U-S2.1',
    }),
    prerequisiteObjectiveIds: ['a'],
  };
}

describe('computeObjectiveStatus - deferred override', () => {
  const a = makeA();

  it('returns deferred when the objective id is in deferredIds, regardless of progress', () => {
    // Even with the required item checked (would be `complete`), defer wins.
    const deferred = new Set(['a']);
    expect(computeObjectiveStatus(a, { 'a-1': true }, {}, deferred)).toBe(
      'deferred',
    );
  });

  it('is backward-compatible: omitting deferredIds preserves 4-state behaviour', () => {
    expect(computeObjectiveStatus(a, {}, {})).toBe('available');
    expect(computeObjectiveStatus(a, { 'a-1': true }, {})).toBe('complete');
  });
});

describe('computeAllObjectiveStatuses - deferred', () => {
  const a = makeA();
  const b = makeB();

  it('marks a deferred objective deferred and keeps its dependents locked', () => {
    // A is complete by progress, B would be available — but A is deferred, so
    // B must NOT unlock (a deferred prereq is treated as not-complete).
    const statuses = computeAllObjectiveStatuses(
      [a, b],
      { 'a-1': true },
      new Set(['a']),
    );
    expect(statuses['a']).toBe('deferred');
    expect(statuses['b']).toBe('locked');
  });

  it('without defer, completing A unlocks B (sanity / contrast)', () => {
    const statuses = computeAllObjectiveStatuses([a, b], { 'a-1': true });
    expect(statuses['a']).toBe('complete');
    expect(statuses['b']).toBe('available');
  });

  it('defers an objective even when its own prereq is unresolved (override is eager)', () => {
    // B is deferred; A is not complete (no progress) so normally B would be
    // locked, but the explicit defer override wins.
    const statuses = computeAllObjectiveStatuses([a, b], {}, new Set(['b']));
    expect(statuses['b']).toBe('deferred');
  });
});

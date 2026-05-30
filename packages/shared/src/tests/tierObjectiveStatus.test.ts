import { describe, it, expect } from 'vitest';
import {
  computeObjectiveStatus,
  computeAllObjectiveStatuses,
} from '../relationships/tierObjectiveStatus.js';
import {
  computeStratumState,
  computeAllStratumStates,
} from '../relationships/tierState.js';
import {
  isCyclicalReviewDue,
  CYCLICAL_REVIEW_DEFAULT_DAYS,
} from '../relationships/cyclicalReviewTrigger.js';
import {
  PLAN_STRATA,
  PLAN_STRATUM_OBJECTIVES,
  getObjectivesForStratum,
  findPlanStratumObjective,
} from '../constants/plan/tierObjectives.js';
import type { PlanStratumObjective } from '../schemas/plan/planTierObjective.schema.js';

const mkObjective = (
  overrides: Partial<PlanStratumObjective> & Pick<PlanStratumObjective, 'id' | 'stratumId'>,
): PlanStratumObjective => ({
  title: 'Test',
  focusedQuestion: 'Test?',
  prerequisiteObjectiveIds: [],
  defaultOverlayBundle: [],
  checklist: [],
  outputKind: 'plan-decision-record',
  ...overrides,
});

describe('PLAN_STRATA seed', () => {
  it('has exactly 7 tiers in ordinal order 0..6', () => {
    expect(PLAN_STRATA).toHaveLength(7);
    PLAN_STRATA.forEach((tier, idx) => {
      expect(tier.ordinal).toBe(idx);
    });
  });

  it('exposes every tier id distinctly', () => {
    const ids = new Set(PLAN_STRATA.map((t) => t.id));
    expect(ids.size).toBe(PLAN_STRATA.length);
  });
});

describe('PLAN_STRATUM_OBJECTIVES seed', () => {
  it('binds every objective to a known tier id', () => {
    const stratumIds = new Set(PLAN_STRATA.map((t) => t.id));
    for (const obj of PLAN_STRATUM_OBJECTIVES) {
      expect(stratumIds.has(obj.stratumId)).toBe(true);
    }
  });

  it('only references prereq objective ids that exist in the seed', () => {
    const objIds = new Set(PLAN_STRATUM_OBJECTIVES.map((o) => o.id));
    for (const obj of PLAN_STRATUM_OBJECTIVES) {
      for (const prereq of obj.prerequisiteObjectiveIds) {
        expect(objIds.has(prereq)).toBe(true);
      }
    }
  });

  it('lookup helpers resolve canonical entries', () => {
    expect(findPlanStratumObjective('s1-vision')?.stratumId).toBe(
      's1-project-foundation',
    );
    expect(getObjectivesForStratum('s1-project-foundation').length).toBe(2);
    expect(findPlanStratumObjective('nope')).toBeUndefined();
  });
});

describe('computeObjectiveStatus', () => {
  const objWith2Required = mkObjective({
    id: 'a',
    stratumId: 's2-land-reading',
    checklist: [
      { id: 'a1', label: 'A1', feedsInto: [], optional: false },
      { id: 'a2', label: 'A2', feedsInto: [], optional: false },
    ],
  });

  it('returns locked when any prereq is not complete', () => {
    const obj = mkObjective({
      id: 'b',
      stratumId: 's2-land-reading',
      prerequisiteObjectiveIds: ['a'],
    });
    expect(computeObjectiveStatus(obj, {}, { a: 'available' })).toBe('locked');
    expect(computeObjectiveStatus(obj, {}, { a: 'active' })).toBe('locked');
    expect(computeObjectiveStatus(obj, {}, {})).toBe('locked');
  });

  it('returns available when prereqs satisfied + no checklist items checked', () => {
    expect(computeObjectiveStatus(objWith2Required, {}, {})).toBe('available');
  });

  it('returns active when some required items checked', () => {
    expect(
      computeObjectiveStatus(objWith2Required, { a1: true }, {}),
    ).toBe('active');
  });

  it('returns complete when every required item checked', () => {
    expect(
      computeObjectiveStatus(
        objWith2Required,
        { a1: true, a2: true },
        {},
      ),
    ).toBe('complete');
  });

  it('treats objectives with no required items as complete once prereqs met', () => {
    const obj = mkObjective({
      id: 'opt',
      stratumId: 's2-land-reading',
      checklist: [
        { id: 'opt-1', label: 'O', feedsInto: [], optional: true },
      ],
    });
    expect(computeObjectiveStatus(obj, {}, {})).toBe('complete');
  });

  it('ignores optional items when judging completion', () => {
    const obj = mkObjective({
      id: 'mix',
      stratumId: 's2-land-reading',
      checklist: [
        { id: 'r', label: 'R', feedsInto: [], optional: false },
        { id: 'o', label: 'O', feedsInto: [], optional: true },
      ],
    });
    expect(computeObjectiveStatus(obj, { r: true }, {})).toBe('complete');
  });
});

describe('computeAllObjectiveStatuses', () => {
  it('propagates completion through a prereq chain', () => {
    const a = mkObjective({
      id: 'a',
      stratumId: 's1-project-foundation',
      checklist: [{ id: 'a1', label: 'A1', feedsInto: [], optional: false }],
    });
    const b = mkObjective({
      id: 'b',
      stratumId: 's2-land-reading',
      prerequisiteObjectiveIds: ['a'],
      checklist: [{ id: 'b1', label: 'B1', feedsInto: [], optional: false }],
    });
    const c = mkObjective({
      id: 'c',
      stratumId: 's3-systems-reading',
      prerequisiteObjectiveIds: ['b'],
    });

    const initial = computeAllObjectiveStatuses([a, b, c], {});
    expect(initial).toEqual({
      a: 'available',
      b: 'locked',
      c: 'locked',
    });

    const aDone = computeAllObjectiveStatuses([a, b, c], { a1: true });
    expect(aDone).toEqual({
      a: 'complete',
      b: 'available',
      c: 'locked',
    });

    const bDone = computeAllObjectiveStatuses([a, b, c], {
      a1: true,
      b1: true,
    });
    // c has no checklist items -> complete by default once unlocked
    expect(bDone).toEqual({
      a: 'complete',
      b: 'complete',
      c: 'complete',
    });
  });

  it('handles parallel objectives sharing no prereq order', () => {
    const v = mkObjective({
      id: 'v',
      stratumId: 's1-project-foundation',
      parallelGroupId: 'g',
      checklist: [{ id: 'v1', label: 'V', feedsInto: [], optional: false }],
    });
    const s = mkObjective({
      id: 's',
      stratumId: 's1-project-foundation',
      parallelGroupId: 'g',
      checklist: [{ id: 's1', label: 'S', feedsInto: [], optional: false }],
    });
    const next = mkObjective({
      id: 'next',
      stratumId: 's2-land-reading',
      prerequisiteObjectiveIds: ['v', 's'],
    });

    const statuses = computeAllObjectiveStatuses([v, s, next], {});
    expect(statuses).toEqual({
      v: 'available',
      s: 'available',
      next: 'locked',
    });
  });

  it('the shipped seed produces only T0 objectives as available when empty', () => {
    const statuses = computeAllObjectiveStatuses(PLAN_STRATUM_OBJECTIVES, {});
    expect(statuses['s1-vision']).toBe('available');
    expect(statuses['s1-stewardship']).toBe('available');
    expect(statuses['s2-land-baseline']).toBe('locked');
    expect(statuses['s7-phasing']).toBe('locked');
  });
});

describe('computeStratumState', () => {
  it('marks tier complete when every objective is complete', () => {
    expect(
      computeStratumState(
        's1-project-foundation',
        PLAN_STRATUM_OBJECTIVES,
        { 's1-vision': 'complete', 's1-stewardship': 'complete' },
      ),
    ).toBe('complete');
  });

  it('marks tier active when any objective is active', () => {
    expect(
      computeStratumState(
        's1-project-foundation',
        PLAN_STRATUM_OBJECTIVES,
        { 's1-vision': 'active', 's1-stewardship': 'available' },
      ),
    ).toBe('active');
  });

  it('marks tier available when no objectives are active but at least one is available', () => {
    expect(
      computeStratumState(
        's1-project-foundation',
        PLAN_STRATUM_OBJECTIVES,
        { 's1-vision': 'available', 's1-stewardship': 'available' },
      ),
    ).toBe('available');
  });

  it('marks tier locked when every objective is locked', () => {
    expect(
      computeStratumState(
        's2-land-reading',
        PLAN_STRATUM_OBJECTIVES,
        { 's2-land-baseline': 'locked' },
      ),
    ).toBe('locked');
  });

  it('rolls up all 7 tiers in one pass against the empty-progress seed', () => {
    const statuses = computeAllObjectiveStatuses(PLAN_STRATUM_OBJECTIVES, {});
    const tierStates = computeAllStratumStates(
      PLAN_STRATA.map((t) => t.id),
      PLAN_STRATUM_OBJECTIVES,
      statuses,
    );
    expect(tierStates['s1-project-foundation']).toBe('available');
    expect(tierStates['s2-land-reading']).toBe('locked');
    expect(tierStates['s7-phasing-resourcing']).toBe('locked');
  });
});

describe('isCyclicalReviewDue', () => {
  const objective = findPlanStratumObjective('s1-vision');
  if (!objective) throw new Error('seed missing s1-vision');
  const now = Date.UTC(2026, 5, 1); // 2026-06-01

  it('returns false when status is not complete', () => {
    expect(
      isCyclicalReviewDue({
        objective,
        currentStatus: 'active',
        lastReviewedAt: '2026-01-01T00:00:00Z',
        now,
      }),
    ).toBe(false);
  });

  it('returns false when completed but never reviewed yet', () => {
    expect(
      isCyclicalReviewDue({
        objective,
        currentStatus: 'complete',
        lastReviewedAt: null,
        now,
      }),
    ).toBe(false);
  });

  it('returns false within the 90-day window', () => {
    const lastReviewed = new Date(
      now - (CYCLICAL_REVIEW_DEFAULT_DAYS - 1) * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(
      isCyclicalReviewDue({
        objective,
        currentStatus: 'complete',
        lastReviewedAt: lastReviewed,
        now,
      }),
    ).toBe(false);
  });

  it('returns true after the 90-day window', () => {
    const lastReviewed = new Date(
      now - (CYCLICAL_REVIEW_DEFAULT_DAYS + 1) * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(
      isCyclicalReviewDue({
        objective,
        currentStatus: 'complete',
        lastReviewedAt: lastReviewed,
        now,
      }),
    ).toBe(true);
  });

  it('returns true when the observe revision flag is set', () => {
    expect(
      isCyclicalReviewDue({
        objective,
        currentStatus: 'complete',
        lastReviewedAt: '2026-05-01T00:00:00Z',
        now,
        observeRevisionFlag: (id) => id === objective.id,
      }),
    ).toBe(true);
  });

  it('respects a custom reviewIntervalDays', () => {
    const sixDaysAgo = new Date(
      now - 6 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(
      isCyclicalReviewDue({
        objective,
        currentStatus: 'complete',
        lastReviewedAt: sixDaysAgo,
        now,
        reviewIntervalDays: 5,
      }),
    ).toBe(true);
  });
});

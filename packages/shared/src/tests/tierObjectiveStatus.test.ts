import { describe, it, expect } from 'vitest';
import {
  computeObjectiveStatus,
  computeAllObjectiveStatuses,
} from '../relationships/tierObjectiveStatus.js';
import {
  computeTierState,
  computeAllTierStates,
} from '../relationships/tierState.js';
import {
  isCyclicalReviewDue,
  CYCLICAL_REVIEW_DEFAULT_DAYS,
} from '../relationships/cyclicalReviewTrigger.js';
import {
  PLAN_TIERS,
  PLAN_TIER_OBJECTIVES,
  getObjectivesForTier,
  findPlanTierObjective,
} from '../constants/plan/tierObjectives.js';
import type { PlanTierObjective } from '../schemas/plan/planTierObjective.schema.js';

const mkObjective = (
  overrides: Partial<PlanTierObjective> & Pick<PlanTierObjective, 'id' | 'tierId'>,
): PlanTierObjective => ({
  title: 'Test',
  focusedQuestion: 'Test?',
  prerequisiteObjectiveIds: [],
  defaultOverlayBundle: [],
  checklist: [],
  outputKind: 'plan-decision-record',
  ...overrides,
});

describe('PLAN_TIERS seed', () => {
  it('has exactly 7 tiers in ordinal order 0..6', () => {
    expect(PLAN_TIERS).toHaveLength(7);
    PLAN_TIERS.forEach((tier, idx) => {
      expect(tier.ordinal).toBe(idx);
    });
  });

  it('exposes every tier id distinctly', () => {
    const ids = new Set(PLAN_TIERS.map((t) => t.id));
    expect(ids.size).toBe(PLAN_TIERS.length);
  });
});

describe('PLAN_TIER_OBJECTIVES seed', () => {
  it('binds every objective to a known tier id', () => {
    const tierIds = new Set(PLAN_TIERS.map((t) => t.id));
    for (const obj of PLAN_TIER_OBJECTIVES) {
      expect(tierIds.has(obj.tierId)).toBe(true);
    }
  });

  it('only references prereq objective ids that exist in the seed', () => {
    const objIds = new Set(PLAN_TIER_OBJECTIVES.map((o) => o.id));
    for (const obj of PLAN_TIER_OBJECTIVES) {
      for (const prereq of obj.prerequisiteObjectiveIds) {
        expect(objIds.has(prereq)).toBe(true);
      }
    }
  });

  it('lookup helpers resolve canonical entries', () => {
    expect(findPlanTierObjective('t0-vision')?.tierId).toBe(
      't0-project-foundation',
    );
    expect(getObjectivesForTier('t0-project-foundation').length).toBe(2);
    expect(findPlanTierObjective('nope')).toBeUndefined();
  });
});

describe('computeObjectiveStatus', () => {
  const objWith2Required = mkObjective({
    id: 'a',
    tierId: 't1-land-reading',
    checklist: [
      { id: 'a1', label: 'A1', feedsInto: [], optional: false },
      { id: 'a2', label: 'A2', feedsInto: [], optional: false },
    ],
  });

  it('returns locked when any prereq is not complete', () => {
    const obj = mkObjective({
      id: 'b',
      tierId: 't1-land-reading',
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
      tierId: 't1-land-reading',
      checklist: [
        { id: 'opt-1', label: 'O', feedsInto: [], optional: true },
      ],
    });
    expect(computeObjectiveStatus(obj, {}, {})).toBe('complete');
  });

  it('ignores optional items when judging completion', () => {
    const obj = mkObjective({
      id: 'mix',
      tierId: 't1-land-reading',
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
      tierId: 't0-project-foundation',
      checklist: [{ id: 'a1', label: 'A1', feedsInto: [], optional: false }],
    });
    const b = mkObjective({
      id: 'b',
      tierId: 't1-land-reading',
      prerequisiteObjectiveIds: ['a'],
      checklist: [{ id: 'b1', label: 'B1', feedsInto: [], optional: false }],
    });
    const c = mkObjective({
      id: 'c',
      tierId: 't2-systems-reading',
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
      tierId: 't0-project-foundation',
      parallelGroupId: 'g',
      checklist: [{ id: 'v1', label: 'V', feedsInto: [], optional: false }],
    });
    const s = mkObjective({
      id: 's',
      tierId: 't0-project-foundation',
      parallelGroupId: 'g',
      checklist: [{ id: 's1', label: 'S', feedsInto: [], optional: false }],
    });
    const next = mkObjective({
      id: 'next',
      tierId: 't1-land-reading',
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
    const statuses = computeAllObjectiveStatuses(PLAN_TIER_OBJECTIVES, {});
    expect(statuses['t0-vision']).toBe('available');
    expect(statuses['t0-stewardship']).toBe('available');
    expect(statuses['t1-land-baseline']).toBe('locked');
    expect(statuses['t6-phasing']).toBe('locked');
  });
});

describe('computeTierState', () => {
  it('marks tier complete when every objective is complete', () => {
    expect(
      computeTierState(
        't0-project-foundation',
        PLAN_TIER_OBJECTIVES,
        { 't0-vision': 'complete', 't0-stewardship': 'complete' },
      ),
    ).toBe('complete');
  });

  it('marks tier active when any objective is active', () => {
    expect(
      computeTierState(
        't0-project-foundation',
        PLAN_TIER_OBJECTIVES,
        { 't0-vision': 'active', 't0-stewardship': 'available' },
      ),
    ).toBe('active');
  });

  it('marks tier available when no objectives are active but at least one is available', () => {
    expect(
      computeTierState(
        't0-project-foundation',
        PLAN_TIER_OBJECTIVES,
        { 't0-vision': 'available', 't0-stewardship': 'available' },
      ),
    ).toBe('available');
  });

  it('marks tier locked when every objective is locked', () => {
    expect(
      computeTierState(
        't1-land-reading',
        PLAN_TIER_OBJECTIVES,
        { 't1-land-baseline': 'locked' },
      ),
    ).toBe('locked');
  });

  it('rolls up all 7 tiers in one pass against the empty-progress seed', () => {
    const statuses = computeAllObjectiveStatuses(PLAN_TIER_OBJECTIVES, {});
    const tierStates = computeAllTierStates(
      PLAN_TIERS.map((t) => t.id),
      PLAN_TIER_OBJECTIVES,
      statuses,
    );
    expect(tierStates['t0-project-foundation']).toBe('available');
    expect(tierStates['t1-land-reading']).toBe('locked');
    expect(tierStates['t6-phasing-resourcing']).toBe('locked');
  });
});

describe('isCyclicalReviewDue', () => {
  const objective = findPlanTierObjective('t0-vision');
  if (!objective) throw new Error('seed missing t0-vision');
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

import { describe, it, expect } from 'vitest';
import {
  buildWorkPackageFromDecision,
  emptyPlanWorkPackage,
  sortWorkPackages,
  PLAN_WORK_PACKAGE_STATUSES,
  PLAN_WORK_PACKAGE_STATUS_LABEL,
  type PlanWorkPackage,
  type PlanWorkPackageStatus,
} from '../planWorkPackage.js';
import {
  emptyPlanDecision,
  type PlanDecision,
} from '../../decisions/planDecision.js';

/** A minimal work package; override status/updatedAt/etc per case. */
function pkg(overrides: Partial<PlanWorkPackage> = {}): PlanWorkPackage {
  return {
    ...emptyPlanWorkPackage('mtc'),
    ...overrides,
  };
}

/** A minimal decision for promote-from-decision cases. */
function decision(overrides: Partial<PlanDecision> = {}): PlanDecision {
  return {
    ...emptyPlanDecision('mtc'),
    ...overrides,
  };
}

describe('emptyPlanWorkPackage', () => {
  it('starts as a draft with the build team and empty text', () => {
    const p = emptyPlanWorkPackage('mtc');
    expect(p.projectId).toBe('mtc');
    expect(p.status).toBe('draft');
    expect(p.teamType).toBe('built-infrastructure');
    expect(p.objective).toBe('');
    expect(p.detail).toBe('');
    expect(p.location).toBe('');
    expect(p.tools).toBe('');
    expect(p.evidenceRequired).toBe('');
    expect(p.completionCriteria).toBe('');
    expect(p.decisionId).toBeUndefined();
  });

  it('stamps an id and created/updated timestamps', () => {
    const p = emptyPlanWorkPackage('mtc');
    expect(p.id).toBeTruthy();
    expect(p.createdAt).toBeTruthy();
    expect(p.updatedAt).toBe(p.createdAt);
    expect(p.dispatchedAt).toBeUndefined();
    expect(p.completedAt).toBeUndefined();
  });
});

describe('buildWorkPackageFromDecision', () => {
  it('seeds the objective from the decision headline', () => {
    const p = buildWorkPackageFromDecision(
      decision({ headline: 'Dig a swale above the bank' }),
    );
    expect(p.objective).toBe('Dig a swale above the bank');
  });

  it('seeds the detail from the decision rationale', () => {
    const p = buildWorkPackageFromDecision(
      decision({ rationale: 'Slow the runoff before winter' }),
    );
    expect(p.detail).toBe('Slow the runoff before winter');
  });

  it('links back to the source decision', () => {
    const p = buildWorkPackageFromDecision(decision({ id: 'dec-9' }));
    expect(p.decisionId).toBe('dec-9');
  });

  it('starts as a draft with the build team on the decision project', () => {
    const p = buildWorkPackageFromDecision(decision({ projectId: 'farm-2' }));
    expect(p.status).toBe('draft');
    expect(p.teamType).toBe('built-infrastructure');
    expect(p.projectId).toBe('farm-2');
    expect(p.id).toBeTruthy();
  });
});

describe('sortWorkPackages', () => {
  it('groups by status in draft → queued → in-progress → done → cancelled order', () => {
    const sorted = sortWorkPackages([
      pkg({ id: 'c', status: 'cancelled' }),
      pkg({ id: 'done', status: 'done' }),
      pkg({ id: 'ip', status: 'in-progress' }),
      pkg({ id: 'q', status: 'queued' }),
      pkg({ id: 'd', status: 'draft' }),
    ]);
    expect(sorted.map((p) => p.id)).toEqual(['d', 'q', 'ip', 'done', 'c']);
  });

  it('sorts most-recently-updated first within a status group', () => {
    const sorted = sortWorkPackages([
      pkg({ id: 'older', status: 'queued', updatedAt: '2026-05-01T00:00:00.000Z' }),
      pkg({ id: 'newer', status: 'queued', updatedAt: '2026-05-20T00:00:00.000Z' }),
    ]);
    expect(sorted.map((p) => p.id)).toEqual(['newer', 'older']);
  });

  it('does not mutate the input array', () => {
    const input = [
      pkg({ id: 'q', status: 'queued' }),
      pkg({ id: 'd', status: 'draft' }),
    ];
    const before = input.map((p) => p.id);
    sortWorkPackages(input);
    expect(input.map((p) => p.id)).toEqual(before);
  });

  it('returns an empty array for no packages', () => {
    expect(sortWorkPackages([])).toEqual([]);
  });
});

describe('status labels', () => {
  it('has a label for every status', () => {
    for (const status of PLAN_WORK_PACKAGE_STATUSES) {
      expect(
        PLAN_WORK_PACKAGE_STATUS_LABEL[status as PlanWorkPackageStatus],
      ).toBeTruthy();
    }
  });
});

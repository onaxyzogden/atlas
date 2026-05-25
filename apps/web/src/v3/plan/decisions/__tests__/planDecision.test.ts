import { describe, it, expect } from 'vitest';
import {
  buildDecisionFromFlag,
  buildSupersedingDraft,
  emptyPlanDecision,
  sortDecisions,
  PLAN_DECISION_STATUSES,
  PLAN_DECISION_STATUS_LABEL,
  type PlanDecision,
  type PlanDecisionStatus,
} from '../planDecision.js';
import type {
  PlanImpactFlag,
  PlanReviewRun,
} from '../../impact/planImpactFlag.js';

/** A minimal decision; override status/updatedAt/etc per case. */
function decision(overrides: Partial<PlanDecision> = {}): PlanDecision {
  return {
    ...emptyPlanDecision('mtc'),
    ...overrides,
  };
}

/** A minimal flag for promote-from-flag cases. */
function flag(overrides: Partial<PlanImpactFlag> = {}): PlanImpactFlag {
  return {
    id: 'need-1',
    projectId: 'mtc',
    needId: 'need-1',
    module: 'earth-water-ecology',
    title: 'Recheck eroded bank',
    reason: 'Bank slumped after the storm',
    planImpact: 'likely',
    target: { center: [-78.2, 44.5] },
    ...overrides,
  };
}

function review(overrides: Partial<PlanReviewRun> = {}): PlanReviewRun {
  return { status: 'reviewed', note: '', ...overrides };
}

describe('emptyPlanDecision', () => {
  it('starts as a draft with the no-change verb and empty text', () => {
    const d = emptyPlanDecision('mtc');
    expect(d.projectId).toBe('mtc');
    expect(d.status).toBe('draft');
    expect(d.verb).toBe('no-change');
    expect(d.headline).toBe('');
    expect(d.rationale).toBe('');
    expect(d.assumptions).toBe('');
    expect(d.tradeoffs).toBe('');
    expect(d.sources).toEqual([]);
    expect(d.affectedModule).toBeUndefined();
  });

  it('stamps an id and created/updated timestamps', () => {
    const d = emptyPlanDecision('mtc');
    expect(d.id).toBeTruthy();
    expect(d.createdAt).toBeTruthy();
    expect(d.updatedAt).toBe(d.createdAt);
    expect(d.decidedAt).toBeUndefined();
  });
});

describe('buildDecisionFromFlag', () => {
  it('seeds the verb from the review decision', () => {
    const d = buildDecisionFromFlag(flag(), review({ decision: 'update-plan' }));
    expect(d.verb).toBe('update-plan');
  });

  it('falls back to no-change when the review has no decision', () => {
    const d = buildDecisionFromFlag(flag(), review({ decision: undefined }));
    expect(d.verb).toBe('no-change');
  });

  it('carries the review note as the rationale seed', () => {
    const d = buildDecisionFromFlag(flag(), review({ note: 'Watch the slump' }));
    expect(d.rationale).toBe('Watch the slump');
  });

  it('maps the flag to a single source snapshot', () => {
    const d = buildDecisionFromFlag(
      flag({ id: 'need-7', title: 'Spring reappeared', module: 'topography' }),
      review(),
    );
    expect(d.sources).toEqual([
      { observationId: 'need-7', title: 'Spring reappeared', module: 'topography' },
    ]);
  });

  it('starts the promoted decision as a draft on the flag project', () => {
    const d = buildDecisionFromFlag(flag({ projectId: 'farm-2' }), review());
    expect(d.status).toBe('draft');
    expect(d.projectId).toBe('farm-2');
    expect(d.id).toBeTruthy();
  });
});

describe('buildSupersedingDraft', () => {
  it('copies reasoning forward and links back to the previous decision', () => {
    const prev = decision({
      id: 'dec-1',
      status: 'accepted',
      verb: 'update-plan',
      headline: 'Add a swale above the bank',
      rationale: 'Slow the runoff',
      assumptions: 'Bank stays stable through winter',
      tradeoffs: 'Costs a day of earthworks',
      affectedModule: 'water-management',
      sources: [{ observationId: 'need-1', title: 'Bank', module: 'topography' }],
    });
    const next = buildSupersedingDraft(prev);
    expect(next.id).not.toBe(prev.id);
    expect(next.status).toBe('draft');
    expect(next.supersedesId).toBe('dec-1');
    expect(next.verb).toBe('update-plan');
    expect(next.headline).toBe('Add a swale above the bank');
    expect(next.rationale).toBe('Slow the runoff');
    expect(next.assumptions).toBe('Bank stays stable through winter');
    expect(next.tradeoffs).toBe('Costs a day of earthworks');
    expect(next.affectedModule).toBe('water-management');
    expect(next.sources).toEqual(prev.sources);
    expect(next.sources).not.toBe(prev.sources);
  });

  it('omits affectedModule when the previous decision had none', () => {
    const next = buildSupersedingDraft(decision({ id: 'dec-2' }));
    expect(next.affectedModule).toBeUndefined();
    expect(next.supersedesId).toBe('dec-2');
  });
});

describe('sortDecisions', () => {
  it('groups by status in draft → accepted → superseded → rejected order', () => {
    const sorted = sortDecisions([
      decision({ id: 'r', status: 'rejected' }),
      decision({ id: 's', status: 'superseded' }),
      decision({ id: 'a', status: 'accepted' }),
      decision({ id: 'd', status: 'draft' }),
    ]);
    expect(sorted.map((d) => d.id)).toEqual(['d', 'a', 's', 'r']);
  });

  it('sorts most-recently-updated first within a status group', () => {
    const sorted = sortDecisions([
      decision({ id: 'older', status: 'draft', updatedAt: '2026-05-01T00:00:00.000Z' }),
      decision({ id: 'newer', status: 'draft', updatedAt: '2026-05-20T00:00:00.000Z' }),
    ]);
    expect(sorted.map((d) => d.id)).toEqual(['newer', 'older']);
  });

  it('does not mutate the input array', () => {
    const input = [
      decision({ id: 'a', status: 'accepted' }),
      decision({ id: 'd', status: 'draft' }),
    ];
    const before = input.map((d) => d.id);
    sortDecisions(input);
    expect(input.map((d) => d.id)).toEqual(before);
  });

  it('returns an empty array for no decisions', () => {
    expect(sortDecisions([])).toEqual([]);
  });
});

describe('status labels', () => {
  it('has a label for every status', () => {
    for (const status of PLAN_DECISION_STATUSES) {
      expect(PLAN_DECISION_STATUS_LABEL[status as PlanDecisionStatus]).toBeTruthy();
    }
  });
});

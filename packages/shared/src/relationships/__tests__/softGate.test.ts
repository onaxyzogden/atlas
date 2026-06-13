// softGate.test.ts
//
// Verifies the ADR 11 soft-gate overlay: while a review is active, a `locked`
// objective that was previously completed (lastReviewedAt != null) becomes an
// accessible review checkpoint, but a never-reached lock stays hard. Soft
// gating only ever OPENS access (Amanah: never a blocking gate), so the no-
// review and no-previously-completed cases must return empty.

import { describe, it, expect } from 'vitest';
import { resolveSoftGates } from '../softGate.js';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '../../schemas/plan/planStratumObjective.schema.js';

function objective(
  id: string,
  stratumId: string,
): PlanStratumObjective {
  return {
    id,
    stratumId,
    title: id,
    focusedQuestion: 'Q?',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    checklist: [],
    decisionGroups: [],
    outputKind: 'plan-decision-record',
  } as PlanStratumObjective;
}

// Three objectives across two strata. sDone was completed earlier (it has a
// lastReviewedAt) but a revised upstream cascaded it back to `locked`. sFresh
// is locked but was never reached. sLive is the active upstream under review.
const sLive = objective('s4-water', 's4-systems');
const sDone = objective('s5-yield', 's5-flows');
const sFresh = objective('s6-market', 's6-market');

const OBJECTIVES = [sLive, sDone, sFresh];

const STATUSES: Readonly<Record<string, PlanStratumObjectiveStatus>> = {
  's4-water': 'active',
  's5-yield': 'locked',
  's6-market': 'locked',
};

describe('resolveSoftGates', () => {
  it('returns empty when no review is active', () => {
    const result = resolveSoftGates({
      objectives: OBJECTIVES,
      objectiveStatuses: STATUSES,
      previouslyCompleted: new Set(['s5-yield']),
      reviewActive: false,
    });
    expect(result.softObjectiveIds.size).toBe(0);
    expect(result.softStratumIds.size).toBe(0);
  });

  it('returns empty when nothing was previously completed', () => {
    const result = resolveSoftGates({
      objectives: OBJECTIVES,
      objectiveStatuses: STATUSES,
      previouslyCompleted: new Set(),
      reviewActive: true,
    });
    expect(result.softObjectiveIds.size).toBe(0);
    expect(result.softStratumIds.size).toBe(0);
  });

  it('softens a locked-but-previously-completed objective during review', () => {
    const result = resolveSoftGates({
      objectives: OBJECTIVES,
      objectiveStatuses: STATUSES,
      previouslyCompleted: new Set(['s5-yield']),
      reviewActive: true,
    });
    expect(result.softObjectiveIds.has('s5-yield')).toBe(true);
    expect(result.softStratumIds.has('s5-flows')).toBe(true);
  });

  it('never softens a never-reached lock (no lastReviewedAt)', () => {
    const result = resolveSoftGates({
      objectives: OBJECTIVES,
      objectiveStatuses: STATUSES,
      previouslyCompleted: new Set(['s5-yield']),
      reviewActive: true,
    });
    // s6-market is locked but absent from previouslyCompleted -> stays hard.
    expect(result.softObjectiveIds.has('s6-market')).toBe(false);
    expect(result.softStratumIds.has('s6-market')).toBe(false);
  });

  it('never softens a non-locked objective even if previously completed', () => {
    const result = resolveSoftGates({
      objectives: OBJECTIVES,
      objectiveStatuses: STATUSES,
      // s4-water is active AND previously completed -- not locked, so not soft.
      previouslyCompleted: new Set(['s4-water', 's5-yield']),
      reviewActive: true,
    });
    expect(result.softObjectiveIds.has('s4-water')).toBe(false);
    expect(result.softObjectiveIds.has('s5-yield')).toBe(true);
    expect(result.softObjectiveIds.size).toBe(1);
  });
});

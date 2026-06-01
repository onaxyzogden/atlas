// deriveChecklistProgress — pure derivation of an objective's decision-checklist
// completion. Mirrors DecisionChecklist's required-done / required-total figure
// (DecisionChecklist.tsx:64-67); the parity test pins it so the bar's number
// can't drift from the "Your decisions — X / Y required" caption.

import { describe, it, expect } from 'vitest';
import type { PlanDecisionChecklistItem } from '@ogden/shared';
import type { VisionDerivedMap } from '../../../strata/visionProfileToChecklist.js';
import { deriveChecklistProgress } from '../checklistProgress.js';

function ck(
  id: string,
  extra: Partial<PlanDecisionChecklistItem> = {},
): PlanDecisionChecklistItem {
  return { id, label: id, feedsInto: [], optional: false, ...extra };
}

describe('deriveChecklistProgress', () => {
  it('counts only required items as the total (optional excluded)', () => {
    const checklist = [
      ck('c1'),
      ck('c2'),
      ck('c3', { optional: true }),
    ];
    expect(deriveChecklistProgress(checklist, [])).toEqual({ done: 0, total: 2 });
  });

  it('counts required items present in completedItemIds as done', () => {
    const checklist = [ck('c1'), ck('c2'), ck('c3')];
    expect(deriveChecklistProgress(checklist, ['c1', 'c3'])).toEqual({
      done: 2,
      total: 3,
    });
  });

  it('does not count a completed optional item toward done', () => {
    const checklist = [ck('c1'), ck('opt', { optional: true })];
    expect(deriveChecklistProgress(checklist, ['c1', 'opt'])).toEqual({
      done: 1,
      total: 1,
    });
  });

  it('unions stored completion with Stage Zero derived evidence', () => {
    const checklist = [ck('c1'), ck('c2')];
    const derived: VisionDerivedMap = {
      c2: { isComplete: true, evidence: 'Captured in the Stage Zero Vision.' },
    };
    expect(deriveChecklistProgress(checklist, ['c1'], derived)).toEqual({
      done: 2,
      total: 2,
    });
  });

  it('ignores derived evidence whose isComplete is not true', () => {
    const checklist = [ck('c1')];
    const derived: VisionDerivedMap = {
      c1: { isComplete: false, evidence: 'Partial.' },
    };
    expect(deriveChecklistProgress(checklist, [], derived)).toEqual({
      done: 0,
      total: 1,
    });
  });

  it('returns {done:0,total:0} for an empty checklist', () => {
    expect(deriveChecklistProgress([], [])).toEqual({ done: 0, total: 0 });
  });

  it('matches DecisionChecklist required-done/required-total logic (parity)', () => {
    // Same inputs DecisionChecklist uses to render "X / Y required":
    // requiredCount = items.filter(!optional); requiredDoneCount adds the
    // stored ids unioned with derived evidence.
    const checklist = [
      ck('c1'),
      ck('c2'),
      ck('c3', { optional: true }),
      ck('c4'),
    ];
    const completedItemIds = ['c1'];
    const derived: VisionDerivedMap = {
      c4: { isComplete: true, evidence: 'derived' },
    };

    const completed = new Set(completedItemIds);
    const isItemComplete = (id: string) =>
      completed.has(id) || derived?.[id]?.isComplete === true;
    const requiredCount = checklist.filter((i) => !i.optional).length;
    const requiredDoneCount = checklist.filter(
      (i) => !i.optional && isItemComplete(i.id),
    ).length;

    expect(deriveChecklistProgress(checklist, completedItemIds, derived)).toEqual(
      { done: requiredDoneCount, total: requiredCount },
    );
  });
});

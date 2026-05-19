// @vitest-environment happy-dom
/**
 * workItemBudgetStore — projectId-tagged actual-spend CRUD (Sub-project D3).
 * Steward-authored only; no Goal-Compass preservation contract. Upsert is
 * keyed by (projectId, workItemId); removal/scoping are project-isolated.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useWorkItemBudgetStore,
  type BudgetActual,
} from '../workItemBudgetStore.js';

function ba(partial: Partial<BudgetActual> & { workItemId: string }): BudgetActual {
  return {
    projectId: 'p1',
    actual: { low: 100, mid: 100, high: 100 },
    actualHrs: 8,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

const reset = () => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useWorkItemBudgetStore.setState({ actuals: [] });
};

describe('workItemBudgetStore', () => {
  beforeEach(reset);

  it('upserts (insert then replace, bumping updatedAt) keyed by project+workItem', () => {
    const s = useWorkItemBudgetStore.getState();
    s.upsertActual(ba({ workItemId: 'w1' }));
    expect(useWorkItemBudgetStore.getState().actuals).toHaveLength(1);

    // Replace the same (p1, w1) — count stays 1, value + updatedAt change.
    useWorkItemBudgetStore.getState().upsertActual(
      ba({ workItemId: 'w1', actual: { low: 200, mid: 250, high: 300 }, actualHrs: 12 }),
    );
    const rows = useWorkItemBudgetStore.getState().actuals;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.actual).toEqual({ low: 200, mid: 250, high: 300 });
    expect(rows[0]!.actualHrs).toBe(12);
    expect(rows[0]!.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');

    // Same workItemId under a different project is a distinct row.
    useWorkItemBudgetStore.getState().upsertActual(ba({ workItemId: 'w1', projectId: 'p2' }));
    expect(useWorkItemBudgetStore.getState().actuals).toHaveLength(2);
  });

  it('removeActual is project-scoped and does not cascade', () => {
    useWorkItemBudgetStore.setState({
      actuals: [
        ba({ workItemId: 'w1', projectId: 'p1' }),
        ba({ workItemId: 'w1', projectId: 'p2' }),
      ],
    });
    useWorkItemBudgetStore.getState().removeActual('p1', 'w1');
    const rows = useWorkItemBudgetStore.getState().actuals;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.projectId).toBe('p2');
  });

  it('scopes getProjectActuals to a single project', () => {
    useWorkItemBudgetStore.setState({
      actuals: [
        ba({ workItemId: 'w1', projectId: 'p1' }),
        ba({ workItemId: 'w2', projectId: 'p1' }),
        ba({ workItemId: 'w3', projectId: 'p2' }),
      ],
    });
    expect(
      useWorkItemBudgetStore.getState().getProjectActuals('p1').map((a) => a.workItemId),
    ).toEqual(['w1', 'w2']);
    expect(
      useWorkItemBudgetStore.getState().getProjectActuals('p2').map((a) => a.workItemId),
    ).toEqual(['w3']);
  });
});

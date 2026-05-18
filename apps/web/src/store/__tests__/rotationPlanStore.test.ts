// @vitest-environment happy-dom
/**
 * rotationPlanStore — additive B3 persist slice.
 *
 * Covers: setPlan sort, upsertCell idempotency on paddockId, removeCell,
 * per-project isolation, clearPlan, planFor default.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useRotationPlanStore,
  planFor,
} from '../rotationPlanStore.js';
import type { RotationCell } from '../../features/livestock/rotationSequenceMath.js';

function cell(
  paddockId: string,
  over: Partial<RotationCell> = {},
): RotationCell {
  return {
    paddockId,
    cellGroup: 'g1',
    sequenceOrder: 0,
    targetGrazeDays: 3,
    targetRestDays: 30,
    ...over,
  };
}

function reset(): void {
  useRotationPlanStore.setState({ byProject: {} });
}

describe('rotationPlanStore', () => {
  beforeEach(reset);

  it('setPlan stores and sorts by (cellGroup asc, sequenceOrder asc)', () => {
    useRotationPlanStore.getState().setPlan('p1', [
      cell('a', { cellGroup: 'g2', sequenceOrder: 1 }),
      cell('b', { cellGroup: 'g1', sequenceOrder: 2 }),
      cell('c', { cellGroup: 'g1', sequenceOrder: 0 }),
      cell('d', { cellGroup: 'g2', sequenceOrder: 0 }),
    ]);
    const plan = useRotationPlanStore.getState().byProject['p1']!;
    expect(plan.projectId).toBe('p1');
    expect(plan.cells.map((c) => c.paddockId)).toEqual(['c', 'b', 'd', 'a']);
  });

  it('upsertCell is idempotent by paddockId (last write wins) and re-sorts', () => {
    const { upsertCell } = useRotationPlanStore.getState();
    upsertCell('p1', cell('a', { sequenceOrder: 2 }));
    upsertCell('p1', cell('b', { sequenceOrder: 1 }));
    upsertCell('p1', cell('a', { sequenceOrder: 0, targetGrazeDays: 9 }));
    const plan = useRotationPlanStore.getState().byProject['p1']!;
    expect(plan.cells).toHaveLength(2);
    expect(plan.cells.map((c) => c.paddockId)).toEqual(['a', 'b']);
    expect(plan.cells.find((c) => c.paddockId === 'a')!.targetGrazeDays).toBe(9);
  });

  it('removeCell removes only that paddockId, leaves others; entry stays', () => {
    const { setPlan, removeCell } = useRotationPlanStore.getState();
    setPlan('p1', [cell('a', { sequenceOrder: 0 }), cell('b', { sequenceOrder: 1 })]);
    removeCell('p1', 'a');
    const plan = useRotationPlanStore.getState().byProject['p1']!;
    expect(plan.cells.map((c) => c.paddockId)).toEqual(['b']);
  });

  it('isolates plans per project', () => {
    const { setPlan } = useRotationPlanStore.getState();
    setPlan('p1', [cell('a')]);
    setPlan('p2', [cell('b'), cell('c', { sequenceOrder: 1 })]);
    const { byProject } = useRotationPlanStore.getState();
    expect(byProject['p1']!.cells).toHaveLength(1);
    expect(byProject['p2']!.cells).toHaveLength(2);
  });

  it('clearPlan removes the project entry entirely', () => {
    const { setPlan, clearPlan } = useRotationPlanStore.getState();
    setPlan('p1', [cell('a')]);
    clearPlan('p1');
    expect(useRotationPlanStore.getState().byProject['p1']).toBeUndefined();
    expect(planFor(useRotationPlanStore.getState(), 'p1')).toEqual({
      projectId: 'p1',
      cells: [],
    });
  });

  it('planFor returns the empty default for an unknown project', () => {
    expect(planFor(useRotationPlanStore.getState(), 'nope')).toEqual({
      projectId: 'nope',
      cells: [],
    });
  });
});

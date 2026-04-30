/**
 * Unit tests for computeStageProgress — covers the three core invariants:
 * empty input maps to 0%, fully-populated input maps to 100%, and partial
 * input picks the first unpopulated item from the canonical taxonomy
 * ordering as the "next action" pointer.
 */

import { describe, it, expect } from 'vitest';
import { computeStageProgress } from '../stageProgress.js';
import {
  DASHBOARD_ITEMS,
  STAGE3_ORDER,
} from '../../../features/navigation/taxonomy.js';

describe('computeStageProgress', () => {
  it('returns 0% across all stages when no item has data', () => {
    const result = computeStageProgress(() => false);

    for (const stage of STAGE3_ORDER) {
      expect(result[stage].current).toBe(0);
      expect(result[stage].populated).toBe(0);
      expect(result[stage].total).toBeGreaterThan(0);
      expect(result[stage].nextActionId).not.toBeNull();
    }
  });

  it('returns 100% across all stages when every item has data', () => {
    const result = computeStageProgress(() => true);

    for (const stage of STAGE3_ORDER) {
      expect(result[stage].current).toBe(100);
      expect(result[stage].populated).toBe(result[stage].total);
      expect(result[stage].nextActionId).toBeNull();
      expect(result[stage].nextActionLabel).toBe('All caught up');
    }
  });

  it('picks the first unpopulated item in taxonomy order as nextAction', () => {
    // Populate every item in the Observe stage *except* the second-listed
    // dashboard-only item. The helper should still flag the first item as
    // "next" since taxonomy order is preserved and the first item is
    // unpopulated.
    const observeItems = DASHBOARD_ITEMS.filter(
      (i) =>
        i.stage3 === 'observe' &&
        i.dashboardOnly === true &&
        i.id !== 'workflow-wheel',
    );
    expect(observeItems.length).toBeGreaterThanOrEqual(2);
    const firstObserve = observeItems[0]!;

    const skipFirst = (id: string) => id !== firstObserve.id;
    const result = computeStageProgress(skipFirst);

    expect(result.observe.nextActionId).toBe(firstObserve.id);
    expect(result.observe.nextActionLabel).toBe(firstObserve.label);
    expect(result.observe.populated).toBe(observeItems.length - 1);
  });

  it('rounds the current percentage to the nearest integer', () => {
    const planItems = DASHBOARD_ITEMS.filter(
      (i) => i.stage3 === 'plan' && i.dashboardOnly === true,
    );
    const firstPlan = planItems[0]!;
    // Populate exactly one item — current should be Math.round(1/total*100).
    const onlyFirst = (id: string) => id === firstPlan.id;
    const result = computeStageProgress(onlyFirst);
    const expected = Math.round((1 / planItems.length) * 100);
    expect(result.plan.current).toBe(expected);
  });
});

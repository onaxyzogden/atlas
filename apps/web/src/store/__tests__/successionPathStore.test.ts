// @vitest-environment happy-dom
/**
 * successionPathStore — additive B1 persist slice.
 *
 * Covers: setMilestones, upsert idempotency + year-sort, remove,
 * per-project isolation, clearPath.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSuccessionPathStore } from '../successionPathStore.js';

function reset(): void {
  useSuccessionPathStore.setState({ byProject: {} });
}

describe('successionPathStore', () => {
  beforeEach(reset);

  it('setMilestones replaces the path for a project', () => {
    useSuccessionPathStore.getState().setMilestones('p1', [
      { year: 0, plantings: [{ speciesId: 'apple', action: 'plant' }] },
    ]);
    const path = useSuccessionPathStore.getState().byProject['p1']!;
    expect(path.milestones).toHaveLength(1);
    expect(path.projectId).toBe('p1');
  });

  it('upsertMilestone is idempotent on year and keeps years sorted', () => {
    const { upsertMilestone } = useSuccessionPathStore.getState();
    upsertMilestone('p1', { year: 10, plantings: [] });
    upsertMilestone('p1', { year: 0, plantings: [] });
    upsertMilestone('p1', {
      year: 10,
      plantings: [{ speciesId: 'pear', action: 'thin' }],
    });
    const ms = useSuccessionPathStore.getState().byProject['p1']!.milestones;
    expect(ms.map((m) => m.year)).toEqual([0, 10]);
    expect(ms[1]!.plantings).toHaveLength(1);
  });

  it('removeMilestone drops only the matching year', () => {
    const { upsertMilestone, removeMilestone } =
      useSuccessionPathStore.getState();
    upsertMilestone('p1', { year: 0, plantings: [] });
    upsertMilestone('p1', { year: 5, plantings: [] });
    removeMilestone('p1', 0);
    const ms = useSuccessionPathStore.getState().byProject['p1']!.milestones;
    expect(ms.map((m) => m.year)).toEqual([5]);
  });

  it('isolates paths per project', () => {
    const { setMilestones } = useSuccessionPathStore.getState();
    setMilestones('p1', [{ year: 0, plantings: [] }]);
    setMilestones('p2', [
      { year: 1, plantings: [] },
      { year: 2, plantings: [] },
    ]);
    const { byProject } = useSuccessionPathStore.getState();
    expect(byProject['p1']!.milestones).toHaveLength(1);
    expect(byProject['p2']!.milestones).toHaveLength(2);
  });

  it('clearPath removes the project entry entirely', () => {
    const { setMilestones, clearPath } = useSuccessionPathStore.getState();
    setMilestones('p1', [{ year: 0, plantings: [] }]);
    clearPath('p1');
    expect(useSuccessionPathStore.getState().byProject['p1']).toBeUndefined();
  });
});

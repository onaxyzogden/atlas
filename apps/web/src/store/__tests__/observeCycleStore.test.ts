// @vitest-environment happy-dom
/**
 * observeCycleStore — Phase 4 Slice 4.1 substrate.
 *
 * Covers: monotonic cycle advance per (project, domain), append-only
 * history, per-project isolation, selector defaults, clearForProject.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useObserveCycleStore } from '../observeCycleStore.js';

function reset(): void {
  useObserveCycleStore.setState({ byProject: {} });
}

describe('observeCycleStore', () => {
  beforeEach(reset);

  it('getCurrentCycle defaults to 0 for an untouched (project, domain)', () => {
    expect(
      useObserveCycleStore.getState().getCurrentCycle('p1', 'soil'),
    ).toBe(0);
  });

  it('getHistory defaults to an empty list for an untouched (project, domain)', () => {
    expect(
      useObserveCycleStore.getState().getHistory('p1', 'soil'),
    ).toEqual([]);
  });

  it('advanceCycle increments monotonically per (project, domain)', () => {
    const { advanceCycle, getCurrentCycle } = useObserveCycleStore.getState();
    expect(
      advanceCycle('p1', 'soil', 'plan_revision_confirmed', {
        advancedAt: '2026-05-28T00:00:00.000Z',
      }),
    ).toBe(1);
    expect(
      advanceCycle('p1', 'soil', 'plan_revision_revised', {
        advancedAt: '2026-05-28T01:00:00.000Z',
      }),
    ).toBe(2);
    expect(
      advanceCycle('p1', 'soil', 'plan_revision_confirmed', {
        advancedAt: '2026-05-28T02:00:00.000Z',
      }),
    ).toBe(3);
    expect(getCurrentCycle('p1', 'soil')).toBe(3);
  });

  it('keeps cycle counters isolated across domains within a project', () => {
    const { advanceCycle, getCurrentCycle } = useObserveCycleStore.getState();
    advanceCycle('p1', 'soil', 'plan_revision_confirmed', {
      advancedAt: '2026-05-28T00:00:00.000Z',
    });
    advanceCycle('p1', 'soil', 'plan_revision_revised', {
      advancedAt: '2026-05-28T01:00:00.000Z',
    });
    expect(getCurrentCycle('p1', 'soil')).toBe(2);
    expect(getCurrentCycle('p1', 'hydrology')).toBe(0);
    advanceCycle('p1', 'hydrology', 'plan_revision_confirmed', {
      advancedAt: '2026-05-28T02:00:00.000Z',
    });
    expect(getCurrentCycle('p1', 'hydrology')).toBe(1);
    expect(getCurrentCycle('p1', 'soil')).toBe(2);
  });

  it('keeps cycle counters isolated across projects for the same domain', () => {
    const { advanceCycle, getCurrentCycle } = useObserveCycleStore.getState();
    advanceCycle('p1', 'soil', 'plan_revision_confirmed', {
      advancedAt: '2026-05-28T00:00:00.000Z',
    });
    advanceCycle('p1', 'soil', 'plan_revision_revised', {
      advancedAt: '2026-05-28T01:00:00.000Z',
    });
    expect(getCurrentCycle('p1', 'soil')).toBe(2);
    expect(getCurrentCycle('p2', 'soil')).toBe(0);
    advanceCycle('p2', 'soil', 'plan_revision_confirmed', {
      advancedAt: '2026-05-28T02:00:00.000Z',
    });
    expect(getCurrentCycle('p2', 'soil')).toBe(1);
    expect(getCurrentCycle('p1', 'soil')).toBe(2);
  });

  it('appends to history in order with the right reason and planObjectiveId', () => {
    const { advanceCycle, getHistory } = useObserveCycleStore.getState();
    advanceCycle('p1', 'soil', 'plan_revision_confirmed', {
      advancedAt: '2026-05-28T00:00:00.000Z',
      planObjectiveId: 'obj-A',
    });
    advanceCycle('p1', 'soil', 'plan_revision_revised', {
      advancedAt: '2026-05-28T01:00:00.000Z',
      planObjectiveId: 'obj-B',
    });
    const history = getHistory('p1', 'soil');
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      domainId: 'soil',
      cycleId: 1,
      reason: 'plan_revision_confirmed',
      planObjectiveId: 'obj-A',
      advancedAt: '2026-05-28T00:00:00.000Z',
    });
    expect(history[1]).toMatchObject({
      domainId: 'soil',
      cycleId: 2,
      reason: 'plan_revision_revised',
      planObjectiveId: 'obj-B',
      advancedAt: '2026-05-28T01:00:00.000Z',
    });
  });

  it('omits planObjectiveId from history entries when not provided', () => {
    const { advanceCycle, getHistory } = useObserveCycleStore.getState();
    advanceCycle('p1', 'soil', 'plan_revision_confirmed', {
      advancedAt: '2026-05-28T00:00:00.000Z',
    });
    const entry = getHistory('p1', 'soil')[0]!;
    expect('planObjectiveId' in entry).toBe(false);
  });

  it('uses now() as the default advancedAt timestamp', () => {
    const before = Date.now();
    useObserveCycleStore
      .getState()
      .advanceCycle('p1', 'soil', 'plan_revision_confirmed');
    const after = Date.now();
    const entry = useObserveCycleStore.getState().getHistory('p1', 'soil')[0]!;
    const ms = Date.parse(entry.advancedAt);
    expect(Number.isFinite(ms)).toBe(true);
    expect(ms).toBeGreaterThanOrEqual(before);
    expect(ms).toBeLessThanOrEqual(after);
  });

  it('clearForProject drops only the target project', () => {
    const { advanceCycle, clearForProject, getCurrentCycle } =
      useObserveCycleStore.getState();
    advanceCycle('p1', 'soil', 'plan_revision_confirmed', {
      advancedAt: '2026-05-28T00:00:00.000Z',
    });
    advanceCycle('p2', 'soil', 'plan_revision_confirmed', {
      advancedAt: '2026-05-28T00:00:00.000Z',
    });
    clearForProject('p1');
    expect(getCurrentCycle('p1', 'soil')).toBe(0);
    expect(getCurrentCycle('p2', 'soil')).toBe(1);
  });

  it('clearForProject is a no-op when the project has no entries', () => {
    const before = useObserveCycleStore.getState().byProject;
    useObserveCycleStore.getState().clearForProject('never-existed');
    expect(useObserveCycleStore.getState().byProject).toBe(before);
  });
});

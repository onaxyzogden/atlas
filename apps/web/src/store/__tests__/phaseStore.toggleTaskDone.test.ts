// @vitest-environment happy-dom
/**
 * phaseStore.toggleTaskDone — §5.2 Plan-Execution Tracker per-task
 * completion. Asserts the new additive `done`/`doneAt` fields and the
 * `toggleTaskDone(phaseId, taskId)` action:
 *
 *  - flips `done`/`doneAt` on ONLY the target task in the target phase;
 *  - leaves sibling tasks, sibling phases, and `status` untouched
 *    (marking done must NOT freeze the row against Goal-Compass);
 *  - round-trips (true→false clears `doneAt` back to null);
 *  - a legacy task with `done` undefined toggles to done.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  usePhaseStore,
  type BuildPhase,
  type PhaseTask,
} from '../phaseStore.js';

function task(id: string, extra: Partial<PhaseTask> = {}): PhaseTask {
  return {
    id,
    season: 'spring',
    title: `Task ${id}`,
    laborHrs: 4,
    costUSD: 100,
    ...extra,
  };
}

function phase(
  id: string,
  projectId: string,
  order: number,
  tasks: PhaseTask[],
): BuildPhase {
  return {
    id,
    projectId,
    name: `Phase ${order}`,
    timeframe: 'Year 0-1',
    order,
    description: '',
    color: '#888',
    completed: false,
    notes: '',
    completedAt: null,
    tasks,
  };
}

describe('phaseStore.toggleTaskDone', () => {
  beforeEach(() => {
    usePhaseStore.setState({ phases: [], activeFilter: 'all' });
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('marks a task done with a doneAt timestamp, scoped to the target task', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-05-16T12:00:00.000Z'));
      usePhaseStore.setState({
        phases: [
          phase('ph1', 'p1', 1, [task('t1'), task('t2')]),
          phase('ph2', 'p1', 2, [task('t3')]),
        ],
      });

      usePhaseStore.getState().toggleTaskDone('ph1', 't1');

      const phases = usePhaseStore.getState().phases;
      const t1 = phases[0]?.tasks?.find((t) => t.id === 't1');
      const t2 = phases[0]?.tasks?.find((t) => t.id === 't2');
      const t3 = phases[1]?.tasks?.find((t) => t.id === 't3');

      expect(t1?.done).toBe(true);
      expect(t1?.doneAt).toBe('2026-05-16T12:00:00.000Z');
      // Sibling task in the same phase untouched.
      expect(t2?.done).toBeUndefined();
      expect(t2?.doneAt).toBeUndefined();
      // Task in a different phase untouched.
      expect(t3?.done).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('round-trips: toggling a done task back clears doneAt to null', () => {
    usePhaseStore.setState({
      phases: [phase('ph1', 'p1', 1, [task('t1')])],
    });

    usePhaseStore.getState().toggleTaskDone('ph1', 't1');
    expect(usePhaseStore.getState().phases[0]?.tasks?.[0]?.done).toBe(true);

    usePhaseStore.getState().toggleTaskDone('ph1', 't1');
    const t1 = usePhaseStore.getState().phases[0]?.tasks?.[0];
    expect(t1?.done).toBe(false);
    expect(t1?.doneAt).toBeNull();
  });

  it('does NOT set status:overridden (execution tracking is not an authoring override)', () => {
    usePhaseStore.setState({
      phases: [
        phase('ph1', 'p1', 1, [
          task('t1', { status: 'generated', generatedFromIntervention: 'compost-system' }),
        ]),
      ],
    });

    usePhaseStore.getState().toggleTaskDone('ph1', 't1');

    const t1 = usePhaseStore.getState().phases[0]?.tasks?.[0];
    expect(t1?.done).toBe(true);
    expect(t1?.status).toBe('generated');
    expect(t1?.generatedFromIntervention).toBe('compost-system');
  });

  it('leaves other phases entirely untouched (referential)', () => {
    usePhaseStore.setState({
      phases: [
        phase('ph1', 'p1', 1, [task('t1')]),
        phase('ph2', 'p1', 2, [task('t2')]),
      ],
    });
    const ph2Before = usePhaseStore.getState().phases[1];

    usePhaseStore.getState().toggleTaskDone('ph1', 't1');

    expect(usePhaseStore.getState().phases[1]).toBe(ph2Before);
  });

  it('is a no-op when the phase or task id does not match', () => {
    usePhaseStore.setState({
      phases: [phase('ph1', 'p1', 1, [task('t1')])],
    });

    usePhaseStore.getState().toggleTaskDone('ph-missing', 't1');
    usePhaseStore.getState().toggleTaskDone('ph1', 't-missing');

    expect(usePhaseStore.getState().phases[0]?.tasks?.[0]?.done).toBeUndefined();
  });

  it('persists completion to localStorage under ogden-phases', () => {
    usePhaseStore.setState({
      phases: [phase('ph1', 'p1', 1, [task('t1')])],
    });

    usePhaseStore.getState().toggleTaskDone('ph1', 't1');

    const raw = localStorage.getItem('ogden-phases');
    expect(raw).toBeTruthy();
    expect(raw as string).toContain('"done":true');
  });
});

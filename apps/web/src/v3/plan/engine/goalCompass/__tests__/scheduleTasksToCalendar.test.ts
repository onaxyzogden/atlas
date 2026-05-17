/**
 * scheduleTasksToCalendar — date-placement regression locks.
 *
 *  - F-1a: the synthetic maintenance phase (sentinel `order: 99`) anchors to
 *    `startYear + maxDesignOrder`, NOT `startYear + (order - 1)` (the bug that
 *    threw upkeep ~98 years out, to 2124).
 *  - Non-maintenance design tasks keep `startYear + (order - 1)`.
 *  - F-3: two phases sharing an `order` still land in the same calendar year
 *    but distribute their tasks independently (per-phase bucket, not per-order)
 *    — so a zero-/single-task phase can never inherit a sibling's offset.
 */

import { describe, expect, it } from 'vitest';
import { scheduleTasksToCalendar } from '../scheduleTasksToCalendar.js';
import type { BuildPhase, PhaseTask } from '../../../../../store/phaseStore.js';

function phase(id: string, order: number): BuildPhase {
  return {
    id,
    projectId: 'p1',
    name: id,
    timeframe: `Year ${order}`,
    order,
    description: '',
    color: '#000',
    completed: false,
    notes: '',
    completedAt: null,
  };
}

function task(id: string, over: Partial<PhaseTask> = {}): PhaseTask {
  return {
    id,
    season: 'spring',
    title: id,
    laborHrs: 8,
    costUSD: 0,
    ...over,
  };
}

function yearOf(iso: string | null | undefined): number {
  return Number((iso ?? '').slice(0, 4));
}

const START = '2026-06-01'; // startYear = 2026

describe('scheduleTasksToCalendar', () => {
  it('F-1a: maintenance phase anchors to startYear + maxDesignOrder, not its sentinel order', () => {
    const phases: BuildPhase[] = [
      phase('regen-phase-p1', 1),
      phase('design-phase-1', 1),
      phase('design-phase-2', 2),
      phase('design-phase-3', 3),
      phase('maint-phase-p1', 99),
    ];
    const tasks = [
      {
        phaseId: 'maint-phase-p1',
        task: task('m1', { isMaintenanceTask: true, recurrenceFrequency: 'monthly' }),
      },
    ];

    const out = scheduleTasksToCalendar(phases, tasks, START);
    const m = out.find((o) => o.task.id === 'm1')!;
    // maxDesignOrder = 3 (regen + design phases; the order:99 sentinel excluded)
    expect(yearOf(m.task.scheduledStart)).toBe(2029);
    expect(yearOf(m.task.scheduledStart)).not.toBe(2124);
  });

  it('keeps non-maintenance design tasks at startYear + (order - 1)', () => {
    const phases = [phase('design-phase-2', 2)];
    const tasks = [{ phaseId: 'design-phase-2', task: task('d1') }];

    const out = scheduleTasksToCalendar(phases, tasks, START);
    const d = out.find((o) => o.task.id === 'd1')!;
    expect(yearOf(d.task.scheduledStart)).toBe(2027); // 2026 + (2 - 1)
  });

  it('F-3: phases sharing an order land in the same year but distribute independently', () => {
    const phases = [
      phase('regen-phase-p1', 1),
      phase('design-phase-1', 1),
    ];
    const tasks = [
      { phaseId: 'design-phase-1', task: task('a1', { laborHrs: 8 }) },
      { phaseId: 'design-phase-1', task: task('a2', { laborHrs: 8 }) },
      { phaseId: 'regen-phase-p1', task: task('b1', { laborHrs: 8 }) },
    ];

    const out = scheduleTasksToCalendar(phases, tasks, START);
    const a1 = out.find((o) => o.task.id === 'a1')!;
    const a2 = out.find((o) => o.task.id === 'a2')!;
    const b1 = out.find((o) => o.task.id === 'b1')!;

    // Same shared order (1) ⇒ same calendar year for all.
    expect(yearOf(a1.task.scheduledStart)).toBe(2026);
    expect(yearOf(a2.task.scheduledStart)).toBe(2026);
    expect(yearOf(b1.task.scheduledStart)).toBe(2026);

    // b1 is the sole task of its own phase → it sits at the season-window
    // start. Under the old per-order bucketing it would have been swept to a
    // mid-window offset by design-phase-1's two tasks.
    expect(b1.task.scheduledStart).toBe('2026-03-01');
    // a1/a2 distribute within their own phase bucket → distinct starts.
    expect(a1.task.scheduledStart).not.toBe(a2.task.scheduledStart);
  });
});

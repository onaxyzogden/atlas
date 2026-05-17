// @vitest-environment happy-dom
/**
 * useEventAggregator — recurring-maintenance calendar expansion (F-1b).
 *
 *  - A recurring maintenance phase task (isMaintenanceTask + recurrenceFrequency
 *    + scheduledStart) expands into a BOUNDED series of CalendarEntry rows:
 *      · stepped by the cadence (annual → +12mo),
 *      · stopped at MAINTENANCE_VIEW_HORIZON_YEARS,
 *      · capped (monthly never runs away),
 *      · every entry id unique (React-key / byDate safe).
 *  - A non-recurring phase task still yields exactly ONE entry (legacy path
 *    untouched).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEventAggregator } from '../useEventAggregator.js';
import { usePhaseStore, type BuildPhase, type PhaseTask } from '../../../store/phaseStore.js';

function task(id: string, over: Partial<PhaseTask> = {}): PhaseTask {
  return { id, season: 'spring', title: `Task ${id}`, laborHrs: 4, costUSD: 0, ...over };
}

function phase(id: string, tasks: PhaseTask[]): BuildPhase {
  return {
    id,
    projectId: 'p1',
    name: id,
    timeframe: 'Year 1',
    order: 1,
    description: '',
    color: '#000',
    completed: false,
    notes: '',
    completedAt: null,
    tasks,
  };
}

beforeEach(() => {
  usePhaseStore.setState({ phases: [] });
});

describe('useEventAggregator — maintenance recurrence expansion', () => {
  it('expands an annual recurring task into a bounded multi-year series', () => {
    usePhaseStore.setState({
      phases: [
        phase('maint-phase-p1', [
          task('m1', {
            isMaintenanceTask: true,
            recurrenceFrequency: 'annual',
            scheduledStart: '2032-03-01',
          }),
        ]),
      ],
    });

    const { result } = renderHook(() => useEventAggregator('p1'));
    const occ = result.current.all.filter((e) => e.id.startsWith('phase-task:m1'));

    // Horizon = 5 years from first occurrence, inclusive → 2032..2037.
    expect(occ.length).toBeGreaterThanOrEqual(5);
    expect(occ.length).toBeLessThanOrEqual(7);
    expect(occ[0]!.dateKey).toBe('2032-03-01');
    expect(occ.every((e) => e.id === `phase-task:m1@${e.dateKey}`)).toBe(true);
    // All ids unique.
    expect(new Set(occ.map((e) => e.id)).size).toBe(occ.length);
    // Stepped by 12 months — second occurrence one year on.
    expect(occ[1]!.dateKey).toBe('2033-03-01');
    // Bounded — nothing past the horizon.
    expect(occ.every((e) => Number(e.dateKey.slice(0, 4)) <= 2038)).toBe(true);
  });

  it('caps a monthly recurring task (never runs away)', () => {
    usePhaseStore.setState({
      phases: [
        phase('maint-phase-p1', [
          task('m2', {
            isMaintenanceTask: true,
            recurrenceFrequency: 'monthly',
            scheduledStart: '2032-01-15',
          }),
        ]),
      ],
    });

    const { result } = renderHook(() => useEventAggregator('p1'));
    const occ = result.current.all.filter((e) => e.id.startsWith('phase-task:m2'));

    // 5-year horizon at monthly ≈ 61 occurrences, far under the 240 hard cap.
    expect(occ.length).toBeGreaterThan(50);
    expect(occ.length).toBeLessThanOrEqual(240);
    expect(new Set(occ.map((e) => e.id)).size).toBe(occ.length);
  });

  it('keeps a non-recurring phase task as exactly one entry', () => {
    usePhaseStore.setState({
      phases: [
        phase('design-phase-1', [
          task('d1', { scheduledStart: '2027-04-01' }),
        ]),
      ],
    });

    const { result } = renderHook(() => useEventAggregator('p1'));
    const occ = result.current.all.filter((e) => e.id.startsWith('phase-task:d1'));
    expect(occ).toHaveLength(1);
    expect(occ[0]!.id).toBe('phase-task:d1');
    expect(occ[0]!.dateKey).toBe('2027-04-01');
  });
});

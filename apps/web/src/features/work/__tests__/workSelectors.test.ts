/**
 * @vitest-environment happy-dom
 *
 * workSelectors — pure display derivations for the Act work surface.
 * Pins: source scoping (the surface aggregates exactly the three livestock
 * sources), the due-anchor/display-status lattice (window start opens
 * due-today; past due → overdue), variance maths + label, day grouping
 * (dated only, ascending), and UTC-safe date addition.
 */

import { describe, expect, it } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import {
  addDaysISO,
  groupByDueDate,
  isLivestockWork,
  isLiveWork,
  varianceDays,
  varianceLabel,
  workDisplayStatus,
  workDueDate,
} from '../workSelectors.js';

const TODAY = '2026-06-12';

function w(over: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'w1',
    projectId: 'p1',
    title: 'Weekly welfare & condition check',
    category: 'livestock',
    status: 'todo',
    source: 'livestock-plan',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...over,
  } as WorkItem;
}

describe('isLivestockWork', () => {
  it('accepts exactly the three livestock sources', () => {
    expect(isLivestockWork(w({ source: 'livestock-plan' }))).toBe(true);
    expect(isLivestockWork(w({ source: 'rotation-sequence' }))).toBe(true);
    expect(isLivestockWork(w({ source: 'scheduled-livestock-move' }))).toBe(
      true,
    );
    expect(isLivestockWork(w({ source: 'field-task' }))).toBe(false);
    expect(isLivestockWork(w({ source: 'nursery-batch' }))).toBe(false);
  });
});

describe('workDueDate', () => {
  it('prefers scheduledEnd, falls back to scheduledStart, else null', () => {
    expect(
      workDueDate(w({ scheduledStart: '2026-06-10', scheduledEnd: '2026-06-14' })),
    ).toBe('2026-06-14');
    expect(workDueDate(w({ scheduledStart: '2026-06-10' }))).toBe('2026-06-10');
    expect(workDueDate(w())).toBeNull();
  });
});

describe('workDisplayStatus', () => {
  it('passes lifecycle statuses through', () => {
    expect(workDisplayStatus(w({ status: 'done' }), TODAY)).toBe('done');
    expect(workDisplayStatus(w({ status: 'cancelled' }), TODAY)).toBe(
      'cancelled',
    );
    expect(workDisplayStatus(w({ status: 'in-progress' }), TODAY)).toBe(
      'in-progress',
    );
    expect(workDisplayStatus(w({ status: 'blocked' }), TODAY)).toBe('blocked');
  });

  it('flags past-due todo work as overdue', () => {
    expect(
      workDisplayStatus(w({ scheduledEnd: '2026-06-11' }), TODAY),
    ).toBe('overdue');
  });

  it('opens due-today at the window START, not only its end', () => {
    expect(
      workDisplayStatus(
        w({ scheduledStart: '2026-06-12', scheduledEnd: '2026-06-20' }),
        TODAY,
      ),
    ).toBe('due-today');
    expect(
      workDisplayStatus(
        w({ scheduledStart: '2026-06-10', scheduledEnd: '2026-06-20' }),
        TODAY,
      ),
    ).toBe('due-today');
  });

  it('future or undated work is upcoming', () => {
    expect(
      workDisplayStatus(w({ scheduledStart: '2026-06-15' }), TODAY),
    ).toBe('upcoming');
    expect(workDisplayStatus(w(), TODAY)).toBe('upcoming');
  });
});

describe('variance', () => {
  it('computes late / early / on-time against the due anchor', () => {
    const base = { status: 'done' as const, scheduledEnd: '2026-06-10' };
    expect(varianceDays(w({ ...base, actualEnd: '2026-06-12' }))).toBe(2);
    expect(varianceDays(w({ ...base, actualEnd: '2026-06-07' }))).toBe(-3);
    expect(varianceDays(w({ ...base, actualEnd: '2026-06-10' }))).toBe(0);
  });

  it('falls back to the doneAt stamp date and labels correctly', () => {
    const item = w({
      status: 'done',
      scheduledEnd: '2026-06-10',
      doneAt: '2026-06-12T15:30:00.000Z',
    });
    expect(varianceDays(item)).toBe(2);
    expect(varianceLabel(item)).toBe('✓ +2d late');
    expect(
      varianceLabel(
        w({ status: 'done', scheduledEnd: '2026-06-10', actualEnd: '2026-06-07' }),
      ),
    ).toBe('✓ 3d early');
    expect(
      varianceLabel(
        w({ status: 'done', scheduledEnd: '2026-06-10', actualEnd: '2026-06-10' }),
      ),
    ).toBe('✓ on time');
  });

  it('returns null for live or undated work', () => {
    expect(varianceDays(w({ scheduledEnd: '2026-06-10' }))).toBeNull();
    expect(varianceDays(w({ status: 'done' }))).toBeNull();
    expect(varianceLabel(w())).toBeNull();
  });
});

describe('isLiveWork', () => {
  it('excludes done and cancelled only', () => {
    expect(isLiveWork(w())).toBe(true);
    expect(isLiveWork(w({ status: 'blocked' }))).toBe(true);
    expect(isLiveWork(w({ status: 'done' }))).toBe(false);
    expect(isLiveWork(w({ status: 'cancelled' }))).toBe(false);
  });
});

describe('groupByDueDate', () => {
  it('groups by due day ascending and drops undated items', () => {
    const groups = groupByDueDate([
      w({ id: 'b', scheduledEnd: '2026-06-14' }),
      w({ id: 'a', scheduledEnd: '2026-06-12' }),
      w({ id: 'c', scheduledEnd: '2026-06-12' }),
      w({ id: 'undated' }),
    ]);
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-06-12', '2026-06-14']);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['a', 'c']);
    expect(groups[1]!.items.map((i) => i.id)).toEqual(['b']);
  });
});

describe('addDaysISO', () => {
  it('adds days without timezone drift, across month ends', () => {
    expect(addDaysISO('2026-06-12', 6)).toBe('2026-06-18');
    expect(addDaysISO('2026-06-28', 6)).toBe('2026-07-04');
    expect(addDaysISO('2026-06-12', 0)).toBe('2026-06-12');
  });
});

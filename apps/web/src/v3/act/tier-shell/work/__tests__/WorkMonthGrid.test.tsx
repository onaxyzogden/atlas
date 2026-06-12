/**
 * @vitest-environment happy-dom
 *
 * WorkMonthGrid — Season-tab month calendar (Phase 5 slice 1).
 *
 * Pins:
 *   - Fixed 7×6 grid (42 cells), Monday week start, stable month height.
 *   - Per-day tone dots derived from workDisplayStatus (overdue/open/done),
 *     cancelled rows never marked.
 *   - Tap a day → that day's agenda below; month nav reaches rows beyond the
 *     week horizon; the month label jumps back to today.
 *   - Pure read — the grid is prop-driven and rendering writes no store.
 *   - ActWorkPanel wiring: 'season' tab + `?workFilter=season` deep-link.
 */

import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import type { WorkItem } from '@ogden/shared';

// Stub lucide icons (same pattern as PlacedFeaturesCard.test.tsx): the real
// icon components crash under happy-dom's reconciler.
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' && value !== null && '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});
import { useWorkItemStore } from '../../../../../store/workItemStore.js';
import { useProjectStore } from '../../../../../store/projectStore.js';
import { useLivestockWorkPlanStore } from '../../../../../store/livestockWorkPlanStore.js';
import WorkMonthGrid from '../WorkMonthGrid.js';
import ActWorkPanel from '../ActWorkPanel.js';

const P = 'p1';
const TODAY = '2026-06-12';

function row(over: Partial<WorkItem>): WorkItem {
  const stamp = '2026-06-01T00:00:00.000Z';
  return {
    id: 'w-default',
    projectId: P,
    source: 'livestock-plan',
    overridden: false,
    createdAt: stamp,
    updatedAt: stamp,
    title: 'Weekly welfare & condition check',
    phaseId: null,
    status: 'todo',
    doneAt: null,
    dependsOn: [],
    dependsOnAuto: [],
    precedesAuto: [],
    scheduledStart: '2026-06-15',
    scheduledEnd: '2026-06-15',
    materialsAuto: [],
    equipmentRequiredAuto: [],
    notes: '',
    ...over,
  } as WorkItem;
}

function dayCell(dateKey: string): HTMLElement {
  const cell = screen
    .getAllByTestId('work-month-day')
    .find((el) => el.getAttribute('data-date') === dateKey);
  if (!cell) throw new Error(`no grid cell for ${dateKey}`);
  return cell;
}

function dotTones(cell: HTMLElement): string[] {
  return [...cell.querySelectorAll('[data-tone]')].map(
    (el) => el.getAttribute('data-tone') ?? '',
  );
}

describe('WorkMonthGrid', () => {
  it('renders a fixed 7×6 Monday-start grid anchored on today', () => {
    render(<WorkMonthGrid items={[]} todayISO={TODAY} />);
    const cells = screen.getAllByTestId('work-month-day');
    expect(cells).toHaveLength(42);
    // June 2026 starts on a Monday — the first cell IS June 1.
    expect(cells[0]?.getAttribute('data-date')).toBe('2026-06-01');
    expect(screen.getByText('June 2026')).toBeDefined();
    const today = dayCell(TODAY);
    expect(today.getAttribute('data-today')).toBe('true');
    // Today is the initial selection; its (empty) agenda shows below.
    expect(today.getAttribute('data-selected')).toBe('true');
    expect(screen.getByText('Nothing scheduled on this day.')).toBeDefined();
  });

  it('marks days with tone dots per display status, excluding cancelled', () => {
    render(
      <WorkMonthGrid
        items={[
          row({ id: 'w-over', scheduledStart: '2026-06-10', scheduledEnd: '2026-06-10' }),
          row({ id: 'w-open' }),
          row({
            id: 'w-done',
            status: 'done',
            doneAt: '2026-06-15T00:00:00.000Z',
          }),
          row({
            id: 'w-cancelled',
            status: 'cancelled',
            scheduledStart: '2026-06-20',
            scheduledEnd: '2026-06-20',
          }),
        ]}
        todayISO={TODAY}
      />,
    );
    expect(dotTones(dayCell('2026-06-10'))).toEqual(['overdue']);
    // Open + done on the same day — one dot each, no duplicates per tone.
    expect(dotTones(dayCell('2026-06-15'))).toEqual(['open', 'done']);
    expect(dotTones(dayCell('2026-06-20'))).toEqual([]);
  });

  it('tap a day shows that day’s agenda; month nav reaches future rows', () => {
    render(
      <WorkMonthGrid
        items={[
          row({ id: 'w-jun', title: 'June welfare check' }),
          row({
            id: 'w-jul',
            title: 'July parasite monitoring',
            scheduledStart: '2026-07-20',
            scheduledEnd: '2026-07-20',
          }),
        ]}
        todayISO={TODAY}
      />,
    );
    fireEvent.click(dayCell('2026-06-15'));
    expect(screen.getByText('June welfare check')).toBeDefined();
    expect(screen.queryByText('July parasite monitoring')).toBeNull();

    // Next month: July rows become reachable — beyond the week horizon.
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByText('July 2026')).toBeDefined();
    expect(dotTones(dayCell('2026-07-20'))).toEqual(['open']);
    fireEvent.click(dayCell('2026-07-20'));
    expect(screen.getByText('July parasite monitoring')).toBeDefined();

    // The month label jumps back to today's month + selection.
    fireEvent.click(screen.getByText('July 2026'));
    expect(screen.getByText('June 2026')).toBeDefined();
    expect(dayCell(TODAY).getAttribute('data-selected')).toBe('true');
  });

  it('is a pure read — rendering and navigation write no store', () => {
    useWorkItemStore.setState({ items: [row({})], migratedSources: [] });
    const snapshot = useWorkItemStore.getState().items;
    render(<WorkMonthGrid items={snapshot} todayISO={TODAY} />);
    fireEvent.click(screen.getByLabelText('Previous month'));
    fireEvent.click(dayCell('2026-05-15'));
    expect(useWorkItemStore.getState().items).toBe(snapshot);
  });
});

describe('ActWorkPanel Season tab', () => {
  beforeEach(() => {
    // Empty project store → generateAndApplyLivestockWork no-ops on mount.
    useProjectStore.setState({ projects: [] } as never);
    useWorkItemStore.setState({ items: [], migratedSources: [] });
    useLivestockWorkPlanStore.setState({ rules: [], proposals: [] });
  });

  it('mounts the month grid on the Season tab and via ?workFilter=season', () => {
    render(
      <ActWorkPanel projectId={P} onBack={() => {}} initialFilter="season" />,
    );
    expect(screen.getByTestId('work-month-grid')).toBeDefined();
    expect(
      screen.getByRole('tab', { name: 'Season' }).getAttribute('aria-selected'),
    ).toBe('true');

    // Switching back to Today swaps the grid out for the agenda.
    fireEvent.click(screen.getByRole('tab', { name: 'Today' }));
    expect(screen.queryByTestId('work-month-grid')).toBeNull();
    expect(screen.getByText('Nothing due today.')).toBeDefined();
  });
});

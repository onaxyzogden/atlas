/**
 * @vitest-environment happy-dom
 *
 * WorkCalendarTakeover — wide-calendar canvas takeover (Phase 5 slice 4).
 *
 * Pins:
 *   - Same fixed 7×6 Monday-start month as the rail grid, but wide: cells
 *     list entry titles tone-coded by workDisplayStatus, capped at 3 with a
 *     "+N more" overflow; cancelled rows never appear.
 *   - Tap a day → its full agenda (WorkAgendaList) below the grid; month nav
 *     reaches rows beyond the horizon; the label jumps back to today.
 *   - Forecast glyphs only where the 7-day window has data (useForecast
 *     mocked); none otherwise.
 *   - "Back to map" fires onClose — the shell owns the ?workView param.
 *   - ActWorkPanel wiring: the Season tab shows the "Wide calendar" trigger
 *     only when the shell passes onOpenCalendar.
 */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
// Deterministic forecast (same holder as WorkMonthGrid.test.tsx): glyph
// behavior pinned without a parcel or an API.
const mockForecast = vi.hoisted(() => ({
  current: {
    data: null,
    status: 'no-parcel',
    coordinates: null,
  } as { data: unknown; status: string; coordinates: unknown },
}));
vi.mock('../../../../../lib/forecast/useForecast.js', () => ({
  useForecast: () => mockForecast.current,
}));
import { useWorkItemStore } from '../../../../../store/workItemStore.js';
import { useProjectStore } from '../../../../../store/projectStore.js';
import { useLivestockWorkPlanStore } from '../../../../../store/livestockWorkPlanStore.js';
import type { ForecastDay } from '../../../../../lib/forecast/types.js';
import WorkCalendarTakeover from '../WorkCalendarTakeover.js';
import ActWorkPanel from '../ActWorkPanel.js';

const P = 'p1';
const TODAY = '2026-06-12';

function fday(date: string, over: Partial<ForecastDay> = {}): ForecastDay {
  return {
    date,
    tempMaxC: 22,
    tempMinC: 11,
    precipitationSumMm: 0,
    precipitationProbMax: 10,
    weatherCode: 61,
    windSpeedMaxMs: 3,
    sunrise: null,
    sunset: null,
    ...over,
  };
}

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
    .getAllByTestId('work-cal-day')
    .find((el) => el.getAttribute('data-date') === dateKey);
  if (!cell) throw new Error(`no calendar cell for ${dateKey}`);
  return cell;
}

function cellEntries(cell: HTMLElement): Array<{ title: string; tone: string }> {
  return [...cell.querySelectorAll('[data-testid="work-cal-entry"]')].map((el) => ({
    title: el.textContent ?? '',
    tone: el.getAttribute('data-tone') ?? '',
  }));
}

function seedStore(items: WorkItem[]): void {
  useWorkItemStore.setState({ items, migratedSources: [] });
}

describe('WorkCalendarTakeover', () => {
  beforeEach(() => {
    mockForecast.current = { data: null, status: 'no-parcel', coordinates: null };
    seedStore([]);
  });

  it('renders the fixed wide month anchored on today; Back to map fires onClose', () => {
    const onClose = vi.fn();
    render(<WorkCalendarTakeover projectId={P} onClose={onClose} todayISO={TODAY} />);
    const cells = screen.getAllByTestId('work-cal-day');
    expect(cells).toHaveLength(42);
    // June 2026 starts on a Monday — the first cell IS June 1.
    expect(cells[0]?.getAttribute('data-date')).toBe('2026-06-01');
    expect(screen.getByText('June 2026')).toBeDefined();
    const today = dayCell(TODAY);
    expect(today.getAttribute('data-today')).toBe('true');
    expect(today.getAttribute('data-selected')).toBe('true');
    // Today's (empty) agenda shows below by default.
    expect(screen.getByText('Today')).toBeDefined();
    expect(screen.getByText('Nothing scheduled on this day.')).toBeDefined();
    // No forecast data → no glyphs anywhere.
    expect(screen.queryByTestId('work-cal-weather')).toBeNull();

    fireEvent.click(screen.getByTestId('work-calendar-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lists tone-coded entries per cell, caps at 3 with overflow, hides cancelled and other projects', () => {
    seedStore([
      row({ id: 'w-over', title: 'Fence integrity check', scheduledStart: '2026-06-10', scheduledEnd: '2026-06-10' }),
      row({ id: 'w-open', title: 'June welfare check' }),
      row({ id: 'w-done', title: 'Water check', status: 'done', doneAt: '2026-06-15T00:00:00.000Z' }),
      row({ id: 'w-cancelled', title: 'Cancelled task', status: 'cancelled', scheduledStart: '2026-06-20', scheduledEnd: '2026-06-20' }),
      row({ id: 'w-foreign', title: 'Other project task', projectId: 'p2', scheduledStart: '2026-06-20', scheduledEnd: '2026-06-20' }),
      // 4 on one day → 3 entries + "+1 more".
      row({ id: 'w-c1', title: 'Crowded A', scheduledStart: '2026-06-22', scheduledEnd: '2026-06-22' }),
      row({ id: 'w-c2', title: 'Crowded B', scheduledStart: '2026-06-22', scheduledEnd: '2026-06-22' }),
      row({ id: 'w-c3', title: 'Crowded C', scheduledStart: '2026-06-22', scheduledEnd: '2026-06-22' }),
      row({ id: 'w-c4', title: 'Crowded D', scheduledStart: '2026-06-22', scheduledEnd: '2026-06-22' }),
    ]);
    render(<WorkCalendarTakeover projectId={P} onClose={() => {}} todayISO={TODAY} />);

    expect(cellEntries(dayCell('2026-06-10'))).toEqual([
      { title: 'Fence integrity check', tone: 'overdue' },
    ]);
    expect(cellEntries(dayCell('2026-06-15'))).toEqual([
      { title: 'June welfare check', tone: 'open' },
      { title: 'Water check', tone: 'done' },
    ]);
    expect(cellEntries(dayCell('2026-06-20'))).toEqual([]);
    const crowded = dayCell('2026-06-22');
    expect(cellEntries(crowded)).toHaveLength(3);
    expect(crowded.textContent).toContain('+1 more');
  });

  it('tap a day shows its agenda; month nav reaches future rows; label jumps back', () => {
    seedStore([
      row({ id: 'w-jun', title: 'June welfare check' }),
      row({
        id: 'w-jul',
        title: 'July parasite monitoring',
        scheduledStart: '2026-07-20',
        scheduledEnd: '2026-07-20',
      }),
    ]);
    render(<WorkCalendarTakeover projectId={P} onClose={() => {}} todayISO={TODAY} />);

    fireEvent.click(dayCell('2026-06-15'));
    // Agenda header switches from Today to the picked date; the row title now
    // appears twice (cell entry + agenda row).
    expect(screen.getByText('2026-06-15')).toBeDefined();
    expect(screen.getAllByText('June welfare check').length).toBeGreaterThan(1);

    fireEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByText('July 2026')).toBeDefined();
    fireEvent.click(dayCell('2026-07-20'));
    expect(screen.getAllByText('July parasite monitoring').length).toBeGreaterThan(1);

    fireEvent.click(screen.getByText('July 2026'));
    expect(screen.getByText('June 2026')).toBeDefined();
    expect(dayCell(TODAY).getAttribute('data-selected')).toBe('true');
  });

  it('shows weatherCodeMeta glyphs only on forecast-window cells', () => {
    mockForecast.current = {
      data: {
        daily: [
          fday('2026-06-12', { weatherCode: 0 }), // clear → Sun
          fday('2026-06-13'), // 61 drizzle → CloudRain
          fday('2026-06-15', { weatherCode: null }), // no code → skipped
        ],
      } as unknown,
      status: 'live',
      coordinates: { lat: 43.5, lng: -79.9 },
    };
    render(<WorkCalendarTakeover projectId={P} onClose={() => {}} todayISO={TODAY} />);

    const glyph = (dateKey: string) =>
      dayCell(dateKey)
        .querySelector('[data-testid="work-cal-weather"] [data-lucide-icon]')
        ?.getAttribute('data-lucide-icon');
    expect(glyph('2026-06-12')).toBe('Sun');
    expect(glyph('2026-06-13')).toBe('CloudRain');
    expect(glyph('2026-06-15')).toBeUndefined();
    expect(glyph('2026-06-25')).toBeUndefined();
  });

  it('is a pure read — rendering and navigation write no store', () => {
    const items = [row({})];
    seedStore(items);
    const snapshot = useWorkItemStore.getState().items;
    render(<WorkCalendarTakeover projectId={P} onClose={() => {}} todayISO={TODAY} />);
    fireEvent.click(screen.getByLabelText('Previous month'));
    fireEvent.click(dayCell('2026-05-15'));
    expect(useWorkItemStore.getState().items).toBe(snapshot);
  });
});

describe('ActWorkPanel wide-calendar trigger', () => {
  beforeEach(() => {
    // Empty project store → generateAndApplyLivestockWork no-ops on mount.
    useProjectStore.setState({ projects: [] } as never);
    useWorkItemStore.setState({ items: [], migratedSources: [] });
    useLivestockWorkPlanStore.setState({ rules: [], proposals: [] });
  });

  it('shows the trigger on the Season tab only when the shell wires it', () => {
    const onOpenCalendar = vi.fn();
    const { unmount } = render(
      <ActWorkPanel
        projectId={P}
        onBack={() => {}}
        initialFilter="season"
        onOpenCalendar={onOpenCalendar}
      />,
    );
    fireEvent.click(screen.getByTestId('open-wide-calendar'));
    expect(onOpenCalendar).toHaveBeenCalledTimes(1);

    // Not on the agenda tabs.
    fireEvent.click(screen.getByRole('tab', { name: 'Today' }));
    expect(screen.queryByTestId('open-wide-calendar')).toBeNull();
    unmount();

    // Without the shell callback (no canvas to take over) the trigger hides.
    render(<ActWorkPanel projectId={P} onBack={() => {}} initialFilter="season" />);
    expect(screen.queryByTestId('open-wide-calendar')).toBeNull();
  });
});

/**
 * @vitest-environment happy-dom
 *
 * WorkCarerSummary — per-carer workload strip (Phase 5 slice 3).
 *
 * Pins:
 *   - Per-carer counts: overdue + due-this-week, derived from live rows only
 *     (done/cancelled excluded); rows without `who` pool under "Unassigned".
 *   - Ordering: heaviest workload first (overdue, then week, then name);
 *     Unassigned always last.
 *   - The strip renders nothing when no live row carries a carer.
 *   - Chips toggle: select fires onSelect(name), re-tapping the active chip
 *     fires onSelect(null).
 *   - ActWorkPanel wiring: the filter narrows the agenda AND the pinned
 *     Overdue section, while the strip itself keeps every carer visible.
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
import { useWorkItemStore } from '../../../../../store/workItemStore.js';
import { useProjectStore } from '../../../../../store/projectStore.js';
import { useLivestockWorkPlanStore } from '../../../../../store/livestockWorkPlanStore.js';
import { addDaysISO } from '../../../../../features/work/workSelectors.js';
import WorkCarerSummary from '../WorkCarerSummary.js';
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

function chips(): string[] {
  return screen
    .getAllByTestId('work-carer-chip')
    .map((el) => el.getAttribute('data-carer') ?? '');
}

function chip(carer: string): HTMLElement {
  const el = screen
    .getAllByTestId('work-carer-chip')
    .find((c) => c.getAttribute('data-carer') === carer);
  if (!el) throw new Error(`no carer chip for "${carer}"`);
  return el;
}

describe('WorkCarerSummary', () => {
  it('counts overdue + week per carer, pools unassigned last, skips done', () => {
    render(
      <WorkCarerSummary
        items={[
          row({ id: 'w-a1', who: 'Amal', scheduledStart: '2026-06-10', scheduledEnd: '2026-06-10' }),
          row({ id: 'w-a2', who: 'Amal', scheduledStart: '2026-06-13', scheduledEnd: '2026-06-13' }),
          row({
            id: 'w-a3',
            who: 'Amal',
            status: 'done',
            doneAt: '2026-06-11T00:00:00.000Z',
            scheduledStart: '2026-06-11',
            scheduledEnd: '2026-06-11',
          }),
          row({ id: 'w-b1', who: 'Bilal', scheduledStart: '2026-06-14', scheduledEnd: '2026-06-14' }),
          // Live but beyond the week window — appears with 0 wk (still
          // selectable, the filter matters for the Season grid).
          row({ id: 'w-c1', who: 'Charlie', scheduledStart: '2026-07-10', scheduledEnd: '2026-07-10' }),
          row({ id: 'w-u1', scheduledStart: '2026-06-12', scheduledEnd: '2026-06-12' }),
        ]}
        todayISO={TODAY}
        selected={null}
        onSelect={() => {}}
      />,
    );
    // Overdue-heaviest first, Unassigned ('') last.
    expect(chips()).toEqual(['Amal', 'Bilal', 'Charlie', '']);
    const amal = chip('Amal');
    expect(amal.textContent).toContain('Amal');
    expect(amal.querySelector('[data-tone="overdue"]')?.textContent).toBe('1');
    expect(amal.querySelector('[data-tone="week"]')?.textContent).toBe('1 wk');
    const charlie = chip('Charlie');
    expect(charlie.querySelector('[data-tone="overdue"]')).toBeNull();
    expect(charlie.querySelector('[data-tone="week"]')?.textContent).toBe('0 wk');
    expect(chip('').textContent).toContain('Unassigned');
  });

  it('renders nothing when no live row carries a carer', () => {
    render(
      <WorkCarerSummary
        items={[
          row({ id: 'w-u1' }),
          row({ id: 'w-a-done', who: 'Amal', status: 'done', doneAt: '2026-06-11T00:00:00.000Z' }),
        ]}
        todayISO={TODAY}
        selected={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.queryByTestId('work-carer-summary')).toBeNull();
  });

  it('toggles: tap selects, tapping the active chip clears', () => {
    const onSelect = vi.fn();
    const items = [row({ id: 'w-b1', who: 'Bilal' })];
    const { rerender } = render(
      <WorkCarerSummary items={items} todayISO={TODAY} selected={null} onSelect={onSelect} />,
    );
    fireEvent.click(chip('Bilal'));
    expect(onSelect).toHaveBeenLastCalledWith('Bilal');

    rerender(
      <WorkCarerSummary items={items} todayISO={TODAY} selected="Bilal" onSelect={onSelect} />,
    );
    expect(chip('Bilal').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(chip('Bilal'));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
});

describe('ActWorkPanel carer filter', () => {
  // The panel derives todayISO from the real clock.
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = addDaysISO(today, -1);

  beforeEach(() => {
    // Empty project store → generateAndApplyLivestockWork no-ops on mount.
    useProjectStore.setState({ projects: [] } as never);
    useWorkItemStore.setState({
      items: [
        row({
          id: 'w-amal',
          who: 'Amal',
          title: 'Amal welfare check',
          scheduledStart: today,
          scheduledEnd: today,
        }),
        row({
          id: 'w-bilal',
          who: 'Bilal',
          title: 'Bilal water check',
          scheduledStart: today,
          scheduledEnd: today,
        }),
        row({
          id: 'w-bilal-over',
          who: 'Bilal',
          title: 'Bilal fence repair',
          scheduledStart: yesterday,
          scheduledEnd: yesterday,
        }),
        row({
          id: 'w-nobody',
          title: 'Unassigned parasite check',
          scheduledStart: today,
          scheduledEnd: today,
        }),
      ],
      migratedSources: [],
    });
    useLivestockWorkPlanStore.setState({ rules: [], proposals: [] });
  });

  it('narrows the agenda and the pinned Overdue section to the tapped carer', () => {
    render(<ActWorkPanel projectId={P} onBack={() => {}} />);
    expect(chips()).toEqual(['Bilal', 'Amal', '']);
    expect(screen.getByText('Overdue (1)')).toBeDefined();
    expect(screen.getByText('Amal welfare check')).toBeDefined();
    expect(screen.getByText('Bilal water check')).toBeDefined();
    expect(screen.getByText('Unassigned parasite check')).toBeDefined();

    // Filter to Amal: only her agenda row; Bilal's overdue section vanishes;
    // the strip itself still shows everyone.
    fireEvent.click(chip('Amal'));
    expect(screen.getByText('Amal welfare check')).toBeDefined();
    expect(screen.queryByText('Bilal water check')).toBeNull();
    expect(screen.queryByText('Unassigned parasite check')).toBeNull();
    expect(screen.queryByText('Overdue (1)')).toBeNull();
    expect(chips()).toEqual(['Bilal', 'Amal', '']);

    // Unassigned bucket filters to rows without `who`.
    fireEvent.click(chip(''));
    expect(screen.getByText('Unassigned parasite check')).toBeDefined();
    expect(screen.queryByText('Amal welfare check')).toBeNull();

    // Re-tapping the active chip clears the filter.
    fireEvent.click(chip(''));
    expect(screen.getByText('Amal welfare check')).toBeDefined();
    expect(screen.getByText('Bilal water check')).toBeDefined();
    expect(screen.getByText('Overdue (1)')).toBeDefined();
  });
});

/**
 * @vitest-environment happy-dom
 *
 * ActWorkProgressCard — per-objective done/open/overdue rollup over confirmed
 * livestock-plan spine rows.
 *
 * Pins:
 *   - Reads ONLY source 'livestock-plan' rows (rotation moves stay owned by
 *     their own surfaces) and excludes cancelled rows.
 *   - Renders nothing when no generated work exists (the summary card above
 *     already covers proposals).
 *   - Pure read — rendering never writes any store.
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
import ActWorkProgressCard from '../ActWorkProgressCard.js';

const P = 'p1';

function row(over: Partial<WorkItem>): WorkItem {
  const stamp = '2026-06-01T00:00:00.000Z';
  return {
    id: `lvw__lvp__husbandry__welfare-weekly__2026-06-15`,
    projectId: P,
    source: 'livestock-plan',
    overridden: false,
    generatedFromLivestockPlan: 'lvp__husbandry__welfare-weekly__2026-06-15',
    sourceObjectiveId: 'obj-husbandry',
    createdAt: stamp,
    updatedAt: stamp,
    title: 'Weekly welfare & condition check',
    phaseId: null,
    status: 'todo',
    doneAt: null,
    dependsOn: [],
    dependsOnAuto: [],
    precedesAuto: [],
    scheduledStart: '2999-01-01',
    scheduledEnd: '2999-01-01',
    materialsAuto: [],
    equipmentRequiredAuto: [],
    notes: '',
    ...over,
  } as WorkItem;
}

beforeEach(() => {
  useWorkItemStore.setState({ items: [], migratedSources: [] });
  useProjectStore.setState({ projects: [] });
});

describe('ActWorkProgressCard', () => {
  it('renders nothing when the project has no livestock-plan rows', () => {
    useWorkItemStore.setState({
      items: [row({ id: 'rs__x', source: 'rotation-sequence' })],
    });
    render(<ActWorkProgressCard projectId={P} />);
    expect(screen.queryByTestId('act-work-progress-card')).toBeNull();
  });

  it('rolls up done / open / overdue per source objective, excluding cancelled', () => {
    useWorkItemStore.setState({
      items: [
        // obj-husbandry: 1 done + 1 upcoming + 1 overdue + 1 cancelled
        row({ id: 'w1', status: 'done', doneAt: '2026-06-10T00:00:00.000Z' }),
        row({ id: 'w2' }),
        row({ id: 'w3', scheduledStart: '2020-01-01', scheduledEnd: '2020-01-01' }),
        row({ id: 'w4', status: 'cancelled' }),
        // second objective bucket
        row({
          id: 'w5',
          sourceObjectiveId: 'obj-grazing',
          generatedFromLivestockPlan: 'lvp__grazing__graze-rest__2026-07-01',
          status: 'done',
          doneAt: '2026-06-10T00:00:00.000Z',
        }),
        // other project — never counted
        row({ id: 'w6', projectId: 'other' }),
      ],
    });
    render(<ActWorkProgressCard projectId={P} />);
    const card = screen.getByTestId('act-work-progress-card');
    // Header total: 2 of 4 done (cancelled + other-project excluded), 1 overdue.
    expect(card.textContent).toContain('2 of 4 done');
    expect(card.textContent).toContain('1 overdue');
    const rows = screen.getAllByTestId('act-work-progress-row');
    expect(rows).toHaveLength(2);
    // Unresolvable objective ids fall back to the rule key's sourceKind.
    const husbandry = rows.find((r) => r.textContent?.includes('Husbandry'));
    expect(husbandry?.textContent).toContain('1/3');
    const grazing = rows.find((r) => r.textContent?.includes('Grazing'));
    expect(grazing?.textContent).toContain('1/1');
  });

  it('click opens the work panel; rendering writes nothing', () => {
    const before = useWorkItemStore.getState().items;
    useWorkItemStore.setState({ items: [row({ id: 'w1' })] });
    const snapshot = useWorkItemStore.getState().items;
    const onOpen = vi.fn();
    render(<ActWorkProgressCard projectId={P} onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('act-work-progress-card'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(useWorkItemStore.getState().items).toBe(snapshot);
    expect(before).toEqual([]);
  });
});

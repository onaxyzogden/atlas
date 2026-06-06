/**
 * @vitest-environment happy-dom
 *
 * DecisionList -- the center pane of the Tier-0 workbench ("Your Decisions").
 * A presentational, CONTROLLED component that lists the active objective's
 * checklist items as clickable rows and surfaces the completion gate. Selection
 * is lifted to the parent via `onSelectItem`; the component owns no store.
 *
 * Verified behaviours (PB4 TDD checklist):
 *   1. one row per checklist item (data-testid="decision-item").
 *   2. the count chip reads "{done} / {total} decisions made", done derived
 *      from completedItemIds.
 *   3. a completed item row has data-complete="true"; a non-completed one does
 *      not.
 *   4. an optional item shows an "optional" badge.
 *   5. an item with feedsInto shows a feed annotation containing "Feeds" + the
 *      resolved target title (or raw id fallback).
 *   6. clicking a row calls onSelectItem with that item's id.
 *   7. the row matching selectedItemId has data-selected="true"; others do not.
 *   8. the completion-gate card renders the gate text; absent when no gate.
 *   9. (keyboard) pressing Enter/Space on a row triggers onSelectItem.
 *
 * Lucide forwardRef icons are replaced with clean <svg> stubs (established
 * pattern; mirrors SuccessCriteriaCapture.test).
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { PlanStratumObjective } from '@ogden/shared';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
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

import DecisionList from '../DecisionList.js';

// A minimal, schema-valid objective fixture: 4 checklist items (one optional,
// one with feedsInto, one that will be "complete", and a plain one), an empty
// decisionGroups, and a completionGate string.
function makeObjective(
  overrides: Partial<PlanStratumObjective> = {},
): PlanStratumObjective {
  return {
    id: 's1-vision',
    stratumId: 's1-project-foundation',
    title: 'Define vision, goals & stewardship capacity',
    focusedQuestion:
      'What is this project for, and what does success look like?',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    checklist: [
      {
        id: 'item-criteria',
        label: 'Define 3-5 measurable success criteria',
        feedsInto: ['s2-land-reading'],
        optional: false,
      },
      {
        id: 'item-steward',
        label: 'Confirm the primary steward',
        feedsInto: [],
        optional: true,
      },
      {
        id: 'item-purpose',
        label: 'State the primary purpose',
        feedsInto: [],
        optional: false,
      },
      {
        id: 'item-capacity',
        label: 'Estimate stewardship capacity',
        feedsInto: [],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
    decisionGroups: [],
    completionGate:
      'A bounded, evidence-grounded vision is approved by the steward.',
    ...overrides,
  } as PlanStratumObjective;
}

function renderList(
  opts: {
    objective?: PlanStratumObjective;
    completedItemIds?: readonly string[];
    selectedItemId?: string | null;
  } = {},
) {
  const onSelectItem = vi.fn();
  render(
    <DecisionList
      objective={opts.objective ?? makeObjective()}
      completedItemIds={opts.completedItemIds ?? []}
      selectedItemId={opts.selectedItemId ?? null}
      onSelectItem={onSelectItem}
    />,
  );
  return { onSelectItem };
}

describe('DecisionList -- rows', () => {
  it('renders one row per checklist item', () => {
    renderList();
    expect(screen.getAllByTestId('decision-item').length).toBe(4);
  });

  it('renders the completion-gate card with the gate text', () => {
    renderList();
    expect(
      screen.getByText(
        /A bounded, evidence-grounded vision is approved by the steward/i,
      ),
    ).toBeTruthy();
  });

  it('omits the completion-gate card when no gate is present', () => {
    renderList({ objective: makeObjective({ completionGate: undefined }) });
    expect(screen.queryByText(/completion gate/i)).toBeNull();
  });
});

describe('DecisionList -- count chip', () => {
  it('reads "{done} / {total} decisions made" with done from completedItemIds', () => {
    renderList({ completedItemIds: ['item-purpose'] });
    expect(screen.getByText(/1\s*\/\s*4 decisions made/i)).toBeTruthy();
  });

  it('counts zero done when nothing is complete', () => {
    renderList();
    expect(screen.getByText(/0\s*\/\s*4 decisions made/i)).toBeTruthy();
  });
});

describe('DecisionList -- per-item state', () => {
  it('marks a completed item row data-complete="true" and others not', () => {
    renderList({ completedItemIds: ['item-purpose'] });
    const rows = screen.getAllByTestId('decision-item');
    const purpose = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-purpose',
    )!;
    const steward = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-steward',
    )!;
    expect(purpose.getAttribute('data-complete')).toBe('true');
    expect(steward.getAttribute('data-complete')).not.toBe('true');
  });

  it('shows an "optional" badge on the optional item', () => {
    renderList();
    const rows = screen.getAllByTestId('decision-item');
    const steward = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-steward',
    )!;
    expect(within(steward).getByText(/optional/i)).toBeTruthy();
  });

  it('shows a feed annotation for an item with feedsInto', () => {
    renderList();
    const rows = screen.getAllByTestId('decision-item');
    const criteria = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-criteria',
    )!;
    expect(within(criteria).getByText(/Feeds/i)).toBeTruthy();
  });

  it('marks the selected row data-selected="true" and others not', () => {
    renderList({ selectedItemId: 'item-steward' });
    const rows = screen.getAllByTestId('decision-item');
    const steward = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-steward',
    )!;
    const purpose = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-purpose',
    )!;
    expect(steward.getAttribute('data-selected')).toBe('true');
    expect(purpose.getAttribute('data-selected')).not.toBe('true');
  });
});

describe('DecisionList -- selection', () => {
  it('calls onSelectItem with the item id when a row is clicked', () => {
    const { onSelectItem } = renderList();
    const rows = screen.getAllByTestId('decision-item');
    const purpose = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-purpose',
    )!;
    fireEvent.click(purpose);
    expect(onSelectItem).toHaveBeenCalledWith('item-purpose');
  });

  it('calls onSelectItem when Enter is pressed on a row', () => {
    const { onSelectItem } = renderList();
    const rows = screen.getAllByTestId('decision-item');
    const purpose = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-purpose',
    )!;
    fireEvent.keyDown(purpose, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenCalledWith('item-purpose');
  });

  it('calls onSelectItem when Space is pressed on a row', () => {
    const { onSelectItem } = renderList();
    const rows = screen.getAllByTestId('decision-item');
    const purpose = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-purpose',
    )!;
    fireEvent.keyDown(purpose, { key: ' ' });
    expect(onSelectItem).toHaveBeenCalledWith('item-purpose');
  });
});

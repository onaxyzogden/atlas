/**
 * @vitest-environment happy-dom
 *
 * DecisionProgressBar — the sticky "Decision progress" bar at the top of the
 * objective detail panel. Asserts: it renders the required done/total count and
 * an aria progressbar with the right value; shows the "Not yet started" note
 * when nothing is done; applies the complete (green) styling when all required
 * decisions are done; and renders nothing when there are no required items.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type {
  PlanDecisionChecklistItem,
  PlanStratumObjective,
} from '@ogden/shared';
import DecisionProgressBar from '../DecisionProgressBar.js';

function ck(
  id: string,
  extra: Partial<PlanDecisionChecklistItem> = {},
): PlanDecisionChecklistItem {
  return { id, label: id, feedsInto: [], optional: false, ...extra };
}

function mkObjective(
  checklist: PlanDecisionChecklistItem[],
): PlanStratumObjective {
  const partial: Partial<PlanStratumObjective> &
    Pick<PlanStratumObjective, 'checklist'> = { checklist };
  return {
    id: 'obj-1',
    stratumId: 's2-land-reading',
    title: 'Test objective',
    focusedQuestion: 'What must be decided?',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    decisionGroups: [],
    outputKind: 'plan-decision-record',
    source: 'universal',
    ref: 'U-S2.1',
    completionGate: '',
    actHandoff: 'Hand off to Act.',
    ...partial,
  } as PlanStratumObjective;
}

describe('DecisionProgressBar', () => {
  it('renders the required done/total count and an aria progressbar', () => {
    render(
      <DecisionProgressBar
        objective={mkObjective([ck('c1'), ck('c2'), ck('c3')])}
        completedItemIds={['c1', 'c2']}
      />,
    );
    expect(screen.getByText('2 / 3')).toBeTruthy();
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('2');
    expect(bar.getAttribute('aria-valuemax')).toBe('3');
  });

  it('shows the "Not yet started" note when nothing is done', () => {
    render(
      <DecisionProgressBar
        objective={mkObjective([ck('c1'), ck('c2')])}
        completedItemIds={[]}
      />,
    );
    expect(screen.getByText(/Not yet started/)).toBeTruthy();
  });

  it('applies the complete (green) styling when all required items are done', () => {
    render(
      <DecisionProgressBar
        objective={mkObjective([ck('c1'), ck('c2')])}
        completedItemIds={['c1', 'c2']}
      />,
    );
    const count = screen.getByText('2 / 2');
    expect(count.style.color).toBe('var(--spine-green)');
    expect(screen.queryByText(/Not yet started/)).toBeNull();
  });

  it('renders nothing when there are no required items', () => {
    const { container } = render(
      <DecisionProgressBar
        objective={mkObjective([ck('opt', { optional: true })])}
        completedItemIds={[]}
      />,
    );
    expect(screen.queryByTestId('plan-decision-progress')).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});

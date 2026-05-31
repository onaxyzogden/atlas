/**
 * @vitest-environment happy-dom
 *
 * DecisionChecklist — Decision Groups Reference v1.0 render (Phase 4).
 * Asserts the grouped layout (group sub-headers + "N items" + observe-feed
 * chips + nested item rows), the amber "Added by <Type>" attribution on a
 * secondary-sourced group, the flat-list fallback when an objective carries no
 * decision groups, and the lossless "Other decisions" fallback for any item a
 * partial grouping leaves unclaimed.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import type {
  DecisionGroup,
  PlanDecisionChecklistItem,
  PlanStratumObjective,
} from '@ogden/shared';
import DecisionChecklist from '../DecisionChecklist.js';

function ck(id: string, label: string): PlanDecisionChecklistItem {
  return { id, label, feedsInto: [], optional: false };
}

function dg(
  id: string,
  label: string,
  itemIds: string[],
  observeFeeds: string[] = [],
  sourceSecondaryId: string | null = null,
): DecisionGroup {
  return {
    id,
    label,
    itemIds,
    observeFeeds,
    sourceSecondaryId: sourceSecondaryId as DecisionGroup['sourceSecondaryId'],
  };
}

function mkObjective(
  partial: Partial<PlanStratumObjective> &
    Pick<PlanStratumObjective, 'checklist'>,
): PlanStratumObjective {
  return {
    id: 'obj-1',
    stratumId: 's2-survey',
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

const noop = () => {};

describe('DecisionChecklist - grouped render', () => {
  const objective = mkObjective({
    checklist: [
      ck('c1', 'Map surface flows'),
      ck('c2', 'Identify catchment'),
      ck('c3', 'Locate springs'),
      ck('c4', 'Assess drainage'),
    ],
    decisionGroups: [
      dg('obj-1-dg1', 'Surface flows & catchment', ['c1', 'c2'], [
        'Water & Hydrology',
      ]),
      dg('obj-1-dg2', 'Springs & drainage', ['c3', 'c4'], ['Water & Hydrology']),
    ],
  });

  it('renders a sub-header per group with label and item count', () => {
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
        onToggleItem={noop}
      />,
    );
    const g1 = screen.getByTestId('plan-decision-group-obj-1-dg1');
    expect(within(g1).getByText('Surface flows & catchment')).toBeTruthy();
    expect(within(g1).getByText('2 items')).toBeTruthy();
    const g2 = screen.getByTestId('plan-decision-group-obj-1-dg2');
    expect(within(g2).getByText('Springs & drainage')).toBeTruthy();
  });

  it('buckets each item under its owning group only', () => {
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
        onToggleItem={noop}
      />,
    );
    const g1 = screen.getByTestId('plan-decision-group-obj-1-dg1');
    expect(within(g1).getByText('Map surface flows')).toBeTruthy();
    expect(within(g1).queryByText('Locate springs')).toBeNull();
    const g2 = screen.getByTestId('plan-decision-group-obj-1-dg2');
    expect(within(g2).getByText('Locate springs')).toBeTruthy();
  });

  it('renders observe-feed chips transcribed verbatim', () => {
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
        onToggleItem={noop}
      />,
    );
    const g1 = screen.getByTestId('plan-decision-group-obj-1-dg1');
    expect(within(g1).getByText('Water & Hydrology')).toBeTruthy();
  });

  it('still toggles a nested item (per-item completion model preserved)', () => {
    const onToggleItem = vi.fn();
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
        onToggleItem={onToggleItem}
      />,
    );
    fireEvent.click(screen.getByText('Map surface flows'));
    expect(onToggleItem).toHaveBeenCalledWith('c1');
  });
});

describe('DecisionChecklist - secondary-sourced group attribution', () => {
  it('shows an amber "Added by" chip on a patch-injected group', () => {
    const objective = mkObjective({
      checklist: [ck('c1', 'Base decision'), ck('p1', 'Domestic water demand')],
      decisionGroups: [
        dg('obj-1-dg1', 'Base group', ['c1']),
        dg('obj-1-dgres1', 'Domestic water', ['p1'], ['Water & Hydrology'],
          'residential'),
      ],
    });
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
        onToggleItem={noop}
      />,
    );
    const injected = screen.getByTestId('plan-decision-group-obj-1-dgres1');
    expect(injected.getAttribute('data-injected')).toBe('true');
    expect(within(injected).getByText(/Added by/)).toBeTruthy();
    // base group carries no injection marker
    const base = screen.getByTestId('plan-decision-group-obj-1-dg1');
    expect(base.getAttribute('data-injected')).toBeNull();
  });
});

describe('DecisionChecklist - flat fallback (no groups)', () => {
  it('renders a flat list and no group sub-headers when ungrouped', () => {
    const objective = mkObjective({
      checklist: [ck('c1', 'Lone decision'), ck('c2', 'Another decision')],
      decisionGroups: [],
    });
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
        onToggleItem={noop}
      />,
    );
    expect(screen.getByText('Lone decision')).toBeTruthy();
    expect(screen.getByText('Another decision')).toBeTruthy();
    expect(screen.queryByTestId(/plan-decision-group-/)).toBeNull();
  });
});

describe('DecisionChecklist - lossless partial-grouping fallback', () => {
  it('renders an unclaimed item under "Other decisions"', () => {
    const objective = mkObjective({
      checklist: [ck('c1', 'Grouped decision'), ck('c2', 'Orphan decision')],
      decisionGroups: [dg('obj-1-dg1', 'Only group', ['c1'])],
    });
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
        onToggleItem={noop}
      />,
    );
    const other = screen.getByTestId('plan-decision-group-ungrouped');
    expect(within(other).getByText('Other decisions')).toBeTruthy();
    expect(within(other).getByText('Orphan decision')).toBeTruthy();
  });
});

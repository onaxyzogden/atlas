/**
 * @vitest-environment happy-dom
 *
 * DecisionChecklist — Phase B faithful read-only re-skin (DecisionGroupCard
 * format). Asserts: each decision group renders as a card (header label +
 * collapsed "N items" footer + observe-feed chips); the amber "Added by <Type>"
 * attribution on a secondary-sourced group; the implicit single-group fallback
 * when an objective carries no decision groups; the lossless "Other decisions"
 * fallback for unclaimed items; that completion is DISPLAY-ONLY (no interactive
 * checkbox / no toggling) with completed items rendering ✓ + line-through; and
 * that production adornments (feeds / optional / Stage Zero derived) survive as
 * read-only chips.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import type {
  DecisionGroup,
  PlanDecisionChecklistItem,
  PlanStratumObjective,
} from '@ogden/shared';
import DecisionChecklist from '../DecisionChecklist.js';
import type { VisionDerivedMap } from '../visionProfileToChecklist.js';

function ck(
  id: string,
  label: string,
  extra: Partial<PlanDecisionChecklistItem> = {},
): PlanDecisionChecklistItem {
  return { id, label, feedsInto: [], optional: false, ...extra };
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

/** Expand a collapsed group card by clicking its header label. */
function expand(group: HTMLElement, label: string) {
  fireEvent.click(within(group).getByText(label));
}

describe('DecisionChecklist - grouped card render', () => {
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

  it('renders a card per group with its label and a collapsed item count', () => {
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
      />,
    );
    const g1 = screen.getByTestId('plan-decision-group-obj-1-dg1');
    expect(within(g1).getByText('Surface flows & catchment')).toBeTruthy();
    expect(within(g1).getByText('2 items')).toBeTruthy();
    const g2 = screen.getByTestId('plan-decision-group-obj-1-dg2');
    expect(within(g2).getByText('Springs & drainage')).toBeTruthy();
  });

  it('reveals each item under its owning group only when expanded', () => {
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
      />,
    );
    const g1 = screen.getByTestId('plan-decision-group-obj-1-dg1');
    // Collapsed: items hidden.
    expect(within(g1).queryByText('Map surface flows')).toBeNull();
    expand(g1, 'Surface flows & catchment');
    expect(within(g1).getByText('Map surface flows')).toBeTruthy();
    expect(within(g1).queryByText('Locate springs')).toBeNull();
  });

  it('renders observe-feed chips transcribed verbatim (collapsed footer)', () => {
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
      />,
    );
    const g1 = screen.getByTestId('plan-decision-group-obj-1-dg1');
    expect(within(g1).getByText('Water & Hydrology')).toBeTruthy();
  });

  it('is read-only — no interactive checkbox input is rendered', () => {
    const { container } = render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
      />,
    );
    const g1 = screen.getByTestId('plan-decision-group-obj-1-dg1');
    expand(g1, 'Surface flows & catchment');
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('reflects completion as ✓ + line-through (display-only)', () => {
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={['c1', 'c2']}
      />,
    );
    const g1 = screen.getByTestId('plan-decision-group-obj-1-dg1');
    // Whole group complete → bubble shows ✓ and the group label is struck.
    const label = within(g1).getByText('Surface flows & catchment');
    expect(label.style.textDecoration).toBe('line-through');
    expand(g1, 'Surface flows & catchment');
    const itemLabel = within(g1).getByText('Map surface flows');
    expect(itemLabel.style.textDecoration).toBe('line-through');
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
      />,
    );
    const injected = screen.getByTestId('plan-decision-group-obj-1-dgres1');
    expect(injected.getAttribute('data-injected')).toBe('true');
    expect(within(injected).getByText(/Added by/)).toBeTruthy();
    const base = screen.getByTestId('plan-decision-group-obj-1-dg1');
    expect(base.getAttribute('data-injected')).toBeNull();
  });
});

describe('DecisionChecklist - implicit single-group fallback (no groups)', () => {
  it('collapses an ungrouped objective into one implicit "Decisions" card', () => {
    const objective = mkObjective({
      checklist: [ck('c1', 'Lone decision'), ck('c2', 'Another decision')],
      decisionGroups: [],
    });
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
      />,
    );
    const card = screen.getByTestId('plan-decision-group-obj-1-all');
    expect(within(card).getByText('Decisions')).toBeTruthy();
    // Exactly one group card is rendered.
    expect(screen.getAllByTestId(/plan-decision-group-/)).toHaveLength(1);
    expand(card, 'Decisions');
    expect(within(card).getByText('Lone decision')).toBeTruthy();
    expect(within(card).getByText('Another decision')).toBeTruthy();
  });
});

describe('DecisionChecklist - lossless partial-grouping fallback', () => {
  it('renders an unclaimed item under an "Other decisions" card', () => {
    const objective = mkObjective({
      checklist: [ck('c1', 'Grouped decision'), ck('c2', 'Orphan decision')],
      decisionGroups: [dg('obj-1-dg1', 'Only group', ['c1'])],
    });
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
      />,
    );
    const other = screen.getByTestId('plan-decision-group-ungrouped');
    expect(within(other).getByText('Other decisions')).toBeTruthy();
    expand(other, 'Other decisions');
    expect(within(other).getByText('Orphan decision')).toBeTruthy();
  });
});

describe('DecisionChecklist - read-only adornments', () => {
  it('preserves feeds / optional / Stage Zero derived signals', () => {
    const objective = mkObjective({
      checklist: [
        ck('c1', 'Optional decision', { optional: true }),
        ck('c2', 'Derived decision'),
      ],
      decisionGroups: [],
    });
    const derivedEvidence: VisionDerivedMap = {
      c2: { isComplete: true, evidence: 'Captured in the Stage Zero Vision.' },
    };
    render(
      <DecisionChecklist
        objective={objective}
        status="active"
        completedItemIds={[]}
        derivedEvidence={derivedEvidence}
      />,
    );
    const card = screen.getByTestId('plan-decision-group-obj-1-all');
    expand(card, 'Decisions');
    expect(within(card).getByText('optional')).toBeTruthy();
    expect(within(card).getByText('From Stage Zero Vision')).toBeTruthy();
    expect(
      screen.getByTestId('plan-decision-evidence-c2'),
    ).toBeTruthy();
  });
});

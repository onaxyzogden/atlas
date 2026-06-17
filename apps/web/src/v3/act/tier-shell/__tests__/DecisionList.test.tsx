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
    deferredItemIds?: readonly string[];
    selectedItemId?: string | null;
  } = {},
) {
  const onSelectItem = vi.fn();
  render(
    <DecisionList
      objective={opts.objective ?? makeObjective()}
      completedItemIds={opts.completedItemIds ?? []}
      deferredItemIds={opts.deferredItemIds ?? []}
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

describe('DecisionList -- deferred (on hold) state', () => {
  it('marks a deferred item row data-deferred="true" and others not', () => {
    renderList({ deferredItemIds: ['item-purpose'] });
    const rows = screen.getAllByTestId('decision-item');
    const purpose = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-purpose',
    )!;
    const steward = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-steward',
    )!;
    expect(purpose.getAttribute('data-deferred')).toBe('true');
    expect(steward.getAttribute('data-deferred')).toBe('false');
  });

  it('lets "complete" win over "deferred" when an item is in both sets', () => {
    renderList({
      completedItemIds: ['item-purpose'],
      deferredItemIds: ['item-purpose'],
    });
    const rows = screen.getAllByTestId('decision-item');
    const purpose = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-purpose',
    )!;
    expect(purpose.getAttribute('data-complete')).toBe('true');
    expect(purpose.getAttribute('data-deferred')).toBe('false');
  });

  it('defaults every row to data-deferred="false" when the prop is omitted', () => {
    renderList();
    const rows = screen.getAllByTestId('decision-item');
    for (const row of rows) {
      expect(row.getAttribute('data-deferred')).toBe('false');
    }
  });
});

describe('DecisionList -- mode badges', () => {
  it('renders a mode badge with the human label when modeFor returns a mode', () => {
    const onSelectItem = vi.fn();
    render(
      <DecisionList
        objective={makeObjective()}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        modeFor={(itemId) => (itemId === 'item-criteria' ? 'mapEntry' : null)}
      />,
    );
    const badge = screen.getByTestId('mode-badge-item-criteria');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toMatch(/map \+ entry/i);
    // Other rows get no badge.
    expect(screen.queryByTestId('mode-badge-item-purpose')).toBeNull();
  });

  it('maps each raw mode key to its human label', () => {
    const onSelectItem = vi.fn();
    const obj = makeObjective({
      checklist: [
        { id: 'm-doc', label: 'Doc row', feedsInto: [], optional: false },
        { id: 'm-map', label: 'Map row', feedsInto: [], optional: false },
        { id: 'm-mapEntry', label: 'Map+entry row', feedsInto: [], optional: false },
        { id: 'm-decision', label: 'Decision row', feedsInto: [], optional: false },
      ],
    } as Partial<PlanStratumObjective>);
    const modes: Record<string, string> = {
      'm-doc': 'doc',
      'm-map': 'map',
      'm-mapEntry': 'mapEntry',
      'm-decision': 'decision',
    };
    render(
      <DecisionList
        objective={obj}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        modeFor={(itemId) => modes[itemId] ?? null}
      />,
    );
    expect(screen.getByTestId('mode-badge-m-doc').textContent).toMatch(/^Document$/);
    expect(screen.getByTestId('mode-badge-m-map').textContent).toMatch(/^Map$/);
    expect(screen.getByTestId('mode-badge-m-mapEntry').textContent).toMatch(
      /^Map \+ entry$/,
    );
    expect(screen.getByTestId('mode-badge-m-decision').textContent).toMatch(
      /^Decision$/,
    );
  });

  it('maps each vision artifact key to its label and per-kind data-kind', () => {
    const onSelectItem = vi.fn();
    const obj = makeObjective({
      checklist: [
        { id: 'v-purpose', label: 'Purpose row', feedsInto: [], optional: false },
        { id: 'v-criteria', label: 'Criteria row', feedsInto: [], optional: false },
        { id: 'v-steward', label: 'Steward row', feedsInto: [], optional: false },
        { id: 'v-labour', label: 'Labour row', feedsInto: [], optional: false },
        { id: 'v-capital', label: 'Capital row', feedsInto: [], optional: false },
        { id: 'v-constraints', label: 'Constraints row', feedsInto: [], optional: false },
        { id: 'v-classify', label: 'Classify row', feedsInto: [], optional: false },
        { id: 'v-assumptions', label: 'Assumptions row', feedsInto: [], optional: false },
      ],
    } as Partial<PlanStratumObjective>);
    const modes: Record<string, string> = {
      'v-purpose': 'vs-purpose',
      'v-criteria': 'vs-criteria',
      'v-steward': 'vs-steward',
      'v-labour': 'vs-labour',
      'v-capital': 'vs-capital',
      'v-constraints': 'vs-constraints',
      'v-classify': 'vs-classify',
      'v-assumptions': 'vs-assumptions',
    };
    render(
      <DecisionList
        objective={obj}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        modeFor={(itemId) => modes[itemId] ?? null}
      />,
    );
    expect(screen.getByTestId('mode-badge-v-purpose').textContent).toMatch(/^Purpose statement$/);
    expect(screen.getByTestId('mode-badge-v-criteria').textContent).toMatch(/^Success criteria$/);
    expect(screen.getByTestId('mode-badge-v-steward').textContent).toMatch(/^Steward$/);
    expect(screen.getByTestId('mode-badge-v-labour').textContent).toMatch(/^Labour inventory$/);
    expect(screen.getByTestId('mode-badge-v-capital').textContent).toMatch(/^Capital inventory$/);
    expect(screen.getByTestId('mode-badge-v-constraints').textContent).toMatch(/^Non-negotiables$/);
    expect(screen.getByTestId('mode-badge-v-classify').textContent).toMatch(/^Committed \/ aspirational$/);
    expect(screen.getByTestId('mode-badge-v-assumptions').textContent).toMatch(/^Assumptions register$/);
    // Per-kind color families surface via data-kind (mockup palette).
    expect(screen.getByTestId('mode-badge-v-purpose').getAttribute('data-kind')).toBe('doc');
    expect(screen.getByTestId('mode-badge-v-assumptions').getAttribute('data-kind')).toBe('doc');
    expect(screen.getByTestId('mode-badge-v-criteria').getAttribute('data-kind')).toBe('assess');
    expect(screen.getByTestId('mode-badge-v-steward').getAttribute('data-kind')).toBe('neutral');
    expect(screen.getByTestId('mode-badge-v-labour').getAttribute('data-kind')).toBe('labour');
    expect(screen.getByTestId('mode-badge-v-capital').getAttribute('data-kind')).toBe('capital');
    expect(screen.getByTestId('mode-badge-v-constraints').getAttribute('data-kind')).toBe('decision');
    expect(screen.getByTestId('mode-badge-v-classify').getAttribute('data-kind')).toBe('decision');
  });

  it('maps each stakeholder mode key to its human label', () => {
    const onSelectItem = vi.fn();
    const obj = makeObjective({
      checklist: [
        { id: 's-mapContact', label: 'MapContact row', feedsInto: [], optional: false },
        { id: 's-contact', label: 'Contact row', feedsInto: [], optional: false },
        { id: 's-cultural', label: 'Cultural row', feedsInto: [], optional: false },
        { id: 's-annotate', label: 'Annotate row', feedsInto: [], optional: false },
      ],
    } as Partial<PlanStratumObjective>);
    const modes: Record<string, string> = {
      's-mapContact': 'mapContact',
      's-contact': 'contact',
      's-cultural': 'cultural',
      's-annotate': 'annotate',
    };
    render(
      <DecisionList
        objective={obj}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        modeFor={(itemId) => modes[itemId] ?? null}
      />,
    );
    expect(screen.getByTestId('mode-badge-s-mapContact').textContent).toMatch(/^Map \+ contact$/);
    expect(screen.getByTestId('mode-badge-s-contact').textContent).toMatch(/^Contact entry$/);
    expect(screen.getByTestId('mode-badge-s-cultural').textContent).toMatch(/^Cultural$/);
    expect(screen.getByTestId('mode-badge-s-annotate').textContent).toMatch(/^Annotate register$/);
  });

  it('BR9: maps all 5 boundary re-decompose mode keys to their human labels', () => {
    const onSelectItem = vi.fn();
    const obj = makeObjective({
      checklist: [
        { id: 'b-boundaryRegister', label: 'Boundary register row', feedsInto: [], optional: false },
        { id: 'b-rowRegister', label: 'Rights of way row', feedsInto: [], optional: false },
        { id: 'b-tenancyRegister', label: 'Tenancy register row', feedsInto: [], optional: false },
        { id: 'b-titleRestrictionChecker', label: 'Title checker row', feedsInto: [], optional: false },
        { id: 'b-landHistoryRegister', label: 'Land history row', feedsInto: [], optional: false },
      ],
    } as Partial<PlanStratumObjective>);
    const modes: Record<string, string> = {
      'b-boundaryRegister': 'boundaryRegister',
      'b-rowRegister': 'rowRegister',
      'b-tenancyRegister': 'tenancyRegister',
      'b-titleRestrictionChecker': 'titleRestrictionChecker',
      'b-landHistoryRegister': 'landHistoryRegister',
    };
    render(
      <DecisionList
        objective={obj}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        modeFor={(itemId) => modes[itemId] ?? null}
      />,
    );
    expect(screen.getByTestId('mode-badge-b-boundaryRegister').textContent).toMatch(
      /^Boundary register$/,
    );
    expect(screen.getByTestId('mode-badge-b-rowRegister').textContent).toMatch(/^Rights of way$/);
    expect(screen.getByTestId('mode-badge-b-tenancyRegister').textContent).toMatch(
      /^Tenancy register$/,
    );
    expect(screen.getByTestId('mode-badge-b-titleRestrictionChecker').textContent).toMatch(
      /^Title conditions$/,
    );
    expect(screen.getByTestId('mode-badge-b-landHistoryRegister').textContent).toMatch(
      /^Land history$/,
    );
  });

  it('LG9: maps all 8 legal-governance mode keys to their human labels', () => {
    const onSelectItem = vi.fn();
    const obj = makeObjective({
      checklist: [
        { id: 'lg-legalEntityPicker', label: 'Entity picker row', feedsInto: [], optional: false },
        { id: 'lg-jurisdiction', label: 'Jurisdiction row', feedsInto: [], optional: false },
        { id: 'lg-entityDecisionRecord', label: 'Decision record row', feedsInto: [], optional: false },
        { id: 'lg-tenureModel', label: 'Tenure model row', feedsInto: [], optional: false },
        { id: 'lg-decisionFramework', label: 'Decision framework row', feedsInto: [], optional: false },
        { id: 'lg-financialGovernance', label: 'Financial governance row', feedsInto: [], optional: false },
        { id: 'lg-membershipRegister', label: 'Membership register row', feedsInto: [], optional: false },
        { id: 'lg-legalAdviceGate', label: 'Legal advice gate row', feedsInto: [], optional: false },
      ],
    } as Partial<PlanStratumObjective>);
    const modes: Record<string, string> = {
      'lg-legalEntityPicker': 'legalEntityPicker',
      'lg-jurisdiction': 'jurisdiction',
      'lg-entityDecisionRecord': 'entityDecisionRecord',
      'lg-tenureModel': 'tenureModel',
      'lg-decisionFramework': 'decisionFramework',
      'lg-financialGovernance': 'financialGovernance',
      'lg-membershipRegister': 'membershipRegister',
      'lg-legalAdviceGate': 'legalAdviceGate',
    };
    render(
      <DecisionList
        objective={obj}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        modeFor={(itemId) => modes[itemId] ?? null}
      />,
    );
    expect(screen.getByTestId('mode-badge-lg-legalEntityPicker').textContent).toMatch(/^Entity options$/);
    expect(screen.getByTestId('mode-badge-lg-jurisdiction').textContent).toMatch(/^Jurisdiction$/);
    expect(screen.getByTestId('mode-badge-lg-entityDecisionRecord').textContent).toMatch(
      /^Decision record$/,
    );
    expect(screen.getByTestId('mode-badge-lg-tenureModel').textContent).toMatch(/^Tenure model$/);
    expect(screen.getByTestId('mode-badge-lg-decisionFramework').textContent).toMatch(
      /^Decision framework$/,
    );
    expect(screen.getByTestId('mode-badge-lg-financialGovernance').textContent).toMatch(
      /^Financial governance$/,
    );
    expect(screen.getByTestId('mode-badge-lg-membershipRegister').textContent).toMatch(
      /^Membership register$/,
    );
    expect(screen.getByTestId('mode-badge-lg-legalAdviceGate').textContent).toMatch(
      /^Legal advice gate$/,
    );
  });

  it('renders NO mode badge for any row when modeFor is absent', () => {
    renderList();
    expect(screen.queryByTestId(/^mode-badge-/)).toBeNull();
    // sanity: queryAllByTestId with a regex returns an empty array.
    const all = screen
      .getAllByTestId('decision-item')
      .map((r) => r.getAttribute('data-item-id'));
    for (const id of all) {
      expect(screen.queryByTestId(`mode-badge-${id}`)).toBeNull();
    }
  });
});

describe('DecisionList -- groups + badge icons + feedHint (BR6)', () => {
  // A 2-group objective mirroring the boundary mixed-mode partition.
  function makeGroupedObjective(): PlanStratumObjective {
    return makeObjective({
      checklist: [
        { id: 'i-a', label: 'A', feedsInto: [], optional: false },
        { id: 'i-b', label: 'B', feedsInto: [], optional: false },
        {
          id: 'i-c',
          label: 'C',
          feedsInto: [],
          optional: false,
          feedHint: 'Feeds Plan: Land use constraint map',
        },
      ],
      decisionGroups: [
        {
          id: 'g1',
          label: 'Title & boundary',
          itemIds: ['i-a', 'i-b'],
          observeFeeds: [],
          sourceSecondaryId: null,
        },
        {
          id: 'g2',
          label: 'Legal & permit obligations',
          itemIds: ['i-c'],
          observeFeeds: [],
          sourceSecondaryId: null,
        },
      ],
    } as Partial<PlanStratumObjective>);
  }

  it('renders NO group dividers when showGroups is omitted (flat list preserved)', () => {
    const onSelectItem = vi.fn();
    render(
      <DecisionList
        objective={makeGroupedObjective()}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
      />,
    );
    expect(screen.queryAllByTestId('decision-group')).toHaveLength(0);
    // All rows still render.
    expect(screen.getAllByTestId('decision-item')).toHaveLength(3);
  });

  it('renders one divider per group, in order, with the group labels when showGroups is set', () => {
    const onSelectItem = vi.fn();
    render(
      <DecisionList
        objective={makeGroupedObjective()}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        showGroups
      />,
    );
    const dividers = screen.getAllByTestId('decision-group');
    expect(dividers.map((d) => d.textContent)).toEqual([
      'Title & boundary',
      'Legal & permit obligations',
    ]);
  });

  it('renders an icon inside the badge for an iconed (boundary) mode', () => {
    const onSelectItem = vi.fn();
    const obj = makeObjective({
      checklist: [
        { id: 'm-doc', label: 'Doc row', feedsInto: [], optional: false },
      ],
    } as Partial<PlanStratumObjective>);
    render(
      <DecisionList
        objective={obj}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        modeFor={(itemId) => (itemId === 'm-doc' ? 'doc' : null)}
      />,
    );
    const badge = screen.getByTestId('mode-badge-m-doc');
    // The mode label is still present...
    expect(badge.textContent).toMatch(/Document/);
    // ...and an icon svg is rendered alongside it (lucide stub renders <svg>).
    expect(badge.querySelector('svg')).toBeTruthy();
  });

  it('renders the verbatim feedHint chip (no "Feeds " double-prefix)', () => {
    const onSelectItem = vi.fn();
    render(
      <DecisionList
        objective={makeGroupedObjective()}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
      />,
    );
    // The hint text renders exactly as authored.
    expect(screen.getByText('Feeds Plan: Land use constraint map')).toBeTruthy();
    // It is NOT wrapped with a second "Feeds " prefix.
    expect(
      screen.queryByText('Feeds Feeds Plan: Land use constraint map'),
    ).toBeNull();
  });

  it('prefers feedHint over a feedsInto-derived chip on the same item', () => {
    const onSelectItem = vi.fn();
    const obj = makeObjective({
      checklist: [
        {
          id: 'i-both',
          label: 'Both',
          feedsInto: ['s2-land-reading'],
          optional: false,
          feedHint: 'Feeds Plan: Custom hint',
        },
      ],
    } as Partial<PlanStratumObjective>);
    render(
      <DecisionList
        objective={obj}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
      />,
    );
    expect(screen.getByText('Feeds Plan: Custom hint')).toBeTruthy();
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

describe('DecisionList -- outcome titles (Act-only)', () => {
  it('renders a safe-verb label as its derived OUTCOME form, not the imperative', () => {
    renderList();
    const rows = screen.getAllByTestId('decision-item');
    const criteria = rows.find(
      (r) => r.getAttribute('data-item-id') === 'item-criteria',
    )!;
    // Fixture label "Define 3-5 measurable success criteria" -> outcome form.
    expect(
      within(criteria).getByText('3-5 measurable success criteria'),
    ).toBeTruthy();
    // The imperative form is NOT rendered in the row.
    expect(
      within(criteria).queryByText('Define 3-5 measurable success criteria'),
    ).toBeNull();
  });

  it('renders an explicit outcomeTitle override verbatim (transform bypassed)', () => {
    const obj = makeObjective({
      checklist: [
        {
          id: 'i-override',
          label: 'Define the success criteria',
          outcomeTitle: 'Success scorecard',
          feedsInto: [],
          optional: false,
        },
      ],
    } as Partial<PlanStratumObjective>);
    renderList({ objective: obj });
    const row = screen.getAllByTestId('decision-item')[0]!;
    expect(within(row).getByText('Success scorecard')).toBeTruthy();
    // Neither the imperative label nor its derived form leaks through.
    expect(within(row).queryByText('Define the success criteria')).toBeNull();
    expect(within(row).queryByText('Success criteria')).toBeNull();
  });

  it('renders a decision-framing ("whether") label verbatim', () => {
    const label = 'Decide whether to offer a season pass (default: none)';
    const obj = makeObjective({
      checklist: [{ id: 'i-fiqh', label, feedsInto: [], optional: false }],
    } as Partial<PlanStratumObjective>);
    renderList({ objective: obj });
    const row = screen.getAllByTestId('decision-item')[0]!;
    expect(within(row).getByText(label)).toBeTruthy();
  });
});

describe('DecisionList -- dual outputs (Plan Reception observe chip)', () => {
  // The Reception (Tier-2) objective carries BOTH an observeOutput (the survey
  // record it produces) and an actHandoff. The chips are gated independently:
  // showObserveOutput (teal) for the survey record, showActHandoff (amber).
  function makeReceptionObjective(): PlanStratumObjective {
    return makeObjective({
      id: 's3-hydrology',
      stratumId: 's3-systems-reading',
      observeOutput: 'Hydrology Survey Record',
      actHandoff: 'Water Infrastructure Brief',
    } as Partial<PlanStratumObjective>);
  }

  it('renders the teal Observe Output chip when showObserveOutput is set', () => {
    const onSelectItem = vi.fn();
    render(
      <DecisionList
        objective={makeReceptionObjective()}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        showObserveOutput
      />,
    );
    const chip = screen.getByTestId('observe-output');
    expect(chip.textContent).toMatch(/Observe output/i);
    expect(chip.textContent).toMatch(/Hydrology Survey Record/);
  });

  it('renders Observe + Act chips together when both flags are set', () => {
    const onSelectItem = vi.fn();
    render(
      <DecisionList
        objective={makeReceptionObjective()}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        showObserveOutput
        showActHandoff
      />,
    );
    expect(screen.getByTestId('observe-output')).toBeTruthy();
    expect(screen.getByTestId('act-handoff')).toBeTruthy();
  });

  it('omits the Observe chip when showObserveOutput is absent (Act parity)', () => {
    const onSelectItem = vi.fn();
    render(
      <DecisionList
        objective={makeReceptionObjective()}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
      />,
    );
    expect(screen.queryByTestId('observe-output')).toBeNull();
  });

  it('omits the Observe chip when the flag is set but no observeOutput is authored', () => {
    const onSelectItem = vi.fn();
    render(
      <DecisionList
        objective={makeObjective({ observeOutput: undefined })}
        completedItemIds={[]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        showObserveOutput
      />,
    );
    expect(screen.queryByTestId('observe-output')).toBeNull();
  });
});

/**
 * @vitest-environment happy-dom
 *
 * ActTierZeroWorkbench -- the 3-pane inline Tier-0 container: LEFT objectives
 * rail + next-box, CENTER DecisionList, RIGHT DecisionWorkingPanel. It owns ONLY
 * the active-decision selection state and the pure item->DecisionPanelTarget
 * derivation. All store reads/writes are lifted to the parent; option resolution
 * is pure and done here from the project type-id props.
 *
 * Verified behaviours (PB6 TDD checklist):
 *   1. renders all 3 panes (left rail "Objectives", center "Your Decisions", right panel).
 *   2. left rail lists each objective's title + "{done} / {total} decisions made";
 *      the active objective row has data-active="true".
 *   3. next-box renders "Unlocks Tier 1 -- Land Reading" + correct remaining/total counts.
 *   4. default selection = first checklist item -> right panel header shows its label.
 *   5. clicking a different center decision row updates the right panel.
 *   6. clicking an objective row in the left rail calls onSelectObjective.
 *   7. selecting the success-criteria item shows SuccessCriteriaCapture + at least one chip.
 *   8. onRecord is called with the SELECTED itemId + a 3-criteria value.
 *   9. a completed selected item shows the "Recorded" badge in the panel.
 *
 * Lucide forwardRef icons are replaced with clean <svg> stubs (established
 * pattern; the children import many icons so the mock is a generic catch-all).
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

import ActTierZeroWorkbench, {
  type ActTierZeroWorkbenchProps,
} from '../ActTierZeroWorkbench.js';

// ---------------------------------------------------------------------------
// Fixtures: the active objective uses REAL catalog ids so buildDecisionTarget
// resolves tools (purpose -> single text; success-criteria -> repeatable
// hybrid w/ successCriteriaByType; labour -> multi-field). A second objective
// gives the rail something to switch to and count.
// ---------------------------------------------------------------------------

const ACTIVE_OBJECTIVE: PlanStratumObjective = {
  id: 's1-vision',
  stratumId: 's1-project-foundation',
  title: 'Define vision, goals & capacity',
  focusedQuestion: 'What is this project for, and what does success look like?',
  prerequisiteObjectiveIds: [],
  defaultOverlayBundle: [],
  checklist: [
    { id: 's1-vision-c1', label: 'State the primary purpose', feedsInto: [], optional: false },
    { id: 's1-vision-c2', label: 'Define measurable success criteria', feedsInto: [], optional: false },
    { id: 's1-vision-labour', label: 'Inventory available labour', feedsInto: [], optional: true },
  ],
  outputKind: 'plan-decision-record',
  decisionGroups: [],
  completionGate: 'A bounded, evidence-grounded vision is approved by the steward.',
} as PlanStratumObjective;

const OTHER_OBJECTIVE: PlanStratumObjective = {
  id: 's1-foundation',
  stratumId: 's1-project-foundation',
  title: 'State the primary purpose',
  focusedQuestion: 'Why does this project exist?',
  prerequisiteObjectiveIds: [],
  defaultOverlayBundle: [],
  checklist: [
    { id: 'foundation-c1', label: 'Purpose one-liner', feedsInto: [], optional: false },
    { id: 'foundation-c2', label: 'Confirm steward', feedsInto: [], optional: false },
  ],
  outputKind: 'plan-decision-record',
  decisionGroups: [],
} as PlanStratumObjective;

function renderWorkbench(
  overrides: Partial<ActTierZeroWorkbenchProps> = {},
): {
  onSelectObjective: ReturnType<typeof vi.fn>;
  onRecord: ReturnType<typeof vi.fn>;
  onSaveRationale: ReturnType<typeof vi.fn>;
  onToggleDefer: ReturnType<typeof vi.fn>;
} {
  const onSelectObjective = vi.fn();
  const onRecord = vi.fn();
  const onSaveRationale = vi.fn();
  const onToggleDefer = vi.fn();
  const props: ActTierZeroWorkbenchProps = {
    projectId: 'proj-1',
    objectives: [OTHER_OBJECTIVE, ACTIVE_OBJECTIVE],
    activeObjectiveId: ACTIVE_OBJECTIVE.id,
    onSelectObjective,
    primaryTypeId: 'homestead',
    secondaryTypeIds: [],
    progressByObjective: {},
    formValues: {},
    rationales: {},
    deferredItems: {},
    onRecord,
    onSaveRationale,
    onToggleDefer,
    ...overrides,
  };
  render(<ActTierZeroWorkbench {...props} />);
  return { onSelectObjective, onRecord, onSaveRationale, onToggleDefer };
}

describe('ActTierZeroWorkbench -- panes', () => {
  it('renders all three panes (left rail, center, right)', () => {
    renderWorkbench();
    expect(screen.getByText('Objectives')).toBeTruthy();
    expect(screen.getByText(/your decisions/i)).toBeTruthy();
    // Right panel header eyebrow.
    expect(screen.getByText(/working on/i)).toBeTruthy();
  });
});

describe('ActTierZeroWorkbench -- left rail', () => {
  it('lists each objective title with its decision counts', () => {
    renderWorkbench({
      progressByObjective: { 's1-vision': ['s1-vision-c1'] },
    });
    // The active title + count also appear in the center DecisionList, so scope
    // each assertion to the corresponding rail row.
    const activeRow = document.querySelector(
      '[data-objective-id="s1-vision"]',
    ) as HTMLElement;
    const otherRow = document.querySelector(
      '[data-objective-id="s1-foundation"]',
    ) as HTMLElement;
    expect(within(activeRow).getByText('Define vision, goals & capacity')).toBeTruthy();
    // active objective: 1 of 3 done
    expect(within(activeRow).getByText(/1 \/ 3 decisions made/i)).toBeTruthy();
    // other objective: 0 of 2 done
    expect(within(otherRow).getByText(/0 \/ 2 decisions made/i)).toBeTruthy();
  });

  it('marks the active objective row data-active="true"', () => {
    renderWorkbench();
    const active = document.querySelector('[data-active="true"]');
    expect(active).toBeTruthy();
    expect(active!.textContent).toContain('Define vision, goals & capacity');
  });
});

describe('ActTierZeroWorkbench -- next-box', () => {
  it('renders the unlock line and the remaining/total objectives count', () => {
    // OTHER (0/2) and ACTIVE (3/3) -> 1 of 2 still to decide.
    renderWorkbench({
      progressByObjective: {
        's1-vision': ['s1-vision-c1', 's1-vision-c2', 's1-vision-labour'],
      },
    });
    expect(screen.getByText(/unlocks tier 1 -- land reading/i)).toBeTruthy();
    expect(
      screen.getByText(/1 of 2 objectives still to decide/i),
    ).toBeTruthy();
  });
});

describe('ActTierZeroWorkbench -- selection', () => {
  it('defaults selection to the first checklist item (right panel shows its label)', () => {
    renderWorkbench();
    // The right panel header carries the selected decision label.
    const headings = screen.getAllByText('State the primary purpose');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('updates the right panel when a different center decision row is clicked', () => {
    renderWorkbench();
    const rows = screen.getAllByTestId('decision-item');
    const sc = rows.find(
      (r) => r.getAttribute('data-item-id') === 's1-vision-c2',
    )!;
    fireEvent.click(sc);
    // Success-criteria capture surfaces "Suggested criteria".
    expect(screen.getByText(/suggested criteria/i)).toBeTruthy();
  });

  it('calls onSelectObjective when a left-rail objective row is clicked', () => {
    const { onSelectObjective } = renderWorkbench();
    // The rail row for OTHER_OBJECTIVE (id s1-foundation).
    const row = document.querySelector(
      '[data-objective-id="s1-foundation"]',
    ) as Element;
    expect(row).toBeTruthy();
    fireEvent.click(row);
    expect(onSelectObjective).toHaveBeenCalledWith('s1-foundation');
  });
});

describe('ActTierZeroWorkbench -- success criteria', () => {
  it('shows SuccessCriteriaCapture chips for resolved options when the SC item is selected', () => {
    renderWorkbench();
    const rows = screen.getAllByTestId('decision-item');
    const sc = rows.find(
      (r) => r.getAttribute('data-item-id') === 's1-vision-c2',
    )!;
    fireEvent.click(sc);
    expect(screen.getByText(/suggested criteria/i)).toBeTruthy();
    // _base success-criteria includes "Baseline conditions recorded".
    expect(screen.getByText(/baseline conditions recorded/i)).toBeTruthy();
  });

  it('calls onRecord with the SELECTED itemId and a 3-criteria value', () => {
    const { onRecord } = renderWorkbench({
      formValues: { 's1-vision-c2': { criteria: ['a', 'b', 'c'] } },
    });
    const rows = screen.getAllByTestId('decision-item');
    const sc = rows.find(
      (r) => r.getAttribute('data-item-id') === 's1-vision-c2',
    )!;
    fireEvent.click(sc);
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [itemId, value] = onRecord.mock.calls[0]!;
    expect(itemId).toBe('s1-vision-c2');
    expect((value.criteria as string[]).length).toBe(3);
  });
});

describe('ActTierZeroWorkbench -- rationale flush on switch', () => {
  it('flushes the typed rationale to the OUTGOING item id when a different decision is clicked', () => {
    const { onSaveRationale } = renderWorkbench();
    // Default selection is the first checklist item (s1-vision-c1).
    const ta = screen.getByLabelText(/rationale/i);
    fireEvent.change(ta, {
      target: { value: 'Reasoning bound to the first decision.' },
    });
    expect(onSaveRationale).not.toHaveBeenCalled();
    // Click a DIFFERENT decision row WITHOUT blurring the textarea.
    const rows = screen.getAllByTestId('decision-item');
    const sc = rows.find(
      (r) => r.getAttribute('data-item-id') === 's1-vision-c2',
    )!;
    fireEvent.click(sc);
    // The save must land on the OUTGOING item id (s1-vision-c1), not the
    // newly-selected one.
    expect(onSaveRationale).toHaveBeenCalledTimes(1);
    expect(onSaveRationale).toHaveBeenCalledWith(
      's1-vision-c1',
      'Reasoning bound to the first decision.',
    );
  });
});

describe('ActTierZeroWorkbench -- recorded badge', () => {
  it('shows the "Recorded" badge when the selected item is in progress', () => {
    renderWorkbench({
      progressByObjective: { 's1-vision': ['s1-vision-c1'] },
    });
    // Default selection is the first item (s1-vision-c1), which is complete.
    expect(screen.getByText(/^recorded$/i)).toBeTruthy();
  });
});

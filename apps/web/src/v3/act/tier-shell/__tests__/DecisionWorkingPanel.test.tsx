/**
 * @vitest-environment happy-dom
 *
 * DecisionWorkingPanel -- the RIGHT pane of the Tier-0 workbench: the working
 * surface for the currently-selected decision. Presentational + locally-drafted;
 * all persistence is lifted to the parent via callbacks. It owns a local working
 * draft seeded from persisted values and re-seeded when the selected decision
 * changes.
 *
 * Verified behaviours (PB5 TDD checklist):
 *   1. decision === null -> empty-state text, no Record button.
 *   2. isSuccessCriteria -> renders SuccessCriteriaCapture ("Suggested criteria").
 *   3. fields present (not success-criteria) -> renders that field's label
 *      (VisionFormFields path); no SuccessCriteriaCapture chips.
 *   4. no fields -> renders a <textarea> fallback (queried by aria-label).
 *   5. Record disabled when invalid; enabled when valid; click emits value +
 *      non-empty summary.
 *   6. editing the rationale textarea + blur -> onSaveRationale with typed text.
 *   7. defer button click -> onToggleDefer with !deferred; data-deferred reflects
 *      the prop.
 *   8. feeds callout renders feedsLabel when provided; absent when null.
 *   9. recorded -> a "Recorded" badge appears.
 *
 * Lucide forwardRef icons are replaced with clean <svg> stubs (established
 * pattern; mirrors DecisionList.test). The mock is a generic catch-all so the
 * children (SuccessCriteriaCapture, VisionFormFields) that import their own
 * icons render without error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { CriterionOption } from '@ogden/shared';
import type { FormFieldSpec } from '../actToolCatalog.js';

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

import DecisionWorkingPanel, {
  type DecisionPanelTarget,
  type DecisionWorkingPanelProps,
} from '../DecisionWorkingPanel.js';
import { decode, summariseLabour } from '../LabourInventoryCapture.js';
import {
  decodeBoundary,
  summariseBoundary,
} from '../BoundaryCapture.js';
import { useStakeholderRegisterStore } from '../../../../store/stakeholderRegisterStore.js';

const SUCCESS_OPTIONS: readonly CriterionOption[] = [
  { text: 'Infiltration rate doubles on surveyed zones', domain: 'ecological' },
  { text: 'Operating budget breaks even by year 2', domain: 'economic' },
  { text: 'Steward logs weekly observations', domain: 'stewardship' },
];

const TEXT_FIELDS: readonly FormFieldSpec[] = [
  { kind: 'text', key: 'purpose', label: 'Primary purpose', required: true },
];

// The real success-criteria form tool (formId 's1-vision-c2') carries a
// repeatable `criteria` leaf min3/max5; isFormValueValid + summariseFormValue
// run against it. The fixture mirrors that so the panel's validity/summary
// derivation is exercised faithfully.
const CRITERIA_FIELDS: readonly FormFieldSpec[] = [
  {
    kind: 'repeatable',
    key: 'criteria',
    label: 'Success criteria',
    min: 3,
    max: 5,
    item: { kind: 'text', label: 'Criterion' },
  },
];

function makeDecision(
  overrides: Partial<DecisionPanelTarget> = {},
): DecisionPanelTarget {
  const base: DecisionPanelTarget = {
    itemId: 's1-vision-c2',
    label: 'Define 3-5 measurable success criteria',
    ...overrides,
  };
  // A success-criteria decision carries its repeatable criteria fields (as in
  // the real catalogue) unless the caller supplied explicit fields.
  if (base.isSuccessCriteria && base.fields === undefined) {
    return { ...base, fields: CRITERIA_FIELDS };
  }
  return base;
}

function renderPanel(
  overrides: Partial<DecisionWorkingPanelProps> = {},
): {
  onRecord: ReturnType<typeof vi.fn>;
  onSaveRationale: ReturnType<typeof vi.fn>;
  onToggleDefer: ReturnType<typeof vi.fn>;
} {
  const onRecord = vi.fn();
  const onSaveRationale = vi.fn();
  const onToggleDefer = vi.fn();
  const props: DecisionWorkingPanelProps = {
    projectId: 'proj-test',
    decision: makeDecision(),
    resolveOptions: () => [],
    successCriteriaOptions: SUCCESS_OPTIONS,
    initialValue: {},
    initialRationale: '',
    deferred: false,
    recorded: false,
    onRecord,
    onSaveRationale,
    onToggleDefer,
    ...overrides,
  };
  render(<DecisionWorkingPanel {...props} />);
  return { onRecord, onSaveRationale, onToggleDefer };
}

describe('DecisionWorkingPanel -- empty state', () => {
  it('renders the empty-state prompt and no Record button when decision is null', () => {
    renderPanel({ decision: null });
    expect(
      screen.getByText(/select a decision from the list to work through it here/i),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /record this decision/i })).toBeNull();
  });
});

describe('DecisionWorkingPanel -- body router', () => {
  it('renders SuccessCriteriaCapture for an isSuccessCriteria decision', () => {
    renderPanel({
      decision: makeDecision({ isSuccessCriteria: true }),
    });
    expect(screen.getByText(/suggested criteria/i)).toBeTruthy();
  });

  it('renders VisionFormFields (field label) for a fielded, non-success-criteria decision', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-c1',
        label: 'State the primary purpose',
        fields: TEXT_FIELDS,
      }),
    });
    expect(screen.getByText('Primary purpose')).toBeTruthy();
    // No success-criteria chips on this path.
    expect(screen.queryByText(/suggested criteria/i)).toBeNull();
  });

  it('renders a textarea fallback when there are no fields', () => {
    const label = 'Confirm the primary steward';
    renderPanel({
      decision: makeDecision({ itemId: 's1-vision-steward', label }),
    });
    expect(screen.getByLabelText(label)).toBeTruthy();
  });
});

describe('DecisionWorkingPanel -- record gate', () => {
  it('disables Record when the success-criteria draft is invalid', () => {
    renderPanel({
      decision: makeDecision({ isSuccessCriteria: true }),
      initialValue: { criteria: ['only one'] },
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('data-locked')).toBe('true');
  });

  it('enables Record with 3 success criteria and emits value + summary on click', () => {
    const { onRecord } = renderPanel({
      decision: makeDecision({ isSuccessCriteria: true }),
      initialValue: { criteria: ['alpha', 'beta', 'gamma'] },
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('data-locked')).toBe('false');
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [value, summary] = onRecord.mock.calls[0]!;
    expect(value.criteria).toEqual(['alpha', 'beta', 'gamma']);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('disables Record for an empty textarea and enables it once text is entered', () => {
    const label = 'Confirm the primary steward';
    const { onRecord } = renderPanel({
      decision: makeDecision({ itemId: 's1-vision-steward', label }),
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    const ta = screen.getByLabelText(label);
    fireEvent.change(ta, { target: { value: 'Aisha is the primary steward' } });
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [value, summary] = onRecord.mock.calls[0]!;
    expect(value.text).toBe('Aisha is the primary steward');
    expect(summary).toBe('Aisha is the primary steward');
  });
});

describe('DecisionWorkingPanel -- rationale', () => {
  it('calls onSaveRationale with the typed text on blur', () => {
    const { onSaveRationale } = renderPanel();
    const ta = screen.getByLabelText(/rationale/i);
    fireEvent.change(ta, { target: { value: 'These reflect the dryland baseline.' } });
    fireEvent.blur(ta);
    expect(onSaveRationale).toHaveBeenCalledWith('These reflect the dryland baseline.');
  });

  it('flushes the typed rationale when the decision switches without a blur', () => {
    const onSaveRationale = vi.fn();
    const decisionA = makeDecision({ itemId: 's1-vision-c1', isSuccessCriteria: true });
    const decisionB = makeDecision({ itemId: 's1-vision-c2', isSuccessCriteria: true });
    const props: DecisionWorkingPanelProps = {
      projectId: 'proj-test',
      decision: decisionA,
      resolveOptions: () => [],
      successCriteriaOptions: SUCCESS_OPTIONS,
      initialValue: {},
      initialRationale: '',
      deferred: false,
      recorded: false,
      onRecord: vi.fn(),
      onSaveRationale,
      onToggleDefer: vi.fn(),
    };
    const { rerender } = render(<DecisionWorkingPanel {...props} />);
    const ta = screen.getByLabelText(/rationale/i);
    // Type but deliberately do NOT blur.
    fireEvent.change(ta, { target: { value: 'Drafted for decision A.' } });
    expect(onSaveRationale).not.toHaveBeenCalled();
    // Switch to decision B (different itemId) without moving focus.
    rerender(<DecisionWorkingPanel {...props} decision={decisionB} />);
    expect(onSaveRationale).toHaveBeenCalledTimes(1);
    expect(onSaveRationale).toHaveBeenCalledWith('Drafted for decision A.');
  });

  it('does not save when the rationale is unchanged across a decision switch', () => {
    const onSaveRationale = vi.fn();
    const decisionA = makeDecision({ itemId: 's1-vision-c1', isSuccessCriteria: true });
    const decisionB = makeDecision({ itemId: 's1-vision-c2', isSuccessCriteria: true });
    const props: DecisionWorkingPanelProps = {
      projectId: 'proj-test',
      decision: decisionA,
      resolveOptions: () => [],
      successCriteriaOptions: SUCCESS_OPTIONS,
      initialValue: {},
      initialRationale: 'keep',
      deferred: false,
      recorded: false,
      onRecord: vi.fn(),
      onSaveRationale,
      onToggleDefer: vi.fn(),
    };
    const { rerender } = render(<DecisionWorkingPanel {...props} />);
    // Do not type; switch decisions.
    rerender(<DecisionWorkingPanel {...props} decision={decisionB} />);
    expect(onSaveRationale).not.toHaveBeenCalled();
  });

  it('flushes the typed rationale on unmount without a blur', () => {
    const onSaveRationale = vi.fn();
    const props: DecisionWorkingPanelProps = {
      projectId: 'proj-test',
      decision: makeDecision({ itemId: 's1-vision-c1', isSuccessCriteria: true }),
      resolveOptions: () => [],
      successCriteriaOptions: SUCCESS_OPTIONS,
      initialValue: {},
      initialRationale: '',
      deferred: false,
      recorded: false,
      onRecord: vi.fn(),
      onSaveRationale,
      onToggleDefer: vi.fn(),
    };
    const { unmount } = render(<DecisionWorkingPanel {...props} />);
    const ta = screen.getByLabelText(/rationale/i);
    fireEvent.change(ta, { target: { value: 'Drafted then unmounted.' } });
    expect(onSaveRationale).not.toHaveBeenCalled();
    unmount();
    expect(onSaveRationale).toHaveBeenCalledTimes(1);
    expect(onSaveRationale).toHaveBeenCalledWith('Drafted then unmounted.');
  });
});

describe('DecisionWorkingPanel -- defer', () => {
  it('calls onToggleDefer with !deferred and reflects the prop in data-deferred', () => {
    const { onToggleDefer } = renderPanel({ deferred: false });
    const btn = screen.getByRole('button', { name: /needs (more )?observation/i });
    expect(btn.getAttribute('data-deferred')).toBe('false');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(btn);
    expect(onToggleDefer).toHaveBeenCalledWith(true);
  });

  it('reflects deferred=true in data-deferred and toggles back to false', () => {
    const { onToggleDefer } = renderPanel({ deferred: true });
    const btn = screen.getByRole('button', { name: /needs (more )?observation/i });
    expect(btn.getAttribute('data-deferred')).toBe('true');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btn);
    expect(onToggleDefer).toHaveBeenCalledWith(false);
  });
});

describe('DecisionWorkingPanel -- feeds callout', () => {
  it('renders the feedsLabel text when provided', () => {
    renderPanel({
      decision: makeDecision({
        isSuccessCriteria: true,
        feedsLabel:
          'These criteria feed Observe: Planning Cycle Baseline -- the first read.',
      }),
    });
    expect(
      screen.getByText(/these criteria feed observe: planning cycle baseline/i),
    ).toBeTruthy();
  });

  it('omits the feeds callout when feedsLabel is null', () => {
    renderPanel({
      decision: makeDecision({ isSuccessCriteria: true, feedsLabel: null }),
    });
    expect(screen.queryByText(/these criteria feed/i)).toBeNull();
  });
});

describe('DecisionWorkingPanel -- labour inventory', () => {
  // A complete flat FormValue for a labour decision: who-small + 20 hrs + 1 skill.
  const COMPLETE_LABOUR: import('../actToolCatalog.js').FormValue = {
    who: 'who-small',
    hours: '20',
    spring: '25',
    summer: '20',
    autumn: '30',
    winter: '10',
    skills: ['Fencing & earthworks::capable'],
  };

  it('renders LabourInventoryCapture (not VisionFormFields/textarea/success-criteria) when isLabourInventory is true', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-labour',
        label: 'Inventory available labour',
        isLabourInventory: true,
      }),
    });
    // Stable bit of the labour UI: a WHO card label + a section heading.
    expect(screen.getByText('Small paid team')).toBeTruthy();
    expect(screen.getByText(/who is the stewardship team/i)).toBeTruthy();
    // Not the success-criteria surface.
    expect(screen.queryByText(/suggested criteria/i)).toBeNull();
  });

  it('disables Record when the labour draft is invalid', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-labour',
        label: 'Inventory available labour',
        isLabourInventory: true,
      }),
      initialValue: {},
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('data-locked')).toBe('true');
  });

  it('enables Record with a complete labour value and emits flat value + summariseLabour summary on click', () => {
    const { onRecord } = renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-labour',
        label: 'Inventory available labour',
        isLabourInventory: true,
      }),
      initialValue: COMPLETE_LABOUR,
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('data-locked')).toBe('false');
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [value, summary] = onRecord.mock.calls[0]!;
    expect(value.who).toBe('who-small');
    expect(value.skills).toContain('Fencing & earthworks::capable');
    expect(summary).toBe(summariseLabour(decode(COMPLETE_LABOUR)));
    expect(summary).toBe('Small paid team, 20 hrs/wk, 1 skill');
  });

  it('gate note names the missing requirements for an invalid labour draft', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-labour',
        label: 'Inventory available labour',
        isLabourInventory: true,
      }),
      initialValue: {},
    });
    // who '' -> team; skills empty -> at least one skill (hours falls back to a
    // display default of 20 in the component, but decode of {} yields 0, so the
    // panel-side gate -- computed from decode -- names hours too).
    const gate = screen.getByText(/before recording/i);
    expect(gate.textContent).toMatch(/team/i);
    expect(gate.textContent).toMatch(/skill/i);
  });

  it('surfaces labourSkillSuggestions passed through the panel prop', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-labour',
        label: 'Inventory available labour',
        isLabourInventory: true,
      }),
      labourSkillSuggestions: ['Fencing & earthworks'],
    });
    expect(screen.getByText('Fencing & earthworks')).toBeTruthy();
  });
});

describe('DecisionWorkingPanel -- vision classify', () => {
  it('routes a vision-classify decision to VisionClassifyCapture', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-classify',
        label: 'Classify vision elements',
        isVisionClassify: true,
      }),
      visionClassifySuggestions: ['Grow food', 'Restore soil'],
      initialValue: { committed: [], aspirational: [] },
    });
    expect(screen.getByText('Suggested vision elements')).toBeTruthy();
    // Not the success-criteria surface.
    expect(screen.queryByText(/suggested criteria/i)).toBeNull();
  });

  it('disables Record and shows the gate note when nothing is classified', () => {
    const { onRecord } = renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-classify',
        label: 'Classify',
        isVisionClassify: true,
      }),
      visionClassifySuggestions: ['Grow food'],
      initialValue: { committed: [], aspirational: [] },
    });
    const btnEmpty = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btnEmpty.disabled).toBe(true);
    expect(btnEmpty.getAttribute('data-locked')).toBe('true');
    expect(screen.getByText(/classify at least one element/i)).toBeTruthy();
    expect(onRecord).not.toHaveBeenCalled();
  });

  it('enables Record once an element is classified and emits the summary', () => {
    const { onRecord } = renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-classify',
        label: 'Classify',
        isVisionClassify: true,
      }),
      visionClassifySuggestions: ['Grow food'],
      initialValue: { committed: ['Grow food'], aspirational: [] },
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('data-locked')).toBe('false');
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [value, summary] = onRecord.mock.calls[0]!;
    expect(value.committed).toEqual(['Grow food']);
    expect(value.aspirational).toEqual([]);
    expect(summary).toBe('1 committed, 0 aspirational');
  });
});

describe('DecisionWorkingPanel -- bespoke child remount on decision switch', () => {
  // The bespoke children hold transient component-local UI state that is NOT
  // persisted (VisionClassifyCapture's `unclassified` staging; LabourInventory's
  // `composerOpen`/`customName`). Keying them on decision.itemId forces a fresh
  // mount on switch so that staged-but-unsorted items / open composers never bleed
  // across a decision switch-and-return (consistent with the itemId-keyed draft
  // re-seed and the I-2 rationale flush).
  function baseProps(
    decision: DecisionPanelTarget,
  ): DecisionWorkingPanelProps {
    return {
      projectId: 'proj-test',
      decision,
      resolveOptions: () => [],
      successCriteriaOptions: SUCCESS_OPTIONS,
      initialValue: {},
      initialRationale: '',
      deferred: false,
      recorded: false,
      onRecord: vi.fn(),
      onSaveRationale: vi.fn(),
      onToggleDefer: vi.fn(),
    };
  }

  it('resets VisionClassify staging when the selected decision changes', () => {
    const decisionA = makeDecision({
      itemId: 's1-vision-classify-a',
      label: 'Classify A',
      isVisionClassify: true,
    });
    const decisionB = makeDecision({
      itemId: 's1-vision-classify-b',
      label: 'Classify B',
      isVisionClassify: true,
    });
    const props: DecisionWorkingPanelProps = {
      ...baseProps(decisionA),
      visionClassifySuggestions: ['Grow food'],
      initialValue: { committed: [], aspirational: [] },
    };
    const { rerender } = render(<DecisionWorkingPanel {...props} />);
    // Stage a suggestion -> a transient Unclassified card appears.
    fireEvent.click(screen.getByRole('button', { name: /Grow food/ }));
    expect(screen.getByTestId('unclassified-card-Grow food')).toBeTruthy();
    // Switch to a different decision: the keyed remount must clear the staging.
    rerender(<DecisionWorkingPanel {...props} decision={decisionB} />);
    expect(screen.queryByTestId('unclassified-card-Grow food')).toBeNull();
    // Returning to A must NOT carry the prior staging either (fresh mount).
    rerender(<DecisionWorkingPanel {...props} decision={decisionA} />);
    expect(screen.queryByTestId('unclassified-card-Grow food')).toBeNull();
  });

  it('resets the Labour skill composer when the selected decision changes', () => {
    const decisionA = makeDecision({
      itemId: 's1-vision-labour-a',
      label: 'Labour A',
      isLabourInventory: true,
    });
    const decisionB = makeDecision({
      itemId: 's1-vision-labour-b',
      label: 'Labour B',
      isLabourInventory: true,
    });
    const props = baseProps(decisionA);
    const { rerender } = render(<DecisionWorkingPanel {...props} />);
    // Open the "add a skill not listed" composer -> its input appears.
    fireEvent.click(
      screen.getByRole('button', { name: /Add a skill not listed/i }),
    );
    expect(screen.getByPlaceholderText(/name the skill/i)).toBeTruthy();
    // Switch decisions: the keyed remount must close the composer.
    rerender(<DecisionWorkingPanel {...props} decision={decisionB} />);
    expect(screen.queryByPlaceholderText(/name the skill/i)).toBeNull();
    expect(
      screen.getByRole('button', { name: /Add a skill not listed/i }),
    ).toBeTruthy();
  });
});

describe('DecisionWorkingPanel -- boundary', () => {
  it('routes a boundary decision to BoundaryCapture (doc mode) and not the generic body', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-boundaries-c1',
        label: 'Confirm legal boundaries',
        isBoundary: true,
      }),
      resolveOptions: (id) =>
        id === 'boundaryDocStatus' ? ['Held', 'Pending', 'Missing'] : [],
      initialValue: {},
    });
    // BoundaryCapture-specific surface (doc mode: the upload zone testid).
    expect(screen.getByTestId('doc-upload')).toBeTruthy();
    // Not the success-criteria surface, and no generic textarea fallback.
    expect(screen.queryByText(/suggested criteria/i)).toBeNull();
    expect(
      screen.queryByLabelText('Confirm legal boundaries'),
    ).toBeNull();
  });

  it('renders BoundaryCapture (not generic fields) when a target carries BOTH fields and isBoundary', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-boundaries-c1',
        label: 'Boundary with stray fields',
        fields: TEXT_FIELDS,
        isBoundary: true,
      }),
      resolveOptions: (id) =>
        id === 'boundaryDocStatus' ? ['Held', 'Pending', 'Missing'] : [],
      initialValue: {},
    });
    expect(screen.getByTestId('doc-upload')).toBeTruthy();
    // The generic VisionFormFields label from TEXT_FIELDS must not render.
    expect(screen.queryByText('Primary purpose')).toBeNull();
  });

  it('disables Record and shows a gate note for an invalid boundary draft', () => {
    const { onRecord } = renderPanel({
      decision: makeDecision({
        itemId: 's1-boundaries-c1',
        label: 'Confirm legal boundaries',
        isBoundary: true,
      }),
      resolveOptions: (id) =>
        id === 'boundaryDocStatus' ? ['Held', 'Pending', 'Missing'] : [],
      initialValue: {},
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('data-locked')).toBe('true');
    expect(screen.getByText(/document status to record/i)).toBeTruthy();
    expect(onRecord).not.toHaveBeenCalled();
  });

  it('enables Record with a valid boundary draft and emits summariseBoundary summary on click', () => {
    const VALID: import('../actToolCatalog.js').FormValue = {
      docName: 'Title document.pdf',
      docStatus: 'Held',
      notes: '',
    };
    const { onRecord } = renderPanel({
      decision: makeDecision({
        itemId: 's1-boundaries-c1',
        label: 'Confirm legal boundaries',
        isBoundary: true,
      }),
      resolveOptions: (id) =>
        id === 'boundaryDocStatus' ? ['Held', 'Pending', 'Missing'] : [],
      initialValue: VALID,
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('data-locked')).toBe('false');
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [value, summary] = onRecord.mock.calls[0]!;
    expect(value.docStatus).toBe('Held');
    expect(summary).toBe(
      summariseBoundary('s1-boundaries-c1', decodeBoundary('s1-boundaries-c1', VALID)),
    );
  });

  it('still saves rationale on blur and toggles defer for a boundary target', () => {
    const { onSaveRationale, onToggleDefer } = renderPanel({
      decision: makeDecision({
        itemId: 's1-boundaries-c1',
        label: 'Confirm legal boundaries',
        isBoundary: true,
      }),
      resolveOptions: () => [],
      initialValue: {},
    });
    const ta = screen.getByLabelText(/rationale/i);
    fireEvent.change(ta, { target: { value: 'Deed on file.' } });
    fireEvent.blur(ta);
    expect(onSaveRationale).toHaveBeenCalledWith('Deed on file.');
    const deferBtn = screen.getByRole('button', {
      name: /needs (more )?observation/i,
    });
    fireEvent.click(deferBtn);
    expect(onToggleDefer).toHaveBeenCalledWith(true);
  });

  it('re-seeds the boundary draft when the selected itemId changes (key reset)', () => {
    const decisionValid = makeDecision({
      itemId: 's1-boundaries-c1',
      label: 'Boundary A',
      isBoundary: true,
    });
    const decisionEmpty = makeDecision({
      itemId: 's1-boundaries-c2',
      label: 'Boundary B',
      isBoundary: true,
    });
    const props: DecisionWorkingPanelProps = {
      projectId: 'proj-test',
      decision: decisionValid,
      resolveOptions: (id) =>
        id === 'boundaryDocStatus' ? ['Held', 'Pending'] : [],
      successCriteriaOptions: SUCCESS_OPTIONS,
      initialValue: { docName: '', docStatus: 'Held', notes: '' },
      initialRationale: '',
      deferred: false,
      recorded: false,
      onRecord: vi.fn(),
      onSaveRationale: vi.fn(),
      onToggleDefer: vi.fn(),
    };
    const { rerender } = render(<DecisionWorkingPanel {...props} />);
    // Doc mode body present for c1.
    expect(screen.getByTestId('doc-upload')).toBeTruthy();
    // Switch to c2 (map mode) with empty value -> different body, draft re-seeded.
    rerender(
      <DecisionWorkingPanel
        {...props}
        decision={decisionEmpty}
        initialValue={{}}
      />,
    );
    expect(screen.queryByTestId('doc-upload')).toBeNull();
    expect(screen.getByTestId('ack-toggle')).toBeTruthy();
  });
});

describe('DecisionWorkingPanel -- body-router precedence', () => {
  it('renders VisionClassifyCapture (not generic fields) when a target carries BOTH fields and isVisionClassify', () => {
    // Load-bearing arm ordering: the bespoke isVisionClassify arm precedes the
    // generic `fields` fallback. A target carrying both must route to the bespoke
    // surface; the generic field label must NOT appear.
    renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-classify-fielded',
        label: 'Classify with stray fields',
        fields: TEXT_FIELDS,
        isVisionClassify: true,
      }),
      visionClassifySuggestions: ['Grow food', 'Restore soil'],
      initialValue: { committed: [], aspirational: [] },
    });
    expect(screen.getByText('Suggested vision elements')).toBeTruthy();
    // The generic VisionFormFields label from TEXT_FIELDS must not render.
    expect(screen.queryByText('Primary purpose')).toBeNull();
  });
});

describe('DecisionWorkingPanel -- stakeholder arm', () => {
  beforeEach(() => {
    useStakeholderRegisterStore.setState({ byProject: {} });
    localStorage.clear();
  });

  it('routes isStakeholder to StakeholderCapture before the generic fields engine', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-stakeholders-c2',
        label: 'Map and contact stakeholders',
        isStakeholder: true,
        fields: TEXT_FIELDS,
      }),
    });
    // StakeholderCapture-specific surface present (c2 authority body).
    expect(screen.getByText('Add by authority type')).toBeTruthy();
    expect(screen.getAllByTestId('stakeholder-auth-btn').length).toBeGreaterThan(0);
    // The generic VisionFormFields label from TEXT_FIELDS must NOT render.
    expect(screen.queryByText('Primary purpose')).toBeNull();
  });

  it('disables Record until a store row (or marker) makes it valid -- reactive', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-stakeholders-c2',
        label: 'Map and contact stakeholders',
        isStakeholder: true,
      }),
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('data-locked')).toBe('true');
    // Adding an authority row to the register flips c2 validity reactively.
    act(() => {
      useStakeholderRegisterStore
        .getState()
        .createStakeholder('proj-test', {
          name: 'A',
          type: 'authority',
          role: '',
        });
    });
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('data-locked')).toBe('false');
  });

  it('emits the marker draft + a non-empty summary on Record', () => {
    act(() => {
      useStakeholderRegisterStore
        .getState()
        .createStakeholder('proj-test', {
          name: 'A',
          type: 'authority',
          role: '',
        });
    });
    const { onRecord } = renderPanel({
      decision: makeDecision({
        itemId: 's1-stakeholders-c2',
        label: 'Map and contact stakeholders',
        isStakeholder: true,
      }),
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [value, summary] = onRecord.mock.calls[0]!;
    expect(typeof value).toBe('object');
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('hides the defer button when deferrable is false (c3)', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-stakeholders-c3',
        label: 'Indigenous/cultural relationships',
        isStakeholder: true,
        deferrable: false,
      }),
    });
    expect(
      screen.queryByRole('button', { name: /needs (more )?observation/i }),
    ).toBeNull();
  });

  it('shows the defer button for a normal (deferrable) target', () => {
    renderPanel({
      decision: makeDecision({ isSuccessCriteria: true }),
    });
    expect(
      screen.getByRole('button', { name: /needs (more )?observation/i }),
    ).toBeTruthy();
  });
});

describe('DecisionWorkingPanel -- steward arm', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('routes isSteward to StewardCapture before the generic fields engine', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-steward',
        label: 'Confirm the stewardship team',
        isSteward: true,
        fields: TEXT_FIELDS,
      }),
    });
    // StewardCapture-specific surface present (primary steward card).
    expect(screen.getByTestId('primary-steward-name')).toBeTruthy();
    expect(screen.getByTestId('team-count')).toBeTruthy();
    // The generic VisionFormFields label from TEXT_FIELDS must NOT render.
    expect(screen.queryByText('Primary purpose')).toBeNull();
  });

  it('enables Record immediately (zero invites) and emits the zero-invite summary on click', () => {
    const { onRecord } = renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-steward',
        label: 'Confirm the stewardship team',
        isSteward: true,
      }),
      initialValue: {},
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('data-locked')).toBe('false');
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [, summary] = onRecord.mock.calls[0]!;
    expect(summary).toBe('Primary steward confirmed');
  });

  it('summarises a queued co-steward invite via summariseSteward on Record', () => {
    const { onRecord } = renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-steward',
        label: 'Confirm the stewardship team',
        isSteward: true,
      }),
      initialValue: {
        inviteNames: ['Aisha'],
        inviteEmails: ['aisha@example.com'],
        inviteRoles: ['team_member'],
      },
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [, summary] = onRecord.mock.calls[0]!;
    expect(summary).toBe('Primary steward + 1 invited (1 co-steward)');
  });

  it('renders a two-state defer button with the deferLabel and "Will add later"', () => {
    const { onToggleDefer } = renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-steward',
        label: 'Confirm the stewardship team',
        isSteward: true,
        deferLabel: 'Add team members later in settings',
      }),
      deferred: false,
    });
    const restBtn = screen.getByRole('button', {
      name: /add team members later in settings/i,
    });
    expect(restBtn.getAttribute('data-deferred')).toBe('false');
    fireEvent.click(restBtn);
    expect(onToggleDefer).toHaveBeenCalledWith(true);
  });

  it('shows "Will add later" when a deferLabel target is deferred', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-steward',
        label: 'Confirm the stewardship team',
        isSteward: true,
        deferLabel: 'Add team members later in settings',
      }),
      deferred: true,
    });
    const btn = screen.getByRole('button', { name: /will add later/i });
    expect(btn.getAttribute('data-deferred')).toBe('true');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('mounts with zero invite rows for an empty initialValue and does not crash', () => {
    renderPanel({
      decision: makeDecision({
        itemId: 's1-vision-steward',
        label: 'Confirm the stewardship team',
        isSteward: true,
      }),
      initialValue: {},
    });
    // Only the primary-steward mini row exists -> exactly one team-member row.
    expect(screen.getAllByTestId('team-member').length).toBe(1);
  });
});

describe('DecisionWorkingPanel -- defer label regression', () => {
  it('keeps the legacy resting/toggled strings for a non-steward target without deferLabel', () => {
    renderPanel({
      decision: makeDecision({ isSuccessCriteria: true }),
      deferred: false,
    });
    expect(
      screen.getByRole('button', { name: /not ready -- needs more observation/i }),
    ).toBeTruthy();
  });

  it('shows the legacy deferred string when a non-steward target is deferred', () => {
    renderPanel({
      decision: makeDecision({ isSuccessCriteria: true }),
      deferred: true,
    });
    expect(
      screen.getByRole('button', { name: /deferred -- needs observation/i }),
    ).toBeTruthy();
  });
});

describe('DecisionWorkingPanel -- recorded badge', () => {
  it('shows a "Recorded" badge when recorded is true', () => {
    renderPanel({
      decision: makeDecision({ isSuccessCriteria: true }),
      recorded: true,
    });
    expect(screen.getByText(/^recorded$/i)).toBeTruthy();
  });

  it('does not show a "Recorded" badge when recorded is false', () => {
    renderPanel({ decision: makeDecision({ isSuccessCriteria: true }) });
    expect(screen.queryByText(/^recorded$/i)).toBeNull();
  });
});

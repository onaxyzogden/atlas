/**
 * @vitest-environment happy-dom
 *
 * ThresholdDirectionPhase -- Phase 2 (Direction) of Threshold 1. The decisional
 * surface. These tests pin the load-bearing rules:
 *   - classification options are TYPE-GATED (non-negotiable: feasible|released
 *     only; committed/aspirational: all four);
 *   - releasing a non-negotiable OR a committed element requires an explicit
 *     confirm; aspirational releases freely;
 *   - Conditional reveals a condition field; any classification reveals a note +
 *     a gap-flag;
 *   - the Planning Direction Statement + Approve appear only when EVERY element
 *     is classified; Approve stamps + locks; Re-open clears the lock;
 *   - AMANAH: CSA-like text raises a non-blocking advisory (it never blocks the
 *     classification or the approval).
 *
 * The card reads its classification from a prop the parent surface re-derives
 * from the store on every change, so a store-subscribed harness mirrors that.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

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

import {
  useRealityCheckStore,
  EMPTY_REALITY_CHECK,
} from '../../../../store/realityCheckStore.js';
import { STATUS_META } from '../realityCheckModel.js';
import type { IntentElement } from '../intentElements.js';
import ThresholdDirectionPhase from '../ThresholdDirectionPhase.js';

const PID = 'project-1';

const el = (
  id: string,
  text: string,
  type: IntentElement['type'],
): IntentElement => ({ id, text, type, source: 'classify' });

/** Store-subscribed harness: mirrors how RealityCheckSurface threads state down. */
function Harness({ elements }: { elements: IntentElement[] }) {
  const record = useRealityCheckStore(
    (s) => s.byProject[PID] ?? EMPTY_REALITY_CHECK,
  );
  return (
    <ThresholdDirectionPhase
      projectId={PID}
      projectName="Hillside Farm"
      elements={elements}
      record={record}
    />
  );
}

function statusGroup() {
  return screen.getByRole('group', { name: /^Classify:/ });
}

beforeEach(() => {
  useRealityCheckStore.setState({ byProject: {} });
});

// ---------------------------------------------------------------------------
// Type-gated classification options
// ---------------------------------------------------------------------------

describe('ThresholdDirectionPhase -- type-gated options', () => {
  it('non-negotiable offers ONLY feasible | released', () => {
    render(<Harness elements={[el('ie-nn-1', 'No riba financing', 'non-negotiable')]} />);
    const buttons = within(statusGroup()).getAllByRole('button');
    expect(buttons).toHaveLength(2);
    const names = buttons.map((b) => b.textContent);
    expect(names).toContain(STATUS_META.feasible.label);
    expect(names).toContain(STATUS_META.released.label);
    expect(names).not.toContain(STATUS_META.conditional.label);
    expect(names).not.toContain(STATUS_META.deferred.label);
  });

  it('aspirational offers all four', () => {
    render(<Harness elements={[el('ie-as-1', 'Off-grid living', 'aspirational')]} />);
    expect(within(statusGroup()).getAllByRole('button')).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Classification + annotation reveals
// ---------------------------------------------------------------------------

describe('ThresholdDirectionPhase -- classify + annotate', () => {
  it('classifying stamps the card status', () => {
    render(<Harness elements={[el('ie-cm-1', 'Water security', 'committed')]} />);
    fireEvent.click(
      within(statusGroup()).getByRole('button', { name: STATUS_META.feasible.label }),
    );
    expect(screen.getByTestId('intent-element').getAttribute('data-status')).toBe(
      'feasible',
    );
  });

  it('Conditional reveals a condition field that writes through', () => {
    render(<Harness elements={[el('ie-cm-1', 'Silvopasture grazing', 'committed')]} />);
    fireEvent.click(
      within(statusGroup()).getByRole('button', { name: STATUS_META.conditional.label }),
    );
    const cond = screen.getByTestId('condition-field') as HTMLTextAreaElement;
    fireEvent.change(cond, { target: { value: 'stock water confirmed first' } });
    expect(
      useRealityCheckStore.getState().byProject[PID]?.classifications['ie-cm-1']
        ?.condition,
    ).toBe('stock water confirmed first');
  });

  it('a classified element exposes the gap-flag, which reveals a gap note', () => {
    render(<Harness elements={[el('ie-as-1', 'Food forest', 'aspirational')]} />);
    fireEvent.click(
      within(statusGroup()).getByRole('button', { name: STATUS_META.deferred.label }),
    );
    expect(screen.queryByTestId('gap-note')).toBeNull();
    fireEvent.click(screen.getByTestId('gap-toggle'));
    expect(screen.getByTestId('gap-note')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Release confirms (existential)
// ---------------------------------------------------------------------------

describe('ThresholdDirectionPhase -- release confirm', () => {
  it('releasing a non-negotiable requires a confirm (project must be reconsidered)', () => {
    render(<Harness elements={[el('ie-nn-1', 'No riba financing', 'non-negotiable')]} />);
    fireEvent.click(
      within(statusGroup()).getByRole('button', { name: STATUS_META.released.label }),
    );
    // Not yet classified -- the confirm gate is open instead.
    expect(screen.getByTestId('release-confirm')).toBeTruthy();
    expect(screen.getByTestId('intent-element').getAttribute('data-status')).toBeNull();

    fireEvent.click(screen.getByTestId('release-confirm-yes'));
    expect(screen.getByTestId('intent-element').getAttribute('data-status')).toBe(
      'released',
    );
  });

  it('releasing a committed element requires a confirm', () => {
    render(<Harness elements={[el('ie-cm-1', 'Water security', 'committed')]} />);
    fireEvent.click(
      within(statusGroup()).getByRole('button', { name: STATUS_META.released.label }),
    );
    expect(screen.getByTestId('release-confirm')).toBeTruthy();
  });

  it('releasing an aspirational element does NOT require a confirm', () => {
    render(<Harness elements={[el('ie-as-1', 'Off-grid living', 'aspirational')]} />);
    fireEvent.click(
      within(statusGroup()).getByRole('button', { name: STATUS_META.released.label }),
    );
    expect(screen.queryByTestId('release-confirm')).toBeNull();
    expect(screen.getByTestId('intent-element').getAttribute('data-status')).toBe(
      'released',
    );
  });
});

// ---------------------------------------------------------------------------
// Planning Direction Statement -- compose, approve, lock, reopen
// ---------------------------------------------------------------------------

describe('ThresholdDirectionPhase -- planning direction + approval', () => {
  const ONE = [el('ie-cm-1', 'Water security', 'committed')];

  it('hides the statement until every element is classified', () => {
    render(<Harness elements={ONE} />);
    expect(screen.queryByTestId('planning-direction')).toBeNull();
    expect(screen.getByTestId('direction-not-ready')).toBeTruthy();
  });

  it('shows an honest empty state (not "0 of 0 classified") when no elements were declared', () => {
    render(<Harness elements={[]} />);
    // The zero-element case gets its own copy, not the count-based prompt.
    expect(screen.queryByTestId('direction-not-ready')).toBeNull();
    expect(screen.getByTestId('direction-empty')).toBeTruthy();
    expect(screen.queryByTestId('planning-direction')).toBeNull();
  });

  it('composes the statement, approves (stamps + locks), and re-opens', () => {
    render(<Harness elements={ONE} />);
    fireEvent.click(
      within(statusGroup()).getByRole('button', { name: STATUS_META.feasible.label }),
    );
    // Statement now present.
    expect(screen.getByTestId('planning-direction')).toBeTruthy();

    fireEvent.click(screen.getByTestId('threshold-approve'));
    expect(
      useRealityCheckStore.getState().byProject[PID]?.approvedAt,
    ).toBeTypeOf('number');

    // Locked: the statement is read-only, status buttons disabled, reopen shown.
    expect(
      (screen.getByTestId('planning-direction') as HTMLTextAreaElement).readOnly,
    ).toBe(true);
    expect(
      (
        within(statusGroup()).getByRole('button', {
          name: STATUS_META.feasible.label,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByTestId('threshold-reopen')).toBeTruthy();

    fireEvent.click(screen.getByTestId('threshold-reopen'));
    expect(useRealityCheckStore.getState().byProject[PID]?.approvedAt).toBeUndefined();
    expect(screen.getByTestId('threshold-approve')).toBeTruthy();
  });

  it('Back to Review flips phase1Ready off', () => {
    useRealityCheckStore.getState().setPhase1Ready(PID, true);
    render(<Harness elements={ONE} />);
    fireEvent.click(screen.getByTestId('threshold-back'));
    expect(useRealityCheckStore.getState().byProject[PID]?.phase1Ready).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Amanah -- non-blocking advisory on CSA-like steward text
// ---------------------------------------------------------------------------

describe('ThresholdDirectionPhase -- Amanah advisory', () => {
  it('raises a non-blocking advisory on CSA-like intent text and still classifies', () => {
    render(
      <Harness elements={[el('ie-cm-1', 'A CSA box subscription for members', 'committed')]} />,
    );
    expect(screen.getByTestId('csa-advisory')).toBeTruthy();
    // The advisory never blocks -- the element still classifies.
    fireEvent.click(
      within(statusGroup()).getByRole('button', { name: STATUS_META.feasible.label }),
    );
    expect(screen.getByTestId('intent-element').getAttribute('data-status')).toBe(
      'feasible',
    );
  });

  it('does NOT show the advisory for covenant-clean intent text', () => {
    render(<Harness elements={[el('ie-cm-1', 'Water security', 'committed')]} />);
    expect(screen.queryByTestId('csa-advisory')).toBeNull();
  });
});

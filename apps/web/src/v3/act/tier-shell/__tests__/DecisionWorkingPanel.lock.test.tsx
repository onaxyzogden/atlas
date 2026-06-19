/**
 * @vitest-environment happy-dom
 *
 * DecisionWorkingPanel -- Threshold-3 (Act Mandate) render-layer lock.
 *
 * Stage 5 of the Act Mandate build adds an optional `readOnly` prop (default
 * false) so a Plan objective that was sealed at Begin Act renders display-only.
 * These tests pin the render-layer contract:
 *   1. readOnly omitted / false -> the panel is byte-identical to today: Record
 *      is enabled for a valid draft, the defer button is enabled, the textareas
 *      are editable, and NO lock banner renders.
 *   2. readOnly true -> the lock banner renders; Record + defer are disabled; the
 *      rationale + fallback textareas carry the `readonly` attribute; and the
 *      three commit handlers (onRecord / onSaveRationale / onToggleDefer) never
 *      fire from the panel's own controls.
 *
 * The store backstop (Stage 6) is the bypass-proof guarantee; this proves the
 * first gate -- the render layer cannot be used to mutate a locked objective.
 *
 * A text-fallback decision (no fields, not success-criteria) is used so the body
 * router takes the plain <textarea> path; `initialValue: { text }` makes the
 * draft VALID, so an unlocked Record button is enabled and the lock is the only
 * thing that disables it.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

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

// A plain free-text decision (no fields) -> the body router renders the
// <textarea> fallback. `initialValue: { text }` seeds a VALID draft.
const TEXT_DECISION: DecisionPanelTarget = {
  itemId: 's7-capital',
  label: 'Inventory available capital',
};

function renderPanel(overrides: Partial<DecisionWorkingPanelProps> = {}): {
  onRecord: ReturnType<typeof vi.fn>;
  onSaveRationale: ReturnType<typeof vi.fn>;
  onToggleDefer: ReturnType<typeof vi.fn>;
} {
  const onRecord = vi.fn();
  const onSaveRationale = vi.fn();
  const onToggleDefer = vi.fn();
  const props: DecisionWorkingPanelProps = {
    projectId: 'proj-lock',
    decision: TEXT_DECISION,
    resolveOptions: () => [],
    successCriteriaOptions: [],
    initialValue: { text: 'Some recorded content' },
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

const recordBtn = () =>
  screen.getByRole('button', { name: /record this decision/i });

describe('DecisionWorkingPanel -- unlocked (readOnly omitted) is byte-identical', () => {
  it('shows no lock banner and an enabled Record for a valid draft', () => {
    renderPanel();
    expect(screen.queryByTestId('decision-panel-plan-lock')).toBeNull();
    expect((recordBtn() as HTMLButtonElement).disabled).toBe(false);
  });

  it('records when clicked while unlocked', () => {
    const { onRecord } = renderPanel();
    act(() => {
      fireEvent.click(recordBtn());
    });
    expect(onRecord).toHaveBeenCalledTimes(1);
  });

  it('keeps the rationale + fallback textareas editable', () => {
    renderPanel();
    const rationale = screen.getByLabelText('Rationale') as HTMLTextAreaElement;
    const fallback = screen.getByLabelText(
      TEXT_DECISION.label,
    ) as HTMLTextAreaElement;
    expect(rationale.readOnly).toBe(false);
    expect(fallback.readOnly).toBe(false);
  });

  it('explicit readOnly={false} matches the omitted default (no banner, enabled Record)', () => {
    renderPanel({ readOnly: false });
    expect(screen.queryByTestId('decision-panel-plan-lock')).toBeNull();
    expect((recordBtn() as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('DecisionWorkingPanel -- locked (readOnly) suppresses every edit path', () => {
  it('renders the lock banner', () => {
    renderPanel({ readOnly: true });
    expect(screen.getByTestId('decision-panel-plan-lock')).toBeTruthy();
  });

  it('disables Record even for an otherwise-valid draft', () => {
    renderPanel({ readOnly: true });
    expect((recordBtn() as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not call onRecord when the disabled Record is clicked', () => {
    const { onRecord } = renderPanel({ readOnly: true });
    act(() => {
      fireEvent.click(recordBtn());
    });
    expect(onRecord).not.toHaveBeenCalled();
  });

  it('disables the defer button and never fires onToggleDefer', () => {
    const { onToggleDefer } = renderPanel({ readOnly: true });
    // The defer button's label is the deferLabelFor() copy ("Not ready -- ..."),
    // so target it by its stable data-deferred attribute instead.
    const defer = document.querySelector(
      'button[data-deferred]',
    ) as HTMLButtonElement;
    expect(defer).not.toBeNull();
    expect(defer.disabled).toBe(true);
    act(() => {
      fireEvent.click(defer);
    });
    expect(onToggleDefer).not.toHaveBeenCalled();
  });

  it('marks the rationale + fallback textareas readOnly and never saves the rationale on blur', () => {
    const { onSaveRationale } = renderPanel({ readOnly: true });
    const rationale = screen.getByLabelText('Rationale') as HTMLTextAreaElement;
    const fallback = screen.getByLabelText(
      TEXT_DECISION.label,
    ) as HTMLTextAreaElement;
    expect(rationale.readOnly).toBe(true);
    expect(fallback.readOnly).toBe(true);
    act(() => {
      fireEvent.blur(rationale);
    });
    expect(onSaveRationale).not.toHaveBeenCalled();
  });
});

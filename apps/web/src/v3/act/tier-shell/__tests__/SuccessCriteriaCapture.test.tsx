/**
 * @vitest-environment happy-dom
 *
 * SuccessCriteriaCapture -- an alternative CONTROLLED renderer over the
 * success-criteria value shape { criteria: string[] } (the same shape Phase A's
 * VisionFormFields produces for the success-criteria form). It implements the
 * mockup's "prescribed options" chip-to-seed UX and renders ONLY two blocks:
 * "Suggested criteria" (domain-grouped chips, first 2 visible + show-more
 * toggle) and "Your criteria" (editable numbered rows + dashed add-row + inline
 * min note).
 *
 * Verified behaviours (matches the PB3 TDD checklist):
 *   1. one chip per option with its text + a domain label/marker.
 *   2. only first 2 chips visible initially; show-more toggle (N = len-2)
 *      reveals the rest and re-labels; no toggle when len <= 2.
 *   3. clicking an unused chip appends its text via onChange.
 *   4. a chip already present in value.criteria is "used" (dimmed/Check) and a
 *      click is a no-op.
 *   5. at max, clicking a chip is a no-op and the add-row is not rendered.
 *   6. "Write your own criterion" appends an empty criterion.
 *   7. editing a row textarea replaces that index.
 *   8. delete removes that index.
 *   9. the numbered circle shows the index for an empty entry and a filled
 *      (Check) state for a non-empty entry.
 *  10. the inline "add at least {min}" note appears when non-empty count < min.
 *  11. onChange payloads are always shape { criteria: string[] }.
 *
 * Controlled-component test pattern mirrors VisionFormFields.test.tsx
 * (happy-dom + testing-library; assert against the onChange mock arg).
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { CriterionOption } from '@ogden/shared';

// lucide-react forwardRef icons spread [undefined] into <svg> children when
// childless, which React 18 + happy-dom reject on re-render. Replace every
// component export with a clean <svg> stub (established pattern, mirrors
// ActTierObjectiveRail.test / ActTierExecutionPanel.protocols.test).
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

import SuccessCriteriaCapture from '../SuccessCriteriaCapture.js';

const OPTIONS: readonly CriterionOption[] = [
  { text: 'Soil organic matter trending upward', domain: 'ecological' },
  { text: 'Field operating margin positive', domain: 'economic' },
  { text: 'Steward sign-off obtained', domain: 'stewardship' },
  { text: 'Cover-crop establishment confirmed', domain: 'ecological' },
];

function renderCapture(
  value: { criteria: string[] },
  opts: {
    options?: readonly CriterionOption[];
    min?: number;
    max?: number;
  } = {},
) {
  const onChange = vi.fn();
  render(
    <SuccessCriteriaCapture
      value={value}
      onChange={onChange}
      options={opts.options ?? OPTIONS}
      min={opts.min}
      max={opts.max}
    />,
  );
  return { onChange };
}

describe('SuccessCriteriaCapture -- suggestion chips', () => {
  it('renders one chip per option with its text and a domain label', () => {
    renderCapture({ criteria: [] });
    // The chips region exposes a data-domain attr per chip; assert presence by text.
    expect(screen.getByText('Soil organic matter trending upward')).toBeTruthy();
    // First-two-visible: this one is in the collapsed region but still in the DOM
    // once expanded; here we check the always-visible domain word for chip 1.
    expect(screen.getAllByText('Ecological').length).toBeGreaterThan(0);
  });

  it('reflects each chip domain via a data-domain attribute', () => {
    renderCapture({ criteria: [] });
    const chip = screen
      .getByText('Soil organic matter trending upward')
      .closest('[data-domain]');
    expect(chip).toBeTruthy();
    expect(chip?.getAttribute('data-domain')).toBe('ecological');
  });

  it('shows only the first 2 chips initially with a "Show N more" toggle', () => {
    renderCapture({ criteria: [] });
    // First two always visible.
    expect(screen.getByText('Soil organic matter trending upward')).toBeTruthy();
    expect(screen.getByText('Field operating margin positive')).toBeTruthy();
    // Toggle label reflects remaining count (4 - 2 = 2).
    const toggle = screen.getByRole('button', { name: /Show 2 more suggestions/i });
    expect(toggle).toBeTruthy();
  });

  it('reveals the rest and re-labels the toggle when clicked', () => {
    renderCapture({ criteria: [] });
    const toggle = screen.getByRole('button', { name: /Show 2 more suggestions/i });
    fireEvent.click(toggle);
    expect(screen.getByText('Steward sign-off obtained')).toBeTruthy();
    expect(screen.getByText('Cover-crop establishment confirmed')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Show fewer suggestions/i }),
    ).toBeTruthy();
  });

  it('renders a thin opts-divider before the revealed "more" group only once expanded', () => {
    renderCapture({ criteria: [] });
    // Collapsed: no divider (the hidden chips are not in the DOM).
    expect(screen.queryByTestId('opts-divider')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: /Show 2 more suggestions/i }),
    );
    expect(screen.getByTestId('opts-divider')).toBeTruthy();
  });

  it('renders no toggle when options.length <= 2', () => {
    renderCapture(
      { criteria: [] },
      { options: OPTIONS.slice(0, 2) },
    );
    expect(screen.queryByRole('button', { name: /Show .* suggestions/i })).toBeNull();
  });

  it('appends a chip text via onChange when an unused chip is clicked', () => {
    const { onChange } = renderCapture({ criteria: ['existing'] });
    fireEvent.click(screen.getByText('Soil organic matter trending upward'));
    expect(onChange).toHaveBeenCalledWith({
      criteria: ['existing', 'Soil organic matter trending upward'],
    });
  });

  it('renders a chip whose text is already present as used and ignores clicks', () => {
    const { onChange } = renderCapture({
      criteria: ['Soil organic matter trending upward'],
    });
    const chip = screen
      .getAllByText('Soil organic matter trending upward')[0]!
      .closest('[data-domain]') as HTMLElement;
    expect(chip.getAttribute('data-used')).toBe('true');
    fireEvent.click(chip);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not append and hides the add-row at max criteria', () => {
    const { onChange } = renderCapture(
      { criteria: ['a', 'b', 'c'] },
      { max: 3 },
    );
    fireEvent.click(screen.getByText('Soil organic matter trending upward'));
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: /Write your own criterion/i }),
    ).toBeNull();
  });
});

describe('SuccessCriteriaCapture -- criteria rows', () => {
  it('appends an empty criterion when the add-row is clicked', () => {
    const { onChange } = renderCapture({ criteria: ['one'] });
    fireEvent.click(
      screen.getByRole('button', { name: /Write your own criterion/i }),
    );
    expect(onChange).toHaveBeenCalledWith({ criteria: ['one', ''] });
  });

  it('uses the field-verification placeholder on each criterion row', () => {
    renderCapture({ criteria: [''] });
    expect(
      screen.getByPlaceholderText('Write a criterion you can verify in the field...'),
    ).toBeTruthy();
  });

  it('replaces the edited index when a row textarea changes', () => {
    const { onChange } = renderCapture({ criteria: ['one', 'two'] });
    const textareas = screen.getAllByRole('textbox');
    fireEvent.change(textareas[1]!, { target: { value: 'TWO!' } });
    expect(onChange).toHaveBeenCalledWith({ criteria: ['one', 'TWO!'] });
  });

  it('removes the deleted index', () => {
    const { onChange } = renderCapture({ criteria: ['one', 'two'] });
    fireEvent.click(screen.getByRole('button', { name: /Delete criterion 1/i }));
    expect(onChange).toHaveBeenCalledWith({ criteria: ['two'] });
  });

  it('marks a row filled when non-empty and unfilled when empty', () => {
    renderCapture({ criteria: ['', 'something'] });
    const rows = screen.getAllByTestId('criterion-row');
    expect(rows[0]!.getAttribute('data-filled')).toBe('false');
    expect(rows[1]!.getAttribute('data-filled')).toBe('true');
    // The filled row's number cell shows a check icon; the empty shows the index.
    expect(within(rows[0]!).getByText('1')).toBeTruthy();
  });
});

describe('SuccessCriteriaCapture -- inline min note', () => {
  it('shows "add at least N" when non-empty count is under min', () => {
    renderCapture({ criteria: ['one'] }, { min: 3 });
    expect(screen.getByText(/add at least 3/i)).toBeTruthy();
  });

  it('hides the note when non-empty count meets min', () => {
    renderCapture({ criteria: ['one', 'two', 'three'] }, { min: 3 });
    expect(screen.queryByText(/add at least/i)).toBeNull();
  });
});

describe('SuccessCriteriaCapture -- payload shape', () => {
  it('always emits { criteria: string[] }', () => {
    const { onChange } = renderCapture({ criteria: [] });
    fireEvent.click(screen.getByText('Soil organic matter trending upward'));
    const arg = onChange.mock.calls[0]![0] as { criteria: string[] };
    expect(Object.keys(arg)).toEqual(['criteria']);
    expect(Array.isArray(arg.criteria)).toBe(true);
    arg.criteria.forEach((c: unknown) => expect(typeof c).toBe('string'));
  });
});

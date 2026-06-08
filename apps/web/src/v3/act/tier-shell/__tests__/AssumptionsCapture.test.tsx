/**
 * @vitest-environment happy-dom
 *
 * AssumptionsCapture -- bespoke CONTROLLED renderer for s1-vision-assumptions
 * (two-section register: Assumptions + Known unknowns, critical/blocking flags,
 * suggestion chips, compact add-form, encode/decode).
 *
 * Verified behaviours:
 *   1. decodeAssumptions / encodeAssumptions round-trip (including id+flag).
 *   2. decodeAssumptions defensive: non-array value -> empty lists.
 *   3. decodeAssumptions defensive: non-JSON entry is silently dropped.
 *   4. decodeAssumptions defensive: raw JSON string (not array) -> empty.
 *   5. isAssumptionsValid: false when no assumptions.
 *   6. isAssumptionsValid: false when no unknowns.
 *   7. isAssumptionsValid: false when all entries have blank text.
 *   8. isAssumptionsValid: true with >=1 non-empty assumption AND >=1 unknown.
 *   9. summariseAssumptions: correct pluralized string (2 assumptions, 1 unknown).
 *  10. Render empty -> zero counts visible.
 *  11. Render populated -> entry text + counts visible.
 *  12. Click suggestion chip -> onChange emits with FULL text in the right list.
 *  13. Flag toggle -> onChange emits with flag flipped for that entry.
 *  14. Add-form: open, type text, select category, click Add -> onChange emits new entry.
 *  15. Add-form: empty text -> no emit.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// lucide-react forwardRef icons spread [undefined] into <svg> children when
// childless, which React + happy-dom reject on re-render. Replace every
// component export with a clean <svg> stub (established pattern, mirrors
// ConstraintsCapture.test / DecisionWorkingPanel.test).
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

import AssumptionsCapture, {
  decodeAssumptions,
  encodeAssumptions,
  isAssumptionsValid,
  summariseAssumptions,
  type AssumptionEntry,
  type AssumptionsModel,
} from '../AssumptionsCapture.js';
import type { FormValue } from '../actToolCatalog.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<AssumptionEntry> & { text: string }): AssumptionEntry {
  return {
    id: overrides.id ?? 'test-' + Math.random().toString(36).slice(2, 6),
    category: overrides.category ?? 'General',
    text: overrides.text,
    flag: overrides.flag ?? false,
  };
}

function renderCapture(value: FormValue) {
  const onChange = vi.fn();
  render(<AssumptionsCapture value={value} onChange={onChange} />);
  return { onChange };
}

// ---------------------------------------------------------------------------
// decodeAssumptions / encodeAssumptions -- round-trip
// ---------------------------------------------------------------------------

describe('decodeAssumptions -- round-trip', () => {
  it('round-trips with encodeAssumptions including id and flag', () => {
    const original: AssumptionsModel = {
      assumptions: [
        { id: 'a1', category: 'Financial', text: 'Market demand will hold', flag: true },
        { id: 'a2', category: 'Infrastructure', text: 'Site access is reliable', flag: false },
      ],
      unknowns: [
        { id: 'u1', category: 'Soil', text: 'Soil depth in north paddock', flag: true },
        { id: 'u2', category: 'Water', text: 'Creek flow in drought years', flag: false },
      ],
    };
    const decoded = decodeAssumptions(encodeAssumptions(original));
    expect(decoded).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// decodeAssumptions -- defensive
// ---------------------------------------------------------------------------

describe('decodeAssumptions -- defensive', () => {
  it('returns empty lists for an empty FormValue', () => {
    const result = decodeAssumptions({});
    expect(result.assumptions).toHaveLength(0);
    expect(result.unknowns).toHaveLength(0);
  });

  it('returns empty lists when value.assumptions is not an array (string)', () => {
    const value: FormValue = {
      assumptions: 'not-an-array',
      unknowns: 'not-an-array',
    };
    const result = decodeAssumptions(value);
    expect(result.assumptions).toHaveLength(0);
    expect(result.unknowns).toHaveLength(0);
  });

  it('silently drops a non-JSON entry in the assumptions array', () => {
    const value: FormValue = {
      assumptions: [
        'not-valid-json',
        JSON.stringify({ id: 'a1', category: 'Financial', text: 'Valid assumption', flag: false }),
      ],
      unknowns: [],
    };
    const result = decodeAssumptions(value);
    expect(result.assumptions).toHaveLength(1);
    expect(result.assumptions[0]!.text).toBe('Valid assumption');
  });

  it('drops an entry that parses but lacks a string text field', () => {
    const value: FormValue = {
      assumptions: [
        JSON.stringify({ id: 'x', category: 'Legal' }), // no text
        JSON.stringify({ id: 'y', category: 'Legal', text: 42 }), // numeric text
      ],
      unknowns: [],
    };
    expect(decodeAssumptions(value).assumptions).toHaveLength(0);
  });

  it('returns empty when value.assumptions is a raw JSON string (not an array)', () => {
    const value: FormValue = {
      assumptions: '{"id":"a1","category":"Financial","text":"x","flag":false}',
    };
    expect(decodeAssumptions(value).assumptions).toHaveLength(0);
  });

  it('coerces missing category to "General"', () => {
    const value: FormValue = {
      assumptions: [JSON.stringify({ id: 'a1', text: 'Some assumption' })],
      unknowns: [],
    };
    const result = decodeAssumptions(value);
    expect(result.assumptions[0]!.category).toBe('General');
  });

  it('coerces missing flag to false', () => {
    const value: FormValue = {
      assumptions: [JSON.stringify({ id: 'a1', category: 'Legal', text: 'Some assumption' })],
      unknowns: [],
    };
    const result = decodeAssumptions(value);
    expect(result.assumptions[0]!.flag).toBe(false);
  });

  it('assigns legacy-N id when id is missing or empty', () => {
    const value: FormValue = {
      assumptions: [JSON.stringify({ text: 'No id entry', category: 'Legal', flag: false })],
      unknowns: [],
    };
    const result = decodeAssumptions(value);
    expect(result.assumptions[0]!.id).toBe('legacy-0');
  });
});

// ---------------------------------------------------------------------------
// isAssumptionsValid
// ---------------------------------------------------------------------------

describe('isAssumptionsValid', () => {
  it('returns false when there are no assumptions', () => {
    expect(
      isAssumptionsValid({
        assumptions: [],
        unknowns: [makeEntry({ id: 'u1', text: 'Something unknown' })],
      }),
    ).toBe(false);
  });

  it('returns false when there are no unknowns', () => {
    expect(
      isAssumptionsValid({
        assumptions: [makeEntry({ id: 'a1', text: 'Something assumed' })],
        unknowns: [],
      }),
    ).toBe(false);
  });

  it('returns false when all assumptions have blank text', () => {
    expect(
      isAssumptionsValid({
        assumptions: [makeEntry({ id: 'a1', text: '' }), makeEntry({ id: 'a2', text: '   ' })],
        unknowns: [makeEntry({ id: 'u1', text: 'Something' })],
      }),
    ).toBe(false);
  });

  it('returns false when all unknowns have blank text', () => {
    expect(
      isAssumptionsValid({
        assumptions: [makeEntry({ id: 'a1', text: 'Something' })],
        unknowns: [makeEntry({ id: 'u1', text: '' })],
      }),
    ).toBe(false);
  });

  it('returns true with >=1 non-empty assumption AND >=1 non-empty unknown', () => {
    expect(
      isAssumptionsValid({
        assumptions: [makeEntry({ id: 'a1', text: 'Some assumption' })],
        unknowns: [makeEntry({ id: 'u1', text: 'Some unknown' })],
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// summariseAssumptions
// ---------------------------------------------------------------------------

describe('summariseAssumptions', () => {
  it('uses plural for 2 assumptions and singular for 1 unknown', () => {
    const model: AssumptionsModel = {
      assumptions: [
        makeEntry({ id: 'a1', text: 'Assumption one' }),
        makeEntry({ id: 'a2', text: 'Assumption two' }),
      ],
      unknowns: [makeEntry({ id: 'u1', text: 'Unknown one' })],
    };
    expect(summariseAssumptions(model)).toBe('2 assumptions, 1 known unknown recorded');
  });

  it('uses singular for 1 assumption and plural for 2 unknowns', () => {
    const model: AssumptionsModel = {
      assumptions: [makeEntry({ id: 'a1', text: 'One' })],
      unknowns: [
        makeEntry({ id: 'u1', text: 'Unknown one' }),
        makeEntry({ id: 'u2', text: 'Unknown two' }),
      ],
    };
    expect(summariseAssumptions(model)).toBe('1 assumption, 2 known unknowns recorded');
  });

  it('excludes blank-text entries from the count', () => {
    const model: AssumptionsModel = {
      assumptions: [
        makeEntry({ id: 'a1', text: '' }), // blank -- excluded
        makeEntry({ id: 'a2', text: 'Valid' }),
      ],
      unknowns: [makeEntry({ id: 'u1', text: 'Valid' })],
    };
    expect(summariseAssumptions(model)).toBe('1 assumption, 1 known unknown recorded');
  });
});

// ---------------------------------------------------------------------------
// Render: empty state
// ---------------------------------------------------------------------------

describe('AssumptionsCapture render -- empty state', () => {
  it('shows zero counts in both sections when value is empty', () => {
    renderCapture({});
    const assumpCount = screen.getByTestId('assump-count');
    const unknownCount = screen.getByTestId('unknown-count');
    expect(assumpCount.textContent).toBe('0');
    expect(unknownCount.textContent).toBe('0');
  });

  it('renders both section labels', () => {
    renderCapture({});
    expect(screen.getByText('Assumptions')).toBeTruthy();
    expect(screen.getByText('Known unknowns')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Render: populated state
// ---------------------------------------------------------------------------

describe('AssumptionsCapture render -- populated state', () => {
  it('shows entry text and count when populated', () => {
    const value = encodeAssumptions({
      assumptions: [
        makeEntry({ id: 'a1', category: 'Financial', text: 'Market demand will hold', flag: true }),
      ],
      unknowns: [
        makeEntry({ id: 'u1', category: 'Soil', text: 'Soil depth unknown', flag: false }),
      ],
    });
    renderCapture(value);
    expect(screen.getByText('Market demand will hold')).toBeTruthy();
    expect(screen.getByText('Soil depth unknown')).toBeTruthy();
    expect(screen.getByTestId('assump-count').textContent).toBe('1');
    expect(screen.getByTestId('unknown-count').textContent).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// Suggestion chip: calls onChange with FULL text in the right list
// ---------------------------------------------------------------------------

describe('AssumptionsCapture -- suggestion chip onClick', () => {
  it('clicking an assumption chip calls onChange with FULL text in assumptions', () => {
    const { onChange } = renderCapture({});
    const chip = screen.getByTestId('assump-chip-Market demand');
    fireEvent.click(chip);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const arr = emitted.assumptions as string[];
    expect(Array.isArray(arr)).toBe(true);
    expect(arr).toHaveLength(1);

    const parsed = JSON.parse(arr[0]!);
    expect(parsed.text).toBe('Market demand will support the enterprise at planned scale');
    expect(parsed.category).toBe('Financial');
    expect(parsed.flag).toBe(false);
  });

  it('clicking an unknown chip calls onChange with FULL text in unknowns', () => {
    const { onChange } = renderCapture({});
    const chip = screen.getByTestId('unknown-chip-Listed species?');
    fireEvent.click(chip);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const arr = emitted.unknowns as string[];
    expect(Array.isArray(arr)).toBe(true);
    expect(arr).toHaveLength(1);

    const parsed = JSON.parse(arr[0]!);
    expect(parsed.text).toBe('Ecological value of the remnant vegetation patches -- presence of listed species');
    expect(parsed.category).toBe('Ecological');
    expect(parsed.flag).toBe(false);
  });

  it('assumption chip appends to existing entries (does not replace)', () => {
    const existing = encodeAssumptions({
      assumptions: [makeEntry({ id: 'a1', category: 'Legal', text: 'Existing assumption', flag: false })],
      unknowns: [],
    });
    const { onChange } = renderCapture(existing);
    const chip = screen.getByTestId('assump-chip-Market demand');
    fireEvent.click(chip);

    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const arr = emitted.assumptions as string[];
    expect(arr).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Flag toggle
// ---------------------------------------------------------------------------

describe('AssumptionsCapture -- flag toggle', () => {
  it('clicking an assumption flag (flag=false) emits with flag=true for that entry', () => {
    const value = encodeAssumptions({
      assumptions: [makeEntry({ id: 'seed-a1', category: 'Financial', text: 'Assumption one', flag: false })],
      unknowns: [],
    });
    const { onChange } = renderCapture(value);

    const flagBtn = screen.getByLabelText('Mark as critical');
    fireEvent.click(flagBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const arr = emitted.assumptions as string[];
    const parsed = JSON.parse(arr[0]!);
    expect(parsed.flag).toBe(true);
    expect(parsed.text).toBe('Assumption one');
  });

  it('clicking an unknown flag (flag=true) emits with flag=false for that entry', () => {
    const value = encodeAssumptions({
      assumptions: [],
      unknowns: [makeEntry({ id: 'seed-u1', category: 'Soil', text: 'Unknown one', flag: true })],
    });
    const { onChange } = renderCapture(value);

    const flagBtn = screen.getByLabelText('Mark as not blocking');
    fireEvent.click(flagBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const arr = emitted.unknowns as string[];
    const parsed = JSON.parse(arr[0]!);
    expect(parsed.flag).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Add-form: open, type text, select category, click Add -> new entry emitted
// ---------------------------------------------------------------------------

describe('AssumptionsCapture -- add-form', () => {
  it('Add assumption: open form, type text, click Add -> onChange emits new entry', () => {
    const { onChange } = renderCapture({});

    const addBtn = screen.getByTestId('assump-add-btn');
    fireEvent.click(addBtn);

    // Form is now open; type into the input
    const input = screen.getByPlaceholderText('We are assuming that...');
    fireEvent.change(input, { target: { value: 'Electricity grid is stable' } });

    // Select a different category: Legal
    const legalChip = screen.getByRole('button', { name: 'Legal' });
    fireEvent.click(legalChip);

    // Click Add
    const addEntryBtn = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addEntryBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const arr = emitted.assumptions as string[];
    expect(arr).toHaveLength(1);
    const parsed = JSON.parse(arr[0]!);
    expect(parsed.text).toBe('Electricity grid is stable');
    expect(parsed.category).toBe('Legal');
    expect(typeof parsed.id).toBe('string');
    expect(parsed.id).not.toBe('');
  });

  it('Add unknown: type text, click Add -> onChange emits in unknowns list', () => {
    const { onChange } = renderCapture({});

    const addBtn = screen.getByTestId('unknown-add-btn');
    fireEvent.click(addBtn);

    const input = screen.getByPlaceholderText("We don't yet know...");
    fireEvent.change(input, { target: { value: 'Council permit conditions' } });

    const addEntryBtn = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addEntryBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const arr = emitted.unknowns as string[];
    expect(arr).toHaveLength(1);
    const parsed = JSON.parse(arr[0]!);
    expect(parsed.text).toBe('Council permit conditions');
  });

  it('clicking Add with empty text does not call onChange', () => {
    const { onChange } = renderCapture({});

    const addBtn = screen.getByTestId('assump-add-btn');
    fireEvent.click(addBtn);

    // Do NOT type anything -- leave text empty
    const addEntryBtn = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addEntryBtn);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('flag toggle in add-form is reflected in emitted entry', () => {
    const { onChange } = renderCapture({});

    const addBtn = screen.getByTestId('assump-add-btn');
    fireEvent.click(addBtn);

    const input = screen.getByPlaceholderText('We are assuming that...');
    fireEvent.change(input, { target: { value: 'Road access stays open' } });

    // Toggle the flag switch ON
    const toggle = screen.getByRole('switch', { name: /Critical/i });
    fireEvent.click(toggle);

    const addEntryBtn = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addEntryBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const arr = emitted.assumptions as string[];
    const parsed = JSON.parse(arr[0]!);
    expect(parsed.flag).toBe(true);
  });

  it('Cancel closes the form without emitting', () => {
    const { onChange } = renderCapture({});

    const addBtn = screen.getByTestId('assump-add-btn');
    fireEvent.click(addBtn);

    // Confirm form is open
    expect(screen.getByPlaceholderText('We are assuming that...')).toBeTruthy();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    // Form should be closed (input gone)
    expect(screen.queryByPlaceholderText('We are assuming that...')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Cancel clears the composer draft -- re-opening shows empty input', () => {
    const { onChange } = renderCapture({});

    // Open the assumptions add-form
    fireEvent.click(screen.getByTestId('assump-add-btn'));

    // Type some draft text
    const input = screen.getByPlaceholderText('We are assuming that...');
    fireEvent.change(input, { target: { value: 'Draft text that should be cleared' } });
    expect(input).toHaveProperty('value', 'Draft text that should be cleared');

    // Cancel -- closes the form
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('We are assuming that...')).toBeNull();

    // Re-query the add button (React may have replaced the DOM node after re-render)
    // and re-open -- draft must be gone
    fireEvent.click(screen.getByTestId('assump-add-btn'));
    const reopenedInput = screen.getByPlaceholderText('We are assuming that...');
    expect(reopenedInput).toHaveProperty('value', '');
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Cross-list isolation: flag toggle must not contaminate the other list
// ---------------------------------------------------------------------------

describe('AssumptionsCapture -- flag toggle cross-list isolation', () => {
  it('toggling an unknown flag does not affect the assumptions list', () => {
    const value = encodeAssumptions({
      assumptions: [makeEntry({ id: 'a1', category: 'Financial', text: 'Assumption one', flag: false })],
      unknowns: [makeEntry({ id: 'u1', category: 'Soil', text: 'Unknown one', flag: false })],
    });
    const { onChange } = renderCapture(value);

    // Toggle the unknown flag (currently "Not blocking")
    const flagBtn = screen.getByLabelText('Mark as blocking');
    fireEvent.click(flagBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;

    // Unknown flag must have flipped
    const unknownArr = emitted.unknowns as string[];
    expect(unknownArr).toHaveLength(1);
    expect(JSON.parse(unknownArr[0]!).flag).toBe(true);

    // Assumptions list must be untouched -- no contamination
    const assumpArr = emitted.assumptions as string[];
    expect(assumpArr).toHaveLength(1);
    expect(JSON.parse(assumpArr[0]!).flag).toBe(false);
    expect(JSON.parse(assumpArr[0]!).text).toBe('Assumption one');
  });

  it('toggling an assumption flag does not affect the unknowns list', () => {
    const value = encodeAssumptions({
      assumptions: [makeEntry({ id: 'a1', category: 'Financial', text: 'Assumption one', flag: false })],
      unknowns: [makeEntry({ id: 'u1', category: 'Soil', text: 'Unknown one', flag: true })],
    });
    const { onChange } = renderCapture(value);

    // Toggle the assumption flag (currently "Not critical")
    const flagBtn = screen.getByLabelText('Mark as critical');
    fireEvent.click(flagBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;

    // Assumption flag must have flipped
    const assumpArr = emitted.assumptions as string[];
    expect(assumpArr).toHaveLength(1);
    expect(JSON.parse(assumpArr[0]!).flag).toBe(true);

    // Unknowns list must be untouched
    const unknownArr = emitted.unknowns as string[];
    expect(unknownArr).toHaveLength(1);
    expect(JSON.parse(unknownArr[0]!).flag).toBe(true);
    expect(JSON.parse(unknownArr[0]!).text).toBe('Unknown one');
  });
});

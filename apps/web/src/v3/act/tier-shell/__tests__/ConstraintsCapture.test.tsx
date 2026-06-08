/**
 * @vitest-environment happy-dom
 *
 * ConstraintsCapture -- bespoke CONTROLLED renderer for s1-vision-constraints
 * (two tabs: Suggest + Register, severity toggle, note rows, encode/decode).
 *
 * Verified behaviours:
 *   1. decodeConstraints round-trips with encodeConstraints.
 *   2. decodeConstraints is defensive: non-array value -> { constraints: [] }.
 *   3. decodeConstraints is defensive: non-JSON entry is silently dropped.
 *   4. isConstraintsValid: false for empty model.
 *   5. isConstraintsValid: false when all text is blank.
 *   6. isConstraintsValid: true when at least one constraint has non-empty text.
 *   7. summariseConstraints: correct pluralized string (e.g. 3 total / 1 nn).
 *   8. Render with empty value shows empty-state copy in Register tab.
 *   9. Render with populated value shows constraint text and severity pill.
 *  10. Clicking a suggestion chip calls onChange with the chip's FULL text encoded.
 *  11. Severity toggle emits toggled model (stopPropagation confirmed).
 *  12. Duplicate chip guard: already-added chip does not call onChange again.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// lucide-react forwardRef icons spread [undefined] into <svg> children when
// childless, which React + happy-dom reject on re-render. Replace every
// component export with a clean <svg> stub (established pattern, mirrors
// SuccessCriteriaCapture.test / DecisionWorkingPanel.test).
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

import ConstraintsCapture, {
  decodeConstraints,
  encodeConstraints,
  isConstraintsValid,
  summariseConstraints,
  type Constraint,
  type ConstraintsModel,
} from '../ConstraintsCapture.js';
import type { FormValue } from '../actToolCatalog.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function encodeForTest(constraints: Omit<Constraint, 'id'>[] | Constraint[]): FormValue {
  return encodeConstraints({
    constraints: (constraints as Constraint[]).map((c, i) =>
      'id' in c && c.id ? c : { ...c, id: 'test-' + i },
    ),
  });
}

function renderCapture(value: FormValue) {
  const onChange = vi.fn();
  render(<ConstraintsCapture value={value} onChange={onChange} />);
  return { onChange };
}

// ---------------------------------------------------------------------------
// decodeConstraints -- round-trip and defensive
// ---------------------------------------------------------------------------

describe('decodeConstraints -- round-trip', () => {
  it('round-trips with encodeConstraints via decodeConstraints(encodeConstraints(model))', () => {
    const original: ConstraintsModel = {
      constraints: [
        { id: 'r1', text: 'No debt financing', severity: 'nn', note: 'Board resolution' },
        { id: 'r2', text: 'Max opex $40k/year', severity: 'hc', note: '' },
      ],
    };
    const decoded = decodeConstraints(encodeConstraints(original));
    expect(decoded).toEqual(original);
  });
});

describe('decodeConstraints -- defensive', () => {
  it('returns { constraints: [] } for an empty FormValue', () => {
    expect(decodeConstraints({})).toEqual({ constraints: [] });
  });

  it('returns { constraints: [] } when value.constraints is not an array (string)', () => {
    const value: FormValue = { constraints: 'not-an-array' };
    // A single non-JSON string should be dropped (JSON.parse will fail).
    const result = decodeConstraints(value);
    expect(result.constraints).toHaveLength(0);
  });

  it('returns { constraints: [] } when value.constraints is a number', () => {
    // FormValue is Record<string, string | string[]>; cast to test robustness.
    const value = { constraints: 42 } as unknown as FormValue;
    expect(decodeConstraints(value)).toEqual({ constraints: [] });
  });

  it('silently drops a non-JSON entry in the array', () => {
    const value: FormValue = {
      constraints: [
        'not-valid-json',
        JSON.stringify({ text: 'Valid constraint', severity: 'hc', note: '' }),
      ],
    };
    const result = decodeConstraints(value);
    expect(result.constraints).toHaveLength(1);
    expect(result.constraints[0]!.text).toBe('Valid constraint');
  });

  it('drops an entry that parses but lacks a string text field', () => {
    const value: FormValue = {
      constraints: [
        JSON.stringify({ severity: 'nn', note: '' }), // no text
        JSON.stringify({ text: 42, severity: 'hc', note: '' }), // numeric text
      ],
    };
    expect(decodeConstraints(value).constraints).toHaveLength(0);
  });

  it('coerces unknown severity to hc', () => {
    const value: FormValue = {
      constraints: [JSON.stringify({ text: 'X', severity: 'unknown', note: '' })],
    };
    const result = decodeConstraints(value);
    expect(result.constraints[0]!.severity).toBe('hc');
  });

  it('coerces missing note to empty string', () => {
    const value: FormValue = {
      constraints: [JSON.stringify({ text: 'X', severity: 'nn' })],
    };
    const result = decodeConstraints(value);
    expect(result.constraints[0]!.note).toBe('');
  });

  it('returns { constraints: [] } when value.constraints is a raw JSON string (not an array)', () => {
    // Contract: non-array value -> empty model. A bare JSON string must NOT be
    // wrapped and parsed -- it must produce no entries.
    const value: FormValue = {
      constraints: '{"text":"x","severity":"nn","note":""}',
    };
    expect(decodeConstraints(value)).toEqual({ constraints: [] });
  });
});

// ---------------------------------------------------------------------------
// isConstraintsValid
// ---------------------------------------------------------------------------

describe('isConstraintsValid', () => {
  it('returns false for empty model', () => {
    expect(isConstraintsValid({ constraints: [] })).toBe(false);
  });

  it('returns false when all constraints have blank text', () => {
    expect(
      isConstraintsValid({
        constraints: [
          { id: 'a', text: '', severity: 'hc', note: '' },
          { id: 'b', text: '   ', severity: 'nn', note: '' },
        ],
      }),
    ).toBe(false);
  });

  it('returns true when at least one constraint has non-empty trimmed text', () => {
    expect(
      isConstraintsValid({
        constraints: [
          { id: 'a', text: '', severity: 'hc', note: '' },
          { id: 'b', text: 'No debt financing', severity: 'nn', note: '' },
        ],
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// summariseConstraints
// ---------------------------------------------------------------------------

describe('summariseConstraints', () => {
  it('produces the correct pluralized string for 3 total / 1 nn', () => {
    const model: ConstraintsModel = {
      constraints: [
        { id: 'a', text: 'Alpha', severity: 'nn', note: '' },
        { id: 'b', text: 'Beta', severity: 'hc', note: '' },
        { id: 'c', text: 'Gamma', severity: 'hc', note: '' },
      ],
    };
    expect(summariseConstraints(model)).toBe(
      '3 constraints recorded -- 1 non-negotiable',
    );
  });

  it('uses singular forms when total is 1 and nn is 1', () => {
    const model: ConstraintsModel = {
      constraints: [{ id: 'a', text: 'Alpha', severity: 'nn', note: '' }],
    };
    expect(summariseConstraints(model)).toBe(
      '1 constraint recorded -- 1 non-negotiable',
    );
  });

  it('uses plural for nn when nn count > 1', () => {
    const model: ConstraintsModel = {
      constraints: [
        { id: 'a', text: 'Alpha', severity: 'nn', note: '' },
        { id: 'b', text: 'Beta', severity: 'nn', note: '' },
      ],
    };
    expect(summariseConstraints(model)).toBe(
      '2 constraints recorded -- 2 non-negotiables',
    );
  });

  it('excludes blank-text constraints from the count', () => {
    const model: ConstraintsModel = {
      constraints: [
        { id: 'a', text: '', severity: 'nn', note: '' }, // blank -- excluded
        { id: 'b', text: 'Alpha', severity: 'nn', note: '' },
        { id: 'c', text: 'Beta', severity: 'hc', note: '' },
      ],
    };
    // Only 2 filled; 1 nn
    expect(summariseConstraints(model)).toBe(
      '2 constraints recorded -- 1 non-negotiable',
    );
  });
});

// ---------------------------------------------------------------------------
// Render: empty state
// ---------------------------------------------------------------------------

describe('ConstraintsCapture render -- empty state', () => {
  it('starts on Suggest tab; does not show empty-register div on Suggest', () => {
    renderCapture({});
    // Empty register text is in Register tab -- not visible on Suggest.
    expect(screen.queryByTestId('empty-register')).toBeNull();
  });

  it('shows empty-state copy when switching to Register with no constraints', () => {
    renderCapture({});
    fireEvent.click(screen.getByRole('tab', { name: /register/i }));
    expect(screen.getByTestId('empty-register')).toBeTruthy();
    expect(screen.getByText(/No constraints recorded yet/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Render: populated state
// ---------------------------------------------------------------------------

describe('ConstraintsCapture render -- populated state', () => {
  it('shows constraint text and severity pill in Register tab', () => {
    const value = encodeForTest([
      { id: 'p1', text: 'No debt financing', severity: 'nn', note: '' },
    ]);
    renderCapture(value);
    fireEvent.click(screen.getByRole('tab', { name: /register/i }));
    expect(screen.getByDisplayValue('No debt financing')).toBeTruthy();
    // Severity pill for nn
    expect(screen.getByText('Non-neg.')).toBeTruthy();
  });

  it('renders multiple constraint items', () => {
    const value = encodeForTest([
      { id: 'p1', text: 'Constraint A', severity: 'nn', note: '' },
      { id: 'p2', text: 'Constraint B', severity: 'hc', note: '' },
    ]);
    renderCapture(value);
    fireEvent.click(screen.getByRole('tab', { name: /register/i }));
    const items = screen.getAllByTestId('constraint-item');
    expect(items).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Suggestion chip: calls onChange with FULL text encoded
// ---------------------------------------------------------------------------

describe('ConstraintsCapture -- suggestion chip onClick', () => {
  it('calls onChange with the chip FULL text encoded in constraints array', () => {
    const { onChange } = renderCapture({});
    // "Physical & Site" starts expanded. Click the first chip (No permanent structures...).
    const chip = screen.getByRole('button', {
      name: /No permanent structures within 50m/i,
    });
    fireEvent.click(chip);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(Array.isArray(emitted.constraints)).toBe(true);

    const arr = emitted.constraints as string[];
    expect(arr).toHaveLength(1);

    const parsed = JSON.parse(arr[0]!);
    // FULL text (not display text)
    expect(parsed.text).toBe(
      'No permanent structures permitted within 50m of the creek line',
    );
    expect(parsed.severity).toBe('hc');
    expect(parsed.note).toBe('');
  });

  it('switches to Register tab after adding a chip', () => {
    renderCapture({});
    // Start on Suggest
    expect(
      screen.getByRole('tab', { name: /suggest/i }).getAttribute('aria-selected'),
    ).toBe('true');
    const chip = screen.getByRole('button', {
      name: /No permanent structures within 50m/i,
    });
    fireEvent.click(chip);
    // Now on Register
    expect(
      screen.getByRole('tab', { name: /register/i }).getAttribute('aria-selected'),
    ).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Fix 3a -- Severity toggle emits toggled model (stopPropagation confirmed)
// ---------------------------------------------------------------------------

describe('ConstraintsCapture -- severity toggle', () => {
  it('clicking the severity pill toggles severity from hc to nn without toggling note', () => {
    const value = encodeForTest([
      { id: 'sev-1', text: 'No debt financing', severity: 'hc', note: '' },
    ]);
    const { onChange } = renderCapture(value);

    // Switch to Register tab to see the constraint row.
    fireEvent.click(screen.getByRole('tab', { name: /register/i }));

    // Click the severity pill (labelled "Hard").
    const pill = screen.getByRole('button', {
      name: /Severity: Hard -- click to toggle/i,
    });
    fireEvent.click(pill);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const arr = emitted.constraints as string[];
    expect(arr).toHaveLength(1);

    const parsed = JSON.parse(arr[0]!);
    // Severity must have toggled to nn.
    expect(parsed.severity).toBe('nn');
    // Text must be unchanged.
    expect(parsed.text).toBe('No debt financing');
  });
});

// ---------------------------------------------------------------------------
// Fix 3b -- Duplicate chip guard: already-added chip does not trigger onChange
// ---------------------------------------------------------------------------

describe('ConstraintsCapture -- duplicate chip guard', () => {
  it('chip for a text already in the register is disabled and does not call onChange', () => {
    // Use the full text of the Ecological chip.
    const fullText =
      'No synthetic herbicides, pesticides, or fertilisers -- certified organic methods only';
    const value = encodeForTest([
      { id: 'dup-1', text: fullText, severity: 'nn', note: '' },
    ]);
    const { onChange } = renderCapture(value);

    // The Ecological category is collapsed by default -- expand it.
    const ecoHeader = screen.getByRole('button', {
      name: /Ecological/i,
    });
    fireEvent.click(ecoHeader);

    // The chip for the already-added text should render as disabled/added.
    const chip = screen.getByRole('button', {
      name: /No synthetic herbicides/i,
    });
    expect((chip as HTMLButtonElement).disabled).toBe(true);

    // Clicking a disabled chip must not invoke onChange.
    fireEvent.click(chip);
    expect(onChange).not.toHaveBeenCalled();
  });
});

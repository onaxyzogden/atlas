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
  isConstraintsValid,
  summariseConstraints,
  type ConstraintsModel,
  type ConstraintSeverity,
} from '../ConstraintsCapture.js';
import type { FormValue } from '../actToolCatalog.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function encodeForTest(constraints: { text: string; severity: ConstraintSeverity; note: string }[]): FormValue {
  return { constraints: constraints.map((c) => JSON.stringify(c)) };
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
  it('round-trips with encodeConstraints via decodeConstraints(encoded)', () => {
    const original: ConstraintsModel = {
      constraints: [
        { text: 'No debt financing', severity: 'nn', note: 'Board resolution' },
        { text: 'Max opex $40k/year', severity: 'hc', note: '' },
      ],
    };
    const encoded = encodeForTest(original.constraints);
    const decoded = decodeConstraints(encoded);
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
          { text: '', severity: 'hc', note: '' },
          { text: '   ', severity: 'nn', note: '' },
        ],
      }),
    ).toBe(false);
  });

  it('returns true when at least one constraint has non-empty trimmed text', () => {
    expect(
      isConstraintsValid({
        constraints: [
          { text: '', severity: 'hc', note: '' },
          { text: 'No debt financing', severity: 'nn', note: '' },
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
        { text: 'Alpha', severity: 'nn', note: '' },
        { text: 'Beta', severity: 'hc', note: '' },
        { text: 'Gamma', severity: 'hc', note: '' },
      ],
    };
    expect(summariseConstraints(model)).toBe(
      '3 constraints recorded -- 1 non-negotiable',
    );
  });

  it('uses singular forms when total is 1 and nn is 1', () => {
    const model: ConstraintsModel = {
      constraints: [{ text: 'Alpha', severity: 'nn', note: '' }],
    };
    expect(summariseConstraints(model)).toBe(
      '1 constraint recorded -- 1 non-negotiable',
    );
  });

  it('uses plural for nn when nn count > 1', () => {
    const model: ConstraintsModel = {
      constraints: [
        { text: 'Alpha', severity: 'nn', note: '' },
        { text: 'Beta', severity: 'nn', note: '' },
      ],
    };
    expect(summariseConstraints(model)).toBe(
      '2 constraints recorded -- 2 non-negotiables',
    );
  });

  it('excludes blank-text constraints from the count', () => {
    const model: ConstraintsModel = {
      constraints: [
        { text: '', severity: 'nn', note: '' }, // blank -- excluded
        { text: 'Alpha', severity: 'nn', note: '' },
        { text: 'Beta', severity: 'hc', note: '' },
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
      { text: 'No debt financing', severity: 'nn', note: '' },
    ]);
    renderCapture(value);
    fireEvent.click(screen.getByRole('tab', { name: /register/i }));
    expect(screen.getByDisplayValue('No debt financing')).toBeTruthy();
    // Severity pill for nn
    expect(screen.getByText('Non-neg.')).toBeTruthy();
  });

  it('renders multiple constraint items', () => {
    const value = encodeForTest([
      { text: 'Constraint A', severity: 'nn', note: '' },
      { text: 'Constraint B', severity: 'hc', note: '' },
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

/**
 * @vitest-environment happy-dom
 *
 * LabourInventoryCapture -- a CONTROLLED, pure renderer over a FLAT FormValue
 * (Record<string, string | string[]>) that the parent persists unchanged. The
 * component reasons internally with a rich LabourModel and translates to/from
 * the flat shape via the exported `encode` / `decode` helpers each render.
 *
 * Flat persisted shape:
 *   { who, hours, spring, summer, autumn, winter: string;  skills: string[] }
 * where each `skills` entry is `${name}::${level}` (level in
 * beginner|capable|expert).
 *
 * Verified behaviours (LC2 TDD checklist):
 *   1. WHO single-select -- exactly one card active; clicking emits `who`.
 *   2. hours stepper clamps 5-120; presets set exact values; capacity band
 *      label/note switch at the capMap thresholds (8/15/25/40/60/999).
 *   3. seasonal steppers clamp 0-80; annual-rhythm bars normalize to the max.
 *   4. skill toggle adds/removes a row; level dots set beginner|capable|expert;
 *      "Add a skill not listed" appends a custom-named skill.
 *   5. encode / decode round-trip losslessly; decode is total (defaults).
 *   6. onChange always emits a flat FormValue (string scalars + skills string[]).
 *   7. isLabourValid / summariseLabour behave per spec.
 *
 * Mirrors SuccessCriteriaCapture.test.tsx (happy-dom + testing-library; the
 * lucide-react svg stub avoids the childless-forwardRef re-render crash).
 */

import { describe, it, expect, vi } from 'vitest';
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

import LabourInventoryCapture, {
  encode,
  decode,
  summariseLabour,
  isLabourValid,
  type LabourModel,
} from '../LabourInventoryCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const SKILLS = [
  'General land maintenance',
  'Fencing & earthworks',
  'Planting & propagation',
] as const;

function renderCapture(
  value: FormValue,
  skillSuggestions: readonly string[] = SKILLS,
) {
  const onChange = vi.fn();
  render(
    <LabourInventoryCapture
      value={value}
      onChange={onChange}
      skillSuggestions={skillSuggestions}
    />,
  );
  return { onChange };
}

/** A fully-populated flat value -- avoids default-substitution ambiguity. */
function fullValue(over: Partial<FormValue> = {}): FormValue {
  return {
    who: 'who-small',
    hours: '20',
    spring: '25',
    summer: '20',
    autumn: '30',
    winter: '10',
    skills: ['General land maintenance::capable'],
    ...over,
  };
}

// --------------------------------------------------------------------------
// encode / decode
// --------------------------------------------------------------------------

describe('LabourInventoryCapture -- encode/decode', () => {
  it('round-trips a populated model losslessly', () => {
    const model: LabourModel = {
      who: 'who-large',
      hours: 45,
      seasonal: { spring: 10, summer: 80, autumn: 0, winter: 35 },
      skills: [
        { name: 'Fencing & earthworks', level: 'expert' },
        { name: 'Custom skill', level: 'beginner' },
      ],
    };
    expect(decode(encode(model))).toEqual(model);
  });

  it('emits a flat FormValue: string scalars + skills as string[] of name::level', () => {
    const model: LabourModel = {
      who: 'who-solo',
      hours: 10,
      seasonal: { spring: 1, summer: 2, autumn: 3, winter: 4 },
      skills: [{ name: 'Planting & propagation', level: 'capable' }],
    };
    const fv = encode(model);
    expect(fv.who).toBe('who-solo');
    expect(fv.hours).toBe('10');
    expect(fv.spring).toBe('1');
    expect(fv.summer).toBe('2');
    expect(fv.autumn).toBe('3');
    expect(fv.winter).toBe('4');
    expect(fv.skills).toEqual(['Planting & propagation::capable']);
    // scalars are strings, skills is an array
    expect(typeof fv.who).toBe('string');
    expect(Array.isArray(fv.skills)).toBe(true);
  });

  it('decode is total: empty value yields sensible defaults', () => {
    expect(decode({})).toEqual({
      who: '',
      hours: 0,
      seasonal: { spring: 0, summer: 0, autumn: 0, winter: 0 },
      skills: [],
    });
  });

  it('decode coerces garbage: NaN hours -> 0, unknown level -> beginner, missing :: -> beginner', () => {
    const fv: FormValue = {
      who: 'who-family',
      hours: 'not-a-number',
      spring: 'x',
      skills: ['Bare skill', 'Tagged::weird', 'Good::expert'],
    };
    const m = decode(fv);
    expect(m.hours).toBe(0);
    expect(m.seasonal.spring).toBe(0);
    expect(m.skills).toEqual([
      { name: 'Bare skill', level: 'beginner' },
      { name: 'Tagged', level: 'beginner' },
      { name: 'Good', level: 'expert' },
    ]);
  });
});

// --------------------------------------------------------------------------
// summariseLabour / isLabourValid
// --------------------------------------------------------------------------

describe('LabourInventoryCapture -- summary & validity', () => {
  it('summariseLabour uses the WHO label, hours, and pluralized skill count', () => {
    const m: LabourModel = {
      who: 'who-small',
      hours: 20,
      seasonal: { spring: 0, summer: 0, autumn: 0, winter: 0 },
      skills: [
        { name: 'a', level: 'beginner' },
        { name: 'b', level: 'capable' },
      ],
    };
    const s = summariseLabour(m);
    expect(s).toMatch(/Small paid team/);
    expect(s).toMatch(/20 hrs\/wk/);
    expect(s).toMatch(/2 skills/);
  });

  it('summariseLabour singularizes a single skill', () => {
    const m: LabourModel = {
      who: 'who-solo',
      hours: 5,
      seasonal: { spring: 0, summer: 0, autumn: 0, winter: 0 },
      skills: [{ name: 'a', level: 'beginner' }],
    };
    expect(summariseLabour(m)).toMatch(/1 skill\b/);
  });

  it('isLabourValid requires who, hours>0, and at least one skill', () => {
    const base: LabourModel = {
      who: 'who-solo',
      hours: 10,
      seasonal: { spring: 0, summer: 0, autumn: 0, winter: 0 },
      skills: [{ name: 'a', level: 'beginner' }],
    };
    expect(isLabourValid(base)).toBe(true);
    expect(isLabourValid({ ...base, who: '' })).toBe(false);
    expect(isLabourValid({ ...base, hours: 0 })).toBe(false);
    expect(isLabourValid({ ...base, skills: [] })).toBe(false);
  });
});

// --------------------------------------------------------------------------
// WHO single-select
// --------------------------------------------------------------------------

describe('LabourInventoryCapture -- WHO', () => {
  it('marks exactly one card active and emits the clicked who', () => {
    const { onChange } = renderCapture(fullValue({ who: 'who-solo' }));
    const solo = screen.getByRole('button', { name: /Solo steward/i });
    expect(solo.getAttribute('data-active')).toBe('true');
    const small = screen.getByRole('button', { name: /Small paid team/i });
    expect(small.getAttribute('data-active')).toBe('false');

    fireEvent.click(small);
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.who).toBe('who-small');
  });
});

// --------------------------------------------------------------------------
// HOURS
// --------------------------------------------------------------------------

describe('LabourInventoryCapture -- hours', () => {
  it('increments by 5 and clamps at 120', () => {
    const { onChange } = renderCapture(fullValue({ hours: '118' }));
    fireEvent.click(screen.getByRole('button', { name: /increase hours/i }));
    expect((onChange.mock.calls[0]![0] as FormValue).hours).toBe('120');
  });

  it('decrements by 5 and clamps at 5', () => {
    const { onChange } = renderCapture(fullValue({ hours: '7' }));
    fireEvent.click(screen.getByRole('button', { name: /decrease hours/i }));
    expect((onChange.mock.calls[0]![0] as FormValue).hours).toBe('5');
  });

  it('preset buttons set exact values', () => {
    const { onChange } = renderCapture(fullValue({ hours: '20' }));
    fireEvent.click(screen.getByRole('button', { name: /^40h$/i }));
    expect((onChange.mock.calls[0]![0] as FormValue).hours).toBe('40');
  });

  it('shows the matching capacity band label and note at thresholds', () => {
    // hours 20 -> Medium band (max 25)
    const { onChange } = renderCapture(fullValue({ hours: '20' }));
    expect(screen.getByText(/Medium/i)).toBeTruthy();
    expect(screen.getByText(/across 4.6 weeks/i)).toBeTruthy();
    onChange.mockClear();
  });

  it('switches the capacity band when hours cross a threshold', () => {
    renderCapture(fullValue({ hours: '80' }));
    // 80 -> max 999 band: "Full-time operation"
    expect(screen.getByText(/Full-time operation/i)).toBeTruthy();
  });
});

// --------------------------------------------------------------------------
// SEASONAL
// --------------------------------------------------------------------------

describe('LabourInventoryCapture -- seasonal', () => {
  it('clamps a season at 80 on increment', () => {
    const { onChange } = renderCapture(fullValue({ spring: '78' }));
    fireEvent.click(screen.getByRole('button', { name: /increase spring/i }));
    expect((onChange.mock.calls[0]![0] as FormValue).spring).toBe('80');
  });

  it('clamps a season at 0 on decrement', () => {
    const { onChange } = renderCapture(fullValue({ winter: '3' }));
    fireEvent.click(screen.getByRole('button', { name: /decrease winter/i }));
    expect((onChange.mock.calls[0]![0] as FormValue).winter).toBe('0');
  });

  it('normalizes rhythm bars to the largest season value', () => {
    // spring 25, summer 20, autumn 50, winter 10 -> autumn is 100%
    renderCapture(
      fullValue({ spring: '25', summer: '20', autumn: '50', winter: '10' }),
    );
    const autumnBar = screen.getByTestId('rhythm-bar-autumn');
    expect(autumnBar.style.height).toBe('100%');
    const winterBar = screen.getByTestId('rhythm-bar-winter');
    // 10/50 = 20%
    expect(winterBar.style.height).toBe('20%');
  });
});

// --------------------------------------------------------------------------
// SKILLS
// --------------------------------------------------------------------------

describe('LabourInventoryCapture -- skills', () => {
  it('checking an unchecked suggestion adds it at beginner level', () => {
    const { onChange } = renderCapture(fullValue({ skills: [] }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Fencing & earthworks' }),
    );
    expect((onChange.mock.calls[0]![0] as FormValue).skills).toEqual([
      'Fencing & earthworks::beginner',
    ]);
  });

  it('unchecking a checked skill removes it', () => {
    const { onChange } = renderCapture(
      fullValue({ skills: ['General land maintenance::capable'] }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'General land maintenance' }),
    );
    expect((onChange.mock.calls[0]![0] as FormValue).skills).toEqual([]);
  });

  it('clicking a level dot sets that skill level', () => {
    const { onChange } = renderCapture(
      fullValue({ skills: ['General land maintenance::beginner'] }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /set General land maintenance to expert/i,
      }),
    );
    expect((onChange.mock.calls[0]![0] as FormValue).skills).toEqual([
      'General land maintenance::expert',
    ]);
  });

  it('"Add a skill not listed" appends a custom-named skill', () => {
    const { onChange } = renderCapture(fullValue({ skills: [] }));
    fireEvent.click(screen.getByRole('button', { name: /Add a skill not listed/i }));
    const input = screen.getByPlaceholderText(/name the skill/i);
    fireEvent.change(input, { target: { value: 'Beekeeping' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect((onChange.mock.calls[0]![0] as FormValue).skills).toEqual([
      'Beekeeping::beginner',
    ]);
  });

  it('renders one row per suggestion plus any custom skills already present', () => {
    renderCapture(fullValue({ skills: ['Hand-built shelters::expert'] }));
    // 3 suggestions + 1 custom
    const rows = screen.getAllByTestId('skill-row');
    expect(rows.length).toBe(SKILLS.length + 1);
    expect(screen.getByText('Hand-built shelters')).toBeTruthy();
  });
});

// --------------------------------------------------------------------------
// payload shape
// --------------------------------------------------------------------------

describe('LabourInventoryCapture -- payload shape', () => {
  it('every onChange payload is a flat FormValue', () => {
    const { onChange } = renderCapture(fullValue());
    fireEvent.click(screen.getByRole('button', { name: /^10h$/i }));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    for (const [k, v] of Object.entries(arg)) {
      if (k === 'skills') {
        expect(Array.isArray(v)).toBe(true);
        (v as string[]).forEach((s) => expect(typeof s).toBe('string'));
      } else {
        expect(typeof v).toBe('string');
      }
    }
  });

  it('footer gate copy is shown', () => {
    renderCapture(fullValue());
    expect(
      screen.getByText(/Team, hours, and at least one skill recorded/i),
    ).toBeTruthy();
    expect(screen.getByText(/Task assignment & scheduling/i)).toBeTruthy();
  });
});

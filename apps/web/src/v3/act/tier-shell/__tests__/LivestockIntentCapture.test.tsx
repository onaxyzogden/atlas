/**
 * @vitest-environment happy-dom
 *
 * LivestockIntentCapture -- contract (mode mapper, decode/encode/valid/summarise)
 * AND the React component + 5 mode bodies (P1..P5). Mirrors GrazingSystemCapture /
 * CarryingCapacityCapture test structure. Logic tests assert decode is
 * total/defensive (empty FormValue -> empty model, no fabricated seed data),
 * encode is a lossless inverse, and validity gates behave per spec (compat is
 * gate-only; the other four modes are always recordable). Render tests assert
 * each body's distinctive controls/labels appear and that interactions emit the
 * expected FormValue keys.
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

import {
  LivestockIntentCapture,
  LIVESTOCK_INTENT_PREFIX,
  livestockIntentModeFor,
  decodeLivestockIntent,
  encodeLivestockIntent,
  isLivestockIntentValid,
  summariseLivestockIntent,
  type LivestockIntentMode,
} from '../LivestockIntentCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const NOOP = (): void => {};
const P = LIVESTOCK_INTENT_PREFIX;

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('livestockIntentModeFor', () => {
  it('maps c1..c5 to the five modes', () => {
    const expected: Record<string, LivestockIntentMode> = {
      c1: 'rationale',
      c2: 'species',
      c3: 'relationship',
      c4: 'capacity',
      c5: 'compat',
    };
    for (const [suffix, mode] of Object.entries(expected)) {
      expect(livestockIntentModeFor(`${P}-${suffix}`)).toBe(mode);
    }
  });

  it('returns null for unknown suffixes and foreign prefixes', () => {
    expect(livestockIntentModeFor(`${P}-c6`)).toBeNull();
    expect(livestockIntentModeFor(`${P}-x`)).toBeNull();
    expect(livestockIntentModeFor('silv-sec-s4-grazing-design-c1')).toBeNull();
    expect(livestockIntentModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode/encode roundtrip + total/defensive decode
// ---------------------------------------------------------------------------

const ALL_MODES: LivestockIntentMode[] = [
  'rationale',
  'species',
  'relationship',
  'capacity',
  'compat',
];

describe('decodeLivestockIntent is total and defensive', () => {
  it('empty FormValue yields empty / default models (no fabricated seed data)', () => {
    expect(decodeLivestockIntent('rationale', {})).toEqual({
      kind: 'rationale',
      rationale: '',
    });
    expect(decodeLivestockIntent('species', {})).toEqual({
      kind: 'species',
      species: [],
    });
    expect(decodeLivestockIntent('relationship', {})).toEqual({
      kind: 'relationship',
      relationship: '',
    });
    expect(decodeLivestockIntent('capacity', {})).toEqual({
      kind: 'capacity',
      experience: '',
      priorSpecies: [],
      careHours: '',
      skills: [],
      support: [],
    });
    expect(decodeLivestockIntent('compat', {})).toEqual({
      kind: 'compat',
      confirmed: false,
    });
  });

  it('never throws on garbage / mixed-shape values', () => {
    for (const mode of ALL_MODES) {
      expect(() =>
        decodeLivestockIntent(mode, {
          junk: 'x',
          liSpecies: 'sheep',
          liSkills: ['a', 'b'],
        }),
      ).not.toThrow();
    }
  });
});

describe('encodeLivestockIntent is a lossless inverse of decode', () => {
  it('roundtrips every mode', () => {
    const cases: FormValue[] = [
      { liRationale: 'integrated' },
      { liSpecies: ['sheep', 'cattle'] },
      { liRelationship: 'complementary' },
      {
        liExperience: 'learning',
        liPriorSpecies: ['Sheep', 'None yet'],
        liCareHours: '3.5',
        liSkills: ['Mentorship'],
        liSupport: ['Vet on call'],
      },
      { liConfirmed: 'yes' },
    ];
    ALL_MODES.forEach((mode, i) => {
      const v = cases[i]!;
      const re = encodeLivestockIntent(mode, decodeLivestockIntent(mode, v));
      const reDecoded = decodeLivestockIntent(mode, re);
      expect(decodeLivestockIntent(mode, v)).toEqual(reDecoded);
    });
  });
});

// ---------------------------------------------------------------------------
// validity
// ---------------------------------------------------------------------------

describe('isLivestockIntentValid', () => {
  it('compat is invalid until liConfirmed === "yes"', () => {
    expect(isLivestockIntentValid('compat', {})).toBe(false);
    expect(isLivestockIntentValid('compat', { liConfirmed: '' })).toBe(false);
    expect(isLivestockIntentValid('compat', { liConfirmed: 'yes' })).toBe(true);
  });

  it('the other four modes are always recordable (advisory)', () => {
    for (const mode of ['rationale', 'species', 'relationship', 'capacity'] as LivestockIntentMode[]) {
      expect(isLivestockIntentValid(mode, {})).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// summaries
// ---------------------------------------------------------------------------

describe('summariseLivestockIntent', () => {
  it('rationale', () => {
    expect(summariseLivestockIntent('rationale', {})).toMatch(/No rationale selected/i);
    expect(summariseLivestockIntent('rationale', { liRationale: 'integrated' })).toMatch(
      /Integration rationale:/,
    );
  });

  it('species', () => {
    expect(summariseLivestockIntent('species', {})).toMatch(/No species selected/i);
    const s = summariseLivestockIntent('species', { liSpecies: ['sheep', 'cattle'] });
    expect(s).toMatch(/2 candidate species/);
    expect(s).toMatch(/Sheep/);
    expect(s).toMatch(/Cattle/);
  });

  it('relationship', () => {
    expect(summariseLivestockIntent('relationship', {})).toMatch(/No relationship selected/i);
    expect(
      summariseLivestockIntent('relationship', { liRelationship: 'complementary' }),
    ).toMatch(/Enterprise relationship:/);
  });

  it('capacity', () => {
    expect(summariseLivestockIntent('capacity', {})).toMatch(/Experience: unset/);
    const s = summariseLivestockIntent('capacity', {
      liExperience: 'learning',
      liCareHours: '4',
    });
    expect(s).toMatch(/Learning/);
    expect(s).toMatch(/4 hrs\/day/);
  });

  it('compat', () => {
    expect(summariseLivestockIntent('compat', {})).toMatch(/not yet confirmed/i);
    expect(summariseLivestockIntent('compat', { liConfirmed: 'yes' })).toMatch(
      /confirmed compatible/i,
    );
  });
});

// ---------------------------------------------------------------------------
// P1 rationale render + interaction
// ---------------------------------------------------------------------------

describe('LivestockIntentCapture P1 rationale', () => {
  it('renders the three rationale option titles', () => {
    render(
      <LivestockIntentCapture
        mode="rationale"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c1`}
      />,
    );
    expect(screen.getByText(/Land management tool/)).toBeTruthy();
    expect(screen.getByText(/Production enterprise/)).toBeTruthy();
    expect(screen.getByText(/Integrated/)).toBeTruthy();
  });

  it('selecting a rationale card emits liRationale', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <LivestockIntentCapture
        mode="rationale"
        value={current}
        onChange={onChange}
        itemId={`${P}-c1`}
      />,
    );
    fireEvent.click(screen.getByText(/Land management tool/));
    expect(onChange).toHaveBeenCalled();
    expect(current.liRationale).toBe('land-management');
  });
});

// ---------------------------------------------------------------------------
// P2 species render + interaction
// ---------------------------------------------------------------------------

describe('LivestockIntentCapture P2 species', () => {
  it('renders the filter chips and a species label', () => {
    render(
      <LivestockIntentCapture
        mode="species"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c2`}
      />,
    );
    const filter = screen.getByRole('group', { name: 'Species filter' });
    expect(within(filter).getByText('All')).toBeTruthy();
    expect(within(filter).getByText('Ruminants')).toBeTruthy();
    expect(within(filter).getByText('Poultry')).toBeTruthy();
    expect(within(filter).getByText('Other')).toBeTruthy();
    expect(screen.getAllByText(/Sheep/).length).toBeGreaterThan(0);
  });

  it('toggling a species card emits liSpecies', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <LivestockIntentCapture
        mode="species"
        value={current}
        onChange={onChange}
        itemId={`${P}-c2`}
      />,
    );
    fireEvent.click(screen.getByText('Sheep'));
    expect(onChange).toHaveBeenCalled();
    expect(current.liSpecies).toEqual(['sheep']);
  });
});

// ---------------------------------------------------------------------------
// P3 relationship render
// ---------------------------------------------------------------------------

describe('LivestockIntentCapture P3 relationship', () => {
  it('renders the three relationship options', () => {
    render(
      <LivestockIntentCapture
        mode="relationship"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c3`}
      />,
    );
    expect(screen.getByText(/Complementary/)).toBeTruthy();
    expect(screen.getByText(/Supplementary/)).toBeTruthy();
    expect(screen.getByText(/Competing/)).toBeTruthy();
  });

  it('selecting a relationship emits liRelationship', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <LivestockIntentCapture
        mode="relationship"
        value={current}
        onChange={onChange}
        itemId={`${P}-c3`}
      />,
    );
    fireEvent.click(screen.getByText(/Complementary/));
    expect(current.liRelationship).toBe('complementary');
  });
});

// ---------------------------------------------------------------------------
// P4 capacity render + interaction
// ---------------------------------------------------------------------------

describe('LivestockIntentCapture P4 capacity', () => {
  it('renders experience levels, a care-hours stepper, and skill options', () => {
    render(
      <LivestockIntentCapture
        mode="capacity"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c4`}
      />,
    );
    expect(screen.getByText('Novice')).toBeTruthy();
    expect(screen.getByText('Professional')).toBeTruthy();
    expect(screen.getByText(/hrs\/day/)).toBeTruthy();
    expect(screen.getByText(/Health monitoring & condition scoring/)).toBeTruthy();
    expect(screen.getByText('Mentorship')).toBeTruthy();
  });

  it('stepping care hours writes liCareHours', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <LivestockIntentCapture
        mode="capacity"
        value={current}
        onChange={onChange}
        itemId={`${P}-c4`}
      />,
    );
    fireEvent.click(screen.getByLabelText('Increase'));
    expect(onChange).toHaveBeenCalled();
    expect(typeof current.liCareHours).toBe('string');
    expect(current.liCareHours).toBe('2.5');
  });

  it('selecting an experience level writes liExperience', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <LivestockIntentCapture
        mode="capacity"
        value={current}
        onChange={onChange}
        itemId={`${P}-c4`}
      />,
    );
    fireEvent.click(screen.getByText('Learning'));
    expect(current.liExperience).toBe('learning');
  });
});

// ---------------------------------------------------------------------------
// P5 compat render + interaction
// ---------------------------------------------------------------------------

describe('LivestockIntentCapture P5 compat', () => {
  it('renders context rows derived from siblings and a confirm checkbox', () => {
    render(
      <LivestockIntentCapture
        mode="compat"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c5`}
        siblingValues={{
          [`${P}-c1`]: { liRationale: 'integrated' },
          [`${P}-c2`]: { liSpecies: ['sheep', 'cattle'] },
          [`${P}-c4`]: { liCareHours: '4' },
        }}
      />,
    );
    expect(screen.getByText(/Integration rationale/)).toBeTruthy();
    expect(screen.getByText(/Candidate species/)).toBeTruthy();
    expect(screen.getByText(/Daily care committed/)).toBeTruthy();
    expect(
      screen.getByText(/confirm livestock intent is compatible/),
    ).toBeTruthy();
  });

  it('checking the confirm box writes liConfirmed = "yes"', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <LivestockIntentCapture
        mode="compat"
        value={current}
        onChange={onChange}
        itemId={`${P}-c5`}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalled();
    expect(current.liConfirmed).toBe('yes');
  });
});

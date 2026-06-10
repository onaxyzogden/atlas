/**
 * @vitest-environment happy-dom
 *
 * LabourInventoryCapture -- a CONTROLLED, pure renderer over a FLAT FormValue
 * (Record<string, string | string[]>) that the parent persists unchanged.
 *
 * --- Per-person roster (2026-06) ---
 * Availability is captured PER PERSON. The `roster` array is the source of
 * truth; each person carries their own weekly hours, four-season curve, and
 * skill+level list. The legacy team-total fields { who, hours, spring..winter,
 * skills } are still emitted, now RECOMPUTED from the roster via `deriveTeam`.
 * The roster persists as index-aligned parallel string[] arrays
 * (rosterNames/rosterRoles/rosterHours/rosterSpring..Winter + rosterSkills, the
 * last a single U+001F-delimited `${name}::${level}` cell per person).
 *
 * Verified behaviours:
 *   1. encode/decode round-trip losslessly, incl. a `::` in a skill name and a
 *      0-skill person (empty packed cell).
 *   2. decode is total + BACK-COMPAT: a legacy value with no `rosterNames`
 *      collapses into one synthetic `primary` person whose derived totals equal
 *      the old combined fields.
 *   3. deriveTeam sums hours/seasons and unions skills at the highest level.
 *   4. isLabourValid / summariseLabour follow the per-person rule.
 *   5. rosterSeedFrom yields primary + team_member/contractor rows, skips landowner.
 *   6. UI: roster rows render + expand; editing a person re-emits the roster and
 *      the recomputed team total; "Add a person" appends; the WHO band seeds the
 *      default row count; the rosterSeed prop pre-fills before first edit.
 *
 * Mirrors SuccessCriteriaCapture.test.tsx (happy-dom + testing-library; the
 * lucide-react svg stub avoids the childless-forwardRef re-render crash).
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

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
  deriveTeam,
  summariseLabour,
  isLabourValid,
  rosterSeedFrom,
  type LabourModel,
  type PersonAvailability,
} from '../LabourInventoryCapture.js';
import type { StewardModel } from '../StewardCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const SKILLS = [
  'General land maintenance',
  'Fencing & earthworks',
  'Planting & propagation',
] as const;

// --- builders -------------------------------------------------------------

function person(over: Partial<PersonAvailability> = {}): PersonAvailability {
  return {
    name: 'Sam',
    role: 'team_member',
    seasonal: { spring: 10, summer: 10, autumn: 10, winter: 10 },
    skills: [],
    ...over,
  };
}

/** Build a full model from a roster, with the derived totals filled in. */
function modelOf(roster: PersonAvailability[], who = ''): LabourModel {
  const t = deriveTeam(roster);
  return { who, roster, hours: t.hours, seasonal: t.seasonal, skills: t.skills };
}

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

// --------------------------------------------------------------------------
// encode / decode
// --------------------------------------------------------------------------

describe('LabourInventoryCapture -- encode/decode', () => {
  it('round-trips a multi-person roster losslessly (incl. "::" in a skill name)', () => {
    const m = modelOf(
      [
        person({
          name: 'You',
          role: 'primary',
          seasonal: { spring: 25, summer: 20, autumn: 22, winter: 15 },
          skills: [{ name: 'Fencing & earthworks', level: 'expert' }],
        }),
        person({
          name: 'Amal',
          role: 'contractor',
          seasonal: { spring: 14, summer: 12, autumn: 13, winter: 10 },
          skills: [
            { name: 'A::B', level: 'capable' },
            { name: 'Planting & propagation', level: 'beginner' },
          ],
        }),
      ],
      'who-small',
    );
    expect(decode(encode(m))).toEqual(m);
  });

  it('round-trips a person with zero skills (empty packed cell)', () => {
    const m = modelOf(
      [person({ name: 'Solo', role: 'primary', seasonal: { spring: 10, summer: 8, autumn: 8, winter: 6 }, skills: [] })],
      'who-solo',
    );
    const fv = encode(m);
    expect(fv.rosterSkills).toEqual(['']);
    expect(decode(fv)).toEqual(m);
  });

  it('emits the legacy team-total fields recomputed from the roster', () => {
    const fv = encode(
      modelOf([
        person({ seasonal: { spring: 10, summer: 10, autumn: 10, winter: 10 } }),
        person({ seasonal: { spring: 15, summer: 15, autumn: 15, winter: 15 } }),
      ]),
    );
    expect(fv.hours).toBe('25');
    expect(fv.spring).toBe('25');
    expect(fv.summer).toBe('25');
    expect(fv.autumn).toBe('25');
    expect(fv.winter).toBe('25');
    expect(Array.isArray(fv.rosterNames)).toBe(true);
  });

  it('decode is total: an empty value yields an empty roster + zero totals', () => {
    expect(decode({})).toEqual({
      who: '',
      roster: [],
      hours: 0,
      seasonal: { spring: 0, summer: 0, autumn: 0, winter: 0 },
      skills: [],
    });
  });

  it('decodes a legacy value (no rosterNames) into a single primary person', () => {
    const legacy: FormValue = {
      who: 'who-family',
      hours: '20', // old baseline (ignored under new model)
      spring: '25',
      summer: '20',
      autumn: '30',
      winter: '10',
      skills: ['General land maintenance::capable', 'Fencing::expert'],
    };
    const m = decode(legacy);
    expect(m.roster).toHaveLength(1);
    expect(m.roster[0]!.role).toBe('primary');
    expect(m.roster[0]!.seasonal).toEqual({
      spring: 25,
      summer: 20,
      autumn: 30,
      winter: 10,
    });
    // baseline derived as average of seasonal: (25+20+30+10)/4 = 21.25 ≈ 21
    expect(m.hours).toBe(21);
    expect(m.seasonal).toEqual({ spring: 25, summer: 20, autumn: 30, winter: 10 });
    expect(m.skills).toEqual([
      { name: 'General land maintenance', level: 'capable' },
      { name: 'Fencing', level: 'expert' },
    ]);
  });

  it('decode coerces garbage seasonal values to 0 and an unknown level to beginner', () => {
    const m = decode({
      rosterNames: ['Sam'],
      rosterRoles: ['team_member'],
      rosterSpring: ['not-a-number'],
      rosterSummer: ['garbage'],
      rosterSkills: ['Fencing::notalevel'],
    });
    expect(m.roster[0]!.seasonal).toEqual({
      spring: 0,
      summer: 0,
      autumn: 0,
      winter: 0,
    });
    expect(m.roster[0]!.skills).toEqual([{ name: 'Fencing', level: 'beginner' }]);
  });
});

// --------------------------------------------------------------------------
// deriveTeam
// --------------------------------------------------------------------------

describe('deriveTeam', () => {
  it('sums each season across the roster; baseline is average of seasonal totals', () => {
    const t = deriveTeam([
      person({ seasonal: { spring: 10, summer: 8, autumn: 9, winter: 7 } }),
      person({ seasonal: { spring: 15, summer: 12, autumn: 14, winter: 11 } }),
    ]);
    // Seasonal sum: spring 25, summer 20, autumn 23, winter 18
    expect(t.seasonal).toEqual({ spring: 25, summer: 20, autumn: 23, winter: 18 });
    // Baseline: (25 + 20 + 23 + 18) / 4 = 86 / 4 = 21.5 ≈ 22
    expect(t.hours).toBe(22);
  });

  it('unions skills by name, keeping the highest level', () => {
    const t = deriveTeam([
      person({
        skills: [
          { name: 'Fencing', level: 'beginner' },
          { name: 'Planting', level: 'capable' },
        ],
      }),
      person({ skills: [{ name: 'Fencing', level: 'expert' }] }),
    ]);
    expect(t.skills).toHaveLength(2);
    expect(t.skills.find((s) => s.name === 'Fencing')!.level).toBe('expert');
  });
});

// --------------------------------------------------------------------------
// summariseLabour / isLabourValid
// --------------------------------------------------------------------------

describe('LabourInventoryCapture -- summary & validity', () => {
  it('summariseLabour reports people count, combined hours, and skill count', () => {
    const s = summariseLabour(
      modelOf([
        person({ seasonal: { spring: 24, summer: 20, autumn: 22, winter: 16 }, skills: [{ name: 'a', level: 'beginner' }] }),
        person({ seasonal: { spring: 26, summer: 25, autumn: 27, winter: 19 }, skills: [{ name: 'b', level: 'capable' }] }),
      ]),
    );
    expect(s).toMatch(/2 people/);
    // Team seasonal: spring 50, summer 45, autumn 49, winter 35 = 179 total
    // Baseline: (50+45+49+35)/4 = 179/4 = 44.75 ≈ 45
    expect(s).toMatch(/45 hrs\/wk combined/);
    expect(s).toMatch(/2 skills/);
  });

  it('summariseLabour singularizes one person / one skill', () => {
    const s = summariseLabour(
      modelOf([person({ seasonal: { spring: 6, summer: 5, autumn: 5, winter: 4 }, skills: [{ name: 'a', level: 'beginner' }] })]),
    );
    expect(s).toMatch(/1 person\b/);
    expect(s).toMatch(/1 skill\b/);
  });

  it('isLabourValid requires one person with both seasonal hours>0 and a skill', () => {
    expect(
      isLabourValid(
        modelOf([person({ seasonal: { spring: 12, summer: 10, autumn: 11, winter: 8 }, skills: [{ name: 'a', level: 'beginner' }] })]),
      ),
    ).toBe(true);
    expect(
      isLabourValid(
        modelOf([person({ seasonal: { spring: 0, summer: 0, autumn: 0, winter: 0 }, skills: [{ name: 'a', level: 'beginner' }] })]),
      ),
    ).toBe(false);
    expect(isLabourValid(modelOf([person({ seasonal: { spring: 10, summer: 10, autumn: 10, winter: 10 }, skills: [] })]))).toBe(false);
    expect(isLabourValid(modelOf([]))).toBe(false);
  });
});

// --------------------------------------------------------------------------
// rosterSeedFrom
// --------------------------------------------------------------------------

describe('rosterSeedFrom', () => {
  it('yields a primary "You" row + team_member/contractor rows, skipping landowner', () => {
    const steward: StewardModel = {
      invites: [
        { name: 'Amal', email: 'a@x', role: 'team_member' },
        { name: 'Khalid', email: 'k@x', role: 'contractor' },
        { name: 'Owner', email: 'o@x', role: 'landowner' },
      ],
    };
    const seed = rosterSeedFrom(steward);
    expect(seed.map((p) => p.name)).toEqual(['You', 'Amal', 'Khalid']);
    expect(seed[0]!.role).toBe('primary');
    expect(seed[1]!.role).toBe('team_member');
    expect(seed[2]!.role).toBe('contractor');
    expect(seed.some((p) => p.role === 'landowner')).toBe(false);
  });

  it('yields just the primary row for an empty steward', () => {
    expect(rosterSeedFrom({ invites: [] }).map((p) => p.name)).toEqual(['You']);
  });
});

// --------------------------------------------------------------------------
// roster UI
// --------------------------------------------------------------------------

describe('LabourInventoryCapture -- roster UI', () => {
  it('renders one roster row per person and expands the first by default', () => {
    renderCapture(
      encode(
        modelOf(
          [
            person({
              name: 'You',
              role: 'primary',
              seasonal: { spring: 24, summer: 20, autumn: 22, winter: 16 },
              skills: [{ name: 'Fencing & earthworks', level: 'expert' }],
            }),
            person({ name: 'Amal', role: 'team_member', seasonal: { spring: 12, summer: 10, autumn: 11, winter: 8 } }),
          ],
          'who-small',
        ),
      ),
    );
    expect(screen.getAllByTestId('roster-row').length).toBe(2);
  });

  it('editing a person seasonal hours re-emits the roster and the recomputed team total', () => {
    const { onChange } = renderCapture(
      encode(
        modelOf([person({ name: 'You', role: 'primary', seasonal: { spring: 10, summer: 10, autumn: 10, winter: 10 }, skills: [] })], 'who-solo'),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /increase spring for You/i }));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.rosterSpring as string[])[0]).toBe('15');
    // Derived team baseline: ((15+10+10+10)/4) ≈ 11
    expect(arg.hours).toBe('11');
  });

  it('"Add a person" appends a roster row', () => {
    const { onChange } = renderCapture(
      encode(modelOf([person({ name: 'You', role: 'primary' })], 'who-solo')),
    );
    fireEvent.click(screen.getByRole('button', { name: /add a person/i }));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.rosterNames as string[]).length).toBe(2);
  });

  it('choosing a WHO band seeds the default row count when nothing is persisted', () => {
    const onChange = vi.fn();
    render(
      <LabourInventoryCapture value={{}} onChange={onChange} skillSuggestions={SKILLS} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Small paid team/i }));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.rosterNames as string[]).length).toBe(4); // who-small -> 4 rows
    expect(arg.who).toBe('who-small');
  });

  it('pre-fills roster rows from the rosterSeed prop before first edit', () => {
    const onChange = vi.fn();
    render(
      <LabourInventoryCapture
        value={{}}
        onChange={onChange}
        skillSuggestions={SKILLS}
        rosterSeed={rosterSeedFrom({
          invites: [{ name: 'Amal', email: 'a@x', role: 'team_member' }],
        })}
      />,
    );
    expect(screen.getAllByTestId('roster-row').length).toBe(2); // You + Amal
    expect(screen.getByDisplayValue('Amal')).toBeTruthy();
  });

  it('footer gate copy reflects the per-person readiness rule', () => {
    renderCapture(
      encode(
        modelOf(
          [
            person({
              name: 'You',
              role: 'primary',
              seasonal: { spring: 12, summer: 10, autumn: 11, winter: 8 },
              skills: [{ name: 'a', level: 'beginner' }],
            }),
          ],
          'who-solo',
        ),
      ),
    );
    expect(
      screen.getByText(/at least one person with weekly hours and a skill/i),
    ).toBeTruthy();
    expect(screen.getByText(/Task assignment & scheduling/i)).toBeTruthy();
  });
});

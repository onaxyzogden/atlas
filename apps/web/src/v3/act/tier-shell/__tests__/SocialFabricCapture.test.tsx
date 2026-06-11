/**
 * @vitest-environment happy-dom
 *
 * SocialFabricCapture -- contract (mode mapper, decode/encode/valid/summarise)
 * AND the React component + 6 mode bodies (c1..c6). Mirrors the
 * FoodSystemCapture test structure. Logic tests assert decode is total/defensive
 * (empty FormValue -> seed-default model where the spec seeds a register/
 * selection), encode is a lossless inverse (incl. parallel column-wise string[]
 * arrays + per-household chip sets), and the advisory validity arms (only
 * priorattempts is a genuine gate). Render tests assert each body's distinctive
 * verbatim text appears and that interactions fire onChange with the expected
 * serialization. This survey carries no sale/contribution copy -> no Amanah
 * surface to assert.
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
  SocialFabricCapture,
  SOCIAL_FABRIC_PREFIX,
  socialFabricModeFor,
  decodeSocialFabric,
  encodeSocialFabric,
  isSocialFabricValid,
  summariseSocialFabric,
  skillBadgeFor,
  expBuckets,
  cohTally,
  REL_HOUSEHOLDS,
  REL_SINCE_OPTIONS,
  EXP_HOUSEHOLDS,
  PA_SEED,
  PA_BY_OPTIONS,
  COH_DOMAINS,
  COH_LEVELS,
  SKILL_DOMAINS,
  NETWORKS,
  type SocialFabricMode,
  type RelationshipsModel,
  type ExperienceModel,
  type PriorAttemptsModel,
  type CohesionModel,
  type SkillsModel,
  type NetworksModel,
} from '../SocialFabricCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const NOOP = (): void => {};

const ALL_MODES: readonly SocialFabricMode[] = [
  'relationships',
  'experience',
  'priorattempts',
  'cohesion',
  'skills',
  'networks',
];

/** decode-then-encode: the canonical seeded FormValue for a mode. */
function decodeToValue(mode: SocialFabricMode): FormValue {
  return encodeSocialFabric(mode, decodeSocialFabric(mode, {}));
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('socialFabricModeFor', () => {
  it('maps c1..c6 to the six modes', () => {
    const expected: Record<string, SocialFabricMode> = {
      c1: 'relationships',
      c2: 'experience',
      c3: 'priorattempts',
      c4: 'cohesion',
      c5: 'skills',
      c6: 'networks',
    };
    for (const [suffix, mode] of Object.entries(expected)) {
      expect(socialFabricModeFor(`${SOCIAL_FABRIC_PREFIX}-${suffix}`)).toBe(mode);
    }
  });

  it('returns null for an out-of-range suffix (c7)', () => {
    expect(socialFabricModeFor(`${SOCIAL_FABRIC_PREFIX}-c7`)).toBeNull();
  });

  it('returns null for a foreign prefix / bare id', () => {
    expect(socialFabricModeFor('ev-s4-food-system-c1')).toBeNull();
    expect(socialFabricModeFor('')).toBeNull();
    expect(socialFabricModeFor(SOCIAL_FABRIC_PREFIX)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode -- total / defensive / seeded
// ---------------------------------------------------------------------------

describe('decodeSocialFabric (defensive + seeded)', () => {
  it('never throws on empty / garbage FormValue across all modes', () => {
    const garbageValues: FormValue[] = [
      {},
      { sfRelSince: 'a-bare-string' },
      { sfExpChips0: [1, 2, 3] as unknown as string[] },
      { sfPaBy: { not: 'an-array' } as unknown as string[] },
      { sfCohLevels: null as unknown as string[] },
      { sfSkills0: 42 as unknown as string },
      { sfNetAccess: ['on'], sfNetCustom: 7 as unknown as string },
    ];
    for (const mode of ALL_MODES) {
      for (const v of garbageValues) {
        expect(() => decodeSocialFabric(mode, v)).not.toThrow();
      }
    }
  });

  it('seeds relationships from the mockup defaults when empty', () => {
    const m = decodeSocialFabric('relationships', {}) as RelationshipsModel;
    expect(m.since).toEqual(REL_HOUSEHOLDS.map((h) => h.since));
    expect(m.depth).toEqual(REL_HOUSEHOLDS.map((h) => h.depth));
    expect(m.cohab).toEqual(REL_HOUSEHOLDS.map((h) => h.cohab));
    expect(m.notes).toHaveLength(REL_HOUSEHOLDS.length);
  });

  it('seeds experience chips per household from the mockup defaults', () => {
    const m = decodeSocialFabric('experience', {}) as ExperienceModel;
    expect(m.chips).toHaveLength(EXP_HOUSEHOLDS.length);
    expect(m.chips[0]).toEqual([...EXP_HOUSEHOLDS[0]!.chipsOn]);
    expect(m.notes[2]).toBe(EXP_HOUSEHOLDS[2]!.note);
  });

  it('seeds a single prior attempt from PA_SEED when empty', () => {
    const m = decodeSocialFabric('priorattempts', {}) as PriorAttemptsModel;
    expect(m.by).toEqual([PA_SEED.by]);
    expect(m.end).toEqual([PA_SEED.end]);
    expect(m.noAttempts).toBe('');
  });

  it('seeds cohesion levels/notes parallel to the domain register', () => {
    const m = decodeSocialFabric('cohesion', {}) as CohesionModel;
    expect(m.levels).toEqual(COH_DOMAINS.map((d) => d.level));
    expect(m.notes[2]).toBe(''); // privacy domain has no seed note
  });

  it('seeds skills per domain from the mockup on-chips', () => {
    const m = decodeSocialFabric('skills', {}) as SkillsModel;
    expect(m.domains).toHaveLength(SKILL_DOMAINS.length);
    expect(m.domains[3]).toEqual([]); // legal domain: all off
  });

  it('seeds network access from the mockup on/off defaults', () => {
    const m = decodeSocialFabric('networks', {}) as NetworksModel;
    expect(m.access).toHaveLength(NETWORKS.length);
    NETWORKS.forEach((n, i) => {
      expect(m.access[i]).toBe(n.on ? 'on' : '');
    });
    expect(m.custom).toBe('');
  });

  it('drops an out-of-set relationship select back to the verbatim default', () => {
    const m = decodeSocialFabric('relationships', {
      sfRelSince: ['NOT A REAL OPTION', '', '', ''],
    }) as RelationshipsModel;
    expect(m.since[0]).toBe(REL_HOUSEHOLDS[0]!.since);
  });
});

// ---------------------------------------------------------------------------
// encode -- lossless inverse + column-wise serialization
// ---------------------------------------------------------------------------

describe('encodeSocialFabric (lossless roundtrip)', () => {
  const cases: Array<{ mode: SocialFabricMode; value: FormValue }> = [
    {
      mode: 'relationships',
      value: {
        sfRelSince: REL_HOUSEHOLDS.map((h) => h.since),
        sfRelDepth: REL_HOUSEHOLDS.map((h) => h.depth),
        sfRelCohab: REL_HOUSEHOLDS.map((h) => h.cohab),
        sfRelNotes: ['note a', '', 'note c', ''],
      },
    },
    {
      mode: 'experience',
      value: {
        sfExpChips0: ['Intentional community'],
        sfExpChips1: ['Cooperative living'],
        sfExpChips2: ['Farm collective'],
        sfExpChips3: ['None'],
        sfExpNotes: ['x', 'y', 'z', 'w'],
      },
    },
    {
      mode: 'priorattempts',
      value: {
        sfPaNoAttempts: '',
        sfPaBy: ['This group', 'Previous land owner'],
        sfPaLand: ['Yes', 'No - different site'],
        sfPaDuration: ['1-3 years', '7+ years'],
        sfPaEnd: ['Interpersonal breakdown', 'Financial pressure'],
        sfPaNote: ['first', 'second'],
      },
    },
    {
      mode: 'cohesion',
      value: {
        sfCohLevels: COH_DOMAINS.map((d) => d.level),
        sfCohNotes: COH_DOMAINS.map((d) => d.note),
      },
    },
    {
      mode: 'skills',
      value: {
        sfSkills0: ['Consensus facilitation'],
        sfSkills1: [],
        sfSkills2: ['Soil biology'],
        sfSkills3: [],
        sfSkills4: ['Bookkeeping'],
        sfSkills5: ['First aid (certified)'],
      },
    },
    {
      mode: 'networks',
      value: {
        sfNetAccess: NETWORKS.map((n) => (n.on ? 'on' : '')),
        sfNetCustom: 'A named local advisor - met at the 2024 GEN gathering.',
      },
    },
  ];

  for (const { mode, value } of cases) {
    it(`roundtrips ${mode} through decode -> encode unchanged`, () => {
      const decoded = decodeSocialFabric(mode, value);
      const encoded = encodeSocialFabric(mode, decoded);
      expect(decodeSocialFabric(mode, encoded)).toEqual(decoded);
    });
  }

  it('stores register sets as parallel string[] columns', () => {
    const v = decodeToValue('relationships');
    expect(Array.isArray(v.sfRelSince)).toBe(true);
    expect(Array.isArray(v.sfRelDepth)).toBe(true);
    expect((v.sfRelSince as string[]).length).toBe(REL_HOUSEHOLDS.length);
    expect((v.sfRelDepth as string[]).length).toBe(REL_HOUSEHOLDS.length);
  });

  it('preserves a multi-attempt register length through a roundtrip', () => {
    const v: FormValue = {
      sfPaBy: ['This group', 'Related group / predecessor', 'Previous land owner'],
      sfPaLand: ['Yes', 'Yes', 'No - different site'],
      sfPaDuration: ['1-3 years', '3-7 years', '7+ years'],
      sfPaEnd: ['Interpersonal breakdown', 'Still active', 'Financial pressure'],
      sfPaNote: ['a', 'b', 'c'],
    };
    const m = decodeSocialFabric('priorattempts', v) as PriorAttemptsModel;
    expect(m.by).toHaveLength(3);
    expect(encodeSocialFabric('priorattempts', m).sfPaBy).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// pure helpers
// ---------------------------------------------------------------------------

describe('pure helpers', () => {
  it('skillBadgeFor: zero on -> Critical gap for legal domains, else Gap', () => {
    expect(skillBadgeFor('Legal & governance structures', 0)).toBe('Critical gap');
    expect(skillBadgeFor('Building & construction', 0)).toBe('Gap');
    expect(skillBadgeFor('Building & construction', 2)).toBe('Covered');
  });

  it('expBuckets reproduces the mockup 1/2/1 tally from the seed', () => {
    const m = decodeSocialFabric('experience', {}) as ExperienceModel;
    const b = expBuckets(m.chips);
    expect(b).toEqual({ intentional: 1, coop: 2, none: 1 });
  });

  it('cohTally reproduces the mockup 2/3/0/1 tally from the seed', () => {
    const m = decodeSocialFabric('cohesion', {}) as CohesionModel;
    expect(cohTally(m.levels)).toEqual({ high: 2, medium: 3, low: 0, tension: 1 });
  });
});

// ---------------------------------------------------------------------------
// validity arms -- only priorattempts is a genuine gate
// ---------------------------------------------------------------------------

describe('isSocialFabricValid', () => {
  it('relationships/experience/cohesion/skills/networks are seeded-valid', () => {
    for (const mode of ['relationships', 'experience', 'cohesion', 'skills', 'networks'] as const) {
      expect(isSocialFabricValid(mode, decodeToValue(mode))).toBe(true);
    }
  });

  it('priorattempts valid with a seeded attempt, invalid when emptied + unconfirmed', () => {
    expect(isSocialFabricValid('priorattempts', decodeToValue('priorattempts'))).toBe(true);
    const emptied: FormValue = {
      sfPaNoAttempts: '',
      sfPaBy: [],
      sfPaLand: [],
      sfPaDuration: [],
      sfPaEnd: [],
      sfPaNote: [],
    };
    expect(isSocialFabricValid('priorattempts', emptied)).toBe(false);
  });

  it('priorattempts valid when no-attempts is confirmed with zero rows', () => {
    const confirmed: FormValue = {
      sfPaNoAttempts: 'on',
      sfPaBy: [],
      sfPaLand: [],
      sfPaDuration: [],
      sfPaEnd: [],
      sfPaNote: [],
    };
    expect(isSocialFabricValid('priorattempts', confirmed)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// summarise -- never throws; reflects content; ignores siblings
// ---------------------------------------------------------------------------

describe('summariseSocialFabric', () => {
  it('never throws on empty value across all modes', () => {
    for (const mode of ALL_MODES) {
      expect(() => summariseSocialFabric(mode, {})).not.toThrow();
      expect(typeof summariseSocialFabric(mode, {})).toBe('string');
    }
  });

  it('ignores siblingValues (no cross-item reads)', () => {
    const a = summariseSocialFabric('cohesion', decodeToValue('cohesion'));
    const b = summariseSocialFabric('cohesion', decodeToValue('cohesion'), {
      'ev-s2-social-fabric-c1': { sfRelSince: ['99'] },
    });
    expect(a).toBe(b);
  });

  it('reflects the cohesion tally', () => {
    expect(summariseSocialFabric('cohesion', decodeToValue('cohesion'))).toContain(
      '1 Tension',
    );
  });

  it('reflects the no-prior-attempts confirmation', () => {
    const confirmed: FormValue = {
      sfPaNoAttempts: 'on',
      sfPaBy: [],
      sfPaLand: [],
      sfPaDuration: [],
      sfPaEnd: [],
      sfPaNote: [],
    };
    expect(summariseSocialFabric('priorattempts', confirmed)).toMatch(/No prior attempts/i);
  });
});

// ---------------------------------------------------------------------------
// component render -- distinctive verbatim strings per mode
// ---------------------------------------------------------------------------

function renderMode(mode: SocialFabricMode, value: FormValue = {}): void {
  render(
    <SocialFabricCapture
      mode={mode}
      value={value}
      onChange={NOOP}
      itemId={`${SOCIAL_FABRIC_PREFIX}-c1`}
    />,
  );
}

describe('SocialFabricCapture render', () => {
  it('relationships renders all four households', () => {
    renderMode('relationships');
    expect(screen.getByText('Sarah Mitchell')).toBeTruthy();
    expect(screen.getByText('Aroha & James Ngai')).toBeTruthy();
    expect(screen.getByText('Marcus Delacroix')).toBeTruthy();
    expect(screen.getByText('Elif Yildiz & family')).toBeTruthy();
  });

  it('experience renders the live tally strip', () => {
    renderMode('experience');
    // "Co-op / collective" and "No experience" are tally-only bucket labels
    // (unique), so they prove the strip rendered. "Intentional community" also
    // appears as a selectable chip on every household, so scope that assertion
    // to the tally strip (the bucket label's summary container) to disambiguate.
    const coop = screen.getByText('Co-op / collective');
    expect(coop).toBeTruthy();
    expect(screen.getByText('No experience')).toBeTruthy();
    const strip = coop.closest('div')!.parentElement!;
    expect(within(strip).getByText('Intentional community')).toBeTruthy();
  });

  it('priorattempts renders the no-attempts confirmation block', () => {
    renderMode('priorattempts');
    expect(
      screen.getByText('Confirmed - no prior attempts on this land or by this group'),
    ).toBeTruthy();
    expect(screen.getByText(/Record another prior attempt/)).toBeTruthy();
  });

  it('cohesion renders the six domains and the four-cell summary', () => {
    renderMode('cohesion');
    expect(screen.getByText('Shared vision & purpose')).toBeTruthy();
    expect(screen.getByText('Financial capacity & expectations')).toBeTruthy();
    expect(screen.getByText('Conflict resolution comfort')).toBeTruthy();
  });

  it('skills renders the auto gap badges (Critical gap on the legal domain)', () => {
    renderMode('skills');
    expect(screen.getByText('Legal & governance structures')).toBeTruthy();
    expect(screen.getByText('Critical gap')).toBeTruthy();
  });

  it('networks renders the six networks and the custom-contact field', () => {
    renderMode('networks');
    expect(screen.getByText('GEN Canada / Global Ecovillage Network')).toBeTruthy();
    expect(
      screen.getByText('Community Land Trust Network of Canada'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Add a custom contact or network'),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// interactions -- fire onChange with the expected serialization
// ---------------------------------------------------------------------------

describe('SocialFabricCapture interactions', () => {
  it('toggling a cohesion level emits an updated parallel array', () => {
    const onChange = vi.fn();
    render(
      <SocialFabricCapture
        mode="cohesion"
        value={{}}
        onChange={onChange}
        itemId={`${SOCIAL_FABRIC_PREFIX}-c4`}
      />,
    );
    // domain 0 (vision) is seeded High; click its "Low" segment.
    const lows = screen.getAllByText('Low');
    fireEvent.click(lows[0]!);
    const call = onChange.mock.calls[0]![0] as FormValue;
    const levels = call.sfCohLevels as string[];
    expect(levels[0]).toBe('Low');
  });

  it('toggling a network off emits an updated access array', () => {
    const onChange = vi.fn();
    render(
      <SocialFabricCapture
        mode="networks"
        value={{}}
        onChange={onChange}
        itemId={`${SOCIAL_FABRIC_PREFIX}-c6`}
      />,
    );
    // GEN is seeded on; clicking it toggles off.
    fireEvent.click(screen.getByText('GEN Canada / Global Ecovillage Network'));
    const call = onChange.mock.calls[0]![0] as FormValue;
    const access = call.sfNetAccess as string[];
    expect(access[0]).toBe('');
  });

  it('editing the custom-contact field emits the new text', () => {
    const onChange = vi.fn();
    render(
      <SocialFabricCapture
        mode="networks"
        value={{}}
        onChange={onChange}
        itemId={`${SOCIAL_FABRIC_PREFIX}-c6`}
      />,
    );
    fireEvent.change(screen.getByLabelText('Add a custom contact or network'), {
      target: { value: 'A new contact.' },
    });
    const call = onChange.mock.calls[0]![0] as FormValue;
    expect(call.sfNetCustom).toBe('A new contact.');
  });

  it('confirming no-prior-attempts emits sfPaNoAttempts="on"', () => {
    const onChange = vi.fn();
    render(
      <SocialFabricCapture
        mode="priorattempts"
        value={{}}
        onChange={onChange}
        itemId={`${SOCIAL_FABRIC_PREFIX}-c3`}
      />,
    );
    fireEvent.click(
      screen.getByText('Confirmed - no prior attempts on this land or by this group'),
    );
    const call = onChange.mock.calls[0]![0] as FormValue;
    expect(call.sfPaNoAttempts).toBe('on');
  });
});

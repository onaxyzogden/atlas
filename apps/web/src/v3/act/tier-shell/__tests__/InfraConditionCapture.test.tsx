/**
 * @vitest-environment happy-dom
 *
 * InfraConditionCapture -- contract (mode mapper, decode/encode/valid/summarise)
 * AND the React component + 5 mode bodies (c1..c5). Mirrors the
 * FoodSystemCapture / SocialFabricCapture test structure. Logic tests assert
 * decode is total/defensive and SEEDS the verbatim mockup defaults (the survey
 * ships pre-populated), encode is a lossless inverse over parallel column-wise
 * string[] arrays, and the validity arms (only REUSE is a genuine gate: it
 * starts INVALID with two seeded-pending elements -- old dairy + creek ford).
 * Render tests assert each body's distinctive verbatim text, including the
 * friable-asbestos OH&S obligation (surfaced, never enforced) and the dynamic
 * pending-disposition warning. This is an infrastructure survey -- no sale /
 * contribution copy, so no Amanah surface to assert.
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
  InfraConditionCapture,
  INFRA_CONDITION_PREFIX,
  infraConditionModeFor,
  decodeInfraCondition,
  encodeInfraCondition,
  isInfraConditionValid,
  summariseInfraCondition,
  CONDITION_OPTIONS,
  COMPLIANCE_OVERALL_OPTIONS,
  COMPLIANCE_CARDS,
  COMPLIANCE_OHS_LEAD,
  COMPLIANCE_OHS_BODY,
  UTILITY_STATUS_OPTIONS,
  PASSABILITY_OPTIONS,
  REUSE_ELEMENTS,
  type InfraConditionMode,
  type BuildingsModel,
  type ComplianceModel,
  type UtilitiesModel,
  type AccessModel,
  type ReuseModel,
} from '../InfraConditionCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const NOOP = (): void => {};

const ALL_MODES: readonly InfraConditionMode[] = [
  'buildings',
  'compliance',
  'utilities',
  'access',
  'reuse',
];

/** decode-then-encode: the canonical seeded FormValue for a mode. */
function decodeToValue(mode: InfraConditionMode): FormValue {
  return encodeInfraCondition(mode, decodeInfraCondition(mode, {}));
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('infraConditionModeFor', () => {
  it('maps c1..c5 to the five modes', () => {
    const expected: Record<string, InfraConditionMode> = {
      c1: 'buildings',
      c2: 'compliance',
      c3: 'utilities',
      c4: 'access',
      c5: 'reuse',
    };
    for (const [suffix, mode] of Object.entries(expected)) {
      expect(infraConditionModeFor(`${INFRA_CONDITION_PREFIX}-${suffix}`)).toBe(mode);
    }
  });

  it('returns null for an out-of-range suffix (c6)', () => {
    expect(infraConditionModeFor(`${INFRA_CONDITION_PREFIX}-c6`)).toBeNull();
  });

  it('returns null for a foreign prefix / bare id', () => {
    expect(infraConditionModeFor('ev-s2-social-fabric-c1')).toBeNull();
    expect(infraConditionModeFor('')).toBeNull();
    expect(infraConditionModeFor(INFRA_CONDITION_PREFIX)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode -- total / defensive / seeded
// ---------------------------------------------------------------------------

describe('decodeInfraCondition (defensive + seeded)', () => {
  it('never throws on empty / garbage FormValue across all modes', () => {
    const garbageValues: FormValue[] = [
      {},
      { icBldgCondition: 'a-bare-string' },
      { icCompOverall: [1, 2, 3] as unknown as string[] },
      { icUtilStatus: { not: 'an-array' } as unknown as string[] },
      { icAccessPass: null as unknown as string[] },
      { icReuseDisp: 42 as unknown as string, icReuseScope: ['x'] },
    ];
    for (const mode of ALL_MODES) {
      for (const v of garbageValues) {
        expect(() => decodeInfraCondition(mode, v)).not.toThrow();
      }
    }
  });

  it('decode buildings with no stored data returns empty arrays (operator enters rows)', () => {
    const m = decodeInfraCondition('buildings', {}) as BuildingsModel;
    expect(m.names).toHaveLength(0);
    expect(m.condition).toHaveLength(0);
  });

  it('seeds compliance overall status from the mockup defaults when empty', () => {
    const m = decodeInfraCondition('compliance', {}) as ComplianceModel;
    expect(m.overall).toEqual(COMPLIANCE_CARDS.map((c) => c.defOverall));
  });

  it('decode utilities with no stored data returns empty arrays (operator enters rows)', () => {
    const m = decodeInfraCondition('utilities', {}) as UtilitiesModel;
    expect(m.names).toHaveLength(0);
    expect(m.status).toHaveLength(0);
  });

  it('decode access with no stored data returns empty arrays (operator enters rows)', () => {
    const m = decodeInfraCondition('access', {}) as AccessModel;
    expect(m.names).toHaveLength(0);
    expect(m.passability).toHaveLength(0);
  });

  it('seeds reuse dispositions + scopes from the mockup, with two pending', () => {
    const m = decodeInfraCondition('reuse', {}) as ReuseModel;
    expect(m.disposition).toEqual(REUSE_ELEMENTS.map((e) => e.defDisposition));
    expect(m.scope).toEqual(REUSE_ELEMENTS.map((e) => e.defScope));
    // old dairy + creek ford ship pending ("").
    expect(m.disposition.filter((d) => d === '')).toHaveLength(2);
  });

  it('drops an out-of-set building condition back to Fair (CONDITION_OPTIONS[2])', () => {
    const m = decodeInfraCondition('buildings', {
      icBldgNames: ['North shed'],
      icBldgCondition: ['NOT A REAL OPTION'],
    }) as BuildingsModel;
    expect(m.condition[0]).toBe('Fair');
  });
});

// ---------------------------------------------------------------------------
// encode -- lossless inverse + column-wise serialization
// ---------------------------------------------------------------------------

describe('encodeInfraCondition (lossless roundtrip)', () => {
  const cases: Array<{ mode: InfraConditionMode; value: FormValue }> = [
    {
      mode: 'buildings',
      value: {
        icBldgNames: ['North shed', 'Old dairy', 'Dam pumphouse'],
        icBldgInfo: ['Timber frame', 'Brick masonry', 'Steel frame'],
        icBldgCondition: ['Good', 'Unsafe', 'Excellent'],
        icBldgDetail: ['detail 1', 'detail 2', 'detail 3'],
      },
    },
    {
      mode: 'compliance',
      value: {
        icCompOverall: ['Minor issues', 'No compliance issues', 'Minor issues'],
      },
    },
    {
      mode: 'utilities',
      value: {
        icUtilNames: ['Electrical supply', 'Bore water', 'Wastewater', 'Communications', 'Gas'],
        icUtilStatus: ['Active', 'Active', 'None', 'Limited', 'None'],
        icUtilDetail: ['d1', 'd2', 'd3', 'd4', 'd5'],
      },
    },
    {
      mode: 'access',
      value: {
        icAccessNames: ['Main driveway', 'North paddock track', 'Creek ford'],
        icAccessPass: ['All-weather', 'All-weather', 'Dry season only'],
        icAccessDetail: ['d1', 'd2', 'd3'],
      },
    },
    {
      mode: 'reuse',
      value: {
        icReuseDisp: [
          'Reuse',
          'Demolish',
          'Reuse',
          'Upgrade',
          'Upgrade',
          'Reuse',
          'Upgrade',
          'Install crossing',
        ],
        icReuseScope: REUSE_ELEMENTS.map((e) => e.defScope),
      },
    },
  ];

  for (const { mode, value } of cases) {
    it(`roundtrips ${mode} through decode -> encode unchanged`, () => {
      const decoded = decodeInfraCondition(mode, value);
      const encoded = encodeInfraCondition(mode, decoded);
      expect(decodeInfraCondition(mode, encoded)).toEqual(decoded);
    });
  }

  it('stores register sets as parallel string[] columns', () => {
    const v = decodeToValue('reuse');
    expect(Array.isArray(v.icReuseDisp)).toBe(true);
    expect(Array.isArray(v.icReuseScope)).toBe(true);
    expect((v.icReuseDisp as string[]).length).toBe(REUSE_ELEMENTS.length);
    expect((v.icReuseScope as string[]).length).toBe(REUSE_ELEMENTS.length);
  });
});

// ---------------------------------------------------------------------------
// validity arms -- only reuse is a genuine gate
// ---------------------------------------------------------------------------

describe('isInfraConditionValid', () => {
  it('buildings/compliance/utilities/access are seeded-valid (advisory)', () => {
    for (const mode of ['buildings', 'compliance', 'utilities', 'access'] as const) {
      expect(isInfraConditionValid(mode, decodeToValue(mode))).toBe(true);
      // advisory arms ignore the value entirely.
      expect(isInfraConditionValid(mode, {})).toBe(true);
    }
  });

  it('reuse is INVALID at seed (old dairy + creek ford pending)', () => {
    expect(isInfraConditionValid('reuse', decodeToValue('reuse'))).toBe(false);
    expect(isInfraConditionValid('reuse', {})).toBe(false);
  });

  it('reuse becomes valid once every element carries a disposition', () => {
    const seeded = decodeInfraCondition('reuse', {}) as ReuseModel;
    const filled = seeded.disposition.map((d, i) =>
      d === '' ? REUSE_ELEMENTS[i]!.options[0]! : d,
    );
    const value = encodeInfraCondition('reuse', { ...seeded, disposition: filled });
    expect(isInfraConditionValid('reuse', value)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// summarise -- never throws; reflects content; ignores siblings
// ---------------------------------------------------------------------------

describe('summariseInfraCondition', () => {
  it('never throws on empty value across all modes', () => {
    for (const mode of ALL_MODES) {
      expect(() => summariseInfraCondition(mode, {})).not.toThrow();
      expect(typeof summariseInfraCondition(mode, {})).toBe('string');
    }
  });

  it('ignores siblingValues (no cross-item reads)', () => {
    const a = summariseInfraCondition('reuse', decodeToValue('reuse'));
    const b = summariseInfraCondition('reuse', decodeToValue('reuse'), {
      'ev-s3-infra-condition-c1': { icBldgCondition: ['Unsafe'] },
    });
    expect(a).toBe(b);
  });

  it('reflects empty counts for buildings, utilities, access (operator enters rows)', () => {
    expect(summariseInfraCondition('buildings', {})).toBe(
      '0 structures inventoried, 0 flagged Poor/Unsafe',
    );
    expect(summariseInfraCondition('utilities', {})).toBe(
      '0 utilities recorded, 0 inactive',
    );
    expect(summariseInfraCondition('access', {})).toBe(
      '0 routes assessed, 0 with passability limits',
    );
    expect(summariseInfraCondition('reuse', {})).toBe(
      '2 of 8 elements pending disposition',
    );
  });

  it('compliance summary reflects seeded major/minor/clear counts', () => {
    expect(summariseInfraCondition('compliance', {})).toBe('1 major, 1 minor, 1 clear');
  });

  it('buildings summary reflects operator-entered rows', () => {
    const value: FormValue = {
      icBldgNames: ['Shed A', 'Old dairy'],
      icBldgCondition: ['Good', 'Poor'],
      icBldgInfo: ['', ''],
      icBldgDetail: ['', ''],
    };
    expect(summariseInfraCondition('buildings', value)).toBe(
      '2 structures inventoried, 1 flagged Poor/Unsafe',
    );
  });
});

// ---------------------------------------------------------------------------
// component render -- distinctive verbatim strings per mode
// ---------------------------------------------------------------------------

function renderMode(
  mode: InfraConditionMode,
  value: FormValue = {},
  itemSuffix = 'c1',
): void {
  render(
    <InfraConditionCapture
      mode={mode}
      value={value}
      onChange={NOOP}
      itemId={`${INFRA_CONDITION_PREFIX}-${itemSuffix}`}
    />,
  );
}

describe('InfraConditionCapture render', () => {
  it('buildings renders the register header and "Add structure" button when empty', () => {
    renderMode('buildings');
    expect(screen.getByText('Building register')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add structure/i })).toBeTruthy();
  });

  it('buildings renders operator-entered structure rows', () => {
    renderMode('buildings', {
      icBldgNames: ['North shed', 'Old dairy'],
      icBldgCondition: ['Good', 'Poor'],
      icBldgInfo: ['Timber frame', 'Brick masonry'],
      icBldgDetail: ['detail a', 'detail b'],
    });
    expect(screen.getByDisplayValue('North shed')).toBeTruthy();
    expect(screen.getByDisplayValue('Old dairy')).toBeTruthy();
  });

  it('compliance surfaces the friable-asbestos OH&S obligation verbatim', () => {
    renderMode('compliance', {}, 'c2');
    const note = screen.getByRole('note');
    expect(note.textContent).toContain(COMPLIANCE_OHS_LEAD);
    expect(note.textContent).toContain(COMPLIANCE_OHS_BODY);
    // the friable-asbestos line flag also renders.
    expect(screen.getByText('Friable')).toBeTruthy();
  });

  it('utilities renders the register header and "Add utility" button when empty', () => {
    renderMode('utilities', {}, 'c3');
    expect(screen.getByText('Utility register')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add utility/i })).toBeTruthy();
  });

  it('utilities renders operator-entered utility rows', () => {
    renderMode('utilities', {
      icUtilNames: ['Electrical supply', 'Bore water'],
      icUtilStatus: ['Active', 'Limited'],
      icUtilDetail: ['d1', 'd2'],
    }, 'c3');
    expect(screen.getByDisplayValue('Electrical supply')).toBeTruthy();
    expect(screen.getByDisplayValue('Bore water')).toBeTruthy();
  });

  it('access renders the register header and "Add route" button when empty', () => {
    renderMode('access', {}, 'c4');
    expect(screen.getByText('Access route register')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add route/i })).toBeTruthy();
  });

  it('access renders operator-entered route rows', () => {
    renderMode('access', {
      icAccessNames: ['Main driveway', 'North paddock track'],
      icAccessPass: ['All-weather', 'Dry season only'],
      icAccessDetail: ['d1', 'd2'],
    }, 'c4');
    expect(screen.getByDisplayValue('Main driveway')).toBeTruthy();
    expect(screen.getByDisplayValue('North paddock track')).toBeTruthy();
  });

  it('reuse renders the dynamic pending-disposition warning', () => {
    renderMode('reuse', {}, 'c5');
    const note = screen.getByRole('note');
    expect(note.textContent).toMatch(/2\s+elements pending/);
    // verbatim joinAnd of the two seeded-pending element names.
    expect(note.textContent).toContain('old dairy and creek ford crossing');
  });

  it('reuse drops the warning once everything is dispositioned', () => {
    const seeded = decodeInfraCondition('reuse', {}) as ReuseModel;
    const filled = seeded.disposition.map((d, i) =>
      d === '' ? REUSE_ELEMENTS[i]!.options[0]! : d,
    );
    const value = encodeInfraCondition('reuse', { ...seeded, disposition: filled });
    renderMode('reuse', value, 'c5');
    expect(screen.queryByRole('note')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// interactions -- fire onChange with the expected serialization
// ---------------------------------------------------------------------------

describe('InfraConditionCapture interactions', () => {
  it('clicking "Add structure" emits a new empty row with default Fair condition', () => {
    const onChange = vi.fn();
    render(
      <InfraConditionCapture
        mode="buildings"
        value={{}}
        onChange={onChange}
        itemId={`${INFRA_CONDITION_PREFIX}-c1`}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Add structure/i }));
    const call = onChange.mock.calls[0]![0] as FormValue;
    expect((call.icBldgNames as string[])).toEqual(['']);
    expect((call.icBldgCondition as string[])[0]).toBe('Fair');
  });

  it('changing a building condition emits an updated parallel array', () => {
    const onChange = vi.fn();
    const preValue: FormValue = {
      icBldgNames: ['North shed'],
      icBldgCondition: ['Fair'],
      icBldgInfo: [''],
      icBldgDetail: [''],
    };
    render(
      <InfraConditionCapture
        mode="buildings"
        value={preValue}
        onChange={onChange}
        itemId={`${INFRA_CONDITION_PREFIX}-c1`}
      />,
    );
    fireEvent.change(screen.getByLabelText('Structure 1 condition'), {
      target: { value: 'Unsafe' },
    });
    const call = onChange.mock.calls[0]![0] as FormValue;
    const conditions = call.icBldgCondition as string[];
    expect(conditions[0]).toBe('Unsafe');
    expect(CONDITION_OPTIONS).toContain('Unsafe');
  });

  it('resolving the creek ford disposition emits a non-empty slot', () => {
    const onChange = vi.fn();
    render(
      <InfraConditionCapture
        mode="reuse"
        value={{}}
        onChange={onChange}
        itemId={`${INFRA_CONDITION_PREFIX}-c5`}
      />,
    );
    // "Install crossing" is unique to the creek ford (index 7).
    fireEvent.click(screen.getByText('Install crossing'));
    const call = onChange.mock.calls[0]![0] as FormValue;
    const disp = call.icReuseDisp as string[];
    expect(disp[7]).toBe('Install crossing');
  });

  it('selecting a disposition via the per-element group targets the right row', () => {
    const onChange = vi.fn();
    render(
      <InfraConditionCapture
        mode="reuse"
        value={{}}
        onChange={onChange}
        itemId={`${INFRA_CONDITION_PREFIX}-c5`}
      />,
    );
    const group = screen.getByRole('group', {
      name: 'Old dairy / milking shed disposition',
    });
    fireEvent.click(within(group).getByText('Demolish'));
    const call = onChange.mock.calls[0]![0] as FormValue;
    const disp = call.icReuseDisp as string[];
    // old dairy is index 1.
    expect(disp[1]).toBe('Demolish');
  });
});

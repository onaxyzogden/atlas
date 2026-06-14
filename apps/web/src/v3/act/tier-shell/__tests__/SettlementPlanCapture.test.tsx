/**
 * @vitest-environment happy-dom
 *
 * SettlementPlanCapture -- multi-mode CONTROLLED renderer for objective
 * ev-s7-settlement-plan (6 checklist items c1..c6, modes cohort / thresholds /
 * criteria / schedule / capacityFit / enforcement).
 *
 * Verified behaviours:
 *   - settlementPlanModeFor maps each c1..c6 id correctly.
 *   - NEGATIVE: ev-s4-settlement-strategy-c1 (near-name) returns null.
 *   - decode is TOTAL/defensive (undefined/empty -> empty state, never throws).
 *   - encode round-trips losslessly per mode.
 *   - legacy {text} string tolerance + garbage-JSON tolerance.
 *   - validity gates per mode -- c5 ack hard gate (off -> invalid, on -> valid).
 *   - summary strings non-empty on populated values per mode.
 *   - settlementPhasesFrom ordering + tolerance (founding first only when
 *     arrivalISO set; milestone folded into label; complete carried; garbage rows
 *     skipped).
 *   - one render + one interaction per mode (happy-dom, fire a change and assert
 *     the onChange payload contains the expected sp* key).
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// lucide-react forwardRef icons spread [undefined] into <svg> children when
// childless, which React + happy-dom reject on re-render. Replace every
// component export with a clean <svg> stub (established pattern).
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
  SettlementPlanCapture,
  settlementPlanModeFor,
  decodeSettlementPlan,
  encodeSettlementPlan,
  isSettlementPlanValid,
  summariseSettlementPlan,
  settlementPhasesFrom,
  enforcementSignatory,
  capacityFitEffectiveMax,
  SETTLEMENT_PLAN_PREFIX,
  type SettlementPlanMode,
} from '../SettlementPlanCapture.js';
import {
  computeSynthesis,
  CARRYING_CAPACITY_PREFIX,
} from '../CarryingCapacityCapture.js';
import type { FormValue } from '../actToolCatalog.js';
import type { StewardOption } from '../captures/stewardRef.js';

// An "assessed" ev-s2-carrying-capacity sibling map (real operator inputs across
// c1..c5). carryingCapacityAssessed -> true, so settlement-plan c6 derives its
// ceiling from the synthesis (R3 P1 "derived replaces manual"). Values mirror the
// coherent demo scenario but are now persisted operator entries, so minPeople>0.
const ASSESSED_CC_SIBLINGS: Record<string, FormValue> = {
  [`${CARRYING_CAPACITY_PREFIX}-c1`]: {
    hh: '8',
    pph: '2.5',
    wDom: '80',
    wIrr: '1200',
    wLive: '400',
    wSupply: '5000',
  },
  [`${CARRYING_CAPACITY_PREFIX}-c2`]: {
    fArea: '20000',
    fExtern: '30',
    ccFoodIntensity: '450',
  },
  [`${CARRYING_CAPACITY_PREFIX}-c3`]: { nComp: '25' },
  [`${CARRYING_CAPACITY_PREFIX}-c4`]: { eDemand: '8', eSolar: '20' },
  [`${CARRYING_CAPACITY_PREFIX}-c5`]: {
    spaceTotalHa: '45',
    sWild: '27',
    sFood: '4',
    sComm: '0.5',
    sHh: '0.5',
  },
};

// A fully-signed c5 enforcement FormValue (enforcer + ack + named non-self
// verifier with a timestamp) -- the only shape that satisfies the F1 hard gate.
const SIGNED_ENFORCEMENT: FormValue = {
  spEnforcer: 'Independent verifier -- someone other than the arriving household',
  spNotSelfReportedAck: 'on',
  spVerifierName: 'Layla Haddad',
  spVerifierRole: 'independent',
  spVerifiedAt: '2026-06-13T10:00:00.000Z',
};

function renderMode(
  mode: SettlementPlanMode,
  value: FormValue,
  extra: {
    siblingValues?: Record<string, FormValue>;
    stewardOptions?: readonly StewardOption[];
  } = {},
) {
  const onChange = vi.fn();
  render(
    <SettlementPlanCapture
      mode={mode}
      value={value}
      onChange={onChange}
      itemId={`${SETTLEMENT_PLAN_PREFIX}-${mode === 'cohort' ? 'c1' : mode === 'thresholds' ? 'c2' : mode === 'criteria' ? 'c3' : mode === 'schedule' ? 'c4' : mode === 'capacityFit' ? 'c6' : 'c5'}`}
      siblingValues={extra.siblingValues}
      stewardOptions={extra.stewardOptions}
    />,
  );
  return { onChange };
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('settlementPlanModeFor', () => {
  it('maps c1..c6 to the correct mode', () => {
    expect(settlementPlanModeFor('ev-s7-settlement-plan-c1')).toBe('cohort');
    expect(settlementPlanModeFor('ev-s7-settlement-plan-c2')).toBe('thresholds');
    expect(settlementPlanModeFor('ev-s7-settlement-plan-c3')).toBe('criteria');
    expect(settlementPlanModeFor('ev-s7-settlement-plan-c4')).toBe('schedule');
    expect(settlementPlanModeFor('ev-s7-settlement-plan-c6')).toBe('capacityFit');
    expect(settlementPlanModeFor('ev-s7-settlement-plan-c5')).toBe('enforcement');
  });

  it('returns null for unrelated ids', () => {
    expect(settlementPlanModeFor('ev-s7-settlement-plan-c7')).toBeNull();
    expect(settlementPlanModeFor('ev-s7-settlement-plan-')).toBeNull();
    expect(settlementPlanModeFor('')).toBeNull();
  });

  it('NEGATIVE: near-name ev-s4-settlement-strategy-c1 returns null', () => {
    // The ev-s4-settlement-strategy-c1 id must NOT resolve to a settlement-plan
    // mode -- its own mapper (settlementModeFor) handles it under the "st-" namespace.
    expect(settlementPlanModeFor('ev-s4-settlement-strategy-c1')).toBeNull();
    expect(settlementPlanModeFor('ev-s4-settlement-strategy-c2')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode: total / defensive (never seeds; never throws)
// ---------------------------------------------------------------------------

describe('decodeSettlementPlan -- empty / undefined value never seeds', () => {
  const MODES: SettlementPlanMode[] = [
    'cohort', 'thresholds', 'criteria', 'schedule', 'capacityFit', 'enforcement',
  ];

  it.each(MODES)('%s decode of {} yields empty / zero / off state', (mode) => {
    expect(() => decodeSettlementPlan(mode, {})).not.toThrow();
    const m = decodeSettlementPlan(mode, {});
    expect(m.kind).toBe(mode);
    if (mode === 'cohort') {
      const c = m as { composition: string; arrivalISO: string; households: number };
      expect(c.composition).toBe('');
      expect(c.arrivalISO).toBe('');
      expect(c.households).toBe(0);
    }
    if (mode === 'thresholds') {
      expect((m as { rows: unknown[] }).rows).toEqual([]);
    }
    if (mode === 'criteria') {
      // No persisted array, no siblings -> empty seed
      expect((m as { rows: unknown[]; baked: boolean }).rows).toEqual([]);
      expect((m as { rows: unknown[]; baked: boolean }).baked).toBe(false);
    }
    if (mode === 'schedule') {
      expect((m as { rows: unknown[] }).rows).toEqual([]);
    }
    if (mode === 'capacityFit') {
      const c = m as { maxPopulation: number; confirmed: boolean };
      expect(c.maxPopulation).toBe(0);
      expect(c.confirmed).toBe(false);
    }
    if (mode === 'enforcement') {
      const e = m as {
        enforcer: string;
        notSelfReportedAck: boolean;
        verifierName: string;
        verifierRole: string;
        verifiedAt: string;
      };
      expect(e.enforcer).toBe('');
      expect(e.notSelfReportedAck).toBe(false);
      // F1: the verifier signature fields default empty (never fabricated).
      expect(e.verifierName).toBe('');
      expect(e.verifierRole).toBe('');
      expect(e.verifiedAt).toBe('');
    }
  });
});

// ---------------------------------------------------------------------------
// encode round-trip (per mode)
// ---------------------------------------------------------------------------

describe('encode round-trips', () => {
  it('cohort round-trips (new spCohortRows shape, incl. a steward link)', () => {
    const value: FormValue = {
      spCohortRows: [
        JSON.stringify({ id: 'h1', name: 'Ali family', size: 4 }),
        JSON.stringify({ id: 'h2', name: 'Sara family', size: 3, ref: { email: 's@x.nz' } }),
      ],
      spArrivalISO: '2026-09-01',
    };
    const model = decodeSettlementPlan('cohort', value);
    expect(decodeSettlementPlan('cohort', encodeSettlementPlan(model))).toEqual(model);
  });

  it('thresholds round-trips (JSON rows)', () => {
    const rows = [
      JSON.stringify({ id: 'r1', domain: 'Potable water', item: '20 L/person/day tested' }),
      JSON.stringify({ id: 'r2', domain: 'Shelter', item: 'Weatherproof to code' }),
    ];
    const value: FormValue = { spThresholds: rows };
    const model = decodeSettlementPlan('thresholds', value);
    expect(decodeSettlementPlan('thresholds', encodeSettlementPlan(model))).toEqual(model);
  });

  it('criteria round-trips (baked persisted array)', () => {
    const rows = [
      JSON.stringify({ id: 'c1', text: 'Water confirmed', signedOff: true }),
      JSON.stringify({ id: 'c2', text: 'Shelter confirmed', signedOff: false }),
    ];
    const value: FormValue = { spCriteria: rows };
    const model = decodeSettlementPlan('criteria', value);
    expect(decodeSettlementPlan('criteria', encodeSettlementPlan(model))).toEqual(model);
  });

  it('schedule round-trips (JSON rows)', () => {
    const rows = [
      JSON.stringify({ id: 's1', cohort: 'Cohort 2', dateISO: '2027-03-01', size: 3, milestone: 'Second cabin complete', complete: false }),
    ];
    const value: FormValue = { spSchedule: rows };
    const model = decodeSettlementPlan('schedule', value);
    expect(decodeSettlementPlan('schedule', encodeSettlementPlan(model))).toEqual(model);
  });

  it('capacityFit round-trips', () => {
    const value: FormValue = { spMaxPopulation: '20', spCapacityConfirmed: 'on' };
    const model = decodeSettlementPlan('capacityFit', value);
    expect(decodeSettlementPlan('capacityFit', encodeSettlementPlan(model))).toEqual(model);
  });

  it('enforcement round-trips (incl. verifier signature fields)', () => {
    const model = decodeSettlementPlan('enforcement', SIGNED_ENFORCEMENT);
    expect(decodeSettlementPlan('enforcement', encodeSettlementPlan(model))).toEqual(model);
    // The verifier signature fields survive the round-trip.
    const m = model as { verifierName: string; verifierRole: string; verifiedAt: string };
    expect(m.verifierName).toBe('Layla Haddad');
    expect(m.verifierRole).toBe('independent');
    expect(m.verifiedAt).toBe('2026-06-13T10:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// legacy {text} string tolerance + garbage-JSON tolerance
// ---------------------------------------------------------------------------

describe('decode tolerance -- legacy and garbage', () => {
  it('legacy {text} (non-JSON string) in thresholds array is tolerated (never throws)', () => {
    const value: FormValue = {
      spThresholds: [
        'just a plain string',
        JSON.stringify({ id: 'r1', domain: 'Sanitation', item: 'Composting toilet operational' }),
      ],
    };
    expect(() => decodeSettlementPlan('thresholds', value)).not.toThrow();
    const m = decodeSettlementPlan('thresholds', value) as { rows: Array<{ id: string; item: string }> };
    expect(m.rows).toHaveLength(2);
    // First entry falls back to legacy-0 id, item = the raw string
    expect(m.rows[0]!.id).toBe('legacy-0');
    expect(m.rows[0]!.item).toBe('just a plain string');
    // Second entry parses cleanly
    expect(m.rows[1]!.id).toBe('r1');
  });

  it('garbage-JSON criteria rows are tolerated (legacy-<i> id fallback)', () => {
    const value: FormValue = {
      spCriteria: [
        '!@#$%garbage',
        JSON.stringify({ id: 'c1', text: 'Water confirmed', signedOff: false }),
      ],
    };
    expect(() => decodeSettlementPlan('criteria', value)).not.toThrow();
    const m = decodeSettlementPlan('criteria', value) as { rows: Array<{ id: string; text: string; signedOff: boolean }> };
    expect(m.rows).toHaveLength(2);
    expect(m.rows[0]!.id).toBe('legacy-0');
    expect(m.rows[0]!.text).toBe('!@#$%garbage');
    expect(m.rows[0]!.signedOff).toBe(false);
  });

  it('garbage-JSON schedule rows are tolerated', () => {
    const value: FormValue = {
      spSchedule: [
        '{{{}}}not-json',
        JSON.stringify({ id: 's1', cohort: 'Cohort 2', dateISO: '2027-01-01', size: 2, milestone: '', complete: false }),
      ],
    };
    expect(() => decodeSettlementPlan('schedule', value)).not.toThrow();
    const m = decodeSettlementPlan('schedule', value) as { rows: Array<{ id: string; cohort: string }> };
    expect(m.rows).toHaveLength(2);
    expect(m.rows[0]!.id).toBe('legacy-0');
    // The raw string is used as the cohort field fallback
    expect(m.rows[0]!.cohort).toBe('{{{}}}not-json');
  });

  it('non-array spThresholds (number/boolean) -> empty rows (never throws)', () => {
    // A number or boolean is coerced to '' by asStr then not added (empty string check).
    // A plain string IS treated as a single-element legacy row (asJsonArr coercion);
    // only nullish / non-string non-array values yield empty rows.
    const valueNum = { spThresholds: 42 } as unknown as FormValue;
    expect(() => decodeSettlementPlan('thresholds', valueNum)).not.toThrow();
    const m = decodeSettlementPlan('thresholds', valueNum) as { rows: unknown[] };
    expect(m.rows).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Validity gates
// ---------------------------------------------------------------------------

describe('isSettlementPlanValid', () => {
  it('cohort: invalid when empty; valid when composition + arrivalISO set', () => {
    expect(isSettlementPlanValid('cohort', {})).toBe(false);
    expect(isSettlementPlanValid('cohort', { spComposition: 'Family A', spArrivalISO: '2026-09-01' })).toBe(true);
    // composition but no date -> invalid
    expect(isSettlementPlanValid('cohort', { spComposition: 'Family A' })).toBe(false);
  });

  it('thresholds: invalid when empty; valid when at least one item has content', () => {
    expect(isSettlementPlanValid('thresholds', {})).toBe(false);
    const value: FormValue = {
      spThresholds: [JSON.stringify({ id: 'r1', domain: 'Potable water', item: '20 L tested' })],
    };
    expect(isSettlementPlanValid('thresholds', value)).toBe(true);
  });

  it('criteria: invalid when empty; valid when at least one criterion has text', () => {
    expect(isSettlementPlanValid('criteria', {})).toBe(false);
    const value: FormValue = {
      spCriteria: [JSON.stringify({ id: 'c1', text: 'Water confirmed', signedOff: false })],
    };
    expect(isSettlementPlanValid('criteria', value)).toBe(true);
  });

  it('schedule: invalid when empty; valid when at least one cohort has content', () => {
    expect(isSettlementPlanValid('schedule', {})).toBe(false);
    const value: FormValue = {
      spSchedule: [JSON.stringify({ id: 's1', cohort: 'Cohort 2', dateISO: '2027-01-01', size: 2, milestone: '', complete: false })],
    };
    expect(isSettlementPlanValid('schedule', value)).toBe(true);
  });

  it('capacityFit: invalid when maxPopulation=0 or not confirmed', () => {
    expect(isSettlementPlanValid('capacityFit', {})).toBe(false);
    expect(isSettlementPlanValid('capacityFit', { spMaxPopulation: '10' })).toBe(false);
    expect(isSettlementPlanValid('capacityFit', { spMaxPopulation: '10', spCapacityConfirmed: 'on' })).toBe(true);
  });

  it('capacityFit: derived path -- valid on confirm even with NO manual spMaxPopulation', () => {
    // When carrying capacity is assessed, the ceiling is derived from the
    // synthesis; the manual stepper is irrelevant. Confirm alone (+ a positive
    // derived max) makes it valid.
    expect(
      isSettlementPlanValid('capacityFit', {}, ASSESSED_CC_SIBLINGS),
    ).toBe(false); // not confirmed
    expect(
      isSettlementPlanValid(
        'capacityFit',
        { spCapacityConfirmed: 'on' },
        ASSESSED_CC_SIBLINGS,
      ),
    ).toBe(true); // derived max>0 + confirmed, no spMaxPopulation
  });

  it('enforcement c5 -- hard gate: requires enforcer + ack + a NAMED, signed non-self verifier', () => {
    // Neither set -> invalid
    expect(isSettlementPlanValid('enforcement', {})).toBe(false);
    // Enforcer set but ack off -> invalid
    expect(isSettlementPlanValid('enforcement', {
      spEnforcer: 'Independent verifier -- someone other than the arriving household',
    })).toBe(false);
    // Ack on but no enforcer -> invalid
    expect(isSettlementPlanValid('enforcement', { spNotSelfReportedAck: 'on' })).toBe(false);
    // F1 GATE: enforcer + ack ALONE no longer satisfy the gate -- the named
    // third-party verifier must have signed in-app.
    expect(isSettlementPlanValid('enforcement', {
      spEnforcer: 'Independent verifier -- someone other than the arriving household',
      spNotSelfReportedAck: 'on',
    })).toBe(false);
    // Fully signed -> valid
    expect(isSettlementPlanValid('enforcement', SIGNED_ENFORCEMENT)).toBe(true);
  });

  it('enforcement c5 -- F1: a verifier name + timestamp without a role does NOT satisfy the gate', () => {
    expect(isSettlementPlanValid('enforcement', {
      ...SIGNED_ENFORCEMENT,
      spVerifierRole: '',
    })).toBe(false);
  });

  it('enforcement c5 -- F1: a named verifier WITHOUT a timestamp does NOT satisfy the gate', () => {
    // A signer identity with no signedAt is a legacy/un-attested entry, never a signature.
    expect(isSettlementPlanValid('enforcement', {
      ...SIGNED_ENFORCEMENT,
      spVerifiedAt: '',
    })).toBe(false);
  });

  it('enforcement c5 -- F1: a "self" verifier role is dropped and never satisfies the gate', () => {
    // scopeNotes forbid self-certification; constrain() drops 'self' to '' on decode.
    expect(isSettlementPlanValid('enforcement', {
      ...SIGNED_ENFORCEMENT,
      spVerifierRole: 'self',
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Summary strings non-empty on populated values
// ---------------------------------------------------------------------------

describe('summariseSettlementPlan', () => {
  it('cohort summary reports household count and date', () => {
    const s = summariseSettlementPlan('cohort', { spComposition: 'Ali family', spArrivalISO: '2026-09-01', spHouseholds: '2' });
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain('2026-09-01');
  });

  it('thresholds summary counts filled items', () => {
    const value: FormValue = {
      spThresholds: [
        JSON.stringify({ id: 'r1', domain: 'Potable water', item: '20 L tested' }),
        JSON.stringify({ id: 'r2', domain: 'Shelter', item: 'Weatherproof' }),
      ],
    };
    const s = summariseSettlementPlan('thresholds', value);
    expect(s).toContain('2');
  });

  it('criteria summary counts criteria and signed-off', () => {
    const value: FormValue = {
      spCriteria: [
        JSON.stringify({ id: 'c1', text: 'Water confirmed', signedOff: true }),
        JSON.stringify({ id: 'c2', text: 'Shelter confirmed', signedOff: false }),
      ],
    };
    const s = summariseSettlementPlan('criteria', value);
    expect(s).toContain('2');
    expect(s).toContain('1');
  });

  it('schedule summary counts cohorts and dated', () => {
    const value: FormValue = {
      spSchedule: [
        JSON.stringify({ id: 's1', cohort: 'Cohort 2', dateISO: '2027-01-01', size: 2, milestone: '', complete: false }),
        JSON.stringify({ id: 's2', cohort: 'Cohort 3', dateISO: '', size: 0, milestone: '', complete: false }),
      ],
    };
    const s = summariseSettlementPlan('schedule', value);
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain('2');
  });

  it('capacityFit summary includes max and confirmation state', () => {
    const value: FormValue = { spMaxPopulation: '20', spCapacityConfirmed: 'on' };
    const s = summariseSettlementPlan('capacityFit', value);
    expect(s).toContain('20');
    expect(s).toContain('confirmed');
    // Unassessed -> labels the source as manual.
    expect(s).toContain('manual');
  });

  it('capacityFit summary labels the carrying-capacity source when assessed', () => {
    const min = computeSynthesis(ASSESSED_CC_SIBLINGS, CARRYING_CAPACITY_PREFIX)
      .minPeople;
    // Manual spMaxPopulation is present but must be IGNORED in favour of derived.
    const s = summariseSettlementPlan(
      'capacityFit',
      { spMaxPopulation: '999', spCapacityConfirmed: 'on' },
      ASSESSED_CC_SIBLINGS,
    );
    expect(s).toContain(`Max ${min}`);
    expect(s).toContain('from carrying capacity');
    expect(s).not.toContain('999');
  });

  it('enforcement summary references enforcer or not-self-reported', () => {
    const value: FormValue = {
      spEnforcer: 'Independent verifier -- someone other than the arriving household',
      spNotSelfReportedAck: 'on',
    };
    const s = summariseSettlementPlan('enforcement', value);
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain('not self-reported');
  });

  it('enforcement summary names the verifier once the check is signed', () => {
    const s = summariseSettlementPlan('enforcement', SIGNED_ENFORCEMENT);
    expect(s).toContain('verified by Layla Haddad');
  });

  it('empty value never throws and returns a string', () => {
    const MODES: SettlementPlanMode[] = ['cohort', 'thresholds', 'criteria', 'schedule', 'capacityFit', 'enforcement'];
    for (const mode of MODES) {
      expect(() => summariseSettlementPlan(mode, {})).not.toThrow();
      expect(typeof summariseSettlementPlan(mode, {})).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// settlementPhasesFrom -- ordering + tolerance
// ---------------------------------------------------------------------------

describe('settlementPhasesFrom', () => {
  it('returns empty when both inputs are empty', () => {
    expect(settlementPhasesFrom({})).toEqual([]);
    expect(settlementPhasesFrom({}, {})).toEqual([]);
  });

  it('founding row appears FIRST only when arrivalISO is set on the cohort', () => {
    const cohortWithDate: FormValue = {
      spComposition: 'Founding families',
      spArrivalISO: '2026-09-01',
      spHouseholds: '2',
    };
    const cohortNoDate: FormValue = {
      spComposition: 'Founding families',
      spArrivalISO: '',
      spHouseholds: '2',
    };
    const scheduleValue: FormValue = {
      spSchedule: [
        JSON.stringify({ id: 's1', cohort: 'Cohort 2', dateISO: '2027-03-01', size: 3, milestone: '', complete: false }),
      ],
    };

    // With date -> founding first
    const withDate = settlementPhasesFrom(scheduleValue, cohortWithDate);
    expect(withDate[0]!.id).toBe('founding');
    expect(withDate[0]!.dateISO).toBe('2026-09-01');
    expect(withDate[0]!.complete).toBe(false);
    expect(withDate).toHaveLength(2);

    // Without date -> no founding row
    const withoutDate = settlementPhasesFrom(scheduleValue, cohortNoDate);
    expect(withoutDate).toHaveLength(1);
    expect(withoutDate[0]!.id).toBe('s1');
  });

  it('milestone folded into label when present', () => {
    const scheduleValue: FormValue = {
      spSchedule: [
        JSON.stringify({ id: 's1', cohort: 'Cohort 2', dateISO: '2027-03-01', size: 3, milestone: 'Second cabin complete', complete: false }),
      ],
    };
    const phases = settlementPhasesFrom(scheduleValue);
    expect(phases[0]!.label).toContain('Second cabin complete');
    expect(phases[0]!.label).toContain('Cohort 2');
  });

  it('complete is carried through from the schedule row', () => {
    const scheduleValue: FormValue = {
      spSchedule: [
        JSON.stringify({ id: 'c1', cohort: 'Cohort 2', dateISO: '2027-01-01', size: 2, milestone: '', complete: true }),
      ],
    };
    const phases = settlementPhasesFrom(scheduleValue);
    expect(phases[0]!.complete).toBe(true);
  });

  it('garbage schedule rows are skipped (legacy-<i> fallback still emits a phase but cohort = entry text)', () => {
    const scheduleValue: FormValue = {
      spSchedule: [
        'plain-text-not-json',
        JSON.stringify({ id: 's2', cohort: 'Cohort 3', dateISO: '2028-01-01', size: 1, milestone: '', complete: false }),
      ],
    };
    // Should not throw; bad row gets a phase with legacy id
    expect(() => settlementPhasesFrom(scheduleValue)).not.toThrow();
    const phases = settlementPhasesFrom(scheduleValue);
    // Both rows produce phases (legacy tolerance)
    expect(phases).toHaveLength(2);
  });

  it('founding cohort label includes composition when non-empty', () => {
    const cohortValue: FormValue = {
      spComposition: 'Ali and Sara families',
      spArrivalISO: '2026-09-01',
      spHouseholds: '2',
    };
    const phases = settlementPhasesFrom({}, cohortValue);
    expect(phases[0]!.label).toContain('Ali and Sara families');
  });

  it('founding cohort label defaults to "Founding cohort arrival" when composition is empty', () => {
    const cohortValue: FormValue = {
      spComposition: '',
      spArrivalISO: '2026-09-01',
      spHouseholds: '0',
    };
    const phases = settlementPhasesFrom({}, cohortValue);
    expect(phases[0]!.label).toBe('Founding cohort arrival');
  });
});

// ---------------------------------------------------------------------------
// render + interaction per mode
// ---------------------------------------------------------------------------

describe('cohort -- render / interaction', () => {
  it('adds a founding household row and emits spCohortRows (+ derived legacy fields)', () => {
    const { onChange } = renderMode('cohort', {});
    // The free-text composition textarea is gone -- it is now a row register.
    expect(screen.queryByLabelText('Founding cohort composition')).toBeNull();
    fireEvent.click(screen.getByText(/Add founding household/i));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(Array.isArray(emitted.spCohortRows)).toBe(true);
    expect((emitted.spCohortRows as string[]).length).toBe(1);
    // Derived legacy fields still emitted for downstream consumers.
    expect(emitted.spHouseholds).toBe('1');
    expect(typeof emitted.spComposition).toBe('string');
  });

  it('typing a household name derives spComposition and keeps spHouseholds = row count', () => {
    const value: FormValue = {
      spCohortRows: [JSON.stringify({ id: 'h1', name: '', size: 0 })],
    };
    const { onChange } = renderMode('cohort', value);
    fireEvent.change(screen.getByLabelText('Founding household name'), {
      target: { value: 'Ali family' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.spComposition).toBe('Ali family');
    expect(emitted.spHouseholds).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// Steward link (Option 1) -- c1 cohort rows + c5 verifier ref
// ---------------------------------------------------------------------------

const STEWARD_OPTIONS: readonly StewardOption[] = [
  { ref: { userId: 'u-1' }, label: 'Ali Rahman', sub: 'ali@x.nz', kind: 'member' },
  { ref: { email: 'sara@x.nz' }, label: 'Sara Yusuf', sub: 'sara@x.nz', kind: 'invite' },
];

describe('cohort -- steward link (Option 1)', () => {
  it('legacy-collapse: a pre-Option-1 cohort decodes to one row, preserving composition + count', () => {
    const model = decodeSettlementPlan('cohort', {
      spComposition: 'Ali and Sara families',
      spArrivalISO: '2026-09-01',
      spHouseholds: '3',
    }) as { rows: { name: string }[]; composition: string; households: number };
    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]!.name).toBe('Ali and Sara families');
    // The legacy count + composition are preserved on the model (summary unchanged)
    // until the operator first edits and bakes the new shape.
    expect(model.composition).toBe('Ali and Sara families');
    expect(model.households).toBe(3);
  });

  it('new shape coerces a valid nested ref and drops a junk ref', () => {
    const model = decodeSettlementPlan('cohort', {
      spCohortRows: [
        JSON.stringify({ id: 'h1', name: 'Ali', size: 2, ref: { userId: 'u-1' } }),
        JSON.stringify({ id: 'h2', name: 'Sara', size: 1, ref: { userId: '   ' } }),
      ],
    }) as { rows: { ref?: unknown }[] };
    expect(model.rows[0]!.ref).toEqual({ userId: 'u-1' });
    // A blank-id ref coerces to undefined -> the row carries no link.
    expect(model.rows[1]!.ref).toBeUndefined();
  });

  it('picking a steward fills the household name and records the ref', () => {
    const value: FormValue = {
      spCohortRows: [JSON.stringify({ id: 'h1', name: '', size: 0 })],
    };
    const { onChange } = renderMode('cohort', value, {
      stewardOptions: STEWARD_OPTIONS,
    });
    const picker = screen.getByLabelText('Link founding household to a steward');
    fireEvent.change(picker, { target: { value: 'u:u-1' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const row = JSON.parse((emitted.spCohortRows as string[])[0]!) as {
      name: string;
      ref?: unknown;
    };
    expect(row.name).toBe('Ali Rahman');
    expect(row.ref).toEqual({ userId: 'u-1' });
    // Derived composition reflects the linked name.
    expect(emitted.spComposition).toBe('Ali Rahman');
  });

  it('with no stewardOptions the picker is absent (free-text name still works)', () => {
    renderMode('cohort', { spCohortRows: [JSON.stringify({ id: 'h1', name: '', size: 0 })] });
    expect(screen.queryByLabelText('Link founding household to a steward')).toBeNull();
    expect(screen.getByLabelText('Founding household name')).toBeTruthy();
  });
});

describe('enforcement c5 -- verifier steward link (Option 1)', () => {
  it('verifierRef round-trips via the spVerifierRef token', () => {
    const value: FormValue = { ...SIGNED_ENFORCEMENT, spVerifierRef: 'u:u-1' };
    const model = decodeSettlementPlan('enforcement', value);
    expect((model as { verifierRef?: unknown }).verifierRef).toEqual({ userId: 'u-1' });
    const re = encodeSettlementPlan(model);
    expect(re.spVerifierRef).toBe('u:u-1');
    expect(decodeSettlementPlan('enforcement', re)).toEqual(model);
  });

  it('back-compat: a legacy enforcement value (no spVerifierRef) re-encodes byte-identically', () => {
    const model = decodeSettlementPlan('enforcement', SIGNED_ENFORCEMENT);
    const re = encodeSettlementPlan(model);
    // No ref -> the spVerifierRef key is never introduced.
    expect('spVerifierRef' in re).toBe(false);
    expect(re).toEqual(SIGNED_ENFORCEMENT);
  });

  it('picking a verifier fills the name + ref and clears any prior signature', () => {
    const { onChange } = renderMode('enforcement', SIGNED_ENFORCEMENT, {
      stewardOptions: STEWARD_OPTIONS,
    });
    const picker = screen.getByLabelText('Link the verifier to a steward');
    fireEvent.change(picker, { target: { value: 'e:sara@x.nz' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.spVerifierName).toBe('Sara Yusuf');
    expect(emitted.spVerifierRef).toBe('e:sara@x.nz');
    // Identity changed -> the prior in-app signature is cleared (F1 rule).
    expect(emitted.spVerifiedAt).toBe('');
  });
});

describe('thresholds -- render / interaction', () => {
  it('renders the empty hint and adds a row via the Add button', () => {
    const { onChange } = renderMode('thresholds', {});
    // Empty hint visible
    expect(screen.getByText(/No threshold items yet/i)).toBeTruthy();
    // Add a threshold row
    fireEvent.click(screen.getByText(/Add threshold item/i));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    // spThresholds is now a 1-element array
    expect(Array.isArray(emitted.spThresholds)).toBe(true);
    expect((emitted.spThresholds as string[]).length).toBe(1);
  });
});

describe('criteria -- render / interaction', () => {
  it('renders with a pre-populated row and fires onChange on text edit', () => {
    const existingRows: FormValue = {
      spCriteria: [JSON.stringify({ id: 'c1', text: 'Water confirmed', signedOff: false })],
    };
    const { onChange } = renderMode('criteria', existingRows);
    const input = screen.getByLabelText('Arrival criterion') as HTMLInputElement;
    expect(input.value).toBe('Water confirmed');
    fireEvent.change(input, { target: { value: 'Water confirmed -- 20 L tested' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(Array.isArray(emitted.spCriteria)).toBe(true);
  });
});

describe('schedule -- render / interaction', () => {
  it('renders the empty hint; adding a row emits spSchedule', () => {
    const { onChange } = renderMode('schedule', {});
    expect(screen.getByText(/No subsequent cohorts scheduled/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Add cohort arrival/i));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(Array.isArray(emitted.spSchedule)).toBe(true);
    expect((emitted.spSchedule as string[]).length).toBe(1);
  });
});

describe('capacityFitEffectiveMax (derived replaces manual)', () => {
  it('falls back to the manual spMaxPopulation when carrying capacity is unassessed', () => {
    expect(capacityFitEffectiveMax({ spMaxPopulation: '15' }, {})).toEqual({
      max: 15,
      derived: false,
    });
    // An empty c1 FormValue is NOT an assessment -> still manual.
    expect(
      capacityFitEffectiveMax(
        { spMaxPopulation: '15' },
        { [`${CARRYING_CAPACITY_PREFIX}-c1`]: {} },
      ),
    ).toEqual({ max: 15, derived: false });
  });

  it('derives the ceiling (minPeople + binding) from the synthesis when assessed', () => {
    const syn = computeSynthesis(ASSESSED_CC_SIBLINGS, CARRYING_CAPACITY_PREFIX);
    expect(syn.minPeople).toBeGreaterThan(0);
    const eff = capacityFitEffectiveMax(
      { spMaxPopulation: '999' },
      ASSESSED_CC_SIBLINGS,
    );
    expect(eff.derived).toBe(true);
    expect(eff.max).toBe(syn.minPeople); // manual 999 ignored
    expect(eff.bindingName).toBe(syn.bindingName);
  });
});

describe('capacityFit -- render / interaction', () => {
  it('renders the manual stepper + not-yet-assessed hint and the confirm button', () => {
    const { onChange } = renderMode('capacityFit', { spMaxPopulation: '20' });
    // Unassessed -> manual stepper present (its aria-labelled control) + hint.
    expect(
      screen.getByText(/carrying capacity not yet assessed/i),
    ).toBeTruthy();
    // Confirm button should be present
    const confirmBtn = screen.getByRole('button', {
      name: /Confirm scheduled cohort sizes/i,
    });
    expect(confirmBtn).toBeTruthy();
    fireEvent.click(confirmBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.spCapacityConfirmed).toBe('on');
  });

  it('renders the read-only derived ceiling + binding constraint when assessed (no manual stepper)', () => {
    const syn = computeSynthesis(ASSESSED_CC_SIBLINGS, CARRYING_CAPACITY_PREFIX);
    renderMode(
      'capacityFit',
      { spMaxPopulation: '999' },
      { siblingValues: ASSESSED_CC_SIBLINGS },
    );
    // Read-only derived value present...
    const derivedVal = screen.getByLabelText(
      /Maximum sustainable population \(derived from carrying capacity\)/i,
    );
    expect(derivedVal.textContent).toBe(String(syn.minPeople));
    // ...binding constraint surfaced...
    expect(
      screen.getByText(
        new RegExp(`binding constraint: ${syn.bindingName}`, 'i'),
      ),
    ).toBeTruthy();
    // ...and the manual stepper is NOT rendered.
    expect(
      screen.queryByLabelText('Maximum sustainable population'),
    ).toBeNull();
  });
});

describe('enforcement -- render / interaction (c5 hard gate)', () => {
  it('renders the scope notes warn block and the ack button', () => {
    renderMode('enforcement', {});
    // Verbatim scope note text
    expect(screen.getByText(/Habitability thresholds must be verified/i)).toBeTruthy();
    expect(screen.getByText(/NOT self-reported/i)).toBeTruthy();
  });

  it('toggling the ack button emits spNotSelfReportedAck = on', () => {
    const { onChange } = renderMode('enforcement', {});
    const ackBtn = screen.getByRole('button', {
      name: /I confirm habitability thresholds are NOT self-reported/i,
    });
    fireEvent.click(ackBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.spNotSelfReportedAck).toBe('on');
  });
});

// ---------------------------------------------------------------------------
// enforcementSignatory -- the System-2 signature proof for the c5 gate
// ---------------------------------------------------------------------------

describe('enforcementSignatory', () => {
  it('returns null for an empty value', () => {
    expect(enforcementSignatory({})).toBeNull();
  });

  it('returns null when a verifier is named but has NOT signed (no timestamp)', () => {
    expect(
      enforcementSignatory({ ...SIGNED_ENFORCEMENT, spVerifiedAt: '' }),
    ).toBeNull();
  });

  it('returns null when the verifier role is missing', () => {
    expect(
      enforcementSignatory({ ...SIGNED_ENFORCEMENT, spVerifierRole: '' }),
    ).toBeNull();
  });

  it('returns null for a dropped "self" role (self-certification forbidden)', () => {
    expect(
      enforcementSignatory({ ...SIGNED_ENFORCEMENT, spVerifierRole: 'self' }),
    ).toBeNull();
  });

  it('returns a ProofSignatory carrying the verifier name, role slug, attestation and signedAt', () => {
    const sig = enforcementSignatory(SIGNED_ENFORCEMENT);
    expect(sig).not.toBeNull();
    expect(sig!.signerName).toBe('Layla Haddad');
    // signerRole is the VerifierRole enum slug (machine-recognisable), not the label.
    expect(sig!.signerRole).toBe('independent');
    expect(sig!.signedAt).toBe('2026-06-13T10:00:00.000Z');
    expect(sig!.attestation).toContain('Self-certification was not relied upon');
  });
});

// ---------------------------------------------------------------------------
// enforcement -- verifier signature interaction (c5 F1 sign button)
// ---------------------------------------------------------------------------

describe('enforcement -- verifier signature (c5 sign button)', () => {
  // enforcer + ack + name + role set, but NOT yet signed (no timestamp).
  const READY_TO_SIGN: FormValue = {
    spEnforcer: 'Independent verifier -- someone other than the arriving household',
    spNotSelfReportedAck: 'on',
    spVerifierName: 'Layla Haddad',
    spVerifierRole: 'independent',
  };

  it('the sign button is disabled until a verifier name and role are set', () => {
    renderMode('enforcement', {});
    const signBtn = screen.getByTestId('sp-verify-sign') as HTMLButtonElement;
    expect(signBtn.disabled).toBe(true);
  });

  it('the sign button is enabled once name + role are present and stamps spVerifiedAt on click', () => {
    const { onChange } = renderMode('enforcement', READY_TO_SIGN);
    const signBtn = screen.getByTestId('sp-verify-sign') as HTMLButtonElement;
    expect(signBtn.disabled).toBe(false);
    fireEvent.click(signBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(typeof emitted.spVerifiedAt).toBe('string');
    expect((emitted.spVerifiedAt as string).length).toBeGreaterThan(0);
  });

  it('once signed, the signed-meta is shown (no sign button) and editing the name CLEARS the signature', () => {
    const { onChange } = renderMode('enforcement', SIGNED_ENFORCEMENT);
    // Signed -> meta visible, sign button gone (re-attestation required to change).
    expect(screen.getByTestId('sp-verified')).toBeTruthy();
    expect(screen.queryByTestId('sp-verify-sign')).toBeNull();
    // Editing the verifier identity clears the timestamp (forces re-signature).
    const nameInput = screen.getByTestId('sp-verifier-name');
    fireEvent.change(nameInput, { target: { value: 'Different Name' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.spVerifierName).toBe('Different Name');
    expect(emitted.spVerifiedAt).toBe('');
  });
});

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
  SETTLEMENT_PLAN_PREFIX,
  type SettlementPlanMode,
} from '../SettlementPlanCapture.js';
import type { FormValue } from '../actToolCatalog.js';

function renderMode(
  mode: SettlementPlanMode,
  value: FormValue,
  extra: { siblingValues?: Record<string, FormValue> } = {},
) {
  const onChange = vi.fn();
  render(
    <SettlementPlanCapture
      mode={mode}
      value={value}
      onChange={onChange}
      itemId={`${SETTLEMENT_PLAN_PREFIX}-${mode === 'cohort' ? 'c1' : mode === 'thresholds' ? 'c2' : mode === 'criteria' ? 'c3' : mode === 'schedule' ? 'c4' : mode === 'capacityFit' ? 'c6' : 'c5'}`}
      siblingValues={extra.siblingValues}
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
      const e = m as { enforcer: string; notSelfReportedAck: boolean };
      expect(e.enforcer).toBe('');
      expect(e.notSelfReportedAck).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// encode round-trip (per mode)
// ---------------------------------------------------------------------------

describe('encode round-trips', () => {
  it('cohort round-trips', () => {
    const value: FormValue = {
      spComposition: 'Ali and Sara families',
      spArrivalISO: '2026-09-01',
      spHouseholds: '2',
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

  it('enforcement round-trips', () => {
    const value: FormValue = {
      spEnforcer: 'Independent verifier -- someone other than the arriving household',
      spNotSelfReportedAck: 'on',
    };
    const model = decodeSettlementPlan('enforcement', value);
    expect(decodeSettlementPlan('enforcement', encodeSettlementPlan(model))).toEqual(model);
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

  it('enforcement c5 -- hard gate: invalid until notSelfReportedAck on', () => {
    // Neither set -> invalid
    expect(isSettlementPlanValid('enforcement', {})).toBe(false);
    // Enforcer set but ack off -> invalid
    expect(isSettlementPlanValid('enforcement', {
      spEnforcer: 'Independent verifier -- someone other than the arriving household',
    })).toBe(false);
    // Ack on but no enforcer -> invalid
    expect(isSettlementPlanValid('enforcement', { spNotSelfReportedAck: 'on' })).toBe(false);
    // Both set -> valid
    expect(isSettlementPlanValid('enforcement', {
      spEnforcer: 'Independent verifier -- someone other than the arriving household',
      spNotSelfReportedAck: 'on',
    })).toBe(true);
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
  it('renders composition textarea and fires onChange with spComposition key', () => {
    const { onChange } = renderMode('cohort', {});
    const ta = screen.getByLabelText('Founding cohort composition');
    expect(ta).toBeTruthy();
    fireEvent.change(ta, { target: { value: 'Ali and Sara families, 2 adults each' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.spComposition).toBe('Ali and Sara families, 2 adults each');
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

describe('capacityFit -- render / interaction', () => {
  it('renders the confirm button and toggles it', () => {
    const { onChange } = renderMode('capacityFit', { spMaxPopulation: '20' });
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

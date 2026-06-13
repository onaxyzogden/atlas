/**
 * @vitest-environment happy-dom
 *
 * EcovillageCapitalPlanCapture -- multi-mode CONTROLLED renderer for objective
 * ev-s7-financial-plan (6 checklist items; modes capitalRequirement /
 * contributionSchedule / fundStructure / reportingSchedule / governanceConfirm /
 * contributionCommitment).
 *
 * Verified behaviours:
 *   - capitalPlanModeFor maps each c1..c6 id correctly (catalogue order c1 c2 c3
 *     c4 c6 c5 -- the mapper keys by slice, not position).
 *   - NEGATIVE: ev-s4-financial-model-c1 (fi- namespace) returns null.
 *   - decode is TOTAL/defensive (undefined/empty -> empty state, never throws).
 *   - encode round-trips losslessly per mode.
 *   - legacy plain-string + garbage-JSON register tolerance (legacy-<i> fallback).
 *   - validity gates per mode -- c5 commitment HARD gate, c6 governance soft gate.
 *   - summary strings non-empty on populated values per mode.
 *   - capitalRequiredFrom / scheduledContributionsFrom pure derivations.
 *   - AMANAH PINS: the capital-channel enum carries NO advance-purchase / member-
 *     share / salam channel (structural fiqh guardrail); CAPITAL_SCOPE_NOTES
 *     restates the boundary verbatim; the c2 body renders the "capital partners &
 *     allies" public-facing label.
 *   - one render + one interaction per mode (happy-dom).
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
  EcovillageCapitalPlanCapture,
  capitalPlanModeFor,
  decodeCapitalPlan,
  encodeCapitalPlan,
  isCapitalPlanValid,
  summariseCapitalPlan,
  capitalRequiredFrom,
  scheduledContributionsFrom,
  CAPITAL_PLAN_PREFIX,
  CAPITAL_REQUIREMENT_ITEM_ID,
  CAPITAL_SCOPE_NOTES,
  CAPITAL_CHANNEL_LIST,
  FUND_STRUCTURE_LIST,
  REPORTING_CADENCE_LIST,
  type CapitalPlanMode,
} from '../EcovillageCapitalPlanCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const ITEM_SUFFIX: Record<CapitalPlanMode, string> = {
  capitalRequirement: 'c1',
  contributionSchedule: 'c2',
  fundStructure: 'c3',
  reportingSchedule: 'c4',
  governanceConfirm: 'c6',
  contributionCommitment: 'c5',
};

function renderMode(
  mode: CapitalPlanMode,
  value: FormValue,
  extra: { siblingValues?: Record<string, FormValue> } = {},
) {
  const onChange = vi.fn();
  render(
    <EcovillageCapitalPlanCapture
      mode={mode}
      value={value}
      onChange={onChange}
      itemId={`${CAPITAL_PLAN_PREFIX}-${ITEM_SUFFIX[mode]}`}
      siblingValues={extra.siblingValues}
    />,
  );
  return { onChange };
}

const ALL_MODES: CapitalPlanMode[] = [
  'capitalRequirement',
  'contributionSchedule',
  'fundStructure',
  'reportingSchedule',
  'governanceConfirm',
  'contributionCommitment',
];

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('capitalPlanModeFor', () => {
  it('maps each checklist id to the correct mode', () => {
    expect(capitalPlanModeFor('ev-s7-financial-plan-c1')).toBe('capitalRequirement');
    expect(capitalPlanModeFor('ev-s7-financial-plan-c2')).toBe('contributionSchedule');
    expect(capitalPlanModeFor('ev-s7-financial-plan-c3')).toBe('fundStructure');
    expect(capitalPlanModeFor('ev-s7-financial-plan-c4')).toBe('reportingSchedule');
    expect(capitalPlanModeFor('ev-s7-financial-plan-c6')).toBe('governanceConfirm');
    expect(capitalPlanModeFor('ev-s7-financial-plan-c5')).toBe('contributionCommitment');
  });

  it('returns null for unrelated / out-of-range ids', () => {
    expect(capitalPlanModeFor('ev-s7-financial-plan-c7')).toBeNull();
    expect(capitalPlanModeFor('ev-s7-financial-plan-')).toBeNull();
    expect(capitalPlanModeFor('')).toBeNull();
  });

  it('NEGATIVE: near-name ev-s4-financial-model-c1 (fi- namespace) returns null', () => {
    // ev-s4-financial-model is a DIFFERENT objective (the fi- capture namespace).
    // It must NOT resolve to a capital-plan mode.
    expect(capitalPlanModeFor('ev-s4-financial-model-c1')).toBeNull();
    expect(capitalPlanModeFor('ev-s4-financial-model-c2')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode: total / defensive (never seeds; never throws)
// ---------------------------------------------------------------------------

describe('decodeCapitalPlan -- empty / undefined value never seeds', () => {
  it.each(ALL_MODES)('%s decode of {} yields empty / zero / off state', (mode) => {
    expect(() => decodeCapitalPlan(mode, {})).not.toThrow();
    const m = decodeCapitalPlan(mode, {});
    expect(m.kind).toBe(mode);
    if (mode === 'capitalRequirement') {
      const c = m as { total: number; rows: unknown[] };
      expect(c.total).toBe(0);
      expect(c.rows).toEqual([]);
    }
    if (mode === 'contributionSchedule') {
      expect((m as { rows: unknown[] }).rows).toEqual([]);
    }
    if (mode === 'fundStructure') {
      const c = m as { structure: string; control: string };
      expect(c.structure).toBe('');
      expect(c.control).toBe('');
    }
    if (mode === 'reportingSchedule') {
      const c = m as { cadence: string; recipients: string; format: string };
      expect(c.cadence).toBe('');
      expect(c.recipients).toBe('');
      expect(c.format).toBe('');
    }
    if (mode === 'governanceConfirm') {
      expect((m as { confirmed: boolean }).confirmed).toBe(false);
    }
    if (mode === 'contributionCommitment') {
      expect((m as { allCommitted: boolean }).allCommitted).toBe(false);
    }
  });

  it('a foreign channel value decodes to "" (constrained to the enum)', () => {
    const value: FormValue = {
      cpSchedule: [
        JSON.stringify({
          id: 'x1',
          contributor: 'Someone',
          channel: 'Advance purchase of future yield',
          amount: 1000,
          dateISO: '2027-01-01',
          consequence: '',
        }),
      ],
    };
    const m = decodeCapitalPlan('contributionSchedule', value) as {
      rows: Array<{ channel: string }>;
    };
    // The forbidden / foreign channel is NOT in CAPITAL_CHANNEL_LIST, so it is
    // dropped to '' -- it can never round-trip back in.
    expect(m.rows[0]!.channel).toBe('');
  });
});

// ---------------------------------------------------------------------------
// encode round-trip (per mode)
// ---------------------------------------------------------------------------

describe('encode round-trips', () => {
  it('capitalRequirement round-trips (total + breakdown rows)', () => {
    const value: FormValue = {
      cpTotal: '50000',
      cpBreakdown: [
        JSON.stringify({ id: 'b1', label: 'Water system', amount: 12000 }),
        JSON.stringify({ id: 'b2', label: 'Access road', amount: 8000 }),
      ],
    };
    const model = decodeCapitalPlan('capitalRequirement', value);
    expect(decodeCapitalPlan('capitalRequirement', encodeCapitalPlan(model))).toEqual(model);
  });

  it('contributionSchedule round-trips (JSON rows, valid channel)', () => {
    const value: FormValue = {
      cpSchedule: [
        JSON.stringify({
          id: 's1',
          contributor: 'Ali household',
          channel: 'Charitable donation',
          amount: 30000,
          dateISO: '2027-01-15',
          consequence: 'Membership review',
        }),
      ],
    };
    const model = decodeCapitalPlan('contributionSchedule', value);
    expect(decodeCapitalPlan('contributionSchedule', encodeCapitalPlan(model))).toEqual(model);
  });

  it('fundStructure round-trips', () => {
    const value: FormValue = { cpStructure: 'Trust', cpControl: 'Two signatories, dual control' };
    const model = decodeCapitalPlan('fundStructure', value);
    expect(decodeCapitalPlan('fundStructure', encodeCapitalPlan(model))).toEqual(model);
  });

  it('reportingSchedule round-trips', () => {
    const value: FormValue = {
      cpCadence: 'Quarterly',
      cpRecipients: 'All members',
      cpFormat: 'Balance, contributions received, expenditure, reserves',
    };
    const model = decodeCapitalPlan('reportingSchedule', value);
    expect(decodeCapitalPlan('reportingSchedule', encodeCapitalPlan(model))).toEqual(model);
  });

  it('governanceConfirm round-trips', () => {
    const model = decodeCapitalPlan('governanceConfirm', { cpGovernanceAck: 'on' });
    expect(decodeCapitalPlan('governanceConfirm', encodeCapitalPlan(model))).toEqual(model);
  });

  it('contributionCommitment round-trips', () => {
    const model = decodeCapitalPlan('contributionCommitment', { cpCommitmentAck: 'on' });
    expect(decodeCapitalPlan('contributionCommitment', encodeCapitalPlan(model))).toEqual(model);
  });
});

// ---------------------------------------------------------------------------
// legacy plain-string + garbage-JSON tolerance
// ---------------------------------------------------------------------------

describe('decode tolerance -- legacy and garbage', () => {
  it('legacy plain-string in cpBreakdown is tolerated (legacy-0 id, label = raw)', () => {
    const value: FormValue = {
      cpBreakdown: [
        'just a plain string',
        JSON.stringify({ id: 'b1', label: 'Water system', amount: 12000 }),
      ],
    };
    expect(() => decodeCapitalPlan('capitalRequirement', value)).not.toThrow();
    const m = decodeCapitalPlan('capitalRequirement', value) as {
      rows: Array<{ id: string; label: string; amount: number }>;
    };
    expect(m.rows).toHaveLength(2);
    expect(m.rows[0]!.id).toBe('legacy-0');
    expect(m.rows[0]!.label).toBe('just a plain string');
    expect(m.rows[0]!.amount).toBe(0);
    expect(m.rows[1]!.id).toBe('b1');
  });

  it('garbage-JSON cpSchedule rows are tolerated (legacy-<i>; contributor = raw)', () => {
    const value: FormValue = {
      cpSchedule: [
        '{{{}}}not-json',
        JSON.stringify({
          id: 's1',
          contributor: 'Sara household',
          channel: 'In-kind contribution',
          amount: 0,
          dateISO: '',
          consequence: '',
        }),
      ],
    };
    expect(() => decodeCapitalPlan('contributionSchedule', value)).not.toThrow();
    const m = decodeCapitalPlan('contributionSchedule', value) as {
      rows: Array<{ id: string; contributor: string; channel: string }>;
    };
    expect(m.rows).toHaveLength(2);
    expect(m.rows[0]!.id).toBe('legacy-0');
    expect(m.rows[0]!.contributor).toBe('{{{}}}not-json');
    expect(m.rows[0]!.channel).toBe('');
  });

  it('non-array cpSchedule (number) -> empty rows (never throws)', () => {
    const valueNum = { cpSchedule: 42 } as unknown as FormValue;
    expect(() => decodeCapitalPlan('contributionSchedule', valueNum)).not.toThrow();
    const m = decodeCapitalPlan('contributionSchedule', valueNum) as { rows: unknown[] };
    expect(m.rows).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Pure derivations
// ---------------------------------------------------------------------------

describe('capitalRequiredFrom / scheduledContributionsFrom', () => {
  it('capitalRequiredFrom reads cpTotal', () => {
    expect(capitalRequiredFrom({ cpTotal: '50000' })).toBe(50000);
    expect(capitalRequiredFrom({})).toBe(0);
  });

  it('scheduledContributionsFrom sums row amounts', () => {
    const value: FormValue = {
      cpSchedule: [
        JSON.stringify({ id: 's1', contributor: 'A', channel: 'Charitable donation', amount: 30000, dateISO: '', consequence: '' }),
        JSON.stringify({ id: 's2', contributor: 'B', channel: 'Sponsorship', amount: 20000, dateISO: '', consequence: '' }),
      ],
    };
    expect(scheduledContributionsFrom(value)).toBe(50000);
    expect(scheduledContributionsFrom({})).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Validity gates
// ---------------------------------------------------------------------------

describe('isCapitalPlanValid', () => {
  it('capitalRequirement: invalid when empty; valid with a positive total OR breakdown', () => {
    expect(isCapitalPlanValid('capitalRequirement', {})).toBe(false);
    expect(isCapitalPlanValid('capitalRequirement', { cpTotal: '50000' })).toBe(true);
    expect(
      isCapitalPlanValid('capitalRequirement', {
        cpBreakdown: [JSON.stringify({ id: 'b1', label: 'Water', amount: 1000 })],
      }),
    ).toBe(true);
  });

  it('contributionSchedule: valid only when a row has a contributor AND a channel', () => {
    expect(isCapitalPlanValid('contributionSchedule', {})).toBe(false);
    // contributor but no channel -> invalid
    expect(
      isCapitalPlanValid('contributionSchedule', {
        cpSchedule: [JSON.stringify({ id: 's1', contributor: 'Ali', channel: '', amount: 0, dateISO: '', consequence: '' })],
      }),
    ).toBe(false);
    // contributor + channel -> valid
    expect(
      isCapitalPlanValid('contributionSchedule', {
        cpSchedule: [JSON.stringify({ id: 's1', contributor: 'Ali', channel: 'Charitable donation', amount: 0, dateISO: '', consequence: '' })],
      }),
    ).toBe(true);
  });

  it('fundStructure: invalid when empty; valid when a structure is chosen', () => {
    expect(isCapitalPlanValid('fundStructure', {})).toBe(false);
    expect(isCapitalPlanValid('fundStructure', { cpStructure: 'Trust' })).toBe(true);
  });

  it('reportingSchedule: invalid when empty; valid when a cadence is chosen', () => {
    expect(isCapitalPlanValid('reportingSchedule', {})).toBe(false);
    expect(isCapitalPlanValid('reportingSchedule', { cpCadence: 'Quarterly' })).toBe(true);
  });

  it('governanceConfirm c6 -- soft gate: invalid until the ack is on', () => {
    expect(isCapitalPlanValid('governanceConfirm', {})).toBe(false);
    expect(isCapitalPlanValid('governanceConfirm', { cpGovernanceAck: 'off' })).toBe(false);
    expect(isCapitalPlanValid('governanceConfirm', { cpGovernanceAck: 'on' })).toBe(true);
  });

  it('contributionCommitment c5 -- HARD gate: invalid until all contributions committed', () => {
    expect(isCapitalPlanValid('contributionCommitment', {})).toBe(false);
    expect(isCapitalPlanValid('contributionCommitment', { cpCommitmentAck: 'off' })).toBe(false);
    expect(isCapitalPlanValid('contributionCommitment', { cpCommitmentAck: 'on' })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Summary strings
// ---------------------------------------------------------------------------

describe('summariseCapitalPlan', () => {
  it('capitalRequirement summary reports total and line-item count', () => {
    const s = summariseCapitalPlan('capitalRequirement', {
      cpTotal: '50000',
      cpBreakdown: [JSON.stringify({ id: 'b1', label: 'Water', amount: 12000 })],
    });
    expect(s).toContain('50000');
    expect(s).toContain('1');
  });

  it('contributionSchedule summary references scheduled vs required from c1 sibling', () => {
    const s = summariseCapitalPlan(
      'contributionSchedule',
      {
        cpSchedule: [JSON.stringify({ id: 's1', contributor: 'A', channel: 'Charitable donation', amount: 30000, dateISO: '', consequence: '' })],
      },
      { [CAPITAL_REQUIREMENT_ITEM_ID]: { cpTotal: '50000' } },
    );
    expect(s).toContain('30000');
    expect(s).toContain('50000');
  });

  it('fundStructure / reportingSchedule / governance / commitment summaries are non-empty', () => {
    expect(summariseCapitalPlan('fundStructure', { cpStructure: 'Trust' })).toContain('Trust');
    expect(summariseCapitalPlan('reportingSchedule', { cpCadence: 'Quarterly' })).toContain('Quarterly');
    expect(summariseCapitalPlan('governanceConfirm', { cpGovernanceAck: 'on' }).length).toBeGreaterThan(0);
    expect(summariseCapitalPlan('contributionCommitment', { cpCommitmentAck: 'on' }).length).toBeGreaterThan(0);
  });

  it('empty value never throws and returns a string for every mode', () => {
    for (const mode of ALL_MODES) {
      expect(() => summariseCapitalPlan(mode, {})).not.toThrow();
      expect(typeof summariseCapitalPlan(mode, {})).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// AMANAH PINS -- the fiqh guardrails (CSRA erased 2026-05-04)
// ---------------------------------------------------------------------------

describe('Amanah guardrails', () => {
  it('CAPITAL_CHANNEL_LIST carries NO advance-purchase / member-share / salam / CSRA channel', () => {
    const forbidden = /advance|member share|member-share|salam|csra|prepa|pre-purchase|pre-sale/i;
    for (const channel of CAPITAL_CHANNEL_LIST) {
      expect(channel).not.toMatch(forbidden);
    }
  });

  it('CAPITAL_CHANNEL_LIST contains exactly the permitted channels (verbatim)', () => {
    expect(CAPITAL_CHANNEL_LIST).toEqual([
      'Member contribution -- communal cost-share',
      'Charitable donation',
      'Restricted donation',
      'Qard hasan -- interest-free loan',
      'In-kind contribution',
      'Sponsorship',
    ]);
  });

  it('CAPITAL_SCOPE_NOTES restates the boundary: not advance sale, membership benefit, Scholar Council', () => {
    expect(CAPITAL_SCOPE_NOTES).toMatch(/not advance sale/i);
    expect(CAPITAL_SCOPE_NOTES).toMatch(/membership benefit/i);
    expect(CAPITAL_SCOPE_NOTES).toMatch(/Scholar Council/i);
  });

  it('the c2 body renders the public-facing "capital partners & allies" label', () => {
    renderMode('contributionSchedule', {});
    expect(screen.getByText(/capital partners & allies/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// render + interaction per mode
// ---------------------------------------------------------------------------

describe('capitalRequirement -- render / interaction', () => {
  it('edits the total and fires onChange with cpTotal', () => {
    const { onChange } = renderMode('capitalRequirement', {});
    const totalInput = screen.getByPlaceholderText('0');
    fireEvent.change(totalInput, { target: { value: '50000' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.cpTotal).toBe('50000');
  });

  it('adds a breakdown line item via the Add button', () => {
    const { onChange } = renderMode('capitalRequirement', {});
    fireEvent.click(screen.getByText(/Add line item/i));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(Array.isArray(emitted.cpBreakdown)).toBe(true);
    expect((emitted.cpBreakdown as string[]).length).toBe(1);
  });
});

describe('contributionSchedule -- render / interaction', () => {
  it('renders the Amanah warn block and adds a contribution row', () => {
    const { onChange } = renderMode('contributionSchedule', {});
    expect(screen.getByText(/cost-sharing among members who collectively own the asset/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Add contribution/i));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(Array.isArray(emitted.cpSchedule)).toBe(true);
    expect((emitted.cpSchedule as string[]).length).toBe(1);
  });
});

describe('fundStructure -- render / interaction', () => {
  it('selecting a holding structure fires onChange with cpStructure', () => {
    const { onChange } = renderMode('fundStructure', {});
    const select = screen.getByLabelText('Communal fund holding structure');
    fireEvent.change(select, { target: { value: FUND_STRUCTURE_LIST[1] } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.cpStructure).toBe(FUND_STRUCTURE_LIST[1]);
  });
});

describe('reportingSchedule -- render / interaction', () => {
  it('selecting a cadence fires onChange with cpCadence', () => {
    const { onChange } = renderMode('reportingSchedule', {});
    const select = screen.getByLabelText('Reporting cadence');
    fireEvent.change(select, { target: { value: REPORTING_CADENCE_LIST[1] } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.cpCadence).toBe(REPORTING_CADENCE_LIST[1]);
  });
});

describe('governanceConfirm c6 -- render / interaction (soft gate)', () => {
  it('toggling the confirm button emits cpGovernanceAck = on', () => {
    const { onChange } = renderMode('governanceConfirm', {});
    const btn = screen.getByRole('button', {
      name: /I confirm fund holding and reporting follow the Stratum 1 financial/i,
    });
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.cpGovernanceAck).toBe('on');
  });
});

describe('contributionCommitment c5 -- render / interaction (HARD gate)', () => {
  it('renders the Amanah warn block and the commitment ack button', () => {
    renderMode('contributionCommitment', {});
    expect(screen.getByText(/cost-sharing among members who collectively own the asset/i)).toBeTruthy();
  });

  it('toggling the ack button emits cpCommitmentAck = on', () => {
    const { onChange } = renderMode('contributionCommitment', {});
    const ackBtn = screen.getByRole('button', {
      name: /I confirm ALL founding member contributions are committed/i,
    });
    fireEvent.click(ackBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.cpCommitmentAck).toBe('on');
  });
});

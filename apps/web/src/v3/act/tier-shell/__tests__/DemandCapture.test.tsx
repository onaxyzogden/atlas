/**
 * @vitest-environment happy-dom
 *
 * DemandCapture -- the two-mode structured Phase-1 demand capture that upgrades the
 * EXISTING universal s7-resource-plan items c1 (labour demand) and c4 (capital
 * demand) in place. These tests pin its defining promises:
 *
 *  - decode/encode is a lossless round-trip; decode is TOTAL (empty -> empty).
 *  - the record gate (isDemandValid) requires real demand; c4 additionally
 *    requires a PERMITTED funding channel (the Amanah guardrail at the gate).
 *  - the capital-demand channel is constrained to the closed CAPITAL_CHANNEL_LIST
 *    -- a foreign channel decodes to "" (no advance-purchase channel exists).
 *  - phase1DemandBaseline rolls labour + capital up for the Plan Capacity Bridge,
 *    with an honest `captured` flag.
 *  - demandModeFor maps ONLY c1/c4; c2/c3/c5 stay on the generic form (null).
 *  - the upgrade changes NO checklist item and NO decision-group membership on
 *    s7-resource-plan, so completion math is byte-identical.
 *  - the capital body surfaces the verbatim Amanah scope note and offers only
 *    permitted channels; no banned advance-sale term appears anywhere it renders.
 *
 * lucide-react is stubbed to forwardRef SVGs (icons are decorative here).
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { UNIVERSAL_PLAN_OBJECTIVES, detectCovenantBanned } from '@ogden/shared';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' && value !== null && '$$typeof' in (value as object)) ||
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
  DemandCapture,
  demandModeFor,
  decodeDemand,
  encodeDemand,
  isDemandValid,
  summariseDemand,
  phase1DemandBaseline,
  labourDemandFrom,
  capitalDemandFrom,
  LABOUR_SOURCING_LIST,
  type LabourDemandModel,
  type CapitalDemandModel,
} from '../DemandCapture.js';
import {
  CAPITAL_CHANNEL_LIST,
  CAPITAL_SCOPE_NOTES,
} from '../EcovillageCapitalPlanCapture.js';
import type { FormValue } from '../actToolCatalog.js';

// A neutral, non-enum channel string -- proves the constraint without authoring a
// covenant-banned term anywhere.
const FOREIGN_CHANNEL = 'Foreign channel not in the permitted list';
function labourRow(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: 'r1',
    task: 'Bed preparation',
    window: 'Spring',
    people: 2,
    hoursPerWeek: 20,
    sourcing: 'Existing steward team',
    ...over,
  });
}

function capitalRow(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: 'c1',
    category: 'Infrastructure',
    amount: 5000,
    channel: 'Charitable donation',
    ...over,
  });
}

describe('demandModeFor -- only c1/c4 are structured demand captures', () => {
  it('maps c1 -> labourDemand and c4 -> capitalDemand', () => {
    expect(demandModeFor('s7-resource-plan-c1')).toBe('labourDemand');
    expect(demandModeFor('s7-resource-plan-c4')).toBe('capitalDemand');
  });

  it('returns null for the generic siblings c2/c3/c5', () => {
    expect(demandModeFor('s7-resource-plan-c2')).toBeNull();
    expect(demandModeFor('s7-resource-plan-c3')).toBeNull();
    expect(demandModeFor('s7-resource-plan-c5')).toBeNull();
  });

  it('returns null for any non-s7-resource-plan id', () => {
    expect(demandModeFor('ev-s7-financial-plan-c1')).toBeNull();
    expect(demandModeFor('s7-risk-register-c1')).toBeNull();
    expect(demandModeFor('')).toBeNull();
  });
});

describe('decode/encode round-trip', () => {
  it('decodes an empty FormValue to empty registers (TOTAL, no fabrication)', () => {
    expect(decodeDemand('labourDemand', {})).toEqual({ kind: 'labourDemand', rows: [] });
    expect(decodeDemand('capitalDemand', {})).toEqual({ kind: 'capitalDemand', rows: [] });
  });

  it('round-trips a labour model losslessly', () => {
    const value: FormValue = { dmLabour: [labourRow(), labourRow({ id: 'r2', task: 'Fencing' })] };
    const model = decodeDemand('labourDemand', value) as LabourDemandModel;
    expect(model.rows).toHaveLength(2);
    expect(model.rows[0]?.task).toBe('Bed preparation');
    expect(model.rows[1]?.task).toBe('Fencing');
    // encode -> decode is identity on the model
    const reencoded = encodeDemand(model);
    expect(decodeDemand('labourDemand', reencoded)).toEqual(model);
  });

  it('round-trips a capital model losslessly', () => {
    const value: FormValue = { dmCapital: [capitalRow()] };
    const model = decodeDemand('capitalDemand', value) as CapitalDemandModel;
    expect(model.rows[0]).toMatchObject({
      category: 'Infrastructure',
      amount: 5000,
      channel: 'Charitable donation',
    });
    expect(decodeDemand('capitalDemand', encodeDemand(model))).toEqual(model);
  });

  it('coerces a malformed entry without throwing (legacy-<i> fallback)', () => {
    const value: FormValue = { dmLabour: ['not json'] };
    const model = decodeDemand('labourDemand', value) as LabourDemandModel;
    expect(model.rows[0]).toMatchObject({ id: 'legacy-0', task: 'not json', hoursPerWeek: 0 });
  });
});

describe('Amanah -- capital channel constrained to the permitted closed enum', () => {
  it('decodes a foreign funding channel to "" (no advance-purchase channel exists)', () => {
    const value: FormValue = { dmCapital: [capitalRow({ channel: FOREIGN_CHANNEL })] };
    const model = decodeDemand('capitalDemand', value) as CapitalDemandModel;
    expect(model.rows[0]?.channel).toBe('');
  });

  it('keeps a permitted channel verbatim', () => {
    CAPITAL_CHANNEL_LIST.forEach((channel) => {
      const value: FormValue = { dmCapital: [capitalRow({ channel })] };
      const model = decodeDemand('capitalDemand', value) as CapitalDemandModel;
      expect(model.rows[0]?.channel).toBe(channel);
    });
  });

  it('constrains the labour sourcing column the same way', () => {
    const value: FormValue = { dmLabour: [labourRow({ sourcing: 'Indentured crew' })] };
    const model = decodeDemand('labourDemand', value) as LabourDemandModel;
    expect(model.rows[0]?.sourcing).toBe('');
    LABOUR_SOURCING_LIST.forEach((sourcing) => {
      const v: FormValue = { dmLabour: [labourRow({ sourcing })] };
      const m = decodeDemand('labourDemand', v) as LabourDemandModel;
      expect(m.rows[0]?.sourcing).toBe(sourcing);
    });
  });
});

describe('isDemandValid -- the record gate', () => {
  it('labour: empty is invalid; a task with weekly hours is valid', () => {
    expect(isDemandValid('labourDemand', {})).toBe(false);
    expect(isDemandValid('labourDemand', { dmLabour: [labourRow({ hoursPerWeek: 0, people: 0 })] })).toBe(
      false,
    );
    expect(isDemandValid('labourDemand', { dmLabour: [labourRow()] })).toBe(true);
  });

  it('capital: requires a category, a positive amount, AND a permitted channel', () => {
    expect(isDemandValid('capitalDemand', {})).toBe(false);
    // amount but no channel -> not recordable
    expect(
      isDemandValid('capitalDemand', { dmCapital: [capitalRow({ channel: '' })] }),
    ).toBe(false);
    // foreign channel decodes to '' -> still not recordable
    expect(
      isDemandValid('capitalDemand', { dmCapital: [capitalRow({ channel: FOREIGN_CHANNEL })] }),
    ).toBe(false);
    // category + amount + permitted channel -> recordable
    expect(isDemandValid('capitalDemand', { dmCapital: [capitalRow()] })).toBe(true);
  });
});

describe('phase1DemandBaseline -- the Capacity Bridge join input', () => {
  it('is uncaptured when neither side has a line', () => {
    const b = phase1DemandBaseline({}, {});
    expect(b.captured).toBe(false);
    expect(b.labour.weeklyHours).toBe(0);
    expect(b.capital.total).toBe(0);
  });

  it('rolls labour weekly hours, headcount, and sourcing breakdown', () => {
    const labourValue: FormValue = {
      dmLabour: [
        labourRow({ id: 'a', hoursPerWeek: 20, people: 2, sourcing: 'Existing steward team' }),
        labourRow({ id: 'b', task: 'Fencing', hoursPerWeek: 10, people: 1, sourcing: 'Contractor' }),
      ],
    };
    const b = labourDemandFrom(labourValue);
    expect(b.weeklyHours).toBe(30);
    expect(b.headcount).toBe(3);
    expect(b.lineCount).toBe(2);
    expect(b.bySourcing).toEqual(
      expect.arrayContaining([
        { sourcing: 'Existing steward team', weeklyHours: 20 },
        { sourcing: 'Contractor', weeklyHours: 10 },
      ]),
    );
  });

  it('rolls capital totals and groups by permitted channel only', () => {
    const capitalValue: FormValue = {
      dmCapital: [
        capitalRow({ id: 'a', amount: 5000, channel: 'Charitable donation' }),
        capitalRow({ id: 'b', category: 'Equipment', amount: 2500, channel: 'Charitable donation' }),
        capitalRow({ id: 'c', category: 'Working capital', amount: 1000, channel: FOREIGN_CHANNEL }),
      ],
    };
    const b = capitalDemandFrom(capitalValue);
    expect(b.total).toBe(8500); // foreign-channel row still counts toward the category total
    expect(b.lineCount).toBe(3);
    // but the foreign channel is dropped from the channel breakdown ('' excluded)
    expect(b.byChannel).toEqual([{ channel: 'Charitable donation', amount: 7500 }]);
  });

  it('marks captured true when either side has a line', () => {
    expect(phase1DemandBaseline({ dmLabour: [labourRow()] }, {}).captured).toBe(true);
    expect(phase1DemandBaseline({}, { dmCapital: [capitalRow()] }).captured).toBe(true);
  });
});

describe('summariseDemand', () => {
  it('summarises labour demand', () => {
    expect(summariseDemand('labourDemand', { dmLabour: [labourRow()] })).toBe(
      '1 labour line(s), 20 hrs/week, 2 people',
    );
  });

  it('summarises capital demand', () => {
    expect(summariseDemand('capitalDemand', { dmCapital: [capitalRow()] })).toBe(
      '1 capital line(s), total 5000 across 1 channel(s)',
    );
  });
});

describe('catalogue invariant -- s7-resource-plan unchanged by the in-place upgrade', () => {
  const obj = UNIVERSAL_PLAN_OBJECTIVES.find((o) => o.id === 's7-resource-plan');

  it('still carries exactly 5 checklist items', () => {
    expect(obj).toBeDefined();
    expect(obj!.checklist.map((c) => c.id)).toEqual([
      's7-resource-plan-c1',
      's7-resource-plan-c2',
      's7-resource-plan-c3',
      's7-resource-plan-c4',
      's7-resource-plan-c5',
    ]);
  });

  it('keeps dg1 (Labour & skills) and dg2 (Capital & procurement) membership intact', () => {
    const dg1 = obj!.decisionGroups!.find((g) => g.id === 's7-resource-plan-dg1');
    const dg2 = obj!.decisionGroups!.find((g) => g.id === 's7-resource-plan-dg2');
    expect(dg1!.itemIds).toEqual([
      's7-resource-plan-c1',
      's7-resource-plan-c2',
      's7-resource-plan-c3',
    ]);
    expect(dg2!.itemIds).toEqual(['s7-resource-plan-c4', 's7-resource-plan-c5']);
  });
});

describe('render -- mode bodies', () => {
  it('labourDemand renders its eyebrow, add control, and the 1.2 bridge feeds note', () => {
    render(
      <DemandCapture mode="labourDemand" value={{}} onChange={() => {}} itemId="s7-resource-plan-c1" />,
    );
    // "by task and season" is the eyebrow hint, unique to the labour body
    expect(screen.getByText(/by task and season/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add labour line/i })).toBeTruthy();
    expect(screen.getByText(/Objective 1\.2/i)).toBeTruthy();
  });

  it('capitalDemand surfaces the verbatim Amanah scope note and only permitted channels', () => {
    // seed one capital row so the channel <select> renders (an empty register has
    // no rows, hence no dropdown)
    const { container } = render(
      <DemandCapture
        mode="capitalDemand"
        value={{ dmCapital: [capitalRow()] }}
        onChange={() => {}}
        itemId="s7-resource-plan-c4"
      />,
    );
    expect(screen.getByText(CAPITAL_SCOPE_NOTES)).toBeTruthy();
    // the channel <select> offers exactly the permitted closed enum (+ placeholder)
    const optionTexts = Array.from(container.querySelectorAll('option')).map(
      (o) => o.textContent ?? '',
    );
    CAPITAL_CHANNEL_LIST.forEach((channel) => {
      expect(optionTexts).toContain(channel);
    });
    // No SELECTABLE funding channel is a covenant-banned instrument. (The verbatim
    // CAPITAL_SCOPE_NOTES note is deliberately excluded from this scan -- it NAMES
    // the prohibited concepts in order to forbid them, which is compliant
    // prohibition language, not an authored channel.)
    optionTexts.forEach((label) => {
      expect(detectCovenantBanned(label), label).toBe(false);
    });
  });
});

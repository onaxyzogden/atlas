/**
 * @vitest-environment happy-dom
 *
 * CarryingCapacityCapture -- multi-mode CONTROLLED renderer for the ecovillage
 * objective ev-s2-carrying-capacity (7 checklist items c1..c7, modes water /
 * food / waste / energy / space / synthesis / gate).
 *
 * Verified behaviours:
 *   - carryingCapacityModeFor maps each c1..c7 id (and null for others).
 *   - decode is TOTAL/defensive (non-array growables ignored; garbage entries
 *     coerced to neutral structural defaults; never fabricates the mockup demo
 *     numbers as persisted data).
 *   - encode round-trips losslessly.
 *   - each pure ceiling fn matches the formula on representative AND default
 *     inputs.
 *   - synthesis aggregator binding/min/maxHH on defaults.
 *   - gate util/within/exceeds + Confirm-enabled logic.
 *   - validity per mode.
 *   - a render assertion per mode.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';

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
  CarryingCapacityCapture,
  carryingCapacityModeFor,
  decodeCarryingCapacity,
  encodeCarryingCapacity,
  isCarryingCapacityValid,
  summariseCarryingCapacity,
  computeWaterCeiling,
  computeFoodCeiling,
  computeWasteCeiling,
  computeEnergyCeiling,
  computeSpaceCeiling,
  computePopulation,
  computeSynthesis,
  type CarryingCapacityMode,
} from '../CarryingCapacityCapture.js';
import type { FormValue } from '../actToolCatalog.js';

function renderMode(
  mode: CarryingCapacityMode,
  value: FormValue,
  siblingValues: Record<string, FormValue> = {},
  itemId = `ev-s2-carrying-capacity-${mapModeToSuffix(mode)}`,
) {
  const onChange = vi.fn();
  render(
    <CarryingCapacityCapture
      mode={mode}
      value={value}
      onChange={onChange}
      itemId={itemId}
      siblingValues={siblingValues}
    />,
  );
  return { onChange };
}

function mapModeToSuffix(mode: CarryingCapacityMode): string {
  switch (mode) {
    case 'water':
      return 'c1';
    case 'food':
      return 'c2';
    case 'waste':
      return 'c3';
    case 'energy':
      return 'c4';
    case 'space':
      return 'c5';
    case 'synthesis':
      return 'c6';
    case 'gate':
      return 'c7';
  }
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('carryingCapacityModeFor', () => {
  it('maps c1..c7 to the correct mode (TOTAL)', () => {
    expect(carryingCapacityModeFor('ev-s2-carrying-capacity-c1')).toBe('water');
    expect(carryingCapacityModeFor('ev-s2-carrying-capacity-c2')).toBe('food');
    expect(carryingCapacityModeFor('ev-s2-carrying-capacity-c3')).toBe('waste');
    expect(carryingCapacityModeFor('ev-s2-carrying-capacity-c4')).toBe('energy');
    expect(carryingCapacityModeFor('ev-s2-carrying-capacity-c5')).toBe('space');
    expect(carryingCapacityModeFor('ev-s2-carrying-capacity-c6')).toBe(
      'synthesis',
    );
    expect(carryingCapacityModeFor('ev-s2-carrying-capacity-c7')).toBe('gate');
  });

  it('returns null for unrelated / unknown ids', () => {
    expect(carryingCapacityModeFor('ev-s2-carrying-capacity-c8')).toBeNull();
    expect(carryingCapacityModeFor('s2-ecology-c1')).toBeNull();
    expect(carryingCapacityModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pure ceiling functions -- on defaults AND representative inputs
// ---------------------------------------------------------------------------

describe('pure ceiling functions', () => {
  it('computePopulation on defaults (hh=8, pph=2.5) -> 20 people', () => {
    const pop = computePopulation(decodeCarryingCapacity('water', {}));
    expect(pop.hh).toBe(8);
    expect(pop.pph).toBe(2.5);
    expect(pop.intendedPeople).toBe(20);
  });

  it('water ceiling on defaults = floor((5000-1600)/80) = 42', () => {
    expect(computeWaterCeiling(decodeCarryingCapacity('water', {}))).toBe(42);
  });

  it('food ceiling on defaults (intensity 450) = 17', () => {
    // floor((20000*450)/(730000*0.7)) = floor(9,000,000/511,000) = 17
    expect(computeFoodCeiling(decodeCarryingCapacity('food', {}))).toBe(17);
  });

  it('waste ceiling on defaults = floor(25/0.05) = 500', () => {
    expect(computeWasteCeiling(decodeCarryingCapacity('waste', {}))).toBe(500);
  });

  it('energy ceiling on defaults = round(floor(90/8)*2.5) = 28', () => {
    // eGenDaily = 20*4.5 = 90; eHHCeil = floor(90/8) = 11; round(11*2.5) = 28
    expect(computeEnergyCeiling(decodeCarryingCapacity('energy', {}), 2.5)).toBe(
      28,
    );
  });

  it('space ceiling on defaults = floor((45-27-4-0.5)/0.5) = 27 households', () => {
    expect(computeSpaceCeiling(decodeCarryingCapacity('space', {}))).toBe(27);
  });

  it('food intensity selector changes the ceiling', () => {
    const intensive = decodeCarryingCapacity('food', {
      ccFoodIntensity: '800',
    });
    // floor((20000*800)/(730000*0.7)) = floor(16,000,000/511,000) = 31
    expect(computeFoodCeiling(intensive)).toBe(31);
  });

  // --- degenerate-denominator guards (M2/M3) ---------------------------------

  it('water ceiling with wDom=0 returns 0 (no Infinity)', () => {
    const m = decodeCarryingCapacity('water', { wDom: '0' });
    const c = computeWaterCeiling(m);
    expect(Number.isFinite(c)).toBe(true);
    expect(c).toBe(0);
  });

  it('energy ceiling with eDemand=0 returns 0 (no Infinity)', () => {
    const m = decodeCarryingCapacity('energy', { eDemand: '0' });
    const c = computeEnergyCeiling(m, 2.5);
    expect(Number.isFinite(c)).toBe(true);
    expect(c).toBe(0);
  });

  it('space ceiling with sHh=0 returns 0 (no Infinity)', () => {
    const m = decodeCarryingCapacity('space', { sHh: '0' });
    const c = computeSpaceCeiling(m);
    expect(Number.isFinite(c)).toBe(true);
    expect(c).toBe(0);
  });

  it('food ceiling with fExtern=100 (selfSuffRatio<=0) returns 0', () => {
    const m = decodeCarryingCapacity('food', { fExtern: '100' });
    expect(computeFoodCeiling(m)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Synthesis aggregator -- on all defaults
// ---------------------------------------------------------------------------

describe('computeSynthesis (defaults)', () => {
  const PREFIX = 'ev-s2-carrying-capacity';
  const siblings: Record<string, FormValue> = {
    [`${PREFIX}-c1`]: {},
    [`${PREFIX}-c2`]: {},
    [`${PREFIX}-c3`]: {},
    [`${PREFIX}-c4`]: {},
    [`${PREFIX}-c5`]: {},
  };

  it('binds on food, minPeople=17, maxHH=6', () => {
    const syn = computeSynthesis(siblings, PREFIX);
    expect(syn.waterCeiling).toBe(42);
    expect(syn.foodCeiling).toBe(17);
    expect(syn.wasteCeiling).toBe(500);
    expect(syn.energyCeiling).toBe(28);
    expect(syn.spaceCeiling).toBe(27);
    // spacePeople = round(27 * 2.5) = 68
    expect(syn.spacePeople).toBe(68);
    expect(syn.domainsInPeople).toEqual([42, 17, 500, 28, 68]);
    expect(syn.minPeople).toBe(17);
    expect(syn.bindingIdx).toBe(1);
    expect(syn.bindingName).toBe('food production');
    expect(syn.maxHH).toBe(6);
    expect(syn.intendedPeople).toBe(20);
  });

  it('works with empty siblings map (all structural defaults)', () => {
    const syn = computeSynthesis({}, PREFIX);
    expect(syn.minPeople).toBe(17);
    expect(syn.bindingName).toBe('food production');
  });

  it('pph=0 on c1 -> maxHH finite (0), no NaN/Infinity in note figures', () => {
    const siblings: Record<string, FormValue> = {
      [`${PREFIX}-c1`]: encodeCarryingCapacity('water', {
        ...decodeCarryingCapacity('water', {}),
        hh: '8',
        pph: '0',
      } as never),
    };
    const syn = computeSynthesis(siblings, PREFIX);
    expect(Number.isFinite(syn.maxHH)).toBe(true);
    expect(syn.maxHH).toBe(0);
    expect(Number.isNaN(syn.intendedPeople)).toBe(false);
    expect(Number.isFinite(syn.intendedPeople)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Gate logic
// ---------------------------------------------------------------------------

describe('gate logic', () => {
  const PREFIX = 'ev-s2-carrying-capacity';

  it('defaults: intended 20 > ceiling 17 -> exceeds by 3, util 118, Confirm disabled', () => {
    const syn = computeSynthesis({}, PREFIX);
    expect(syn.intendedPeople).toBe(20);
    expect(syn.minPeople).toBe(17);
    expect(syn.util).toBe(118); // round(20/17*100)
    expect(syn.withinCapacity).toBe(false);
    expect(syn.exceedsBy).toBe(3);
  });

  it('within-capacity case enables Confirm', () => {
    // Lower intended pop: hh=4, pph=2 -> 8 people <= 17.
    const siblings: Record<string, FormValue> = {
      [`${PREFIX}-c1`]: encodeCarryingCapacity('water', {
        ...decodeCarryingCapacity('water', {}),
        hh: '4',
        pph: '2',
      } as never),
    };
    const syn = computeSynthesis(siblings, PREFIX);
    expect(syn.intendedPeople).toBe(8);
    expect(syn.withinCapacity).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// decode / encode round-trip + defensive
// ---------------------------------------------------------------------------

describe('decode / encode', () => {
  it('water round-trips losslessly', () => {
    const value: FormValue = {
      hh: '10',
      pph: '3',
      wDom: '70',
      wIrr: '1000',
      wLive: '300',
      wSupply: '6000',
    };
    const model = decodeCarryingCapacity('water', value);
    expect(encodeCarryingCapacity('water', model)).toEqual(value);
  });

  it('food round-trips losslessly', () => {
    const value: FormValue = {
      hh: '8',
      pph: '2.5',
      fArea: '15000',
      fExtern: '20',
      ccFoodIntensity: '100',
    };
    const model = decodeCarryingCapacity('food', value);
    expect(encodeCarryingCapacity('food', model)).toEqual(value);
  });

  it('space round-trips losslessly', () => {
    const value: FormValue = {
      hh: '8',
      pph: '2.5',
      spaceTotalHa: '60',
      sWild: '30',
      sFood: '5',
      sComm: '1',
      sHh: '0.6',
    };
    const model = decodeCarryingCapacity('space', value);
    expect(encodeCarryingCapacity('space', model)).toEqual(value);
  });

  it('gate round-trips losslessly', () => {
    const value: FormValue = { hh: '8', pph: '2.5', pathway: 'confirm' };
    const model = decodeCarryingCapacity('gate', value);
    expect(encodeCarryingCapacity('gate', model)).toEqual(value);
  });

  it('decode is defensive: garbage numerics fall back to neutral defaults; never throws', () => {
    const m = decodeCarryingCapacity('water', {
      hh: 'abc',
      pph: '',
      wDom: ['junk'] as unknown as string,
    } as unknown as FormValue);
    // Garbage strings are preserved literally (raw text fields), but the
    // compute fn coerces them to the defaults via Number(raw) || DEFAULT.
    expect(computeWaterCeiling(m)).toBe(42);
    expect(computePopulation(m).intendedPeople).toBe(20);
  });

  it('decode never fabricates the mockup demo numbers as persisted data', () => {
    const m = decodeCarryingCapacity('water', {});
    // empty raw fields, not seeded with "80"/"1200"/etc.
    expect(m.kind).toBe('water');
    if (m.kind === 'water') {
      expect(m.wDom).toBe('');
      expect(m.wIrr).toBe('');
      expect(m.hh).toBe('');
    }
  });

  it('gate decode rejects unknown pathway enum -> null', () => {
    const m = decodeCarryingCapacity('gate', { pathway: 'bogus' });
    if (m.kind === 'gate') expect(m.pathway).toBeNull();
  });

  it('food decode rejects unknown intensity -> default 450', () => {
    const m = decodeCarryingCapacity('food', { ccFoodIntensity: '999' });
    expect(computeFoodCeiling(m)).toBe(17);
  });
});

// ---------------------------------------------------------------------------
// validity
// ---------------------------------------------------------------------------

describe('isCarryingCapacityValid', () => {
  it('resource modes are valid (always computable)', () => {
    expect(isCarryingCapacityValid('water', {})).toBe(true);
    expect(isCarryingCapacityValid('food', {})).toBe(true);
    expect(isCarryingCapacityValid('waste', {})).toBe(true);
    expect(isCarryingCapacityValid('energy', {})).toBe(true);
    expect(isCarryingCapacityValid('space', {})).toBe(true);
    expect(isCarryingCapacityValid('synthesis', {})).toBe(true);
  });

  it('gate valid only when a pathway is chosen', () => {
    expect(isCarryingCapacityValid('gate', {})).toBe(false);
    expect(isCarryingCapacityValid('gate', { pathway: 'confirm' })).toBe(true);
    expect(isCarryingCapacityValid('gate', { pathway: 'bogus' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// summarise
// ---------------------------------------------------------------------------

describe('summariseCarryingCapacity', () => {
  it('water summary mentions a ceiling figure', () => {
    expect(summariseCarryingCapacity('water', {})).toMatch(/42/);
  });
  it('gate summary reflects chosen pathway', () => {
    expect(summariseCarryingCapacity('gate', { pathway: 'confirm' })).toMatch(
      /[Cc]onfirm/,
    );
  });
  it('energy summary sources pph from the c1 sibling (agrees with the c4 panel)', () => {
    const PREFIX = 'ev-s2-carrying-capacity';
    // c1 sibling: hh=10, pph=3 (NOT the default 2.5).
    const siblings: Record<string, FormValue> = {
      [`${PREFIX}-c1`]: encodeCarryingCapacity('water', {
        ...decodeCarryingCapacity('water', {}),
        hh: '10',
        pph: '3',
      } as never),
    };
    // c4 itself carries NO hh/pph (only editable on c1).
    const energyValue: FormValue = {};
    const energyModel = decodeCarryingCapacity('energy', energyValue);
    // The summary must reflect c1's pph=3, matching what the panel computes.
    const expected = computeEnergyCeiling(energyModel, 3);
    expect(summariseCarryingCapacity('energy', energyValue, siblings)).toBe(
      `Energy ceiling: ${expected} people`,
    );
    // Guard the contract: pph=3 yields 33, distinct from the default-2.5's 28.
    expect(expected).toBe(33);
  });
});

// ---------------------------------------------------------------------------
// Render smoke per mode
// ---------------------------------------------------------------------------

describe('render', () => {
  it('water (c1) renders the population anchor inputs', () => {
    renderMode('water', {});
    expect(screen.getByTestId('cc-pop-hh')).toBeTruthy();
    expect(screen.getByTestId('cc-pop-pph')).toBeTruthy();
  });

  it('food (c2) renders the 3 intensity options', () => {
    renderMode('food', {});
    expect(screen.getByTestId('cc-intensity-800')).toBeTruthy();
    expect(screen.getByTestId('cc-intensity-450')).toBeTruthy();
    expect(screen.getByTestId('cc-intensity-100')).toBeTruthy();
  });

  it('space (c5) renders the editable total-area row (divergence)', () => {
    renderMode('space', {});
    expect(screen.getByTestId('cc-space-total')).toBeTruthy();
  });

  it('synthesis (c6) renders the max + binding row', () => {
    const PREFIX = 'ev-s2-carrying-capacity';
    renderMode('synthesis', {}, {}, `${PREFIX}-c6`);
    expect(screen.getByTestId('cc-syn-max')).toBeTruthy();
    expect(screen.getByTestId('cc-syn-row-food')).toBeTruthy();
  });

  it('gate (c7) renders 3 pathways with Confirm disabled at defaults', () => {
    const PREFIX = 'ev-s2-carrying-capacity';
    renderMode('gate', {}, {}, `${PREFIX}-c7`);
    const confirm = screen.getByTestId('cc-pathway-confirm') as HTMLButtonElement;
    expect(screen.getByTestId('cc-pathway-defer')).toBeTruthy();
    expect(screen.getByTestId('cc-pathway-redesign')).toBeTruthy();
    expect(confirm.disabled).toBe(true);
  });

  it('gate (c7) enables Confirm when intended population is within capacity', () => {
    const PREFIX = 'ev-s2-carrying-capacity';
    // Low intended pop (hh=4, pph=2 -> 8 people) vs ceilings (min 17).
    const siblings: Record<string, FormValue> = {
      [`${PREFIX}-c1`]: encodeCarryingCapacity('water', {
        ...decodeCarryingCapacity('water', {}),
        hh: '4',
        pph: '2',
      } as never),
    };
    renderMode('gate', {}, siblings, `${PREFIX}-c7`);
    const confirm = screen.getByTestId('cc-pathway-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });

  // --- I1/I2: c2-c5 echo + c4 energy ceiling source the anchor from c1 -------

  it('c4 (energy) echo + ceiling source the population anchor from the c1 sibling', () => {
    const PREFIX = 'ev-s2-carrying-capacity';
    // c1 sibling: hh=10, pph=3 -> 30 people (NOT the default 20).
    const siblings: Record<string, FormValue> = {
      [`${PREFIX}-c1`]: encodeCarryingCapacity('water', {
        ...decodeCarryingCapacity('water', {}),
        hh: '10',
        pph: '3',
      } as never),
    };
    // c4 itself carries NO hh/pph (only editable on c1).
    renderMode('energy', {}, siblings, `${PREFIX}-c4`);
    // Echo mirrors the c1 anchor: 30 people, 10 households.
    expect(screen.getByTestId('cc-pop-total').textContent).toBe('30');
    // Energy ceiling uses c1's pph=3: round(floor(90/8)*3) = round(11*3) = 33.
    expect(screen.getByText('33')).toBeTruthy();
  });

  it('c5 (space) echo sources the population anchor from the c1 sibling', () => {
    const PREFIX = 'ev-s2-carrying-capacity';
    const siblings: Record<string, FormValue> = {
      [`${PREFIX}-c1`]: encodeCarryingCapacity('water', {
        ...decodeCarryingCapacity('water', {}),
        hh: '10',
        pph: '3',
      } as never),
    };
    renderMode('space', {}, siblings, `${PREFIX}-c5`);
    expect(screen.getByTestId('cc-pop-total').textContent).toBe('30');
  });
});

/**
 * @vitest-environment happy-dom
 *
 * EnergyCapture -- contract (mode mapper, decode/encode/valid/summarise) AND the
 * React component + 6 mode bodies (p1..p6). Mirrors WaterSystemsCapture /
 * SoilImprovementCapture test structure. Logic tests assert decode is
 * total/defensive (empty FormValue -> default model, no throw), encode is a
 * lossless inverse, and validity is advisory (every mode is always recordable --
 * no covenant gate applies to an energy-systems assessment, the c3 hydro mode
 * stays always-valid even when not applicable). Render tests assert
 * representative verbatim mockup content renders per mode and that typing notes
 * emits the per-mode FormValue key.
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

import {
  EnergyCapture,
  ENERGY_PREFIX,
  energyModeFor,
  decodeEnergy,
  encodeEnergy,
  isEnergyValid,
  summariseEnergy,
  type EnergyMode,
} from '../EnergyCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const NOOP = (): void => {};
const P = ENERGY_PREFIX;

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('energyModeFor', () => {
  it('maps c1..c6 to the six modes', () => {
    const expected: Record<string, EnergyMode> = {
      c1: 'solar',
      c2: 'wind',
      c3: 'hydro',
      c4: 'biomass',
      c5: 'demand',
      c6: 'distribution',
    };
    for (const [suffix, mode] of Object.entries(expected)) {
      expect(energyModeFor(`${P}-${suffix}`)).toBe(mode);
    }
  });

  it('returns null for unknown suffixes and foreign prefixes', () => {
    expect(energyModeFor(`${P}-c7`)).toBeNull();
    expect(energyModeFor(`${P}-x`)).toBeNull();
    expect(energyModeFor('s4-water-strategy-c1')).toBeNull();
    expect(energyModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode/encode roundtrip + total/defensive decode
// ---------------------------------------------------------------------------

const ALL_MODES: EnergyMode[] = [
  'solar',
  'wind',
  'hydro',
  'biomass',
  'demand',
  'distribution',
];

describe('decodeEnergy is total and defensive', () => {
  it('empty FormValue yields default models (no fabricated seed data)', () => {
    expect(decodeEnergy('solar', {})).toEqual({ kind: 'solar', notes: '' });
    expect(decodeEnergy('wind', {})).toEqual({ kind: 'wind', notes: '' });
    expect(decodeEnergy('hydro', {})).toEqual({ kind: 'hydro', notes: '' });
    expect(decodeEnergy('biomass', {})).toEqual({ kind: 'biomass', notes: '' });
    expect(decodeEnergy('demand', {})).toEqual({ kind: 'demand', notes: '' });
    expect(decodeEnergy('distribution', {})).toEqual({
      kind: 'distribution',
      notes: '',
    });
  });

  it('never throws on garbage / mixed-shape values', () => {
    for (const mode of ALL_MODES) {
      expect(() =>
        decodeEnergy(mode, {
          junk: 'x',
          enSolarNotes: ['array', 'value'] as unknown as string,
          enDistributionNotes: 42 as unknown as string,
        }),
      ).not.toThrow();
    }
  });
});

describe('encodeEnergy is a lossless inverse of decode', () => {
  it('roundtrips every mode', () => {
    const cases: FormValue[] = [
      { enSolarNotes: 'ground-mount zones confirmed' },
      { enWindNotes: 'marginal, supplementary only' },
      { enHydroNotes: 'no permanent watercourse' },
      { enBiomassNotes: '8 ha managed thinning' },
      { enDemandNotes: 'efficiency-first appliances' },
      { enDistributionNotes: 'community micro-grid selected' },
    ];
    ALL_MODES.forEach((mode, i) => {
      const v = cases[i]!;
      const re = encodeEnergy(mode, decodeEnergy(mode, v));
      const reDecoded = decodeEnergy(mode, re);
      expect(decodeEnergy(mode, v)).toEqual(reDecoded);
    });
  });
});

// ---------------------------------------------------------------------------
// validity (advisory: every mode always recordable)
// ---------------------------------------------------------------------------

describe('isEnergyValid', () => {
  it('every mode is always recordable (advisory, no covenant gate)', () => {
    for (const mode of ALL_MODES) {
      expect(isEnergyValid(mode, {})).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// summaries
// ---------------------------------------------------------------------------

describe('summariseEnergy returns a non-empty string per mode', () => {
  it('every mode summarises to a non-empty string', () => {
    for (const mode of ALL_MODES) {
      const s = summariseEnergy(mode, {});
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// solar (c1) render
// ---------------------------------------------------------------------------

describe('EnergyCapture solar (c1)', () => {
  it('renders the two solar zones and the total potential verbatim', () => {
    render(<EnergyCapture mode="solar" value={{}} onChange={NOOP} itemId={`${P}-c1`} />);
    expect(screen.getByText('Rooftop solar')).toBeTruthy();
    expect(screen.getByText('Ground-mount solar')).toBeTruthy();
    expect(screen.getByText('36,700 kWh/yr')).toBeTruthy();
    expect(screen.getByText('59,200 kWh/yr')).toBeTruthy();
    expect(screen.getByText(/Total solar potential \(74.8 kW installed\)/)).toBeTruthy();
    expect(screen.getByText('95,900 kWh/yr')).toBeTruthy();
  });

  it('typing solar notes emits enSolarNotes', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <EnergyCapture mode="solar" value={current} onChange={onChange} itemId={`${P}-c1`} />,
    );
    fireEvent.change(screen.getByLabelText(/Solar assessment notes/i), {
      target: { value: 'ground-mount preferred' },
    });
    expect(onChange).toHaveBeenCalled();
    expect(current.enSolarNotes).toBe('ground-mount preferred');
  });
});

// ---------------------------------------------------------------------------
// wind (c2) render
// ---------------------------------------------------------------------------

describe('EnergyCapture wind (c2)', () => {
  it('renders the wind speed, regulatory tiers, and contribution verbatim', () => {
    render(<EnergyCapture mode="wind" value={{}} onChange={NOOP} itemId={`${P}-c2`} />);
    expect(screen.getByText('4.2 m/s')).toBeTruthy();
    expect(screen.getByText(/Regulatory constraints - Kinfolk Ridge \(45 ha\)/)).toBeTruthy();
    expect(screen.getByText(/Large turbines \(>= 50 kW, >= 30m tower\):/)).toBeTruthy();
    expect(screen.getByText(/Micro-turbines \(<= 1 kW\):/)).toBeTruthy();
    expect(screen.getByText('~2,500 kWh/yr')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// hydro (c3) render
// ---------------------------------------------------------------------------

describe('EnergyCapture hydro (c3)', () => {
  it('renders the sizing inputs, result, and the not-applicable note verbatim', () => {
    render(<EnergyCapture mode="hydro" value={{}} onChange={NOOP} itemId={`${P}-c3`} />);
    expect(screen.getByText(/Available head/)).toBeTruthy();
    expect(screen.getByText(/Minimum flow rate \(dry season\)/)).toBeTruthy();
    expect(screen.getByText('0.33 kW')).toBeTruthy();
    expect(
      screen.getByText(/Head x flow at this scale generates < 1 kW/),
    ).toBeTruthy();
    expect(
      screen.getByText(/record micro-hydro as not applicable/),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// biomass (c4) render
// ---------------------------------------------------------------------------

describe('EnergyCapture biomass (c4)', () => {
  it('renders the woodland area, yield, and thermal equivalent verbatim', () => {
    render(<EnergyCapture mode="biomass" value={{}} onChange={NOOP} itemId={`${P}-c4`} />);
    expect(screen.getByText(/Total woodland \/ scrubland area/)).toBeTruthy();
    expect(screen.getByText(/Sustainable yield rate/)).toBeTruthy();
    expect(screen.getByText('9.6 m3/yr')).toBeTruthy();
    expect(screen.getByText('34,600 kWh/yr (thermal)')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// demand (c5) render
// ---------------------------------------------------------------------------

describe('EnergyCapture demand (c5)', () => {
  it('renders the demand categories and the total verbatim', () => {
    render(<EnergyCapture mode="demand" value={{}} onChange={NOOP} itemId={`${P}-c5`} />);
    expect(screen.getByText(/Demand by category - 8 households, 20 people/)).toBeTruthy();
    expect(
      screen.getByText(/Domestic electricity \(lighting, appliances, cooking\)/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Electric vehicles \/ mobility \(charge per day\)/),
    ).toBeTruthy();
    expect(screen.getByText(/70 kWh\/day = 25,550 kWh\/yr/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// distribution (c6) render
// ---------------------------------------------------------------------------

describe('EnergyCapture distribution (c6)', () => {
  it('renders the balance table, surplus, battery, and architecture cards verbatim', () => {
    render(
      <EnergyCapture mode="distribution" value={{}} onChange={NOOP} itemId={`${P}-c6`} />,
    );
    expect(screen.getByText('Total generation')).toBeTruthy();
    expect(screen.getByText('Community demand')).toBeTruthy();
    expect(screen.getByText('3.9x community demand')).toBeTruthy();
    expect(screen.getByText('175-220 kWh capacity')).toBeTruthy();
    expect(
      screen.getByText(/Community micro-grid - shared generation and storage/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Grid-connected with export - sell surplus at FiT rate/),
    ).toBeTruthy();
  });
});

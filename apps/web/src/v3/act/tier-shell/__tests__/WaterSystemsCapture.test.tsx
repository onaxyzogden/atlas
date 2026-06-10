/**
 * @vitest-environment happy-dom
 *
 * WaterSystemsCapture -- contract (mode mapper, decode/encode/valid/summarise)
 * AND the React component + 6 mode bodies (p1..p6). Mirrors
 * SoilImprovementCapture / HusbandryCapture test structure. Logic tests assert
 * decode is total/defensive (empty FormValue -> default model, no throw),
 * encode is a lossless inverse, and validity is advisory (every mode is always
 * recordable -- no covenant gate applies to a water strategy). Render tests
 * assert representative verbatim mockup content renders per mode and that
 * typing notes emits the per-mode FormValue key.
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
  WaterSystemsCapture,
  WATER_SYSTEMS_PREFIX,
  waterSystemsModeFor,
  decodeWaterSystems,
  encodeWaterSystems,
  isWaterSystemsValid,
  summariseWaterSystems,
  type WaterSystemsMode,
} from '../WaterSystemsCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const NOOP = (): void => {};
const P = WATER_SYSTEMS_PREFIX;

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('waterSystemsModeFor', () => {
  it('maps c1..c6 to the six modes', () => {
    const expected: Record<string, WaterSystemsMode> = {
      c1: 'demand',
      c2: 'sources',
      c3: 'strategy',
      c4: 'storage',
      c5: 'harvesting',
      c6: 'drought',
    };
    for (const [suffix, mode] of Object.entries(expected)) {
      expect(waterSystemsModeFor(`${P}-${suffix}`)).toBe(mode);
    }
  });

  it('returns null for unknown suffixes and foreign prefixes', () => {
    expect(waterSystemsModeFor(`${P}-c7`)).toBeNull();
    expect(waterSystemsModeFor(`${P}-x`)).toBeNull();
    expect(waterSystemsModeFor('s5-soil-improvement-c1')).toBeNull();
    expect(waterSystemsModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode/encode roundtrip + total/defensive decode
// ---------------------------------------------------------------------------

const ALL_MODES: WaterSystemsMode[] = [
  'demand',
  'sources',
  'strategy',
  'storage',
  'harvesting',
  'drought',
];

describe('decodeWaterSystems is total and defensive', () => {
  it('empty FormValue yields default models (no fabricated seed data)', () => {
    expect(decodeWaterSystems('demand', {})).toEqual({ kind: 'demand', notes: '' });
    expect(decodeWaterSystems('sources', {})).toEqual({ kind: 'sources', notes: '' });
    expect(decodeWaterSystems('strategy', {})).toEqual({ kind: 'strategy', notes: '' });
    expect(decodeWaterSystems('storage', {})).toEqual({ kind: 'storage', notes: '' });
    expect(decodeWaterSystems('harvesting', {})).toEqual({
      kind: 'harvesting',
      notes: '',
    });
    expect(decodeWaterSystems('drought', {})).toEqual({ kind: 'drought', notes: '' });
  });

  it('never throws on garbage / mixed-shape values', () => {
    for (const mode of ALL_MODES) {
      expect(() =>
        decodeWaterSystems(mode, {
          junk: 'x',
          wtDemandNotes: ['array', 'value'] as unknown as string,
          wtDroughtNotes: 42 as unknown as string,
        }),
      ).not.toThrow();
    }
  });
});

describe('encodeWaterSystems is a lossless inverse of decode', () => {
  it('roundtrips every mode', () => {
    const cases: FormValue[] = [
      { wtDemandNotes: 'demand measured not estimated' },
      { wtSourcesNotes: 'bore licence pending' },
      { wtStrategyNotes: 'bore-primary selected' },
      { wtStorageNotes: 'tank vs dam tbd' },
      { wtHarvestingNotes: 'keyline plan not designed' },
      { wtDroughtNotes: 'community review pending' },
    ];
    ALL_MODES.forEach((mode, i) => {
      const v = cases[i]!;
      const re = encodeWaterSystems(mode, decodeWaterSystems(mode, v));
      const reDecoded = decodeWaterSystems(mode, re);
      expect(decodeWaterSystems(mode, v)).toEqual(reDecoded);
    });
  });
});

// ---------------------------------------------------------------------------
// validity (advisory: every mode always recordable)
// ---------------------------------------------------------------------------

describe('isWaterSystemsValid', () => {
  it('every mode is always recordable (advisory, no covenant gate)', () => {
    for (const mode of ALL_MODES) {
      expect(isWaterSystemsValid(mode, {})).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// summaries
// ---------------------------------------------------------------------------

describe('summariseWaterSystems returns a non-empty string per mode', () => {
  it('every mode summarises to a non-empty string', () => {
    for (const mode of ALL_MODES) {
      const s = summariseWaterSystems(mode, {});
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// demand (c1) render
// ---------------------------------------------------------------------------

describe('WaterSystemsCapture demand (c1)', () => {
  it('renders the enterprise demand rows and the base total', () => {
    render(
      <WaterSystemsCapture mode="demand" value={{}} onChange={NOOP} itemId={`${P}-c1`} />,
    );
    expect(screen.getByText(/Domestic \(household\)/)).toBeTruthy();
    expect(screen.getByText(/Market garden \(0.5 ha, peak summer\)/)).toBeTruthy();
    expect(screen.getByText(/Nursery \(summer operating days\)/)).toBeTruthy();
    expect(screen.getByText(/Base enterprise demand/)).toBeTruthy();
    expect(screen.getByText(/2,620 L\/day/)).toBeTruthy();
  });

  it('typing demand notes emits wtDemandNotes', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <WaterSystemsCapture
        mode="demand"
        value={current}
        onChange={onChange}
        itemId={`${P}-c1`}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Water demand notes/i), {
      target: { value: 'demand metered at the pump' },
    });
    expect(onChange).toHaveBeenCalled();
    expect(current.wtDemandNotes).toBe('demand metered at the pump');
  });
});

// ---------------------------------------------------------------------------
// sources (c2) render
// ---------------------------------------------------------------------------

describe('WaterSystemsCapture sources (c2)', () => {
  it('renders the four source rows with capacities verbatim', () => {
    render(
      <WaterSystemsCapture mode="sources" value={{}} onChange={NOOP} itemId={`${P}-c2`} />,
    );
    expect(screen.getByText(/Bore \/ groundwater/)).toBeTruthy();
    expect(screen.getByText(/Rooftop rainwater harvesting/)).toBeTruthy();
    expect(screen.getByText(/Seasonal creek \/ dam storage/)).toBeTruthy();
    expect(screen.getByText(/Municipal mains water/)).toBeTruthy();
    expect(screen.getByText(/80mm bore, submersible pump/)).toBeTruthy();
    expect(screen.getByText('High reliability')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// strategy (c3) render
// ---------------------------------------------------------------------------

describe('WaterSystemsCapture strategy (c3)', () => {
  it('renders the three strategy cards with the selected option', () => {
    render(
      <WaterSystemsCapture
        mode="strategy"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c3`}
      />,
    );
    expect(
      screen.getByText(
        /Bore primary - rainwater harvesting \+ dam secondary - municipal emergency/,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Rainwater \+ dam primary - bore backup/)).toBeTruthy();
    expect(screen.getByText(/Best balance of cost, reliability and sovereignty/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// storage (c4) render
// ---------------------------------------------------------------------------

describe('WaterSystemsCapture storage (c4)', () => {
  it('renders the sizing inputs, the required capacity, and the gap', () => {
    render(
      <WaterSystemsCapture mode="storage" value={{}} onChange={NOOP} itemId={`${P}-c4`} />,
    );
    expect(screen.getByText(/Peak daily demand \(all enterprises\)/)).toBeTruthy();
    expect(screen.getByText(/Required autonomy period/)).toBeTruthy();
    expect(screen.getByText(/295,575 L/)).toBeTruthy();
    expect(screen.getByText(/~146,000 L/)).toBeTruthy();
    expect(
      screen.getByText(/3 x 100,000 L polyethylene tanks recommended/),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// harvesting (c5) render
// ---------------------------------------------------------------------------

describe('WaterSystemsCapture harvesting (c5)', () => {
  it('renders the four harvesting approaches verbatim', () => {
    render(
      <WaterSystemsCapture
        mode="harvesting"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c5`}
      />,
    );
    expect(screen.getByText(/Keyline pattern cultivation/)).toBeTruthy();
    expect(screen.getByText(/Swales on contour/)).toBeTruthy();
    expect(screen.getByText(/Rooftop collection into storage tanks/)).toBeTruthy();
    expect(screen.getByText(/Dam \/ earthwork water storage/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// drought (c6) render
// ---------------------------------------------------------------------------

describe('WaterSystemsCapture drought (c6)', () => {
  it('renders the four drought tiers with thresholds verbatim', () => {
    render(
      <WaterSystemsCapture mode="drought" value={{}} onChange={NOOP} itemId={`${P}-c6`} />,
    );
    expect(screen.getByText(/Tier 1 - Normal/)).toBeTruthy();
    expect(screen.getByText(/Tier 4 - Emergency/)).toBeTruthy();
    expect(screen.getByText(/Stock water priority/)).toBeTruthy();
    expect(screen.getByText(/Dam >= 60% capacity and bore performing normally/)).toBeTruthy();
    expect(
      screen.getByText(/Begin destocking assessment if bore failure is sustained/),
    ).toBeTruthy();
  });
});

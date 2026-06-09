/**
 * @vitest-environment happy-dom
 *
 * GrazingSystemCapture -- contract (mode mapper, decode/encode/valid/summarise)
 * AND the React component + 6 mode bodies (P1..P6). Mirrors ForageCapture's
 * test structure. Logic tests assert decode is total/defensive (empty FormValue
 * -> empty model, no fabricated rows), encode is a lossless inverse, and
 * validity gates behave per spec. Render tests assert each body's distinctive
 * canonical text/controls appear.
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
  GrazingSystemCapture,
  GRAZING_PREFIX,
  grazingModeFor,
  decodeGrazing,
  encodeGrazing,
  isGrazingValid,
  summariseGrazing,
  type GrazingMode,
  type GrazingMethodModel,
  type PaddockLayoutModel,
  type GrazeRestModel,
  type TreeProtectionModel,
  type ContingencyModel,
  type StockingDensityModel,
} from '../GrazingSystemCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const NOOP = (): void => {};

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('grazingModeFor', () => {
  it('maps c1..c6 to the six modes', () => {
    const expected: Record<string, GrazingMode> = {
      c1: 'grazingMethod',
      c2: 'paddockLayout',
      c3: 'grazeRest',
      c4: 'treeProtection',
      c5: 'contingency',
      c6: 'stockingDensity',
    };
    for (const [suffix, mode] of Object.entries(expected)) {
      expect(grazingModeFor(`${GRAZING_PREFIX}-${suffix}`)).toBe(mode);
    }
  });

  it('returns null for unknown suffixes and foreign prefixes', () => {
    expect(grazingModeFor(`${GRAZING_PREFIX}-c7`)).toBeNull();
    expect(grazingModeFor(`${GRAZING_PREFIX}-x`)).toBeNull();
    expect(grazingModeFor('silv-sec-s3-forage-survey-c1')).toBeNull();
    expect(grazingModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode/encode roundtrip + total/defensive decode
// ---------------------------------------------------------------------------

const ALL_MODES: GrazingMode[] = [
  'grazingMethod',
  'paddockLayout',
  'grazeRest',
  'treeProtection',
  'contingency',
  'stockingDensity',
];

describe('decodeGrazing is total and defensive', () => {
  it('empty FormValue yields an empty / default model per mode (no fabricated rows)', () => {
    const m1 = decodeGrazing('grazingMethod', {}) as GrazingMethodModel;
    expect(m1.method).toBe('');
    expect(m1.rationale).toBe('');

    const m2 = decodeGrazing('paddockLayout', {}) as PaddockLayoutModel;
    expect(m2.paddocks).toEqual([]);
    expect(m2.mobSize).toBe('');

    const m3 = decodeGrazing('grazeRest', {}) as GrazeRestModel;
    expect(m3.seasons.length).toBe(4);
    expect(m3.seasons.every((s) => s.grazePeriod === '' && s.restPeriod === '' && s.indicator === '')).toBe(
      true,
    );

    const m4 = decodeGrazing('treeProtection', {}) as TreeProtectionModel;
    expect(m4.stageNotes).toEqual(['', '', '']);

    const m5 = decodeGrazing('contingency', {}) as ContingencyModel;
    expect(m5.tiers.length).toBe(4);
    expect(m5.tiers.every((t) => t.trigger === '' && t.action === '')).toBe(true);

    const m6 = decodeGrazing('stockingDensity', {}) as StockingDensityModel;
    expect(m6.flock).toEqual([]);
  });

  it('never throws on garbage / partial arrays', () => {
    for (const mode of ALL_MODES) {
      expect(() => decodeGrazing(mode, { junk: 'x', padNames: ['a', 'b'] })).not.toThrow();
    }
  });
});

describe('encodeGrazing is a lossless inverse of decode', () => {
  it('roundtrips a populated grazingMethod', () => {
    const v: FormValue = { grazingMethod: 'rotational', grazingRationale: 'Best fit here' };
    expect(encodeGrazing('grazingMethod', decodeGrazing('grazingMethod', v))).toEqual(v);
  });

  it('roundtrips a populated paddockLayout', () => {
    const model: PaddockLayoutModel = {
      kind: 'paddockLayout',
      paddocks: [
        { id: 'p-0', name: 'South paddock', areaHa: '8.5', status: 'ok' },
        { id: 'p-1', name: 'Creek flats', areaHa: '0.8', status: 'seasonal' },
      ],
      mobSize: '100',
    };
    const re = decodeGrazing('paddockLayout', encodeGrazing('paddockLayout', model)) as PaddockLayoutModel;
    expect(re).toEqual(model);
  });

  it('roundtrips grazeRest, treeProtection, contingency, stockingDensity stably', () => {
    const grazeRest: GrazeRestModel = {
      kind: 'grazeRest',
      seasons: [
        { grazePeriod: '3-4 wks', restPeriod: '6-8 wks', indicator: 'boot height' },
        { grazePeriod: '2-3 wks', restPeriod: '7-9 wks', indicator: '' },
        { grazePeriod: '', restPeriod: '', indicator: '' },
        { grazePeriod: '', restPeriod: '', indicator: 'feed gap' },
      ],
    };
    expect(
      decodeGrazing('grazeRest', encodeGrazing('grazeRest', grazeRest)),
    ).toEqual(grazeRest);

    const tree: TreeProtectionModel = { kind: 'treeProtection', stageNotes: ['a', '', 'c'] };
    expect(decodeGrazing('treeProtection', encodeGrazing('treeProtection', tree))).toEqual(tree);

    const cont: ContingencyModel = {
      kind: 'contingency',
      tiers: [
        { trigger: 't0', action: 'a0' },
        { trigger: '', action: '' },
        { trigger: 't2', action: '' },
        { trigger: '', action: 'a3' },
      ],
    };
    expect(decodeGrazing('contingency', encodeGrazing('contingency', cont))).toEqual(cont);

    const flock: StockingDensityModel = {
      kind: 'stockingDensity',
      flock: [
        { id: 'f-0', label: 'Base flock', head: '100', dsePerHead: '1.0' },
        { id: 'f-1', label: 'Rams', head: '3', dsePerHead: '1.5' },
      ],
    };
    expect(decodeGrazing('stockingDensity', encodeGrazing('stockingDensity', flock))).toEqual(flock);
  });
});

// ---------------------------------------------------------------------------
// validity
// ---------------------------------------------------------------------------

describe('isGrazingValid', () => {
  it('grazingMethod requires both a method and a non-empty rationale', () => {
    expect(isGrazingValid('grazingMethod', {})).toBe(false);
    expect(
      isGrazingValid('grazingMethod', { grazingMethod: 'rotational', grazingRationale: '   ' }),
    ).toBe(false);
    expect(isGrazingValid('grazingMethod', { grazingMethod: '', grazingRationale: 'x' })).toBe(false);
    expect(
      isGrazingValid('grazingMethod', { grazingMethod: 'rotational', grazingRationale: 'x' }),
    ).toBe(true);
  });

  it('the other five modes are always valid (recordable)', () => {
    for (const mode of ['paddockLayout', 'grazeRest', 'treeProtection', 'contingency', 'stockingDensity'] as GrazingMode[]) {
      expect(isGrazingValid(mode, {})).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// summaries
// ---------------------------------------------------------------------------

describe('summariseGrazing', () => {
  it('grazingMethod', () => {
    expect(summariseGrazing('grazingMethod', {})).toMatch(/No grazing method/i);
    expect(
      summariseGrazing('grazingMethod', { grazingMethod: 'rotational', grazingRationale: 'x' }),
    ).toMatch(/Rotational/);
  });

  it('paddockLayout', () => {
    expect(summariseGrazing('paddockLayout', {})).toMatch(/No paddock layout/i);
    const v = encodeGrazing('paddockLayout', {
      kind: 'paddockLayout',
      paddocks: [
        { id: 'a', name: 'A', areaHa: '8', status: 'ok' },
        { id: 'b', name: 'B', areaHa: '4', status: 'ok' },
        { id: 'c', name: 'C', areaHa: '1', status: 'seasonal' },
      ],
      mobSize: '40',
    });
    expect(summariseGrazing('paddockLayout', v)).toMatch(/3 paddocks/);
    expect(summariseGrazing('paddockLayout', v)).toMatch(/40/);
  });

  it('grazeRest counts seasons with a graze period set', () => {
    const v = encodeGrazing('grazeRest', {
      kind: 'grazeRest',
      seasons: [
        { grazePeriod: '3-4 wks', restPeriod: '', indicator: '' },
        { grazePeriod: '2-3 wks', restPeriod: '', indicator: '' },
        { grazePeriod: '', restPeriod: '', indicator: '' },
        { grazePeriod: '', restPeriod: '', indicator: '' },
      ],
    });
    expect(summariseGrazing('grazeRest', v)).toMatch(/2 of 4/);
  });

  it('treeProtection', () => {
    expect(summariseGrazing('treeProtection', {})).toMatch(/3-stage tree-protection/);
  });

  it('contingency', () => {
    expect(summariseGrazing('contingency', {})).toMatch(/contingency/);
  });

  it('stockingDensity sums head x dse', () => {
    expect(summariseGrazing('stockingDensity', {})).toMatch(/No designed flock/i);
    const v = encodeGrazing('stockingDensity', {
      kind: 'stockingDensity',
      flock: [
        { id: 'a', label: 'Base', head: '100', dsePerHead: '1.0' },
        { id: 'b', label: 'Rams', head: '3', dsePerHead: '1.5' },
        { id: 'c', label: 'Repl', head: '20', dsePerHead: '0.8' },
      ],
    });
    // 100 + 4.5 + 16 = 120.5 -> ~120
    expect(summariseGrazing('stockingDensity', v)).toMatch(/120/);
    expect(summariseGrazing('stockingDensity', v)).toMatch(/3 flock/);
  });
});

// ---------------------------------------------------------------------------
// P1 grazingMethod render
// ---------------------------------------------------------------------------

describe('GrazingSystemCapture P1 grazingMethod', () => {
  it('renders all three method titles', () => {
    render(
      <GrazingSystemCapture
        mode="grazingMethod"
        value={{}}
        onChange={NOOP}
        itemId={`${GRAZING_PREFIX}-c1`}
      />,
    );
    expect(screen.getByText(/Rotational grazing/)).toBeTruthy();
    expect(screen.getByText(/Cell grazing/)).toBeTruthy();
    expect(screen.getByText(/Set-stocking/)).toBeTruthy();
  });

  it('selecting a method and typing a rationale round-trips through onChange', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    const { rerender } = render(
      <GrazingSystemCapture
        mode="grazingMethod"
        value={current}
        onChange={onChange}
        itemId={`${GRAZING_PREFIX}-c1`}
      />,
    );
    fireEvent.click(screen.getByText(/Rotational grazing/));
    rerender(
      <GrazingSystemCapture
        mode="grazingMethod"
        value={current}
        onChange={onChange}
        itemId={`${GRAZING_PREFIX}-c1`}
      />,
    );
    const ta = screen.getByLabelText('Rationale') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'Best fit for our paddocks' } });
    rerender(
      <GrazingSystemCapture
        mode="grazingMethod"
        value={current}
        onChange={onChange}
        itemId={`${GRAZING_PREFIX}-c1`}
      />,
    );
    const model = decodeGrazing('grazingMethod', current) as GrazingMethodModel;
    expect(model.method).toBe('rotational');
    expect(model.rationale).toBe('Best fit for our paddocks');
  });
});

// ---------------------------------------------------------------------------
// P2 paddockLayout render
// ---------------------------------------------------------------------------

describe('GrazingSystemCapture P2 paddockLayout', () => {
  it('renders the universal stocking-pressure principle and a mob size control', () => {
    render(
      <GrazingSystemCapture
        mode="paddockLayout"
        value={{}}
        onChange={NOOP}
        itemId={`${GRAZING_PREFIX}-c2`}
      />,
    );
    expect(screen.getByText(/Instantaneous stocking pressure/)).toBeTruthy();
    expect(screen.getByText(/mob size/i)).toBeTruthy();
  });

  it('adding a paddock emits a row through onChange', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    const { rerender } = render(
      <GrazingSystemCapture
        mode="paddockLayout"
        value={current}
        onChange={onChange}
        itemId={`${GRAZING_PREFIX}-c2`}
      />,
    );
    fireEvent.click(screen.getByText(/Add paddock/));
    rerender(
      <GrazingSystemCapture
        mode="paddockLayout"
        value={current}
        onChange={onChange}
        itemId={`${GRAZING_PREFIX}-c2`}
      />,
    );
    const model = decodeGrazing('paddockLayout', current) as PaddockLayoutModel;
    expect(model.paddocks.length).toBe(1);
    expect(model.paddocks[0]?.id).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// P3 grazeRest render
// ---------------------------------------------------------------------------

describe('GrazingSystemCapture P3 grazeRest', () => {
  it('renders all four season badges', () => {
    render(
      <GrazingSystemCapture
        mode="grazeRest"
        value={{}}
        onChange={NOOP}
        itemId={`${GRAZING_PREFIX}-c3`}
      />,
    );
    expect(screen.getByText('Autumn Apr-Jun')).toBeTruthy();
    expect(screen.getByText('Winter Jul-Sep')).toBeTruthy();
    expect(screen.getByText('Spring Oct-Dec')).toBeTruthy();
    expect(screen.getByText('Summer Jan-Mar')).toBeTruthy();
  });

  it('editing the autumn graze period round-trips positionally', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    const { rerender } = render(
      <GrazingSystemCapture
        mode="grazeRest"
        value={current}
        onChange={onChange}
        itemId={`${GRAZING_PREFIX}-c3`}
      />,
    );
    const grazeInputs = screen.getAllByLabelText('Graze period');
    fireEvent.change(grazeInputs[0]!, { target: { value: '3-4 wks' } });
    rerender(
      <GrazingSystemCapture
        mode="grazeRest"
        value={current}
        onChange={onChange}
        itemId={`${GRAZING_PREFIX}-c3`}
      />,
    );
    const model = decodeGrazing('grazeRest', current) as GrazeRestModel;
    expect(model.seasons[0]?.grazePeriod).toBe('3-4 wks');
  });
});

// ---------------------------------------------------------------------------
// P4 treeProtection render
// ---------------------------------------------------------------------------

describe('GrazingSystemCapture P4 treeProtection', () => {
  it('renders the three stage badges and a verbatim rule substring', () => {
    render(
      <GrazingSystemCapture
        mode="treeProtection"
        value={{}}
        onChange={NOOP}
        itemId={`${GRAZING_PREFIX}-c4`}
      />,
    );
    expect(screen.getByText('EXCLUDED')).toBeTruthy();
    expect(screen.getByText('CONTROLLED')).toBeTruthy();
    expect(screen.getByText('INTEGRATED')).toBeTruthy();
    expect(
      screen.getByText(/Stock-proof fencing around all new plantings/),
    ).toBeTruthy();
  });

  it('typing a per-stage note round-trips positionally', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    const { rerender } = render(
      <GrazingSystemCapture
        mode="treeProtection"
        value={current}
        onChange={onChange}
        itemId={`${GRAZING_PREFIX}-c4`}
      />,
    );
    const notes = screen.getAllByLabelText('Site-specific adjustments');
    fireEvent.change(notes[1]!, { target: { value: 'fence the south block' } });
    rerender(
      <GrazingSystemCapture
        mode="treeProtection"
        value={current}
        onChange={onChange}
        itemId={`${GRAZING_PREFIX}-c4`}
      />,
    );
    const model = decodeGrazing('treeProtection', current) as TreeProtectionModel;
    expect(model.stageNotes[1]).toBe('fence the south block');
  });
});

// ---------------------------------------------------------------------------
// P5 contingency render
// ---------------------------------------------------------------------------

describe('GrazingSystemCapture P5 contingency', () => {
  it('renders all four tier levels', () => {
    render(
      <GrazingSystemCapture
        mode="contingency"
        value={{}}
        onChange={NOOP}
        itemId={`${GRAZING_PREFIX}-c5`}
      />,
    );
    expect(screen.getByText('Normal')).toBeTruthy();
    expect(screen.getByText('Tier 1 -- Alert')).toBeTruthy();
    expect(screen.getByText('Tier 2 -- Restriction')).toBeTruthy();
    expect(screen.getByText('Tier 3 -- Emergency')).toBeTruthy();
  });

  it('typing a tier trigger round-trips positionally', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    const { rerender } = render(
      <GrazingSystemCapture
        mode="contingency"
        value={current}
        onChange={onChange}
        itemId={`${GRAZING_PREFIX}-c5`}
      />,
    );
    const triggers = screen.getAllByLabelText('Trigger');
    fireEvent.change(triggers[0]!, { target: { value: 'dam >= 60%' } });
    rerender(
      <GrazingSystemCapture
        mode="contingency"
        value={current}
        onChange={onChange}
        itemId={`${GRAZING_PREFIX}-c5`}
      />,
    );
    const model = decodeGrazing('contingency', current) as ContingencyModel;
    expect(model.tiers[0]?.trigger).toBe('dam >= 60%');
  });
});

// ---------------------------------------------------------------------------
// P6 stockingDensity render
// ---------------------------------------------------------------------------

describe('GrazingSystemCapture P6 stockingDensity', () => {
  it('renders the reconciliation advisory note and a flock register', () => {
    render(
      <GrazingSystemCapture
        mode="stockingDensity"
        value={{}}
        onChange={NOOP}
        itemId={`${GRAZING_PREFIX}-c6`}
      />,
    );
    expect(
      screen.getByText(/OLOS computes the authoritative stocking-density check/),
    ).toBeTruthy();
    expect(screen.getByText(/Add flock class/)).toBeTruthy();
  });

  it('total designed DSE reflects head x dsePerHead', () => {
    const value = encodeGrazing('stockingDensity', {
      kind: 'stockingDensity',
      flock: [{ id: 'a', label: 'Base flock', head: '100', dsePerHead: '1.0' }],
    });
    render(
      <GrazingSystemCapture
        mode="stockingDensity"
        value={value}
        onChange={NOOP}
        itemId={`${GRAZING_PREFIX}-c6`}
      />,
    );
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
  });
});

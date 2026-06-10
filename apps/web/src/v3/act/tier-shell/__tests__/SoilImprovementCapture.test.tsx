/**
 * @vitest-environment happy-dom
 *
 * SoilImprovementCapture -- contract (mode mapper, decode/encode/valid/
 * summarise) AND the React component + 5 mode bodies (p1..p5). Mirrors
 * HusbandryCapture / LivestockIntentCapture test structure. Logic tests assert
 * decode is total/defensive (empty FormValue -> default model, no throw),
 * encode is a lossless inverse, and validity is advisory (every mode is always
 * recordable -- no covenant gate applies to soil fertility). Render tests
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
  SoilImprovementCapture,
  SOIL_IMPROVEMENT_PREFIX,
  soilImprovementModeFor,
  decodeSoilImprovement,
  encodeSoilImprovement,
  isSoilImprovementValid,
  summariseSoilImprovement,
  type SoilImprovementMode,
} from '../SoilImprovementCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const NOOP = (): void => {};
const P = SOIL_IMPROVEMENT_PREFIX;

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('soilImprovementModeFor', () => {
  it('maps c1..c5 to the five modes', () => {
    const expected: Record<string, SoilImprovementMode> = {
      c1: 'fertility',
      c2: 'schedule',
      c3: 'equipment',
      c4: 'priority',
      c5: 'baseline',
    };
    for (const [suffix, mode] of Object.entries(expected)) {
      expect(soilImprovementModeFor(`${P}-${suffix}`)).toBe(mode);
    }
  });

  it('returns null for unknown suffixes and foreign prefixes', () => {
    expect(soilImprovementModeFor(`${P}-c6`)).toBeNull();
    expect(soilImprovementModeFor(`${P}-x`)).toBeNull();
    expect(soilImprovementModeFor('silv-sec-s4-husbandry-framework-c1')).toBeNull();
    expect(soilImprovementModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode/encode roundtrip + total/defensive decode
// ---------------------------------------------------------------------------

const ALL_MODES: SoilImprovementMode[] = [
  'fertility',
  'schedule',
  'equipment',
  'priority',
  'baseline',
];

describe('decodeSoilImprovement is total and defensive', () => {
  it('empty FormValue yields default models (no fabricated seed data)', () => {
    expect(decodeSoilImprovement('fertility', {})).toEqual({
      kind: 'fertility',
      notes: '',
    });
    expect(decodeSoilImprovement('schedule', {})).toEqual({
      kind: 'schedule',
      notes: '',
    });
    expect(decodeSoilImprovement('equipment', {})).toEqual({
      kind: 'equipment',
      notes: '',
    });
    expect(decodeSoilImprovement('priority', {})).toEqual({
      kind: 'priority',
      notes: '',
    });
    expect(decodeSoilImprovement('baseline', {})).toEqual({
      kind: 'baseline',
      notes: '',
    });
  });

  it('never throws on garbage / mixed-shape values', () => {
    for (const mode of ALL_MODES) {
      expect(() =>
        decodeSoilImprovement(mode, {
          junk: 'x',
          siFertilityNotes: ['array', 'value'] as unknown as string,
          siBaselineNotes: 42 as unknown as string,
        }),
      ).not.toThrow();
    }
  });
});

describe('encodeSoilImprovement is a lossless inverse of decode', () => {
  it('roundtrips every mode', () => {
    const cases: FormValue[] = [
      { siFertilityNotes: 'compost supply secured' },
      { siScheduleNotes: 'costs pending' },
      { siEquipmentNotes: 'subsoiler not yet sourced' },
      { siPriorityNotes: 'labour to confirm' },
      { siBaselineNotes: 'worm count method tbd' },
    ];
    ALL_MODES.forEach((mode, i) => {
      const v = cases[i]!;
      const re = encodeSoilImprovement(mode, decodeSoilImprovement(mode, v));
      const reDecoded = decodeSoilImprovement(mode, re);
      expect(decodeSoilImprovement(mode, v)).toEqual(reDecoded);
    });
  });
});

// ---------------------------------------------------------------------------
// validity (advisory: every mode always recordable)
// ---------------------------------------------------------------------------

describe('isSoilImprovementValid', () => {
  it('every mode is always recordable (advisory, no covenant gate)', () => {
    for (const mode of ALL_MODES) {
      expect(isSoilImprovementValid(mode, {})).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// summaries
// ---------------------------------------------------------------------------

describe('summariseSoilImprovement returns a non-empty string per mode', () => {
  it('every mode summarises to a non-empty string', () => {
    for (const mode of ALL_MODES) {
      const s = summariseSoilImprovement(mode, {});
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// fertility (c1) render
// ---------------------------------------------------------------------------

describe('SoilImprovementCapture fertility (c1)', () => {
  it('renders the five zone programmes and the feeds note', () => {
    render(
      <SoilImprovementCapture
        mode="fertility"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c1`}
      />,
    );
    expect(screen.getByText(/Market garden/)).toBeTruthy();
    expect(screen.getByText(/Food forest under-storey/)).toBeTruthy();
    expect(screen.getByText(/Orchard \/ silvopasture zone/)).toBeTruthy();
    expect(screen.getByText(/Extensive silvopasture/)).toBeTruthy();
    expect(screen.getByText(/Conservation/)).toBeTruthy();
    expect(screen.getByText(/On-site thermophilic compost/)).toBeTruthy();
  });

  it('typing fertility notes emits siFertilityNotes', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <SoilImprovementCapture
        mode="fertility"
        value={current}
        onChange={onChange}
        itemId={`${P}-c1`}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Fertility programme notes/i), {
      target: { value: 'compost from nursery surplus' },
    });
    expect(onChange).toHaveBeenCalled();
    expect(current.siFertilityNotes).toBe('compost from nursery surplus');
  });
});

// ---------------------------------------------------------------------------
// schedule (c2) render
// ---------------------------------------------------------------------------

describe('SoilImprovementCapture schedule (c2)', () => {
  it('renders application rows with rates verbatim', () => {
    render(
      <SoilImprovementCapture
        mode="schedule"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c2`}
      />,
    );
    expect(screen.getByText(/On-site compost \(topdress\)/)).toBeTruthy();
    expect(screen.getByText(/Legume oversowing/)).toBeTruthy();
    expect(screen.getByText(/60 kg\/ha/)).toBeTruthy();
    expect(screen.getByText(/Autumn, pH-triggered/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// equipment (c3) render
// ---------------------------------------------------------------------------

describe('SoilImprovementCapture equipment (c3)', () => {
  it('renders the five equipment rows and status pills', () => {
    render(
      <SoilImprovementCapture
        mode="equipment"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c3`}
      />,
    );
    expect(screen.getByText(/Subsoiler \/ deep ripper/)).toBeTruthy();
    expect(screen.getByText(/Broadfork \/ soil aerator/)).toBeTruthy();
    expect(screen.getByText(/Ute \/ trailer for compost and mulch/)).toBeTruthy();
    expect(screen.getByText('Contract')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// priority (c4) render
// ---------------------------------------------------------------------------

describe('SoilImprovementCapture priority (c4)', () => {
  it('renders the four ranked priority zones and a target line', () => {
    render(
      <SoilImprovementCapture
        mode="priority"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c4`}
      />,
    );
    expect(screen.getByText(/Zone 1 - Market garden \(0.5 ha\)/)).toBeTruthy();
    expect(screen.getByText(/Zone 3 - Orchard pre-plant \(3 ha\)/)).toBeTruthy();
    expect(
      screen.getByText(/Zone 4 North - Native pasture \(12 ha, Fair condition\)/),
    ).toBeTruthy();
    expect(screen.getByText(/non-negotiable/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// baseline (c5) render
// ---------------------------------------------------------------------------

describe('SoilImprovementCapture baseline (c5)', () => {
  it('renders the baseline table indicators, the ref, and the method note', () => {
    render(
      <SoilImprovementCapture
        mode="baseline"
        value={{}}
        onChange={NOOP}
        itemId={`${P}-c5`}
      />,
    );
    expect(screen.getByText(/Organic matter %/)).toBeTruthy();
    expect(screen.getByText(/Soil pH/)).toBeTruthy();
    expect(screen.getByText(/Ground cover %/)).toBeTruthy();
    expect(screen.getByText(/Year 0 data from: soil profile survey \(Tier 2\)/)).toBeTruthy();
    expect(screen.getByText(/spot soil test \(3 composite samples per zone\)/)).toBeTruthy();
  });
});

/**
 * @vitest-environment happy-dom
 *
 * SettlementCapture -- contract (mode mapper, decode/encode/valid/summarise) AND
 * the React component + 6 mode bodies (p1..p6). Mirrors EnergyCapture /
 * WaterSystemsCapture test structure. Logic tests assert decode is
 * total/defensive (empty FormValue -> default model, no throw), encode is a
 * lossless inverse, and validity is advisory (every mode is always recordable --
 * no covenant gate applies; the habitability hard gates are SURFACED as
 * guidance, not enforced as a blocking validity gate). Render tests assert
 * representative verbatim mockup content renders per mode, including the
 * hard-gate warn framing on the threshold (c2) and gates (c6) modes, and that
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
  SettlementCapture,
  SETTLEMENT_PREFIX,
  settlementModeFor,
  decodeSettlement,
  encodeSettlement,
  isSettlementValid,
  summariseSettlement,
  type SettlementMode,
} from '../SettlementCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const NOOP = (): void => {};
const P = SETTLEMENT_PREFIX;

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('settlementModeFor', () => {
  it('maps c1..c6 to the six modes', () => {
    const expected: Record<string, SettlementMode> = {
      c1: 'cohort',
      c2: 'threshold',
      c3: 'sequence',
      c4: 'trial',
      c5: 'capacity',
      c6: 'gates',
    };
    for (const [suffix, mode] of Object.entries(expected)) {
      expect(settlementModeFor(`${P}-${suffix}`)).toBe(mode);
    }
  });

  it('returns null for unknown suffixes and foreign prefixes', () => {
    expect(settlementModeFor(`${P}-c7`)).toBeNull();
    expect(settlementModeFor(`${P}-x`)).toBeNull();
    expect(settlementModeFor('ev-s3-energy-potential-c1')).toBeNull();
    expect(settlementModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode/encode roundtrip + total/defensive decode
// ---------------------------------------------------------------------------

const ALL_MODES: SettlementMode[] = [
  'cohort',
  'threshold',
  'sequence',
  'trial',
  'capacity',
  'gates',
];

describe('decodeSettlement is total and defensive', () => {
  it('empty FormValue yields default models (no fabricated seed data)', () => {
    expect(decodeSettlement('cohort', {})).toEqual({ kind: 'cohort', notes: '' });
    expect(decodeSettlement('threshold', {})).toEqual({ kind: 'threshold', notes: '' });
    expect(decodeSettlement('sequence', {})).toEqual({ kind: 'sequence', notes: '' });
    expect(decodeSettlement('trial', {})).toEqual({ kind: 'trial', notes: '' });
    expect(decodeSettlement('capacity', {})).toEqual({ kind: 'capacity', notes: '' });
    expect(decodeSettlement('gates', {})).toEqual({ kind: 'gates', notes: '' });
  });

  it('never throws on garbage / mixed-shape values', () => {
    for (const mode of ALL_MODES) {
      expect(() =>
        decodeSettlement(mode, {
          junk: 'x',
          stCohortNotes: ['array', 'value'] as unknown as string,
          stGatesNotes: 42 as unknown as string,
        }),
      ).not.toThrow();
    }
  });
});

describe('encodeSettlement is a lossless inverse of decode', () => {
  it('roundtrips every mode', () => {
    const cases: FormValue[] = [
      { stCohortNotes: 'two founding households' },
      { stThresholdNotes: 'water + shelter hard gates' },
      { stSequenceNotes: 'milestone-gated, not calendar' },
      { stTrialNotes: '12-month provisional lease' },
      { stCapacityNotes: 'land is the limiting factor' },
      { stGatesNotes: 'phase 2 blocked, 4 unmet' },
    ];
    ALL_MODES.forEach((mode, i) => {
      const v = cases[i]!;
      const re = encodeSettlement(mode, decodeSettlement(mode, v));
      const reDecoded = decodeSettlement(mode, re);
      expect(decodeSettlement(mode, v)).toEqual(reDecoded);
    });
  });
});

// ---------------------------------------------------------------------------
// validity (advisory: every mode always recordable)
// ---------------------------------------------------------------------------

describe('isSettlementValid', () => {
  it('every mode is always recordable (advisory; hard gates are guidance, not a blocking validity gate)', () => {
    for (const mode of ALL_MODES) {
      expect(isSettlementValid(mode, {})).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// summaries
// ---------------------------------------------------------------------------

describe('summariseSettlement returns a non-empty string per mode', () => {
  it('every mode summarises to a non-empty string', () => {
    for (const mode of ALL_MODES) {
      const s = summariseSettlement(mode, {});
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// cohort (c1) render
// ---------------------------------------------------------------------------

describe('SettlementCapture cohort (c1)', () => {
  it('renders the three cohort cards and founding-member detail verbatim', () => {
    render(<SettlementCapture mode="cohort" value={{}} onChange={NOOP} itemId={`${P}-c1`} />);
    expect(screen.getByText('Phase 1 - Founding cohort')).toBeTruthy();
    expect(screen.getByText('Phase 2 - Second cohort')).toBeTruthy();
    expect(screen.getByText('Phase 3 - Open membership')).toBeTruthy();
    expect(screen.getByText('Founding members')).toBeTruthy();
    expect(screen.getByText('Sarah Mitchell')).toBeTruthy();
    expect(
      screen.getByText(/SM and MD move in first - legal entity registered/),
    ).toBeTruthy();
  });

  it('typing cohort notes emits stCohortNotes', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <SettlementCapture mode="cohort" value={current} onChange={onChange} itemId={`${P}-c1`} />,
    );
    fireEvent.change(screen.getByLabelText(/Cohort plan notes/i), {
      target: { value: 'two households Phase 1' },
    });
    expect(onChange).toHaveBeenCalled();
    expect(current.stCohortNotes).toBe('two households Phase 1');
  });
});

// ---------------------------------------------------------------------------
// threshold (c2) render -- includes the habitability hard-gate framing
// ---------------------------------------------------------------------------

describe('SettlementCapture threshold (c2)', () => {
  it('renders the hard-gate warning and per-phase thresholds verbatim', () => {
    render(<SettlementCapture mode="threshold" value={{}} onChange={NOOP} itemId={`${P}-c2`} />);
    expect(
      screen.getByText(/These are hard gates\. A cohort does not move in/),
    ).toBeTruthy();
    expect(screen.getByText('Phase 1 - 2 households')).toBeTruthy();
    expect(screen.getByText('Phase 2 - +2 households')).toBeTruthy();
    expect(screen.getByText('Must be complete before SM & MD arrive')).toBeTruthy();
    expect(
      screen.getByText(
        /Potable water system operational with iron filtration - spring yield confirmed >= Phase 1 demand/,
      ),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// sequence (c3) render
// ---------------------------------------------------------------------------

describe('SettlementCapture sequence (c3)', () => {
  it('renders the phase milestones and connectors verbatim', () => {
    render(<SettlementCapture mode="sequence" value={{}} onChange={NOOP} itemId={`${P}-c3`} />);
    expect(screen.getByText('Legal & infrastructure establishment')).toBeTruthy();
    expect(screen.getByText('Months 1-8 (est.)')).toBeTruthy();
    expect(
      screen.getByText('Legal entity registered - CLT or co-op structure confirmed'),
    ).toBeTruthy();
    expect(screen.getByText('Phase 1 thresholds passed -> cohort 1 arrives')).toBeTruthy();
    expect(screen.getByText('Phase 2 thresholds passed -> cohort 2 arrives')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// trial (c4) render
// ---------------------------------------------------------------------------

describe('SettlementCapture trial (c4)', () => {
  it('renders the trial terms, criteria, and outcomes verbatim', () => {
    render(<SettlementCapture mode="trial" value={{}} onChange={NOOP} itemId={`${P}-c4`} />);
    expect(screen.getByText('12 months')).toBeTruthy();
    expect(screen.getByText('Provisional lease only')).toBeTruthy();
    expect(screen.getByText('Reduced contribution (50%)')).toBeTruthy();
    expect(screen.getByText('Advisory voice, no vote')).toBeTruthy();
    expect(
      screen.getByText('Active participation in shared work rotas and communal maintenance'),
    ).toBeTruthy();
    expect(screen.getByText('Pass -> Full membership')).toBeTruthy();
    expect(screen.getByText('Decline -> Exit process')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// capacity (c5) render
// ---------------------------------------------------------------------------

describe('SettlementCapture capacity (c5)', () => {
  it('renders the limiting-resource cards and the capacity summary verbatim', () => {
    render(<SettlementCapture mode="capacity" value={{}} onChange={NOOP} itemId={`${P}-c5`} />);
    expect(screen.getByText('Water - spring yield')).toBeTruthy();
    expect(screen.getByText('Adequate for 4 households')).toBeTruthy();
    expect(screen.getByText('~31 people')).toBeTruthy();
    expect(screen.getByText('Land - productive area')).toBeTruthy();
    expect(screen.getByText('Limiting at > 6 households')).toBeTruthy();
    expect(screen.getByText('Modified consensus')).toBeTruthy();
    expect(screen.getByText('Max households')).toBeTruthy();
    expect(screen.getByText('~14')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// gates (c6) render -- includes the go/no-go hard-gate framing
// ---------------------------------------------------------------------------

describe('SettlementCapture gates (c6)', () => {
  it('renders the hard-gate warning and per-phase go/no-go criteria verbatim', () => {
    render(<SettlementCapture mode="gates" value={{}} onChange={NOOP} itemId={`${P}-c6`} />);
    expect(
      screen.getByText(/These are hard gates, not aspirational targets/),
    ).toBeTruthy();
    expect(screen.getByText('Phase 1 gate - Founding cohort arrival')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();
    expect(screen.getByText('Blocked - 4 criteria unmet')).toBeTruthy();
    expect(screen.getByText('Not yet active')).toBeTruthy();
    expect(
      screen.getByText('Community vote approving Phase 3 opening - supermajority required'),
    ).toBeTruthy();
  });
});

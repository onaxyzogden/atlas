/**
 * @vitest-environment happy-dom
 *
 * HusbandryCapture -- contract (mode mapper, decode/encode/valid/summarise) AND
 * the React component + 6 mode bodies (p1..p6). Mirrors LivestockIntentCapture /
 * CarryingCapacityCapture test structure. Logic tests assert decode is
 * total/defensive (empty FormValue -> default model, no throw), encode is a
 * lossless inverse, and validity gates behave per spec (halal is the ONLY
 * gating mode; the other five are always recordable). Render tests assert the
 * doctrinal halal copy renders, the on-farm pathway renders, the Amanah
 * deferral note renders, and the omitted commercial-abattoir pathway is ABSENT.
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
  HusbandryCapture,
  HUSBANDRY_PREFIX,
  husbandryModeFor,
  decodeHusbandry,
  encodeHusbandry,
  isHusbandryValid,
  summariseHusbandry,
  type HusbandryMode,
} from '../HusbandryCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const NOOP = (): void => {};
const P = HUSBANDRY_PREFIX;

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('husbandryModeFor', () => {
  it('maps c1..c6 to the six modes', () => {
    const expected: Record<string, HusbandryMode> = {
      c1: 'health',
      c2: 'breeding',
      c3: 'welfare',
      c4: 'halal',
      c5: 'records',
      c6: 'labour',
    };
    for (const [suffix, mode] of Object.entries(expected)) {
      expect(husbandryModeFor(`${P}-${suffix}`)).toBe(mode);
    }
  });

  it('returns null for unknown suffixes and foreign prefixes', () => {
    expect(husbandryModeFor(`${P}-c7`)).toBeNull();
    expect(husbandryModeFor(`${P}-x`)).toBeNull();
    expect(husbandryModeFor('silv-sec-s1-livestock-intent-c1')).toBeNull();
    expect(husbandryModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode/encode roundtrip + total/defensive decode
// ---------------------------------------------------------------------------

const ALL_MODES: HusbandryMode[] = [
  'health',
  'breeding',
  'welfare',
  'halal',
  'records',
  'labour',
];

describe('decodeHusbandry is total and defensive', () => {
  it('empty FormValue yields default models (no fabricated seed data)', () => {
    expect(decodeHusbandry('health', {})).toEqual({
      kind: 'health',
      vetNotes: '',
    });
    expect(decodeHusbandry('breeding', {})).toEqual({
      kind: 'breeding',
      strategy: null,
      notes: '',
    });
    expect(decodeHusbandry('welfare', {})).toEqual({
      kind: 'welfare',
      notes: '',
    });
    expect(decodeHusbandry('halal', {})).toEqual({
      kind: 'halal',
      pathwayAcknowledged: false,
      notes: '',
    });
    expect(decodeHusbandry('records', {})).toEqual({
      kind: 'records',
      notes: '',
    });
    expect(decodeHusbandry('labour', {})).toEqual({
      kind: 'labour',
      confirmed: false,
      notes: '',
    });
  });

  it('never throws on garbage / mixed-shape values', () => {
    for (const mode of ALL_MODES) {
      expect(() =>
        decodeHusbandry(mode, {
          junk: 'x',
          hbStrategy: ['array', 'value'],
          hbVetNotes: 42 as unknown as string,
        }),
      ).not.toThrow();
    }
  });

  it('ignores an out-of-set breeding strategy', () => {
    expect(decodeHusbandry('breeding', { hbStrategy: 'ai' })).toEqual({
      kind: 'breeding',
      strategy: null,
      notes: '',
    });
    expect(decodeHusbandry('breeding', { hbStrategy: 'nonsense' })).toEqual({
      kind: 'breeding',
      strategy: null,
      notes: '',
    });
    expect(decodeHusbandry('breeding', { hbStrategy: 'autumn' })).toEqual({
      kind: 'breeding',
      strategy: 'autumn',
      notes: '',
    });
  });
});

describe('encodeHusbandry is a lossless inverse of decode', () => {
  it('roundtrips every mode', () => {
    const cases: FormValue[] = [
      { hbVetNotes: 'call the vet' },
      { hbStrategy: 'spring', hbBreedingNotes: 'ram selection pending' },
      { hbWelfareNotes: 'reviewed' },
      { hbPathwayAck: 'yes', hbHalalNotes: 'household trained' },
      { hbRecordsNotes: 'PIC pending' },
      { hbLabourConfirmed: 'yes', hbLabourNotes: 'shearing booked' },
    ];
    ALL_MODES.forEach((mode, i) => {
      const v = cases[i]!;
      const re = encodeHusbandry(mode, decodeHusbandry(mode, v));
      const reDecoded = decodeHusbandry(mode, re);
      expect(decodeHusbandry(mode, v)).toEqual(reDecoded);
    });
  });
});

// ---------------------------------------------------------------------------
// validity (halal is the ONLY gating mode)
// ---------------------------------------------------------------------------

describe('isHusbandryValid', () => {
  it('halal is invalid until pathwayAcknowledged === true', () => {
    expect(isHusbandryValid('halal', {})).toBe(false);
    expect(isHusbandryValid('halal', { hbPathwayAck: '' })).toBe(false);
    expect(isHusbandryValid('halal', { hbPathwayAck: 'yes' })).toBe(true);
  });

  it('the other five modes are always recordable (advisory)', () => {
    for (const mode of ['health', 'breeding', 'welfare', 'records', 'labour'] as HusbandryMode[]) {
      expect(isHusbandryValid(mode, {})).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// summaries
// ---------------------------------------------------------------------------

describe('summariseHusbandry returns a non-empty string per mode', () => {
  it('every mode summarises to a non-empty string', () => {
    for (const mode of ALL_MODES) {
      const s = summariseHusbandry(mode, {});
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it('breeding reflects the selected strategy', () => {
    expect(summariseHusbandry('breeding', { hbStrategy: 'autumn' })).toMatch(
      /Autumn/i,
    );
    expect(summariseHusbandry('breeding', {})).toMatch(/not selected|no strategy/i);
  });

  it('halal reflects the acknowledgement', () => {
    expect(summariseHusbandry('halal', { hbPathwayAck: 'yes' })).toMatch(
      /acknowledged|on-farm/i,
    );
    expect(summariseHusbandry('halal', {})).toMatch(/not.*acknowledged|pending/i);
  });
});

// ---------------------------------------------------------------------------
// health (c1) render
// ---------------------------------------------------------------------------

describe('HusbandryCapture health (c1)', () => {
  it('renders the two health sections, vet card, and inbound ref', () => {
    render(
      <HusbandryCapture mode="health" value={{}} onChange={NOOP} itemId={`${P}-c1`} />,
    );
    expect(screen.getByText(/Vaccination -- Merino ewes/)).toBeTruthy();
    expect(screen.getByText(/Internal parasite management/)).toBeTruthy();
    expect(screen.getByText(/Veterinary relationship/)).toBeTruthy();
    expect(screen.getByText(/OJD risk-zone classification/)).toBeTruthy();
  });

  it('typing vet notes emits hbVetNotes', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <HusbandryCapture
        mode="health"
        value={current}
        onChange={onChange}
        itemId={`${P}-c1`}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Veterinary notes/i), {
      target: { value: 'book annual visit' },
    });
    expect(onChange).toHaveBeenCalled();
    expect(current.hbVetNotes).toBe('book annual visit');
  });
});

// ---------------------------------------------------------------------------
// breeding (c2) render
// ---------------------------------------------------------------------------

describe('HusbandryCapture breeding (c2)', () => {
  it('renders the three breeding choices and the calendar peak note', () => {
    render(
      <HusbandryCapture mode="breeding" value={{}} onChange={NOOP} itemId={`${P}-c2`} />,
    );
    expect(screen.getByText(/Autumn joining/)).toBeTruthy();
    expect(screen.getByText(/Spring joining/)).toBeTruthy();
    expect(screen.getByText(/AI \/ ET program/)).toBeTruthy();
    expect(screen.getByText(/Labour peak -- August to November/)).toBeTruthy();
  });

  it('selecting Autumn emits hbStrategy = autumn', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <HusbandryCapture
        mode="breeding"
        value={current}
        onChange={onChange}
        itemId={`${P}-c2`}
      />,
    );
    fireEvent.click(screen.getByText(/Autumn joining/));
    expect(current.hbStrategy).toBe('autumn');
  });
});

// ---------------------------------------------------------------------------
// welfare (c3) render -- the ihsan note renders verbatim
// ---------------------------------------------------------------------------

describe('HusbandryCapture welfare (c3)', () => {
  it('renders the five welfare domains and the ihsan note', () => {
    render(
      <HusbandryCapture mode="welfare" value={{}} onChange={NOOP} itemId={`${P}-c3`} />,
    );
    expect(screen.getByText(/Sahih Muslim 1955/)).toBeTruthy();
    expect(screen.getByText(/Allah has prescribed ihsan/)).toBeTruthy();
    expect(screen.getByText(/condition score >= 2.5/)).toBeTruthy();
    expect(screen.getByText(/above 30C/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// halal (c4) render -- the gating mode + omitted commercial pathway
// ---------------------------------------------------------------------------

describe('HusbandryCapture halal (c4)', () => {
  it('renders the declaration, six requirements, on-farm pathway, and Amanah deferral', () => {
    render(
      <HusbandryCapture mode="halal" value={{}} onChange={NOOP} itemId={`${P}-c4`} />,
    );
    expect(screen.getByText(/niyyah \(intention\) of halal stewardship/)).toBeTruthy();
    expect(
      screen.getByText(/must be alive, healthy, and free from visible disease/),
    ).toBeTruthy();
    expect(
      screen.getByText(/severing the trachea, oesophagus/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Full, complete blood drainage/),
    ).toBeTruthy();
    expect(screen.getByText(/On-farm traditional halal slaughter/)).toBeTruthy();
    expect(screen.getByText(/Commercial-abattoir pathway deferred/)).toBeTruthy();
    expect(screen.getByText(/Welfare and halal are not in tension/)).toBeTruthy();
  });

  it('renders the covenant deltas: Tasmiyah (A) and the pig-output exclusion (B)', () => {
    // Operator-approved copy-review deltas (2026-06-10). Delta A: Tasmiyah is an
    // explicit dhakah requirement. Delta B: the slaughter/meat OUTPUT pathway is
    // explicitly closed to working animals (pigs/khinzir) kept for non-food roles.
    render(
      <HusbandryCapture mode="halal" value={{}} onChange={NOOP} itemId={`${P}-c4`} />,
    );
    expect(
      screen.getByText(/Tasmiyah - the name of Allah is pronounced/),
    ).toBeTruthy();
    expect(screen.getByText(/pigs \(khinzir\)/)).toBeTruthy();
    expect(
      screen.getByText(/categorically excluded from the slaughter-for-consumption pathway/),
    ).toBeTruthy();
  });

  it('the omitted certified-abattoir / commercial-sale pathway button is ABSENT', () => {
    render(
      <HusbandryCapture mode="halal" value={{}} onChange={NOOP} itemId={`${P}-c4`} />,
    );
    // The omitted pathway BUTTON had a unique title + description. Those exact
    // strings must NOT appear (the Amanah deferral note paraphrases the concept
    // but never reproduces the button copy). AQIS appears only in the button
    // description, so it is the cleanest sentinel for the omitted control.
    expect(
      screen.queryByText(/Certified halal abattoir -- commercial sale/i),
    ).toBeNull();
    expect(screen.queryByText(/If selling halal-certified meat commercially/i)).toBeNull();
    expect(screen.queryByText(/AQIS/i)).toBeNull();
    // Exactly one slaughter-pathway control is offered (the on-farm checkbox).
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('acknowledging the pathway emits hbPathwayAck = yes', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    render(
      <HusbandryCapture
        mode="halal"
        value={current}
        onChange={onChange}
        itemId={`${P}-c4`}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalled();
    expect(current.hbPathwayAck).toBe('yes');
  });
});

// ---------------------------------------------------------------------------
// records (c5) render
// ---------------------------------------------------------------------------

describe('HusbandryCapture records (c5)', () => {
  it('renders the NLIS note, the four record rows, and the zakat nisab line', () => {
    render(
      <HusbandryCapture mode="records" value={{}} onChange={NOOP} itemId={`${P}-c5`} />,
    );
    expect(screen.getByText(/Stock register/)).toBeTruthy();
    expect(screen.getByText(/Health event log/)).toBeTruthy();
    expect(screen.getByText(/Halal slaughter records/)).toBeTruthy();
    expect(screen.getByText(/Zakat records/)).toBeTruthy();
    expect(screen.getByText(/NLIS mob tag/)).toBeTruthy();
    expect(
      screen.getByText(/Nisab threshold for sheep: 40 sheep/),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// labour (c6) render
// ---------------------------------------------------------------------------

describe('HusbandryCapture labour (c6)', () => {
  it('renders the four labour periods and the two fit-result boxes', () => {
    render(
      <HusbandryCapture mode="labour" value={{}} onChange={NOOP} itemId={`${P}-c6`} />,
    );
    expect(screen.getByText(/Light Jan-Mar/)).toBeTruthy();
    expect(screen.getByText(/PEAK Aug-Nov/)).toBeTruthy();
    expect(screen.getByText(/Moderate Dec/)).toBeTruthy();
    expect(screen.getByText(/Annual average -- manageable/)).toBeTruthy();
    expect(
      screen.getByText(/August-November peak -- plan additional support/),
    ).toBeTruthy();
  });
});

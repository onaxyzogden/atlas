/**
 * @vitest-environment happy-dom
 *
 * PropagationInfraCapture -- contract (mode mapper, decode/encode/valid/
 * summarise, compost calculator) AND the React component + 5 mode bodies
 * (P1..P5). Mirrors BiosecurityCapture and CarryingCapacityCapture test
 * structure. Logic tests assert decode is total/defensive (empty FormValue ->
 * empty model, no fabricated selections), encode is a lossless inverse, the
 * compost calculator preserves a legitimate 0, and the c4 calculator is always
 * recordable while c1/c2/c3/c5 gate on at least one entry. Render tests assert
 * each body's distinctive canonical text appears.
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
  PropagationInfraCapture,
  PROPAGATION_INFRA_PREFIX,
  propagationInfraModeFor,
  decodePropagationInfra,
  encodePropagationInfra,
  isPropagationInfraValid,
  summarisePropagationInfra,
  computeCompost,
  ONSITE_MEDIA,
  SOURCE_COMPONENTS,
  type PropagationInfraMode,
  type InfraInventoryModel,
  type ConditionModel,
  type MediaInputsModel,
  type CompostCapacityModel,
  type MediaSourcingModel,
} from '../PropagationInfraCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const NOOP = (): void => {};

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('propagationInfraModeFor', () => {
  it('maps c1..c5 to the five modes', () => {
    const expected: Record<string, PropagationInfraMode> = {
      c1: 'infraInventory',
      c2: 'condition',
      c3: 'mediaInputs',
      c4: 'compostCapacity',
      c5: 'mediaSourcing',
    };
    for (const [suffix, mode] of Object.entries(expected)) {
      expect(
        propagationInfraModeFor(`${PROPAGATION_INFRA_PREFIX}-${suffix}`),
      ).toBe(mode);
    }
  });

  it('returns null for an out-of-range suffix (c6)', () => {
    expect(
      propagationInfraModeFor(`${PROPAGATION_INFRA_PREFIX}-c6`),
    ).toBeNull();
  });

  it('returns null for a foreign prefix', () => {
    expect(
      propagationInfraModeFor('nur-sec-s2-biosecurity-survey-c1'),
    ).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(propagationInfraModeFor('')).toBeNull();
  });

  it('returns null for the bare prefix without a -cN suffix', () => {
    expect(propagationInfraModeFor(PROPAGATION_INFRA_PREFIX)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode -- defensive / no fabrication
// ---------------------------------------------------------------------------

describe('decodePropagationInfra -- defensive / no fabrication', () => {
  it('decodes an empty FormValue to an empty model per mode (no fabrication)', () => {
    const infra = decodePropagationInfra('infraInventory', {}) as InfraInventoryModel;
    expect(infra.structures).toEqual([]);

    const cond = decodePropagationInfra('condition', {}) as ConditionModel;
    expect(cond.rows).toEqual([]);

    const media = decodePropagationInfra('mediaInputs', {}) as MediaInputsModel;
    expect(media.present).toEqual([]);
    expect(media.volumes.length).toBe(ONSITE_MEDIA.length);
    expect(media.volumes.every((v) => v === '')).toBe(true);

    const compost = decodePropagationInfra('compostCapacity', {}) as CompostCapacityModel;
    expect(compost.bays).toBe('');
    expect(compost.volPerBay).toBe('');
    expect(compost.weeks).toBe('');
    expect(compost.feedstock).toEqual([]);

    const sourcing = decodePropagationInfra('mediaSourcing', {}) as MediaSourcingModel;
    expect(sourcing.availability.length).toBe(SOURCE_COMPONENTS.length);
    expect(sourcing.availability.every((a) => a === '')).toBe(true);
  });

  it('drops a structure type / availability state outside the allowed set', () => {
    const infra = decodePropagationInfra('infraInventory', {
      piStructTypes: ['Wormfarm'],
      piStructNames: ['X'],
      piStructAreas: ['10'],
      piStructYears: ['2000'],
    }) as InfraInventoryModel;
    expect(infra.structures[0]!.type).toBe('');
    expect(infra.structures[0]!.name).toBe('X');

    const sourcing = decodePropagationInfra('mediaSourcing', {
      piAvailability: ['z', 's'],
    }) as MediaSourcingModel;
    expect(sourcing.availability[0]).toBe('');
    expect(sourcing.availability[1]).toBe('s');
  });
});

// ---------------------------------------------------------------------------
// decode / encode roundtrip
// ---------------------------------------------------------------------------

describe('encode(decode(v)) preserves set fields', () => {
  const cases: Array<[PropagationInfraMode, FormValue]> = [
    [
      'infraInventory',
      {
        piStructTypes: ['Glasshouse', 'Shade house'],
        piStructNames: ['Main', 'North'],
        piStructAreas: ['48', '0'],
        piStructYears: ['2005', ''],
      },
    ],
    [
      'condition',
      {
        piCondNames: ['Main glasshouse', 'Old frame'],
        piCondRatings: ['Good', 'Poor'],
        piCondUsable: ['36', '0'],
        piCondNotes: ['ok', ''],
      },
    ],
    [
      'mediaInputs',
      {
        piMediaPresent: ['Compost (in active production)', 'Leaf mould'],
        piMediaVolumes: ['12', '', '4', '', '', '', ''],
      },
    ],
    [
      'compostCapacity',
      {
        piBays: '4',
        piVolPerBay: '1.4',
        piWeeks: '8',
        piFeedstock: ['Garden waste', 'Collected leaves'],
      },
    ],
    ['mediaSourcing', { piAvailability: ['s', 'o', 's', 'o', 's', 'a'] }],
  ];

  for (const [mode, value] of cases) {
    it(`roundtrips ${mode}`, () => {
      const model = decodePropagationInfra(mode, value);
      const encoded = encodePropagationInfra(mode, model);
      const redecoded = decodePropagationInfra(mode, encoded);
      expect(redecoded).toEqual(model);
    });
  }

  it('preserves a literal "0" numeric string (does not coerce to fallback)', () => {
    const model = decodePropagationInfra('compostCapacity', {
      piBays: '0',
      piVolPerBay: '0',
      piWeeks: '0',
    }) as CompostCapacityModel;
    expect(model.bays).toBe('0');
    expect(model.volPerBay).toBe('0');
    expect(model.weeks).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// compost calculator
// ---------------------------------------------------------------------------

describe('computeCompost', () => {
  it('applies the mockup defaults when fields are empty', () => {
    const r = computeCompost({
      kind: 'compostCapacity',
      bays: '',
      volPerBay: '',
      weeks: '',
      feedstock: [],
    });
    // 3 bays x 1.4 m3 x floor(52/8)=6 turnovers = 25.2
    expect(r.bays).toBe(3);
    expect(r.volPerBay).toBe(1.4);
    expect(r.weeks).toBe(8);
    expect(r.turnovers).toBe(6);
    expect(r.annual).toBeCloseTo(25.2, 5);
    expect(r.tone).toBe('pass');
  });

  it('flags insufficient capacity below the ~20 m3/yr need', () => {
    const r = computeCompost({
      kind: 'compostCapacity',
      bays: '1',
      volPerBay: '1',
      weeks: '52',
      feedstock: [],
    });
    // 1 x 1 x floor(52/52)=1 = 1 m3/yr -> insufficient
    expect(r.annual).toBeCloseTo(1, 5);
    expect(r.tone).toBe('warn');
  });

  it('preserves a legitimate 0 (0 bays -> 0 m3/yr, not the fallback 3)', () => {
    const r = computeCompost({
      kind: 'compostCapacity',
      bays: '0',
      volPerBay: '1.4',
      weeks: '8',
      feedstock: [],
    });
    expect(r.bays).toBe(0);
    expect(r.annual).toBe(0);
    expect(r.tone).toBe('warn');
  });

  it('does not leak NaN/Infinity on non-finite weeks (falls back to default)', () => {
    const r = computeCompost({
      kind: 'compostCapacity',
      bays: '3',
      volPerBay: '1.4',
      weeks: 'abc',
      feedstock: [],
    });
    expect(Number.isFinite(r.annual)).toBe(true);
    expect(Number.isFinite(r.turnovers)).toBe(true);
  });

  it('guards against division when weeks is 0 (turnovers and annual are 0)', () => {
    const r = computeCompost({
      kind: 'compostCapacity',
      bays: '3',
      volPerBay: '1.4',
      weeks: '0',
      feedstock: [],
    });
    expect(r.turnovers).toBe(0);
    expect(r.annual).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// validity gates
// ---------------------------------------------------------------------------

describe('isPropagationInfraValid', () => {
  it('compostCapacity is always valid (calculator always yields output)', () => {
    expect(isPropagationInfraValid('compostCapacity', {})).toBe(true);
  });

  it('infraInventory requires at least one structure row', () => {
    expect(isPropagationInfraValid('infraInventory', {})).toBe(false);
    expect(
      isPropagationInfraValid('infraInventory', {
        piStructTypes: ['Glasshouse'],
      }),
    ).toBe(true);
  });

  it('condition requires at least one rated structure', () => {
    expect(isPropagationInfraValid('condition', {})).toBe(false);
    expect(
      isPropagationInfraValid('condition', {
        piCondNames: ['X'],
        piCondRatings: [''],
      }),
    ).toBe(false);
    expect(
      isPropagationInfraValid('condition', {
        piCondNames: ['X'],
        piCondRatings: ['Good'],
      }),
    ).toBe(true);
  });

  it('mediaInputs requires at least one present medium', () => {
    expect(isPropagationInfraValid('mediaInputs', {})).toBe(false);
    expect(
      isPropagationInfraValid('mediaInputs', {
        piMediaPresent: ['Leaf mould'],
      }),
    ).toBe(true);
  });

  it('mediaSourcing requires at least one set availability state', () => {
    expect(isPropagationInfraValid('mediaSourcing', {})).toBe(false);
    expect(
      isPropagationInfraValid('mediaSourcing', { piAvailability: ['s'] }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// summaries (defensive; never throw)
// ---------------------------------------------------------------------------

describe('summarisePropagationInfra', () => {
  it('does not throw on empty values and returns a string per mode', () => {
    const modes: PropagationInfraMode[] = [
      'infraInventory',
      'condition',
      'mediaInputs',
      'compostCapacity',
      'mediaSourcing',
    ];
    for (const mode of modes) {
      expect(() => summarisePropagationInfra(mode, {})).not.toThrow();
      expect(typeof summarisePropagationInfra(mode, {})).toBe('string');
    }
  });

  it('compostCapacity reports the calculated annual production', () => {
    const s = summarisePropagationInfra('compostCapacity', {});
    expect(s).toMatch(/25\.2 m3\/year/);
  });

  it('mediaSourcing counts set components out of the total', () => {
    const s = summarisePropagationInfra('mediaSourcing', {
      piAvailability: ['s', '', 'o'],
    });
    expect(s).toMatch(new RegExp(`2 of ${SOURCE_COMPONENTS.length}`));
  });
});

// ---------------------------------------------------------------------------
// Render -- distinctive verbatim strings per mode
// ---------------------------------------------------------------------------

describe('PropagationInfraCapture render', () => {
  function renderMode(mode: PropagationInfraMode, value: FormValue = {}) {
    return render(
      <PropagationInfraCapture
        mode={mode}
        value={value}
        onChange={NOOP}
        itemId={`${PROPAGATION_INFRA_PREFIX}-c1`}
      />,
    );
  }

  it('infraInventory renders the structure-register summary strip', () => {
    renderMode('infraInventory');
    expect(screen.getByTestId('pi-infra-summary')).toBeTruthy();
    expect(screen.getByText('Structures')).toBeTruthy();
  });

  it('condition renders the four condition ratings and capacity summary', () => {
    renderMode('condition', {
      piCondNames: ['Main'],
      piCondRatings: ['Good'],
      piCondUsable: ['36'],
      piCondNotes: [''],
    });
    expect(screen.getByText('Capacity summary')).toBeTruthy();
    expect(screen.getByText('Structures needing attention')).toBeTruthy();
  });

  it('mediaInputs renders the on-site media checklist labels', () => {
    renderMode('mediaInputs');
    expect(screen.getByText('Compost (in active production)')).toBeTruthy();
    expect(screen.getByText('Woodchip / wood fibre')).toBeTruthy();
    expect(screen.getByText('Worm castings')).toBeTruthy();
  });

  it('compostCapacity renders the live formula and annual production figure', () => {
    renderMode('compostCapacity');
    expect(screen.getByText('Annual compost production')).toBeTruthy();
    expect(
      screen.getByTestId('pi-comp-formula').textContent ?? '',
    ).toContain('3 bays x 1.4 m3 x 6 turnovers/yr');
  });

  it('mediaSourcing renders the verbatim component names and cost references', () => {
    renderMode('mediaSourcing');
    expect(screen.getByText('Perlite')).toBeTruthy();
    expect(screen.getByText('Coir (coconut fibre)')).toBeTruthy();
    expect(screen.getByText('Biochar (external)')).toBeTruthy();
    expect(screen.getByText('~$320/m3')).toBeTruthy();
    expect(screen.getByText('Low / free')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Interaction -- adding a media medium flips validity
// ---------------------------------------------------------------------------

describe('mediaInputs interaction flips validity', () => {
  it('becomes valid once a medium is checked', () => {
    let value: FormValue = {};
    const handle = (next: FormValue): void => {
      value = next;
    };
    const { rerender } = render(
      <PropagationInfraCapture
        mode="mediaInputs"
        value={value}
        onChange={handle}
        itemId={`${PROPAGATION_INFRA_PREFIX}-c3`}
      />,
    );

    expect(isPropagationInfraValid('mediaInputs', value)).toBe(false);

    fireEvent.click(screen.getByLabelText('Leaf mould'));
    rerender(
      <PropagationInfraCapture
        mode="mediaInputs"
        value={value}
        onChange={handle}
        itemId={`${PROPAGATION_INFRA_PREFIX}-c3`}
      />,
    );
    expect(isPropagationInfraValid('mediaInputs', value)).toBe(true);
  });
});

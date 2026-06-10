/**
 * @vitest-environment happy-dom
 *
 * BiosecurityCapture -- contract (mode mapper, decode/encode/valid/summarise)
 * AND the React component + 5 mode bodies (P1..P5). Mirrors GrazingSystemCapture
 * and CarryingCapacityCapture test structure. Logic tests assert decode is
 * total/defensive (empty FormValue -> empty model, no fabricated selections),
 * encode is a lossless inverse, and the sanitation gate behaves per spec. Render
 * tests assert each body's distinctive canonical text appears.
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
  BiosecurityCapture,
  BIOSECURITY_PREFIX,
  biosecurityModeFor,
  decodeBiosecurity,
  encodeBiosecurity,
  isBiosecurityValid,
  summariseBiosecurity,
  type BiosecurityMode,
  type SoilDiseaseModel,
  type InsectPestModel,
  type WeedMediaModel,
  type IngressModel,
  type SanitationModel,
} from '../BiosecurityCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const NOOP = (): void => {};

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('biosecurityModeFor', () => {
  it('maps c1..c5 to the five modes', () => {
    const expected: Record<string, BiosecurityMode> = {
      c1: 'soilDisease',
      c2: 'insectPest',
      c3: 'weedMedia',
      c4: 'ingress',
      c5: 'sanitation',
    };
    for (const [suffix, mode] of Object.entries(expected)) {
      expect(biosecurityModeFor(`${BIOSECURITY_PREFIX}-${suffix}`)).toBe(mode);
    }
  });

  it('returns null for an out-of-range suffix (c6)', () => {
    expect(biosecurityModeFor(`${BIOSECURITY_PREFIX}-c6`)).toBeNull();
  });

  it('returns null for a foreign prefix', () => {
    expect(biosecurityModeFor('silv-sec-s4-grazing-design-c1')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(biosecurityModeFor('')).toBeNull();
  });

  it('returns null for the bare prefix without a -cN suffix', () => {
    expect(biosecurityModeFor(BIOSECURITY_PREFIX)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode / encode roundtrip
// ---------------------------------------------------------------------------

describe('decodeBiosecurity -- defensive / no fabrication', () => {
  it('decodes an empty FormValue to an empty model per mode (no fabrication)', () => {
    const soil = decodeBiosecurity('soilDisease', {}) as SoilDiseaseModel;
    expect(soil.drainage).toBe('');
    expect(soil.priorHort).toBe('');
    expect(soil.knownPhytophthora).toBe('');
    expect(soil.ratings.every((r) => r === '')).toBe(true);

    const pest = decodeBiosecurity('insectPest', {}) as InsectPestModel;
    expect(pest.environment).toBe('');
    expect(pest.ratings.every((r) => r === '')).toBe(true);

    const weed = decodeBiosecurity('weedMedia', {}) as WeedMediaModel;
    expect(weed.ratings.every((r) => r === '')).toBe(true);

    const ingress = decodeBiosecurity('ingress', {}) as IngressModel;
    expect(ingress.ratings.every((r) => r === '')).toBe(true);

    const san = decodeBiosecurity('sanitation', {}) as SanitationModel;
    expect(san.entry).toBe('');
    expect(san.tools).toBe('');
    expect(san.container).toBe('');
  });
});

describe('encode(decode(v)) preserves set fields', () => {
  const cases: Array<[BiosecurityMode, FormValue]> = [
    [
      'soilDisease',
      {
        bsDrainage: 'Poor',
        bsPriorHort: 'Yes',
        bsKnownPhyto: 'Yes',
        bsDiseaseRatings: ['High', 'Moderate', 'Low'],
      },
    ],
    [
      'insectPest',
      {
        bsPestEnv: 'Shade house',
        bsPestRatings: ['Present', 'Probable', 'Probable', '', 'Unlikely'],
      },
    ],
    ['weedMedia', { bsMediaRatings: ['Low', 'High', 'Moderate', 'Negligible'] }],
    ['ingress', { bsIngressRatings: ['High', 'Low', 'Moderate', 'Negligible'] }],
    [
      'sanitation',
      {
        bsEntry: 'Standard',
        bsTools: '5% sodium hypochlorite (bleach) -- dip, rinse, air-dry',
        bsContainer: 'New containers only -- no reuse',
      },
    ],
  ];

  for (const [mode, value] of cases) {
    it(`roundtrips ${mode}`, () => {
      const model = decodeBiosecurity(mode, value);
      const encoded = encodeBiosecurity(mode, model);
      const redecoded = decodeBiosecurity(mode, encoded);
      expect(redecoded).toEqual(model);
    });
  }
});

// ---------------------------------------------------------------------------
// validity gates
// ---------------------------------------------------------------------------

describe('isBiosecurityValid', () => {
  it('sanitation is false when any of the 3 selections is missing', () => {
    expect(isBiosecurityValid('sanitation', {})).toBe(false);
    expect(
      isBiosecurityValid('sanitation', { bsEntry: 'Standard' }),
    ).toBe(false);
    expect(
      isBiosecurityValid('sanitation', {
        bsEntry: 'Standard',
        bsTools: 'Phytoclean (approved disinfectant)',
      }),
    ).toBe(false);
  });

  it('sanitation is true when all 3 selections are set', () => {
    expect(
      isBiosecurityValid('sanitation', {
        bsEntry: 'Standard',
        bsTools: 'Phytoclean (approved disinfectant)',
        bsContainer: 'New containers only -- no reuse',
      }),
    ).toBe(true);
  });

  it('the other 4 modes are always valid (advisory)', () => {
    const advisory: BiosecurityMode[] = [
      'soilDisease',
      'insectPest',
      'weedMedia',
      'ingress',
    ];
    for (const mode of advisory) {
      expect(isBiosecurityValid(mode, {})).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// summaries (defensive; never throw)
// ---------------------------------------------------------------------------

describe('summariseBiosecurity', () => {
  it('does not throw on empty values', () => {
    const modes: BiosecurityMode[] = [
      'soilDisease',
      'insectPest',
      'weedMedia',
      'ingress',
      'sanitation',
    ];
    for (const mode of modes) {
      expect(() => summariseBiosecurity(mode, {})).not.toThrow();
      expect(typeof summariseBiosecurity(mode, {})).toBe('string');
    }
  });

  it('sanitation reports incomplete until all 3 selected', () => {
    expect(summariseBiosecurity('sanitation', {})).toMatch(/incomplete/i);
    expect(
      summariseBiosecurity('sanitation', {
        bsEntry: 'Standard',
        bsTools: 'Phytoclean (approved disinfectant)',
        bsContainer: 'New containers only -- no reuse',
      }),
    ).not.toMatch(/incomplete/i);
  });

  it('soilDisease counts high-risk ratings', () => {
    const s = summariseBiosecurity('soilDisease', {
      bsDiseaseRatings: ['High', 'Moderate', 'Low'],
    });
    expect(s).toMatch(/1 high/);
  });
});

// ---------------------------------------------------------------------------
// Render -- distinctive verbatim strings per mode
// ---------------------------------------------------------------------------

describe('BiosecurityCapture render', () => {
  function renderMode(mode: BiosecurityMode, value: FormValue = {}) {
    return render(
      <BiosecurityCapture
        mode={mode}
        value={value}
        onChange={NOOP}
        itemId={`${BIOSECURITY_PREFIX}-c1`}
      />,
    );
  }

  it('soilDisease renders the Phytophthora binomial', () => {
    renderMode('soilDisease');
    expect(
      screen.getByText(/Phytophthora cinnamomi \/ P\. nicotianae/),
    ).toBeTruthy();
  });

  it('insectPest renders Bradysia and Frankliniella binomials', () => {
    renderMode('insectPest');
    expect(screen.getByText(/Bradysia spp\./)).toBeTruthy();
    expect(screen.getByText(/Frankliniella occidentalis/)).toBeTruthy();
  });

  it('weedMedia renders the 82C heat-treat instruction', () => {
    renderMode('weedMedia');
    expect(screen.getAllByText(/82C for 30 minutes/).length).toBeGreaterThan(0);
  });

  it('ingress renders the 14-day quarantine action', () => {
    renderMode('ingress');
    expect(screen.getByText(/14-day quarantine/)).toBeTruthy();
  });

  it('sanitation renders the generated protocol document title', () => {
    renderMode('sanitation');
    expect(
      screen.getByText(/Propagation Area Sanitation Standard/),
    ).toBeTruthy();
  });

  it('sanitation doc renders bleach-washed container line with updated token', () => {
    const value: FormValue = {
      bsEntry: 'Standard',
      bsTools: '5% sodium hypochlorite (bleach) -- dip, rinse, air-dry',
      bsContainer:
        'Bleach-washed reuse -- physical scrub + 5% bleach soak 10 min + air-dry',
    };
    renderMode('sanitation', value);
    const doc = screen.getByTestId('bs-proto-doc');
    expect(
      doc.textContent ?? '',
    ).toContain(
      'Bleach-washed reuse -- physical scrub + 5% bleach soak 10 min + air-dry',
    );
  });
});

// ---------------------------------------------------------------------------
// Interaction -- selecting protocol options flips validity once all 3 chosen
// ---------------------------------------------------------------------------

describe('sanitation interaction flips validity', () => {
  it('becomes valid after all three protocol sections are chosen', () => {
    let value: FormValue = {};
    const handle = (next: FormValue): void => {
      value = next;
    };
    const { rerender } = render(
      <BiosecurityCapture
        mode="sanitation"
        value={value}
        onChange={handle}
        itemId={`${BIOSECURITY_PREFIX}-c5`}
      />,
    );

    expect(isBiosecurityValid('sanitation', value)).toBe(false);

    // Choose entry protocol (Strict / High token).
    fireEvent.click(
      screen.getByText('Strict -- foot bath + hand wash + zone tools'),
    );
    rerender(
      <BiosecurityCapture
        mode="sanitation"
        value={value}
        onChange={handle}
        itemId={`${BIOSECURITY_PREFIX}-c5`}
      />,
    );
    expect(isBiosecurityValid('sanitation', value)).toBe(false);

    // Choose tool sterilisation.
    fireEvent.click(screen.getByText('Phytoclean -- registered disinfectant'));
    rerender(
      <BiosecurityCapture
        mode="sanitation"
        value={value}
        onChange={handle}
        itemId={`${BIOSECURITY_PREFIX}-c5`}
      />,
    );
    expect(isBiosecurityValid('sanitation', value)).toBe(false);

    // Choose container standard -> now complete.
    fireEvent.click(screen.getByText('New containers only'));
    rerender(
      <BiosecurityCapture
        mode="sanitation"
        value={value}
        onChange={handle}
        itemId={`${BIOSECURITY_PREFIX}-c5`}
      />,
    );
    expect(isBiosecurityValid('sanitation', value)).toBe(true);
  });
});

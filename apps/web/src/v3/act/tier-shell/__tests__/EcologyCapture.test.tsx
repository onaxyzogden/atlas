/**
 * @vitest-environment happy-dom
 *
 * EcologyCapture -- multi-mode CONTROLLED renderer for objective s2-ecology
 * (5 checklist items c1..c5, modes vegetation / species / corridors /
 * connectivity / waterHabitat).
 *
 * Verified behaviours:
 *   - ecologyModeFor maps each c1..c5 id (and null for others).
 *   - decode is TOTAL/defensive (non-array -> empty; garbage entries dropped;
 *     malformed JSON rows dropped; never fabricates seed data -- empty
 *     FormValue yields empty models).
 *   - encode round-trips losslessly.
 *   - validity per mode.
 *   - summarise strings per mode.
 *   - a render assertion per mode (and growable-list add for species/water).
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

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
  EcologyCapture,
  ecologyModeFor,
  decodeEcology,
  encodeEcology,
  isEcologyValid,
  summariseEcology,
  type EcologyMode,
  type SpeciesModel,
  type WaterHabitatModel,
} from '../EcologyCapture.js';
import type { FormValue } from '../actToolCatalog.js';

function renderMode(mode: EcologyMode, value: FormValue) {
  const onChange = vi.fn();
  render(<EcologyCapture mode={mode} value={value} onChange={onChange} />);
  return { onChange };
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('ecologyModeFor', () => {
  it('maps c1..c5 to the correct mode', () => {
    expect(ecologyModeFor('s2-ecology-c1')).toBe('vegetation');
    expect(ecologyModeFor('s2-ecology-c2')).toBe('species');
    expect(ecologyModeFor('s2-ecology-c3')).toBe('corridors');
    expect(ecologyModeFor('s2-ecology-c4')).toBe('connectivity');
    expect(ecologyModeFor('s2-ecology-c5')).toBe('waterHabitat');
  });

  it('returns null for unrelated ids', () => {
    expect(ecologyModeFor('s2-ecology-c6')).toBeNull();
    expect(ecologyModeFor('s2-terrain-c1')).toBeNull();
    expect(ecologyModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// vegetation
// ---------------------------------------------------------------------------

describe('vegetation -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeEcology('vegetation', {})).toEqual({
      kind: 'vegetation',
      communities: {},
    });
  });

  it('decode is defensive: non-array -> empty; unknown keys dropped; bad shape dropped', () => {
    const m = decodeEcology('vegetation', {
      ecologyCommunities: ['cleared::40', 'bogus::10', 'no-separator', 'riparian::5'],
    });
    expect(m).toEqual({
      kind: 'vegetation',
      communities: { cleared: '40', riparian: '5' },
    });
    const fromString = decodeEcology('vegetation', {
      ecologyCommunities: 'cleared::40',
    } as unknown as FormValue);
    expect(fromString).toEqual({ kind: 'vegetation', communities: {} });
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      ecologyCommunities: ['cleared::40', 'native-grass::25', 'riparian::'],
    };
    const model = decodeEcology('vegetation', value);
    expect(decodeEcology('vegetation', encodeEcology(model))).toEqual(model);
  });

  it('valid only when at least one community is recorded', () => {
    expect(isEcologyValid(decodeEcology('vegetation', {}))).toBe(false);
    const ok = decodeEcology('vegetation', {
      ecologyCommunities: ['cleared::40'],
    });
    expect(isEcologyValid(ok)).toBe(true);
    expect(summariseEcology(ok)).toBe('1 community type(s) recorded');
  });

  it('renders the community list and toggles a community', () => {
    const { onChange } = renderMode('vegetation', {});
    expect(screen.getByText('Cleared / Improved pasture')).toBeTruthy();
    fireEvent.click(screen.getByTestId('veg-cleared'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyCommunities).toContain('cleared::');
  });
});

// ---------------------------------------------------------------------------
// species
// ---------------------------------------------------------------------------

describe('species -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates seed species', () => {
    expect(decodeEcology('species', {})).toEqual({
      kind: 'species',
      natives: [],
      invasives: [],
    });
  });

  it('decode drops malformed rows and coerces bad enums', () => {
    const m = decodeEcology('species', {
      ecologyNatives: [
        JSON.stringify({
          id: 'n1',
          scientific: 'Eucalyptus microcarpa',
          common: 'Grey box',
          speciesKind: 'tree',
          abundance: 'Common',
        }),
        'not json',
        JSON.stringify({ id: 'n2', speciesKind: 'bogus' }),
      ],
      ecologyInvasives: [
        JSON.stringify({
          id: 'i1',
          name: 'Blackberry',
          scientific: 'Rubus fruticosus',
          priority: 'high',
          distribution: 'Creek banks',
        }),
      ],
    }) as SpeciesModel;
    expect(m.natives).toHaveLength(2);
    expect(m.natives[1]!.speciesKind).toBe('tree');
    expect(m.invasives).toHaveLength(1);
    expect(m.invasives[0]!.priority).toBe('high');
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      ecologyNatives: [
        JSON.stringify({
          id: 'n1',
          scientific: 'Eucalyptus microcarpa',
          common: 'Grey box',
          speciesKind: 'tree',
          abundance: 'Common',
        }),
      ],
      ecologyInvasives: [
        JSON.stringify({
          id: 'i1',
          name: 'Blackberry',
          scientific: 'Rubus fruticosus',
          priority: 'high',
          distribution: 'Creek banks',
        }),
      ],
    };
    const model = decodeEcology('species', value);
    expect(decodeEcology('species', encodeEcology(model))).toEqual(model);
  });

  it('valid when at least one native OR invasive recorded', () => {
    expect(isEcologyValid(decodeEcology('species', {}))).toBe(false);
    const ok = decodeEcology('species', {
      ecologyInvasives: [JSON.stringify({ id: 'i1', name: 'Blackberry' })],
    });
    expect(isEcologyValid(ok)).toBe(true);
    expect(summariseEcology(ok)).toBe('0 native, 1 invasive species');
  });

  it('renders the empty registers and adds a native species', () => {
    const { onChange } = renderMode('species', {});
    expect(screen.getByTestId('native-empty')).toBeTruthy();
    fireEvent.click(screen.getByTestId('native-open'));
    fireEvent.change(screen.getByTestId('native-sci'), {
      target: { value: 'Eucalyptus microcarpa' },
    });
    fireEvent.click(screen.getByTestId('native-add'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const natives = emitted.ecologyNatives as string[];
    expect(natives).toHaveLength(1);
    expect(JSON.parse(natives[0]!).scientific).toBe('Eucalyptus microcarpa');
  });
});

// ---------------------------------------------------------------------------
// corridors
// ---------------------------------------------------------------------------

describe('corridors -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeEcology('corridors', {})).toEqual({
      kind: 'corridors',
      corridorTypes: [],
      nesting: [],
      notes: '',
    });
  });

  it('decode drops unknown corridor / nesting keys', () => {
    const m = decodeEcology('corridors', {
      ecologyCorridorTypes: ['creek-line', 'bogus'],
      ecologyNesting: ['tree-hollows', 'nope'],
      ecologyNotes: 'Roos move along the creek',
    });
    expect(m).toEqual({
      kind: 'corridors',
      corridorTypes: ['creek-line'],
      nesting: ['tree-hollows'],
      notes: 'Roos move along the creek',
    });
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      ecologyCorridorTypes: ['creek-line', 'fence-line'],
      ecologyNesting: ['tree-hollows', 'fallen-logs'],
      ecologyNotes: 'Seasonal movement north to south',
    };
    const model = decodeEcology('corridors', value);
    expect(decodeEcology('corridors', encodeEcology(model))).toEqual(model);
  });

  it('valid when at least one corridor OR nesting feature selected', () => {
    expect(isEcologyValid(decodeEcology('corridors', {}))).toBe(false);
    const ok = decodeEcology('corridors', {
      ecologyCorridorTypes: ['creek-line'],
    });
    expect(isEcologyValid(ok)).toBe(true);
    expect(summariseEcology(ok)).toBe('1 corridor(s), 0 nesting feature(s)');
  });

  it('renders the chip groups and selects a corridor', () => {
    const { onChange } = renderMode('corridors', {});
    expect(screen.getByText('Creek line corridor')).toBeTruthy();
    fireEvent.click(screen.getByTestId('corridor-creek-line'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyCorridorTypes).toContain('creek-line');
  });
});

// ---------------------------------------------------------------------------
// connectivity
// ---------------------------------------------------------------------------

describe('connectivity -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeEcology('connectivity', {})).toEqual({
      kind: 'connectivity',
      rating: '',
    });
  });

  it('decode drops an unknown rating', () => {
    expect(decodeEcology('connectivity', { ecologyConnectivity: 'bogus' })).toEqual({
      kind: 'connectivity',
      rating: '',
    });
    expect(
      decodeEcology('connectivity', { ecologyConnectivity: 'partial' }),
    ).toEqual({ kind: 'connectivity', rating: 'partial' });
  });

  it('encode round-trips', () => {
    const model = decodeEcology('connectivity', {
      ecologyConnectivity: 'fragmented',
    });
    expect(decodeEcology('connectivity', encodeEcology(model))).toEqual(model);
  });

  it('valid only when a rating is chosen', () => {
    expect(isEcologyValid(decodeEcology('connectivity', {}))).toBe(false);
    const ok = decodeEcology('connectivity', {
      ecologyConnectivity: 'connected',
    });
    expect(isEcologyValid(ok)).toBe(true);
    expect(summariseEcology(ok)).toBe('Well connected');
  });

  it('renders the assessment cards and picks one', () => {
    const { onChange } = renderMode('connectivity', {});
    expect(screen.getByText('Well connected')).toBeTruthy();
    fireEvent.click(screen.getByTestId('conn-partial'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyConnectivity).toBe('partial');
  });
});

// ---------------------------------------------------------------------------
// waterHabitat
// ---------------------------------------------------------------------------

describe('waterHabitat -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates seed areas', () => {
    expect(decodeEcology('waterHabitat', {})).toEqual({
      kind: 'waterHabitat',
      areas: [],
      nonePresent: false,
    });
  });

  it('decode drops malformed rows and coerces a bad area type', () => {
    const m = decodeEcology('waterHabitat', {
      ecologyWaterAreas: [
        JSON.stringify({
          id: 'w1',
          areaType: 'creek',
          name: 'SE creek',
          description: 'Flows winter',
        }),
        'not json',
        JSON.stringify({ id: 'w2', areaType: 'bogus' }),
      ],
      ecologyWaterNone: 'false',
    }) as WaterHabitatModel;
    expect(m.areas).toHaveLength(2);
    expect(m.areas[1]!.areaType).toBe('creek');
    expect(m.nonePresent).toBe(false);
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      ecologyWaterAreas: [
        JSON.stringify({
          id: 'w1',
          areaType: 'dam',
          name: 'Top dam',
          description: 'Permanent',
        }),
      ],
      ecologyWaterNone: 'false',
    };
    const model = decodeEcology('waterHabitat', value);
    expect(decodeEcology('waterHabitat', encodeEcology(model))).toEqual(model);
  });

  it('valid when >=1 area OR none-present affirmed', () => {
    expect(isEcologyValid(decodeEcology('waterHabitat', {}))).toBe(false);
    const none = decodeEcology('waterHabitat', { ecologyWaterNone: 'true' });
    expect(isEcologyValid(none)).toBe(true);
    expect(summariseEcology(none)).toBe('No water-dependent areas present');
    const withArea = decodeEcology('waterHabitat', {
      ecologyWaterAreas: [JSON.stringify({ id: 'w1', areaType: 'dam' })],
    });
    expect(isEcologyValid(withArea)).toBe(true);
    expect(summariseEcology(withArea)).toBe('1 water-dependent area(s)');
  });

  it('renders the empty register and adds a water area', () => {
    const { onChange } = renderMode('waterHabitat', {});
    expect(screen.getByTestId('water-empty')).toBeTruthy();
    fireEvent.click(screen.getByTestId('water-open'));
    fireEvent.change(screen.getByTestId('water-name'), {
      target: { value: 'SE boundary creek' },
    });
    fireEvent.click(screen.getByTestId('water-add'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const areas = emitted.ecologyWaterAreas as string[];
    expect(areas).toHaveLength(1);
    expect(JSON.parse(areas[0]!).name).toBe('SE boundary creek');
  });

  it('toggling none-present clears areas', () => {
    const { onChange } = renderMode('waterHabitat', {
      ecologyWaterAreas: [JSON.stringify({ id: 'w1', areaType: 'dam', name: 'X' })],
    });
    fireEvent.click(screen.getByTestId('water-none'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyWaterNone).toBe('true');
    expect(emitted.ecologyWaterAreas).toEqual([]);
  });
});

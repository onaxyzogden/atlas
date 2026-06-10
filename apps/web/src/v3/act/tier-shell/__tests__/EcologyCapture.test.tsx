/**
 * @vitest-environment happy-dom
 *
 * EcologyCapture -- multi-mode CONTROLLED renderer for objective s2-ecology
 * (universal items c1..c5 -- vegetation / species / corridors / connectivity /
 * waterHabitat -- plus the orchard-injected orch-1 pollinator / orch-2
 * insectary panels).
 *
 * Verified behaviours:
 *   - ecologyModeFor maps c1..c5 and orch-1/orch-2 (null for others).
 *   - decode is TOTAL/defensive (non-array -> empty; unknown checklist keys /
 *     out-of-range scores / unknown dropdown values coerced away; malformed
 *     invasive JSON rows dropped; never fabricates seed data -- empty FormValue
 *     yields empty models).
 *   - encode round-trips losslessly.
 *   - validity per mode.
 *   - summarise strings per mode.
 *   - a render + interaction assertion per mode.
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
  type CorridorsModel,
  type ConnectivityModel,
  type WaterHabitatModel,
  type PollinatorModel,
  type InsectaryModel,
} from '../EcologyCapture.js';
import type { FormValue } from '../actToolCatalog.js';

function renderMode(mode: EcologyMode, value: FormValue) {
  const onChange = vi.fn();
  const { unmount } = render(
    <EcologyCapture mode={mode} value={value} onChange={onChange} />,
  );
  return { onChange, unmount };
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('ecologyModeFor', () => {
  it('maps c1..c5 and the orchard-injected orch-1/orch-2 ids', () => {
    expect(ecologyModeFor('s2-ecology-c1')).toBe('vegetation');
    expect(ecologyModeFor('s2-ecology-c2')).toBe('species');
    expect(ecologyModeFor('s2-ecology-c3')).toBe('corridors');
    expect(ecologyModeFor('s2-ecology-c4')).toBe('connectivity');
    expect(ecologyModeFor('s2-ecology-c5')).toBe('waterHabitat');
    expect(ecologyModeFor('s2-ecology-orch-1')).toBe('pollinator');
    expect(ecologyModeFor('s2-ecology-orch-2')).toBe('insectary');
  });

  it('returns null for unrelated ids', () => {
    expect(ecologyModeFor('s2-ecology-c6')).toBeNull();
    expect(ecologyModeFor('s2-ecology-orch-3')).toBeNull();
    expect(ecologyModeFor('s2-terrain-c1')).toBeNull();
    expect(ecologyModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// vegetation (unchanged -- draw-on-map read-only fallback)
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

  it('renders read-only: empty state when nothing drawn, recorded %s otherwise', () => {
    // Vegetation cover is surveyed by drawing on the map; the capture body is a
    // read-only display with no manual toggle/percent inputs.
    const { unmount } = renderMode('vegetation', {});
    expect(screen.getByTestId('veg-empty')).toBeTruthy();
    expect(screen.queryByTestId('veg-cleared')).toBeNull();
    expect(screen.queryByTestId('veg-pct-cleared')).toBeNull();
    unmount();

    renderMode('vegetation', {
      ecologyCommunities: ['cleared::40', 'riparian::5'],
    });
    expect(screen.getByText('Cleared / Improved pasture')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.getByText('5%')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// species -- native-category checklist + invasive register + SAR dropdown
// ---------------------------------------------------------------------------

describe('species -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates seed species', () => {
    expect(decodeEcology('species', {})).toEqual({
      kind: 'species',
      nativeCats: [],
      invasives: [],
      sar: '',
    });
  });

  it('decode drops unknown native keys, malformed invasive rows, and bad sar', () => {
    const m = decodeEcology('species', {
      ecologyNativeCats: ['canopy', 'bogus', 'wildflower'],
      ecologyInvasives: [
        JSON.stringify({
          id: 'i1',
          name: 'Local weed',
          scientific: 'Genus species',
          priority: 'high',
          distribution: 'watercourse banks',
        }),
        'not json',
        JSON.stringify({ id: 'i2', priority: 'bogus' }),
      ],
      ecologySar: 'nonsense',
    }) as SpeciesModel;
    expect(m.nativeCats).toEqual(['canopy', 'wildflower']);
    expect(m.invasives).toHaveLength(2);
    expect(m.invasives[0]!.priority).toBe('high');
    expect(m.invasives[1]!.priority).toBe('mod');
    expect(m.sar).toBe('');
  });

  it('keeps a known sar value', () => {
    const m = decodeEcology('species', { ecologySar: 'yes' }) as SpeciesModel;
    expect(m.sar).toBe('yes');
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      ecologyNativeCats: ['canopy', 'shrub'],
      ecologyInvasives: [
        JSON.stringify({
          id: 'i1',
          name: 'Local weed',
          scientific: 'Genus species',
          priority: 'high',
          distribution: 'watercourse banks',
        }),
      ],
      ecologySar: 'uncertain',
    };
    const model = decodeEcology('species', value);
    expect(decodeEcology('species', encodeEcology(model))).toEqual(model);
  });

  it('valid when at least one native group OR invasive recorded', () => {
    expect(isEcologyValid(decodeEcology('species', {}))).toBe(false);
    // SAR alone does NOT satisfy the gate.
    expect(isEcologyValid(decodeEcology('species', { ecologySar: 'none' }))).toBe(
      false,
    );
    const ok = decodeEcology('species', { ecologyNativeCats: ['canopy'] });
    expect(isEcologyValid(ok)).toBe(true);
    expect(summariseEcology(ok)).toBe('1 native group(s), 0 invasive');
  });

  it('renders the native checklist and ticks a category', () => {
    const { onChange } = renderMode('species', {});
    expect(screen.getByText('Native canopy trees')).toBeTruthy();
    fireEvent.click(screen.getByTestId('native-canopy'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyNativeCats).toContain('canopy');
  });

  it('adds an invasive to the watchlist', () => {
    const { onChange } = renderMode('species', {});
    expect(screen.getByTestId('invasive-empty')).toBeTruthy();
    fireEvent.click(screen.getByTestId('invasive-open'));
    fireEvent.change(screen.getByTestId('invasive-name'), {
      target: { value: 'Local weed' },
    });
    fireEvent.click(screen.getByTestId('invasive-add'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const invasives = emitted.ecologyInvasives as string[];
    expect(invasives).toHaveLength(1);
    expect(JSON.parse(invasives[0]!).name).toBe('Local weed');
  });
});

// ---------------------------------------------------------------------------
// corridors -- feature + nesting checklists + quality score
// ---------------------------------------------------------------------------

describe('corridors -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeEcology('corridors', {})).toEqual({
      kind: 'corridors',
      corridorTypes: [],
      nesting: [],
      score: '',
    });
  });

  it('decode drops unknown keys and out-of-range scores', () => {
    const m = decodeEcology('corridors', {
      ecologyCorridorTypes: ['watercourse', 'bogus'],
      ecologyNesting: ['dense-shrub', 'nope'],
      ecologyCorridorScore: '9',
    }) as CorridorsModel;
    expect(m.corridorTypes).toEqual(['watercourse']);
    expect(m.nesting).toEqual(['dense-shrub']);
    expect(m.score).toBe('');
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      ecologyCorridorTypes: ['watercourse', 'hedgerow'],
      ecologyNesting: ['dense-shrub', 'deadwood'],
      ecologyCorridorScore: '3',
    };
    const model = decodeEcology('corridors', value);
    expect(decodeEcology('corridors', encodeEcology(model))).toEqual(model);
  });

  it('valid when at least one corridor OR nesting feature selected', () => {
    expect(isEcologyValid(decodeEcology('corridors', {}))).toBe(false);
    const ok = decodeEcology('corridors', {
      ecologyCorridorTypes: ['watercourse'],
    });
    expect(isEcologyValid(ok)).toBe(true);
    expect(summariseEcology(ok)).toBe('1 corridor(s), 0 nesting feature(s)');
  });

  it('renders the checklists and score, and picks a corridor + score', () => {
    const { onChange } = renderMode('corridors', {});
    expect(screen.getByText('Watercourse corridor')).toBeTruthy();
    fireEvent.click(screen.getByTestId('corridor-watercourse'));
    expect(onChange.mock.calls[0]![0]).toMatchObject({
      ecologyCorridorTypes: ['watercourse'],
    });
    fireEvent.click(screen.getByTestId('corridor-score-3'));
    const lastScore = onChange.mock.calls.at(-1)![0] as FormValue;
    expect(lastScore.ecologyCorridorScore).toBe('3');
  });
});

// ---------------------------------------------------------------------------
// connectivity -- feature + barrier checklists + score + distance
// ---------------------------------------------------------------------------

describe('connectivity -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeEcology('connectivity', {})).toEqual({
      kind: 'connectivity',
      features: [],
      barriers: [],
      score: '',
      distance: '',
    });
  });

  it('decode drops unknown keys, bad score, and unknown distance', () => {
    const m = decodeEcology('connectivity', {
      ecologyConnFeatures: ['hedgerow-network', 'bogus'],
      ecologyConnBarriers: ['road', 'nope'],
      ecologyConnScore: '0',
      ecologyConnDistance: 'bogus',
    }) as ConnectivityModel;
    expect(m.features).toEqual(['hedgerow-network']);
    expect(m.barriers).toEqual(['road']);
    expect(m.score).toBe('');
    expect(m.distance).toBe('');
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      ecologyConnFeatures: ['hedgerow-network', 'woodland-block'],
      ecologyConnBarriers: ['road'],
      ecologyConnScore: '2',
      ecologyConnDistance: '100-500',
    };
    const model = decodeEcology('connectivity', value);
    expect(decodeEcology('connectivity', encodeEcology(model))).toEqual(model);
  });

  it('valid only when a score is chosen', () => {
    expect(isEcologyValid(decodeEcology('connectivity', {}))).toBe(false);
    // features/barriers/distance alone do NOT satisfy the gate.
    expect(
      isEcologyValid(
        decodeEcology('connectivity', { ecologyConnFeatures: ['hedgerow-network'] }),
      ),
    ).toBe(false);
    const ok = decodeEcology('connectivity', { ecologyConnScore: '3' });
    expect(isEcologyValid(ok)).toBe(true);
    expect(summariseEcology(ok)).toBe('Connected');
  });

  it('renders the checklists and score, and picks a score', () => {
    const { onChange } = renderMode('connectivity', {});
    expect(screen.getByText('Continuous hedgerow to neighbours')).toBeTruthy();
    fireEvent.click(screen.getByTestId('conn-score-4'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyConnScore).toBe('4');
  });
});

// ---------------------------------------------------------------------------
// waterHabitat -- habitat checklist + 2 setback dropdowns + none toggle
// ---------------------------------------------------------------------------

describe('waterHabitat -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates seed areas', () => {
    expect(decodeEcology('waterHabitat', {})).toEqual({
      kind: 'waterHabitat',
      habitats: [],
      setbackCond: '',
      setbackTarget: '',
      nonePresent: false,
    });
  });

  it('decode drops unknown habitats and bad dropdown values', () => {
    const m = decodeEcology('waterHabitat', {
      ecologyWaterHabitats: ['watercourse', 'bogus'],
      ecologyWaterSetbackCond: 'nonsense',
      ecologyWaterSetbackTarget: 'planting',
      ecologyWaterNone: 'false',
    }) as WaterHabitatModel;
    expect(m.habitats).toEqual(['watercourse']);
    expect(m.setbackCond).toBe('');
    expect(m.setbackTarget).toBe('planting');
    expect(m.nonePresent).toBe(false);
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      ecologyWaterHabitats: ['watercourse', 'seep'],
      ecologyWaterSetbackCond: 'good',
      ecologyWaterSetbackTarget: 'succession',
      ecologyWaterNone: 'false',
    };
    const model = decodeEcology('waterHabitat', value);
    expect(decodeEcology('waterHabitat', encodeEcology(model))).toEqual(model);
  });

  it('valid when >=1 habitat OR none-present affirmed', () => {
    expect(isEcologyValid(decodeEcology('waterHabitat', {}))).toBe(false);
    const none = decodeEcology('waterHabitat', { ecologyWaterNone: 'true' });
    expect(isEcologyValid(none)).toBe(true);
    expect(summariseEcology(none)).toBe('No water-dependent areas present');
    const withHabitat = decodeEcology('waterHabitat', {
      ecologyWaterHabitats: ['watercourse'],
    });
    expect(isEcologyValid(withHabitat)).toBe(true);
    expect(summariseEcology(withHabitat)).toBe('1 water habitat(s)');
  });

  it('renders the checklist and ticks a habitat', () => {
    const { onChange } = renderMode('waterHabitat', {});
    expect(screen.getByText('Watercourse')).toBeTruthy();
    fireEvent.click(screen.getByTestId('water-watercourse'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyWaterHabitats).toContain('watercourse');
  });

  it('toggling none-present clears habitats', () => {
    const { onChange } = renderMode('waterHabitat', {
      ecologyWaterHabitats: ['watercourse'],
    });
    fireEvent.click(screen.getByTestId('water-none'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyWaterNone).toBe('true');
    expect(emitted.ecologyWaterHabitats).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// pollinator (orch-1) -- guild dropdowns + provision score
// ---------------------------------------------------------------------------

describe('pollinator -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeEcology('pollinator', {})).toEqual({
      kind: 'pollinator',
      honeybee: '',
      bumbleSpecies: '',
      bumbleAbund: '',
      solitaryGround: '',
      solitaryMason: '',
      hoverfly: '',
      score: '',
    });
  });

  it('decode drops unknown guild values and bad score', () => {
    const m = decodeEcology('pollinator', {
      ecologyPollHoneybee: 'managed',
      ecologyPollBumbleSpecies: 'bogus',
      ecologyPollScore: '7',
    }) as PollinatorModel;
    expect(m.honeybee).toBe('managed');
    expect(m.bumbleSpecies).toBe('');
    expect(m.score).toBe('');
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      ecologyPollHoneybee: 'feral',
      ecologyPollBumbleSpecies: '2-3',
      ecologyPollBumbleAbund: 'frequent',
      ecologyPollSolitaryGround: 'present',
      ecologyPollSolitaryMason: 'none',
      ecologyPollHoverfly: 'occasional',
      ecologyPollScore: '3',
    };
    const model = decodeEcology('pollinator', value);
    expect(decodeEcology('pollinator', encodeEcology(model))).toEqual(model);
  });

  it('valid when the score OR any guild dropdown is set', () => {
    expect(isEcologyValid(decodeEcology('pollinator', {}))).toBe(false);
    const byGuild = decodeEcology('pollinator', { ecologyPollHoneybee: 'absent' });
    expect(isEcologyValid(byGuild)).toBe(true);
    expect(summariseEcology(byGuild)).toBe('1 guild observation(s)');
    const byScore = decodeEcology('pollinator', { ecologyPollScore: '4' });
    expect(isEcologyValid(byScore)).toBe(true);
    expect(summariseEcology(byScore)).toBe('Provision: Good');
  });

  it('renders the guild cards and picks the provision score', () => {
    const { onChange } = renderMode('pollinator', {});
    expect(screen.getByText('Honeybee (managed / social)')).toBeTruthy();
    expect(screen.getByText('Bumblebees')).toBeTruthy();
    fireEvent.click(screen.getByTestId('poll-score-2'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyPollScore).toBe('2');
  });

  it('selecting a guild dropdown emits its value', () => {
    const { onChange } = renderMode('pollinator', {});
    fireEvent.change(screen.getByTestId('poll-honeybee'), {
      target: { value: 'managed' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyPollHoneybee).toBe('managed');
  });
});

// ---------------------------------------------------------------------------
// insectary (orch-2) -- bloom-window table + nesting checklist + bed dropdown
// ---------------------------------------------------------------------------

describe('insectary -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeEcology('insectary', {})).toEqual({
      kind: 'insectary',
      bloomEarly: '',
      bloomMid: '',
      bloomLate: '',
      bloomGaps: '',
      nesting: [],
      bed: '',
    });
  });

  it('decode drops unknown bloom/bed values and nesting keys', () => {
    const m = decodeEcology('insectary', {
      ecologyBloomEarly: 'wildflower',
      ecologyBloomMid: 'bogus',
      ecologyInsectaryNesting: ['bare-bank', 'nope'],
      ecologyInsectaryBed: 'bogus',
    }) as InsectaryModel;
    expect(m.bloomEarly).toBe('wildflower');
    expect(m.bloomMid).toBe('');
    expect(m.nesting).toEqual(['bare-bank']);
    expect(m.bed).toBe('');
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      ecologyBloomEarly: 'early-pollen',
      ecologyBloomMid: 'wildflower',
      ecologyBloomLate: 'composites',
      ecologyBloomGaps: 'annual-strip',
      ecologyInsectaryNesting: ['bare-bank', 'stem-bundle'],
      ecologyInsectaryBed: 'dedicated',
    };
    const model = decodeEcology('insectary', value);
    expect(decodeEcology('insectary', encodeEcology(model))).toEqual(model);
  });

  it('valid when a bloom window OR nesting OR bed is set', () => {
    expect(isEcologyValid(decodeEcology('insectary', {}))).toBe(false);
    const byBloom = decodeEcology('insectary', { ecologyBloomEarly: 'wildflower' });
    expect(isEcologyValid(byBloom)).toBe(true);
    expect(summariseEcology(byBloom)).toBe(
      '1 bloom window(s), 0 nesting provision(s)',
    );
    const byBed = decodeEcology('insectary', { ecologyInsectaryBed: 'integrated' });
    expect(isEcologyValid(byBed)).toBe(true);
  });

  it('renders the bloom table and selects a window support', () => {
    const { onChange } = renderMode('insectary', {});
    expect(screen.getByTestId('bloom-table')).toBeTruthy();
    fireEvent.change(screen.getByTestId('bloom-early'), {
      target: { value: 'wildflower' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyBloomEarly).toBe('wildflower');
  });

  it('ticks a nesting provision', () => {
    const { onChange } = renderMode('insectary', {});
    fireEvent.click(screen.getByTestId('insectary-nesting-bare-bank'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.ecologyInsectaryNesting).toContain('bare-bank');
  });
});

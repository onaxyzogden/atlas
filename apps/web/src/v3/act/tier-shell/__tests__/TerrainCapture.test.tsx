/**
 * @vitest-environment happy-dom
 *
 * TerrainCapture -- multi-mode CONTROLLED renderer for objective s2-terrain
 * (5 checklist items c1..c5, modes mapSource / slope / elevation / landform /
 * erosion).
 *
 * Verified behaviours:
 *   - terrainModeFor maps each c1..c5 id (and null for others).
 *   - decode is TOTAL/defensive (non-array -> empty; garbage entries dropped;
 *     never fabricates seed data -- empty FormValue yields empty models).
 *   - encode round-trips losslessly (including minted landform ids).
 *   - validity per mode (mapSource method set, slope sum within +/-2 of 100,
 *     elevation finite highest>=lowest, landform >=1 feature, erosion risk
 *     chosen OR mass-movement flagged).
 *   - summarise strings per mode.
 *   - a render assertion per mode (distinctive label/control present).
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
  TerrainCapture,
  terrainModeFor,
  decodeTerrain,
  encodeTerrain,
  isTerrainValid,
  summariseTerrain,
  type TerrainMode,
} from '../TerrainCapture.js';
import type { FormValue } from '../actToolCatalog.js';

function renderMode(mode: TerrainMode, value: FormValue) {
  const onChange = vi.fn();
  render(<TerrainCapture mode={mode} value={value} onChange={onChange} />);
  return { onChange };
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('terrainModeFor', () => {
  it('maps c1..c5 to the correct mode (by subject, not panel number)', () => {
    expect(terrainModeFor('s2-terrain-c1')).toBe('mapSource');
    expect(terrainModeFor('s2-terrain-c2')).toBe('slope');
    expect(terrainModeFor('s2-terrain-c3')).toBe('elevation');
    expect(terrainModeFor('s2-terrain-c4')).toBe('landform');
    expect(terrainModeFor('s2-terrain-c5')).toBe('erosion');
  });

  it('returns null for unrelated ids', () => {
    expect(terrainModeFor('s2-terrain-c6')).toBeNull();
    expect(terrainModeFor('s1-vision-c1')).toBeNull();
    expect(terrainModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapSource
// ---------------------------------------------------------------------------

describe('mapSource -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeTerrain('mapSource', {})).toEqual({
      kind: 'mapSource',
      method: '',
      contourInterval: '',
      dataDate: '',
      accuracy: '',
      coverage: '',
    });
  });

  it('decode is defensive: array -> empty string', () => {
    const m = decodeTerrain('mapSource', {
      terrainMethod: ['lidar'],
    } as unknown as FormValue);
    expect((m as { method: string }).method).toBe('');
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      terrainMethod: 'lidar',
      terrainContourInterval: '1m',
      terrainDataDate: '2023',
      terrainAccuracy: '+/-0.3m',
      terrainCoverage: 'Full site',
    };
    const model = decodeTerrain('mapSource', value);
    expect(decodeTerrain('mapSource', encodeTerrain(model))).toEqual(model);
  });

  it('valid only when a method is selected; summarise is the method name', () => {
    expect(isTerrainValid(decodeTerrain('mapSource', {}))).toBe(false);
    const model = decodeTerrain('mapSource', { terrainMethod: 'lidar' });
    expect(isTerrainValid(model)).toBe(true);
    expect(summariseTerrain(model)).toBe('LiDAR -- government dataset');
  });

  it('renders the method grid and selects one (revealing dataset details)', () => {
    const { onChange } = renderMode('mapSource', {});
    expect(screen.getByText('Professional survey')).toBeTruthy();
    // dataset details are hidden until a method is chosen
    expect(screen.queryByTestId('dataset-details')).toBeNull();
    fireEvent.click(screen.getByTestId('method-lidar'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.terrainMethod).toBe('lidar');
  });
});

// ---------------------------------------------------------------------------
// slope
// ---------------------------------------------------------------------------

describe('slope -- decode / encode / validity / summarise / render', () => {
  it('decode is defensive and never fabricates', () => {
    expect(decodeTerrain('slope', {})).toEqual({
      kind: 'slope',
      allocations: {},
      aspects: [],
    });
  });

  it('decode drops garbage allocation + aspect entries', () => {
    const m = decodeTerrain('slope', {
      terrainSlope: ['flat::5', 'garbage', 'bogus::20'],
      terrainAspects: ['N', 'ZZ', 'SE'],
    });
    expect(m).toEqual({
      kind: 'slope',
      allocations: { flat: '5' },
      aspects: ['N', 'SE'],
    });
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      terrainSlope: ['flat::5', 'gentle::20', 'moderate::45'],
      terrainAspects: ['NE', 'E'],
    };
    const model = decodeTerrain('slope', value);
    expect(decodeTerrain('slope', encodeTerrain(model))).toEqual(model);
  });

  it('valid only when allocations sum within +/-2 of 100', () => {
    const short = decodeTerrain('slope', {
      terrainSlope: ['flat::20', 'gentle::20'],
    });
    expect(isTerrainValid(short)).toBe(false);

    const full = decodeTerrain('slope', {
      terrainSlope: [
        'flat::5',
        'gentle::20',
        'moderate::45',
        'steep::20',
        'vsteep::8',
        'extreme::2',
      ],
    });
    expect(isTerrainValid(full)).toBe(true);
  });

  it('summarise reports allocated sum + aspect count', () => {
    const model = decodeTerrain('slope', {
      terrainSlope: ['flat::50', 'gentle::50'],
      terrainAspects: ['N', 'NE'],
    });
    expect(summariseTerrain(model)).toBe('100% allocated, 2 aspect(s)');
  });

  it('renders the 6 slope classes and edits one', () => {
    const { onChange } = renderMode('slope', {});
    expect(screen.getByText('Flat')).toBeTruthy();
    expect(screen.getByText('Extreme')).toBeTruthy();
    fireEvent.change(screen.getByTestId('slope-flat'), {
      target: { value: '10' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.terrainSlope).toContain('flat::10');
  });
});

// ---------------------------------------------------------------------------
// elevation
// ---------------------------------------------------------------------------

describe('elevation -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeTerrain('elevation', {})).toEqual({
      kind: 'elevation',
      highest: '',
      lowest: '',
      drainageDir: '',
      divides: [],
      dividesNote: '',
    });
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      terrainHighest: '298',
      terrainLowest: '241',
      terrainDrainageDir: 'SE',
      terrainDivides: ['yes'],
      terrainDividesNote: 'Ridge runs NNW-SSE',
    };
    const model = decodeTerrain('elevation', value);
    expect(decodeTerrain('elevation', encodeTerrain(model))).toEqual(model);
  });

  it('valid only when highest & lowest finite and highest >= lowest', () => {
    expect(isTerrainValid(decodeTerrain('elevation', {}))).toBe(false);
    const inverted = decodeTerrain('elevation', {
      terrainHighest: '100',
      terrainLowest: '200',
    });
    expect(isTerrainValid(inverted)).toBe(false);
    const ok = decodeTerrain('elevation', {
      terrainHighest: '298',
      terrainLowest: '241',
    });
    expect(isTerrainValid(ok)).toBe(true);
  });

  it('summarise reports relief and drainage direction', () => {
    const model = decodeTerrain('elevation', {
      terrainHighest: '298',
      terrainLowest: '241',
      terrainDrainageDir: 'SE',
    });
    expect(summariseTerrain(model)).toBe('57 m relief, drains SE');
  });

  it('renders the elevation pair and computes relief on input', () => {
    const { onChange } = renderMode('elevation', {});
    expect(screen.getByText('Highest point')).toBeTruthy();
    fireEvent.change(screen.getByTestId('elev-highest'), {
      target: { value: '300' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.terrainHighest).toBe('300');
  });
});

// ---------------------------------------------------------------------------
// landform
// ---------------------------------------------------------------------------

describe('landform -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates seed features', () => {
    const m = decodeTerrain('landform', {});
    expect((m as { features: unknown[] }).features).toEqual([]);
  });

  it('decode drops non-JSON and unknown-type entries', () => {
    const m = decodeTerrain('landform', {
      terrainLandforms: [
        'not-json',
        JSON.stringify({ id: 'a', type: 'bogus', name: 'X' }),
        JSON.stringify({ id: 'b', type: 'flat', name: 'North flat' }),
      ],
    });
    expect((m as { features: unknown[] }).features).toHaveLength(1);
  });

  it('encode round-trips (including ids)', () => {
    const value: FormValue = {
      terrainLandforms: [
        JSON.stringify({
          id: 'lf-1',
          type: 'flat',
          name: 'North flat',
          size: '8 ha',
          elevation: '245',
        }),
        JSON.stringify({
          id: 'lf-2',
          type: 'ridge',
          name: 'Main ridge',
          size: '600 m',
          elevation: '',
        }),
      ],
    };
    const model = decodeTerrain('landform', value);
    expect(decodeTerrain('landform', encodeTerrain(model))).toEqual(model);
  });

  it('valid only when >=1 feature registered', () => {
    expect(isTerrainValid(decodeTerrain('landform', {}))).toBe(false);
    const one = decodeTerrain('landform', {
      terrainLandforms: [JSON.stringify({ id: 'a', type: 'flat', name: 'X' })],
    });
    expect(isTerrainValid(one)).toBe(true);
  });

  it('summarise reports feature + type counts', () => {
    const model = decodeTerrain('landform', {
      terrainLandforms: [
        JSON.stringify({ id: 'a', type: 'flat', name: 'X' }),
        JSON.stringify({ id: 'b', type: 'flat', name: 'Y' }),
        JSON.stringify({ id: 'c', type: 'ridge', name: 'Z' }),
      ],
    });
    expect(summariseTerrain(model)).toBe('3 feature(s), 2 type(s)');
  });

  it('starts empty, opens the form, and adds a feature', () => {
    const value: FormValue = {};
    const onChange = vi.fn();
    render(
      <TerrainCapture mode="landform" value={value} onChange={onChange} />,
    );
    expect(screen.getByTestId('landform-empty')).toBeTruthy();
    fireEvent.click(screen.getByTestId('landform-open'));
    fireEvent.change(screen.getByTestId('landform-name'), {
      target: { value: 'West saddle' },
    });
    fireEvent.click(screen.getByTestId('landform-add'));
    const emitted = onChange.mock.calls.at(-1)![0] as FormValue;
    expect(emitted.terrainLandforms).toHaveLength(1);
    const added = JSON.parse((emitted.terrainLandforms as string[])[0]!);
    expect(added.name).toBe('West saddle');
    expect(typeof added.id).toBe('string');
    expect(added.id.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// erosion
// ---------------------------------------------------------------------------

describe('erosion -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeTerrain('erosion', {})).toEqual({
      kind: 'erosion',
      types: [],
      massMovement: false,
      riskLevel: '',
      affected: '',
    });
  });

  it('decode drops unknown erosion types and bad risk levels', () => {
    const m = decodeTerrain('erosion', {
      terrainErosionTypes: ['rill', 'bogus'],
      terrainRiskLevel: 'nope',
      terrainMassMovement: 'true',
    });
    expect(m).toEqual({
      kind: 'erosion',
      types: ['rill'],
      massMovement: true,
      riskLevel: '',
      affected: '',
    });
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      terrainErosionTypes: ['rill'],
      terrainMassMovement: 'false',
      terrainRiskLevel: 'mod',
      terrainAffected: 'Rill erosion on NE-facing slope',
    };
    const model = decodeTerrain('erosion', value);
    expect(decodeTerrain('erosion', encodeTerrain(model))).toEqual(model);
  });

  it('valid when a risk level is chosen OR mass-movement is flagged', () => {
    expect(isTerrainValid(decodeTerrain('erosion', {}))).toBe(false);
    const risk = decodeTerrain('erosion', { terrainRiskLevel: 'low' });
    expect(isTerrainValid(risk)).toBe(true);
    const mass = decodeTerrain('erosion', { terrainMassMovement: 'true' });
    expect(isTerrainValid(mass)).toBe(true);
  });

  it('summarise reports risk level, or the mass-movement override', () => {
    const mod = decodeTerrain('erosion', {
      terrainRiskLevel: 'mod',
      terrainErosionTypes: ['rill'],
    });
    expect(summariseTerrain(mod)).toBe('Moderate erosion risk, 1 type(s)');
    const mass = decodeTerrain('erosion', { terrainMassMovement: 'true' });
    expect(summariseTerrain(mass)).toBe(
      'Mass movement flagged -- geotechnical assessment required',
    );
  });

  it('renders risk buttons and swaps to the mass-movement warning', () => {
    const { onChange } = renderMode('erosion', {});
    expect(screen.getByTestId('standard-risk')).toBeTruthy();
    expect(screen.queryByTestId('mass-warning')).toBeNull();
    fireEvent.click(screen.getByTestId('erosion-mass'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.terrainMassMovement).toBe('true');
  });

  it('shows the mass-warning when mass movement is already flagged', () => {
    renderMode('erosion', { terrainMassMovement: 'true' });
    expect(screen.getByTestId('mass-warning')).toBeTruthy();
    expect(screen.queryByTestId('standard-risk')).toBeNull();
  });
});

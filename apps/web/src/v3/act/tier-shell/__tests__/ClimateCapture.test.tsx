/**
 * @vitest-environment happy-dom
 *
 * ClimateCapture -- multi-mode CONTROLLED renderer for objective s2-climate
 * (6 checklist items c1..c6, modes rainfall / wind / temperature / solar /
 * fire / microclimate).
 *
 * Verified behaviours:
 *   - climateModeFor maps each c1..c6 id (and null for others).
 *   - decode is TOTAL/defensive (non-array -> empty; garbage entries dropped;
 *     never fabricates seed data -- empty FormValue yields empty models).
 *   - encode round-trips losslessly.
 *   - validity per mode (rainfall annual finite, wind >=1 dir, temperature
 *     min&max finite, solar hemisphere + face chosen, fire risk chosen,
 *     microclimate >=1 feature OR observations non-empty).
 *   - summarise strings per mode.
 *   - a render assertion per mode.
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
  ClimateCapture,
  climateModeFor,
  decodeClimate,
  encodeClimate,
  isClimateValid,
  summariseClimate,
  type ClimateMode,
} from '../ClimateCapture.js';
import type { FormValue } from '../actToolCatalog.js';

function renderMode(mode: ClimateMode, value: FormValue) {
  const onChange = vi.fn();
  render(<ClimateCapture mode={mode} value={value} onChange={onChange} />);
  return { onChange };
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('climateModeFor', () => {
  it('maps c1..c6 to the correct mode (by subject, not panel number)', () => {
    expect(climateModeFor('s2-climate-c1')).toBe('rainfall');
    expect(climateModeFor('s2-climate-c2')).toBe('wind');
    expect(climateModeFor('s2-climate-c3')).toBe('temperature');
    expect(climateModeFor('s2-climate-c4')).toBe('solar');
    expect(climateModeFor('s2-climate-c5')).toBe('fire');
    expect(climateModeFor('s2-climate-c6')).toBe('microclimate');
  });

  it('returns null for unrelated ids', () => {
    expect(climateModeFor('s2-climate-c7')).toBeNull();
    expect(climateModeFor('s2-terrain-c1')).toBeNull();
    expect(climateModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// rainfall
// ---------------------------------------------------------------------------

describe('rainfall -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeClimate('rainfall', {})).toEqual({
      kind: 'rainfall',
      annual: '',
      seasonal: {},
      cv: '',
    });
  });

  it('decode is defensive: array annual -> empty; garbage seasonal dropped', () => {
    const m = decodeClimate('rainfall', {
      climateAnnual: ['620'],
      climateSeasonal: ['sum::60', 'garbage', 'bogus::20'],
    } as unknown as FormValue);
    expect(m).toEqual({
      kind: 'rainfall',
      annual: '',
      seasonal: { sum: '60' },
      cv: '',
    });
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      climateAnnual: '620',
      climateSeasonal: ['sum::60', 'win::260'],
      climateCv: '28',
    };
    const model = decodeClimate('rainfall', value);
    expect(decodeClimate('rainfall', encodeClimate(model))).toEqual(model);
  });

  it('valid only when annual avg is a finite number', () => {
    expect(isClimateValid(decodeClimate('rainfall', {}))).toBe(false);
    const ok = decodeClimate('rainfall', { climateAnnual: '620' });
    expect(isClimateValid(ok)).toBe(true);
    expect(summariseClimate(ok)).toBe('620 mm/yr, 0 season(s)');
  });

  it('renders the annual field and emits on change', () => {
    const { onChange } = renderMode('rainfall', {});
    expect(screen.getByText('Annual average')).toBeTruthy();
    fireEvent.change(screen.getByTestId('rain-annual'), {
      target: { value: '700' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.climateAnnual).toBe('700');
  });
});

// ---------------------------------------------------------------------------
// wind
// ---------------------------------------------------------------------------

describe('wind -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeClimate('wind', {})).toEqual({
      kind: 'wind',
      directions: {},
    });
  });

  it('decode drops unknown wind types and bad directions', () => {
    const m = decodeClimate('wind', {
      climateWind: ['summer::S', 'bogus::N', 'winter::ZZ', 'hot::N'],
    });
    expect(m).toEqual({
      kind: 'wind',
      directions: { summer: 'S', hot: 'N' },
    });
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      climateWind: ['summer::S', 'winter::N', 'hot::N', 'storm::W'],
    };
    const model = decodeClimate('wind', value);
    expect(decodeClimate('wind', encodeClimate(model))).toEqual(model);
  });

  it('valid only when at least one direction is set', () => {
    expect(isClimateValid(decodeClimate('wind', {}))).toBe(false);
    const one = decodeClimate('wind', { climateWind: ['summer::S'] });
    expect(isClimateValid(one)).toBe(true);
    expect(summariseClimate(one)).toBe('1 wind type(s) mapped');
  });

  it('renders the wind groups and selects a direction', () => {
    const { onChange } = renderMode('wind', {});
    expect(screen.getByText('Summer prevailing wind')).toBeTruthy();
    fireEvent.click(screen.getByTestId('wind-summer-S'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.climateWind).toContain('summer::S');
  });
});

// ---------------------------------------------------------------------------
// temperature
// ---------------------------------------------------------------------------

describe('temperature -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeClimate('temperature', {})).toEqual({
      kind: 'temperature',
      minTemp: '',
      maxTemp: '',
      lastFrost: '',
      firstFrost: '',
      heatDays: '',
    });
  });

  it('decode drops out-of-range frost month values', () => {
    const m = decodeClimate('temperature', {
      climateLastFrost: '99',
      climateFirstFrost: '5',
    });
    expect(m).toEqual({
      kind: 'temperature',
      minTemp: '',
      maxTemp: '',
      lastFrost: '',
      firstFrost: '5',
      heatDays: '',
    });
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      climateMinTemp: '3',
      climateMaxTemp: '32',
      climateLastFrost: '8',
      climateFirstFrost: '5',
      climateHeatDays: '8',
    };
    const model = decodeClimate('temperature', value);
    expect(decodeClimate('temperature', encodeClimate(model))).toEqual(model);
  });

  it('valid only when min & max are finite', () => {
    expect(isClimateValid(decodeClimate('temperature', {}))).toBe(false);
    const partial = decodeClimate('temperature', { climateMinTemp: '3' });
    expect(isClimateValid(partial)).toBe(false);
    const ok = decodeClimate('temperature', {
      climateMinTemp: '3',
      climateMaxTemp: '32',
    });
    expect(isClimateValid(ok)).toBe(true);
  });

  it('summarise reports range and frost-free days', () => {
    const model = decodeClimate('temperature', {
      climateMinTemp: '3',
      climateMaxTemp: '32',
      climateLastFrost: '8',
      climateFirstFrost: '5',
    });
    // SH frost May(5)->Aug(8) = 4 months, 8 frost-free months => 240 days.
    expect(summariseClimate(model)).toBe('3 to 32 deg C, ~240 frost-free days');
  });

  it('renders min/max pair and frost selectors', () => {
    const { onChange } = renderMode('temperature', {});
    expect(screen.getByText('Min temp')).toBeTruthy();
    expect(screen.getByTestId('frost-last')).toBeTruthy();
    fireEvent.change(screen.getByTestId('temp-min'), {
      target: { value: '4' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.climateMinTemp).toBe('4');
  });
});

// ---------------------------------------------------------------------------
// solar
// ---------------------------------------------------------------------------

describe('solar -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeClimate('solar', {})).toEqual({
      kind: 'solar',
      hemisphere: '',
      shadeSources: '',
      growingFace: '',
    });
  });

  it('decode drops bad hemisphere + face values', () => {
    const m = decodeClimate('solar', {
      climateHemisphere: 'X',
      climateGrowingFace: 'ZZ',
    });
    expect(m).toEqual({
      kind: 'solar',
      hemisphere: '',
      shadeSources: '',
      growingFace: '',
    });
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      climateHemisphere: 'N',
      climateShadeSources: 'Pines on south boundary',
      climateGrowingFace: 'NW',
    };
    const model = decodeClimate('solar', value);
    expect(decodeClimate('solar', encodeClimate(model))).toEqual(model);
  });

  it('valid only when hemisphere AND growing face chosen', () => {
    expect(isClimateValid(decodeClimate('solar', {}))).toBe(false);
    const hemiOnly = decodeClimate('solar', { climateHemisphere: 'N' });
    expect(isClimateValid(hemiOnly)).toBe(false);
    const ok = decodeClimate('solar', {
      climateHemisphere: 'N',
      climateGrowingFace: 'NW',
    });
    expect(isClimateValid(ok)).toBe(true);
    expect(summariseClimate(ok)).toBe('N hemisphere, NW face');
  });

  it('renders the hemisphere toggle and reveals sun periods on select', () => {
    const { onChange } = renderMode('solar', {});
    expect(screen.getByText('Hemisphere')).toBeTruthy();
    expect(screen.queryByTestId('sun-summer')).toBeNull();
    fireEvent.click(screen.getByTestId('hemi-N'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.climateHemisphere).toBe('N');
  });

  it('shows sun-period read-outs when a hemisphere is already set', () => {
    renderMode('solar', { climateHemisphere: 'S' });
    expect(screen.getByTestId('sun-summer')).toBeTruthy();
    expect(screen.getByTestId('sun-winter')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// fire
// ---------------------------------------------------------------------------

describe('fire -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeClimate('fire', {})).toEqual({
      kind: 'fire',
      riskLevel: '',
      approachDir: '',
      position: '',
      fuelType: '',
    });
  });

  it('decode drops unknown risk / dir / position / fuel values', () => {
    const m = decodeClimate('fire', {
      climateRiskLevel: 'nope',
      climateApproachDir: 'ZZ',
      climatePosition: 'Mars',
      climateFuelType: 'Lava',
    });
    expect(m).toEqual({
      kind: 'fire',
      riskLevel: '',
      approachDir: '',
      position: '',
      fuelType: '',
    });
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      climateRiskLevel: 'hgh',
      climateApproachDir: 'N',
      climatePosition: 'Midslope',
      climateFuelType: 'Mixed shrub & grass',
    };
    const model = decodeClimate('fire', value);
    expect(decodeClimate('fire', encodeClimate(model))).toEqual(model);
  });

  it('valid only when a risk level is chosen', () => {
    expect(isClimateValid(decodeClimate('fire', {}))).toBe(false);
    const ok = decodeClimate('fire', { climateRiskLevel: 'hgh' });
    expect(isClimateValid(ok)).toBe(true);
    expect(summariseClimate(ok)).toBe('High risk -- 29 m minimum APZ');
  });

  it('renders risk buttons and reveals the APZ box on select', () => {
    const { onChange } = renderMode('fire', {});
    expect(screen.getByTestId('fire-risk-hgh')).toBeTruthy();
    expect(screen.queryByTestId('apz-box')).toBeNull();
    fireEvent.click(screen.getByTestId('fire-risk-hgh'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.climateRiskLevel).toBe('hgh');
  });

  it('shows the APZ box when a risk level is already set', () => {
    renderMode('fire', { climateRiskLevel: 'ext' });
    expect(screen.getByTestId('apz-box')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// microclimate
// ---------------------------------------------------------------------------

describe('microclimate -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates seed features', () => {
    expect(decodeClimate('microclimate', {})).toEqual({
      kind: 'microclimate',
      features: [],
      observations: '',
    });
  });

  it('decode drops unknown feature keys', () => {
    const m = decodeClimate('microclimate', {
      climateFeatures: ['frost-hollow', 'bogus', 'heat-trap'],
    });
    expect((m as { features: string[] }).features).toEqual([
      'frost-hollow',
      'heat-trap',
    ]);
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      climateFeatures: ['frost-hollow', 'thermal-pocket'],
      climateObservations: 'Cold pooling in the lower paddock',
    };
    const model = decodeClimate('microclimate', value);
    expect(decodeClimate('microclimate', encodeClimate(model))).toEqual(model);
  });

  it('valid when >=1 feature OR observations non-empty', () => {
    expect(isClimateValid(decodeClimate('microclimate', {}))).toBe(false);
    const feat = decodeClimate('microclimate', {
      climateFeatures: ['frost-hollow'],
    });
    expect(isClimateValid(feat)).toBe(true);
    const obs = decodeClimate('microclimate', {
      climateObservations: 'Notable frost event last winter',
    });
    expect(isClimateValid(obs)).toBe(true);
    expect(summariseClimate(feat)).toBe('1 feature(s) noted');
  });

  it('renders the checklist and toggles a feature', () => {
    const { onChange } = renderMode('microclimate', {});
    expect(screen.getByText('Wind tunnel / exposed corridors')).toBeTruthy();
    fireEvent.click(screen.getByTestId('micro-frost-hollow'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.climateFeatures).toContain('frost-hollow');
  });
});

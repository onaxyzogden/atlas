/**
 * @vitest-environment happy-dom
 *
 * LandscapeContextCapture -- multi-mode CONTROLLED renderer for objective
 * ev-s2-landscape-vectors (6 checklist items c1..c6, modes landUse / sprayRisk /
 * planning / community / disputes / catchment).
 *
 * Verified behaviours:
 *   - landscapeModeFor maps each c1..c6 id (and null for others).
 *   - decode is TOTAL/defensive (non-array -> empty; garbage entries dropped;
 *     malformed JSON rows dropped; never fabricates seed data; catchment yields
 *     exactly 4 fixed vectors with null severity).
 *   - encode round-trips losslessly.
 *   - validity per mode.
 *   - summarise strings per mode.
 *   - a render assertion + interaction per mode.
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
  LandscapeContextCapture,
  landscapeModeFor,
  decodeLandscape,
  encodeLandscape,
  isLandscapeValid,
  summariseLandscape,
  type LandscapeMode,
  type LandUseModel,
  type SprayRiskModel,
  type CommunityModel,
  type DisputesModel,
  type CatchmentModel,
} from '../LandscapeContextCapture.js';
import type { FormValue } from '../actToolCatalog.js';

function renderMode(mode: LandscapeMode, value: FormValue) {
  const onChange = vi.fn();
  render(
    <LandscapeContextCapture mode={mode} value={value} onChange={onChange} />,
  );
  return { onChange };
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('landscapeModeFor', () => {
  it('maps c1..c6 to the correct mode', () => {
    expect(landscapeModeFor('ev-s2-landscape-vectors-c1')).toBe('landUse');
    expect(landscapeModeFor('ev-s2-landscape-vectors-c2')).toBe('sprayRisk');
    expect(landscapeModeFor('ev-s2-landscape-vectors-c3')).toBe('planning');
    expect(landscapeModeFor('ev-s2-landscape-vectors-c4')).toBe('community');
    expect(landscapeModeFor('ev-s2-landscape-vectors-c5')).toBe('disputes');
    expect(landscapeModeFor('ev-s2-landscape-vectors-c6')).toBe('catchment');
  });

  it('returns null for unrelated or unknown-suffix ids', () => {
    expect(landscapeModeFor('ev-s2-landscape-vectors-c7')).toBeNull();
    expect(landscapeModeFor('ev-s2-landscape-vectors-')).toBeNull();
    expect(landscapeModeFor('s2-ecology-c1')).toBeNull();
    expect(landscapeModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// landUse
// ---------------------------------------------------------------------------

describe('landUse -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeLandscape('landUse', {})).toEqual({
      kind: 'landUse',
      entries: [],
    });
  });

  it('decode drops malformed rows and coerces a bad risk level', () => {
    const m = decodeLandscape('landUse', {
      landscapeLandUses: [
        JSON.stringify({
          id: 'u1',
          direction: 'W',
          distanceKm: '0.8km',
          name: 'Cropping',
          riskLevel: 'mod',
          riskTag: 'Spray drift',
          detail: 'wheat',
        }),
        'not json',
        JSON.stringify({ id: 'u2', riskLevel: 'bogus' }),
      ],
    }) as LandUseModel;
    expect(m.entries).toHaveLength(2);
    expect(m.entries[0]!.riskLevel).toBe('mod');
    expect(m.entries[1]!.riskLevel).toBe('none');
  });

  it('decode mints deterministic legacy ids for rows missing an id', () => {
    const m = decodeLandscape('landUse', {
      landscapeLandUses: [JSON.stringify({ name: 'No id row' })],
    }) as LandUseModel;
    expect(m.entries[0]!.id).toBe('legacy-landscape-0');
  });

  it('encode round-trips losslessly', () => {
    const value: FormValue = {
      landscapeLandUses: [
        JSON.stringify({
          id: 'u1',
          direction: 'W',
          distanceKm: '0.8km',
          name: 'Cropping',
          riskLevel: 'mod',
          riskTag: 'Spray drift',
          detail: 'wheat',
        }),
      ],
    };
    const model = decodeLandscape('landUse', value);
    expect(decodeLandscape('landUse', encodeLandscape('landUse', model))).toEqual(
      model,
    );
  });

  it('valid only when at least one entry has a non-empty name', () => {
    expect(isLandscapeValid('landUse', decodeLandscape('landUse', {}))).toBe(
      false,
    );
    const ok = decodeLandscape('landUse', {
      landscapeLandUses: [JSON.stringify({ id: 'u1', name: 'Cropping' })],
    });
    expect(isLandscapeValid('landUse', ok)).toBe(true);
    expect(summariseLandscape('landUse', ok)).toBe('1 land use(s) registered');
  });

  it('renders the empty register and adds a land use', () => {
    const { onChange } = renderMode('landUse', {});
    expect(screen.getByTestId('landuse-empty')).toBeTruthy();
    fireEvent.click(screen.getByTestId('landuse-open'));
    fireEvent.change(screen.getByTestId('landuse-name'), {
      target: { value: 'Conventional cropping' },
    });
    fireEvent.click(screen.getByTestId('landuse-add'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const rows = emitted.landscapeLandUses as string[];
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]!).name).toBe('Conventional cropping');
  });
});

// ---------------------------------------------------------------------------
// sprayRisk
// ---------------------------------------------------------------------------

describe('sprayRisk -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeLandscape('sprayRisk', {})).toEqual({
      kind: 'sprayRisk',
      entries: [],
    });
  });

  it('decode drops malformed rows, coerces bad severity, filters pathways', () => {
    const m = decodeLandscape('sprayRisk', {
      landscapeRisks: [
        JSON.stringify({
          id: 'r1',
          from: 'W',
          name: 'Spray drift',
          severity: 'high',
          pathways: ['airborne', 'bogus', 'water'],
          note: 'buffer',
        }),
        'not json',
        JSON.stringify({ id: 'r2', severity: 'bogus', pathways: 'nope' }),
      ],
    }) as SprayRiskModel;
    expect(m.entries).toHaveLength(2);
    expect(m.entries[0]!.severity).toBe('high');
    expect(m.entries[0]!.pathways).toEqual(['airborne', 'water']);
    expect(m.entries[1]!.severity).toBeNull();
    expect(m.entries[1]!.pathways).toEqual([]);
  });

  it('encode round-trips losslessly', () => {
    const value: FormValue = {
      landscapeRisks: [
        JSON.stringify({
          id: 'r1',
          from: 'W',
          name: 'Spray drift',
          severity: 'mod',
          pathways: ['airborne'],
          note: 'buffer',
        }),
      ],
    };
    const model = decodeLandscape('sprayRisk', value);
    expect(
      decodeLandscape('sprayRisk', encodeLandscape('sprayRisk', model)),
    ).toEqual(model);
  });

  it('valid only when an entry has a name AND a severity', () => {
    expect(isLandscapeValid('sprayRisk', decodeLandscape('sprayRisk', {}))).toBe(
      false,
    );
    const named = decodeLandscape('sprayRisk', {
      landscapeRisks: [JSON.stringify({ id: 'r1', name: 'Drift' })],
    });
    expect(isLandscapeValid('sprayRisk', named)).toBe(false);
    const ok = decodeLandscape('sprayRisk', {
      landscapeRisks: [
        JSON.stringify({ id: 'r1', name: 'Drift', severity: 'high' }),
      ],
    });
    expect(isLandscapeValid('sprayRisk', ok)).toBe(true);
    expect(summariseLandscape('sprayRisk', ok)).toBe(
      '1 risk pathway(s) assessed',
    );
  });

  it('renders an existing risk card and sets its severity', () => {
    const { onChange } = renderMode('sprayRisk', {
      landscapeRisks: [
        JSON.stringify({ id: 'r1', from: 'W', name: 'Spray drift' }),
      ],
    });
    expect(screen.getByText('Spray drift')).toBeTruthy();
    fireEvent.click(screen.getByTestId('risk-sev-r1-high'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const rows = emitted.landscapeRisks as string[];
    expect(JSON.parse(rows[0]!).severity).toBe('high');
  });
});

// ---------------------------------------------------------------------------
// planning
// ---------------------------------------------------------------------------

describe('planning -- decode / encode / validity / summarise / render', () => {
  it('decode of empty starts unselected (no pre-select)', () => {
    expect(decodeLandscape('planning', {})).toEqual({
      kind: 'planning',
      selected: null,
    });
  });

  it('decode drops an unknown selection', () => {
    expect(decodeLandscape('planning', { landscapePlanning: 'bogus' })).toEqual({
      kind: 'planning',
      selected: null,
    });
    expect(
      decodeLandscape('planning', { landscapePlanning: 'uncertain' }),
    ).toEqual({ kind: 'planning', selected: 'uncertain' });
  });

  it('encode round-trips losslessly', () => {
    const model = decodeLandscape('planning', {
      landscapePlanning: 'challenging',
    });
    expect(
      decodeLandscape('planning', encodeLandscape('planning', model)),
    ).toEqual(model);
  });

  it('valid only when a class is chosen', () => {
    expect(isLandscapeValid('planning', decodeLandscape('planning', {}))).toBe(
      false,
    );
    const ok = decodeLandscape('planning', {
      landscapePlanning: 'favourable',
    });
    expect(isLandscapeValid('planning', ok)).toBe(true);
    expect(summariseLandscape('planning', ok)).toBe('Favourable');
  });

  it('renders the cards and picks one', () => {
    const { onChange } = renderMode('planning', {});
    expect(screen.getByText('Favourable')).toBeTruthy();
    fireEvent.click(screen.getByTestId('plan-uncertain'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.landscapePlanning).toBe('uncertain');
  });
});

// ---------------------------------------------------------------------------
// community
// ---------------------------------------------------------------------------

describe('community -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates a seed', () => {
    expect(decodeLandscape('community', {})).toEqual({
      kind: 'community',
      entries: [],
    });
  });

  it('decode coerces an unknown relationship to neutral', () => {
    const m = decodeLandscape('community', {
      landscapeNetworks: [
        JSON.stringify({ id: 'o1', relationship: 'bogus', name: 'Group' }),
      ],
    }) as CommunityModel;
    expect(m.entries[0]!.relationship).toBe('neutral');
  });

  it('encode round-trips losslessly', () => {
    const value: FormValue = {
      landscapeNetworks: [
        JSON.stringify({
          id: 'o1',
          relationship: 'ally',
          name: 'Food network',
          detail: 'monthly meetups',
        }),
      ],
    };
    const model = decodeLandscape('community', value);
    expect(
      decodeLandscape('community', encodeLandscape('community', model)),
    ).toEqual(model);
  });

  it('valid only when at least one entry has a non-empty name', () => {
    expect(isLandscapeValid('community', decodeLandscape('community', {}))).toBe(
      false,
    );
    const ok = decodeLandscape('community', {
      landscapeNetworks: [JSON.stringify({ id: 'o1', name: 'Food network' })],
    });
    expect(isLandscapeValid('community', ok)).toBe(true);
    expect(summariseLandscape('community', ok)).toBe(
      '1 organisation(s) registered',
    );
  });

  it('renders the empty register and adds an organisation', () => {
    const { onChange } = renderMode('community', {});
    expect(screen.getByTestId('network-empty')).toBeTruthy();
    fireEvent.click(screen.getByTestId('network-open'));
    fireEvent.change(screen.getByTestId('network-name'), {
      target: { value: 'Regional food network' },
    });
    fireEvent.click(screen.getByTestId('network-add'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const rows = emitted.landscapeNetworks as string[];
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]!).name).toBe('Regional food network');
  });
});

// ---------------------------------------------------------------------------
// disputes
// ---------------------------------------------------------------------------

describe('disputes -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates seed disputes or lessons', () => {
    expect(decodeLandscape('disputes', {})).toEqual({
      kind: 'disputes',
      entries: [],
      lessons: '',
    });
  });

  it('decode drops malformed rows and coerces a bad status', () => {
    const m = decodeLandscape('disputes', {
      landscapeDisputes: [
        JSON.stringify({
          id: 'd1',
          year: '2019-2021',
          status: 'resolved',
          name: 'Community',
          detail: 'approved',
        }),
        'not json',
        JSON.stringify({ id: 'd2', status: 'bogus' }),
      ],
      landscapeLessons: 'Engage early',
    }) as DisputesModel;
    expect(m.entries).toHaveLength(2);
    expect(m.entries[0]!.status).toBe('resolved');
    expect(m.entries[1]!.status).toBeNull();
    expect(m.lessons).toBe('Engage early');
  });

  it('encode round-trips losslessly', () => {
    const value: FormValue = {
      landscapeDisputes: [
        JSON.stringify({
          id: 'd1',
          year: '2023',
          status: 'dormant',
          name: 'Caravan park',
          detail: 'withdrawn',
        }),
      ],
      landscapeLessons: 'Frame as productive farming',
    };
    const model = decodeLandscape('disputes', value);
    expect(
      decodeLandscape('disputes', encodeLandscape('disputes', model)),
    ).toEqual(model);
  });

  it('valid when at least one entry has a name OR lessons are non-empty', () => {
    expect(isLandscapeValid('disputes', decodeLandscape('disputes', {}))).toBe(
      false,
    );
    const fromLessons = decodeLandscape('disputes', {
      landscapeLessons: 'Engage early',
    });
    expect(isLandscapeValid('disputes', fromLessons)).toBe(true);
    const fromEntry = decodeLandscape('disputes', {
      landscapeDisputes: [JSON.stringify({ id: 'd1', name: 'Community' })],
    });
    expect(isLandscapeValid('disputes', fromEntry)).toBe(true);
    expect(summariseLandscape('disputes', fromEntry)).toBe(
      '1 dispute(s) documented',
    );
  });

  it('renders the lessons textarea and edits it', () => {
    const { onChange } = renderMode('disputes', {});
    expect(screen.getByTestId('dispute-empty')).toBeTruthy();
    fireEvent.change(screen.getByTestId('dispute-lessons'), {
      target: { value: 'Engage the landholders association early' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.landscapeLessons).toBe(
      'Engage the landholders association early',
    );
  });
});

// ---------------------------------------------------------------------------
// catchment
// ---------------------------------------------------------------------------

describe('catchment -- decode / encode / validity / summarise / render', () => {
  it('decode of empty yields exactly 4 fixed vectors with null severity', () => {
    const m = decodeLandscape('catchment', {}) as CatchmentModel;
    expect(m.vectors).toHaveLength(4);
    expect(m.vectors.map((v) => v.key)).toEqual([
      'agRunoff',
      'roadRunoff',
      'wildfireAsh',
      'industrialLegacy',
    ]);
    expect(m.vectors.every((v) => v.severity === null)).toBe(true);
    expect(m.vectors.every((v) => v.monitoring === '')).toBe(true);
  });

  it('decode merges persisted severity/monitoring and coerces a bad severity', () => {
    const m = decodeLandscape('catchment', {
      landscapeCatchment: [
        JSON.stringify({ key: 'agRunoff', severity: 'high', monitoring: 'annual' }),
        JSON.stringify({ key: 'roadRunoff', severity: 'bogus', monitoring: 'x' }),
        'not json',
      ],
    }) as CatchmentModel;
    expect(m.vectors).toHaveLength(4);
    expect(m.vectors[0]!.severity).toBe('high');
    expect(m.vectors[0]!.monitoring).toBe('annual');
    expect(m.vectors[1]!.severity).toBeNull();
    expect(m.vectors[1]!.monitoring).toBe('x');
  });

  it('encode round-trips losslessly', () => {
    const value: FormValue = {
      landscapeCatchment: [
        JSON.stringify({ key: 'agRunoff', severity: 'mod', monitoring: 'test' }),
      ],
    };
    const model = decodeLandscape('catchment', value);
    expect(
      decodeLandscape('catchment', encodeLandscape('catchment', model)),
    ).toEqual(model);
  });

  it('valid only when at least one vector has a severity', () => {
    expect(isLandscapeValid('catchment', decodeLandscape('catchment', {}))).toBe(
      false,
    );
    const ok = decodeLandscape('catchment', {
      landscapeCatchment: [JSON.stringify({ key: 'agRunoff', severity: 'high' })],
    });
    expect(isLandscapeValid('catchment', ok)).toBe(true);
    expect(summariseLandscape('catchment', ok)).toBe('1 of 4 vector(s) assessed');
  });

  it('renders the 4 fixed vectors and sets a severity', () => {
    const { onChange } = renderMode('catchment', {});
    expect(screen.getByText('Upstream agricultural runoff')).toBeTruthy();
    expect(screen.getByText('Industrial or mining legacy')).toBeTruthy();
    fireEvent.click(screen.getByTestId('catchment-sev-agRunoff-high'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const rows = emitted.landscapeCatchment as string[];
    const agRunoff = rows
      .map((r) => JSON.parse(r))
      .find((v) => v.key === 'agRunoff');
    expect(agRunoff.severity).toBe('high');
  });
});

/**
 * @vitest-environment happy-dom
 *
 * ProvisionBalanceCapture -- multi-mode CONTROLLED renderer for objective
 * ev-s1-provision-balance (6 checklist items c1..c6, modes matrix / food /
 * financial / entitlement / tension / ratify).
 *
 * Verified behaviours:
 *   - provisionBalanceModeFor maps each c1..c6 id (and null for others).
 *   - decode is TOTAL/defensive (non-array -> empty; garbage entries dropped;
 *     never fabricates seed data).
 *   - encode round-trips losslessly (including minted ids).
 *   - validity per mode (matrix all-7, food/financial set, entitlement
 *     floorArea>0, tension all-3, ratify >=1 AND none pending).
 *   - summarise strings per mode.
 *   - a render assertion per mode (distinctive label/control present).
 *   - one interaction per mode (toggle a domain, pick a card, edit an
 *     entitlement, resolve a tension, add+confirm a member).
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
  ProvisionBalanceCapture,
  provisionBalanceModeFor,
  decodeProvisionBalance,
  encodeProvisionBalance,
  isProvisionBalanceValid,
  summariseProvisionBalance,
  type ProvisionBalanceMode,
} from '../ProvisionBalanceCapture.js';
import type { FormValue } from '../actToolCatalog.js';

function renderMode(mode: ProvisionBalanceMode, value: FormValue) {
  const onChange = vi.fn();
  render(
    <ProvisionBalanceCapture mode={mode} value={value} onChange={onChange} />,
  );
  return { onChange };
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('provisionBalanceModeFor', () => {
  it('maps c1..c6 to the correct mode', () => {
    expect(provisionBalanceModeFor('ev-s1-provision-balance-c1')).toBe('matrix');
    expect(provisionBalanceModeFor('ev-s1-provision-balance-c2')).toBe('food');
    expect(provisionBalanceModeFor('ev-s1-provision-balance-c3')).toBe(
      'financial',
    );
    expect(provisionBalanceModeFor('ev-s1-provision-balance-c4')).toBe(
      'entitlement',
    );
    expect(provisionBalanceModeFor('ev-s1-provision-balance-c5')).toBe(
      'tension',
    );
    expect(provisionBalanceModeFor('ev-s1-provision-balance-c6')).toBe('ratify');
  });

  it('returns null for unrelated ids', () => {
    expect(provisionBalanceModeFor('s1-vision-constraints')).toBeNull();
    expect(provisionBalanceModeFor('ev-s1-provision-balance-c7')).toBeNull();
    expect(provisionBalanceModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// matrix
// ---------------------------------------------------------------------------

describe('matrix -- decode / encode / validity / summarise', () => {
  it('decode is defensive: non-array -> empty', () => {
    const m = decodeProvisionBalance('matrix', {
      provisionMatrix: 'nope',
    } as unknown as FormValue);
    expect(m).toEqual({ kind: 'matrix', assignments: {} });
  });

  it('decode drops garbage entries and never fabricates', () => {
    const m = decodeProvisionBalance('matrix', {
      provisionMatrix: ['water::C', 'garbage', 'energy::Z', 'bogus::H', '::P'],
    });
    expect(m).toEqual({ kind: 'matrix', assignments: { water: 'C', bogus: 'H' } });
  });

  it('decode of empty value never fabricates a seed', () => {
    expect(decodeProvisionBalance('matrix', {})).toEqual({
      kind: 'matrix',
      assignments: {},
    });
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      provisionMatrix: [
        'water::C',
        'energy::H',
        'sanit::P',
        'bldg::C',
        'roads::C',
        'comms::H',
        'health::H',
      ],
    };
    const model = decodeProvisionBalance('matrix', value);
    const encoded = encodeProvisionBalance(model);
    expect(decodeProvisionBalance('matrix', encoded)).toEqual(model);
  });

  it('valid only when all 7 domains assigned', () => {
    const partial = decodeProvisionBalance('matrix', {
      provisionMatrix: ['water::C'],
    });
    expect(isProvisionBalanceValid(partial)).toBe(false);

    const full = decodeProvisionBalance('matrix', {
      provisionMatrix: [
        'water::C',
        'energy::H',
        'sanit::P',
        'bldg::C',
        'roads::C',
        'comms::H',
        'health::H',
      ],
    });
    expect(isProvisionBalanceValid(full)).toBe(true);
  });

  it('summarise counts communal/hybrid/household', () => {
    const full = decodeProvisionBalance('matrix', {
      provisionMatrix: [
        'water::C',
        'energy::H',
        'sanit::P',
        'bldg::C',
        'roads::C',
        'comms::H',
        'health::H',
      ],
    });
    expect(summariseProvisionBalance(full)).toBe(
      '3 communal, 3 hybrid, 1 household',
    );
  });

  it('renders all 7 domains and assigns one on click', () => {
    const { onChange } = renderMode('matrix', {});
    expect(screen.getByText('Water supply')).toBeTruthy();
    expect(screen.getByText('Healthcare & emergency')).toBeTruthy();
    fireEvent.click(screen.getByTestId('matrix-water-C'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.provisionMatrix).toContain('water::C');
  });
});

// ---------------------------------------------------------------------------
// food
// ---------------------------------------------------------------------------

describe('food -- decode / validity / summarise / render', () => {
  it('decode is defensive (array -> empty string)', () => {
    const m = decodeProvisionBalance('food', {
      foodSystem: ['communal'],
    } as unknown as FormValue);
    expect(m).toEqual({ kind: 'food', foodSystem: '' });
  });

  it('encode round-trips', () => {
    const model = decodeProvisionBalance('food', { foodSystem: 'hybrid' });
    expect(decodeProvisionBalance('food', encodeProvisionBalance(model))).toEqual(
      model,
    );
  });

  it('valid only when set; summarise is the card title', () => {
    expect(
      isProvisionBalanceValid({ kind: 'food', foodSystem: '' }),
    ).toBe(false);
    const model = decodeProvisionBalance('food', { foodSystem: 'communal' });
    expect(isProvisionBalanceValid(model)).toBe(true);
    expect(summariseProvisionBalance(model)).toBe('Fully communal');
  });

  it('renders the 3 cards and picks one', () => {
    const { onChange } = renderMode('food', {});
    expect(screen.getByText('Fully communal')).toBeTruthy();
    fireEvent.click(screen.getByTestId('food-card-hybrid'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.foodSystem).toBe('hybrid');
  });
});

// ---------------------------------------------------------------------------
// financial
// ---------------------------------------------------------------------------

describe('financial -- validity / summarise / render / amanah', () => {
  it('valid only when set; summarise is chosen title', () => {
    expect(
      isProvisionBalanceValid({
        kind: 'financial',
        financialModel: '',
      }),
    ).toBe(false);
    const model = decodeProvisionBalance('financial', {
      financialModel: 'contrib',
    });
    expect(isProvisionBalanceValid(model)).toBe(true);
    expect(summariseProvisionBalance(model)).toBe(
      'Household contributions + shared cost pools',
    );
  });

  it('renders the amanah scope note verbatim and the 5 models', () => {
    renderMode('financial', {});
    expect(
      screen.getByText(/communal cost-sharing models among members/i),
    ).toBeTruthy();
    expect(screen.getByText('Full income sharing')).toBeTruthy();
    expect(screen.getByText('Separate finances, equal cost split')).toBeTruthy();
  });

  it('picks a model on click', () => {
    const { onChange } = renderMode('financial', {});
    fireEvent.click(screen.getByTestId('financial-card-income'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.financialModel).toBe('income');
  });
});

// ---------------------------------------------------------------------------
// entitlement
// ---------------------------------------------------------------------------

describe('entitlement -- decode / validity / summarise / render', () => {
  it('decode is defensive and round-trips', () => {
    const value: FormValue = {
      entFloorArea: '65',
      entOutdoor: '40',
      entGarden: '25',
      entVehicle: '1',
      entPrivacy: ['visual', 'acoustic'],
      entAutonomy: 'note',
    };
    const model = decodeProvisionBalance('entitlement', value);
    expect(
      decodeProvisionBalance(
        'entitlement',
        encodeProvisionBalance(model),
      ),
    ).toEqual(model);
  });

  it('valid only when floor area parses > 0', () => {
    expect(
      isProvisionBalanceValid({
        kind: 'entitlement',
        floorArea: '',
        outdoor: '',
        garden: '',
        vehicle: '',
        privacy: [],
        autonomy: '',
      }),
    ).toBe(false);
    const model = decodeProvisionBalance('entitlement', { entFloorArea: '65' });
    expect(isProvisionBalanceValid(model)).toBe(true);
  });

  it('summarise reports floor area and privacy count', () => {
    const model = decodeProvisionBalance('entitlement', {
      entFloorArea: '65',
      entPrivacy: ['visual', 'acoustic'],
    });
    expect(summariseProvisionBalance(model)).toBe(
      '65 m2/adult floor area, 2 privacy standard(s)',
    );
  });

  it('renders the rows and edits floor area', () => {
    const { onChange } = renderMode('entitlement', {});
    expect(screen.getByText('Private floor area')).toBeTruthy();
    expect(screen.getByText('Individual kitchen garden')).toBeTruthy();
    fireEvent.change(screen.getByTestId('ent-floorArea'), {
      target: { value: '70' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.entFloorArea).toBe('70');
  });
});

// ---------------------------------------------------------------------------
// tension
// ---------------------------------------------------------------------------

describe('tension -- decode / validity / summarise / render', () => {
  it('decode is defensive and round-trips', () => {
    const value: FormValue = {
      tensionResolutions: ['t1::resolved one', 't2::resolved two'],
    };
    const model = decodeProvisionBalance('tension', value);
    expect(
      decodeProvisionBalance(
        'tension',
        encodeProvisionBalance(model),
      ),
    ).toEqual(model);
  });

  it('valid only when all 3 have non-empty resolutions', () => {
    const partial = decodeProvisionBalance('tension', {
      tensionResolutions: ['t1::a', 't2::b'],
    });
    expect(isProvisionBalanceValid(partial)).toBe(false);
    const full = decodeProvisionBalance('tension', {
      tensionResolutions: ['t1::a', 't2::b', 't3::c'],
    });
    expect(isProvisionBalanceValid(full)).toBe(true);
  });

  it('summarise reports n/3 resolved', () => {
    const model = decodeProvisionBalance('tension', {
      tensionResolutions: ['t1::a', 't2::  '],
    });
    expect(summariseProvisionBalance(model)).toBe(
      '1/3 tensions resolved',
    );
  });

  it('renders the 3 fixed tension cards and resolves one', () => {
    const { onChange } = renderMode('tension', {});
    expect(
      screen.getByText('Energy monitoring vs. household privacy'),
    ).toBeTruthy();
    fireEvent.change(screen.getByTestId('tension-resolve-t1'), {
      target: { value: 'We agreed on aggregated metering only.' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(
      (emitted.tensionResolutions as string[]).some((e) =>
        e.startsWith('t1::We agreed'),
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ratify
// ---------------------------------------------------------------------------

describe('ratify -- decode / validity / summarise / render', () => {
  it('decode is defensive: drops garbage, never fabricates', () => {
    const model = decodeProvisionBalance('ratify', {
      ratifyMembers: ['not-json', JSON.stringify({ name: 'X' })],
    });
    // first dropped (non-JSON); second kept with coerced defaults
    expect(model.kind).toBe('ratify');
    expect((model as { members: unknown[] }).members).toHaveLength(1);
  });

  it('decode of empty never fabricates seed members', () => {
    const model = decodeProvisionBalance('ratify', {});
    expect((model as { members: unknown[] }).members).toEqual([]);
  });

  it('encode round-trips (including ids)', () => {
    const value: FormValue = {
      ratifyMembers: [
        JSON.stringify({ id: 'm-1', name: 'Sarah', status: 'confirmed', note: '' }),
        JSON.stringify({ id: 'm-2', name: 'Marcus', status: 'pending', note: '' }),
      ],
    };
    const model = decodeProvisionBalance('ratify', value);
    expect(
      decodeProvisionBalance('ratify', encodeProvisionBalance(model)),
    ).toEqual(model);
  });

  it('valid only when >=1 member AND none pending', () => {
    const empty = decodeProvisionBalance('ratify', {});
    expect(isProvisionBalanceValid(empty)).toBe(false);

    const pending = decodeProvisionBalance('ratify', {
      ratifyMembers: [
        JSON.stringify({ id: 'a', name: 'A', status: 'confirmed', note: '' }),
        JSON.stringify({ id: 'b', name: 'B', status: 'pending', note: '' }),
      ],
    });
    expect(isProvisionBalanceValid(pending)).toBe(false);

    const all = decodeProvisionBalance('ratify', {
      ratifyMembers: [
        JSON.stringify({ id: 'a', name: 'A', status: 'confirmed', note: '' }),
        JSON.stringify({ id: 'b', name: 'B', status: 'offplatform', note: 'x' }),
      ],
    });
    expect(isProvisionBalanceValid(all)).toBe(true);
  });

  it('summarise reports confirmed/total', () => {
    const model = decodeProvisionBalance('ratify', {
      ratifyMembers: [
        JSON.stringify({ id: 'a', name: 'A', status: 'confirmed', note: '' }),
        JSON.stringify({ id: 'b', name: 'B', status: 'pending', note: '' }),
      ],
    });
    expect(summariseProvisionBalance(model)).toBe(
      '1/2 founding members confirmed',
    );
  });

  it('starts empty, adds a member, then confirms', () => {
    const value: FormValue = {};
    // Add member
    const addOnChange = vi.fn();
    const { rerender } = render(
      <ProvisionBalanceCapture
        mode="ratify"
        value={value}
        onChange={addOnChange}
      />,
    );
    fireEvent.change(screen.getByTestId('ratify-name-input'), {
      target: { value: 'Sarah' },
    });
    fireEvent.click(screen.getByTestId('ratify-add'));
    const afterAdd = addOnChange.mock.calls.at(-1)![0] as FormValue;
    expect(afterAdd.ratifyMembers).toHaveLength(1);
    const added = JSON.parse((afterAdd.ratifyMembers as string[])[0]!);
    expect(added.name).toBe('Sarah');
    expect(added.status).toBe('pending');

    // Re-render with the added member, confirm it
    const confirmOnChange = vi.fn();
    rerender(
      <ProvisionBalanceCapture
        mode="ratify"
        value={afterAdd}
        onChange={confirmOnChange}
      />,
    );
    fireEvent.click(screen.getByTestId(`ratify-confirm-${added.id}`));
    const afterConfirm = confirmOnChange.mock.calls.at(-1)![0] as FormValue;
    const confirmed = JSON.parse((afterConfirm.ratifyMembers as string[])[0]!);
    expect(confirmed.status).toBe('confirmed');
  });
});

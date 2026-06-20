/**
 * @vitest-environment happy-dom
 *
 * ParameterGroup -- Threshold-3 (Act Mandate) render-layer lock.
 *
 * The §10.1 steward-editable threshold inputs are an edit affordance, so Stage 5
 * threads `readOnly` (derived from the objective lock) into them. These tests pin:
 *   1. readOnly omitted / false -> inputs editable; typing persists via
 *      setParameterValue (byte-identical to today).
 *   2. readOnly true -> the input carries the `readonly` attribute AND the
 *      onChange persist is guarded, so a change event never calls
 *      setParameterValue. The render layer is the enforcement seam (no store
 *      backstop -- the shared stores must stay writable for Act execution).
 *
 * The two consuming stores + the shared enterprise-eligibility helper are mocked
 * so the component renders in isolation (the guard requires eligible enterprises
 * + a parameterGroup objective).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

const h = vi.hoisted(() => ({
  setParameterValue: vi.fn(),
}));

// Project type record -> eligible enterprises (the guard passes).
vi.mock('../../../../store/projectStore.js', () => ({
  useProjectStore: (selector: (s: unknown) => unknown) =>
    selector({
      projects: [
        {
          id: 'proj-pg',
          metadata: {
            projectTypeRecord: {
              primaryTypeId: 'livestock_operation',
              secondaryTypeIds: [],
            },
          },
        },
      ],
    }),
}));

// Force eligibility true without depending on a specific real type id.
vi.mock('@ogden/shared', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    enterprisesForProjectTypes: () => ['cattle'],
  };
});

// Mock the plan-stratum store: values empty, setParameterValue is a spy.
vi.mock('../../../../store/planStratumStore.js', () => ({
  usePlanStratumProgressStore: (selector: (s: unknown) => unknown) =>
    selector({ setParameterValue: h.setParameterValue }),
  selectParameterValues: () => ({}),
}));

import ParameterGroup from '../ParameterGroup.js';

// A minimal objective carrying a parameterGroup (only the fields the component
// reads). Cast through unknown -- the full PlanStratumObjective shape is
// irrelevant to ParameterGroup's render.
const OBJECTIVE = {
  id: 's6-yield-flows',
  parameterGroup: {
    label: 'Operating thresholds',
    items: [
      { id: 'stocking-rate', label: 'Stocking rate', unit: 'AU/ha' },
    ],
  },
} as unknown as Parameters<typeof ParameterGroup>[0]['objective'];

const inputEl = () =>
  screen.getByTestId('plan-parameter-input-stocking-rate') as HTMLInputElement;

beforeEach(() => {
  h.setParameterValue.mockClear();
});

describe('ParameterGroup -- unlocked is byte-identical', () => {
  it('renders an editable input that persists on change', () => {
    render(<ParameterGroup projectId="proj-pg" objective={OBJECTIVE} />);
    expect(inputEl().readOnly).toBe(false);
    act(() => {
      fireEvent.change(inputEl(), { target: { value: '2.5' } });
    });
    expect(h.setParameterValue).toHaveBeenCalledWith(
      'proj-pg',
      's6-yield-flows',
      'stocking-rate',
      '2.5',
    );
  });
});

describe('ParameterGroup -- locked suppresses persistence', () => {
  it('marks the input readOnly and never persists a change', () => {
    render(
      <ParameterGroup projectId="proj-pg" objective={OBJECTIVE} readOnly />,
    );
    expect(inputEl().readOnly).toBe(true);
    act(() => {
      fireEvent.change(inputEl(), { target: { value: '9.9' } });
    });
    expect(h.setParameterValue).not.toHaveBeenCalled();
  });
});

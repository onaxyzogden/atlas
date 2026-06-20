/**
 * @vitest-environment happy-dom
 *
 * RealityCheckSurface -- the center-canvas takeover PlanTierShell mounts on the
 * `plan/threshold/$thresholdId` route in place of the editable map. These tests
 * pin the two invariants that the (unmountable, WebGL-heavy) PlanTierShell route
 * test would otherwise own:
 *   1. NO map/WebGL ever mounts on this surface (the whole point of the takeover);
 *   2. the surface owns the Phase 1 (Review) <-> Phase 2 (Direction) switch,
 *      driven by `phase1Ready`.
 * Inputs are read from the same live stores the shell uses; with the stores empty
 * the intent list is simply empty, which is enough to exercise the phase switch.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, act, within } from '@testing-library/react';

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

import { useRealityCheckStore } from '../../../../store/realityCheckStore.js';
import { REALITY_CHECK_COPY } from '../realityCheckModel.js';
import RealityCheckSurface from '../RealityCheckSurface.js';

const PID = 'project-1';

function renderSurface() {
  return render(
    <RealityCheckSurface
      projectId={PID}
      projectName="Hillside Farm"
      objectives={[]}
      objectiveStatuses={{}}
    />,
  );
}

beforeEach(() => {
  useRealityCheckStore.setState({ byProject: {} });
});

describe('RealityCheckSurface', () => {
  it('renders the amber Threshold-1 mode header', () => {
    renderSurface();
    expect(screen.getByText(REALITY_CHECK_COPY.modeLabel)).toBeTruthy();
    expect(screen.getByText(REALITY_CHECK_COPY.title)).toBeTruthy();
  });

  it('mounts NO map / canvas / WebGL on the threshold surface', () => {
    const { container } = renderSurface();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.maplibregl-map')).toBeNull();
  });

  it('starts in Review and switches to Direction when phase1Ready is set', () => {
    renderSurface();
    const surface = screen.getByTestId('reality-check-surface');
    expect(surface.getAttribute('data-phase')).toBe('review');
    expect(screen.getByTestId('threshold-review')).toBeTruthy();

    // Flip the gate the way the proceed button does.
    act(() => {
      useRealityCheckStore.getState().setPhase1Ready(PID, true);
    });
    expect(
      screen.getByTestId('reality-check-surface').getAttribute('data-phase'),
    ).toBe('direction');
    expect(screen.getByTestId('threshold-direction')).toBeTruthy();
  });

  it('renders the "what this threshold does not do" reassurance block (parity with T2/T3)', () => {
    renderSurface();
    const list = screen.getByRole('list', {
      name: /what this threshold does not do/i,
    });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(REALITY_CHECK_COPY.notList.length);
    // Every authored "does not" line is present verbatim.
    for (const line of REALITY_CHECK_COPY.notList) {
      expect(within(list).getByText(line)).toBeTruthy();
    }
  });
});

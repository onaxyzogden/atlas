/**
 * @vitest-environment happy-dom
 *
 * RealityCheckReferenceRail -- the read-only right-rail digest for Threshold 1.
 * A smoke test: it mounts against the live stores, shows the two-phase progress
 * digest and the not-yet-approved state, and raises NO Amanah advisory when no
 * CSA-like text is present. (The CSA-detection path is identical to the Phase-2
 * card's and is pinned in ThresholdDirectionPhase + realityCheckModel tests.)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';

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
import RealityCheckReferenceRail from '../RealityCheckReferenceRail.js';

const PID = 'project-1';

beforeEach(() => {
  useRealityCheckStore.setState({ byProject: {} });
});

describe('RealityCheckReferenceRail', () => {
  it('mounts the progress digest and shows the not-yet-approved state', () => {
    render(
      <RealityCheckReferenceRail
        projectId={PID}
        objectives={[]}
        objectiveStatuses={{}}
      />,
    );
    expect(screen.getByTestId('reality-check-rail')).toBeTruthy();
    expect(screen.getByText(/Not yet approved/i)).toBeTruthy();
    // No CSA-like input anywhere -> no advisory.
    expect(screen.queryByTestId('csa-advisory-rail')).toBeNull();
  });

  it('reflects approval once the store is approved', () => {
    useRealityCheckStore.getState().approve(PID, 1700000000000);
    render(
      <RealityCheckReferenceRail
        projectId={PID}
        objectives={[]}
        objectiveStatuses={{}}
      />,
    );
    expect(screen.getByText('Approved')).toBeTruthy();
  });
});

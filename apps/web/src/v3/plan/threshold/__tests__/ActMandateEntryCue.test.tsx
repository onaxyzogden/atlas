/**
 * @vitest-environment happy-dom
 *
 * ActMandateEntryCue -- the deliberate Plan-only doorway into Threshold 3,
 * mounted in the PlanTierShell objective detail beside CoherenceGateBanner.
 * These tests pin the self-gating + navigation contract:
 *   1. it renders NOTHING off the terminal Launch-Preparation stratum (s7) -- so
 *      it cannot appear on any design / reading stratum;
 *   2. on s7 it renders the green Threshold-3 cue (pill + title + entry button);
 *   3. pressing the button navigates to the threshold-3 route -- it never arms a
 *      lock here (Begin Act, on the surface itself, is the only gate).
 *
 * The cue is decoupled from the spine: the T3 divider stays decorative, so this
 * cue (and a deep-link) are the only deliberate entrances.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({
  navigateSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => h.navigateSpy,
}));

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

import { ACT_MANDATE_COPY, LAUNCH_PREP_STRATUM_ID } from '../actMandateModel.js';
import ActMandateEntryCue from '../ActMandateEntryCue.js';

const PID = 'project-entry-cue-1';

beforeEach(() => {
  h.navigateSpy.mockClear();
});

describe('ActMandateEntryCue', () => {
  it('renders nothing off the terminal Launch-Preparation stratum', () => {
    const { container, rerender } = render(
      <ActMandateEntryCue projectId={PID} stratumId="s5-system-design" />,
    );
    expect(container.querySelector('[data-testid="act-mandate-entry-cue"]')).toBeNull();

    // Also silent for an earlier design stratum and for null/undefined.
    rerender(<ActMandateEntryCue projectId={PID} stratumId="s6-integration-design" />);
    expect(container.querySelector('[data-testid="act-mandate-entry-cue"]')).toBeNull();
    rerender(<ActMandateEntryCue projectId={PID} stratumId={null} />);
    expect(container.querySelector('[data-testid="act-mandate-entry-cue"]')).toBeNull();
  });

  it('renders the green Threshold-3 cue on the terminal stratum (s7)', () => {
    render(
      <ActMandateEntryCue projectId={PID} stratumId={LAUNCH_PREP_STRATUM_ID} />,
    );
    expect(screen.getByTestId('act-mandate-entry-cue')).toBeTruthy();
    expect(screen.getByText(ACT_MANDATE_COPY.entryCue.pill)).toBeTruthy();
    expect(screen.getByText(ACT_MANDATE_COPY.entryCue.title)).toBeTruthy();
    const btn = screen.getByTestId('act-mandate-enter-button');
    expect(btn.textContent).toContain(ACT_MANDATE_COPY.entryCue.button);
  });

  it('navigates to the threshold-3 route on press -- arming no lock', () => {
    render(
      <ActMandateEntryCue projectId={PID} stratumId={LAUNCH_PREP_STRATUM_ID} />,
    );
    act(() => {
      fireEvent.click(screen.getByTestId('act-mandate-enter-button'));
    });
    expect(h.navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/v3/project/$projectId/plan/threshold/$thresholdId',
        params: { projectId: PID, thresholdId: 'threshold-3' },
      }),
    );
  });
});

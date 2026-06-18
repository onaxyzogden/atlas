/**
 * @vitest-environment happy-dom
 *
 * CoherenceGateBanner -- the SOFT Threshold-2 seal banner (Stage 5). These tests
 * pin the gate's defining promise: it is a DERIVED, DISPLAY-ONLY banner that
 * never blocks navigation and never touches a prerequisite.
 *   - Off a downstream (s6 / s7) stratum it renders nothing.
 *   - On a downstream stratum, unsealed -> the "not yet sealed" reminder, with a
 *     shortcut that NAVIGATES to Threshold 2 (it does NOT lock the surface).
 *   - On a downstream stratum, sealed -> the calm "sealed" reading + a review
 *     link (which also navigates, never blocks).
 *
 * The banner reads `sealedAt` straight from the real coherenceCheckStore (driven
 * through its public `seal` action), exactly as it does at runtime. `useNavigate`
 * returns a spy so the soft-gate proof is observable.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({ navigateSpy: vi.fn() }));

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

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => h.navigateSpy,
}));

import { useCoherenceCheckStore } from '../../../../store/coherenceCheckStore.js';
import { COHERENCE_GATE_COPY } from '../coherenceCheckModel.js';
import CoherenceGateBanner from '../CoherenceGateBanner.js';

const PID = 'project-coherence-gate-1';

function renderBanner(stratumId: string | null) {
  return render(<CoherenceGateBanner projectId={PID} stratumId={stratumId} />);
}

beforeEach(() => {
  useCoherenceCheckStore.setState({ byProject: {} });
  h.navigateSpy.mockClear();
});

// ---------------------------------------------------------------------------
// Scope: only the two downstream strata (s6 / s7)
// ---------------------------------------------------------------------------

describe('CoherenceGateBanner -- downstream scope', () => {
  it('renders nothing off s6 / s7 (design + reception details undisturbed)', () => {
    for (const stratumId of [
      's4-foundation-decisions',
      's5-system-design',
      's3-systems-reading',
      null,
    ]) {
      const { container, unmount } = renderBanner(stratumId);
      expect(
        container.querySelector('[data-testid="coherence-check-gate"]'),
      ).toBeNull();
      unmount();
    }
  });

  it('renders the gate on each downstream stratum (s6, s7)', () => {
    for (const stratumId of ['s6-integration-design', 's7-phasing-resourcing']) {
      const { container, unmount } = renderBanner(stratumId);
      expect(
        container.querySelector('[data-testid="coherence-check-gate"]'),
      ).not.toBeNull();
      unmount();
    }
  });
});

// ---------------------------------------------------------------------------
// Pending: the soft reminder -- never blocks
// ---------------------------------------------------------------------------

describe('CoherenceGateBanner -- pending (unsealed)', () => {
  it('arms the "not yet sealed" reminder with an Open Threshold 2 shortcut', () => {
    renderBanner('s6-integration-design');
    const gate = screen.getByTestId('coherence-check-gate');
    expect(gate.getAttribute('data-state')).toBe('pending');
    expect(screen.getByText(COHERENCE_GATE_COPY.pending.title)).toBeTruthy();
    expect(screen.getByTestId('coherence-gate-open-threshold')).toBeTruthy();
  });

  it('SOFT GATE: the shortcut navigates to Threshold 2 -- it does NOT lock the surface', () => {
    renderBanner('s7-phasing-resourcing');
    const btn = screen.getByTestId('coherence-gate-open-threshold');
    // The control is an enabled link-button, never a disabled lock.
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    btn.click();
    expect(h.navigateSpy).toHaveBeenCalledTimes(1);
    expect(h.navigateSpy.mock.calls[0]?.[0]).toMatchObject({
      to: '/v3/project/$projectId/plan/threshold/$thresholdId',
      params: { projectId: PID, thresholdId: 'threshold-2' },
    });
  });
});

// ---------------------------------------------------------------------------
// Sealed: the calm reading -- still navigates, still never blocks
// ---------------------------------------------------------------------------

describe('CoherenceGateBanner -- sealed', () => {
  it('shows the calm sealed reading once the Coherence Record is sealed', () => {
    useCoherenceCheckStore.getState().seal(PID, 1700000000000);
    renderBanner('s6-integration-design');
    const gate = screen.getByTestId('coherence-check-gate');
    expect(gate.getAttribute('data-state')).toBe('sealed');
    expect(screen.getByText(COHERENCE_GATE_COPY.sealed.title)).toBeTruthy();
  });

  it('the sealed reading still navigates to review Threshold 2 (never blocks)', () => {
    useCoherenceCheckStore.getState().seal(PID, 1700000000000);
    renderBanner('s7-phasing-resourcing');
    screen.getByTestId('coherence-gate-open-threshold').click();
    expect(h.navigateSpy.mock.calls[0]?.[0]).toMatchObject({
      params: { projectId: PID, thresholdId: 'threshold-2' },
    });
  });
});

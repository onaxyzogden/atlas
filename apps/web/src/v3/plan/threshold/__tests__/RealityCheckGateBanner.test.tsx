/**
 * @vitest-environment happy-dom
 *
 * RealityCheckGateBanner -- the SOFT Mode-4 gate (Stage D). These tests pin the
 * gate's defining promise: it is a DERIVED, DISPLAY-ONLY banner that never
 * blocks navigation and never touches a prerequisite.
 *   - Off a Mode-4 stratum it renders nothing (Reception surfaces undisturbed).
 *   - On a Mode-4 stratum, unapproved -> the amber "approve Threshold 1 first"
 *     reminder, with a shortcut that navigates (it does NOT lock the surface).
 *   - On a Mode-4 stratum, approved -> the calm "in effect" confirmation plus the
 *     display-only Conditional / Deferred / Released registers.
 *
 * `useRealityCheckData` (the element-derivation hook) is mocked to a hoisted
 * element list -- it is exercised for real in its own test, so here we inject the
 * elements directly and drive the classifications through the real store, which
 * is exactly how the banner reads them at runtime. `useNavigate` returns a spy.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { IntentElement } from '../intentElements.js';

const h = vi.hoisted(() => ({
  elements: [] as IntentElement[],
  navigateSpy: vi.fn(),
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

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => h.navigateSpy,
}));

vi.mock('../useRealityCheckData.js', () => ({
  useRealityCheckData: () => ({ elements: h.elements, perSurvey: {} }),
}));

import { useRealityCheckStore } from '../../../../store/realityCheckStore.js';
import { MODE4_GATE_COPY } from '../realityCheckModel.js';
import RealityCheckGateBanner from '../RealityCheckGateBanner.js';

const PID = 'project-1';

const el = (
  id: string,
  text: string,
  type: IntentElement['type'] = 'committed',
): IntentElement => ({ id, text, type, source: 'classify' });

function renderBanner(stratumId: string) {
  return render(
    <RealityCheckGateBanner
      projectId={PID}
      stratumId={stratumId}
      objectives={[]}
      objectiveStatuses={{}}
    />,
  );
}

beforeEach(() => {
  useRealityCheckStore.setState({ byProject: {} });
  h.elements = [];
  h.navigateSpy.mockClear();
});

// ---------------------------------------------------------------------------
// Scope: only the four Mode-4 (Design) strata
// ---------------------------------------------------------------------------

describe('RealityCheckGateBanner -- Mode-4 scope', () => {
  it('renders nothing off a Mode-4 stratum (Reception detail undisturbed)', () => {
    const { container } = renderBanner('s3-systems-reading');
    expect(container.querySelector('[data-testid="reality-check-gate"]')).toBeNull();
  });

  it('renders the gate on a Mode-4 stratum', () => {
    const { container } = renderBanner('s4-foundation-decisions');
    expect(
      container.querySelector('[data-testid="reality-check-gate"]'),
    ).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pending: the soft reminder -- never blocks
// ---------------------------------------------------------------------------

describe('RealityCheckGateBanner -- pending (unapproved)', () => {
  it('shows the amber reminder and an Open Threshold 1 shortcut', () => {
    renderBanner('s5-system-design');
    const gate = screen.getByTestId('reality-check-gate');
    expect(gate.getAttribute('data-state')).toBe('pending');
    expect(screen.getByText(MODE4_GATE_COPY.pending.title)).toBeTruthy();
    expect(screen.getByTestId('gate-open-threshold')).toBeTruthy();
  });

  it('navigates to Threshold 1 on the shortcut -- it does NOT lock the surface', () => {
    renderBanner('s5-system-design');
    screen.getByTestId('gate-open-threshold').click();
    expect(h.navigateSpy).toHaveBeenCalledTimes(1);
    expect(h.navigateSpy.mock.calls[0]?.[0]).toMatchObject({
      to: '/v3/project/$projectId/plan/threshold/$thresholdId',
      params: { projectId: PID, thresholdId: 'threshold-1' },
    });
  });
});

// ---------------------------------------------------------------------------
// Approved: the display-only direction registers
// ---------------------------------------------------------------------------

describe('RealityCheckGateBanner -- approved (in effect)', () => {
  it('confirms the direction is in effect with an empty conditional register', () => {
    useRealityCheckStore.getState().approve(PID, 1700000000000);
    renderBanner('s6-integration-design');
    const gate = screen.getByTestId('reality-check-gate');
    expect(gate.getAttribute('data-state')).toBe('approved');
    expect(screen.getByText(MODE4_GATE_COPY.approved.title)).toBeTruthy();
    // No elements classified -> the conditional register reads its empty copy.
    expect(screen.getByText(MODE4_GATE_COPY.approved.emptyConditional)).toBeTruthy();
    // Deferred / Released registers are absent when empty.
    expect(screen.queryByTestId('gate-deferred')).toBeNull();
    expect(screen.queryByTestId('gate-released')).toBeNull();
  });

  it('renders the Conditional / Deferred / Released registers from the store', () => {
    h.elements = [
      el('ie-cond', 'Silvopasture grazing', 'committed'),
      el('ie-def', 'Food forest', 'aspirational'),
      el('ie-rel', 'Off-grid power', 'aspirational'),
    ];
    const store = useRealityCheckStore.getState();
    store.classifyElement(PID, 'ie-cond', 'conditional');
    store.annotateClassification(PID, 'ie-cond', {
      condition: 'stock water confirmed first',
    });
    store.classifyElement(PID, 'ie-def', 'deferred');
    store.classifyElement(PID, 'ie-rel', 'released');
    store.annotateClassification(PID, 'ie-rel', { note: 'no viable site' });
    store.approve(PID, 1700000000000);

    renderBanner('s7-phasing-resourcing');

    // Conditional -- the design requirement Mode 4 must satisfy.
    const cond = screen.getByTestId('gate-conditional');
    expect(cond.textContent).toContain('Silvopasture grazing');
    expect(cond.textContent).toContain('stock water confirmed first');

    // Deferred -- retained long-term.
    expect(screen.getByTestId('gate-deferred').textContent).toContain(
      'Food forest',
    );

    // Released -- archived with the steward's note.
    const rel = screen.getByTestId('gate-released');
    expect(rel.textContent).toContain('Off-grid power');
    expect(rel.textContent).toContain('no viable site');
  });
});

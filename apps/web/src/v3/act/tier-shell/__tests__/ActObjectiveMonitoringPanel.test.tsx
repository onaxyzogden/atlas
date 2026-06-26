/**
 * @vitest-environment happy-dom
 *
 * ActObjectiveMonitoringPanel -- the Act-side live monitoring stream. These
 * tests pin the "read the protocol, record into Observe, never let a banned
 * note through" contract:
 *   - the authored indicators / triggers / feed render, each indicator showing
 *     "No reading yet" until something is recorded;
 *   - a clean reading writes a real ObserveDataPoint scoped to the chosen
 *     indicator (matched by measurementValue.label) and the objective, and the
 *     latest reading then surfaces inline;
 *   - a banned-term note (the adversarial guard fixture below is the one
 *     deliberate occurrence in this changeset) raises the non-blocking advisory
 *     AND disables the Record control, and nothing is written to the Observe
 *     substrate (the covenant boundary holds at the UI and the write).
 *
 * Reads the real observeDataPointStore and the shared detectCsaLikeText guard,
 * exactly as at runtime.
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  UNIVERSAL_DOMAIN_LABELS,
  type PlanStratumObjective,
} from '@ogden/shared';

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

import { useObserveDataPointStore } from '../../../../store/observeDataPointStore.js';
import ActObjectiveMonitoringPanel from '../ActObjectiveMonitoringPanel.js';
import { expectNoA11yViolations } from '../../../../test/a11y.js';

const PID = 'project-act-monitoring-1';
const OBJ_ID = 'res-s5-living-infrastructure';

const OBJECTIVE = {
  id: OBJ_ID,
  stratumId: 's5-system-design',
  title: 'Living infrastructure',
  monitoringProtocol: {
    indicators: [
      { metric: 'Greywater flow', frequency: 'weekly' },
      { metric: 'Tank level', frequency: 'daily' },
    ],
    triggers: ['If flow stalls for 48h, inspect the reed bed.'],
    feeds: 'hydrology',
  },
} as unknown as PlanStratumObjective;

const OBJECTIVE_NO_PROTOCOL = {
  id: 'res-s2-no-protocol',
  stratumId: 's2-reception',
  title: 'A reception objective',
} as unknown as PlanStratumObjective;

beforeAll(() => {
  // happy-dom provides crypto.randomUUID, but shim deterministically if absent
  // so the write path never throws in any environment.
  const c = globalThis.crypto as (Crypto & { randomUUID?: () => string }) | undefined;
  if (typeof c?.randomUUID !== 'function') {
    let n = 0;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...(c ?? {}),
        randomUUID: () =>
          `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
      },
    });
  }
});

beforeEach(() => {
  useObserveDataPointStore.setState({ byProject: {} });
});

describe('ActObjectiveMonitoringPanel', () => {
  it('renders nothing when the objective has no monitoring protocol', () => {
    const { container } = render(
      <ActObjectiveMonitoringPanel
        projectId={PID}
        objective={OBJECTIVE_NO_PROTOCOL}
      />,
    );
    expect(
      container.querySelector('[data-testid="act-execution-monitoring"]'),
    ).toBeNull();
  });

  it('renders the authored indicators, triggers, and feed', () => {
    render(<ActObjectiveMonitoringPanel projectId={PID} objective={OBJECTIVE} />);

    expect(screen.getByTestId('act-execution-monitoring')).toBeTruthy();
    // Each metric appears both in the indicator list and as a <select> option.
    expect(screen.getAllByText('Greywater flow').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tank level').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/If flow stalls for 48h, inspect the reed bed\./),
    ).toBeTruthy();
    expect(
      screen.getByText(UNIVERSAL_DOMAIN_LABELS['hydrology']),
    ).toBeTruthy();
    // No readings recorded yet -> both indicators show the empty state.
    expect(screen.getAllByText('No reading yet.').length).toBe(2);
  });

  it('records a clean reading as an ObserveDataPoint scoped to the indicator', () => {
    render(<ActObjectiveMonitoringPanel projectId={PID} objective={OBJECTIVE} />);

    fireEvent.change(screen.getByTestId('monitoring-note-input'), {
      target: { value: 'Flow steady at 4 L/min' },
    });
    fireEvent.click(screen.getByTestId('record-reading-btn'));

    const points = useObserveDataPointStore
      .getState()
      .getByObjective(PID, OBJ_ID);
    expect(points.length).toBe(1);
    const point = points[0]!;
    expect(point.domainId).toBe('hydrology');
    expect(point.sourceObjectiveId).toBe(OBJ_ID);
    expect(point.sourceType).toBe('manual_observation');
    expect(point.capturedBy).toBe('act-tier');
    // Default indicator selection is the first metric.
    expect((point.measurementValue as { label?: string }).label).toBe(
      'Greywater flow',
    );
    expect((point.measurementValue as { note?: string }).note).toBe(
      'Flow steady at 4 L/min',
    );

    // The latest reading now surfaces inline (one indicator left empty).
    expect(screen.getByTestId('monitoring-latest-reading')).toBeTruthy();
    expect(screen.getByText(/Flow steady at 4 L\/min/)).toBeTruthy();
    expect(screen.getAllByText('No reading yet.').length).toBe(1);
  });

  it('blocks a banned-term note at the UI and the write boundary', () => {
    render(<ActObjectiveMonitoringPanel projectId={PID} objective={OBJECTIVE} />);

    fireEvent.change(screen.getByTestId('monitoring-note-input'), {
      target: { value: 'Sold via CSA subscription presale this season' },
    });

    // UI guard: advisory shown + Record disabled.
    expect(screen.getByTestId('monitoring-note-advisory')).toBeTruthy();
    const btn = screen.getByTestId('record-reading-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    // Write guard: clicking the disabled control records nothing.
    fireEvent.click(btn);
    expect(useObserveDataPointStore.getState().getByObjective(PID, OBJ_ID).length).toBe(
      0,
    );
  });
});

describe('ActObjectiveMonitoringPanel (a11y)', () => {
  it('has no axe violations rendering the monitoring protocol (allowlisted rules)', async () => {
    const { container } = render(
      <ActObjectiveMonitoringPanel projectId={PID} objective={OBJECTIVE} />,
    );
    await expectNoA11yViolations(container);
  });
});

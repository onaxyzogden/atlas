/**
 * @vitest-environment happy-dom
 *
 * ActObjectiveLaunchProgress -- the Act-side LIVE launch-milestone tracker.
 * These tests pin the "read the authored milestones, toggle reached, persist,
 * never gate" contract:
 *   - the panel self-gates to null when the objective has no progressTracking;
 *   - the authored milestones render with their metric + cadence;
 *   - toggling a milestone reached persists a { reachedAt, reachedBy } record
 *     through launchMilestoneStore (round-trip via getState) and surfaces the
 *     "Reached {day} . {who}" meta line, with the metric struck off;
 *   - a second click is remove-only -- it clears exactly that one milestone.
 *
 * Reads the real launchMilestoneStore exactly as at runtime. There is no
 * free-text surface here (the toggle writes only a reached record), so -- unlike
 * the monitoring panel -- there is no covenant boundary to assert.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PlanStratumObjective } from '@ogden/shared';

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
  useLaunchMilestoneStore,
  milestonesFor,
} from '../../../../store/launchMilestoneStore.js';
import ActObjectiveLaunchProgress from '../ActObjectiveLaunchProgress.js';

const PID = 'project-act-progress-1';
const OBJ_ID = 'res-s7-launch-readiness';
const M1 = 'Soft-launch occupancy reached';
const M2 = 'Expenditure within budget';

const OBJECTIVE = {
  id: OBJ_ID,
  stratumId: 's7-launch-prep',
  title: 'Launch readiness',
  progressTracking: {
    milestones: [
      { metric: M1, cadence: 'weekly' },
      { metric: M2, cadence: 'monthly' },
    ],
  },
} as unknown as PlanStratumObjective;

const OBJECTIVE_NO_TRACKING = {
  id: 'res-s2-no-tracking',
  stratumId: 's2-reception',
  title: 'A reception objective',
} as unknown as PlanStratumObjective;

const reachedFor = () =>
  milestonesFor(useLaunchMilestoneStore.getState().byProject, PID, OBJ_ID);

beforeEach(() => {
  useLaunchMilestoneStore.setState({ byProject: {} });
});

describe('ActObjectiveLaunchProgress', () => {
  it('renders nothing when the objective has no progressTracking', () => {
    const { container } = render(
      <ActObjectiveLaunchProgress
        projectId={PID}
        objective={OBJECTIVE_NO_TRACKING}
      />,
    );
    expect(
      container.querySelector('[data-testid="act-execution-progress"]'),
    ).toBeNull();
  });

  it('renders the authored milestones with their metric and cadence', () => {
    render(
      <ActObjectiveLaunchProgress projectId={PID} objective={OBJECTIVE} />,
    );

    expect(screen.getByTestId('act-execution-progress')).toBeTruthy();
    expect(screen.getByText(M1)).toBeTruthy();
    expect(screen.getByText(M2)).toBeTruthy();
    expect(screen.getByText('weekly')).toBeTruthy();
    expect(screen.getByText('monthly')).toBeTruthy();
    // Nothing reached yet -> no reached-meta lines.
    expect(screen.queryByTestId('progress-reached-0')).toBeNull();
    expect(screen.queryByTestId('progress-reached-1')).toBeNull();
  });

  it('toggles a milestone reached and persists the record round-trip', () => {
    render(
      <ActObjectiveLaunchProgress projectId={PID} objective={OBJECTIVE} />,
    );

    const toggle = screen.getByTestId('progress-toggle-0') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);

    // Store round-trip: the first milestone now carries a reached record.
    const record = reachedFor()[M1];
    expect(record).toBeDefined();
    expect(record!.reachedBy).toBe('act-tier');
    expect(Number.isNaN(Date.parse(record!.reachedAt))).toBe(false);

    // The second milestone is untouched.
    expect(reachedFor()[M2]).toBeUndefined();

    // The reached-meta line surfaces for the toggled milestone only.
    expect(
      (screen.getByTestId('progress-toggle-0') as HTMLButtonElement).getAttribute(
        'aria-pressed',
      ),
    ).toBe('true');
    expect(screen.getByTestId('progress-reached-0')).toBeTruthy();
    expect(screen.queryByTestId('progress-reached-1')).toBeNull();
  });

  it('a second click clears exactly that milestone (remove-only)', () => {
    render(
      <ActObjectiveLaunchProgress projectId={PID} objective={OBJECTIVE} />,
    );

    const toggle = () =>
      screen.getByTestId('progress-toggle-0') as HTMLButtonElement;

    fireEvent.click(toggle()); // reached
    expect(reachedFor()[M1]).toBeDefined();

    fireEvent.click(toggle()); // un-reached
    expect(M1 in reachedFor()).toBe(false);
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByTestId('progress-reached-0')).toBeNull();
  });
});

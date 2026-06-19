/**
 * @vitest-environment happy-dom
 *
 * ConcernGovernancePanel -- the Plan-only governance review queue for Threshold 3
 * (The Act Mandate). These tests pin the covenant-critical orchestration:
 *   1. self-gates to NOTHING when the project has no concerns (ceremony stays clean);
 *   2. APPROVE lifts the lock just long enough to record an amendment ALONGSIDE the
 *      original, then RE-LOCKS -- the original observation/proposedChange are never
 *      mutated, and the net lock state is unchanged (append-only covenant);
 *   3. DECLINE closes with no amendment and leaves the objective locked;
 *   4. AMANAH: an empty amendment leaves approve disabled (no-op); an amendment that
 *      resembles advance-sale / subscription / CSA framing surfaces the advisory AND
 *      disables approve -- a banned term is never recorded;
 *   5. the Objective 0.2 governance framework is shown as review context, and
 *      `Begin review` transitions raised -> under-review.
 *
 * Reads the REAL planConcernsStore + actMandateStore + visionStore, exactly as at
 * runtime. The 0.2 steward roster is mocked to a fixed two-steward team.
 */

import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

// Concern ids are caller-supplied here, but keep randomUUID present for safety.
const cryptoObj = globalThis.crypto as
  | (Crypto & { randomUUID?: () => string })
  | undefined;
if (cryptoObj && typeof cryptoObj.randomUUID !== 'function') {
  Object.defineProperty(cryptoObj, 'randomUUID', {
    configurable: true,
    value: randomUUID,
  });
} else if (!cryptoObj) {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { randomUUID },
  });
}

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

// Fixed 0.2 roster -- Maya (named, auto-selected reviewer) + Sam (email fallback).
vi.mock('../../../observe/modules/human-context/roster.js', () => ({
  useStewardRoster: () => [
    {
      member: {
        userId: 'u1',
        email: 'maya@farm.test',
        displayName: 'Maya',
        role: 'primary_steward',
        joinedAt: '',
      },
      profile: {},
    },
    {
      member: {
        userId: 'u2',
        email: 'sam@farm.test',
        displayName: null,
        role: 'steward',
        joinedAt: '',
      },
      profile: {},
    },
  ],
}));

import {
  useActMandateStore,
  isObjectiveLocked,
} from '../../../../store/actMandateStore.js';
import { usePlanConcernsStore } from '../../../../store/planConcernsStore.js';
import { useVisionStore } from '../../../../store/visionStore.js';
import { CSA_ADVISORY_COPY } from '../coherenceCheckModel.js';
import ConcernGovernancePanel from '../ConcernGovernancePanel.js';

const PID = 'project-governance-1';
const OBJ = 's5-access';
const T0 = 1700000000000; // deterministic

beforeEach(() => {
  useActMandateStore.setState({ byProject: {} });
  usePlanConcernsStore.setState({ byProject: {} });
  useVisionStore.setState({ visions: [] });
});

/** Arm the mandate so the plan is read-only and OBJ is held. */
function arm(): void {
  act(() => {
    useActMandateStore.getState().beginAct(PID, T0);
  });
}

/** Raise one concern against OBJ with a stable id. */
function raise(
  id: string,
  opts?: { observation?: string; proposedChange?: string },
): void {
  act(() => {
    usePlanConcernsStore.getState().raiseConcern(
      PID,
      {
        objectiveRef: OBJ,
        observation: opts?.observation ?? 'Access road washed out after the storm.',
        proposedChange: opts?.proposedChange ?? 'Re-route via the ridge.',
        raisedBy: 'Sam',
      },
      { id, at: T0 },
    );
  });
}

/** The current PlanConcern by id (after store mutation). */
function concern(id: string) {
  return (usePlanConcernsStore.getState().byProject[PID] ?? []).find(
    (c) => c.id === id,
  );
}

describe('ConcernGovernancePanel', () => {
  it('renders nothing when the project has no concerns', () => {
    arm();
    const { container } = render(<ConcernGovernancePanel projectId={PID} />);
    expect(
      container.querySelector('[data-testid="concern-governance-panel"]'),
    ).toBeNull();
  });

  it('approve lifts then re-locks and records an amendment alongside the untouched original', () => {
    arm();
    raise('c1');
    render(<ConcernGovernancePanel projectId={PID} />);

    // raised -> under-review (begin review), then the amendment field appears.
    act(() => {
      fireEvent.click(screen.getByTestId('concern-review-begin-c1'));
    });
    expect(concern('c1')!.status).toBe('under-review');

    act(() => {
      fireEvent.change(screen.getByTestId('concern-review-amendment-c1'), {
        target: { value: 'Add a culvert at the low crossing.' },
      });
    });
    act(() => {
      fireEvent.click(screen.getByTestId('concern-review-approve-c1'));
    });

    const c = concern('c1')!;
    expect(c.status).toBe('approved');
    expect(c.amendmentText).toBe('Add a culvert at the low crossing.');
    expect(c.reviewedBy).toBe('Maya'); // first roster steward auto-selected
    // Original steward text is never mutated -- amendment is recorded ALONGSIDE.
    expect(c.observation).toBe('Access road washed out after the storm.');
    expect(c.proposedChange).toBe('Re-route via the ridge.');

    // Net lock state unchanged: the objective is held again, NOT in overrides.
    const rec = useActMandateStore.getState().byProject[PID]!;
    expect(isObjectiveLocked(rec, OBJ)).toBe(true);
    expect(OBJ in rec.objectiveOverrides).toBe(false);
  });

  it('decline closes the concern with no amendment and leaves the objective locked', () => {
    arm();
    raise('c2');
    render(<ConcernGovernancePanel projectId={PID} />);

    act(() => {
      fireEvent.click(screen.getByTestId('concern-review-begin-c2'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('concern-review-decline-c2'));
    });

    const c = concern('c2')!;
    expect(c.status).toBe('declined');
    expect(c.amendmentText).toBeUndefined();
    expect(c.reviewedBy).toBe('Maya');

    const rec = useActMandateStore.getState().byProject[PID]!;
    expect(isObjectiveLocked(rec, OBJ)).toBe(true);
    expect(OBJ in rec.objectiveOverrides).toBe(false);
  });

  it('Amanah: empty amendment disables approve; CSA-like amendment advises and is never recorded', () => {
    arm();
    raise('c3');
    render(<ConcernGovernancePanel projectId={PID} />);

    act(() => {
      fireEvent.click(screen.getByTestId('concern-review-begin-c3'));
    });

    // Empty amendment -> approve disabled, nothing recorded.
    expect(
      (screen.getByTestId('concern-review-approve-c3') as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    // CSA-like amendment -> advisory surfaces + approve stays disabled.
    act(() => {
      fireEvent.change(screen.getByTestId('concern-review-amendment-c3'), {
        target: { value: 'Fund it with a monthly subscription box.' },
      });
    });
    expect(screen.getByTestId('concern-review-advisory-c3')).toBeTruthy();
    expect(screen.getByText(CSA_ADVISORY_COPY.title)).toBeTruthy();
    expect(
      (screen.getByTestId('concern-review-approve-c3') as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    // Even if the disabled button is force-clicked, the store hard-rejects it.
    act(() => {
      fireEvent.click(screen.getByTestId('concern-review-approve-c3'));
    });
    const c = concern('c3')!;
    expect(c.status).toBe('under-review');
    expect(c.amendmentText).toBeUndefined();
  });

  it('shows the Objective 0.2 governance framework and transitions raised -> under-review', () => {
    act(() => {
      useVisionStore.getState().ensureDefaults(PID);
      useVisionStore.getState().updateStewardTeam(PID, {
        governance: 'Council of three decides by consensus.',
      });
    });
    arm();
    raise('c4');
    render(<ConcernGovernancePanel projectId={PID} />);

    expect(screen.getByTestId('concern-governance-context')).toBeTruthy();
    expect(
      screen.getByText('Council of three decides by consensus.'),
    ).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getByTestId('concern-review-begin-c4'));
    });
    expect(concern('c4')!.status).toBe('under-review');
  });
});

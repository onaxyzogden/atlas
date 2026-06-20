/**
 * @vitest-environment happy-dom
 *
 * RaiseConcernAffordance -- the Plan-only covenant safety valve for Threshold 3
 * (The Act Mandate). These tests pin:
 *   1. it renders NOTHING when the objective is not HELD (no mandate armed) --
 *      so a normal Plan objective is untouched;
 *   2. once Begin Act arms the lock it renders the green Raise-a-Concern form;
 *   3. submitting a concern appends a `raised` PlanConcern against THIS objective
 *      and shows the acknowledgement;
 *   4. Amanah: free text resembling advance-sale / subscription / CSA framing
 *      surfaces the advisory AND disables submit -- a banned term is never even
 *      submitted (planConcernsStore is the hard persist-boundary backstop).
 *
 * Reads the real actMandateStore (lock) + planConcernsStore (concerns). The 0.2
 * steward roster is mocked to a fixed two-steward team.
 */

import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

// The component generates concern ids via crypto.randomUUID at raise time;
// ensure it is present in the happy-dom env without disturbing the rest of
// the crypto surface (getRandomValues / subtle stay intact).
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

// Fixed 0.2 roster -- Maya (named) + Sam (name falls back to email).
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

import { useActMandateStore } from '../../../../store/actMandateStore.js';
import { usePlanConcernsStore } from '../../../../store/planConcernsStore.js';
import { ACT_MANDATE_COPY } from '../actMandateModel.js';
import { CSA_ADVISORY_COPY } from '../coherenceCheckModel.js';
import RaiseConcernAffordance from '../RaiseConcernAffordance.js';

const PID = 'project-raise-concern-1';
const OBJ = 's5-access';

beforeEach(() => {
  useActMandateStore.setState({ byProject: {} });
  usePlanConcernsStore.setState({ byProject: {} });
});

/** Arm the mandate so OBJ is held. */
function beginAct(): void {
  act(() => {
    useActMandateStore.getState().beginAct(PID, 1700000000000);
  });
}

describe('RaiseConcernAffordance', () => {
  it('renders nothing when the objective is not held (no mandate)', () => {
    const { container } = render(
      <RaiseConcernAffordance projectId={PID} objectiveId={OBJ} />,
    );
    expect(
      container.querySelector('[data-testid="raise-concern-affordance"]'),
    ).toBeNull();
  });

  it('renders the green Raise-a-Concern form once the objective is held', () => {
    beginAct();
    render(<RaiseConcernAffordance projectId={PID} objectiveId={OBJ} />);
    expect(screen.getByTestId('raise-concern-affordance')).toBeTruthy();
    expect(screen.getByText(ACT_MANDATE_COPY.concern.heading)).toBeTruthy();
    expect(screen.getByTestId('raise-concern-submit')).toBeTruthy();
    // Roster names appear in the picker (display name, then email fallback).
    expect(screen.getByText('Maya')).toBeTruthy();
    expect(screen.getByText('sam@farm.test')).toBeTruthy();
    // Breadcrumb to the review surface is present (F7: concern -> review path
    // discoverable), single-sourced from ACT_MANDATE_COPY.
    expect(
      screen.getByTestId('raise-concern-review-location').textContent,
    ).toBe(ACT_MANDATE_COPY.concern.reviewLocation);
  });

  it('appends a raised concern against this objective on submit', () => {
    beginAct();
    render(<RaiseConcernAffordance projectId={PID} objectiveId={OBJ} />);

    act(() => {
      fireEvent.change(screen.getByTestId('raise-concern-observation'), {
        target: { value: 'Access road washed out after the storm.' },
      });
      fireEvent.change(screen.getByTestId('raise-concern-proposed'), {
        target: { value: 'Add a culvert at the low crossing.' },
      });
    });
    act(() => {
      fireEvent.click(screen.getByTestId('raise-concern-submit'));
    });

    const list = usePlanConcernsStore.getState().byProject[PID] ?? [];
    expect(list.length).toBe(1);
    expect(list[0]!.status).toBe('raised');
    expect(list[0]!.objectiveRef).toBe(OBJ);
    expect(list[0]!.observation).toBe('Access road washed out after the storm.');
    expect(list[0]!.proposedChange).toBe('Add a culvert at the low crossing.');
    expect(list[0]!.raisedBy).toBe('Maya'); // first roster steward auto-selected
    // Acknowledgement shows; the form is cleared.
    expect(screen.getByTestId('raise-concern-ack')).toBeTruthy();
    expect(
      (screen.getByTestId('raise-concern-observation') as HTMLTextAreaElement)
        .value,
    ).toBe('');
  });

  it('advises and disables submit on advance-sale / subscription / CSA framing', () => {
    beginAct();
    render(<RaiseConcernAffordance projectId={PID} objectiveId={OBJ} />);

    act(() => {
      fireEvent.change(screen.getByTestId('raise-concern-observation'), {
        target: { value: 'Offer a monthly subscription box to fund it.' },
      });
    });

    // Advisory surfaces and the submit is disabled -- the term is never submitted.
    expect(screen.getByTestId('raise-concern-advisory')).toBeTruthy();
    expect(screen.getByText(CSA_ADVISORY_COPY.title)).toBeTruthy();
    expect(
      (screen.getByTestId('raise-concern-submit') as HTMLButtonElement).disabled,
    ).toBe(true);

    // Nothing was recorded.
    expect(usePlanConcernsStore.getState().byProject[PID]).toBeUndefined();
  });
});

/**
 * @vitest-environment happy-dom
 *
 * ActObjectiveAmendments -- the Act-side on-objective register that surfaces a
 * Threshold-3 governance-APPROVED amendment alongside the executing objective.
 * Act counterpart of the Plan-only ConcernAmendments overlay; these tests pin
 * the same "approved, THIS objective only, alongside the original" contract on
 * the Act surface:
 *   - an objective with no approved amendment renders nothing (self-gates);
 *   - an approved concern's amendment surfaces with observation context and a
 *     permanent recorded date + reviewer;
 *   - a merely-raised (not yet approved) concern surfaces nothing;
 *   - an approved amendment for a DIFFERENT objective does not leak here.
 *
 * Reads the real planConcernsStore, exactly as it does at runtime.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, act } from '@testing-library/react';

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

import { usePlanConcernsStore } from '../../../../store/planConcernsStore.js';
import { ACT_MANDATE_COPY } from '../../../plan/threshold/actMandateModel.js';
import ActObjectiveAmendments from '../ActObjectiveAmendments.js';

const PID = 'project-act-amendments-1';
const OBJ = 'res-s5-living-infrastructure';
const TS = 1700000000000; // 2023-11-14 (deterministic)

beforeEach(() => {
  usePlanConcernsStore.setState({ byProject: {} });
});

interface SeedOpts {
  id: string;
  objectiveRef: string;
  observation: string;
  amendmentText: string;
  reviewedBy: string;
  at: number;
}

/** Seed one APPROVED concern (raise -> resolve approved) deterministically. */
function seedApproved(opts: SeedOpts): void {
  const store = usePlanConcernsStore.getState();
  act(() => {
    store.raiseConcern(
      PID,
      {
        objectiveRef: opts.objectiveRef,
        observation: opts.observation,
        proposedChange: 'Re-route to the kitchen garden.',
        raisedBy: 'Maya',
      },
      { id: opts.id, at: opts.at },
    );
    store.resolveConcern(PID, opts.id, 'approved', opts.reviewedBy, {
      amendmentText: opts.amendmentText,
      at: opts.at,
    });
  });
}

describe('ActObjectiveAmendments', () => {
  it('renders nothing for an objective with no approved amendment', () => {
    const { container } = render(
      <ActObjectiveAmendments projectId={PID} objectiveId={OBJ} />,
    );
    expect(
      container.querySelector(
        '[data-testid="act-execution-objective-amendments"]',
      ),
    ).toBeNull();
  });

  it('surfaces an approved amendment alongside the original, with context + provenance', () => {
    seedApproved({
      id: 'concern-1',
      objectiveRef: OBJ,
      observation: 'The greywater run was longer than planned.',
      amendmentText: 'Add a settling tank before the reed bed.',
      reviewedBy: 'Maya',
      at: TS,
    });
    render(<ActObjectiveAmendments projectId={PID} objectiveId={OBJ} />);

    expect(
      screen.getByTestId('act-execution-objective-amendments'),
    ).toBeTruthy();
    expect(screen.getByTestId('act-objective-amendment-concern-1')).toBeTruthy();
    expect(screen.getByText(ACT_MANDATE_COPY.onObjective.label)).toBeTruthy();
    expect(
      screen.getByText('Add a settling tank before the reed bed.'),
    ).toBeTruthy();
    expect(screen.getByText(/The greywater run was longer/)).toBeTruthy();
    expect(screen.getByText(/Recorded 2023-11-14 by Maya/)).toBeTruthy();
  });

  it('renders nothing for a concern that was raised but not yet approved', () => {
    act(() => {
      usePlanConcernsStore.getState().raiseConcern(
        PID,
        {
          objectiveRef: OBJ,
          observation: 'A drainage issue surfaced.',
          proposedChange: 'Re-grade the swale.',
          raisedBy: 'Sam',
        },
        { id: 'concern-open', at: TS },
      );
    });
    const { container } = render(
      <ActObjectiveAmendments projectId={PID} objectiveId={OBJ} />,
    );
    expect(
      container.querySelector(
        '[data-testid="act-execution-objective-amendments"]',
      ),
    ).toBeNull();
  });

  it('does NOT leak an approved amendment from another objective', () => {
    seedApproved({
      id: 'concern-other',
      objectiveRef: 's4-zones',
      observation: 'Zone boundary shifted.',
      amendmentText: 'Extend Zone 2 to the new fence line.',
      reviewedBy: 'Maya',
      at: TS,
    });
    const { container } = render(
      <ActObjectiveAmendments projectId={PID} objectiveId={OBJ} />,
    );
    expect(
      container.querySelector(
        '[data-testid="act-execution-objective-amendments"]',
      ),
    ).toBeNull();
  });
});

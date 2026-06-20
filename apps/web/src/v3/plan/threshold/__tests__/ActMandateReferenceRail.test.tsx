/**
 * @vitest-environment happy-dom
 *
 * ActMandateReferenceRail -- the right-rail handoff digest PlanTierShell mounts
 * alongside the ActMandateSurface on the `threshold-3` route. Read-only: it
 * re-assembles the same pure model the centre surface does and shows the three
 * key documents' presence, the handoff tally (derived + synthetic), and the
 * ADVISORY readiness verdict.
 *
 * These tests pin that the rail stays in lock-step with the model: the key-doc
 * presence reflects the two prior threshold stores, the tally counts derived
 * handoffs plus the two synthetic records once both thresholds are set, and the
 * readiness reading is advisory until T1 + T2 + Launch Preparation are all in
 * hand. Mirrors CoherenceCheckReferenceRail.test.tsx (the Threshold-2 template).
 *
 * The rail carries NO free-text input, so there is no detectCsaLikeText branch
 * to exercise here -- that covenant guard lives on the concern fields in
 * planConcernsStore, exercised by the surface's concern/governance panels.
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

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { useRealityCheckStore } from '../../../../store/realityCheckStore.js';
import { useCoherenceCheckStore } from '../../../../store/coherenceCheckStore.js';
import ActMandateReferenceRail from '../ActMandateReferenceRail.js';
import { LAUNCH_PREP_STRATUM_ID } from '../actMandateModel.js';

const PID = 'project-act-mandate-rail-1';

const obj = (
  id: string,
  stratumId: string,
  actHandoff: string,
): PlanStratumObjective =>
  ({ id, stratumId, title: id, actHandoff }) as unknown as PlanStratumObjective;

// Four handoff-bearing objectives: two upstream (s4) + two in the terminal
// Launch-Preparation stratum (s7) the readiness reads. derivedCount === 4.
const objectives: PlanStratumObjective[] = [
  obj('s4-a', 's4-foundation-decisions', 'Hand the water strategy to Act.'),
  obj('s4-b', 's4-foundation-decisions', 'Hand the zones to Act.'),
  obj('s7-a', LAUNCH_PREP_STRATUM_ID, 'Hand the phasing to Act.'),
  obj('s7-b', LAUNCH_PREP_STRATUM_ID, 'Hand the resourcing to Act.'),
];

const noStatuses: Record<string, PlanStratumObjectiveStatus> = {};
const launchComplete: Record<string, PlanStratumObjectiveStatus> = {
  's7-a': 'complete',
  's7-b': 'complete',
};

function renderRail(
  objectiveStatuses: Record<string, PlanStratumObjectiveStatus> = noStatuses,
) {
  return render(
    <ActMandateReferenceRail
      projectId={PID}
      objectives={objectives}
      objectiveStatuses={objectiveStatuses}
    />,
  );
}

/** Approve T1 (Planning Direction) + seal T2 (Coherence Record) for PID. */
function setBothThresholds() {
  act(() => {
    useRealityCheckStore.getState().approve(PID, 1700);
    useCoherenceCheckStore.getState().seal(PID, 1800);
  });
}

beforeEach(() => {
  useRealityCheckStore.setState({ byProject: {} });
  useCoherenceCheckStore.setState({ byProject: {} });
});

describe('ActMandateReferenceRail', () => {
  it('reflects key-document presence from the two prior threshold stores', () => {
    renderRail();
    const rail = screen.getByTestId('act-mandate-rail');
    const docRow = (name: string) =>
      within(within(rail).getByText(name).parentElement as HTMLElement);
    // The integrated design is in hand the moment any objective is resolved...
    expect(docRow('Resolved Integrated Design').getByText('In hand')).toBeTruthy();
    // ...but neither threshold record is in hand until approved / sealed.
    expect(docRow('Planning Direction Statement').getByText('Pending')).toBeTruthy();
    expect(docRow('Coherence Record').getByText('Pending')).toBeTruthy();
  });

  it('flips the threshold documents to "In hand" once T1 is approved and T2 sealed', () => {
    renderRail();
    setBothThresholds();
    const rail = screen.getByTestId('act-mandate-rail');
    const docRow = (name: string) =>
      within(within(rail).getByText(name).parentElement as HTMLElement);
    expect(docRow('Planning Direction Statement').getByText('In hand')).toBeTruthy();
    expect(docRow('Coherence Record').getByText('In hand')).toBeTruthy();
  });

  it('tallies derived handoffs (4) plus the two synthetic records once both thresholds are set', () => {
    renderRail();
    setBothThresholds();
    const rail = screen.getByTestId('act-mandate-rail');
    const stat = (label: string) =>
      within(within(rail).getByText(label).parentElement as HTMLElement);
    // derived 4 + synthetic 2 = 6 total packages.
    expect(stat('Total packages').getByText('6')).toBeTruthy();
    expect(stat('Handoffs').getByText('4')).toBeTruthy();
    expect(stat('Records').getByText('2')).toBeTruthy();
  });

  it('shows no synthetic records before either threshold is set', () => {
    renderRail();
    const rail = screen.getByTestId('act-mandate-rail');
    const stat = (label: string) =>
      within(within(rail).getByText(label).parentElement as HTMLElement);
    expect(stat('Records').getByText('0')).toBeTruthy();
  });

  it('reads "Advisory" until T1, T2, and Launch Preparation are all in hand', () => {
    renderRail(); // nothing set, launch 0/2
    const rail = screen.getByTestId('act-mandate-rail');
    expect(within(rail).getByText('Advisory')).toBeTruthy();
    // Thresholds set but Launch Preparation still incomplete -> still advisory.
    setBothThresholds();
    expect(within(rail).getByText('Advisory')).toBeTruthy();
  });

  it('reads "Ready" once both thresholds are set and Launch Preparation is complete', () => {
    renderRail(launchComplete);
    setBothThresholds();
    const rail = screen.getByTestId('act-mandate-rail');
    expect(within(rail).getByText('Ready')).toBeTruthy();
    // The Launch-Preparation tally shows every terminal objective complete.
    expect(within(rail).getByText('2/2')).toBeTruthy();
  });
});

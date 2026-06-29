/**
 * @vitest-environment happy-dom
 *
 * ActMandateBriefingCard -- the Act-side READ-ONLY briefing of the Threshold-3
 * handoff, surfaced in the Act operations dashboard. These tests pin the
 * "consume the mandate, never re-author it, never gate" contract:
 *   - a project that has NOT crossed into Act (no `mandatedAt`) renders nothing,
 *     even when objectives + both threshold records exist;
 *   - a mandated project renders the assembled briefing: the per-stratum derived
 *     handoffs, the two synthetic threshold records (Planning Direction + the
 *     Coherence Record) grouped under "Threshold records", the key documents,
 *     and the advisory readiness reading;
 *   - there is NO "Begin Act" control (the crossing already happened).
 *
 * Reads the real reality / coherence / act-mandate stores and the SAME pure
 * assembler (assembleActMandate) the Plan ceremony uses, exactly as at runtime.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, within, act, fireEvent } from '@testing-library/react';
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

import { useActMandateStore } from '../../../../store/actMandateStore.js';
import { useRealityCheckStore } from '../../../../store/realityCheckStore.js';
import { useCoherenceCheckStore } from '../../../../store/coherenceCheckStore.js';
import { ACT_MANDATE_COPY } from '../../../plan/threshold/actMandateModel.js';
import ActMandateBriefingCard from '../ActMandateBriefingCard.js';

const PID = 'project-act-briefing-1';
const TS = 1700000000000; // 2023-11-14 (deterministic)

const OBJ_HANDOFF = {
  id: 'res-s5-living-infrastructure',
  stratumId: 's5-system-design',
  title: 'Living infrastructure',
  ref: 'RES-S5.1',
  actHandoff: 'Hand the greywater layout to the build crew.',
} as unknown as PlanStratumObjective;

const OBJECTIVES: readonly PlanStratumObjective[] = [OBJ_HANDOFF];
const STATUSES = {} as const;

beforeEach(() => {
  useActMandateStore.setState({ byProject: {} });
  useRealityCheckStore.setState({ byProject: {} });
  useCoherenceCheckStore.setState({ byProject: {} });
});

/** Seed an approved Planning Direction + a sealed Coherence Record. */
function seedThresholdRecords(): void {
  useRealityCheckStore.setState({
    byProject: {
      [PID]: {
        phase1Ready: true,
        strandFindings: {},
        classifications: {},
        planningDirectionText: 'Build the residential homestead and silvopasture.',
        approvedAt: TS,
      },
    },
  });
  useCoherenceCheckStore.setState({
    byProject: {
      [PID]: {
        itemResolutions: {},
        amendments: [],
        sealedAt: TS,
      },
    },
  });
}

describe('ActMandateBriefingCard', () => {
  it('renders nothing for a project that has not crossed into Act', () => {
    seedThresholdRecords(); // records exist, but Begin Act was never pressed
    const { container } = render(
      <ActMandateBriefingCard
        projectId={PID}
        objectives={OBJECTIVES}
        objectiveStatuses={STATUSES}
      />,
    );
    expect(
      container.querySelector('[data-testid="act-mandate-briefing"]'),
    ).toBeNull();
  });

  it('surfaces the assembled handoff once the project has crossed into Act', () => {
    seedThresholdRecords();
    useActMandateStore.getState().beginAct(PID, TS);

    render(
      <ActMandateBriefingCard
        projectId={PID}
        objectives={OBJECTIVES}
        objectiveStatuses={STATUSES}
      />,
    );

    expect(screen.getByTestId('act-mandate-briefing')).toBeTruthy();
    // The derived per-stratum handoff carries the objective verbatim.
    expect(screen.getByText('Living infrastructure')).toBeTruthy();
    expect(
      screen.getByText(/Hand the greywater layout to the build crew\./),
    ).toBeTruthy();
    // The two prior threshold records group under "Threshold records".
    expect(screen.getByText('Threshold records')).toBeTruthy();
    // The key-documents section travels with the project.
    expect(screen.getByText('Key documents')).toBeTruthy();
    // Read-only: no "Begin Act" crossing control here.
    expect(screen.queryByTestId('begin-act-button')).toBeNull();
    expect(screen.queryByText('Begin Act')).toBeNull();
  });

  it('renders the briefing even with no derived handoffs (empty-inventory note)', () => {
    useActMandateStore.getState().beginAct(PID, TS);
    render(
      <ActMandateBriefingCard
        projectId={PID}
        objectives={[]}
        objectiveStatuses={STATUSES}
      />,
    );
    expect(screen.getByTestId('act-mandate-briefing')).toBeTruthy();
    // No threshold records seeded + no objectives -> the empty-inventory note.
    expect(
      screen.getByText(
        /No objective in the resolved design names an Act handoff yet\./,
      ),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Key-document brief popups (parity with the Plan surface, read-only side).
// ---------------------------------------------------------------------------

const PD = ACT_MANDATE_COPY.documents.planningDirection;
const ID = ACT_MANDATE_COPY.documents.integratedDesign;

function renderMandated(objectives: readonly PlanStratumObjective[] = OBJECTIVES) {
  useActMandateStore.getState().beginAct(PID, TS);
  return render(
    <ActMandateBriefingCard
      projectId={PID}
      objectives={objectives}
      objectiveStatuses={STATUSES}
    />,
  );
}

function openDoc(name: RegExp) {
  const docs = screen.getByLabelText('Key documents');
  const trigger = within(docs).getByRole('button', { name });
  act(() => {
    fireEvent.click(trigger);
  });
  return screen.getByRole('dialog');
}

describe('ActMandateBriefingCard -- key-document brief popups', () => {
  it('opens the approved Planning Direction brief from its card', () => {
    seedThresholdRecords();
    renderMandated();
    const dialog = openDoc(new RegExp(PD.name));
    expect(
      within(dialog).getByText(
        'Build the residential homestead and silvopasture.',
      ),
    ).toBeTruthy();
  });

  it('opens the Planning Direction brief with its pending note when unapproved', () => {
    renderMandated();
    const dialog = openDoc(new RegExp(PD.name));
    expect(within(dialog).getByText(PD.brief.pendingNote)).toBeTruthy();
  });

  it('opens the Integrated Design brief listing the resolved objective by stratum', () => {
    renderMandated();
    const dialog = openDoc(new RegExp(ID.name));
    expect(within(dialog).getByText(ID.brief.objectivesHeading)).toBeTruthy();
    expect(within(dialog).getByText('Living infrastructure')).toBeTruthy();
  });

  it('closes the brief popup via the close button (deferred to animationend)', () => {
    renderMandated();
    const dialog = openDoc(new RegExp(PD.name));
    act(() => {
      fireEvent.click(
        within(dialog).getByRole('button', { name: /close workspace/i }),
      );
    });
    expect(dialog.getAttribute('data-state')).toBe('closing');
    act(() => {
      fireEvent.animationEnd(dialog);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

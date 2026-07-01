/**
 * @vitest-environment happy-dom
 *
 * ActMandateSurface -- the center-canvas takeover PlanTierShell mounts on the
 * `plan/threshold/$thresholdId` route when `thresholdId === 'threshold-3'`, in
 * place of the editable map. These tests pin the Stage-3 ceremony behaviour the
 * (WebGL-heavy, hard-to-mount) PlanTierShell route test cannot own:
 *   1. NO map / WebGL ever mounts on the threshold surface;
 *   2. all three ceremony layers render (key documents, handoff inventory,
 *      Begin Act);
 *   3. the three key documents read present / absent state lines off the two
 *      prior threshold records (Reality Check approval, Coherence Check seal);
 *   4. the derived handoff inventory groups by stratum (in stratum order), and
 *      the two synthetic threshold records lead the inventory once present;
 *   5. Begin Act is ALWAYS enabled (operator decision) -- it never blocks on
 *      readiness; pressing it arms `planReadOnly` (idempotent) AND navigates to
 *      the Act tier shell.
 *
 * Fixtures use a small, deterministic resolved set with explicit `actHandoff`
 * lines across several strata (the real reference-config tally is pinned in the
 * pure model test; here the shape is controlled so grouping is exact).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, act, fireEvent, within } from '@testing-library/react';

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

import {
  findPlanStratum,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { useRealityCheckStore } from '../../../../store/realityCheckStore.js';
import { useCoherenceCheckStore } from '../../../../store/coherenceCheckStore.js';
import { useActMandateStore } from '../../../../store/actMandateStore.js';
import { ACT_MANDATE_COPY } from '../actMandateModel.js';
import ActMandateSurface from '../ActMandateSurface.js';

const PID = 'project-act-mandate-1';
const TS = 1_700_000_000_000;

// ---------------------------------------------------------------------------
// A small deterministic resolved set: handoff-bearing objectives spread across
// s1 / s2 / s7, plus one handoff-less objective in s3 (counts toward the full
// integrated design but NOT the handoff inventory).
// ---------------------------------------------------------------------------

const obj = (
  id: string,
  stratumId: string,
  title: string,
  actHandoff?: string,
): PlanStratumObjective =>
  ({
    id,
    stratumId,
    title,
    ...(actHandoff ? { actHandoff } : {}),
  }) as unknown as PlanStratumObjective;

const referenceDesign: PlanStratumObjective[] = [
  obj('a1', 's1-project-foundation', 'Vision set', 'Carries the vision into Act.'),
  obj('a2', 's1-project-foundation', 'Stewards named', 'Carries the steward roster into Act.'),
  obj('b1', 's2-land-reading', 'Boundary mapped', 'Carries the parcel boundary into Act.'),
  obj('c1', 's3-systems-reading', 'Systems read'), // no handoff
  obj('g1', 's7-phasing-resourcing', 'Phase plan', 'Carries the phase-1 plan into Act.'),
  obj('g2', 's7-phasing-resourcing', 'Resourcing plan', 'Carries the resourcing plan into Act.'),
];

const S1_TITLE = findPlanStratum('s1-project-foundation')!.title;
const S2_TITLE = findPlanStratum('s2-land-reading')!.title;
const S7_TITLE = findPlanStratum('s7-phasing-resourcing')!.title;

/** All objectives complete (used to drive a "ready" readiness reading). */
const allComplete: Record<string, PlanStratumObjectiveStatus> = Object.fromEntries(
  referenceDesign.map((o) => [o.id, 'complete'] as const),
);

function renderSurface(
  statuses: Record<string, PlanStratumObjectiveStatus> = {},
) {
  return render(
    <ActMandateSurface
      projectId={PID}
      projectName="Hillside Farm"
      objectives={referenceDesign}
      objectiveStatuses={statuses}
    />,
  );
}

/** Seed the T1 Reality Check record as approved (with direction text). */
function approveRealityCheck() {
  useRealityCheckStore.setState({
    byProject: {
      [PID]: {
        phase1Ready: true,
        strandFindings: {},
        classifications: {},
        planningDirectionText: 'Build a resilient mixed farm.',
        approvedAt: TS,
      },
    },
  });
}

/** Seed the T2 Coherence Check record as sealed with no amendments. */
function sealCoherenceCheck() {
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

beforeEach(() => {
  useRealityCheckStore.setState({ byProject: {} });
  useCoherenceCheckStore.setState({ byProject: {} });
  useActMandateStore.setState({ byProject: {} });
  h.navigateSpy.mockClear();
});

describe('ActMandateSurface', () => {
  it('renders the green Threshold-3 mode header', () => {
    renderSurface();
    expect(screen.getByText(ACT_MANDATE_COPY.modeLabel)).toBeTruthy();
    expect(screen.getByText(ACT_MANDATE_COPY.title)).toBeTruthy();
  });

  it('mounts NO map / canvas / WebGL on the threshold surface', () => {
    const { container } = renderSurface();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.maplibregl-map')).toBeNull();
  });

  it('renders all three ceremony layers', () => {
    renderSurface();
    expect(screen.getByLabelText('Key documents')).toBeTruthy();
    expect(screen.getByLabelText('What carries into Act')).toBeTruthy();
    expect(screen.getByLabelText('Begin Act')).toBeTruthy();
  });

  it('reads the key documents as ABSENT before either threshold is set', () => {
    renderSurface();
    const docs = screen.getByLabelText('Key documents');
    expect(
      within(docs).getByText(
        ACT_MANDATE_COPY.documents.planningDirection.absentLine,
      ),
    ).toBeTruthy();
    expect(
      within(docs).getByText(
        ACT_MANDATE_COPY.documents.coherenceRecord.absentLine,
      ),
    ).toBeTruthy();
    // Doc 3 (the resolved integrated design) is present whenever objectives
    // resolve -- 6 objectives across 4 strata in this fixture.
    expect(
      within(docs).getByText('6 resolved objectives across 4 strata.'),
    ).toBeTruthy();
  });

  it('reads the key documents as PRESENT once both prior thresholds are set', () => {
    approveRealityCheck();
    sealCoherenceCheck();
    renderSurface(allComplete);
    const docs = screen.getByLabelText('Key documents');
    expect(
      within(docs).getByText(
        ACT_MANDATE_COPY.documents.planningDirection.presentLine,
      ),
    ).toBeTruthy();
    expect(
      within(docs).getByText(
        ACT_MANDATE_COPY.documents.coherenceRecord.sealedCleanLine,
      ),
    ).toBeTruthy();
  });

  it('groups the derived handoff inventory by stratum, in stratum order', () => {
    renderSurface();
    const inventory = screen.getByLabelText('What carries into Act');
    // Three stratum groups carry handoffs (s1, s2, s7); s3 has none.
    expect(within(inventory).getByText(S1_TITLE)).toBeTruthy();
    expect(within(inventory).getByText(S2_TITLE)).toBeTruthy();
    expect(within(inventory).getByText(S7_TITLE)).toBeTruthy();
    // Each derived handoff line surfaces.
    expect(within(inventory).getByText('Carries the vision into Act.')).toBeTruthy();
    expect(
      within(inventory).getByText('Carries the parcel boundary into Act.'),
    ).toBeTruthy();
    // Five derived packages, no synthetic records yet.
    expect(within(inventory).getByText('5 packages')).toBeTruthy();
    expect(within(inventory).queryByText('Threshold records')).toBeNull();
  });

  it('leads the inventory with the two synthetic threshold records once present', () => {
    approveRealityCheck();
    sealCoherenceCheck();
    renderSurface(allComplete);
    const inventory = screen.getByLabelText('What carries into Act');
    // The synthetic-records group now leads, carrying both threshold records.
    expect(within(inventory).getByText('Threshold records')).toBeTruthy();
    expect(
      within(inventory).getByText('Build a resilient mixed farm.'),
    ).toBeTruthy();
    expect(
      within(inventory).getByText(
        ACT_MANDATE_COPY.documents.coherenceRecord.cleanHandoff,
      ),
    ).toBeTruthy();
    // 5 derived + 2 synthetic.
    expect(within(inventory).getByText('7 packages')).toBeTruthy();
  });

  it('keeps Begin Act enabled even when readiness is incomplete', () => {
    // No thresholds set, launch prep incomplete -> not ready, yet still enabled.
    renderSurface();
    const surface = screen.getByTestId('act-mandate-surface');
    expect(surface.getAttribute('data-ready')).toBeNull();
    const beginBtn = screen.getByTestId('begin-act-button') as HTMLButtonElement;
    expect(beginBtn.disabled).toBe(false);
  });

  it('marks the surface ready (advisory) when both thresholds set and launch prep complete', () => {
    approveRealityCheck();
    sealCoherenceCheck();
    renderSurface(allComplete);
    const surface = screen.getByTestId('act-mandate-surface');
    expect(surface.getAttribute('data-ready')).toBe('true');
    // Still just a button -- readiness never gates it.
    const beginBtn = screen.getByTestId('begin-act-button') as HTMLButtonElement;
    expect(beginBtn.disabled).toBe(false);
  });

  it('arms planReadOnly (idempotent) and navigates to Act on Begin Act', () => {
    renderSurface();
    const beginBtn = screen.getByTestId('begin-act-button');

    act(() => {
      fireEvent.click(beginBtn);
    });

    // The mandate is stamped and the project-global lock is armed.
    const record = useActMandateStore.getState().byProject[PID];
    expect(record?.planReadOnly).toBe(true);
    expect(typeof record?.mandatedAt).toBe('number');

    // ...and the steward is navigated into the Act tier shell.
    expect(h.navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/v3/project/$projectId/act/tier-shell',
        params: { projectId: PID },
      }),
    );

    // Idempotent: a second press does not re-stamp the crossing.
    const firstMandatedAt = record?.mandatedAt;
    act(() => {
      fireEvent.click(beginBtn);
    });
    expect(useActMandateStore.getState().byProject[PID]?.mandatedAt).toBe(
      firstMandatedAt,
    );
  });
});

// ---------------------------------------------------------------------------
// Key-document brief popups -- each card is a button opening its full brief.
// ---------------------------------------------------------------------------

const PD = ACT_MANDATE_COPY.documents.planningDirection;
const CR = ACT_MANDATE_COPY.documents.coherenceRecord;
const ID = ACT_MANDATE_COPY.documents.integratedDesign;

/** Open the brief popup for a key-document card by its name. */
function openDoc(name: string | RegExp) {
  const docs = screen.getByLabelText('Key documents');
  const trigger = within(docs).getByRole('button', { name });
  act(() => {
    fireEvent.click(trigger);
  });
  return screen.getByRole('dialog');
}

describe('ActMandateSurface -- key-document brief popups', () => {
  it('renders each key document as a dialog-opening button', () => {
    renderSurface();
    const docs = screen.getByLabelText('Key documents');
    for (const name of [PD.name, CR.name, ID.name]) {
      const btn = within(docs).getByRole('button', { name: new RegExp(name) });
      expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    }
  });

  it('opens the Planning Direction brief with its pending note before approval', () => {
    renderSurface();
    const dialog = openDoc(new RegExp(PD.name));
    expect(within(dialog).getByText(PD.name)).toBeTruthy();
    expect(within(dialog).getByText(PD.brief.pendingNote)).toBeTruthy();
  });

  it('opens the Planning Direction brief with the approved direction text', () => {
    approveRealityCheck();
    renderSurface(allComplete);
    const dialog = openDoc(new RegExp(PD.name));
    expect(
      within(dialog).getByText('Build a resilient mixed farm.'),
    ).toBeTruthy();
  });

  it('opens the Coherence Record brief with its clean note once sealed', () => {
    sealCoherenceCheck();
    renderSurface();
    const dialog = openDoc(new RegExp(CR.name));
    expect(within(dialog).getByText(CR.brief.cleanNote)).toBeTruthy();
  });

  it('opens the Integrated Design brief listing ALL resolved objectives by stratum', () => {
    renderSurface();
    const dialog = openDoc(new RegExp(ID.name));
    expect(within(dialog).getByText(ID.brief.objectivesHeading)).toBeTruthy();
    // The handoff-less s3 objective still appears (proves the full design, not
    // only the handoff inventory).
    expect(within(dialog).getByText('Systems read')).toBeTruthy();
    // And a handoff-bearing objective surfaces too.
    expect(within(dialog).getByText('Vision set')).toBeTruthy();
  });

  it('closes the brief popup via the close button (deferred to animationend)', () => {
    renderSurface();
    const dialog = openDoc(new RegExp(ID.name));
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

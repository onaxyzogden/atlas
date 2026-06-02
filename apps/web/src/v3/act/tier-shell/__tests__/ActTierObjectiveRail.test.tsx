/**
 * @vitest-environment happy-dom
 *
 * ActTierObjectiveRail — left rail with an Objectives/Protocols mode toggle.
 * Covers:
 *   1. Objectives mode renders the stratum's objective cards + the toggle.
 *   2. Protocols mode renders the ProtocolLayerPanel (reused) and hides the
 *      objective list.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  findPlanStratum,
  findPlanStratumObjective,
  type PlanStratumObjective,
} from '@ogden/shared';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import { useClosedLoopStore } from '../../../../store/closedLoopStore.js';
import ActTierObjectiveRail from '../ActTierObjectiveRail.js';
import type { ObjectiveProgress } from '../objectiveProgress.js';

const STRATUM = findPlanStratum('s6-integration-design')!;
const OBJECTIVE = findPlanStratumObjective('s6-yield-flows')!;
const PROGRESS: Readonly<Record<string, ObjectiveProgress>> = {
  [OBJECTIVE.id]: { total: 2, verified: 1, state: 'active' },
};

beforeEach(() => {
  useProtocolStore.setState({ records: [] });
  useClosedLoopStore.setState({ materialFlows: [] });
});
afterEach(() => cleanup());

function renderRail(
  mode: 'objectives' | 'protocols',
  triggeredCount = 0,
  activeObjectiveId: string | null = null,
  objectives: readonly PlanStratumObjective[] = [OBJECTIVE],
) {
  return render(
    <ActTierObjectiveRail
      stratum={STRATUM}
      objectives={objectives}
      progressByObjective={PROGRESS}
      activeObjectiveId={activeObjectiveId}
      onSelectObjective={vi.fn()}
      mode={mode}
      onModeChange={vi.fn()}
      triggeredCount={triggeredCount}
      projectId="proj-1"
      primaryTypeId="silvopasture"
      secondaryTypeIds={[]}
    />,
  );
}

describe('ActTierObjectiveRail', () => {
  it('objectives mode renders the objective cards and the mode toggle', () => {
    renderRail('objectives');
    expect(screen.getByTestId('act-rail-mode-toggle')).toBeTruthy();
    // The card tile shows the objective's shortTitle (falling back to title).
    expect(
      screen.getByText(OBJECTIVE.shortTitle ?? OBJECTIVE.title),
    ).toBeTruthy();
    expect(screen.queryByTestId('protocol-layer-panel')).toBeNull();
  });

  it('protocols mode renders the ProtocolLayerPanel and hides the objective list', () => {
    renderRail('protocols');
    expect(screen.getByTestId('act-rail-mode-toggle')).toBeTruthy();
    expect(screen.getByTestId('protocol-layer-panel')).toBeTruthy();
    expect(screen.queryByText(OBJECTIVE.title)).toBeNull();
  });

  it('wraps the protocol panel in .olos-spine-root so the spine tokens resolve (bento framing)', () => {
    renderRail('protocols');
    const panel = screen.getByTestId('protocol-layer-panel');
    // The mount wrapper must carry the spine-root scope; without it the shared
    // protocol cards render "naked" — the --spine-* custom properties they are
    // styled with are declared only under .olos-spine-root.
    expect(panel.parentElement?.className).toContain('olos-spine-root');
  });

  it('with no objective selected the header shows the stratum context', () => {
    renderRail('objectives', 0, null);
    // The stratum summary is unique to the header (not echoed by any card).
    expect(screen.getByText(STRATUM.summary)).toBeTruthy();
    // No objective-detail markers when nothing is selected.
    expect(screen.queryByText('Decision progress')).toBeNull();
  });

  it('with an objective selected the header REPLACES to the objective info', () => {
    renderRail('objectives', 0, OBJECTIVE.id);
    // Header-unique markers prove the objective-detail header rendered (the
    // short title / focused question / progress also appear on the card below,
    // so assert on the labels + combined eyebrow that exist only in the header).
    expect(
      screen.getByText(`Stratum S${STRATUM.ordinal} . ${STRATUM.title}`),
    ).toBeTruthy();
    expect(screen.getByText('Decision progress')).toBeTruthy();
    expect(screen.getByText('Tools')).toBeTruthy();
    // The stratum summary is gone from the header (replaced by the objective).
    expect(screen.queryByText(STRATUM.summary)).toBeNull();
  });

  it('broadened gate: flow block lights via the compost act-tool on a non-resource-flow id', () => {
    // Regression for the broadened gate. The farm waste-vector objective
    // `rf-s6-enterprise-integration` has a `rf-` id (NOT "resource-flow") and a
    // neutral prose here, so the OLD id-substring gate would have missed it. It
    // resolves to the s6-integration default toolset (incl. `compost`) via
    // getObjectiveActTools, so the broadened tool-signal lights the flow block.
    const toolGatedObjective = {
      ...OBJECTIVE,
      id: "rf-s6-enterprise-integration",
      stratumId: "s6-integration-design",
      shortTitle: "Enterprise integration",
      title: "Enterprise integration",
      focusedQuestion: "How do the enterprises connect into one system?",
    } as PlanStratumObjective;
    useClosedLoopStore.setState({
      materialFlows: [
        {
          id: "g1",
          projectId: "proj-1",
          label: "Manure to pasture",
          materialKind: "manure",
          sourceId: "feat-a",
          sinkId: "feat-b",
          origin: "list",
          createdAt: "2026-06-02T00:00:00.000Z",
        },
      ],
    });
    renderRail("objectives", 0, toolGatedObjective.id, [toolGatedObjective]);
    expect(screen.getByText(/Material flows: 1/)).toBeTruthy();
    expect(screen.getByText(/1 closed-loop/)).toBeTruthy();
  });

  it('maximalist gate: flow block lights via a water act-tool (no compost, neutral prose)', () => {
    // `s5-water-infrastructure` resolves (via override) to swale/storage/tanks/
    // sink/wells -- water source/sink tools now in FLOW_TOOL_IDS. The id does not
    // match the id pattern and the prose is neutral, so it lights ONLY via the
    // broadened (maximalist) tool signal.
    const waterObjective = {
      ...OBJECTIVE,
      id: "s5-water-infrastructure",
      stratumId: "s5-system-design",
      shortTitle: "Water infrastructure",
      title: "System arrangement",
      focusedQuestion: "How is the system arranged on the ground?",
    } as PlanStratumObjective;
    useClosedLoopStore.setState({
      materialFlows: [
        {
          id: "w1",
          projectId: "proj-1",
          label: "Swale to tank",
          materialKind: "water",
          sourceId: "feat-a",
          sinkId: "feat-b",
          origin: "list",
          createdAt: "2026-06-02T00:00:00.000Z",
        },
      ],
    });
    renderRail("objectives", 0, waterObjective.id, [waterObjective]);
    expect(screen.getByText(/Material flows: 1/)).toBeTruthy();
    expect(screen.getByText(/1 closed-loop/)).toBeTruthy();
  });

  it('greywater prose: flow block lights via FLOW_PROSE_RE with no flow tool', () => {
    // `s1-stakeholders` resolves (via override) to neighbour-pin/steward -- NOT in
    // FLOW_TOOL_IDS -- and the id does not match. It lights purely because the
    // focused question names greywater reuse (the broadened prose axis; there is no
    // dedicated greywater tool in the Act catalogue).
    const greywaterObjective = {
      ...OBJECTIVE,
      id: "s1-stakeholders",
      stratumId: "s1-project-foundation",
      shortTitle: "Greywater reuse",
      title: "Stakeholder alignment",
      focusedQuestion: "How do we design greywater reuse from the dwellings?",
    } as PlanStratumObjective;
    useClosedLoopStore.setState({
      materialFlows: [
        {
          id: "gw1",
          projectId: "proj-1",
          label: "Greywater to bed",
          materialKind: "greywater",
          sourceId: "feat-a",
          sinkId: "feat-b",
          origin: "list",
          createdAt: "2026-06-02T00:00:00.000Z",
        },
      ],
    });
    renderRail("objectives", 0, greywaterObjective.id, [greywaterObjective]);
    expect(screen.getByText(/Material flows: 1/)).toBeTruthy();
    expect(screen.getByText(/1 closed-loop/)).toBeTruthy();
  });

  it('stays-dark: a non-flow objective does NOT render the flow block even when maximalist', () => {
    // `s1-vision` resolves (via override) to form tools only (none in
    // FLOW_TOOL_IDS); the id does not match and the prose is neutral. The gate is
    // still a gate: the flow block must be absent. Flows are seeded to prove the
    // block is suppressed by the gate, not merely by an empty store.
    const visionObjective = {
      ...OBJECTIVE,
      id: "s1-vision",
      stratumId: "s1-project-foundation",
      shortTitle: "Project vision",
      title: "Project direction",
      focusedQuestion: "What is the primary purpose of this land project?",
    } as PlanStratumObjective;
    useClosedLoopStore.setState({
      materialFlows: [
        {
          id: "v1",
          projectId: "proj-1",
          label: "Some flow",
          materialKind: "water",
          sourceId: "feat-a",
          sinkId: "feat-b",
          origin: "list",
          createdAt: "2026-06-02T00:00:00.000Z",
        },
      ],
    });
    renderRail("objectives", 0, visionObjective.id, [visionObjective]);
    expect(screen.queryByText(/Material flows:/)).toBeNull();
    expect(screen.queryByText(/No material flows recorded yet/)).toBeNull();
  });

  it('surfaces a live closed-loop flow count for resource-flow objectives', () => {
    const flowObjective = {
      ...OBJECTIVE,
      id: 'hms-s2-resource-flows',
      shortTitle: 'Household resource flows',
    } as PlanStratumObjective;
    useClosedLoopStore.setState({
      materialFlows: [
        {
          id: 'f1',
          projectId: 'proj-1',
          label: 'Kitchen scraps to compost',
          materialKind: 'compost',
          sourceId: 'feat-a',
          sinkId: 'feat-b',
          origin: 'list',
          createdAt: '2026-06-02T00:00:00.000Z',
        },
        {
          id: 'f2',
          projectId: 'proj-1',
          label: 'Greywater (unpinned)',
          materialKind: 'greywater',
          sourceId: null,
          sinkId: null,
          origin: 'list',
          createdAt: '2026-06-02T00:00:00.000Z',
        },
        {
          id: 'f3',
          projectId: 'other-proj',
          label: 'Other project flow',
          materialKind: 'water',
          sourceId: 'x',
          sinkId: 'y',
          origin: 'list',
          createdAt: '2026-06-02T00:00:00.000Z',
        },
      ],
    });
    renderRail('objectives', 0, flowObjective.id, [flowObjective]);
    // Two flows in proj-1 (f3 belongs to another project); one is closed-loop.
    expect(screen.getByText(/Material flows: 2/)).toBeTruthy();
    expect(screen.getByText(/1 closed-loop/)).toBeTruthy();
  });
});

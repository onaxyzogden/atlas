/**
 * @vitest-environment happy-dom
 *
 * Tier-6 (Mode 5 -- Launch Preparation) Plan-only chrome. These tests pin the
 * defining promises of the three Stage-6 components:
 *
 *  - Mode5LaunchChrome is DISPLAY-ONLY and arms ONLY on `progressTracking`. A
 *    legacy objective -- even one with an actHandoff -- renders nothing, so
 *    non-Tier-6 objective detail is untouched. It is SEPARATE from
 *    Mode4DesignChrome so an objective carrying both fields shows accurate,
 *    non-overlapping eyebrows.
 *  - LaunchProgressPanel renders each `{ metric, cadence }` milestone as a metric
 *    line + a cadence pill.
 *  - CapacityBridgePanel arms ONLY on `s7-resource-plan`; it joins real steward
 *    supply (from Tier 0 / Obj 0.2) against the captured Phase-1 demand, shows an
 *    honest "not yet captured" reading when demand is absent, and renders only the
 *    permitted (Amanah-clean) funding-channel labels the capture stored.
 *
 * lucide-react is stubbed to forwardRef SVGs (icons are decorative here), the
 * same harness the Mode4DesignChrome tests use.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { PlanStratumObjective, ProjectMemberRecord } from '@ogden/shared';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' && value !== null && '$$typeof' in (value as object)) ||
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

import Mode5LaunchChrome from '../Mode5LaunchChrome.js';
import LaunchProgressPanel from '../LaunchProgressPanel.js';
import CapacityBridgePanel from '../CapacityBridgePanel.js';
import { useActEvidenceStore } from '../../../../store/actEvidenceStore.js';
import { useVisionStore, type VisionData } from '../../../../store/visionStore.js';
import { useMemberStore } from '../../../../store/memberStore.js';

// The chrome / bridge read only a few fields off the objective (progressTracking
// + actHandoff for the chrome; id for the bridge), so a partial fixture is
// sufficient and faithful to how they are mounted.
const objective = (over: Partial<PlanStratumObjective>): PlanStratumObjective =>
  ({
    id: 's7-resource-plan',
    stratumId: 's7-phasing-resourcing',
    title: 'A realistic resource & capacity plan',
    ...over,
  }) as unknown as PlanStratumObjective;

const FULL = objective({
  progressTracking: {
    milestones: [
      { metric: 'Labour hours deployed vs. estimated by task', cadence: 'monthly' },
      { metric: 'Expenditure vs. budget by category', cadence: 'monthly' },
    ],
  },
  actHandoff: 'Resource & Capacity Plan',
});

describe('Mode5LaunchChrome -- full Mode-5 objective', () => {
  it('renders the eyebrow, the progress panel, and the act handoff', () => {
    render(<Mode5LaunchChrome objective={FULL} />);

    expect(screen.getByTestId('mode5-launch-chrome')).toBeTruthy();
    expect(screen.getByTestId('mode5-launch-chrome').textContent).toContain(
      'Mode 5 -- Launch Preparation',
    );

    const panel = screen.getByTestId('launch-progress');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('Labour hours deployed vs. estimated by task');
    // each milestone renders a structured cadence pill.
    expect(screen.getAllByTestId('launch-progress-cadence').length).toBe(2);

    expect(screen.getByTestId('mode5-act-handoff').textContent).toContain(
      'Resource & Capacity Plan',
    );
  });
});

describe('Mode5LaunchChrome -- arming logic', () => {
  it('renders nothing for an objective with no progressTracking', () => {
    const { container } = render(
      <Mode5LaunchChrome objective={objective({ progressTracking: undefined })} />,
    );
    expect(container.querySelector('[data-testid="mode5-launch-chrome"]')).toBeNull();
  });

  it('does NOT arm on an actHandoff alone (it predates the restructure)', () => {
    const { container } = render(
      <Mode5LaunchChrome
        objective={objective({ progressTracking: undefined, actHandoff: 'Some Package' })}
      />,
    );
    expect(container.querySelector('[data-testid="mode5-launch-chrome"]')).toBeNull();
    expect(container.querySelector('[data-testid="mode5-act-handoff"]')).toBeNull();
  });
});

describe('LaunchProgressPanel', () => {
  it('renders each milestone as a metric line + a cadence pill', () => {
    render(
      <LaunchProgressPanel
        milestones={[
          { metric: 'Milestone achievement vs. plan', cadence: 'monthly review' },
          { metric: 'Task completion vs. schedule', cadence: 'weekly' },
        ]}
      />,
    );
    const panel = screen.getByTestId('launch-progress');
    expect(panel.textContent).toContain('Milestone achievement vs. plan');
    expect(panel.textContent).toContain('Task completion vs. schedule');
    const chips = screen.getAllByTestId('launch-progress-cadence');
    expect(chips.length).toBe(2);
    expect(chips.map((c) => c.textContent)).toEqual(['monthly review', 'weekly']);
  });
});

// --------------------------------------------------------------------------
// Capacity Bridge -- supply (Tier 0) joined against captured Phase-1 demand
// --------------------------------------------------------------------------

const PROJECT_ID = 'proj-bridge-1';

function seedSupply() {
  useMemberStore.setState({
    members: [
      { userId: 'u1', role: 'owner' },
      { userId: 'u2', role: 'steward' },
    ] as unknown as ProjectMemberRecord[],
  });
  useVisionStore.setState({
    visions: [
      {
        projectId: PROJECT_ID,
        phaseNotes: [],
        moontranceIdentity: null,
        conceptOverlayVisible: false,
        milestones: [],
        stewardProfiles: {
          u1: {
            maintenanceHrsInitial: 10,
            maintenanceHrsOngoing: 5,
            capabilityByDomain: { 'land-base': 1 },
            decisionRights: { 'land-use': 1 },
            residentStatus: 'live-in',
          },
          u2: { maintenanceHrsOngoing: 8, capabilityByDomain: { water: 1 } },
        },
        sharedVision: {},
        stewardTeam: {
          fundingSources: ['Charitable donation', 'Sponsorship'],
          skillGaps: ['plumbing'],
        },
      },
    ] as unknown as VisionData[],
  });
}

function seedDemand() {
  useActEvidenceStore.setState({
    visionFormData: {
      [PROJECT_ID]: {
        's7-resource-plan-c1': {
          dmLabour: [
            JSON.stringify({
              id: 'r1',
              task: 'Bed preparation',
              window: 'Spring',
              people: 2,
              hoursPerWeek: 20,
              sourcing: 'Existing steward team',
            }),
          ],
        },
        's7-resource-plan-c4': {
          dmCapital: [
            JSON.stringify({
              id: 'k1',
              category: 'Infrastructure',
              amount: 5000,
              channel: 'Charitable donation',
            }),
          ],
        },
      },
    },
  });
}

describe('CapacityBridgePanel', () => {
  beforeEach(() => {
    useActEvidenceStore.setState({ visionFormData: {} });
    useVisionStore.setState({ visions: [] });
    useMemberStore.setState({ members: [] });
  });

  it('does not render on any objective other than s7-resource-plan', () => {
    const { container } = render(
      <CapacityBridgePanel
        objective={objective({ id: 's7-risk-register' })}
        projectId={PROJECT_ID}
      />,
    );
    expect(container.querySelector('[data-testid="capacity-bridge"]')).toBeNull();
  });

  it('joins real supply against captured demand, with the derived hours balance', () => {
    seedSupply();
    seedDemand();
    render(
      <CapacityBridgePanel
        objective={objective({ id: 's7-resource-plan' })}
        projectId={PROJECT_ID}
      />,
    );

    const bridge = screen.getByTestId('capacity-bridge');
    expect(bridge.textContent).toContain('Supply -- Tier 0');
    expect(bridge.textContent).toContain('Demand -- Phase 1');

    // Supply rolled up from Obj 0.2: 2 stewards, (10+5)+(0+8)=23 weekly hours.
    expect(screen.getByText('23')).toBeTruthy();
    // Demand rolled up from the captured c1/c4: capital total 5000.
    expect(screen.getAllByText('5000').length).toBeGreaterThanOrEqual(1);
    // Only the permitted (Amanah-clean) channel the capture stored is shown.
    expect(screen.getByText('Charitable donation')).toBeTruthy();

    // The derived bridge reading: supply 23 - demand 20 = 3 hrs/week headroom.
    expect(screen.getByTestId('capacity-bridge-balance').textContent).toMatch(
      /3 hrs\/week headroom/,
    );
    expect(screen.queryByTestId('capacity-bridge-demand-empty')).toBeNull();
  });

  it('shows an honest "not yet captured" reading when demand is absent (supply still renders)', () => {
    seedSupply();
    render(
      <CapacityBridgePanel
        objective={objective({ id: 's7-resource-plan' })}
        projectId={PROJECT_ID}
      />,
    );

    expect(screen.getByTestId('capacity-bridge')).toBeTruthy();
    expect(screen.getByTestId('capacity-bridge-demand-empty')).toBeTruthy();
    // No fabricated balance without a real demand figure.
    expect(screen.queryByTestId('capacity-bridge-balance')).toBeNull();
    // Supply still renders independently of demand.
    expect(screen.getByText('23')).toBeTruthy();
  });
});

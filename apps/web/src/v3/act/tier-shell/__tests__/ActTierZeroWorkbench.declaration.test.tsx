/**
 * @vitest-environment happy-dom
 *
 * ActTierZeroWorkbench -- Plan Declaration mode + Act-parity guard.
 *
 * The workbench is shared: the Act stage mounts it with NO declaration props (the
 * byte-identical legacy 2-pane grid), and the Plan tier shell mounts it with
 * `mode="declaration"` to layer the Declaration chrome ON TOP. These tests pin
 * the integration seam at the mount point:
 *   1. declaration mode -> DeclarationCenter + (team objective) TeamRegistryPanel
 *      + the DecisionList act-handoff chip all render.
 *   2. Act parity (props omitted) -> NONE of the three render; the plain grid
 *      still mounts.
 *
 * The team objective makes TeamRegistryPanel read the roster join, so both the
 * member and vision stores are reset + the project seeded (ensureDefaults), as in
 * StewardTeamCapture.test.tsx.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

import ActTierZeroWorkbench, {
  type ActTierZeroWorkbenchProps,
} from '../ActTierZeroWorkbench.js';
import { useVisionStore } from '../../../../store/visionStore.js';
import { useMemberStore } from '../../../../store/memberStore.js';

const PROJECT_ID = 'proj-decl';

// The team objective (1.2 / s1-steward): mounting it active in declaration mode
// is what surfaces TeamRegistryPanel; its actHandoff feeds the handoff chip.
const STEWARD_OBJECTIVE: PlanStratumObjective = {
  id: 's1-steward',
  stratumId: 's1-project-foundation',
  title: 'Constitute the steward team',
  focusedQuestion: 'Who is doing this work, and what can they contribute?',
  prerequisiteObjectiveIds: ['s1-vision'],
  defaultOverlayBundle: [],
  checklist: [
    { id: 's1-steward-c1', label: 'Confirm the steward roster', feedsInto: [], optional: true },
    { id: 's1-steward-c2', label: 'Define functional team roles', feedsInto: [], optional: false },
  ],
  outputKind: 'plan-decision-record',
  decisionGroups: [],
  actHandoff: 'Steward Team & Capability Register',
} as PlanStratumObjective;

const VISION_OBJECTIVE: PlanStratumObjective = {
  id: 's1-vision',
  stratumId: 's1-project-foundation',
  title: 'Vision & intent',
  focusedQuestion: 'What is this project for?',
  prerequisiteObjectiveIds: [],
  defaultOverlayBundle: [],
  checklist: [
    { id: 's1-vision-c1', label: 'State the primary purpose', feedsInto: [], optional: false },
  ],
  outputKind: 'plan-decision-record',
  decisionGroups: [],
} as PlanStratumObjective;

beforeEach(() => {
  useMemberStore.setState({
    members: [],
    myRole: null,
    myRoles: {},
    isLoading: false,
  });
  useVisionStore.setState({ visions: [] });
  useVisionStore.getState().ensureDefaults(PROJECT_ID);
  localStorage.clear();
});

function renderWorkbench(
  overrides: Partial<ActTierZeroWorkbenchProps> = {},
): void {
  const props: ActTierZeroWorkbenchProps = {
    projectId: PROJECT_ID,
    objectives: [STEWARD_OBJECTIVE, VISION_OBJECTIVE],
    activeObjectiveId: STEWARD_OBJECTIVE.id,
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: [],
    progressByObjective: {},
    formValues: {},
    rationales: {},
    deferredItems: {},
    onRecord: vi.fn(),
    onSaveRationale: vi.fn(),
    onToggleDefer: vi.fn(),
    ...overrides,
  };
  render(<ActTierZeroWorkbench {...props} />);
}

describe('ActTierZeroWorkbench -- declaration mode', () => {
  it('mounts the DeclarationCenter, TeamRegistryPanel, and act-handoff chip', () => {
    renderWorkbench({
      mode: 'declaration',
      objectiveStatuses: { 's1-steward': 'active', 's1-vision': 'complete' },
      onSelectObjective: vi.fn(),
    });
    expect(screen.getByTestId('declaration-center')).toBeTruthy();
    // showActHandoff is true in declaration mode + the objective has an actHandoff.
    expect(screen.getByTestId('act-handoff')).toBeTruthy();
    // The decision list still renders beneath the chrome.
    expect(screen.getByText(/your decisions/i)).toBeTruthy();
    // List-first: the TeamRegistryPanel lives in the per-decision workspace, so
    // select a decision to surface it (active objective IS the team objective).
    fireEvent.click(screen.getAllByTestId('decision-item')[0]!);
    expect(screen.getByTestId('team-registry-panel')).toBeTruthy();
  });

  it('omits the TeamRegistryPanel when the active objective is NOT the team', () => {
    renderWorkbench({
      activeObjectiveId: VISION_OBJECTIVE.id,
      mode: 'declaration',
      objectiveStatuses: { 's1-steward': 'available', 's1-vision': 'active' },
    });
    expect(screen.getByTestId('declaration-center')).toBeTruthy();
    expect(screen.queryByTestId('team-registry-panel')).toBeNull();
  });
});

describe('ActTierZeroWorkbench -- Act parity (declaration props omitted)', () => {
  it('renders the plain grid with NO declaration chrome', () => {
    renderWorkbench();
    // List present...
    expect(screen.getByText(/your decisions/i)).toBeTruthy();
    // List-first: select a decision to surface the working panel.
    fireEvent.click(screen.getAllByTestId('decision-item')[0]!);
    expect(screen.getByText(/working on/i)).toBeTruthy();
    // ...but none of the Plan-only Declaration regions.
    expect(screen.queryByTestId('declaration-center')).toBeNull();
    expect(screen.queryByTestId('team-registry-panel')).toBeNull();
    expect(screen.queryByTestId('act-handoff')).toBeNull();
  });
});

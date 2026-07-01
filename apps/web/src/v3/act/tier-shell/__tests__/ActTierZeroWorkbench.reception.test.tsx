/**
 * @vitest-environment happy-dom
 *
 * ActTierZeroWorkbench -- Plan Reception (Tier-2) mode + Act-parity guard.
 *
 * The workbench is shared: the Act stage mounts it with NO mode (the byte-identical
 * legacy 2-pane grid), and the Plan tier shell mounts it with `mode="reception"`
 * to layer the Systems-Reading chrome ON TOP. These tests pin the integration seam:
 *   1. reception mode -> ReceptionCenter + the DecisionList Observe-Output chip +
 *      the working-panel intent-lens accordion + builds-on row all render; the
 *      Declaration chrome does NOT (the two modes are mutually exclusive).
 *   2. Act parity (mode omitted) -> NONE of the reception regions render; the
 *      plain grid still mounts.
 *
 * Mirrors ActTierZeroWorkbench.declaration.test.tsx (store resets + lucide stub).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';

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
import type { ReceptionProgressModel } from '../receptionModel.js';

const PROJECT_ID = 'proj-recep';

// 3.1 Water movement & hydrology -- the active reception survey. It carries the
// three new authoring fields (intentLens / observeOutput / buildsOnDisplay) that
// the reception chrome reads.
const HYDROLOGY_OBJECTIVE: PlanStratumObjective = {
  id: 's3-hydrology',
  stratumId: 's3-systems-reading',
  title: 'Water movement & hydrology',
  shortTitle: 'Water movement & hydrology',
  focusedQuestion: 'Where does water arrive, flow, pool, and leave?',
  prerequisiteObjectiveIds: [],
  defaultOverlayBundle: [],
  checklist: [
    { id: 's3-hydro-c1', label: 'Trace surface flow paths', feedsInto: [], optional: false },
    { id: 's3-hydro-c2', label: 'Mark pooling and wet zones', feedsInto: [], optional: false },
  ],
  outputKind: 'plan-decision-record',
  decisionGroups: [],
  intentLens: [
    { typeId: 'regenerative_farm', text: 'Look for swale lines and contour flow' },
    { typeId: 'silvopasture', text: 'Trace stock-water reach across paddocks' },
  ],
  observeOutput: 'Hydrology Survey Record',
  actHandoff: 'Water Infrastructure Brief',
  buildsOnDisplay: 'Stratum 2.1 Terrain & topography',
} as PlanStratumObjective;

const SOIL_OBJECTIVE: PlanStratumObjective = {
  id: 's3-soil',
  stratumId: 's3-systems-reading',
  title: 'Soil conditions & subsurface',
  focusedQuestion: 'What is the soil doing below the surface?',
  prerequisiteObjectiveIds: [],
  defaultOverlayBundle: [],
  checklist: [
    { id: 's3-soil-c1', label: 'Log texture and structure', feedsInto: [], optional: false },
  ],
  outputKind: 'plan-decision-record',
  decisionGroups: [],
} as PlanStratumObjective;

const STATUSES: Record<string, PlanStratumObjectiveStatus> = {
  's3-hydrology': 'active',
  's3-soil': 'available',
};

const RECEPTION_PROGRESS: ReceptionProgressModel = {
  tierOne: { complete: 4, total: 6 },
  tierTwo: { complete: 0, total: 5 },
  totalRecords: 11,
  capturedRecords: 0,
  thresholdOpen: false,
};

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
    objectives: [HYDROLOGY_OBJECTIVE, SOIL_OBJECTIVE],
    activeObjectiveId: HYDROLOGY_OBJECTIVE.id,
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['silvopasture'],
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

describe('ActTierZeroWorkbench -- reception mode', () => {
  it('mounts the ReceptionCenter, Observe chip, intent lens, and builds-on row', () => {
    renderWorkbench({
      mode: 'reception',
      objectiveStatuses: STATUSES,
      receptionProgress: RECEPTION_PROGRESS,
      onSelectObjective: vi.fn(),
    });
    expect(screen.getByTestId('reception-center')).toBeTruthy();
    // showObserveOutput is true in reception mode + the objective has one.
    expect(screen.getByTestId('observe-output')).toBeTruthy();
    // The decision list still renders beneath the chrome.
    expect(screen.getByText(/your decisions/i)).toBeTruthy();
    // List-first: the working panel wires the survey's intent lens + builds-on
    // line, so select a decision to surface them.
    fireEvent.click(screen.getAllByTestId('decision-item')[0]!);
    expect(screen.getByTestId('intent-lens')).toBeTruthy();
    expect(screen.getByTestId('builds-on')).toBeTruthy();
    // Reception and Declaration chrome are mutually exclusive.
    expect(screen.queryByTestId('declaration-center')).toBeNull();
  });
});

describe('ActTierZeroWorkbench -- Act parity (reception props omitted)', () => {
  it('renders the plain grid with NO reception chrome', () => {
    renderWorkbench();
    // Grid present...
    expect(screen.getByText(/your decisions/i)).toBeTruthy();
    // ...but none of the Plan-only Reception regions.
    expect(screen.queryByTestId('reception-center')).toBeNull();
    expect(screen.queryByTestId('observe-output')).toBeNull();
    expect(screen.queryByTestId('intent-lens')).toBeNull();
    expect(screen.queryByTestId('builds-on')).toBeNull();
  });
});

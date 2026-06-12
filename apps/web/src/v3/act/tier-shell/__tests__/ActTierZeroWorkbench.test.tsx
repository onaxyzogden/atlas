/**
 * @vitest-environment happy-dom
 *
 * ActTierZeroWorkbench -- the 2-pane canvas Tier-0 container: LEFT DecisionList
 * + RIGHT DecisionWorkingPanel. The objectives rail has been removed from this
 * component and is provided by the parent (ActTierShell) via StageShell's
 * leftRail slot. It owns ONLY the active-decision selection state and the pure
 * item->DecisionPanelTarget derivation. All store reads/writes are lifted to the
 * parent; option resolution is pure and done here from the project type-id props.
 *
 * Verified behaviours:
 *   1. renders both panes (center "Your Decisions", right panel).
 *   2. default selection = first checklist item -> right panel header shows its label.
 *   3. clicking a different center decision row updates the right panel.
 *   4. selecting the success-criteria item shows SuccessCriteriaCapture + at least one chip.
 *   5. onRecord is called with the SELECTED itemId + a 3-criteria value.
 *   6. a completed selected item shows the "Recorded" badge in the panel.
 *
 * Lucide forwardRef icons are replaced with clean <svg> stubs (established
 * pattern; the children import many icons so the mock is a generic catch-all).
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  PlanStratumObjective,
  PlanDecisionChecklistItem,
} from '@ogden/shared';
import {
  allCatalogueObjectives,
  resolveLabourSkills,
  resolveVisionClassifyOptions,
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
  buildDecisionTarget,
  type ActTierZeroWorkbenchProps,
} from '../ActTierZeroWorkbench.js';
import { useStakeholderRegisterStore } from '../../../../store/stakeholderRegisterStore.js';

// ---------------------------------------------------------------------------
// Fixtures: the active objective uses REAL catalog ids so buildDecisionTarget
// resolves tools (purpose -> single text; success-criteria -> repeatable
// hybrid w/ successCriteriaByType; labour -> multi-field). A second objective
// gives the rail something to switch to and count.
// ---------------------------------------------------------------------------

const ACTIVE_OBJECTIVE: PlanStratumObjective = {
  id: 's1-vision',
  stratumId: 's1-project-foundation',
  title: 'Define vision, goals & capacity',
  focusedQuestion: 'What is this project for, and what does success look like?',
  prerequisiteObjectiveIds: [],
  defaultOverlayBundle: [],
  checklist: [
    { id: 's1-vision-c1', label: 'State the primary purpose', feedsInto: [], optional: false },
    { id: 's1-vision-c2', label: 'Define measurable success criteria', feedsInto: [], optional: false },
    { id: 's1-vision-labour', label: 'Inventory available labour', feedsInto: [], optional: true },
  ],
  outputKind: 'plan-decision-record',
  decisionGroups: [],
  completionGate: 'A bounded, evidence-grounded vision is approved by the steward.',
} as PlanStratumObjective;

const OTHER_OBJECTIVE: PlanStratumObjective = {
  id: 's1-foundation',
  stratumId: 's1-project-foundation',
  title: 'State the primary purpose',
  focusedQuestion: 'Why does this project exist?',
  prerequisiteObjectiveIds: [],
  defaultOverlayBundle: [],
  checklist: [
    { id: 'foundation-c1', label: 'Purpose one-liner', feedsInto: [], optional: false },
    { id: 'foundation-c2', label: 'Confirm steward', feedsInto: [], optional: false },
  ],
  outputKind: 'plan-decision-record',
  decisionGroups: [],
} as PlanStratumObjective;

function renderWorkbench(
  overrides: Partial<ActTierZeroWorkbenchProps> = {},
): {
  onRecord: ReturnType<typeof vi.fn>;
  onSaveRationale: ReturnType<typeof vi.fn>;
  onToggleDefer: ReturnType<typeof vi.fn>;
} {
  const onRecord = vi.fn();
  const onSaveRationale = vi.fn();
  const onToggleDefer = vi.fn();
  const props: ActTierZeroWorkbenchProps = {
    projectId: 'proj-1',
    objectives: [OTHER_OBJECTIVE, ACTIVE_OBJECTIVE],
    activeObjectiveId: ACTIVE_OBJECTIVE.id,
    primaryTypeId: 'homestead',
    secondaryTypeIds: [],
    progressByObjective: {},
    formValues: {},
    rationales: {},
    deferredItems: {},
    onRecord,
    onSaveRationale,
    onToggleDefer,
    ...overrides,
  };
  render(<ActTierZeroWorkbench {...props} />);
  return { onRecord, onSaveRationale, onToggleDefer };
}

describe('ActTierZeroWorkbench -- panes', () => {
  it('renders both panes (center DecisionList, right working panel)', () => {
    renderWorkbench();
    // Center pane: DecisionList header
    expect(screen.getByText(/your decisions/i)).toBeTruthy();
    // Right panel header eyebrow.
    expect(screen.getByText(/working on/i)).toBeTruthy();
    // Objectives rail is NOT rendered by this component (moved to ActTierShell)
    expect(screen.queryByText('Objectives')).toBeNull();
    // "Completes Tier 0" next-box is NOT rendered by this component
    expect(screen.queryByText('Completes Tier 0')).toBeNull();
  });
});

describe('ActTierZeroWorkbench -- selection', () => {
  it('defaults selection to the first checklist item (right panel shows its label)', () => {
    renderWorkbench();
    // The right panel header carries the selected decision label.
    const headings = screen.getAllByText('State the primary purpose');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('updates the right panel when a different center decision row is clicked', () => {
    renderWorkbench();
    const rows = screen.getAllByTestId('decision-item');
    const sc = rows.find(
      (r) => r.getAttribute('data-item-id') === 's1-vision-c2',
    )!;
    fireEvent.click(sc);
    // Success-criteria capture surfaces "Suggested criteria".
    expect(screen.getByText(/suggested criteria/i)).toBeTruthy();
  });
});

describe('ActTierZeroWorkbench -- success criteria', () => {
  it('shows SuccessCriteriaCapture chips for resolved options when the SC item is selected', () => {
    renderWorkbench();
    const rows = screen.getAllByTestId('decision-item');
    const sc = rows.find(
      (r) => r.getAttribute('data-item-id') === 's1-vision-c2',
    )!;
    fireEvent.click(sc);
    expect(screen.getByText(/suggested criteria/i)).toBeTruthy();
    // _base success-criteria includes "Baseline conditions recorded".
    expect(screen.getByText(/baseline conditions recorded/i)).toBeTruthy();
  });

  it('calls onRecord with the SELECTED itemId and a 3-criteria value', () => {
    const { onRecord } = renderWorkbench({
      formValues: { 's1-vision-c2': { criteria: ['a', 'b', 'c'] } },
    });
    const rows = screen.getAllByTestId('decision-item');
    const sc = rows.find(
      (r) => r.getAttribute('data-item-id') === 's1-vision-c2',
    )!;
    fireEvent.click(sc);
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [itemId, value] = onRecord.mock.calls[0]!;
    expect(itemId).toBe('s1-vision-c2');
    expect((value.criteria as string[]).length).toBe(3);
  });
});

describe('ActTierZeroWorkbench -- rationale flush on switch', () => {
  it('flushes the typed rationale to the OUTGOING item id when a different decision is clicked', () => {
    const { onSaveRationale } = renderWorkbench();
    // Default selection is the first checklist item (s1-vision-c1).
    const ta = screen.getByLabelText(/rationale/i);
    fireEvent.change(ta, {
      target: { value: 'Reasoning bound to the first decision.' },
    });
    expect(onSaveRationale).not.toHaveBeenCalled();
    // Click a DIFFERENT decision row WITHOUT blurring the textarea.
    const rows = screen.getAllByTestId('decision-item');
    const sc = rows.find(
      (r) => r.getAttribute('data-item-id') === 's1-vision-c2',
    )!;
    fireEvent.click(sc);
    // The save must land on the OUTGOING item id (s1-vision-c1), not the
    // newly-selected one.
    expect(onSaveRationale).toHaveBeenCalledTimes(1);
    expect(onSaveRationale).toHaveBeenCalledWith(
      's1-vision-c1',
      'Reasoning bound to the first decision.',
    );
  });
});

describe('ActTierZeroWorkbench -- recorded badge', () => {
  it('shows the "Recorded" badge when the selected item is in progress', () => {
    renderWorkbench({
      progressByObjective: { 's1-vision': ['s1-vision-c1'] },
    });
    // Default selection is the first item (s1-vision-c1), which is complete.
    expect(screen.getByText(/^recorded$/i)).toBeTruthy();
  });
});

describe('buildDecisionTarget -- labour detection', () => {
  it('flags isLabourInventory for the s1-vision-labour decision (and not SC)', () => {
    const labourItem: PlanDecisionChecklistItem = {
      id: 's1-vision-labour',
      label: 'Inventory available labour',
      feedsInto: [],
      optional: true,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(labourItem);
    expect(target.isLabourInventory).toBe(true);
    expect(target.isSuccessCriteria).toBe(false);
  });

  it('does NOT flag isLabourInventory for a non-labour decision', () => {
    const purposeItem: PlanDecisionChecklistItem = {
      id: 's1-vision-c1',
      label: 'State the primary purpose',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(purposeItem);
    expect(target.isLabourInventory).toBe(false);
  });

  it('does NOT flag isLabourInventory for a synthetic unmatched id', () => {
    const syntheticItem: PlanDecisionChecklistItem = {
      id: 'not-a-real-form-id',
      label: 'Synthetic',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(syntheticItem);
    expect(target.isLabourInventory).toBe(false);
  });
});

describe('ActTierZeroWorkbench -- labour skill threading', () => {
  it('threads type-aware resolved labour skills into the labour surface', () => {
    renderWorkbench({ primaryTypeId: 'homestead', secondaryTypeIds: [] });
    // Select the labour decision in the center list.
    const rows = screen.getAllByTestId('decision-item');
    const labour = rows.find(
      (r) => r.getAttribute('data-item-id') === 's1-vision-labour',
    )!;
    fireEvent.click(labour);
    // The skills the panel should offer == resolveLabourSkills(primary, secs).
    const expected = resolveLabourSkills('homestead', []);
    expect(expected.length).toBeGreaterThan(0);
    const firstSkill = expected[0]!;
    // The resolved skills must render as skill-row labels in the surface. Assert
    // the FIRST resolved entry (computed from the resolver) rather than a
    // hardcoded string, so the test stays green through operator content
    // revisions of the REVIEW-flagged _base labour-skill list.
    expect(screen.getAllByText(firstSkill).length).toBeGreaterThan(0);
  });
});

describe('buildDecisionTarget -- vision-classify detection', () => {
  it('flags isVisionClassify for the s1-vision-classify decision', () => {
    const classifyItem: PlanDecisionChecklistItem = {
      id: 's1-vision-classify',
      label: 'Classify committed vs aspirational vision',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(classifyItem);
    expect(target.isVisionClassify).toBe(true);
  });

  it('does NOT flag isVisionClassify for the labour decision', () => {
    const labourItem: PlanDecisionChecklistItem = {
      id: 's1-vision-labour',
      label: 'Inventory available labour',
      feedsInto: [],
      optional: true,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(labourItem);
    expect(target.isVisionClassify).toBe(false);
  });

  it('does NOT flag isVisionClassify for the success-criteria decision', () => {
    const scItem: PlanDecisionChecklistItem = {
      id: 's1-vision-c2',
      label: 'Define measurable success criteria',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(scItem);
    expect(target.isVisionClassify).toBe(false);
  });
});

describe('buildDecisionTarget -- boundary detection', () => {
  it('flags isBoundary for an s1-boundaries-* decision', () => {
    const boundaryItem: PlanDecisionChecklistItem = {
      id: 's1-boundaries-c3',
      label: 'Identify easements and rights of way',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(boundaryItem);
    expect(target.isBoundary).toBe(true);
  });

  it('does NOT flag isBoundary for a vision decision', () => {
    const classifyItem: PlanDecisionChecklistItem = {
      id: 's1-vision-classify',
      label: 'Classify committed vs aspirational vision',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(classifyItem);
    expect(target.isBoundary).toBe(false);
  });
});

describe('buildDecisionTarget -- grazing detection', () => {
  it('flags isGrazing for a silv-sec-s4-grazing-design-* decision', () => {
    const grazingItem: PlanDecisionChecklistItem = {
      id: 'silv-sec-s4-grazing-design-c1',
      label: 'Choose a grazing method',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(grazingItem);
    expect(target.isGrazing).toBe(true);
  });

  it('does NOT flag isGrazing for a forage decision', () => {
    const forageItem: PlanDecisionChecklistItem = {
      id: 'silv-sec-s3-forage-survey-c1',
      label: 'Map existing pasture and understorey forage by zone',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(forageItem);
    expect(target.isGrazing).toBe(false);
  });
});

describe('buildDecisionTarget -- livestock intent detection', () => {
  it('flags isLivestockIntent for a silv-sec-s1-livestock-intent-* decision', () => {
    const livestockItem: PlanDecisionChecklistItem = {
      id: 'silv-sec-s1-livestock-intent-c1',
      label: 'Define the integration rationale',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(livestockItem);
    expect(target.isLivestockIntent).toBe(true);
    // It must NOT collide with the grazing flag.
    expect(target.isGrazing).toBe(false);
  });

  it('does NOT flag isLivestockIntent for a grazing decision', () => {
    const grazingItem: PlanDecisionChecklistItem = {
      id: 'silv-sec-s4-grazing-design-c1',
      label: 'Choose a grazing method',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(grazingItem);
    expect(target.isLivestockIntent).toBe(false);
  });
});

describe('buildDecisionTarget -- propagation-infra detection', () => {
  it('flags isPropagationInfra for a nur-sec-s1-propagation-infra-survey-* decision', () => {
    const propItem: PlanDecisionChecklistItem = {
      id: 'nur-sec-s1-propagation-infra-survey-c1',
      label:
        'Inventory existing propagation infrastructure - glasshouses, shade houses, benches, misting systems',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(propItem);
    expect(target.isPropagationInfra).toBe(true);
  });

  it('does NOT flag isPropagationInfra for the sibling biosecurity decision', () => {
    const bioItem: PlanDecisionChecklistItem = {
      id: 'nur-sec-s2-biosecurity-survey-c1',
      label: 'Identify soil-borne diseases in proposed propagation areas',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(bioItem);
    expect(target.isPropagationInfra).toBe(false);
  });
});

describe('buildDecisionTarget -- exit-succession detection', () => {
  it('flags isExitSuccession for an ev-s7-exit-succession-* decision', () => {
    const exitItem: PlanDecisionChecklistItem = {
      id: 'ev-s7-exit-succession-c1',
      label:
        'Define exit process - notice period, financial settlement calculation, timeline',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(exitItem);
    expect(target.isExitSuccession).toBe(true);
  });

  it('does NOT flag isExitSuccession for the sibling provision-balance decision', () => {
    const provItem: PlanDecisionChecklistItem = {
      id: 'ev-s1-provision-balance-c1',
      label: 'Map which provisions are communal, hybrid, or household',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(provItem);
    expect(target.isExitSuccession).toBe(false);
  });
});

describe('buildDecisionTarget -- social-fabric detection', () => {
  it('flags isSocialFabric for an ev-s2-social-fabric-* decision', () => {
    const sfItem: PlanDecisionChecklistItem = {
      id: 'ev-s2-social-fabric-c1',
      label: 'Map founding relationships',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(sfItem);
    expect(target.isSocialFabric).toBe(true);
  });

  it('does NOT flag isSocialFabric for the sibling provision-balance decision', () => {
    const provItem: PlanDecisionChecklistItem = {
      id: 'ev-s1-provision-balance-c1',
      label: 'Map which provisions are communal, hybrid, or household',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(provItem);
    expect(target.isSocialFabric).toBe(false);
  });
});

describe('buildDecisionTarget -- infra-condition detection', () => {
  it('flags isInfraCondition for an ev-s3-infra-condition-* decision', () => {
    const icItem: PlanDecisionChecklistItem = {
      id: 'ev-s3-infra-condition-c1',
      label: 'Inventory communal buildings',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(icItem);
    expect(target.isInfraCondition).toBe(true);
  });

  it('does NOT flag isInfraCondition for the sibling social-fabric decision', () => {
    const sfItem: PlanDecisionChecklistItem = {
      id: 'ev-s2-social-fabric-c1',
      label: 'Map founding relationships',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
    const target = buildDecisionTarget(sfItem);
    expect(target.isInfraCondition).toBe(false);
  });
});

describe('ActTierZeroWorkbench -- boundary map-activation strip', () => {
  const BOUNDARY_OBJECTIVE: PlanStratumObjective = {
    ...ACTIVE_OBJECTIVE,
    id: 's1-boundaries',
    title: 'Establish legal & physical boundaries',
    checklist: [
      {
        id: 's1-boundaries-c1',
        label: 'Confirm title and deed',
        feedsInto: [],
        optional: false,
      },
      {
        id: 's1-boundaries-c3',
        label: 'Identify easements and rights of way',
        feedsInto: [],
        optional: false,
      },
    ],
  } as PlanStratumObjective;

  it('renders the map-activation strip when the active objective is s1-boundaries', () => {
    renderWorkbench({
      objectives: [BOUNDARY_OBJECTIVE],
      activeObjectiveId: BOUNDARY_OBJECTIVE.id,
    });
    const strip = screen.getByTestId('boundary-map-strip');
    expect(strip).toBeTruthy();
    expect(strip.textContent).toMatch(/2 overlays will activate on the map/i);
    expect(strip.textContent).toMatch(/Risk \/ Compliance/i);
    expect(strip.textContent).toMatch(/Site Boundary/i);
  });

  it('renders a mode badge on a boundary decision row', () => {
    renderWorkbench({
      objectives: [BOUNDARY_OBJECTIVE],
      activeObjectiveId: BOUNDARY_OBJECTIVE.id,
    });
    // c3 is mapEntry -> "Map + entry".
    const badge = screen.getByTestId('mode-badge-s1-boundaries-c3');
    expect(badge.textContent).toMatch(/map \+ entry/i);
  });

  it('renders no boundary strip for s1-vision, but surfaces its vision artifact badges', () => {
    renderWorkbench();
    // s1-vision is not a boundary objective -- no map-activation strip leaks in.
    expect(screen.queryByTestId('boundary-map-strip')).toBeNull();
    // ...but main's 91f52d3f gives s1-vision rows their own "vs-*" artifact badges.
    expect(screen.getByTestId('mode-badge-s1-vision-c1').textContent).toMatch(/purpose statement/i);
    expect(screen.getByTestId('mode-badge-s1-vision-c2').textContent).toMatch(/success criteria/i);
    expect(screen.getByTestId('mode-badge-s1-vision-labour').textContent).toMatch(/labour inventory/i);
    // No boundary-style mode badge sneaks in.
    expect(screen.queryByTestId('mode-badge-s1-boundaries-c3')).toBeNull();
  });
});

describe('buildDecisionTarget -- stakeholder detection', () => {
  function makeStakeholderItem(id: string): PlanDecisionChecklistItem {
    return {
      id,
      label: `Stakeholder item ${id}`,
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
  }

  it('flags isStakeholder for s1-stakeholders-c1 through c6', () => {
    for (const id of [
      's1-stakeholders-c1',
      's1-stakeholders-c2',
      's1-stakeholders-c3',
      's1-stakeholders-c4',
      's1-stakeholders-c5',
      's1-stakeholders-c6',
    ]) {
      const target = buildDecisionTarget(makeStakeholderItem(id));
      expect(target.isStakeholder).toBe(true);
    }
  });

  it('does NOT flag isStakeholder for a non-stakeholder id', () => {
    const visionTarget = buildDecisionTarget({
      id: 's1-vision-classify',
      label: 'Classify committed vs aspirational vision',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem);
    expect(visionTarget.isStakeholder).toBe(false);

    const boundaryTarget = buildDecisionTarget({
      id: 's1-boundaries-c3',
      label: 'Identify easements and rights of way',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem);
    expect(boundaryTarget.isStakeholder).toBe(false);
  });

  it('sets deferrable === false ONLY for s1-stakeholders-c3', () => {
    expect(buildDecisionTarget(makeStakeholderItem('s1-stakeholders-c3')).deferrable).toBe(false);
  });

  it('sets deferrable === undefined for other stakeholder items and non-stakeholder ids', () => {
    expect(buildDecisionTarget(makeStakeholderItem('s1-stakeholders-c1')).deferrable).toBeUndefined();
    expect(buildDecisionTarget(makeStakeholderItem('s1-stakeholders-c5')).deferrable).toBeUndefined();
    expect(buildDecisionTarget({
      id: 's1-vision-classify',
      label: 'Classify',
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem).deferrable).toBeUndefined();
  });
});

describe('buildDecisionTarget -- steward detection', () => {
  function makeItem(id: string): PlanDecisionChecklistItem {
    return {
      id,
      label: `Item ${id}`,
      feedsInto: [],
      optional: false,
    } as PlanDecisionChecklistItem;
  }

  it('flags isSteward + deferLabel for s1-vision-steward and keeps it deferrable', () => {
    const target = buildDecisionTarget(makeItem('s1-vision-steward'));
    expect(target.isSteward).toBe(true);
    expect(target.deferLabel).toBe('Add team members later in settings');
    expect(target.deferrable).not.toBe(false);
  });

  it('does NOT flag isSteward or deferLabel for a non-steward vision item', () => {
    const target = buildDecisionTarget(makeItem('s1-vision-classify'));
    expect(target.isSteward).toBe(false);
    expect(target.deferLabel).toBeUndefined();
  });

  it('keeps deferrable === false and isSteward === false for s1-stakeholders-c3', () => {
    const target = buildDecisionTarget(makeItem('s1-stakeholders-c3'));
    expect(target.deferrable).toBe(false);
    expect(target.isSteward).toBe(false);
  });
});

describe('ActTierZeroWorkbench -- stakeholder objective (strips + badges)', () => {
  const STAKEHOLDER_OBJECTIVE: PlanStratumObjective = {
    ...ACTIVE_OBJECTIVE,
    id: 's1-stakeholders',
    title: 'Map stakeholders & relationships',
    checklist: [
      {
        id: 's1-stakeholders-c1',
        label: 'Identify adjacent landowners',
        feedsInto: [],
        optional: false,
      },
      {
        id: 's1-stakeholders-c3',
        label: 'Identify Indigenous land relationships',
        feedsInto: [],
        optional: false,
      },
    ],
  } as PlanStratumObjective;

  it('does NOT render the boundary-map-strip for s1-stakeholders', () => {
    renderWorkbench({
      objectives: [STAKEHOLDER_OBJECTIVE],
      activeObjectiveId: STAKEHOLDER_OBJECTIVE.id,
    });
    expect(screen.queryByTestId('boundary-map-strip')).toBeNull();
  });

  it('renders stakeholder mode badges on decision rows', () => {
    renderWorkbench({
      objectives: [STAKEHOLDER_OBJECTIVE],
      activeObjectiveId: STAKEHOLDER_OBJECTIVE.id,
    });
    // c1 => mapContact => "Map + contact"
    const c1Badge = screen.getByTestId('mode-badge-s1-stakeholders-c1');
    expect(c1Badge.textContent).toMatch(/map \+ contact/i);
    // c3 => cultural => "Cultural"
    const c3Badge = screen.getByTestId('mode-badge-s1-stakeholders-c3');
    expect(c3Badge.textContent).toMatch(/cultural/i);
  });

  it('renders the stakeholder map-strip ("2 overlays active on map")', () => {
    renderWorkbench({
      objectives: [STAKEHOLDER_OBJECTIVE],
      activeObjectiveId: STAKEHOLDER_OBJECTIVE.id,
    });
    const strip = screen.getByTestId('stakeholder-map-strip');
    expect(strip.textContent).toMatch(/2 overlays active on map/i);
  });

  it('renders the reg-strip with the register label + ASCII note', () => {
    renderWorkbench({
      objectives: [STAKEHOLDER_OBJECTIVE],
      activeObjectiveId: STAKEHOLDER_OBJECTIVE.id,
    });
    const strip = screen.getByTestId('stakeholder-reg-strip');
    expect(strip.textContent).toMatch(/stakeholders in register/i);
    expect(strip.textContent).toContain(
      'Items 1-4 build the register - Items 5-6 annotate it',
    );
  });

  it('reg-count reflects the LIVE shared register for the project', () => {
    const projectId = 'proj-reg-count';
    const store = useStakeholderRegisterStore.getState();
    store.createStakeholder(projectId, {
      name: 'Neighbour A',
      type: 'neighbour',
      role: '',
    });
    store.createStakeholder(projectId, {
      name: 'Authority B',
      type: 'authority',
      role: '',
    });
    renderWorkbench({
      projectId,
      objectives: [STAKEHOLDER_OBJECTIVE],
      activeObjectiveId: STAKEHOLDER_OBJECTIVE.id,
    });
    expect(screen.getByTestId('stakeholder-reg-count').textContent).toBe('2');
  });

  it('does NOT render either stakeholder strip for s1-vision', () => {
    renderWorkbench();
    expect(screen.queryByTestId('stakeholder-map-strip')).toBeNull();
    expect(screen.queryByTestId('stakeholder-reg-strip')).toBeNull();
  });
});

describe('ActTierZeroWorkbench -- arbitrary future objective (no descriptor entry)', () => {
  // An S2-style objective with no entry in workbenchAffordances must mount the
  // generic 2-pane workbench: both panes render, but NO map/register strips and
  // NO mode badges (showGroups defaults off, modeFor is undefined). This proves
  // an arbitrary S2-S7 objective routes through the generic path with no
  // special-casing in the component.
  const S2_OBJECTIVE: PlanStratumObjective = {
    ...ACTIVE_OBJECTIVE,
    id: 's2-fake-carrying-capacity',
    title: 'Assess carrying capacity',
    checklist: [
      {
        id: 's2-fake-carrying-capacity-c1',
        label: 'Estimate forage availability',
        feedsInto: [],
        optional: false,
      },
      {
        id: 's2-fake-carrying-capacity-c2',
        label: 'Set initial stocking rate',
        feedsInto: [],
        optional: false,
      },
    ],
  } as PlanStratumObjective;

  it('mounts the 2-pane workbench with NO strips and NO mode badges', () => {
    renderWorkbench({
      objectives: [S2_OBJECTIVE],
      activeObjectiveId: S2_OBJECTIVE.id,
    });
    // Both panes present.
    expect(screen.getByText(/your decisions/i)).toBeTruthy();
    expect(screen.getByText(/working on/i)).toBeTruthy();
    // No affordance strips of any kind.
    expect(screen.queryByTestId('boundary-map-strip')).toBeNull();
    expect(screen.queryByTestId('stakeholder-map-strip')).toBeNull();
    expect(screen.queryByTestId('stakeholder-reg-strip')).toBeNull();
    // No mode badges (modeFor is undefined for an unknown objective).
    expect(screen.queryByTestId(/^mode-badge-/)).toBeNull();
  });
});

describe('ActTierZeroWorkbench -- universal gap-closure objectives (2026-06-12)', () => {
  // s4-direction / s7-phase1 / s7-resource-plan joined TIER_ZERO_OBJECTIVE_IDS
  // as the v1 closure of the last universal no-path items. Each is a REAL
  // catalogue objective with no workbenchAffordances entry and no bespoke
  // capture, so the generic 2-pane workbench (textarea fallback + Record) must
  // mount for every one of them, and recording must fire onRecord with the
  // selected item id — that is the per-item evidence path the classifier now
  // counts as `workbench-capture`.
  const byId = new Map(allCatalogueObjectives().map((o) => [o.id, o] as const));
  const GAP_CLOSURE_IDS = ['s4-direction', 's7-phase1', 's7-resource-plan'] as const;

  it.each(GAP_CLOSURE_IDS)('%s mounts the generic 2-pane workbench', (id) => {
    const objective = byId.get(id);
    expect(objective).toBeDefined();
    renderWorkbench({
      objectives: [objective!],
      activeObjectiveId: id,
    });
    expect(screen.getByText(/your decisions/i)).toBeTruthy();
    expect(screen.getByText(/working on/i)).toBeTruthy();
    // Default selection = first checklist item; its label heads the panel.
    expect(
      screen.getAllByText(objective!.checklist[0]!.label).length,
    ).toBeGreaterThan(0);
  });

  it('recording via the generic fallback fires onRecord with the item id', () => {
    const objective = byId.get('s4-direction')!;
    const { onRecord } = renderWorkbench({
      objectives: [objective],
      activeObjectiveId: objective.id,
    });
    // The generic fallback textarea is labelled with the item's own label.
    const ta = screen.getByLabelText(objective.checklist[0]!.label);
    fireEvent.change(ta, {
      target: { value: 'Bounded planning direction approved for cycle 1.' },
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(onRecord.mock.calls[0]![0]).toBe(objective.checklist[0]!.id);
  });
});

describe('ActTierZeroWorkbench -- ecovillage (ev-) gap-closure objectives (2026-06-12)', () => {
  // The ev- S4/S6/S7 gap-closure objectives are REAL catalogue objectives that
  // route through the generic 2-pane workbench (textarea fallback + Record),
  // exactly like the universal gap-closure block above. Several are GROUPED
  // (non-empty decisionGroups) but carry NO workbenchAffordances entry, so the
  // generic divider-derivation path must surface decision-group dividers for
  // them without any per-objective edit in the component.
  const byId = new Map(allCatalogueObjectives().map((o) => [o.id, o] as const));
  const EV_GAP_CLOSURE_IDS = [
    'ev-s4-food-system','ev-s4-infra-strategy','ev-s6-coordination-feedback',
    'ev-s6-external-relations','ev-s6-maintenance-protocol','ev-s6-social-monitoring',
    'ev-s7-financial-plan','ev-s7-launch-sequence','ev-s7-onboarding','ev-s7-settlement-plan',
  ] as const;

  it.each(EV_GAP_CLOSURE_IDS)('%s mounts the generic 2-pane workbench', (id) => {
    const objective = byId.get(id);
    expect(objective).toBeDefined();
    renderWorkbench({
      objectives: [objective!],
      activeObjectiveId: id,
    });
    expect(screen.getByText(/your decisions/i)).toBeTruthy();
    expect(screen.getByText(/working on/i)).toBeTruthy();
    // Default selection = first checklist item; its label heads the panel.
    expect(
      screen.getAllByText(objective!.checklist[0]!.label).length,
    ).toBeGreaterThan(0);
  });

  it('recording via the generic fallback fires onRecord with the item id', () => {
    const objective = byId.get('ev-s7-settlement-plan')!;
    const { onRecord } = renderWorkbench({
      objectives: [objective],
      activeObjectiveId: objective.id,
    });
    // The generic fallback textarea is labelled with the item's own label.
    const ta = screen.getByLabelText(objective.checklist[0]!.label);
    fireEvent.change(ta, {
      target: { value: 'Bounded settlement plan approved for cycle 1.' },
    });
    const btn = screen.getByRole('button', {
      name: /record this decision/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(onRecord.mock.calls[0]![0]).toBe(objective.checklist[0]!.id);
  });

  it('renders decision-group dividers generically for a grouped non-descriptor objective', () => {
    const objective = byId.get('ev-s7-settlement-plan')!;
    renderWorkbench({
      objectives: [objective],
      activeObjectiveId: objective.id,
    });
    // ev-s7-settlement-plan has no workbenchAffordances entry, so showGroups is
    // derived from group presence -- one divider per decision group.
    expect(screen.getAllByTestId('decision-group').length).toBe(
      objective.decisionGroups.length,
    );
  });

  it('does not render group dividers for s1-stakeholders (descriptor, showGroups false)', () => {
    const objective = byId.get('s1-stakeholders')!;
    renderWorkbench({
      objectives: [objective],
      activeObjectiveId: objective.id,
    });
    // s1-stakeholders HAS decisionGroups but is an authored descriptor with
    // showGroups:false -- the descriptor boolean wins, so NO dividers render.
    expect(screen.queryAllByTestId('decision-group').length).toBe(0);
  });
});

describe('ActTierZeroWorkbench -- vision-classify suggestion threading', () => {
  it('threads type-aware resolved vision-classify suggestions into the panel', () => {
    // Use an objective whose FIRST checklist item is the vision-classify
    // decision so default selection lands on it (mirrors the labour threading
    // test, but seeds the item via the objectives override).
    const classifyObjective: PlanStratumObjective = {
      ...ACTIVE_OBJECTIVE,
      checklist: [
        {
          id: 's1-vision-classify',
          label: 'Classify committed vs aspirational vision',
          feedsInto: [],
          optional: false,
        },
      ],
    } as PlanStratumObjective;
    renderWorkbench({
      objectives: [classifyObjective],
      activeObjectiveId: classifyObjective.id,
      primaryTypeId: 'homestead',
      secondaryTypeIds: [],
    });
    // The suggestions the panel should offer == resolveVisionClassifyOptions.
    const expected = resolveVisionClassifyOptions('homestead', []);
    expect(expected.length).toBeGreaterThan(0);
    const firstSuggestion = expected[0]!;
    // The resolved suggestions must render as chip labels in the surface.
    // Assert the FIRST resolved entry (computed from the resolver) rather than
    // a hardcoded string, so the test stays green through operator content
    // revisions of the _base vision-element list.
    expect(screen.getAllByText(firstSuggestion).length).toBeGreaterThan(0);
  });
});

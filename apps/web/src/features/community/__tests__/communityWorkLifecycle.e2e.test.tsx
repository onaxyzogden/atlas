/**
 * @vitest-environment happy-dom
 *
 * Phase 6 gate — end-to-end over real stores (no mocks):
 *
 *   seed governance captures → proposals appear (spine untouched)
 *   → operator confirms ratification + settlement rows → due spine rows
 *     with provenance → fulfilWithGenericProof → done
 *   → re-generate → confirmed rows untouched; dismissed stays dismissed.
 *
 * Follows the sovereign-steward covenant:
 *   - generation NEVER writes the WorkItem spine;
 *   - `confirmProposal` is the ONLY proposal→spine writer;
 *   - `scopeNotes` (Amanah cautions) flow VERBATIM into spine notes.
 *
 * todayISO is fixed to '2026-06-12' throughout for determinism; the
 * settlement-milestone date sits within the 90-day horizon (2026-08-10).
 *
 * Rule key shapes (from generateCommunityWorkPlan):
 *   cwp__governance__checkin          (Weekly check-in → recurring)
 *   cwp__governance__governance-meeting (Quarterly → recurring)
 *   cwp__membership__mem-aisha        (PENDING member → once)
 *   cwp__settlement__sp-row-milestone (dated phase → once)
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { LocalProject } from '../../../store/projectStore.js';
import { useProjectStore } from '../../../store/projectStore.js';
import { useActEvidenceStore } from '../../../store/actEvidenceStore.js';
import { useCommunityWorkPlanStore } from '../../../store/communityWorkPlanStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { useProofEventStore } from '../../../store/proofEventStore.js';
import {
  buildCommunityWorkGenerationInput,
} from '../communityWorkInputs.js';
import { generateCommunityWorkPlan } from '@ogden/shared';
import { fulfilWithGenericProof } from '../../act/fieldProofActions.js';
import { workDueDate } from '../../work/workSelectors.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const P = 'eco-village-1';
const TODAY = '2026-06-12';
/** Settlement milestone within the 90-day horizon from TODAY. */
const MILESTONE_DATE = '2026-08-10';

/** Expected rule keys produced by the engine from our seed forms. */
const RULE_KEY_CHECKIN = 'cwp__governance__checkin';
const RULE_KEY_GOVERNANCE = 'cwp__governance__governance-meeting';
const RULE_KEY_RATIFY = 'cwp__membership__mem-aisha';
const RULE_KEY_SETTLEMENT = 'cwp__settlement__sp-row-milestone';

/** Instance keys for the two one-off rows (both use `__once` suffix). */
const INSTANCE_KEY_RATIFY = `${RULE_KEY_RATIFY}__once`;
const INSTANCE_KEY_SETTLEMENT = `${RULE_KEY_SETTLEMENT}__once`;

/** Spine-row ids derived from instance keys (cmw__ prefix). */
const SPINE_ID_RATIFY = `cmw__${INSTANCE_KEY_RATIFY}`;
const SPINE_ID_SETTLEMENT = `cmw__${INSTANCE_KEY_SETTLEMENT}`;

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function project(): LocalProject {
  return {
    id: P,
    name: 'Ogden Ecovillage Test',
    metadata: {
      projectTypeRecord: {
        primaryTypeId: 'ecovillage',
        secondaryTypeIds: [],
      },
    },
    parcelBoundaryGeojson: null,
  } as unknown as LocalProject;
}

/**
 * Seed all three capture forms the e2e scenario exercises:
 *   - ConflictFramework c6: Quarterly governance + Weekly check-in
 *   - ProvisionBalance c6: one PENDING ratify member (id: 'mem-aisha')
 *   - SettlementPlan c4: one dated milestone within the 90-day horizon
 */
function seedForms() {
  useActEvidenceStore.setState({
    visionFormData: {
      [P]: {
        // ConflictFramework c6 — governance 'Quarterly' + check-in 'Weekly'
        'ev-s1-conflict-framework-c6': {
          cfCadCheckin: 'Weekly',
          cfCadGovernance: 'Quarterly',
          cfCadAnnual: '',
          cfCadFull: '',
          cfCadFiveYear: '',
        },
        // ProvisionBalance c6 — one PENDING member (id matches RULE_KEY_RATIFY)
        'ev-s1-provision-balance-c6': {
          ratifyMembers: [
            JSON.stringify({
              id: 'mem-aisha',
              name: 'Aisha',
              status: 'pending',
            }),
          ],
        },
        // SettlementPlan c4 — one dated milestone within the 90-day horizon
        'ev-s7-settlement-plan-c4': {
          spSchedule: [
            JSON.stringify({
              id: 'sp-row-milestone',
              cohort: 'Founding Cohort',
              milestone: 'Phase 1 infrastructure complete',
              dateISO: MILESTONE_DATE,
              complete: false,
            }),
          ],
        },
      },
    },
  } as never);
}

/**
 * Run generation with the fixed todayISO so the suite is deterministic
 * regardless of wall-clock date. Returns proposed count.
 */
function regenerate(): number {
  const input = buildCommunityWorkGenerationInput(P, TODAY);
  if (!input) return 0;
  const plan = generateCommunityWorkPlan(input);
  useCommunityWorkPlanStore.getState().applyGeneration(P, plan);
  return useCommunityWorkPlanStore
    .getState()
    .proposals.filter(
      (pr) => pr.projectId === P && pr.status === 'proposed',
    ).length;
}

beforeEach(() => {
  useProjectStore.setState({ projects: [project()] } as never);
  useActEvidenceStore.setState({ visionFormData: {} } as never);
  useCommunityWorkPlanStore.setState({ rules: [], proposals: [] });
  useWorkItemStore.setState({ items: [], migratedSources: [] });
  useProofEventStore.setState({ events: [] } as never);
});

// ---------------------------------------------------------------------------
// End-to-end lifecycle
// ---------------------------------------------------------------------------

describe('community work management end-to-end', () => {
  it('step 1 — generation produces proposals including ratification, settlement, and recurring governance; spine stays empty', () => {
    seedForms();
    const count = regenerate();

    const proposals = useCommunityWorkPlanStore
      .getState()
      .proposals.filter((p) => p.projectId === P);

    // At least the one-off ratification + settlement + recurring check-in/governance.
    expect(count).toBeGreaterThan(0);
    expect(proposals.length).toBeGreaterThan(0);
    // All proposals start as 'proposed' — none auto-confirmed.
    expect(proposals.every((p) => p.status === 'proposed')).toBe(true);

    // Sovereign-steward covenant: generation NEVER writes the spine.
    expect(useWorkItemStore.getState().items).toHaveLength(0);

    const ruleKeys = proposals.map((p) => p.instance.ruleKey);

    // member-ratification one-off (ProvisionBalance c6 PENDING member: id 'mem-aisha')
    expect(ruleKeys).toContain(RULE_KEY_RATIFY);

    // settlement-milestone one-off (SettlementPlan c4 dated row: id 'sp-row-milestone')
    expect(ruleKeys).toContain(RULE_KEY_SETTLEMENT);

    // governance-meeting recurring (cfCadGovernance: 'Quarterly')
    expect(ruleKeys).toContain(RULE_KEY_GOVERNANCE);

    // check-in recurring (cfCadCheckin: 'Weekly')
    expect(ruleKeys).toContain(RULE_KEY_CHECKIN);

    // settlement instance carries the explicit due date
    const settlementProposal = proposals.find(
      (p) => p.instance.ruleKey === RULE_KEY_SETTLEMENT,
    )!;
    expect(settlementProposal).toBeDefined();
    expect(settlementProposal.instance.dueDate).toBe(MILESTONE_DATE);
    expect(settlementProposal.instance.key).toBe(INSTANCE_KEY_SETTLEMENT);

    // ratification instance key uses the __once suffix
    const ratifyProposal = proposals.find(
      (p) => p.instance.ruleKey === RULE_KEY_RATIFY,
    )!;
    expect(ratifyProposal).toBeDefined();
    expect(ratifyProposal.instance.key).toBe(INSTANCE_KEY_RATIFY);
  });

  it('step 2 — confirm ratification + settlement milestone → spine rows with correct provenance, ids, and source', () => {
    seedForms();
    regenerate();

    const store = useCommunityWorkPlanStore.getState();
    const proposals = store.proposals.filter((p) => p.projectId === P);

    // Confirm the member-ratification and settlement-milestone proposals.
    store.confirmProposal(P, INSTANCE_KEY_RATIFY);
    store.confirmProposal(P, INSTANCE_KEY_SETTLEMENT);

    const spineItems = useWorkItemStore.getState().items;

    // Exactly two spine rows must have been written (only what we confirmed).
    expect(spineItems).toHaveLength(2);

    // All written rows carry the community-plan source tag and cmw__ prefix.
    for (const row of spineItems) {
      expect(row.source).toBe('community-plan');
      expect(row.id.startsWith('cmw__')).toBe(true);
      expect(row.status).toBe('todo');
    }

    // --- ratification row ---
    const ratifyRow = spineItems.find((r) => r.id === SPINE_ID_RATIFY)!;
    expect(ratifyRow).toBeDefined();
    expect((ratifyRow as Record<string, unknown>)['generatedFromCommunityPlan'])
      .toBe(INSTANCE_KEY_RATIFY);

    // --- settlement row ---
    const settlementRow = spineItems.find((r) => r.id === SPINE_ID_SETTLEMENT)!;
    expect(settlementRow).toBeDefined();
    expect((settlementRow as Record<string, unknown>)['generatedFromCommunityPlan'])
      .toBe(INSTANCE_KEY_SETTLEMENT);
    // Due date must match the explicitly-authored milestone date.
    expect(workDueDate(settlementRow)).toBe(MILESTONE_DATE);

    // Confirmed proposals must now be 'confirmed' in the proposal layer.
    const confirmedProposals = proposals.filter(
      (p) =>
        p.instance.key === INSTANCE_KEY_RATIFY ||
        p.instance.key === INSTANCE_KEY_SETTLEMENT,
    );
    // Re-read to pick up the setState mutation.
    const refreshed = useCommunityWorkPlanStore
      .getState()
      .proposals.filter(
        (p) =>
          p.projectId === P &&
          (p.instance.key === INSTANCE_KEY_RATIFY ||
            p.instance.key === INSTANCE_KEY_SETTLEMENT),
      );
    expect(refreshed.every((p) => p.status === 'confirmed')).toBe(true);
    void confirmedProposals; // suppress unused-var lint
  });

  it('step 3 — fulfilWithGenericProof on a confirmed row → status done + proof event back-link', () => {
    seedForms();
    regenerate();

    useCommunityWorkPlanStore.getState().confirmProposal(P, INSTANCE_KEY_RATIFY);

    const rowBefore = useWorkItemStore.getState().items.find((r) => r.id === SPINE_ID_RATIFY)!;
    expect(rowBefore).toBeDefined();
    expect(rowBefore.status).toBe('todo');

    // Mark done two days after the scheduled due date.
    const due = workDueDate(rowBefore)!;
    expect(due).toBeTruthy();
    const actualEnd = (() => {
      const t = Date.parse(`${due.slice(0, 10)}T00:00:00Z`) + 2 * 86_400_000;
      return new Date(t).toISOString().slice(0, 10);
    })();

    fulfilWithGenericProof(SPINE_ID_RATIFY, P, { actualEnd });

    // Spine row must now be 'done'.
    const rowAfter = useWorkItemStore.getState().items.find((r) => r.id === SPINE_ID_RATIFY)!;
    expect(rowAfter.status).toBe('done');
    expect(rowAfter.actualEnd).toBe(actualEnd);

    // A proof event must carry the back-link.
    const proof = useProofEventStore
      .getState()
      .events.find((e) => e.workItemId === SPINE_ID_RATIFY);
    expect(proof).toBeDefined();
    expect(proof!.projectId).toBe(P);
    expect(proof!.actualEnd).toBe(actualEnd);
  });

  it('step 4 — confirmed rows survive regeneration unchanged (confirmed-never-mutated covenant)', () => {
    seedForms();
    regenerate();

    const store = useCommunityWorkPlanStore.getState();
    store.confirmProposal(P, INSTANCE_KEY_RATIFY);
    store.confirmProposal(P, INSTANCE_KEY_SETTLEMENT);

    const spineBeforeRegen = [...useWorkItemStore.getState().items];
    expect(spineBeforeRegen).toHaveLength(2);

    // Re-run generation with the SAME inputs.
    regenerate();

    const spineAfterRegen = useWorkItemStore.getState().items;

    // Spine must not have grown — confirmed rows are NOT re-written.
    expect(spineAfterRegen).toHaveLength(spineBeforeRegen.length);

    // Each confirmed row must be byte-identical (same id, status, provenance).
    for (const before of spineBeforeRegen) {
      const after = spineAfterRegen.find((r) => r.id === before.id);
      expect(after).toBeDefined();
      expect(after!.status).toBe(before.status);
      expect((after as Record<string, unknown>)['generatedFromCommunityPlan'])
        .toBe((before as Record<string, unknown>)['generatedFromCommunityPlan']);
    }

    // Confirmed proposals must still be 'confirmed' after regen.
    const confirmedAfter = useCommunityWorkPlanStore
      .getState()
      .proposals.filter(
        (p) =>
          p.projectId === P &&
          (p.instance.key === INSTANCE_KEY_RATIFY ||
            p.instance.key === INSTANCE_KEY_SETTLEMENT),
      );
    expect(confirmedAfter.every((p) => p.status === 'confirmed')).toBe(true);
  });

  it('step 5 — dismissed proposal stays dismissed after regeneration; count excludes dismissed', () => {
    seedForms();
    regenerate();

    const store = useCommunityWorkPlanStore.getState();

    // Dismiss the ratification proposal.
    store.dismissProposal(P, INSTANCE_KEY_RATIFY);

    // Verify dismissed status immediately.
    const afterDismiss = useCommunityWorkPlanStore
      .getState()
      .proposals.find(
        (p) => p.projectId === P && p.instance.key === INSTANCE_KEY_RATIFY,
      );
    expect(afterDismiss!.status).toBe('dismissed');

    // Re-generate with the same inputs.
    const countAfterRegen = regenerate();

    // The dismissed proposal must NOT be resurrected as 'proposed'.
    const stillDismissed = useCommunityWorkPlanStore
      .getState()
      .proposals.find(
        (p) => p.projectId === P && p.instance.key === INSTANCE_KEY_RATIFY,
      );
    expect(stillDismissed!.status).toBe('dismissed');

    // The returned count must exactly match the number of 'proposed' proposals.
    const proposedNow = useCommunityWorkPlanStore
      .getState()
      .proposals.filter(
        (p) => p.projectId === P && p.status === 'proposed',
      ).length;
    expect(countAfterRegen).toBe(proposedNow);
    // And the dismissed row must not be included in that count.
    expect(countAfterRegen).toBeLessThan(
      useCommunityWorkPlanStore
        .getState()
        .proposals.filter((p) => p.projectId === P).length,
    );
  });
});

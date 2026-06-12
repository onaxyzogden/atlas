/**
 * @vitest-environment happy-dom
 *
 * Phase 4 gate — end-to-end over real stores (no mocks):
 *
 *   approve husbandry capture → proposals appear (spine untouched)
 *   → operator confirms one → due spine row with provenance
 *   → execution logged → fulfilled with variance shown.
 *
 * Two completion legs, matching the two work shapes:
 *
 *   CHECK-SHAPED (livestock-plan rows — the layer this slice built): no
 *   typed evidence log exists, so completion is the operator's explicit
 *   "Mark done" (`fulfilWithGenericProof`). Deliberately NOT auto-inferred.
 *
 *   MOVE-SHAPED (rotation-sequence rows the panel also aggregates): an
 *   actual move-log event auto-fulfils via `useLivestockFulfillmentSync`
 *   (±7d, same species + destination), with `actualEnd` = the event's
 *   field date so variance reflects when the work HAPPENED.
 *
 * Sovereign-steward pins repeated here on purpose: generation never writes
 * the spine; `confirmProposal` is the only proposal→spine writer.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { WorkItem } from '@ogden/shared';
import {
  useProjectStore,
  type LocalProject,
} from '../../../store/projectStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useActEvidenceStore } from '../../../store/actEvidenceStore.js';
import { useLivestockWorkPlanStore } from '../../../store/livestockWorkPlanStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import {
  useLivestockMoveLogStore,
  type LivestockMoveEvent,
} from '../../../store/livestockMoveLogStore.js';
import { useProofEventStore } from '../../../store/proofEventStore.js';
import { HUSBANDRY_PREFIX } from '../../../v3/act/tier-shell/HusbandryCapture.js';
import { LIVESTOCK_INTENT_PREFIX } from '../../../v3/act/tier-shell/LivestockIntentCapture.js';
import { fulfilWithGenericProof } from '../../act/fieldProofActions.js';
import { varianceDays, workDueDate } from '../../work/workSelectors.js';
import { generateAndApplyLivestockWork } from '../livestockWorkInputs.js';
import { useLivestockFulfillmentSync } from '../useLivestockFulfillmentSync.js';

const P = 'p1';

function project(): LocalProject {
  return {
    id: P,
    name: 'Test holding',
    metadata: {
      projectTypeRecord: {
        primaryTypeId: 'homestead',
        secondaryTypeIds: ['silvopasture'],
      },
    },
    parcelBoundaryGeojson: null,
  } as unknown as LocalProject;
}

function addDays(iso: string, days: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Move-shaped spine row exactly as `rotationSequenceSpineSync` writes it. */
function moveRow(dueDate: string): WorkItem {
  const stamp = '2026-06-01T00:00:00.000Z';
  return {
    id: 'rs__cg1__c1__s1',
    projectId: P,
    source: 'rotation-sequence',
    overridden: false,
    generatedFromRotationMove: 'cg1__c1__s1',
    createdAt: stamp,
    updatedAt: stamp,
    title: 'Move sheep → North paddock',
    phaseId: null,
    status: 'todo',
    doneAt: null,
    dependsOn: [],
    dependsOnAuto: [],
    precedesAuto: [],
    scheduledStart: dueDate,
    scheduledEnd: dueDate,
    materialsAuto: [],
    equipmentRequiredAuto: [],
    notes: '',
    direction: 'move_in',
    species: 'sheep',
    target: { kind: 'paddock', toId: 'pad-1' },
  } as WorkItem;
}

beforeEach(() => {
  useProjectStore.setState({ projects: [project()] } as never);
  useActEvidenceStore.setState({ visionFormData: {} } as never);
  useLivestockStore.setState({ paddocks: [] } as never);
  useLivestockWorkPlanStore.setState({ rules: [], proposals: [] });
  useWorkItemStore.setState({ items: [], migratedSources: [] });
  useLivestockMoveLogStore.setState({ events: [] });
  useProofEventStore.setState({ events: [] } as never);
});

describe('livestock work management end-to-end', () => {
  it('capture → proposals → confirm → due row → mark done → variance', () => {
    // 1. Operator approves livestock decisions in Plan (husbandry welfare
    //    cadence + declared species).
    useActEvidenceStore.setState({
      visionFormData: {
        [P]: {
          [`${HUSBANDRY_PREFIX}-c3`]: { hbWelfareNotes: 'Check troughs daily' },
          [`${LIVESTOCK_INTENT_PREFIX}-c2`]: { liSpecies: ['sheep'] },
        },
      },
    } as never);

    // 2. Regeneration seam (same call the Plan save + Act panel make).
    generateAndApplyLivestockWork(P);
    const proposals = useLivestockWorkPlanStore
      .getState()
      .proposals.filter((p) => p.projectId === P);
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals.every((p) => p.status === 'proposed')).toBe(true);
    // Generation NEVER touches the spine.
    expect(useWorkItemStore.getState().items).toHaveLength(0);

    // 3. Operator confirms the earliest capture-sourced welfare check — the
    //    ONLY spine seam. (Selected by rule provenance: the homestead
    //    protocol catalogue ALSO emits a welfare-check, but that one carries
    //    sourceProtocolId, not the husbandry objective.)
    const welfare = proposals
      .filter((p) => p.instance.ruleKey === 'lvp__husbandry__welfare-weekly')
      .sort((a, b) => a.instance.dueDate.localeCompare(b.instance.dueDate))[0]!;
    expect(welfare).toBeDefined();
    useLivestockWorkPlanStore
      .getState()
      .confirmProposal(P, welfare.instance.key);

    const spineId = `lvw__${welfare.instance.key}`;
    const row = useWorkItemStore.getState().items.find((i) => i.id === spineId)!;
    expect(row).toBeDefined();
    expect(row.source).toBe('livestock-plan');
    expect(row.status).toBe('todo');
    expect(row.sourceObjectiveId).toBe(HUSBANDRY_PREFIX);
    expect(row.generatedFromLivestockPlan).toBe(welfare.instance.key);
    const due = workDueDate(row)!;
    expect(due).toBeTruthy();

    // 4. Check-shaped work completes via the operator's explicit "Mark
    //    done" (generic proof) — two days late, on purpose.
    const fieldDate = addDays(due, 2);
    fulfilWithGenericProof(spineId, P, { actualEnd: fieldDate });

    const done = useWorkItemStore.getState().items.find((i) => i.id === spineId)!;
    expect(done.status).toBe('done');
    expect(done.actualEnd).toBe(fieldDate);
    expect(varianceDays(done)).toBe(2);
    // Proof record carries the back-link (bidirectional audit).
    const proof = useProofEventStore
      .getState()
      .events.find((e) => e.workItemId === spineId);
    expect(proof).toBeDefined();
  });

  it('logged move auto-fulfils a due move-shaped row with the field date', () => {
    const due = '2026-06-12';
    useWorkItemStore.setState({ items: [moveRow(due)], migratedSources: [] });

    // Actual execution, logged 2 days after the scheduled date.
    const fieldDate = addDays(due, 2);
    const event: LivestockMoveEvent = {
      id: 'ev-1',
      projectId: P,
      toPaddockId: 'pad-1',
      date: fieldDate,
      direction: 'move_in',
      species: 'sheep',
      headCount: 12,
    };
    useLivestockMoveLogStore.getState().addEvent(event);

    // The hook the Act work panel mounts.
    renderHook(() => useLivestockFulfillmentSync(P));

    const row = useWorkItemStore
      .getState()
      .items.find((i) => i.id === 'rs__cg1__c1__s1')!;
    expect(row.status).toBe('done');
    expect(row.actualEnd).toBe(fieldDate);
    expect(varianceDays(row)).toBe(2);
    // Event ↔ work back-link written through confirmTypedProofMatch.
    const linked = useLivestockMoveLogStore
      .getState()
      .events.find((e) => e.id === 'ev-1')!;
    expect(linked.workItemId).toBe('rs__cg1__c1__s1');
  });

  it('a second hook pass is a no-op (idempotent convergence)', () => {
    const due = '2026-06-12';
    useWorkItemStore.setState({ items: [moveRow(due)], migratedSources: [] });
    useLivestockMoveLogStore.getState().addEvent({
      id: 'ev-1',
      projectId: P,
      toPaddockId: 'pad-1',
      date: due,
      direction: 'move_in',
      species: 'sheep',
      headCount: null,
    });

    renderHook(() => useLivestockFulfillmentSync(P));
    const after = useWorkItemStore.getState().items;

    renderHook(() => useLivestockFulfillmentSync(P));
    expect(useWorkItemStore.getState().items).toEqual(after);
    // Exactly one event carries the back-link.
    const linked = useLivestockMoveLogStore
      .getState()
      .events.filter((e) => e.workItemId);
    expect(linked).toHaveLength(1);
  });
});

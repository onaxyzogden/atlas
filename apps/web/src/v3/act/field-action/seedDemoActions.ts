/**
 * seedDemoActions — first-load demo content for View B verification.
 *
 * Spec §4 calls View B "the default landing surface" so a brand-new
 * project lands on a non-empty dashboard. Until tier objectives start
 * authoring field actions in earnest (Slice 3.3+), we seed a handful
 * per project so the layout, NextUpCard priority order, filter, and
 * section grouping can all be exercised manually.
 *
 * Idempotent: skips seeding when the project already has any
 * fieldAction records (so re-mounting View B never duplicates).
 */

import type { FieldAction } from '@ogden/shared';
import { useFieldActionStore } from '../../../store/fieldActionStore.js';
import { seedCuratedMtcActionsIfEmpty } from './seedCuratedMtcActions.js';

const NOW = () => new Date().toISOString();

/** Stable demo action ids; suffixed with projectId at runtime. */
const DEMOS: ReadonlyArray<{
  suffix: string;
  planObjectiveId: string;
  stratumId: string;
  title: string;
  taskType: FieldAction['taskType'];
  status: FieldAction['status'];
  proofSchemaId: string;
  verificationMode: FieldAction['verificationMode'];
  doneOffsetMs?: number;
}> = [
  {
    suffix: 'land-baseline-walk',
    planObjectiveId: 's2-land-baseline',
    stratumId: 's2-land-reading',
    title: 'Walk and photograph the parcel perimeter',
    taskType: 'field_survey',
    status: 'in_progress',
    proofSchemaId: 'generic-fallback',
    verificationMode: 'self',
  },
  {
    suffix: 'water-mapping',
    planObjectiveId: 's2-land-baseline',
    stratumId: 's2-land-reading',
    title: 'Map seasonal water flow lines after first rainfall',
    taskType: 'field_survey',
    status: 'not_started',
    proofSchemaId: 'generic-fallback',
    verificationMode: 'self',
  },
  {
    suffix: 'soil-jar-test',
    planObjectiveId: 's3-systems-baseline',
    stratumId: 's3-systems-reading',
    title: 'Run soil jar test in two representative locations',
    taskType: 'field_survey',
    status: 'submitted',
    proofSchemaId: 'generic-fallback',
    verificationMode: 'review',
  },
  {
    suffix: 'access-survey',
    planObjectiveId: 's2-land-baseline',
    stratumId: 's2-land-reading',
    title: 'Record vehicle access points and turning radius',
    taskType: 'field_survey',
    status: 'verified',
    proofSchemaId: 'generic-fallback',
    verificationMode: 'self',
    doneOffsetMs: -4 * 60 * 60 * 1000, // 4h ago — today
  },
  {
    suffix: 'frost-pocket',
    planObjectiveId: 's3-systems-baseline',
    stratumId: 's3-systems-reading',
    title: 'Flag suspected frost pocket near north fence',
    taskType: 'field_survey',
    status: 'blocked',
    proofSchemaId: 'generic-fallback',
    verificationMode: 'self',
  },
];

/**
 * Dispatcher: route the flagship builtin (Moontrance Creek) to its curated
 * Act seed and every other project to the generic demo seed. Both paths share
 * the same `getByProject().length > 0` idempotency gate, so this is safe to
 * call from View B's mount effect regardless of which seed already ran at
 * hydrate time. `isMtc` is resolved by the caller from the local project
 * (name/id discrimination), since both builtins carry `isBuiltin`.
 */
export function seedActionsIfEmpty(projectId: string, isMtc: boolean): void {
  if (isMtc) {
    seedCuratedMtcActionsIfEmpty(projectId);
    return;
  }
  seedDemoActionsIfEmpty(projectId);
}

export function seedDemoActionsIfEmpty(projectId: string): void {
  if (!projectId) return;
  const store = useFieldActionStore.getState();
  const existing = store.getByProject(projectId);
  if (existing.length > 0) return;
  const now = NOW();
  for (const d of DEMOS) {
    const id = `demo-${projectId}-${d.suffix}`;
    store.createFieldAction({
      id,
      projectId,
      planObjectiveId: d.planObjectiveId,
      stratumId: d.stratumId,
      title: d.title,
      taskType: d.taskType,
      proofSchemaId: d.proofSchemaId,
      verificationMode: d.verificationMode,
    });
    // Drive each demo into its target status via the state machine so
    // timestamps + terminality bookkeeping match what a real workflow
    // would produce.
    if (d.status === 'in_progress') {
      store.markStarted(projectId, id);
    } else if (d.status === 'submitted') {
      store.markStarted(projectId, id);
      store.markSubmitted(projectId, id);
    } else if (d.status === 'verified') {
      store.markStarted(projectId, id);
      store.markSubmitted(projectId, id);
      store.markVerified(projectId, id, 'demo-verifier');
    } else if (d.status === 'blocked') {
      store.markStarted(projectId, id);
      store.markBlocked(projectId, id, 'Awaiting drier ground to confirm');
    }
    if (d.doneOffsetMs !== undefined) {
      const target = new Date(Date.parse(now) + d.doneOffsetMs).toISOString();
      useFieldActionStore.setState((s) => ({
        byProject: {
          ...s.byProject,
          [projectId]: (s.byProject[projectId] ?? []).map((a) =>
            a.id === id ? { ...a, doneAt: target, updatedAt: target } : a,
          ),
        },
      }));
    }
  }
}

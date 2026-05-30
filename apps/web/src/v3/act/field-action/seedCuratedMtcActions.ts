/**
 * seedCuratedMtcActions — curated first-load Act content for the flagship
 * builtin sample, Moontrance Creek ("MTC").
 *
 * The promote-new-shells slice flips the builtin Act default to the map-first
 * View B shell. Under the generic `seedDemoActions` seed MTC would land on
 * placeholder "parcel perimeter" stubs that say nothing about the actual site.
 * This curated set instead authors field actions off MTC's real plan strata
 * (S1-S5) and site facts — a tile-drained cash-crop field, a seasonal creek
 * running SW->NE, a remnant hedgerow on the east boundary, and a 30m
 * watercourse setback — so View B's sections, NextUp priority order, filters,
 * and the "completed today" surface all populate with meaningful work.
 *
 * Structure is intentionally identical to seedDemoActions.ts: each row is
 * created by stable id via `createFieldAction`, then driven into its target
 * status through the real state machine so timestamps + terminality match a
 * genuine workflow. Idempotent by the same `getByProject().length > 0` gate,
 * so a re-mount (or a parallel seed call from `seedMtcDemo`) never duplicates.
 *
 * Invariants (guarded by seedCuratedMtcActions.test.ts):
 *   - every planObjectiveId / stratumId is a real id from stratumObjectives.ts;
 *   - every proofSchemaId resolves in the FIELD_ACTION_PROOF_SCHEMAS catalogue;
 *   - the status spread covers not_started / in_progress / submitted / verified
 *     / blocked so every View B section has at least one card.
 */

import type { FieldAction } from '@ogden/shared';
import { useFieldActionStore } from '../../../store/fieldActionStore.js';

const NOW = () => new Date().toISOString();

/** Stable curated action ids; suffixed with projectId at runtime. */
const MTC_ACTIONS: ReadonlyArray<{
  suffix: string;
  planObjectiveId: string;
  stratumId: string;
  title: string;
  taskType: FieldAction['taskType'];
  status: FieldAction['status'];
  proofSchemaId: string;
  verificationMode: FieldAction['verificationMode'];
  blockedReason?: string;
  doneOffsetMs?: number;
}> = [
  // ---------- S1 — Project Foundation ----------
  {
    suffix: 'vision-confirm',
    planObjectiveId: 's1-vision',
    stratumId: 's1-project-foundation',
    title: 'Confirm the Moontrance Creek land vision with co-stewards',
    taskType: 'administrative_task',
    status: 'verified',
    proofSchemaId: 'generic-fallback',
    verificationMode: 'review',
    doneOffsetMs: -6 * 60 * 60 * 1000, // 6h ago — today
  },
  {
    suffix: 'steward-roster',
    planObjectiveId: 's1-stewardship',
    stratumId: 's1-project-foundation',
    title: 'Record the steward and co-steward roster for the parcel',
    taskType: 'administrative_task',
    status: 'not_started',
    proofSchemaId: 'generic-fallback',
    verificationMode: 'self',
  },

  // ---------- S2 — Land Reading ----------
  {
    suffix: 'hedgerow-survey',
    planObjectiveId: 's2-land-baseline',
    stratumId: 's2-land-reading',
    title: 'Survey the remnant hedgerow species along the east boundary',
    taskType: 'field_survey',
    status: 'verified',
    proofSchemaId: 'vegetation-survey',
    verificationMode: 'self',
    doneOffsetMs: -3 * 60 * 60 * 1000, // 3h ago — today
  },
  {
    suffix: 'creek-trace',
    planObjectiveId: 's2-land-baseline',
    stratumId: 's2-land-reading',
    title: 'Trace the seasonal creek channel from the SW inlet to the NE outlet',
    taskType: 'field_survey',
    status: 'in_progress',
    proofSchemaId: 'generic-fallback',
    verificationMode: 'self',
  },
  {
    suffix: 'soil-sample',
    planObjectiveId: 's2-land-baseline',
    stratumId: 's2-land-reading',
    title: 'Pull a topsoil texture sample from the tile-drained crop field',
    taskType: 'field_survey',
    status: 'submitted',
    proofSchemaId: 'water-test',
    verificationMode: 'review',
  },

  // ---------- S3 — Systems Reading ----------
  {
    suffix: 'tile-drain-outfalls',
    planObjectiveId: 's3-systems-baseline',
    stratumId: 's3-systems-reading',
    title: 'Locate and flag the existing field tile-drain outfalls',
    taskType: 'field_survey',
    status: 'blocked',
    proofSchemaId: 'generic-fallback',
    verificationMode: 'self',
    blockedReason: 'Outfalls submerged — revisit after the creek drops',
  },
  {
    suffix: 'rotation-access',
    planObjectiveId: 's3-systems-baseline',
    stratumId: 's3-systems-reading',
    title: 'Document the current crop rotation and machinery access route',
    taskType: 'field_survey',
    status: 'submitted',
    proofSchemaId: 'generic-fallback',
    verificationMode: 'review',
  },
  {
    suffix: 'culvert-inspect',
    planObjectiveId: 's3-systems-baseline',
    stratumId: 's3-systems-reading',
    title: 'Inspect the culvert where the access track crosses the creek',
    taskType: 'monitoring_task',
    status: 'verified',
    proofSchemaId: 'maintenance-inspection',
    verificationMode: 'review',
    doneOffsetMs: -1 * 60 * 60 * 1000, // 1h ago — today
  },

  // ---------- S4 — Foundation Decisions ----------
  {
    suffix: 'setback-stake',
    planObjectiveId: 's4-zones-sectors',
    stratumId: 's4-foundation-decisions',
    title: 'Stake the 30m watercourse setback buffer along the creek',
    taskType: 'implementation_task',
    status: 'in_progress',
    proofSchemaId: 'infrastructure-build',
    verificationMode: 'review',
  },
  {
    suffix: 'sector-confirm',
    planObjectiveId: 's4-zones-sectors',
    stratumId: 's4-foundation-decisions',
    title: 'Confirm prevailing wind and sun sectors from the field centre',
    taskType: 'field_survey',
    status: 'not_started',
    proofSchemaId: 'generic-fallback',
    verificationMode: 'self',
  },

  // ---------- S5 — System Design ----------
  {
    suffix: 'creek-water-test',
    planObjectiveId: 's5-water-strategy',
    stratumId: 's5-system-design',
    title: 'Test creek water quality at the SW inlet',
    taskType: 'monitoring_task',
    status: 'submitted',
    proofSchemaId: 'water-test',
    verificationMode: 'review',
  },
  {
    suffix: 'keyline-mark',
    planObjectiveId: 's5-water-strategy',
    stratumId: 's5-system-design',
    title: 'Mark the keyline contour for the first swale above the crop field',
    taskType: 'implementation_task',
    status: 'not_started',
    proofSchemaId: 'earthworks-implementation',
    verificationMode: 'review',
  },
];

/**
 * Seed the curated MTC field actions for `projectId` if it has none yet.
 *
 * Shares the single idempotency gate (`getByProject().length > 0`) with
 * `seedDemoActionsIfEmpty`, so whichever seed path runs first wins and the
 * other becomes a no-op. Callers route MTC here and everything else to the
 * generic demo seed (see the dispatcher in seedDemoActions.ts).
 */
export function seedCuratedMtcActionsIfEmpty(projectId: string): void {
  if (!projectId) return;
  const store = useFieldActionStore.getState();
  const existing = store.getByProject(projectId);
  if (existing.length > 0) return;
  const now = NOW();
  for (const a of MTC_ACTIONS) {
    const id = `mtc-${projectId}-${a.suffix}`;
    store.createFieldAction({
      id,
      projectId,
      planObjectiveId: a.planObjectiveId,
      stratumId: a.stratumId,
      title: a.title,
      taskType: a.taskType,
      proofSchemaId: a.proofSchemaId,
      verificationMode: a.verificationMode,
    });
    // Drive each action into its target status via the state machine so
    // timestamps + terminality bookkeeping match a real workflow.
    if (a.status === 'in_progress') {
      store.markStarted(projectId, id);
    } else if (a.status === 'submitted') {
      store.markStarted(projectId, id);
      store.markSubmitted(projectId, id);
    } else if (a.status === 'verified') {
      store.markStarted(projectId, id);
      store.markSubmitted(projectId, id);
      store.markVerified(projectId, id, 'mtc-verifier');
    } else if (a.status === 'blocked') {
      store.markStarted(projectId, id);
      store.markBlocked(
        projectId,
        id,
        a.blockedReason ?? 'Blocked pending site conditions',
      );
    }
    if (a.doneOffsetMs !== undefined) {
      const target = new Date(Date.parse(now) + a.doneOffsetMs).toISOString();
      useFieldActionStore.setState((s) => ({
        byProject: {
          ...s.byProject,
          [projectId]: (s.byProject[projectId] ?? []).map((row) =>
            row.id === id ? { ...row, doneAt: target, updatedAt: target } : row,
          ),
        },
      }));
    }
  }
}

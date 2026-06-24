/**
 * usePlanRevisionFlagSync — wires Observe divergence signals into the
 * Phase 1 cyclical-review trigger (OLOS Observe Dashboard Spec §4.2 +
 * Plan Navigation Spec v1 §3.6).
 *
 * The Phase 1 predicate (`isCyclicalReviewDue`) reads
 * `cyclicalReviewStore.isForced(projectId, objectiveId)` through its
 * `observeRevisionFlag` injection point. Slice 1.11 wired the dev-tools
 * `forceTrigger` entry; Slice 4.4 wires the REAL signal here:
 *
 *   1. Derive the set of universal domains that currently carry an ACTIVE
 *      divergence — from diverged ObserveDataPoints and diverged
 *      ObserveFeedEntries. That derivation now lives in the shared
 *      `useDivergedDomains` hook (also consumed by the Operational Role
 *      Layer's always-surface engine), so both consumers read one source.
 *   2. Feed the diverged domains to the shared
 *      `resolveReviewFlaggedObjectives` resolver, which returns the
 *      objectives to flag — the union of three `feedsInto`-derived
 *      signals (domain MEMBERSHIP, UPSTREAM feeders, DOWNSTREAM
 *      consumers) — each attributed with `via` + `domains`. This is the
 *      reverse half of the feeds-into data model (ADR
 *      2026-05-29-atlas-spec-feeds-into-data-model): the flag set is
 *      data-derived, not hand-authored. Diff against the persisted
 *      `forcedTrigger` / `triggerContext` and `forceTrigger` /
 *      `clearForcedTrigger` only on the delta (also refresh the stored
 *      attribution when the divergence set changes shape).
 *
 * The hook is intentionally side-effectful on mount + on store mutation
 * (Zustand selectors give us shallow-stable inputs). It does NOT poll
 * on a timer. The diff guard keeps churn-on-render to zero in steady
 * state.
 *
 * Mount once per project at the V3 project layout level.
 */

import { useEffect } from 'react';
import { resolveReviewFlaggedObjectives } from '@ogden/shared';
import { useCyclicalReviewStore } from '../../../../store/cyclicalReviewStore.js';
import { useProjectObjectives } from '../../../plan/strata/useProjectObjectives.js';
import { useDivergedDomains } from './useDivergedDomains.js';

export function usePlanRevisionFlagSync(projectId: string | undefined): void {
  // Sub-slice D - flag-sync iterates THIS project's resolved objective set so a
  // divergence on a primary/secondary objective's domain can force its review.
  const { objectives } = useProjectObjectives(projectId ?? '');
  const divergedDomains = useDivergedDomains(projectId);

  useEffect(() => {
    if (!projectId) return;
    const store = useCyclicalReviewStore.getState();
    // One resolver pass derives the full flagged set (membership ∪ upstream ∪
    // downstream), project-scoped and attributed. We then diff per objective.
    const flagged = resolveReviewFlaggedObjectives({ objectives, divergedDomains });
    for (const objective of objectives) {
      const desired = flagged.get(objective.id) ?? null;
      const record = store.getRecord(projectId, objective.id);
      const currentlyForced = record.forcedTrigger === true;
      if (desired) {
        // Refresh when not yet forced OR the attribution changed shape, so the
        // Screen 1 / OBSERVE UPDATES copy always reflects the live divergence.
        const ctxChanged =
          JSON.stringify(record.triggerContext) !== JSON.stringify(desired);
        if (!currentlyForced || ctxChanged) {
          store.forceTrigger(projectId, objective.id, desired);
        }
      } else if (currentlyForced) {
        store.clearForcedTrigger(projectId, objective.id);
      }
    }
  }, [projectId, objectives, divergedDomains]);
}

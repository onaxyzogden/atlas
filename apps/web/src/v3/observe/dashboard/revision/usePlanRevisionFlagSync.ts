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
 *   1. Gather the set of universal domains that currently have at least
 *      one ACTIVE diverged ObserveDataPoint (`isSuperseded === false`
 *      and `statusOutput ∈ {needs_investigation | major_constraint |
 *      potential_disqualifier}`).
 *   2. Gather the set of universal domains that currently have at least
 *      one diverged ObserveFeedEntry (Phase 3 substrate, `sourceType ===
 *      'diverged'`), projected from `feedKey` (objective id) via
 *      `resolveDomainByObjectiveId`.
 *   3. Feed the UNION of those diverged domains to the shared
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

import { useEffect, useMemo } from 'react';
import {
  resolveReviewFlaggedObjectives,
  type UniversalDomain,
} from '@ogden/shared';
import {
  useObserveDataPointStore,
  selectObserveDataPointsForProject,
} from '../../../../store/observeDataPointStore.js';
import {
  useObserveFeedStore,
  selectObserveFeedForProject,
} from '../../../../store/observeFeedStore.js';
import { useCyclicalReviewStore } from '../../../../store/cyclicalReviewStore.js';
import { resolveDomainByObjectiveId } from './resolveDomainForObjective.js';
import { useProjectObjectives } from '../../../plan/strata/useProjectObjectives.js';

const DIVERGENT_STATUSES = new Set([
  'needs_investigation',
  'major_constraint',
  'potential_disqualifier',
]);

export function usePlanRevisionFlagSync(projectId: string | undefined): void {
  const dataPoints = useObserveDataPointStore((s) =>
    projectId ? selectObserveDataPointsForProject(s, projectId) : [],
  );
  const feedEntries = useObserveFeedStore((s) =>
    projectId ? selectObserveFeedForProject(s, projectId) : [],
  );
  // Sub-slice D - flag-sync iterates THIS project's resolved objective set so a
  // divergence on a primary/secondary objective's domain can force its review.
  const { objectives } = useProjectObjectives(projectId ?? '');

  const divergedDataPointDomains = useMemo<readonly UniversalDomain[]>(() => {
    const set = new Set<UniversalDomain>();
    for (const p of dataPoints) {
      if (p.isSuperseded) continue;
      if (!DIVERGENT_STATUSES.has(p.statusOutput)) continue;
      set.add(p.domainId);
    }
    return Array.from(set);
  }, [dataPoints]);

  const divergedFeedDomains = useMemo<readonly UniversalDomain[]>(() => {
    const set = new Set<UniversalDomain>();
    for (const entry of feedEntries) {
      if (entry.sourceType !== 'diverged') continue;
      const domainId = resolveDomainByObjectiveId(entry.feedKey);
      if (!domainId) continue;
      set.add(domainId);
    }
    return Array.from(set);
  }, [feedEntries]);

  const divergedDomains = useMemo<readonly UniversalDomain[]>(() => {
    const set = new Set<UniversalDomain>();
    for (const d of divergedDataPointDomains) set.add(d);
    for (const d of divergedFeedDomains) set.add(d);
    return Array.from(set);
  }, [divergedDataPointDomains, divergedFeedDomains]);

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

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
 *   3. For each PLAN_TIER_OBJECTIVE, compute
 *      `computeObserveRevisionFlag` with its mapped domains (full set
 *      via `resolveAllDomainsForObjective`). Diff against the persisted
 *      `forcedTrigger` flag and `forceTrigger` / `clearForcedTrigger`
 *      only on the delta.
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
  computeObserveRevisionFlag,
  PLAN_TIER_OBJECTIVES,
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
import {
  resolveAllDomainsForObjective,
  resolveDomainByObjectiveId,
} from './resolveDomainForObjective.js';

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

  useEffect(() => {
    if (!projectId) return;
    const store = useCyclicalReviewStore.getState();
    for (const objective of PLAN_TIER_OBJECTIVES) {
      const objectiveDomainIds = resolveAllDomainsForObjective(objective);
      const flag = computeObserveRevisionFlag({
        objectiveDomainIds,
        divergedDataPointDomains,
        divergedFeedDomains,
      });
      const currentlyForced = store.isForced(projectId, objective.id);
      if (flag && !currentlyForced) {
        store.forceTrigger(projectId, objective.id);
      } else if (!flag && currentlyForced) {
        store.clearForcedTrigger(projectId, objective.id);
      }
    }
  }, [projectId, divergedDataPointDomains, divergedFeedDomains]);
}

// useObserveGapObjectives.ts
//
// Observe-side, re-derived render of the Plan Nav v1.1 section-9 observe-gap.
// The Plan stratum shows a transient banner the moment a gap-bearing secondary
// is added; this hook is the PERSISTENT mirror inside the Observe stage: it
// re-derives, on every render, which of the project's objectives still need
// field data, and clears each as soon as its mapped domain gets captured data.
// No persist bump -- like usePlanRevisionFlagSync, it is a pure derivation over
// store state (resolved objectives + captured ObserveDataPoints).
//
// An OPEN gap = a gap objective (per the shared `collectObserveGapObjectives`
// rule) whose primary Observe domain has NO active (non-superseded) data point.
// Capturing one active point for that domain closes the gap on next render.

import { useMemo } from 'react';
import {
  getPrimaryDomainForObjective,
  type UniversalDomain,
} from '@ogden/shared';
import { collectObserveGapObjectives } from '@ogden/shared/relationships';
import {
  useObserveDataPointStore,
  selectObserveDataPointsForProject,
} from '../../../../store/observeDataPointStore.js';
import { useProjectObjectives } from '../../../plan/strata/useProjectObjectives.js';

/** Open gaps grouped under the Observe domain whose data would close them. */
export interface ObserveGapDomain {
  domainId: UniversalDomain;
  objectiveIds: string[];
}

export interface ObserveGapResult {
  /** Ids of objectives with a still-open observe-gap (mapped domain has no data). */
  openObjectiveIds: string[];
  /** Those open gaps grouped by their primary Observe domain. */
  domains: ObserveGapDomain[];
}

const EMPTY: ObserveGapResult = Object.freeze({
  openObjectiveIds: [],
  domains: [],
}) as ObserveGapResult;

/**
 * Re-derive the project's open Observe-stage gaps. Returns a stable empty
 * result when there is no project, no gap objective, or every gap objective's
 * domain already has captured data.
 */
export function useObserveGapObjectives(
  projectId: string | undefined,
): ObserveGapResult {
  const { objectives } = useProjectObjectives(projectId ?? '');
  const dataPoints = useObserveDataPointStore((s) =>
    projectId ? selectObserveDataPointsForProject(s, projectId) : [],
  );

  return useMemo(() => {
    if (!projectId) return EMPTY;
    const gapIds = new Set(collectObserveGapObjectives(objectives));
    if (gapIds.size === 0) return EMPTY;

    // Domains that already carry at least one active (non-superseded) capture.
    const domainsWithData = new Set<UniversalDomain>();
    for (const p of dataPoints) {
      if (!p.isSuperseded) domainsWithData.add(p.domainId);
    }

    const byDomain = new Map<UniversalDomain, string[]>();
    const openObjectiveIds: string[] = [];
    for (const o of objectives) {
      if (!gapIds.has(o.id)) continue;
      const domain = getPrimaryDomainForObjective(o);
      // No mappable domain -> we cannot point the steward at a card, so skip.
      if (!domain) continue;
      // Domain already has data -> the gap is closed.
      if (domainsWithData.has(domain)) continue;
      openObjectiveIds.push(o.id);
      const list = byDomain.get(domain) ?? [];
      list.push(o.id);
      byDomain.set(domain, list);
    }

    if (openObjectiveIds.length === 0) return EMPTY;
    const domains: ObserveGapDomain[] = [...byDomain.entries()].map(
      ([domainId, objectiveIds]) => ({ domainId, objectiveIds }),
    );
    return { openObjectiveIds, domains };
  }, [projectId, objectives, dataPoints]);
}

/**
 * useDivergedDomains — the single source of the Observe "diverged domains"
 * signal: the union of universal domains that currently carry an ACTIVE
 * divergence, whether from an ObserveDataPoint or an ObserveFeedEntry.
 *
 * Extracted from `usePlanRevisionFlagSync` (Slice 4.4) so the same derivation
 * feeds BOTH:
 *   - the cyclical-review trigger (the original consumer), and
 *   - the Operational Role Layer's always-surface engine
 *     (`collectAlwaysSurface`'s `divergedDomains` channel) — the
 *     shared-resource-divergence signal that promotes an out-of-scope
 *     objective back into a member's focused view.
 *
 * Derivation:
 *   1. Domains with ≥1 ACTIVE diverged ObserveDataPoint (`!isSuperseded`
 *      AND statusOutput ∈ {needs_investigation | major_constraint |
 *      potential_disqualifier}).
 *   2. Domains with ≥1 diverged ObserveFeedEntry (`sourceType === 'diverged'`,
 *      Phase 3 substrate), projected from `feedKey` (objective id) via
 *      `resolveDomainByObjectiveId`.
 *
 * Returns a referentially-stable array (memoised on the two store slices) so
 * Zustand v5 consumers never see a fresh value each render. An undefined
 * projectId yields the shared frozen empty array (no fresh `[]` per call).
 */

import { useMemo } from 'react';
import { type UniversalDomain } from '@ogden/shared';
import {
  useObserveDataPointStore,
  selectObserveDataPointsForProject,
} from '../../../../store/observeDataPointStore.js';
import {
  useObserveFeedStore,
  selectObserveFeedForProject,
} from '../../../../store/observeFeedStore.js';
import { resolveDomainByObjectiveId } from './resolveDomainForObjective.js';

const DIVERGENT_STATUSES = new Set([
  'needs_investigation',
  'major_constraint',
  'potential_disqualifier',
]);

/** Shared stable empty slice for the undefined-projectId path (Zustand v5
 *  discipline — never return a fresh array from a selector). */
const EMPTY: readonly never[] = Object.freeze([]);

export function useDivergedDomains(
  projectId: string | undefined,
): readonly UniversalDomain[] {
  const dataPoints = useObserveDataPointStore((s) =>
    projectId ? selectObserveDataPointsForProject(s, projectId) : EMPTY,
  );
  const feedEntries = useObserveFeedStore((s) =>
    projectId ? selectObserveFeedForProject(s, projectId) : EMPTY,
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

  return useMemo<readonly UniversalDomain[]>(() => {
    const set = new Set<UniversalDomain>();
    for (const d of divergedDataPointDomains) set.add(d);
    for (const d of divergedFeedDomains) set.add(d);
    return Array.from(set);
  }, [divergedDataPointDomains, divergedFeedDomains]);
}

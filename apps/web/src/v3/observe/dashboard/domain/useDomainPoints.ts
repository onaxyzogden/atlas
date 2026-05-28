/**
 * useDomainPoints — composed hook for the Domain Detail surface (OLOS
 * Observe Dashboard Spec §4). Returns the union of real Phase 4 data
 * points and virtual projections of Phase 3 feed entries, sorted newest
 * first. Consumers (DomainObservationList, DomainEvidenceLibrary,
 * SupersessionControl) treat the two pathways uniformly.
 *
 * Slice 4.3 ships the union interface but the feed-entry projection is
 * gated on the resolver, which today is a no-op. Slice 4.4 plugs in the
 * planTier-aware resolver so verified/diverged field actions surface in
 * the right Domain Detail page automatically.
 */

import { useMemo } from 'react';
import type {
  ObserveDataPoint,
  UniversalDomain,
} from '@ogden/shared';
import { useObserveDataPointStore } from '../../../../store/observeDataPointStore.js';
import { useObserveFeedStore } from '../../../../store/observeFeedStore.js';
import {
  noopResolveDomain,
  routeToDataPoint,
  type ResolveDomainForObjective,
} from './routeToDataPoint.js';

export interface DomainPointsView {
  /** All points active OR superseded, newest first. */
  all: readonly ObserveDataPoint[];
  /** Only `isSuperseded === false`, newest first. */
  active: readonly ObserveDataPoint[];
  /** Only `isSuperseded === true`, newest first. */
  superseded: readonly ObserveDataPoint[];
}

const EMPTY_VIEW: DomainPointsView = Object.freeze({
  all: [],
  active: [],
  superseded: [],
});

function byCapturedAtDesc(
  a: ObserveDataPoint,
  b: ObserveDataPoint,
): number {
  const aMs = Date.parse(a.capturedAt);
  const bMs = Date.parse(b.capturedAt);
  if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
  if (!Number.isFinite(aMs)) return 1;
  if (!Number.isFinite(bMs)) return -1;
  return bMs - aMs;
}

export function useDomainPoints(
  projectId: string,
  domainId: UniversalDomain,
  resolveDomain: ResolveDomainForObjective = noopResolveDomain,
): DomainPointsView {
  const dataByProject = useObserveDataPointStore((s) => s.byProject);
  const feedByProject = useObserveFeedStore((s) => s.byProject);

  return useMemo(() => {
    if (!projectId) return EMPTY_VIEW;
    const data = dataByProject[projectId] ?? [];
    const feed = feedByProject[projectId] ?? [];

    const dataForDomain = data.filter((p) => p.domainId === domainId);
    const projected: ObserveDataPoint[] = [];
    for (const entry of feed) {
      const projection = routeToDataPoint(entry, resolveDomain);
      if (projection && projection.domainId === domainId) {
        projected.push(projection);
      }
    }
    const merged = [...dataForDomain, ...projected].sort(byCapturedAtDesc);
    const active = merged.filter((p) => !p.isSuperseded);
    const superseded = merged.filter((p) => p.isSuperseded);
    return { all: merged, active, superseded };
  }, [projectId, domainId, dataByProject, feedByProject, resolveDomain]);
}

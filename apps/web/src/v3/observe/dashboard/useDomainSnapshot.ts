/**
 * useDomainSnapshots — composed hook that powers the 16 DomainStatusCards
 * on the Unified Land State surface (OLOS Observe Dashboard Spec §2 + §4).
 *
 * Reads the Phase 4 `observeDataPointStore` (active rows only — superseded
 * captures count as withdrawn per Dashboard Spec §4.3) and projects each
 * universal domain into a small render-ready snapshot:
 *
 *   - freshness        : current / ageing / stale / missing
 *                        (per-domain thresholds from OBSERVE_DOMAIN_CATALOG)
 *   - latestStatus     : statusOutput of the most recent active capture
 *   - observationCount : active capture count for the domain
 *   - divergenceCount  : active captures whose statusOutput is in the
 *                        Dashboard-Spec divergence set (needs_investigation,
 *                        major_constraint, potential_disqualifier). Phase 3
 *                        ObserveFeedEntry rows are NOT counted here — the
 *                        Phase 4.3 `routeToDataPoint` adapter merges them
 *                        into the data-point projection; until then the
 *                        legacy feed surfaces divergence via the Plan-tier
 *                        ObjectiveCard chip (Slice 4.4).
 *   - lastObservedAt   : ISO timestamp of the most recent active capture.
 *
 * Pure read — no writes, no navigation. The Dashboard owns the click-to-
 * detail navigation in Slice 4.3.
 */

import { useMemo } from 'react';
import {
  UNIVERSAL_DOMAINS,
  UNIVERSAL_DOMAIN_LABELS,
  UNIVERSAL_DOMAIN_PURPOSE,
  OBSERVE_DOMAIN_CATALOG,
  computeDomainFreshness,
  type ObserveFreshness,
  type ObserveStatusOutput,
  type UniversalDomain,
  type ObserveDataPoint,
} from '@ogden/shared';
import { useObserveDataPointStore } from '../../../store/observeDataPointStore.js';

export interface DomainSnapshot {
  domainId: UniversalDomain;
  label: string;
  purpose: string;
  freshness: ObserveFreshness;
  latestStatus: ObserveStatusOutput | null;
  observationCount: number;
  divergenceCount: number;
  lastObservedAt: string | null;
}

const DIVERGENT_STATUSES: ReadonlySet<ObserveStatusOutput> = new Set([
  'needs_investigation',
  'major_constraint',
  'potential_disqualifier',
]);

/**
 * Build a snapshot per universal domain for a given project. Memoized on
 * the project's point list so rerenders elsewhere (other store mutations)
 * don't recompute the 16 buckets.
 */
export function useDomainSnapshots(
  projectId: string,
): readonly DomainSnapshot[] {
  const byProject = useObserveDataPointStore((s) => s.byProject);
  const points = byProject[projectId] ?? [];
  // `now` is captured once per hook call so the freshness pills don't
  // flicker between rerenders triggered by unrelated state changes.
  const nowMs = useMemo(() => Date.now(), []);

  return useMemo(() => {
    const pointsByDomain = new Map<UniversalDomain, ObserveDataPoint[]>();
    for (const p of points) {
      const bucket = pointsByDomain.get(p.domainId);
      if (bucket) bucket.push(p);
      else pointsByDomain.set(p.domainId, [p]);
    }
    return UNIVERSAL_DOMAINS.map((domainId): DomainSnapshot => {
      const domainPoints = pointsByDomain.get(domainId) ?? [];
      const activePoints = domainPoints.filter((p) => !p.isSuperseded);
      const freshness = computeDomainFreshness(
        domainPoints,
        nowMs,
        OBSERVE_DOMAIN_CATALOG[domainId].freshnessThresholds,
      );
      let latest: ObserveDataPoint | null = null;
      let latestMs = -Infinity;
      for (const p of activePoints) {
        const ms = Date.parse(p.capturedAt);
        if (Number.isFinite(ms) && ms > latestMs) {
          latest = p;
          latestMs = ms;
        }
      }
      const divergenceCount = activePoints.reduce(
        (n, p) => n + (DIVERGENT_STATUSES.has(p.statusOutput) ? 1 : 0),
        0,
      );
      return {
        domainId,
        label: UNIVERSAL_DOMAIN_LABELS[domainId],
        purpose: UNIVERSAL_DOMAIN_PURPOSE[domainId],
        freshness,
        latestStatus: latest?.statusOutput ?? null,
        observationCount: activePoints.length,
        divergenceCount,
        lastObservedAt: latest?.capturedAt ?? null,
      };
    });
  }, [points, nowMs]);
}

/**
 * routeToDataPoint — Slice 4.3 adapter that projects a Phase 3
 * `ObserveFeedEntry` (parent-objective routing) into a virtual Phase 4
 * `ObserveDataPoint` (domain routing). Consumers of the Domain Detail
 * union (`useDomainPoints`) treat the two pathways uniformly without
 * waiting on a data migration.
 *
 * The adapter is *pure*. Resolving feedKey → domainId lives outside this
 * function because feedKey is a parent objective id and the catalogue
 * that maps objective → domain is owned by the plan-tier seed (different
 * concern, different package boundary). Slice 4.3 ships the interface;
 * Slice 4.4 wires the real resolver when the Plan Revision Banner needs
 * the union, at which point existing call sites become live without an
 * adapter rewrite.
 *
 * If the resolver returns `null` for a given entry, the projection is
 * skipped (the entry stays Plan-tier-only). Status is mapped through a
 * conservative table: verified → 'clear', diverged → 'needs_investigation'.
 * The richer divergence-type → status output mapping arrives in Slice 4.4
 * alongside the resolver.
 */

import type {
  ObserveDataPoint,
  ObserveStatusOutput,
  UniversalDomain,
} from '@ogden/shared';
import type { ObserveFeedEntry } from '../../../../store/observeFeedStore.js';

export type ResolveDomainForObjective = (
  objectiveId: string,
) => UniversalDomain | null;

function mapEntryStatus(entry: ObserveFeedEntry): ObserveStatusOutput {
  return entry.sourceType === 'diverged' ? 'needs_investigation' : 'clear';
}

/**
 * Project one feed entry into a virtual data point. Returns `null` when
 * the resolver cannot map the entry's feedKey to a domain.
 */
export function routeToDataPoint(
  entry: ObserveFeedEntry,
  resolveDomain: ResolveDomainForObjective,
): ObserveDataPoint | null {
  const domainId = resolveDomain(entry.feedKey);
  if (!domainId) return null;
  return {
    id: `feed:${entry.id}`,
    projectId: entry.projectId,
    domainId,
    sourceType:
      entry.sourceType === 'diverged'
        ? 'divergence_evidence'
        : 'task_verification',
    sourceActionId: entry.sourceActionId,
    sourceFeedEntryId: entry.id,
    // Feed projections are not objective-scoped here; enriching this from the
    // entry's parent objective is a named deferred item (see the Act/Observe
    // objective-link ADR).
    sourceObjectiveId: null,
    locationGeometry: null,
    cycleId: 0,
    isSuperseded: false,
    supersededBy: null,
    statusOutput: mapEntryStatus(entry),
    measurementValue: null,
    proofItems: entry.proofItems,
    capturedAt: entry.capturedAt,
    capturedBy: entry.capturedBy ?? 'unknown',
  };
}

/**
 * Default resolver shipped with Slice 4.3 — returns `null` for every
 * objective id. Slice 4.4 replaces this with the planTier-aware resolver
 * once the Plan Revision Banner needs the union.
 */
export const noopResolveDomain: ResolveDomainForObjective = () => null;

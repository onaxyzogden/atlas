/**
 * buildRevisionEvents — pure substrate behind the `useRevisionEvents`
 * hook (OLOS Observe Dashboard Spec §4.2). Extracted into its own module
 * so unit tests can import it without dragging in the Zustand persist
 * middleware that `useRevisionEvents` pulls in via its store selectors.
 *
 * Domain contract:
 *   - A data point is divergent when its `statusOutput` is one of
 *     `needs_investigation | major_constraint | potential_disqualifier`
 *     (matches DIVERGENT_STATUSES in `revisionPriority.ts`).
 *   - Superseded data points are excluded outright.
 *   - The dismissal cursor is inclusive on the dismissed side: events
 *     strictly newer than the cursor surface; ties drop.
 *   - Feed-entry projections require a resolver to map `feedKey` (which
 *     is the parent objective id from Phase 3 substrate) → domainId. The
 *     resolver returning `null` drops the entry (stale objective id,
 *     deleted plan tier, etc.).
 *   - Parse-failed ISO timestamps (`Date.parse` → NaN) are treated as
 *     "after" so a corrupt row never silently suppresses a banner.
 */

import type { RevisionEvent, UniversalDomain } from '@ogden/shared';

const DIVERGENT_STATUSES = new Set([
  'needs_investigation',
  'major_constraint',
  'potential_disqualifier',
]);

export function isAfter(eventIso: string, cursorIso: string | null): boolean {
  if (!cursorIso) return true;
  const eventMs = Date.parse(eventIso);
  const cursorMs = Date.parse(cursorIso);
  if (!Number.isFinite(eventMs) || !Number.isFinite(cursorMs)) return true;
  return eventMs > cursorMs;
}

export function buildRevisionEvents(
  dataPoints: readonly {
    domainId: UniversalDomain;
    statusOutput: string;
    capturedAt: string;
    isSuperseded?: boolean;
    sourceActionId?: string | null;
    sourceFeedEntryId?: string | null;
  }[],
  feedEntries: readonly {
    feedKey: string;
    sourceType: string;
    capturedAt: string;
  }[],
  lastDismissedAt: string | null,
  resolveDomain: (objectiveId: string) => UniversalDomain | null,
): {
  events: RevisionEvent[];
  impactedObjectiveIds: string[];
  impactedDomains: UniversalDomain[];
} {
  const events: RevisionEvent[] = [];
  const impactedObjectiveIds = new Set<string>();
  const impactedDomains = new Set<UniversalDomain>();

  for (const point of dataPoints) {
    if (point.isSuperseded) continue;
    if (!isAfter(point.capturedAt, lastDismissedAt)) continue;
    const isDivergent = DIVERGENT_STATUSES.has(point.statusOutput);
    events.push({
      kind: isDivergent ? 'divergence' : 'observation',
      domainId: point.domainId,
      statusOutput:
        point.statusOutput as RevisionEvent['statusOutput'],
      occurredAt: point.capturedAt,
    });
    impactedDomains.add(point.domainId);
  }

  for (const entry of feedEntries) {
    if (!isAfter(entry.capturedAt, lastDismissedAt)) continue;
    const objectiveId = entry.feedKey;
    const domainId = resolveDomain(objectiveId);
    if (!domainId) continue;
    const isDivergent = entry.sourceType === 'diverged';
    events.push({
      kind: isDivergent ? 'divergence' : 'observation',
      domainId,
      statusOutput: isDivergent ? 'needs_investigation' : 'clear',
      occurredAt: entry.capturedAt,
    });
    if (isDivergent) impactedObjectiveIds.add(objectiveId);
    impactedDomains.add(domainId);
  }

  return {
    events,
    impactedObjectiveIds: Array.from(impactedObjectiveIds),
    impactedDomains: Array.from(impactedDomains),
  };
}

// revisionPriority.ts
//
// Pure ranker that decides the Plan Revision Banner priority
// (Dashboard Spec §4.2). The banner reads a feed of recent Observe
// events since the last banner dismissal; this helper folds the feed
// down to the single highest priority it should display, or null
// when nothing is loud enough to surface.
//
// Spec decision table (paraphrased):
//   - critical       — divergence + statusOutput in
//                      { major_constraint, potential_disqualifier }
//   - high           — divergence + statusOutput needs_investigation
//                      OR `stale` freshness on a foundation domain
//                      (hydrology, soil, risk-compliance)
//   - informational  — any newer-than-last-review observation /
//                      freshness change that didn't escalate
//   - null           — empty feed
//
// Order matters: `critical` short-circuits the scan. Otherwise the
// helper retains the highest-priority hit seen so far. Tie-breaking
// across same-priority events is the caller's job — this helper only
// returns the bucket.

import type { ObserveStatusOutput } from '../schemas/observe/dataPoint.schema.js';
import type { UniversalDomain } from '../schemas/universalDomain.schema.js';
import type { ObserveFreshness } from './observeFreshness.js';

export type RevisionPriority = 'critical' | 'high' | 'informational';

export type RevisionEventKind =
  | 'divergence'
  | 'observation'
  | 'freshness_change';

export interface RevisionEvent {
  kind: RevisionEventKind;
  domainId: UniversalDomain;
  /** Most recent statusOutput for the event's domain at the time the
   *  event was recorded (null when the event is purely a freshness
   *  change with no concurrent capture). */
  statusOutput?: ObserveStatusOutput | null;
  /** Freshness classification at the time of the event — only used
   *  by the `stale on foundation domain` escalation. */
  freshness?: ObserveFreshness | null;
  occurredAt: string;
}

/** Foundation domains per Dashboard Spec §4.2 — `stale` freshness on
 *  these escalates straight to `high` even without a divergence. */
export const FOUNDATION_DOMAINS_FOR_REVISION: readonly UniversalDomain[] = [
  'hydrology',
  'soil',
  'risk-compliance',
];

function rankSingleEvent(event: RevisionEvent): RevisionPriority {
  if (event.kind === 'divergence') {
    if (
      event.statusOutput === 'major_constraint' ||
      event.statusOutput === 'potential_disqualifier'
    ) {
      return 'critical';
    }
    if (event.statusOutput === 'needs_investigation') {
      return 'high';
    }
    return 'informational';
  }
  if (event.kind === 'freshness_change') {
    if (
      event.freshness === 'stale' &&
      FOUNDATION_DOMAINS_FOR_REVISION.includes(event.domainId)
    ) {
      return 'high';
    }
    return 'informational';
  }
  // 'observation' — any straight observation never escalates past
  // informational on its own. Divergences are the escalation vector.
  return 'informational';
}

const RANK: Record<RevisionPriority, number> = {
  informational: 1,
  high: 2,
  critical: 3,
};

export function computeRevisionPriority(
  events: readonly RevisionEvent[],
): RevisionPriority | null {
  if (events.length === 0) return null;
  let best: RevisionPriority | null = null;
  for (const event of events) {
    const ranked = rankSingleEvent(event);
    if (ranked === 'critical') return 'critical';
    if (best === null || RANK[ranked] > RANK[best]) {
      best = ranked;
    }
  }
  return best;
}

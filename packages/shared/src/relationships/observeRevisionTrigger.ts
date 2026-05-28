// observeRevisionTrigger.ts
//
// Pure predicate that decides whether the Observe substrate has
// produced new evidence that should reopen a Plan tier objective for
// cyclical review (Dashboard Spec §4.2). Wired into the existing
// `cyclicalReviewTrigger` (Phase 1) via its `observeRevisionFlag`
// injection point — `usePlanRevisionFlagSync` in Phase 4 Slice 4.4
// calls this with live store reads.
//
// Two signal classes:
//   1. Diverged Field Action proof routed to Observe via Phase 3's
//      `observeFeedStore` — surfaces by feed-domain.
//   2. Diverged or freshly-recorded `ObserveDataPoint`s in Phase 4 —
//      surfaces by data-point domain.
//
// An objective is "impacted" when ANY of its mapped domains overlaps
// either signal set. Keeping this as a small set-intersection helper
// keeps the wiring testable without the stores in scope.

import type { UniversalDomain } from '../schemas/universalDomain.schema.js';

export interface ObserveRevisionTriggerInput {
  /** Domains this Plan tier objective covers — read from the
   *  domain catalog `legacyModuleMapping` reverse-lookup OR an
   *  explicit `objective.observeDomainIds` field. */
  objectiveDomainIds: readonly UniversalDomain[];
  /** Domains that currently have at least one ACTIVE diverged data
   *  point (`isSuperseded === false`). */
  divergedDataPointDomains: readonly UniversalDomain[];
  /** Domains that currently have at least one diverged feed entry
   *  from the Phase 3 substrate. */
  divergedFeedDomains: readonly UniversalDomain[];
}

/**
 * True when the objective's domain set overlaps either signal set.
 * False when the objective has no mapped domains (defensive — without
 * a mapping there's no way to know what Observe evidence would
 * concern this objective).
 */
export function computeObserveRevisionFlag(
  input: ObserveRevisionTriggerInput,
): boolean {
  if (input.objectiveDomainIds.length === 0) return false;
  for (const domainId of input.objectiveDomainIds) {
    if (input.divergedDataPointDomains.includes(domainId)) return true;
    if (input.divergedFeedDomains.includes(domainId)) return true;
  }
  return false;
}

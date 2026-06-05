// observationSource.ts
//
// Pure source classification for Observe Domain Detail observation rows. Splits
// the union view (seed/baseline points, direct Act recordings, and field-log
// projections) into an Act-vs-baseline provenance taxonomy so the Domain Detail
// list can offer an "All / From Act / Baseline" filter.
//
// "From Act" = anything the Act stage produced: a field-log projection (virtual,
// id prefixed `feed:`) OR a real point carrying a sourceObjectiveId (the Act
// write path always sets it; routeToDataPoint enriches projections too). The
// complement is the pre-existing baseline (seed points with no objective link).
//
// See wiki/decisions/2026-05-31-atlas-observe-datapoint-objective-link.md.

import type { ObserveDataPoint } from '@ogden/shared';

export type ObservationSource = 'act' | 'baseline';
export type SourceFilter = 'all' | ObservationSource;

/** Virtual field-log projections carry ids prefixed `feed:`. */
export function isVirtual(point: ObserveDataPoint): boolean {
  return point.id.startsWith('feed:');
}

/**
 * Did this observation originate in the Act stage?
 *   - field-log projection (virtual, id `feed:...`)             -> 'act'
 *   - direct Act recording (sourceObjectiveId set on a real id) -> 'act'
 *   - seed/baseline (real id, null sourceObjectiveId)           -> 'baseline'
 */
export function classifyObservationSource(point: ObserveDataPoint): ObservationSource {
  return isVirtual(point) || point.sourceObjectiveId != null ? 'act' : 'baseline';
}

/** Does the point pass the active source filter? `'all'` admits everything. */
export function matchesSourceFilter(point: ObserveDataPoint, filter: SourceFilter): boolean {
  return filter === 'all' || classifyObservationSource(point) === filter;
}

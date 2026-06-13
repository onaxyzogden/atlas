// describeObserveChange — turns a diverged ObserveDataPoint into a single
// human-readable sentence for the Cyclical Review surfaces (ADR 11 Screen 1
// review-entry copy + the OBSERVE UPDATES detail-panel section §2b).
//
// Reuses the same `asAsBuiltDiff` parse + feature labels that
// AsBuiltReconciliationCard uses, so the change copy reads consistently across
// the as-built reconciliation card and the review banner ("pH at Crop Area
// changed from 6.4 to 5.8"). Pure + display-only — no store reads, no
// mutation. The flag this feeds is ADVISORY; this helper only describes it.

import type { ObserveDataPoint, UniversalDomain } from '@ogden/shared';
import { asAsBuiltDiff, UNIVERSAL_DOMAIN_LABELS } from '@ogden/shared';

// Mirror of AsBuiltReconciliationCard's FEATURE_LABEL — kept local so the two
// surfaces can diverge without coupling, but seeded identically today.
const FEATURE_LABEL: Record<string, string> = {
  cropArea: 'Crop Area',
  paddock: 'Paddock',
  structure: 'Structure',
  zone: 'Zone',
};

function domainLabel(domainId: UniversalDomain): string {
  return UNIVERSAL_DOMAIN_LABELS[domainId] ?? domainId;
}

function whereClause(point: ObserveDataPoint): string {
  const ref = point.sourceFeatureRef;
  if (!ref) return '';
  return ` at ${FEATURE_LABEL[ref.kind] ?? ref.kind}`;
}

/**
 * One-line description of what changed in this Observe data point. Prefers the
 * structured attribute / geometry diff ("pH at Crop Area changed from 6.4 to
 * 5.8"); falls back to a domain-scoped "new reading needs review" line when the
 * measurement carries no parseable diff (e.g. a manual observation).
 */
export function describeObserveChange(point: ObserveDataPoint): string {
  const where = whereClause(point);
  const diff = asAsBuiltDiff(point.measurementValue);

  if (diff?.kind === 'attribute') {
    const field = diff.label ?? diff.field;
    return `${field}${where} changed from ${String(diff.asPlanned)} to ${String(
      diff.asBuilt,
    )}`;
  }

  if (diff?.kind === 'geometry') {
    const planned = diff.asPlanned.areaM2;
    const built = diff.asBuilt.areaM2;
    if (planned != null && built != null) {
      return `${domainLabel(point.domainId)}${where}: area changed from ${planned} m2 to ${built} m2`;
    }
    return `${domainLabel(point.domainId)}${where}: shape differs from plan`;
  }

  return `${domainLabel(point.domainId)}${where}: new reading needs review`;
}

/**
 * Sentence that frames WHY an objective was flagged, from the resolver `via`
 * signals. Used as the review-banner lead-in when concrete change lines are
 * available, and as the standalone reason when they are not. Order of
 * precedence (most direct first): membership > downstream > upstream.
 */
export function describeReviewReason(
  via: readonly ('membership' | 'upstream' | 'downstream')[],
  domains: readonly UniversalDomain[],
): string {
  const labels = domains.map(domainLabel);
  const where =
    labels.length === 0
      ? 'on the land'
      : labels.length === 1
        ? labels[0]
        : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;

  if (via.includes('membership')) {
    return `Conditions changed in ${where}. Confirm this decision still holds, or revise it.`;
  }
  if (via.includes('downstream')) {
    return `A reading this decision relied on changed (${where}). Confirm it still holds, or revise it.`;
  }
  // upstream only
  return `An input you provided fed a decision affected by a change in ${where}. Review whether it still holds.`;
}

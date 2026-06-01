// featureRefDomain.ts
//
// Map a placed Plan feature kind (paddock / crop area / structure / zone)
// to the single Observe universal domain an as-built deviation against it
// should be recorded under.
//
// Why this exists
// ---------------
// The Act -> Observe -> Plan divergence loop surfaces a data point on a Plan
// objective only when the data point's `domainId` overlaps that objective's
// mapped Observe domains (see `getObjectiveObserveDomains` +
// `computeObserveRevisionFlag`). An as-built deviation is captured against a
// feature, not a domain, so this helper picks the domain that lands the
// divergence on a sensible objective:
//
//   cropArea  -> plants-food          (s6-yield-flows override)
//   paddock   -> animals-livestock    (s6-yield-flows override)
//   structure -> built-infrastructure (s3-systems-baseline override)
//   zone      -> land-base            (s2-land-baseline override)
//
// Zones have no dedicated universal domain (they are an overlay, not a
// domain), so `land-base` is the broad, always-present landing on the land
// baseline objective. Each mapped domain is asserted present in the domain
// catalog and overlapping >= 1 catalogue objective by the unit test.
//
// Pure / deterministic. No I/O. Safe in render.

import type { AsBuiltFeatureKind } from '../schemas/observe/dataPoint.schema.js';
import type { UniversalDomain } from '../schemas/universalDomain.schema.js';

/** Feature kind -> the Observe domain its as-built deviation records under. */
export const AS_BUILT_FEATURE_DOMAIN: Readonly<
  Record<AsBuiltFeatureKind, UniversalDomain>
> = {
  cropArea: 'plants-food',
  paddock: 'animals-livestock',
  structure: 'built-infrastructure',
  zone: 'land-base',
} as const;

/**
 * Resolve the Observe domain an as-built deviation against the given feature
 * kind should be recorded under, so it surfaces on the right Plan objective.
 */
export function domainForFeatureKind(
  kind: AsBuiltFeatureKind,
): UniversalDomain {
  return AS_BUILT_FEATURE_DOMAIN[kind];
}

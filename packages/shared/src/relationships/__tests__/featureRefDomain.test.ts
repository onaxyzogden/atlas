// featureRefDomain.test.ts
//
// Pins the feature-kind -> Observe domain mapping that lands an as-built
// deviation on the correct Plan objective. Two guarantees the Act -> Observe
// -> Plan loop relies on:
//   1. Every AsBuiltFeatureKind has a mapping to a real catalog domain.
//   2. Each mapped domain overlaps >= 1 seeded Plan objective, so a divergent
//      data point recorded under it actually forces a cyclical review.

import { describe, it, expect } from 'vitest';
import {
  AS_BUILT_FEATURE_DOMAIN,
  domainForFeatureKind,
} from '../featureRefDomain.js';
import { getObjectivesForDomain } from '../objectiveObserveDomains.js';
import { AsBuiltFeatureKind } from '../../schemas/observe/dataPoint.schema.js';
import { OBSERVE_DOMAIN_CATALOG } from '../../constants/observe/domains.js';
import { PLAN_STRATUM_OBJECTIVES } from '../../constants/plan/stratumObjectives.js';

describe('domainForFeatureKind', () => {
  it('maps every feature kind via the lookup table', () => {
    for (const kind of AsBuiltFeatureKind.options) {
      expect(domainForFeatureKind(kind)).toBe(AS_BUILT_FEATURE_DOMAIN[kind]);
    }
  });

  it('covers all four feature kinds (no gaps)', () => {
    expect(Object.keys(AS_BUILT_FEATURE_DOMAIN).sort()).toEqual(
      [...AsBuiltFeatureKind.options].sort(),
    );
  });

  it('pins the agreed mapping', () => {
    expect(domainForFeatureKind('cropArea')).toBe('plants-food');
    expect(domainForFeatureKind('paddock')).toBe('animals-livestock');
    expect(domainForFeatureKind('structure')).toBe('built-infrastructure');
    expect(domainForFeatureKind('zone')).toBe('land-base');
  });
});

describe('as-built domains are wired to the loop', () => {
  it('every mapped domain exists in the Observe domain catalog', () => {
    for (const kind of AsBuiltFeatureKind.options) {
      const domain = domainForFeatureKind(kind);
      expect(OBSERVE_DOMAIN_CATALOG[domain]).toBeDefined();
    }
  });

  it('every mapped domain overlaps at least one seeded Plan objective', () => {
    for (const kind of AsBuiltFeatureKind.options) {
      const domain = domainForFeatureKind(kind);
      const objectives = getObjectivesForDomain(
        PLAN_STRATUM_OBJECTIVES,
        domain,
      );
      expect(objectives.length).toBeGreaterThan(0);
    }
  });

  it('cropArea + paddock land on s6-yield-flows', () => {
    expect(
      getObjectivesForDomain(PLAN_STRATUM_OBJECTIVES, 'plants-food'),
    ).toContain('s6-yield-flows');
    expect(
      getObjectivesForDomain(PLAN_STRATUM_OBJECTIVES, 'animals-livestock'),
    ).toContain('s6-yield-flows');
  });
});

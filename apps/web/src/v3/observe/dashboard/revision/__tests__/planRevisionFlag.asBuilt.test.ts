/**
 * planRevisionFlag.asBuilt - the trigger-layer half of the Act -> Observe ->
 * Plan as-built loop (Slice 2 gate).
 *
 * `usePlanRevisionFlagSync` (the React hook) reads active diverged data-point
 * domains and, for each project objective, computes a force/clear decision via
 * exactly two pure functions:
 *   - `resolveAllDomainsForObjective(objective)`  (web resolver -> shared
 *     getObjectiveObserveDomains)
 *   - `computeObserveRevisionFlag({ objectiveDomainIds, ... })`  (shared predicate)
 *
 * This test pins that computation directly for the real `s6-yield-flows`
 * objective: an active `plants-food` divergence (what `recordAsBuiltDeviation`
 * emits for a crop area) forces its review flag; no divergence does not. It
 * deliberately exercises the pure path rather than rendering the hook - the
 * React effect around these calls is generic zustand -> useEffect plumbing, and
 * pinning the decision functions is the deterministic core of the gate.
 *
 * Pairs with:
 *   - recordAsBuiltDeviation.test.ts  (emit -> active plants-food point)
 *   - shared featureRefDomain.test.ts (cropArea -> plants-food -> s6-yield-flows)
 */

import { describe, it, expect } from 'vitest';
import { computeObserveRevisionFlag } from '@ogden/shared';
import { resolveAllDomainsForObjective } from '../resolveDomainForObjective.js';
import { findObjectiveGlobally } from '../../../../plan/objectiveCatalog.js';

describe('plan revision flag - as-built crop divergence', () => {
  const objective = findObjectiveGlobally('s6-yield-flows');

  it('finds the s6-yield-flows objective in the catalogue', () => {
    expect(objective).toBeDefined();
  });

  it('resolves a domain footprint for s6-yield-flows that includes plants-food', () => {
    expect(objective).toBeDefined();
    const domains = resolveAllDomainsForObjective(objective!);
    expect(domains).toContain('plants-food');
  });

  it('an active plants-food divergence forces the s6-yield-flows review flag', () => {
    expect(objective).toBeDefined();
    const objectiveDomainIds = resolveAllDomainsForObjective(objective!);
    const flag = computeObserveRevisionFlag({
      objectiveDomainIds,
      divergedDataPointDomains: ['plants-food'],
      divergedFeedDomains: [],
    });
    expect(flag).toBe(true);
  });

  it('does NOT force the flag when there is no active divergence', () => {
    expect(objective).toBeDefined();
    const objectiveDomainIds = resolveAllDomainsForObjective(objective!);
    const flag = computeObserveRevisionFlag({
      objectiveDomainIds,
      divergedDataPointDomains: [],
      divergedFeedDomains: [],
    });
    expect(flag).toBe(false);
  });
});

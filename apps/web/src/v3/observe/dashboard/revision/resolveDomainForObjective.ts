/**
 * resolveDomainForObjective — Phase 4 Slice 4.4 replacement for the
 * Slice 4.3 `noopResolveDomain` stub in `routeToDataPoint.ts`.
 *
 * The Phase 3 Observe feed keys each entry by the parent Plan tier
 * objective id (because the feed predates the 16-domain catalog). To
 * fold those entries into the Phase 4 dashboard's domain-keyed
 * surfaces, we need a deterministic objective → domain mapping.
 *
 * The mapping itself lives in `@ogden/shared`
 * (`getPrimaryDomainForObjective` — per-objective override table with
 * tier-default fallback). This module is the thin adapter that
 * (a) plugs `findPlanTierObjective(objectiveId)` in front of it so
 * call sites only need to pass the feed key, and (b) gives the
 * dashboard a single import path for both the per-entry projection
 * (used by `routeToDataPoint`) and the bulk lookup (used by
 * `useRevisionEvents` + `usePlanRevisionFlagSync`).
 */

import {
  findPlanTierObjective,
  getObjectiveObserveDomains,
  getPrimaryDomainForObjective,
  type PlanTierObjective,
  type UniversalDomain,
} from '@ogden/shared';
import type { ResolveDomainForObjective } from '../domain/routeToDataPoint.js';

/**
 * Resolve the primary Observe domain a Plan tier objective concerns.
 * Returns `null` when the objective id is unknown (defensive — stale
 * feed entries reference deleted objective ids).
 */
export function resolveDomainForObjective(
  objective: PlanTierObjective,
): UniversalDomain | null {
  return getPrimaryDomainForObjective(objective);
}

/**
 * `ResolveDomainForObjective` adapter for `routeToDataPoint`. Closes
 * over the canonical PLAN_TIER_OBJECTIVES catalog so call sites stay
 * pure-function-shaped.
 */
export const resolveDomainByObjectiveId: ResolveDomainForObjective = (
  objectiveId,
) => {
  const obj = findPlanTierObjective(objectiveId);
  return obj ? getPrimaryDomainForObjective(obj) : null;
};

/**
 * Resolve the full set of domains a Plan tier objective concerns
 * (override > tier default). Used by `usePlanRevisionFlagSync` to
 * decide whether any in-window divergence overlaps the objective's
 * domain footprint.
 */
export function resolveAllDomainsForObjective(
  objective: PlanTierObjective,
): readonly UniversalDomain[] {
  return getObjectiveObserveDomains(objective);
}

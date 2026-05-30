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
 * (a) plugs `findObjectiveGlobally(objectiveId)` in front of it so
 * call sites only need to pass the feed key, and (b) gives the
 * dashboard a single import path for both the per-entry projection
 * (used by `routeToDataPoint`) and the bulk lookup (used by
 * `useRevisionEvents` + `usePlanRevisionFlagSync`).
 */

import {
  getObjectiveObserveDomains,
  getPrimaryDomainForObjective,
  type PlanStratumObjective,
  type UniversalDomain,
} from '@ogden/shared';
import { findObjectiveGlobally } from '../../../plan/objectiveCatalog.js';
import type { ResolveDomainForObjective } from '../domain/routeToDataPoint.js';

/**
 * Resolve the primary Observe domain a Plan tier objective concerns.
 * Returns `null` when the objective id is unknown (defensive — stale
 * feed entries reference deleted objective ids).
 */
export function resolveDomainForObjective(
  objective: PlanStratumObjective,
): UniversalDomain | null {
  return getPrimaryDomainForObjective(objective);
}

/**
 * `ResolveDomainForObjective` adapter for `routeToDataPoint`. Closes
 * over the catalogue-union lookup so call sites stay pure-function-shaped.
 */
export const resolveDomainByObjectiveId: ResolveDomainForObjective = (
  objectiveId,
) => {
  // The objective->domain mapping is project-independent, so resolve the id
  // across the catalogue union rather than the legacy skeleton (Sub-slice D
  // Group 2). This now maps primary/secondary feed keys, not just universals.
  const obj = findObjectiveGlobally(objectiveId);
  return obj ? getPrimaryDomainForObjective(obj) : null;
};

/**
 * Resolve the full set of domains a Plan tier objective concerns
 * (override > tier default). Used by `usePlanRevisionFlagSync` to
 * decide whether any in-window divergence overlaps the objective's
 * domain footprint.
 */
export function resolveAllDomainsForObjective(
  objective: PlanStratumObjective,
): readonly UniversalDomain[] {
  return getObjectiveObserveDomains(objective);
}

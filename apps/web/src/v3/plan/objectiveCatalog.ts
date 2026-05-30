// objectiveCatalog.ts
//
// Project-independent objective lookup by id (OLOS Project-Type + Secondary-
// Layer Spec v1.2, Sub-slice D "Group 2"). Some surfaces only need an
// objective's static metadata - its title, stratumId, or mapped Observe domain -
// from a bare id, with no project context: Act label resolution, the Observe
// revision feed's objective->domain routing, the cyclical-advance domain
// lookup, the Plan revision banner deep-link, and the Plan checklist's
// "feeds into" chips.
//
// Such lookups must resolve EVERY encoded objective (universal + every primary
// + every secondary-additive), not just the legacy 16-objective skeleton that
// findPlanStratumObjective knows. findObjectiveAcrossCatalogues covers the encoded
// catalogues; the static skeleton is kept as a fallback so any pre-slice id that
// predates the catalogues still resolves. Because a project's resolved set is
// always a subset of the catalogue union, this union resolves the metadata for
// every objective any project could surface - so it is a strict superset of the
// old findPlanStratumObjective behaviour and no caller regresses.
//
// Deliberately a tiny leaf module with shared-only deps (no store, no React) so
// the Observe / Act / store callers don't pull the project store or React in
// just to read a title.

import {
  findObjectiveAcrossCatalogues,
  findPlanStratumObjective,
  type PlanStratumObjective,
} from '@ogden/shared';

/**
 * Resolve an objective by id across every encoded catalogue, falling back to the
 * legacy static skeleton. Returns undefined only for ids that exist nowhere (or
 * that are patch-injected checklist items, which are not standalone objectives
 * and therefore intentionally absent from the union).
 */
export function findObjectiveGlobally(
  id: string,
): PlanStratumObjective | undefined {
  return findObjectiveAcrossCatalogues(id) ?? findPlanStratumObjective(id);
}

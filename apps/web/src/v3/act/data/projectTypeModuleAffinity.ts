/**
 * projectTypeModuleAffinity — per-project-type ranking of Act domains
 * (slice 3b+3c: rebased onto UniversalDomain). Lower rank index = higher
 * operational priority for that project type.
 *
 * Used by `TodaysPriorities` and `AlertsPanel` to re-rank items they
 * already surface, so a Conservation steward sees monitoring-records /
 * built-infrastructure items promoted while a Retreat Center steward
 * sees people-governance / built-infrastructure promoted.
 *
 * Rankings reflect *daily field work* for each archetype, not parcel
 * scope or design priority. Rekeyed first-wins from the legacy 8-id
 * lists via ACT_MODULE_TO_DOMAIN, deduped in canonical insertion order.
 * When `effectiveType` is null (no project type set), neither panel
 * applies the affinity sort, so this table only ever promotes — it
 * never demotes default behavior.
 */

import type { PlanProjectTypeKey } from '../../plan/data/planProjectTypeTemplates.js';
import type { UniversalDomain } from '@ogden/shared';
import type { ActModule } from '../types.js';

const PROJECT_TYPE_MODULE_AFFINITY: Record<
  PlanProjectTypeKey,
  readonly UniversalDomain[]
> = {
  regenerative_farm: [
    'plants-food',           // ← harvest
    'animals-livestock',     // ← livestock
    'built-infrastructure',  // ← maintain (first), build
    'monitoring-records',    // ← review
    'people-governance',     // ← network
  ],
  retreat_center: [
    'people-governance',     // ← network
    'built-infrastructure',  // ← maintain (first), build
    'monitoring-records',    // ← review
    'plants-food',           // ← harvest
    'animals-livestock',     // ← livestock
  ],
  homestead: [
    'built-infrastructure',  // ← maintain (first), build
    'plants-food',           // ← harvest
    'animals-livestock',     // ← livestock
    'people-governance',     // ← network
    'monitoring-records',    // ← review
  ],
  educational_farm: [
    'people-governance',     // ← network
    'monitoring-records',    // ← review
    'built-infrastructure',  // ← maintain (first), build
    'plants-food',           // ← harvest
    'animals-livestock',     // ← livestock
  ],
  conservation: [
    'monitoring-records',    // ← review
    'built-infrastructure',  // ← maintain (first), build
    'people-governance',     // ← network
    'plants-food',           // ← harvest
    'animals-livestock',     // ← livestock
  ],
  multi_enterprise: [
    'built-infrastructure',  // ← build (first), maintain
    'monitoring-records',    // ← review
    'plants-food',           // ← harvest
    'animals-livestock',     // ← livestock
    'people-governance',     // ← network
  ],
};

/**
 * Returns the affinity rank (lower = higher priority) of `module` for
 * `type`. Domains absent from the table fall back to
 * `Number.POSITIVE_INFINITY` so they sort to the bottom of an
 * affinity-sorted list. `type === null` also returns infinity, but callers
 * should short-circuit and skip the sort entirely in that case.
 */
export function getModuleAffinityRank(
  type: PlanProjectTypeKey | null,
  module: ActModule | null | undefined,
): number {
  if (!type || !module) return Number.POSITIVE_INFINITY;
  const order = PROJECT_TYPE_MODULE_AFFINITY[type];
  const idx = order.indexOf(module);
  return idx === -1 ? Number.POSITIVE_INFINITY : idx;
}

export { PROJECT_TYPE_MODULE_AFFINITY };

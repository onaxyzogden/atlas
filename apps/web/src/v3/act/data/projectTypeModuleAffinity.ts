/**
 * projectTypeModuleAffinity — per-project-type ranking of Act modules.
 *
 * Lower rank index = higher operational priority for that project type.
 * Used by `TodaysPriorities` and `AlertsPanel` to re-rank items they
 * already surface, so a Conservation steward sees review/maintain items
 * promoted while a Retreat Center steward sees network/maintain promoted.
 *
 * Rankings reflect *daily field work* for each archetype, not parcel scope
 * or design priority. They are a v1 best-guess — easily edited as a single
 * constant; tunable based on usage feedback. When `effectiveType` is null
 * (no project type set), neither panel applies the affinity sort, so this
 * table only ever promotes — it never demotes default behavior.
 */

import type { PlanProjectTypeKey } from '../../plan/data/planProjectTypeTemplates.js';
import type { ActModule } from '../types.js';

const PROJECT_TYPE_MODULE_AFFINITY: Record<
  PlanProjectTypeKey,
  readonly ActModule[]
> = {
  regenerative_farm: [
    'harvest',
    'livestock',
    'maintain',
    'build',
    'review',
    'network',
  ],
  retreat_center: [
    'network',
    'maintain',
    'review',
    'build',
    'harvest',
    'livestock',
  ],
  homestead: [
    'maintain',
    'harvest',
    'livestock',
    'build',
    'network',
    'review',
  ],
  educational_farm: [
    'network',
    'review',
    'maintain',
    'harvest',
    'build',
    'livestock',
  ],
  conservation: [
    'review',
    'maintain',
    'build',
    'network',
    'harvest',
    'livestock',
  ],
  multi_enterprise: [
    'build',
    'review',
    'harvest',
    'maintain',
    'livestock',
    'network',
  ],
};

/**
 * Returns the affinity rank (lower = higher priority) of `module` for
 * `type`. Modules absent from the table fall back to
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

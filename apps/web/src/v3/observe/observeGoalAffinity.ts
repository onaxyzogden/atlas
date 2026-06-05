/**
 * observeGoalAffinity — tailors the Observe stage to the chosen goal.
 *
 * Stage 0 (True North) captures a project archetype. That archetype reshapes
 * which Observe domains lead the inquiry: a conservation project reads the land
 * first; a retreat reads the people first. This is a pure, additive lens — it
 * filters/reorders the canonical OBSERVE_MODULES list, it does not invent or
 * rename domains. Every domain remains reachable by direct route; the affinity
 * only governs what the guided compass + dashboards feature, and in what order.
 *
 * Slice 3b+3c rebased onto UniversalDomain — legacy Observe ids map to:
 *   human-context        → people-governance
 *   built-environment    → built-infrastructure
 *   macroclimate-hazards → climate
 *   topography           → topography
 *   earth-water-ecology  → hydrology
 *   sectors-zones        → access-circulation
 *   swot-synthesis       → monitoring-records
 *
 * Invariants: `topography`, `hydrology`, and `monitoring-records` are
 * foundational and present for every archetype; `monitoring-records` always
 * closes the sequence (it synthesizes everything observed before it).
 */

import type { ProjectArchetype } from '../plan/data/goalCompassTypes.js';
import { OBSERVE_MODULES, type ObserveModule } from './types.js';

/**
 * Priority-ordered Observe domains per archetype. A subset/reorder of
 * OBSERVE_MODULES — `monitoring-records` is kept last everywhere.
 */
const AFFINITY: Record<ProjectArchetype, readonly ObserveModule[]> = {
  // Self-reliance touches every system — full set, land-and-water first.
  homestead: [
    'hydrology',
    'topography',
    'access-circulation',
    'climate',
    'built-infrastructure',
    'people-governance',
    'monitoring-records',
  ],
  // Production fitness is land-driven; community context is secondary here.
  'regenerative-farm': [
    'hydrology',
    'topography',
    'climate',
    'access-circulation',
    'built-infrastructure',
    'monitoring-records',
  ],
  // Hosting fitness leads with people and the built fabric that serves them.
  retreat: [
    'people-governance',
    'built-infrastructure',
    'access-circulation',
    'climate',
    'topography',
    'hydrology',
    'monitoring-records',
  ],
  // Teaching site — people and place first; climate hazards de-emphasized.
  education: [
    'people-governance',
    'built-infrastructure',
    'access-circulation',
    'hydrology',
    'topography',
    'monitoring-records',
  ],
  // Ecology-first, minimal build — drops people-governance & built-infrastructure.
  conservation: [
    'hydrology',
    'topography',
    'climate',
    'access-circulation',
    'monitoring-records',
  ],
  // No single emphasis — the canonical full set in its default order.
  'multi-enterprise': OBSERVE_MODULES,
};

/**
 * Returns the Observe domains to feature for a goal archetype, in priority
 * order. A null/unknown archetype falls back to the canonical full list, so
 * pre-Stage-0 projects behave exactly as before.
 */
export function getObserveModulesForGoal(
  archetype: ProjectArchetype | null | undefined,
): readonly ObserveModule[] {
  if (!archetype) return OBSERVE_MODULES;
  return AFFINITY[archetype] ?? OBSERVE_MODULES;
}

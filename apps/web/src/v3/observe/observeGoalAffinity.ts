/**
 * observeGoalAffinity — tailors the Observe stage to the chosen goal.
 *
 * Stage 0 (True North) captures a project archetype. That archetype reshapes
 * which Observe modules lead the inquiry: a conservation project reads the land
 * first; a retreat reads the people first. This is a pure, additive lens — it
 * filters/reorders the canonical OBSERVE_MODULES list, it does not invent or
 * rename modules. Every module remains reachable by direct route; the affinity
 * only governs what the guided compass + dashboards feature, and in what order.
 *
 * Invariants: `topography`, `earth-water-ecology`, and `swot-synthesis` are
 * foundational and present for every archetype; `swot-synthesis` always closes
 * the sequence (it synthesizes everything observed before it).
 */

import type { ProjectArchetype } from '../plan/data/goalCompassTypes.js';
import { OBSERVE_MODULES, type ObserveModule } from './types.js';

/**
 * Priority-ordered Observe modules per archetype. A subset/reorder of
 * OBSERVE_MODULES — `swot-synthesis` is kept last everywhere.
 */
const AFFINITY: Record<ProjectArchetype, readonly ObserveModule[]> = {
  // Self-reliance touches every system — full set, land-and-water first.
  homestead: [
    'earth-water-ecology',
    'topography',
    'sectors-zones',
    'macroclimate-hazards',
    'built-environment',
    'human-context',
    'swot-synthesis',
  ],
  // Production fitness is land-driven; community context is secondary here.
  'regenerative-farm': [
    'earth-water-ecology',
    'topography',
    'macroclimate-hazards',
    'sectors-zones',
    'built-environment',
    'swot-synthesis',
  ],
  // Hosting fitness leads with people and the built fabric that serves them.
  retreat: [
    'human-context',
    'built-environment',
    'sectors-zones',
    'macroclimate-hazards',
    'topography',
    'earth-water-ecology',
    'swot-synthesis',
  ],
  // Teaching site — people and place first; macroclimate hazards de-emphasized.
  education: [
    'human-context',
    'built-environment',
    'sectors-zones',
    'earth-water-ecology',
    'topography',
    'swot-synthesis',
  ],
  // Ecology-first, minimal build — drops human-context & built-environment.
  conservation: [
    'earth-water-ecology',
    'topography',
    'macroclimate-hazards',
    'sectors-zones',
    'swot-synthesis',
  ],
  // No single emphasis — the canonical full set in its default order.
  'multi-enterprise': OBSERVE_MODULES,
};

/**
 * Returns the Observe modules to feature for a goal archetype, in priority
 * order. A null/unknown archetype falls back to the canonical full list, so
 * pre-Stage-0 projects behave exactly as before.
 */
export function getObserveModulesForGoal(
  archetype: ProjectArchetype | null | undefined,
): readonly ObserveModule[] {
  if (!archetype) return OBSERVE_MODULES;
  return AFFINITY[archetype] ?? OBSERVE_MODULES;
}

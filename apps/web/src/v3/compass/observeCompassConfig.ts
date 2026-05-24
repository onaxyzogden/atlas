/**
 * observeCompassConfig — derives the Stage Compass objectives for the Observe
 * stage from existing Observe constants. The compass is a view over data that
 * already exists: segment ids/labels come from OBSERVE_MODULES, each node is a
 * MODULE_GUIDANCE `how` step, and the pitfall is the module's pitfall.
 *
 * The only net-new copy here is a short `summary` (right-panel body) and a
 * lucide `icon` per objective. Everything else re-exports from the canonical
 * sources so the wheel stays in sync with the rest of Observe.
 */

import {
  Users,
  Building2,
  CloudLightning,
  Mountain,
  Droplets,
  Compass,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../observe/types.js';
import {
  MODULE_GUIDANCE,
  OBSERVE_MODULE_DOT,
} from '../observe/moduleGuidance.js';
import { getObserveModulesForGoal } from '../observe/observeGoalAffinity.js';
import type { ProjectArchetype } from '../plan/data/goalCompassTypes.js';
import type { CompassObjective } from './compassTypes.js';

// Re-export the shared shapes so existing importers of this module keep working.
export type { CompassNode, CompassObjective } from './compassTypes.js';

const ICON: Record<ObserveModule, LucideIcon> = {
  'human-context': Users,
  'built-environment': Building2,
  'macroclimate-hazards': CloudLightning,
  topography: Mountain,
  'earth-water-ecology': Droplets,
  'sectors-zones': Compass,
  'swot-synthesis': ClipboardCheck,
};

const SUMMARY: Record<ObserveModule, string> = {
  'human-context':
    'Understand the people, land uses, and stewardship practices that shape this landscape. Capture community context and historical knowledge to inform responsible decisions.',
  'built-environment':
    'Map the existing infrastructure — buildings, wells, utilities, and fence lines — that constrains and enables every later design move.',
  'macroclimate-hazards':
    'Identify the major regional forces acting on the site: frost pockets, flood plains, fire corridors, and other hazards to deflect.',
  topography:
    'Read the landform. Elevation, contour, and drainage set the structure for a water-abundant design.',
  'earth-water-ecology':
    'Trace water and soil — streams, swales, test pits, and ecological patches — the bones and digestive system of the site.',
  'sectors-zones':
    'Map the wild energies flowing in (sectors) and the zones of human use radiating out, so the design responds to both.',
  'swot-synthesis':
    'Synthesize an honest diagnosis — strengths, weaknesses, opportunities, threats — before prescribing any design treatment.',
};

function buildObjective(id: ObserveModule, ordinal: number): CompassObjective {
  return {
    id,
    ordinal,
    label: OBSERVE_MODULE_LABEL[id],
    icon: ICON[id],
    accent: OBSERVE_MODULE_DOT[id],
    summary: SUMMARY[id],
    nodes: MODULE_GUIDANCE[id].how.map((label, index) => ({ index, label })),
    pitfall: MODULE_GUIDANCE[id].pitfall,
  };
}

/** Canonical full objective set (all modules, default order). */
export const OBSERVE_COMPASS_OBJECTIVES: readonly CompassObjective[] =
  OBSERVE_MODULES.map((id, i) => buildObjective(id, i + 1));

/**
 * Goal-tailored objective set — the subset/order the True North archetype
 * emphasizes (Phase 5). A null archetype yields the canonical full set, so
 * pre-Stage-0 projects are unchanged.
 */
export function objectivesForArchetype(
  archetype: ProjectArchetype | null | undefined,
): readonly CompassObjective[] {
  return getObserveModulesForGoal(archetype).map((id, i) =>
    buildObjective(id, i + 1),
  );
}

export function objectiveById(id: ObserveModule): CompassObjective {
  const found = OBSERVE_COMPASS_OBJECTIVES.find((o) => o.id === id);
  // OBSERVE_COMPASS_OBJECTIVES is built from OBSERVE_MODULES, so every valid
  // ObserveModule is present (and the array is never empty).
  return found ?? OBSERVE_COMPASS_OBJECTIVES[0]!;
}

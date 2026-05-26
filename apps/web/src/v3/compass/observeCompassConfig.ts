/**
 * observeCompassConfig — derives the Stage Compass objectives for the Observe
 * stage from existing Observe constants (slice 3b+3c: rebased onto
 * UniversalDomain). Segment ids/labels come from OBSERVE_MODULES (= the 16
 * universal domains), each node is a MODULE_GUIDANCE `how` step, and the
 * pitfall is the domain's pitfall.
 *
 * Net-new copy: a short `summary` and lucide `icon` per domain — first-wins
 * from the legacy stage-local maps via OBSERVE_MODULE_TO_DOMAIN; unauthored
 * domains fall back to `Circle` + empty summary. Domains with empty
 * guidance (`how: []`) still appear in the compass with zero nodes.
 */

import {
  Users,
  Building2,
  CloudLightning,
  Mountain,
  Droplets,
  Compass,
  ClipboardCheck,
  Circle,
  type LucideIcon,
} from 'lucide-react';
import type { UniversalDomain } from '@ogden/shared';
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

const ICON: Record<UniversalDomain, LucideIcon> = {
  'vision-intent':        Circle,
  'land-base':            Circle,
  'climate':              CloudLightning, // ← macroclimate-hazards
  'topography':           Mountain,
  'hydrology':            Droplets,        // ← earth-water-ecology
  'soil':                 Circle,
  'ecology':              Circle,
  'plants-food':          Circle,
  'animals-livestock':    Circle,
  'built-infrastructure': Building2,       // ← built-environment
  'access-circulation':   Compass,         // ← sectors-zones
  'energy-resources':     Circle,
  'people-governance':    Users,           // ← human-context
  'economics-capacity':   Circle,
  'risk-compliance':      Circle,
  'monitoring-records':   ClipboardCheck,  // ← swot-synthesis
};

const SUMMARY: Record<UniversalDomain, string> = {
  'vision-intent':        '',
  'land-base':            '',
  'climate':
    'Identify the major regional forces acting on the site: frost pockets, flood plains, fire corridors, and other hazards to deflect.',
  'topography':
    'Read the landform. Elevation, contour, and drainage set the structure for a water-abundant design.',
  'hydrology':
    'Trace water and soil — streams, swales, test pits, and ecological patches — the bones and digestive system of the site.',
  'soil':                 '',
  'ecology':              '',
  'plants-food':          '',
  'animals-livestock':    '',
  'built-infrastructure':
    'Map the existing infrastructure — buildings, wells, utilities, and fence lines — that constrains and enables every later design move.',
  'access-circulation':
    'Map the wild energies flowing in (sectors) and the zones of human use radiating out, so the design responds to both.',
  'energy-resources':     '',
  'people-governance':
    'Understand the people, land uses, and stewardship practices that shape this landscape. Capture community context and historical knowledge to inform responsible decisions.',
  'economics-capacity':   '',
  'risk-compliance':      '',
  'monitoring-records':
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

/** Canonical full objective set (all 16 domains, canonical order). */
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
  // domain is present (and the array is never empty).
  return found ?? OBSERVE_COMPASS_OBJECTIVES[0]!;
}

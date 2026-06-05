/**
 * planCompassConfig — derives the Stage Compass objectives for the Plan stage
 * from existing Plan constants (slice 3b+3c: rebased onto UniversalDomain).
 * Segment ids/labels come from PLAN_MODULES (= the 16 universal domains),
 * each node is a PLAN_MODULE_GUIDANCE `how` step, the accent is
 * PLAN_MODULE_DOT, and the pitfall (when present) is the domain's pitfall.
 *
 * Net-new copy: a short `summary` and lucide `icon` per domain —
 * first-wins from the legacy stage-local maps via PLAN_MODULE_TO_DOMAIN;
 * unauthored domains fall back to `Circle` + empty summary. Collision
 * domains (access-circulation, built-infrastructure, ecology) pick the
 * canonical-first legacy module's icon + summary.
 */

import {
  Compass,
  Layers,
  Droplets,
  Building2,
  PawPrint,
  Sprout,
  Shovel,
  Sun,
  CalendarClock,
  ListChecks,
  Activity,
  Circle,
  type LucideIcon,
} from 'lucide-react';
import type { UniversalDomain } from '@ogden/shared';
import {
  PLAN_MODULES,
  PLAN_MODULE_FULL_LABEL,
  type PlanModule,
} from '../types.js';
import { PLAN_MODULE_DOT } from '../data/planModulePalette.js';
import { PLAN_MODULE_GUIDANCE } from '../planModuleGuidance.js';
import type { CompassObjective } from '../../compass/compassTypes.js';

// Re-export the shared shapes so existing importers of this module keep working.
export type { CompassNode, CompassObjective } from '../../compass/compassTypes.js';

const ICON: Record<UniversalDomain, LucideIcon> = {
  'vision-intent':        Compass,         // ← goal-compass
  'land-base':            Circle,
  'climate':              Sun,             // ← cross-section-solar
  'topography':           Circle,
  'hydrology':            Droplets,        // ← water-management
  'soil':                 Shovel,          // ← soil-fertility
  'ecology':              Activity,        // ← regeneration-monitor (first)
  'plants-food':          Sprout,          // ← plant-systems
  'animals-livestock':    PawPrint,        // ← livestock
  'built-infrastructure': Building2,       // ← structures-subsystems (first)
  'access-circulation':   Layers,          // ← dynamic-layering (first)
  'energy-resources':     Circle,
  'people-governance':    Circle,
  'economics-capacity':   CalendarClock,   // ← phasing-budgeting
  'risk-compliance':      ListChecks,      // ← principle-verification
  'monitoring-records':   Circle,
};

const SUMMARY: Record<UniversalDomain, string> = {
  'vision-intent':
    'Declare measurable success criteria and let the sequencing engine propose a phased, costed, labour-budgeted plan against the permaculture intervention catalog.',
  'land-base':            '',
  'climate':
    'Draw the vertical transect to reveal light competition between layers and verify solar access for heating, panels, and photosynthesis.',
  'topography':           '',
  'hydrology':
    'Design water as a directed graph: catchments shed, storage retains, swales spread, sinks absorb — every node declaring an overflow target down-slope.',
  'soil':
    'Diagnose soil before amending it — jar-test, percolation, pH — then wire every fertility unit to a feedstock source and a destination.',
  'ecology':
    'Log dated, per-zone soil and cover samples and read each metric against its goal-tree trajectory — regeneration is only real if measured.',
  'plants-food':
    'Match species to site context, place guilds where water and access already lead, and step through the 30-year succession arc by layer.',
  'animals-livestock':
    'Design paddock cells and the product chain after water and access exist, sizing the herd to its rest period and the off-take it must feed.',
  'built-infrastructure':
    'Place dwellings and their utility subsystems only after climate, landform, water, and access are settled — avoiding expensive retrofits later.',
  'access-circulation':
    "Order the design by Yeomans' Scale of Permanence — climate, landform, water, access, structures — so slow-to-change layers are settled before fast ones.",
  'energy-resources':     '',
  'people-governance':    '',
  'economics-capacity':
    'Match implementation scale to available labour, capital, and ecological readiness — sequencing earthworks and water before planting.',
  'risk-compliance':
    'Check the whole design against all twelve Holmgren principles to catch blind spots before implementation begins.',
  'monitoring-records':   '',
};

function buildObjective(id: PlanModule, ordinal: number): CompassObjective {
  return {
    id,
    ordinal,
    label: PLAN_MODULE_FULL_LABEL[id],
    icon: ICON[id],
    accent: PLAN_MODULE_DOT[id],
    summary: SUMMARY[id],
    nodes: PLAN_MODULE_GUIDANCE[id].how.map((label, index) => ({
      index,
      label,
    })),
    pitfall: PLAN_MODULE_GUIDANCE[id].pitfall,
  };
}

/** Canonical full objective set (all 16 domains, canonical order). */
export const PLAN_COMPASS_OBJECTIVES: readonly CompassObjective[] =
  PLAN_MODULES.map((id, i) => buildObjective(id, i + 1));

export function planObjectiveById(id: PlanModule): CompassObjective {
  const found = PLAN_COMPASS_OBJECTIVES.find((o) => o.id === id);
  // PLAN_COMPASS_OBJECTIVES is built from PLAN_MODULES, so every valid
  // domain is present (and the array is never empty).
  return found ?? PLAN_COMPASS_OBJECTIVES[0]!;
}

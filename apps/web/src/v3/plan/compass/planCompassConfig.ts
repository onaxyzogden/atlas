/**
 * planCompassConfig — derives the Stage Compass objectives for the Plan stage
 * from existing Plan constants, mirroring observeCompassConfig. Segment
 * ids/labels come from PLAN_MODULES / PLAN_MODULE_FULL_LABEL, each node is a
 * PLAN_MODULE_GUIDANCE `how` step, the accent is PLAN_MODULE_DOT, and the
 * pitfall (when present) is the module's pitfall.
 *
 * Net-new copy here is a short `summary` (right-panel body) and a lucide `icon`
 * per objective. Everything else re-exports from the canonical Plan sources so
 * the wheel stays in sync with the rest of Plan.
 */

import {
  Compass,
  Layers,
  Droplets,
  Route,
  Building2,
  Tractor,
  PawPrint,
  Sprout,
  Shovel,
  Sun,
  CalendarClock,
  ListChecks,
  Activity,
  Trees,
  Bird,
  type LucideIcon,
} from 'lucide-react';
import {
  PLAN_MODULES,
  PLAN_MODULE_FULL_LABEL,
  type PlanModule,
} from '../types.js';
import { PLAN_MODULE_DOT } from '../data/planModulePalette.js';
import { PLAN_MODULE_GUIDANCE } from '../PlanChecklistAside.js';
import type { CompassObjective } from '../../compass/compassTypes.js';

// Re-export the shared shapes so existing importers of this module keep working.
export type { CompassNode, CompassObjective } from '../../compass/compassTypes.js';

const ICON: Record<PlanModule, LucideIcon> = {
  'goal-compass': Compass,
  'dynamic-layering': Layers,
  'water-management': Droplets,
  'zone-circulation': Route,
  'structures-subsystems': Building2,
  machinery: Tractor,
  livestock: PawPrint,
  'plant-systems': Sprout,
  'soil-fertility': Shovel,
  'cross-section-solar': Sun,
  'phasing-budgeting': CalendarClock,
  'principle-verification': ListChecks,
  'regeneration-monitor': Activity,
  'habitat-allocation': Trees,
  'biodiversity-monitor': Bird,
};

const SUMMARY: Record<PlanModule, string> = {
  'goal-compass':
    'Declare measurable success criteria and let the sequencing engine propose a phased, costed, labour-budgeted plan against the permaculture intervention catalog.',
  'dynamic-layering':
    "Order the design by Yeomans' Scale of Permanence — climate, landform, water, access, structures — so slow-to-change layers are settled before fast ones.",
  'water-management':
    'Design water as a directed graph: catchments shed, storage retains, swales spread, sinks absorb — every node declaring an overflow target down-slope.',
  'zone-circulation':
    'Place elements on a frequency-of-visit ladder (Z0 home → Z5 wilderness) and confirm daily and weekly paths actually reach the high-maintenance zones.',
  'structures-subsystems':
    'Place dwellings and their utility subsystems only after climate, landform, water, and access are settled — avoiding expensive retrofits later.',
  machinery:
    'Lay out access tracks and gates against real machinery turning radii and widths, so every paddock, field, and structure has a reachable path.',
  livestock:
    'Design paddock cells and the product chain after water and access exist, sizing the herd to its rest period and the off-take it must feed.',
  'plant-systems':
    'Match species to site context, place guilds where water and access already lead, and step through the 30-year succession arc by layer.',
  'soil-fertility':
    'Diagnose soil before amending it — jar-test, percolation, pH — then wire every fertility unit to a feedstock source and a destination.',
  'cross-section-solar':
    'Draw the vertical transect to reveal light competition between layers and verify solar access for heating, panels, and photosynthesis.',
  'phasing-budgeting':
    'Match implementation scale to available labour, capital, and ecological readiness — sequencing earthworks and water before planting.',
  'principle-verification':
    'Check the whole design against all twelve Holmgren principles to catch blind spots before implementation begins.',
  'regeneration-monitor':
    'Log dated, per-zone soil and cover samples and read each metric against its goal-tree trajectory — regeneration is only real if measured.',
  'habitat-allocation':
    'Allocate enough land to undisturbed habitat and corridors at year zero, reading the gauge against the goal-tree set-aside target.',
  'biodiversity-monitor':
    'Track native cover, invasive pressure, and the bird and pollinator community over time to confirm the habitat set-aside is actually recovering.',
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

/** Canonical full objective set (all Plan modules, default order). */
export const PLAN_COMPASS_OBJECTIVES: readonly CompassObjective[] =
  PLAN_MODULES.map((id, i) => buildObjective(id, i + 1));

export function planObjectiveById(id: PlanModule): CompassObjective {
  const found = PLAN_COMPASS_OBJECTIVES.find((o) => o.id === id);
  // PLAN_COMPASS_OBJECTIVES is built from PLAN_MODULES, so every valid
  // PlanModule is present (and the array is never empty).
  return found ?? PLAN_COMPASS_OBJECTIVES[0]!;
}

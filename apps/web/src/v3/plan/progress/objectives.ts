/**
 * Plan-stage objectives engine — pure registry + evaluation.
 *
 * Mirrors `v3/observe/progress/objectives.ts` exactly: each objective is a
 * data-derived predicate over real persisted store data (an "activation
 * event"), so Plan progress only advances when the steward actually completes
 * a meaningful design step. No manual toggles, no React, no store imports —
 * the React/store wiring lives in `usePlanProgress.ts`, which assembles a
 * `PlanProgressInput` bag and calls `evaluatePlan` here.
 *
 * Required vs optional: the four "core design essentials" modules
 * (water-management, zone-circulation, plant-systems, phasing-budgeting) each
 * declare one *required* objective; Plan is "complete" (the soft Act gate
 * opens) when every required objective is done. Every other module carries
 * *optional* objectives that raise the percentage but never gate.
 *
 * Keep predicates pure so they unit-test exactly like the Observe engine.
 */

import type { PillarTask } from '../../../components/LevelNavigator/LevelNavigator.js';
import { PLAN_MODULES, type PlanModule } from '../types.js';

/**
 * Plain data bag of counts/flags assembled by `usePlanProgress` from the
 * per-project slices of each Plan-domain store. Every field defaults to 0 /
 * false so a predicate can be evaluated against a partial bag in tests.
 */
export interface PlanProgressInput {
  /** water-management — Plan water graph (NOT Observe earthworks/storage). */
  waterNodeCount: number;

  /** zone-circulation */
  zoneCount: number;
  pathCount: number;

  /** plant-systems */
  guildCount: number;
  cropAreaCount: number;
  successionPlanned: boolean;

  /** phasing-budgeting */
  phaseCount: number;
  workItemCount: number;

  /** structures-subsystems — Plan = proposed built entities only. */
  builtProposedCount: number;

  /** soil-fertility — closed-loop material flows + fertility infra. */
  soilFlowCount: number;

  /** livestock */
  paddockCount: number;

  /** principle-verification — Holmgren checks at status 'met'. */
  principleMetCount: number;
}

export const EMPTY_PLAN_INPUT: PlanProgressInput = {
  waterNodeCount: 0,
  zoneCount: 0,
  pathCount: 0,
  guildCount: 0,
  cropAreaCount: 0,
  successionPlanned: false,
  phaseCount: 0,
  workItemCount: 0,
  builtProposedCount: 0,
  soilFlowCount: 0,
  paddockCount: 0,
  principleMetCount: 0,
};

export interface PlanObjective {
  id: string;
  module: PlanModule;
  label: string;
  required: boolean;
  isComplete: (input: PlanProgressInput) => boolean;
}

/**
 * Registry. Required objectives live on the four core-design-essentials
 * modules; all other Plan modules carry optional objectives (or none). Modules
 * with no authoring store this round get an empty list and evaluate complete.
 */
export const PLAN_OBJECTIVES: Record<PlanModule, PlanObjective[]> = {
  'vision-intent': [],
  'access-circulation': [
    // ← zone-circulation (dynamic-layering contributes nothing)
    {
      id: 'zone-circulation.layout',
      module: 'access-circulation',
      label: 'Define a zone or a circulation path',
      required: true,
      isComplete: (i: PlanProgressInput) => i.zoneCount > 0 || i.pathCount > 0,
    },
    {
      id: 'zone-circulation.path',
      module: 'access-circulation',
      label: 'Draw a circulation path',
      required: false,
      isComplete: (i: PlanProgressInput) => i.pathCount > 0,
    },
  ],
  hydrology: [
    {
      id: 'water-management.node',
      module: 'hydrology',
      label: 'Place a water node (catchment, storage, or sink)',
      required: true,
      isComplete: (i: PlanProgressInput) => i.waterNodeCount > 0,
    },
    {
      id: 'water-management.network',
      module: 'hydrology',
      label: 'Build a three-node water network',
      required: false,
      isComplete: (i: PlanProgressInput) => i.waterNodeCount >= 3,
    },
  ],
  'built-infrastructure': [
    // ← structures-subsystems (machinery contributes nothing)
    {
      id: 'structures-subsystems.proposed',
      module: 'built-infrastructure',
      label: 'Place a proposed structure',
      required: false,
      isComplete: (i: PlanProgressInput) => i.builtProposedCount > 0,
    },
  ],
  'animals-livestock': [
    {
      id: 'livestock.paddock',
      module: 'animals-livestock',
      label: 'Design a grazing paddock',
      required: false,
      isComplete: (i: PlanProgressInput) => i.paddockCount > 0,
    },
  ],
  'plants-food': [
    {
      id: 'plant-systems.planting',
      module: 'plants-food',
      label: 'Design a guild or crop area',
      required: true,
      isComplete: (i: PlanProgressInput) =>
        i.guildCount > 0 || i.cropAreaCount > 0,
    },
    {
      id: 'plant-systems.succession',
      module: 'plants-food',
      label: 'Map an establishment succession',
      required: false,
      isComplete: (i: PlanProgressInput) => i.successionPlanned,
    },
  ],
  soil: [
    {
      id: 'soil-fertility.loop',
      module: 'soil',
      label: 'Map a material flow or fertility node',
      required: false,
      isComplete: (i: PlanProgressInput) => i.soilFlowCount > 0,
    },
  ],
  climate: [],
  'economics-capacity': [
    {
      id: 'phasing-budgeting.phase',
      module: 'economics-capacity',
      label: 'Create a build phase or work item',
      required: true,
      isComplete: (i: PlanProgressInput) =>
        i.phaseCount > 0 || i.workItemCount > 0,
    },
    {
      id: 'phasing-budgeting.workitem',
      module: 'economics-capacity',
      label: 'Schedule a work item',
      required: false,
      isComplete: (i: PlanProgressInput) => i.workItemCount > 0,
    },
  ],
  'risk-compliance': [
    {
      id: 'principle-verification.met',
      module: 'risk-compliance',
      label: 'Verify a Holmgren principle',
      required: false,
      isComplete: (i: PlanProgressInput) => i.principleMetCount > 0,
    },
  ],
  ecology: [],
  // Unauthored domains — empty, evaluate complete.
  'land-base': [],
  topography: [],
  'energy-resources': [],
  'people-governance': [],
  'monitoring-records': [],
};

export interface ModuleProgress {
  module: PlanModule;
  tasks: PillarTask[];
  doneCount: number;
  total: number;
  requiredDone: number;
  requiredTotal: number;
  /** True when every *required* objective in this module is complete. */
  complete: boolean;
}

export interface PlanOverall {
  doneCount: number;
  total: number;
  /** True when every required objective across all modules is complete. */
  requiredComplete: boolean;
  /** 0–100, all objectives (required + optional) weighted equally. */
  percent: number;
  /** Required objectives still incomplete, flattened across modules. */
  remainingRequired: PlanObjective[];
}

export interface PlanProgress {
  byModule: Record<PlanModule, ModuleProgress>;
  overall: PlanOverall;
}

/** Evaluate a single module's objectives against the input bag. */
export function evaluateModule(
  objectives: PlanObjective[],
  input: PlanProgressInput,
  module: PlanModule,
): ModuleProgress {
  const tasks: PillarTask[] = [];
  let doneCount = 0;
  let requiredDone = 0;
  let requiredTotal = 0;

  for (const obj of objectives) {
    const done = obj.isComplete(input);
    if (done) doneCount += 1;
    if (obj.required) {
      requiredTotal += 1;
      if (done) requiredDone += 1;
    }
    tasks.push({
      id: obj.id,
      title: obj.label,
      columnId: done ? 'plan_done' : 'plan_to_do',
    });
  }

  return {
    module,
    tasks,
    doneCount,
    total: objectives.length,
    requiredDone,
    requiredTotal,
    complete: requiredTotal > 0 ? requiredDone === requiredTotal : true,
  };
}

/** Evaluate the whole Plan stage against the input bag. */
export function evaluatePlan(input: PlanProgressInput): PlanProgress {
  const byModule = {} as Record<PlanModule, ModuleProgress>;
  let doneCount = 0;
  let total = 0;
  let requiredComplete = true;
  const remainingRequired: PlanObjective[] = [];

  for (const module of PLAN_MODULES) {
    const objectives = PLAN_OBJECTIVES[module];
    const progress = evaluateModule(objectives, input, module);
    byModule[module] = progress;
    doneCount += progress.doneCount;
    total += progress.total;
    if (!progress.complete) requiredComplete = false;
    for (const obj of objectives) {
      if (obj.required && !obj.isComplete(input)) remainingRequired.push(obj);
    }
  }

  return {
    byModule,
    overall: {
      doneCount,
      total,
      requiredComplete,
      percent: total > 0 ? Math.round((doneCount / total) * 100) : 0,
      remainingRequired,
    },
  };
}

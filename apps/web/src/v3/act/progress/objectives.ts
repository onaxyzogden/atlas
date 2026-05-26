/**
 * Act-stage objectives engine — pure registry + evaluation.
 *
 * Mirrors `v3/plan/progress/objectives.ts` exactly: each objective is a
 * data-derived predicate over real persisted store data (an "activation
 * event"), so Act progress only advances when the steward actually logs a
 * meaningful execution step. No manual toggles, no React, no store imports —
 * the React/store wiring lives in `useActProgress.ts`, which assembles an
 * `ActProgressInput` bag and calls `evaluateAct` here.
 *
 * Required vs optional: execution is universal — a work item moving to `done`
 * is the one signal every Act module ultimately depends on, so the single
 * *required* objective lives on the `tracker` module (the Plan Execution
 * Tracker). Act is "complete" (the soft Act→Report gate opens) when that
 * required objective is done. Every other module carries *optional* objectives
 * that raise the percentage but never gate.
 *
 * Keep predicates pure so they unit-test exactly like the Plan engine.
 */

import type { PillarTask } from '../../../components/LevelNavigator/LevelNavigator.js';
import { ACT_MODULES, type ActModule } from '../types.js';

/**
 * Plain data bag of counts assembled by `useActProgress` from the per-project
 * slices of each Act-domain store. Every field defaults to 0 so a predicate can
 * be evaluated against a partial bag in tests.
 */
export interface ActProgressInput {
  /** tracker — Plan Execution Tracker: work items at status 'done'. */
  workItemDoneCount: number;

  /** build — phases marked completed, or pilot plots logged. */
  phaseCompletedCount: number;
  pilotCount: number;

  /** maintain — maintenance/operations events logged. */
  maintenanceEventCount: number;

  /** livestock — paddock move events logged. */
  livestockMoveCount: number;

  /** harvest — harvest log entries. */
  harvestEntryCount: number;

  /** review — ongoing SWOT entries or hazard plans. */
  swotCount: number;
  hazardCount: number;

  /** network — CRM contacts or community events. */
  contactCount: number;
  communityEventCount: number;

  /** schedule — appropriate-tech items. */
  appropriateTechCount: number;
}

export const EMPTY_ACT_INPUT: ActProgressInput = {
  workItemDoneCount: 0,
  phaseCompletedCount: 0,
  pilotCount: 0,
  maintenanceEventCount: 0,
  livestockMoveCount: 0,
  harvestEntryCount: 0,
  swotCount: 0,
  hazardCount: 0,
  contactCount: 0,
  communityEventCount: 0,
  appropriateTechCount: 0,
};

export interface ActObjective {
  id: string;
  module: ActModule;
  label: string;
  required: boolean;
  isComplete: (input: ActProgressInput) => boolean;
}

/**
 * Registry. The single required objective lives on `tracker`; every other Act
 * module carries optional objectives (raise % but never gate). Modules with no
 * authoring store this round get an empty list and evaluate complete.
 */
export const ACT_OBJECTIVES: Record<ActModule, ActObjective[]> = {
  'monitoring-records': [
    // ← tracker (required objective lives here)
    {
      id: 'tracker.done',
      module: 'monitoring-records',
      label: 'Complete a planned work item',
      required: true,
      isComplete: (i: ActProgressInput) => i.workItemDoneCount > 0,
    },
    {
      id: 'tracker.momentum',
      module: 'monitoring-records',
      label: 'Complete three work items',
      required: false,
      isComplete: (i: ActProgressInput) => i.workItemDoneCount >= 3,
    },
    // ← review
    {
      id: 'review.assess',
      module: 'monitoring-records',
      label: 'Capture an ongoing SWOT or hazard plan',
      required: false,
      isComplete: (i: ActProgressInput) => i.swotCount > 0 || i.hazardCount > 0,
    },
  ],
  'built-infrastructure': [
    // ← build
    {
      id: 'build.progress',
      module: 'built-infrastructure',
      label: 'Mark a build phase complete or log a pilot plot',
      required: false,
      isComplete: (i: ActProgressInput) =>
        i.phaseCompletedCount > 0 || i.pilotCount > 0,
    },
    // ← maintain
    {
      id: 'maintain.event',
      module: 'built-infrastructure',
      label: 'Log a maintenance or operations event',
      required: false,
      isComplete: (i: ActProgressInput) => i.maintenanceEventCount > 0,
    },
  ],
  'animals-livestock': [
    {
      id: 'livestock.move',
      module: 'animals-livestock',
      label: 'Log a livestock move',
      required: false,
      isComplete: (i: ActProgressInput) => i.livestockMoveCount > 0,
    },
  ],
  'plants-food': [
    {
      id: 'harvest.entry',
      module: 'plants-food',
      label: 'Record a harvest',
      required: false,
      isComplete: (i: ActProgressInput) => i.harvestEntryCount > 0,
    },
  ],
  'people-governance': [
    {
      id: 'network.connect',
      module: 'people-governance',
      label: 'Add a contact or log a community event',
      required: false,
      isComplete: (i: ActProgressInput) =>
        i.contactCount > 0 || i.communityEventCount > 0,
    },
  ],
  'economics-capacity': [
    {
      id: 'schedule.tech',
      module: 'economics-capacity',
      label: 'Register an appropriate-technology item',
      required: false,
      isComplete: (i: ActProgressInput) => i.appropriateTechCount > 0,
    },
  ],
  // Unauthored domains — empty, evaluate complete.
  climate: [],
  'vision-intent': [],
  'land-base': [],
  topography: [],
  hydrology: [],
  soil: [],
  ecology: [],
  'access-circulation': [],
  'energy-resources': [],
  'risk-compliance': [],
};

export interface ModuleProgress {
  module: ActModule;
  tasks: PillarTask[];
  doneCount: number;
  total: number;
  requiredDone: number;
  requiredTotal: number;
  /** True when every *required* objective in this module is complete. */
  complete: boolean;
}

export interface ActOverall {
  doneCount: number;
  total: number;
  /** True when every required objective across all modules is complete. */
  requiredComplete: boolean;
  /** 0–100, all objectives (required + optional) weighted equally. */
  percent: number;
  /** Required objectives still incomplete, flattened across modules. */
  remainingRequired: ActObjective[];
}

export interface ActProgress {
  byModule: Record<ActModule, ModuleProgress>;
  overall: ActOverall;
}

/** Evaluate a single module's objectives against the input bag. */
export function evaluateModule(
  objectives: ActObjective[],
  input: ActProgressInput,
  module: ActModule,
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
      columnId: done ? 'act_done' : 'act_to_do',
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

/** Evaluate the whole Act stage against the input bag. */
export function evaluateAct(input: ActProgressInput): ActProgress {
  const byModule = {} as Record<ActModule, ModuleProgress>;
  let doneCount = 0;
  let total = 0;
  let requiredComplete = true;
  const remainingRequired: ActObjective[] = [];

  for (const module of ACT_MODULES) {
    const objectives = ACT_OBJECTIVES[module];
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

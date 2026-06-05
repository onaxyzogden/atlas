/**
 * Observe-stage objectives engine — pure registry + evaluation.
 *
 * Each objective is a data-derived predicate over real persisted store data
 * (an "activation event"): progress only advances when the steward actually
 * completes a meaningful step. No manual toggles, no React, no store imports —
 * the React/store wiring lives in `useObserveProgress.ts`, which assembles an
 * `ObserveProgressInput` bag and calls `evaluateObserve` here.
 *
 * Required vs optional: each module declares 1+ *required* objectives; Observe
 * is "complete" (the soft Plan gate opens) when every required objective across
 * all modules is done. Optional objectives raise the percentage but never gate.
 *
 * Keep predicates pure so they unit-test exactly like the existing
 * `modules/**\/derivations.ts` + `__tests__/derivations.test.ts`.
 */

import type { PillarTask } from '../../../components/LevelNavigator/LevelNavigator.js';
import { OBSERVE_MODULES, type ObserveModule } from '../types.js';

/**
 * Plain data bag of counts/flags assembled by `useObserveProgress` from the
 * per-project slices of each annotation store. Every field defaults to 0 /
 * false so a predicate can be evaluated against a partial bag in tests.
 */
export interface ObserveProgressInput {
  /** human-context */
  hasBoundary: boolean;
  homesteadPinned: boolean;

  /** built-environment */
  builtFeatureCount: number;

  /** macroclimate-hazards */
  hazardCount: number;
  sectorCount: number;

  /** topography */
  contourCount: number;
  highPointCount: number;
  transectCount: number;

  /** earth-water-ecology */
  earthworkCount: number;
  waterLineCount: number;
  soilSampleCount: number;
  ecologyObsCount: number;

  /** sectors-zones */
  zoneCount: number;
  patchCount: number;

  /** swot-synthesis */
  swotCount: number;
  swotBucketsCovered: number;
}

export const EMPTY_OBSERVE_INPUT: ObserveProgressInput = {
  hasBoundary: false,
  homesteadPinned: false,
  builtFeatureCount: 0,
  hazardCount: 0,
  sectorCount: 0,
  contourCount: 0,
  highPointCount: 0,
  transectCount: 0,
  earthworkCount: 0,
  waterLineCount: 0,
  soilSampleCount: 0,
  ecologyObsCount: 0,
  zoneCount: 0,
  patchCount: 0,
  swotCount: 0,
  swotBucketsCovered: 0,
};

export interface ObserveObjective {
  id: string;
  module: ObserveModule;
  label: string;
  required: boolean;
  isComplete: (input: ObserveProgressInput) => boolean;
}

/**
 * Registry. Each module gets exactly one required objective (the essential
 * activation event that gates Plan) plus a few optional objectives that raise
 * the completion percentage without gating.
 */
export const OBSERVE_OBJECTIVES: Record<ObserveModule, ObserveObjective[]> = {
  'people-governance': [
    {
      id: 'human-context.boundary',
      module: 'people-governance',
      label: 'Draw the property boundary',
      required: true,
      isComplete: (i) => i.hasBoundary,
    },
    {
      id: 'human-context.homestead',
      module: 'people-governance',
      label: 'Pin the homestead / activity hub',
      required: false,
      isComplete: (i) => i.homesteadPinned,
    },
  ],
  'built-infrastructure': [
    {
      id: 'built-environment.feature',
      module: 'built-infrastructure',
      label: 'Place at least one built feature',
      required: true,
      isComplete: (i) => i.builtFeatureCount > 0,
    },
    {
      id: 'built-environment.three',
      module: 'built-infrastructure',
      label: 'Map three or more built features',
      required: false,
      isComplete: (i) => i.builtFeatureCount >= 3,
    },
  ],
  'climate': [
    {
      id: 'macroclimate-hazards.force',
      module: 'climate',
      label: 'Record a hazard or sector force',
      required: true,
      isComplete: (i) => i.hazardCount > 0 || i.sectorCount > 0,
    },
    {
      id: 'macroclimate-hazards.hazard',
      module: 'climate',
      label: 'Log a hazard event',
      required: false,
      isComplete: (i) => i.hazardCount > 0,
    },
    {
      id: 'macroclimate-hazards.sector',
      module: 'climate',
      label: 'Draw a sector arrow',
      required: false,
      isComplete: (i) => i.sectorCount > 0,
    },
  ],
  topography: [
    {
      id: 'topography.landform',
      module: 'topography',
      label: 'Mark a contour or high/low point',
      required: true,
      isComplete: (i) => i.contourCount > 0 || i.highPointCount > 0,
    },
    {
      id: 'topography.transect',
      module: 'topography',
      label: 'Sample an A–B transect',
      required: false,
      isComplete: (i) => i.transectCount > 0,
    },
  ],
  'hydrology': [
    {
      id: 'earth-water-ecology.observation',
      module: 'hydrology',
      label: 'Record an earthwork, water line, soil sample, or ecology obs',
      required: true,
      isComplete: (i) =>
        i.earthworkCount > 0 ||
        i.waterLineCount > 0 ||
        i.soilSampleCount > 0 ||
        i.ecologyObsCount > 0,
    },
    {
      id: 'earth-water-ecology.water',
      module: 'hydrology',
      label: 'Map existing water (earthwork or watercourse)',
      required: false,
      isComplete: (i) => i.earthworkCount > 0 || i.waterLineCount > 0,
    },
    {
      id: 'earth-water-ecology.soil',
      module: 'hydrology',
      label: 'Capture a soil sample',
      required: false,
      isComplete: (i) => i.soilSampleCount > 0,
    },
  ],
  'access-circulation': [
    {
      id: 'sectors-zones.zone',
      module: 'access-circulation',
      label: 'Outline a zone or vegetation patch',
      required: true,
      isComplete: (i) => i.zoneCount > 0 || i.patchCount > 0,
    },
    {
      id: 'sectors-zones.sector',
      module: 'access-circulation',
      label: 'Add a sector arrow',
      required: false,
      isComplete: (i) => i.sectorCount > 0,
    },
  ],
  'monitoring-records': [
    {
      id: 'swot-synthesis.entry',
      module: 'monitoring-records',
      label: 'Capture a SWOT entry',
      required: true,
      isComplete: (i) => i.swotCount > 0,
    },
    {
      id: 'swot-synthesis.buckets',
      module: 'monitoring-records',
      label: 'Cover all four SWOT buckets',
      required: false,
      isComplete: (i) => i.swotBucketsCovered >= 4,
    },
  ],
  // Unauthored Observe domains — empty objective lists.
  'vision-intent': [],
  'land-base': [],
  soil: [],
  ecology: [],
  'plants-food': [],
  'animals-livestock': [],
  'energy-resources': [],
  'economics-capacity': [],
  'risk-compliance': [],
};

export interface ModuleProgress {
  module: ObserveModule;
  tasks: PillarTask[];
  doneCount: number;
  total: number;
  requiredDone: number;
  requiredTotal: number;
  /** True when every *required* objective in this module is complete. */
  complete: boolean;
}

export interface ObserveOverall {
  doneCount: number;
  total: number;
  /** True when every required objective across all modules is complete. */
  requiredComplete: boolean;
  /** 0–100, all objectives (required + optional) weighted equally. */
  percent: number;
  /** Required objectives still incomplete, flattened across modules. */
  remainingRequired: ObserveObjective[];
}

export interface ObserveProgress {
  byModule: Record<ObserveModule, ModuleProgress>;
  overall: ObserveOverall;
}

/** Evaluate a single module's objectives against the input bag. */
export function evaluateModule(
  objectives: ObserveObjective[],
  input: ObserveProgressInput,
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
      columnId: done ? 'observe_done' : 'observe_to_do',
    });
  }

  return {
    module: objectives[0]?.module ?? 'people-governance',
    tasks,
    doneCount,
    total: objectives.length,
    requiredDone,
    requiredTotal,
    complete: requiredTotal > 0 ? requiredDone === requiredTotal : true,
  };
}

/** Evaluate the whole Observe stage against the input bag. */
export function evaluateObserve(input: ObserveProgressInput): ObserveProgress {
  const byModule = {} as Record<ObserveModule, ModuleProgress>;
  let doneCount = 0;
  let total = 0;
  let requiredComplete = true;
  const remainingRequired: ObserveObjective[] = [];

  for (const module of OBSERVE_MODULES) {
    const objectives = OBSERVE_OBJECTIVES[module];
    const progress = evaluateModule(objectives, input);
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

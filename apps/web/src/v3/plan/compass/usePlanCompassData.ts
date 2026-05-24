/**
 * usePlanCompassData — reactive view-model for the Plan Stage Compass.
 *
 * Mirrors useCompassData (Observe): joins the Plan evidence store
 * (usePlanCompassStore) with the live checklist store (usePlanHowChecksStore)
 * and the static Plan config, then derives node states + progress for every
 * objective in one pass — so the wheel can render all objectives without
 * violating the rules of hooks.
 */

import { useMemo } from 'react';
import { usePlanCompassStore, planSeedFor } from '../../../store/planCompassStore.js';
import { usePlanHowChecksStore } from '../../../store/planHowChecksStore.js';
import type { PlanModule } from '../types.js';
import { PLAN_COMPASS_OBJECTIVES } from './planCompassConfig.js';
import {
  aggregateProgress,
  objectiveProgress,
  resolveNodeStates,
} from '../../compass/compassGating.js';
import type { ObjectiveView, CompassData } from '../../compass/compassTypes.js';

const EMPTY_CHECKS: readonly number[] = [];

export function usePlanCompassData(projectId: string): CompassData {
  const evidence = usePlanCompassStore((s) => s.byProject[projectId]);
  const checks = usePlanHowChecksStore((s) => s.byProject[projectId]);

  return useMemo(() => {
    const views: ObjectiveView[] = PLAN_COMPASS_OBJECTIVES.map((objective) => {
      // The shared CompassObjective.id is a plain string; in this Plan-only
      // hook every id is a concrete PlanModule (the config is built from
      // PLAN_MODULES), so narrowing back is sound.
      const id = objective.id as PlanModule;
      const raw = evidence?.[id] ?? planSeedFor(id);
      const checked = checks?.[id] ?? EMPTY_CHECKS;
      const count = objective.nodes.length;
      return {
        objective,
        states: resolveNodeStates(count, raw, checked),
        progress: objectiveProgress(count, raw, checked),
      };
    });
    const byId = views.reduce(
      (acc, v) => {
        acc[v.objective.id] = v;
        return acc;
      },
      {} as Record<string, ObjectiveView>,
    );
    const stage = aggregateProgress(views.map((v) => v.progress));
    return { views, byId, stage };
  }, [evidence, checks]);
}

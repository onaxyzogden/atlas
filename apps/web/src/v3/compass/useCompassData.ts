/**
 * useCompassData — reactive view-model for the Stage Compass.
 *
 * Joins the evidence store (observeCompassStore) with the live checklist store
 * (observeHowChecksStore) and the static config, then derives node states +
 * progress for every objective in one pass — so the wheel can render all
 * objectives without violating the rules of hooks.
 */

import { useMemo } from 'react';
import { useObserveCompassStore, seedFor } from '../../store/observeCompassStore.js';
import { useObserveHowChecksStore } from '../../store/observeHowChecksStore.js';
import { useGoalTreeStore } from '../../store/goalTreeStore.js';
import type { ObserveModule } from '../observe/types.js';
import {
  OBSERVE_COMPASS_OBJECTIVES,
  objectivesForArchetype,
} from './observeCompassConfig.js';
import {
  aggregateProgress,
  objectiveProgress,
  resolveNodeStates,
  type ObjectiveProgress,
} from './compassGating.js';
import type { ObjectiveView, CompassData } from './compassTypes.js';

// Re-export the shared view-model shapes so existing importers keep working.
export type { ObjectiveView, CompassData } from './compassTypes.js';

const EMPTY_CHECKS: readonly number[] = [];

export function useCompassData(projectId: string): CompassData {
  const evidence = useObserveCompassStore((s) => s.byProject[projectId]);
  const checks = useObserveHowChecksStore((s) => s.byProject[projectId]);
  const archetype = useGoalTreeStore(
    (s) => s.goalTreesByProject[projectId]?.archetype ?? null,
  );

  return useMemo(() => {
    const objectives = objectivesForArchetype(archetype);
    const views: ObjectiveView[] = objectives.map((objective) => {
      // The shared CompassObjective.id is a plain string; in this Observe-only
      // hook every id is a concrete ObserveModule (the config is built from
      // OBSERVE_MODULES), so narrowing back is sound.
      const id = objective.id as ObserveModule;
      const raw = evidence?.[id] ?? seedFor(id);
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
  }, [evidence, checks, archetype]);
}

/** Single-objective progress (used by the in-map return-to-compass prompt). */
export function useObjectiveProgress(
  projectId: string,
  module: ObserveModule | null,
): ObjectiveProgress | null {
  const evidence = useObserveCompassStore((s) =>
    module ? s.byProject[projectId]?.[module] : undefined,
  );
  const checks = useObserveHowChecksStore((s) =>
    module ? s.byProject[projectId]?.[module] : undefined,
  );
  return useMemo(() => {
    if (!module) return null;
    const obj = OBSERVE_COMPASS_OBJECTIVES.find((o) => o.id === module);
    if (!obj) return null;
    const raw = evidence ?? seedFor(module);
    const checked = checks ?? EMPTY_CHECKS;
    return objectiveProgress(obj.nodes.length, raw, checked);
  }, [module, evidence, checks]);
}

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
import type { ObserveModule } from '../observe/types.js';
import {
  OBSERVE_COMPASS_OBJECTIVES,
  type CompassObjective,
} from './observeCompassConfig.js';
import {
  aggregateProgress,
  objectiveProgress,
  resolveNodeStates,
  type NodeState,
  type ObjectiveProgress,
} from './compassGating.js';

const EMPTY_CHECKS: readonly number[] = [];

export interface ObjectiveView {
  objective: CompassObjective;
  states: NodeState[];
  progress: ObjectiveProgress;
}

export interface CompassData {
  views: ObjectiveView[];
  byId: Record<ObserveModule, ObjectiveView>;
  stage: ObjectiveProgress;
}

export function useCompassData(projectId: string): CompassData {
  const evidence = useObserveCompassStore((s) => s.byProject[projectId]);
  const checks = useObserveHowChecksStore((s) => s.byProject[projectId]);

  return useMemo(() => {
    const views: ObjectiveView[] = OBSERVE_COMPASS_OBJECTIVES.map((objective) => {
      const raw = evidence?.[objective.id] ?? seedFor(objective.id);
      const checked = checks?.[objective.id] ?? EMPTY_CHECKS;
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
      {} as Record<ObserveModule, ObjectiveView>,
    );
    const stage = aggregateProgress(views.map((v) => v.progress));
    return { views, byId, stage };
  }, [evidence, checks]);
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

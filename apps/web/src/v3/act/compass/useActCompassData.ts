/**
 * useActCompassData — reactive view-model for the Act Stage Compass.
 *
 * Mirrors usePlanCompassData / useCompassData: joins the Act evidence store
 * (useActCompassStore) with the live checklist store (useActHowChecksStore)
 * and the static Act config, then derives node states + progress for every
 * objective in one pass — so the wheel can render all objectives without
 * violating the rules of hooks.
 */

import { useMemo } from 'react';
import { useActCompassStore, actSeedFor } from '../../../store/actCompassStore.js';
import { useActHowChecksStore } from '../../../store/actHowChecksStore.js';
import type { ActModule } from '../types.js';
import { ACT_COMPASS_OBJECTIVES } from './actCompassConfig.js';
import {
  aggregateProgress,
  objectiveProgress,
  resolveNodeStates,
} from '../../compass/compassGating.js';
import type { ObjectiveView, CompassData } from '../../compass/compassTypes.js';

const EMPTY_CHECKS: readonly number[] = [];

export function useActCompassData(projectId: string): CompassData {
  const evidence = useActCompassStore((s) => s.byProject[projectId]);
  const checks = useActHowChecksStore((s) => s.byProject[projectId]);

  return useMemo(() => {
    const views: ObjectiveView[] = ACT_COMPASS_OBJECTIVES.map((objective) => {
      // The shared CompassObjective.id is a plain string; in this Act-only hook
      // every id is a concrete ActModule (the config is built from ACT_MODULES),
      // so narrowing back is sound.
      const id = objective.id as ActModule;
      const raw = evidence?.[id] ?? actSeedFor(id);
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

/**
 * useObservationNeeds — joins the static seed catalog with the persisted run
 * store into ready-to-render view models, scoped to one project. One place for
 * the Command Centre panels, the map markers, and the Capture Workspace to read
 * observation needs so they stay consistent.
 */

import { useMemo } from 'react';
import { useObservationNeedStore } from '../../store/fieldObjectiveStore.js';
import { seedObservationNeedsForProject } from './seedObjectives.js';
import {
  emptyObservationNeedRun,
  evaluateObservationRecorded,
  type RecordingEvaluation,
  type ObservationNeed,
  type ObservationNeedRun,
} from './fieldObjective.js';

export interface ObservationNeedView {
  objective: ObservationNeed;
  run: ObservationNeedRun;
  evaluation: RecordingEvaluation;
}

/** All needs for a project, each with its live run + recording eval. */
export function useObservationNeeds(projectId: string): ObservationNeedView[] {
  const runs = useObservationNeedStore((s) => s.byProject[projectId]);
  return useMemo(() => {
    const catalog = seedObservationNeedsForProject(projectId);
    return catalog.map((objective) => {
      const run = runs?.[objective.id] ?? emptyObservationNeedRun();
      return {
        objective,
        run,
        evaluation: evaluateObservationRecorded(objective, run),
      };
    });
  }, [projectId, runs]);
}

/** One need view by id, or null when the id is unknown. */
export function useObservationNeed(
  projectId: string,
  needId: string | null | undefined,
): ObservationNeedView | null {
  const views = useObservationNeeds(projectId);
  return useMemo(() => {
    if (!needId) return null;
    return views.find((v) => v.objective.id === needId) ?? null;
  }, [views, needId]);
}

/**
 * useFieldObjectives — joins the static seed catalog with the persisted run
 * store into ready-to-render view models, scoped to one project. One place
 * for the Command Centre panels, the map markers, and Objective Focus Mode to
 * read objectives so they stay consistent.
 */

import { useMemo } from 'react';
import { useFieldObjectiveStore } from '../../store/fieldObjectiveStore.js';
import { seedObjectivesForProject } from './seedObjectives.js';
import {
  emptyObjectiveRun,
  evaluateObjectiveCompletion,
  type CompletionEvaluation,
  type FieldObjective,
  type ObjectiveRun,
} from './fieldObjective.js';

export interface FieldObjectiveView {
  objective: FieldObjective;
  run: ObjectiveRun;
  evaluation: CompletionEvaluation;
}

/** All objectives for a project, each with its live run + completion eval. */
export function useFieldObjectives(projectId: string): FieldObjectiveView[] {
  const runs = useFieldObjectiveStore((s) => s.byProject[projectId]);
  return useMemo(() => {
    const catalog = seedObjectivesForProject(projectId);
    return catalog.map((objective) => {
      const run = runs?.[objective.id] ?? emptyObjectiveRun();
      return {
        objective,
        run,
        evaluation: evaluateObjectiveCompletion(objective, run),
      };
    });
  }, [projectId, runs]);
}

/** One objective view by id, or null when the id is unknown. */
export function useFieldObjective(
  projectId: string,
  objectiveId: string | null | undefined,
): FieldObjectiveView | null {
  const views = useFieldObjectives(projectId);
  return useMemo(() => {
    if (!objectiveId) return null;
    return views.find((v) => v.objective.id === objectiveId) ?? null;
  }, [views, objectiveId]);
}

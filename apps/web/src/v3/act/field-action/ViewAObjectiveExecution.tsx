/**
 * ViewAObjectiveExecution — orchestrates the per-objective execution
 * surface per OLOS Act Command Center Spec v1 §5.2. Composes:
 *   1. ActObjectiveHeader   (title + tier + status + back-to-View-B)
 *   2. ActMapStrip          (overlay chips + open map view CTA)
 *   3. ActTaskList          (sequenced task rows with active expanded)
 *   4. ActObjectiveCompletionGate (greyed until all tasks verified)
 *   5. ActMapView           (full-screen map overlay, toggled on)
 *
 * Per spec §5.4.1 View A and the Act map view ship as a single unit —
 * the map overlay is rendered inline here so the route doesn't fork.
 *
 * Task selection: when the URL carries `?taskId=X` we default the active
 * task to that id (matches the FieldActionCard navigation in View B).
 * Otherwise we pick the priority winner (in_progress > submitted > the
 * first task in the list) so the right task is expanded on open.
 */

import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  computeAllObjectiveStatuses,
  findPlanStratumObjectiveIn,
  type FieldAction,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
} from '@ogden/shared';
import {
  selectFieldActionsForProject,
  useFieldActionStore,
} from '../../../store/fieldActionStore.js';
import {
  usePlanTierProgressStore,
  selectProjectProgress,
  toProgressMap,
} from '../../../store/planTierStore.js';
import ActObjectiveHeader from './ActObjectiveHeader.js';
import ActMapStrip from './ActMapStrip.js';
import ActTaskList from './ActTaskList.js';
import ActObjectiveCompletionGate from './ActObjectiveCompletionGate.js';
import ActMapView from './ActMapView.js';
import { useProjectObjectives } from '../../plan/tiers/useProjectObjectives.js';
import css from './ViewAObjectiveExecution.module.css';

interface Props {
  projectId: string;
  objectiveId: string;
}

function pickInitialTaskId(
  tasks: ReadonlyArray<FieldAction>,
  paramTaskId: string | undefined,
): string | null {
  if (paramTaskId && tasks.some((t) => t.id === paramTaskId)) {
    return paramTaskId;
  }
  const inProgress = tasks.find((t) => t.status === 'in_progress');
  if (inProgress) return inProgress.id;
  const pendingReview = tasks.find(
    (t) => t.status === 'submitted' && t.verificationMode === 'review',
  );
  if (pendingReview) return pendingReview.id;
  return tasks[0]?.id ?? null;
}

function useObjectiveStatus(
  objective: PlanStratumObjective | undefined,
  objectives: readonly PlanStratumObjective[],
  projectId: string,
): PlanStratumObjectiveStatus {
  // Mirror Plan tier's status computation so the View A header shows the
  // same status pill the Plan tier surface shows. The full status map is
  // derived from the project's resolved objective set + the steward's flat
  // checklist progress so prereq satisfaction is honoured topologically — no
  // optimistic approximation that would falsely flip a locked objective
  // to available.
  const byObjective = usePlanTierProgressStore((s) =>
    selectProjectProgress(s, projectId),
  );
  return useMemo<PlanStratumObjectiveStatus>(() => {
    if (!objective) return 'locked';
    const progress = toProgressMap(byObjective);
    const statuses = computeAllObjectiveStatuses(objectives, progress);
    return statuses[objective.id] ?? 'locked';
  }, [objective, objectives, byObjective]);
}

export default function ViewAObjectiveExecution({ projectId, objectiveId }: Props) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { taskId?: string };

  // Sub-slice D - resolve the objective against THIS project's set, not the
  // global static skeleton, so per-type primary/secondary objectives execute.
  const { objectives } = useProjectObjectives(projectId);

  const objective = useMemo<PlanStratumObjective | undefined>(
    () => findPlanStratumObjectiveIn(objectives, objectiveId),
    [objectives, objectiveId],
  );

  const allTasks = useFieldActionStore((s) =>
    selectFieldActionsForProject(s, projectId),
  );

  const tasks = useMemo<FieldAction[]>(
    () =>
      allTasks
        .filter((t) => t.planObjectiveId === objectiveId)
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [allTasks, objectiveId],
  );

  const [activeTaskId, setActiveTaskId] = useState<string | null>(() =>
    pickInitialTaskId(tasks, search?.taskId),
  );
  const [mapOpen, setMapOpen] = useState(false);

  const status = useObjectiveStatus(objective, objectives, projectId);

  const handleBack = useCallback(() => {
    navigate({
      to: '/v3/project/$projectId/act/field-action',
      params: { projectId },
    });
  }, [navigate, projectId]);

  if (!objective) {
    return (
      <div className={css.scroll}>
        <div className={css.missing}>
          <strong>Objective not found</strong>
          The objective <code>{objectiveId}</code> is not in this project's
          Plan stratum objectives. Return to the dashboard and pick a task from a
          valid objective.
          <div style={{ marginTop: 10 }}>
            <button type="button" onClick={handleBack}>
              Back to all tasks
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;

  return (
    <div className={css.scroll}>
      <div className={css.body}>
        <ActObjectiveHeader
          objective={objective}
          status={status}
          onBack={handleBack}
        />
        <ActMapStrip
          bundle={objective.defaultOverlayBundle}
          onOpenMapView={() => setMapOpen(true)}
        />
        <ActTaskList
          projectId={projectId}
          tasks={tasks}
          activeTaskId={activeTaskId}
          onSelectTask={setActiveTaskId}
        />
        <ActObjectiveCompletionGate tasks={tasks} />
      </div>
      {mapOpen && (
        <ActMapView
          projectId={projectId}
          objective={objective}
          action={activeTask}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
}

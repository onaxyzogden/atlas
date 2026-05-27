/**
 * ActFieldActionLayout — host for the OLOS Act Command Center field-action
 * surfaces. Renders ViewBDashboard (All Tasks) when no objective is in the
 * route, or a placeholder for View A (Objective Execution) when an
 * objectiveId is present. Slice 3.3 swaps the placeholder for the real
 * ViewAObjectiveExecution + Act Map View.
 *
 * Mirrors PlanTierShell's role for the Plan stage: an early-return shell
 * mounted by `ActLayout` when `actShellMode === 'field-action'`. The
 * `ActShellToggle` overlay lets the steward flip back to the legacy
 * command-centre module shell at any time.
 */

import { useParams } from '@tanstack/react-router';
import { useProjectStore, MTC_SEED, type ActShellMode } from '../../../store/projectStore.js';
import { useMemo } from 'react';
import ActShellToggle from './ActShellToggle.js';
import ViewBDashboard from './ViewBDashboard.js';
import ViewAObjectivePlaceholder from './ViewAObjectivePlaceholder.js';
import css from './ActFieldActionLayout.module.css';

interface Props {
  shellMode: ActShellMode;
  onShellModeChange: (mode: ActShellMode) => void;
}

export default function ActFieldActionLayout({ shellMode, onShellModeChange }: Props) {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    objectiveId?: string;
  };

  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(
    () =>
      projects.find((p) => p.id === params.projectId || p.serverId === params.projectId) ??
      MTC_SEED,
    [projects, params.projectId],
  );

  const projectId = project.id;
  const objectiveId = params.objectiveId ?? null;

  return (
    <div className={css.wrap}>
      <div className={css.body}>
        {objectiveId ? (
          <ViewAObjectivePlaceholder projectId={projectId} objectiveId={objectiveId} />
        ) : (
          <ViewBDashboard projectId={projectId} />
        )}
      </div>
      <ActShellToggle mode={shellMode} onChange={onShellModeChange} />
    </div>
  );
}

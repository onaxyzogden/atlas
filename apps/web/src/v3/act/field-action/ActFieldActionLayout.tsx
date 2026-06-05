/**
 * ActFieldActionLayout — host for the OLOS Act Command Center field-action
 * surfaces. Renders ViewBDashboard (All Tasks) when no objective is in the
 * route, or ViewAObjectiveExecution (objective-scoped task list + inline
 * Act Map View, per spec §5.4.1 "View A and the Act map view ship as a
 * single unit") when an objectiveId is present.
 *
 * Mirrors PlanStratumShell's role for the Plan stage: an early-return shell
 * mounted by `ActLayout` when `actShellMode === 'field-action'`. The
 * `ActShellToggle` overlay lets the steward flip back to the legacy
 * command-centre module shell at any time.
 */

import { useParams } from '@tanstack/react-router';
import { useProjectStore, MTC_SEED, type ActShellMode } from '../../../store/projectStore.js';
import { useMemo } from 'react';
import ActShellToggle from './ActShellToggle.js';
import ViewBDashboard from './ViewBDashboard.js';
import ViewAObjectiveExecution from './ViewAObjectiveExecution.js';
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
          <ViewAObjectiveExecution projectId={projectId} objectiveId={objectiveId} />
        ) : (
          <ViewBDashboard projectId={projectId} />
        )}
      </div>
      <ActShellToggle mode={shellMode} onChange={onShellModeChange} />
    </div>
  );
}

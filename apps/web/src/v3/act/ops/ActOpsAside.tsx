/**
 * ActOpsAside — operations dashboard for the Act stage right rail.
 *
 * Replaces the previous GuidanceCard checklist surface with a 4-panel
 * dashboard inspired by the Operations Hub mockup: today's priorities,
 * alerts (or recent harvests when Harvest is active), upcoming events,
 * and quick-action CTAs.
 *
 * Module-aware: each panel filters its content to the active module
 * when one is selected; otherwise shows an aggregated all-domain view.
 */

import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import type { ActModule } from '../types.js';
import { useV3Project } from '../../data/useV3Project.js';
import CreateFieldTaskDialog from '../../components/CreateFieldTaskDialog.js';
import LogObservationDialog from '../../components/LogObservationDialog.js';
import TodaysPriorities from './TodaysPriorities.js';
import AlertsPanel from './AlertsPanel.js';
import UpcomingEvents from './UpcomingEvents.js';
import QuickActions from './QuickActions.js';
import css from './ActOpsAside.module.css';

interface Props {
  activeModule: ActModule | null;
  onSelectModule: (module: ActModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

const FALLBACK_CENTER: [number, number] = [-78.20, 44.50];

export default function ActOpsAside({ activeModule }: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;
  const project = useV3Project(projectId ?? undefined);

  const [taskOpen, setTaskOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  return (
    <div
      className={css.aside}
      data-active-module={activeModule ?? 'all'}
    >
      <TodaysPriorities projectId={projectId} activeModule={activeModule} />
      <AlertsPanel projectId={projectId} activeModule={activeModule} />
      <UpcomingEvents projectId={projectId} />
      <QuickActions
        disabled={!projectId || !project}
        onCreateTask={() => setTaskOpen(true)}
        onLogObservation={() => setLogOpen(true)}
      />

      {taskOpen && project && (
        <CreateFieldTaskDialog
          projectId={project.id}
          boundary={project.location.boundary}
          fallbackCenter={FALLBACK_CENTER}
          onClose={() => setTaskOpen(false)}
        />
      )}

      {logOpen && project && (
        <LogObservationDialog
          projectId={project.id}
          boundary={project.location.boundary}
          fallbackCenter={FALLBACK_CENTER}
          onClose={() => setLogOpen(false)}
        />
      )}
    </div>
  );
}

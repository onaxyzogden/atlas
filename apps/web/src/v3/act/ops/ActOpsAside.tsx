/**
 * ActOpsAside — operations dashboard for the Act stage right rail.
 *
 * Five stacked panels (weather, today's priorities, alerts, upcoming
 * events, quick actions). Weather and Upcoming Events deep-link into
 * the schedule slide-up so the operator can drill from the rail summary
 * into the full forecast or month grid without losing the map view.
 *
 * Module-aware: panels that filter on the active module receive it via
 * prop; the rail itself keeps a stable layout regardless of selection.
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
import WeatherStrip from './WeatherStrip.js';
import css from './ActOpsAside.module.css';

interface Props {
  activeModule: ActModule | null;
  onSelectModule: (module: ActModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

const FALLBACK_CENTER: [number, number] = [-78.20, 44.50];

export default function ActOpsAside({
  activeModule,
  onSelectModule,
  onOpenSlideUp,
}: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;
  const project = useV3Project(projectId ?? undefined);

  const [taskOpen, setTaskOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const openSchedule = () => {
    onSelectModule('schedule');
    onOpenSlideUp();
  };

  return (
    <div
      className={css.aside}
      data-active-module={activeModule ?? 'all'}
    >
      <WeatherStrip projectId={projectId} onOpen={openSchedule} />
      <TodaysPriorities projectId={projectId} activeModule={activeModule} />
      <AlertsPanel projectId={projectId} activeModule={activeModule} />
      <UpcomingEvents projectId={projectId} onOpenSchedule={openSchedule} />
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

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

import { useParams } from '@tanstack/react-router';
import type { ActModule } from '../types.js';
import TodaysPriorities from './TodaysPriorities.js';
import AlertsPanel from './AlertsPanel.js';
import UpcomingEvents from './UpcomingEvents.js';
import WeatherStrip from './WeatherStrip.js';
import css from './ActOpsAside.module.css';

interface Props {
  activeModule: ActModule | null;
  onSelectModule: (module: ActModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

export default function ActOpsAside({
  activeModule,
  onSelectModule,
  onOpenSlideUp,
}: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;

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
    </div>
  );
}

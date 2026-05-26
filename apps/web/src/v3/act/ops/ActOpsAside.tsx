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
 *
 * 2026-05-24 — Stage Compass focus (Goal 6, mirrors Observe/Plan): with no
 * objective selected, the rail shows a quiet prompt back to the Act Compass
 * instead of the full ops dashboard. With an objective active, the
 * module-filtered panels (Today's Priorities, Alerts) scope to it; WeatherStrip
 * stays on as ambient field context. No panels are removed — only gated.
 */

import { useNavigate, useParams } from '@tanstack/react-router';
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
  const navigate = useNavigate();

  const openSchedule = () => {
    onSelectModule('economics-capacity');
    onOpenSlideUp();
  };

  // 2026-05-24 — Stage Compass focus: with no objective selected, show a quiet
  // prompt back to the Act compass instead of the full ops dashboard. Mirrors
  // ObserveChecklistAside / PlanChecklistAside.
  if (activeModule === null) {
    return (
      <div className={css.aside} data-active-module="all">
        <div className={css.emptyPrompt}>
          <p className={css.emptyText}>No objective selected.</p>
          <p className={css.emptyHint}>
            Pick one from the module bar below, or open the Act Compass to
            choose your next objective.
          </p>
          {projectId && (
            <button
              type="button"
              className={css.compassLink}
              onClick={() =>
                navigate({
                  to: '/v3/project/$projectId/act/compass',
                  params: { projectId },
                })
              }
            >
              Open Act Compass
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={css.aside}
      data-active-module={activeModule}
    >
      <WeatherStrip projectId={projectId} onOpen={openSchedule} />
      <TodaysPriorities projectId={projectId} activeModule={activeModule} />
      <AlertsPanel projectId={projectId} activeModule={activeModule} />
      <UpcomingEvents projectId={projectId} onOpenSchedule={openSchedule} />
    </div>
  );
}

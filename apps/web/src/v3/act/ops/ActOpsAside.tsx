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

import { useParams } from '@tanstack/react-router';
import type { ActModule } from '../types.js';
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

export default function ActOpsAside({
  activeModule,
  onSelectModule,
  onOpenSlideUp,
}: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;

  return (
    <div
      className={css.aside}
      data-active-module={activeModule ?? 'all'}
    >
      <TodaysPriorities projectId={projectId} activeModule={activeModule} />
      <AlertsPanel projectId={projectId} activeModule={activeModule} />
      <UpcomingEvents projectId={projectId} />
      <QuickActions
        disabled={!projectId}
        onSelectModule={onSelectModule}
        onOpenSlideUp={onOpenSlideUp}
      />
    </div>
  );
}

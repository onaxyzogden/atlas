// ActOpsDashboard.tsx
//
// Field-action right-rail dashboard mode. Stacks the four production-wired Act
// ops cards (Weather / Today's Priorities / Alerts / Upcoming Events) directly,
// rather than the all-tasks list (ViewBDashboard) or ActOpsAside (which hides
// the dashboard unless a module is active). Each card owns its own .panel
// surface and empty state.
//
// This is the permanent equivalent of the prototype-only ActProtoDashboard:
// same composition, but mounted on the live field-action surface and slated to
// outlive the tier-prototype folder.

import { useTriggeredProtocols } from '../../../store/protocolStore.js';
import ActWorkSummaryCard from '../tier-shell/work/ActWorkSummaryCard.js';
import WeatherStrip from '../ops/WeatherStrip.js';
import TodaysPriorities from '../ops/TodaysPriorities.js';
import AlertsPanel from '../ops/AlertsPanel.js';
import UpcomingEvents from '../ops/UpcomingEvents.js';
import TriggeredProtocolsPanel from '../ops/TriggeredProtocolsPanel.js';
import styles from './ActOpsDashboard.module.css';

interface Props {
  projectId: string | null;
  /** Open the full weather forecast. In the tier-shell this swaps the right
   *  rail to ActTierWeatherPanel; mounts without a target (e.g. map-first) omit
   *  it and the weather buttons stay inert. */
  onOpenWeather?: () => void;
  /** Open the livestock work schedule (ActWorkPanel). Same convention as
   *  onOpenWeather — omitted on mounts without a rail target. */
  onOpenWork?: () => void;
}

function noop() {
  /* no external open hook supplied (e.g. map-first mount has no rail target) */
}

export default function ActOpsDashboard({
  projectId,
  onOpenWeather,
  onOpenWork,
}: Props) {
  const triggered = useTriggeredProtocols(projectId);
  return (
    <div className={styles.dashboard}>
      {triggered.length > 0 && (
        <TriggeredProtocolsPanel projectId={projectId} activeModule={null} />
      )}
      <WeatherStrip projectId={projectId} onOpen={onOpenWeather ?? noop} />
      <ActWorkSummaryCard
        projectId={projectId}
        {...(onOpenWork ? { onOpen: onOpenWork } : {})}
      />
      <TodaysPriorities projectId={projectId} activeModule={null} />
      <AlertsPanel projectId={projectId} activeModule={null} />
      <UpcomingEvents projectId={projectId} />
    </div>
  );
}

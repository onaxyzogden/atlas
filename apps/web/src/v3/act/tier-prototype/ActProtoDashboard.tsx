// ActProtoDashboard.tsx
//
// PROTOTYPE-ONLY right-rail dashboard mode. Stacks the four existing Act ops
// cards (Weather / Today's Priorities / Alerts / Upcoming Events) directly,
// rather than reusing ActOpsAside (which hides the dashboard unless a module is
// active). Each card owns its own .panel surface and empty state. Delete w/ folder.

import WeatherStrip from '../ops/WeatherStrip.js';
import TodaysPriorities from '../ops/TodaysPriorities.js';
import AlertsPanel from '../ops/AlertsPanel.js';
import UpcomingEvents from '../ops/UpcomingEvents.js';
import styles from './ActProtoTierShell.module.css';

interface Props {
  projectId: string | null;
}

function noop() {
  /* prototype: dashboard cards are display-only */
}

export default function ActProtoDashboard({ projectId }: Props) {
  return (
    <div className={styles.dashboard}>
      <WeatherStrip projectId={projectId} onOpen={noop} />
      <TodaysPriorities projectId={projectId} activeModule={null} />
      <AlertsPanel projectId={projectId} activeModule={null} />
      <UpcomingEvents projectId={projectId} />
    </div>
  );
}

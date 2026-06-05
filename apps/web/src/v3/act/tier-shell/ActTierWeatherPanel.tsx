/**
 * ActTierWeatherPanel - Act right-rail drill-down that shows the full 7-day
 * forecast inline in the right sidebar.
 *
 * Opened from the Dashboard mode's WeatherStrip (its two buttons -- the strip
 * and the "7-day" link -- call `onOpenWeather`, which ActTierShell maps to
 * showing this panel in the `rightBody` slot in place of the dashboard cards).
 * A back control returns to the dashboard. This is the tier-shell equivalent of
 * the legacy ActOpsAside slide-up path (which the tier-shell does not mount):
 * the forecast loads in the same sidebar rather than a modal/slide-up.
 *
 * Reuses the shared `WeatherForecastCard` (Open-Meteo 7-day forecast for the
 * project parcel centroid) verbatim; `onSwitchToMap` is a no-op here since the
 * panel has no map-switch affordance.
 */

import { ChevronLeft } from 'lucide-react';
import type { LocalProject } from '../../../store/projectStore.js';
import WeatherForecastCard from '../../../features/act/WeatherForecastCard.js';
import styles from './ActTierWeatherPanel.module.css';

interface Props {
  project: LocalProject;
  onBack: () => void;
}

function noop() {
  /* no map-switch affordance in the right-rail weather drill-down */
}

export default function ActTierWeatherPanel({ project, onBack }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={onBack}
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Dashboard
        </button>
      </div>
      <div className={styles.body}>
        <WeatherForecastCard project={project} onSwitchToMap={noop} railLayout />
      </div>
    </div>
  );
}

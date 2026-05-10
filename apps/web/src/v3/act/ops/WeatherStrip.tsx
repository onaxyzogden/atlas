/**
 * WeatherStrip — compact rail panel showing today's weather signal.
 *
 * One row: weather-code icon · current temp · today high/low · precip-prob
 * badge if ≥40%. A second row with a frost-risk chip surfaces when any
 * hour in the next 18 h drops to ≤2 °C (covers tonight + tomorrow morning).
 *
 * Click → switches the active module to 'schedule' and opens the slide-up,
 * landing on the WeatherForecastCard tab (it's the first card in
 * MODULE_CARDS.schedule).
 */

import { useMemo } from 'react';
import { Snowflake } from 'lucide-react';
import { useForecast } from '../../../lib/forecast/useForecast.js';
import { weatherCodeMeta } from '../../../lib/forecast/types.js';
import css from './WeatherStrip.module.css';
import shared from './ActOpsAside.module.css';

interface Props {
  projectId: string | null;
  onOpen: () => void;
}

export default function WeatherStrip({ projectId, onOpen }: Props) {
  const { data, status } = useForecast(projectId ?? '');

  const today = data?.daily[0];
  const current = data?.current;

  const meta = weatherCodeMeta(current?.weatherCode ?? today?.weatherCode);
  const Icon = meta.icon;

  const precipChance = today?.precipitationProbMax;
  const showPrecipBadge =
    typeof precipChance === 'number' && precipChance >= 40;

  const frostHour = useMemo(() => {
    if (!data) return null;
    const next18 = data.hourly.slice(0, 18);
    return (
      next18.find((h) => h.temperatureC != null && h.temperatureC <= 2) ?? null
    );
  }, [data]);

  if (!projectId) return null;

  if (status === 'no-parcel') {
    return (
      <section className={shared.panel}>
        <header className={shared.panelHeader}>
          <h3 className={shared.panelTitle}>Weather</h3>
        </header>
        <p className={css.placeholder}>
          Set a parcel boundary to enable the local forecast.
        </p>
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section className={shared.panel}>
        <header className={shared.panelHeader}>
          <h3 className={shared.panelTitle}>Weather</h3>
        </header>
        <p className={css.placeholder}>Loading forecast…</p>
      </section>
    );
  }

  if (status === 'fallback' || !data) {
    return (
      <section className={shared.panel}>
        <header className={shared.panelHeader}>
          <h3 className={shared.panelTitle}>Weather</h3>
        </header>
        <p className={css.placeholder}>Forecast unavailable.</p>
      </section>
    );
  }

  return (
    <section className={shared.panel}>
      <header className={shared.panelHeader}>
        <h3 className={shared.panelTitle}>Weather</h3>
        <button
          type="button"
          className={shared.panelLink}
          onClick={onOpen}
          aria-label="Open full weather forecast"
        >
          7-day →
        </button>
      </header>
      <button
        type="button"
        className={css.strip}
        onClick={onOpen}
        aria-label="Open weather forecast"
      >
        <span className={css.icon} aria-hidden="true">
          <Icon size={18} />
        </span>
        <div className={css.body}>
          <span className={css.tempNow}>
            {current?.temperatureC != null
              ? `${current.temperatureC.toFixed(0)}°C`
              : '—'}
          </span>
          <span className={css.label}>{meta.label}</span>
        </div>
        <div className={css.right}>
          <span className={css.range}>
            {today?.tempMaxC != null ? `${today.tempMaxC.toFixed(0)}°` : '—'}
            {' / '}
            {today?.tempMinC != null ? `${today.tempMinC.toFixed(0)}°` : '—'}
          </span>
          {showPrecipBadge && (
            <span className={css.precip}>{precipChance!.toFixed(0)}% rain</span>
          )}
        </div>
        {frostHour && frostHour.temperatureC != null && (
          <span className={css.frostRow}>
            <Snowflake size={11} />
            Frost risk · {frostHour.temperatureC.toFixed(1)}°C tonight
          </span>
        )}
      </button>
    </section>
  );
}

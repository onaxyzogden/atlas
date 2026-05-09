/**
 * WeatherForecastCard — ACT-stage Module 7 (Schedule).
 *
 * Renders a 7-day Open-Meteo forecast for the project's parcel centroid.
 * Sections:
 *   1. Current conditions       — large temp + icon + apparent + wind + humidity
 *   2. Next 24 hours            — horizontal scrolling strip
 *   3. 7-day forecast           — vertical list, high/low gradient bar
 *   4. Farm signals             — derived chips: frost, rainfall window, spray window, heat stress
 *   5. Source attribution       — Open-Meteo + relative fetched-at
 *
 * Empty/error states (loading / no-parcel / fallback) render in place of the
 * content blocks but keep the hero visible so the user knows what they're
 * looking at.
 */

import { useMemo } from 'react';
import { Wind, Droplets, ThermometerSun, Sunrise } from 'lucide-react';
import type { LocalProject } from '../../store/projectStore.js';
import { useForecast } from '../../lib/forecast/useForecast.js';
import { weatherCodeMeta, type ForecastDay, type ForecastHour } from '../../lib/forecast/types.js';
import shared from './actCard.module.css';
import css from './WeatherForecastCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

interface FarmSignal {
  kind: 'frost' | 'rain' | 'spray' | 'heat';
  label: string;
  detail: string;
}

const COMPASS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function compassFromDeg(deg: number | null | undefined): string {
  if (deg == null) return '—';
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return COMPASS_8[idx]!;
}

function formatHourLabel(iso: string): string {
  // Open-Meteo returns local-time strings (timezone=auto), no Z suffix.
  const m = /T(\d{2}):/.exec(iso);
  if (!m) return iso;
  const h = Number(m[1]);
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}

function formatDayLabel(date: string, idx: number): { day: string; sub: string } {
  if (idx === 0) return { day: 'Today', sub: date.slice(5) };
  const d = new Date(`${date}T00:00:00`);
  const day = d.toLocaleDateString('en-US', { weekday: 'short' });
  return { day, sub: date.slice(5) };
}

function formatRelativeFetchedAt(iso: string): string {
  const fetched = new Date(iso).getTime();
  if (!Number.isFinite(fetched)) return iso;
  const ageMs = Date.now() - fetched;
  if (ageMs < 60_000) return 'just now';
  if (ageMs < 60 * 60_000) return `${Math.floor(ageMs / 60_000)} min ago`;
  if (ageMs < 24 * 60 * 60_000) return `${Math.floor(ageMs / (60 * 60_000))} h ago`;
  return new Date(iso).toLocaleString();
}

/**
 * Slice the next 24 hours starting from the first hour ≥ now (or the first
 * hour if none match — fresh forecasts may already be a few minutes stale).
 */
function nextTwentyFourHours(hourly: ForecastHour[]): ForecastHour[] {
  const now = Date.now();
  const startIdx = hourly.findIndex((h) => new Date(h.time).getTime() >= now);
  const start = startIdx >= 0 ? startIdx : 0;
  return hourly.slice(start, start + 24);
}

function deriveSignals(
  hourly: ForecastHour[],
  daily: ForecastDay[],
): FarmSignal[] {
  const signals: FarmSignal[] = [];

  // Frost — any hour in the next 36 h with temp ≤ 2°C.
  const next36h = hourly.slice(0, 36);
  const frostHour = next36h.find((h) => h.temperatureC != null && h.temperatureC <= 2);
  if (frostHour && frostHour.temperatureC != null) {
    const label = formatHourLabel(frostHour.time);
    signals.push({
      kind: 'frost',
      label: 'Frost risk',
      detail: `${frostHour.temperatureC.toFixed(1)}°C @ ${label}`,
    });
  }

  // Rain — any day in the 7-day window with ≥10 mm precip.
  const wetDay = daily.find(
    (d) => d.precipitationSumMm != null && d.precipitationSumMm >= 10,
  );
  if (wetDay && wetDay.precipitationSumMm != null) {
    const { day } = formatDayLabel(wetDay.date, daily.indexOf(wetDay));
    signals.push({
      kind: 'rain',
      label: 'Rainfall window',
      detail: `${wetDay.precipitationSumMm.toFixed(0)} mm ${day}`,
    });
  }

  // Spray window — any 3-h block in the next 48 h with wind <10 km/h
  // (≈2.8 m/s) and precip-prob <30%. Take the first qualifying block.
  const next48h = hourly.slice(0, 48);
  for (let i = 0; i < next48h.length - 2; i++) {
    const slice = next48h.slice(i, i + 3);
    const lowWind = slice.every(
      (h) => h.windSpeedMs != null && h.windSpeedMs < 2.8,
    );
    const lowRain = slice.every(
      (h) =>
        h.precipitationProbability == null || h.precipitationProbability < 30,
    );
    if (lowWind && lowRain) {
      const start = formatHourLabel(slice[0]!.time);
      signals.push({
        kind: 'spray',
        label: 'Spray window',
        detail: `${start} (calm, dry)`,
      });
      break;
    }
  }

  // Heat — any day with high ≥32°C.
  const hotDay = daily.find((d) => d.tempMaxC != null && d.tempMaxC >= 32);
  if (hotDay && hotDay.tempMaxC != null) {
    const { day } = formatDayLabel(hotDay.date, daily.indexOf(hotDay));
    signals.push({
      kind: 'heat',
      label: 'Heat stress',
      detail: `${hotDay.tempMaxC.toFixed(0)}°C ${day}`,
    });
  }

  return signals;
}

/** Compute a normalized [0..1] position for a temp on the week's min..max axis. */
function dailyBarRange(daily: ForecastDay[]): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const d of daily) {
    if (d.tempMinC != null && d.tempMinC < min) min = d.tempMinC;
    if (d.tempMaxC != null && d.tempMaxC > max) max = d.tempMaxC;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return { min: 0, max: 1 };
  }
  return { min, max };
}

export default function WeatherForecastCard({ project }: Props) {
  const { data, status } = useForecast(project.id);

  const next24 = useMemo(() => (data ? nextTwentyFourHours(data.hourly) : []), [data]);
  const signals = useMemo(
    () => (data ? deriveSignals(data.hourly, data.daily) : []),
    [data],
  );
  const range = useMemo(
    () => (data ? dailyBarRange(data.daily) : { min: 0, max: 1 }),
    [data],
  );

  return (
    <div className={shared.page}>
      <header className={shared.hero}>
        <span className={shared.heroTag}>Schedule · weather</span>
        <h1 className={shared.title}>Weather forecast</h1>
        <p className={shared.lede}>
          Seven-day Open-Meteo forecast for {project.name}'s parcel centroid.
          Hourly rainfall, wind, and frost signals to time field work.
        </p>
      </header>

      {status === 'no-parcel' && (
        <section className={shared.section}>
          <h2 className={shared.sectionTitle}>No parcel boundary yet</h2>
          <p className={shared.sectionBody}>
            Draw or import a parcel boundary in the Observe stage to enable the
            site-specific forecast.
          </p>
        </section>
      )}

      {status === 'loading' && (
        <section className={shared.section}>
          <p className={shared.sectionBody}>Loading forecast…</p>
        </section>
      )}

      {status === 'fallback' && (
        <section className={shared.section}>
          <h2 className={shared.sectionTitle}>Forecast unavailable</h2>
          <p className={shared.sectionBody}>
            Open-Meteo did not return data for this point. Try again later.
          </p>
        </section>
      )}

      {status === 'live' && data && (
        <>
          {data.current && (
            <section className={shared.section}>
              <h2 className={shared.sectionTitle}>Current conditions</h2>
              <CurrentBlock current={data.current} />
            </section>
          )}

          {next24.length > 0 && (
            <section className={shared.section}>
              <h2 className={shared.sectionTitle}>Next 24 hours</h2>
              <div className={css.hourlyStrip}>
                {next24.map((h, i) => (
                  <HourCell key={h.time} hour={h} highlight={i === 0} />
                ))}
              </div>
            </section>
          )}

          {data.daily.length > 0 && (
            <section className={shared.section}>
              <h2 className={shared.sectionTitle}>7-day forecast</h2>
              <div className={css.dailyList}>
                {data.daily.map((d, i) => (
                  <DayRow key={d.date} day={d} idx={i} range={range} />
                ))}
              </div>
            </section>
          )}

          {signals.length > 0 && (
            <section className={shared.section}>
              <h2 className={shared.sectionTitle}>Farm signals</h2>
              <div className={css.signalRow}>
                {signals.map((s) => (
                  <SignalChip key={`${s.kind}-${s.label}`} signal={s} />
                ))}
              </div>
            </section>
          )}

          <p className={css.attribution}>
            {data.source} · updated {formatRelativeFetchedAt(data.fetchedAt)}
          </p>
        </>
      )}
    </div>
  );
}

interface CurrentProps {
  current: NonNullable<ReturnType<typeof useForecast>['data']>['current'];
}

function CurrentBlock({ current }: CurrentProps) {
  if (!current) return null;
  const meta = weatherCodeMeta(current.weatherCode);
  const Icon = meta.icon;
  return (
    <div className={css.currentRow}>
      <div className={css.currentIcon} aria-hidden="true">
        <Icon size={36} />
      </div>
      <div>
        <div className={css.currentTemp}>
          {current.temperatureC != null ? `${current.temperatureC.toFixed(0)}°C` : '—'}
        </div>
        <div className={css.currentLabel}>
          {meta.label}
          {current.apparentC != null && (
            <> · feels {current.apparentC.toFixed(0)}°C</>
          )}
        </div>
        <div className={css.currentMeta}>
          {current.windSpeedMs != null && (
            <span>
              <Wind size={11} />{' '}
              <strong>{current.windSpeedMs.toFixed(1)}</strong> m/s{' '}
              {compassFromDeg(current.windDirectionDeg)}
            </span>
          )}
          {current.humidity != null && (
            <span>
              <Droplets size={11} /> <strong>{current.humidity.toFixed(0)}</strong>%
            </span>
          )}
          {current.precipitationMm != null && current.precipitationMm > 0 && (
            <span>
              <strong>{current.precipitationMm.toFixed(1)}</strong> mm
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function HourCell({ hour, highlight }: { hour: ForecastHour; highlight: boolean }) {
  const meta = weatherCodeMeta(hour.weatherCode);
  const Icon = meta.icon;
  const prob = hour.precipitationProbability ?? 0;
  return (
    <div className={`${css.hourCell} ${highlight ? css.now : ''}`}>
      <span className={css.hourLabel}>
        {highlight ? 'Now' : formatHourLabel(hour.time)}
      </span>
      <Icon size={18} aria-hidden="true" />
      <span className={css.hourTemp}>
        {hour.temperatureC != null ? `${hour.temperatureC.toFixed(0)}°` : '—'}
      </span>
      <span className={css.hourPrecip}>
        <span className={css.precipBar} aria-hidden="true">
          <span
            className={css.precipBarFill}
            style={{ width: `${Math.min(100, prob)}%` }}
          />
        </span>
        {prob > 0 ? `${prob.toFixed(0)}%` : ''}
      </span>
    </div>
  );
}

function DayRow({
  day,
  idx,
  range,
}: {
  day: ForecastDay;
  idx: number;
  range: { min: number; max: number };
}) {
  const meta = weatherCodeMeta(day.weatherCode);
  const Icon = meta.icon;
  const { day: label, sub } = formatDayLabel(day.date, idx);
  const span = range.max - range.min;
  const left = day.tempMinC != null && span > 0
    ? Math.max(0, ((day.tempMinC - range.min) / span) * 100)
    : 0;
  const right = day.tempMaxC != null && span > 0
    ? Math.min(100, ((day.tempMaxC - range.min) / span) * 100)
    : 100;
  const width = Math.max(4, right - left);
  const precipMm = day.precipitationSumMm ?? 0;
  const precipProb = day.precipitationProbMax ?? 0;
  const wind = day.windSpeedMaxMs;
  return (
    <div className={css.dayRow}>
      <div>
        <span className={css.dayLabel}>{label}</span>
        <span className={css.dayLabelSub}>{sub}</span>
      </div>
      <div className={css.dayIcon} aria-label={meta.label}>
        <Icon size={20} />
      </div>
      <div className={css.dayTempBar}>
        <div className={css.dayTempRange}>
          <span>{day.tempMinC != null ? `${day.tempMinC.toFixed(0)}°` : '—'}</span>
          <strong>{day.tempMaxC != null ? `${day.tempMaxC.toFixed(0)}°` : '—'}</strong>
        </div>
        <div className={css.dayBar} aria-hidden="true">
          <div
            className={css.dayBarFill}
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        </div>
      </div>
      <div
        className={`${css.dayPrecip} ${precipMm < 0.5 ? css.dayPrecipDry : ''}`}
      >
        {precipMm >= 0.5 ? `${precipMm.toFixed(1)} mm` : '—'}
        {precipProb > 0 && precipMm >= 0.5 && (
          <>
            {' · '}
            {precipProb.toFixed(0)}%
          </>
        )}
      </div>
      <div className={css.dayWind}>
        {wind != null ? `${wind.toFixed(1)} m/s` : '—'}
      </div>
    </div>
  );
}

function SignalChip({ signal }: { signal: FarmSignal }) {
  const className = (() => {
    switch (signal.kind) {
      case 'frost': return `${css.signal} ${css.signalFrost}`;
      case 'rain':  return `${css.signal} ${css.signalRain}`;
      case 'spray': return `${css.signal} ${css.signalSpray}`;
      case 'heat':  return `${css.signal} ${css.signalHeat}`;
    }
  })();
  const Icon = (() => {
    switch (signal.kind) {
      case 'frost': return ThermometerSun;
      case 'rain':  return Droplets;
      case 'spray': return Sunrise;
      case 'heat':  return ThermometerSun;
    }
  })();
  return (
    <span className={className}>
      <Icon size={14} aria-hidden="true" />
      <strong>{signal.label}:</strong> {signal.detail}
    </span>
  );
}

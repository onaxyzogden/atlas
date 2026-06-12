/**
 * WorkAgendaList — day-grouped agenda of dated spine WorkItems for the Act
 * work panel. Pure presentation over `groupByDueDate`; each row is a
 * self-sufficient WorkItemRow (the rows own their store actions).
 *
 * `forecastByDay` (optional — WorkMonthGrid passes it) decorates day headers
 * inside the 7-day forecast window with a weatherCodeMeta glyph + high/low.
 * Callers that omit it render exactly as before.
 */

import { useMemo } from 'react';
import type { WorkItem } from '@ogden/shared';
import {
  weatherCodeMeta,
  type ForecastDay,
} from '../../../../lib/forecast/types.js';
import { groupByDueDate } from '../../../../features/work/workSelectors.js';
import WorkItemRow from './WorkItemRow.js';
import styles from './ActWorkPanel.module.css';

function formatDayHeader(dateKey: string, todayISO: string): string {
  if (dateKey === todayISO) return 'Today';
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

interface Props {
  items: readonly WorkItem[];
  todayISO: string;
  emptyLabel: string;
  forecastByDay?: ReadonlyMap<string, ForecastDay> | undefined;
}

function DayHeaderWeather({ day }: { day: ForecastDay }) {
  const meta = weatherCodeMeta(day.weatherCode);
  const Icon = meta.icon;
  return (
    <span
      className={styles.dayHeaderWeather}
      data-testid="work-day-weather"
      title={meta.label}
    >
      <Icon size={11} />
      {day.tempMaxC != null && day.tempMinC != null && (
        <span>
          {day.tempMaxC.toFixed(0)}° / {day.tempMinC.toFixed(0)}°
        </span>
      )}
    </span>
  );
}

export default function WorkAgendaList({
  items,
  todayISO,
  emptyLabel,
  forecastByDay,
}: Props) {
  const groups = useMemo(() => groupByDueDate(items), [items]);

  if (groups.length === 0) {
    return <div className={styles.empty}>{emptyLabel}</div>;
  }

  return (
    <>
      {groups.map((group) => {
        const fc = forecastByDay?.get(group.dateKey);
        return (
        <div className={styles.section} key={group.dateKey}>
          <div className={styles.dayHeader}>
            {formatDayHeader(group.dateKey, todayISO)}
            {fc && <DayHeaderWeather day={fc} />}
          </div>
          {group.items.map((item) => (
            <WorkItemRow key={item.id} item={item} todayISO={todayISO} />
          ))}
        </div>
        );
      })}
    </>
  );
}

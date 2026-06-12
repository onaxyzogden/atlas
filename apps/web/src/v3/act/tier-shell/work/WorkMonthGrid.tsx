/**
 * WorkMonthGrid — compact month calendar for the Act work panel's Season tab.
 *
 * A fixed 7×6 date-fns grid sized for the 260px rail: month prev/next nav,
 * per-day tone dots (overdue / open / done — derived via workDisplayStatus,
 * cancelled excluded), and a tap-a-day agenda below reusing WorkAgendaList.
 *
 * Weather glyphs (useForecast reuse): days inside the 7-day Open-Meteo
 * window show the WeatherStrip iconography — a small weatherCodeMeta icon in
 * the cell and icon + high/low on the selected day's agenda header. Outside
 * the window (or no-parcel / fallback / loading) the glyphs are simply
 * absent — weather is advisory garnish, never a gate on the work.
 *
 * Pure read over the rows the panel hands it — rendering never writes any
 * store; the agenda rows it mounts own their actions (WorkItemRow).
 * Weeks start Monday (work-planning convention, matches the Mo–Su header).
 */

import { useMemo, useState } from 'react';
import { addDays, addMonths, format, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorkItem } from '@ogden/shared';
import { useForecast } from '../../../../lib/forecast/useForecast.js';
import {
  weatherCodeMeta,
  type ForecastDay,
} from '../../../../lib/forecast/types.js';
import {
  workDisplayStatus,
  workDueDate,
} from '../../../../features/work/workSelectors.js';
import WorkAgendaList from './WorkAgendaList.js';
import styles from './ActWorkPanel.module.css';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const GRID_CELLS = 42; // 7 columns × 6 rows, fixed so month height never jumps

/** Local midnight from a YYYY-MM-DD key (grid math is calendar-local). */
function parseDay(dateISO: string): Date {
  return new Date(`${dateISO.slice(0, 10)}T00:00:00`);
}

interface DayMarks {
  overdue: number;
  open: number;
  done: number;
}

interface Props {
  projectId: string;
  /** Non-cancelled livestock work for the project — ALL of it; the grid
   *  windows by month itself (no horizon clamp, that's the point of Season). */
  items: readonly WorkItem[];
  todayISO: string;
}

export default function WorkMonthGrid({ projectId, items, todayISO }: Props) {
  // 7-day forecast for the parcel centroid (1 h server cache). The grid only
  // mounts on the Season tab, so this fires exactly when the glyphs can show.
  const { data: forecast } = useForecast(projectId);
  const forecastByDay = useMemo(() => {
    const map = new Map<string, ForecastDay>();
    for (const day of forecast?.daily ?? []) {
      if (day.weatherCode != null) map.set(day.date.slice(0, 10), day);
    }
    return map;
  }, [forecast]);

  const [monthAnchor, setMonthAnchor] = useState<Date>(() =>
    startOfMonth(parseDay(todayISO)),
  );
  const [selectedDay, setSelectedDay] = useState<string>(todayISO);

  const marksByDay = useMemo(() => {
    const map = new Map<string, DayMarks>();
    for (const item of items) {
      const due = workDueDate(item)?.slice(0, 10);
      if (!due) continue;
      const status = workDisplayStatus(item, todayISO);
      if (status === 'cancelled') continue;
      let marks = map.get(due);
      if (!marks) {
        marks = { overdue: 0, open: 0, done: 0 };
        map.set(due, marks);
      }
      if (status === 'overdue') marks.overdue += 1;
      else if (status === 'done') marks.done += 1;
      else marks.open += 1;
    }
    return map;
  }, [items, todayISO]);

  const cells = useMemo(() => {
    const gridStart = startOfWeek(monthAnchor, { weekStartsOn: 1 });
    const monthKey = format(monthAnchor, 'yyyy-MM');
    return Array.from({ length: GRID_CELLS }, (_, i) => {
      const date = addDays(gridStart, i);
      const key = format(date, 'yyyy-MM-dd');
      return {
        key,
        dayNum: date.getDate(),
        outside: !key.startsWith(monthKey),
      };
    });
  }, [monthAnchor]);

  const dayItems = useMemo(
    () =>
      items.filter(
        (item) => workDueDate(item)?.slice(0, 10) === selectedDay,
      ),
    [items, selectedDay],
  );

  const goToday = () => {
    setMonthAnchor(startOfMonth(parseDay(todayISO)));
    setSelectedDay(todayISO);
  };

  return (
    <div className={styles.monthGridWrap} data-testid="work-month-grid">
      <div className={styles.monthNav}>
        <button
          type="button"
          className={styles.monthNavBtn}
          aria-label="Previous month"
          onClick={() => setMonthAnchor((m) => addMonths(m, -1))}
        >
          <ChevronLeft size={14} />
        </button>
        <button
          type="button"
          className={styles.monthTodayBtn}
          onClick={goToday}
          title="Jump to the current month"
        >
          {format(monthAnchor, 'MMMM yyyy')}
        </button>
        <button
          type="button"
          className={styles.monthNavBtn}
          aria-label="Next month"
          onClick={() => setMonthAnchor((m) => addMonths(m, 1))}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className={styles.weekdayRow} aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span className={styles.weekday} key={d}>
            {d}
          </span>
        ))}
      </div>

      <div className={styles.monthGrid} role="grid" aria-label="Work by day">
        {cells.map((cell) => {
          const marks = marksByDay.get(cell.key);
          const fc = forecastByDay.get(cell.key);
          const FcIcon = fc ? weatherCodeMeta(fc.weatherCode).icon : null;
          return (
            <button
              type="button"
              key={cell.key}
              className={styles.dayCell}
              data-testid="work-month-day"
              data-date={cell.key}
              data-outside={cell.outside || undefined}
              data-today={cell.key === todayISO || undefined}
              data-selected={cell.key === selectedDay || undefined}
              aria-pressed={cell.key === selectedDay}
              onClick={() => setSelectedDay(cell.key)}
            >
              <span className={styles.dayNum}>{cell.dayNum}</span>
              <span className={styles.dayDots}>
                {fc && FcIcon && (
                  <span
                    className={styles.dayWeather}
                    data-testid="work-month-weather"
                    title={weatherCodeMeta(fc.weatherCode).label}
                  >
                    <FcIcon size={9} />
                  </span>
                )}
                {marks && marks.overdue > 0 && (
                  <span className={styles.dayDot} data-tone="overdue" />
                )}
                {marks && marks.open > 0 && (
                  <span className={styles.dayDot} data-tone="open" />
                )}
                {marks && marks.done > 0 && (
                  <span className={styles.dayDot} data-tone="done" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <WorkAgendaList
        items={dayItems}
        todayISO={todayISO}
        emptyLabel="Nothing scheduled on this day."
        forecastByDay={forecastByDay}
      />
    </div>
  );
}

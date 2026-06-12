/**
 * WorkCalendarTakeover — wide month calendar over the Act tier canvas.
 *
 * The rail's WorkMonthGrid is sized for 260px — dots only. This takeover
 * replaces the map canvas (`?panel=work&workView=calendar`, URL-derived so
 * it survives reload) with the same fixed 7×6 Monday-start month, but wide:
 * each day cell lists its work entries by title (tone-coded overdue / open /
 * done, capped with a "+N more" overflow), forecast-window cells carry the
 * weatherCodeMeta glyph, and the selected day's full agenda renders below
 * reusing WorkAgendaList — so every row action (Mark done, Log move,
 * Reschedule…) is available without leaving the calendar.
 *
 * Reads the spine directly (same feed the panel derives: this project's
 * non-cancelled livestock work). Pure read — rendering writes no store; the
 * agenda rows own their actions. "Back to map" hands control to the shell,
 * which drops the workView param and remounts the map.
 */

import { useMemo, useState } from 'react';
import { addDays, addMonths, format, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { WorkItem } from '@ogden/shared';
import { useWorkItemStore } from '../../../../store/workItemStore.js';
import { useForecast } from '../../../../lib/forecast/useForecast.js';
import {
  weatherCodeMeta,
  type ForecastDay,
} from '../../../../lib/forecast/types.js';
import {
  isLivestockWork,
  workDisplayStatus,
  workDueDate,
} from '../../../../features/work/workSelectors.js';
import WorkAgendaList from './WorkAgendaList.js';
import styles from './WorkCalendarTakeover.module.css';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const GRID_CELLS = 42; // 7 columns × 6 rows, fixed so month height never jumps
const MAX_ENTRIES = 3; // per-cell titles before the "+N more" overflow

/** Local midnight from a YYYY-MM-DD key (grid math is calendar-local). */
function parseDay(dateISO: string): Date {
  return new Date(`${dateISO.slice(0, 10)}T00:00:00`);
}

type EntryTone = 'overdue' | 'open' | 'done';

function entryTone(item: WorkItem, todayISO: string): EntryTone {
  const status = workDisplayStatus(item, todayISO);
  if (status === 'overdue') return 'overdue';
  if (status === 'done') return 'done';
  return 'open';
}

interface Props {
  projectId: string;
  /** Shell callback: drop `?workView` and remount the map. */
  onClose: () => void;
  /** Clock override for tests; defaults to the real today. */
  todayISO?: string | undefined;
}

export default function WorkCalendarTakeover({
  projectId,
  onClose,
  todayISO: todayISOProp,
}: Props) {
  const items = useWorkItemStore((s) => s.items);
  const todayISO = todayISOProp ?? new Date().toISOString().slice(0, 10);
  const [monthAnchor, setMonthAnchor] = useState<Date>(() =>
    startOfMonth(parseDay(todayISO)),
  );
  const [selectedDay, setSelectedDay] = useState<string>(todayISO);

  // Same advisory forecast garnish as the rail grid: glyphs only where the
  // 7-day window has data; never a gate on the work.
  const { data: forecast } = useForecast(projectId);
  const forecastByDay = useMemo(() => {
    const map = new Map<string, ForecastDay>();
    for (const day of forecast?.daily ?? []) {
      if (day.weatherCode != null) map.set(day.date.slice(0, 10), day);
    }
    return map;
  }, [forecast]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    for (const item of items) {
      if (item.projectId !== projectId || !isLivestockWork(item)) continue;
      if (workDisplayStatus(item, todayISO) === 'cancelled') continue;
      const due = workDueDate(item)?.slice(0, 10);
      if (!due) continue;
      const list = map.get(due);
      if (list) list.push(item);
      else map.set(due, [item]);
    }
    return map;
  }, [items, projectId, todayISO]);

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
    () => itemsByDay.get(selectedDay) ?? [],
    [itemsByDay, selectedDay],
  );

  const goToday = () => {
    setMonthAnchor(startOfMonth(parseDay(todayISO)));
    setSelectedDay(todayISO);
  };

  return (
    <div className={styles.takeover} data-testid="work-calendar-takeover">
      <div className={styles.header}>
        <span className={styles.title}>Work calendar</span>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Previous month"
            onClick={() => setMonthAnchor((m) => addMonths(m, -1))}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            className={styles.monthLabel}
            onClick={goToday}
            title="Jump to the current month"
          >
            {format(monthAnchor, 'MMMM yyyy')}
          </button>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Next month"
            onClick={() => setMonthAnchor((m) => addMonths(m, 1))}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          data-testid="work-calendar-close"
        >
          <X size={13} />
          Back to map
        </button>
      </div>

      <div className={styles.weekdayRow} aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span className={styles.weekday} key={d}>
            {d}
          </span>
        ))}
      </div>

      <div className={styles.grid} role="grid" aria-label="Work by day, wide calendar">
        {cells.map((cell) => {
          const dayList = itemsByDay.get(cell.key) ?? [];
          const fc = forecastByDay.get(cell.key);
          const FcIcon = fc ? weatherCodeMeta(fc.weatherCode).icon : null;
          return (
            <button
              type="button"
              key={cell.key}
              className={styles.dayCell}
              data-testid="work-cal-day"
              data-date={cell.key}
              data-outside={cell.outside || undefined}
              data-today={cell.key === todayISO || undefined}
              data-selected={cell.key === selectedDay || undefined}
              aria-pressed={cell.key === selectedDay}
              onClick={() => setSelectedDay(cell.key)}
            >
              <span className={styles.cellTop}>
                <span className={styles.dayNum}>{cell.dayNum}</span>
                {fc && FcIcon && (
                  <span
                    className={styles.cellWeather}
                    data-testid="work-cal-weather"
                    title={weatherCodeMeta(fc.weatherCode).label}
                  >
                    <FcIcon size={11} />
                  </span>
                )}
              </span>
              <span className={styles.entries}>
                {dayList.slice(0, MAX_ENTRIES).map((item) => (
                  <span
                    key={item.id}
                    className={styles.entry}
                    data-testid="work-cal-entry"
                    data-tone={entryTone(item, todayISO)}
                  >
                    {item.title}
                  </span>
                ))}
                {dayList.length > MAX_ENTRIES && (
                  <span className={styles.more}>
                    +{dayList.length - MAX_ENTRIES} more
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.agenda}>
        <div className={styles.agendaTitle}>
          {selectedDay === todayISO ? 'Today' : selectedDay}
        </div>
        <WorkAgendaList
          items={dayItems}
          todayISO={todayISO}
          emptyLabel="Nothing scheduled on this day."
          forecastByDay={forecastByDay}
        />
      </div>
    </div>
  );
}

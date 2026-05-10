/**
 * EventCalendarCard — ACT-stage Module 7 (Schedule).
 *
 * Aggregates dated entries from five stores (community events, field tasks,
 * livestock moves, harvest log, nursery batches/transfers) into a unified
 * month-grid calendar so an operator can see what's happening across the
 * site on any given day.
 *
 * Custom date-fns grid (no external calendar lib): 7 columns × 6 rows,
 * `startOfMonth` → walked backward to the previous Sunday and forward to
 * the following Saturday so the grid is always rectangular. Click a day to
 * pin it open in the detail panel below.
 */

import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  CALENDAR_SOURCES,
  CALENDAR_SOURCE_LABEL,
  useEventAggregator,
  type CalendarEntry,
  type CalendarSource,
} from './useEventAggregator.js';
import shared from './actCard.module.css';
import css from './EventCalendarCard.module.css';

type CalendarViewMode = 'month' | 'week' | 'agenda';
const AGENDA_DAYS = 14;

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SOURCE_DOT_CLASS: Record<CalendarSource, string> = {
  task: css.dotTask!,
  livestock: css.dotLivestock!,
  harvest: css.dotHarvest!,
  nursery: css.dotNursery!,
  community: css.dotCommunity!,
};

function dateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export default function EventCalendarCard({ project }: Props) {
  const { byDate } = useEventAggregator(project.id);

  const today = useMemo(() => new Date(), []);
  const [anchor, setAnchor] = useState<Date>(today);
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [activeSources, setActiveSources] = useState<Set<CalendarSource>>(
    () => new Set(CALENDAR_SOURCES),
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [anchor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 0 });
    const out: Date[] = [];
    for (let i = 0; i < 7; i++) out.push(addDays(start, i));
    return out;
  }, [anchor]);

  const agendaDays = useMemo(() => {
    const start = startOfDay(today);
    const out: Date[] = [];
    for (let i = 0; i < AGENDA_DAYS; i++) out.push(addDays(start, i));
    return out;
  }, [today]);

  const filteredByDate = useMemo(() => {
    const out = new Map<string, CalendarEntry[]>();
    for (const [key, entries] of byDate.entries()) {
      const filtered = entries.filter((e) => activeSources.has(e.source));
      if (filtered.length > 0) out.set(key, filtered);
    }
    return out;
  }, [byDate, activeSources]);

  const selectedKey = dateKey(selectedDay);
  const selectedEntries = filteredByDate.get(selectedKey) ?? [];
  const monthLabel = format(anchor, 'MMMM yyyy');
  const weekLabel = `${format(weekDays[0]!, 'MMM d')} – ${format(weekDays[6]!, 'MMM d, yyyy')}`;
  const headerLabel =
    viewMode === 'week' ? weekLabel
      : viewMode === 'agenda' ? `Next ${AGENDA_DAYS} days`
      : monthLabel;

  const stepBack = () => {
    if (viewMode === 'week') setAnchor((a) => addWeeks(a, -1));
    else if (viewMode === 'month') setAnchor((a) => addMonths(a, -1));
  };
  const stepForward = () => {
    if (viewMode === 'week') setAnchor((a) => addWeeks(a, 1));
    else if (viewMode === 'month') setAnchor((a) => addMonths(a, 1));
  };

  const agendaBlocks = useMemo(() => {
    return agendaDays
      .map((day) => ({ day, entries: filteredByDate.get(dateKey(day)) ?? [] }))
      .filter((b) => b.entries.length > 0);
  }, [agendaDays, filteredByDate]);

  const toggleSource = (source: CalendarSource) => {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  return (
    <div className={shared.page}>
      <header className={shared.hero}>
        <span className={shared.heroTag}>Schedule · calendar</span>
        <h1 className={shared.title}>Event calendar</h1>
        <p className={shared.lede}>
          One time-axis for {project.name}: tasks, livestock moves, harvests,
          nursery batches, and community events.
        </p>
      </header>

      <section className={shared.section}>
        <div className={css.toolbar}>
          <span className={css.monthLabel}>{headerLabel}</span>
          <div className={css.navButtons}>
            <button
              type="button"
              className={css.navBtn}
              aria-label={viewMode === 'week' ? 'Previous week' : 'Previous month'}
              onClick={stepBack}
              disabled={viewMode === 'agenda'}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className={css.navBtn}
              aria-label={viewMode === 'week' ? 'Next week' : 'Next month'}
              onClick={stepForward}
              disabled={viewMode === 'agenda'}
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              className={`${css.navBtn} ${css.todayBtn}`}
              onClick={() => {
                setAnchor(today);
                setSelectedDay(today);
              }}
            >
              Today
            </button>
          </div>
        </div>

        <div className={css.viewToggle} role="group" aria-label="Calendar view mode">
          {(['month', 'week', 'agenda'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`${css.filterChip} ${viewMode === mode ? css.filterChipActive : ''}`}
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
            >
              {mode === 'month' ? 'Month' : mode === 'week' ? 'Week' : 'Agenda'}
            </button>
          ))}
        </div>

        <div className={css.filterRow} role="group" aria-label="Source filters">
          {CALENDAR_SOURCES.map((source) => {
            const active = activeSources.has(source);
            return (
              <button
                key={source}
                type="button"
                className={`${css.filterChip} ${active ? css.filterChipActive : ''}`}
                onClick={() => toggleSource(source)}
                aria-pressed={active}
              >
                <span className={`${css.dot} ${SOURCE_DOT_CLASS[source]}`} />
                {CALENDAR_SOURCE_LABEL[source]}
              </button>
            );
          })}
        </div>

        {viewMode === 'month' && (
          <>
            <div className={css.weekHeader} aria-hidden="true">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className={css.grid}>
              {days.map((day) => {
                const key = dateKey(day);
                const entries = filteredByDate.get(key) ?? [];
                const inMonth = isSameMonth(day, anchor);
                const isToday = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDay);
                const sourcesPresent = new Set(entries.map((e) => e.source));
                const overflow = entries.length - 3;

                const className = [
                  css.cell,
                  !inMonth ? css.cellOutside : '',
                  isToday ? css.cellToday : '',
                  isSelected ? css.cellSelected : '',
                  entries.length > 0 ? css.cellHasEvents : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={key}
                    type="button"
                    className={className}
                    onClick={() => {
                      if (!inMonth) {
                        setAnchor(day);
                      }
                      setSelectedDay(day);
                    }}
                    aria-label={`${format(day, 'PPP')} — ${entries.length} entries`}
                    aria-pressed={isSelected}
                  >
                    <span className={css.cellDayNum}>{format(day, 'd')}</span>
                    {sourcesPresent.size > 0 && (
                      <span className={css.cellDots}>
                        {CALENDAR_SOURCES.filter((s) => sourcesPresent.has(s))
                          .slice(0, 5)
                          .map((s) => (
                            <span
                              key={s}
                              className={`${css.dot} ${SOURCE_DOT_CLASS[s]}`}
                            />
                          ))}
                      </span>
                    )}
                    {overflow > 0 && (
                      <span className={css.cellOverflow}>+{overflow} more</span>
                    )}
                  </button>
                );
              })}
            </div>

            <DayDetail entries={selectedEntries} day={selectedDay} />
          </>
        )}

        {viewMode === 'week' && (
          <>
            <div className={css.weekStrip}>
              {weekDays.map((day) => {
                const key = dateKey(day);
                const entries = filteredByDate.get(key) ?? [];
                const isToday = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDay);
                const sourcesPresent = new Set(entries.map((e) => e.source));
                const overflow = entries.length - 3;

                const className = [
                  css.weekCell,
                  isToday ? css.cellToday : '',
                  isSelected ? css.cellSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={key}
                    type="button"
                    className={className}
                    onClick={() => setSelectedDay(day)}
                    aria-label={`${format(day, 'PPP')} — ${entries.length} entries`}
                    aria-pressed={isSelected}
                  >
                    <span className={css.weekCellLabel}>
                      {format(day, 'EEE')} · {format(day, 'MMM d')}
                    </span>
                    <span className={css.weekCellRight}>
                      {sourcesPresent.size > 0 && (
                        <span className={css.cellDots}>
                          {CALENDAR_SOURCES.filter((s) => sourcesPresent.has(s))
                            .slice(0, 5)
                            .map((s) => (
                              <span
                                key={s}
                                className={`${css.dot} ${SOURCE_DOT_CLASS[s]}`}
                              />
                            ))}
                        </span>
                      )}
                      {overflow > 0 && (
                        <span className={css.cellOverflow}>+{overflow}</span>
                      )}
                      {entries.length === 0 && (
                        <span className={css.weekCellEmpty}>—</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <DayDetail entries={selectedEntries} day={selectedDay} />
          </>
        )}

        {viewMode === 'agenda' && (
          <div className={css.agendaList}>
            {agendaBlocks.length === 0 ? (
              <p className={css.emptyDetail}>
                No upcoming entries in the next {AGENDA_DAYS} days. Toggle
                filters or extend the window.
              </p>
            ) : (
              agendaBlocks.map(({ day, entries }) => (
                <div key={dateKey(day)} className={css.agendaDay}>
                  <DayDetail entries={entries} day={day} />
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function DayDetail({ entries, day }: { entries: CalendarEntry[]; day: Date }) {
  const dayLabel = format(day, 'EEEE, MMM d');
  return (
    <div className={css.dayDetail}>
      <div className={css.dayDetailHeader}>
        <span className={css.dayDetailTitle}>{dayLabel}</span>
        <span className={css.dayDetailCount}>
          {entries.length === 0
            ? 'No entries'
            : `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className={css.emptyDetail}>
          No events on this day. Toggle source filters to widen the view, or
          log a task / move / harvest from its respective module.
        </p>
      ) : (
        <ul className={css.dayDetailList}>
          {entries.map((entry) => (
            <li key={entry.id} className={css.dayDetailItem}>
              <span
                className={`${css.dot} ${SOURCE_DOT_CLASS[entry.source]}`}
                aria-hidden="true"
              />
              <span>
                <strong>{entry.title}</strong>
                {entry.meta && (
                  <span className={css.dayDetailItemMeta}> · {entry.meta}</span>
                )}
              </span>
              <span className={css.dayDetailItemMeta}>
                {formatTimeIfPresent(entry.iso)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Render the time portion of an ISO datetime when it carries one
 * (e.g. fieldTask.dueAt). Pure-date strings (e.g. communityEvent.date
 * = '2026-05-09') return empty.
 */
function formatTimeIfPresent(iso: string): string {
  if (iso.length <= 10) return '';
  try {
    const d = parseISO(iso);
    return format(d, 'h:mm a');
  } catch {
    return '';
  }
}

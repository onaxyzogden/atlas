/**
 * UpcomingEvents — surfaces dated entries from all five Act-stage stores
 * within the next 30 days (not just communityEventStore).
 *
 * Sources (priority order matches useEventAggregator): community, tasks,
 * livestock moves, harvest log, nursery batches/transfers. Click the panel
 * header → opens the schedule slide-up so the operator can see the full
 * month grid.
 *
 * Phase milestones (BuildPhase) are excluded — their `timeframe` strings
 * ("Year 0-1") aren't anchored to specific calendar dates.
 */

import { useMemo } from 'react';
import {
  Beef,
  Leaf,
  ListChecks,
  Sprout,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  useEventAggregator,
  type CalendarSource,
} from '../../../features/act/useEventAggregator.js';
import css from './ActOpsAside.module.css';

interface Props {
  projectId: string | null;
  onOpenSchedule?: () => void;
}

const SOURCE_ICON: Record<CalendarSource, LucideIcon> = {
  community: Users,
  task: ListChecks,
  livestock: Beef,
  harvest: Sprout,
  nursery: Leaf,
};

const SOURCE_LABEL: Record<CalendarSource, string> = {
  community: 'Community',
  task: 'Task',
  livestock: 'Livestock',
  harvest: 'Harvest',
  nursery: 'Nursery',
};

export default function UpcomingEvents({ projectId, onOpenSchedule }: Props) {
  const { all } = useEventAggregator(projectId ?? '');

  const upcoming = useMemo(() => {
    if (!projectId) return [];
    const now = Date.now();
    const cutoff = now + 30 * 24 * 60 * 60 * 1000;
    return all
      .map((e) => ({ ...e, ts: new Date(e.iso).getTime() }))
      .filter((e) => !Number.isNaN(e.ts) && e.ts >= now && e.ts <= cutoff)
      .slice(0, 4);
  }, [all, projectId]);

  return (
    <section className={css.panel}>
      <header className={css.panelHeader}>
        <h3 className={css.panelTitle}>Upcoming Events</h3>
        {onOpenSchedule && (
          <button
            type="button"
            className={css.panelLink}
            onClick={onOpenSchedule}
            aria-label="Open full schedule"
          >
            Schedule →
          </button>
        )}
      </header>
      {upcoming.length === 0 ? (
        <p className={css.empty}>No events in the next 30 days.</p>
      ) : (
        <ul className={css.eventList}>
          {upcoming.map((e) => {
            const Icon = SOURCE_ICON[e.source];
            return (
              <li key={e.id} className={css.eventItem}>
                <span className={css.eventIcon}>
                  <Icon size={14} strokeWidth={1.7} />
                </span>
                <div className={css.eventBody}>
                  <span className={css.eventTitle}>{e.title}</span>
                  <span className={css.eventMeta}>
                    {new Date(e.iso).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' · '}
                    {SOURCE_LABEL[e.source]}
                    {e.meta ? ` · ${e.meta}` : ''}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

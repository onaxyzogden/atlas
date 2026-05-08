/**
 * UpcomingEvents — surfaces communityEventStore entries within the next
 * 30 days. RSVP button is a placeholder (no mutation path); we surface
 * the list, not the network round-trip.
 */

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { useCommunityEventStore } from '../../../store/communityEventStore.js';
import css from './ActOpsAside.module.css';

interface Props {
  projectId: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  work_day: 'Work day',
  meetup: 'Meetup',
  harvest_share: 'Harvest share',
  tour: 'Tour',
};

export default function UpcomingEvents({ projectId }: Props) {
  const events = useCommunityEventStore((s) => s.events);

  const upcoming = useMemo(() => {
    if (!projectId) return [];
    const now = Date.now();
    const cutoff = now + 30 * 24 * 60 * 60 * 1000;
    return events
      .filter((e) => e.projectId === projectId)
      .map((e) => ({ ...e, ts: new Date(e.date).getTime() }))
      .filter((e) => !Number.isNaN(e.ts) && e.ts >= now && e.ts <= cutoff)
      .sort((a, b) => a.ts - b.ts)
      .slice(0, 4);
  }, [events, projectId]);

  const handleRsvp = () => {
    if (typeof window !== 'undefined') {
      window.alert('RSVP UI not yet wired — opens the Community Events module to manage attendees.');
    }
  };

  return (
    <section className={css.panel}>
      <header className={css.panelHeader}>
        <h3 className={css.panelTitle}>Upcoming Events</h3>
      </header>
      {upcoming.length === 0 ? (
        <p className={css.empty}>No events in the next 30 days.</p>
      ) : (
        <ul className={css.eventList}>
          {upcoming.map((e) => (
            <li key={e.id} className={css.eventItem}>
              <span className={css.eventIcon}>
                <Calendar size={14} strokeWidth={1.7} />
              </span>
              <div className={css.eventBody}>
                <span className={css.eventTitle}>{e.title}</span>
                <span className={css.eventMeta}>
                  {new Date(e.date).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' · '}
                  {TYPE_LABEL[e.type] ?? e.type}
                </span>
              </div>
              <button
                type="button"
                className={css.rsvpBtn}
                onClick={handleRsvp}
              >
                RSVP
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

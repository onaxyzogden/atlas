/**
 * RegenerationTimelineCard — §7 intervention-log surface on EcologicalDashboard.
 *
 * Lists regeneration_events for the active project (chronological, most recent
 * first), with an inline "Log event" disclosure form. Closes the remaining
 * manifest layer above migration 015 + the shared Zod schema.
 */

import { useState, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import type { RegenerationEvent } from '@ogden/shared';
import LogEventForm from './LogEventForm.js';
import { useRegenerationEventsForProject } from './useRegenerationEvents.js';
import css from './RegenerationTimeline.module.css';

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Props {
  project: LocalProject;
}

export default function RegenerationTimelineCard({ project }: Props) {
  const projectServerId = project.serverId ?? project.id;
  const state = useRegenerationEventsForProject(projectServerId);
  const [formOpen, setFormOpen] = useState(false);

  const events = state?.events ?? [];
  const parentById = useMemo(() => {
    const m = new Map<string, RegenerationEvent>();
    for (const e of events) m.set(e.id, e);
    return m;
  }, [events]);

  return (
    <div className={css.section}>
      <div className={css.headerRow}>
        <h3 className={css.sectionLabel}>REGENERATION TIMELINE</h3>
        {!formOpen && (
          <button className={css.logBtn} onClick={() => setFormOpen(true)} type="button">
            + Log event
          </button>
        )}
      </div>

      {formOpen && (
        <LogEventForm
          project={project}
          onSubmitted={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {state?.status === 'loading' && events.length === 0 ? (
        <div className={css.pendingCard}>Loading timeline…</div>
      ) : state?.status === 'error' ? (
        <div className={css.pendingCard}>
          Could not load events{state.error ? ` — ${state.error}` : ''}.
        </div>
      ) : events.length === 0 ? (
        <div className={css.pendingCard}>
          No regeneration events logged yet. Use "Log event" to capture observations, interventions, or milestones.
        </div>
      ) : (
        <div className={css.eventList}>
          {events.map((e) => <EventRow key={e.id} event={e} parent={e.parentEventId ? parentById.get(e.parentEventId) ?? null : null} />)}
        </div>
      )}
    </div>
  );
}

function EventRow({ event, parent }: { event: RegenerationEvent; parent: RegenerationEvent | null }) {
  const [expanded, setExpanded] = useState(false);

  const notes = event.notes ?? '';
  const needsTruncate = notes.length > 140;
  const displayNotes = needsTruncate && !expanded ? notes.slice(0, 140) + '…' : notes;

  return (
    <div className={css.eventRow}>
      <div className={css.eventHeader}>
        <span className={css.eventDate}>{formatDate(event.eventDate)}</span>
        <span className={`${css.chip} ${css[`chipType_${event.eventType}`] ?? ''}`}>
          {humanize(event.eventType)}
        </span>
        <span className={css.eventTitle}>{event.title}</span>
      </div>

      {event.parentEventId && (
        <div className={css.followChip}>
          ↳ follows {parent ? `"${parent.title}"` : 'earlier event'}
        </div>
      )}

      <div className={css.tagRow}>
        {event.interventionType && (
          <span className={css.tag}>{humanize(event.interventionType)}</span>
        )}
        {event.phase && <span className={css.tag}>Phase: {humanize(event.phase)}</span>}
        {event.progress && <span className={css.tag}>{humanize(event.progress)}</span>}
        {event.areaHa != null && <span className={css.tag}>{event.areaHa.toFixed(2)} ha</span>}
      </div>

      {notes && (
        <p className={css.eventNotes}>
          {displayNotes}
          {needsTruncate && (
            <button className={css.showMore} type="button" onClick={() => setExpanded((v) => !v)}>
              {expanded ? ' show less' : ' show more'}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

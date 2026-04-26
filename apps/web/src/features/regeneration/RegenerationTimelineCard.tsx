/**
 * RegenerationTimelineCard — §7 intervention-log surface on EcologicalDashboard.
 *
 * Lists regeneration_events for the active project (chronological, most recent
 * first), with an inline "Log event" disclosure form. Events linked via
 * parentEventId surface a "Log follow-up" / "Compare" action pair that drives
 * the side-by-side PhotoComparePane overlay.
 */

import { useState, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import type { RegenerationEvent } from '@ogden/shared';
import LogEventForm from './LogEventForm.js';
import PhotoComparePane from './PhotoComparePane.js';
import { useRegenerationEventsForProject } from './useRegenerationEvents.js';
import { useRegenerationEventStore } from '../../store/regenerationEventStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useProjectRole } from '../../hooks/useProjectRole.js';
import css from './RegenerationTimeline.module.css';

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(isoDate: string): string {
  // Parse YYYY-MM-DD as a *local* calendar date so "2026-04-23" doesn't get
  // shifted by the local offset when rendered (UTC midnight → previous day
  // in negative offsets). Falls through to Date constructor for full ISO.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Props {
  project: LocalProject;
}

export default function RegenerationTimelineCard({ project }: Props) {
  const projectServerId = project.serverId ?? project.id;
  const state = useRegenerationEventsForProject(projectServerId);
  const deleteEvent = useRegenerationEventStore((s) => s.deleteEvent);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const { canDelete } = useProjectRole(projectServerId);
  const [formOpen, setFormOpen] = useState(false);
  const [followUpParent, setFollowUpParent] = useState<RegenerationEvent | null>(null);
  const [editTarget, setEditTarget] = useState<RegenerationEvent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [comparePair, setComparePair] = useState<{ before: RegenerationEvent; after: RegenerationEvent } | null>(null);

  const events = state?.events ?? [];
  const parentById = useMemo(() => {
    const m = new Map<string, RegenerationEvent>();
    for (const e of events) m.set(e.id, e);
    return m;
  }, [events]);

  function canModify(ev: RegenerationEvent): boolean {
    return canDelete || (!!currentUserId && ev.authorId === currentUserId);
  }

  function startFollowUp(parent: RegenerationEvent) {
    setEditTarget(null);
    setFollowUpParent(parent);
    setFormOpen(true);
  }

  function startEdit(ev: RegenerationEvent) {
    setFollowUpParent(null);
    setEditTarget(ev);
    setFormOpen(true);
  }

  async function handleDelete(ev: RegenerationEvent) {
    if (!window.confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
    setDeletingId(ev.id);
    try {
      await deleteEvent(projectServerId, ev.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setFollowUpParent(null);
    setEditTarget(null);
  }

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
          parentEvent={followUpParent}
          onClearParent={() => setFollowUpParent(null)}
          editEvent={editTarget}
          onSubmitted={closeForm}
          onCancel={closeForm}
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
          {events.map((e) => {
            const parent = e.parentEventId ? parentById.get(e.parentEventId) ?? null : null;
            const canCompare = !!parent
              && (e.mediaUrls?.length ?? 0) > 0
              && (parent.mediaUrls?.length ?? 0) > 0;
            return (
              <EventRow
                key={e.id}
                event={e}
                parent={parent}
                onFollowUp={() => startFollowUp(e)}
                onCompare={canCompare && parent ? () => setComparePair({ before: parent, after: e }) : null}
                onEdit={canModify(e) ? () => startEdit(e) : null}
                onDelete={canModify(e) ? () => handleDelete(e) : null}
                deleting={deletingId === e.id}
              />
            );
          })}
        </div>
      )}

      {comparePair && (
        <PhotoComparePane
          before={comparePair.before}
          after={comparePair.after}
          onClose={() => setComparePair(null)}
        />
      )}
    </div>
  );
}

function EventRow({
  event,
  parent,
  onFollowUp,
  onCompare,
  onEdit,
  onDelete,
  deleting,
}: {
  event: RegenerationEvent;
  parent: RegenerationEvent | null;
  onFollowUp: () => void;
  onCompare: (() => void) | null;
  onEdit: (() => void) | null;
  onDelete: (() => void) | null;
  deleting: boolean;
}) {
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

      {event.mediaUrls && event.mediaUrls.length > 0 && (
        <div className={css.eventMedia}>
          {event.mediaUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className={css.eventMediaThumb}
            >
              <img src={url} alt="" />
            </a>
          ))}
        </div>
      )}

      <div className={css.rowActions}>
        <button type="button" className={css.rowActionBtn} onClick={onFollowUp} disabled={deleting}>
          Log follow-up
        </button>
        {onCompare && (
          <button type="button" className={css.rowActionBtn} onClick={onCompare} disabled={deleting}>
            Compare before / after
          </button>
        )}
        {onEdit && (
          <button type="button" className={css.rowActionBtn} onClick={onEdit} disabled={deleting}>
            Edit
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className={`${css.rowActionBtn} ${css.rowActionBtnDanger}`}
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}

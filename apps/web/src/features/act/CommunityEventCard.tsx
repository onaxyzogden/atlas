/**
 * CommunityEventCard — ACT-stage Module 4 (Social Permaculture).
 *
 * Work-days, meetups, harvest-shares, tours. Attendees come from
 * `networkStore.NetworkContact.id`, so the same address book powers both
 * the CRM and the events planner — a vendor or community contact added
 * once shows up everywhere.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useCommunityEventStore,
  type CommunityEvent,
  type CommunityEventType,
} from '../../store/communityEventStore.js';
import { useNetworkStore } from '../../store/networkStore.js';
import styles from './actCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const EVENT_TYPES: Array<{ value: CommunityEventType; label: string }> = [
  { value: 'work_day',      label: 'Work day' },
  { value: 'meetup',        label: 'Meetup' },
  { value: 'harvest_share', label: 'Harvest share' },
  { value: 'tour',          label: 'Tour' },
];

interface Draft {
  title: string;
  date: string;
  type: CommunityEventType;
  attendees: string[];
  notes: string;
}
function emptyDraft(): Draft {
  return { title: '', date: new Date().toISOString().slice(0, 10), type: 'work_day', attendees: [], notes: '' };
}

function newId() { return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export default function CommunityEventCard({ project }: Props) {
  const allEvents = useCommunityEventStore((s) => s.events);
  const addEvent = useCommunityEventStore((s) => s.addEvent);
  const removeEvent = useCommunityEventStore((s) => s.removeEvent);

  const allContacts = useNetworkStore((s) => s.contacts);
  const contacts = useMemo(
    () => allContacts.filter((c) => c.projectId === project.id),
    [allContacts, project.id],
  );
  const contactName = (id: string) => contacts.find((c) => c.id === id)?.name ?? '(removed)';

  const events = useMemo(
    () => allEvents.filter((e) => e.projectId === project.id).slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allEvents, project.id],
  );
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() => events.filter((e) => e.date >= todayIso), [events, todayIso]);
  const past     = useMemo(() => events.filter((e) => e.date <  todayIso), [events, todayIso]);

  const [draft, setDraft] = useState<Draft>(emptyDraft);

  function toggleAttendee(id: string) {
    setDraft((d) => ({
      ...d,
      attendees: d.attendees.includes(id) ? d.attendees.filter((a) => a !== id) : [...d.attendees, id],
    }));
  }

  function commit() {
    if (!draft.title.trim()) return;
    const entry: CommunityEvent = {
      id: newId(),
      projectId: project.id,
      title: draft.title.trim(),
      date: draft.date,
      type: draft.type,
      attendees: draft.attendees.length > 0 ? draft.attendees : undefined,
      notes: draft.notes.trim() || undefined,
    };
    addEvent(entry);
    setDraft(emptyDraft());
  }

  function renderRow(e: CommunityEvent) {
    return (
      <li key={e.id} className={styles.listRow}>
        <span>
          <strong>{e.title}</strong>
          <span className={styles.pill} style={{ marginLeft: 8 }}>{e.type.replace('_', ' ')}</span>
          <div className={styles.listMeta}>
            {e.date}
            {e.attendees && e.attendees.length > 0 && ` · ${e.attendees.length} attendees: ${e.attendees.map(contactName).join(', ')}`}
          </div>
          {e.notes && <div className={styles.listMeta}>{e.notes}</div>}
        </span>
        <button type="button" className={styles.removeBtn} onClick={() => removeEvent(e.id)}>Remove</button>
      </li>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Act · Module 4 — Community Events</span>
        <h1 className={styles.title}>Community Events Planner</h1>
        <p className={styles.lede}>
          Work-days, harvest shares, tours, meetups. Pull attendees from
          your network so contact info stays in one place and the chronology
          stays clear.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Schedule event</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Title</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Date</label>
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Type</label>
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as CommunityEventType })}>
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Attendees ({draft.attendees.length})</label>
            <div>
              {contacts.length === 0 ? (
                <span className={styles.listMeta}>No network contacts — add some on the Network CRM card.</span>
              ) : (
                contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`${styles.tag} ${draft.attendees.includes(c.id) ? styles.tagActive : ''}`}
                    onClick={() => toggleAttendee(c.id)}
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Notes</label>
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit} disabled={!draft.title.trim()}>
            Schedule
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p className={styles.empty}>Nothing scheduled.</p>
        ) : (
          <ul className={styles.list}>{upcoming.map(renderRow)}</ul>
        )}
      </section>

      {past.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Past ({past.length})</h2>
          <ul className={styles.list}>{past.map(renderRow)}</ul>
        </section>
      )}
    </div>
  );
}

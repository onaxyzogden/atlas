/**
 * MaintenanceLogCard — ACT-stage Module 2 (Maintenance & Operations):
 * tabular surface for the events captured by `MaintenanceLogTool` and
 * `ActStructurePopover.actions.startMaintenanceLog`.
 *
 * Where `MaintenanceScheduleCard` is the *plan* (recurring tasks the land
 * needs), this card is the *record* (what was actually done, when, on
 * which feature). Mirrors HarvestLogCard's structure across three source
 * kinds: earthworks (swale / drain), storage infra (cistern / pond), and
 * placed structures (barn / greenhouse / well / etc.).
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useMaintenanceLogStore,
  type MaintenanceEvent,
  type MaintenanceAction,
  type MaintenanceSourceKind,
} from '../../store/maintenanceLogStore.js';
import { useWaterSystemsStore } from '../../store/waterSystemsStore.js';
import { useAllStructures } from '../../store/builtEnvironmentSelectors.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const ACTIONS: MaintenanceAction[] = ['inspect', 'clear', 'repair', 'replace', 'flush'];

interface Draft {
  sourceKind: MaintenanceSourceKind;
  sourceId: string;
  date: string;
  action: MaintenanceAction;
  durationMin: string;
  who: string;
  notes: string;
}
function emptyDraft(): Draft {
  return {
    sourceKind: 'earthwork',
    sourceId: '',
    date: new Date().toISOString().slice(0, 10),
    action: 'inspect',
    durationMin: '',
    who: '',
    notes: '',
  };
}

function newId() { return `mnt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export default function MaintenanceLogCard({ project }: Props) {
  const allEvents = useMaintenanceLogStore((s) => s.events);
  const addEvent = useMaintenanceLogStore((s) => s.addEvent);
  const removeEvent = useMaintenanceLogStore((s) => s.removeEvent);

  const allEarthworks = useWaterSystemsStore((s) => s.earthworks);
  const allStorage = useWaterSystemsStore((s) => s.storageInfra);
  const allStructures = useAllStructures();

  const earthworks = useMemo(
    () => allEarthworks.filter((w) => w.projectId === project.id),
    [allEarthworks, project.id],
  );
  const storage = useMemo(
    () => allStorage.filter((s) => s.projectId === project.id),
    [allStorage, project.id],
  );
  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === project.id),
    [allStructures, project.id],
  );

  const sourceLabel = (kind: MaintenanceSourceKind, id: string): string => {
    if (kind === 'earthwork') {
      const w = earthworks.find((e) => e.id === id);
      return w ? `${w.type.replace('_', ' ')}` : '(deleted earthwork)';
    }
    if (kind === 'structure') {
      const s = structures.find((x) => x.id === id);
      if (!s) return '(deleted structure)';
      const tpl = STRUCTURE_TEMPLATES[s.type];
      return `${tpl.icon} ${s.name || tpl.label}`;
    }
    const s = storage.find((x) => x.id === id);
    return s ? `${s.type.replace('_', ' ')}` : '(deleted storage)';
  };

  const events = useMemo(
    () =>
      allEvents
        .filter((e) => e.projectId === project.id)
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allEvents, project.id],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, MaintenanceEvent[]>();
    events.forEach((e) => {
      const key = `${e.sourceKind}::${e.sourceId}`;
      const list = m.get(key) ?? [];
      list.push(e);
      m.set(key, list);
    });
    return Array.from(m.entries());
  }, [events]);

  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const sourceOptions =
    draft.sourceKind === 'earthwork'
      ? earthworks.map((w) => ({ id: w.id, label: w.type.replace('_', ' ') }))
      : draft.sourceKind === 'structure'
        ? structures.map((s) => {
            const tpl = STRUCTURE_TEMPLATES[s.type];
            return { id: s.id, label: `${tpl.icon} ${s.name || tpl.label}` };
          })
        : storage.map((s) => ({ id: s.id, label: s.type.replace('_', ' ') }));

  function commit() {
    if (!draft.sourceId) return;
    const minNum = draft.durationMin.trim();
    const durationMin =
      minNum !== '' && Number.isFinite(Number(minNum)) ? Number(minNum) : undefined;
    const event: MaintenanceEvent = {
      id: newId(),
      projectId: project.id,
      sourceKind: draft.sourceKind,
      sourceId: draft.sourceId,
      date: draft.date,
      action: draft.action,
      durationMin,
      who: draft.who.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    };
    addEvent(event);
    setDraft(emptyDraft());
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="act">
        <span className={styles.heroTag}>Act · Maintain — Event log</span>
        <h1 className={styles.title}>Maintenance Events</h1>
        <p className={styles.lede}>
          What was actually done, when, and on which feature. Pairs with
          the Maintenance schedule (the plan) to close the loop:
          schedule says &ldquo;swales clear quarterly&rdquo;, this log
          records &ldquo;cleared 2026-05-08, 25 min.&rdquo;
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Log event</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Feature kind</label>
            <select
              value={draft.sourceKind}
              onChange={(e) => setDraft({ ...draft, sourceKind: e.target.value as MaintenanceSourceKind, sourceId: '' })}
            >
              <option value="earthwork">Earthwork (swale / drain)</option>
              <option value="storage">Storage (cistern / pond)</option>
              <option value="structure">Structure (barn / greenhouse / well / …)</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Feature</label>
            <select value={draft.sourceId} onChange={(e) => setDraft({ ...draft, sourceId: e.target.value })}>
              <option value="">— select —</option>
              {sourceOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {sourceOptions.length === 0 && draft.sourceKind === 'earthwork' ? (
              <p className={styles.hint}>No earthworks drawn — add a swale or drain in Plan stage to log maintenance.</p>
            ) : null}
            {sourceOptions.length === 0 && draft.sourceKind === 'storage' ? (
              <p className={styles.hint}>No storage infrastructure placed — add a cistern or pond in Plan stage to log maintenance.</p>
            ) : null}
            {sourceOptions.length === 0 && draft.sourceKind === 'structure' ? (
              <p className={styles.hint}>No structures placed — add one in Plan stage to log structure maintenance.</p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label>Date</label>
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Action</label>
            <select value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value as MaintenanceAction })}>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Minutes</label>
            <input type="number" value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Who</label>
            <input type="text" value={draft.who} onChange={(e) => setDraft({ ...draft, who: e.target.value })} />
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Notes</label>
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit} disabled={!draft.sourceId}>
            Add event
          </button>
        </div>
      </section>

      {grouped.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>No maintenance events yet — log your first above, click an irrigation feature on the map with the &ldquo;Log water check&rdquo; tool, or click a placed structure and choose &ldquo;Log maintenance&rdquo;.</p>
        </section>
      ) : (
        grouped.map(([key, list]) => {
          const [kind, id] = key.split('::') as [MaintenanceSourceKind, string];
          const totalMin = list.reduce((acc, e) => acc + (e.durationMin ?? 0), 0);
          return (
            <section key={key} className={styles.section}>
              <h2 className={styles.sectionTitle}>{sourceLabel(kind, id)} ({list.length})</h2>
              <div className={styles.statRow}>
                <span>Total time</span>
                <span>{totalMin > 0 ? `${totalMin} min` : '—'}</span>
              </div>
              <table className={styles.table} style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th className={styles.num}>Minutes</th>
                    <th>Who</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id}>
                      <td>{e.date}</td>
                      <td>{e.action}</td>
                      <td className={styles.num}>{e.durationMin ?? '—'}</td>
                      <td>{e.who ?? ''}</td>
                      <td>{e.notes ?? ''}</td>
                      <td><button type="button" className={styles.removeBtn} onClick={() => removeEvent(e.id)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })
      )}
    </div>
  );
}

/**
 * AppropriateTechLogCard — ACT-stage Module 5 (Disaster Preparedness).
 *
 * Backup-systems registry: gravity water, solar generators, woodstoves,
 * radios, root cellars. Status moves planned → installed → tested (or
 * `failed` if the test reveals the system can't carry load). Items are
 * grouped by `system` so the steward sees resilience coverage at a glance
 * per resource axis (water / power / heat / comms / food storage).
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useAppropriateTechStore,
  type AppropriateTechItem,
  type AppropriateTechSystem,
  type AppropriateTechStatus,
} from '../../store/appropriateTechStore.js';
import styles from './actCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const SYSTEMS: Array<{ value: AppropriateTechSystem; label: string }> = [
  { value: 'water',        label: 'Water' },
  { value: 'power',        label: 'Power' },
  { value: 'heat',         label: 'Heat' },
  { value: 'comms',        label: 'Comms' },
  { value: 'food_storage', label: 'Food storage' },
];

const STATUSES: Array<{ value: AppropriateTechStatus; label: string; cls: string }> = [
  { value: 'planned',   label: 'Planned',   cls: styles.pillPlanned ?? '' },
  { value: 'installed', label: 'Installed', cls: styles.pillRunning ?? '' },
  { value: 'tested',    label: 'Tested',    cls: styles.pillSuccess ?? '' },
  { value: 'failed',    label: 'Failed',    cls: styles.pillFail ?? '' },
];

interface Draft {
  system: AppropriateTechSystem;
  title: string;
  description: string;
  status: AppropriateTechStatus;
}
const EMPTY_DRAFT: Draft = { system: 'water', title: '', description: '', status: 'planned' };

function newId() { return `at-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export default function AppropriateTechLogCard({ project }: Props) {
  const allItems = useAppropriateTechStore((s) => s.items);
  const addItem = useAppropriateTechStore((s) => s.addItem);
  const updateItem = useAppropriateTechStore((s) => s.updateItem);
  const removeItem = useAppropriateTechStore((s) => s.removeItem);

  const items = useMemo(
    () => allItems.filter((i) => i.projectId === project.id),
    [allItems, project.id],
  );

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function commit() {
    if (!draft.title.trim()) return;
    const entry: AppropriateTechItem = {
      id: newId(),
      projectId: project.id,
      system: draft.system,
      title: draft.title.trim(),
      description: draft.description.trim(),
      status: draft.status,
    };
    addItem(entry);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Act · Module 5 — Appropriate Technology</span>
        <h1 className={styles.title}>Appropriate-Tech Log</h1>
        <p className={styles.lede}>
          Every backup the site has — gravity water, solar generators,
          woodstove, radio, root cellar — with status. &ldquo;Tested&rdquo;
          beats &ldquo;installed&rdquo;: until you have actually run the
          system, you don&rsquo;t know if it works.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add system</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>System</label>
            <select value={draft.system} onChange={(e) => setDraft({ ...draft, system: e.target.value as AppropriateTechSystem })}>
              {SYSTEMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Title</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Status</label>
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as AppropriateTechStatus })}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Description</label>
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit} disabled={!draft.title.trim()}>
            Add system
          </button>
        </div>
      </section>

      {SYSTEMS.map((sys) => {
        const bucket = items.filter((i) => i.system === sys.value);
        if (bucket.length === 0) return null;
        return (
          <section key={sys.value} className={styles.section}>
            <h2 className={styles.sectionTitle}>{sys.label} ({bucket.length})</h2>
            <ul className={styles.list}>
              {bucket.map((it) => {
                const cur = STATUSES.find((s) => s.value === it.status);
                return (
                  <li key={it.id} className={styles.listRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>
                        <strong>{it.title}</strong>
                        {it.description && <div className={styles.listMeta}>{it.description}</div>}
                      </span>
                      <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        {STATUSES.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            className={`${styles.pill} ${it.status === s.value ? s.cls : ''}`}
                            onClick={() => updateItem(it.id, { status: s.value })}
                            style={{ cursor: 'pointer' }}
                          >
                            {s.label}
                          </button>
                        ))}
                        <button type="button" className={styles.removeBtn} onClick={() => removeItem(it.id)}>Remove</button>
                      </span>
                    </div>
                    <span className={styles.listMeta} aria-hidden>{cur?.label ?? it.status}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {items.length === 0 && (
        <section className={styles.section}>
          <p className={styles.empty}>No backup systems logged yet — add the first above.</p>
        </section>
      )}
    </div>
  );
}

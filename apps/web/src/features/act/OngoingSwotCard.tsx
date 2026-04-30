/**
 * OngoingSwotCard — ACT-stage Module 3 (Ecological Monitoring & Yield).
 *
 * SWOT is inherently continuous: as the system matures, strengths flip to
 * threats, opportunities harden into capabilities. The OBSERVE-stage
 * `SwotJournalCard` captures the first pass; this card extends it into a
 * dated, quarter-grouped log so the steward can flip through the project's
 * narrative arc over years.
 *
 * Reuses `siteAnnotationsStore.swot` rather than introducing a parallel
 * store — SWOT entries are the same shape regardless of stage. We carry
 * stage hint through tags (`tags: ['act']`) so OBSERVE and ACT views can
 * render distinct sets if needed without a schema migration.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSwotStore } from '../../store/swotStore.js';
import { newAnnotationId, type SwotEntry, type SwotBucket } from '../../store/site-annotations.js';
import styles from './actCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const BUCKETS: Array<{ value: SwotBucket; label: string }> = [
  { value: 'S', label: 'Strength' },
  { value: 'W', label: 'Weakness' },
  { value: 'O', label: 'Opportunity' },
  { value: 'T', label: 'Threat' },
];

interface Draft { bucket: SwotBucket; title: string; body: string; }
const EMPTY_DRAFT: Draft = { bucket: 'S', title: '', body: '' };

function quarterKey(iso: string): string {
  const d = new Date(iso);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()} · Q${q}`;
}

export default function OngoingSwotCard({ project }: Props) {
  const allSwot = useSwotStore((s) => s.swot);
  const addSwot = useSwotStore((s) => s.addSwot);
  const removeSwot = useSwotStore((s) => s.removeSwot);

  const swot = useMemo(
    () => allSwot.filter((e) => e.projectId === project.id).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [allSwot, project.id],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, SwotEntry[]>();
    swot.forEach((e) => {
      const k = quarterKey(e.createdAt);
      const list = m.get(k) ?? [];
      list.push(e);
      m.set(k, list);
    });
    return Array.from(m.entries());
  }, [swot]);

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function commit() {
    if (!draft.title.trim()) return;
    const entry: SwotEntry = {
      id: newAnnotationId('sw'),
      projectId: project.id,
      bucket: draft.bucket,
      title: draft.title.trim(),
      body: draft.body.trim() || undefined,
      tags: ['act'],
      createdAt: new Date().toISOString(),
    };
    addSwot(entry);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Act · Module 3 — Ongoing SWOT</span>
        <h1 className={styles.title}>Continuous SWOT Log</h1>
        <p className={styles.lede}>
          Permaculture systems do not stand still — what is a strength now
          may become a threat in three years. Append entries as they show
          up; the log groups itself by quarter.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Log entry</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Bucket</label>
            <select value={draft.bucket} onChange={(e) => setDraft({ ...draft, bucket: e.target.value as SwotBucket })}>
              {BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Title</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Detail</label>
            <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </div>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit} disabled={!draft.title.trim()}>
            Append entry
          </button>
        </div>
      </section>

      {grouped.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>No SWOT entries yet — append your first above.</p>
        </section>
      ) : (
        grouped.map(([q, entries]) => (
          <section key={q} className={styles.section}>
            <h2 className={styles.sectionTitle}>{q} ({entries.length})</h2>
            <ul className={styles.list}>
              {entries.map((e) => (
                <li key={e.id} className={styles.listRow}>
                  <span>
                    <span className={styles.pill} style={{ marginRight: 8 }}>{e.bucket}</span>
                    <strong>{e.title}</strong>
                    {e.body && <div className={styles.listMeta}>{e.body}</div>}
                    <div className={styles.listMeta}>{new Date(e.createdAt).toLocaleDateString()}</div>
                  </span>
                  <button type="button" className={styles.removeBtn} onClick={() => removeSwot(e.id)}>Remove</button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

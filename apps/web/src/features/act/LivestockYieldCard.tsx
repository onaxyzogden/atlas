/**
 * LivestockYieldCard — ACT-stage Livestock module: paddock-anchored yield log.
 *
 * Mirrors HarvestLogCard but reads `harvestLogStore` entries with
 * `sourceKind === 'livestock'` and groups them by paddockId. Eggs, milk,
 * meat, wool, honey — the things a paddock has actually given.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useHarvestLogStore,
  type HarvestEntry,
  type HarvestUnit,
  type HarvestQuality,
} from '../../store/harvestLogStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import styles from './actCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const UNITS: HarvestUnit[] = ['kg', 'lb', 'count', 'L'];
const QUALITIES: Array<{ value: HarvestQuality | ''; label: string }> = [
  { value: '',  label: '—' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
];

interface Draft {
  paddockId: string;
  date: string;
  quantity: string;
  unit: HarvestUnit;
  quality: HarvestQuality | '';
  notes: string;
}
function emptyDraft(): Draft {
  return {
    paddockId: '',
    date: new Date().toISOString().slice(0, 10),
    quantity: '',
    unit: 'count',
    quality: '',
    notes: '',
  };
}

function newId() { return `lvy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export default function LivestockYieldCard({ project }: Props) {
  const allEntries = useHarvestLogStore((s) => s.entries);
  const addEntry = useHarvestLogStore((s) => s.addEntry);
  const removeEntry = useHarvestLogStore((s) => s.removeEntry);

  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id),
    [allPaddocks, project.id],
  );
  const paddockName = (id: string | undefined) =>
    paddocks.find((p) => p.id === id)?.name ?? '(deleted paddock)';

  const entries = useMemo(
    () =>
      allEntries
        .filter((e) => e.projectId === project.id && e.sourceKind === 'livestock')
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allEntries, project.id],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, HarvestEntry[]>();
    entries.forEach((e) => {
      const key = e.paddockId ?? '';
      const list = m.get(key) ?? [];
      list.push(e);
      m.set(key, list);
    });
    return Array.from(m.entries());
  }, [entries]);

  const [draft, setDraft] = useState<Draft>(emptyDraft);

  function commit() {
    if (!draft.paddockId || !draft.quantity) return;
    const qty = parseFloat(draft.quantity);
    if (!Number.isFinite(qty)) return;
    const entry: HarvestEntry = {
      id: newId(),
      projectId: project.id,
      sourceKind: 'livestock',
      cropAreaId: '',
      paddockId: draft.paddockId,
      date: draft.date,
      quantity: qty,
      unit: draft.unit,
      quality: draft.quality || undefined,
      notes: draft.notes.trim() || undefined,
    };
    addEntry(entry);
    setDraft(emptyDraft());
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Act · Livestock — Yield log</span>
        <h1 className={styles.title}>Livestock Yield</h1>
        <p className={styles.lede}>
          Eggs, milk, meat, wool, honey — what each paddock has actually
          given. Totals roll up per paddock and per unit so a season&rsquo;s
          worth is one glance away.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Log yield</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Paddock</label>
            <select value={draft.paddockId} onChange={(e) => setDraft({ ...draft, paddockId: e.target.value })}>
              <option value="">— select —</option>
              {paddocks.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Date</label>
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Quantity</label>
            <input type="number" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Unit</label>
            <select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as HarvestUnit })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Quality</label>
            <select value={draft.quality} onChange={(e) => setDraft({ ...draft, quality: e.target.value as HarvestQuality | '' })}>
              {QUALITIES.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Notes</label>
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit} disabled={!draft.paddockId || !draft.quantity}>
            Add yield
          </button>
        </div>
      </section>

      {grouped.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>No livestock yields yet — log your first above, or click a paddock on the map with the Harvest tool.</p>
        </section>
      ) : (
        grouped.map(([pid, list]) => {
          const totals: Record<string, number> = {};
          list.forEach((e) => {
            totals[e.unit] = (totals[e.unit] ?? 0) + e.quantity;
          });
          return (
            <section key={pid || 'unassigned'} className={styles.section}>
              <h2 className={styles.sectionTitle}>{paddockName(pid)} ({list.length})</h2>
              <div className={styles.statRow}>
                <span>Totals</span>
                <span>{Object.entries(totals).map(([u, v]) => `${v} ${u}`).join(' · ')}</span>
              </div>
              <table className={styles.table} style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className={styles.num}>Quantity</th>
                    <th>Quality</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id}>
                      <td>{e.date}</td>
                      <td className={styles.num}>{e.quantity} {e.unit}</td>
                      <td>{e.quality ?? '—'}</td>
                      <td>{e.notes ?? ''}</td>
                      <td><button type="button" className={styles.removeBtn} onClick={() => removeEntry(e.id)}>Remove</button></td>
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

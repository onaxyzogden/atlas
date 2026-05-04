/**
 * HarvestLogCard — ACT-stage Module 3 (Ecological Monitoring & Yield).
 *
 * "Obtain a yield" — Holmgren P3. Per crop area, capture quantity, unit,
 * date, and (optional) quality grade. The list groups by crop area and
 * sums per unit (we deliberately do not auto-convert kg ↔ lb so the
 * steward sees what they actually weighed).
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useHarvestLogStore,
  type HarvestEntry,
  type HarvestUnit,
  type HarvestQuality,
} from '../../store/harvestLogStore.js';
import { useCropStore } from '../../store/cropStore.js';
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
  cropAreaId: string;
  date: string;
  quantity: string;
  unit: HarvestUnit;
  quality: HarvestQuality | '';
  notes: string;
}
function emptyDraft(): Draft {
  return {
    cropAreaId: '',
    date: new Date().toISOString().slice(0, 10),
    quantity: '',
    unit: 'kg',
    quality: '',
    notes: '',
  };
}

function newId() { return `hv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export default function HarvestLogCard({ project }: Props) {
  const allEntries = useHarvestLogStore((s) => s.entries);
  const addEntry = useHarvestLogStore((s) => s.addEntry);
  const removeEntry = useHarvestLogStore((s) => s.removeEntry);

  const allCrops = useCropStore((s) => s.cropAreas);
  const crops = useMemo(
    () => allCrops.filter((c) => c.projectId === project.id),
    [allCrops, project.id],
  );
  const cropName = (id: string) => crops.find((c) => c.id === id)?.name ?? '(deleted area)';

  const entries = useMemo(
    () => allEntries.filter((e) => e.projectId === project.id).slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allEntries, project.id],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, HarvestEntry[]>();
    entries.forEach((e) => {
      const list = m.get(e.cropAreaId) ?? [];
      list.push(e);
      m.set(e.cropAreaId, list);
    });
    return Array.from(m.entries());
  }, [entries]);

  const [draft, setDraft] = useState<Draft>(emptyDraft);

  function commit() {
    if (!draft.cropAreaId || !draft.quantity) return;
    const qty = parseFloat(draft.quantity);
    if (!Number.isFinite(qty)) return;
    const entry: HarvestEntry = {
      id: newId(),
      projectId: project.id,
      cropAreaId: draft.cropAreaId,
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
        <span className={styles.heroTag}>Act · Module 3 — Yield Tracking</span>
        <h1 className={styles.title}>Harvest Log</h1>
        <p className={styles.lede}>
          Track every basket, bucket, and bushel. Totals roll up per crop
          area and per unit so &ldquo;how much hazelnut did the windbreak
          give us?&rdquo; is one glance away.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Log harvest</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Crop area</label>
            <select value={draft.cropAreaId} onChange={(e) => setDraft({ ...draft, cropAreaId: e.target.value })}>
              <option value="">— select —</option>
              {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <button type="button" className={styles.btn} onClick={commit} disabled={!draft.cropAreaId || !draft.quantity}>
            Add harvest
          </button>
        </div>
      </section>

      {grouped.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>No harvests yet — log your first above.</p>
        </section>
      ) : (
        grouped.map(([cropId, list]) => {
          const totals: Record<string, number> = {};
          list.forEach((e) => {
            totals[e.unit] = (totals[e.unit] ?? 0) + e.quantity;
          });
          return (
            <section key={cropId} className={styles.section}>
              <h2 className={styles.sectionTitle}>{cropName(cropId)} ({list.length})</h2>
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

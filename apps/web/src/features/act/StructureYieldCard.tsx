/**
 * StructureYieldCard — ACT-stage Harvest module: structure-anchored yield log.
 *
 * Mirrors LivestockYieldCard but reads `harvestLogStore` entries with
 * `sourceKind === 'structure'` and groups them by structureId. Greenhouse
 * harvests are the pilot use-case; the card is structure-agnostic — any
 * future harvest-capable structure type (bee box, mushroom log array, ...)
 * surfaces here automatically via `getActionsForType`.
 *
 * Closes the deferred Phase 3 follow-up: structure-source entries from
 * the Act-stage popover (`ActStructurePopover.actions.startHarvestLog`)
 * previously fell into an empty-`cropAreaId` bucket and never rendered.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useHarvestLogStore,
  type HarvestEntry,
  type HarvestUnit,
  type HarvestQuality,
} from '../../store/harvestLogStore.js';
import { useAllStructures } from '../../store/builtEnvironmentSelectors.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import { getActionsForType } from '../../v3/act/data/structureActions.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const UNITS: HarvestUnit[] = ['kg', 'lb', 'count', 'L'];
const QUALITIES: Array<{ value: HarvestQuality | ''; label: string }> = [
  { value: '',  label: '—' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
];

interface Draft {
  structureId: string;
  date: string;
  quantity: string;
  unit: HarvestUnit;
  quality: HarvestQuality | '';
  notes: string;
}
function emptyDraft(): Draft {
  return {
    structureId: '',
    date: new Date().toISOString().slice(0, 10),
    quantity: '',
    unit: 'kg',
    quality: '',
    notes: '',
  };
}

function newId() { return `sty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export default function StructureYieldCard({ project }: Props) {
  const allEntries = useHarvestLogStore((s) => s.entries);
  const addEntry = useHarvestLogStore((s) => s.addEntry);
  const removeEntry = useHarvestLogStore((s) => s.removeEntry);

  const allStructures = useAllStructures();
  const structures = useMemo(
    () =>
      allStructures.filter(
        (s) =>
          s.projectId === project.id &&
          getActionsForType(s.type).includes('harvest'),
      ),
    [allStructures, project.id],
  );
  const structureLabel = (id: string | undefined) => {
    const s = structures.find((x) => x.id === id);
    if (!s) return '(deleted structure)';
    const tpl = STRUCTURE_TEMPLATES[s.type];
    return `${tpl.icon} ${s.name || tpl.label}`;
  };

  const entries = useMemo(
    () =>
      allEntries
        .filter((e) => e.projectId === project.id && e.sourceKind === 'structure')
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allEntries, project.id],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, HarvestEntry[]>();
    entries.forEach((e) => {
      const key = e.structureId ?? '';
      const list = m.get(key) ?? [];
      list.push(e);
      m.set(key, list);
    });
    return Array.from(m.entries());
  }, [entries]);

  const [draft, setDraft] = useState<Draft>(emptyDraft);

  function commit() {
    if (!draft.structureId || !draft.quantity) return;
    const qty = parseFloat(draft.quantity);
    if (!Number.isFinite(qty)) return;
    const entry: HarvestEntry = {
      id: newId(),
      projectId: project.id,
      sourceKind: 'structure',
      cropAreaId: '',
      structureId: draft.structureId,
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
      <header className={styles.hero} data-stage="act">
        <span className={styles.heroTag}>Act · Harvest — Structure yield</span>
        <h1 className={styles.title}>Structure Yield</h1>
        <p className={styles.lede}>
          Greenhouse harvests and other structure-anchored yields. Totals
          roll up per structure and per unit so a season&rsquo;s worth is
          one glance away.
        </p>
      </header>

      {structures.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>
            No harvest-capable structures placed — add a greenhouse in
            Plan stage to log structure yield.
          </p>
        </section>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Log yield</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Structure</label>
              <select
                value={draft.structureId}
                onChange={(e) => setDraft({ ...draft, structureId: e.target.value })}
              >
                <option value="">— select —</option>
                {structures.map((s) => {
                  const tpl = STRUCTURE_TEMPLATES[s.type];
                  return (
                    <option key={s.id} value={s.id}>
                      {tpl.icon} {s.name || tpl.label}
                    </option>
                  );
                })}
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
            <button
              type="button"
              className={styles.btn}
              onClick={commit}
              disabled={!draft.structureId || !draft.quantity}
            >
              Add yield
            </button>
          </div>
        </section>
      )}

      {grouped.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>
            No structure yields yet — log your first above, or click a
            greenhouse on the map and choose &ldquo;Log harvest&rdquo;.
          </p>
        </section>
      ) : (
        grouped.map(([sid, list]) => {
          const totals: Record<string, number> = {};
          list.forEach((e) => {
            totals[e.unit] = (totals[e.unit] ?? 0) + e.quantity;
          });
          return (
            <section key={sid || 'unassigned'} className={styles.section}>
              <h2 className={styles.sectionTitle}>{structureLabel(sid)} ({list.length})</h2>
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

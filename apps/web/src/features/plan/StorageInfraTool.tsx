/**
 * StorageInfraTool — PLAN Module 2.
 *
 * Place water-storage infrastructure — cisterns, ponds, rain gardens —
 * as point annotations. v1 captures type + capacity + optional center
 * coords; future v2 wires drag-drop on the map.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useWaterSystemsStore } from '../../store/waterSystemsStore.js';
import { newAnnotationId, type StorageInfra, type StorageInfraType } from '../../store/site-annotations.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const TYPES: Array<{ value: StorageInfraType; label: string }> = [
  { value: 'cistern',     label: 'Cistern' },
  { value: 'pond',        label: 'Pond' },
  { value: 'rain_garden', label: 'Rain garden' },
];

export default function StorageInfraTool({ project }: Props) {
  const all = useWaterSystemsStore((s) => s.storageInfra);
  const add = useWaterSystemsStore((s) => s.addStorageInfra);
  const remove = useWaterSystemsStore((s) => s.removeStorageInfra);

  const items = useMemo(() => all.filter((i) => i.projectId === project.id), [all, project.id]);

  const [type, setType] = useState<StorageInfraType>('cistern');
  const [capacityL, setCapacityL] = useState<number>(5000);
  const [notes, setNotes] = useState<string>('');

  function commit() {
    const i: StorageInfra = {
      id: newAnnotationId('stg'),
      projectId: project.id,
      type,
      center: [0, 0],
      capacityL: capacityL > 0 ? capacityL : undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    add(i);
    setCapacityL(5000);
    setNotes('');
  }

  const totalCap = useMemo(() => items.reduce((s, i) => s + (i.capacityL ?? 0), 0), [items]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 2 · Water</span>
        <h1 className={styles.title}>Water storage placements</h1>
        <p className={styles.lede}>
          Cisterns, ponds, and rain gardens. Capacity is in litres; aggregate
          capacity tells you how many days of dry-season demand the system
          can buffer when paired with the runoff calculator.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add storage point</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as StorageInfraType)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Capacity (L)</span>
            <input type="number" min={0} step={100} value={capacityL}
              onChange={(e) => setCapacityL(Number(e.target.value) || 0)} />
          </label>
          <label className={`${styles.field} ${styles.full}`}>
            <span>Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit}>Add storage</button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Storage rollup</h2>
        <div className={styles.statRow}><span>Storage points</span><span>{items.length}</span></div>
        <div className={styles.statRow}><span>Total capacity</span><span>{totalCap.toLocaleString()} L</span></div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Logged storage</h2>
        {items.length === 0 ? (
          <p className={styles.empty}>No storage logged yet.</p>
        ) : (
          <ul className={styles.list}>
            {items.map((i) => (
              <li key={i.id} className={styles.listRow}>
                <div>
                  <strong>{TYPES.find((t) => t.value === i.type)?.label ?? i.type}</strong>
                  <div className={styles.listMeta}>
                    {i.capacityL ? `${i.capacityL.toLocaleString()} L` : 'no capacity given'}
                    {i.notes ? ` · ${i.notes}` : ''}
                  </div>
                </div>
                <button type="button" className={styles.removeBtn} onClick={() => remove(i.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

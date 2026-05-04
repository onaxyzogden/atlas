/**
 * SoilFertilityDesignerCard — PLAN Module 5.
 *
 * Place soil-fertility infrastructure (composters, hugelkultur beds,
 * biochar kilns, worm bins) as point annotations. Persists into
 * `siteAnnotationsStore.fertilityInfra`.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import { newAnnotationId, type FertilityInfra, type FertilityInfraType } from '../../store/site-annotations.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const TYPES: Array<{ value: FertilityInfraType; label: string; tagline: string }> = [
  { value: 'composter',  label: 'Composter',   tagline: 'Aerobic kitchen + yard waste loop' },
  { value: 'hugelkultur', label: 'Hugelkultur', tagline: 'Buried-wood mounded bed' },
  { value: 'biochar',    label: 'Biochar kiln', tagline: 'Pyrolysed carbon for soil amendment' },
  { value: 'worm_bin',   label: 'Worm bin',    tagline: 'Vermicompost loop' },
];

export default function SoilFertilityDesignerCard({ project }: Props) {
  const all = useClosedLoopStore((s) => s.fertilityInfra);
  const add = useClosedLoopStore((s) => s.addFertilityInfra);
  const remove = useClosedLoopStore((s) => s.removeFertilityInfra);

  const items = useMemo(() => all.filter((i) => i.projectId === project.id), [all, project.id]);

  const [type, setType] = useState<FertilityInfraType>('composter');
  const [scale, setScale] = useState('');
  const [notes, setNotes] = useState('');

  function commit() {
    const i: FertilityInfra = {
      id: newAnnotationId('fi'),
      projectId: project.id,
      type,
      center: [0, 0],
      scaleNote: scale.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    add(i);
    setScale('');
    setNotes('');
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) c[i.type] = (c[i.type] ?? 0) + 1;
    return c;
  }, [items]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 5 · Soil Fertility</span>
        <h1 className={styles.title}>Soil fertility designer</h1>
        <p className={styles.lede}>
          Composters, hugelkultur beds, biochar, worm bins. Place each as
          a node so the Waste Vector tool can connect them into closed
          nutrient loops.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Coverage</h2>
        {TYPES.map((t) => (
          <div key={t.value} className={styles.statRow}>
            <span>{t.label} <span className={styles.listMeta}>· {t.tagline}</span></span>
            <span>{counts[t.value] ?? 0}</span>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add fertility infrastructure</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as FertilityInfraType)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Scale (optional)</span>
            <input value={scale} onChange={(e) => setScale(e.target.value)} placeholder="e.g. 3 m³ pile" />
          </label>
          <label className={`${styles.field} ${styles.full}`}>
            <span>Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit}>Add unit</button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Logged units ({items.length})</h2>
        {items.length === 0 ? (
          <p className={styles.empty}>None yet.</p>
        ) : (
          <ul className={styles.list}>
            {items.map((i) => (
              <li key={i.id} className={styles.listRow}>
                <div>
                  <strong>{TYPES.find((t) => t.value === i.type)?.label ?? i.type}</strong>
                  <div className={styles.listMeta}>
                    {i.scaleNote ?? 'no scale given'}
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

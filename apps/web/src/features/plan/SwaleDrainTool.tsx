/**
 * SwaleDrainTool — PLAN Module 2.
 *
 * v1 form-based editor: capture earthworks (swale / diversion / french
 * drain) as length-only line annotations. Map-draw integration is
 * deferred — the store shape already accepts a `GeoJSON.LineString` so
 * a future v2 can wire MapboxDraw without a schema change.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useWaterSystemsStore } from '../../store/waterSystemsStore.js';
import { newAnnotationId, type Earthwork, type EarthworkType } from '../../store/site-annotations.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const TYPES: Array<{ value: EarthworkType; label: string }> = [
  { value: 'swale',         label: 'Swale (on-contour)' },
  { value: 'diversion',     label: 'Diversion drain' },
  { value: 'french_drain',  label: 'French drain' },
];

export default function SwaleDrainTool({ project }: Props) {
  const all = useWaterSystemsStore((s) => s.earthworks);
  const add = useWaterSystemsStore((s) => s.addEarthwork);
  const remove = useWaterSystemsStore((s) => s.removeEarthwork);

  const items = useMemo(() => all.filter((e) => e.projectId === project.id), [all, project.id]);

  const [type, setType] = useState<EarthworkType>('swale');
  const [lengthM, setLengthM] = useState<number>(20);
  const [notes, setNotes] = useState<string>('');

  function commit() {
    if (lengthM <= 0) return;
    const e: Earthwork = {
      id: newAnnotationId('ew'),
      projectId: project.id,
      type,
      // Placeholder geometry: a 0-length line at project center; live map
      // drawing lands in v2. Until then the steward edits length manually.
      geometry: { type: 'LineString', coordinates: [[0, 0], [0, 0]] },
      lengthM,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    add(e);
    setLengthM(20);
    setNotes('');
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 2 · Water</span>
        <h1 className={styles.title}>Swale &amp; drain log</h1>
        <p className={styles.lede}>
          Record on-contour swales, diversion drains, and french drains.
          Captured as length-only annotations for v1; map drawing arrives
          in a follow-up.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add earthwork</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as EarthworkType)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Length (m)</span>
            <input type="number" min={0} step={1} value={lengthM}
              onChange={(e) => setLengthM(Number(e.target.value) || 0)} />
          </label>
          <label className={`${styles.field} ${styles.full}`}>
            <span>Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit} disabled={lengthM <= 0}>
            Add earthwork
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Logged earthworks</h2>
        {items.length === 0 ? (
          <p className={styles.empty}>No earthworks logged yet.</p>
        ) : (
          <ul className={styles.list}>
            {items.map((e) => (
              <li key={e.id} className={styles.listRow}>
                <div>
                  <strong>{TYPES.find((t) => t.value === e.type)?.label ?? e.type}</strong>
                  <div className={styles.listMeta}>
                    {e.lengthM} m · {new Date(e.createdAt).toLocaleDateString()}
                    {e.notes ? ` · ${e.notes}` : ''}
                  </div>
                </div>
                <button type="button" className={styles.removeBtn} onClick={() => remove(e.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

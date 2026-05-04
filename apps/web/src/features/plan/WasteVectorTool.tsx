/**
 * WasteVectorTool — PLAN Module 5.
 *
 * Captures waste-to-resource flows as labelled directed edges between
 * any two existing on-project features (zones, structures, fertility
 * units, crop areas). The picker pulls from all stores so the steward
 * can connect e.g. "kitchen → chickens → orchard" in two clicks.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import { newAnnotationId, type WasteVector, type WasteResourceType } from '../../store/site-annotations.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useCropStore } from '../../store/cropStore.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const RESOURCE_TYPES: Array<{ value: WasteResourceType; label: string }> = [
  { value: 'organic_matter', label: 'Organic matter' },
  { value: 'manure',         label: 'Manure' },
  { value: 'greywater',      label: 'Greywater' },
  { value: 'compost',        label: 'Compost' },
];

export default function WasteVectorTool({ project }: Props) {
  const allVectors = useClosedLoopStore((s) => s.wasteVectors);
  const allFertility = useClosedLoopStore((s) => s.fertilityInfra);
  const addVector = useClosedLoopStore((s) => s.addWasteVector);
  const removeVector = useClosedLoopStore((s) => s.removeWasteVector);

  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useStructureStore((s) => s.structures);
  const allCrops = useCropStore((s) => s.cropAreas);

  const vectors = useMemo(() => allVectors.filter((v) => v.projectId === project.id), [allVectors, project.id]);
  const featureOptions = useMemo(() => {
    const pId = project.id;
    const out: Array<{ id: string; label: string }> = [];
    for (const z of allZones) if (z.projectId === pId) out.push({ id: z.id, label: `Zone · ${z.name || z.category}` });
    for (const s of allStructures) if (s.projectId === pId) out.push({ id: s.id, label: `Structure · ${s.name || s.type}` });
    for (const c of allCrops) if (c.projectId === pId) out.push({ id: c.id, label: `Crop · ${(c as { name?: string }).name ?? 'crop area'}` });
    for (const f of allFertility) if (f.projectId === pId) out.push({ id: f.id, label: `Fertility · ${f.type}${f.scaleNote ? ` (${f.scaleNote})` : ''}` });
    return out;
  }, [project.id, allZones, allStructures, allCrops, allFertility]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [label, setLabel] = useState('');
  const [resource, setResource] = useState<WasteResourceType>('organic_matter');

  function commit() {
    if (!from || !to || from === to || !label.trim()) return;
    const v: WasteVector = {
      id: newAnnotationId('wv'),
      projectId: project.id,
      fromFeatureId: from,
      toFeatureId: to,
      label: label.trim(),
      resourceType: resource,
      createdAt: new Date().toISOString(),
    };
    addVector(v);
    setLabel('');
  }

  function featureLabel(id: string): string {
    return featureOptions.find((f) => f.id === id)?.label ?? `(removed ${id.slice(0, 6)})`;
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 5 · Soil Fertility</span>
        <h1 className={styles.title}>Waste-to-resource vectors</h1>
        <p className={styles.lede}>
          Connect features that produce a waste stream to those that
          consume it as input. The classic example: kitchen → chicken
          coop → composter → orchard.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add vector</h2>
        {featureOptions.length < 2 ? (
          <p className={styles.empty}>
            Add at least two features (zones / structures / fertility units / crops) to draw vectors between them.
          </p>
        ) : (
          <>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>From feature</span>
                <select value={from} onChange={(e) => setFrom(e.target.value)}>
                  <option value="">— choose —</option>
                  {featureOptions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>To feature</span>
                <select value={to} onChange={(e) => setTo(e.target.value)}>
                  <option value="">— choose —</option>
                  {featureOptions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Resource type</span>
                <select value={resource} onChange={(e) => setResource(e.target.value as WasteResourceType)}>
                  {RESOURCE_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Label</span>
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. weekly bucket run" />
              </label>
            </div>
            <div className={styles.btnRow}>
              <button type="button" className={styles.btn} onClick={commit}
                disabled={!from || !to || from === to || !label.trim()}>
                Add vector
              </button>
            </div>
          </>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Vectors ({vectors.length})</h2>
        {vectors.length === 0 ? (
          <p className={styles.empty}>None yet.</p>
        ) : (
          <ul className={styles.list}>
            {vectors.map((v) => (
              <li key={v.id} className={styles.listRow}>
                <div>
                  <strong>{v.label}</strong>
                  <div className={styles.listMeta}>
                    {featureLabel(v.fromFeatureId)} → {featureLabel(v.toFeatureId)} · {v.resourceType}
                  </div>
                </div>
                <button type="button" className={styles.removeBtn} onClick={() => removeVector(v.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * WasteVectorListView — authoring form + flat list of MaterialFlow records.
 *
 * Extracted from WasteVectorTool on 2026-05-21 so the parent tool can host a
 * List / Dashboard segmented control. Behaviour preserved verbatim.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useClosedLoopStore,
  MATERIAL_KIND_CONFIG,
  type MaterialFlow,
  type MaterialKind,
} from '../../store/closedLoopStore.js';
import { newAnnotationId } from '../../store/site-annotations.js';
import { useFlowEndpointOptions } from './useFlowEndpointOptions.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
}

const RESOURCE_TYPES: Array<{ value: MaterialKind; label: string }> = [
  { value: 'organic_matter', label: 'Organic matter' },
  { value: 'manure',         label: 'Manure' },
  { value: 'greywater',      label: 'Greywater' },
  { value: 'compost',        label: 'Compost' },
];

export default function WasteVectorListView({ project }: Props) {
  const allFlows = useClosedLoopStore((s) => s.materialFlows);
  const addFlow = useClosedLoopStore((s) => s.addMaterialFlow);
  const removeFlow = useClosedLoopStore((s) => s.removeMaterialFlow);

  const vectors = useMemo(
    () => allFlows.filter((v) => v.projectId === project.id),
    [allFlows, project.id],
  );
  const featureOptions = useFlowEndpointOptions(project.id);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [label, setLabel] = useState('');
  const [resource, setResource] = useState<MaterialKind>('organic_matter');

  function commit() {
    if (!from || !to || from === to || !label.trim()) return;
    const v: MaterialFlow = {
      id: newAnnotationId('wv'),
      projectId: project.id,
      label: label.trim(),
      materialKind: resource,
      sourceId: from,
      sinkId: to,
      origin: 'list',
      color: MATERIAL_KIND_CONFIG[resource].color,
      createdAt: new Date().toISOString(),
    };
    addFlow(v);
    setLabel('');
  }

  function featureLabel(id: string): string {
    return featureOptions.find((f) => f.id === id)?.label ?? `(removed ${id.slice(0, 6)})`;
  }

  return (
    <>
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
                <select value={resource} onChange={(e) => setResource(e.target.value as MaterialKind)}>
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
                    {featureLabel(v.sourceId ?? '')} → {featureLabel(v.sinkId ?? '')} · {v.materialKind}
                  </div>
                </div>
                <button type="button" className={styles.removeBtn} onClick={() => removeFlow(v.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

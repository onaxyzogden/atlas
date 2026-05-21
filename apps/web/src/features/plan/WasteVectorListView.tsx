/**
 * WasteVectorListView — authoring form + flat list of MaterialFlow records.
 *
 * Extracted from WasteVectorTool on 2026-05-21 so the parent tool can host a
 * List / Dashboard segmented control. Behaviour preserved verbatim.
 *
 * 2026-05-21 (Phase 2): added optional "Quantities" sub-section so the
 * dashboard's KPI strip + stream inventory have a data source. All six fields
 * are optional; the form's first-load experience is unchanged because the
 * sub-section is collapsed by default.
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

/** Parse a form input to a positive number. Returns undefined for empty / NaN /
 *  zero / negative — that's the signal to omit the field from the persisted
 *  MaterialFlow so legacy flows and "I don't have a number yet" stay distinct. */
function parsePositive(s: string): number | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

/** First non-undefined throughput value with a label, for the list-row meta column. */
function quantitySummary(v: MaterialFlow): string | null {
  if (v.massKgPerMonth !== undefined)    return `${v.massKgPerMonth} kg/mo`;
  if (v.volumeLPerMonth !== undefined)   return `${v.volumeLPerMonth} L/mo`;
  if (v.energyKwhPerMonth !== undefined) return `${v.energyKwhPerMonth} kWh/mo`;
  return null;
}

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

  // Optional quantity inputs — kept as strings so empty / partially-typed
  // values round-trip naturally; parsePositive() filters them on submit.
  const [qMass,   setQMass]   = useState('');
  const [qVolume, setQVolume] = useState('');
  const [qEnergy, setQEnergy] = useState('');
  const [qN,      setQN]      = useState('');
  const [qP,      setQP]      = useState('');
  const [qK,      setQK]      = useState('');

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
      massKgPerMonth:      parsePositive(qMass),
      volumeLPerMonth:     parsePositive(qVolume),
      energyKwhPerMonth:   parsePositive(qEnergy),
      nutrientNKgPerMonth: parsePositive(qN),
      nutrientPKgPerMonth: parsePositive(qP),
      nutrientKKgPerMonth: parsePositive(qK),
      createdAt: new Date().toISOString(),
    };
    addFlow(v);
    setLabel('');
    setQMass('');
    setQVolume('');
    setQEnergy('');
    setQN('');
    setQP('');
    setQK('');
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

            <details style={{ marginTop: 12 }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'rgba(232, 220, 200, 0.6)',
                  padding: '6px 0',
                }}
              >
                Quantities (optional)
              </summary>
              <div className={styles.grid} style={{ marginTop: 8 }}>
                <label className={styles.field}>
                  <span>Mass (kg / mo)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={qMass}
                    onChange={(e) => setQMass(e.target.value)}
                    placeholder="e.g. 245"
                  />
                </label>
                <label className={styles.field}>
                  <span>Volume (L / mo)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={qVolume}
                    onChange={(e) => setQVolume(e.target.value)}
                    placeholder="e.g. 1800"
                  />
                </label>
                <label className={styles.field}>
                  <span>Energy (kWh / mo)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={qEnergy}
                    onChange={(e) => setQEnergy(e.target.value)}
                    placeholder="e.g. 95"
                  />
                </label>
                <label className={styles.field}>
                  <span>N (kg / mo)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={qN}
                    onChange={(e) => setQN(e.target.value)}
                    placeholder="e.g. 1.2"
                  />
                </label>
                <label className={styles.field}>
                  <span>P (kg / mo)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={qP}
                    onChange={(e) => setQP(e.target.value)}
                    placeholder="e.g. 0.4"
                  />
                </label>
                <label className={styles.field}>
                  <span>K (kg / mo)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={qK}
                    onChange={(e) => setQK(e.target.value)}
                    placeholder="e.g. 0.8"
                  />
                </label>
              </div>
            </details>

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
            {vectors.map((v) => {
              const qty = quantitySummary(v);
              return (
                <li key={v.id} className={styles.listRow}>
                  <div>
                    <strong>{v.label}</strong>
                    <div className={styles.listMeta}>
                      {featureLabel(v.sourceId ?? '')} → {featureLabel(v.sinkId ?? '')} · {v.materialKind}
                      {qty ? <> · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{qty}</span></> : null}
                    </div>
                  </div>
                  <button type="button" className={styles.removeBtn} onClick={() => removeFlow(v.id)}>Remove</button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

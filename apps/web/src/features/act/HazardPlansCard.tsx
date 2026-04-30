/**
 * HazardPlansCard — ACT-stage Module 5 (Disaster Preparedness).
 *
 * Reads `siteAnnotationsStore.hazards` (populated in OBSERVE) and lets the
 * steward extend each hazard with concrete `mitigationSteps` and
 * `linkedFeatureIds` (zones / structures / appropriate-tech items).
 * Writes through `updateHazard`.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useExternalForcesStore } from '../../store/externalForcesStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useAppropriateTechStore } from '../../store/appropriateTechStore.js';
import styles from './actCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

export default function HazardPlansCard({ project }: Props) {
  const allHazards = useExternalForcesStore((s) => s.hazards);
  const updateHazard = useExternalForcesStore((s) => s.updateHazard);

  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useStructureStore((s) => s.structures);
  const allTech = useAppropriateTechStore((s) => s.items);

  const hazards = useMemo(
    () => allHazards.filter((h) => h.projectId === project.id),
    [allHazards, project.id],
  );
  const features = useMemo(() => {
    const fs: Array<{ id: string; label: string }> = [];
    allZones.filter((z) => z.projectId === project.id).forEach((z) => fs.push({ id: z.id, label: `Zone · ${z.name}` }));
    allStructures.filter((s) => s.projectId === project.id).forEach((s) => fs.push({ id: s.id, label: `Structure · ${s.name}` }));
    allTech.filter((i) => i.projectId === project.id).forEach((i) => fs.push({ id: i.id, label: `Tech · ${i.title}` }));
    return fs;
  }, [allZones, allStructures, allTech, project.id]);
  const featureLabel = (id: string) => features.find((f) => f.id === id)?.label ?? id;

  // Per-hazard local draft for the next mitigation step input.
  const [stepDrafts, setStepDrafts] = useState<Record<string, string>>({});

  function addStep(hazardId: string) {
    const txt = (stepDrafts[hazardId] ?? '').trim();
    if (!txt) return;
    const h = hazards.find((x) => x.id === hazardId);
    if (!h) return;
    updateHazard(hazardId, { mitigationSteps: [...(h.mitigationSteps ?? []), txt] });
    setStepDrafts((m) => ({ ...m, [hazardId]: '' }));
  }
  function removeStep(hazardId: string, idx: number) {
    const h = hazards.find((x) => x.id === hazardId);
    if (!h) return;
    const next = (h.mitigationSteps ?? []).slice();
    next.splice(idx, 1);
    updateHazard(hazardId, { mitigationSteps: next });
  }
  function toggleFeature(hazardId: string, featureId: string) {
    const h = hazards.find((x) => x.id === hazardId);
    if (!h) return;
    const cur = h.linkedFeatureIds ?? [];
    const next = cur.includes(featureId) ? cur.filter((x) => x !== featureId) : [...cur, featureId];
    updateHazard(hazardId, { linkedFeatureIds: next });
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Act · Module 5 — Disaster Preparedness</span>
        <h1 className={styles.title}>Hazard Action Plans</h1>
        <p className={styles.lede}>
          Each OBSERVE-stage hazard becomes a worksheet here. Write the
          concrete steps, link the features that participate in mitigation,
          and the system has a plan ready before the storm hits.
        </p>
      </header>

      {hazards.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>
            No hazards logged yet — add them in OBSERVE → Hazards Log.
          </p>
        </section>
      ) : (
        hazards.map((h) => (
          <section key={h.id} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {h.type.replace('_', ' ')} · {h.date}
              {h.severity && <span className={styles.pill} style={{ marginLeft: 8 }}>{h.severity}</span>}
            </h2>
            {h.description && <p className={styles.sectionBody}>{h.description}</p>}

            <h3 className={styles.listMeta} style={{ marginTop: 12, marginBottom: 6 }}>Mitigation steps</h3>
            <ul className={styles.list}>
              {(h.mitigationSteps ?? []).map((step, idx) => (
                <li key={idx} className={styles.listRow}>
                  <span>{step}</span>
                  <button type="button" className={styles.removeBtn} onClick={() => removeStep(h.id, idx)}>Remove</button>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                placeholder="Add a step…"
                value={stepDrafts[h.id] ?? ''}
                onChange={(e) => setStepDrafts((m) => ({ ...m, [h.id]: e.target.value }))}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  padding: '8px 10px',
                  color: 'rgba(232,220,200,0.9)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                }}
              />
              <button type="button" className={styles.btn} onClick={() => addStep(h.id)}>Add step</button>
            </div>

            <h3 className={styles.listMeta} style={{ marginTop: 16, marginBottom: 6 }}>
              Linked features ({(h.linkedFeatureIds ?? []).length})
            </h3>
            {features.length === 0 ? (
              <span className={styles.listMeta}>No zones, structures, or appropriate-tech items yet.</span>
            ) : (
              <div>
                {features.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`${styles.tag} ${(h.linkedFeatureIds ?? []).includes(f.id) ? styles.tagActive : ''}`}
                    onClick={() => toggleFeature(h.id, f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            {(h.linkedFeatureIds ?? []).length > 0 && (
              <div className={styles.listMeta} style={{ marginTop: 8 }}>
                Active links: {(h.linkedFeatureIds ?? []).map(featureLabel).join(' · ')}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}

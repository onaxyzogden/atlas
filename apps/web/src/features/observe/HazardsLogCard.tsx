/**
 * HazardsLogCard — Phase 4b OBSERVE surface (Module 2: Macroclimate & Hazards).
 *
 * Steward-captured historical hazard events that complement the FEMA / climate
 * layer reads on the SolarClimateDashboard. Persists via
 * useExternalForcesStore.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useExternalForcesStore } from '../../store/externalForcesStore.js';
import { newAnnotationId, type HazardEvent, type HazardType, type HazardSeverity } from '../../store/site-annotations.js';
import styles from './StewardSurveyCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const HAZARD_TYPES: Array<{ value: HazardType; label: string }> = [
  { value: 'hurricane',   label: 'Hurricane' },
  { value: 'tornado',     label: 'Tornado' },
  { value: 'ice_storm',   label: 'Ice storm' },
  { value: 'blizzard',    label: 'Blizzard' },
  { value: 'flood',       label: 'Flood' },
  { value: 'wildfire',    label: 'Wildfire' },
  { value: 'lightning',   label: 'Lightning' },
  { value: 'earthquake',  label: 'Earthquake' },
  { value: 'drought',     label: 'Drought' },
  { value: 'other',       label: 'Other' },
];

const SEVERITIES: Array<{ value: HazardSeverity; label: string }> = [
  { value: 'low',          label: 'Low' },
  { value: 'med',          label: 'Medium' },
  { value: 'high',         label: 'High' },
  { value: 'catastrophic', label: 'Catastrophic' },
];

interface DraftHazard {
  type: HazardType;
  date: string;
  severity: HazardSeverity | '';
  description: string;
}

const EMPTY_DRAFT: DraftHazard = { type: 'flood', date: '', severity: '', description: '' };

export default function HazardsLogCard({ project }: Props) {
  const allHazards = useExternalForcesStore((s) => s.hazards);
  const addHazard = useExternalForcesStore((s) => s.addHazard);
  const removeHazard = useExternalForcesStore((s) => s.removeHazard);

  const hazards = useMemo(
    () =>
      allHazards
        .filter((h) => h.projectId === project.id)
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allHazards, project.id],
  );

  const [draft, setDraft] = useState<DraftHazard>(EMPTY_DRAFT);

  function commit() {
    if (!draft.date.trim()) return;
    const entry: HazardEvent = {
      id: newAnnotationId('hz'),
      projectId: project.id,
      type: draft.type,
      date: draft.date.trim(),
      severity: draft.severity || undefined,
      description: draft.description.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    addHazard(entry);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Module 2 · Macroclimate & Hazards</span>
        <h1 className={styles.title}>Hazards Log</h1>
        <p className={styles.lede}>
          Capture historical extreme events the steward (or local memory) has
          witnessed — these complement FEMA / NOAA layer reads and feed the
          Diagnosis Report. Date can be a year (1998) or a full date.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add an event</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="hz-type">Type</label>
            <select
              id="hz-type"
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as HazardType }))}
            >
              {HAZARD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="hz-date">Date</label>
            <input
              id="hz-date"
              type="text"
              placeholder="YYYY or YYYY-MM-DD"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="hz-sev">Severity</label>
            <select
              id="hz-sev"
              value={draft.severity}
              onChange={(e) =>
                setDraft((d) => ({ ...d, severity: e.target.value as HazardSeverity | '' }))
              }
            >
              <option value="">—</option>
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label htmlFor="hz-desc">Description</label>
            <textarea
              id="hz-desc"
              placeholder="What happened? What was damaged or affected?"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </div>
        </div>
        <button type="button" className={styles.addBtn} onClick={commit} disabled={!draft.date.trim()}>
          + Add event
        </button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Logged events <span style={{ opacity: 0.5, fontWeight: 400 }}>({hazards.length})</span>
        </h2>
        {hazards.length === 0 ? (
          <p style={{ color: 'rgba(232,220,200,0.5)', fontStyle: 'italic', fontSize: 13 }}>
            No events logged yet.
          </p>
        ) : (
          hazards.map((h) => {
            const typeLabel = HAZARD_TYPES.find((t) => t.value === h.type)?.label ?? h.type;
            const sevLabel  = h.severity ? SEVERITIES.find((s) => s.value === h.severity)?.label : '—';
            return (
              <div key={h.id} className={styles.listRow} style={{ gridTemplateColumns: '90px 1fr 100px auto' }}>
                <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'rgba(232,220,200,0.7)' }}>
                  {h.date}
                </span>
                <span style={{ fontSize: 13, color: 'rgba(232,220,200,0.92)' }}>
                  <strong style={{ fontWeight: 600 }}>{typeLabel}</strong>
                  {h.description ? <span style={{ opacity: 0.7 }}> — {h.description}</span> : null}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(232,220,200,0.6)' }}>{sevLabel}</span>
                <button type="button" className={styles.removeBtn} onClick={() => removeHazard(h.id)}>
                  Remove
                </button>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

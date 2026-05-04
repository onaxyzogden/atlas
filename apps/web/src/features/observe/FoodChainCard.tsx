/**
 * FoodChainCard — Phase 4d OBSERVE surface (Module 4: Ecology diagnostics).
 *
 * Logs species observations tagged by trophic level (producer →
 * decomposer) and a per-project succession-stage label. Persists via
 * useEcologyStore.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useEcologyStore } from '../../store/ecologyStore.js';
import { newAnnotationId, type EcologyObservation, type TrophicLevel, type SuccessionStage } from '../../store/site-annotations.js';
import styles from './StewardSurveyCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const TROPHIC_LEVELS: Array<{ value: TrophicLevel; label: string }> = [
  { value: 'producer',    label: 'Producer (plant)' },
  { value: 'primary',     label: 'Primary consumer (herbivore)' },
  { value: 'secondary',   label: 'Secondary consumer (carnivore/omnivore)' },
  { value: 'tertiary',    label: 'Tertiary consumer (apex predator)' },
  { value: 'decomposer',  label: 'Decomposer' },
];

const SUCCESSION_STAGES: Array<{ value: SuccessionStage; label: string }> = [
  { value: 'disturbed', label: 'Disturbed / bare' },
  { value: 'pioneer',   label: 'Pioneer' },
  { value: 'mid',       label: 'Mid-succession' },
  { value: 'late',      label: 'Late succession' },
  { value: 'climax',    label: 'Climax' },
];

interface DraftObs {
  species: string;
  trophicLevel: TrophicLevel;
  notes: string;
}

const EMPTY: DraftObs = { species: '', trophicLevel: 'producer', notes: '' };

export default function FoodChainCard({ project }: Props) {
  const allObs = useEcologyStore((s) => s.ecology);
  const addObs = useEcologyStore((s) => s.addObservation);
  const removeObs = useEcologyStore((s) => s.removeObservation);
  const successionStage = useEcologyStore((s) => s.successionStageByProject[project.id]);
  const setSuccession = useEcologyStore((s) => s.setSuccessionStage);

  const observations = useMemo(
    () => allObs.filter((o) => o.projectId === project.id),
    [allObs, project.id],
  );

  const [draft, setDraft] = useState<DraftObs>(EMPTY);

  function commit() {
    if (!draft.species.trim()) return;
    const o: EcologyObservation = {
      id: newAnnotationId('eco'),
      projectId: project.id,
      species: draft.species.trim(),
      trophicLevel: draft.trophicLevel,
      notes: draft.notes.trim() || undefined,
      observedAt: new Date().toISOString(),
    };
    addObs(o);
    setDraft(EMPTY);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Module 4 · Ecology</span>
        <h1 className={styles.title}>Food-Chain & Succession</h1>
        <p className={styles.lede}>
          Log species you observe and where they sit in the food chain. Tag the
          site's overall successional stage to anchor design choices in the
          existing ecosystem trajectory.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Successional Stage</h2>
        <div className={styles.field}>
          <label htmlFor="succ">Current stage</label>
          <select
            id="succ"
            value={successionStage ?? ''}
            onChange={(e) =>
              setSuccession(project.id, (e.target.value || undefined) as SuccessionStage | undefined)
            }
          >
            <option value="">—</option>
            {SUCCESSION_STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add an observation</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="sp">Species</label>
            <input
              id="sp"
              type="text"
              placeholder="e.g. Ribes nigrum, white-tailed deer, oyster mushroom"
              value={draft.species}
              onChange={(e) => setDraft((d) => ({ ...d, species: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="tl">Trophic level</label>
            <select
              id="tl"
              value={draft.trophicLevel}
              onChange={(e) =>
                setDraft((d) => ({ ...d, trophicLevel: e.target.value as TrophicLevel }))
              }
            >
              {TROPHIC_LEVELS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label htmlFor="obs-notes">Notes</label>
            <textarea
              id="obs-notes"
              placeholder="Where, when, abundance, behaviour…"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </div>
        </div>
        <button type="button" className={styles.addBtn} onClick={commit} disabled={!draft.species.trim()}>
          + Add observation
        </button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Observations <span style={{ opacity: 0.5, fontWeight: 400 }}>({observations.length})</span>
        </h2>
        {observations.length === 0 ? (
          <p style={{ color: 'rgba(232,220,200,0.5)', fontStyle: 'italic', fontSize: 13 }}>
            No observations logged yet.
          </p>
        ) : (
          observations.map((o) => {
            const tlLabel = TROPHIC_LEVELS.find((t) => t.value === o.trophicLevel)?.label ?? o.trophicLevel;
            return (
              <div key={o.id} className={styles.listRow} style={{ gridTemplateColumns: '1fr 1fr 2fr auto' }}>
                <span style={{ fontSize: 13, color: 'rgba(232,220,200,0.92)', fontWeight: 600 }}>
                  {o.species}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(232,220,200,0.65)' }}>{tlLabel}</span>
                <span style={{ fontSize: 12, color: 'rgba(232,220,200,0.55)' }}>{o.notes ?? '—'}</span>
                <button type="button" className={styles.removeBtn} onClick={() => removeObs(o.id)}>
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

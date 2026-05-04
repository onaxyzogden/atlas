/**
 * StewardSurveyCard — Phase 4a OBSERVE surface.
 *
 * Captures the steward profile that the Diagnosis Report and the Hub's
 * Module 1 (Human Context) rely on. Controlled form, persisted via
 * useVisionStore.updateSteward (Zustand persist → localStorage).
 *
 * Fields mirror the spec checklist: name, age, occupation, lifestyle,
 * maintenance hours (initial / ongoing), budget, skills, vision narrative.
 */

import { useEffect, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useVisionStore, type StewardProfile } from '../../store/visionStore.js';
import styles from './StewardSurveyCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function StewardSurveyCard({ project }: Props) {
  const ensureDefaults = useVisionStore((s) => s.ensureDefaults);
  const visionData = useVisionStore((s) => s.getVisionData(project.id));
  const updateSteward = useVisionStore((s) => s.updateSteward);

  useEffect(() => {
    ensureDefaults(project.id);
  }, [ensureDefaults, project.id]);

  const steward: StewardProfile = visionData?.steward ?? {};
  const [skillDraft, setSkillDraft] = useState('');

  function set<K extends keyof StewardProfile>(field: K, value: StewardProfile[K]) {
    updateSteward(project.id, { [field]: value } as Partial<StewardProfile>);
  }

  function addSkill() {
    const trimmed = skillDraft.trim();
    if (!trimmed) return;
    const next = [...(steward.skills ?? []), trimmed];
    updateSteward(project.id, { skills: next });
    setSkillDraft('');
  }

  function removeSkill(idx: number) {
    const next = (steward.skills ?? []).filter((_, i) => i !== idx);
    updateSteward(project.id, { skills: next });
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Module 1 · Human Context</span>
        <h1 className={styles.title}>Steward Survey</h1>
        <p className={styles.lede}>
          A protracted observation begins with the people. Capture who is stewarding
          this land, what they bring, and what they hope to grow. All fields optional —
          fill in what you have.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Identity</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="steward-name">Name</label>
            <input
              id="steward-name"
              type="text"
              value={steward.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="steward-age">Age</label>
            <input
              id="steward-age"
              type="number"
              min={0}
              value={steward.age ?? ''}
              onChange={(e) => set('age', e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="steward-occupation">Occupation</label>
            <input
              id="steward-occupation"
              type="text"
              value={steward.occupation ?? ''}
              onChange={(e) => set('occupation', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="steward-lifestyle">Lifestyle</label>
            <select
              id="steward-lifestyle"
              value={steward.lifestyle ?? ''}
              onChange={(e) => set('lifestyle', (e.target.value || undefined) as StewardProfile['lifestyle'])}
            >
              <option value="">—</option>
              <option value="active">Active</option>
              <option value="sedentary">Sedentary</option>
            </select>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Capacity & Resources</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="steward-hrs-init">Maintenance hrs/wk — initial</label>
            <input
              id="steward-hrs-init"
              type="number"
              min={0}
              value={steward.maintenanceHrsInitial ?? ''}
              onChange={(e) =>
                set('maintenanceHrsInitial', e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="steward-hrs-ongoing">Maintenance hrs/wk — ongoing</label>
            <input
              id="steward-hrs-ongoing"
              type="number"
              min={0}
              value={steward.maintenanceHrsOngoing ?? ''}
              onChange={(e) =>
                set('maintenanceHrsOngoing', e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label htmlFor="steward-budget">Budget</label>
            <input
              id="steward-budget"
              type="text"
              placeholder="$15k/yr · self-funded · grant-supported …"
              value={steward.budget ?? ''}
              onChange={(e) => set('budget', e.target.value)}
            />
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Skills</label>
            <div className={styles.tagInput}>
              {(steward.skills ?? []).map((skill, idx) => (
                <span key={`${skill}-${idx}`} className={styles.tag}>
                  {skill}
                  <button type="button" onClick={() => removeSkill(idx)} aria-label={`Remove ${skill}`}>
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Type a skill, press Enter"
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                onBlur={addSkill}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Vision</h2>
        <div className={styles.field}>
          <label htmlFor="steward-vision">In your own words</label>
          <textarea
            id="steward-vision"
            placeholder="What do you hope this land will become? What does success look like in 10 years?"
            value={steward.vision ?? ''}
            onChange={(e) => set('vision', e.target.value)}
          />
        </div>
      </section>
    </div>
  );
}

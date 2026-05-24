/**
 * StewardSurveyCard — Phase 4a OBSERVE surface (legacy card IA).
 *
 * Captures the steward roster that the Diagnosis Report and the Hub's
 * Module 1 (Human Context) rely on. A piece of land is rarely stewarded by
 * one person, so this surface renders one profile editor per project member
 * (the roster comes from the live members system; the rich profile fields are
 * an overlay keyed by userId). Persisted via useVisionStore (Zustand persist).
 *
 * Member identity (name / app role) is read-only here — add or remove people
 * in the Team tab. Per-steward fields mirror the spec checklist: relationship,
 * age, occupation, lifestyle, maintenance hours, budget, skills, personal
 * vision. The project-level shared vision package lives in Vision detail.
 */

import { useEffect, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useVisionStore,
  type StewardProfile,
  type StewardRelationship,
} from '../../store/visionStore.js';
import {
  useStewardRoster,
  type StewardRosterEntry,
} from '../../v3/observe/modules/human-context/roster.js';
import {
  rosterCapacityHours,
  rosterCompleteness,
} from '../../v3/observe/modules/human-context/derivations.js';
import styles from './StewardSurveyCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const RELATIONSHIP_OPTIONS: StewardRelationship[] = [
  'lead',
  'co-steward',
  'family',
  'ally',
  'contributor',
];

const RELATIONSHIP_LABELS: Record<StewardRelationship, string> = {
  lead: 'Lead steward',
  'co-steward': 'Co-steward',
  family: 'Family member',
  ally: 'Allied contributor',
  contributor: 'Contributor',
};

export default function StewardSurveyCard({ project }: Props) {
  const ensureDefaults = useVisionStore((s) => s.ensureDefaults);

  useEffect(() => {
    ensureDefaults(project.id);
  }, [ensureDefaults, project.id]);

  const roster = useStewardRoster(project.id);
  const profiles = roster.map((r) => r.profile);
  const capacity = rosterCapacityHours(profiles);
  const completeness = rosterCompleteness(profiles);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Module 1 · Human Context</span>
        <h1 className={styles.title}>Steward Survey</h1>
        <p className={styles.lede}>
          A protracted observation begins with the people. Capture everyone
          stewarding this land, what they bring, and what they hope to grow.
          Add or remove people in the Team tab — all profile fields are optional.
        </p>
      </header>

      {roster.length > 0 && (
        <section className={styles.section}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Stewards</label>
              <strong>{roster.length}</strong>
            </div>
            <div className={styles.field}>
              <label>Combined capacity</label>
              <strong>{capacity} hrs/wk</strong>
            </div>
            <div className={styles.field}>
              <label>Roster completeness</label>
              <strong>{completeness.pct}%</strong>
            </div>
          </div>
        </section>
      )}

      {roster.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.lede}>
            No stewards on this project yet. Add people in the Team tab — each
            member can then record their own human-context profile here.
          </p>
        </section>
      ) : (
        roster.map((entry) => (
          <StewardEditor key={entry.member.userId} projectId={project.id} entry={entry} />
        ))
      )}
    </div>
  );
}

function StewardEditor({
  projectId,
  entry,
}: {
  projectId: string;
  entry: StewardRosterEntry;
}) {
  const { member, profile } = entry;
  const updateStewardProfile = useVisionStore((s) => s.updateStewardProfile);
  const setStewardProfileList = useVisionStore((s) => s.setStewardProfileList);
  const [skillDraft, setSkillDraft] = useState('');

  const name = member.displayName || member.email.split('@')[0];

  function set<K extends keyof StewardProfile>(field: K, value: StewardProfile[K]) {
    updateStewardProfile(projectId, member.userId, { [field]: value } as Partial<StewardProfile>);
  }

  function addSkill() {
    const trimmed = skillDraft.trim();
    if (!trimmed) return;
    const next = [...(profile.skills ?? []), trimmed];
    setStewardProfileList(projectId, member.userId, 'skills', next);
    setSkillDraft('');
  }

  function removeSkill(idx: number) {
    const next = (profile.skills ?? []).filter((_, i) => i !== idx);
    setStewardProfileList(projectId, member.userId, 'skills', next);
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {name}
        <span className={styles.heroTag} style={{ marginLeft: 8 }}>{member.role}</span>
      </h2>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor={`rel-${member.userId}`}>Relationship to land</label>
          <select
            id={`rel-${member.userId}`}
            value={profile.relationship ?? ''}
            onChange={(e) =>
              set('relationship', (e.target.value || undefined) as StewardProfile['relationship'])
            }
          >
            <option value="">—</option>
            {RELATIONSHIP_OPTIONS.map((r) => (
              <option key={r} value={r}>{RELATIONSHIP_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`age-${member.userId}`}>Age</label>
          <input
            id={`age-${member.userId}`}
            type="number"
            min={0}
            value={profile.age ?? ''}
            onChange={(e) => set('age', e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`occ-${member.userId}`}>Occupation</label>
          <input
            id={`occ-${member.userId}`}
            type="text"
            value={profile.occupation ?? ''}
            onChange={(e) => set('occupation', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`life-${member.userId}`}>Lifestyle</label>
          <select
            id={`life-${member.userId}`}
            value={profile.lifestyle ?? ''}
            onChange={(e) => set('lifestyle', (e.target.value || undefined) as StewardProfile['lifestyle'])}
          >
            <option value="">—</option>
            <option value="active">Active</option>
            <option value="sedentary">Sedentary</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`hrs-init-${member.userId}`}>Maintenance hrs/wk — initial</label>
          <input
            id={`hrs-init-${member.userId}`}
            type="number"
            min={0}
            value={profile.maintenanceHrsInitial ?? ''}
            onChange={(e) =>
              set('maintenanceHrsInitial', e.target.value === '' ? undefined : Number(e.target.value))
            }
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`hrs-ong-${member.userId}`}>Maintenance hrs/wk — ongoing</label>
          <input
            id={`hrs-ong-${member.userId}`}
            type="number"
            min={0}
            value={profile.maintenanceHrsOngoing ?? ''}
            onChange={(e) =>
              set('maintenanceHrsOngoing', e.target.value === '' ? undefined : Number(e.target.value))
            }
          />
        </div>
        <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor={`budget-${member.userId}`}>Budget</label>
          <input
            id={`budget-${member.userId}`}
            type="text"
            placeholder="$15k/yr · self-funded · grant-supported …"
            value={profile.budget ?? ''}
            onChange={(e) => set('budget', e.target.value)}
          />
        </div>
        <div className={`${styles.field} ${styles.full}`}>
          <label>Skills</label>
          <div className={styles.tagInput}>
            {(profile.skills ?? []).map((skill, idx) => (
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
        <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor={`vision-${member.userId}`}>Personal vision — in your own words</label>
          <textarea
            id={`vision-${member.userId}`}
            placeholder="What do you hope this land will become? What does success look like in 10 years?"
            value={profile.personalVision ?? ''}
            onChange={(e) => set('personalVision', e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}

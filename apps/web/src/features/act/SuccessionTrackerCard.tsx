/**
 * SuccessionTrackerCard — ACT-stage Module 3 (Ecological Monitoring & Yield).
 *
 * Multi-year canopy / pioneer-species milestones per zone. Permaculture
 * systems evolve from pioneer → mid → climax over decades; each milestone
 * is a steward's dated observation along that arc.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useSuccessionStore,
  type SuccessionMilestone,
  type SuccessionPhase,
} from '../../store/successionStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import styles from './actCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const PHASES: Array<{ value: SuccessionPhase; label: string; cls: string }> = [
  { value: 'pioneer', label: 'Pioneer', cls: styles.pillRunning ?? '' },
  { value: 'mid',     label: 'Mid',     cls: styles.pillIncon ?? '' },
  { value: 'climax',  label: 'Climax',  cls: styles.pillSuccess ?? '' },
];

interface Draft {
  zoneId: string;
  year: string;
  phase: SuccessionPhase;
  observation: string;
  photoDataUrl: string;
}
function emptyDraft(): Draft {
  return {
    zoneId: '',
    year: String(new Date().getFullYear()),
    phase: 'pioneer',
    observation: '',
    photoDataUrl: '',
  };
}

function newId() { return `sm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export default function SuccessionTrackerCard({ project }: Props) {
  const allMilestones = useSuccessionStore((s) => s.milestones);
  const addMilestone = useSuccessionStore((s) => s.addMilestone);
  const removeMilestone = useSuccessionStore((s) => s.removeMilestone);

  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === project.id),
    [allZones, project.id],
  );
  const zoneName = (id?: string) => (id ? zones.find((z) => z.id === id)?.name ?? '(deleted zone)' : 'Site-wide');

  const milestones = useMemo(
    () => allMilestones.filter((m) => m.projectId === project.id).slice().sort((a, b) => a.year - b.year),
    [allMilestones, project.id],
  );

  const groupedByZone = useMemo(() => {
    const m = new Map<string, SuccessionMilestone[]>();
    milestones.forEach((ms) => {
      const k = ms.zoneId ?? '';
      const list = m.get(k) ?? [];
      list.push(ms);
      m.set(k, list);
    });
    return Array.from(m.entries());
  }, [milestones]);

  const [draft, setDraft] = useState<Draft>(emptyDraft);

  function onPhotoChange(file: File | null) {
    if (!file) { setDraft((d) => ({ ...d, photoDataUrl: '' })); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((d) => ({ ...d, photoDataUrl: typeof reader.result === 'string' ? reader.result : '' }));
    };
    reader.readAsDataURL(file);
  }

  function commit() {
    if (!draft.observation.trim()) return;
    const year = parseInt(draft.year, 10);
    if (!Number.isFinite(year)) return;
    const entry: SuccessionMilestone = {
      id: newId(),
      projectId: project.id,
      zoneId: draft.zoneId || undefined,
      year,
      phase: draft.phase,
      observation: draft.observation.trim(),
      photoDataUrl: draft.photoDataUrl || undefined,
    };
    addMilestone(entry);
    setDraft(emptyDraft());
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Act · Module 3 — Multi-Year Succession</span>
        <h1 className={styles.title}>Succession Tracker</h1>
        <p className={styles.lede}>
          Capture how each zone moves from pioneer through mid succession
          to climax community. Optional photos anchor what your eyes
          remember imperfectly.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Log milestone</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Zone</label>
            <select value={draft.zoneId} onChange={(e) => setDraft({ ...draft, zoneId: e.target.value })}>
              <option value="">Site-wide</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Year</label>
            <input type="number" value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Phase</label>
            <select value={draft.phase} onChange={(e) => setDraft({ ...draft, phase: e.target.value as SuccessionPhase })}>
              {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Photo (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)} />
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Observation</label>
            <textarea value={draft.observation} onChange={(e) => setDraft({ ...draft, observation: e.target.value })} />
          </div>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit} disabled={!draft.observation.trim()}>
            Add milestone
          </button>
        </div>
      </section>

      {groupedByZone.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>No milestones yet — log your first above.</p>
        </section>
      ) : (
        groupedByZone.map(([zid, list]) => (
          <section key={zid || 'site'} className={styles.section}>
            <h2 className={styles.sectionTitle}>{zoneName(zid || undefined)} ({list.length})</h2>
            <ul className={styles.list}>
              {list.map((m) => {
                const phase = PHASES.find((p) => p.value === m.phase);
                return (
                  <li key={m.id} className={styles.listRow} style={{ alignItems: 'flex-start' }}>
                    <span style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {m.photoDataUrl && (
                        <img
                          src={m.photoDataUrl}
                          alt=""
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4 }}
                        />
                      )}
                      <span>
                        <strong>Year {m.year}</strong>
                        {phase && <span className={`${styles.pill} ${phase.cls}`} style={{ marginLeft: 8 }}>{phase.label}</span>}
                        <div className={styles.listMeta}>{m.observation}</div>
                      </span>
                    </span>
                    <button type="button" className={styles.removeBtn} onClick={() => removeMilestone(m.id)}>Remove</button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

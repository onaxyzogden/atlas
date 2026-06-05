/**
 * MaintenanceScheduleCard — ACT-stage Module 2 (Maintenance & Operations).
 *
 * Recurring stewardship tasks bucketed by cadence (daily / weekly /
 * monthly / quarterly / annual). Each task can link to a feature
 * (zone / crop area / structure / path) so "what does this orchard need
 * this week?" is answerable in one place.
 */

import { useMemo, useState } from 'react';
import type { WorkItem } from '@ogden/shared';
import type { LocalProject } from '../../store/projectStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import type {
  MaintenanceCadence,
  MaintenanceSeason,
} from '../../store/maintenanceStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useAllStructures } from '../../store/builtEnvironmentSelectors.js';
import { usePathStore } from '../../store/pathStore.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const CADENCES: MaintenanceCadence[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
const SEASONS: Array<{ value: MaintenanceSeason | ''; label: string }> = [
  { value: '',       label: 'Any season' },
  { value: 'winter', label: 'Winter' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall',   label: 'Fall' },
];

interface Draft {
  title: string;
  cadence: MaintenanceCadence;
  season: MaintenanceSeason | '';
  linkedFeatureId: string;
  notes: string;
}
const EMPTY_DRAFT: Draft = { title: '', cadence: 'weekly', season: '', linkedFeatureId: '', notes: '' };

function newId() { return `mt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
const nowIso = () => new Date().toISOString();

export default function MaintenanceScheduleCard({ project }: Props) {
  const allItems = useWorkItemStore((s) => s.items);
  const addItem = useWorkItemStore((s) => s.addItem);
  const deleteItem = useWorkItemStore((s) => s.deleteItem);
  const setStatus = useWorkItemStore((s) => s.setStatus);

  const allZones = useZoneStore((s) => s.zones);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allStructures = useAllStructures();
  const allPaths = usePathStore((s) => s.paths);

  // Spine is authoritative (D0.1). Project maintenance WorkItems back into
  // the legacy row shape the render block expects, so display is unchanged.
  const tasks = useMemo(
    () =>
      allItems
        .filter(
          (w) => w.projectId === project.id && w.source === 'maintenance',
        )
        .map((w) => ({
          id: w.id,
          title: w.title,
          cadence: (w.recurrenceFrequency ?? 'weekly') as MaintenanceCadence,
          season: w.season as MaintenanceSeason | undefined,
          linkedFeatureId: w.linkedFeatureId,
          lastDoneAt: w.doneAt ?? undefined,
        })),
    [allItems, project.id],
  );
  const features = useMemo(() => {
    const fs: Array<{ id: string; label: string }> = [];
    allZones.filter((z) => z.projectId === project.id).forEach((z) => fs.push({ id: z.id, label: `Zone · ${z.name}` }));
    allCrops.filter((c) => c.projectId === project.id).forEach((c) => fs.push({ id: c.id, label: `Crop · ${c.name}` }));
    allStructures.filter((s) => s.projectId === project.id).forEach((s) => fs.push({ id: s.id, label: `Structure · ${s.name}` }));
    allPaths.filter((p) => p.projectId === project.id).forEach((p) => fs.push({ id: p.id, label: `Path · ${p.name}` }));
    return fs;
  }, [allZones, allCrops, allStructures, allPaths, project.id]);

  const featureLabel = (id?: string) => features.find((f) => f.id === id)?.label ?? '—';

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function commit() {
    if (!draft.title.trim()) return;
    // Mirror the maintenance migration mapper shape exactly.
    const entry: WorkItem = {
      id: newId(),
      projectId: project.id,
      source: 'maintenance',
      overridden: true,
      title: draft.title.trim(),
      phaseId: null,
      status: 'todo',
      doneAt: null,
      dependsOn: [],
      dependsOnAuto: [],
      precedesAuto: [],
      materialsAuto: [],
      equipmentRequiredAuto: [],
      isRecurring: true,
      recurrenceFrequency: draft.cadence,
      season: draft.season || undefined,
      linkedFeatureId: draft.linkedFeatureId || undefined,
      notes: draft.notes.trim() || undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    addItem(entry);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="act">
        <span className={styles.heroTag}>Act · Module 2 — Maintenance &amp; Operations</span>
        <h1 className={styles.title}>Maintenance Schedule</h1>
        <p className={styles.lede}>
          Recurring stewardship work, bucketed by cadence and (optionally)
          season. Mark tasks done to track when each system was last
          attended.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add task</h2>
        <div className={styles.grid}>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Title</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Cadence</label>
            <select value={draft.cadence} onChange={(e) => setDraft({ ...draft, cadence: e.target.value as MaintenanceCadence })}>
              {CADENCES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Season</label>
            <select value={draft.season} onChange={(e) => setDraft({ ...draft, season: e.target.value as MaintenanceSeason | '' })}>
              {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Linked feature (optional)</label>
            <select value={draft.linkedFeatureId} onChange={(e) => setDraft({ ...draft, linkedFeatureId: e.target.value })}>
              <option value="">— none —</option>
              {features.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Notes</label>
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit} disabled={!draft.title.trim()}>
            Add task
          </button>
        </div>
      </section>

      {CADENCES.map((cadence) => {
        const bucket = tasks.filter((t) => t.cadence === cadence);
        if (bucket.length === 0) return null;
        return (
          <section key={cadence} className={styles.section}>
            <h2 className={styles.sectionTitle} style={{ textTransform: 'capitalize' }}>{cadence} ({bucket.length})</h2>
            <ul className={styles.list}>
              {bucket.map((t) => (
                <li key={t.id} className={styles.listRow}>
                  <span>
                    <strong>{t.title}</strong>
                    <div className={styles.listMeta}>
                      {t.season ? `${t.season} · ` : ''}
                      {featureLabel(t.linkedFeatureId)}
                      {t.lastDoneAt ? ` · last done ${new Date(t.lastDoneAt).toLocaleDateString()}` : ' · never done'}
                    </div>
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className={styles.btn} onClick={() => setStatus(t.id, 'done')}>Mark done</button>
                    <button type="button" className={styles.removeBtn} onClick={() => deleteItem(t.id)}>Remove</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {tasks.length === 0 && (
        <section className={styles.section}>
          <p className={styles.empty}>No maintenance tasks yet — add one above.</p>
        </section>
      )}
    </div>
  );
}

/**
 * SeasonalTaskCard — PLAN Module 7.
 *
 * Per-phase seasonal task editor. Tasks live on `BuildPhase.tasks`
 * (additive optional field) and are tagged with a season + labor hrs +
 * cost. Drives the PhasingMatrix counts and the LaborBudgetSummary
 * rollup.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePhaseStore, type PhaseTask, type BuildPhase } from '../../store/phaseStore.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SEASONS: Array<{ value: PhaseTask['season']; label: string }> = [
  { value: 'winter', label: 'Winter' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall',   label: 'Fall' },
];

function newTaskId(): string {
  return `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SeasonalTaskCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const updatePhase = usePhaseStore((s) => s.updatePhase);

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id).slice().sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  const [phaseId, setPhaseId] = useState<string>('');
  const [season, setSeason] = useState<PhaseTask['season']>('spring');
  const [title, setTitle] = useState('');
  const [laborHrs, setLaborHrs] = useState<number>(8);
  const [costUSD, setCostUSD] = useState<number>(0);

  const phase: BuildPhase | undefined = phases.find((p) => p.id === phaseId);

  function commit() {
    if (!phase || !title.trim()) return;
    const task: PhaseTask = {
      id: newTaskId(),
      season,
      title: title.trim(),
      laborHrs: Math.max(0, laborHrs),
      costUSD: Math.max(0, costUSD),
    };
    updatePhase(phase.id, { tasks: [...(phase.tasks ?? []), task] });
    setTitle('');
    setLaborHrs(8);
    setCostUSD(0);
  }

  function removeTask(p: BuildPhase, taskId: string) {
    updatePhase(p.id, { tasks: (p.tasks ?? []).filter((t) => t.id !== taskId) });
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 7 · Phasing</span>
        <h1 className={styles.title}>Seasonal tasks</h1>
        <p className={styles.lede}>
          Concrete deliverables per phase, tagged by season and sized by
          labor + dollars. The labor-budget rollup and phasing matrix read
          straight from this list.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add task</h2>
        {phases.length === 0 ? (
          <p className={styles.empty}>No phases defined for this project yet.</p>
        ) : (
          <>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Phase</span>
                <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)}>
                  <option value="">— select phase —</option>
                  {phases.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.timeframe}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Season</span>
                <select value={season} onChange={(e) => setSeason(e.target.value as PhaseTask['season'])}>
                  {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
              <label className={`${styles.field} ${styles.full}`}>
                <span>Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Plant 50 N-fixer whips" />
              </label>
              <label className={styles.field}>
                <span>Labor (hrs)</span>
                <input type="number" min={0} step={1} value={laborHrs}
                  onChange={(e) => setLaborHrs(Number(e.target.value) || 0)} />
              </label>
              <label className={styles.field}>
                <span>Cost (USD)</span>
                <input type="number" min={0} step={10} value={costUSD}
                  onChange={(e) => setCostUSD(Number(e.target.value) || 0)} />
              </label>
            </div>
            <div className={styles.btnRow}>
              <button type="button" className={styles.btn} onClick={commit} disabled={!phase || !title.trim()}>
                Add task
              </button>
            </div>
          </>
        )}
      </section>

      {phases.map((p) => {
        const tasks = p.tasks ?? [];
        if (tasks.length === 0) return null;
        return (
          <section key={p.id} className={styles.section}>
            <h2 className={styles.sectionTitle}>{p.name} · {tasks.length} task(s)</h2>
            <ul className={styles.list}>
              {tasks.map((t) => (
                <li key={t.id} className={styles.listRow}>
                  <div>
                    <strong>{t.title}</strong>
                    <div className={styles.listMeta}>
                      {SEASONS.find((s) => s.value === t.season)?.label} · {t.laborHrs} h · ${t.costUSD}
                    </div>
                  </div>
                  <button type="button" className={styles.removeBtn} onClick={() => removeTask(p, t.id)}>Remove</button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

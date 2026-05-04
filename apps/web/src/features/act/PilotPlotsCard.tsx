/**
 * PilotPlotsCard — ACT-stage Module 1 (Phased Implementation & Budgeting).
 *
 * "Use small and slow solutions" (Holmgren P9): test on a small plot before
 * committing the whole site. This card collects what was tried, what was
 * learned, and whether to scale.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  usePilotPlotStore,
  type PilotPlot,
  type PilotStatus,
} from '../../store/pilotPlotStore.js';
import styles from './actCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const STATUSES: Array<{ value: PilotStatus; label: string; cls: string }> = [
  { value: 'running',      label: 'Running',      cls: styles.pillRunning ?? '' },
  { value: 'success',      label: 'Success',      cls: styles.pillSuccess ?? '' },
  { value: 'fail',         label: 'Failed',       cls: styles.pillFail ?? '' },
  { value: 'inconclusive', label: 'Inconclusive', cls: styles.pillIncon ?? '' },
];

interface Draft {
  title: string;
  hypothesis: string;
  plotSizeM2: string;
  startDate: string;
}
const EMPTY_DRAFT: Draft = { title: '', hypothesis: '', plotSizeM2: '', startDate: '' };

function newId() { return `pp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export default function PilotPlotsCard({ project }: Props) {
  const allPilots = usePilotPlotStore((s) => s.pilots);
  const addPilot = usePilotPlotStore((s) => s.addPilot);
  const updatePilot = usePilotPlotStore((s) => s.updatePilot);
  const removePilot = usePilotPlotStore((s) => s.removePilot);

  const pilots = useMemo(
    () => allPilots.filter((p) => p.projectId === project.id).slice().sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
    [allPilots, project.id],
  );

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function commit() {
    if (!draft.title.trim()) return;
    const entry: PilotPlot = {
      id: newId(),
      projectId: project.id,
      title: draft.title.trim(),
      hypothesis: draft.hypothesis.trim(),
      plotSizeM2: parseFloat(draft.plotSizeM2) || 0,
      startDate: draft.startDate || new Date().toISOString().slice(0, 10),
      status: 'running',
    };
    addPilot(entry);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Act · Module 1 — Small &amp; Slow Pilots</span>
        <h1 className={styles.title}>Pilot Plots</h1>
        <p className={styles.lede}>
          Try it on a tiny plot before scaling. Each pilot has a hypothesis,
          a footprint, a status, and learnings — so you do not bet the
          whole site on a single guess.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Log a pilot</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Title</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Plot size (m²)</label>
            <input type="number" value={draft.plotSizeM2} onChange={(e) => setDraft({ ...draft, plotSizeM2: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Start date</label>
            <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Hypothesis</label>
            <textarea value={draft.hypothesis} onChange={(e) => setDraft({ ...draft, hypothesis: e.target.value })} />
          </div>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit} disabled={!draft.title.trim()}>
            Add pilot
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Active &amp; past pilots ({pilots.length})</h2>
        {pilots.length === 0 ? (
          <p className={styles.empty}>No pilots yet — log your first above.</p>
        ) : (
          <ul className={styles.list}>
            {pilots.map((p) => {
              const cur = STATUSES.find((s) => s.value === p.status);
              return (
                <li key={p.id} className={styles.listRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <strong>{p.title}</strong>
                      <div className={styles.listMeta}>
                        {p.plotSizeM2} m² · started {p.startDate}{p.endDate ? ` · ended ${p.endDate}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      {STATUSES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          className={`${styles.pill} ${p.status === s.value ? s.cls : ''}`}
                          onClick={() => updatePilot(p.id, {
                            status: s.value,
                            endDate: s.value === 'running' ? undefined : (p.endDate ?? new Date().toISOString().slice(0, 10)),
                          })}
                          style={{ cursor: 'pointer' }}
                        >
                          {s.label}
                        </button>
                      ))}
                      <button type="button" className={styles.removeBtn} onClick={() => removePilot(p.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  {p.hypothesis && (
                    <div className={styles.listMeta}>
                      <strong>Hypothesis:</strong> {p.hypothesis}
                    </div>
                  )}
                  <textarea
                    placeholder="Learnings as the pilot progresses…"
                    value={p.learnings ?? ''}
                    onChange={(e) => updatePilot(p.id, { learnings: e.target.value })}
                    style={{
                      width: '100%',
                      minHeight: 60,
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6,
                      padding: '8px 10px',
                      color: 'rgba(232,220,200,0.92)',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      resize: 'vertical',
                    }}
                  />
                  <span className={styles.listMeta} aria-hidden>{cur?.label ?? p.status}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * PhasingMatrixCard — PLAN Module 7.
 *
 * 5-year × 4-quarter editable matrix. Each cell counts the number of
 * tasks scheduled in that (year, quarter) bucket; clicking a cell jumps
 * the steward to the SeasonalTaskCard pre-filtered to that bucket.
 *
 * v1: tasks are stored on `BuildPhase.tasks` and tagged with a season
 * (winter / spring / summer / fall). Year is derived from the phase
 * order (Phase 1 = Year 0–1, Phase 2 = Year 1–3, …). The matrix shows
 * the actual count per cell across all tasks.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePhaseStore, type PhaseTask } from '../../store/phaseStore.js';
import { useUIStore } from '../../store/uiStore.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SEASONS: PhaseTask['season'][] = ['winter', 'spring', 'summer', 'fall'];
const SEASON_LABEL: Record<PhaseTask['season'], string> = {
  winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall',
};

export default function PhasingMatrixCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const setSection = useUIStore((s) => s.setActiveDashboardSection);

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id).slice().sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  // Build a phase-order × season matrix.
  const matrix = useMemo(() => {
    return phases.map((p) => {
      const tasks = p.tasks ?? [];
      const counts: Record<PhaseTask['season'], number> = { winter: 0, spring: 0, summer: 0, fall: 0 };
      const labor: Record<PhaseTask['season'], number> = { winter: 0, spring: 0, summer: 0, fall: 0 };
      for (const t of tasks) {
        counts[t.season] += 1;
        labor[t.season] += t.laborHrs;
      }
      return { phase: p, counts, labor };
    });
  }, [phases]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 7 · Phasing</span>
        <h1 className={styles.title}>Phasing matrix</h1>
        <p className={styles.lede}>
          Phases × seasons. Cell shows number of scheduled tasks and total
          labor hours for that bucket. Add tasks in the Seasonal Tasks card.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Phase × season</h2>
        {phases.length === 0 ? (
          <p className={styles.empty}>No phases defined yet — open the Phasing dashboard to seed defaults.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 6px', color: 'rgba(232,220,200,0.55)', fontWeight: 600 }}>Phase</th>
                {SEASONS.map((s) => (
                  <th key={s} style={{ padding: '8px 6px', color: 'rgba(232,220,200,0.55)', fontWeight: 600 }}>
                    {SEASON_LABEL[s]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map(({ phase, counts, labor }) => (
                <tr key={phase.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 6px', color: 'rgba(232,220,200,0.92)' }}>
                    <strong>{phase.name}</strong>
                    <div className={styles.listMeta}>{phase.timeframe}</div>
                  </td>
                  {SEASONS.map((s) => (
                    <td key={s} style={{ padding: '10px 6px', textAlign: 'center', color: 'rgba(232,220,200,0.88)', fontVariantNumeric: 'tabular-nums' }}>
                      <div><strong>{counts[s]}</strong> task{counts[s] === 1 ? '' : 's'}</div>
                      <div className={styles.listMeta}>{labor[s]} h</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={() => setSection('plan-seasonal-tasks')}>
            Edit tasks →
          </button>
          <button type="button" className={styles.btn} onClick={() => setSection('plan-labor-budget')}>
            Labor &amp; budget rollup →
          </button>
        </div>
      </section>
    </div>
  );
}

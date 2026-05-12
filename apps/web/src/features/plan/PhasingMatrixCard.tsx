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
import { PHASE_ORDER, type PhaseKey } from '../../v3/plan/types.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

const CAP_CHIP_BTN_BASE: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 11,
  fontVariantNumeric: 'tabular-nums',
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'transparent',
  color: 'rgba(232,220,200,0.62)',
  cursor: 'pointer',
  lineHeight: 1.4,
};
const CAP_CHIP_BTN_ACTIVE: React.CSSProperties = {
  ...CAP_CHIP_BTN_BASE,
  background: 'rgba(207,160,73,0.18)',
  borderColor: 'rgba(207,160,73,0.55)',
  color: 'rgba(232,220,200,0.95)',
};

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
  const updatePhase = usePhaseStore((s) => s.updatePhase);
  const setSection = useUIStore((s) => s.setActiveDashboardSection);

  const setCap = (phaseId: string, cap: PhaseKey | undefined) => {
    // Pass `undefined` via cast to `Partial<BuildPhase>` so the field clears.
    updatePhase(phaseId, { yeomansCap: cap });
  };

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
      <header className={styles.hero} data-stage="plan">
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
                    <div
                      style={{
                        marginTop: 6,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 4,
                        maxWidth: 240,
                      }}
                      title="Yeomans Scale-of-Permanence cap. Controls what shows on Year 1 / Year 5 views in Water (and future Livestock / Soil) dashboards."
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: 'rgba(232,220,200,0.45)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                          width: '100%',
                        }}
                      >
                        Yeomans cap
                      </span>
                      {PHASE_ORDER.map((k) => {
                        const active = phase.yeomansCap === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setCap(phase.id, k)}
                            style={active ? CAP_CHIP_BTN_ACTIVE : CAP_CHIP_BTN_BASE}
                          >
                            {k}
                          </button>
                        );
                      })}
                      <button
                        key="__uncapped"
                        type="button"
                        onClick={() => setCap(phase.id, undefined)}
                        style={
                          phase.yeomansCap === undefined
                            ? CAP_CHIP_BTN_ACTIVE
                            : CAP_CHIP_BTN_BASE
                        }
                      >
                        uncapped
                      </button>
                    </div>
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

/**
 * LaborBudgetSummaryCard — PLAN Module 7.
 *
 * Read-only rollup of seasonal-task labor and dollar totals across the
 * full phase timeline. Two slices: per-phase and per-season.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePhaseStore, type PhaseTask } from '../../store/phaseStore.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SEASONS: PhaseTask['season'][] = ['winter', 'spring', 'summer', 'fall'];
const SEASON_LABEL: Record<PhaseTask['season'], string> = {
  winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall',
};

export default function LaborBudgetSummaryCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id).slice().sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  const rollup = useMemo(() => {
    let totalHrs = 0;
    let totalUSD = 0;
    const perPhase: Array<{ id: string; name: string; hrs: number; usd: number; taskCount: number }> = [];
    const perSeason: Record<PhaseTask['season'], { hrs: number; usd: number }> = {
      winter: { hrs: 0, usd: 0 },
      spring: { hrs: 0, usd: 0 },
      summer: { hrs: 0, usd: 0 },
      fall:   { hrs: 0, usd: 0 },
    };
    for (const p of phases) {
      const tasks = p.tasks ?? [];
      let hrs = 0, usd = 0;
      for (const t of tasks) {
        hrs += t.laborHrs;
        usd += t.costUSD;
        perSeason[t.season].hrs += t.laborHrs;
        perSeason[t.season].usd += t.costUSD;
      }
      totalHrs += hrs;
      totalUSD += usd;
      perPhase.push({ id: p.id, name: p.name, hrs, usd, taskCount: tasks.length });
    }
    return { totalHrs, totalUSD, perPhase, perSeason };
  }, [phases]);

  const empty = rollup.perPhase.every((r) => r.taskCount === 0);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 7 · Phasing</span>
        <h1 className={styles.title}>Labor &amp; budget rollup</h1>
        <p className={styles.lede}>
          Seasonal tasks summed two ways: by phase (planning horizon) and
          by season (work calendar). Read-only — edit in the Seasonal
          Tasks card.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Totals</h2>
        <div className={styles.statRow}><span>Labor hours</span><span>{rollup.totalHrs.toLocaleString()} h</span></div>
        <div className={styles.statRow}><span>Cost</span><span>${rollup.totalUSD.toLocaleString()}</span></div>
        <div className={styles.statRow}><span>Tasks logged</span><span>{rollup.perPhase.reduce((s, r) => s + r.taskCount, 0)}</span></div>
      </section>

      {empty ? (
        <section className={styles.section}>
          <p className={styles.empty}>No tasks logged yet — head to the Seasonal Tasks card to seed the rollup.</p>
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>By phase</h2>
            {rollup.perPhase.map((r) => (
              <div key={r.id} className={styles.statRow}>
                <span>{r.name} <span className={styles.listMeta}>· {r.taskCount} task(s)</span></span>
                <span>{r.hrs} h · ${r.usd.toLocaleString()}</span>
              </div>
            ))}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>By season</h2>
            {SEASONS.map((s) => (
              <div key={s} className={styles.statRow}>
                <span>{SEASON_LABEL[s]}</span>
                <span>{rollup.perSeason[s].hrs} h · ${rollup.perSeason[s].usd.toLocaleString()}</span>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

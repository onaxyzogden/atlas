/**
 * CumulativeInvestmentCard — Plan Module 7 (Phasing & Budgeting), card 5/5.
 *
 * Per Permaculture Scholar verdict 2026-05-07
 * (`wiki/decisions/2026-05-07-atlas-plan-phasing-scholar-keep-atlas.md`):
 * "Add read-only summaries showing 'Yearly Running Total $' and
 * 'Yearly Labor Hours,' culminating in a '5-Year Total.'" The OSU PDC
 * Pro Phasing Plan template lays out cumulative rollups so the steward
 * sees not just a single phase's draw but the curve as the project
 * compounds.
 *
 * Atlas's `BuildPhase.timeframe` is free-text (e.g. "Year 0-1",
 * "Year 1-3") so a strict yearly bucket is brittle. This card pivots
 * on the phase boundary instead — same shape (cumulative-as-of phase
 * N), no parser. Each phase shows incremental hrs/$ for that phase
 * plus the running cumulative-since-start, with a stacked bar
 * indicating contribution to the 5-year (or N-phase) total.
 *
 * Source: NotebookLM Permaculture Scholar (5aa3dcf3-…), 2026-05-07.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { usePhaseStore, type DesignLayer } from '../../../../store/phaseStore.js';
import styles from '../../../../features/plan/planCard.module.css';

// Yeomans Keyline ordering on the 4 designLayer tags (earthworks → water →
// structures → vegetation), plus an "uncategorised" catchall for legacy
// tasks. Colours mirror the warm-cool ramp used in PhasingScaleMatrixCard
// and PermanenceLadderCard so the steward reads the same tier the same
// way across every phasing surface.
type Tier = DesignLayer | 'uncategorised';
const TIER_ORDER: Tier[] = ['earthworks', 'water', 'structures', 'vegetation', 'uncategorised'];
const TIER_LABEL: Record<Tier, string> = {
  earthworks:    'Earthworks',
  water:         'Water',
  structures:    'Structures',
  vegetation:    'Vegetation',
  uncategorised: 'Uncategorised',
};
const TIER_COLOR: Record<Tier, string> = {
  earthworks:    'rgba(195, 130, 70, 0.7)',  // warm sienna
  water:         'rgba(80, 140, 200, 0.7)',  // cool blue
  structures:    'rgba(160, 160, 170, 0.7)', // neutral grey
  vegetation:    'rgba(120, 200, 140, 0.7)', // green
  uncategorised: 'rgba(255, 255, 255, 0.18)',
};

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface RowVM {
  id: string;
  name: string;
  timeframe: string;
  incHrs: number;
  incUSD: number;
  cumHrs: number;
  cumUSD: number;
  /** Share of grand-total dollars. */
  shareUSD: number;
  /** Share of grand-total hours. */
  shareHrs: number;
  /** Per-tier hrs/$ breakdown for this phase (Yeomans Keyline composition). */
  byTier: Record<Tier, { hrs: number; usd: number }>;
}

function emptyTierMap(): Record<Tier, { hrs: number; usd: number }> {
  return {
    earthworks:    { hrs: 0, usd: 0 },
    water:         { hrs: 0, usd: 0 },
    structures:    { hrs: 0, usd: 0 },
    vegetation:    { hrs: 0, usd: 0 },
    uncategorised: { hrs: 0, usd: 0 },
  };
}

function fmtUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

export default function CumulativeInvestmentCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id).slice().sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  const rows: RowVM[] = useMemo(() => {
    let cumHrs = 0;
    let cumUSD = 0;
    const incPerPhase = phases.map((p) => {
      const tasks = p.tasks ?? [];
      let hrs = 0, usd = 0;
      const byTier = emptyTierMap();
      for (const t of tasks) {
        hrs += t.laborHrs;
        usd += t.costUSD;
        const tier: Tier = (t.designLayer ?? 'uncategorised') as Tier;
        byTier[tier].hrs += t.laborHrs;
        byTier[tier].usd += t.costUSD;
      }
      return { id: p.id, name: p.name, timeframe: p.timeframe, incHrs: hrs, incUSD: usd, byTier };
    });
    const totalHrs = incPerPhase.reduce((acc, r) => acc + r.incHrs, 0);
    const totalUSD = incPerPhase.reduce((acc, r) => acc + r.incUSD, 0);
    return incPerPhase.map((r) => {
      cumHrs += r.incHrs;
      cumUSD += r.incUSD;
      return {
        ...r,
        cumHrs,
        cumUSD,
        shareUSD: totalUSD > 0 ? r.incUSD / totalUSD : 0,
        shareHrs: totalHrs > 0 ? r.incHrs / totalHrs : 0,
      };
    });
  }, [phases]);

  const totals = useMemo(() => {
    const totalHrs = rows.reduce((a, r) => a + r.incHrs, 0);
    const totalUSD = rows.reduce((a, r) => a + r.incUSD, 0);
    return { totalHrs, totalUSD };
  }, [rows]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 7 · Phasing</span>
        <h1 className={styles.title}>Cumulative investment</h1>
        <p className={styles.lede}>
          The same per-phase tasks rolled up as a running curve. Each
          phase shows its own hours and dollars plus the cumulative
          since project start, so the steward sees the compounding
          shape — not just a single phase in isolation.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Project total</h2>
        <div className={styles.statRow}><span>Total labor</span><span>{totals.totalHrs} h</span></div>
        <div className={styles.statRow}><span>Total cost</span><span>{fmtUSD(totals.totalUSD)}</span></div>
        <div className={styles.statRow}><span>Phases</span><span>{rows.length}</span></div>
      </section>

      {rows.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>No phases defined for this project yet.</p>
        </section>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>By phase</h2>
          <ul className={styles.list}>
            {rows.map((r) => (
              <li key={r.id} className={styles.listRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <strong>{r.name}</strong>
                    <div className={styles.listMeta}>{r.timeframe}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    <div>{r.incHrs} h · {fmtUSD(r.incUSD)}</div>
                    <div className={styles.listMeta}>cum {r.cumHrs} h · {fmtUSD(r.cumUSD)}</div>
                  </div>
                </div>
                {/* Stacked bar visualising this phase's share of the project-level cost.
                    Two-track: dollars (top) and labor hours (bottom). */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div title={`Cost share: ${(r.shareUSD * 100).toFixed(1)}%`} style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.max(0, r.shareUSD * 100)}%`,
                      height: '100%',
                      background: 'rgba(var(--color-gold-rgb), 0.55)',
                    }} />
                  </div>
                  <div title={`Labor share: ${(r.shareHrs * 100).toFixed(1)}%`} style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.max(0, r.shareHrs * 100)}%`,
                      height: '100%',
                      background: 'rgba(120, 200, 140, 0.5)',
                    }} />
                  </div>
                  {/* Yeomans-tier composition strip — what fraction of THIS phase's
                      dollars flows into each permanence tier (earthworks → water →
                      structures → vegetation → uncategorised). Surfaces whether the
                      steward is sequencing capital correctly per Keyline order. */}
                  {r.incUSD > 0 && (
                    <div
                      title={TIER_ORDER
                        .filter((t) => r.byTier[t].usd > 0)
                        .map((t) => `${TIER_LABEL[t]}: ${fmtUSD(r.byTier[t].usd)} · ${r.byTier[t].hrs}h`)
                        .join(' · ')}
                      style={{
                        height: 8,
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                        display: 'flex',
                      }}
                    >
                      {TIER_ORDER.map((t) => {
                        const frac = r.byTier[t].usd / r.incUSD;
                        if (frac <= 0) return null;
                        return (
                          <div
                            key={t}
                            style={{
                              width: `${frac * 100}%`,
                              height: '100%',
                              background: TIER_COLOR[t],
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notes</h2>
        <p className={styles.listMeta}>
          Bars per phase: top (gold) is share of total cost; middle (green) is
          share of total labor hours; bottom (warm-cool) is the Yeomans-tier
          composition of THIS phase's dollars — earthworks (sienna) · water
          (blue) · structures (grey) · vegetation (green) · uncategorised
          (faint). Cumulative columns (cum N h · $N) show the running total as
          of the end of that phase. The OSU PDC Pro Phasing Plan template uses
          this shape as the "5-Year Total" rollup; Atlas pivots on phase
          boundaries instead of strict calendar years to avoid parsing
          free-text timeframes.
        </p>
      </section>
    </div>
  );
}

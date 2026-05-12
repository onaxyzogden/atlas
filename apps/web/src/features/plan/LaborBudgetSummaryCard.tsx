/**
 * LaborBudgetSummaryCard — PLAN Module 7.
 *
 * Read-only rollup of seasonal-task labor and dollar totals across the
 * full phase timeline. Four slices: per-phase, per-season, per Yeomans
 * Scale-of-Permanence layer (earthworks/water/structures/vegetation),
 * and a 5-year cumulative horizon. The Scale-of-Permanence rollup
 * complements `PhasingScaleMatrixCard` (which shows phase × layer
 * sequencing) by surfacing total $ + hours per Yeomans tier so a
 * steward can detect upside-down budgeting (vegetation dwarfing
 * earthworks/water early in the program).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePhaseStore, type PhaseTask, type DesignLayer } from '../../store/phaseStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SEASONS: PhaseTask['season'][] = ['winter', 'spring', 'summer', 'fall'];
const SEASON_LABEL: Record<PhaseTask['season'], string> = {
  winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall',
};

// ── Yeomans Scale of Permanence rollup buckets ────────────────────────
// Ordered top-down: longest-permanence (earthworks) → shortest (vegetation).
// "uncategorised" catches legacy tasks lacking a `designLayer` so the
// rollup degrades gracefully rather than silently dropping them.
type LayerBucket = DesignLayer | 'uncategorised';
const LAYER_ORDER: LayerBucket[] = ['earthworks', 'water', 'structures', 'vegetation', 'uncategorised'];
const LAYER_LABEL: Record<LayerBucket, string> = {
  earthworks:    'Earthworks (terrain, access)',
  water:         'Water (catchment, swales, storage)',
  structures:    'Structures (buildings, fences, trellises)',
  vegetation:    'Vegetation (trees, guilds, ground cover)',
  uncategorised: 'Uncategorised (legacy)',
};
const LAYER_BLURB: Record<LayerBucket, string> = {
  earthworks:    'Once shaped, hardest to redo — front-load capital here.',
  water:         'Earthworks-dependent; size to catchment yield not guesswork.',
  structures:    'Mid-permanence; site to support the water lines, not vice versa.',
  vegetation:    'Cheap to plant, slow to mature — sequence after earth+water.',
  uncategorised: 'Tag these in Seasonal Tasks to enter the Yeomans rollup.',
};

export default function LaborBudgetSummaryCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const allGuilds = usePolycultureStore((s) => s.guilds);

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id).slice().sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  // ── Guild establishment rollup (PLAN-stage Module 4 → Module 7) ──────────
  // Project guilds bucketed by their assigned BuildPhase. Sums optional
  // `establishmentCostUSD` + `establishmentLaborHrs` set by the steward
  // in the Guild Builder. Unassigned guilds (no `phase`) and guilds
  // missing cost/labour estimates contribute 0 to the per-phase totals
  // here but are surfaced as "to estimate" counts so the steward
  // notices the gap. These figures flow through to the Yeomans
  // Vegetation tier and the 5-year horizon below.
  const projectGuilds = useMemo(
    () => allGuilds.filter((g) => g.projectId === project.id),
    [allGuilds, project.id],
  );
  const guildRollup = useMemo(() => {
    const perPhase = new Map<string, { usd: number; hrs: number; count: number; estimated: number }>();
    let totalUSD = 0;
    let totalHrs = 0;
    let unassignedCount = 0;
    let unestimated = 0;
    for (const g of projectGuilds) {
      const usd = g.establishmentCostUSD ?? 0;
      const hrs = g.establishmentLaborHrs ?? 0;
      const hasEstimate =
        g.establishmentCostUSD !== undefined || g.establishmentLaborHrs !== undefined;
      totalUSD += usd;
      totalHrs += hrs;
      if (!hasEstimate) unestimated += 1;
      if (g.phase) {
        const bucket =
          perPhase.get(g.phase) ?? { usd: 0, hrs: 0, count: 0, estimated: 0 };
        bucket.usd += usd;
        bucket.hrs += hrs;
        bucket.count += 1;
        if (hasEstimate) bucket.estimated += 1;
        perPhase.set(g.phase, bucket);
      } else {
        unassignedCount += 1;
      }
    }
    return {
      perPhase,
      totalUSD,
      totalHrs,
      totalCount: projectGuilds.length,
      unassignedCount,
      unestimated,
    };
  }, [projectGuilds]);

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

  // ── Cumulative 5-year horizon rollup ────────────────────────────────────
  // Per OSU PDC Pro Phasing Plan template — read-only summary showing
  // running total $ and labor hours, culminating in a 5-Year Total. Atlas
  // phases declare a `timeframe` string ("Year 0-1", "Year 1-3", "Year 5+")
  // which we parse to a year-end; phases without a parseable timeframe
  // bucket at their order. Scholar verdict 2026-05-07: while permaculture
  // conceptually stretches to 50 years for mature canopy, the practical
  // budgeted phasing horizon is 5 years.
  const cumulative = useMemo(() => {
    function parseYearEnd(timeframe: string, fallbackOrder: number): number {
      // "Year 0-1" → 1, "Year 1-3" → 3, "Year 5+" → 5, "Year 3" → 3.
      const range = timeframe.match(/year\s*(\d+)\s*[-–]\s*(\d+)/i);
      if (range) return Number(range[2]);
      const open = timeframe.match(/year\s*(\d+)\s*\+/i);
      if (open) return Number(open[1]);
      const single = timeframe.match(/year\s*(\d+)/i);
      if (single) return Number(single[1]);
      return fallbackOrder;
    }
    let runHrs = 0;
    let runUSD = 0;
    const rows = rollup.perPhase.map((r, idx) => {
      const phase = phases[idx]!;
      const yearEnd = parseYearEnd(phase.timeframe, phase.order);
      // Add guild establishment costs to the phase's contribution.
      const g = guildRollup.perPhase.get(r.id) ?? { usd: 0, hrs: 0, count: 0, estimated: 0 };
      const phaseHrs = r.hrs + g.hrs;
      const phaseUSD = r.usd + g.usd;
      runHrs += phaseHrs;
      runUSD += phaseUSD;
      return {
        id: r.id,
        name: r.name,
        timeframe: phase.timeframe,
        yearEnd,
        phaseHrs,
        phaseUSD,
        cumHrs: runHrs,
        cumUSD: runUSD,
      };
    });
    // Five-year total: sum of phases ending within year 5.
    const within5 = rows.filter((r) => r.yearEnd <= 5);
    const fiveYearHrs = within5.reduce((s, r) => s + r.phaseHrs, 0);
    const fiveYearUSD = within5.reduce((s, r) => s + r.phaseUSD, 0);
    const beyondCount = rows.length - within5.length;
    return { rows, fiveYearHrs, fiveYearUSD, beyondCount };
  }, [phases, rollup.perPhase, guildRollup.perPhase]);

  // ── Scale-of-Permanence rollup (Yeomans / OSU PDC) ──────────────────────
  // Aggregate every phase's tasks by their `designLayer` field so the
  // steward can answer: are dollars + hours flowing into the right
  // permanence tier? Complement to the per-phase × per-tier matrix in
  // PhasingScaleMatrixCard — that one shows *sequencing*; this one shows
  // *totals*.
  const perLayer = useMemo(() => {
    const buckets: Record<LayerBucket, { count: number; hrs: number; usd: number }> = {
      earthworks:    { count: 0, hrs: 0, usd: 0 },
      water:         { count: 0, hrs: 0, usd: 0 },
      structures:    { count: 0, hrs: 0, usd: 0 },
      vegetation:    { count: 0, hrs: 0, usd: 0 },
      uncategorised: { count: 0, hrs: 0, usd: 0 },
    };
    for (const p of phases) {
      for (const t of p.tasks ?? []) {
        const key: LayerBucket = t.designLayer ?? 'uncategorised';
        buckets[key].count += 1;
        buckets[key].hrs += t.laborHrs;
        buckets[key].usd += t.costUSD;
      }
    }
    return buckets;
  }, [phases]);

  const empty =
    rollup.perPhase.every((r) => r.taskCount === 0) && projectGuilds.length === 0;

  // Combined per-phase totals: PhaseTask + guild establishment.
  const combinedPerPhase = useMemo(
    () =>
      rollup.perPhase.map((r) => {
        const g = guildRollup.perPhase.get(r.id) ?? { usd: 0, hrs: 0, count: 0, estimated: 0 };
        return {
          ...r,
          guildUSD: g.usd,
          guildHrs: g.hrs,
          guildCount: g.count,
          guildEstimated: g.estimated,
          combinedUSD: r.usd + g.usd,
          combinedHrs: r.hrs + g.hrs,
        };
      }),
    [rollup.perPhase, guildRollup.perPhase],
  );

  const grandTotalUSD = rollup.totalUSD + guildRollup.totalUSD;
  const grandTotalHrs = rollup.totalHrs + guildRollup.totalHrs;

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 7 · Phasing</span>
        <h1 className={styles.title}>Labor &amp; budget rollup</h1>
        <p className={styles.lede}>
          Seasonal tasks and guild establishment costs summed by phase
          (planning horizon), season (work calendar), and Yeomans tier.
          Tasks come from Seasonal Tasks; guild estimates come from the
          Guild Builder. Read-only here.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Totals</h2>
        <div className={styles.statRow}>
          <span>Labor hours <span className={styles.listMeta}>· tasks + guilds</span></span>
          <span>{grandTotalHrs.toLocaleString()} h</span>
        </div>
        <div className={styles.statRow}>
          <span>Cost <span className={styles.listMeta}>· tasks + guilds</span></span>
          <span>${grandTotalUSD.toLocaleString()}</span>
        </div>
        <div className={styles.statRow}>
          <span>Tasks logged</span>
          <span>{rollup.perPhase.reduce((s, r) => s + r.taskCount, 0)}</span>
        </div>
        <div className={styles.statRow}>
          <span>Guilds tracked
            {guildRollup.unestimated > 0 && (
              <span className={styles.listMeta}>
                {' '}· {guildRollup.unestimated} without estimate
              </span>
            )}
          </span>
          <span>{guildRollup.totalCount}</span>
        </div>
      </section>

      {empty ? (
        <section className={styles.section}>
          <p className={styles.empty}>No tasks logged yet — head to the Seasonal Tasks card to seed the rollup.</p>
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>By phase</h2>
            {combinedPerPhase.map((r) => (
              <div key={r.id} className={styles.statRow}>
                <span>
                  {r.name}{' '}
                  <span className={styles.listMeta}>
                    · {r.taskCount} task(s) · {r.guildCount} guild(s)
                  </span>
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.combinedHrs} h · ${r.combinedUSD.toLocaleString()}
                </span>
              </div>
            ))}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Plant establishment (guilds)</h2>
            <p style={{ fontSize: 12, color: 'rgba(232,220,200,0.55)', margin: '0 0 12px', lineHeight: 1.5 }}>
              One-time cash + labour for guild establishment, bucketed by
              the BuildPhase each guild is assigned to. Estimates are
              steward-entered in the Guild Builder — Atlas doesn't assert
              species-level horticulture costs because regional prices
              vary too widely. Rolls into the Totals above and the
              Vegetation row of the Yeomans rollup below.
            </p>
            {combinedPerPhase.map((r) => (
              <div key={r.id} className={styles.statRow}>
                <span>
                  {r.name}{' '}
                  <span className={styles.listMeta}>
                    · {r.guildCount} guild(s)
                    {r.guildCount > 0 && r.guildEstimated < r.guildCount && (
                      <> · {r.guildCount - r.guildEstimated} unestimated</>
                    )}
                  </span>
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.guildHrs} h · ${r.guildUSD.toLocaleString()}
                </span>
              </div>
            ))}
            {guildRollup.unassignedCount > 0 && (
              <div className={styles.statRow} style={{ opacity: 0.7 }}>
                <span>
                  Unassigned{' '}
                  <span className={styles.listMeta}>
                    · {guildRollup.unassignedCount} guild(s) — sequence in the Establishment Sequence card
                  </span>
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  — h · — $
                </span>
              </div>
            )}
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

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>By Scale of Permanence (Yeomans Keyline)</h2>
            <p style={{ fontSize: 12, color: 'rgba(232,220,200,0.55)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Per OSU PDC and Yeomans' Scale of Permanence: every dollar
              and hour bucketed by the layer it shapes. Earthworks first
              (most permanent, hardest to redo); vegetation last. If the
              Vegetation row dwarfs Earthworks + Water early on, the
              sequencing is upside-down — fix in the Seasonal Tasks card.
            </p>
            {LAYER_ORDER.map((layer) => {
              const bucket = perLayer[layer];
              // Vegetation tier absorbs guild establishment cost +
              // labour. Guilds are the canonical vegetation cost source
              // (PhaseTasks tagged `vegetation` are typically follow-on
              // maintenance — pruning, replacement planting); we keep
              // both visible so the steward can see the split.
              const isVeg = layer === 'vegetation';
              const vegGuildUSD = isVeg ? guildRollup.totalUSD : 0;
              const vegGuildHrs = isVeg ? guildRollup.totalHrs : 0;
              const vegGuildCount = isVeg ? guildRollup.totalCount : 0;
              const rowHrs = bucket.hrs + vegGuildHrs;
              const rowUSD = bucket.usd + vegGuildUSD;
              if (
                layer === 'uncategorised' &&
                bucket.count === 0 &&
                vegGuildCount === 0
              )
                return null;
              return (
                <div key={layer} className={styles.statRow}>
                  <span>
                    {LAYER_LABEL[layer]}{' '}
                    <span className={styles.listMeta}>
                      · {bucket.count} task(s)
                      {isVeg && vegGuildCount > 0 && (
                        <> · {vegGuildCount} guild(s)</>
                      )}{' '}
                      · {LAYER_BLURB[layer]}
                    </span>
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {rowHrs} h · ${rowUSD.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5-year horizon (running totals)</h2>
            <p style={{ fontSize: 12, color: 'rgba(232,220,200,0.55)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Per OSU PDC Pro template: phases bucketed by timeframe end-year, with running cumulative hours and cost. The 5-year total below is the orthodox planning horizon — beyond that, costs become speculative.
            </p>
            {cumulative.rows.map((r) => {
              const within = r.yearEnd <= 5;
              return (
                <div
                  key={r.id}
                  className={styles.statRow}
                  style={{ opacity: within ? 1 : 0.6 }}
                >
                  <span>
                    {r.name} <span className={styles.listMeta}>· {r.timeframe} (year ≤ {r.yearEnd})</span>
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    +{r.phaseHrs} h · +${r.phaseUSD.toLocaleString()} → {r.cumHrs} h · ${r.cumUSD.toLocaleString()}
                  </span>
                </div>
              );
            })}
            <div
              className={styles.statRow}
              style={{
                marginTop: 8,
                paddingTop: 10,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontWeight: 600,
              }}
            >
              <span>5-year total</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {cumulative.fiveYearHrs.toLocaleString()} h · ${cumulative.fiveYearUSD.toLocaleString()}
              </span>
            </div>
            {cumulative.beyondCount > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(232,220,200,0.5)', fontStyle: 'italic' }}>
                {cumulative.beyondCount} phase(s) extend beyond year 5 — counted in totals above but not in the 5-year horizon.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

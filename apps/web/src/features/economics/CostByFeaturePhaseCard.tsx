/**
 * §22 CostByFeaturePhaseCard — cross-cut of cost line items by phase
 * and by category.
 *
 * The Costs tab already renders a flat list of `costLineItems` with
 * per-item phase + category tags, and the Overview tab carries an
 * "Investment by Category" bar chart. Neither view answers the
 * cross-cut question: of the total investment, how much of each phase
 * goes to which category, which phase carries the budget peak, and
 * which features are driving each phase's cost? Section 22's manifest
 * line 514 (`cost-estimate-by-feature-phase`) is the specific gap.
 *
 * For each phase: total mid-cost, share of grand total, sticker-shock
 * tone (empty / balanced / heavy), per-category mid breakdown rendered
 * as a stacked bar with category swatches, and the top-3 contributing
 * line items by mid-cost. Footnote acknowledges the regional benchmark
 * hook (`region` selector) and points at the §0f benchmark database
 * which is the still-planned half of this manifest line.
 *
 * Pure presentation: reads `model.costLineItems` only, no entity
 * writes, no map overlays. Intended to mount on EconomicsPanel's Costs
 * tab above the flat list.
 *
 * Closes manifest §22 line 514 partial -> done.
 */

import { useMemo } from 'react';
import type { FinancialModel, CostLineItem } from '../financial/engine/types.js';
import { formatKRange } from '../../lib/formatRange.js';
import css from './CostByFeaturePhaseCard.module.css';

/* ------------------------------------------------------------------ */
/*  Category palette                                                   */
/* ------------------------------------------------------------------ */

const CATEGORY_COLORS: Record<string, string> = {
  Structures:        'rgba(196, 162, 101, 0.85)',
  Water:             'rgba(140, 180, 220, 0.85)',
  Infrastructure:    'rgba(180, 165, 140, 0.85)',
  Agricultural:      'rgba(180, 200, 150, 0.85)',
  'Land Preparation':'rgba(200, 175, 130, 0.85)',
  Livestock:         'rgba(220, 180, 100, 0.85)',
  Paths:             'rgba(160, 175, 195, 0.85)',
  Utilities:         'rgba(190, 160, 200, 0.85)',
};
const FALLBACK_COLOR = 'rgba(180, 165, 140, 0.7)';

function colorFor(category: string): string {
  return CATEGORY_COLORS[category] ?? FALLBACK_COLOR;
}

/* ------------------------------------------------------------------ */
/*  Tone bands                                                         */
/* ------------------------------------------------------------------ */

type Tone = 'empty' | 'light' | 'balanced' | 'heavy';

const HEAVY_PHASE_SHARE = 0.4;
const LIGHT_PHASE_SHARE = 0.1;

const TONE_LABEL: Record<Tone, string> = {
  empty: 'Empty',
  light: 'Light',
  balanced: 'Balanced',
  heavy: 'Heavy',
};

const TONE_CLASS: Record<Tone, string> = {
  empty: css.toneEmpty!,
  light: css.toneLight!,
  balanced: css.toneBalanced!,
  heavy: css.toneHeavy!,
};

function deriveTone(share: number, total: number): Tone {
  if (total === 0) return 'empty';
  if (share > HEAVY_PHASE_SHARE) return 'heavy';
  if (share < LIGHT_PHASE_SHARE) return 'light';
  return 'balanced';
}

/* ------------------------------------------------------------------ */
/*  Pivot                                                              */
/* ------------------------------------------------------------------ */

interface PhaseSlice {
  phase: string;
  phaseName: string;
  itemCount: number;
  totalLow: number;
  totalMid: number;
  totalHigh: number;
  share: number;
  tone: Tone;
  byCategory: { category: string; mid: number; share: number; count: number }[];
  topItems: CostLineItem[];
}

function pivot(items: CostLineItem[]): {
  phases: PhaseSlice[];
  grandLow: number;
  grandMid: number;
  grandHigh: number;
  categoriesUsed: Set<string>;
} {
  const grandLow = items.reduce((a, it) => a + it.cost.low, 0);
  const grandMid = items.reduce((a, it) => a + it.cost.mid, 0);
  const grandHigh = items.reduce((a, it) => a + it.cost.high, 0);

  const byPhase = new Map<string, CostLineItem[]>();
  for (const it of items) {
    const k = it.phase;
    if (!byPhase.has(k)) byPhase.set(k, []);
    byPhase.get(k)!.push(it);
  }

  const categoriesUsed = new Set<string>();
  const phases: PhaseSlice[] = [];

  for (const [phase, list] of byPhase) {
    const phaseName = list[0]?.phaseName ?? phase;
    const totalLow = list.reduce((a, it) => a + it.cost.low, 0);
    const totalMid = list.reduce((a, it) => a + it.cost.mid, 0);
    const totalHigh = list.reduce((a, it) => a + it.cost.high, 0);
    const share = grandMid > 0 ? totalMid / grandMid : 0;
    const tone = deriveTone(share, grandMid);

    const catMap = new Map<string, { mid: number; count: number }>();
    for (const it of list) {
      categoriesUsed.add(it.category);
      const e = catMap.get(it.category) ?? { mid: 0, count: 0 };
      e.mid += it.cost.mid;
      e.count += 1;
      catMap.set(it.category, e);
    }
    const byCategory = [...catMap.entries()]
      .map(([category, v]) => ({
        category,
        mid: v.mid,
        share: totalMid > 0 ? v.mid / totalMid : 0,
        count: v.count,
      }))
      .sort((a, b) => b.mid - a.mid);

    const topItems = [...list].sort((a, b) => b.cost.mid - a.cost.mid).slice(0, 3);

    phases.push({
      phase,
      phaseName,
      itemCount: list.length,
      totalLow,
      totalMid,
      totalHigh,
      share,
      tone,
      byCategory,
      topItems,
    });
  }

  phases.sort((a, b) => {
    // Order by phase string when it follows "Phase N" pattern; otherwise by name.
    const an = parseInt(a.phase.replace(/[^0-9]/g, ''), 10);
    const bn = parseInt(b.phase.replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
    return a.phaseName.localeCompare(b.phaseName);
  });

  return { phases, grandLow, grandMid, grandHigh, categoriesUsed };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  model: FinancialModel;
}

export default function CostByFeaturePhaseCard({ model }: Props) {
  const { phases, grandLow, grandMid, grandHigh, categoriesUsed } = useMemo(
    () => pivot(model.costLineItems),
    [model.costLineItems],
  );

  const peakPhase = phases.length > 0
    ? phases.reduce((a, b) => (b.totalMid > a.totalMid ? b : a))
    : null;
  const heavyCount = phases.filter((p) => p.tone === 'heavy').length;
  const totalItems = model.costLineItems.length;

  let verdict: 'unknown' | 'block' | 'work' | 'done';
  let verdictText: string;
  if (totalItems === 0) {
    verdict = 'unknown';
    verdictText = 'No cost line items derived yet — place features on the map.';
  } else if (heavyCount > 1) {
    verdict = 'work';
    verdictText = `${heavyCount} phases each carry >${Math.round(HEAVY_PHASE_SHARE * 100)}% of budget.`;
  } else if (heavyCount === 1 && peakPhase) {
    verdict = 'work';
    verdictText = `${peakPhase.phaseName} carries ${Math.round(peakPhase.share * 100)}% of budget — sticker-shock candidate.`;
  } else {
    verdict = 'done';
    verdictText = `Cost spread is balanced across ${phases.length} phase${phases.length === 1 ? '' : 's'}.`;
  }

  const VERDICT_CLASS = {
    unknown: css.verdictUnknown!,
    block: css.verdictBlock!,
    work: css.verdictWork!,
    done: css.verdictDone!,
  } as const;

  const VERDICT_LABEL = {
    unknown: 'No cost data',
    block: 'No cost data',
    work: 'Concentrated',
    done: 'Spread balanced',
  } as const;

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Cost by feature & phase
            <span className={css.badge}>HEURISTIC</span>
            <span className={css.tag}>§22</span>
          </h3>
          <p className={css.cardHint}>
            Of the project's total estimated investment, how much each
            build phase carries, broken down by cost category, with the
            top contributing features per phase. <em>Heavy</em> phases
            carry &gt;{Math.round(HEAVY_PHASE_SHARE * 100)}% of total spend &mdash;
            sticker-shock candidates worth shifting or sequencing.
          </p>
        </div>
        <div className={`${css.verdictPill} ${VERDICT_CLASS[verdict]}`}>
          <span className={css.verdictLabel}>{VERDICT_LABEL[verdict]}</span>
          <span className={css.verdictText}>{verdictText}</span>
        </div>
      </div>

      <div className={css.statStrip}>
        <Stat label="Total budget" value={formatKRange(grandLow, grandHigh)} sub="low–high range" />
        <Stat label="Phases" value={phases.length} sub={`${heavyCount} heavy`} />
        <Stat label="Features" value={totalItems} sub="cost-bearing" />
        <Stat
          label="Peak phase"
          value={peakPhase ? `${Math.round(peakPhase.share * 100)}%` : '—'}
          sub={peakPhase ? peakPhase.phaseName : 'no data'}
          tone={peakPhase && peakPhase.share > HEAVY_PHASE_SHARE ? 'warn' : 'good'}
        />
      </div>

      {phases.length === 0 ? (
        <p className={css.empty}>
          No cost line items yet. Place structures, paths, paddocks, utilities, crops,
          or zones on the map — costs are derived per feature.
        </p>
      ) : (
        <ul className={css.phaseList}>
          {phases.map((ph) => (
            <li key={ph.phase} className={`${css.phaseRow} ${TONE_CLASS[ph.tone]}`}>
              <div className={css.phaseHead}>
                <span className={css.phaseName}>{ph.phaseName}</span>
                <span className={`${css.tonePill} ${TONE_CLASS[ph.tone]}`}>
                  {TONE_LABEL[ph.tone]}
                </span>
                <span className={css.phaseStats}>
                  {ph.itemCount} feature{ph.itemCount === 1 ? '' : 's'} &middot;{' '}
                  {formatKRange(ph.totalLow, ph.totalHigh)} &middot;{' '}
                  {Math.round(ph.share * 100)}%
                </span>
              </div>

              {ph.totalMid > 0 && (
                <div className={css.stackBar} role="presentation">
                  {ph.byCategory.map((c) => (
                    <span
                      key={c.category}
                      className={css.stackBarSeg}
                      style={{ width: `${c.share * 100}%`, background: colorFor(c.category) }}
                      title={`${c.category}: ${Math.round(c.share * 100)}%`}
                    />
                  ))}
                </div>
              )}

              <ul className={css.catList}>
                {ph.byCategory.map((c) => (
                  <li key={c.category} className={css.catRow}>
                    <span className={css.catSwatch} style={{ background: colorFor(c.category) }} />
                    <span className={css.catLabel}>{c.category}</span>
                    <span className={css.catValue}>${Math.round(c.mid / 1000)}k</span>
                    <span className={css.catShare}>{Math.round(c.share * 100)}%</span>
                  </li>
                ))}
              </ul>

              {ph.topItems.length > 0 && (
                <div className={css.topItems}>
                  <span className={css.topItemsLabel}>Top drivers:</span>
                  {ph.topItems.map((it) => (
                    <span key={it.id} className={css.topItem}>
                      {it.name}{' '}
                      <span className={css.topItemCost}>${Math.round(it.cost.mid / 1000)}k</span>
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className={css.footnote}>
        <em>Scope:</em> categories observed in this project:{' '}
        {[...categoriesUsed].sort().join(', ') || 'none yet'}.{' '}
        Per-feature costs derive from per-entity templates scaled by placed
        size and the selected{' '}
        <code>region</code> in the economics panel header. The full regional
        benchmark database (manifest §0f &mdash;{' '}
        <code>regional-cost-database</code>) is still planned;
        substitute contractor bids via the in-flight cost-override path when
        it ships.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good' ? css.statGood : tone === 'warn' ? css.statWarn : tone === 'bad' ? css.statBad : '';
  return (
    <div className={css.stat}>
      <span className={css.statLabel}>{label}</span>
      <span className={`${css.statValue} ${toneClass}`}>{value}</span>
      {sub && <span className={css.statSub}>{sub}</span>}
    </div>
  );
}

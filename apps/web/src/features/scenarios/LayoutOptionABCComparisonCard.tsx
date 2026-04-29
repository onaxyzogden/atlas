/**
 * §16 LayoutOptionABCComparisonCard — three derived layout variants
 * over the *current* placed plan, side-by-side.
 *
 * The scenarios panel ships best/base/worst (numerical bands over one
 * plan) and the build-cost-revenue ranges (phase-by-phase envelope).
 * Neither answers "what would my plan look like under three different
 * design philosophies?" — that's this card.
 *
 * HEURISTIC: there is no layout-variant store. The card derives three
 * options as filters over the existing FinancialModel cost line items:
 *
 *   - Option A — Current: the plan as placed.
 *   - Option B — Lean: drops the highest-cost category (typically
 *     Structures), keeps Land Preparation, Agricultural, Infrastructure.
 *   - Option C — Phased-Light: keeps only items in the first two phases
 *     (defers everything from phase 3+ to a future season).
 *
 * For each option: capex (mid), entity count, phase coverage, and a
 * one-line philosophy summary. The card is a thinking tool, not a
 * variant-store. The steward who wants to commit to Option B saves it
 * via the existing scenario-save flow.
 *
 * Pure derivation from FinancialModel — no shared math, no entity
 * edits, no new variant data model.
 *
 * Closes manifest §16 `layout-option-a-b-c-comparison` (P3) partial -> done.
 */

import { useMemo } from 'react';
import { fmtK } from '../../lib/formatRange.js';
import type { FinancialModel, CostLineItem, CostRange } from '../financial/engine/types.js';
import css from './LayoutOptionABCComparisonCard.module.css';

interface Props {
  model: FinancialModel | null;
}

type OptionKey = 'A' | 'B' | 'C';

interface OptionResult {
  key: OptionKey;
  label: string;
  philosophy: string;
  rule: string;
  itemCount: number;
  capexMid: number;
  capexLow: number;
  capexHigh: number;
  phaseCount: number;
  delta: number; // % savings vs Option A
}

function sumCapex(items: ReadonlyArray<CostLineItem>): { range: CostRange; phases: Set<string> } {
  let low = 0;
  let mid = 0;
  let high = 0;
  const phases = new Set<string>();
  for (const it of items) {
    low += it.cost.low;
    mid += it.cost.mid;
    high += it.cost.high;
    phases.add(it.phaseName || it.phase);
  }
  return { range: { low, mid, high }, phases };
}

function highestCostCategory(items: ReadonlyArray<CostLineItem>): string | null {
  const totals = new Map<string, number>();
  for (const it of items) {
    totals.set(it.category, (totals.get(it.category) ?? 0) + it.cost.mid);
  }
  let top: { cat: string; total: number } | null = null;
  for (const [cat, total] of totals) {
    if (!top || total > top.total) top = { cat, total };
  }
  return top?.cat ?? null;
}

const PHASE_ORDER_RE = /(\d+)/;

function phaseOrder(phaseName: string): number {
  const m = phaseName.match(PHASE_ORDER_RE);
  if (!m || !m[1]) return 99;
  return Number.parseInt(m[1], 10);
}

export default function LayoutOptionABCComparisonCard({ model }: Props) {
  const options = useMemo<OptionResult[] | null>(() => {
    if (!model || model.costLineItems.length === 0) return null;

    const all = model.costLineItems;
    const aCapex = sumCapex(all);

    // Option B: drop the highest-cost category.
    const dropCat = highestCostCategory(all);
    const bItems = dropCat ? all.filter((it) => it.category !== dropCat) : all;
    const bCapex = sumCapex(bItems);

    // Option C: keep only items whose phase order is <= 2.
    const cItems = all.filter((it) => phaseOrder(it.phaseName || it.phase) <= 2);
    const cCapex = sumCapex(cItems);

    const aMid = aCapex.range.mid;

    return [
      {
        key: 'A',
        label: 'Current',
        philosophy: 'The plan as placed',
        rule: 'All items in all phases',
        itemCount: all.length,
        capexMid: aCapex.range.mid,
        capexLow: aCapex.range.low,
        capexHigh: aCapex.range.high,
        phaseCount: aCapex.phases.size,
        delta: 0,
      },
      {
        key: 'B',
        label: 'Lean',
        philosophy: 'Drop the heaviest line',
        rule: dropCat ? `Removes all "${dropCat}" items` : 'No category to drop',
        itemCount: bItems.length,
        capexMid: bCapex.range.mid,
        capexLow: bCapex.range.low,
        capexHigh: bCapex.range.high,
        phaseCount: bCapex.phases.size,
        delta: aMid > 0 ? Math.round(((bCapex.range.mid - aMid) / aMid) * 100) : 0,
      },
      {
        key: 'C',
        label: 'Phased-Light',
        philosophy: 'Defer phase 3 and later',
        rule: 'Keeps only phase 1 and phase 2 items',
        itemCount: cItems.length,
        capexMid: cCapex.range.mid,
        capexLow: cCapex.range.low,
        capexHigh: cCapex.range.high,
        phaseCount: cCapex.phases.size,
        delta: aMid > 0 ? Math.round(((cCapex.range.mid - aMid) / aMid) * 100) : 0,
      },
    ];
  }, [model]);

  if (!options) {
    return (
      <section className={css.card} aria-label="Layout option A/B/C comparison">
        <header className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Layout Options A / B / C</h3>
            <p className={css.cardHint}>
              Three derived design variants over the current plan. Place features to populate.
            </p>
          </div>
          <span className={css.heuristicBadge}>HEURISTIC</span>
        </header>
        <p className={css.empty}>No cost line items yet.</p>
      </section>
    );
  }

  return (
    <section className={css.card} aria-label="Layout option A/B/C comparison">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Layout Options A / B / C</h3>
          <p className={css.cardHint}>
            Three filter-based variants over the current plan {'\u2014'} a thinking tool for
            "what if I went leaner, or deferred everything past phase 2?" Save the variant
            you commit to via the standard scenario flow.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </header>

      <div className={css.optionsGrid}>
        {options.map((opt) => (
          <div key={opt.key} className={`${css.option} ${css['option' + opt.key]}`}>
            <div className={css.optionHead}>
              <span className={css.optionKey}>OPTION {opt.key}</span>
              <span className={css.optionLabel}>{opt.label}</span>
            </div>
            <p className={css.optionPhilosophy}>{opt.philosophy}</p>
            <div className={css.optionStats}>
              <div className={css.statRow}>
                <span className={css.statLabel}>Capex (mid)</span>
                <span className={css.statValue}>{fmtK(opt.capexMid)}</span>
              </div>
              <div className={css.statRow}>
                <span className={css.statLabel}>Range</span>
                <span className={css.statSub}>
                  {fmtK(opt.capexLow)}{'\u2013'}{fmtK(opt.capexHigh)}
                </span>
              </div>
              <div className={css.statRow}>
                <span className={css.statLabel}>Items</span>
                <span className={css.statSub}>{opt.itemCount}</span>
              </div>
              <div className={css.statRow}>
                <span className={css.statLabel}>Phases used</span>
                <span className={css.statSub}>{opt.phaseCount}</span>
              </div>
              {opt.key !== 'A' && (
                <div className={css.statRow}>
                  <span className={css.statLabel}>vs A</span>
                  <span className={`${css.statDelta} ${opt.delta < 0 ? css.deltaDown : ''}`}>
                    {opt.delta > 0 ? '+' : ''}
                    {opt.delta}%
                  </span>
                </div>
              )}
            </div>
            <div className={css.optionRule}>{opt.rule}</div>
          </div>
        ))}
      </div>

      <p className={css.footnote}>
        These variants are filters, not commitments. Option B drops one category; Option C
        defers later phases. Real layout iteration {'\u2014'} reshaping zones, swapping
        structure types, repositioning paddocks {'\u2014'} happens on the map and gets saved
        as a full scenario.
      </p>
    </section>
  );
}

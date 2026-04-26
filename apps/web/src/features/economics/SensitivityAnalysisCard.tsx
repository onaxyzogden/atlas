/**
 * §22 SensitivityAnalysisCard — surfaces the deterministic levers behind atlas's
 * existing scoring and shows how ±20% / ±50% perturbations shift the headline
 * financial metrics. Pure presentation: applies linear scaling to the values
 * already returned by useFinancialModel — does not call into shared math.
 *
 * Four levers:
 *   - Capital cost factor (scales totalInvestment + peakOutlay + breakEven year)
 *   - Operating cost factor (scales annual operating costs → breakEven year)
 *   - Revenue ramp (scales annualRevenueAtMaturity → breakEven year)
 *   - Carbon credit price (scales carbon revenue stream — surfaces uncertainty
 *     in voluntary-market pricing)
 *
 * One headline metric selector (totalInvestment / annualRevenue / breakEvenYear).
 * Tornado-style row per lever showing perturbed value at -50/-20/baseline/+20/+50.
 */

import { useMemo, useState } from 'react';
import type { FinancialModel } from '../financial/engine/types.js';
import css from './SensitivityAnalysisCard.module.css';

interface Props {
  model: FinancialModel;
}

type Metric = 'investment' | 'revenue' | 'breakeven';
type LeverKey = 'capital' | 'operating' | 'revenue' | 'carbon';

interface Lever {
  key: LeverKey;
  label: string;
  description: string;
  /** Which metrics this lever directly affects */
  affects: Set<Metric>;
}

const LEVERS: Lever[] = [
  {
    key: 'capital',
    label: 'Capital cost factor',
    description: 'Scales every cost line item (structures, water, infrastructure, agricultural). Captures regional pricing, contractor markup, supply chain shifts.',
    affects: new Set(['investment', 'breakeven']),
  },
  {
    key: 'operating',
    label: 'Operating cost factor',
    description: 'Scales annual operating costs (maintenance, inputs, labor). Captures inflation, fuel/feed price drift.',
    affects: new Set(['breakeven']),
  },
  {
    key: 'revenue',
    label: 'Revenue ramp factor',
    description: 'Scales annualRevenueAtMaturity. Captures market demand, pricing power, enterprise execution.',
    affects: new Set(['revenue', 'breakeven']),
  },
  {
    key: 'carbon',
    label: 'Carbon credit price',
    description: 'Voluntary-market pricing volatility. Currently $30\u2013$50/tonne baseline. ±50% spans the realistic 2024\u20132030 range.',
    affects: new Set(['revenue', 'breakeven']),
  },
];

const PERTURBATIONS: { value: number; label: string }[] = [
  { value: -0.5, label: '\u221250%' },
  { value: -0.2, label: '\u221220%' },
  { value: 0, label: 'Baseline' },
  { value: 0.2, label: '+20%' },
  { value: 0.5, label: '+50%' },
];

const METRIC_LABELS: Record<Metric, string> = {
  investment: 'Total investment',
  revenue: 'Annual revenue at maturity',
  breakeven: 'Break-even year',
};

const METRIC_HINTS: Record<Metric, string> = {
  investment: 'How sensitive is the up-front cost to assumption shifts?',
  revenue: 'How sensitive is mature annual revenue to assumption shifts?',
  breakeven: 'How sensitive is payback timing to assumption shifts?',
};

function formatUsdK(v: number): string {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}M`;
  return `$${Math.round(v)}K`;
}

function formatBreakEven(v: number | null): string {
  if (v == null) return '10+';
  if (v > 10) return '10+';
  return `Yr ${v.toFixed(1)}`;
}

/**
 * Compute perturbed metric value given a lever and delta.
 * Math is intentionally simple linear scaling — the goal is to surface
 * directional sensitivity, not a precision forecast.
 */
function perturbMetric(
  metric: Metric,
  lever: LeverKey,
  delta: number,
  baseline: { investmentK: number; revenueK: number; breakEvenYr: number | null },
): number | null {
  if (!LEVERS.find((l) => l.key === lever)?.affects.has(metric)) {
    // Lever doesn't affect this metric — return baseline
    if (metric === 'investment') return baseline.investmentK;
    if (metric === 'revenue') return baseline.revenueK;
    return baseline.breakEvenYr;
  }

  if (metric === 'investment') {
    if (lever === 'capital') return baseline.investmentK * (1 + delta);
    return baseline.investmentK;
  }

  if (metric === 'revenue') {
    if (lever === 'revenue') return baseline.revenueK * (1 + delta);
    if (lever === 'carbon') {
      // Carbon contributes ~10\u201320% of revenue typically; we approximate the
      // marginal effect at 15% of total revenue
      return baseline.revenueK * (1 + delta * 0.15);
    }
    return baseline.revenueK;
  }

  // Break-even: cost levers push it later, revenue levers pull it earlier
  if (baseline.breakEvenYr == null) return null;
  let factor = 1;
  if (lever === 'capital') factor = 1 + delta;
  else if (lever === 'operating') factor = 1 + delta * 0.5; // operating is partial year-by-year
  else if (lever === 'revenue') factor = 1 / Math.max(0.1, 1 + delta);
  else if (lever === 'carbon') factor = 1 / Math.max(0.5, 1 + delta * 0.15);
  const result = baseline.breakEvenYr * factor;
  if (result > 10) return null; // off the chart
  return Math.max(0.5, result);
}

function formatPerturbed(metric: Metric, value: number | null): string {
  if (metric === 'breakeven') return formatBreakEven(value);
  if (value == null) return '\u2014';
  return formatUsdK(value);
}

function deltaFromBaseline(metric: Metric, perturbed: number | null, baseline: number | null): {
  pct: number | null;
  direction: 'up' | 'down' | 'flat';
} {
  if (perturbed == null || baseline == null || baseline === 0) {
    return { pct: null, direction: 'flat' };
  }
  const pct = ((perturbed - baseline) / Math.abs(baseline)) * 100;
  if (Math.abs(pct) < 0.5) return { pct: 0, direction: 'flat' };
  // For break-even, "up" (later) is bad; for investment, "up" is bad; for revenue, "up" is good.
  return { pct, direction: pct > 0 ? 'up' : 'down' };
}

function toneForDelta(metric: Metric, direction: 'up' | 'down' | 'flat'): string {
  if (direction === 'flat') return css.toneFlat ?? '';
  // Revenue up = good (sage); Cost/BE up = bad (rust).
  const upIsBad = metric === 'investment' || metric === 'breakeven';
  if (direction === 'up') return (upIsBad ? css.toneBad : css.toneGood) ?? '';
  return (upIsBad ? css.toneGood : css.toneBad) ?? '';
}

export default function SensitivityAnalysisCard({ model }: Props) {
  const [metric, setMetric] = useState<Metric>('breakeven');

  const baseline = useMemo(() => ({
    investmentK: model.totalInvestment.mid / 1000,
    revenueK: model.annualRevenueAtMaturity.mid / 1000,
    breakEvenYr: model.breakEven.breakEvenYear.mid,
  }), [model]);

  const baselineForMetric: number | null =
    metric === 'investment' ? baseline.investmentK :
    metric === 'revenue' ? baseline.revenueK :
    baseline.breakEvenYr;

  const baselineDisplay = formatPerturbed(metric, baselineForMetric);

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Sensitivity by assumption</h3>
          <p className={css.hint}>
            Atlas{'\u2019'}s headline numbers depend on a handful of deterministic levers. This card
            surfaces them and shows how ±20% or ±50% shifts in each lever move one headline metric.
          </p>
        </div>
        <span className={css.modeBadge}>P3 \u00B7 §22</span>
      </div>

      {/* Metric selector */}
      <div className={css.metricRow}>
        {(['investment', 'revenue', 'breakeven'] as Metric[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={metric === m ? css.metricBtnActive : css.metricBtn}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>
      <div className={css.metricHint}>{METRIC_HINTS[metric]}</div>

      {/* Baseline strip */}
      <div className={css.baselineStrip}>
        <span className={css.baselineLabel}>Baseline {METRIC_LABELS[metric].toLowerCase()}</span>
        <span className={css.baselineValue}>{baselineDisplay}</span>
      </div>

      {/* Tornado rows */}
      <div className={css.tornadoHead}>
        <div className={css.tornadoHeadLever}>Lever</div>
        {PERTURBATIONS.map((p) => (
          <div key={p.value} className={css.tornadoHeadCell}>{p.label}</div>
        ))}
      </div>

      {LEVERS.map((lever) => {
        const affects = lever.affects.has(metric);
        return (
          <div key={lever.key} className={affects ? css.leverRow : css.leverRowDimmed}>
            <div className={css.leverCell}>
              <div className={css.leverLabel}>{lever.label}</div>
              <div className={css.leverDesc}>{lever.description}</div>
              {!affects && (
                <div className={css.leverNotApplicable}>
                  Does not affect {METRIC_LABELS[metric].toLowerCase()}.
                </div>
              )}
            </div>
            {PERTURBATIONS.map((p) => {
              const perturbed = perturbMetric(metric, lever.key, p.value, baseline);
              const isBaseline = p.value === 0;
              const { pct, direction } = deltaFromBaseline(metric, perturbed, baselineForMetric);
              const tone = isBaseline ? css.toneFlat : toneForDelta(metric, direction);
              return (
                <div key={p.value} className={`${css.cell} ${tone}`}>
                  <div className={css.cellValue}>
                    {formatPerturbed(metric, perturbed)}
                  </div>
                  {!isBaseline && pct != null && (
                    <div className={css.cellDelta}>
                      {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className={css.legend}>
        <span className={css.legendItem}>
          <span className={`${css.legendDot} ${css.toneGood}`} />
          Favorable shift
        </span>
        <span className={css.legendItem}>
          <span className={`${css.legendDot} ${css.toneBad}`} />
          Adverse shift
        </span>
        <span className={css.legendItem}>
          <span className={`${css.legendDot} ${css.toneFlat}`} />
          No effect / baseline
        </span>
      </div>

      <div className={css.footnote}>
        Linear scaling against {' '}
        <code className={css.code}>useFinancialModel</code> baseline values {'\u2014'} no Monte Carlo, no second-order coupling.
        Break-even row uses approximate factors (operating cost half-weighted vs. capital;
        carbon weighted at 15% of revenue impact). Use this for directional sensitivity, not precision forecasting.
      </div>
    </div>
  );
}

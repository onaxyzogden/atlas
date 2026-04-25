/**
 * §16 BestBaseWorstCaseCard — formal best-case / base-case / worst-case
 * projection summary for the current design.
 *
 * The financial engine already produces low/mid/high cost ranges across
 * capital, cashflow, break-even, and ROI. This card collapses those bands
 * into the canonical scenario triad — what regulators, lenders, and
 * insurance underwriters actually expect to see — and contrasts them
 * side-by-side so the steward sees the full envelope, not just the mid.
 *
 * Pure derivation from the existing FinancialModel — no new math, no
 * scenario-store writes. The "scenario" framing here is the uncertainty
 * envelope of the current design, not saved snapshots.
 */
import { useMemo } from 'react';
import { fmtK } from '../../lib/formatRange.js';
import type { FinancialModel } from '../financial/engine/types.js';
import css from './BestBaseWorstCaseCard.module.css';

interface BestBaseWorstCaseCardProps {
  model: FinancialModel | null;
}

type CaseKey = 'best' | 'base' | 'worst';

interface CaseColumn {
  key: CaseKey;
  label: string;
  sublabel: string;
  capital: number;
  breakEven: number | null;
  year5Cf: number;
  year10Cf: number;
  roiPct: number;
  annualRev: number;
}

export default function BestBaseWorstCaseCard({ model }: BestBaseWorstCaseCardProps) {
  const cases = useMemo<CaseColumn[] | null>(() => {
    if (!model) return null;
    const cf5 = model.cashflow[5]?.cumulativeCashflow ?? { low: 0, mid: 0, high: 0 };
    const cf10 = model.cashflow[10]?.cumulativeCashflow ?? { low: 0, mid: 0, high: 0 };
    return [
      {
        key: 'best',
        label: 'Best case',
        sublabel: 'Low cost · high revenue',
        capital: model.totalInvestment.low,
        breakEven: model.breakEven.breakEvenYear.low,
        year5Cf: cf5.high,
        year10Cf: cf10.high,
        roiPct: model.breakEven.tenYearROI.high,
        annualRev: model.annualRevenueAtMaturity.high,
      },
      {
        key: 'base',
        label: 'Base case',
        sublabel: 'Mid-range estimate',
        capital: model.totalInvestment.mid,
        breakEven: model.breakEven.breakEvenYear.mid,
        year5Cf: cf5.mid,
        year10Cf: cf10.mid,
        roiPct: model.breakEven.tenYearROI.mid,
        annualRev: model.annualRevenueAtMaturity.mid,
      },
      {
        key: 'worst',
        label: 'Worst case',
        sublabel: 'High cost · low revenue',
        capital: model.totalInvestment.high,
        breakEven: model.breakEven.breakEvenYear.high,
        year5Cf: cf5.low,
        year10Cf: cf10.low,
        roiPct: model.breakEven.tenYearROI.low,
        annualRev: model.annualRevenueAtMaturity.low,
      },
    ];
  }, [model]);

  if (!model || !cases) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Best / Base / Worst Case</h3>
            <p className={css.cardHint}>
              Place features and configure the financial engine to surface the uncertainty envelope.
            </p>
          </div>
          <span className={css.heuristicBadge}>UNCERTAINTY</span>
        </div>
      </div>
    );
  }

  // Spread between best and worst — flagged when extreme
  const capitalSpread =
    cases[2]!.capital > 0
      ? Math.round(((cases[2]!.capital - cases[0]!.capital) / cases[1]!.capital) * 100)
      : 0;
  const roiSpread = cases[0]!.roiPct - cases[2]!.roiPct;
  const wide = capitalSpread > 60 || roiSpread > 80;

  const fmtBE = (be: number | null) => (be != null ? `Year ${be}` : '10+');
  const fmtROI = (r: number) => `${r}%`;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Best / Base / Worst Case</h3>
          <p className={css.cardHint}>
            Side-by-side projection of the current design under three uncertainty regimes. Best case combines low
            cost and high revenue assumptions; worst case is the inverse. Lenders and underwriters expect this
            envelope — not just the mid-point.
          </p>
        </div>
        <span className={css.heuristicBadge}>UNCERTAINTY</span>
      </div>

      <div className={css.caseGrid}>
        {cases.map((c) => (
          <div key={c.key} className={`${css.caseCol} ${css[`case_${c.key}`]}`}>
            <div className={css.caseLabel}>{c.label}</div>
            <div className={css.caseSublabel}>{c.sublabel}</div>

            <div className={css.metricRow}>
              <span className={css.metricKey}>Capital</span>
              <span className={css.metricVal}>{fmtK(c.capital)}</span>
            </div>
            <div className={css.metricRow}>
              <span className={css.metricKey}>Break-even</span>
              <span className={css.metricVal}>{fmtBE(c.breakEven)}</span>
            </div>
            <div className={css.metricRow}>
              <span className={css.metricKey}>Year 5</span>
              <span className={css.metricVal}>{fmtK(c.year5Cf)}</span>
            </div>
            <div className={css.metricRow}>
              <span className={css.metricKey}>Year 10</span>
              <span className={css.metricVal}>{fmtK(c.year10Cf)}</span>
            </div>
            <div className={css.metricRow}>
              <span className={css.metricKey}>10-yr ROI</span>
              <span className={css.metricVal}>{fmtROI(c.roiPct)}</span>
            </div>
            <div className={css.metricRow}>
              <span className={css.metricKey}>Revenue / yr</span>
              <span className={css.metricVal}>{fmtK(c.annualRev)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={css.spreadBlock}>
        <div className={css.spreadRow}>
          <span className={css.spreadLabel}>Capital spread (worst − best, % of base)</span>
          <span className={`${css.spreadVal} ${capitalSpread > 60 ? css.spreadHigh : css.spreadOk}`}>
            {capitalSpread}%
          </span>
        </div>
        <div className={css.spreadRow}>
          <span className={css.spreadLabel}>ROI swing (best − worst)</span>
          <span className={`${css.spreadVal} ${roiSpread > 80 ? css.spreadHigh : css.spreadOk}`}>
            {roiSpread} pp
          </span>
        </div>
      </div>

      {wide && (
        <div className={css.callout}>
          <strong>Wide uncertainty envelope.</strong> The gap between best and worst case is large enough that
          financing decisions should be stress-tested against the worst-case column, not the base-case mid. Consider
          tightening cost benchmarks or revenue assumptions before committing capital.
        </div>
      )}

      <p className={css.footnote}>
        All figures derived from the financial engine's existing low/mid/high cost ranges — no separate Monte Carlo
        run. Revenue best/worst inverts the cost band on the assumption that good operating conditions reduce cost
        and lift revenue together. For independent revenue distributions, use the saved-scenario comparison below.
      </p>
    </div>
  );
}

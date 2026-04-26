/**
 * §16 BuildCostRevenueRangesCard — phase-by-phase capital and revenue
 * envelope across milestone years.
 *
 * BestBaseWorstCaseCard collapses the FinancialModel into one best/base/worst
 * triad. This card unrolls that envelope across time: at year 0, 1, 3, 5, 10
 * it shows the capital outlay band and the revenue band side-by-side, plus
 * the spread (high-low)/mid as an uncertainty proxy. The envelope direction —
 * narrowing (assumptions converge), widening (risk grows), or flat — is
 * surfaced as a single insight line.
 *
 * Pure derivation from FinancialModel.cashflow — no new shared math, no
 * scenario-store writes.
 */
import { useMemo } from 'react';
import { fmtK } from '../../lib/formatRange.js';
import type { FinancialModel, CostRange } from '../financial/engine/types.js';
import css from './BuildCostRevenueRangesCard.module.css';

interface BuildCostRevenueRangesCardProps {
  model: FinancialModel | null;
}

const MILESTONE_YEARS: readonly number[] = [0, 1, 3, 5, 10];

interface YearRow {
  year: number;
  capital: CostRange;
  revenue: CostRange;
  cumulative: CostRange;
  capitalSpread: number;
  revenueSpread: number;
}

function spreadPct(range: CostRange): number {
  if (range.mid === 0) return 0;
  return Math.round(((range.high - range.low) / Math.abs(range.mid)) * 100);
}

function spreadClass(pct: number): string | undefined {
  return pct > 80 ? css.spreadWide : css.spreadOk;
}

export default function BuildCostRevenueRangesCard({ model }: BuildCostRevenueRangesCardProps) {
  const rows = useMemo<YearRow[] | null>(() => {
    if (!model) return null;
    return MILESTONE_YEARS
      .map((y) => {
        const cf = model.cashflow[y];
        if (!cf) return null;
        return {
          year: y,
          capital: cf.capitalCosts,
          revenue: cf.revenue,
          cumulative: cf.cumulativeCashflow,
          capitalSpread: spreadPct(cf.capitalCosts),
          revenueSpread: spreadPct(cf.revenue),
        };
      })
      .filter((r): r is YearRow => r !== null);
  }, [model]);

  const envelope = useMemo(() => {
    if (!rows || rows.length < 2) return null;
    const first = rows[0];
    const last = rows[rows.length - 1];
    if (!first || !last) return null;
    const startSpread = first.revenueSpread || first.capitalSpread;
    const endSpread = last.revenueSpread;
    const delta = endSpread - startSpread;
    if (Math.abs(delta) < 10) {
      return {
        direction: 'flat' as const,
        className: css.envelopeFlat,
        message: `Uncertainty stays roughly constant (~${endSpread}% revenue spread) from year ${first.year} to year ${last.year}. Neither converging nor diverging — assumptions hold but don't sharpen.`,
      };
    }
    if (delta < 0) {
      return {
        direction: 'narrowing' as const,
        className: css.envelopeNarrowing,
        message: `Envelope narrows over time — revenue spread tightens from ${startSpread}% (year ${first.year}) to ${endSpread}% (year ${last.year}). Confidence grows as enterprises mature.`,
      };
    }
    return {
      direction: 'widening' as const,
      className: css.envelopeWidening,
      message: `Envelope widens over time — revenue spread grows from ${startSpread}% (year ${first.year}) to ${endSpread}% (year ${last.year}). Long-horizon assumptions carry more risk than near-term ones.`,
    };
  }, [rows]);

  if (!model || !rows || rows.length === 0) {
    return (
      <section className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Build cost &amp; revenue ranges</h3>
            <p className={css.cardHint}>
              Phase-by-phase capital and revenue envelope. Add zones, structures, and enterprises to populate the ten-year cashflow.
            </p>
          </div>
          <span className={css.modeBadge}>HEURISTIC</span>
        </div>
        <div className={css.empty}>No cashflow data — model not yet computed.</div>
      </section>
    );
  }

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Build cost &amp; revenue ranges</h3>
          <p className={css.cardHint}>
            How the capital outlay and revenue bands evolve across milestone years. Spread = (high − low) / mid; wider spreads mean less certainty.
          </p>
        </div>
        <span className={css.modeBadge}>HEURISTIC</span>
      </div>

      <div className={css.sectionLabel}>Capital outlay (per-year build cost)</div>
      <div className={css.table}>
        <div className={css.headCell}>Year</div>
        <div className={css.headCell}>Low</div>
        <div className={css.headCell}>Mid</div>
        <div className={css.headCell}>High</div>
        <div className={css.headCell}>Spread</div>
        {rows.map((r) => (
          <CapitalRow key={`cap-${r.year}`} row={r} />
        ))}
      </div>

      <div className={css.sectionLabel}>Revenue (per-year)</div>
      <div className={css.table}>
        <div className={css.headCell}>Year</div>
        <div className={css.headCell}>Low</div>
        <div className={css.headCell}>Mid</div>
        <div className={css.headCell}>High</div>
        <div className={css.headCell}>Spread</div>
        {rows.map((r) => (
          <RevenueRow key={`rev-${r.year}`} row={r} />
        ))}
      </div>

      <div className={css.sectionLabel}>Cumulative cashflow</div>
      <div className={css.table}>
        <div className={css.headCell}>Year</div>
        <div className={css.headCell}>Low</div>
        <div className={css.headCell}>Mid</div>
        <div className={css.headCell}>High</div>
        <div className={css.headCell}>Spread</div>
        {rows.map((r) => (
          <CumulativeRow key={`cum-${r.year}`} row={r} />
        ))}
      </div>

      {envelope && (
        <div className={`${css.envelopeRow} ${envelope.className}`}>
          <div className={css.envelopeLabel}>Envelope direction · {envelope.direction}</div>
          <div className={css.envelopeNote}>{envelope.message}</div>
        </div>
      )}

      <div className={css.assumption}>
        Ranges read directly from the FinancialModel low/mid/high cashflow at years {MILESTONE_YEARS.join(', ')}. Spread is a relative-uncertainty proxy — it doesn't replace a full sensitivity analysis but flags where bands grow uncomfortable. A widening envelope late in the horizon usually means enterprise-mix or pricing assumptions, not build cost.
      </div>
    </section>
  );
}

function CapitalRow({ row }: { row: YearRow }) {
  return (
    <>
      <div className={css.yearCell}>Y{row.year}</div>
      <div className={`${css.cell} ${css.cell_low}`}>{fmtK(row.capital.low)}</div>
      <div className={`${css.cell} ${css.cell_mid}`}>{fmtK(row.capital.mid)}</div>
      <div className={`${css.cell} ${css.cell_high}`}>{fmtK(row.capital.high)}</div>
      <div className={`${css.spreadCell} ${spreadClass(row.capitalSpread)}`}>
        {row.capital.mid === 0 ? '—' : `${row.capitalSpread}%`}
      </div>
    </>
  );
}

function RevenueRow({ row }: { row: YearRow }) {
  return (
    <>
      <div className={css.yearCell}>Y{row.year}</div>
      <div className={`${css.cell} ${css.cell_low}`}>{fmtK(row.revenue.low)}</div>
      <div className={`${css.cell} ${css.cell_mid}`}>{fmtK(row.revenue.mid)}</div>
      <div className={`${css.cell} ${css.cell_high}`}>{fmtK(row.revenue.high)}</div>
      <div className={`${css.spreadCell} ${spreadClass(row.revenueSpread)}`}>
        {row.revenue.mid === 0 ? '—' : `${row.revenueSpread}%`}
      </div>
    </>
  );
}

function CumulativeRow({ row }: { row: YearRow }) {
  const spread = spreadPct(row.cumulative);
  return (
    <>
      <div className={css.yearCell}>Y{row.year}</div>
      <div className={`${css.cell} ${css.cell_low}`}>{fmtK(row.cumulative.low)}</div>
      <div className={`${css.cell} ${css.cell_mid}`}>{fmtK(row.cumulative.mid)}</div>
      <div className={`${css.cell} ${css.cell_high}`}>{fmtK(row.cumulative.high)}</div>
      <div className={`${css.spreadCell} ${spreadClass(spread)}`}>
        {row.cumulative.mid === 0 ? '—' : `${spread}%`}
      </div>
    </>
  );
}

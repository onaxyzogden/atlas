/**
 * BreakEvenWidget -- live result for `enterprise-break-even`.
 *
 * COVENANT (Amanah Gate): cost-recovery TIMING only. It renders the year in
 * which cumulative cashflow first turns non-negative, plus the peak capital
 * outlay before that recovery. It reads ONLY `breakEven.breakEvenYear` and
 * `breakEven.peakNegativeCashflow` from the existing financial model -- it
 * NEVER reads or shows `tenYearROI`, and carries no advance-sale / salam /
 * CSRA / investor / yield framing (fiqh-csra-erased 2026-05-04). It adds NO
 * input field of its own; revenue assumptions are refined on the existing
 * steward-editable Economics surface (the revenueOverrides path). A covenant
 * guard test pins the rendered text against the forbidden-token list.
 */
import { useFinancialModel } from '../../../../features/financial/hooks/useFinancialModel.js';
import type { CostRange } from '../../../../features/financial/engine/types.js';
import css from './formulaWidget.module.css';

interface Props {
  projectId: string;
  resultLabel?: string;
}

function formatMoney(value: number): string {
  const abs = Math.round(Math.abs(value));
  return `$${abs.toLocaleString()}`;
}

/** Range label like "Year 3 (2-5)" or just "Year 3"; null => beyond horizon. */
function formatRecovery(year: { low: number | null; mid: number | null; high: number | null }): string {
  if (year.mid == null) return 'Beyond 10-yr horizon';
  const lo = year.low;
  const hi = year.high;
  if (lo != null && hi != null && (lo !== year.mid || hi !== year.mid)) {
    return `~Year ${year.mid} (${lo}-${hi})`;
  }
  return `~Year ${year.mid}`;
}

function formatOutlay(peak: CostRange): string {
  // peakNegativeCashflow is <= 0; show as a positive capital figure.
  if (peak.low === peak.high) return formatMoney(peak.mid);
  return `${formatMoney(peak.low)}-${formatMoney(peak.high)}`;
}

export default function BreakEvenWidget({ projectId, resultLabel }: Props) {
  const model = useFinancialModel(projectId);

  return (
    <div className={css.widget}>
      <h4 className={css.title}>{resultLabel ?? 'Break-even'}</h4>
      {model ? (
        <>
          <p className={css.hint}>
            Design-time cost-recovery estimate from regional benchmarks -- the
            year cumulative cashflow first turns non-negative.
          </p>
          <div className={css.statGrid}>
            <div className={css.stat}>
              <span className={css.statLabel}>Cost recovery</span>
              <span className={css.statValue}>
                {formatRecovery(model.breakEven.breakEvenYear)}
              </span>
            </div>
            <div className={css.stat}>
              <span className={css.statLabel}>Peak capital outlay</span>
              <span className={css.statValue}>
                {formatOutlay(model.breakEven.peakNegativeCashflow)}
              </span>
            </div>
          </div>
          <p className={css.footnote}>
            Estimate only, not a quote. Refine revenue assumptions on the
            Economics surface to sharpen the recovery timing.
          </p>
        </>
      ) : (
        <p className={css.empty}>
          Awaiting cost &amp; enterprise data -- place paddocks, structures, or
          other features to estimate cost recovery.
        </p>
      )}
    </div>
  );
}

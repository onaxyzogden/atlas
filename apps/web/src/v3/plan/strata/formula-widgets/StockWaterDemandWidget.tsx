/**
 * StockWaterDemandWidget — live result for `stock-water-demand`.
 *
 * Total + per-paddock stock water demand (L/day) via computeStockWaterDemand
 * (shared helper lifting the 60 L/head/day figure from useDesignMetrics).
 * Strictly ecological (water demand) — never financial.
 */
import { useMemo } from 'react';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import {
  computeStockWaterDemand,
  DEMAND_PER_HEAD_LPD,
} from '../../../../features/livestock/stockWaterDemandMath.js';
import css from './formulaWidget.module.css';

interface Props {
  projectId: string;
  resultLabel?: string;
}

export default function StockWaterDemandWidget({
  projectId,
  resultLabel,
}: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const result = useMemo(() => computeStockWaterDemand(paddocks), [paddocks]);
  const ready = result.totalDemandLpd > 0;
  const withDemand = result.perPaddock.filter((r) => r.demandLpd > 0);

  return (
    <div className={css.widget}>
      <h4 className={css.title}>{resultLabel ?? 'Stock water demand'}</h4>
      {ready ? (
        <>
          <p className={css.hint}>
            Daily drinking-water demand at planned stocking, at{' '}
            {DEMAND_PER_HEAD_LPD} L/head/day.
          </p>
          <div className={css.statGrid}>
            <div className={css.stat}>
              <span className={css.statLabel}>Total demand</span>
              <span className={css.statValue}>
                {result.totalDemandLpd.toLocaleString()} L/day
              </span>
            </div>
          </div>
          <ul className={css.list}>
            {withDemand.map((r) => (
              <li key={r.paddockId} className={css.row}>
                <span className={css.rowName}>
                  {r.paddockName} · {r.head.toFixed(0)} head
                </span>
                <span className={css.rowValue}>
                  {r.demandLpd.toLocaleString()} L/day
                </span>
              </li>
            ))}
          </ul>
          <p className={css.footnote}>
            Coarse single-head figure — cattle run higher, small stock lower.
            Pair with available supply when sizing storage.
          </p>
        </>
      ) : (
        <p className={css.empty}>
          Awaiting paddock data — set a stocking density on at least one
          paddock to estimate stock water demand.
        </p>
      )}
    </div>
  );
}

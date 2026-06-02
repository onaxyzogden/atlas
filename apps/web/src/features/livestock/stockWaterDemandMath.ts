/**
 * stockWaterDemandMath — pure, store-free stock water-demand roll-up.
 *
 * Lifts the per-head water-demand math that until now lived inlined inside
 * `useDesignMetrics` (`paddockWaterDemand` + the `DEMAND_PER_HEAD_LPD = 60`
 * constant). Making it a shared helper lets the Plan formula widget reuse the
 * SAME figure the design-metrics strip already shows, so they cannot diverge.
 *
 * STRICTLY ECOLOGICAL — litres-per-day water demand only. No financial notion.
 */

import type { Paddock } from '../../store/livestockStore.js';

/**
 * Litres-per-day of drinking water per animal head. Verbatim from
 * `useDesignMetrics.DEMAND_PER_HEAD_LPD` — a coarse planning default aligned
 * with the v2 demand figures (cattle run higher, small stock lower; this is a
 * single representative head figure, not a per-species table).
 */
export const DEMAND_PER_HEAD_LPD = 60;

export interface PaddockWaterDemand {
  paddockId: string;
  paddockName: string;
  /** stockingDensity (head/ha) × areaHa. */
  head: number;
  /** head × DEMAND_PER_HEAD_LPD. */
  demandLpd: number;
}

export interface StockWaterDemand {
  totalDemandLpd: number;
  perPaddock: PaddockWaterDemand[];
}

/**
 * Total + per-paddock stock water demand (litres/day) for a set of paddocks.
 * A paddock with no stocking density contributes 0 (mirrors
 * `useDesignMetrics.paddockWaterDemand`, which returns 0 when
 * `stockingDensity` is falsy).
 */
export function computeStockWaterDemand(paddocks: Paddock[]): StockWaterDemand {
  const perPaddock: PaddockWaterDemand[] = paddocks.map((p) => {
    const hasDensity =
      typeof p.stockingDensity === 'number' && p.stockingDensity > 0;
    const areaHa = p.areaM2 / 10_000;
    const head = hasDensity ? p.stockingDensity! * areaHa : 0;
    const demandLpd = head * DEMAND_PER_HEAD_LPD;
    return {
      paddockId: p.id,
      paddockName: p.name,
      head: Math.round(head * 10) / 10,
      demandLpd: Math.round(demandLpd),
    };
  });

  const totalDemandLpd = perPaddock.reduce((s, r) => s + r.demandLpd, 0);
  return { totalDemandLpd, perPaddock };
}

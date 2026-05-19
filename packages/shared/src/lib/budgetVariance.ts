/**
 * budgetVariance — the pure budget-vs-actual engine (Sub-project D3).
 *
 * No React, no store, no I/O. Input is a project-scoped `WorkItem[]` plus a
 * `workItemId → recorded actual` map; output is a single computed result
 * object. It owns the derived, render-only budget surfaces:
 *
 *  1. effective planned band — the manual point estimate `costUSD` promoted
 *     to a degenerate band when present, else the Goal-Compass-seeded
 *     `costRangeAuto`, else a zero band;
 *  2. per-work-item / per-phase / project CostRange rollups (band-wise sums);
 *  3. variance bands (actual − planned per low/mid/high);
 *  4. a render-only `drift` flag (recorded actual midpoint over the planned
 *     ceiling).
 *
 * Derived only — NEVER written back into `WorkItem.status` (single-writer
 * spine discipline, consistent with D0.1 / D1 / D2). Defensive: items / map
 * entries missing data are treated as a zero band rather than throwing.
 *
 * Covenant (D3, binding): strictly project cost/budget tracking. There is no
 * cost-of-capital, financing, advance-purchase, investor/equity, or
 * yield-as-return computation anywhere in this module — those stay in
 * Scholar-gated Sub-project C.
 */

import type { WorkItem } from '../schemas/workItem.schema.js';
import type { CostRange } from '../schemas/costRange.schema.js';

const ZERO: CostRange = { low: 0, mid: 0, high: 0 };

/** Recorded actual for a work item (the card maps its store into this). */
export interface RecordedActual {
  actual: CostRange;
  actualHrs?: number;
}

export interface BudgetCell {
  /** Effective planned band (manual point → degenerate, else auto, else 0). */
  planned: CostRange;
  /** Recorded actual band (zero band when nothing logged). */
  actual: CostRange;
  /** actual − planned, band-wise. */
  variance: CostRange;
  /** Summed actual labour hours (passthrough convenience; 0 when none). */
  actualHrs: number;
  /**
   * Render-only over-budget flag: the recorded actual midpoint exceeds the
   * planned ceiling (`actual.mid > planned.high`). Never persisted, never a
   * `WorkItem.status` write.
   */
  drift: boolean;
}

/** Band-wise CostRange addition. */
export function addRange(a: CostRange, b: CostRange): CostRange {
  return { low: a.low + b.low, mid: a.mid + b.mid, high: a.high + b.high };
}

/** actual − planned, band-wise. */
export function varianceBands(planned: CostRange, actual: CostRange): CostRange {
  return {
    low: actual.low - planned.low,
    mid: actual.mid - planned.mid,
    high: actual.high - planned.high,
  };
}

/**
 * Effective planned cost band for one work item: the manual point estimate
 * `costUSD` promoted to a degenerate band `{c,c,c}` when present (manual
 * wins), else the Goal-Compass-seeded `costRangeAuto`, else a zero band.
 */
export function effectivePlanned(item: WorkItem): CostRange {
  if (typeof item.costUSD === 'number') {
    return { low: item.costUSD, mid: item.costUSD, high: item.costUSD };
  }
  if (item.costRangeAuto) return item.costRangeAuto;
  return ZERO;
}

/** Render-only over-budget test: recorded actual midpoint over planned ceiling. */
export function budgetDrift(planned: CostRange, actual: CostRange): boolean {
  return actual.mid > planned.high;
}

function cell(planned: CostRange, rec: RecordedActual | undefined): BudgetCell {
  const actual = rec?.actual ?? ZERO;
  return {
    planned,
    actual,
    variance: varianceBands(planned, actual),
    actualHrs: rec?.actualHrs ?? 0,
    drift: budgetDrift(planned, actual),
  };
}

export interface BudgetAnalysis {
  /** Per-work-item budget cell. */
  byItemId: Map<string, BudgetCell>;
  /** Per-phase rollup (key `''` collects phase-less items). */
  byPhase: Map<string, BudgetCell>;
  /** Project total rollup. */
  total: BudgetCell;
}

/**
 * Pure: roll planned-vs-actual across a project's work items. `actualsByItemId`
 * is keyed by `WorkItem.id`; absent ⇒ a zero actual band. Items are bucketed
 * per `phaseId` (null/undefined → the `''` bucket) and summed band-wise.
 * Nothing here reads or writes `WorkItem.status`.
 */
export function analyzeBudget(
  items: WorkItem[],
  actualsByItemId: Map<string, RecordedActual>,
): BudgetAnalysis {
  const byItemId = new Map<string, BudgetCell>();
  const phasePlanned = new Map<string, CostRange>();
  const phaseActual = new Map<string, CostRange>();
  const phaseHrs = new Map<string, number>();
  let totPlanned = ZERO;
  let totActual = ZERO;
  let totHrs = 0;

  for (const it of items) {
    const planned = effectivePlanned(it);
    const rec = actualsByItemId.get(it.id);
    const c = cell(planned, rec);
    byItemId.set(it.id, c);

    const pk = it.phaseId ?? '';
    phasePlanned.set(pk, addRange(phasePlanned.get(pk) ?? ZERO, c.planned));
    phaseActual.set(pk, addRange(phaseActual.get(pk) ?? ZERO, c.actual));
    phaseHrs.set(pk, (phaseHrs.get(pk) ?? 0) + c.actualHrs);

    totPlanned = addRange(totPlanned, c.planned);
    totActual = addRange(totActual, c.actual);
    totHrs += c.actualHrs;
  }

  const byPhase = new Map<string, BudgetCell>();
  for (const pk of phasePlanned.keys()) {
    const planned = phasePlanned.get(pk) ?? ZERO;
    const actual = phaseActual.get(pk) ?? ZERO;
    byPhase.set(pk, {
      planned,
      actual,
      variance: varianceBands(planned, actual),
      actualHrs: phaseHrs.get(pk) ?? 0,
      drift: budgetDrift(planned, actual),
    });
  }

  return {
    byItemId,
    byPhase,
    total: {
      planned: totPlanned,
      actual: totActual,
      variance: varianceBands(totPlanned, totActual),
      actualHrs: totHrs,
      drift: budgetDrift(totPlanned, totActual),
    },
  };
}

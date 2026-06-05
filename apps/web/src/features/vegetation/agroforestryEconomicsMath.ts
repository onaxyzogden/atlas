/**
 * Slice 8-C of the 2026-05-21 habitat-feature unification — pure
 * rollup math for the agroforestry program's labor & procurement-cost
 * surface.
 *
 * Joins agroforestry WorkItems against their source DesignElements
 * and the `AGROFORESTRY_CATALOG` to produce two views:
 *
 *   1. Project totals — `totalLaborHrs` (hours) and `totalCostRange`
 *      (USD low/mid/high band).
 *   2. Per-kind rollup — `byKind` Map giving the steward "hedgerow ×3
 *      → 30 hr, $450-2700 band" granularity for phase cashflow.
 *
 * Mirrors `habitatFeatureEconomicsMath` discipline 1:1: pure (no
 * store reads), accepts injectable `catalog` for testing, silently
 * ignores items missing a catalog entry or a recoverable source
 * DesignElement (B4/B5 "omitted-not-stubbed" precedent).
 *
 * Covenant locked: strictly project cost / labor (D3 territory). No
 * riba / gharar / CSRA / salam / investor / financing /
 * cost-of-capital semantics.
 */

import type { WorkItem, CostRange } from '@ogden/shared';
import type { DesignElement } from '../../store/designElementsStore.js';
import {
  AGROFORESTRY_CATALOG,
  agroforestryElementScale,
  scaledAgroforestryCostBand,
  type AgroforestryCatalogEntry,
} from './agroforestryCatalog.js';
import type { AgroforestryKind } from './agroforestrySpineSync.js';

export interface AgroforestryKindRollup {
  /** Number of contributing WorkItems for this kind. */
  count: number;
  /** Total install labor (hours) across this kind. */
  laborHrs: number;
  /** Total procurement cost band (USD) across this kind. */
  costRange: CostRange;
}

export interface AgroforestryProgramEconomics {
  /** Project-wide total install labor (hours). */
  totalLaborHrs: number;
  /** Project-wide total procurement cost band (USD). */
  totalCostRange: CostRange;
  /** Per-kind rollup; empty Map when no agroforestry items contribute. */
  byKind: Map<AgroforestryKind, AgroforestryKindRollup>;
}

function emptyBand(): CostRange {
  return { low: 0, mid: 0, high: 0 };
}

/**
 * Compose the project-level agroforestry economics rollup. Items
 * lacking `generatedFromAgroforestryElement` provenance, a recoverable
 * source DesignElement, or a catalog entry are silently skipped — no
 * stubbed defaults. Override-preservation is left to the spine
 * (`replaceAgroforestryRows`); this is a pure derived view.
 */
export function computeAgroforestryProgramEconomics(args: {
  items: WorkItem[];
  designElements: DesignElement[];
  catalog?: readonly AgroforestryCatalogEntry[];
}): AgroforestryProgramEconomics {
  const { items, designElements } = args;
  const catalog = args.catalog ?? AGROFORESTRY_CATALOG;
  const elById = new Map(designElements.map((e) => [e.id, e]));

  let totalLaborHrs = 0;
  const totalCostRange: CostRange = emptyBand();
  const byKind = new Map<AgroforestryKind, AgroforestryKindRollup>();

  for (const it of items) {
    if (it.source !== 'agroforestry') continue;
    const elId = it.generatedFromAgroforestryElement;
    if (!elId) continue;
    const el = elById.get(elId);
    if (!el) continue;
    const entry = catalog.find((e) => e.kind === el.kind);
    if (!entry) continue;
    const scale = agroforestryElementScale(el, entry.geometry);
    const itemLabor = entry.installLaborHrs * scale;
    const itemCost = scaledAgroforestryCostBand(entry, scale);

    totalLaborHrs += itemLabor;
    totalCostRange.low += itemCost.low;
    totalCostRange.mid += itemCost.mid;
    totalCostRange.high += itemCost.high;

    const prev = byKind.get(entry.kind) ?? {
      count: 0,
      laborHrs: 0,
      costRange: emptyBand(),
    };
    byKind.set(entry.kind, {
      count: prev.count + 1,
      laborHrs: prev.laborHrs + itemLabor,
      costRange: {
        low: prev.costRange.low + itemCost.low,
        mid: prev.costRange.mid + itemCost.mid,
        high: prev.costRange.high + itemCost.high,
      },
    });
  }

  return { totalLaborHrs, totalCostRange, byKind };
}

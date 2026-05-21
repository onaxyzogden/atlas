/**
 * Slice 6 (S6-B) of the 2026-05-21 habitat-feature unification —
 * pure rollup math for the habitat-feature program's labor &
 * procurement-cost surface.
 *
 * Joins habitat-feature WorkItems against their source DesignElements
 * and the `HABITAT_FEATURE_CATALOG` to produce two views:
 *
 *   1. Project totals — `totalLaborHrs` (hours) and `totalCostRange`
 *      (USD low/mid/high band).
 *   2. Per-kind rollup — `byKind` Map giving the steward "owl-box ×3
 *      → 4.5 hr, $45-135 mid" granularity for phase cashflow.
 *
 * Mirrors `coverCropEconomicsMath.computeCoverCropEconomics` discipline:
 * pure (no store reads), accepts injectable `catalog` for testing, and
 * silently ignores items missing a catalog entry or a recoverable
 * source DesignElement (B4/B5 "omitted-not-stubbed" precedent).
 *
 * Covenant locked: strictly project cost / labor (D3 territory). No
 * riba / gharar / CSRA / salam / investor / financing /
 * cost-of-capital semantics — habitat features cost the steward
 * money and hours to install, and that is all this rollup tracks.
 */

import type { WorkItem, CostRange } from '@ogden/shared';
import type { DesignElement } from '../../store/designElementsStore.js';
import {
  HABITAT_FEATURE_CATALOG,
  habitatElementScale,
  scaledCostBand,
  type HabitatFeatureCatalogEntry,
} from './habitatFeatureCatalog.js';
import type { HabitatFeatureKind } from './habitatFeatureSpineSync.js';

export interface HabitatFeatureKindRollup {
  /** Number of contributing WorkItems for this kind. */
  count: number;
  /** Total install labor (hours) across this kind. */
  laborHrs: number;
  /** Total procurement cost band (USD) across this kind. */
  costRange: CostRange;
}

export interface HabitatFeatureProgramEconomics {
  /** Project-wide total install labor (hours). */
  totalLaborHrs: number;
  /** Project-wide total procurement cost band (USD). */
  totalCostRange: CostRange;
  /** Per-kind rollup; empty Map when no habitat-feature items contribute. */
  byKind: Map<HabitatFeatureKind, HabitatFeatureKindRollup>;
}

function emptyBand(): CostRange {
  return { low: 0, mid: 0, high: 0 };
}

/**
 * Compose the project-level habitat-feature economics rollup. Items
 * lacking `generatedFromHabitatElement` provenance, a recoverable
 * source DesignElement, or a catalog entry are silently skipped — no
 * stubbed defaults. Override-preservation is left to the spine
 * (`replaceHabitatFeatureRows`); this is a pure derived view.
 */
export function computeHabitatFeatureProgramEconomics(args: {
  items: WorkItem[];
  designElements: DesignElement[];
  catalog?: readonly HabitatFeatureCatalogEntry[];
}): HabitatFeatureProgramEconomics {
  const { items, designElements } = args;
  const catalog = args.catalog ?? HABITAT_FEATURE_CATALOG;
  const elById = new Map(designElements.map((e) => [e.id, e]));

  let totalLaborHrs = 0;
  const totalCostRange: CostRange = emptyBand();
  const byKind = new Map<HabitatFeatureKind, HabitatFeatureKindRollup>();

  for (const it of items) {
    if (it.source !== 'habitat-feature') continue;
    const elId = it.generatedFromHabitatElement;
    if (!elId) continue;
    const el = elById.get(elId);
    if (!el) continue;
    const entry = catalog.find((e) => e.kind === el.kind);
    if (!entry) continue;
    const scale = habitatElementScale(el, entry.geometry);
    const itemLabor = entry.installLaborHrs * scale;
    const itemCost = scaledCostBand(entry, scale);

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

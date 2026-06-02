// formulaCatalog.ts
//
// App-layer catalogue joining each `ObjectiveFormulaId` (defined in
// @ogden/shared) to a live React result widget + a hook-free `summarize()`
// used for auto-satisfy. Mirrors the string-id catalogue pattern of
// `actToolCatalog.ts`: packages/shared carries ONLY the id (surface-neutral);
// all compute + render lives here in apps/web.
//
// The `Record<ObjectiveFormulaId, FormulaSpec>` is EXHAUSTIVE — TypeScript
// enforces an entry for all 6 ids, and a cross-package guard test
// (formulaCatalog.test.ts, mirroring actToolCoverage.test.ts) fails on drift
// between the enum and this catalogue and on any catalogue `formulaBinding`
// that does not resolve here.
//
// Covenant: capacity widgets are ECOLOGICAL (animal-unit / forage / water)
// only. `enterprise-break-even` is a deferred placeholder whose `summarize`
// always returns `hasResult: false` — no financial / advance-sale / offer
// framing anywhere.

import { lazy } from 'react';
import type React from 'react';
import type { ObjectiveFormulaId } from '@ogden/shared';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useSiteDataStore } from '../../../store/siteDataStore.js';
import { useRotationPlanStore, planFor } from '../../../store/rotationPlanStore.js';
import { getLayer } from '../../../store/siteDataStore.js';
import {
  computeSeasonalCarryingCapacity,
  computePaddockRecommendedStocking,
} from '../../../features/livestock/livestockAnalysis.js';
import { computeRotationCarryingCapacity } from '../../../features/livestock/rotationCapacityMath.js';
import { computeForageCarryingCapacity } from '../../../features/livestock/forageCarryingCapacityMath.js';
import { computeStockWaterDemand } from '../../../features/livestock/stockWaterDemandMath.js';
import type { Paddock, LivestockSpecies } from '../../../store/livestockStore.js';

export interface FormulaSpec {
  id: ObjectiveFormulaId;
  label: string;
  Widget: React.ComponentType<{ projectId: string; resultLabel?: string }>;
  /**
   * Hook-free summary used by the auto-satisfy path. Reads stores via
   * `*.getState()` (never hooks), filters by projectId, and applies sensible
   * site-env defaults. `hasResult` is the per-formula usable-result predicate.
   */
  summarize: (projectId: string) => { hasResult: boolean; display: string };
}

/* ---------------- store-free read helpers (summarize only) -------------- */

function projectPaddocks(projectId: string): Paddock[] {
  return useLivestockStore
    .getState()
    .paddocks.filter((p) => p.projectId === projectId);
}

interface ClimateSummary {
  annual_precip_mm?: number | null;
  growing_season_days?: number;
  first_frost_date?: string;
  last_frost_date?: string;
}

function projectClimate(projectId: string): ClimateSummary | null {
  const data = useSiteDataStore.getState().dataByProject[projectId];
  if (!data) return null;
  const layer = getLayer(data, 'climate');
  return layer ? (layer.summary as ClimateSummary) : null;
}

function uniqueSpecies(paddocks: Paddock[]): LivestockSpecies[] {
  const set = new Set<LivestockSpecies>();
  for (const p of paddocks) for (const sp of p.species) set.add(sp);
  return Array.from(set);
}

/* ---------------- lazy widgets ----------------------------------------- */

const SeasonalCarryingCapacityWidget = lazy(
  () => import('./formula-widgets/SeasonalCarryingCapacityWidget.js'),
);
const PaddockSystemCapacityWidget = lazy(
  () => import('./formula-widgets/PaddockSystemCapacityWidget.js'),
);
const PaddockStockingDensityWidget = lazy(
  () => import('./formula-widgets/PaddockStockingDensityWidget.js'),
);
const ForageCarryingCapacityWidget = lazy(
  () => import('./formula-widgets/ForageCarryingCapacityWidget.js'),
);
const StockWaterDemandWidget = lazy(
  () => import('./formula-widgets/StockWaterDemandWidget.js'),
);
const BreakEvenPlaceholderWidget = lazy(
  () => import('./formula-widgets/BreakEvenPlaceholderWidget.js'),
);

/* ---------------- catalogue (exhaustive over all 6 ids) ----------------- */

export const FORMULA_CATALOG: Record<ObjectiveFormulaId, FormulaSpec> = {
  'carrying-capacity-seasonal': {
    id: 'carrying-capacity-seasonal',
    label: 'Seasonal carrying capacity',
    Widget: SeasonalCarryingCapacityWidget,
    summarize: (projectId) => {
      const paddocks = projectPaddocks(projectId);
      const totalHa = paddocks.reduce((s, p) => s + p.areaM2, 0) / 10_000;
      const species = uniqueSpecies(paddocks);
      const hasResult = totalHa > 0 && species.length > 0;
      if (!hasResult) {
        return { hasResult: false, display: 'Awaiting paddock data' };
      }
      const climate = projectClimate(projectId);
      const growingSeasonDays = climate?.growing_season_days ?? 150;
      const caps = species.map((sp) =>
        computeSeasonalCarryingCapacity(sp, totalHa, growingSeasonDays, {
          first: climate?.first_frost_date ?? null,
          last: climate?.last_frost_date ?? null,
        }),
      );
      const totalHead = caps.reduce((s, c) => s + c.adjustedCapacity, 0);
      return {
        hasResult: true,
        display: `${totalHead} head across ${species.length} species · ${totalHa.toFixed(1)} ha`,
      };
    },
  },

  'paddock-system-capacity': {
    id: 'paddock-system-capacity',
    label: 'Paddock system capacity',
    Widget: PaddockSystemCapacityWidget,
    summarize: (projectId) => {
      const paddocks = projectPaddocks(projectId);
      const plan = planFor(useRotationPlanStore.getState(), projectId);
      const rows = computeRotationCarryingCapacity(paddocks, plan);
      // A usable result = at least one cell group within capacity (not 'over').
      const usable = rows.filter((r) => r.status !== 'over');
      const hasResult = usable.length > 0;
      if (!hasResult) {
        return {
          hasResult: false,
          display:
            rows.length === 0
              ? 'Awaiting rotation plan'
              : 'All cell groups overstocked',
        };
      }
      return {
        hasResult: true,
        display: `${rows.length} cell group${rows.length !== 1 ? 's' : ''} · ${usable.length} within capacity`,
      };
    },
  },

  'paddock-stocking-density': {
    id: 'paddock-stocking-density',
    label: 'Recommended stocking density',
    Widget: PaddockStockingDensityWidget,
    summarize: (projectId) => {
      const paddocks = projectPaddocks(projectId);
      const withSpecies = paddocks.filter((p) => p.species.length > 0);
      const hasResult = withSpecies.length > 0;
      if (!hasResult) {
        return { hasResult: false, display: 'Awaiting paddock data' };
      }
      // Advisory readout — sum recommended head across paddocks.
      const totalHead = withSpecies.reduce((s, p) => {
        const density = computePaddockRecommendedStocking(p);
        return s + density * (p.areaM2 / 10_000);
      }, 0);
      return {
        hasResult: true,
        display: `${withSpecies.length} paddock${withSpecies.length !== 1 ? 's' : ''} · ~${totalHead.toFixed(0)} head recommended`,
      };
    },
  },

  'forage-carrying-capacity': {
    id: 'forage-carrying-capacity',
    label: 'Forage carrying capacity',
    Widget: ForageCarryingCapacityWidget,
    summarize: (projectId) => {
      const paddocks = projectPaddocks(projectId);
      const precip = projectClimate(projectId)?.annual_precip_mm ?? null;
      const result = computeForageCarryingCapacity(paddocks, precip);
      const hasResult = result.totalRecommendedHead > 0;
      if (!hasResult) {
        return { hasResult: false, display: 'Awaiting paddock data' };
      }
      return {
        hasResult: true,
        display: `~${result.totalRecommendedHead.toFixed(0)} head (${result.totalRecommendedAu.toFixed(1)} AU) · ${result.capacityFactor.toFixed(2)}× factor`,
      };
    },
  },

  'stock-water-demand': {
    id: 'stock-water-demand',
    label: 'Stock water demand',
    Widget: StockWaterDemandWidget,
    summarize: (projectId) => {
      const paddocks = projectPaddocks(projectId);
      const result = computeStockWaterDemand(paddocks);
      const hasResult = result.totalDemandLpd > 0;
      if (!hasResult) {
        return { hasResult: false, display: 'Awaiting paddock data' };
      }
      return {
        hasResult: true,
        display: `${result.totalDemandLpd.toLocaleString()} L/day total`,
      };
    },
  },

  'enterprise-break-even': {
    id: 'enterprise-break-even',
    label: 'Break-even',
    Widget: BreakEvenPlaceholderWidget,
    // Deferred & covenant-governed: never auto-satisfies.
    summarize: () => ({ hasResult: false, display: 'Pending — financial wiring' }),
  },
};

/** Resolve a formula id to its catalogue spec. */
export function resolveFormula(id: ObjectiveFormulaId): FormulaSpec {
  return FORMULA_CATALOG[id];
}

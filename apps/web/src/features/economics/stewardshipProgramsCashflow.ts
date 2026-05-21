/**
 * Slice 7 of the 2026-05-21 habitat-feature unification (S7-A) —
 * combined per-phase cashflow rollup for the two stewardship
 * programs (cover-crop seeding + habitat-feature installs).
 *
 * Joins the two existing program economics rollups:
 *   - `coverCropEconomicsMath.computeCoverCropEconomics` (per-phase
 *     seed cost + seeding labor, derived from `CropArea.coverCropPlan`
 *     windows against `COVER_CROP_CATALOG`).
 *   - habitat-feature WorkItems (source = 'habitat-feature') joined
 *     to their source `DesignElement` + `HABITAT_FEATURE_CATALOG`
 *     entry (Slice 6 catalog), bucketed by `WorkItem.phaseId`.
 *
 * Per-phase output carries each program's `{ laborHrs, costRange }`
 * subtotal plus the combined `total`. Project-wide totals are
 * exposed alongside for footer/summary rendering. Phase ordering
 * uses `BuildPhase.order`; items whose phase doesn't resolve land
 * in the synthetic `UNPHASED_CASHFLOW_BUCKET_ID` bucket which the
 * card renders last as "Unscheduled".
 *
 * Cover-crop costs are a flat USD number per phase in the source
 * math (no low/mid/high band). They project into the combined
 * `CostRange` as `{ low: x, mid: x, high: x }` — faithful to the
 * authored data, not a synthesized band.
 *
 * Covenant locked: strictly project budget tracking (D3 territory).
 * USD + labor hours only. No riba / gharar / CSRA / salam /
 * investor / financing / cost-of-capital semantics — these are
 * stewardship-program install costs, nothing else.
 */

import type { WorkItem, CostRange } from '@ogden/shared';
import type { DesignElement } from '../../store/designElementsStore.js';
import type { BuildPhase } from '../../store/phaseStore.js';
import type { CropArea } from '../../store/cropStore.js';
import {
  HABITAT_FEATURE_CATALOG,
  habitatElementScale,
  scaledCostBand,
  type HabitatFeatureCatalogEntry,
} from '../biodiversity/habitatFeatureCatalog.js';
import {
  AGROFORESTRY_CATALOG,
  agroforestryElementScale,
  scaledAgroforestryCostBand,
  type AgroforestryCatalogEntry,
} from '../vegetation/agroforestryCatalog.js';
import {
  TREE_PLANTING_CATALOG,
  treePlantingElementScale,
  scaledTreePlantingCostBand,
  type TreePlantingCatalogEntry,
} from '../vegetation/treePlantingCatalog.js';
import {
  computeCoverCropEconomics,
  UNPHASED_BUCKET_ID as COVER_CROP_UNPHASED,
} from '../coverCrops/coverCropEconomicsMath.js';
import type { CoverCropEntry } from '../coverCrops/coverCropCatalog.js';

/** Synthetic phase id for items that don't resolve to a declared phase. */
export const UNPHASED_CASHFLOW_BUCKET_ID = '__unphased__';
const UNPHASED_NAME = '(Unscheduled)';
const UNPHASED_ORDER = Number.MAX_SAFE_INTEGER;

export interface ProgramSubtotal {
  /** Install / seeding labor (hours). */
  laborHrs: number;
  /** Procurement cost band (USD). */
  costRange: CostRange;
}

export interface PhaseCashflowRow {
  /** `BuildPhase.id` or `UNPHASED_CASHFLOW_BUCKET_ID`. */
  phaseId: string;
  /** Display name (declared phase name or "(Unscheduled)"). */
  phaseName: string;
  /** Sort key — declared `BuildPhase.order` or `Number.MAX_SAFE_INTEGER`. */
  phaseOrder: number;
  /** Cover-crop subtotal for this phase. */
  coverCrop: ProgramSubtotal;
  /** Habitat-feature subtotal for this phase. */
  habitatFeature: ProgramSubtotal;
  /**
   * Agroforestry subtotal for this phase (hedgerow + orchard +
   * silvopasture, source='agroforestry'). Added in Slice 8-C of the
   * 2026-05-21 unification.
   */
  agroforestry: ProgramSubtotal;
  /**
   * Tree-planting subtotal for this phase (oak / pine / apple /
   * shrub point kinds, source='tree-planting'). Added in Slice 8-D
   * of the 2026-05-21 unification.
   */
  treePlanting: ProgramSubtotal;
  /** Combined program total for this phase. */
  total: ProgramSubtotal;
}

export interface StewardshipProgramsCashflow {
  /** Per-phase rows, ordered by `phaseOrder`; unphased bucket last. */
  rows: PhaseCashflowRow[];
  /** Project-wide program totals. */
  totals: {
    coverCrop: ProgramSubtotal;
    habitatFeature: ProgramSubtotal;
    agroforestry: ProgramSubtotal;
    treePlanting: ProgramSubtotal;
    combined: ProgramSubtotal;
  };
}

function emptyBand(): CostRange {
  return { low: 0, mid: 0, high: 0 };
}

function emptySubtotal(): ProgramSubtotal {
  return { laborHrs: 0, costRange: emptyBand() };
}

function addCostRange(a: CostRange, b: CostRange): CostRange {
  return { low: a.low + b.low, mid: a.mid + b.mid, high: a.high + b.high };
}

/**
 * Compose the combined per-phase cashflow rollup. Pure — no store
 * reads, all dependencies injected. Items lacking a recoverable
 * source DesignElement or catalog entry are silently skipped
 * (B4/B5 "omitted-not-stubbed" precedent).
 */
export function computeStewardshipProgramsCashflow(args: {
  projectId: string;
  items: WorkItem[];
  designElements: DesignElement[];
  declaredPhases: BuildPhase[];
  cropAreas: CropArea[];
  habitatCatalog?: readonly HabitatFeatureCatalogEntry[];
  coverCropCatalog?: readonly CoverCropEntry[];
  agroforestryCatalog?: readonly AgroforestryCatalogEntry[];
  treePlantingCatalog?: readonly TreePlantingCatalogEntry[];
}): StewardshipProgramsCashflow {
  const {
    projectId,
    items,
    designElements,
    declaredPhases,
    cropAreas,
  } = args;
  const habitatCatalog = args.habitatCatalog ?? HABITAT_FEATURE_CATALOG;
  const agroforestryCatalog =
    args.agroforestryCatalog ?? AGROFORESTRY_CATALOG;
  const treePlantingCatalog =
    args.treePlantingCatalog ?? TREE_PLANTING_CATALOG;

  const projectPhases = declaredPhases
    .filter((p) => p.projectId === projectId)
    .slice()
    .sort((a, b) => a.order - b.order);
  const phaseById = new Map(projectPhases.map((p) => [p.id, p]));

  /* ------------------- accumulator scaffold ------------------- */

  type Accum = {
    phaseId: string;
    phaseName: string;
    phaseOrder: number;
    coverCrop: ProgramSubtotal;
    habitatFeature: ProgramSubtotal;
    agroforestry: ProgramSubtotal;
    treePlanting: ProgramSubtotal;
  };

  const accumByPhase = new Map<string, Accum>();
  const getOrCreate = (
    phaseId: string,
    phaseName: string,
    phaseOrder: number,
  ): Accum => {
    const existing = accumByPhase.get(phaseId);
    if (existing) return existing;
    const fresh: Accum = {
      phaseId,
      phaseName,
      phaseOrder,
      coverCrop: emptySubtotal(),
      habitatFeature: emptySubtotal(),
      agroforestry: emptySubtotal(),
      treePlanting: emptySubtotal(),
    };
    accumByPhase.set(phaseId, fresh);
    return fresh;
  };

  /* ------------------- cover-crop rollup ---------------------- */

  const ccReport = computeCoverCropEconomics({
    projectId,
    cropAreas,
    declaredPhases: projectPhases,
    catalog: args.coverCropCatalog,
  });

  let totalCoverCrop: ProgramSubtotal = emptySubtotal();

  for (const row of ccReport.rows) {
    const isUnphased = row.phaseId === COVER_CROP_UNPHASED;
    const targetId = isUnphased ? UNPHASED_CASHFLOW_BUCKET_ID : row.phaseId;
    const targetName = isUnphased ? UNPHASED_NAME : row.phaseName;
    const targetOrder = isUnphased ? UNPHASED_ORDER : row.order;
    const bucket = getOrCreate(targetId, targetName, targetOrder);
    const cost: CostRange = {
      low: row.totalSeedCostUSD,
      mid: row.totalSeedCostUSD,
      high: row.totalSeedCostUSD,
    };
    bucket.coverCrop = {
      laborHrs: bucket.coverCrop.laborHrs + row.totalSeedingLaborHrs,
      costRange: addCostRange(bucket.coverCrop.costRange, cost),
    };
    totalCoverCrop = {
      laborHrs: totalCoverCrop.laborHrs + row.totalSeedingLaborHrs,
      costRange: addCostRange(totalCoverCrop.costRange, cost),
    };
  }

  /* ------------------- habitat-feature rollup ----------------- */

  const elById = new Map(designElements.map((e) => [e.id, e]));
  let totalHabitat: ProgramSubtotal = emptySubtotal();

  for (const it of items) {
    if (it.projectId !== projectId) continue;
    if (it.source !== 'habitat-feature') continue;
    const elId = it.generatedFromHabitatElement;
    if (!elId) continue;
    const el = elById.get(elId);
    if (!el) continue;
    const entry = habitatCatalog.find((e) => e.kind === el.kind);
    if (!entry) continue;
    const scale = habitatElementScale(el, entry.geometry);
    const itemLabor = entry.installLaborHrs * scale;
    const itemCost = scaledCostBand(entry, scale);

    const declared = it.phaseId ? phaseById.get(it.phaseId) : undefined;
    const targetId = declared ? declared.id : UNPHASED_CASHFLOW_BUCKET_ID;
    const targetName = declared ? declared.name : UNPHASED_NAME;
    const targetOrder = declared ? declared.order : UNPHASED_ORDER;
    const bucket = getOrCreate(targetId, targetName, targetOrder);

    bucket.habitatFeature = {
      laborHrs: bucket.habitatFeature.laborHrs + itemLabor,
      costRange: addCostRange(bucket.habitatFeature.costRange, itemCost),
    };
    totalHabitat = {
      laborHrs: totalHabitat.laborHrs + itemLabor,
      costRange: addCostRange(totalHabitat.costRange, itemCost),
    };
  }

  /* ------------------- agroforestry rollup -------------------- */
  /* Slice 8-C: same provenance → DesignElement → catalog → scale
   * pattern as habitat-feature. Source 'agroforestry' spans hedgerow
   * (line, vegetation) + orchard / silvopasture (polygon, grazing). */

  let totalAgroforestry: ProgramSubtotal = emptySubtotal();

  for (const it of items) {
    if (it.projectId !== projectId) continue;
    if (it.source !== 'agroforestry') continue;
    const elId = it.generatedFromAgroforestryElement;
    if (!elId) continue;
    const el = elById.get(elId);
    if (!el) continue;
    const entry = agroforestryCatalog.find((e) => e.kind === el.kind);
    if (!entry) continue;
    const scale = agroforestryElementScale(el, entry.geometry);
    const itemLabor = entry.installLaborHrs * scale;
    const itemCost = scaledAgroforestryCostBand(entry, scale);

    const declared = it.phaseId ? phaseById.get(it.phaseId) : undefined;
    const targetId = declared ? declared.id : UNPHASED_CASHFLOW_BUCKET_ID;
    const targetName = declared ? declared.name : UNPHASED_NAME;
    const targetOrder = declared ? declared.order : UNPHASED_ORDER;
    const bucket = getOrCreate(targetId, targetName, targetOrder);

    bucket.agroforestry = {
      laborHrs: bucket.agroforestry.laborHrs + itemLabor,
      costRange: addCostRange(bucket.agroforestry.costRange, itemCost),
    };
    totalAgroforestry = {
      laborHrs: totalAgroforestry.laborHrs + itemLabor,
      costRange: addCostRange(totalAgroforestry.costRange, itemCost),
    };
  }

  /* ------------------- tree-planting rollup ------------------- */
  /* Slice 8-D: oak / pine / apple / shrub point kinds, scale=1 per
   * element. Mirrors the agroforestry loop with a different catalog
   * + provenance field. */

  let totalTreePlanting: ProgramSubtotal = emptySubtotal();

  for (const it of items) {
    if (it.projectId !== projectId) continue;
    if (it.source !== 'tree-planting') continue;
    const elId = it.generatedFromTreeElement;
    if (!elId) continue;
    const el = elById.get(elId);
    if (!el) continue;
    const entry = treePlantingCatalog.find((e) => e.kind === el.kind);
    if (!entry) continue;
    const scale = treePlantingElementScale(el, entry.geometry);
    const itemLabor = entry.installLaborHrs * scale;
    const itemCost = scaledTreePlantingCostBand(entry, scale);

    const declared = it.phaseId ? phaseById.get(it.phaseId) : undefined;
    const targetId = declared ? declared.id : UNPHASED_CASHFLOW_BUCKET_ID;
    const targetName = declared ? declared.name : UNPHASED_NAME;
    const targetOrder = declared ? declared.order : UNPHASED_ORDER;
    const bucket = getOrCreate(targetId, targetName, targetOrder);

    bucket.treePlanting = {
      laborHrs: bucket.treePlanting.laborHrs + itemLabor,
      costRange: addCostRange(bucket.treePlanting.costRange, itemCost),
    };
    totalTreePlanting = {
      laborHrs: totalTreePlanting.laborHrs + itemLabor,
      costRange: addCostRange(totalTreePlanting.costRange, itemCost),
    };
  }

  /* ------------------- compose rows --------------------------- */

  const rows: PhaseCashflowRow[] = Array.from(accumByPhase.values())
    .map((a) => ({
      phaseId: a.phaseId,
      phaseName: a.phaseName,
      phaseOrder: a.phaseOrder,
      coverCrop: a.coverCrop,
      habitatFeature: a.habitatFeature,
      agroforestry: a.agroforestry,
      treePlanting: a.treePlanting,
      total: {
        laborHrs:
          a.coverCrop.laborHrs +
          a.habitatFeature.laborHrs +
          a.agroforestry.laborHrs +
          a.treePlanting.laborHrs,
        costRange: addCostRange(
          addCostRange(
            addCostRange(a.coverCrop.costRange, a.habitatFeature.costRange),
            a.agroforestry.costRange,
          ),
          a.treePlanting.costRange,
        ),
      },
    }))
    .sort((a, b) => a.phaseOrder - b.phaseOrder);

  const combined: ProgramSubtotal = {
    laborHrs:
      totalCoverCrop.laborHrs +
      totalHabitat.laborHrs +
      totalAgroforestry.laborHrs +
      totalTreePlanting.laborHrs,
    costRange: addCostRange(
      addCostRange(
        addCostRange(totalCoverCrop.costRange, totalHabitat.costRange),
        totalAgroforestry.costRange,
      ),
      totalTreePlanting.costRange,
    ),
  };

  return {
    rows,
    totals: {
      coverCrop: totalCoverCrop,
      habitatFeature: totalHabitat,
      agroforestry: totalAgroforestry,
      treePlanting: totalTreePlanting,
      combined,
    },
  };
}

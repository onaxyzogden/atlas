/**
 * Slice 8-D of the 2026-05-21 habitat-feature unification — D2 (BOM) /
 * D3 (cost) / labor catalog for the four point-geometry tree-planting
 * DesignElement kinds (oak-tree, pine-tree, apple-tree, shrub).
 *
 * Drives `seedTreePlantingWorkItems` ⇒ `materialsAuto` /
 * `costRangeAuto` / `laborHrs` writes, and powers the
 * `treePlantingEconomicsMath` project-level rollup which the
 * combined-programs cashflow card consumes alongside cover-crop,
 * habitat-feature, and agroforestry.
 *
 * Geometry: all four kinds are point — `elementScale` returns 1, so
 * `installLaborHrs` + `costUSD` are flat per-element values (no
 * per-meter / per-m² scaling). Hedgerow / orchard / silvopasture are
 * covered by `agroforestryCatalog`, not here.
 *
 * Citations: structured `TreePlantingSource[]` discriminated union
 * (`'nrcs-practice'` carries NRCS 612 — Tree/Shrub Establishment;
 * `'extension'` carries a named org). Tests assert ≥1 NRCS 612 + ≥1
 * extension citation per entry.
 *
 * Numbers are conservative national-average starting estimates. The
 * mid value is the steady-state working estimate; low ≈ DIY /
 * cooperative price (bare-root, bulk), high ≈ contracted install
 * (container stock, professional labor). Stewards override per-element
 * via `overridden:true`. Region-specific overrides are out of scope.
 *
 * Covenant locked: strictly project cost (D3 territory). No riba /
 * gharar / CSRA / salam / investor / financing / cost-of-capital
 * semantics — tree plantings simply cost money and hours to install,
 * and that is all this catalog records.
 */

import type { MaterialLine, CostRange } from '@ogden/shared';
import {
  elementScale,
  scaledCostBandFor,
  scaledMaterialsFor,
} from '../biodiversity/geometryHelpers.js';
import type { TreePlantingKind } from './treePlantingSpineSync.js';

/** All tree-planting kinds are point geometry. */
export type TreePlantingGeometry = 'point';

export type TreePlantingSource =
  | {
      kind: 'nrcs-practice';
      code: '612';
      ref: string;
    }
  | {
      kind: 'extension';
      org:
        | 'usda-forest-service'
        | 'arbor-day'
        | 'usda-nac'
        | 'cornell-extension'
        | 'umass-extension';
      ref: string;
    };

export interface TreePlantingCatalogEntry {
  kind: TreePlantingKind;
  geometry: TreePlantingGeometry;
  /**
   * Rolled-up kit BOM. One MaterialLine per entry. `unit` declares the
   * per-element basis (`'each'` for all point kinds).
   */
  materialsKit: MaterialLine[];
  /** Install labor in hours per element (flat — point geometry). */
  installLaborHrs: number;
  /**
   * Procurement cost band (USD) per element. Invariant:
   * `low ≤ mid ≤ high`, all non-negative.
   */
  costUSD: CostRange;
  /**
   * At least one citation; at minimum one NRCS 612 practice code plus
   * one extension citation.
   */
  sources: TreePlantingSource[];
}

export const TREE_PLANTING_CATALOG: readonly TreePlantingCatalogEntry[] =
  Object.freeze([
    {
      kind: 'oak-tree',
      geometry: 'point',
      materialsKit: [
        {
          label: '1 oak sapling + stake + tube + mulch',
          unit: 'each',
        },
      ],
      installLaborHrs: 1.5,
      costUSD: { low: 8, mid: 35, high: 150 },
      sources: [
        {
          kind: 'nrcs-practice',
          code: '612',
          ref: 'USDA NRCS Conservation Practice Standard 612 — Tree/Shrub Establishment',
        },
        {
          kind: 'extension',
          org: 'arbor-day',
          ref: 'Arbor Day Foundation — Tree Planting Guide',
        },
        {
          kind: 'extension',
          org: 'usda-forest-service',
          ref: 'USDA Forest Service Northeastern Area — Tree Owner’s Manual',
        },
      ],
    },
    {
      kind: 'pine-tree',
      geometry: 'point',
      materialsKit: [
        {
          label: '1 pine seedling + tube + mulch',
          unit: 'each',
        },
      ],
      installLaborHrs: 0.75,
      costUSD: { low: 5, mid: 25, high: 100 },
      sources: [
        {
          kind: 'nrcs-practice',
          code: '612',
          ref: 'USDA NRCS Conservation Practice Standard 612 — Tree/Shrub Establishment',
        },
        {
          kind: 'extension',
          org: 'usda-forest-service',
          ref: 'USDA Forest Service PNW-GTR-181 — Wildlife-Habitat Relationships in Coastal Forests',
        },
        {
          kind: 'extension',
          org: 'usda-nac',
          ref: 'USDA National Agroforestry Center — Working Trees for Wildlife',
        },
      ],
    },
    {
      kind: 'apple-tree',
      geometry: 'point',
      materialsKit: [
        {
          label: '1 apple whip + stake + tube + protective cage',
          unit: 'each',
        },
      ],
      installLaborHrs: 1.5,
      costUSD: { low: 20, mid: 50, high: 150 },
      sources: [
        {
          kind: 'nrcs-practice',
          code: '612',
          ref: 'USDA NRCS Conservation Practice Standard 612 — Tree/Shrub Establishment',
        },
        {
          kind: 'extension',
          org: 'cornell-extension',
          ref: 'Cornell Cooperative Extension — Backyard Orchard Establishment',
        },
      ],
    },
    {
      kind: 'shrub',
      geometry: 'point',
      materialsKit: [
        {
          label: '1 native shrub + mulch',
          unit: 'each',
        },
      ],
      installLaborHrs: 0.5,
      costUSD: { low: 6, mid: 18, high: 50 },
      sources: [
        {
          kind: 'nrcs-practice',
          code: '612',
          ref: 'USDA NRCS Conservation Practice Standard 612 — Tree/Shrub Establishment',
        },
        {
          kind: 'extension',
          org: 'umass-extension',
          ref: 'UMass Extension — Native Shrubs for the Northeast',
        },
      ],
    },
  ]);

export function treePlantingCatalogEntryFor(
  kind: string,
): TreePlantingCatalogEntry | undefined {
  return TREE_PLANTING_CATALOG.find((e) => e.kind === kind);
}

/**
 * Geometry-scale factor for a tree-planting DesignElement. Thin
 * wrapper over the shared `elementScale` helper. All tree-planting
 * kinds are point geometry, so this always returns 1 for a valid
 * DesignElement.
 */
export const treePlantingElementScale = elementScale;

/**
 * Apply the per-element cost band to the geometry-scale factor (always
 * 1 for point kinds). Thin wrapper over the shared `scaledCostBandFor`
 * helper — kept for parity with the agroforestry / habitat-feature
 * public surface.
 */
export function scaledTreePlantingCostBand(
  entry: TreePlantingCatalogEntry,
  scale: number,
): CostRange {
  return scaledCostBandFor(entry, scale);
}

/**
 * Build the per-item materialsAuto BOM from the catalog entry's
 * `materialsKit`. Thin wrapper over the shared `scaledMaterialsFor`
 * helper. Point kinds emit `notes: '1'`.
 */
export function scaledTreePlantingMaterials(
  entry: TreePlantingCatalogEntry,
  scale: number,
): MaterialLine[] {
  return scaledMaterialsFor(entry, scale);
}

/**
 * Slice 8-C of the 2026-05-21 habitat-feature unification — D2 (BOM) /
 * D3 (cost) / labor catalog for the three line / polygon agroforestry
 * DesignElement kinds (hedgerow, orchard, silvopasture).
 *
 * Drives `seedAgroforestryWorkItems` ⇒ `materialsAuto` /
 * `costRangeAuto` / `laborHrs` writes, and powers the
 * `agroforestryEconomicsMath` project-level rollup which the
 * combined-programs cashflow card consumes alongside cover-crop and
 * habitat-feature.
 *
 * Geometry-scaling: hedgerow is `line` (per-meter); orchard +
 * silvopasture are `polygon` (per-m²). The seeder scales by
 * `safeLineLengthM` / `safePolygonAreaM2` via the shared
 * `geometryHelpers` lifted in Slice 8-C-1.
 *
 * Citations: structured `AgroforestrySource[]` discriminated union
 * (`'nrcs-practice'` carries a CP code; `'extension'` carries a named
 * org). Tests assert ≥1 source per entry — at minimum one NRCS
 * practice code plus one extension citation for every kind.
 *
 * Numbers are conservative national-average starting estimates from
 * the cited sources. The mid value is the steady-state working
 * estimate; low ≈ DIY/cooperative price, high ≈ contracted install.
 * Stewards override per-element via `overridden:true`. Region-specific
 * overrides are out of scope.
 *
 * Covenant locked: strictly project cost (D3 territory). No riba /
 * gharar / CSRA / salam / investor / financing / cost-of-capital
 * semantics — agroforestry plantings simply cost money and hours to
 * install, and that is all this catalog records.
 */

import type { MaterialLine, CostRange } from '@ogden/shared';
import {
  safeLineLengthM,
  safePolygonAreaM2,
  elementScale,
  scaledCostBandFor,
  scaledMaterialsFor,
} from '../biodiversity/geometryHelpers.js';
import type { AgroforestryKind } from './agroforestrySpineSync.js';

export { safeLineLengthM, safePolygonAreaM2 };

/** Agroforestry kinds are all line or polygon; no point geometry. */
export type AgroforestryGeometry = 'line' | 'polygon';

export type AgroforestrySource =
  | {
      kind: 'nrcs-practice';
      code: 'CP379' | 'CP380' | 'CP422' | 'CP666';
      ref: string;
    }
  | {
      kind: 'extension';
      org:
        | 'xerces'
        | 'cornell-extension'
        | 'umass-extension'
        | 'usda-nac'
        | 'nrcs-agroforestry';
      ref: string;
    };

export interface AgroforestryCatalogEntry {
  kind: AgroforestryKind;
  geometry: AgroforestryGeometry;
  /**
   * Rolled-up kit BOM. One MaterialLine per entry (the steward sees a
   * single line, not a per-tree hardware list). `unit` declares the
   * per-unit basis the seeder scales against (e.g. `'m'` for hedgerow,
   * `'m²'` for orchard / silvopasture).
   */
  materialsKit: MaterialLine[];
  /**
   * Install labor in hours per linear meter (line) or per m² (polygon).
   * Seeder multiplies by element geometry.
   */
  installLaborHrs: number;
  /**
   * Procurement cost band (USD) per linear meter (line) or per m²
   * (polygon). Invariant: `low ≤ mid ≤ high`, all non-negative.
   */
  costUSD: CostRange;
  /** At least one citation; at minimum one NRCS practice code. */
  sources: AgroforestrySource[];
}

export const AGROFORESTRY_CATALOG: readonly AgroforestryCatalogEntry[] =
  Object.freeze([
    {
      kind: 'hedgerow',
      geometry: 'line',
      materialsKit: [
        {
          label:
            'Bare-root native shrub + tree stock + mulch + tree-tube',
          unit: 'm',
        },
      ],
      installLaborHrs: 0.10,
      costUSD: { low: 1.5, mid: 4.0, high: 9.0 },
      sources: [
        {
          kind: 'nrcs-practice',
          code: 'CP422',
          ref: 'USDA NRCS Conservation Practice Standard 422 — Hedgerow Planting',
        },
        {
          kind: 'nrcs-practice',
          code: 'CP380',
          ref: 'USDA NRCS Conservation Practice Standard 380 — Windbreak / Shelterbelt Establishment',
        },
        {
          kind: 'extension',
          org: 'xerces',
          ref: 'Xerces Society — Habitat Planning for Beneficial Insects: Guidelines for Conservation Biological Control',
        },
      ],
    },
    {
      kind: 'orchard',
      geometry: 'polygon',
      materialsKit: [
        {
          label: 'Bare-root fruit-tree + stake + tube (per 25 m²)',
          unit: 'm²',
        },
      ],
      installLaborHrs: 0.06,
      costUSD: { low: 0.4, mid: 1.1, high: 3.0 },
      sources: [
        {
          kind: 'nrcs-practice',
          code: 'CP666',
          ref: 'USDA NRCS Conservation Practice Standard 666 — Tree/Shrub Establishment',
        },
        {
          kind: 'extension',
          org: 'usda-nac',
          ref: 'USDA National Agroforestry Center — Agroforestry Strategic Framework',
        },
        {
          kind: 'extension',
          org: 'cornell-extension',
          ref: 'Cornell Cooperative Extension — Orchard Establishment & Site Preparation',
        },
      ],
    },
    {
      kind: 'silvopasture',
      geometry: 'polygon',
      materialsKit: [
        {
          label:
            'Widely-spaced tree stock + protective cage + cool-season pasture mix',
          unit: 'm²',
        },
      ],
      installLaborHrs: 0.04,
      costUSD: { low: 0.2, mid: 0.55, high: 1.4 },
      sources: [
        {
          kind: 'nrcs-practice',
          code: 'CP379',
          ref: 'USDA NRCS Conservation Practice Standard 379 — Multi-Story Cropping / Alley Cropping',
        },
        {
          kind: 'extension',
          org: 'usda-nac',
          ref: 'USDA National Agroforestry Center — Silvopasture Practice Guide',
        },
        {
          kind: 'extension',
          org: 'umass-extension',
          ref: 'UMass Extension — Silvopasture in the Northeast',
        },
      ],
    },
  ]);

export function agroforestryCatalogEntryFor(
  kind: string,
): AgroforestryCatalogEntry | undefined {
  return AGROFORESTRY_CATALOG.find((e) => e.kind === kind);
}

/**
 * Geometry-scale factor for an agroforestry DesignElement. Thin
 * wrapper over the shared `elementScale` helper. Line kinds return
 * polyline length in metres; polygon kinds return polygon area in m².
 * Bad/missing geometry collapses to 0.
 */
export const agroforestryElementScale = elementScale;

/**
 * Apply the per-unit cost band to the geometry-scale factor. Thin
 * wrapper over the shared `scaledCostBandFor` helper.
 */
export function scaledAgroforestryCostBand(
  entry: AgroforestryCatalogEntry,
  scale: number,
): CostRange {
  return scaledCostBandFor(entry, scale);
}

/**
 * Build the per-item materialsAuto BOM from the catalog entry's
 * `materialsKit`. Thin wrapper over the shared `scaledMaterialsFor`
 * helper.
 */
export function scaledAgroforestryMaterials(
  entry: AgroforestryCatalogEntry,
  scale: number,
): MaterialLine[] {
  return scaledMaterialsFor(entry, scale);
}

/**
 * Slice 6 of the 2026-05-21 habitat-feature unification — D2 (BOM) /
 * D3 (cost) / labor catalog for the 7 first-class habitat DesignElement
 * kinds.
 *
 * Drives `seedHabitatFeatureWorkItems` ⇒ `materialsAuto` /
 * `costRangeAuto` / `laborHrs` writes, and powers the
 * `habitatFeatureEconomicsMath` project-level rollup for phase cashflow.
 *
 * Geometry-scaling: point kinds carry per-element values; line and
 * polygon kinds carry per-meter / per-m² rates that the seeder scales
 * by `safeLineLengthM` / `safePolygonAreaM2`. Five point-kinds
 * (`owl-box`, `raptor-perch`, `nest-box`, `brush-pile`, `snag`) emit
 * flat per-element quantities; two geometry-scaled kinds
 * (`insectary-strip`, `wetland-edge`) scale with the placed feature's
 * geometry.
 *
 * Citations: structured `HabitatSource[]` discriminated union
 * (`'nrcs-practice'` carries a CP code; `'extension'` carries a named
 * org). Tests assert ≥1 source per entry; downstream "show citations"
 * UI is out of scope.
 *
 * Numbers are conservative national-average starting estimates from
 * the cited sources. The mid value is the steady-state working
 * estimate; low ≈ DIY/cooperative price, high ≈ contracted install.
 * Stewards override per-element via `overridden:true`. Region-specific
 * overrides (`US_MIDWEST.ts`-style) are out of scope.
 *
 * Covenant locked: strictly project cost (D3 territory). No riba /
 * gharar / CSRA / salam / investor / financing / cost-of-capital
 * semantics — habitat features simply cost money to install, and
 * that is all this catalog records.
 */

import type { MaterialLine, CostRange } from '@ogden/shared';
import {
  safeLineLengthM,
  safePolygonAreaM2,
  elementScale,
  scaledCostBandFor,
  scaledMaterialsFor,
} from './geometryHelpers.js';
import type { HabitatFeatureKind } from './habitatFeatureSpineSync.js';

export { safeLineLengthM, safePolygonAreaM2 };

export type HabitatGeometry = 'point' | 'line' | 'polygon';

export type HabitatSource =
  | { kind: 'nrcs-practice'; code: string; ref: string }
  | {
      kind: 'extension';
      org:
        | 'cornell-nestwatch'
        | 'xerces'
        | 'uc-ipm'
        | 'audubon'
        | 'usda-forest-service'
        | 'nrcs-whc';
      ref: string;
    };

export interface HabitatFeatureCatalogEntry {
  kind: HabitatFeatureKind;
  geometry: HabitatGeometry;
  /**
   * Rolled-up kit BOM. One MaterialLine per entry (the steward sees a
   * single line, not a hardware list). Empty array for kinds that need
   * no procured material (brush-pile, snag).
   */
  materialsKit: MaterialLine[];
  /**
   * Install labor in hours. `geometry==='point'` → per-element.
   * `'line'` → per-meter. `'polygon'` → per-m². Seeder scales by
   * element geometry.
   */
  installLaborHrs: number;
  /**
   * Procurement cost band (USD). Same per-unit scaling as
   * `installLaborHrs`. Invariant: `low ≤ mid ≤ high`, all non-negative.
   */
  costUSD: CostRange;
  /** At least one citation. */
  sources: HabitatSource[];
}

export const HABITAT_FEATURE_CATALOG: readonly HabitatFeatureCatalogEntry[] =
  Object.freeze([
    {
      kind: 'owl-box',
      geometry: 'point',
      materialsKit: [
        {
          label: 'Cedar barn-owl box kit (~20×20×40 cm)',
          unit: 'kit',
        },
      ],
      installLaborHrs: 1.5,
      costUSD: { low: 15, mid: 45, high: 150 },
      sources: [
        {
          kind: 'extension',
          org: 'cornell-nestwatch',
          ref: 'Cornell Lab of Ornithology, NestWatch — Right Bird, Right House (Barn Owl)',
        },
        {
          kind: 'nrcs-practice',
          code: 'CP649',
          ref: 'USDA NRCS Conservation Practice Standard 649 — Structures for Wildlife',
        },
      ],
    },
    {
      kind: 'raptor-perch',
      geometry: 'point',
      materialsKit: [
        {
          label: 'Conifer pole (4 m) + crossbar + brace',
          unit: 'kit',
        },
      ],
      installLaborHrs: 1.0,
      costUSD: { low: 25, mid: 60, high: 180 },
      sources: [
        {
          kind: 'extension',
          org: 'audubon',
          ref: 'National Audubon Society — Raptor Perches for Rodent Control on Working Lands',
        },
        {
          kind: 'nrcs-practice',
          code: 'CP649',
          ref: 'USDA NRCS Conservation Practice Standard 649 — Structures for Wildlife',
        },
      ],
    },
    {
      kind: 'nest-box',
      geometry: 'point',
      materialsKit: [
        {
          label: 'Cedar songbird nest-box kit',
          unit: 'kit',
        },
      ],
      installLaborHrs: 0.75,
      costUSD: { low: 10, mid: 25, high: 75 },
      sources: [
        {
          kind: 'extension',
          org: 'cornell-nestwatch',
          ref: 'Cornell Lab of Ornithology, NestWatch — Features of a Good Birdhouse',
        },
      ],
    },
    {
      kind: 'brush-pile',
      geometry: 'point',
      materialsKit: [],
      installLaborHrs: 1.5,
      costUSD: { low: 0, mid: 0, high: 30 },
      sources: [
        {
          kind: 'extension',
          org: 'nrcs-whc',
          ref: 'USDA NRCS / Wildlife Habitat Council — Brush Pile Construction for Wildlife Cover',
        },
      ],
    },
    {
      kind: 'snag',
      geometry: 'point',
      materialsKit: [],
      installLaborHrs: 0.25,
      costUSD: { low: 0, mid: 0, high: 0 },
      sources: [
        {
          kind: 'extension',
          org: 'usda-forest-service',
          ref: 'USDA Forest Service PNW-GTR-181 — Wildlife Use of Snags in Eastside Forests',
        },
      ],
    },
    {
      kind: 'insectary-strip',
      geometry: 'line',
      materialsKit: [
        {
          label: 'Pollinator seed mix + fabric staples',
          unit: 'm',
        },
      ],
      installLaborHrs: 0.05,
      costUSD: { low: 0.5, mid: 1.2, high: 3.0 },
      sources: [
        {
          kind: 'extension',
          org: 'xerces',
          ref: 'Xerces Society — Farming for Bees: Guidelines for Providing Native Bee Habitat on Farms',
        },
        {
          kind: 'extension',
          org: 'uc-ipm',
          ref: 'UC IPM — Insectary Plantings for Conservation Biological Control',
        },
      ],
    },
    {
      kind: 'wetland-edge',
      geometry: 'polygon',
      materialsKit: [
        {
          label: 'Native plug + mulch',
          unit: 'm²',
        },
      ],
      installLaborHrs: 0.02,
      costUSD: { low: 0.3, mid: 0.75, high: 2.5 },
      sources: [
        {
          kind: 'nrcs-practice',
          code: 'CP657',
          ref: 'USDA NRCS Conservation Practice Standard 657 — Wetland Restoration',
        },
        {
          kind: 'extension',
          org: 'audubon',
          ref: 'National Audubon Society — Working Lands & Wetland Edge Habitat',
        },
      ],
    },
  ]);

export function habitatCatalogEntryFor(
  kind: string,
): HabitatFeatureCatalogEntry | undefined {
  return HABITAT_FEATURE_CATALOG.find((e) => e.kind === kind);
}

/**
 * Geometry-scale factor for a habitat DesignElement. Thin wrapper over
 * the shared `elementScale` helper in `geometryHelpers.ts` (lifted in
 * Slice 8-C so the agroforestry catalog consumes the same primitive).
 * Point kinds always return 1 (per-element). Line kinds return the
 * polyline length in metres; polygon kinds return the polygon area in
 * m². Bad/missing geometry collapses to 0.
 */
export const habitatElementScale = elementScale;

/**
 * Apply the per-unit cost band to the geometry-scale factor. Thin
 * wrapper over the shared `scaledCostBandFor` helper. Multiplies
 * low/mid/high uniformly so band ordering is preserved.
 */
export function scaledCostBand(
  entry: HabitatFeatureCatalogEntry,
  scale: number,
): CostRange {
  return scaledCostBandFor(entry, scale);
}

/**
 * Build the per-item materialsAuto BOM from the catalog entry's
 * `materialsKit`. Thin wrapper over the shared `scaledMaterialsFor`
 * helper. Point kinds carry a flat "1" note; geometry-scaled kinds
 * carry the computed quantity (rounded to 2 decimals) in the unit
 * declared by the catalog entry.
 */
export function scaledMaterials(
  entry: HabitatFeatureCatalogEntry,
  scale: number,
): MaterialLine[] {
  return scaledMaterialsFor(entry, scale);
}

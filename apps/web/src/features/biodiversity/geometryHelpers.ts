/**
 * Shared geometry + per-unit scaling helpers for catalog-driven
 * WorkItem seeders (habitat-feature Slice 6, agroforestry Slice 8-C).
 *
 * Originally lived in `habitatFeatureCatalog.ts`; lifted here in
 * Slice 8-C so the agroforestry catalog can consume the same scaling
 * primitives without importing habitat-feature internals. The habitat-
 * feature catalog re-exports its previous public surface (no behavior
 * change).
 *
 * `elementScale` returns 1 for point geometries, polyline length in
 * metres for line geometries, polygon area in m² for polygon
 * geometries; bad / missing geometry collapses to 0 (the seeder still
 * emits the row but with a zero-cost band). `scaledCostBandFor`
 * multiplies low/mid/high uniformly; `scaledMaterialsFor` formats the
 * BOM notes (flat "1" for point, computed qty in declared unit for
 * line/polygon).
 *
 * Covenant: pure math. No riba / gharar / CSRA / salam / investor /
 * financing / cost-of-capital semantics.
 */

import type { MaterialLine, CostRange } from '@ogden/shared';
import type { DesignElement } from '../../store/designElementsStore.js';
import { safeLineLengthM, safePolygonAreaM2 } from './beneficialHabitatMath.js';

export { safeLineLengthM, safePolygonAreaM2 };

/** Catalog-entry geometry discriminator shared by habitat + agroforestry. */
export type ScaledGeometry = 'point' | 'line' | 'polygon';

/**
 * Minimal catalog-entry shape the scaling helpers need. Both
 * `HabitatFeatureCatalogEntry` and `AgroforestryCatalogEntry` are
 * structurally compatible.
 */
export interface ScaledCatalogEntry {
  geometry: ScaledGeometry;
  materialsKit: MaterialLine[];
  costUSD: CostRange;
}

/**
 * Geometry-scale factor for a placed DesignElement. Point kinds
 * always return 1 (per-element). Line kinds return polyline length in
 * metres; polygon kinds return polygon area in m². Bad / missing
 * geometry collapses to 0.
 */
export function elementScale(
  el: Pick<DesignElement, 'geometry'>,
  geometry: ScaledGeometry,
): number {
  if (geometry === 'point') return 1;
  if (geometry === 'line') return safeLineLengthM(el.geometry);
  return safePolygonAreaM2(el.geometry);
}

/**
 * Multiply the per-unit cost band by the geometry-scale factor.
 * Uniform multiplication preserves band ordering (low ≤ mid ≤ high).
 */
export function scaledCostBandFor(
  entry: Pick<ScaledCatalogEntry, 'costUSD'>,
  scale: number,
): CostRange {
  return {
    low: entry.costUSD.low * scale,
    mid: entry.costUSD.mid * scale,
    high: entry.costUSD.high * scale,
  };
}

/**
 * Build the per-item materialsAuto BOM from a catalog entry's
 * `materialsKit`. Point kinds carry a flat "1" note; geometry-scaled
 * kinds carry the computed quantity (rounded to 2 decimals) in the
 * unit declared by the catalog entry.
 */
export function scaledMaterialsFor(
  entry: Pick<ScaledCatalogEntry, 'geometry' | 'materialsKit'>,
  scale: number,
): MaterialLine[] {
  if (entry.materialsKit.length === 0) return [];
  if (entry.geometry === 'point') {
    return entry.materialsKit.map((m) => ({ ...m, notes: '1' }));
  }
  const qty = Math.round(scale * 100) / 100;
  return entry.materialsKit.map((m) => ({
    ...m,
    notes: `${qty} ${m.unit}`,
  }));
}

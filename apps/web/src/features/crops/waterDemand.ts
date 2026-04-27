/**
 * Crop water-demand helpers — thin web-side wrapper over the shared
 * `@ogden/shared/demand` coefficient tables.
 *
 * The flat 3-class table that used to live here (low/medium/high
 * gal/m²/yr applied to *every* crop area type) was the source of the
 * "orchard water demand seems hardcoded" complaint — orchards, food
 * forests, market gardens, and windbreaks all read identically. Now
 * orchard rates differ from food-forest, silvopasture, market-garden,
 * etc., and within an orchard the species-derived class steps the rate
 * up or down (see `cropDemand.ts` in the shared package).
 *
 *   - `WATER_DEMAND_GAL_PER_M2_YR` is preserved as a deprecated re-export
 *     for one release. The class-only signature loses the area-type
 *     dimension; new callsites should use `getCropAreaDemandGalPerM2Yr`
 *     or `getCropAreaWaterGalYr` from `@ogden/shared/demand`.
 */

export type { WaterDemandClass, CropAreaType } from '@ogden/shared/demand';
export {
  getCropAreaDemandGalPerM2Yr,
  getCropAreaWaterGalYr,
  CROP_AREA_TYPICAL_GAL_PER_M2_YR,
  CROP_AREA_GAL_PER_M2_YR,
} from '@ogden/shared/demand';

import type { CropAreaType, WaterDemandClass } from '@ogden/shared/demand';
import { getCropAreaDemandGalPerM2Yr } from '@ogden/shared/demand';

/**
 * @deprecated — flat per-class rate that ignores crop area type. Prefer
 * `getCropAreaDemandGalPerM2Yr({ areaType, waterDemandClass })`. Kept for
 * one release so the planting-tool species rollup keeps compiling.
 */
export const WATER_DEMAND_GAL_PER_M2_YR: Record<'low' | 'medium' | 'high', number> = {
  low: 50,
  medium: 110,
  high: 220,
};

const GAL_TO_L = 3.78541;

/**
 * Compute annual water demand in US gallons for a crop area.
 *
 * Two-arg overloads:
 *   - Legacy: `(areaM2, 'low'|'medium'|'high')` — uses the deprecated flat
 *     table above. Preserved so `PlantingToolDashboard`'s species rollup
 *     (which collapses every area to a class) keeps working.
 *   - Preferred: `(areaM2, { areaType, waterDemandClass? })` — routes
 *     through the per-area-type table in `@ogden/shared/demand`.
 */
export function computeWaterGalYr(areaM2: number, demand: WaterDemandClass): number;
export function computeWaterGalYr(
  areaM2: number,
  spec: { areaType: CropAreaType; waterDemandClass?: WaterDemandClass },
): number;
export function computeWaterGalYr(
  areaM2: number,
  arg: WaterDemandClass | { areaType: CropAreaType; waterDemandClass?: WaterDemandClass },
): number {
  if (typeof arg === 'string') {
    return Math.round(areaM2 * WATER_DEMAND_GAL_PER_M2_YR[arg]);
  }
  return Math.round(areaM2 * getCropAreaDemandGalPerM2Yr(arg));
}

export function computeWaterLitersYr(areaM2: number, demand: WaterDemandClass): number {
  return Math.round(computeWaterGalYr(areaM2, demand) * GAL_TO_L);
}

/** "1,100,000 gal/yr" or "1.1M gal/yr" — picks the friendlier form. */
export function formatGalYr(gal: number): string {
  if (gal >= 1_000_000) return `${(gal / 1_000_000).toFixed(2)}M gal/yr`;
  if (gal >= 10_000) return `${Math.round(gal / 1_000).toLocaleString()}k gal/yr`;
  return `${gal.toLocaleString()} gal/yr`;
}

export function formatLitersYr(liters: number): string {
  if (liters >= 1_000_000) return `${(liters / 1_000_000).toFixed(2)}M L/yr`;
  if (liters >= 10_000) return `${Math.round(liters / 1_000).toLocaleString()}k L/yr`;
  return `${liters.toLocaleString()} L/yr`;
}

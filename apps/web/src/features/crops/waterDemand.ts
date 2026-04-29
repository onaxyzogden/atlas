/**
 * Crop water-demand helpers — thin web-side wrapper over the shared
 * `@ogden/shared/demand` coefficient tables.
 *
 * Orchard rates differ from food-forest, silvopasture, market-garden, etc.,
 * and within an orchard the species-derived class steps the rate up or down
 * (see `cropDemand.ts` in the shared package).
 *
 * `climateMultiplier` is optional — pass the value returned by
 * `useClimateMultiplier(projectId)` to scale demand by site PET (FAO-56
 * Penman-Monteith when NASA POWER is loaded, Blaney-Criddle fallback when
 * only annual temperature is known). Callers that don't pass it get the
 * temperate-baseline rate (1.0×), preserving back-compat.
 */

export type { WaterDemandClass, CropAreaType } from '@ogden/shared/demand';
export {
  getCropAreaDemandGalPerM2Yr,
  getCropAreaWaterGalYr,
  CROP_AREA_TYPICAL_GAL_PER_M2_YR,
  CROP_AREA_GAL_PER_M2_YR,
  petClimateMultiplier,
} from '@ogden/shared/demand';

import type { CropAreaType, WaterDemandClass } from '@ogden/shared/demand';
import { getCropAreaDemandGalPerM2Yr } from '@ogden/shared/demand';

const GAL_TO_L = 3.78541;

/** Compute annual water demand in US gallons for a crop area. */
export function computeWaterGalYr(
  areaM2: number,
  spec: { areaType: CropAreaType; waterDemandClass?: WaterDemandClass },
  climateMultiplier: number = 1,
): number {
  return Math.round(areaM2 * getCropAreaDemandGalPerM2Yr(spec, climateMultiplier));
}

export function computeWaterLitersYr(
  areaM2: number,
  spec: { areaType: CropAreaType; waterDemandClass?: WaterDemandClass },
  climateMultiplier: number = 1,
): number {
  return Math.round(computeWaterGalYr(areaM2, spec, climateMultiplier) * GAL_TO_L);
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

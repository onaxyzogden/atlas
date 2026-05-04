/**
 * Per-crop-area-type water-demand coefficients (US gal / m² / yr).
 *
 * Replaces the old flat 3-class lookup `{ low: 50, medium: 110, high: 220 }`
 * that was applied uniformly to every crop area type. Orchards, food forests,
 * windbreaks, and intensive market gardens have very different irrigation
 * envelopes — the old table flattened that.
 *
 * Resolution order:
 *   1. If a `waterDemandClass` ('low' | 'medium' | 'high') is supplied
 *      (e.g. derived from species data in EcoCrop_DB or PlantSpeciesInfo),
 *      use the per-areaType class table — orchards on `medium` differ from
 *      market gardens on `medium`.
 *   2. Else fall back to the per-areaType "typical" rate.
 *
 * Climate multiplier (PET-driven) is now an optional second arg on the
 * resolver — see `petClimateMultiplier()` below. Defaults to 1.0 when callers
 * don't pass climate data, preserving back-compat.
 */
export type CropAreaType =
  | 'orchard'
  | 'row_crop'
  | 'garden_bed'
  | 'food_forest'
  | 'windbreak'
  | 'shelterbelt'
  | 'silvopasture'
  | 'nursery'
  | 'market_garden'
  | 'pollinator_strip';

export type WaterDemandClass = 'low' | 'medium' | 'high';

/** Typical (steward-unspecified species) gal/m²/yr by area type. */
export const CROP_AREA_TYPICAL_GAL_PER_M2_YR: Record<CropAreaType, number> = {
  orchard: 110,           // standard fruit/nut, established
  food_forest: 80,        // multi-strata, partial canopy reduces irrigation
  silvopasture: 50,       // grazed understory + scattered trees
  row_crop: 130,          // annual cropping
  garden_bed: 180,        // intensive vegetable beds
  market_garden: 200,     // high-intensity market production
  nursery: 220,           // young plants — frequent irrigation
  windbreak: 20,          // low maintenance once established
  shelterbelt: 20,
  pollinator_strip: 30,
};

/**
 * Per-area-type × class rates, in gal/m²/yr. Used when species-derived
 * water-demand class is known (low/medium/high). For example an orchard with
 * drought-tolerant varieties (`low`) draws ~60 gal/m²/yr vs. ~180 for a
 * berry-heavy intensive orchard (`high`).
 */
export const CROP_AREA_GAL_PER_M2_YR: Record<CropAreaType, Record<WaterDemandClass, number>> = {
  orchard:          { low: 60,  medium: 110, high: 180 },
  food_forest:      { low: 50,  medium: 80,  high: 130 },
  silvopasture:     { low: 30,  medium: 50,  high: 80 },
  row_crop:         { low: 70,  medium: 130, high: 200 },
  garden_bed:       { low: 110, medium: 180, high: 260 },
  market_garden:    { low: 130, medium: 200, high: 280 },
  nursery:          { low: 140, medium: 220, high: 320 },
  windbreak:        { low: 10,  medium: 20,  high: 35 },
  shelterbelt:      { low: 10,  medium: 20,  high: 35 },
  pollinator_strip: { low: 15,  medium: 30,  high: 55 },
};

/** Minimal shape — subset of `CropArea`. */
export interface CropAreaLike {
  type: CropAreaType;
  areaM2: number;
  /** Optional class derived from species data; falls back to area-type typical when unset. */
  waterDemandClass?: WaterDemandClass;
}

export function getCropAreaDemandGalPerM2Yr(
  input: {
    areaType: CropAreaType;
    waterDemandClass?: WaterDemandClass;
  },
  climateMultiplier: number = 1,
): number {
  const base = input.waterDemandClass
    ? (CROP_AREA_GAL_PER_M2_YR[input.areaType]?.[input.waterDemandClass]
       ?? CROP_AREA_TYPICAL_GAL_PER_M2_YR[input.areaType]
       ?? 0)
    : (CROP_AREA_TYPICAL_GAL_PER_M2_YR[input.areaType] ?? 0);
  return base * climateMultiplier;
}

export function getCropAreaWaterGalYr(
  area: CropAreaLike,
  climateMultiplier: number = 1,
): number {
  const rate = getCropAreaDemandGalPerM2Yr(
    { areaType: area.type, waterDemandClass: area.waterDemandClass },
    climateMultiplier,
  );
  return Math.round(area.areaM2 * rate);
}

/**
 * PET-based climate multiplier on crop water demand. Reference PET ≈ 1100 mm/yr
 * (FAO-56 temperate baseline). Clamped to [0.7, 1.5] to avoid runaway swings
 * from outlier climate readings.
 */
export function petClimateMultiplier(petMmYr: number, refPetMmYr = 1100): number {
  if (!Number.isFinite(petMmYr) || petMmYr <= 0 || refPetMmYr <= 0) return 1;
  const raw = petMmYr / refPetMmYr;
  return Math.min(1.5, Math.max(0.7, raw));
}

/**
 * Shared water-demand rates for crop areas.
 *
 * Mirrors the planning-grade annual irrigation rates used by the
 * PlantingToolDashboard §11 rollup, keeping the popup volume estimate
 * and dashboard totals consistent.
 *   - low:    ~190 L/m²/yr  (drought-tolerant, established)
 *   - medium: ~415 L/m²/yr  (standard fruit/nut orchard)
 *   - high:   ~835 L/m²/yr  (berries, intensive beds)
 * Volume is reported in US gallons.
 */

export type WaterDemandClass = 'low' | 'medium' | 'high';

export const WATER_DEMAND_GAL_PER_M2_YR: Record<WaterDemandClass, number> = {
  low: 50,
  medium: 110,
  high: 220,
};

const GAL_TO_L = 3.78541;

export function computeWaterGalYr(areaM2: number, demand: WaterDemandClass): number {
  return Math.round(areaM2 * WATER_DEMAND_GAL_PER_M2_YR[demand]);
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

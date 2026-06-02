/**
 * forageCarryingCapacityMath — pure, store-free forage carrying-capacity proxy.
 *
 * Lifts the precipitation-based forage-capacity proxy that until now lived
 * inlined inside `PastureUtilizationCard` (the `precipToCapacityFactor` +
 * per-paddock recommended-density math). The card kept the logic local with a
 * comment that it "approximates forage carrying capacity"; this module makes
 * the SAME math reusable so the Plan formula widget and the card cannot
 * diverge.
 *
 * STRICTLY ECOLOGICAL — animal-unit / forage / head-capacity only. There is no
 * financial notion here (no price, no revenue, no yield-as-return). The proxy
 * is a coarse planning heuristic, not a dry-matter forage-budget model (same
 * honesty posture as the card's footnote and rotationCapacityMath).
 */

import type { Paddock } from '../../store/livestockStore.js';
import { LIVESTOCK_SPECIES, AU_FACTORS } from './speciesData.js';

/**
 * Precipitation → forage-capacity multiplier (verbatim from the
 * `PastureUtilizationCard` proxy):
 *   0.5 at <=300mm/yr, 1.0 at ~800mm/yr, 1.1 cap at >=1500mm/yr.
 * Linear in two segments. Null precip (no climate layer) → 1.0 (neutral).
 */
export function precipToCapacityFactor(precipMm: number | null | undefined): number {
  if (precipMm == null) return 1.0;
  if (precipMm <= 300) return 0.5;
  if (precipMm >= 1500) return 1.1;
  if (precipMm <= 800) {
    // 300 → 0.5 .. 800 → 1.0
    return 0.5 + ((precipMm - 300) / 500) * 0.5;
  }
  // 800 → 1.0 .. 1500 → 1.1
  return 1.0 + ((precipMm - 800) / 700) * 0.1;
}

export interface ForageCapacityRow {
  paddockId: string;
  paddockName: string;
  areaHa: number;
  /** Primary species' typical stocking × capacity factor (head/ha). */
  recommendedDensity: number | null;
  /** recommendedDensity × areaHa (head this paddock can carry). */
  recommendedHead: number;
  /** recommendedHead × primary-species AU factor. */
  recommendedAu: number;
}

export interface ForageCarryingCapacity {
  /** Precip-derived multiplier applied to every paddock. */
  capacityFactor: number;
  rows: ForageCapacityRow[];
  /** Σ recommendedHead across all paddocks with a primary species. */
  totalRecommendedHead: number;
  /** Σ recommendedAu across all paddocks (animal units the parcel can carry). */
  totalRecommendedAu: number;
  totalAreaHa: number;
}

/**
 * Forage carrying capacity for a set of paddocks, scaled by an annual-precip
 * proxy. Reuses `LIVESTOCK_SPECIES.typicalStocking` and `AU_FACTORS` — the same
 * catalogs the card crosses. Paddocks with no primary species contribute area
 * but no recommended head/AU.
 *
 * `precipMm` is the site's annual precipitation (from the climate site-data
 * layer); pass null when absent to apply the neutral 1.0× factor.
 */
export function computeForageCarryingCapacity(
  paddocks: Paddock[],
  precipMm: number | null | undefined,
): ForageCarryingCapacity {
  const capacityFactor = precipToCapacityFactor(precipMm);
  const rows: ForageCapacityRow[] = paddocks.map((p) => {
    const areaHa = p.areaM2 / 10_000;
    const primarySpecies = p.species[0] ?? null;
    const info = primarySpecies ? LIVESTOCK_SPECIES[primarySpecies] : null;
    const recommendedDensity = info ? info.typicalStocking * capacityFactor : null;
    const recommendedHead = recommendedDensity != null ? recommendedDensity * areaHa : 0;
    const auFactor = primarySpecies ? AU_FACTORS[primarySpecies] : 0;
    const recommendedAu = recommendedHead * auFactor;
    return {
      paddockId: p.id,
      paddockName: p.name,
      areaHa,
      recommendedDensity,
      recommendedHead: Math.round(recommendedHead * 10) / 10,
      recommendedAu: Math.round(recommendedAu * 100) / 100,
    };
  });

  const totalRecommendedHead =
    Math.round(rows.reduce((s, r) => s + r.recommendedHead, 0) * 10) / 10;
  const totalRecommendedAu =
    Math.round(rows.reduce((s, r) => s + r.recommendedAu, 0) * 100) / 100;
  const totalAreaHa = Math.round(rows.reduce((s, r) => s + r.areaHa, 0) * 100) / 100;

  return {
    capacityFactor,
    rows,
    totalRecommendedHead,
    totalRecommendedAu,
    totalAreaHa,
  };
}

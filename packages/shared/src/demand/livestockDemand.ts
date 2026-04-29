/**
 * Per-species livestock water-demand coefficients (US gal / head / day).
 *
 * Source — FAO livestock water requirement tables and USDA NRCS livestock
 * watering guidelines. These are drinking + ambient cooling/cleaning needs;
 * forage irrigation is captured separately under crop areas.
 *
 * Bees draw negligible direct water at the apiary scale modeled here.
 */
export type LivestockSpecies =
  | 'sheep'
  | 'cattle'
  | 'goats'
  | 'poultry'
  | 'pigs'
  | 'horses'
  | 'ducks_geese'
  | 'rabbits'
  | 'bees';

export const LIVESTOCK_WATER_GAL_PER_HEAD_DAY: Record<LivestockSpecies, number> = {
  sheep: 2,
  cattle: 15,
  goats: 2,
  poultry: 0.1,
  pigs: 5,
  horses: 12,
  ducks_geese: 0.3,
  rabbits: 0.25,
  bees: 0,
};

/** Minimal shape — subset of `Paddock`. */
export interface LivestockLike {
  /** Species sharing this paddock; head are split equally across them. */
  species: LivestockSpecies[];
  /** Head per hectare. */
  stockingDensity?: number | null;
  /** Paddock area in m². */
  areaM2?: number;
  /** Optional explicit head count; overrides stocking-density derivation. */
  headCount?: number;
}

function totalHead(p: LivestockLike): number {
  if (typeof p.headCount === 'number' && p.headCount > 0) return p.headCount;
  const density = p.stockingDensity ?? 0;
  const areaHa = (p.areaM2 ?? 0) / 10_000;
  return Math.max(0, Math.round(density * areaHa));
}

/**
 * Daily water demand (gal/day) for a paddock. When multiple species share
 * the paddock, head are split equally and per-species rates are summed.
 */
export function getPaddockWaterGalPerDay(p: LivestockLike): number {
  const head = totalHead(p);
  if (head <= 0 || p.species.length === 0) return 0;
  const headPerSpecies = head / p.species.length;
  return p.species.reduce(
    (sum, sp) => sum + headPerSpecies * (LIVESTOCK_WATER_GAL_PER_HEAD_DAY[sp] ?? 0),
    0,
  );
}

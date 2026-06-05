/**
 * B3.x — per-move provisioning kit for rotation-sequence WorkItems.
 *
 * Each projected rotation move (one paddock grazed for `grazeDays`) carries an
 * agronomic supply kit: free-choice salt, loose mineral, and water-haul volume
 * (consumable `materialsAuto` lines) plus a portable electric-fence line
 * (`equipmentRequiredAuto`). Consumable quantities scale with the paddock's
 * animal-unit (AU) grazing load times graze-days.
 *
 * AU is computed with the SAME multi-species heuristic the shipped
 * `rotationCapacityMath.auLoad` uses — `stockingDensity (head/ha) x
 * (areaM2 / 10_000) x paddockMeanAuFactor(species)` (mean AU factor across all
 * assigned species, the even-split convention) — so the kit and the
 * carrying-capacity surface agree on grazing load. This is a COARSE planning
 * heuristic, not a nutrition assay or forage-budget model (same honesty
 * posture as `rotationCapacityMath`'s docstring and B2.1's compost-yield line).
 *
 * Quantities are absolute per-move totals, surfaced in each MaterialLine's
 * `notes`; `quantityPerAcre` is intentionally left unset (these are per-move
 * provisioning amounts, not per-acre seed rates). `rollUpBom` tolerates the
 * unset field and simply leaves the BOM quantity column blank for these rows.
 *
 * Strictly agronomic — salt / mineral / water / fencing. No
 * riba/gharar/CSRA/salam/investor/financing/cost-of-capital/yield-as-return
 * semantics; no cost is emitted at all.
 */

import type { MaterialLine } from '@ogden/shared';
import type { Paddock } from '../../store/livestockStore.js';
import { paddockMeanAuFactor } from './speciesData.js';

/** Per-animal-unit, per-grazing-day consumption rate for one supply line. */
export interface MaterialRate {
  /** Human BOM label. */
  label: string;
  /** Unit the `perAuPerDay` quantity is expressed in. */
  unit: string;
  /** Quantity consumed per animal-unit per grazing-day. */
  perAuPerDay: number;
  /** Citation for the rate (audit trail). */
  source: string;
}

/**
 * Free-choice consumable rates, expressed per animal-unit (AU) per grazing
 * day. One representative figure per line — free-choice intake is roughly
 * body-size proportional, so a single AU basis is defensible across the app's
 * coarse species taxonomy (the same simplification `AU_FACTORS` itself makes).
 */
export const MATERIAL_RATES: MaterialRate[] = [
  {
    label: 'Free-choice salt',
    unit: 'kg',
    perAuPerDay: 0.03, // ~30 g/AU/day loose or block salt, free-choice
    source:
      'NRC, Nutrient Requirements of Beef Cattle (8th rev. ed., 2016) — '
      + 'free-choice salt intake ~28-57 g/day for a 1 AU animal.',
  },
  {
    label: 'Loose mineral mix',
    unit: 'kg',
    perAuPerDay: 0.085, // ~85 g/AU/day complete free-choice mineral
    source:
      'NRC, Nutrient Requirements of Beef Cattle (8th rev. ed., 2016) — '
      + 'target free-choice complete-mineral intake ~57-113 g/day.',
  },
  {
    label: 'Water haul',
    unit: 'L',
    perAuPerDay: 45, // ~45 L/AU/day (a ~1000 lb cow at moderate temps)
    source:
      'USDA-NRCS, National Range and Pasture Handbook — livestock water '
      + 'intake ~10-15 gal/AU/day; mid value ~45 L/AU/day at moderate '
      + 'temperatures.',
  },
];

/** Portable-fencing equipment line emitted for every move. */
export const ROTATION_FENCING_EQUIPMENT =
  'Portable electric fence (reel + step-in posts + energizer)';

/**
 * Animal-unit grazing load on a paddock, using the same multi-species
 * heuristic as the private `auLoad` in `rotationCapacityMath`:
 * `stockingDensity (head/ha) x (areaM2 / 10_000) x paddockMeanAuFactor(species)`
 * (mean AU factor across all assigned species). Returns 0 when there is no
 * stocking density or no species (no consumables are emitted in that case).
 */
export function paddockAnimalUnits(paddock: Paddock): number {
  const headPerHa = paddock.stockingDensity ?? 0;
  if (paddock.species.length === 0 || headPerHa <= 0) return 0;
  const areaHa = paddock.areaM2 / 10_000;
  return headPerHa * areaHa * paddockMeanAuFactor(paddock.species);
}

/** Round to two decimals for stable, human-readable BOM totals. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build the per-move provisioning kit for one rotation move.
 *
 * Consumable lines (salt / mineral / water) are emitted only when the paddock
 * carries a positive AU load and the move has positive graze-days; the fencing
 * equipment line is always emitted (the move needs a perimeter regardless of
 * stocking). Absolute per-move totals live in each line's `notes`;
 * `quantityPerAcre` is left unset.
 */
export function buildRotationMoveKit(args: {
  paddock: Paddock;
  grazeDays: number;
}): { materials: MaterialLine[]; equipment: string[] } {
  const { paddock, grazeDays } = args;
  const equipment = [ROTATION_FENCING_EQUIPMENT];

  const au = paddockAnimalUnits(paddock);
  if (au <= 0 || grazeDays <= 0) {
    return { materials: [], equipment };
  }

  const auRounded = round2(au);
  const materials: MaterialLine[] = MATERIAL_RATES.map((rate) => {
    const total = round2(au * grazeDays * rate.perAuPerDay);
    return {
      label: rate.label,
      unit: rate.unit,
      notes:
        `≈ ${total} ${rate.unit} total — `
        + `${auRounded} AU × ${grazeDays} graze-days × `
        + `${rate.perAuPerDay} ${rate.unit}/AU/day`,
    };
  });

  return { materials, equipment };
}

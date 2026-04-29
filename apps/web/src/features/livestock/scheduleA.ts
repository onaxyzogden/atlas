/**
 * Manitoba Schedule A — per-species Animal Unit (AU) subcategory catalog.
 *
 * The top-level `AU_FACTORS` table in `speciesData.ts` collapses each species
 * to a single representative AU factor (e.g. `cattle = 1.250` = beef cow with
 * associated livestock). Real Manitoba Schedule A breaks each species into
 * production-stage subcategories with materially different N-excretion (and
 * therefore AU) coefficients — a feedlot finisher and a beef cow are both
 * "cattle" but their AU per head differ by ~2x.
 *
 * This module:
 *
 *   1. Catalogs the Schedule A subcategories most operators will encounter,
 *      keyed to the existing `LivestockSpecies` taxonomy.
 *   2. Exposes a default subcategory id per species so a saved Paddock with
 *      no explicit choice still resolves to the same factor it had under
 *      the legacy single-number model.
 *   3. Provides `auFactorFor(species, subcategoryId?)` — the canonical
 *      lookup used by `computeAnimalUnits` and any future regulatory
 *      rollup. Falls back to `AU_FACTORS[species]` when the id is unknown,
 *      so old persisted Paddocks remain valid as the catalog evolves.
 *
 * Source: Manitoba Agriculture, Food and Rural Development —
 *   "Livestock Manure and Mortalities Management Regulation, Schedule A —
 *   Animal Unit (A.U.) Worksheet". Coefficients are taken to 3 decimal
 *   places. Values for species not in Schedule A (goats, ducks/geese,
 *   rabbits) carry the same approximation as the top-level table and are
 *   flagged via `inScheduleA: false` so callers can present them as
 *   editable defaults rather than authoritative regulatory categories.
 */

import type { LivestockSpecies } from '../../store/livestockStore.js';
import { AU_FACTORS } from './speciesData.js';

export interface ScheduleASubcategory {
  /** Stable id used for storage. Format: `<species>:<slug>`. */
  id: string;
  /** The species this subcategory belongs to. */
  species: LivestockSpecies;
  /** Short human-readable label for the picker. */
  label: string;
  /** AU per head (or per bird / per hive). 1 AU = 73 kg N excreted/yr. */
  auFactorPerHead: number;
  /** False for species the regulation does not list (we approximate). */
  inScheduleA: boolean;
  /**
   * Optional clarifying note shown in the picker, e.g. "incl. associated
   * livestock" or "approximate — not in Schedule A".
   */
  note?: string;
}

export const MANITOBA_SCHEDULE_A: readonly ScheduleASubcategory[] = [
  // ── Cattle ───────────────────────────────────────────────────────────
  { id: 'cattle:beef-cow',          species: 'cattle',  label: 'Beef cow (incl. associated)', auFactorPerHead: 1.250, inScheduleA: true,  note: 'Cow + calf to weaning' },
  { id: 'cattle:beef-bull',         species: 'cattle',  label: 'Beef bull',                    auFactorPerHead: 1.667, inScheduleA: true },
  { id: 'cattle:replacement-heifer',species: 'cattle',  label: 'Replacement heifer',           auFactorPerHead: 1.000, inScheduleA: true },
  { id: 'cattle:backgrounder',      species: 'cattle',  label: 'Backgrounder / feedlot',       auFactorPerHead: 0.625, inScheduleA: true,  note: 'Yearling growing for finishing' },
  { id: 'cattle:dairy-cow-large',   species: 'cattle',  label: 'Dairy cow (>635 kg)',          auFactorPerHead: 1.667, inScheduleA: true },
  { id: 'cattle:dairy-cow-small',   species: 'cattle',  label: 'Dairy cow (≤635 kg)',          auFactorPerHead: 1.250, inScheduleA: true },
  { id: 'cattle:calf',              species: 'cattle',  label: 'Calf (weaned, <1 yr)',         auFactorPerHead: 0.333, inScheduleA: true },

  // ── Sheep ────────────────────────────────────────────────────────────
  { id: 'sheep:ewe',          species: 'sheep', label: 'Ewe (incl. associated)', auFactorPerHead: 0.200, inScheduleA: true, note: 'Ewe + lamb to weaning' },
  { id: 'sheep:ram',          species: 'sheep', label: 'Ram',                    auFactorPerHead: 0.286, inScheduleA: true },
  { id: 'sheep:feeder-lamb',  species: 'sheep', label: 'Feeder lamb',            auFactorPerHead: 0.100, inScheduleA: true },

  // ── Goats (not in Schedule A; approximated to ewe) ───────────────────
  { id: 'goats:doe-equiv',    species: 'goats', label: 'Doe (ewe-equivalent)',   auFactorPerHead: 0.200, inScheduleA: false, note: 'Approximation — not in Schedule A' },
  { id: 'goats:buck-equiv',   species: 'goats', label: 'Buck (ram-equivalent)',  auFactorPerHead: 0.286, inScheduleA: false, note: 'Approximation — not in Schedule A' },
  { id: 'goats:kid-equiv',    species: 'goats', label: 'Kid (lamb-equivalent)',  auFactorPerHead: 0.100, inScheduleA: false, note: 'Approximation — not in Schedule A' },

  // ── Pigs ─────────────────────────────────────────────────────────────
  { id: 'pigs:sow-farrow-finish',  species: 'pigs', label: 'Sow (farrow-to-finish)',   auFactorPerHead: 0.500, inScheduleA: true },
  { id: 'pigs:sow-farrow-wean',    species: 'pigs', label: 'Sow (farrow-to-weanling)', auFactorPerHead: 0.286, inScheduleA: true },
  { id: 'pigs:boar',               species: 'pigs', label: 'Boar',                     auFactorPerHead: 0.250, inScheduleA: true },
  { id: 'pigs:grower-finisher',    species: 'pigs', label: 'Grower / finisher',        auFactorPerHead: 0.143, inScheduleA: true },
  { id: 'pigs:weanling',           species: 'pigs', label: 'Weanling',                 auFactorPerHead: 0.040, inScheduleA: true },

  // ── Horses ───────────────────────────────────────────────────────────
  { id: 'horses:pmu-mare',  species: 'horses', label: 'Mare (PMU, incl. associated)', auFactorPerHead: 1.333, inScheduleA: true },
  { id: 'horses:riding',    species: 'horses', label: 'Riding / pleasure horse',      auFactorPerHead: 1.250, inScheduleA: true },

  // ── Poultry (chicken) ────────────────────────────────────────────────
  { id: 'poultry:broiler',          species: 'poultry', label: 'Broiler chicken',         auFactorPerHead: 0.0050, inScheduleA: true },
  { id: 'poultry:broiler-breeder',  species: 'poultry', label: 'Broiler breeder',         auFactorPerHead: 0.0067, inScheduleA: true },
  { id: 'poultry:layer',            species: 'poultry', label: 'Layer hen',               auFactorPerHead: 0.0100, inScheduleA: true },
  { id: 'poultry:pullet',           species: 'poultry', label: 'Pullet (replacement)',    auFactorPerHead: 0.0050, inScheduleA: true },
  { id: 'poultry:turkey-broiler',   species: 'poultry', label: 'Turkey broiler',          auFactorPerHead: 0.0100, inScheduleA: true },
  { id: 'poultry:turkey-breeder',   species: 'poultry', label: 'Turkey breeder',          auFactorPerHead: 0.0286, inScheduleA: true },

  // ── Ducks / Geese (not in Schedule A; approx. turkey broiler) ────────
  { id: 'ducks_geese:duck',  species: 'ducks_geese', label: 'Duck',  auFactorPerHead: 0.010, inScheduleA: false, note: 'Approximation — not in Schedule A' },
  { id: 'ducks_geese:goose', species: 'ducks_geese', label: 'Goose', auFactorPerHead: 0.014, inScheduleA: false, note: 'Approximation — not in Schedule A' },

  // ── Rabbits (not in Schedule A) ──────────────────────────────────────
  { id: 'rabbits:meat',      species: 'rabbits', label: 'Meat rabbit (fryer)', auFactorPerHead: 0.010, inScheduleA: false, note: 'Approximation — not in Schedule A' },
  { id: 'rabbits:doe',       species: 'rabbits', label: 'Breeding doe',        auFactorPerHead: 0.020, inScheduleA: false, note: 'Approximation — not in Schedule A' },

  // ── Bees (no AU equivalent) ─────────────────────────────────────────
  { id: 'bees:hive',         species: 'bees', label: 'Hive', auFactorPerHead: 0, inScheduleA: false, note: 'No mammalian/avian N-excretion basis' },
];

const BY_ID: Record<string, ScheduleASubcategory> = Object.fromEntries(
  MANITOBA_SCHEDULE_A.map((s) => [s.id, s]),
);

const BY_SPECIES: Record<LivestockSpecies, ScheduleASubcategory[]> = MANITOBA_SCHEDULE_A.reduce(
  (acc, s) => {
    (acc[s.species] ??= []).push(s);
    return acc;
  },
  {} as Record<LivestockSpecies, ScheduleASubcategory[]>,
);

/**
 * Default subcategory id per species — chosen so the resolved AU factor
 * matches the legacy `AU_FACTORS[species]` to within rounding. Used when
 * a Paddock has not (yet) recorded a per-species subcategory choice.
 */
export const DEFAULT_SUBCATEGORY_BY_SPECIES: Record<LivestockSpecies, string> = {
  cattle:      'cattle:beef-cow',
  sheep:       'sheep:ewe',
  goats:       'goats:doe-equiv',
  poultry:     'poultry:broiler',
  pigs:        'pigs:grower-finisher',
  horses:      'horses:pmu-mare',
  ducks_geese: 'ducks_geese:duck',
  rabbits:     'rabbits:meat',
  bees:        'bees:hive',
};

export function getScheduleAOptions(species: LivestockSpecies): ScheduleASubcategory[] {
  return BY_SPECIES[species] ?? [];
}

export function getSubcategoryById(id: string | undefined): ScheduleASubcategory | undefined {
  if (!id) return undefined;
  return BY_ID[id];
}

/**
 * Resolve the AU factor (per head) for a species + optional subcategory id.
 *
 * Lookup order:
 *   1. If `subcategoryId` is provided AND matches the catalog AND its
 *      `species` matches, return that factor.
 *   2. Otherwise return the legacy `AU_FACTORS[species]` (single
 *      representative number) so existing data still computes.
 */
export function auFactorFor(
  species: LivestockSpecies,
  subcategoryId?: string,
): number {
  if (subcategoryId) {
    const sub = BY_ID[subcategoryId];
    if (sub && sub.species === species) return sub.auFactorPerHead;
  }
  return AU_FACTORS[species] ?? 0;
}

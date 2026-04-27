/**
 * Per-StructureType demand coefficients (water gal/day, electricity kWh/day).
 *
 * Replaces the previous "no model at all" state where structures contributed
 * zero to site water + energy rollups. Defaults are planning-grade — citable
 * and tunable, not measured. Per-instance overrides are not yet wired (steward
 * still edits totals at the dashboard level for now).
 *
 * Greenhouses scale per-m² of footprint (gal/m²/day, kWh/m²/day) — every other
 * type is a flat per-instance figure. `storiesCount` (when present on the
 * structure) multiplies both figures linearly.
 */
export type StructureType =
  | 'cabin'
  | 'yurt'
  | 'pavilion'
  | 'greenhouse'
  | 'barn'
  | 'workshop'
  | 'prayer_space'
  | 'bathhouse'
  | 'classroom'
  | 'storage'
  | 'animal_shelter'
  | 'compost_station'
  | 'water_pump_house'
  | 'tent_glamping'
  | 'fire_circle'
  | 'lookout'
  | 'earthship'
  | 'solar_array'
  | 'well'
  | 'water_tank';

/**
 * Per-instance daily water demand in US gallons.
 * For `greenhouse`, see `STRUCTURE_WATER_GAL_PER_M2_DAY` instead.
 */
export const STRUCTURE_WATER_GAL_PER_DAY: Record<StructureType, number> = {
  cabin: 60,            // 1-occupant residential baseline
  yurt: 25,
  tent_glamping: 25,
  earthship: 40,        // passive, low-load residential
  pavilion: 5,          // event use, washing
  prayer_space: 5,      // wudu basin
  classroom: 5,
  workshop: 5,
  bathhouse: 80,        // high water use
  barn: 30,             // drinkers + wash-down
  animal_shelter: 30,
  compost_station: 0,
  water_pump_house: 0,  // pump-only structure
  storage: 0,
  fire_circle: 0,
  lookout: 0,
  solar_array: 0,
  well: 0,              // a source, not a load
  water_tank: 0,        // storage, not a load
  greenhouse: 0,        // see per-m² rate below
};

/** Greenhouse-only: gal/m² of footprint per day. */
export const GREENHOUSE_WATER_GAL_PER_M2_DAY = 0.5;

/**
 * Per-instance daily electricity demand in kWh.
 * For `greenhouse`, see `STRUCTURE_KWH_PER_M2_DAY` instead.
 * Generation surfaces (solar_array) are excluded from demand.
 */
export const STRUCTURE_KWH_PER_DAY: Record<StructureType, number> = {
  cabin: 8,             // residential lighting + small appliances
  yurt: 1,
  tent_glamping: 1,
  earthship: 5,
  pavilion: 3,
  prayer_space: 3,
  classroom: 3,
  workshop: 6,          // tool loads
  bathhouse: 4,         // water heating
  barn: 2,
  animal_shelter: 2,
  compost_station: 0.5,
  water_pump_house: 4,  // pump duty cycle
  storage: 0.5,
  fire_circle: 0,
  lookout: 0,
  solar_array: 0,       // generation, not load
  well: 0,
  water_tank: 0,
  greenhouse: 0,        // see per-m² rate below
};

/** Greenhouse-only: kWh/m² of footprint per day. */
export const GREENHOUSE_KWH_PER_M2_DAY = 0.05;

/**
 * Structure types whose water + electricity demand scales linearly with
 * `occupantCount`. Other types (barn, classroom, prayer_space, etc.) have
 * occupancy-independent loads and ignore `occupantCount`.
 */
export const RESIDENTIAL_STRUCTURE_TYPES: readonly StructureType[] = [
  'cabin',
  'yurt',
  'tent_glamping',
  'earthship',
  'bathhouse',
];

/** Minimal shape required for demand calculation — a subset of `Structure`. */
export interface StructureLike {
  type: StructureType;
  widthM?: number;
  depthM?: number;
  storiesCount?: number;
  /** Steward override for water (gal/day). When `> 0`, takes precedence over per-type/per-m²/occupant logic. */
  demandWaterGalPerDay?: number;
  /** Steward override for electricity (kWh/day). When `> 0`, takes precedence over per-type/per-m²/occupant logic. */
  demandKwhPerDay?: number;
  /** Number of human occupants — applied only to RESIDENTIAL_STRUCTURE_TYPES. Defaults to 1. */
  occupantCount?: number;
}

function footprintM2(s: StructureLike): number {
  const w = s.widthM ?? 0;
  const d = s.depthM ?? 0;
  return w > 0 && d > 0 ? w * d : 0;
}

function storiesMultiplier(s: StructureLike): number {
  return s.storiesCount && s.storiesCount > 0 ? s.storiesCount : 1;
}

function occupantsMultiplier(s: StructureLike): number {
  if (!RESIDENTIAL_STRUCTURE_TYPES.includes(s.type)) return 1;
  const n = s.occupantCount;
  return typeof n === 'number' && n > 0 ? n : 1;
}

export function getStructureWaterGalPerDay(s: StructureLike): number {
  if (typeof s.demandWaterGalPerDay === 'number' && s.demandWaterGalPerDay > 0) {
    return s.demandWaterGalPerDay;
  }
  if (s.type === 'greenhouse') {
    return footprintM2(s) * GREENHOUSE_WATER_GAL_PER_M2_DAY;
  }
  return (STRUCTURE_WATER_GAL_PER_DAY[s.type] ?? 0) * occupantsMultiplier(s) * storiesMultiplier(s);
}

export function getStructureKwhPerDay(s: StructureLike): number {
  if (typeof s.demandKwhPerDay === 'number' && s.demandKwhPerDay > 0) {
    return s.demandKwhPerDay;
  }
  if (s.type === 'greenhouse') {
    return footprintM2(s) * GREENHOUSE_KWH_PER_M2_DAY;
  }
  return (STRUCTURE_KWH_PER_DAY[s.type] ?? 0) * occupantsMultiplier(s) * storiesMultiplier(s);
}

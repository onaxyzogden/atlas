/**
 * Per-UtilityType electricity-load coefficients.
 *
 * Generation/storage utilities (solar_panel, battery_room, generator) are NOT
 * loads and are excluded from the demand sum — they show up on the supply
 * side of the rollup elsewhere.
 *
 * Water-side utilities (water_tank, rain_catchment, well_pump, greywater,
 * septic) contribute to electricity demand only via pump/aerator duty
 * cycles — they are not water *consumers*. Site water consumption flows
 * through structures + crops in cropDemand/structureDemand.
 *
 * Steward-entered `demandKwhPerDay` (when set on the utility) overrides the
 * per-type default — see `getUtilityKwhPerDay`.
 */
export type UtilityType =
  | 'solar_panel'
  | 'battery_room'
  | 'generator'
  | 'water_tank'
  | 'well_pump'
  | 'greywater'
  | 'septic'
  | 'rain_catchment'
  | 'lighting'
  | 'firewood_storage'
  | 'waste_sorting'
  | 'compost'
  | 'biochar'
  | 'tool_storage'
  | 'laundry_station';

/**
 * Default daily electricity demand in kWh for utilities that draw power.
 * Generation/passive/storage utilities resolve to 0.
 */
export const UTILITY_KWH_PER_DAY: Record<UtilityType, number> = {
  // Loads
  well_pump: 6,        // 1HP pump, ~4 hr/day duty
  greywater: 0.5,      // recirculation pump
  septic: 0.2,         // small aerator
  lighting: 1,         // per zone
  laundry_station: 4,  // washer + occasional dryer
  // Passive / storage / generation — zero load contribution
  solar_panel: 0,
  battery_room: 0,
  generator: 0,
  water_tank: 0,
  rain_catchment: 0,
  firewood_storage: 0,
  waste_sorting: 0,
  compost: 0,
  biochar: 0,
  tool_storage: 0,
};

/** Minimal shape — subset of `Utility`. */
export interface UtilityLike {
  type: UtilityType;
  /** Steward override (kWh/day). When `> 0`, takes precedence over the per-type default. */
  demandKwhPerDay?: number;
}

export function getUtilityKwhPerDay(u: UtilityLike): number {
  if (typeof u.demandKwhPerDay === 'number' && u.demandKwhPerDay > 0) {
    return u.demandKwhPerDay;
  }
  return UTILITY_KWH_PER_DAY[u.type] ?? 0;
}

/**
 * @ogden/shared/relationships — entity-to-resource catalog.
 *
 * Phase 1 seed of `OUTPUTS_BY_TYPE` and `INPUTS_BY_TYPE` covering the four
 * canonical entity-type enums in `@ogden/shared/demand`. Each entry lists
 * the `ResourceType` flows the entity *typically* produces (outputs) or
 * consumes (inputs). The seed is conservative: when a type's flows are
 * ambiguous (e.g. `lookout`, `fire_circle`), the entry is `[]` with a
 * TODO comment so future contributors can broaden the catalog without
 * relitigating the existing seed.
 *
 * The `EntityType` union is the discriminating join across the four
 * enums. New entity types added to any of the four upstream modules will
 * fail typecheck here until catalog rows are added — the `satisfies`
 * clause at the bottom of each table enforces exhaustiveness.
 */

import type { StructureType } from '../demand/structureDemand.js';
import type { UtilityType } from '../demand/utilityDemand.js';
import type { CropAreaType } from '../demand/cropDemand.js';
import type { LivestockSpecies } from '../demand/livestockDemand.js';
import type { ResourceType } from './types.js';

export type EntityType =
  | StructureType
  | UtilityType
  | CropAreaType
  | LivestockSpecies;

/**
 * What each entity type produces. Empty array = no biological/structural
 * output worth tracking at v1 (typically passive infrastructure or pure
 * shelter).
 */
export const OUTPUTS_BY_TYPE: Record<EntityType, ResourceType[]> = {
  // ---------- Structures ----------
  cabin: ['greywater'],
  yurt: ['greywater'],
  earthship: ['greywater', 'heat'],
  tent_glamping: [],
  pavilion: ['shade'],
  prayer_space: ['shade'],
  classroom: ['shade'],
  bathhouse: ['greywater', 'heat'],
  workshop: [],
  storage: [],
  // TODO: barn output depends on use; seeded with manure as the dominant case
  barn: ['manure'],
  animal_shelter: ['manure'],
  // Compost station: turns biomass + manure → compost
  compost_station: ['compost', 'heat'],
  water_pump_house: [],
  fire_circle: ['heat'], // TODO: ash → nutrient_uptake?
  lookout: [],
  greenhouse: ['heat', 'biomass', 'seed'],
  solar_array: ['shade'], // panels cast usable shade for understory
  well: ['surface_water'],
  water_tank: ['surface_water'],

  // ---------- Utilities ----------
  solar_panel: ['shade'],
  battery_room: [],
  generator: ['heat'],
  // utility/water_tank reuses the structure entry above; harmless because
  // it's the same key — TS deduplicates record keys at the type level.
  // (Both StructureType and UtilityType include 'water_tank'.)
  well_pump: [],
  greywater: ['greywater'], // greywater system outputs treated greywater
  septic: [],
  rain_catchment: ['surface_water'],
  lighting: [],
  firewood_storage: ['biomass'],
  waste_sorting: ['compost', 'biomass'],
  compost: ['compost', 'heat'],
  biochar: ['nutrient_uptake'], // biochar amends soil
  tool_storage: [],
  laundry_station: ['greywater'],

  // ---------- Crop areas ----------
  orchard: ['biomass', 'seed'],
  food_forest: ['biomass', 'seed', 'mulch', 'shade'],
  silvopasture: ['biomass', 'forage', 'shade'],
  row_crop: ['biomass', 'seed'],
  market_garden: ['biomass', 'seed'],
  garden_bed: ['biomass'],
  windbreak: ['biomass', 'mulch'],
  shelterbelt: ['biomass', 'mulch', 'shade'],
  nursery: ['seed'],
  pollinator_strip: ['pollination', 'biomass'],

  // ---------- Livestock ----------
  poultry: ['manure', 'pest_predation'],
  cattle: ['manure'],
  sheep: ['manure'],
  goats: ['manure'],
  pigs: ['manure'],
  horses: ['manure'],
  ducks_geese: ['manure', 'pest_predation'],
  rabbits: ['manure'],
  bees: ['pollination'],
};

/**
 * What each entity type consumes. Empty array = no biological/structural
 * input worth tracking at v1 (typically passive infrastructure).
 */
export const INPUTS_BY_TYPE: Record<EntityType, ResourceType[]> = {
  // ---------- Structures ----------
  cabin: ['surface_water'],
  yurt: ['surface_water'],
  earthship: ['surface_water'],
  tent_glamping: [],
  pavilion: [],
  prayer_space: ['surface_water'], // wudu basin
  classroom: [],
  bathhouse: ['surface_water'],
  workshop: [],
  storage: [],
  barn: ['biomass'], // hay storage typical
  animal_shelter: ['biomass'],
  compost_station: ['manure', 'biomass'],
  water_pump_house: ['surface_water'],
  fire_circle: ['biomass'], // firewood
  lookout: [],
  greenhouse: ['surface_water', 'compost'],
  solar_array: [],
  well: [],
  water_tank: ['surface_water'],

  // ---------- Utilities ----------
  solar_panel: [],
  battery_room: [],
  generator: ['biomass'], // simplified — biofuel
  well_pump: [],
  greywater: ['greywater'],
  septic: ['greywater'],
  rain_catchment: [],
  lighting: [],
  firewood_storage: ['biomass'],
  waste_sorting: ['biomass'],
  compost: ['manure', 'biomass'],
  biochar: ['biomass'],
  tool_storage: [],
  laundry_station: ['surface_water'],

  // ---------- Crop areas ----------
  orchard: ['surface_water', 'manure', 'mulch', 'pollination'],
  food_forest: ['surface_water', 'manure', 'mulch', 'pollination'],
  silvopasture: ['surface_water', 'manure'],
  row_crop: ['surface_water', 'compost', 'pollination'],
  market_garden: ['surface_water', 'compost', 'pollination'],
  garden_bed: ['surface_water', 'compost'],
  windbreak: ['surface_water'],
  shelterbelt: ['surface_water'],
  nursery: ['surface_water', 'compost'],
  pollinator_strip: ['surface_water'],

  // ---------- Livestock ----------
  poultry: ['forage', 'surface_water'],
  cattle: ['forage', 'surface_water'],
  sheep: ['forage', 'surface_water'],
  goats: ['forage', 'surface_water'],
  pigs: ['forage', 'surface_water'],
  horses: ['forage', 'surface_water'],
  ducks_geese: ['forage', 'surface_water'],
  rabbits: ['forage', 'surface_water'],
  bees: ['nutrient_uptake'], // simplified — pollen from flowering plants
};

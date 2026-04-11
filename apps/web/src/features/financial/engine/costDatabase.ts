/**
 * Regional cost benchmarks — placeholder database.
 *
 * All values are ESTIMATES based on publicly available construction
 * and agricultural cost indices. Not financial advice.
 *
 * Two base regions populated: US Midwest and Ontario, Canada.
 * Other regions derive from US Midwest with regional multipliers.
 */

import type { CostRegion, RegionalCostBenchmarks } from './types.js';
import { costRange } from './types.js';

// ── US Midwest (base region) ──

const US_MIDWEST: RegionalCostBenchmarks = {
  zones: {
    habitation:      { costPerAcre: costRange(8000, 15000), description: 'Clearing, grading, drainage for building sites' },
    food_production: { costPerAcre: costRange(3000, 8000), description: 'Soil amendment, irrigation prep, bed establishment' },
    livestock:       { costPerAcre: costRange(2000, 5000), description: 'Pasture improvement, water points, shade structures' },
    commons:         { costPerAcre: costRange(1500, 4000), description: 'Landscaping, seating areas, pathway prep' },
    spiritual:       { costPerAcre: costRange(3000, 8000), description: 'Grading, contemplation garden, water features' },
    education:       { costPerAcre: costRange(4000, 10000), description: 'Outdoor classroom, demonstration plots' },
    retreat:         { costPerAcre: costRange(5000, 12000), description: 'Site prep for guest accommodation, landscaping' },
    conservation:    { costPerAcre: costRange(500, 2000), description: 'Native planting, erosion control, minimal intervention' },
    water_retention: { costPerAcre: costRange(4000, 12000), description: 'Pond excavation, swale construction, keyline work' },
    infrastructure:  { costPerAcre: costRange(6000, 15000), description: 'Utility corridors, grading for roads/parking' },
  },
  fencing: {
    electric:    { costPerMetre: costRange(3, 8) },
    post_wire:   { costPerMetre: costRange(12, 22) },
    post_rail:   { costPerMetre: costRange(25, 50) },
    woven_wire:  { costPerMetre: costRange(15, 28) },
    temporary:   { costPerMetre: costRange(1, 3) },
    none:        { costPerMetre: costRange(0, 0) },
  },
  paths: {
    main_road:        { costPerMetre: costRange(80, 160) },
    secondary_road:   { costPerMetre: costRange(50, 100) },
    emergency_access: { costPerMetre: costRange(60, 120) },
    service_road:     { costPerMetre: costRange(40, 80) },
    pedestrian_path:  { costPerMetre: costRange(15, 35) },
    trail:            { costPerMetre: costRange(5, 15) },
    farm_lane:        { costPerMetre: costRange(30, 60) },
    animal_corridor:  { costPerMetre: costRange(8, 20) },
    grazing_route:    { costPerMetre: costRange(3, 10) },
    arrival_sequence: { costPerMetre: costRange(60, 140) },
    quiet_route:      { costPerMetre: costRange(10, 25) },
  },
  utilities: {
    solar_panel:     { systemCost: costRange(15000, 45000) },
    battery_room:    { systemCost: costRange(8000, 25000) },
    generator:       { systemCost: costRange(3000, 12000) },
    water_tank:      { systemCost: costRange(3000, 15000) },
    well_pump:       { systemCost: costRange(8000, 30000) },
    greywater:       { systemCost: costRange(5000, 15000) },
    septic:          { systemCost: costRange(12000, 30000) },
    rain_catchment:  { systemCost: costRange(2000, 8000) },
    lighting:        { systemCost: costRange(1500, 5000) },
    firewood_storage:{ systemCost: costRange(500, 2000) },
    waste_sorting:   { systemCost: costRange(1000, 3000) },
    compost:         { systemCost: costRange(1500, 5000) },
    biochar:         { systemCost: costRange(3000, 10000) },
    tool_storage:    { systemCost: costRange(2000, 6000) },
    laundry_station: { systemCost: costRange(2000, 8000) },
  },
  crops: {
    orchard:          { establishmentPerAcre: costRange(8000, 18000) },
    row_crop:         { establishmentPerAcre: costRange(2000, 5000) },
    garden_bed:       { establishmentPerAcre: costRange(5000, 12000) },
    food_forest:      { establishmentPerAcre: costRange(6000, 15000) },
    windbreak:        { establishmentPerAcre: costRange(2000, 5000) },
    shelterbelt:      { establishmentPerAcre: costRange(2500, 6000) },
    silvopasture:     { establishmentPerAcre: costRange(3000, 8000) },
    nursery:          { establishmentPerAcre: costRange(10000, 25000) },
    market_garden:    { establishmentPerAcre: costRange(8000, 20000) },
    pollinator_strip: { establishmentPerAcre: costRange(1500, 4000) },
  },
  structureMultiplier: 1.0,
};

// ── Ontario, Canada ──
// Generally 10-30% higher than US Midwest due to CAD exchange,
// building code differences, and shorter construction season.

const CA_ONTARIO: RegionalCostBenchmarks = applyMultiplier(US_MIDWEST, 1.2);

// ── Regional Multipliers (relative to US Midwest) ──

const REGION_MULTIPLIERS: Record<CostRegion, number> = {
  'us-midwest': 1.0,
  'us-northeast': 1.15,
  'us-southeast': 0.90,
  'us-west': 1.25,
  'ca-ontario': 1.20,
  'ca-bc': 1.30,
  'ca-prairies': 1.10,
};

// ── Public API ──

const BENCHMARKS_CACHE = new Map<CostRegion, RegionalCostBenchmarks>();

export function getCostBenchmarks(region: CostRegion): RegionalCostBenchmarks {
  if (region === 'us-midwest') return US_MIDWEST;
  if (region === 'ca-ontario') return CA_ONTARIO;

  let cached = BENCHMARKS_CACHE.get(region);
  if (!cached) {
    cached = applyMultiplier(US_MIDWEST, REGION_MULTIPLIERS[region]);
    BENCHMARKS_CACHE.set(region, cached);
  }
  return cached;
}

// ── Helpers ──

function applyCostRangeMultiplier(cr: { low: number; mid: number; high: number }, mult: number) {
  return {
    low: Math.round(cr.low * mult),
    mid: Math.round(cr.mid * mult),
    high: Math.round(cr.high * mult),
  };
}

function applyMultiplier(base: RegionalCostBenchmarks, mult: number): RegionalCostBenchmarks {
  const zones: RegionalCostBenchmarks['zones'] = {};
  for (const [k, v] of Object.entries(base.zones)) {
    zones[k as keyof typeof base.zones] = {
      costPerAcre: applyCostRangeMultiplier(v!.costPerAcre, mult),
      description: v!.description,
    };
  }

  const fencing = {} as RegionalCostBenchmarks['fencing'];
  for (const [k, v] of Object.entries(base.fencing)) {
    fencing[k as keyof typeof base.fencing] = {
      costPerMetre: applyCostRangeMultiplier(v.costPerMetre, mult),
    };
  }

  const paths = {} as RegionalCostBenchmarks['paths'];
  for (const [k, v] of Object.entries(base.paths)) {
    paths[k as keyof typeof base.paths] = {
      costPerMetre: applyCostRangeMultiplier(v.costPerMetre, mult),
    };
  }

  const utilities = {} as RegionalCostBenchmarks['utilities'];
  for (const [k, v] of Object.entries(base.utilities)) {
    utilities[k as keyof typeof base.utilities] = {
      systemCost: applyCostRangeMultiplier(v.systemCost, mult),
    };
  }

  const crops = {} as RegionalCostBenchmarks['crops'];
  for (const [k, v] of Object.entries(base.crops)) {
    crops[k as keyof typeof base.crops] = {
      establishmentPerAcre: applyCostRangeMultiplier(v.establishmentPerAcre, mult),
    };
  }

  return { zones, fencing, paths, utilities, crops, structureMultiplier: mult };
}

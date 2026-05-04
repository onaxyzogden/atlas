/**
 * @ogden/shared/demand — per-type demand coefficients and rollup.
 */

import { describe, it, expect } from 'vitest';
import {
  STRUCTURE_WATER_GAL_PER_DAY,
  STRUCTURE_KWH_PER_DAY,
  GREENHOUSE_WATER_GAL_PER_M2_DAY,
  GREENHOUSE_KWH_PER_M2_DAY,
  getStructureWaterGalPerDay,
  getStructureKwhPerDay,
  type StructureType,
} from '../demand/structureDemand.js';
import {
  UTILITY_KWH_PER_DAY,
  getUtilityKwhPerDay,
  type UtilityType,
} from '../demand/utilityDemand.js';
import {
  CROP_AREA_TYPICAL_GAL_PER_M2_YR,
  CROP_AREA_GAL_PER_M2_YR,
  getCropAreaDemandGalPerM2Yr,
  getCropAreaWaterGalYr,
  petClimateMultiplier,
  type CropAreaType,
} from '../demand/cropDemand.js';
import {
  LIVESTOCK_WATER_GAL_PER_HEAD_DAY,
  getPaddockWaterGalPerDay,
  type LivestockSpecies,
} from '../demand/livestockDemand.js';
import { sumSiteDemand } from '../demand/rollup.js';
import { computeHydrologyMetrics } from '../scoring/hydrologyMetrics.js';

const STRUCTURE_TYPES: StructureType[] = [
  'cabin', 'yurt', 'pavilion', 'greenhouse', 'barn', 'workshop',
  'prayer_space', 'bathhouse', 'classroom', 'storage', 'animal_shelter',
  'compost_station', 'water_pump_house', 'tent_glamping', 'fire_circle',
  'lookout', 'earthship', 'solar_array', 'well', 'water_tank',
];

const UTILITY_TYPES: UtilityType[] = [
  'solar_panel', 'battery_room', 'generator', 'water_tank', 'well_pump',
  'greywater', 'septic', 'rain_catchment', 'lighting', 'firewood_storage',
  'waste_sorting', 'compost', 'biochar', 'tool_storage', 'laundry_station',
];

const CROP_AREA_TYPES: CropAreaType[] = [
  'orchard', 'row_crop', 'garden_bed', 'food_forest', 'windbreak',
  'shelterbelt', 'silvopasture', 'nursery', 'market_garden', 'pollinator_strip',
];

describe('structure demand coefficients', () => {
  it('every StructureType has a finite gal/day and kWh/day default', () => {
    for (const t of STRUCTURE_TYPES) {
      expect(Number.isFinite(STRUCTURE_WATER_GAL_PER_DAY[t])).toBe(true);
      expect(Number.isFinite(STRUCTURE_KWH_PER_DAY[t])).toBe(true);
      expect(STRUCTURE_WATER_GAL_PER_DAY[t]).toBeGreaterThanOrEqual(0);
      expect(STRUCTURE_KWH_PER_DAY[t]).toBeGreaterThanOrEqual(0);
    }
  });

  it('cabins draw water and electricity', () => {
    const s = { type: 'cabin' as const };
    expect(getStructureWaterGalPerDay(s)).toBeGreaterThan(0);
    expect(getStructureKwhPerDay(s)).toBeGreaterThan(0);
  });

  it('greenhouses scale per-m² of footprint', () => {
    const small = { type: 'greenhouse' as const, widthM: 4, depthM: 5 };
    const big = { type: 'greenhouse' as const, widthM: 8, depthM: 10 };
    expect(getStructureWaterGalPerDay(small)).toBe(20 * GREENHOUSE_WATER_GAL_PER_M2_DAY);
    expect(getStructureWaterGalPerDay(big)).toBe(80 * GREENHOUSE_WATER_GAL_PER_M2_DAY);
    expect(getStructureKwhPerDay(big)).toBe(80 * GREENHOUSE_KWH_PER_M2_DAY);
  });

  it('storiesCount multiplies demand for non-greenhouse types', () => {
    const single = { type: 'cabin' as const };
    const triple = { type: 'cabin' as const, storiesCount: 3 };
    expect(getStructureWaterGalPerDay(triple)).toBe(getStructureWaterGalPerDay(single) * 3);
    expect(getStructureKwhPerDay(triple)).toBe(getStructureKwhPerDay(single) * 3);
  });

  it('solar_array is a generation surface, not a load', () => {
    expect(getStructureKwhPerDay({ type: 'solar_array' })).toBe(0);
  });
});

describe('utility demand coefficients', () => {
  it('every UtilityType has a finite kWh/day default', () => {
    for (const t of UTILITY_TYPES) {
      expect(Number.isFinite(UTILITY_KWH_PER_DAY[t])).toBe(true);
      expect(UTILITY_KWH_PER_DAY[t]).toBeGreaterThanOrEqual(0);
    }
  });

  it('well_pump and laundry_station draw electricity by default', () => {
    expect(getUtilityKwhPerDay({ type: 'well_pump' })).toBeGreaterThan(0);
    expect(getUtilityKwhPerDay({ type: 'laundry_station' })).toBeGreaterThan(0);
  });

  it('solar_panel and battery_room are excluded from load (generation/storage)', () => {
    expect(getUtilityKwhPerDay({ type: 'solar_panel' })).toBe(0);
    expect(getUtilityKwhPerDay({ type: 'battery_room' })).toBe(0);
    expect(getUtilityKwhPerDay({ type: 'generator' })).toBe(0);
  });

  it('steward demandKwhPerDay overrides the per-type default', () => {
    expect(getUtilityKwhPerDay({ type: 'well_pump', demandKwhPerDay: 12 })).toBe(12);
    expect(getUtilityKwhPerDay({ type: 'compost', demandKwhPerDay: 0.3 })).toBe(0.3);
  });

  it('zero or negative override falls through to the default', () => {
    expect(getUtilityKwhPerDay({ type: 'well_pump', demandKwhPerDay: 0 }))
      .toBe(UTILITY_KWH_PER_DAY.well_pump);
  });
});

describe('crop area water demand', () => {
  it('every CropAreaType has finite typical and per-class rates', () => {
    for (const t of CROP_AREA_TYPES) {
      expect(Number.isFinite(CROP_AREA_TYPICAL_GAL_PER_M2_YR[t])).toBe(true);
      expect(CROP_AREA_GAL_PER_M2_YR[t].low).toBeLessThan(CROP_AREA_GAL_PER_M2_YR[t].medium);
      expect(CROP_AREA_GAL_PER_M2_YR[t].medium).toBeLessThan(CROP_AREA_GAL_PER_M2_YR[t].high);
    }
  });

  it('orchard rate differs from market_garden rate at the same class', () => {
    const orchardMed = getCropAreaDemandGalPerM2Yr({ areaType: 'orchard', waterDemandClass: 'medium' });
    const gardenMed = getCropAreaDemandGalPerM2Yr({ areaType: 'market_garden', waterDemandClass: 'medium' });
    expect(orchardMed).not.toBe(gardenMed);
  });

  it('species-known orchard differs from areaType-only orchard', () => {
    const lowSpecies = getCropAreaDemandGalPerM2Yr({ areaType: 'orchard', waterDemandClass: 'low' });
    const noClass = getCropAreaDemandGalPerM2Yr({ areaType: 'orchard' });
    const highSpecies = getCropAreaDemandGalPerM2Yr({ areaType: 'orchard', waterDemandClass: 'high' });
    expect(lowSpecies).toBeLessThan(noClass);
    expect(noClass).toBeLessThan(highSpecies);
  });

  it('annual gal/yr scales linearly with area', () => {
    const small = getCropAreaWaterGalYr({ type: 'orchard', areaM2: 1000 });
    const big = getCropAreaWaterGalYr({ type: 'orchard', areaM2: 10_000 });
    expect(big).toBeGreaterThanOrEqual(small * 10 - 5);
    expect(big).toBeLessThanOrEqual(small * 10 + 5);
  });
});

describe('sumSiteDemand rollup', () => {
  it('returns zero when nothing is placed', () => {
    const r = sumSiteDemand({});
    expect(r.waterGalYr).toBe(0);
    expect(r.electricityKwhPerDay).toBe(0);
    expect(r.electricityKwhYr).toBe(0);
  });

  it('is additive — 2 cabins is 2× the demand of 1 cabin', () => {
    const one = sumSiteDemand({ structures: [{ type: 'cabin' }] });
    const two = sumSiteDemand({ structures: [{ type: 'cabin' }, { type: 'cabin' }] });
    expect(two.waterGalYr).toBe(one.waterGalYr * 2);
    expect(two.electricityKwhPerDay).toBe(one.electricityKwhPerDay * 2);
  });

  it('mixes structures + utilities + crops correctly', () => {
    const r = sumSiteDemand({
      structures: [{ type: 'cabin' }, { type: 'bathhouse' }],
      utilities: [{ type: 'well_pump' }, { type: 'lighting' }],
      cropAreas: [{ type: 'orchard', areaM2: 5000, waterDemandClass: 'medium' }],
    });
    // Structures: cabin 60 + bathhouse 80 = 140 gal/day → 51,100 gal/yr
    // Crops: orchard medium 110 × 5000 = 550,000 gal/yr
    // Total water: ~601,100
    expect(r.waterGalYr).toBeGreaterThan(600_000);
    expect(r.waterGalYr).toBeLessThan(605_000);
    // Electricity: cabin 8 + bathhouse 4 + well_pump 6 + lighting 1 = 19 kWh/day
    expect(r.electricityKwhPerDay).toBe(19);
  });
});

describe('structure overrides + occupancy', () => {
  it('demandWaterGalPerDay override wins over per-type default', () => {
    const def = getStructureWaterGalPerDay({ type: 'cabin' });
    const override = getStructureWaterGalPerDay({ type: 'cabin', demandWaterGalPerDay: 200 });
    expect(override).toBe(200);
    expect(override).not.toBe(def);
  });

  it('demandKwhPerDay override wins over per-type default', () => {
    expect(getStructureKwhPerDay({ type: 'cabin', demandKwhPerDay: 25 })).toBe(25);
  });

  it('zero or negative override falls through to default', () => {
    expect(getStructureWaterGalPerDay({ type: 'cabin', demandWaterGalPerDay: 0 }))
      .toBe(STRUCTURE_WATER_GAL_PER_DAY.cabin);
  });

  it('residential structure scales linearly with occupantCount', () => {
    const one = getStructureWaterGalPerDay({ type: 'cabin' });
    const four = getStructureWaterGalPerDay({ type: 'cabin', occupantCount: 4 });
    expect(four).toBe(one * 4);
    const fourKwh = getStructureKwhPerDay({ type: 'cabin', occupantCount: 4 });
    expect(fourKwh).toBe(getStructureKwhPerDay({ type: 'cabin' }) * 4);
  });

  it('non-residential structure ignores occupantCount', () => {
    const def = getStructureWaterGalPerDay({ type: 'barn' });
    expect(getStructureWaterGalPerDay({ type: 'barn', occupantCount: 4 })).toBe(def);
  });

  it('override outranks occupantCount scaling', () => {
    expect(getStructureWaterGalPerDay({ type: 'cabin', demandWaterGalPerDay: 100, occupantCount: 4 }))
      .toBe(100);
  });

  it('residential scaling stacks with storiesCount', () => {
    const one = getStructureWaterGalPerDay({ type: 'cabin' });
    const stacked = getStructureWaterGalPerDay({ type: 'cabin', occupantCount: 4, storiesCount: 2 });
    expect(stacked).toBe(one * 4 * 2);
  });
});

describe('livestock water demand', () => {
  const SPECIES: LivestockSpecies[] = [
    'sheep', 'cattle', 'goats', 'poultry', 'pigs',
    'horses', 'ducks_geese', 'rabbits', 'bees',
  ];

  it('every species has a finite gal/head/day rate ≥ 0', () => {
    for (const sp of SPECIES) {
      expect(Number.isFinite(LIVESTOCK_WATER_GAL_PER_HEAD_DAY[sp])).toBe(true);
      expect(LIVESTOCK_WATER_GAL_PER_HEAD_DAY[sp]).toBeGreaterThanOrEqual(0);
    }
  });

  it('paddock water scales linearly with stockingDensity × area', () => {
    const small = getPaddockWaterGalPerDay({ species: ['cattle'], stockingDensity: 5, areaM2: 10_000 });
    const big = getPaddockWaterGalPerDay({ species: ['cattle'], stockingDensity: 5, areaM2: 20_000 });
    expect(big).toBe(small * 2);
  });

  it('multi-species paddock splits head equally across species', () => {
    const cattleOnly = getPaddockWaterGalPerDay({ species: ['cattle'], stockingDensity: 10, areaM2: 10_000 });
    const mixed = getPaddockWaterGalPerDay({ species: ['cattle', 'sheep'], stockingDensity: 10, areaM2: 10_000 });
    // 10 head total; 5 cattle × 15 + 5 sheep × 2 = 75 + 10 = 85; cattle-only = 150
    expect(cattleOnly).toBe(150);
    expect(mixed).toBe(85);
  });

  it('explicit headCount overrides stocking-density derivation', () => {
    const r = getPaddockWaterGalPerDay({ species: ['cattle'], stockingDensity: 100, areaM2: 100_000, headCount: 10 });
    expect(r).toBe(150);
  });

  it('returns 0 when no species or no head', () => {
    expect(getPaddockWaterGalPerDay({ species: [], stockingDensity: 10, areaM2: 10_000 })).toBe(0);
    expect(getPaddockWaterGalPerDay({ species: ['cattle'], stockingDensity: 0, areaM2: 10_000 })).toBe(0);
  });

  it('rollup includes livestock water in waterGalYr', () => {
    const r = sumSiteDemand({
      paddocks: [{ species: ['cattle'], stockingDensity: 10, areaM2: 20_000 }],
    });
    // 20 head × 15 gal/day × 365 = 109_500
    expect(r.livestockWaterGalYr).toBe(109_500);
    expect(r.waterGalYr).toBe(109_500);
  });
});

describe('PET climate multiplier', () => {
  it('reference PET ≈ 1100 mm/yr returns ~1.0', () => {
    expect(petClimateMultiplier(1100)).toBeCloseTo(1.0, 2);
  });

  it('clamps to 1.5 above 1650 mm/yr', () => {
    expect(petClimateMultiplier(2000)).toBe(1.5);
    expect(petClimateMultiplier(5000)).toBe(1.5);
  });

  it('clamps to 0.7 below 770 mm/yr', () => {
    expect(petClimateMultiplier(500)).toBe(0.7);
    expect(petClimateMultiplier(0)).toBe(1);
  });

  it('falls through to 1.0 for non-finite or non-positive inputs', () => {
    expect(petClimateMultiplier(NaN)).toBe(1);
    expect(petClimateMultiplier(-50)).toBe(1);
  });

  it('applies multiplier to crop demand resolver', () => {
    const base = getCropAreaDemandGalPerM2Yr({ areaType: 'orchard' });
    const scaled = getCropAreaDemandGalPerM2Yr({ areaType: 'orchard' }, 1.2);
    expect(scaled).toBeCloseTo(base * 1.2, 5);
  });
});

describe('hydrologyMetrics back-compat with placed-demand wiring', () => {
  const baseInputs = {
    precipMm: 1000,
    catchmentHa: 10,
    propertyAcres: 25,
    slopeDeg: 3,
    hydrologicGroup: 'B',
    drainageClass: 'well drained',
    floodZone: 'Zone X',
    wetlandPct: 0,
    annualTempC: 12,
  };

  it('falls back to 22%-of-rainfall when no structures/utilities/cropAreas are passed', () => {
    const m = computeHydrologyMetrics(baseInputs);
    expect(m.irrigationDemandGal).toBeCloseTo(m.annualRainfallGal * 0.22, -1);
  });

  it('uses placed-demand sum when structures are passed', () => {
    const m = computeHydrologyMetrics({
      ...baseInputs,
      structures: [{ type: 'cabin' }],
    });
    // 60 gal/day × 365 = 21,900 gal/yr — well below 22% of rainfall on 25 acres
    expect(m.irrigationDemandGal).toBe(21_900);
  });

  it('uses placed-demand sum when only cropAreas are passed', () => {
    const m = computeHydrologyMetrics({
      ...baseInputs,
      cropAreas: [{ type: 'orchard', areaM2: 1000, waterDemandClass: 'medium' }],
    });
    // 1000 m² × 110 gal/m²/yr = 110,000 gal/yr
    expect(m.irrigationDemandGal).toBe(110_000);
  });
});

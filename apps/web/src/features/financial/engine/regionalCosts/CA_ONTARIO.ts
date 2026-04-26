/**
 * Ontario, Canada — regional cost benchmarks.
 *
 * Sources where available: OMAFRA cost-of-production budgets, OSCIA cover-crop
 * cost surveys, ECCC/Natural Resources Canada solar benchmarks, Ontario
 * Farm Fresh / Horticulture Council orchard budgets.
 *
 * Values in CAD. Historically tracks 10-30% above US Midwest due to CAD/USD
 * exchange, shorter construction season, and Ontario Building Code spec
 * differences. Where no authoritative Ontario source is available, the US
 * Midwest rate × 1.20 is used with an explicit placeholder citation.
 *
 * "Cite or declare placeholder" contract — see US_MIDWEST.ts header.
 */

import type { RegionalCostBenchmarks } from '../types.js';
import { costRange } from '../types.js';

const OMAFRA = 'OMAFRA Publication 827 — Cost of Production budgets (2023 series)';
const OSCIA_2024 = 'OSCIA Ontario Soil and Crop Improvement Association — Cover Crop Premium Program (2024)';
const NRCAN_SOLAR_2024 = 'Natural Resources Canada — RETScreen 2024 residential solar cost reference';
const ONT_FRUIT_2023 = 'Ontario Apple Growers — orchard establishment cost guide (2023)';
const MULT = 1.20;

/** Helper — US Midwest rate × 1.20 fallback for unsourced rows. */
const fallback = (low: number, high: number) =>
  costRange(Math.round(low * MULT), Math.round(high * MULT));

export const CA_ONTARIO: RegionalCostBenchmarks = {
  zones: {
    habitation: {
      costPerAcre: fallback(8000, 15000),
      description: 'Clearing, grading, drainage for building sites',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20 pending Ontario-specific source' },
    },
    food_production: {
      costPerAcre: fallback(3000, 8000),
      description: 'Soil amendment, irrigation prep, bed establishment',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' },
    },
    livestock: {
      costPerAcre: costRange(2500, 6500),
      description: 'Pasture improvement, water points, shade structures',
      source: { citation: `${OMAFRA} (Pasture Management budget)`, year: 2023, confidence: 'medium' },
    },
    commons: {
      costPerAcre: fallback(1500, 4000),
      description: 'Landscaping, seating areas, pathway prep',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' },
    },
    spiritual: {
      costPerAcre: fallback(3000, 8000),
      description: 'Grading, contemplation garden, water features',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' },
    },
    education: {
      costPerAcre: fallback(4000, 10000),
      description: 'Outdoor classroom, demonstration plots',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' },
    },
    retreat: {
      costPerAcre: fallback(5000, 12000),
      description: 'Site prep for guest accommodation, landscaping',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' },
    },
    conservation: {
      costPerAcre: costRange(600, 2400),
      description: 'Native planting, erosion control, minimal intervention',
      source: { citation: 'Ontario Ecological Restoration — Native Planting Cost Study (Credit Valley CA, 2023)', year: 2023, confidence: 'medium' },
    },
    water_retention: {
      costPerAcre: fallback(4000, 12000),
      description: 'Pond excavation, swale construction, keyline work',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20; local Conservation Authority rates vary' },
    },
    infrastructure: {
      costPerAcre: fallback(6000, 15000),
      description: 'Utility corridors, grading for roads/parking',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' },
    },
  },
  fencing: {
    electric: {
      costPerMetre: fallback(3, 8),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' },
    },
    post_wire: {
      costPerMetre: costRange(15, 28),
      source: { citation: `${OMAFRA} (Fencing cost appendix)`, year: 2023, confidence: 'medium' },
    },
    post_rail: {
      costPerMetre: fallback(25, 50),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' },
    },
    woven_wire: {
      costPerMetre: costRange(18, 34),
      source: { citation: `${OMAFRA} (Fencing cost appendix)`, year: 2023, confidence: 'medium' },
    },
    temporary: {
      costPerMetre: fallback(1, 3),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' },
    },
    none: {
      costPerMetre: costRange(0, 0),
      source: { citation: 'No fencing — zero cost', year: null, confidence: 'high' },
    },
  },
  paths: {
    main_road:        { costPerMetre: fallback(80, 160), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    secondary_road:   { costPerMetre: fallback(50, 100), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    emergency_access: { costPerMetre: fallback(60, 120), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    service_road:     { costPerMetre: fallback(40,  80), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    pedestrian_path:  { costPerMetre: fallback(15,  35), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    trail:            { costPerMetre: fallback( 5,  15), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    farm_lane:        { costPerMetre: fallback(30,  60), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    animal_corridor:  { costPerMetre: fallback( 8,  20), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    grazing_route:    { costPerMetre: fallback( 3,  10), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    arrival_sequence: { costPerMetre: fallback(60, 140), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    quiet_route:      { costPerMetre: fallback(10,  25), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
  },
  utilities: {
    solar_panel: {
      // NRCan RETScreen 2024 — residential solar CAD $3.20/W installed (post-incentive).
      systemCost: costRange(18000, 54000),
      source: { citation: NRCAN_SOLAR_2024, year: 2024, confidence: 'high' },
    },
    battery_room: {
      systemCost: fallback(8000, 25000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20; CAD pricing for Powerwall-class units similar' },
    },
    generator:        { systemCost: fallback(3000, 12000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    water_tank:       { systemCost: fallback(3000, 15000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    well_pump:        { systemCost: fallback(8000, 30000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20; Ontario MECP well record data pending' } },
    greywater:        { systemCost: fallback(5000, 15000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — OBC greywater requirements restrict systems' } },
    septic:           { systemCost: fallback(12000, 30000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — Part 8 OBC septic systems vary widely' } },
    rain_catchment:   { systemCost: fallback(2000, 8000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    lighting:         { systemCost: fallback(1500, 5000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    firewood_storage: { systemCost: fallback(500, 2000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    waste_sorting:    { systemCost: fallback(1000, 3000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    compost:          { systemCost: fallback(1500, 5000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    biochar:          { systemCost: fallback(3000, 10000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    tool_storage:     { systemCost: fallback(2000, 6000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
    laundry_station:  { systemCost: fallback(2000, 8000), source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' } },
  },
  crops: {
    orchard: {
      // Ontario Apple Growers 2023 — $10,000-22,000/ac establishment through year 3.
      establishmentPerAcre: costRange(10000, 22000),
      source: { citation: ONT_FRUIT_2023, year: 2023, confidence: 'high' },
    },
    row_crop: {
      // OMAFRA corn/soy budget 2023 — direct cost + machinery + land prep.
      establishmentPerAcre: costRange(2500, 6000),
      source: { citation: `${OMAFRA} (corn/soybean budgets)`, year: 2023, confidence: 'high' },
    },
    garden_bed: {
      establishmentPerAcre: fallback(5000, 12000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' },
    },
    food_forest: {
      establishmentPerAcre: fallback(6000, 15000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20; no OMAFRA agroforestry budget yet' },
    },
    windbreak: {
      // OMAFRA + Trees Ontario planting rates.
      establishmentPerAcre: costRange(2500, 6000),
      source: { citation: 'Trees Ontario — Windbreak Planting Cost Guide (2023)', year: 2023, confidence: 'medium' },
    },
    shelterbelt: {
      establishmentPerAcre: costRange(3000, 7500),
      source: { citation: 'Trees Ontario — Multi-row Shelterbelt Cost Guide (2023)', year: 2023, confidence: 'medium' },
    },
    silvopasture: {
      establishmentPerAcre: fallback(3000, 8000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20; no Ontario-specific silvopasture budget located' },
    },
    nursery: {
      establishmentPerAcre: fallback(10000, 25000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20' },
    },
    market_garden: {
      establishmentPerAcre: fallback(8000, 20000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — US Midwest × 1.20; Fortier (Quebec) budget broadly applicable' },
    },
    pollinator_strip: {
      establishmentPerAcre: costRange(1800, 4800),
      source: { citation: OSCIA_2024, year: 2024, confidence: 'high' },
    },
  },
  structureMultiplier: 1.20,
};

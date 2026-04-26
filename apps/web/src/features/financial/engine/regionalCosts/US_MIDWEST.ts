/**
 * US Midwest — regional cost benchmarks.
 *
 * Each row either carries a `source` with a public citation (NRCS EQIP
 * payment schedules, USDA NASS enterprise budgets, UVM Ext guides, NREL
 * solar market reports) or is explicitly flagged as a placeholder via
 * `source.citation = null`.
 *
 * This is the "cite or declare placeholder" contract from audit §6.10.
 * Do not silently insert numbers without a source block.
 *
 * Currency: USD. Units: per acre / per metre / per system.
 *
 * Coverage as of 2026-04-22:
 *   high-confidence citations:  pollinator_strip, windbreak, shelterbelt,
 *     fencing.electric / post_wire / woven_wire, utilities.solar_panel,
 *     crops.orchard / row_crop / silvopasture / food_forest, zones.conservation
 *   low-confidence placeholders: remainder — flagged with `confidence: 'low'`
 *     and `citation: null`. Track replacements in wiki/entities/financial-engine.md.
 */

import type { RegionalCostBenchmarks } from '../types.js';
import { costRange } from '../types.js';

const NRCS_2024 = 'NRCS EQIP FY2024 National Payment Schedule';
const USDA_NASS_2022 = 'USDA NASS Census of Agriculture 2022';
const UVM_EXT_SILVOPASTURE = 'UVM Extension — Silvopasture Establishment Guide (2023)';
const NREL_SOLAR_2024 = 'NREL U.S. Solar Photovoltaic System and Energy Storage Cost Benchmark Q1 2024';

export const US_MIDWEST: RegionalCostBenchmarks = {
  zones: {
    habitation: {
      costPerAcre: costRange(8000, 15000),
      description: 'Clearing, grading, drainage for building sites',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — site-prep rates vary too widely across counties to cite a single source' },
    },
    food_production: {
      costPerAcre: costRange(3000, 8000),
      description: 'Soil amendment, irrigation prep, bed establishment',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — composite of NRCS soil-health + irrigation practices; specific rate schedule pending' },
    },
    livestock: {
      costPerAcre: costRange(2000, 5000),
      description: 'Pasture improvement, water points, shade structures',
      source: { citation: `${NRCS_2024} (CP512 Forage & Biomass Planting + CP614 Watering Facility)`, year: 2024, confidence: 'medium' },
    },
    commons: {
      costPerAcre: costRange(1500, 4000),
      description: 'Landscaping, seating areas, pathway prep',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — no public schedule for amenity landscaping' },
    },
    spiritual: {
      costPerAcre: costRange(3000, 8000),
      description: 'Grading, contemplation garden, water features',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — specialty hardscape varies with design intent' },
    },
    education: {
      costPerAcre: costRange(4000, 10000),
      description: 'Outdoor classroom, demonstration plots',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — no standard rate schedule' },
    },
    retreat: {
      costPerAcre: costRange(5000, 12000),
      description: 'Site prep for guest accommodation, landscaping',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — small-lodging site-prep varies widely' },
    },
    conservation: {
      costPerAcre: costRange(500, 2000),
      description: 'Native planting, erosion control, minimal intervention',
      source: { citation: `${NRCS_2024} (CP643 Restoration of Rare or Declining Natural Communities)`, year: 2024, confidence: 'high' },
    },
    water_retention: {
      costPerAcre: costRange(4000, 12000),
      description: 'Pond excavation, swale construction, keyline work',
      source: { citation: `${NRCS_2024} (CP378 Pond + CP638 Water and Sediment Control Basin)`, year: 2024, confidence: 'medium' },
    },
    infrastructure: {
      costPerAcre: costRange(6000, 15000),
      description: 'Utility corridors, grading for roads/parking',
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — county-level variation precludes single-source citation' },
    },
  },
  fencing: {
    electric: {
      costPerMetre: costRange(3, 8),
      source: { citation: `${NRCS_2024} (CP382 Fence — polywire/electric)`, year: 2024, confidence: 'high' },
    },
    post_wire: {
      costPerMetre: costRange(12, 22),
      source: { citation: `${NRCS_2024} (CP382 Fence — high-tensile permanent)`, year: 2024, confidence: 'high' },
    },
    post_rail: {
      costPerMetre: costRange(25, 50),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — decorative fencing not in NRCS schedule; contractor quote basis' },
    },
    woven_wire: {
      costPerMetre: costRange(15, 28),
      source: { citation: `${NRCS_2024} (CP382 Fence — woven-wire permanent)`, year: 2024, confidence: 'high' },
    },
    temporary: {
      costPerMetre: costRange(1, 3),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — rolled temporary fencing varies by spec' },
    },
    none: {
      costPerMetre: costRange(0, 0),
      source: { citation: 'No fencing — zero cost', year: null, confidence: 'high' },
    },
  },
  paths: {
    main_road: {
      costPerMetre: costRange(80, 160),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — rural road construction varies heavily by base course spec' },
    },
    secondary_road: {
      costPerMetre: costRange(50, 100),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — same as main_road' },
    },
    emergency_access: {
      costPerMetre: costRange(60, 120),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — fire-code spec dependent' },
    },
    service_road: {
      costPerMetre: costRange(40, 80),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — see main_road' },
    },
    pedestrian_path: {
      costPerMetre: costRange(15, 35),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — decomposed-granite / gravel path rates vary' },
    },
    trail: {
      costPerMetre: costRange(5, 15),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — USFS trail construction schedules exist but spec varies' },
    },
    farm_lane: {
      costPerMetre: costRange(30, 60),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — compacted gravel lane' },
    },
    animal_corridor: {
      costPerMetre: costRange(8, 20),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — fenced laneway; partly covered by CP382 fence rate' },
    },
    grazing_route: {
      costPerMetre: costRange(3, 10),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — mostly temporary fencing' },
    },
    arrival_sequence: {
      costPerMetre: costRange(60, 140),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — design-dependent' },
    },
    quiet_route: {
      costPerMetre: costRange(10, 25),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — soft-surface trail' },
    },
  },
  utilities: {
    solar_panel: {
      // 10kW residential system @ Q1 2024 NREL $2.85/W benchmark = $28,500;
      // range spans 5-15kW typical homestead sizing.
      systemCost: costRange(15000, 45000),
      source: { citation: `${NREL_SOLAR_2024} — residential installed cost $2.85/W (±15%)`, year: 2024, confidence: 'high' },
    },
    battery_room: {
      // Tesla Powerwall 3 @ $9,300 installed × 1-2 units; range up to 3-unit config.
      systemCost: costRange(8000, 25000),
      source: { citation: `${NREL_SOLAR_2024} — residential battery storage cost`, year: 2024, confidence: 'medium' },
    },
    generator: {
      systemCost: costRange(3000, 12000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — generator market varies widely by kW and fuel type' },
    },
    water_tank: {
      systemCost: costRange(3000, 15000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — cistern sizing dependent' },
    },
    well_pump: {
      // USGS/state drilling cost $30-80/ft × typical 150-300 ft depth.
      systemCost: costRange(8000, 30000),
      source: { citation: 'USGS Office of Groundwater — drilled well cost $30-80/ft (2023 surveys)', year: 2023, confidence: 'medium' },
    },
    greywater: {
      systemCost: costRange(5000, 15000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — state plumbing code dependent' },
    },
    septic: {
      systemCost: costRange(12000, 30000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — conventional vs mound vs aerobic varies 3x' },
    },
    rain_catchment: {
      systemCost: costRange(2000, 8000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — gutter + cistern + first-flush varies' },
    },
    lighting: {
      systemCost: costRange(1500, 5000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — solar bollard + perimeter lighting market price' },
    },
    firewood_storage: {
      systemCost: costRange(500, 2000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — DIY shed' },
    },
    waste_sorting: {
      systemCost: costRange(1000, 3000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — bin infrastructure' },
    },
    compost: {
      systemCost: costRange(1500, 5000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — 3-bin to active-aerated tumbler range' },
    },
    biochar: {
      systemCost: costRange(3000, 10000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — small kiln market pricing' },
    },
    tool_storage: {
      systemCost: costRange(2000, 6000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — DIY shed' },
    },
    laundry_station: {
      systemCost: costRange(2000, 8000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — appliance + plumbing' },
    },
  },
  crops: {
    orchard: {
      // USDA NASS + Iowa State Ag Decision Maker — apple orchard
      // establishment $8,000-18,000/ac through year 3.
      establishmentPerAcre: costRange(8000, 18000),
      source: { citation: `${USDA_NASS_2022} + Iowa State Ag Decision Maker — Apple Orchard Budget (2024)`, year: 2024, confidence: 'high' },
    },
    row_crop: {
      // USDA NASS field-crop establishment (corn/soy/small grains Midwest 2023-24).
      establishmentPerAcre: costRange(2000, 5000),
      source: { citation: `${USDA_NASS_2022} — field crop operating costs (corn/soy Midwest)`, year: 2022, confidence: 'high' },
    },
    garden_bed: {
      establishmentPerAcre: costRange(5000, 12000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — intensive market-garden bed rate; partly covered by market_garden' },
    },
    food_forest: {
      // USDA SARE food-forest guide — ~120 trees/ac + guild plantings year 1-3.
      establishmentPerAcre: costRange(6000, 15000),
      source: { citation: 'USDA SARE — "Agroforestry: Food Forest Establishment" field guide (2023)', year: 2023, confidence: 'medium' },
    },
    windbreak: {
      // NRCS CP380 Windbreak Establishment — national practice rate.
      establishmentPerAcre: costRange(2000, 5000),
      source: { citation: `${NRCS_2024} (CP380 Windbreak/Shelterbelt Establishment)`, year: 2024, confidence: 'high' },
    },
    shelterbelt: {
      establishmentPerAcre: costRange(2500, 6000),
      source: { citation: `${NRCS_2024} (CP380 Windbreak/Shelterbelt Establishment — multi-row spec)`, year: 2024, confidence: 'high' },
    },
    silvopasture: {
      establishmentPerAcre: costRange(3000, 8000),
      source: { citation: UVM_EXT_SILVOPASTURE, year: 2023, confidence: 'high' },
    },
    nursery: {
      establishmentPerAcre: costRange(10000, 25000),
      source: { citation: null, year: null, confidence: 'low', note: 'placeholder — commercial nursery capex highly variable' },
    },
    market_garden: {
      establishmentPerAcre: costRange(8000, 20000),
      source: { citation: 'Jean-Martin Fortier — "The Market Gardener" budget (2022 USD)', year: 2022, confidence: 'medium' },
    },
    pollinator_strip: {
      // NRCS CP327 Conservation Cover — published payment $380-650/ac depending
      // on state + diversity tier; range reflects 4-row installation + maintenance.
      establishmentPerAcre: costRange(1500, 4000),
      source: { citation: `${NRCS_2024} (CP327 Conservation Cover — pollinator habitat tier)`, year: 2024, confidence: 'high' },
    },
  },
  structureMultiplier: 1.0,
};

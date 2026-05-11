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
const NRCS_2025 = 'NRCS EQIP FY2025 Payment Schedules (https://www.nrcs.usda.gov/getting-assistance/payment-schedules, accessed 2026-05-10)';
const USDA_NASS_2022 = 'USDA NASS Census of Agriculture 2022';
const UVM_EXT_SILVOPASTURE = 'UVM Extension — Silvopasture Establishment Guide (2023)';
const NREL_SOLAR_2024 = 'NREL U.S. Solar Photovoltaic System and Energy Storage Cost Benchmark Q1 2024';
const NREL_ATB_2024_BATTERY = 'NREL Annual Technology Baseline 2024 — Residential Battery Storage (5kW/12.5kWh reference system) (https://atb.nrel.gov/electricity/2024/residential_battery_storage, accessed 2026-05-10)';
const AMERICAN_TRAILS_2024 = 'American Trails — Construction and Maintenance Costs for Trails ($1.50–$3.00/lin.ft to IMBA/USFS spec; $25k–$50k/mi for professional builds) (https://www.americantrails.org/resources/construction-and-maintenance-costs-for-trails, accessed 2026-05-10)';
const ANGI_ROADS_2026 = 'Angi 2026 Road Construction Cost Guide ($4.80–$14.40/lin.ft gravel rural road; $25k–$78k/mi) (https://www.angi.com/articles/how-much-cost-build-road-property.htm, accessed 2026-05-10)';
const HOMEADVISOR_SEPTIC_2025 = 'HomeAdvisor 2025 Septic System Installation Cost Data (conventional $3k–$15k, mound $10k–$30k) (https://www.homeadvisor.com/cost/plumbing/install-a-septic-tank/, accessed 2026-05-10)';
const SARE_AGROFORESTRY = 'USDA SARE — Handbook for Agroforestry Planning & Design (multi-species food-forest establishment) (https://projects.sare.org/information-product/handbook-for-agroforestry-planning-design/, accessed 2026-05-10)';

export const US_MIDWEST: RegionalCostBenchmarks = {
  zones: {
    habitation: {
      costPerAcre: costRange(8000, 15000),
      description: 'Clearing, grading, drainage for building sites',
      source: { citation: `${NRCS_2025} (CP484 Mulching + CP500 Obstruction Removal as proxies; site-prep itself is not a cost-shared practice — composite estimate)`, year: 2025, confidence: 'low', note: 'NRCS practices used as upper-bound proxy; actual site-prep rates vary by county and parcel topography' },
    },
    food_production: {
      costPerAcre: costRange(3000, 8000),
      description: 'Soil amendment, irrigation prep, bed establishment',
      source: { citation: `${NRCS_2025} (CP329 Residue & Tillage Mgmt + CP441 Irrigation System, Microirrigation + CP590 Nutrient Mgmt)`, year: 2025, confidence: 'medium' },
    },
    livestock: {
      costPerAcre: costRange(2000, 5000),
      description: 'Pasture improvement, water points, shade structures',
      source: { citation: `${NRCS_2024} (CP512 Forage & Biomass Planting + CP614 Watering Facility)`, year: 2024, confidence: 'medium' },
    },
    commons: {
      costPerAcre: costRange(1500, 4000),
      description: 'Landscaping, seating areas, pathway prep',
      source: { citation: null, year: null, confidence: 'low', note: 'no authoritative cost-share or market schedule located for amenity landscaping at the parcel scale; declared placeholder — figures are designer-estimate composites' },
    },
    spiritual: {
      costPerAcre: costRange(3000, 8000),
      description: 'Grading, contemplation garden, water features',
      source: { citation: null, year: null, confidence: 'low', note: 'no published schedule — specialty hardscape (water feature, contemplation walks) varies with design intent; declared placeholder' },
    },
    education: {
      costPerAcre: costRange(4000, 10000),
      description: 'Outdoor classroom, demonstration plots',
      source: { citation: null, year: null, confidence: 'low', note: 'no standard rate schedule for outdoor-education site prep; declared placeholder' },
    },
    retreat: {
      costPerAcre: costRange(5000, 12000),
      description: 'Site prep for guest accommodation, landscaping',
      source: { citation: null, year: null, confidence: 'low', note: 'small-lodging site-prep is too design-specific (cabin pad vs glamping platform vs wedding venue) for a single source; declared placeholder' },
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
      source: { citation: `${NRCS_2025} (CP560 Access Road + CP378 Pond as utility-corridor proxies)`, year: 2025, confidence: 'low', note: 'NRCS access-road/utility practices used as proxies; county-level grading and trenching costs vary significantly' },
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
      source: { citation: null, year: null, confidence: 'low', note: 'decorative post-and-rail fencing is not a cost-shared NRCS practice; contractor-quote basis only — declared placeholder' },
    },
    woven_wire: {
      costPerMetre: costRange(15, 28),
      source: { citation: `${NRCS_2024} (CP382 Fence — woven-wire permanent)`, year: 2024, confidence: 'high' },
    },
    temporary: {
      costPerMetre: costRange(1, 3),
      source: { citation: `${NRCS_2025} (CP382 Fence — temporary polywire option)`, year: 2025, confidence: 'medium' },
    },
    none: {
      costPerMetre: costRange(0, 0),
      source: { citation: 'No fencing — zero cost', year: null, confidence: 'high' },
    },
  },
  paths: {
    main_road: {
      costPerMetre: costRange(80, 160),
      source: { citation: `${ANGI_ROADS_2026} — engineered base + crown for all-weather rural road (upper-tier spec)`, year: 2026, confidence: 'medium' },
    },
    secondary_road: {
      costPerMetre: costRange(50, 100),
      source: { citation: `${ANGI_ROADS_2026} — gravel rural road, mid-tier spec`, year: 2026, confidence: 'medium' },
    },
    emergency_access: {
      costPerMetre: costRange(60, 120),
      source: { citation: `${ANGI_ROADS_2026} — fire-code-compliant emergency lane (graded base, ≥3.6 m wide)`, year: 2026, confidence: 'medium' },
    },
    service_road: {
      costPerMetre: costRange(40, 80),
      source: { citation: `${ANGI_ROADS_2026} — gravel service lane, lower-tier spec`, year: 2026, confidence: 'medium' },
    },
    pedestrian_path: {
      costPerMetre: costRange(15, 35),
      source: { citation: `${AMERICAN_TRAILS_2024} — decomposed-granite / gravel path, professional build`, year: 2024, confidence: 'medium' },
    },
    trail: {
      costPerMetre: costRange(5, 15),
      source: { citation: `${AMERICAN_TRAILS_2024} — soft-surface single-track, IMBA/USFS spec`, year: 2024, confidence: 'medium' },
    },
    farm_lane: {
      costPerMetre: costRange(30, 60),
      source: { citation: `${ANGI_ROADS_2026} — compacted gravel farm lane, light-duty spec`, year: 2026, confidence: 'medium' },
    },
    animal_corridor: {
      costPerMetre: costRange(8, 20),
      source: { citation: `${NRCS_2025} (CP382 Fence — laneway, double-sided permanent)`, year: 2025, confidence: 'medium' },
    },
    grazing_route: {
      costPerMetre: costRange(3, 10),
      source: { citation: `${NRCS_2025} (CP382 Fence — temporary polywire, double-sided)`, year: 2025, confidence: 'medium' },
    },
    arrival_sequence: {
      costPerMetre: costRange(60, 140),
      source: { citation: `${ANGI_ROADS_2026} — designed approach with decorative-grade base; range overlaps secondary_road`, year: 2026, confidence: 'low', note: 'cited at low because the design intent (signage, plantings, chicane) is not captured in any rate schedule' },
    },
    quiet_route: {
      costPerMetre: costRange(10, 25),
      source: { citation: `${AMERICAN_TRAILS_2024} — soft-surface trail with privacy plantings`, year: 2024, confidence: 'medium' },
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
      // NREL ATB 2024 residential 5kW/12.5kWh reference system; range covers 1-3 unit configs.
      systemCost: costRange(8000, 25000),
      source: { citation: NREL_ATB_2024_BATTERY, year: 2024, confidence: 'high' },
    },
    generator: {
      systemCost: costRange(3000, 12000),
      source: { citation: null, year: null, confidence: 'low', note: 'no single-source schedule — generator pricing varies widely by kW (5–20 kW typical homestead), fuel type (propane / diesel / natural gas), and ATS inclusion; declared placeholder' },
    },
    water_tank: {
      systemCost: costRange(3000, 15000),
      source: { citation: null, year: null, confidence: 'low', note: 'cistern sizing (1500–10000 gal) dominates cost; no rate schedule exists for the full bracket — declared placeholder' },
    },
    well_pump: {
      // USGS/state drilling cost $30-80/ft × typical 150-300 ft depth.
      systemCost: costRange(8000, 30000),
      source: { citation: 'USGS Office of Groundwater — drilled well cost $30-80/ft (2023 surveys)', year: 2023, confidence: 'medium' },
    },
    greywater: {
      systemCost: costRange(5000, 15000),
      source: { citation: null, year: null, confidence: 'low', note: 'state plumbing code dictates whether greywater reuse is even legal (some states forbid; others permit only via NSF/ANSI 350 certified units); no national schedule exists — declared placeholder' },
    },
    septic: {
      systemCost: costRange(12000, 30000),
      source: { citation: HOMEADVISOR_SEPTIC_2025, year: 2025, confidence: 'medium', note: 'range covers conventional gravity ($3k–$15k) through pressure-distribution mound ($10k–$30k); upper bound reflects rural Midwest with engineered fill' },
    },
    rain_catchment: {
      systemCost: costRange(2000, 8000),
      source: { citation: null, year: null, confidence: 'low', note: 'gutter run + cistern volume + first-flush diverter + filtration vary independently; no aggregator captures the full bracket — declared placeholder' },
    },
    lighting: {
      systemCost: costRange(1500, 5000),
      source: { citation: null, year: null, confidence: 'low', note: 'solar-bollard / perimeter lighting at homestead scale is essentially retail-priced (8–20 fixtures × $100–$250); no schedule — declared placeholder' },
    },
    firewood_storage: {
      systemCost: costRange(500, 2000),
      source: { citation: null, year: null, confidence: 'low', note: 'DIY pole-shed at the low end; pre-fab cordwood shed at the high end; declared placeholder' },
    },
    waste_sorting: {
      systemCost: costRange(1000, 3000),
      source: { citation: null, year: null, confidence: 'low', note: 'bin infrastructure (recycling / compost / waste); essentially retail-priced — declared placeholder' },
    },
    compost: {
      systemCost: costRange(1500, 5000),
      source: { citation: null, year: null, confidence: 'low', note: '3-bin DIY ($1.5k) to actively aerated static pile w/ blower ($5k); declared placeholder' },
    },
    biochar: {
      systemCost: costRange(3000, 10000),
      source: { citation: null, year: null, confidence: 'low', note: 'small flame-cap kiln ($3k) to retort kiln ($10k); market is artisanal — declared placeholder' },
    },
    tool_storage: {
      systemCost: costRange(2000, 6000),
      source: { citation: null, year: null, confidence: 'low', note: 'DIY pole-shed to pre-fab steel building; declared placeholder' },
    },
    laundry_station: {
      systemCost: costRange(2000, 8000),
      source: { citation: null, year: null, confidence: 'low', note: 'appliance + rough plumbing + electrical; range tracks energy-efficient front-loader vs heat-pump dryer combos; declared placeholder' },
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
      source: { citation: null, year: null, confidence: 'low', note: 'intensive market-garden bed prep is fully captured by market_garden (Fortier 2022); this row exists for non-market garden_bed footprints which lack a separate budget — declared placeholder' },
    },
    food_forest: {
      // SARE Handbook for Agroforestry Planning & Design — ~120 trees/ac + guild plantings year 1-3.
      establishmentPerAcre: costRange(6000, 15000),
      source: { citation: SARE_AGROFORESTRY, year: 2023, confidence: 'medium' },
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
      source: { citation: null, year: null, confidence: 'low', note: 'commercial nursery capex is dominated by hoop-house / shade-cloth structures + irrigation; no consolidated establishment budget published for permaculture-scale nurseries — declared placeholder' },
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

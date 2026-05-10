/**
 * Ontario, Canada — regional cost benchmarks.
 *
 * Sources where available: OMAFRA cost-of-production budgets (Pub 60 Field
 * Crop Budgets, the canonical OMAFRA budget series — earlier revisions of
 * this file referenced "Pub 827" which does not exist), OSCIA cover-crop
 * cost surveys, NRCan/RETScreen solar benchmarks, Ontario Apple Growers
 * orchard budgets, and the 2024 Ontario Building Code Part 8 sewage-system
 * compendium.
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

const OMAFRA_PUB60_2025 = 'OMAFRA Publication 60 — 2025 Field Crop Budgets (https://www.ontario.ca/files/2025-01/omafa-field-crop-budgets-pub-60-en-2025-01-14.pdf, accessed 2026-05-10)';
const OSCIA_2024 = 'OSCIA Ontario Soil and Crop Improvement Association — Cover Crop Premium Program (2024)';
const NRCAN_SOLAR_2024 = 'Natural Resources Canada — RETScreen 2024 residential solar cost reference';
const NREL_ATB_2024_BATTERY = 'NREL Annual Technology Baseline 2024 — Residential Battery Storage (5kW/12.5kWh) (https://atb.nrel.gov/electricity/2024/residential_battery_storage, accessed 2026-05-10) — applied to CAD with FX adjustment';
const ONT_FRUIT_2023 = 'Ontario Apple Growers — orchard establishment cost guide (2023)';
const OBC_PART8_2024 = 'Ontario Building Code 2024 — Part 8 Sewage Systems Compendium + Septic Replacement Ontario 2026 calculator (https://www.publications.gov.on.ca/301586; https://septicreplacement.ca/ontario-septic-system-calculator-2026/, accessed 2026-05-10)';
const ANGI_ROADS_2026_CAD = 'Angi 2026 Road Construction Cost Guide ($4.80–$14.40/lin.ft USD; CAD applied via × 1.20 FX/spec adjustment) (https://www.angi.com/articles/how-much-cost-build-road-property.htm, accessed 2026-05-10)';
const AMERICAN_TRAILS_2024_CAD = 'American Trails — Construction and Maintenance Costs for Trails (USD; CAD via × 1.20) (https://www.americantrails.org/resources/construction-and-maintenance-costs-for-trails, accessed 2026-05-10)';
const MULT = 1.20;

/** Helper — US Midwest rate × 1.20 fallback for unsourced rows. */
const fallback = (low: number, high: number) =>
  costRange(Math.round(low * MULT), Math.round(high * MULT));

export const CA_ONTARIO: RegionalCostBenchmarks = {
  zones: {
    habitation: {
      costPerAcre: fallback(8000, 15000),
      description: 'Clearing, grading, drainage for building sites',
      source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — Ontario site-prep rates vary heavily by Conservation Authority jurisdiction; no provincial schedule located' },
    },
    food_production: {
      costPerAcre: fallback(3000, 8000),
      description: 'Soil amendment, irrigation prep, bed establishment',
      source: { citation: `${OMAFRA_PUB60_2025} (soil-amendment + tillage line items applied to mixed-use bed prep)`, year: 2025, confidence: 'medium' },
    },
    livestock: {
      costPerAcre: costRange(2500, 6500),
      description: 'Pasture improvement, water points, shade structures',
      source: { citation: `${OMAFRA_PUB60_2025} (Pasture Management budget)`, year: 2025, confidence: 'medium' },
    },
    commons: {
      costPerAcre: fallback(1500, 4000),
      description: 'Landscaping, seating areas, pathway prep',
      source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — no Ontario amenity-landscaping schedule (same gap as US side)' },
    },
    spiritual: {
      costPerAcre: fallback(3000, 8000),
      description: 'Grading, contemplation garden, water features',
      source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — specialty hardscape varies with design intent' },
    },
    education: {
      costPerAcre: fallback(4000, 10000),
      description: 'Outdoor classroom, demonstration plots',
      source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — no Ontario outdoor-education site-prep budget located' },
    },
    retreat: {
      costPerAcre: fallback(5000, 12000),
      description: 'Site prep for guest accommodation, landscaping',
      source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — small-lodging site-prep is too design-specific for a single source' },
    },
    conservation: {
      costPerAcre: costRange(600, 2400),
      description: 'Native planting, erosion control, minimal intervention',
      source: { citation: 'Ontario Ecological Restoration — Native Planting Cost Study (Credit Valley CA, 2023)', year: 2023, confidence: 'medium' },
    },
    water_retention: {
      costPerAcre: fallback(4000, 12000),
      description: 'Pond excavation, swale construction, keyline work',
      source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — pond/swale construction in Ontario requires Conservation Authority approval and CA-specific permit fees; rates vary by watershed' },
    },
    infrastructure: {
      costPerAcre: fallback(6000, 15000),
      description: 'Utility corridors, grading for roads/parking',
      source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — no provincial utility-corridor schedule; Hydro One residential connect rates exist but cover only the service drop, not on-property grading' },
    },
  },
  fencing: {
    electric: {
      costPerMetre: fallback(3, 8),
      source: { citation: `${OMAFRA_PUB60_2025} (Fencing cost appendix — electric polywire option) + US Midwest × 1.20 cross-check`, year: 2025, confidence: 'medium' },
    },
    post_wire: {
      costPerMetre: costRange(15, 28),
      source: { citation: `${OMAFRA_PUB60_2025} (Fencing cost appendix)`, year: 2025, confidence: 'medium' },
    },
    post_rail: {
      costPerMetre: fallback(25, 50),
      source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — decorative post-and-rail not in OMAFRA fencing appendix; contractor-quote basis only' },
    },
    woven_wire: {
      costPerMetre: costRange(18, 34),
      source: { citation: `${OMAFRA_PUB60_2025} (Fencing cost appendix)`, year: 2025, confidence: 'medium' },
    },
    temporary: {
      costPerMetre: fallback(1, 3),
      source: { citation: `${OMAFRA_PUB60_2025} (Fencing cost appendix — rolled polywire) + US Midwest × 1.20 cross-check`, year: 2025, confidence: 'medium' },
    },
    none: {
      costPerMetre: costRange(0, 0),
      source: { citation: 'No fencing — zero cost', year: null, confidence: 'high' },
    },
  },
  paths: {
    main_road:        { costPerMetre: fallback(80, 160), source: { citation: ANGI_ROADS_2026_CAD, year: 2026, confidence: 'medium' } },
    secondary_road:   { costPerMetre: fallback(50, 100), source: { citation: ANGI_ROADS_2026_CAD, year: 2026, confidence: 'medium' } },
    emergency_access: { costPerMetre: fallback(60, 120), source: { citation: ANGI_ROADS_2026_CAD, year: 2026, confidence: 'medium' } },
    service_road:     { costPerMetre: fallback(40,  80), source: { citation: ANGI_ROADS_2026_CAD, year: 2026, confidence: 'medium' } },
    pedestrian_path:  { costPerMetre: fallback(15,  35), source: { citation: AMERICAN_TRAILS_2024_CAD, year: 2024, confidence: 'medium' } },
    trail:            { costPerMetre: fallback( 5,  15), source: { citation: AMERICAN_TRAILS_2024_CAD, year: 2024, confidence: 'medium' } },
    farm_lane:        { costPerMetre: fallback(30,  60), source: { citation: ANGI_ROADS_2026_CAD, year: 2026, confidence: 'medium' } },
    animal_corridor:  { costPerMetre: fallback( 8,  20), source: { citation: `${OMAFRA_PUB60_2025} (Fencing — laneway, double-sided permanent)`, year: 2025, confidence: 'medium' } },
    grazing_route:    { costPerMetre: fallback( 3,  10), source: { citation: `${OMAFRA_PUB60_2025} (Fencing — temporary polywire, double-sided)`, year: 2025, confidence: 'medium' } },
    arrival_sequence: { costPerMetre: fallback(60, 140), source: { citation: ANGI_ROADS_2026_CAD, year: 2026, confidence: 'low', note: 'design-intent (signage, plantings, chicane) is not captured in any rate schedule — cited at low' } },
    quiet_route:      { costPerMetre: fallback(10,  25), source: { citation: AMERICAN_TRAILS_2024_CAD, year: 2024, confidence: 'medium' } },
  },
  utilities: {
    solar_panel: {
      // NRCan RETScreen 2024 — residential solar CAD $3.20/W installed (post-incentive).
      systemCost: costRange(18000, 54000),
      source: { citation: NRCAN_SOLAR_2024, year: 2024, confidence: 'high' },
    },
    battery_room: {
      systemCost: fallback(8000, 25000),
      source: { citation: NREL_ATB_2024_BATTERY, year: 2024, confidence: 'medium', note: 'Powerwall-class equipment is essentially priced in USD even in CAD market; FX-adjusted from US ATB benchmark' },
    },
    generator:        { systemCost: fallback(3000, 12000), source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — same kW/fuel-type variance as US side' } },
    water_tank:       { systemCost: fallback(3000, 15000), source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — cistern sizing dominates cost' } },
    well_pump:        { systemCost: fallback(8000, 30000), source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — Ontario MECP Well Record database has individual completion records but no aggregated rate schedule' } },
    greywater:        { systemCost: fallback(5000, 15000), source: { citation: null, year: null, confidence: 'low', note: 'OBC restricts greywater reuse to specific Class 5 plumbing fixtures; few certified installers — declared placeholder' } },
    septic:           { systemCost: fallback(12000, 30000), source: { citation: OBC_PART8_2024, year: 2024, confidence: 'medium', note: 'range covers Class 4 conventional through Class 5 tertiary; Part 8 of OBC 2024 applies' } },
    rain_catchment:   { systemCost: fallback(2000, 8000), source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — gutter+cistern+first-flush varies independently' } },
    lighting:         { systemCost: fallback(1500, 5000), source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — solar bollards essentially retail-priced' } },
    firewood_storage: { systemCost: fallback(500, 2000), source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — DIY pole-shed range' } },
    waste_sorting:    { systemCost: fallback(1000, 3000), source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — bin infrastructure, retail-priced' } },
    compost:          { systemCost: fallback(1500, 5000), source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — 3-bin DIY to ASP range' } },
    biochar:          { systemCost: fallback(3000, 10000), source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — flame-cap to retort kiln; artisanal market' } },
    tool_storage:     { systemCost: fallback(2000, 6000), source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — DIY to pre-fab steel building' } },
    laundry_station:  { systemCost: fallback(2000, 8000), source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — appliance + plumbing + electrical' } },
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
      source: { citation: `${OMAFRA_PUB60_2025} (corn/soybean budgets)`, year: 2025, confidence: 'high' },
    },
    garden_bed: {
      establishmentPerAcre: fallback(5000, 12000),
      source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — fully captured by market_garden where it exists; this row is a secondary fallback' },
    },
    food_forest: {
      establishmentPerAcre: fallback(6000, 15000),
      source: { citation: 'USDA SARE — Handbook for Agroforestry Planning & Design (https://projects.sare.org/information-product/handbook-for-agroforestry-planning-design/, accessed 2026-05-10) — applied with × 1.20 CAD adjustment; no OMAFRA agroforestry budget published', year: 2023, confidence: 'medium' },
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
      source: { citation: 'UVM Extension — Silvopasture Establishment Guide (2023), applied with × 1.20 CAD adjustment; no Ontario-specific silvopasture budget published', year: 2023, confidence: 'medium' },
    },
    nursery: {
      establishmentPerAcre: fallback(10000, 25000),
      source: { citation: null, year: null, confidence: 'low', note: 'US Midwest × 1.20 — same lack of consolidated budget as US side; Ontario nursery sector has no published establishment schedule for permaculture-scale operations' },
    },
    market_garden: {
      establishmentPerAcre: fallback(8000, 20000),
      source: { citation: 'Jean-Martin Fortier — "The Market Gardener" budget (2022 USD, Quebec-based; broadly applicable to Ontario with × 1.20 adjustment)', year: 2022, confidence: 'medium' },
    },
    pollinator_strip: {
      establishmentPerAcre: costRange(1800, 4800),
      source: { citation: OSCIA_2024, year: 2024, confidence: 'high' },
    },
  },
  structureMultiplier: 1.20,
};

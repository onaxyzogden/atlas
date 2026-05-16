/**
 * Regenerative-farm-dedicated interventions.
 *
 * Tagged `projectTypes: ['regenerative-farm']` ⇒ the sequencing engine
 * only considers them under a regenerative-farm goal tree. Every
 * `criterionContributions` id is copied verbatim from the
 * `REGENERATIVE_FARM` template in `goalTreeTemplates.ts` (regen-* +
 * livestock-* vocabulary) so each entry is genuinely reachable, not
 * inert. Prerequisites root on `parcel-assessment` (a universal
 * foundation, always selected).
 */

import type { Intervention } from '../goalCompassTypes.js';

export const REGENERATIVE_FARM_INTERVENTIONS: Intervention[] = [
  {
    id: 'keyline-subsoil-ripping',
    zoneAffinity: {
      preferredCategories: ['food_production', 'livestock'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses'],
      avoidedCategories: ['habitation', 'spiritual', 'water_retention'],
      permacultureRingRange: [2, 4],
    },
    geometryTemplate: 'contour-line',
    name: 'Keyline subsoil ripping (pasture & cropland)',
    description:
      'Yeomans-pattern shallow subsoiling on the keyline geometry to ' +
      'decompact the profile, drive rainfall deep, and accelerate topsoil ' +
      'formation across the working acres without inversion tillage.',
    category: 'earthworks',
    yeomansPhase: 'soil',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [{ kind: 'slopeMaxPct', value: 18 }],
    laborHrsPerAcre: 2,
    costRangeUSD: { low: 60, mid: 120, high: 240, perAcre: true },
    materials: [{ label: 'Subsoiler / Yeomans plow pass', unit: 'lot' }],
    maintenanceSchedule: {
      frequency: 'every-3-years',
      season: 'fall',
      laborHrsPerOccurrence: 4,
      costUSDPerOccurrence: 90,
      equipmentRequired: ['tractor + keyline/Yeomans subsoiler'],
      notes:
        'Re-rip on the keyline pattern only as compaction returns — ' +
        'typically a light pass every third season, deepening gradually.',
    },
    durationMonths: 2,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'regen-water-infiltration', contributionPerAcre: 6, appliesAtYearOffset: 2 },
      { criterionId: 'regen-soil-om', contributionPerAcre: 0.08, appliesAtYearOffset: 5 },
    ],
    spatialFootprintAcres: { fractionOfParcel: 0.2 },
    designLayer: 'earthworks',
    projectTypes: ['regenerative-farm'],
    sources: [
      {
        source:
          'Yeomans, P. A. (1973, rev. 1981). Water for Every Farm: The Yeomans Keyline Plan. Murray Books.',
        year: 1981,
        kind: 'book',
        note: 'Keyline subsoiling for accelerated soil formation.',
      },
    ],
    region: 'global',
  },

  {
    id: 'compost-extract-program',
    zoneAffinity: {
      preferredCategories: ['food_production', 'livestock'],
      permacultureRingRange: [1, 3],
    },
    geometryTemplate: 'centroid-point',
    name: 'Biological compost-extract program',
    description:
      'Brew and apply aerated compost extract / biological inoculant on a ' +
      'recurring calendar to restore soil microbiology across cropland and ' +
      'pasture, lifting nutrient cycling and aggregate stability.',
    category: 'soil',
    yeomansPhase: 'soil',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 40,
    costRangeUSD: { low: 800, mid: 1800, high: 3600 },
    materials: [
      { label: 'Extract brewer + tank', unit: 'unit' },
      { label: 'Biological starter / food stock', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 8,
      costUSDPerOccurrence: 60,
      equipmentRequired: ['boom / drench sprayer', 'microscope'],
      notes:
        'Brew, assess under the microscope, and apply each growing-season ' +
        'window; maintain the brewer and biological food stock.',
    },
    durationMonths: 3,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 50 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'regen-soil-om', contributionPerAcre: 0.06, appliesAtYearOffset: 3 },
      { criterionId: 'regen-yield-lbs-per-acre', contributionPerAcre: 350, appliesAtYearOffset: 3 },
    ],
    spatialFootprintAcres: { minimum: 0.05 },
    designLayer: 'vegetation',
    projectTypes: ['regenerative-farm'],
    sources: [
      {
        source:
          'Lowenfels, J., & Lewis, W. (2010). Teaming with Microbes: The Organic Gardener’s Guide to the Soil Food Web (rev. ed.). Timber Press.',
        year: 2010,
        kind: 'book',
        note: 'Soil-food-web restoration via biological extracts.',
      },
    ],
    region: 'global',
  },

  {
    id: 'silvopasture-alley',
    zoneAffinity: {
      preferredCategories: ['livestock', 'food_production'],
      preferredGroundCover: ['sparse-grasses', 'thriving-grasses'],
      preferredSuccession: ['pioneer', 'mid'],
      avoidedCategories: ['habitation', 'spiritual', 'water_retention'],
      permacultureRingRange: [3, 4],
    },
    geometryTemplate: 'tile-strip',
    name: 'Silvopasture tree-forage alleys',
    description:
      'Widely spaced tree or shrub rows established into managed pasture so ' +
      'grazing, fodder, and a long-horizon timber/fruit yield share the ' +
      'same acres — shade and deep roots stabilise the forage system.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [{ kind: 'minAcres', value: 5 }],
    laborHrsPerAcre: 30,
    costRangeUSD: { low: 900, mid: 2000, high: 4200, perAcre: true },
    materials: [
      { label: 'Tree/shrub stock (wide-spaced rows)', quantityPerAcre: 60, unit: 'plants/acre' },
      { label: 'Tree guards + stakes', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'winter',
      laborHrsPerOccurrence: 16,
      costUSDPerOccurrence: 220,
      materialsPerOccurrence: [{ label: 'Replacement whips / guards', unit: 'lot' }],
      equipmentRequired: ['pruning saw / loppers'],
      notes:
        'Formative pruning, guard checks, and gap replanting while the ' +
        'rows establish; thinning once canopy closes.',
    },
    durationMonths: 24,
    maturityCurve: [
      { yearOffset: 2, functionalPct: 30 },
      { yearOffset: 5, functionalPct: 70 },
      { yearOffset: 10, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'regen-soil-cover', contributionPerAcre: 3, appliesAtYearOffset: 2 },
      { criterionId: 'livestock-protein-lbs', contributionPerAcre: 30, appliesAtYearOffset: 5 },
      { criterionId: 'livestock-revenue-usd', contributionPerAcre: 200, appliesAtYearOffset: 7 },
    ],
    spatialFootprintAcres: { minimum: 2 },
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
    projectTypes: ['regenerative-farm'],
    sources: [
      {
        source:
          'Gabriel, S. (2018). Silvopasture: A Guide to Managing Grazing Animals, Forage Crops, and Trees in a Temperate Farm Ecosystem. Chelsea Green.',
        year: 2018,
        kind: 'book',
        note: 'Temperate silvopasture establishment and management.',
      },
      {
        source:
          'Garrett, H. E. (Ed.). (2009). North American Agroforestry: An Integrated Science and Practice (2nd ed.). American Society of Agronomy.',
        year: 2009,
        kind: 'practice-guide',
      },
    ],
    region: 'global',
  },

  {
    id: 'integrated-stock-cropland',
    zoneAffinity: {
      preferredCategories: ['food_production', 'livestock'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses'],
      avoidedCategories: ['habitation', 'spiritual', 'conservation'],
      permacultureRingRange: [2, 4],
    },
    geometryTemplate: 'tile-strip',
    name: 'Integrated crop–livestock grazing of residues',
    description:
      'Plan the cash rotation so livestock graze cover crops and crop ' +
      'residues in-field — animal impact cycles nutrients, terminates ' +
      'covers without tillage, and adds a protein revenue line on the same ' +
      'cropland acres.',
    category: 'livestock',
    yeomansPhase: 'subdivision',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [{ kind: 'minAcres', value: 10 }, { kind: 'slopeMaxPct', value: 15 }],
    laborHrsPerAcre: 8,
    costRangeUSD: { low: 400, mid: 900, high: 1800, perAcre: true },
    materials: [
      { label: 'Portable electric subdivision', unit: 'lot' },
      { label: 'Portable water + energizer', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'quarterly',
      season: 'any',
      laborHrsPerOccurrence: 18,
      costUSDPerOccurrence: 180,
      equipmentRequired: ['ATV / UTV', 'fence energizer tester'],
      notes:
        'Plan and move stock across residue/cover blocks each grazing ' +
        'window, service fence and water, reconcile the grazing chart with ' +
        'the cropping plan.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'regen-soil-om', contributionPerAcre: 0.05, appliesAtYearOffset: 4 },
      { criterionId: 'livestock-paddocks-active-count', contributionFixed: 6, appliesAtYearOffset: 2 },
      { criterionId: 'livestock-revenue-usd', contributionPerAcre: 160, appliesAtYearOffset: 3 },
      { criterionId: 'regen-revenue-per-acre', contributionPerAcre: 160, appliesAtYearOffset: 3 },
    ],
    spatialFootprintAcres: { fractionOfParcel: 0.15 },
    designLayer: 'structures',
    projectTypes: ['regenerative-farm'],
    sources: [
      {
        source: 'Brown, G. (2018). Dirt to Soil: One Family’s Journey into Regenerative Agriculture. Chelsea Green.',
        year: 2018,
        kind: 'book',
        note: 'Crop–livestock integration on regenerative cropland.',
      },
    ],
    region: 'global',
  },

  {
    id: 'multispecies-cash-cover',
    zoneAffinity: {
      preferredCategories: ['food_production'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses'],
      avoidedCategories: ['habitation', 'spiritual', 'conservation', 'water_retention'],
      permacultureRingRange: [2, 4],
    },
    geometryTemplate: 'fill-polygon',
    name: 'Multi-species cash cover (grazed/harvested)',
    description:
      'High-diversity cover stands managed for a saleable cut (forage, ' +
      'seed, or grazing lease) rather than only fertility — keeps living ' +
      'roots year-round while the cover itself carries a margin.',
    category: 'vegetation',
    yeomansPhase: 'soil',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [{ kind: 'slopeMaxPct', value: 15 }],
    laborHrsPerAcre: 4,
    costRangeUSD: { low: 90, mid: 170, high: 320, perAcre: true },
    materials: [{ label: 'Diverse cover-crop seed mix', quantityPerAcre: 35, unit: 'lbs/acre' }],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'spring',
      laborHrsPerOccurrence: 4,
      costUSDPerOccurrence: 70,
      materialsPerOccurrence: [{ label: 'Reseed mix', unit: 'lbs' }],
      equipmentRequired: ['no-till drill'],
      notes: 'Reseed the diverse stand each season and time the cut/graze for both margin and ground cover.',
    },
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 80 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'regen-soil-cover', contributionPerAcre: 6, appliesAtYearOffset: 1 },
      { criterionId: 'regen-revenue-per-acre', contributionPerAcre: 120, appliesAtYearOffset: 2 },
      { criterionId: 'regen-yield-lbs-per-acre', contributionPerAcre: 600, appliesAtYearOffset: 2 },
    ],
    spatialFootprintAcres: { fractionOfParcel: 0.12 },
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
    projectTypes: ['regenerative-farm'],
    sources: [
      {
        source: 'Montgomery, D. R. (2017). Growing a Revolution: Bringing Our Soil Back to Life. W. W. Norton.',
        year: 2017,
        kind: 'book',
        note: 'Continuous living cover as a profit-and-soil lever.',
      },
    ],
    region: 'global',
  },

  {
    id: 'regen-grazing-water-reticulation',
    zoneAffinity: {
      preferredCategories: ['livestock'],
      permacultureRingRange: [3, 4],
    },
    geometryTemplate: 'centroid-point',
    name: 'Whole-farm grazing water reticulation',
    description:
      'A pumped/gravity water grid that puts a portable trough within ' +
      'reach of every grazing cell, removing the water constraint on tight ' +
      'rotational moves and lifting paddock welfare-audit pass rates.',
    category: 'water',
    yeomansPhase: 'water',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [{ kind: 'minAcres', value: 10 }],
    laborHrsPerAcre: 5,
    costRangeUSD: { low: 500, mid: 1100, high: 2200, perAcre: true },
    materials: [
      { label: 'Buried mainline + risers', unit: 'meters' },
      { label: 'Portable troughs + couplers', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'quarterly',
      season: 'any',
      laborHrsPerOccurrence: 5,
      costUSDPerOccurrence: 80,
      notes: 'Pressure-test the grid, clean troughs and floats, winterize exposed runs before frost.',
    },
    durationMonths: 4,
    maturityCurve: [{ yearOffset: 1, functionalPct: 100 }],
    criterionContributions: [
      { criterionId: 'livestock-welfare-pass-pct', contributionFixed: 60, appliesAtYearOffset: 1 },
      { criterionId: 'livestock-paddocks-active-count', contributionFixed: 4, appliesAtYearOffset: 1 },
      { criterionId: 'regen-water-infiltration', contributionPerAcre: 1, appliesAtYearOffset: 2 },
    ],
    spatialFootprintAcres: { minimum: 0.05 },
    designLayer: 'water',
    projectTypes: ['regenerative-farm'],
    sources: [
      {
        source: 'Gerrish, J. (2004). Management-intensive Grazing: The Grassroots of Grass Farming. Green Park Press.',
        year: 2004,
        kind: 'book',
        note: 'Water placement as the binding constraint on rotation density.',
      },
      {
        source: 'USDA NRCS (2020). Conservation Practice Standard 614: Watering Facility.',
        year: 2020,
        kind: 'practice-guide',
      },
    ],
    region: 'global',
  },
];

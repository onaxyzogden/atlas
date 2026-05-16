/**
 * Conservation-dedicated interventions.
 *
 * Tagged `projectTypes: ['conservation']`. Criterion ids copied verbatim
 * from the `CONSERVATION` template (cons-native-cover-pct,
 * cons-invasive-pct, cons-indicator-species-count,
 * cons-riparian-cover-pct).
 *
 * SEMANTIC NOTE — `cons-invasive-pct` is a *ceiling* criterion (target 5%
 * infestation, lower is better). A positive `contributionFixed` /
 * `contributionPerAcre` here represents the *percentage-points of
 * infestation removed* by the control work, i.e. progress toward the
 * lower target — it is NOT ecological harm. The sequencing engine reads
 * any contribution as forward progress; the conservative magnitudes
 * below reflect realistic knock-down, not eradication.
 *
 * Prerequisites root on `parcel-assessment`.
 */

import type { Intervention } from '../goalCompassTypes.js';

export const CONSERVATION_INTERVENTIONS: Intervention[] = [
  {
    id: 'native-revegetation-seeding',
    zoneAffinity: {
      preferredCategories: ['conservation', 'buffer', 'commons'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses'],
      avoidedCategories: ['habitation', 'infrastructure'],
      permacultureRingRange: [3, 5],
    },
    geometryTemplate: 'fill-polygon',
    name: 'Native revegetation seeding',
    description:
      'Site preparation and broadcast/drill seeding of locally appropriate ' +
      'native plant communities to re-establish a self-sustaining native ' +
      'cover on degraded ground.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborHrsPerAcre: 14,
    costRangeUSD: { low: 350, mid: 800, high: 1600, perAcre: true },
    materials: [
      { label: 'Native seed mix (local provenance)', quantityPerAcre: 12, unit: 'lbs/acre' },
      { label: 'Site-prep + cover crop nurse', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'spring',
      laborHrsPerOccurrence: 8,
      costUSDPerOccurrence: 120,
      materialsPerOccurrence: [{ label: 'Inter-seed / spot-seed', unit: 'lot' }],
      notes: 'Establishment-phase weed suppression and inter-seeding until the native sward closes.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 2, functionalPct: 30 },
      { yearOffset: 5, functionalPct: 65 },
      { yearOffset: 10, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'cons-native-cover-pct', contributionPerAcre: 1.4, appliesAtYearOffset: 5 },
    ],
    spatialFootprintAcres: { minimum: 0.5 },
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
    projectTypes: ['conservation'],
    sources: [
      {
        source:
          'Society for Ecological Restoration (2004). The SER International Primer on Ecological Restoration. SER.',
        year: 2004,
        kind: 'standard',
        note: 'Reference standard for native community re-establishment.',
      },
    ],
    region: 'global',
  },

  {
    id: 'invasive-species-control',
    zoneAffinity: {
      preferredCategories: ['conservation', 'buffer'],
      avoidedCategories: ['habitation'],
      permacultureRingRange: [2, 5],
    },
    geometryTemplate: 'fill-polygon',
    name: 'Invasive species control program',
    description:
      'A multi-year integrated control program (mechanical, targeted, and ' +
      'follow-up) that knocks back established invasive infestations and ' +
      'holds the gains so native communities can recover.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborHrsPerAcre: 22,
    costRangeUSD: { low: 250, mid: 600, high: 1400, perAcre: true },
    materials: [
      { label: 'Control equipment + PPE', unit: 'lot' },
      { label: 'Targeted treatment supplies', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'summer',
      laborHrsPerOccurrence: 16,
      costUSDPerOccurrence: 220,
      notes: 'Annual re-treatment of regrowth and new incursions — invasive control is a standing commitment, not a one-time clear.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 40 },
      { yearOffset: 3, functionalPct: 80 },
      { yearOffset: 5, functionalPct: 100 },
    ],
    criterionContributions: [
      // SEMANTIC INVERSION: cons-invasive-pct is a ceiling (lower is
      // better). This value = points of infestation knocked down per
      // treated acre over the program — progress toward the 5% target,
      // not added infestation. Conservative: realistic knock-down, not
      // eradication.
      { criterionId: 'cons-invasive-pct', contributionPerAcre: 1.2, appliesAtYearOffset: 5 },
    ],
    spatialFootprintAcres: { minimum: 0.5 },
    designLayer: 'vegetation',
    projectTypes: ['conservation'],
    sources: [
      {
        source:
          'DiTomaso, J. M., et al. (2013). Weed Control in Natural Areas in the Western United States. UC Weed Research & Information Center.',
        year: 2013,
        kind: 'practice-guide',
        note: 'Integrated invasive-control methods and re-treatment cadence.',
      },
    ],
    region: 'global',
  },

  {
    id: 'riparian-corridor-restoration',
    zoneAffinity: {
      preferredCategories: ['conservation', 'water_retention', 'buffer'],
      preferredGroundCover: ['wetland', 'sparse-grasses'],
      avoidedCategories: ['habitation', 'infrastructure'],
      permacultureRingRange: [3, 5],
    },
    geometryTemplate: 'edge-line',
    name: 'Riparian corridor restoration',
    description:
      'Exclude disturbance from watercourses and re-establish a continuous ' +
      'multi-layer native woody corridor — stabilizes banks, shades the ' +
      'channel, and reconnects wildlife movement along the riparian zone.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborHrsPerAcre: 20,
    costRangeUSD: { low: 900, mid: 1900, high: 3800, perAcre: true },
    materials: [
      { label: 'Native riparian stock', quantityPerAcre: 320, unit: 'plants/acre' },
      { label: 'Exclusion fencing', unit: 'meters' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'spring',
      laborHrsPerOccurrence: 12,
      costUSDPerOccurrence: 180,
      materialsPerOccurrence: [{ label: 'Replacement stock', unit: 'lot' }],
      notes: 'Replace failed plantings, control bank weeds, maintain exclusion fencing until canopy closes.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 2, functionalPct: 35 },
      { yearOffset: 5, functionalPct: 75 },
      { yearOffset: 7, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'cons-riparian-cover-pct', contributionPerAcre: 6, appliesAtYearOffset: 7 },
      { criterionId: 'cons-native-cover-pct', contributionPerAcre: 0.6, appliesAtYearOffset: 7 },
    ],
    spatialFootprintAcres: { minimum: 0.3 },
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
    projectTypes: ['conservation'],
    sources: [
      {
        source:
          'Bentrup, G. (2008). Conservation Buffers: Design Guidelines for Buffers, Corridors, and Greenways. USDA Forest Service, Gen. Tech. Rep. SRS-109.',
        year: 2008,
        kind: 'practice-guide',
        note: 'Riparian corridor width and species design.',
      },
    ],
    region: 'global',
  },

  {
    id: 'prescribed-burn-regime',
    zoneAffinity: {
      preferredCategories: ['conservation', 'commons'],
      preferredGroundCover: ['sparse-grasses', 'thriving-grasses'],
      avoidedCategories: ['habitation', 'infrastructure', 'food_production'],
      permacultureRingRange: [4, 5],
    },
    geometryTemplate: 'fill-polygon',
    name: 'Prescribed-burn management regime',
    description:
      'A planned rotational prescribed-fire regime on fire-adapted ' +
      'communities — sets back woody and invasive encroachment and ' +
      'maintains the open structure native ground flora depends on.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborHrsPerAcre: 4,
    laborFixedHrs: 80,
    costRangeUSD: { low: 300, mid: 700, high: 1500, perAcre: true },
    materials: [
      { label: 'Burn plan + firebreak prep', unit: 'lot' },
      { label: 'Crew + suppression equipment', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'every-3-years',
      season: 'fall',
      laborHrsPerOccurrence: 24,
      costUSDPerOccurrence: 600,
      requiredPersonnel: { skillLevel: 'certified burn boss', minCount: 1 },
      equipmentRequired: ['fire suppression unit'],
      notes: 'Rotational burn unit on a ~3-year return interval with firebreak refresh and burn-plan update.',
    },
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 40 },
      { yearOffset: 4, functionalPct: 80 },
      { yearOffset: 7, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'cons-native-cover-pct', contributionPerAcre: 0.5, appliesAtYearOffset: 4 },
      // SEMANTIC INVERSION: cons-invasive-pct ceiling — fire knock-down
      // of woody/invasive encroachment is progress toward the lower
      // target, not added infestation.
      { criterionId: 'cons-invasive-pct', contributionPerAcre: 0.4, appliesAtYearOffset: 4 },
    ],
    spatialFootprintAcres: { minimum: 1 },
    seasonConstraints: ['fall', 'winter'],
    designLayer: 'vegetation',
    projectTypes: ['conservation'],
    sources: [
      {
        source:
          'Pyne, S. J., Andrews, P. L., & Laven, R. D. (1996). Introduction to Wildland Fire (2nd ed.). Wiley.',
        year: 1996,
        kind: 'book',
        note: 'Prescribed-fire planning and return-interval basis.',
      },
    ],
    region: 'global',
  },

  {
    id: 'wildlife-habitat-structures',
    zoneAffinity: {
      preferredCategories: ['conservation', 'buffer', 'commons'],
      avoidedCategories: ['habitation', 'infrastructure'],
      permacultureRingRange: [3, 5],
    },
    geometryTemplate: 'fill-polygon',
    name: 'Wildlife habitat structures',
    description:
      'Targeted habitat features (snags, brush piles, rock piles, nest ' +
      'boxes, pollinator banks) installed across restored ground to lift ' +
      'the diversity of resident and visiting indicator species.',
    category: 'structures',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborHrsPerAcre: 8,
    laborFixedHrs: 40,
    costRangeUSD: { low: 200, mid: 500, high: 1100, perAcre: true },
    materials: [
      { label: 'Nest boxes / structure materials', unit: 'lot' },
      { label: 'Pollinator bank plantings', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'winter',
      laborHrsPerOccurrence: 10,
      costUSDPerOccurrence: 140,
      notes: 'Clean and repair nest boxes, refresh brush/rock features and pollinator banks.',
    },
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 50 },
      { yearOffset: 3, functionalPct: 80 },
      { yearOffset: 7, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'cons-indicator-species-count', contributionPerAcre: 0.4, appliesAtYearOffset: 7 },
    ],
    spatialFootprintAcres: { minimum: 0.3 },
    designLayer: 'structures',
    projectTypes: ['conservation'],
    sources: [
      {
        source:
          'Packard, S., & Mutel, C. F. (1997). The Tallgrass Restoration Handbook. Island Press.',
        year: 1997,
        kind: 'book',
        note: 'Habitat-feature prescriptions and indicator-species framing.',
      },
    ],
    region: 'global',
  },

  {
    id: 'habitat-monitoring-program',
    zoneAffinity: {
      preferredCategories: ['conservation', 'commons'],
      permacultureRingRange: [3, 5],
    },
    geometryTemplate: 'centroid-point',
    name: 'Habitat monitoring & adaptive-management program',
    description:
      'The operating layer that makes restoration accountable: fixed ' +
      'transects, annual indicator-species surveys, and a feedback loop ' +
      'that retargets control and revegetation effort where the data say ' +
      'it is needed.',
    category: 'structures',
    yeomansPhase: 'buildings',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 120,
    costRangeUSD: { low: 2000, mid: 4500, high: 9000 },
    materials: [
      { label: 'Survey + datalogging kit', unit: 'lot' },
      { label: 'Transect / plot establishment', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'summer',
      laborHrsPerOccurrence: 60,
      costUSDPerOccurrence: 800,
      requiredPersonnel: { skillLevel: 'field ecologist', minCount: 1 },
      notes: 'Annual transect re-survey, indicator-species count, and adaptive-management review.',
    },
    durationMonths: 4,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      // Activation layer: monitoring + adaptive retargeting is what
      // converts habitat structures into detected indicator species.
      { criterionId: 'cons-indicator-species-count', contributionFixed: 5, appliesAtYearOffset: 7 },
    ],
    designLayer: 'structures',
    projectTypes: ['conservation'],
    sources: [
      {
        source:
          'Elzinga, C. L., Salzer, D. W., & Willoughby, J. W. (1998). Measuring and Monitoring Plant Populations. BLM Technical Reference 1730-1.',
        year: 1998,
        kind: 'practice-guide',
        note: 'Transect design and adaptive-management monitoring protocol.',
      },
    ],
    region: 'global',
  },
];

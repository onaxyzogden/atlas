/**
 * Multi-enterprise-dedicated interventions.
 *
 * Tagged `projectTypes: ['multi-enterprise']`. Criterion ids copied
 * verbatim from the `MULTI_ENTERPRISE` template
 * (multi-enterprise-streams, multi-gross-revenue-usd,
 * multi-production-pct, multi-rest-pct).
 *
 * `multi-largest-enterprise-pct` is deliberately left WITHOUT a
 * dedicated contribution — it is an emergent revenue-concentration
 * ratio (a balance/ceiling), satisfied by diversifying streams rather
 * than by any single intervention. Each enterprise here contributes a
 * conservative +1 to multi-enterprise-streams (a stream is "operating"
 * once established) plus its own revenue line. Prerequisites root on
 * `parcel-assessment`.
 */

import type { Intervention } from '../goalCompassTypes.js';

export const MULTI_ENTERPRISE_INTERVENTIONS: Intervention[] = [
  {
    id: 'agritourism-venue',
    zoneAffinity: {
      preferredCategories: ['commons', 'habitation', 'infrastructure'],
      permacultureRingRange: [0, 2],
    },
    geometryTemplate: 'bbox-rect',
    name: 'Agritourism venue & events space',
    description:
      'A flexible on-farm venue (covered space, parking, sanitation) that ' +
      'hosts tours, farm dinners, and seasonal events — a distinct ' +
      'revenue stream that monetizes the farm experience.',
    category: 'structures',
    yeomansPhase: 'buildings',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 450,
    costRangeUSD: { low: 35000, mid: 75000, high: 150000 },
    materials: [
      { label: 'Venue structure + utilities', unit: 'lot' },
      { label: 'Parking + sanitation', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 40,
      costUSDPerOccurrence: 450,
      requiredPersonnel: { skillLevel: 'events host', minCount: 1 },
      notes: 'Event scheduling, venue turnaround, grounds and sanitation servicing each operating month.',
    },
    durationMonths: 9,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'multi-enterprise-streams', contributionFixed: 1, appliesAtYearOffset: 3 },
      { criterionId: 'multi-gross-revenue-usd', contributionFixed: 45000, appliesAtYearOffset: 5 },
    ],
    spatialFootprintAcres: { minimum: 0.4 },
    designLayer: 'structures',
    projectTypes: ['multi-enterprise'],
    sources: [
      {
        source:
          'Barbieri, C., & Mshenga, P. M. (2008). "The role of the firm and owner characteristics on the performance of agritourism farms." Sociologia Ruralis, 48(2), 166-183.',
        year: 2008,
        kind: 'journal',
        note: 'Agritourism as a distinct farm revenue stream.',
      },
    ],
    region: 'global',
  },

  {
    id: 'nursery-propagation-enterprise',
    zoneAffinity: {
      preferredCategories: ['food_production', 'infrastructure'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses'],
      permacultureRingRange: [1, 2],
    },
    geometryTemplate: 'bbox-rect',
    name: 'Plant nursery & propagation enterprise',
    description:
      'A production nursery (propagation beds, polytunnel, potting area) ' +
      'selling trees, transplants, and natives — a high-margin stream ' +
      'that also supplies the farm’s own planting needs.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [{ kind: 'slopeMaxPct', value: 8 }],
    laborHrsPerAcre: 900,
    costRangeUSD: { low: 12000, mid: 24000, high: 45000, perAcre: true },
    materials: [
      { label: 'Polytunnel + propagation benches', unit: 'lot' },
      { label: 'Pots, media, stock plants', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 70,
      costUSDPerOccurrence: 500,
      materialsPerOccurrence: [{ label: 'Media + pots restock', unit: 'lot' }],
      notes: 'Propagation cycles, irrigation and climate servicing, potting-on and sales fulfilment each month.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'multi-enterprise-streams', contributionFixed: 1, appliesAtYearOffset: 3 },
      { criterionId: 'multi-gross-revenue-usd', contributionPerAcre: 40000, appliesAtYearOffset: 5 },
      { criterionId: 'multi-production-pct', contributionPerAcre: 4, appliesAtYearOffset: 3 },
    ],
    spatialFootprintAcres: { minimum: 0.3 },
    designLayer: 'vegetation',
    projectTypes: ['multi-enterprise'],
    sources: [
      {
        source:
          'Dirr, M. A., & Heuser, C. W. (2006). The Reference Manual of Woody Plant Propagation (2nd ed.). Timber Press.',
        year: 2006,
        kind: 'book',
        note: 'Propagation-enterprise production basis.',
      },
    ],
    region: 'global',
  },

  {
    id: 'farm-stand-direct-market',
    zoneAffinity: {
      preferredCategories: ['infrastructure', 'commons', 'habitation'],
      permacultureRingRange: [0, 1],
    },
    geometryTemplate: 'centroid-point',
    name: 'Farm stand & direct-market channel',
    description:
      'An on-farm stand plus a direct-market channel (CSA shares, market ' +
      'stall) that captures retail margin across the farm’s products — ' +
      'the aggregating sales stream for everything grown.',
    category: 'structures',
    yeomansPhase: 'buildings',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 200,
    costRangeUSD: { low: 6000, mid: 14000, high: 28000 },
    materials: [
      { label: 'Stand structure + cold storage', unit: 'lot' },
      { label: 'POS + market kit', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 50,
      costUSDPerOccurrence: 300,
      requiredPersonnel: { skillLevel: 'market manager', minCount: 1 },
      notes: 'Stocking, staffing, CSA/share administration, and cold-chain servicing each operating month.',
    },
    durationMonths: 4,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 70 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'multi-enterprise-streams', contributionFixed: 1, appliesAtYearOffset: 2 },
      { criterionId: 'multi-gross-revenue-usd', contributionFixed: 50000, appliesAtYearOffset: 5 },
    ],
    spatialFootprintAcres: { minimum: 0.15 },
    designLayer: 'structures',
    projectTypes: ['multi-enterprise'],
    sources: [
      {
        source:
          'Henderson, E., & Van En, R. (2007). Sharing the Harvest: A Citizen’s Guide to Community Supported Agriculture (rev. ed.). Chelsea Green.',
        year: 2007,
        kind: 'book',
        note: 'Direct-market / CSA channel design.',
      },
    ],
    region: 'global',
  },

  {
    id: 'mixed-production-allocation',
    zoneAffinity: {
      preferredCategories: ['food_production'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses', 'thriving-grasses'],
      permacultureRingRange: [1, 3],
    },
    geometryTemplate: 'tile-strip',
    name: 'Mixed-production land allocation',
    description:
      'A deliberately diversified working block — rotated annuals, ' +
      'perennials, and small-livestock cells sharing one footprint — ' +
      'that puts land into balanced active production without leaning on ' +
      'a single crop.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [{ kind: 'slopeMaxPct', value: 12 }],
    laborHrsPerAcre: 600,
    costRangeUSD: { low: 4000, mid: 8500, high: 16000, perAcre: true },
    materials: [
      { label: 'Mixed seed / stock establishment', unit: 'lot' },
      { label: 'Rotation infrastructure', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 45,
      costUSDPerOccurrence: 220,
      materialsPerOccurrence: [{ label: 'Rotation inputs', unit: 'lot' }],
      notes: 'Rotation management across the mixed block — sowing, livestock moves, harvest — each operating month.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 70 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'multi-production-pct', contributionPerAcre: 5, appliesAtYearOffset: 3 },
      { criterionId: 'multi-enterprise-streams', contributionFixed: 1, appliesAtYearOffset: 3 },
      { criterionId: 'multi-gross-revenue-usd', contributionPerAcre: 9000, appliesAtYearOffset: 5 },
    ],
    spatialFootprintAcres: { minimum: 1 },
    designLayer: 'vegetation',
    projectTypes: ['multi-enterprise'],
    sources: [
      {
        source: 'Salatin, J. (1998). You Can Farm. Polyface.',
        year: 1998,
        kind: 'book',
        note: 'Stacked-enterprise land-allocation model.',
      },
    ],
    region: 'global',
  },

  {
    id: 'production-set-aside',
    zoneAffinity: {
      preferredCategories: ['conservation', 'buffer', 'commons'],
      avoidedCategories: ['habitation', 'infrastructure'],
      permacultureRingRange: [3, 5],
    },
    geometryTemplate: 'fill-polygon',
    name: 'Habitat / rest set-aside',
    description:
      'A protected share of the parcel held out of production as habitat, ' +
      'rotation rest, and watershed buffer — the resilience reserve that ' +
      'keeps the balanced operation from over-extracting.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborHrsPerAcre: 6,
    costRangeUSD: { low: 200, mid: 500, high: 1100, perAcre: true },
    materials: [
      { label: 'Native cover establishment', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'spring',
      laborHrsPerOccurrence: 6,
      costUSDPerOccurrence: 90,
      notes: 'Light annual upkeep — spot weed control and edge maintenance on the rested ground.',
    },
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'multi-rest-pct', contributionPerAcre: 4, appliesAtYearOffset: 3 },
    ],
    spatialFootprintAcres: { minimum: 0.5 },
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
    projectTypes: ['multi-enterprise'],
    sources: [
      {
        source:
          'Bentrup, G. (2008). Conservation Buffers: Design Guidelines for Buffers, Corridors, and Greenways. USDA Forest Service, Gen. Tech. Rep. SRS-109.',
        year: 2008,
        kind: 'practice-guide',
        note: 'Set-aside buffer/rest design within a working farm.',
      },
    ],
    region: 'global',
  },

  {
    id: 'value-add-processing-line',
    zoneAffinity: {
      preferredCategories: ['infrastructure', 'habitation'],
      permacultureRingRange: [0, 1],
    },
    geometryTemplate: 'centroid-point',
    name: 'Value-add processing line',
    description:
      'A licensed processing space (wash-pack, kitchen, or cure room) that ' +
      'turns raw farm output into shelf-stable, higher-margin products — a ' +
      'revenue stream that lifts the value of everything else grown.',
    category: 'structures',
    yeomansPhase: 'buildings',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 350,
    costRangeUSD: { low: 18000, mid: 40000, high: 80000 },
    materials: [
      { label: 'Processing equipment + fit-out', unit: 'lot' },
      { label: 'Licensing + packaging', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 35,
      costUSDPerOccurrence: 350,
      materialsPerOccurrence: [{ label: 'Packaging + sanitation supplies', unit: 'lot' }],
      notes: 'Equipment servicing, sanitation, licensing upkeep, and processing runs each operating month.',
    },
    durationMonths: 9,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'multi-enterprise-streams', contributionFixed: 1, appliesAtYearOffset: 3 },
      { criterionId: 'multi-gross-revenue-usd', contributionFixed: 55000, appliesAtYearOffset: 5 },
    ],
    spatialFootprintAcres: { minimum: 0.2 },
    designLayer: 'structures',
    projectTypes: ['multi-enterprise'],
    sources: [
      {
        source: 'Salatin, J. (1998). You Can Farm. Polyface.',
        year: 1998,
        kind: 'book',
        note: 'On-farm value-add as a margin-lifting enterprise.',
      },
    ],
    region: 'global',
  },
];

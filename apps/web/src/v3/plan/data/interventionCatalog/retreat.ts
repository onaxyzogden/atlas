/**
 * Retreat-center-dedicated interventions.
 *
 * Tagged `projectTypes: ['retreat']`. Criterion ids copied verbatim from
 * the `RETREAT_CENTER` template (retreat-annual-guest-nights,
 * retreat-food-pct, retreat-fruit-lbs, retreat-undisturbed-pct).
 * Guest-capacity contributions use a conservative `contributionFixed`
 * derivation written into the citation note — never a projected-demand
 * figure. Prerequisites root on `parcel-assessment`.
 */

import type { Intervention } from '../goalCompassTypes.js';

export const RETREAT_INTERVENTIONS: Intervention[] = [
  {
    id: 'guest-lodging-cluster',
    zoneAffinity: {
      preferredCategories: ['habitation', 'infrastructure'],
      permacultureRingRange: [0, 1],
    },
    geometryTemplate: 'bbox-rect',
    name: 'Guest lodging cluster (cabins / bunkrooms)',
    description:
      'A small cluster of low-impact guest cabins or bunkrooms with shared ' +
      'bath and gathering space — the physical capacity ceiling for hosting ' +
      'overnight retreat guests.',
    category: 'structures',
    yeomansPhase: 'buildings',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 600,
    costRangeUSD: { low: 60000, mid: 120000, high: 240000 },
    materials: [
      { label: 'Cabin shells / kits', unit: 'units' },
      { label: 'Shared bath + utility fit-out', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'spring',
      laborHrsPerOccurrence: 80,
      costUSDPerOccurrence: 3000,
      requiredPersonnel: { skillLevel: 'building trades (turnaround)', minCount: 1 },
      notes: 'Seasonal turnaround, envelope and utility servicing, furnishings refresh, code/inspection upkeep.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 70 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      // Conservative: 6 beds × ~150 occupied nights/yr at full ramp ≈ 900
      // guest-nights. Capacity ceiling, not a demand projection.
      { criterionId: 'retreat-annual-guest-nights', contributionFixed: 900, appliesAtYearOffset: 2 },
    ],
    spatialFootprintAcres: { minimum: 0.3 },
    designLayer: 'structures',
    projectTypes: ['retreat'],
    sources: [
      {
        source:
          'Venolia, C., & Lerner, K. (2006). Natural Remodeling for the Not-So-Green House. Lark Books.',
        year: 2006,
        kind: 'practice-guide',
        note: 'Low-impact guest-structure retrofit guidance.',
      },
    ],
    region: 'global',
  },

  {
    id: 'guest-kitchen-garden',
    zoneAffinity: {
      preferredCategories: ['food_production', 'habitation'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses', 'thriving-grasses'],
      permacultureRingRange: [1, 1],
    },
    geometryTemplate: 'bbox-rect',
    name: 'Guest-table kitchen garden',
    description:
      'A productive culinary garden sited within sight of the dining space ' +
      'so guests eat what the land grows — the visible heart of the ' +
      'farm-to-table retreat experience.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [{ kind: 'slopeMaxPct', value: 8 }],
    laborHrsPerAcre: 1000,
    costRangeUSD: { low: 4000, mid: 8000, high: 14000, perAcre: true },
    materials: [
      { label: 'Drip-irrigation kit', unit: 'lot' },
      { label: 'Seed + transplants (annual)', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 24,
      costUSDPerOccurrence: 110,
      materialsPerOccurrence: [{ label: 'Succession seed / compost', unit: 'lot' }],
      notes: 'Succession sowing tuned to guest-season menus, drip servicing, compost top-up, harvest for the kitchen.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 70 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'retreat-food-pct', contributionPerAcre: 20, appliesAtYearOffset: 2 },
    ],
    spatialFootprintAcres: { minimum: 0.2 },
    designLayer: 'vegetation',
    projectTypes: ['retreat'],
    sources: [
      {
        source: 'Coleman, E. (2018). The New Organic Grower (3rd ed.). Chelsea Green.',
        year: 2018,
        kind: 'book',
        note: 'Year-round culinary-garden production model.',
      },
    ],
    region: 'global',
  },

  {
    id: 'orchard-for-guests',
    zoneAffinity: {
      preferredCategories: ['food_production'],
      preferredSuccession: ['pioneer', 'mid'],
      avoidedCategories: ['habitation', 'spiritual', 'water_retention'],
      permacultureRingRange: [2, 3],
    },
    geometryTemplate: 'bbox-rect',
    name: 'Perennial fruit & nut grove (guest yield)',
    description:
      'A mixed fruit-and-nut grove chosen for fresh-eating quality and a ' +
      'long season of pick-your-own interest — supplies the guest table and ' +
      'doubles as a contemplative walking destination.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [{ kind: 'slopeMaxPct', value: 15 }],
    laborHrsPerAcre: 110,
    costRangeUSD: { low: 3000, mid: 6000, high: 11000, perAcre: true },
    materials: [
      { label: 'Bare-root fruit/nut stock', quantityPerAcre: 110, unit: 'trees/acre' },
      { label: 'Guards + stakes', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'winter',
      laborHrsPerOccurrence: 50,
      costUSDPerOccurrence: 350,
      equipmentRequired: ['pruning saw / loppers'],
      notes: 'Dormant and summer pruning, holistic pest rounds, guard checks, gap replanting.',
    },
    durationMonths: 24,
    maturityCurve: [
      { yearOffset: 3, functionalPct: 30 },
      { yearOffset: 5, functionalPct: 70 },
      { yearOffset: 7, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'retreat-fruit-lbs', contributionPerAcre: 700, appliesAtYearOffset: 7 },
      { criterionId: 'retreat-food-pct', contributionPerAcre: 4, appliesAtYearOffset: 7 },
    ],
    spatialFootprintAcres: { minimum: 0.5 },
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
    projectTypes: ['retreat'],
    sources: [
      {
        source: 'Phillips, M. (2011). The Holistic Orchard. Chelsea Green.',
        year: 2011,
        kind: 'book',
      },
    ],
    region: 'global',
  },

  {
    id: 'contemplative-trail-network',
    zoneAffinity: {
      preferredCategories: ['conservation', 'commons', 'buffer'],
      avoidedCategories: ['habitation', 'infrastructure'],
      permacultureRingRange: [3, 5],
    },
    geometryTemplate: 'contour-line',
    name: 'Contemplative trail & sit-spot network',
    description:
      'A light-footprint loop of walking trails, benches, and sit-spots ' +
      'threaded through the quiet acres so guests can move through the ' +
      'landscape without disturbing habitat.',
    category: 'access',
    yeomansPhase: 'access',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborHrsPerAcre: 6,
    laborFixedHrs: 60,
    costRangeUSD: { low: 1500, mid: 3500, high: 7000 },
    materials: [
      { label: 'Trail tread material (local)', unit: 'lot' },
      { label: 'Benches / wayfinding', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'quarterly',
      season: 'any',
      laborHrsPerOccurrence: 10,
      costUSDPerOccurrence: 90,
      notes: 'Clear and re-tread the loop, brush back encroachment, repair benches and signage.',
    },
    durationMonths: 4,
    maturityCurve: [{ yearOffset: 1, functionalPct: 100 }],
    criterionContributions: [
      // Trails make the quiet acres usable as sanctuary without building on
      // them — modest contribution to the undisturbed-habitat share.
      { criterionId: 'retreat-undisturbed-pct', contributionPerAcre: 1, appliesAtYearOffset: 1 },
      { criterionId: 'retreat-annual-guest-nights', contributionFixed: 150, appliesAtYearOffset: 2 },
    ],
    spatialFootprintAcres: { minimum: 0.1 },
    designLayer: 'earthworks',
    projectTypes: ['retreat'],
    sources: [
      {
        source:
          'Birchard, W., & Proudman, R. D. (2000). Appalachian Trail Design, Construction, and Maintenance (2nd ed.). Appalachian Trail Conference.',
        year: 2000,
        kind: 'practice-guide',
        note: 'Low-impact recreational trail standards.',
      },
    ],
    region: 'global',
  },

  {
    id: 'riparian-buffer-restoration',
    zoneAffinity: {
      preferredCategories: ['conservation', 'water_retention', 'buffer'],
      preferredGroundCover: ['wetland', 'sparse-grasses'],
      avoidedCategories: ['habitation', 'infrastructure'],
      permacultureRingRange: [3, 5],
    },
    geometryTemplate: 'edge-line',
    name: 'Riparian buffer restoration (sanctuary edge)',
    description:
      'Fence stock out of watercourses and replant a native woody buffer — ' +
      'cleans water, restores wildlife corridor, and enlarges the ' +
      'undisturbed sanctuary that defines the retreat.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborHrsPerAcre: 20,
    costRangeUSD: { low: 800, mid: 1800, high: 3600, perAcre: true },
    materials: [
      { label: 'Native riparian stock', quantityPerAcre: 300, unit: 'plants/acre' },
      { label: 'Exclusion fencing', unit: 'meters' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'spring',
      laborHrsPerOccurrence: 12,
      costUSDPerOccurrence: 180,
      materialsPerOccurrence: [{ label: 'Replacement stock', unit: 'lot' }],
      notes: 'Replace failed plantings, control bank weeds, maintain stock-exclusion fencing.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 2, functionalPct: 40 },
      { yearOffset: 5, functionalPct: 80 },
      { yearOffset: 8, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'retreat-undisturbed-pct', contributionPerAcre: 3, appliesAtYearOffset: 5 },
    ],
    spatialFootprintAcres: { minimum: 0.3 },
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
    projectTypes: ['retreat'],
    sources: [
      {
        source:
          'Bentrup, G. (2008). Conservation Buffers: Design Guidelines for Buffers, Corridors, and Greenways. USDA Forest Service, Gen. Tech. Rep. SRS-109.',
        year: 2008,
        kind: 'practice-guide',
        note: 'Riparian buffer width and species design.',
      },
    ],
    region: 'global',
  },

  {
    id: 'farm-stay-experience-program',
    zoneAffinity: {
      preferredCategories: ['habitation', 'commons'],
      permacultureRingRange: [0, 2],
    },
    geometryTemplate: 'centroid-point',
    name: 'Farm-stay experience & hosting program',
    description:
      'The operating layer that turns lodging + land into a retreat: ' +
      'booking, host scheduling, guided land experiences, and meal ' +
      'service — what actually fills guest-nights and seats guests at the ' +
      'on-farm table.',
    category: 'structures',
    yeomansPhase: 'buildings',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 300,
    costRangeUSD: { low: 3000, mid: 7000, high: 15000 },
    materials: [
      { label: 'Booking / hosting systems', unit: 'lot' },
      { label: 'Guest experience kit', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 40,
      costUSDPerOccurrence: 400,
      requiredPersonnel: { skillLevel: 'hospitality host', minCount: 1 },
      notes: 'Booking and guest communications, host rota, experience delivery and menu coordination each operating month.',
    },
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      // Activation/throughput layer on top of the lodging ceiling.
      { criterionId: 'retreat-annual-guest-nights', contributionFixed: 450, appliesAtYearOffset: 3 },
      { criterionId: 'retreat-food-pct', contributionFixed: 8, appliesAtYearOffset: 3 },
    ],
    designLayer: 'structures',
    projectTypes: ['retreat'],
    sources: [
      {
        source:
          'Barbieri, C., & Mshenga, P. M. (2008). "The role of the firm and owner characteristics on the performance of agritourism farms." Sociologia Ruralis, 48(2), 166-183.',
        year: 2008,
        kind: 'journal',
        note: 'Agritourism hosting as the throughput driver.',
      },
    ],
    region: 'global',
  },
];

/**
 * Educational-farm-dedicated interventions.
 *
 * Tagged `projectTypes: ['education']`. Criterion ids copied verbatim
 * from the `EDUCATIONAL_FARM` template (edu-annual-learners,
 * edu-apprentice-graduates, edu-demo-count, edu-program-usd).
 * Capacity-ceiling criteria (learners, graduates, demo count) use a
 * conservative `contributionFixed` derivation written into the citation
 * note — never a projected-demand figure. Prerequisites root on
 * `parcel-assessment`.
 */

import type { Intervention } from '../goalCompassTypes.js';

export const EDUCATION_INTERVENTIONS: Intervention[] = [
  {
    id: 'teaching-pavilion',
    zoneAffinity: {
      preferredCategories: ['infrastructure', 'commons', 'habitation'],
      permacultureRingRange: [0, 1],
    },
    geometryTemplate: 'bbox-rect',
    name: 'Open-air teaching pavilion',
    description:
      'A covered open-air pavilion with seating, demonstration bench, and ' +
      'weather protection — the physical capacity ceiling for hosting ' +
      'workshop cohorts and field-day groups on the farm.',
    category: 'structures',
    yeomansPhase: 'buildings',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 400,
    costRangeUSD: { low: 25000, mid: 55000, high: 110000 },
    materials: [
      { label: 'Timber frame + roof', unit: 'lot' },
      { label: 'Seating + demonstration bench', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'spring',
      laborHrsPerOccurrence: 30,
      costUSDPerOccurrence: 600,
      notes: 'Structure inspection, roof and seating servicing, demonstration-bench refresh ahead of the teaching season.',
    },
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 100 },
    ],
    criterionContributions: [
      // Conservative: 1 cohort venue × ~20 learners/session × ~6
      // sessions/yr ≈ 120 learners/yr at full ramp. Capacity ceiling,
      // not a demand projection.
      { criterionId: 'edu-annual-learners', contributionFixed: 120, appliesAtYearOffset: 1 },
    ],
    spatialFootprintAcres: { minimum: 0.2 },
    designLayer: 'structures',
    projectTypes: ['education'],
    sources: [
      {
        source:
          'Orr, D. W. (1992). Ecological Literacy: Education and the Transition to a Postmodern World. SUNY Press.',
        year: 1992,
        kind: 'book',
        note: 'Place-based experiential learning as the core pedagogy.',
      },
    ],
    region: 'global',
  },

  {
    id: 'apprentice-housing',
    zoneAffinity: {
      preferredCategories: ['habitation', 'infrastructure'],
      permacultureRingRange: [0, 1],
    },
    geometryTemplate: 'bbox-rect',
    name: 'Apprentice housing & live-in quarters',
    description:
      'Modest shared housing for season-long apprentices living on the ' +
      'farm — the residency capacity that gates how many can complete a ' +
      'full graduating apprenticeship.',
    category: 'structures',
    yeomansPhase: 'buildings',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 500,
    costRangeUSD: { low: 40000, mid: 90000, high: 180000 },
    materials: [
      { label: 'Bunkroom / cabin shells', unit: 'units' },
      { label: 'Shared bath + kitchen fit-out', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'winter',
      laborHrsPerOccurrence: 50,
      costUSDPerOccurrence: 1800,
      requiredPersonnel: { skillLevel: 'building trades (turnaround)', minCount: 1 },
      notes: 'Off-season envelope and utility servicing, furnishings refresh, code/inspection upkeep.',
    },
    durationMonths: 9,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 70 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      // Conservative: ~6 live-in beds → ~6 full-season apprentices able
      // to reach graduation per year. Residency ceiling.
      { criterionId: 'edu-apprentice-graduates', contributionFixed: 6, appliesAtYearOffset: 2 },
      { criterionId: 'edu-annual-learners', contributionFixed: 6, appliesAtYearOffset: 2 },
    ],
    spatialFootprintAcres: { minimum: 0.25 },
    designLayer: 'structures',
    projectTypes: ['education'],
    sources: [
      {
        source:
          'Macnamara, L. (2012). People & Permaculture: Caring and Designing for Ourselves, Each Other and the Planet. Permanent Publications.',
        year: 2012,
        kind: 'book',
        note: 'Residential apprenticeship as a skills-transfer structure.',
      },
    ],
    region: 'global',
  },

  {
    id: 'demonstration-systems-array',
    zoneAffinity: {
      preferredCategories: ['food_production', 'commons'],
      preferredSuccession: ['pioneer', 'mid'],
      permacultureRingRange: [1, 3],
    },
    geometryTemplate: 'bbox-rect',
    name: 'Demonstration systems array',
    description:
      'A curated set of side-by-side working systems (no-dig beds, food ' +
      'forest guilds, compost methods, water harvesting) laid out for ' +
      'comparison and teaching — the visible curriculum of the farm.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [{ kind: 'slopeMaxPct', value: 12 }],
    laborHrsPerAcre: 400,
    costRangeUSD: { low: 6000, mid: 12000, high: 22000, perAcre: true },
    materials: [
      { label: 'Bed + guild establishment kit', unit: 'lot' },
      { label: 'Interpretive signage set', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'quarterly',
      season: 'any',
      laborHrsPerOccurrence: 30,
      costUSDPerOccurrence: 250,
      notes: 'Keep each demonstration system legible and well-labeled across the seasons; refresh signage.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 50 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      // Conservative: ~5 distinct teachable systems per established acre.
      { criterionId: 'edu-demo-count', contributionPerAcre: 5, appliesAtYearOffset: 3 },
      { criterionId: 'edu-annual-learners', contributionFixed: 30, appliesAtYearOffset: 3 },
    ],
    spatialFootprintAcres: { minimum: 0.5 },
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
    projectTypes: ['education'],
    sources: [
      {
        source: 'Hemenway, T. (2009). Gaia\'s Garden: A Guide to Home-Scale Permaculture (2nd ed.). Chelsea Green.',
        year: 2009,
        kind: 'book',
        note: 'Source set for the demonstrable home-scale systems.',
      },
    ],
    region: 'global',
  },

  {
    id: 'market-garden-teaching-block',
    zoneAffinity: {
      preferredCategories: ['food_production'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses', 'thriving-grasses'],
      permacultureRingRange: [1, 2],
    },
    geometryTemplate: 'tile-strip',
    name: 'Market-garden teaching block',
    description:
      'A working intensive market garden run as a teaching enterprise — ' +
      'apprentices learn production by operating it, and bed sales seed ' +
      'program revenue.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [{ kind: 'slopeMaxPct', value: 6 }],
    laborHrsPerAcre: 1100,
    costRangeUSD: { low: 7000, mid: 13000, high: 22000, perAcre: true },
    materials: [
      { label: 'Drip + bed-prep kit', unit: 'lot' },
      { label: 'Seed + transplants (annual)', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 60,
      costUSDPerOccurrence: 260,
      materialsPerOccurrence: [{ label: 'Succession seed / amendment', unit: 'lot' }],
      notes: 'Succession sowing, irrigation servicing, harvest and post-harvest — run as the apprentice production curriculum.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 70 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'edu-demo-count', contributionFixed: 1, appliesAtYearOffset: 1 },
      { criterionId: 'edu-annual-learners', contributionFixed: 25, appliesAtYearOffset: 2 },
      { criterionId: 'edu-program-usd', contributionPerAcre: 15000, appliesAtYearOffset: 2 },
    ],
    spatialFootprintAcres: { minimum: 0.5 },
    designLayer: 'vegetation',
    projectTypes: ['education'],
    sources: [
      {
        source: 'Coleman, E. (2018). The New Organic Grower (3rd ed.). Chelsea Green.',
        year: 2018,
        kind: 'book',
        note: 'Production model run as the apprentice teaching enterprise.',
      },
    ],
    region: 'global',
  },

  {
    id: 'program-revenue-engine',
    zoneAffinity: {
      preferredCategories: ['commons', 'infrastructure', 'habitation'],
      permacultureRingRange: [0, 2],
    },
    geometryTemplate: 'centroid-point',
    name: 'Program & enrollment operating engine',
    description:
      'The operating layer that turns the teaching infrastructure into a ' +
      'funded program: course design, enrollment, scheduling, and tuition ' +
      'administration — what actually converts capacity into learners and ' +
      'program revenue.',
    category: 'structures',
    yeomansPhase: 'buildings',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 350,
    costRangeUSD: { low: 4000, mid: 9000, high: 18000 },
    materials: [
      { label: 'Enrollment / LMS systems', unit: 'lot' },
      { label: 'Curriculum + materials development', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 50,
      costUSDPerOccurrence: 500,
      requiredPersonnel: { skillLevel: 'program coordinator', minCount: 1 },
      notes: 'Course scheduling, enrollment and tuition administration, instructor coordination each operating month.',
    },
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      // Activation/throughput layer on top of the venue + housing ceilings.
      { criterionId: 'edu-annual-learners', contributionFixed: 80, appliesAtYearOffset: 3 },
      { criterionId: 'edu-program-usd', contributionFixed: 60000, appliesAtYearOffset: 3 },
    ],
    designLayer: 'structures',
    projectTypes: ['education'],
    sources: [
      {
        source:
          'Macnamara, L. (2012). People & Permaculture: Caring and Designing for Ourselves, Each Other and the Planet. Permanent Publications.',
        year: 2012,
        kind: 'book',
        note: 'Program design and delivery framework for land-based education.',
      },
    ],
    region: 'global',
  },

  {
    id: 'outdoor-classroom-loop',
    zoneAffinity: {
      preferredCategories: ['commons', 'conservation', 'buffer'],
      avoidedCategories: ['infrastructure'],
      permacultureRingRange: [2, 4],
    },
    geometryTemplate: 'contour-line',
    name: 'Outdoor classroom & field-station loop',
    description:
      'A walking loop of station stops (soil pit, water feature, habitat ' +
      'edge) that lets a cohort move through the working farm as a ' +
      'sequenced lesson without crowding any one system.',
    category: 'access',
    yeomansPhase: 'access',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborHrsPerAcre: 5,
    laborFixedHrs: 50,
    costRangeUSD: { low: 1200, mid: 3000, high: 6000 },
    materials: [
      { label: 'Trail tread + station hardstand', unit: 'lot' },
      { label: 'Field-station interpretive kit', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'quarterly',
      season: 'any',
      laborHrsPerOccurrence: 8,
      costUSDPerOccurrence: 70,
      notes: 'Clear the loop, maintain station hardstands and interpretive material between cohorts.',
    },
    durationMonths: 3,
    maturityCurve: [{ yearOffset: 1, functionalPct: 100 }],
    criterionContributions: [
      { criterionId: 'edu-demo-count', contributionFixed: 1, appliesAtYearOffset: 1 },
      { criterionId: 'edu-annual-learners', contributionFixed: 20, appliesAtYearOffset: 1 },
    ],
    spatialFootprintAcres: { minimum: 0.1 },
    designLayer: 'earthworks',
    projectTypes: ['education'],
    sources: [
      {
        source:
          'Orr, D. W. (1992). Ecological Literacy: Education and the Transition to a Postmodern World. SUNY Press.',
        year: 1992,
        kind: 'book',
        note: 'Landscape-as-curriculum field pedagogy.',
      },
    ],
    region: 'global',
  },
];

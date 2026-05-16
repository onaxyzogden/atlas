/**
 * Shared (universal) intervention catalog — the original homestead vertical
 * slice, moved verbatim from the former single-file `interventionCatalog.ts`
 * during the 2026-05-16 archetype-parity split.
 *
 * These 22 interventions carry **no** `projectTypes` tag ⇒ universal:
 * eligible under every archetype's sequencing run. Keeping them untagged is
 * the regression guarantee (no behavioural change vs. the pre-split catalog).
 *
 * Several of these also carry *additional* `criterionContributions` in
 * non-homestead vocabularies (regen-*, retreat-*, edu-*, cons-*, multi-*) so
 * a shared enterprise stays reachable under the archetypes it genuinely
 * serves — reachability by contribution, not by the tag.
 *
 * Each entry carries ≥1 full citation (Mollison, Yeomans, Crawford, Holzer,
 * Lancaster, Coleman, Smith, NRCS, OMAFRA). Schema discipline mirrors
 * `substitutionCatalog.ts`. Cost numbers are mid-2020s ranges drawn from
 * the regional cost files in `features/financial/engine/regionalCosts/`
 * with conservative variance bands.
 *
 * Region defaults to `'global'`; region-specific overrides land in v2.
 */

import type { Intervention } from '../goalCompassTypes.js';

export const SHARED_INTERVENTIONS: Intervention[] = [
  {
    id: 'parcel-assessment',
    name: 'Parcel assessment & base map',
    description:
      'Boundary walk, topo survey, soil sampling, water inventory, and ' +
      'hazard mapping. Foundation for every downstream intervention.',
    category: 'access',
    yeomansPhase: 'climate',
    prerequisites: [],
    siteRequirements: [],
    laborFixedHrs: 60,
    costRangeUSD: { low: 1500, mid: 3000, high: 6000 },
    materials: [
      { label: 'Soil-test kits (lab analysis)', quantityPerAcre: 0.2, unit: 'tests/acre' },
      { label: 'Survey flags / stakes', unit: 'lot' },
    ],
    durationMonths: 2,
    maturityCurve: [
      { yearOffset: 0, functionalPct: 100 },
    ],
    criterionContributions: [],
    sources: [
      {
        source: "Mollison, B. (1988). Permaculture: A Designer's Manual. Tagari Publications. ch. 3 (Methods of Design).",
        year: 1988,
        kind: 'book',
        note: 'Sector / zone analysis as the design baseline.',
      },
    ],
    region: 'global',
  },

  {
    id: 'keyline-access-track',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['access', 'food_production', 'livestock'],
      avoidedCategories: ['habitation', 'spiritual', 'commons', 'conservation'],
      permacultureRingRange: [2, 4],
    },
    geometryTemplate: 'contour-line',
    // — / —
    name: 'Keyline-graded access track',
    description:
      'Primary vehicular track sited along keyline contour. Sheds water ' +
      'laterally into swales rather than concentrating runoff. Enables ' +
      'equipment access to all subsequent earthworks.',
    category: 'access',
    yeomansPhase: 'access',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [
      { kind: 'slopeMinPct', value: 2 },
      { kind: 'slopeMaxPct', value: 25 },
    ],
    laborHrsPerAcre: 8,
    costRangeUSD: { low: 1200, mid: 2400, high: 4500, perAcre: true },
    materials: [
      { label: 'Crushed rock (wear strips at gates only)', unit: 'tons' },
      { label: 'Native grass seed mix', quantityPerAcre: 15, unit: 'lbs/acre' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'fall',
      laborHrsPerOccurrence: 6,
      costUSDPerOccurrence: 180,
      materialsPerOccurrence: [
        { label: 'Wear-strip rock top-up', unit: 'tons' },
        { label: 'Spot-reseed mix', unit: 'lbs' },
      ],
      equipmentRequired: ['tractor + grader blade'],
      notes: 'Regrade the keyline crown, clear culverts/road swales before the wet season, reseed scoured wear strips.',
    },
    durationMonths: 3,
    maturityCurve: [
      { yearOffset: 0, functionalPct: 80 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [],
    designLayer: 'earthworks',
    sources: [
      {
        source: 'Yeomans, P. A. (1973, rev. 1981). Water for Every Farm: The Yeomans Keyline Plan. Murray Books.',
        year: 1981,
        kind: 'book',
        note: 'Keyline grading principle for vehicular tracks.',
      },
      {
        source: "Mollison, B. (1988). Permaculture: A Designer's Manual. Tagari Publications. ch. 7 (Water).",
        year: 1988,
        kind: 'book',
        note: '"Every road is a swale."',
      },
    ],
    region: 'global',
  },

  {
    id: 'swale-system',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['food_production', 'conservation', 'water_retention', 'livestock'],
      avoidedCategories: ['habitation', 'spiritual', 'infrastructure'],
      permacultureRingRange: [2, 5],
    },
    geometryTemplate: 'contour-line',
    // — / —
    name: 'Contour swale system',
    description:
      'Level-bottom infiltration ditches on contour spaced at 1.5-3× the ' +
      'effective rooting depth of the planned tree crop. Captures sheet ' +
      'flow, drives water into the soil profile, terminates erosion.',
    category: 'water',
    yeomansPhase: 'water',
    prerequisites: ['parcel-assessment', 'keyline-access-track'],
    siteRequirements: [
      { kind: 'slopeMinPct', value: 2 },
      { kind: 'slopeMaxPct', value: 18 },
    ],
    laborHrsPerAcre: 12,
    costRangeUSD: { low: 800, mid: 1600, high: 3200, perAcre: true },
    materials: [
      { label: 'Excavator hire (per acre)', unit: 'hours' },
      { label: 'Cover-crop seed for berm', quantityPerAcre: 20, unit: 'lbs/acre' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'fall',
      laborHrsPerOccurrence: 8,
      costUSDPerOccurrence: 220,
      materialsPerOccurrence: [
        { label: 'Berm cover-crop reseed', unit: 'lbs' },
      ],
      equipmentRequired: ['mini-excavator (periodic desilt)'],
      notes: 'Desilt the level-bottom channel, repair overflow ends, re-vegetate the berm; full machine desilt roughly every 3rd year.',
    },
    durationMonths: 4,
    maturityCurve: [
      { yearOffset: 0, functionalPct: 70 },
      { yearOffset: 1, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'water-self-sufficient-pct', contributionPerAcre: 4, appliesAtYearOffset: 1 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 2, appliesAtYearOffset: 1 },
      // Regenerative-farm vocabulary: a swale's infiltration directly serves
      // the regen water-infiltration goal (reachability, not a tag).
      { criterionId: 'regen-water-infiltration', contributionPerAcre: 3, appliesAtYearOffset: 1 },
      { criterionId: 'regen-soil-cover', contributionPerAcre: 2, appliesAtYearOffset: 1 },
      // Conservation: stabilised, vegetated swale berms add riparian-style cover.
      { criterionId: 'cons-riparian-cover-pct', contributionPerAcre: 1.5, appliesAtYearOffset: 2 },
    ],
    spatialFootprintAcres: { fractionOfParcel: 0.05 },
    seasonConstraints: ['summer', 'fall'],
    designLayer: 'water',
    sources: [
      {
        source: 'Lancaster, B. (2008). Rainwater Harvesting for Drylands and Beyond, Vol. 2: Water-Harvesting Earthworks. Rainsource Press.',
        year: 2008,
        kind: 'book',
        note: 'Swale spacing, sizing, and overflow.',
      },
      {
        source: "Mollison, B. (1988). Permaculture: A Designer's Manual. Tagari Publications. ch. 7 (Water).",
        year: 1988,
        kind: 'book',
      },
    ],
    region: 'global',
  },

  {
    id: 'earthen-pond',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['water_retention', 'conservation'],
      preferredGroundCover: ['wetland', 'bare-soil', 'sparse-grasses'],
      avoidedCategories: ['habitation', 'spiritual', 'infrastructure', 'access'],
      permacultureRingRange: [2, 5],
    },
    geometryTemplate: 'fill-polygon',
    // — / —
    name: 'Earthen pond (keyline-sited)',
    description:
      'Clay-lined or gleyed earthen reservoir at a keypoint, fed by ' +
      'roof-catchment piping and uphill swale overflow. Storage + ' +
      'aquaculture potential.',
    category: 'water',
    yeomansPhase: 'water',
    prerequisites: ['parcel-assessment', 'swale-system'],
    siteRequirements: [
      { kind: 'minAcres', value: 3 },
    ],
    laborFixedHrs: 80,
    costRangeUSD: { low: 6000, mid: 14000, high: 28000 },
    materials: [
      { label: 'Excavator hire', unit: 'hours' },
      { label: 'Bentonite or gley layer', unit: 'lot' },
      { label: 'Overflow culvert', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'fall',
      laborHrsPerOccurrence: 6,
      costUSDPerOccurrence: 250,
      equipmentRequired: ['excavator (periodic desilt only)'],
      notes: 'Inspect spillway/overflow culvert and dam wall for seepage or burrows; mechanical desilt is occasional, not yearly.',
    },
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 0, functionalPct: 60 },
      { yearOffset: 1, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'water-storage-gal', contributionFixed: 120000, appliesAtYearOffset: 1 },
      { criterionId: 'water-self-sufficient-pct', contributionFixed: 25, appliesAtYearOffset: 2 },
      // Regenerative-farm: stored water buffers a regen rotation's dry spells.
      { criterionId: 'regen-water-infiltration', contributionFixed: 8, appliesAtYearOffset: 2 },
      // Conservation: a managed pond becomes indicator-species habitat.
      { criterionId: 'cons-indicator-species-count', contributionFixed: 3, appliesAtYearOffset: 3 },
    ],
    spatialFootprintAcres: { minimum: 0.25 },
    seasonConstraints: ['summer', 'fall'],
    designLayer: 'water',
    sources: [
      {
        source: "Mollison, B. (1988). Permaculture: A Designer's Manual. Tagari Publications. ch. 7 (Water).",
        year: 1988,
        kind: 'book',
        note: 'Pond siting, gleying, aquaculture integration.',
      },
      {
        source: 'USDA NRCS Conservation Practice Standard 378: Pond. Natural Resources Conservation Service.',
        year: 2018,
        kind: 'standard',
        note: 'Federal pond construction spec.',
      },
    ],
    region: 'global',
  },

  {
    id: 'roof-catchment-tanks',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['habitation', 'infrastructure'],
      permacultureRingRange: [0, 1],
    },
    geometryTemplate: 'centroid-point',
    // — / —
    name: 'Roof catchment + storage tanks',
    description:
      'Gutter-fed first-flush diverters into food-grade poly tanks ' +
      '(2-10k gal). Supplies domestic + critical garden irrigation. ' +
      'Independent of pond storage.',
    category: 'water',
    yeomansPhase: 'water',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 40,
    costRangeUSD: { low: 3500, mid: 7500, high: 16000 },
    materials: [
      { label: 'Poly tanks (food-grade)', unit: 'units' },
      { label: 'First-flush diverter assemblies', unit: 'units' },
      { label: 'Gutters / downspouts', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'quarterly',
      season: 'any',
      laborHrsPerOccurrence: 3,
      costUSDPerOccurrence: 40,
      notes: 'Clear gutters and leaf screens, flush and reset first-flush diverters, inspect tank inlets and overflow for mosquito-proofing.',
    },
    durationMonths: 2,
    maturityCurve: [
      { yearOffset: 0, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'water-storage-gal', contributionFixed: 25000, appliesAtYearOffset: 0 },
    ],
    designLayer: 'water',
    sources: [
      {
        source: 'Lancaster, B. (2007). Rainwater Harvesting for Drylands and Beyond, Vol. 1: Guiding Principles. Rainsource Press.',
        year: 2007,
        kind: 'book',
      },
    ],
    region: 'global',
  },

  {
    id: 'cover-crop-rebuild',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['food_production', 'livestock'],
      preferredGroundCover: ['bare-soil', 'barren', 'sparse-grasses'],
      preferredSuccession: ['disturbed', 'pioneer'],
      avoidedCategories: ['habitation', 'spiritual', 'infrastructure', 'conservation'],
    },
    geometryTemplate: 'fill-polygon',
    // — / —
    name: 'Cover-crop soil rebuild rotation',
    description:
      'Multi-species cover-crop sequence (legume + brassica + grass) for ' +
      '2-3 seasons on the worst-compacted blocks. Roots break compaction, ' +
      'biomass feeds biology, N is fixed for the first cash rotation.',
    category: 'soil',
    yeomansPhase: 'soil',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [
      { kind: 'soilCompaction', values: ['med', 'high'] },
    ],
    laborHrsPerAcre: 6,
    costRangeUSD: { low: 120, mid: 220, high: 380, perAcre: true },
    materials: [
      { label: 'Cover-crop seed mix', quantityPerAcre: 40, unit: 'lbs/acre' },
    ],
    maintenanceSchedule: {
      frequency: 'quarterly',
      season: 'any',
      laborHrsPerOccurrence: 4,
      costUSDPerOccurrence: 60,
      materialsPerOccurrence: [
        { label: 'Successive cover-crop seed', unit: 'lbs' },
      ],
      equipmentRequired: ['no-till drill / roller-crimper'],
      notes: 'Recurring during the 2-3 season rebuild only: terminate the standing mix and drill the next species sequence each window.',
    },
    durationMonths: 24,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 40 },
      { yearOffset: 2, functionalPct: 80 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'soil-om-pct', contributionPerAcre: 0.15, appliesAtYearOffset: 3 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 8, appliesAtYearOffset: 1 },
      // Regenerative-farm: cover cropping is the spine of regen soil rebuild.
      { criterionId: 'regen-soil-om', contributionPerAcre: 0.15, appliesAtYearOffset: 3 },
      { criterionId: 'regen-soil-cover', contributionPerAcre: 8, appliesAtYearOffset: 1 },
      { criterionId: 'regen-water-infiltration', contributionPerAcre: 2, appliesAtYearOffset: 2 },
    ],
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
    sources: [
      {
        source: 'Drinkwater, L. E., Wagoner, P., & Sarrantonio, M. (1998). "Legume-based cropping systems have reduced carbon and nitrogen losses." Nature, 396, 262-265.',
        year: 1998,
        kind: 'journal',
      },
      {
        source: 'Bowles, T. M., et al. (2017). "Long-term evidence shows that crop-rotation diversification increases agricultural resilience to adverse growing conditions in North America." Agronomy Journal, 109(4), 1359-1372.',
        year: 2017,
        kind: 'journal',
      },
    ],
    region: 'global',
  },

  {
    id: 'compost-system',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['infrastructure', 'food_production'],
      permacultureRingRange: [1, 2],
    },
    geometryTemplate: 'centroid-point',
    // — / —
    name: 'On-site composting system',
    description:
      'Three-bay hot-compost system + worm-castings shed. Processes ' +
      'manures, kitchen scraps, and chop-and-drop biomass into finished ' +
      'amendment for kitchen garden and orchard.',
    category: 'soil',
    yeomansPhase: 'soil',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborHrsPerAcre: 0,
    laborFixedHrs: 30,
    costRangeUSD: { low: 600, mid: 1400, high: 2800 },
    materials: [
      { label: 'Untreated lumber for bays', unit: 'lot' },
      { label: 'Hardware cloth / aeration tubing', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 6,
      costUSDPerOccurrence: 20,
      equipmentRequired: ['front loader or compost fork', 'thermometer'],
      notes: 'Turn active piles on temperature, balance C:N and moisture, rotate finished bays out; replace failed bay boards as needed.',
    },
    durationMonths: 1,
    maturityCurve: [
      { yearOffset: 0, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'soil-om-pct', contributionFixed: 0.2, appliesAtYearOffset: 3 },
      // Regenerative-farm: on-farm compost feeds the regen soil OM goal.
      { criterionId: 'regen-soil-om', contributionFixed: 0.2, appliesAtYearOffset: 3 },
    ],
    sources: [
      {
        source: 'Coleman, E. (2018). The New Organic Grower (3rd ed.). Chelsea Green.',
        year: 2018,
        kind: 'book',
      },
    ],
    region: 'global',
  },

  {
    id: 'kitchen-garden',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['food_production', 'habitation'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses', 'thriving-grasses'],
      avoidedCategories: ['conservation', 'water_retention', 'spiritual'],
      permacultureRingRange: [1, 1],
    },
    geometryTemplate: 'bbox-rect',
    // — / —
    name: 'Intensive kitchen garden (Zone 1)',
    description:
      'Bio-intensive market-style beds within 30 m of the kitchen door. ' +
      'Year-round salad greens, brassicas, alliums, herbs, and small fruit. ' +
      'Drip irrigation off the roof-catchment tanks.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['cover-crop-rebuild', 'roof-catchment-tanks', 'compost-system'],
    siteRequirements: [
      { kind: 'slopeMaxPct', value: 8 },
    ],
    laborHrsPerAcre: 1200,
    costRangeUSD: { low: 4000, mid: 8000, high: 14000, perAcre: true },
    materials: [
      { label: 'Drip-irrigation kit', unit: 'lot' },
      { label: 'Seed (annual)', unit: 'lot' },
      { label: 'Wood-chip mulch', quantityPerAcre: 30, unit: 'yards' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 24,
      costUSDPerOccurrence: 120,
      materialsPerOccurrence: [
        { label: 'Succession seed / transplants', unit: 'lot' },
        { label: 'Compost + mulch top-up', unit: 'yards' },
      ],
      notes: 'Bed flips and successive sowing, drip-line servicing, mulch and compost top-up, pest/disease scouting through the growing months.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 70 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'food-sov-calories-pct', contributionPerAcre: 18, appliesAtYearOffset: 2 },
      { criterionId: 'food-sov-protein-pct', contributionPerAcre: 6, appliesAtYearOffset: 2 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 1.5, appliesAtYearOffset: 1 },
      { criterionId: 'income-streams-count', contributionFixed: 1, appliesAtYearOffset: 3 },
      // Retreat: a kitchen garden supplies the guest table.
      { criterionId: 'retreat-food-pct', contributionPerAcre: 12, appliesAtYearOffset: 2 },
    ],
    spatialFootprintAcres: { perPerson: 0.05, minimum: 0.15 },
    designLayer: 'vegetation',
    sources: [
      {
        source: 'Coleman, E. (2018). The New Organic Grower (3rd ed.). Chelsea Green.',
        year: 2018,
        kind: 'book',
      },
      {
        source: 'Jeavons, J. (2017). How to Grow More Vegetables (9th ed.). Ten Speed Press.',
        year: 2017,
        kind: 'book',
        note: 'Bio-intensive yield calibration per square foot.',
      },
    ],
    region: 'global',
  },

  {
    id: 'food-forest',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['food_production', 'commons'],
      preferredSuccession: ['pioneer', 'mid'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses', 'thriving-grasses'],
      avoidedCategories: ['habitation', 'spiritual', 'infrastructure', 'water_retention'],
      permacultureRingRange: [2, 3],
    },
    geometryTemplate: 'fill-polygon',
    // — / —
    name: 'Seven-layer food forest (Zone 2)',
    description:
      'Multi-layer perennial polyculture: canopy nut/fruit, sub-canopy ' +
      'fruit, shrub berry, herbaceous, root, vine, groundcover. Sited on ' +
      'swale berms downhill of the kitchen garden.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['swale-system', 'cover-crop-rebuild'],
    siteRequirements: [
      { kind: 'slopeMaxPct', value: 20 },
    ],
    laborHrsPerAcre: 240,
    costRangeUSD: { low: 5000, mid: 10000, high: 22000, perAcre: true },
    materials: [
      { label: 'Bare-root trees + shrubs', quantityPerAcre: 250, unit: 'plants/acre' },
      { label: 'Wood-chip mulch', quantityPerAcre: 80, unit: 'yards' },
      { label: 'Tree guards / stakes', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'winter',
      laborHrsPerOccurrence: 40,
      costUSDPerOccurrence: 350,
      materialsPerOccurrence: [
        { label: 'Mulch renewal', unit: 'yards' },
        { label: 'Replacement whips (gap-fill)', unit: 'plants' },
      ],
      equipmentRequired: ['pruning saw / loppers'],
      notes: 'Formative and maintenance pruning, mulch renewal, guild weeding, gap replanting and guard checks; heaviest in the establishment decade.',
    },
    durationMonths: 36,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 10 },
      { yearOffset: 3, functionalPct: 35 },
      { yearOffset: 5, functionalPct: 65 },
      { yearOffset: 7, functionalPct: 90 },
      { yearOffset: 10, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'food-sov-calories-pct', contributionPerAcre: 12, appliesAtYearOffset: 7 },
      { criterionId: 'food-sov-fruit-lbs', contributionPerAcre: 400, appliesAtYearOffset: 10 },
      { criterionId: 'soil-om-pct', contributionPerAcre: 0.3, appliesAtYearOffset: 10 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 4, appliesAtYearOffset: 3 },
      { criterionId: 'income-streams-count', contributionFixed: 1, appliesAtYearOffset: 7 },
      // Retreat: a forest garden yields guest fruit and undisturbed canopy.
      { criterionId: 'retreat-fruit-lbs', contributionPerAcre: 400, appliesAtYearOffset: 10 },
      { criterionId: 'retreat-undisturbed-pct', contributionPerAcre: 2, appliesAtYearOffset: 5 },
      // Conservation: a perennial polyculture lifts native-style cover.
      { criterionId: 'cons-native-cover-pct', contributionPerAcre: 2, appliesAtYearOffset: 7 },
    ],
    spatialFootprintAcres: { perPerson: 0.1, minimum: 0.5 },
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
    sources: [
      {
        source: 'Crawford, M. (2010). Creating a Forest Garden: Working with Nature to Grow Edible Crops. Green Books.',
        year: 2010,
        kind: 'book',
        note: 'Seven-layer architecture and species selection.',
      },
      {
        source: 'Jacke, D., & Toensmeier, E. (2005). Edible Forest Gardens, Vols. 1-2. Chelsea Green.',
        year: 2005,
        kind: 'book',
      },
    ],
    region: 'global',
  },

  {
    id: 'poultry-coop',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['livestock', 'food_production'],
      avoidedCategories: ['habitation', 'spiritual', 'conservation'],
      permacultureRingRange: [2, 2],
    },
    geometryTemplate: 'centroid-point',
    // — / —
    name: 'Pastured poultry (laying flock)',
    description:
      'Mobile coop + electric netting for a 25-bird laying flock rotated ' +
      'through Zone 2 orchard cells. Eggs + pest reduction + manure.',
    category: 'livestock',
    yeomansPhase: 'subdivision',
    prerequisites: ['food-forest'],
    siteRequirements: [],
    laborHrsPerAcre: 0,
    laborFixedHrs: 260,
    costRangeUSD: { low: 1800, mid: 3500, high: 6000 },
    materials: [
      { label: 'Mobile coop', unit: 'unit' },
      { label: 'Electric poultry netting', unit: 'lot' },
      { label: 'Chicks + feed (Year 1)', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 16,
      costUSDPerOccurrence: 220,
      materialsPerOccurrence: [
        { label: 'Supplemental feed + bedding', unit: 'lot' },
      ],
      equipmentRequired: ['fence energizer'],
      notes: 'Coop moves and sanitation, netting relocation each rotation, feed/water/grit, predator and energizer checks; flock replacement folded in annually.',
    },
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 80 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'food-sov-protein-pct', contributionFixed: 18, appliesAtYearOffset: 2 },
      { criterionId: 'income-streams-count', contributionFixed: 1, appliesAtYearOffset: 2 },
      { criterionId: 'income-surplus-usd', contributionFixed: 2200, appliesAtYearOffset: 3 },
      { criterionId: 'livestock-paddocks-active-count', contributionFixed: 4, appliesAtYearOffset: 2 },
      { criterionId: 'livestock-protein-lbs', contributionFixed: 300, appliesAtYearOffset: 2 },
      { criterionId: 'livestock-revenue-usd', contributionFixed: 2200, appliesAtYearOffset: 3 },
    ],
    designLayer: 'structures',
    sources: [
      {
        source: 'Salatin, J. (1996). Pastured Poultry Profit$. Polyface.',
        year: 1996,
        kind: 'book',
      },
    ],
    region: 'global',
  },

  {
    id: 'small-ruminant-paddock',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['livestock'],
      preferredGroundCover: ['thriving-grasses', 'sparse-grasses'],
      preferredSuccession: ['pioneer', 'mid'],
      avoidedCategories: ['conservation', 'habitation', 'spiritual', 'water_retention'],
      permacultureRingRange: [3, 4],
    },
    geometryTemplate: 'tile-strip',
    // — / —
    name: 'Adaptive multi-paddock small ruminants',
    description:
      'Sheep or goats on planned rotational grazing across 8-12 paddocks ' +
      'with permanent perimeter + portable electric subdivision. Meat, ' +
      'dairy optional, brush control.',
    category: 'livestock',
    yeomansPhase: 'subdivision',
    prerequisites: ['cover-crop-rebuild', 'keyline-access-track'],
    siteRequirements: [
      { kind: 'minAcres', value: 6 },
      { kind: 'slopeMaxPct', value: 25 },
    ],
    laborHrsPerAcre: 24,
    costRangeUSD: { low: 1500, mid: 3000, high: 5500, perAcre: true },
    materials: [
      { label: 'Permanent perimeter fencing', unit: 'meters' },
      { label: 'Portable electric netting', unit: 'lot' },
      { label: 'Water lines / portable troughs', unit: 'lot' },
      { label: 'Starter flock (8-12 head)', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'quarterly',
      season: 'any',
      laborHrsPerOccurrence: 30,
      costUSDPerOccurrence: 260,
      requiredPersonnel: { skillLevel: 'veterinary (annual visit)', minCount: 1 },
      materialsPerOccurrence: [
        { label: 'Mineral / health supplies', unit: 'lot' },
      ],
      equipmentRequired: ['fence energizer tester'],
      notes: 'Perimeter + portable fence and energizer checks, water-system service, hoof/parasite and body-condition rounds, grazing-chart updates.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'food-sov-protein-pct', contributionPerAcre: 4, appliesAtYearOffset: 3 },
      { criterionId: 'income-streams-count', contributionFixed: 1, appliesAtYearOffset: 3 },
      { criterionId: 'income-surplus-usd', contributionPerAcre: 350, appliesAtYearOffset: 5 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 3, appliesAtYearOffset: 2 },
      { criterionId: 'livestock-paddocks-active-count', contributionFixed: 10, appliesAtYearOffset: 2 },
      { criterionId: 'livestock-protein-lbs', contributionPerAcre: 50, appliesAtYearOffset: 3 },
      { criterionId: 'livestock-revenue-usd', contributionPerAcre: 350, appliesAtYearOffset: 5 },
      { criterionId: 'livestock-welfare-pass-pct', contributionFixed: 20, appliesAtYearOffset: 3 },
    ],
    spatialFootprintAcres: { minimum: 4 },
    designLayer: 'structures',
    sources: [
      {
        source: 'Savory, A., & Butterfield, J. (2016). Holistic Management (3rd ed.). Island Press.',
        year: 2016,
        kind: 'book',
        note: 'AMP / planned grazing principles.',
      },
      {
        source: 'Smith, B. (1997). A Veterinary Guide for Animal Owners. Storey Publishing.',
        year: 1997,
        kind: 'practice-guide',
      },
    ],
    region: 'global',
  },

  {
    id: 'permanent-perimeter-fence',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['livestock'],
    },
    geometryTemplate: 'edge-line',
    // — / —
    name: 'Permanent perimeter fence',
    description:
      'Sound, livestock-grade perimeter (high-tensile woven wire or 5-strand ' +
      'electric) around the grazing land. Enables every downstream rotational ' +
      'grazing, water, and shelter intervention.',
    category: 'access',
    yeomansPhase: 'access',
    prerequisites: [],
    siteRequirements: [{ kind: 'minAcres', value: 5 }],
    laborHrsPerAcre: 4,
    costRangeUSD: { low: 800, mid: 1400, high: 2200, perAcre: true },
    materials: [
      { label: 'High-tensile woven wire', unit: 'meters' },
      { label: 'Wood / steel posts', unit: 'lot' },
      { label: 'Gates + bracing', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'fall',
      laborHrsPerOccurrence: 8,
      costUSDPerOccurrence: 180,
      materialsPerOccurrence: [
        { label: 'Wire / staple / post repair stock', unit: 'lot' },
      ],
      notes: 'Walk the line, retension wire, reset heaved posts, repair gates and brace assemblies before stocking each season.',
    },
    durationMonths: 3,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 100 },
    ],
    criterionContributions: [],
    designLayer: 'structures',
    sources: [
      {
        source: 'USDA NRCS (2017). Conservation Practice Standard 382: Fence.',
        year: 2017,
        kind: 'practice-guide',
      },
    ],
    region: 'global',
  },

  {
    id: 'cattle-rotational-grazing',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['livestock'],
      preferredGroundCover: ['thriving-grasses', 'sparse-grasses'],
      preferredSuccession: ['mid', 'pioneer'],
      avoidedCategories: ['conservation', 'habitation', 'spiritual', 'water_retention'],
      permacultureRingRange: [3, 4],
    },
    geometryTemplate: 'tile-strip',
    // — / —
    name: 'Adaptive multi-paddock cattle grazing',
    description:
      'AMP grazing for a starter cattle herd across 10+ paddocks with mobile ' +
      'electric subdivision over a sound perimeter. Long rest periods rebuild ' +
      'pasture; short, dense grazes drive soil biology.',
    category: 'livestock',
    yeomansPhase: 'subdivision',
    prerequisites: ['permanent-perimeter-fence', 'cover-crop-rebuild', 'keyline-access-track'],
    siteRequirements: [
      { kind: 'minAcres', value: 20 },
      { kind: 'slopeMaxPct', value: 20 },
    ],
    laborHrsPerAcre: 18,
    costRangeUSD: { low: 2500, mid: 4500, high: 7500, perAcre: true },
    materials: [
      { label: 'Portable electric subdivision', unit: 'lot' },
      { label: 'Energizer + grounding', unit: 'unit' },
      { label: 'Portable water troughs', unit: 'lot' },
      { label: 'Starter herd (cow-calf pairs)', unit: 'head' },
    ],
    maintenanceSchedule: {
      frequency: 'quarterly',
      season: 'any',
      laborHrsPerOccurrence: 24,
      costUSDPerOccurrence: 320,
      requiredPersonnel: { skillLevel: 'veterinary (annual visit)', minCount: 1 },
      materialsPerOccurrence: [
        { label: 'Mineral + animal-health supplies', unit: 'lot' },
      ],
      equipmentRequired: ['ATV / UTV', 'fence energizer tester'],
      notes: 'Audit subdivision moves, test energizer and grounding, service water network, herd health and body-condition rounds, update the grazing chart.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 50 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'livestock-paddocks-active-count', contributionFixed: 10, appliesAtYearOffset: 2 },
      { criterionId: 'livestock-protein-lbs', contributionPerAcre: 80, appliesAtYearOffset: 3 },
      { criterionId: 'livestock-revenue-usd', contributionPerAcre: 450, appliesAtYearOffset: 4 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 4, appliesAtYearOffset: 3 },
      // Regenerative-farm: AMP grazing is a core regen soil + revenue lever.
      { criterionId: 'regen-soil-cover', contributionPerAcre: 4, appliesAtYearOffset: 3 },
      { criterionId: 'regen-soil-om', contributionPerAcre: 0.1, appliesAtYearOffset: 5 },
      { criterionId: 'regen-revenue-per-acre', contributionPerAcre: 450, appliesAtYearOffset: 4 },
    ],
    spatialFootprintAcres: { minimum: 20 },
    designLayer: 'structures',
    sources: [
      {
        source: 'Savory, A., & Butterfield, J. (2016). Holistic Management (3rd ed.). Island Press.',
        year: 2016,
        kind: 'book',
        note: 'AMP / planned grazing for large ruminants.',
      },
      {
        source: 'Gerrish, J. (2004). Management-intensive Grazing. Green Park Press.',
        year: 2004,
        kind: 'book',
      },
    ],
    region: 'global',
  },

  {
    id: 'paddock-water-network',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['livestock'],
    },
    geometryTemplate: 'centroid-point',
    // — / —
    name: 'Paddock water network',
    description:
      'Tanks, buried supply lines, and portable troughs sized so every paddock ' +
      'centroid sits within 100 m of a placed water source — directly satisfying ' +
      'the welfare access audit water rule.',
    category: 'water',
    yeomansPhase: 'water',
    prerequisites: ['permanent-perimeter-fence'],
    siteRequirements: [{ kind: 'minAcres', value: 5 }],
    laborHrsPerAcre: 6,
    costRangeUSD: { low: 600, mid: 1200, high: 2000, perAcre: true },
    materials: [
      { label: 'Storage tank(s)', unit: 'unit' },
      { label: 'Buried HDPE supply line', unit: 'meters' },
      { label: 'Portable troughs + quick-couplers', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'quarterly',
      season: 'any',
      laborHrsPerOccurrence: 6,
      costUSDPerOccurrence: 90,
      notes: 'Pressure-check lines and couplers, clean troughs and float valves, then drain and winterize exposed runs ahead of hard frost.',
    },
    durationMonths: 4,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'livestock-welfare-pass-pct', contributionFixed: 70, appliesAtYearOffset: 1 },
      { criterionId: 'water-self-sufficient-pct', contributionPerAcre: 2, appliesAtYearOffset: 1 },
    ],
    designLayer: 'water',
    sources: [
      {
        source: 'USDA NRCS (2020). Conservation Practice Standard 614: Watering Facility.',
        year: 2020,
        kind: 'practice-guide',
      },
    ],
    region: 'global',
  },

  {
    id: 'livestock-shelter-windbreak',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['livestock', 'buffer'],
    },
    geometryTemplate: 'edge-line',
    // — / —
    name: 'Livestock shelter & windbreak',
    description:
      'Multi-row shelterbelt on prevailing-wind edges plus portable shade ' +
      'tarps for hot-season cells. Closes the shelter portion of the welfare ' +
      'access audit and lifts living ground cover.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['permanent-perimeter-fence'],
    siteRequirements: [],
    laborHrsPerAcre: 8,
    laborFixedHrs: 80,
    costRangeUSD: { low: 1200, mid: 2400, high: 4000 },
    materials: [
      { label: 'Shelterbelt tree stock', unit: 'lot' },
      { label: 'Portable shade tarps + frames', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'spring',
      laborHrsPerOccurrence: 8,
      costUSDPerOccurrence: 200,
      materialsPerOccurrence: [
        { label: 'Replacement shelterbelt stock', unit: 'lot' },
      ],
      notes: 'Replace failed shelterbelt whips, weed and water young rows to establishment, repair shade tarps and frames before hot season.',
    },
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'livestock-welfare-pass-pct', contributionFixed: 25, appliesAtYearOffset: 2 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 1, appliesAtYearOffset: 3 },
    ],
    designLayer: 'vegetation',
    sources: [
      {
        source: 'USDA NRCS (2018). Conservation Practice Standard 380: Windbreak/Shelterbelt Establishment.',
        year: 2018,
        kind: 'practice-guide',
      },
    ],
    region: 'global',
  },

  {
    id: 'pasture-renovation-overseed',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['livestock'],
      preferredGroundCover: ['sparse-grasses', 'thriving-grasses', 'bare-soil'],
      preferredSuccession: ['disturbed', 'pioneer'],
      avoidedCategories: ['conservation', 'habitation', 'spiritual'],
    },
    geometryTemplate: 'fill-polygon',
    // — / —
    name: 'Pasture renovation & diverse overseed',
    description:
      'Frost-seed or no-till drill a diverse forage mix (legumes + cool/warm ' +
      'season grasses + forbs) to lift pasture quality from fair to good, ' +
      'raising stocking density and protein output.',
    category: 'vegetation',
    yeomansPhase: 'soil',
    prerequisites: ['cover-crop-rebuild'],
    siteRequirements: [{ kind: 'slopeMaxPct', value: 25 }],
    laborHrsPerAcre: 3,
    costRangeUSD: { low: 120, mid: 220, high: 400, perAcre: true },
    materials: [
      { label: 'Diverse forage seed mix', unit: 'lbs' },
      { label: 'No-till drill rental / frost-seed pass', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'biennial',
      season: 'spring',
      laborHrsPerOccurrence: 3,
      costUSDPerOccurrence: 90,
      materialsPerOccurrence: [
        { label: 'Spot-overseed forage mix', unit: 'lbs' },
      ],
      equipmentRequired: ['no-till drill / frost-seed spreader'],
      notes: 'Frost-seed or drill thin and bare patches every other year to hold sward diversity and density.',
    },
    durationMonths: 2,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 70 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'livestock-protein-lbs', contributionPerAcre: 40, appliesAtYearOffset: 2 },
      { criterionId: 'livestock-revenue-usd', contributionPerAcre: 180, appliesAtYearOffset: 3 },
      // Regenerative-farm: diverse forage lifts regen soil cover + per-acre revenue.
      { criterionId: 'regen-soil-cover', contributionPerAcre: 5, appliesAtYearOffset: 1 },
      { criterionId: 'regen-revenue-per-acre', contributionPerAcre: 180, appliesAtYearOffset: 3 },
    ],
    designLayer: 'vegetation',
    sources: [
      {
        source: 'Sanderson, M. A., et al. (2007). "Plant species diversity influences on forage production and performance of dairy cattle on pasture." Crop Science, 47(5).',
        year: 2007,
        kind: 'journal',
      },
    ],
    region: 'global',
  },

  {
    id: 'coppice-woodlot',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['conservation', 'commons', 'buffer', 'food_production'],
      preferredSuccession: ['pioneer', 'mid'],
      avoidedCategories: ['habitation', 'spiritual', 'infrastructure', 'water_retention'],
      permacultureRingRange: [3, 5],
    },
    geometryTemplate: 'fill-polygon',
    // — / —
    name: 'Coppice + woodlot for cordwood & timber',
    description:
      'Mixed-species coppice block (willow / black locust / hazel) on a ' +
      '7-15 year rotation. Cordwood for household heat, poles for fencing, ' +
      'food forest stakes, mushroom logs.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['parcel-assessment', 'swale-system'],
    siteRequirements: [
      { kind: 'minAcres', value: 5 },
    ],
    laborHrsPerAcre: 90,
    costRangeUSD: { low: 1200, mid: 2800, high: 5500, perAcre: true },
    materials: [
      { label: 'Coppice whips', quantityPerAcre: 1000, unit: 'plants/acre' },
      { label: 'Deer protection', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'every-3-years',
      season: 'winter',
      laborHrsPerOccurrence: 90,
      costUSDPerOccurrence: 200,
      materialsPerOccurrence: [
        { label: 'Guard / fence repair stock', unit: 'lot' },
      ],
      equipmentRequired: ['chainsaw / billhook'],
      notes: 'Cut one coupe per rotation cycle, stack and season cordwood/poles, and keep deer protection sound between cuts.',
    },
    durationMonths: 24,
    maturityCurve: [
      { yearOffset: 3, functionalPct: 20 },
      { yearOffset: 7, functionalPct: 70 },
      { yearOffset: 10, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'fuel-cordwood-cords', contributionPerAcre: 1.2, appliesAtYearOffset: 10 },
      { criterionId: 'soil-om-pct', contributionPerAcre: 0.2, appliesAtYearOffset: 10 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 3, appliesAtYearOffset: 3 },
    ],
    spatialFootprintAcres: { minimum: 1 },
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
    sources: [
      {
        source: 'Crawford, M. (2010). Creating a Forest Garden. Green Books.',
        year: 2010,
        kind: 'book',
      },
      {
        source: 'Hart, R. (1996). Forest Gardening: Cultivating an Edible Landscape. Chelsea Green.',
        year: 1996,
        kind: 'book',
      },
    ],
    region: 'global',
  },

  {
    id: 'solar-pv',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['habitation', 'infrastructure'],
      permacultureRingRange: [0, 1],
    },
    geometryTemplate: 'centroid-point',
    // — / —
    name: 'Rooftop solar PV array',
    description:
      'Grid-tied or hybrid PV array sized for household plus pumping. ' +
      'Net-meter when available; battery storage in v2.',
    category: 'structures',
    yeomansPhase: 'buildings',
    prerequisites: ['parcel-assessment'],
    siteRequirements: [],
    laborFixedHrs: 60,
    costRangeUSD: { low: 14000, mid: 22000, high: 38000 },
    materials: [
      { label: 'PV modules (6-8 kW)', unit: 'system' },
      { label: 'Inverter + balance-of-system', unit: 'system' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'spring',
      laborHrsPerOccurrence: 4,
      costUSDPerOccurrence: 150,
      requiredPersonnel: { skillLevel: 'licensed electrician (inspection)', minCount: 1 },
      notes: 'Wash modules, clear shading growth, inspect wiring/connectors and inverter logs; electrician sign-off on the annual check.',
    },
    durationMonths: 3,
    maturityCurve: [
      { yearOffset: 0, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'solar-kwh-yr', contributionFixed: 8500, appliesAtYearOffset: 1 },
    ],
    designLayer: 'structures',
    sources: [
      {
        source: 'NREL (2023). U.S. Solar Photovoltaic System and Energy Storage Cost Benchmark. National Renewable Energy Laboratory.',
        year: 2023,
        kind: 'standard',
      },
    ],
    region: 'global',
  },

  {
    id: 'orchard-block',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['food_production'],
      preferredSuccession: ['pioneer', 'mid'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses', 'thriving-grasses'],
      avoidedCategories: ['habitation', 'spiritual', 'infrastructure', 'water_retention', 'conservation'],
      permacultureRingRange: [2, 3],
    },
    geometryTemplate: 'bbox-rect',
    // — / —
    name: 'Standard orchard block',
    description:
      'Semi-dwarf apple / pear / stone fruit on grass alley. ' +
      'Complement to the food forest; cleaner harvest mechanics for the ' +
      'surplus-revenue stream.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['cover-crop-rebuild', 'swale-system'],
    siteRequirements: [
      { kind: 'slopeMaxPct', value: 12 },
      { kind: 'minAcres', value: 4 },
    ],
    laborHrsPerAcre: 120,
    costRangeUSD: { low: 3000, mid: 6500, high: 12000, perAcre: true },
    materials: [
      { label: 'Bare-root semi-dwarf trees', quantityPerAcre: 120, unit: 'trees/acre' },
      { label: 'Tree guards / stakes', unit: 'lot' },
      { label: 'Grass-alley seed', quantityPerAcre: 20, unit: 'lbs/acre' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'winter',
      laborHrsPerOccurrence: 60,
      costUSDPerOccurrence: 400,
      materialsPerOccurrence: [
        { label: 'Holistic IPM inputs (dormant + summer)', unit: 'lot' },
      ],
      equipmentRequired: ['orchard sprayer', 'alley mower'],
      notes: 'Dormant and summer pruning, holistic spray rounds, alley mowing, guard and stake checks, gap replanting.',
    },
    durationMonths: 24,
    maturityCurve: [
      { yearOffset: 3, functionalPct: 30 },
      { yearOffset: 5, functionalPct: 70 },
      { yearOffset: 7, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'food-sov-fruit-lbs', contributionPerAcre: 1200, appliesAtYearOffset: 7 },
      { criterionId: 'income-surplus-usd', contributionPerAcre: 1800, appliesAtYearOffset: 7 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 2, appliesAtYearOffset: 2 },
      // Retreat: orchard fruit supplies the guest table.
      { criterionId: 'retreat-fruit-lbs', contributionPerAcre: 1200, appliesAtYearOffset: 7 },
    ],
    spatialFootprintAcres: { minimum: 0.5 },
    seasonConstraints: ['spring', 'fall'],
    designLayer: 'vegetation',
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
    id: 'value-add-kitchen',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['habitation', 'infrastructure'],
      permacultureRingRange: [0, 1],
    },
    geometryTemplate: 'centroid-point',
    // — / —
    name: 'Farm-kitchen value-add (canning / drying / fermenting)',
    description:
      'Licensed cottage-kitchen retrofit in an outbuilding for shelf-stable ' +
      'jams, hot sauces, ferments, and dried-fruit lines. Converts seasonal ' +
      'surplus into year-round saleable inventory.',
    category: 'structures',
    yeomansPhase: 'buildings',
    prerequisites: ['orchard-block', 'kitchen-garden'],
    siteRequirements: [],
    laborFixedHrs: 240,
    costRangeUSD: { low: 4500, mid: 9000, high: 18000 },
    materials: [
      { label: 'Commercial-grade range + sink', unit: 'lot' },
      { label: 'Stainless prep tables', unit: 'lot' },
      { label: 'Jarring / drying equipment', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'any',
      laborHrsPerOccurrence: 24,
      costUSDPerOccurrence: 600,
      requiredPersonnel: { skillLevel: 'health-inspection / appliance service', minCount: 1 },
      notes: 'Deep clean and equipment servicing, calibrate canners/dehydrators, renew the cottage-kitchen licence and pass the annual inspection.',
    },
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'income-surplus-usd', contributionFixed: 5500, appliesAtYearOffset: 3 },
      { criterionId: 'income-streams-count', contributionFixed: 1, appliesAtYearOffset: 2 },
      // Multi-enterprise: a value-add line is a distinct revenue stream.
      { criterionId: 'multi-enterprise-streams', contributionFixed: 1, appliesAtYearOffset: 2 },
      { criterionId: 'multi-gross-revenue-usd', contributionFixed: 8000, appliesAtYearOffset: 3 },
    ],
    designLayer: 'structures',
    sources: [
      {
        source: 'Katz, S. E. (2012). The Art of Fermentation. Chelsea Green.',
        year: 2012,
        kind: 'book',
      },
    ],
    region: 'global',
  },

  {
    id: 'market-garden',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['food_production'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses', 'thriving-grasses'],
      avoidedCategories: [
        'conservation',
        'spiritual',
        'water_retention',
        'habitation',
      ],
      permacultureRingRange: [1, 2],
    },
    geometryTemplate: 'tile-strip',
    // — / —
    name: 'Commercial market garden (Zone 2 cash beds)',
    description:
      'Standardised permanent beds run as the primary horticultural cash ' +
      'enterprise: succession-cropped salad, roots, alliums, and storage ' +
      'vegetables for CSA / market channels. Distinct from the Zone-1 ' +
      'subsistence kitchen garden — larger, market-scale, and the main ' +
      'income line, not table supply.',
    category: 'vegetation',
    yeomansPhase: 'trees',
    prerequisites: ['cover-crop-rebuild', 'compost-system'],
    siteRequirements: [{ kind: 'slopeMaxPct', value: 10 }],
    laborHrsPerAcre: 1600,
    costRangeUSD: { low: 6000, mid: 11000, high: 20000, perAcre: true },
    materials: [
      { label: 'Drip-irrigation + mainline', unit: 'lot' },
      { label: 'Seed + transplants (annual)', unit: 'lot' },
      { label: 'Compost', quantityPerAcre: 40, unit: 'yards' },
      { label: 'Landscape fabric / silage tarps', unit: 'lot' },
    ],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 60,
      costUSDPerOccurrence: 300,
      materialsPerOccurrence: [
        { label: 'Succession seed / transplants', unit: 'lot' },
        { label: 'Compost + drip-line parts', unit: 'lot' },
      ],
      equipmentRequired: [
        'walk-behind tractor / tilther',
        'wash-pack station',
      ],
      notes:
        'Continuous bed flips and succession sowing, drip servicing, ' +
        'tarp occultation, harvest + wash-pack, and market-channel ' +
        'logistics through the growing season.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 60 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'income-surplus-usd', contributionPerAcre: 4500, appliesAtYearOffset: 2 },
      { criterionId: 'income-streams-count', contributionFixed: 1, appliesAtYearOffset: 2 },
      { criterionId: 'food-sov-calories-pct', contributionPerAcre: 10, appliesAtYearOffset: 2 },
      { criterionId: 'food-sov-protein-pct', contributionPerAcre: 3, appliesAtYearOffset: 2 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 2, appliesAtYearOffset: 1 },
      // Regenerative-farm: market beds are a high-value regen cash enterprise.
      { criterionId: 'regen-revenue-per-acre', contributionPerAcre: 4500, appliesAtYearOffset: 2 },
      { criterionId: 'regen-soil-cover', contributionPerAcre: 2, appliesAtYearOffset: 1 },
      // Multi-enterprise: a market garden is one of several revenue streams.
      { criterionId: 'multi-enterprise-streams', contributionFixed: 1, appliesAtYearOffset: 2 },
      { criterionId: 'multi-gross-revenue-usd', contributionPerAcre: 4500, appliesAtYearOffset: 2 },
      { criterionId: 'multi-production-pct', contributionPerAcre: 1, appliesAtYearOffset: 2 },
    ],
    spatialFootprintAcres: { fractionOfParcel: 0.08, minimum: 0.5 },
    designLayer: 'vegetation',
    sources: [
      {
        source:
          'Fortier, J.-M. (2014). The Market Gardener. New Society Publishers.',
        year: 2014,
        kind: 'book',
        note: 'Standardised-bed market-garden economics and labor model.',
      },
      {
        source:
          'Coleman, E. (2018). The New Organic Grower (3rd ed.). Chelsea Green.',
        year: 2018,
        kind: 'book',
      },
    ],
    region: 'global',
  },

  {
    id: 'annual-cash-crop-rotation',
    // — auto-design —
    zoneAffinity: {
      preferredCategories: ['food_production'],
      preferredGroundCover: ['bare-soil', 'sparse-grasses'],
      avoidedCategories: [
        'conservation',
        'spiritual',
        'habitation',
        'water_retention',
      ],
      permacultureRingRange: [2, 4],
    },
    geometryTemplate: 'tile-strip',
    // — / —
    name: 'Annual cash-crop rotation (regenerative broadacre)',
    description:
      'The primary field enterprise on a regenerative farm: a planned ' +
      'small-grain / pulse / oilseed rotation kept under continuous living ' +
      'cover with integrated cover crops, minimal tillage, and no bare ' +
      'fallow. Thin per-acre margin carried by scale; builds soil while it ' +
      'earns.',
    category: 'vegetation',
    yeomansPhase: 'soil',
    prerequisites: ['keyline-access-track', 'cover-crop-rebuild'],
    siteRequirements: [{ kind: 'slopeMaxPct', value: 12 }],
    laborHrsPerAcre: 12,
    costRangeUSD: { low: 200, mid: 380, high: 650, perAcre: true },
    materials: [
      { label: 'Certified rotation seed', unit: 'lot' },
      { label: 'Biological inoculant / amendment', unit: 'lot' },
      { label: 'Inter-seeded cover-crop mix', quantityPerAcre: 18, unit: 'lbs' },
    ],
    maintenanceSchedule: {
      frequency: 'annual',
      season: 'any',
      laborHrsPerOccurrence: 20,
      costUSDPerOccurrence: 240,
      materialsPerOccurrence: [
        { label: 'Certified seed (rotation crops)', unit: 'lot' },
        { label: 'Cover-crop seed', unit: 'lbs' },
      ],
      equipmentRequired: [
        'tractor + no-till seed drill',
        'combine (owned or custom-hire)',
      ],
      notes:
        'Each cropping cycle: rotation planning and seed sourcing, ' +
        'no-till drilling, cover-crop establishment behind harvest, and ' +
        'custom-hire combining where equipment is not owned.',
    },
    durationMonths: 12,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 80 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'income-surplus-usd', contributionPerAcre: 180, appliesAtYearOffset: 2 },
      { criterionId: 'income-streams-count', contributionFixed: 1, appliesAtYearOffset: 2 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 2.5, appliesAtYearOffset: 1 },
      { criterionId: 'soil-om-pct', contributionPerAcre: 0.08, appliesAtYearOffset: 5 },
      // Regenerative-farm: this IS the regen broadacre cash enterprise.
      { criterionId: 'regen-yield-lbs-per-acre', contributionPerAcre: 1800, appliesAtYearOffset: 2 },
      { criterionId: 'regen-revenue-per-acre', contributionPerAcre: 180, appliesAtYearOffset: 2 },
      { criterionId: 'regen-soil-om', contributionPerAcre: 0.08, appliesAtYearOffset: 5 },
      { criterionId: 'regen-soil-cover', contributionPerAcre: 2.5, appliesAtYearOffset: 1 },
    ],
    spatialFootprintAcres: { fractionOfParcel: 0.35 },
    designLayer: 'vegetation',
    sources: [
      {
        source: 'Brown, G. (2018). Dirt to Soil. Chelsea Green.',
        year: 2018,
        kind: 'book',
        note: 'Regenerative cash-crop rotation under continuous cover.',
      },
      {
        source:
          'Montgomery, D. R. (2017). Growing a Revolution. W. W. Norton.',
        year: 2017,
        kind: 'book',
      },
    ],
    region: 'global',
  },
];

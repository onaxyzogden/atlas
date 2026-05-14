/**
 * Goal Compass intervention catalog — v1 homestead vertical slice.
 *
 * 15 canonical permaculture interventions covering the homestead journey:
 *   parcel-assessment → keyline access → swales/ponds → soil prep →
 *   kitchen garden → food forest → poultry/small-ruminants → woodlot
 *   → cover crops → composting → solar PV → rainwater storage → coppice
 *
 * Each entry carries ≥1 full citation (Mollison, Yeomans, Crawford, Holzer,
 * Lancaster, Coleman, Smith, NRCS, OMAFRA). Schema discipline mirrors
 * `substitutionCatalog.ts`. Cost numbers are mid-2020s ranges drawn from
 * the regional cost files in `features/financial/engine/regionalCosts/`
 * with conservative variance bands.
 *
 * Region defaults to `'global'`; region-specific overrides land in v2.
 */

import type { Intervention } from './goalCompassTypes.js';

export const INTERVENTION_CATALOG: Intervention[] = [
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
    durationMonths: 4,
    maturityCurve: [
      { yearOffset: 0, functionalPct: 70 },
      { yearOffset: 1, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'water-self-sufficient-pct', contributionPerAcre: 4, appliesAtYearOffset: 1 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 2, appliesAtYearOffset: 1 },
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
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 0, functionalPct: 60 },
      { yearOffset: 1, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'water-storage-gal', contributionFixed: 120000, appliesAtYearOffset: 1 },
      { criterionId: 'water-self-sufficient-pct', contributionFixed: 25, appliesAtYearOffset: 2 },
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
    durationMonths: 24,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 40 },
      { yearOffset: 2, functionalPct: 80 },
      { yearOffset: 3, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'soil-om-pct', contributionPerAcre: 0.15, appliesAtYearOffset: 3 },
      { criterionId: 'soil-cover-pct', contributionPerAcre: 8, appliesAtYearOffset: 1 },
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
    durationMonths: 1,
    maturityCurve: [
      { yearOffset: 0, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'soil-om-pct', contributionFixed: 0.2, appliesAtYearOffset: 3 },
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
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 80 },
      { yearOffset: 2, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'food-sov-protein-pct', contributionFixed: 18, appliesAtYearOffset: 2 },
      { criterionId: 'income-streams-count', contributionFixed: 1, appliesAtYearOffset: 2 },
      { criterionId: 'income-surplus-usd', contributionFixed: 2200, appliesAtYearOffset: 3 },
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
    id: 'coppice-woodlot',
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
    durationMonths: 6,
    maturityCurve: [
      { yearOffset: 1, functionalPct: 100 },
    ],
    criterionContributions: [
      { criterionId: 'income-surplus-usd', contributionFixed: 5500, appliesAtYearOffset: 3 },
      { criterionId: 'income-streams-count', contributionFixed: 1, appliesAtYearOffset: 2 },
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
];

export function getIntervention(id: string) {
  return INTERVENTION_CATALOG.find((i) => i.id === id) ?? null;
}

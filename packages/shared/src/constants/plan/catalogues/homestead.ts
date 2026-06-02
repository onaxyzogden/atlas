// catalogues/homestead.ts
//
// Homestead / Family Land PRIMARY-type objectives - the 15 type-specific
// objectives a Homestead project adds on top of the 19 Universal objectives
// (OLOS Homestead / Family Land Plan Stage Objective Catalogue v1.1 - v1.0 base
// plus the v1.1 Tier-6 adaptive management protocol addition).
//
// This file holds ONLY the primary-layer standalone objectives. The universal
// slot lives in ./universal.ts (the shared baseline). The base catalogue carries
// no secondary layer ("None in base catalogue. Secondaries loaded per project
// recipe."), so there are no PatchRecords here.
//
// Count note: 19 universal + 15 primary = 34 total (the source's top summary box
// still reads "14 primary" from v1.0; the v1.1 note "Adaptive management protocol
// added to Tier 6" raised the primary count to 15, and the Complete objective
// index lists all 15 primary refs: 0.4, 1.5, 1.6, 1.7, 2.3, 3.4, 3.5, 3.6, 4.4,
// 4.5, 4.6, 5.2, 6.4, 6.5, 6.6). The source numbers objectives by Tier 0-6; this
// catalogue maps Tier N -> Stratum (N+1) to match the codebase spine: Tier 0 ->
// s1-project-foundation, 1 -> s2-land-reading, 2 -> s3-systems-reading, 3 ->
// s4-foundation-decisions, 4 -> s5-system-design, 5 -> s6-integration-design,
// 6 -> s7-phasing-resourcing. Refs are restamped HMS-S<stratum>.<n> from the
// source's <tier>.<n> (keeping the per-tier objective number).
//
// Conditional note: HMS-S5.6 "Design animal husbandry infrastructure" is the
// source's conditional Tier-4 objective - it loads only if animals are confirmed
// in the Tier 0 household needs survey. There is no conditional-loading seam in
// the resolver yet, so it is encoded as an ordinary primary objective and the
// condition is preserved verbatim in its scopeNotes; gating it on the household
// needs survey is a follow-up once that seam exists - not silently dropped.
//
// Economic note: the only money objective is HMS-S7.5 "Define household budget &
// input reduction plan" - ordinary household cash-flow / spend-baseline tracking
// to measure financial self-sufficiency progress. No advance sale, no financial
// product, no riba- or gharar-adjacent content. Amanah Gate: clean land- and
// household-stewardship catalogue.
//
// Decision groups are AUTHORED editorially under the 2026-05-31 extended override
// ("author meaningful labels") - the source ships no decision-group spec, so each
// objective's checklist is partitioned into 2-3 named decision scopes (full
// mutually-exclusive partition), mirroring orchard.ts.
//
// source: 'primary', sourceTypeId: 'homestead' on every objective. Refs follow
// Authoring Standards (HMS-S<stratum>.<n>). ASCII-only copy: em/en dashes ->
// " - "; curly quotes -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj } from './authoring.js';

const PRIMARY = 'homestead' as const;

export const HOMESTEAD_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'hms-s1-household-needs',
    stratumId: 's1-project-foundation',
    ref: 'HMS-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define household needs & self-sufficiency priorities',
    shortTitle: 'Household needs & self-sufficiency priorities',
    focusedQuestion:
      'What does this household actually need - food, fuel, medicine, materials - and which needs will be met by the land vs. purchased externally?',
    checklist: [
      ck(
        'hms-s1-household-needs-c1',
        'List all household food needs by category - vegetables, fruit, protein, dairy, staples',
      ),
      ck(
        'hms-s1-household-needs-c2',
        'Estimate current annual spend per category as a baseline',
      ),
      ck(
        'hms-s1-household-needs-c3',
        'Define self-sufficiency targets per category - full, partial, or not applicable',
      ),
      ck(
        'hms-s1-household-needs-c4',
        'Identify non-food household needs the land could supply - fuel, fibre, medicine, building materials',
      ),
      ck(
        'hms-s1-household-needs-c5',
        'Define minimum provision threshold - the baseline that makes the homestead viable',
      ),
      ck(
        'hms-s1-household-needs-c6',
        'Record which needs will always be sourced externally and why',
      ),
      ck(
        'hms-s1-household-needs-c7',
        'Confirm household agreement on priorities and trade-offs',
      ),
    ],
    decisionGroups: [
      dg('hms-s1-household-needs-dg1', 'Needs inventory & baseline', ['hms-s1-household-needs-c1', 'hms-s1-household-needs-c2']),
      dg('hms-s1-household-needs-dg2', 'Self-sufficiency targets', ['hms-s1-household-needs-c3', 'hms-s1-household-needs-c4', 'hms-s1-household-needs-c5']),
      dg('hms-s1-household-needs-dg3', 'External sourcing & agreement', ['hms-s1-household-needs-c6', 'hms-s1-household-needs-c7']),
    ],
    completionGate:
      'Household needs defined and self-sufficiency targets agreed. Minimum provision threshold confirmed.',
    actHandoff: 'Household Needs & Self-Sufficiency Brief',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'hms-s2-resource-flows',
    stratumId: 's2-land-reading',
    ref: 'HMS-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey household resource flows',
    shortTitle: 'Household resource flows',
    focusedQuestion:
      'What does this household currently consume, waste, and spend - and where does it all come from?',
    checklist: [
      ck(
        'hms-s2-resource-flows-c1',
        'Record current food sources by category - supermarket, local suppliers, own production',
      ),
      ck(
        'hms-s2-resource-flows-c2',
        'Estimate current household waste streams - food waste, packaging, organic material',
      ),
      ck(
        'hms-s2-resource-flows-c3',
        'Map existing household organic outputs available for fertility cycling - kitchen scraps, grey water, humanure potential',
      ),
      ck(
        'hms-s2-resource-flows-c4',
        'Record current energy sources and consumption patterns',
      ),
      ck(
        'hms-s2-resource-flows-c5',
        'Identify all external inputs that could potentially be replaced by home production',
      ),
      ck(
        'hms-s2-resource-flows-c6',
        'Note seasonal patterns in consumption and waste',
      ),
    ],
    decisionGroups: [
      dg('hms-s2-resource-flows-dg1', 'Consumption & waste streams', ['hms-s2-resource-flows-c1', 'hms-s2-resource-flows-c2']),
      dg('hms-s2-resource-flows-dg2', 'Organic outputs & energy', ['hms-s2-resource-flows-c3', 'hms-s2-resource-flows-c4']),
      dg('hms-s2-resource-flows-dg3', 'Replacement potential & seasonality', ['hms-s2-resource-flows-c5', 'hms-s2-resource-flows-c6']),
    ],
    completionGate:
      'Household resource flow baseline complete. All consumption, waste, and organic outputs mapped.',
    actHandoff: 'Household Resource Flow Baseline',
  }),
  obj({
    id: 'hms-s2-productive-capacity',
    stratumId: 's2-land-reading',
    ref: 'HMS-S2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey existing productive capacity',
    shortTitle: 'Existing productive capacity',
    focusedQuestion:
      'What is already growing or producing on this land - including neglected, dormant, or overlooked productive elements?',
    checklist: [
      ck(
        'hms-s2-productive-capacity-c1',
        'Inventory all existing food-producing plants - trees, shrubs, perennial vegetables',
      ),
      ck(
        'hms-s2-productive-capacity-c2',
        'Assess condition and yield potential of each existing productive element',
      ),
      ck(
        'hms-s2-productive-capacity-c3',
        'Identify existing water harvesting or storage infrastructure',
      ),
      ck(
        'hms-s2-productive-capacity-c4',
        'Note existing compost, worm farm, or fertility infrastructure',
      ),
      ck(
        'hms-s2-productive-capacity-c5',
        'Record any existing animal infrastructure - coops, pens, fencing',
      ),
      ck(
        'hms-s2-productive-capacity-c6',
        'Identify areas of existing soil health vs. degradation',
      ),
    ],
    decisionGroups: [
      dg('hms-s2-productive-capacity-dg1', 'Existing plantings & yield', ['hms-s2-productive-capacity-c1', 'hms-s2-productive-capacity-c2']),
      dg('hms-s2-productive-capacity-dg2', 'Water & fertility infrastructure', ['hms-s2-productive-capacity-c3', 'hms-s2-productive-capacity-c4']),
      dg('hms-s2-productive-capacity-dg3', 'Animal infrastructure & soil', ['hms-s2-productive-capacity-c5', 'hms-s2-productive-capacity-c6']),
    ],
    completionGate:
      'Existing productive capacity fully inventoried. Condition and yield potential assessed for all elements.',
    actHandoff: 'Existing Productive Capacity Inventory',
  }),
  obj({
    id: 'hms-s2-landscape-vectors',
    stratumId: 's2-land-reading',
    ref: 'HMS-S2.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey surrounding landscape context & vectors',
    shortTitle: 'Landscape context & vectors',
    focusedQuestion:
      'How does the surrounding landscape shape the risks and opportunities of this homestead - including what neighbours are doing with their land?',
    checklist: [
      ck(
        'hms-s2-landscape-vectors-c1',
        'Map surrounding land uses within 1km radius',
      ),
      ck(
        'hms-s2-landscape-vectors-c2',
        'Identify neighbouring agricultural or horticultural practices and their spray, runoff, and contamination risk',
      ),
      ck(
        'hms-s2-landscape-vectors-c3',
        'Assess prevailing wind direction relative to neighbouring chemical use - drift risk by season',
      ),
      ck(
        'hms-s2-landscape-vectors-c4',
        'Identify upstream water sources and any contamination risk from surrounding land',
      ),
      ck(
        'hms-s2-landscape-vectors-c5',
        'Record any landscape-scale pest and weed pressure sources',
      ),
      ck(
        'hms-s2-landscape-vectors-c6',
        'Note landscape-scale opportunities - foraging, water sharing, community resources',
      ),
    ],
    decisionGroups: [
      dg('hms-s2-landscape-vectors-dg1', 'Surrounding land use & practices', ['hms-s2-landscape-vectors-c1', 'hms-s2-landscape-vectors-c2']),
      dg('hms-s2-landscape-vectors-dg2', 'Contamination vectors', ['hms-s2-landscape-vectors-c3', 'hms-s2-landscape-vectors-c4']),
      dg('hms-s2-landscape-vectors-dg3', 'Pressures & opportunities', ['hms-s2-landscape-vectors-c5', 'hms-s2-landscape-vectors-c6']),
    ],
    completionGate:
      'Landscape context and vector survey complete. Contamination risks identified and mapped.',
    actHandoff: 'Landscape Context & Vector Survey Package',
    scopeNotes:
      'This objective has equal standing to internal site surveys. A homestead with clean internal practices can be compromised by neighbouring chemical use, spray drift, or contaminated water sources. Do not treat as secondary to on-site surveys.',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'hms-s3-water-quality',
    stratumId: 's3-systems-reading',
    ref: 'HMS-S3.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey household water quality & potability',
    shortTitle: 'Household water quality & potability',
    focusedQuestion:
      'Given what was found in the landscape vector survey, what is the quality and potability of available water sources for household and food production use?',
    checklist: [
      ck(
        'hms-s3-water-quality-c1',
        'Test all drinking and cooking water sources for biological contamination - bacteria, pathogens',
      ),
      ck(
        'hms-s3-water-quality-c2',
        'Test for chemical contamination relevant to landscape vector findings - herbicides, nitrates, heavy metals',
      ),
      ck(
        'hms-s3-water-quality-c3',
        'Assess irrigation water quality for food production suitability',
      ),
      ck(
        'hms-s3-water-quality-c4',
        'Test rainwater harvesting catchment surfaces for contamination risk',
      ),
      ck(
        'hms-s3-water-quality-c5',
        'Record seasonal variation in water quality',
      ),
      ck(
        'hms-s3-water-quality-c6',
        'Define potability status for each water source - drinking, cooking, irrigation, animal use only',
      ),
    ],
    decisionGroups: [
      dg('hms-s3-water-quality-dg1', 'Contamination testing', ['hms-s3-water-quality-c1', 'hms-s3-water-quality-c2']),
      dg('hms-s3-water-quality-dg2', 'Irrigation & catchment quality', ['hms-s3-water-quality-c3', 'hms-s3-water-quality-c4']),
      dg('hms-s3-water-quality-dg3', 'Seasonality & potability status', ['hms-s3-water-quality-c5', 'hms-s3-water-quality-c6']),
    ],
    completionGate:
      'Water quality assessment complete for all sources. Potability status defined. Contamination risks from landscape vectors addressed.',
    actHandoff: 'Household Water Quality Report',
    scopeNotes:
      'Planning question explicitly connects to Tier 1 landscape vector findings. Contamination identified in the surrounding landscape survey must be tested for specifically here - do not run a generic water test without cross-referencing vector risks.',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'hms-s4-food-production-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'HMS-S4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define household food production strategy',
    shortTitle: 'Household food production strategy',
    focusedQuestion:
      'Which foods, in what quantities, and by what growing methods will this homestead produce - and in what order will production be built up?',
    checklist: [
      ck(
        'hms-s4-food-production-strategy-c1',
        'Map household food needs from Tier 0 against what the site can produce',
      ),
      ck(
        'hms-s4-food-production-strategy-c2',
        'Select primary growing methods - annual beds, perennial systems, animals, preserving',
      ),
      ck(
        'hms-s4-food-production-strategy-c3',
        'Define production targets per food category for first planning cycle',
      ),
      ck(
        'hms-s4-food-production-strategy-c4',
        'Identify which high-value or high-frequency foods to prioritise first',
      ),
      ck(
        'hms-s4-food-production-strategy-c5',
        'Define seed saving and variety selection strategy',
      ),
      ck(
        'hms-s4-food-production-strategy-c6',
        'Establish food preservation and storage approach - fermentation, drying, cellaring, freezing',
      ),
    ],
    decisionGroups: [
      dg('hms-s4-food-production-strategy-dg1', 'Needs-to-site mapping & methods', ['hms-s4-food-production-strategy-c1', 'hms-s4-food-production-strategy-c2']),
      dg('hms-s4-food-production-strategy-dg2', 'Targets & priorities', ['hms-s4-food-production-strategy-c3', 'hms-s4-food-production-strategy-c4']),
      dg('hms-s4-food-production-strategy-dg3', 'Seed saving & preservation', ['hms-s4-food-production-strategy-c5', 'hms-s4-food-production-strategy-c6']),
    ],
    completionGate:
      'Food production strategy approved. Production targets, methods, and priorities confirmed for first cycle.',
    actHandoff: 'Household Food Production Strategy Brief',
  }),
  obj({
    id: 'hms-s4-fertility-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'HMS-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define whole-homestead fertility & soil building strategy',
    shortTitle: 'Whole-homestead fertility & soil building',
    focusedQuestion:
      'How will this homestead close its nutrient loops and build soil health using on-site resources?',
    checklist: [
      ck(
        'hms-s4-fertility-strategy-c1',
        'Define primary composting approach - hot compost, cold compost, worm farm, bokashi',
      ),
      ck(
        'hms-s4-fertility-strategy-c2',
        'Map all on-site organic inputs available for composting - kitchen scraps, garden waste, animal manure',
      ),
      ck(
        'hms-s4-fertility-strategy-c3',
        'Define mulching strategy - sources, materials, application zones',
      ),
      ck(
        'hms-s4-fertility-strategy-c4',
        'Define animal integration role in fertility cycling if animals are present',
      ),
      ck(
        'hms-s4-fertility-strategy-c5',
        'Establish cover crop and green manure strategy for garden zones',
      ),
      ck(
        'hms-s4-fertility-strategy-c6',
        'Define external input reduction targets - what gets replaced, by what, by when',
      ),
    ],
    decisionGroups: [
      dg('hms-s4-fertility-strategy-dg1', 'Composting & organic inputs', ['hms-s4-fertility-strategy-c1', 'hms-s4-fertility-strategy-c2']),
      dg('hms-s4-fertility-strategy-dg2', 'Mulch & animal integration', ['hms-s4-fertility-strategy-c3', 'hms-s4-fertility-strategy-c4']),
      dg('hms-s4-fertility-strategy-dg3', 'Cover crops & input reduction', ['hms-s4-fertility-strategy-c5', 'hms-s4-fertility-strategy-c6']),
    ],
    completionGate:
      'Fertility and soil building strategy approved. Closed-loop approach defined for all productive zones.',
    actHandoff: 'Whole-Homestead Fertility Strategy Brief',
  }),
  obj({
    id: 'hms-s4-energy-shelter-resilience',
    stratumId: 's4-foundation-decisions',
    ref: 'HMS-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define energy & shelter resilience strategy',
    shortTitle: 'Energy & shelter resilience strategy',
    focusedQuestion:
      'How will this household maintain adequate shelter, warmth, and energy security through all seasons and disruption scenarios?',
    checklist: [
      ck(
        'hms-s4-energy-shelter-resilience-c1',
        'Assess current shelter condition and adequacy for all seasons',
      ),
      ck(
        'hms-s4-energy-shelter-resilience-c2',
        'Define heating fuel strategy - wood, passive solar, gas, electric, hybrid',
      ),
      ck(
        'hms-s4-energy-shelter-resilience-c3',
        'Define backup power strategy - generator, battery, manual alternatives',
      ),
      ck(
        'hms-s4-energy-shelter-resilience-c4',
        'Identify critical household systems that require power - water pump, refrigeration, communications',
      ),
      ck(
        'hms-s4-energy-shelter-resilience-c5',
        'Define resilience threshold - minimum energy and shelter standard to maintain in disruption',
      ),
      ck(
        'hms-s4-energy-shelter-resilience-c6',
        'Identify priority improvements required before Act begins',
      ),
    ],
    decisionGroups: [
      dg('hms-s4-energy-shelter-resilience-dg1', 'Shelter & heating', ['hms-s4-energy-shelter-resilience-c1', 'hms-s4-energy-shelter-resilience-c2']),
      dg('hms-s4-energy-shelter-resilience-dg2', 'Power & critical systems', ['hms-s4-energy-shelter-resilience-c3', 'hms-s4-energy-shelter-resilience-c4']),
      dg('hms-s4-energy-shelter-resilience-dg3', 'Resilience threshold & priorities', ['hms-s4-energy-shelter-resilience-c5', 'hms-s4-energy-shelter-resilience-c6']),
    ],
    completionGate:
      'Energy and shelter resilience strategy approved. Heating, power, and shelter adequacy confirmed.',
    actHandoff: 'Energy & Shelter Resilience Strategy Brief',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'hms-s5-food-zones-layout',
    stratumId: 's5-system-design',
    ref: 'HMS-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design food production zones & garden layout',
    shortTitle: 'Food production zones & garden layout',
    focusedQuestion:
      'How will food production areas be designed and laid out to meet household targets efficiently?',
    checklist: [
      ck(
        'hms-s5-food-zones-layout-c1',
        'Design kitchen garden layout - bed dimensions, paths, orientation',
      ),
      ck(
        'hms-s5-food-zones-layout-c2',
        'Design annual vegetable production zones - rotation blocks, companion planting',
      ),
      ck(
        'hms-s5-food-zones-layout-c3',
        'Design perennial food zones - orchard, berry areas, perennial vegetables',
      ),
      ck(
        'hms-s5-food-zones-layout-c4',
        'Design protected growing infrastructure if required - glasshouse, cold frame, tunnel',
      ),
      ck(
        'hms-s5-food-zones-layout-c5',
        'Design herb and medicinal plant zones',
      ),
      ck(
        'hms-s5-food-zones-layout-c6',
        'Integrate food production design with fertility system - compost access, mulch application routes',
      ),
      ck(
        'hms-s5-food-zones-layout-c7',
        'Specify seed saving and nursery area',
      ),
    ],
    decisionGroups: [
      dg('hms-s5-food-zones-layout-dg1', 'Kitchen & annual garden', ['hms-s5-food-zones-layout-c1', 'hms-s5-food-zones-layout-c2']),
      dg('hms-s5-food-zones-layout-dg2', 'Perennial & protected growing', ['hms-s5-food-zones-layout-c3', 'hms-s5-food-zones-layout-c4', 'hms-s5-food-zones-layout-c5']),
      dg('hms-s5-food-zones-layout-dg3', 'Fertility integration & nursery', ['hms-s5-food-zones-layout-c6', 'hms-s5-food-zones-layout-c7']),
    ],
    completionGate:
      'Food production zone layout designed and approved. All productive areas specified with dimensions and species plan.',
    actHandoff: 'Food Production Zone Design Package',
  }),
  obj({
    id: 'hms-s5-energy-shelter-systems',
    stratumId: 's5-system-design',
    ref: 'HMS-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design energy & shelter systems',
    shortTitle: 'Energy & shelter systems',
    focusedQuestion:
      'How will heating, power, and shelter infrastructure be designed to meet the resilience strategy?',
    checklist: [
      ck(
        'hms-s5-energy-shelter-systems-c1',
        'Design heating system - wood fuel storage, stove placement, passive solar improvements',
      ),
      ck(
        'hms-s5-energy-shelter-systems-c2',
        'Specify insulation upgrades required for adequate seasonal performance',
      ),
      ck(
        'hms-s5-energy-shelter-systems-c3',
        'Design backup power system - capacity, placement, fuel storage',
      ),
      ck(
        'hms-s5-energy-shelter-systems-c4',
        'Design fuel production or storage infrastructure - woodlot, woodshed, fuel security',
      ),
      ck(
        'hms-s5-energy-shelter-systems-c5',
        'Specify priority shelter repairs or improvements',
      ),
    ],
    decisionGroups: [
      dg('hms-s5-energy-shelter-systems-dg1', 'Heating & insulation', ['hms-s5-energy-shelter-systems-c1', 'hms-s5-energy-shelter-systems-c2']),
      dg('hms-s5-energy-shelter-systems-dg2', 'Backup power & fuel', ['hms-s5-energy-shelter-systems-c3', 'hms-s5-energy-shelter-systems-c4']),
      dg('hms-s5-energy-shelter-systems-dg3', 'Shelter repairs', ['hms-s5-energy-shelter-systems-c5']),
    ],
    completionGate:
      'Energy and shelter system design approved. All components specified and sequenced.',
    actHandoff: 'Energy & Shelter Systems Design Package',
  }),
  obj({
    id: 'hms-s5-animal-husbandry',
    stratumId: 's5-system-design',
    ref: 'HMS-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design animal husbandry infrastructure',
    shortTitle: 'Animal husbandry infrastructure',
    focusedQuestion:
      'How will animal housing, movement, and management areas be designed to support the household provision plan?',
    checklist: [
      ck(
        'hms-s5-animal-husbandry-c1',
        'Design animal housing - coops, pens, shelters appropriate to species',
      ),
      ck(
        'hms-s5-animal-husbandry-c2',
        'Design secure runs and grazing areas',
      ),
      ck(
        'hms-s5-animal-husbandry-c3',
        'Design fencing and predator exclusion',
      ),
      ck(
        'hms-s5-animal-husbandry-c4',
        'Design feed storage and preparation areas',
      ),
      ck(
        'hms-s5-animal-husbandry-c5',
        'Design manure management and fertility capture system',
      ),
      ck(
        'hms-s5-animal-husbandry-c6',
        'Specify water delivery to all animal areas',
      ),
    ],
    decisionGroups: [
      dg('hms-s5-animal-husbandry-dg1', 'Housing & grazing', ['hms-s5-animal-husbandry-c1', 'hms-s5-animal-husbandry-c2']),
      dg('hms-s5-animal-husbandry-dg2', 'Fencing & feed', ['hms-s5-animal-husbandry-c3', 'hms-s5-animal-husbandry-c4']),
      dg('hms-s5-animal-husbandry-dg3', 'Manure & water', ['hms-s5-animal-husbandry-c5', 'hms-s5-animal-husbandry-c6']),
    ],
    completionGate:
      'Animal husbandry infrastructure design approved. All housing, movement, and management areas specified.',
    actHandoff: 'Animal Husbandry Infrastructure Design Package',
    scopeNotes:
      'Conditional objective - loads only if animals are confirmed in the Tier 0 household needs survey. If no animals are planned, this objective does not appear in the project.',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'hms-s6-self-sufficiency-feedback',
    stratumId: 's6-integration-design',
    ref: 'HMS-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design household self-sufficiency feedback loop',
    shortTitle: 'Household self-sufficiency feedback loop',
    focusedQuestion:
      'How will the household track its provision gap - what it still buys vs. grows - and use that to improve the next planning cycle?',
    checklist: [
      ck(
        'hms-s6-self-sufficiency-feedback-c1',
        'Design provision tracking system - record what was grown, preserved, and consumed from the homestead each season',
      ),
      ck(
        'hms-s6-self-sufficiency-feedback-c2',
        'Design gap tracking - record what was still purchased externally and at what cost',
      ),
      ck(
        'hms-s6-self-sufficiency-feedback-c3',
        'Connect tracking system to Tier 0 self-sufficiency targets - measure progress against original baseline',
      ),
      ck(
        'hms-s6-self-sufficiency-feedback-c4',
        'Define seasonal review rhythm - when does the household assess progress and adjust plans',
      ),
      ck(
        'hms-s6-self-sufficiency-feedback-c5',
        'Specify record format - simple enough to maintain consistently',
      ),
    ],
    decisionGroups: [
      dg('hms-s6-self-sufficiency-feedback-dg1', 'Provision & gap tracking', ['hms-s6-self-sufficiency-feedback-c1', 'hms-s6-self-sufficiency-feedback-c2']),
      dg('hms-s6-self-sufficiency-feedback-dg2', 'Baseline connection', ['hms-s6-self-sufficiency-feedback-c3']),
      dg('hms-s6-self-sufficiency-feedback-dg3', 'Review rhythm & format', ['hms-s6-self-sufficiency-feedback-c4', 'hms-s6-self-sufficiency-feedback-c5']),
    ],
    completionGate:
      'Self-sufficiency feedback loop designed. Provision tracking, gap tracking, and review rhythm approved. System connects to Tier 0 targets.',
    actHandoff: 'Household Self-Sufficiency Feedback System',
    scopeNotes:
      'This feedback loop closes against the Tier 0 household needs objective. The loop is only meaningful if the Tier 0 baseline was honestly recorded - confirm that connection before gating.',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'hms-s7-provision-phasing',
    stratumId: 's7-phasing-resourcing',
    ref: 'HMS-S7.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define provision phasing - quick wins first',
    shortTitle: 'Provision phasing - quick wins first',
    focusedQuestion:
      'In what order will the household build up food production, sequenced by ecological readiness and yield speed - not just financial return?',
    checklist: [
      ck(
        'hms-s7-provision-phasing-c1',
        'Identify fast-yielding enterprises for immediate planting - salad greens, herbs, eggs, sprouts',
      ),
      ck(
        'hms-s7-provision-phasing-c2',
        'Sequence medium-term production - annual vegetables, small fruit, preserving crops',
      ),
      ck(
        'hms-s7-provision-phasing-c3',
        'Sequence long-term production - orchard, perennial systems, staple crops',
      ),
      ck(
        'hms-s7-provision-phasing-c4',
        'Define ecological readiness criteria for each phase - what soil, water, or habitat conditions must be met before each production layer launches',
      ),
      ck(
        'hms-s7-provision-phasing-c5',
        'Confirm sequencing reduces household grocery spend from earliest possible point',
      ),
    ],
    decisionGroups: [
      dg('hms-s7-provision-phasing-dg1', 'Yield-speed sequencing', ['hms-s7-provision-phasing-c1', 'hms-s7-provision-phasing-c2', 'hms-s7-provision-phasing-c3']),
      dg('hms-s7-provision-phasing-dg2', 'Ecological readiness criteria', ['hms-s7-provision-phasing-c4']),
      dg('hms-s7-provision-phasing-dg3', 'Provision logic check', ['hms-s7-provision-phasing-c5']),
    ],
    completionGate:
      'Provision phasing approved. Fast, medium, and long-term production sequenced by ecological readiness and yield speed.',
    actHandoff: 'Provision Phasing Plan',
    scopeNotes:
      'Sequencing logic is ecological readiness + yield speed - not capital enablement. A homestead that plants the orchard before the kitchen garden is ready has sequenced by aspiration, not provision logic.',
  }),
  obj({
    id: 'hms-s7-budget-input-reduction',
    stratumId: 's7-phasing-resourcing',
    ref: 'HMS-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define household budget & input reduction plan',
    shortTitle: 'Household budget & input reduction plan',
    focusedQuestion:
      'How will the household track financial self-sufficiency progress - what was spent externally, what gets replaced by home production, and by when?',
    checklist: [
      ck(
        'hms-s7-budget-input-reduction-c1',
        'Record current annual household food and supply spend as baseline',
      ),
      ck(
        'hms-s7-budget-input-reduction-c2',
        'Map which spend categories will be reduced in Phase 1 - and by how much',
      ),
      ck(
        'hms-s7-budget-input-reduction-c3',
        'Define input reduction milestones by planning cycle',
      ),
      ck(
        'hms-s7-budget-input-reduction-c4',
        'Identify remaining external inputs that cannot be replaced and their cost',
      ),
      ck(
        'hms-s7-budget-input-reduction-c5',
        'Define minimum financial viability threshold for the homestead',
      ),
    ],
    decisionGroups: [
      dg('hms-s7-budget-input-reduction-dg1', 'Spend baseline & Phase 1 reductions', ['hms-s7-budget-input-reduction-c1', 'hms-s7-budget-input-reduction-c2']),
      dg('hms-s7-budget-input-reduction-dg2', 'Reduction milestones', ['hms-s7-budget-input-reduction-c3']),
      dg('hms-s7-budget-input-reduction-dg3', 'Irreducible inputs & viability', ['hms-s7-budget-input-reduction-c4', 'hms-s7-budget-input-reduction-c5']),
    ],
    completionGate:
      'Household budget and input reduction plan approved. Baseline spend recorded and reduction milestones confirmed.',
    actHandoff: 'Household Budget & Input Reduction Plan',
  }),
  obj({
    id: 'hms-s7-adaptive-management',
    stratumId: 's7-phasing-resourcing',
    ref: 'HMS-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define adaptive management protocol',
    shortTitle: 'Adaptive management protocol',
    focusedQuestion:
      'How will monitoring findings trigger changes to the household stewardship plan - ensuring provision and land strategies evolve as the homestead matures?',
    checklist: [
      ck(
        'hms-s7-adaptive-management-c1',
        'Define annual homestead review process - what monitoring data is reviewed and by whom',
      ),
      ck(
        'hms-s7-adaptive-management-c2',
        'Define decision triggers - what gaps or conditions require a plan change',
      ),
      ck(
        'hms-s7-adaptive-management-c3',
        'Specify how plan changes are documented and why',
      ),
      ck(
        'hms-s7-adaptive-management-c4',
        'Define 3-year comprehensive review against Tier 0 self-sufficiency targets',
      ),
    ],
    decisionGroups: [
      dg('hms-s7-adaptive-management-dg1', 'Review process & triggers', ['hms-s7-adaptive-management-c1', 'hms-s7-adaptive-management-c2']),
      dg('hms-s7-adaptive-management-dg2', 'Documentation & long-cycle review', ['hms-s7-adaptive-management-c3', 'hms-s7-adaptive-management-c4']),
    ],
    completionGate:
      'Adaptive management protocol approved. Review cycle and decision triggers confirmed.',
    actHandoff: 'Adaptive Management Protocol',
  }),
];

// catalogues/silvopasture.ts
//
// Silvopasture / Livestock Land Management PRIMARY-type objectives - the 26
// type-specific objectives a Silvopasture project adds on top of the 19
// Universal objectives (OLOS Silvopasture / Livestock Land Management Objective
// Catalogue v1.0, authored to Catalogue Authoring Standards v1.4).
//
// This file holds ONLY the primary-layer standalone objectives. The universal
// slot lives in ./universal.ts (the shared baseline).
//
// Count note: 19 universal + 26 primary = 45 total. Per-tier primary counts
// (3+4+3+5+4+3+4 = 26) and the source's "Complete objective index" both confirm
// 26. The source numbers objectives by Tier 0-6; this catalogue maps Tier N ->
// Stratum (N+1) to match the codebase spine: Tier 0 -> s1-project-foundation,
// 1 -> s2-land-reading, 2 -> s3-systems-reading, 3 -> s4-foundation-decisions,
// 4 -> s5-system-design, 5 -> s6-integration-design, 6 -> s7-phasing-resourcing.
// Refs are restamped SILV-S<stratum>.<n> from the source's <tier>.<n>.
//
// Economic note: the only money objective is SILV-S7.6 "Define enterprise
// financial viability plan" - ordinary break-even budgeting (infrastructure /
// stocking cost vs revenue timeline). No advance sale, no financial product, no
// riba- or gharar-adjacent content. Amanah Gate: clean land-stewardship
// catalogue; the 2026-05-29 "encode verbatim, no gating" override is not engaged.
//
// Hard gate: SILV-S7.4 (Define livestock establishment sequence) carries the
// source's hard gate verbatim - no livestock arrive before fencing, water, and
// handling facilities all pass independent go/no-go tests.
//
// Universal-augmentation note (DEFERRED 2026-05-30): the source appends two
// type-specific "Forage & pasture addition" sub-blocks INSIDE universal
// objectives - one on Universal 4.1 "Design access & circulation" (s5-access:
// "Design laneway gates and flow - minimise stress points in livestock
// movement") and three on Universal 4.3 "Design soil improvement strategy"
// (s5-soil-improvement: overseeding methodology; forage species mix per zone;
// sequence weed control + fertility to precede/accompany overseeding). Universal
// objectives are shared by reference across every type and there is no existing
// seam for a PRIMARY to patch a universal objective. These items are intentionally
// NOT YET encoded here; the operator is supplying a document that resolves the
// encoding approach. They are tracked and will be added in a follow-up pass - not
// silently dropped.
//
// source: 'primary', sourceTypeId: 'silvopasture' on every objective.
// Refs follow Authoring Standards (SILV-S<stratum>.<n>). ASCII-only copy:
// em/en dashes -> " - "; curly quotes -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, obj } from './authoring.js';

const PRIMARY = 'silvopasture' as const;

export const SILVOPASTURE_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'silv-s1-enterprise-mix',
    stratumId: 's1-project-foundation',
    ref: 'SILV-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define livestock enterprise mix & stocking strategy',
    focusedQuestion:
      'Which livestock species, breeds, and numbers will this system run - and what is the production intent?',
    checklist: [
      ck(
        'silv-s1-enterprise-mix-c1',
        'Define species and breeds selected - cattle, sheep, goats, pigs, poultry, or combination',
      ),
      ck(
        'silv-s1-enterprise-mix-c2',
        'Define production intent per species - meat, milk, fibre, eggs, land improvement',
      ),
      ck(
        'silv-s1-enterprise-mix-c3',
        'Estimate target stocking numbers at full establishment',
      ),
      ck(
        'silv-s1-enterprise-mix-c4',
        'Define integration logic between species if multi-species',
      ),
      ck(
        'silv-s1-enterprise-mix-c5',
        'Confirm enterprise mix is achievable within steward capacity and site carrying capacity',
      ),
      ck(
        'silv-s1-enterprise-mix-c6',
        'Define marketing and sales strategy for each enterprise',
      ),
    ],
    completionGate:
      'Livestock enterprise mix approved. Species, breeds, numbers, and production intent confirmed.',
    actHandoff: 'Livestock Enterprise Mix & Stocking Strategy Brief',
  }),
  obj({
    id: 'silv-s1-land-improvement-philosophy',
    stratumId: 's1-project-foundation',
    ref: 'SILV-S1.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define land improvement philosophy',
    focusedQuestion:
      'Is livestock the primary tool for land improvement - and how does regenerative grazing logic shape all management decisions?',
    checklist: [
      ck(
        'silv-s1-land-improvement-philosophy-c1',
        'Define primary land management intent - land improvement through animal impact, production on existing land, or both',
      ),
      ck(
        'silv-s1-land-improvement-philosophy-c2',
        'Define grazing philosophy - adaptive multi-paddock, holistic planned grazing, or conventional rotational',
      ),
      ck(
        'silv-s1-land-improvement-philosophy-c3',
        'Define land improvement targets - bare ground reduction, pasture species diversity, soil organic matter',
      ),
      ck(
        'silv-s1-land-improvement-philosophy-c4',
        'Document philosophy as design constraint - all Tier 3-4 decisions evaluated against it',
      ),
      ck(
        'silv-s1-land-improvement-philosophy-c5',
        'Confirm philosophy is consistent with tree integration intent',
      ),
    ],
    completionGate:
      'Land improvement philosophy approved. Design constraint documented.',
    actHandoff: 'Land Improvement Philosophy Brief',
  }),
  obj({
    id: 'silv-s1-animal-welfare',
    stratumId: 's1-project-foundation',
    ref: 'SILV-S1.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define animal welfare standards',
    focusedQuestion:
      'What minimum welfare standards govern all livestock management decisions - shelter, space, water, and husbandry?',
    checklist: [
      ck(
        'silv-s1-animal-welfare-c1',
        'Define minimum space requirements per species at defined stocking density',
      ),
      ck(
        'silv-s1-animal-welfare-c2',
        'Define shelter requirements per species - shade, wind protection, wet weather refuge',
      ),
      ck(
        'silv-s1-animal-welfare-c3',
        'Define water access standards - maximum distance from water per species',
      ),
      ck(
        'silv-s1-animal-welfare-c4',
        'Define handling frequency and low-stress handling commitment',
      ),
      ck(
        'silv-s1-animal-welfare-c5',
        'Define emergency animal welfare response protocol',
      ),
      ck(
        'silv-s1-animal-welfare-c6',
        'Confirm standards comply with relevant animal welfare legislation',
      ),
    ],
    completionGate:
      'Animal welfare standards defined and confirmed compliant with legislation.',
    actHandoff: 'Animal Welfare Standards Brief',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'silv-s2-pasture-condition',
    stratumId: 's2-land-reading',
    ref: 'SILV-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey existing pasture condition & forage species',
    focusedQuestion:
      'What is the current pasture composition, condition, and carrying capacity estimate?',
    checklist: [
      ck(
        'silv-s2-pasture-condition-c1',
        'Map pasture vegetation communities by zone - species composition and cover',
      ),
      ck(
        'silv-s2-pasture-condition-c2',
        'Assess pasture condition per zone - excellent, good, fair, poor, degraded',
      ),
      ck(
        'silv-s2-pasture-condition-c3',
        'Identify desirable forage species present',
      ),
      ck(
        'silv-s2-pasture-condition-c4',
        'Identify undesirable or weed species in pasture',
      ),
      ck(
        'silv-s2-pasture-condition-c5',
        'Estimate current carrying capacity based on pasture condition',
      ),
      ck(
        'silv-s2-pasture-condition-c6',
        'Record seasonal variation in pasture availability and quality',
      ),
    ],
    completionGate:
      'Pasture condition and forage species survey complete. Carrying capacity estimated.',
    actHandoff: 'Existing Pasture Condition & Forage Species Survey',
  }),
  obj({
    id: 'silv-s2-livestock-infrastructure',
    stratumId: 's2-land-reading',
    ref: 'SILV-S2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey existing livestock infrastructure',
    focusedQuestion:
      'What fencing, yards, troughs, laneways, and shelters already exist - and what condition are they in?',
    checklist: [
      ck(
        'silv-s2-livestock-infrastructure-c1',
        'Inventory all existing fencing - type, condition, stock-tightness per species',
      ),
      ck(
        'silv-s2-livestock-infrastructure-c2',
        'Assess existing yards and handling facilities - capacity, layout, condition',
      ),
      ck(
        'silv-s2-livestock-infrastructure-c3',
        'Inventory existing water troughs and their supply infrastructure',
      ),
      ck(
        'silv-s2-livestock-infrastructure-c4',
        'Map existing laneways - width, surface, condition',
      ),
      ck(
        'silv-s2-livestock-infrastructure-c5',
        'Assess existing shelters - condition and species suitability',
      ),
    ],
    completionGate:
      'Existing livestock infrastructure inventoried. Condition and reuse potential assessed.',
    actHandoff: 'Existing Livestock Infrastructure Survey',
  }),
  obj({
    id: 'silv-s2-landscape-context',
    stratumId: 's2-land-reading',
    ref: 'SILV-S2.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey surrounding landscape context & vectors',
    focusedQuestion:
      'How does the surrounding landscape affect livestock health, forage quality, and enterprise viability?',
    checklist: [
      ck(
        'silv-s2-landscape-context-c1',
        'Map surrounding land uses within 2km',
      ),
      ck(
        'silv-s2-landscape-context-c2',
        'Identify neighbouring agricultural practices - spray drift risk to pasture and animals',
      ),
      ck(
        'silv-s2-landscape-context-c3',
        'Assess biosecurity risk from neighbouring livestock operations',
      ),
      ck(
        'silv-s2-landscape-context-c4',
        'Assess drinking water catchment contamination risk from surrounding landscape',
      ),
      ck(
        'silv-s2-landscape-context-c5',
        'Identify landscape-scale weed pressure sources affecting pasture',
      ),
    ],
    completionGate: 'Landscape context and vector survey complete.',
    actHandoff: 'Landscape Context & Vector Survey Package',
  }),
  obj({
    id: 'silv-s2-grazing-history',
    stratumId: 's2-land-reading',
    ref: 'SILV-S2.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey grazing history & animal impact',
    focusedQuestion:
      'What is the grazing history of this land - and what legacy compaction, degradation, and weed burden must be addressed?',
    checklist: [
      ck(
        'silv-s2-grazing-history-c1',
        'Record historical stocking rates and species from all available sources',
      ),
      ck(
        'silv-s2-grazing-history-c2',
        'Map compaction zones - depth profiling under historically grazed areas',
      ),
      ck(
        'silv-s2-grazing-history-c3',
        'Assess bare ground distribution and extent',
      ),
      ck(
        'silv-s2-grazing-history-c4',
        'Map weed invasion associated with historical overgrazing',
      ),
      ck(
        'silv-s2-grazing-history-c5',
        'Assess recovery potential of degraded zones based on soil biology and seed bank',
      ),
      ck(
        'silv-s2-grazing-history-c6',
        'Define restoration baseline - what must improve before target stocking is reached',
      ),
    ],
    completionGate:
      'Grazing history and animal impact assessment complete. Recovery baseline defined.',
    actHandoff: 'Grazing History & Animal Impact Survey',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'silv-s3-stock-water-availability',
    stratumId: 's3-systems-reading',
    ref: 'SILV-S3.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey stock water availability & seasonal supply',
    focusedQuestion:
      'Is there sufficient water available to sustain target stocking numbers through the driest months?',
    checklist: [
      ck(
        'silv-s3-stock-water-availability-c1',
        'Calculate stock water demand at target stocking by species and season',
      ),
      ck(
        'silv-s3-stock-water-availability-c2',
        'Assess all available water source yields through dry season',
      ),
      ck(
        'silv-s3-stock-water-availability-c3',
        'Map seasonal supply and demand - identify gap periods',
      ),
      ck(
        'silv-s3-stock-water-availability-c4',
        'Assess water source distribution relative to proposed paddock layout',
      ),
      ck(
        'silv-s3-stock-water-availability-c5',
        'Define storage requirements to bridge seasonal gaps',
      ),
      ck(
        'silv-s3-stock-water-availability-c6',
        'Confirm maximum stocking supportable by available water',
      ),
    ],
    completionGate:
      'Stock water availability confirmed. Seasonal gap and storage requirements defined.',
    actHandoff: 'Stock Water Availability & Seasonal Supply Survey',
  }),
  obj({
    id: 'silv-s3-soil-compaction',
    stratumId: 's3-systems-reading',
    ref: 'SILV-S3.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey soil compaction & structure under grazing',
    focusedQuestion:
      'Where is compaction present - and what does it tell us about pasture recovery potential and management requirements?',
    checklist: [
      ck(
        'silv-s3-soil-compaction-c1',
        'Conduct penetrometer testing across representative zones',
      ),
      ck(
        'silv-s3-soil-compaction-c2',
        'Map compaction depth and severity by zone',
      ),
      ck(
        'silv-s3-soil-compaction-c3',
        'Correlate compaction with historical stocking intensity',
      ),
      ck(
        'silv-s3-soil-compaction-c4',
        'Assess subsoil structure and drainage class under compacted zones',
      ),
      ck(
        'silv-s3-soil-compaction-c5',
        'Define compaction remediation requirements per zone - biological, mechanical, or management',
      ),
    ],
    completionGate:
      'Soil compaction survey complete. Remediation requirements defined per zone.',
    actHandoff: 'Soil Compaction & Structure Survey',
  }),
  obj({
    id: 'silv-s3-forage-productivity',
    stratumId: 's3-systems-reading',
    ref: 'SILV-S3.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey forage productivity & nutritional baseline',
    focusedQuestion:
      'What is the current pasture yield per hectare, seasonal availability, and nutritional profile - and what gaps constrain the livestock enterprise?',
    checklist: [
      ck(
        'silv-s3-forage-productivity-c1',
        'Estimate dry matter production per hectare by zone and season',
      ),
      ck(
        'silv-s3-forage-productivity-c2',
        'Assess nutritional quality of existing forage - protein, energy, mineral content where possible',
      ),
      ck(
        'silv-s3-forage-productivity-c3',
        'Identify seasonal nutritional gaps - energy deficit, mineral deficiency',
      ),
      ck(
        'silv-s3-forage-productivity-c4',
        'Define supplementary feeding requirements based on gaps',
      ),
      ck(
        'silv-s3-forage-productivity-c5',
        'Calculate carrying capacity from forage productivity baseline',
      ),
    ],
    completionGate:
      'Forage productivity and nutritional baseline complete. Carrying capacity confirmed from productivity data.',
    actHandoff: 'Forage Productivity & Nutritional Baseline Survey',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'silv-s4-paddock-layout',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define paddock layout & rotational grazing framework',
    focusedQuestion:
      'How many paddocks, what size, and what rotation interval - designed to maximise pasture recovery and land improvement?',
    checklist: [
      ck(
        'silv-s4-paddock-layout-c1',
        'Define number of paddocks based on target species, numbers, and rest period',
      ),
      ck(
        'silv-s4-paddock-layout-c2',
        'Map paddock boundaries relative to topography and existing fencing',
      ),
      ck(
        'silv-s4-paddock-layout-c3',
        'Define rotation interval and minimum rest period per paddock',
      ),
      ck(
        'silv-s4-paddock-layout-c4',
        'Define stocking density per paddock at defined rotation',
      ),
      ck(
        'silv-s4-paddock-layout-c5',
        'Calculate total carrying capacity of defined paddock system',
      ),
      ck(
        'silv-s4-paddock-layout-c6',
        'Confirm paddock layout is achievable with available fencing budget',
      ),
    ],
    completionGate:
      'Paddock layout and rotational grazing framework approved. Carrying capacity confirmed.',
    actHandoff: 'Paddock Layout & Rotational Grazing Framework Brief',
  }),
  obj({
    id: 'silv-s4-stock-water-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define stock water infrastructure strategy',
    focusedQuestion:
      'How will potable stock water be delivered reliably to all paddocks in all rotations and all seasons?',
    checklist: [
      ck(
        'silv-s4-stock-water-strategy-c1',
        'Define primary water source for stock water system',
      ),
      ck(
        'silv-s4-stock-water-strategy-c2',
        'Design distribution network - pipelines, gravity, pumping',
      ),
      ck(
        'silv-s4-stock-water-strategy-c3',
        'Specify trough locations and types for each paddock',
      ),
      ck(
        'silv-s4-stock-water-strategy-c4',
        'Define water point density - maximum distance from water per species',
      ),
      ck(
        'silv-s4-stock-water-strategy-c5',
        'Define emergency water supply if primary system fails',
      ),
      ck(
        'silv-s4-stock-water-strategy-c6',
        'Confirm system capacity against seasonal demand assessment',
      ),
    ],
    completionGate:
      'Stock water infrastructure strategy approved. All paddocks confirmed with reliable water access.',
    actHandoff: 'Stock Water Infrastructure Strategy Brief',
  }),
  obj({
    id: 'silv-s4-forage-improvement',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define forage & pasture improvement strategy',
    focusedQuestion:
      'How will pasture composition, fertility, and productivity be improved to meet enterprise targets?',
    checklist: [
      ck(
        'silv-s4-forage-improvement-c1',
        'Define target forage species mix by zone - productive and ecologically diverse',
      ),
      ck(
        'silv-s4-forage-improvement-c2',
        'Define overseeding methodology - direct drilling, broadcasting, cultivation',
      ),
      ck(
        'silv-s4-forage-improvement-c3',
        'Define fertility input strategy - animal impact, composting, mineral amendments',
      ),
      ck(
        'silv-s4-forage-improvement-c4',
        'Define weed control approach - consistent with land improvement philosophy',
      ),
      ck(
        'silv-s4-forage-improvement-c5',
        'Define pasture improvement sequence - priority zones first',
      ),
      ck(
        'silv-s4-forage-improvement-c6',
        'Set measurable pasture improvement targets with timeframes',
      ),
    ],
    completionGate:
      'Forage and pasture improvement strategy approved. Target species, fertility, and improvement sequence confirmed.',
    actHandoff: 'Forage & Pasture Improvement Strategy Brief',
  }),
  obj({
    id: 'silv-s4-tree-integration',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define tree integration strategy',
    focusedQuestion:
      'Which tree species will be integrated into the grazing system, where, and how will they be established and protected?',
    checklist: [
      ck(
        'silv-s4-tree-integration-c1',
        'Define tree species for silvopasture integration - shade, fodder, timber, fruit, nitrogen-fixing',
      ),
      ck(
        'silv-s4-tree-integration-c2',
        'Map tree placement relative to paddock framework - rows, scattered, clustered',
      ),
      ck(
        'silv-s4-tree-integration-c3',
        'Define tree density and spacing',
      ),
      ck(
        'silv-s4-tree-integration-c4',
        'Define grazing management to protect establishing trees - timing, temporary exclusion',
      ),
      ck(
        'silv-s4-tree-integration-c5',
        'Define long-term canopy management and coppicing strategy',
      ),
      ck(
        'silv-s4-tree-integration-c6',
        'Confirm species selection is consistent with land improvement philosophy and climate',
      ),
    ],
    completionGate:
      'Tree integration strategy approved. Species, placement, density, and protection confirmed.',
    actHandoff: 'Tree Integration Strategy Brief',
  }),
  obj({
    id: 'silv-s4-animal-health',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define animal health & veterinary protocol',
    focusedQuestion:
      'How will routine animal health, preventive care, and emergency veterinary access be managed?',
    checklist: [
      ck(
        'silv-s4-animal-health-c1',
        'Define routine health program per species - vaccination, drenching, parasite management',
      ),
      ck(
        'silv-s4-animal-health-c2',
        'Define preventive care calendar - fertility, condition scoring, hoof care',
      ),
      ck(
        'silv-s4-animal-health-c3',
        'Identify nearest veterinary service and emergency response time',
      ),
      ck(
        'silv-s4-animal-health-c4',
        'Define isolation facility requirements for sick or injured animals',
      ),
      ck(
        'silv-s4-animal-health-c5',
        'Define mortality management protocol',
      ),
      ck(
        'silv-s4-animal-health-c6',
        'Confirm all handling facilities support low-stress routine health procedures',
      ),
    ],
    completionGate:
      'Animal health and veterinary protocol approved. Emergency vet access confirmed.',
    actHandoff: 'Animal Health & Veterinary Protocol Brief',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'silv-s5-fencing',
    stratumId: 's5-system-design',
    ref: 'SILV-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design fencing & paddock infrastructure',
    focusedQuestion:
      'How will paddock subdivision, gates, and boundary fencing be designed for the defined rotation system?',
    checklist: [
      ck(
        'silv-s5-fencing-c1',
        'Design internal subdivision fencing to defined paddock layout',
      ),
      ck(
        'silv-s5-fencing-c2',
        'Specify fence type per location - permanent, semi-permanent, temporary electric',
      ),
      ck(
        'silv-s5-fencing-c3',
        'Design gate placement - all paddocks accessible from laneway without crossing other paddocks',
      ),
      ck(
        'silv-s5-fencing-c4',
        'Design boundary fence upgrades where required for species being run',
      ),
      ck(
        'silv-s5-fencing-c5',
        'Specify water crossing points and wildlife crossings in fence lines',
      ),
      ck(
        'silv-s5-fencing-c6',
        'Define fencing installation sequence - align with stocking buildup plan',
      ),
    ],
    completionGate:
      'Fencing and paddock design approved. All paddocks accessible without cross-paddock movement.',
    actHandoff: 'Fencing & Paddock Infrastructure Design Package',
  }),
  obj({
    id: 'silv-s5-stock-water-distribution',
    stratumId: 's5-system-design',
    ref: 'SILV-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design stock water distribution network',
    focusedQuestion:
      'How will stock water be distributed from source to all paddock troughs?',
    checklist: [
      ck(
        'silv-s5-stock-water-distribution-c1',
        'Design pipeline network from primary source to all paddock water points',
      ),
      ck(
        'silv-s5-stock-water-distribution-c2',
        'Specify trough types and sizes per species and paddock',
      ),
      ck(
        'silv-s5-stock-water-distribution-c3',
        'Design float valve, overflow, and drainage for each trough',
      ),
      ck(
        'silv-s5-stock-water-distribution-c4',
        'Design solar or gravity pressure system as applicable',
      ),
      ck(
        'silv-s5-stock-water-distribution-c5',
        'Specify pipe materials and burial depth',
      ),
      ck(
        'silv-s5-stock-water-distribution-c6',
        'Confirm all troughs meet species welfare water access standard',
      ),
    ],
    completionGate:
      'Stock water distribution network design approved. All paddocks confirmed with welfare-standard water access.',
    actHandoff: 'Stock Water Distribution Network Design Package',
  }),
  obj({
    id: 'silv-s5-shelters-handling',
    stratumId: 's5-system-design',
    ref: 'SILV-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design livestock shelters & handling facilities',
    focusedQuestion:
      'How will yards, crushes, laneways, shade shelters, and isolation facilities be designed?',
    checklist: [
      ck(
        'silv-s5-shelters-handling-c1',
        'Design yards - capacity for target stocking, flow from laneway, low-stress layout',
      ),
      ck(
        'silv-s5-shelters-handling-c2',
        'Design crush and race - species-appropriate, safe for handlers and animals',
      ),
      ck(
        'silv-s5-shelters-handling-c3',
        'Design shade shelter placement per paddock - species-specific requirements',
      ),
      ck(
        'silv-s5-shelters-handling-c4',
        'Design isolation pen - separate water, shelter, accessible for treatment',
      ),
      ck(
        'silv-s5-shelters-handling-c5',
        'Confirm all facilities meet animal welfare standards defined in Tier 0',
      ),
    ],
    completionGate:
      'Livestock shelters and handling facilities design approved. Welfare standard compliance confirmed.',
    actHandoff: 'Livestock Shelters & Handling Facilities Design Package',
  }),
  obj({
    id: 'silv-s5-tree-planting',
    stratumId: 's5-system-design',
    ref: 'SILV-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design silvopasture tree planting & protection plan',
    focusedQuestion:
      'How will trees be established in the grazing system - species placement, guards, and protection from stock?',
    checklist: [
      ck(
        'silv-s5-tree-planting-c1',
        'Map tree planting locations within paddock framework per Tier 3 strategy',
      ),
      ck(
        'silv-s5-tree-planting-c2',
        'Specify planting method - tube stock, direct seeding, transplant',
      ),
      ck(
        'silv-s5-tree-planting-c3',
        'Design tree protection - guards, temporary fencing, repellent',
      ),
      ck(
        'silv-s5-tree-planting-c4',
        'Design establishment irrigation where required',
      ),
      ck(
        'silv-s5-tree-planting-c5',
        'Specify planting sequence - align with paddock rotation to allow recovery time',
      ),
      ck(
        'silv-s5-tree-planting-c6',
        'Define grazing exclusion period per tree species until establishment is confirmed',
      ),
    ],
    completionGate:
      'Tree planting and protection plan approved. Establishment sequence aligned with paddock rotation.',
    actHandoff: 'Silvopasture Tree Planting & Protection Plan',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'silv-s6-pasture-monitoring',
    stratumId: 's6-integration-design',
    ref: 'SILV-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design livestock & pasture monitoring protocol',
    focusedQuestion:
      'How will pasture condition, grazing impact, and stock performance be tracked to drive rotation decisions?',
    checklist: [
      ck(
        'silv-s6-pasture-monitoring-c1',
        'Define pasture condition scoring method - cover, species composition, height before and after grazing',
      ),
      ck(
        'silv-s6-pasture-monitoring-c2',
        'Define monitoring frequency - pre- and post-grazing assessment per paddock',
      ),
      ck(
        'silv-s6-pasture-monitoring-c3',
        'Design grazing impact assessment - bare ground, compaction, species shift',
      ),
      ck(
        'silv-s6-pasture-monitoring-c4',
        'Define pasture recovery assessment - recovery criteria before re-entry',
      ),
      ck(
        'silv-s6-pasture-monitoring-c5',
        'Specify data recording system - simple paddock diary or digital log',
      ),
    ],
    completionGate:
      'Livestock and pasture monitoring protocol approved. Pre/post-grazing assessment and recovery criteria defined.',
    actHandoff: 'Livestock & Pasture Monitoring Protocol',
  }),
  obj({
    id: 'silv-s6-animal-health-monitoring',
    stratumId: 's6-integration-design',
    ref: 'SILV-S6.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design animal health monitoring system',
    focusedQuestion:
      'How will livestock health indicators be tracked - and what triggers a veterinary response?',
    checklist: [
      ck(
        'silv-s6-animal-health-monitoring-c1',
        'Define health indicators per species - body condition score, coat condition, mobility, behaviour',
      ),
      ck(
        'silv-s6-animal-health-monitoring-c2',
        'Define monitoring frequency - weekly minimum, daily for high-risk periods',
      ),
      ck(
        'silv-s6-animal-health-monitoring-c3',
        'Define veterinary trigger thresholds - what condition score or symptom requires vet contact',
      ),
      ck(
        'silv-s6-animal-health-monitoring-c4',
        'Design health recording system - individual animal and mob records',
      ),
      ck(
        'silv-s6-animal-health-monitoring-c5',
        'Define seasonal health risk calendar - drenching, vaccination, fertility monitoring windows',
      ),
    ],
    completionGate:
      'Animal health monitoring system approved. Veterinary trigger thresholds defined.',
    actHandoff: 'Animal Health Monitoring System',
  }),
  obj({
    id: 'silv-s6-adaptive-management',
    stratumId: 's6-integration-design',
    ref: 'SILV-S6.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define adaptive management protocol',
    focusedQuestion:
      'How will pasture monitoring data drive stocking rate and rotation adjustments - completing the regenerative grazing feedback loop?',
    checklist: [
      ck(
        'silv-s6-adaptive-management-c1',
        'Define stocking rate review process - triggered by pasture condition data, not calendar',
      ),
      ck(
        'silv-s6-adaptive-management-c2',
        'Define rotation adjustment triggers - what pasture condition defers or extends a rotation',
      ),
      ck(
        'silv-s6-adaptive-management-c3',
        'Define destocking trigger - what pasture condition requires stocking reduction',
      ),
      ck(
        'silv-s6-adaptive-management-c4',
        'Define annual enterprise review - pasture trend, animal performance, tree establishment progress',
      ),
      ck(
        'silv-s6-adaptive-management-c5',
        'Document all management changes with date, trigger, and outcome',
      ),
    ],
    completionGate:
      'Adaptive management protocol approved. Stocking and rotation decisions tied to pasture monitoring data.',
    actHandoff: 'Adaptive Management Protocol',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'silv-s7-livestock-establishment',
    stratumId: 's7-phasing-resourcing',
    ref: 'SILV-S7.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define livestock establishment sequence',
    focusedQuestion:
      'In what order will infrastructure and livestock be established - and what hard gates prevent early stocking?',
    checklist: [
      ck(
        'silv-s7-livestock-establishment-c1',
        'Confirm all boundary and subdivision fencing complete before any livestock arrive',
      ),
      ck(
        'silv-s7-livestock-establishment-c2',
        'Confirm all paddock water points operational before livestock arrive',
      ),
      ck(
        'silv-s7-livestock-establishment-c3',
        'Confirm yards and handling facilities operational before livestock arrive',
      ),
      ck(
        'silv-s7-livestock-establishment-c4',
        'Define go/no-go test for each infrastructure category',
      ),
      ck(
        'silv-s7-livestock-establishment-c5',
        'Define livestock sourcing timeline - breed, vendor, transport, quarantine',
      ),
    ],
    completionGate:
      'Livestock establishment sequence approved. All infrastructure go/no-go tests defined. No livestock arrive before all infrastructure passes.',
    actHandoff: 'Livestock Establishment Sequence',
    scopeNotes:
      'Hard gate: no livestock arrive before fencing, water, and handling facilities all pass independent go/no-go tests.',
  }),
  obj({
    id: 'silv-s7-stocking-buildup',
    stratumId: 's7-phasing-resourcing',
    ref: 'SILV-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define stocking buildup & pasture readiness plan',
    focusedQuestion:
      'How will stocking be increased incrementally as pasture condition improves - tied to monitoring data, not a calendar?',
    checklist: [
      ck(
        'silv-s7-stocking-buildup-c1',
        'Define Phase 1 stocking rate - conservative, below estimated carrying capacity',
      ),
      ck(
        'silv-s7-stocking-buildup-c2',
        'Define stocking increase triggers - what pasture condition data justifies increasing numbers',
      ),
      ck(
        'silv-s7-stocking-buildup-c3',
        'Define maximum stocking increase per review cycle',
      ),
      ck(
        'silv-s7-stocking-buildup-c4',
        'Define full stocking rate target and timeline at current pasture trajectory',
      ),
      ck(
        'silv-s7-stocking-buildup-c5',
        'Confirm stocking buildup plan is consistent with tree protection requirements',
      ),
    ],
    completionGate:
      'Stocking buildup plan approved. All stocking increases tied to pasture condition monitoring, not calendar.',
    actHandoff: 'Stocking Buildup & Pasture Readiness Plan',
  }),
  obj({
    id: 'silv-s7-financial-viability',
    stratumId: 's7-phasing-resourcing',
    ref: 'SILV-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define enterprise financial viability plan',
    focusedQuestion:
      'What are the infrastructure costs, stocking costs, and revenue timeline - and when does the enterprise break even?',
    checklist: [
      ck(
        'silv-s7-financial-viability-c1',
        'Estimate total Phase 1 infrastructure cost',
      ),
      ck(
        'silv-s7-financial-viability-c2',
        'Estimate livestock acquisition cost per phase',
      ),
      ck(
        'silv-s7-financial-viability-c3',
        'Map revenue timeline - first sales, annual income at full stocking',
      ),
      ck(
        'silv-s7-financial-viability-c4',
        'Calculate break-even point at defined stocking level and market prices',
      ),
      ck(
        'silv-s7-financial-viability-c5',
        'Define minimum viable revenue threshold - what enterprise scale makes this financially viable',
      ),
      ck(
        'silv-s7-financial-viability-c6',
        'Define financial review trigger - market or production change that requires model review',
      ),
    ],
    completionGate:
      'Enterprise financial viability plan approved. Break-even confirmed.',
    actHandoff: 'Enterprise Financial Viability Plan',
  }),
  obj({
    id: 'silv-s7-pasture-spelling',
    stratumId: 's7-phasing-resourcing',
    ref: 'SILV-S7.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define pasture spelling & recovery protocol',
    focusedQuestion:
      'What rules govern when paddocks are rested and what condition confirms readiness for re-entry?',
    checklist: [
      ck(
        'silv-s7-pasture-spelling-c1',
        'Define minimum rest period per paddock by season',
      ),
      ck(
        'silv-s7-pasture-spelling-c2',
        'Define pasture recovery indicator used for re-entry decision - target height, cover, species presence',
      ),
      ck(
        'silv-s7-pasture-spelling-c3',
        'Define seasonal spelling protocol - paddocks rested during peak growing periods for seed set',
      ),
      ck(
        'silv-s7-pasture-spelling-c4',
        'Define emergency spelling protocol - paddocks removed from rotation when condition is poor',
      ),
      ck(
        'silv-s7-pasture-spelling-c5',
        'Confirm recovery protocol is consistent with tree establishment protection requirements',
      ),
    ],
    completionGate:
      'Pasture spelling and recovery protocol approved. Re-entry indicators defined. All rotation decisions tied to recovery data.',
    actHandoff: 'Pasture Spelling & Recovery Protocol',
  }),
];

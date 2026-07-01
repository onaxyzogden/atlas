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

import type {
  PatchRecord,
  PlanStratumObjective,
} from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, ckF, dg, obj, patch } from './authoring.js';

// Decision groups (Decision Groups Reference v1.0; OLOS spec 9.3-9.4) - AUTHORED
// under the 2026-05-31 extended override ("author meaningful labels"). The
// reference doc's Silvopasture (SP) section enumerates a different objective set
// whose groups are generic placeholders ("Primary decisions / Secondary
// considerations -> Multiple") on SP.S refs that do not map cleanly to this v1.0
// SILV-S catalogue, so every group here - label, item membership, observeFeeds -
// is authored editorially to partition each objective's checklist into 2-3 named
// decision scopes (full mutually-exclusive partition). The three secondary
// PatchRecords inject a single decision group apiece (dgsilv) that partitions the
// livestock items they fold into the shared universal water / access / soil
// objectives; the resolver stamps sourceSecondaryId from secondaryTypeId.
// Universal-objective base groups live in universal.ts (the RF-anchored set).

const PRIMARY = 'silvopasture' as const;
const SECONDARY = 'silvopasture' as const;

export const SILVOPASTURE_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'silv-s1-enterprise-mix',
    stratumId: 's1-project-foundation',
    ref: 'SILV-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear livestock enterprise mix & stocking strategy',
    shortTitle: 'Livestock enterprise mix & stocking strategy',
    focusedQuestion:
      'Which livestock species, breeds, and numbers will this system run - and what is the production intent?',
    checklist: [
      ck(
        'silv-s1-enterprise-mix-c1',
        'Define species and breeds selected - cattle, sheep, goats, pigs, poultry, or combination',
        { feeds: ['s4-direction', 'silv-s4-paddock-layout', 'silv-s4-animal-health'] },
      ),
      ck(
        'silv-s1-enterprise-mix-c2',
        'Define production intent per species - meat, milk, fibre, eggs, land improvement',
        { feeds: ['s4-direction'] },
      ),
      ck(
        'silv-s1-enterprise-mix-c3',
        'Estimate target stocking numbers at full establishment',
        { feeds: ['silv-s4-paddock-layout', 'silv-s4-stock-water-strategy'] },
      ),
      ck(
        'silv-s1-enterprise-mix-c4',
        'Define integration logic between species if multi-species',
        { feeds: ['silv-s4-paddock-layout'] },
      ),
      ck(
        'silv-s1-enterprise-mix-c5',
        'Confirm enterprise mix is achievable within steward capacity and site carrying capacity',
        { feeds: ['s4-direction', 's7-resource-plan'] },
      ),
      ck(
        'silv-s1-enterprise-mix-c6',
        'Define marketing and sales strategy for each enterprise',
        { feeds: ['silv-s7-financial-viability'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s1-enterprise-mix-dg1', 'Species & production intent', ['silv-s1-enterprise-mix-c1', 'silv-s1-enterprise-mix-c2']),
      dg('silv-s1-enterprise-mix-dg2', 'Numbers & integration', ['silv-s1-enterprise-mix-c3', 'silv-s1-enterprise-mix-c4']),
      dg('silv-s1-enterprise-mix-dg3', 'Capacity & marketing', ['silv-s1-enterprise-mix-c5', 'silv-s1-enterprise-mix-c6']),
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
    title: 'A clear land improvement philosophy',
    shortTitle: 'Land improvement philosophy',
    focusedQuestion:
      'Is livestock the primary tool for land improvement - and how does regenerative grazing logic shape all management decisions?',
    checklist: [
      ck(
        'silv-s1-land-improvement-philosophy-c1',
        'Define primary land management intent - land improvement through animal impact, production on existing land, or both',
        { feeds: ['s4-direction', 'silv-s4-forage-improvement'] },
      ),
      ck(
        'silv-s1-land-improvement-philosophy-c2',
        'Define grazing philosophy - adaptive multi-paddock, holistic planned grazing, or conventional rotational',
        { feeds: ['silv-s4-paddock-layout'] },
      ),
      ck(
        'silv-s1-land-improvement-philosophy-c3',
        'Define land improvement targets - bare ground reduction, pasture species diversity, soil organic matter',
        { feeds: ['silv-s4-forage-improvement', 's6-monitoring'] },
      ),
      ck(
        'silv-s1-land-improvement-philosophy-c4',
        'Document philosophy as design constraint - all Stratum 4-5 decisions evaluated against it',
        { feeds: ['s4-direction'] },
      ),
      ck(
        'silv-s1-land-improvement-philosophy-c5',
        'Confirm philosophy is consistent with tree integration intent',
        { feeds: ['silv-s4-tree-integration'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s1-land-improvement-philosophy-dg1', 'Management & grazing philosophy', ['silv-s1-land-improvement-philosophy-c1', 'silv-s1-land-improvement-philosophy-c2']),
      dg('silv-s1-land-improvement-philosophy-dg2', 'Improvement targets', ['silv-s1-land-improvement-philosophy-c3']),
      dg('silv-s1-land-improvement-philosophy-dg3', 'Design constraint & tree fit', ['silv-s1-land-improvement-philosophy-c4', 'silv-s1-land-improvement-philosophy-c5']),
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
    title: 'Clear animal welfare standards',
    shortTitle: 'Animal welfare standards',
    focusedQuestion:
      'What minimum welfare standards govern all livestock management decisions - shelter, space, water, and husbandry?',
    checklist: [
      ck(
        'silv-s1-animal-welfare-c1',
        'Define minimum space requirements per species at defined stocking density',
        { feeds: ['silv-s4-paddock-layout'] },
      ),
      ck(
        'silv-s1-animal-welfare-c2',
        'Define shelter requirements per species - shade, wind protection, wet weather refuge',
        { feeds: ['silv-s5-shelters-handling'] },
      ),
      ck(
        'silv-s1-animal-welfare-c3',
        'Define water access standards - maximum distance from water per species',
        { feeds: ['silv-s4-stock-water-strategy'] },
      ),
      ck(
        'silv-s1-animal-welfare-c4',
        'Define handling frequency and low-stress handling commitment',
        { feeds: ['silv-s4-animal-health', 'silv-s5-shelters-handling'] },
      ),
      ck(
        'silv-s1-animal-welfare-c5',
        'Define emergency animal welfare response protocol',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'silv-s1-animal-welfare-c6',
        'Confirm standards comply with relevant animal welfare legislation',
        { feeds: ['s7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s1-animal-welfare-dg1', 'Space & shelter', ['silv-s1-animal-welfare-c1', 'silv-s1-animal-welfare-c2']),
      dg('silv-s1-animal-welfare-dg2', 'Water & handling', ['silv-s1-animal-welfare-c3', 'silv-s1-animal-welfare-c4']),
      dg('silv-s1-animal-welfare-dg3', 'Emergency & compliance', ['silv-s1-animal-welfare-c5', 'silv-s1-animal-welfare-c6']),
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
    title: 'A clear read of pasture condition & forage species',
    shortTitle: 'Pasture condition & forage species',
    focusedQuestion:
      'What is the current pasture composition, condition, and carrying capacity estimate?',
    checklist: [
      ck(
        'silv-s2-pasture-condition-c1',
        'Map pasture vegetation communities by zone - species composition and cover',
        { feeds: ['silv-s4-forage-improvement', 's4-zones'] },
      ),
      ck(
        'silv-s2-pasture-condition-c2',
        'Assess pasture condition per zone - excellent, good, fair, poor, degraded',
        { feeds: ['silv-s4-forage-improvement'] },
      ),
      ck(
        'silv-s2-pasture-condition-c3',
        'Identify desirable forage species present',
        { feeds: ['silv-s4-forage-improvement'] },
      ),
      ck(
        'silv-s2-pasture-condition-c4',
        'Identify undesirable or weed species in pasture',
        { feeds: ['silv-s4-forage-improvement', 's7-risk-register'] },
      ),
      ckF(
        'silv-s2-pasture-condition-c5',
        'Estimate current carrying capacity based on pasture condition',
        {
          formulaId: 'carrying-capacity-seasonal',
          satisfiesWhenComputed: true,
          resultLabel: 'Estimated carrying capacity',
        },
      ),
      ck(
        'silv-s2-pasture-condition-c6',
        'Record seasonal variation in pasture availability and quality',
        { feeds: ['silv-s4-forage-improvement', 'silv-s4-stock-water-strategy'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s2-pasture-condition-dg1', 'Composition & condition', ['silv-s2-pasture-condition-c1', 'silv-s2-pasture-condition-c2']),
      dg('silv-s2-pasture-condition-dg2', 'Forage & weed species', ['silv-s2-pasture-condition-c3', 'silv-s2-pasture-condition-c4'], ['Vegetation & Succession']),
      dg('silv-s2-pasture-condition-dg3', 'Capacity & seasonality', ['silv-s2-pasture-condition-c5', 'silv-s2-pasture-condition-c6']),
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
    title: 'A clear read of existing livestock infrastructure',
    shortTitle: 'Existing livestock infrastructure',
    focusedQuestion:
      'What fencing, yards, troughs, laneways, and shelters already exist - and what condition are they in?',
    checklist: [
      ck(
        'silv-s2-livestock-infrastructure-c1',
        'Inventory all existing fencing - type, condition, stock-tightness per species',
        { feeds: ['silv-s5-fencing'] },
      ),
      ck(
        'silv-s2-livestock-infrastructure-c2',
        'Assess existing yards and handling facilities - capacity, layout, condition',
        { feeds: ['silv-s5-shelters-handling'] },
      ),
      ck(
        'silv-s2-livestock-infrastructure-c3',
        'Inventory existing water troughs and their supply infrastructure',
        { feeds: ['silv-s4-stock-water-strategy', 'silv-s5-stock-water-distribution'] },
      ),
      ck(
        'silv-s2-livestock-infrastructure-c4',
        'Map existing laneways - width, surface, condition',
        { feeds: ['s5-access'] },
      ),
      ck(
        'silv-s2-livestock-infrastructure-c5',
        'Assess existing shelters - condition and species suitability',
        { feeds: ['silv-s5-shelters-handling'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s2-livestock-infrastructure-dg1', 'Fencing & yards', ['silv-s2-livestock-infrastructure-c1', 'silv-s2-livestock-infrastructure-c2'], ['Infrastructure & Access']),
      dg('silv-s2-livestock-infrastructure-dg2', 'Water & laneways', ['silv-s2-livestock-infrastructure-c3', 'silv-s2-livestock-infrastructure-c4'], ['Infrastructure & Access']),
      dg('silv-s2-livestock-infrastructure-dg3', 'Shelters', ['silv-s2-livestock-infrastructure-c5'], ['Infrastructure & Access']),
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
    title: 'A clear read of surrounding landscape & vectors',
    shortTitle: 'Surrounding landscape & vectors',
    focusedQuestion:
      'How does the surrounding landscape affect livestock health, forage quality, and enterprise viability?',
    checklist: [
      ck(
        'silv-s2-landscape-context-c1',
        'Map surrounding land uses within 2km',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'silv-s2-landscape-context-c2',
        'Identify neighbouring agricultural practices - spray drift risk to pasture and animals',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'silv-s2-landscape-context-c3',
        'Assess biosecurity risk from neighbouring livestock operations',
        { feeds: ['silv-s4-animal-health', 's7-risk-register'] },
      ),
      ck(
        'silv-s2-landscape-context-c4',
        'Assess drinking water catchment contamination risk from surrounding landscape',
        { feeds: ['s4-water-strategy', 's7-risk-register'] },
      ),
      ck(
        'silv-s2-landscape-context-c5',
        'Identify landscape-scale weed pressure sources affecting pasture',
        { feeds: ['silv-s4-forage-improvement', 's7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s2-landscape-context-dg1', 'Surrounding land use & spray drift', ['silv-s2-landscape-context-c1', 'silv-s2-landscape-context-c2']),
      dg('silv-s2-landscape-context-dg2', 'Biosecurity & water contamination', ['silv-s2-landscape-context-c3', 'silv-s2-landscape-context-c4'], ['Ecology & Habitat']),
      dg('silv-s2-landscape-context-dg3', 'Weed pressure', ['silv-s2-landscape-context-c5']),
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
    title: 'A clear read of grazing history & animal impact',
    shortTitle: 'Grazing history & animal impact',
    focusedQuestion:
      'What is the grazing history of this land - and what legacy compaction, degradation, and weed burden must be addressed?',
    checklist: [
      ck(
        'silv-s2-grazing-history-c1',
        'Record historical stocking rates and species from all available sources',
        { feeds: ['silv-s4-paddock-layout', 'silv-s4-forage-improvement'] },
      ),
      ck(
        'silv-s2-grazing-history-c2',
        'Map compaction zones - depth profiling under historically grazed areas',
        { feeds: ['s5-soil-improvement', 'silv-s4-forage-improvement'] },
      ),
      ck(
        'silv-s2-grazing-history-c3',
        'Assess bare ground distribution and extent',
        { feeds: ['silv-s4-forage-improvement'] },
      ),
      ck(
        'silv-s2-grazing-history-c4',
        'Map weed invasion associated with historical overgrazing',
        { feeds: ['silv-s4-forage-improvement'] },
      ),
      ck(
        'silv-s2-grazing-history-c5',
        'Assess recovery potential of degraded zones based on soil biology and seed bank',
        { feeds: ['silv-s4-forage-improvement'] },
      ),
      ck(
        'silv-s2-grazing-history-c6',
        'Define restoration baseline - what must improve before target stocking is reached',
        { feeds: ['silv-s7-stocking-buildup', 's6-monitoring'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s2-grazing-history-dg1', 'Stocking history & compaction', ['silv-s2-grazing-history-c1', 'silv-s2-grazing-history-c2'], ['Soil']),
      dg('silv-s2-grazing-history-dg2', 'Bare ground & weed legacy', ['silv-s2-grazing-history-c3', 'silv-s2-grazing-history-c4']),
      dg('silv-s2-grazing-history-dg3', 'Recovery baseline', ['silv-s2-grazing-history-c5', 'silv-s2-grazing-history-c6']),
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
    title: 'A clear read of stock water availability & supply',
    shortTitle: 'Stock water availability & supply',
    focusedQuestion:
      'Is there sufficient water available to sustain target stocking numbers through the driest months?',
    checklist: [
      ckF(
        'silv-s3-stock-water-availability-c1',
        'Calculate stock water demand at target stocking by species and season',
        {
          formulaId: 'stock-water-demand',
          satisfiesWhenComputed: true,
          resultLabel: 'Stock water demand vs supply',
        },
      ),
      ck(
        'silv-s3-stock-water-availability-c2',
        'Assess all available water source yields through dry season',
        { feeds: ['silv-s4-stock-water-strategy'] },
      ),
      ck(
        'silv-s3-stock-water-availability-c3',
        'Map seasonal supply and demand - identify gap periods',
        { feeds: ['silv-s4-stock-water-strategy'] },
      ),
      ck(
        'silv-s3-stock-water-availability-c4',
        'Assess water source distribution relative to proposed paddock layout',
        { feeds: ['silv-s4-stock-water-strategy', 'silv-s4-paddock-layout'] },
      ),
      ck(
        'silv-s3-stock-water-availability-c5',
        'Define storage requirements to bridge seasonal gaps',
        { feeds: ['silv-s4-stock-water-strategy', 's5-water-infrastructure'] },
      ),
      ck(
        'silv-s3-stock-water-availability-c6',
        'Confirm maximum stocking supportable by available water',
        { feeds: ['silv-s4-paddock-layout'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s3-stock-water-availability-dg1', 'Demand & source yields', ['silv-s3-stock-water-availability-c1', 'silv-s3-stock-water-availability-c2'], ['Water & Hydrology']),
      dg('silv-s3-stock-water-availability-dg2', 'Seasonal gap & distribution', ['silv-s3-stock-water-availability-c3', 'silv-s3-stock-water-availability-c4'], ['Water & Hydrology']),
      dg('silv-s3-stock-water-availability-dg3', 'Storage & maximum stocking', ['silv-s3-stock-water-availability-c5', 'silv-s3-stock-water-availability-c6'], ['Water & Hydrology']),
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
    title: 'A clear read of soil compaction under grazing',
    shortTitle: 'Soil compaction under grazing',
    focusedQuestion:
      'Where is compaction present - and what does it tell us about pasture recovery potential and management requirements?',
    checklist: [
      ck(
        'silv-s3-soil-compaction-c1',
        'Conduct penetrometer testing across representative zones',
        { feeds: ['s5-soil-improvement'] },
      ),
      ck(
        'silv-s3-soil-compaction-c2',
        'Map compaction depth and severity by zone',
        { feeds: ['s5-soil-improvement'] },
      ),
      ck(
        'silv-s3-soil-compaction-c3',
        'Correlate compaction with historical stocking intensity',
        { feeds: ['silv-s4-forage-improvement'] },
      ),
      ck(
        'silv-s3-soil-compaction-c4',
        'Assess subsoil structure and drainage class under compacted zones',
        { feeds: ['s5-soil-improvement'] },
      ),
      ck(
        'silv-s3-soil-compaction-c5',
        'Define compaction remediation requirements per zone - biological, mechanical, or management',
        { feeds: ['s5-soil-improvement', 'silv-s4-forage-improvement'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s3-soil-compaction-dg1', 'Testing & mapping', ['silv-s3-soil-compaction-c1', 'silv-s3-soil-compaction-c2'], ['Soil']),
      dg('silv-s3-soil-compaction-dg2', 'Cause & subsoil structure', ['silv-s3-soil-compaction-c3', 'silv-s3-soil-compaction-c4'], ['Soil']),
      dg('silv-s3-soil-compaction-dg3', 'Remediation', ['silv-s3-soil-compaction-c5'], ['Soil']),
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
    title: 'A clear read of forage productivity & nutrition',
    shortTitle: 'Forage productivity & nutrition',
    focusedQuestion:
      'What is the current pasture yield per hectare, seasonal availability, and nutritional profile - and what gaps constrain the livestock enterprise?',
    checklist: [
      ck(
        'silv-s3-forage-productivity-c1',
        'Estimate dry matter production per hectare by zone and season',
        { feeds: ['silv-s4-forage-improvement', 'silv-s4-paddock-layout'] },
      ),
      ck(
        'silv-s3-forage-productivity-c2',
        'Assess nutritional quality of existing forage - protein, energy, mineral content where possible',
        { feeds: ['silv-s4-forage-improvement'] },
      ),
      ck(
        'silv-s3-forage-productivity-c3',
        'Identify seasonal nutritional gaps - energy deficit, mineral deficiency',
        { feeds: ['silv-s4-forage-improvement'] },
      ),
      ck(
        'silv-s3-forage-productivity-c4',
        'Define supplementary feeding requirements based on gaps',
        { feeds: ['silv-s4-forage-improvement', 'silv-s7-stocking-buildup'] },
      ),
      ckF(
        'silv-s3-forage-productivity-c5',
        'Calculate carrying capacity from forage productivity baseline',
        {
          formulaId: 'forage-carrying-capacity',
          satisfiesWhenComputed: true,
          resultLabel: 'Forage carrying capacity',
        },
      ),
    ],
    decisionGroups: [
      dg('silv-s3-forage-productivity-dg1', 'Yield & quality', ['silv-s3-forage-productivity-c1', 'silv-s3-forage-productivity-c2'], ['Vegetation & Succession']),
      dg('silv-s3-forage-productivity-dg2', 'Gaps & supplementation', ['silv-s3-forage-productivity-c3', 'silv-s3-forage-productivity-c4']),
      dg('silv-s3-forage-productivity-dg3', 'Carrying capacity', ['silv-s3-forage-productivity-c5']),
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
    title: 'A sound paddock layout & rotational grazing framework',
    shortTitle: 'Paddock layout & rotational grazing framework',
    focusedQuestion:
      'How many paddocks, what size, and what rotation interval - designed to maximise pasture recovery and land improvement?',
    checklist: [
      ck(
        'silv-s4-paddock-layout-c1',
        'Define number of paddocks based on target species, numbers, and rest period',
        { feeds: ['silv-s5-fencing'] },
      ),
      ck(
        'silv-s4-paddock-layout-c2',
        'Map paddock boundaries relative to topography and existing fencing',
        { feeds: ['silv-s5-fencing', 'silv-s5-stock-water-distribution'] },
      ),
      ck(
        'silv-s4-paddock-layout-c3',
        'Define rotation interval and minimum rest period per paddock',
        { feeds: ['silv-s6-pasture-monitoring', 'silv-s7-pasture-spelling'] },
      ),
      ckF(
        'silv-s4-paddock-layout-c4',
        'Define stocking density per paddock at defined rotation',
        {
          formulaId: 'paddock-stocking-density',
          // Advisory: surfaces a recommended per-paddock stocking figure but
          // does NOT auto-satisfy - the steward still sets the density.
          satisfiesWhenComputed: false,
          resultLabel: 'Recommended stocking density per paddock',
        },
      ),
      ckF(
        'silv-s4-paddock-layout-c5',
        'Calculate total carrying capacity of defined paddock system',
        {
          formulaId: 'paddock-system-capacity',
          satisfiesWhenComputed: true,
          resultLabel: 'Total paddock-system carrying capacity',
        },
      ),
      ck(
        'silv-s4-paddock-layout-c6',
        'Confirm paddock layout is achievable with available fencing budget',
        { feeds: ['s7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s4-paddock-layout-dg1', 'Paddock count & boundaries', ['silv-s4-paddock-layout-c1', 'silv-s4-paddock-layout-c2'], ['Terrain & Topography']),
      dg('silv-s4-paddock-layout-dg2', 'Rotation & density', ['silv-s4-paddock-layout-c3', 'silv-s4-paddock-layout-c4']),
      dg('silv-s4-paddock-layout-dg3', 'Capacity & budget', ['silv-s4-paddock-layout-c5', 'silv-s4-paddock-layout-c6']),
    ],
    completionGate:
      'Paddock layout and rotational grazing framework approved. Carrying capacity confirmed.',
    actHandoff: 'Paddock Layout & Rotational Grazing Framework Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Pasture cover height before paddock entry and after exit', frequency: 'every rotation' },
        { metric: 'Rest period days achieved vs. target', frequency: 'per rotation' },
        { metric: 'Pasture recovery rate by paddock', frequency: 'seasonal' },
      ],
      triggers: [
        'Cover below 8cm at planned move-in date -> extend rest period',
        'Pasture not recovering to 20cm+ after standard rest -> investigate soil compaction, stocking rate, or species',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'silv-s4-stock-water-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A reliable stock water infrastructure strategy',
    shortTitle: 'Stock water infrastructure strategy',
    focusedQuestion:
      'How will potable stock water be delivered reliably to all paddocks in all rotations and all seasons?',
    checklist: [
      ck(
        'silv-s4-stock-water-strategy-c1',
        'Define primary water source for stock water system',
        { feeds: ['silv-s5-stock-water-distribution'] },
      ),
      ck(
        'silv-s4-stock-water-strategy-c2',
        'Design distribution network - pipelines, gravity, pumping',
        { feeds: ['silv-s5-stock-water-distribution', 's7-resource-plan'] },
      ),
      ck(
        'silv-s4-stock-water-strategy-c3',
        'Specify trough locations and types for each paddock',
        { feeds: ['silv-s5-stock-water-distribution'] },
      ),
      ck(
        'silv-s4-stock-water-strategy-c4',
        'Define water point density - maximum distance from water per species',
        { feeds: ['silv-s5-stock-water-distribution'] },
      ),
      ck(
        'silv-s4-stock-water-strategy-c5',
        'Define emergency water supply if primary system fails',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'silv-s4-stock-water-strategy-c6',
        'Confirm system capacity against seasonal demand assessment',
        { feeds: ['silv-s7-livestock-establishment'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s4-stock-water-strategy-dg1', 'Source & distribution', ['silv-s4-stock-water-strategy-c1', 'silv-s4-stock-water-strategy-c2'], ['Water & Hydrology']),
      dg('silv-s4-stock-water-strategy-dg2', 'Troughs & water-point density', ['silv-s4-stock-water-strategy-c3', 'silv-s4-stock-water-strategy-c4'], ['Water & Hydrology']),
      dg('silv-s4-stock-water-strategy-dg3', 'Emergency & capacity', ['silv-s4-stock-water-strategy-c5', 'silv-s4-stock-water-strategy-c6'], ['Water & Hydrology']),
    ],
    completionGate:
      'Stock water infrastructure strategy approved. All paddocks confirmed with reliable water access.',
    actHandoff: 'Stock Water Infrastructure Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Trough fill speed and level', frequency: 'weekly during summer' },
        { metric: 'Pump operating hours vs. plan', frequency: 'monthly' },
        { metric: 'Water quality at troughs', frequency: 'quarterly' },
      ],
      triggers: [
        'Trough empty during normal operation -> check float valve, supply line',
        'Water quality failure -> shut down affected trough, investigate source',
        'Pump overuse -> check for leaks',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 'silv-s4-forage-improvement',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound forage & pasture improvement strategy',
    shortTitle: 'Forage & pasture improvement strategy',
    focusedQuestion:
      'How will pasture composition, fertility, and productivity be improved to meet enterprise targets?',
    checklist: [
      ck(
        'silv-s4-forage-improvement-c1',
        'Define target forage species mix by zone - productive and ecologically diverse',
        { feeds: ['s5-soil-improvement', 'silv-s6-pasture-monitoring'] },
      ),
      ck(
        'silv-s4-forage-improvement-c2',
        'Define overseeding methodology - direct drilling, broadcasting, cultivation',
        { feeds: ['s7-phase1', 's7-resource-plan'] },
      ),
      ck(
        'silv-s4-forage-improvement-c3',
        'Define fertility input strategy - animal impact, composting, mineral amendments',
        { feeds: ['s5-soil-improvement', 's7-resource-plan'] },
      ),
      ck(
        'silv-s4-forage-improvement-c4',
        'Define weed control approach - consistent with land improvement philosophy',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'silv-s4-forage-improvement-c5',
        'Define pasture improvement sequence - priority zones first',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'silv-s4-forage-improvement-c6',
        'Set measurable pasture improvement targets with timeframes',
        { feeds: ['silv-s6-pasture-monitoring'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s4-forage-improvement-dg1', 'Species mix & overseeding', ['silv-s4-forage-improvement-c1', 'silv-s4-forage-improvement-c2'], ['Vegetation & Succession']),
      dg('silv-s4-forage-improvement-dg2', 'Fertility & weed control', ['silv-s4-forage-improvement-c3', 'silv-s4-forage-improvement-c4'], ['Soil']),
      dg('silv-s4-forage-improvement-dg3', 'Sequence & targets', ['silv-s4-forage-improvement-c5', 'silv-s4-forage-improvement-c6']),
    ],
    completionGate:
      'Forage and pasture improvement strategy approved. Target species, fertility, and improvement sequence confirmed.',
    actHandoff: 'Forage & Pasture Improvement Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Forage species composition by zone (pasture assessment)', frequency: 'seasonal' },
        { metric: 'Pasture dry-matter productivity vs. target (per improvement zone)', frequency: 'seasonal' },
        { metric: 'Bare-ground and weed cover % in priority zones', frequency: 'seasonal' },
      ],
      triggers: [
        'Sown forage species failing to establish in a priority zone -> review overseeding method, soil fertility, grazing timing',
        'Weed cover rising despite control program -> reassess weed strategy and grazing pressure',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'silv-s4-tree-integration',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A coherent tree integration strategy',
    shortTitle: 'Tree integration strategy',
    focusedQuestion:
      'Which tree species will be integrated into the grazing system, where, and how will they be established and protected?',
    checklist: [
      ck(
        'silv-s4-tree-integration-c1',
        'Define tree species for silvopasture integration - shade, fodder, timber, fruit, nitrogen-fixing',
        { feeds: ['silv-s5-tree-planting'] },
      ),
      ck(
        'silv-s4-tree-integration-c2',
        'Map tree placement relative to paddock framework - rows, scattered, clustered',
        { feeds: ['silv-s5-tree-planting'] },
      ),
      ck(
        'silv-s4-tree-integration-c3',
        'Define tree density and spacing',
        { feeds: ['silv-s5-tree-planting'] },
      ),
      ck(
        'silv-s4-tree-integration-c4',
        'Define grazing management to protect establishing trees - timing, temporary exclusion',
        { feeds: ['silv-s5-tree-planting', 'silv-s7-stocking-buildup'] },
      ),
      ck(
        'silv-s4-tree-integration-c5',
        'Define long-term canopy management and coppicing strategy',
        { feeds: ['silv-s6-adaptive-management'] },
      ),
      ck(
        'silv-s4-tree-integration-c6',
        'Confirm species selection is consistent with land improvement philosophy and climate',
        { feeds: ['silv-s5-tree-planting'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s4-tree-integration-dg1', 'Species & placement', ['silv-s4-tree-integration-c1', 'silv-s4-tree-integration-c2'], ['Vegetation & Succession']),
      dg('silv-s4-tree-integration-dg2', 'Density & protection', ['silv-s4-tree-integration-c3', 'silv-s4-tree-integration-c4'], ['Vegetation & Succession']),
      dg('silv-s4-tree-integration-dg3', 'Canopy & fit', ['silv-s4-tree-integration-c5', 'silv-s4-tree-integration-c6']),
    ],
    completionGate:
      'Tree integration strategy approved. Species, placement, density, and protection confirmed.',
    actHandoff: 'Tree Integration Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Establishing-tree survival rate by planting zone', frequency: 'annual' },
        { metric: 'Browse and rub damage on protected trees (inspection)', frequency: 'seasonal' },
        { metric: 'Canopy growth vs. establishment plan', frequency: 'annual' },
      ],
      triggers: [
        'Tree survival below target in a zone -> review species choice, protection, grazing-exclusion timing',
        'Browse damage on establishing trees -> extend temporary exclusion or strengthen guards',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'silv-s4-animal-health',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound animal health & veterinary protocol',
    shortTitle: 'Animal health & veterinary protocol',
    focusedQuestion:
      'How will routine animal health, preventive care, and emergency veterinary access be managed?',
    checklist: [
      ck(
        'silv-s4-animal-health-c1',
        'Define routine health program per species - vaccination, drenching, parasite management',
        { feeds: ['silv-s6-animal-health-monitoring', 's7-resource-plan'] },
      ),
      ck(
        'silv-s4-animal-health-c2',
        'Define preventive care calendar - fertility, condition scoring, hoof care',
        { feeds: ['silv-s6-animal-health-monitoring'] },
      ),
      ck(
        'silv-s4-animal-health-c3',
        'Identify nearest veterinary service and emergency response time',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'silv-s4-animal-health-c4',
        'Define isolation facility requirements for sick or injured animals',
        { feeds: ['silv-s5-shelters-handling'] },
      ),
      ck(
        'silv-s4-animal-health-c5',
        'Define mortality management protocol',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'silv-s4-animal-health-c6',
        'Confirm all handling facilities support low-stress routine health procedures',
        { feeds: ['silv-s5-shelters-handling'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s4-animal-health-dg1', 'Routine & preventive care', ['silv-s4-animal-health-c1', 'silv-s4-animal-health-c2']),
      dg('silv-s4-animal-health-dg2', 'Vet access & isolation', ['silv-s4-animal-health-c3', 'silv-s4-animal-health-c4']),
      dg('silv-s4-animal-health-dg3', 'Mortality & handling', ['silv-s4-animal-health-c5', 'silv-s4-animal-health-c6']),
    ],
    completionGate:
      'Animal health and veterinary protocol approved. Emergency vet access confirmed.',
    actHandoff: 'Animal Health & Veterinary Protocol Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Body condition score by mob', frequency: 'monthly' },
        { metric: 'Parasite burden indicators - FEC or dag scoring', frequency: 'per health cycle' },
        { metric: 'Mortality and morbidity rate vs. baseline', frequency: 'per season' },
      ],
      triggers: [
        'Condition score falling below target for a class -> review feed, parasite burden, husbandry',
        'Mortality or morbidity above baseline -> trigger veterinary investigation and isolation protocol',
      ],
      feeds: 'animals-livestock',
    },
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'silv-s5-fencing',
    stratumId: 's5-system-design',
    ref: 'SILV-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working fencing & paddock infrastructure design',
    shortTitle: 'Fencing & paddock infrastructure design',
    focusedQuestion:
      'How will paddock subdivision, gates, and boundary fencing be designed for the defined rotation system?',
    checklist: [
      ck(
        'silv-s5-fencing-c1',
        'Design internal subdivision fencing to defined paddock layout',
        { feeds: ['s7-phase1', 'silv-s7-livestock-establishment'] },
      ),
      ck(
        'silv-s5-fencing-c2',
        'Specify fence type per location - permanent, semi-permanent, temporary electric',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s5-fencing-c3',
        'Design gate placement - all paddocks accessible from laneway without crossing other paddocks',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'silv-s5-fencing-c4',
        'Design boundary fence upgrades where required for species being run',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s5-fencing-c5',
        'Specify water crossing points and wildlife crossings in fence lines',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'silv-s5-fencing-c6',
        'Define fencing installation sequence - align with stocking buildup plan',
        { feeds: ['silv-s7-livestock-establishment', 'silv-s7-stocking-buildup'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s5-fencing-dg1', 'Subdivision & type', ['silv-s5-fencing-c1', 'silv-s5-fencing-c2'], ['Infrastructure & Access']),
      dg('silv-s5-fencing-dg2', 'Gates & boundary', ['silv-s5-fencing-c3', 'silv-s5-fencing-c4'], ['Infrastructure & Access']),
      dg('silv-s5-fencing-dg3', 'Crossings & sequence', ['silv-s5-fencing-c5', 'silv-s5-fencing-c6'], ['Infrastructure & Access']),
    ],
    completionGate:
      'Fencing and paddock design approved. All paddocks accessible without cross-paddock movement.',
    actHandoff: 'Fencing & Paddock Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 paddock layout and rotational grazing framework (silv-s4-paddock-layout).',
    monitoringProtocol: {
      indicators: [
        { metric: 'Share of paddocks reachable from the laneway without crossing another paddock', frequency: 'per rotation' },
        { metric: 'Fence integrity check pass rate per inspection round (breakouts, sagging, failed energiser sections)', frequency: 'per inspection round' },
        { metric: 'Gate and crossing function rate during stock moves (delays or refusals logged)', frequency: 'observed during movement' },
      ],
      triggers: [
        'Repeat stock breakout at the same fence section -> upgrade fence type or rebuild that boundary segment',
        'A paddock becomes reachable only by crossing another -> revise laneway or gate placement for that block',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'silv-s5-stock-water-distribution',
    stratumId: 's5-system-design',
    ref: 'SILV-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working stock water distribution network',
    shortTitle: 'Stock water distribution network',
    focusedQuestion:
      'How will stock water be distributed from source to all paddock troughs?',
    checklist: [
      ck(
        'silv-s5-stock-water-distribution-c1',
        'Design pipeline network from primary source to all paddock water points',
        { feeds: ['s7-phase1', 's7-resource-plan'] },
      ),
      ck(
        'silv-s5-stock-water-distribution-c2',
        'Specify trough types and sizes per species and paddock',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s5-stock-water-distribution-c3',
        'Design float valve, overflow, and drainage for each trough',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s5-stock-water-distribution-c4',
        'Design solar or gravity pressure system as applicable',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s5-stock-water-distribution-c5',
        'Specify pipe materials and burial depth',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s5-stock-water-distribution-c6',
        'Confirm all troughs meet species welfare water access standard',
        { feeds: ['silv-s7-livestock-establishment'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s5-stock-water-distribution-dg1', 'Pipeline & troughs', ['silv-s5-stock-water-distribution-c1', 'silv-s5-stock-water-distribution-c2'], ['Water & Hydrology']),
      dg('silv-s5-stock-water-distribution-dg2', 'Valves & pressure', ['silv-s5-stock-water-distribution-c3', 'silv-s5-stock-water-distribution-c4'], ['Water & Hydrology']),
      dg('silv-s5-stock-water-distribution-dg3', 'Materials & welfare', ['silv-s5-stock-water-distribution-c5', 'silv-s5-stock-water-distribution-c6'], ['Water & Hydrology']),
    ],
    completionGate:
      'Stock water distribution network design approved. All paddocks confirmed with welfare-standard water access.',
    actHandoff: 'Stock Water Distribution Network Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 stock water infrastructure strategy (silv-s4-stock-water-strategy).',
    monitoringProtocol: {
      indicators: [
        { metric: 'Share of paddock troughs delivering water within the welfare access standard', frequency: 'monthly' },
        { metric: 'Trough refill and flow rate against target during peak demand periods', frequency: 'weekly during peak demand' },
        { metric: 'Leak, overflow, or pressure-loss events logged per pipeline section', frequency: 'logged as events occur' },
      ],
      triggers: [
        'A trough drops below the welfare-standard water access rate -> inspect float valve, pressure, and pipeline section',
        'Repeat leak or pressure loss on the same line -> review pipe material, burial depth, or pump sizing for that run',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 'silv-s5-shelters-handling',
    stratumId: 's5-system-design',
    ref: 'SILV-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed livestock shelters & handling facilities',
    shortTitle: 'Livestock shelters & handling facilities',
    focusedQuestion:
      'How will yards, crushes, laneways, shade shelters, and isolation facilities be designed?',
    checklist: [
      ck(
        'silv-s5-shelters-handling-c1',
        'Design yards - capacity for target stocking, flow from laneway, low-stress layout',
        { feeds: ['s7-phase1', 'silv-s7-livestock-establishment'] },
      ),
      ck(
        'silv-s5-shelters-handling-c2',
        'Design crush and race - species-appropriate, safe for handlers and animals',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s5-shelters-handling-c3',
        'Design shade shelter placement per paddock - species-specific requirements',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'silv-s5-shelters-handling-c4',
        'Design isolation pen - separate water, shelter, accessible for treatment',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'silv-s5-shelters-handling-c5',
        'Confirm all facilities meet animal welfare standards defined in Stratum 1',
        { feeds: ['silv-s7-livestock-establishment'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s5-shelters-handling-dg1', 'Yards & crush', ['silv-s5-shelters-handling-c1', 'silv-s5-shelters-handling-c2'], ['Infrastructure & Access']),
      dg('silv-s5-shelters-handling-dg2', 'Shade & isolation', ['silv-s5-shelters-handling-c3', 'silv-s5-shelters-handling-c4'], ['Infrastructure & Access']),
      dg('silv-s5-shelters-handling-dg3', 'Welfare confirmation', ['silv-s5-shelters-handling-c5']),
    ],
    completionGate:
      'Livestock shelters and handling facilities design approved. Welfare standard compliance confirmed.',
    actHandoff: 'Livestock Shelters & Handling Facilities Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 paddock layout and rotational grazing framework (silv-s4-paddock-layout).',
    monitoringProtocol: {
      indicators: [
        { metric: 'Yard and race throughput against design capacity during handling events (animals per session, hold-ups logged)', frequency: 'per handling event' },
        { metric: 'Shade shelter usage and heat-stress signs observed per paddock through hot periods', frequency: 'observed during hot periods' },
        { metric: 'Isolation pen readiness check pass rate (water, shelter, treatment access available when needed)', frequency: 'per readiness check' },
      ],
      triggers: [
        'Heat-stress signs observed where shade is short -> add or reposition shade shelter for that paddock',
        'Yard or race flow stalls or handler-safety incident recurs -> revise low-stress layout or race design',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'silv-s5-tree-planting',
    stratumId: 's5-system-design',
    ref: 'SILV-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A ready tree planting & protection plan',
    shortTitle: 'Tree planting & protection plan',
    focusedQuestion:
      'How will trees be established in the grazing system - species placement, guards, and protection from stock?',
    checklist: [
      ck(
        'silv-s5-tree-planting-c1',
        'Map tree planting locations within paddock framework per Stratum 4 strategy',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'silv-s5-tree-planting-c2',
        'Specify planting method - tube stock, direct seeding, transplant',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s5-tree-planting-c3',
        'Design tree protection - guards, temporary fencing, repellent',
        { feeds: ['s7-phase1', 's7-resource-plan'] },
      ),
      ck(
        'silv-s5-tree-planting-c4',
        'Design establishment irrigation where required',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s5-tree-planting-c5',
        'Specify planting sequence - align with paddock rotation to allow recovery time',
        { feeds: ['s7-phase1', 'silv-s7-pasture-spelling'] },
      ),
      ck(
        'silv-s5-tree-planting-c6',
        'Define grazing exclusion period per tree species until establishment is confirmed',
        { feeds: ['silv-s7-stocking-buildup'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s5-tree-planting-dg1', 'Locations & method', ['silv-s5-tree-planting-c1', 'silv-s5-tree-planting-c2'], ['Vegetation & Succession']),
      dg('silv-s5-tree-planting-dg2', 'Protection & irrigation', ['silv-s5-tree-planting-c3', 'silv-s5-tree-planting-c4']),
      dg('silv-s5-tree-planting-dg3', 'Sequence & exclusion', ['silv-s5-tree-planting-c5', 'silv-s5-tree-planting-c6']),
    ],
    completionGate:
      'Tree planting and protection plan approved. Establishment sequence aligned with paddock rotation.',
    actHandoff: 'Silvopasture Tree Planting & Protection Plan',
    buildsOnDisplay:
      'Builds on the Stratum 4 tree integration strategy (silv-s4-tree-integration).',
    monitoringProtocol: {
      indicators: [
        { metric: 'Tree establishment and survival rate per planting zone', frequency: 'at 6 and 12 months' },
        { metric: 'Browse damage percentage on young trees while guards or exclusion remain in place', frequency: 'monthly during establishment' },
        { metric: 'Share of planted zones still within their defined grazing exclusion period', frequency: 'per rotation' },
      ],
      triggers: [
        'Browse damage rises above the set tolerance on young trees -> review guard type, fencing, or timing of stock access',
        'Establishment failure in a planting zone -> review species choice, protection, or establishment irrigation for that zone',
      ],
      feeds: 'plants-food',
    },
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'silv-s6-pasture-monitoring',
    stratumId: 's6-integration-design',
    ref: 'SILV-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working livestock & pasture monitoring protocol',
    shortTitle: 'Livestock & pasture monitoring protocol',
    focusedQuestion:
      'How will pasture condition, grazing impact, and stock performance be tracked to drive rotation decisions?',
    checklist: [
      ck(
        'silv-s6-pasture-monitoring-c1',
        'Define pasture condition scoring method - cover, species composition, height before and after grazing',
        { feeds: ['s7-phase1', 'silv-s7-stocking-buildup'] },
      ),
      ck(
        'silv-s6-pasture-monitoring-c2',
        'Define monitoring frequency - pre- and post-grazing assessment per paddock',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s6-pasture-monitoring-c3',
        'Design grazing impact assessment - bare ground, compaction, species shift',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'silv-s6-pasture-monitoring-c4',
        'Define pasture recovery assessment - recovery criteria before re-entry',
        { feeds: ['silv-s7-pasture-spelling'] },
      ),
      ck(
        'silv-s6-pasture-monitoring-c5',
        'Specify data recording system - simple paddock diary or digital log',
        { feeds: ['s7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s6-pasture-monitoring-dg1', 'Condition scoring & frequency', ['silv-s6-pasture-monitoring-c1', 'silv-s6-pasture-monitoring-c2'], ['Vegetation & Succession']),
      dg('silv-s6-pasture-monitoring-dg2', 'Impact & recovery', ['silv-s6-pasture-monitoring-c3', 'silv-s6-pasture-monitoring-c4'], ['Soil']),
      dg('silv-s6-pasture-monitoring-dg3', 'Recording', ['silv-s6-pasture-monitoring-c5']),
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
    title: 'A working animal health monitoring system',
    shortTitle: 'Animal health monitoring system',
    focusedQuestion:
      'How will livestock health indicators be tracked - and what triggers a veterinary response?',
    checklist: [
      ck(
        'silv-s6-animal-health-monitoring-c1',
        'Define health indicators per species - body condition score, coat condition, mobility, behaviour',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'silv-s6-animal-health-monitoring-c2',
        'Define monitoring frequency - weekly minimum, daily for high-risk periods',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s6-animal-health-monitoring-c3',
        'Define veterinary trigger thresholds - what condition score or symptom requires vet contact',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'silv-s6-animal-health-monitoring-c4',
        'Design health recording system - individual animal and mob records',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-s6-animal-health-monitoring-c5',
        'Define seasonal health risk calendar - drenching, vaccination, fertility monitoring windows',
        { feeds: ['s7-resource-plan', 's7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s6-animal-health-monitoring-dg1', 'Indicators & frequency', ['silv-s6-animal-health-monitoring-c1', 'silv-s6-animal-health-monitoring-c2']),
      dg('silv-s6-animal-health-monitoring-dg2', 'Triggers & records', ['silv-s6-animal-health-monitoring-c3', 'silv-s6-animal-health-monitoring-c4']),
      dg('silv-s6-animal-health-monitoring-dg3', 'Seasonal calendar', ['silv-s6-animal-health-monitoring-c5']),
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
    title: 'A sound adaptive management protocol',
    shortTitle: 'Adaptive management protocol',
    focusedQuestion:
      'How will pasture monitoring data drive stocking rate and rotation adjustments - completing the regenerative grazing feedback loop?',
    checklist: [
      ck(
        'silv-s6-adaptive-management-c1',
        'Define stocking rate review process - triggered by pasture condition data, not calendar',
        { feeds: ['silv-s7-stocking-buildup'] },
      ),
      ck(
        'silv-s6-adaptive-management-c2',
        'Define rotation adjustment triggers - what pasture condition defers or extends a rotation',
        { feeds: ['silv-s7-pasture-spelling'] },
      ),
      ck(
        'silv-s6-adaptive-management-c3',
        'Define destocking trigger - what pasture condition requires stocking reduction',
        { feeds: ['s7-risk-register', 'silv-s7-stocking-buildup'] },
      ),
      ck(
        'silv-s6-adaptive-management-c4',
        'Define annual enterprise review - pasture trend, animal performance, tree establishment progress',
        { feeds: ['silv-s7-financial-viability'] },
      ),
      ck(
        'silv-s6-adaptive-management-c5',
        'Document all management changes with date, trigger, and outcome',
        { feeds: ['s7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('silv-s6-adaptive-management-dg1', 'Stocking & rotation triggers', ['silv-s6-adaptive-management-c1', 'silv-s6-adaptive-management-c2']),
      dg('silv-s6-adaptive-management-dg2', 'Destocking & annual review', ['silv-s6-adaptive-management-c3', 'silv-s6-adaptive-management-c4']),
      dg('silv-s6-adaptive-management-dg3', 'Documentation', ['silv-s6-adaptive-management-c5']),
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
    title: 'A sequenced livestock establishment plan',
    shortTitle: 'Livestock establishment plan',
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
    decisionGroups: [
      dg('silv-s7-livestock-establishment-dg1', 'Infrastructure readiness gates', ['silv-s7-livestock-establishment-c1', 'silv-s7-livestock-establishment-c2', 'silv-s7-livestock-establishment-c3'], ['Infrastructure & Access']),
      dg('silv-s7-livestock-establishment-dg2', 'Go/no-go & sourcing', ['silv-s7-livestock-establishment-c4', 'silv-s7-livestock-establishment-c5']),
    ],
    completionGate:
      'Livestock establishment sequence approved. All infrastructure go/no-go tests defined. No livestock arrive before all infrastructure passes.',
    actHandoff: 'Livestock Establishment Sequence',
    progressTracking: {
      milestones: [
        { metric: 'Fencing / water / yards go/no-go passed before livestock arrive', cadence: 'per infrastructure category, before stocking' },
        { metric: 'Livestock sourcing (breed / vendor / transport / quarantine) on schedule', cadence: 'per sourcing batch' },
      ],
    },
    scopeNotes:
      'Hard gate: no livestock arrive before fencing, water, and handling facilities all pass independent go/no-go tests.',
  }),
  obj({
    id: 'silv-s7-stocking-buildup',
    stratumId: 's7-phasing-resourcing',
    ref: 'SILV-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A staged stocking buildup & pasture readiness plan',
    shortTitle: 'Stocking buildup & pasture readiness plan',
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
    decisionGroups: [
      dg('silv-s7-stocking-buildup-dg1', 'Initial rate & increase triggers', ['silv-s7-stocking-buildup-c1', 'silv-s7-stocking-buildup-c2']),
      dg('silv-s7-stocking-buildup-dg2', 'Increase limits & target', ['silv-s7-stocking-buildup-c3', 'silv-s7-stocking-buildup-c4']),
      dg('silv-s7-stocking-buildup-dg3', 'Tree-protection fit', ['silv-s7-stocking-buildup-c5']),
    ],
    completionGate:
      'Stocking buildup plan approved. All stocking increases tied to pasture condition monitoring, not calendar.',
    actHandoff: 'Stocking Buildup & Pasture Readiness Plan',
    progressTracking: {
      milestones: [
        { metric: 'Stocking rate vs. carrying-capacity ceiling each review cycle', cadence: 'per review cycle' },
        { metric: 'Stocking increases tied to pasture-condition triggers, not calendar', cadence: 'per review cycle' },
      ],
    },
  }),
  obj({
    id: 'silv-s7-financial-viability',
    stratumId: 's7-phasing-resourcing',
    ref: 'SILV-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound enterprise financial viability plan',
    shortTitle: 'Enterprise financial viability plan',
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
      ckF(
        'silv-s7-financial-viability-c4',
        'Calculate break-even point at defined stocking level and market prices',
        {
          // Break-even MATH ONLY (infrastructure / stocking cost vs revenue
          // timeline). No advance-sale / CSRA / salam framing - global covenant.
          formulaId: 'enterprise-break-even',
          satisfiesWhenComputed: true,
          resultLabel: 'Break-even point',
        },
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
    decisionGroups: [
      dg('silv-s7-financial-viability-dg1', 'Infrastructure & stock costs', ['silv-s7-financial-viability-c1', 'silv-s7-financial-viability-c2']),
      dg('silv-s7-financial-viability-dg2', 'Revenue & break-even', ['silv-s7-financial-viability-c3', 'silv-s7-financial-viability-c4']),
      dg('silv-s7-financial-viability-dg3', 'Viability threshold & review', ['silv-s7-financial-viability-c5', 'silv-s7-financial-viability-c6']),
    ],
    completionGate:
      'Enterprise financial viability plan approved. Break-even confirmed.',
    actHandoff: 'Enterprise Financial Viability Plan',
    progressTracking: {
      milestones: [
        { metric: 'Infrastructure + stocking spend vs. Phase 1 budget', cadence: 'per establishment phase' },
        { metric: 'Revenue vs. timeline toward break-even at target stocking', cadence: 'monthly once sales begin' },
      ],
    },
  }),
  obj({
    id: 'silv-s7-pasture-spelling',
    stratumId: 's7-phasing-resourcing',
    ref: 'SILV-S7.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound pasture spelling & recovery protocol',
    shortTitle: 'Pasture spelling & recovery protocol',
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
    decisionGroups: [
      dg('silv-s7-pasture-spelling-dg1', 'Rest periods & recovery indicator', ['silv-s7-pasture-spelling-c1', 'silv-s7-pasture-spelling-c2'], ['Vegetation & Succession']),
      dg('silv-s7-pasture-spelling-dg2', 'Seasonal & emergency spelling', ['silv-s7-pasture-spelling-c3', 'silv-s7-pasture-spelling-c4']),
      dg('silv-s7-pasture-spelling-dg3', 'Tree-protection fit', ['silv-s7-pasture-spelling-c5']),
    ],
    completionGate:
      'Pasture spelling and recovery protocol approved. Re-entry indicators defined. All rotation decisions tied to recovery data.',
    actHandoff: 'Pasture Spelling & Recovery Protocol',
    progressTracking: {
      milestones: [
        { metric: 'Paddock rest periods met vs. minimum-rest protocol', cadence: 'per rotation' },
        { metric: 'Re-entry only after recovery indicator (height / cover / species) confirmed', cadence: 'per paddock re-entry' },
      ],
    },
  }),
];

// ===========================================================================
// SILVOPASTURE SECONDARY LAYER (derived 2026-05-31)
//
// No operator source document exists for the Silvopasture secondary. Per the
// operator's explicit, scoped authorization ("Missing Silvopasture as secondary
// doc but you can use the spec and expertise to fill the gap"), this layer is
// DERIVED from the Catalogue Authoring Standards and silvopasture domain
// expertise - analogous to the Wellness-secondary derive+author ruling. The
// standing "catalogue docs operator-provided, don't invent content" rule is
// overridden ONLY for this secondary, at the chosen depth: "additive + universal
// patches" (5 additive objectives PLUS PatchRecords that inject livestock items
// into shared universal objectives - richer integration, like Residential).
//
// A Silvopasture SECONDARY answers: "this enterprise is primarily something else
// (regen farm, orchard/food forest, homestead) and is now adding integrated
// grazing livestock under trees/pasture." It contributes the livestock-specific
// reading + design that a non-livestock primary lacks, and patches the shared
// universal water / access / soil objectives so livestock demand is folded into
// those whole-of-site decisions rather than bolted on.
//
// Stratum numbering is DIRECT for secondaries (S1 -> s1 ... S4 -> s4); no Tier+1
// shift. Refs use the SILV-S<stratum>.20+ band, collision-free against the
// primary layer (primary maxes at S1.6 / S3.5 / S4.8). Patch refs are
// SILV>U-S<n>.<n>; injected checklist ids are <targetObjectiveId>-silv-<n>.
//
// Amanah Gate: integrated grazing = halal animal husbandry / land stewardship.
// SILV-S4.22 makes humane + halal handling and slaughter-pathway intent explicit.
// No advance sale, no financial product, no riba/gharar/CSRA surface.
//
// source: 'secondary', sourceTypeId: 'silvopasture', secondaryClass: 'additive'
// on every additive objective. ASCII-only copy.
// ===========================================================================

export const SILVOPASTURE_SECONDARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'silv-sec-s1-livestock-intent',
    stratumId: 's1-project-foundation',
    ref: 'SILV-S1.20',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A clear livestock enterprise intent & integration rationale',
    shortTitle: 'Livestock enterprise intent & integration rationale',
    focusedQuestion:
      'Why is grazing livestock being integrated into this primary enterprise, and what role does it serve - production, land management, or both?',
    checklist: [
      ck(
        'silv-sec-s1-livestock-intent-c1',
        'Define the integration rationale - grazing as a land-management tool, a production enterprise, or both',
        { feeds: ['s4-direction', 'silv-sec-s4-grazing-design'] },
      ),
      ck(
        'silv-sec-s1-livestock-intent-c2',
        'Identify candidate species and classes of stock under consideration - ruminants, poultry, mixed',
        { feeds: ['silv-sec-s4-grazing-design', 'silv-sec-s4-husbandry-framework'] },
      ),
      ck(
        'silv-sec-s1-livestock-intent-c3',
        'Define how livestock relate to the primary enterprise - complementary, supplementary, or competing for land',
        { feeds: ['s4-direction'] },
      ),
      ck(
        'silv-sec-s1-livestock-intent-c4',
        'Identify operator livestock experience and labour availability for daily stock care',
        { feeds: ['silv-sec-s4-husbandry-framework', 's7-resource-plan'] },
      ),
      ck(
        'silv-sec-s1-livestock-intent-c5',
        'Confirm livestock intent is compatible with the primary enterprise vision and site scale',
        { feeds: ['s4-direction'] },
      ),
    ],
    decisionGroups: [
      dg('silv-sec-s1-livestock-intent-dg1', 'Rationale & candidate species', ['silv-sec-s1-livestock-intent-c1', 'silv-sec-s1-livestock-intent-c2']),
      dg('silv-sec-s1-livestock-intent-dg2', 'Relationship & labour', ['silv-sec-s1-livestock-intent-c3', 'silv-sec-s1-livestock-intent-c4']),
      dg('silv-sec-s1-livestock-intent-dg3', 'Compatibility', ['silv-sec-s1-livestock-intent-c5']),
    ],
    completionGate:
      'Livestock enterprise intent and integration rationale defined. Candidate species identified. Labour and experience baseline confirmed.',
    actHandoff: 'Livestock Enterprise Intent & Integration Brief',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'silv-sec-s3-forage-survey',
    stratumId: 's3-systems-reading',
    ref: 'SILV-S3.20',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    // 2026-06-16 Tier-2 (Stratum-3) Reception restructure: this config's
    // resolved Systems-Reading set is EXACTLY the five spec surveys (2.1-2.5),
    // and the graduated standalone 2.5 'silv-sec-s3-stock-water' replaces forage
    // as the silvopasture S3 survey in scope. Forage base / grazing capacity is
    // DEFERRED to a later reception pass; its definition is preserved here intact
    // (Act-tool / protocol references stay valid). Re-enable by removing this
    // flag when the later tier lands.
    excludedFromResolution: true,
    title: 'A clear read of forage base & grazing capacity',
    shortTitle: 'Forage base & grazing capacity',
    focusedQuestion:
      'What forage already exists across the site, and what is the realistic grazing capacity by zone and season?',
    checklist: [
      ck(
        'silv-sec-s3-forage-survey-c1',
        'Map existing pasture and understorey forage by zone - species composition and condition',
        { feeds: ['silv-sec-s4-grazing-design'] },
      ),
      ck(
        'silv-sec-s3-forage-survey-c2',
        'Assess seasonal forage availability and identify feed gaps across the year',
        { feeds: ['silv-sec-s4-grazing-design'] },
      ),
      ckF(
        'silv-sec-s3-forage-survey-c3',
        'Estimate baseline carrying capacity per zone - conservative stocking under current condition',
        {
          formulaId: 'carrying-capacity-seasonal',
          satisfiesWhenComputed: true,
          resultLabel: 'Baseline carrying capacity',
        },
      ),
      ck(
        'silv-sec-s3-forage-survey-c4',
        'Identify shade, shelter, and tree-protection constraints that affect grazeable area',
        { feeds: ['silv-sec-s4-grazing-design', 'silv-sec-s5-tree-establishment'] },
      ),
      ck(
        'silv-sec-s3-forage-survey-c5',
        'Assess weed and toxic-plant presence relevant to the candidate stock species',
        { feeds: ['silv-sec-s4-grazing-design', 's7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('silv-sec-s3-forage-survey-dg1', 'Forage mapping & seasonality', ['silv-sec-s3-forage-survey-c1', 'silv-sec-s3-forage-survey-c2'], ['Vegetation & Succession']),
      dg('silv-sec-s3-forage-survey-dg2', 'Capacity & constraints', ['silv-sec-s3-forage-survey-c3', 'silv-sec-s3-forage-survey-c4']),
      dg('silv-sec-s3-forage-survey-dg3', 'Weed & toxic plants', ['silv-sec-s3-forage-survey-c5']),
    ],
    completionGate:
      'Forage base mapped. Seasonal availability and feed gaps identified. Baseline carrying capacity estimated per zone.',
    actHandoff: 'Forage Base & Grazing Capacity Survey',
  }),
  // 2.5 Survey livestock water availability & seasonal supply (Graduated -
  // standalone). NEW for the Tier-2 Reception restructure: when silvopasture is
  // SECONDARY, the primary 'silv-s3-stock-water-availability' never resolves, so
  // this additive objective carries stock water into the resolved S3 set,
  // reusing the 'stock-water-demand' formula. Feeds strictly-later UNIVERSAL ids
  // (in-config in every combo) for OUTBOUND traceability.
  obj({
    id: 'silv-sec-s3-stock-water',
    stratumId: 's3-systems-reading',
    ref: 'SILV-S3.21',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title:
      'A confirmed livestock water availability & seasonal supply baseline',
    shortTitle: 'Livestock water availability & seasonal supply',
    focusedQuestion:
      'Is there sufficient water of suitable quality to sustain the intended livestock through all seasons, and what infrastructure makes that supply reliable across all paddock zones?',
    checklist: [
      ckF(
        'silv-sec-s3-stock-water-c1',
        'Calculate estimated stock water demand by species, intended numbers, and season - peak summer demand is the constraint',
        {
          formulaId: 'stock-water-demand',
          satisfiesWhenComputed: true,
          resultLabel: 'Stock water demand vs supply',
        },
      ),
      ck(
        'silv-sec-s3-stock-water-c2',
        'Assess existing water source yield through the dry season - dam storage, bore/well yield, creek/spring flow at seasonal minimum',
        { feeds: ['s4-water-strategy', 's5-water-infrastructure'] },
      ),
      ck(
        'silv-sec-s3-stock-water-c3',
        'Map distance from water sources to proposed paddock locations - maximum travel distance per paddock',
        { feeds: ['s5-water-infrastructure'] },
      ),
      ck(
        'silv-sec-s3-stock-water-c4',
        'Identify seasonal gaps between supply and demand - when and by how much supply falls short',
        { feeds: ['s4-water-strategy', 's7-risk-register'] },
      ),
      ck(
        'silv-sec-s3-stock-water-c5',
        'Assess infrastructure required to deliver water to all paddock locations - pipes, pumps, troughs, header tanks',
        { feeds: ['s5-water-infrastructure'] },
      ),
      ck(
        'silv-sec-s3-stock-water-c6',
        'Conduct water quality assessment for livestock suitability - pH, blue-green algae risk, contamination sources',
        { feeds: ['s7-risk-register', 's5-water-infrastructure'] },
      ),
      ck(
        'silv-sec-s3-stock-water-c7',
        'Assess shared-source combined demand where domestic and stock water draw from the same bore, dam, creek, or rainwater source',
        {
          feeds: ['s7-risk-register'],
          feedNote:
            'Residential / Live-In: where domestic and stock water share a source, assess whether it can sustain both through the driest season without a prioritisation conflict, and flag any source where household and livestock supply would compete.',
        },
      ),
    ],
    decisionGroups: [
      dg(
        'silv-sec-s3-stock-water-dg1',
        'Demand & source yields',
        ['silv-sec-s3-stock-water-c1', 'silv-sec-s3-stock-water-c2'],
        ['Water & Hydrology'],
      ),
      dg(
        'silv-sec-s3-stock-water-dg2',
        'Distribution & seasonal gaps',
        [
          'silv-sec-s3-stock-water-c3',
          'silv-sec-s3-stock-water-c4',
          'silv-sec-s3-stock-water-c5',
        ],
        ['Water & Hydrology'],
      ),
      dg(
        'silv-sec-s3-stock-water-dg3',
        'Water quality & shared-source conflict',
        ['silv-sec-s3-stock-water-c6', 'silv-sec-s3-stock-water-c7'],
      ),
    ],
    completionGate:
      'Stock water availability confirmed or gap quantified for all seasons. Infrastructure requirement to close any gap identified. Shared-source domestic conflict assessment complete where applicable (Residential/Live-In).',
    actHandoff: 'Livestock Water Availability Report',
    observeOutput: 'Livestock Water Availability Record',
    buildsOnDisplay:
      'Stratum 3.1 Water movement (water source locations, seasonal yields, and distribution infrastructure identified there)',
    intentLens: [
      {
        typeId: 'silvopasture',
        text: 'Read water availability as a fundamental carrying-capacity constraint -- no stocking plan is valid without a confirmed water supply baseline',
      },
      {
        typeId: 'residential',
        text: 'Where domestic and stock water draw from shared sources, the combined demand must be assessed -- the household cannot be left without water supply during peak stock water demand periods',
      },
    ],
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'silv-sec-s4-grazing-design',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.20',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A sound grazing system & rotation framework',
    shortTitle: 'Grazing system & rotation framework',
    focusedQuestion:
      'How will stock be moved across the site to balance animal nutrition, pasture recovery, and tree protection?',
    checklist: [
      ck(
        'silv-sec-s4-grazing-design-c1',
        'Define the grazing method - rotational, cell, or set-stocking - and the rationale',
        { feeds: ['silv-sec-s6-pasture-tree-monitoring', 'silv-sec-s7-stocking-phasing'] },
      ),
      ck(
        'silv-sec-s4-grazing-design-c2',
        'Define paddock or cell layout and target mob size per move',
        { feeds: ['s7-phase1', 'silv-sec-s7-stocking-phasing'] },
      ),
      ck(
        'silv-sec-s4-grazing-design-c3',
        'Define graze-period and rest-period targets per season tied to recovery indicators',
        { feeds: ['silv-sec-s6-pasture-tree-monitoring'] },
      ),
      ck(
        'silv-sec-s4-grazing-design-c4',
        'Define tree-protection rules - exclusion windows for young plantings, browse limits',
        { feeds: ['silv-sec-s5-tree-establishment', 'silv-sec-s7-stocking-phasing'] },
      ),
      ck(
        'silv-sec-s4-grazing-design-c5',
        'Define the feed-gap contingency - supplementary feed, destocking, or agistment triggers',
        { feeds: ['silv-sec-s7-stocking-phasing', 's7-risk-register'] },
      ),
      ckF(
        'silv-sec-s4-grazing-design-c6',
        'Run the paddock stocking density check to confirm the grazing design is within surveyed carrying capacity',
        {
          formulaId: 'paddock-stocking-density',
          satisfiesWhenComputed: false,
          resultLabel: 'Stocking density vs carrying capacity',
        },
      ),
    ],
    decisionGroups: [
      dg('silv-sec-s4-grazing-design-dg1', 'Method & layout', ['silv-sec-s4-grazing-design-c1', 'silv-sec-s4-grazing-design-c2']),
      dg('silv-sec-s4-grazing-design-dg2', 'Graze/rest & tree protection', ['silv-sec-s4-grazing-design-c3', 'silv-sec-s4-grazing-design-c4'], ['Vegetation & Succession']),
      dg('silv-sec-s4-grazing-design-dg3', 'Contingency & capacity fit', ['silv-sec-s4-grazing-design-c5', 'silv-sec-s4-grazing-design-c6']),
    ],
    completionGate:
      'Grazing method, rotation framework, and tree-protection rules approved. Graze/rest targets tied to recovery indicators. Feed-gap contingency defined.',
    actHandoff: 'Grazing System & Rotation Framework Design Package',
    monitoringProtocol: {
      indicators: [
        { metric: 'Pasture cover height before paddock entry and after exit', frequency: 'every rotation' },
        { metric: 'Rest period days achieved vs. target', frequency: 'per rotation' },
        { metric: 'Pasture recovery rate by paddock', frequency: 'seasonal' },
      ],
      triggers: [
        'Cover below 8cm at planned move-in date -> extend rest period',
        'Pasture not recovering to 20cm+ after standard rest -> investigate soil compaction, stocking rate, or species',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'silv-sec-s4-stock-infrastructure',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.21',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'Ready core stock infrastructure - water, fencing & handling',
    shortTitle: 'Core stock infrastructure - water, fencing & handling',
    focusedQuestion:
      'What water, fencing, and handling infrastructure must be in place before any livestock arrive on site?',
    checklist: [
      ck(
        'silv-sec-s4-stock-infrastructure-c1',
        'Design stock water reticulation - troughs, supply lines, and per-paddock access',
        { feeds: ['s7-phase1', 's7-resource-plan'] },
      ),
      ck(
        'silv-sec-s4-stock-infrastructure-c2',
        'Design perimeter and subdivision fencing - permanent, electric, or hybrid per zone',
        { feeds: ['s7-phase1', 's7-resource-plan'] },
      ),
      ck(
        'silv-sec-s4-stock-infrastructure-c3',
        'Design stock handling facilities - yards, race, and loading appropriate to species and scale',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'silv-sec-s4-stock-infrastructure-c4',
        'Design shade and shelter provision adequate for the candidate stock and climate',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'silv-sec-s4-stock-infrastructure-c5',
        'Confirm infrastructure sequencing - the go/no-go that no livestock arrive before water, fencing, and handling all pass independent readiness checks',
        { feeds: ['silv-sec-s7-stocking-phasing', 's7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('silv-sec-s4-stock-infrastructure-dg1', 'Water & fencing', ['silv-sec-s4-stock-infrastructure-c1', 'silv-sec-s4-stock-infrastructure-c2'], ['Infrastructure & Access']),
      dg('silv-sec-s4-stock-infrastructure-dg2', 'Handling & shelter', ['silv-sec-s4-stock-infrastructure-c3', 'silv-sec-s4-stock-infrastructure-c4'], ['Infrastructure & Access']),
      dg('silv-sec-s4-stock-infrastructure-dg3', 'Sequencing gate', ['silv-sec-s4-stock-infrastructure-c5']),
    ],
    completionGate:
      'Stock water, fencing, and handling infrastructure designed. Shade and shelter confirmed. Hard gate set: no livestock arrive before water, fencing, and handling facilities each pass an independent go/no-go test.',
    actHandoff: 'Core Stock Infrastructure Design Package',
    planningDirectionMandate:
      'The silvopasture enterprise cannot proceed until this strategy confirms a viable stock water supply. This objective directly resolves the Threshold 1 conditional requirement raised against silvopasture water.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Trough fill speed and level', frequency: 'weekly during summer' },
        { metric: 'Pump operating hours vs. plan', frequency: 'monthly' },
        { metric: 'Water quality at troughs', frequency: 'quarterly' },
      ],
      triggers: [
        'Trough empty during normal operation -> check float valve, supply line',
        'Water quality failure -> shut down affected trough, investigate source',
        'Pump overuse -> check for leaks',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 'silv-sec-s4-husbandry-framework',
    stratumId: 's4-foundation-decisions',
    ref: 'SILV-S4.22',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A sound livestock husbandry & welfare framework',
    shortTitle: 'Livestock husbandry & welfare framework',
    focusedQuestion:
      'What husbandry, health, and welfare standards govern the herd or flock - including humane and halal handling?',
    checklist: [
      ck(
        'silv-sec-s4-husbandry-framework-c1',
        'Define animal health program - vaccination, parasite management, and veterinary relationship',
        { feeds: ['silv-sec-s6-pasture-tree-monitoring', 's7-resource-plan'] },
      ),
      ck(
        'silv-sec-s4-husbandry-framework-c2',
        'Define breeding or replacement strategy and seasonal husbandry calendar',
        { feeds: ['silv-sec-s7-stocking-phasing', 's7-resource-plan'] },
      ),
      ck(
        'silv-sec-s4-husbandry-framework-c3',
        'Define daily welfare standard - feed, water, shade, and handling stress minimisation',
        { feeds: ['silv-sec-s6-pasture-tree-monitoring'] },
      ),
      ck(
        'silv-sec-s4-husbandry-framework-c4',
        'Define humane and halal handling and slaughter-pathway intent where stock is raised for meat',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'silv-sec-s4-husbandry-framework-c5',
        'Define record-keeping for stock numbers, health events, and movements',
        { feeds: ['silv-sec-s6-pasture-tree-monitoring', 's7-resource-plan'] },
      ),
      ck(
        'silv-sec-s4-husbandry-framework-c6',
        'Confirm the husbandry framework is consistent with available labour and the welfare standard',
        { feeds: ['s7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('silv-sec-s4-husbandry-framework-dg1', 'Health & breeding', ['silv-sec-s4-husbandry-framework-c1', 'silv-sec-s4-husbandry-framework-c2']),
      dg('silv-sec-s4-husbandry-framework-dg2', 'Welfare & halal handling', ['silv-sec-s4-husbandry-framework-c3', 'silv-sec-s4-husbandry-framework-c4']),
      dg('silv-sec-s4-husbandry-framework-dg3', 'Records & labour fit', ['silv-sec-s4-husbandry-framework-c5', 'silv-sec-s4-husbandry-framework-c6']),
    ],
    completionGate:
      'Livestock husbandry, health, and welfare framework approved. Humane and halal handling intent defined. Record-keeping established.',
    actHandoff: 'Livestock Husbandry & Welfare Framework Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Animal body condition score across the mob', frequency: 'monthly' },
        { metric: 'Health-event frequency -- illness and parasite load', frequency: 'logged as events occur' },
        { metric: 'Mortality rate vs. expected baseline', frequency: 'per season' },
      ],
      triggers: [
        'Body condition declining across the mob -> review feed and animal-health program',
        'Repeat health events of the same type -> escalate to veterinary review',
        'Mortality above expected baseline -> investigate cause and adjust husbandry',
      ],
      feeds: 'animals-livestock',
    },
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'silv-sec-s5-tree-establishment',
    stratumId: 's5-system-design',
    ref: 'SILV-S5.20',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A tree planting & establishment plan for the silvopasture layer',
    shortTitle: 'Tree planting & establishment plan',
    focusedQuestion:
      'Where, which species, at what spacing, and in what sequence will trees be planted - and how will they be protected during establishment?',
    checklist: [
      ck(
        'silv-sec-s5-tree-establishment-c1',
        'Select species by browse tolerance, climate suitability, and silvopasture function - shade, fodder, timber, or multi-purpose',
        { feeds: ['silv-sec-s6-pasture-tree-monitoring', 'silv-sec-s7-stocking-phasing'] },
      ),
      ck(
        'silv-sec-s5-tree-establishment-c2',
        'Map planting layout - row spacing, alley width for livestock and machinery access, and per-hectare density targets',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'silv-sec-s5-tree-establishment-c3',
        'Design the protection strategy - individual guards, temporary exclusion fencing, or permanent browse barriers - and the threshold before livestock re-entry',
        { feeds: ['silv-sec-s6-pasture-tree-monitoring', 'silv-sec-s7-stocking-phasing'] },
      ),
      ck(
        'silv-sec-s5-tree-establishment-c4',
        'Set the planting season and establishment schedule coordinated with the host primary operations calendar',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'silv-sec-s5-tree-establishment-c5',
        'Plan establishment-phase water access - mulching, drip irrigation, or tree guards for moisture retention',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'silv-sec-s5-tree-establishment-c6',
        'Confirm tree procurement source, lead time, and contingency for stock unavailability',
        { feeds: ['s7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('silv-sec-s5-tree-establishment-dg1', 'Species & layout', [
        'silv-sec-s5-tree-establishment-c1',
        'silv-sec-s5-tree-establishment-c2',
      ], ['Vegetation & Succession']),
      dg('silv-sec-s5-tree-establishment-dg2', 'Protection & schedule', [
        'silv-sec-s5-tree-establishment-c3',
        'silv-sec-s5-tree-establishment-c4',
      ]),
      dg('silv-sec-s5-tree-establishment-dg3', 'Water & procurement', [
        'silv-sec-s5-tree-establishment-c5',
        'silv-sec-s5-tree-establishment-c6',
      ]),
    ],
    completionGate:
      'Species list confirmed, spacing mapped onto site plan, protection method and re-entry threshold set, planting season locked, procurement source identified.',
    actHandoff: 'Tree Planting & Establishment Design Package',
    buildsOnDisplay:
      'Builds on 3.6 -- Paddock layout, Survey 1.3 -- Ecology (existing species, browse patterns), and Survey 1.1 -- Terrain (aspect and shelter by paddock).',
    monitoringProtocol: {
      indicators: [
        { metric: 'Tree establishment rate per paddock', frequency: 'at 6 and 12 months' },
        { metric: 'Browse damage % on young trees', frequency: 'monthly until guards are removed' },
        { metric: 'Understorey forage production in treed areas vs. open areas (yield comparison)', frequency: 'seasonal' },
        { metric: 'Household-allocated tree yield volumes (harvest records)', frequency: 'per harvest' },
      ],
      triggers: [
        'Browse damage exceeding 15% of young trees -> review protection type or timing of livestock access',
        'Establishment failure in a paddock zone -> review species choice, soil, competition, guard adequacy',
      ],
      feeds: 'plants-food',
    },
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'silv-sec-s6-pasture-tree-monitoring',
    stratumId: 's6-integration-design',
    ref: 'SILV-S6.20',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A pasture recovery & tree survival monitoring protocol',
    shortTitle: 'Pasture & tree monitoring',
    focusedQuestion:
      'How will tree survival, browse damage, and pasture recovery be tracked - and what evidence triggers a grazing adjustment?',
    checklist: [
      ck(
        'silv-sec-s6-pasture-tree-monitoring-c1',
        'Set a tree survival rate target and inspection cadence - define the remediation protocol when the threshold is breached',
        { feeds: ['silv-sec-s7-stocking-phasing'] },
      ),
      ck(
        'silv-sec-s6-pasture-tree-monitoring-c2',
        'Define browse damage assessment - visual inspection frequency, damage threshold, and response triggers',
        { feeds: ['silv-sec-s7-stocking-phasing', 's7-risk-register'] },
      ),
      ck(
        'silv-sec-s6-pasture-tree-monitoring-c3',
        'Define pasture recovery indicators - sward height, species composition, ground cover - and the minimum rest period before livestock re-entry',
        { feeds: ['silv-sec-s7-stocking-phasing'] },
      ),
      ck(
        'silv-sec-s6-pasture-tree-monitoring-c4',
        'Define adaptive grazing trigger rules - what evidence prompts a rotation change and who has authority to act',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'silv-sec-s6-pasture-tree-monitoring-c5',
        'Choose a record-keeping system and assign responsibility - field cards, app, or integration with the host primary monitoring process',
        { feeds: ['s7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('silv-sec-s6-pasture-tree-monitoring-dg1', 'Tree health', [
        'silv-sec-s6-pasture-tree-monitoring-c1',
        'silv-sec-s6-pasture-tree-monitoring-c2',
      ], ['Vegetation & Succession']),
      dg('silv-sec-s6-pasture-tree-monitoring-dg2', 'Pasture & adaptive management', [
        'silv-sec-s6-pasture-tree-monitoring-c3',
        'silv-sec-s6-pasture-tree-monitoring-c4',
      ]),
      dg('silv-sec-s6-pasture-tree-monitoring-dg3', 'Records & responsibility', [
        'silv-sec-s6-pasture-tree-monitoring-c5',
      ]),
    ],
    completionGate:
      'Monitoring protocol written, survival rate and browse-damage thresholds set, pasture recovery indicators defined, adaptive trigger rules documented, record system and responsible person confirmed.',
    actHandoff: 'Pasture Recovery & Tree Monitoring Protocol',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'silv-sec-s7-stocking-phasing',
    stratumId: 's7-phasing-resourcing',
    ref: 'SILV-S7.20',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A stocking phasing plan relative to tree establishment milestones',
    shortTitle: 'Stocking phasing vs tree establishment',
    focusedQuestion:
      'How does livestock introduction and stocking buildup sequence against tree establishment - what protection-phase milestones must be met before full stocking resumes?',
    checklist: [
      ck(
        'silv-sec-s7-stocking-phasing-c1',
        'Define the tree-protection phase - which paddocks are excluded, for how long, and what height or guard-integrity threshold triggers livestock re-entry',
      ),
      ck(
        'silv-sec-s7-stocking-phasing-c2',
        'Set the partial-stocking schedule - which paddocks remain open, at what density, and for what duration during tree establishment',
      ),
      ck(
        'silv-sec-s7-stocking-phasing-c3',
        'Project the full-stocking timeline based on species growth rates, site conditions, and survival-rate assumptions',
      ),
      ck(
        'silv-sec-s7-stocking-phasing-c4',
        'Assess the financial impact of reduced carrying capacity during establishment - supplementary feed budget, agistment, or destocking contingency',
      ),
      ck(
        'silv-sec-s7-stocking-phasing-c5',
        'Define the high-mortality contingency - replanting trigger threshold, stocking adjustment, and communication protocol to the host primary operator',
      ),
    ],
    decisionGroups: [
      dg('silv-sec-s7-stocking-phasing-dg1', 'Protection phase & partial stocking', [
        'silv-sec-s7-stocking-phasing-c1',
        'silv-sec-s7-stocking-phasing-c2',
      ]),
      dg('silv-sec-s7-stocking-phasing-dg2', 'Full-stocking timeline & financial impact', [
        'silv-sec-s7-stocking-phasing-c3',
        'silv-sec-s7-stocking-phasing-c4',
      ]),
      dg('silv-sec-s7-stocking-phasing-dg3', 'Contingency', [
        'silv-sec-s7-stocking-phasing-c5',
      ]),
    ],
    completionGate:
      'Tree-protection phase milestones set, partial-stocking plan documented, full-stocking timeline projected, financial impact on host enterprise assessed, high-mortality contingency defined.',
    actHandoff: 'Stocking Phasing Plan - communicate protection-phase constraints to host primary operator and update carrying-capacity calculations for the establishment period',
    progressTracking: {
      milestones: [
        { metric: 'Livestock re-entry only after tree-protection-phase milestone (height / guard integrity) met', cadence: 'per paddock, per protection phase' },
        { metric: 'Stocking density vs. reduced establishment-period carrying capacity', cadence: 'per review cycle during establishment' },
      ],
    },
  }),
];

// ---------------------------------------------------------------------------
// SILVOPASTURE SECONDARY PATCHES
//
// Inject livestock-specific items into the shared UNIVERSAL objectives so stock
// demand is folded into the whole-of-site water / access / soil decisions. The
// resolver looks targets up by id, concatenates gate amendments, and stamps each
// injected item with expandedBySecondaryId at apply time.
// ---------------------------------------------------------------------------
export const SILVOPASTURE_SECONDARY_PATCHES: readonly PatchRecord[] = [
  // Tier-0 restructure 2026-06-16: the silvopasture delta to the RegenFarm
  // enterprise-mix objective (0.5). Targets the PRIMARY 'rf-s1-enterprise-mix'
  // (RF-S1.4) - lands only when regenerative_farm is the primary; the resolver
  // skips + records the skip on any other primary (never throws). Establishes
  // ONE integrated livestock operation (not a separate domestic enterprise),
  // including the resident-vs-commercial allocation of POSSESSED production.
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 'rf-s1-enterprise-mix',
    ref: 'SILV>RF-S1.4',
    injectedItems: [
      ck(
        'rf-s1-enterprise-mix-silv-1',
        'Select livestock species and target stocking numbers for the integrated operation',
      ),
      ck(
        'rf-s1-enterprise-mix-silv-2',
        'Define the allocation logic between commercial output and resident provision - what proportion of livestock production serves the household vs. the farm enterprise',
      ),
      ck(
        'rf-s1-enterprise-mix-silv-3',
        'Map integration logic between the livestock enterprise and the crop and fertility systems',
      ),
      ck(
        'rf-s1-enterprise-mix-silv-4',
        'Define the sequencing of pasture and tree establishment relative to livestock introduction',
      ),
    ],
    injectedGroups: [
      dg(
        'rf-s1-enterprise-mix-dgsilv1',
        'Integrated livestock operation',
        [
          'rf-s1-enterprise-mix-silv-1',
          'rf-s1-enterprise-mix-silv-2',
          'rf-s1-enterprise-mix-silv-3',
          'rf-s1-enterprise-mix-silv-4',
        ],
        ['Direction & Strategy'],
      ),
    ],
    completionGateAmendment:
      'Livestock integration strategy defined, including the single-operation resident allocation logic.',
    scopeNote:
      'Silvopasture secondary, RegenFarm primary only: establishes ONE integrated livestock operation rather than a separate domestic enterprise. The resident-vs-commercial allocation splits ALREADY-POSSESSED livestock production between household provision and the farm enterprise. It does not sell, commit, or take payment against unproduced future output, and creates no membership entitlement to future production - any such instrument remains Scholar-Council-gated.',
  }),
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's4-water-strategy',
    ref: 'SILV>U-S4.2',
    injectedItems: [
      ck(
        's4-water-strategy-silv-1',
        'Add livestock drinking-water demand to the water balance - peak daily intake by species, class, and season',
      ),
      ck(
        's4-water-strategy-silv-2',
        'Confirm reticulated supply can serve every grazing paddock through the dry season',
      ),
    ],
    injectedGroups: [
      dg('s4-water-strategy-dgsilv1', 'Livestock water demand', ['s4-water-strategy-silv-1', 's4-water-strategy-silv-2'], ['Water & Hydrology']),
    ],
    completionGateAmendment:
      'Livestock drinking-water demand is included in the water balance and reticulation reaches all grazing paddocks.',
    scopeNote:
      'Silvopasture secondary: grazing stock adds a continuous, paddock-distributed water demand the base primary may not account for.',
  }),
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's5-access',
    ref: 'SILV>U-S5.1',
    injectedItems: [
      ck(
        's5-access-silv-1',
        'Design stock-movement laneways linking paddocks to water, handling yards, and shelter',
      ),
      ck(
        's5-access-silv-2',
        'Design gated crossings where stock laneways intersect vehicle access or waterways - minimise stress points',
      ),
    ],
    injectedGroups: [
      dg('s5-access-dgsilv1', 'Stock movement & crossings', ['s5-access-silv-1', 's5-access-silv-2'], ['Infrastructure & Access']),
    ],
    completionGateAmendment:
      'Stock-movement laneways and gated crossings are designed to move livestock with minimal stress.',
    scopeNote:
      'Silvopasture secondary: integrated grazing requires a stock-circulation layer over the base access network.',
  }),
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's5-soil-improvement',
    ref: 'SILV>U-S5.3',
    injectedItems: [
      ck(
        's5-soil-improvement-silv-1',
        'Define grazing-impact monitoring - ground cover, compaction, and pasture condition by zone',
      ),
      ck(
        's5-soil-improvement-silv-2',
        'Define graze/rest thresholds that protect soil and ground cover from overgrazing',
      ),
    ],
    injectedGroups: [
      dg('s5-soil-improvement-dgsilv1', 'Grazing impact & graze/rest', ['s5-soil-improvement-silv-1', 's5-soil-improvement-silv-2'], ['Soil']),
    ],
    completionGateAmendment:
      'Grazing-impact monitoring and graze/rest thresholds protect soil and ground cover from overgrazing.',
    scopeNote:
      'Silvopasture secondary: livestock are both a soil-building tool and a compaction/overgrazing risk; the soil strategy must govern grazing pressure.',
  }),
  // ---- Tier-2 (Stratum-3) Reception restructure 2026-06-16 -----------------
  // Four livestock deltas folded into the shared Systems-Reading surveys so the
  // whole-site reception read carries the grazing dimension (spec 2.1-2.4 silv
  // patch blocks). 2.1/2.2 land on UNIVERSAL surveys; 2.3/2.4 land on the
  // RegenFarm PRIMARY surveys (apply only when regenerative_farm is primary -
  // the resolver records a skip otherwise, never throws). Observations only;
  // no allocation/sale surface.
  // 2.1 Water movement & hydrology
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's3-hydrology',
    ref: 'SILV>U-S3.1',
    injectedItems: [
      ck(
        's3-hydrology-silv-1',
        'Identify where water concentrates seasonally in paddock zones - swales, depressions, natural collection points with stock water storage potential',
      ),
      ck(
        's3-hydrology-silv-2',
        'Map seasonal creek and waterway flow in proposed paddock areas - year-round, seasonal, or absent',
      ),
      ck(
        's3-hydrology-silv-3',
        'Note wet season drainage issues in paddock zones - waterlogging duration and extent',
      ),
    ],
    injectedGroups: [
      dg(
        's3-hydrology-dgsilv1',
        'Paddock water concentration',
        ['s3-hydrology-silv-1', 's3-hydrology-silv-2', 's3-hydrology-silv-3'],
        ['Water & Hydrology'],
      ),
    ],
    completionGateAmendment:
      'Seasonal water concentration points in paddock zones identified for stock water storage assessment.',
    scopeNote:
      'Silvopasture secondary: where water concentrates seasonally and where paddock zones waterlog governs grazing layout; these readings feed the livestock water availability survey (2.5).',
  }),
  // 2.2 Soil conditions & subsurface
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's3-soil',
    ref: 'SILV>U-S3.2',
    injectedItems: [
      ck(
        's3-soil-silv-1',
        'Conduct compaction profiling under historically grazed areas - penetrometer readings at multiple depths',
      ),
      ck(
        's3-soil-silv-2',
        'Record bulk density variation between grazed and ungrazed zones',
      ),
      ck(
        's3-soil-silv-3',
        'Assess root depth restriction in compacted zones - what will pasture recovery require?',
      ),
    ],
    injectedGroups: [
      dg(
        's3-soil-dgsilv1',
        'Compaction legacy & recovery',
        ['s3-soil-silv-1', 's3-soil-silv-2', 's3-soil-silv-3'],
        ['Soil'],
      ),
    ],
    completionGateAmendment:
      'Compaction profiling complete in historically grazed areas, with root-depth restriction and pasture recovery requirement recorded.',
    scopeNote:
      'Silvopasture secondary: future paddock zones carry a compaction legacy under historically grazed ground; the soil read must quantify it to size pasture recovery.',
  }),
  // 2.3 Nutrient cycling & organic-matter flows (RegenFarm primary survey)
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 'rf-s3-nutrient-cycling',
    ref: 'SILV>RF-S3.3',
    injectedItems: [
      ck(
        'rf-s3-nutrient-cycling-silv-1',
        'Note the current nutrient cycling contribution (or absence) from livestock: are animals currently on this land contributing to fertility cycling or has the system been decoupled from animal inputs? This sets the baseline for what the silvopasture enterprise will repair or build.',
      ),
    ],
    injectedGroups: [
      dg(
        'rf-s3-nutrient-cycling-dgsilv1',
        'Livestock fertility baseline',
        ['rf-s3-nutrient-cycling-silv-1'],
        ['Soil'],
      ),
    ],
    completionGateAmendment:
      'Livestock nutrient cycling baseline noted - the starting point for what the silvopasture enterprise will repair or build.',
    scopeNote:
      'Silvopasture secondary: in a silvopasture system livestock are the primary fertility driver, so the nutrient-cycling read records the current animal-derived contribution or its absence as a baseline. This is an observation of the present system, not a production commitment.',
  }),
  // 2.4 Pest, disease & weed pressure (RegenFarm primary survey)
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 'rf-s3-pest-pressure',
    ref: 'SILV>RF-S3.4',
    injectedItems: [
      ck(
        'rf-s3-pest-pressure-silv-1',
        'Record livestock-relevant disease and parasite pressure: internal parasite indicator species in paddock zones (certain weed species signal parasite burden), fly pressure history, disease vectors associated with wet areas or waterways',
      ),
      ck(
        'rf-s3-pest-pressure-silv-2',
        'Map plant species in future paddock zones that are toxic to intended livestock - density, distribution, and removal priority',
      ),
    ],
    injectedGroups: [
      dg(
        'rf-s3-pest-pressure-dgsilv1',
        'Livestock pressure & toxic plants',
        ['rf-s3-pest-pressure-silv-1', 'rf-s3-pest-pressure-silv-2'],
        ['Vegetation & Succession'],
      ),
    ],
    completionGateAmendment:
      'Livestock-relevant disease, parasite, and fly pressure recorded, and toxic plant distribution in future paddock zones mapped.',
    scopeNote:
      'Silvopasture secondary: livestock add pressure vectors - internal parasites, flies, toxic plants in paddock zones - that the base pest read does not cover.',
  }),
  // ---- Tier-1 (Stratum-2) Land-Reading restructure 2026-06-16 --------------
  // Four livestock deltas folded into the shared Land-Reading surveys so the
  // first reception tier carries the grazing dimension (spec 1.1/1.3/1.4 silv
  // patch blocks + new 1.5 land-health patch). 1.1/1.3/1.4 land on UNIVERSAL
  // surveys; 1.5 lands on the RegenFarm PRIMARY survey (applies only when
  // regenerative_farm is primary - the resolver records a skip otherwise, never
  // throws). Observations of present land and assets only; no allocation/sale
  // surface.
  // 1.1 Terrain & topography
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's2-terrain',
    ref: 'SILV>U-S2.1',
    injectedItems: [
      ck(
        's2-terrain-silv-1',
        'Map paddock potential zones - flat to gently sloping areas with good solar exposure',
      ),
      ck(
        's2-terrain-silv-2',
        'Identify natural livestock movement paths following contour and gravity logic',
      ),
      ck(
        's2-terrain-silv-3',
        'Mark topographic shelter opportunities - hollows, lee slopes, ridgeline breaks - for winter yard placement',
      ),
    ],
    injectedGroups: [
      dg(
        's2-terrain-dgsilv1',
        'Paddock potential & stock movement',
        ['s2-terrain-silv-1', 's2-terrain-silv-2', 's2-terrain-silv-3'],
        ['Terrain & Topography'],
      ),
    ],
    completionGateAmendment:
      'Paddock potential zones, livestock movement paths, and topographic shelter for winter yards mapped.',
    scopeNote:
      'Silvopasture secondary: terrain is read for grazing layout - where stock move with gravity, where paddocks and winter yards naturally sit.',
  }),
  // 1.3 Existing ecology & habitat (patch strengthened from v1.1)
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's2-ecology',
    ref: 'SILV>U-S2.3',
    injectedItems: [
      ck(
        's2-ecology-silv-1',
        'Conduct pasture baseline survey - species composition of existing grassland by zone, estimated legume percentage, browse species present',
      ),
      ck(
        's2-ecology-silv-2',
        'Assess forage quality indicators - plant vigour, palatability species proportion, species suggesting overgrazing or undergrazing',
      ),
      ck(
        's2-ecology-silv-3',
        'Record wildlife and vegetation features with browse or forage value for intended livestock species',
      ),
      ck(
        's2-ecology-silv-4',
        'Note weed species associated with overgrazing or soil disturbance in future paddock zones',
      ),
    ],
    injectedGroups: [
      dg(
        's2-ecology-dgsilv1',
        'Pasture baseline & forage value',
        ['s2-ecology-silv-1', 's2-ecology-silv-2', 's2-ecology-silv-3', 's2-ecology-silv-4'],
        ['Vegetation & Succession'],
      ),
    ],
    completionGateAmendment:
      'Pasture baseline and forage quality assessment complete - species composition, browse value, and overgrazing indicator weeds recorded.',
    scopeNote:
      'Silvopasture secondary: the existing plant community encodes forage value and grazing-pressure history; the ecology read must capture pasture composition and browse potential, not just habitat.',
  }),
  // 1.4 Existing infrastructure & access (retained from v1.1)
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's2-infrastructure',
    ref: 'SILV>U-S2.4',
    injectedItems: [
      ck(
        's2-infrastructure-silv-1',
        'Inventory existing livestock infrastructure - yards, crushes, laneways, loading facilities; note condition and upgrade requirement',
      ),
      ck(
        's2-infrastructure-silv-2',
        'Assess existing paddock subdivision and fencing condition - which fences can define initial rotational paddocks',
      ),
      ck(
        's2-infrastructure-silv-3',
        'Assess water trough placement and reach - which paddock areas have water access within acceptable livestock travel distance',
      ),
    ],
    injectedGroups: [
      dg(
        's2-infrastructure-dgsilv1',
        'Livestock infrastructure & paddock fencing',
        ['s2-infrastructure-silv-1', 's2-infrastructure-silv-2', 's2-infrastructure-silv-3'],
        ['Infrastructure & Access'],
      ),
    ],
    completionGateAmendment:
      'Existing livestock infrastructure, paddock fencing, and trough reach assessed for reuse in the rotational system.',
    scopeNote:
      'Silvopasture secondary: existing yards, fencing, and troughs determine what rotational grazing infrastructure can be reused versus built new.',
  }),
  // 1.5 Existing land health & degradation (RegenFarm primary survey)
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 'rf-s2-land-health',
    ref: 'SILV>RF-S2.5',
    injectedItems: [
      ck(
        'rf-s2-land-health-silv-1',
        'Assess historical grazing pressure by zone - compaction depth under formerly stocked areas, weed species associated with overgrazing, bare ground percentage in future paddock zones',
      ),
      ck(
        'rf-s2-land-health-silv-2',
        'Record current forage and pasture condition category for each future paddock zone - degraded, fair, good',
      ),
      ck(
        'rf-s2-land-health-silv-3',
        'Note soil compaction depth and distribution in historically grazed areas - this determines recovery timeline before stocking can resume',
      ),
    ],
    injectedGroups: [
      dg(
        'rf-s2-land-health-dgsilv1',
        'Grazing pressure legacy & pasture condition',
        ['rf-s2-land-health-silv-1', 'rf-s2-land-health-silv-2', 'rf-s2-land-health-silv-3'],
        ['Soil'],
      ),
    ],
    completionGateAmendment:
      'Grazing pressure legacy, pasture condition category per future paddock zone, and compaction depth recorded - the recovery timeline before stocking can resume is defined.',
    scopeNote:
      'Silvopasture secondary: land health is read for grazing legacy - compaction, overgrazing weeds, and pasture condition that set the recovery sequence before stocking resumes. Observation of present land state; no production or sale commitment.',
  }),
  // ---- Tier-6 (Stratum-7) Launch Preparation restructure 2026-06-18 ---------
  // Three livestock deltas folded into the shared universal s7 launch-prep
  // objectives so the grazing dimension rides the whole-site Phase 1 plan,
  // resource plan, and risk register. Sequencing only - the silvopasture primary
  // s7 set already owns the establishment-sequence / stocking-buildup objectives;
  // these patches surface the stock layer in the UNIVERSAL launch objectives.
  // SILV>U-S7.1 Establishment sequence
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's7-phase1',
    ref: 'SILV>U-S7.1',
    injectedItems: [
      ck(
        's7-phase1-silv-1',
        'Sequence pasture and tree establishment ahead of livestock introduction within the Phase 1 plan - stock arrive only after infrastructure and pasture-readiness gates pass',
      ),
      ck(
        's7-phase1-silv-2',
        'Mark the tree-protection-phase milestones in the Phase 1 sequence that gate partial and full stocking',
      ),
    ],
    injectedGroups: [
      dg('s7-phase1-dgsilv1', 'Establishment sequence & stocking gates', [
        's7-phase1-silv-1',
        's7-phase1-silv-2',
      ]),
    ],
    completionGateAmendment:
      'Establishment sequence places pasture and tree establishment ahead of stocking, with tree-protection milestones gating stock introduction.',
    scopeNote:
      'Silvopasture secondary: integrated grazing is sequenced behind pasture and tree establishment; stock arrive only after readiness gates pass.',
  }),
  // SILV>U-S7.2 Livestock sourcing folded into the resource plan
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's7-resource-plan',
    ref: 'SILV>U-S7.2',
    injectedItems: [
      ck(
        's7-resource-plan-silv-1',
        'Add livestock acquisition to the Phase 1 resource plan - breed, vendor, transport, and quarantine sourcing, scheduled behind the infrastructure readiness gates',
      ),
      ck(
        's7-resource-plan-silv-2',
        'Add establishment-period feed and fencing / water capital for the staged stocking buildup',
      ),
    ],
    injectedGroups: [
      dg('s7-resource-plan-dgsilv1', 'Livestock sourcing & establishment capital', [
        's7-resource-plan-silv-1',
        's7-resource-plan-silv-2',
      ]),
    ],
    completionGateAmendment:
      'Livestock sourcing and establishment-period feed / infrastructure capital folded into the Phase 1 resource plan.',
    scopeNote:
      'Silvopasture secondary: stocking is a resourced, sequenced acquisition of livestock the steward will own and possess - no advance sale or commitment of unproduced output.',
  }),
  // SILV>U-S7.3 Livestock-establishment risks
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's7-risk-register',
    ref: 'SILV>U-S7.3',
    injectedItems: [
      ck(
        's7-risk-register-silv-1',
        'Add livestock-establishment risks to the register - stocking ahead of pasture readiness, tree-guard failure under early grazing, drought-driven feed shortfall during buildup',
      ),
      ck(
        's7-risk-register-silv-2',
        'Define contingency for reduced establishment-period carrying capacity - supplementary feed, agistment, or a destocking trigger',
      ),
    ],
    injectedGroups: [
      dg('s7-risk-register-dgsilv1', 'Livestock establishment risks', [
        's7-risk-register-silv-1',
        's7-risk-register-silv-2',
      ]),
    ],
    completionGateAmendment:
      'Livestock-establishment risks and a reduced-carrying-capacity contingency added to the register.',
    scopeNote:
      'Silvopasture secondary: the establishment period carries grazing-specific risks (premature stocking, tree-guard failure, feed shortfall) the base register may not capture.',
  }),
];

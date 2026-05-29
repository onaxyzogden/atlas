// catalogues/regenFarm.ts
//
// Regenerative Farm PRIMARY-type objectives - the 13 type-specific objectives
// that a Regenerative Farm adds on top of the 19 Universal objectives
// (OLOS RegenFarm Objective Catalogue v1.3, the anchor catalogue).
//
// This file holds ONLY the primary-layer objectives. The universal slot lives
// in ./universal.ts (RegenFarm's universal content is the shared baseline).
// Inline "Expanded by: <secondary>" items and standalone secondary objectives
// from the source doc are NOT transcribed here - secondary content is resolved
// at runtime from the secondary catalogues + patch records.
//
// source: 'primary', sourceTypeId: 'regenerative_farm' on every objective.
// Refs follow Authoring Standards v1.4 (RF-T<tier>.<n>). ASCII-only copy.

import type { PlanTierObjective } from '../../../schemas/plan/planTierObjective.schema.js';
import { ck, obj } from './authoring.js';

export const REGEN_FARM_PRIMARY_OBJECTIVES: readonly PlanTierObjective[] = [
  // ---------------------------------------------------------------- Tier 0
  obj({
    id: 'rf-t0-enterprise-mix',
    tierId: 't0-project-foundation',
    ref: 'RF-T0.4',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Define enterprise mix & priorities',
    focusedQuestion:
      'Which enterprises will this farm run, in what priority order, and how do they depend on and support each other?',
    checklist: [
      ck(
        'rf-t0-enterprise-mix-c1',
        'List all intended enterprises with a brief description of each',
      ),
      ck(
        'rf-t0-enterprise-mix-c2',
        'Assign priority tier to each enterprise - core, supporting, or aspirational',
      ),
      ck(
        'rf-t0-enterprise-mix-c3',
        'Map interdependencies: which enterprises enable, support, or feed each other',
      ),
      ck(
        'rf-t0-enterprise-mix-c4',
        'Identify which enterprises require others to be established first',
      ),
      ck(
        'rf-t0-enterprise-mix-c5',
        'Estimate timeline to first production or revenue for each enterprise',
      ),
      ck(
        'rf-t0-enterprise-mix-c6',
        'Record enterprise spatial conflicts or resource competition',
      ),
      ck(
        'rf-t0-enterprise-mix-c7',
        'Confirm enterprise mix is achievable within Tier 0 capacity constraints',
      ),
      ck(
        'rf-t0-enterprise-mix-c8',
        'Define ecological readiness criteria that must be met before each enterprise launches',
      ),
    ],
    completionGate: 'Enterprise mix confirmed, prioritised, and integrated.',
    actHandoff: 'Enterprise Mix & Priority Brief',
  }),
  // ---------------------------------------------------------------- Tier 1
  obj({
    id: 'rf-t1-land-health',
    tierId: 't1-land-reading',
    ref: 'RF-T1.5',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Survey existing land health & degradation',
    focusedQuestion:
      'What is the current productive and ecological condition of the land, and what degradation must be addressed?',
    checklist: [
      ck('rf-t1-land-health-c1', 'Map areas of soil erosion - sheet, rill, and gully'),
      ck('rf-t1-land-health-c2', 'Assess compaction depth and distribution across the site'),
      ck('rf-t1-land-health-c3', 'Record weed burden by species and zone - density and spread'),
      ck(
        'rf-t1-land-health-c4',
        'Conduct historical land-use forensics - research past cropping history, chemical inputs, hardpan formation, and structural degradation legacies',
      ),
      ck(
        'rf-t1-land-health-c5',
        'Map surrounding landscape vectors - identify adjacent land-use practices, spray drift risk, and pest and disease migration sources from neighbouring properties',
      ),
      ck(
        'rf-t1-land-health-c6',
        'Document past land use history from all available sources - title records, aerial photos, local knowledge',
      ),
      ck(
        'rf-t1-land-health-c7',
        'Identify areas of soil loss, nutrient depletion, or chemical contamination',
      ),
      ck('rf-t1-land-health-c8', 'Map drainage problems - waterlogging, salt scalds, hardpan'),
      ck(
        'rf-t1-land-health-c9',
        'Prioritise degradation zones by urgency and design implication',
      ),
    ],
    completionGate:
      'Land health assessment complete. All degradation zones mapped and prioritised.',
    actHandoff: 'Land Health & Degradation Assessment',
  }),
  obj({
    id: 'rf-t1-landscape-context',
    tierId: 't1-land-reading',
    ref: 'RF-T1.6',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Survey surrounding landscape context',
    focusedQuestion:
      'How does the surrounding landscape shape the opportunities and constraints of this project?',
    checklist: [
      ck('rf-t1-landscape-context-c1', 'Map surrounding land uses within 2km radius'),
      ck(
        'rf-t1-landscape-context-c2',
        'Identify neighbouring agricultural practices and their spray and runoff risk',
      ),
      ck('rf-t1-landscape-context-c3', 'Assess landscape-scale water catchment context'),
      ck(
        'rf-t1-landscape-context-c4',
        'Identify wildlife corridors and movement patterns in the broader landscape',
      ),
      ck(
        'rf-t1-landscape-context-c5',
        'Record landscape-scale pest and weed pressure sources',
      ),
      ck(
        'rf-t1-landscape-context-c6',
        'Note landscape-scale opportunities - shared water, wildlife, markets',
      ),
    ],
    completionGate:
      'Landscape context survey complete. Key influences and opportunities recorded.',
    actHandoff: 'Landscape Context Survey Package',
  }),
  // ---------------------------------------------------------------- Tier 2
  obj({
    id: 'rf-t2-nutrient-cycling',
    tierId: 't2-systems-reading',
    ref: 'RF-T2.3',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Survey nutrient cycling & organic matter flows',
    focusedQuestion:
      'How is organic matter currently moving through and accumulating in this system?',
    checklist: [
      ck(
        'rf-t2-nutrient-cycling-c1',
        'Assess existing decomposer activity - fungi, invertebrates, bacteria indicators',
      ),
      ck(
        'rf-t2-nutrient-cycling-c2',
        'Record organic matter inputs currently entering the system',
      ),
      ck(
        'rf-t2-nutrient-cycling-c3',
        'Identify nutrient loss pathways - leaching, erosion, removal',
      ),
      ck('rf-t2-nutrient-cycling-c4', 'Assess existing composting or fertility infrastructure'),
      ck('rf-t2-nutrient-cycling-c5', 'Map variation in organic matter levels across the site'),
      ck(
        'rf-t2-nutrient-cycling-c6',
        'Record biological indicators of soil health - earthworm counts, root depth, smell',
      ),
    ],
    completionGate:
      'Nutrient cycling baseline complete. Organic matter flows mapped and recorded.',
    actHandoff: 'Nutrient Cycling Baseline Report',
  }),
  obj({
    id: 'rf-t2-pest-pressure',
    tierId: 't2-systems-reading',
    ref: 'RF-T2.4',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Survey pest, disease & weed pressure patterns',
    focusedQuestion:
      'What pest, disease, and weed pressures exist on this site, and what are their ecological drivers?',
    scopeNotes:
      'Runs concurrently with nutrient cycling - biological abundance and pest pressure escalate together.',
    checklist: [
      ck(
        'rf-t2-pest-pressure-c1',
        'Map weed species by zone - density, spread, and seasonal pattern',
      ),
      ck(
        'rf-t2-pest-pressure-c2',
        'Identify pest species present and their population indicators',
      ),
      ck(
        'rf-t2-pest-pressure-c3',
        'Record known disease pressure history for intended enterprises',
      ),
      ck(
        'rf-t2-pest-pressure-c4',
        'Assess relationships between pest and disease pressure and land condition',
      ),
      ck('rf-t2-pest-pressure-c5', 'Identify pest pressure sources in surrounding landscape'),
      ck('rf-t2-pest-pressure-c6', 'Record natural predator and beneficial species presence'),
      ck(
        'rf-t2-pest-pressure-c7',
        'Prioritise pressures by enterprise risk and design implication',
      ),
    ],
    completionGate:
      'Pest, disease, and weed pressure baseline complete. Ecological relationships identified.',
    actHandoff: 'Pest, Disease & Weed Pressure Baseline Report',
  }),
  // ---------------------------------------------------------------- Tier 3
  obj({
    id: 'rf-t3-fertility-strategy',
    tierId: 't3-foundation-decisions',
    ref: 'RF-T3.4',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Define whole-farm fertility & nutrient cycling strategy',
    focusedQuestion:
      'How will this farm build and maintain soil fertility through closed-loop nutrient cycling?',
    checklist: [
      ck(
        'rf-t3-fertility-strategy-c1',
        'Define primary fertility inputs - compost, animal manure, green manures, mulch',
      ),
      ck(
        'rf-t3-fertility-strategy-c2',
        'Design compost production system - type, scale, feedstock sources',
      ),
      ck('rf-t3-fertility-strategy-c3', 'Define animal integration role in fertility cycling'),
      ck(
        'rf-t3-fertility-strategy-c4',
        'Select cover crop and green manure species for rotation',
      ),
      ck('rf-t3-fertility-strategy-c5', 'Define external input reduction targets'),
      ck('rf-t3-fertility-strategy-c6', 'Establish fertility monitoring indicators'),
    ],
    completionGate:
      'Fertility strategy approved. Closed-loop cycling approach defined for all enterprises.',
    actHandoff: 'Whole-Farm Fertility Strategy Brief',
  }),
  obj({
    id: 'rf-t3-biodiversity-strategy',
    tierId: 't3-foundation-decisions',
    ref: 'RF-T3.5',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Define biodiversity readiness & habitat infrastructure strategy',
    focusedQuestion:
      'What habitat infrastructure will we establish, where, and what ecological roles will it fulfil?',
    scopeNotes:
      'This is a siting and commitment decision - the actual design of habitat infrastructure is executed in Tier 4.',
    checklist: [
      ck(
        'rf-t3-biodiversity-strategy-c1',
        'Define biodiversity readiness goals - what ecological functions must be present before each enterprise launches',
      ),
      ck(
        'rf-t3-biodiversity-strategy-c2',
        'Identify zones for native habitat establishment - wild margins, corridors, riparian areas',
      ),
      ck(
        'rf-t3-biodiversity-strategy-c3',
        'Decide raptor and predator habitat infrastructure - pole placement zones, nesting box locations, perch sites',
      ),
      ck(
        'rf-t3-biodiversity-strategy-c4',
        'Define minimum wild zone commitments - areas that will not be managed for production',
      ),
      ck(
        'rf-t3-biodiversity-strategy-c5',
        'Select ecological indicator species for each habitat zone',
      ),
      ck('rf-t3-biodiversity-strategy-c6', 'Define invasive species management strategy'),
    ],
    completionGate:
      'Biodiversity readiness strategy approved. Habitat infrastructure locations decided and ecological roles defined. Design deferred to Tier 4.',
    actHandoff: 'Biodiversity Readiness & Habitat Infrastructure Strategy Brief',
  }),
  // ---------------------------------------------------------------- Tier 4
  obj({
    id: 'rf-t4-fertility-system',
    tierId: 't4-system-design',
    ref: 'RF-T4.4',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Design integrated fertility system',
    focusedQuestion: 'How will the fertility system physically work across all enterprises?',
    checklist: [
      ck(
        'rf-t4-fertility-system-c1',
        'Design compost production infrastructure - bays, turning equipment, feedstock management',
      ),
      ck(
        'rf-t4-fertility-system-c2',
        'Design compost application system - machinery, timing, rates by zone',
      ),
      ck('rf-t4-fertility-system-c3', 'Design animal integration rotation for fertility transfer'),
      ck(
        'rf-t4-fertility-system-c4',
        'Design cover crop and green manure rotation by field block',
      ),
      ck(
        'rf-t4-fertility-system-c5',
        'Specify external input substitution plan - what gets replaced, by what, by when',
      ),
      ck('rf-t4-fertility-system-c6', 'Design nutrient monitoring and adjustment protocol'),
    ],
    completionGate:
      'Integrated fertility system design approved. All components specified and sequenced.',
    actHandoff: 'Integrated Fertility System Design Package',
  }),
  obj({
    id: 'rf-t4-windbreaks',
    tierId: 't4-system-design',
    ref: 'RF-T4.5',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Design windbreaks, shelterbelts & microclimate plantings',
    focusedQuestion:
      'How will protective plantings be designed to shelter enterprises, create wildlife corridors, and mitigate fire risk?',
    checklist: [
      ck(
        'rf-t4-windbreaks-c1',
        'Map windbreak and shelterbelt locations relative to prevailing wind sectors and Santa Ana or regional wind events',
      ),
      ck(
        'rf-t4-windbreaks-c2',
        'Design multi-strata planting structure - canopy, understory, and groundcover layers for each shelterbelt',
      ),
      ck(
        'rf-t4-windbreaks-c3',
        'Select species for each windbreak function - wind buffering, frost mitigation, wildlife habitat, productive yield',
      ),
      ck(
        'rf-t4-windbreaks-c4',
        'Design wildlife corridor connectivity - map shelterbelt network as continuous habitat linkage across the farm',
      ),
      ck(
        'rf-t4-windbreaks-c5',
        'Specify raptor and predator habitat features within shelterbelts - perch sites, nesting structure, roost zones',
      ),
      ck(
        'rf-t4-windbreaks-c6',
        'Design wildfire mitigation function - moisture-retaining species selection, green buffer placement, firebreak integration',
      ),
      ck(
        'rf-t4-windbreaks-c7',
        'Specify planting layout - species mix, spacing, row configuration, and establishment sequence',
      ),
      ck('rf-t4-windbreaks-c8', 'Define long-term management and coppicing strategy'),
    ],
    completionGate:
      'Windbreak and shelterbelt design approved. Multi-strata structure, wildlife corridor function, and wildfire mitigation confirmed.',
    actHandoff: 'Windbreak & Shelterbelt Design Package',
  }),
  // ---------------------------------------------------------------- Tier 5
  obj({
    id: 'rf-t5-biodiversity-monitoring',
    tierId: 't5-integration-design',
    ref: 'RF-T5.2',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Design whole-farm biodiversity monitoring protocol',
    focusedQuestion: 'How will ecological health be tracked across all zones over time?',
    checklist: [
      ck(
        'rf-t5-biodiversity-monitoring-c1',
        'Select biodiversity indicators - species groups, habitat markers, ecological processes',
      ),
      ck('rf-t5-biodiversity-monitoring-c2', 'Design monitoring transects or sampling zones'),
      ck('rf-t5-biodiversity-monitoring-c3', 'Define survey frequency and seasonal timing'),
      ck('rf-t5-biodiversity-monitoring-c4', 'Specify recording methods and data storage'),
      ck('rf-t5-biodiversity-monitoring-c5', 'Define threshold triggers for management response'),
    ],
    completionGate:
      'Biodiversity monitoring protocol approved. Indicators, methods, and triggers defined.',
    actHandoff: 'Biodiversity Monitoring Protocol',
  }),
  obj({
    id: 'rf-t5-enterprise-integration',
    tierId: 't5-integration-design',
    ref: 'RF-T5.3',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Design enterprise integration & feedback loops',
    focusedQuestion:
      'What are the concrete waste-to-input loops between enterprises, and how will they be operationalised?',
    checklist: [
      ck(
        'rf-t5-enterprise-integration-c1',
        'Complete a waste-to-input matrix: for each enterprise, identify its primary waste stream or pest pressure and map which enterprise or biological process treats it as an input',
      ),
      ck(
        'rf-t5-enterprise-integration-c2',
        'Confirm at least one verified closed loop per enterprise before this objective gates - unconnected enterprises must be flagged',
      ),
      ck(
        'rf-t5-enterprise-integration-c3',
        'Design operational sequences for each confirmed loop - timing, movement protocol, quantities',
      ),
      ck(
        'rf-t5-enterprise-integration-c4',
        'Define fertility transfer protocols - which animal enterprise moves to which crop zone, when, and at what stocking density',
      ),
      ck(
        'rf-t5-enterprise-integration-c5',
        'Specify decision triggers - what observable condition in Enterprise A initiates a management response in Enterprise B',
      ),
      ck(
        'rf-t5-enterprise-integration-c6',
        'Design integrated farm calendar mapping all enterprise rhythms and handoff moments',
      ),
      ck(
        'rf-t5-enterprise-integration-c7',
        'Define record-keeping system for tracking loop performance over time',
      ),
    ],
    completionGate:
      'Waste-to-input matrix complete with at least one confirmed operational loop per enterprise. All unconnected enterprises explicitly flagged. Farm calendar approved.',
    actHandoff: 'Enterprise Integration Matrix & Operational Calendar',
  }),
  // ---------------------------------------------------------------- Tier 6
  obj({
    id: 'rf-t6-enterprise-sequencing',
    tierId: 't6-phasing-resourcing',
    ref: 'RF-T6.4',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Define enterprise sequencing & phasing logic',
    focusedQuestion:
      'In what strategic order will enterprises be launched, and how does each enable the next?',
    checklist: [
      ck(
        'rf-t6-enterprise-sequencing-c1',
        'Confirm enterprise priority tiers from Tier 0 enterprise mix',
      ),
      ck(
        'rf-t6-enterprise-sequencing-c2',
        'Map enabling dependencies - which enterprises must be established before others launch',
      ),
      ck(
        'rf-t6-enterprise-sequencing-c3',
        'Define revenue bridge strategy - which early enterprises fund later capital requirements',
      ),
      ck('rf-t6-enterprise-sequencing-c4', 'Sequence enterprise launches across planning cycles'),
      ck('rf-t6-enterprise-sequencing-c5', 'Define go/no-go criteria for each enterprise launch'),
    ],
    completionGate:
      'Enterprise sequencing logic approved. Launch order and enabling dependencies confirmed.',
    actHandoff: 'Enterprise Sequencing & Phasing Logic Brief',
  }),
  obj({
    id: 'rf-t6-cash-flow',
    tierId: 't6-phasing-resourcing',
    ref: 'RF-T6.5',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Define whole-farm cash flow staging',
    focusedQuestion:
      "How will the farm's revenue and expenditure sequence across the establishment phase to ensure financial viability?",
    checklist: [
      ck(
        'rf-t6-cash-flow-c1',
        'Map revenue timeline for each enterprise - first production, first sales, scaling milestones',
      ),
      ck('rf-t6-cash-flow-c2', 'Estimate establishment costs by enterprise and phase'),
      ck('rf-t6-cash-flow-c3', 'Identify cash flow gap periods and bridge strategies'),
      ck('rf-t6-cash-flow-c4', 'Define minimum viable revenue threshold for each phase'),
      ck(
        'rf-t6-cash-flow-c5',
        'Confirm scope stays within operational planning - no capital formation or investor structure content',
      ),
    ],
    completionGate:
      'Cash flow staging approved. Revenue timeline and gap strategy confirmed within operational planning scope.',
    actHandoff: 'Cash Flow Staging Brief',
  }),
];

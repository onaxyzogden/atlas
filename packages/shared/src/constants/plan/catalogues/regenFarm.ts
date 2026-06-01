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
//
// Decision groups (Decision Groups Reference v1.0; spec section 9.3-9.4):
// the reference doc supplies decision-group rows ONLY for the 19 universal
// objectives (its RegenFarm primary rows are a different catalogue generation
// that does not match these encoded objectives). Per the 2026-05-31 EXTENDED
// operator override, the decision groups below - labels, item membership, AND
// observe-feed labels - are FULLY AUTHORED by Claude (not transcribed). Each
// objective has 2-4 groups; membership is a full mutually-exclusive partition
// of the checklist (every item in exactly one group); feed labels reuse the
// doc's display vocabulary by semantic fit (`Multiple` for cross-cutting; `[]`
// where no single domain dominates). Group ids follow <objId>-dg<n>.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj } from './authoring.js';

export const REGEN_FARM_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'rf-s1-enterprise-mix',
    stratumId: 's1-project-foundation',
    ref: 'RF-S1.4',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'A clear enterprise mix & priorities',
    focusedQuestion:
      'Which enterprises will this farm run, in what priority order, and how do they depend on and support each other?',
    checklist: [
      ck(
        'rf-s1-enterprise-mix-c1',
        'List all intended enterprises with a brief description of each',
      ),
      ck(
        'rf-s1-enterprise-mix-c2',
        'Assign priority tier to each enterprise - core, supporting, or aspirational',
      ),
      ck(
        'rf-s1-enterprise-mix-c3',
        'Map interdependencies: which enterprises enable, support, or feed each other',
      ),
      ck(
        'rf-s1-enterprise-mix-c4',
        'Identify which enterprises require others to be established first',
      ),
      ck(
        'rf-s1-enterprise-mix-c5',
        'Estimate timeline to first production or revenue for each enterprise',
      ),
      ck(
        'rf-s1-enterprise-mix-c6',
        'Record enterprise spatial conflicts or resource competition',
      ),
      ck(
        'rf-s1-enterprise-mix-c7',
        'Confirm enterprise mix is achievable within Stratum 1 capacity constraints',
      ),
      ck(
        'rf-s1-enterprise-mix-c8',
        'Define ecological readiness criteria that must be met before each enterprise launches',
      ),
    ],
    decisionGroups: [
      dg('rf-s1-enterprise-mix-dg1', 'Enterprise inventory & priorities', [
        'rf-s1-enterprise-mix-c1',
        'rf-s1-enterprise-mix-c2',
      ]),
      dg('rf-s1-enterprise-mix-dg2', 'Interdependencies & sequencing', [
        'rf-s1-enterprise-mix-c3',
        'rf-s1-enterprise-mix-c4',
        'rf-s1-enterprise-mix-c5',
      ]),
      dg('rf-s1-enterprise-mix-dg3', 'Feasibility & readiness', [
        'rf-s1-enterprise-mix-c6',
        'rf-s1-enterprise-mix-c7',
        'rf-s1-enterprise-mix-c8',
      ]),
    ],
    completionGate: 'Enterprise mix confirmed, prioritised, and integrated.',
    actHandoff: 'Enterprise Mix & Priority Brief',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'rf-s2-land-health',
    stratumId: 's2-land-reading',
    ref: 'RF-S2.5',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'A clear read of land health & degradation',
    focusedQuestion:
      'What is the current productive and ecological condition of the land, and what degradation must be addressed?',
    checklist: [
      ck('rf-s2-land-health-c1', 'Map areas of soil erosion - sheet, rill, and gully'),
      ck('rf-s2-land-health-c2', 'Assess compaction depth and distribution across the site'),
      ck('rf-s2-land-health-c3', 'Record weed burden by species and zone - density and spread'),
      ck(
        'rf-s2-land-health-c4',
        'Conduct historical land-use forensics - research past cropping history, chemical inputs, hardpan formation, and structural degradation legacies',
      ),
      ck(
        'rf-s2-land-health-c5',
        'Map surrounding landscape vectors - identify adjacent land-use practices, spray drift risk, and pest and disease migration sources from neighbouring properties',
      ),
      ck(
        'rf-s2-land-health-c6',
        'Document past land use history from all available sources - title records, aerial photos, local knowledge',
      ),
      ck(
        'rf-s2-land-health-c7',
        'Identify areas of soil loss, nutrient depletion, or chemical contamination',
      ),
      ck('rf-s2-land-health-c8', 'Map drainage problems - waterlogging, salt scalds, hardpan'),
      ck(
        'rf-s2-land-health-c9',
        'Prioritise degradation zones by urgency and design implication',
      ),
    ],
    decisionGroups: [
      dg(
        'rf-s2-land-health-dg1',
        'Physical degradation',
        ['rf-s2-land-health-c1', 'rf-s2-land-health-c2', 'rf-s2-land-health-c8'],
        ['Soil'],
      ),
      dg(
        'rf-s2-land-health-dg2',
        'Biological & chemical condition',
        ['rf-s2-land-health-c3', 'rf-s2-land-health-c7'],
        ['Soil'],
      ),
      dg(
        'rf-s2-land-health-dg3',
        'Land-use history & landscape vectors',
        ['rf-s2-land-health-c4', 'rf-s2-land-health-c5', 'rf-s2-land-health-c6'],
        ['Multiple'],
      ),
      dg('rf-s2-land-health-dg4', 'Degradation prioritisation', [
        'rf-s2-land-health-c9',
      ]),
    ],
    completionGate:
      'Land health assessment complete. All degradation zones mapped and prioritised.',
    actHandoff: 'Land Health & Degradation Assessment',
  }),
  obj({
    id: 'rf-s2-landscape-context',
    stratumId: 's2-land-reading',
    ref: 'RF-S2.6',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'A clear read of surrounding landscape context',
    focusedQuestion:
      'How does the surrounding landscape shape the opportunities and constraints of this project?',
    checklist: [
      ck('rf-s2-landscape-context-c1', 'Map surrounding land uses within 2km radius'),
      ck(
        'rf-s2-landscape-context-c2',
        'Identify neighbouring agricultural practices and their spray and runoff risk',
      ),
      ck('rf-s2-landscape-context-c3', 'Assess landscape-scale water catchment context'),
      ck(
        'rf-s2-landscape-context-c4',
        'Identify wildlife corridors and movement patterns in the broader landscape',
      ),
      ck(
        'rf-s2-landscape-context-c5',
        'Record landscape-scale pest and weed pressure sources',
      ),
      ck(
        'rf-s2-landscape-context-c6',
        'Note landscape-scale opportunities - shared water, wildlife, markets',
      ),
    ],
    decisionGroups: [
      dg(
        'rf-s2-landscape-context-dg1',
        'Adjacent land use & risk',
        [
          'rf-s2-landscape-context-c1',
          'rf-s2-landscape-context-c2',
          'rf-s2-landscape-context-c5',
        ],
        ['Multiple'],
      ),
      dg(
        'rf-s2-landscape-context-dg2',
        'Landscape flows & opportunities',
        [
          'rf-s2-landscape-context-c3',
          'rf-s2-landscape-context-c4',
          'rf-s2-landscape-context-c6',
        ],
        ['Multiple'],
      ),
    ],
    completionGate:
      'Landscape context survey complete. Key influences and opportunities recorded.',
    actHandoff: 'Landscape Context Survey Package',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'rf-s3-nutrient-cycling',
    stratumId: 's3-systems-reading',
    ref: 'RF-S3.3',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'A clear read of nutrient cycling & organic matter',
    focusedQuestion:
      'How is organic matter currently moving through and accumulating in this system?',
    checklist: [
      ck(
        'rf-s3-nutrient-cycling-c1',
        'Assess existing decomposer activity - fungi, invertebrates, bacteria indicators',
      ),
      ck(
        'rf-s3-nutrient-cycling-c2',
        'Record organic matter inputs currently entering the system',
      ),
      ck(
        'rf-s3-nutrient-cycling-c3',
        'Identify nutrient loss pathways - leaching, erosion, removal',
      ),
      ck('rf-s3-nutrient-cycling-c4', 'Assess existing composting or fertility infrastructure'),
      ck('rf-s3-nutrient-cycling-c5', 'Map variation in organic matter levels across the site'),
      ck(
        'rf-s3-nutrient-cycling-c6',
        'Record biological indicators of soil health - earthworm counts, root depth, smell',
      ),
    ],
    decisionGroups: [
      dg(
        'rf-s3-nutrient-cycling-dg1',
        'Biological activity & indicators',
        ['rf-s3-nutrient-cycling-c1', 'rf-s3-nutrient-cycling-c6'],
        ['Soil'],
      ),
      dg(
        'rf-s3-nutrient-cycling-dg2',
        'Organic matter flows',
        [
          'rf-s3-nutrient-cycling-c2',
          'rf-s3-nutrient-cycling-c3',
          'rf-s3-nutrient-cycling-c5',
        ],
        ['Soil'],
      ),
      dg(
        'rf-s3-nutrient-cycling-dg3',
        'Existing fertility infrastructure',
        ['rf-s3-nutrient-cycling-c4'],
        ['Soil'],
      ),
    ],
    completionGate:
      'Nutrient cycling baseline complete. Organic matter flows mapped and recorded.',
    actHandoff: 'Nutrient Cycling Baseline Report',
  }),
  obj({
    id: 'rf-s3-pest-pressure',
    stratumId: 's3-systems-reading',
    ref: 'RF-S3.4',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'A clear read of pest, disease & weed pressure',
    focusedQuestion:
      'What pest, disease, and weed pressures exist on this site, and what are their ecological drivers?',
    scopeNotes:
      'Runs concurrently with nutrient cycling - biological abundance and pest pressure escalate together.',
    checklist: [
      ck(
        'rf-s3-pest-pressure-c1',
        'Map weed species by zone - density, spread, and seasonal pattern',
      ),
      ck(
        'rf-s3-pest-pressure-c2',
        'Identify pest species present and their population indicators',
      ),
      ck(
        'rf-s3-pest-pressure-c3',
        'Record known disease pressure history for intended enterprises',
      ),
      ck(
        'rf-s3-pest-pressure-c4',
        'Assess relationships between pest and disease pressure and land condition',
      ),
      ck('rf-s3-pest-pressure-c5', 'Identify pest pressure sources in surrounding landscape'),
      ck('rf-s3-pest-pressure-c6', 'Record natural predator and beneficial species presence'),
      ck(
        'rf-s3-pest-pressure-c7',
        'Prioritise pressures by enterprise risk and design implication',
      ),
    ],
    decisionGroups: [
      dg(
        'rf-s3-pest-pressure-dg1',
        'Pest, disease & weed inventory',
        ['rf-s3-pest-pressure-c1', 'rf-s3-pest-pressure-c2', 'rf-s3-pest-pressure-c3'],
        ['Ecology & Habitat'],
      ),
      dg(
        'rf-s3-pest-pressure-dg2',
        'Ecological drivers & sources',
        ['rf-s3-pest-pressure-c4', 'rf-s3-pest-pressure-c5', 'rf-s3-pest-pressure-c6'],
        ['Ecology & Habitat'],
      ),
      dg('rf-s3-pest-pressure-dg3', 'Pressure prioritisation', [
        'rf-s3-pest-pressure-c7',
      ]),
    ],
    completionGate:
      'Pest, disease, and weed pressure baseline complete. Ecological relationships identified.',
    actHandoff: 'Pest, Disease & Weed Pressure Baseline Report',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'rf-s4-fertility-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'RF-S4.4',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'A sound whole-farm fertility & nutrient cycling strategy',
    focusedQuestion:
      'How will this farm build and maintain soil fertility through closed-loop nutrient cycling?',
    checklist: [
      ck(
        'rf-s4-fertility-strategy-c1',
        'Define primary fertility inputs - compost, animal manure, green manures, mulch',
      ),
      ck(
        'rf-s4-fertility-strategy-c2',
        'Design compost production system - type, scale, feedstock sources',
      ),
      ck('rf-s4-fertility-strategy-c3', 'Define animal integration role in fertility cycling'),
      ck(
        'rf-s4-fertility-strategy-c4',
        'Select cover crop and green manure species for rotation',
      ),
      ck('rf-s4-fertility-strategy-c5', 'Define external input reduction targets'),
      ck('rf-s4-fertility-strategy-c6', 'Establish fertility monitoring indicators'),
    ],
    decisionGroups: [
      dg(
        'rf-s4-fertility-strategy-dg1',
        'Fertility inputs & sources',
        ['rf-s4-fertility-strategy-c1', 'rf-s4-fertility-strategy-c2'],
        ['Soil'],
      ),
      dg(
        'rf-s4-fertility-strategy-dg2',
        'Biological cycling',
        ['rf-s4-fertility-strategy-c3', 'rf-s4-fertility-strategy-c4'],
        ['Soil'],
      ),
      dg(
        'rf-s4-fertility-strategy-dg3',
        'Targets & monitoring',
        ['rf-s4-fertility-strategy-c5', 'rf-s4-fertility-strategy-c6'],
        ['Soil'],
      ),
    ],
    completionGate:
      'Fertility strategy approved. Closed-loop cycling approach defined for all enterprises.',
    actHandoff: 'Whole-Farm Fertility Strategy Brief',
  }),
  obj({
    id: 'rf-s4-biodiversity-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'RF-S4.5',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'A sound biodiversity & habitat infrastructure strategy',
    focusedQuestion:
      'What habitat infrastructure will we establish, where, and what ecological roles will it fulfil?',
    scopeNotes:
      'This is a siting and commitment decision - the actual design of habitat infrastructure is executed in Stratum 5.',
    checklist: [
      ck(
        'rf-s4-biodiversity-strategy-c1',
        'Define biodiversity readiness goals - what ecological functions must be present before each enterprise launches',
      ),
      ck(
        'rf-s4-biodiversity-strategy-c2',
        'Identify zones for native habitat establishment - wild margins, corridors, riparian areas',
      ),
      ck(
        'rf-s4-biodiversity-strategy-c3',
        'Decide raptor and predator habitat infrastructure - pole placement zones, nesting box locations, perch sites',
      ),
      ck(
        'rf-s4-biodiversity-strategy-c4',
        'Define minimum wild zone commitments - areas that will not be managed for production',
      ),
      ck(
        'rf-s4-biodiversity-strategy-c5',
        'Select ecological indicator species for each habitat zone',
      ),
      ck('rf-s4-biodiversity-strategy-c6', 'Define invasive species management strategy'),
    ],
    decisionGroups: [
      dg(
        'rf-s4-biodiversity-strategy-dg1',
        'Readiness goals & indicators',
        ['rf-s4-biodiversity-strategy-c1', 'rf-s4-biodiversity-strategy-c5'],
        ['Ecology & Habitat'],
      ),
      dg(
        'rf-s4-biodiversity-strategy-dg2',
        'Habitat siting & commitments',
        [
          'rf-s4-biodiversity-strategy-c2',
          'rf-s4-biodiversity-strategy-c3',
          'rf-s4-biodiversity-strategy-c4',
        ],
        ['Ecology & Habitat'],
      ),
      dg(
        'rf-s4-biodiversity-strategy-dg3',
        'Invasive management',
        ['rf-s4-biodiversity-strategy-c6'],
        ['Ecology & Habitat'],
      ),
    ],
    completionGate:
      'Biodiversity readiness strategy approved. Habitat infrastructure locations decided and ecological roles defined. Design deferred to Stratum 5.',
    actHandoff: 'Biodiversity Readiness & Habitat Infrastructure Strategy Brief',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'rf-s5-fertility-system',
    stratumId: 's5-system-design',
    ref: 'RF-S5.4',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'A working integrated fertility system',
    focusedQuestion: 'How will the fertility system physically work across all enterprises?',
    checklist: [
      ck(
        'rf-s5-fertility-system-c1',
        'Design compost production infrastructure - bays, turning equipment, feedstock management',
      ),
      ck(
        'rf-s5-fertility-system-c2',
        'Design compost application system - machinery, timing, rates by zone',
      ),
      ck('rf-s5-fertility-system-c3', 'Design animal integration rotation for fertility transfer'),
      ck(
        'rf-s5-fertility-system-c4',
        'Design cover crop and green manure rotation by field block',
      ),
      ck(
        'rf-s5-fertility-system-c5',
        'Specify external input substitution plan - what gets replaced, by what, by when',
      ),
      ck('rf-s5-fertility-system-c6', 'Design nutrient monitoring and adjustment protocol'),
    ],
    decisionGroups: [
      dg(
        'rf-s5-fertility-system-dg1',
        'Compost production & application',
        ['rf-s5-fertility-system-c1', 'rf-s5-fertility-system-c2'],
        ['Soil'],
      ),
      dg(
        'rf-s5-fertility-system-dg2',
        'Rotational cycling',
        ['rf-s5-fertility-system-c3', 'rf-s5-fertility-system-c4'],
        ['Soil'],
      ),
      dg(
        'rf-s5-fertility-system-dg3',
        'Substitution & monitoring',
        ['rf-s5-fertility-system-c5', 'rf-s5-fertility-system-c6'],
        ['Soil'],
      ),
    ],
    completionGate:
      'Integrated fertility system design approved. All components specified and sequenced.',
    actHandoff: 'Integrated Fertility System Design Package',
  }),
  obj({
    id: 'rf-s5-windbreaks',
    stratumId: 's5-system-design',
    ref: 'RF-S5.5',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Well-designed windbreaks, shelterbelts & plantings',
    focusedQuestion:
      'How will protective plantings be designed to shelter enterprises, create wildlife corridors, and mitigate fire risk?',
    checklist: [
      ck(
        'rf-s5-windbreaks-c1',
        'Map windbreak and shelterbelt locations relative to prevailing wind sectors and Santa Ana or regional wind events',
      ),
      ck(
        'rf-s5-windbreaks-c2',
        'Design multi-strata planting structure - canopy, understory, and groundcover layers for each shelterbelt',
      ),
      ck(
        'rf-s5-windbreaks-c3',
        'Select species for each windbreak function - wind buffering, frost mitigation, wildlife habitat, productive yield',
      ),
      ck(
        'rf-s5-windbreaks-c4',
        'Design wildlife corridor connectivity - map shelterbelt network as continuous habitat linkage across the farm',
      ),
      ck(
        'rf-s5-windbreaks-c5',
        'Specify raptor and predator habitat features within shelterbelts - perch sites, nesting structure, roost zones',
      ),
      ck(
        'rf-s5-windbreaks-c6',
        'Design wildfire mitigation function - moisture-retaining species selection, green buffer placement, firebreak integration',
      ),
      ck(
        'rf-s5-windbreaks-c7',
        'Specify planting layout - species mix, spacing, row configuration, and establishment sequence',
      ),
      ck('rf-s5-windbreaks-c8', 'Define long-term management and coppicing strategy'),
    ],
    decisionGroups: [
      dg(
        'rf-s5-windbreaks-dg1',
        'Siting & structure',
        ['rf-s5-windbreaks-c1', 'rf-s5-windbreaks-c2'],
        ['Climate & Sectors'],
      ),
      dg(
        'rf-s5-windbreaks-dg2',
        'Species & layout',
        ['rf-s5-windbreaks-c3', 'rf-s5-windbreaks-c7'],
        ['Vegetation & Succession'],
      ),
      dg(
        'rf-s5-windbreaks-dg3',
        'Ecological & fire function',
        ['rf-s5-windbreaks-c4', 'rf-s5-windbreaks-c5', 'rf-s5-windbreaks-c6'],
        ['Ecology & Habitat'],
      ),
      dg('rf-s5-windbreaks-dg4', 'Long-term management', ['rf-s5-windbreaks-c8']),
    ],
    completionGate:
      'Windbreak and shelterbelt design approved. Multi-strata structure, wildlife corridor function, and wildfire mitigation confirmed.',
    actHandoff: 'Windbreak & Shelterbelt Design Package',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'rf-s6-biodiversity-monitoring',
    stratumId: 's6-integration-design',
    ref: 'RF-S6.2',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'A working whole-farm biodiversity monitoring protocol',
    focusedQuestion: 'How will ecological health be tracked across all zones over time?',
    checklist: [
      ck(
        'rf-s6-biodiversity-monitoring-c1',
        'Select biodiversity indicators - species groups, habitat markers, ecological processes',
      ),
      ck('rf-s6-biodiversity-monitoring-c2', 'Design monitoring transects or sampling zones'),
      ck('rf-s6-biodiversity-monitoring-c3', 'Define survey frequency and seasonal timing'),
      ck('rf-s6-biodiversity-monitoring-c4', 'Specify recording methods and data storage'),
      ck('rf-s6-biodiversity-monitoring-c5', 'Define threshold triggers for management response'),
    ],
    decisionGroups: [
      dg(
        'rf-s6-biodiversity-monitoring-dg1',
        'Indicators & sampling design',
        ['rf-s6-biodiversity-monitoring-c1', 'rf-s6-biodiversity-monitoring-c2'],
        ['Ecology & Habitat'],
      ),
      dg(
        'rf-s6-biodiversity-monitoring-dg2',
        'Survey protocol',
        ['rf-s6-biodiversity-monitoring-c3', 'rf-s6-biodiversity-monitoring-c4'],
        ['Ecology & Habitat'],
      ),
      dg(
        'rf-s6-biodiversity-monitoring-dg3',
        'Response triggers',
        ['rf-s6-biodiversity-monitoring-c5'],
        ['Ecology & Habitat'],
      ),
    ],
    completionGate:
      'Biodiversity monitoring protocol approved. Indicators, methods, and triggers defined.',
    actHandoff: 'Biodiversity Monitoring Protocol',
  }),
  obj({
    id: 'rf-s6-enterprise-integration',
    stratumId: 's6-integration-design',
    ref: 'RF-S6.3',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'Working enterprise integration & feedback loops',
    focusedQuestion:
      'What are the concrete waste-to-input loops between enterprises, and how will they be operationalised?',
    checklist: [
      ck(
        'rf-s6-enterprise-integration-c1',
        'Complete a waste-to-input matrix: for each enterprise, identify its primary waste stream or pest pressure and map which enterprise or biological process treats it as an input',
      ),
      ck(
        'rf-s6-enterprise-integration-c2',
        'Confirm at least one verified closed loop per enterprise before this objective gates - unconnected enterprises must be flagged',
      ),
      ck(
        'rf-s6-enterprise-integration-c3',
        'Design operational sequences for each confirmed loop - timing, movement protocol, quantities',
      ),
      ck(
        'rf-s6-enterprise-integration-c4',
        'Define fertility transfer protocols - which animal enterprise moves to which crop zone, when, and at what stocking density',
      ),
      ck(
        'rf-s6-enterprise-integration-c5',
        'Specify decision triggers - what observable condition in Enterprise A initiates a management response in Enterprise B',
      ),
      ck(
        'rf-s6-enterprise-integration-c6',
        'Design integrated farm calendar mapping all enterprise rhythms and handoff moments',
      ),
      ck(
        'rf-s6-enterprise-integration-c7',
        'Define record-keeping system for tracking loop performance over time',
      ),
    ],
    decisionGroups: [
      dg(
        'rf-s6-enterprise-integration-dg1',
        'Waste-to-input mapping',
        ['rf-s6-enterprise-integration-c1', 'rf-s6-enterprise-integration-c2'],
        ['Multiple'],
      ),
      dg(
        'rf-s6-enterprise-integration-dg2',
        'Loop operationalisation',
        [
          'rf-s6-enterprise-integration-c3',
          'rf-s6-enterprise-integration-c4',
          'rf-s6-enterprise-integration-c5',
        ],
        ['Multiple'],
      ),
      dg(
        'rf-s6-enterprise-integration-dg3',
        'Calendar & records',
        ['rf-s6-enterprise-integration-c6', 'rf-s6-enterprise-integration-c7'],
        ['Multiple'],
      ),
    ],
    completionGate:
      'Waste-to-input matrix complete with at least one confirmed operational loop per enterprise. All unconnected enterprises explicitly flagged. Farm calendar approved.',
    actHandoff: 'Enterprise Integration Matrix & Operational Calendar',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'rf-s7-enterprise-sequencing',
    stratumId: 's7-phasing-resourcing',
    ref: 'RF-S7.4',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'A clear enterprise sequencing & phasing logic',
    focusedQuestion:
      'In what strategic order will enterprises be launched, and how does each enable the next?',
    checklist: [
      ck(
        'rf-s7-enterprise-sequencing-c1',
        'Confirm enterprise priority tiers from Stratum 1 enterprise mix',
      ),
      ck(
        'rf-s7-enterprise-sequencing-c2',
        'Map enabling dependencies - which enterprises must be established before others launch',
      ),
      ck(
        'rf-s7-enterprise-sequencing-c3',
        'Define revenue bridge strategy - which early enterprises fund later capital requirements',
      ),
      ck('rf-s7-enterprise-sequencing-c4', 'Sequence enterprise launches across planning cycles'),
      ck('rf-s7-enterprise-sequencing-c5', 'Define go/no-go criteria for each enterprise launch'),
    ],
    decisionGroups: [
      dg('rf-s7-enterprise-sequencing-dg1', 'Dependencies & priorities', [
        'rf-s7-enterprise-sequencing-c1',
        'rf-s7-enterprise-sequencing-c2',
      ]),
      dg('rf-s7-enterprise-sequencing-dg2', 'Launch sequencing', [
        'rf-s7-enterprise-sequencing-c3',
        'rf-s7-enterprise-sequencing-c4',
        'rf-s7-enterprise-sequencing-c5',
      ]),
    ],
    completionGate:
      'Enterprise sequencing logic approved. Launch order and enabling dependencies confirmed.',
    actHandoff: 'Enterprise Sequencing & Phasing Logic Brief',
  }),
  obj({
    id: 'rf-s7-cash-flow',
    stratumId: 's7-phasing-resourcing',
    ref: 'RF-S7.5',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    title: 'A sound whole-farm cash flow staging',
    focusedQuestion:
      "How will the farm's revenue and expenditure sequence across the establishment phase to ensure financial viability?",
    checklist: [
      ck(
        'rf-s7-cash-flow-c1',
        'Map revenue timeline for each enterprise - first production, first sales, scaling milestones',
      ),
      ck('rf-s7-cash-flow-c2', 'Estimate establishment costs by enterprise and phase'),
      ck('rf-s7-cash-flow-c3', 'Identify cash flow gap periods and bridge strategies'),
      ck('rf-s7-cash-flow-c4', 'Define minimum viable revenue threshold for each phase'),
      ck(
        'rf-s7-cash-flow-c5',
        'Confirm scope stays within operational planning - no capital formation or investor structure content',
      ),
    ],
    decisionGroups: [
      dg('rf-s7-cash-flow-dg1', 'Revenue & cost timeline', [
        'rf-s7-cash-flow-c1',
        'rf-s7-cash-flow-c2',
      ]),
      dg('rf-s7-cash-flow-dg2', 'Gap & viability', [
        'rf-s7-cash-flow-c3',
        'rf-s7-cash-flow-c4',
      ]),
      dg('rf-s7-cash-flow-dg3', 'Scope confirmation', ['rf-s7-cash-flow-c5']),
    ],
    completionGate:
      'Cash flow staging approved. Revenue timeline and gap strategy confirmed within operational planning scope.',
    actHandoff: 'Cash Flow Staging Brief',
  }),
];

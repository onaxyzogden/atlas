// catalogues/conservation.ts
//
// Conservation / Rewilding PRIMARY-type objectives - the 30 type-specific
// objectives a Conservation project adds on top of the 19 Universal objectives
// (OLOS Conservation / Rewilding Objective Catalogue v1.0, authored to Catalogue
// Authoring Standards v1.4).
//
// This file holds ONLY the primary-layer standalone objectives. The universal
// slot lives in ./universal.ts (the shared baseline). The catalogue ships no
// base secondary layer, so there are no PatchRecords here.
//
// Count note: 19 universal + 30 primary = 49 total. Per-tier primary counts
// (3+4+4+5+5+4+5 = 30) and the source's Complete objective index both confirm
// 30. The source numbers objectives by Tier 0-6; this catalogue maps Tier N ->
// Stratum (N+1): Tier 0 -> s1-project-foundation, 1 -> s2-land-reading, 2 ->
// s3-systems-reading, 3 -> s4-foundation-decisions, 4 -> s5-system-design, 5 ->
// s6-integration-design, 6 -> s7-phasing-resourcing. Refs are restamped
// CON-S<stratum>.<n> from the source's <tier>.<n>.
//
// Philosophy gate: CON-S1.5 (intervention philosophy & non-negotiables) carries
// the source's governing Note in scopeNotes - all Tier 3-4 (here S4-S5) design
// decisions must be evaluated against the philosophy before proceeding; a design
// that violates it requires a philosophy revision first, not a design variation.
// Several downstream completion gates encode hard sequencing (covenant not
// executed before the intervention plan is complete; water-regime restoration
// and stock exclusion before planting) - preserved verbatim in their gates.
//
// Economic note: CON-S7.6 "Define ongoing funding & stewardship resourcing
// strategy" evaluates conservation grants, biodiversity/carbon credits, trusts,
// and partnerships, and CON-S1.6 evaluates conservation covenants and carbon
// agreements. These are land-stewardship funding-instrument diligence steps
// encoded verbatim from the operator source (the covenant objective explicitly
// requires legal advice before executing any agreement) - not an MTC capital
// model, no advance sale, no riba- or gharar-adjacent design. Amanah Gate: clean
// land-stewardship catalogue.
//
// Decision groups are AUTHORED editorially under the 2026-05-31 extended override
// ("author meaningful labels") - the source ships no decision-group spec, so each
// objective's checklist is partitioned into 2-3 named decision scopes, mirroring
// orchard.ts / homestead.ts / education.ts.
//
// source: 'primary', sourceTypeId: 'conservation' on every objective. ASCII-only
// copy: em/en dashes -> " - "; curly quotes -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj } from './authoring.js';

const PRIMARY = 'conservation' as const;

export const CONSERVATION_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'con-s1-conservation-intent',
    stratumId: 's1-project-foundation',
    ref: 'CON-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define conservation intent & ecological outcome targets',
    shortTitle: 'Conservation intent & outcome targets',
    focusedQuestion:
      'What is this land being restored to - what baseline ecological state, target species, and habitat type defines success?',
    checklist: [
      ck('con-s1-conservation-intent-c1', 'Define reference ecological state - historical condition this site is being restored toward', { feeds: ['con-s4-restoration-priority-zones', 'con-s4-native-species-provenance'] }),
      ck('con-s1-conservation-intent-c2', 'Identify target species - flora and fauna that define ecological success', { feeds: ['con-s4-native-species-provenance', 'con-s5-wildlife-habitat-infrastructure'] }),
      ck('con-s1-conservation-intent-c3', 'Define target habitat types and their spatial extent', { feeds: ['con-s4-restoration-priority-zones', 's4-zones'] }),
      ck('con-s1-conservation-intent-c4', 'Set measurable ecological outcome targets with timeframes - 5, 10, 25 years', { feeds: ['con-s6-ecological-monitoring', 'con-s7-longterm-timeline'] }),
      ck('con-s1-conservation-intent-c5', 'Define minimum acceptable ecological state for Phase 1', { feeds: ['con-s7-phase1-priorities'] }),
      ck('con-s1-conservation-intent-c6', 'Confirm targets are achievable given site conditions and landscape context', { feeds: ['s7-risk-register'] }),
    ],
    decisionGroups: [
      dg('con-s1-conservation-intent-dg1', 'Reference state & target species', ['con-s1-conservation-intent-c1', 'con-s1-conservation-intent-c2']),
      dg('con-s1-conservation-intent-dg2', 'Habitat targets & timeframes', ['con-s1-conservation-intent-c3', 'con-s1-conservation-intent-c4']),
      dg('con-s1-conservation-intent-dg3', 'Phase 1 floor & feasibility', ['con-s1-conservation-intent-c5', 'con-s1-conservation-intent-c6']),
    ],
    completionGate:
      'Conservation intent approved. Ecological outcome targets defined, measurable, and confirmed achievable.',
    actHandoff: 'Conservation Intent & Ecological Outcome Targets Brief',
  }),
  obj({
    id: 'con-s1-intervention-philosophy',
    stratumId: 's1-project-foundation',
    ref: 'CON-S1.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define intervention philosophy & non-negotiables',
    shortTitle: 'Intervention philosophy & non-negotiables',
    focusedQuestion:
      'Where on the spectrum from minimal intervention to active restoration does this project sit - and what methods are acceptable or prohibited?',
    checklist: [
      ck('con-s1-intervention-philosophy-c1', 'Define intervention philosophy - passive rewilding, assisted natural regeneration, active restoration, or hybrid', { feeds: ['con-s4-restoration-priority-zones', 's4-direction'] }),
      ck('con-s1-intervention-philosophy-c2', 'List acceptable intervention methods - planting, earthworks, pest control, fire', { feeds: ['con-s4-pest-invasive-strategy', 'con-s4-fire-management-strategy'] }),
      ck('con-s1-intervention-philosophy-c3', 'List prohibited methods that conflict with the philosophy', { feeds: ['con-s4-pest-invasive-strategy', 'con-s4-fire-management-strategy'] }),
      ck('con-s1-intervention-philosophy-c4', 'Define decision-making threshold - what evidence triggers active intervention vs. allowing natural recovery', { feeds: ['con-s4-restoration-priority-zones', 's6-monitoring'] }),
      ck('con-s1-intervention-philosophy-c5', 'Confirm intervention philosophy is agreed by all parties with decision-making authority', { feeds: ['s7-risk-register'] }),
    ],
    decisionGroups: [
      dg('con-s1-intervention-philosophy-dg1', 'Philosophy & acceptable methods', ['con-s1-intervention-philosophy-c1', 'con-s1-intervention-philosophy-c2']),
      dg('con-s1-intervention-philosophy-dg2', 'Prohibitions & intervention threshold', ['con-s1-intervention-philosophy-c3', 'con-s1-intervention-philosophy-c4']),
      dg('con-s1-intervention-philosophy-dg3', 'All-parties agreement', ['con-s1-intervention-philosophy-c5']),
    ],
    completionGate:
      'Intervention philosophy approved and non-negotiables documented. All parties confirmed.',
    actHandoff: 'Intervention Philosophy & Non-Negotiables Brief',
    scopeNotes:
      'All downstream design decisions (S4-S5) must be evaluated against this philosophy before proceeding. A design that violates the intervention philosophy is not a design variation - it requires a philosophy revision first.',
  }),
  obj({
    id: 'con-s1-tenure-covenant',
    stratumId: 's1-project-foundation',
    ref: 'CON-S1.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define land tenure & conservation covenant strategy',
    shortTitle: 'Land tenure & conservation covenant',
    focusedQuestion:
      'What legal instruments will protect this land in perpetuity - and do they constrain what can be done now or in the future?',
    checklist: [
      ck('con-s1-tenure-covenant-c1', 'Evaluate applicable conservation instruments - covenants, reserve declarations, easements, carbon credits', { feeds: ['con-s7-funding-resourcing'] }),
      ck('con-s1-tenure-covenant-c2', 'Assess implications of each instrument for management flexibility', { feeds: ['s4-direction', 's7-risk-register'] }),
      ck('con-s1-tenure-covenant-c3', 'Define covenant strategy - which instrument best matches conservation intent', { feeds: ['con-s7-funding-resourcing'] }),
      ck('con-s1-tenure-covenant-c4', 'Identify covenant provider or registering body', { feeds: ['con-s7-funding-resourcing'] }),
      ck('con-s1-tenure-covenant-c5', 'Obtain legal advice before executing any covenant or carbon agreement', { feeds: ['s7-risk-register'] }),
      ck('con-s1-tenure-covenant-c6', 'Confirm covenant terms do not conflict with planned interventions', { feeds: ['con-s4-restoration-priority-zones', 's7-risk-register'] }),
    ],
    decisionGroups: [
      dg('con-s1-tenure-covenant-dg1', 'Instrument evaluation & implications', ['con-s1-tenure-covenant-c1', 'con-s1-tenure-covenant-c2']),
      dg('con-s1-tenure-covenant-dg2', 'Covenant strategy & provider', ['con-s1-tenure-covenant-c3', 'con-s1-tenure-covenant-c4']),
      dg('con-s1-tenure-covenant-dg3', 'Legal advice & intervention fit', ['con-s1-tenure-covenant-c5', 'con-s1-tenure-covenant-c6']),
    ],
    completionGate:
      'Conservation covenant strategy approved with legal advice confirmed. No covenant executed before intervention plan is complete.',
    actHandoff: 'Land Tenure & Conservation Covenant Strategy Brief',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'con-s2-baseline-condition',
    stratumId: 's2-land-reading',
    ref: 'CON-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey baseline ecological condition',
    shortTitle: 'Baseline ecological condition',
    focusedQuestion:
      'What is the current ecological condition of this site - the measurable starting point against which restoration progress will be tracked?',
    checklist: [
      ck('con-s2-baseline-condition-c1', 'Establish vegetation condition score using consistent methodology - e.g. BioCondition, NVC, or equivalent', { feeds: ['con-s6-ecological-monitoring'] }),
      ck('con-s2-baseline-condition-c2', 'Record species richness and diversity indices by zone', { feeds: ['con-s4-restoration-priority-zones', 'con-s6-ecological-monitoring'] }),
      ck('con-s2-baseline-condition-c3', 'Map ecological condition zones - high, moderate, poor, degraded', { feeds: ['con-s4-restoration-priority-zones'] }),
      ck('con-s2-baseline-condition-c4', 'Document photographic baseline at fixed monitoring points', { feeds: ['con-s6-ecological-monitoring'] }),
      ck('con-s2-baseline-condition-c5', 'Record ecological function indicators - pollinator activity, bird species richness, soil invertebrate presence', { feeds: ['con-s6-ecological-monitoring'] }),
      ck('con-s2-baseline-condition-c6', 'Confirm baseline methodology is repeatable for ongoing monitoring', { feeds: ['con-s6-ecological-monitoring'] }),
    ],
    decisionGroups: [
      dg('con-s2-baseline-condition-dg1', 'Condition score & diversity', ['con-s2-baseline-condition-c1', 'con-s2-baseline-condition-c2']),
      dg('con-s2-baseline-condition-dg2', 'Condition zones & photo points', ['con-s2-baseline-condition-c3', 'con-s2-baseline-condition-c4']),
      dg('con-s2-baseline-condition-dg3', 'Function indicators & repeatability', ['con-s2-baseline-condition-c5', 'con-s2-baseline-condition-c6']),
    ],
    completionGate:
      'Ecological baseline complete. Condition scores, diversity indices, and photographic record established at fixed monitoring points.',
    actHandoff: 'Baseline Ecological Condition Survey',
  }),
  obj({
    id: 'con-s2-degradation-history',
    stratumId: 's2-land-reading',
    ref: 'CON-S2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey degradation history & causes',
    shortTitle: 'Degradation history & causes',
    focusedQuestion:
      'What degraded this land, when, and through what mechanisms - and what legacy conditions persist?',
    checklist: [
      ck('con-s2-degradation-history-c1', 'Research historical land use - grazing history, cultivation, drainage, logging, development', { feeds: ['con-s4-restoration-priority-zones'] }),
      ck('con-s2-degradation-history-c2', 'Identify primary degradation causes and their relative contribution', { feeds: ['con-s4-restoration-priority-zones'] }),
      ck('con-s2-degradation-history-c3', 'Map legacy conditions - compaction zones, drainage alterations, soil loss areas, nutrient loading', { feeds: ['con-s4-restoration-priority-zones', 's5-soil-improvement'] }),
      ck('con-s2-degradation-history-c4', 'Identify chemical legacy risks - pesticide residues, fertiliser loading, contamination', { feeds: ['s7-risk-register'] }),
      ck('con-s2-degradation-history-c5', 'Record degradation timeline from aerial photos, title records, and local knowledge', { feeds: ['con-s4-restoration-priority-zones'] }),
    ],
    decisionGroups: [
      dg('con-s2-degradation-history-dg1', 'Land-use history & causes', ['con-s2-degradation-history-c1', 'con-s2-degradation-history-c2']),
      dg('con-s2-degradation-history-dg2', 'Legacy conditions & chemical risk', ['con-s2-degradation-history-c3', 'con-s2-degradation-history-c4']),
      dg('con-s2-degradation-history-dg3', 'Degradation timeline', ['con-s2-degradation-history-c5']),
    ],
    completionGate: 'Degradation history and causes documented. Legacy conditions mapped.',
    actHandoff: 'Degradation History & Causes Survey',
  }),
  obj({
    id: 'con-s2-landscape-context',
    stratumId: 's2-land-reading',
    ref: 'CON-S2.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey surrounding landscape ecological context',
    shortTitle: 'Landscape ecological context',
    focusedQuestion:
      'How does the surrounding landscape shape what is ecologically achievable on this site - and what are the connectivity opportunities and pressures?',
    checklist: [
      ck('con-s2-landscape-context-c1', 'Map surrounding land uses and their ecological impact within 5km', { feeds: ['s7-risk-register'] }),
      ck('con-s2-landscape-context-c2', 'Identify wildlife corridors connecting to the site - current and potential', { feeds: ['con-s5-wildlife-habitat-infrastructure'] }),
      ck('con-s2-landscape-context-c3', 'Identify native seed sources in the surrounding landscape', { feeds: ['con-s4-native-species-provenance'] }),
      ck('con-s2-landscape-context-c4', 'Assess predator and pest pressure from surrounding land', { feeds: ['con-s4-pest-invasive-strategy'] }),
      ck('con-s2-landscape-context-c5', 'Identify landscape-scale restoration projects or networks this site could connect to', { feeds: ['con-s7-funding-resourcing'] }),
      ck('con-s2-landscape-context-c6', 'Assess drinking water catchment contamination risk from surrounding land uses', { feeds: ['s7-risk-register'] }),
    ],
    decisionGroups: [
      dg('con-s2-landscape-context-dg1', 'Land use & corridors', ['con-s2-landscape-context-c1', 'con-s2-landscape-context-c2']),
      dg('con-s2-landscape-context-dg2', 'Seed sources & pressure', ['con-s2-landscape-context-c3', 'con-s2-landscape-context-c4']),
      dg('con-s2-landscape-context-dg3', 'Networks & catchment risk', ['con-s2-landscape-context-c5', 'con-s2-landscape-context-c6']),
    ],
    completionGate:
      'Landscape ecological context survey complete. Connectivity opportunities and pressures identified.',
    actHandoff: 'Landscape Ecological Context Survey',
  }),
  obj({
    id: 'con-s2-invasive-distribution',
    stratumId: 's2-land-reading',
    ref: 'CON-S2.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey invasive species distribution & pressure',
    shortTitle: 'Invasive species distribution & pressure',
    focusedQuestion:
      'Where are invasive species present, how are they distributed, how fast are they spreading, and what is the priority control sequence?',
    checklist: [
      ck('con-s2-invasive-distribution-c1', 'Map all invasive plant species by zone - density, spread, and seasonal pattern', { feeds: ['con-s4-pest-invasive-strategy'] }),
      ck('con-s2-invasive-distribution-c2', 'Map invasive animal species presence and pressure - feral animals, pest insects', { feeds: ['con-s4-pest-invasive-strategy'] }),
      ck('con-s2-invasive-distribution-c3', 'Assess invasion vectors - how are invasives entering the site', { feeds: ['con-s4-pest-invasive-strategy', 'con-s5-pest-control-infrastructure'] }),
      ck('con-s2-invasive-distribution-c4', 'Map weed fronts and spread rate by species', { feeds: ['con-s4-pest-invasive-strategy', 'con-s6-pest-monitoring'] }),
      ck('con-s2-invasive-distribution-c5', 'Prioritise invasive species by threat level and control feasibility', { feeds: ['con-s4-pest-invasive-strategy'] }),
      ck('con-s2-invasive-distribution-c6', 'Identify control windows - seasonal timing for most effective intervention per species', { feeds: ['con-s4-pest-invasive-strategy'] }),
    ],
    decisionGroups: [
      dg('con-s2-invasive-distribution-dg1', 'Plant & animal invasive mapping', ['con-s2-invasive-distribution-c1', 'con-s2-invasive-distribution-c2']),
      dg('con-s2-invasive-distribution-dg2', 'Vectors & spread rate', ['con-s2-invasive-distribution-c3', 'con-s2-invasive-distribution-c4']),
      dg('con-s2-invasive-distribution-dg3', 'Priority & control windows', ['con-s2-invasive-distribution-c5', 'con-s2-invasive-distribution-c6']),
    ],
    completionGate: 'Invasive species distribution mapped. Priority control sequence defined.',
    actHandoff: 'Invasive Species Distribution & Pressure Survey',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'con-s3-water-regime-degradation',
    stratumId: 's3-systems-reading',
    ref: 'CON-S3.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey hydrology & water regime degradation',
    shortTitle: 'Hydrology & water regime degradation',
    focusedQuestion:
      'How has the water regime been altered on this site - what drains, diversions, or flow changes need to be addressed for ecological restoration?',
    checklist: [
      ck('con-s3-water-regime-degradation-c1', 'Map all artificial drainage - tiles, open drains, diversion channels', { feeds: ['con-s4-water-regime-restoration'] }),
      ck('con-s3-water-regime-degradation-c2', 'Identify wetland areas that have been drained or reduced', { feeds: ['con-s4-water-regime-restoration'] }),
      ck('con-s3-water-regime-degradation-c3', 'Assess watercourse modifications - straightening, culverting, bank reinforcement', { feeds: ['con-s4-water-regime-restoration'] }),
      ck('con-s3-water-regime-degradation-c4', 'Record historical water regime from aerial photos and local knowledge', { feeds: ['con-s4-water-regime-restoration'] }),
      ck('con-s3-water-regime-degradation-c5', 'Identify water table depth and seasonal variation across the site', { feeds: ['con-s4-water-regime-restoration', 's4-water-strategy'] }),
      ck('con-s3-water-regime-degradation-c6', 'Assess feasibility of water regime restoration by zone', { feeds: ['con-s4-water-regime-restoration'] }),
    ],
    decisionGroups: [
      dg('con-s3-water-regime-degradation-dg1', 'Drainage & lost wetland', ['con-s3-water-regime-degradation-c1', 'con-s3-water-regime-degradation-c2']),
      dg('con-s3-water-regime-degradation-dg2', 'Watercourse & historical regime', ['con-s3-water-regime-degradation-c3', 'con-s3-water-regime-degradation-c4']),
      dg('con-s3-water-regime-degradation-dg3', 'Water table & restoration feasibility', ['con-s3-water-regime-degradation-c5', 'con-s3-water-regime-degradation-c6']),
    ],
    completionGate: 'Water regime degradation fully mapped. Restoration feasibility assessed by zone.',
    actHandoff: 'Hydrology & Water Regime Degradation Survey',
  }),
  obj({
    id: 'con-s3-soil-biology-seedbank',
    stratumId: 's3-systems-reading',
    ref: 'CON-S3.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey soil biology & seed bank condition',
    shortTitle: 'Soil biology & seed bank condition',
    focusedQuestion:
      'What is the biological condition of the soil - is there a viable native seed bank and intact mycorrhizal network to support passive restoration?',
    checklist: [
      ck('con-s3-soil-biology-seedbank-c1', 'Assess soil biological activity - earthworm counts, fungi presence, invertebrate diversity', { feeds: ['s5-soil-improvement'] }),
      ck('con-s3-soil-biology-seedbank-c2', 'Conduct seed bank analysis in representative zones - germination trials', { feeds: ['con-s4-native-species-provenance', 'con-s4-restoration-priority-zones'] }),
      ck('con-s3-soil-biology-seedbank-c3', 'Assess mycorrhizal network indicators by zone', { feeds: ['s5-soil-improvement'] }),
      ck('con-s3-soil-biology-seedbank-c4', 'Record variation in soil biology between degraded and reference zones', { feeds: ['con-s4-restoration-priority-zones'] }),
      ck('con-s3-soil-biology-seedbank-c5', 'Determine whether passive regeneration is viable based on seed bank and biology findings', { feeds: ['con-s4-restoration-priority-zones', 'con-s4-native-species-provenance'] }),
    ],
    decisionGroups: [
      dg('con-s3-soil-biology-seedbank-dg1', 'Biological activity & seed bank', ['con-s3-soil-biology-seedbank-c1', 'con-s3-soil-biology-seedbank-c2']),
      dg('con-s3-soil-biology-seedbank-dg2', 'Mycorrhizae & zone variation', ['con-s3-soil-biology-seedbank-c3', 'con-s3-soil-biology-seedbank-c4']),
      dg('con-s3-soil-biology-seedbank-dg3', 'Passive viability verdict', ['con-s3-soil-biology-seedbank-c5']),
    ],
    completionGate:
      'Soil biology and seed bank assessment complete. Passive vs. active restoration approach informed by findings.',
    actHandoff: 'Soil Biology & Seed Bank Condition Survey',
  }),
  obj({
    id: 'con-s3-wildlife-presence',
    stratumId: 's3-systems-reading',
    ref: 'CON-S3.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey wildlife presence, movement & habitat use',
    shortTitle: 'Wildlife presence, movement & habitat use',
    focusedQuestion:
      'What fauna is currently using this land, how, and what habitat elements are missing that limit ecological recovery?',
    checklist: [
      ck('con-s3-wildlife-presence-c1', 'Record fauna species present by survey method - camera traps, call recorders, transects', { feeds: ['con-s5-wildlife-habitat-infrastructure', 'con-s6-ecological-monitoring'] }),
      ck('con-s3-wildlife-presence-c2', 'Map movement corridors and crossing points', { feeds: ['con-s5-wildlife-habitat-infrastructure', 'con-s5-fencing-exclusion'] }),
      ck('con-s3-wildlife-presence-c3', 'Identify keystone species present and absent', { feeds: ['con-s5-wildlife-habitat-infrastructure'] }),
      ck('con-s3-wildlife-presence-c4', 'Assess nesting and breeding habitat availability', { feeds: ['con-s5-wildlife-habitat-infrastructure'] }),
      ck('con-s3-wildlife-presence-c5', 'Identify missing habitat elements that limit target species recovery', { feeds: ['con-s5-wildlife-habitat-infrastructure'] }),
      ck('con-s3-wildlife-presence-c6', 'Record seasonal variation in wildlife use', { feeds: ['con-s6-ecological-monitoring'] }),
    ],
    decisionGroups: [
      dg('con-s3-wildlife-presence-dg1', 'Species & movement', ['con-s3-wildlife-presence-c1', 'con-s3-wildlife-presence-c2']),
      dg('con-s3-wildlife-presence-dg2', 'Keystone & breeding habitat', ['con-s3-wildlife-presence-c3', 'con-s3-wildlife-presence-c4']),
      dg('con-s3-wildlife-presence-dg3', 'Missing elements & seasonality', ['con-s3-wildlife-presence-c5', 'con-s3-wildlife-presence-c6']),
    ],
    completionGate:
      'Wildlife survey complete. Habitat use patterns and missing habitat elements identified.',
    actHandoff: 'Wildlife Presence, Movement & Habitat Use Survey',
  }),
  obj({
    id: 'con-s3-fire-history',
    stratumId: 's3-systems-reading',
    ref: 'CON-S3.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey fire history & regime',
    shortTitle: 'Fire history & regime',
    focusedQuestion:
      'What is the fire history of this site - and what fire regime is ecologically appropriate for restoration?',
    checklist: [
      ck('con-s3-fire-history-c1', 'Research historical fire frequency and seasonality from records and local knowledge', { feeds: ['con-s4-fire-management-strategy'] }),
      ck('con-s3-fire-history-c2', 'Record date and extent of last burn', { feeds: ['con-s4-fire-management-strategy'] }),
      ck('con-s3-fire-history-c3', 'Map current fuel load by zone - grass, shrub, litter depth', { feeds: ['con-s4-fire-management-strategy', 'con-s6-fire-monitoring'] }),
      ck('con-s3-fire-history-c4', 'Identify fire-adapted species that require fire for germination or regeneration', { feeds: ['con-s4-fire-management-strategy', 'con-s4-native-species-provenance'] }),
      ck('con-s3-fire-history-c5', 'Assess current fire risk by zone and season', { feeds: ['con-s4-fire-management-strategy', 's7-risk-register'] }),
      ck('con-s3-fire-history-c6', 'Determine ecologically appropriate fire regime for target habitat types', { feeds: ['con-s4-fire-management-strategy'] }),
    ],
    decisionGroups: [
      dg('con-s3-fire-history-dg1', 'Fire history & last burn', ['con-s3-fire-history-c1', 'con-s3-fire-history-c2']),
      dg('con-s3-fire-history-dg2', 'Fuel load & fire-adapted species', ['con-s3-fire-history-c3', 'con-s3-fire-history-c4']),
      dg('con-s3-fire-history-dg3', 'Risk & appropriate regime', ['con-s3-fire-history-c5', 'con-s3-fire-history-c6']),
    ],
    completionGate:
      'Fire history and regime survey complete. Ecologically appropriate fire regime identified.',
    actHandoff: 'Fire History & Regime Survey',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'con-s4-restoration-priority-zones',
    stratumId: 's4-foundation-decisions',
    ref: 'CON-S4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define restoration priority zones & intervention sequence',
    shortTitle: 'Restoration priority zones & sequence',
    focusedQuestion:
      'Where will restoration effort begin, in what order will zones be addressed, and what ecological logic drives that sequence?',
    checklist: [
      ck('con-s4-restoration-priority-zones-c1', 'Rank zones by ecological leverage - where will effort produce the greatest restoration return', { feeds: ['con-s5-native-planting-plan', 'con-s7-phase1-priorities'] }),
      ck('con-s4-restoration-priority-zones-c2', 'Identify bridgehead zones - high-condition areas that will seed adjacent degraded zones', { feeds: ['con-s5-native-planting-plan'] }),
      ck('con-s4-restoration-priority-zones-c3', 'Sequence interventions to address causes before symptoms - hydrology before planting, stock exclusion before weed control', { feeds: ['con-s7-phase1-priorities'] }),
      ck('con-s4-restoration-priority-zones-c4', 'Define resource allocation by zone for Phase 1', { feeds: ['con-s7-phase1-priorities', 's7-resource-plan'] }),
      ck('con-s4-restoration-priority-zones-c5', 'Confirm sequence aligns with intervention philosophy and available resources', { feeds: ['con-s7-phase1-priorities'] }),
    ],
    decisionGroups: [
      dg('con-s4-restoration-priority-zones-dg1', 'Leverage ranking & bridgeheads', ['con-s4-restoration-priority-zones-c1', 'con-s4-restoration-priority-zones-c2']),
      dg('con-s4-restoration-priority-zones-dg2', 'Cause-before-symptom sequence & allocation', ['con-s4-restoration-priority-zones-c3', 'con-s4-restoration-priority-zones-c4']),
      dg('con-s4-restoration-priority-zones-dg3', 'Philosophy & resource fit', ['con-s4-restoration-priority-zones-c5']),
    ],
    completionGate:
      'Restoration priority zones ranked and intervention sequence approved. Ecological logic documented.',
    actHandoff: 'Restoration Priority Zones & Intervention Sequence Brief',
  }),
  obj({
    id: 'con-s4-native-species-provenance',
    stratumId: 's4-foundation-decisions',
    ref: 'CON-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define native species selection & provenance strategy',
    shortTitle: 'Native species selection & provenance',
    focusedQuestion:
      'Which native species will be used in active restoration, sourced from what provenance, and planted in what ecological sequence?',
    checklist: [
      ck('con-s4-native-species-provenance-c1', 'Define planting palette by zone - pioneer, transitional, and climax species', { feeds: ['con-s5-native-planting-plan'] }),
      ck('con-s4-native-species-provenance-c2', 'Specify local provenance requirements - seed collection zones, genetic diversity', { feeds: ['con-s5-native-planting-plan'] }),
      ck('con-s4-native-species-provenance-c3', 'Identify local seed sources and nurseries with provenance stock', { feeds: ['con-s5-native-planting-plan', 's7-resource-plan'] }),
      ck('con-s4-native-species-provenance-c4', 'Define nurse crop and pioneer species strategy for bare or degraded zones', { feeds: ['con-s5-native-planting-plan'] }),
      ck('con-s4-native-species-provenance-c5', 'Sequence species introduction to match ecological succession trajectory', { feeds: ['con-s5-native-planting-plan'] }),
      ck('con-s4-native-species-provenance-c6', 'Confirm species selection is consistent with target habitat type and intervention philosophy', { feeds: ['con-s5-native-planting-plan'] }),
    ],
    decisionGroups: [
      dg('con-s4-native-species-provenance-dg1', 'Palette & provenance', ['con-s4-native-species-provenance-c1', 'con-s4-native-species-provenance-c2']),
      dg('con-s4-native-species-provenance-dg2', 'Seed sources & pioneer strategy', ['con-s4-native-species-provenance-c3', 'con-s4-native-species-provenance-c4']),
      dg('con-s4-native-species-provenance-dg3', 'Succession sequence & philosophy fit', ['con-s4-native-species-provenance-c5', 'con-s4-native-species-provenance-c6']),
    ],
    completionGate:
      'Native species selection and provenance strategy approved. Local seed sources identified.',
    actHandoff: 'Native Species Selection & Provenance Strategy Brief',
  }),
  obj({
    id: 'con-s4-pest-invasive-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'CON-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define pest & invasive species management strategy',
    shortTitle: 'Pest & invasive species strategy',
    focusedQuestion:
      'How will pest animals and invasive plants be managed - what methods, in what sequence, consistent with the intervention philosophy?',
    checklist: [
      ck('con-s4-pest-invasive-strategy-c1', 'Confirm acceptable control methods against intervention philosophy', { feeds: ['con-s5-pest-control-infrastructure'] }),
      ck('con-s4-pest-invasive-strategy-c2', 'Prioritise pest and invasive species by threat level and control feasibility', { feeds: ['con-s5-pest-control-infrastructure', 'con-s7-phase1-priorities'] }),
      ck('con-s4-pest-invasive-strategy-c3', 'Define control sequence - address highest-threat species and entry vectors first', { feeds: ['con-s5-pest-control-infrastructure', 'con-s7-phase1-priorities'] }),
      ck('con-s4-pest-invasive-strategy-c4', 'Define monitoring triggers - what population threshold initiates control action', { feeds: ['con-s6-pest-monitoring'] }),
      ck('con-s4-pest-invasive-strategy-c5', 'Specify seasonal control windows for highest-priority species', { feeds: ['con-s6-pest-monitoring'] }),
      ck('con-s4-pest-invasive-strategy-c6', 'Define reinvasion prevention strategy', { feeds: ['con-s5-pest-control-infrastructure', 'con-s6-pest-monitoring'] }),
    ],
    decisionGroups: [
      dg('con-s4-pest-invasive-strategy-dg1', 'Methods & prioritisation', ['con-s4-pest-invasive-strategy-c1', 'con-s4-pest-invasive-strategy-c2']),
      dg('con-s4-pest-invasive-strategy-dg2', 'Sequence & triggers', ['con-s4-pest-invasive-strategy-c3', 'con-s4-pest-invasive-strategy-c4']),
      dg('con-s4-pest-invasive-strategy-dg3', 'Control windows & reinvasion', ['con-s4-pest-invasive-strategy-c5', 'con-s4-pest-invasive-strategy-c6']),
    ],
    completionGate:
      'Pest and invasive species management strategy approved. Methods, sequence, and triggers confirmed.',
    actHandoff: 'Pest & Invasive Species Management Strategy Brief',
  }),
  obj({
    id: 'con-s4-water-regime-restoration',
    stratumId: 's4-foundation-decisions',
    ref: 'CON-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define water regime restoration strategy',
    shortTitle: 'Water regime restoration strategy',
    focusedQuestion:
      'How will degraded hydrological function be restored - what drain blocking, wetland reinstatement, or watercourse realignment is required?',
    checklist: [
      ck('con-s4-water-regime-restoration-c1', 'Prioritise water regime restoration interventions by ecological leverage', { feeds: ['con-s5-water-regime-infrastructure', 'con-s7-phase1-priorities'] }),
      ck('con-s4-water-regime-restoration-c2', 'Define drain blocking locations and methods', { feeds: ['con-s5-water-regime-infrastructure'] }),
      ck('con-s4-water-regime-restoration-c3', 'Define wetland reinstatement scope and approach', { feeds: ['con-s5-water-regime-infrastructure'] }),
      ck('con-s4-water-regime-restoration-c4', 'Define watercourse realignment or de-channelisation work required', { feeds: ['con-s5-water-regime-infrastructure'] }),
      ck('con-s4-water-regime-restoration-c5', 'Confirm water regime restoration is sequenced before dependent planting work', { feeds: ['con-s7-phase1-priorities'] }),
      ck('con-s4-water-regime-restoration-c6', 'Obtain required consents for earthworks and water regime modification', { feeds: ['con-s5-water-regime-infrastructure', 's7-risk-register'] }),
    ],
    decisionGroups: [
      dg('con-s4-water-regime-restoration-dg1', 'Leverage & drain blocking', ['con-s4-water-regime-restoration-c1', 'con-s4-water-regime-restoration-c2']),
      dg('con-s4-water-regime-restoration-dg2', 'Wetland & watercourse works', ['con-s4-water-regime-restoration-c3', 'con-s4-water-regime-restoration-c4']),
      dg('con-s4-water-regime-restoration-dg3', 'Sequencing & consents', ['con-s4-water-regime-restoration-c5', 'con-s4-water-regime-restoration-c6']),
    ],
    completionGate:
      'Water regime restoration strategy approved. All interventions consented and sequenced before planting.',
    actHandoff: 'Water Regime Restoration Strategy Brief',
  }),
  obj({
    id: 'con-s4-fire-management-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'CON-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define fire management strategy',
    shortTitle: 'Fire management strategy',
    focusedQuestion:
      'How will fire be used or managed as a restoration tool - and how does the fire strategy integrate with the planting and pest management plan?',
    checklist: [
      ck('con-s4-fire-management-strategy-c1', 'Define fire management approach - prescribed burning, fuel load reduction, exclusion, or combination', { feeds: ['con-s6-fire-monitoring'] }),
      ck('con-s4-fire-management-strategy-c2', 'Identify zones where fire is an appropriate restoration tool', { feeds: ['con-s6-fire-monitoring'] }),
      ck('con-s4-fire-management-strategy-c3', 'Identify zones where fire must be excluded to protect restoration investment', { feeds: ['con-s6-fire-monitoring', 's7-risk-register'] }),
      ck('con-s4-fire-management-strategy-c4', 'Define burn frequency and season per zone based on target habitat requirements', { feeds: ['con-s6-fire-monitoring'] }),
      ck('con-s4-fire-management-strategy-c5', 'Confirm fire strategy is consistent with intervention philosophy', { feeds: ['con-s7-phase1-priorities'] }),
      ck('con-s4-fire-management-strategy-c6', 'Obtain required permits for prescribed burning', { feeds: ['s7-risk-register'] }),
    ],
    decisionGroups: [
      dg('con-s4-fire-management-strategy-dg1', 'Approach & fire zones', ['con-s4-fire-management-strategy-c1', 'con-s4-fire-management-strategy-c2']),
      dg('con-s4-fire-management-strategy-dg2', 'Exclusion zones & burn regime', ['con-s4-fire-management-strategy-c3', 'con-s4-fire-management-strategy-c4']),
      dg('con-s4-fire-management-strategy-dg3', 'Philosophy fit & permits', ['con-s4-fire-management-strategy-c5', 'con-s4-fire-management-strategy-c6']),
    ],
    completionGate: 'Fire management strategy approved. Burn zones, frequency, and permits confirmed.',
    actHandoff: 'Fire Management Strategy Brief',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'con-s5-native-planting-plan',
    stratumId: 's5-system-design',
    ref: 'CON-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design native planting plan & revegetation sequence',
    shortTitle: 'Native planting plan & revegetation',
    focusedQuestion:
      'How will active planting be designed - species, densities, zones, and establishment sequence?',
    checklist: [
      ck('con-s5-native-planting-plan-c1', 'Map planting zones by species palette and ecological succession stage', { feeds: ['con-s7-phase1-priorities'] }),
      ck('con-s5-native-planting-plan-c2', 'Specify planting densities by species and zone', { feeds: ['s7-resource-plan'] }),
      ck('con-s5-native-planting-plan-c3', 'Design nurse crop and pioneer planting for bare or degraded areas', { feeds: ['con-s7-phase1-priorities'] }),
      ck('con-s5-native-planting-plan-c4', 'Specify establishment support requirements - guards, weed suppression, irrigation if required', { feeds: ['s7-resource-plan'] }),
      ck('con-s5-native-planting-plan-c5', 'Sequence planting zones by priority - address highest-leverage zones first', { feeds: ['con-s7-phase1-priorities'] }),
      ck('con-s5-native-planting-plan-c6', 'Confirm planting plan is consistent with provenance strategy', { feeds: ['con-s6-ecological-monitoring'] }),
    ],
    decisionGroups: [
      dg('con-s5-native-planting-plan-dg1', 'Zones & densities', ['con-s5-native-planting-plan-c1', 'con-s5-native-planting-plan-c2']),
      dg('con-s5-native-planting-plan-dg2', 'Pioneer planting & establishment support', ['con-s5-native-planting-plan-c3', 'con-s5-native-planting-plan-c4']),
      dg('con-s5-native-planting-plan-dg3', 'Priority sequence & provenance fit', ['con-s5-native-planting-plan-c5', 'con-s5-native-planting-plan-c6']),
    ],
    completionGate:
      'Native planting plan approved. Species, densities, zones, and sequence confirmed against provenance strategy.',
    actHandoff: 'Native Planting Plan & Revegetation Sequence',
  }),
  obj({
    id: 'con-s5-pest-control-infrastructure',
    stratumId: 's5-system-design',
    ref: 'CON-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design pest & invasive species control infrastructure',
    shortTitle: 'Pest & invasive control infrastructure',
    focusedQuestion:
      'How will pest control infrastructure be designed - trap networks, bait stations, buffer treatment zones?',
    checklist: [
      ck('con-s5-pest-control-infrastructure-c1', 'Design trap or bait station network - locations, density, species-specific configuration', { feeds: ['con-s6-pest-monitoring', 's7-resource-plan'] }),
      ck('con-s5-pest-control-infrastructure-c2', 'Design buffer treatment zones at site boundaries and invasion vectors', { feeds: ['con-s6-pest-monitoring'] }),
      ck('con-s5-pest-control-infrastructure-c3', 'Specify access routes for trap checking and maintenance', { feeds: ['s7-resource-plan'] }),
      ck('con-s5-pest-control-infrastructure-c4', 'Design signage and safety infrastructure for bait stations', { feeds: ['s7-risk-register'] }),
      ck('con-s5-pest-control-infrastructure-c5', 'Confirm infrastructure is consistent with approved control methods', { feeds: ['con-s7-phase1-priorities'] }),
    ],
    decisionGroups: [
      dg('con-s5-pest-control-infrastructure-dg1', 'Trap network & buffer zones', ['con-s5-pest-control-infrastructure-c1', 'con-s5-pest-control-infrastructure-c2']),
      dg('con-s5-pest-control-infrastructure-dg2', 'Access & safety signage', ['con-s5-pest-control-infrastructure-c3', 'con-s5-pest-control-infrastructure-c4']),
      dg('con-s5-pest-control-infrastructure-dg3', 'Methods consistency', ['con-s5-pest-control-infrastructure-c5']),
    ],
    completionGate: 'Pest and invasive species control infrastructure design approved.',
    actHandoff: 'Pest & Invasive Species Control Infrastructure Design Package',
  }),
  obj({
    id: 'con-s5-water-regime-infrastructure',
    stratumId: 's5-system-design',
    ref: 'CON-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design water regime restoration infrastructure',
    shortTitle: 'Water regime restoration infrastructure',
    focusedQuestion:
      'How will drain blocking, wetland reinstatement, and watercourse realignment infrastructure be designed?',
    checklist: [
      ck('con-s5-water-regime-infrastructure-c1', 'Design drain blocking structures - type, materials, locations', { feeds: ['con-s7-phase1-priorities', 's7-resource-plan'] }),
      ck('con-s5-water-regime-infrastructure-c2', 'Design wetland reinstatement earthworks - bunding, grading, inflow management', { feeds: ['con-s7-phase1-priorities', 's7-resource-plan'] }),
      ck('con-s5-water-regime-infrastructure-c3', 'Design watercourse realignment or de-channelisation works', { feeds: ['s7-resource-plan'] }),
      ck('con-s5-water-regime-infrastructure-c4', 'Specify construction methodology to minimise ecological disturbance', { feeds: ['s7-risk-register'] }),
      ck('con-s5-water-regime-infrastructure-c5', 'Confirm design is consistent with consents obtained', { feeds: ['s7-risk-register'] }),
    ],
    decisionGroups: [
      dg('con-s5-water-regime-infrastructure-dg1', 'Drain blocking & wetland earthworks', ['con-s5-water-regime-infrastructure-c1', 'con-s5-water-regime-infrastructure-c2']),
      dg('con-s5-water-regime-infrastructure-dg2', 'Watercourse works & low-impact method', ['con-s5-water-regime-infrastructure-c3', 'con-s5-water-regime-infrastructure-c4']),
      dg('con-s5-water-regime-infrastructure-dg3', 'Consent consistency', ['con-s5-water-regime-infrastructure-c5']),
    ],
    completionGate: 'Water regime restoration infrastructure design approved and consistent with consents.',
    actHandoff: 'Water Regime Restoration Infrastructure Design Package',
  }),
  obj({
    id: 'con-s5-wildlife-habitat-infrastructure',
    stratumId: 's5-system-design',
    ref: 'CON-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design wildlife habitat infrastructure',
    shortTitle: 'Wildlife habitat infrastructure',
    focusedQuestion:
      'How will artificial habitat structures be designed and placed to support target species recovery?',
    checklist: [
      ck('con-s5-wildlife-habitat-infrastructure-c1', 'Design nest box programme - species-specific design, placement, density', { feeds: ['con-s6-ecological-monitoring', 's7-resource-plan'] }),
      ck('con-s5-wildlife-habitat-infrastructure-c2', 'Design raptor and predator perch infrastructure - poles, platforms, locations', { feeds: ['s7-resource-plan'] }),
      ck('con-s5-wildlife-habitat-infrastructure-c3', 'Design rock pile, log habitat, and refuge structures', { feeds: ['con-s7-phase1-priorities'] }),
      ck('con-s5-wildlife-habitat-infrastructure-c4', 'Design corridor planting to connect habitat patches', { feeds: ['con-s7-phase1-priorities'] }),
      ck('con-s5-wildlife-habitat-infrastructure-c5', 'Confirm habitat infrastructure placement aligns with wildlife survey findings', { feeds: ['con-s6-ecological-monitoring'] }),
    ],
    decisionGroups: [
      dg('con-s5-wildlife-habitat-infrastructure-dg1', 'Nest boxes & perches', ['con-s5-wildlife-habitat-infrastructure-c1', 'con-s5-wildlife-habitat-infrastructure-c2']),
      dg('con-s5-wildlife-habitat-infrastructure-dg2', 'Refuge structures & corridors', ['con-s5-wildlife-habitat-infrastructure-c3', 'con-s5-wildlife-habitat-infrastructure-c4']),
      dg('con-s5-wildlife-habitat-infrastructure-dg3', 'Survey-aligned placement', ['con-s5-wildlife-habitat-infrastructure-c5']),
    ],
    completionGate:
      'Wildlife habitat infrastructure design approved. Placement confirmed against survey findings.',
    actHandoff: 'Wildlife Habitat Infrastructure Design Package',
  }),
  obj({
    id: 'con-s5-fencing-exclusion',
    stratumId: 's5-system-design',
    ref: 'CON-S5.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design fencing & exclusion infrastructure',
    shortTitle: 'Fencing & exclusion infrastructure',
    focusedQuestion:
      'How will stock exclusion, predator fencing, and boundary fencing be designed to protect restoration investment?',
    checklist: [
      ck('con-s5-fencing-exclusion-c1', 'Map all fencing requirements - stock exclusion, predator exclusion, boundary', { feeds: ['con-s7-phase1-priorities', 's7-resource-plan'] }),
      ck('con-s5-fencing-exclusion-c2', 'Specify fence type and standard by zone and function', { feeds: ['s7-resource-plan'] }),
      ck('con-s5-fencing-exclusion-c3', 'Design gate placement for management access', { feeds: ['s7-resource-plan'] }),
      ck('con-s5-fencing-exclusion-c4', 'Design water crossings and wildlife crossing points in fence lines', { feeds: ['s7-resource-plan'] }),
      ck('con-s5-fencing-exclusion-c5', 'Specify materials for longevity and maintenance requirements', { feeds: ['s7-resource-plan'] }),
      ck('con-s5-fencing-exclusion-c6', 'Confirm fencing is installed before revegetation in zones requiring stock exclusion', { feeds: ['con-s7-phase1-priorities'] }),
    ],
    decisionGroups: [
      dg('con-s5-fencing-exclusion-dg1', 'Requirements & fence standard', ['con-s5-fencing-exclusion-c1', 'con-s5-fencing-exclusion-c2']),
      dg('con-s5-fencing-exclusion-dg2', 'Gates & crossings', ['con-s5-fencing-exclusion-c3', 'con-s5-fencing-exclusion-c4']),
      dg('con-s5-fencing-exclusion-dg3', 'Materials & install-before-planting', ['con-s5-fencing-exclusion-c5', 'con-s5-fencing-exclusion-c6']),
    ],
    completionGate:
      'Fencing and exclusion infrastructure design approved. Stock exclusion confirmed to precede revegetation.',
    actHandoff: 'Fencing & Exclusion Infrastructure Design Package',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'con-s6-ecological-monitoring',
    stratumId: 's6-integration-design',
    ref: 'CON-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design ecological monitoring & baseline tracking protocol',
    shortTitle: 'Ecological monitoring & baseline tracking',
    focusedQuestion:
      'How will restoration progress be measured against the Tier 0 ecological outcome targets - and what methods ensure consistency over time?',
    checklist: [
      ck('con-s6-ecological-monitoring-c1', 'Define vegetation monitoring methodology - transects, quadrats, photo points', { feeds: ['s7-resource-plan'] }),
      ck('con-s6-ecological-monitoring-c2', 'Define fauna monitoring methodology - species-specific survey methods', { feeds: ['s7-resource-plan'] }),
      ck('con-s6-ecological-monitoring-c3', 'Define monitoring frequency and seasonal timing for each method', { feeds: ['con-s7-longterm-timeline'] }),
      ck('con-s6-ecological-monitoring-c4', 'Design data recording and storage system for long-term trend analysis', { feeds: ['con-s7-adaptive-management'] }),
      ck('con-s6-ecological-monitoring-c5', 'Define ecological condition scoring methodology consistent with baseline', { feeds: ['con-s7-longterm-timeline'] }),
      ck('con-s6-ecological-monitoring-c6', 'Define threshold triggers - what condition score change initiates a management response', { feeds: ['con-s7-adaptive-management', 's7-risk-register'] }),
    ],
    decisionGroups: [
      dg('con-s6-ecological-monitoring-dg1', 'Vegetation & fauna methods', ['con-s6-ecological-monitoring-c1', 'con-s6-ecological-monitoring-c2']),
      dg('con-s6-ecological-monitoring-dg2', 'Frequency & data storage', ['con-s6-ecological-monitoring-c3', 'con-s6-ecological-monitoring-c4']),
      dg('con-s6-ecological-monitoring-dg3', 'Scoring & trigger thresholds', ['con-s6-ecological-monitoring-c5', 'con-s6-ecological-monitoring-c6']),
    ],
    completionGate:
      'Ecological monitoring protocol approved. Methodology consistent with baseline, frequency and triggers defined.',
    actHandoff: 'Ecological Monitoring & Baseline Tracking Protocol',
  }),
  obj({
    id: 'con-s6-pest-monitoring',
    stratumId: 's6-integration-design',
    ref: 'CON-S6.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design pest & invasive species monitoring protocol',
    shortTitle: 'Pest & invasive species monitoring',
    focusedQuestion:
      'How will reinvasion and pest population changes be detected early enough to trigger effective management response?',
    checklist: [
      ck('con-s6-pest-monitoring-c1', 'Define weed monitoring methodology - reinvasion mapping frequency and method', { feeds: ['s7-resource-plan'] }),
      ck('con-s6-pest-monitoring-c2', 'Define pest animal monitoring methodology - index method per species', { feeds: ['s7-resource-plan'] }),
      ck('con-s6-pest-monitoring-c3', 'Specify monitoring frequency - more frequent at invasion vectors and buffer zones', { feeds: ['con-s7-adaptive-management'] }),
      ck('con-s6-pest-monitoring-c4', 'Define reinvasion trigger thresholds - density or coverage that initiates control response', { feeds: ['con-s7-adaptive-management', 's7-risk-register'] }),
      ck('con-s6-pest-monitoring-c5', 'Design early warning system for new invasive species arrivals', { feeds: ['s7-risk-register'] }),
    ],
    decisionGroups: [
      dg('con-s6-pest-monitoring-dg1', 'Weed & pest animal methods', ['con-s6-pest-monitoring-c1', 'con-s6-pest-monitoring-c2']),
      dg('con-s6-pest-monitoring-dg2', 'Frequency & reinvasion triggers', ['con-s6-pest-monitoring-c3', 'con-s6-pest-monitoring-c4']),
      dg('con-s6-pest-monitoring-dg3', 'Early warning system', ['con-s6-pest-monitoring-c5']),
    ],
    completionGate:
      'Pest and invasive species monitoring protocol approved. Trigger thresholds defined for all priority species.',
    actHandoff: 'Pest & Invasive Species Monitoring Protocol',
  }),
  obj({
    id: 'con-s6-fire-monitoring',
    stratumId: 's6-integration-design',
    ref: 'CON-S6.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design fire management monitoring protocol',
    shortTitle: 'Fire management monitoring',
    focusedQuestion:
      'How will fuel load, fire condition windows, and post-fire recovery be monitored to inform fire management decisions?',
    checklist: [
      ck('con-s6-fire-monitoring-c1', 'Define fuel load assessment methodology and monitoring frequency by zone', { feeds: ['s7-resource-plan'] }),
      ck('con-s6-fire-monitoring-c2', 'Define fire weather condition monitoring - temperature, humidity, wind, FFDI thresholds', { feeds: ['s7-risk-register'] }),
      ck('con-s6-fire-monitoring-c3', 'Design post-fire recovery assessment protocol - vegetation response, fauna return', { feeds: ['con-s7-adaptive-management'] }),
      ck('con-s6-fire-monitoring-c4', 'Define burn effectiveness assessment - did the burn achieve ecological objectives', { feeds: ['con-s7-adaptive-management'] }),
      ck('con-s6-fire-monitoring-c5', 'Specify record-keeping system for fire history and outcomes', { feeds: ['con-s7-adaptive-management'] }),
    ],
    decisionGroups: [
      dg('con-s6-fire-monitoring-dg1', 'Fuel load & fire weather', ['con-s6-fire-monitoring-c1', 'con-s6-fire-monitoring-c2']),
      dg('con-s6-fire-monitoring-dg2', 'Post-fire & effectiveness assessment', ['con-s6-fire-monitoring-c3', 'con-s6-fire-monitoring-c4']),
      dg('con-s6-fire-monitoring-dg3', 'Record-keeping', ['con-s6-fire-monitoring-c5']),
    ],
    completionGate:
      'Fire management monitoring protocol approved. Fuel load, condition, and post-fire assessment methods defined.',
    actHandoff: 'Fire Management Monitoring Protocol',
  }),
  obj({
    id: 'con-s6-external-relations-compliance',
    stratumId: 's6-integration-design',
    ref: 'CON-S6.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design external relations & compliance monitoring system',
    shortTitle: 'External relations & compliance monitoring',
    focusedQuestion:
      'How will this project actively manage its relationships with regulatory bodies, funding organisations, and neighbours throughout restoration?',
    checklist: [
      ck('con-s6-external-relations-compliance-c1', 'Define reporting schedule and format for each funding body and regulatory authority', { feeds: ['con-s7-funding-resourcing'] }),
      ck('con-s6-external-relations-compliance-c2', 'Design compliance monitoring system - track all consent conditions and reporting obligations', { feeds: ['s7-risk-register'] }),
      ck('con-s6-external-relations-compliance-c3', 'Define community and neighbour communication rhythm', { feeds: ['con-s7-volunteer-stewardship'] }),
      ck('con-s6-external-relations-compliance-c4', 'Design complaint response process', { feeds: ['s7-risk-register'] }),
      ck('con-s6-external-relations-compliance-c5', 'Define annual external relations review', { feeds: ['con-s7-adaptive-management'] }),
    ],
    decisionGroups: [
      dg('con-s6-external-relations-compliance-dg1', 'Reporting & compliance tracking', ['con-s6-external-relations-compliance-c1', 'con-s6-external-relations-compliance-c2']),
      dg('con-s6-external-relations-compliance-dg2', 'Community communication & complaints', ['con-s6-external-relations-compliance-c3', 'con-s6-external-relations-compliance-c4']),
      dg('con-s6-external-relations-compliance-dg3', 'Annual review', ['con-s6-external-relations-compliance-c5']),
    ],
    completionGate:
      'External relations and compliance monitoring system approved. All reporting obligations tracked.',
    actHandoff: 'External Relations & Compliance Monitoring System',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'con-s7-phase1-priorities',
    stratumId: 's7-phasing-resourcing',
    ref: 'CON-S7.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define restoration phase 1 implementation priorities',
    shortTitle: 'Restoration phase 1 priorities',
    focusedQuestion:
      'Which restoration interventions deliver the greatest ecological return in Phase 1 - and how are they sequenced by ecological logic?',
    checklist: [
      ck('con-s7-phase1-priorities-c1', 'Rank Phase 1 interventions by ecological leverage and cost-effectiveness'),
      ck('con-s7-phase1-priorities-c2', 'Confirm fencing and stock exclusion precedes all revegetation work'),
      ck('con-s7-phase1-priorities-c3', 'Confirm water regime restoration precedes planting in water-dependent zones'),
      ck('con-s7-phase1-priorities-c4', 'Confirm weed control is sequenced before planting in high-pressure zones'),
      ck('con-s7-phase1-priorities-c5', 'Define go/no-go criteria for each Phase 1 intervention'),
    ],
    decisionGroups: [
      dg('con-s7-phase1-priorities-dg1', 'Leverage ranking', ['con-s7-phase1-priorities-c1']),
      dg('con-s7-phase1-priorities-dg2', 'Sequencing confirmations', ['con-s7-phase1-priorities-c2', 'con-s7-phase1-priorities-c3', 'con-s7-phase1-priorities-c4']),
      dg('con-s7-phase1-priorities-dg3', 'Go/no-go criteria', ['con-s7-phase1-priorities-c5']),
    ],
    completionGate:
      'Phase 1 restoration priorities approved. Ecological sequencing confirmed and go/no-go criteria defined.',
    actHandoff: 'Restoration Phase 1 Implementation Priorities',
  }),
  obj({
    id: 'con-s7-longterm-timeline',
    stratumId: 's7-phasing-resourcing',
    ref: 'CON-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define long-term restoration timeline & milestone targets',
    shortTitle: 'Long-term timeline & milestones',
    focusedQuestion:
      'What are the 5, 10, and 25-year ecological milestones - and how will progress be assessed against them?',
    checklist: [
      ck('con-s7-longterm-timeline-c1', 'Define 5-year ecological milestone targets per zone'),
      ck('con-s7-longterm-timeline-c2', 'Define 10-year ecological milestone targets'),
      ck('con-s7-longterm-timeline-c3', 'Define 25-year target ecological state'),
      ck('con-s7-longterm-timeline-c4', 'Specify assessment methodology for each milestone'),
      ck('con-s7-longterm-timeline-c5', 'Define review and adaptation protocol if milestones are not met'),
    ],
    decisionGroups: [
      dg('con-s7-longterm-timeline-dg1', '5 & 10-year milestones', ['con-s7-longterm-timeline-c1', 'con-s7-longterm-timeline-c2']),
      dg('con-s7-longterm-timeline-dg2', '25-year state & assessment method', ['con-s7-longterm-timeline-c3', 'con-s7-longterm-timeline-c4']),
      dg('con-s7-longterm-timeline-dg3', 'Review & adaptation', ['con-s7-longterm-timeline-c5']),
    ],
    completionGate:
      'Long-term restoration timeline approved. Milestones defined, measurable, and linked to assessment methodology.',
    actHandoff: 'Long-Term Restoration Timeline & Milestone Targets',
  }),
  obj({
    id: 'con-s7-funding-resourcing',
    stratumId: 's7-phasing-resourcing',
    ref: 'CON-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define ongoing funding & stewardship resourcing strategy',
    shortTitle: 'Ongoing funding & stewardship resourcing',
    focusedQuestion:
      'How will this conservation project be funded and resourced beyond Phase 1 - grants, carbon credits, covenants, partnerships?',
    checklist: [
      ck('con-s7-funding-resourcing-c1', 'Identify applicable funding sources - conservation grants, biodiversity credits, carbon, trusts'),
      ck('con-s7-funding-resourcing-c2', 'Define grant application schedule and reporting obligations'),
      ck('con-s7-funding-resourcing-c3', 'Assess carbon credit or biodiversity credit potential and registration requirements'),
      ck('con-s7-funding-resourcing-c4', 'Define volunteer programme structure and recruitment strategy'),
      ck('con-s7-funding-resourcing-c5', 'Define minimum annual resourcing requirement for ongoing management'),
      ck('con-s7-funding-resourcing-c6', 'Identify resourcing gap and bridging strategy'),
    ],
    decisionGroups: [
      dg('con-s7-funding-resourcing-dg1', 'Funding sources & grant schedule', ['con-s7-funding-resourcing-c1', 'con-s7-funding-resourcing-c2']),
      dg('con-s7-funding-resourcing-dg2', 'Credits & volunteer programme', ['con-s7-funding-resourcing-c3', 'con-s7-funding-resourcing-c4']),
      dg('con-s7-funding-resourcing-dg3', 'Annual requirement & gap', ['con-s7-funding-resourcing-c5', 'con-s7-funding-resourcing-c6']),
    ],
    completionGate:
      'Ongoing funding and resourcing strategy approved. Minimum annual requirement defined and funding gap addressed.',
    actHandoff: 'Ongoing Funding & Stewardship Resourcing Strategy',
  }),
  obj({
    id: 'con-s7-adaptive-management',
    stratumId: 's7-phasing-resourcing',
    ref: 'CON-S7.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define adaptive management protocol',
    shortTitle: 'Adaptive management protocol',
    focusedQuestion:
      'How will monitoring findings trigger management changes - ensuring the restoration plan evolves as the land responds?',
    checklist: [
      ck('con-s7-adaptive-management-c1', 'Define annual management review process - who participates, what data is reviewed'),
      ck('con-s7-adaptive-management-c2', 'Define decision triggers - what monitoring outcomes require a management plan change'),
      ck('con-s7-adaptive-management-c3', 'Define escalation process for unexpected ecological events'),
      ck('con-s7-adaptive-management-c4', 'Specify documentation requirements for all management changes and their rationale'),
      ck('con-s7-adaptive-management-c5', 'Define 5-year comprehensive plan review against long-term milestones'),
    ],
    decisionGroups: [
      dg('con-s7-adaptive-management-dg1', 'Annual review & triggers', ['con-s7-adaptive-management-c1', 'con-s7-adaptive-management-c2']),
      dg('con-s7-adaptive-management-dg2', 'Escalation & documentation', ['con-s7-adaptive-management-c3', 'con-s7-adaptive-management-c4']),
      dg('con-s7-adaptive-management-dg3', '5-year comprehensive review', ['con-s7-adaptive-management-c5']),
    ],
    completionGate:
      'Adaptive management protocol approved. Review cycle, triggers, and documentation requirements confirmed.',
    actHandoff: 'Adaptive Management Protocol',
  }),
  obj({
    id: 'con-s7-volunteer-stewardship',
    stratumId: 's7-phasing-resourcing',
    ref: 'CON-S7.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define volunteer & community stewardship programme',
    shortTitle: 'Volunteer & community stewardship',
    focusedQuestion:
      'How will volunteers, community groups, and citizen scientists be integrated into ongoing restoration stewardship?',
    checklist: [
      ck('con-s7-volunteer-stewardship-c1', 'Define volunteer programme structure - roles, training, supervision requirements'),
      ck('con-s7-volunteer-stewardship-c2', 'Identify community groups and schools for partnership'),
      ck('con-s7-volunteer-stewardship-c3', 'Design citizen science data collection programme - species recording, photo monitoring'),
      ck('con-s7-volunteer-stewardship-c4', 'Define volunteer health and safety protocol'),
      ck('con-s7-volunteer-stewardship-c5', 'Design volunteer recognition and retention programme'),
      ck('con-s7-volunteer-stewardship-c6', 'Specify insurance and liability requirements for volunteer activities'),
    ],
    decisionGroups: [
      dg('con-s7-volunteer-stewardship-dg1', 'Programme structure & partnerships', ['con-s7-volunteer-stewardship-c1', 'con-s7-volunteer-stewardship-c2']),
      dg('con-s7-volunteer-stewardship-dg2', 'Citizen science & safety', ['con-s7-volunteer-stewardship-c3', 'con-s7-volunteer-stewardship-c4']),
      dg('con-s7-volunteer-stewardship-dg3', 'Retention & liability', ['con-s7-volunteer-stewardship-c5', 'con-s7-volunteer-stewardship-c6']),
    ],
    completionGate:
      'Volunteer and community stewardship programme approved. Roles, safety, and partnership structure confirmed.',
    actHandoff: 'Volunteer & Community Stewardship Programme',
  }),
];

// catalogues/orchard.ts
//
// Orchard / Food Forest / Perennial Agroforestry PRIMARY-type objectives - the
// 25 type-specific objectives an Orchard project adds on top of the 19 Universal
// objectives (OLOS Orchard / Food Forest / Perennial Agroforestry Objective
// Catalogue v1.0, authored to Catalogue Authoring Standards v1.4).
//
// This file holds ONLY the primary-layer standalone objectives. The universal
// slot lives in ./universal.ts (the shared baseline).
//
// Count note: 19 universal + 25 primary = 44 total. Per-tier primary counts
// (3+3+3+5+5+3+3 = 25) and the source's "Complete objective index" both confirm
// 25. The source numbers objectives by Tier 0-6; this catalogue maps Tier N ->
// Stratum (N+1) to match the codebase spine: Tier 0 -> s1-project-foundation,
// 1 -> s2-land-reading, 2 -> s3-systems-reading, 3 -> s4-foundation-decisions,
// 4 -> s5-system-design, 5 -> s6-integration-design, 6 -> s7-phasing-resourcing.
// Refs are restamped ORCH-S<stratum>.<n> from the source's <tier>.<n>.
//
// Economic note: the only money objective is ORCH-S7.6 "Define enterprise
// financial viability plan" - ordinary cash-flow / break-even budgeting across
// the pre-production years. No advance sale, no financial product, no riba- or
// gharar-adjacent content. Amanah Gate: clean land-stewardship catalogue; the
// 2026-05-29 "encode verbatim, no gating" override is not engaged.
//
// Hard gate: ORCH-S7.4 (Define planting establishment sequence) carries the
// source's hard gate verbatim - tree stock is often non-refundable, so soil,
// water, and protection infrastructure must be confirmed ready before tree
// arrival.
//
// Universal-augmentation note (DEFERRED 2026-05-30): the source appends a
// type-specific "Harvest access addition" sub-block INSIDE Universal 4.1 "Design
// access & circulation" (s5-access: "Design harvest vehicle turning radii between
// rows - tractor or quad bike clearance"; "Design pack-out staging area at
// orchard entry - cool chain from harvest"). Universal objectives are shared by
// reference across every type and there is no existing seam for a PRIMARY to
// patch a universal objective. These items are intentionally NOT YET encoded
// here; the operator is supplying a document that resolves the encoding approach.
// They are tracked and will be added in a follow-up pass - not silently dropped.
//
// source: 'primary', sourceTypeId: 'orchard_food_forest' on every objective.
// Refs follow Authoring Standards (ORCH-S<stratum>.<n>). ASCII-only copy:
// em/en dashes -> " - "; curly quotes -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, obj } from './authoring.js';

const PRIMARY = 'orchard_food_forest' as const;

export const ORCHARD_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'orch-s1-species-philosophy',
    stratumId: 's1-project-foundation',
    ref: 'ORCH-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define species selection philosophy & succession intent',
    focusedQuestion:
      'What ecological trajectory is being designed toward - and how does that determine species selection, layering, and management?',
    checklist: [
      ck(
        'orch-s1-species-philosophy-c1',
        'Define primary design intent - commercial orchard, homestead food forest, ecological food forest, or hybrid',
      ),
      ck(
        'orch-s1-species-philosophy-c2',
        'Define succession trajectory - pioneer to climax, or maintained productive stage',
      ),
      ck(
        'orch-s1-species-philosophy-c3',
        'Define canopy, understory, shrub, ground, and root layer intent',
      ),
      ck(
        'orch-s1-species-philosophy-c4',
        'Define ecological function targets - biodiversity, carbon, soil building alongside production',
      ),
      ck(
        'orch-s1-species-philosophy-c5',
        'Document species philosophy as design constraint - all Tier 3 species decisions evaluated against it',
      ),
    ],
    completionGate:
      'Species selection philosophy and succession intent approved and documented as design constraint.',
    actHandoff: 'Species Selection Philosophy & Succession Intent Brief',
  }),
  obj({
    id: 'orch-s1-production-intent',
    stratumId: 's1-project-foundation',
    ref: 'ORCH-S1.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define production & harvest intent',
    focusedQuestion:
      'What is this system producing, for whom, and what does harvest and sales infrastructure need to support?',
    checklist: [
      ck(
        'orch-s1-production-intent-c1',
        'Define primary production intent - commercial sales, household supply, processing, or combination',
      ),
      ck(
        'orch-s1-production-intent-c2',
        'Identify species prioritised for commercial production vs. ecological function',
      ),
      ck(
        'orch-s1-production-intent-c3',
        'Define harvest scale and handling requirement',
      ),
      ck(
        'orch-s1-production-intent-c4',
        'Define sales channels if commercial - direct, wholesale, processing',
      ),
      ck(
        'orch-s1-production-intent-c5',
        'Confirm production intent is achievable within steward capacity and site potential',
      ),
    ],
    completionGate:
      'Production and harvest intent approved. Sales channel requirements confirmed.',
    actHandoff: 'Production & Harvest Intent Brief',
  }),
  obj({
    id: 'orch-s1-provenance-sourcing',
    stratumId: 's1-project-foundation',
    ref: 'ORCH-S1.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define provenance & sourcing strategy',
    focusedQuestion:
      'Where will tree stock come from - and how far in advance must sourcing be secured?',
    checklist: [
      ck(
        'orch-s1-provenance-sourcing-c1',
        'Define rootstock selection by species - dwarfing, semi-dwarfing, standard relative to production intent',
      ),
      ck(
        'orch-s1-provenance-sourcing-c2',
        'Identify local provenance seed or scion sources for food forest species',
      ),
      ck(
        'orch-s1-provenance-sourcing-c3',
        'Identify certified nurseries with required rootstock and variety availability',
      ),
      ck(
        'orch-s1-provenance-sourcing-c4',
        'Define lead time requirements - order 1-2 seasons ahead for quality stock',
      ),
      ck(
        'orch-s1-provenance-sourcing-c5',
        'Define bare-root vs. pot-grown strategy per species',
      ),
      ck(
        'orch-s1-provenance-sourcing-c6',
        'Confirm all species are legally available in this jurisdiction - biosecurity restrictions',
      ),
    ],
    completionGate:
      'Provenance and sourcing strategy approved. Nursery relationships and lead times confirmed.',
    actHandoff: 'Provenance & Sourcing Strategy Brief',
    scopeNotes:
      'Tree stock lead times are 1-2 years for quality bare-root material. Sourcing strategy must be confirmed before design is finalised - species availability constrains design, not the other way around.',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'orch-s2-tree-cover',
    stratumId: 's2-land-reading',
    ref: 'ORCH-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey existing tree cover & canopy condition',
    focusedQuestion:
      'What trees already exist - and how do they shape light availability, species selection, and succession trajectory?',
    checklist: [
      ck(
        'orch-s2-tree-cover-c1',
        'Inventory all existing trees - species, age, condition, production history',
      ),
      ck(
        'orch-s2-tree-cover-c2',
        'Assess canopy cover and light transmission by zone',
      ),
      ck(
        'orch-s2-tree-cover-c3',
        'Identify trees with orchard or food forest integration potential',
      ),
      ck(
        'orch-s2-tree-cover-c4',
        'Identify diseased, dying, or removal-required trees',
      ),
      ck(
        'orch-s2-tree-cover-c5',
        'Map canopy gaps and open areas for new planting',
      ),
      ck(
        'orch-s2-tree-cover-c6',
        'Assess existing guild species and understory composition',
      ),
    ],
    completionGate:
      'Existing tree cover and canopy survey complete. Integration potential and removal requirements identified.',
    actHandoff: 'Existing Tree Cover & Canopy Condition Survey',
  }),
  obj({
    id: 'orch-s2-frost-drainage',
    stratumId: 's2-land-reading',
    ref: 'ORCH-S2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey frost drainage & microclimate zones',
    focusedQuestion:
      'How does cold air move across this site - and which zones are most and least frost-prone?',
    checklist: [
      ck(
        'orch-s2-frost-drainage-c1',
        'Map cold air drainage paths from high ground to low points',
      ),
      ck(
        'orch-s2-frost-drainage-c2',
        'Identify frost pocket zones - hollow ground, dam edges, wind shadow areas',
      ),
      ck(
        'orch-s2-frost-drainage-c3',
        'Map south-facing and north-facing aspects and their thermal difference',
      ),
      ck(
        'orch-s2-frost-drainage-c4',
        'Record historical frost events and their distribution across the site if available',
      ),
      ck(
        'orch-s2-frost-drainage-c5',
        'Identify warmest microclimate zones - suitable for frost-sensitive species',
      ),
      ck(
        'orch-s2-frost-drainage-c6',
        'Confirm frost drainage findings against topographic survey',
      ),
    ],
    completionGate:
      'Frost drainage and microclimate zones mapped. Species placement zones defined by frost risk.',
    actHandoff: 'Frost Drainage & Microclimate Zone Survey',
  }),
  obj({
    id: 'orch-s2-landscape-context',
    stratumId: 's2-land-reading',
    ref: 'ORCH-S2.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey surrounding landscape context & vectors',
    focusedQuestion:
      'What neighbouring orchard practices, pest pressure, and contamination risks affect this system?',
    checklist: [
      ck(
        'orch-s2-landscape-context-c1',
        'Map surrounding land uses within 2km - particularly neighbouring orchards and spray programs',
      ),
      ck(
        'orch-s2-landscape-context-c2',
        'Identify neighbouring spray regimes and their drift risk by wind direction',
      ),
      ck(
        'orch-s2-landscape-context-c3',
        'Assess pollination resources in surrounding landscape - wild bee habitat, neighbouring orchards',
      ),
      ck(
        'orch-s2-landscape-context-c4',
        'Assess drinking water catchment contamination risk',
      ),
      ck(
        'orch-s2-landscape-context-c5',
        'Identify landscape-scale pest and disease pressure sources - codling moth, fireblight',
      ),
    ],
    completionGate: 'Landscape context and vector survey complete.',
    actHandoff: 'Landscape Context & Vector Survey Package',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'orch-s3-rootzone-depth',
    stratumId: 's3-systems-reading',
    ref: 'ORCH-S3.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey soil depth & rootzone potential',
    focusedQuestion:
      'Is there sufficient soil depth for target tree species - and are there hardpan or restrictive layers that constrain planting site selection?',
    checklist: [
      ck(
        'orch-s3-rootzone-depth-c1',
        'Conduct profile pits at proposed planting sites - minimum 1.2m depth assessment',
      ),
      ck(
        'orch-s3-rootzone-depth-c2',
        'Map rootzone depth across all proposed planting zones',
      ),
      ck(
        'orch-s3-rootzone-depth-c3',
        'Identify hardpan, clay pan, or rock layers that restrict rooting depth',
      ),
      ck(
        'orch-s3-rootzone-depth-c4',
        'Assess drainage class at rootzone depth - waterlogging risk for tree roots',
      ),
      ck(
        'orch-s3-rootzone-depth-c5',
        'Define minimum acceptable rootzone depth per species and rootstock',
      ),
      ck(
        'orch-s3-rootzone-depth-c6',
        'Flag planting sites that fail minimum rootzone requirement for remediation or exclusion',
      ),
    ],
    completionGate:
      'Rootzone depth survey complete. Inadequate sites identified and flagged.',
    actHandoff: 'Soil Depth & Rootzone Potential Survey',
  }),
  obj({
    id: 'orch-s3-water-availability',
    stratumId: 's3-systems-reading',
    ref: 'ORCH-S3.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey water availability & seasonal dry period',
    focusedQuestion:
      'Is there sufficient water for tree establishment - and what irrigation is required through the dry season?',
    checklist: [
      ck(
        'orch-s3-water-availability-c1',
        'Assess available water source yield through dry season',
      ),
      ck(
        'orch-s3-water-availability-c2',
        'Calculate establishment irrigation demand per tree per week for 3-5 year establishment period',
      ),
      ck(
        'orch-s3-water-availability-c3',
        'Calculate total irrigation demand at planned planting density',
      ),
      ck(
        'orch-s3-water-availability-c4',
        'Define dry season length and its overlap with critical establishment windows',
      ),
      ck(
        'orch-s3-water-availability-c5',
        'Confirm water source can meet establishment demand - or define the gap',
      ),
    ],
    completionGate:
      'Water availability for establishment confirmed. Irrigation demand and gap defined.',
    actHandoff: 'Water Availability & Seasonal Dry Period Survey',
  }),
  obj({
    id: 'orch-s3-pest-disease-pressure',
    stratumId: 's3-systems-reading',
    ref: 'ORCH-S3.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey pest & disease pressure by species',
    focusedQuestion:
      'What pest and disease pressures exist for the intended species mix - and does the site history indicate elevated risk?',
    checklist: [
      ck(
        'orch-s3-pest-disease-pressure-c1',
        'Identify pest species relevant to intended fruit and nut crops - codling moth, leaf curler, aphids',
      ),
      ck(
        'orch-s3-pest-disease-pressure-c2',
        'Identify disease risks by crop family - fireblight for pome fruit, brown rot for stone fruit, black spot',
      ),
      ck(
        'orch-s3-pest-disease-pressure-c3',
        'Assess soil-borne disease risk from site history - Phytophthora, Armillaria',
      ),
      ck(
        'orch-s3-pest-disease-pressure-c4',
        'Identify beneficial predator species that reduce pest pressure',
      ),
      ck(
        'orch-s3-pest-disease-pressure-c5',
        'Record any prior crop failures related to pest or disease at this location',
      ),
    ],
    completionGate:
      'Pest and disease pressure baseline complete. High-risk species and site history recorded.',
    actHandoff: 'Pest & Disease Pressure by Species Survey',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'orch-s4-species-mix',
    stratumId: 's4-foundation-decisions',
    ref: 'ORCH-S4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define species mix & planting plan strategy',
    focusedQuestion:
      'What species, in what layers, in what proportions - designed for the defined succession trajectory?',
    checklist: [
      ck(
        'orch-s4-species-mix-c1',
        'Define canopy species and their proportion of total planting',
      ),
      ck(
        'orch-s4-species-mix-c2',
        'Define understory species - productive and ecological function',
      ),
      ck(
        'orch-s4-species-mix-c3',
        'Define shrub layer species - berry, medicinal, nitrogen-fixing',
      ),
      ck(
        'orch-s4-species-mix-c4',
        'Define groundcover and root layer species',
      ),
      ck(
        'orch-s4-species-mix-c5',
        'Define pioneer species for bare or degraded zones',
      ),
      ck(
        'orch-s4-species-mix-c6',
        'Confirm species mix is consistent with species selection philosophy',
      ),
      ck(
        'orch-s4-species-mix-c7',
        'Confirm all species are available from identified nursery sources',
      ),
    ],
    completionGate:
      'Species mix and planting plan strategy approved. All species confirmed available.',
    actHandoff: 'Species Mix & Planting Plan Strategy Brief',
  }),
  obj({
    id: 'orch-s4-water-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'ORCH-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define water strategy for establishment & maturity',
    focusedQuestion:
      'How will trees receive sufficient water through the 3-5 year establishment window - and how will the system transition to rainfall dependence?',
    checklist: [
      ck(
        'orch-s4-water-strategy-c1',
        'Define drip irrigation layout for establishment period',
      ),
      ck(
        'orch-s4-water-strategy-c2',
        'Define irrigation frequency and volume per species and age',
      ),
      ck(
        'orch-s4-water-strategy-c3',
        'Define weaning schedule - reducing irrigation as root systems establish',
      ),
      ck(
        'orch-s4-water-strategy-c4',
        'Define mature system supplemental irrigation triggers - drought threshold',
      ),
      ck(
        'orch-s4-water-strategy-c5',
        'Define permanent vs. temporary irrigation infrastructure',
      ),
    ],
    completionGate:
      'Establishment and maturity water strategy approved. Weaning schedule defined.',
    actHandoff: 'Establishment & Maturity Water Strategy Brief',
  }),
  obj({
    id: 'orch-s4-guild-planting',
    stratumId: 's4-foundation-decisions',
    ref: 'ORCH-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define guild planting & companion species strategy',
    focusedQuestion:
      'What companion species will be planted with trees - nitrogen fixers, dynamic accumulators, pest confusers, and ground covers?',
    checklist: [
      ck(
        'orch-s4-guild-planting-c1',
        'Define guild composition per tree species - companions that support health and productivity',
      ),
      ck(
        'orch-s4-guild-planting-c2',
        'Select nitrogen-fixing species for each planting zone',
      ),
      ck(
        'orch-s4-guild-planting-c3',
        'Select dynamic accumulator species for each zone',
      ),
      ck(
        'orch-s4-guild-planting-c4',
        'Select pest-confuser and beneficial insect habitat species',
      ),
      ck(
        'orch-s4-guild-planting-c5',
        'Define ground cover strategy - living mulch vs. mulched paths',
      ),
      ck(
        'orch-s4-guild-planting-c6',
        'Confirm all guild species are consistent with succession intent',
      ),
    ],
    completionGate:
      'Guild planting and companion species strategy approved.',
    actHandoff: 'Guild Planting & Companion Species Strategy Brief',
  }),
  obj({
    id: 'orch-s4-succession-management',
    stratumId: 's4-foundation-decisions',
    ref: 'ORCH-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define succession management strategy',
    focusedQuestion:
      'How will this system be guided from pioneer to productive to climax - and what management interventions shape that trajectory?',
    checklist: [
      ck(
        'orch-s4-succession-management-c1',
        'Define succession stage targets at 5, 10, and 25 years',
      ),
      ck(
        'orch-s4-succession-management-c2',
        'Define management interventions at each stage - chop and drop, coppicing, thinning',
      ),
      ck(
        'orch-s4-succession-management-c3',
        'Define species removal or replacement triggers - when pioneer species are phased out',
      ),
      ck(
        'orch-s4-succession-management-c4',
        'Define canopy management approach - light penetration targets for productive understory',
      ),
      ck(
        'orch-s4-succession-management-c5',
        'Define system maturity indicator - when management reduces to minimal intervention',
      ),
    ],
    completionGate:
      'Succession management strategy approved. Stage targets and interventions defined.',
    actHandoff: 'Succession Management Strategy Brief',
  }),
  obj({
    id: 'orch-s4-pest-disease-management',
    stratumId: 's4-foundation-decisions',
    ref: 'ORCH-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define pest & disease management strategy',
    focusedQuestion:
      'How will pests and diseases be managed - through variety selection, biological controls, and minimum-intervention practices?',
    checklist: [
      ck(
        'orch-s4-pest-disease-management-c1',
        'Define variety selection criteria - disease resistance as primary filter',
      ),
      ck(
        'orch-s4-pest-disease-management-c2',
        'Define biological control strategy - predator habitat, beneficial release if applicable',
      ),
      ck(
        'orch-s4-pest-disease-management-c3',
        'Define spray program if any - timing, materials consistent with certification intent',
      ),
      ck(
        'orch-s4-pest-disease-management-c4',
        'Define sanitation practices - fallen fruit removal, pruning hygiene',
      ),
      ck(
        'orch-s4-pest-disease-management-c5',
        'Define monitoring trigger thresholds - when observation leads to intervention',
      ),
      ck(
        'orch-s4-pest-disease-management-c6',
        'Confirm all interventions are consistent with growing philosophy',
      ),
    ],
    completionGate:
      'Pest and disease management strategy approved. All interventions philosophy-consistent.',
    actHandoff: 'Pest & Disease Management Strategy Brief',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'orch-s5-planting-layout',
    stratumId: 's5-system-design',
    ref: 'ORCH-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design tree planting layout & species placement',
    focusedQuestion:
      'How will trees be positioned - spacing, rows, species placement relative to microclimate and succession design?',
    checklist: [
      ck(
        'orch-s5-planting-layout-c1',
        'Design row orientation - relative to slope, sun angle, and access',
      ),
      ck(
        'orch-s5-planting-layout-c2',
        'Define spacing per species and rootstock - balanced against canopy development and harvest access',
      ),
      ck(
        'orch-s5-planting-layout-c3',
        'Map species placement relative to frost drainage, aspect, and soil zones',
      ),
      ck(
        'orch-s5-planting-layout-c4',
        'Design inter-row and inter-tree species placement',
      ),
      ck(
        'orch-s5-planting-layout-c5',
        'Confirm layout is consistent with succession management strategy',
      ),
      ck(
        'orch-s5-planting-layout-c6',
        'Produce planting map with species, coordinates, and planting date',
      ),
    ],
    completionGate:
      'Tree planting layout approved. Planting map produced.',
    actHandoff: 'Tree Planting Layout & Species Placement Design',
  }),
  obj({
    id: 'orch-s5-guild-plan',
    stratumId: 's5-system-design',
    ref: 'ORCH-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design guild planting plan',
    focusedQuestion:
      'How will companion and guild species be physically planted - timing, placement, and establishment relative to trees?',
    checklist: [
      ck(
        'orch-s5-guild-plan-c1',
        'Map companion species placement relative to each tree - guild radius',
      ),
      ck(
        'orch-s5-guild-plan-c2',
        'Design planting sequence - pioneer species before trees, groundcovers after establishment',
      ),
      ck(
        'orch-s5-guild-plan-c3',
        'Specify planting density for each guild species by zone',
      ),
      ck(
        'orch-s5-guild-plan-c4',
        'Design ground cover establishment - seeding vs. transplanting',
      ),
      ck(
        'orch-s5-guild-plan-c5',
        'Confirm all guild species are sourced and available for Phase 1 planting',
      ),
    ],
    completionGate: 'Guild planting plan approved. All species sourced.',
    actHandoff: 'Guild Planting Plan',
  }),
  obj({
    id: 'orch-s5-establishment-irrigation',
    stratumId: 's5-system-design',
    ref: 'ORCH-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design establishment irrigation',
    focusedQuestion:
      'How will the drip irrigation system be designed for the 3-5 year establishment window?',
    checklist: [
      ck(
        'orch-s5-establishment-irrigation-c1',
        'Design mainline and submain layout to all planting zones',
      ),
      ck(
        'orch-s5-establishment-irrigation-c2',
        'Design drip emitter placement per tree - emitter count and output rate per species',
      ),
      ck(
        'orch-s5-establishment-irrigation-c3',
        'Design zone valve and pressure regulation layout',
      ),
      ck(
        'orch-s5-establishment-irrigation-c4',
        'Design filtration for drip system - screen and disc filters',
      ),
      ck(
        'orch-s5-establishment-irrigation-c5',
        'Specify pipe materials, diameter, and burial depth',
      ),
      ck(
        'orch-s5-establishment-irrigation-c6',
        'Design for future extension as planting expands',
      ),
    ],
    completionGate:
      'Establishment irrigation design approved. Coverage of all planted trees confirmed.',
    actHandoff: 'Establishment Irrigation Design Package',
  }),
  obj({
    id: 'orch-s5-access-harvest',
    stratumId: 's5-system-design',
    ref: 'ORCH-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design access paths & harvest infrastructure',
    focusedQuestion:
      'How will harvest access paths, picking stations, and pack-out infrastructure be designed?',
    checklist: [
      ck(
        'orch-s5-access-harvest-c1',
        'Design picking path width and surface between tree rows - equipment specific',
      ),
      ck(
        'orch-s5-access-harvest-c2',
        'Design picking stations and fruit collection points',
      ),
      ck(
        'orch-s5-access-harvest-c3',
        'Design pack-out staging - proximity to cool storage or pack shed',
      ),
      ck(
        'orch-s5-access-harvest-c4',
        'Design ladder and platform storage if applicable',
      ),
      ck(
        'orch-s5-access-harvest-c5',
        'Confirm all paths meet harvest vehicle specifications',
      ),
    ],
    completionGate:
      'Access paths and harvest infrastructure design approved.',
    actHandoff: 'Access Paths & Harvest Infrastructure Design Package',
  }),
  obj({
    id: 'orch-s5-tree-protection',
    stratumId: 's5-system-design',
    ref: 'ORCH-S5.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design tree protection infrastructure',
    focusedQuestion:
      'How will establishing trees be protected from wildlife, rabbits, and stock - through the full establishment period?',
    checklist: [
      ck(
        'orch-s5-tree-protection-c1',
        'Specify tree guard type per threat - rabbit, hare, possum, deer, wallaby',
      ),
      ck(
        'orch-s5-tree-protection-c2',
        'Design installation method and staking system per guard type',
      ),
      ck(
        'orch-s5-tree-protection-c3',
        'Design temporary exclusion fencing for high-threat zones',
      ),
      ck(
        'orch-s5-tree-protection-c4',
        'Define guard removal schedule - when trees are established beyond threat',
      ),
      ck(
        'orch-s5-tree-protection-c5',
        'Specify browse-line protection for larger trees - spiral guards vs. mesh guards',
      ),
    ],
    completionGate:
      'Tree protection infrastructure design approved. All planting sites assigned protection type.',
    actHandoff: 'Tree Protection Infrastructure Design Package',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'orch-s6-phenological-monitoring',
    stratumId: 's6-integration-design',
    ref: 'ORCH-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design phenological monitoring protocol',
    focusedQuestion:
      'How will bloom dates, frost events, harvest windows, and succession trajectory be tracked?',
    checklist: [
      ck(
        'orch-s6-phenological-monitoring-c1',
        'Define phenological calendar - bud break, bloom, fruitset, harvest per species',
      ),
      ck(
        'orch-s6-phenological-monitoring-c2',
        'Design frost event recording - date, temperature, affected species',
      ),
      ck(
        'orch-s6-phenological-monitoring-c3',
        'Define harvest window recording - first and last harvest date per variety per year',
      ),
      ck(
        'orch-s6-phenological-monitoring-c4',
        'Design succession trajectory assessment - canopy closure, layer development over time',
      ),
      ck(
        'orch-s6-phenological-monitoring-c5',
        'Confirm phenological data feeds variety selection and management decisions annually',
      ),
    ],
    completionGate:
      'Phenological monitoring protocol approved. Calendar and recording system confirmed.',
    actHandoff: 'Phenological Monitoring Protocol',
  }),
  obj({
    id: 'orch-s6-pest-disease-monitoring',
    stratumId: 's6-integration-design',
    ref: 'ORCH-S6.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design pest & disease monitoring protocol',
    focusedQuestion:
      'How will pest and disease pressure be monitored - with triggers for intervention before threshold is reached?',
    checklist: [
      ck(
        'orch-s6-pest-disease-monitoring-c1',
        'Define monitoring method per key pest - pheromone traps, visual inspection, beat tray',
      ),
      ck(
        'orch-s6-pest-disease-monitoring-c2',
        'Define monitoring frequency by season - weekly at peak pest pressure',
      ),
      ck(
        'orch-s6-pest-disease-monitoring-c3',
        'Define intervention threshold per pest and disease',
      ),
      ck(
        'orch-s6-pest-disease-monitoring-c4',
        'Design disease scouting protocol - visual inspection schedule by crop family',
      ),
      ck(
        'orch-s6-pest-disease-monitoring-c5',
        'Define record-keeping system - log of pressure, intervention, and outcome',
      ),
    ],
    completionGate:
      'Pest and disease monitoring protocol approved. Intervention thresholds defined.',
    actHandoff: 'Pest & Disease Monitoring Protocol',
  }),
  obj({
    id: 'orch-s6-adaptive-management',
    stratumId: 's6-integration-design',
    ref: 'ORCH-S6.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define adaptive management protocol',
    focusedQuestion:
      'How will annual monitoring data drive changes to species selection, succession management, and production strategy?',
    checklist: [
      ck(
        'orch-s6-adaptive-management-c1',
        'Define annual review process - phenological data, yield data, pest pressure, soil health reviewed together',
      ),
      ck(
        'orch-s6-adaptive-management-c2',
        'Define variety replacement triggers - what performance retires a variety',
      ),
      ck(
        'orch-s6-adaptive-management-c3',
        'Define species addition triggers - what succession stage justifies adding new species',
      ),
      ck(
        'orch-s6-adaptive-management-c4',
        'Define succession deviation response - what canopy or layer imbalance triggers intervention',
      ),
      ck(
        'orch-s6-adaptive-management-c5',
        'Document all management changes with year, trigger, and outcome',
      ),
    ],
    completionGate: 'Adaptive management protocol approved.',
    actHandoff: 'Adaptive Management Protocol',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'orch-s7-planting-establishment',
    stratumId: 's7-phasing-resourcing',
    ref: 'ORCH-S7.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define planting establishment sequence',
    focusedQuestion:
      'In what order will soil preparation, windbreaks, water, and trees be established - and what must precede planting?',
    checklist: [
      ck(
        'orch-s7-planting-establishment-c1',
        'Confirm soil improvement complete in all planting zones before tree arrival',
      ),
      ck(
        'orch-s7-planting-establishment-c2',
        'Confirm irrigation infrastructure installed and tested before trees arrive',
      ),
      ck(
        'orch-s7-planting-establishment-c3',
        'Confirm windbreak plantings in place or temporary wind protection installed before exposed plantings',
      ),
      ck(
        'orch-s7-planting-establishment-c4',
        'Confirm tree guards on-site before planting begins',
      ),
      ck(
        'orch-s7-planting-establishment-c5',
        'Define planting order by species - frost-hardy before frost-sensitive, canopy before understory',
      ),
    ],
    completionGate:
      'Planting establishment sequence approved. All prerequisite infrastructure confirmed before tree arrival.',
    actHandoff: 'Planting Establishment Sequence',
    scopeNotes:
      'Tree stock is often non-refundable. Do not accept delivery until soil, water, and protection infrastructure is confirmed ready.',
  }),
  obj({
    id: 'orch-s7-succession-plan',
    stratumId: 's7-phasing-resourcing',
    ref: 'ORCH-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define long-term succession management plan',
    focusedQuestion:
      'What are the 5, 10, and 25-year succession targets - and how will the system be guided toward them?',
    checklist: [
      ck(
        'orch-s7-succession-plan-c1',
        'Define Year 5 canopy closure and layer development target',
      ),
      ck(
        'orch-s7-succession-plan-c2',
        'Define Year 10 species composition and productivity target',
      ),
      ck(
        'orch-s7-succession-plan-c3',
        'Define Year 25 ecological and production state - climax or maintained productive stage',
      ),
      ck(
        'orch-s7-succession-plan-c4',
        'Define management interventions required at each stage',
      ),
      ck(
        'orch-s7-succession-plan-c5',
        'Define species exit and addition schedule across the succession timeline',
      ),
      ck(
        'orch-s7-succession-plan-c6',
        'Confirm long-term plan is consistent with steward capacity across timeline',
      ),
    ],
    completionGate:
      'Long-term succession management plan approved. 5, 10, and 25-year targets defined.',
    actHandoff: 'Long-Term Succession Management Plan',
  }),
  obj({
    id: 'orch-s7-financial-viability',
    stratumId: 's7-phasing-resourcing',
    ref: 'ORCH-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define enterprise financial viability plan',
    focusedQuestion:
      'What are the cash flow requirements through the pre-production years - and when does the system break even?',
    checklist: [
      ck(
        'orch-s7-financial-viability-c1',
        'Map production timeline per species - years to first harvest, full production',
      ),
      ck(
        'orch-s7-financial-viability-c2',
        'Estimate annual revenue at full production by species',
      ),
      ck(
        'orch-s7-financial-viability-c3',
        'Estimate establishment costs by year - labour, tree stock, irrigation, guards',
      ),
      ck(
        'orch-s7-financial-viability-c4',
        'Calculate cash flow gap through non-productive years - bridge strategy required',
      ),
      ck(
        'orch-s7-financial-viability-c5',
        'Define minimum viable commercial scale',
      ),
      ck(
        'orch-s7-financial-viability-c6',
        'Define break-even year at projected yield and price',
      ),
    ],
    completionGate:
      'Enterprise financial viability plan approved. Cash flow gap and bridge strategy confirmed.',
    actHandoff: 'Enterprise Financial Viability Plan',
  }),
];

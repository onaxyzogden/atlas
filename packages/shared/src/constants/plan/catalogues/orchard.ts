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

import type {
  PatchRecord,
  PlanStratumObjective,
} from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj, patch } from './authoring.js';

// Decision groups (Decision Groups Reference v1.0; OLOS spec 9.3-9.4) - AUTHORED
// under the 2026-05-31 extended override ("author meaningful labels"). The
// reference doc's Orchard / Food Forest section maps to a divergent objective set
// with generic placeholder groups, so every group here - label, item membership,
// observeFeeds - is authored editorially to partition each objective's checklist
// into 2-3 named decision scopes (full mutually-exclusive partition). The four
// secondary PatchRecords each inject one decision group (dgorch) partitioning the
// perennial items they fold into the shared universal water / soil / ecology /
// Phase-1 objectives; the resolver stamps sourceSecondaryId from secondaryTypeId.

const PRIMARY = 'orchard_food_forest' as const;
const SECONDARY = 'orchard_food_forest' as const;

export const ORCHARD_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'orch-s1-species-philosophy',
    stratumId: 's1-project-foundation',
    ref: 'ORCH-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear species selection philosophy & succession intent',
    shortTitle: 'Species selection philosophy & succession intent',
    focusedQuestion:
      'What ecological trajectory is being designed toward - and how does that determine species selection, layering, and management?',
    checklist: [
      ck(
        'orch-s1-species-philosophy-c1',
        'Define primary design intent - commercial orchard, homestead food forest, ecological food forest, or hybrid',
        { feeds: ['orch-s4-species-mix', 'orch-s4-succession-management'] },
      ),
      ck(
        'orch-s1-species-philosophy-c2',
        'Define succession trajectory - pioneer to climax, or maintained productive stage',
        { feeds: ['orch-s4-succession-management', 'orch-s7-succession-plan'] },
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
        'Document species philosophy as design constraint - all Stratum 4 species decisions evaluated against it',
        { feeds: ['orch-s4-species-mix'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s1-species-philosophy-dg1', 'Design intent & succession', ['orch-s1-species-philosophy-c1', 'orch-s1-species-philosophy-c2']),
      dg('orch-s1-species-philosophy-dg2', 'Layering & ecological function', ['orch-s1-species-philosophy-c3', 'orch-s1-species-philosophy-c4']),
      dg('orch-s1-species-philosophy-dg3', 'Design constraint', ['orch-s1-species-philosophy-c5']),
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
    title: 'A clear production & harvest intent',
    shortTitle: 'Production & harvest intent',
    focusedQuestion:
      'What is this system producing, for whom, and what does harvest and sales infrastructure need to support?',
    checklist: [
      ck(
        'orch-s1-production-intent-c1',
        'Define primary production intent - commercial sales, household supply, processing, or combination',
        { feeds: ['orch-s4-species-mix', 'orch-s7-financial-viability'] },
      ),
      ck(
        'orch-s1-production-intent-c2',
        'Identify species prioritised for commercial production vs. ecological function',
        { feeds: ['orch-s4-species-mix'] },
      ),
      ck(
        'orch-s1-production-intent-c3',
        'Define harvest scale and handling requirement',
        { feeds: ['orch-s5-access-harvest', 'orch-sec-s6-harvest-pathway'] },
      ),
      ck(
        'orch-s1-production-intent-c4',
        'Define sales channels if commercial - direct, wholesale, processing',
        { feeds: ['orch-s7-financial-viability'] },
      ),
      ck(
        'orch-s1-production-intent-c5',
        'Confirm production intent is achievable within steward capacity and site potential',
      ),
    ],
    decisionGroups: [
      dg('orch-s1-production-intent-dg1', 'Production intent & priorities', ['orch-s1-production-intent-c1', 'orch-s1-production-intent-c2']),
      dg('orch-s1-production-intent-dg2', 'Harvest & sales', ['orch-s1-production-intent-c3', 'orch-s1-production-intent-c4']),
      dg('orch-s1-production-intent-dg3', 'Capacity fit', ['orch-s1-production-intent-c5']),
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
    title: 'A sound provenance & sourcing strategy',
    shortTitle: 'Provenance & sourcing strategy',
    focusedQuestion:
      'Where will tree stock come from - and how far in advance must sourcing be secured?',
    checklist: [
      ck(
        'orch-s1-provenance-sourcing-c1',
        'Define rootstock selection by species - dwarfing, semi-dwarfing, standard relative to production intent',
        { feeds: ['orch-s4-species-mix', 'orch-sec-s4-species-pollination'] },
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
        { feeds: ['orch-s7-planting-establishment'] },
      ),
      ck(
        'orch-s1-provenance-sourcing-c5',
        'Define bare-root vs. pot-grown strategy per species',
      ),
      ck(
        'orch-s1-provenance-sourcing-c6',
        'Confirm all species are legally available in this jurisdiction - biosecurity restrictions',
        { feeds: ['orch-s4-species-mix', 's7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s1-provenance-sourcing-dg1', 'Rootstock & provenance', ['orch-s1-provenance-sourcing-c1', 'orch-s1-provenance-sourcing-c2']),
      dg('orch-s1-provenance-sourcing-dg2', 'Nursery & lead time', ['orch-s1-provenance-sourcing-c3', 'orch-s1-provenance-sourcing-c4']),
      dg('orch-s1-provenance-sourcing-dg3', 'Stock form & legality', ['orch-s1-provenance-sourcing-c5', 'orch-s1-provenance-sourcing-c6']),
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
    title: 'A clear read of tree cover & canopy condition',
    shortTitle: 'Tree cover & canopy condition',
    focusedQuestion:
      'What trees already exist - and how do they shape light availability, species selection, and succession trajectory?',
    checklist: [
      ck(
        'orch-s2-tree-cover-c1',
        'Inventory all existing trees - species, age, condition, production history',
        { feeds: ['orch-s4-species-mix', 'orch-s4-succession-management'] },
      ),
      ck(
        'orch-s2-tree-cover-c2',
        'Assess canopy cover and light transmission by zone',
        { feeds: ['orch-s5-planting-layout'] },
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
        { feeds: ['orch-s5-planting-layout'] },
      ),
      ck(
        'orch-s2-tree-cover-c6',
        'Assess existing guild species and understory composition',
        { feeds: ['orch-s4-guild-planting'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s2-tree-cover-dg1', 'Existing trees & canopy', ['orch-s2-tree-cover-c1', 'orch-s2-tree-cover-c2'], ['Vegetation & Succession']),
      dg('orch-s2-tree-cover-dg2', 'Integration & removal', ['orch-s2-tree-cover-c3', 'orch-s2-tree-cover-c4']),
      dg('orch-s2-tree-cover-dg3', 'Gaps & understory', ['orch-s2-tree-cover-c5', 'orch-s2-tree-cover-c6'], ['Vegetation & Succession']),
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
    title: 'A clear read of frost drainage & microclimate zones',
    shortTitle: 'Frost drainage & microclimate zones',
    focusedQuestion:
      'How does cold air move across this site - and which zones are most and least frost-prone?',
    checklist: [
      ck(
        'orch-s2-frost-drainage-c1',
        'Map cold air drainage paths from high ground to low points',
        { feeds: ['orch-s5-planting-layout'] },
      ),
      ck(
        'orch-s2-frost-drainage-c2',
        'Identify frost pocket zones - hollow ground, dam edges, wind shadow areas',
        { feeds: ['orch-s5-planting-layout', 's7-risk-register'] },
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
        { feeds: ['orch-s4-species-mix', 'orch-s5-planting-layout'] },
      ),
      ck(
        'orch-s2-frost-drainage-c6',
        'Confirm frost drainage findings against topographic survey',
      ),
    ],
    decisionGroups: [
      dg('orch-s2-frost-drainage-dg1', 'Cold air drainage & pockets', ['orch-s2-frost-drainage-c1', 'orch-s2-frost-drainage-c2'], ['Climate & Sectors']),
      dg('orch-s2-frost-drainage-dg2', 'Aspect & frost history', ['orch-s2-frost-drainage-c3', 'orch-s2-frost-drainage-c4'], ['Climate & Sectors']),
      dg('orch-s2-frost-drainage-dg3', 'Warm zones & confirmation', ['orch-s2-frost-drainage-c5', 'orch-s2-frost-drainage-c6']),
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
    title: 'A clear read of surrounding landscape & vectors',
    shortTitle: 'Surrounding landscape & vectors',
    focusedQuestion:
      'What neighbouring orchard practices, pest pressure, and contamination risks affect this system?',
    checklist: [
      ck(
        'orch-s2-landscape-context-c1',
        'Map surrounding land uses within 2km - particularly neighbouring orchards and spray programs',
        { feeds: ['orch-s5-tree-protection'] },
      ),
      ck(
        'orch-s2-landscape-context-c2',
        'Identify neighbouring spray regimes and their drift risk by wind direction',
        { feeds: ['orch-s4-pest-disease-management', 's7-risk-register'] },
      ),
      ck(
        'orch-s2-landscape-context-c3',
        'Assess pollination resources in surrounding landscape - wild bee habitat, neighbouring orchards',
        { feeds: ['orch-sec-s4-species-pollination'] },
      ),
      ck(
        'orch-s2-landscape-context-c4',
        'Assess drinking water catchment contamination risk',
      ),
      ck(
        'orch-s2-landscape-context-c5',
        'Identify landscape-scale pest and disease pressure sources - codling moth, fireblight',
        { feeds: ['orch-s4-pest-disease-management', 'orch-s6-pest-disease-monitoring'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s2-landscape-context-dg1', 'Neighbouring land & spray drift', ['orch-s2-landscape-context-c1', 'orch-s2-landscape-context-c2']),
      dg('orch-s2-landscape-context-dg2', 'Pollination & water risk', ['orch-s2-landscape-context-c3', 'orch-s2-landscape-context-c4']),
      dg('orch-s2-landscape-context-dg3', 'Pest & disease pressure', ['orch-s2-landscape-context-c5']),
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
    title: 'A clear read of soil depth & rootzone potential',
    shortTitle: 'Soil depth & rootzone potential',
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
        { feeds: ['orch-s5-planting-layout'] },
      ),
      ck(
        'orch-s3-rootzone-depth-c3',
        'Identify hardpan, clay pan, or rock layers that restrict rooting depth',
        { feeds: ['s5-soil-improvement'] },
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
        { feeds: ['s5-soil-improvement', 'orch-s5-planting-layout'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s3-rootzone-depth-dg1', 'Profile & depth mapping', ['orch-s3-rootzone-depth-c1', 'orch-s3-rootzone-depth-c2'], ['Soil']),
      dg('orch-s3-rootzone-depth-dg2', 'Restrictions & drainage', ['orch-s3-rootzone-depth-c3', 'orch-s3-rootzone-depth-c4'], ['Soil']),
      dg('orch-s3-rootzone-depth-dg3', 'Minimum depth & flagging', ['orch-s3-rootzone-depth-c5', 'orch-s3-rootzone-depth-c6']),
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
    title: 'A clear read of water availability & dry period',
    shortTitle: 'Water availability & dry period',
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
        { feeds: ['orch-s4-water-strategy', 'orch-s5-establishment-irrigation'] },
      ),
      ck(
        'orch-s3-water-availability-c3',
        'Calculate total irrigation demand at planned planting density',
        { feeds: ['orch-s4-water-strategy'] },
      ),
      ck(
        'orch-s3-water-availability-c4',
        'Define dry season length and its overlap with critical establishment windows',
      ),
      ck(
        'orch-s3-water-availability-c5',
        'Confirm water source can meet establishment demand - or define the gap',
        { feeds: ['orch-s4-water-strategy', 's7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s3-water-availability-dg1', 'Source yield & demand', ['orch-s3-water-availability-c1', 'orch-s3-water-availability-c2'], ['Water & Hydrology']),
      dg('orch-s3-water-availability-dg2', 'Total demand & dry season', ['orch-s3-water-availability-c3', 'orch-s3-water-availability-c4'], ['Water & Hydrology']),
      dg('orch-s3-water-availability-dg3', 'Gap confirmation', ['orch-s3-water-availability-c5'], ['Water & Hydrology']),
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
    title: 'A clear read of pest & disease pressure by species',
    shortTitle: 'Pest & disease pressure by species',
    focusedQuestion:
      'What pest and disease pressures exist for the intended species mix - and does the site history indicate elevated risk?',
    checklist: [
      ck(
        'orch-s3-pest-disease-pressure-c1',
        'Identify pest species relevant to intended fruit and nut crops - codling moth, leaf curler, aphids',
        { feeds: ['orch-s4-pest-disease-management', 'orch-s6-pest-disease-monitoring'] },
      ),
      ck(
        'orch-s3-pest-disease-pressure-c2',
        'Identify disease risks by crop family - fireblight for pome fruit, brown rot for stone fruit, black spot',
        { feeds: ['orch-s4-pest-disease-management'] },
      ),
      ck(
        'orch-s3-pest-disease-pressure-c3',
        'Assess soil-borne disease risk from site history - Phytophthora, Armillaria',
        { feeds: ['orch-s4-pest-disease-management', 's7-risk-register'] },
      ),
      ck(
        'orch-s3-pest-disease-pressure-c4',
        'Identify beneficial predator species that reduce pest pressure',
      ),
      ck(
        'orch-s3-pest-disease-pressure-c5',
        'Record any prior crop failures related to pest or disease at this location',
        { feeds: ['s7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s3-pest-disease-pressure-dg1', 'Pest & disease risks', ['orch-s3-pest-disease-pressure-c1', 'orch-s3-pest-disease-pressure-c2']),
      dg('orch-s3-pest-disease-pressure-dg2', 'Soil-borne & predators', ['orch-s3-pest-disease-pressure-c3', 'orch-s3-pest-disease-pressure-c4']),
      dg('orch-s3-pest-disease-pressure-dg3', 'Site history', ['orch-s3-pest-disease-pressure-c5']),
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
    title: 'A sound species mix & planting plan',
    shortTitle: 'Species mix & planting plan',
    focusedQuestion:
      'What species, in what layers, in what proportions - designed for the defined succession trajectory?',
    checklist: [
      ck(
        'orch-s4-species-mix-c1',
        'Define canopy species and their proportion of total planting',
        { feeds: ['orch-s5-planting-layout', 's7-phase1'] },
      ),
      ck(
        'orch-s4-species-mix-c2',
        'Define understory species - productive and ecological function',
        { feeds: ['orch-s5-guild-plan'] },
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
        { feeds: ['orch-s7-planting-establishment'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s4-species-mix-dg1', 'Canopy & understory', ['orch-s4-species-mix-c1', 'orch-s4-species-mix-c2'], ['Vegetation & Succession']),
      dg('orch-s4-species-mix-dg2', 'Shrub & ground layers', ['orch-s4-species-mix-c3', 'orch-s4-species-mix-c4'], ['Vegetation & Succession']),
      dg('orch-s4-species-mix-dg3', 'Pioneers, philosophy & availability', ['orch-s4-species-mix-c5', 'orch-s4-species-mix-c6', 'orch-s4-species-mix-c7']),
    ],
    completionGate:
      'Species mix and planting plan strategy approved. All species confirmed available.',
    actHandoff: 'Species Mix & Planting Plan Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Establishment survival rate by layer and species', frequency: 'first three seasons' },
        { metric: 'Layer fill -- canopy, understory, shrub, and ground cover gaining target proportion', frequency: 'per season' },
        { metric: 'Pioneer species vigor vs. plan in bare or degraded zones', frequency: 'per season' },
      ],
      triggers: [
        'Survival below target for a species -- review provenance, site match, replace from a nursery source',
        'A layer failing to fill -- reassess species choice or planting density for that layer',
        'Species mix drifting from the selection philosophy -- pause additions, re-confirm against design constraint',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'orch-s4-water-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'ORCH-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound water strategy for establishment & maturity',
    shortTitle: 'Water strategy for establishment & maturity',
    focusedQuestion:
      'How will trees receive sufficient water through the 3-5 year establishment window - and how will the system transition to rainfall dependence?',
    checklist: [
      ck(
        'orch-s4-water-strategy-c1',
        'Define drip irrigation layout for establishment period',
        { feeds: ['orch-s5-establishment-irrigation', 's5-water-infrastructure'] },
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
        { feeds: ['s6-monitoring', 's7-risk-register'] },
      ),
      ck(
        'orch-s4-water-strategy-c5',
        'Define permanent vs. temporary irrigation infrastructure',
        { feeds: ['orch-s5-establishment-irrigation', 's5-water-infrastructure'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s4-water-strategy-dg1', 'Establishment irrigation', ['orch-s4-water-strategy-c1', 'orch-s4-water-strategy-c2'], ['Water & Hydrology']),
      dg('orch-s4-water-strategy-dg2', 'Weaning & mature triggers', ['orch-s4-water-strategy-c3', 'orch-s4-water-strategy-c4'], ['Water & Hydrology']),
      dg('orch-s4-water-strategy-dg3', 'Infrastructure permanence', ['orch-s4-water-strategy-c5']),
    ],
    completionGate:
      'Establishment and maturity water strategy approved. Weaning schedule defined.',
    actHandoff: 'Establishment & Maturity Water Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Applied irrigation volume per tree vs. the planned frequency and volume by age', frequency: 'per watering cycle' },
        { metric: 'Tree water-stress signs -- wilting, leaf scorch, early drop', frequency: 'weekly through the dry season' },
        { metric: 'Weaning progress -- irrigation reduced on schedule as root systems establish', frequency: 'per season' },
      ],
      triggers: [
        'Water-stress signs during normal irrigation -- check emitters and supply line, then raise volume',
        'Drought threshold reached on a mature block -- activate supplemental irrigation trigger',
        'Weaning step shows decline -- pause the reduction, hold the prior irrigation level',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 'orch-s4-guild-planting',
    stratumId: 's4-foundation-decisions',
    ref: 'ORCH-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A coherent guild planting & companion species strategy',
    shortTitle: 'Guild planting & companion species strategy',
    focusedQuestion:
      'What companion species will be planted with trees - nitrogen fixers, dynamic accumulators, pest confusers, and ground covers?',
    checklist: [
      ck(
        'orch-s4-guild-planting-c1',
        'Define guild composition per tree species - companions that support health and productivity',
        { feeds: ['orch-s5-guild-plan'] },
      ),
      ck(
        'orch-s4-guild-planting-c2',
        'Select nitrogen-fixing species for each planting zone',
        { feeds: ['orch-s5-guild-plan', 's5-soil-improvement'] },
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
        { feeds: ['orch-s5-guild-plan'] },
      ),
      ck(
        'orch-s4-guild-planting-c6',
        'Confirm all guild species are consistent with succession intent',
      ),
    ],
    decisionGroups: [
      dg('orch-s4-guild-planting-dg1', 'Guild composition & N-fixers', ['orch-s4-guild-planting-c1', 'orch-s4-guild-planting-c2']),
      dg('orch-s4-guild-planting-dg2', 'Accumulators & pest confusers', ['orch-s4-guild-planting-c3', 'orch-s4-guild-planting-c4']),
      dg('orch-s4-guild-planting-dg3', 'Ground cover & succession fit', ['orch-s4-guild-planting-c5', 'orch-s4-guild-planting-c6']),
    ],
    completionGate:
      'Guild planting and companion species strategy approved.',
    actHandoff: 'Guild Planting & Companion Species Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Companion species establishment and survival within each tree guild', frequency: 'per season' },
        { metric: 'Ground cover coverage vs. plan -- living mulch closing or paths staying mulched', frequency: 'per season' },
        { metric: 'Nitrogen-fixer vigor and visible soil or tree-health response near each guild', frequency: 'per season' },
      ],
      triggers: [
        'A companion species failing to establish -- replace or substitute a better-matched companion',
        'Ground cover thinning to bare soil -- reseed or remulch before weed pressure builds',
        'A guild species outcompeting the tree -- prune back or relocate that companion',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'orch-s4-succession-management',
    stratumId: 's4-foundation-decisions',
    ref: 'ORCH-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound succession management strategy',
    shortTitle: 'Succession management strategy',
    focusedQuestion:
      'How will this system be guided from pioneer to productive to climax - and what management interventions shape that trajectory?',
    checklist: [
      ck(
        'orch-s4-succession-management-c1',
        'Define succession stage targets at 5, 10, and 25 years',
        { feeds: ['orch-s7-succession-plan'] },
      ),
      ck(
        'orch-s4-succession-management-c2',
        'Define management interventions at each stage - chop and drop, coppicing, thinning',
        { feeds: ['orch-s6-adaptive-management', 'orch-s7-succession-plan'] },
      ),
      ck(
        'orch-s4-succession-management-c3',
        'Define species removal or replacement triggers - when pioneer species are phased out',
      ),
      ck(
        'orch-s4-succession-management-c4',
        'Define canopy management approach - light penetration targets for productive understory',
        { feeds: ['orch-s5-planting-layout'] },
      ),
      ck(
        'orch-s4-succession-management-c5',
        'Define system maturity indicator - when management reduces to minimal intervention',
        { feeds: ['orch-s6-phenological-monitoring'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s4-succession-management-dg1', 'Stage targets & interventions', ['orch-s4-succession-management-c1', 'orch-s4-succession-management-c2']),
      dg('orch-s4-succession-management-dg2', 'Removal & canopy management', ['orch-s4-succession-management-c3', 'orch-s4-succession-management-c4']),
      dg('orch-s4-succession-management-dg3', 'Maturity indicator', ['orch-s4-succession-management-c5']),
    ],
    completionGate:
      'Succession management strategy approved. Stage targets and interventions defined.',
    actHandoff: 'Succession Management Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Succession stage progress against the 5, 10, and 25-year targets', frequency: 'annual' },
        { metric: 'Canopy light penetration vs. the target for a productive understory', frequency: 'per season' },
        { metric: 'Pioneer-species phase-out -- proportion retired on schedule', frequency: 'annual' },
      ],
      triggers: [
        'Stage target missed at a milestone year -- schedule the planned intervention (chop and drop, coppice, or thin)',
        'Understory light below target -- thin or prune the canopy to restore penetration',
        'A pioneer species overstaying its phase-out trigger -- remove or replace per the succession plan',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'orch-s4-pest-disease-management',
    stratumId: 's4-foundation-decisions',
    ref: 'ORCH-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound pest & disease management strategy',
    shortTitle: 'Pest & disease management strategy',
    focusedQuestion:
      'How will pests and diseases be managed - through variety selection, biological controls, and minimum-intervention practices?',
    checklist: [
      ck(
        'orch-s4-pest-disease-management-c1',
        'Define variety selection criteria - disease resistance as primary filter',
        { feeds: ['orch-sec-s6-perennial-care'] },
      ),
      ck(
        'orch-s4-pest-disease-management-c2',
        'Define biological control strategy - predator habitat, beneficial release if applicable',
        { feeds: ['orch-s6-pest-disease-monitoring'] },
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
        { feeds: ['orch-s6-pest-disease-monitoring', 's6-monitoring'] },
      ),
      ck(
        'orch-s4-pest-disease-management-c6',
        'Confirm all interventions are consistent with growing philosophy',
      ),
    ],
    decisionGroups: [
      dg('orch-s4-pest-disease-management-dg1', 'Variety & biological control', ['orch-s4-pest-disease-management-c1', 'orch-s4-pest-disease-management-c2']),
      dg('orch-s4-pest-disease-management-dg2', 'Spray & sanitation', ['orch-s4-pest-disease-management-c3', 'orch-s4-pest-disease-management-c4']),
      dg('orch-s4-pest-disease-management-dg3', 'Monitoring & philosophy fit', ['orch-s4-pest-disease-management-c5', 'orch-s4-pest-disease-management-c6']),
    ],
    completionGate:
      'Pest and disease management strategy approved. All interventions philosophy-consistent.',
    actHandoff: 'Pest & Disease Management Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Pest counts against the defined intervention thresholds', frequency: 'weekly at peak pressure' },
        { metric: 'Disease incidence by crop family -- fireblight, brown rot, black spot', frequency: 'per season' },
        { metric: 'Beneficial-predator presence and sanitation compliance -- fallen-fruit removal, pruning hygiene', frequency: 'per season' },
      ],
      triggers: [
        'Pest count crossing its threshold -- apply the defined response within the spray or biological program',
        'Disease symptoms appearing -- isolate affected trees, remove infected material, review variety resistance',
        'Predator population collapsing -- reduce intervention pressure, restore beneficial habitat',
      ],
      feeds: 'plants-food',
    },
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'orch-s5-planting-layout',
    stratumId: 's5-system-design',
    ref: 'ORCH-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear tree planting layout & species placement',
    shortTitle: 'Tree planting layout & species placement',
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
        { feeds: ['orch-s6-phenological-monitoring'] },
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
        { feeds: ['orch-s7-planting-establishment', 's7-phase1'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s5-planting-layout-dg1', 'Orientation & spacing', ['orch-s5-planting-layout-c1', 'orch-s5-planting-layout-c2']),
      dg('orch-s5-planting-layout-dg2', 'Species placement', ['orch-s5-planting-layout-c3', 'orch-s5-planting-layout-c4']),
      dg('orch-s5-planting-layout-dg3', 'Succession fit & map', ['orch-s5-planting-layout-c5', 'orch-s5-planting-layout-c6']),
    ],
    completionGate:
      'Tree planting layout approved. Planting map produced.',
    actHandoff: 'Tree Planting Layout & Species Placement Design',
    buildsOnDisplay:
      'Builds on the species mix and planting plan settled in the Stratum 4 species-mix decision.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Tree survival rate per species against the planting map', frequency: 'at the end of each establishment season' },
        { metric: 'Measured spacing and row alignment as planted versus the approved layout', frequency: 'at planting' },
        { metric: 'Canopy spread per species relative to expected growth for its age and rootstock', frequency: 'per season' },
      ],
      triggers: [
        'Survival rate below target in a planting zone -- inspect the zone for frost, drainage, or aspect mismatch and replant gaps',
        'Canopy crowding observed between rows ahead of schedule -- review spacing and plan early thinning or pruning for affected rows',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'orch-s5-guild-plan',
    stratumId: 's5-system-design',
    ref: 'ORCH-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A ready guild planting plan',
    shortTitle: 'Guild planting plan',
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
        { feeds: ['orch-s7-planting-establishment'] },
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
        { feeds: ['orch-s7-planting-establishment', 's7-phase1'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s5-guild-plan-dg1', 'Companion placement & sequence', ['orch-s5-guild-plan-c1', 'orch-s5-guild-plan-c2']),
      dg('orch-s5-guild-plan-dg2', 'Density & ground cover', ['orch-s5-guild-plan-c3', 'orch-s5-guild-plan-c4']),
      dg('orch-s5-guild-plan-dg3', 'Sourcing', ['orch-s5-guild-plan-c5']),
    ],
    completionGate: 'Guild planting plan approved. All species sourced.',
    actHandoff: 'Guild Planting Plan',
    buildsOnDisplay:
      'Builds on the guild planting and companion species strategy set in the Stratum 4 guild-planting decision.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Establishment rate of companion and ground-cover species within each guild radius', frequency: 'per season' },
        { metric: 'Ground-cover percent coverage achieved per zone against the planting target', frequency: 'per season' },
        { metric: 'Pioneer and support species vigor relative to the planting sequence stage', frequency: 'per season' },
      ],
      triggers: [
        'Guild companions failing to establish around a tree -- review planting timing and soil conditions and reseed or transplant',
        'Ground cover failing to close in a zone -- adjust seeding density or switch from seeding to transplanting for that zone',
      ],
      feeds: 'plants-food',
    },
    // Orchard-primary projects (which don't receive the additive secondary
    // `orch-sec-s5-guild-layout`) reach the Plan-stage multilayer guild
    // designer through this primary guild objective's REFERENCE section.
    legacyCardSectionId: 'plan-guild-builder',
  }),
  obj({
    id: 'orch-s5-establishment-irrigation',
    stratumId: 's5-system-design',
    ref: 'ORCH-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working establishment irrigation design',
    shortTitle: 'Establishment irrigation design',
    focusedQuestion:
      'How will the drip irrigation system be designed for the 3-5 year establishment window?',
    checklist: [
      ck(
        'orch-s5-establishment-irrigation-c1',
        'Design mainline and submain layout to all planting zones',
        { feeds: ['orch-s7-planting-establishment', 's7-phase1'] },
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
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'orch-s5-establishment-irrigation-c6',
        'Design for future extension as planting expands',
      ),
    ],
    decisionGroups: [
      dg('orch-s5-establishment-irrigation-dg1', 'Mainline & emitters', ['orch-s5-establishment-irrigation-c1', 'orch-s5-establishment-irrigation-c2'], ['Water & Hydrology']),
      dg('orch-s5-establishment-irrigation-dg2', 'Valves & filtration', ['orch-s5-establishment-irrigation-c3', 'orch-s5-establishment-irrigation-c4'], ['Water & Hydrology']),
      dg('orch-s5-establishment-irrigation-dg3', 'Materials & extension', ['orch-s5-establishment-irrigation-c5', 'orch-s5-establishment-irrigation-c6']),
    ],
    completionGate:
      'Establishment irrigation design approved. Coverage of all planted trees confirmed.',
    actHandoff: 'Establishment Irrigation Design Package',
    buildsOnDisplay:
      'Builds on the water strategy for establishment and maturity settled in the Stratum 4 water-strategy decision.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Emitter output rate per tree against the design specification', frequency: 'during each watering cycle' },
        { metric: 'System pressure at zone valves versus the regulated design pressure', frequency: 'per watering cycle' },
        { metric: 'Tree water-stress signs across each irrigation zone through the establishment window', frequency: 'weekly' },
      ],
      triggers: [
        'Emitter output drifting from spec or blocked emitters found -- flush lines, service filters, and replace failed emitters',
        'Water-stress signs concentrated in one zone -- check that zone valve, pressure regulation, and emitter count for that block',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 'orch-s5-access-harvest',
    stratumId: 's5-system-design',
    ref: 'ORCH-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed access paths & harvest infrastructure',
    shortTitle: 'Access paths & harvest infrastructure',
    focusedQuestion:
      'How will harvest access paths, picking stations, and pack-out infrastructure be designed?',
    checklist: [
      ck(
        'orch-s5-access-harvest-c1',
        'Design picking path width and surface between tree rows - equipment specific',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'orch-s5-access-harvest-c2',
        'Design picking stations and fruit collection points',
      ),
      ck(
        'orch-s5-access-harvest-c3',
        'Design pack-out staging - proximity to cool storage or pack shed',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'orch-s5-access-harvest-c4',
        'Design ladder and platform storage if applicable',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'orch-s5-access-harvest-c5',
        'Confirm all paths meet harvest vehicle specifications',
      ),
    ],
    decisionGroups: [
      dg('orch-s5-access-harvest-dg1', 'Picking paths & stations', ['orch-s5-access-harvest-c1', 'orch-s5-access-harvest-c2'], ['Infrastructure & Access']),
      dg('orch-s5-access-harvest-dg2', 'Pack-out & storage', ['orch-s5-access-harvest-c3', 'orch-s5-access-harvest-c4'], ['Infrastructure & Access']),
      dg('orch-s5-access-harvest-dg3', 'Vehicle spec confirmation', ['orch-s5-access-harvest-c5']),
    ],
    completionGate:
      'Access paths and harvest infrastructure design approved.',
    actHandoff: 'Access Paths & Harvest Infrastructure Design Package',
    monitoringProtocol: {
      indicators: [
        { metric: 'Picking-path passability for harvest equipment across all rows', frequency: 'during the harvest window' },
        { metric: 'Pack-out staging throughput from picking station to cool storage or pack shed', frequency: 'each harvest day' },
        { metric: 'Harvested fruit volume moved through the harvest infrastructure per established block', frequency: 'per season' },
      ],
      triggers: [
        'A picking path fails to pass the specified harvest vehicle -- regrade or resurface that path before the next harvest',
        'Pack-out staging congesting at peak harvest -- add collection points or relocate staging closer to cool storage',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'orch-s5-tree-protection',
    stratumId: 's5-system-design',
    ref: 'ORCH-S5.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Working tree protection infrastructure',
    shortTitle: 'Tree protection infrastructure',
    focusedQuestion:
      'How will establishing trees be protected from wildlife, rabbits, and stock - through the full establishment period?',
    checklist: [
      ck(
        'orch-s5-tree-protection-c1',
        'Specify tree guard type per threat - rabbit, hare, possum, deer, wallaby',
        { feeds: ['orch-s7-planting-establishment', 's7-resource-plan'] },
      ),
      ck(
        'orch-s5-tree-protection-c2',
        'Design installation method and staking system per guard type',
      ),
      ck(
        'orch-s5-tree-protection-c3',
        'Design temporary exclusion fencing for high-threat zones',
        { feeds: ['s7-phase1'] },
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
    decisionGroups: [
      dg('orch-s5-tree-protection-dg1', 'Guards & installation', ['orch-s5-tree-protection-c1', 'orch-s5-tree-protection-c2']),
      dg('orch-s5-tree-protection-dg2', 'Exclusion & removal', ['orch-s5-tree-protection-c3', 'orch-s5-tree-protection-c4']),
      dg('orch-s5-tree-protection-dg3', 'Browse-line protection', ['orch-s5-tree-protection-c5']),
    ],
    completionGate:
      'Tree protection infrastructure design approved. All planting sites assigned protection type.',
    actHandoff: 'Tree Protection Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the pest and disease management strategy set in the Stratum 4 pest-disease-management decision.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Browse and gnaw damage incidents per planting zone', frequency: 'since the last inspection' },
        { metric: 'Tree guard and stake integrity across all protected planting sites', frequency: 'per inspection' },
        { metric: 'Exclusion fencing condition around high-threat zones', frequency: 'per inspection' },
      ],
      triggers: [
        'Browse or gnaw damage appearing inside a protected zone -- inspect guards and fencing for that zone and repair or upgrade the protection type',
        'Trees established beyond threat in a zone -- action the guard removal schedule for that zone to free up reusable guards',
      ],
      feeds: 'plants-food',
    },
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'orch-s6-phenological-monitoring',
    stratumId: 's6-integration-design',
    ref: 'ORCH-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working phenological monitoring protocol',
    shortTitle: 'Phenological monitoring protocol',
    focusedQuestion:
      'How will bloom dates, frost events, harvest windows, and succession trajectory be tracked?',
    checklist: [
      ck(
        'orch-s6-phenological-monitoring-c1',
        'Define phenological calendar - bud break, bloom, fruitset, harvest per species',
        { feeds: ['s7-phase1'] },
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
        { feeds: ['orch-s7-succession-plan'] },
      ),
    ],
    decisionGroups: [
      dg('orch-s6-phenological-monitoring-dg1', 'Phenology & frost recording', ['orch-s6-phenological-monitoring-c1', 'orch-s6-phenological-monitoring-c2'], ['Climate & Sectors']),
      dg('orch-s6-phenological-monitoring-dg2', 'Harvest & succession tracking', ['orch-s6-phenological-monitoring-c3', 'orch-s6-phenological-monitoring-c4']),
      dg('orch-s6-phenological-monitoring-dg3', 'Feedback to decisions', ['orch-s6-phenological-monitoring-c5']),
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
    title: 'A working pest & disease monitoring protocol',
    shortTitle: 'Pest & disease monitoring protocol',
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
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'orch-s6-pest-disease-monitoring-c3',
        'Define intervention threshold per pest and disease',
        { feeds: ['s7-risk-register'] },
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
    decisionGroups: [
      dg('orch-s6-pest-disease-monitoring-dg1', 'Method & frequency', ['orch-s6-pest-disease-monitoring-c1', 'orch-s6-pest-disease-monitoring-c2']),
      dg('orch-s6-pest-disease-monitoring-dg2', 'Thresholds & scouting', ['orch-s6-pest-disease-monitoring-c3', 'orch-s6-pest-disease-monitoring-c4']),
      dg('orch-s6-pest-disease-monitoring-dg3', 'Record-keeping', ['orch-s6-pest-disease-monitoring-c5']),
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
    title: 'A sound adaptive management protocol',
    shortTitle: 'Adaptive management protocol',
    focusedQuestion:
      'How will annual monitoring data drive changes to species selection, succession management, and production strategy?',
    checklist: [
      ck(
        'orch-s6-adaptive-management-c1',
        'Define annual review process - phenological data, yield data, pest pressure, soil health reviewed together',
        { feeds: ['orch-s7-succession-plan'] },
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
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'orch-s6-adaptive-management-c5',
        'Document all management changes with year, trigger, and outcome',
      ),
    ],
    decisionGroups: [
      dg('orch-s6-adaptive-management-dg1', 'Annual review & variety triggers', ['orch-s6-adaptive-management-c1', 'orch-s6-adaptive-management-c2']),
      dg('orch-s6-adaptive-management-dg2', 'Species & succession triggers', ['orch-s6-adaptive-management-c3', 'orch-s6-adaptive-management-c4']),
      dg('orch-s6-adaptive-management-dg3', 'Documentation', ['orch-s6-adaptive-management-c5']),
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
    title: 'A sequenced planting establishment plan',
    shortTitle: 'Planting establishment plan',
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
    decisionGroups: [
      dg('orch-s7-planting-establishment-dg1', 'Soil & irrigation readiness', ['orch-s7-planting-establishment-c1', 'orch-s7-planting-establishment-c2'], ['Infrastructure & Access']),
      dg('orch-s7-planting-establishment-dg2', 'Wind & guard readiness', ['orch-s7-planting-establishment-c3', 'orch-s7-planting-establishment-c4']),
      dg('orch-s7-planting-establishment-dg3', 'Planting order', ['orch-s7-planting-establishment-c5']),
    ],
    completionGate:
      'Planting establishment sequence approved. All prerequisite infrastructure confirmed before tree arrival.',
    actHandoff: 'Planting Establishment Sequence',
    progressTracking: {
      milestones: [
        {
          metric: 'Soil / irrigation / wind / guard readiness confirmed before tree delivery is accepted',
          cadence: 'per planting zone, before delivery',
        },
        {
          metric: 'Planting order adherence (frost-hardy before frost-sensitive, canopy before understory)',
          cadence: 'during planting',
        },
      ],
    },
    scopeNotes:
      'Tree stock is often non-refundable. Do not accept delivery until soil, water, and protection infrastructure is confirmed ready.',
  }),
  obj({
    id: 'orch-s7-succession-plan',
    stratumId: 's7-phasing-resourcing',
    ref: 'ORCH-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear long-term succession management plan',
    shortTitle: 'Long-term succession management plan',
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
    decisionGroups: [
      dg('orch-s7-succession-plan-dg1', 'Year 5 & 10 targets', ['orch-s7-succession-plan-c1', 'orch-s7-succession-plan-c2']),
      dg('orch-s7-succession-plan-dg2', 'Year 25 & interventions', ['orch-s7-succession-plan-c3', 'orch-s7-succession-plan-c4']),
      dg('orch-s7-succession-plan-dg3', 'Species schedule & capacity', ['orch-s7-succession-plan-c5', 'orch-s7-succession-plan-c6']),
    ],
    completionGate:
      'Long-term succession management plan approved. 5, 10, and 25-year targets defined.',
    actHandoff: 'Long-Term Succession Management Plan',
    progressTracking: {
      milestones: [
        {
          metric: 'Canopy + species composition vs. Year 5 / 10 / 25 targets',
          cadence: 'per succession review',
        },
        {
          metric: 'Stage management interventions executed vs. succession plan',
          cadence: 'per defined stage',
        },
      ],
    },
  }),
  obj({
    id: 'orch-s7-financial-viability',
    stratumId: 's7-phasing-resourcing',
    ref: 'ORCH-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound enterprise financial viability plan',
    shortTitle: 'Enterprise financial viability plan',
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
    decisionGroups: [
      dg('orch-s7-financial-viability-dg1', 'Production timeline & revenue', ['orch-s7-financial-viability-c1', 'orch-s7-financial-viability-c2']),
      dg('orch-s7-financial-viability-dg2', 'Costs & cash flow gap', ['orch-s7-financial-viability-c3', 'orch-s7-financial-viability-c4']),
      dg('orch-s7-financial-viability-dg3', 'Scale & break-even', ['orch-s7-financial-viability-c5', 'orch-s7-financial-viability-c6']),
    ],
    completionGate:
      'Enterprise financial viability plan approved. Cash flow gap and bridge strategy confirmed.',
    actHandoff: 'Enterprise Financial Viability Plan',
    progressTracking: {
      milestones: [
        {
          metric: 'Cash-flow gap vs. bridge strategy through non-productive years',
          cadence: 'quarterly',
        },
        {
          metric: 'Revenue vs. projection by species, once production begins',
          cadence: 'annual at harvest',
        },
        { metric: 'Break-even progress vs. projected break-even year', cadence: 'annual' },
      ],
    },
  }),
];

// ===========================================================================
// ORCHARD / FOOD FOREST SECONDARY-LAYER OBJECTIVES (derived)
//
// When orchard_food_forest is selected as a SECONDARY on a non-orchard primary
// (e.g. a regenerative farm or ecovillage adding a food-forest element), these
// objectives layer the perennial tree-crop concerns the host primary lacks.
// No operator source doc exists; this layer is a derivation under the operator's
// scoped 2026-05-31 directive ("Orchard secondary (derive)") and chosen depth
// (5 additive + 4 universal patches incl. pollinator) - the same scoped-derive
// pattern used for the Wellness and Silvopasture secondaries.
//
// Refs use the .20+ band (ORCH PRIMARY maxes at S*.8) so they never collide with
// the primary layer. The ref NUMBER tracks the canonical stratum NUMBER. stratumId
// drives placement; ref is label-only (regex-validated). source: 'secondary',
// sourceTypeId: 'orchard_food_forest', secondaryClass: 'additive' on every entry.
//
// Amanah Gate: ordinary perennial food production and its sale. The harvest
// objective scopes the market destination as halal with no riba/gharar; no
// advance-sale / CSRA / financial-product content. Clean.
// ===========================================================================
export const ORCHARD_SECONDARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'orch-sec-s2-climate-chill-fit',
    stratumId: 's2-land-reading',
    ref: 'ORCH-S2.20',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A clear read of climate & chill-hour fit',
    shortTitle: 'Climate & chill-hour fit',
    focusedQuestion:
      'Does the site climate actually suit the intended fruit and nut species - chill hours, frost windows, summer heat, and hardiness zone?',
    checklist: [
      ck(
        'orch-sec-s2-climate-chill-fit-c1',
        'Estimate site chill-hour accumulation and compare against each intended species requirement',
        { feeds: ['orch-s4-species-mix', 'orch-sec-s4-species-pollination'] },
      ),
      ck(
        'orch-sec-s2-climate-chill-fit-c2',
        'Map bloom-period frost risk - late frost against early-flowering species',
        { feeds: ['orch-s5-planting-layout', 's7-risk-register'] },
      ),
      ck(
        'orch-sec-s2-climate-chill-fit-c3',
        'Confirm summer heat and hardiness zone are within tolerance for each species',
      ),
      ck(
        'orch-sec-s2-climate-chill-fit-c4',
        'Identify marginal species and define backup or lower-chill alternatives',
      ),
      ck(
        'orch-sec-s2-climate-chill-fit-c5',
        'Record the climate-matched species shortlist as a constraint on later selection',
        { feeds: ['orch-s4-species-mix', 'orch-sec-s4-species-pollination'] },
      ),
    ],
    decisionGroups: [
      dg('orch-sec-s2-climate-chill-fit-dg1', 'Chill & frost fit', ['orch-sec-s2-climate-chill-fit-c1', 'orch-sec-s2-climate-chill-fit-c2'], ['Climate & Sectors']),
      dg('orch-sec-s2-climate-chill-fit-dg2', 'Heat tolerance & alternatives', ['orch-sec-s2-climate-chill-fit-c3', 'orch-sec-s2-climate-chill-fit-c4'], ['Climate & Sectors']),
      dg('orch-sec-s2-climate-chill-fit-dg3', 'Shortlist constraint', ['orch-sec-s2-climate-chill-fit-c5']),
    ],
    completionGate:
      'Climate and chill-hour fit assessed for every intended species. Marginal species flagged with backups. Climate-matched shortlist recorded.',
    actHandoff: 'Climate & Chill-Hour Fit Assessment',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'orch-sec-s4-species-pollination',
    stratumId: 's4-foundation-decisions',
    ref: 'ORCH-S4.20',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'Settled cultivars, rootstocks & pollination partners',
    shortTitle: 'Cultivars, rootstocks & pollination partners',
    focusedQuestion:
      'Which cultivars and rootstocks will be planted, and are pollination partners and bloom overlap secured for fruit set?',
    checklist: [
      ck(
        'orch-sec-s4-species-pollination-c1',
        'Select cultivars per species against the climate-matched shortlist and production intent',
      ),
      ck(
        'orch-sec-s4-species-pollination-c2',
        'Select rootstock per species by vigor - which drives final spacing and density',
        { feeds: ['orch-s5-planting-layout', 'orch-sec-s5-guild-layout'] },
      ),
      ck(
        'orch-sec-s4-species-pollination-c3',
        'Define pollination groups and bloom-overlap partners for cross-pollinated species',
        { feeds: ['orch-s5-planting-layout'] },
      ),
      ck(
        'orch-sec-s4-species-pollination-c4',
        'Record which species are self-fertile and which require a compatible partner on site',
      ),
      ck(
        'orch-sec-s4-species-pollination-c5',
        'Confirm true-to-type planting-stock sourcing and lead time for each cultivar and rootstock',
        { feeds: ['orch-s7-planting-establishment'] },
      ),
    ],
    decisionGroups: [
      dg('orch-sec-s4-species-pollination-dg1', 'Cultivar & rootstock', ['orch-sec-s4-species-pollination-c1', 'orch-sec-s4-species-pollination-c2']),
      dg('orch-sec-s4-species-pollination-dg2', 'Pollination partners', ['orch-sec-s4-species-pollination-c3', 'orch-sec-s4-species-pollination-c4']),
      dg('orch-sec-s4-species-pollination-dg3', 'Stock sourcing', ['orch-sec-s4-species-pollination-c5']),
    ],
    completionGate:
      'Cultivar and rootstock selections approved. Pollination partners and bloom overlap secured. True-to-type stock sourcing confirmed.',
    actHandoff: 'Cultivar, Rootstock & Pollination Decision Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Fruit set rate per cross-pollinated species against expectation', frequency: 'per season' },
        { metric: 'Bloom-overlap timing between each species and its pollination partner', frequency: 'each season' },
        { metric: 'Pollinator activity in the canopy during the bloom window', frequency: 'during the bloom window' },
      ],
      triggers: [
        'Poor fruit set on a cross-pollinated species -- verify a compatible partner is present and blooming in overlap',
        'Bloom periods drifting apart between partners -- add or substitute a better-overlapping partner cultivar',
        'Low pollinator activity at bloom -- add insectary planting or managed hives near the affected block',
      ],
      feeds: 'ecology',
    },
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'orch-sec-s5-guild-layout',
    stratumId: 's5-system-design',
    ref: 'ORCH-S5.20',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A clear multilayer guild layout & spacing',
    shortTitle: 'Multilayer guild layout & spacing',
    focusedQuestion:
      'How are canopy, understory, and support species arranged in space and density, integrated with the host primary layout?',
    checklist: [
      ck(
        'orch-sec-s5-guild-layout-c1',
        'Set tree spacing and density from rootstock vigor and harvest-access needs',
      ),
      ck(
        'orch-sec-s5-guild-layout-c2',
        'Design the multilayer guild - canopy, understory, shrub, and ground layers per zone',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'orch-sec-s5-guild-layout-c3',
        'Place support species - nitrogen fixers and insectary plants - within each guild',
      ),
      ck(
        'orch-sec-s5-guild-layout-c4',
        'Check light competition - confirm understory receives adequate light at canopy maturity',
      ),
      ck(
        'orch-sec-s5-guild-layout-c5',
        'Integrate the layout with the host primary existing zones, access, and infrastructure',
        { feeds: ['s7-phase1', 's7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('orch-sec-s5-guild-layout-dg1', 'Spacing & multilayer guild', ['orch-sec-s5-guild-layout-c1', 'orch-sec-s5-guild-layout-c2'], ['Vegetation & Succession']),
      dg('orch-sec-s5-guild-layout-dg2', 'Support species & light', ['orch-sec-s5-guild-layout-c3', 'orch-sec-s5-guild-layout-c4']),
      dg('orch-sec-s5-guild-layout-dg3', 'Host integration', ['orch-sec-s5-guild-layout-c5']),
    ],
    completionGate:
      'Spaced multilayer guild layout drawn and integrated with the host design. Light competition resolved at maturity.',
    actHandoff: 'Guild Layout & Spacing Design Package',
    buildsOnDisplay:
      'Builds on the cultivar, rootstock, and pollination decisions whose rootstock vigor drives spacing and density in the Stratum 4 cultivars-rootstocks-pollination decision.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Tree spacing and density as planted against the rootstock-driven design per zone', frequency: 'at planting' },
        { metric: 'Understory light levels at the ground layer relative to canopy development', frequency: 'per season' },
        { metric: 'Support species establishment - nitrogen fixers and insectary plants - within each guild', frequency: 'per season' },
      ],
      triggers: [
        'Understory species declining under a maturing canopy -- review light competition and prune the canopy or substitute shade-tolerant understory',
        'Support species failing to establish in a guild -- reseed or transplant nitrogen fixers and insectary plants for that zone',
      ],
      feeds: 'plants-food',
    },
    // Surfaces the full 7-layer GuildSpatialBuilderCard (the Plan-stage
    // multilayer guild designer) in this objective's REFERENCE section.
    // This is the only valid home for the guild designer in the forward
    // (stratum-spine) IA, and the target of the Act → Plan deep-link
    // ("surface the Plan designer", not re-implement it in Act).
    legacyCardSectionId: 'plan-guild-builder',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'orch-sec-s6-perennial-care',
    stratumId: 's6-integration-design',
    ref: 'ORCH-S6.20',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A committed perennial pruning, training & IPM regime',
    shortTitle: 'Perennial pruning, training & IPM regime',
    focusedQuestion:
      'Is there a realistic, resourced recurring regime for pruning, training, thinning, and pest and disease care across the life of the system?',
    checklist: [
      ck(
        'orch-sec-s6-perennial-care-c1',
        'Define the pruning and training system per species and its annual cycle',
      ),
      ck(
        'orch-sec-s6-perennial-care-c2',
        'Define the integrated pest and disease management approach - monitoring, thresholds, and response',
      ),
      ck(
        'orch-sec-s6-perennial-care-c3',
        'Cost the seasonal-labor peaks - pruning, thinning, and harvest - against available capacity',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'orch-sec-s6-perennial-care-c4',
        'Address the skills and tools gap - training, contractors, or equipment required',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'orch-sec-s6-perennial-care-c5',
        'Confirm the recurring regime is committed and resourced before any trees are planted',
        { feeds: ['s7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('orch-sec-s6-perennial-care-dg1', 'Pruning & IPM regime', ['orch-sec-s6-perennial-care-c1', 'orch-sec-s6-perennial-care-c2']),
      dg('orch-sec-s6-perennial-care-dg2', 'Labour & skills', ['orch-sec-s6-perennial-care-c3', 'orch-sec-s6-perennial-care-c4']),
      dg('orch-sec-s6-perennial-care-dg3', 'Commitment gate', ['orch-sec-s6-perennial-care-c5']),
    ],
    completionGate:
      'A resourced recurring pruning, training, and IPM regime is committed, with seasonal-labor peaks costed and the skills gap addressed.',
    actHandoff: 'Perennial Care & IPM Commitment Brief',
  }),
  obj({
    id: 'orch-sec-s6-harvest-pathway',
    stratumId: 's6-integration-design',
    ref: 'ORCH-S6.21',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A clear harvest, storage & value-add pathway',
    shortTitle: 'Harvest, storage & value-add pathway',
    focusedQuestion:
      'How will the perennial yield be harvested, stored, and turned into use or income through a halal pathway?',
    checklist: [
      ck(
        'orch-sec-s6-harvest-pathway-c1',
        'Define harvest windows and expected yield ramp per species across establishment years',
        { feeds: ['orch-s7-financial-viability'] },
      ),
      ck(
        'orch-sec-s6-harvest-pathway-c2',
        'Define post-harvest handling and cold or dry storage appropriate to each crop',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'orch-sec-s6-harvest-pathway-c3',
        'Define processing and value-add options - dried, pressed, or preserved - where relevant',
      ),
      ck(
        'orch-sec-s6-harvest-pathway-c4',
        'Define the destination - subsistence, direct sale, or wholesale - as a halal pathway with no riba or gharar',
        { feeds: ['orch-s7-financial-viability'] },
      ),
      ck(
        'orch-sec-s6-harvest-pathway-c5',
        'Confirm the pathway is consistent with steward capacity and the production intent',
      ),
    ],
    decisionGroups: [
      dg('orch-sec-s6-harvest-pathway-dg1', 'Harvest & storage', ['orch-sec-s6-harvest-pathway-c1', 'orch-sec-s6-harvest-pathway-c2']),
      dg('orch-sec-s6-harvest-pathway-dg2', 'Value-add & destination', ['orch-sec-s6-harvest-pathway-c3', 'orch-sec-s6-harvest-pathway-c4']),
      dg('orch-sec-s6-harvest-pathway-dg3', 'Capacity fit', ['orch-sec-s6-harvest-pathway-c5']),
    ],
    completionGate:
      'A harvest-to-use-or-market pathway with storage and handling is planned. Destination confirmed as a halal pathway free of riba and gharar.',
    actHandoff: 'Harvest, Storage & Value-Add Pathway Brief',
  }),
];

// ---------------------------------------------------------------------------
// ORCHARD / FOOD FOREST SECONDARY PATCHES
//
// Inject perennial tree-crop items into the shared UNIVERSAL objectives so the
// orchard demand is folded into the whole-of-site water / soil / ecology / Phase-1
// decisions. The resolver looks targets up by id, concatenates gate amendments,
// and stamps each injected item with expandedBySecondaryId at apply time. All
// four target ids are real universal objectives -> zero skipped patches.
// ---------------------------------------------------------------------------
export const ORCHARD_SECONDARY_PATCHES: readonly PatchRecord[] = [
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's4-water-strategy',
    ref: 'ORCH>U-S4.2',
    injectedItems: [
      ck(
        's4-water-strategy-orch-1',
        'Add perennial establishment irrigation demand to the water balance - per-tree volume across the 3-5 year establishment window',
      ),
      ck(
        's4-water-strategy-orch-2',
        'Define drip or micro-irrigation to establishing trees and a weaning schedule toward rainfall dependence',
      ),
    ],
    injectedGroups: [
      dg('s4-water-strategy-dgorch1', 'Perennial establishment irrigation', ['s4-water-strategy-orch-1', 's4-water-strategy-orch-2'], ['Water & Hydrology']),
    ],
    completionGateAmendment:
      'Perennial establishment and drought-year irrigation demand are in the water balance, with a drip delivery and weaning schedule defined.',
    scopeNote:
      'Orchard secondary: tree crops need reliable establishment-years water before canopy maturity that the base primary may not account for.',
  }),
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's5-soil-improvement',
    ref: 'ORCH>U-S5.3',
    injectedItems: [
      ck(
        's5-soil-improvement-orch-1',
        'Define pre-plant deep soil preparation - decompaction and organic matter - per planting zone',
      ),
      ck(
        's5-soil-improvement-orch-2',
        'Define ongoing orchard-floor fertility - mulch rings, compost, and living mulch',
      ),
    ],
    injectedGroups: [
      dg('s5-soil-improvement-dgorch1', 'Pre-plant & floor fertility', ['s5-soil-improvement-orch-1', 's5-soil-improvement-orch-2'], ['Soil']),
    ],
    completionGateAmendment:
      'Pre-plant deep soil preparation and ongoing orchard-floor fertility are designed for every planting zone.',
    scopeNote:
      'Orchard secondary: perennial roots need deep pre-plant preparation and sustained floor fertility, not just annual-crop soil work.',
  }),
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's2-ecology',
    ref: 'ORCH>U-S2.3',
    injectedItems: [
      ck(
        's2-ecology-orch-1',
        'Baseline pollinator and beneficial-insect presence relevant to fruit and nut set',
      ),
      ck(
        's2-ecology-orch-2',
        'Plan insectary and flowering-understory provision to support pollination across the bloom window',
      ),
    ],
    injectedGroups: [
      dg('s2-ecology-dgorch1', 'Pollinator habitat & provision', ['s2-ecology-orch-1', 's2-ecology-orch-2'], ['Ecology & Habitat']),
    ],
    completionGateAmendment:
      'Pollinator and beneficial-insect habitat is baselined and an insectary or flowering-understory provision supports fruit and nut set.',
    scopeNote:
      'Orchard secondary: fruit and nut yield depends on pollination, so the ecology survey must read and provision for pollinator habitat.',
  }),
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's7-phase1',
    ref: 'ORCH>U-S7.1',
    injectedItems: [
      ck(
        's7-phase1-orch-1',
        'Add perennial tree and shrub stock with rootstock and spacing to the Phase 1 planting palette',
      ),
      ck(
        's7-phase1-orch-2',
        'Sequence a staged multi-year establishment with tree protection - guards, stakes, and mulch - at planting',
      ),
    ],
    injectedGroups: [
      dg('s7-phase1-dgorch1', 'Perennial planting & protection', ['s7-phase1-orch-1', 's7-phase1-orch-2'], ['Vegetation & Succession']),
    ],
    completionGateAmendment:
      'Phase 1 includes the perennial planting palette and a staged multi-year establishment with tree protection at planting.',
    scopeNote:
      'Orchard secondary: tree crops establish over years, not one season, so Phase 1 must stage planting and protection rather than treat it as a single event.',
  }),
];

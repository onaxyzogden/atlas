// catalogues/residential.ts
//
// Residential / Live-In Stewardship SECONDARY-type catalogue
// (OLOS Residential Secondary Layer Objective Catalogue v1.0).
//
// Residential is secondary-only (cannot be a primary). It contributes BOTH:
//   - 6 additive objectives are authored, but one (res-s3-water-quality) carries
//     excludedFromResolution (2026-06-16 Tier-2 restructure): its definition is
//     kept while its domestic-water/potability content is relocated into the
//     s3-hydrology + s3-soil patches below, so only 5 additive objectives resolve
//   - 6 patch records (inject checklist items into existing objectives + amend
//     their completion gates) - P0 on the regen primary, P1/P1b/P2/P3/P4 on
//     universal targets
// A (secondary, primary) pair can therefore be additive AND modifying at once.
//
// Patch targets: P1-P4 target Universal objectives (present in every project,
// so they always land). P0 targets the RegenFarm PRIMARY objective
// 'rf-s2-landscape-context' (RF-S2.6) - on a primary that lacks that objective
// the resolver skips it and records the skip (never throws).
//
// P0 provenance: the source catalogue's Stratum 2 section carries NO standalone
// objective - only a Note instructing that the primary's landscape vector
// survey explicitly cover drinking-water catchment contamination. The objective
// summary table (row "P0 | 1 - Land Reading | Patch -> Survey surrounding
// landscape context & vectors | Modifying | Checklist injection") lists it as a
// real patch, so it is encoded here as a single injected item lifted near-
// verbatim from that Note. No gate amendment (the Note prescribes none).
//
// Injected item id rubric: <targetObjId>-pres-<n> ("pres" = patch-residential),
// globally unique across the resolved set. The resolver stamps
// expandedBySecondaryId='residential' onto each injected item at apply time.
// Gate amendments are stored as standalone capitalised clauses; the resolver
// CONCATENATES them onto the target's completionGate (never replaces).
//
// Decision groups (Decision Groups Reference v1.0; spec section 9.3-9.4): the
// reference doc supplies no decision-group rows matching this catalogue's
// objectives. Per the 2026-05-31 EXTENDED operator override, the groups below -
// labels, item membership, AND observe-feed labels - are FULLY AUTHORED by
// Claude (not transcribed). Each additive objective has 2-4 groups forming a
// full mutually-exclusive partition of its checklist. Each patch also carries
// `injectedGroups`: an authored group bundling that patch's injected items, so
// the residential decisions appear as one attributed group on the target
// objective; the resolver stamps sourceSecondaryId='residential' at apply time
// (never authored inline). Authored-group ids follow <objId>-dg<n>;
// patch-injected-group ids follow <targetObjId>-dgres<n>.
//
// ASCII-only copy.

import type {
  PatchRecord,
  PlanStratumObjective,
} from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj, patch } from './authoring.js';

const SECONDARY = 'residential' as const;

/** New standalone objectives Residential adds to a project. */
export const RESIDENTIAL_ADDITIVE_OBJECTIVES: readonly PlanStratumObjective[] = [
  // 0.6 - Residential intent & household scope (Tier-0 restructure 2026-06-16).
  // Revised in place (id/ref unchanged): the household becomes a first-class
  // SCOPING object alongside the farm-enterprise layer. The kitchen garden and
  // resident-livestock allocation are scoped here at intent level (NOT designed
  // - that happens in Tiers 3-4 using this scope as input). prereqs ['s1-vision',
  // 's1-steward'] (doc: 0.6 requires 0.1 + 0.2 - residential scope is a
  // household decision against a declared intent and a constituted team); both
  // are UNIVERSAL ids -> invariant-safe. Feeds preserved verbatim (the residential
  // layer's downstream wiring is unchanged); only labels/scope copy were revised.
  obj({
    id: 'res-s1-household-needs',
    stratumId: 's1-project-foundation',
    ref: 'RES-S1.1',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    prerequisiteObjectiveIds: ['s1-vision', 's1-steward'],
    title: 'A defined residential intent & household scope',
    shortTitle: 'Residential intent & scope',
    focusedQuestion:
      'Who is living on this land, what does domestic life require, and how does the household relate to the farm enterprises?',
    checklist: [
      ck(
        'res-s1-household-needs-c1',
        'Identify all residents and their relationship to the project - family, colleagues, long-term, short-term',
        { feeds: ['res-s4-living-zone', 's7-resource-plan'] },
      ),
      ck(
        'res-s1-household-needs-c2',
        'Define the private living zone - what areas are reserved for residential use and off-limits to farm operations',
        { feeds: ['s4-water-strategy', 'res-s5-living-infrastructure', 'res-s6-self-sufficiency'] },
      ),
      ck(
        'res-s1-household-needs-c3',
        'Define household food provision goals - what the kitchen garden and resident livestock allocation must reliably supply',
        { feeds: ['res-s6-self-sufficiency', 's7-phase1'] },
      ),
      ck(
        'res-s1-household-needs-c4',
        'Establish domestic infrastructure requirements - water, energy, waste management, shelter, domestic storage',
        { feeds: ['res-s5-living-infrastructure', 'res-s7-phasing'] },
      ),
      ck(
        'res-s1-household-needs-c5',
        'Define the operational boundary between residential life and farm enterprise - where they overlap and where they are separated',
        { feeds: ['res-s7-phasing', 's7-phase1'] },
      ),
      ck(
        'res-s1-household-needs-c6',
        'Establish household decision-making scope - what decisions belong to the household vs. the farm enterprise governance structure',
        { feeds: ['res-s6-self-sufficiency'] },
      ),
    ],
    decisionGroups: [
      dg('res-s1-household-needs-dg1', 'Residents & living scope', [
        'res-s1-household-needs-c1',
        'res-s1-household-needs-c2',
        'res-s1-household-needs-c3',
      ]),
      dg('res-s1-household-needs-dg2', 'Infrastructure & boundaries', [
        'res-s1-household-needs-c4',
        'res-s1-household-needs-c5',
        'res-s1-household-needs-c6',
      ]),
    ],
    completionGate:
      'Residential intent defined. Household scope, domestic provision goals, private living zone, and domestic infrastructure requirements documented. Household decision scope distinguished from farm enterprise scope.',
    actHandoff: 'Residential Intent & Household Scope Brief',
  }),
  obj({
    id: 'res-s3-water-quality',
    stratumId: 's3-systems-reading',
    ref: 'RES-S3.2',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    // 2026-06-16 Tier-2 (Stratum-3) Reception restructure: domestic water is no
    // longer a standalone Systems-Reading survey. Its reception content is
    // RELOCATED into the residential patches on the shared universal surveys -
    // supply/reliability/water-table + a condensed potability & treatment group
    // on s3-hydrology (RES>U-S3.1), and subsurface/drainage on s3-soil
    // (RES>U-S3.2). This full definition is PRESERVED (not deleted): the seeded
    // protocol map keys res2-dwelling-water-safety on this id and Act handoffs
    // stay valid, and the granular per-vector testing here remains the
    // authoritative source if a later pass re-enables the standalone survey.
    excludedFromResolution: true,
    title: 'A clear read of domestic water quality & potability',
    shortTitle: 'Domestic water quality & potability',
    focusedQuestion:
      'Given landscape vector findings, is the available water safe for drinking, cooking, and bathing - and what treatment is required?',
    scopeNotes:
      'Connects directly to Stratum 2 landscape vector findings. Run source-specific tests against identified contamination vectors - not a generic water test.',
    checklist: [
      ck(
        'res-s3-water-quality-c1',
        'Test all drinking and cooking water sources for biological contamination - bacteria, pathogens, parasites',
        { feeds: ['s4-water-strategy', 'res-s5-living-infrastructure'] },
      ),
      ck(
        'res-s3-water-quality-c2',
        'Test for chemical contamination relevant to landscape vector findings - herbicides, nitrates, heavy metals, petroleum',
        { feeds: ['s4-water-strategy', 's7-risk-register'] },
      ),
      ck(
        'res-s3-water-quality-c3',
        'Test for naturally occurring contaminants relevant to local geology - arsenic, fluoride, iron',
        { feeds: ['s4-water-strategy'] },
      ),
      ck(
        'res-s3-water-quality-c4',
        'Assess rainwater harvesting catchment surfaces for contamination risk',
        { feeds: ['s4-water-strategy', 's5-water-infrastructure'] },
      ),
      ck('res-s3-water-quality-c5', 'Record seasonal variation in water quality', {
        feeds: ['s6-monitoring'],
      }),
      ck(
        'res-s3-water-quality-c6',
        'Define potability status for each source - drinking, cooking, bathing, irrigation, animal use only',
        { feeds: ['s4-water-strategy', 'res-s5-living-infrastructure'] },
      ),
      ck(
        'res-s3-water-quality-c7',
        'Define treatment requirements for each source to reach intended use standard',
        { feeds: ['s5-water-infrastructure', 'res-s5-living-infrastructure'] },
      ),
    ],
    decisionGroups: [
      dg(
        'res-s3-water-quality-dg1',
        'Contamination testing',
        [
          'res-s3-water-quality-c1',
          'res-s3-water-quality-c2',
          'res-s3-water-quality-c3',
          'res-s3-water-quality-c4',
        ],
        ['Water & Hydrology'],
      ),
      dg(
        'res-s3-water-quality-dg2',
        'Potability & treatment',
        [
          'res-s3-water-quality-c5',
          'res-s3-water-quality-c6',
          'res-s3-water-quality-c7',
        ],
        ['Water & Hydrology'],
      ),
    ],
    completionGate:
      'Water quality assessment complete for all sources. Potability status and treatment requirements defined.',
    actHandoff: 'Domestic Water Quality Report',
  }),
  obj({
    id: 'res-s4-living-zone',
    stratumId: 's4-foundation-decisions',
    ref: 'RES-S4.3',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A clear domestic living zone & privacy strategy',
    shortTitle: 'Domestic living zone & privacy strategy',
    focusedQuestion:
      'Where does private household life happen on this working land, and how is it protected from operational activity, visitors, and noise?',
    checklist: [
      ck('res-s4-living-zone-c1', 'Define domestic living zone boundary on zone framework map', {
        feeds: ['s5-access', 'res-s5-living-infrastructure', 's7-phase1'],
      }),
      ck(
        'res-s4-living-zone-c2',
        'Specify privacy gradient from living zone to working zones - buffer distance, screening, acoustic separation',
        { feeds: ['s5-access'] },
      ),
      ck(
        'res-s4-living-zone-c3',
        'Define access control to living zone - who can enter, under what conditions',
        { feeds: ['s5-access'] },
      ),
      ck(
        'res-s4-living-zone-c4',
        'Resolve conflict between living zone and any visitor or public access zones',
        { feeds: ['s5-access', 's7-risk-register'] },
      ),
      ck(
        'res-s4-living-zone-c5',
        'Define domestic zone requirements that constrain enterprise placement - noise exclusion zones, chemical buffer distances',
        { feeds: ['s5-access', 's7-risk-register'] },
      ),
      ck(
        'res-s4-living-zone-c6',
        'Confirm living zone placement is safe from operational hazards - machinery routes, chemical storage, livestock',
        { feeds: ['s7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('res-s4-living-zone-dg1', 'Zone & privacy', [
        'res-s4-living-zone-c1',
        'res-s4-living-zone-c2',
        'res-s4-living-zone-c3',
      ]),
      dg('res-s4-living-zone-dg2', 'Conflict & safety', [
        'res-s4-living-zone-c4',
        'res-s4-living-zone-c5',
        'res-s4-living-zone-c6',
      ]),
    ],
    completionGate:
      'Domestic living zone defined and privacy strategy approved. All conflicts with visitor or operational zones resolved.',
    actHandoff: 'Domestic Living Zone & Privacy Strategy Brief',
    monitoringProtocol: {
      indicators: [
        'Privacy buffer integrity between living zone and working zones (quarterly walk-through)',
        'Recorded incursions of operational activity into the living zone (log per occurrence)',
        'Access-control adherence at the living-zone boundary (quarterly review)',
      ],
      triggers: [
        'Repeated operational incursion into the living zone -> formalize physical boundary marker or screening',
        'Noise or chemical buffer breached by enterprise placement -> review zone allocation and exclusion distances',
      ],
      feeds: 'Residential Zone monitoring stream',
    },
  }),
  obj({
    id: 'res-s5-living-infrastructure',
    stratumId: 's5-system-design',
    ref: 'RES-S5.4',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'Well-designed domestic living infrastructure',
    shortTitle: 'Domestic living infrastructure',
    focusedQuestion:
      'How will the dwelling, domestic utilities, and household systems be designed to meet the residential needs and resilience strategy?',
    checklist: [
      ck(
        'res-s5-living-infrastructure-c1',
        'Assess existing dwelling condition - structural, weather-tight, insulation, ventilation',
        { feeds: ['s7-phase1', 'res-s7-phasing'] },
      ),
      ck(
        'res-s5-living-infrastructure-c2',
        'Specify required dwelling repairs or improvements before habitation',
        { feeds: ['res-s7-phasing', 's7-resource-plan'] },
      ),
      ck(
        'res-s5-living-infrastructure-c3',
        'Design domestic heating system - wood stove, passive solar, heat pump, or hybrid',
        { feeds: ['s7-resource-plan', 'res-s7-phasing'] },
      ),
      ck(
        'res-s5-living-infrastructure-c4',
        'Design domestic power system - grid connection, solar, battery, generator backup',
        { feeds: ['s7-resource-plan', 'res-s7-phasing'] },
      ),
      ck(
        'res-s5-living-infrastructure-c5',
        'Design domestic water delivery - pump, gravity feed, pressure system, filtration and treatment',
        { feeds: ['s7-resource-plan', 'res-s7-phasing'] },
      ),
      ck(
        'res-s5-living-infrastructure-c6',
        'Design grey water reuse system where permitted - garden irrigation, constructed wetland',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'res-s5-living-infrastructure-c7',
        'Design domestic waste management - composting toilet, septic, worm farm, recycling',
        { feeds: ['s7-resource-plan', 's7-risk-register'] },
      ),
      ck(
        'res-s5-living-infrastructure-c8',
        'Specify communications infrastructure - internet, phone, emergency communications',
        { feeds: ['res-s7-phasing', 's7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg(
        'res-s5-living-infrastructure-dg1',
        'Dwelling fabric',
        ['res-s5-living-infrastructure-c1', 'res-s5-living-infrastructure-c2'],
        ['Infrastructure & Access'],
      ),
      dg(
        'res-s5-living-infrastructure-dg2',
        'Energy & climate systems',
        ['res-s5-living-infrastructure-c3', 'res-s5-living-infrastructure-c4'],
        ['Infrastructure & Access'],
      ),
      dg(
        'res-s5-living-infrastructure-dg3',
        'Water & waste systems',
        [
          'res-s5-living-infrastructure-c5',
          'res-s5-living-infrastructure-c6',
          'res-s5-living-infrastructure-c7',
        ],
        ['Infrastructure & Access'],
      ),
      dg(
        'res-s5-living-infrastructure-dg4',
        'Communications',
        ['res-s5-living-infrastructure-c8'],
        ['Infrastructure & Access'],
      ),
    ],
    completionGate:
      'Domestic living infrastructure design approved. All dwelling, utility, and household system components specified.',
    actHandoff: 'Domestic Living Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on 3.7 -- Living zone (household zone definition), Survey 1.1 -- Terrain & dwelling siting, and Survey 2.2 -- Soil & water for domestic supply.',
    monitoringProtocol: {
      indicators: [
        'Domestic water supply vs household consumption (storage drawdown, refill interval)',
        'Kitchen garden yield vs household provision targets (by season)',
        'Domestic energy output vs household demand (generation vs draw)',
        'Household-farm boundary adherence (domestic vs operational use staying separated as designed)',
      ],
      triggers: [
        'Domestic water approaching supply limit -> review storage, rationing, or additional catchment',
        'Kitchen garden yield below provision targets -> review beds, inputs, or revise the provision plan',
      ],
      feeds: 'Residential Systems monitoring stream',
    },
  }),
  obj({
    id: 'res-s6-self-sufficiency',
    stratumId: 's6-integration-design',
    ref: 'RES-S6.5',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A working household self-sufficiency feedback loop',
    shortTitle: 'Household self-sufficiency feedback loop',
    focusedQuestion:
      'How will the household track what it grows vs. buys - and use that to improve provision decisions each season?',
    scopeNotes:
      'Feedback loop only works if the Stratum 1 household needs baseline was honestly recorded. Confirm that connection before gating.',
    checklist: [
      ck(
        'res-s6-self-sufficiency-c1',
        'Design provision tracking system - record what was grown, preserved, and consumed from the land each season',
        { feeds: ['s7-resource-plan', 's7-phase1'] },
      ),
      ck(
        'res-s6-self-sufficiency-c2',
        'Design gap tracking - record what was still purchased externally and at what cost',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'res-s6-self-sufficiency-c3',
        'Connect tracking to Stratum 1 residential household needs - measure provision gap reduction against baseline',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'res-s6-self-sufficiency-c4',
        'Define seasonal review rhythm - when does the household assess progress and adjust',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'res-s6-self-sufficiency-c5',
        'Specify record format - simple enough to maintain consistently alongside working the land',
        { feeds: ['s7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('res-s6-self-sufficiency-dg1', 'Provision & gap tracking', [
        'res-s6-self-sufficiency-c1',
        'res-s6-self-sufficiency-c2',
        'res-s6-self-sufficiency-c3',
      ]),
      dg('res-s6-self-sufficiency-dg2', 'Review rhythm & format', [
        'res-s6-self-sufficiency-c4',
        'res-s6-self-sufficiency-c5',
      ]),
    ],
    completionGate:
      'Household self-sufficiency feedback loop designed. Provision and gap tracking systems approved. Connects to Stratum 1 household needs baseline.',
    actHandoff: 'Household Self-Sufficiency Feedback System',
  }),
  obj({
    id: 'res-s7-phasing',
    stratumId: 's7-phasing-resourcing',
    ref: 'RES-S7.6',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A sequenced residential phasing & establishment plan',
    shortTitle: 'Residential phasing & establishment plan',
    focusedQuestion:
      'In what sequence will domestic infrastructure be established - and what must be in place before the household moves on-site?',
    scopeNotes:
      'The habitability threshold is a hard gate - not an aspiration. The household should not move on-site before it is met. Define it specifically: potable water confirmed, weather-tight shelter confirmed, heating system operational, emergency communications in place.',
    checklist: [
      ck(
        'res-s7-phasing-c1',
        'Define minimum habitability threshold - the exact conditions required before the household moves on-site',
      ),
      ck(
        'res-s7-phasing-c2',
        'Sequence domestic infrastructure installation against land enterprise establishment',
      ),
      ck(
        'res-s7-phasing-c3',
        'Define temporary arrangements during establishment - where the household will live during the build phase',
      ),
      ck(
        'res-s7-phasing-c4',
        'Specify domestic infrastructure installation timeline relative to Phase 1 implementation plan',
      ),
      ck(
        'res-s7-phasing-c5',
        'Define go/no-go criteria for moving on-site - what must be complete, tested, and confirmed',
      ),
    ],
    decisionGroups: [
      dg('res-s7-phasing-dg1', 'Habitability & sequencing', [
        'res-s7-phasing-c1',
        'res-s7-phasing-c2',
        'res-s7-phasing-c4',
      ]),
      dg('res-s7-phasing-dg2', 'Transition & go/no-go', [
        'res-s7-phasing-c3',
        'res-s7-phasing-c5',
      ]),
    ],
    completionGate:
      'Residential phasing plan approved. Habitability threshold defined. Move-on-site go/no-go criteria confirmed.',
    actHandoff: 'Residential Phasing & Domestic Establishment Plan',
  }),
];

/** Patch records Residential applies to existing universal / primary objectives. */
export const RESIDENTIAL_PATCHES: readonly PatchRecord[] = [
  // P0 - Stratum 2 Note -> patch on the primary's landscape-context survey.
  // Targets a RegenFarm PRIMARY objective; skipped+recorded on primaries lacking it.
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 'rf-s2-landscape-context',
    ref: 'RES>RF-S2.6',
    injectedItems: [
      ck(
        'rf-s2-landscape-context-pres-1',
        'Ensure the landscape vector survey checklist explicitly covers drinking water catchment contamination risk relevant to domestic living',
      ),
    ],
    injectedGroups: [
      dg(
        'rf-s2-landscape-context-dgres1',
        'Domestic water catchment',
        ['rf-s2-landscape-context-pres-1'],
        ['Water & Hydrology'],
      ),
    ],
    scopeNote:
      'Residential Stratum 2 has no standalone objective - the primary landscape vector survey must explicitly cover drinking-water catchment contamination.',
  }),
  // ---- Tier-1 (Stratum-2) Land-Reading restructure 2026-06-16 --------------
  // Four Residential/Live-In deltas folded into the shared Land-Reading surveys
  // so the first reception tier reads the land through the household-to-house
  // lens (spec 1.1/1.2/1.3/1.4 Residential patch blocks). All four target
  // UNIVERSAL surveys (always present). Observations of candidate habitation
  // zones against existing land and assets only; no capital or sale surface.
  // 1.1 Terrain & topography
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's2-terrain',
    ref: 'RES>U-S2.1',
    injectedItems: [
      ck(
        's2-terrain-pres-1',
        'Identify candidate habitation zones - southerly solar aspect, topographic shelter on north and west, natural drainage away from footprint, accessible without crossing livestock or enterprise zones',
      ),
      ck(
        's2-terrain-pres-2',
        'Map slope gradients in candidate habitation zones for dwelling foundation and drainage planning',
      ),
      ck(
        's2-terrain-pres-3',
        'Note existing natural windbreaks near candidate zones - woodland, hedgerows, topographic features',
      ),
    ],
    injectedGroups: [
      dg(
        's2-terrain-dgres1',
        'Candidate habitation zones',
        ['s2-terrain-pres-1', 's2-terrain-pres-2', 's2-terrain-pres-3'],
        ['Terrain & Topography'],
      ),
    ],
    completionGateAmendment:
      'Candidate habitation zones identified with solar aspect, slope gradient, natural drainage, and windbreak data.',
    scopeNote:
      'Residential secondary: terrain is read for where a dwelling can sit well - aspect, shelter, drainage, and access that does not cross enterprise zones. Observation only.',
  }),
  // 1.2 Climate & sectors
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's2-climate',
    ref: 'RES>U-S2.2',
    injectedItems: [
      ck(
        's2-climate-pres-1',
        'Note wind exposure at each candidate habitation zone across seasons',
      ),
      ck(
        's2-climate-pres-2',
        'Identify existing or potential wind protection for candidate zones - topographic, structural, or vegetative',
      ),
      ck(
        's2-climate-pres-3',
        'Record solar access quality at candidate zones - obstructions, shading periods, orientation quality',
      ),
    ],
    injectedGroups: [
      dg(
        's2-climate-dgres1',
        'Habitation zone climate',
        ['s2-climate-pres-1', 's2-climate-pres-2', 's2-climate-pres-3'],
        ['Climate & Sectors'],
      ),
    ],
    completionGateAmendment:
      'Candidate habitation zone climate conditions recorded - wind exposure, wind protection, and solar access quality.',
    scopeNote:
      'Residential secondary: wind and solar conditions at candidate habitation zones determine how exposed or sheltered each dwelling site is across seasons. Observation only.',
  }),
  // 1.3 Existing ecology & habitat
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's2-ecology',
    ref: 'RES>U-S2.3',
    injectedItems: [
      ck(
        's2-ecology-pres-1',
        'Note ecological conditions near candidate habitation zones that affect liveability - wildlife attractants (rodents, insects), proximity to spray or dust sources from enterprise zones',
      ),
      ck(
        's2-ecology-pres-2',
        'Record any seasonal habitat features near candidate zones that may require management - seasonal flooding indicators, dense understorey near dwelling footprint',
      ),
    ],
    injectedGroups: [
      dg(
        's2-ecology-dgres1',
        'Habitation zone liveability ecology',
        ['s2-ecology-pres-1', 's2-ecology-pres-2'],
        ['Ecology & Habitat'],
      ),
    ],
    completionGateAmendment:
      'Habitation zone ecological conditions recorded - liveability attractants and seasonal habitat features near the dwelling footprint.',
    scopeNote:
      'Residential secondary: ecology near candidate zones is read for liveability - attractants, spray/dust proximity, and seasonal features near the dwelling footprint. Observation only.',
  }),
  // 1.4 Existing infrastructure & access
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's2-infrastructure',
    ref: 'RES>U-S2.4',
    injectedItems: [
      ck(
        's2-infrastructure-pres-1',
        'Survey existing structures for residential conversion potential - floor area, insulation state, structural condition, orientation, and proximity to domestic services',
      ),
      ck(
        's2-infrastructure-pres-2',
        'Assess vehicle access to candidate habitation zones - suitability for family vehicles, turning space, grade, surface condition',
      ),
      ck(
        's2-infrastructure-pres-3',
        'Map domestic service infrastructure relative to candidate habitation zones - sewage and septic, power connection, water mains or bore, communications - and note cost and feasibility of extending to each candidate zone',
      ),
    ],
    injectedGroups: [
      dg(
        's2-infrastructure-dgres1',
        'Residential conversion & domestic services',
        ['s2-infrastructure-pres-1', 's2-infrastructure-pres-2', 's2-infrastructure-pres-3'],
        ['Infrastructure & Access'],
      ),
    ],
    completionGateAmendment:
      'Residential conversion potential and domestic service infrastructure mapped relative to candidate habitation zones.',
    scopeNote:
      'Residential secondary: existing structures and services are read for conversion potential and the feasibility of extending domestic services to candidate zones. Observation of present assets only.',
  }),
  // P1 - Stratum 3 patch on universal hydrology survey (Residential 2.1).
  // Carries BOTH the spec 2.1 residential supply/reliability read AND the
  // condensed potability & treatment group relocated from the retired
  // res-s3-water-quality standalone (full granular testing preserved on that
  // definition). Domestic demand quantification now lives at S4 (P2 below).
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's3-hydrology',
    ref: 'RES>U-S3.1',
    injectedItems: [
      ck(
        's3-hydrology-pres-1',
        'Assess domestic water supply options at candidate habitation zones - bore/well yield, creek or dam reliability, mains connection feasibility',
      ),
      ck(
        's3-hydrology-pres-2',
        'Record seasonal variation in water availability - does each supply option hold through the driest months at usable volume and quality?',
      ),
      ck(
        's3-hydrology-pres-3',
        'Assess water table depth at candidate habitation zones - implications for dwelling subfloor, basement, septic system design, and shallow bore options',
      ),
      ck(
        's3-hydrology-pres-4',
        'Test domestic water sources against landscape contamination vectors - biological (bacteria, pathogens, parasites), chemical (herbicides, nitrates, heavy metals, petroleum), and naturally-occurring (arsenic, fluoride, iron) contaminants',
      ),
      ck(
        's3-hydrology-pres-5',
        'Define potability status for each source by intended use - drinking, cooking, bathing, irrigation, or animal use only',
      ),
      ck(
        's3-hydrology-pres-6',
        'Define treatment requirements for each source to reach its intended-use standard',
      ),
    ],
    injectedGroups: [
      dg(
        's3-hydrology-dgres1',
        'Domestic water supply & reliability',
        ['s3-hydrology-pres-1', 's3-hydrology-pres-2', 's3-hydrology-pres-3'],
        ['Water & Hydrology'],
      ),
      dg(
        's3-hydrology-dgres2',
        'Domestic water quality & potability',
        ['s3-hydrology-pres-4', 's3-hydrology-pres-5', 's3-hydrology-pres-6'],
        ['Water & Hydrology'],
      ),
    ],
    completionGateAmendment:
      'Domestic water supply options assessed with seasonal reliability and water-table depth recorded; source potability status and treatment requirements defined for household use.',
  }),
  // P1b - Stratum 3 patch on universal soil survey (Residential 2.2).
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's3-soil',
    ref: 'RES>U-S3.2',
    injectedItems: [
      ck(
        's3-soil-pres-1',
        'Conduct subsurface assessment at candidate habitation zones - bearing capacity indicators, depth to rock or hardpan, consistency for foundation design',
      ),
      ck(
        's3-soil-pres-2',
        'Assess drainage capacity at candidate zones - percolation test or estimation for septic/drainage system feasibility',
      ),
      ck(
        's3-soil-pres-3',
        'Note any contamination risk indicators near existing structures - fuel or chemical storage history, old building materials, fill material origin',
      ),
    ],
    injectedGroups: [
      dg(
        's3-soil-dgres1',
        'Habitation subsurface & drainage',
        ['s3-soil-pres-1', 's3-soil-pres-2', 's3-soil-pres-3'],
        ['Soil'],
      ),
    ],
    completionGateAmendment:
      'Subsurface bearing, drainage/perc capacity, and structural contamination risk assessed at candidate habitation zones.',
  }),
  // P2 - Stratum 4 patch on universal water strategy.
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's4-water-strategy',
    ref: 'RES>U-S4.2',
    injectedItems: [
      ck(
        's4-water-strategy-pres-1',
        'Add domestic water demand to total demand assessment - drinking, cooking, bathing, laundry, garden',
      ),
      ck(
        's4-water-strategy-pres-2',
        'Confirm primary water source meets potability requirements for household use',
      ),
      ck(
        's4-water-strategy-pres-3',
        'Define grey water reuse strategy - kitchen and bathroom grey water for irrigation where permitted',
      ),
      ck(
        's4-water-strategy-pres-4',
        'Specify domestic hot water system - solar, gas, electric, wood-fired',
      ),
    ],
    injectedGroups: [
      dg(
        's4-water-strategy-dgres1',
        'Domestic water & grey water',
        [
          's4-water-strategy-pres-1',
          's4-water-strategy-pres-2',
          's4-water-strategy-pres-3',
          's4-water-strategy-pres-4',
        ],
        ['Water & Hydrology'],
      ),
    ],
    completionGateAmendment:
      'Potable supply confirmed for domestic use, grey water strategy defined.',
  }),
  // P3 - Stratum 4 patch on universal spatial framework & zones.
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's4-zones',
    ref: 'RES>U-S4.3',
    injectedItems: [
      ck('s4-zones-pres-1', 'Allocate domestic living zone on zone framework map'),
      ck(
        's4-zones-pres-2',
        'Define buffer zones between living zone and working enterprises - noise, smell, chemical use',
      ),
      ck(
        's4-zones-pres-3',
        'Define privacy screening requirements between living zone and any visitor access areas',
      ),
    ],
    injectedGroups: [
      dg('s4-zones-dgres1', 'Domestic living zone', [
        's4-zones-pres-1',
        's4-zones-pres-2',
        's4-zones-pres-3',
      ]),
    ],
    completionGateAmendment:
      'Domestic living zone allocated without conflict with enterprise or visitor zones.',
  }),
  // P4 - Stratum 5 patch on universal water harvesting & storage infrastructure.
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's5-water-infrastructure',
    ref: 'RES>U-S5.2',
    injectedItems: [
      ck(
        's5-water-infrastructure-pres-1',
        'Add potable water treatment system to infrastructure design - filtration, UV, chlorination as required',
      ),
      ck(
        's5-water-infrastructure-pres-2',
        'Add domestic pressure system to distribution network design',
      ),
      ck(
        's5-water-infrastructure-pres-3',
        'Integrate grey water collection and reuse infrastructure with water distribution design',
      ),
      ck(
        's5-water-infrastructure-pres-4',
        'Specify domestic hot water system infrastructure - tank, solar collectors, backup',
      ),
    ],
    injectedGroups: [
      dg(
        's5-water-infrastructure-dgres1',
        'Domestic water systems',
        [
          's5-water-infrastructure-pres-1',
          's5-water-infrastructure-pres-2',
          's5-water-infrastructure-pres-3',
          's5-water-infrastructure-pres-4',
        ],
        ['Water & Hydrology'],
      ),
    ],
    completionGateAmendment:
      'Potable water treatment system specified, domestic distribution confirmed.',
  }),
  // P5 - Stratum 5 patch on universal access & circulation design (Tier 4 4.1
  // residential-access delta): a domestic access route distinct from farm traffic.
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's5-access',
    ref: 'RES>U-S5.1',
    injectedItems: [
      ck(
        's5-access-pres-1',
        'Design residential access route - separate from main farm traffic where practical; suitable for family vehicles including school run, deliveries, and emergency access',
      ),
      ck(
        's5-access-pres-2',
        'Define the separation between residential entry and farm operational entry where they differ - signage, gates, or distinct approach',
      ),
    ],
    injectedGroups: [
      dg(
        's5-access-dgres1',
        'Domestic access & entry',
        ['s5-access-pres-1', 's5-access-pres-2'],
        ['Infrastructure & Access'],
      ),
    ],
    completionGateAmendment:
      'Residential access route designed and separated from farm operational traffic where practical.',
  }),
];

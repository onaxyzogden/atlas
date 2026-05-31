// catalogues/residential.ts
//
// Residential / Live-In Stewardship SECONDARY-type catalogue
// (OLOS Residential Secondary Layer Objective Catalogue v1.0).
//
// Residential is secondary-only (cannot be a primary). It contributes BOTH:
//   - 6 additive objectives (new standalone objectives, one per tier 0/2/3/4/5/6)
//   - 5 patch records (inject checklist items into existing objectives + amend
//     their completion gates)
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
  obj({
    id: 'res-s1-household-needs',
    stratumId: 's1-project-foundation',
    ref: 'RES-S1.1',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'Define residential household needs & domestic provision priorities',
    focusedQuestion:
      'What does the household living on this land need for daily domestic life - food, shelter, warmth, water, connectivity - and how will those needs be met?',
    checklist: [
      ck(
        'res-s1-household-needs-c1',
        'Define who will be living on the land - household members, dependents, seasonal residents',
      ),
      ck(
        'res-s1-household-needs-c2',
        'List daily domestic needs - drinking water, cooking, sanitation, heating, power, communications',
      ),
      ck(
        'res-s1-household-needs-c3',
        'Define food provision intent - what proportion of household food will come from the land',
      ),
      ck(
        'res-s1-household-needs-c4',
        'Identify domestic infrastructure required before the land is habitable - dwelling condition, utilities',
      ),
      ck(
        'res-s1-household-needs-c5',
        'Define minimum habitability threshold - what must be in place before the household moves on-site',
      ),
      ck(
        'res-s1-household-needs-c6',
        'Record domestic needs that will always be sourced externally',
      ),
    ],
    decisionGroups: [
      dg('res-s1-household-needs-dg1', 'Household & daily needs', [
        'res-s1-household-needs-c1',
        'res-s1-household-needs-c2',
        'res-s1-household-needs-c3',
      ]),
      dg('res-s1-household-needs-dg2', 'Habitability requirements', [
        'res-s1-household-needs-c4',
        'res-s1-household-needs-c5',
        'res-s1-household-needs-c6',
      ]),
    ],
    completionGate:
      'Residential household needs defined. Minimum habitability threshold confirmed before Act begins.',
    actHandoff: 'Residential Household Needs Brief',
  }),
  obj({
    id: 'res-s3-water-quality',
    stratumId: 's3-systems-reading',
    ref: 'RES-S3.2',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'Survey domestic water quality & potability',
    focusedQuestion:
      'Given landscape vector findings, is the available water safe for drinking, cooking, and bathing - and what treatment is required?',
    scopeNotes:
      'Connects directly to Stratum 2 landscape vector findings. Run source-specific tests against identified contamination vectors - not a generic water test.',
    checklist: [
      ck(
        'res-s3-water-quality-c1',
        'Test all drinking and cooking water sources for biological contamination - bacteria, pathogens, parasites',
      ),
      ck(
        'res-s3-water-quality-c2',
        'Test for chemical contamination relevant to landscape vector findings - herbicides, nitrates, heavy metals, petroleum',
      ),
      ck(
        'res-s3-water-quality-c3',
        'Test for naturally occurring contaminants relevant to local geology - arsenic, fluoride, iron',
      ),
      ck(
        'res-s3-water-quality-c4',
        'Assess rainwater harvesting catchment surfaces for contamination risk',
      ),
      ck('res-s3-water-quality-c5', 'Record seasonal variation in water quality'),
      ck(
        'res-s3-water-quality-c6',
        'Define potability status for each source - drinking, cooking, bathing, irrigation, animal use only',
      ),
      ck(
        'res-s3-water-quality-c7',
        'Define treatment requirements for each source to reach intended use standard',
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
    title: 'Define domestic living zone & privacy strategy',
    focusedQuestion:
      'Where does private household life happen on this working land, and how is it protected from operational activity, visitors, and noise?',
    checklist: [
      ck('res-s4-living-zone-c1', 'Define domestic living zone boundary on zone framework map'),
      ck(
        'res-s4-living-zone-c2',
        'Specify privacy gradient from living zone to working zones - buffer distance, screening, acoustic separation',
      ),
      ck(
        'res-s4-living-zone-c3',
        'Define access control to living zone - who can enter, under what conditions',
      ),
      ck(
        'res-s4-living-zone-c4',
        'Resolve conflict between living zone and any visitor or public access zones',
      ),
      ck(
        'res-s4-living-zone-c5',
        'Define domestic zone requirements that constrain enterprise placement - noise exclusion zones, chemical buffer distances',
      ),
      ck(
        'res-s4-living-zone-c6',
        'Confirm living zone placement is safe from operational hazards - machinery routes, chemical storage, livestock',
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
  }),
  obj({
    id: 'res-s5-living-infrastructure',
    stratumId: 's5-system-design',
    ref: 'RES-S5.4',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'Design domestic living infrastructure',
    focusedQuestion:
      'How will the dwelling, domestic utilities, and household systems be designed to meet the residential needs and resilience strategy?',
    checklist: [
      ck(
        'res-s5-living-infrastructure-c1',
        'Assess existing dwelling condition - structural, weather-tight, insulation, ventilation',
      ),
      ck(
        'res-s5-living-infrastructure-c2',
        'Specify required dwelling repairs or improvements before habitation',
      ),
      ck(
        'res-s5-living-infrastructure-c3',
        'Design domestic heating system - wood stove, passive solar, heat pump, or hybrid',
      ),
      ck(
        'res-s5-living-infrastructure-c4',
        'Design domestic power system - grid connection, solar, battery, generator backup',
      ),
      ck(
        'res-s5-living-infrastructure-c5',
        'Design domestic water delivery - pump, gravity feed, pressure system, filtration and treatment',
      ),
      ck(
        'res-s5-living-infrastructure-c6',
        'Design grey water reuse system where permitted - garden irrigation, constructed wetland',
      ),
      ck(
        'res-s5-living-infrastructure-c7',
        'Design domestic waste management - composting toilet, septic, worm farm, recycling',
      ),
      ck(
        'res-s5-living-infrastructure-c8',
        'Specify communications infrastructure - internet, phone, emergency communications',
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
  }),
  obj({
    id: 'res-s6-self-sufficiency',
    stratumId: 's6-integration-design',
    ref: 'RES-S6.5',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'Design household self-sufficiency feedback loop',
    focusedQuestion:
      'How will the household track what it grows vs. buys - and use that to improve provision decisions each season?',
    scopeNotes:
      'Feedback loop only works if the Stratum 1 household needs baseline was honestly recorded. Confirm that connection before gating.',
    checklist: [
      ck(
        'res-s6-self-sufficiency-c1',
        'Design provision tracking system - record what was grown, preserved, and consumed from the land each season',
      ),
      ck(
        'res-s6-self-sufficiency-c2',
        'Design gap tracking - record what was still purchased externally and at what cost',
      ),
      ck(
        'res-s6-self-sufficiency-c3',
        'Connect tracking to Stratum 1 residential household needs - measure provision gap reduction against baseline',
      ),
      ck(
        'res-s6-self-sufficiency-c4',
        'Define seasonal review rhythm - when does the household assess progress and adjust',
      ),
      ck(
        'res-s6-self-sufficiency-c5',
        'Specify record format - simple enough to maintain consistently alongside working the land',
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
    title: 'Define residential phasing & domestic establishment plan',
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
  // P1 - Stratum 3 patch on universal hydrology survey.
  patch({
    secondaryTypeId: SECONDARY,
    targetObjectiveId: 's3-hydrology',
    ref: 'RES>U-S3.1',
    injectedItems: [
      ck(
        's3-hydrology-pres-1',
        'Assess domestic water demand - daily household consumption including drinking, cooking, bathing, laundry',
      ),
      ck(
        's3-hydrology-pres-2',
        'Confirm water source yield is sufficient for combined domestic and productive demand',
      ),
    ],
    injectedGroups: [
      dg(
        's3-hydrology-dgres1',
        'Domestic water demand',
        ['s3-hydrology-pres-1', 's3-hydrology-pres-2'],
        ['Water & Hydrology'],
      ),
    ],
    completionGateAmendment: 'Domestic water demand confirmed against available yield.',
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
];

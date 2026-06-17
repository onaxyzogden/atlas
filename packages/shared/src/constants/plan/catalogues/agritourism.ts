// catalogues/agritourism.ts
//
// Agritourism / Retreat / Experience Destination PRIMARY-type objectives - the
// 34 type-specific objectives an Agritourism project adds on top of the 19
// Universal objectives (OLOS Agritourism / Retreat Objective Catalogue). 29 are
// from the v1.0 source catalogue; 5 (the eco-resort / glamping extension) were
// added 2026-06-03 - see the Extension note below.
//
// This file holds ONLY the primary-layer objectives. The universal slot lives
// in ./universal.ts (the shared baseline).
//
// Primary-only note: the source header table lists the role as "Primary or
// Secondary", and projectTypes.ts marks agritourism canBeSecondary: true. BUT
// this catalogue document contains only a primary-layer catalogue (19 universal
// references + 34 standalone primary objectives) - there is no secondary-layer
// section, no additive-as-secondary objectives, and no patch records. So
// agritourism is registered in getPrimaryCatalogue only, exactly like
// regenFarm / ecovillage. Its can-be-secondary capability would be exercised by
// a SEPARATE Agritourism-secondary-layer spec (additive objectives + patches
// targeting another primary), which is not in hand. We do not invent one.
//
// Count note: 19 universal + 34 primary = 53 total. The original v1.0 source
// catalogue carried 29 primary (per-tier 3+4+4+5+5+4+4 = 29), index with NO
// duplicate refs. The 2026-06-03 eco-resort / glamping extension adds 5 (per-tier
// delta S3 +1, S4 +1, S5 +2, S7 +1), bringing the encoded primary count to 34
// (3+4+5+6+7+4+5). New refs: AG-S3.7, AG-S4.9, AG-S5.9, AG-S5.10, AG-S7.8.
//
// Extension note (2026-06-03, eco-resort / glamping): rather than add a separate
// eco_resort project type (which would near-duplicate agritourism), the operator
// ratified extending this catalogue with 5 additive objectives capturing the
// dispersed-accommodation / nature-immersion differentiators agritourism lacked:
// ecological carrying capacity under visitor load (AG-S3.7), guest-to-production
// biosecurity buffers (AG-S4.9), dispersed low-impact siting (AG-S5.9),
// decentralised servicing + dark-sky / quiet (AG-S5.10), and seasonal-occupancy
// resilience (AG-S7.8). Each carries a conditional scopeNote so plain day-visit
// agritourism is not over-scoped (education EDU-S4.7 / S5.7 precedent). No new
// sales surface; bookings remain the ratified service-reservation model. Hybrid-
// sourced via docs/catalogues/eco-resort-glamping-agritourism-extension-draft.md.
//
// Membership / season-pass note (2026-06-03): AG-S4.8 (the revenue model) was
// extended IN PLACE with 5 fiqh-gated checklist items (c7-c11) + 2 decision
// groups + an Amanah scopeNote, realising the membership / season-pass
// instrument AG-S7.8 deferred. Structured as a membership benefit (entitlement
// of belonging, cancellable / refundable - not advance prepayment of undelivered
// nights, which would be bay` ma laysa `indak / gharar), required to carry
// genuine non-stay substance, bounded by AG-S3.7 carrying capacity, and routed
// to Scholar Council review. No new objective / ref (count stays 34); operator-
// ratified. Hybrid-sourced via
// docs/catalogues/agritourism-membership-instrument-draft.md.
//
// Version note: the source file is named "...v1.1" but the document body states
// "v1.0" throughout (Authored to Catalogue Authoring Standards v1.3). Encoded as
// the v1.0 content the body specifies; the filename/body skew is flagged here.
//
// Checklist-length note: AG-S6.4 (Design farm-to-guest integration feedback
// loop) carries only 4 checklist items in the v1.0 / Standards v1.3 source,
// below the v1.4 5-item floor. Originally encoded verbatim at 4 behind a rubric-
// test allowlist (flagged as an operator review item). RESOLVED 2026-05-30: the
// operator issued an explicit informed override of "don't invent content" for
// this single objective, authorising an authored 5th item (ag-s6-food-
// integration-c5, the loop-closing seasonal review step); the objective now
// meets the v1.4 floor and the allowlist entry was removed.
//
// Economic objectives AG-S4.8 (booking, pricing & revenue model) and AG-S7.6
// (phased launch & financial viability plan) are encoded verbatim as plain data
// per the operator's informed 2026-05-29 "encode verbatim, no gating"
// authorisation. Their content is hospitality booking / pricing / occupancy /
// break-even framing (a guest pays to reserve a future stay or experience - a
// service reservation), not advance sale of future agricultural yield.
//
// source: 'primary', sourceTypeId: 'agritourism' on every objective.
// Refs follow Authoring Standards (AG-T<tier>.<n>). ASCII-only copy:
// em/en dashes -> " - "; curly quotes -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj } from './authoring.js';

// Decision groups (Decision Groups Reference v1.0; OLOS spec 9.3-9.4) — AUTHORED
// under the 2026-05-31 extended override. The reference doc's Agritourism (AT)
// section enumerates a different, older objective set (placeholder groups
// "Primary decisions / Secondary considerations -> Multiple" for type-specific
// rows, on AT.S refs that do not map to this v1.3 catalogue's AG-S refs/titles).
// Per the operator's "author meaningful labels" ruling, every group here -
// label, item membership, and observeFeeds - is authored editorially to
// partition each objective's checklist into 1-3 named decision scopes (full
// mutually-exclusive partition). Universal-objective groups live in universal.ts
// (the RF-anchored set); this file carries only the agritourism primary layer.

const PRIMARY = 'agritourism' as const;

export const AGRITOURISM_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'ag-s1-experience-vision',
    stratumId: 's1-project-foundation',
    ref: 'AG-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear visitor experience vision & commercial model',
    shortTitle: 'Visitor experience vision & commercial model',
    focusedQuestion:
      "What do guests experience here, what do they pay for, and what is the farm's hospitality identity?",
    checklist: [
      ck(
        'ag-s1-experience-vision-c1',
        'Define the core guest experience in plain language - what makes this farm distinct',
        { feeds: ['ag-s4-circulation-strategy', 'ag-s4-service-model'] },
      ),
      ck(
        'ag-s1-experience-vision-c2',
        'Identify visitor types - day visitors, overnight guests, retreat participants, school groups',
        { feeds: ['ag-s4-service-model', 's5-access'] },
      ),
      ck(
        'ag-s1-experience-vision-c3',
        'Define the commercial proposition - what is offered and at what price point',
        { feeds: ['ag-s4-revenue-model', 's7-resource-plan'] },
      ),
      ck(
        'ag-s1-experience-vision-c4',
        "Define the farm's hospitality identity - authentic farm stay, luxury retreat, educational experience",
      ),
      ck(
        'ag-s1-experience-vision-c5',
        'Confirm the commercial model is achievable within steward capacity',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s1-experience-vision-c6',
        'Record what will never be compromised for commercial gain',
        { feeds: ['s7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s1-experience-vision-dg1', 'Experience & proposition', [
        'ag-s1-experience-vision-c1',
        'ag-s1-experience-vision-c2',
        'ag-s1-experience-vision-c3',
      ]),
      dg('ag-s1-experience-vision-dg2', 'Identity & capacity guardrails', [
        'ag-s1-experience-vision-c4',
        'ag-s1-experience-vision-c5',
        'ag-s1-experience-vision-c6',
      ]),
    ],
    completionGate:
      'Visitor experience vision and commercial model approved. Hospitality identity confirmed.',
    actHandoff: 'Visitor Experience Vision & Commercial Model Brief',
  }),
  obj({
    id: 'ag-s1-visitor-capacity',
    stratumId: 's1-project-foundation',
    ref: 'AG-S1.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear visitor capacity & operational boundary',
    shortTitle: 'Visitor capacity & operational boundary',
    focusedQuestion:
      'How many guests can this farm host at any one time - and what operational constraints define that limit?',
    checklist: [
      ck(
        'ag-s1-visitor-capacity-c1',
        'Define maximum simultaneous guest capacity - accommodation, dining, programming',
        { feeds: ['ag-s4-revenue-model', 'ag-s5-accommodation'] },
      ),
      ck(
        'ag-s1-visitor-capacity-c2',
        'Define visit type limits - maximum day visitors, overnight guests, event attendees',
        { feeds: ['ag-s7-booking-system'] },
      ),
      ck(
        'ag-s1-visitor-capacity-c3',
        'Define operational boundaries - what farm activities are incompatible with guest presence',
        { feeds: ['ag-s4-circulation-strategy', 'ag-s4-biosecurity-zoning'] },
      ),
      ck(
        'ag-s1-visitor-capacity-c4',
        'Define seasonal capacity variation - peak and off-peak limits',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s1-visitor-capacity-c5',
        'Confirm capacity is consistent with regulatory requirements and infrastructure potential',
        { feeds: ['s7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s1-visitor-capacity-dg1', 'Capacity limits', [
        'ag-s1-visitor-capacity-c1',
        'ag-s1-visitor-capacity-c2',
        'ag-s1-visitor-capacity-c4',
      ]),
      dg('ag-s1-visitor-capacity-dg2', 'Operational & regulatory boundaries', [
        'ag-s1-visitor-capacity-c3',
        'ag-s1-visitor-capacity-c5',
      ]),
    ],
    completionGate:
      'Visitor capacity defined. Operational boundaries confirmed.',
    actHandoff: 'Visitor Capacity & Operational Boundary Brief',
  }),
  obj({
    id: 'ag-s1-regulatory-framework',
    stratumId: 's1-project-foundation',
    ref: 'AG-S1.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound regulatory & licensing framework',
    shortTitle: 'Regulatory & licensing framework',
    focusedQuestion:
      'What permits, licences, and compliance frameworks must be in place before guests arrive?',
    checklist: [
      ck(
        'ag-s1-regulatory-framework-c1',
        'Identify food service permit requirements - preparation, service, storage',
        { feeds: ['ag-s4-safety-compliance'] },
      ),
      ck(
        'ag-s1-regulatory-framework-c2',
        'Identify accommodation licensing requirements for intended accommodation type',
        { feeds: ['ag-s5-accommodation'] },
      ),
      ck(
        'ag-s1-regulatory-framework-c3',
        'Define public liability insurance requirements and coverage',
        { feeds: ['ag-s4-safety-compliance'] },
      ),
      ck(
        'ag-s1-regulatory-framework-c4',
        'Identify health and safety compliance requirements for public access',
        { feeds: ['ag-s4-safety-compliance', 's7-risk-register'] },
      ),
      ck(
        'ag-s1-regulatory-framework-c5',
        'Identify any resource consent requirements for visitor infrastructure',
        { feeds: ['ag-s4-circulation-strategy', 's7-risk-register'] },
      ),
      ck(
        'ag-s1-regulatory-framework-c6',
        'Define compliance calendar - renewal dates and ongoing obligations',
        { feeds: ['ag-s6-compliance-monitoring'] },
      ),
      ck(
        'ag-s1-regulatory-framework-c7',
        'Obtain legal or compliance advice before any guest-facing infrastructure is built',
        { feeds: ['s7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s1-regulatory-framework-dg1', 'Permits & licences', [
        'ag-s1-regulatory-framework-c1',
        'ag-s1-regulatory-framework-c2',
        'ag-s1-regulatory-framework-c5',
      ]),
      dg('ag-s1-regulatory-framework-dg2', 'Liability & safety compliance', [
        'ag-s1-regulatory-framework-c3',
        'ag-s1-regulatory-framework-c4',
      ]),
      dg('ag-s1-regulatory-framework-dg3', 'Ongoing obligations', [
        'ag-s1-regulatory-framework-c6',
        'ag-s1-regulatory-framework-c7',
      ]),
    ],
    completionGate:
      'Regulatory and licensing framework defined. All permits identified and compliance calendar confirmed before infrastructure design begins.',
    actHandoff: 'Regulatory & Licensing Framework Brief',
    scopeNotes:
      'Do not design or build guest-facing infrastructure before all required permits and licences are identified. Compliance constraints may significantly alter what can be offered or where.',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'ag-s2-arrival-experience',
    stratumId: 's2-land-reading',
    ref: 'AG-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of visitor access & arrival experience',
    shortTitle: 'Visitor access & arrival experience',
    focusedQuestion:
      'How do guests currently arrive - and what is the quality of the approach, entry, and first impression?',
    checklist: [
      ck(
        'ag-s2-arrival-experience-c1',
        'Assess road quality and signage from nearest main road to property entry',
        { feeds: ['ag-s4-circulation-strategy', 's5-access'] },
      ),
      ck(
        'ag-s2-arrival-experience-c2',
        'Assess parking capacity and surface quality',
        { feeds: ['s4-zones', 's5-access'] },
      ),
      ck(
        'ag-s2-arrival-experience-c3',
        'Assess entry gate, driveway, and approach aesthetic',
        { feeds: ['ag-s4-circulation-strategy'] },
      ),
      ck(
        'ag-s2-arrival-experience-c4',
        'Identify safety hazards on arrival route - blind corners, livestock crossings, overhead clearance',
        { feeds: ['ag-s4-safety-compliance', 's7-risk-register'] },
      ),
      ck(
        'ag-s2-arrival-experience-c5',
        'Record first impression sequence - what does a guest see from the moment they arrive',
        { feeds: ['ag-s4-circulation-strategy'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s2-arrival-experience-dg1', 'Access & parking', [
        'ag-s2-arrival-experience-c1',
        'ag-s2-arrival-experience-c2',
      ], ['Infrastructure & Access']),
      dg('ag-s2-arrival-experience-dg2', 'Entry & first impression', [
        'ag-s2-arrival-experience-c3',
        'ag-s2-arrival-experience-c4',
        'ag-s2-arrival-experience-c5',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Visitor access and arrival experience survey complete.',
    actHandoff: 'Visitor Access & Arrival Experience Survey',
  }),
  obj({
    id: 'ag-s2-hospitality-infra',
    stratumId: 's2-land-reading',
    ref: 'AG-S2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of existing hospitality infrastructure',
    shortTitle: 'Existing hospitality infrastructure',
    focusedQuestion:
      'What accommodation, kitchen, bathroom, and gathering infrastructure already exists - and what is its condition and reuse potential?',
    checklist: [
      ck(
        'ag-s2-hospitality-infra-c1',
        'Inventory all existing accommodation - rooms, cabins, outbuildings - with condition assessment',
        { feeds: ['ag-s5-accommodation'] },
      ),
      ck(
        'ag-s2-hospitality-infra-c2',
        'Assess existing kitchen and food preparation infrastructure',
        { feeds: ['ag-s5-dining-infra'] },
      ),
      ck(
        'ag-s2-hospitality-infra-c3',
        'Assess existing bathroom and toilet facilities',
        { feeds: ['ag-s5-sanitation-infra'] },
      ),
      ck(
        'ag-s2-hospitality-infra-c4',
        'Assess existing gathering spaces - indoor and outdoor',
        { feeds: ['ag-s5-programming-infra'] },
      ),
      ck(
        'ag-s2-hospitality-infra-c5',
        'Identify reuse, renovation, or demolition requirements for each element',
        { feeds: ['ag-s5-accommodation', 's7-phase1'] },
      ),
      ck(
        'ag-s2-hospitality-infra-c6',
        'Estimate renovation cost for highest-potential reuse items',
        { feeds: ['s7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s2-hospitality-infra-dg1', 'Accommodation & facilities inventory', [
        'ag-s2-hospitality-infra-c1',
        'ag-s2-hospitality-infra-c2',
        'ag-s2-hospitality-infra-c3',
      ], ['Infrastructure & Access']),
      dg('ag-s2-hospitality-infra-dg2', 'Gathering spaces & reuse', [
        'ag-s2-hospitality-infra-c4',
        'ag-s2-hospitality-infra-c5',
        'ag-s2-hospitality-infra-c6',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Existing hospitality infrastructure fully inventoried. Reuse potential assessed.',
    actHandoff: 'Existing Hospitality Infrastructure Survey',
  }),
  obj({
    id: 'ag-s2-landscape-context',
    stratumId: 's2-land-reading',
    ref: 'AG-S2.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of surrounding landscape & vectors',
    shortTitle: 'Surrounding landscape & vectors',
    focusedQuestion:
      'How does the surrounding landscape shape the guest experience - visual amenity, noise, neighbouring activities - and what contamination risks apply?',
    checklist: [
      ck('ag-s2-landscape-context-c1', 'Map surrounding land uses within 2km', {
        feeds: ['ag-s4-circulation-strategy', 's4-zones'],
      }),
      ck(
        'ag-s2-landscape-context-c2',
        'Identify visual amenity values and any eyesores visible from guest areas',
        { feeds: ['ag-s5-dispersed-siting'] },
      ),
      ck(
        'ag-s2-landscape-context-c3',
        'Identify noise sources from neighbouring properties and roads',
        { feeds: ['ag-s5-dispersed-siting', 's7-risk-register'] },
      ),
      ck(
        'ag-s2-landscape-context-c4',
        'Assess drinking water catchment contamination risk from surrounding landscape vectors',
        { feeds: ['s4-water-strategy', 's7-risk-register'] },
      ),
      ck(
        'ag-s2-landscape-context-c5',
        'Record any neighbouring activities that could affect guest experience - spray drift, dust, traffic',
        { feeds: ['ag-s4-biosecurity-zoning', 's7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s2-landscape-context-dg1', 'Surrounding land use & amenity', [
        'ag-s2-landscape-context-c1',
        'ag-s2-landscape-context-c2',
        'ag-s2-landscape-context-c3',
      ]),
      dg('ag-s2-landscape-context-dg2', 'Contamination & nuisance vectors', [
        'ag-s2-landscape-context-c4',
        'ag-s2-landscape-context-c5',
      ]),
    ],
    completionGate:
      'Landscape context survey complete. Visual amenity, noise, and contamination risks identified.',
    actHandoff: 'Landscape Context & Vector Survey Package',
  }),
  obj({
    id: 'ag-s2-seasonal-patterns',
    stratumId: 's2-land-reading',
    ref: 'AG-S2.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of seasonal operational patterns',
    shortTitle: 'Seasonal operational patterns',
    focusedQuestion:
      'When can guests actually visit - what seasons, weather conditions, and farming activities enable or limit access?',
    checklist: [
      ck(
        'ag-s2-seasonal-patterns-c1',
        'Define peak guest season by climate and farm calendar',
        { feeds: ['ag-s7-staffing-training', 'ag-s7-seasonal-resilience'] },
      ),
      ck(
        'ag-s2-seasonal-patterns-c2',
        'Define off-peak periods and their limiting factors - weather, farm activity, access',
        { feeds: ['ag-s7-seasonal-resilience'] },
      ),
      ck(
        'ag-s2-seasonal-patterns-c3',
        'Identify farm activities that are incompatible with simultaneous guest presence',
        { feeds: ['ag-s4-circulation-strategy', 'ag-s4-biosecurity-zoning'] },
      ),
      ck(
        'ag-s2-seasonal-patterns-c4',
        'Map farming calendar against potential guest programming calendar',
        { feeds: ['ag-s4-food-strategy'] },
      ),
      ck(
        'ag-s2-seasonal-patterns-c5',
        'Define minimum and maximum viable operating weeks per year',
        { feeds: ['ag-s4-revenue-model', 's7-phase1'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s2-seasonal-patterns-dg1', 'Operating season', [
        'ag-s2-seasonal-patterns-c1',
        'ag-s2-seasonal-patterns-c2',
        'ag-s2-seasonal-patterns-c5',
      ]),
      dg('ag-s2-seasonal-patterns-dg2', 'Farm-guest calendar conflicts', [
        'ag-s2-seasonal-patterns-c3',
        'ag-s2-seasonal-patterns-c4',
      ]),
    ],
    completionGate:
      'Seasonal operational pattern survey complete. Peak, off-peak, and exclusion periods defined.',
    actHandoff: 'Seasonal Operational Patterns Survey',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'ag-s3-water-sanitation-demand',
    stratumId: 's3-systems-reading',
    ref: 'AG-S3.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of guest water & sanitation demand',
    shortTitle: 'Guest water & sanitation demand',
    focusedQuestion:
      'What water supply and sanitation capacity is required at peak guest numbers - and does the site support it?',
    checklist: [
      ck(
        'ag-s3-water-sanitation-demand-c1',
        'Calculate water demand at peak guest capacity - domestic, kitchen, bathroom, irrigation',
        { feeds: ['s4-water-strategy', 'ag-s5-sanitation-infra'] },
      ),
      ck(
        'ag-s3-water-sanitation-demand-c2',
        'Assess available water source yield for combined farm and guest demand',
        { feeds: ['s4-water-strategy', 's5-water-infrastructure'] },
      ),
      ck(
        'ag-s3-water-sanitation-demand-c3',
        'Identify water quality requirements for food service and accommodation',
        { feeds: ['ag-s5-dining-infra', 'ag-s5-sanitation-infra'] },
      ),
      ck(
        'ag-s3-water-sanitation-demand-c4',
        'Assess on-site sanitation capacity - septic, composting, or connection to municipal system',
        { feeds: ['ag-s5-sanitation-infra', 'ag-s5-decentralised-servicing'] },
      ),
      ck(
        'ag-s3-water-sanitation-demand-c5',
        'Identify regulatory requirements for guest sanitation infrastructure',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'ag-s3-water-sanitation-demand-c6',
        'Define maximum guest capacity supportable by available water and sanitation',
        { feeds: ['ag-s6-load-monitoring', 's7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s3-water-sanitation-demand-dg1', 'Water demand & supply', [
        'ag-s3-water-sanitation-demand-c1',
        'ag-s3-water-sanitation-demand-c2',
        'ag-s3-water-sanitation-demand-c3',
      ], ['Water & Hydrology']),
      dg('ag-s3-water-sanitation-demand-dg2', 'Sanitation capacity & limits', [
        'ag-s3-water-sanitation-demand-c4',
        'ag-s3-water-sanitation-demand-c5',
        'ag-s3-water-sanitation-demand-c6',
      ], ['Water & Hydrology']),
    ],
    completionGate:
      'Guest water and sanitation demand assessed. Capacity constraints defined.',
    actHandoff: 'Guest Water & Sanitation Demand Assessment',
  }),
  obj({
    id: 'ag-s3-sensory-environment',
    stratumId: 's3-systems-reading',
    ref: 'AG-S3.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of noise, privacy & sensory environment',
    shortTitle: 'Noise, privacy & sensory environment',
    focusedQuestion:
      'What will guests see, hear, and experience - and what sensory conditions support or undermine the guest experience vision?',
    checklist: [
      ck(
        'ag-s3-sensory-environment-c1',
        'Record ambient noise levels across the site by season and time of day',
        { feeds: ['ag-s5-dispersed-siting', 'ag-s5-decentralised-servicing'] },
      ),
      ck(
        'ag-s3-sensory-environment-c2',
        'Identify farm operational noises that could affect guest experience',
        { feeds: ['ag-s4-circulation-strategy'] },
      ),
      ck(
        'ag-s3-sensory-environment-c3',
        'Map visual amenity from proposed guest areas - views, screening needs',
        { feeds: ['ag-s5-dispersed-siting'] },
      ),
      ck(
        'ag-s3-sensory-environment-c4',
        'Identify odour sources - livestock, composting, machinery - relative to guest zones',
        { feeds: ['ag-s4-circulation-strategy', 'ag-s4-biosecurity-zoning'] },
      ),
      ck(
        'ag-s3-sensory-environment-c5',
        'Assess privacy conditions in proposed accommodation locations',
        { feeds: ['ag-s5-accommodation', 'ag-s5-dispersed-siting'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s3-sensory-environment-dg1', 'Noise & odour', [
        'ag-s3-sensory-environment-c1',
        'ag-s3-sensory-environment-c2',
        'ag-s3-sensory-environment-c4',
      ]),
      dg('ag-s3-sensory-environment-dg2', 'Visual amenity & privacy', [
        'ag-s3-sensory-environment-c3',
        'ag-s3-sensory-environment-c5',
      ]),
    ],
    completionGate:
      'Sensory environment survey complete. Noise, visual, and privacy conditions mapped.',
    actHandoff: 'Noise, Privacy & Sensory Environment Survey',
  }),
  obj({
    id: 'ag-s3-emergency-access',
    stratumId: 's3-systems-reading',
    ref: 'AG-S3.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of emergency access & safety conditions',
    shortTitle: 'Emergency access & safety conditions',
    focusedQuestion:
      'What are the emergency access, evacuation, and safety conditions that must be resolved before public access begins?',
    checklist: [
      ck(
        'ag-s3-emergency-access-c1',
        'Map emergency vehicle access routes to all guest areas',
        { feeds: ['ag-s4-safety-compliance', 'ag-s5-safety-infra'] },
      ),
      ck(
        'ag-s3-emergency-access-c2',
        'Identify evacuation routes for fire, flood, and other emergencies',
        { feeds: ['ag-s4-safety-compliance', 'ag-s5-safety-infra'] },
      ),
      ck(
        'ag-s3-emergency-access-c3',
        'Assess first aid access and response time from nearest medical facility',
        { feeds: ['ag-s4-safety-compliance'] },
      ),
      ck(
        'ag-s3-emergency-access-c4',
        'Identify safety hazards across all areas guests will access - terrain, machinery, animals',
        { feeds: ['ag-s4-safety-compliance', 's7-risk-register'] },
      ),
      ck(
        'ag-s3-emergency-access-c5',
        'Assess fire risk and evacuation complexity',
        { feeds: ['ag-s4-safety-compliance', 's7-risk-register'] },
      ),
      ck(
        'ag-s3-emergency-access-c6',
        'Confirm emergency access meets regulatory requirements for public accommodation',
        { feeds: ['ag-s5-safety-infra'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s3-emergency-access-dg1', 'Access & evacuation routes', [
        'ag-s3-emergency-access-c1',
        'ag-s3-emergency-access-c2',
      ], ['Infrastructure & Access']),
      dg('ag-s3-emergency-access-dg2', 'Response & medical', [
        'ag-s3-emergency-access-c3',
      ], ['Infrastructure & Access']),
      dg('ag-s3-emergency-access-dg3', 'Hazards & compliance', [
        'ag-s3-emergency-access-c4',
        'ag-s3-emergency-access-c5',
        'ag-s3-emergency-access-c6',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Emergency access and safety conditions survey complete. All hazards identified.',
    actHandoff: 'Emergency Access & Safety Conditions Survey',
  }),
  obj({
    id: 'ag-s3-food-production-capacity',
    stratumId: 's3-systems-reading',
    ref: 'AG-S3.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of existing food production capacity',
    shortTitle: 'Existing food production capacity',
    focusedQuestion:
      'What is already growing on this land that can feed the guest experience - and what gaps exist?',
    checklist: [
      ck(
        'ag-s3-food-production-capacity-c1',
        'Inventory all current food-producing elements - gardens, orchards, animals',
        { feeds: ['ag-s4-food-strategy'] },
      ),
      ck(
        'ag-s3-food-production-capacity-c2',
        'Assess current yield potential by enterprise',
        { feeds: ['ag-s4-food-strategy'] },
      ),
      ck(
        'ag-s3-food-production-capacity-c3',
        'Identify seasonal production gaps relative to intended guest dining calendar',
        { feeds: ['ag-s4-food-strategy', 'ag-s6-food-integration'] },
      ),
      ck(
        'ag-s3-food-production-capacity-c4',
        'Assess food storage, preservation, and preparation infrastructure',
        { feeds: ['ag-s5-dining-infra'] },
      ),
      ck(
        'ag-s3-food-production-capacity-c5',
        'Define what additional production is required to support intended hospitality model',
        { feeds: ['ag-s4-food-strategy', 's7-phase1'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s3-food-production-capacity-dg1', 'Current production inventory', [
        'ag-s3-food-production-capacity-c1',
        'ag-s3-food-production-capacity-c2',
      ]),
      dg('ag-s3-food-production-capacity-dg2', 'Gaps & infrastructure', [
        'ag-s3-food-production-capacity-c3',
        'ag-s3-food-production-capacity-c4',
        'ag-s3-food-production-capacity-c5',
      ]),
    ],
    completionGate:
      'Existing food production capacity inventoried. Gaps relative to guest dining vision identified.',
    actHandoff: 'Existing Food Production Capacity Survey',
  }),
  obj({
    id: 'ag-s3-ecological-carrying-capacity',
    stratumId: 's3-systems-reading',
    ref: 'AG-S3.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title:
      "A clear read of the land's ecological carrying capacity under visitor pressure",
    shortTitle: 'Ecological carrying capacity under visitor pressure',
    focusedQuestion:
      'How much foot traffic and dispersed-stay pressure can this landscape absorb before regeneration is undermined - and which areas must be protected from guest access?',
    checklist: [
      ck(
        'ag-s3-ecological-carrying-capacity-c1',
        'Map guest-trafficked zones against soil type and compaction / erosion susceptibility',
        { feeds: ['ag-s4-circulation-strategy', 's5-soil-improvement'] },
      ),
      ck(
        'ag-s3-ecological-carrying-capacity-c2',
        'Assess trampling and trail-erosion thresholds for proposed paths and gathering areas',
        { feeds: ['ag-s5-programming-infra', 'ag-s5-dispersed-siting'] },
      ),
      ck(
        'ag-s3-ecological-carrying-capacity-c3',
        'Identify sensitive habitats and wildlife corridors to exclude or buffer from guest access',
        { feeds: ['ag-s4-circulation-strategy', 'ag-s5-dispersed-siting'] },
      ),
      ck(
        'ag-s3-ecological-carrying-capacity-c4',
        'Define seasonal sensitivity windows (wet soil, breeding, regeneration) when access must reduce or close',
        { feeds: ['ag-s6-load-monitoring', 'ag-s7-seasonal-resilience'] },
      ),
      ck(
        'ag-s3-ecological-carrying-capacity-c5',
        'Define sacrificial vs protected ground - where wear is accepted and hardened vs prevented',
        { feeds: ['ag-s4-circulation-strategy', 'ag-s5-dispersed-siting'] },
      ),
      ck(
        'ag-s3-ecological-carrying-capacity-c6',
        'Set an ecological carrying-capacity ceiling that feeds the Stratum 6 load monitor and Stratum 4 zoning',
        { feeds: ['ag-s4-circulation-strategy', 'ag-s6-load-monitoring'] },
      ),
    ],
    decisionGroups: [
      dg(
        'ag-s3-ecological-carrying-capacity-dg1',
        'Ground & traffic tolerance',
        [
          'ag-s3-ecological-carrying-capacity-c1',
          'ag-s3-ecological-carrying-capacity-c2',
          'ag-s3-ecological-carrying-capacity-c5',
        ],
        ['Soil'],
      ),
      dg(
        'ag-s3-ecological-carrying-capacity-dg2',
        'Sensitive areas & seasonal limits',
        [
          'ag-s3-ecological-carrying-capacity-c3',
          'ag-s3-ecological-carrying-capacity-c4',
        ],
        ['Ecology & Habitat'],
      ),
      dg('ag-s3-ecological-carrying-capacity-dg3', 'Carrying-capacity ceiling', [
        'ag-s3-ecological-carrying-capacity-c6',
      ]),
    ],
    completionGate:
      'Ecological carrying capacity assessed. Protected areas, seasonal limits, and the visitor-load ceiling defined.',
    actHandoff: 'Ecological Carrying Capacity & Visitor-Load Assessment',
    scopeNotes:
      'Applies when guests move through or stay dispersed across the working / regenerating landscape (eco-resort / glamping / nature-immersion model); omit for agritourism confined to a hardened visitor precinct. Feeds AG-S6.5 and AG-S4.4 / AG-S4.9; does not duplicate AG-S6.5, which tracks operational load rather than ecological tolerance.',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'ag-s4-circulation-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'AG-S4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A coherent guest experience zones & circulation strategy',
    shortTitle: 'Guest experience zones & circulation strategy',
    focusedQuestion:
      'Where exactly do guests go, what route do they take, and how is privacy and safety managed throughout?',
    checklist: [
      ck(
        'ag-s4-circulation-strategy-c1',
        'Define accessible guest zones - accommodation, dining, trails, demonstration areas',
        { feeds: ['ag-s5-accommodation', 'ag-s5-programming-infra'] },
      ),
      ck(
        'ag-s4-circulation-strategy-c2',
        'Define visitor circulation route - arrival, orientation, experience sequence, departure',
        { feeds: ['ag-s5-programming-infra', 's7-phase1'] },
      ),
      ck(
        'ag-s4-circulation-strategy-c3',
        'Define hard boundaries between guest zones and farm operations',
        { feeds: ['ag-s5-safety-infra'] },
      ),
      ck(
        'ag-s4-circulation-strategy-c4',
        'Define signage and wayfinding approach',
        { feeds: ['ag-s5-programming-infra'] },
      ),
      ck(
        'ag-s4-circulation-strategy-c5',
        'Define supervised vs. self-guided zones',
        { feeds: ['ag-s7-staffing-training'] },
      ),
      ck(
        'ag-s4-circulation-strategy-c6',
        'Confirm circulation route is compatible with emergency evacuation requirements',
        { feeds: ['ag-s5-safety-infra', 's7-risk-register'] },
      ),
      ck(
        'ag-s4-circulation-strategy-c7',
        'Ground the arrival and circulation route in the Stratum 2 visitor access and arrival experience findings',
      ),
    ],
    decisionGroups: [
      dg('ag-s4-circulation-strategy-dg1', 'Guest zones & route', [
        'ag-s4-circulation-strategy-c1',
        'ag-s4-circulation-strategy-c2',
        'ag-s4-circulation-strategy-c5',
        'ag-s4-circulation-strategy-c7',
      ]),
      dg('ag-s4-circulation-strategy-dg2', 'Boundaries & wayfinding', [
        'ag-s4-circulation-strategy-c3',
        'ag-s4-circulation-strategy-c4',
      ]),
      dg('ag-s4-circulation-strategy-dg3', 'Emergency compatibility', [
        'ag-s4-circulation-strategy-c6',
      ]),
    ],
    completionGate:
      'Guest experience zones and circulation strategy approved. All boundaries and safety requirements confirmed.',
    actHandoff: 'Guest Experience Zones & Visitor Circulation Strategy Brief',
    monitoringProtocol: {
      indicators: [
        'Guest adherence to designated zones -- incursions into farm-operation areas',
        'Wayfinding effectiveness -- guests reaching destinations without staff redirection',
        'Boundary integrity between guest zones and working operations',
      ],
      triggers: [
        'Repeated guest incursion into a farm-operation zone -> reinforce the boundary or signage at that point',
        'Guests frequently lost or redirected -> revise wayfinding and orientation',
        'Circulation route conflicting with an emergency-evacuation path -> re-route and re-test evacuation',
      ],
      feeds: 'Visitor Circulation monitoring stream',
    },
  }),
  obj({
    id: 'ag-s4-service-model',
    stratumId: 's4-foundation-decisions',
    ref: 'AG-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear hospitality service model',
    shortTitle: 'Hospitality service model',
    focusedQuestion:
      'What food, accommodation, and programming is offered - and at what service standard?',
    checklist: [
      ck(
        'ag-s4-service-model-c1',
        'Define accommodation types and standards - farm stay rooms, cabins, glamping',
        { feeds: ['ag-s5-accommodation'] },
      ),
      ck(
        'ag-s4-service-model-c2',
        'Define dining model - farm breakfast, shared dinners, self-catering, or hybrid',
        { feeds: ['ag-s5-dining-infra'] },
      ),
      ck(
        'ag-s4-service-model-c3',
        'Define programming offer - farm tours, workshops, retreats, harvest experiences',
        { feeds: ['ag-s5-programming-infra'] },
      ),
      ck(
        'ag-s4-service-model-c4',
        'Define service standard for each offering - what is included, what is extra',
        { feeds: ['ag-s5-accommodation', 'ag-s7-staffing-training'] },
      ),
      ck(
        'ag-s4-service-model-c5',
        'Confirm service model is achievable within steward capacity and licensing framework',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s4-service-model-c6',
        'Confirm each offering serves the Stratum 1 guest experience vision and hospitality identity',
      ),
    ],
    decisionGroups: [
      dg('ag-s4-service-model-dg1', 'Accommodation & dining offer', [
        'ag-s4-service-model-c1',
        'ag-s4-service-model-c2',
      ]),
      dg('ag-s4-service-model-dg2', 'Programming & standards', [
        'ag-s4-service-model-c3',
        'ag-s4-service-model-c4',
        'ag-s4-service-model-c5',
        'ag-s4-service-model-c6',
      ]),
    ],
    completionGate:
      'Hospitality service model approved. All offerings defined against capacity and compliance constraints.',
    actHandoff: 'Hospitality Service Model Brief',
    monitoringProtocol: {
      indicators: [
        'Guest satisfaction by offering -- accommodation, dining, programming',
        'Service-standard adherence vs. the defined standard',
        'Offering delivery within steward and staff capacity',
      ],
      triggers: [
        'Satisfaction falling for an offering -> review the service standard and delivery for it',
        'Service standard not met during peak periods -> review staffing and capacity for that offering',
        'An offering exceeding available capacity to deliver -> scale it back or resource it',
      ],
      feeds: 'Visitor Experience monitoring stream',
    },
  }),
  obj({
    id: 'ag-s4-food-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'AG-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound farm-to-guest food production strategy',
    shortTitle: 'Farm-to-guest food production strategy',
    focusedQuestion:
      'Which farm enterprises feed the guest experience - and how is farm production integrated into hospitality?',
    checklist: [
      ck(
        'ag-s4-food-strategy-c1',
        'Map current farm production against guest dining calendar - what is available when',
        { feeds: ['ag-s6-food-integration'] },
      ),
      ck(
        'ag-s4-food-strategy-c2',
        'Define priority enterprises for guest food supply - vegetables, eggs, meat, dairy, fruit',
        { feeds: ['ag-s5-dining-infra', 'ag-s6-food-integration'] },
      ),
      ck(
        'ag-s4-food-strategy-c3',
        'Define food production gaps and sourcing strategy for gaps - local farms, suppliers',
        { feeds: ['ag-s6-food-integration', 's7-resource-plan'] },
      ),
      ck(
        'ag-s4-food-strategy-c4',
        'Define food preparation approach - farm kitchen standards, preservation, seasonal menus',
        { feeds: ['ag-s5-dining-infra'] },
      ),
      ck(
        'ag-s4-food-strategy-c5',
        'Confirm farm-to-guest supply chain is consistent with food safety requirements',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'ag-s4-food-strategy-c6',
        'Confirm priority enterprises against the Stratum 3 food production capacity and seasonal gap findings',
      ),
    ],
    decisionGroups: [
      dg('ag-s4-food-strategy-dg1', 'Production-to-menu mapping', [
        'ag-s4-food-strategy-c1',
        'ag-s4-food-strategy-c2',
        'ag-s4-food-strategy-c6',
      ]),
      dg('ag-s4-food-strategy-dg2', 'Sourcing & preparation', [
        'ag-s4-food-strategy-c3',
        'ag-s4-food-strategy-c4',
        'ag-s4-food-strategy-c5',
      ]),
    ],
    completionGate:
      'Farm-to-guest food production strategy approved. Supply chain and gaps confirmed.',
    actHandoff: 'Farm-to-Guest Food Production Strategy Brief',
    monitoringProtocol: {
      indicators: [
        'Share of the guest menu supplied from on-farm production vs. plan',
        'Seasonal supply gaps requiring external sourcing',
        'Farm-to-guest supply-chain compliance with food-safety requirements',
      ],
      triggers: [
        'On-farm supply share falling below plan -> review enterprise priorities or the sourcing strategy',
        'A seasonal gap recurring -> adjust production or pre-arrange sourcing for that window',
        'A food-safety lapse in the supply chain -> halt the affected line and remediate',
      ],
      feeds: 'Farm-to-Guest Food monitoring stream',
    },
  }),
  obj({
    id: 'ag-s4-safety-compliance',
    stratumId: 's4-foundation-decisions',
    ref: 'AG-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound safety, emergency & compliance framework',
    shortTitle: 'Safety, emergency & compliance framework',
    focusedQuestion:
      'What safety systems, emergency protocols, and compliance obligations must be in place before any guest arrives?',
    checklist: [
      ck(
        'ag-s4-safety-compliance-c1',
        'Define fire evacuation plan for all guest areas',
        { feeds: ['ag-s5-safety-infra'] },
      ),
      ck(
        'ag-s4-safety-compliance-c2',
        'Define first aid protocol - trained personnel, equipment, emergency contacts',
        { feeds: ['ag-s5-safety-infra', 'ag-s7-staffing-training'] },
      ),
      ck(
        'ag-s4-safety-compliance-c3',
        'Define hazard identification and management system for all guest zones',
        { feeds: ['ag-s5-safety-infra', 's7-risk-register'] },
      ),
      ck(
        'ag-s4-safety-compliance-c4',
        'Define food safety management plan for all food service activities',
        { feeds: ['ag-s5-dining-infra', 'ag-s6-compliance-monitoring'] },
      ),
      ck(
        'ag-s4-safety-compliance-c5',
        'Define public liability coverage requirements and confirm insurance',
        { feeds: ['ag-s6-compliance-monitoring'] },
      ),
      ck(
        'ag-s4-safety-compliance-c6',
        'Confirm all compliance obligations are met before first guest arrival',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'ag-s4-safety-compliance-c7',
        'Ground evacuation and first aid planning in the Stratum 3 emergency access and safety conditions survey',
      ),
    ],
    decisionGroups: [
      dg('ag-s4-safety-compliance-dg1', 'Emergency & first aid', [
        'ag-s4-safety-compliance-c1',
        'ag-s4-safety-compliance-c2',
        'ag-s4-safety-compliance-c7',
      ]),
      dg('ag-s4-safety-compliance-dg2', 'Hazard & food safety', [
        'ag-s4-safety-compliance-c3',
        'ag-s4-safety-compliance-c4',
      ]),
      dg('ag-s4-safety-compliance-dg3', 'Liability & sign-off', [
        'ag-s4-safety-compliance-c5',
        'ag-s4-safety-compliance-c6',
      ]),
    ],
    completionGate:
      'Safety, emergency, and compliance framework approved. All obligations confirmed before any guest access.',
    actHandoff: 'Safety, Emergency & Compliance Framework',
    monitoringProtocol: {
      indicators: [
        'Compliance-obligation currency -- licences, insurance, certifications up to date',
        'Safety-incident and near-miss frequency in guest zones',
        'First-aid and emergency-equipment readiness',
      ],
      triggers: [
        'A compliance obligation lapsing -> renew it before guest access continues',
        'A rising incident or near-miss trend in a zone -> review hazards and controls for it',
        'Emergency equipment or first-aid cover found deficient -> restore it before the next guest arrival',
      ],
      feeds: 'Safety & Compliance monitoring stream',
    },
    scopeNotes:
      'This framework must be complete and confirmed before any guest arrives - not after the first season. Compliance and safety obligations discovered late cause expensive retrofitting or forced closure.',
  }),
  obj({
    id: 'ag-s4-revenue-model',
    stratumId: 's4-foundation-decisions',
    ref: 'AG-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound booking, pricing & revenue model',
    shortTitle: 'Booking, pricing & revenue model',
    focusedQuestion:
      'How do guests book, what do they pay, and what financial model makes this enterprise viable?',
    checklist: [
      ck(
        'ag-s4-revenue-model-c1',
        'Define pricing for each experience offering',
        { feeds: ['ag-s7-booking-system', 's7-phase1'] },
      ),
      ck(
        'ag-s4-revenue-model-c2',
        'Define booking terms - advance booking, deposits, cancellation policy',
        { feeds: ['ag-s7-booking-system'] },
      ),
      ck(
        'ag-s4-revenue-model-c3',
        'Define peak and off-peak pricing strategy',
        { feeds: ['ag-s7-booking-system'] },
      ),
      ck(
        'ag-s4-revenue-model-c4',
        'Calculate minimum viable occupancy rate for financial viability',
        { feeds: ['ag-s6-load-monitoring', 'ag-s7-phased-launch'] },
      ),
      ck(
        'ag-s4-revenue-model-c5',
        'Define revenue targets for Phase 1 and break-even timeline',
        { feeds: ['ag-s7-phased-launch'] },
      ),
      ck(
        'ag-s4-revenue-model-c6',
        'Confirm pricing is consistent with market comparables and service standard',
      ),
      ck(
        'ag-s4-revenue-model-c7',
        'Decide whether a membership or season-pass tier is offered at all - default to none unless deliberately adopted; if none, c8-c11 are N/A',
      ),
      ck(
        'ag-s4-revenue-model-c8',
        'If adopted, structure it as a membership benefit - entitlement to access, priority booking, member rates, and belonging-benefits - with each actual stay still transacted as a separate per-stay service reservation (deposit + balance on a booked, deliverable stay) and the membership cancellable with pro-rata refund of unused access; the membership fee buys belonging and access terms, NOT a bundle of specific undelivered nights (avoids bay` ma laysa `indak / gharar)',
      ),
      ck(
        'ag-s4-revenue-model-c9',
        'Ensure member value is demonstrably non-stay-predominant - real belonging substance (community, seasonal / biodynamic events, bounded off-season access) beyond stay discounts - so the instrument is a membership in substance, not a nights-purchase in disguise; any member produce-share is treated as delivered-not-prepaid per the market-garden CSA guardrail (MGD-S1.4 / MGD-S1.6), not as an advance purchase',
      ),
      ck(
        'ag-s4-revenue-model-c10',
        'Bound member access, especially off-season, within the AG-S3.7 ecological carrying-capacity ceiling and its seasonal sensitivity windows; coordinate with AG-S7.8 so member presence supports off-season resilience without exceeding load limits; if member access extends beyond any hardened visitor precinct, AG-S3.7 must be in scope - the membership can pull it into scope',
        { feeds: ['ag-s7-seasonal-resilience'] },
      ),
      ck(
        'ag-s4-revenue-model-c11',
        'Route any membership / season-pass instrument to Scholar Council review before adoption; surface it explicitly, never as a default or recommended model; use no CSRA / salam advance-purchase framing',
      ),
      ck(
        'ag-s4-revenue-model-c12',
        'Confirm pricing and occupancy targets against the Stratum 1 commercial proposition and visitor capacity limits',
      ),
    ],
    decisionGroups: [
      dg('ag-s4-revenue-model-dg1', 'Pricing & booking terms', [
        'ag-s4-revenue-model-c1',
        'ag-s4-revenue-model-c2',
        'ag-s4-revenue-model-c3',
      ]),
      dg('ag-s4-revenue-model-dg2', 'Viability targets', [
        'ag-s4-revenue-model-c4',
        'ag-s4-revenue-model-c5',
        'ag-s4-revenue-model-c6',
        'ag-s4-revenue-model-c12',
      ]),
      dg('ag-s4-revenue-model-dg3', 'Membership structure & fiqh routing (optional)', [
        'ag-s4-revenue-model-c7',
        'ag-s4-revenue-model-c8',
        'ag-s4-revenue-model-c11',
      ]),
      dg('ag-s4-revenue-model-dg4', 'Membership substance & ecological bound', [
        'ag-s4-revenue-model-c9',
        'ag-s4-revenue-model-c10',
      ]),
    ],
    completionGate:
      'Booking, pricing, and revenue model approved. Break-even timeline and minimum occupancy confirmed. Any contemplated membership / season-pass tier is membership-benefit-structured (not advance prepayment), carries genuine non-stay substance within AG-S3.7 limits, and is routed to Scholar Council review.',
    actHandoff: 'Booking, Pricing & Revenue Model Brief',
    monitoringProtocol: {
      indicators: [
        'Actual occupancy rate vs. the minimum viable target',
        'Revenue vs. forecast by offering and by season',
        'Operating cost-recovery ratio against the break-even plan',
      ],
      triggers: [
        'Occupancy below the minimum viable rate across a season -> review pricing and the cost base within permitted offerings',
        'Revenue concentrated in a single offering -> diversify within already-permitted experiences',
        'Operating costs exceeding the break-even plan -> re-baseline targets and review fixed and variable costs',
      ],
      feeds: 'Financial Performance monitoring stream',
    },
    scopeNotes:
      "Amanah flag - surface, do not omit: a season-pass / membership / advance multi-night package is a sales instrument that, if structured as prepayment for specific undelivered nights, is the advance sale of what the operator does not yet possess (bay` ma laysa `indak / gharar) - the structure that retired the MTC CSRA model. It is surfaced here, never silently dropped, but must be structured as a membership benefit (entitlement to access, priority, and belonging-benefits, not advance purchase), with each stay still transacted as a separate per-stay reservation and the membership cancellable with pro-rata refund of unused access (evidencing access, not purchase). The membership must carry genuine non-stay substance (community, seasonal events, bounded off-season access) so it is a membership in substance and not a nights-purchase in disguise; any member produce-share is treated as delivered-not-prepaid per the market-garden CSA guardrail (MGD-S1.4 / MGD-S1.6); and member access stays within the AG-S3.7 carrying-capacity limits (which the membership pulls into scope if access leaves a hardened precinct). It must not be presented as a default or recommended model, carries no CSRA / salam framing, and goes to Scholar Council review before adoption. Permissible without the flag: ordinary per-stay service reservation (deposit + balance on a booked, deliverable stay), already covered by c1-c2.",
  }),
  obj({
    id: 'ag-s4-biosecurity-zoning',
    stratumId: 's4-foundation-decisions',
    ref: 'AG-S4.9',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title:
      'A sound guest-to-production biosecurity & contamination-buffer strategy',
    shortTitle: 'Guest-to-production biosecurity & buffers',
    focusedQuestion:
      'How are guests and their vehicles, gear, and pets kept from carrying contamination into - or hazards out of - working production, livestock, and spray zones?',
    checklist: [
      ck(
        'ag-s4-biosecurity-zoning-c1',
        'Identify contamination pathways between guest areas and production / livestock / spray zones (both directions)',
        { feeds: ['ag-s5-dispersed-siting', 's7-risk-register'] },
      ),
      ck(
        'ag-s4-biosecurity-zoning-c2',
        'Set buffer distances and physical separation between guest circulation and sensitive production',
        { feeds: ['ag-s5-dispersed-siting'] },
      ),
      ck(
        'ag-s4-biosecurity-zoning-c3',
        'Specify arrival hygiene measures - foot-baths, wash points, signage - where guests cross into or near production',
        { feeds: ['ag-s5-programming-infra'] },
      ),
      ck(
        'ag-s4-biosecurity-zoning-c4',
        'Define weed / pathogen controls on guest vehicles, gear, and pets entering the property',
        { feeds: ['ag-s6-compliance-monitoring', 's7-risk-register'] },
      ),
      ck(
        'ag-s4-biosecurity-zoning-c5',
        'Define safe guest-animal interaction protocols covering both animal welfare and zoonosis risk',
        { feeds: ['ag-s7-staffing-training', 's7-risk-register'] },
      ),
      ck(
        'ag-s4-biosecurity-zoning-c6',
        'Confirm the strategy is consistent with the AG-S4.4 guest circulation / zoning decision',
      ),
      ck(
        'ag-s4-biosecurity-zoning-c7',
        'Confirm buffer and separation decisions respect the Stratum 1 operational boundaries for farm activities incompatible with guests',
      ),
    ],
    decisionGroups: [
      dg('ag-s4-biosecurity-zoning-dg1', 'Contamination pathways & buffers', [
        'ag-s4-biosecurity-zoning-c1',
        'ag-s4-biosecurity-zoning-c2',
        'ag-s4-biosecurity-zoning-c7',
      ]),
      dg('ag-s4-biosecurity-zoning-dg2', 'Entry hygiene & arrivals control', [
        'ag-s4-biosecurity-zoning-c3',
        'ag-s4-biosecurity-zoning-c4',
      ]),
      dg('ag-s4-biosecurity-zoning-dg3', 'Animal contact & circulation fit', [
        'ag-s4-biosecurity-zoning-c5',
        'ag-s4-biosecurity-zoning-c6',
      ]),
    ],
    completionGate:
      'Guest-to-production biosecurity strategy set. Pathways, buffers, entry hygiene, and animal-contact protocols defined and consistent with circulation zoning.',
    actHandoff:
      'Guest-to-Production Biosecurity & Contamination-Buffer Strategy',
    monitoringProtocol: {
      indicators: [
        'Buffer and separation integrity between guest circulation and sensitive production',
        'Arrival-hygiene measure usage at production crossings',
        'Biosecurity incidents -- contamination carried into or hazards out of production zones',
      ],
      triggers: [
        'A guest pathway breaching a production buffer -> reinstate separation at that point',
        'Arrival-hygiene measures bypassed -> reinforce signage and supervision at the crossing',
        'A contamination or zoonosis incident -> isolate the pathway and review animal-contact protocols',
      ],
      feeds: 'Biosecurity monitoring stream',
    },
    scopeNotes:
      'Applies when guest circulation sits alongside working production, livestock, or sprayed areas (the eco-resort / glamping / working-farm-stay model); omit for retreats with no adjacent active production. Safe guest-animal interaction carries a welfare (ihsan) duty as well as a biosecurity one. Complements AG-S4.4 (guest circulation / zoning); does not replace it.',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'ag-s5-accommodation',
    stratumId: 's5-system-design',
    ref: 'AG-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed guest accommodation & retreat infrastructure',
    shortTitle: 'Guest accommodation & retreat infrastructure',
    focusedQuestion:
      'How will guest accommodation be designed - sized to capacity, consistent with experience vision and compliance requirements?',
    checklist: [
      ck(
        'ag-s5-accommodation-c1',
        'Design accommodation layout - room configuration, cabin placement, glamping site layout',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-accommodation-c2',
        'Specify construction or renovation standard for each accommodation type',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-accommodation-c3',
        'Design thermal performance - insulation, heating, cooling',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-accommodation-c4',
        'Design guest room amenities to defined service standard',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-accommodation-c5',
        'Confirm accommodation design meets building code and accommodation licensing requirements',
        { feeds: ['ag-s6-compliance-monitoring'] },
      ),
      ck(
        'ag-s5-accommodation-c6',
        'Confirm accommodation capacity matches Stratum 1 visitor capacity definition',
        { feeds: ['ag-s6-load-monitoring'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s5-accommodation-dg1', 'Layout & construction', [
        'ag-s5-accommodation-c1',
        'ag-s5-accommodation-c2',
      ], ['Infrastructure & Access']),
      dg('ag-s5-accommodation-dg2', 'Comfort & amenity', [
        'ag-s5-accommodation-c3',
        'ag-s5-accommodation-c4',
      ], ['Infrastructure & Access']),
      dg('ag-s5-accommodation-dg3', 'Compliance & capacity', [
        'ag-s5-accommodation-c5',
        'ag-s5-accommodation-c6',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Guest accommodation design approved. Compliance and capacity confirmed.',
    actHandoff: 'Guest Accommodation & Retreat Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the AG-S4.5 hospitality service model accommodation types and standards.',
    monitoringProtocol: {
      indicators: [
        'Accommodation occupancy and utilisation across unit types vs. designed capacity',
        'Guest-reported comfort -- thermal performance, amenity, room condition',
        'Accommodation fabric condition -- defect, maintenance, and renovation backlog',
      ],
      triggers: [
        'A unit type drawing repeated comfort or thermal complaints -> review insulation, heating, or cooling for that type',
        'A unit falling below its construction or maintenance standard -> schedule remediation before reletting',
      ],
      feeds: 'Guest Accommodation monitoring stream',
    },
  }),
  obj({
    id: 'ag-s5-dining-infra',
    stratumId: 's5-system-design',
    ref: 'AG-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed guest dining & food service infrastructure',
    shortTitle: 'Guest dining & food service infrastructure',
    focusedQuestion:
      'How will farm kitchen, dining, and food service infrastructure be designed to food safety standard?',
    checklist: [
      ck(
        'ag-s5-dining-infra-c1',
        'Design farm kitchen layout - preparation, cooking, storage, wash-up',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-dining-infra-c2',
        'Specify kitchen equipment to food service permit standard',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-dining-infra-c3',
        'Design dining area - capacity, layout, indoor/outdoor options',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-dining-infra-c4',
        'Design food storage - cool room, dry store, preservation',
        { feeds: ['ag-s6-food-integration', 's7-resource-plan'] },
      ),
      ck(
        'ag-s5-dining-infra-c5',
        'Confirm kitchen and dining design meets food safety compliance requirements',
        { feeds: ['ag-s6-compliance-monitoring'] },
      ),
      ck(
        'ag-s5-dining-infra-c6',
        'Size food storage and preparation design against the Stratum 3 food production capacity and storage findings',
        { feeds: ['ag-s6-food-integration'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s5-dining-infra-dg1', 'Kitchen design & equipment', [
        'ag-s5-dining-infra-c1',
        'ag-s5-dining-infra-c2',
      ], ['Infrastructure & Access']),
      dg('ag-s5-dining-infra-dg2', 'Dining, storage & compliance', [
        'ag-s5-dining-infra-c3',
        'ag-s5-dining-infra-c4',
        'ag-s5-dining-infra-c5',
        'ag-s5-dining-infra-c6',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Dining and food service infrastructure design approved. Food safety compliance confirmed.',
    actHandoff: 'Guest Dining & Food Service Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the AG-S4.6 farm-to-guest food production strategy.',
    monitoringProtocol: {
      indicators: [
        'Kitchen and dining throughput vs. designed seating and service capacity at peak',
        'Food-storage performance -- cool-room and dry-store temperature and capacity adequacy',
        'Food-safety compliance status of kitchen and dining operations',
      ],
      triggers: [
        'Dining demand exceeding seated capacity at peak -> review service sittings or layout',
        'A cool-room or storage unit failing to hold temperature or capacity -> repair and revalidate before service resumes',
      ],
      feeds: 'Guest Dining monitoring stream',
    },
  }),
  obj({
    id: 'ag-s5-programming-infra',
    stratumId: 's5-system-design',
    ref: 'AG-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed guest programming & activity infrastructure',
    shortTitle: 'Guest programming & activity infrastructure',
    focusedQuestion:
      'How will trails, tour routes, workshop spaces, and demonstration areas be designed?',
    checklist: [
      ck(
        'ag-s5-programming-infra-c1',
        'Design farm tour route - waypoints, interpretation, safety',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-programming-infra-c2',
        'Design walking trails - surfaces, grades, waymarking, distances',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-programming-infra-c3',
        'Design workshop and demonstration space - layout, equipment, capacity',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-programming-infra-c4',
        'Design outdoor event or gathering space if applicable',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-programming-infra-c5',
        'Confirm all programming infrastructure meets safety requirements for public access',
        { feeds: ['ag-s6-compliance-monitoring'] },
      ),
      ck(
        'ag-s5-programming-infra-c6',
        'Confirm programming infrastructure serves the Stratum 1 guest experience vision and visitor types',
        { feeds: ['ag-s6-experience-feedback'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s5-programming-infra-dg1', 'Tour & trail routes', [
        'ag-s5-programming-infra-c1',
        'ag-s5-programming-infra-c2',
      ], ['Infrastructure & Access']),
      dg('ag-s5-programming-infra-dg2', 'Workshop & event spaces', [
        'ag-s5-programming-infra-c3',
        'ag-s5-programming-infra-c4',
        'ag-s5-programming-infra-c5',
        'ag-s5-programming-infra-c6',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Guest programming and activity infrastructure design approved.',
    actHandoff: 'Guest Programming & Activity Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the AG-S4.5 hospitality service model programming offer.',
    monitoringProtocol: {
      indicators: [
        'Utilisation of tour routes, trails, and workshop spaces vs. designed capacity',
        'Trail and route condition -- surface wear, grade safety, waymarking legibility',
        'Guest-reported experience quality across the programming offer',
      ],
      triggers: [
        'A trail surface or waymarker degrading to an unsafe or unclear state -> repair or remark that segment',
        'A workshop or gathering space consistently exceeding its designed capacity -> review session sizing or layout',
      ],
      feeds: 'Guest Programming monitoring stream',
    },
  }),
  obj({
    id: 'ag-s5-sanitation-infra',
    stratumId: 's5-system-design',
    ref: 'AG-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed guest bathroom & sanitation infrastructure',
    shortTitle: 'Guest bathroom & sanitation infrastructure',
    focusedQuestion:
      'How will bathrooms, showers, and sanitation facilities be designed at peak guest capacity?',
    checklist: [
      ck(
        'ag-s5-sanitation-infra-c1',
        'Calculate bathroom and toilet fixture requirements at peak guest numbers',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-sanitation-infra-c2',
        'Design bathroom layout and location relative to accommodation',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-sanitation-infra-c3',
        'Specify hot water system capacity for peak guest demand',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-sanitation-infra-c4',
        'Design waste system - septic, composting, or connection to confirm capacity',
        { feeds: ['ag-s6-load-monitoring', 's7-resource-plan'] },
      ),
      ck(
        'ag-s5-sanitation-infra-c5',
        'Confirm sanitation design meets regulatory requirements for accommodation type',
        { feeds: ['ag-s6-compliance-monitoring'] },
      ),
      ck(
        'ag-s5-sanitation-infra-c6',
        'Size fixtures and hot water against the Stratum 3 guest water and sanitation demand assessment',
        { feeds: ['ag-s6-load-monitoring'] },
      ),
    ],
    decisionGroups: [
      dg('ag-s5-sanitation-infra-dg1', 'Fixture & layout sizing', [
        'ag-s5-sanitation-infra-c1',
        'ag-s5-sanitation-infra-c2',
        'ag-s5-sanitation-infra-c3',
        'ag-s5-sanitation-infra-c6',
      ], ['Water & Hydrology']),
      dg('ag-s5-sanitation-infra-dg2', 'Waste system & compliance', [
        'ag-s5-sanitation-infra-c4',
        'ag-s5-sanitation-infra-c5',
      ], ['Water & Hydrology']),
    ],
    completionGate:
      'Guest bathroom and sanitation infrastructure design approved. Peak capacity confirmed.',
    actHandoff: 'Guest Bathroom & Sanitation Infrastructure Design Package',
    monitoringProtocol: {
      indicators: [
        'Fixture and hot-water adequacy vs. observed peak guest demand',
        'Waste-system performance -- septic, composting, or connected capacity vs. load',
        'Sanitation compliance status for the accommodation type',
      ],
      triggers: [
        'Hot water or fixtures failing to meet peak demand -> review capacity sizing against observed loads',
        'A waste system approaching or exceeding its capacity limit -> service it and reassess sizing before peak season',
      ],
      feeds: 'Sanitation monitoring stream',
    },
  }),
  obj({
    id: 'ag-s5-safety-infra',
    stratumId: 's5-system-design',
    ref: 'AG-S5.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Working visitor safety & emergency infrastructure',
    shortTitle: 'Visitor safety & emergency infrastructure',
    focusedQuestion:
      'How will safety signage, first aid, fire equipment, and emergency infrastructure be designed across all guest areas?',
    checklist: [
      ck(
        'ag-s5-safety-infra-c1',
        'Design evacuation signage and route marking for all guest areas',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-safety-infra-c2',
        'Specify fire extinguisher, hose reel, and smoke detector placement',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-safety-infra-c3',
        'Design first aid station locations and equipment specification',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-safety-infra-c4',
        'Design emergency vehicle access points and turning areas',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-safety-infra-c5',
        'Specify hazard identification signage for guest zones',
        { feeds: ['ag-s6-compliance-monitoring'] },
      ),
      ck(
        'ag-s5-safety-infra-c6',
        'Confirm all safety infrastructure meets regulatory requirements',
        { feeds: ['ag-s6-compliance-monitoring'] },
      ),
      ck(
        'ag-s5-safety-infra-c7',
        'Confirm emergency access points align with the Stratum 3 emergency vehicle access and evacuation route survey',
      ),
    ],
    decisionGroups: [
      dg('ag-s5-safety-infra-dg1', 'Evacuation & fire equipment', [
        'ag-s5-safety-infra-c1',
        'ag-s5-safety-infra-c2',
      ], ['Infrastructure & Access']),
      dg('ag-s5-safety-infra-dg2', 'First aid & vehicle access', [
        'ag-s5-safety-infra-c3',
        'ag-s5-safety-infra-c4',
        'ag-s5-safety-infra-c7',
      ], ['Infrastructure & Access']),
      dg('ag-s5-safety-infra-dg3', 'Hazard signage & compliance', [
        'ag-s5-safety-infra-c5',
        'ag-s5-safety-infra-c6',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Visitor safety and emergency infrastructure design approved. Regulatory compliance confirmed.',
    actHandoff: 'Visitor Safety & Emergency Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the AG-S4.7 safety, emergency and compliance framework.',
    monitoringProtocol: {
      indicators: [
        'Safety-equipment readiness -- extinguishers, hose reels, smoke detectors, first-aid stations serviceable',
        'Signage and evacuation-route legibility across all guest areas',
        'Safety-incident and near-miss frequency in guest zones',
      ],
      triggers: [
        'Fire, first-aid, or detection equipment found out of service or expired -> restore it before the next guest arrival',
        'A rising incident or near-miss trend in a zone -> review hazard signage and controls for that zone',
      ],
      feeds: 'Visitor Safety monitoring stream',
    },
  }),
  obj({
    id: 'ag-s5-dispersed-siting',
    stratumId: 's5-system-design',
    ref: 'AG-S5.9',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title:
      'A coherent dispersed low-impact accommodation siting & landscape-integration plan',
    shortTitle: 'Dispersed low-impact siting & landscape integration',
    focusedQuestion:
      'Where do scattered low-impact units (tents, yurts, cabins) sit so they tread lightly, stay reversible, and disappear into the landscape rather than dominating it?',
    checklist: [
      ck(
        'ag-s5-dispersed-siting-c1',
        'Locate candidate unit sites against the AG-S3.7 ecological carrying-capacity and protected-area map',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-dispersed-siting-c2',
        'Minimise ground disturbance per site - favour zero / minimal-foundation platforms over excavation',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-dispersed-siting-c3',
        'Ensure each site is reversible - the land can be returned to its prior state if a unit is removed',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-dispersed-siting-c4',
        'Set inter-unit spacing for guest privacy, sense of immersion, and ecological breathing room',
        { feeds: ['ag-s6-load-monitoring'] },
      ),
      ck(
        'ag-s5-dispersed-siting-c5',
        'Plan low-impact access to each site - foot paths / light tracks rather than engineered roads',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-dispersed-siting-c6',
        'Confirm placement respects the AG-S3.4 sensory-environment read and AG-S3.7 limits',
      ),
      ck(
        'ag-s5-dispersed-siting-c7',
        'Defer per-unit structure design and servicing to AG-S5.4 / AG-S5.10 - this objective owns siting',
      ),
    ],
    decisionGroups: [
      dg(
        'ag-s5-dispersed-siting-dg1',
        'Placement & ground impact',
        [
          'ag-s5-dispersed-siting-c1',
          'ag-s5-dispersed-siting-c2',
          'ag-s5-dispersed-siting-c3',
        ],
        ['Infrastructure & Access'],
      ),
      dg(
        'ag-s5-dispersed-siting-dg2',
        'Spacing & access',
        ['ag-s5-dispersed-siting-c4', 'ag-s5-dispersed-siting-c5'],
        ['Infrastructure & Access'],
      ),
      dg('ag-s5-dispersed-siting-dg3', 'Cross-objective fit', [
        'ag-s5-dispersed-siting-c6',
        'ag-s5-dispersed-siting-c7',
      ]),
    ],
    completionGate:
      'Dispersed siting plan set. Unit locations, spacing, low-impact access, and reversibility defined within ecological limits.',
    actHandoff:
      'Dispersed Low-Impact Accommodation Siting & Landscape-Integration Plan',
    buildsOnDisplay:
      'Builds on the AG-S4.9 guest-to-production biosecurity and contamination-buffer strategy.',
    monitoringProtocol: {
      indicators: [
        'Per-site ground disturbance and reversibility status vs. the light-footprint design',
        'Inter-unit spacing holding the designed privacy and ecological breathing room',
        'Site occupancy and load against the AG-S3.7 carrying-capacity ceiling',
      ],
      triggers: [
        'A site showing creeping ground disturbance or loss of reversibility -> restore the light-footprint condition',
        'Combined site load approaching the carrying-capacity ceiling -> pause further siting and reassess against AG-S3.7 limits',
      ],
      feeds: 'Dispersed Siting monitoring stream',
    },
    scopeNotes:
      'Applies when accommodation is dispersed light-footprint units scattered across the landscape (glamping / eco-cabin model); omit for a single fixed lodge or day-visit-only agritourism. Owns siting and landscape integration only; per-unit structure design stays with AG-S5.4 and servicing with AG-S5.10.',
  }),
  obj({
    id: 'ag-s5-decentralised-servicing',
    stratumId: 's5-system-design',
    ref: 'AG-S5.10',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title:
      'Well-designed decentralised servicing & dark-sky / quiet provisions for dispersed sites',
    shortTitle: 'Decentralised servicing & dark-sky / quiet design',
    focusedQuestion:
      'How is each scattered site watered, powered, and waste-managed at the point of use - while protecting the dark-sky and quiet that are the eco-experience itself?',
    checklist: [
      ck(
        'ag-s5-decentralised-servicing-c1',
        'Design point-of-use water supply per site - local rainwater capture and / or reticulated delivery',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ag-s5-decentralised-servicing-c2',
        'Design greywater / blackwater treatment at or near each site (composting / sealed / on-site treatment)',
        { feeds: ['ag-s6-compliance-monitoring', 's7-resource-plan'] },
      ),
      ck(
        'ag-s5-decentralised-servicing-c3',
        'Provide off-grid power and refrigeration appropriate to dispersed, low-impact sites',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ag-s5-decentralised-servicing-c4',
        'Specify dark-sky-compliant lighting - shielded, warm, minimal - to protect the night-sky experience',
        { feeds: ['ag-s6-experience-feedback'] },
      ),
      ck(
        'ag-s5-decentralised-servicing-c5',
        'Define acoustic-quiet zoning so plant, generators, and guest noise do not break the quiet baseline',
        { feeds: ['ag-s6-load-monitoring'] },
      ),
      ck(
        'ag-s5-decentralised-servicing-c6',
        'Keep all servicing within the AG-S3.3 water / sanitation and AG-S3.7 carrying-capacity limits',
      ),
      ck(
        'ag-s5-decentralised-servicing-c7',
        'Confirm sanitation and discharge designs meet applicable regulation',
        { feeds: ['ag-s6-compliance-monitoring'] },
      ),
    ],
    decisionGroups: [
      dg(
        'ag-s5-decentralised-servicing-dg1',
        'Water & waste at point of use',
        [
          'ag-s5-decentralised-servicing-c1',
          'ag-s5-decentralised-servicing-c2',
          'ag-s5-decentralised-servicing-c7',
        ],
        ['Water & Hydrology'],
      ),
      dg(
        'ag-s5-decentralised-servicing-dg2',
        'Power & refrigeration',
        ['ag-s5-decentralised-servicing-c3'],
        ['Infrastructure & Access'],
      ),
      dg('ag-s5-decentralised-servicing-dg3', 'Dark-sky & quiet', [
        'ag-s5-decentralised-servicing-c4',
        'ag-s5-decentralised-servicing-c5',
      ]),
      dg('ag-s5-decentralised-servicing-dg4', 'Capacity & compliance fit', [
        'ag-s5-decentralised-servicing-c6',
      ]),
    ],
    completionGate:
      'Decentralised servicing designed. Point-of-use water, waste, power, dark-sky lighting, and quiet zoning specified within capacity and regulatory limits.',
    actHandoff: 'Decentralised Servicing & Dark-Sky / Quiet Design Package',
    monitoringProtocol: {
      indicators: [
        'Point-of-use water, power, and refrigeration reliability across dispersed sites',
        'Greywater / blackwater treatment performance and discharge compliance per site',
        'Dark-sky lighting and acoustic-quiet baseline held against the designed limits',
      ],
      triggers: [
        'A site losing water, power, or treatment reliability -> service that point-of-use system before reletting the site',
        'Stray light or plant noise breaching the dark-sky or quiet baseline -> reshield lighting or relocate the noise source',
      ],
      feeds: 'Site Servicing monitoring stream',
    },
    scopeNotes:
      'Applies when servicing dispersed off-grid eco-accommodation (glamping / eco-cabin model); omit for centrally serviced lodges or day-visit agritourism. Turns the AG-S3.3 water / sanitation and AG-S3.4 sensory-environment surveys into design commitments; does not duplicate those reads.',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'ag-s6-experience-feedback',
    stratumId: 's6-integration-design',
    ref: 'AG-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working visitor experience feedback & quality monitor',
    shortTitle: 'Visitor experience feedback & quality monitor',
    focusedQuestion:
      'How will guest satisfaction, repeat visit rate, and experience quality be tracked and improved?',
    checklist: [
      ck(
        'ag-s6-experience-feedback-c1',
        'Design guest feedback collection - post-visit survey, in-person, online reviews',
        { feeds: ['ag-s7-phased-launch'] },
      ),
      ck(
        'ag-s6-experience-feedback-c2',
        'Define guest satisfaction indicators - what metrics define a successful visit',
        { feeds: ['ag-s7-phased-launch'] },
      ),
      ck(
        'ag-s6-experience-feedback-c3',
        'Define repeat visit tracking system',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-experience-feedback-c4',
        'Define review and response protocol for online feedback',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-experience-feedback-c5',
        'Define quality improvement process - how feedback triggers operational changes',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-experience-feedback-c6',
        'Derive satisfaction indicators from the Stratum 1 guest experience vision and hospitality identity',
      ),
    ],
    decisionGroups: [
      dg('ag-s6-experience-feedback-dg1', 'Feedback collection', [
        'ag-s6-experience-feedback-c1',
        'ag-s6-experience-feedback-c4',
      ]),
      dg('ag-s6-experience-feedback-dg2', 'Satisfaction & repeat metrics', [
        'ag-s6-experience-feedback-c2',
        'ag-s6-experience-feedback-c3',
        'ag-s6-experience-feedback-c6',
      ]),
      dg('ag-s6-experience-feedback-dg3', 'Quality improvement loop', [
        'ag-s6-experience-feedback-c5',
      ]),
    ],
    completionGate:
      'Visitor experience feedback and quality monitoring system approved.',
    actHandoff: 'Visitor Experience Feedback & Quality Monitoring System',
  }),
  obj({
    id: 'ag-s6-compliance-monitoring',
    stratumId: 's6-integration-design',
    ref: 'AG-S6.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working external relations & compliance monitor',
    shortTitle: 'External relations & compliance monitor',
    focusedQuestion:
      'How will health and safety audits, food safety compliance, licensing renewals, and neighbour relations be actively managed?',
    checklist: [
      ck(
        'ag-s6-compliance-monitoring-c1',
        'Design compliance calendar - all permit renewal dates, audit schedules, reporting obligations',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-compliance-monitoring-c2',
        'Define compliance monitoring responsibilities - who checks what, when',
        { feeds: ['ag-s7-staffing-training'] },
      ),
      ck(
        'ag-s6-compliance-monitoring-c3',
        'Define neighbour communication rhythm and nominated farm contact',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-compliance-monitoring-c4',
        'Design complaint response process',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-compliance-monitoring-c5',
        'Define annual external relations review',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-compliance-monitoring-c6',
        'Build the compliance calendar from the Stratum 1 regulatory framework permits and renewal obligations',
      ),
    ],
    decisionGroups: [
      dg('ag-s6-compliance-monitoring-dg1', 'Compliance calendar & ownership', [
        'ag-s6-compliance-monitoring-c1',
        'ag-s6-compliance-monitoring-c2',
        'ag-s6-compliance-monitoring-c6',
      ]),
      dg('ag-s6-compliance-monitoring-dg2', 'Neighbour & complaint relations', [
        'ag-s6-compliance-monitoring-c3',
        'ag-s6-compliance-monitoring-c4',
        'ag-s6-compliance-monitoring-c5',
      ]),
    ],
    completionGate:
      'External relations and compliance monitoring system approved. All obligations tracked.',
    actHandoff: 'External Relations & Compliance Monitoring System',
  }),
  obj({
    id: 'ag-s6-food-integration',
    stratumId: 's6-integration-design',
    ref: 'AG-S6.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working farm-to-guest integration feedback loop',
    shortTitle: 'Farm-to-guest integration feedback loop',
    focusedQuestion:
      'How will the farm understand which enterprises are feeding the guest experience - and what gaps need to be filled?',
    // 5 checklist items: c1-c4 verbatim from the v1.0 / Standards v1.3 source
    // (which carries only 4), plus c5 authored under the operator's explicit
    // 2026-05-30 informed override of "don't invent content" to meet the v1.4
    // 5-item floor (deviation resolved; rubric-test allowlist removed). c5
    // closes the feedback loop: the recurring review step over c1-c4's data.
    checklist: [
      ck(
        'ag-s6-food-integration-c1',
        'Design tracking system for farm produce used in guest dining each season',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-food-integration-c2',
        'Define gap tracking - what was sourced externally and at what cost',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-food-integration-c3',
        'Define seasonal menu planning process connected to farm production calendar',
        { feeds: ['ag-s7-seasonal-resilience'] },
      ),
      ck(
        'ag-s6-food-integration-c4',
        'Define farm production adjustment protocol when guest demand reveals gaps',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-food-integration-c5',
        'Define review cadence and owner for the farm-to-guest loop - who reviews produce tracking and gap data each season and decides next-season adjustments',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-food-integration-c6',
        'Baseline produce and gap tracking against the Stratum 3 food production capacity survey',
      ),
    ],
    decisionGroups: [
      dg('ag-s6-food-integration-dg1', 'Produce & gap tracking', [
        'ag-s6-food-integration-c1',
        'ag-s6-food-integration-c2',
        'ag-s6-food-integration-c6',
      ]),
      dg('ag-s6-food-integration-dg2', 'Menu planning & adjustment', [
        'ag-s6-food-integration-c3',
        'ag-s6-food-integration-c4',
      ]),
      dg('ag-s6-food-integration-dg3', 'Review loop', [
        'ag-s6-food-integration-c5',
      ]),
    ],
    completionGate:
      'Farm-to-guest integration feedback loop designed. Produce tracking and gap protocol confirmed.',
    actHandoff: 'Farm-to-Guest Integration Feedback System',
  }),
  obj({
    id: 'ag-s6-load-monitoring',
    stratumId: 's6-integration-design',
    ref: 'AG-S6.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working capacity & operational load monitor',
    shortTitle: 'Capacity & operational load monitor',
    focusedQuestion:
      'How will actual guest numbers, infrastructure load, and staff capacity be tracked to prevent drift beyond sustainable limits?',
    checklist: [
      ck(
        'ag-s6-load-monitoring-c1',
        'Define capacity tracking system - actual vs. intended guest numbers by period',
        { feeds: ['ag-s7-phased-launch'] },
      ),
      ck(
        'ag-s6-load-monitoring-c2',
        'Define infrastructure load indicators - water use, sanitation load, parking utilisation',
        { feeds: ['ag-s7-adaptive-management'] },
      ),
      ck(
        'ag-s6-load-monitoring-c3',
        'Define staff workload monitoring - hours, task completion, incident rate',
        { feeds: ['ag-s7-staffing-training'] },
      ),
      ck(
        'ag-s6-load-monitoring-c4',
        'Define capacity threshold triggers - what load level initiates a booking pause or operational review',
        { feeds: ['ag-s7-phased-launch', 'ag-s7-seasonal-resilience'] },
      ),
      ck(
        'ag-s6-load-monitoring-c5',
        'Define annual capacity review against Stratum 1 operational boundary',
      ),
    ],
    decisionGroups: [
      dg('ag-s6-load-monitoring-dg1', 'Capacity & load indicators', [
        'ag-s6-load-monitoring-c1',
        'ag-s6-load-monitoring-c2',
      ]),
      dg('ag-s6-load-monitoring-dg2', 'Staff workload & triggers', [
        'ag-s6-load-monitoring-c3',
        'ag-s6-load-monitoring-c4',
      ]),
      dg('ag-s6-load-monitoring-dg3', 'Annual capacity review', [
        'ag-s6-load-monitoring-c5',
      ]),
    ],
    completionGate:
      'Capacity and operational load monitoring system approved. Threshold triggers confirmed.',
    actHandoff: 'Capacity & Operational Load Monitoring System',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'ag-s7-staffing-training',
    stratumId: 's7-phasing-resourcing',
    ref: 'AG-S7.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear hospitality staffing & training plan',
    shortTitle: 'Hospitality staffing & training plan',
    focusedQuestion:
      'Who runs guest services, food preparation, and programming - and what training must be complete before first guests arrive?',
    checklist: [
      ck(
        'ag-s7-staffing-training-c1',
        'Define staffing requirements for each guest service area',
      ),
      ck(
        'ag-s7-staffing-training-c2',
        'Identify training requirements - food safety certification, first aid, hospitality service',
      ),
      ck(
        'ag-s7-staffing-training-c3',
        'Define recruitment timeline relative to guest program launch',
      ),
      ck(
        'ag-s7-staffing-training-c4',
        'Define staff orientation and guest service standards training',
      ),
      ck(
        'ag-s7-staffing-training-c5',
        'Confirm all required certifications are obtained before first guest arrival',
      ),
      ck(
        'ag-s7-staffing-training-c6',
        'Align recruitment timing with the Stratum 2 peak season and operating weeks findings',
      ),
    ],
    decisionGroups: [
      dg('ag-s7-staffing-training-dg1', 'Staffing & recruitment', [
        'ag-s7-staffing-training-c1',
        'ag-s7-staffing-training-c3',
        'ag-s7-staffing-training-c6',
      ]),
      dg('ag-s7-staffing-training-dg2', 'Training & certification', [
        'ag-s7-staffing-training-c2',
        'ag-s7-staffing-training-c4',
        'ag-s7-staffing-training-c5',
      ]),
    ],
    completionGate:
      'Staffing and training plan approved. All required certifications confirmed before launch.',
    actHandoff: 'Hospitality Staffing & Training Plan',
  }),
  obj({
    id: 'ag-s7-booking-system',
    stratumId: 's7-phasing-resourcing',
    ref: 'AG-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A ready booking system & reservation infrastructure',
    shortTitle: 'Booking system & reservation infrastructure',
    focusedQuestion:
      'How will guests book, pay, and receive confirmation - and what platform and process supports this?',
    checklist: [
      ck(
        'ag-s7-booking-system-c1',
        'Select booking platform - purpose-built, general platform, or direct booking',
      ),
      ck(
        'ag-s7-booking-system-c2',
        'Define payment processing and deposit collection system',
      ),
      ck(
        'ag-s7-booking-system-c3',
        'Design booking confirmation and pre-arrival communication',
      ),
      ck(
        'ag-s7-booking-system-c4',
        'Define reservation management process - availability, modifications, cancellations',
      ),
      ck(
        'ag-s7-booking-system-c5',
        'Confirm booking system is operational before any marketing begins',
      ),
      ck(
        'ag-s7-booking-system-c6',
        'Confirm availability settings enforce the Stratum 1 visitor capacity and visit type limits',
      ),
    ],
    decisionGroups: [
      dg('ag-s7-booking-system-dg1', 'Platform & payment', [
        'ag-s7-booking-system-c1',
        'ag-s7-booking-system-c2',
      ]),
      dg('ag-s7-booking-system-dg2', 'Confirmation & reservation management', [
        'ag-s7-booking-system-c3',
        'ag-s7-booking-system-c4',
        'ag-s7-booking-system-c5',
        'ag-s7-booking-system-c6',
      ]),
    ],
    completionGate:
      'Booking system and reservation infrastructure operational. Confirmed before marketing launch.',
    actHandoff: 'Booking System & Reservation Infrastructure',
  }),
  obj({
    id: 'ag-s7-phased-launch',
    stratumId: 's7-phasing-resourcing',
    ref: 'AG-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound phased launch & financial viability plan',
    shortTitle: 'Phased launch & financial viability plan',
    focusedQuestion:
      'How will the guest enterprise launch in stages - and what financial milestones confirm it is viable to proceed?',
    checklist: [
      ck(
        'ag-s7-phased-launch-c1',
        'Define soft launch scope - limited capacity, limited programming, invited guests or low-profile bookings - HARD GATE: no public bookings until soft launch criteria are met and reviewed',
      ),
      ck(
        'ag-s7-phased-launch-c2',
        'Define soft launch review criteria - explicit pass/fail checklist that must be signed off before full public launch',
      ),
      ck(
        'ag-s7-phased-launch-c3',
        'Define full launch capacity and programming',
      ),
      ck(
        'ag-s7-phased-launch-c4',
        'Map revenue ramp-up against break-even timeline from Stratum 4 revenue model',
      ),
      ck(
        'ag-s7-phased-launch-c5',
        'Define financial viability review trigger - occupancy rate or revenue threshold that initiates a model review',
      ),
      ck(
        'ag-s7-phased-launch-c6',
        'Define go/no-go criteria for scaling beyond Phase 1',
      ),
      ck(
        'ag-s7-phased-launch-c7',
        'Confirm full launch capacity stays within the Stratum 1 visitor capacity and seasonal limits',
      ),
    ],
    decisionGroups: [
      dg('ag-s7-phased-launch-dg1', 'Soft launch & gate', [
        'ag-s7-phased-launch-c1',
        'ag-s7-phased-launch-c2',
      ]),
      dg('ag-s7-phased-launch-dg2', 'Full launch & ramp-up', [
        'ag-s7-phased-launch-c3',
        'ag-s7-phased-launch-c4',
        'ag-s7-phased-launch-c7',
      ]),
      dg('ag-s7-phased-launch-dg3', 'Viability & scaling gates', [
        'ag-s7-phased-launch-c5',
        'ag-s7-phased-launch-c6',
      ]),
    ],
    completionGate:
      'Phased launch and financial viability plan approved. Soft launch criteria defined as explicit pass/fail checklist - hard gate before any public bookings.',
    actHandoff: 'Phased Launch & Financial Viability Plan',
  }),
  obj({
    id: 'ag-s7-adaptive-management',
    stratumId: 's7-phasing-resourcing',
    ref: 'AG-S7.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound adaptive management protocol',
    shortTitle: 'Adaptive management protocol',
    focusedQuestion:
      'How will monitoring findings trigger changes to the guest enterprise and farm management plan?',
    checklist: [
      ck(
        'ag-s7-adaptive-management-c1',
        'Define annual review process - guest experience data, financial data, land health data reviewed together',
      ),
      ck(
        'ag-s7-adaptive-management-c2',
        'Define decision triggers - what outcomes require a plan or model change',
      ),
      ck(
        'ag-s7-adaptive-management-c3',
        'Define escalation process for unexpected events - safety incident, compliance breach, significant guest complaint',
      ),
      ck(
        'ag-s7-adaptive-management-c4',
        'Specify documentation requirements for all management changes',
      ),
      ck(
        'ag-s7-adaptive-management-c5',
        'Define 3-year comprehensive review against Stratum 1 vision and commercial model',
      ),
    ],
    decisionGroups: [
      dg('ag-s7-adaptive-management-dg1', 'Review cadence', [
        'ag-s7-adaptive-management-c1',
        'ag-s7-adaptive-management-c5',
      ]),
      dg('ag-s7-adaptive-management-dg2', 'Triggers & escalation', [
        'ag-s7-adaptive-management-c2',
        'ag-s7-adaptive-management-c3',
      ]),
      dg('ag-s7-adaptive-management-dg3', 'Documentation', [
        'ag-s7-adaptive-management-c4',
      ]),
    ],
    completionGate:
      'Adaptive management protocol approved. Review cycle, triggers, and documentation confirmed.',
    actHandoff: 'Adaptive Management Protocol',
  }),
  obj({
    id: 'ag-s7-seasonal-resilience',
    stratumId: 's7-phasing-resourcing',
    ref: 'AG-S7.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title:
      'A sound seasonal-occupancy resilience & off-season resourcing plan',
    shortTitle: 'Seasonal-occupancy resilience & off-season resourcing',
    focusedQuestion:
      'How does the operation carry itself - financially, operationally, and ecologically - through the off-season trough rather than only the peak?',
    checklist: [
      ck(
        'ag-s7-seasonal-resilience-c1',
        'Plan off-season maintenance and land-recovery windows when guest pressure lifts',
      ),
      ck(
        'ag-s7-seasonal-resilience-c2',
        'Design the seasonal staffing cycle - retention, scaling down, and re-hire ahead of peak',
      ),
      ck(
        'ag-s7-seasonal-resilience-c3',
        'Buffer cash flow across the peak-to-trough swing so fixed costs are met off-season',
      ),
      ck(
        'ag-s7-seasonal-resilience-c4',
        'Define mothballing / partial-closure protocols for units taken offline in the low season',
      ),
      ck(
        'ag-s7-seasonal-resilience-c5',
        'Identify complementary off-season uses (events, education, maintenance retreats) that fit capacity limits',
      ),
      ck(
        'ag-s7-seasonal-resilience-c6',
        'Confirm the plan is consistent with the AG-S2.8 seasonal-pattern read and AG-S7.6 viability model',
      ),
    ],
    decisionGroups: [
      dg('ag-s7-seasonal-resilience-dg1', 'Off-season operations', [
        'ag-s7-seasonal-resilience-c1',
        'ag-s7-seasonal-resilience-c4',
        'ag-s7-seasonal-resilience-c5',
      ]),
      dg('ag-s7-seasonal-resilience-dg2', 'Staffing & cash flow', [
        'ag-s7-seasonal-resilience-c2',
        'ag-s7-seasonal-resilience-c3',
      ]),
      dg('ag-s7-seasonal-resilience-dg3', 'Cross-objective fit', [
        'ag-s7-seasonal-resilience-c6',
      ]),
    ],
    completionGate:
      'Seasonal resilience plan set. Off-season maintenance, staffing cycle, cash-flow buffering, and complementary uses defined within capacity and viability limits.',
    actHandoff: 'Seasonal-Occupancy Resilience & Off-Season Resourcing Plan',
    scopeNotes:
      "Applies when occupancy is strongly seasonal (the eco-resort / glamping pattern); omit for steady year-round operations. This is operational planning, not a sales surface - it introduces no season-pass, advance multi-night package, or membership prepayment. Should the operator later want such an instrument (now scoped at AG-S4.8), it must be encoded verbatim and carry an Amanah scopeNote (bay' ma laysa 'indak / gharar - no advance sale of undelivered nights) and go to Scholar Council review; it is not assumed here.",
  }),
];

// catalogues/agritourism.ts
//
// Agritourism / Retreat / Experience Destination PRIMARY-type objectives - the
// 29 type-specific objectives an Agritourism project adds on top of the 19
// Universal objectives (OLOS Agritourism / Retreat Objective Catalogue).
//
// This file holds ONLY the primary-layer objectives. The universal slot lives
// in ./universal.ts (the shared baseline).
//
// Primary-only note: the source header table lists the role as "Primary or
// Secondary", and projectTypes.ts marks agritourism canBeSecondary: true. BUT
// this catalogue document contains only a primary-layer catalogue (19 universal
// references + 29 standalone primary objectives) - there is no secondary-layer
// section, no additive-as-secondary objectives, and no patch records. So
// agritourism is registered in getPrimaryCatalogue only, exactly like
// regenFarm / ecovillage. Its can-be-secondary capability would be exercised by
// a SEPARATE Agritourism-secondary-layer spec (additive objectives + patches
// targeting another primary), which is not in hand. We do not invent one.
//
// Count note: 19 universal + 29 primary = 48 total. The per-tier primary
// sub-headers (3+4+4+5+5+4+4 = 29) and the complete objective index both confirm
// 29, and the index carries NO duplicate refs - AG-T<tier>.<n> runs cleanly
// 0.1-0.6, 1.1-1.8, 2.1-2.6, 3.1-3.8, 4.1-4.8, 5.1-5.5, 6.1-6.7.
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
    focusedQuestion:
      "What do guests experience here, what do they pay for, and what is the farm's hospitality identity?",
    checklist: [
      ck(
        'ag-s1-experience-vision-c1',
        'Define the core guest experience in plain language - what makes this farm distinct',
      ),
      ck(
        'ag-s1-experience-vision-c2',
        'Identify visitor types - day visitors, overnight guests, retreat participants, school groups',
      ),
      ck(
        'ag-s1-experience-vision-c3',
        'Define the commercial proposition - what is offered and at what price point',
      ),
      ck(
        'ag-s1-experience-vision-c4',
        "Define the farm's hospitality identity - authentic farm stay, luxury retreat, educational experience",
      ),
      ck(
        'ag-s1-experience-vision-c5',
        'Confirm the commercial model is achievable within steward capacity',
      ),
      ck(
        'ag-s1-experience-vision-c6',
        'Record what will never be compromised for commercial gain',
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
    focusedQuestion:
      'How many guests can this farm host at any one time - and what operational constraints define that limit?',
    checklist: [
      ck(
        'ag-s1-visitor-capacity-c1',
        'Define maximum simultaneous guest capacity - accommodation, dining, programming',
      ),
      ck(
        'ag-s1-visitor-capacity-c2',
        'Define visit type limits - maximum day visitors, overnight guests, event attendees',
      ),
      ck(
        'ag-s1-visitor-capacity-c3',
        'Define operational boundaries - what farm activities are incompatible with guest presence',
      ),
      ck(
        'ag-s1-visitor-capacity-c4',
        'Define seasonal capacity variation - peak and off-peak limits',
      ),
      ck(
        'ag-s1-visitor-capacity-c5',
        'Confirm capacity is consistent with regulatory requirements and infrastructure potential',
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
    focusedQuestion:
      'What permits, licences, and compliance frameworks must be in place before guests arrive?',
    checklist: [
      ck(
        'ag-s1-regulatory-framework-c1',
        'Identify food service permit requirements - preparation, service, storage',
      ),
      ck(
        'ag-s1-regulatory-framework-c2',
        'Identify accommodation licensing requirements for intended accommodation type',
      ),
      ck(
        'ag-s1-regulatory-framework-c3',
        'Define public liability insurance requirements and coverage',
      ),
      ck(
        'ag-s1-regulatory-framework-c4',
        'Identify health and safety compliance requirements for public access',
      ),
      ck(
        'ag-s1-regulatory-framework-c5',
        'Identify any resource consent requirements for visitor infrastructure',
      ),
      ck(
        'ag-s1-regulatory-framework-c6',
        'Define compliance calendar - renewal dates and ongoing obligations',
      ),
      ck(
        'ag-s1-regulatory-framework-c7',
        'Obtain legal or compliance advice before any guest-facing infrastructure is built',
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
    focusedQuestion:
      'How do guests currently arrive - and what is the quality of the approach, entry, and first impression?',
    checklist: [
      ck(
        'ag-s2-arrival-experience-c1',
        'Assess road quality and signage from nearest main road to property entry',
      ),
      ck(
        'ag-s2-arrival-experience-c2',
        'Assess parking capacity and surface quality',
      ),
      ck(
        'ag-s2-arrival-experience-c3',
        'Assess entry gate, driveway, and approach aesthetic',
      ),
      ck(
        'ag-s2-arrival-experience-c4',
        'Identify safety hazards on arrival route - blind corners, livestock crossings, overhead clearance',
      ),
      ck(
        'ag-s2-arrival-experience-c5',
        'Record first impression sequence - what does a guest see from the moment they arrive',
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
    focusedQuestion:
      'What accommodation, kitchen, bathroom, and gathering infrastructure already exists - and what is its condition and reuse potential?',
    checklist: [
      ck(
        'ag-s2-hospitality-infra-c1',
        'Inventory all existing accommodation - rooms, cabins, outbuildings - with condition assessment',
      ),
      ck(
        'ag-s2-hospitality-infra-c2',
        'Assess existing kitchen and food preparation infrastructure',
      ),
      ck(
        'ag-s2-hospitality-infra-c3',
        'Assess existing bathroom and toilet facilities',
      ),
      ck(
        'ag-s2-hospitality-infra-c4',
        'Assess existing gathering spaces - indoor and outdoor',
      ),
      ck(
        'ag-s2-hospitality-infra-c5',
        'Identify reuse, renovation, or demolition requirements for each element',
      ),
      ck(
        'ag-s2-hospitality-infra-c6',
        'Estimate renovation cost for highest-potential reuse items',
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
    focusedQuestion:
      'How does the surrounding landscape shape the guest experience - visual amenity, noise, neighbouring activities - and what contamination risks apply?',
    checklist: [
      ck('ag-s2-landscape-context-c1', 'Map surrounding land uses within 2km'),
      ck(
        'ag-s2-landscape-context-c2',
        'Identify visual amenity values and any eyesores visible from guest areas',
      ),
      ck(
        'ag-s2-landscape-context-c3',
        'Identify noise sources from neighbouring properties and roads',
      ),
      ck(
        'ag-s2-landscape-context-c4',
        'Assess drinking water catchment contamination risk from surrounding landscape vectors',
      ),
      ck(
        'ag-s2-landscape-context-c5',
        'Record any neighbouring activities that could affect guest experience - spray drift, dust, traffic',
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
    focusedQuestion:
      'When can guests actually visit - what seasons, weather conditions, and farming activities enable or limit access?',
    checklist: [
      ck(
        'ag-s2-seasonal-patterns-c1',
        'Define peak guest season by climate and farm calendar',
      ),
      ck(
        'ag-s2-seasonal-patterns-c2',
        'Define off-peak periods and their limiting factors - weather, farm activity, access',
      ),
      ck(
        'ag-s2-seasonal-patterns-c3',
        'Identify farm activities that are incompatible with simultaneous guest presence',
      ),
      ck(
        'ag-s2-seasonal-patterns-c4',
        'Map farming calendar against potential guest programming calendar',
      ),
      ck(
        'ag-s2-seasonal-patterns-c5',
        'Define minimum and maximum viable operating weeks per year',
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
    focusedQuestion:
      'What water supply and sanitation capacity is required at peak guest numbers - and does the site support it?',
    checklist: [
      ck(
        'ag-s3-water-sanitation-demand-c1',
        'Calculate water demand at peak guest capacity - domestic, kitchen, bathroom, irrigation',
      ),
      ck(
        'ag-s3-water-sanitation-demand-c2',
        'Assess available water source yield for combined farm and guest demand',
      ),
      ck(
        'ag-s3-water-sanitation-demand-c3',
        'Identify water quality requirements for food service and accommodation',
      ),
      ck(
        'ag-s3-water-sanitation-demand-c4',
        'Assess on-site sanitation capacity - septic, composting, or connection to municipal system',
      ),
      ck(
        'ag-s3-water-sanitation-demand-c5',
        'Identify regulatory requirements for guest sanitation infrastructure',
      ),
      ck(
        'ag-s3-water-sanitation-demand-c6',
        'Define maximum guest capacity supportable by available water and sanitation',
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
    focusedQuestion:
      'What will guests see, hear, and experience - and what sensory conditions support or undermine the guest experience vision?',
    checklist: [
      ck(
        'ag-s3-sensory-environment-c1',
        'Record ambient noise levels across the site by season and time of day',
      ),
      ck(
        'ag-s3-sensory-environment-c2',
        'Identify farm operational noises that could affect guest experience',
      ),
      ck(
        'ag-s3-sensory-environment-c3',
        'Map visual amenity from proposed guest areas - views, screening needs',
      ),
      ck(
        'ag-s3-sensory-environment-c4',
        'Identify odour sources - livestock, composting, machinery - relative to guest zones',
      ),
      ck(
        'ag-s3-sensory-environment-c5',
        'Assess privacy conditions in proposed accommodation locations',
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
    focusedQuestion:
      'What are the emergency access, evacuation, and safety conditions that must be resolved before public access begins?',
    checklist: [
      ck(
        'ag-s3-emergency-access-c1',
        'Map emergency vehicle access routes to all guest areas',
      ),
      ck(
        'ag-s3-emergency-access-c2',
        'Identify evacuation routes for fire, flood, and other emergencies',
      ),
      ck(
        'ag-s3-emergency-access-c3',
        'Assess first aid access and response time from nearest medical facility',
      ),
      ck(
        'ag-s3-emergency-access-c4',
        'Identify safety hazards across all areas guests will access - terrain, machinery, animals',
      ),
      ck(
        'ag-s3-emergency-access-c5',
        'Assess fire risk and evacuation complexity',
      ),
      ck(
        'ag-s3-emergency-access-c6',
        'Confirm emergency access meets regulatory requirements for public accommodation',
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
    focusedQuestion:
      'What is already growing on this land that can feed the guest experience - and what gaps exist?',
    checklist: [
      ck(
        'ag-s3-food-production-capacity-c1',
        'Inventory all current food-producing elements - gardens, orchards, animals',
      ),
      ck(
        'ag-s3-food-production-capacity-c2',
        'Assess current yield potential by enterprise',
      ),
      ck(
        'ag-s3-food-production-capacity-c3',
        'Identify seasonal production gaps relative to intended guest dining calendar',
      ),
      ck(
        'ag-s3-food-production-capacity-c4',
        'Assess food storage, preservation, and preparation infrastructure',
      ),
      ck(
        'ag-s3-food-production-capacity-c5',
        'Define what additional production is required to support intended hospitality model',
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
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'ag-s4-circulation-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'AG-S4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A coherent guest experience zones & circulation strategy',
    focusedQuestion:
      'Where exactly do guests go, what route do they take, and how is privacy and safety managed throughout?',
    checklist: [
      ck(
        'ag-s4-circulation-strategy-c1',
        'Define accessible guest zones - accommodation, dining, trails, demonstration areas',
      ),
      ck(
        'ag-s4-circulation-strategy-c2',
        'Define visitor circulation route - arrival, orientation, experience sequence, departure',
      ),
      ck(
        'ag-s4-circulation-strategy-c3',
        'Define hard boundaries between guest zones and farm operations',
      ),
      ck(
        'ag-s4-circulation-strategy-c4',
        'Define signage and wayfinding approach',
      ),
      ck(
        'ag-s4-circulation-strategy-c5',
        'Define supervised vs. self-guided zones',
      ),
      ck(
        'ag-s4-circulation-strategy-c6',
        'Confirm circulation route is compatible with emergency evacuation requirements',
      ),
    ],
    decisionGroups: [
      dg('ag-s4-circulation-strategy-dg1', 'Guest zones & route', [
        'ag-s4-circulation-strategy-c1',
        'ag-s4-circulation-strategy-c2',
        'ag-s4-circulation-strategy-c5',
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
  }),
  obj({
    id: 'ag-s4-service-model',
    stratumId: 's4-foundation-decisions',
    ref: 'AG-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear hospitality service model',
    focusedQuestion:
      'What food, accommodation, and programming is offered - and at what service standard?',
    checklist: [
      ck(
        'ag-s4-service-model-c1',
        'Define accommodation types and standards - farm stay rooms, cabins, glamping',
      ),
      ck(
        'ag-s4-service-model-c2',
        'Define dining model - farm breakfast, shared dinners, self-catering, or hybrid',
      ),
      ck(
        'ag-s4-service-model-c3',
        'Define programming offer - farm tours, workshops, retreats, harvest experiences',
      ),
      ck(
        'ag-s4-service-model-c4',
        'Define service standard for each offering - what is included, what is extra',
      ),
      ck(
        'ag-s4-service-model-c5',
        'Confirm service model is achievable within steward capacity and licensing framework',
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
      ]),
    ],
    completionGate:
      'Hospitality service model approved. All offerings defined against capacity and compliance constraints.',
    actHandoff: 'Hospitality Service Model Brief',
  }),
  obj({
    id: 'ag-s4-food-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'AG-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound farm-to-guest food production strategy',
    focusedQuestion:
      'Which farm enterprises feed the guest experience - and how is farm production integrated into hospitality?',
    checklist: [
      ck(
        'ag-s4-food-strategy-c1',
        'Map current farm production against guest dining calendar - what is available when',
      ),
      ck(
        'ag-s4-food-strategy-c2',
        'Define priority enterprises for guest food supply - vegetables, eggs, meat, dairy, fruit',
      ),
      ck(
        'ag-s4-food-strategy-c3',
        'Define food production gaps and sourcing strategy for gaps - local farms, suppliers',
      ),
      ck(
        'ag-s4-food-strategy-c4',
        'Define food preparation approach - farm kitchen standards, preservation, seasonal menus',
      ),
      ck(
        'ag-s4-food-strategy-c5',
        'Confirm farm-to-guest supply chain is consistent with food safety requirements',
      ),
    ],
    decisionGroups: [
      dg('ag-s4-food-strategy-dg1', 'Production-to-menu mapping', [
        'ag-s4-food-strategy-c1',
        'ag-s4-food-strategy-c2',
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
  }),
  obj({
    id: 'ag-s4-safety-compliance',
    stratumId: 's4-foundation-decisions',
    ref: 'AG-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound safety, emergency & compliance framework',
    focusedQuestion:
      'What safety systems, emergency protocols, and compliance obligations must be in place before any guest arrives?',
    checklist: [
      ck(
        'ag-s4-safety-compliance-c1',
        'Define fire evacuation plan for all guest areas',
      ),
      ck(
        'ag-s4-safety-compliance-c2',
        'Define first aid protocol - trained personnel, equipment, emergency contacts',
      ),
      ck(
        'ag-s4-safety-compliance-c3',
        'Define hazard identification and management system for all guest zones',
      ),
      ck(
        'ag-s4-safety-compliance-c4',
        'Define food safety management plan for all food service activities',
      ),
      ck(
        'ag-s4-safety-compliance-c5',
        'Define public liability coverage requirements and confirm insurance',
      ),
      ck(
        'ag-s4-safety-compliance-c6',
        'Confirm all compliance obligations are met before first guest arrival',
      ),
    ],
    decisionGroups: [
      dg('ag-s4-safety-compliance-dg1', 'Emergency & first aid', [
        'ag-s4-safety-compliance-c1',
        'ag-s4-safety-compliance-c2',
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
    focusedQuestion:
      'How do guests book, what do they pay, and what financial model makes this enterprise viable?',
    checklist: [
      ck(
        'ag-s4-revenue-model-c1',
        'Define pricing for each experience offering',
      ),
      ck(
        'ag-s4-revenue-model-c2',
        'Define booking terms - advance booking, deposits, cancellation policy',
      ),
      ck(
        'ag-s4-revenue-model-c3',
        'Define peak and off-peak pricing strategy',
      ),
      ck(
        'ag-s4-revenue-model-c4',
        'Calculate minimum viable occupancy rate for financial viability',
      ),
      ck(
        'ag-s4-revenue-model-c5',
        'Define revenue targets for Phase 1 and break-even timeline',
      ),
      ck(
        'ag-s4-revenue-model-c6',
        'Confirm pricing is consistent with market comparables and service standard',
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
      ]),
    ],
    completionGate:
      'Booking, pricing, and revenue model approved. Break-even timeline and minimum occupancy confirmed.',
    actHandoff: 'Booking, Pricing & Revenue Model Brief',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'ag-s5-accommodation',
    stratumId: 's5-system-design',
    ref: 'AG-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed guest accommodation & retreat infrastructure',
    focusedQuestion:
      'How will guest accommodation be designed - sized to capacity, consistent with experience vision and compliance requirements?',
    checklist: [
      ck(
        'ag-s5-accommodation-c1',
        'Design accommodation layout - room configuration, cabin placement, glamping site layout',
      ),
      ck(
        'ag-s5-accommodation-c2',
        'Specify construction or renovation standard for each accommodation type',
      ),
      ck(
        'ag-s5-accommodation-c3',
        'Design thermal performance - insulation, heating, cooling',
      ),
      ck(
        'ag-s5-accommodation-c4',
        'Design guest room amenities to defined service standard',
      ),
      ck(
        'ag-s5-accommodation-c5',
        'Confirm accommodation design meets building code and accommodation licensing requirements',
      ),
      ck(
        'ag-s5-accommodation-c6',
        'Confirm accommodation capacity matches Stratum 1 visitor capacity definition',
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
  }),
  obj({
    id: 'ag-s5-dining-infra',
    stratumId: 's5-system-design',
    ref: 'AG-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed guest dining & food service infrastructure',
    focusedQuestion:
      'How will farm kitchen, dining, and food service infrastructure be designed to food safety standard?',
    checklist: [
      ck(
        'ag-s5-dining-infra-c1',
        'Design farm kitchen layout - preparation, cooking, storage, wash-up',
      ),
      ck(
        'ag-s5-dining-infra-c2',
        'Specify kitchen equipment to food service permit standard',
      ),
      ck(
        'ag-s5-dining-infra-c3',
        'Design dining area - capacity, layout, indoor/outdoor options',
      ),
      ck(
        'ag-s5-dining-infra-c4',
        'Design food storage - cool room, dry store, preservation',
      ),
      ck(
        'ag-s5-dining-infra-c5',
        'Confirm kitchen and dining design meets food safety compliance requirements',
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
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Dining and food service infrastructure design approved. Food safety compliance confirmed.',
    actHandoff: 'Guest Dining & Food Service Infrastructure Design Package',
  }),
  obj({
    id: 'ag-s5-programming-infra',
    stratumId: 's5-system-design',
    ref: 'AG-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed guest programming & activity infrastructure',
    focusedQuestion:
      'How will trails, tour routes, workshop spaces, and demonstration areas be designed?',
    checklist: [
      ck(
        'ag-s5-programming-infra-c1',
        'Design farm tour route - waypoints, interpretation, safety',
      ),
      ck(
        'ag-s5-programming-infra-c2',
        'Design walking trails - surfaces, grades, waymarking, distances',
      ),
      ck(
        'ag-s5-programming-infra-c3',
        'Design workshop and demonstration space - layout, equipment, capacity',
      ),
      ck(
        'ag-s5-programming-infra-c4',
        'Design outdoor event or gathering space if applicable',
      ),
      ck(
        'ag-s5-programming-infra-c5',
        'Confirm all programming infrastructure meets safety requirements for public access',
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
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Guest programming and activity infrastructure design approved.',
    actHandoff: 'Guest Programming & Activity Infrastructure Design Package',
  }),
  obj({
    id: 'ag-s5-sanitation-infra',
    stratumId: 's5-system-design',
    ref: 'AG-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed guest bathroom & sanitation infrastructure',
    focusedQuestion:
      'How will bathrooms, showers, and sanitation facilities be designed at peak guest capacity?',
    checklist: [
      ck(
        'ag-s5-sanitation-infra-c1',
        'Calculate bathroom and toilet fixture requirements at peak guest numbers',
      ),
      ck(
        'ag-s5-sanitation-infra-c2',
        'Design bathroom layout and location relative to accommodation',
      ),
      ck(
        'ag-s5-sanitation-infra-c3',
        'Specify hot water system capacity for peak guest demand',
      ),
      ck(
        'ag-s5-sanitation-infra-c4',
        'Design waste system - septic, composting, or connection to confirm capacity',
      ),
      ck(
        'ag-s5-sanitation-infra-c5',
        'Confirm sanitation design meets regulatory requirements for accommodation type',
      ),
    ],
    decisionGroups: [
      dg('ag-s5-sanitation-infra-dg1', 'Fixture & layout sizing', [
        'ag-s5-sanitation-infra-c1',
        'ag-s5-sanitation-infra-c2',
        'ag-s5-sanitation-infra-c3',
      ], ['Water & Hydrology']),
      dg('ag-s5-sanitation-infra-dg2', 'Waste system & compliance', [
        'ag-s5-sanitation-infra-c4',
        'ag-s5-sanitation-infra-c5',
      ], ['Water & Hydrology']),
    ],
    completionGate:
      'Guest bathroom and sanitation infrastructure design approved. Peak capacity confirmed.',
    actHandoff: 'Guest Bathroom & Sanitation Infrastructure Design Package',
  }),
  obj({
    id: 'ag-s5-safety-infra',
    stratumId: 's5-system-design',
    ref: 'AG-S5.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Working visitor safety & emergency infrastructure',
    focusedQuestion:
      'How will safety signage, first aid, fire equipment, and emergency infrastructure be designed across all guest areas?',
    checklist: [
      ck(
        'ag-s5-safety-infra-c1',
        'Design evacuation signage and route marking for all guest areas',
      ),
      ck(
        'ag-s5-safety-infra-c2',
        'Specify fire extinguisher, hose reel, and smoke detector placement',
      ),
      ck(
        'ag-s5-safety-infra-c3',
        'Design first aid station locations and equipment specification',
      ),
      ck(
        'ag-s5-safety-infra-c4',
        'Design emergency vehicle access points and turning areas',
      ),
      ck(
        'ag-s5-safety-infra-c5',
        'Specify hazard identification signage for guest zones',
      ),
      ck(
        'ag-s5-safety-infra-c6',
        'Confirm all safety infrastructure meets regulatory requirements',
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
      ], ['Infrastructure & Access']),
      dg('ag-s5-safety-infra-dg3', 'Hazard signage & compliance', [
        'ag-s5-safety-infra-c5',
        'ag-s5-safety-infra-c6',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Visitor safety and emergency infrastructure design approved. Regulatory compliance confirmed.',
    actHandoff: 'Visitor Safety & Emergency Infrastructure Design Package',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'ag-s6-experience-feedback',
    stratumId: 's6-integration-design',
    ref: 'AG-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working visitor experience feedback & quality monitor',
    focusedQuestion:
      'How will guest satisfaction, repeat visit rate, and experience quality be tracked and improved?',
    checklist: [
      ck(
        'ag-s6-experience-feedback-c1',
        'Design guest feedback collection - post-visit survey, in-person, online reviews',
      ),
      ck(
        'ag-s6-experience-feedback-c2',
        'Define guest satisfaction indicators - what metrics define a successful visit',
      ),
      ck(
        'ag-s6-experience-feedback-c3',
        'Define repeat visit tracking system',
      ),
      ck(
        'ag-s6-experience-feedback-c4',
        'Define review and response protocol for online feedback',
      ),
      ck(
        'ag-s6-experience-feedback-c5',
        'Define quality improvement process - how feedback triggers operational changes',
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
    focusedQuestion:
      'How will health and safety audits, food safety compliance, licensing renewals, and neighbour relations be actively managed?',
    checklist: [
      ck(
        'ag-s6-compliance-monitoring-c1',
        'Design compliance calendar - all permit renewal dates, audit schedules, reporting obligations',
      ),
      ck(
        'ag-s6-compliance-monitoring-c2',
        'Define compliance monitoring responsibilities - who checks what, when',
      ),
      ck(
        'ag-s6-compliance-monitoring-c3',
        'Define neighbour communication rhythm and nominated farm contact',
      ),
      ck(
        'ag-s6-compliance-monitoring-c4',
        'Design complaint response process',
      ),
      ck(
        'ag-s6-compliance-monitoring-c5',
        'Define annual external relations review',
      ),
    ],
    decisionGroups: [
      dg('ag-s6-compliance-monitoring-dg1', 'Compliance calendar & ownership', [
        'ag-s6-compliance-monitoring-c1',
        'ag-s6-compliance-monitoring-c2',
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
      ),
      ck(
        'ag-s6-food-integration-c2',
        'Define gap tracking - what was sourced externally and at what cost',
      ),
      ck(
        'ag-s6-food-integration-c3',
        'Define seasonal menu planning process connected to farm production calendar',
      ),
      ck(
        'ag-s6-food-integration-c4',
        'Define farm production adjustment protocol when guest demand reveals gaps',
      ),
      ck(
        'ag-s6-food-integration-c5',
        'Define review cadence and owner for the farm-to-guest loop - who reviews produce tracking and gap data each season and decides next-season adjustments',
      ),
    ],
    decisionGroups: [
      dg('ag-s6-food-integration-dg1', 'Produce & gap tracking', [
        'ag-s6-food-integration-c1',
        'ag-s6-food-integration-c2',
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
    focusedQuestion:
      'How will actual guest numbers, infrastructure load, and staff capacity be tracked to prevent drift beyond sustainable limits?',
    checklist: [
      ck(
        'ag-s6-load-monitoring-c1',
        'Define capacity tracking system - actual vs. intended guest numbers by period',
      ),
      ck(
        'ag-s6-load-monitoring-c2',
        'Define infrastructure load indicators - water use, sanitation load, parking utilisation',
      ),
      ck(
        'ag-s6-load-monitoring-c3',
        'Define staff workload monitoring - hours, task completion, incident rate',
      ),
      ck(
        'ag-s6-load-monitoring-c4',
        'Define capacity threshold triggers - what load level initiates a booking pause or operational review',
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
    ],
    decisionGroups: [
      dg('ag-s7-staffing-training-dg1', 'Staffing & recruitment', [
        'ag-s7-staffing-training-c1',
        'ag-s7-staffing-training-c3',
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
    ],
    decisionGroups: [
      dg('ag-s7-phased-launch-dg1', 'Soft launch & gate', [
        'ag-s7-phased-launch-c1',
        'ag-s7-phased-launch-c2',
      ]),
      dg('ag-s7-phased-launch-dg2', 'Full launch & ramp-up', [
        'ag-s7-phased-launch-c3',
        'ag-s7-phased-launch-c4',
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
];

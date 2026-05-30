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
// Checklist-length note: AG-T5.4 (Design farm-to-guest integration feedback
// loop) carries only 4 checklist items in the source. The catalogue rubric test
// floors checklist length at 5 (Authoring Standards v1.4), which postdates this
// v1.0 / Standards v1.3 document. Per "don't invent content" the objective is
// encoded verbatim at 4 items; the rubric test carries a documented single-id
// allowlist (ag-t5-food-integration) so the 5-item floor stays tight for every
// other (and every future v1.4) catalogue.
//
// Economic objectives AG-T3.8 (booking, pricing & revenue model) and AG-T6.6
// (phased launch & financial viability plan) are encoded verbatim as plain data
// per the operator's informed 2026-05-29 "encode verbatim, no gating"
// authorisation. Their content is hospitality booking / pricing / occupancy /
// break-even framing (a guest pays to reserve a future stay or experience - a
// service reservation), not advance sale of future agricultural yield.
//
// source: 'primary', sourceTypeId: 'agritourism' on every objective.
// Refs follow Authoring Standards (AG-T<tier>.<n>). ASCII-only copy:
// em/en dashes -> " - "; curly quotes -> straight.

import type { PlanTierObjective } from '../../../schemas/plan/planTierObjective.schema.js';
import { ck, obj } from './authoring.js';

const PRIMARY = 'agritourism' as const;

export const AGRITOURISM_PRIMARY_OBJECTIVES: readonly PlanTierObjective[] = [
  // ---------------------------------------------------------------- Tier 0
  obj({
    id: 'ag-t0-experience-vision',
    tierId: 't0-project-foundation',
    ref: 'AG-T0.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define visitor experience vision & commercial model',
    focusedQuestion:
      "What do guests experience here, what do they pay for, and what is the farm's hospitality identity?",
    checklist: [
      ck(
        'ag-t0-experience-vision-c1',
        'Define the core guest experience in plain language - what makes this farm distinct',
      ),
      ck(
        'ag-t0-experience-vision-c2',
        'Identify visitor types - day visitors, overnight guests, retreat participants, school groups',
      ),
      ck(
        'ag-t0-experience-vision-c3',
        'Define the commercial proposition - what is offered and at what price point',
      ),
      ck(
        'ag-t0-experience-vision-c4',
        "Define the farm's hospitality identity - authentic farm stay, luxury retreat, educational experience",
      ),
      ck(
        'ag-t0-experience-vision-c5',
        'Confirm the commercial model is achievable within steward capacity',
      ),
      ck(
        'ag-t0-experience-vision-c6',
        'Record what will never be compromised for commercial gain',
      ),
    ],
    completionGate:
      'Visitor experience vision and commercial model approved. Hospitality identity confirmed.',
    actHandoff: 'Visitor Experience Vision & Commercial Model Brief',
  }),
  obj({
    id: 'ag-t0-visitor-capacity',
    tierId: 't0-project-foundation',
    ref: 'AG-T0.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define visitor capacity & operational boundary',
    focusedQuestion:
      'How many guests can this farm host at any one time - and what operational constraints define that limit?',
    checklist: [
      ck(
        'ag-t0-visitor-capacity-c1',
        'Define maximum simultaneous guest capacity - accommodation, dining, programming',
      ),
      ck(
        'ag-t0-visitor-capacity-c2',
        'Define visit type limits - maximum day visitors, overnight guests, event attendees',
      ),
      ck(
        'ag-t0-visitor-capacity-c3',
        'Define operational boundaries - what farm activities are incompatible with guest presence',
      ),
      ck(
        'ag-t0-visitor-capacity-c4',
        'Define seasonal capacity variation - peak and off-peak limits',
      ),
      ck(
        'ag-t0-visitor-capacity-c5',
        'Confirm capacity is consistent with regulatory requirements and infrastructure potential',
      ),
    ],
    completionGate:
      'Visitor capacity defined. Operational boundaries confirmed.',
    actHandoff: 'Visitor Capacity & Operational Boundary Brief',
  }),
  obj({
    id: 'ag-t0-regulatory-framework',
    tierId: 't0-project-foundation',
    ref: 'AG-T0.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define regulatory & licensing framework',
    focusedQuestion:
      'What permits, licences, and compliance frameworks must be in place before guests arrive?',
    checklist: [
      ck(
        'ag-t0-regulatory-framework-c1',
        'Identify food service permit requirements - preparation, service, storage',
      ),
      ck(
        'ag-t0-regulatory-framework-c2',
        'Identify accommodation licensing requirements for intended accommodation type',
      ),
      ck(
        'ag-t0-regulatory-framework-c3',
        'Define public liability insurance requirements and coverage',
      ),
      ck(
        'ag-t0-regulatory-framework-c4',
        'Identify health and safety compliance requirements for public access',
      ),
      ck(
        'ag-t0-regulatory-framework-c5',
        'Identify any resource consent requirements for visitor infrastructure',
      ),
      ck(
        'ag-t0-regulatory-framework-c6',
        'Define compliance calendar - renewal dates and ongoing obligations',
      ),
      ck(
        'ag-t0-regulatory-framework-c7',
        'Obtain legal or compliance advice before any guest-facing infrastructure is built',
      ),
    ],
    completionGate:
      'Regulatory and licensing framework defined. All permits identified and compliance calendar confirmed before infrastructure design begins.',
    actHandoff: 'Regulatory & Licensing Framework Brief',
    scopeNotes:
      'Do not design or build guest-facing infrastructure before all required permits and licences are identified. Compliance constraints may significantly alter what can be offered or where.',
  }),
  // ---------------------------------------------------------------- Tier 1
  obj({
    id: 'ag-t1-arrival-experience',
    tierId: 't1-land-reading',
    ref: 'AG-T1.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey visitor access & arrival experience',
    focusedQuestion:
      'How do guests currently arrive - and what is the quality of the approach, entry, and first impression?',
    checklist: [
      ck(
        'ag-t1-arrival-experience-c1',
        'Assess road quality and signage from nearest main road to property entry',
      ),
      ck(
        'ag-t1-arrival-experience-c2',
        'Assess parking capacity and surface quality',
      ),
      ck(
        'ag-t1-arrival-experience-c3',
        'Assess entry gate, driveway, and approach aesthetic',
      ),
      ck(
        'ag-t1-arrival-experience-c4',
        'Identify safety hazards on arrival route - blind corners, livestock crossings, overhead clearance',
      ),
      ck(
        'ag-t1-arrival-experience-c5',
        'Record first impression sequence - what does a guest see from the moment they arrive',
      ),
    ],
    completionGate:
      'Visitor access and arrival experience survey complete.',
    actHandoff: 'Visitor Access & Arrival Experience Survey',
  }),
  obj({
    id: 'ag-t1-hospitality-infra',
    tierId: 't1-land-reading',
    ref: 'AG-T1.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey existing hospitality infrastructure',
    focusedQuestion:
      'What accommodation, kitchen, bathroom, and gathering infrastructure already exists - and what is its condition and reuse potential?',
    checklist: [
      ck(
        'ag-t1-hospitality-infra-c1',
        'Inventory all existing accommodation - rooms, cabins, outbuildings - with condition assessment',
      ),
      ck(
        'ag-t1-hospitality-infra-c2',
        'Assess existing kitchen and food preparation infrastructure',
      ),
      ck(
        'ag-t1-hospitality-infra-c3',
        'Assess existing bathroom and toilet facilities',
      ),
      ck(
        'ag-t1-hospitality-infra-c4',
        'Assess existing gathering spaces - indoor and outdoor',
      ),
      ck(
        'ag-t1-hospitality-infra-c5',
        'Identify reuse, renovation, or demolition requirements for each element',
      ),
      ck(
        'ag-t1-hospitality-infra-c6',
        'Estimate renovation cost for highest-potential reuse items',
      ),
    ],
    completionGate:
      'Existing hospitality infrastructure fully inventoried. Reuse potential assessed.',
    actHandoff: 'Existing Hospitality Infrastructure Survey',
  }),
  obj({
    id: 'ag-t1-landscape-context',
    tierId: 't1-land-reading',
    ref: 'AG-T1.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey surrounding landscape context & vectors',
    focusedQuestion:
      'How does the surrounding landscape shape the guest experience - visual amenity, noise, neighbouring activities - and what contamination risks apply?',
    checklist: [
      ck('ag-t1-landscape-context-c1', 'Map surrounding land uses within 2km'),
      ck(
        'ag-t1-landscape-context-c2',
        'Identify visual amenity values and any eyesores visible from guest areas',
      ),
      ck(
        'ag-t1-landscape-context-c3',
        'Identify noise sources from neighbouring properties and roads',
      ),
      ck(
        'ag-t1-landscape-context-c4',
        'Assess drinking water catchment contamination risk from surrounding landscape vectors',
      ),
      ck(
        'ag-t1-landscape-context-c5',
        'Record any neighbouring activities that could affect guest experience - spray drift, dust, traffic',
      ),
    ],
    completionGate:
      'Landscape context survey complete. Visual amenity, noise, and contamination risks identified.',
    actHandoff: 'Landscape Context & Vector Survey Package',
  }),
  obj({
    id: 'ag-t1-seasonal-patterns',
    tierId: 't1-land-reading',
    ref: 'AG-T1.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey seasonal operational patterns',
    focusedQuestion:
      'When can guests actually visit - what seasons, weather conditions, and farming activities enable or limit access?',
    checklist: [
      ck(
        'ag-t1-seasonal-patterns-c1',
        'Define peak guest season by climate and farm calendar',
      ),
      ck(
        'ag-t1-seasonal-patterns-c2',
        'Define off-peak periods and their limiting factors - weather, farm activity, access',
      ),
      ck(
        'ag-t1-seasonal-patterns-c3',
        'Identify farm activities that are incompatible with simultaneous guest presence',
      ),
      ck(
        'ag-t1-seasonal-patterns-c4',
        'Map farming calendar against potential guest programming calendar',
      ),
      ck(
        'ag-t1-seasonal-patterns-c5',
        'Define minimum and maximum viable operating weeks per year',
      ),
    ],
    completionGate:
      'Seasonal operational pattern survey complete. Peak, off-peak, and exclusion periods defined.',
    actHandoff: 'Seasonal Operational Patterns Survey',
  }),
  // ---------------------------------------------------------------- Tier 2
  obj({
    id: 'ag-t2-water-sanitation-demand',
    tierId: 't2-systems-reading',
    ref: 'AG-T2.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey guest water & sanitation demand',
    focusedQuestion:
      'What water supply and sanitation capacity is required at peak guest numbers - and does the site support it?',
    checklist: [
      ck(
        'ag-t2-water-sanitation-demand-c1',
        'Calculate water demand at peak guest capacity - domestic, kitchen, bathroom, irrigation',
      ),
      ck(
        'ag-t2-water-sanitation-demand-c2',
        'Assess available water source yield for combined farm and guest demand',
      ),
      ck(
        'ag-t2-water-sanitation-demand-c3',
        'Identify water quality requirements for food service and accommodation',
      ),
      ck(
        'ag-t2-water-sanitation-demand-c4',
        'Assess on-site sanitation capacity - septic, composting, or connection to municipal system',
      ),
      ck(
        'ag-t2-water-sanitation-demand-c5',
        'Identify regulatory requirements for guest sanitation infrastructure',
      ),
      ck(
        'ag-t2-water-sanitation-demand-c6',
        'Define maximum guest capacity supportable by available water and sanitation',
      ),
    ],
    completionGate:
      'Guest water and sanitation demand assessed. Capacity constraints defined.',
    actHandoff: 'Guest Water & Sanitation Demand Assessment',
  }),
  obj({
    id: 'ag-t2-sensory-environment',
    tierId: 't2-systems-reading',
    ref: 'AG-T2.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey noise, privacy & sensory environment',
    focusedQuestion:
      'What will guests see, hear, and experience - and what sensory conditions support or undermine the guest experience vision?',
    checklist: [
      ck(
        'ag-t2-sensory-environment-c1',
        'Record ambient noise levels across the site by season and time of day',
      ),
      ck(
        'ag-t2-sensory-environment-c2',
        'Identify farm operational noises that could affect guest experience',
      ),
      ck(
        'ag-t2-sensory-environment-c3',
        'Map visual amenity from proposed guest areas - views, screening needs',
      ),
      ck(
        'ag-t2-sensory-environment-c4',
        'Identify odour sources - livestock, composting, machinery - relative to guest zones',
      ),
      ck(
        'ag-t2-sensory-environment-c5',
        'Assess privacy conditions in proposed accommodation locations',
      ),
    ],
    completionGate:
      'Sensory environment survey complete. Noise, visual, and privacy conditions mapped.',
    actHandoff: 'Noise, Privacy & Sensory Environment Survey',
  }),
  obj({
    id: 'ag-t2-emergency-access',
    tierId: 't2-systems-reading',
    ref: 'AG-T2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey emergency access & safety conditions',
    focusedQuestion:
      'What are the emergency access, evacuation, and safety conditions that must be resolved before public access begins?',
    checklist: [
      ck(
        'ag-t2-emergency-access-c1',
        'Map emergency vehicle access routes to all guest areas',
      ),
      ck(
        'ag-t2-emergency-access-c2',
        'Identify evacuation routes for fire, flood, and other emergencies',
      ),
      ck(
        'ag-t2-emergency-access-c3',
        'Assess first aid access and response time from nearest medical facility',
      ),
      ck(
        'ag-t2-emergency-access-c4',
        'Identify safety hazards across all areas guests will access - terrain, machinery, animals',
      ),
      ck(
        'ag-t2-emergency-access-c5',
        'Assess fire risk and evacuation complexity',
      ),
      ck(
        'ag-t2-emergency-access-c6',
        'Confirm emergency access meets regulatory requirements for public accommodation',
      ),
    ],
    completionGate:
      'Emergency access and safety conditions survey complete. All hazards identified.',
    actHandoff: 'Emergency Access & Safety Conditions Survey',
  }),
  obj({
    id: 'ag-t2-food-production-capacity',
    tierId: 't2-systems-reading',
    ref: 'AG-T2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey existing food production capacity',
    focusedQuestion:
      'What is already growing on this land that can feed the guest experience - and what gaps exist?',
    checklist: [
      ck(
        'ag-t2-food-production-capacity-c1',
        'Inventory all current food-producing elements - gardens, orchards, animals',
      ),
      ck(
        'ag-t2-food-production-capacity-c2',
        'Assess current yield potential by enterprise',
      ),
      ck(
        'ag-t2-food-production-capacity-c3',
        'Identify seasonal production gaps relative to intended guest dining calendar',
      ),
      ck(
        'ag-t2-food-production-capacity-c4',
        'Assess food storage, preservation, and preparation infrastructure',
      ),
      ck(
        'ag-t2-food-production-capacity-c5',
        'Define what additional production is required to support intended hospitality model',
      ),
    ],
    completionGate:
      'Existing food production capacity inventoried. Gaps relative to guest dining vision identified.',
    actHandoff: 'Existing Food Production Capacity Survey',
  }),
  // ---------------------------------------------------------------- Tier 3
  obj({
    id: 'ag-t3-circulation-strategy',
    tierId: 't3-foundation-decisions',
    ref: 'AG-T3.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define guest experience zones & visitor circulation strategy',
    focusedQuestion:
      'Where exactly do guests go, what route do they take, and how is privacy and safety managed throughout?',
    checklist: [
      ck(
        'ag-t3-circulation-strategy-c1',
        'Define accessible guest zones - accommodation, dining, trails, demonstration areas',
      ),
      ck(
        'ag-t3-circulation-strategy-c2',
        'Define visitor circulation route - arrival, orientation, experience sequence, departure',
      ),
      ck(
        'ag-t3-circulation-strategy-c3',
        'Define hard boundaries between guest zones and farm operations',
      ),
      ck(
        'ag-t3-circulation-strategy-c4',
        'Define signage and wayfinding approach',
      ),
      ck(
        'ag-t3-circulation-strategy-c5',
        'Define supervised vs. self-guided zones',
      ),
      ck(
        'ag-t3-circulation-strategy-c6',
        'Confirm circulation route is compatible with emergency evacuation requirements',
      ),
    ],
    completionGate:
      'Guest experience zones and circulation strategy approved. All boundaries and safety requirements confirmed.',
    actHandoff: 'Guest Experience Zones & Visitor Circulation Strategy Brief',
  }),
  obj({
    id: 'ag-t3-service-model',
    tierId: 't3-foundation-decisions',
    ref: 'AG-T3.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define hospitality service model',
    focusedQuestion:
      'What food, accommodation, and programming is offered - and at what service standard?',
    checklist: [
      ck(
        'ag-t3-service-model-c1',
        'Define accommodation types and standards - farm stay rooms, cabins, glamping',
      ),
      ck(
        'ag-t3-service-model-c2',
        'Define dining model - farm breakfast, shared dinners, self-catering, or hybrid',
      ),
      ck(
        'ag-t3-service-model-c3',
        'Define programming offer - farm tours, workshops, retreats, harvest experiences',
      ),
      ck(
        'ag-t3-service-model-c4',
        'Define service standard for each offering - what is included, what is extra',
      ),
      ck(
        'ag-t3-service-model-c5',
        'Confirm service model is achievable within steward capacity and licensing framework',
      ),
    ],
    completionGate:
      'Hospitality service model approved. All offerings defined against capacity and compliance constraints.',
    actHandoff: 'Hospitality Service Model Brief',
  }),
  obj({
    id: 'ag-t3-food-strategy',
    tierId: 't3-foundation-decisions',
    ref: 'AG-T3.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define farm-to-guest food production strategy',
    focusedQuestion:
      'Which farm enterprises feed the guest experience - and how is farm production integrated into hospitality?',
    checklist: [
      ck(
        'ag-t3-food-strategy-c1',
        'Map current farm production against guest dining calendar - what is available when',
      ),
      ck(
        'ag-t3-food-strategy-c2',
        'Define priority enterprises for guest food supply - vegetables, eggs, meat, dairy, fruit',
      ),
      ck(
        'ag-t3-food-strategy-c3',
        'Define food production gaps and sourcing strategy for gaps - local farms, suppliers',
      ),
      ck(
        'ag-t3-food-strategy-c4',
        'Define food preparation approach - farm kitchen standards, preservation, seasonal menus',
      ),
      ck(
        'ag-t3-food-strategy-c5',
        'Confirm farm-to-guest supply chain is consistent with food safety requirements',
      ),
    ],
    completionGate:
      'Farm-to-guest food production strategy approved. Supply chain and gaps confirmed.',
    actHandoff: 'Farm-to-Guest Food Production Strategy Brief',
  }),
  obj({
    id: 'ag-t3-safety-compliance',
    tierId: 't3-foundation-decisions',
    ref: 'AG-T3.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define safety, emergency & compliance framework',
    focusedQuestion:
      'What safety systems, emergency protocols, and compliance obligations must be in place before any guest arrives?',
    checklist: [
      ck(
        'ag-t3-safety-compliance-c1',
        'Define fire evacuation plan for all guest areas',
      ),
      ck(
        'ag-t3-safety-compliance-c2',
        'Define first aid protocol - trained personnel, equipment, emergency contacts',
      ),
      ck(
        'ag-t3-safety-compliance-c3',
        'Define hazard identification and management system for all guest zones',
      ),
      ck(
        'ag-t3-safety-compliance-c4',
        'Define food safety management plan for all food service activities',
      ),
      ck(
        'ag-t3-safety-compliance-c5',
        'Define public liability coverage requirements and confirm insurance',
      ),
      ck(
        'ag-t3-safety-compliance-c6',
        'Confirm all compliance obligations are met before first guest arrival',
      ),
    ],
    completionGate:
      'Safety, emergency, and compliance framework approved. All obligations confirmed before any guest access.',
    actHandoff: 'Safety, Emergency & Compliance Framework',
    scopeNotes:
      'This framework must be complete and confirmed before any guest arrives - not after the first season. Compliance and safety obligations discovered late cause expensive retrofitting or forced closure.',
  }),
  obj({
    id: 'ag-t3-revenue-model',
    tierId: 't3-foundation-decisions',
    ref: 'AG-T3.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define booking, pricing & revenue model',
    focusedQuestion:
      'How do guests book, what do they pay, and what financial model makes this enterprise viable?',
    checklist: [
      ck(
        'ag-t3-revenue-model-c1',
        'Define pricing for each experience offering',
      ),
      ck(
        'ag-t3-revenue-model-c2',
        'Define booking terms - advance booking, deposits, cancellation policy',
      ),
      ck(
        'ag-t3-revenue-model-c3',
        'Define peak and off-peak pricing strategy',
      ),
      ck(
        'ag-t3-revenue-model-c4',
        'Calculate minimum viable occupancy rate for financial viability',
      ),
      ck(
        'ag-t3-revenue-model-c5',
        'Define revenue targets for Phase 1 and break-even timeline',
      ),
      ck(
        'ag-t3-revenue-model-c6',
        'Confirm pricing is consistent with market comparables and service standard',
      ),
    ],
    completionGate:
      'Booking, pricing, and revenue model approved. Break-even timeline and minimum occupancy confirmed.',
    actHandoff: 'Booking, Pricing & Revenue Model Brief',
  }),
  // ---------------------------------------------------------------- Tier 4
  obj({
    id: 'ag-t4-accommodation',
    tierId: 't4-system-design',
    ref: 'AG-T4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design guest accommodation & retreat infrastructure',
    focusedQuestion:
      'How will guest accommodation be designed - sized to capacity, consistent with experience vision and compliance requirements?',
    checklist: [
      ck(
        'ag-t4-accommodation-c1',
        'Design accommodation layout - room configuration, cabin placement, glamping site layout',
      ),
      ck(
        'ag-t4-accommodation-c2',
        'Specify construction or renovation standard for each accommodation type',
      ),
      ck(
        'ag-t4-accommodation-c3',
        'Design thermal performance - insulation, heating, cooling',
      ),
      ck(
        'ag-t4-accommodation-c4',
        'Design guest room amenities to defined service standard',
      ),
      ck(
        'ag-t4-accommodation-c5',
        'Confirm accommodation design meets building code and accommodation licensing requirements',
      ),
      ck(
        'ag-t4-accommodation-c6',
        'Confirm accommodation capacity matches Tier 0 visitor capacity definition',
      ),
    ],
    completionGate:
      'Guest accommodation design approved. Compliance and capacity confirmed.',
    actHandoff: 'Guest Accommodation & Retreat Infrastructure Design Package',
  }),
  obj({
    id: 'ag-t4-dining-infra',
    tierId: 't4-system-design',
    ref: 'AG-T4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design guest dining & food service infrastructure',
    focusedQuestion:
      'How will farm kitchen, dining, and food service infrastructure be designed to food safety standard?',
    checklist: [
      ck(
        'ag-t4-dining-infra-c1',
        'Design farm kitchen layout - preparation, cooking, storage, wash-up',
      ),
      ck(
        'ag-t4-dining-infra-c2',
        'Specify kitchen equipment to food service permit standard',
      ),
      ck(
        'ag-t4-dining-infra-c3',
        'Design dining area - capacity, layout, indoor/outdoor options',
      ),
      ck(
        'ag-t4-dining-infra-c4',
        'Design food storage - cool room, dry store, preservation',
      ),
      ck(
        'ag-t4-dining-infra-c5',
        'Confirm kitchen and dining design meets food safety compliance requirements',
      ),
    ],
    completionGate:
      'Dining and food service infrastructure design approved. Food safety compliance confirmed.',
    actHandoff: 'Guest Dining & Food Service Infrastructure Design Package',
  }),
  obj({
    id: 'ag-t4-programming-infra',
    tierId: 't4-system-design',
    ref: 'AG-T4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design guest programming & activity infrastructure',
    focusedQuestion:
      'How will trails, tour routes, workshop spaces, and demonstration areas be designed?',
    checklist: [
      ck(
        'ag-t4-programming-infra-c1',
        'Design farm tour route - waypoints, interpretation, safety',
      ),
      ck(
        'ag-t4-programming-infra-c2',
        'Design walking trails - surfaces, grades, waymarking, distances',
      ),
      ck(
        'ag-t4-programming-infra-c3',
        'Design workshop and demonstration space - layout, equipment, capacity',
      ),
      ck(
        'ag-t4-programming-infra-c4',
        'Design outdoor event or gathering space if applicable',
      ),
      ck(
        'ag-t4-programming-infra-c5',
        'Confirm all programming infrastructure meets safety requirements for public access',
      ),
    ],
    completionGate:
      'Guest programming and activity infrastructure design approved.',
    actHandoff: 'Guest Programming & Activity Infrastructure Design Package',
  }),
  obj({
    id: 'ag-t4-sanitation-infra',
    tierId: 't4-system-design',
    ref: 'AG-T4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design guest bathroom & sanitation infrastructure',
    focusedQuestion:
      'How will bathrooms, showers, and sanitation facilities be designed at peak guest capacity?',
    checklist: [
      ck(
        'ag-t4-sanitation-infra-c1',
        'Calculate bathroom and toilet fixture requirements at peak guest numbers',
      ),
      ck(
        'ag-t4-sanitation-infra-c2',
        'Design bathroom layout and location relative to accommodation',
      ),
      ck(
        'ag-t4-sanitation-infra-c3',
        'Specify hot water system capacity for peak guest demand',
      ),
      ck(
        'ag-t4-sanitation-infra-c4',
        'Design waste system - septic, composting, or connection to confirm capacity',
      ),
      ck(
        'ag-t4-sanitation-infra-c5',
        'Confirm sanitation design meets regulatory requirements for accommodation type',
      ),
    ],
    completionGate:
      'Guest bathroom and sanitation infrastructure design approved. Peak capacity confirmed.',
    actHandoff: 'Guest Bathroom & Sanitation Infrastructure Design Package',
  }),
  obj({
    id: 'ag-t4-safety-infra',
    tierId: 't4-system-design',
    ref: 'AG-T4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design visitor safety & emergency infrastructure',
    focusedQuestion:
      'How will safety signage, first aid, fire equipment, and emergency infrastructure be designed across all guest areas?',
    checklist: [
      ck(
        'ag-t4-safety-infra-c1',
        'Design evacuation signage and route marking for all guest areas',
      ),
      ck(
        'ag-t4-safety-infra-c2',
        'Specify fire extinguisher, hose reel, and smoke detector placement',
      ),
      ck(
        'ag-t4-safety-infra-c3',
        'Design first aid station locations and equipment specification',
      ),
      ck(
        'ag-t4-safety-infra-c4',
        'Design emergency vehicle access points and turning areas',
      ),
      ck(
        'ag-t4-safety-infra-c5',
        'Specify hazard identification signage for guest zones',
      ),
      ck(
        'ag-t4-safety-infra-c6',
        'Confirm all safety infrastructure meets regulatory requirements',
      ),
    ],
    completionGate:
      'Visitor safety and emergency infrastructure design approved. Regulatory compliance confirmed.',
    actHandoff: 'Visitor Safety & Emergency Infrastructure Design Package',
  }),
  // ---------------------------------------------------------------- Tier 5
  obj({
    id: 'ag-t5-experience-feedback',
    tierId: 't5-integration-design',
    ref: 'AG-T5.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design visitor experience feedback & quality monitoring',
    focusedQuestion:
      'How will guest satisfaction, repeat visit rate, and experience quality be tracked and improved?',
    checklist: [
      ck(
        'ag-t5-experience-feedback-c1',
        'Design guest feedback collection - post-visit survey, in-person, online reviews',
      ),
      ck(
        'ag-t5-experience-feedback-c2',
        'Define guest satisfaction indicators - what metrics define a successful visit',
      ),
      ck(
        'ag-t5-experience-feedback-c3',
        'Define repeat visit tracking system',
      ),
      ck(
        'ag-t5-experience-feedback-c4',
        'Define review and response protocol for online feedback',
      ),
      ck(
        'ag-t5-experience-feedback-c5',
        'Define quality improvement process - how feedback triggers operational changes',
      ),
    ],
    completionGate:
      'Visitor experience feedback and quality monitoring system approved.',
    actHandoff: 'Visitor Experience Feedback & Quality Monitoring System',
  }),
  obj({
    id: 'ag-t5-compliance-monitoring',
    tierId: 't5-integration-design',
    ref: 'AG-T5.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design external relations & compliance monitoring system',
    focusedQuestion:
      'How will health and safety audits, food safety compliance, licensing renewals, and neighbour relations be actively managed?',
    checklist: [
      ck(
        'ag-t5-compliance-monitoring-c1',
        'Design compliance calendar - all permit renewal dates, audit schedules, reporting obligations',
      ),
      ck(
        'ag-t5-compliance-monitoring-c2',
        'Define compliance monitoring responsibilities - who checks what, when',
      ),
      ck(
        'ag-t5-compliance-monitoring-c3',
        'Define neighbour communication rhythm and nominated farm contact',
      ),
      ck(
        'ag-t5-compliance-monitoring-c4',
        'Design complaint response process',
      ),
      ck(
        'ag-t5-compliance-monitoring-c5',
        'Define annual external relations review',
      ),
    ],
    completionGate:
      'External relations and compliance monitoring system approved. All obligations tracked.',
    actHandoff: 'External Relations & Compliance Monitoring System',
  }),
  obj({
    id: 'ag-t5-food-integration',
    tierId: 't5-integration-design',
    ref: 'AG-T5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design farm-to-guest integration feedback loop',
    focusedQuestion:
      'How will the farm understand which enterprises are feeding the guest experience - and what gaps need to be filled?',
    // 4 checklist items in source (below the v1.4 5-item floor); encoded
    // verbatim per "don't invent content". The rubric test allowlists this id.
    checklist: [
      ck(
        'ag-t5-food-integration-c1',
        'Design tracking system for farm produce used in guest dining each season',
      ),
      ck(
        'ag-t5-food-integration-c2',
        'Define gap tracking - what was sourced externally and at what cost',
      ),
      ck(
        'ag-t5-food-integration-c3',
        'Define seasonal menu planning process connected to farm production calendar',
      ),
      ck(
        'ag-t5-food-integration-c4',
        'Define farm production adjustment protocol when guest demand reveals gaps',
      ),
    ],
    completionGate:
      'Farm-to-guest integration feedback loop designed. Produce tracking and gap protocol confirmed.',
    actHandoff: 'Farm-to-Guest Integration Feedback System',
  }),
  obj({
    id: 'ag-t5-load-monitoring',
    tierId: 't5-integration-design',
    ref: 'AG-T5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design capacity & operational load monitoring',
    focusedQuestion:
      'How will actual guest numbers, infrastructure load, and staff capacity be tracked to prevent drift beyond sustainable limits?',
    checklist: [
      ck(
        'ag-t5-load-monitoring-c1',
        'Define capacity tracking system - actual vs. intended guest numbers by period',
      ),
      ck(
        'ag-t5-load-monitoring-c2',
        'Define infrastructure load indicators - water use, sanitation load, parking utilisation',
      ),
      ck(
        'ag-t5-load-monitoring-c3',
        'Define staff workload monitoring - hours, task completion, incident rate',
      ),
      ck(
        'ag-t5-load-monitoring-c4',
        'Define capacity threshold triggers - what load level initiates a booking pause or operational review',
      ),
      ck(
        'ag-t5-load-monitoring-c5',
        'Define annual capacity review against Tier 0 operational boundary',
      ),
    ],
    completionGate:
      'Capacity and operational load monitoring system approved. Threshold triggers confirmed.',
    actHandoff: 'Capacity & Operational Load Monitoring System',
  }),
  // ---------------------------------------------------------------- Tier 6
  obj({
    id: 'ag-t6-staffing-training',
    tierId: 't6-phasing-resourcing',
    ref: 'AG-T6.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define hospitality staffing & training plan',
    focusedQuestion:
      'Who runs guest services, food preparation, and programming - and what training must be complete before first guests arrive?',
    checklist: [
      ck(
        'ag-t6-staffing-training-c1',
        'Define staffing requirements for each guest service area',
      ),
      ck(
        'ag-t6-staffing-training-c2',
        'Identify training requirements - food safety certification, first aid, hospitality service',
      ),
      ck(
        'ag-t6-staffing-training-c3',
        'Define recruitment timeline relative to guest program launch',
      ),
      ck(
        'ag-t6-staffing-training-c4',
        'Define staff orientation and guest service standards training',
      ),
      ck(
        'ag-t6-staffing-training-c5',
        'Confirm all required certifications are obtained before first guest arrival',
      ),
    ],
    completionGate:
      'Staffing and training plan approved. All required certifications confirmed before launch.',
    actHandoff: 'Hospitality Staffing & Training Plan',
  }),
  obj({
    id: 'ag-t6-booking-system',
    tierId: 't6-phasing-resourcing',
    ref: 'AG-T6.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define booking system & reservation infrastructure',
    focusedQuestion:
      'How will guests book, pay, and receive confirmation - and what platform and process supports this?',
    checklist: [
      ck(
        'ag-t6-booking-system-c1',
        'Select booking platform - purpose-built, general platform, or direct booking',
      ),
      ck(
        'ag-t6-booking-system-c2',
        'Define payment processing and deposit collection system',
      ),
      ck(
        'ag-t6-booking-system-c3',
        'Design booking confirmation and pre-arrival communication',
      ),
      ck(
        'ag-t6-booking-system-c4',
        'Define reservation management process - availability, modifications, cancellations',
      ),
      ck(
        'ag-t6-booking-system-c5',
        'Confirm booking system is operational before any marketing begins',
      ),
    ],
    completionGate:
      'Booking system and reservation infrastructure operational. Confirmed before marketing launch.',
    actHandoff: 'Booking System & Reservation Infrastructure',
  }),
  obj({
    id: 'ag-t6-phased-launch',
    tierId: 't6-phasing-resourcing',
    ref: 'AG-T6.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define phased launch & financial viability plan',
    focusedQuestion:
      'How will the guest enterprise launch in stages - and what financial milestones confirm it is viable to proceed?',
    checklist: [
      ck(
        'ag-t6-phased-launch-c1',
        'Define soft launch scope - limited capacity, limited programming, invited guests or low-profile bookings - HARD GATE: no public bookings until soft launch criteria are met and reviewed',
      ),
      ck(
        'ag-t6-phased-launch-c2',
        'Define soft launch review criteria - explicit pass/fail checklist that must be signed off before full public launch',
      ),
      ck(
        'ag-t6-phased-launch-c3',
        'Define full launch capacity and programming',
      ),
      ck(
        'ag-t6-phased-launch-c4',
        'Map revenue ramp-up against break-even timeline from Tier 3 revenue model',
      ),
      ck(
        'ag-t6-phased-launch-c5',
        'Define financial viability review trigger - occupancy rate or revenue threshold that initiates a model review',
      ),
      ck(
        'ag-t6-phased-launch-c6',
        'Define go/no-go criteria for scaling beyond Phase 1',
      ),
    ],
    completionGate:
      'Phased launch and financial viability plan approved. Soft launch criteria defined as explicit pass/fail checklist - hard gate before any public bookings.',
    actHandoff: 'Phased Launch & Financial Viability Plan',
  }),
  obj({
    id: 'ag-t6-adaptive-management',
    tierId: 't6-phasing-resourcing',
    ref: 'AG-T6.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define adaptive management protocol',
    focusedQuestion:
      'How will monitoring findings trigger changes to the guest enterprise and farm management plan?',
    checklist: [
      ck(
        'ag-t6-adaptive-management-c1',
        'Define annual review process - guest experience data, financial data, land health data reviewed together',
      ),
      ck(
        'ag-t6-adaptive-management-c2',
        'Define decision triggers - what outcomes require a plan or model change',
      ),
      ck(
        'ag-t6-adaptive-management-c3',
        'Define escalation process for unexpected events - safety incident, compliance breach, significant guest complaint',
      ),
      ck(
        'ag-t6-adaptive-management-c4',
        'Specify documentation requirements for all management changes',
      ),
      ck(
        'ag-t6-adaptive-management-c5',
        'Define 3-year comprehensive review against Tier 0 vision and commercial model',
      ),
    ],
    completionGate:
      'Adaptive management protocol approved. Review cycle, triggers, and documentation confirmed.',
    actHandoff: 'Adaptive Management Protocol',
  }),
];

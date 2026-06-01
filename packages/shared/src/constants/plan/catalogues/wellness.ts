// catalogues/wellness.ts
//
// Wellness / Healing Sanctuary PRIMARY-type objectives - the 27 type-specific
// objectives a Wellness project adds on top of the 19 Universal objectives
// (OLOS Wellness / Healing Sanctuary Objective Catalogue v1.0, Authored to
// Catalogue Authoring Standards v1.3).
//
// This file holds ONLY the primary-layer objectives. The universal slot lives
// in ./universal.ts (the shared baseline).
//
// Count note: 19 universal + 27 primary = 46 total. Per-tier primary sub-headers
// (4+4+3+5+5+3+3 = 27) and the complete objective index both confirm 27. The
// source numbers objectives by Tier 0-6; this catalogue maps Tier N -> Stratum
// (N+1) to match the codebase spine: Tier 0 -> s1-project-foundation,
// 1 -> s2-land-reading, 2 -> s3-systems-reading, 3 -> s4-foundation-decisions,
// 4 -> s5-system-design, 5 -> s6-integration-design, 6 -> s7-phasing-resourcing.
// Refs are restamped WELL-S<stratum>.<n> from the source's <tier>.<n>.
//
// Economic note: unlike agritourism / ecovillage, Wellness v1.0 carries NO
// economic objective - there is no booking / pricing / revenue / financial-
// viability objective in the primary set. The 2026-05-29 "encode verbatim, no
// gating" override is therefore not engaged here. Amanah Gate: this is a
// therapeutic-hospitality / healing-services catalogue with no riba- or gharar-
// adjacent content (no advance sale, no financial product).
//
// Checklist-length note (RESOLVED 2026-05-30): WELL-S7.4 (Define therapeutic
// program launch sequence) carried only 4 checklist items in the v1.0 / Standards
// v1.3 source, below the v1.4 5-item floor - the same situation as AG-S6.4. Per
// the operator ruling of 2026-05-30 ("draft 5th, AG precedent"), items c1-c4 are
// kept verbatim and a single operator-authorized 5th item (c5) was added to meet
// the floor - a loop-closing governance item (ownership + review cadence), not
// new scope. No allowlist is used.
//
// Secondary-layer note (RESOLVED 2026-05-30): the source header table lists the
// role as "Primary or Secondary", and projectTypes.ts marks wellness
// canBeSecondary: true. The v1.0 catalogue document itself contains only a
// primary-layer catalogue (19 universal references + 27 standalone primary
// objectives) - no secondary-layer section. Per the operator ruling of 2026-05-30
// ("derive + author", an explicit informed override of "don't invent content"
// scoped to this layer only), the WELLNESS_SECONDARY_OBJECTIVES below are AUTHORED
// (not transcribed): 5 additive overlay objectives covering the wellness concerns
// a host primary would not already carry when Wellness is layered on as a
// secondary type (design tensions #7 Silvopasture + Wellness, #10 Residential +
// Wellness). ids use the well-sec-* namespace; refs sequenced after the primary
// WELL numbers (S1.8/S1.9, S4.9-S4.11) so they never collide. No patch records
// (additive only, per the ruling).
//
// source: 'primary', sourceTypeId: 'wellness' on every objective.
// Refs follow Authoring Standards (WELL-S<stratum>.<n>). ASCII-only copy:
// em/en dashes -> " - "; curly quotes -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj } from './authoring.js';

// Decision groups (Decision Groups Reference v1.0; OLOS spec 9.3-9.4) - AUTHORED
// under the 2026-05-31 extended override ("author meaningful labels"). The
// reference doc's Wellness (WL) section enumerates a different, older objective
// set whose groups are generic placeholders ("Primary decisions / Secondary
// considerations -> Multiple") on WL.S refs that do not map to this v1.0
// catalogue's WELL-S refs/titles. So every group here - label, item membership,
// and observeFeeds - is authored editorially to partition each objective's
// checklist into 1-3 named decision scopes (full mutually-exclusive partition).
// Universal-objective groups live in universal.ts (the RF-anchored set); this
// file carries only the wellness primary + authored secondary layers.

const PRIMARY = 'wellness' as const;

export const WELLNESS_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'well-s1-healing-philosophy',
    stratumId: 's1-project-foundation',
    ref: 'WELL-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear healing philosophy & therapeutic intent',
    focusedQuestion:
      'What is this sanctuary for - rest, trauma recovery, spiritual retreat, somatic healing - and how does that philosophy gate all design decisions?',
    checklist: [
      ck(
        'well-s1-healing-philosophy-c1',
        'Define the healing philosophy in plain language - what this sanctuary believes about healing',
      ),
      ck(
        'well-s1-healing-philosophy-c2',
        'Identify primary therapeutic modalities offered - somatic, contemplative, nature-based, integrative',
      ),
      ck(
        'well-s1-healing-philosophy-c3',
        'Define the therapeutic intent - restoration, recovery, deepening, retreat',
      ),
      ck(
        'well-s1-healing-philosophy-c4',
        'Establish which environmental conditions are non-negotiable for this philosophy - silence thresholds, light quality, privacy levels',
      ),
      ck(
        'well-s1-healing-philosophy-c5',
        'Confirm healing philosophy is agreed by all founding practitioners',
      ),
      ck(
        'well-s1-healing-philosophy-c6',
        'Document philosophy as a design constraint - all Tier 3-4 decisions evaluated against it',
      ),
    ],
    decisionGroups: [
      dg('well-s1-healing-philosophy-dg1', 'Philosophy & modalities', [
        'well-s1-healing-philosophy-c1',
        'well-s1-healing-philosophy-c2',
        'well-s1-healing-philosophy-c3',
      ]),
      dg('well-s1-healing-philosophy-dg2', 'Environmental constraints & sign-off', [
        'well-s1-healing-philosophy-c4',
        'well-s1-healing-philosophy-c5',
        'well-s1-healing-philosophy-c6',
      ]),
    ],
    completionGate:
      'Healing philosophy approved. Design constraint document signed by all practitioners.',
    actHandoff: 'Healing Philosophy & Therapeutic Intent Brief',
    scopeNotes:
      'This philosophy is not a preference - it is a design gate. Every Tier 3 and Tier 4 decision must be evaluated against it before proceeding. A design that violates the philosophy requires a philosophy revision, not a design exception.',
  }),
  obj({
    id: 'well-s1-guest-intake',
    stratumId: 's1-project-foundation',
    ref: 'WELL-S1.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound guest intake & suitability framework',
    focusedQuestion:
      'Who is this sanctuary for, what conditions are welcomed, and what requires professional referral?',
    checklist: [
      ck(
        'well-s1-guest-intake-c1',
        'Define target guest profile - who this sanctuary serves',
      ),
      ck(
        'well-s1-guest-intake-c2',
        'Define conditions actively welcomed - burnout, grief, stress, life transition',
      ),
      ck(
        'well-s1-guest-intake-c3',
        'Define conditions requiring practitioner assessment before admission',
      ),
      ck(
        'well-s1-guest-intake-c4',
        'Define conditions outside scope - those requiring clinical referral only',
      ),
      ck(
        'well-s1-guest-intake-c5',
        'Define intake process - how guest suitability is assessed',
      ),
      ck(
        'well-s1-guest-intake-c6',
        'Confirm intake framework is consistent with practitioner scope of practice',
      ),
    ],
    decisionGroups: [
      dg('well-s1-guest-intake-dg1', 'Guest profile & welcomed conditions', [
        'well-s1-guest-intake-c1',
        'well-s1-guest-intake-c2',
      ]),
      dg('well-s1-guest-intake-dg2', 'Assessment & referral boundaries', [
        'well-s1-guest-intake-c3',
        'well-s1-guest-intake-c4',
      ]),
      dg('well-s1-guest-intake-dg3', 'Intake process', [
        'well-s1-guest-intake-c5',
        'well-s1-guest-intake-c6',
      ]),
    ],
    completionGate:
      'Guest intake and suitability framework approved. All conditions classified and intake process defined.',
    actHandoff: 'Guest Intake & Suitability Framework',
  }),
  obj({
    id: 'well-s1-regulatory-standards',
    stratumId: 's1-project-foundation',
    ref: 'WELL-S1.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound regulatory & professional standards framework',
    focusedQuestion:
      'What practitioner qualifications, insurance, scope of practice, and compliance obligations govern therapeutic services here?',
    checklist: [
      ck(
        'well-s1-regulatory-standards-c1',
        'Define required practitioner qualifications for each modality offered',
      ),
      ck(
        'well-s1-regulatory-standards-c2',
        'Define professional registration and insurance requirements',
      ),
      ck(
        'well-s1-regulatory-standards-c3',
        'Define scope of practice boundaries for each modality - what is and is not offered',
      ),
      ck(
        'well-s1-regulatory-standards-c4',
        'Identify health and safety compliance requirements for therapeutic services',
      ),
      ck(
        'well-s1-regulatory-standards-c5',
        'Identify food service and accommodation licensing requirements',
      ),
      ck(
        'well-s1-regulatory-standards-c6',
        'Define compliance calendar - renewal dates, CPD requirements, audit obligations',
      ),
      ck(
        'well-s1-regulatory-standards-c7',
        'Obtain legal or professional advice before any therapeutic service is offered',
      ),
    ],
    decisionGroups: [
      dg('well-s1-regulatory-standards-dg1', 'Qualifications & insurance', [
        'well-s1-regulatory-standards-c1',
        'well-s1-regulatory-standards-c2',
      ]),
      dg('well-s1-regulatory-standards-dg2', 'Scope & compliance obligations', [
        'well-s1-regulatory-standards-c3',
        'well-s1-regulatory-standards-c4',
        'well-s1-regulatory-standards-c5',
      ]),
      dg('well-s1-regulatory-standards-dg3', 'Compliance calendar & advice', [
        'well-s1-regulatory-standards-c6',
        'well-s1-regulatory-standards-c7',
      ]),
    ],
    completionGate:
      'Regulatory and professional standards framework confirmed. All qualifications and insurance in place before any therapeutic service is offered.',
    actHandoff: 'Regulatory & Professional Standards Framework',
    scopeNotes:
      'No therapeutic service is offered until all practitioner qualifications, registrations, and insurance are confirmed. This is a hard gate.',
  }),
  obj({
    id: 'well-s1-privacy-policy',
    stratumId: 's1-project-foundation',
    ref: 'WELL-S1.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound privacy & confidentiality policy',
    focusedQuestion:
      'How will guest privacy and confidential disclosures be protected - before any guest arrives?',
    checklist: [
      ck(
        'well-s1-privacy-policy-c1',
        'Define what guest information is collected and why',
      ),
      ck(
        'well-s1-privacy-policy-c2',
        'Define data storage, access, and retention policy',
      ),
      ck(
        'well-s1-privacy-policy-c3',
        'Define confidentiality obligations for all practitioners and staff',
      ),
      ck(
        'well-s1-privacy-policy-c4',
        'Define disclosure protocol - what triggers a mandatory disclosure and to whom',
      ),
      ck(
        'well-s1-privacy-policy-c5',
        'Define guest consent process for any information sharing',
      ),
      ck(
        'well-s1-privacy-policy-c6',
        'Obtain legal advice on privacy obligations for therapeutic services in this jurisdiction',
      ),
    ],
    decisionGroups: [
      dg('well-s1-privacy-policy-dg1', 'Data collection & storage', [
        'well-s1-privacy-policy-c1',
        'well-s1-privacy-policy-c2',
      ]),
      dg('well-s1-privacy-policy-dg2', 'Confidentiality & disclosure', [
        'well-s1-privacy-policy-c3',
        'well-s1-privacy-policy-c4',
      ]),
      dg('well-s1-privacy-policy-dg3', 'Consent & legal review', [
        'well-s1-privacy-policy-c5',
        'well-s1-privacy-policy-c6',
      ]),
    ],
    completionGate:
      'Privacy and confidentiality policy approved and legally reviewed.',
    actHandoff: 'Privacy & Confidentiality Policy',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'well-s2-sensory-environment',
    stratumId: 's2-land-reading',
    ref: 'WELL-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of the sensory environment - noise, light & smell',
    focusedQuestion:
      'What is the baseline sensory condition across the site - ambient noise levels, light quality, and olfactory environment?',
    checklist: [
      ck(
        'well-s2-sensory-environment-c1',
        'Record ambient noise levels by zone, time of day, and season - in decibels where possible',
      ),
      ck(
        'well-s2-sensory-environment-c2',
        'Map noise sources - roads, neighbours, farm operations, aircraft corridors',
      ),
      ck(
        'well-s2-sensory-environment-c3',
        'Assess natural light quality across the site - intensity, direction, seasonal variation',
      ),
      ck('well-s2-sensory-environment-c4', 'Identify light pollution sources'),
      ck(
        'well-s2-sensory-environment-c5',
        'Map olfactory environment - natural scent sources and any unpleasant odour sources',
      ),
      ck(
        'well-s2-sensory-environment-c6',
        'Confirm baseline sensory conditions are consistent with healing philosophy requirements',
      ),
    ],
    decisionGroups: [
      dg('well-s2-sensory-environment-dg1', 'Noise baseline & sources', [
        'well-s2-sensory-environment-c1',
        'well-s2-sensory-environment-c2',
      ]),
      dg('well-s2-sensory-environment-dg2', 'Light conditions', [
        'well-s2-sensory-environment-c3',
        'well-s2-sensory-environment-c4',
      ]),
      dg('well-s2-sensory-environment-dg3', 'Olfactory & philosophy fit', [
        'well-s2-sensory-environment-c5',
        'well-s2-sensory-environment-c6',
      ]),
    ],
    completionGate:
      'Sensory environment survey complete. Baseline noise, light, and olfactory conditions recorded.',
    actHandoff: 'Sensory Environment Survey',
  }),
  obj({
    id: 'well-s2-retreat-infrastructure',
    stratumId: 's2-land-reading',
    ref: 'WELL-S2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of existing retreat & healing infrastructure',
    focusedQuestion:
      'What treatment rooms, meditation spaces, accommodation, and gathering spaces already exist - and what is their therapeutic potential?',
    checklist: [
      ck(
        'well-s2-retreat-infrastructure-c1',
        'Inventory all existing spaces with therapeutic reuse potential - condition, size, acoustic quality',
      ),
      ck(
        'well-s2-retreat-infrastructure-c2',
        'Assess natural light quality in existing spaces',
      ),
      ck(
        'well-s2-retreat-infrastructure-c3',
        'Assess acoustic separation between existing spaces',
      ),
      ck(
        'well-s2-retreat-infrastructure-c4',
        'Assess privacy conditions of existing accommodation',
      ),
      ck(
        'well-s2-retreat-infrastructure-c5',
        'Identify renovation requirements and therapeutic enhancement potential for each space',
      ),
    ],
    decisionGroups: [
      dg('well-s2-retreat-infrastructure-dg1', 'Space inventory & light', [
        'well-s2-retreat-infrastructure-c1',
        'well-s2-retreat-infrastructure-c2',
      ], ['Infrastructure & Access']),
      dg('well-s2-retreat-infrastructure-dg2', 'Acoustic & privacy condition', [
        'well-s2-retreat-infrastructure-c3',
        'well-s2-retreat-infrastructure-c4',
      ], ['Infrastructure & Access']),
      dg('well-s2-retreat-infrastructure-dg3', 'Renovation potential', [
        'well-s2-retreat-infrastructure-c5',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Existing retreat and healing infrastructure inventoried. Therapeutic reuse potential assessed.',
    actHandoff: 'Existing Retreat & Healing Infrastructure Survey',
  }),
  obj({
    id: 'well-s2-landscape-context',
    stratumId: 's2-land-reading',
    ref: 'WELL-S2.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of surrounding landscape & vectors',
    focusedQuestion:
      'How does the surrounding landscape shape the sanctuary experience - and what contamination risks apply?',
    checklist: [
      ck(
        'well-s2-landscape-context-c1',
        'Map surrounding land uses within 2km',
      ),
      ck(
        'well-s2-landscape-context-c2',
        'Assess visual quality of surrounding landscape from key sanctuary vantage points',
      ),
      ck(
        'well-s2-landscape-context-c3',
        'Assess acoustic impact of surrounding activities on sanctuary noise levels',
      ),
      ck(
        'well-s2-landscape-context-c4',
        'Assess drinking water catchment contamination risk from surrounding landscape vectors',
      ),
      ck(
        'well-s2-landscape-context-c5',
        'Identify any surrounding developments that could compromise sanctuary character',
      ),
    ],
    decisionGroups: [
      dg('well-s2-landscape-context-dg1', 'Surrounding land & visual', [
        'well-s2-landscape-context-c1',
        'well-s2-landscape-context-c2',
      ]),
      dg('well-s2-landscape-context-dg2', 'Acoustic impact', [
        'well-s2-landscape-context-c3',
      ]),
      dg('well-s2-landscape-context-dg3', 'Contamination & threats', [
        'well-s2-landscape-context-c4',
        'well-s2-landscape-context-c5',
      ]),
    ],
    completionGate:
      'Landscape context survey complete. Visual, acoustic, and contamination risks identified.',
    actHandoff: 'Landscape Context & Vector Survey Package',
  }),
  obj({
    id: 'well-s2-privacy-gradient',
    stratumId: 's2-land-reading',
    ref: 'WELL-S2.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of the privacy gradient across the site',
    focusedQuestion:
      'What existing privacy conditions exist across the site - sightlines, acoustic separation, and buffer distances from boundaries?',
    checklist: [
      ck(
        'well-s2-privacy-gradient-c1',
        'Map sightlines from public roads and neighbouring properties across all zones',
      ),
      ck(
        'well-s2-privacy-gradient-c2',
        'Map acoustic transmission paths across the site',
      ),
      ck(
        'well-s2-privacy-gradient-c3',
        'Assess buffer distances between site boundaries and potential accommodation zones',
      ),
      ck(
        'well-s2-privacy-gradient-c4',
        'Identify natural privacy assets - dense vegetation, topographic screening, water features',
      ),
      ck(
        'well-s2-privacy-gradient-c5',
        'Identify privacy gaps requiring designed mitigation',
      ),
    ],
    decisionGroups: [
      dg('well-s2-privacy-gradient-dg1', 'Sightlines & acoustic paths', [
        'well-s2-privacy-gradient-c1',
        'well-s2-privacy-gradient-c2',
      ]),
      dg('well-s2-privacy-gradient-dg2', 'Buffers & natural assets', [
        'well-s2-privacy-gradient-c3',
        'well-s2-privacy-gradient-c4',
      ]),
      dg('well-s2-privacy-gradient-dg3', 'Privacy gaps', [
        'well-s2-privacy-gradient-c5',
      ]),
    ],
    completionGate:
      'Privacy gradient survey complete. Sightlines, acoustic paths, and buffer distances mapped.',
    actHandoff: 'Privacy Gradient Survey',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'well-s3-acoustic-conditions',
    stratumId: 's3-systems-reading',
    ref: 'WELL-S3.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of acoustic conditions & noise sources',
    focusedQuestion:
      'What are the measurable acoustic conditions across the site - and do they meet the thresholds required by the healing philosophy?',
    checklist: [
      ck(
        'well-s3-acoustic-conditions-c1',
        'Conduct acoustic survey by zone, time of day, and season',
      ),
      ck(
        'well-s3-acoustic-conditions-c2',
        'Record peak and average noise levels in proposed treatment, accommodation, and meditation zones',
      ),
      ck(
        'well-s3-acoustic-conditions-c3',
        'Identify primary noise sources - roads, neighbours, aircraft, farm operations',
      ),
      ck(
        'well-s3-acoustic-conditions-c4',
        'Assess acoustic transmission between proposed zones',
      ),
      ck(
        'well-s3-acoustic-conditions-c5',
        'Confirm whether existing acoustic conditions meet healing philosophy thresholds - or define the mitigation gap',
      ),
    ],
    decisionGroups: [
      dg('well-s3-acoustic-conditions-dg1', 'Acoustic survey & levels', [
        'well-s3-acoustic-conditions-c1',
        'well-s3-acoustic-conditions-c2',
      ]),
      dg('well-s3-acoustic-conditions-dg2', 'Sources & transmission', [
        'well-s3-acoustic-conditions-c3',
        'well-s3-acoustic-conditions-c4',
      ]),
      dg('well-s3-acoustic-conditions-dg3', 'Threshold gap', [
        'well-s3-acoustic-conditions-c5',
      ]),
    ],
    completionGate:
      'Acoustic conditions survey complete. Noise levels mapped against healing philosophy thresholds. Mitigation gap defined where applicable.',
    actHandoff: 'Acoustic Conditions Survey',
  }),
  obj({
    id: 'well-s3-water-features',
    stratumId: 's3-systems-reading',
    ref: 'WELL-S3.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of water features & hydrological potential',
    focusedQuestion:
      'What springs, streams, ponds, and water features exist - and what therapeutic landscape potential do they offer?',
    checklist: [
      ck(
        'well-s3-water-features-c1',
        'Map all existing water features - springs, streams, ponds, wetlands',
      ),
      ck(
        'well-s3-water-features-c2',
        'Assess water quality, flow reliability, and accessibility of each feature',
      ),
      ck(
        'well-s3-water-features-c3',
        'Assess therapeutic potential - visual, acoustic, tactile qualities',
      ),
      ck(
        'well-s3-water-features-c4',
        'Identify new water feature potential based on hydrological survey findings',
      ),
      ck(
        'well-s3-water-features-c5',
        'Confirm water features are compatible with guest safety requirements',
      ),
    ],
    decisionGroups: [
      dg('well-s3-water-features-dg1', 'Feature inventory & quality', [
        'well-s3-water-features-c1',
        'well-s3-water-features-c2',
      ], ['Water & Hydrology']),
      dg('well-s3-water-features-dg2', 'Therapeutic & new potential', [
        'well-s3-water-features-c3',
        'well-s3-water-features-c4',
      ], ['Water & Hydrology']),
      dg('well-s3-water-features-dg3', 'Safety compatibility', [
        'well-s3-water-features-c5',
      ], ['Water & Hydrology']),
    ],
    completionGate:
      'Water features and hydrological potential survey complete. Therapeutic potential assessed.',
    actHandoff: 'Water Features & Hydrological Potential Survey',
  }),
  obj({
    id: 'well-s3-healing-garden-ecology',
    stratumId: 's3-systems-reading',
    ref: 'WELL-S3.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of soil & plant ecology for healing gardens',
    focusedQuestion:
      'What medicinal, sensory, and therapeutic plant species are already present - and what does the soil support?',
    checklist: [
      ck(
        'well-s3-healing-garden-ecology-c1',
        'Identify existing medicinal and therapeutic plant species on site',
      ),
      ck(
        'well-s3-healing-garden-ecology-c2',
        'Assess soil health in proposed healing garden zones',
      ),
      ck(
        'well-s3-healing-garden-ecology-c3',
        'Map microclimate suitability for sensory planting - shade, warmth, moisture',
      ),
      ck(
        'well-s3-healing-garden-ecology-c4',
        'Identify existing plants with strong sensory value - scent, texture, colour',
      ),
      ck(
        'well-s3-healing-garden-ecology-c5',
        'Define what the site can support without intensive soil improvement',
      ),
    ],
    decisionGroups: [
      dg('well-s3-healing-garden-ecology-dg1', 'Existing species & soil', [
        'well-s3-healing-garden-ecology-c1',
        'well-s3-healing-garden-ecology-c2',
      ], ['Soil']),
      dg('well-s3-healing-garden-ecology-dg2', 'Microclimate & sensory plants', [
        'well-s3-healing-garden-ecology-c3',
        'well-s3-healing-garden-ecology-c4',
      ], ['Soil']),
      dg('well-s3-healing-garden-ecology-dg3', 'Support capacity', [
        'well-s3-healing-garden-ecology-c5',
      ], ['Soil']),
    ],
    completionGate:
      'Healing garden potential survey complete. Existing therapeutic species and soil conditions assessed.',
    actHandoff: 'Soil & Plant Ecology for Healing Garden Survey',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'well-s4-sensory-design-standards',
    stratumId: 's4-foundation-decisions',
    ref: 'WELL-S4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear sensory design philosophy & low-stimulation standards',
    focusedQuestion:
      'What measurable sensory thresholds define this sanctuary - noise, light, scent, and visual complexity - and how do they gate all design decisions?',
    checklist: [
      ck(
        'well-s4-sensory-design-standards-c1',
        'Define maximum noise threshold in treatment and meditation zones - in decibels',
      ),
      ck(
        'well-s4-sensory-design-standards-c2',
        'Define maximum noise threshold in accommodation zones',
      ),
      ck(
        'well-s4-sensory-design-standards-c3',
        'Define lighting standards - natural light priority, artificial light limits by zone and time',
      ),
      ck(
        'well-s4-sensory-design-standards-c4',
        'Define acceptable scent environment - natural aromatics only, no synthetic fragrances',
      ),
      ck(
        'well-s4-sensory-design-standards-c5',
        'Define visual complexity limits - no advertising, signage minimisation, material palette restraint',
      ),
      ck(
        'well-s4-sensory-design-standards-c6',
        'Confirm standards are achievable against acoustic survey findings',
      ),
      ck(
        'well-s4-sensory-design-standards-c7',
        'Document standards as design gate - all Tier 4 decisions evaluated against them',
      ),
    ],
    decisionGroups: [
      dg('well-s4-sensory-design-standards-dg1', 'Noise thresholds', [
        'well-s4-sensory-design-standards-c1',
        'well-s4-sensory-design-standards-c2',
      ]),
      dg('well-s4-sensory-design-standards-dg2', 'Light & scent standards', [
        'well-s4-sensory-design-standards-c3',
        'well-s4-sensory-design-standards-c4',
      ]),
      dg('well-s4-sensory-design-standards-dg3', 'Visual restraint & gate', [
        'well-s4-sensory-design-standards-c5',
        'well-s4-sensory-design-standards-c6',
        'well-s4-sensory-design-standards-c7',
      ]),
    ],
    completionGate:
      'Sensory design standards approved and documented. All Tier 4 designs must meet these thresholds.',
    actHandoff: 'Sensory Design Philosophy & Low-Stimulation Standards',
    scopeNotes:
      'These standards are design gates, not aspirational targets. Any Tier 4 design element that cannot meet a defined threshold must be redesigned or removed.',
  }),
  obj({
    id: 'well-s4-therapeutic-program',
    stratumId: 's4-foundation-decisions',
    ref: 'WELL-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound therapeutic program & practitioner framework',
    focusedQuestion:
      'What modalities are offered, who delivers them, under what qualifications and scope of practice?',
    checklist: [
      ck(
        'well-s4-therapeutic-program-c1',
        'Confirm modalities offered against regulatory framework confirmed in Tier 0',
      ),
      ck(
        'well-s4-therapeutic-program-c2',
        'Define practitioner qualifications required per modality',
      ),
      ck(
        'well-s4-therapeutic-program-c3',
        'Define practitioner-to-guest ratio for each modality',
      ),
      ck(
        'well-s4-therapeutic-program-c4',
        'Define session structure, duration, and sequencing',
      ),
      ck(
        'well-s4-therapeutic-program-c5',
        'Define referral network for conditions outside scope',
      ),
      ck(
        'well-s4-therapeutic-program-c6',
        'Confirm all practitioners hold required qualifications and insurance before programme launch',
      ),
    ],
    decisionGroups: [
      dg('well-s4-therapeutic-program-dg1', 'Modalities & qualifications', [
        'well-s4-therapeutic-program-c1',
        'well-s4-therapeutic-program-c2',
      ]),
      dg('well-s4-therapeutic-program-dg2', 'Ratios & session design', [
        'well-s4-therapeutic-program-c3',
        'well-s4-therapeutic-program-c4',
      ]),
      dg('well-s4-therapeutic-program-dg3', 'Referral & insurance gate', [
        'well-s4-therapeutic-program-c5',
        'well-s4-therapeutic-program-c6',
      ]),
    ],
    completionGate:
      'Therapeutic programme and practitioner framework approved. All qualifications confirmed.',
    actHandoff: 'Therapeutic Program & Practitioner Framework Brief',
  }),
  obj({
    id: 'well-s4-privacy-zone-hierarchy',
    stratumId: 's4-foundation-decisions',
    ref: 'WELL-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear privacy gradient & zone hierarchy',
    focusedQuestion:
      'Which zones are most private, how is separation achieved between zones, and what transitions connect them?',
    checklist: [
      ck(
        'well-s4-privacy-zone-hierarchy-c1',
        'Define privacy tier for each zone - public approach, semi-private communal, private guest, most private treatment',
      ),
      ck(
        'well-s4-privacy-zone-hierarchy-c2',
        'Define physical separation method between privacy tiers - distance, planting, earth form, acoustic barrier',
      ),
      ck(
        'well-s4-privacy-zone-hierarchy-c3',
        'Define transition design between tiers - how guests move from one privacy level to the next',
      ),
      ck(
        'well-s4-privacy-zone-hierarchy-c4',
        'Define access control between zones - who can enter what, under what conditions',
      ),
      ck(
        'well-s4-privacy-zone-hierarchy-c5',
        'Confirm privacy gradient is achievable against site survey findings',
      ),
    ],
    decisionGroups: [
      dg('well-s4-privacy-zone-hierarchy-dg1', 'Privacy tiers & separation', [
        'well-s4-privacy-zone-hierarchy-c1',
        'well-s4-privacy-zone-hierarchy-c2',
      ]),
      dg('well-s4-privacy-zone-hierarchy-dg2', 'Transitions & access control', [
        'well-s4-privacy-zone-hierarchy-c3',
        'well-s4-privacy-zone-hierarchy-c4',
      ]),
      dg('well-s4-privacy-zone-hierarchy-dg3', 'Feasibility', [
        'well-s4-privacy-zone-hierarchy-c5',
      ]),
    ],
    completionGate:
      'Privacy gradient and zone hierarchy approved. Physical separation methods defined for all zone boundaries.',
    actHandoff: 'Privacy Gradient & Zone Hierarchy Brief',
  }),
  obj({
    id: 'well-s4-healing-garden-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'WELL-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound healing garden & therapeutic landscape strategy',
    focusedQuestion:
      'Which plants, water features, and sensory elements will constitute the therapeutic landscape - and where?',
    checklist: [
      ck(
        'well-s4-healing-garden-strategy-c1',
        'Define therapeutic planting palette - species selected for scent, texture, colour, and medicinal value',
      ),
      ck(
        'well-s4-healing-garden-strategy-c2',
        'Define water feature strategy - existing features enhanced, new features designed',
      ),
      ck(
        'well-s4-healing-garden-strategy-c3',
        'Define sensory walk and contemplative path approach',
      ),
      ck(
        'well-s4-healing-garden-strategy-c4',
        'Define seasonal therapeutic landscape calendar - what is available when',
      ),
      ck(
        'well-s4-healing-garden-strategy-c5',
        'Confirm planting strategy is consistent with sensory design standards',
      ),
    ],
    decisionGroups: [
      dg('well-s4-healing-garden-strategy-dg1', 'Planting & water strategy', [
        'well-s4-healing-garden-strategy-c1',
        'well-s4-healing-garden-strategy-c2',
      ]),
      dg('well-s4-healing-garden-strategy-dg2', 'Sensory walk & calendar', [
        'well-s4-healing-garden-strategy-c3',
        'well-s4-healing-garden-strategy-c4',
      ]),
      dg('well-s4-healing-garden-strategy-dg3', 'Standards fit', [
        'well-s4-healing-garden-strategy-c5',
      ]),
    ],
    completionGate:
      'Healing garden and therapeutic landscape strategy approved. Planting palette and water feature strategy confirmed.',
    actHandoff: 'Healing Garden & Therapeutic Landscape Strategy Brief',
  }),
  obj({
    id: 'well-s4-safeguarding-protocol',
    stratumId: 's4-foundation-decisions',
    ref: 'WELL-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound guest wellbeing safeguarding protocol',
    focusedQuestion:
      'What happens if a guest presents in crisis, discloses trauma, or requires clinical referral - before any guest arrives?',
    checklist: [
      ck(
        'well-s4-safeguarding-protocol-c1',
        'Define crisis response protocol - immediate steps when a guest presents in distress',
      ),
      ck(
        'well-s4-safeguarding-protocol-c2',
        'Define trauma disclosure response - practitioner obligations and guest support pathway',
      ),
      ck(
        'well-s4-safeguarding-protocol-c3',
        'Define clinical referral pathway - when and how guests are referred to clinical services',
      ),
      ck(
        'well-s4-safeguarding-protocol-c4',
        'Define emergency services contact protocol',
      ),
      ck(
        'well-s4-safeguarding-protocol-c5',
        'Define incident recording and review system',
      ),
      ck(
        'well-s4-safeguarding-protocol-c6',
        'Confirm all practitioners are trained in safeguarding protocol before first guest arrival',
      ),
      ck(
        'well-s4-safeguarding-protocol-c7',
        'Obtain legal advice on safeguarding obligations for this therapeutic context',
      ),
    ],
    decisionGroups: [
      dg('well-s4-safeguarding-protocol-dg1', 'Crisis & trauma response', [
        'well-s4-safeguarding-protocol-c1',
        'well-s4-safeguarding-protocol-c2',
      ]),
      dg('well-s4-safeguarding-protocol-dg2', 'Referral & emergency', [
        'well-s4-safeguarding-protocol-c3',
        'well-s4-safeguarding-protocol-c4',
      ]),
      dg('well-s4-safeguarding-protocol-dg3', 'Incident, training & legal', [
        'well-s4-safeguarding-protocol-c5',
        'well-s4-safeguarding-protocol-c6',
        'well-s4-safeguarding-protocol-c7',
      ]),
    ],
    completionGate:
      'Safeguarding protocol approved and legally reviewed. All practitioners trained before first guest.',
    actHandoff: 'Guest Wellbeing Safeguarding Protocol',
    scopeNotes:
      'This protocol precedes the therapeutic programme framework. You cannot define what you offer until you have defined what you will do when something goes wrong.',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'well-s5-treatment-spaces',
    stratumId: 's5-system-design',
    ref: 'WELL-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed treatment, therapy & meditation spaces',
    focusedQuestion:
      'How will treatment rooms, meditation halls, and therapy spaces be designed to meet sensory design standards?',
    checklist: [
      ck(
        'well-s5-treatment-spaces-c1',
        'Design treatment room layout - acoustic isolation, natural light, thermal comfort, privacy',
      ),
      ck(
        'well-s5-treatment-spaces-c2',
        'Specify acoustic performance requirements for each treatment space - maximum noise ingress',
      ),
      ck(
        'well-s5-treatment-spaces-c3',
        'Design meditation hall - acoustic quality, natural materials, orientation, proportions',
      ),
      ck(
        'well-s5-treatment-spaces-c4',
        'Design outdoor treatment and meditation spaces - screening, acoustic shelter, ground surface',
      ),
      ck(
        'well-s5-treatment-spaces-c5',
        'Specify material palette - natural, tactile, visually restful',
      ),
      ck(
        'well-s5-treatment-spaces-c6',
        'Confirm all spaces meet sensory design standard thresholds',
      ),
    ],
    decisionGroups: [
      dg('well-s5-treatment-spaces-dg1', 'Treatment room & acoustics', [
        'well-s5-treatment-spaces-c1',
        'well-s5-treatment-spaces-c2',
      ], ['Infrastructure & Access']),
      dg('well-s5-treatment-spaces-dg2', 'Meditation & outdoor spaces', [
        'well-s5-treatment-spaces-c3',
        'well-s5-treatment-spaces-c4',
      ], ['Infrastructure & Access']),
      dg('well-s5-treatment-spaces-dg3', 'Materials & thresholds', [
        'well-s5-treatment-spaces-c5',
        'well-s5-treatment-spaces-c6',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Treatment, therapy, and meditation space designs approved. All sensory thresholds confirmed.',
    actHandoff: 'Treatment, Therapy & Meditation Spaces Design Package',
  }),
  obj({
    id: 'well-s5-healing-garden-design',
    stratumId: 's5-system-design',
    ref: 'WELL-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A designed healing garden & sensory landscape',
    focusedQuestion:
      'How will the healing garden and therapeutic landscape be physically designed?',
    checklist: [
      ck(
        'well-s5-healing-garden-design-c1',
        'Design therapeutic planting zones - species placement, layering, seasonal succession',
      ),
      ck(
        'well-s5-healing-garden-design-c2',
        'Design sensory walk sequence - scent, texture, sound, sight progression',
      ),
      ck(
        'well-s5-healing-garden-design-c3',
        'Design water features - ponds, channels, fountains - acoustic and visual integration',
      ),
      ck(
        'well-s5-healing-garden-design-c4',
        'Design contemplative seating and shelter placement',
      ),
      ck(
        'well-s5-healing-garden-design-c5',
        'Design path surfaces - materials appropriate to therapeutic intent - natural, grounded',
      ),
      ck(
        'well-s5-healing-garden-design-c6',
        'Confirm all elements meet sensory design standards',
      ),
    ],
    decisionGroups: [
      dg('well-s5-healing-garden-design-dg1', 'Planting & sensory walk', [
        'well-s5-healing-garden-design-c1',
        'well-s5-healing-garden-design-c2',
      ], ['Vegetation & Succession']),
      dg('well-s5-healing-garden-design-dg2', 'Water & seating', [
        'well-s5-healing-garden-design-c3',
        'well-s5-healing-garden-design-c4',
      ], ['Vegetation & Succession']),
      dg('well-s5-healing-garden-design-dg3', 'Paths & standards', [
        'well-s5-healing-garden-design-c5',
        'well-s5-healing-garden-design-c6',
      ], ['Vegetation & Succession']),
    ],
    completionGate:
      'Healing garden and sensory landscape design approved. All elements consistent with sensory standards.',
    actHandoff: 'Healing Garden & Sensory Landscape Design Package',
  }),
  obj({
    id: 'well-s5-guest-accommodation',
    stratumId: 's5-system-design',
    ref: 'WELL-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed guest accommodation & retreat spaces',
    focusedQuestion:
      'How will guest accommodation be designed for maximum privacy, acoustic isolation, and low-stimulation comfort?',
    checklist: [
      ck(
        'well-s5-guest-accommodation-c1',
        'Design accommodation placement - maximum distance from noise sources, acoustic shelter from site operations',
      ),
      ck(
        'well-s5-guest-accommodation-c2',
        'Specify acoustic performance - wall, floor, ceiling construction standards',
      ),
      ck(
        'well-s5-guest-accommodation-c3',
        'Design natural ventilation and thermal comfort - no mechanical HVAC noise',
      ),
      ck(
        'well-s5-guest-accommodation-c4',
        'Design private outdoor space for each accommodation unit',
      ),
      ck(
        'well-s5-guest-accommodation-c5',
        'Specify material and colour palette - natural materials, muted tones',
      ),
      ck(
        'well-s5-guest-accommodation-c6',
        'Confirm accommodation meets sensory design standard thresholds',
      ),
    ],
    decisionGroups: [
      dg('well-s5-guest-accommodation-dg1', 'Placement & acoustics', [
        'well-s5-guest-accommodation-c1',
        'well-s5-guest-accommodation-c2',
      ], ['Infrastructure & Access']),
      dg('well-s5-guest-accommodation-dg2', 'Ventilation & outdoor', [
        'well-s5-guest-accommodation-c3',
        'well-s5-guest-accommodation-c4',
      ], ['Infrastructure & Access']),
      dg('well-s5-guest-accommodation-dg3', 'Materials & thresholds', [
        'well-s5-guest-accommodation-c5',
        'well-s5-guest-accommodation-c6',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Guest accommodation design approved. Acoustic performance and sensory standards confirmed.',
    actHandoff: 'Guest Accommodation & Private Retreat Spaces Design Package',
  }),
  obj({
    id: 'well-s5-privacy-screening',
    stratumId: 's5-system-design',
    ref: 'WELL-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Working privacy screening & acoustic buffering',
    focusedQuestion:
      'How will the physical privacy gradient be implemented - earth bunding, dense planting, acoustic barriers?',
    checklist: [
      ck(
        'well-s5-privacy-screening-c1',
        'Design screening planting along site boundaries - species, density, layering',
      ),
      ck(
        'well-s5-privacy-screening-c2',
        'Design earth bunding where required for acoustic or visual separation',
      ),
      ck(
        'well-s5-privacy-screening-c3',
        'Specify acoustic barrier materials and performance where planting alone is insufficient',
      ),
      ck(
        'well-s5-privacy-screening-c4',
        'Design internal zone screening - between accommodation clusters, between treatment and communal areas',
      ),
      ck(
        'well-s5-privacy-screening-c5',
        'Confirm all screening meets privacy gradient and sensory design standards',
      ),
    ],
    decisionGroups: [
      dg('well-s5-privacy-screening-dg1', 'Boundary planting & bunding', [
        'well-s5-privacy-screening-c1',
        'well-s5-privacy-screening-c2',
      ], ['Infrastructure & Access']),
      dg('well-s5-privacy-screening-dg2', 'Barriers & internal screening', [
        'well-s5-privacy-screening-c3',
        'well-s5-privacy-screening-c4',
      ], ['Infrastructure & Access']),
      dg('well-s5-privacy-screening-dg3', 'Standards confirmation', [
        'well-s5-privacy-screening-c5',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Privacy screening and acoustic buffering design approved. All zone boundaries meet defined standards.',
    actHandoff: 'Privacy Screening & Acoustic Buffering Design Package',
  }),
  obj({
    id: 'well-s5-dining-nourishment',
    stratumId: 's5-system-design',
    ref: 'WELL-S5.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed dining & nourishment infrastructure',
    focusedQuestion:
      'How will kitchen, dining, and food preparation be designed as a therapeutic modality - quiet, unhurried, whole-food focused?',
    checklist: [
      ck(
        'well-s5-dining-nourishment-c1',
        'Design kitchen layout - quiet operation priority, natural materials, good natural light',
      ),
      ck(
        'well-s5-dining-nourishment-c2',
        'Specify kitchen equipment - acoustic performance, no intrusive mechanical noise',
      ),
      ck(
        'well-s5-dining-nourishment-c3',
        'Design dining space - intimate scale, natural materials, acoustic comfort, connection to healing garden',
      ),
      ck(
        'well-s5-dining-nourishment-c4',
        'Design food storage - natural materials, no plastic dominant surfaces',
      ),
      ck(
        'well-s5-dining-nourishment-c5',
        'Define nourishment philosophy - whole food, seasonal, medicinal where appropriate',
      ),
      ck(
        'well-s5-dining-nourishment-c6',
        'Confirm dining design is consistent with sensory design standards',
      ),
    ],
    decisionGroups: [
      dg('well-s5-dining-nourishment-dg1', 'Kitchen design & equipment', [
        'well-s5-dining-nourishment-c1',
        'well-s5-dining-nourishment-c2',
      ], ['Infrastructure & Access']),
      dg('well-s5-dining-nourishment-dg2', 'Dining & storage', [
        'well-s5-dining-nourishment-c3',
        'well-s5-dining-nourishment-c4',
      ], ['Infrastructure & Access']),
      dg('well-s5-dining-nourishment-dg3', 'Nourishment philosophy & standards', [
        'well-s5-dining-nourishment-c5',
        'well-s5-dining-nourishment-c6',
      ], ['Infrastructure & Access']),
    ],
    completionGate:
      'Dining and nourishment infrastructure design approved. Sensory and nourishment standards confirmed.',
    actHandoff: 'Dining & Nourishment Infrastructure Design Package',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'well-s6-outcome-monitoring',
    stratumId: 's6-integration-design',
    ref: 'WELL-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working guest wellbeing & outcome monitor',
    focusedQuestion:
      'How will guest experience, therapeutic outcomes, and practitioner feedback be tracked and improved?',
    checklist: [
      ck(
        'well-s6-outcome-monitoring-c1',
        'Define therapeutic outcome indicators - what change in guests defines success',
      ),
      ck(
        'well-s6-outcome-monitoring-c2',
        'Design guest experience feedback collection - post-stay, in-programme, anonymous option',
      ),
      ck(
        'well-s6-outcome-monitoring-c3',
        'Define practitioner feedback and peer review process',
      ),
      ck(
        'well-s6-outcome-monitoring-c4',
        'Define outcome review frequency and programme adjustment protocol',
      ),
      ck(
        'well-s6-outcome-monitoring-c5',
        'Confirm all monitoring is consistent with privacy and confidentiality policy',
      ),
    ],
    decisionGroups: [
      dg('well-s6-outcome-monitoring-dg1', 'Outcome indicators & feedback', [
        'well-s6-outcome-monitoring-c1',
        'well-s6-outcome-monitoring-c2',
      ]),
      dg('well-s6-outcome-monitoring-dg2', 'Practitioner review & cadence', [
        'well-s6-outcome-monitoring-c3',
        'well-s6-outcome-monitoring-c4',
      ]),
      dg('well-s6-outcome-monitoring-dg3', 'Privacy alignment', [
        'well-s6-outcome-monitoring-c5',
      ]),
    ],
    completionGate:
      'Guest wellbeing and therapeutic outcome monitoring system approved. Consistent with privacy policy.',
    actHandoff: 'Guest Wellbeing & Therapeutic Outcome Monitoring System',
  }),
  obj({
    id: 'well-s6-sensory-monitoring',
    stratumId: 's6-integration-design',
    ref: 'WELL-S6.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working sensory environment monitor',
    focusedQuestion:
      'How will acoustic, light, and olfactory conditions be monitored to confirm sanctuary standards are maintained?',
    checklist: [
      ck(
        'well-s6-sensory-monitoring-c1',
        'Design acoustic monitoring protocol - periodic noise measurement in treatment and accommodation zones',
      ),
      ck(
        'well-s6-sensory-monitoring-c2',
        'Design light quality monitoring - seasonal assessment of natural light in key spaces',
      ),
      ck(
        'well-s6-sensory-monitoring-c3',
        'Define olfactory monitoring - periodic assessment of scent environment in guest zones',
      ),
      ck(
        'well-s6-sensory-monitoring-c4',
        'Define sensory standard breach protocol - what triggers a response and what the response is',
      ),
      ck(
        'well-s6-sensory-monitoring-c5',
        'Specify monitoring frequency and documentation requirements',
      ),
    ],
    decisionGroups: [
      dg('well-s6-sensory-monitoring-dg1', 'Acoustic & light monitoring', [
        'well-s6-sensory-monitoring-c1',
        'well-s6-sensory-monitoring-c2',
      ]),
      dg('well-s6-sensory-monitoring-dg2', 'Olfactory & breach protocol', [
        'well-s6-sensory-monitoring-c3',
        'well-s6-sensory-monitoring-c4',
      ]),
      dg('well-s6-sensory-monitoring-dg3', 'Frequency & documentation', [
        'well-s6-sensory-monitoring-c5',
      ]),
    ],
    completionGate:
      'Sensory environment monitoring protocol approved. Breach response protocol defined.',
    actHandoff: 'Sensory Environment Monitoring Protocol',
  }),
  obj({
    id: 'well-s6-external-relations',
    stratumId: 's6-integration-design',
    ref: 'WELL-S6.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working external relations & compliance monitor',
    focusedQuestion:
      'How will practitioner registrations, insurance, safeguarding audits, and neighbour relations be actively managed?',
    checklist: [
      ck(
        'well-s6-external-relations-c1',
        'Design compliance calendar - practitioner registration renewals, insurance renewals, CPD obligations',
      ),
      ck(
        'well-s6-external-relations-c2',
        'Define safeguarding audit schedule and reviewer',
      ),
      ck(
        'well-s6-external-relations-c3',
        'Define neighbour communication rhythm',
      ),
      ck('well-s6-external-relations-c4', 'Design complaint response process'),
      ck(
        'well-s6-external-relations-c5',
        'Define annual external relations review',
      ),
    ],
    decisionGroups: [
      dg('well-s6-external-relations-dg1', 'Compliance calendar & audits', [
        'well-s6-external-relations-c1',
        'well-s6-external-relations-c2',
      ]),
      dg('well-s6-external-relations-dg2', 'Neighbour & complaint relations', [
        'well-s6-external-relations-c3',
        'well-s6-external-relations-c4',
      ]),
      dg('well-s6-external-relations-dg3', 'Annual review', [
        'well-s6-external-relations-c5',
      ]),
    ],
    completionGate:
      'External relations and compliance monitoring system approved.',
    actHandoff: 'External Relations & Compliance Monitoring System',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'well-s7-program-launch',
    stratumId: 's7-phasing-resourcing',
    ref: 'WELL-S7.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sequenced therapeutic program launch',
    focusedQuestion:
      'In what order will therapeutic modalities be offered - soft launch with limited programme before full offering?',
    checklist: [
      ck(
        'well-s7-program-launch-c1',
        'Define soft launch programme - limited modalities, limited guests, invitation-based - HARD GATE: no public bookings until soft launch is reviewed and passed',
      ),
      ck(
        'well-s7-program-launch-c2',
        'Define soft launch review criteria - explicit pass/fail checklist covering sensory standards, safeguarding, guest experience, and practitioner performance',
      ),
      ck(
        'well-s7-program-launch-c3',
        'Define full programme launch criteria - what must be confirmed before all modalities open',
      ),
      ck(
        'well-s7-program-launch-c4',
        'Define phased modality introduction - sequence of adding modalities based on practitioner readiness and space confirmation',
      ),
      ck(
        'well-s7-program-launch-c5',
        'Assign ownership and review cadence for the launch sequence - who signs off the soft-launch and full-launch gates, and when the soft-launch review is re-run as each new modality is phased in before public bookings expand',
      ),
    ],
    decisionGroups: [
      dg('well-s7-program-launch-dg1', 'Soft launch & review gate', [
        'well-s7-program-launch-c1',
        'well-s7-program-launch-c2',
      ]),
      dg('well-s7-program-launch-dg2', 'Full launch & phased modalities', [
        'well-s7-program-launch-c3',
        'well-s7-program-launch-c4',
      ]),
      dg('well-s7-program-launch-dg3', 'Ownership & cadence', [
        'well-s7-program-launch-c5',
      ]),
    ],
    completionGate:
      'Therapeutic programme launch sequence approved. Soft launch pass/fail criteria defined as hard gate before public bookings.',
    actHandoff: 'Therapeutic Program Launch Sequence',
    scopeNotes:
      'Hard gate: no public bookings until soft launch criteria are reviewed and passed. This is the same principle as Agritourism - launching at full capacity before systems are tested produces poor outcomes and reputational damage that is slow to recover.',
  }),
  obj({
    id: 'well-s7-practitioner-onboarding',
    stratumId: 's7-phasing-resourcing',
    ref: 'WELL-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound practitioner onboarding & supervision framework',
    focusedQuestion:
      'How will practitioners be inducted, supervised, and supported - before first guest arrives?',
    checklist: [
      ck(
        'well-s7-practitioner-onboarding-c1',
        'Define practitioner orientation programme - philosophy, standards, protocols, spaces',
      ),
      ck(
        'well-s7-practitioner-onboarding-c2',
        'Define supervision structure - individual, peer, and external supervision schedule',
      ),
      ck(
        'well-s7-practitioner-onboarding-c3',
        'Define practitioner performance review process',
      ),
      ck(
        'well-s7-practitioner-onboarding-c4',
        'Define practitioner wellbeing support - this is a demanding practice environment',
      ),
      ck(
        'well-s7-practitioner-onboarding-c5',
        'Confirm all practitioners have completed onboarding before first guest arrival',
      ),
    ],
    decisionGroups: [
      dg('well-s7-practitioner-onboarding-dg1', 'Orientation & supervision', [
        'well-s7-practitioner-onboarding-c1',
        'well-s7-practitioner-onboarding-c2',
      ]),
      dg('well-s7-practitioner-onboarding-dg2', 'Performance & wellbeing', [
        'well-s7-practitioner-onboarding-c3',
        'well-s7-practitioner-onboarding-c4',
      ]),
      dg('well-s7-practitioner-onboarding-dg3', 'Onboarding gate', [
        'well-s7-practitioner-onboarding-c5',
      ]),
    ],
    completionGate:
      'Practitioner onboarding and supervision framework approved. All practitioners inducted before launch.',
    actHandoff: 'Practitioner Onboarding & Supervision Framework',
  }),
  obj({
    id: 'well-s7-adaptive-management',
    stratumId: 's7-phasing-resourcing',
    ref: 'WELL-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound adaptive management protocol',
    focusedQuestion:
      'How will monitoring findings trigger changes to the sanctuary programme and management plan?',
    checklist: [
      ck(
        'well-s7-adaptive-management-c1',
        'Define annual review process - therapeutic outcomes, sensory standards, financial, and practitioner wellbeing data reviewed together',
      ),
      ck(
        'well-s7-adaptive-management-c2',
        'Define decision triggers - what outcomes require a programme or management change',
      ),
      ck(
        'well-s7-adaptive-management-c3',
        'Define escalation process for safeguarding incidents, compliance breaches, or sensory standard failures',
      ),
      ck(
        'well-s7-adaptive-management-c4',
        'Specify documentation requirements for all changes',
      ),
      ck(
        'well-s7-adaptive-management-c5',
        'Define 3-year comprehensive review against Tier 0 healing philosophy and vision',
      ),
    ],
    decisionGroups: [
      dg('well-s7-adaptive-management-dg1', 'Annual review & triggers', [
        'well-s7-adaptive-management-c1',
        'well-s7-adaptive-management-c2',
      ]),
      dg('well-s7-adaptive-management-dg2', 'Escalation & documentation', [
        'well-s7-adaptive-management-c3',
        'well-s7-adaptive-management-c4',
      ]),
      dg('well-s7-adaptive-management-dg3', 'Three-year review', [
        'well-s7-adaptive-management-c5',
      ]),
    ],
    completionGate:
      'Adaptive management protocol approved. Review cycle, triggers, and documentation confirmed.',
    actHandoff: 'Adaptive Management Protocol',
  }),
];

// ----------------------------------------------------------------------------
// SECONDARY LAYER (authored under the 2026-05-30 "derive + author" override).
//
// 5 additive overlay objectives derived from the primary layer - the wellness
// concerns a host primary would not already carry when Wellness is layered on as
// a secondary type. No patch records (additive only, per the ruling). ids use the
// well-sec-* namespace; refs sequenced after the primary WELL numbers (S1.8/1.9,
// S4.9-4.11) so they never collide with the primary set.
// ----------------------------------------------------------------------------
export const WELLNESS_SECONDARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  obj({
    id: 'well-sec-s1-healing-philosophy',
    stratumId: 's1-project-foundation',
    ref: 'WELL-S1.8',
    source: 'secondary',
    sourceTypeId: PRIMARY,
    secondaryClass: 'additive',
    title: 'A clear healing philosophy & therapeutic overlay intent',
    focusedQuestion:
      "When wellness is layered onto this land's primary purpose, what does healing mean here and how does it constrain the host design?",
    checklist: [
      ck('well-sec-s1-healing-philosophy-c1', 'Define the healing philosophy this wellness layer brings to the host project - what it believes about healing'),
      ck('well-sec-s1-healing-philosophy-c2', 'Identify the therapeutic modalities the layer offers alongside the primary land use'),
      ck('well-sec-s1-healing-philosophy-c3', 'Define which host activities and conditions are compatible with therapeutic guest presence'),
      ck('well-sec-s1-healing-philosophy-c4', 'Establish the non-negotiable environmental conditions the healing layer requires - silence, light, privacy'),
      ck('well-sec-s1-healing-philosophy-c5', 'Confirm the healing overlay supports rather than competes with the primary land purpose'),
    ],
    decisionGroups: [
      dg('well-sec-s1-healing-philosophy-dg1', 'Philosophy & modalities', [
        'well-sec-s1-healing-philosophy-c1',
        'well-sec-s1-healing-philosophy-c2',
      ]),
      dg('well-sec-s1-healing-philosophy-dg2', 'Host compatibility & conditions', [
        'well-sec-s1-healing-philosophy-c3',
        'well-sec-s1-healing-philosophy-c4',
      ]),
      dg('well-sec-s1-healing-philosophy-dg3', 'Reconciliation', [
        'well-sec-s1-healing-philosophy-c5',
      ]),
    ],
    completionGate: 'Healing philosophy overlay approved and reconciled with the primary land purpose.',
    actHandoff: 'Healing Philosophy Overlay Brief',
  }),
  obj({
    id: 'well-sec-s1-regulatory-standards',
    stratumId: 's1-project-foundation',
    ref: 'WELL-S1.9',
    source: 'secondary',
    sourceTypeId: PRIMARY,
    secondaryClass: 'additive',
    title: 'Confirmed therapeutic regulatory & professional standards',
    focusedQuestion:
      'What practitioner qualifications, insurance, and compliance obligations must be added before therapeutic services run alongside the primary use?',
    scopeNotes:
      'Hard gate - no therapeutic service runs alongside the primary use until practitioner qualifications, registrations, and insurance are confirmed.',
    checklist: [
      ck('well-sec-s1-regulatory-standards-c1', 'Identify required practitioner qualifications and registrations for each modality offered'),
      ck('well-sec-s1-regulatory-standards-c2', 'Define professional insurance and scope-of-practice requirements for the therapeutic layer'),
      ck('well-sec-s1-regulatory-standards-c3', 'Identify therapeutic-service health, safety, and licensing obligations beyond the primary use'),
      ck('well-sec-s1-regulatory-standards-c4', 'Define the compliance calendar for the therapeutic layer - renewals, CPD, audits'),
      ck('well-sec-s1-regulatory-standards-c5', 'Confirm no therapeutic service is offered until all qualifications and insurance are in place'),
    ],
    decisionGroups: [
      dg('well-sec-s1-regulatory-standards-dg1', 'Qualifications & insurance', [
        'well-sec-s1-regulatory-standards-c1',
        'well-sec-s1-regulatory-standards-c2',
      ]),
      dg('well-sec-s1-regulatory-standards-dg2', 'Obligations & calendar', [
        'well-sec-s1-regulatory-standards-c3',
        'well-sec-s1-regulatory-standards-c4',
      ]),
      dg('well-sec-s1-regulatory-standards-dg3', 'Service gate', [
        'well-sec-s1-regulatory-standards-c5',
      ]),
    ],
    completionGate:
      'Therapeutic regulatory and professional standards confirmed for the overlay before any service is offered.',
    actHandoff: 'Therapeutic Regulatory & Standards Overlay Brief',
  }),
  obj({
    id: 'well-sec-s4-sensory-standards',
    stratumId: 's4-foundation-decisions',
    ref: 'WELL-S4.9',
    source: 'secondary',
    sourceTypeId: PRIMARY,
    secondaryClass: 'additive',
    title: 'Clear sensory & low-stimulation standards for therapeutic zones',
    focusedQuestion:
      "What measurable sensory thresholds must therapeutic zones meet, given the host primary's operations nearby?",
    checklist: [
      ck('well-sec-s4-sensory-standards-c1', 'Define maximum noise thresholds for treatment, meditation, and guest zones - in decibels'),
      ck('well-sec-s4-sensory-standards-c2', 'Define lighting and scent standards for therapeutic spaces - natural priority, no synthetic fragrance'),
      ck('well-sec-s4-sensory-standards-c3', 'Map host primary operations that could breach sensory thresholds and define buffering'),
      ck('well-sec-s4-sensory-standards-c4', 'Define visual-complexity and privacy standards separating therapeutic zones from the working land'),
      ck('well-sec-s4-sensory-standards-c5', 'Confirm sensory standards are achievable alongside the primary land operations'),
    ],
    decisionGroups: [
      dg('well-sec-s4-sensory-standards-dg1', 'Noise & light/scent thresholds', [
        'well-sec-s4-sensory-standards-c1',
        'well-sec-s4-sensory-standards-c2',
      ]),
      dg('well-sec-s4-sensory-standards-dg2', 'Host buffering & privacy', [
        'well-sec-s4-sensory-standards-c3',
        'well-sec-s4-sensory-standards-c4',
      ]),
      dg('well-sec-s4-sensory-standards-dg3', 'Feasibility', [
        'well-sec-s4-sensory-standards-c5',
      ]),
    ],
    completionGate:
      'Sensory and low-stimulation standards for therapeutic zones approved against host operations.',
    actHandoff: 'Therapeutic Sensory Standards Overlay Brief',
  }),
  obj({
    id: 'well-sec-s4-therapeutic-program',
    stratumId: 's4-foundation-decisions',
    ref: 'WELL-S4.10',
    source: 'secondary',
    sourceTypeId: PRIMARY,
    secondaryClass: 'additive',
    title: 'A sound therapeutic program & practitioner framework for the overlay',
    focusedQuestion:
      'What modalities are offered, who delivers them, and how do sessions fit around the primary land use?',
    checklist: [
      ck('well-sec-s4-therapeutic-program-c1', 'Confirm modalities offered against the therapeutic regulatory standards'),
      ck('well-sec-s4-therapeutic-program-c2', 'Define practitioner qualifications and practitioner-to-guest ratios per modality'),
      ck('well-sec-s4-therapeutic-program-c3', 'Define session structure, duration, and scheduling around primary land operations'),
      ck('well-sec-s4-therapeutic-program-c4', 'Define the referral network for conditions outside scope'),
      ck('well-sec-s4-therapeutic-program-c5', 'Confirm all practitioners hold required qualifications and insurance before launch'),
    ],
    decisionGroups: [
      dg('well-sec-s4-therapeutic-program-dg1', 'Modalities & qualifications', [
        'well-sec-s4-therapeutic-program-c1',
        'well-sec-s4-therapeutic-program-c2',
      ]),
      dg('well-sec-s4-therapeutic-program-dg2', 'Scheduling & referral', [
        'well-sec-s4-therapeutic-program-c3',
        'well-sec-s4-therapeutic-program-c4',
      ]),
      dg('well-sec-s4-therapeutic-program-dg3', 'Insurance gate', [
        'well-sec-s4-therapeutic-program-c5',
      ]),
    ],
    completionGate: 'Therapeutic programme and practitioner framework for the overlay approved.',
    actHandoff: 'Therapeutic Program Overlay Brief',
  }),
  obj({
    id: 'well-sec-s4-safeguarding',
    stratumId: 's4-foundation-decisions',
    ref: 'WELL-S4.11',
    source: 'secondary',
    sourceTypeId: PRIMARY,
    secondaryClass: 'additive',
    title: 'A sound guest wellbeing safeguarding protocol for the overlay',
    focusedQuestion:
      'What happens if a therapeutic guest presents in crisis or discloses trauma on a working primary site - before any guest arrives?',
    scopeNotes:
      'This protocol precedes the therapeutic programme - define the crisis response before defining what is offered.',
    checklist: [
      ck('well-sec-s4-safeguarding-c1', 'Define crisis response steps when a guest presents in distress on the host site'),
      ck('well-sec-s4-safeguarding-c2', 'Define trauma disclosure response and guest support pathway'),
      ck('well-sec-s4-safeguarding-c3', 'Define the clinical referral and emergency services contact pathway'),
      ck('well-sec-s4-safeguarding-c4', 'Define incident recording and review, including any host-staff involvement'),
      ck('well-sec-s4-safeguarding-c5', 'Confirm all practitioners and relevant host staff are trained before the first guest'),
    ],
    decisionGroups: [
      dg('well-sec-s4-safeguarding-dg1', 'Crisis & trauma response', [
        'well-sec-s4-safeguarding-c1',
        'well-sec-s4-safeguarding-c2',
      ]),
      dg('well-sec-s4-safeguarding-dg2', 'Referral & incident', [
        'well-sec-s4-safeguarding-c3',
        'well-sec-s4-safeguarding-c4',
      ]),
      dg('well-sec-s4-safeguarding-dg3', 'Training gate', [
        'well-sec-s4-safeguarding-c5',
      ]),
    ],
    completionGate:
      'Safeguarding protocol for the overlay approved and legally reviewed; staff trained before first guest.',
    actHandoff: 'Guest Wellbeing Safeguarding Overlay Protocol',
  }),
];

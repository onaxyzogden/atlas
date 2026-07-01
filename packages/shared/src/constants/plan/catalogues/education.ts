// catalogues/education.ts
//
// Education / Demonstration Land PRIMARY-type objectives - the 22 type-specific
// objectives an Education project adds on top of the 19 Universal objectives
// (OLOS Education / Demonstration Land Plan Stage Objective Catalogue v1.0,
// authored to Catalogue Authoring Standards v1.4).
//
// This file holds ONLY the primary-layer standalone objectives. The universal
// slot lives in ./universal.ts (the shared baseline). The catalogue carries no
// base secondary layer (the type canBeSecondary, but no secondary spec ships
// with this doc), so there are no PatchRecords here.
//
// Count note: 19 universal + 22 primary = 41 total. Per-tier primary counts
// (3+3+2+4+4+3+3 = 22) and the source's Complete objective index both confirm
// 22. The source numbers objectives by Tier 0-6; this catalogue maps Tier N ->
// Stratum (N+1): Tier 0 -> s1-project-foundation, 1 -> s2-land-reading, 2 ->
// s3-systems-reading, 3 -> s4-foundation-decisions, 4 -> s5-system-design, 5 ->
// s6-integration-design, 6 -> s7-phasing-resourcing. Refs are restamped
// EDU-S<stratum>.<n> from the source's <tier>.<n>.
//
// Hard gates (carried verbatim into scopeNotes; there is no gate-severity field
// on the objective schema yet): EDU-S1.6 regulatory framework - no public
// program before permits/insurance confirmed; EDU-S4.5 safety framework - no
// learner group before site risk assessment complete and hazards mitigated;
// EDU-S7.4 program launch - no full public launch before soft-launch pass/fail
// criteria are reviewed and passed (soft-launch principle shared with
// Agritourism).
//
// Conditional note: EDU-S4.7 food & hospitality strategy and EDU-S5.7 food
// preparation / teaching kitchen are the source's "omit if no food service is
// intended" objectives. There is no conditional-loading seam in the resolver
// yet, so they are encoded as ordinary primary objectives and the omit guidance
// is preserved in scopeNotes - not silently dropped.
//
// Economic note: the only money objective is EDU-S7.6 "Define enterprise
// financial viability plan" - ordinary fee-for-service pricing, break-even
// participant counts, revenue targets, and operating-cost budgeting for a halal
// education / demonstration service. No advance sale, no financial product, no
// riba- or gharar-adjacent content. Amanah Gate: clean land- and education-
// stewardship catalogue.
//
// Decision groups are AUTHORED editorially under the 2026-05-31 extended override
// ("author meaningful labels") - the source ships no decision-group spec, so each
// objective's checklist is partitioned into 2-3 named decision scopes, mirroring
// orchard.ts / homestead.ts.
//
// source: 'primary', sourceTypeId: 'education' on every objective. Refs follow
// Authoring Standards (EDU-S<stratum>.<n>). ASCII-only copy: em/en dashes ->
// " - "; curly quotes -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj } from './authoring.js';

const PRIMARY = 'education' as const;

export const EDUCATION_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'edu-s1-mission-audience',
    stratumId: 's1-project-foundation',
    ref: 'EDU-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define educational mission & target audience',
    shortTitle: 'Educational mission & target audience',
    focusedQuestion:
      'What will people learn here, who are they, and what outcomes define educational success?',
    checklist: [
      ck('edu-s1-mission-audience-c1', 'Define primary educational mission in plain language', { feeds: ['s4-direction', 'edu-s6-program-evaluation'] }),
      ck('edu-s1-mission-audience-c2', 'Identify primary audience - school groups, farmers, general public, practitioners, children'),
      ck('edu-s1-mission-audience-c3', 'Define learning outcomes per program type', { feeds: ['edu-s6-program-evaluation'] }),
      ck('edu-s1-mission-audience-c4', 'Define what this site teaches that cannot be taught in a classroom'),
      ck('edu-s1-mission-audience-c5', 'Confirm mission is achievable within steward knowledge and site capacity', { feeds: ['s7-resource-plan'] }),
    ],
    decisionGroups: [
      dg('edu-s1-mission-audience-dg1', 'Mission & audience', ['edu-s1-mission-audience-c1', 'edu-s1-mission-audience-c2']),
      dg('edu-s1-mission-audience-dg2', 'Learning outcomes & distinctiveness', ['edu-s1-mission-audience-c3', 'edu-s1-mission-audience-c4']),
      dg('edu-s1-mission-audience-dg3', 'Capacity fit', ['edu-s1-mission-audience-c5']),
    ],
    completionGate: 'Educational mission and target audience approved.',
    actHandoff: 'Educational Mission & Target Audience Brief',
  }),
  obj({
    id: 'edu-s1-curriculum-programs',
    stratumId: 's1-project-foundation',
    ref: 'EDU-S1.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define curriculum framework & program types',
    shortTitle: 'Curriculum framework & program types',
    focusedQuestion:
      'What programs will be offered - and how do they determine infrastructure sizing and scheduling?',
    checklist: [
      ck('edu-s1-curriculum-programs-c1', 'Define program types - day workshops, half-day tours, school excursions, multi-day residencies, online hybrid', { feeds: ['edu-s4-program-delivery', 'edu-s7-program-launch'] }),
      ck('edu-s1-curriculum-programs-c2', 'Define curriculum themes per program type - soil, food systems, ecology, permaculture design'),
      ck('edu-s1-curriculum-programs-c3', 'Define maximum group size per program type', { feeds: ['edu-s5-teaching-spaces', 'edu-s5-learner-amenity', 'edu-s7-financial-viability'] }),
      ck('edu-s1-curriculum-programs-c4', 'Define annual program calendar - frequency, seasonality', { feeds: ['edu-s7-program-launch', 'edu-s7-financial-viability'] }),
      ck('edu-s1-curriculum-programs-c5', 'Confirm curriculum framework is consistent with educational mission'),
      ck('edu-s1-curriculum-programs-c6', 'Define curriculum development and review process'),
    ],
    decisionGroups: [
      dg('edu-s1-curriculum-programs-dg1', 'Program types & themes', ['edu-s1-curriculum-programs-c1', 'edu-s1-curriculum-programs-c2']),
      dg('edu-s1-curriculum-programs-dg2', 'Sizing & calendar', ['edu-s1-curriculum-programs-c3', 'edu-s1-curriculum-programs-c4']),
      dg('edu-s1-curriculum-programs-dg3', 'Mission alignment & review', ['edu-s1-curriculum-programs-c5', 'edu-s1-curriculum-programs-c6']),
    ],
    completionGate:
      'Curriculum framework and program types approved. Infrastructure sizing requirements confirmed.',
    actHandoff: 'Curriculum Framework & Program Types Brief',
  }),
  obj({
    id: 'edu-s1-regulatory-framework',
    stratumId: 's1-project-foundation',
    ref: 'EDU-S1.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define regulatory & accreditation framework',
    shortTitle: 'Regulatory & accreditation framework',
    focusedQuestion:
      'What permits, insurance, and compliance obligations must be in place before the public arrives?',
    checklist: [
      ck('edu-s1-regulatory-framework-c1', 'Identify public access and liability insurance requirements', { feeds: ['edu-s6-external-relations-compliance', 's7-risk-register'] }),
      ck('edu-s1-regulatory-framework-c2', 'Identify working with children or vulnerable persons requirements if applicable'),
      ck('edu-s1-regulatory-framework-c3', 'Identify food handling permits if meals or food tasting is offered', { feeds: ['edu-s4-food-hospitality', 'edu-s5-food-kitchen'] }),
      ck('edu-s1-regulatory-framework-c4', 'Identify building permits for teaching structures'),
      ck('edu-s1-regulatory-framework-c5', 'Define any accreditation intent - RTO, CPD provider, curriculum alignment'),
      ck('edu-s1-regulatory-framework-c6', 'Define compliance calendar - renewal dates and ongoing obligations', { feeds: ['edu-s6-external-relations-compliance', 'edu-s7-instructor-onboarding'] }),
    ],
    decisionGroups: [
      dg('edu-s1-regulatory-framework-dg1', 'Access, liability & child safety', ['edu-s1-regulatory-framework-c1', 'edu-s1-regulatory-framework-c2']),
      dg('edu-s1-regulatory-framework-dg2', 'Food & building permits', ['edu-s1-regulatory-framework-c3', 'edu-s1-regulatory-framework-c4']),
      dg('edu-s1-regulatory-framework-dg3', 'Accreditation & compliance calendar', ['edu-s1-regulatory-framework-c5', 'edu-s1-regulatory-framework-c6']),
    ],
    completionGate:
      'Regulatory framework confirmed. All permits and insurance identified before any public program delivery.',
    actHandoff: 'Regulatory & Accreditation Framework Brief',
    scopeNotes:
      'Hard gate: no public program delivery before all required permits and insurance are confirmed.',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'edu-s2-teaching-infrastructure',
    stratumId: 's2-land-reading',
    ref: 'EDU-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey existing teaching infrastructure & spaces',
    shortTitle: 'Existing teaching infrastructure & spaces',
    focusedQuestion:
      'What teaching rooms, demonstration areas, outdoor classrooms, and interpretive infrastructure already exist?',
    checklist: [
      ck('edu-s2-teaching-infrastructure-c1', 'Inventory all existing teaching-capable spaces - indoor and outdoor', { feeds: ['edu-s4-teaching-zone-allocation', 'edu-s5-teaching-spaces'] }),
      ck('edu-s2-teaching-infrastructure-c2', 'Assess capacity, comfort, and suitability per program type', { feeds: ['edu-s5-teaching-spaces'] }),
      ck('edu-s2-teaching-infrastructure-c3', 'Assess acoustic quality in existing teaching spaces'),
      ck('edu-s2-teaching-infrastructure-c4', 'Identify demonstration plots or displays already established'),
      ck('edu-s2-teaching-infrastructure-c5', 'Assess interpretive signage and wayfinding condition'),
    ],
    decisionGroups: [
      dg('edu-s2-teaching-infrastructure-dg1', 'Space inventory & suitability', ['edu-s2-teaching-infrastructure-c1', 'edu-s2-teaching-infrastructure-c2']),
      dg('edu-s2-teaching-infrastructure-dg2', 'Acoustic & demonstration assets', ['edu-s2-teaching-infrastructure-c3', 'edu-s2-teaching-infrastructure-c4']),
      dg('edu-s2-teaching-infrastructure-dg3', 'Signage & wayfinding', ['edu-s2-teaching-infrastructure-c5']),
    ],
    completionGate: 'Existing teaching infrastructure inventoried. Reuse potential assessed.',
    actHandoff: 'Existing Teaching Infrastructure Survey',
  }),
  obj({
    id: 'edu-s2-learning-potential',
    stratumId: 's2-land-reading',
    ref: 'EDU-S2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey site learning potential & demonstration value',
    shortTitle: 'Site learning potential & demonstration value',
    focusedQuestion:
      'What features of this site are most valuable for teaching - and which are underutilised?',
    checklist: [
      ck('edu-s2-learning-potential-c1', 'Map all site features with demonstration potential - soil profiles, water systems, plant communities, productive zones', { feeds: ['edu-s4-teaching-zone-allocation', 'edu-s5-demo-plots-signage'] }),
      ck('edu-s2-learning-potential-c2', 'Assess which features best illustrate the curriculum themes', { feeds: ['edu-s4-teaching-zone-allocation'] }),
      ck('edu-s2-learning-potential-c3', 'Identify gaps - what curriculum themes lack a physical demonstration on site'),
      ck('edu-s2-learning-potential-c4', 'Define site learning strengths - what this site teaches better than any other'),
      ck('edu-s2-learning-potential-c5', 'Define site learning limitations - what must be supplemented with off-site resources'),
    ],
    decisionGroups: [
      dg('edu-s2-learning-potential-dg1', 'Demonstration features & curriculum fit', ['edu-s2-learning-potential-c1', 'edu-s2-learning-potential-c2']),
      dg('edu-s2-learning-potential-dg2', 'Gaps & strengths', ['edu-s2-learning-potential-c3', 'edu-s2-learning-potential-c4']),
      dg('edu-s2-learning-potential-dg3', 'Limitations', ['edu-s2-learning-potential-c5']),
    ],
    completionGate:
      'Site learning potential assessed. Strengths, gaps, and demonstration priorities identified.',
    actHandoff: 'Site Learning Potential & Demonstration Value Survey',
  }),
  obj({
    id: 'edu-s2-landscape-vectors',
    stratumId: 's2-land-reading',
    ref: 'EDU-S2.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey surrounding landscape context & vectors',
    shortTitle: 'Landscape context & vectors',
    focusedQuestion:
      'What surrounding landscape context enriches or constrains the educational program?',
    checklist: [
      ck('edu-s2-landscape-vectors-c1', 'Map surrounding land uses within 2km - relevant to landscape ecology teaching'),
      ck('edu-s2-landscape-vectors-c2', 'Identify landscape-scale features with educational value - watershed, corridor, land use contrast', { feeds: ['edu-s4-teaching-zone-allocation'] }),
      ck('edu-s2-landscape-vectors-c3', 'Assess contamination risk to site from surrounding land - relevant if food tasting offered', { feeds: ['edu-s4-food-hospitality', 's7-risk-register'] }),
      ck('edu-s2-landscape-vectors-c4', 'Assess drinking water catchment contamination risk if food or drink served on site', { feeds: ['edu-s4-food-hospitality', 's7-risk-register'] }),
      ck('edu-s2-landscape-vectors-c5', 'Identify community resources that could enrich curriculum - reserves, farms, cultural sites'),
    ],
    decisionGroups: [
      dg('edu-s2-landscape-vectors-dg1', 'Surrounding land use & features', ['edu-s2-landscape-vectors-c1', 'edu-s2-landscape-vectors-c2']),
      dg('edu-s2-landscape-vectors-dg2', 'Contamination risk', ['edu-s2-landscape-vectors-c3', 'edu-s2-landscape-vectors-c4']),
      dg('edu-s2-landscape-vectors-dg3', 'Community resources', ['edu-s2-landscape-vectors-c5']),
    ],
    completionGate: 'Landscape context survey complete.',
    actHandoff: 'Landscape Context & Vector Survey Package',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'edu-s3-learner-access-safety',
    stratumId: 's3-systems-reading',
    ref: 'EDU-S3.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey learner access & safety conditions',
    shortTitle: 'Learner access & safety conditions',
    focusedQuestion:
      'What access, mobility, and safety conditions affect how learners move through the site?',
    checklist: [
      ck('edu-s3-learner-access-safety-c1', 'Assess accessibility - wheelchair and mobility-impaired access to all intended teaching zones', { feeds: ['s5-access', 'edu-s5-learner-amenity'] }),
      ck('edu-s3-learner-access-safety-c2', 'Identify trip hazards, uneven surfaces, and safety risks on all learner pathways', { feeds: ['edu-s4-safety-risk-framework', 's7-risk-register'] }),
      ck('edu-s3-learner-access-safety-c3', 'Assess toilet facility location and adequacy for group sizes', { feeds: ['edu-s5-learner-amenity'] }),
      ck('edu-s3-learner-access-safety-c4', 'Assess first aid access and response time', { feeds: ['edu-s5-learner-amenity'] }),
      ck('edu-s3-learner-access-safety-c5', 'Assess bus and vehicle drop-off safety'),
      ck('edu-s3-learner-access-safety-c6', 'Identify hazardous areas requiring exclusion fencing or signage', { feeds: ['edu-s4-safety-risk-framework'] }),
    ],
    decisionGroups: [
      dg('edu-s3-learner-access-safety-dg1', 'Accessibility & hazards', ['edu-s3-learner-access-safety-c1', 'edu-s3-learner-access-safety-c2']),
      dg('edu-s3-learner-access-safety-dg2', 'Amenity & first aid', ['edu-s3-learner-access-safety-c3', 'edu-s3-learner-access-safety-c4']),
      dg('edu-s3-learner-access-safety-dg3', 'Vehicle safety & exclusion', ['edu-s3-learner-access-safety-c5', 'edu-s3-learner-access-safety-c6']),
    ],
    completionGate: 'Learner access and safety conditions assessed. All hazards identified.',
    actHandoff: 'Learner Access & Safety Conditions Survey',
  }),
  obj({
    id: 'edu-s3-demo-baseline',
    stratumId: 's3-systems-reading',
    ref: 'EDU-S3.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey demonstration site ecological & productive baseline',
    shortTitle: 'Demonstration site ecological & productive baseline',
    focusedQuestion:
      'What is the current ecological and productive condition of proposed demonstration sites?',
    checklist: [
      ck('edu-s3-demo-baseline-c1', 'Assess soil health in proposed demonstration garden zones', { feeds: ['s5-soil-improvement', 'edu-s5-demo-plots-signage'] }),
      ck('edu-s3-demo-baseline-c2', 'Record existing productive plants and their condition'),
      ck('edu-s3-demo-baseline-c3', 'Identify weed pressure in demonstration areas'),
      ck('edu-s3-demo-baseline-c4', 'Assess water access for demonstration zone irrigation', { feeds: ['s5-water-infrastructure'] }),
      ck('edu-s3-demo-baseline-c5', 'Define soil and ecological improvement required before demonstration planting begins', { feeds: ['edu-s5-demo-plots-signage', 'edu-s6-adaptive-management'] }),
    ],
    decisionGroups: [
      dg('edu-s3-demo-baseline-dg1', 'Soil & plant condition', ['edu-s3-demo-baseline-c1', 'edu-s3-demo-baseline-c2']),
      dg('edu-s3-demo-baseline-dg2', 'Weed pressure & water', ['edu-s3-demo-baseline-c3', 'edu-s3-demo-baseline-c4']),
      dg('edu-s3-demo-baseline-dg3', 'Improvement requirement', ['edu-s3-demo-baseline-c5']),
    ],
    completionGate: 'Demonstration site baseline complete. Improvement requirements defined.',
    actHandoff: 'Demonstration Site Ecological & Productive Baseline Survey',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'edu-s4-teaching-zone-allocation',
    stratumId: 's4-foundation-decisions',
    ref: 'EDU-S4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define teaching zone allocation & infrastructure placement',
    shortTitle: 'Teaching zone allocation & infrastructure placement',
    focusedQuestion:
      'Where will each teaching space, demonstration plot, and interpretive feature be located - and how do they connect into a coherent learning journey?',
    checklist: [
      ck('edu-s4-teaching-zone-allocation-c1', 'Define indoor teaching space location - weather backup for all outdoor programs'),
      ck('edu-s4-teaching-zone-allocation-c2', 'Define outdoor classroom location - shade, acoustics, sight lines for demonstrations', { feeds: ['edu-s5-teaching-spaces'] }),
      ck('edu-s4-teaching-zone-allocation-c3', 'Define demonstration plot locations by curriculum theme', { feeds: ['edu-s5-demo-plots-signage'] }),
      ck('edu-s4-teaching-zone-allocation-c4', 'Define interpretive trail route connecting key teaching features', { feeds: ['edu-s5-demo-plots-signage'] }),
      ck('edu-s4-teaching-zone-allocation-c5', 'Define learner journey sequence - arrival, orientation, program flow, departure', { feeds: ['edu-s5-learner-amenity', 'edu-s7-program-launch'] }),
      ck('edu-s4-teaching-zone-allocation-c6', 'Confirm all teaching zones are accessible and safe for target audience'),
      ck('edu-s4-teaching-zone-allocation-c7', 'Ground teaching zone placement in the Stratum 2 site learning potential and teaching infrastructure surveys'),
    ],
    decisionGroups: [
      dg('edu-s4-teaching-zone-allocation-dg1', 'Indoor & outdoor teaching locations', ['edu-s4-teaching-zone-allocation-c1', 'edu-s4-teaching-zone-allocation-c2', 'edu-s4-teaching-zone-allocation-c7']),
      dg('edu-s4-teaching-zone-allocation-dg2', 'Demonstration plots & trail', ['edu-s4-teaching-zone-allocation-c3', 'edu-s4-teaching-zone-allocation-c4']),
      dg('edu-s4-teaching-zone-allocation-dg3', 'Learner journey & safety', ['edu-s4-teaching-zone-allocation-c5', 'edu-s4-teaching-zone-allocation-c6']),
    ],
    completionGate: 'Teaching zone allocation approved. Learning journey sequence confirmed.',
    actHandoff: 'Teaching Zone Allocation & Infrastructure Placement Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Learner journey flow through arrival, orientation, and departure', frequency: 'observed each program day' },
        { metric: 'Demonstration plot sight lines and group viewing comfort per teaching zone', frequency: 'per session' },
        { metric: 'Outdoor classroom usability under weather conditions and indoor backup uptake', frequency: 'seasonal' },
      ],
      triggers: [
        'Congestion or backtracking on the interpretive trail -> revise learner journey sequence and signage',
        'Group cannot see a demonstration clearly -> add staging or relocate the teaching zone',
        'Outdoor program disrupted by weather with no usable backup -> activate indoor teaching space and review placement',
      ],
      feeds: 'people-governance',
    },
  }),
  obj({
    id: 'edu-s4-safety-risk-framework',
    stratumId: 's4-foundation-decisions',
    ref: 'EDU-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define safety & risk management framework',
    shortTitle: 'Safety & risk management framework',
    focusedQuestion:
      'What safety systems, risk assessments, and emergency protocols must be in place before any learner group arrives?',
    checklist: [
      ck('edu-s4-safety-risk-framework-c1', 'Define site risk assessment - all hazards mapped and mitigation confirmed', { feeds: ['edu-s5-learner-amenity', 's7-risk-register'] }),
      ck('edu-s4-safety-risk-framework-c2', 'Define emergency evacuation plan for group sizes'),
      ck('edu-s4-safety-risk-framework-c3', 'Define first aid protocol - trained personnel, equipment, contacts', { feeds: ['edu-s5-learner-amenity'] }),
      ck('edu-s4-safety-risk-framework-c4', 'Define hazardous area exclusion - fencing, signage, supervision requirements'),
      ck('edu-s4-safety-risk-framework-c5', 'Define child safety protocol if programs include minors'),
      ck('edu-s4-safety-risk-framework-c6', 'Confirm all safety requirements are met before first group arrival', { feeds: ['edu-s7-program-launch'] }),
      ck('edu-s4-safety-risk-framework-c7', 'Ground the risk assessment in the Stratum 3 learner access and safety conditions survey'),
    ],
    decisionGroups: [
      dg('edu-s4-safety-risk-framework-dg1', 'Risk assessment & evacuation', ['edu-s4-safety-risk-framework-c1', 'edu-s4-safety-risk-framework-c2', 'edu-s4-safety-risk-framework-c7']),
      dg('edu-s4-safety-risk-framework-dg2', 'First aid & hazard exclusion', ['edu-s4-safety-risk-framework-c3', 'edu-s4-safety-risk-framework-c4']),
      dg('edu-s4-safety-risk-framework-dg3', 'Child safety & pre-arrival confirmation', ['edu-s4-safety-risk-framework-c5', 'edu-s4-safety-risk-framework-c6']),
    ],
    completionGate:
      'Safety and risk management framework approved. All requirements confirmed before first group.',
    actHandoff: 'Safety & Risk Management Framework',
    monitoringProtocol: {
      indicators: [
        { metric: 'Hazard register status -- open versus mitigated hazards on learner pathways', frequency: 'reviewed before each group' },
        { metric: 'Incident and near-miss count per program', frequency: 'logged each session' },
        { metric: 'First aid readiness -- trained personnel on site and equipment stock', frequency: 'checked weekly' },
      ],
      triggers: [
        'New hazard identified on a learner pathway -> exclude the area and update the risk assessment before next group',
        'Incident or near-miss recorded -> investigate, log, and revise the relevant protocol',
        'No trained first aider available for a scheduled group -> postpone the group until first aid cover is confirmed',
      ],
      feeds: 'risk-compliance',
    },
    scopeNotes:
      'Hard gate: no learner group arrives before site risk assessment is complete and all hazards mitigated.',
  }),
  obj({
    id: 'edu-s4-program-delivery',
    stratumId: 's4-foundation-decisions',
    ref: 'EDU-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define program delivery model',
    shortTitle: 'Program delivery model',
    focusedQuestion:
      'How will programs be delivered - who teaches, what format, and how is quality maintained?',
    checklist: [
      ck('edu-s4-program-delivery-c1', 'Define delivery format per program type - facilitated, self-guided, hybrid'),
      ck('edu-s4-program-delivery-c2', 'Define instructor requirements per program - qualifications, experience, group ratios', { feeds: ['edu-s7-instructor-onboarding', 'edu-s7-financial-viability'] }),
      ck('edu-s4-program-delivery-c3', 'Define program structure - arrival, orientation, activities, reflection, departure'),
      ck('edu-s4-program-delivery-c4', 'Define quality standards - what defines a successful program delivery', { feeds: ['edu-s6-program-evaluation', 'edu-s7-instructor-onboarding'] }),
      ck('edu-s4-program-delivery-c5', 'Define program development and review cycle', { feeds: ['edu-s6-program-evaluation'] }),
      ck('edu-s4-program-delivery-c6', 'Confirm formats and ratios against the Stratum 1 program types and maximum group sizes'),
    ],
    decisionGroups: [
      dg('edu-s4-program-delivery-dg1', 'Format & instructor requirements', ['edu-s4-program-delivery-c1', 'edu-s4-program-delivery-c2', 'edu-s4-program-delivery-c6']),
      dg('edu-s4-program-delivery-dg2', 'Structure & quality standards', ['edu-s4-program-delivery-c3', 'edu-s4-program-delivery-c4']),
      dg('edu-s4-program-delivery-dg3', 'Review cycle', ['edu-s4-program-delivery-c5']),
    ],
    completionGate:
      'Program delivery model approved. Instructor requirements and quality standards confirmed.',
    actHandoff: 'Program Delivery Model Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Instructor-to-learner ratio achieved per program against the defined requirement', frequency: 'each session' },
        { metric: 'Program quality-standard pass rate from facilitator debriefs', frequency: 'per program' },
        { metric: 'Adherence to the defined program structure -- arrival, orientation, activities, reflection, departure', frequency: 'observed each session' },
      ],
      triggers: [
        'Group ratio exceeds the defined maximum -> add an instructor or cap enrolment for that program',
        'Program falls short of the quality standard -> trigger the program review cycle and revise delivery',
        'Program consistently runs over or under its planned structure -> revise the format and timing',
      ],
      feeds: 'people-governance',
    },
  }),
  obj({
    id: 'edu-s4-food-hospitality',
    stratumId: 's4-foundation-decisions',
    ref: 'EDU-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define food & hospitality provision strategy',
    shortTitle: 'Food & hospitality provision strategy',
    focusedQuestion:
      'If food or drink is served - what is the provision model and what compliance obligations apply?',
    checklist: [
      ck('edu-s4-food-hospitality-c1', 'Define food provision scope - morning tea, lunch, food tasting, farm-to-table meal', { feeds: ['edu-s5-food-kitchen'] }),
      ck('edu-s4-food-hospitality-c2', 'Define food sourcing - from site, local farms, or catered'),
      ck('edu-s4-food-hospitality-c3', 'Define food preparation infrastructure required - kitchen, outdoor cooking, cold storage', { feeds: ['edu-s5-food-kitchen'] }),
      ck('edu-s4-food-hospitality-c4', 'Define food safety compliance requirements for group service', { feeds: ['edu-s5-food-kitchen'] }),
      ck('edu-s4-food-hospitality-c5', 'Confirm food provision is consistent with regulatory framework from Stratum 1'),
    ],
    decisionGroups: [
      dg('edu-s4-food-hospitality-dg1', 'Provision scope & sourcing', ['edu-s4-food-hospitality-c1', 'edu-s4-food-hospitality-c2']),
      dg('edu-s4-food-hospitality-dg2', 'Preparation & food safety', ['edu-s4-food-hospitality-c3', 'edu-s4-food-hospitality-c4']),
      dg('edu-s4-food-hospitality-dg3', 'Regulatory alignment', ['edu-s4-food-hospitality-c5']),
    ],
    completionGate: 'Food and hospitality provision strategy approved. Food safety compliance confirmed.',
    actHandoff: 'Food & Hospitality Provision Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Cold-chain and storage temperatures for served food', frequency: 'logged each service day' },
        { metric: 'Food safety compliance checks passed against group-service requirements', frequency: 'per event' },
        { metric: 'Handwashing and food-prep hygiene station readiness for group sizes', frequency: 'checked before service' },
      ],
      triggers: [
        'Cold storage out of safe temperature range -> discard affected food and repair or replace the unit',
        'Food safety check fails -> suspend food service until the issue is corrected and re-verified',
        'Handwashing provision inadequate for the group -> add capacity before food is served',
      ],
      feeds: 'plants-food',
    },
    scopeNotes: 'Omit this objective if no food service is intended.',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'edu-s5-teaching-spaces',
    stratumId: 's5-system-design',
    ref: 'EDU-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design teaching spaces & outdoor classroom infrastructure',
    shortTitle: 'Teaching spaces & outdoor classroom',
    focusedQuestion:
      'How will indoor and outdoor teaching spaces be designed for the defined program types and group sizes?',
    checklist: [
      ck('edu-s5-teaching-spaces-c1', 'Design indoor teaching space - capacity, acoustic quality, natural light, weather-proofing', { feeds: ['s7-phase1'] }),
      ck('edu-s5-teaching-spaces-c2', 'Design outdoor classroom - seating, shade structure, acoustic design, whiteboard or display surface'),
      ck('edu-s5-teaching-spaces-c3', 'Design demonstration staging areas - sight lines for group observation of demonstrations'),
      ck('edu-s5-teaching-spaces-c4', 'Specify materials - natural, durable, consistent with educational aesthetic', { feeds: ['s7-resource-plan'] }),
      ck('edu-s5-teaching-spaces-c5', 'Confirm capacity meets maximum group size per program type'),
      ck('edu-s5-teaching-spaces-c6', 'Confirm space designs against the Stratum 2 teaching infrastructure survey capacity and acoustics findings'),
    ],
    decisionGroups: [
      dg('edu-s5-teaching-spaces-dg1', 'Indoor & outdoor spaces', ['edu-s5-teaching-spaces-c1', 'edu-s5-teaching-spaces-c2', 'edu-s5-teaching-spaces-c6']),
      dg('edu-s5-teaching-spaces-dg2', 'Demonstration staging & materials', ['edu-s5-teaching-spaces-c3', 'edu-s5-teaching-spaces-c4']),
      dg('edu-s5-teaching-spaces-dg3', 'Capacity confirmation', ['edu-s5-teaching-spaces-c5']),
    ],
    completionGate: 'Teaching spaces design approved. Capacity and acoustic quality confirmed.',
    actHandoff: 'Teaching Spaces & Outdoor Classroom Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 teaching zone allocation and infrastructure placement strategy.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Teaching space utilisation against maximum group size per program type', frequency: 'each session' },
        { metric: 'Acoustic and sight-line adequacy reported by facilitators during demonstrations', frequency: 'per session' },
        { metric: 'Weather-proofing and indoor backup performance when outdoor programs are disrupted', frequency: 'seasonal' },
      ],
      triggers: [
        'Group exceeds the confirmed capacity of a teaching space -> cap enrolment or stage the group across sessions',
        'Facilitators report learners cannot hear or see a demonstration -> add staging or revise the space layout',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'edu-s5-demo-plots-signage',
    stratumId: 's5-system-design',
    ref: 'EDU-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design demonstration plot layouts & interpretive signage',
    shortTitle: 'Demonstration plots & interpretive signage',
    focusedQuestion:
      'How will demonstration plots, trail features, and interpretive signage be designed as teaching tools?',
    checklist: [
      ck('edu-s5-demo-plots-signage-c1', 'Design demonstration plot layout by curriculum theme - beds, labels, observation access', { feeds: ['s7-phase1'] }),
      ck('edu-s5-demo-plots-signage-c2', 'Design interpretive trail waypoints - content, sign design, placement'),
      ck('edu-s5-demo-plots-signage-c3', 'Specify signage materials and legibility standard', { feeds: ['s7-resource-plan'] }),
      ck('edu-s5-demo-plots-signage-c4', 'Design observation infrastructure - sight lines, platforms, access for group viewing'),
      ck('edu-s5-demo-plots-signage-c5', 'Design seasonal rotation of demonstrations to match curriculum calendar'),
      ck('edu-s5-demo-plots-signage-c6', 'Site demonstration plots against the Stratum 3 demonstration site baseline'),
    ],
    decisionGroups: [
      dg('edu-s5-demo-plots-signage-dg1', 'Plot layout & trail waypoints', ['edu-s5-demo-plots-signage-c1', 'edu-s5-demo-plots-signage-c2', 'edu-s5-demo-plots-signage-c6']),
      dg('edu-s5-demo-plots-signage-dg2', 'Signage & observation infrastructure', ['edu-s5-demo-plots-signage-c3', 'edu-s5-demo-plots-signage-c4']),
      dg('edu-s5-demo-plots-signage-dg3', 'Seasonal rotation', ['edu-s5-demo-plots-signage-c5']),
    ],
    completionGate: 'Demonstration plots and interpretive infrastructure design approved.',
    actHandoff: 'Demonstration Plots & Interpretive Signage Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 teaching zone allocation and infrastructure placement strategy.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Demonstration plot condition and label legibility per curriculum theme', frequency: 'inspected each season' },
        { metric: 'Interpretive signage legibility and physical condition along the trail', frequency: 'monthly' },
        { metric: 'Observation infrastructure sight lines and group viewing access at each waypoint', frequency: 'per program' },
      ],
      triggers: [
        'Signage becomes illegible or damaged -> replace to the defined legibility standard before next group',
        'A demonstration plot no longer matches the curriculum calendar -> trigger the seasonal rotation update',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'edu-s5-learner-amenity',
    stratumId: 's5-system-design',
    ref: 'EDU-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design learner amenity infrastructure',
    shortTitle: 'Learner amenity infrastructure',
    focusedQuestion:
      'How will toilets, handwashing, shade, seating, and emergency infrastructure be designed for group use?',
    checklist: [
      ck('edu-s5-learner-amenity-c1', 'Design toilet facilities - capacity for maximum group size, accessible', { feeds: ['s7-phase1', 's7-resource-plan'] }),
      ck('edu-s5-learner-amenity-c2', 'Design handwashing infrastructure - outdoor, accessible, food-safe'),
      ck('edu-s5-learner-amenity-c3', 'Design group seating and shade areas at key rest points'),
      ck('edu-s5-learner-amenity-c4', 'Design first aid station - location, equipment'),
      ck('edu-s5-learner-amenity-c5', 'Design emergency assembly point - clearly marked, accessible from all teaching zones', { feeds: ['s7-risk-register'] }),
      ck('edu-s5-learner-amenity-c6', 'Size toilets and first aid provision against the Stratum 3 learner access and safety findings'),
    ],
    decisionGroups: [
      dg('edu-s5-learner-amenity-dg1', 'Toilets & handwashing', ['edu-s5-learner-amenity-c1', 'edu-s5-learner-amenity-c2', 'edu-s5-learner-amenity-c6']),
      dg('edu-s5-learner-amenity-dg2', 'Seating & first aid', ['edu-s5-learner-amenity-c3', 'edu-s5-learner-amenity-c4']),
      dg('edu-s5-learner-amenity-dg3', 'Emergency assembly', ['edu-s5-learner-amenity-c5']),
    ],
    completionGate: 'Learner amenity infrastructure design approved. Emergency assembly confirmed.',
    actHandoff: 'Learner Amenity Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 safety and risk management framework.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Toilet and handwashing capacity against maximum group size in use', frequency: 'each program day' },
        { metric: 'First aid station equipment stock and accessibility', frequency: 'checked weekly' },
        { metric: 'Emergency assembly point access and signage clarity from all teaching zones', frequency: 'per program' },
      ],
      triggers: [
        'Toilet or handwashing provision is inadequate for the group on site -> cap the group or add temporary capacity',
        'Emergency assembly point becomes obstructed or unmarked -> clear and re-mark before the next group arrives',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'edu-s5-food-kitchen',
    stratumId: 's5-system-design',
    ref: 'EDU-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design food preparation & teaching kitchen infrastructure',
    shortTitle: 'Food preparation & teaching kitchen',
    focusedQuestion:
      'How will food preparation, cooking demonstrations, and group dining be designed - if food service is part of the program?',
    checklist: [
      ck('edu-s5-food-kitchen-c1', 'Design teaching kitchen layout - demonstration bench, learner observation positions', { feeds: ['s7-phase1'] }),
      ck('edu-s5-food-kitchen-c2', 'Specify kitchen equipment to food safety standard', { feeds: ['s7-resource-plan'] }),
      ck('edu-s5-food-kitchen-c3', 'Design group dining area - capacity, shade, accessibility'),
      ck('edu-s5-food-kitchen-c4', 'Design food storage - cold chain, dry storage'),
      ck('edu-s5-food-kitchen-c5', 'Confirm design meets food safety compliance requirements'),
      ck('edu-s5-food-kitchen-c6', 'Confirm kitchen design meets the Stratum 1 food handling permit requirements'),
    ],
    decisionGroups: [
      dg('edu-s5-food-kitchen-dg1', 'Kitchen layout & equipment', ['edu-s5-food-kitchen-c1', 'edu-s5-food-kitchen-c2']),
      dg('edu-s5-food-kitchen-dg2', 'Dining & storage', ['edu-s5-food-kitchen-c3', 'edu-s5-food-kitchen-c4']),
      dg('edu-s5-food-kitchen-dg3', 'Food safety compliance', ['edu-s5-food-kitchen-c5', 'edu-s5-food-kitchen-c6']),
    ],
    completionGate: 'Teaching kitchen and dining design approved. Food safety compliance confirmed.',
    actHandoff: 'Food Preparation & Teaching Kitchen Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 food and hospitality provision strategy.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Cold-chain and dry-storage conditions in the teaching kitchen', frequency: 'logged each service day' },
        { metric: 'Kitchen equipment compliance with food safety standard', frequency: 'inspected per service' },
        { metric: 'Dining area utilisation and learner observation positions against group size', frequency: 'per program' },
      ],
      triggers: [
        'Food storage falls out of safe temperature range -> discard affected food and repair or replace the unit',
        'Kitchen equipment fails a food safety check -> suspend food service until corrected and re-verified',
      ],
      feeds: 'plants-food',
    },
    scopeNotes: 'Omit this objective if no food service is intended.',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'edu-s6-program-evaluation',
    stratumId: 's6-integration-design',
    ref: 'EDU-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design program evaluation & participant feedback system',
    shortTitle: 'Program evaluation & participant feedback',
    focusedQuestion:
      'How will program quality and learning outcomes be tracked and improved?',
    checklist: [
      ck('edu-s6-program-evaluation-c1', 'Design participant feedback collection - post-program survey, facilitator debrief', { feeds: ['s7-resource-plan'] }),
      ck('edu-s6-program-evaluation-c2', 'Define learning outcome indicators per program type', { feeds: ['edu-s7-program-launch'] }),
      ck('edu-s6-program-evaluation-c3', 'Define facilitator performance review process'),
      ck('edu-s6-program-evaluation-c4', 'Define curriculum improvement protocol - how feedback triggers program changes'),
      ck('edu-s6-program-evaluation-c5', 'Define annual program quality review'),
      ck('edu-s6-program-evaluation-c6', 'Derive evaluation indicators from the Stratum 1 mission and learning outcomes'),
    ],
    decisionGroups: [
      dg('edu-s6-program-evaluation-dg1', 'Feedback collection & outcomes', ['edu-s6-program-evaluation-c1', 'edu-s6-program-evaluation-c2', 'edu-s6-program-evaluation-c6']),
      dg('edu-s6-program-evaluation-dg2', 'Facilitator review & improvement', ['edu-s6-program-evaluation-c3', 'edu-s6-program-evaluation-c4']),
      dg('edu-s6-program-evaluation-dg3', 'Annual quality review', ['edu-s6-program-evaluation-c5']),
    ],
    completionGate: 'Program evaluation system approved.',
    actHandoff: 'Program Evaluation & Participant Feedback System',
  }),
  obj({
    id: 'edu-s6-external-relations-compliance',
    stratumId: 's6-integration-design',
    ref: 'EDU-S6.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design external relations & compliance monitoring system',
    shortTitle: 'External relations & compliance monitoring',
    focusedQuestion:
      'How will insurance renewals, permits, accreditation, and stakeholder relationships be actively managed?',
    checklist: [
      ck('edu-s6-external-relations-compliance-c1', 'Design compliance calendar - all permit renewals, insurance, CPD obligations', { feeds: ['edu-s7-instructor-onboarding', 's7-risk-register'] }),
      ck('edu-s6-external-relations-compliance-c2', 'Define neighbour communication rhythm'),
      ck('edu-s6-external-relations-compliance-c3', 'Design complaint response process'),
      ck('edu-s6-external-relations-compliance-c4', 'Define annual external relations review'),
      ck('edu-s6-external-relations-compliance-c5', 'Define accreditation maintenance requirements if applicable', { feeds: ['edu-s7-instructor-onboarding'] }),
      ck('edu-s6-external-relations-compliance-c6', 'Build the compliance calendar from the Stratum 1 regulatory framework obligations'),
    ],
    decisionGroups: [
      dg('edu-s6-external-relations-compliance-dg1', 'Compliance calendar', ['edu-s6-external-relations-compliance-c1', 'edu-s6-external-relations-compliance-c6']),
      dg('edu-s6-external-relations-compliance-dg2', 'Neighbour communication & complaints', ['edu-s6-external-relations-compliance-c2', 'edu-s6-external-relations-compliance-c3']),
      dg('edu-s6-external-relations-compliance-dg3', 'Annual review & accreditation', ['edu-s6-external-relations-compliance-c4', 'edu-s6-external-relations-compliance-c5']),
    ],
    completionGate: 'External relations and compliance monitoring approved.',
    actHandoff: 'External Relations & Compliance Monitoring System',
  }),
  obj({
    id: 'edu-s6-adaptive-management',
    stratumId: 's6-integration-design',
    ref: 'EDU-S6.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define adaptive management protocol',
    shortTitle: 'Adaptive management protocol',
    focusedQuestion:
      'How will program performance data and site health data drive annual improvements?',
    checklist: [
      ck('edu-s6-adaptive-management-c1', 'Define annual review process - participant feedback, revenue, site health reviewed together', { feeds: ['s7-resource-plan'] }),
      ck('edu-s6-adaptive-management-c2', 'Define decision triggers - what performance drives curriculum or infrastructure change', { feeds: ['edu-s7-financial-viability', 's7-risk-register'] }),
      ck('edu-s6-adaptive-management-c3', 'Define program retirement protocol - when a program is discontinued'),
      ck('edu-s6-adaptive-management-c4', 'Document all changes with reason and outcome'),
      // c5 added 2026-06-02 to meet Authoring Standards v1.4 (5-item floor); the
      // v1.0 source authored only 4. Mirrors the multi-year comprehensive-review
      // item every sibling adaptive-management objective carries (offGrid c5,
      // conservation c5). FLAGGED for operator review.
      ck('edu-s6-adaptive-management-c5', 'Define 3-year comprehensive review against founding educational goals and capacity targets'),
      ck('edu-s6-adaptive-management-c6', 'Baseline site health monitoring against the Stratum 3 demonstration site baseline'),
    ],
    decisionGroups: [
      dg('edu-s6-adaptive-management-dg1', 'Annual review & triggers', ['edu-s6-adaptive-management-c1', 'edu-s6-adaptive-management-c2', 'edu-s6-adaptive-management-c5', 'edu-s6-adaptive-management-c6']),
      dg('edu-s6-adaptive-management-dg2', 'Retirement & documentation', ['edu-s6-adaptive-management-c3', 'edu-s6-adaptive-management-c4']),
    ],
    completionGate: 'Adaptive management protocol approved.',
    actHandoff: 'Adaptive Management Protocol',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'edu-s7-program-launch',
    stratumId: 's7-phasing-resourcing',
    ref: 'EDU-S7.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define program launch sequence',
    shortTitle: 'Program launch sequence',
    focusedQuestion:
      'In what order will programs be launched - soft launch with limited programs before full offering?',
    checklist: [
      ck('edu-s7-program-launch-c1', 'Define soft launch scope - one or two program types at reduced capacity - HARD GATE before full public launch'),
      ck('edu-s7-program-launch-c2', 'Define soft launch review criteria - explicit pass/fail checklist'),
      ck('edu-s7-program-launch-c3', 'Define full program launch criteria'),
      ck('edu-s7-program-launch-c4', 'Define program addition sequence - add complexity after simpler programs are tested'),
      // c5 added 2026-06-02 to meet Authoring Standards v1.4 (5-item floor); the
      // v1.0 source authored only 4. Makes explicit the fail path of the hard gate
      // the objective already names (scopeNotes), mirroring the go/no-go item in
      // sibling sequencing objectives (offGrid systems-establishment c6). FLAGGED
      // for operator review.
      ck('edu-s7-program-launch-c5', 'Define pause and remediation protocol if soft launch review criteria are not met - what halts progression to full launch'),
      ck('edu-s7-program-launch-c6', 'Confirm the launch sequence covers the Stratum 1 program types and annual calendar'),
    ],
    decisionGroups: [
      dg('edu-s7-program-launch-dg1', 'Soft launch scope & criteria', ['edu-s7-program-launch-c1', 'edu-s7-program-launch-c2', 'edu-s7-program-launch-c5']),
      dg('edu-s7-program-launch-dg2', 'Full launch & addition sequence', ['edu-s7-program-launch-c3', 'edu-s7-program-launch-c4', 'edu-s7-program-launch-c6']),
    ],
    completionGate:
      'Program launch sequence approved. Soft launch pass/fail criteria defined as hard gate.',
    actHandoff: 'Program Launch Sequence',
    progressTracking: {
      milestones: [
        {
          metric: 'Soft-launch pass/fail criteria signed off before full public launch',
          cadence: 'one-time gate, before full launch',
        },
        {
          metric: 'Program additions sequenced only after simpler programs are tested',
          cadence: 'per program added',
        },
      ],
    },
    scopeNotes:
      'Hard gate: no full public launch before soft launch criteria are reviewed and passed.',
  }),
  obj({
    id: 'edu-s7-instructor-onboarding',
    stratumId: 's7-phasing-resourcing',
    ref: 'EDU-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define instructor onboarding & teaching standards',
    shortTitle: 'Instructor onboarding & teaching standards',
    focusedQuestion:
      'Who teaches, how are they prepared, and what standards govern delivery quality?',
    checklist: [
      ck('edu-s7-instructor-onboarding-c1', 'Define instructor qualifications per program type'),
      ck('edu-s7-instructor-onboarding-c2', 'Define instructor orientation - site knowledge, curriculum, safety protocols, group management'),
      ck('edu-s7-instructor-onboarding-c3', 'Define working with children check requirements if applicable'),
      ck('edu-s7-instructor-onboarding-c4', 'Define delivery quality standard - what a successful session looks and feels like'),
      ck('edu-s7-instructor-onboarding-c5', 'Confirm all instructors are inducted before first public group'),
      ck('edu-s7-instructor-onboarding-c6', 'Confirm children check requirements satisfy the Stratum 1 regulatory framework'),
    ],
    decisionGroups: [
      dg('edu-s7-instructor-onboarding-dg1', 'Qualifications & orientation', ['edu-s7-instructor-onboarding-c1', 'edu-s7-instructor-onboarding-c2']),
      dg('edu-s7-instructor-onboarding-dg2', 'Child checks & quality standard', ['edu-s7-instructor-onboarding-c3', 'edu-s7-instructor-onboarding-c4', 'edu-s7-instructor-onboarding-c6']),
      dg('edu-s7-instructor-onboarding-dg3', 'Pre-launch induction', ['edu-s7-instructor-onboarding-c5']),
    ],
    completionGate:
      'Instructor onboarding and teaching standards approved. All instructors inducted before launch.',
    actHandoff: 'Instructor Onboarding & Teaching Standards',
    progressTracking: {
      milestones: [
        {
          metric: 'All instructors inducted before first public group',
          cadence: 'per instructor, before launch',
        },
        {
          metric: 'Working-with-children checks satisfied vs. regulatory framework',
          cadence: 'per instructor',
        },
      ],
    },
  }),
  obj({
    id: 'edu-s7-financial-viability',
    stratumId: 's7-phasing-resourcing',
    ref: 'EDU-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define enterprise financial viability plan',
    shortTitle: 'Enterprise financial viability plan',
    focusedQuestion:
      'What are the revenue targets and break-even requirements for the educational enterprise?',
    checklist: [
      ck('edu-s7-financial-viability-c1', 'Define pricing per program type and group size'),
      ck('edu-s7-financial-viability-c2', 'Calculate break-even participant numbers per program'),
      ck('edu-s7-financial-viability-c3', 'Define annual revenue target at defined program frequency'),
      ck('edu-s7-financial-viability-c4', 'Estimate operating costs - instructor, materials, administration, maintenance'),
      ck('edu-s7-financial-viability-c5', 'Define minimum viable program scale'),
      ck('edu-s7-financial-viability-c6', 'Define financial review trigger'),
      ck('edu-s7-financial-viability-c7', 'Confirm break-even assumptions respect the Stratum 1 maximum group sizes and program calendar'),
    ],
    decisionGroups: [
      dg('edu-s7-financial-viability-dg1', 'Pricing & break-even', ['edu-s7-financial-viability-c1', 'edu-s7-financial-viability-c2', 'edu-s7-financial-viability-c7']),
      dg('edu-s7-financial-viability-dg2', 'Revenue target & operating costs', ['edu-s7-financial-viability-c3', 'edu-s7-financial-viability-c4']),
      dg('edu-s7-financial-viability-dg3', 'Viable scale & review trigger', ['edu-s7-financial-viability-c5', 'edu-s7-financial-viability-c6']),
    ],
    completionGate: 'Enterprise financial viability plan approved. Break-even confirmed.',
    actHandoff: 'Enterprise Financial Viability Plan',
    progressTracking: {
      milestones: [
        { metric: 'Participant numbers vs. break-even per program', cadence: 'per program run' },
        {
          metric: 'Revenue vs. annual target at defined program frequency',
          cadence: 'monthly',
        },
        {
          metric: 'Revenue shortfall vs. defined review trigger',
          cadence: 'monthly, review at threshold breach',
        },
      ],
    },
  }),
];

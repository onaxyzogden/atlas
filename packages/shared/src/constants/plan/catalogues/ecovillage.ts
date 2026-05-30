// catalogues/ecovillage.ts
//
// Intentional Community / Ecovillage PRIMARY-type objectives - the 31 type-
// specific objectives an Ecovillage adds on top of the 19 Universal objectives
// (OLOS Intentional Community / Ecovillage Objective Catalogue v1.2).
//
// This file holds ONLY the primary-layer objectives. The universal slot lives
// in ./universal.ts (the shared baseline). Ecovillage is primary-only
// (canBeSecondary: false), so it contributes no patches or additive-secondary
// content.
//
// Count note: the source header table reads "Primary: 29", but the per-tier
// sub-headers (3+4+4+5+5+4+6) and the "50 across 7 tiers / 19 universal" totals
// both yield 31 primary objectives. The 31-count is authoritative; "29" is a
// stale pre-v1.2 summary (v1.2 added the Stratum 7 adaptive-management objective).
//
// Inline "Expanded by: Ecovillage / Community" items on the UNIVERSAL objectives
// (Stratum 1 stakeholders, Stratum 5 access, Stratum 5 water harvesting) are NOT
// transcribed here - the universal slot is the type-agnostic shared baseline,
// and a primary-modifies-universal mechanism is not part of this model (same
// stance as ./regenFarm.ts). Only the standalone Primary objectives are encoded.
//
// Ref note: the source numbers TWO Stratum 7 objectives "6.6" - "Define enterprise
// sequencing..." (original) and "Define adaptive management protocol" (added in
// v1.2). 6.1-6.8 are all occupied, so the v1.2-added adaptive-management
// objective is given the next free slot, EV-S7.9, to keep refs unique. All
// objective CONTENT is transcribed verbatim; only the duplicate ref label is
// disambiguated. Authored in source body order (adaptive before member-exit).
//
// Economic objectives EV-S4.8 (financial contribution & shared economics) and
// EV-S7.5 (communal financial plan & capital contribution schedule) are encoded
// verbatim as plain data per the operator's informed 2026-05-29 "encode
// verbatim, no gating" authorisation. Their content is communal member-
// contribution framing (member buy-in, levies, capital reserves, communal fund
// governance) - cost-sharing among members who collectively own the asset, not
// advance sale of future yield.
//
// source: 'primary', sourceTypeId: 'ecovillage' on every objective.
// Refs follow Authoring Standards v1.4 (EV-T<tier>.<n>). ASCII-only copy:
// em/en dashes -> " - "; curly quotes -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, obj } from './authoring.js';

const PRIMARY = 'ecovillage' as const;

export const ECOVILLAGE_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'ev-s1-legal-governance',
    stratumId: 's1-project-foundation',
    ref: 'EV-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define legal entity, land tenure & governance model',
    focusedQuestion:
      'What legal structure will hold the land, how will ownership and tenure be structured for members, and how will collective decisions be made?',
    checklist: [
      ck(
        'ev-s1-legal-governance-c1',
        'Evaluate legal entity options - land trust, co-operative, company, charitable trust, incorporated society',
      ),
      ck('ev-s1-legal-governance-c2', 'Select legal entity and document rationale'),
      ck(
        'ev-s1-legal-governance-c3',
        'Define land tenure model - collective ownership, leasehold, equity shares, or hybrid',
      ),
      ck(
        'ev-s1-legal-governance-c4',
        'Define decision-making framework - consensus, sociocracy, majority vote, or hybrid',
      ),
      ck(
        'ev-s1-legal-governance-c5',
        'Define financial governance - how community funds are held, authorised, and reported',
      ),
      ck(
        'ev-s1-legal-governance-c6',
        'Establish membership rights and obligations in the governance model',
      ),
      ck('ev-s1-legal-governance-c7', 'Obtain legal advice on chosen structure before finalising'),
    ],
    completionGate:
      'Legal entity selected and documented. Tenure and governance model approved by founding group with legal advice confirmed.',
    actHandoff: 'Legal Entity, Tenure & Governance Model Brief',
  }),
  obj({
    id: 'ev-s1-provision-balance',
    stratumId: 's1-project-foundation',
    ref: 'EV-S1.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define communal vs. private provision balance',
    focusedQuestion:
      'What will be shared across the community - food, water, energy, infrastructure, finances - and what will remain private to each household?',
    checklist: [
      ck(
        'ev-s1-provision-balance-c1',
        'Define communal infrastructure commitments - water, energy, sanitation, shared buildings',
      ),
      ck(
        'ev-s1-provision-balance-c2',
        'Define food system approach - communal production, individual plots, or hybrid',
      ),
      ck(
        'ev-s1-provision-balance-c3',
        'Define financial sharing model - communal fund contributions, shared cost pools',
      ),
      ck(
        'ev-s1-provision-balance-c4',
        'Define private household entitlements - space, resources, privacy',
      ),
      ck(
        'ev-s1-provision-balance-c5',
        'Resolve conflicts between communal efficiency and household autonomy',
      ),
      ck('ev-s1-provision-balance-c6', 'Confirm provision balance is agreed by all founding members'),
    ],
    completionGate:
      'Communal vs. private provision balance agreed and documented. All founding members have confirmed agreement.',
    actHandoff: 'Communal Provision Balance Brief',
  }),
  obj({
    id: 'ev-s1-conflict-framework',
    stratumId: 's1-project-foundation',
    ref: 'EV-S1.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define conflict resolution & community agreement framework',
    focusedQuestion:
      'How will this community make decisions, resolve disputes, and handle member exits - before anyone moves onto the land?',
    scopeNotes:
      'This framework must be signed before Act begins - not after. Ecovillages that defer governance documentation until after people move in face legal and interpersonal crises that land design cannot resolve.',
    checklist: [
      ck(
        'ev-s1-conflict-framework-c1',
        'Define formal decision-making process with clear steps and quorum requirements',
      ),
      ck(
        'ev-s1-conflict-framework-c2',
        'Define dispute resolution pathway - informal, mediation, formal arbitration',
      ),
      ck(
        'ev-s1-conflict-framework-c3',
        'Establish community agreements on behaviour, noise, visitors, and shared space use',
      ),
      ck(
        'ev-s1-conflict-framework-c4',
        'Define member exit process - notice period, financial settlement, dwelling transition',
      ),
      ck(
        'ev-s1-conflict-framework-c5',
        'Define community dissolution protocol - how assets are distributed if the community ends',
      ),
      ck(
        'ev-s1-conflict-framework-c6',
        'Establish regular community review process - frequency, format, decision record-keeping',
      ),
      ck(
        'ev-s1-conflict-framework-c7',
        'Obtain all founding member signatures on community agreement framework before Act begins',
      ),
    ],
    completionGate:
      'Conflict resolution framework complete. Community agreements signed by all founding members before any land work begins.',
    actHandoff: 'Conflict Resolution & Community Agreement Framework',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'ev-s2-carrying-capacity',
    stratumId: 's2-land-reading',
    ref: 'EV-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey site carrying capacity for intended population',
    focusedQuestion:
      'How many households can this site sustainably support - across water, food, waste, energy, and space - at intended population density?',
    scopeNotes:
      'If intended population exceeds carrying capacity on any dimension, this is a Stratum 1 vision revision - not a Stratum 5 design problem. Escalate immediately.',
    checklist: [
      ck(
        'ev-s2-carrying-capacity-c1',
        'Estimate total water demand for intended population - domestic, food production, animals',
      ),
      ck(
        'ev-s2-carrying-capacity-c2',
        'Estimate food production potential relative to intended population - calories, nutrition diversity',
      ),
      ck(
        'ev-s2-carrying-capacity-c3',
        'Estimate waste and nutrient cycling capacity at intended population density',
      ),
      ck(
        'ev-s2-carrying-capacity-c4',
        'Estimate energy demand and generation potential for intended population',
      ),
      ck(
        'ev-s2-carrying-capacity-c5',
        'Assess available space for housing clusters, communal buildings, food production, and wild zones',
      ),
      ck(
        'ev-s2-carrying-capacity-c6',
        'Define maximum sustainable population for this site based on findings',
      ),
      ck(
        'ev-s2-carrying-capacity-c7',
        'Confirm intended population is within carrying capacity - defer or reduce if not',
      ),
    ],
    completionGate:
      'Carrying capacity assessment complete. Maximum sustainable population defined and confirmed against intended population.',
    actHandoff: 'Site Carrying Capacity Assessment',
  }),
  obj({
    id: 'ev-s2-tenure-boundary',
    stratumId: 's2-land-reading',
    ref: 'EV-S2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey existing land tenure & boundary conditions',
    focusedQuestion:
      'What are the legal access conditions, shared boundary agreements, and rights of way that affect communal land use?',
    checklist: [
      ck('ev-s2-tenure-boundary-c1', 'Map all shared boundary conditions and obligations'),
      ck(
        'ev-s2-tenure-boundary-c2',
        'Identify rights of way affecting communal land use and movement',
      ),
      ck(
        'ev-s2-tenure-boundary-c3',
        'Record any existing tenancy, lease, or occupation agreements on the land',
      ),
      ck(
        'ev-s2-tenure-boundary-c4',
        'Identify any title conditions that restrict multi-dwelling or communal use',
      ),
      ck(
        'ev-s2-tenure-boundary-c5',
        'Record any prior community or development history on the land',
      ),
    ],
    completionGate:
      'Land tenure and boundary conditions fully surveyed. All constraints on communal use identified.',
    actHandoff: 'Land Tenure & Boundary Conditions Survey',
  }),
  obj({
    id: 'ev-s2-landscape-vectors',
    stratumId: 's2-land-reading',
    ref: 'EV-S2.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey surrounding landscape context & vectors',
    focusedQuestion:
      'How does the surrounding landscape and community context shape the risks and opportunities for this ecovillage?',
    checklist: [
      ck('ev-s2-landscape-vectors-c1', 'Map surrounding land uses within 2km radius'),
      ck(
        'ev-s2-landscape-vectors-c2',
        'Identify neighbouring land-use practices and their spray, runoff, and contamination risk',
      ),
      ck(
        'ev-s2-landscape-vectors-c3',
        'Assess local authority and planning environment - is multi-dwelling community development supported?',
      ),
      ck(
        'ev-s2-landscape-vectors-c4',
        'Identify community groups, networks, or advocacy organisations in the region',
      ),
      ck(
        'ev-s2-landscape-vectors-c5',
        'Record any prior planning disputes or community opposition in the area',
      ),
      ck(
        'ev-s2-landscape-vectors-c6',
        'Assess drinking water catchment contamination risk from surrounding landscape vectors',
      ),
    ],
    completionGate:
      'Landscape context and vector survey complete. Planning environment and contamination risks identified.',
    actHandoff: 'Landscape Context & Vector Survey Package',
  }),
  obj({
    id: 'ev-s2-social-fabric',
    stratumId: 's2-land-reading',
    ref: 'EV-S2.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey existing community relationships & social fabric',
    focusedQuestion:
      'What existing relationships, trust networks, and community history does the founding group bring - and how does this shape what is possible?',
    checklist: [
      ck(
        'ev-s2-social-fabric-c1',
        'Map existing relationships between founding members - duration, depth, shared history',
      ),
      ck(
        'ev-s2-social-fabric-c2',
        'Identify prior community or cooperative living experience in the founding group',
      ),
      ck(
        'ev-s2-social-fabric-c3',
        'Record any prior attempts at intentional community on this land or by this group',
      ),
      ck(
        'ev-s2-social-fabric-c4',
        'Assess founding group cohesion - areas of strong alignment and known tension',
      ),
      ck(
        'ev-s2-social-fabric-c5',
        'Identify skills gaps in the founding group - facilitation, building, farming, legal, financial',
      ),
      ck(
        'ev-s2-social-fabric-c6',
        'Record external community relationships that could support establishment - networks, mentors, advisors',
      ),
    ],
    completionGate:
      'Social fabric survey complete. Founding group cohesion, skills, and relationship depth assessed.',
    actHandoff: 'Community Relationships & Social Fabric Survey',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'ev-s3-water-yield',
    stratumId: 's3-systems-reading',
    ref: 'EV-S3.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey site water yield relative to population demand',
    focusedQuestion:
      'Is there sufficient water available on this site to sustain the intended population across all seasons - and what is the seasonal gap?',
    checklist: [
      ck(
        'ev-s3-water-yield-c1',
        'Calculate total water demand for intended population - domestic, food production, animals, fire protection',
      ),
      ck(
        'ev-s3-water-yield-c2',
        'Assess all available water source yields across dry and wet seasons',
      ),
      ck('ev-s3-water-yield-c3', 'Map seasonal supply and demand curves - identify gap periods'),
      ck('ev-s3-water-yield-c4', 'Assess water quality for domestic and food production use'),
      ck('ev-s3-water-yield-c5', 'Identify storage requirements to bridge seasonal gaps'),
      ck('ev-s3-water-yield-c6', 'Define maximum population supportable by available water'),
    ],
    completionGate:
      'Water yield assessment complete. Population water demand confirmed against available yield. Seasonal gaps quantified.',
    actHandoff: 'Site Water Yield Assessment',
  }),
  obj({
    id: 'ev-s3-waste-cycling',
    stratumId: 's3-systems-reading',
    ref: 'EV-S3.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey waste & nutrient cycling capacity',
    focusedQuestion:
      'Can this site absorb communal waste streams - sewage, grey water, organic waste - at intended population density without ecological degradation?',
    checklist: [
      ck(
        'ev-s3-waste-cycling-c1',
        'Estimate sewage and grey water volumes at intended population density',
      ),
      ck(
        'ev-s3-waste-cycling-c2',
        'Assess soil percolation and treatment capacity for on-site waste processing',
      ),
      ck(
        'ev-s3-waste-cycling-c3',
        'Identify setback requirements from water sources for waste systems',
      ),
      ck(
        'ev-s3-waste-cycling-c4',
        'Assess composting and organic waste processing capacity required',
      ),
      ck('ev-s3-waste-cycling-c5', 'Map available land area for waste treatment systems'),
      ck('ev-s3-waste-cycling-c6', 'Identify regulatory requirements for communal waste systems'),
    ],
    completionGate:
      'Waste and nutrient cycling capacity assessed. Site capacity confirmed for intended population density.',
    actHandoff: 'Waste & Nutrient Cycling Capacity Assessment',
  }),
  obj({
    id: 'ev-s3-energy-potential',
    stratumId: 's3-systems-reading',
    ref: 'EV-S3.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey energy generation & distribution potential',
    focusedQuestion:
      'What energy can this site generate - solar, wind, hydro, biomass - and how can it be distributed communally to all dwellings?',
    checklist: [
      ck(
        'ev-s3-energy-potential-c1',
        'Assess solar generation potential - roof area, ground-mount zones, shading analysis',
      ),
      ck(
        'ev-s3-energy-potential-c2',
        'Assess wind generation potential - speed, consistency, regulatory constraints',
      ),
      ck('ev-s3-energy-potential-c3', 'Assess micro-hydro potential if running water present'),
      ck('ev-s3-energy-potential-c4', 'Assess biomass and wood fuel production capacity'),
      ck(
        'ev-s3-energy-potential-c5',
        'Estimate total community energy demand for intended population',
      ),
      ck(
        'ev-s3-energy-potential-c6',
        'Map distribution infrastructure requirements - grid connection, battery storage, micro-grid',
      ),
    ],
    completionGate:
      'Energy generation and distribution potential assessed. Demand and supply balance confirmed for intended population.',
    actHandoff: 'Energy Generation & Distribution Potential Assessment',
  }),
  obj({
    id: 'ev-s3-infra-condition',
    stratumId: 's3-systems-reading',
    ref: 'EV-S3.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey existing communal infrastructure condition',
    focusedQuestion:
      'What shared buildings, roads, utilities, and systems already exist on the site - and what is their condition and reuse potential?',
    checklist: [
      ck(
        'ev-s3-infra-condition-c1',
        'Inventory all existing communal or shared buildings with condition assessment',
      ),
      ck(
        'ev-s3-infra-condition-c2',
        'Assess structural integrity and code compliance of existing buildings',
      ),
      ck(
        'ev-s3-infra-condition-c3',
        'Record existing utility infrastructure - water, power, drainage, communications',
      ),
      ck(
        'ev-s3-infra-condition-c4',
        'Assess road and track condition for communal vehicle and pedestrian use',
      ),
      ck(
        'ev-s3-infra-condition-c5',
        'Identify reuse, renovation, or demolition requirements for each existing element',
      ),
    ],
    completionGate:
      'Existing communal infrastructure fully inventoried. Reuse potential and remediation requirements defined.',
    actHandoff: 'Existing Communal Infrastructure Condition Survey',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'ev-s4-settlement-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'EV-S4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define phased settlement strategy',
    focusedQuestion:
      'Who moves in when, under what conditions, and what infrastructure must be ready before each household cohort arrives?',
    scopeNotes:
      'Habitability thresholds are hard gates. Moving households onto the land before potable water, weathertight shelter, sanitation, and emergency communications are confirmed creates welfare and legal risk. No cohort moves until their threshold is fully met.',
    checklist: [
      ck(
        'ev-s4-settlement-strategy-c1',
        'Define founding cohort - who moves in during Phase 1 and under what criteria',
      ),
      ck(
        'ev-s4-settlement-strategy-c2',
        'Define infrastructure habitability threshold per cohort - what must be complete before each group arrives',
      ),
      ck(
        'ev-s4-settlement-strategy-c3',
        'Sequence subsequent cohort arrivals against infrastructure completion milestones',
      ),
      ck(
        'ev-s4-settlement-strategy-c4',
        'Define trial residency period before full membership for each new household',
      ),
      ck(
        'ev-s4-settlement-strategy-c5',
        'Establish maximum population per phase aligned with carrying capacity',
      ),
      ck(
        'ev-s4-settlement-strategy-c6',
        'Define go/no-go criteria for each settlement phase - hard gates, not aspirational targets',
      ),
    ],
    completionGate:
      'Phased settlement strategy approved. Habitability thresholds defined as hard gates for each cohort arrival. Founding group consensus confirmed.',
    actHandoff: 'Phased Settlement Strategy Brief',
  }),
  obj({
    id: 'ev-s4-infra-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'EV-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define communal infrastructure strategy',
    focusedQuestion:
      'What shared infrastructure will be built communally, in what sequence, and how will it be governed and maintained?',
    checklist: [
      ck(
        'ev-s4-infra-strategy-c1',
        'Define communal infrastructure list - kitchen, meeting hall, workshop, water system, energy grid, sanitation',
      ),
      ck(
        'ev-s4-infra-strategy-c2',
        'Prioritise communal infrastructure by Phase 1 habitability requirements',
      ),
      ck(
        'ev-s4-infra-strategy-c3',
        'Define ownership and maintenance governance for each communal asset',
      ),
      ck(
        'ev-s4-infra-strategy-c4',
        'Define cost-sharing model for communal infrastructure construction and maintenance',
      ),
      ck(
        'ev-s4-infra-strategy-c5',
        'Resolve conflicts between communal infrastructure investment and individual dwelling needs',
      ),
    ],
    completionGate:
      'Communal infrastructure strategy approved. Priority list, governance, and cost-sharing model confirmed.',
    actHandoff: 'Communal Infrastructure Strategy Brief',
  }),
  obj({
    id: 'ev-s4-housing-cluster',
    stratumId: 's4-foundation-decisions',
    ref: 'EV-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define housing cluster & private zone framework',
    focusedQuestion:
      'How will housing clusters be sited, and how will private household space be protected within communal land?',
    checklist: [
      ck(
        'ev-s4-housing-cluster-c1',
        'Define cluster sizes and maximum dwelling density per cluster',
      ),
      ck(
        'ev-s4-housing-cluster-c2',
        'Define private zone boundary for each dwelling type - outdoor space, garden, privacy screening',
      ),
      ck(
        'ev-s4-housing-cluster-c3',
        'Define shared transitional zones between private and communal areas',
      ),
      ck(
        'ev-s4-housing-cluster-c4',
        'Establish design standards for dwelling interface with communal space',
      ),
      ck(
        'ev-s4-housing-cluster-c5',
        'Confirm cluster framework against zone allocation and carrying capacity',
      ),
    ],
    completionGate:
      'Housing cluster and private zone framework approved. Density, privacy, and transitional zone standards confirmed.',
    actHandoff: 'Housing Cluster & Private Zone Framework Brief',
  }),
  obj({
    id: 'ev-s4-food-system',
    stratumId: 's4-foundation-decisions',
    ref: 'EV-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define community food system strategy',
    focusedQuestion:
      'How will food be produced and distributed across this community - communal growing, individual plots, or hybrid - and how does this connect to the provision balance decided in Stratum 1?',
    checklist: [
      ck(
        'ev-s4-food-system-c1',
        'Confirm food system approach from Stratum 1 provision balance - communal, individual, or hybrid',
      ),
      ck(
        'ev-s4-food-system-c2',
        'Define communal food production commitments - crops, volume, labour contribution model',
      ),
      ck(
        'ev-s4-food-system-c3',
        'Define individual plot allocation - size, location, tenure, maintenance obligations',
      ),
      ck(
        'ev-s4-food-system-c4',
        'Define food sharing and distribution protocol for communal harvests',
      ),
      ck(
        'ev-s4-food-system-c5',
        'Define seed saving, variety selection, and food sovereignty strategy',
      ),
      ck('ev-s4-food-system-c6', 'Establish food system governance - decisions, labour, disputes'),
    ],
    completionGate:
      'Community food system strategy approved. Production model, allocation, and governance confirmed.',
    actHandoff: 'Community Food System Strategy Brief',
  }),
  obj({
    id: 'ev-s4-financial-model',
    stratumId: 's4-foundation-decisions',
    ref: 'EV-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define financial contribution & shared economics model',
    focusedQuestion:
      "How will members contribute financially to communal infrastructure, ongoing costs, and the community's economic health?",
    scopeNotes:
      'All Stratum 5 infrastructure design gates on this financial model being confirmed. Do not proceed to design without it.',
    checklist: [
      ck(
        'ev-s4-financial-model-c1',
        'Define member buy-in contribution - amount, payment schedule, what it covers',
      ),
      ck(
        'ev-s4-financial-model-c2',
        'Define ongoing communal cost contributions - monthly or annual levy structure',
      ),
      ck(
        'ev-s4-financial-model-c3',
        'Define communal fund governance - how funds are held, authorised, and audited',
      ),
      ck(
        'ev-s4-financial-model-c4',
        'Define financial hardship protocol - how the community supports members in difficulty',
      ),
      ck(
        'ev-s4-financial-model-c5',
        'Define capital reserve strategy - how the community saves for major infrastructure renewal',
      ),
      ck(
        'ev-s4-financial-model-c6',
        'Confirm financial model is agreed by all founding members before any construction begins',
      ),
    ],
    completionGate:
      'Financial contribution model approved and agreed by all founding members. Communal fund governance confirmed.',
    actHandoff: 'Financial Contribution & Shared Economics Model Brief',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'ev-s5-cluster-layout',
    stratumId: 's5-system-design',
    ref: 'EV-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design housing cluster layouts & private dwelling zones',
    focusedQuestion:
      'How will housing clusters be physically laid out - orientation, spacing, privacy, shared transitions - to serve both communal connection and household privacy?',
    checklist: [
      ck(
        'ev-s5-cluster-layout-c1',
        'Design cluster layout for each housing zone - dwelling orientation, spacing, shared edges',
      ),
      ck(
        'ev-s5-cluster-layout-c2',
        'Design private outdoor zone for each dwelling - screening, planting, surface',
      ),
      ck(
        'ev-s5-cluster-layout-c3',
        'Design shared transitional spaces within each cluster - communal gardens, seating, play areas',
      ),
      ck(
        'ev-s5-cluster-layout-c4',
        'Specify dwelling design standards - footprint, height, materials palette, energy performance',
      ),
      ck(
        'ev-s5-cluster-layout-c5',
        'Design acoustic and visual screening between clusters and between clusters and communal hub',
      ),
      ck(
        'ev-s5-cluster-layout-c6',
        'Confirm cluster layouts against fire egress and emergency access requirements',
      ),
    ],
    completionGate:
      'Housing cluster layouts approved. Privacy zones, transitional spaces, and dwelling standards confirmed.',
    actHandoff: 'Housing Cluster Layout Design Package',
  }),
  obj({
    id: 'ev-s5-communal-systems',
    stratumId: 's5-system-design',
    ref: 'EV-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design communal infrastructure systems',
    focusedQuestion:
      'How will shared buildings and communal facilities be designed to serve the whole community?',
    checklist: [
      ck(
        'ev-s5-communal-systems-c1',
        'Design communal kitchen and dining facility - capacity, equipment, layout',
      ),
      ck(
        'ev-s5-communal-systems-c2',
        'Design meeting hall - capacity, acoustics, flexibility for different uses',
      ),
      ck(
        'ev-s5-communal-systems-c3',
        'Design workshop and tool library - storage, workbench layout, safety',
      ),
      ck('ev-s5-communal-systems-c4', 'Design communal laundry and shared service facilities'),
      ck(
        'ev-s5-communal-systems-c5',
        'Specify materials and construction standards for communal buildings',
      ),
      ck(
        'ev-s5-communal-systems-c6',
        'Confirm communal building designs are financially achievable within Stratum 4 model',
      ),
    ],
    completionGate:
      'Communal infrastructure systems design approved. All shared buildings specified and financially confirmed.',
    actHandoff: 'Communal Infrastructure Systems Design Package',
  }),
  obj({
    id: 'ev-s5-sanitation-waste',
    stratumId: 's5-system-design',
    ref: 'EV-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design communal sanitation & waste systems',
    focusedQuestion:
      'How will sewage, grey water, and organic waste be managed safely across the community at intended population density?',
    checklist: [
      ck(
        'ev-s5-sanitation-waste-c1',
        'Design sewage treatment system - composting toilets, biodigester, constructed wetland, or connection to municipal system',
      ),
      ck('ev-s5-sanitation-waste-c2', 'Design grey water collection, treatment, and reuse network'),
      ck(
        'ev-s5-sanitation-waste-c3',
        'Design communal organic waste processing - compost bays, worm farms, biodigester',
      ),
      ck('ev-s5-sanitation-waste-c4', 'Design waste sorting and recycling infrastructure'),
      ck('ev-s5-sanitation-waste-c5', 'Specify setback distances from water sources and dwellings'),
      ck(
        'ev-s5-sanitation-waste-c6',
        'Confirm design meets regulatory requirements for communal systems',
      ),
    ],
    completionGate:
      'Communal sanitation and waste systems design approved. All components specified and regulatory compliance confirmed.',
    actHandoff: 'Communal Sanitation & Waste Systems Design Package',
  }),
  obj({
    id: 'ev-s5-energy-system',
    stratumId: 's5-system-design',
    ref: 'EV-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design communal energy system',
    focusedQuestion:
      'How will community-scale energy generation, storage, and distribution be designed to serve all dwellings and communal facilities?',
    checklist: [
      ck(
        'ev-s5-energy-system-c1',
        'Design primary generation system - solar array, wind, micro-hydro, or hybrid',
      ),
      ck('ev-s5-energy-system-c2', 'Design battery or thermal storage capacity'),
      ck(
        'ev-s5-energy-system-c3',
        'Design micro-grid distribution network to all dwellings and communal buildings',
      ),
      ck(
        'ev-s5-energy-system-c4',
        'Specify metering and monitoring infrastructure for energy governance',
      ),
      ck('ev-s5-energy-system-c5', 'Design backup and emergency power supply'),
      ck(
        'ev-s5-energy-system-c6',
        'Confirm energy system design is financially achievable within Stratum 4 model',
      ),
    ],
    completionGate:
      'Communal energy system design approved. Generation, storage, and distribution specified and financially confirmed.',
    actHandoff: 'Communal Energy System Design Package',
  }),
  obj({
    id: 'ev-s5-food-zones',
    stratumId: 's5-system-design',
    ref: 'EV-S5.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design community food production zones',
    focusedQuestion:
      'How will communal gardens, individual plots, orchard, food forest, and shared food infrastructure be physically designed and allocated?',
    checklist: [
      ck(
        'ev-s5-food-zones-c1',
        'Design communal growing areas - bed layout, access paths, irrigation, tool storage',
      ),
      ck(
        'ev-s5-food-zones-c2',
        'Design individual plot allocation - sizes, boundaries, access, water points',
      ),
      ck(
        'ev-s5-food-zones-c3',
        'Design orchard and food forest zones - species placement, access, harvest paths',
      ),
      ck('ev-s5-food-zones-c4', 'Design seed saving and nursery area'),
      ck(
        'ev-s5-food-zones-c5',
        'Design food storage and processing infrastructure - cool room, drying shed, preserving kitchen',
      ),
      ck(
        'ev-s5-food-zones-c6',
        'Confirm food production zone design against community food system strategy',
      ),
    ],
    completionGate:
      'Community food production zone design approved. All growing areas, plots, and food infrastructure specified.',
    actHandoff: 'Community Food Production Zone Design Package',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'ev-s6-social-monitoring',
    stratumId: 's6-integration-design',
    ref: 'EV-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design community health & social fabric monitoring system',
    focusedQuestion:
      'How will the community track its social health over time - governance function, conflict frequency, member satisfaction, and financial wellbeing?',
    checklist: [
      ck(
        'ev-s6-social-monitoring-c1',
        'Define social health indicators - meeting attendance, decision-making quality, conflict frequency, member satisfaction',
      ),
      ck(
        'ev-s6-social-monitoring-c2',
        'Define financial health indicators - communal fund levels, arrears, capital reserve status',
      ),
      ck(
        'ev-s6-social-monitoring-c3',
        'Design regular community check-in process - format, frequency, facilitation',
      ),
      ck('ev-s6-social-monitoring-c4', 'Design anonymous feedback mechanism for sensitive issues'),
      ck(
        'ev-s6-social-monitoring-c5',
        'Define escalation pathway when social health indicators deteriorate',
      ),
      ck('ev-s6-social-monitoring-c6', 'Specify record-keeping system for community health data'),
    ],
    completionGate:
      'Community health monitoring system designed and approved. Social and financial indicators, processes, and escalation pathways defined.',
    actHandoff: 'Community Health & Social Fabric Monitoring System',
  }),
  obj({
    id: 'ev-s6-maintenance-protocol',
    stratumId: 's6-integration-design',
    ref: 'EV-S6.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design communal infrastructure maintenance & stewardship protocol',
    focusedQuestion:
      'How will shared infrastructure be maintained over time - who does what, how often, funded by whom?',
    checklist: [
      ck(
        'ev-s6-maintenance-protocol-c1',
        'Define maintenance schedule for each communal infrastructure system',
      ),
      ck(
        'ev-s6-maintenance-protocol-c2',
        'Assign maintenance responsibility - rotating roster, dedicated roles, contracted services',
      ),
      ck(
        'ev-s6-maintenance-protocol-c3',
        'Define maintenance fund contribution and reserve requirements',
      ),
      ck('ev-s6-maintenance-protocol-c4', 'Design inspection and condition reporting system'),
      ck(
        'ev-s6-maintenance-protocol-c5',
        'Define escalation process for urgent or major maintenance needs',
      ),
    ],
    completionGate:
      'Communal infrastructure maintenance protocol approved. Schedules, responsibilities, and funding confirmed for all shared systems.',
    actHandoff: 'Communal Infrastructure Maintenance Protocol',
  }),
  obj({
    id: 'ev-s6-coordination-feedback',
    stratumId: 's6-integration-design',
    ref: 'EV-S6.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design communal systems coordination & household feedback protocols',
    focusedQuestion:
      'How do communal water, energy, and food systems actively inform household decisions - and how do household actions feed back into communal system management?',
    checklist: [
      ck(
        'ev-s6-coordination-feedback-c1',
        'Define energy surplus and shortage protocols - how communal energy status triggers household behaviour changes',
      ),
      ck(
        'ev-s6-coordination-feedback-c2',
        'Define water restriction cascade - how water levels trigger staged household use reductions',
      ),
      ck(
        'ev-s6-coordination-feedback-c3',
        'Define food harvest sharing protocols - how communal harvests are distributed to households',
      ),
      ck(
        'ev-s6-coordination-feedback-c4',
        'Design community-wide communication system for real-time system status updates',
      ),
      ck(
        'ev-s6-coordination-feedback-c5',
        'Define decision triggers - when individual household behaviour requires community response',
      ),
    ],
    completionGate:
      'Communal systems coordination protocols approved. All feedback mechanisms between communal systems and household decisions defined.',
    actHandoff: 'Communal Systems Coordination & Household Feedback Protocols',
  }),
  obj({
    id: 'ev-s6-external-relations',
    stratumId: 's6-integration-design',
    ref: 'EV-S6.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design community-external relations & planning compliance monitoring',
    focusedQuestion:
      'How will this community actively manage its ongoing relationships with neighbours, local authority, and planning bodies throughout establishment and beyond?',
    checklist: [
      ck(
        'ev-s6-external-relations-c1',
        'Define regular neighbour communication rhythm - frequency, format, nominated community contact',
      ),
      ck(
        'ev-s6-external-relations-c2',
        'Design planning compliance monitoring system - track all conditions, review dates, and obligations',
      ),
      ck(
        'ev-s6-external-relations-c3',
        'Define community spokesperson and external relations protocol',
      ),
      ck(
        'ev-s6-external-relations-c4',
        'Design complaint response process - how neighbour or authority concerns are received and addressed',
      ),
      ck(
        'ev-s6-external-relations-c5',
        'Establish relationship with local authority planning officer before construction begins',
      ),
      ck('ev-s6-external-relations-c6', 'Define annual community external relations review'),
    ],
    completionGate:
      'External relations and planning compliance monitoring system approved. Neighbour communication rhythm and planning obligations tracking confirmed.',
    actHandoff: 'Community External Relations & Planning Compliance System',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'ev-s7-settlement-plan',
    stratumId: 's7-phasing-resourcing',
    ref: 'EV-S7.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define phased settlement implementation plan',
    focusedQuestion:
      'Who arrives in each phase, what must be complete before they arrive, and how are habitability thresholds enforced?',
    scopeNotes:
      'Habitability thresholds must be verified by someone other than the arriving household. Self-certification is not sufficient.',
    checklist: [
      ck('ev-s7-settlement-plan-c1', 'Define founding cohort composition and arrival date'),
      ck(
        'ev-s7-settlement-plan-c2',
        'List exact habitability threshold items for founding cohort - potable water, shelter, sanitation, emergency communications',
      ),
      ck(
        'ev-s7-settlement-plan-c3',
        'Define arrival criteria checklist - confirmed complete, tested, and signed off before any household moves in',
      ),
      ck(
        'ev-s7-settlement-plan-c4',
        'Schedule subsequent cohort arrivals against infrastructure completion milestones',
      ),
      ck(
        'ev-s7-settlement-plan-c5',
        'Define who enforces habitability thresholds - not self-reported by arriving households',
      ),
    ],
    completionGate:
      'Phased settlement implementation plan approved. Habitability thresholds defined as explicit checklists, not aspirational descriptions.',
    actHandoff: 'Phased Settlement Implementation Plan',
  }),
  obj({
    id: 'ev-s7-financial-plan',
    stratumId: 's7-phasing-resourcing',
    ref: 'EV-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define communal financial plan & capital contribution schedule',
    focusedQuestion:
      'How will founding infrastructure be funded, and what is the payment schedule for founding member contributions?',
    checklist: [
      ck('ev-s7-financial-plan-c1', 'Define total Phase 1 capital requirement'),
      ck(
        'ev-s7-financial-plan-c2',
        'Define member contribution schedule - amounts, payment dates, default consequences',
      ),
      ck(
        'ev-s7-financial-plan-c3',
        'Define communal fund holding structure - bank account, trust, escrow',
      ),
      ck('ev-s7-financial-plan-c4', 'Define financial reporting schedule to all members'),
      ck(
        'ev-s7-financial-plan-c5',
        'Confirm all founding member contributions are committed before construction begins',
      ),
    ],
    completionGate:
      'Communal financial plan approved. All founding member contributions committed and payment schedule confirmed.',
    actHandoff: 'Communal Financial Plan & Capital Contribution Schedule',
  }),
  obj({
    id: 'ev-s7-launch-sequence',
    stratumId: 's7-phasing-resourcing',
    ref: 'EV-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define enterprise sequencing & communal systems launch order',
    focusedQuestion:
      'In what order will communal systems be established - water before people, sanitation before food production, energy before winter?',
    checklist: [
      ck(
        'ev-s7-launch-sequence-c1',
        'Sequence communal water system completion before any household arrival',
      ),
      ck(
        'ev-s7-launch-sequence-c2',
        'Sequence sanitation system completion before food production launch',
      ),
      ck(
        'ev-s7-launch-sequence-c3',
        'Sequence energy system completion before first winter occupancy',
      ),
      ck(
        'ev-s7-launch-sequence-c4',
        'Define go/no-go criteria for each system launch - tested and confirmed, not planned',
      ),
      ck('ev-s7-launch-sequence-c5', 'Confirm sequencing against Phase 1 implementation plan'),
    ],
    completionGate:
      'Communal systems launch sequence approved. Water, sanitation, and energy sequenced before dependent activities.',
    actHandoff: 'Communal Systems Launch Sequence',
  }),
  obj({
    id: 'ev-s7-onboarding',
    stratumId: 's7-phasing-resourcing',
    ref: 'EV-S7.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define membership onboarding & integration protocol',
    focusedQuestion:
      'How will new members join the community, complete a trial period, and achieve full membership?',
    checklist: [
      ck('ev-s7-onboarding-c1', 'Define application and selection process for new members'),
      ck(
        'ev-s7-onboarding-c2',
        'Define trial residency period - duration, expectations, review criteria',
      ),
      ck('ev-s7-onboarding-c3', 'Define full membership criteria and confirmation process'),
      ck(
        'ev-s7-onboarding-c4',
        'Design orientation program for new members - governance, systems, agreements',
      ),
      ck('ev-s7-onboarding-c5', 'Define mentorship or buddy system for new household integration'),
    ],
    completionGate:
      'Membership onboarding protocol approved. Trial period, full membership criteria, and orientation program confirmed.',
    actHandoff: 'Membership Onboarding & Integration Protocol',
  }),
  // EV-S7.9: the source labels this objective "6.6" (a duplicate of the
  // enterprise-sequencing ref above) - it was appended in v1.2 ("Adaptive
  // management protocol added to Stratum 7"). 6.1-6.8 are occupied, so it takes the
  // next free slot. Content is verbatim; only the duplicate ref is disambiguated.
  obj({
    id: 'ev-s7-adaptive-management',
    stratumId: 's7-phasing-resourcing',
    ref: 'EV-S7.9',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define adaptive management protocol',
    focusedQuestion:
      'How will land monitoring and community health findings trigger changes to the community management plan?',
    checklist: [
      ck(
        'ev-s7-adaptive-management-c1',
        'Define annual management review process - land data and social health data reviewed together',
      ),
      ck(
        'ev-s7-adaptive-management-c2',
        'Define decision triggers - what monitoring outcomes require a plan change',
      ),
      ck(
        'ev-s7-adaptive-management-c3',
        'Define escalation process for unexpected ecological or community events',
      ),
      ck(
        'ev-s7-adaptive-management-c4',
        'Specify documentation requirements for all plan changes and their rationale',
      ),
      ck(
        'ev-s7-adaptive-management-c5',
        'Define 5-year comprehensive review against Stratum 1 vision and ecological outcome targets',
      ),
    ],
    completionGate:
      'Adaptive management protocol approved. Review cycle, triggers, and documentation confirmed.',
    actHandoff: 'Adaptive Management Protocol',
  }),
  obj({
    id: 'ev-s7-exit-succession',
    stratumId: 's7-phasing-resourcing',
    ref: 'EV-S7.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define member exit & land succession protocol',
    focusedQuestion:
      'How will departing members be bought out, how will their dwelling and land share transfer, and what happens if the community dissolves?',
    scopeNotes:
      'This protocol must be legally reviewed and signed before any member moves on-site - not after. Ecovillages without documented exit protocols become legally trapped the moment the first member wants to leave.',
    checklist: [
      ck(
        'ev-s7-exit-succession-c1',
        'Define exit process - notice period, financial settlement calculation, timeline',
      ),
      ck(
        'ev-s7-exit-succession-c2',
        'Define dwelling transfer process - who buys, at what price, by what method',
      ),
      ck('ev-s7-exit-succession-c3', 'Define land share reversion to communal ownership on exit'),
      ck(
        'ev-s7-exit-succession-c4',
        'Define community dissolution protocol - how assets and liabilities are distributed',
      ),
      ck(
        'ev-s7-exit-succession-c5',
        'Obtain legal review of exit and succession protocol before any member moves on-site',
      ),
    ],
    completionGate:
      'Exit and succession protocol approved with legal review confirmed. All founding members acknowledge and sign before moving on-site.',
    actHandoff: 'Member Exit & Land Succession Protocol',
  }),
];

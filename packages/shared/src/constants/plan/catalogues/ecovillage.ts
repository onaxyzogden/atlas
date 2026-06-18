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
// sub-headers (4+3+4+5+5+4+6) and the "50 across 7 tiers / 19 universal" totals
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
import { ck, dg, obj } from './authoring.js';

// Decision groups (Decision Groups Reference v1.0; OLOS spec 9.3-9.4) - AUTHORED
// under the 2026-05-31 extended override ("author meaningful labels"). The
// reference doc's 18-catalogue table does not enumerate matching groups for the
// ecovillage primary at the 19-universal / v1.2 checklist granularity encoded
// here, so every group below - label, item membership, observeFeeds - is
// authored editorially to partition each objective's checklist into 2-3 named
// decision scopes (full mutually-exclusive partition). Ecovillage is primary-only
// (canBeSecondary: false) and carries no PatchRecords, so there are no
// injectedGroups.

const PRIMARY = 'ecovillage' as const;

export const ECOVILLAGE_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'ev-s1-legal-governance',
    stratumId: 's1-project-foundation',
    ref: 'EV-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound legal entity, tenure & governance model',
    shortTitle: 'Legal entity, tenure & governance model',
    focusedQuestion:
      'What legal structure will hold the land, how will ownership and tenure be structured for members, and how will collective decisions be made?',
    checklist: [
      ck(
        'ev-s1-legal-governance-c1',
        'Evaluate legal entity options - land trust, co-operative, company, charitable trust, incorporated society',
        {
          feedHint: 'Compare 5 Ontario entity types against Islamic compatibility and community land principles',
          feedNote:
            'Most Islamic ICs in Canada use a non-profit corporation (ONCA) structured as a CLT - the corporation holds the land, members hold long-term leasehold. This is the recommended starting point for Decision 3.',
        },
      ),
      ck(
        'ev-s1-legal-governance-c8',
        'Confirm governing jurisdiction - province, territory, or nation of registration',
        {
          feedHint:
            'Ontario provincial vs. federal incorporation - implications for charitable status and land holding',
          feedNote:
            'Ontario ONCA incorporation is the standard choice for a single-site GTA/Halton community. Charitable status under CRA is a separate question - register as a charity only if the organization qualifies under the Income Tax Act.',
        },
      ),
      ck('ev-s1-legal-governance-c2', 'Select legal entity and document rationale', {
        feedHint: 'The formal decision record - entity selected, reasons stated, shura vote outcome recorded',
        feedNote:
          'This decision record is permanent - it feeds the legal advice gate (Decision 8) and the Waqf deed documentation. It becomes the governance record for all future members and for the founding documents.',
      }),
      ck(
        'ev-s1-legal-governance-c3',
        'Define land tenure model - collective ownership, leasehold, equity shares, or hybrid',
        {
          feeds: ['ev-s4-housing-cluster', 'ev-s7-exit-succession'],
          feedHint:
            'Waqf-compatible perpetual holding recommended - land is an amanah, not an asset to be extracted',
          feedNote:
            'The tenure model must be reflected in the Waqf declaration deed (prepared with legal counsel) and in the ground lease template. Decision 8 confirms these documents have been reviewed.',
        },
      ),
      ck(
        'ev-s1-legal-governance-c4',
        'Define decision-making framework - consensus, sociocracy, majority vote, or hybrid',
        {
          feeds: ['ev-s6-coordination-feedback', 'ev-s7-adaptive-management'],
          feedHint:
            'Shura as governing principle - three tiers of authority: steward / committee / full shura',
          feedNote:
            'The three-tier framework is embedded in the community covenant (next objective) and in the financial governance rules (Decision 6). It also governs the Adaptive Management Protocol designed at Stratum 7.',
        },
      ),
      ck(
        'ev-s1-legal-governance-c5',
        'Define financial governance - how community funds are held, authorised, and reported',
        {
          feeds: ['ev-s4-financial-model', 'ev-s7-financial-plan'],
          feedHint:
            'Riba-free banking - qist in expense authorisation - quarterly reporting to all members',
          feedNote:
            'Financial governance rules feed the community agreement (next objective) and the annual review process designed at Stratum 7. All spending above threshold is recorded in the plan-change log.',
        },
      ),
      ck(
        'ev-s1-legal-governance-c6',
        'Establish membership rights and obligations in the governance model',
        {
          feeds: ['ev-s7-onboarding', 'ev-s7-exit-succession'],
          feedHint:
            'What membership confers and what it requires - including entry, exit, and covenant obligations',
          feedNote:
            'Membership rights and obligations become Appendix A of the community covenant - the legally binding agreement signed by each household at admission. Decision 8 confirms a legal adviser has reviewed these terms.',
        },
      ),
      ck('ev-s1-legal-governance-c7', 'Obtain legal advice on chosen structure before finalising', {
        feedHint: 'The only non-self-certifiable item - requires documented third-party legal counsel to close',
      }),
    ],
    decisionGroups: [
      dg('ev-s1-legal-governance-dg1', 'Legal entity', ['ev-s1-legal-governance-c1', 'ev-s1-legal-governance-c8', 'ev-s1-legal-governance-c2'], []),
      dg('ev-s1-legal-governance-dg2', 'Tenure & governance', ['ev-s1-legal-governance-c3', 'ev-s1-legal-governance-c4'], []),
      dg('ev-s1-legal-governance-dg3', 'Finance & membership', ['ev-s1-legal-governance-c5', 'ev-s1-legal-governance-c6', 'ev-s1-legal-governance-c7'], []),
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
    title: 'A clear communal vs. private provision balance',
    shortTitle: 'Communal vs. private provision balance',
    focusedQuestion:
      'What will be shared across the community - food, water, energy, infrastructure, finances - and what will remain private to each household?',
    checklist: [
      ck(
        'ev-s1-provision-balance-c1',
        'Define communal infrastructure commitments - water, energy, sanitation, shared buildings',
        { feeds: ['ev-s4-infra-strategy', 'ev-s7-launch-sequence'] },
      ),
      ck(
        'ev-s1-provision-balance-c2',
        'Define food system approach - communal production, individual plots, or hybrid',
        { feeds: ['ev-s4-food-system'] },
      ),
      ck(
        'ev-s1-provision-balance-c3',
        'Define financial sharing model - communal fund contributions, shared cost pools',
        { feeds: ['ev-s4-financial-model'] },
      ),
      ck(
        'ev-s1-provision-balance-c4',
        'Define private household entitlements - space, resources, privacy',
        { feeds: ['ev-s4-housing-cluster'] },
      ),
      ck(
        'ev-s1-provision-balance-c5',
        'Resolve conflicts between communal efficiency and household autonomy',
      ),
      ck('ev-s1-provision-balance-c6', 'Confirm provision balance is agreed by all founding members'),
    ],
    decisionGroups: [
      dg('ev-s1-provision-balance-dg1', 'Communal commitments', ['ev-s1-provision-balance-c1', 'ev-s1-provision-balance-c2', 'ev-s1-provision-balance-c3'], []),
      dg('ev-s1-provision-balance-dg2', 'Private entitlements & autonomy', ['ev-s1-provision-balance-c4', 'ev-s1-provision-balance-c5', 'ev-s1-provision-balance-c6'], []),
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
    title: 'A sound conflict resolution & community agreement framework',
    shortTitle: 'Conflict resolution & community agreement framework',
    focusedQuestion:
      'How will this community make decisions, resolve disputes, and handle member exits - before anyone moves onto the land?',
    scopeNotes:
      'This framework must be signed before Act begins - not after. Ecovillages that defer governance documentation until after people move in face legal and interpersonal crises that land design cannot resolve.',
    checklist: [
      ck(
        'ev-s1-conflict-framework-c1',
        'Define formal decision-making process with clear steps and quorum requirements',
        { feeds: ['ev-s6-coordination-feedback', 'ev-s7-onboarding'] },
      ),
      ck(
        'ev-s1-conflict-framework-c2',
        'Define dispute resolution pathway - informal, mediation, formal arbitration',
        { feeds: ['ev-s7-onboarding'] },
      ),
      ck(
        'ev-s1-conflict-framework-c3',
        'Establish community agreements on behaviour, noise, visitors, and shared space use',
        { feeds: ['ev-s6-coordination-feedback', 'ev-s7-onboarding'] },
      ),
      ck(
        'ev-s1-conflict-framework-c4',
        'Define member exit process - notice period, financial settlement, dwelling transition',
        { feeds: ['ev-s7-exit-succession'] },
      ),
      ck(
        'ev-s1-conflict-framework-c5',
        'Define community dissolution protocol - how assets are distributed if the community ends',
        { feeds: ['ev-s7-exit-succession'] },
      ),
      ck(
        'ev-s1-conflict-framework-c6',
        'Establish regular community review process - frequency, format, decision record-keeping',
        { feeds: ['ev-s6-social-monitoring', 'ev-s7-adaptive-management'] },
      ),
      ck(
        'ev-s1-conflict-framework-c7',
        'Obtain all founding member signatures on community agreement framework before Act begins',
      ),
    ],
    decisionGroups: [
      dg('ev-s1-conflict-framework-dg1', 'Decision & dispute process', ['ev-s1-conflict-framework-c1', 'ev-s1-conflict-framework-c2'], []),
      dg('ev-s1-conflict-framework-dg2', 'Community agreements & exit', ['ev-s1-conflict-framework-c3', 'ev-s1-conflict-framework-c4'], []),
      dg('ev-s1-conflict-framework-dg3', 'Dissolution, review & sign-off', ['ev-s1-conflict-framework-c5', 'ev-s1-conflict-framework-c6', 'ev-s1-conflict-framework-c7'], []),
    ],
    completionGate:
      'Conflict resolution framework complete. Community agreements signed by all founding members before any land work begins.',
    actHandoff: 'Conflict Resolution & Community Agreement Framework',
  }),
  obj({
    id: 'ev-s2-social-fabric',
    stratumId: 's1-project-foundation',
    ref: 'EV-S1.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of community relationships & social fabric',
    shortTitle: 'Community relationships & social fabric',
    focusedQuestion:
      'What existing relationships, trust networks, and community history does the founding group bring - and how does this shape what is possible?',
    checklist: [
      ck(
        'ev-s2-social-fabric-c1',
        'Map existing relationships between founding members - duration, depth, shared history',
        { feeds: ['ev-s6-social-monitoring'], mode: 'Relationship map' },
      ),
      ck(
        'ev-s2-social-fabric-c2',
        'Identify prior community or cooperative living experience in the founding group',
        { mode: 'Experience register' },
      ),
      ck(
        'ev-s2-social-fabric-c3',
        'Record any prior attempts at intentional community on this land or by this group',
        { mode: 'Prior attempts' },
      ),
      ck(
        'ev-s2-social-fabric-c4',
        'Assess founding group cohesion - areas of strong alignment and known tension',
        { feeds: ['ev-s6-social-monitoring'], mode: 'Cohesion map' },
      ),
      ck(
        'ev-s2-social-fabric-c5',
        'Identify skills gaps in the founding group - facilitation, building, farming, legal, financial',
        { mode: 'Skills matrix' },
      ),
      ck(
        'ev-s2-social-fabric-c6',
        'Record external community relationships that could support establishment - networks, mentors, advisors',
        { mode: 'External networks' },
      ),
    ],
    decisionGroups: [
      dg('ev-s2-social-fabric-dg1', 'Founding relationships & experience', ['ev-s2-social-fabric-c1', 'ev-s2-social-fabric-c2', 'ev-s2-social-fabric-c3'], []),
      dg('ev-s2-social-fabric-dg2', 'Cohesion, skills & external support', ['ev-s2-social-fabric-c4', 'ev-s2-social-fabric-c5', 'ev-s2-social-fabric-c6'], []),
    ],
    completionGate:
      'Social fabric survey complete. Founding group cohesion, skills, and relationship depth assessed.',
    actHandoff: 'Community Relationships & Social Fabric Survey',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'ev-s2-carrying-capacity',
    stratumId: 's2-land-reading',
    ref: 'EV-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of site carrying capacity for the population',
    shortTitle: 'Site carrying capacity for the population',
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
        { feeds: ['ev-s4-food-system', 'ev-s5-food-zones'] },
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
        { feeds: ['ev-s4-settlement-strategy', 'ev-s5-cluster-layout', 'ev-s7-settlement-plan'] },
      ),
      ck(
        'ev-s2-carrying-capacity-c7',
        'Confirm intended population is within carrying capacity - defer or reduce if not',
      ),
    ],
    decisionGroups: [
      dg('ev-s2-carrying-capacity-dg1', 'Resource demand estimates', ['ev-s2-carrying-capacity-c1', 'ev-s2-carrying-capacity-c2', 'ev-s2-carrying-capacity-c3', 'ev-s2-carrying-capacity-c4'], []),
      dg('ev-s2-carrying-capacity-dg2', 'Space & population ceiling', ['ev-s2-carrying-capacity-c5', 'ev-s2-carrying-capacity-c6', 'ev-s2-carrying-capacity-c7'], []),
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
    title: 'A clear read of land tenure & boundary conditions',
    shortTitle: 'Land tenure & boundary conditions',
    focusedQuestion:
      'What are the legal access conditions, shared boundary agreements, and rights of way that affect communal land use?',
    checklist: [
      ck('ev-s2-tenure-boundary-c1', 'Map all shared boundary conditions and obligations', {
        feeds: ['s5-access', 'ev-s4-housing-cluster'],
      }),
      ck(
        'ev-s2-tenure-boundary-c2',
        'Identify rights of way affecting communal land use and movement',
        { feeds: ['s5-access'] },
      ),
      ck(
        'ev-s2-tenure-boundary-c3',
        'Record any existing tenancy, lease, or occupation agreements on the land',
      ),
      ck(
        'ev-s2-tenure-boundary-c4',
        'Identify any title conditions that restrict multi-dwelling or communal use',
        { feeds: ['ev-s4-housing-cluster', 's7-risk-register'] },
      ),
      ck(
        'ev-s2-tenure-boundary-c5',
        'Record any prior community or development history on the land',
      ),
    ],
    decisionGroups: [
      dg('ev-s2-tenure-boundary-dg1', 'Boundaries & rights of way', ['ev-s2-tenure-boundary-c1', 'ev-s2-tenure-boundary-c2'], ['Infrastructure & Access']),
      dg('ev-s2-tenure-boundary-dg2', 'Tenancy & title conditions', ['ev-s2-tenure-boundary-c3', 'ev-s2-tenure-boundary-c4'], []),
      dg('ev-s2-tenure-boundary-dg3', 'Land history', ['ev-s2-tenure-boundary-c5'], []),
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
    title: 'A clear read of surrounding landscape & vectors',
    shortTitle: 'Surrounding landscape & vectors',
    focusedQuestion:
      'How does the surrounding landscape and community context shape the risks and opportunities for this ecovillage?',
    checklist: [
      ck('ev-s2-landscape-vectors-c1', 'Map surrounding land uses within 2km radius'),
      ck(
        'ev-s2-landscape-vectors-c2',
        'Identify neighbouring land-use practices and their spray, runoff, and contamination risk',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'ev-s2-landscape-vectors-c3',
        'Assess local authority and planning environment - is multi-dwelling community development supported?',
        { feeds: ['ev-s6-external-relations', 's7-risk-register'] },
      ),
      ck(
        'ev-s2-landscape-vectors-c4',
        'Identify community groups, networks, or advocacy organisations in the region',
        { feeds: ['ev-s6-external-relations'] },
      ),
      ck(
        'ev-s2-landscape-vectors-c5',
        'Record any prior planning disputes or community opposition in the area',
        { feeds: ['ev-s6-external-relations', 's7-risk-register'] },
      ),
      ck(
        'ev-s2-landscape-vectors-c6',
        'Assess drinking water catchment contamination risk from surrounding landscape vectors',
        { feeds: ['s4-water-strategy', 's7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('ev-s2-landscape-vectors-dg1', 'Surrounding land use & risk', ['ev-s2-landscape-vectors-c1', 'ev-s2-landscape-vectors-c2'], ['Ecology & Habitat']),
      dg('ev-s2-landscape-vectors-dg2', 'Planning & community context', ['ev-s2-landscape-vectors-c3', 'ev-s2-landscape-vectors-c4', 'ev-s2-landscape-vectors-c5'], []),
      dg('ev-s2-landscape-vectors-dg3', 'Catchment contamination risk', ['ev-s2-landscape-vectors-c6'], ['Water & Hydrology']),
    ],
    completionGate:
      'Landscape context and vector survey complete. Planning environment and contamination risks identified.',
    actHandoff: 'Landscape Context & Vector Survey Package',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'ev-s3-water-yield',
    stratumId: 's3-systems-reading',
    ref: 'EV-S3.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of water yield vs. population demand',
    shortTitle: 'Water yield vs. population demand',
    focusedQuestion:
      'Is there sufficient water available on this site to sustain the intended population across all seasons - and what is the seasonal gap?',
    checklist: [
      ck(
        'ev-s3-water-yield-c1',
        'Calculate total water demand for intended population - domestic, food production, animals, fire protection',
        { feeds: ['s4-water-strategy'] },
      ),
      ck(
        'ev-s3-water-yield-c2',
        'Assess all available water source yields across dry and wet seasons',
        { feeds: ['s4-water-strategy'] },
      ),
      ck('ev-s3-water-yield-c3', 'Map seasonal supply and demand curves - identify gap periods', {
        feeds: ['s4-water-strategy'],
      }),
      ck('ev-s3-water-yield-c4', 'Assess water quality for domestic and food production use'),
      ck('ev-s3-water-yield-c5', 'Identify storage requirements to bridge seasonal gaps', {
        feeds: ['s5-water-infrastructure'],
      }),
      ck('ev-s3-water-yield-c6', 'Define maximum population supportable by available water', {
        feeds: ['ev-s4-settlement-strategy'],
      }),
    ],
    decisionGroups: [
      dg('ev-s3-water-yield-dg1', 'Demand vs. source yield', ['ev-s3-water-yield-c1', 'ev-s3-water-yield-c2'], ['Water & Hydrology']),
      dg('ev-s3-water-yield-dg2', 'Seasonal gap & quality', ['ev-s3-water-yield-c3', 'ev-s3-water-yield-c4'], ['Water & Hydrology']),
      dg('ev-s3-water-yield-dg3', 'Storage & population ceiling', ['ev-s3-water-yield-c5', 'ev-s3-water-yield-c6'], ['Water & Hydrology']),
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
    title: 'A clear read of waste & nutrient cycling capacity',
    shortTitle: 'Waste & nutrient cycling capacity',
    focusedQuestion:
      'Can this site absorb communal waste streams - sewage, grey water, organic waste - at intended population density without ecological degradation?',
    checklist: [
      ck(
        'ev-s3-waste-cycling-c1',
        'Estimate sewage and grey water volumes at intended population density',
        { feeds: ['ev-s5-sanitation-waste'] },
      ),
      ck(
        'ev-s3-waste-cycling-c2',
        'Assess soil percolation and treatment capacity for on-site waste processing',
        { feeds: ['ev-s5-sanitation-waste'] },
      ),
      ck(
        'ev-s3-waste-cycling-c3',
        'Identify setback requirements from water sources for waste systems',
        { feeds: ['ev-s5-sanitation-waste'] },
      ),
      ck(
        'ev-s3-waste-cycling-c4',
        'Assess composting and organic waste processing capacity required',
        { feeds: ['ev-s5-sanitation-waste'] },
      ),
      ck('ev-s3-waste-cycling-c5', 'Map available land area for waste treatment systems'),
      ck('ev-s3-waste-cycling-c6', 'Identify regulatory requirements for communal waste systems'),
    ],
    decisionGroups: [
      dg('ev-s3-waste-cycling-dg1', 'Waste volumes & treatment capacity', ['ev-s3-waste-cycling-c1', 'ev-s3-waste-cycling-c2'], []),
      dg('ev-s3-waste-cycling-dg2', 'Setbacks & composting capacity', ['ev-s3-waste-cycling-c3', 'ev-s3-waste-cycling-c4'], []),
      dg('ev-s3-waste-cycling-dg3', 'Land area & regulation', ['ev-s3-waste-cycling-c5', 'ev-s3-waste-cycling-c6'], []),
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
    title: 'A clear read of energy generation & distribution potential',
    shortTitle: 'Energy generation & distribution potential',
    focusedQuestion:
      'What energy can this site generate - solar, wind, hydro, biomass - and how can it be distributed communally to all dwellings?',
    checklist: [
      ck(
        'ev-s3-energy-potential-c1',
        'Assess solar generation potential - roof area, ground-mount zones, shading analysis',
        { feeds: ['ev-s5-energy-system'], mode: 'Capacity calc' },
      ),
      ck(
        'ev-s3-energy-potential-c2',
        'Assess wind generation potential - speed, consistency, regulatory constraints',
        { mode: 'Capacity calc' },
      ),
      ck('ev-s3-energy-potential-c3', 'Assess micro-hydro potential if running water present', {
        mode: 'Assessment',
      }),
      ck('ev-s3-energy-potential-c4', 'Assess biomass and wood fuel production capacity', {
        mode: 'Capacity calc',
      }),
      ck(
        'ev-s3-energy-potential-c5',
        'Estimate total community energy demand for intended population',
        { feeds: ['ev-s5-energy-system'], mode: 'Capacity calc' },
      ),
      ck(
        'ev-s3-energy-potential-c6',
        'Map distribution infrastructure requirements - grid connection, battery storage, micro-grid',
        { feeds: ['ev-s5-energy-system'], mode: 'Strategic choice' },
      ),
    ],
    decisionGroups: [
      dg('ev-s3-energy-potential-dg1', 'Solar & wind potential', ['ev-s3-energy-potential-c1', 'ev-s3-energy-potential-c2'], ['Climate & Sectors']),
      dg('ev-s3-energy-potential-dg2', 'Hydro & biomass potential', ['ev-s3-energy-potential-c3', 'ev-s3-energy-potential-c4'], []),
      dg('ev-s3-energy-potential-dg3', 'Demand & distribution', ['ev-s3-energy-potential-c5', 'ev-s3-energy-potential-c6'], []),
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
    title: 'A clear read of communal infrastructure condition',
    shortTitle: 'Communal infrastructure condition',
    focusedQuestion:
      'What shared buildings, roads, utilities, and systems already exist on the site - and what is their condition and reuse potential?',
    checklist: [
      ck(
        'ev-s3-infra-condition-c1',
        'Inventory all existing communal or shared buildings with condition assessment',
        { feeds: ['ev-s4-infra-strategy', 'ev-s6-maintenance-protocol'], mode: 'Inventory' },
      ),
      ck(
        'ev-s3-infra-condition-c2',
        'Assess structural integrity and code compliance of existing buildings',
        { mode: 'Assessment' },
      ),
      ck(
        'ev-s3-infra-condition-c3',
        'Record existing utility infrastructure - water, power, drainage, communications',
        { mode: 'Inventory' },
      ),
      ck(
        'ev-s3-infra-condition-c4',
        'Assess road and track condition for communal vehicle and pedestrian use',
        { mode: 'Assessment' },
      ),
      ck(
        'ev-s3-infra-condition-c5',
        'Identify reuse, renovation, or demolition requirements for each existing element',
        { feeds: ['ev-s4-infra-strategy', 'ev-s5-communal-systems'], mode: 'Strategic choice' },
      ),
    ],
    decisionGroups: [
      dg('ev-s3-infra-condition-dg1', 'Existing buildings condition', ['ev-s3-infra-condition-c1', 'ev-s3-infra-condition-c2'], ['Infrastructure & Access']),
      dg('ev-s3-infra-condition-dg2', 'Utilities & access', ['ev-s3-infra-condition-c3', 'ev-s3-infra-condition-c4'], ['Infrastructure & Access']),
      dg('ev-s3-infra-condition-dg3', 'Reuse decisions', ['ev-s3-infra-condition-c5'], []),
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
    title: 'A clear phased settlement strategy',
    shortTitle: 'Phased settlement strategy',
    focusedQuestion:
      'Who moves in when, under what conditions, and what infrastructure must be ready before each household cohort arrives?',
    scopeNotes:
      'Habitability thresholds are hard gates. Moving households onto the land before potable water, weathertight shelter, sanitation, and emergency communications are confirmed creates welfare and legal risk. No cohort moves until their threshold is fully met.',
    checklist: [
      ck(
        'ev-s4-settlement-strategy-c1',
        'Define founding cohort - who moves in during Phase 1 and under what criteria',
        { feeds: ['ev-s7-settlement-plan'], mode: 'Cohort definition' },
      ),
      ck(
        'ev-s4-settlement-strategy-c2',
        'Define infrastructure habitability threshold per cohort - what must be complete before each group arrives',
        { feeds: ['ev-s7-settlement-plan', 'ev-s7-launch-sequence'], mode: 'Habitability gates' },
      ),
      ck(
        'ev-s4-settlement-strategy-c3',
        'Sequence subsequent cohort arrivals against infrastructure completion milestones',
        { mode: 'Arrival sequence' },
      ),
      ck(
        'ev-s4-settlement-strategy-c4',
        'Define trial residency period before full membership for each new household',
        { feeds: ['ev-s7-onboarding'], mode: 'Trial residency' },
      ),
      ck(
        'ev-s4-settlement-strategy-c5',
        'Establish maximum population per phase aligned with carrying capacity',
        { mode: 'Carrying capacity' },
      ),
      ck(
        'ev-s4-settlement-strategy-c6',
        'Define go/no-go criteria for each settlement phase - hard gates, not aspirational targets',
        { feeds: ['ev-s7-settlement-plan', 'ev-s7-launch-sequence'], mode: 'Go/no-go gates' },
      ),
    ],
    decisionGroups: [
      dg('ev-s4-settlement-strategy-dg1', 'Cohort definition & thresholds', ['ev-s4-settlement-strategy-c1', 'ev-s4-settlement-strategy-c2'], []),
      dg('ev-s4-settlement-strategy-dg2', 'Sequencing & trial residency', ['ev-s4-settlement-strategy-c3', 'ev-s4-settlement-strategy-c4'], []),
      dg('ev-s4-settlement-strategy-dg3', 'Population & go/no-go gates', ['ev-s4-settlement-strategy-c5', 'ev-s4-settlement-strategy-c6'], []),
    ],
    completionGate:
      'Phased settlement strategy approved. Habitability thresholds defined as hard gates for each cohort arrival. Founding group consensus confirmed.',
    actHandoff: 'Phased Settlement Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Cohort arrivals against the habitability-threshold gates', frequency: 'per cohort arrival' },
        { metric: 'Population per phase vs. the carrying-capacity ceiling', frequency: 'per phase' },
        { metric: 'Trial-residency completion before full membership', frequency: 'per applicant' },
      ],
      triggers: [
        'A cohort approaching arrival before its habitability threshold is met -> hold the move until the gate passes',
        'Phase population approaching the carrying-capacity ceiling -> pause further arrivals and reassess capacity',
        'Trial residency repeatedly bypassed -> reinstate the trial gate before membership',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'ev-s4-infra-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'EV-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound communal infrastructure strategy',
    shortTitle: 'Communal infrastructure strategy',
    focusedQuestion:
      'What shared infrastructure will be built communally, in what sequence, and how will it be governed and maintained?',
    checklist: [
      ck(
        'ev-s4-infra-strategy-c1',
        'Define communal infrastructure list - kitchen, meeting hall, workshop, water system, energy grid, sanitation',
        { feeds: ['ev-s5-communal-systems', 'ev-s7-launch-sequence'] },
      ),
      ck(
        'ev-s4-infra-strategy-c2',
        'Prioritise communal infrastructure by Phase 1 habitability requirements',
        { feeds: ['s7-phase1'] },
      ),
      ck(
        'ev-s4-infra-strategy-c3',
        'Define ownership and maintenance governance for each communal asset',
        { feeds: ['ev-s6-maintenance-protocol'] },
      ),
      ck(
        'ev-s4-infra-strategy-c4',
        'Define cost-sharing model for communal infrastructure construction and maintenance',
        { feeds: ['ev-s7-financial-plan'] },
      ),
      ck(
        'ev-s4-infra-strategy-c5',
        'Resolve conflicts between communal infrastructure investment and individual dwelling needs',
      ),
      ck(
        'ev-s4-infra-strategy-c6',
        'Confirm the infrastructure list against Stratum 3 reuse, renovation, and demolition decisions for existing structures',
      ),
    ],
    decisionGroups: [
      dg('ev-s4-infra-strategy-dg1', 'Infrastructure list & priority', ['ev-s4-infra-strategy-c1', 'ev-s4-infra-strategy-c2', 'ev-s4-infra-strategy-c6'], []),
      dg('ev-s4-infra-strategy-dg2', 'Ownership & cost-sharing', ['ev-s4-infra-strategy-c3', 'ev-s4-infra-strategy-c4'], []),
      dg('ev-s4-infra-strategy-dg3', 'Communal vs. individual balance', ['ev-s4-infra-strategy-c5'], []),
    ],
    completionGate:
      'Communal infrastructure strategy approved. Priority list, governance, and cost-sharing model confirmed.',
    actHandoff: 'Communal Infrastructure Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Communal infrastructure delivery against the Phase 1 priority list', frequency: 'monthly' },
        { metric: 'Maintenance currency for each communal asset', frequency: 'per asset, monthly' },
        { metric: 'Cost-share contributions against the agreed model', frequency: 'per contribution cycle' },
      ],
      triggers: [
        'A Phase 1 habitability asset slipping behind schedule -> re-prioritise resources to it',
        'A communal asset falling behind on maintenance -> assign and fund the maintenance obligation',
        'Cost-share contributions falling short -> review the cost base within permitted channels',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'ev-s4-housing-cluster',
    stratumId: 's4-foundation-decisions',
    ref: 'EV-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A coherent housing cluster & private zone framework',
    shortTitle: 'Housing cluster & private zone framework',
    focusedQuestion:
      'How will housing clusters be sited, and how will private household space be protected within communal land?',
    checklist: [
      ck(
        'ev-s4-housing-cluster-c1',
        'Define cluster sizes and maximum dwelling density per cluster',
        { feeds: ['ev-s5-cluster-layout'] },
      ),
      ck(
        'ev-s4-housing-cluster-c2',
        'Define private zone boundary for each dwelling type - outdoor space, garden, privacy screening',
        { feeds: ['ev-s5-cluster-layout'] },
      ),
      ck(
        'ev-s4-housing-cluster-c3',
        'Define shared transitional zones between private and communal areas',
        { feeds: ['ev-s5-cluster-layout'] },
      ),
      ck(
        'ev-s4-housing-cluster-c4',
        'Establish design standards for dwelling interface with communal space',
        { feeds: ['ev-s5-cluster-layout'] },
      ),
      ck(
        'ev-s4-housing-cluster-c5',
        'Confirm cluster framework against zone allocation and carrying capacity',
      ),
    ],
    decisionGroups: [
      dg('ev-s4-housing-cluster-dg1', 'Cluster density & private zones', ['ev-s4-housing-cluster-c1', 'ev-s4-housing-cluster-c2'], []),
      dg('ev-s4-housing-cluster-dg2', 'Transitional zones & standards', ['ev-s4-housing-cluster-c3', 'ev-s4-housing-cluster-c4'], []),
      dg('ev-s4-housing-cluster-dg3', 'Capacity confirmation', ['ev-s4-housing-cluster-c5'], []),
    ],
    completionGate:
      'Housing cluster and private zone framework approved. Density, privacy, and transitional zone standards confirmed.',
    actHandoff: 'Housing Cluster & Private Zone Framework Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Dwelling density per cluster vs. the agreed maximum', frequency: 'per cluster' },
        { metric: 'Private-zone boundary integrity for each dwelling', frequency: 'per dwelling, seasonal' },
        { metric: 'Communal-private interface adherence to design standards', frequency: 'seasonal' },
      ],
      triggers: [
        'Cluster density approaching or exceeding the maximum -> halt further siting in that cluster',
        'A private-zone boundary eroded by communal encroachment -> reinstate the boundary and screening',
        'Dwelling-to-communal interface departing from design standards -> bring it back to standard',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'ev-s4-food-system',
    stratumId: 's4-foundation-decisions',
    ref: 'EV-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound community food system strategy',
    shortTitle: 'Community food system strategy',
    focusedQuestion:
      'How will food be produced and distributed across this community - communal growing, individual plots, or hybrid - and how does this connect to the provision balance decided in Stratum 1?',
    checklist: [
      ck(
        'ev-s4-food-system-c1',
        'Confirm food system approach from Stratum 1 provision balance - communal, individual, or hybrid',
        { mode: 'Confirmation' },
      ),
      ck(
        'ev-s4-food-system-c2',
        'Define communal food production commitments - crops, volume, labour contribution model',
        { feeds: ['ev-s5-food-zones'], mode: 'Crop commitments' },
      ),
      ck(
        'ev-s4-food-system-c3',
        'Define individual plot allocation - size, location, tenure, maintenance obligations',
        { feeds: ['ev-s5-food-zones'], mode: 'Plot register' },
      ),
      ck(
        'ev-s4-food-system-c4',
        'Define food sharing and distribution protocol for communal harvests',
        { feeds: ['ev-s6-coordination-feedback'], mode: 'Distribution' },
      ),
      ck(
        'ev-s4-food-system-c5',
        'Define seed saving, variety selection, and food sovereignty strategy',
        { mode: 'Seed sovereignty' },
      ),
      ck('ev-s4-food-system-c6', 'Establish food system governance - decisions, labour, disputes', {
        mode: 'Food governance',
      }),
    ],
    decisionGroups: [
      dg('ev-s4-food-system-dg1', 'Production approach & commitments', ['ev-s4-food-system-c1', 'ev-s4-food-system-c2'], []),
      dg('ev-s4-food-system-dg2', 'Plot allocation & distribution', ['ev-s4-food-system-c3', 'ev-s4-food-system-c4'], []),
      dg('ev-s4-food-system-dg3', 'Sovereignty & governance', ['ev-s4-food-system-c5', 'ev-s4-food-system-c6'], []),
    ],
    completionGate:
      'Community food system strategy approved. Production model, allocation, and governance confirmed.',
    actHandoff: 'Community Food System Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Communal food production against committed crop volumes and labour', frequency: 'per season' },
        { metric: 'Individual plot maintenance against allocation obligations', frequency: 'per plot, seasonal' },
        { metric: 'Fairness of communal-harvest distribution across households', frequency: 'per harvest' },
      ],
      triggers: [
        'Communal production falling below committed volumes -> review the labour-contribution model',
        'Plots left unmaintained against obligation -> review the allocation and tenure terms',
        'Distribution falling unevenly across households -> review the sharing protocol',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'ev-s4-financial-model',
    stratumId: 's4-foundation-decisions',
    ref: 'EV-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A sound financial contribution & shared economics model',
    shortTitle: 'Financial contribution & shared economics model',
    focusedQuestion:
      "How will members contribute financially to communal infrastructure, ongoing costs, and the community's economic health?",
    scopeNotes:
      'All Stratum 5 infrastructure design gates on this financial model being confirmed. Do not proceed to design without it.',
    checklist: [
      ck(
        'ev-s4-financial-model-c1',
        'Define member buy-in contribution - amount, payment schedule, what it covers',
        { feeds: ['ev-s7-financial-plan'], mode: 'Buy-in' },
      ),
      ck(
        'ev-s4-financial-model-c2',
        'Define ongoing communal cost contributions - monthly or annual levy structure',
        { mode: 'Levy structure' },
      ),
      ck(
        'ev-s4-financial-model-c3',
        'Define communal fund governance - how funds are held, authorised, and audited',
        { mode: 'Fund governance' },
      ),
      ck(
        'ev-s4-financial-model-c4',
        'Define financial hardship protocol - how the community supports members in difficulty',
        { mode: 'Hardship protocol' },
      ),
      ck(
        'ev-s4-financial-model-c5',
        'Define capital reserve strategy - how the community saves for major infrastructure renewal',
        { feeds: ['ev-s7-financial-plan'], mode: 'Reserves' },
      ),
      ck(
        'ev-s4-financial-model-c6',
        'Confirm financial model is agreed by all founding members before any construction begins',
        { mode: 'Member agreement' },
      ),
      ck(
        'ev-s4-financial-model-c7',
        'Confirm communal fund governance follows the Stratum 1 financial governance rules - holding, authorisation, and reporting',
      ),
    ],
    decisionGroups: [
      dg('ev-s4-financial-model-dg1', 'Member buy-in & levies', ['ev-s4-financial-model-c1', 'ev-s4-financial-model-c2'], []),
      dg('ev-s4-financial-model-dg2', 'Fund governance & hardship', ['ev-s4-financial-model-c3', 'ev-s4-financial-model-c4', 'ev-s4-financial-model-c7'], []),
      dg('ev-s4-financial-model-dg3', 'Reserves & member agreement', ['ev-s4-financial-model-c5', 'ev-s4-financial-model-c6'], []),
    ],
    completionGate:
      'Financial contribution model approved and agreed by all founding members. Communal fund governance confirmed.',
    actHandoff: 'Financial Contribution & Shared Economics Model Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Member contributions vs. plan across permitted capital channels', frequency: 'per contribution cycle' },
        { metric: 'Operating cost-recovery ratio for communal costs', frequency: 'monthly' },
        { metric: 'Capital-reserve balance against the renewal plan', frequency: 'quarterly' },
      ],
      triggers: [
        'Contributions falling short of operating-cost recovery -> review the cost base and the permitted-channel mix',
        'A cost overrun against the financial model -> re-baseline and re-prioritise',
        'Contribution burden falling unevenly across households -> review the hardship protocol and fairness',
      ],
      feeds: 'economics-capacity',
    },
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'ev-s5-cluster-layout',
    stratumId: 's5-system-design',
    ref: 'EV-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed housing clusters & private dwelling zones',
    shortTitle: 'Housing clusters & private dwelling zones',
    focusedQuestion:
      'How will housing clusters be physically laid out - orientation, spacing, privacy, shared transitions - to serve both communal connection and household privacy?',
    checklist: [
      ck(
        'ev-s5-cluster-layout-c1',
        'Design cluster layout for each housing zone - dwelling orientation, spacing, shared edges',
        { feeds: ['s7-phase1'] },
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
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ev-s5-cluster-layout-c5',
        'Design acoustic and visual screening between clusters and between clusters and communal hub',
      ),
      ck(
        'ev-s5-cluster-layout-c6',
        'Confirm cluster layouts against fire egress and emergency access requirements',
      ),
      ck(
        'ev-s5-cluster-layout-c7',
        'Confirm total dwelling counts across clusters stay within the Stratum 2 maximum sustainable population',
      ),
    ],
    decisionGroups: [
      dg('ev-s5-cluster-layout-dg1', 'Cluster & private zone layout', ['ev-s5-cluster-layout-c1', 'ev-s5-cluster-layout-c2', 'ev-s5-cluster-layout-c7'], []),
      dg('ev-s5-cluster-layout-dg2', 'Shared spaces & dwelling standards', ['ev-s5-cluster-layout-c3', 'ev-s5-cluster-layout-c4'], []),
      dg('ev-s5-cluster-layout-dg3', 'Screening & egress', ['ev-s5-cluster-layout-c5', 'ev-s5-cluster-layout-c6'], []),
    ],
    completionGate:
      'Housing cluster layouts approved. Privacy zones, transitional spaces, and dwelling standards confirmed.',
    actHandoff: 'Housing Cluster Layout Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 housing cluster and private zone framework (ev-s4-housing-cluster).',
    monitoringProtocol: {
      indicators: [
        { metric: 'Dwelling condition across each built cluster - weathertightness, structural integrity, energy performance', frequency: 'per cluster, seasonal' },
        { metric: 'Private outdoor zone integrity per dwelling - screening, planting, and boundary held', frequency: 'per dwelling, seasonal' },
        { metric: 'Shared transitional spaces in working condition and used as designed', frequency: 'seasonal' },
      ],
      triggers: [
        'A cluster showing dwelling deterioration or failing energy performance -> schedule repair and review the dwelling standard',
        'A private zone eroded by communal encroachment or neglect -> reinstate the boundary and screening',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'ev-s5-communal-systems',
    stratumId: 's5-system-design',
    ref: 'EV-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Working communal infrastructure systems',
    shortTitle: 'Communal infrastructure systems',
    focusedQuestion:
      'How will shared buildings and communal facilities be designed to serve the whole community?',
    checklist: [
      ck(
        'ev-s5-communal-systems-c1',
        'Design communal kitchen and dining facility - capacity, equipment, layout',
        { feeds: ['ev-s6-maintenance-protocol', 's7-phase1'] },
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
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ev-s5-communal-systems-c6',
        'Confirm communal building designs are financially achievable within Stratum 4 model',
      ),
      ck(
        'ev-s5-communal-systems-c7',
        'Confirm communal building designs against Stratum 3 reuse and renovation decisions for existing structures',
      ),
    ],
    decisionGroups: [
      dg('ev-s5-communal-systems-dg1', 'Kitchen & meeting hall', ['ev-s5-communal-systems-c1', 'ev-s5-communal-systems-c2'], ['Infrastructure & Access']),
      dg('ev-s5-communal-systems-dg2', 'Workshop & service facilities', ['ev-s5-communal-systems-c3', 'ev-s5-communal-systems-c4'], ['Infrastructure & Access']),
      dg('ev-s5-communal-systems-dg3', 'Materials & financial fit', ['ev-s5-communal-systems-c5', 'ev-s5-communal-systems-c6', 'ev-s5-communal-systems-c7'], []),
    ],
    completionGate:
      'Communal infrastructure systems design approved. All shared buildings specified and financially confirmed.',
    actHandoff: 'Communal Infrastructure Systems Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 communal infrastructure strategy (ev-s4-infra-strategy).',
    monitoringProtocol: {
      indicators: [
        { metric: 'Communal kitchen and dining facility function against designed capacity', frequency: 'monthly' },
        { metric: 'Meeting hall, workshop, and shared service facilities in working condition and available', frequency: 'monthly' },
        { metric: 'Maintenance currency for each communal building against its protocol', frequency: 'per building, monthly' },
      ],
      triggers: [
        'A communal facility unable to meet its designed capacity -> review usage load and equipment provision',
        'A communal building falling behind on maintenance -> assign and fund the maintenance obligation',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'ev-s5-sanitation-waste',
    stratumId: 's5-system-design',
    ref: 'EV-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed communal sanitation & waste systems',
    shortTitle: 'Communal sanitation & waste systems',
    focusedQuestion:
      'How will sewage, grey water, and organic waste be managed safely across the community at intended population density?',
    checklist: [
      ck(
        'ev-s5-sanitation-waste-c1',
        'Design sewage treatment system - composting toilets, biodigester, constructed wetland, or connection to municipal system',
        { feeds: ['ev-s6-maintenance-protocol', 's7-phase1', 'ev-s7-launch-sequence'] },
      ),
      ck('ev-s5-sanitation-waste-c2', 'Design grey water collection, treatment, and reuse network'),
      ck(
        'ev-s5-sanitation-waste-c7',
        'Confirm treatment capacity against the Stratum 3 waste volumes and soil treatment capacity findings',
      ),
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
    decisionGroups: [
      dg('ev-s5-sanitation-waste-dg1', 'Sewage & grey water', ['ev-s5-sanitation-waste-c1', 'ev-s5-sanitation-waste-c2', 'ev-s5-sanitation-waste-c7'], []),
      dg('ev-s5-sanitation-waste-dg2', 'Organic waste & recycling', ['ev-s5-sanitation-waste-c3', 'ev-s5-sanitation-waste-c4'], []),
      dg('ev-s5-sanitation-waste-dg3', 'Setbacks & compliance', ['ev-s5-sanitation-waste-c5', 'ev-s5-sanitation-waste-c6'], []),
    ],
    completionGate:
      'Communal sanitation and waste systems design approved. All components specified and regulatory compliance confirmed.',
    actHandoff: 'Communal Sanitation & Waste Systems Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 communal infrastructure strategy (ev-s4-infra-strategy), which lists the communal sanitation system.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Sewage and grey water treatment throughput against design capacity at current population', frequency: 'monthly' },
        { metric: 'Effluent and grey water quality against treatment and reuse standards', frequency: 'monthly, lab test' },
        { metric: 'Organic waste processing and recycling throughput against generated volumes', frequency: 'monthly' },
      ],
      triggers: [
        'Treatment throughput approaching design capacity at current population -> stage capacity expansion before the ceiling is reached',
        'Effluent or grey water quality breaching standard -> halt reuse and remediate the treatment train',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'ev-s5-energy-system',
    stratumId: 's5-system-design',
    ref: 'EV-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working communal energy system',
    shortTitle: 'Communal energy system',
    focusedQuestion:
      'How will community-scale energy generation, storage, and distribution be designed to serve all dwellings and communal facilities?',
    checklist: [
      ck(
        'ev-s5-energy-system-c1',
        'Design primary generation system - solar array, wind, micro-hydro, or hybrid',
        { feeds: ['ev-s6-maintenance-protocol', 's7-phase1', 'ev-s7-launch-sequence'] },
      ),
      ck('ev-s5-energy-system-c2', 'Design battery or thermal storage capacity'),
      ck(
        'ev-s5-energy-system-c7',
        'Confirm generation and storage sizing against the Stratum 3 energy demand and generation potential assessment',
      ),
      ck(
        'ev-s5-energy-system-c3',
        'Design micro-grid distribution network to all dwellings and communal buildings',
        { feeds: ['s7-resource-plan'] },
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
    decisionGroups: [
      dg('ev-s5-energy-system-dg1', 'Generation & storage', ['ev-s5-energy-system-c1', 'ev-s5-energy-system-c2', 'ev-s5-energy-system-c7'], []),
      dg('ev-s5-energy-system-dg2', 'Distribution & metering', ['ev-s5-energy-system-c3', 'ev-s5-energy-system-c4'], []),
      dg('ev-s5-energy-system-dg3', 'Backup & financial fit', ['ev-s5-energy-system-c5', 'ev-s5-energy-system-c6'], []),
    ],
    completionGate:
      'Communal energy system design approved. Generation, storage, and distribution specified and financially confirmed.',
    actHandoff: 'Communal Energy System Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 communal infrastructure strategy (ev-s4-infra-strategy), which lists the communal energy grid.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Generation output against demand across dwellings and communal facilities', frequency: 'monthly' },
        { metric: 'Battery or thermal storage state of charge and reserve margin', frequency: 'monthly' },
        { metric: 'Micro-grid reliability - outage frequency and duration across the network', frequency: 'logged as events occur' },
      ],
      triggers: [
        'Generation falling short of demand or storage reserve running low -> shed non-essential load and review generation sizing',
        'Micro-grid outages recurring on a segment -> inspect and repair that distribution segment',
      ],
      feeds: 'energy-resources',
    },
  }),
  obj({
    id: 'ev-s5-food-zones',
    stratumId: 's5-system-design',
    ref: 'EV-S5.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Well-designed community food production zones',
    shortTitle: 'Community food production zones',
    focusedQuestion:
      'How will communal gardens, individual plots, orchard, food forest, and shared food infrastructure be physically designed and allocated?',
    checklist: [
      ck(
        'ev-s5-food-zones-c1',
        'Design communal growing areas - bed layout, access paths, irrigation, tool storage',
        { feeds: ['s7-phase1', 'ev-s7-launch-sequence'] },
      ),
      ck(
        'ev-s5-food-zones-c2',
        'Design individual plot allocation - sizes, boundaries, access, water points',
      ),
      ck(
        'ev-s5-food-zones-c7',
        'Confirm growing area allocation against the Stratum 2 food production potential estimate for the intended population',
      ),
      ck(
        'ev-s5-food-zones-c3',
        'Design orchard and food forest zones - species placement, access, harvest paths',
      ),
      ck('ev-s5-food-zones-c4', 'Design seed saving and nursery area'),
      ck(
        'ev-s5-food-zones-c5',
        'Design food storage and processing infrastructure - cool room, drying shed, preserving kitchen',
        { feeds: ['s7-resource-plan'] },
      ),
      ck(
        'ev-s5-food-zones-c6',
        'Confirm food production zone design against community food system strategy',
      ),
    ],
    decisionGroups: [
      dg('ev-s5-food-zones-dg1', 'Communal growing & plots', ['ev-s5-food-zones-c1', 'ev-s5-food-zones-c2', 'ev-s5-food-zones-c7'], []),
      dg('ev-s5-food-zones-dg2', 'Orchard & nursery zones', ['ev-s5-food-zones-c3', 'ev-s5-food-zones-c4'], ['Vegetation & Succession']),
      dg('ev-s5-food-zones-dg3', 'Storage & strategy fit', ['ev-s5-food-zones-c5', 'ev-s5-food-zones-c6'], []),
    ],
    completionGate:
      'Community food production zone design approved. All growing areas, plots, and food infrastructure specified.',
    actHandoff: 'Community Food Production Zone Design Package',
    buildsOnDisplay:
      'Builds on the Stratum 4 community food system strategy (ev-s4-food-system).',
    monitoringProtocol: {
      indicators: [
        { metric: 'Communal growing area harvest volumes against the production potential estimate', frequency: 'per season' },
        { metric: 'Individual plot occupancy and cultivation against allocation', frequency: 'per plot, seasonal' },
        { metric: 'Food storage and processing infrastructure in working order - cool room, drying shed, preserving kitchen', frequency: 'seasonal' },
      ],
      triggers: [
        'Communal harvest volumes falling below the production estimate -> review bed layout, irrigation, and growing practice',
        'Storage or processing infrastructure failing -> repair before harvest spoilage occurs',
      ],
      feeds: 'plants-food',
    },
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'ev-s6-social-monitoring',
    stratumId: 's6-integration-design',
    ref: 'EV-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A working community health & social fabric monitor',
    shortTitle: 'Community health & social fabric monitor',
    focusedQuestion:
      'How will the community track its social health over time - governance function, conflict frequency, member satisfaction, and financial wellbeing?',
    checklist: [
      ck(
        'ev-s6-social-monitoring-c1',
        'Define social health indicators - meeting attendance, decision-making quality, conflict frequency, member satisfaction',
        { feeds: ['ev-s7-adaptive-management'] },
      ),
      ck(
        'ev-s6-social-monitoring-c2',
        'Define financial health indicators - communal fund levels, arrears, capital reserve status',
      ),
      ck(
        'ev-s6-social-monitoring-c7',
        'Baseline social health indicators against the Stratum 1 founding group cohesion and relationship findings',
      ),
      ck(
        'ev-s6-social-monitoring-c3',
        'Design regular community check-in process - format, frequency, facilitation',
      ),
      ck('ev-s6-social-monitoring-c4', 'Design anonymous feedback mechanism for sensitive issues'),
      ck(
        'ev-s6-social-monitoring-c5',
        'Define escalation pathway when social health indicators deteriorate',
        { feeds: ['ev-s7-adaptive-management'] },
      ),
      ck('ev-s6-social-monitoring-c6', 'Specify record-keeping system for community health data'),
    ],
    decisionGroups: [
      dg('ev-s6-social-monitoring-dg1', 'Social & financial indicators', ['ev-s6-social-monitoring-c1', 'ev-s6-social-monitoring-c2', 'ev-s6-social-monitoring-c7'], []),
      dg('ev-s6-social-monitoring-dg2', 'Check-in & feedback process', ['ev-s6-social-monitoring-c3', 'ev-s6-social-monitoring-c4'], []),
      dg('ev-s6-social-monitoring-dg3', 'Escalation & record-keeping', ['ev-s6-social-monitoring-c5', 'ev-s6-social-monitoring-c6'], []),
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
    title: 'A sound communal infrastructure maintenance protocol',
    shortTitle: 'Communal infrastructure maintenance protocol',
    focusedQuestion:
      'How will shared infrastructure be maintained over time - who does what, how often, funded by whom?',
    checklist: [
      ck(
        'ev-s6-maintenance-protocol-c1',
        'Define maintenance schedule for each communal infrastructure system',
        { feeds: ['ev-s7-adaptive-management'] },
      ),
      ck(
        'ev-s6-maintenance-protocol-c2',
        'Assign maintenance responsibility - rotating roster, dedicated roles, contracted services',
      ),
      ck(
        'ev-s6-maintenance-protocol-c3',
        'Define maintenance fund contribution and reserve requirements',
        { feeds: ['ev-s7-financial-plan'] },
      ),
      ck('ev-s6-maintenance-protocol-c4', 'Design inspection and condition reporting system'),
      ck(
        'ev-s6-maintenance-protocol-c6',
        'Set inspection baselines from the Stratum 3 communal infrastructure condition survey',
      ),
      ck(
        'ev-s6-maintenance-protocol-c5',
        'Define escalation process for urgent or major maintenance needs',
      ),
    ],
    decisionGroups: [
      dg('ev-s6-maintenance-protocol-dg1', 'Schedule & responsibility', ['ev-s6-maintenance-protocol-c1', 'ev-s6-maintenance-protocol-c2'], []),
      dg('ev-s6-maintenance-protocol-dg2', 'Funding & inspection', ['ev-s6-maintenance-protocol-c3', 'ev-s6-maintenance-protocol-c4', 'ev-s6-maintenance-protocol-c6'], []),
      dg('ev-s6-maintenance-protocol-dg3', 'Escalation', ['ev-s6-maintenance-protocol-c5'], []),
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
    title: 'Working communal coordination & household feedback protocols',
    shortTitle: 'Communal coordination & household feedback protocols',
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
        { feeds: ['ev-s7-adaptive-management'] },
      ),
      ck(
        'ev-s6-coordination-feedback-c6',
        'Confirm decision triggers operate through the Stratum 1 decision-making process and community agreements',
      ),
    ],
    decisionGroups: [
      dg('ev-s6-coordination-feedback-dg1', 'Energy & water cascades', ['ev-s6-coordination-feedback-c1', 'ev-s6-coordination-feedback-c2'], []),
      dg('ev-s6-coordination-feedback-dg2', 'Food sharing & communication', ['ev-s6-coordination-feedback-c3', 'ev-s6-coordination-feedback-c4'], []),
      dg('ev-s6-coordination-feedback-dg3', 'Decision triggers', ['ev-s6-coordination-feedback-c5', 'ev-s6-coordination-feedback-c6'], []),
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
    title: 'A working external relations & compliance monitor',
    shortTitle: 'External relations & compliance monitor',
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
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'ev-s6-external-relations-c7',
        'Ground engagement priorities in the Stratum 2 planning environment and prior community context findings',
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
      ck('ev-s6-external-relations-c6', 'Define annual community external relations review', {
        feeds: ['ev-s7-adaptive-management'],
      }),
    ],
    decisionGroups: [
      dg('ev-s6-external-relations-dg1', 'Neighbour & planning monitoring', ['ev-s6-external-relations-c1', 'ev-s6-external-relations-c2', 'ev-s6-external-relations-c7'], []),
      dg('ev-s6-external-relations-dg2', 'Spokesperson & complaints', ['ev-s6-external-relations-c3', 'ev-s6-external-relations-c4'], []),
      dg('ev-s6-external-relations-dg3', 'Authority relationship & review', ['ev-s6-external-relations-c5', 'ev-s6-external-relations-c6'], []),
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
    title: 'A ready phased settlement implementation plan',
    shortTitle: 'Phased settlement implementation plan',
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
        'ev-s7-settlement-plan-c6',
        'Confirm scheduled cohort sizes keep total population within the Stratum 2 maximum sustainable population',
      ),
      ck(
        'ev-s7-settlement-plan-c5',
        'Define who enforces habitability thresholds - not self-reported by arriving households',
      ),
    ],
    decisionGroups: [
      dg('ev-s7-settlement-plan-dg1', 'Cohort & habitability items', ['ev-s7-settlement-plan-c1', 'ev-s7-settlement-plan-c2'], []),
      dg('ev-s7-settlement-plan-dg2', 'Arrival criteria & scheduling', ['ev-s7-settlement-plan-c3', 'ev-s7-settlement-plan-c4', 'ev-s7-settlement-plan-c6'], []),
      dg('ev-s7-settlement-plan-dg3', 'Threshold enforcement', ['ev-s7-settlement-plan-c5'], []),
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
    title: 'A sound communal financial plan & contribution schedule',
    shortTitle: 'Communal financial plan & contribution schedule',
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
        'ev-s7-financial-plan-c6',
        'Confirm fund holding and reporting follow the Stratum 1 financial governance rules',
      ),
      ck(
        'ev-s7-financial-plan-c5',
        'Confirm all founding member contributions are committed before construction begins',
      ),
    ],
    decisionGroups: [
      dg('ev-s7-financial-plan-dg1', 'Capital requirement & schedule', ['ev-s7-financial-plan-c1', 'ev-s7-financial-plan-c2'], []),
      dg('ev-s7-financial-plan-dg2', 'Fund structure & reporting', ['ev-s7-financial-plan-c3', 'ev-s7-financial-plan-c4', 'ev-s7-financial-plan-c6'], []),
      dg('ev-s7-financial-plan-dg3', 'Contribution commitment', ['ev-s7-financial-plan-c5'], []),
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
    title: 'A clear enterprise sequencing & launch order',
    shortTitle: 'Enterprise sequencing & launch order',
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
      ck(
        'ev-s7-launch-sequence-c6',
        'Confirm the launch order covers every communal infrastructure commitment from the Stratum 1 provision balance',
      ),
    ],
    decisionGroups: [
      dg('ev-s7-launch-sequence-dg1', 'Water & sanitation sequencing', ['ev-s7-launch-sequence-c1', 'ev-s7-launch-sequence-c2'], []),
      dg('ev-s7-launch-sequence-dg2', 'Energy & go/no-go', ['ev-s7-launch-sequence-c3', 'ev-s7-launch-sequence-c4'], []),
      dg('ev-s7-launch-sequence-dg3', 'Plan alignment', ['ev-s7-launch-sequence-c5', 'ev-s7-launch-sequence-c6'], []),
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
    title: 'A sound membership onboarding & integration protocol',
    shortTitle: 'Membership onboarding & integration protocol',
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
      ck(
        'ev-s7-onboarding-c6',
        'Include the Stratum 1 community agreements and dispute resolution pathway in new member orientation',
      ),
      ck('ev-s7-onboarding-c5', 'Define mentorship or buddy system for new household integration'),
    ],
    decisionGroups: [
      dg('ev-s7-onboarding-dg1', 'Application & trial', ['ev-s7-onboarding-c1', 'ev-s7-onboarding-c2'], []),
      dg('ev-s7-onboarding-dg2', 'Membership & orientation', ['ev-s7-onboarding-c3', 'ev-s7-onboarding-c4', 'ev-s7-onboarding-c6'], []),
      dg('ev-s7-onboarding-dg3', 'Mentorship', ['ev-s7-onboarding-c5'], []),
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
    title: 'A sound adaptive management protocol',
    shortTitle: 'Adaptive management protocol',
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
    decisionGroups: [
      dg('ev-s7-adaptive-management-dg1', 'Annual review & triggers', ['ev-s7-adaptive-management-c1', 'ev-s7-adaptive-management-c2'], []),
      dg('ev-s7-adaptive-management-dg2', 'Escalation & documentation', ['ev-s7-adaptive-management-c3', 'ev-s7-adaptive-management-c4'], []),
      dg('ev-s7-adaptive-management-dg3', '5-year review', ['ev-s7-adaptive-management-c5'], []),
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
    title: 'A sound member exit & land succession protocol',
    shortTitle: 'Member exit & land succession protocol',
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
        'ev-s7-exit-succession-c6',
        'Confirm land reversion and dissolution terms against the Stratum 1 legal entity and tenure model',
      ),
      ck(
        'ev-s7-exit-succession-c5',
        'Obtain legal review of exit and succession protocol before any member moves on-site',
      ),
    ],
    decisionGroups: [
      dg('ev-s7-exit-succession-dg1', 'Exit & dwelling transfer', ['ev-s7-exit-succession-c1', 'ev-s7-exit-succession-c2'], []),
      dg('ev-s7-exit-succession-dg2', 'Land reversion & dissolution', ['ev-s7-exit-succession-c3', 'ev-s7-exit-succession-c4', 'ev-s7-exit-succession-c6'], []),
      dg('ev-s7-exit-succession-dg3', 'Legal review', ['ev-s7-exit-succession-c5'], []),
    ],
    completionGate:
      'Exit and succession protocol approved with legal review confirmed. All founding members acknowledge and sign before moving on-site.',
    actHandoff: 'Member Exit & Land Succession Protocol',
  }),
];

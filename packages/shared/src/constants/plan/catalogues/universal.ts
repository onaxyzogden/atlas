// catalogues/universal.ts
//
// The 20 Universal objectives - present in every project regardless of type
// (OLOS Project-Type + Secondary-Layer Spec v1.2, section 4; 's1-steward' added
// 2026-06-16 by the Tier-0 Declaration restructure, splitting the team/capacity
// concerns out of 's1-vision'). Content is
// transcribed verbatim from the RegenFarm Objective Catalogue v1.3, which is
// the designated ANCHOR catalogue: its universal-slot objectives are the
// validated canonical baseline shared across all primary types.
//
// Per spec section 4 the objective SLOT is universal while checklist depth may
// adapt by type; type-specific universal overrides are a fan-out concern and
// are not yet authored, so every primary currently resolves against this
// baseline. The 11 not-yet-encoded primaries therefore render universal-only.
//
// Decision groups (Decision Groups Reference v1.0; spec section 9.3-9.4):
// group `label` + per-group item COUNT + `observeFeeds` labels are transcribed
// VERBATIM from the reference doc's RegenFarm section (the designated anchor;
// the doc's universal rows are repeated per type section and RF carries the
// real labels, whereas later sections fall back to generic placeholders). The
// doc gives only per-group item COUNTS, not explicit item ids, and its counts
// predate the 19-universal checklists (systemic ~+1 drift in code). Per the
// 2026-05-31 operator override, `itemIds` membership is AUTHORED here:
// items are assigned to the doc's verbatim groups by semantic fit while
// respecting each group's item count, drift-extra items go to the
// semantically-closest group, and the union is a full mutually-exclusive
// partition of the objective's checklist (every item in exactly one group).
// The doc's `-` (no feed) is encoded as `[]`; its `Multiple` sentinel is kept
// literally; feeds are display-only chips (NOT wired to divergence routing).
//
// Id scheme: t<tier>-<slug> for the objective; <objId>-c<n> for items, except
// the three Tier-0 declaration items the visionProfileToChecklist bridge targets
// (s1-vision-c1 / s1-vision-c2 / s1-steward-c6) and the semantic slugs
// (s1-vision-constraints, s1-vision-classify, s1-vision-assumptions,
// s1-steward-c5 [labour]) which keep stable ids. The 2026-06-16 restructure
// moved labour (was s1-vision-labour) -> s1-steward-c5 and capital (was
// s1-vision-c3) -> s1-steward-c6; persisted form/tick data is copy-forwarded by
// the actEvidenceStore + planStratumStore migrations. All ids are globally unique
// across catalogues (planTierStore.toProgressMap invariant) and verified by a
// catalogue conformance test. Decision-group ids follow <objId>-dg<n>.
//
// ASCII-only copy: em/en dashes from the source -> " - "/"-"; curly quotes
// -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, ckA, dg, obj } from './authoring.js';

export const UNIVERSAL_PLAN_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 's1-vision',
    stratumId: 's1-project-foundation',
    ref: 'U-S1.1',
    source: 'universal',
    title: 'A clear, bounded vision & declared intent',
    shortTitle: 'Vision & intent',
    focusedQuestion:
      'What is this project for, what does success look like, and what is non-negotiable?',
    checklist: [
      // Primary purpose was chosen as the project's primary TYPE in the
      // creation wizard (single-select from the prescribed taxonomy), so the
      // Act stage shows that selection read-only instead of re-asking in prose.
      ckA(
        's1-vision-c1',
        'Define the primary purpose and land use type for this project',
        {
          fieldType: 'single_select',
          optionSetId: 'projectPrimaryType',
          sourceField: 'projectTypeRecord.primaryTypeId',
          editRoute: { kind: 'plan-type' },
        },
      ),
      // Success criteria map to the Vision Builder's chosen primary outcomes.
      ckA(
        's1-vision-c2',
        'Define 3-5 measurable success criteria for the first planning cycle',
        {
          fieldType: 'multi_select',
          optionSetId: 'visionPrimaryOutcomes',
          sourceField: 'visionProfile.primaryOutcomes',
          editRoute: { kind: 'wizard-step', step: 'vision' },
        },
      ),
      // Primary steward + co-stewards were named in the creation wizard's Team
      // step; show that roster read-only here instead of re-asking. Optional -
      // an unset team falls through to a plain checkbox without dragging
      // required progress. The steward answerSpec auto-satisfies via
      // computeEffectiveProgress independently of the legacy
      // deriveStratum1StewardshipMap bridge, so it reaches per-type projects.
      {
        ...ckA(
          's1-vision-steward',
          'Confirm the primary steward and any co-stewards for this project',
          {
            fieldType: 'steward',
            sourceField: ['team.primarySteward', 'team.coStewards'],
            editRoute: { kind: 'wizard-step', step: 'team' },
          },
        ),
        optional: true,
      },
      // Labour + capital inventory moved to the new 's1-steward' objective
      // (Tier-0 restructure 2026-06-16) - they belong to the team, not the
      // vision. See s1-steward-c5 (labour) and s1-steward-c6 (capital).
      ck('s1-vision-constraints', 'Identify non-negotiables and hard constraints', {
        feeds: ['s4-direction', 's7-risk-register'],
      }),
      ck('s1-vision-classify', 'Classify vision elements as committed vs. aspirational', {
        feeds: ['s4-direction'],
      }),
      ck('s1-vision-assumptions', 'Record assumptions and known unknowns', {
        feeds: ['s4-direction', 's7-risk-register'],
      }),
    ],
    decisionGroups: [
      dg('s1-vision-dg1', 'Purpose & intent', [
        's1-vision-c1',
        's1-vision-c2',
        's1-vision-steward',
        's1-vision-classify',
      ]),
      dg('s1-vision-dg2', 'Constraints & assumptions', [
        's1-vision-constraints',
        's1-vision-assumptions',
      ]),
    ],
    completionGate:
      'A bounded, evidence-grounded vision is approved with clear success criteria and constraints documented. This declaration becomes the lens for all land reading in Tiers 1-2.',
    actHandoff: 'Vision & Intent Brief',
  }),
  // 0.2 - The canonical Steward/Team Object (Tier-0 restructure 2026-06-16).
  // Split out of s1-vision so the system asks about PEOPLE and RESOURCES
  // separately from PURPOSE. Every downstream objective that asks "who will do
  // this?" or "do we have capacity?" references this register - it is never
  // re-elicited (the Tier-6 capacity match compares plan-derived demand against
  // this supply baseline). prerequisiteObjectiveIds:['s1-vision'] - the intent
  // declaration is the lens, so the team is constituted against a declared
  // intent. s1-steward also joins STRATUM_PREREQS['s2-land-reading'] (universal
  // gate). c1 roster + c6 capital reuse the wizard answerSpecs and auto-satisfy;
  // c5 (labour) re-homes the old s1-vision-labour feeds.
  obj({
    id: 's1-steward',
    stratumId: 's1-project-foundation',
    ref: 'U-S1.4',
    source: 'universal',
    prerequisiteObjectiveIds: ['s1-vision'],
    title: 'A constituted steward team & capability register',
    shortTitle: 'Steward team & capability',
    focusedQuestion:
      'Who is doing this work, in what roles, with what decision rights and what capabilities?',
    checklist: [
      // Roster reuses the wizard team answerSpec (same as s1-vision-steward).
      // Optional - an unset team falls through to a plain checkbox without
      // dragging required progress; auto-satisfies via computeEffectiveProgress.
      {
        ...ckA(
          's1-steward-c1',
          'List all people contributing to this project - resident and non-resident, primary and supporting',
          {
            fieldType: 'steward',
            sourceField: ['team.primarySteward', 'team.coStewards'],
            editRoute: { kind: 'wizard-step', step: 'team' },
          },
        ),
        optional: true,
      },
      // People & roles (Phase-4 consolidation 2026-06-28): the free-text "team
      // role" input was replaced by the standardized operational-role pills (each
      // member's default domain focus across Plan / Act / Observe) plus on-site
      // presence, absorbing the retired standalone c9 item. The pills write to
      // the *membership* (project_members.operational_roles), so this item stays
      // always-recordable (residency / presence satisfy it) and never gates the
      // objective -- preserving the ADR 2026-06-24 "never gates" guarantee.
      ck(
        's1-steward-c2',
        'Assign each person an operational role - the default domain focus carried across Plan, Act, and Observe - plus on-site presence',
        { feeds: ['s4-direction'] },
      ),
      ck(
        's1-steward-c3',
        'Assign decision rights by domain - who has authority over what',
        { feeds: ['s4-direction'] },
      ),
      ck(
        's1-steward-c4',
        'Inventory capabilities by domain for each contributor - what skills each person brings',
        { feeds: ['s4-direction', 's7-resource-plan'] },
      ),
      // Labour re-homes the old s1-vision-labour feeds verbatim.
      ck(
        's1-steward-c5',
        'Record available labour by person - hours per week and seasonal variation across the year',
        { feeds: ['s4-direction', 's7-resource-plan'] },
      ),
      // Capital band = the Vision Builder budget + timeline bands (both axes
      // required to count as answered - the rule the legacy s1-vision-c3 held).
      ckA(
        's1-steward-c6',
        'Record available capital - initial budget, annual operating budget, and funding sources',
        {
          fieldType: 'band',
          sourceField: ['visionProfile.budgetRange', 'visionProfile.timelineProgress'],
          editRoute: { kind: 'wizard-step', step: 'vision' },
        },
      ),
      ck(
        's1-steward-c7',
        'Identify skill gaps and resolution priorities - training, hire, or contract',
        { feeds: ['s7-resource-plan', 's7-risk-register'] },
      ),
      ck(
        's1-steward-c8',
        'Note the governance principles and decision-making framework that will govern the team',
        { feeds: ['s4-direction'] },
      ),
      // (The standalone operational-roles item c9 from ADR 2026-06-24 was retired
      // on 2026-06-28: its pills were folded into the People & roles capture c2
      // above, so the duplicate item is gone. Operational roles remain
      // non-gating -- they live on the membership, not this checklist.)
    ],
    decisionGroups: [
      dg('s1-steward-dg1', 'People & roles', [
        's1-steward-c1',
        's1-steward-c2',
        's1-steward-c3',
      ]),
      dg('s1-steward-dg2', 'Capability & resources', [
        's1-steward-c4',
        's1-steward-c5',
        's1-steward-c6',
      ]),
      dg('s1-steward-dg3', 'Gaps & governance', [
        's1-steward-c7',
        's1-steward-c8',
      ]),
    ],
    completionGate:
      'Steward team fully constituted. Roles, decision rights, capabilities, labour availability, and capital inventory documented. This record is the canonical people reference for all downstream objectives - it is never re-asked.',
    actHandoff: 'Steward Team & Capability Register',
  }),
  obj({
    id: 's1-boundaries',
    stratumId: 's1-project-foundation',
    ref: 'U-S1.2',
    source: 'universal',
    title: 'Establish site boundaries & legal constraints',
    shortTitle: 'Site boundaries & legal constraints',
    focusedQuestion:
      'What are the legal, physical, and regulatory boundaries within which this project must operate?',
    checklist: [
      // Group 1 -- Title & boundary
      ck('s1-boundaries-c2', 'Map property boundaries on base layer', {
        feeds: ['s4-zones'],
      }),
      ck(
        's1-boundaries-c1',
        'Obtain and verify current title and deed documents',
        {
          feeds: ['s4-direction'],
          feedNote:
            'Title documents feed Plan: Land Base & Legal Context. No design work proceeds where title is unverified.',
        },
      ),
      // Group 2 -- Legal & permit obligations
      ck(
        's1-boundaries-c3',
        'Identify all easements, rights of way, and encumbrances',
        {
          feeds: ['s4-zones', 's7-risk-register'],
          feedHint: 'Feeds Plan: Land use constraint map',
          feedNote:
            'Mapped easements feed Plan: Land use constraint map and the Risk / Compliance overlay.',
        },
      ),
      ck('s1-boundaries-c4', 'Check zoning and permitted land uses', {
        feeds: ['s4-direction', 's7-risk-register'],
        feedHint: 'Feeds Plan: Risk / Compliance overlay',
        feedNote:
          'Zoning status feeds Plan: Risk / Compliance overlay. Permitted uses inform enterprise mix decisions in Tier 0.',
      }),
      ck('s1-boundaries-c5', 'Identify water rights and entitlements', {
        feeds: ['s4-water-strategy', 's5-water-infrastructure'],
        feedHint: 'Feeds Tier 2: Water strategy',
        feedNote:
          'Water entitlements feed Tier 2: Water strategy and constrain all water harvesting and storage design.',
      }),
      ck(
        's1-boundaries-c6',
        'Record covenant, heritage, or conservation obligations',
        {
          feeds: ['s4-zones', 's7-risk-register'],
          feedNote:
            'Covenants feed Plan: Risk / Compliance overlay as hard constraints that gate Act handoffs in affected zones.',
        },
      ),
      ck(
        's1-boundaries-c7',
        'Note required permits for planned activities - building, earthworks, water harvesting',
        {
          feeds: ['s7-phase1', 's7-risk-register'],
          feedNote:
            'Permit requirements become prerequisites on Act handoff packages in Tiers 3-6.',
        },
      ),
    ],
    decisionGroups: [
      dg('s1-boundaries-dg1', 'Title & boundary', [
        's1-boundaries-c2',
        's1-boundaries-c1',
      ]),
      dg('s1-boundaries-dg2', 'Legal & permit obligations', [
        's1-boundaries-c3',
        's1-boundaries-c4',
        's1-boundaries-c5',
        's1-boundaries-c6',
        's1-boundaries-c7',
      ]),
    ],
    completionGate:
      'All legal constraints and boundary conditions are mapped, recorded, and reviewed. No design work proceeds into areas of legal ambiguity.',
    actHandoff: 'Legal & Boundary Constraints Brief',
  }),
  obj({
    id: 's1-stakeholders',
    stratumId: 's1-project-foundation',
    ref: 'U-S1.3',
    source: 'universal',
    title: 'A mapped picture of stakeholders & community',
    shortTitle: 'Stakeholders & community',
    focusedQuestion:
      'Who has an interest in, connection to, or jurisdiction over this land and project - outside of the steward team itself?',
    checklist: [
      ck('s1-stakeholders-c1', 'Map immediate neighbours and shared boundary relationships', {
        feeds: ['s5-access'],
      }),
      ck('s1-stakeholders-c2', 'Identify local authority contacts and relevant officers'),
      ck(
        's1-stakeholders-c3',
        'Record any Indigenous land relationships or cultural obligations',
        { feeds: ['s4-zones', 's7-risk-register'] },
      ),
      ck(
        's1-stakeholders-c4',
        'Identify community members affected by or interested in the project',
      ),
      ck('s1-stakeholders-c5', 'Note existing conflict, goodwill, or partnership relationships', {
        feeds: ['s7-risk-register'],
      }),
      ck(
        's1-stakeholders-c6',
        'Record preferred communication channels for each stakeholder group',
        { feeds: ['s6-monitoring'] },
      ),
    ],
    decisionGroups: [
      dg('s1-stakeholders-dg1', 'Neighbours & authority', [
        's1-stakeholders-c1',
        's1-stakeholders-c2',
        's1-stakeholders-c3',
      ]),
      dg('s1-stakeholders-dg2', 'Networks & partnerships', [
        's1-stakeholders-c4',
        's1-stakeholders-c5',
        's1-stakeholders-c6',
      ]),
    ],
    completionGate:
      'Stakeholder map is complete. No known external relationships unrecorded.',
    actHandoff: 'Stakeholder Register',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 's2-terrain',
    stratumId: 's2-land-reading',
    ref: 'U-S2.1',
    source: 'universal',
    title: 'A clear read of terrain & topography',
    shortTitle: 'Terrain & topography',
    focusedQuestion:
      'What does the terrain of this land tell us -- about where water flows, where sun falls, what the slopes afford and constrain, and where permanent work should and should not happen?',
    checklist: [
      ck(
        's2-terrain-c1',
        'Produce or obtain topographic map with contour intervals appropriate to scale',
        { feeds: ['s4-zones', 's5-access', 's5-water-infrastructure'] },
      ),
      ck('s2-terrain-c2', 'Identify slope gradients and aspects across the site', {
        feeds: ['s4-zones', 's5-access'],
      }),
      ck('s2-terrain-c3', 'Map elevation range and drainage divides', {
        feeds: ['s4-water-strategy', 's5-water-infrastructure'],
      }),
      ck('s2-terrain-c4', 'Identify flat areas, ridgelines, saddles, and hollows', {
        feeds: ['s4-zones', 's5-water-infrastructure'],
      }),
      ck('s2-terrain-c5', 'Note areas of instability, erosion, or landslip risk', {
        feeds: ['s5-access', 's5-soil-improvement'],
      }),
    ],
    decisionGroups: [
      dg(
        's2-terrain-dg1',
        'Landform & elevation',
        ['s2-terrain-c1', 's2-terrain-c3'],
        ['Terrain & Topography'],
      ),
      dg(
        's2-terrain-dg2',
        'Slope & drainage',
        ['s2-terrain-c2', 's2-terrain-c4'],
        ['Terrain & Topography'],
      ),
      dg('s2-terrain-dg3', 'Erosion risk', ['s2-terrain-c5'], ['Terrain & Topography']),
    ],
    completionGate: 'Full topographic survey complete. Landform map approved.',
    actHandoff: 'Topographic Survey Package',
    observeOutput: 'Terrain & Topography Survey Record',
    intentLens: [
      {
        typeId: 'regenerative_farm',
        text: 'Read terrain for productive zone allocation -- which slopes and aspects support which enterprises, and where permanent work should and should not happen',
      },
      {
        typeId: 'silvopasture',
        text: 'Read terrain for natural livestock movement paths, topographic shelter, and paddock boundaries that work with gravity',
      },
      {
        typeId: 'residential',
        text: 'Read terrain for candidate habitation zones -- solar aspect, natural shelter, drainage away from the dwelling, accessible without crossing enterprise zones',
      },
    ],
  }),
  obj({
    id: 's2-climate',
    stratumId: 's2-land-reading',
    ref: 'U-S2.2',
    source: 'universal',
    title: 'A clear read of climate & sectors',
    shortTitle: 'Climate & sectors',
    focusedQuestion:
      'What are the sun, wind, rain, frost, fire, and noise patterns across this land -- and what do they mean for where different activities can and cannot thrive?',
    checklist: [
      ck('s2-climate-c1', 'Record annual and seasonal rainfall averages and variability', {
        feeds: ['s4-water-strategy', 's5-water-infrastructure'],
      }),
      ck('s2-climate-c2', 'Map prevailing wind directions by season', { feeds: ['s4-zones'] }),
      ck('s2-climate-c3', 'Record temperature range, frost dates, and heat event frequency', {
        feeds: ['s4-zones'],
      }),
      ck('s2-climate-c4', 'Map sun angles and shade zones by season', { feeds: ['s4-zones'] }),
      ck('s2-climate-c5', 'Identify fire risk sectors and direction', { feeds: ['s4-zones'] }),
      ck('s2-climate-c6', 'Note microclimate variations across the site', { feeds: ['s4-zones'] }),
    ],
    decisionGroups: [
      dg(
        's2-climate-dg1',
        'Rainfall & temperature',
        ['s2-climate-c1', 's2-climate-c3', 's2-climate-c6'],
        ['Climate & Sectors'],
      ),
      dg(
        's2-climate-dg2',
        'Wind, sun & fire sectors',
        ['s2-climate-c2', 's2-climate-c4', 's2-climate-c5'],
        ['Climate & Sectors'],
      ),
    ],
    completionGate:
      'Climate and sector data recorded and mapped. All major sectors identified.',
    actHandoff: 'Climate & Sector Survey Package',
    observeOutput: 'Climate & Sector Survey Record',
    intentLens: [
      {
        typeId: 'regenerative_farm',
        text: 'Read climate for enterprise suitability -- which zones support which crops, which sectors constrain access or activity windows',
      },
      {
        typeId: 'silvopasture',
        text: 'Read wind patterns for winter shelter placement and prevailing cold exposure in paddock zones',
      },
      {
        typeId: 'residential',
        text: 'Read wind and solar conditions at candidate habitation zones -- how exposed or sheltered is each zone across seasons',
      },
    ],
  }),
  obj({
    id: 's2-ecology',
    stratumId: 's2-land-reading',
    ref: 'U-S2.3',
    source: 'universal',
    title: 'A clear read of existing ecology & habitat',
    shortTitle: 'Existing ecology & habitat',
    focusedQuestion:
      'What living systems are already at work on this land -- what species, what relationships, what ecological processes -- and what do they reveal about the health, history, and potential of this land?',
    checklist: [
      ck('s2-ecology-c1', 'Record existing vegetation communities by zone', { feeds: ['s4-zones'] }),
      ck('s2-ecology-c2', 'Identify native and invasive species present', { feeds: ['s4-zones'] }),
      ck('s2-ecology-c3', 'Note wildlife corridors, nesting sites, and movement patterns', {
        feeds: ['s4-zones', 's5-access'],
      }),
      ck('s2-ecology-c4', 'Assess habitat connectivity to surrounding landscape', {
        feeds: ['s4-zones'],
      }),
      ck('s2-ecology-c5', 'Record water-dependent habitat areas', {
        feeds: ['s4-water-strategy', 's5-water-infrastructure'],
      }),
    ],
    decisionGroups: [
      dg(
        's2-ecology-dg1',
        'Vegetation communities',
        ['s2-ecology-c1', 's2-ecology-c2'],
        ['Ecology & Habitat'],
      ),
      dg(
        's2-ecology-dg2',
        'Species & habitat',
        ['s2-ecology-c3', 's2-ecology-c4', 's2-ecology-c5'],
        ['Ecology & Habitat'],
      ),
    ],
    completionGate:
      'Ecological survey complete. All habitat types and significant species recorded.',
    actHandoff: 'Ecological Survey Package',
    observeOutput: 'Ecology & Habitat Survey Record',
    intentLens: [
      {
        typeId: 'regenerative_farm',
        text: 'Read ecology for baseline biodiversity, existing habitat assets, and species that indicate land condition',
      },
      {
        typeId: 'silvopasture',
        text: 'Read ecology for forage species composition, browse potential, and grazing pressure history encoded in the plant community',
      },
      {
        typeId: 'residential',
        text: 'Read ecology near candidate habitation zones for conditions that affect liveability -- wildlife attractants, seasonal pest vectors, flooding risk indicators',
      },
    ],
  }),
  obj({
    id: 's2-infrastructure',
    stratumId: 's2-land-reading',
    ref: 'U-S2.4',
    source: 'universal',
    title: 'A clear read of existing infrastructure & access',
    shortTitle: 'Existing infrastructure & access',
    focusedQuestion:
      'What built infrastructure exists on this land -- roads, buildings, fences, water systems, utilities -- and what does it tell us about what this land has been used for and what it can support?',
    checklist: [
      ck('s2-infrastructure-c1', 'Map all existing roads, tracks, and pathways', {
        feeds: ['s5-access'],
      }),
      ck(
        's2-infrastructure-c2',
        'Record all existing buildings and structures with condition assessment',
        { feeds: ['s4-zones'] },
      ),
      ck('s2-infrastructure-c3', 'Map utility services - water, power, communications, waste', {
        feeds: ['s4-water-strategy', 's4-zones'],
      }),
      ck('s2-infrastructure-c4', 'Identify legal access points and access constraints', {
        feeds: ['s5-access'],
      }),
      ck('s2-infrastructure-c5', 'Record existing fencing and boundary structures', {
        feeds: ['s4-zones'],
      }),
    ],
    decisionGroups: [
      dg(
        's2-infrastructure-dg1',
        'Roads & tracks',
        ['s2-infrastructure-c1', 's2-infrastructure-c4'],
        ['Infrastructure & Access'],
      ),
      dg(
        's2-infrastructure-dg2',
        'Buildings & services',
        ['s2-infrastructure-c2', 's2-infrastructure-c3', 's2-infrastructure-c5'],
        ['Infrastructure & Access'],
      ),
    ],
    completionGate: 'Full infrastructure inventory complete and mapped.',
    actHandoff: 'Infrastructure Survey Package',
    observeOutput: 'Infrastructure & Access Survey Record',
    intentLens: [
      {
        typeId: 'regenerative_farm',
        text: 'Read infrastructure for enterprise suitability -- what exists that can be repurposed, what constraints exist on access and utility',
      },
      {
        typeId: 'silvopasture',
        text: 'Read infrastructure for livestock handling capacity and existing paddock infrastructure condition',
      },
      {
        typeId: 'residential',
        text: 'Read infrastructure for residential conversion potential and domestic service availability relative to candidate habitation zones',
      },
    ],
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 's3-hydrology',
    stratumId: 's3-systems-reading',
    ref: 'U-S3.1',
    source: 'universal',
    title: 'A clear read of how water moves across the site',
    shortTitle: 'How water moves across the site',
    focusedQuestion: 'How does water move through and across this site?',
    checklist: [
      ck('s3-hydrology-c1', 'Map all surface water flows - seasonal and permanent', {
        feeds: ['s4-water-strategy', 's5-water-infrastructure'],
      }),
      ck('s3-hydrology-c2', 'Identify catchment areas and their contribution to site water', {
        feeds: ['s4-water-strategy', 's5-water-infrastructure'],
      }),
      ck('s3-hydrology-c3', 'Locate springs, seeps, and water table indicators', {
        feeds: ['s4-water-strategy', 's5-water-infrastructure'],
      }),
      ck('s3-hydrology-c4', 'Assess runoff patterns and infiltration rates by zone', {
        feeds: ['s5-water-infrastructure', 's5-soil-improvement'],
      }),
      ck('s3-hydrology-c5', 'Map existing drainage infrastructure and its performance', {
        feeds: ['s5-water-infrastructure'],
      }),
    ],
    decisionGroups: [
      dg(
        's3-hydrology-dg1',
        'Surface flows & catchment',
        ['s3-hydrology-c1', 's3-hydrology-c2', 's3-hydrology-c4'],
        ['Water & Hydrology'],
      ),
      dg(
        's3-hydrology-dg2',
        'Springs, infiltration & drainage',
        ['s3-hydrology-c3', 's3-hydrology-c5'],
        ['Water & Hydrology'],
      ),
    ],
    completionGate:
      'Hydrological survey complete. Water movement mapped across all seasons.',
    actHandoff: 'Hydrology Survey Package',
    observeOutput: 'Hydrology Survey Record',
    buildsOnDisplay:
      'Tier 1.1 Terrain & topography (terrain map guides water flow interpretation); Tier 1.5 Land health (degradation zones indicate altered water movement)',
    intentLens: [
      {
        typeId: 'regenerative_farm',
        text: 'Read water movement for harvest potential -- where can water be slowed, spread, and sunk to build soil moisture and recharge groundwater',
      },
      {
        typeId: 'silvopasture',
        text: 'Identify where water concentrates seasonally in paddock zones -- natural collection points that could support stock water storage with minimal earthworks',
      },
      {
        typeId: 'residential',
        text: 'Assess domestic water supply reliability and quality at candidate habitation zones; understand water table depth relative to dwelling footprint and waste systems',
      },
    ],
  }),
  obj({
    id: 's3-soil',
    stratumId: 's3-systems-reading',
    ref: 'U-S3.2',
    source: 'universal',
    title: 'A clear read of soil conditions & subsurface',
    shortTitle: 'Soil conditions & subsurface',
    focusedQuestion:
      'What are the soil characteristics and subsurface conditions across the site?',
    checklist: [
      ck(
        's3-soil-c1',
        'Conduct soil profile assessment at representative locations across site',
        { feeds: ['s5-soil-improvement'] },
      ),
      ck('s3-soil-c2', 'Record soil texture, structure, and colour by horizon', {
        feeds: ['s5-soil-improvement', 's5-water-infrastructure'],
      }),
      ck('s3-soil-c3', 'Test soil pH, organic matter, and basic nutrient levels', {
        feeds: ['s5-soil-improvement'],
      }),
      ck('s3-soil-c4', 'Assess drainage class and water retention characteristics', {
        feeds: ['s5-soil-improvement', 's5-water-infrastructure'],
      }),
      ck('s3-soil-c5', 'Map soil type variation across the site', {
        feeds: ['s4-zones', 's5-soil-improvement'],
      }),
    ],
    decisionGroups: [
      dg(
        's3-soil-dg1',
        'Profile & composition',
        ['s3-soil-c1', 's3-soil-c2'],
        ['Soil'],
      ),
      dg('s3-soil-dg2', 'Fertility & chemistry', ['s3-soil-c3'], ['Soil']),
      dg(
        's3-soil-dg3',
        'Physical assessment',
        ['s3-soil-c4', 's3-soil-c5'],
        ['Soil'],
      ),
    ],
    completionGate:
      'Soil survey complete. Profile assessments and test results recorded for all representative zones.',
    actHandoff: 'Soil Survey Package',
    observeOutput: 'Soil Survey Record',
    buildsOnDisplay:
      'Tier 1.5 Land health & degradation (degradation zones identify where soil profiling is most critical); Tier 1.1 Terrain (slope and drainage class inform soil type distribution)',
    intentLens: [
      {
        typeId: 'regenerative_farm',
        text: 'Read soil for remediation priorities and timeline -- what condition is each production zone in, and how long before it can support intended enterprises',
      },
      {
        typeId: 'silvopasture',
        text: 'Read soil for compaction legacy and recovery potential in future paddock zones -- particularly under historically grazed areas',
      },
      {
        typeId: 'residential',
        text: 'Read subsurface at candidate habitation zones for foundation bearing capacity, drainage capacity for septic, and groundwater depth',
      },
    ],
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 's4-direction',
    stratumId: 's4-foundation-decisions',
    ref: 'U-S4.1',
    source: 'universal',
    title: 'A confirmed, feasible project direction',
    shortTitle: 'Project direction',
    focusedQuestion:
      'Given all observed conditions, what version of this project should be planned?',
    checklist: [
      ck(
        's4-direction-c1',
        'Review Stratum 1 vision and enterprise mix against all survey findings',
      ),
      ck(
        's4-direction-c2',
        'Classify each vision element as feasible, conditional, deferred, or rejected',
        { feeds: ['s7-phase1'] },
      ),
      ck('s4-direction-c3', 'Identify minimum viable project scope for first planning cycle', {
        feeds: ['s7-phase1'],
      }),
      ck('s4-direction-c4', 'Define first-cycle success criteria', {
        feeds: ['s6-monitoring', 's7-phase1'],
      }),
      ck('s4-direction-c5', 'Record assumptions and unresolved questions', {
        feeds: ['s7-risk-register'],
      }),
      ck('s4-direction-c6', 'Approve bounded planning direction', {
        feeds: ['s7-phase1'],
      }),
    ],
    decisionGroups: [
      dg('s4-direction-dg1', 'Survey validation', [
        's4-direction-c1',
        's4-direction-c2',
        's4-direction-c5',
      ]),
      dg('s4-direction-dg2', 'Scope & first cycle', [
        's4-direction-c3',
        's4-direction-c4',
        's4-direction-c6',
      ]),
    ],
    completionGate:
      'Project direction confirmed. All vision elements classified. Planning direction approved.',
    actHandoff: 'Project Direction Brief',
    // 2026-06-17 Mode-4 restructure: retired in favour of Threshold 1 (The
    // Reality Check), which now performs the "confirm direction & feasibility"
    // synthesis upstream of the design strata. Kept DEFINED (its feedsInto
    // chips, evidence/Act-tool map keys, and Tier-0 workbench membership all
    // stay referentially valid) but excluded from resolution so it no longer
    // surfaces as a Strategic-Decisions objective. See STRATUM_PREREQS note.
    excludedFromResolution: true,
  }),
  obj({
    id: 's4-water-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'U-S4.2',
    source: 'universal',
    title: 'A sound, resilient water strategy',
    shortTitle: 'Water strategy',
    focusedQuestion:
      'How will this project collect, store, distribute, and conserve water?',
    checklist: [
      ck(
        's4-water-strategy-c1',
        'Assess total water demand across all enterprises and domestic use',
        { feeds: ['s5-water-infrastructure'] },
      ),
      ck(
        's4-water-strategy-c2',
        'Evaluate water source options - rainfall, groundwater, surface water, municipal',
        { feeds: ['s5-water-infrastructure'] },
      ),
      ck('s4-water-strategy-c3', 'Select primary and backup water supply strategy', {
        feeds: ['s5-water-infrastructure'],
      }),
      ck('s4-water-strategy-c4', 'Define storage capacity requirements', {
        feeds: ['s5-water-infrastructure'],
      }),
      ck('s4-water-strategy-c5', 'Select water harvesting approach appropriate to site', {
        feeds: ['s5-water-infrastructure'],
      }),
      ck(
        's4-water-strategy-c6',
        'Define water conservation priorities and drought response protocol',
        { feeds: ['s6-monitoring', 's7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg(
        's4-water-strategy-dg1',
        'Supply & storage',
        [
          's4-water-strategy-c1',
          's4-water-strategy-c2',
          's4-water-strategy-c3',
          's4-water-strategy-c4',
        ],
        ['Water & Hydrology'],
      ),
      dg(
        's4-water-strategy-dg2',
        'Conservation & drought',
        ['s4-water-strategy-c5', 's4-water-strategy-c6'],
        ['Water & Hydrology'],
      ),
    ],
    completionGate:
      'Water strategy approved. Supply, storage, and distribution approach defined for all enterprises.',
    actHandoff: 'Water Strategy Decision Brief',
    planningDirectionMandate:
      'Water strategy must address any Silvopasture conditional requirement -- the strategy is not complete until stock water infrastructure is confirmed as viable.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Soil moisture by zone', frequency: 'monthly (growing season)' },
        { metric: 'Dam/pond fill level', frequency: 'monthly' },
        { metric: 'Domestic supply volume', frequency: 'monthly' },
        {
          metric: 'Stock trough reliability',
          frequency: 'weekly during establishment',
        },
      ],
      triggers: [
        'Dam below 30% at spring equinox -> restrict irrigation allocation',
        'Domestic supply below household minimum -> review bore yield or augmentation options',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 's4-zones',
    stratumId: 's4-foundation-decisions',
    ref: 'U-S4.3',
    source: 'universal',
    title: 'A coherent spatial framework & zoning',
    shortTitle: 'Spatial framework & zoning',
    focusedQuestion:
      'How will this site be spatially organised to serve all project purposes efficiently?',
    checklist: [
      ck(
        's4-zones-c1',
        'Establish zone framework based on use frequency and energy requirements',
        { feeds: ['s5-access', 's5-soil-improvement'] },
      ),
      ck('s4-zones-c2', 'Define sector influences on zone placement', {
        feeds: ['s5-access'],
      }),
      ck('s4-zones-c3', 'Allocate enterprise zones based on survey findings', {
        feeds: ['s5-access', 's5-water-infrastructure', 's5-soil-improvement', 's7-phase1'],
      }),
      ck('s4-zones-c4', 'Resolve spatial conflicts between enterprises', {
        feeds: ['s5-access'],
      }),
      ck('s4-zones-c5', 'Define buffer zones and transition areas', {
        feeds: ['s5-access'],
      }),
      ck('s4-zones-c6', 'Confirm zone framework against capacity and feasibility constraints', {
        feeds: ['s7-phase1'],
      }),
    ],
    decisionGroups: [
      dg('s4-zones-dg1', 'Zone allocation', [
        's4-zones-c1',
        's4-zones-c2',
        's4-zones-c3',
        's4-zones-c6',
      ]),
      dg('s4-zones-dg2', 'Conflict resolution', ['s4-zones-c4', 's4-zones-c5']),
    ],
    completionGate:
      'Spatial framework approved. All enterprise zones allocated without unresolved conflict.',
    actHandoff: 'Zone Allocation Framework',
    monitoringProtocol: {
      indicators: [
        { metric: 'Zone boundary adherence', frequency: 'quarterly audit' },
        {
          metric: 'Residential boundary conflicts',
          frequency: 'logged as incursions occur',
        },
        { metric: 'Kitchen garden zone conditions', frequency: 'seasonal' },
      ],
      triggers: [
        'Repeated enterprise encroachment into residential zone -> formalize physical boundary marker',
        'Enterprise crowding kitchen garden -> review zone allocation',
      ],
      feeds: 'land-base',
    },
    // Surface the Zone & Circulation overview card (Z0-Z5 polygons + path
    // frequency validation + "open the map to draw" prompt) in this objective's
    // REFERENCE section, so the zones objective is no longer a dead-end and
    // points the steward at the seed-from-map + trim-to-parcel drawing flow.
    legacyCardSectionId: 'plan-zone-overview',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 's5-access',
    stratumId: 's5-system-design',
    ref: 'U-S5.1',
    source: 'universal',
    title: 'An efficient access & circulation design',
    shortTitle: 'Access & circulation design',
    focusedQuestion:
      'How will people, vehicles, and materials move through the farm efficiently and safely?',
    checklist: [
      ck(
        's5-access-c1',
        'Design primary vehicle access route from entry to all enterprise zones',
        { feeds: ['s7-phase1'] },
      ),
      ck('s5-access-c2', 'Define road and track standards for each use type', {
        feeds: ['s7-resource-plan'],
      }),
      ck('s5-access-c3', 'Design pedestrian pathways between key working areas'),
      ck('s5-access-c4', 'Resolve conflicts between vehicle, animal, and pedestrian movement'),
      ck('s5-access-c5', 'Specify turning radii and passing points for farm vehicles'),
    ],
    decisionGroups: [
      dg(
        's5-access-dg1',
        'Primary access',
        ['s5-access-c1', 's5-access-c2'],
        ['Infrastructure & Access'],
      ),
      dg(
        's5-access-dg2',
        'Internal circulation',
        ['s5-access-c3', 's5-access-c4', 's5-access-c5'],
        ['Infrastructure & Access'],
      ),
    ],
    completionGate:
      'Access and circulation design approved. All movement conflicts resolved.',
    actHandoff: 'Access & Circulation Design Package',
    buildsOnDisplay:
      'Builds on 3.2 -- Spatial framework & zones (zone layout determines access route structure).',
    monitoringProtocol: {
      indicators: [
        {
          metric: 'Track surface condition after wet events',
          frequency: 'monthly in wet season',
        },
        {
          metric: 'Laneway width adequacy for actual livestock operations',
          frequency: 'after first use',
        },
        {
          metric: 'Livestock stress points in the laneway network',
          frequency: 'observed during each movement',
        },
      ],
      triggers: [
        'Track surface failure after 25mm+ rain -> repair priority before the next wet event',
        'Livestock stress or bottleneck in a laneway -> review width, corner radius, or surface',
      ],
      feeds: 'access-circulation',
    },
  }),
  obj({
    id: 's5-water-infrastructure',
    stratumId: 's5-system-design',
    ref: 'U-S5.2',
    source: 'universal',
    title: 'A working water harvesting & storage system',
    shortTitle: 'Water harvesting & storage system',
    focusedQuestion:
      'How will water harvesting and storage infrastructure be designed to meet all project needs?',
    checklist: [
      ck(
        's5-water-infrastructure-c1',
        'Design primary water harvesting structures - dams, swales, tanks, ponds',
        { feeds: ['s7-phase1'] },
      ),
      ck('s5-water-infrastructure-c2', 'Specify storage capacity and locations'),
      ck(
        's5-water-infrastructure-c3',
        'Design distribution network - pipelines, gravity feeds, pumping systems',
        { feeds: ['s7-resource-plan'] },
      ),
      ck('s5-water-infrastructure-c4', 'Design emergency overflow and spillway infrastructure', {
        feeds: ['s7-risk-register'],
      }),
      ck('s5-water-infrastructure-c5', 'Specify materials and construction standards', {
        feeds: ['s7-resource-plan'],
      }),
    ],
    decisionGroups: [
      dg(
        's5-water-infrastructure-dg1',
        'Harvesting & storage',
        [
          's5-water-infrastructure-c1',
          's5-water-infrastructure-c2',
          's5-water-infrastructure-c5',
        ],
        ['Water & Hydrology'],
      ),
      dg(
        's5-water-infrastructure-dg2',
        'Distribution & overflow',
        ['s5-water-infrastructure-c3', 's5-water-infrastructure-c4'],
        ['Water & Hydrology'],
      ),
    ],
    completionGate:
      'Water infrastructure design approved. All harvesting, storage, and distribution components specified.',
    actHandoff: 'Water Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on 3.1 -- Water strategy (source, storage approach, and distribution strategy are pre-decided).',
    planningDirectionMandate:
      'This water infrastructure design CLOSES the Threshold 1 Silvopasture water conditional: once the stock-water distribution network is designed to every paddock trough and confirmed against the 2.5 Livestock Water Availability demand assessment, the conditional requirement raised at Tier 3 against silvopasture is formally resolved (display-only -- it records closure, it never gates).',
    monitoringProtocol: {
      indicators: [
        {
          metric: 'Dam/tank fill level as % capacity',
          frequency: 'monthly',
        },
        {
          metric: 'Days to refill after a 25mm rainfall event',
          frequency: 'logged per 25mm+ rainfall event',
        },
        {
          metric: 'Trough reliability (recorded empty events)',
          frequency: 'logged as events occur',
        },
        {
          metric: 'Domestic supply pressure and volume',
          frequency: 'monthly',
        },
        {
          metric: 'Overflow events (date and rainfall trigger)',
          frequency: 'logged as events occur',
        },
      ],
      triggers: [
        'Dam not reaching 75% capacity after two 25mm+ events -> investigate inlet, berm, or catchment',
        'Trough empty during operation -> check float valve, supply line, pump',
        'Domestic supply below minimum -> investigate bore, augment storage',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 's5-soil-improvement',
    stratumId: 's5-system-design',
    ref: 'U-S5.3',
    source: 'universal',
    title: 'A sound soil improvement strategy',
    shortTitle: 'Soil improvement strategy',
    focusedQuestion: 'How will soil health be improved across all enterprise zones?',
    checklist: [
      ck(
        's5-soil-improvement-c1',
        'Design soil improvement program by zone - composting, mulching, cover cropping',
        { feeds: ['s7-phase1'] },
      ),
      ck('s5-soil-improvement-c2', 'Specify application rates and timing for each zone', {
        feeds: ['s7-resource-plan'],
      }),
      ck('s5-soil-improvement-c3', 'Define machinery and equipment requirements', {
        feeds: ['s7-resource-plan'],
      }),
      ck('s5-soil-improvement-c4', 'Define priority zones for first-cycle improvement', {
        feeds: ['s7-phase1'],
      }),
      ck(
        's5-soil-improvement-c5',
        'Establish soil health monitoring baseline for improvement tracking',
        { feeds: ['s6-monitoring'] },
      ),
    ],
    decisionGroups: [
      dg(
        's5-soil-improvement-dg1',
        'Fertility inputs',
        [
          's5-soil-improvement-c1',
          's5-soil-improvement-c2',
          's5-soil-improvement-c3',
        ],
        ['Soil'],
      ),
      dg(
        's5-soil-improvement-dg2',
        'Biological enhancement',
        ['s5-soil-improvement-c4', 's5-soil-improvement-c5'],
        ['Soil'],
      ),
    ],
    completionGate: 'Soil improvement strategy designed and approved for all zones.',
    actHandoff: 'Soil Improvement Design Package',
    buildsOnDisplay:
      'Builds on 3.3 -- Fertility strategy (approach pre-decided) and Survey 2.2 -- Soil (baseline conditions by zone).',
    monitoringProtocol: {
      indicators: [
        {
          metric: 'Soil organic matter % by zone (lab test)',
          frequency: 'annual, same month each year',
        },
        {
          metric: 'Bulk density at 0-10cm and 10-20cm',
          frequency: 'biannual',
        },
        {
          metric: 'Cover crop establishment rate (% ground cover)',
          frequency: 'at 6 weeks post-sowing',
        },
        {
          metric: 'Earthworm counts per square metre',
          frequency: 'biannual, same locations',
        },
      ],
      triggers: [
        'Bulk density not improving after 18 months in a zone -> investigate mechanical compaction-breaking need',
        'Organic matter not improving in Year 2 -> review input rates and composition',
        'Cover crop failure -> investigate seeding timing, rate, or competition',
      ],
      feeds: 'soil',
    },
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 's6-monitoring',
    stratumId: 's6-integration-design',
    ref: 'U-S6.1',
    source: 'universal',
    title: 'A working monitoring & observation system',
    shortTitle: 'Monitoring & observation system',
    focusedQuestion:
      'How will the farm continuously read its own performance and feed that data back into Observe?',
    checklist: [
      ck('s6-monitoring-c1', 'Define key indicators to monitor across all enterprises', {
        feeds: ['s7-phase1'],
      }),
      ck('s6-monitoring-c2', 'Design data collection methods and recording systems', {
        feeds: ['s7-resource-plan'],
      }),
      ck('s6-monitoring-c3', 'Specify monitoring frequency by indicator'),
      ck('s6-monitoring-c4', 'Define responsibility for each monitoring stream', {
        feeds: ['s7-resource-plan'],
      }),
      ck(
        's6-monitoring-c5',
        'Define Observe feedback trigger points - when data initiates a Plan review',
        { feeds: ['s7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg(
        's6-monitoring-dg1',
        'Key indicators',
        ['s6-monitoring-c1', 's6-monitoring-c3'],
        ['Multiple'],
      ),
      dg(
        's6-monitoring-dg2',
        'Data collection & triggers',
        ['s6-monitoring-c2', 's6-monitoring-c4', 's6-monitoring-c5'],
        ['Multiple'],
      ),
    ],
    completionGate:
      'Monitoring system designed and approved. All indicators, methods, and responsibilities defined.',
    actHandoff: 'Monitoring & Observation System Design',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 's7-phase1',
    stratumId: 's7-phasing-resourcing',
    ref: 'U-S7.1',
    source: 'universal',
    title: 'A ready Phase 1 implementation plan',
    shortTitle: 'Phase 1 implementation plan',
    focusedQuestion:
      'What will be built, planted, and established in the first implementation cycle?',
    checklist: [
      ck(
        's7-phase1-c1',
        'Define Phase 1 scope - which enterprises and infrastructure are included',
      ),
      ck('s7-phase1-c2', 'Sequence Phase 1 tasks in logical implementation order'),
      ck('s7-phase1-c3', 'Assign responsibilities for each Phase 1 task'),
      ck('s7-phase1-c4', 'Define Phase 1 completion milestones'),
      ck('s7-phase1-c5', 'Confirm Phase 1 scope against capacity and resource plan'),
    ],
    decisionGroups: [
      dg('s7-phase1-dg1', 'Scope & sequence', [
        's7-phase1-c1',
        's7-phase1-c2',
        's7-phase1-c3',
      ]),
      dg('s7-phase1-dg2', 'Milestones & resources', [
        's7-phase1-c4',
        's7-phase1-c5',
      ]),
    ],
    completionGate:
      'Phase 1 implementation plan approved. Scope, sequence, responsibilities, and milestones confirmed.',
    actHandoff: 'Phase 1 Implementation Plan',
    progressTracking: {
      milestones: [
        { metric: 'Phase 1 milestone achievement vs. plan', cadence: 'monthly review' },
        {
          metric: 'Task completion vs. schedule',
          cadence: 'weekly during active implementation',
        },
        {
          metric:
            'Scope creep log -- any addition to Phase 1 scope must be approved and capacity-confirmed',
          cadence: 'per proposed addition',
        },
      ],
    },
  }),
  obj({
    id: 's7-resource-plan',
    stratumId: 's7-phasing-resourcing',
    ref: 'U-S7.2',
    source: 'universal',
    title: 'A realistic resource & capacity plan',
    shortTitle: 'Resource & capacity plan',
    focusedQuestion:
      'What labour, capital, equipment, and skills are required, and how will they be sourced?',
    checklist: [
      ck('s7-resource-plan-c1', 'Estimate labour requirements by task and season for Phase 1'),
      ck('s7-resource-plan-c2', 'Identify skill gaps and training or contractor requirements'),
      ck('s7-resource-plan-c3', 'Define equipment requirements and sourcing strategy'),
      ck('s7-resource-plan-c4', 'Estimate Phase 1 capital requirements by category'),
      ck('s7-resource-plan-c5', 'Define procurement priorities and sourcing plan'),
    ],
    decisionGroups: [
      dg('s7-resource-plan-dg1', 'Labour & skills', [
        's7-resource-plan-c1',
        's7-resource-plan-c2',
        's7-resource-plan-c3',
      ]),
      dg('s7-resource-plan-dg2', 'Capital & procurement', [
        's7-resource-plan-c4',
        's7-resource-plan-c5',
      ]),
    ],
    completionGate:
      'Resource and capacity plan approved. All Phase 1 requirements identified and sourcing strategy confirmed.',
    actHandoff: 'Resource & Capacity Plan',
    progressTracking: {
      milestones: [
        { metric: 'Labour hours deployed vs. estimated by task', cadence: 'monthly' },
        { metric: 'Expenditure vs. budget by category', cadence: 'monthly' },
        { metric: 'Contractor engagement vs. plan', cadence: 'as needed' },
      ],
    },
  }),
  obj({
    id: 's7-risk-register',
    stratumId: 's7-phasing-resourcing',
    ref: 'U-S7.3',
    source: 'universal',
    title: 'A complete risk & contingency register',
    shortTitle: 'Risk & contingency register',
    focusedQuestion:
      'What are the principal risks to Phase 1 success, and what are the contingency responses?',
    checklist: [
      ck('s7-risk-register-c1', 'Identify top 5-8 risks to Phase 1 implementation'),
      ck('s7-risk-register-c2', 'Assess likelihood and impact for each risk'),
      ck('s7-risk-register-c3', 'Define contingency response for each risk'),
      ck('s7-risk-register-c4', 'Identify early warning indicators for each risk'),
      ck('s7-risk-register-c5', 'Assign risk monitoring responsibility'),
    ],
    decisionGroups: [
      dg('s7-risk-register-dg1', 'Risk identification', [
        's7-risk-register-c1',
        's7-risk-register-c2',
        's7-risk-register-c4',
      ]),
      dg('s7-risk-register-dg2', 'Contingency & monitoring', [
        's7-risk-register-c3',
        's7-risk-register-c5',
      ]),
    ],
    completionGate:
      'Risk register approved. All principal risks identified with defined contingency responses.',
    actHandoff: 'Risk & Contingency Register',
    progressTracking: {
      milestones: [
        { metric: 'Risk status review', cadence: 'monthly' },
        {
          metric: 'Early warning indicators monitored as specified per risk',
          cadence: 'per risk, as specified',
        },
        {
          metric: 'Risk register updated when new risks emerge or status changes',
          cadence: 'on change',
        },
      ],
    },
  }),
];

const UNIVERSAL_BY_ID: ReadonlyMap<string, PlanStratumObjective> = new Map(
  UNIVERSAL_PLAN_OBJECTIVES.map((o) => [o.id, o]),
);

/** Look up a universal objective by id. */
export function findUniversalObjective(id: string): PlanStratumObjective | undefined {
  return UNIVERSAL_BY_ID.get(id);
}

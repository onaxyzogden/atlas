// catalogues/universal.ts
//
// The 19 Universal objectives - present in every project regardless of type
// (OLOS Project-Type + Secondary-Layer Spec v1.2, section 4). Content is
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
// the three Tier-0 vision items the visionProfileToChecklist bridge targets
// (s1-vision-c1 / s1-vision-c2 / s1-vision-c3) and two semantic slugs
// (s1-vision-labour, s1-vision-constraints, s1-vision-classify,
// s1-vision-assumptions) which keep stable ids. All ids are globally unique
// across catalogues (planTierStore.toProgressMap invariant) and verified by a
// catalogue conformance test. Decision-group ids follow <objId>-dg<n>.
//
// ASCII-only copy: em/en dashes from the source -> " - "/"-"; curly quotes
// -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj } from './authoring.js';

export const UNIVERSAL_PLAN_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 's1-vision',
    stratumId: 's1-project-foundation',
    ref: 'U-S1.1',
    source: 'universal',
    title: 'Define vision, goals & stewardship capacity',
    focusedQuestion:
      'What is this project for, what does success look like, and what resources does the steward have to work with?',
    checklist: [
      ck('s1-vision-c1', 'State the primary purpose of this land project in plain language'),
      ck('s1-vision-c2', 'Define 3-5 measurable success criteria for the first planning cycle'),
      ck(
        's1-vision-labour',
        'Inventory available labour - hours per week, seasonal variation, skill level',
      ),
      ck(
        's1-vision-c3',
        'Inventory available capital - initial budget and estimated annual operating budget',
      ),
      ck('s1-vision-constraints', 'Identify non-negotiables and hard constraints'),
      ck('s1-vision-classify', 'Classify vision elements as committed vs. aspirational'),
      ck('s1-vision-assumptions', 'Record assumptions and known unknowns'),
    ],
    decisionGroups: [
      dg('s1-vision-dg1', 'Purpose & intent', [
        's1-vision-c1',
        's1-vision-c2',
        's1-vision-classify',
      ]),
      dg('s1-vision-dg2', 'Capacity & constraints', [
        's1-vision-labour',
        's1-vision-c3',
        's1-vision-constraints',
        's1-vision-assumptions',
      ]),
    ],
    completionGate:
      'A bounded, evidence-grounded vision is approved with clear success criteria and capacity constraints documented.',
    actHandoff: 'Vision & Capacity Brief',
  }),
  obj({
    id: 's1-boundaries',
    stratumId: 's1-project-foundation',
    ref: 'U-S1.2',
    source: 'universal',
    title: 'Establish site boundaries & legal constraints',
    focusedQuestion:
      'What are the legal, physical, and regulatory boundaries within which this project must operate?',
    checklist: [
      ck('s1-boundaries-c1', 'Obtain and verify current title and deed documents'),
      ck('s1-boundaries-c2', 'Map property boundaries on base layer'),
      ck('s1-boundaries-c3', 'Identify all easements, rights of way, and encumbrances'),
      ck('s1-boundaries-c4', 'Check zoning and permitted land uses'),
      ck('s1-boundaries-c5', 'Identify water rights and entitlements'),
      ck('s1-boundaries-c6', 'Record covenant, heritage, or conservation obligations'),
      ck(
        's1-boundaries-c7',
        'Note required permits for planned activities - building, earthworks, water harvesting',
      ),
    ],
    decisionGroups: [
      dg(
        's1-boundaries-dg1',
        'Title & boundary',
        ['s1-boundaries-c1', 's1-boundaries-c2'],
        ['Infrastructure & Access'],
      ),
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
    title: 'Map stakeholders & community relationships',
    focusedQuestion:
      'Who has an interest in, connection to, or jurisdiction over this land and project?',
    checklist: [
      ck('s1-stakeholders-c1', 'Map immediate neighbours and shared boundary relationships'),
      ck('s1-stakeholders-c2', 'Identify local authority contacts and relevant officers'),
      ck(
        's1-stakeholders-c3',
        'Record any Indigenous land relationships or cultural obligations',
      ),
      ck(
        's1-stakeholders-c4',
        'Identify community members affected by or interested in the project',
      ),
      ck('s1-stakeholders-c5', 'Note existing conflict, goodwill, or partnership relationships'),
      ck(
        's1-stakeholders-c6',
        'Record preferred communication channels for each stakeholder group',
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
    completionGate: 'Stakeholder map is complete. No known relationships unrecorded.',
    actHandoff: 'Stakeholder Register',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 's2-terrain',
    stratumId: 's2-land-reading',
    ref: 'U-S2.1',
    source: 'universal',
    title: 'Survey terrain & topography',
    focusedQuestion:
      'What are the physical landform characteristics that will shape all design decisions?',
    checklist: [
      ck(
        's2-terrain-c1',
        'Produce or obtain topographic map with contour intervals appropriate to scale',
      ),
      ck('s2-terrain-c2', 'Identify slope gradients and aspects across the site'),
      ck('s2-terrain-c3', 'Map elevation range and drainage divides'),
      ck('s2-terrain-c4', 'Identify flat areas, ridgelines, saddles, and hollows'),
      ck('s2-terrain-c5', 'Note areas of instability, erosion, or landslip risk'),
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
  }),
  obj({
    id: 's2-climate',
    stratumId: 's2-land-reading',
    ref: 'U-S2.2',
    source: 'universal',
    title: 'Survey climate & sectors',
    focusedQuestion:
      'What are the climate patterns and energy sectors that must be accommodated in all design decisions?',
    checklist: [
      ck('s2-climate-c1', 'Record annual and seasonal rainfall averages and variability'),
      ck('s2-climate-c2', 'Map prevailing wind directions by season'),
      ck('s2-climate-c3', 'Record temperature range, frost dates, and heat event frequency'),
      ck('s2-climate-c4', 'Map sun angles and shade zones by season'),
      ck('s2-climate-c5', 'Identify fire risk sectors and direction'),
      ck('s2-climate-c6', 'Note microclimate variations across the site'),
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
  }),
  obj({
    id: 's2-ecology',
    stratumId: 's2-land-reading',
    ref: 'U-S2.3',
    source: 'universal',
    title: 'Survey existing ecology & habitat',
    focusedQuestion:
      'What ecological communities, species, and habitat values are present on the site?',
    checklist: [
      ck('s2-ecology-c1', 'Record existing vegetation communities by zone'),
      ck('s2-ecology-c2', 'Identify native and invasive species present'),
      ck('s2-ecology-c3', 'Note wildlife corridors, nesting sites, and movement patterns'),
      ck('s2-ecology-c4', 'Assess habitat connectivity to surrounding landscape'),
      ck('s2-ecology-c5', 'Record water-dependent habitat areas'),
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
  }),
  obj({
    id: 's2-infrastructure',
    stratumId: 's2-land-reading',
    ref: 'U-S2.4',
    source: 'universal',
    title: 'Survey existing infrastructure & access',
    focusedQuestion:
      'What infrastructure, access routes, and services currently exist on the site?',
    checklist: [
      ck('s2-infrastructure-c1', 'Map all existing roads, tracks, and pathways'),
      ck(
        's2-infrastructure-c2',
        'Record all existing buildings and structures with condition assessment',
      ),
      ck('s2-infrastructure-c3', 'Map utility services - water, power, communications, waste'),
      ck('s2-infrastructure-c4', 'Identify legal access points and access constraints'),
      ck('s2-infrastructure-c5', 'Record existing fencing and boundary structures'),
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
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 's3-hydrology',
    stratumId: 's3-systems-reading',
    ref: 'U-S3.1',
    source: 'universal',
    title: 'Survey water movement & hydrology',
    focusedQuestion: 'How does water move through and across this site?',
    checklist: [
      ck('s3-hydrology-c1', 'Map all surface water flows - seasonal and permanent'),
      ck('s3-hydrology-c2', 'Identify catchment areas and their contribution to site water'),
      ck('s3-hydrology-c3', 'Locate springs, seeps, and water table indicators'),
      ck('s3-hydrology-c4', 'Assess runoff patterns and infiltration rates by zone'),
      ck('s3-hydrology-c5', 'Map existing drainage infrastructure and its performance'),
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
  }),
  obj({
    id: 's3-soil',
    stratumId: 's3-systems-reading',
    ref: 'U-S3.2',
    source: 'universal',
    title: 'Survey soil conditions & subsurface',
    focusedQuestion:
      'What are the soil characteristics and subsurface conditions across the site?',
    checklist: [
      ck(
        's3-soil-c1',
        'Conduct soil profile assessment at representative locations across site',
      ),
      ck('s3-soil-c2', 'Record soil texture, structure, and colour by horizon'),
      ck('s3-soil-c3', 'Test soil pH, organic matter, and basic nutrient levels'),
      ck('s3-soil-c4', 'Assess drainage class and water retention characteristics'),
      ck('s3-soil-c5', 'Map soil type variation across the site'),
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
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 's4-direction',
    stratumId: 's4-foundation-decisions',
    ref: 'U-S4.1',
    source: 'universal',
    title: 'Confirm project direction & feasibility',
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
      ),
      ck('s4-direction-c3', 'Identify minimum viable project scope for first planning cycle'),
      ck('s4-direction-c4', 'Define first-cycle success criteria'),
      ck('s4-direction-c5', 'Record assumptions and unresolved questions'),
      ck('s4-direction-c6', 'Approve bounded planning direction'),
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
  }),
  obj({
    id: 's4-water-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'U-S4.2',
    source: 'universal',
    title: 'Define water strategy',
    focusedQuestion:
      'How will this project collect, store, distribute, and conserve water?',
    checklist: [
      ck(
        's4-water-strategy-c1',
        'Assess total water demand across all enterprises and domestic use',
      ),
      ck(
        's4-water-strategy-c2',
        'Evaluate water source options - rainfall, groundwater, surface water, municipal',
      ),
      ck('s4-water-strategy-c3', 'Select primary and backup water supply strategy'),
      ck('s4-water-strategy-c4', 'Define storage capacity requirements'),
      ck('s4-water-strategy-c5', 'Select water harvesting approach appropriate to site'),
      ck(
        's4-water-strategy-c6',
        'Define water conservation priorities and drought response protocol',
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
  }),
  obj({
    id: 's4-zones',
    stratumId: 's4-foundation-decisions',
    ref: 'U-S4.3',
    source: 'universal',
    title: 'Define spatial framework & zones',
    focusedQuestion:
      'How will this site be spatially organised to serve all project purposes efficiently?',
    checklist: [
      ck(
        's4-zones-c1',
        'Establish zone framework based on use frequency and energy requirements',
      ),
      ck('s4-zones-c2', 'Define sector influences on zone placement'),
      ck('s4-zones-c3', 'Allocate enterprise zones based on survey findings'),
      ck('s4-zones-c4', 'Resolve spatial conflicts between enterprises'),
      ck('s4-zones-c5', 'Define buffer zones and transition areas'),
      ck('s4-zones-c6', 'Confirm zone framework against capacity and feasibility constraints'),
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
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 's5-access',
    stratumId: 's5-system-design',
    ref: 'U-S5.1',
    source: 'universal',
    title: 'Design access & circulation',
    focusedQuestion:
      'How will people, vehicles, and materials move through the farm efficiently and safely?',
    checklist: [
      ck(
        's5-access-c1',
        'Design primary vehicle access route from entry to all enterprise zones',
      ),
      ck('s5-access-c2', 'Define road and track standards for each use type'),
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
  }),
  obj({
    id: 's5-water-infrastructure',
    stratumId: 's5-system-design',
    ref: 'U-S5.2',
    source: 'universal',
    title: 'Design water harvesting & storage infrastructure',
    focusedQuestion:
      'How will water harvesting and storage infrastructure be designed to meet all project needs?',
    checklist: [
      ck(
        's5-water-infrastructure-c1',
        'Design primary water harvesting structures - dams, swales, tanks, ponds',
      ),
      ck('s5-water-infrastructure-c2', 'Specify storage capacity and locations'),
      ck(
        's5-water-infrastructure-c3',
        'Design distribution network - pipelines, gravity feeds, pumping systems',
      ),
      ck('s5-water-infrastructure-c4', 'Design emergency overflow and spillway infrastructure'),
      ck('s5-water-infrastructure-c5', 'Specify materials and construction standards'),
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
  }),
  obj({
    id: 's5-soil-improvement',
    stratumId: 's5-system-design',
    ref: 'U-S5.3',
    source: 'universal',
    title: 'Design soil improvement strategy',
    focusedQuestion: 'How will soil health be improved across all enterprise zones?',
    checklist: [
      ck(
        's5-soil-improvement-c1',
        'Design soil improvement program by zone - composting, mulching, cover cropping',
      ),
      ck('s5-soil-improvement-c2', 'Specify application rates and timing for each zone'),
      ck('s5-soil-improvement-c3', 'Define machinery and equipment requirements'),
      ck('s5-soil-improvement-c4', 'Define priority zones for first-cycle improvement'),
      ck(
        's5-soil-improvement-c5',
        'Establish soil health monitoring baseline for improvement tracking',
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
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 's6-monitoring',
    stratumId: 's6-integration-design',
    ref: 'U-S6.1',
    source: 'universal',
    title: 'Design monitoring & observation system',
    focusedQuestion:
      'How will the farm continuously read its own performance and feed that data back into Observe?',
    checklist: [
      ck('s6-monitoring-c1', 'Define key indicators to monitor across all enterprises'),
      ck('s6-monitoring-c2', 'Design data collection methods and recording systems'),
      ck('s6-monitoring-c3', 'Specify monitoring frequency by indicator'),
      ck('s6-monitoring-c4', 'Define responsibility for each monitoring stream'),
      ck(
        's6-monitoring-c5',
        'Define Observe feedback trigger points - when data initiates a Plan review',
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
    title: 'Define Phase 1 implementation plan',
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
  }),
  obj({
    id: 's7-resource-plan',
    stratumId: 's7-phasing-resourcing',
    ref: 'U-S7.2',
    source: 'universal',
    title: 'Define resource & capacity plan',
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
  }),
  obj({
    id: 's7-risk-register',
    stratumId: 's7-phasing-resourcing',
    ref: 'U-S7.3',
    source: 'universal',
    title: 'Define risk & contingency register',
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
  }),
];

const UNIVERSAL_BY_ID: ReadonlyMap<string, PlanStratumObjective> = new Map(
  UNIVERSAL_PLAN_OBJECTIVES.map((o) => [o.id, o]),
);

/** Look up a universal objective by id. */
export function findUniversalObjective(id: string): PlanStratumObjective | undefined {
  return UNIVERSAL_BY_ID.get(id);
}

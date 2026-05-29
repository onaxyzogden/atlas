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
// Id scheme: t<tier>-<slug> for the objective; <objId>-c<n> for items, except
// the three Tier-0 vision items the visionProfileToChecklist bridge targets
// (t0-vision-c1 / t0-vision-c2 / t0-vision-c3) and two semantic slugs
// (t0-vision-labour, t0-vision-constraints, t0-vision-classify,
// t0-vision-assumptions) which keep stable ids. All ids are globally unique
// across catalogues (planTierStore.toProgressMap invariant) and verified by a
// catalogue conformance test.
//
// ASCII-only copy: em/en dashes from the source -> " - "/"-"; curly quotes
// -> straight.

import type { PlanTierObjective } from '../../../schemas/plan/planTierObjective.schema.js';
import { ck, obj } from './authoring.js';

export const UNIVERSAL_PLAN_OBJECTIVES: readonly PlanTierObjective[] = [
  // ---------------------------------------------------------------- Tier 0
  obj({
    id: 't0-vision',
    tierId: 't0-project-foundation',
    ref: 'U-T0.1',
    source: 'universal',
    title: 'Define vision, goals & stewardship capacity',
    focusedQuestion:
      'What is this project for, what does success look like, and what resources does the steward have to work with?',
    checklist: [
      ck('t0-vision-c1', 'State the primary purpose of this land project in plain language'),
      ck('t0-vision-c2', 'Define 3-5 measurable success criteria for the first planning cycle'),
      ck(
        't0-vision-labour',
        'Inventory available labour - hours per week, seasonal variation, skill level',
      ),
      ck(
        't0-vision-c3',
        'Inventory available capital - initial budget and estimated annual operating budget',
      ),
      ck('t0-vision-constraints', 'Identify non-negotiables and hard constraints'),
      ck('t0-vision-classify', 'Classify vision elements as committed vs. aspirational'),
      ck('t0-vision-assumptions', 'Record assumptions and known unknowns'),
    ],
    completionGate:
      'A bounded, evidence-grounded vision is approved with clear success criteria and capacity constraints documented.',
    actHandoff: 'Vision & Capacity Brief',
  }),
  obj({
    id: 't0-boundaries',
    tierId: 't0-project-foundation',
    ref: 'U-T0.2',
    source: 'universal',
    title: 'Establish site boundaries & legal constraints',
    focusedQuestion:
      'What are the legal, physical, and regulatory boundaries within which this project must operate?',
    checklist: [
      ck('t0-boundaries-c1', 'Obtain and verify current title and deed documents'),
      ck('t0-boundaries-c2', 'Map property boundaries on base layer'),
      ck('t0-boundaries-c3', 'Identify all easements, rights of way, and encumbrances'),
      ck('t0-boundaries-c4', 'Check zoning and permitted land uses'),
      ck('t0-boundaries-c5', 'Identify water rights and entitlements'),
      ck('t0-boundaries-c6', 'Record covenant, heritage, or conservation obligations'),
      ck(
        't0-boundaries-c7',
        'Note required permits for planned activities - building, earthworks, water harvesting',
      ),
    ],
    completionGate:
      'All legal constraints and boundary conditions are mapped, recorded, and reviewed. No design work proceeds into areas of legal ambiguity.',
    actHandoff: 'Legal & Boundary Constraints Brief',
  }),
  obj({
    id: 't0-stakeholders',
    tierId: 't0-project-foundation',
    ref: 'U-T0.3',
    source: 'universal',
    title: 'Map stakeholders & community relationships',
    focusedQuestion:
      'Who has an interest in, connection to, or jurisdiction over this land and project?',
    checklist: [
      ck('t0-stakeholders-c1', 'Map immediate neighbours and shared boundary relationships'),
      ck('t0-stakeholders-c2', 'Identify local authority contacts and relevant officers'),
      ck(
        't0-stakeholders-c3',
        'Record any Indigenous land relationships or cultural obligations',
      ),
      ck(
        't0-stakeholders-c4',
        'Identify community members affected by or interested in the project',
      ),
      ck('t0-stakeholders-c5', 'Note existing conflict, goodwill, or partnership relationships'),
      ck(
        't0-stakeholders-c6',
        'Record preferred communication channels for each stakeholder group',
      ),
    ],
    completionGate: 'Stakeholder map is complete. No known relationships unrecorded.',
    actHandoff: 'Stakeholder Register',
  }),
  // ---------------------------------------------------------------- Tier 1
  obj({
    id: 't1-terrain',
    tierId: 't1-land-reading',
    ref: 'U-T1.1',
    source: 'universal',
    title: 'Survey terrain & topography',
    focusedQuestion:
      'What are the physical landform characteristics that will shape all design decisions?',
    checklist: [
      ck(
        't1-terrain-c1',
        'Produce or obtain topographic map with contour intervals appropriate to scale',
      ),
      ck('t1-terrain-c2', 'Identify slope gradients and aspects across the site'),
      ck('t1-terrain-c3', 'Map elevation range and drainage divides'),
      ck('t1-terrain-c4', 'Identify flat areas, ridgelines, saddles, and hollows'),
      ck('t1-terrain-c5', 'Note areas of instability, erosion, or landslip risk'),
    ],
    completionGate: 'Full topographic survey complete. Landform map approved.',
    actHandoff: 'Topographic Survey Package',
  }),
  obj({
    id: 't1-climate',
    tierId: 't1-land-reading',
    ref: 'U-T1.2',
    source: 'universal',
    title: 'Survey climate & sectors',
    focusedQuestion:
      'What are the climate patterns and energy sectors that must be accommodated in all design decisions?',
    checklist: [
      ck('t1-climate-c1', 'Record annual and seasonal rainfall averages and variability'),
      ck('t1-climate-c2', 'Map prevailing wind directions by season'),
      ck('t1-climate-c3', 'Record temperature range, frost dates, and heat event frequency'),
      ck('t1-climate-c4', 'Map sun angles and shade zones by season'),
      ck('t1-climate-c5', 'Identify fire risk sectors and direction'),
      ck('t1-climate-c6', 'Note microclimate variations across the site'),
    ],
    completionGate:
      'Climate and sector data recorded and mapped. All major sectors identified.',
    actHandoff: 'Climate & Sector Survey Package',
  }),
  obj({
    id: 't1-ecology',
    tierId: 't1-land-reading',
    ref: 'U-T1.3',
    source: 'universal',
    title: 'Survey existing ecology & habitat',
    focusedQuestion:
      'What ecological communities, species, and habitat values are present on the site?',
    checklist: [
      ck('t1-ecology-c1', 'Record existing vegetation communities by zone'),
      ck('t1-ecology-c2', 'Identify native and invasive species present'),
      ck('t1-ecology-c3', 'Note wildlife corridors, nesting sites, and movement patterns'),
      ck('t1-ecology-c4', 'Assess habitat connectivity to surrounding landscape'),
      ck('t1-ecology-c5', 'Record water-dependent habitat areas'),
    ],
    completionGate:
      'Ecological survey complete. All habitat types and significant species recorded.',
    actHandoff: 'Ecological Survey Package',
  }),
  obj({
    id: 't1-infrastructure',
    tierId: 't1-land-reading',
    ref: 'U-T1.4',
    source: 'universal',
    title: 'Survey existing infrastructure & access',
    focusedQuestion:
      'What infrastructure, access routes, and services currently exist on the site?',
    checklist: [
      ck('t1-infrastructure-c1', 'Map all existing roads, tracks, and pathways'),
      ck(
        't1-infrastructure-c2',
        'Record all existing buildings and structures with condition assessment',
      ),
      ck('t1-infrastructure-c3', 'Map utility services - water, power, communications, waste'),
      ck('t1-infrastructure-c4', 'Identify legal access points and access constraints'),
      ck('t1-infrastructure-c5', 'Record existing fencing and boundary structures'),
    ],
    completionGate: 'Full infrastructure inventory complete and mapped.',
    actHandoff: 'Infrastructure Survey Package',
  }),
  // ---------------------------------------------------------------- Tier 2
  obj({
    id: 't2-hydrology',
    tierId: 't2-systems-reading',
    ref: 'U-T2.1',
    source: 'universal',
    title: 'Survey water movement & hydrology',
    focusedQuestion: 'How does water move through and across this site?',
    checklist: [
      ck('t2-hydrology-c1', 'Map all surface water flows - seasonal and permanent'),
      ck('t2-hydrology-c2', 'Identify catchment areas and their contribution to site water'),
      ck('t2-hydrology-c3', 'Locate springs, seeps, and water table indicators'),
      ck('t2-hydrology-c4', 'Assess runoff patterns and infiltration rates by zone'),
      ck('t2-hydrology-c5', 'Map existing drainage infrastructure and its performance'),
    ],
    completionGate:
      'Hydrological survey complete. Water movement mapped across all seasons.',
    actHandoff: 'Hydrology Survey Package',
  }),
  obj({
    id: 't2-soil',
    tierId: 't2-systems-reading',
    ref: 'U-T2.2',
    source: 'universal',
    title: 'Survey soil conditions & subsurface',
    focusedQuestion:
      'What are the soil characteristics and subsurface conditions across the site?',
    checklist: [
      ck(
        't2-soil-c1',
        'Conduct soil profile assessment at representative locations across site',
      ),
      ck('t2-soil-c2', 'Record soil texture, structure, and colour by horizon'),
      ck('t2-soil-c3', 'Test soil pH, organic matter, and basic nutrient levels'),
      ck('t2-soil-c4', 'Assess drainage class and water retention characteristics'),
      ck('t2-soil-c5', 'Map soil type variation across the site'),
    ],
    completionGate:
      'Soil survey complete. Profile assessments and test results recorded for all representative zones.',
    actHandoff: 'Soil Survey Package',
  }),
  // ---------------------------------------------------------------- Tier 3
  obj({
    id: 't3-direction',
    tierId: 't3-foundation-decisions',
    ref: 'U-T3.1',
    source: 'universal',
    title: 'Confirm project direction & feasibility',
    focusedQuestion:
      'Given all observed conditions, what version of this project should be planned?',
    checklist: [
      ck(
        't3-direction-c1',
        'Review Tier 0 vision and enterprise mix against all survey findings',
      ),
      ck(
        't3-direction-c2',
        'Classify each vision element as feasible, conditional, deferred, or rejected',
      ),
      ck('t3-direction-c3', 'Identify minimum viable project scope for first planning cycle'),
      ck('t3-direction-c4', 'Define first-cycle success criteria'),
      ck('t3-direction-c5', 'Record assumptions and unresolved questions'),
      ck('t3-direction-c6', 'Approve bounded planning direction'),
    ],
    completionGate:
      'Project direction confirmed. All vision elements classified. Planning direction approved.',
    actHandoff: 'Project Direction Brief',
  }),
  obj({
    id: 't3-water-strategy',
    tierId: 't3-foundation-decisions',
    ref: 'U-T3.2',
    source: 'universal',
    title: 'Define water strategy',
    focusedQuestion:
      'How will this project collect, store, distribute, and conserve water?',
    checklist: [
      ck(
        't3-water-strategy-c1',
        'Assess total water demand across all enterprises and domestic use',
      ),
      ck(
        't3-water-strategy-c2',
        'Evaluate water source options - rainfall, groundwater, surface water, municipal',
      ),
      ck('t3-water-strategy-c3', 'Select primary and backup water supply strategy'),
      ck('t3-water-strategy-c4', 'Define storage capacity requirements'),
      ck('t3-water-strategy-c5', 'Select water harvesting approach appropriate to site'),
      ck(
        't3-water-strategy-c6',
        'Define water conservation priorities and drought response protocol',
      ),
    ],
    completionGate:
      'Water strategy approved. Supply, storage, and distribution approach defined for all enterprises.',
    actHandoff: 'Water Strategy Decision Brief',
  }),
  obj({
    id: 't3-zones',
    tierId: 't3-foundation-decisions',
    ref: 'U-T3.3',
    source: 'universal',
    title: 'Define spatial framework & zones',
    focusedQuestion:
      'How will this site be spatially organised to serve all project purposes efficiently?',
    checklist: [
      ck(
        't3-zones-c1',
        'Establish zone framework based on use frequency and energy requirements',
      ),
      ck('t3-zones-c2', 'Define sector influences on zone placement'),
      ck('t3-zones-c3', 'Allocate enterprise zones based on survey findings'),
      ck('t3-zones-c4', 'Resolve spatial conflicts between enterprises'),
      ck('t3-zones-c5', 'Define buffer zones and transition areas'),
      ck('t3-zones-c6', 'Confirm zone framework against capacity and feasibility constraints'),
    ],
    completionGate:
      'Spatial framework approved. All enterprise zones allocated without unresolved conflict.',
    actHandoff: 'Zone Allocation Framework',
  }),
  // ---------------------------------------------------------------- Tier 4
  obj({
    id: 't4-access',
    tierId: 't4-system-design',
    ref: 'U-T4.1',
    source: 'universal',
    title: 'Design access & circulation',
    focusedQuestion:
      'How will people, vehicles, and materials move through the farm efficiently and safely?',
    checklist: [
      ck(
        't4-access-c1',
        'Design primary vehicle access route from entry to all enterprise zones',
      ),
      ck('t4-access-c2', 'Define road and track standards for each use type'),
      ck('t4-access-c3', 'Design pedestrian pathways between key working areas'),
      ck('t4-access-c4', 'Resolve conflicts between vehicle, animal, and pedestrian movement'),
      ck('t4-access-c5', 'Specify turning radii and passing points for farm vehicles'),
    ],
    completionGate:
      'Access and circulation design approved. All movement conflicts resolved.',
    actHandoff: 'Access & Circulation Design Package',
  }),
  obj({
    id: 't4-water-infrastructure',
    tierId: 't4-system-design',
    ref: 'U-T4.2',
    source: 'universal',
    title: 'Design water harvesting & storage infrastructure',
    focusedQuestion:
      'How will water harvesting and storage infrastructure be designed to meet all project needs?',
    checklist: [
      ck(
        't4-water-infrastructure-c1',
        'Design primary water harvesting structures - dams, swales, tanks, ponds',
      ),
      ck('t4-water-infrastructure-c2', 'Specify storage capacity and locations'),
      ck(
        't4-water-infrastructure-c3',
        'Design distribution network - pipelines, gravity feeds, pumping systems',
      ),
      ck('t4-water-infrastructure-c4', 'Design emergency overflow and spillway infrastructure'),
      ck('t4-water-infrastructure-c5', 'Specify materials and construction standards'),
    ],
    completionGate:
      'Water infrastructure design approved. All harvesting, storage, and distribution components specified.',
    actHandoff: 'Water Infrastructure Design Package',
  }),
  obj({
    id: 't4-soil-improvement',
    tierId: 't4-system-design',
    ref: 'U-T4.3',
    source: 'universal',
    title: 'Design soil improvement strategy',
    focusedQuestion: 'How will soil health be improved across all enterprise zones?',
    checklist: [
      ck(
        't4-soil-improvement-c1',
        'Design soil improvement program by zone - composting, mulching, cover cropping',
      ),
      ck('t4-soil-improvement-c2', 'Specify application rates and timing for each zone'),
      ck('t4-soil-improvement-c3', 'Define machinery and equipment requirements'),
      ck('t4-soil-improvement-c4', 'Define priority zones for first-cycle improvement'),
      ck(
        't4-soil-improvement-c5',
        'Establish soil health monitoring baseline for improvement tracking',
      ),
    ],
    completionGate: 'Soil improvement strategy designed and approved for all zones.',
    actHandoff: 'Soil Improvement Design Package',
  }),
  // ---------------------------------------------------------------- Tier 5
  obj({
    id: 't5-monitoring',
    tierId: 't5-integration-design',
    ref: 'U-T5.1',
    source: 'universal',
    title: 'Design monitoring & observation system',
    focusedQuestion:
      'How will the farm continuously read its own performance and feed that data back into Observe?',
    checklist: [
      ck('t5-monitoring-c1', 'Define key indicators to monitor across all enterprises'),
      ck('t5-monitoring-c2', 'Design data collection methods and recording systems'),
      ck('t5-monitoring-c3', 'Specify monitoring frequency by indicator'),
      ck('t5-monitoring-c4', 'Define responsibility for each monitoring stream'),
      ck(
        't5-monitoring-c5',
        'Define Observe feedback trigger points - when data initiates a Plan review',
      ),
    ],
    completionGate:
      'Monitoring system designed and approved. All indicators, methods, and responsibilities defined.',
    actHandoff: 'Monitoring & Observation System Design',
  }),
  // ---------------------------------------------------------------- Tier 6
  obj({
    id: 't6-phase1',
    tierId: 't6-phasing-resourcing',
    ref: 'U-T6.1',
    source: 'universal',
    title: 'Define Phase 1 implementation plan',
    focusedQuestion:
      'What will be built, planted, and established in the first implementation cycle?',
    checklist: [
      ck(
        't6-phase1-c1',
        'Define Phase 1 scope - which enterprises and infrastructure are included',
      ),
      ck('t6-phase1-c2', 'Sequence Phase 1 tasks in logical implementation order'),
      ck('t6-phase1-c3', 'Assign responsibilities for each Phase 1 task'),
      ck('t6-phase1-c4', 'Define Phase 1 completion milestones'),
      ck('t6-phase1-c5', 'Confirm Phase 1 scope against capacity and resource plan'),
    ],
    completionGate:
      'Phase 1 implementation plan approved. Scope, sequence, responsibilities, and milestones confirmed.',
    actHandoff: 'Phase 1 Implementation Plan',
  }),
  obj({
    id: 't6-resource-plan',
    tierId: 't6-phasing-resourcing',
    ref: 'U-T6.2',
    source: 'universal',
    title: 'Define resource & capacity plan',
    focusedQuestion:
      'What labour, capital, equipment, and skills are required, and how will they be sourced?',
    checklist: [
      ck('t6-resource-plan-c1', 'Estimate labour requirements by task and season for Phase 1'),
      ck('t6-resource-plan-c2', 'Identify skill gaps and training or contractor requirements'),
      ck('t6-resource-plan-c3', 'Define equipment requirements and sourcing strategy'),
      ck('t6-resource-plan-c4', 'Estimate Phase 1 capital requirements by category'),
      ck('t6-resource-plan-c5', 'Define procurement priorities and sourcing plan'),
    ],
    completionGate:
      'Resource and capacity plan approved. All Phase 1 requirements identified and sourcing strategy confirmed.',
    actHandoff: 'Resource & Capacity Plan',
  }),
  obj({
    id: 't6-risk-register',
    tierId: 't6-phasing-resourcing',
    ref: 'U-T6.3',
    source: 'universal',
    title: 'Define risk & contingency register',
    focusedQuestion:
      'What are the principal risks to Phase 1 success, and what are the contingency responses?',
    checklist: [
      ck('t6-risk-register-c1', 'Identify top 5-8 risks to Phase 1 implementation'),
      ck('t6-risk-register-c2', 'Assess likelihood and impact for each risk'),
      ck('t6-risk-register-c3', 'Define contingency response for each risk'),
      ck('t6-risk-register-c4', 'Identify early warning indicators for each risk'),
      ck('t6-risk-register-c5', 'Assign risk monitoring responsibility'),
    ],
    completionGate:
      'Risk register approved. All principal risks identified with defined contingency responses.',
    actHandoff: 'Risk & Contingency Register',
  }),
];

const UNIVERSAL_BY_ID: ReadonlyMap<string, PlanTierObjective> = new Map(
  UNIVERSAL_PLAN_OBJECTIVES.map((o) => [o.id, o]),
);

/** Look up a universal objective by id. */
export function findUniversalObjective(id: string): PlanTierObjective | undefined {
  return UNIVERSAL_BY_ID.get(id);
}

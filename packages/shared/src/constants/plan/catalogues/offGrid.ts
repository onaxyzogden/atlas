// catalogues/offGrid.ts
//
// Off-Grid Resilience / Remote Settlement PRIMARY-type objectives - the 27
// type-specific objectives an Off-Grid project adds on top of the 19 Universal
// objectives (OLOS Off-Grid Resilience / Remote Settlement Plan Stage Objective
// Catalogue v1.0, authored to Catalogue Authoring Standards v1.4).
//
// This file holds ONLY the primary-layer standalone objectives. The universal
// slot lives in ./universal.ts. The catalogue ships no base secondary layer, so
// there are no PatchRecords here.
//
// Count note: 19 universal + 27 primary = 46 total. Per-tier primary counts
// (3+4+4+5+5+3+3 = 27) and the source's Complete objective index both confirm
// 27. The source numbers objectives by Tier 0-6; this catalogue maps Tier N ->
// Stratum (N+1): Tier 0 -> s1-project-foundation, 1 -> s2-land-reading, 2 ->
// s3-systems-reading, 3 -> s4-foundation-decisions, 4 -> s5-system-design, 5 ->
// s6-integration-design, 6 -> s7-phasing-resourcing. Refs are restamped
// OFG-S<stratum>.<n> from the source's <tier>.<n>.
//
// Design gates carried in scopeNotes (verbatim from the source's Note rows):
//   - OFG-S1.4 (resilience philosophy & independence targets) - independence
//     targets are design gates; every Tier 3-4 (S4-S5) systems decision is sized
//     and evaluated against them. A system that cannot meet its target requires a
//     target revision or design change.
//   - OFG-S4.7 (emergency communications & response) - HARD GATE: no permanent
//     habitation before all residents are trained in emergency protocols.
//   - OFG-S6.4 (adaptive management) - Principle 9 exception: adaptive management
//     is placed in Tier 5 (S6) because for life-safety systems monitoring and
//     adaptation are inseparable; review cycle is season-tied, not annual.
//   - OFG-S7.4 (systems establishment sequence) - HARD GATE: no permanent
//     habitation until water (potable), energy (critical loads), shelter (thermal),
//     and emergency communications all pass independent go/no-go tests.
//   - OFG-S7.6 (phased habitation) - habitability thresholds are hard gates,
//     independently verified, not self-certified.
//
// AMANAH NOTE: every Off-Grid primary objective concerns life-safety resilience
// systems - water, energy, shelter, food, communications, emergency response,
// and habitation sequencing. There is no sales channel, advance purchase, or
// financing instrument in this catalogue; nothing engages riba or gharar. The
// purpose served (family / community self-sufficiency and life-safety) is clean.
//
// Decision groups are AUTHORED editorially under the 2026-05-31 extended override
// ("author meaningful labels") - the source ships no decision-group spec, so each
// objective's checklist is partitioned into 2-3 named decision scopes, mirroring
// orchard.ts / homestead.ts / education.ts / conservation.ts / marketGarden.ts.
//
// source: 'primary', sourceTypeId: 'off_grid' on every objective. ASCII-only
// copy: em/en dashes -> " - "; curly quotes -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj } from './authoring.js';

const PRIMARY = 'off_grid' as const;

export const OFF_GRID_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'ofg-s1-resilience-philosophy',
    stratumId: 's1-project-foundation',
    ref: 'OFG-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define resilience philosophy & independence targets',
    shortTitle: 'Resilience philosophy & independence targets',
    focusedQuestion:
      'What level of off-grid independence is the goal - full autonomy, partial grid backup, or seasonal self-sufficiency - and how does this gate all systems design?',
    checklist: [
      ck('ofg-s1-resilience-philosophy-c1', 'Define independence target per critical system - water, energy, food, communications, shelter', { feeds: ['ofg-s4-water-system-redundancy', 'ofg-s4-energy-system-redundancy', 'ofg-s4-food-security-storage'] }),
      ck('ofg-s1-resilience-philosophy-c2', 'Define acceptable backup or grid connection where full independence is not the target', { feeds: ['ofg-s4-energy-system-redundancy'] }),
      ck('ofg-s1-resilience-philosophy-c3', 'Define worst-case scenario resilience requirement - how long must all systems operate without resupply', { feeds: ['ofg-s7-resourcing-supply-chain', 's7-risk-register'] }),
      ck('ofg-s1-resilience-philosophy-c4', 'Confirm independence targets are achievable against site potential'),
      ck('ofg-s1-resilience-philosophy-c5', 'Document targets as design constraints - all Tier 3-4 systems sized against them', { feeds: ['ofg-s4-water-system-redundancy', 'ofg-s4-energy-system-redundancy', 'ofg-s4-shelter-thermal-performance'] }),
    ],
    decisionGroups: [
      dg('ofg-s1-resilience-philosophy-dg1', 'Independence targets & backup', ['ofg-s1-resilience-philosophy-c1', 'ofg-s1-resilience-philosophy-c2']),
      dg('ofg-s1-resilience-philosophy-dg2', 'Worst-case requirement & site fit', ['ofg-s1-resilience-philosophy-c3', 'ofg-s1-resilience-philosophy-c4']),
      dg('ofg-s1-resilience-philosophy-dg3', 'Targets as design constraints', ['ofg-s1-resilience-philosophy-c5']),
    ],
    completionGate:
      'Resilience philosophy approved. Independence targets defined per system and documented as design constraints.',
    actHandoff: 'Resilience Philosophy & Independence Targets Brief',
    scopeNotes:
      'Independence targets are design gates. Every Tier 3 and Tier 4 systems decision (S4-S5) is sized and evaluated against these targets. A system that cannot meet the defined independence target requires a target revision or a design change - not an unmitigated shortfall.',
  }),
  obj({
    id: 'ofg-s1-critical-systems-redundancy',
    stratumId: 's1-project-foundation',
    ref: 'OFG-S1.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define critical systems & redundancy requirements',
    shortTitle: 'Critical systems & redundancy',
    focusedQuestion:
      'Which systems are life-safety - and what redundancy is required for each to prevent single-point failure?',
    checklist: [
      ck('ofg-s1-critical-systems-redundancy-c1', 'Classify all systems by criticality - life-safety, essential, convenience', { feeds: ['ofg-s4-water-system-redundancy', 'ofg-s4-energy-system-redundancy'] }),
      ck('ofg-s1-critical-systems-redundancy-c2', 'Define redundancy requirement for each life-safety system - dual source, backup storage, manual fallback', { feeds: ['ofg-s4-water-system-redundancy', 'ofg-s4-energy-system-redundancy', 'ofg-s4-shelter-thermal-performance'] }),
      ck('ofg-s1-critical-systems-redundancy-c3', 'Define minimum viable operation standard for each critical system during failure', { feeds: ['ofg-s6-systems-performance-monitoring'] }),
      ck('ofg-s1-critical-systems-redundancy-c4', 'Define maximum acceptable downtime per system before life-safety threshold is breached', { feeds: ['ofg-s6-systems-performance-monitoring', 's7-risk-register'] }),
      ck('ofg-s1-critical-systems-redundancy-c5', 'Confirm redundancy requirements are achievable on this site'),
    ],
    decisionGroups: [
      dg('ofg-s1-critical-systems-redundancy-dg1', 'Criticality classification & redundancy', ['ofg-s1-critical-systems-redundancy-c1', 'ofg-s1-critical-systems-redundancy-c2']),
      dg('ofg-s1-critical-systems-redundancy-dg2', 'Minimum operation & downtime limits', ['ofg-s1-critical-systems-redundancy-c3', 'ofg-s1-critical-systems-redundancy-c4']),
      dg('ofg-s1-critical-systems-redundancy-dg3', 'Site achievability', ['ofg-s1-critical-systems-redundancy-c5']),
    ],
    completionGate:
      'Critical systems and redundancy requirements defined. All life-safety systems have dual-source or backup provision specified.',
    actHandoff: 'Critical Systems & Redundancy Requirements Brief',
  }),
  obj({
    id: 'ofg-s1-site-selection-access',
    stratumId: 's1-project-foundation',
    ref: 'OFG-S1.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define site selection & access strategy',
    shortTitle: 'Site selection & access strategy',
    focusedQuestion:
      'Is legal and physical access to this site confirmed - and what are the access constraints that shape all infrastructure design?',
    checklist: [
      ck('ofg-s1-site-selection-access-c1', 'Confirm legal access - title access, road easement, right of way', { feeds: ['s4-direction'] }),
      ck('ofg-s1-site-selection-access-c2', 'Assess physical access - road quality, seasonal passability, load-bearing capacity for materials delivery', { feeds: ['ofg-s7-resourcing-supply-chain', 's5-access'] }),
      ck('ofg-s1-site-selection-access-c3', 'Identify access constraints that limit construction methodology or materials', { feeds: ['ofg-s7-resourcing-supply-chain', 's7-risk-register'] }),
      ck('ofg-s1-site-selection-access-c4', 'Define maintenance responsibility for access road', { feeds: ['s5-access'] }),
      ck('ofg-s1-site-selection-access-c5', 'Define emergency vehicle access requirements and confirm they are met', { feeds: ['ofg-s4-emergency-comms-response', 's7-risk-register'] }),
      ck('ofg-s1-site-selection-access-c6', 'Identify nearest sealed road and service centre distance', { feeds: ['ofg-s7-resourcing-supply-chain'] }),
    ],
    decisionGroups: [
      dg('ofg-s1-site-selection-access-dg1', 'Legal & physical access', ['ofg-s1-site-selection-access-c1', 'ofg-s1-site-selection-access-c2']),
      dg('ofg-s1-site-selection-access-dg2', 'Constraints & maintenance', ['ofg-s1-site-selection-access-c3', 'ofg-s1-site-selection-access-c4']),
      dg('ofg-s1-site-selection-access-dg3', 'Emergency access & service distance', ['ofg-s1-site-selection-access-c5', 'ofg-s1-site-selection-access-c6']),
    ],
    completionGate:
      'Site access confirmed legally and physically. Access constraints documented. Emergency vehicle access confirmed.',
    actHandoff: 'Site Selection & Access Strategy Brief',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'ofg-s2-water-sources-yield',
    stratumId: 's2-land-reading',
    ref: 'OFG-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey water sources & year-round yield',
    shortTitle: 'Water sources & year-round yield',
    focusedQuestion:
      'What water sources are available on this site - and what is their reliable yield in the driest months?',
    checklist: [
      ck('ofg-s2-water-sources-yield-c1', 'Map all potential water sources - rainfall, springs, streams, groundwater', { feeds: ['ofg-s4-water-system-redundancy'] }),
      ck('ofg-s2-water-sources-yield-c2', 'Assess reliability and yield of each source through dry season', { feeds: ['ofg-s4-water-system-redundancy'] }),
      ck('ofg-s2-water-sources-yield-c3', 'Measure or estimate catchment area and yield for rainfall harvesting', { feeds: ['ofg-s4-water-system-redundancy', 's5-water-infrastructure'] }),
      ck('ofg-s2-water-sources-yield-c4', 'Conduct bore or well yield test if groundwater is a primary source', { feeds: ['ofg-s4-water-system-redundancy'] }),
      ck('ofg-s2-water-sources-yield-c5', 'Assess water source proximity to dwelling and infrastructure zones', { feeds: ['s4-zones', 's5-water-infrastructure'] }),
      ck('ofg-s2-water-sources-yield-c6', 'Define minimum yield required per person per day and confirm source can meet it', { feeds: ['ofg-s4-water-system-redundancy'] }),
    ],
    decisionGroups: [
      dg('ofg-s2-water-sources-yield-dg1', 'Source mapping & dry-season reliability', ['ofg-s2-water-sources-yield-c1', 'ofg-s2-water-sources-yield-c2']),
      dg('ofg-s2-water-sources-yield-dg2', 'Catchment & bore yield', ['ofg-s2-water-sources-yield-c3', 'ofg-s2-water-sources-yield-c4']),
      dg('ofg-s2-water-sources-yield-dg3', 'Proximity & per-person demand', ['ofg-s2-water-sources-yield-c5', 'ofg-s2-water-sources-yield-c6']),
    ],
    completionGate:
      'Water sources mapped. Minimum yield confirmed against population demand through worst-case dry season.',
    actHandoff: 'Water Sources & Year-Round Yield Survey',
  }),
  obj({
    id: 'ofg-s2-energy-generation-potential',
    stratumId: 's2-land-reading',
    ref: 'OFG-S2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey energy generation potential',
    shortTitle: 'Energy generation potential',
    focusedQuestion:
      'What energy can this site reliably generate year-round - and what is the generation capacity in the worst-case month?',
    checklist: [
      ck('ofg-s2-energy-generation-potential-c1', 'Assess solar generation potential - peak sun hours by month, shading analysis', { feeds: ['ofg-s4-energy-system-redundancy', 'ofg-s5-energy-system-infrastructure'] }),
      ck('ofg-s2-energy-generation-potential-c2', 'Assess wind generation potential - speed, consistency, seasonal variation', { feeds: ['ofg-s4-energy-system-redundancy'] }),
      ck('ofg-s2-energy-generation-potential-c3', 'Assess micro-hydro potential if running water present - flow rate and head', { feeds: ['ofg-s4-energy-system-redundancy'] }),
      ck('ofg-s2-energy-generation-potential-c4', 'Assess biomass and wood fuel production capacity', { feeds: ['ofg-s4-shelter-thermal-performance'] }),
      ck('ofg-s2-energy-generation-potential-c5', 'Estimate total energy demand per person per day for all critical systems', { feeds: ['ofg-s4-energy-system-redundancy'] }),
      ck('ofg-s2-energy-generation-potential-c6', 'Define generation gap - worst-case month demand vs. available generation', { feeds: ['ofg-s4-energy-system-redundancy'] }),
    ],
    decisionGroups: [
      dg('ofg-s2-energy-generation-potential-dg1', 'Solar & wind potential', ['ofg-s2-energy-generation-potential-c1', 'ofg-s2-energy-generation-potential-c2']),
      dg('ofg-s2-energy-generation-potential-dg2', 'Hydro & biomass potential', ['ofg-s2-energy-generation-potential-c3', 'ofg-s2-energy-generation-potential-c4']),
      dg('ofg-s2-energy-generation-potential-dg3', 'Demand & generation gap', ['ofg-s2-energy-generation-potential-c5', 'ofg-s2-energy-generation-potential-c6']),
    ],
    completionGate:
      'Energy generation potential assessed. Worst-case month generation gap defined.',
    actHandoff: 'Energy Generation Potential Survey',
  }),
  obj({
    id: 'ofg-s2-access-road-emergency-route',
    stratumId: 's2-land-reading',
    ref: 'OFG-S2.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey access road & emergency route conditions',
    shortTitle: 'Access road & emergency route',
    focusedQuestion:
      'Is the access road passable year-round - and can emergency vehicles reach the site in all seasons?',
    checklist: [
      ck('ofg-s2-access-road-emergency-route-c1', 'Survey road surface condition along entire access route', { feeds: ['s5-access'] }),
      ck('ofg-s2-access-road-emergency-route-c2', 'Assess seasonal passability - wet season flooding, snow closure, fire access', { feeds: ['ofg-s7-resourcing-supply-chain', 's7-risk-register'] }),
      ck('ofg-s2-access-road-emergency-route-c3', 'Measure road width, turning radii, and load-bearing capacity', { feeds: ['s5-access', 'ofg-s7-resourcing-supply-chain'] }),
      ck('ofg-s2-access-road-emergency-route-c4', 'Identify bridge or culvert conditions on access route', { feeds: ['s5-access', 's7-risk-register'] }),
      ck('ofg-s2-access-road-emergency-route-c5', 'Define emergency vehicle access requirements - ambulance, fire truck - and confirm route meets them', { feeds: ['ofg-s4-emergency-comms-response'] }),
      ck('ofg-s2-access-road-emergency-route-c6', 'Identify alternative emergency access route if primary route fails', { feeds: ['ofg-s4-emergency-comms-response', 's7-risk-register'] }),
    ],
    decisionGroups: [
      dg('ofg-s2-access-road-emergency-route-dg1', 'Surface & seasonal passability', ['ofg-s2-access-road-emergency-route-c1', 'ofg-s2-access-road-emergency-route-c2']),
      dg('ofg-s2-access-road-emergency-route-dg2', 'Width, load & structures', ['ofg-s2-access-road-emergency-route-c3', 'ofg-s2-access-road-emergency-route-c4']),
      dg('ofg-s2-access-road-emergency-route-dg3', 'Emergency vehicle & alternate route', ['ofg-s2-access-road-emergency-route-c5', 'ofg-s2-access-road-emergency-route-c6']),
    ],
    completionGate:
      'Access road conditions surveyed. Emergency vehicle access confirmed or gap identified.',
    actHandoff: 'Access Road & Emergency Route Survey',
  }),
  obj({
    id: 'ofg-s2-fire-risk-evacuation',
    stratumId: 's2-land-reading',
    ref: 'OFG-S2.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey fire risk & evacuation conditions',
    shortTitle: 'Fire risk & evacuation',
    focusedQuestion:
      'What is the fire risk at this site - and are evacuation routes viable in all fire scenarios?',
    checklist: [
      ck('ofg-s2-fire-risk-evacuation-c1', 'Assess fire risk by season - vegetation type, fuel load, proximity to fire-prone landscape', { feeds: ['ofg-s4-emergency-comms-response', 's7-risk-register'] }),
      ck('ofg-s2-fire-risk-evacuation-c2', 'Map evacuation routes from dwelling to safe assembly points and beyond', { feeds: ['ofg-s4-emergency-comms-response', 'ofg-s5-communications-emergency-infrastructure'] }),
      ck('ofg-s2-fire-risk-evacuation-c3', 'Assess evacuation route passability during fire conditions - road surfaces, vegetation clearance', { feeds: ['ofg-s4-emergency-comms-response'] }),
      ck('ofg-s2-fire-risk-evacuation-c4', 'Identify shelter-in-place potential if evacuation is not possible', { feeds: ['ofg-s4-emergency-comms-response'] }),
      ck('ofg-s2-fire-risk-evacuation-c5', 'Record nearest fire station and response time estimate', { feeds: ['ofg-s4-emergency-comms-response'] }),
      ck('ofg-s2-fire-risk-evacuation-c6', 'Define fire risk rating for the site under relevant regional framework', { feeds: ['s7-risk-register'] }),
    ],
    decisionGroups: [
      dg('ofg-s2-fire-risk-evacuation-dg1', 'Fire risk & evacuation routes', ['ofg-s2-fire-risk-evacuation-c1', 'ofg-s2-fire-risk-evacuation-c2']),
      dg('ofg-s2-fire-risk-evacuation-dg2', 'Route passability & shelter-in-place', ['ofg-s2-fire-risk-evacuation-c3', 'ofg-s2-fire-risk-evacuation-c4']),
      dg('ofg-s2-fire-risk-evacuation-dg3', 'Response time & risk rating', ['ofg-s2-fire-risk-evacuation-c5', 'ofg-s2-fire-risk-evacuation-c6']),
    ],
    completionGate:
      'Fire risk assessed. Evacuation routes mapped and confirmed viable.',
    actHandoff: 'Fire Risk & Evacuation Conditions Survey',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'ofg-s3-water-quality-treatment',
    stratumId: 's3-systems-reading',
    ref: 'OFG-S3.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey water quality & treatment requirements',
    shortTitle: 'Water quality & treatment',
    focusedQuestion:
      'Is the available water safe for life-safety use - and what treatment is required?',
    checklist: [
      ck('ofg-s3-water-quality-treatment-c1', 'Test all primary water sources for biological contamination - bacteria, pathogens', { feeds: ['ofg-s4-water-system-redundancy'] }),
      ck('ofg-s3-water-quality-treatment-c2', 'Test for chemical contamination - agricultural runoff, geological contaminants, heavy metals', { feeds: ['ofg-s4-water-system-redundancy'] }),
      ck('ofg-s3-water-quality-treatment-c3', 'Test for naturally occurring contaminants - arsenic, fluoride, iron', { feeds: ['ofg-s4-water-system-redundancy'] }),
      ck('ofg-s3-water-quality-treatment-c4', 'Record seasonal variation in water quality', { feeds: ['ofg-s6-systems-performance-monitoring'] }),
      ck('ofg-s3-water-quality-treatment-c5', 'Define treatment requirements for potable use from each source', { feeds: ['ofg-s4-water-system-redundancy', 'ofg-s5-water-system-infrastructure'] }),
      ck('ofg-s3-water-quality-treatment-c6', 'Confirm treatment system is achievable and maintainable at this location', { feeds: ['ofg-s5-water-system-infrastructure'] }),
    ],
    decisionGroups: [
      dg('ofg-s3-water-quality-treatment-dg1', 'Biological & chemical contamination', ['ofg-s3-water-quality-treatment-c1', 'ofg-s3-water-quality-treatment-c2']),
      dg('ofg-s3-water-quality-treatment-dg2', 'Natural contaminants & seasonal variation', ['ofg-s3-water-quality-treatment-c3', 'ofg-s3-water-quality-treatment-c4']),
      dg('ofg-s3-water-quality-treatment-dg3', 'Treatment requirements & maintainability', ['ofg-s3-water-quality-treatment-c5', 'ofg-s3-water-quality-treatment-c6']),
    ],
    completionGate:
      'Water quality assessment complete. Treatment requirements defined for all sources.',
    actHandoff: 'Water Quality & Treatment Requirements Survey',
  }),
  obj({
    id: 'ofg-s3-energy-demand-balance',
    stratumId: 's3-systems-reading',
    ref: 'OFG-S3.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey energy demand vs. generation balance',
    shortTitle: 'Energy demand vs. generation',
    focusedQuestion:
      'What is the gap between critical energy demand and available generation in the worst-case month?',
    checklist: [
      ck('ofg-s3-energy-demand-balance-c1', 'Calculate critical system energy demand - water pump, refrigeration, lighting, communications, heating', { feeds: ['ofg-s4-energy-system-redundancy'] }),
      ck('ofg-s3-energy-demand-balance-c2', 'Calculate total household energy demand', { feeds: ['ofg-s4-energy-system-redundancy'] }),
      ck('ofg-s3-energy-demand-balance-c3', 'Map demand against generation potential month by month', { feeds: ['ofg-s4-energy-system-redundancy'] }),
      ck('ofg-s3-energy-demand-balance-c4', 'Identify worst-case month - lowest generation, highest demand', { feeds: ['ofg-s4-energy-system-redundancy', 'ofg-s5-energy-system-infrastructure'] }),
      ck('ofg-s3-energy-demand-balance-c5', 'Define storage requirement to bridge daily and seasonal gaps', { feeds: ['ofg-s4-energy-system-redundancy', 'ofg-s5-energy-system-infrastructure'] }),
      ck('ofg-s3-energy-demand-balance-c6', 'Quantify the generation-demand gap that storage and backup must cover', { feeds: ['ofg-s4-energy-system-redundancy'] }),
    ],
    decisionGroups: [
      dg('ofg-s3-energy-demand-balance-dg1', 'Critical & household demand', ['ofg-s3-energy-demand-balance-c1', 'ofg-s3-energy-demand-balance-c2']),
      dg('ofg-s3-energy-demand-balance-dg2', 'Monthly mapping & worst-case month', ['ofg-s3-energy-demand-balance-c3', 'ofg-s3-energy-demand-balance-c4']),
      dg('ofg-s3-energy-demand-balance-dg3', 'Storage requirement & gap', ['ofg-s3-energy-demand-balance-c5', 'ofg-s3-energy-demand-balance-c6']),
    ],
    completionGate:
      'Energy demand vs. generation balance assessed. Worst-case gap quantified.',
    actHandoff: 'Energy Demand vs. Generation Balance Assessment',
  }),
  obj({
    id: 'ofg-s3-communications-connectivity',
    stratumId: 's3-systems-reading',
    ref: 'OFG-S3.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey communications & emergency connectivity',
    shortTitle: 'Communications & emergency connectivity',
    focusedQuestion:
      'What communications and emergency connectivity is available - and what gaps exist?',
    checklist: [
      ck('ofg-s3-communications-connectivity-c1', 'Test mobile phone coverage at dwelling site - carrier by carrier', { feeds: ['ofg-s4-emergency-comms-response'] }),
      ck('ofg-s3-communications-connectivity-c2', 'Assess satellite phone and internet options and coverage', { feeds: ['ofg-s4-emergency-comms-response', 'ofg-s5-communications-emergency-infrastructure'] }),
      ck('ofg-s3-communications-connectivity-c3', 'Identify nearest VHF or UHF radio repeater if applicable', { feeds: ['ofg-s5-communications-emergency-infrastructure'] }),
      ck('ofg-s3-communications-connectivity-c4', 'Define emergency call options available - 000/911 equivalent, satellite SOS', { feeds: ['ofg-s4-emergency-comms-response'] }),
      ck('ofg-s3-communications-connectivity-c5', 'Assess distance and travel time to nearest emergency services', { feeds: ['ofg-s4-emergency-comms-response'] }),
      ck('ofg-s3-communications-connectivity-c6', 'Confirm emergency communication plan is viable with available technology', { feeds: ['ofg-s4-emergency-comms-response', 'ofg-s5-communications-emergency-infrastructure'] }),
    ],
    decisionGroups: [
      dg('ofg-s3-communications-connectivity-dg1', 'Mobile & satellite coverage', ['ofg-s3-communications-connectivity-c1', 'ofg-s3-communications-connectivity-c2']),
      dg('ofg-s3-communications-connectivity-dg2', 'Radio & emergency call options', ['ofg-s3-communications-connectivity-c3', 'ofg-s3-communications-connectivity-c4']),
      dg('ofg-s3-communications-connectivity-dg3', 'Emergency services distance & plan viability', ['ofg-s3-communications-connectivity-c5', 'ofg-s3-communications-connectivity-c6']),
    ],
    completionGate:
      'Communications and emergency connectivity options assessed. Emergency plan viable.',
    actHandoff: 'Communications & Emergency Connectivity Survey',
  }),
  obj({
    id: 'ofg-s3-food-production-storage-conditions',
    stratumId: 's3-systems-reading',
    ref: 'OFG-S3.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey food production potential & storage conditions',
    shortTitle: 'Food production potential & storage',
    focusedQuestion:
      'What can this site produce year-round - and what are the storage conditions for maintaining food reserves?',
    checklist: [
      ck('ofg-s3-food-production-storage-conditions-c1', 'Assess growing season length and frost-free window', { feeds: ['ofg-s4-food-security-storage'] }),
      ck('ofg-s3-food-production-storage-conditions-c2', 'Evaluate food production potential by zone - annual garden, perennial, animals', { feeds: ['ofg-s4-food-security-storage', 'ofg-s5-food-production-infrastructure'] }),
      ck('ofg-s3-food-production-storage-conditions-c3', 'Assess natural cold storage potential - cool rooms, root cellar conditions', { feeds: ['ofg-s5-food-production-infrastructure'] }),
      ck('ofg-s3-food-production-storage-conditions-c4', 'Assess food preservation requirements - drying, fermentation, canning capacity needed', { feeds: ['ofg-s4-food-security-storage', 'ofg-s5-food-production-infrastructure'] }),
      ck('ofg-s3-food-production-storage-conditions-c5', 'Define minimum food reserve requirement - weeks of supply as resilience target', { feeds: ['ofg-s4-food-security-storage'] }),
      ck('ofg-s3-food-production-storage-conditions-c6', 'Confirm production potential can meet independence target defined in Tier 0', { feeds: ['ofg-s4-food-security-storage'] }),
    ],
    decisionGroups: [
      dg('ofg-s3-food-production-storage-conditions-dg1', 'Growing season & production potential', ['ofg-s3-food-production-storage-conditions-c1', 'ofg-s3-food-production-storage-conditions-c2']),
      dg('ofg-s3-food-production-storage-conditions-dg2', 'Cold storage & preservation', ['ofg-s3-food-production-storage-conditions-c3', 'ofg-s3-food-production-storage-conditions-c4']),
      dg('ofg-s3-food-production-storage-conditions-dg3', 'Reserve target & independence fit', ['ofg-s3-food-production-storage-conditions-c5', 'ofg-s3-food-production-storage-conditions-c6']),
    ],
    completionGate:
      'Food production potential and storage conditions assessed. Reserve target confirmed against production potential.',
    actHandoff: 'Food Production Potential & Storage Conditions Survey',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'ofg-s4-water-system-redundancy',
    stratumId: 's4-foundation-decisions',
    ref: 'OFG-S4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define water system strategy & redundancy',
    shortTitle: 'Water system strategy & redundancy',
    focusedQuestion:
      'How will the water system be designed with sufficient redundancy that no single failure threatens life-safety?',
    checklist: [
      ck('ofg-s4-water-system-redundancy-c1', 'Define primary water source - rainfall, spring, bore, stream', { feeds: ['ofg-s5-water-system-infrastructure'] }),
      ck('ofg-s4-water-system-redundancy-c2', 'Define backup water source - separate source, not the same failure mode', { feeds: ['ofg-s5-water-system-infrastructure'] }),
      ck('ofg-s4-water-system-redundancy-c3', 'Define minimum storage capacity - days of reserve per person', { feeds: ['ofg-s5-water-system-infrastructure', 'ofg-s6-systems-performance-monitoring'] }),
      ck('ofg-s4-water-system-redundancy-c4', 'Define treatment system - type, maintenance requirements, failure response', { feeds: ['ofg-s5-water-system-infrastructure'] }),
      ck('ofg-s4-water-system-redundancy-c5', 'Define manual backup water delivery if powered system fails', { feeds: ['ofg-s5-water-system-infrastructure'] }),
      ck('ofg-s4-water-system-redundancy-c6', 'Confirm dual-source redundancy meets critical systems requirement from Tier 0', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
    ],
    decisionGroups: [
      dg('ofg-s4-water-system-redundancy-dg1', 'Primary & backup source', ['ofg-s4-water-system-redundancy-c1', 'ofg-s4-water-system-redundancy-c2']),
      dg('ofg-s4-water-system-redundancy-dg2', 'Storage & treatment', ['ofg-s4-water-system-redundancy-c3', 'ofg-s4-water-system-redundancy-c4']),
      dg('ofg-s4-water-system-redundancy-dg3', 'Manual backup & redundancy confirmation', ['ofg-s4-water-system-redundancy-c5', 'ofg-s4-water-system-redundancy-c6']),
    ],
    completionGate:
      'Water system strategy approved. Dual-source redundancy confirmed. Manual backup defined.',
    actHandoff: 'Water System Strategy & Redundancy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Storage reserve level in days-per-person', frequency: 'weekly, daily through dry season' },
        { metric: 'Primary vs. backup source draw split', frequency: 'monthly' },
        { metric: 'Treatment system output and consumable status', frequency: 'monthly' },
      ],
      triggers: [
        'Reserve drops below the defined minimum days-per-person -> switch to backup source and restrict non-essential use',
        'Primary source yield falls short of demand -> activate backup source and reassess dry-season sizing',
        'Powered delivery fails -> stand up the manual fill point and schedule pump repair',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 'ofg-s4-energy-system-redundancy',
    stratumId: 's4-foundation-decisions',
    ref: 'OFG-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define energy system strategy & redundancy',
    shortTitle: 'Energy system strategy & redundancy',
    focusedQuestion:
      'How will the energy system be sized and backed up to maintain critical loads through the worst-case month?',
    checklist: [
      ck('ofg-s4-energy-system-redundancy-c1', 'Define primary generation system - solar, wind, hydro, hybrid', { feeds: ['ofg-s5-energy-system-infrastructure'] }),
      ck('ofg-s4-energy-system-redundancy-c2', 'Define battery storage capacity - days of critical load at worst-case generation', { feeds: ['ofg-s5-energy-system-infrastructure', 'ofg-s6-systems-performance-monitoring'] }),
      ck('ofg-s4-energy-system-redundancy-c3', 'Define backup generator - fuel type, capacity, fuel storage duration', { feeds: ['ofg-s5-energy-system-infrastructure', 'ofg-s7-resourcing-supply-chain'] }),
      ck('ofg-s4-energy-system-redundancy-c4', 'Define load management protocol - critical loads protected, non-critical loads shed in shortage', { feeds: ['ofg-s5-energy-system-infrastructure'] }),
      ck('ofg-s4-energy-system-redundancy-c5', 'Define manual alternatives for critical functions if all power fails', { feeds: ['ofg-s5-energy-system-infrastructure'] }),
      ck('ofg-s4-energy-system-redundancy-c6', 'Confirm system meets worst-case month energy balance from Tier 2', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
    ],
    decisionGroups: [
      dg('ofg-s4-energy-system-redundancy-dg1', 'Generation & battery storage', ['ofg-s4-energy-system-redundancy-c1', 'ofg-s4-energy-system-redundancy-c2']),
      dg('ofg-s4-energy-system-redundancy-dg2', 'Backup generator & load management', ['ofg-s4-energy-system-redundancy-c3', 'ofg-s4-energy-system-redundancy-c4']),
      dg('ofg-s4-energy-system-redundancy-dg3', 'Manual fallback & balance confirmation', ['ofg-s4-energy-system-redundancy-c5', 'ofg-s4-energy-system-redundancy-c6']),
    ],
    completionGate:
      'Energy system strategy approved. Worst-case month coverage confirmed with storage and backup.',
    actHandoff: 'Energy System Strategy & Redundancy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Battery state of charge and days-of-critical-load remaining', frequency: 'daily' },
        { metric: 'Generation vs. critical-load balance', frequency: 'weekly, daily in worst-case month' },
        { metric: 'Backup generator fuel reserve and run hours', frequency: 'monthly' },
      ],
      triggers: [
        'Battery state of charge falls below the protected reserve floor -> shed non-critical loads and start the backup generator',
        'Generation falls short of critical load over consecutive days -> switch to load-management protocol and reassess sizing',
        'Generator fuel reserve drops below the defined minimum -> trigger resupply before the next worst-case window',
      ],
      feeds: 'energy-resources',
    },
  }),
  obj({
    id: 'ofg-s4-food-security-storage',
    stratumId: 's4-foundation-decisions',
    ref: 'OFG-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define food security & storage strategy',
    shortTitle: 'Food security & storage strategy',
    focusedQuestion:
      'How will this settlement maintain a defined food reserve - and what production and preservation systems achieve it?',
    checklist: [
      ck('ofg-s4-food-security-storage-c1', 'Define minimum food reserve target - weeks of supply for all residents', { feeds: ['ofg-s5-food-production-infrastructure', 'ofg-s6-systems-performance-monitoring'] }),
      ck('ofg-s4-food-security-storage-c2', 'Define food production targets by enterprise - annual garden, perennial, animals', { feeds: ['ofg-s5-food-production-infrastructure'] }),
      ck('ofg-s4-food-security-storage-c3', 'Define food preservation and storage approach - cold storage, drying, fermentation, canning', { feeds: ['ofg-s5-food-production-infrastructure'] }),
      ck('ofg-s4-food-security-storage-c4', 'Define emergency resupply protocol - when reserve falls below minimum threshold', { feeds: ['ofg-s7-resourcing-supply-chain'] }),
      ck('ofg-s4-food-security-storage-c5', 'Confirm production and storage strategy meets independence target from Tier 0', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
    ],
    decisionGroups: [
      dg('ofg-s4-food-security-storage-dg1', 'Reserve target & production', ['ofg-s4-food-security-storage-c1', 'ofg-s4-food-security-storage-c2']),
      dg('ofg-s4-food-security-storage-dg2', 'Preservation & emergency resupply', ['ofg-s4-food-security-storage-c3', 'ofg-s4-food-security-storage-c4']),
      dg('ofg-s4-food-security-storage-dg3', 'Independence target fit', ['ofg-s4-food-security-storage-c5']),
    ],
    completionGate:
      'Food security and storage strategy approved. Reserve target, production plan, and emergency protocol confirmed.',
    actHandoff: 'Food Security & Storage Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Food reserve on hand in weeks-of-supply for all residents', frequency: 'monthly' },
        { metric: 'Production yield by enterprise vs. target', frequency: 'per harvest cycle' },
        { metric: 'Cold storage and preservation throughput vs. plan', frequency: 'seasonal' },
      ],
      triggers: [
        'Reserve falls below the minimum weeks-of-supply threshold -> activate the emergency resupply protocol',
        'Production yield runs short of target for a cycle -> adjust enterprise mix and increase preservation',
        'Cold storage or preservation capacity is exceeded -> add capacity or shift surplus to a longer-keeping method',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'ofg-s4-emergency-comms-response',
    stratumId: 's4-foundation-decisions',
    ref: 'OFG-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define emergency communications & response strategy',
    shortTitle: 'Emergency communications & response',
    focusedQuestion:
      'How will this settlement communicate in an emergency - and what response protocol protects all residents?',
    checklist: [
      ck('ofg-s4-emergency-comms-response-c1', 'Define primary emergency communication method - satellite phone, PLB, radio', { feeds: ['ofg-s5-communications-emergency-infrastructure'] }),
      ck('ofg-s4-emergency-comms-response-c2', 'Define backup emergency communication if primary fails', { feeds: ['ofg-s5-communications-emergency-infrastructure'] }),
      ck('ofg-s4-emergency-comms-response-c3', 'Define emergency contact list - nearest neighbours, emergency services, medical', { feeds: ['ofg-s6-emergency-preparedness-monitoring'] }),
      ck('ofg-s4-emergency-comms-response-c4', 'Define medical emergency protocol - first aid capacity, evacuation trigger, transport method', { feeds: ['ofg-s5-communications-emergency-infrastructure', 'ofg-s6-emergency-preparedness-monitoring'] }),
      ck('ofg-s4-emergency-comms-response-c5', 'Define fire emergency protocol - shelter-in-place criteria, evacuation triggers, assembly points', { feeds: ['ofg-s5-communications-emergency-infrastructure', 'ofg-s6-emergency-preparedness-monitoring'] }),
      ck('ofg-s4-emergency-comms-response-c6', 'Confirm all residents are trained in emergency protocols before first habitation', { feeds: ['ofg-s7-phased-habitation'] }),
    ],
    decisionGroups: [
      dg('ofg-s4-emergency-comms-response-dg1', 'Primary & backup communication', ['ofg-s4-emergency-comms-response-c1', 'ofg-s4-emergency-comms-response-c2']),
      dg('ofg-s4-emergency-comms-response-dg2', 'Contact list & medical protocol', ['ofg-s4-emergency-comms-response-c3', 'ofg-s4-emergency-comms-response-c4']),
      dg('ofg-s4-emergency-comms-response-dg3', 'Fire protocol & resident training', ['ofg-s4-emergency-comms-response-c5', 'ofg-s4-emergency-comms-response-c6']),
    ],
    completionGate:
      'Emergency communications and response strategy approved. All residents trained before habitation.',
    actHandoff: 'Emergency Communications & Response Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Primary and backup communication device check-in success', frequency: 'weekly' },
        { metric: 'Resident emergency-protocol training currency', frequency: 'per resident, on intake and at refresh' },
        { metric: 'Emergency contact list and response-time accuracy', frequency: 'quarterly review' },
      ],
      triggers: [
        'Primary communication device fails a check-in -> switch to backup method and arrange repair or replacement',
        'A resident lacks current emergency-protocol training -> bar permanent habitation until training is completed',
        'Contact list or response assumptions go stale -> re-verify services and update the response plan',
      ],
      feeds: 'risk-compliance',
    },
    scopeNotes:
      'Hard gate: no permanent habitation before all residents are trained in emergency protocols. Remote response times make internal emergency response the primary life-safety mechanism.',
  }),
  obj({
    id: 'ofg-s4-shelter-thermal-performance',
    stratumId: 's4-foundation-decisions',
    ref: 'OFG-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define shelter resilience & thermal performance strategy',
    shortTitle: 'Shelter resilience & thermal performance',
    focusedQuestion:
      'How will the dwelling maintain safe thermal conditions through the coldest period - and what is the backup if the primary heating system fails?',
    checklist: [
      ck('ofg-s4-shelter-thermal-performance-c1', 'Define thermal performance standard - minimum indoor temperature during coldest period', { feeds: ['ofg-s5-shelter-thermal-infrastructure'] }),
      ck('ofg-s4-shelter-thermal-performance-c2', 'Define primary heating system - fuel type, heat output, fuel storage capacity', { feeds: ['ofg-s5-shelter-thermal-infrastructure'] }),
      ck('ofg-s4-shelter-thermal-performance-c3', 'Define backup heating system - separate fuel type or passive fallback', { feeds: ['ofg-s5-shelter-thermal-infrastructure'] }),
      ck('ofg-s4-shelter-thermal-performance-c4', 'Define insulation standard required to meet thermal performance with defined heating capacity', { feeds: ['ofg-s5-shelter-thermal-infrastructure'] }),
      ck('ofg-s4-shelter-thermal-performance-c5', 'Define fuel reserve requirement - weeks of supply at peak demand', { feeds: ['ofg-s7-resourcing-supply-chain', 'ofg-s6-systems-performance-monitoring'] }),
      ck('ofg-s4-shelter-thermal-performance-c6', 'Confirm shelter strategy meets life-safety threshold for coldest recorded conditions', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
    ],
    decisionGroups: [
      dg('ofg-s4-shelter-thermal-performance-dg1', 'Thermal standard & primary heating', ['ofg-s4-shelter-thermal-performance-c1', 'ofg-s4-shelter-thermal-performance-c2']),
      dg('ofg-s4-shelter-thermal-performance-dg2', 'Backup heating & insulation', ['ofg-s4-shelter-thermal-performance-c3', 'ofg-s4-shelter-thermal-performance-c4']),
      dg('ofg-s4-shelter-thermal-performance-dg3', 'Fuel reserve & life-safety threshold', ['ofg-s4-shelter-thermal-performance-c5', 'ofg-s4-shelter-thermal-performance-c6']),
    ],
    completionGate:
      'Shelter resilience and thermal performance strategy approved. Primary and backup heating confirmed. Fuel reserve defined.',
    actHandoff: 'Shelter Resilience & Thermal Performance Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Indoor temperature vs. the thermal performance standard during the coldest period', frequency: 'daily in winter' },
        { metric: 'Heating fuel reserve in weeks-of-supply at peak demand', frequency: 'weekly through cold season' },
        { metric: 'Primary heating system output and condition', frequency: 'monthly in heating season' },
      ],
      triggers: [
        'Indoor temperature falls below the defined minimum -> bring the backup heating system online and inspect the primary',
        'Fuel reserve drops below the defined weeks-of-supply -> trigger resupply before the next cold spell',
        'Primary heating output degrades -> service the unit and hold the backup on standby',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'ofg-s5-water-system-infrastructure',
    stratumId: 's5-system-design',
    ref: 'OFG-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design water system infrastructure',
    shortTitle: 'Water system infrastructure',
    focusedQuestion:
      'How will the full water system - primary and backup sources, storage, treatment, and distribution - be designed for life-safety reliability?',
    checklist: [
      ck('ofg-s5-water-system-infrastructure-c1', 'Design primary source infrastructure - bore pump, spring capture, rainwater tank array', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-water-system-infrastructure-c2', 'Design backup source infrastructure - separate failure mode from primary', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-water-system-infrastructure-c3', 'Design treatment train - sediment filter, biological treatment, disinfection', { feeds: ['ofg-s6-systems-performance-monitoring'] }),
      ck('ofg-s5-water-system-infrastructure-c4', 'Design pressurised distribution to all dwelling and production points', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-water-system-infrastructure-c5', 'Design manual backup fill point accessible without power', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-water-system-infrastructure-c6', 'Specify all components to be locally repairable - no specialist-only parts', { feeds: ['ofg-s7-resourcing-supply-chain'] }),
    ],
    decisionGroups: [
      dg('ofg-s5-water-system-infrastructure-dg1', 'Primary & backup source infrastructure', ['ofg-s5-water-system-infrastructure-c1', 'ofg-s5-water-system-infrastructure-c2']),
      dg('ofg-s5-water-system-infrastructure-dg2', 'Treatment train & distribution', ['ofg-s5-water-system-infrastructure-c3', 'ofg-s5-water-system-infrastructure-c4']),
      dg('ofg-s5-water-system-infrastructure-dg3', 'Manual fill & local repairability', ['ofg-s5-water-system-infrastructure-c5', 'ofg-s5-water-system-infrastructure-c6']),
    ],
    completionGate:
      'Water system design approved. Primary and backup confirmed. All components locally repairable.',
    actHandoff: 'Water System Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the Tier-3 water system strategy and redundancy decision.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Stored water level in days-of-reserve per person across the tank array', frequency: 'weekly, daily in dry season' },
        { metric: 'Primary vs. backup source supply split and combined yield vs. demand', frequency: 'monthly' },
        { metric: 'Treatment train output quality and filter or disinfection consumable status', frequency: 'monthly' },
      ],
      triggers: [
        'Stored reserve drops below the defined minimum days-per-person -> bring the backup source online and restrict non-essential draw',
        'Pressurised distribution loses supply to a dwelling or production point -> open the manual fill point and repair the powered line',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 'ofg-s5-energy-system-infrastructure',
    stratumId: 's5-system-design',
    ref: 'OFG-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design energy system infrastructure',
    shortTitle: 'Energy system infrastructure',
    focusedQuestion:
      'How will generation, storage, and backup energy infrastructure be designed and sized for worst-case month performance?',
    checklist: [
      ck('ofg-s5-energy-system-infrastructure-c1', 'Design solar array - panel count, orientation, mounting, shading management', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-energy-system-infrastructure-c2', 'Design battery bank - capacity, chemistry, BMS, temperature management', { feeds: ['ofg-s6-systems-performance-monitoring', 'ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-energy-system-infrastructure-c3', 'Design inverter and charge controller - capacity and redundancy', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-energy-system-infrastructure-c4', 'Design backup generator - sizing, fuel storage, exhaust, automatic or manual changeover', { feeds: ['ofg-s7-resourcing-supply-chain'] }),
      ck('ofg-s5-energy-system-infrastructure-c5', 'Design critical load circuit - protected from non-critical loads during shortage', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-energy-system-infrastructure-c6', 'Specify all components to be locally serviceable - no specialist-only systems', { feeds: ['ofg-s7-resourcing-supply-chain'] }),
    ],
    decisionGroups: [
      dg('ofg-s5-energy-system-infrastructure-dg1', 'Solar array & battery bank', ['ofg-s5-energy-system-infrastructure-c1', 'ofg-s5-energy-system-infrastructure-c2']),
      dg('ofg-s5-energy-system-infrastructure-dg2', 'Inverter & backup generator', ['ofg-s5-energy-system-infrastructure-c3', 'ofg-s5-energy-system-infrastructure-c4']),
      dg('ofg-s5-energy-system-infrastructure-dg3', 'Critical load circuit & serviceability', ['ofg-s5-energy-system-infrastructure-c5', 'ofg-s5-energy-system-infrastructure-c6']),
    ],
    completionGate:
      'Energy system design approved. Worst-case month performance confirmed. All components locally serviceable.',
    actHandoff: 'Energy System Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the Tier-3 energy system strategy and redundancy decision.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Battery bank state of charge and days-of-critical-load remaining', frequency: 'daily' },
        { metric: 'Solar generation vs. critical-load demand', frequency: 'weekly, daily in the worst-case month' },
        { metric: 'Inverter and charge controller status plus backup generator fuel reserve', frequency: 'monthly' },
      ],
      triggers: [
        'Battery state of charge falls below the protected reserve floor -> shed non-critical loads on the critical circuit and start the backup generator',
        'Generation falls short of critical load over consecutive days -> hold load management and reassess array or battery sizing',
      ],
      feeds: 'energy-resources',
    },
  }),
  obj({
    id: 'ofg-s5-shelter-thermal-infrastructure',
    stratumId: 's5-system-design',
    ref: 'OFG-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design shelter & thermal performance infrastructure',
    shortTitle: 'Shelter & thermal infrastructure',
    focusedQuestion:
      'How will the dwelling be designed to maintain safe thermal conditions - insulation, heating, and backup?',
    checklist: [
      ck('ofg-s5-shelter-thermal-infrastructure-c1', 'Design insulation system - walls, floor, ceiling to defined thermal performance standard', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-shelter-thermal-infrastructure-c2', 'Design primary heating system - wood stove, solar thermal, or hybrid', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-shelter-thermal-infrastructure-c3', 'Design backup heating - separate fuel source or passive fallback', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-shelter-thermal-infrastructure-c4', 'Design fuel storage - volume for defined reserve, safety separation from dwelling', { feeds: ['ofg-s6-systems-performance-monitoring', 'ofg-s7-resourcing-supply-chain'] }),
      ck('ofg-s5-shelter-thermal-infrastructure-c5', 'Design passive solar gain where climate supports it'),
      ck('ofg-s5-shelter-thermal-infrastructure-c6', 'Specify construction standard for airtightness and thermal bridging reduction', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
    ],
    decisionGroups: [
      dg('ofg-s5-shelter-thermal-infrastructure-dg1', 'Insulation & primary heating', ['ofg-s5-shelter-thermal-infrastructure-c1', 'ofg-s5-shelter-thermal-infrastructure-c2']),
      dg('ofg-s5-shelter-thermal-infrastructure-dg2', 'Backup heating & fuel storage', ['ofg-s5-shelter-thermal-infrastructure-c3', 'ofg-s5-shelter-thermal-infrastructure-c4']),
      dg('ofg-s5-shelter-thermal-infrastructure-dg3', 'Passive solar & construction standard', ['ofg-s5-shelter-thermal-infrastructure-c5', 'ofg-s5-shelter-thermal-infrastructure-c6']),
    ],
    completionGate:
      'Shelter and thermal performance design approved. Primary and backup heating confirmed. Fuel reserve specified.',
    actHandoff: 'Shelter & Thermal Performance Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the Tier-3 shelter resilience and thermal performance decision.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Indoor temperature vs. the thermal performance standard through the coldest period', frequency: 'daily in winter' },
        { metric: 'Heating fuel reserve in weeks-of-supply at peak demand', frequency: 'weekly through cold season' },
        { metric: 'Primary heating output and airtightness or insulation condition', frequency: 'monthly in heating season' },
      ],
      triggers: [
        'Indoor temperature falls below the defined minimum -> bring the backup heating system online and inspect the primary unit',
        'Fuel reserve drops below the defined weeks-of-supply -> trigger resupply before the next cold spell',
      ],
      feeds: 'built-infrastructure',
    },
  }),
  obj({
    id: 'ofg-s5-food-production-infrastructure',
    stratumId: 's5-system-design',
    ref: 'OFG-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design food production & storage infrastructure',
    shortTitle: 'Food production & storage infrastructure',
    focusedQuestion:
      'How will growing zones, root cellar, cold storage, and preservation infrastructure be designed?',
    checklist: [
      ck('ofg-s5-food-production-infrastructure-c1', 'Design food production zones - garden beds, orchard, animal infrastructure', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-food-production-infrastructure-c2', 'Design root cellar or cool room - temperature, humidity, ventilation', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-food-production-infrastructure-c3', 'Design food preservation infrastructure - drying racks, canning station, fermentation area', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-food-production-infrastructure-c4', 'Design seed saving and propagation infrastructure', { feeds: ['ofg-s7-resourcing-supply-chain'] }),
      ck('ofg-s5-food-production-infrastructure-c5', 'Design food storage inventory system - minimum reserve tracking', { feeds: ['ofg-s6-systems-performance-monitoring'] }),
    ],
    decisionGroups: [
      dg('ofg-s5-food-production-infrastructure-dg1', 'Production zones & cold storage', ['ofg-s5-food-production-infrastructure-c1', 'ofg-s5-food-production-infrastructure-c2']),
      dg('ofg-s5-food-production-infrastructure-dg2', 'Preservation & seed saving', ['ofg-s5-food-production-infrastructure-c3', 'ofg-s5-food-production-infrastructure-c4']),
      dg('ofg-s5-food-production-infrastructure-dg3', 'Inventory & reserve tracking', ['ofg-s5-food-production-infrastructure-c5']),
    ],
    completionGate:
      'Food production and storage infrastructure design approved. Reserve target achievable with designed capacity.',
    actHandoff: 'Food Production & Storage Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the Tier-3 food security and storage strategy decision.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Food reserve on hand in weeks-of-supply for all residents', frequency: 'monthly' },
        { metric: 'Production yield by zone vs. target across garden, orchard, and animals', frequency: 'per harvest cycle' },
        { metric: 'Root cellar and cold storage temperature, humidity, and throughput vs. plan', frequency: 'seasonal' },
      ],
      triggers: [
        'Reserve falls below the minimum weeks-of-supply threshold -> activate the resupply protocol and shift surplus into preservation',
        'Root cellar or cold storage drifts outside its temperature or humidity band -> service ventilation and move at-risk stock to a stable method',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'ofg-s5-communications-emergency-infrastructure',
    stratumId: 's5-system-design',
    ref: 'OFG-S5.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design communications & emergency infrastructure',
    shortTitle: 'Communications & emergency infrastructure',
    focusedQuestion:
      'How will communications and emergency response infrastructure be designed and installed?',
    checklist: [
      ck('ofg-s5-communications-emergency-infrastructure-c1', 'Design satellite communications system - antenna placement, power supply, backup power', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-communications-emergency-infrastructure-c2', 'Design emergency alert system - PLB placement and activation protocol', { feeds: ['ofg-s6-emergency-preparedness-monitoring', 'ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s5-communications-emergency-infrastructure-c3', 'Design VHF/UHF radio system if applicable - antenna, coverage test', { feeds: ['ofg-s6-emergency-preparedness-monitoring'] }),
      ck('ofg-s5-communications-emergency-infrastructure-c4', 'Design first aid station - equipment, storage, access', { feeds: ['ofg-s7-resourcing-supply-chain'] }),
      ck('ofg-s5-communications-emergency-infrastructure-c5', 'Design fire safety infrastructure - extinguishers, fire blankets, roof access', { feeds: ['ofg-s6-emergency-preparedness-monitoring'] }),
      ck('ofg-s5-communications-emergency-infrastructure-c6', 'Design emergency assembly point and signage', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
    ],
    decisionGroups: [
      dg('ofg-s5-communications-emergency-infrastructure-dg1', 'Satellite comms & emergency alert', ['ofg-s5-communications-emergency-infrastructure-c1', 'ofg-s5-communications-emergency-infrastructure-c2']),
      dg('ofg-s5-communications-emergency-infrastructure-dg2', 'Radio & first aid station', ['ofg-s5-communications-emergency-infrastructure-c3', 'ofg-s5-communications-emergency-infrastructure-c4']),
      dg('ofg-s5-communications-emergency-infrastructure-dg3', 'Fire safety & assembly point', ['ofg-s5-communications-emergency-infrastructure-c5', 'ofg-s5-communications-emergency-infrastructure-c6']),
    ],
    completionGate:
      'Communications and emergency infrastructure design approved. All systems tested before habitation.',
    actHandoff: 'Communications & Emergency Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the Tier-3 emergency communications and response strategy decision.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Satellite and backup radio check-in success rate plus device power status', frequency: 'weekly' },
        { metric: 'Emergency alert beacon and fire safety equipment readiness on inspection', frequency: 'monthly' },
        { metric: 'First aid station stock currency and assembly point access', frequency: 'quarterly review' },
      ],
      triggers: [
        'Primary satellite link fails a check-in -> switch to the backup radio method and arrange repair or replacement',
        'Fire safety equipment or first aid stock is found expired or depleted -> restock before continued habitation',
      ],
      feeds: 'risk-compliance',
    },
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'ofg-s6-systems-performance-monitoring',
    stratumId: 's6-integration-design',
    ref: 'OFG-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design systems performance & redundancy monitoring',
    shortTitle: 'Systems performance & redundancy monitoring',
    focusedQuestion:
      'How will water yield, energy balance, food stores, and fuel levels be tracked as life-safety indicators?',
    checklist: [
      ck('ofg-s6-systems-performance-monitoring-c1', 'Define critical system indicators - tank levels, battery state of charge, fuel stores, food reserve weeks', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s6-systems-performance-monitoring-c2', 'Design monitoring method for each indicator - gauge, meter, manual check', { feeds: ['ofg-s7-resourcing-supply-chain'] }),
      ck('ofg-s6-systems-performance-monitoring-c3', 'Define minimum threshold alerts - what level triggers a response before life-safety is compromised', { feeds: ['ofg-s7-resourcing-supply-chain'] }),
      ck('ofg-s6-systems-performance-monitoring-c4', 'Define monitoring frequency - daily for life-safety systems'),
      ck('ofg-s6-systems-performance-monitoring-c5', 'Design log system - simple, auditable, maintainable at remote location', { feeds: ['ofg-s7-phased-habitation'] }),
    ],
    decisionGroups: [
      dg('ofg-s6-systems-performance-monitoring-dg1', 'Indicators & monitoring method', ['ofg-s6-systems-performance-monitoring-c1', 'ofg-s6-systems-performance-monitoring-c2']),
      dg('ofg-s6-systems-performance-monitoring-dg2', 'Threshold alerts & frequency', ['ofg-s6-systems-performance-monitoring-c3', 'ofg-s6-systems-performance-monitoring-c4']),
      dg('ofg-s6-systems-performance-monitoring-dg3', 'Log system', ['ofg-s6-systems-performance-monitoring-c5']),
    ],
    completionGate:
      'Systems performance monitoring designed. Minimum thresholds and alert protocols defined for all life-safety indicators.',
    actHandoff: 'Systems Performance & Redundancy Monitoring System',
  }),
  obj({
    id: 'ofg-s6-emergency-preparedness-monitoring',
    stratumId: 's6-integration-design',
    ref: 'OFG-S6.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design emergency preparedness & response monitoring',
    shortTitle: 'Emergency preparedness monitoring',
    focusedQuestion:
      'How will evacuation route conditions, communications status, and emergency contact currency be actively maintained?',
    checklist: [
      ck('ofg-s6-emergency-preparedness-monitoring-c1', 'Define seasonal access road assessment schedule - before wet season, before fire season', { feeds: ['ofg-s7-resourcing-supply-chain'] }),
      ck('ofg-s6-emergency-preparedness-monitoring-c2', 'Define communications system test schedule - monthly at minimum', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s6-emergency-preparedness-monitoring-c3', 'Define emergency contact list review schedule - annually'),
      ck('ofg-s6-emergency-preparedness-monitoring-c4', 'Define fire risk assessment schedule - seasonal fuel load check'),
      ck('ofg-s6-emergency-preparedness-monitoring-c5', 'Design emergency preparedness drill schedule - residents practise protocols annually', { feeds: ['ofg-s7-phased-habitation'] }),
    ],
    decisionGroups: [
      dg('ofg-s6-emergency-preparedness-monitoring-dg1', 'Access road & comms test schedules', ['ofg-s6-emergency-preparedness-monitoring-c1', 'ofg-s6-emergency-preparedness-monitoring-c2']),
      dg('ofg-s6-emergency-preparedness-monitoring-dg2', 'Contact review & fire risk schedules', ['ofg-s6-emergency-preparedness-monitoring-c3', 'ofg-s6-emergency-preparedness-monitoring-c4']),
      dg('ofg-s6-emergency-preparedness-monitoring-dg3', 'Drill schedule', ['ofg-s6-emergency-preparedness-monitoring-c5']),
    ],
    completionGate:
      'Emergency preparedness monitoring approved. Assessment and drill schedules defined.',
    actHandoff: 'Emergency Preparedness & Response Monitoring System',
  }),
  obj({
    id: 'ofg-s6-adaptive-management',
    stratumId: 's6-integration-design',
    ref: 'OFG-S6.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define adaptive management protocol',
    shortTitle: 'Adaptive management protocol',
    focusedQuestion:
      'How will monitoring findings trigger changes to systems and management - especially after seasonal failures or unexpected events?',
    checklist: [
      ck('ofg-s6-adaptive-management-c1', 'Define seasonal review process - after each worst-case season, review all system performance', { feeds: ['ofg-s7-phased-habitation'] }),
      ck('ofg-s6-adaptive-management-c2', 'Define decision triggers - what system performance outcome requires a design or capacity change', { feeds: ['ofg-s7-resourcing-supply-chain'] }),
      ck('ofg-s6-adaptive-management-c3', 'Define failure response protocol - what immediate actions follow a system failure', { feeds: ['ofg-s7-systems-establishment-sequence'] }),
      ck('ofg-s6-adaptive-management-c4', 'Document all system changes with date, cause, and outcome'),
      ck('ofg-s6-adaptive-management-c5', 'Define 3-year comprehensive review against Tier 0 independence targets'),
    ],
    decisionGroups: [
      dg('ofg-s6-adaptive-management-dg1', 'Seasonal review & triggers', ['ofg-s6-adaptive-management-c1', 'ofg-s6-adaptive-management-c2']),
      dg('ofg-s6-adaptive-management-dg2', 'Failure response & documentation', ['ofg-s6-adaptive-management-c3', 'ofg-s6-adaptive-management-c4']),
      dg('ofg-s6-adaptive-management-dg3', '3-year comprehensive review', ['ofg-s6-adaptive-management-c5']),
    ],
    completionGate:
      'Adaptive management protocol approved. Seasonal review, failure response, and documentation confirmed.',
    actHandoff: 'Adaptive Management Protocol',
    scopeNotes:
      'Principle 9 exception: adaptive management is placed in Tier 5 (this stratum) for Off-Grid because for life-safety systems monitoring and adaptation are operationally inseparable. The review cycle is tied to seasons, not the annual calendar.',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'ofg-s7-systems-establishment-sequence',
    stratumId: 's7-phasing-resourcing',
    ref: 'OFG-S7.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define systems establishment sequence',
    shortTitle: 'Systems establishment sequence',
    focusedQuestion:
      'In what order will critical systems be established - and what hard gates prevent habitation before systems are confirmed?',
    checklist: [
      ck('ofg-s7-systems-establishment-sequence-c1', 'Confirm energy system installed and tested before water system commissioning'),
      ck('ofg-s7-systems-establishment-sequence-c2', 'Confirm water system installed, tested, and potable before habitation'),
      ck('ofg-s7-systems-establishment-sequence-c3', 'Confirm communications and emergency systems installed and tested before habitation'),
      ck('ofg-s7-systems-establishment-sequence-c4', 'Confirm shelter thermal performance verified before first winter occupancy'),
      ck('ofg-s7-systems-establishment-sequence-c5', 'Confirm food production infrastructure in place before reliance on reserves begins'),
      ck('ofg-s7-systems-establishment-sequence-c6', 'Define go/no-go test for each system - pass/fail confirmation before next system commences'),
    ],
    decisionGroups: [
      dg('ofg-s7-systems-establishment-sequence-dg1', 'Energy & water sequencing', ['ofg-s7-systems-establishment-sequence-c1', 'ofg-s7-systems-establishment-sequence-c2']),
      dg('ofg-s7-systems-establishment-sequence-dg2', 'Comms, shelter & food sequencing', ['ofg-s7-systems-establishment-sequence-c3', 'ofg-s7-systems-establishment-sequence-c4', 'ofg-s7-systems-establishment-sequence-c5']),
      dg('ofg-s7-systems-establishment-sequence-dg3', 'Go/no-go tests', ['ofg-s7-systems-establishment-sequence-c6']),
    ],
    completionGate:
      'Systems establishment sequence approved. Go/no-go test defined for each system. No habitation before all life-safety systems pass.',
    actHandoff: 'Systems Establishment Sequence',
    progressTracking: {
      milestones: [
        { metric: 'Go/no-go test pass per system before the next system commences', cadence: 'per system' },
        { metric: 'Water / energy / shelter / emergency-comms go/no-go passed before any habitation', cadence: 'one-time gate, before occupancy' },
      ],
    },
    scopeNotes:
      'Hard gate: no permanent habitation until water (potable), energy (critical loads), shelter (thermal performance), and emergency communications all pass their go/no-go tests. These are confirmed independently, not self-certified.',
  }),
  obj({
    id: 'ofg-s7-resourcing-supply-chain',
    stratumId: 's7-phasing-resourcing',
    ref: 'OFG-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define resourcing & supply chain plan',
    shortTitle: 'Resourcing & supply chain plan',
    focusedQuestion:
      'How will materials, equipment, and ongoing supplies reach this remote site - accounting for seasonal access windows and lead times?',
    checklist: [
      ck('ofg-s7-resourcing-supply-chain-c1', 'Map all materials required for Phase 1 against access window calendar'),
      ck('ofg-s7-resourcing-supply-chain-c2', 'Identify long lead-time items and order well ahead of access window'),
      ck('ofg-s7-resourcing-supply-chain-c3', 'Define ongoing resupply schedule - frequency, volume, transport method'),
      ck('ofg-s7-resourcing-supply-chain-c4', 'Define emergency resupply protocol - what triggers an unscheduled supply run'),
      ck('ofg-s7-resourcing-supply-chain-c5', 'Define minimum on-site inventory for all critical consumables - fuel, water treatment, food, medical'),
    ],
    decisionGroups: [
      dg('ofg-s7-resourcing-supply-chain-dg1', 'Materials calendar & lead times', ['ofg-s7-resourcing-supply-chain-c1', 'ofg-s7-resourcing-supply-chain-c2']),
      dg('ofg-s7-resourcing-supply-chain-dg2', 'Resupply schedule & emergency protocol', ['ofg-s7-resourcing-supply-chain-c3', 'ofg-s7-resourcing-supply-chain-c4']),
      dg('ofg-s7-resourcing-supply-chain-dg3', 'Minimum critical inventory', ['ofg-s7-resourcing-supply-chain-c5']),
    ],
    completionGate:
      'Resourcing and supply chain plan approved. All Phase 1 materials scheduled within access windows.',
    actHandoff: 'Resourcing & Supply Chain Plan',
    progressTracking: {
      milestones: [
        { metric: 'Phase 1 materials ordered + scheduled within access windows', cadence: 'per access window' },
        { metric: 'On-site critical consumables vs. defined minimum inventory', cadence: 'per resupply cycle' },
      ],
    },
  }),
  obj({
    id: 'ofg-s7-phased-habitation',
    stratumId: 's7-phasing-resourcing',
    ref: 'OFG-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define phased habitation plan',
    shortTitle: 'Phased habitation plan',
    focusedQuestion:
      'When is this site safe to occupy - and what is the confirmed habitability threshold per critical system?',
    checklist: [
      ck('ofg-s7-phased-habitation-c1', 'Define habitability threshold per system - potable water confirmed, energy critical loads operational, thermal performance verified, emergency communications tested'),
      ck('ofg-s7-phased-habitation-c2', 'Define habitability confirmation process - independent verification, not self-certification'),
      ck('ofg-s7-phased-habitation-c3', 'Define temporary living arrangement during establishment phase'),
      ck('ofg-s7-phased-habitation-c4', 'Define go/no-go for each cohort or seasonal occupation'),
      ck('ofg-s7-phased-habitation-c5', 'Confirm all residents understand and accept life-safety protocols before first occupation'),
    ],
    decisionGroups: [
      dg('ofg-s7-phased-habitation-dg1', 'Habitability thresholds & verification', ['ofg-s7-phased-habitation-c1', 'ofg-s7-phased-habitation-c2']),
      dg('ofg-s7-phased-habitation-dg2', 'Temporary living & cohort go/no-go', ['ofg-s7-phased-habitation-c3', 'ofg-s7-phased-habitation-c4']),
      dg('ofg-s7-phased-habitation-dg3', 'Resident protocol acceptance', ['ofg-s7-phased-habitation-c5']),
    ],
    completionGate:
      'Phased habitation plan approved. Habitability thresholds confirmed as hard gates independently verified.',
    actHandoff: 'Phased Habitation Plan',
    progressTracking: {
      milestones: [
        { metric: 'Habitability thresholds independently verified before each occupation', cadence: 'per cohort / seasonal occupation' },
        { metric: 'Residents confirmed understanding + acceptance of life-safety protocols before first occupation', cadence: 'per resident, before occupation' },
      ],
    },
    scopeNotes:
      'Habitability thresholds are hard gates - potable water, energy critical loads, thermal performance, and emergency communications must each be independently verified, not self-certified, before first occupation.',
  }),
];

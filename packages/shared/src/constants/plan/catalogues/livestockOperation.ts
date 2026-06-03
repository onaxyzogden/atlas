// catalogues/livestockOperation.ts
//
// Livestock Operation PRIMARY-type objectives - the 23 type-specific objectives
// a standalone Livestock Operation project adds on top of the 19 Universal
// objectives (authored to Catalogue Authoring Standards v1.4 under the hybrid
// "draft -> operator ratify -> encode" authorization; the ratified markdown
// draft lives at atlas/docs/catalogues/livestock-operation-draft.md, framing A).
//
// This file holds ONLY the primary-layer standalone objectives. The universal
// slot lives in ./universal.ts (the shared baseline).
//
// Distinct-type rationale: silvopasture.ts is subtitled "Livestock Land
// Management" and integrates trees + forage + livestock on shared ground. This
// catalogue is the ANIMAL ENTERPRISE as the organizing core - breeding, herd
// health, year-round animal nutrition, processing/marketing - with tree
// integration explicitly out of frame. A steward picks one primary type, so
// parallel content across the two types (each has its own water/forage/break-even
// objective) is expected and acceptable.
//
// Count note: 19 universal + 23 primary = 42 total. Per-stratum primary counts
// (3+3+3+4+4+3+3 = 23). Strata map to the codebase spine s1..s7; refs are
// stamped LVS-S<stratum>.<n>, starting at .4/.5 per stratum so they never
// collide with the universal slots (which occupy .1-.3).
//
// Formula bindings: this catalogue is the first dedicated home for all six
// livestock/grazing ObjectiveFormulaIds already shipped in the schema and
// resolved app-side by formulaCatalog.ts. Eight ckF items bind them:
//   forage-carrying-capacity   -> LVS-S3.5 c1
//   carrying-capacity-seasonal -> LVS-S3.5 c2, LVS-S5.8 c1
//   paddock-stocking-density   -> LVS-S4.6 c1, LVS-S5.5 c2
//   stock-water-demand         -> LVS-S4.8 c1
//   paddock-system-capacity    -> LVS-S5.5 c1
//   enterprise-break-even      -> LVS-S7.6 c3
//
// Hard gate: LVS-S7.5 (herd build-up & establishment sequence) carries a hard
// gate - no livestock are introduced before fencing, water, and handling
// facilities each pass an independent go/no-go test (grazing-establishment best
// practice, mirroring SILV-S7.4).
//
// Amanah Gate: LVS-S7.7 c3 surfaces meat-share / herd-share / CSA-style
// advance-subscription sales channels but flags them in scopeNotes - they entail
// advance sale of not-yet-possessed animals or yield (bay` ma laysa `indak),
// route to Scholar Council review before adoption, are never defaulted, and no
// CSRA / salam advance-purchase framing is used. The channel is surfaced, never
// silently omitted. LVS-S7.6 is ordinary break-even budgeting only (no advance
// sale, no financial product, no riba- or gharar-adjacent content).
//
// source: 'primary', sourceTypeId: 'livestock_operation' on every objective.
// ASCII-only copy: em/en dashes -> " - "; curly quotes -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, ckF, dg, obj } from './authoring.js';

const PRIMARY = 'livestock_operation' as const;

export const LIVESTOCK_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'lvs-s1-enterprise-vision',
    stratumId: 's1-project-foundation',
    ref: 'LVS-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear livestock enterprise vision & species mix',
    shortTitle: 'Livestock enterprise vision & species mix',
    focusedQuestion:
      'What animals will this operation run, at what scale, and toward what production purpose?',
    checklist: [
      ck(
        'lvs-s1-enterprise-vision-c1',
        'Define the enterprise type(s) - breeding herd/flock, grow-out/finishing, dairy, fibre, dual-purpose, or mixed',
      ),
      ck(
        'lvs-s1-enterprise-vision-c2',
        'Define species and candidate breeds - cattle, sheep, goats, pigs, poultry, or combination',
      ),
      ck(
        'lvs-s1-enterprise-vision-c3',
        'Define production intent per species - meat, milk, eggs, fibre, breeding stock, land improvement',
      ),
      ck(
        'lvs-s1-enterprise-vision-c4',
        'Define the integration logic between species if multi-species - leader-follower grazing, niche separation',
      ),
      ck(
        'lvs-s1-enterprise-vision-c5',
        'Confirm the enterprise vision fits the steward experience and available labour',
      ),
      ck(
        'lvs-s1-enterprise-vision-c6',
        'Confirm the vision is consistent with the site climate and feed base',
      ),
    ],
    decisionGroups: [
      dg('lvs-s1-enterprise-vision-dg1', 'Enterprise & species', ['lvs-s1-enterprise-vision-c1', 'lvs-s1-enterprise-vision-c2']),
      dg('lvs-s1-enterprise-vision-dg2', 'Production intent & integration', ['lvs-s1-enterprise-vision-c3', 'lvs-s1-enterprise-vision-c4']),
      dg('lvs-s1-enterprise-vision-dg3', 'Capacity & site fit', ['lvs-s1-enterprise-vision-c5', 'lvs-s1-enterprise-vision-c6']),
    ],
    completionGate:
      'Livestock enterprise vision approved. Species, scale, and production intent confirmed.',
    actHandoff: 'Livestock Enterprise Vision & Species Mix Brief',
  }),
  obj({
    id: 'lvs-s1-production-goals',
    stratumId: 's1-project-foundation',
    ref: 'LVS-S1.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Clear production goals, scale & stewardship capacity',
    shortTitle: 'Production goals, scale & capacity',
    focusedQuestion:
      'What output does this operation aim for, and is that scale carriable by the steward time, skill, and capital?',
    checklist: [
      ck(
        'lvs-s1-production-goals-c1',
        'Define measurable production targets - head sold/yr, kg liveweight, litres, dozen eggs, breeding replacements',
      ),
      ck(
        'lvs-s1-production-goals-c2',
        'Define the target full-establishment herd/flock size',
      ),
      ck(
        'lvs-s1-production-goals-c3',
        'Define the establishment horizon - how many seasons to reach full scale',
      ),
      ck(
        'lvs-s1-production-goals-c4',
        'Assess steward stockmanship capacity - daily check, handling, calving/lambing, health intervention skill',
      ),
      ck(
        'lvs-s1-production-goals-c5',
        'Confirm capital and operating budget envelope is realistic for the scale',
      ),
      ck(
        'lvs-s1-production-goals-c6',
        'Confirm a continuity / absence-cover plan exists - animals need daily care',
      ),
    ],
    decisionGroups: [
      dg('lvs-s1-production-goals-dg1', 'Targets & scale', ['lvs-s1-production-goals-c1', 'lvs-s1-production-goals-c2', 'lvs-s1-production-goals-c3']),
      dg('lvs-s1-production-goals-dg2', 'Steward capacity', ['lvs-s1-production-goals-c4', 'lvs-s1-production-goals-c6']),
      dg('lvs-s1-production-goals-dg3', 'Capital envelope', ['lvs-s1-production-goals-c5']),
    ],
    completionGate:
      'Production goals and target scale approved and confirmed within steward capacity.',
    actHandoff: 'Production Goals & Capacity Brief',
  }),
  obj({
    id: 'lvs-s1-welfare-ethic',
    stratumId: 's1-project-foundation',
    ref: 'LVS-S1.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear animal welfare & husbandry ethic',
    shortTitle: 'Animal welfare & husbandry ethic',
    focusedQuestion:
      'What minimum welfare standards govern every management decision - feed, water, shelter, handling, and end-of-life?',
    checklist: [
      ck(
        'lvs-s1-welfare-ethic-c1',
        'Define minimum space and stocking-density standards per species',
      ),
      ck(
        'lvs-s1-welfare-ethic-c2',
        'Define shelter standards per species - shade, wind protection, wet-weather and extreme-heat/cold refuge',
      ),
      ck(
        'lvs-s1-welfare-ethic-c3',
        'Define constant access to feed and clean water as a standing requirement',
      ),
      ck(
        'lvs-s1-welfare-ethic-c4',
        'Define a low-stress handling commitment and handling-frequency norms',
      ),
      ck(
        'lvs-s1-welfare-ethic-c5',
        'Define a humane health-intervention and end-of-life / emergency-euthanasia protocol',
      ),
      ck(
        'lvs-s1-welfare-ethic-c6',
        'Confirm standards meet or exceed applicable animal-welfare legislation',
      ),
    ],
    decisionGroups: [
      dg('lvs-s1-welfare-ethic-dg1', 'Space, shelter & sustenance', ['lvs-s1-welfare-ethic-c1', 'lvs-s1-welfare-ethic-c2', 'lvs-s1-welfare-ethic-c3']),
      dg('lvs-s1-welfare-ethic-dg2', 'Handling & intervention', ['lvs-s1-welfare-ethic-c4', 'lvs-s1-welfare-ethic-c5']),
      dg('lvs-s1-welfare-ethic-dg3', 'Compliance', ['lvs-s1-welfare-ethic-c6']),
    ],
    completionGate:
      'Animal welfare and husbandry ethic defined and confirmed legislation-compliant.',
    actHandoff: 'Animal Welfare & Husbandry Standards Brief',
    scopeNotes:
      'Welfare ethic reflects a duty of excellent care (ihsan) to the animals in the steward trust; kept operational here.',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'lvs-s2-forage-base',
    stratumId: 's2-land-reading',
    ref: 'LVS-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of the forage & feed base',
    shortTitle: 'Forage & feed base',
    focusedQuestion:
      'What does the land currently grow as feed, and how much of the year ration can it supply?',
    checklist: [
      ck(
        'lvs-s2-forage-base-c1',
        'Map pasture/forage communities by zone - species composition and ground cover',
      ),
      ck(
        'lvs-s2-forage-base-c2',
        'Assess forage condition per zone - excellent, good, fair, poor, degraded',
      ),
      ck(
        'lvs-s2-forage-base-c3',
        'Identify desirable forage species and legume content present',
      ),
      ck(
        'lvs-s2-forage-base-c4',
        'Identify weed, toxic, and bare-ground problem areas',
      ),
      ck(
        'lvs-s2-forage-base-c5',
        'Record seasonal forage availability and quality curve across the year',
      ),
      ck(
        'lvs-s2-forage-base-c6',
        'Estimate the share of annual feed the land can supply vs bought-in feed',
      ),
    ],
    decisionGroups: [
      dg('lvs-s2-forage-base-dg1', 'Composition & condition', ['lvs-s2-forage-base-c1', 'lvs-s2-forage-base-c2'], ['Vegetation & Succession']),
      dg('lvs-s2-forage-base-dg2', 'Desirable vs problem species', ['lvs-s2-forage-base-c3', 'lvs-s2-forage-base-c4'], ['Vegetation & Succession']),
      dg('lvs-s2-forage-base-dg3', 'Seasonality & self-sufficiency', ['lvs-s2-forage-base-c5', 'lvs-s2-forage-base-c6']),
    ],
    completionGate:
      'Forage and feed base mapped. Seasonal supply curve and feed self-sufficiency estimated.',
    actHandoff: 'Forage & Feed Base Survey',
  }),
  obj({
    id: 'lvs-s2-stock-water-sources',
    stratumId: 's2-land-reading',
    ref: 'LVS-S2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of stock water sources',
    shortTitle: 'Stock water sources',
    focusedQuestion:
      'Where does livestock drinking water come from, how reliable is it, and how is it currently delivered?',
    checklist: [
      ck(
        'lvs-s2-stock-water-sources-c1',
        'Inventory all potential stock-water sources - wells, dams/ponds, streams, mains, rainwater',
      ),
      ck(
        'lvs-s2-stock-water-sources-c2',
        'Assess each source reliability across seasons and drought',
      ),
      ck(
        'lvs-s2-stock-water-sources-c3',
        'Test/record water quality and stock-suitability concerns',
      ),
      ck(
        'lvs-s2-stock-water-sources-c4',
        'Map existing reticulation - pipes, troughs, tanks, pumps and their condition',
      ),
      ck(
        'lvs-s2-stock-water-sources-c5',
        'Identify paddocks/zones with no current water access',
      ),
    ],
    decisionGroups: [
      dg('lvs-s2-stock-water-sources-dg1', 'Sources & reliability', ['lvs-s2-stock-water-sources-c1', 'lvs-s2-stock-water-sources-c2'], ['Hydrology & Water']),
      dg('lvs-s2-stock-water-sources-dg2', 'Quality', ['lvs-s2-stock-water-sources-c3'], ['Hydrology & Water']),
      dg('lvs-s2-stock-water-sources-dg3', 'Delivery & gaps', ['lvs-s2-stock-water-sources-c4', 'lvs-s2-stock-water-sources-c5'], ['Infrastructure & Access']),
    ],
    completionGate:
      'Stock water sources inventoried, reliability and quality assessed, access gaps identified.',
    actHandoff: 'Stock Water Source Survey',
  }),
  obj({
    id: 'lvs-s2-existing-infrastructure',
    stratumId: 's2-land-reading',
    ref: 'LVS-S2.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear read of existing livestock infrastructure',
    shortTitle: 'Existing livestock infrastructure',
    focusedQuestion:
      'What fencing, yards, shelters, and laneways already exist, and what is reusable?',
    checklist: [
      ck(
        'lvs-s2-existing-infrastructure-c1',
        'Inventory existing fencing - type, condition, and stock-tightness per species',
      ),
      ck(
        'lvs-s2-existing-infrastructure-c2',
        'Assess existing yards and handling facilities - capacity, layout, safety, condition',
      ),
      ck(
        'lvs-s2-existing-infrastructure-c3',
        'Assess existing shelters and barns - condition and species suitability',
      ),
      ck(
        'lvs-s2-existing-infrastructure-c4',
        'Map existing laneways and gateways - width, surface, flow, condition',
      ),
      ck(
        'lvs-s2-existing-infrastructure-c5',
        'Record reuse potential and obvious replacement needs',
      ),
    ],
    decisionGroups: [
      dg('lvs-s2-existing-infrastructure-dg1', 'Fencing & yards', ['lvs-s2-existing-infrastructure-c1', 'lvs-s2-existing-infrastructure-c2'], ['Infrastructure & Access']),
      dg('lvs-s2-existing-infrastructure-dg2', 'Shelter & circulation', ['lvs-s2-existing-infrastructure-c3', 'lvs-s2-existing-infrastructure-c4'], ['Infrastructure & Access']),
      dg('lvs-s2-existing-infrastructure-dg3', 'Reuse assessment', ['lvs-s2-existing-infrastructure-c5']),
    ],
    completionGate:
      'Existing livestock infrastructure inventoried; condition and reuse potential assessed.',
    actHandoff: 'Existing Livestock Infrastructure Survey',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'lvs-s3-carrying-capacity',
    stratumId: 's3-systems-reading',
    ref: 'LVS-S3.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear carrying-capacity & seasonal feed-supply read',
    shortTitle: 'Carrying capacity & seasonal feed supply',
    focusedQuestion:
      'How many animals can this land carry, and how does that capacity move with the seasons?',
    checklist: [
      ckF(
        'lvs-s3-carrying-capacity-c1',
        'Estimate forage dry-matter productivity per zone',
        {
          formulaId: 'forage-carrying-capacity',
          satisfiesWhenComputed: true,
          resultLabel: 'Forage-based carrying capacity',
        },
      ),
      ckF(
        'lvs-s3-carrying-capacity-c2',
        'Estimate seasonal carrying capacity across the year',
        {
          formulaId: 'carrying-capacity-seasonal',
          satisfiesWhenComputed: true,
          resultLabel: 'Seasonal carrying capacity',
        },
      ),
      ck(
        'lvs-s3-carrying-capacity-c3',
        'Identify the feed-deficit (bottleneck) season that sets the safe stocking ceiling',
      ),
      ck(
        'lvs-s3-carrying-capacity-c4',
        'Define the conservative vs productive stocking-rate scenarios',
      ),
      ck(
        'lvs-s3-carrying-capacity-c5',
        'Record assumptions and confidence level behind the estimate',
      ),
    ],
    decisionGroups: [
      dg('lvs-s3-carrying-capacity-dg1', 'Productivity & capacity', ['lvs-s3-carrying-capacity-c1', 'lvs-s3-carrying-capacity-c2']),
      dg('lvs-s3-carrying-capacity-dg2', 'Bottleneck & scenarios', ['lvs-s3-carrying-capacity-c3', 'lvs-s3-carrying-capacity-c4']),
      dg('lvs-s3-carrying-capacity-dg3', 'Assumptions', ['lvs-s3-carrying-capacity-c5']),
    ],
    completionGate:
      'Carrying capacity estimated across seasons; the limiting season and a safe stocking ceiling identified.',
    actHandoff: 'Carrying Capacity & Seasonal Feed-Supply Assessment',
  }),
  obj({
    id: 'lvs-s3-health-baseline',
    stratumId: 's3-systems-reading',
    ref: 'LVS-S3.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear animal-health & parasite baseline',
    shortTitle: 'Animal-health & parasite baseline',
    focusedQuestion:
      'What health, parasite, and disease pressures does this site and region carry before any stock arrive?',
    checklist: [
      ck(
        'lvs-s3-health-baseline-c1',
        'Record regional/endemic disease pressures relevant to the chosen species',
      ),
      ck(
        'lvs-s3-health-baseline-c2',
        'Record internal/external parasite pressure and known resistance issues',
      ),
      ck(
        'lvs-s3-health-baseline-c3',
        'Record soil/forage mineral status driving deficiency or toxicity risk',
      ),
      ck(
        'lvs-s3-health-baseline-c4',
        'Identify notifiable diseases and mandatory reporting/movement rules',
      ),
      ck(
        'lvs-s3-health-baseline-c5',
        'Record the nearest veterinary and diagnostic support and response time',
      ),
    ],
    decisionGroups: [
      dg('lvs-s3-health-baseline-dg1', 'Disease & parasite pressure', ['lvs-s3-health-baseline-c1', 'lvs-s3-health-baseline-c2']),
      dg('lvs-s3-health-baseline-dg2', 'Nutritional health risk', ['lvs-s3-health-baseline-c3']),
      dg('lvs-s3-health-baseline-dg3', 'Regulatory & support', ['lvs-s3-health-baseline-c4', 'lvs-s3-health-baseline-c5']),
    ],
    completionGate:
      'Health, parasite, and disease baseline documented for the site and chosen species.',
    actHandoff: 'Animal-Health & Parasite Baseline Report',
  }),
  obj({
    id: 'lvs-s3-predator-risk',
    stratumId: 's3-systems-reading',
    ref: 'LVS-S3.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A clear predator, biosecurity & climate-risk read',
    shortTitle: 'Predator, biosecurity & climate risk',
    focusedQuestion:
      'What predation, incursion, and climate hazards threaten the herd, and how exposed is the site?',
    checklist: [
      ck(
        'lvs-s3-predator-risk-c1',
        'Identify predator species and historical predation pressure by zone',
      ),
      ck(
        'lvs-s3-predator-risk-c2',
        'Identify biosecurity incursion vectors - boundaries, shared water, neighbour stock, wildlife',
      ),
      ck(
        'lvs-s3-predator-risk-c3',
        'Identify climate hazards to stock - heat, cold, flood, fire, drought',
      ),
      ck(
        'lvs-s3-predator-risk-c4',
        'Record boundary security and neighbour-stock contact risk',
      ),
      ck(
        'lvs-s3-predator-risk-c5',
        'Rank the risks by likelihood and impact',
      ),
    ],
    decisionGroups: [
      dg('lvs-s3-predator-risk-dg1', 'Predation & incursion', ['lvs-s3-predator-risk-c1', 'lvs-s3-predator-risk-c2']),
      dg('lvs-s3-predator-risk-dg2', 'Climate & boundary', ['lvs-s3-predator-risk-c3', 'lvs-s3-predator-risk-c4'], ['Risk & Suitability']),
      dg('lvs-s3-predator-risk-dg3', 'Risk ranking', ['lvs-s3-predator-risk-c5'], ['Risk & Suitability']),
    ],
    completionGate:
      'Predator, biosecurity, and climate risks identified and ranked.',
    actHandoff: 'Predator, Biosecurity & Climate Risk Reading',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'lvs-s4-species-breed',
    stratumId: 's4-foundation-decisions',
    ref: 'LVS-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A committed species & breed selection',
    shortTitle: 'Species & breed selection',
    focusedQuestion:
      'Which species and breeds are committed, and why do they fit this land and market?',
    checklist: [
      ck(
        'lvs-s4-species-breed-c1',
        'Commit final species selection against feed base and steward capacity',
      ),
      ck(
        'lvs-s4-species-breed-c2',
        'Commit breed(s) per species - hardiness, temperament, market fit, climate adaptation',
      ),
      ck(
        'lvs-s4-species-breed-c3',
        'Decide breeding-stock sourcing strategy - buy in, raise replacements, or both',
      ),
      ck(
        'lvs-s4-species-breed-c4',
        'Decide genetic/health entry standards for incoming stock',
      ),
      ck(
        'lvs-s4-species-breed-c5',
        'Confirm the selection against the welfare ethic and carrying capacity',
      ),
    ],
    decisionGroups: [
      dg('lvs-s4-species-breed-dg1', 'Species & breed', ['lvs-s4-species-breed-c1', 'lvs-s4-species-breed-c2']),
      dg('lvs-s4-species-breed-dg2', 'Sourcing & genetics', ['lvs-s4-species-breed-c3', 'lvs-s4-species-breed-c4']),
      dg('lvs-s4-species-breed-dg3', 'Cross-check', ['lvs-s4-species-breed-c5']),
    ],
    completionGate:
      'Species and breeds committed; sourcing and entry standards decided.',
    actHandoff: 'Species & Breed Selection Record',
  }),
  obj({
    id: 'lvs-s4-stocking-rate',
    stratumId: 's4-foundation-decisions',
    ref: 'LVS-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A committed stocking rate & herd-structure decision',
    shortTitle: 'Stocking rate & herd structure',
    focusedQuestion:
      'How many of each class of animal will the operation run, and how is the herd structured?',
    checklist: [
      ckF(
        'lvs-s4-stocking-rate-c1',
        'Decide the target stocking rate against the carrying-capacity ceiling',
        {
          formulaId: 'paddock-stocking-density',
          satisfiesWhenComputed: true,
          resultLabel: 'Stocking density',
        },
      ),
      ck(
        'lvs-s4-stocking-rate-c2',
        'Decide herd/flock structure - breeders, replacements, growers, finishers, sires',
      ),
      ck(
        'lvs-s4-stocking-rate-c3',
        'Decide the flex/destock policy for feed-deficit seasons and drought',
      ),
      ck(
        'lvs-s4-stocking-rate-c4',
        'Decide the replacement and culling rate to hold structure stable',
      ),
      ck(
        'lvs-s4-stocking-rate-c5',
        'Confirm the stocking decision leaves a feed-safety margin',
      ),
    ],
    decisionGroups: [
      dg('lvs-s4-stocking-rate-dg1', 'Rate & structure', ['lvs-s4-stocking-rate-c1', 'lvs-s4-stocking-rate-c2']),
      dg('lvs-s4-stocking-rate-dg2', 'Flex & turnover', ['lvs-s4-stocking-rate-c3', 'lvs-s4-stocking-rate-c4']),
      dg('lvs-s4-stocking-rate-dg3', 'Safety margin', ['lvs-s4-stocking-rate-c5']),
    ],
    completionGate:
      'Stocking rate and herd structure decided within the carrying-capacity safety margin.',
    actHandoff: 'Stocking Rate & Herd Structure Record',
  }),
  obj({
    id: 'lvs-s4-grazing-system',
    stratumId: 's4-foundation-decisions',
    ref: 'LVS-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A committed grazing / feeding system',
    shortTitle: 'Grazing / feeding system',
    focusedQuestion:
      'How will animals be fed across the year - set-stocked, rotated, mob-grazed, or confinement-fed?',
    checklist: [
      ck(
        'lvs-s4-grazing-system-c1',
        'Decide the core grazing method - continuous, rotational, adaptive multi-paddock, or mob',
      ),
      ck(
        'lvs-s4-grazing-system-c2',
        'Decide the role and timing of any confinement / barn feeding',
      ),
      ck(
        'lvs-s4-grazing-system-c3',
        'Decide rest-and-recovery rules - graze period, rest period, residual targets',
      ),
      ck(
        'lvs-s4-grazing-system-c4',
        'Decide the supplementary-feeding trigger and policy',
      ),
      ck(
        'lvs-s4-grazing-system-c5',
        'Confirm the system fits the welfare ethic, labour, and land-improvement intent',
      ),
    ],
    decisionGroups: [
      dg('lvs-s4-grazing-system-dg1', 'Method & confinement', ['lvs-s4-grazing-system-c1', 'lvs-s4-grazing-system-c2']),
      dg('lvs-s4-grazing-system-dg2', 'Recovery & supplements', ['lvs-s4-grazing-system-c3', 'lvs-s4-grazing-system-c4']),
      dg('lvs-s4-grazing-system-dg3', 'Cross-check', ['lvs-s4-grazing-system-c5']),
    ],
    completionGate:
      'Grazing/feeding system decided with rest, recovery, and supplement rules.',
    actHandoff: 'Grazing & Feeding System Record',
  }),
  obj({
    id: 'lvs-s4-stock-water-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'LVS-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A committed stock-water strategy',
    shortTitle: 'Stock-water strategy',
    focusedQuestion:
      'How will every animal reach clean water within welfare distance, in every season?',
    checklist: [
      ckF(
        'lvs-s4-stock-water-strategy-c1',
        'Compute peak stock-water demand vs available supply',
        {
          formulaId: 'stock-water-demand',
          satisfiesWhenComputed: true,
          resultLabel: 'Peak stock-water demand',
        },
      ),
      ck(
        'lvs-s4-stock-water-strategy-c2',
        'Decide source priority and any new source development',
      ),
      ck(
        'lvs-s4-stock-water-strategy-c3',
        'Decide the reticulation approach - gravity, pumped, storage buffering',
      ),
      ck(
        'lvs-s4-stock-water-strategy-c4',
        'Decide maximum walk-to-water distance per species and paddock',
      ),
      ck(
        'lvs-s4-stock-water-strategy-c5',
        'Confirm supply meets peak demand with a drought buffer',
      ),
    ],
    decisionGroups: [
      dg('lvs-s4-stock-water-strategy-dg1', 'Demand & sources', ['lvs-s4-stock-water-strategy-c1', 'lvs-s4-stock-water-strategy-c2']),
      dg('lvs-s4-stock-water-strategy-dg2', 'Delivery & access', ['lvs-s4-stock-water-strategy-c3', 'lvs-s4-stock-water-strategy-c4']),
      dg('lvs-s4-stock-water-strategy-dg3', 'Resilience', ['lvs-s4-stock-water-strategy-c5']),
    ],
    completionGate:
      'Stock-water strategy decided; peak demand met with a drought buffer.',
    actHandoff: 'Stock-Water Strategy Record',
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'lvs-s5-paddock-layout',
    stratumId: 's5-system-design',
    ref: 'LVS-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A paddock / cell / yard layout design',
    shortTitle: 'Paddock & cell layout',
    focusedQuestion:
      'How is the grazing land subdivided to deliver the chosen grazing system?',
    checklist: [
      ckF(
        'lvs-s5-paddock-layout-c1',
        'Design the paddock/cell subdivision serving the grazing method',
        {
          formulaId: 'paddock-system-capacity',
          resultLabel: 'Paddock system capacity',
        },
      ),
      ckF(
        'lvs-s5-paddock-layout-c2',
        'Size paddocks/cells to the herd and the planned graze/rest periods',
        {
          formulaId: 'paddock-stocking-density',
          resultLabel: 'Per-paddock stocking density',
        },
      ),
      ck(
        'lvs-s5-paddock-layout-c3',
        'Design laneways and gate placement for low-stress flow to water and yards',
      ),
      ck(
        'lvs-s5-paddock-layout-c4',
        'Locate sacrifice / stand-off areas for wet conditions and confinement feeding',
      ),
      ck(
        'lvs-s5-paddock-layout-c5',
        'Confirm the layout matches terrain, soils, and shelter',
      ),
    ],
    decisionGroups: [
      dg('lvs-s5-paddock-layout-dg1', 'Subdivision & sizing', ['lvs-s5-paddock-layout-c1', 'lvs-s5-paddock-layout-c2']),
      dg('lvs-s5-paddock-layout-dg2', 'Flow & sacrifice areas', ['lvs-s5-paddock-layout-c3', 'lvs-s5-paddock-layout-c4'], ['Infrastructure & Access']),
      dg('lvs-s5-paddock-layout-dg3', 'Terrain fit', ['lvs-s5-paddock-layout-c5']),
    ],
    completionGate:
      'Paddock/cell and yard layout designed and matched to terrain and the grazing system.',
    actHandoff: 'Paddock & Cell Layout Design',
  }),
  obj({
    id: 'lvs-s5-fencing-water',
    stratumId: 's5-system-design',
    ref: 'LVS-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A fencing & water-reticulation design',
    shortTitle: 'Fencing & water reticulation',
    focusedQuestion:
      'What fencing and water-delivery infrastructure does the layout require?',
    checklist: [
      ck(
        'lvs-s5-fencing-water-c1',
        'Specify perimeter and subdivision fencing types per species and budget',
      ),
      ck(
        'lvs-s5-fencing-water-c2',
        'Specify permanent vs temporary/electric fencing for flexible grazing',
      ),
      ck(
        'lvs-s5-fencing-water-c3',
        'Design the water reticulation - mains, pipe runs, tanks, trough placement',
      ),
      ck(
        'lvs-s5-fencing-water-c4',
        'Specify pump/power and storage to hold peak demand',
      ),
      ck(
        'lvs-s5-fencing-water-c5',
        'Sequence fencing and water builds against the establishment plan',
      ),
    ],
    decisionGroups: [
      dg('lvs-s5-fencing-water-dg1', 'Fencing spec', ['lvs-s5-fencing-water-c1', 'lvs-s5-fencing-water-c2']),
      dg('lvs-s5-fencing-water-dg2', 'Water delivery', ['lvs-s5-fencing-water-c3', 'lvs-s5-fencing-water-c4'], ['Infrastructure & Access']),
      dg('lvs-s5-fencing-water-dg3', 'Build sequence', ['lvs-s5-fencing-water-c5']),
    ],
    completionGate:
      'Fencing and water-reticulation infrastructure specified and sequenced.',
    actHandoff: 'Fencing & Water Reticulation Design',
  }),
  obj({
    id: 'lvs-s5-handling-shelter',
    stratumId: 's5-system-design',
    ref: 'LVS-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A handling facilities & shelter design',
    shortTitle: 'Handling facilities & shelter',
    focusedQuestion:
      'Where and how will animals be safely handled, treated, and sheltered?',
    checklist: [
      ck(
        'lvs-s5-handling-shelter-c1',
        'Design yards, race, and crush/handling system sized to peak throughput and species',
      ),
      ck(
        'lvs-s5-handling-shelter-c2',
        'Locate handling facilities for low-stress access from all paddocks',
      ),
      ck(
        'lvs-s5-handling-shelter-c3',
        'Design shade, wind, and wet/extreme-weather shelter per species',
      ),
      ck(
        'lvs-s5-handling-shelter-c4',
        'Design loading/unloading and quarantine/sick-bay provision',
      ),
      ck(
        'lvs-s5-handling-shelter-c5',
        'Confirm facilities meet the welfare ethic and operator-safety standards',
      ),
    ],
    decisionGroups: [
      dg('lvs-s5-handling-shelter-dg1', 'Handling system', ['lvs-s5-handling-shelter-c1', 'lvs-s5-handling-shelter-c2']),
      dg('lvs-s5-handling-shelter-dg2', 'Shelter & quarantine', ['lvs-s5-handling-shelter-c3', 'lvs-s5-handling-shelter-c4']),
      dg('lvs-s5-handling-shelter-dg3', 'Welfare & safety', ['lvs-s5-handling-shelter-c5']),
    ],
    completionGate:
      'Handling facilities and shelter designed to welfare and safety standards.',
    actHandoff: 'Handling Facilities & Shelter Design',
  }),
  obj({
    id: 'lvs-s5-feed-budget',
    stratumId: 's5-system-design',
    ref: 'LVS-S5.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A seasonal feed budget & supplementary-feed plan',
    shortTitle: 'Seasonal feed budget',
    focusedQuestion:
      'How is the herd fed through the deficit season without breaching welfare or carrying capacity?',
    checklist: [
      ckF(
        'lvs-s5-feed-budget-c1',
        'Build a month-by-month feed budget - demand vs forage supply',
        {
          formulaId: 'carrying-capacity-seasonal',
          resultLabel: 'Monthly demand vs seasonal capacity',
        },
      ),
      ck(
        'lvs-s5-feed-budget-c2',
        'Quantify the deficit-season gap to fill with conserved or bought-in feed',
      ),
      ck(
        'lvs-s5-feed-budget-c3',
        'Decide conserved-feed strategy - hay/silage made on-site vs purchased',
      ),
      ck(
        'lvs-s5-feed-budget-c4',
        'Decide storage and the safe-reserve (drought buffer) volume',
      ),
      ck(
        'lvs-s5-feed-budget-c5',
        'Confirm the plan holds welfare and body-condition targets year-round',
      ),
    ],
    decisionGroups: [
      dg('lvs-s5-feed-budget-dg1', 'Budget & gap', ['lvs-s5-feed-budget-c1', 'lvs-s5-feed-budget-c2']),
      dg('lvs-s5-feed-budget-dg2', 'Conserved feed & storage', ['lvs-s5-feed-budget-c3', 'lvs-s5-feed-budget-c4']),
      dg('lvs-s5-feed-budget-dg3', 'Welfare check', ['lvs-s5-feed-budget-c5']),
    ],
    completionGate:
      'Seasonal feed budget complete; deficit-season supply and reserve secured.',
    actHandoff: 'Seasonal Feed Budget & Supplementary-Feed Plan',
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'lvs-s6-herd-health',
    stratumId: 's6-integration-design',
    ref: 'LVS-S6.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A herd-health, breeding & husbandry protocol',
    shortTitle: 'Herd-health & breeding protocol',
    focusedQuestion:
      'What standing protocol keeps the herd healthy and reproducing on schedule?',
    checklist: [
      ck(
        'lvs-s6-herd-health-c1',
        'Define the animal-health calendar - vaccination, parasite, mineral, hoof/teeth, body-condition checks',
      ),
      ck(
        'lvs-s6-herd-health-c2',
        'Define the breeding plan - mating/joining windows, gestation, calving/lambing/farrowing management',
      ),
      ck(
        'lvs-s6-herd-health-c3',
        'Define replacement, weaning, and culling decisions and timing',
      ),
      ck(
        'lvs-s6-herd-health-c4',
        'Define identification, record-keeping, and traceability practice',
      ),
      ck(
        'lvs-s6-herd-health-c5',
        'Define the veterinary relationship and intervention thresholds',
      ),
      ck(
        'lvs-s6-herd-health-c6',
        'Define the response protocol for sick, injured, or down animals',
      ),
    ],
    decisionGroups: [
      dg('lvs-s6-herd-health-dg1', 'Health calendar', ['lvs-s6-herd-health-c1', 'lvs-s6-herd-health-c5']),
      dg('lvs-s6-herd-health-dg2', 'Breeding & turnover', ['lvs-s6-herd-health-c2', 'lvs-s6-herd-health-c3']),
      dg('lvs-s6-herd-health-dg3', 'Records & response', ['lvs-s6-herd-health-c4', 'lvs-s6-herd-health-c6']),
    ],
    completionGate:
      'Herd-health and breeding protocol defined with a health calendar and traceability practice.',
    actHandoff: 'Herd-Health & Breeding Protocol',
  }),
  obj({
    id: 'lvs-s6-nutrient-cycling',
    stratumId: 's6-integration-design',
    ref: 'LVS-S6.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A manure, nutrient cycling & pasture-recovery integration',
    shortTitle: 'Manure & nutrient cycling',
    focusedQuestion:
      'How does animal impact build soil and pasture rather than degrade it?',
    checklist: [
      ck(
        'lvs-s6-nutrient-cycling-c1',
        'Define how grazing impact and dung/urine distribution are managed to lift fertility',
      ),
      ck(
        'lvs-s6-nutrient-cycling-c2',
        'Define manure handling from confinement/handling areas - capture, compost, return',
      ),
      ck(
        'lvs-s6-nutrient-cycling-c3',
        'Define the pasture-recovery and overseeding/renovation approach',
      ),
      ck(
        'lvs-s6-nutrient-cycling-c4',
        'Define nutrient-balance monitoring to avoid hotspots and runoff',
      ),
      ck(
        'lvs-s6-nutrient-cycling-c5',
        'Confirm integration with any cropping, orchard, or neighbouring systems',
      ),
    ],
    decisionGroups: [
      dg('lvs-s6-nutrient-cycling-dg1', 'Animal impact & manure', ['lvs-s6-nutrient-cycling-c1', 'lvs-s6-nutrient-cycling-c2']),
      dg('lvs-s6-nutrient-cycling-dg2', 'Recovery & balance', ['lvs-s6-nutrient-cycling-c3', 'lvs-s6-nutrient-cycling-c4']),
      dg('lvs-s6-nutrient-cycling-dg3', 'Whole-system fit', ['lvs-s6-nutrient-cycling-c5']),
    ],
    completionGate:
      'Manure and nutrient-cycling integration defined; pasture recovery and nutrient balance protected.',
    actHandoff: 'Manure & Nutrient Cycling Plan',
  }),
  obj({
    id: 'lvs-s6-biosecurity',
    stratumId: 's6-integration-design',
    ref: 'LVS-S6.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A predator management, guardian & biosecurity protocol',
    shortTitle: 'Predator & biosecurity protocol',
    focusedQuestion:
      'What standing measures protect the herd from predation and disease incursion?',
    checklist: [
      ck(
        'lvs-s6-biosecurity-c1',
        'Define predator-deterrence measures - guardian animals, fencing, night housing, husbandry timing',
      ),
      ck(
        'lvs-s6-biosecurity-c2',
        'Define the guardian-animal plan if used - species, number, integration, welfare',
      ),
      ck(
        'lvs-s6-biosecurity-c3',
        'Define the biosecurity protocol - quarantine of incoming stock, visitor/vehicle hygiene',
      ),
      ck(
        'lvs-s6-biosecurity-c4',
        'Define boundary and shared-water controls against neighbour-stock contact',
      ),
      ck(
        'lvs-s6-biosecurity-c5',
        'Define the disease-outbreak response and notifiable-disease procedure',
      ),
    ],
    decisionGroups: [
      dg('lvs-s6-biosecurity-dg1', 'Predation control', ['lvs-s6-biosecurity-c1', 'lvs-s6-biosecurity-c2']),
      dg('lvs-s6-biosecurity-dg2', 'Biosecurity', ['lvs-s6-biosecurity-c3', 'lvs-s6-biosecurity-c4']),
      dg('lvs-s6-biosecurity-dg3', 'Outbreak response', ['lvs-s6-biosecurity-c5']),
    ],
    completionGate:
      'Predator-management and biosecurity protocols defined, including outbreak response.',
    actHandoff: 'Predator & Biosecurity Protocol',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'lvs-s7-herd-buildup',
    stratumId: 's7-phasing-resourcing',
    ref: 'LVS-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A herd build-up & establishment sequence',
    shortTitle: 'Herd build-up sequence',
    focusedQuestion:
      'In what order is infrastructure built and stock introduced, so no animal arrives before its support systems are ready?',
    checklist: [
      ck(
        'lvs-s7-herd-buildup-c1',
        'Sequence infrastructure builds - fencing, water, handling, shelter - before stock',
      ),
      ck(
        'lvs-s7-herd-buildup-c2',
        'Define the herd build-up phases - initial cohort, breeding-up, full establishment',
      ),
      ck(
        'lvs-s7-herd-buildup-c3',
        'Define go/no-go readiness tests for fencing, water, and handling ahead of each intake',
      ),
      ck(
        'lvs-s7-herd-buildup-c4',
        'Define the introduction/acclimation protocol for new stock',
      ),
      ck(
        'lvs-s7-herd-buildup-c5',
        'Confirm each phase stays within carrying capacity and feed budget',
      ),
    ],
    decisionGroups: [
      dg('lvs-s7-herd-buildup-dg1', 'Build & intake sequence', ['lvs-s7-herd-buildup-c1', 'lvs-s7-herd-buildup-c2']),
      dg('lvs-s7-herd-buildup-dg2', 'Readiness gates', ['lvs-s7-herd-buildup-c3', 'lvs-s7-herd-buildup-c4']),
      dg('lvs-s7-herd-buildup-dg3', 'Capacity check', ['lvs-s7-herd-buildup-c5']),
    ],
    completionGate:
      'Establishment sequence approved. Hard gate: no livestock are introduced before fencing, water, and handling facilities each pass an independent go/no-go test.',
    actHandoff: 'Herd Build-Up & Establishment Sequence',
    scopeNotes:
      'Hard gate transcribed from grazing-establishment best practice - stock readiness is gated on infrastructure, not the calendar (mirrors SILV-S7.4).',
  }),
  obj({
    id: 'lvs-s7-break-even',
    stratumId: 's7-phasing-resourcing',
    ref: 'LVS-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'An enterprise financial viability & break-even plan',
    shortTitle: 'Financial viability & break-even',
    focusedQuestion:
      'Does the operation pay for itself, and when does it cross break-even?',
    checklist: [
      ck(
        'lvs-s7-break-even-c1',
        'Build the establishment capital budget - infrastructure, breeding stock, equipment',
      ),
      ck(
        'lvs-s7-break-even-c2',
        'Build the annual operating budget - feed, animal health, labour, processing',
      ),
      ckF(
        'lvs-s7-break-even-c3',
        'Project the revenue timeline by enterprise to break-even',
        {
          formulaId: 'enterprise-break-even',
          satisfiesWhenComputed: true,
          resultLabel: 'Break-even timeline',
        },
      ),
      ck(
        'lvs-s7-break-even-c4',
        'Define the cash-flow buffer covering the pre-break-even build-up years',
      ),
      ck(
        'lvs-s7-break-even-c5',
        'Confirm viability against the production goals and scale',
      ),
    ],
    decisionGroups: [
      dg('lvs-s7-break-even-dg1', 'Capital & operating cost', ['lvs-s7-break-even-c1', 'lvs-s7-break-even-c2']),
      dg('lvs-s7-break-even-dg2', 'Revenue & cash flow', ['lvs-s7-break-even-c3', 'lvs-s7-break-even-c4']),
      dg('lvs-s7-break-even-dg3', 'Viability check', ['lvs-s7-break-even-c5']),
    ],
    completionGate:
      'Financial viability plan approved; break-even timeline and cash-flow buffer confirmed.',
    actHandoff: 'Enterprise Financial Viability Plan',
    scopeNotes:
      'Ordinary break-even budgeting (cost vs revenue timeline). No advance sale, no financial product, no riba- or gharar-adjacent content.',
  }),
  obj({
    id: 'lvs-s7-marketing',
    stratumId: 's7-phasing-resourcing',
    ref: 'LVS-S7.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'A marketing, sales-channel & processing logistics plan',
    shortTitle: 'Marketing & sales channels',
    focusedQuestion:
      'How are animals and animal products sold and delivered, and through which channels?',
    checklist: [
      ck(
        'lvs-s7-marketing-c1',
        'Define the products and the form they are sold in - live animals, carcass, cuts, milk, eggs, fibre',
      ),
      ck(
        'lvs-s7-marketing-c2',
        'Define the processing pathway - on-farm, mobile, licensed abattoir/processor - and its scheduling/booking lead time',
      ),
      ck(
        'lvs-s7-marketing-c3',
        'Define the sales channels - farmgate/spot sale, wholesale, processor contract, livestock auction, buyers clubs or meat-share / herd-share subscriptions',
      ),
      ck(
        'lvs-s7-marketing-c4',
        'Define pricing, traceability, and any certification/labelling claims',
      ),
      ck(
        'lvs-s7-marketing-c5',
        'Define delivery, cold-chain, and customer-relationship logistics',
      ),
      ck(
        'lvs-s7-marketing-c6',
        'Confirm channels comply with food-safety and animal-product regulation',
      ),
    ],
    decisionGroups: [
      dg('lvs-s7-marketing-dg1', 'Products & processing', ['lvs-s7-marketing-c1', 'lvs-s7-marketing-c2']),
      dg('lvs-s7-marketing-dg2', 'Channels & pricing', ['lvs-s7-marketing-c3', 'lvs-s7-marketing-c4']),
      dg('lvs-s7-marketing-dg3', 'Delivery & compliance', ['lvs-s7-marketing-c5', 'lvs-s7-marketing-c6']),
    ],
    completionGate:
      'Marketing, sales-channel, and processing logistics defined and confirmed compliant.',
    actHandoff: 'Marketing & Sales-Channel Plan',
    scopeNotes:
      'Amanah Gate - flag, do not omit: meat-share / herd-share / CSA-style advance-subscription channels (c3) entail the advance sale of animals or yield the steward does not yet possess (bay` ma laysa `indak). The channel is surfaced, never silently dropped, but it is flagged for Scholar Council review before adoption, must not be presented as a default or recommended model, and no CSRA / salam advance-purchase framing is used. Permissible analogues without the flag: farmgate/spot sale of stock on hand, and processor/wholesale contracts settled on delivered animals.',
  }),
];

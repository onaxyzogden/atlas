// catalogues/marketGarden.ts
//
// Market Garden / Intensive Crop Production PRIMARY-type objectives - the 24
// type-specific objectives a Market Garden project adds on top of the 19
// Universal objectives (OLOS Market Garden / Intensive Crop Production Objective
// Catalogue v1.0, authored to Catalogue Authoring Standards v1.4).
//
// This file holds ONLY the primary-layer standalone objectives. The universal
// slot lives in ./universal.ts. The catalogue ships no base secondary layer, so
// there are no PatchRecords here.
//
// Count note: 19 universal + 24 primary = 43 total. Per-tier primary counts
// (3+3+2+5+5+3+3 = 24) and the source's Complete objective index both confirm
// 24. The source numbers objectives by Tier 0-6; this catalogue maps Tier N ->
// Stratum (N+1): Tier 0 -> s1-project-foundation, 1 -> s2-land-reading, 2 ->
// s3-systems-reading, 3 -> s4-foundation-decisions, 4 -> s5-system-design, 5 ->
// s6-integration-design, 6 -> s7-phasing-resourcing. Refs are restamped
// MGD-S<stratum>.<n> from the source's <tier>.<n>.
//
// Philosophy gate: MGD-S1.5 (growing system & input philosophy) carries the
// source's governing note in scopeNotes - all downstream foundation/design
// decisions (S4-S5) must be evaluated against the growing system and input
// philosophy before proceeding (the source key authoring note: "Growing system
// philosophy (Tier 0) gates all fertility and pest management decisions").
//
// AMANAH NOTE (operator ruling 2026-06-02): MGD-S1.4 and MGD-S1.6 cite "CSA"
// (Community Supported Agriculture) as a produce sales channel, encoded verbatim
// from the operator source. Standard CSA has members pay upfront for a season's
// undelivered harvest share - the same advance-sale / gharar structure
// (bay' ma laysa 'indak) that retired the MTC CSRA capital model on 2026-05-04.
// The operator's standing prohibition is scoped to MTC capital, but directed
// that the fiqh caution be carried forward into generic catalogues too: keep the
// source word verbatim AND attach an Amanah scopeNotes flag. Both objectives
// below carry that flag. MGD-S7.5 (enterprise financial viability) is ordinary
// enterprise break-even budgeting - no advance sale, no riba, no gharar; clean.
//
// Decision groups are AUTHORED editorially under the 2026-05-31 extended override
// ("author meaningful labels") - the source ships no decision-group spec, so each
// objective's checklist is partitioned into 2-3 named decision scopes, mirroring
// orchard.ts / homestead.ts / education.ts / conservation.ts.
//
// source: 'primary', sourceTypeId: 'market_garden' on every objective. ASCII-only
// copy: em/en dashes -> " - "; curly quotes -> straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj } from './authoring.js';

const PRIMARY = 'market_garden' as const;

export const MARKET_GARDEN_PRIMARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'mgd-s1-production-targets-sales',
    stratumId: 's1-project-foundation',
    ref: 'MGD-S1.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define production targets & sales model',
    shortTitle: 'Production targets & sales model',
    focusedQuestion:
      'What crops, in what volumes, sold how - and how does this define all infrastructure requirements?',
    checklist: [
      ck('mgd-s1-production-targets-sales-c1', 'Define primary crop categories - salad greens, brassicas, roots, alliums, nightshades, herbs'),
      ck('mgd-s1-production-targets-sales-c2', 'Set production volume targets per category', { feeds: ['mgd-s4-crop-rotation-bed-layout', 'mgd-s5-propagation-nursery', 's7-phase1'] }),
      ck('mgd-s1-production-targets-sales-c3', 'Define target growing area required to meet volume targets', { feeds: ['s4-zones', 'mgd-s4-crop-rotation-bed-layout'] }),
      ck('mgd-s1-production-targets-sales-c4', 'Define sales model - direct, farmers market, restaurant, CSA, wholesale, or combination', { feeds: ['mgd-s4-post-harvest-handling', 'mgd-s6-sales-revenue-tracking'] }),
      ck('mgd-s1-production-targets-sales-c5', 'Define pack and presentation standards per channel'),
      ck('mgd-s1-production-targets-sales-c6', 'Confirm production targets are achievable within steward capacity'),
    ],
    decisionGroups: [
      dg('mgd-s1-production-targets-sales-dg1', 'Crop categories & volumes', ['mgd-s1-production-targets-sales-c1', 'mgd-s1-production-targets-sales-c2']),
      dg('mgd-s1-production-targets-sales-dg2', 'Growing area & sales model', ['mgd-s1-production-targets-sales-c3', 'mgd-s1-production-targets-sales-c4']),
      dg('mgd-s1-production-targets-sales-dg3', 'Pack standards & capacity fit', ['mgd-s1-production-targets-sales-c5', 'mgd-s1-production-targets-sales-c6']),
    ],
    completionGate:
      'Production targets and sales model approved. Growing area requirement defined.',
    actHandoff: 'Production Targets & Sales Model Brief',
    scopeNotes:
      'Amanah flag: the "CSA" sales channel is encoded verbatim from the operator source. Standard CSA collects upfront payment for a season\'s undelivered harvest - an advance-sale structure (bay\' ma laysa \'indak / gharar) of the kind that retired the MTC CSRA model. Any CSA arrangement adopted here must be structured to avoid it - produce sold as delivered, or share entitlement framed as a membership benefit, not advance purchase.',
  }),
  obj({
    id: 'mgd-s1-growing-system-philosophy',
    stratumId: 's1-project-foundation',
    ref: 'MGD-S1.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define growing system & input philosophy',
    shortTitle: 'Growing system & input philosophy',
    focusedQuestion:
      'What growing methodology and input philosophy governs all production decisions?',
    checklist: [
      ck('mgd-s1-growing-system-philosophy-c1', 'Define growing system - no-dig, organic, biodynamic, regenerative, or conventional'),
      ck('mgd-s1-growing-system-philosophy-c2', 'Define certification intent - certified organic, uncertified organic, conventional'),
      ck('mgd-s1-growing-system-philosophy-c3', 'Define external input policy - what inputs are acceptable and what are prohibited', { feeds: ['mgd-s4-fertility-strategy', 'mgd-s4-ipm-strategy'] }),
      ck('mgd-s1-growing-system-philosophy-c4', 'Define soil health priority - how soil biology guides all production decisions', { feeds: ['s5-soil-improvement', 'mgd-s4-fertility-strategy'] }),
      ck('mgd-s1-growing-system-philosophy-c5', 'Document philosophy as design constraint - all Stratum 4-5 decisions evaluated against it', { feeds: ['mgd-s4-fertility-strategy', 'mgd-s4-ipm-strategy', 'mgd-s4-irrigation-strategy'] }),
    ],
    decisionGroups: [
      dg('mgd-s1-growing-system-philosophy-dg1', 'Growing system & certification', ['mgd-s1-growing-system-philosophy-c1', 'mgd-s1-growing-system-philosophy-c2']),
      dg('mgd-s1-growing-system-philosophy-dg2', 'Input policy & soil priority', ['mgd-s1-growing-system-philosophy-c3', 'mgd-s1-growing-system-philosophy-c4']),
      dg('mgd-s1-growing-system-philosophy-dg3', 'Philosophy as design constraint', ['mgd-s1-growing-system-philosophy-c5']),
    ],
    completionGate:
      'Growing system and input philosophy approved and documented as design constraint.',
    actHandoff: 'Growing System & Input Philosophy Brief',
    scopeNotes:
      'All downstream foundation and design decisions (S4-S5) - especially fertility and pest management - must be evaluated against this growing system and input philosophy before proceeding. A decision that violates the philosophy requires a philosophy revision first, not a design variation.',
  }),
  obj({
    id: 'mgd-s1-market-channels',
    stratumId: 's1-project-foundation',
    ref: 'MGD-S1.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define market channels & customer relationships',
    shortTitle: 'Market channels & customer relationships',
    focusedQuestion:
      'Who are the customers, how are they reached, and what does each channel require?',
    checklist: [
      ck('mgd-s1-market-channels-c1', 'Define primary sales channels and their share of total revenue', { feeds: ['mgd-s6-sales-revenue-tracking', 'mgd-s7-financial-viability'] }),
      ck('mgd-s1-market-channels-c2', 'Define customer relationships - CSA members, restaurant accounts, market regulars'),
      ck('mgd-s1-market-channels-c3', 'Define harvest day and delivery schedule per channel', { feeds: ['mgd-s4-post-harvest-handling', 'mgd-s7-crop-calendar'] }),
      ck('mgd-s1-market-channels-c4', 'Define pack standards, labelling, and presentation requirements per channel', { feeds: ['mgd-s4-post-harvest-handling', 'mgd-s5-wash-pack-cold-storage'] }),
      ck('mgd-s1-market-channels-c5', 'Confirm all channel requirements are consistent with production capacity'),
      ck('mgd-s1-market-channels-c6', 'Define backup channel if primary channel fails'),
    ],
    decisionGroups: [
      dg('mgd-s1-market-channels-dg1', 'Channels & customer relationships', ['mgd-s1-market-channels-c1', 'mgd-s1-market-channels-c2']),
      dg('mgd-s1-market-channels-dg2', 'Delivery schedule & pack standards', ['mgd-s1-market-channels-c3', 'mgd-s1-market-channels-c4']),
      dg('mgd-s1-market-channels-dg3', 'Capacity fit & backup channel', ['mgd-s1-market-channels-c5', 'mgd-s1-market-channels-c6']),
    ],
    completionGate:
      'Market channels and customer relationships defined. All channel requirements confirmed against production capacity.',
    actHandoff: 'Market Channels & Customer Relationships Brief',
    scopeNotes:
      'Amanah flag: "CSA members" is encoded verbatim from the operator source. Standard CSA collects upfront payment for a season\'s undelivered harvest - an advance-sale structure (bay\' ma laysa \'indak / gharar) of the kind that retired the MTC CSRA model. Any CSA membership adopted here must be structured to avoid it - produce sold as delivered, or share entitlement framed as a membership benefit, not advance purchase.',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'mgd-s2-soil-fertility-bed-potential',
    stratumId: 's2-land-reading',
    ref: 'MGD-S2.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey existing soil fertility & bed potential',
    shortTitle: 'Soil fertility & bed potential',
    focusedQuestion:
      'What is the baseline soil fertility, pH, and organic matter - and which areas are best suited for intensive production?',
    checklist: [
      ck('mgd-s2-soil-fertility-bed-potential-c1', 'Conduct soil tests across proposed growing areas - pH, organic matter, nutrients, trace minerals', { feeds: ['s5-soil-improvement', 'mgd-s4-fertility-strategy'] }),
      ck('mgd-s2-soil-fertility-bed-potential-c2', 'Map soil variation across the site - identify premium production zones', { feeds: ['s4-zones', 'mgd-s4-crop-rotation-bed-layout'] }),
      ck('mgd-s2-soil-fertility-bed-potential-c3', 'Assess drainage class in proposed bed areas', { feeds: ['mgd-s4-crop-rotation-bed-layout', 's5-soil-improvement'] }),
      ck('mgd-s2-soil-fertility-bed-potential-c4', 'Identify contamination risk - chemical residues, heavy metals from previous land use', { feeds: ['s4-zones', 's7-risk-register'] }),
      ck('mgd-s2-soil-fertility-bed-potential-c5', 'Assess compaction in proposed growing areas', { feeds: ['s5-soil-improvement'] }),
      ck('mgd-s2-soil-fertility-bed-potential-c6', 'Define fertility gap - what must be built before target production is achievable', { feeds: ['mgd-s4-fertility-strategy', 's5-soil-improvement'] }),
    ],
    decisionGroups: [
      dg('mgd-s2-soil-fertility-bed-potential-dg1', 'Soil tests & zone variation', ['mgd-s2-soil-fertility-bed-potential-c1', 'mgd-s2-soil-fertility-bed-potential-c2']),
      dg('mgd-s2-soil-fertility-bed-potential-dg2', 'Drainage, contamination & compaction', ['mgd-s2-soil-fertility-bed-potential-c3', 'mgd-s2-soil-fertility-bed-potential-c4', 'mgd-s2-soil-fertility-bed-potential-c5']),
      dg('mgd-s2-soil-fertility-bed-potential-dg3', 'Fertility gap', ['mgd-s2-soil-fertility-bed-potential-c6']),
    ],
    completionGate:
      'Soil fertility survey complete. Premium production zones and fertility gap defined.',
    actHandoff: 'Existing Soil Fertility & Bed Potential Survey',
  }),
  obj({
    id: 'mgd-s2-water-access-irrigation',
    stratumId: 's2-land-reading',
    ref: 'MGD-S2.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey water access & irrigation potential',
    shortTitle: 'Water access & irrigation potential',
    focusedQuestion:
      'What water is available, at what pressure, and is it reliable through the growing season?',
    checklist: [
      ck('mgd-s2-water-access-irrigation-c1', 'Identify all available water sources - mains, bore, dam, rainwater', { feeds: ['s4-water-strategy', 'mgd-s4-irrigation-strategy'] }),
      ck('mgd-s2-water-access-irrigation-c2', 'Assess yield and reliability of each source through driest production months', { feeds: ['s4-water-strategy', 'mgd-s4-irrigation-strategy'] }),
      ck('mgd-s2-water-access-irrigation-c3', 'Measure or estimate pressure at proposed irrigation points', { feeds: ['s5-water-infrastructure', 'mgd-s5-irrigation-system'] }),
      ck('mgd-s2-water-access-irrigation-c4', 'Assess distance from source to growing areas - relevant to pipe sizing', { feeds: ['s5-water-infrastructure', 'mgd-s5-irrigation-system'] }),
      ck('mgd-s2-water-access-irrigation-c5', 'Define maximum irrigated area supportable from available source', { feeds: ['s4-water-strategy', 'mgd-s4-irrigation-strategy'] }),
    ],
    decisionGroups: [
      dg('mgd-s2-water-access-irrigation-dg1', 'Sources & reliability', ['mgd-s2-water-access-irrigation-c1', 'mgd-s2-water-access-irrigation-c2']),
      dg('mgd-s2-water-access-irrigation-dg2', 'Pressure & distance', ['mgd-s2-water-access-irrigation-c3', 'mgd-s2-water-access-irrigation-c4']),
      dg('mgd-s2-water-access-irrigation-dg3', 'Maximum irrigable area', ['mgd-s2-water-access-irrigation-c5']),
    ],
    completionGate:
      'Water access and irrigation potential confirmed. Maximum irrigable area defined.',
    actHandoff: 'Water Access & Irrigation Potential Survey',
  }),
  obj({
    id: 'mgd-s2-landscape-vectors',
    stratumId: 's2-land-reading',
    ref: 'MGD-S2.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey surrounding landscape context & vectors',
    shortTitle: 'Landscape context & vectors',
    focusedQuestion:
      'What contamination risks from surrounding land uses threaten crop health or organic certification?',
    checklist: [
      ck('mgd-s2-landscape-vectors-c1', 'Map surrounding land uses within 1km', { feeds: ['s7-risk-register'] }),
      ck('mgd-s2-landscape-vectors-c2', 'Identify neighbouring spray programmes - herbicide, fungicide, insecticide risk', { feeds: ['mgd-s4-ipm-strategy', 's7-risk-register'] }),
      ck('mgd-s2-landscape-vectors-c3', 'Assess prevailing wind direction relative to spray risk sources', { feeds: ['mgd-s4-ipm-strategy', 's7-risk-register'] }),
      ck('mgd-s2-landscape-vectors-c4', 'Assess drinking and irrigation water catchment contamination risk', { feeds: ['mgd-s4-irrigation-strategy', 's7-risk-register'] }),
      ck('mgd-s2-landscape-vectors-c5', 'Identify any GMO crop risks relevant to seed saving or organic status', { feeds: ['mgd-s4-fertility-strategy', 's7-risk-register'] }),
      ck('mgd-s2-landscape-vectors-c6', 'Note any industrial or chemical contamination sources', { feeds: ['s7-risk-register'] }),
    ],
    decisionGroups: [
      dg('mgd-s2-landscape-vectors-dg1', 'Land uses & spray programmes', ['mgd-s2-landscape-vectors-c1', 'mgd-s2-landscape-vectors-c2']),
      dg('mgd-s2-landscape-vectors-dg2', 'Wind & water catchment risk', ['mgd-s2-landscape-vectors-c3', 'mgd-s2-landscape-vectors-c4']),
      dg('mgd-s2-landscape-vectors-dg3', 'GMO & industrial contamination', ['mgd-s2-landscape-vectors-c5', 'mgd-s2-landscape-vectors-c6']),
    ],
    completionGate:
      'Landscape context and vector survey complete. All contamination risks identified.',
    actHandoff: 'Landscape Context & Vector Survey Package',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'mgd-s3-irrigation-water-quality',
    stratumId: 's3-systems-reading',
    ref: 'MGD-S3.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey irrigation water quality & pressure',
    shortTitle: 'Irrigation water quality & pressure',
    focusedQuestion:
      'Is the available irrigation water free from contaminants - and is pressure adequate for the intended system?',
    checklist: [
      ck('mgd-s3-irrigation-water-quality-c1', 'Test irrigation water for biological contamination - E. coli, pathogens - relevant for food safety', { feeds: ['mgd-s4-irrigation-strategy', 'mgd-s4-post-harvest-handling'] }),
      ck('mgd-s3-irrigation-water-quality-c2', 'Test for chemical contamination relevant to landscape vector findings', { feeds: ['mgd-s4-irrigation-strategy', 's7-risk-register'] }),
      ck('mgd-s3-irrigation-water-quality-c3', 'Test pH and EC - relevant to crop uptake and fertigation', { feeds: ['mgd-s4-irrigation-strategy', 'mgd-s4-fertility-strategy'] }),
      ck('mgd-s3-irrigation-water-quality-c4', 'Measure static and dynamic pressure at source and at furthest irrigation point', { feeds: ['mgd-s4-irrigation-strategy', 'mgd-s5-irrigation-system'] }),
      ck('mgd-s3-irrigation-water-quality-c5', 'Confirm water quality meets food safety and certification requirements', { feeds: ['mgd-s4-post-harvest-handling', 's7-risk-register'] }),
    ],
    decisionGroups: [
      dg('mgd-s3-irrigation-water-quality-dg1', 'Biological & chemical contamination', ['mgd-s3-irrigation-water-quality-c1', 'mgd-s3-irrigation-water-quality-c2']),
      dg('mgd-s3-irrigation-water-quality-dg2', 'pH/EC & pressure', ['mgd-s3-irrigation-water-quality-c3', 'mgd-s3-irrigation-water-quality-c4']),
      dg('mgd-s3-irrigation-water-quality-dg3', 'Food safety & certification fit', ['mgd-s3-irrigation-water-quality-c5']),
    ],
    completionGate:
      'Irrigation water quality and pressure confirmed. Food safety and certification requirements met.',
    actHandoff: 'Irrigation Water Quality & Pressure Survey',
  }),
  obj({
    id: 'mgd-s3-pest-disease-weed-pressure',
    stratumId: 's3-systems-reading',
    ref: 'MGD-S3.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Survey pest, disease & weed pressure',
    shortTitle: 'Pest, disease & weed pressure',
    focusedQuestion:
      'What pest, disease, and weed pressures exist - and what are their ecological drivers?',
    checklist: [
      ck('mgd-s3-pest-disease-weed-pressure-c1', 'Map weed species by zone - density, spread, and seed bank assessment', { feeds: ['mgd-s4-ipm-strategy'] }),
      ck('mgd-s3-pest-disease-weed-pressure-c2', 'Identify key pest species and their population indicators', { feeds: ['mgd-s4-ipm-strategy'] }),
      ck('mgd-s3-pest-disease-weed-pressure-c3', 'Record known disease pressure for intended crop categories', { feeds: ['mgd-s4-ipm-strategy', 'mgd-s4-crop-rotation-bed-layout'] }),
      ck('mgd-s3-pest-disease-weed-pressure-c4', 'Assess soil-borne disease risk from previous cropping history', { feeds: ['mgd-s4-crop-rotation-bed-layout', 's7-risk-register'] }),
      ck('mgd-s3-pest-disease-weed-pressure-c5', 'Identify beneficial predator populations that reduce pest pressure', { feeds: ['mgd-s4-ipm-strategy'] }),
      ck('mgd-s3-pest-disease-weed-pressure-c6', 'Prioritise pressures by production risk', { feeds: ['mgd-s4-ipm-strategy', 's7-risk-register'] }),
    ],
    decisionGroups: [
      dg('mgd-s3-pest-disease-weed-pressure-dg1', 'Weed & pest mapping', ['mgd-s3-pest-disease-weed-pressure-c1', 'mgd-s3-pest-disease-weed-pressure-c2']),
      dg('mgd-s3-pest-disease-weed-pressure-dg2', 'Disease pressure & soil-borne risk', ['mgd-s3-pest-disease-weed-pressure-c3', 'mgd-s3-pest-disease-weed-pressure-c4']),
      dg('mgd-s3-pest-disease-weed-pressure-dg3', 'Beneficials & risk prioritisation', ['mgd-s3-pest-disease-weed-pressure-c5', 'mgd-s3-pest-disease-weed-pressure-c6']),
    ],
    completionGate: 'Pest, disease, and weed pressure baseline complete.',
    actHandoff: 'Pest, Disease & Weed Pressure Baseline',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'mgd-s4-crop-rotation-bed-layout',
    stratumId: 's4-foundation-decisions',
    ref: 'MGD-S4.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define crop rotation & bed layout plan',
    shortTitle: 'Crop rotation & bed layout',
    focusedQuestion:
      'What rotation system governs crop sequencing - and how does it determine bed count, dimensions, and layout?',
    checklist: [
      ck('mgd-s4-crop-rotation-bed-layout-c1', 'Define rotation system - block rotation, family rotation, or bed-by-bed', { feeds: ['mgd-s5-bed-growing-infrastructure', 'mgd-s7-crop-calendar'] }),
      ck('mgd-s4-crop-rotation-bed-layout-c2', 'Define rotation interval per crop family - minimum gap between same-family crops', { feeds: ['mgd-s5-propagation-nursery', 'mgd-s7-crop-calendar'] }),
      ck('mgd-s4-crop-rotation-bed-layout-c3', 'Calculate bed count required for rotation at defined production targets', { feeds: ['mgd-s5-bed-growing-infrastructure', 's7-phase1'] }),
      ck('mgd-s4-crop-rotation-bed-layout-c4', 'Define bed dimensions - width, length, path width - consistent with growing system', { feeds: ['mgd-s5-bed-growing-infrastructure', 'mgd-s5-irrigation-system'] }),
      ck('mgd-s4-crop-rotation-bed-layout-c5', 'Define block layout relative to access and irrigation zones', { feeds: ['mgd-s5-bed-growing-infrastructure', 'mgd-s5-irrigation-system'] }),
      ck('mgd-s4-crop-rotation-bed-layout-c6', 'Map rotation blocks on zone framework', { feeds: ['mgd-s5-bed-growing-infrastructure', 's7-phase1'] }),
    ],
    decisionGroups: [
      dg('mgd-s4-crop-rotation-bed-layout-dg1', 'Rotation system & interval', ['mgd-s4-crop-rotation-bed-layout-c1', 'mgd-s4-crop-rotation-bed-layout-c2']),
      dg('mgd-s4-crop-rotation-bed-layout-dg2', 'Bed count & dimensions', ['mgd-s4-crop-rotation-bed-layout-c3', 'mgd-s4-crop-rotation-bed-layout-c4']),
      dg('mgd-s4-crop-rotation-bed-layout-dg3', 'Block layout & mapping', ['mgd-s4-crop-rotation-bed-layout-c5', 'mgd-s4-crop-rotation-bed-layout-c6']),
    ],
    completionGate:
      'Crop rotation and bed layout approved. Bed count and dimensions confirmed against production targets.',
    actHandoff: 'Crop Rotation & Bed Layout Plan',
    monitoringProtocol: {
      indicators: [
        { metric: 'Same-family crops returning to a bed ahead of the defined rotation interval', frequency: 'each planting' },
        { metric: 'Bed count in active production vs. the count the rotation plan requires', frequency: 'per season' },
        { metric: 'Soil-borne disease incidence by rotation block', frequency: 'per season' },
      ],
      triggers: [
        'Rotation interval breached on a bed -> reassign the planting and log the exception',
        'Active bed count falls short of rotation requirement -> rebalance the block plan or reduce volume targets',
        'Disease build-up recurring in a block -> lengthen the interval or rest the block',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'mgd-s4-irrigation-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'MGD-S4.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define irrigation system strategy',
    shortTitle: 'Irrigation system strategy',
    focusedQuestion:
      'What irrigation system type, zone layout, and automation level will serve the production beds?',
    checklist: [
      ck('mgd-s4-irrigation-strategy-c1', 'Define irrigation system type - drip, overhead, or combination by crop category', { feeds: ['mgd-s5-irrigation-system', 's5-water-infrastructure'] }),
      ck('mgd-s4-irrigation-strategy-c2', 'Define irrigation zone layout - zones sized to pump capacity and pressure', { feeds: ['mgd-s5-irrigation-system', 's5-water-infrastructure'] }),
      ck('mgd-s4-irrigation-strategy-c3', 'Define automation level - manual, timer, soil moisture sensor', { feeds: ['mgd-s5-irrigation-system', 's7-resource-plan'] }),
      ck('mgd-s4-irrigation-strategy-c4', 'Define fertigation approach if applicable', { feeds: ['mgd-s5-irrigation-system'] }),
      ck('mgd-s4-irrigation-strategy-c5', 'Confirm system type is consistent with growing philosophy and certification requirements', { feeds: ['mgd-s5-irrigation-system'] }),
    ],
    decisionGroups: [
      dg('mgd-s4-irrigation-strategy-dg1', 'System type & zones', ['mgd-s4-irrigation-strategy-c1', 'mgd-s4-irrigation-strategy-c2']),
      dg('mgd-s4-irrigation-strategy-dg2', 'Automation & fertigation', ['mgd-s4-irrigation-strategy-c3', 'mgd-s4-irrigation-strategy-c4']),
      dg('mgd-s4-irrigation-strategy-dg3', 'Philosophy & certification fit', ['mgd-s4-irrigation-strategy-c5']),
    ],
    completionGate:
      'Irrigation system strategy approved. System type, zones, and automation defined.',
    actHandoff: 'Irrigation System Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Pressure and volume at the furthest irrigation point vs. design target', frequency: 'weekly in season' },
        { metric: 'Irrigation run time per zone vs. plan', frequency: 'weekly' },
        { metric: 'Soil moisture readings against target band where sensors are fitted', frequency: 'weekly in season' },
      ],
      triggers: [
        'Pressure drop at the furthest point -> inspect mainline and zone valves for leaks or blockage',
        'Zone run time rising without yield gain -> check emitters for clogging and recalibrate the schedule',
        'Soil moisture outside the target band -> adjust irrigation timing for that zone',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 'mgd-s4-fertility-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'MGD-S4.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define fertility system strategy',
    shortTitle: 'Fertility system strategy',
    focusedQuestion:
      'How will soil fertility be built and maintained - consistent with the growing philosophy?',
    checklist: [
      ck('mgd-s4-fertility-strategy-c1', 'Define primary fertility inputs - compost, green manures, cover crops, amendments', { feeds: ['mgd-s5-fertility-composting-infrastructure', 's5-soil-improvement'] }),
      ck('mgd-s4-fertility-strategy-c2', 'Define compost production approach - scale, feedstocks, turning frequency', { feeds: ['mgd-s5-fertility-composting-infrastructure', 's7-resource-plan'] }),
      ck('mgd-s4-fertility-strategy-c3', 'Define green manure and cover crop species for rotation integration', { feeds: ['mgd-s5-fertility-composting-infrastructure', 'mgd-s7-crop-calendar'] }),
      ck('mgd-s4-fertility-strategy-c4', 'Define external input substitution plan - what gets replaced over time', { feeds: ['s5-soil-improvement', 's7-resource-plan'] }),
      ck('mgd-s4-fertility-strategy-c5', 'Define fertility monitoring indicators and testing schedule', { feeds: ['s6-monitoring'] }),
      ck('mgd-s4-fertility-strategy-c6', 'Confirm all inputs are consistent with certification requirements if applicable', { feeds: ['mgd-s5-fertility-composting-infrastructure'] }),
    ],
    decisionGroups: [
      dg('mgd-s4-fertility-strategy-dg1', 'Fertility inputs & compost', ['mgd-s4-fertility-strategy-c1', 'mgd-s4-fertility-strategy-c2']),
      dg('mgd-s4-fertility-strategy-dg2', 'Cover crops & input substitution', ['mgd-s4-fertility-strategy-c3', 'mgd-s4-fertility-strategy-c4']),
      dg('mgd-s4-fertility-strategy-dg3', 'Monitoring & certification fit', ['mgd-s4-fertility-strategy-c5', 'mgd-s4-fertility-strategy-c6']),
    ],
    completionGate:
      'Fertility system strategy approved. All inputs confirmed consistent with growing philosophy.',
    actHandoff: 'Fertility System Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Soil organic matter and key nutrient levels against the testing schedule', frequency: 'per season' },
        { metric: 'Compost produced vs. compost demand for the rotation', frequency: 'per cycle' },
        { metric: 'Cover crop establishment and biomass on rotation beds', frequency: 'each window' },
      ],
      triggers: [
        'Soil test falls below the target fertility band -> adjust amendment plan before the next planting',
        'Compost supply short of demand -> scale the compost system or source a compliant input',
        'Cover crop fails to establish -> reseed or substitute a species suited to the window',
      ],
      feeds: 'soil',
    },
  }),
  obj({
    id: 'mgd-s4-ipm-strategy',
    stratumId: 's4-foundation-decisions',
    ref: 'MGD-S4.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define IPM & pest management strategy',
    shortTitle: 'IPM & pest management strategy',
    focusedQuestion:
      'How will pests, diseases, and weeds be managed - consistent with the growing philosophy?',
    checklist: [
      ck('mgd-s4-ipm-strategy-c1', 'Define IPM hierarchy - cultural, biological, physical, chemical as last resort', { feeds: ['mgd-s6-crop-yield-monitoring', 's7-risk-register'] }),
      ck('mgd-s4-ipm-strategy-c2', 'Define acceptable interventions consistent with certification status', { feeds: ['s7-resource-plan', 's7-risk-register'] }),
      ck('mgd-s4-ipm-strategy-c3', 'Define beneficial insect habitat strategy - hedgerows, insectary plantings', { feeds: ['mgd-s5-bed-growing-infrastructure'] }),
      ck('mgd-s4-ipm-strategy-c4', 'Define weed management approach - cultivation timing, mulching, flame weeding', { feeds: ['s7-resource-plan', 'mgd-s7-crop-calendar'] }),
      ck('mgd-s4-ipm-strategy-c5', 'Define disease management approach - variety selection, air circulation, sanitation', { feeds: ['mgd-s5-bed-growing-infrastructure', 'mgd-s7-crop-calendar'] }),
      ck('mgd-s4-ipm-strategy-c6', 'Confirm all interventions are consistent with growing philosophy', { feeds: ['mgd-s6-crop-yield-monitoring'] }),
    ],
    decisionGroups: [
      dg('mgd-s4-ipm-strategy-dg1', 'IPM hierarchy & acceptable interventions', ['mgd-s4-ipm-strategy-c1', 'mgd-s4-ipm-strategy-c2']),
      dg('mgd-s4-ipm-strategy-dg2', 'Beneficials, weed & disease management', ['mgd-s4-ipm-strategy-c3', 'mgd-s4-ipm-strategy-c4', 'mgd-s4-ipm-strategy-c5']),
      dg('mgd-s4-ipm-strategy-dg3', 'Philosophy consistency', ['mgd-s4-ipm-strategy-c6']),
    ],
    completionGate:
      'IPM and pest management strategy approved. All interventions certified-compliant if applicable.',
    actHandoff: 'IPM & Pest Management Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Pest and beneficial-insect counts from scouting by zone', frequency: 'weekly in season' },
        { metric: 'Disease incidence by crop category against the action threshold', frequency: 'weekly' },
        { metric: 'Weed pressure and seed-bank spread on production beds', frequency: 'each cultivation' },
      ],
      triggers: [
        'Pest count crosses the action threshold -> escalate up the IPM hierarchy, biological before chemical',
        'Disease detected in a crop category -> apply sanitation and adjust air circulation, isolate affected beds',
        'Weed pressure rising on a block -> bring forward cultivation, mulching, or flame weeding',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'mgd-s4-post-harvest-handling',
    stratumId: 's4-foundation-decisions',
    ref: 'MGD-S4.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define post-harvest handling & storage strategy',
    shortTitle: 'Post-harvest handling & storage',
    focusedQuestion:
      'How will crops be washed, packed, cooled, and stored to meet market channel requirements?',
    checklist: [
      ck('mgd-s4-post-harvest-handling-c1', 'Define wash and pack process per crop category - wash water quality, grading, pack standard', { feeds: ['mgd-s5-wash-pack-cold-storage'] }),
      ck('mgd-s4-post-harvest-handling-c2', 'Define cooling requirements per crop category - cold chain from harvest to delivery', { feeds: ['mgd-s5-wash-pack-cold-storage', 's7-resource-plan'] }),
      ck('mgd-s4-post-harvest-handling-c3', 'Define storage capacity requirements at peak harvest periods', { feeds: ['mgd-s5-wash-pack-cold-storage', 's7-resource-plan'] }),
      ck('mgd-s4-post-harvest-handling-c4', 'Define food safety requirements - HACCP, hand hygiene, contamination prevention', { feeds: ['mgd-s5-wash-pack-cold-storage', 's7-risk-register'] }),
      ck('mgd-s4-post-harvest-handling-c5', 'Confirm post-harvest standard meets all market channel requirements', { feeds: ['mgd-s6-sales-revenue-tracking'] }),
      ck('mgd-s4-post-harvest-handling-c6', 'Define maximum time from harvest to delivery per channel', { feeds: ['mgd-s7-crop-calendar', 'mgd-s7-season-startup-readiness'] }),
    ],
    decisionGroups: [
      dg('mgd-s4-post-harvest-handling-dg1', 'Wash/pack & cooling', ['mgd-s4-post-harvest-handling-c1', 'mgd-s4-post-harvest-handling-c2']),
      dg('mgd-s4-post-harvest-handling-dg2', 'Storage capacity & food safety', ['mgd-s4-post-harvest-handling-c3', 'mgd-s4-post-harvest-handling-c4']),
      dg('mgd-s4-post-harvest-handling-dg3', 'Channel fit & harvest-to-delivery window', ['mgd-s4-post-harvest-handling-c5', 'mgd-s4-post-harvest-handling-c6']),
    ],
    completionGate:
      'Post-harvest handling and storage strategy approved. Food safety and channel requirements confirmed.',
    actHandoff: 'Post-Harvest Handling & Storage Strategy Brief',
    monitoringProtocol: {
      indicators: [
        { metric: 'Cold storage temperature and humidity against the target range', frequency: 'daily in season' },
        { metric: 'Elapsed time from harvest to cooling and to delivery vs. the defined window', frequency: 'per batch' },
        { metric: 'Produce rejected or downgraded at pack for quality faults', frequency: 'per harvest day' },
      ],
      triggers: [
        'Cold storage drifts outside the target range -> service the unit and move affected stock',
        'Harvest-to-delivery window exceeded -> tighten the pack-shed workflow and recheck cooling capacity',
        'Reject rate climbs at pack -> trace the cause back through wash, handling, and field harvest',
      ],
      feeds: 'plants-food',
    },
  }),
  // ---------------------------------------------------------------- Stratum 5
  obj({
    id: 'mgd-s5-bed-growing-infrastructure',
    stratumId: 's5-system-design',
    ref: 'MGD-S5.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design bed layout & growing infrastructure',
    shortTitle: 'Bed layout & growing infrastructure',
    focusedQuestion:
      'How will production beds, tunnels, and growing infrastructure be physically designed and laid out?',
    checklist: [
      ck('mgd-s5-bed-growing-infrastructure-c1', 'Design permanent bed layout - dimensions, orientation, path widths', { feeds: ['mgd-s6-crop-yield-monitoring', 's7-phase1'] }),
      ck('mgd-s5-bed-growing-infrastructure-c2', 'Design tunnel or polytunnel placement - orientation, anchoring, ventilation', { feeds: ['s7-phase1', 'mgd-s7-crop-calendar'] }),
      ck('mgd-s5-bed-growing-infrastructure-c3', 'Design shade cloth and row cover infrastructure', { feeds: ['s7-resource-plan', 'mgd-s7-crop-calendar'] }),
      ck('mgd-s5-bed-growing-infrastructure-c4', 'Design bed edging and path surfacing', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-bed-growing-infrastructure-c5', 'Design windbreak integration where required', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-bed-growing-infrastructure-c6', 'Confirm layout is consistent with rotation block plan', { feeds: ['s7-phase1'] }),
    ],
    decisionGroups: [
      dg('mgd-s5-bed-growing-infrastructure-dg1', 'Bed layout & tunnels', ['mgd-s5-bed-growing-infrastructure-c1', 'mgd-s5-bed-growing-infrastructure-c2']),
      dg('mgd-s5-bed-growing-infrastructure-dg2', 'Covers, edging & windbreaks', ['mgd-s5-bed-growing-infrastructure-c3', 'mgd-s5-bed-growing-infrastructure-c4', 'mgd-s5-bed-growing-infrastructure-c5']),
      dg('mgd-s5-bed-growing-infrastructure-dg3', 'Rotation-plan consistency', ['mgd-s5-bed-growing-infrastructure-c6']),
    ],
    completionGate: 'Bed layout and growing infrastructure design approved.',
    actHandoff: 'Bed Layout & Growing Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the crop rotation and bed layout plan defined in the strategic foundation decisions.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Marketable yield per bed against the design target', frequency: 'per crop cycle' },
        { metric: 'Beds in active production vs. the planned bed count', frequency: 'per season' },
        { metric: 'Tunnel and row-cover condition - anchoring, ventilation, tears', frequency: 'monthly in season' },
      ],
      triggers: [
        'Per-bed yield falling below target -> review bed orientation, spacing, and soil condition for that block',
        'Tunnel or cover damage observed -> repair the structure before the next planting window',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'mgd-s5-irrigation-system',
    stratumId: 's5-system-design',
    ref: 'MGD-S5.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design irrigation system',
    shortTitle: 'Irrigation system design',
    focusedQuestion:
      'How will the irrigation system be physically designed - mainlines, headers, drip lines, and zone controls?',
    checklist: [
      ck('mgd-s5-irrigation-system-c1', 'Design mainline from source to all irrigation zones', { feeds: ['s7-phase1', 's7-resource-plan'] }),
      ck('mgd-s5-irrigation-system-c2', 'Design zone headers and sublines per bed block', { feeds: ['s7-phase1', 's7-resource-plan'] }),
      ck('mgd-s5-irrigation-system-c3', 'Design drip tape or sprinkler layout per crop category', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-irrigation-system-c4', 'Design zone valve placement and control system', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-irrigation-system-c5', 'Specify pipe sizes, fittings, and pressure regulation', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-irrigation-system-c6', 'Confirm system delivers adequate pressure and volume at furthest point', { feeds: ['s7-risk-register', 'mgd-s7-season-startup-readiness'] }),
    ],
    decisionGroups: [
      dg('mgd-s5-irrigation-system-dg1', 'Mainline & zone headers', ['mgd-s5-irrigation-system-c1', 'mgd-s5-irrigation-system-c2']),
      dg('mgd-s5-irrigation-system-dg2', 'Emitter layout & valves', ['mgd-s5-irrigation-system-c3', 'mgd-s5-irrigation-system-c4']),
      dg('mgd-s5-irrigation-system-dg3', 'Pipe spec & pressure confirmation', ['mgd-s5-irrigation-system-c5', 'mgd-s5-irrigation-system-c6']),
    ],
    completionGate:
      'Irrigation system design approved. Pressure and volume confirmed at all points.',
    actHandoff: 'Irrigation System Design Package',
    buildsOnDisplay:
      'Builds on the irrigation system strategy defined in the strategic foundation decisions.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Pressure and volume at the furthest emitter vs. the design figure', frequency: 'weekly in season' },
        { metric: 'Zone valve and controller function on the scheduled run', frequency: 'weekly' },
        { metric: 'Visible leaks, blockages, or wet spots along mainlines and sublines', frequency: 'per inspection' },
      ],
      triggers: [
        'Pressure or volume short at the furthest point -> inspect the mainline, headers, and pressure regulation for faults',
        'Emitters clogging or a zone failing to run -> flush or replace the line and recalibrate the schedule',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 'mgd-s5-wash-pack-cold-storage',
    stratumId: 's5-system-design',
    ref: 'MGD-S5.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design wash, pack & cool storage infrastructure',
    shortTitle: 'Wash, pack & cold storage',
    focusedQuestion:
      'How will wash, pack, and cold storage facilities be designed to food safety standard?',
    checklist: [
      ck('mgd-s5-wash-pack-cold-storage-c1', 'Design wash area - wash tanks, water supply, drainage, surface materials', { feeds: ['s7-phase1', 's7-resource-plan'] }),
      ck('mgd-s5-wash-pack-cold-storage-c2', 'Design packing bench and grading area - workflow from wash to pack', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-wash-pack-cold-storage-c3', 'Design cold storage - capacity, temperature range, humidity control', { feeds: ['s7-phase1', 's7-resource-plan'] }),
      ck('mgd-s5-wash-pack-cold-storage-c4', 'Design packaging storage area', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-wash-pack-cold-storage-c5', 'Specify all surfaces to food safety standard - cleanable, non-absorbent', { feeds: ['s7-resource-plan', 's7-risk-register'] }),
      ck('mgd-s5-wash-pack-cold-storage-c6', 'Confirm design meets food safety and certification requirements', { feeds: ['mgd-s7-season-startup-readiness', 's7-risk-register'] }),
    ],
    decisionGroups: [
      dg('mgd-s5-wash-pack-cold-storage-dg1', 'Wash area & packing bench', ['mgd-s5-wash-pack-cold-storage-c1', 'mgd-s5-wash-pack-cold-storage-c2']),
      dg('mgd-s5-wash-pack-cold-storage-dg2', 'Cold & packaging storage', ['mgd-s5-wash-pack-cold-storage-c3', 'mgd-s5-wash-pack-cold-storage-c4']),
      dg('mgd-s5-wash-pack-cold-storage-dg3', 'Food-safe surfaces & compliance', ['mgd-s5-wash-pack-cold-storage-c5', 'mgd-s5-wash-pack-cold-storage-c6']),
    ],
    completionGate:
      'Wash, pack, and cold storage design approved. Food safety compliance confirmed.',
    actHandoff: 'Wash, Pack & Cold Storage Design Package',
    buildsOnDisplay:
      'Builds on the post-harvest handling and storage strategy defined in the strategic foundation decisions.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Cold storage temperature and humidity against the target range', frequency: 'daily in season' },
        { metric: 'Throughput from wash to cold storage vs. the designed pack-shed workflow', frequency: 'per harvest day' },
        { metric: 'Surface-cleanliness and food-safety checks against the standard', frequency: 'per cleaning cycle' },
      ],
      triggers: [
        'Cold storage drifts outside the target range -> service the unit and relocate affected stock',
        'Pack-shed throughput falling behind harvest volume -> rebalance the wash-to-pack workflow or staffing',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'mgd-s5-fertility-composting-infrastructure',
    stratumId: 's5-system-design',
    ref: 'MGD-S5.7',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design fertility & composting infrastructure',
    shortTitle: 'Fertility & composting infrastructure',
    focusedQuestion:
      'How will compost bays, worm farms, and fertility application infrastructure be designed?',
    checklist: [
      ck('mgd-s5-fertility-composting-infrastructure-c1', 'Design compost bay system - number, size, turning method', { feeds: ['s7-phase1', 's7-resource-plan'] }),
      ck('mgd-s5-fertility-composting-infrastructure-c2', 'Design worm farm if applicable - capacity, feedstock, leachate collection', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-fertility-composting-infrastructure-c3', 'Design compost application equipment - spreader, wheelbarrow routes', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-fertility-composting-infrastructure-c4', 'Design cover crop seed storage and seeder access', { feeds: ['s7-resource-plan', 'mgd-s7-crop-calendar'] }),
      ck('mgd-s5-fertility-composting-infrastructure-c5', 'Specify materials for all compost infrastructure', { feeds: ['s7-resource-plan'] }),
    ],
    decisionGroups: [
      dg('mgd-s5-fertility-composting-infrastructure-dg1', 'Compost bays & worm farm', ['mgd-s5-fertility-composting-infrastructure-c1', 'mgd-s5-fertility-composting-infrastructure-c2']),
      dg('mgd-s5-fertility-composting-infrastructure-dg2', 'Application equipment & seed storage', ['mgd-s5-fertility-composting-infrastructure-c3', 'mgd-s5-fertility-composting-infrastructure-c4']),
      dg('mgd-s5-fertility-composting-infrastructure-dg3', 'Materials spec', ['mgd-s5-fertility-composting-infrastructure-c5']),
    ],
    completionGate: 'Fertility and composting infrastructure design approved.',
    actHandoff: 'Fertility & Composting Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the fertility system strategy defined in the strategic foundation decisions.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Compost produced through the bay system vs. demand for the rotation', frequency: 'per cycle' },
        { metric: 'Compost maturity and temperature curve across the turning schedule', frequency: 'per batch' },
        { metric: 'Application coverage on production beds vs. the fertility plan', frequency: 'per cycle' },
      ],
      triggers: [
        'Compost output short of bed demand -> add bays, adjust feedstock, or increase turning frequency',
        'Batch failing to reach maturity -> correct the feedstock mix or turning cadence before applying',
      ],
      feeds: 'soil',
    },
  }),
  obj({
    id: 'mgd-s5-propagation-nursery',
    stratumId: 's5-system-design',
    ref: 'MGD-S5.8',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design seedling propagation & nursery infrastructure',
    shortTitle: 'Seedling propagation & nursery',
    focusedQuestion:
      'How will transplant production be designed to eliminate supply-chain dependency?',
    checklist: [
      ck('mgd-s5-propagation-nursery-c1', 'Design propagation area - bench space, light, ventilation, temperature control', { feeds: ['s7-phase1', 's7-resource-plan'] }),
      ck('mgd-s5-propagation-nursery-c2', 'Design heat mat and germination chamber layout', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-propagation-nursery-c3', 'Design irrigation for propagation area - misting, overhead', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-propagation-nursery-c4', 'Design hardening off area - transition from propagation to outdoor conditions', { feeds: ['mgd-s7-crop-calendar'] }),
      ck('mgd-s5-propagation-nursery-c5', 'Specify seed storage conditions', { feeds: ['s7-resource-plan'] }),
      ck('mgd-s5-propagation-nursery-c6', 'Confirm propagation capacity matches transplanting schedule at peak demand', { feeds: ['mgd-s7-crop-calendar', 'mgd-s7-season-startup-readiness'] }),
    ],
    decisionGroups: [
      dg('mgd-s5-propagation-nursery-dg1', 'Propagation area & germination', ['mgd-s5-propagation-nursery-c1', 'mgd-s5-propagation-nursery-c2']),
      dg('mgd-s5-propagation-nursery-dg2', 'Misting & hardening off', ['mgd-s5-propagation-nursery-c3', 'mgd-s5-propagation-nursery-c4']),
      dg('mgd-s5-propagation-nursery-dg3', 'Seed storage & capacity fit', ['mgd-s5-propagation-nursery-c5', 'mgd-s5-propagation-nursery-c6']),
    ],
    completionGate:
      'Seedling propagation and nursery infrastructure design approved. Capacity confirmed against transplanting schedule.',
    actHandoff: 'Seedling Propagation & Nursery Infrastructure Design Package',
    buildsOnDisplay:
      'Builds on the crop rotation and bed layout plan, which sets the transplant demand the nursery must meet.',
    monitoringProtocol: {
      indicators: [
        { metric: 'Healthy transplants produced vs. the transplanting schedule at peak demand', frequency: 'per propagation run' },
        { metric: 'Germination rate by crop in the propagation area against expected', frequency: 'per sowing' },
        { metric: 'Propagation environment - temperature, light, and humidity within the target band', frequency: 'daily in season' },
      ],
      triggers: [
        'Transplant output short of the schedule -> expand bench or germination capacity or stagger sowings',
        'Germination rate dropping below expected -> check heat, moisture, and seed lot, then resow as needed',
      ],
      feeds: 'plants-food',
    },
  }),
  // ---------------------------------------------------------------- Stratum 6
  obj({
    id: 'mgd-s6-crop-yield-monitoring',
    stratumId: 's6-integration-design',
    ref: 'MGD-S6.2',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design crop performance & yield monitoring',
    shortTitle: 'Crop performance & yield monitoring',
    focusedQuestion:
      'How will per-bed and per-crop yield be tracked to drive rotation and variety decisions?',
    checklist: [
      ck('mgd-s6-crop-yield-monitoring-c1', 'Design harvest weight recording per bed and per crop', { feeds: ['mgd-s7-crop-calendar'] }),
      ck('mgd-s6-crop-yield-monitoring-c2', 'Design yield-per-bed comparison system across seasons', { feeds: ['mgd-s7-crop-calendar', 'mgd-s7-financial-viability'] }),
      ck('mgd-s6-crop-yield-monitoring-c3', 'Define variety performance tracking - yield, quality, disease resistance', { feeds: ['mgd-s7-crop-calendar'] }),
      ck('mgd-s6-crop-yield-monitoring-c4', 'Design crop failure recording - cause, severity, management response', { feeds: ['s7-risk-register'] }),
      ck('mgd-s6-crop-yield-monitoring-c5', "Define season-end review process - what data drives next season's plan", { feeds: ['mgd-s7-season-startup-readiness'] }),
    ],
    decisionGroups: [
      dg('mgd-s6-crop-yield-monitoring-dg1', 'Harvest weight & yield comparison', ['mgd-s6-crop-yield-monitoring-c1', 'mgd-s6-crop-yield-monitoring-c2']),
      dg('mgd-s6-crop-yield-monitoring-dg2', 'Variety & crop-failure tracking', ['mgd-s6-crop-yield-monitoring-c3', 'mgd-s6-crop-yield-monitoring-c4']),
      dg('mgd-s6-crop-yield-monitoring-dg3', 'Season-end review', ['mgd-s6-crop-yield-monitoring-c5']),
    ],
    completionGate: 'Crop performance and yield monitoring system approved.',
    actHandoff: 'Crop Performance & Yield Monitoring System',
  }),
  obj({
    id: 'mgd-s6-sales-revenue-tracking',
    stratumId: 's6-integration-design',
    ref: 'MGD-S6.3',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Design sales & revenue tracking system',
    shortTitle: 'Sales & revenue tracking',
    focusedQuestion:
      'How will revenue per crop, per channel, and per season be tracked as the financial feedback loop?',
    checklist: [
      ck('mgd-s6-sales-revenue-tracking-c1', 'Design revenue tracking per crop and per channel', { feeds: ['mgd-s7-financial-viability'] }),
      ck('mgd-s6-sales-revenue-tracking-c2', 'Design cost-of-production tracking per bed or per crop', { feeds: ['mgd-s7-financial-viability'] }),
      ck('mgd-s6-sales-revenue-tracking-c3', 'Define gross margin calculation per crop category', { feeds: ['mgd-s7-financial-viability'] }),
      ck('mgd-s6-sales-revenue-tracking-c4', 'Define channel profitability comparison', { feeds: ['mgd-s7-financial-viability', 'mgd-s7-crop-calendar'] }),
      ck('mgd-s6-sales-revenue-tracking-c5', 'Define financial review frequency - monthly minimum during season', { feeds: ['s7-risk-register'] }),
    ],
    decisionGroups: [
      dg('mgd-s6-sales-revenue-tracking-dg1', 'Revenue & cost tracking', ['mgd-s6-sales-revenue-tracking-c1', 'mgd-s6-sales-revenue-tracking-c2']),
      dg('mgd-s6-sales-revenue-tracking-dg2', 'Margin & channel profitability', ['mgd-s6-sales-revenue-tracking-c3', 'mgd-s6-sales-revenue-tracking-c4']),
      dg('mgd-s6-sales-revenue-tracking-dg3', 'Review frequency', ['mgd-s6-sales-revenue-tracking-c5']),
    ],
    completionGate: 'Sales and revenue tracking system approved.',
    actHandoff: 'Sales & Revenue Tracking System',
  }),
  obj({
    id: 'mgd-s6-adaptive-management',
    stratumId: 's6-integration-design',
    ref: 'MGD-S6.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define adaptive management protocol',
    shortTitle: 'Adaptive management protocol',
    focusedQuestion:
      'How will end-of-season data drive changes to the rotation, variety selection, and infrastructure plan?',
    checklist: [
      ck('mgd-s6-adaptive-management-c1', 'Define annual season review process - yield data, revenue data, soil health reviewed together', { feeds: ['mgd-s7-season-startup-readiness'] }),
      ck('mgd-s6-adaptive-management-c2', 'Define decision triggers - what performance outcome requires a plan change', { feeds: ['s7-risk-register'] }),
      ck('mgd-s6-adaptive-management-c3', 'Define variety replacement protocol - what yield or quality threshold retires a variety', { feeds: ['mgd-s7-crop-calendar'] }),
      ck('mgd-s6-adaptive-management-c4', 'Define rotation adjustment process - what disease or weed pressure triggers a rotation change', { feeds: ['mgd-s7-crop-calendar'] }),
      ck('mgd-s6-adaptive-management-c5', 'Document all changes with season, trigger, and outcome', { feeds: ['mgd-s7-season-startup-readiness'] }),
    ],
    decisionGroups: [
      dg('mgd-s6-adaptive-management-dg1', 'Season review & triggers', ['mgd-s6-adaptive-management-c1', 'mgd-s6-adaptive-management-c2']),
      dg('mgd-s6-adaptive-management-dg2', 'Variety & rotation adjustment', ['mgd-s6-adaptive-management-c3', 'mgd-s6-adaptive-management-c4']),
      dg('mgd-s6-adaptive-management-dg3', 'Change documentation', ['mgd-s6-adaptive-management-c5']),
    ],
    completionGate: 'Adaptive management protocol approved.',
    actHandoff: 'Adaptive Management Protocol',
  }),
  // ---------------------------------------------------------------- Stratum 7
  obj({
    id: 'mgd-s7-crop-calendar',
    stratumId: 's7-phasing-resourcing',
    ref: 'MGD-S7.4',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define crop calendar & production schedule',
    shortTitle: 'Crop calendar & production schedule',
    focusedQuestion:
      'What is the full-year planting and harvest calendar - ensuring supply continuity across all market channels?',
    checklist: [
      ck('mgd-s7-crop-calendar-c1', 'Define planting dates per crop and per bed block across 12 months'),
      ck('mgd-s7-crop-calendar-c2', 'Define succession sowing intervals for continuous supply crops'),
      ck('mgd-s7-crop-calendar-c3', 'Define harvest windows per crop - aligned with market channel schedules'),
      ck('mgd-s7-crop-calendar-c4', 'Map crop calendar against frost dates and tunnel availability'),
      ck('mgd-s7-crop-calendar-c5', 'Confirm calendar delivers supply continuity for all defined channels'),
      ck('mgd-s7-crop-calendar-c6', 'Define off-season production plan - tunnel crops, storage crops, gap filling'),
    ],
    decisionGroups: [
      dg('mgd-s7-crop-calendar-dg1', 'Planting dates & succession', ['mgd-s7-crop-calendar-c1', 'mgd-s7-crop-calendar-c2']),
      dg('mgd-s7-crop-calendar-dg2', 'Harvest windows & frost mapping', ['mgd-s7-crop-calendar-c3', 'mgd-s7-crop-calendar-c4']),
      dg('mgd-s7-crop-calendar-dg3', 'Continuity & off-season plan', ['mgd-s7-crop-calendar-c5', 'mgd-s7-crop-calendar-c6']),
    ],
    completionGate: 'Crop calendar approved. Supply continuity confirmed for all channels.',
    actHandoff: 'Crop Calendar & Production Schedule',
    progressTracking: {
      milestones: [
        {
          metric: 'Planting + succession sowing executed vs. crop calendar',
          cadence: 'per planting window',
        },
        {
          metric: 'Harvest supply continuity vs. market-channel schedules',
          cadence: 'weekly in season',
        },
      ],
    },
  }),
  obj({
    id: 'mgd-s7-financial-viability',
    stratumId: 's7-phasing-resourcing',
    ref: 'MGD-S7.5',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define enterprise financial viability plan',
    shortTitle: 'Enterprise financial viability',
    focusedQuestion:
      'What are the revenue targets, input costs, and break-even requirements per channel?',
    checklist: [
      ck('mgd-s7-financial-viability-c1', 'Calculate gross revenue target at defined production volume and price'),
      ck('mgd-s7-financial-viability-c2', 'Estimate variable costs - seeds, inputs, packaging, market fees'),
      ck('mgd-s7-financial-viability-c3', 'Estimate fixed costs - infrastructure, equipment, depreciation'),
      ck('mgd-s7-financial-viability-c4', 'Calculate break-even production volume per channel'),
      ck('mgd-s7-financial-viability-c5', 'Define minimum viable revenue threshold'),
      ck('mgd-s7-financial-viability-c6', 'Define financial review trigger - revenue shortfall that requires model review'),
    ],
    decisionGroups: [
      dg('mgd-s7-financial-viability-dg1', 'Revenue target & variable costs', ['mgd-s7-financial-viability-c1', 'mgd-s7-financial-viability-c2']),
      dg('mgd-s7-financial-viability-dg2', 'Fixed costs & break-even', ['mgd-s7-financial-viability-c3', 'mgd-s7-financial-viability-c4']),
      dg('mgd-s7-financial-viability-dg3', 'Viability threshold & review trigger', ['mgd-s7-financial-viability-c5', 'mgd-s7-financial-viability-c6']),
    ],
    completionGate: 'Enterprise financial viability plan approved. Break-even confirmed.',
    actHandoff: 'Enterprise Financial Viability Plan',
    progressTracking: {
      milestones: [
        { metric: 'Revenue vs. target by channel', cadence: 'monthly' },
        { metric: 'Production volume vs. break-even by channel', cadence: 'monthly' },
        {
          metric: 'Revenue shortfall vs. defined review trigger',
          cadence: 'monthly, review at threshold breach',
        },
      ],
    },
  }),
  obj({
    id: 'mgd-s7-season-startup-readiness',
    stratumId: 's7-phasing-resourcing',
    ref: 'MGD-S7.6',
    source: 'primary',
    sourceTypeId: PRIMARY,
    title: 'Define season startup & infrastructure readiness protocol',
    shortTitle: 'Season startup & readiness',
    focusedQuestion:
      'What must be confirmed before first planting of each season - ensuring nothing is skipped under time pressure?',
    checklist: [
      ck('mgd-s7-season-startup-readiness-c1', 'Define season startup checklist - irrigation tested, propagation area ready, soil amendments applied'),
      ck('mgd-s7-season-startup-readiness-c2', 'Define pre-season soil test requirement - results reviewed before first planting'),
      ck('mgd-s7-season-startup-readiness-c3', 'Define pest and disease scouting - baseline established before crops in ground'),
      ck('mgd-s7-season-startup-readiness-c4', 'Define pack shed readiness - cool storage operational, food safety supplies restocked'),
      ck('mgd-s7-season-startup-readiness-c5', 'Confirm all market channel relationships renewed and schedules confirmed'),
      ck('mgd-s7-season-startup-readiness-c6', 'Define go/no-go criteria for first planting of season'),
    ],
    decisionGroups: [
      dg('mgd-s7-season-startup-readiness-dg1', 'Startup checklist & soil test', ['mgd-s7-season-startup-readiness-c1', 'mgd-s7-season-startup-readiness-c2']),
      dg('mgd-s7-season-startup-readiness-dg2', 'Scouting & pack shed readiness', ['mgd-s7-season-startup-readiness-c3', 'mgd-s7-season-startup-readiness-c4']),
      dg('mgd-s7-season-startup-readiness-dg3', 'Channel renewal & go/no-go', ['mgd-s7-season-startup-readiness-c5', 'mgd-s7-season-startup-readiness-c6']),
    ],
    completionGate:
      'Season startup protocol approved. All infrastructure and channel readiness confirmed before first planting.',
    actHandoff: 'Season Startup & Infrastructure Readiness Protocol',
    progressTracking: {
      milestones: [
        {
          metric: 'Season startup checklist complete before first planting',
          cadence: 'per season start',
        },
        {
          metric: 'Market-channel relationships renewed + schedules confirmed',
          cadence: 'per season start',
        },
      ],
    },
  }),
];

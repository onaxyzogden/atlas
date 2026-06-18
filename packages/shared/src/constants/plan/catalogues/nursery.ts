// catalogues/nursery.ts
//
// Nursery / Propagation SECONDARY-type objectives - the 8 additive objectives a
// Nursery layer adds when propagation is bolted onto a compatible primary (OLOS
// Nursery Secondary Type Objective Catalogue v1.0, authored to Catalogue
// Authoring Standards v1.5).
//
// Classification (source): "Additive on all compatible primaries" - 8 objectives
// across strata 1-4, NO patch records ("Observe domains added: None new - feeds
// existing Crop Production and Ecology & Habitat domains"). Most useful on Regen
// Farm, Market Garden, Orchard/FF, Conservation, Education.
//
// Stratum mapping: secondary docs number objectives by stratum directly (S1-S4),
// so S1 -> s1-project-foundation, S2 -> s2-land-reading, S3 -> s3-systems-reading,
// S4 -> s4-foundation-decisions. (No Tier+1 shift - that applies only to the
// primary docs, which number by Tier 0-6.) Refs are NRS-S<stratum>.<n>.
//
// Economic note: the only commerce surface is ordinary plant sales / dispatch
// (NRS-S4.3). No advance sale, no financial product, no riba- or gharar-adjacent
// content. Amanah Gate: clean land-stewardship secondary.
//
// source: 'secondary', sourceTypeId: 'nursery', secondaryClass: 'additive' on
// every objective. ASCII-only copy: em/en dashes -> " - "; curly quotes ->
// straight.

import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { ck, dg, obj } from './authoring.js';

// Decision groups (Decision Groups Reference v1.0; OLOS spec 9.3-9.4) - AUTHORED
// under the 2026-05-31 extended override ("author meaningful labels"). The
// reference doc does not enumerate matching groups for this derived nursery
// secondary, so every group here - label, item membership, observeFeeds - is
// authored editorially to partition each objective's checklist into 2-3 named
// decision scopes (full mutually-exclusive partition). This catalogue carries no
// PatchRecords (per the source: "Observe domains added: None new"), so there are
// no injectedGroups.

const SECONDARY = 'nursery' as const;

export const NURSERY_SECONDARY_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------------------------------------------------------------- Stratum 1
  obj({
    id: 'nur-sec-s1-propagation-infra-survey',
    stratumId: 's1-project-foundation',
    ref: 'NRS-S1.1',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A clear read of propagation infrastructure & media resources',
    shortTitle: 'Propagation infrastructure & media resources',
    focusedQuestion:
      'What propagation infrastructure, equipment, and growing media inputs already exist on this site?',
    checklist: [
      ck(
        'nur-sec-s1-propagation-infra-survey-c1',
        'Inventory existing propagation infrastructure - glasshouses, shade houses, benches, misting systems',
        { feeds: ['nur-sec-s4-propagation-infra-design', 's4-zones'] },
      ),
      ck(
        'nur-sec-s1-propagation-infra-survey-c2',
        'Assess condition and capacity of each existing structure',
      ),
      ck(
        'nur-sec-s1-propagation-infra-survey-c3',
        'Identify on-site growing media inputs - compost, woodchip, soil, leaf mould',
        { feeds: ['s5-soil-improvement'] },
      ),
      ck(
        'nur-sec-s1-propagation-infra-survey-c4',
        'Assess compost production capacity - turning space, feedstock, maturation time',
      ),
      ck(
        'nur-sec-s1-propagation-infra-survey-c5',
        'Identify local growing media components available - perlite, coir, sand, biochar sources',
        { feeds: ['s5-soil-improvement', 's7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('nur-sec-s1-propagation-infra-survey-dg1', 'Existing structures', ['nur-sec-s1-propagation-infra-survey-c1', 'nur-sec-s1-propagation-infra-survey-c2'], ['Infrastructure & Access']),
      dg('nur-sec-s1-propagation-infra-survey-dg2', 'On-site media & compost capacity', ['nur-sec-s1-propagation-infra-survey-c3', 'nur-sec-s1-propagation-infra-survey-c4'], ['Soil']),
      dg('nur-sec-s1-propagation-infra-survey-dg3', 'Local media components', ['nur-sec-s1-propagation-infra-survey-c5'], ['Soil']),
    ],
    completionGate:
      'Existing propagation infrastructure inventoried. Growing media resources assessed.',
    actHandoff: 'Existing Propagation Infrastructure & Growing Media Survey',
  }),
  obj({
    id: 'nur-sec-s1-water-survey',
    stratumId: 's1-project-foundation',
    ref: 'NRS-S1.2',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A clear read of water quality & supply for propagation',
    shortTitle: 'Water quality & supply for propagation',
    focusedQuestion:
      'Is the available water suitable for propagation - pH, EC, contamination - and is pressure adequate?',
    checklist: [
      ck(
        'nur-sec-s1-water-survey-c1',
        'Test water quality for propagation suitability - pH, EC, biological contamination',
        { feeds: ['s4-water-strategy', 'nur-sec-s4-irrigation-design'] },
      ),
      ck(
        'nur-sec-s1-water-survey-c2',
        'Test for chemical contamination relevant to sensitive propagation species',
      ),
      ck(
        'nur-sec-s1-water-survey-c3',
        'Measure static and dynamic pressure at proposed propagation points',
        { feeds: ['s4-water-strategy', 'nur-sec-s4-irrigation-design'] },
      ),
      ck(
        'nur-sec-s1-water-survey-c4',
        'Assess water softness - relevant for sensitive native species propagation',
      ),
      ck(
        'nur-sec-s1-water-survey-c5',
        'Confirm water quality meets the growing system philosophy requirements',
      ),
    ],
    decisionGroups: [
      dg('nur-sec-s1-water-survey-dg1', 'Quality & contamination', ['nur-sec-s1-water-survey-c1', 'nur-sec-s1-water-survey-c2'], ['Water & Hydrology']),
      dg('nur-sec-s1-water-survey-dg2', 'Pressure & softness', ['nur-sec-s1-water-survey-c3', 'nur-sec-s1-water-survey-c4'], ['Water & Hydrology']),
      dg('nur-sec-s1-water-survey-dg3', 'Growing-philosophy fit', ['nur-sec-s1-water-survey-c5'], ['Water & Hydrology']),
    ],
    completionGate:
      'Propagation water quality and supply confirmed. Any treatment requirements defined.',
    actHandoff: 'Propagation Water Quality & Supply Survey',
  }),
  // ---------------------------------------------------------------- Stratum 2
  obj({
    id: 'nur-sec-s2-biosecurity-survey',
    stratumId: 's2-land-reading',
    ref: 'NRS-S2.1',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A clear read of pest, disease & biosecurity risks',
    shortTitle: 'Pest, disease & biosecurity risks',
    focusedQuestion:
      "What pest, disease, and biosecurity risks exist in proposed propagation zones - and what is the site's contamination history?",
    checklist: [
      ck(
        'nur-sec-s2-biosecurity-survey-c1',
        'Identify soil-borne diseases in proposed propagation areas - Phytophthora, damping off risk',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'nur-sec-s2-biosecurity-survey-c2',
        'Identify key insect pests relevant to propagation - fungus gnats, aphids, scale',
      ),
      ck(
        'nur-sec-s2-biosecurity-survey-c3',
        'Assess weed contamination risk in potting mix sources',
      ),
      ck(
        'nur-sec-s2-biosecurity-survey-c4',
        'Assess biosecurity risk from existing plant material on site',
        { feeds: ['nur-sec-s4-sales-dispatch', 's7-risk-register'] },
      ),
      ck(
        'nur-sec-s2-biosecurity-survey-c5',
        'Define sanitation and hygiene baseline for proposed propagation areas',
        { feeds: ['nur-sec-s4-sales-dispatch'] },
      ),
    ],
    decisionGroups: [
      dg('nur-sec-s2-biosecurity-survey-dg1', 'Disease & pest risks', ['nur-sec-s2-biosecurity-survey-c1', 'nur-sec-s2-biosecurity-survey-c2'], ['Ecology & Habitat']),
      dg('nur-sec-s2-biosecurity-survey-dg2', 'Weed & material contamination', ['nur-sec-s2-biosecurity-survey-c3', 'nur-sec-s2-biosecurity-survey-c4'], ['Ecology & Habitat']),
      dg('nur-sec-s2-biosecurity-survey-dg3', 'Sanitation baseline', ['nur-sec-s2-biosecurity-survey-c5'], []),
    ],
    completionGate: 'Pest, disease, and biosecurity risk survey complete.',
    actHandoff: 'Propagation Pest, Disease & Biosecurity Risk Survey',
  }),
  // ---------------------------------------------------------------- Stratum 3
  obj({
    id: 'nur-sec-s3-propagation-strategy',
    stratumId: 's3-systems-reading',
    ref: 'NRS-S3.1',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A sound propagation strategy, production mix & biosecurity framework',
    shortTitle: 'Propagation strategy, production mix & biosecurity framework',
    focusedQuestion:
      'What will be propagated, in what volumes, for what purpose - and what biosecurity standard governs production?',
    checklist: [
      ck(
        'nur-sec-s3-propagation-strategy-c1',
        'Define primary propagation purpose - own transplants, surplus sales, restoration stock, or combination',
        { feeds: ['nur-sec-s4-propagation-infra-design', 's7-resource-plan', 's7-phase1'] },
      ),
      ck(
        'nur-sec-s3-propagation-strategy-c2',
        'Define production mix - vegetable seedlings, native tubes, trees, herbs, seeds',
        { feeds: ['nur-sec-s4-propagation-infra-design', 's7-phase1'] },
      ),
      ck(
        'nur-sec-s3-propagation-strategy-c3',
        'Define growing system and input philosophy - peat-free, organic, local provenance',
      ),
      ck(
        'nur-sec-s3-propagation-strategy-c4',
        'Define biosecurity framework - incoming material quarantine protocol, sanitation standards',
        { feeds: ['nur-sec-s4-sales-dispatch', 's7-risk-register'] },
      ),
      ck(
        'nur-sec-s3-propagation-strategy-c5',
        'Identify nursery registration or accreditation requirements if selling to public',
        { feeds: ['s7-risk-register'] },
      ),
      ck(
        'nur-sec-s3-propagation-strategy-c6',
        'Confirm production mix is achievable within available infrastructure and water capacity',
      ),
    ],
    decisionGroups: [
      dg('nur-sec-s3-propagation-strategy-dg1', 'Purpose & production mix', ['nur-sec-s3-propagation-strategy-c1', 'nur-sec-s3-propagation-strategy-c2'], []),
      dg('nur-sec-s3-propagation-strategy-dg2', 'System philosophy & biosecurity', ['nur-sec-s3-propagation-strategy-c3', 'nur-sec-s3-propagation-strategy-c4'], []),
      dg('nur-sec-s3-propagation-strategy-dg3', 'Registration & capacity fit', ['nur-sec-s3-propagation-strategy-c5', 'nur-sec-s3-propagation-strategy-c6'], []),
    ],
    completionGate:
      'Propagation strategy, production mix, and biosecurity framework approved. Regulatory requirements identified.',
    actHandoff:
      'Propagation Strategy, Production Mix & Biosecurity Framework Brief',
  }),
  obj({
    id: 'nur-sec-s3-growing-media',
    stratumId: 's3-systems-reading',
    ref: 'NRS-S3.2',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A sound growing media strategy & fertility inputs',
    shortTitle: 'Growing media strategy & fertility inputs',
    focusedQuestion:
      'What growing media formulations will be used - and how will fertility be managed through the propagation cycle?',
    checklist: [
      ck(
        'nur-sec-s3-growing-media-c1',
        'Define growing media formulation per plant category - propagation mix, potting mix, native mix',
        { feeds: ['s5-soil-improvement', 'nur-sec-s4-propagation-infra-design'] },
      ),
      ck(
        'nur-sec-s3-growing-media-c2',
        'Define on-site compost and organic matter contribution per formulation',
      ),
      ck(
        'nur-sec-s3-growing-media-c3',
        'Define external inputs required and sourcing',
        { feeds: ['s5-soil-improvement', 's7-resource-plan'] },
      ),
      ck(
        'nur-sec-s3-growing-media-c4',
        'Define fertigation or slow-release strategy if applicable',
      ),
      ck(
        'nur-sec-s3-growing-media-c5',
        'Confirm all inputs are consistent with growing system philosophy',
      ),
      ck(
        'nur-sec-s3-growing-media-c6',
        'Define quality testing protocol for growing media batches',
        { feeds: ['s6-monitoring'] },
      ),
    ],
    decisionGroups: [
      dg('nur-sec-s3-growing-media-dg1', 'Formulation & on-site compost', ['nur-sec-s3-growing-media-c1', 'nur-sec-s3-growing-media-c2'], ['Soil']),
      dg('nur-sec-s3-growing-media-dg2', 'External inputs & fertigation', ['nur-sec-s3-growing-media-c3', 'nur-sec-s3-growing-media-c4'], ['Soil']),
      dg('nur-sec-s3-growing-media-dg3', 'Philosophy fit & batch testing', ['nur-sec-s3-growing-media-c5', 'nur-sec-s3-growing-media-c6'], ['Soil']),
    ],
    completionGate: 'Growing media strategy and fertility inputs approved.',
    actHandoff: 'Growing Media Strategy & Fertility Brief',
  }),
  // ---------------------------------------------------------------- Stratum 4
  obj({
    id: 'nur-sec-s4-propagation-infra-design',
    stratumId: 's4-foundation-decisions',
    ref: 'NRS-S4.1',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'Well-designed propagation infrastructure',
    shortTitle: 'Propagation infrastructure',
    focusedQuestion:
      'How will glasshouses, shade houses, misting benches, and propagation zones be physically designed?',
    checklist: [
      ck(
        'nur-sec-s4-propagation-infra-design-c1',
        'Design glasshouse or shade house - orientation, ventilation, shading, heating if required',
      ),
      ck(
        'nur-sec-s4-propagation-infra-design-c2',
        'Design misting bench system - zone layout, nozzle spacing, timer control',
      ),
      ck(
        'nur-sec-s4-propagation-infra-design-c3',
        'Design heat mat benches for germination - zone layout, thermostat control',
      ),
      ck(
        'nur-sec-s4-propagation-infra-design-c4',
        'Design hardening off area - transition from protected to outdoor conditions',
      ),
      ck(
        'nur-sec-s4-propagation-infra-design-c5',
        'Design potting bench - ergonomics, drainage, growing media storage',
      ),
      ck(
        'nur-sec-s4-propagation-infra-design-c6',
        'Confirm capacity meets propagation calendar requirements',
        { feeds: ['s7-phase1', 's7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('nur-sec-s4-propagation-infra-design-dg1', 'Protected growing structures', ['nur-sec-s4-propagation-infra-design-c1', 'nur-sec-s4-propagation-infra-design-c2'], ['Infrastructure & Access']),
      dg('nur-sec-s4-propagation-infra-design-dg2', 'Germination & hardening off', ['nur-sec-s4-propagation-infra-design-c3', 'nur-sec-s4-propagation-infra-design-c4'], ['Infrastructure & Access']),
      dg('nur-sec-s4-propagation-infra-design-dg3', 'Potting & capacity', ['nur-sec-s4-propagation-infra-design-c5', 'nur-sec-s4-propagation-infra-design-c6'], ['Infrastructure & Access']),
    ],
    completionGate:
      'Propagation infrastructure design approved. Capacity confirmed.',
    actHandoff: 'Propagation Infrastructure Design Package',
    monitoringProtocol: {
      indicators: [
        { metric: 'Glasshouse and shade house temperature vs. target range', frequency: 'daily during germination season' },
        { metric: 'Misting bench and heat mat zones operating to set timing and thermostat values', frequency: 'daily' },
        { metric: 'Propagation throughput vs. calendar capacity', frequency: 'per cycle' },
      ],
      triggers: [
        'Structure temperature outside target range -> check ventilation, shading, heating control',
        'Misting or heat mat zone not cycling as set -> inspect timer, thermostat, nozzles',
        'Throughput falling short of calendar capacity -> review bench layout and hardening off flow',
      ],
      feeds: 'plants-food',
    },
  }),
  obj({
    id: 'nur-sec-s4-irrigation-design',
    stratumId: 's4-foundation-decisions',
    ref: 'NRS-S4.2',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'A working irrigation system for propagation zones',
    shortTitle: 'Irrigation system for propagation zones',
    focusedQuestion:
      'How will the irrigation system serve propagation, growing on, and hardening off zones with appropriate uniformity?',
    checklist: [
      ck(
        'nur-sec-s4-irrigation-design-c1',
        'Design misting system for propagation zone - nozzle density, pressure, timer',
      ),
      ck(
        'nur-sec-s4-irrigation-design-c2',
        'Design overhead or drip irrigation for growing on zones',
      ),
      ck(
        'nur-sec-s4-irrigation-design-c3',
        'Design zone valve and control layout',
      ),
      ck(
        'nur-sec-s4-irrigation-design-c4',
        'Specify filtration per zone - propagation requires finer filtration',
      ),
      ck(
        'nur-sec-s4-irrigation-design-c5',
        'Confirm system delivers required uniformity and pressure across all production areas',
        { feeds: ['s7-phase1', 's7-resource-plan'] },
      ),
    ],
    decisionGroups: [
      dg('nur-sec-s4-irrigation-design-dg1', 'Misting & growing-on delivery', ['nur-sec-s4-irrigation-design-c1', 'nur-sec-s4-irrigation-design-c2'], ['Water & Hydrology']),
      dg('nur-sec-s4-irrigation-design-dg2', 'Valves & filtration', ['nur-sec-s4-irrigation-design-c3', 'nur-sec-s4-irrigation-design-c4'], ['Water & Hydrology']),
      dg('nur-sec-s4-irrigation-design-dg3', 'Uniformity confirmation', ['nur-sec-s4-irrigation-design-c5'], ['Water & Hydrology']),
    ],
    completionGate: 'Propagation irrigation system design approved.',
    actHandoff: 'Propagation Irrigation System Design Package',
    monitoringProtocol: {
      indicators: [
        { metric: 'Misting and drip zone delivery pressure vs. design spec', frequency: 'weekly' },
        { metric: 'Distribution uniformity across propagation and growing on zones', frequency: 'per season' },
        { metric: 'Filter condition and zone valve function', frequency: 'monthly' },
      ],
      triggers: [
        'Zone pressure below design spec -> check pump, filters, supply line for restriction',
        'Uniformity drop or dry patches -> inspect nozzles and emitters for blockage or wear',
        'Filter clogging faster than expected -> review source water quality and pre-filtration',
      ],
      feeds: 'hydrology',
    },
  }),
  obj({
    id: 'nur-sec-s4-sales-dispatch',
    stratumId: 's4-foundation-decisions',
    ref: 'NRS-S4.3',
    source: 'secondary',
    sourceTypeId: SECONDARY,
    secondaryClass: 'additive',
    title: 'Well-designed plant sales, dispatch & biosecurity infrastructure',
    shortTitle: 'Plant sales, dispatch & biosecurity infrastructure',
    focusedQuestion:
      'How will plant sales, order dispatch, and incoming material quarantine be physically designed?',
    checklist: [
      ck(
        'nur-sec-s4-sales-dispatch-c1',
        'Design sales or dispatch area - separated from main production zones',
        { feeds: ['s7-phase1', 's7-resource-plan'] },
      ),
      ck(
        'nur-sec-s4-sales-dispatch-c2',
        'Design incoming plant material quarantine zone - isolated from main production, inspection access',
      ),
      ck(
        'nur-sec-s4-sales-dispatch-c3',
        'Design labelling and pricing display system if retail sales are offered',
      ),
      ck(
        'nur-sec-s4-sales-dispatch-c4',
        'Design order picking and packing area',
      ),
      ck(
        'nur-sec-s4-sales-dispatch-c5',
        'Confirm biosecurity zone separation is maintained - production zones isolated from public access',
        { feeds: ['s7-risk-register'] },
      ),
    ],
    decisionGroups: [
      dg('nur-sec-s4-sales-dispatch-dg1', 'Sales & quarantine zones', ['nur-sec-s4-sales-dispatch-c1', 'nur-sec-s4-sales-dispatch-c2'], ['Infrastructure & Access']),
      dg('nur-sec-s4-sales-dispatch-dg2', 'Labelling & packing', ['nur-sec-s4-sales-dispatch-c3', 'nur-sec-s4-sales-dispatch-c4'], ['Infrastructure & Access']),
      dg('nur-sec-s4-sales-dispatch-dg3', 'Zone separation confirmation', ['nur-sec-s4-sales-dispatch-c5'], ['Infrastructure & Access']),
    ],
    completionGate:
      'Plant sales, dispatch, and biosecurity infrastructure design approved. Zone separation confirmed.',
    actHandoff:
      'Plant Sales, Dispatch & Biosecurity Infrastructure Design Package',
    monitoringProtocol: {
      indicators: [
        { metric: 'Order fulfilment lead time from request to dispatch', frequency: 'weekly' },
        { metric: 'Stock hardening off status before dispatch -- share of orders meeting readiness standard', frequency: 'per dispatch run' },
        { metric: 'Dispatch reject or return rate for stock condition', frequency: 'per dispatch run' },
      ],
      triggers: [
        'Lead time rising above target -> review picking, packing, and dispatch area flow',
        'Stock leaving before hardening off complete -> hold dispatch, re-check readiness standard',
        'Reject or return rate climbing -> inspect stock condition and packing handling',
      ],
      feeds: 'plants-food',
    },
  }),
];

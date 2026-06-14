import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 31 ecovillage objectives.
 * Values are IDs from ECOVILLAGE_PRIMARY_PROTOCOLS (4 eco- templates in
 * constants/protocol/catalogues/ecovillage.ts) plus universal protocols
 * (u- templates) — both pools resolve for an ecovillage project via
 * resolveProjectProtocols, mirroring how homestead.ts mixes hs- with universal.
 *
 * Every seeded protocol is a monitoring / review / judgment trigger — governance
 * cadence, contribution-load fairness, resource-load ceilings, land-care cadence,
 * budget/phase review. None creates or implies a sale, advance-purchase, or
 * yield instrument; the two financial objectives carry only budget-review +
 * contribution-fairness triggers (advisory, never a gate).
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const ECOVILLAGE_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Project Foundation
  'ev-s1-legal-governance': [
    'eco-governance-decision-cadence',
    'u-s1-working-agreement-review',
  ],
  'ev-s1-provision-balance': [
    'eco-member-capacity-balance',
    'eco-shared-resource-load',
  ],
  'ev-s1-conflict-framework': [
    'eco-governance-decision-cadence',
    'u-s1-working-agreement-review',
  ],
  'ev-s2-social-fabric': [
    'eco-member-capacity-balance',
    'u-s1-stewardship-capacity-recheck',
  ],

  // S2 — Land Reading
  'ev-s2-carrying-capacity': [
    'eco-shared-resource-load',
    'u-s2-baseline-staleness-resurvey',
  ],
  'ev-s2-tenure-boundary': [
    'u-s3-current-use-change',
  ],
  'ev-s2-landscape-vectors': [
    'u-s2-contamination-signal',
    'u-s4-sector-event-zone-review',
  ],

  // S3 — Systems Reading
  'ev-s3-water-yield': [
    'eco-shared-resource-load',
    'u-s5-water-store-low',
  ],
  'ev-s3-waste-cycling': [
    'eco-shared-resource-load',
    'u-s2-contamination-signal',
  ],
  'ev-s3-energy-potential': [
    'eco-shared-resource-load',
  ],
  'ev-s3-infra-condition': [
    'u-s5-infrastructure-failure',
  ],

  // S4 — Foundation Decisions
  'ev-s4-settlement-strategy': [
    'u-s7-phase-gate-review',
    'eco-shared-resource-load',
  ],
  'ev-s4-infra-strategy': [
    'eco-shared-resource-load',
    'u-s5-infrastructure-failure',
  ],
  'ev-s4-housing-cluster': [
    'u-s4-zone-pressure-review',
  ],
  'ev-s4-food-system': [
    'eco-common-land-stewardship',
    'u-s6-yield-shortfall',
  ],
  // Advisory monitoring only — budget review + contribution fairness; no instrument.
  'ev-s4-financial-model': [
    'eco-member-capacity-balance',
    'u-s7-budget-variance',
  ],

  // S5 — System Design
  'ev-s5-cluster-layout': [
    'u-s4-zone-pressure-review',
  ],
  'ev-s5-communal-systems': [
    'eco-shared-resource-load',
    'u-s5-infrastructure-failure',
  ],
  'ev-s5-sanitation-waste': [
    'eco-shared-resource-load',
    'u-s2-contamination-signal',
  ],
  'ev-s5-energy-system': [
    'eco-shared-resource-load',
    'u-s5-infrastructure-failure',
  ],
  'ev-s5-food-zones': [
    'eco-common-land-stewardship',
    'u-s6-yield-shortfall',
  ],

  // S6 — Integration Design
  'ev-s6-social-monitoring': [
    'eco-governance-decision-cadence',
    'eco-member-capacity-balance',
    'u-s6-stewardship-overload',
  ],
  'ev-s6-maintenance-protocol': [
    'eco-common-land-stewardship',
    'u-s5-infrastructure-failure',
  ],
  'ev-s6-coordination-feedback': [
    'eco-shared-resource-load',
    'u-s5-water-store-low',
  ],
  'ev-s6-external-relations': [
    'u-s3-current-use-change',
  ],

  // S7 — Phasing & Resourcing
  'ev-s7-settlement-plan': [
    'u-s7-phase-gate-review',
    'eco-shared-resource-load',
  ],
  // Advisory monitoring only — budget review + contribution fairness; no instrument.
  'ev-s7-financial-plan': [
    'eco-member-capacity-balance',
    'u-s7-budget-variance',
  ],
  'ev-s7-launch-sequence': [
    'u-s7-phase-gate-review',
  ],
  'ev-s7-onboarding': [
    'eco-member-capacity-balance',
  ],
  'ev-s7-adaptive-management': [
    'u-s7-phase-gate-review',
    'eco-common-land-stewardship',
  ],
  'ev-s7-exit-succession': [
    'eco-governance-decision-cadence',
  ],
};

import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the livestock-operation type — BOTH roles, kept as two
 * role-pure exports because each is validated against a different protocol pool:
 *
 *  - LIVESTOCK_SEEDED_PROTOCOLS (23 lvs-s* primary objectives): pool =
 *    LIVESTOCK_PRIMARY_PROTOCOLS (4 lvo- templates) + universal (u-).
 *  - LIVESTOCK_SECONDARY_SEEDED_PROTOCOLS (7 lvs-sec-s* objectives, surface
 *    only when livestock is layered onto a host): pool = the livestock additive
 *    secondary catalogue (lvo2-integration-grazing-pressure,
 *    lvo2-manure-nutrient-load) + universal. The lvo- primary protocols do NOT
 *    resolve in a secondary context, so they are not seeded in the secondary map.
 *
 * Every seeded protocol is a monitoring / review / threshold / cyclical trigger
 * — stocking-rate vs carrying capacity, feed reserve, herd-health surveillance,
 * water access, and (in the secondary role) integration grazing pressure and
 * manure/nutrient load.
 *
 * Amanah: covenant-aligned. The financial objectives (lvs-s7-break-even,
 * lvs-s7-marketing) carry only budget-variance review (advisory, never a gate).
 * The livestock pool has NO presale/advance-sale review protocol, so none is
 * fabricated for marketing (meat-share / herd-share instruments remain
 * Scholar-Council-gated and out of scope here). Sale of already-possessed stock
 * is clean; nothing here creates, finances, or pre-sells future animals.
 *
 * Objectives absent from these maps have no seeded protocols — no error, no pill.
 */
export const LIVESTOCK_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'lvs-s1-enterprise-vision': [
    'u-s1-vision-drift-check',
  ],
  'lvs-s1-production-goals': [
    'u-s6-yield-shortfall',
  ],
  'lvs-s1-welfare-ethic': [
    'lvo-herd-health-surveillance',
    'u-s1-stewardship-capacity-recheck',
  ],

  // S2 — Land Reading
  'lvs-s2-forage-base': [
    'lvo-stocking-rate-carrying-capacity',
    'u-s6-yield-shortfall',
  ],
  'lvs-s2-stock-water-sources': [
    'lvo-water-access',
    'u-s5-water-store-low',
  ],
  'lvs-s2-existing-infrastructure': [
    'u-s5-infrastructure-failure',
  ],

  // S3 — Systems Reading
  'lvs-s3-carrying-capacity': [
    'lvo-stocking-rate-carrying-capacity',
  ],
  'lvs-s3-health-baseline': [
    'lvo-herd-health-surveillance',
    'u-s2-baseline-staleness-resurvey',
  ],
  'lvs-s3-predator-risk': [
    'lvo-herd-health-surveillance',
    'u-s5-infrastructure-failure',
  ],

  // S4 — Foundation Decisions
  'lvs-s4-species-breed': [
    'lvo-stocking-rate-carrying-capacity',
  ],
  'lvs-s4-stocking-rate': [
    'lvo-stocking-rate-carrying-capacity',
  ],
  'lvs-s4-grazing-system': [
    'lvo-stocking-rate-carrying-capacity',
    'lvo-water-access',
  ],
  'lvs-s4-stock-water-strategy': [
    'lvo-water-access',
    'u-s5-water-store-low',
  ],

  // S5 — System Design
  'lvs-s5-paddock-layout': [
    'lvo-stocking-rate-carrying-capacity',
    'u-s4-zone-pressure-review',
  ],
  'lvs-s5-fencing-water': [
    'lvo-water-access',
    'u-s5-infrastructure-failure',
  ],
  'lvs-s5-handling-shelter': [
    'u-s5-infrastructure-failure',
    'lvo-herd-health-surveillance',
  ],
  'lvs-s5-feed-budget': [
    'lvo-feed-reserve',
  ],

  // S6 — Monitoring & Adaptation
  'lvs-s6-herd-health': [
    'lvo-herd-health-surveillance',
  ],
  'lvs-s6-nutrient-cycling': [
    'u-s2-contamination-signal',
    'lvo-stocking-rate-carrying-capacity',
  ],
  'lvs-s6-biosecurity': [
    'lvo-herd-health-surveillance',
  ],

  // S7 — Phasing & Resourcing
  'lvs-s7-herd-buildup': [
    'lvo-stocking-rate-carrying-capacity',
    'u-s7-phase-gate-review',
  ],
  // Advisory monitoring only — budget review; no instrument.
  'lvs-s7-break-even': [
    'u-s7-budget-variance',
  ],
  // Advisory monitoring only — budget review. No presale protocol exists in the
  // livestock pool and none is fabricated; meat-share / herd-share instruments
  // remain Scholar-Council-gated and out of scope.
  'lvs-s7-marketing': [
    'u-s7-budget-variance',
  ],
};

/**
 * Secondary-role map (livestock layered onto a host). Pool = universal + the
 * livestock additive secondary protocols (lvo2-integration-grazing-pressure,
 * lvo2-manure-nutrient-load). When livestock is a secondary, the dominant
 * standing concerns are the grazing pressure the herd places on the host system
 * and the manure/nutrient load it adds — so the lvo2- protocols land on the
 * carrying-capacity-fit, stocking, integration-timing, and nutrient objectives.
 */
export const LIVESTOCK_SECONDARY_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'lvs-sec-s1-enterprise-intent': [
    'u-s1-vision-drift-check',
  ],

  // S3 — Systems Reading
  'lvs-sec-s3-carrying-capacity-fit': [
    'lvo2-integration-grazing-pressure',
    'u-s6-yield-shortfall',
  ],

  // S4 — Foundation Decisions
  'lvs-sec-s4-species-stocking': [
    'lvo2-integration-grazing-pressure',
  ],
  'lvs-sec-s4-stock-infrastructure': [
    'u-s5-infrastructure-failure',
  ],

  // S5 — System Design
  'lvs-sec-s5-integration-timing': [
    'lvo2-integration-grazing-pressure',
    'lvo2-manure-nutrient-load',
  ],

  // S6 — Monitoring & Adaptation
  'lvs-sec-s6-health-biosecurity': [
    'u-s6-ecology-indicator-decline',
  ],
  'lvs-sec-s6-nutrient-integration': [
    'lvo2-manure-nutrient-load',
    'u-s2-contamination-signal',
  ],
};

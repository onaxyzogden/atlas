import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the wellness type — BOTH roles, kept as two role-pure
 * exports because each is validated against a different protocol pool:
 *
 *  - WELLNESS_SEEDED_PROTOCOLS (27 well-s* primary objectives): pool =
 *    WELLNESS_PRIMARY_PROTOCOLS (3 well- templates) + universal (u-).
 *  - WELLNESS_SECONDARY_SEEDED_PROTOCOLS (5 well-sec-s* objectives, surface
 *    only when wellness is layered onto a host): pool = the wellness additive
 *    secondary catalogue (well2-guest-operation-buffer) + universal. The well-
 *    primary protocols do NOT resolve in a secondary context, so they are not
 *    seeded in the secondary map.
 *
 * Every seeded protocol is a monitoring / review / judgment / cyclical trigger
 * — guest safety & wellbeing, sanctuary quietude, setting integrity, and (in
 * the secondary role) the guest/operation buffer. Wellness has no financial /
 * sale objective, so no advisory-financial or sale protocol arises.
 *
 * Objectives absent from these maps have no seeded protocols — no error, no pill.
 */
export const WELLNESS_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'well-s1-healing-philosophy': [
    'u-s1-vision-drift-check',
  ],
  'well-s1-guest-intake': [
    'well-guest-safety-wellbeing',
  ],
  'well-s1-regulatory-standards': [
    'well-guest-safety-wellbeing',
  ],
  'well-s1-privacy-policy': [
    'u-s1-working-agreement-review',
  ],

  // S2 — Land Reading
  'well-s2-sensory-environment': [
    'well-sanctuary-quietude',
    'well-setting-integrity',
  ],
  'well-s2-retreat-infrastructure': [
    'u-s5-infrastructure-failure',
  ],
  'well-s2-landscape-context': [
    'u-s2-baseline-staleness-resurvey',
    'u-s4-sector-event-zone-review',
  ],
  'well-s2-privacy-gradient': [
    'well-sanctuary-quietude',
  ],

  // S3 — Systems Reading
  'well-s3-acoustic-conditions': [
    'well-sanctuary-quietude',
  ],
  'well-s3-water-features': [
    'u-s5-water-store-low',
    'well-setting-integrity',
  ],
  'well-s3-healing-garden-ecology': [
    'well-setting-integrity',
    'u-s6-ecology-indicator-decline',
  ],

  // S4 — Foundation Decisions
  'well-s4-sensory-design-standards': [
    'well-sanctuary-quietude',
    'well-setting-integrity',
  ],
  'well-s4-therapeutic-program': [
    'well-guest-safety-wellbeing',
  ],
  'well-s4-privacy-zone-hierarchy': [
    'well-sanctuary-quietude',
  ],
  'well-s4-healing-garden-strategy': [
    'well-setting-integrity',
  ],
  'well-s4-safeguarding-protocol': [
    'well-guest-safety-wellbeing',
  ],

  // S5 — System Design
  'well-s5-treatment-spaces': [
    'u-s5-infrastructure-failure',
    'well-guest-safety-wellbeing',
  ],
  'well-s5-healing-garden-design': [
    'well-setting-integrity',
  ],
  'well-s5-guest-accommodation': [
    'u-s5-infrastructure-failure',
    'well-guest-safety-wellbeing',
  ],
  'well-s5-privacy-screening': [
    'well-sanctuary-quietude',
  ],
  'well-s5-dining-nourishment': [
    'u-s6-yield-shortfall',
    'well-guest-safety-wellbeing',
  ],

  // S6 — Monitoring & Adaptation
  'well-s6-outcome-monitoring': [
    'well-guest-safety-wellbeing',
    'u-s1-vision-drift-check',
  ],
  'well-s6-sensory-monitoring': [
    'well-sanctuary-quietude',
    'well-setting-integrity',
  ],
  'well-s6-external-relations': [
    'u-s1-working-agreement-review',
  ],

  // S7 — Phasing & Resourcing
  'well-s7-program-launch': [
    'u-s7-phase-gate-review',
  ],
  'well-s7-practitioner-onboarding': [
    'u-s7-labour-shortfall',
  ],
  'well-s7-adaptive-management': [
    'u-s7-phase-gate-review',
    'well-setting-integrity',
  ],
};

/**
 * Secondary-role map (wellness layered onto a host). Pool = universal +
 * the wellness additive secondary protocol (well2-guest-operation-buffer).
 * When wellness is a secondary, the dominant standing concern is buffering the
 * therapeutic guest experience from the host's working operations, so the
 * buffer protocol lands on the sensory, programme, safeguarding, and (with a
 * governance review) regulatory objectives.
 */
export const WELLNESS_SECONDARY_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'well-sec-s1-healing-philosophy': [
    'u-s1-vision-drift-check',
  ],
  'well-sec-s1-regulatory-standards': [
    'well2-guest-operation-buffer',
    'u-s1-working-agreement-review',
  ],

  // S4 — Foundation Decisions
  'well-sec-s4-sensory-standards': [
    'well2-guest-operation-buffer',
  ],
  'well-sec-s4-therapeutic-program': [
    'well2-guest-operation-buffer',
  ],
  'well-sec-s4-safeguarding': [
    'well2-guest-operation-buffer',
  ],
};

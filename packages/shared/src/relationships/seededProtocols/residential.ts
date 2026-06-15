import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 6 residential objectives.
 * Residential is `canBePrimary:false` — it only exists layered onto a host, so
 * it is a SECONDARY-ONLY type (like nursery). Its objectives (res-s*) therefore
 * resolve against the universal pool + the residential additive secondary
 * protocols (res2-dwelling-water-safety, res2-dwelling-livelihood-buffer,
 * res2-household-waste). There are no residential PRIMARY protocols to seed.
 *
 * Every seeded protocol is a monitoring / review / threshold / cyclical trigger
 * — dwelling water safety, the livelihood buffer between household and host
 * operations, household waste load, plus universal infra/zone/yield/phase
 * checks. None creates or implies a sale.
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const RESIDENTIAL_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'res-s1-household-needs': [
    'u-s1-vision-drift-check',
    'res2-dwelling-livelihood-buffer',
  ],

  // S3 — Systems Reading
  'res-s3-water-quality': [
    'res2-dwelling-water-safety',
    'u-s2-contamination-signal',
  ],

  // S4 — Foundation Decisions
  'res-s4-living-zone': [
    'res2-dwelling-livelihood-buffer',
    'u-s4-zone-pressure-review',
  ],

  // S5 — System Design
  'res-s5-living-infrastructure': [
    'u-s5-infrastructure-failure',
    'res2-household-waste',
  ],

  // S6 — Monitoring & Adaptation
  'res-s6-self-sufficiency': [
    'u-s6-yield-shortfall',
  ],

  // S7 — Phasing & Resourcing
  'res-s7-phasing': [
    'u-s7-phase-gate-review',
  ],
};

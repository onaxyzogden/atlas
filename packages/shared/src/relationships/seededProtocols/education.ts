import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 22 education objectives.
 * Values are IDs from EDUCATION_PRIMARY_PROTOCOLS (3 edu- templates in
 * constants/protocol/catalogues/education.ts) plus universal protocols
 * (u- templates) — both pools resolve for an education-primary project via
 * resolveProjectProtocols. The edu2- secondary protocols are NOT seeded here:
 * education has no secondary objective catalogue, so they are unreachable.
 *
 * Every seeded protocol is a monitoring / review / judgment / cyclical trigger
 * — learner safety, demo-plot integrity, curriculum-season alignment, plus
 * universal infra/baseline/phase checks. None creates or implies a sale; the
 * financial objective (financial-viability) carries only budget-variance
 * review (advisory, never a gate). The education pool has no presale protocol
 * and none is fabricated.
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const EDUCATION_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'edu-s1-mission-audience': [
    'u-s1-vision-drift-check',
  ],
  'edu-s1-curriculum-programs': [
    'edu-curriculum-season-align',
  ],
  'edu-s1-regulatory-framework': [
    'edu-learner-safety',
  ],

  // S2 — Land Reading
  'edu-s2-teaching-infrastructure': [
    'u-s5-infrastructure-failure',
  ],
  'edu-s2-learning-potential': [
    'edu-demo-plot-integrity',
    'u-s2-baseline-staleness-resurvey',
  ],
  'edu-s2-landscape-vectors': [
    'u-s2-baseline-staleness-resurvey',
    'u-s4-sector-event-zone-review',
  ],

  // S3 — Systems Reading
  'edu-s3-learner-access-safety': [
    'edu-learner-safety',
    'u-s5-access-track-erosion',
  ],
  'edu-s3-demo-baseline': [
    'edu-demo-plot-integrity',
    'u-s2-baseline-staleness-resurvey',
  ],

  // S4 — Foundation Decisions
  'edu-s4-teaching-zone-allocation': [
    'u-s4-zone-pressure-review',
  ],
  'edu-s4-safety-risk-framework': [
    'edu-learner-safety',
  ],
  'edu-s4-program-delivery': [
    'edu-curriculum-season-align',
  ],
  'edu-s4-food-hospitality': [
    'u-s6-yield-shortfall',
    'u-s7-material-availability',
  ],

  // S5 — System Design
  'edu-s5-teaching-spaces': [
    'u-s5-infrastructure-failure',
  ],
  'edu-s5-demo-plots-signage': [
    'edu-demo-plot-integrity',
  ],
  'edu-s5-learner-amenity': [
    'u-s5-infrastructure-failure',
  ],
  'edu-s5-food-kitchen': [
    'u-s5-infrastructure-failure',
  ],

  // S6 — Monitoring & Adaptation
  'edu-s6-program-evaluation': [
    'edu-curriculum-season-align',
    'u-s1-vision-drift-check',
  ],
  'edu-s6-external-relations-compliance': [
    'edu-learner-safety',
  ],
  'edu-s6-adaptive-management': [
    'u-s7-phase-gate-review',
    'edu-curriculum-season-align',
  ],

  // S7 — Phasing & Resourcing
  'edu-s7-program-launch': [
    'u-s7-phase-gate-review',
  ],
  'edu-s7-instructor-onboarding': [
    'u-s7-labour-shortfall',
  ],
  // Advisory monitoring only — budget review; no instrument.
  'edu-s7-financial-viability': [
    'u-s7-budget-variance',
  ],
};

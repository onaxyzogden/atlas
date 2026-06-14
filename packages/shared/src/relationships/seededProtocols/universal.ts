import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 19 universal objectives.
 * Values are IDs from UNIVERSAL_PROTOCOL_TEMPLATES (constants/protocol/catalogues/universal.ts).
 * Objectives absent from this map have no seeded protocols — no error, no pill strip.
 */
export const UNIVERSAL_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Project Foundation
  's1-vision': [
    'u-s1-vision-drift-check',
    'u-s1-stewardship-capacity-recheck',
    'u-s1-working-agreement-review',
  ],
  's1-stakeholders': [
    'u-s1-working-agreement-review',
  ],

  // S2 — Land Reading
  's2-terrain': [
    'u-s2-new-erosion-signal',
    'u-s2-baseline-staleness-resurvey',
  ],
  's2-climate': [
    'u-s4-sector-event-zone-review',
    'u-s2-baseline-staleness-resurvey',
  ],
  's2-ecology': [
    'u-s6-ecology-indicator-decline',
    'u-s2-baseline-staleness-resurvey',
  ],
  's2-infrastructure': [
    'u-s5-infrastructure-failure',
    'u-s5-access-track-erosion',
  ],

  // S3 — Systems Reading
  's3-hydrology': [
    'u-s3-flow-anomaly-reassess',
  ],
  's3-soil': [
    'u-s2-contamination-signal',
    'u-s3-flow-anomaly-reassess',
  ],

  // S4 — Foundation Decisions
  's4-direction': [
    'u-s3-current-use-change',
  ],
  's4-water-strategy': [
    'u-s5-water-store-low',
    'u-s5-earthworks-overflow',
  ],
  's4-zones': [
    'u-s4-zone-pressure-review',
    'u-s4-sector-event-zone-review',
  ],

  // S5 — System Design
  's5-access': [
    'u-s5-access-track-erosion',
  ],
  's5-water-infrastructure': [
    'u-s5-water-store-low',
    'u-s5-earthworks-overflow',
  ],
  's5-soil-improvement': [
    'u-s2-contamination-signal',
  ],

  // S6 — Integration Design
  's6-monitoring': [
    'u-s6-yield-shortfall',
    'u-s6-ecology-indicator-decline',
    'u-s6-stewardship-overload',
    'u-s6-abundance-surplus',
  ],

  // S7 — Phasing & Resourcing
  's7-phase1': [
    'u-s7-phase-gate-review',
    'u-s7-labour-shortfall',
  ],
  's7-resource-plan': [
    'u-s7-budget-variance',
    'u-s7-material-availability',
    'u-s7-labour-shortfall',
  ],
  's7-risk-register': [
    'u-s7-budget-variance',
    'u-s7-material-availability',
  ],
};

import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 30 conservation objectives.
 * Values are IDs from CONSERVATION_PRIMARY_PROTOCOLS (3 cons- templates in
 * constants/protocol/catalogues/conservation.ts) plus universal protocols
 * (u- templates) — both pools resolve for a conservation-primary project via
 * resolveProjectProtocols.
 *
 * Every seeded protocol is a monitoring / review / judgment / threshold /
 * cyclical trigger — invasive incursion, habitat-indicator trend, disturbance
 * (fire) events, plus universal water/erosion/infra/phase checks. None creates
 * or implies a sale. The tenure-covenant objective carries working-agreement
 * (governance) review and the funding-resourcing objective carries
 * budget-variance + material-availability review — both advisory, never a gate.
 * The conservation pool has no presale protocol and none is fabricated.
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const CONSERVATION_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'con-s1-conservation-intent': [
    'u-s1-vision-drift-check',
  ],
  'con-s1-intervention-philosophy': [
    'u-s1-vision-drift-check',
  ],
  // Advisory governance review only — tenure / covenant agreement; no instrument.
  'con-s1-tenure-covenant': [
    'u-s1-working-agreement-review',
  ],

  // S2 — Land Reading
  'con-s2-baseline-condition': [
    'cons-habitat-indicator-trend',
    'u-s2-baseline-staleness-resurvey',
  ],
  'con-s2-degradation-history': [
    'u-s2-baseline-staleness-resurvey',
  ],
  'con-s2-landscape-context': [
    'u-s2-baseline-staleness-resurvey',
    'u-s4-sector-event-zone-review',
  ],
  'con-s2-invasive-distribution': [
    'cons-invasive-incursion',
  ],

  // S3 — Systems Reading
  'con-s3-water-regime-degradation': [
    'u-s3-flow-anomaly-reassess',
    'u-s2-contamination-signal',
  ],
  'con-s3-soil-biology-seedbank': [
    'cons-habitat-indicator-trend',
    'u-s2-baseline-staleness-resurvey',
  ],
  'con-s3-wildlife-presence': [
    'cons-habitat-indicator-trend',
    'u-s6-ecology-indicator-decline',
  ],
  'con-s3-fire-history': [
    'cons-disturbance-event',
    'u-s4-sector-event-zone-review',
  ],

  // S4 — Foundation Decisions
  'con-s4-restoration-priority-zones': [
    'u-s4-zone-pressure-review',
  ],
  'con-s4-native-species-provenance': [
    'u-s7-material-availability',
  ],
  'con-s4-pest-invasive-strategy': [
    'cons-invasive-incursion',
  ],
  'con-s4-water-regime-restoration': [
    'u-s5-earthworks-overflow',
    'u-s3-flow-anomaly-reassess',
  ],
  'con-s4-fire-management-strategy': [
    'cons-disturbance-event',
    'u-s4-sector-event-zone-review',
  ],

  // S5 — System Design
  'con-s5-native-planting-plan': [
    'cons-habitat-indicator-trend',
    'u-s7-material-availability',
  ],
  'con-s5-pest-control-infrastructure': [
    'cons-invasive-incursion',
    'u-s5-infrastructure-failure',
  ],
  'con-s5-water-regime-infrastructure': [
    'u-s5-infrastructure-failure',
    'u-s5-earthworks-overflow',
  ],
  'con-s5-wildlife-habitat-infrastructure': [
    'cons-habitat-indicator-trend',
    'u-s5-infrastructure-failure',
  ],
  'con-s5-fencing-exclusion': [
    'u-s5-infrastructure-failure',
    'cons-invasive-incursion',
  ],

  // S6 — Monitoring & Adaptation
  'con-s6-ecological-monitoring': [
    'cons-habitat-indicator-trend',
    'u-s6-ecology-indicator-decline',
  ],
  'con-s6-pest-monitoring': [
    'cons-invasive-incursion',
  ],
  'con-s6-fire-monitoring': [
    'cons-disturbance-event',
    'u-s4-sector-event-zone-review',
  ],
  'con-s6-external-relations-compliance': [
    'u-s1-working-agreement-review',
  ],

  // S7 — Phasing & Resourcing
  'con-s7-phase1-priorities': [
    'u-s7-phase-gate-review',
  ],
  'con-s7-longterm-timeline': [
    'u-s7-phase-gate-review',
  ],
  // Advisory monitoring only — budget + material review; no instrument.
  'con-s7-funding-resourcing': [
    'u-s7-budget-variance',
    'u-s7-material-availability',
  ],
  'con-s7-adaptive-management': [
    'u-s7-phase-gate-review',
    'cons-habitat-indicator-trend',
  ],
  'con-s7-volunteer-stewardship': [
    'u-s6-stewardship-overload',
    'u-s7-labour-shortfall',
  ],
};

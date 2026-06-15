import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 13 regenerative-farm objectives.
 * Values are IDs from REGEN_FARM_PRIMARY_PROTOCOLS (4 rf- templates in
 * constants/protocol/catalogues/regenFarm.ts) plus universal protocols
 * (u- templates) — both pools resolve for a regen-farm-primary project via
 * resolveProjectProtocols, mirroring how orchard.ts mixes orch- with universal.
 *
 * Every seeded protocol is a monitoring / review / judgment / threshold /
 * cyclical trigger — ground-cover floor, pasture rest period, soil-carbon
 * trend, external-input dependency, plus universal erosion/ecology/infra/phase
 * checks. None creates or implies a sale, advance-purchase, or yield
 * instrument; the financial objectives (enterprise-sequencing, cash-flow)
 * carry only phase-gate / budget-variance review (advisory, never a gate).
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const REGEN_FARM_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'rf-s1-enterprise-mix': [
    'u-s1-vision-drift-check',
  ],

  // S2 — Land Reading
  'rf-s2-land-health': [
    'rf-soil-carbon-trend',
    'u-s2-baseline-staleness-resurvey',
  ],
  'rf-s2-landscape-context': [
    'u-s2-baseline-staleness-resurvey',
    'u-s4-sector-event-zone-review',
  ],

  // S3 — Systems Reading
  'rf-s3-nutrient-cycling': [
    'rf-input-dependency',
    'rf-soil-carbon-trend',
  ],
  'rf-s3-pest-pressure': [
    'u-s6-ecology-indicator-decline',
  ],

  // S4 — Foundation Decisions
  'rf-s4-fertility-strategy': [
    'rf-input-dependency',
    'rf-ground-cover-floor',
  ],
  'rf-s4-biodiversity-strategy': [
    'u-s6-ecology-indicator-decline',
  ],

  // S5 — System Design
  'rf-s5-fertility-system': [
    'rf-ground-cover-floor',
    'rf-input-dependency',
  ],
  'rf-s5-windbreaks': [
    'u-s4-sector-event-zone-review',
  ],

  // S6 — Monitoring & Adaptation
  'rf-s6-biodiversity-monitoring': [
    'u-s6-ecology-indicator-decline',
    'u-s6-yield-shortfall',
  ],
  'rf-s6-enterprise-integration': [
    'rf-rotation-rest-period',
    'u-s6-stewardship-overload',
  ],

  // S7 — Phasing & Resourcing
  // Advisory monitoring only — phase-gate + budget review; no instrument.
  'rf-s7-enterprise-sequencing': [
    'u-s7-phase-gate-review',
    'u-s7-budget-variance',
  ],
  // Advisory monitoring only — budget review; no instrument.
  'rf-s7-cash-flow': [
    'u-s7-budget-variance',
  ],
};

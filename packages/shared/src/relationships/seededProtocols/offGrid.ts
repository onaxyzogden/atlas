import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 27 off-grid objectives.
 * Values are IDs from OFF_GRID_PRIMARY_PROTOCOLS (4 og- templates in
 * constants/protocol/catalogues/offGrid.ts) plus universal protocols
 * (u- templates) — both pools resolve for an off-grid-primary project via
 * resolveProjectProtocols.
 *
 * Every seeded protocol is a monitoring / review / threshold / cyclical trigger
 * — battery state-of-charge, water autonomy, system redundancy, waste-system
 * capacity, plus universal water/access/infra/phase checks. Off-grid has no
 * financial / sale objective, so no advisory-financial or sale protocol arises;
 * the focus is systems resilience and self-sufficiency.
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const OFF_GRID_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'ofg-s1-resilience-philosophy': [
    'u-s1-vision-drift-check',
  ],
  'ofg-s1-critical-systems-redundancy': [
    'og-system-redundancy',
  ],
  'ofg-s1-site-selection-access': [
    'u-s5-access-track-erosion',
  ],

  // S2 — Land Reading
  'ofg-s2-water-sources-yield': [
    'og-water-autonomy',
    'u-s5-water-store-low',
  ],
  'ofg-s2-energy-generation-potential': [
    'og-battery-state-of-charge',
  ],
  'ofg-s2-access-road-emergency-route': [
    'u-s5-access-track-erosion',
  ],
  'ofg-s2-fire-risk-evacuation': [
    'u-s4-sector-event-zone-review',
  ],

  // S3 — Systems Reading
  'ofg-s3-water-quality-treatment': [
    'u-s2-contamination-signal',
    'og-waste-system-capacity',
  ],
  'ofg-s3-energy-demand-balance': [
    'og-battery-state-of-charge',
  ],
  'ofg-s3-communications-connectivity': [
    'og-system-redundancy',
    'u-s5-infrastructure-failure',
  ],
  'ofg-s3-food-production-storage-conditions': [
    'u-s6-yield-shortfall',
    'u-s5-infrastructure-failure',
  ],

  // S4 — Foundation Decisions
  'ofg-s4-water-system-redundancy': [
    'og-water-autonomy',
    'og-system-redundancy',
  ],
  'ofg-s4-energy-system-redundancy': [
    'og-battery-state-of-charge',
    'og-system-redundancy',
  ],
  'ofg-s4-food-security-storage': [
    'u-s6-yield-shortfall',
    'u-s5-infrastructure-failure',
  ],
  'ofg-s4-emergency-comms-response': [
    'og-system-redundancy',
    'u-s5-infrastructure-failure',
  ],
  'ofg-s4-shelter-thermal-performance': [
    'u-s5-infrastructure-failure',
  ],

  // S5 — System Design
  'ofg-s5-water-system-infrastructure': [
    'og-water-autonomy',
    'u-s5-infrastructure-failure',
  ],
  'ofg-s5-energy-system-infrastructure': [
    'og-battery-state-of-charge',
    'u-s5-infrastructure-failure',
  ],
  'ofg-s5-shelter-thermal-infrastructure': [
    'u-s5-infrastructure-failure',
  ],
  'ofg-s5-food-production-infrastructure': [
    'u-s5-infrastructure-failure',
    'u-s6-yield-shortfall',
  ],
  'ofg-s5-communications-emergency-infrastructure': [
    'og-system-redundancy',
    'u-s5-infrastructure-failure',
  ],

  // S6 — Monitoring & Adaptation
  'ofg-s6-systems-performance-monitoring': [
    'og-system-redundancy',
    'og-battery-state-of-charge',
  ],
  'ofg-s6-emergency-preparedness-monitoring': [
    'og-system-redundancy',
    'u-s4-sector-event-zone-review',
  ],
  'ofg-s6-adaptive-management': [
    'u-s7-phase-gate-review',
    'og-system-redundancy',
  ],

  // S7 — Phasing & Resourcing
  'ofg-s7-systems-establishment-sequence': [
    'u-s7-phase-gate-review',
  ],
  'ofg-s7-resourcing-supply-chain': [
    'u-s7-material-availability',
  ],
  'ofg-s7-phased-habitation': [
    'u-s7-phase-gate-review',
  ],
};

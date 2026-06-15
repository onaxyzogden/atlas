import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 34 agritourism objectives.
 * Values are IDs from AGRITOURISM_PRIMARY_PROTOCOLS (4 agri- templates in
 * constants/protocol/catalogues/agritourism.ts) plus universal protocols
 * (u- templates) — both pools resolve for an agritourism-primary project via
 * resolveProjectProtocols. The agri2- secondary protocol is NOT seeded here:
 * it only resolves when agritourism is layered as a secondary, and agritourism
 * has no secondary objective catalogue, so it is unreachable.
 *
 * Amanah: covenant-aligned. The revenue and booking objectives
 * (ag-s4-revenue-model, ag-s7-booking-system) seed agri-experience-presale — a
 * JUDGMENT trigger that exists precisely to review the offer against the Amanah
 * gate (a booking for a defined, deliverable, dated service is ordinarily
 * sound; a subscription to a not-yet-existing harvest experience is not).
 * Seeding it is therefore covenant-aligned, not a violation. No CSRA/salam;
 * nothing creates, finances, or pre-sells an undeliverable experience.
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const AGRITOURISM_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'ag-s1-experience-vision': [
    'u-s1-vision-drift-check',
  ],
  'ag-s1-visitor-capacity': [
    'agri-visitor-load-disturbance',
    'u-s4-zone-pressure-review',
  ],
  'ag-s1-regulatory-framework': [
    'agri-visitor-safety-check',
  ],

  // S2 — Land Reading
  'ag-s2-arrival-experience': [
    'agri-visitor-safety-check',
  ],
  'ag-s2-hospitality-infra': [
    'u-s5-infrastructure-failure',
  ],
  'ag-s2-landscape-context': [
    'u-s2-baseline-staleness-resurvey',
    'u-s4-sector-event-zone-review',
  ],
  'ag-s2-seasonal-patterns': [
    'u-s4-sector-event-zone-review',
  ],

  // S3 — Systems Reading
  'ag-s3-water-sanitation-demand': [
    'u-s5-water-store-low',
    'u-s5-infrastructure-failure',
  ],
  'ag-s3-sensory-environment': [
    'agri-visitor-load-disturbance',
  ],
  'ag-s3-emergency-access': [
    'agri-visitor-safety-check',
    'u-s5-access-track-erosion',
  ],
  'ag-s3-food-production-capacity': [
    'u-s6-yield-shortfall',
  ],
  'ag-s3-ecological-carrying-capacity': [
    'agri-visitor-load-disturbance',
    'u-s6-ecology-indicator-decline',
  ],

  // S4 — Foundation Decisions
  'ag-s4-circulation-strategy': [
    'agri-visitor-load-disturbance',
    'u-s4-zone-pressure-review',
  ],
  'ag-s4-service-model': [
    'u-s6-stewardship-overload',
  ],
  'ag-s4-food-strategy': [
    'u-s6-yield-shortfall',
    'u-s7-material-availability',
  ],
  'ag-s4-safety-compliance': [
    'agri-visitor-safety-check',
  ],
  // Advance-experience review against the Amanah gate (deliverable, dated only).
  'ag-s4-revenue-model': [
    'agri-experience-presale',
  ],
  'ag-s4-biosecurity-zoning': [
    'agri-biosecurity-visitor',
  ],

  // S5 — System Design
  'ag-s5-accommodation': [
    'u-s5-infrastructure-failure',
  ],
  'ag-s5-dining-infra': [
    'u-s5-infrastructure-failure',
  ],
  'ag-s5-programming-infra': [
    'u-s5-infrastructure-failure',
  ],
  'ag-s5-sanitation-infra': [
    'u-s5-infrastructure-failure',
  ],
  'ag-s5-safety-infra': [
    'agri-visitor-safety-check',
    'u-s5-infrastructure-failure',
  ],
  'ag-s5-dispersed-siting': [
    'u-s4-zone-pressure-review',
  ],
  'ag-s5-decentralised-servicing': [
    'u-s5-infrastructure-failure',
  ],

  // S6 — Monitoring & Adaptation
  'ag-s6-experience-feedback': [
    'agri-visitor-load-disturbance',
  ],
  'ag-s6-compliance-monitoring': [
    'agri-visitor-safety-check',
  ],
  'ag-s6-food-integration': [
    'agri-biosecurity-visitor',
    'u-s6-yield-shortfall',
  ],
  'ag-s6-load-monitoring': [
    'agri-visitor-load-disturbance',
    'u-s6-ecology-indicator-decline',
  ],

  // S7 — Phasing & Resourcing
  'ag-s7-staffing-training': [
    'u-s7-labour-shortfall',
  ],
  // Booking structure reviewed against the Amanah gate (deliverable, dated only).
  'ag-s7-booking-system': [
    'agri-experience-presale',
  ],
  'ag-s7-phased-launch': [
    'u-s7-phase-gate-review',
  ],
  'ag-s7-adaptive-management': [
    'u-s7-phase-gate-review',
    'agri-visitor-load-disturbance',
  ],
  'ag-s7-seasonal-resilience': [
    'u-s4-sector-event-zone-review',
  ],
};

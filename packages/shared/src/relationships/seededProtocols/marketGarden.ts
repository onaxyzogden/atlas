import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 24 market-garden objectives.
 * Values are IDs from MARKET_GARDEN_PRIMARY_PROTOCOLS (4 mg- templates in
 * constants/protocol/catalogues/marketGarden.ts) plus universal protocols
 * (u- templates) — both pools resolve for a market-garden-primary project via
 * resolveProjectProtocols. The mg2- secondary protocols are NOT seeded here:
 * they only resolve when market_garden is layered as a secondary, and market
 * garden has no secondary objective catalogue, so they are unreachable.
 *
 * Amanah: covenant-aligned. The two channel/sales objectives
 * (mgd-s1-market-channels, mgd-s1-production-targets-sales) seed
 * mg-market-channel-advance-sale — a JUDGMENT trigger that exists precisely to
 * review the channel structure against the Amanah gate (no advance sale of a
 * crop not yet possessed — bayʿ mā laysa ʿindak). Seeding it is therefore
 * covenant-aligned, not a violation. The pure-financial objectives
 * (sales-revenue-tracking, financial-viability) carry only budget-variance
 * review (advisory, never a gate). No CSRA/salam; nothing creates or pre-sells.
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const MARKET_GARDEN_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  // Sales targets: advance-sale review (Amanah gate) + production shortfall.
  'mgd-s1-production-targets-sales': [
    'mg-market-channel-advance-sale',
    'u-s6-yield-shortfall',
  ],
  'mgd-s1-growing-system-philosophy': [
    'u-s1-vision-drift-check',
  ],
  // Market channels: advance-sale review against the Amanah gate.
  'mgd-s1-market-channels': [
    'mg-market-channel-advance-sale',
  ],

  // S2 — Land Reading
  'mgd-s2-soil-fertility-bed-potential': [
    'mg-bed-rotation-soil-health',
    'u-s2-baseline-staleness-resurvey',
  ],
  'mgd-s2-water-access-irrigation': [
    'u-s5-water-store-low',
    'u-s3-flow-anomaly-reassess',
  ],
  'mgd-s2-landscape-vectors': [
    'u-s2-baseline-staleness-resurvey',
    'u-s4-sector-event-zone-review',
  ],

  // S3 — Systems Reading
  'mgd-s3-irrigation-water-quality': [
    'u-s2-contamination-signal',
    'u-s5-water-store-low',
  ],
  'mgd-s3-pest-disease-weed-pressure': [
    'u-s6-ecology-indicator-decline',
  ],

  // S4 — Foundation Decisions
  'mgd-s4-crop-rotation-bed-layout': [
    'mg-bed-rotation-soil-health',
    'u-s4-zone-pressure-review',
  ],
  'mgd-s4-irrigation-strategy': [
    'mg-irrigation-demand-peak',
    'u-s5-water-store-low',
  ],
  'mgd-s4-fertility-strategy': [
    'mg-bed-rotation-soil-health',
    'u-s7-material-availability',
  ],
  'mgd-s4-ipm-strategy': [
    'u-s6-ecology-indicator-decline',
  ],
  'mgd-s4-post-harvest-handling': [
    'mg-harvest-window-quality',
  ],

  // S5 — System Design
  'mgd-s5-bed-growing-infrastructure': [
    'u-s5-infrastructure-failure',
  ],
  'mgd-s5-irrigation-system': [
    'mg-irrigation-demand-peak',
    'u-s5-infrastructure-failure',
  ],
  'mgd-s5-wash-pack-cold-storage': [
    'mg-harvest-window-quality',
    'u-s5-infrastructure-failure',
  ],
  'mgd-s5-fertility-composting-infrastructure': [
    'u-s5-infrastructure-failure',
    'mg-bed-rotation-soil-health',
  ],
  'mgd-s5-propagation-nursery': [
    'u-s5-infrastructure-failure',
    'u-s7-material-availability',
  ],

  // S6 — Monitoring & Adaptation
  'mgd-s6-crop-yield-monitoring': [
    'u-s6-yield-shortfall',
    'mg-harvest-window-quality',
  ],
  // Advisory monitoring only — budget review; no instrument.
  'mgd-s6-sales-revenue-tracking': [
    'u-s7-budget-variance',
  ],
  'mgd-s6-adaptive-management': [
    'u-s7-phase-gate-review',
    'u-s6-ecology-indicator-decline',
  ],

  // S7 — Phasing & Resourcing
  'mgd-s7-crop-calendar': [
    'mg-harvest-window-quality',
    'u-s4-sector-event-zone-review',
  ],
  // Advisory monitoring only — budget review; no instrument.
  'mgd-s7-financial-viability': [
    'u-s7-budget-variance',
  ],
  'mgd-s7-season-startup-readiness': [
    'u-s7-phase-gate-review',
    'u-s7-material-availability',
  ],
};

import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 25 orchard / food-forest objectives.
 * Values are IDs from ORCHARD_PRIMARY_PROTOCOLS (4 orch- templates in
 * constants/protocol/catalogues/orchard.ts) plus universal protocols
 * (u- templates) — both pools resolve for an orchard-primary project via
 * resolveProjectProtocols, mirroring how silvopasture.ts mixes silv- with universal.
 *
 * The orch2- secondary protocols (canopy-shade-encroachment, perennial-water-share)
 * are NOT seeded here: they only resolve when an orchard is layered onto a host
 * primary type, not for an orchard-primary project. Likewise orch-sec- objectives.
 *
 * Every seeded protocol is a monitoring / review / judgment / threshold /
 * cyclical trigger — pest/disease thresholds, pollination-window confirmation,
 * young-tree water priority, harvest-glut routing, budget/phase review. None
 * creates or implies a sale, advance-purchase, or yield instrument; the lone
 * financial objective carries only budget-variance review (advisory, never a
 * gate). orch-harvest-glut routes already-harvested possessed surplus — clean.
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const ORCHARD_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'orch-s1-species-philosophy': [
    'u-s1-vision-drift-check',
  ],
  'orch-s1-production-intent': [
    'u-s1-vision-drift-check',
  ],
  'orch-s1-provenance-sourcing': [
    'u-s7-material-availability',
  ],

  // S2 — Land Reading
  'orch-s2-tree-cover': [
    'u-s2-baseline-staleness-resurvey',
  ],
  'orch-s2-frost-drainage': [
    'u-s4-sector-event-zone-review',
  ],
  'orch-s2-landscape-context': [
    'u-s2-baseline-staleness-resurvey',
    'u-s4-sector-event-zone-review',
  ],

  // S3 — Systems Reading
  'orch-s3-rootzone-depth': [
    'u-s2-baseline-staleness-resurvey',
  ],
  'orch-s3-water-availability': [
    'u-s5-water-store-low',
    'u-s3-flow-anomaly-reassess',
  ],
  'orch-s3-pest-disease-pressure': [
    'orch-pest-disease-pressure',
    'u-s6-ecology-indicator-decline',
  ],

  // S4 — Foundation Decisions
  'orch-s4-species-mix': [
    'orch-pollination-window',
    'u-s6-yield-shortfall',
  ],
  'orch-s4-water-strategy': [
    'orch-young-tree-water',
    'u-s5-water-store-low',
  ],
  'orch-s4-guild-planting': [
    'u-s6-ecology-indicator-decline',
  ],
  'orch-s4-succession-management': [
    'u-s7-phase-gate-review',
  ],
  'orch-s4-pest-disease-management': [
    'orch-pest-disease-pressure',
    'u-s6-ecology-indicator-decline',
  ],

  // S5 — System Design
  'orch-s5-planting-layout': [
    'u-s4-zone-pressure-review',
  ],
  'orch-s5-guild-plan': [
    'u-s6-ecology-indicator-decline',
  ],
  'orch-s5-establishment-irrigation': [
    'orch-young-tree-water',
    'u-s5-water-store-low',
  ],
  'orch-s5-access-harvest': [
    'orch-harvest-glut',
    'u-s5-access-track-erosion',
  ],
  'orch-s5-tree-protection': [
    'u-s4-sector-event-zone-review',
  ],

  // S6 — Monitoring & Adaptation
  'orch-s6-phenological-monitoring': [
    'orch-pollination-window',
    'u-s6-ecology-indicator-decline',
  ],
  'orch-s6-pest-disease-monitoring': [
    'orch-pest-disease-pressure',
    'u-s6-ecology-indicator-decline',
  ],
  'orch-s6-adaptive-management': [
    'orch-pest-disease-pressure',
    'u-s7-phase-gate-review',
  ],

  // S7 — Phasing & Resourcing
  'orch-s7-planting-establishment': [
    'orch-young-tree-water',
    'u-s7-phase-gate-review',
  ],
  'orch-s7-succession-plan': [
    'u-s7-phase-gate-review',
  ],
  // Advisory monitoring only — budget review; no instrument.
  'orch-s7-financial-viability': [
    'u-s7-budget-variance',
  ],
};

/**
 * Secondary-role map (orchard / food-forest layered onto a host). Pool =
 * universal + the orchard additive secondary protocols
 * (orch2-canopy-shade-encroachment, orch2-perennial-water-share). The orch-
 * PRIMARY protocols above do NOT resolve in a secondary context, so none of
 * them appear here.
 *
 * When an orchard is a secondary, the dominant standing concerns are the canopy
 * shade it casts over the host's other plantings and the share of water the
 * perennials draw — so the orch2- protocols land on the guild-layout and
 * perennial-care objectives. The harvest-pathway objective routes
 * already-harvested possessed surplus (abundance / shortfall), which is clean;
 * it carries NO advance-sale framing.
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const ORCHARD_SECONDARY_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S2 — Land Reading
  'orch-sec-s2-climate-chill-fit': [
    'u-s4-sector-event-zone-review',
    'u-s2-baseline-staleness-resurvey',
  ],

  // S4 — Foundation Decisions
  'orch-sec-s4-species-pollination': [
    'u-s6-yield-shortfall',
  ],

  // S5 — System Design
  'orch-sec-s5-guild-layout': [
    'orch2-canopy-shade-encroachment',
    'u-s4-zone-pressure-review',
  ],

  // S6 — Monitoring & Adaptation
  'orch-sec-s6-perennial-care': [
    'orch2-perennial-water-share',
    'u-s6-ecology-indicator-decline',
  ],
  // Possessed-surplus routing — clean, no advance-sale.
  'orch-sec-s6-harvest-pathway': [
    'u-s6-abundance-surplus',
    'u-s6-yield-shortfall',
  ],
};

import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 26 silvopasture objectives.
 * Values are IDs from SILVOPASTURE_PRIMARY_PROTOCOLS (5 silv- templates in
 * constants/protocol/catalogues/silvopasture.ts) plus universal protocols
 * (u- templates) — both pools resolve for a silvopasture project via
 * resolveProjectProtocols, mirroring how ecovillage.ts mixes eco- with universal.
 *
 * The silv2- secondary protocols/patches are NOT seeded here: they only resolve
 * when silvopasture is a SECONDARY type, not for a silvopasture-primary project.
 *
 * Every seeded protocol is a monitoring / review / judgment / threshold /
 * cyclical trigger — browse-damage thresholds, establishment protection,
 * forage-shade balance, root-zone compaction, rotation entry checks, budget/
 * phase review. None creates or implies a sale, advance-purchase, or yield
 * instrument; the lone financial objective carries only budget-variance review
 * (advisory, never a gate).
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const SILVOPASTURE_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'silv-s1-enterprise-mix': [
    'u-s1-vision-drift-check',
  ],
  'silv-s1-land-improvement-philosophy': [
    'u-s1-vision-drift-check',
  ],
  'silv-s1-animal-welfare': [
    'u-s1-stewardship-capacity-recheck',
  ],

  // S2 — Land Reading
  'silv-s2-pasture-condition': [
    'silv-forage-shade-balance',
    'u-s2-baseline-staleness-resurvey',
  ],
  'silv-s2-livestock-infrastructure': [
    'u-s5-infrastructure-failure',
  ],
  'silv-s2-landscape-context': [
    'u-s2-baseline-staleness-resurvey',
    'u-s4-sector-event-zone-review',
  ],
  'silv-s2-grazing-history': [
    'u-s2-baseline-staleness-resurvey',
  ],

  // S3 — Systems Reading
  'silv-s3-stock-water-availability': [
    'u-s5-water-store-low',
    'u-s3-flow-anomaly-reassess',
  ],
  'silv-s3-soil-compaction': [
    'silv-root-zone-compaction',
    'u-s2-new-erosion-signal',
  ],
  'silv-s3-forage-productivity': [
    'silv-forage-shade-balance',
    'u-s6-yield-shortfall',
  ],

  // S4 — Foundation Decisions
  'silv-s4-paddock-layout': [
    'silv-rotational-fencing-integrity',
    'u-s4-zone-pressure-review',
  ],
  'silv-s4-stock-water-strategy': [
    'u-s5-water-store-low',
    'u-s5-earthworks-overflow',
  ],
  'silv-s4-forage-improvement': [
    'silv-forage-shade-balance',
    'u-s6-yield-shortfall',
  ],
  'silv-s4-tree-integration': [
    'silv-tree-browse-damage',
    'silv-establishment-protection',
    'silv-root-zone-compaction',
  ],
  'silv-s4-animal-health': [
    'u-s1-stewardship-capacity-recheck',
  ],

  // S5 — System Design
  'silv-s5-fencing': [
    'silv-rotational-fencing-integrity',
    'u-s5-infrastructure-failure',
  ],
  'silv-s5-stock-water-distribution': [
    'u-s5-water-store-low',
    'u-s5-access-track-erosion',
  ],
  'silv-s5-shelters-handling': [
    'u-s5-infrastructure-failure',
  ],
  'silv-s5-tree-planting': [
    'silv-establishment-protection',
    'silv-tree-browse-damage',
  ],

  // S6 — Monitoring & Adaptation
  'silv-s6-pasture-monitoring': [
    'silv-forage-shade-balance',
    'u-s6-yield-shortfall',
    'u-s6-ecology-indicator-decline',
  ],
  'silv-s6-animal-health-monitoring': [
    'u-s6-ecology-indicator-decline',
    'u-s6-stewardship-overload',
  ],
  'silv-s6-adaptive-management': [
    'silv-tree-browse-damage',
    'u-s7-phase-gate-review',
  ],

  // S7 — Phasing & Resourcing
  'silv-s7-livestock-establishment': [
    'u-s7-phase-gate-review',
    'u-s7-material-availability',
  ],
  'silv-s7-stocking-buildup': [
    'silv-forage-shade-balance',
    'u-s7-phase-gate-review',
  ],
  // Advisory monitoring only — budget review; no instrument.
  'silv-s7-financial-viability': [
    'u-s7-budget-variance',
  ],
  'silv-s7-pasture-spelling': [
    'silv-rotational-fencing-integrity',
    'silv-forage-shade-balance',
  ],
};

/**
 * Secondary-role map (silvopasture layered onto a host — e.g. an orchard or
 * homestead that adds grazing under trees). Pool = universal + the silvopasture
 * additive secondary protocols (silv2-integrated-browse-window,
 * silv2-nutrient-distribution). The silv- PRIMARY protocols above do NOT resolve
 * in a secondary context, so none of them appear here.
 *
 * When silvopasture is a secondary, the dominant standing concerns are the
 * browse window for newly-integrated trees and the distribution of livestock
 * nutrient load across the host system — so the silv2- protocols land on the
 * grazing-design, tree-establishment, and pasture/tree-monitoring objectives.
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const SILVOPASTURE_SECONDARY_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation
  'silv-sec-s1-livestock-intent': [
    'u-s1-vision-drift-check',
  ],

  // S3 — Systems Reading
  'silv-sec-s3-forage-survey': [
    'u-s6-yield-shortfall',
    'u-s2-baseline-staleness-resurvey',
  ],

  // S4 — Foundation Decisions
  'silv-sec-s4-grazing-design': [
    'silv2-integrated-browse-window',
    'silv2-nutrient-distribution',
  ],
  'silv-sec-s4-stock-infrastructure': [
    'u-s5-infrastructure-failure',
  ],
  'silv-sec-s4-husbandry-framework': [
    'u-s1-stewardship-capacity-recheck',
  ],

  // S5 — System Design
  'silv-sec-s5-tree-establishment': [
    'silv2-integrated-browse-window',
    'u-s6-ecology-indicator-decline',
  ],

  // S6 — Monitoring & Adaptation
  'silv-sec-s6-pasture-tree-monitoring': [
    'silv2-integrated-browse-window',
    'silv2-nutrient-distribution',
    'u-s6-ecology-indicator-decline',
  ],

  // S7 — Phasing & Resourcing
  'silv-sec-s7-stocking-phasing': [
    'u-s7-phase-gate-review',
  ],
};

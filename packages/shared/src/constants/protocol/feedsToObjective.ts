// feedsToObjective.ts
//
// FEEDS_TO_OBJECTIVE (T2.1): maps each of the 5 event-driven (NON-s6-bound)
// standard protocol templates to the deep Plan objective(s) it contradicts.
// These 5 template ids are the exact complement of S6_BOUND_TEMPLATE_IDS;
// the s6-bound 5 are routed separately (hard-coded to s6+s7 in the web
// emission layer, T1.6). T2.2 consults this table for the non-s6 templates
// via `!S6_BOUND_TEMPLATE_IDS.has(id)`.
//
// PER-TEMPLATE AGRONOMY RATIONALE (feedsInto):
//   post-rotation-impact-assessment -> s3-soil
//     A post-rotation impact reading contradicts the soil/ecology objective:
//     measured grazing impact (compaction, residual, dung distribution) is
//     soil/ground-cover health, the substance of the soil stratum.
//   pre-rotation-paddock-assessment -> s6-monitoring
//     Pre-rotation paddock readiness is operational yield-monitoring: it feeds
//     the monitoring cadence that governs move decisions, not a deep stratum.
//   water-trough-inspection -> s5-water-infrastructure
//     A trough inspection contradicts the water-infrastructure objective:
//     trough/reticulation serviceability IS the water infrastructure.
//   seasonal-stocking-rate-review -> s6-monitoring, s7-phase1
//     A stocking-rate review is operational yield-monitoring AND touches
//     phasing (carrying-capacity assumptions baked into the phase-1 plan).
//   silvopasture-pest-diversion -> s4-zones
//     A pest-diversion event contradicts the zones/sectors objective: pest
//     pressure and diversion plantings are a zones-and-sectors design concern.
//
// TAXONOMY / RE-POINTING NOTE:
//   The spec draft listed LEGACY static-skeleton objective ids (e.g.
//   s2-land-baseline, s6-yield-flows, s5-water-strategy, s4-zones-sectors,
//   s7-phasing). Those ids belong to PLAN_STRATUM_OBJECTIVES, which renders
//   ONLY for null-type projects and is retiring -- a flag on a legacy id can
//   NEVER surface a chip on a real (typed) project. Every typed project
//   resolves objectives from the UNIVERSAL catalogue
//   (UNIVERSAL_PLAN_OBJECTIVES). The targets below are therefore RE-POINTED
//   to universal-catalogue ids, the same decision already applied to Tier 1
//   (s6-monitoring / s7-phase1). All 5 target ids exist in
//   UNIVERSAL_PLAN_OBJECTIVES.
//
// STEWARD-REVIEWABLE: the exact target set and the soil/water/zones depths
// are a design choice open to steward review; adjust on review.

/**
 * Maps each event-driven (non-s6-bound) protocol template id to the deep
 * universal Plan objective id(s) a deviation on it should surface against.
 */
export const FEEDS_TO_OBJECTIVE: Record<string, readonly string[]> = {
  'post-rotation-impact-assessment': ['s3-soil'],
  'pre-rotation-paddock-assessment': ['s6-monitoring'],
  'water-trough-inspection': ['s5-water-infrastructure'],
  'seasonal-stocking-rate-review': ['s6-monitoring', 's7-phase1'],
  'silvopasture-pest-diversion': ['s4-zones'],
};

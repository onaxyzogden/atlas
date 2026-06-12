/**
 * Placement-rule catalog — the seed rule set for draw-time placement
 * validation (2026-06-11 plan, Phase 3). Rule params are DATA: tune the
 * numbers here, never in the evaluators.
 *
 * Distances are sourced from the same numbers the post-hoc RulesEngine has
 * used since v1 (`SETBACK_RULES` in apps/web .../SitingRules.ts, which now
 * re-bases onto `PLACEMENT_DISTANCES_M` below so draw-time and panel can
 * never diverge).
 *
 * 13 named rules; well-septic separation is encoded as two directional
 * entries (placing a well checks septics, placing a septic checks wells)
 * because a data-only rule can't say "the other one".
 */

import type { PlacementRule } from './types.js';

/**
 * Canonical setback / proximity distances (meters). `SETBACK_RULES` in
 * SitingRules.ts derives its riparian / wetland / well_septic /
 * livestock_spiritual entries from here.
 */
export const PLACEMENT_DISTANCES_M = {
  /** Well <-> septic minimum separation (groundwater protection). */
  wellSeptic: 30,
  /** Paddock minimum distance from drinking-water sources / waterways. */
  livestockWaterProtection: 30,
  /** Paddock minimum distance from prayer spaces / spiritual zones. */
  livestockSpiritual: 50,
  /** Ground-disturbing placement minimum distance from wetlands. */
  wetlandDisturbance: 120,
  /** Crop / planting-area minimum distance from waterways. */
  riparianPlanting: 30,
  /** Nursery maximum distance from a water source. */
  nurseryWaterMax: 150,
} as const;

/** Kind spellings for wells / septic across stores (see types.ts vocab note). */
const WELL_KINDS = ['well', 'well_pump'] as const;
const SEPTIC_KINDS = ['septic'] as const;
const WATER_SOURCE_KINDS = [
  'well',
  'well_pump',
  'water-tank',
  'water_tank',
  'pond',
  'spring',
  'rain_catchment',
] as const;

/** Linear / annotation kinds allowed inside buffer zones. */
const BUFFER_ZONE_EXEMPT_KINDS = [
  'hedgerow',
  'insectary-strip',
  'fence-line',
  'path',
  'gate',
  'utility-run',
] as const;

/**
 * Planning overlays — designations of ground, not occupation of it. Zone
 * polygons and catchment-surface outlines legitimately overlap buffer zones
 * and drawn setback rings (a conservation zone can contain its own buffer;
 * a runoff catchment is just a labelled surface). Only boundary containment
 * gates them.
 */
const OVERLAY_KINDS = ['zone', 'catchment'] as const;

/** Annotation kinds exempt from placement gating entirely (the evaluator
 *  never gates these, but the setback-respect rule also excludes them so
 *  the data reads honestly). */
const ANNOTATION_KINDS = [
  'buffer-ring',
  'ecological-note',
  'monitoring-transect',
] as const;

export const PLACEMENT_RULES: readonly PlacementRule[] = [
  /* ---------------------------------------------------------------- */
  /*  BLOCK — hard vetoes                                              */
  /* ---------------------------------------------------------------- */
  {
    id: 'boundary-containment',
    severity: 'block',
    subject: { exceptKinds: ANNOTATION_KINDS },
    constraint: { type: 'within-boundary' },
    message: 'Outside the parcel boundary',
    whyItMatters:
      'Everything you design must sit on land the project actually stewards; features over the line cannot be built or maintained.',
    amanahNote:
      'Staying within the parcel honours the neighbour’s right (huquq al-jar) — design only on the land entrusted to you.',
    serverEnforceable: true,
  },
  {
    id: 'well-septic-separation',
    severity: 'block',
    subject: { kinds: WELL_KINDS },
    constraint: {
      type: 'min-distance-from',
      target: { kinds: SEPTIC_KINDS, label: 'a septic system' },
      distanceM: PLACEMENT_DISTANCES_M.wellSeptic,
    },
    message: `Well within ${PLACEMENT_DISTANCES_M.wellSeptic} m of a septic system`,
    whyItMatters:
      'Septic effluent migrates through soil; a well inside the separation distance risks contaminating the drinking-water supply.',
    serverEnforceable: true,
    legacyRuleId: 'well-septic-distance',
  },
  {
    id: 'septic-well-separation',
    severity: 'block',
    subject: { kinds: SEPTIC_KINDS },
    constraint: {
      type: 'min-distance-from',
      target: { kinds: WELL_KINDS, label: 'a well' },
      distanceM: PLACEMENT_DISTANCES_M.wellSeptic,
    },
    message: `Septic system within ${PLACEMENT_DISTANCES_M.wellSeptic} m of a well`,
    whyItMatters:
      'Same separation as well-near-septic, checked from the other direction so the order of placement does not matter.',
    serverEnforceable: true,
    legacyRuleId: 'well-septic-distance',
  },
  {
    id: 'paddock-prohibited-zones',
    severity: 'block',
    subject: { kinds: ['paddock'] },
    constraint: {
      type: 'zone-exclusion',
      zoneCategories: ['spiritual', 'habitation', 'conservation', 'buffer'],
    },
    message: 'Paddock overlaps a spiritual, habitation, conservation, or buffer zone',
    whyItMatters:
      'Livestock in living, prayer, or protected-habitat areas brings noise, odor, manure, and trampling where the design has promised quiet or protection.',
    amanahNote:
      'Prayer spaces are kept clean and tranquil (tahara); conservation zones are a trust held for the land’s other inhabitants.',
    serverEnforceable: true,
  },
  {
    id: 'buffer-zone-exclusion',
    severity: 'block',
    subject: {
      exceptKinds: [
        ...BUFFER_ZONE_EXEMPT_KINDS,
        ...OVERLAY_KINDS,
        ...ANNOTATION_KINDS,
      ],
    },
    constraint: { type: 'zone-exclusion', zoneCategories: ['buffer'] },
    message: 'Placed inside a buffer / setback zone',
    whyItMatters:
      'Buffer zones exist to stay empty — visual screening, setback compliance, edge protection. Only thin linear features (hedgerows, insectary strips, fences, paths, gates) belong there.',
    serverEnforceable: true,
  },
  {
    id: 'livestock-water-protection',
    severity: 'block',
    subject: { kinds: ['paddock'] },
    constraint: {
      type: 'min-distance-from',
      target: {
        kinds: ['well', 'well_pump', 'spring'],
        siteLayers: ['waterway'],
        label: 'a drinking-water source or waterway',
      },
      distanceM: PLACEMENT_DISTANCES_M.livestockWaterProtection,
    },
    message: `Paddock within ${PLACEMENT_DISTANCES_M.livestockWaterProtection} m of a drinking-water source or waterway`,
    whyItMatters:
      'Concentrated livestock near wells, springs, or streams sends pathogens and nutrient runoff straight into the water people and animals drink.',
    amanahNote:
      'Water is a shared trust — the Prophet ﷺ forbade fouling water sources; protecting them from manure runoff is the modern form of that command.',
    serverEnforceable: true,
  },

  /* ---------------------------------------------------------------- */
  /*  WARN — acknowledge to proceed                                    */
  /* ---------------------------------------------------------------- */
  {
    id: 'livestock-spiritual-buffer',
    severity: 'warn',
    subject: { kinds: ['paddock'] },
    constraint: {
      type: 'min-distance-from',
      target: {
        kinds: ['prayer_space', 'prayer-pavilion'],
        zoneCategories: ['spiritual'],
        label: 'a prayer space or spiritual zone',
      },
      distanceM: PLACEMENT_DISTANCES_M.livestockSpiritual,
    },
    message: `Paddock within ${PLACEMENT_DISTANCES_M.livestockSpiritual} m of a prayer space or spiritual zone`,
    whyItMatters:
      'Animal noise and odor carry; prayer and contemplation deserve a quiet margin beyond the hard no-overlap rule.',
    amanahNote:
      'Khushuʿ (presence in prayer) is easier to protect in the site plan than to recover after the barn is built.',
    serverEnforceable: false,
    legacyRuleId: 'livestock-spiritual-buffer',
  },
  {
    id: 'orchard-guild-zone-affinity',
    severity: 'warn',
    subject: { kinds: ['orchard', 'food_forest', 'guild'] },
    constraint: {
      type: 'zone-containment',
      zoneCategories: ['food_production'],
      minCoveragePct: 60,
    },
    message: 'Mostly outside any food-production zone',
    whyItMatters:
      'Orchards, food forests, and guilds planted outside the zones planned for food production fragment irrigation, access, and harvest routes.',
    serverEnforceable: false,
  },
  {
    id: 'guild-permaculture-ring',
    severity: 'warn',
    subject: { kinds: ['guild'] },
    constraint: { type: 'permaculture-ring-range', minZ: 1, maxZ: 3 },
    message: 'Guild placed outside permaculture zones 1–3',
    whyItMatters:
      'Guilds need regular observation, watering, and harvest — daily-to-weekly attention that Z4/Z5 placement quietly starves.',
    serverEnforceable: false,
  },
  {
    id: 'wetland-disturbance-buffer',
    severity: 'warn',
    subject: { categories: ['structure', 'earthworks', 'machinery'] },
    constraint: {
      type: 'min-distance-from',
      target: {
        kinds: ['wetland-edge'],
        siteLayers: ['wetland'],
        label: 'a wetland',
      },
      distanceM: PLACEMENT_DISTANCES_M.wetlandDisturbance,
    },
    message: `Ground disturbance within ${PLACEMENT_DISTANCES_M.wetlandDisturbance} m of a wetland`,
    whyItMatters:
      'Construction and machinery near wetlands compact soil, alter hydrology, and degrade the highest-value habitat on most parcels.',
    serverEnforceable: false,
  },
  {
    id: 'riparian-planting-buffer',
    severity: 'warn',
    subject: { categories: ['crop-area'] },
    constraint: {
      type: 'min-distance-from',
      target: { siteLayers: ['waterway'], label: 'a waterway' },
      distanceM: PLACEMENT_DISTANCES_M.riparianPlanting,
    },
    message: `Crop area within ${PLACEMENT_DISTANCES_M.riparianPlanting} m of a waterway`,
    whyItMatters:
      'The riparian margin filters runoff and holds the bank; cultivating into it trades short-term area for long-term erosion and water-quality loss.',
    serverEnforceable: false,
  },
  {
    id: 'nursery-water-proximity',
    severity: 'warn',
    subject: { kinds: ['nursery'] },
    constraint: {
      type: 'max-distance-from',
      target: { kinds: WATER_SOURCE_KINDS, label: 'a water source' },
      distanceM: PLACEMENT_DISTANCES_M.nurseryWaterMax,
    },
    message: `No water source within ${PLACEMENT_DISTANCES_M.nurseryWaterMax} m of the nursery`,
    whyItMatters:
      'Propagation beds need daily water; a nursery far from any well, tank, pond, or catchment means hauling or new infrastructure nobody budgeted.',
    serverEnforceable: false,
  },
  {
    id: 'paddock-no-self-overlap',
    severity: 'warn',
    subject: { kinds: ['paddock'] },
    constraint: { type: 'no-overlap-same-kind' },
    message: 'Overlaps an existing paddock',
    whyItMatters:
      'Overlapping paddocks double-count forage area and break rotation math; if intentional (a split underway), acknowledge and tidy later.',
    serverEnforceable: false,
  },
  {
    id: 'steward-setback-respect',
    severity: 'warn',
    subject: { exceptKinds: [...ANNOTATION_KINDS, ...OVERLAY_KINDS] },
    constraint: {
      type: 'min-distance-from',
      target: { setbackRings: true, label: 'a drawn setback ring' },
      distanceM: 0,
    },
    message: 'Intersects a setback ring you drew',
    whyItMatters:
      'Setback rings are your own recorded constraints (static snapshots by design); placing into one usually means the ring is stale or the placement is wrong — say which.',
    serverEnforceable: false,
  },
];

/** Lookup by id. Returns undefined for unknown ids. */
export function findPlacementRule(id: string): PlacementRule | undefined {
  return PLACEMENT_RULES.find((r) => r.id === id);
}

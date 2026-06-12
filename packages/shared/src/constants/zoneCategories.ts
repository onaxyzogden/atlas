/**
 * Zone-category taxonomy — the canonical land-use vocabulary for drawn
 * zones. Moved here from `apps/web/src/store/zoneStore.ts` (2026-06-11)
 * so the shared placement-rule catalog can reference zone categories
 * without importing the app layer; `zoneStore.ts` re-exports the type so
 * every existing web import keeps working.
 *
 * Display config (labels, colors, icons) stays in the app layer —
 * `ZONE_CATEGORY_CONFIG` in zoneStore.ts keys off this union.
 */

export const ZONE_CATEGORIES = [
  'habitation',
  'food_production',
  'livestock',
  'commons',
  'spiritual',
  'education',
  'retreat',
  'conservation',
  'water_retention',
  'infrastructure',
  'access',
  'buffer',
  'future_expansion',
] as const;

export type ZoneCategory = (typeof ZONE_CATEGORIES)[number];

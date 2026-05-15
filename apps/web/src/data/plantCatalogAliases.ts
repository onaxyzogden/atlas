/**
 * Legacy `pl-XXX` → snake_case canonical id alias map.
 *
 * Background: Atlas carried two parallel perennial catalogs until
 * 2026-05-14 (`plantDatabase.ts` with pl-XXX ids, `plantSpeciesData.ts`
 * with snake_case ids) plus a third annual phenology catalog already on
 * snake_case. The Phase 4 consolidation chose snake_case as canonical
 * and folded the perennial catalogs into `plantCatalog.ts`.
 *
 * Persisted stores (`polycultureStore.guilds[].members[].speciesId`,
 * `cropStore.cropAreas[].species[]`) may still carry pl-XXX strings; the
 * store `migrate` paths walk them through `resolveSpeciesId`. Catalog
 * consumers should also resolve through this helper so a stale pl-XXX
 * paste from a journal entry / debugger still finds the entry.
 *
 * Unknown ids resolve to themselves (identity) — no throws.
 */

export const PLANT_ID_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  // Canopy
  'pl-001': 'black_walnut',
  'pl-002': 'american_chestnut',
  'pl-003': 'white_oak',
  'pl-004': 'black_locust',
  'pl-005': 'pecan',
  // Sub-canopy
  'pl-101': 'apple',
  'pl-102': 'pear',
  'pl-103': 'cherry',
  'pl-104': 'pawpaw',
  'pl-105': 'persimmon',
  'pl-106': 'white_mulberry',
  'pl-107': 'black_alder',
  'pl-108': 'russian_olive',
  // Shrub
  'pl-201': 'blueberry',
  'pl-202': 'currant',
  'pl-203': 'elderberry',
  'pl-204': 'chokeberry',
  'pl-205': 'sea_buckthorn',
  'pl-206': 'siberian_pea_shrub',
  'pl-207': 'hazelnut',
  // Herbaceous
  'pl-301': 'comfrey',
  'pl-302': 'garlic_chive',
  'pl-303': 'yarrow',
  'pl-304': 'echinacea',
  'pl-305': 'borage',
  'pl-306': 'asparagus',
  // Ground cover
  'pl-401': 'clover',
  'pl-402': 'strawberry',
  'pl-403': 'creeping_thyme',
  'pl-404': 'bugleweed',
  // Vine
  'pl-501': 'grape',
  'pl-502': 'hardy_kiwi',
  'pl-503': 'groundnut',
  // Root
  'pl-601': 'jerusalem_artichoke',
  'pl-602': 'garlic',
  'pl-603': 'chinese_artichoke',
  'pl-604': 'carrot',
});

/** Resolve a legacy pl-XXX id to its snake_case canonical form. Identity on unknowns. */
export function resolveSpeciesId(id: string): string {
  return PLANT_ID_ALIASES[id] ?? id;
}

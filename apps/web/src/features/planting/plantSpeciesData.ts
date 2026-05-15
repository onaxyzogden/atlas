/**
 * @deprecated 2026-05-14 — Migrated to the unified `plantCatalog.ts`.
 * This file now re-exports a site-match-axis-narrowed slice of the
 * canonical catalog so existing imports keep working. Will be deleted in
 * the Phase E cleanup.
 *
 * New code should import `PlantCatalogEntry` from `data/plantCatalog.ts`
 * directly.
 */

import { PLANT_CATALOG, hasGrowing, type PlantSpeciesInfo } from '../../data/plantCatalog.js';

export type { PlantSpeciesInfo } from '../../data/plantCatalog.js';
export { parseHardinessZone } from '../../data/plantCatalog.js';

/** Site-match-axis-narrowed view of the union catalog. */
export const PLANT_SPECIES: PlantSpeciesInfo[] = PLANT_CATALOG.filter(hasGrowing);

export const SPECIES_BY_ID: Record<string, PlantSpeciesInfo> = Object.fromEntries(
  PLANT_SPECIES.map((s) => [s.id, s]),
);

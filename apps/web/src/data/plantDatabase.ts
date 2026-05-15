/**
 * @deprecated 2026-05-14 — Migrated to the unified `plantCatalog.ts`.
 * This file now re-exports a layering-axis-narrowed slice of the canonical
 * catalog so existing imports keep working without changes. Will be
 * deleted in the Phase E cleanup once consumers are ported.
 *
 * New code should import `PlantCatalogEntry` from `./plantCatalog.ts` and
 * use its optional-field shape directly.
 */

import { PLANT_CATALOG, hasLayering, type PlantSpecies, findEntry } from './plantCatalog.js';

export type {
  CanopyLayer,
  EcologicalFunction,
  LightNeeds,
  RootPattern,
  WaterNeeds,
  PlantSpecies,
} from './plantCatalog.js';

/** Layering-axis-narrowed view of the union catalog. */
export const PLANT_DATABASE: PlantSpecies[] = PLANT_CATALOG.filter(hasLayering);

export function findSpecies(id: string): PlantSpecies | undefined {
  const e = findEntry(id);
  return e && hasLayering(e) ? e : undefined;
}

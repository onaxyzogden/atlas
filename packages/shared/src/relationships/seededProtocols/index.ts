import type { ProjectTypeId } from '../../schemas/plan/projectTypeTaxonomy.schema.js';
import { UNIVERSAL_SEEDED_PROTOCOLS } from './universal.js';
import { HOMESTEAD_SEEDED_PROTOCOLS } from './homestead.js';
import { ECOVILLAGE_SEEDED_PROTOCOLS } from './ecovillage.js';
import { SILVOPASTURE_SEEDED_PROTOCOLS } from './silvopasture.js';
import { ORCHARD_SEEDED_PROTOCOLS } from './orchard.js';
import { NURSERY_SEEDED_PROTOCOLS } from './nursery.js';
import type { SeededProtocolMap } from './types.js';

export type { SeededProtocolMap };

/**
 * Per-primary-type seeded maps. Exported so the conformance test can iterate
 * every registered type without enumerating them — any type added here is
 * automatically covered by the seeded-ID validity guard.
 */
export const PRIMARY_MAPS: Partial<Record<ProjectTypeId, SeededProtocolMap>> = {
  homestead: HOMESTEAD_SEEDED_PROTOCOLS,
  ecovillage: ECOVILLAGE_SEEDED_PROTOCOLS,
  silvopasture: SILVOPASTURE_SEEDED_PROTOCOLS,
  orchard_food_forest: ORCHARD_SEEDED_PROTOCOLS,
};

/**
 * Per-SECONDARY-type seeded maps, keyed by the secondary type id. A secondary's
 * objectives (e.g. nursery's `nur-sec-*`) only exist in a project when that type
 * is layered onto a compatible host, so they are seeded here rather than in
 * PRIMARY_MAPS. Each map references only the universal pool and that secondary's
 * own additive protocols — the only protocols the host+secondary project resolves
 * (its primary protocols load only when the type is the PRIMARY). Exported so the
 * conformance test iterates every registered secondary type automatically.
 */
export const SECONDARY_MAPS: Partial<Record<ProjectTypeId, SeededProtocolMap>> = {
  nursery: NURSERY_SEEDED_PROTOCOLS,
};

/**
 * Returns the seeded protocol IDs for a given objective, merging the universal
 * base map with the primary-type layer and any layered secondary-type maps.
 * Deduplicates by ID, first occurrence wins (universal, then primary, then each
 * secondary in the order given).
 *
 * Returns an empty array when no seedings exist for the objective.
 */
export function resolveSeededProtocols(
  objectiveId: string,
  primaryTypeId: ProjectTypeId,
  secondaryTypeIds?: readonly ProjectTypeId[],
): readonly string[] {
  const universalIds = UNIVERSAL_SEEDED_PROTOCOLS[objectiveId] ?? [];
  const primaryIds = PRIMARY_MAPS[primaryTypeId]?.[objectiveId] ?? [];

  const seen = new Set<string>();
  const merged: string[] = [];
  const push = (ids: readonly string[]): void => {
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(id);
      }
    }
  };

  push(universalIds);
  push(primaryIds);
  for (const secondaryTypeId of secondaryTypeIds ?? []) {
    push(SECONDARY_MAPS[secondaryTypeId]?.[objectiveId] ?? []);
  }
  return merged;
}

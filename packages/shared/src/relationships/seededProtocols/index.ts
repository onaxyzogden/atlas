import type { ProjectTypeId } from '../../schemas/plan/projectTypeTaxonomy.schema.js';
import { UNIVERSAL_SEEDED_PROTOCOLS } from './universal.js';
import { HOMESTEAD_SEEDED_PROTOCOLS } from './homestead.js';
import type { SeededProtocolMap } from './types.js';

export type { SeededProtocolMap };

const PRIMARY_MAPS: Partial<Record<ProjectTypeId, SeededProtocolMap>> = {
  homestead: HOMESTEAD_SEEDED_PROTOCOLS,
};

/**
 * Returns the seeded protocol IDs for a given objective, merging the universal
 * base map with the primary-type layer. Deduplicates by ID (universal first,
 * then primary additions). Secondary types are not yet seeded — the function
 * signature accepts them for forward compatibility.
 *
 * Returns an empty array when no seedings exist for the objective.
 */
export function resolveSeededProtocols(
  objectiveId: string,
  primaryTypeId: ProjectTypeId,
  _secondaryTypeIds?: readonly ProjectTypeId[],
): readonly string[] {
  const universalIds = UNIVERSAL_SEEDED_PROTOCOLS[objectiveId] ?? [];
  const primaryMap = PRIMARY_MAPS[primaryTypeId];
  const primaryIds = primaryMap?.[objectiveId] ?? [];

  const seen = new Set<string>(universalIds);
  const merged: string[] = [...universalIds];
  for (const id of primaryIds) {
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(id);
    }
  }
  return merged;
}

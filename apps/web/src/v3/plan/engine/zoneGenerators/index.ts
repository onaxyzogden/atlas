/**
 * Zone-generator registry. One seam for every "stamp draft zones the
 * steward then edits" feature. Add a generator here and it gets the
 * same provisional-review treatment for free.
 */

import type { LandZone } from '../../../../store/zoneStore.js';
import type { ZoneGenerator, ZoneGeneratorContext } from './types.js';
import { ringSeedGenerator } from './ringSeedGenerator.js';

export type { ZoneGenerator, ZoneGeneratorContext } from './types.js';
export { ringSeedGenerator } from './ringSeedGenerator.js';

const REGISTRY: Record<string, ZoneGenerator> = {
  [ringSeedGenerator.id]: ringSeedGenerator,
};

export function getZoneGenerator(id: string): ZoneGenerator | null {
  return REGISTRY[id] ?? null;
}

/** Pure: resolve a generator and run it. `[]` if id unknown. */
export function runZoneGenerator(
  id: string,
  ctx: ZoneGeneratorContext,
): LandZone[] {
  return getZoneGenerator(id)?.generate(ctx) ?? [];
}

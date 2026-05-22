/**
 * Canonical permaculture Z-level → display label map. Single source of
 * truth for the descriptive zone names shown on the map, in the Z-level
 * picker, and stored by the ring-seed generator. Keeping these in one
 * place stops the labels drifting apart across renderers.
 */

import type { LandZone } from '../../store/zoneStore.js';

export type PermacultureZoneLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const PERMACULTURE_ZONE_LABEL: Record<PermacultureZoneLevel, string> = {
  0: 'Z0 — Home (most-used)',
  1: 'Z1 — Daily kitchen garden',
  2: 'Z2 — Frequent (orchard, small livestock)',
  3: 'Z3 — Weekly (main crops, pasture)',
  4: 'Z4 — Occasional (woodlot, foraging)',
  5: 'Z5 — Wilderness / unmanaged',
};

const SEEDED_NAME_RE = /\(seeded\)\s*$/i;

/**
 * The label to show for a zone. Auto/seeded or empty names are replaced
 * with the canonical permaculture label for the zone's level; any custom
 * (user-given) name — including "Home centre" — is preserved.
 */
export function zoneDisplayLabel(
  z: Pick<LandZone, 'name' | 'permacultureZone'>,
): string {
  const level = z.permacultureZone;
  if (level != null && (!z.name?.trim() || SEEDED_NAME_RE.test(z.name))) {
    return PERMACULTURE_ZONE_LABEL[level];
  }
  return z.name;
}

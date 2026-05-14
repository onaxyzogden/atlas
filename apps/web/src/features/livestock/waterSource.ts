/**
 * waterSource — shared definition of "suitable water source" for grazing
 * paddocks. A suitable source delivers enough volume for the herd's daily
 * intake, sits within walking distance of the paddock centroid (≤100 m
 * comfortable, ≤200 m tolerable), stays clean and reliable across the dry
 * and frozen weeks, and isn't an unfenced stream that risks runoff and
 * sediment. In Atlas this maps to a small set of placed entity types — a
 * free-text note on the paddock alone does not count toward audit credit.
 *
 * Both `WelfareAccessAuditCard` (audit-time) and `PaddockTool` /
 * `LivestockPanel` (draw-time) import from here so the canonical list and
 * thresholds stay in one place.
 */

import type { ProjectedStructure as Structure, StructureType } from '@ogden/shared';
import type { Utility, UtilityType } from '../../store/utilityStore.js';
import type { WaterNode, StorageNodeKind } from '../../store/waterSystemsStore.js';

export const WATER_UTILITIES: ReadonlySet<UtilityType> = new Set<UtilityType>([
  'water_tank',
  'well_pump',
  'rain_catchment',
]);

export const WATER_STRUCTURES: ReadonlySet<StructureType> = new Set<StructureType>([
  'water_tank',
  'well',
  'water_pump_house',
]);

export const WATER_SOURCE_ENTITY_LABEL =
  'well, water tank, rain catchment, well pump, pump house, water-storage node, or rain-catchment node';

export const WATER_BAND_THRESHOLDS_M = { good: 100, fair: 200 } as const;

export type WaterBand = 'good' | 'fair' | 'poor' | 'missing';

export function bandForWater(distanceM: number | null): WaterBand {
  if (distanceM == null) return 'missing';
  if (distanceM <= WATER_BAND_THRESHOLDS_M.good) return 'good';
  if (distanceM <= WATER_BAND_THRESHOLDS_M.fair) return 'fair';
  return 'poor';
}

export const WATER_BAND_RULE_COPY =
  `≤${WATER_BAND_THRESHOLDS_M.good} m = good · ≤${WATER_BAND_THRESHOLDS_M.fair} m = fair · >${WATER_BAND_THRESHOLDS_M.fair} m = poor`;

/** Approx great-circle distance (equirect, fine for small parcels). */
function distanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180) * Math.cos(meanLat);
  return Math.sqrt(dLat * dLat + dLng * dLng) * R;
}

export interface NearestWaterSource {
  distanceM: number | null;
  name: string | null;
  /** Identifies whether the nearest hit was a utility, structure, or water
   *  node — useful for downstream copy ("nearest water tank" vs "nearest
   *  well" vs "nearest catchment node"). */
  kind: UtilityType | StructureType | StorageNodeKind | 'catchment' | null;
}

export function nearestWaterSource(
  centroid: { lat: number; lng: number },
  utilities: Utility[],
  structures: Structure[],
  waterNodes: WaterNode[] = [],
): NearestWaterSource {
  let best: NearestWaterSource = { distanceM: null, name: null, kind: null };
  for (const u of utilities) {
    if (!WATER_UTILITIES.has(u.type)) continue;
    const lng = u.center[0];
    const lat = u.center[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    const d = distanceM(centroid, { lat, lng });
    if (best.distanceM == null || d < best.distanceM) {
      best = { distanceM: d, name: u.name || u.type, kind: u.type };
    }
  }
  for (const s of structures) {
    if (!WATER_STRUCTURES.has(s.type)) continue;
    const lng = s.center[0];
    const lat = s.center[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    const d = distanceM(centroid, { lat, lng });
    if (best.distanceM == null || d < best.distanceM) {
      best = { distanceM: d, name: s.name || s.type, kind: s.type };
    }
  }
  for (const n of waterNodes) {
    if (n.kind !== 'storage' && n.kind !== 'catchment') continue;
    if (!n.center) continue;
    const lng = n.center[0];
    const lat = n.center[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    const d = distanceM(centroid, { lat, lng });
    if (best.distanceM == null || d < best.distanceM) {
      const resolvedKind: StorageNodeKind | 'catchment' =
        n.kind === 'storage' ? (n.storageKind ?? 'tank') : 'catchment';
      best = {
        distanceM: d,
        name: n.name || (n.kind === 'catchment' ? 'Catchment' : resolvedKind),
        kind: resolvedKind,
      };
    }
  }
  return best;
}

/** Plan-stage map tool that places a water tank — the cheapest/most-common
 *  way to resolve a "missing water source" audit finding. */
export const WATER_TANK_PLAN_TOOL_ID = 'plan.structures-subsystems.be.water-tank' as const;

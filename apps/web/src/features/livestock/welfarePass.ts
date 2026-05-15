/**
 * welfarePass — shared welfare-access pass predicate.
 *
 * A paddock "passes" iff all three welfare axes (shade, shelter, water) sit
 * within the `good` band (≤100 m). Same rule the WelfareAccessAuditCard
 * presents; extracted here so the Goal Compass forecast can read live
 * on-map state without coupling to the audit card's UI.
 */

import type { ProjectedStructure as Structure, StructureType } from '@ogden/shared';
import type { Paddock } from '../../store/livestockStore.js';
import type { Utility } from '../../store/utilityStore.js';
import type { WaterNode } from '../../store/waterSystemsStore.js';
import { bandForWater, nearestWaterSource, type WaterBand } from './waterSource.js';

export const SHADE_STRUCTURES: ReadonlySet<StructureType> = new Set([
  'animal_shelter',
  'barn',
  'pavilion',
  'cabin',
  'greenhouse',
  'workshop',
  'lookout',
]);

export const SHELTER_STRUCTURES: ReadonlySet<StructureType> = new Set([
  'animal_shelter',
  'barn',
]);

function polygonCentroid(geom: GeoJSON.Polygon): { lat: number; lng: number } | null {
  const ring = geom.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const pt of ring) {
    if (!pt || pt.length < 2) continue;
    const lng = pt[0];
    const lat = pt[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    sx += lng;
    sy += lat;
    n += 1;
  }
  if (n === 0) return null;
  return { lng: sx / n, lat: sy / n };
}

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

function nearestStructureDistance(
  centroid: { lat: number; lng: number },
  structures: Structure[],
  allowed: ReadonlySet<StructureType>,
): number | null {
  let best: number | null = null;
  for (const st of structures) {
    if (!allowed.has(st.type)) continue;
    const lng = st.center[0];
    const lat = st.center[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    const d = distanceM(centroid, { lat, lng });
    if (best == null || d < best) best = d;
  }
  return best;
}

/** True iff all three welfare axes (shade, shelter, water) are in `good`
 *  band (≤100 m of the paddock centroid). */
export function paddockPassesWelfare(
  paddock: Paddock,
  utilities: Utility[],
  structures: Structure[],
  waterNodes: WaterNode[] = [],
): boolean {
  const centroid = polygonCentroid(paddock.geometry);
  if (!centroid) return false;
  const shadeBand: WaterBand = bandForWater(
    nearestStructureDistance(centroid, structures, SHADE_STRUCTURES),
  );
  const shelterBand: WaterBand = bandForWater(
    nearestStructureDistance(centroid, structures, SHELTER_STRUCTURES),
  );
  const waterBand: WaterBand = bandForWater(
    nearestWaterSource(centroid, utilities, structures, waterNodes).distanceM,
  );
  return shadeBand === 'good' && shelterBand === 'good' && waterBand === 'good';
}

/** Project-scoped roll-up used by the Goal Compass forecast. Returns the
 *  count of paddocks and the pass-rate as a percentage (0..100). */
export function welfareSummaryForProject(
  paddocks: Paddock[],
  utilities: Utility[],
  structures: Structure[],
  waterNodes: WaterNode[] = [],
): { paddockCount: number; passPct: number } {
  if (paddocks.length === 0) return { paddockCount: 0, passPct: 0 };
  let pass = 0;
  for (const p of paddocks) {
    if (paddockPassesWelfare(p, utilities, structures, waterNodes)) pass += 1;
  }
  return {
    paddockCount: paddocks.length,
    passPct: (pass / paddocks.length) * 100,
  };
}

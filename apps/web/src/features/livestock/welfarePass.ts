/**
 * welfarePass — shared welfare-access evaluator + pass predicate.
 *
 * A paddock "passes" iff all three welfare axes (shade, shelter, water) sit
 * within the `good` band (≤100 m). The detail evaluator returns per-axis
 * band, distance, and nearest name; the audit card consumes the details,
 * the Goal Compass forecast consumes the boolean roll-up.
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

export type WelfareBand = WaterBand;

export interface AxisFinding {
  axis: 'shade' | 'shelter' | 'water';
  band: WelfareBand;
  distanceM: number | null;
  nearestName: string | null;
}

export interface PaddockWelfareEval {
  paddock: Paddock;
  shade: AxisFinding;
  shelter: AxisFinding;
  water: AxisFinding;
  worst: WelfareBand;
  centroid: { lat: number; lng: number } | null;
}

const BAND_RANK: Record<WelfareBand, number> = {
  good: 0,
  fair: 1,
  poor: 2,
  missing: 3,
};

export function worstWelfareBand(...bs: WelfareBand[]): WelfareBand {
  let worst: WelfareBand = 'good';
  for (const b of bs) if (BAND_RANK[b] > BAND_RANK[worst]) worst = b;
  return worst;
}

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

interface NearestStructureResult {
  distanceM: number | null;
  name: string | null;
}

function nearestStructureOfTypes(
  centroid: { lat: number; lng: number },
  structures: Structure[],
  allowed: ReadonlySet<StructureType>,
): NearestStructureResult {
  let best: NearestStructureResult = { distanceM: null, name: null };
  for (const st of structures) {
    if (!allowed.has(st.type)) continue;
    const lng = st.center[0];
    const lat = st.center[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    const d = distanceM(centroid, { lat, lng });
    if (best.distanceM == null || d < best.distanceM) {
      best = { distanceM: d, name: st.name || st.type };
    }
  }
  return best;
}

/** Full per-paddock welfare evaluation — used by the audit card display
 *  and (via `paddockPassesWelfare`) by the Goal Compass forecast. */
export function evaluatePaddockWelfare(
  paddock: Paddock,
  utilities: Utility[],
  structures: Structure[],
  waterNodes: WaterNode[] = [],
): PaddockWelfareEval {
  const centroid = polygonCentroid(paddock.geometry);
  if (!centroid) {
    return {
      paddock,
      shade: { axis: 'shade', band: 'missing', distanceM: null, nearestName: null },
      shelter: { axis: 'shelter', band: 'missing', distanceM: null, nearestName: null },
      water: { axis: 'water', band: 'missing', distanceM: null, nearestName: null },
      worst: 'missing',
      centroid: null,
    };
  }
  const shadeNearest = nearestStructureOfTypes(centroid, structures, SHADE_STRUCTURES);
  const shelterNearest = nearestStructureOfTypes(centroid, structures, SHELTER_STRUCTURES);
  const waterNearest = nearestWaterSource(centroid, utilities, structures, waterNodes);
  const shade: AxisFinding = {
    axis: 'shade',
    band: bandForWater(shadeNearest.distanceM),
    distanceM: shadeNearest.distanceM,
    nearestName: shadeNearest.name,
  };
  const shelter: AxisFinding = {
    axis: 'shelter',
    band: bandForWater(shelterNearest.distanceM),
    distanceM: shelterNearest.distanceM,
    nearestName: shelterNearest.name,
  };
  const water: AxisFinding = {
    axis: 'water',
    band: bandForWater(waterNearest.distanceM),
    distanceM: waterNearest.distanceM,
    nearestName: waterNearest.name,
  };
  return {
    paddock,
    shade,
    shelter,
    water,
    worst: worstWelfareBand(shade.band, shelter.band, water.band),
    centroid,
  };
}

/** True iff all three welfare axes (shade, shelter, water) are in `good`
 *  band (≤100 m of the paddock centroid). */
export function paddockPassesWelfare(
  paddock: Paddock,
  utilities: Utility[],
  structures: Structure[],
  waterNodes: WaterNode[] = [],
): boolean {
  return (
    evaluatePaddockWelfare(paddock, utilities, structures, waterNodes).worst === 'good'
  );
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

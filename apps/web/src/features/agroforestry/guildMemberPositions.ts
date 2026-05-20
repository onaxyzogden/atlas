/**
 * guildMemberPositions — deterministic ring layout + metric-to-lonlat
 * offset helpers for `GuildMember` spatial positions.
 *
 * Used by the canopy-union dedup math in `guildLivestockMath.ts`. The
 * `GuildMember.position` field is opt-in: when set, the member sits at
 * a specific offset from `Guild.center`; when undefined, this module
 * assigns a deterministic ring position keyed by `layer` + index within
 * layer so the union math has a position for every member without
 * forcing the steward to place each one.
 *
 * Coordinates are guild-local `[east, north]` in metres. `metresToLonLatOffset`
 * converts to a `[Δlon, Δlat]` pair to add to an absolute `Guild.center`.
 * The conversion is a flat-earth approximation good to ~0.1% at canopy
 * radii (a few metres), which is well below `turf.area` numerical noise
 * for the disk sizes involved.
 */

import type { GuildLayer, GuildMember } from '../../store/polycultureStore.js';

/** Earth-radius constants for the flat-earth offset approximation. */
const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LON_EQUATOR = 111_320;

/**
 * Concentric ring radius (metres) for each food-forest layer. Canopy
 * sits at the centre; lower / smaller-footprint layers expand outward
 * to first-pass plant-spacing distances. Numbers are first-pass and
 * subject to refinement against extension-service guidance, but the
 * ordering (canopy innermost) is the load-bearing invariant.
 */
export function ringRadiusForLayer(layer: GuildLayer): number {
  switch (layer) {
    case 'canopy':
      return 0;
    case 'sub_canopy':
      return 6;
    case 'shrub':
      return 4;
    case 'vine':
      return 3;
    case 'herbaceous':
      return 2.5;
    case 'ground_cover':
      return 1.5;
    case 'root':
      return 0.5;
  }
}

/**
 * Resolve a `[east, north]` offset in metres for every member of a
 * guild. Members with an explicit `position` pass through; others get
 * an angularly-evenly-distributed slot on `ringRadiusForLayer(layer)`,
 * grouped by layer with a stable index so identical inputs yield
 * identical outputs (canopy union math relies on determinism).
 *
 * The single-canopy-member case lands at the origin (ring radius 0,
 * any angle), which matches the historical "everything stacks at
 * Guild.center" assumption.
 */
export function assignRingPositions(
  members: GuildMember[],
): Array<[number, number]> {
  const layerCounts = new Map<GuildLayer, number>();
  const layerIndices = new Map<GuildLayer, number>();
  for (const m of members) {
    layerCounts.set(m.layer, (layerCounts.get(m.layer) ?? 0) + 1);
  }
  const out: Array<[number, number]> = [];
  for (const m of members) {
    if (m.position) {
      out.push([m.position[0], m.position[1]]);
      continue;
    }
    const idx = layerIndices.get(m.layer) ?? 0;
    const count = layerCounts.get(m.layer) ?? 1;
    layerIndices.set(m.layer, idx + 1);
    const r = ringRadiusForLayer(m.layer);
    if (r === 0) {
      out.push([0, 0]);
      continue;
    }
    const theta = (2 * Math.PI * idx) / count;
    out.push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  return out;
}

/**
 * Convert a `[east, north]` metric offset to a `[Δlon, Δlat]` pair
 * suitable for adding to an absolute `[lng, lat]` anchor. Flat-earth
 * approximation; accurate to ~0.1% at the canopy radii we use.
 */
export function metresToLonLatOffset(
  eastM: number,
  northM: number,
  originLat: number,
): [number, number] {
  const cosLat = Math.cos((originLat * Math.PI) / 180);
  const dLon =
    cosLat === 0 ? 0 : eastM / (cosLat * M_PER_DEG_LON_EQUATOR);
  const dLat = northM / M_PER_DEG_LAT;
  return [dLon, dLat];
}

/**
 * Inverse of `metresToLonLatOffset`: convert a `[Δlon, Δlat]` pair
 * (typically `eventLngLat - Guild.center`) back to a guild-local
 * `[east, north]` metric offset. Used by the map-layer drag handler
 * to write `GuildMember.position` from a dragged absolute lon/lat.
 */
export function lonLatToMetresOffset(
  dLon: number,
  dLat: number,
  originLat: number,
): [number, number] {
  const cosLat = Math.cos((originLat * Math.PI) / 180);
  const eastM = cosLat === 0 ? 0 : dLon * cosLat * M_PER_DEG_LON_EQUATOR;
  const northM = dLat * M_PER_DEG_LAT;
  return [eastM, northM];
}

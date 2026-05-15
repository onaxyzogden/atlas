/**
 * lowPointFill — places a pond/basin polygon at the lowest observed
 * point inside the zone, sized to the allocation (circle of equal
 * area), clipped to the zone. Falls back to the zone centroid when
 * the project has no low-point marker inside this zone.
 */

import type { Polygon, MultiPolygon } from 'geojson';
import { turf, toPolygonFeature, intersectPolys } from '../geo.js';
import type { TerrainView } from '../types.js';

export function lowPointFill(
  zone: Polygon | MultiPolygon,
  areaM2: number,
  terrain: TerrainView,
): Polygon[] {
  const poly = toPolygonFeature(zone);

  const lowsInZone = terrain.points
    .filter((p) => p.kind === 'low')
    .filter((p) => turf.booleanPointInPolygon(turf.point(p.position), poly))
    .sort((a, b) => (a.elevationM ?? Infinity) - (b.elevationM ?? Infinity));

  const center = lowsInZone[0]
    ? turf.point(lowsInZone[0].position)
    : turf.pointOnFeature(poly);

  // Circle of equal area: A = πr² → r = sqrt(A/π). turf.circle wants km.
  const radiusKm = Math.sqrt(Math.max(areaM2, 1) / Math.PI) / 1000;
  const circle = turf.circle(center, radiusKm, { steps: 32, units: 'kilometers' });

  const clipped = intersectPolys(
    turf.polygon(circle.geometry.coordinates),
    poly,
  );
  return clipped && turf.area(clipped) > 1
    ? [clipped.geometry]
    : [poly.geometry];
}

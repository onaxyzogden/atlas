/**
 * stampGeometry — dispatches a GeometryTemplate to its stamper and
 * returns the raw GeoJSON geometries to draw into one allocated zone.
 *
 * `earthen-pond` carries `fill-polygon` in the catalog but, when
 * terrain low-points exist, a basin reads better than a whole-zone
 * fill — so `fill-polygon` is routed through `lowPointFill` when the
 * terrain has any low point inside the zone, else plain fill.
 *
 * Spec: wiki/decisions/2026-05-14-auto-design-pipeline.md.
 */

import type { Polygon, MultiPolygon, Point, LineString } from 'geojson';
import type { GeometryTemplate } from '../../data/goalCompassTypes.js';
import { EMPTY_TERRAIN, type TerrainView } from './types.js';
import { stripSubdivide } from './stampers/stripSubdivide.js';
import { centroidPoint } from './stampers/centroidPoint.js';
import { fillPolygon } from './stampers/fillPolygon.js';
import { bboxRect } from './stampers/bboxRect.js';
import { edgeLine } from './stampers/edgeLine.js';
import { contourLine } from './stampers/contourLine.js';
import { lowPointFill } from './stampers/lowPointFill.js';

export type StampedGeometry = Polygon | LineString | Point;

export function stampGeometry(
  template: GeometryTemplate,
  zone: Polygon | MultiPolygon,
  areaM2: number,
  terrain: TerrainView = EMPTY_TERRAIN,
): StampedGeometry[] {
  switch (template) {
    case 'tile-strip':
      return stripSubdivide(zone, areaM2);
    case 'centroid-point':
      return centroidPoint(zone);
    case 'bbox-rect':
      return bboxRect(zone, areaM2);
    case 'edge-line':
      return edgeLine(zone);
    case 'contour-line':
      return contourLine(zone, terrain);
    case 'fill-polygon':
      return terrain.points.some((p) => p.kind === 'low')
        ? lowPointFill(zone, areaM2, terrain)
        : fillPolygon(zone);
    default: {
      const _exhaustive: never = template;
      return _exhaustive;
    }
  }
}

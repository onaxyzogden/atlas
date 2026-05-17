/**
 * stripSubdivide — equal-AREA strips along the zone's longest axis.
 * Used by AMP paddocks (cattle / small-ruminant) and annual beds.
 *
 * Strip count derives deterministically from the allocated area
 * (≈1-acre cells, clamped 2–12). Each boundary between strips is placed
 * by bisecting the sweep coordinate until the cumulative clipped area
 * reaches k/n of the polygon's true area — so on an irregular polygon
 * the cells stay within a tight tolerance of each other (largest ≲10%
 * over smallest), instead of the old equal-bbox-width slices that
 * collapsed to slivers wherever the polygon narrowed. Pure +
 * deterministic (fixed bisection count, no RNG): the same allocation
 * always yields identical strips.
 */

import type { Polygon, MultiPolygon } from 'geojson';
import { turf, toPolygonFeature, intersectPolys } from '../geo.js';
import { ACRE_M2 } from '../types.js';

// 2^-28 of the axis span ≈ sub-millimetre at parcel scale → the
// per-cell area error is far under the 10% variance budget.
const BISECT_ITERS = 28;

export function stripSubdivide(
  zone: Polygon | MultiPolygon,
  areaM2: number,
): Polygon[] {
  const poly = toPolygonFeature(zone);
  const [minX, minY, maxX, maxY] = turf.bbox(poly);
  const widthDeg = maxX - minX;
  const heightDeg = maxY - minY;
  if (widthDeg <= 0 || heightDeg <= 0) return [];

  const total = turf.area(poly);
  if (total <= 0) return [];

  const n = Math.min(12, Math.max(2, Math.round(areaM2 / ACRE_M2)));
  const splitAlongX = widthDeg >= heightDeg;
  const axisMin = splitAlongX ? minX : minY;
  const axisMax = splitAlongX ? maxX : maxY;

  // The polygon's slice between two sweep coordinates (full cross-axis
  // extent), clipped to the polygon. Null when the slice misses it.
  const sliceBetween = (lo: number, hi: number) => {
    const box: [number, number, number, number] = splitAlongX
      ? [lo, minY, hi, maxY]
      : [minX, lo, maxX, hi];
    const band = turf.bboxPolygon(box);
    return intersectPolys(turf.polygon(band.geometry.coordinates), poly);
  };

  // Clipped area from axisMin up to `c`. Monotonic non-decreasing in c.
  const cumArea = (c: number): number => {
    if (c <= axisMin) return 0;
    if (c >= axisMax) return total;
    const s = sliceBetween(axisMin, c);
    return s ? turf.area(s) : 0;
  };

  // Sweep coordinate where cumArea === targetArea (bisection; fixed
  // iteration count keeps it deterministic and data-independent).
  const solveBoundary = (targetArea: number): number => {
    let lo = axisMin;
    let hi = axisMax;
    for (let it = 0; it < BISECT_ITERS; it++) {
      const mid = (lo + hi) / 2;
      if (cumArea(mid) < targetArea) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  const bounds: number[] = [axisMin];
  for (let k = 1; k < n; k++) {
    bounds.push(solveBoundary((total * k) / n));
  }
  bounds.push(axisMax);

  const out: Polygon[] = [];
  for (let i = 0; i < n; i++) {
    const clipped = sliceBetween(bounds[i]!, bounds[i + 1]!);
    if (clipped && turf.area(clipped) > 1) out.push(clipped.geometry);
  }
  return out;
}

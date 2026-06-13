/**
 * resolveSiteAcres -- the canonical parcel area in ACRES for a v3 project,
 * for use as the denominator in drawn-survey "% of site" math (slope &
 * vegetation surveys).
 *
 * Why this exists (the slope/veg "0% / --" bug): survey polygons are measured
 * with turf (`parcelAcres`, always acres), but `project.location.acreage` is a
 * DISPLAY-unit value -- hectares for metric projects -- and
 * `adaptLocalProjectToV3` zeroes it whenever the stored acreage is not a
 * trustworthy positive number (`areaKnown === false`), EVEN THOUGH a drawable
 * boundary polygon still exists. Dividing drawn acres by that value gave every
 * class `pct = 0`.
 *
 * Resolution order:
 *   1. The parcel BOUNDARY area via turf (`parcelAcres`) -- acres, measured
 *      identically to each drawn polygon, and present whenever a survey can run
 *      (you draw inside the boundary you see). This is the correct, unit-safe
 *      denominator: numerator and denominator share the same spatial reference,
 *      so drawn extents can never exceed 100% of the parcel.
 *   2. Fallback: the stored `location.acreage`, converted from its display unit
 *      back to acres -- for the rare project that has an acreage but no boundary
 *      polygon.
 *   3. `0` when neither is available (honest empty state: % is not computable).
 */

import type { ProjectLocation } from '../types.js';
import { parcelAcres, parcelAreaToAcres } from '../../lib/geo.js';

export function resolveSiteAcres(
  location: ProjectLocation | null | undefined,
): number {
  if (!location) return 0;
  const { boundary, acreage, acreageUnit } = location;
  if (boundary) {
    const acres = parcelAcres(boundary);
    if (acres != null && acres > 0) return acres;
  }
  if (Number.isFinite(acreage) && acreage > 0) {
    return parcelAreaToAcres(acreage, acreageUnit === 'ha' ? 'metric' : 'imperial');
  }
  return 0;
}

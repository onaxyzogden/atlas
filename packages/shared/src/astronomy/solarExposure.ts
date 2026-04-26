/**
 * Solar exposure scoring — combines terrain (slope + aspect) with sun-path
 * astronomy to produce a per-cell exposure score suitable for placement-zone
 * mapping (solar panels, greenhouses, sun-loving crops).
 *
 * Score is in [0, 1]:
 *   0 = no usable daylight insolation (polar night, deep north-facing cliff)
 *   1 = flat or south-tilted aspect with full-day unobstructed sun
 *
 * Does NOT model horizon shading from surrounding terrain — that would
 * require ray-casting against the full DEM, which is out of scope for this
 * pass. Treats each cell as self-contained; users get a planning-grade
 * potential map, not a production PV yield estimate.
 */

import { computeSunPathForSeason, type Season } from './sunPath.js';

/**
 * Compute exposure score for a single cell given its slope, aspect, and a
 * latitude-specific sun path for the chosen season.
 *
 * @param slopeDeg  Cell slope in degrees (0 = flat, 90 = vertical).
 * @param aspectDeg Downslope azimuth in degrees clockwise from N; NaN = flat.
 * @param latitude  Cell latitude in decimal degrees.
 * @param season    Season for the sun path (affects solar declination).
 */
export function computeCellExposure(
  slopeDeg: number,
  aspectDeg: number,
  latitude: number,
  season: Season,
): number {
  const path = computeSunPathForSeason(latitude, season);

  const slopeRad = (slopeDeg * Math.PI) / 180;
  const isFlat = !Number.isFinite(aspectDeg) || slopeDeg < 0.5;
  const aspectRad = isFlat ? 0 : (aspectDeg * Math.PI) / 180;

  let weighted = 0;
  let maxPossible = 0;

  for (const p of path) {
    if (p.elevation <= 0) continue;

    const elRad = (p.elevation * Math.PI) / 180;
    const azRad = (p.azimuth * Math.PI) / 180;

    // Incidence cosine: clamp(cos(zenith)*cos(slope) + sin(zenith)*sin(slope)*cos(az - aspect))
    // where zenith = 90 - elevation
    const cosZenith = Math.sin(elRad);
    const sinZenith = Math.cos(elRad);

    let incidence: number;
    if (isFlat) {
      incidence = cosZenith;
    } else {
      incidence =
        cosZenith * Math.cos(slopeRad) +
        sinZenith * Math.sin(slopeRad) * Math.cos(azRad - aspectRad);
    }
    incidence = Math.max(0, incidence);

    weighted += incidence;
    // Flat-panel upper bound at this hour = cos(zenith); sum for normalization
    maxPossible += cosZenith;
  }

  if (maxPossible <= 0) return 0;
  return Math.min(1, weighted / maxPossible);
}

/**
 * Compute annual exposure score as an average across the four season anchors
 * (spring, summer, fall, winter). Cheap proxy for integrating over the year.
 */
export function computeAnnualExposure(
  slopeDeg: number,
  aspectDeg: number,
  latitude: number,
): number {
  const seasons: Season[] = ['spring', 'summer', 'fall', 'winter'];
  let sum = 0;
  for (const s of seasons) sum += computeCellExposure(slopeDeg, aspectDeg, latitude, s);
  return sum / seasons.length;
}

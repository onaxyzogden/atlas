/**
 * Climate-context derivation — given a geographic latitude and a calendar
 * date, classify the hemisphere, coarse latitude band, and astronomical
 * season. Used by the §6 cross-project Observe comparison to read each
 * project's readings in seasonal context: a June sample is high summer in
 * the north but deep winter in the south, so two projects compared on the
 * same calendar date are at opposite points of their growing year.
 *
 * Pure and dependency-free. The caller supplies the latitude — from the
 * project's boundary centroid or `metadata.centerLat` — and the date of the
 * reading. Reuses the `Season` vocabulary + `SEASON_DATES` (equinox/solstice
 * month/day) from `astronomy/sunPath` rather than redefining seasons.
 *
 * Note on scope: this derives season + band from latitude and date ALONE. It
 * deliberately does NOT emit a Köppen-style climate zone — that needs
 * temperature/precipitation normals, and any lat-only "zone" would just
 * duplicate `latitudeBand`.
 */

import { type Season, SEASON_DATES } from '../astronomy/sunPath.js';

export type Hemisphere = 'north' | 'south';

/** Coarse latitude band by absolute latitude (tropics / mid-latitudes /
 *  polar), split at the Tropic (23.5°) and the Polar Circle (66.5°). */
export type LatitudeBand = 'tropical' | 'temperate' | 'polar';

export interface ClimateContext {
  hemisphere: Hemisphere;
  latitudeBand: LatitudeBand;
  /** Astronomical season at this location on this date, hemisphere-aware. */
  season: Season;
}

/** Tropic of Cancer/Capricorn, degrees. */
const TROPIC_LAT = 23.5;
/** Arctic/Antarctic Circle, degrees. */
const POLAR_LAT = 66.5;

/** Southern hemisphere is half a year out of phase: spring↔fall, summer↔winter. */
const SEASON_INVERSION: Record<Season, Season> = {
  spring: 'fall',
  summer: 'winter',
  fall: 'spring',
  winter: 'summer',
};

/** True when (month, day) is on or after the given SEASON_DATES boundary. */
function onOrAfter(month: number, day: number, boundary: { month: number; day: number }): boolean {
  return month > boundary.month || (month === boundary.month && day >= boundary.day);
}

/**
 * The northern-hemisphere astronomical season for a UTC month/day, using the
 * `SEASON_DATES` equinox/solstice thresholds. A date that falls exactly on a
 * boundary belongs to the season that boundary starts.
 */
function northernSeason(month: number, day: number): Season {
  // Boundaries in calendar order. Winter wraps the year end (Dec 21 → Mar 19),
  // so it is the answer both at the top of the year and after the Dec solstice.
  if (onOrAfter(month, day, SEASON_DATES.winter)) return 'winter'; // Dec 21 .. Dec 31
  if (onOrAfter(month, day, SEASON_DATES.fall)) return 'fall'; //    Sep 22 .. Dec 20
  if (onOrAfter(month, day, SEASON_DATES.summer)) return 'summer'; // Jun 21 .. Sep 21
  if (onOrAfter(month, day, SEASON_DATES.spring)) return 'spring'; // Mar 20 .. Jun 20
  return 'winter'; //                                                Jan 1  .. Mar 19
}

/**
 * Derive the climate context for a location + date.
 *
 * @param lat  Decimal degrees, negative for the southern hemisphere.
 * @param date The reading's date; only its UTC month/day are used (so the
 *             result is timezone-stable).
 */
export function deriveClimateContext(lat: number, date: Date): ClimateContext {
  const hemisphere: Hemisphere = lat < 0 ? 'south' : 'north';

  const absLat = Math.abs(lat);
  const latitudeBand: LatitudeBand =
    absLat <= TROPIC_LAT ? 'tropical' : absLat <= POLAR_LAT ? 'temperate' : 'polar';

  const month = date.getUTCMonth() + 1; // getUTCMonth is 0-based.
  const day = date.getUTCDate();
  const northSeason = northernSeason(month, day);
  const season = hemisphere === 'south' ? SEASON_INVERSION[northSeason] : northSeason;

  return { hemisphere, latitudeBand, season };
}

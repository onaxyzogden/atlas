/**
 * Sun-path astronomical calculations — shared across web dashboard, map
 * panel, and any API-side solar analysis (shade raster generation, etc).
 *
 * Outputs hourly solar altitude + azimuth for a given latitude and day
 * of year using the Spencer (1971) solar-declination approximation.
 * Accurate to ~0.5° for planning-grade analysis — not for PV yield sims.
 */

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface SunPosition {
  /** Hour of day, 0-23 in local solar time. */
  hour: number;
  /** Degrees clockwise from north (0 = N, 90 = E, 180 = S, 270 = W). */
  azimuth: number;
  /** Degrees above the horizon. Negative = below horizon. */
  elevation: number;
}

export interface SunPathSummary {
  positions: SunPosition[];
  /** Hours where the sun is above the horizon (elevation > 0). */
  daylightHours: number;
  /** Position at solar noon (highest elevation in the day). */
  solarNoon: SunPosition;
  /** Azimuth at sunrise (first hour with positive elevation). */
  sunriseAzimuth: number | null;
  /** Azimuth at sunset (last hour with positive elevation). */
  sunsetAzimuth: number | null;
}

export const SEASON_DATES: Record<Season, { month: number; day: number; label: string }> = {
  spring: { month: 3, day: 20, label: 'Spring Equinox' },
  summer: { month: 6, day: 21, label: 'Summer Solstice' },
  fall: { month: 9, day: 22, label: 'Fall Equinox' },
  winter: { month: 12, day: 21, label: 'Winter Solstice' },
};

/**
 * Compute hourly sun positions for a given latitude and day-of-year.
 * @param latitude Decimal degrees, negative for southern hemisphere.
 * @param dayOfYear 1-365 (Jan 1 = 1).
 * @param startHour Default 4 (covers polar-summer sunrise).
 * @param endHour Default 21 (covers polar-summer sunset).
 */
export function computeSunPath(
  latitude: number,
  dayOfYear: number,
  startHour = 4,
  endHour = 21,
): SunPosition[] {
  const B = ((dayOfYear - 1) * 360) / 365;
  const Br = (B * Math.PI) / 180;
  // Spencer (1971) solar declination series, radians.
  const declinationRad =
    0.006918 -
    0.399912 * Math.cos(Br) +
    0.070257 * Math.sin(Br) -
    0.006758 * Math.cos(2 * Br) +
    0.000907 * Math.sin(2 * Br);

  const latRad = (latitude * Math.PI) / 180;
  const positions: SunPosition[] = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    const hourAngleRad = ((hour - 12) * 15 * Math.PI) / 180;
    const sinEl =
      Math.sin(latRad) * Math.sin(declinationRad) +
      Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    const elevationRad = Math.asin(clamp(sinEl, -1, 1));
    const elevation = (elevationRad * 180) / Math.PI;

    const cosAz =
      (Math.sin(declinationRad) - Math.sin(latRad) * sinEl) /
      (Math.cos(latRad) * Math.cos(elevationRad));
    let azimuth = (Math.acos(clamp(cosAz, -1, 1)) * 180) / Math.PI;
    if (hourAngleRad > 0) azimuth = 360 - azimuth;

    positions.push({ hour, azimuth, elevation });
  }
  return positions;
}

/**
 * Convenience wrapper for a named season at a given latitude.
 */
export function computeSunPathForSeason(latitude: number, season: Season): SunPosition[] {
  const { month, day } = SEASON_DATES[season];
  const doy = Math.floor((month - 1) * 30.44 + day);
  return computeSunPath(latitude, doy);
}

/**
 * Summarize a sun-path series into derived metrics (daylight hours,
 * solar noon, sunrise/sunset azimuths).
 */
export function summarizeSunPath(positions: SunPosition[]): SunPathSummary {
  const daylight = positions.filter((p) => p.elevation > 0);
  const solarNoon = positions.reduce(
    (max, p) => (p.elevation > max.elevation ? p : max),
    positions[0] ?? { hour: 12, azimuth: 180, elevation: 0 },
  );
  return {
    positions,
    daylightHours: daylight.length,
    solarNoon,
    sunriseAzimuth: daylight[0]?.azimuth ?? null,
    sunsetAzimuth: daylight[daylight.length - 1]?.azimuth ?? null,
  };
}

/**
 * Derive a rough south-facing exposure score (0-1) from a season's sun
 * path. 1.0 means the sun spends most of its time due south at high
 * altitude; 0 means it never rises meaningfully above the horizon.
 * Used for quick solar-opportunity summaries without a raster sim.
 */
export function solarExposureScore(positions: SunPosition[]): number {
  if (positions.length === 0) return 0;
  let weighted = 0;
  let maxPossible = 0;
  for (const p of positions) {
    if (p.elevation <= 0) continue;
    // Weight by elevation (higher sun = more energy) and south-bias.
    const southBias = Math.cos(((p.azimuth - 180) * Math.PI) / 180);
    weighted += Math.max(0, Math.sin((p.elevation * Math.PI) / 180)) * Math.max(0, southBias);
    maxPossible += 1;
  }
  return maxPossible > 0 ? Math.min(1, weighted / maxPossible) : 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

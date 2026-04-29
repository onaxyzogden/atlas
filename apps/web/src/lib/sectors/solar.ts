/**
 * Solar sectors — winter solstice, summer solstice, and equinox sun arcs for
 * a given site centroid, computed locally via suncalc (no network).
 *
 * Northern hemisphere only for v3.2: a solar wedge sweeps clockwise from
 * sunrise bearing through the southern sky to sunset bearing. Southern
 * hemisphere support is a follow-up — see TODO in `solarWedge`.
 *
 * suncalc azimuth convention: radians from south, growing westward. Convert
 * to compass bearing (0=N, clockwise) via `(azimuthRad + π) mod 2π`.
 */

import SunCalc from "suncalc";
import type { SectorWedge, SiteSectors } from "./types.js";

const RAD_TO_DEG = 180 / Math.PI;
const DEFAULT_REACH_METERS = 600;

const COLORS = {
  "solar-summer": "#c4a265",
  "solar-winter": "#b87a3f",
  "solar-equinox": "#9a8550",
} as const;

/** Compass bearing (0..360, 0=N, clockwise) from a suncalc azimuth (radians from south). */
function azimuthToBearing(azimuthRad: number): number {
  const deg = ((azimuthRad + Math.PI) * RAD_TO_DEG) % 360;
  return (deg + 360) % 360;
}

interface KeyDate {
  kind: "solar-summer" | "solar-winter" | "solar-equinox";
  label: string;
  date: Date;
}

/** UTC noon on each anchor day so DST/timezone shifts don't move the sun arc. */
function keyDates(year: number): KeyDate[] {
  return [
    { kind: "solar-summer", label: "Summer solstice sun arc", date: new Date(Date.UTC(year, 5, 21, 12)) },
    { kind: "solar-winter", label: "Winter solstice sun arc", date: new Date(Date.UTC(year, 11, 21, 12)) },
    { kind: "solar-equinox", label: "Equinox sun arc", date: new Date(Date.UTC(year, 2, 20, 12)) },
  ];
}

function solarWedge(
  centroid: [number, number],
  reachMeters: number,
  entry: KeyDate,
): SectorWedge | null {
  const [lng, lat] = centroid;
  const times = SunCalc.getTimes(entry.date, lat, lng);
  if (!(times.sunrise instanceof Date) || isNaN(times.sunrise.getTime())) return null;
  if (!(times.sunset instanceof Date) || isNaN(times.sunset.getTime())) return null;

  const sunriseAz = SunCalc.getPosition(times.sunrise, lat, lng).azimuth;
  const sunsetAz = SunCalc.getPosition(times.sunset, lat, lng).azimuth;
  const sunriseBearing = azimuthToBearing(sunriseAz);
  const sunsetBearing = azimuthToBearing(sunsetAz);

  // TODO(v3.3): southern hemisphere — sun arcs through the north, so the
  // wedge would sweep sunset→sunrise (clockwise through 0°) instead.
  return {
    id: entry.kind,
    kind: entry.kind,
    label: entry.label,
    startBearingDeg: sunriseBearing,
    endBearingDeg: sunsetBearing,
    reachMeters,
    color: COLORS[entry.kind],
    meta: {
      anchorDate: entry.date.toISOString(),
      sunriseISO: times.sunrise.toISOString(),
      sunsetISO: times.sunset.toISOString(),
    },
  };
}

export interface ComputeSolarOptions {
  reachMeters?: number;
  year?: number;
}

/**
 * Compute the three canonical solar wedges (winter, summer, equinox) for a
 * site centroid. Pure function — same input, same output, no network.
 */
export function computeSolarSectors(
  centroid: [number, number],
  opts: ComputeSolarOptions = {},
): SiteSectors {
  const reach = opts.reachMeters ?? DEFAULT_REACH_METERS;
  const year = opts.year ?? new Date().getUTCFullYear();
  const wedges = keyDates(year)
    .map((d) => solarWedge(centroid, reach, d))
    .filter((w): w is SectorWedge => w !== null);

  return {
    centroid,
    generatedAt: new Date().toISOString(),
    wedges,
    sources: [
      { kind: "solar", provenance: `suncalc local computation, anchor year ${year}` },
    ],
  };
}

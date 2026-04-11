/**
 * solarCalc — pure sun position calculation.
 * Computes dawn, sunrise, solar noon, sunset, dusk for a given location and date.
 * No external dependencies. Uses standard solar declination + hour angle formulas.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export interface SolarTimes {
  dawn: Date;      // civil twilight start (-6 degrees)
  sunrise: Date;   // sun disc at horizon (-0.833 degrees)
  solarNoon: Date; // sun at highest point
  sunset: Date;    // sun disc at horizon
  dusk: Date;      // civil twilight end
}

export interface SeasonalRow {
  label: string;
  date: Date;
  times: SolarTimes;
}

/**
 * Compute solar times for a given latitude, longitude, and date.
 */
export function computeSolarTimes(lat: number, lng: number, date: Date): SolarTimes {
  const jd = toJulianDate(date);
  const n = jd - 2451545.0 + 0.0008; // Julian day number from J2000.0

  // Mean solar noon
  const Jstar = n - lng / 360;

  // Solar mean anomaly
  const M = (357.5291 + 0.98560028 * Jstar) % 360;
  const Mrad = M * DEG;

  // Equation of the center
  const C = 1.9148 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad);

  // Ecliptic longitude
  const lambda = (M + C + 180 + 102.9372) % 360;
  const lambdaRad = lambda * DEG;

  // Solar transit (solar noon)
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);

  // Declination of the sun
  const sinDec = Math.sin(lambdaRad) * Math.sin(23.4397 * DEG);
  const decRad = Math.asin(sinDec);

  // Hour angle calculation for a given sun altitude angle
  function hourAngle(altDeg: number): number {
    const sinAlt = Math.sin(altDeg * DEG);
    const latRad = lat * DEG;
    const cosHA = (sinAlt - Math.sin(latRad) * sinDec) / (Math.cos(latRad) * Math.cos(decRad));
    if (cosHA < -1 || cosHA > 1) return NaN; // never rises or never sets
    return Math.acos(cosHA) * RAD;
  }

  const haRise = hourAngle(-0.833);    // sunrise/sunset
  const haDawn = hourAngle(-6);        // civil dawn/dusk

  const solarNoon = fromJulianDate(Jtransit);

  // Sunrise/sunset from hour angle
  const JriseSet = haRise / 360;
  const sunrise = fromJulianDate(Jtransit - JriseSet);
  const sunset = fromJulianDate(Jtransit + JriseSet);

  // Dawn/dusk from hour angle
  const JdawnDusk = haDawn / 360;
  const dawn = fromJulianDate(Jtransit - JdawnDusk);
  const dusk = fromJulianDate(Jtransit + JdawnDusk);

  return { dawn, sunrise, solarNoon, sunset, dusk };
}

/**
 * Compute solar times for today + the four seasonal turning points.
 */
export function computeSeasonalTable(lat: number, lng: number): SeasonalRow[] {
  const now = new Date();
  const year = now.getFullYear();

  const dates: { label: string; date: Date }[] = [
    { label: 'Today', date: now },
    { label: 'Vernal Equinox', date: new Date(year, 2, 20) },    // Mar 20
    { label: 'Summer Solstice', date: new Date(year, 5, 21) },   // Jun 21
    { label: 'Autumnal Equinox', date: new Date(year, 8, 22) },  // Sep 22
    { label: 'Winter Solstice', date: new Date(year, 11, 21) },  // Dec 21
  ];

  return dates.map(({ label, date }) => ({
    label,
    date,
    times: computeSolarTimes(lat, lng, date),
  }));
}

/**
 * Format a Date as HH:MM in local time.
 */
export function formatTime(d: Date): string {
  if (isNaN(d.getTime())) return '\u2014';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Julian Date helpers ─────────────────────────────────────────────

function toJulianDate(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4)
    - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}

function fromJulianDate(jd: number): Date {
  // Convert Julian Date to milliseconds since epoch
  const ms = (jd - 2440587.5) * 86400000;
  return new Date(ms);
}

/**
 * Qibla bearing calculator — computes the direction to the Kaaba (Mecca)
 * from any point on Earth using the spherical law of cosines.
 *
 * This is a first-class feature of the OGDEN Atlas, not an afterthought.
 * Prayer spaces, quiet zones, and Qibla alignment are core design elements.
 */

// Kaaba coordinates
const MECCA_LAT = 21.4225;
const MECCA_LNG = 39.8262;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export interface QiblaResult {
  /** Bearing in degrees clockwise from true north (0-360) */
  bearing: number;
  /** Great-circle distance to Kaaba in km */
  distanceKm: number;
  fromLat: number;
  fromLng: number;
}

/**
 * Compute Qibla bearing and distance from a given coordinate.
 */
export function computeQibla(lat: number, lng: number): QiblaResult {
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const lat2 = toRad(MECCA_LAT);
  const lng2 = toRad(MECCA_LNG);

  const dLng = lng2 - lng1;

  // Forward azimuth using the spherical formula
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let bearing = toDeg(Math.atan2(y, x));
  bearing = ((bearing % 360) + 360) % 360; // Normalize to 0-360

  // Great-circle distance (Haversine)
  const dLat = lat2 - lat1;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const R = 6371; // Earth radius in km
  const distanceKm = R * c;

  return { bearing, distanceKm, fromLat: lat, fromLng: lng };
}

/**
 * Format bearing as cardinal direction string.
 */
export function bearingToCardinal(bearing: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearing / 22.5) % 16;
  return dirs[index]!;
}

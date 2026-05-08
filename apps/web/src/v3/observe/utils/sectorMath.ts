/**
 * sectorMath — pure helpers for OBSERVE sector wedges.
 *
 * Sectors share an apex (the homestead, or the parcel centroid as fallback)
 * and project a wedge defined by `(bearingDeg, arcDeg)`. These helpers compute
 * bearings between lng/lat points and the arc-width delta corresponding to a
 * pointer drag on the arc-edge handle.
 *
 * Extracted so `SunWindWedgeTool` (create) and `AnnotationSectorHandles`
 * (on-map drag edit) can share without a circular import.
 */

/**
 * Initial bearing in degrees from `from` to `to`, measured from N (0 = N,
 * 90 = E). Spherical great-circle formula; sufficient for parcel-scale
 * distances where projection error is negligible.
 */
export function bearingFromPoints(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
): number {
  const phi1 = (fromLat * Math.PI) / 180;
  const phi2 = (toLat * Math.PI) / 180;
  const dLambda = ((toLng - fromLng) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

/** Smallest signed angular delta (degrees) from `a` to `b`, in [-180, 180]. */
export function angleDelta(a: number, b: number): number {
  let d = ((b - a + 540) % 360) - 180;
  if (d <= -180) d += 360;
  return d;
}

/**
 * Given the apex, a pointer location, and the sector's current `bearingDeg`,
 * compute the new total `arcDeg` such that the arc edge tracks the pointer.
 * Result is clamped to `[10, 350]`.
 */
export function arcDegFromPointer(
  apexLng: number,
  apexLat: number,
  pointerLng: number,
  pointerLat: number,
  bearingDeg: number,
): number {
  const pointerBearing = bearingFromPoints(
    apexLng,
    apexLat,
    pointerLng,
    pointerLat,
  );
  const half = Math.abs(angleDelta(bearingDeg, pointerBearing));
  return Math.max(10, Math.min(350, half * 2));
}

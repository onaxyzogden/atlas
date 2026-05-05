/**
 * bufferBboxKm — expand a WGS84 lat/lng bbox by a buffer expressed in km.
 *
 * One degree of latitude is ≈ 111 km at all latitudes, but one degree of
 * longitude shrinks with cos(lat) — at 60° N a degree of longitude is
 * only ~55 km. A flat `bufferKm / 111` therefore under-buffers the
 * longitude axis by ~50 % at 60° N. This helper applies the cosine-of-
 * latitude correction to the longitude axis only.
 *
 * The cosine is floored at 0.1 to cap longitude buffer expansion at 10×
 * near the poles (above ~84° latitude). Beyond that the parcel is in
 * multi-tile-stitch territory anyway — the synthesized-grid fallback is
 * the correct answer and the buffer math is irrelevant.
 *
 * Used by the polygon-friction path's inline ClipProvider in
 * `PollinatorOpportunityProcessor.tryPolygonPath`. Extracted into its
 * own module so the math can be unit-tested directly without booting
 * the processor.
 */

import type { ParcelBbox4326 } from './LandCoverRasterServiceBase.js';

/** Minimum cosine value used in the longitude buffer denominator. */
export const BUFFER_COSLAT_FLOOR = 0.1;

/** Approximate km-per-degree-latitude (WGS84 mean meridian). */
export const KM_PER_DEG_LAT = 111;

/**
 * Expand a WGS84 bbox by `bufferKm` on every side, applying cosine-of-
 * latitude correction to the longitude axis. Returns a new bbox; does
 * not mutate the input.
 */
export function bufferBboxKm(
  bbox: ParcelBbox4326,
  bufferKm: number,
): ParcelBbox4326 {
  const latBuf = bufferKm / KM_PER_DEG_LAT;
  const meanLatRad = ((bbox.minLat + bbox.maxLat) / 2) * (Math.PI / 180);
  const cosLat = Math.max(BUFFER_COSLAT_FLOOR, Math.cos(meanLatRad));
  const lngBuf = bufferKm / (KM_PER_DEG_LAT * cosLat);
  return {
    minLng: bbox.minLng - lngBuf,
    minLat: bbox.minLat - latBuf,
    maxLng: bbox.maxLng + lngBuf,
    maxLat: bbox.maxLat + latBuf,
  };
}

/**
 * pointInPolygonRing — even-odd ray-cast test for a 2D point against a
 * single GeoJSON-style linear ring.
 *
 * Used by `LandCoverRasterServiceBase.sampleHistogram` (when a parcel
 * polygon is supplied) to mask raster pixels by the actual parcel
 * geometry rather than its bbox. The bbox-only fast path remains the
 * default for adapters that don't need the refinement; this helper
 * is opt-in via the second `parcelPolygon4326` argument.
 *
 * Contract:
 *   - `ring` is a closed linear ring in [lng, lat] order. The first
 *     and last vertex coincide; the helper does not require nor
 *     enforce closure (algorithm is robust either way).
 *   - Points exactly on a ring edge or vertex resolve consistently
 *     (no special casing) — fine for the histogram use case where
 *     ±1 pixel either way is irrelevant against a 1k+ pixel sample.
 *   - Holes are not handled. GeoJSON Polygons can carry inner rings,
 *     but parcel boundaries don't; the caller passes the outer ring
 *     and treats the polygon as solid. Document at the call-site if
 *     this becomes wrong for an actual cohort.
 *   - Antimeridian-crossing rings (vertices spanning ±180°) are
 *     treated naively. Atlas parcels are sub-degree extents on land,
 *     so the ray cast at the test latitude works without splitting.
 *
 * Extracted into its own module so the geometry math can be unit-
 * tested directly without booting the raster service.
 */

/**
 * Test whether `(lng, lat)` is inside the linear ring `ring`. Edge /
 * vertex points resolve consistently per the even-odd rule but the
 * boundary side is not specified.
 */
export function pointInPolygonRing(
  lng: number,
  lat: number,
  ring: number[][],
): boolean {
  // Need at least 3 distinct vertices to form a polygon. Defend against
  // degenerate input (empty ring, single point) by returning false.
  if (ring.length < 3) return false;

  let inside = false;
  // Walk every edge (i-1, i). Closure handled by starting j at last vertex.
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const vi = ring[i]!;
    const vj = ring[j]!;
    const xi = vi[0]!;
    const yi = vi[1]!;
    const xj = vj[0]!;
    const yj = vj[1]!;
    // Edge straddles the horizontal ray from (lng, lat) going +x?
    const intersects =
      ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

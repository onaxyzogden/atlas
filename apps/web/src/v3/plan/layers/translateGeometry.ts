/**
 * translateByDelta — pure coordinate shift for any GeoJSON geometry.
 * Used by Plan-stage drag handlers to move polygons / lines / points
 * without inventing synthetic `center` fields on the underlying records.
 */
export function translateByDelta<G extends GeoJSON.Geometry>(
  geom: G,
  dLng: number,
  dLat: number,
): G {
  const shift = (c: number[]): [number, number] => [
    (c[0] ?? 0) + dLng,
    (c[1] ?? 0) + dLat,
  ];
  switch (geom.type) {
    case 'Point':
      return { ...geom, coordinates: shift(geom.coordinates) } as G;
    case 'MultiPoint':
      return { ...geom, coordinates: geom.coordinates.map(shift) } as G;
    case 'LineString':
      return { ...geom, coordinates: geom.coordinates.map(shift) } as G;
    case 'MultiLineString':
      return {
        ...geom,
        coordinates: geom.coordinates.map((l) => l.map(shift)),
      } as G;
    case 'Polygon':
      return {
        ...geom,
        coordinates: geom.coordinates.map((ring) => ring.map(shift)),
      } as G;
    case 'MultiPolygon':
      return {
        ...geom,
        coordinates: geom.coordinates.map((poly) =>
          poly.map((ring) => ring.map(shift)),
        ),
      } as G;
    default:
      return geom;
  }
}

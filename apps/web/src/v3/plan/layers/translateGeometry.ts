/**
 * translateByDelta — pure coordinate shift for the geometry types Atlas
 * actually places (Point / LineString / Polygon). Used by Plan-stage drag
 * handlers to move records without inventing synthetic `center` fields.
 */
export function translateByDelta<
  G extends GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon,
>(geom: G, dLng: number, dLat: number): G {
  const shift = (c: number[]): [number, number] => [
    (c[0] ?? 0) + dLng,
    (c[1] ?? 0) + dLat,
  ];
  switch (geom.type) {
    case 'Point':
      return { ...geom, coordinates: shift(geom.coordinates) } as G;
    case 'LineString':
      return { ...geom, coordinates: geom.coordinates.map(shift) } as G;
    case 'Polygon':
      return {
        ...geom,
        coordinates: geom.coordinates.map((ring) => ring.map(shift)),
      } as G;
  }
}

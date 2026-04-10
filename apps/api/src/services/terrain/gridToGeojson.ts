/**
 * Grid-to-GeoJSON conversion utilities.
 *
 * Converts classified raster grids (Int8Array, Uint8Array, Float32Array)
 * into GeoJSON FeatureCollections for storage and frontend map rendering.
 * Uses a simplified cell-rectangle approach: each contiguous group of cells
 * with the same class becomes a polygon.
 */

type Bbox = [number, number, number, number];

interface ClassLabel {
  value: number;
  label: string;
  [key: string]: unknown;
}

interface GeoFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Polygon' | 'LineString' | 'Point';
    coordinates: unknown;
  };
}

interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

/**
 * Convert a classified grid to a GeoJSON FeatureCollection.
 * Each unique class value becomes one or more Polygon features.
 * Adjacent cells of the same class are merged into row-runs.
 */
export function classifiedGridToGeoJSON(
  grid: Int8Array | Uint8Array | Float32Array,
  width: number,
  height: number,
  bbox: Bbox,
  classLabels: ClassLabel[],
): GeoFeatureCollection {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const cellW = (maxLon - minLon) / width;
  const cellH = (maxLat - minLat) / height;

  const features: GeoFeature[] = [];

  for (const { value, label, ...props } of classLabels) {
    // Find row-runs of this class
    const runs: Array<{ row: number; colStart: number; colEnd: number }> = [];

    for (let row = 0; row < height; row++) {
      let runStart = -1;
      for (let col = 0; col <= width; col++) {
        const v = col < width ? grid[row * width + col] : undefined;
        if (v === value) {
          if (runStart < 0) runStart = col;
        } else {
          if (runStart >= 0) {
            runs.push({ row, colStart: runStart, colEnd: col - 1 });
            runStart = -1;
          }
        }
      }
    }

    if (runs.length === 0) continue;

    // Merge vertically adjacent runs with same column span
    const mergedPolygons: Array<{ rowStart: number; rowEnd: number; colStart: number; colEnd: number }> = [];

    for (const run of runs) {
      const prev = mergedPolygons.length > 0 ? mergedPolygons[mergedPolygons.length - 1]! : null;
      if (
        prev &&
        prev.colStart === run.colStart &&
        prev.colEnd === run.colEnd &&
        prev.rowEnd === run.row - 1
      ) {
        prev.rowEnd = run.row;
      } else {
        mergedPolygons.push({
          rowStart: run.row,
          rowEnd: run.row,
          colStart: run.colStart,
          colEnd: run.colEnd,
        });
      }
    }

    // Convert merged rectangles to GeoJSON polygons
    for (const rect of mergedPolygons) {
      const west = minLon + rect.colStart * cellW;
      const east = minLon + (rect.colEnd + 1) * cellW;
      const north = maxLat - rect.rowStart * cellH;
      const south = maxLat - (rect.rowEnd + 1) * cellH;

      features.push({
        type: 'Feature',
        properties: { class: label, classValue: value, ...props },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ]],
        },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

/**
 * Convert a binary mask (Uint8Array, 1=true, 0=false) to a GeoJSON
 * FeatureCollection with a single label for true cells.
 */
export function binaryMaskToGeoJSON(
  mask: Uint8Array,
  width: number,
  height: number,
  bbox: Bbox,
  trueLabel: string,
): GeoFeatureCollection {
  return classifiedGridToGeoJSON(
    mask,
    width, height, bbox,
    [{ value: 1, label: trueLabel }],
  );
}

/**
 * Convert flow paths (arrays of [lng, lat] coords) to a GeoJSON
 * FeatureCollection of LineStrings.
 */
export function flowPathsToGeoJSON(
  paths: Array<[number, number][]>,
): GeoFeatureCollection {
  const features: GeoFeature[] = paths.map((coords, i) => ({
    type: 'Feature',
    properties: { pathIndex: i, length: coords.length },
    geometry: {
      type: 'LineString',
      coordinates: coords,
    },
  }));

  return { type: 'FeatureCollection', features };
}

/**
 * Convert polygon rings to a GeoJSON FeatureCollection of Polygons.
 */
export function polygonRingsToGeoJSON(
  rings: Array<[number, number][]>,
): GeoFeatureCollection {
  const features: GeoFeature[] = rings.map((coords, i) => ({
    type: 'Feature',
    properties: { zoneIndex: i },
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  }));

  return { type: 'FeatureCollection', features };
}

/**
 * Convert a probability grid (0.0-1.0) to GeoJSON with severity bands.
 */
export function probabilityGridToGeoJSON(
  grid: Float32Array,
  width: number,
  height: number,
  bbox: Bbox,
): GeoFeatureCollection {
  const quantised = new Int8Array(width * height);
  for (let i = 0; i < grid.length; i++) {
    const v = grid[i]!;
    if (v <= 0) quantised[i] = 0;
    else if (v < 0.33) quantised[i] = 1;
    else if (v < 0.66) quantised[i] = 2;
    else quantised[i] = 3;
  }

  return classifiedGridToGeoJSON(
    quantised,
    width, height, bbox,
    [
      { value: 1, label: 'low_probability', severity: 'low' },
      { value: 2, label: 'medium_probability', severity: 'medium' },
      { value: 3, label: 'high_probability', severity: 'high' },
    ],
  );
}

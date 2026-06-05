/**
 * Orchard rows on contour — places candidate orchard tree rows along
 * elevation contour lines clipped to the parcel boundary.
 *
 * Each surviving (clipped, long-enough, gentle-enough) contour becomes a
 * single `path` feature with `subtype = 'farm_lane'` and `phaseTag =
 * 'orchard'`. Tree count is derived from row length / `treeSpacingM`.
 *
 * The algorithm is intentionally conservative: it does NOT offset extra
 * rows between contours (that requires inter-contour spacing inference
 * which is downstream work) — one contour, one row.
 */

import type { CreateDesignFeatureInput } from '@ogden/shared';
import type { ContourInput, ParcelInput } from '../DesignMapGenerator.js';
import {
  lineLengthM,
  pointInPolygon,
  type LineString,
  type LonLat,
  type Ring,
} from '../geometry.js';

export interface OrchardOnContourOptions {
  /** Spacing between trees along a contour row, metres. */
  treeSpacingM?: number;
  /** Drop clipped rows shorter than this, metres. */
  minRowLengthM?: number;
  /** Reject contours whose `meanSlopePct` exceeds this. */
  maxSlopePct?: number;
}

export interface OrchardOnContourInput {
  parcel: ParcelInput;
  contours: ContourInput[];
  options?: OrchardOnContourOptions;
}

export interface OrchardOnContourResult {
  features: CreateDesignFeatureInput[];
  rowCount: number;
  estimatedTreeCount: number;
  warnings: string[];
}

const DEFAULT_TREE_SPACING_M = 6;
const DEFAULT_MIN_ROW_LENGTH_M = 30;
const DEFAULT_MAX_SLOPE_PCT = 25;

/**
 * Walk a polyline and emit sub-polylines for the stretches whose vertices
 * fall inside the polygon. (Point-resolution clipping — good enough at
 * the typical contour-vertex density produced by the terrain pipeline.)
 */
function clipLineToRing(line: LineString, ring: Ring): LineString[] {
  if (line.length < 2) return [];
  const segments: LineString[] = [];
  let current: LonLat[] = [];
  for (const p of line) {
    if (pointInPolygon(p, ring)) {
      current.push([p[0], p[1]]);
    } else if (current.length >= 2) {
      segments.push(current);
      current = [];
    } else {
      current = [];
    }
  }
  if (current.length >= 2) segments.push(current);
  return segments;
}

export function generateOrchardOnContour(
  input: OrchardOnContourInput,
): OrchardOnContourResult {
  const warnings: string[] = [];
  const features: CreateDesignFeatureInput[] = [];

  const opts: Required<OrchardOnContourOptions> = {
    treeSpacingM: input.options?.treeSpacingM ?? DEFAULT_TREE_SPACING_M,
    minRowLengthM: input.options?.minRowLengthM ?? DEFAULT_MIN_ROW_LENGTH_M,
    maxSlopePct: input.options?.maxSlopePct ?? DEFAULT_MAX_SLOPE_PCT,
  };

  if (input.contours.length === 0) {
    warnings.push('no contours provided — no orchard rows generated');
    return { features, rowCount: 0, estimatedTreeCount: 0, warnings };
  }

  let rowCount = 0;
  let estimatedTreeCount = 0;

  for (const contour of input.contours) {
    if (contour.line.length < 2) continue;
    if (
      contour.meanSlopePct !== undefined &&
      contour.meanSlopePct > opts.maxSlopePct
    ) {
      continue;
    }

    const clipped = clipLineToRing(contour.line, input.parcel.boundary);
    for (const seg of clipped) {
      const len = lineLengthM(seg);
      if (len < opts.minRowLengthM) continue;
      const trees = Math.max(2, Math.floor(len / opts.treeSpacingM) + 1);
      rowCount += 1;
      estimatedTreeCount += trees;
      features.push({
        featureType: 'path',
        subtype: 'farm_lane',
        label: `Orchard Row ${rowCount}`,
        phaseTag: 'orchard',
        geometry: {
          type: 'LineString',
          coordinates: seg.map((p) => [p[0], p[1]]),
        },
        properties: {
          generator: 'orchardOnContour',
          rowIndex: rowCount,
          lengthM: Math.round(len * 10) / 10,
          treeSpacingM: opts.treeSpacingM,
          estimatedTrees: trees,
          ...(contour.elevationM !== undefined
            ? { elevationM: contour.elevationM }
            : {}),
        },
        sortOrder: 100 + rowCount,
      });
    }
  }

  if (rowCount === 0) {
    warnings.push('no orchard rows generated');
  }

  return { features, rowCount, estimatedTreeCount, warnings };
}

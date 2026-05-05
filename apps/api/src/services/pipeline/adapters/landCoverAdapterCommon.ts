/**
 * Shared helpers for the three new raster-sample land-cover adapters
 * (NlcdLandCoverAdapter, AciLandCoverAdapter, WorldCoverLandCoverAdapter).
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline. The adapters
 * differ only in (a) which RasterService they hold and (b) which
 * `LandCoverSource` enum value + native-code → canonical mapping they use.
 * Everything else — bbox extraction, histogram → percent conversion,
 * dominant class derivation, AdapterResult shaping — is shared here.
 */

import type {
  CanonicalLandCoverClass,
  LandCoverSource,
} from '@ogden/shared';
import {
  CANONICAL_LAND_COVER_META,
  LAND_COVER_LICENCE,
  toCanonicalLandCoverClass,
} from '@ogden/shared';
import type {
  AdapterResult,
  ProjectContext,
} from '../DataPipelineOrchestrator.js';
import type { LayerType } from '@ogden/shared';
import type {
  ClassHistogram,
  ParcelBbox4326,
} from '../../landcover/LandCoverRasterServiceBase.js';
import { AppError } from '../../../lib/errors.js';

/** Parcel bbox in WGS84. Extracted from boundary GeoJSON or context centroid. */
export function extractParcelBbox(
  context: ProjectContext,
  boundary: unknown,
  fallbackHalfDeg = 0.005,  // ~550m at mid-latitudes — small but enough to hit pixels
): ParcelBbox4326 {
  const geo = boundary as
    | { type?: string; coordinates?: number[][][] | number[][][][] }
    | null;
  if (geo?.coordinates) {
    const allCoords: number[][] =
      geo.type === 'MultiPolygon'
        ? (geo.coordinates as number[][][][]).flat(2)
        : (geo.coordinates as number[][][]).flat();
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of allCoords) {
      if (lng! < minLng) minLng = lng!;
      if (lng! > maxLng) maxLng = lng!;
      if (lat! < minLat) minLat = lat!;
      if (lat! > maxLat) maxLat = lat!;
    }
    if (Number.isFinite(minLng) && Number.isFinite(minLat)) {
      return { minLng, minLat, maxLng, maxLat };
    }
  }
  // Fall back to centroid-based bbox
  if (context.centroidLat != null && context.centroidLng != null) {
    return {
      minLng: context.centroidLng - fallbackHalfDeg,
      minLat: context.centroidLat - fallbackHalfDeg,
      maxLng: context.centroidLng + fallbackHalfDeg,
      maxLat: context.centroidLat + fallbackHalfDeg,
    };
  }
  throw new AppError(
    'ADAPTER_INVALID_INPUT',
    'No centroid and no valid GeoJSON boundary',
    400,
  );
}

export interface BuildSummaryArgs {
  histogram: ClassHistogram;
  source: LandCoverSource;
  layerType: LayerType;
  /** Vintage label override (defaults to histogram.vintage). */
  vintage?: number;
  /** Source API string e.g. 'USGS NLCD 2021 (self-hosted)'. */
  sourceApi: string;
  /** Attribution text from manifest. */
  attribution: string;
}

/**
 * Convert a per-native-class pixel histogram into the AdapterResult that the
 * pipeline writes to project_layers.summary_data. Per ADR D1, this is the
 * v1 raster-sample shape — `samplingMethod: 'raster'` distinguishes it from
 * any future vector-ingest adapter on the same source.
 */
export function buildLandCoverResult(args: BuildSummaryArgs): AdapterResult {
  const { histogram, source, layerType, sourceApi, attribution } = args;
  const vintage = args.vintage ?? histogram.vintage;

  // Canonical histogram: native code → canonical class name → cumulative pixels.
  const canonical: Partial<Record<CanonicalLandCoverClass, number>> = {};
  let validPixels = 0;
  for (const [codeStr, count] of Object.entries(histogram.counts)) {
    const code = Number(codeStr);
    const klass = toCanonicalLandCoverClass(source, code);
    canonical[klass] = (canonical[klass] ?? 0) + count;
    validPixels += count;
  }

  const classes: Partial<Record<CanonicalLandCoverClass, number>> = {};
  let dominant: CanonicalLandCoverClass | null = null;
  let dominantCount = 0;
  for (const [klass, count] of Object.entries(canonical) as Array<[CanonicalLandCoverClass, number]>) {
    const pct = validPixels > 0 ? (count / validPixels) * 100 : 0;
    classes[klass] = Math.round(pct * 10) / 10;
    if (count > dominantCount) {
      dominantCount = count;
      dominant = klass;
    }
  }

  // Confidence ladder:
  //  - high  if >= 90% of sampled pixels are valid (not NoData) and total
  //          pixel count is >= 100 (parcel covers a meaningful area).
  //  - medium otherwise (small parcel, partial NoData).
  //  - low   if all pixels are NoData / unknown.
  const validRatio = histogram.totalPixels > 0
    ? validPixels / histogram.totalPixels
    : 0;
  const confidence: 'high' | 'medium' | 'low' =
    validPixels === 0
      ? 'low'
      : validRatio >= 0.9 && histogram.totalPixels >= 100
        ? 'high'
        : 'medium';

  // Sources list — single entry for raster-sample adapters; multi-entry
  // is reserved for future vector-merge consumers.
  const dataSources = [{
    source,
    vintage,
    licence_short: LAND_COVER_LICENCE[source],
    samplingMethod: 'raster' as const,
  }];

  return {
    layerType,
    sourceApi,
    attributionText: attribution,
    confidence,
    dataDate: vintage ? `${vintage}-01-01` : null,
    summaryData: {
      classes,
      dominantClass: dominant,
      vintage,
      licence_short: LAND_COVER_LICENCE[source],
      pixelCount: histogram.totalPixels,
      validPixelCount: validPixels,
      nodataPixelCount: histogram.nodataCount,
      samplingMethod: 'raster' as const,
      dataSources,
      // Pass through canonical-class metadata so EcologicalDashboard can
      // colour by supportive/limiting without re-deriving it.
      classMeta: dominant ? CANONICAL_LAND_COVER_META[dominant] : null,
    },
  };
}

/**
 * Service-unavailable AdapterResult shape — used when the manifest hasn't
 * loaded (operator hasn't run landcover-tile-ingest yet) or the parcel falls
 * outside the tile extent.
 */
export function buildUnavailableResult(args: {
  source: LandCoverSource;
  layerType: LayerType;
  sourceApi: string;
  attribution: string;
  reason: string;
}): AdapterResult {
  return {
    layerType: args.layerType,
    sourceApi: args.sourceApi,
    attributionText: args.attribution,
    confidence: 'low',
    dataDate: null,
    summaryData: {
      classes: {},
      dominantClass: null,
      vintage: null,
      licence_short: LAND_COVER_LICENCE[args.source],
      pixelCount: 0,
      validPixelCount: 0,
      nodataPixelCount: 0,
      samplingMethod: 'raster' as const,
      dataSources: [],
      heuristic_note: args.reason,
    },
  };
}

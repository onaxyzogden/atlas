/**
 * OhnAdapter — Fetches watershed data from the Ontario Hydro Network (OHN)
 * via the LIO ArcGIS REST service (layer 26, watercourse features).
 *
 * API: https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open01/MapServer/26
 *
 * Uses a ~1 km envelope around the centroid to find nearby watercourse features.
 * Returns the nearest stream name, stream order, and distance from boundary.
 *
 * Falls back to a regional estimate when outside Ontario LIO coverage.
 *
 * Sixth live adapter in the pipeline.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js'; // used in queryOhn for structured error types

const logger = pino({ name: 'OhnAdapter' });

const OHN_URL =
  'https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open01/MapServer/26/query';
const OHN_TIMEOUT_MS = 15_000;

// Buffer ~1 km at Ontario latitudes (1° ≈ 111 km → 0.009° ≈ 1 km)
const OHN_BBOX_BUFFER = 0.009;

// ─── Types ────────────────────────────────────────────────────────────────────

interface OhnResponse {
  features?: Array<{
    attributes: Record<string, unknown>;
    geometry?: { paths?: number[][][] };
  }>;
  error?: { message?: string; code?: number };
}

interface WatershedSummary {
  huc_code: string;
  watershed_name: string;
  nearest_stream_m: number | string;
  stream_order: number | string;
  catchment_area_ha: string;
  flow_direction: string;
  feature_count: number;
  data_date: string;
  source_api: 'Ontario Hydro Network (LIO)';
  confidence: 'high' | 'medium' | 'low';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCentroid(context: ProjectContext): { lat: number; lng: number } {
  if (context.centroidLat != null && context.centroidLng != null) {
    return { lat: context.centroidLat, lng: context.centroidLng };
  }

  const geo = context.boundaryGeojson as { type?: string; coordinates?: number[][][] | number[][][][] } | null;
  if (!geo?.coordinates) {
    throw new AppError('ADAPTER_INVALID_INPUT', 'No centroid and no valid GeoJSON boundary', 400);
  }

  const allCoords: number[][] =
    geo.type === 'MultiPolygon'
      ? (geo.coordinates as number[][][][]).flat(2)
      : (geo.coordinates as number[][][]).flat();

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lng, lat] of allCoords) {
    if (lat! < minLat) minLat = lat!;
    if (lat! > maxLat) maxLat = lat!;
    if (lng! < minLng) minLng = lng!;
    if (lng! > maxLng) maxLng = lng!;
  }
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

/**
 * Find the closest watercourse vertex to the query point.
 * Returns { attrs, distanceM } for the closest feature.
 */
function findClosestFeature(
  features: NonNullable<OhnResponse['features']>,
  lat: number,
  lng: number,
): { attrs: Record<string, unknown>; distanceM: number } {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let minDistM = Infinity;
  let closestAttrs: Record<string, unknown> = {};

  for (const feature of features) {
    const paths = feature.geometry?.paths ?? [];
    for (const path of paths) {
      for (const vertex of path) {
        const dy = ((vertex[1] ?? 0) - lat) * 111_000;
        const dx = ((vertex[0] ?? 0) - lng) * 111_000 * cosLat;
        const dist = Math.hypot(dx, dy);
        if (dist < minDistM) {
          minDistM = dist;
          closestAttrs = feature.attributes;
        }
      }
    }
  }

  return { attrs: closestAttrs, distanceM: Math.round(minDistM) };
}

/**
 * Rough stream order estimate from feature density in search bbox.
 */
function estimateStreamOrder(featureCount: number): number {
  if (featureCount > 5) return 1;
  if (featureCount > 2) return 2;
  return 3;
}

async function queryOhn(lat: number, lng: number): Promise<OhnResponse> {
  const buf = OHN_BBOX_BUFFER;
  const envelope = JSON.stringify({
    xmin: lng - buf,
    ymin: lat - buf,
    xmax: lng + buf,
    ymax: lat + buf,
    spatialReference: { wkid: 4326 },
  });

  const params = new URLSearchParams({
    geometry: envelope,
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: 'true',
    f: 'json',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OHN_TIMEOUT_MS);

  try {
    const response = await fetch(`${OHN_URL}?${params}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AppError(
        'ADAPTER_HTTP_ERROR',
        `OHN ArcGIS returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        502,
      );
    }

    const json = await response.json().catch(() => {
      throw new AppError('ADAPTER_PARSE_ERROR', 'OHN ArcGIS returned invalid JSON', 502);
    });

    return json as OhnResponse;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('ADAPTER_TIMEOUT', 'OHN ArcGIS request timed out', 504);
    }
    throw new AppError('ADAPTER_NETWORK', `OHN ArcGIS request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

function buildEstimate(lat: number, lng: number): WatershedSummary {
  const isGreatLakes = lat > 41 && lat < 47 && lng > -84 && lng < -75;
  const name = isGreatLakes ? 'Lake Ontario Basin' : 'St. Lawrence Basin';
  return {
    huc_code: 'N/A',
    watershed_name: name,
    nearest_stream_m: 'Estimated',
    stream_order: 2,
    catchment_area_ha: 'N/A',
    flow_direction: lng < -79 ? 'E to S' : 'SE to NW',
    feature_count: 0,
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: 'Ontario Hydro Network (LIO)',
    confidence: 'low',
  };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class OhnAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid({ ...context, boundaryGeojson: boundary });
    logger.info({ lat, lng }, 'Fetching Ontario Hydro Network watershed data');

    let summary: WatershedSummary;

    try {
      const response = await queryOhn(lat, lng);

      if (response.error) {
        logger.warn({ error: response.error.message }, 'OHN returned error response');
        summary = buildEstimate(lat, lng);
      } else if (!response.features || response.features.length === 0) {
        logger.warn({ lat, lng }, 'No OHN watercourse features found — outside Ontario coverage');
        summary = buildEstimate(lat, lng);
      } else {
        const { attrs, distanceM } = findClosestFeature(response.features, lat, lng);

        // Field name fallback chains — LIO field names vary between service versions
        const watercourseNameRaw =
          attrs['OFFICIAL_NAME'] ??
          attrs['NAME_EN'] ??
          attrs['WATERCOURSE_NAME'] ??
          attrs['FEAT_NAME'] ??
          'Unnamed watercourse';

        const streamOrderRaw =
          attrs['STREAM_ORDER'] ??
          attrs['STRAHLER_ORDER'] ??
          attrs['ORDER_'] ??
          attrs['STRAHLER'] ??
          null;

        const streamOrder = streamOrderRaw != null
          ? parseInt(String(streamOrderRaw), 10) || estimateStreamOrder(response.features.length)
          : estimateStreamOrder(response.features.length);

        // Confidence: high if nearest stream < 1 km, medium otherwise
        const confidence: 'high' | 'medium' | 'low' =
          distanceM < 1000 ? 'high' : 'medium';

        summary = {
          huc_code: 'N/A',
          watershed_name: String(watercourseNameRaw),
          nearest_stream_m: distanceM,
          stream_order: streamOrder,
          catchment_area_ha: 'N/A',
          flow_direction: lng < -79 ? 'E to S' : 'SE to NW',
          feature_count: response.features.length,
          data_date: new Date().toISOString().split('T')[0]!,
          source_api: 'Ontario Hydro Network (LIO)',
          confidence,
        };
      }
    } catch (err) {
      // OHN is a best-effort CA data source — any failure (timeout, network, HTTP)
      // falls back to a regional estimate rather than blocking the pipeline.
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ error: message }, 'OHN query failed, falling back to estimation');
      summary = buildEstimate(lat, lng);
    }

    logger.info(
      {
        watershedName: summary.watershed_name,
        nearestStream: summary.nearest_stream_m,
        confidence: summary.confidence,
      },
      'OHN fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: summary.source_api,
      attributionText: this.getAttributionText(),
      confidence: summary.confidence,
      dataDate: summary.data_date,
      summaryData: summary,
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'Ontario Ministry of Natural Resources and Forestry, Ontario Hydro Network (OHN) via Land Information Ontario (LIO)';
  }
}

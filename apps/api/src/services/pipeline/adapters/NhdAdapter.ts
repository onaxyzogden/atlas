/**
 * NhdAdapter — Fetches watershed data from the USGS Watershed Boundary Dataset (WBD)
 * ArcGIS REST service for a project boundary centroid.
 *
 * API: https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer
 *
 * Queries three HUC levels in parallel:
 *   Layer 4 — HUC8  (subbasin, ~700–6,000 km²)
 *   Layer 5 — HUC10 (watershed, ~40–1,000 km²)
 *   Layer 6 — HUC12 (subwatershed, ~4–160 km²)
 *
 * Returns the full HUC hierarchy, watershed names, area, and downstream state list.
 *
 * Fifth live adapter in the pipeline.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'NhdAdapter' });

const WBD_BASE = 'https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer';
const WBD_TIMEOUT_MS = 15_000;

// WBD MapServer layer indices for each HUC level
const WBD_LAYERS = {
  huc8: 4,
  huc10: 5,
  huc12: 6,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface WbdResponse {
  features?: Array<{
    attributes: Record<string, unknown>;
  }>;
  error?: { message?: string; code?: number };
}

interface WatershedSummary {
  // HUC hierarchy
  huc8: string | null;
  huc8_name: string | null;
  huc10: string | null;
  huc10_name: string | null;
  huc12: string | null;
  huc12_name: string | null;
  states: string | null;

  // Best available HUC (most specific found)
  huc_code: string | null;
  watershed_name: string | null;

  // Hydrology context
  drainage_area_ha: number | null;
  flow_direction: string;

  // Source
  data_date: string;
  source_api: 'USGS WBD (NHD Plus)';
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
 * Derive cardinal flow direction from longitude (rough rule for CONUS).
 * Actual flow direction comes from Tier 3 watershed analysis.
 */
function deriveFlowDirection(lng: number, lat: number): string {
  // Continental divide at ~105°W; east of it drains E/SE/S
  if (lng > -105) return lat > 40 ? 'SE' : 'S';
  return lat > 45 ? 'E' : 'SW';
}

async function queryWbdLayer(
  layerIndex: number,
  lat: number,
  lng: number,
  outFields: string,
): Promise<WbdResponse> {
  const params = new URLSearchParams({
    where: '1=1',
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields,
    returnGeometry: 'false',
    f: 'json',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WBD_TIMEOUT_MS);

  try {
    const response = await fetch(`${WBD_BASE}/${layerIndex}/query?${params}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AppError(
        'ADAPTER_HTTP_ERROR',
        `WBD layer ${layerIndex} returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        502,
      );
    }

    const json = await response.json().catch(() => {
      throw new AppError('ADAPTER_PARSE_ERROR', `WBD layer ${layerIndex} returned invalid JSON`, 502);
    });

    return json as WbdResponse;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('ADAPTER_TIMEOUT', 'USGS WBD request timed out', 504);
    }
    throw new AppError('ADAPTER_NETWORK', `USGS WBD request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

function extractHucFields(
  attrs: Record<string, unknown>,
  hucField: string,
): { code: string | null; name: string | null } {
  // Field names vary slightly between WBD service versions
  const code =
    (attrs[hucField] ?? attrs[hucField.toLowerCase()] ?? attrs[hucField.toUpperCase()] ?? null) as string | null;
  const name =
    (attrs['name'] ?? attrs['NAME'] ?? attrs['huc_name'] ?? null) as string | null;
  return { code: code ? String(code) : null, name: name ? String(name) : null };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class NhdAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid({ ...context, boundaryGeojson: boundary });
    logger.info({ lat, lng }, 'Fetching USGS WBD watershed data');

    // Query all three HUC levels in parallel
    const [huc8Result, huc10Result, huc12Result] = await Promise.allSettled([
      queryWbdLayer(WBD_LAYERS.huc8, lat, lng, 'HUC8,NAME,STATES,AREASQKM'),
      queryWbdLayer(WBD_LAYERS.huc10, lat, lng, 'HUC10,NAME,STATES,AREASQKM'),
      queryWbdLayer(WBD_LAYERS.huc12, lat, lng, 'HUC12,NAME,STATES,AREASQKM'),
    ]);

    // Extract attributes — tolerate partial failures
    const huc8Attrs = huc8Result.status === 'fulfilled'
      ? huc8Result.value.features?.[0]?.attributes ?? null
      : null;
    const huc10Attrs = huc10Result.status === 'fulfilled'
      ? huc10Result.value.features?.[0]?.attributes ?? null
      : null;
    const huc12Attrs = huc12Result.status === 'fulfilled'
      ? huc12Result.value.features?.[0]?.attributes ?? null
      : null;

    if (!huc8Attrs && !huc10Attrs && !huc12Attrs) {
      logger.warn({ lat, lng }, 'No WBD features found — point outside CONUS coverage');
      return this.buildUnavailableResult();
    }

    const huc8 = huc8Attrs ? extractHucFields(huc8Attrs, 'HUC8') : { code: null, name: null };
    const huc10 = huc10Attrs ? extractHucFields(huc10Attrs, 'HUC10') : { code: null, name: null };
    const huc12 = huc12Attrs ? extractHucFields(huc12Attrs, 'HUC12') : { code: null, name: null };

    const states = (huc12Attrs?.['states'] ?? huc12Attrs?.['STATES'] ??
      huc10Attrs?.['states'] ?? huc10Attrs?.['STATES'] ??
      huc8Attrs?.['states'] ?? huc8Attrs?.['STATES'] ?? null) as string | null;

    // Area in ha from best available HUC level (areasqkm * 100)
    const areaSqKm = huc12Attrs
      ? parseFloat(String(huc12Attrs['areasqkm'] ?? huc12Attrs['AREASQKM'] ?? '0'))
      : null;
    const drainageAreaHa = areaSqKm != null && !isNaN(areaSqKm) ? Math.round(areaSqKm * 100) : null;

    // Most specific HUC available
    const bestHuc = huc12.code ?? huc10.code ?? huc8.code ?? null;
    const bestName = huc12.name ?? huc10.name ?? huc8.name ?? null;

    // Confidence: high if HUC12 found, medium if HUC10/8 only
    const confidence: 'high' | 'medium' | 'low' =
      huc12.code ? 'high' : huc10.code || huc8.code ? 'medium' : 'low';

    const summary: WatershedSummary = {
      huc8: huc8.code,
      huc8_name: huc8.name,
      huc10: huc10.code,
      huc10_name: huc10.name,
      huc12: huc12.code,
      huc12_name: huc12.name,
      states,
      huc_code: bestHuc,
      watershed_name: bestName,
      drainage_area_ha: drainageAreaHa,
      flow_direction: deriveFlowDirection(lng, lat),
      data_date: new Date().toISOString().split('T')[0]!,
      source_api: 'USGS WBD (NHD Plus)',
      confidence,
    };

    logger.info(
      { huc12: huc12.code, huc12Name: huc12.name, confidence },
      'USGS WBD fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: 'USGS WBD (NHD Plus)',
      attributionText: this.getAttributionText(),
      confidence,
      dataDate: summary.data_date,
      summaryData: summary,
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'U.S. Geological Survey, Watershed Boundary Dataset (WBD) / National Hydrography Dataset Plus (NHD Plus)';
  }

  private buildUnavailableResult(): AdapterResult {
    return {
      layerType: this.layerType,
      sourceApi: 'USGS WBD (NHD Plus)',
      attributionText: this.getAttributionText(),
      confidence: 'low',
      dataDate: null,
      summaryData: {
        unavailable: true,
        reason: 'outside_nhd_coverage',
        huc8: null,
        huc8_name: null,
        huc10: null,
        huc10_name: null,
        huc12: null,
        huc12_name: null,
        states: null,
        huc_code: null,
        watershed_name: null,
        drainage_area_ha: null,
        flow_direction: 'Unknown',
        data_date: new Date().toISOString().split('T')[0]!,
        source_api: 'USGS WBD (NHD Plus)',
        confidence: 'low' as const,
      },
    };
  }
}

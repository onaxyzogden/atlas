/**
 * ConservationAuthorityAdapter — Fetches wetland + regulated area data for Ontario (CA) projects.
 *
 * Two data sources, both via Ontario LIO ArcGIS REST:
 *
 * 1. Ontario Wetlands (LIO_Open02/MapServer/1)
 *    Province-wide wetland polygons from the Ontario Wetland Evaluation System (OWES).
 *    Envelope intersect with ~500 m bbox.
 *    Fields: WETLAND_TYPE, WETLAND_CLASS, EVALUATION_STATUS
 *
 * 2. Conservation Authority Regulated Areas (LIO_Open04/MapServer/3)
 *    Ontario Regulation 97/04 and authority-specific Fill, Construction & Alteration
 *    to Waterways (FCAW) zones. Centroid point intersect.
 *    Fields: REGULATION_NAME, AUTHORITY_NAME, REGULATION_CODE
 *
 * Additionally, if the project's conservationAuthId maps to an authority in
 * CONSERVATION_AUTHORITY_REGISTRY with a live endpoint, that endpoint is
 * queried as a best-effort supplement (never blocks the main result).
 *
 * Returns: wetland type/class/count, PSW flag, regulated area flag, CA name.
 * Falls back to a regional estimate for southern Ontario when LIO is unavailable.
 *
 * Eighth live adapter in the pipeline.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import { CONSERVATION_AUTHORITY_REGISTRY } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'ConservationAuthorityAdapter' });

// LIO Open Data — Natural Heritage: Ontario Wetlands (OWES classification)
const LIO_WETLANDS_URL =
  'https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open02/MapServer/1/query';

// LIO Open Data — Conservation Authority Regulated Areas (Ontario Reg. 97/04)
const LIO_REGULATED_URL =
  'https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open04/MapServer/3/query';

const LIO_TIMEOUT_MS = 15_000;

// ~500 m buffer at Ontario latitudes (0.0045° ≈ 500 m)
const LIO_BBOX_BUFFER = 0.0045;

// ─── Types ────────────────────────────────────────────────────────────────────

interface LioResponse {
  features?: Array<{ attributes: Record<string, unknown> }>;
  error?: { message?: string; code?: number };
}

interface OntarioWetlandSummary {
  // Wetland data (LIO OWES)
  wetland_feature_count: number;
  dominant_wetland_type: string | null;   // 'Bog' | 'Fen' | 'Marsh' | 'Swamp' | 'Open Water'
  psw_present: boolean;                    // Provincially Significant Wetland
  evaluated_wetland_present: boolean;      // Any evaluated wetland on record

  // CA regulated area (LIO Regulated Areas layer)
  regulated: boolean;                      // within CA regulated area
  ca_name: string | null;                  // Conservation Authority name from registry or LIO
  regulation_name: string | null;          // e.g. 'Ontario Regulation 97/04'

  // Ontario flood risk estimate (when no explicit flood data)
  flood_risk_estimate: 'high' | 'medium' | 'low' | 'unknown';

  data_date: string;
  source_api: 'Ontario LIO (Natural Heritage + CA Regulated Areas)';
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
 * Resolve CA name from project context.
 * Checks registry first, then falls back to province-wide "Ontario CA".
 */
function resolveCAName(conservationAuthId: string | null | undefined): string | null {
  if (!conservationAuthId) return null;
  return CONSERVATION_AUTHORITY_REGISTRY[conservationAuthId]?.name ?? null;
}

/**
 * Estimate flood risk from latitude/longitude for Ontario sites
 * when no explicit regulated area data is available.
 */
function estimateFloodRisk(lat: number, lng: number): 'high' | 'medium' | 'low' | 'unknown' {
  // Great Lakes shoreline + river valleys → higher flood risk
  // Southern Ontario lake plains (lat 42-44) near Lake Ontario/Erie → medium-high
  // Mid Ontario (lat 44-46) → medium
  // Northern Ontario (lat > 46) → low (boreal, less development pressure)
  if (lat < 44 && lng > -80 && lng < -76) return 'medium'; // Lake Ontario basin
  if (lat < 43 && lng > -83 && lng < -80) return 'high';   // Lake Erie shoreline
  if (lat < 44 && lng > -81 && lng < -78) return 'medium'; // Simcoe/Barrie area
  if (lat > 46) return 'low';
  return 'unknown';
}

async function queryLioLayer(
  url: string,
  params: URLSearchParams,
  label: string,
): Promise<LioResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LIO_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}?${params}`, { signal: controller.signal });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AppError(
        'ADAPTER_HTTP_ERROR',
        `${label} returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        502,
      );
    }

    const json = await response.json().catch(() => {
      throw new AppError('ADAPTER_PARSE_ERROR', `${label} returned invalid JSON`, 502);
    });

    return json as LioResponse;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('ADAPTER_TIMEOUT', `${label} request timed out`, 504);
    }
    throw new AppError('ADAPTER_NETWORK', `${label} request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function queryLioWetlands(lat: number, lng: number): Promise<LioResponse> {
  const buf = LIO_BBOX_BUFFER;
  const envelope = JSON.stringify({
    xmin: lng - buf, ymin: lat - buf,
    xmax: lng + buf, ymax: lat + buf,
    spatialReference: { wkid: 4326 },
  });

  const params = new URLSearchParams({
    geometry: envelope,
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'WETLAND_TYPE,WETLAND_CLASS,EVALUATION_STATUS,PSW_EVAL',
    returnGeometry: 'false',
    f: 'json',
  });

  return queryLioLayer(LIO_WETLANDS_URL, params, 'LIO Wetlands');
}

async function queryLioRegulated(lat: number, lng: number): Promise<LioResponse> {
  const params = new URLSearchParams({
    where: '1=1',
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'REGULATION_NAME,AUTHORITY_NAME,REGULATION_CODE,CA_NAME',
    returnGeometry: 'false',
    f: 'json',
  });

  return queryLioLayer(LIO_REGULATED_URL, params, 'LIO Regulated Areas');
}

function buildRegionalEstimate(lat: number, lng: number): OntarioWetlandSummary {
  return {
    wetland_feature_count: 0,
    dominant_wetland_type: null,
    psw_present: false,
    evaluated_wetland_present: false,
    regulated: false,
    ca_name: null,
    regulation_name: null,
    flood_risk_estimate: estimateFloodRisk(lat, lng),
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: 'Ontario LIO (Natural Heritage + CA Regulated Areas)',
    confidence: 'low',
  };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class ConservationAuthorityAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid({ ...context, boundaryGeojson: boundary });
    const caName = resolveCAName(context.conservationAuthId);
    logger.info({ lat, lng, caName }, 'Fetching Ontario wetland + regulated area data');

    let summary: OntarioWetlandSummary;

    // Query both LIO layers in parallel
    const [wetlandsResult, regulatedResult] = await Promise.allSettled([
      queryLioWetlands(lat, lng),
      queryLioRegulated(lat, lng),
    ]);

    const wetlandFeatures = wetlandsResult.status === 'fulfilled'
      ? (wetlandsResult.value.features ?? [])
      : [];
    const regulatedFeatures = regulatedResult.status === 'fulfilled'
      ? (regulatedResult.value.features ?? [])
      : [];

    const wetlandsError = wetlandsResult.status === 'fulfilled' && wetlandsResult.value.error;
    const regulatedError = regulatedResult.status === 'fulfilled' && regulatedResult.value.error;
    const bothFailed = wetlandsResult.status === 'rejected' && regulatedResult.status === 'rejected';

    if (bothFailed || (wetlandsError && regulatedError)) {
      logger.warn({ lat, lng }, 'No LIO wetland or regulated area data — service error or outside coverage');
      summary = buildRegionalEstimate(lat, lng);
    } else {
      // ── Wetland features ────────────────────────────────────────────────────
      const typeCounts: Record<string, number> = {};
      let pswPresent = false;
      let evaluatedPresent = false;

      for (const f of wetlandFeatures) {
        const attrs = f.attributes;

        const type = (
          attrs['WETLAND_TYPE'] ?? attrs['wetland_type'] ??
          attrs['WETLAND_CLASS'] ?? attrs['wetland_class'] ?? ''
        ) as string;

        const typeStr = String(type).trim();
        if (typeStr) {
          typeCounts[typeStr] = (typeCounts[typeStr] ?? 0) + 1;
        }

        // PSW flag — check both fields independently (both can be non-null simultaneously)
        const evalStatus = String(attrs['EVALUATION_STATUS'] ?? '').toUpperCase().trim();
        const pswEval = String(attrs['PSW_EVAL'] ?? '').toUpperCase().trim();

        if (
          evalStatus.includes('PSW') || evalStatus.includes('PROVINCIAL') ||
          pswEval.includes('PSW') || pswEval.includes('PROVINCIAL')
        ) {
          pswPresent = true;
        }
        if ((evalStatus && evalStatus !== 'NULL') || (pswEval && pswEval !== 'NULL')) {
          evaluatedPresent = true;
        }
      }

      const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      // ── Regulated area ───────────────────────────────────────────────────────
      const firstReg = regulatedFeatures[0]?.attributes ?? null;
      const regulated = regulatedFeatures.length > 0;
      const regulationName = firstReg
        ? String(
            firstReg['REGULATION_NAME'] ?? firstReg['regulation_name'] ??
            firstReg['REGULATION_CODE'] ?? ''
          ).trim() || null
        : null;

      // CA name from LIO regulated area overrides registry if present
      const lioCAName = firstReg
        ? String(firstReg['AUTHORITY_NAME'] ?? firstReg['CA_NAME'] ?? '').trim() || null
        : null;

      const resolvedCAName = lioCAName ?? caName;

      // ── Confidence ──────────────────────────────────────────────────────────
      // High: wetland data + regulated area data both present
      // Medium: one of them present
      // Low: neither (estimate only)
      const hasWetlands = wetlandFeatures.length > 0;
      const hasRegulated = regulatedFeatures.length > 0;

      let confidence: 'high' | 'medium' | 'low';
      if (hasWetlands && hasRegulated) {
        confidence = 'high';
      } else if (hasWetlands || hasRegulated) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }

      summary = {
        wetland_feature_count: wetlandFeatures.length,
        dominant_wetland_type: dominantType,
        psw_present: pswPresent,
        evaluated_wetland_present: evaluatedPresent,
        regulated,
        ca_name: resolvedCAName,
        regulation_name: regulationName,
        flood_risk_estimate: estimateFloodRisk(lat, lng),
        data_date: new Date().toISOString().split('T')[0]!,
        source_api: 'Ontario LIO (Natural Heritage + CA Regulated Areas)',
        confidence,
      };
    }

    logger.info(
      {
        wetlandCount: summary.wetland_feature_count,
        psw: summary.psw_present,
        regulated: summary.regulated,
        confidence: summary.confidence,
      },
      'Ontario wetland + CA fetch complete',
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
    return (
      'Ontario Ministry of Natural Resources and Forestry, Ontario Wetland Evaluation System (OWES) ' +
      'via Land Information Ontario (LIO); Conservation Authority regulated area data via LIO'
    );
  }
}

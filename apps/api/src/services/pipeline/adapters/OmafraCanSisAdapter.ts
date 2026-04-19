/**
 * OmafraCanSisAdapter — Fetches soil data from the Ontario Land Information
 * Office (LIO) ArcGIS REST service (Ontario Soil Survey Complex, layer 9).
 *
 * API: https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open05/MapServer/9
 *
 * Returns soil properties (texture, drainage, pH, organic matter, farmland class,
 * taxonomic order, depth to bedrock) for the project boundary centroid.
 *
 * Falls back to latitude-estimated defaults when outside Ontario LIO coverage.
 *
 * Fourth live adapter in the pipeline.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'OmafraCanSisAdapter' });

const LIO_BASE_URL =
  'https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open05/MapServer/9/query';
const LIO_TIMEOUT_MS = 15_000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface LioResponse {
  features?: Array<{
    attributes: Record<string, unknown>;
  }>;
  error?: { message?: string };
}

interface CanadaSoilSummary {
  soil_name: string;
  predominant_texture: string;
  texture_class: string;
  drainage_class: string;
  organic_matter_pct: number;
  ph: number;
  ph_range: string;
  hydrologic_group: string;
  farmland_class: string;
  depth_to_bedrock_m: number | string;
  taxonomic_order: string;
  data_date: string;
  source_api: string;
  confidence: 'high' | 'medium' | 'low';

  // Tier 3 compatibility aliases (camelCase)
  drainageClass: string;
  organicMatterPct: number;
  textureClass: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract centroid lat/lng from GeoJSON boundary.
 * Uses simple bbox centroid (good enough for spatial query buffer).
 */
function extractCentroid(boundary: unknown, context: ProjectContext): { lat: number; lng: number } {
  // Prefer pre-computed centroid from project context
  if (context.centroidLat != null && context.centroidLng != null) {
    return { lat: context.centroidLat, lng: context.centroidLng };
  }

  // Fall back to bbox centroid
  const geo = boundary as { type: string; coordinates: number[][][] | number[][][][] };
  if (!geo?.coordinates) {
    throw new AppError('ADAPTER_INVALID_INPUT', 'Invalid GeoJSON boundary', 400);
  }

  const allCoords: number[][] =
    geo.type === 'MultiPolygon'
      ? (geo.coordinates as number[][][][]).flat(2)
      : (geo.coordinates as number[][][]).flat();

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  for (const [lng, lat] of allCoords) {
    if (lat! < minLat) minLat = lat!;
    if (lat! > maxLat) maxLat = lat!;
    if (lng! < minLng) minLng = lng!;
    if (lng! > maxLng) maxLng = lng!;
  }

  return {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
  };
}

/**
 * Normalize LIO texture field to a standard texture name.
 */
function normalizeTexture(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes('clay loam')) return 'Clay loam';
  if (t.includes('silty clay')) return 'Silty clay';
  if (t.includes('clay')) return 'Clay';
  if (t.includes('sandy loam') || t === 'sl') return 'Sandy loam';
  if (t.includes('silt loam') || t === 'sil') return 'Silt loam';
  if (t.includes('loamy sand') || t === 'ls') return 'Loamy sand';
  if (t.includes('loam')) return 'Loam';
  if (t.includes('sand')) return 'Sand';
  return raw;
}

/**
 * Derive USDA-style texture class slug from normalized texture name.
 */
function textureToClass(texture: string): string {
  return texture.toLowerCase().replace(/ /g, '_');
}

/**
 * Map texture + drainage to NRCS hydrologic soil group.
 */
function deriveHydrologicGroup(texture: string, drainage: string): string {
  const t = texture.toLowerCase();
  const d = drainage.toLowerCase();
  if (t.includes('clay')) return 'D';
  if (d.includes('poor') || d.includes('very poor')) return 'C';
  if (t.includes('sandy')) return 'A';
  return 'B';
}

/**
 * Format Canada Land Inventory / CSCS farmland class.
 */
function formatFarmlandClass(raw: string): string {
  const n = raw.trim().replace(/^class\s*/i, '').replace(/^c\s*/i, '');
  return `Class ${n} (CSCS)`;
}

/**
 * Map drainage description to Tier 3 compatibility value.
 */
function mapDrainageToTier3(drainageClass: string): string {
  const dc = drainageClass.toLowerCase();
  if (dc.includes('very poorly')) return 'very_poor';
  if (dc.includes('poorly')) return 'poor';
  if (dc.includes('well')) return 'well';
  return 'moderate';
}

/**
 * Estimate soil properties from latitude when outside LIO coverage.
 */
function estimateFromLatitude(lat: number): CanadaSoilSummary {
  // Ontario soils are predominantly clay loam in the south, sandy in the north
  const texture = lat > 44 ? 'Sandy loam' : 'Clay loam';
  const ph = lat > 46 ? 5.5 : 6.5;
  const om = lat > 46 ? 4.0 : 3.0;
  const drainage = lat > 46 ? 'Well drained' : 'Moderately well drained';

  return {
    soil_name: 'Estimated',
    predominant_texture: texture,
    texture_class: textureToClass(texture),
    drainage_class: drainage,
    organic_matter_pct: om,
    ph,
    ph_range: `${(ph - 0.5).toFixed(1)} - ${(ph + 0.5).toFixed(1)}`,
    hydrologic_group: deriveHydrologicGroup(texture, drainage),
    farmland_class: 'Unknown (outside LIO coverage)',
    depth_to_bedrock_m: 'N/A',
    taxonomic_order: '',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: 'Estimated (OMAFRA CanSIS unavailable)',
    confidence: 'low',
    drainageClass: mapDrainageToTier3(drainage),
    organicMatterPct: om,
    textureClass: textureToClass(texture),
  };
}

// ─── LIO Query ────────────────────────────────────────────────────────────────

async function queryLio(lat: number, lng: number): Promise<LioResponse> {
  // ~300m buffer around centroid to intersect the polygon
  const buf = 0.003;
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
    returnGeometry: 'false',
    f: 'json',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LIO_TIMEOUT_MS);

  try {
    const response = await fetch(`${LIO_BASE_URL}?${params}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AppError(
        'ADAPTER_HTTP_ERROR',
        `LIO ArcGIS returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        502,
      );
    }

    const json = await response.json().catch(() => {
      throw new AppError('ADAPTER_PARSE_ERROR', 'LIO ArcGIS returned invalid JSON', 502);
    });

    return json as LioResponse;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('ADAPTER_TIMEOUT', 'LIO ArcGIS request timed out', 504);
    }
    throw new AppError('ADAPTER_NETWORK', `LIO ArcGIS request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse LIO feature attributes into a soil summary.
 * Field name fallback chains handle LIO schema variations across service versions.
 */
function parseLioAttributes(attrs: Record<string, unknown>): CanadaSoilSummary {
  // Field name fallback chains — LIO schema varies
  const textureRaw =
    attrs['TEXTURE'] ?? attrs['SOIL_TEXTURE'] ?? attrs['TEX'] ?? attrs['TEXTURE_CLASS'] ?? null;
  const drainageRaw =
    attrs['DRAINAGE'] ?? attrs['DRAIN_CL'] ?? attrs['DRAINAGE_CLASS'] ?? attrs['DRAIN'] ?? null;
  const omRaw =
    attrs['ORG_MATTER'] ?? attrs['ORGANIC_MATTER'] ?? attrs['OM_PCT'] ?? attrs['ORGANIC_CARBON'] ?? null;
  const farmlandRaw =
    attrs['FARMLAND_CL'] ?? attrs['CANADA_LAND_INV'] ?? attrs['CLI_CLASS'] ?? attrs['CAPABILITY'] ?? null;
  const phRaw =
    attrs['PH'] ?? attrs['SOIL_PH'] ?? attrs['REACTION'] ?? null;
  const soilNameRaw =
    attrs['SOIL_SERIES'] ?? attrs['SOIL_NAME'] ?? attrs['SERIES_NAME'] ?? attrs['MAP_UNIT'] ?? 'Unknown';
  const bedrockRaw =
    attrs['DEPTH_BEDROCK'] ?? attrs['BEDROCK_DEPTH'] ?? attrs['DEPTH_TO_BEDROCK'] ?? null;
  const taxonRaw =
    attrs['TAXON_ORDER'] ?? attrs['GREAT_GROUP'] ?? attrs['ORDER_'] ?? null;

  const texture = textureRaw ? normalizeTexture(String(textureRaw)) : 'Loam';
  const drainage = drainageRaw ? String(drainageRaw) : 'Moderately well drained';
  const om = omRaw != null ? +parseFloat(String(omRaw)).toFixed(1) : 3.0;
  const ph = phRaw != null ? parseFloat(String(phRaw)) : 6.5;
  const farmlandClass = farmlandRaw ? formatFarmlandClass(String(farmlandRaw)) : 'Unknown';
  const bedrockDepth = bedrockRaw != null ? +parseFloat(String(bedrockRaw)).toFixed(1) : 'N/A';
  const taxonOrder = taxonRaw ? String(taxonRaw) : '';
  const soilName = String(soilNameRaw);

  const texClass = textureToClass(texture);
  const hydroGroup = deriveHydrologicGroup(texture, drainage);

  return {
    soil_name: soilName,
    predominant_texture: texture,
    texture_class: texClass,
    drainage_class: drainage,
    organic_matter_pct: om,
    ph,
    ph_range: `${(ph - 0.3).toFixed(1)} - ${(ph + 0.3).toFixed(1)}`,
    hydrologic_group: hydroGroup,
    farmland_class: farmlandClass,
    depth_to_bedrock_m: bedrockDepth,
    taxonomic_order: taxonOrder,
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: 'Ontario Soil Survey Complex (LIO)',
    confidence: 'high',
    // Tier 3 compatibility aliases
    drainageClass: mapDrainageToTier3(drainage),
    organicMatterPct: om,
    textureClass: texClass,
  };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class OmafraCanSisAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid(boundary, context);
    logger.info({ lat, lng }, 'Fetching Ontario soil data from LIO');

    let summary: CanadaSoilSummary;

    try {
      const response = await queryLio(lat, lng);

      if (response.error) {
        logger.warn({ error: response.error.message }, 'LIO returned error response');
        summary = estimateFromLatitude(lat);
      } else if (!response.features || response.features.length === 0) {
        logger.warn({ lat, lng }, 'No LIO soil features found — outside Ontario coverage');
        summary = estimateFromLatitude(lat);
      } else {
        // Take first (dominant) polygon — LIO returns most-overlapping first at small bbox
        summary = parseLioAttributes(response.features[0]!.attributes);
      }
    } catch (err) {
      if (err instanceof AppError && err.code === 'ADAPTER_TIMEOUT') {
        throw err; // Let timeout propagate
      }

      // Network/parse errors — fall back to estimation
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ error: message }, 'LIO query failed, falling back to estimation');
      summary = estimateFromLatitude(lat);
    }

    logger.info(
      {
        soilName: summary.soil_name,
        texture: summary.predominant_texture,
        confidence: summary.confidence,
        source: summary.source_api,
      },
      'Canada soil fetch complete',
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
    return 'Ontario Ministry of Agriculture, Food and Rural Affairs (OMAFRA), Ontario Soil Survey Complex via Land Information Ontario (LIO)';
  }
}

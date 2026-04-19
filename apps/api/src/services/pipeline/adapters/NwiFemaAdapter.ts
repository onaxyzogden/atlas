/**
 * NwiFemaAdapter — Fetches wetland + flood hazard data for US projects.
 *
 * Two ArcGIS REST sources queried in parallel:
 *
 * 1. FEMA NFHL (National Flood Hazard Layer) — Layer 6 (S_FLD_HAZ_AR)
 *    https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/6
 *    Point intersect at centroid → flood zone classification (AE, X, VE, D, …)
 *
 * 2. USFWS NWI (National Wetlands Inventory) — Layer 0 (Wetlands)
 *    https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0
 *    Envelope intersect with ~500 m bbox → wetland polygon features
 *
 * Returns flood zone, SFHA flag, wetland coverage estimate, dominant type,
 * forested/emergent wetland flags, and combined regulatory flag.
 *
 * Seventh live adapter in the pipeline.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'NwiFemaAdapter' });

const FEMA_URL =
  'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/6/query';
const NWI_URL =
  'https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0/query';
const TIMEOUT_MS = 15_000;

// ~500 m buffer at US latitudes (0.0045° ≈ 500 m)
const NWI_BBOX_BUFFER = 0.0045;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArcGisResponse {
  features?: Array<{ attributes: Record<string, unknown> }>;
  error?: { message?: string; code?: number };
}

interface WetlandsFloodSummary {
  // Flood zone (FEMA NFHL)
  flood_zone: string | null;
  flood_zone_description: string;
  sfha: boolean;                      // Special Flood Hazard Area (100-year)
  flood_study_type: string | null;    // 'FIS' | 'APPROXIMATE' | null

  // Wetlands (NWI)
  wetland_feature_count: number;
  dominant_wetland_system: string | null;   // 'Palustrine' | 'Estuarine' | 'Riverine' | etc.
  has_forested_wetland: boolean;
  has_emergent_wetland: boolean;
  nwi_codes: string[];              // up to 5 unique ATTRIBUTE codes

  // Combined flags for downstream scoring
  regulated: boolean;               // sfha OR wetland present
  requires_permits: boolean;        // likely requires 404/401 + FEMA permits

  data_date: string;
  source_api: 'FEMA NFHL + NWI';
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
 * Human-readable description for a FEMA flood zone code.
 */
function describeFloodZone(zone: string | null): string {
  if (!zone) return 'Unknown — no flood data available';
  const z = zone.toUpperCase().trim();
  if (['AE', 'AH', 'AO', 'A', 'A99', 'AR'].includes(z)) {
    return '1% Annual Chance Flood Zone (100-year) — Special Flood Hazard Area';
  }
  if (['VE', 'V'].includes(z) || /^V\d/.test(z)) {
    return 'Coastal High Hazard Zone — Special Flood Hazard Area (wave action)';
  }
  if (z === 'X500' || z === 'B') {
    return '0.2% Annual Chance Flood Zone (500-year) — moderate risk';
  }
  if (z === 'X' || z === 'C') return 'Minimal Flood Hazard Zone';
  if (z === 'D') return 'Undetermined Flood Zone (not studied)';
  if (z === 'OPEN WATER') return 'Open Water';
  return `Flood Zone ${zone}`;
}

/**
 * True if the zone code falls within the SFHA (Special Flood Hazard Area).
 */
function isSfha(zone: string | null): boolean {
  if (!zone) return false;
  const z = zone.toUpperCase().trim();
  return (
    ['AE', 'AH', 'AO', 'A', 'A99', 'AR', 'VE', 'V'].includes(z) ||
    /^V\d/.test(z) ||
    /^A\d/.test(z)
  );
}

/**
 * Map NWI system code (first char of ATTRIBUTE) to a readable wetland system name.
 */
function nwiSystemName(code: string): string {
  const sys = code.charAt(0).toUpperCase();
  switch (sys) {
    case 'P': return 'Palustrine';
    case 'E': return 'Estuarine';
    case 'R': return 'Riverine';
    case 'L': return 'Lacustrine';
    case 'M': return 'Marine';
    default: return 'Unknown';
  }
}

/**
 * True if the NWI ATTRIBUTE code indicates a forested (FO) wetland.
 */
function isForested(code: string): boolean {
  return code.toUpperCase().includes('FO');
}

/**
 * True if the NWI ATTRIBUTE code indicates an emergent (EM) wetland.
 */
function isEmergent(code: string): boolean {
  return code.toUpperCase().includes('EM');
}

async function queryFema(lat: number, lng: number): Promise<ArcGisResponse> {
  const params = new URLSearchParams({
    where: '1=1',
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'FLD_ZONE,STUDY_TYP,EFF_DATE,SFHA_TF',
    returnGeometry: 'false',
    f: 'json',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${FEMA_URL}?${params}`, { signal: controller.signal });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AppError(
        'ADAPTER_HTTP_ERROR',
        `FEMA NFHL returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        502,
      );
    }

    const json = await response.json().catch(() => {
      throw new AppError('ADAPTER_PARSE_ERROR', 'FEMA NFHL returned invalid JSON', 502);
    });

    return json as ArcGisResponse;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('ADAPTER_TIMEOUT', 'FEMA NFHL request timed out', 504);
    }
    throw new AppError('ADAPTER_NETWORK', `FEMA NFHL request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function queryNwi(lat: number, lng: number): Promise<ArcGisResponse> {
  const buf = NWI_BBOX_BUFFER;
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
    outFields: 'WETLAND_TYPE,ATTRIBUTE,ACRES',
    returnGeometry: 'false',
    f: 'json',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${NWI_URL}?${params}`, { signal: controller.signal });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AppError(
        'ADAPTER_HTTP_ERROR',
        `NWI returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        502,
      );
    }

    const json = await response.json().catch(() => {
      throw new AppError('ADAPTER_PARSE_ERROR', 'NWI returned invalid JSON', 502);
    });

    return json as ArcGisResponse;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('ADAPTER_TIMEOUT', 'NWI request timed out', 504);
    }
    throw new AppError('ADAPTER_NETWORK', `NWI request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

function buildUnavailableResult(layerType: LayerType, attributionText: string): AdapterResult {
  return {
    layerType,
    sourceApi: 'FEMA NFHL + NWI',
    attributionText,
    confidence: 'low',
    dataDate: null,
    summaryData: {
      unavailable: true,
      reason: 'outside_nwi_fema_coverage',
      flood_zone: null,
      flood_zone_description: 'No data — outside NWI/FEMA coverage or service unavailable',
      sfha: false,
      flood_study_type: null,
      wetland_feature_count: 0,
      dominant_wetland_system: null,
      has_forested_wetland: false,
      has_emergent_wetland: false,
      nwi_codes: [],
      regulated: false,
      requires_permits: false,
      data_date: new Date().toISOString().split('T')[0]!,
      source_api: 'FEMA NFHL + NWI',
      confidence: 'low' as const,
    },
  };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class NwiFemaAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid({ ...context, boundaryGeojson: boundary });
    logger.info({ lat, lng }, 'Fetching FEMA NFHL + NWI wetland/flood data');

    const attribution = this.getAttributionText();

    // Query both sources in parallel — tolerate partial failures
    const [femaResult, nwiResult] = await Promise.allSettled([
      queryFema(lat, lng),
      queryNwi(lat, lng),
    ]);

    const femaAttrs = femaResult.status === 'fulfilled'
      ? femaResult.value.features?.[0]?.attributes ?? null
      : null;

    const nwiFeatures = nwiResult.status === 'fulfilled'
      ? (nwiResult.value.features ?? [])
      : [];

    // Both failed or returned errors → unavailable
    const femaHasError = femaResult.status === 'fulfilled' && femaResult.value.error;
    const nwiHasError = nwiResult.status === 'fulfilled' && nwiResult.value.error;

    if (!femaAttrs && nwiFeatures.length === 0 && (femaHasError || nwiHasError || femaResult.status === 'rejected')) {
      logger.warn({ lat, lng }, 'No FEMA or NWI data — outside coverage or service unavailable');
      return buildUnavailableResult(this.layerType, attribution);
    }

    // ── FEMA flood zone ──────────────────────────────────────────────────────
    const rawZone =
      (femaAttrs?.['FLD_ZONE'] ?? femaAttrs?.['fld_zone'] ?? null) as string | null;
    const floodZone = rawZone ? String(rawZone).trim() : null;

    const rawStudyType =
      (femaAttrs?.['STUDY_TYP'] ?? femaAttrs?.['study_typ'] ?? null) as string | null;
    const studyType = rawStudyType ? String(rawStudyType).trim() : null;

    const sfha = isSfha(floodZone);

    // ── NWI wetlands ─────────────────────────────────────────────────────────
    const nwiCodes: string[] = [];
    let hasForested = false;
    let hasEmergent = false;
    const systemCounts: Record<string, number> = {};

    for (const feature of nwiFeatures) {
      const attr = (feature.attributes['ATTRIBUTE'] ?? feature.attributes['attribute'] ?? '') as string;
      const code = String(attr).trim();
      if (code && !nwiCodes.includes(code)) {
        nwiCodes.push(code);
      }
      if (isForested(code)) hasForested = true;
      if (isEmergent(code)) hasEmergent = true;

      const sys = nwiSystemName(code);
      systemCounts[sys] = (systemCounts[sys] ?? 0) + 1;
    }

    // Most common system across all features
    const dominantSystem = Object.entries(systemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // ── Confidence ───────────────────────────────────────────────────────────
    // High: both FEMA and NWI available and definitive
    // Medium: one source available, or flood zone is 'D' (undetermined)
    // Low: neither useful
    let confidence: 'high' | 'medium' | 'low';
    const hasFema = floodZone !== null && floodZone !== 'D';
    const hasNwi = nwiFeatures.length > 0;

    if (hasFema && hasNwi) {
      confidence = 'high';
    } else if (hasFema || hasNwi) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    // ── Regulatory flags ─────────────────────────────────────────────────────
    const regulated = sfha || hasNwi;
    const requiresPermits = sfha || (hasNwi && (hasForested || hasEmergent));

    const summary: WetlandsFloodSummary = {
      flood_zone: floodZone,
      flood_zone_description: describeFloodZone(floodZone),
      sfha,
      flood_study_type: studyType,
      wetland_feature_count: nwiFeatures.length,
      dominant_wetland_system: dominantSystem,
      has_forested_wetland: hasForested,
      has_emergent_wetland: hasEmergent,
      nwi_codes: nwiCodes.slice(0, 5),
      regulated,
      requires_permits: requiresPermits,
      data_date: new Date().toISOString().split('T')[0]!,
      source_api: 'FEMA NFHL + NWI',
      confidence,
    };

    logger.info(
      {
        floodZone: summary.flood_zone,
        sfha: summary.sfha,
        wetlandCount: summary.wetland_feature_count,
        confidence: summary.confidence,
      },
      'FEMA NFHL + NWI fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: 'FEMA NFHL + NWI',
      attributionText: attribution,
      confidence,
      dataDate: summary.data_date,
      summaryData: summary,
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return (
      'Federal Emergency Management Agency (FEMA), National Flood Hazard Layer (NFHL); ' +
      'U.S. Fish & Wildlife Service, National Wetlands Inventory (NWI)'
    );
  }
}

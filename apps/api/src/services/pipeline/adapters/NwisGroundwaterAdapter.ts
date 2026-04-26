/**
 * NwisGroundwaterAdapter — US groundwater depth from USGS NWIS.
 *
 * Data source: USGS Water Services — National Water Information System
 * https://waterservices.usgs.gov/nwis/gwlevels/  (no auth required)
 *
 * Queries daily groundwater level measurements (parameterCd=72019, depth to
 * water below land surface, feet) within a 1° bounding box over the last year.
 * Returns the nearest well by haversine distance.
 *
 * Closes audit H5 #7 — server-side lift of the web-only `fetchUSGSNWIS` in
 * `apps/web/src/lib/layerFetcher.ts`. The web path remains as a fallback for
 * client-only previews.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'NwisGroundwaterAdapter' });

const NWIS_BASE = 'https://waterservices.usgs.gov/nwis/gwlevels/';
const NWIS_TIMEOUT_MS = 15_000;
const BBOX_DEGREES = 0.5; // ~55 km half-width at mid-latitudes
const LOOKBACK_YEARS = 1;

interface NwisTimeSeries {
  sourceInfo?: {
    siteName?: string;
    geoLocation?: { geogLocation?: { latitude?: number; longitude?: number } };
  };
  values?: Array<{ value?: Array<{ value?: string; dateTime?: string }> }>;
}

interface NwisResponse {
  value?: { timeSeries?: NwisTimeSeries[] };
}

interface WellRecord {
  depthFt: number;
  depthM: number;
  km: number;
  name: string;
  date: string;
}

function extractCentroid(context: ProjectContext, boundary: unknown): { lat: number; lng: number } {
  if (context.centroidLat != null && context.centroidLng != null) {
    return { lat: context.centroidLat, lng: context.centroidLng };
  }
  const geo = boundary as { type?: string; coordinates?: number[][][] | number[][][][] } | null;
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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function nwisFetch(url: string): Promise<NwisResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NWIS_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      // NWIS returns 404 when there are zero matching sites — treat as empty
      if (response.status === 404) return { value: { timeSeries: [] } };
      throw new AppError(
        'ADAPTER_HTTP_ERROR',
        `NWIS gwlevels returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        502,
      );
    }
    const json = await response.json().catch(() => {
      throw new AppError('ADAPTER_PARSE_ERROR', 'NWIS gwlevels returned invalid JSON', 502);
    });
    return json as NwisResponse;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('ADAPTER_TIMEOUT', 'NWIS gwlevels request timed out', 504);
    }
    throw new AppError('ADAPTER_NETWORK', `NWIS gwlevels request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

function parseWells(data: NwisResponse, lat: number, lng: number, endDT: string): WellRecord[] {
  const timeSeries = data?.value?.timeSeries ?? [];
  const wells: WellRecord[] = [];
  for (const ts of timeSeries) {
    const siteName = ts.sourceInfo?.siteName ?? 'Unknown well';
    const siteLat = ts.sourceInfo?.geoLocation?.geogLocation?.latitude;
    const siteLng = ts.sourceInfo?.geoLocation?.geogLocation?.longitude;
    if (siteLat == null || siteLng == null) continue;

    const values = ts.values?.[0]?.value ?? [];
    const lastValid = [...values].reverse().find(
      (v) => v.value != null && v.value !== '' && !isNaN(Number(v.value)),
    );
    if (!lastValid) continue;

    const depthFt = Number(lastValid.value);
    if (!isFinite(depthFt) || depthFt < 0) continue;

    wells.push({
      depthFt,
      depthM: Math.round((depthFt / 3.28084) * 10) / 10,
      km: Math.round(haversineKm(lat, lng, siteLat, siteLng) * 10) / 10,
      name: siteName,
      date: lastValid.dateTime?.split('T')[0] ?? endDT,
    });
  }
  return wells;
}

export class NwisGroundwaterAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid(context, boundary);
    logger.info({ lat, lng }, 'Fetching USGS NWIS groundwater levels');

    const today = new Date();
    const endDT = today.toISOString().split('T')[0]!;
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - LOOKBACK_YEARS);
    const startDT = startDate.toISOString().split('T')[0]!;

    const bBox = [
      (lng - BBOX_DEGREES).toFixed(4),
      (lat - BBOX_DEGREES).toFixed(4),
      (lng + BBOX_DEGREES).toFixed(4),
      (lat + BBOX_DEGREES).toFixed(4),
    ].join(',');

    const url =
      `${NWIS_BASE}?format=json&bBox=${bBox}&siteType=GW&parameterCd=72019` +
      `&startDT=${startDT}&endDT=${endDT}`;

    const data = await nwisFetch(url);
    const wells = parseWells(data, lat, lng, endDT);

    if (wells.length === 0) {
      logger.warn({ lat, lng }, 'NWIS returned no wells with usable depth measurements');
      return {
        layerType: this.layerType,
        sourceApi: 'USGS NWIS',
        attributionText: this.getAttributionText(),
        confidence: 'low',
        dataDate: null,
        summaryData: {
          groundwater_depth_m: null,
          groundwater_depth_ft: null,
          station_count: 0,
          heuristic_note: 'No NWIS wells with recent measurements within 0.5° of centroid.',
        },
      };
    }

    wells.sort((a, b) => a.km - b.km);
    const nearest = wells[0]!;

    logger.info(
      { wells: wells.length, nearestKm: nearest.km, depthM: nearest.depthM },
      'NWIS groundwater fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: 'USGS NWIS',
      attributionText: this.getAttributionText(),
      confidence: 'high',
      dataDate: nearest.date,
      summaryData: {
        groundwater_depth_m: nearest.depthM,
        groundwater_depth_ft: Math.round(nearest.depthFt * 10) / 10,
        station_nearest_km: nearest.km,
        station_name: nearest.name,
        station_count: wells.length,
        measurement_date: nearest.date,
      },
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'U.S. Geological Survey — National Water Information System (NWIS)';
  }
}

/**
 * EcccClimateAdapter — Fetches 1981–2010 (and 1991–2020) climate normals for Canadian projects.
 *
 * Data source: Environment and Climate Change Canada (ECCC) — OGC API Features
 * https://api.weather.gc.ca/collections/climate-normals/items  (no auth required, GET-based)
 *
 * Queries a 1° × 1° bounding box around the site centroid and selects the nearest station.
 *
 * Returns:
 *   annual_precip_mm, annual_temp_mean_c, growing_season_days,
 *   first_frost_date, last_frost_date, hardiness_zone,
 *   eccc_station, eccc_station_distance_km
 *
 * Falls back to latitude-based estimate when no ECCC station data is available.
 *
 * Tenth live adapter in the pipeline.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';
import { fetchNasaPowerSummary } from './nasaPowerFetch.js';

const logger = pino({ name: 'EcccClimateAdapter' });

const ECCC_CLIMATE_URL = 'https://api.weather.gc.ca/collections/climate-normals/items';
const ECCC_TIMEOUT_MS = 15_000;
const ECCC_BBOX_DEG = 0.5; // ±0.5° (~55 km at Canadian latitudes)

// ─── Types ────────────────────────────────────────────────────────────────────

interface EcccFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, unknown>;
}

interface EcccFeatureCollection {
  features?: EcccFeature[];
}

interface CanadaClimateNormals {
  annual_precip_mm: number | null;
  annual_temp_mean_c: number | null;
  growing_season_days: number | null;
  last_frost_date: string | null;
  first_frost_date: string | null;
  hardiness_zone: string | null;

  eccc_station: string | null;
  eccc_station_distance_km: number;

  data_period: string;
  source_api: 'ECCC Climate Normals (OGC API)';
  confidence: 'high' | 'medium' | 'low';

  // Optional NASA POWER enrichment (global climatology supplement)
  solar_radiation_kwh_m2_day?: number;
  wind_speed_ms?: number;
  relative_humidity_pct?: number;
  nasa_power_source?: 'NASA POWER (Climatology)';
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

async function queryEcccNormals(lat: number, lng: number): Promise<EcccFeatureCollection> {
  const bbox = [
    (lng - ECCC_BBOX_DEG).toFixed(4),
    (lat - ECCC_BBOX_DEG).toFixed(4),
    (lng + ECCC_BBOX_DEG).toFixed(4),
    (lat + ECCC_BBOX_DEG).toFixed(4),
  ].join(',');

  const url = `${ECCC_CLIMATE_URL}?f=json&bbox=${bbox}&limit=5`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ECCC_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AppError(
        'ADAPTER_HTTP_ERROR',
        `ECCC climate API returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        502,
      );
    }

    const json = await response.json().catch(() => {
      throw new AppError('ADAPTER_PARSE_ERROR', 'ECCC climate API returned invalid JSON', 502);
    });

    return json as EcccFeatureCollection;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('ADAPTER_TIMEOUT', 'ECCC climate API request timed out', 504);
    }
    throw new AppError('ADAPTER_NETWORK', `ECCC climate request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

function parseNum(val: unknown): number | null {
  if (val == null) return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function parseStr(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s.length > 0 && s !== 'null' ? s : null;
}

/**
 * Latitude-based climate fallback for Canadian sites.
 * Used when ECCC returns no stations or core fields are missing.
 */
function buildLatitudeFallback(lat: number): CanadaClimateNormals {
  // Canadian climate: typically colder than same-latitude US sites
  const annualTemp = +(8.0 - (lat - 43) * 0.6).toFixed(1);
  const precipMm = Math.round(700 + (lat < 50 ? (50 - lat) * 10 : 0));
  const growingDays = Math.round(180 - (lat - 43) * 5.5);
  const zoneNum = Math.max(0, Math.min(8, Math.round(9 - (lat - 43) * 0.35)));
  const zoneSub = lat % 2 > 1 ? 'a' : 'b';

  return {
    annual_precip_mm: precipMm,
    annual_temp_mean_c: annualTemp,
    growing_season_days: growingDays,
    last_frost_date: null,
    first_frost_date: null,
    hardiness_zone: `${zoneNum}${zoneSub}`,
    eccc_station: null,
    eccc_station_distance_km: 0,
    data_period: 'Estimated',
    source_api: 'ECCC Climate Normals (OGC API)',
    confidence: 'low',
  };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class EcccClimateAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid({ ...context, boundaryGeojson: boundary });
    logger.info({ lat, lng }, 'Fetching ECCC climate normals');

    let normals: CanadaClimateNormals;

    try {
      normals = await this.fetchEcccNormals(lat, lng);
    } catch (err) {
      if (err instanceof AppError) {
        logger.warn({ lat, lng, code: err.code }, 'ECCC unavailable — falling back to latitude estimate');
      } else {
        logger.warn({ lat, lng, err: (err as Error).message }, 'ECCC error — falling back to latitude estimate');
      }
      normals = buildLatitudeFallback(lat);
    }

    // ── NASA POWER enrichment (best-effort, silent-skip on failure) ───────
    try {
      const nasa = await fetchNasaPowerSummary(lat, lng);
      if (nasa) {
        normals.solar_radiation_kwh_m2_day = nasa.solar_radiation_kwh_m2_day;
        normals.wind_speed_ms = nasa.wind_speed_ms;
        normals.relative_humidity_pct = nasa.relative_humidity_pct;
        normals.nasa_power_source = nasa.source_api;
      }
    } catch (err) {
      logger.warn({ lat, lng, err: (err as Error).message }, 'NASA POWER enrichment threw — continuing without it');
    }

    logger.info(
      {
        station: normals.eccc_station,
        distKm: normals.eccc_station_distance_km,
        precip: normals.annual_precip_mm,
        temp: normals.annual_temp_mean_c,
        confidence: normals.confidence,
      },
      'ECCC climate fetch complete',
    );

    // `data_date` is a Postgres `date` column — it must parse as a real date.
    // `normals.data_period` is a label like "1981-2010" or "Estimated" which
    // throws "Invalid time value" through postgres.js's date serializer.
    // Map the normals period to its start-year ISO date; fall back to null.
    const periodStart = /^(\d{4})[–-]/.exec(normals.data_period)?.[1];
    const dataDate = periodStart ? `${periodStart}-01-01` : null;

    return {
      layerType: this.layerType,
      sourceApi: normals.source_api,
      attributionText: this.getAttributionText(),
      confidence: normals.confidence,
      dataDate,
      summaryData: normals,
    };
  }

  private async fetchEcccNormals(lat: number, lng: number): Promise<CanadaClimateNormals> {
    const collection = await queryEcccNormals(lat, lng);

    const features = collection.features;
    if (!features || features.length === 0) {
      throw new AppError('ADAPTER_NO_DATA', 'ECCC: no climate stations found in bbox', 404);
    }

    // Select nearest station by Euclidean degree distance
    const cosLat = Math.cos(lat * Math.PI / 180);
    const nearest = features.reduce((best, f) => {
      const [fLng, fLat] = f.geometry.coordinates;
      const [bLng, bLat] = best.geometry.coordinates;
      const distF = Math.hypot(((fLng ?? 0) - lng) * cosLat, (fLat ?? 0) - lat);
      const distB = Math.hypot(((bLng ?? 0) - lng) * cosLat, (bLat ?? 0) - lat);
      return distF < distB ? f : best;
    });

    const p = nearest.properties;

    // Extract fields with fallback chains (ECCC property names vary by dataset version)
    const annualPrecip = parseNum(p['ANNUAL_PRECIP'] ?? p['TOTAL_PRECIP'] ?? p['annual_precip']);
    const meanTemp     = parseNum(p['MEAN_TEMP'] ?? p['ANNUAL_MEAN_TEMP'] ?? p['mean_temp']);
    const frostFree    = parseNum(p['FROST_FREE_PERIOD'] ?? p['FROST_FREE_DAYS'] ?? p['frost_free_period']);
    const lastFrost    = parseStr(p['LAST_SPRING_FROST_DATE'] ?? p['LAST_FROST_DATE'] ?? p['last_spring_frost']);
    const firstFrost   = parseStr(p['FIRST_FALL_FROST_DATE'] ?? p['FIRST_FROST_DATE'] ?? p['first_fall_frost']);
    const hardiness    = parseStr(p['HARDINESS_ZONE'] ?? p['CLIMATE_ZONE'] ?? p['hardiness_zone']);
    const stationName  = parseStr(p['STATION_NAME'] ?? p['CLIMATE_IDENTIFIER'] ?? p['station_name']);
    const dataPeriod   = parseStr(p['NORMAL_CODE'] ?? p['PERIOD'] ?? p['period']) ?? '1981-2010';

    if (annualPrecip === null && meanTemp === null) {
      throw new AppError('ADAPTER_NO_DATA', 'ECCC: missing both precipitation and temperature fields', 404);
    }

    const [nLng, nLat] = nearest.geometry.coordinates;
    const distKm = Math.round(
      Math.hypot(((nLng ?? 0) - lng) * cosLat, (nLat ?? 0) - lat) * 111,
    );

    // Confidence: based on distance and field completeness
    const hasCoreData = annualPrecip !== null && meanTemp !== null;
    const distanceConf: 'high' | 'medium' | 'low' =
      distKm < 30 ? 'high' : distKm < 60 ? 'medium' : 'low';
    const confidence: 'high' | 'medium' | 'low' = hasCoreData ? distanceConf : 'low';

    return {
      annual_precip_mm: annualPrecip,
      annual_temp_mean_c: meanTemp !== null ? +meanTemp.toFixed(1) : null,
      growing_season_days: frostFree !== null ? Math.round(frostFree) : null,
      last_frost_date: lastFrost,
      first_frost_date: firstFrost,
      hardiness_zone: hardiness,
      eccc_station: stationName,
      eccc_station_distance_km: distKm,
      data_period: dataPeriod,
      source_api: 'ECCC Climate Normals (OGC API)',
      confidence,
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'Environment and Climate Change Canada (ECCC) — Climate Normals, OGC API Features';
  }
}

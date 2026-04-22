/**
 * PgmnGroundwaterAdapter — Ontario groundwater depth from PGMN via LIO.
 *
 * Data source: Ontario Provincial Groundwater Monitoring Network (PGMN)
 * Published through the Land Information Ontario (LIO) ArcGIS Open Data
 * services. Tries multiple LIO_OPEN_DATA MapServer layers because the schema
 * is unstable across LIO releases.
 *
 * CA companion to `NwisGroundwaterAdapter`. Closes audit H5 #7.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'PgmnGroundwaterAdapter' });

const PGMN_TIMEOUT_MS = 10_000;
const BBOX_DEGREES = 0.5;

const LIO_LAYER_URLS = [
  'https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open08/MapServer/30/query',
  'https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open08/MapServer/22/query',
  'https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open05/MapServer/0/query',
];

interface GwFeature {
  attributes: Record<string, unknown>;
  geometry?: { x?: number; y?: number };
}

interface LioResponse {
  features?: GwFeature[];
}

interface WellRecord {
  depthM: number;
  name: string;
  date: string;
  km: number;
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

async function lioFetch(url: string): Promise<LioResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PGMN_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json().catch(() => null)) as LioResponse | null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryLioLayers(lat: number, lng: number): Promise<GwFeature[]> {
  const envelope = encodeURIComponent(JSON.stringify({
    xmin: lng - BBOX_DEGREES, ymin: lat - BBOX_DEGREES,
    xmax: lng + BBOX_DEGREES, ymax: lat + BBOX_DEGREES,
    spatialReference: { wkid: 4326 },
  }));

  for (const base of LIO_LAYER_URLS) {
    const url = `${base}?geometry=${envelope}&geometryType=esriGeometryEnvelope` +
      `&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&f=json`;
    const data = await lioFetch(url);
    if (data?.features && data.features.length > 0) return data.features;
  }
  return [];
}

function parseWells(features: GwFeature[], lat: number, lng: number): WellRecord[] {
  return features.map((f) => {
    const a = f.attributes;
    const wellLat = Number(a['LATITUDE'] ?? a['LAT'] ?? a['Y_COORD'] ?? f.geometry?.y ?? 0);
    const wellLng = Number(a['LONGITUDE'] ?? a['LNG'] ?? a['LONG'] ?? a['X_COORD'] ?? f.geometry?.x ?? 0);
    const depthRaw = a['WATER_LEVEL_M'] ?? a['STATIC_WATER_LEVEL'] ?? a['WATER_DEPTH'] ?? a['GW_LEVEL']
      ?? a['WATER_LEVEL'] ?? a['DEPTH_TO_WATER'] ?? null;
    const depthM = depthRaw != null ? Math.abs(parseFloat(String(depthRaw))) : NaN;
    const name = String(a['WELL_NAME'] ?? a['STATION_NAME'] ?? a['PGMN_WELL_ID'] ?? a['WELL_ID'] ?? 'PGMN Well');
    const dateRaw = a['SAMPLE_DATE'] ?? a['MEASUREMENT_DATE'] ?? a['DATE_'] ?? a['OBS_DATE'] ?? null;
    const date = dateRaw ? String(dateRaw).split('T')[0]! : new Date().toISOString().split('T')[0]!;
    const km = (wellLat !== 0 && wellLng !== 0) ? haversineKm(lat, lng, wellLat, wellLng) : Infinity;
    return { depthM, name, date, km };
  }).filter((w) => isFinite(w.km));
}

export class PgmnGroundwaterAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid(context, boundary);
    logger.info({ lat, lng }, 'Fetching Ontario PGMN groundwater levels');

    const features = await tryLioLayers(lat, lng);
    if (features.length === 0) {
      logger.warn({ lat, lng }, 'PGMN returned no wells within bbox across all LIO layers');
      return {
        layerType: this.layerType,
        sourceApi: 'Ontario PGMN (LIO)',
        attributionText: this.getAttributionText(),
        confidence: 'low',
        dataDate: null,
        summaryData: {
          groundwater_depth_m: null,
          groundwater_depth_ft: null,
          station_count: 0,
          heuristic_note: 'No PGMN wells found within 0.5° of centroid.',
        },
      };
    }

    const wells = parseWells(features, lat, lng);
    if (wells.length === 0) {
      logger.warn({ lat, lng, featureCount: features.length }, 'PGMN features lacked usable coordinates');
      return {
        layerType: this.layerType,
        sourceApi: 'Ontario PGMN (LIO)',
        attributionText: this.getAttributionText(),
        confidence: 'low',
        dataDate: null,
        summaryData: {
          groundwater_depth_m: null,
          groundwater_depth_ft: null,
          station_count: 0,
          heuristic_note: 'PGMN features returned without usable coordinates.',
        },
      };
    }

    wells.sort((a, b) => a.km - b.km);
    const nearest = wells[0]!;
    const depthM = isFinite(nearest.depthM) ? nearest.depthM : 0;
    const confidence: 'medium' | 'low' = isFinite(nearest.depthM) ? 'medium' : 'low';

    logger.info(
      { wells: wells.length, nearestKm: nearest.km, depthM },
      'PGMN groundwater fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: 'Ontario PGMN (LIO)',
      attributionText: this.getAttributionText(),
      confidence,
      dataDate: nearest.date,
      summaryData: {
        groundwater_depth_m: Math.round(depthM * 10) / 10,
        groundwater_depth_ft: Math.round(depthM * 3.28084 * 10) / 10,
        station_nearest_km: Math.round(nearest.km * 10) / 10,
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
    return 'Ontario Ministry of the Environment, Conservation and Parks — Provincial Groundwater Monitoring Network (via Land Information Ontario)';
  }
}

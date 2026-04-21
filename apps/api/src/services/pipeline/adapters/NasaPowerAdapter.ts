/**
 * NasaPowerAdapter — Standalone climate adapter backed by NASA POWER climatology.
 *
 * Data source: NASA POWER (Prediction Of Worldwide Energy Resources)
 * https://power.larc.nasa.gov/api/temporal/climatology/point
 *
 * Global coverage, keyless, CC-licensed. Returns:
 *   solar_radiation_kwh_m2_day, wind_speed_ms, relative_humidity_pct
 *
 * This class implements DataSourceAdapter so it can be invoked directly (e.g.
 * for future non-US/non-CA projects once the Country type is extended). For
 * US/CA projects, NoaaClimateAdapter and EcccClimateAdapter consume the same
 * underlying data via the shared helper `fetchNasaPowerSummary` and merge it
 * into their richer ClimateNormals payload — no need to invoke this class.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';
import { fetchNasaPowerSummary } from './nasaPowerFetch.js';

const logger = pino({ name: 'NasaPowerAdapter' });

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

export class NasaPowerAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid(context, boundary);
    logger.info({ lat, lng }, 'Fetching NASA POWER climatology');

    const summary = await fetchNasaPowerSummary(lat, lng);
    if (!summary) {
      throw new AppError('ADAPTER_NO_DATA', 'NASA POWER returned no usable data', 502);
    }

    logger.info(
      {
        solar: summary.solar_radiation_kwh_m2_day,
        wind: summary.wind_speed_ms,
        rh: summary.relative_humidity_pct,
      },
      'NASA POWER fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: summary.source_api,
      attributionText: this.getAttributionText(),
      confidence: summary.confidence,
      dataDate: 'climatology',
      summaryData: {
        solar_radiation_kwh_m2_day: summary.solar_radiation_kwh_m2_day,
        wind_speed_ms: summary.wind_speed_ms,
        relative_humidity_pct: summary.relative_humidity_pct,
        source_api: summary.source_api,
        confidence: summary.confidence,
      },
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'NASA POWER (Prediction Of Worldwide Energy Resources) — climatology';
  }
}

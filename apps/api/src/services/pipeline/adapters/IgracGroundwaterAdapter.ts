/**
 * IgracGroundwaterAdapter — global groundwater fallback from IGRAC GGIS.
 *
 * Data source: IGRAC Global Groundwater Information System (GGIS)
 * https://www.un-igrac.org/global-groundwater-information-system-ggis
 *
 * Unlike NwisGroundwaterAdapter and PgmnGroundwaterAdapter, this one does
 * NOT call an external API at request time. It reads from the local PostGIS
 * table `groundwater_wells_global` (migration 023), populated by a quarterly
 * ingest job. This keeps the request path inside Atlas's own infra and
 * avoids coupling diagnosis SLA to GGIS portal availability — at the cost
 * of a 1-3 year freshness ceiling on national-agency reporting cadence.
 *
 * Per ADR 2026-05-04-igrac-global-groundwater-fallback (Phase 8.2-A.2):
 *   - Used as the INTL fallback in ADAPTER_REGISTRY.groundwater.
 *   - US/CA continue to use NWIS / PGMN where their freshness matters.
 *   - Confidence is 'medium' (vs. 'high' for NWIS/PGMN) reflecting vintage drift.
 *   - dataDate = nearest well's last_observation; ingest_vintage carried in summaryData.
 */

import pino from 'pino';
import type postgres from 'postgres';
import type { LayerType } from '@ogden/shared';
import type {
  DataSourceAdapter,
  AdapterResult,
  ProjectContext,
} from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'IgracGroundwaterAdapter' });

const BBOX_DEGREES = 0.5; // ~55 km half-width at mid-latitudes — matches NWIS adapter

interface WellRow {
  station_id: string;
  source: string;
  depth_m: string | number | null;
  last_observation: Date | null;
  ingest_vintage: string;
  km: string | number;
}

function extractCentroid(
  context: ProjectContext,
  boundary: unknown,
): { lat: number; lng: number } {
  if (context.centroidLat != null && context.centroidLng != null) {
    return { lat: context.centroidLat, lng: context.centroidLng };
  }
  const geo = boundary as
    | { type?: string; coordinates?: number[][][] | number[][][][] }
    | null;
  if (!geo?.coordinates) {
    throw new AppError(
      'ADAPTER_INVALID_INPUT',
      'No centroid and no valid GeoJSON boundary',
      400,
    );
  }
  const allCoords: number[][] =
    geo.type === 'MultiPolygon'
      ? (geo.coordinates as number[][][][]).flat(2)
      : (geo.coordinates as number[][][]).flat();

  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const [lng, lat] of allCoords) {
    if (lat! < minLat) minLat = lat!;
    if (lat! > maxLat) maxLat = lat!;
    if (lng! < minLng) minLng = lng!;
    if (lng! > maxLng) maxLng = lng!;
  }
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

export class IgracGroundwaterAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
    private readonly db: postgres.Sql,
  ) {}

  async fetchForBoundary(
    boundary: unknown,
    context: ProjectContext,
  ): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid(context, boundary);
    logger.info({ lat, lng }, 'Querying IGRAC groundwater_wells_global');

    const minLat = lat - BBOX_DEGREES;
    const maxLat = lat + BBOX_DEGREES;
    const minLng = lng - BBOX_DEGREES;
    const maxLng = lng + BBOX_DEGREES;

    // Bbox containment hits the GIST index; ST_Distance with geography casts
    // gives metres, converted to km below. Limit 50 candidates is generous;
    // we only return the nearest with a non-NULL depth_m.
    const rows = await this.db<WellRow[]>`
      SELECT
        station_id,
        source,
        depth_m,
        last_observation,
        ingest_vintage,
        ST_Distance(
          geom::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) / 1000 AS km
      FROM groundwater_wells_global
      WHERE source = 'IGRAC GGIS'
        AND geom && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
        AND depth_m IS NOT NULL
      ORDER BY km ASC
      LIMIT 50
    `;

    if (rows.length === 0) {
      logger.warn(
        { lat, lng },
        'IGRAC returned no wells with usable depth within bbox',
      );
      return {
        layerType: this.layerType,
        sourceApi: 'IGRAC GGIS',
        attributionText: this.getAttributionText(),
        confidence: 'low',
        dataDate: null,
        summaryData: {
          groundwater_depth_m: null,
          station_count: 0,
          heuristic_note:
            'No IGRAC GGIS wells with recorded depth within 0.5° of centroid.',
        },
      };
    }

    const nearest = rows[0]!;
    const depthM = nearest.depth_m == null ? null : Number(nearest.depth_m);
    const km = Math.round(Number(nearest.km) * 10) / 10;
    const dataDate =
      nearest.last_observation instanceof Date
        ? nearest.last_observation.toISOString().split('T')[0] ?? null
        : null;

    logger.info(
      { wells: rows.length, nearestKm: km, depthM, vintage: nearest.ingest_vintage },
      'IGRAC groundwater fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: 'IGRAC GGIS',
      attributionText: this.getAttributionText(),
      // Per ADR: confidence is 'medium' for IGRAC even on a hit, reflecting
      // national-agency reporting cadence (1-3 year vintage drift).
      confidence: 'medium',
      dataDate,
      summaryData: {
        groundwater_depth_m: depthM,
        station_nearest_km: km,
        station_id: nearest.station_id,
        station_count: rows.length,
        ingest_vintage: nearest.ingest_vintage,
        measurement_date: dataDate,
        vintage_caveat:
          'IGRAC GGIS aggregates national-agency reporting; data may lag current conditions by 1-3 years.',
      },
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'IGRAC — Global Groundwater Information System (GGIS)';
  }
}

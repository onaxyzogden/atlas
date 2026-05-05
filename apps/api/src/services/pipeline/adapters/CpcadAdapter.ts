/**
 * CpcadAdapter — CA-tier conservation overlay from the Canadian Protected
 * and Conserved Areas Database (CPCAD).
 *
 * Data source: Environment and Climate Change Canada, CPCAD 2025
 * https://open.canada.ca/data/en/dataset/6c343726-1e92-451a-876a-76e17d398a1c
 * Licence: Open Government Licence — Canada (OGL-Canada 2.0)
 *
 * Like IgracGroundwaterAdapter, this adapter does NOT call an external API
 * at request time. It reads from the local PostGIS table
 * `conservation_overlay_features` (migrations 024 + 025), populated by the
 * annual `cpcad-ingest` job. Request path stays inside Atlas's own infra.
 *
 * Per ADR 2026-05-04-tiered-conservation-overlay (Phase 8.2-B.4):
 *   - source = 'CPCAD' in conservation_overlay_features.
 *   - Returns all features intersecting the parcel bbox (not just nearest).
 *   - Per-feature provenance: designation_type, iucn_cat, pa_oecm_df, area_ha.
 *   - Confidence: 'high' on hit (OGL-CA 2.0, annual refresh, no vintage drift);
 *     'low' on empty result (no features within bbox).
 *   - ECCC ESG ("Ecological Gift") features are a TYPE_E subset within CPCAD;
 *     no separate ECCC ESG adapter is needed.
 *
 * Schema (per migration 024/025 + ogrinfo verification 2026-05-04):
 *   source_record_id = ZONE_ID::text
 *   designation_name = NAME_E
 *   designation_type = TYPE_E
 *   attribution      = MGMT_E
 *   last_updated     = QUALYEAR or ESTYEAR (stored as DATE in migration)
 *   ingest_vintage   = 'YYYY' e.g. '2025'
 *   raw_attributes   = { iucn_cat, pa_oecm_df, area_ha, jurisdiction, ipca }
 *   geom             = geometry(Geometry, 4326) — reprojected from Canada Albers
 *                      by the ingest job
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

const logger = pino({ name: 'CpcadAdapter' });

// Bbox half-width in degrees. ~55 km at mid-latitudes; matches IGRAC adapter.
// CPCAD features are polygon geometries so this is the parcel-search radius,
// not the geometry CRS tolerance.
const BBOX_DEGREES = 0.5;

interface FeatureRow {
  source_record_id: string;
  designation_name: string | null;
  designation_type: string;
  attribution: string | null;
  last_updated: Date | null;
  ingest_vintage: string;
  raw_attributes: {
    iucn_cat?: number | null;
    pa_oecm_df?: number | null;
    area_ha?: number | null;
    jurisdiction?: string | null;
    ipca?: number | null;
  };
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

  let minLat = Infinity, maxLat = -Infinity,
    minLng = Infinity, maxLng = -Infinity;
  for (const [lng, lat] of allCoords) {
    if (lat! < minLat) minLat = lat!;
    if (lat! > maxLat) maxLat = lat!;
    if (lng! < minLng) minLng = lng!;
    if (lng! > maxLng) maxLng = lng!;
  }
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

/** Map CPCAD PA_OECM_DF integer code to a human-readable label. */
function paOecmLabel(code: number | null | undefined): string {
  if (code === 1) return 'Protected Area';
  if (code === 2) return 'Other Effective Area-Based Conservation Measure (OECM)';
  return 'Unknown';
}

/** Map CPCAD IUCN_CAT integer code to the standard string. */
function iucnCatLabel(code: number | null | undefined): string {
  const labels: Record<number, string> = {
    1: 'Ia — Strict Nature Reserve',
    2: 'Ib — Wilderness Area',
    3: 'II — National Park',
    4: 'III — Natural Monument',
    5: 'IV — Habitat/Species Management',
    6: 'V — Protected Landscape/Seascape',
    7: 'VI — Managed Resource Protected Area',
    8: 'Not Applicable',
    9: 'Not Assigned',
    10: 'Not Reported',
  };
  return labels[code ?? 0] ?? 'Unknown';
}

export class CpcadAdapter implements DataSourceAdapter {
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
    logger.info({ lat, lng }, 'Querying CPCAD conservation_overlay_features');

    const minLat = lat - BBOX_DEGREES;
    const maxLat = lat + BBOX_DEGREES;
    const minLng = lng - BBOX_DEGREES;
    const maxLng = lng + BBOX_DEGREES;

    // Bbox && hits the GIST index; actual polygon/bbox intersection check.
    // We return ALL features within the bbox (not just nearest) because the
    // diagnosis report renders every overlapping designation on the parcel.
    const rows = await this.db<FeatureRow[]>`
      SELECT
        source_record_id,
        designation_name,
        designation_type,
        attribution,
        last_updated,
        ingest_vintage,
        raw_attributes
      FROM conservation_overlay_features
      WHERE source = 'CPCAD'
        AND geom && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
      ORDER BY (raw_attributes->>'area_ha')::numeric DESC NULLS LAST
      LIMIT 20
    `;

    if (rows.length === 0) {
      logger.info({ lat, lng }, 'No CPCAD features within bbox');
      return {
        layerType: this.layerType,
        sourceApi: 'CPCAD (ECCC)',
        attributionText: this.getAttributionText(),
        confidence: 'low',
        dataDate: null,
        summaryData: {
          feature_count: 0,
          features: [],
          heuristic_note: 'No CPCAD protected or conserved areas found within 0.5° of parcel centroid.',
        },
      };
    }

    // Latest ingest_vintage from any returned row (all should be the same vintage
    // within a given ingest run; take the max to be safe).
    const ingestVintage = rows.reduce(
      (max, r) => (r.ingest_vintage > max ? r.ingest_vintage : max),
      '',
    );

    const features = rows.map((r) => ({
      source_record_id: r.source_record_id,
      designation_name: r.designation_name ?? null,
      designation_type: r.designation_type,
      attribution: r.attribution ?? null,
      last_updated: r.last_updated instanceof Date
        ? r.last_updated.toISOString().split('T')[0] ?? null
        : null,
      iucn_cat_code: r.raw_attributes.iucn_cat ?? null,
      iucn_cat_label: iucnCatLabel(r.raw_attributes.iucn_cat),
      pa_oecm_label: paOecmLabel(r.raw_attributes.pa_oecm_df),
      area_ha: r.raw_attributes.area_ha != null
        ? Math.round(Number(r.raw_attributes.area_ha) * 10) / 10
        : null,
      jurisdiction: r.raw_attributes.jurisdiction ?? null,
      ipca: r.raw_attributes.ipca === 1,
    }));

    // dataDate = most recent last_updated across returned features
    const latestDate = rows
      .map((r) => r.last_updated)
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const dataDate = latestDate
      ? latestDate.toISOString().split('T')[0] ?? null
      : null;

    const legalCount = rows.filter((r) => r.raw_attributes.pa_oecm_df === 1).length;
    const oecmCount  = rows.filter((r) => r.raw_attributes.pa_oecm_df === 2).length;

    logger.info(
      { features: rows.length, legalCount, oecmCount, vintage: ingestVintage },
      'CPCAD fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: 'CPCAD (ECCC)',
      attributionText: this.getAttributionText(),
      confidence: 'high',
      dataDate,
      summaryData: {
        feature_count: rows.length,
        legal_pa_count: legalCount,
        oecm_count: oecmCount,
        ingest_vintage: ingestVintage,
        features,
        vintage_note: `CPCAD vintage ${ingestVintage} — annual refresh; designation currency reflects ECCC publication date.`,
      },
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'Contains information licensed under the Open Government Licence — Canada. Source: Canadian Protected and Conserved Areas Database (CPCAD), Environment and Climate Change Canada.';
  }
}

/**
 * WatershedRefinementProcessor — orchestrates 5 watershed-derived analyses
 * and stores results in project_layers with layer_type 'watershed_derived'.
 *
 * Triggered as a BullMQ job after both elevation and watershed Tier 1 fetches
 * complete. Reuses ElevationGridReader for raster acquisition and hydro.ts
 * algorithms for D8 flow direction / accumulation.
 */

import type postgres from 'postgres';
import { readElevationGrid } from './ElevationGridReader.js';
import {
  precomputeWatershedGrids,
  computeRunoffAccumulation,
  computeFloodAccumulation,
  computeDrainageDivides,
  computePondCandidates,
  computeSwaleCandidates,
} from './algorithms/watershedRefinement.js';
import { binaryMaskToGeoJSON } from './gridToGeojson.js';
import type { Country } from '@ogden/shared';

interface ProjectWatershedContext {
  projectId: string;
  country: Country;
  bbox: [number, number, number, number];
  elevationConfidence: 'high' | 'medium' | 'low';
  watershedConfidence: 'high' | 'medium' | 'low';
}

export class WatershedRefinementProcessor {
  constructor(private readonly db: postgres.Sql) {}

  async process(projectId: string): Promise<void> {
    const ctx = await this.loadContext(projectId);
    if (!ctx) {
      throw new Error(`Project ${projectId}: missing boundary or source layers not ready`);
    }

    // Fetch elevation grid
    const grid = await readElevationGrid(ctx.bbox, ctx.country);

    // Pre-compute shared grids (D8 flow direction, flow accumulation, slope)
    const sharedGrids = precomputeWatershedGrids(grid);

    // Run all 5 analyses
    const runoff = computeRunoffAccumulation(grid, sharedGrids);
    const flood = computeFloodAccumulation(grid, sharedGrids);
    const divides = computeDrainageDivides(grid, sharedGrids);
    const ponds = computePondCandidates(grid, sharedGrids);
    const swales = computeSwaleCandidates(grid, sharedGrids);

    // Sprint F: Drainage density from flow accumulation grid
    const CHANNEL_THRESHOLD = 100; // flow accumulation cells — empirical channel proxy
    const { flowAcc } = sharedGrids;
    const totalCells = grid.width * grid.height;
    let channelCells = 0;
    for (let i = 0; i < flowAcc.length; i++) {
      if (flowAcc[i]! >= CHANNEL_THRESHOLD) channelCells++;
    }
    const resMKm = grid.resolution_m / 1000;
    const channelLengthKm = channelCells * resMKm;
    const catchmentAreaKm2 = totalCells * resMKm * resMKm;
    const drainageDensityKmPerKm2 = catchmentAreaKm2 > 0
      ? Math.round((channelLengthKm / catchmentAreaKm2) * 100) / 100
      : 0;
    const drainageDensityClass: 'Low' | 'Moderate' | 'High' | 'Very High' =
      drainageDensityKmPerKm2 < 1 ? 'Low'
      : drainageDensityKmPerKm2 < 2 ? 'Moderate'
      : drainageDensityKmPerKm2 < 5 ? 'High'
      : 'Very High';

    // Convert masks to GeoJSON for map rendering
    const floodGeojson = binaryMaskToGeoJSON(
      flood.detentionMask, grid.width, grid.height, grid.bbox, 'detention_zone',
    );
    const divideGeojson = binaryMaskToGeoJSON(
      divides.divideMask, grid.width, grid.height, grid.bbox, 'drainage_divide',
    );
    const pondGeojson = binaryMaskToGeoJSON(
      ponds.candidateMask, grid.width, grid.height, grid.bbox, 'pond_candidate',
    );
    const swaleGeojson = binaryMaskToGeoJSON(
      swales.swaleMask, grid.width, grid.height, grid.bbox, 'swale_candidate',
    );

    // Convert pond and swale candidates to point GeoJSON for labelling
    const pondPointFeatures = ponds.candidates.map((c, i) => ({
      type: 'Feature' as const,
      properties: {
        index: i,
        cellCount: c.cellCount,
        meanSlope: c.meanSlope,
        meanAccumulation: c.meanAccumulation,
        suitabilityScore: c.suitabilityScore,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: pixToGeo(c.centroidCol, c.centroidRow, grid.bbox, grid.width, grid.height),
      },
    }));

    const swaleLineFeatures = swales.candidates.map((c, i) => ({
      type: 'Feature' as const,
      properties: {
        index: i,
        lengthCells: c.lengthCells,
        meanSlope: c.meanSlope,
        elevation: c.elevation,
        suitabilityScore: c.suitabilityScore,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          pixToGeo(c.startCol, c.startRow, grid.bbox, grid.width, grid.height),
          pixToGeo(c.endCol, c.endRow, grid.bbox, grid.width, grid.height),
        ],
      },
    }));

    // Confidence: minimum of source elevation and watershed confidence
    const confidence = lowerConfidence(ctx.elevationConfidence, ctx.watershedConfidence);

    const dataSources = [grid.sourceApi, 'watershed_derived'];
    const computedAt = new Date().toISOString();

    // Assemble summary + geojson payloads
    const summaryData = {
      runoff: {
        maxAccumulation: runoff.maxAccumulation,
        meanAccumulation: runoff.meanAccumulation,
        highConcentrationPct: runoff.highConcentrationPct,
      },
      flood: {
        detentionZoneCount: flood.detentionZoneCount,
        detentionAreaPct: flood.detentionAreaPct,
        zones: flood.zones.map((z) => ({
          location: pixToGeo(z.centroidCol, z.centroidRow, grid.bbox, grid.width, grid.height),
          cellCount: z.cellCount,
          meanElevation: z.meanElevation,
          maxDepth: z.maxDepth,
        })),
      },
      drainageDivides: {
        divideCount: divides.divideCount,
        divideCellPct: divides.divideCellPct,
      },
      pondCandidates: {
        candidateCount: ponds.candidateCount,
        candidates: ponds.candidates.map((c) => ({
          location: pixToGeo(c.centroidCol, c.centroidRow, grid.bbox, grid.width, grid.height),
          cellCount: c.cellCount,
          meanSlope: c.meanSlope,
          meanAccumulation: c.meanAccumulation,
          suitabilityScore: c.suitabilityScore,
        })),
      },
      swaleCandidates: {
        candidateCount: swales.candidateCount,
        candidates: swales.candidates.map((c) => ({
          start: pixToGeo(c.startCol, c.startRow, grid.bbox, grid.width, grid.height),
          end: pixToGeo(c.endCol, c.endRow, grid.bbox, grid.width, grid.height),
          lengthCells: c.lengthCells,
          meanSlope: c.meanSlope,
          elevation: c.elevation,
          suitabilityScore: c.suitabilityScore,
        })),
      },
      drainageDensity: {
        drainageDensityKmPerKm2,
        drainageDensityClass,
      },
      confidence,
      dataSources,
      computedAt,
    };

    const geojsonData = {
      type: 'FeatureCollection',
      features: [
        ...floodGeojson.features,
        ...divideGeojson.features,
        ...pondGeojson.features,
        ...swaleGeojson.features,
        ...pondPointFeatures,
        ...swaleLineFeatures,
      ],
    };

    // UPSERT into project_layers as watershed_derived
    const dataDate = computedAt.split('T')[0] ?? computedAt;
    await this.db`
      INSERT INTO project_layers (
        project_id, layer_type, source_api, fetch_status,
        confidence, data_date, attribution_text,
        geojson_data, summary_data, metadata, fetched_at
      ) VALUES (
        ${ctx.projectId},
        'watershed_derived',
        ${grid.sourceApi + '+watershed'},
        'complete',
        ${confidence},
        ${dataDate},
        ${'Derived from elevation raster (' + grid.sourceApi + ') and watershed geometry'},
        ${JSON.stringify(geojsonData)},
        ${JSON.stringify(summaryData)},
        ${JSON.stringify({ resolution_m: grid.resolution_m, gridWidth: grid.width, gridHeight: grid.height })},
        now()
      )
      ON CONFLICT (project_id, layer_type) DO UPDATE SET
        source_api       = EXCLUDED.source_api,
        fetch_status     = EXCLUDED.fetch_status,
        confidence       = EXCLUDED.confidence,
        data_date        = EXCLUDED.data_date,
        attribution_text = EXCLUDED.attribution_text,
        geojson_data     = EXCLUDED.geojson_data,
        summary_data     = EXCLUDED.summary_data,
        metadata         = EXCLUDED.metadata,
        fetched_at       = EXCLUDED.fetched_at
    `;
  }

  private async loadContext(projectId: string): Promise<ProjectWatershedContext | null> {
    const [project] = await this.db`
      SELECT
        p.id, p.country,
        ST_XMin(p.parcel_boundary::geometry) AS min_lon,
        ST_YMin(p.parcel_boundary::geometry) AS min_lat,
        ST_XMax(p.parcel_boundary::geometry) AS max_lon,
        ST_YMax(p.parcel_boundary::geometry) AS max_lat
      FROM projects p
      WHERE p.id = ${projectId} AND p.parcel_boundary IS NOT NULL
    `;

    if (!project) return null;

    // Check that both source layers have been fetched
    const layers = await this.db`
      SELECT layer_type, confidence, fetch_status
      FROM project_layers
      WHERE project_id = ${projectId}
        AND layer_type IN ('elevation', 'watershed')
    `;

    const elevationLayer = layers.find((l) => (l as Record<string, unknown>).layer_type === 'elevation');
    const watershedLayer = layers.find((l) => (l as Record<string, unknown>).layer_type === 'watershed');

    // Proceed even if source layers are stubbed (ManualFlagAdapter) — the elevation
    // grid will be fetched live from 3DEP/NRCan regardless of project_layers status
    const elevConf = (elevationLayer?.confidence as 'high' | 'medium' | 'low') ?? 'low';
    const wsConf = (watershedLayer?.confidence as 'high' | 'medium' | 'low') ?? 'low';

    return {
      projectId,
      country: (project.country ?? 'US') as Country,
      bbox: [
        Number(project.min_lon),
        Number(project.min_lat),
        Number(project.max_lon),
        Number(project.max_lat),
      ],
      elevationConfidence: elevConf,
      watershedConfidence: wsConf,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function pixToGeo(
  col: number,
  row: number,
  bbox: [number, number, number, number],
  width: number,
  height: number,
): [number, number] {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return [
    minLon + (col / Math.max(1, width - 1)) * (maxLon - minLon),
    maxLat - (row / Math.max(1, height - 1)) * (maxLat - minLat),
  ];
}

function lowerConfidence(
  a: 'high' | 'medium' | 'low',
  b: 'high' | 'medium' | 'low',
): 'high' | 'medium' | 'low' {
  const rank = { high: 2, medium: 1, low: 0 };
  const minRank = Math.min(rank[a], rank[b]);
  return minRank === 2 ? 'high' : minRank === 1 ? 'medium' : 'low';
}

/**
 * MicroclimateProcessor — orchestrates 5 microclimate analyses and stores
 * results in project_layers with layer_type 'microclimate'.
 *
 * Triggered as a BullMQ job after terrain analysis completes. Reuses:
 *   - TPI outputs from terrain_analysis table
 *   - Frost pocket probability from terrain_analysis table
 *   - Flow accumulation from watershed_derived project_layer
 *   - Climate normals from climate project_layer
 *   - Soil drainage from soils project_layer
 *   - ElevationGridReader for raster acquisition
 *
 * Confidence inherits from the lowest-confidence source among
 * elevation, climate, and soils layers.
 */

import type postgres from 'postgres';
import { readElevationGrid } from './ElevationGridReader.js';
import {
  computeSunTraps,
  computeMoistureZones,
  computeWindShelter,
  computeFrostRisk,
  computeOutdoorComfort,
  type ClimateContext,
  type SoilDrainageContext,
  type TPIContext,
  type FrostPocketContext,
  type FlowAccContext,
} from './algorithms/microclimate.js';
import {
  classifiedGridToGeoJSON,
  binaryMaskToGeoJSON,
  probabilityGridToGeoJSON,
} from './gridToGeojson.js';
import type { Country } from '@ogden/shared';

interface MicroclimateContext {
  projectId: string;
  country: Country;
  bbox: [number, number, number, number];
  tpi: TPIContext;
  frostPocket: FrostPocketContext;
  flowAcc: FlowAccContext;
  climate: ClimateContext;
  soilDrainage: SoilDrainageContext;
  sourceConfidences: Array<'high' | 'medium' | 'low'>;
}

export class MicroclimateProcessor {
  constructor(private readonly db: postgres.Sql) {}

  async process(projectId: string): Promise<void> {
    const ctx = await this.loadContext(projectId);
    if (!ctx) {
      throw new Error(`Project ${projectId}: missing terrain analysis, climate, or boundary data`);
    }

    // Fetch elevation grid (reuses ElevationGridReader)
    const grid = await readElevationGrid(ctx.bbox, ctx.country);

    // Run all 5 microclimate analyses
    const sunTrap = computeSunTraps(grid, ctx.tpi);
    const moistureZones = computeMoistureZones(grid, ctx.flowAcc, ctx.soilDrainage);
    const windShelter = computeWindShelter(grid, ctx.tpi, ctx.climate);
    const frostRisk = computeFrostRisk(grid, ctx.frostPocket, ctx.tpi, ctx.climate);
    const comfort = computeOutdoorComfort(grid, sunTrap, windShelter, frostRisk, ctx.climate);

    // Convert to GeoJSON
    const sunTrapGeojson = binaryMaskToGeoJSON(
      sunTrap.sunTrapMask, grid.width, grid.height, grid.bbox, 'sun_trap',
    );

    const moistureGeojson = classifiedGridToGeoJSON(
      moistureZones.classGrid, grid.width, grid.height, grid.bbox,
      [
        { value: 0, label: 'dry' },
        { value: 1, label: 'moderate' },
        { value: 2, label: 'moist' },
        { value: 3, label: 'wet' },
      ],
    );

    const windShelterGeojson = binaryMaskToGeoJSON(
      windShelter.shelterMask, grid.width, grid.height, grid.bbox, 'wind_sheltered',
    );

    const frostRiskGeojson = classifiedGridToGeoJSON(
      frostRisk.riskGrid, grid.width, grid.height, grid.bbox,
      [
        { value: 0, label: 'minimal_risk' },
        { value: 1, label: 'low_risk' },
        { value: 2, label: 'moderate_risk' },
        { value: 3, label: 'high_risk' },
      ],
    );

    // Comfort grid: quantise into bands for GeoJSON
    const comfortQuantised = new Int8Array(grid.width * grid.height).fill(-1);
    for (let i = 0; i < comfort.comfortGrid.length; i++) {
      const v = comfort.comfortGrid[i]!;
      if (v <= 0) continue;
      if (v < 25) comfortQuantised[i] = 0;
      else if (v < 50) comfortQuantised[i] = 1;
      else if (v < 75) comfortQuantised[i] = 2;
      else comfortQuantised[i] = 3;
    }
    const comfortGeojson = classifiedGridToGeoJSON(
      comfortQuantised, grid.width, grid.height, grid.bbox,
      [
        { value: 0, label: 'uncomfortable' },
        { value: 1, label: 'marginal' },
        { value: 2, label: 'comfortable' },
        { value: 3, label: 'ideal' },
      ],
    );

    // Confidence: minimum across elevation, climate, soils
    const confidence = lowestConfidence(ctx.sourceConfidences);

    const dataSources = [grid.sourceApi, 'terrain_analysis', 'climate', 'soils', 'watershed_derived'];
    const computedAt = new Date().toISOString();

    const summaryData = {
      sunTraps: {
        areaPct: sunTrap.sunTrapAreaPct,
        hotspotCount: sunTrap.hotspotCount,
      },
      moistureZones: {
        classification: moistureZones.classification,
        dominantClass: moistureZones.dominantClass,
      },
      windShelter: {
        shelteredAreaPct: windShelter.shelteredAreaPct,
        dominantExposure: windShelter.dominantExposure,
        prevailingWindDir: ctx.climate.prevailingWindDir,
      },
      frostRisk: {
        classification: frostRisk.riskClassification,
        extendedFrostDays: frostRisk.extendedFrostDays,
        effectiveGrowingSeason: frostRisk.effectiveGrowingSeason,
        climateGrowingSeason: ctx.climate.growingSeasonDays,
      },
      outdoorComfort: {
        annualMeanScore: comfort.annualMeanScore,
        bestSeason: comfort.bestSeason,
        seasonalScores: comfort.seasonalScores,
      },
      confidence,
      dataSources,
      computedAt,
    };

    const geojsonData = {
      type: 'FeatureCollection',
      features: [
        ...sunTrapGeojson.features,
        ...moistureGeojson.features,
        ...windShelterGeojson.features,
        ...frostRiskGeojson.features,
        ...comfortGeojson.features,
      ],
    };

    const dataDate = computedAt.split('T')[0] ?? computedAt;

    // UPSERT into project_layers as microclimate
    await this.db`
      INSERT INTO project_layers (
        project_id, layer_type, source_api, fetch_status,
        confidence, data_date, attribution_text,
        geojson_data, summary_data, metadata, fetched_at
      ) VALUES (
        ${ctx.projectId},
        'microclimate',
        ${'derived_microclimate'},
        'complete',
        ${confidence},
        ${dataDate},
        ${'Derived from terrain analysis, climate normals, soil drainage, and watershed data'},
        ${this.db.json(geojsonData as never) as unknown as string},
        ${this.db.json(summaryData as never) as unknown as string},
        ${this.db.json({
          resolution_m: grid.resolution_m,
          gridWidth: grid.width,
          gridHeight: grid.height,
          sourceLayerCount: dataSources.length,
        } as never) as unknown as string},
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

  private async loadContext(projectId: string): Promise<MicroclimateContext | null> {
    // Load project boundary
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

    const country = (project.country ?? 'US') as Country;
    const bbox: [number, number, number, number] = [
      Number(project.min_lon),
      Number(project.min_lat),
      Number(project.max_lon),
      Number(project.max_lat),
    ];

    // Load terrain analysis (TPI + frost pocket outputs)
    const [terrain] = await this.db`
      SELECT
        tpi_classification, tpi_dominant_class, tpi_geojson,
        frost_pocket_area_pct, frost_pocket_severity, frost_pocket_geojson,
        confidence AS terrain_confidence
      FROM terrain_analysis
      WHERE project_id = ${projectId}
    `;

    if (!terrain) return null; // terrain analysis must complete first

    // Load source layer confidences + data
    const layers = await this.db`
      SELECT layer_type, confidence, summary_data, geojson_data
      FROM project_layers
      WHERE project_id = ${projectId}
        AND layer_type IN ('elevation', 'climate', 'soils', 'watershed_derived')
    `;

    const getLayer = (type: string) =>
      layers.find((l) => (l as Record<string, unknown>).layer_type === type);

    const elevationLayer = getLayer('elevation');
    const climateLayer = getLayer('climate');
    const soilsLayer = getLayer('soils');
    const watershedDerived = getLayer('watershed_derived');

    // Extract confidences from available layers
    const sourceConfidences: Array<'high' | 'medium' | 'low'> = [];
    sourceConfidences.push((terrain.terrain_confidence as 'high' | 'medium' | 'low') ?? 'low');
    if (elevationLayer) sourceConfidences.push((elevationLayer.confidence as 'high' | 'medium' | 'low') ?? 'low');
    if (climateLayer) sourceConfidences.push((climateLayer.confidence as 'high' | 'medium' | 'low') ?? 'low');
    if (soilsLayer) sourceConfidences.push((soilsLayer.confidence as 'high' | 'medium' | 'low') ?? 'low');

    // Parse climate data (use defaults if layer is stub/unavailable)
    const climateSummary = climateLayer?.summary_data as Record<string, unknown> | null;
    const climate: ClimateContext = {
      meanTempC: (climateSummary?.meanTempC as number) ?? (country === 'CA' ? 5 : 15),
      prevailingWindDir: (climateSummary?.prevailingWindDir as number) ?? 270, // default: westerly
      avgWindSpeedMs: (climateSummary?.avgWindSpeedMs as number) ?? 4.0,
      lastSpringFrostDoy: (climateSummary?.lastSpringFrostDoy as number) ?? (country === 'CA' ? 140 : 100),
      firstFallFrostDoy: (climateSummary?.firstFallFrostDoy as number) ?? (country === 'CA' ? 270 : 300),
      growingSeasonDays: (climateSummary?.growingSeasonDays as number) ?? (country === 'CA' ? 130 : 200),
    };

    // Parse soil drainage (use defaults if layer is stub)
    const soilSummary = soilsLayer?.summary_data as Record<string, unknown> | null;
    const soilDrainage: SoilDrainageContext = {
      drainageClass: (soilSummary?.drainageClass as SoilDrainageContext['drainageClass']) ?? 'moderate',
      drainageScore: (soilSummary?.drainageScore as number) ?? 0.5,
    };

    // Reconstruct TPI grid from terrain analysis geojson
    // Since we stored classification but not raw grid, use a placeholder grid
    // that assigns TPI class based on the terrain analysis classification percentages
    const tpiClassification = terrain.tpi_classification as Record<string, number> | null;
    const gridSize = estimateGridSize(bbox);
    const tpiClassGrid = new Int8Array(gridSize.width * gridSize.height).fill(3); // default: flat

    // If we have the TPI geojson, reconstruct the class grid from it
    const tpiGeojson = terrain.tpi_geojson as { features?: Array<{ properties?: { classValue?: number }; geometry?: { coordinates?: unknown } }> } | null;
    if (tpiGeojson?.features) {
      reconstructClassGridFromGeojson(tpiClassGrid, tpiGeojson, bbox, gridSize.width, gridSize.height);
    }

    const tpi: TPIContext = {
      classGrid: tpiClassGrid,
      width: gridSize.width,
      height: gridSize.height,
    };

    // Reconstruct frost pocket probability grid
    const frostProbGrid = new Float32Array(gridSize.width * gridSize.height);
    const frostGeojson = terrain.frost_pocket_geojson as { features?: Array<{ properties?: { severity?: string; classValue?: number }; geometry?: { coordinates?: unknown } }> } | null;
    if (frostGeojson?.features) {
      reconstructProbGridFromGeojson(frostProbGrid, frostGeojson, bbox, gridSize.width, gridSize.height);
    }

    const frostPocket: FrostPocketContext = {
      probabilityGrid: frostProbGrid,
      severity: (terrain.frost_pocket_severity as FrostPocketContext['severity']) ?? 'none',
      width: gridSize.width,
      height: gridSize.height,
    };

    // Flow accumulation from watershed_derived
    const wsSummary = watershedDerived?.summary_data as Record<string, unknown> | null;
    const runoffData = wsSummary?.runoff as Record<string, number> | null;
    // Create a uniform flow accumulation estimate based on summary stats
    const meanAcc = runoffData?.meanAccumulation ?? 10;
    const flowAccGrid = new Float32Array(gridSize.width * gridSize.height).fill(meanAcc);

    const flowAcc: FlowAccContext = {
      accumulationGrid: flowAccGrid,
      width: gridSize.width,
      height: gridSize.height,
    };

    return {
      projectId,
      country,
      bbox,
      tpi,
      frostPocket,
      flowAcc,
      climate,
      soilDrainage,
      sourceConfidences,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function lowestConfidence(
  levels: Array<'high' | 'medium' | 'low'>,
): 'high' | 'medium' | 'low' {
  const rank = { high: 2, medium: 1, low: 0 };
  let min = 2;
  for (const l of levels) {
    const r = rank[l] ?? 0;
    if (r < min) min = r;
  }
  return min === 2 ? 'high' : min === 1 ? 'medium' : 'low';
}

function estimateGridSize(bbox: [number, number, number, number]): { width: number; height: number } {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const centerLat = (minLat + maxLat) / 2;
  const latSpanM = (maxLat - minLat) * 111320;
  const lngSpanM = (maxLon - minLon) * 111320 * Math.cos((centerLat * Math.PI) / 180);

  let w = Math.round(lngSpanM);
  let h = Math.round(latSpanM);
  const MAX = 512;
  if (w > MAX || h > MAX) {
    const scale = MAX / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  return { width: Math.max(2, w), height: Math.max(2, h) };
}

/**
 * Reconstruct a classified grid from stored GeoJSON polygon features.
 * Each feature has a classValue property and a bounding rectangle geometry.
 */
function reconstructClassGridFromGeojson(
  grid: Int8Array,
  geojson: { features?: Array<{ properties?: { classValue?: number }; geometry?: { coordinates?: unknown } }> },
  bbox: [number, number, number, number],
  width: number,
  height: number,
): void {
  if (!geojson.features) return;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const cellW = (maxLon - minLon) / width;
  const cellH = (maxLat - minLat) / height;

  for (const feature of geojson.features) {
    const classValue = feature.properties?.classValue;
    if (classValue === undefined || classValue === null) continue;

    const coords = feature.geometry?.coordinates as number[][][] | undefined;
    if (!coords || !coords[0] || coords[0].length < 4) continue;

    // Extract bounding rectangle from polygon ring
    let fMinLon = Infinity, fMaxLon = -Infinity, fMinLat = Infinity, fMaxLat = -Infinity;
    for (const pt of coords[0]) {
      if (pt[0]! < fMinLon) fMinLon = pt[0]!;
      if (pt[0]! > fMaxLon) fMaxLon = pt[0]!;
      if (pt[1]! < fMinLat) fMinLat = pt[1]!;
      if (pt[1]! > fMaxLat) fMaxLat = pt[1]!;
    }

    // Convert to grid cells
    const col0 = Math.max(0, Math.floor((fMinLon - minLon) / cellW));
    const col1 = Math.min(width - 1, Math.ceil((fMaxLon - minLon) / cellW));
    const row0 = Math.max(0, Math.floor((maxLat - fMaxLat) / cellH));
    const row1 = Math.min(height - 1, Math.ceil((maxLat - fMinLat) / cellH));

    for (let r = row0; r <= row1; r++) {
      for (let c = col0; c <= col1; c++) {
        grid[r * width + c] = classValue;
      }
    }
  }
}

/**
 * Reconstruct a probability grid from stored severity-banded GeoJSON.
 */
function reconstructProbGridFromGeojson(
  grid: Float32Array,
  geojson: { features?: Array<{ properties?: { severity?: string; classValue?: number }; geometry?: { coordinates?: unknown } }> },
  bbox: [number, number, number, number],
  width: number,
  height: number,
): void {
  if (!geojson.features) return;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const cellW = (maxLon - minLon) / width;
  const cellH = (maxLat - minLat) / height;

  // Severity band to probability midpoint
  const severityToProb: Record<string, number> = {
    low: 0.17, low_probability: 0.17,
    medium: 0.5, medium_probability: 0.5,
    high: 0.83, high_probability: 0.83,
  };

  for (const feature of geojson.features) {
    const severity = feature.properties?.severity as string | undefined;
    const prob = severity ? (severityToProb[severity] ?? 0.5) : 0.5;

    const coords = feature.geometry?.coordinates as number[][][] | undefined;
    if (!coords || !coords[0] || coords[0].length < 4) continue;

    let fMinLon = Infinity, fMaxLon = -Infinity, fMinLat = Infinity, fMaxLat = -Infinity;
    for (const pt of coords[0]) {
      if (pt[0]! < fMinLon) fMinLon = pt[0]!;
      if (pt[0]! > fMaxLon) fMaxLon = pt[0]!;
      if (pt[1]! < fMinLat) fMinLat = pt[1]!;
      if (pt[1]! > fMaxLat) fMaxLat = pt[1]!;
    }

    const col0 = Math.max(0, Math.floor((fMinLon - minLon) / cellW));
    const col1 = Math.min(width - 1, Math.ceil((fMaxLon - minLon) / cellW));
    const row0 = Math.max(0, Math.floor((maxLat - fMaxLat) / cellH));
    const row1 = Math.min(height - 1, Math.ceil((maxLat - fMinLat) / cellH));

    for (let r = row0; r <= row1; r++) {
      for (let c = col0; c <= col1; c++) {
        grid[r * width + c] = prob;
      }
    }
  }
}

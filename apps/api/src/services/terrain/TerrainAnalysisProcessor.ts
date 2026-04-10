/**
 * TerrainAnalysisProcessor — orchestrates all 5 terrain analyses
 * for a given project, writes results to the terrain_analysis table.
 *
 * Called by the BullMQ terrain worker after elevation data is available.
 */

import type postgres from 'postgres';
import { readElevationGrid, type ElevationGrid } from './ElevationGridReader.js';
import { computeCurvature } from './algorithms/curvature.js';
import { computeViewshed } from './algorithms/viewshed.js';
import { computeFrostPocketProbability } from './algorithms/frostPocket.js';
import { computeColdAirDrainage } from './algorithms/coldAirDrainage.js';
import { computeTPI } from './algorithms/tpi.js';
import {
  classifiedGridToGeoJSON,
  binaryMaskToGeoJSON,
  flowPathsToGeoJSON,
  polygonRingsToGeoJSON,
  probabilityGridToGeoJSON,
} from './gridToGeojson.js';
import type { Country } from '@ogden/shared';

interface ProjectTerrainContext {
  projectId: string;
  country: Country;
  bbox: [number, number, number, number];
  centroidLng: number;
  centroidLat: number;
}

export class TerrainAnalysisProcessor {
  constructor(private readonly db: postgres.Sql) {}

  async process(projectId: string): Promise<void> {
    const ctx = await this.loadContext(projectId);
    if (!ctx) {
      throw new Error(`Project ${projectId} not found or has no boundary`);
    }

    // Fetch elevation grid
    const grid = await readElevationGrid(ctx.bbox, ctx.country);

    // Run all 5 analyses in parallel
    const [curvature, viewshed, frostPocket, coldAir, tpi] = await Promise.all([
      Promise.resolve(computeCurvature(grid)),
      Promise.resolve(computeViewshed(grid, [ctx.centroidLng, ctx.centroidLat])),
      Promise.resolve(computeFrostPocketProbability(grid)),
      Promise.resolve(computeColdAirDrainage(grid)),
      Promise.resolve(computeTPI(grid)),
    ]);

    // Convert grids to GeoJSON
    const curvatureGeojson = classifiedGridToGeoJSON(
      curvature.classifiedGrid, grid.width, grid.height, grid.bbox,
      [
        { value: -1, label: 'ridgeline' },
        { value: 0, label: 'planar' },
        { value: 1, label: 'valley' },
        { value: 2, label: 'saddle' },
      ],
    );

    const viewshedGeojson = binaryMaskToGeoJSON(
      viewshed.visibleMask, grid.width, grid.height, grid.bbox, 'visible',
    );

    const frostPocketGeojson = probabilityGridToGeoJSON(
      frostPocket.probabilityGrid, grid.width, grid.height, grid.bbox,
    );

    const coldAirPathsGeojson = flowPathsToGeoJSON(coldAir.flowPaths);
    const coldAirPoolingGeojson = polygonRingsToGeoJSON(coldAir.poolingZones);

    const tpiGeojson = classifiedGridToGeoJSON(
      tpi.classGrid, grid.width, grid.height, grid.bbox,
      [
        { value: 0, label: 'ridge' },
        { value: 1, label: 'upper_slope' },
        { value: 2, label: 'mid_slope' },
        { value: 3, label: 'flat' },
        { value: 4, label: 'lower_slope' },
        { value: 5, label: 'valley' },
      ],
    );

    // Compute basic elevation stats from the grid
    let minElev = Infinity, maxElev = -Infinity, sumElev = 0, validCount = 0;
    for (let i = 0; i < grid.data.length; i++) {
      const v = grid.data[i]!;
      if (v === grid.noDataValue || v < -1000) continue;
      if (v < minElev) minElev = v;
      if (v > maxElev) maxElev = v;
      sumElev += v;
      validCount++;
    }
    const meanElev = validCount > 0 ? sumElev / validCount : 0;

    const dataSources = [grid.sourceApi];

    // UPSERT into terrain_analysis
    await this.db`
      INSERT INTO terrain_analysis (
        project_id,
        elevation_min_m, elevation_max_m, elevation_mean_m,
        curvature_profile_mean, curvature_plan_mean,
        curvature_classification, curvature_geojson,
        viewshed_visible_pct, viewshed_observer_point, viewshed_geojson,
        frost_pocket_area_pct, frost_pocket_severity, frost_pocket_geojson,
        cold_air_drainage_paths, cold_air_pooling_zones, cold_air_risk_rating,
        tpi_classification, tpi_dominant_class, tpi_geojson,
        source_api, confidence, data_sources,
        computed_at
      ) VALUES (
        ${ctx.projectId},
        ${Math.round(minElev * 100) / 100},
        ${Math.round(maxElev * 100) / 100},
        ${Math.round(meanElev * 100) / 100},
        ${Math.round(curvature.profileMean * 10000) / 10000},
        ${Math.round(curvature.planMean * 10000) / 10000},
        ${JSON.stringify(curvature.classification)},
        ${JSON.stringify(curvatureGeojson)},
        ${viewshed.visiblePct},
        ${`SRID=4326;POINT(${viewshed.observerPoint[0]} ${viewshed.observerPoint[1]})`},
        ${JSON.stringify(viewshedGeojson)},
        ${frostPocket.areaPct},
        ${frostPocket.severity},
        ${JSON.stringify(frostPocketGeojson)},
        ${JSON.stringify(coldAirPathsGeojson)},
        ${JSON.stringify(coldAirPoolingGeojson)},
        ${coldAir.riskRating},
        ${JSON.stringify(tpi.classification)},
        ${tpi.dominantClass},
        ${JSON.stringify(tpiGeojson)},
        ${grid.sourceApi},
        ${grid.confidence},
        ${dataSources},
        ${new Date().toISOString()}
      )
      ON CONFLICT (project_id) DO UPDATE SET
        elevation_min_m = EXCLUDED.elevation_min_m,
        elevation_max_m = EXCLUDED.elevation_max_m,
        elevation_mean_m = EXCLUDED.elevation_mean_m,
        curvature_profile_mean = EXCLUDED.curvature_profile_mean,
        curvature_plan_mean = EXCLUDED.curvature_plan_mean,
        curvature_classification = EXCLUDED.curvature_classification,
        curvature_geojson = EXCLUDED.curvature_geojson,
        viewshed_visible_pct = EXCLUDED.viewshed_visible_pct,
        viewshed_observer_point = EXCLUDED.viewshed_observer_point,
        viewshed_geojson = EXCLUDED.viewshed_geojson,
        frost_pocket_area_pct = EXCLUDED.frost_pocket_area_pct,
        frost_pocket_severity = EXCLUDED.frost_pocket_severity,
        frost_pocket_geojson = EXCLUDED.frost_pocket_geojson,
        cold_air_drainage_paths = EXCLUDED.cold_air_drainage_paths,
        cold_air_pooling_zones = EXCLUDED.cold_air_pooling_zones,
        cold_air_risk_rating = EXCLUDED.cold_air_risk_rating,
        tpi_classification = EXCLUDED.tpi_classification,
        tpi_dominant_class = EXCLUDED.tpi_dominant_class,
        tpi_geojson = EXCLUDED.tpi_geojson,
        source_api = EXCLUDED.source_api,
        confidence = EXCLUDED.confidence,
        data_sources = EXCLUDED.data_sources,
        computed_at = EXCLUDED.computed_at
    `;
  }

  private async loadContext(projectId: string): Promise<ProjectTerrainContext | null> {
    const [project] = await this.db`
      SELECT
        id, country,
        ST_XMin(parcel_boundary::geometry) AS min_lon,
        ST_YMin(parcel_boundary::geometry) AS min_lat,
        ST_XMax(parcel_boundary::geometry) AS max_lon,
        ST_YMax(parcel_boundary::geometry) AS max_lat,
        ST_X(centroid::geometry) AS centroid_lng,
        ST_Y(centroid::geometry) AS centroid_lat
      FROM projects
      WHERE id = ${projectId} AND parcel_boundary IS NOT NULL
    `;

    if (!project) return null;

    return {
      projectId,
      country: (project.country ?? 'US') as Country,
      bbox: [
        Number(project.min_lon),
        Number(project.min_lat),
        Number(project.max_lon),
        Number(project.max_lat),
      ],
      centroidLng: Number(project.centroid_lng),
      centroidLat: Number(project.centroid_lat),
    };
  }
}

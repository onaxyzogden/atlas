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
import { computeTWI } from './algorithms/twi.js';
import { computeTRI } from './algorithms/tri.js';
import { computeErosionHazard } from './algorithms/erosionHazard.js';
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
    const [curvature, viewshed, frostPocket, coldAir, tpi, twi, tri, erosion] = await Promise.all([
      Promise.resolve(computeCurvature(grid)),
      Promise.resolve(computeViewshed(grid, [ctx.centroidLng, ctx.centroidLat])),
      Promise.resolve(computeFrostPocketProbability(grid)),
      Promise.resolve(computeColdAirDrainage(grid)),
      Promise.resolve(computeTPI(grid)),
      Promise.resolve(computeTWI(grid)),
      Promise.resolve(computeTRI(grid)),
      Promise.resolve(computeErosionHazard(grid)),
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

    const twiGeojson = classifiedGridToGeoJSON(
      twi.classGrid, grid.width, grid.height, grid.bbox,
      [
        { value: 0, label: 'very_dry' },
        { value: 1, label: 'dry' },
        { value: 2, label: 'moist' },
        { value: 3, label: 'wet' },
        { value: 4, label: 'very_wet' },
      ],
    );

    const triGeojson = classifiedGridToGeoJSON(
      tri.classGrid, grid.width, grid.height, grid.bbox,
      [
        { value: 0, label: 'level' },
        { value: 1, label: 'nearly_level' },
        { value: 2, label: 'slightly_rugged' },
        { value: 3, label: 'intermediately_rugged' },
        { value: 4, label: 'moderately_rugged' },
        { value: 5, label: 'highly_rugged' },
        { value: 6, label: 'extremely_rugged' },
      ],
    );

    const erosionGeojson = classifiedGridToGeoJSON(
      erosion.classGrid, grid.width, grid.height, grid.bbox,
      [
        { value: 0, label: 'very_low' },
        { value: 1, label: 'low' },
        { value: 2, label: 'moderate' },
        { value: 3, label: 'high' },
        { value: 4, label: 'very_high' },
        { value: 5, label: 'severe' },
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
        twi_mean, twi_classification, twi_dominant_class, twi_geojson,
        tri_mean_m, tri_classification, tri_dominant_class, tri_geojson,
        erosion_mean_t_ha_yr, erosion_max_t_ha_yr,
        erosion_classification, erosion_dominant_class, erosion_geojson, erosion_confidence,
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
        ${twi.meanTWI},
        ${JSON.stringify(twi.classification)},
        ${twi.dominantClass},
        ${JSON.stringify(twiGeojson)},
        ${tri.meanTRI_m},
        ${JSON.stringify(tri.classification)},
        ${tri.dominantClass},
        ${JSON.stringify(triGeojson)},
        ${erosion.meanErosionRate},
        ${erosion.maxErosionRate},
        ${JSON.stringify(erosion.classification)},
        ${erosion.dominantClass},
        ${JSON.stringify(erosionGeojson)},
        ${erosion.confidence},
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
        twi_mean = EXCLUDED.twi_mean,
        twi_classification = EXCLUDED.twi_classification,
        twi_dominant_class = EXCLUDED.twi_dominant_class,
        twi_geojson = EXCLUDED.twi_geojson,
        tri_mean_m = EXCLUDED.tri_mean_m,
        tri_classification = EXCLUDED.tri_classification,
        tri_dominant_class = EXCLUDED.tri_dominant_class,
        tri_geojson = EXCLUDED.tri_geojson,
        erosion_mean_t_ha_yr = EXCLUDED.erosion_mean_t_ha_yr,
        erosion_max_t_ha_yr = EXCLUDED.erosion_max_t_ha_yr,
        erosion_classification = EXCLUDED.erosion_classification,
        erosion_dominant_class = EXCLUDED.erosion_dominant_class,
        erosion_geojson = EXCLUDED.erosion_geojson,
        erosion_confidence = EXCLUDED.erosion_confidence,
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

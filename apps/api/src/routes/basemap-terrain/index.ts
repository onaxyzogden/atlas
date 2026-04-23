import type { FastifyInstance } from 'fastify';
import { BasemapTerrainResponse, type BasemapTerrainSummary } from '@ogden/shared';

/**
 * Section 2 — Base Map, Imagery & Terrain Visualization ([P1])
 *
 * Canonical read-path. Surfaces the `terrain_analysis` row (DEM-derived
 * slope/aspect/curvature/TPI/TWI/TRI/viewshed/frost-pocket) alongside the
 * basemap style catalog and vector overlay inventory the UI needs to
 * populate its map controls. Does not recompute anything — the Tier-3
 * pipeline writes `terrain_analysis`; this route reads it.
 */
export default async function basemap_terrainRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole } = fastify;

  fastify.get<{ Params: { projectId: string } }>(
    '/:projectId',
    { preHandler: [authenticate, fastify.requirePhase('P1'), resolveProjectRole] },
    async (req) => {
      const [boundary] = await db`
        SELECT parcel_boundary IS NOT NULL AS has_boundary
        FROM projects WHERE id = ${req.projectId}
      `;
      if (!boundary?.has_boundary) {
        return {
          data: BasemapTerrainResponse.parse({
            status: 'not_ready',
            projectId: req.projectId,
            reason: 'no_boundary',
          }),
          meta: undefined,
          error: null,
        };
      }

      const [terrain] = await db`
        SELECT
          elevation_min_m, elevation_max_m, elevation_mean_m,
          slope_min_deg, slope_max_deg, slope_mean_deg,
          aspect_dominant, slope_heatmap_url, aspect_heatmap_url,
          contour_geojson IS NOT NULL AS has_contours,
          curvature_profile_mean, curvature_plan_mean,
          viewshed_visible_pct,
          viewshed_observer_point IS NOT NULL AS observer_set,
          viewshed_geojson IS NOT NULL AS has_viewshed_geojson,
          frost_pocket_area_pct, frost_pocket_severity,
          cold_air_risk_rating,
          tpi_dominant_class, twi_dominant_class,
          tri_mean_m, tri_dominant_class,
          confidence, data_sources, computed_at
        FROM terrain_analysis
        WHERE project_id = ${req.projectId}
      `;

      if (!terrain) {
        return {
          data: BasemapTerrainResponse.parse({
            status: 'not_ready',
            projectId: req.projectId,
            reason: 'terrain_pending',
          }),
          meta: undefined,
          error: null,
        };
      }

      // Which vector overlays are available? Check project_layers presence.
      const layerRows = await db<{ layer_type: string }[]>`
        SELECT layer_type
        FROM project_layers
        WHERE project_id = ${req.projectId}
          AND fetch_status = 'complete'
      `;
      const present = new Set(layerRows.map((r) => r.layer_type));

      const slopeMean = num(terrain.slope_mean_deg);
      const slopeClass = classifySlope(slopeMean);
      const slopeMin = num(terrain.slope_min_deg);
      const slopeMax = num(terrain.slope_max_deg);

      const slopeAspect = isFinite(slopeMean)
        ? {
            slopeMinDeg: slopeMin,
            slopeMaxDeg: slopeMax,
            slopeMeanDeg: slopeMean,
            slopeClass,
            aspectDominant: str(terrain.aspect_dominant),
            slopeHeatmapUrl: str(terrain.slope_heatmap_url),
            aspectHeatmapUrl: str(terrain.aspect_heatmap_url),
          }
        : undefined;

      const terrainFeatures = {
        tpiDominantClass: str(terrain.tpi_dominant_class),
        twiDominantClass: str(terrain.twi_dominant_class),
        triMeanM: num(terrain.tri_mean_m, null),
        triDominantClass: str(terrain.tri_dominant_class),
        curvatureProfileMean: num(terrain.curvature_profile_mean, null),
        curvaturePlanMean: num(terrain.curvature_plan_mean, null),
        frostPocketAreaPct: num(terrain.frost_pocket_area_pct, null),
        frostPocketSeverity: severity(terrain.frost_pocket_severity),
        coldAirRiskRating: severity(terrain.cold_air_risk_rating),
      };
      const hasTerrainFeatures =
        terrainFeatures.tpiDominantClass !== null
        || terrainFeatures.twiDominantClass !== null
        || terrainFeatures.triMeanM !== null
        || terrainFeatures.curvatureProfileMean !== null
        || terrainFeatures.frostPocketAreaPct !== null;

      const viewshed = {
        observerSet: Boolean(terrain.observer_set),
        visiblePct: num(terrain.viewshed_visible_pct, null),
        hasGeojson: Boolean(terrain.has_viewshed_geojson),
      };
      const hasViewshed = viewshed.observerSet || viewshed.visiblePct !== null;

      const elevationMin = num(terrain.elevation_min_m, null);
      const elevationMax = num(terrain.elevation_max_m, null);
      const reliefM =
        elevationMin !== null && elevationMax !== null ? elevationMax - elevationMin : null;

      const summary: BasemapTerrainSummary = {
        elevation: {
          minM: elevationMin,
          maxM: elevationMax,
          meanM: num(terrain.elevation_mean_m, null),
          reliefM,
          hasContours: Boolean(terrain.has_contours),
        },
        ...(slopeAspect ? { slopeAspect } : {}),
        ...(hasTerrainFeatures ? { terrainFeatures } : {}),
        ...(hasViewshed ? { viewshed } : {}),
        basemapStyles: BASEMAP_STYLES,
        vectorOverlays: VECTOR_OVERLAYS.map((o) => ({ ...o, available: present.has(o.layerType) })),
        mapModes: ['2d', '2.5d', '3d'],
        measurementEndpoints: {
          distance: '/api/v1/elevation/distance',
          area: '/api/v1/elevation/area',
          elevation: '/api/v1/elevation/point',
          crossSection: '/api/v1/elevation/profile',
        },
        confidence: (str(terrain.confidence) as 'high' | 'medium' | 'low') ?? 'low',
        dataSources: Array.isArray(terrain.data_sources)
          ? (terrain.data_sources as unknown[]).filter((s): s is string => typeof s === 'string')
          : [],
        computedAt: terrain.computed_at ? new Date(terrain.computed_at as string | Date).toISOString() : null,
      };

      return {
        data: BasemapTerrainResponse.parse({
          status: 'ready',
          projectId: req.projectId,
          summary,
        }),
        meta: undefined,
        error: null,
      };
    },
  );
}

const BASEMAP_STYLES = [
  { key: 'satellite', label: 'Satellite', description: 'High-resolution aerial imagery', kind: 'satellite' as const },
  { key: 'aerial', label: 'Aerial', description: 'Orthophoto basemap', kind: 'aerial' as const },
  { key: 'topographic', label: 'Topographic', description: 'Contour-shaded terrain map', kind: 'topographic' as const },
  { key: 'street', label: 'Street', description: 'Road-focused cartographic view', kind: 'street' as const },
  { key: 'hybrid', label: 'Hybrid', description: 'Satellite with labels and roads', kind: 'hybrid' as const },
];

const VECTOR_OVERLAYS = [
  { key: 'parcel', label: 'Parcel boundary', layerType: 'parcel' },
  { key: 'roads', label: 'Roads', layerType: 'roads' },
  { key: 'hydrography', label: 'Waterbodies', layerType: 'hydrography' },
  { key: 'buildings', label: 'Building footprints', layerType: 'buildings' },
];

function num(v: unknown, fallback: number | null = 0): number {
  if (v === null || v === undefined) return fallback as number;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isFinite(n) ? n : (fallback as number);
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function severity(v: unknown): 'high' | 'medium' | 'low' | 'none' | null {
  const s = str(v);
  return s === 'high' || s === 'medium' || s === 'low' || s === 'none' ? s : null;
}

function classifySlope(deg: number): 'flat' | 'gentle' | 'moderate' | 'steep' | 'very_steep' {
  if (!isFinite(deg)) return 'flat';
  if (deg < 2) return 'flat';
  if (deg < 8) return 'gentle';
  if (deg < 15) return 'moderate';
  if (deg < 25) return 'steep';
  return 'very_steep';
}

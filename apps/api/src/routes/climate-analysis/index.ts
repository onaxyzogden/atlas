import type { FastifyInstance } from 'fastify';
import type { Country } from '@ogden/shared';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { computeSolarExposure } from '../../services/terrain/SolarExposureService.js';
import {
  computeComfortExposure,
  type ComfortExposureNormal,
} from '../../services/terrain/ComfortExposureService.js';
import { fetchOpenMeteoWind } from '../../services/climate/openMeteoWindFetch.js';
import {
  getCachedWindRose,
  setCachedWindRose,
} from '../../services/climate/windRoseCache.js';

/**
 * Section 6 — Solar, Wind & Climate Analysis ([P1])
 *
 * POST /:projectId/solar-exposure/compute
 *   On-demand grid-cell solar exposure map for a project parcel. Combines
 *   DEM-derived slope + aspect with sun-path math to produce a GeoJSON
 *   FeatureCollection of exposure bands (low/medium/high/excellent).
 *   Horizon shading from surrounding terrain is not modelled.
 */
export default async function climate_analysisRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole } = fastify;

  fastify.get('/', { preHandler: [authenticate, fastify.requirePhase('P1')] }, async () => {
    return { data: [], meta: { total: 0 }, error: null };
  });

  /**
   * GET /wind-rose?lat=..&lng=..
   *   Server-side proxy for Open-Meteo ERA5 hourly wind, returned as 8-bin
   *   compass frequencies. Unauthenticated — used by the Diagnose-page rose
   *   on mock projects without a session. Rate-limited globally by the app.
   *   Returns 502 + WIND_ROSE_UNAVAILABLE when the upstream is silent.
   */
  fastify.get<{ Querystring: { lat?: string; lng?: string } }>(
    '/wind-rose',
    { preHandler: [fastify.requirePhase('P1')] },
    async (req, reply) => {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        throw new AppError('INVALID_LAT', 'lat must be a number in [-90, 90]', 400);
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        throw new AppError('INVALID_LNG', 'lng must be a number in [-180, 180]', 400);
      }
      const cached = await getCachedWindRose(fastify.redis, lat, lng);
      if (cached) {
        return { data: cached, meta: { cached: true }, error: null };
      }
      const result = await fetchOpenMeteoWind(lat, lng);
      if (!result) {
        reply.code(502);
        return {
          data: null,
          error: {
            code: 'WIND_ROSE_UNAVAILABLE',
            message: 'Open-Meteo upstream did not return wind data for this point',
          },
        };
      }
      // Fire-and-forget cache write — don't block the response on Redis.
      void setCachedWindRose(fastify.redis, lat, lng, result);
      return { data: result, meta: { cached: false }, error: null };
    },
  );

  fastify.post<{ Params: { projectId: string } }>(
    '/:projectId/solar-exposure/compute',
    { preHandler: [authenticate, fastify.requirePhase('P1'), resolveProjectRole] },
    async (req) => {
      const [project] = await db`
        SELECT
          country,
          ST_AsGeoJSON(parcel_boundary)::jsonb AS boundary_geojson
        FROM projects
        WHERE id = ${req.projectId}
      `;
      if (!project) throw new NotFoundError('Project', req.projectId);
      if (!project.boundary_geojson) {
        throw new AppError('NO_BOUNDARY', 'Project has no parcel boundary', 400);
      }

      const country = (project.country ?? 'US') as Country;
      const result = await computeSolarExposure(project.boundary_geojson, country);

      return { data: result, meta: undefined, error: null };
    },
  );

  /**
   * POST /:projectId/comfort-grid/compute
   *   Planning-grade per-DEM-cell outdoor-comfort map. Reads the project's
   *   climate-layer monthly normals, adjusts for elevation adiabatic lapse
   *   and solar exposure, and returns a classified GeoJSON of comfort bands.
   */
  fastify.post<{ Params: { projectId: string } }>(
    '/:projectId/comfort-grid/compute',
    { preHandler: [authenticate, fastify.requirePhase('P1'), resolveProjectRole] },
    async (req) => {
      const [project] = await db`
        SELECT
          country,
          ST_AsGeoJSON(parcel_boundary)::jsonb AS boundary_geojson
        FROM projects
        WHERE id = ${req.projectId}
      `;
      if (!project) throw new NotFoundError('Project', req.projectId);
      if (!project.boundary_geojson) {
        throw new AppError('NO_BOUNDARY', 'Project has no parcel boundary', 400);
      }

      const [climateLayer] = await db<{ summary_data: unknown }[]>`
        SELECT summary_data
        FROM project_layers
        WHERE project_id = ${req.projectId}
          AND layer_type = 'climate'
          AND fetch_status = 'complete'
      `;
      const summary = (climateLayer?.summary_data ?? {}) as Record<string, unknown>;
      const normals = (summary['_monthly_normals'] as ComfortExposureNormal[] | undefined) ?? null;
      if (!normals || normals.length === 0) {
        throw new AppError(
          'NO_CLIMATE_NORMALS',
          'Project has no monthly climate normals — run the climate data fetch first',
          400,
        );
      }

      const country = (project.country ?? 'US') as Country;
      try {
        const result = await computeComfortExposure(project.boundary_geojson, country, normals);
        return { data: result, meta: undefined, error: null };
      } catch (err) {
        if (err instanceof Error && err.message === 'NO_CLIMATE_NORMALS') {
          throw new AppError('NO_CLIMATE_NORMALS', 'Climate normals missing mean-max/mean-min', 400);
        }
        throw err;
      }
    },
  );
}

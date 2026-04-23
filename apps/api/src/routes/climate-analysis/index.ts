import type { FastifyInstance } from 'fastify';
import type { Country } from '@ogden/shared';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { computeSolarExposure } from '../../services/terrain/SolarExposureService.js';

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
}

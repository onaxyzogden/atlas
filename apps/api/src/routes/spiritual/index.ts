import type { FastifyInstance } from 'fastify';
import { CreateSpiritualZoneInput, QiblaResult } from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';

// Mecca coordinates
const MECCA_LAT = 21.4225;
const MECCA_LNG = 39.8262;

/**
 * Compute Qibla bearing using the spherical law of cosines.
 * Returns degrees clockwise from true north.
 */
function computeQiblaBearing(fromLat: number, fromLng: number): QiblaResult {
  const φ1 = (fromLat * Math.PI) / 180;
  const φ2 = (MECCA_LAT * Math.PI) / 180;
  const Δλ = ((MECCA_LNG - fromLng) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;

  // Great-circle distance (Haversine)
  const R = 6371;
  const a =
    Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return { bearing, distanceKm, fromLat, fromLng };
}

export default async function spiritualRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  // GET /spiritual/project/:projectId
  fastify.get<{ Params: { projectId: string } }>(
    '/project/:projectId',
    { preHandler: [authenticate] },
    async (req) => {
      const zones = await db`
        SELECT
          sz.id, sz.project_id, sz.zone_type, sz.name, sz.notes,
          sz.qibla_bearing, sz.solar_events,
          ST_AsGeoJSON(sz.geometry)::jsonb AS geometry,
          sz.created_at
        FROM spiritual_zones sz
        JOIN projects p ON p.id = sz.project_id
        WHERE sz.project_id = ${req.params.projectId}
          AND p.owner_id = ${req.userId}
        ORDER BY sz.created_at
      `;
      return { data: zones, meta: { total: zones.length }, error: null };
    },
  );

  // POST /spiritual/project/:projectId — create spiritual zone
  fastify.post<{ Params: { projectId: string } }>(
    '/project/:projectId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const body = CreateSpiritualZoneInput.parse({
        ...(req.body as object),
        projectId: req.params.projectId,
      });

      const [project] = await db`
        SELECT id, owner_id,
               ST_Y(centroid::geometry) AS lat,
               ST_X(centroid::geometry) AS lng
        FROM projects
        WHERE id = ${body.projectId}
      `;
      if (!project) throw new NotFoundError('Project', body.projectId);
      if (project.owner_id !== req.userId) throw new ForbiddenError();

      // Auto-compute Qibla bearing for prayer_space and qibla_axis zones
      let qiblaBearing: number | null = null;
      if (
        (body.zoneType === 'prayer_space' || body.zoneType === 'qibla_axis') &&
        project.lat != null &&
        project.lng != null
      ) {
        const result = computeQiblaBearing(Number(project.lat), Number(project.lng));
        qiblaBearing = result.bearing;
      }

      const geomStr = JSON.stringify(body.geometry);

      const [zone] = await db`
        INSERT INTO spiritual_zones (
          project_id, zone_type, geometry, name, notes, qibla_bearing, created_by
        ) VALUES (
          ${body.projectId},
          ${body.zoneType},
          ST_GeomFromGeoJSON(${geomStr}),
          ${body.name ?? null},
          ${body.notes ?? null},
          ${qiblaBearing},
          ${req.userId}
        )
        RETURNING
          id, project_id, zone_type, name, notes,
          qibla_bearing, solar_events,
          ST_AsGeoJSON(geometry)::jsonb AS geometry,
          created_at
      `;

      reply.code(201);
      return { data: zone, meta: undefined, error: null };
    },
  );

  // GET /spiritual/project/:projectId/qibla — compute Qibla for parcel centroid
  fastify.get<{ Params: { projectId: string } }>(
    '/project/:projectId/qibla',
    { preHandler: [authenticate] },
    async (req) => {
      const [project] = await db`
        SELECT
          ST_Y(centroid::geometry) AS lat,
          ST_X(centroid::geometry) AS lng
        FROM projects
        WHERE id = ${req.params.projectId}
          AND owner_id = ${req.userId}
          AND centroid IS NOT NULL
      `;
      if (!project) throw new NotFoundError('Project', req.params.projectId);

      const result = computeQiblaBearing(Number(project.lat), Number(project.lng));
      return { data: QiblaResult.parse(result), meta: undefined, error: null };
    },
  );

  // DELETE /spiritual/:zoneId
  fastify.delete<{ Params: { zoneId: string } }>(
    '/:zoneId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const [zone] = await db`
        SELECT sz.id FROM spiritual_zones sz
        JOIN projects p ON p.id = sz.project_id
        WHERE sz.id = ${req.params.zoneId} AND p.owner_id = ${req.userId}
      `;
      if (!zone) throw new NotFoundError('SpiritualZone', req.params.zoneId);

      await db`DELETE FROM spiritual_zones WHERE id = ${req.params.zoneId}`;
      reply.code(204);
      return '';
    },
  );
}

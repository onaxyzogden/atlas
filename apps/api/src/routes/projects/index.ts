import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateProjectInput, UpdateProjectInput, ProjectSummary, toCamelCase } from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';

export default async function projectRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  // GET /projects — list current user's projects
  fastify.get('/', { preHandler: [authenticate] }, async (req) => {
    const rows = await db`
      SELECT
        p.id, p.name, p.description, p.status, p.project_type,
        p.country, p.province_state, p.conservation_auth_id,
        p.address, p.parcel_id, p.acreage,
        p.data_completeness_score,
        (p.parcel_boundary IS NOT NULL) AS has_parcel_boundary,
        p.created_at, p.updated_at
      FROM projects p
      WHERE p.owner_id = ${req.userId}
        AND p.status != 'archived'
      ORDER BY p.updated_at DESC
    `;
    return { data: rows.map((r) => ProjectSummary.parse(toCamelCase(r))), meta: { total: rows.length }, error: null };
  });

  // POST /projects — create a new project and enqueue Tier 1 data pipeline
  fastify.post('/', { preHandler: [authenticate] }, async (req, reply) => {
    const body = CreateProjectInput.parse(req.body);

    const [project] = await db`
      INSERT INTO projects (
        owner_id, name, description, project_type,
        country, province_state, units
      ) VALUES (
        ${req.userId}, ${body.name}, ${body.description ?? null},
        ${body.projectType ?? null}, ${body.country}, ${body.provinceState ?? null},
        ${body.units}
      )
      RETURNING id, name, description, status, project_type, country, province_state,
                conservation_auth_id, address, parcel_id, acreage,
                data_completeness_score, parcel_boundary IS NOT NULL AS has_parcel_boundary,
                created_at, updated_at
    `;

    // Enqueue Tier 1 data pipeline job (will run once boundary is set)
    await db`
      INSERT INTO data_pipeline_jobs (project_id, job_type, status)
      VALUES (${project!.id}, 'fetch_tier1', 'queued')
    `;

    reply.code(201);
    return { data: ProjectSummary.parse(toCamelCase(project)), meta: undefined, error: null };
  });

  // GET /projects/:id
  fastify.get<{ Params: { id: string } }>('/:id', { preHandler: [authenticate] }, async (req) => {
    const [project] = await db`
      SELECT
        p.id, p.name, p.description, p.status, p.project_type,
        p.country, p.province_state, p.conservation_auth_id,
        p.address, p.parcel_id, p.acreage,
        p.data_completeness_score,
        (p.parcel_boundary IS NOT NULL) AS has_parcel_boundary,
        p.owner_notes, p.zoning_notes, p.access_notes, p.water_rights_notes,
        p.created_at, p.updated_at
      FROM projects p
      WHERE p.id = ${req.params.id}
        AND p.owner_id = ${req.userId}
    `;
    if (!project) throw new NotFoundError('Project', req.params.id);
    return { data: project, meta: undefined, error: null };
  });

  // PATCH /projects/:id — update metadata
  fastify.patch<{ Params: { id: string } }>('/:id', { preHandler: [authenticate] }, async (req) => {
    const body = UpdateProjectInput.parse(req.body);

    const [existing] = await db`SELECT id, owner_id FROM projects WHERE id = ${req.params.id}`;
    if (!existing) throw new NotFoundError('Project', req.params.id);
    if (existing.owner_id !== req.userId) throw new ForbiddenError();

    const [updated] = await db`
      UPDATE projects SET
        name                  = COALESCE(${body.name ?? null}, name),
        description           = COALESCE(${body.description ?? null}, description),
        project_type          = COALESCE(${body.projectType ?? null}, project_type),
        address               = COALESCE(${body.address ?? null}, address),
        parcel_id             = COALESCE(${body.parcelId ?? null}, parcel_id),
        owner_notes           = COALESCE(${body.ownerNotes ?? null}, owner_notes),
        zoning_notes          = COALESCE(${body.zoningNotes ?? null}, zoning_notes),
        access_notes          = COALESCE(${body.accessNotes ?? null}, access_notes),
        water_rights_notes    = COALESCE(${body.waterRightsNotes ?? null}, water_rights_notes)
      WHERE id = ${req.params.id}
      RETURNING id, name, description, status, project_type, country, province_state,
                conservation_auth_id, address, parcel_id, acreage,
                data_completeness_score, parcel_boundary IS NOT NULL AS has_parcel_boundary,
                created_at, updated_at
    `;
    return { data: ProjectSummary.parse(toCamelCase(updated)), meta: undefined, error: null };
  });

  // POST /projects/:id/boundary — set or replace parcel boundary (GeoJSON MultiPolygon)
  fastify.post<{ Params: { id: string } }>(
    '/:id/boundary',
    { preHandler: [authenticate] },
    async (req) => {
      const body = z.object({ geojson: z.unknown() }).parse(req.body);

      const [existing] = await db`SELECT id, owner_id FROM projects WHERE id = ${req.params.id}`;
      if (!existing) throw new NotFoundError('Project', req.params.id);
      if (existing.owner_id !== req.userId) throw new ForbiddenError();

      const geojsonStr = JSON.stringify(body.geojson);

      const [updated] = await db`
        UPDATE projects SET
          parcel_boundary = ST_Multi(ST_GeomFromGeoJSON(${geojsonStr})),
          centroid        = ST_Centroid(ST_GeomFromGeoJSON(${geojsonStr})),
          acreage         = ST_Area(
            ST_Transform(ST_GeomFromGeoJSON(${geojsonStr}), 26917)
          ) / 4046.86
        WHERE id = ${req.params.id}
        RETURNING id, acreage,
                  ST_AsGeoJSON(centroid)::jsonb AS centroid_geojson,
                  parcel_boundary IS NOT NULL AS has_parcel_boundary
      `;

      // Re-enqueue Tier 1 data fetch now that boundary is set
      await db`
        INSERT INTO data_pipeline_jobs (project_id, job_type, status)
        VALUES (${req.params.id}, 'fetch_tier1', 'queued')
        ON CONFLICT DO NOTHING
      `;

      return { data: updated, meta: undefined, error: null };
    },
  );

  // GET /projects/:id/assessment — current site assessment
  fastify.get<{ Params: { id: string } }>(
    '/:id/assessment',
    { preHandler: [authenticate] },
    async (req) => {
      const [assessment] = await db`
        SELECT sa.*
        FROM site_assessments sa
        JOIN projects p ON p.id = sa.project_id
        WHERE sa.project_id = ${req.params.id}
          AND sa.is_current = true
          AND p.owner_id = ${req.userId}
      `;
      if (!assessment) {
        return {
          data: null,
          meta: undefined,
          error: { code: 'NOT_READY', message: 'Assessment not yet computed. Data pipeline may still be running.' },
        };
      }
      return { data: assessment, meta: undefined, error: null };
    },
  );

  // GET /projects/:id/completeness — data completeness breakdown
  fastify.get<{ Params: { id: string } }>(
    '/:id/completeness',
    { preHandler: [authenticate] },
    async (req) => {
      const layers = await db`
        SELECT layer_type, fetch_status, confidence, data_date, fetched_at
        FROM project_layers
        WHERE project_id = ${req.params.id}
        ORDER BY layer_type
      `;
      const [scoreRow] = await db`
        SELECT data_completeness_score AS score
        FROM projects
        WHERE id = ${req.params.id} AND owner_id = ${req.userId}
      `;
      return { data: { score: (scoreRow?.score as number | null) ?? null, layers }, meta: undefined, error: null };
    },
  );
}

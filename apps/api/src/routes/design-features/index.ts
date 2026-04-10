import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateDesignFeatureInput, UpdateDesignFeatureInput, DesignFeatureSummary, toCamelCase } from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';

const ParamsProjectId = z.object({ projectId: z.string().uuid() });
const ParamsId = z.object({ id: z.string().uuid() });
const ParamsProjectIdType = z.object({
  projectId: z.string().uuid(),
  type: z.enum(['zone', 'structure', 'path', 'point', 'annotation']),
});

/** Verify project exists and belongs to req.userId. Returns project row. */
async function verifyProjectOwner(
  db: FastifyInstance['db'],
  projectId: string,
  userId: string,
) {
  const [project] = await db`SELECT id, owner_id FROM projects WHERE id = ${projectId}`;
  if (!project) throw new NotFoundError('Project', projectId);
  if (project.owner_id !== userId) throw new ForbiddenError();
  return project;
}

function parseRow(row: Record<string, unknown>) {
  return DesignFeatureSummary.parse(toCamelCase(row));
}

export default async function designFeatureRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  // GET /project/:projectId — list all features for a project
  fastify.get<{ Params: { projectId: string } }>(
    '/project/:projectId',
    { preHandler: [authenticate] },
    async (req) => {
      const { projectId } = ParamsProjectId.parse(req.params);
      await verifyProjectOwner(db, projectId, req.userId);

      const rows = await db`
        SELECT
          df.id, df.project_id, df.feature_type, df.subtype,
          ST_AsGeoJSON(df.geometry)::jsonb AS geometry,
          df.label, df.properties, df.phase_tag, df.style,
          df.sort_order, df.created_by, df.created_at, df.updated_at
        FROM design_features df
        WHERE df.project_id = ${projectId}
        ORDER BY df.sort_order, df.created_at
      `;
      return { data: rows.map(parseRow), meta: { total: rows.length }, error: null };
    },
  );

  // GET /project/:projectId/:type — list features by type
  fastify.get<{ Params: { projectId: string; type: string } }>(
    '/project/:projectId/:type',
    { preHandler: [authenticate] },
    async (req) => {
      const { projectId, type } = ParamsProjectIdType.parse(req.params);
      await verifyProjectOwner(db, projectId, req.userId);

      const rows = await db`
        SELECT
          df.id, df.project_id, df.feature_type, df.subtype,
          ST_AsGeoJSON(df.geometry)::jsonb AS geometry,
          df.label, df.properties, df.phase_tag, df.style,
          df.sort_order, df.created_by, df.created_at, df.updated_at
        FROM design_features df
        WHERE df.project_id = ${projectId}
          AND df.feature_type = ${type}
        ORDER BY df.sort_order, df.created_at
      `;
      return { data: rows.map(parseRow), meta: { total: rows.length }, error: null };
    },
  );

  // POST /project/:projectId — create a design feature
  fastify.post<{ Params: { projectId: string } }>(
    '/project/:projectId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { projectId } = ParamsProjectId.parse(req.params);
      await verifyProjectOwner(db, projectId, req.userId);
      const body = CreateDesignFeatureInput.parse(req.body);

      const geomStr = JSON.stringify(body.geometry);

      const [row] = await db`
        INSERT INTO design_features (
          project_id, feature_type, subtype, geometry, label,
          properties, phase_tag, style, sort_order, created_by
        ) VALUES (
          ${projectId},
          ${body.featureType},
          ${body.subtype ?? null},
          ST_GeomFromGeoJSON(${geomStr}),
          ${body.label ?? null},
          ${JSON.stringify(body.properties)},
          ${body.phaseTag ?? null},
          ${body.style ? JSON.stringify(body.style) : null},
          ${body.sortOrder},
          ${req.userId}
        )
        RETURNING
          id, project_id, feature_type, subtype,
          ST_AsGeoJSON(geometry)::jsonb AS geometry,
          label, properties, phase_tag, style,
          sort_order, created_by, created_at, updated_at
      `;

      reply.code(201);
      return { data: parseRow(row!), meta: undefined, error: null };
    },
  );

  // PATCH /:id — update a design feature
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate] },
    async (req) => {
      const { id } = ParamsId.parse(req.params);
      const body = UpdateDesignFeatureInput.parse(req.body);

      // Verify ownership via project join and read current values
      const [existing] = await db`
        SELECT df.id, df.subtype, df.label, df.properties, df.phase_tag,
               df.style, df.sort_order, p.owner_id,
               ST_AsGeoJSON(df.geometry)::text AS geometry_json
        FROM design_features df
        JOIN projects p ON p.id = df.project_id
        WHERE df.id = ${id}
      `;
      if (!existing) throw new NotFoundError('DesignFeature', id);
      if (existing.owner_id !== req.userId) throw new ForbiddenError();

      // Merge: use provided values or fall back to existing
      const newSubtype = body.subtype ?? existing.subtype;
      const newLabel = body.label ?? existing.label;
      const newPhaseTag = body.phaseTag ?? existing.phase_tag;
      const newSortOrder = body.sortOrder ?? existing.sort_order;
      const newGeomStr = body.geometry != null
        ? JSON.stringify(body.geometry)
        : existing.geometry_json;
      const newProperties = body.properties != null
        ? JSON.stringify(body.properties)
        : JSON.stringify(existing.properties);
      const newStyle = body.style != null
        ? JSON.stringify(body.style)
        : (existing.style != null ? JSON.stringify(existing.style) : null);

      const [row] = await db`
        UPDATE design_features SET
          subtype    = ${newSubtype},
          geometry   = ST_GeomFromGeoJSON(${newGeomStr}),
          label      = ${newLabel},
          properties = ${newProperties}::jsonb,
          phase_tag  = ${newPhaseTag},
          style      = ${newStyle != null ? db`${newStyle}::jsonb` : db`NULL`},
          sort_order = ${newSortOrder},
          updated_at = now()
        WHERE id = ${id}
        RETURNING
          id, project_id, feature_type, subtype,
          ST_AsGeoJSON(geometry)::jsonb AS geometry,
          label, properties, phase_tag, style,
          sort_order, created_by, created_at, updated_at
      `;
      return { data: parseRow(row!), meta: undefined, error: null };
    },
  );

  // DELETE /:id — delete a design feature
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { id } = ParamsId.parse(req.params);

      const [existing] = await db`
        SELECT df.id FROM design_features df
        JOIN projects p ON p.id = df.project_id
        WHERE df.id = ${id} AND p.owner_id = ${req.userId}
      `;
      if (!existing) throw new NotFoundError('DesignFeature', id);

      await db`DELETE FROM design_features WHERE id = ${id}`;
      reply.code(204);
      return '';
    },
  );

  // POST /project/:projectId/bulk — bulk upsert features
  fastify.post<{ Params: { projectId: string } }>(
    '/project/:projectId/bulk',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { projectId } = ParamsProjectId.parse(req.params);
      await verifyProjectOwner(db, projectId, req.userId);

      const body = z.object({
        features: z.array(CreateDesignFeatureInput),
      }).parse(req.body);

      const results: unknown[] = [];

      for (const feature of body.features) {
        const geomStr = JSON.stringify(feature.geometry);

        const [row] = await db`
          INSERT INTO design_features (
            project_id, feature_type, subtype, geometry, label,
            properties, phase_tag, style, sort_order, created_by
          ) VALUES (
            ${projectId},
            ${feature.featureType},
            ${feature.subtype ?? null},
            ST_GeomFromGeoJSON(${geomStr}),
            ${feature.label ?? null},
            ${JSON.stringify(feature.properties)},
            ${feature.phaseTag ?? null},
            ${feature.style ? JSON.stringify(feature.style) : null},
            ${feature.sortOrder},
            ${req.userId}
          )
          RETURNING
            id, project_id, feature_type, subtype,
            ST_AsGeoJSON(geometry)::jsonb AS geometry,
            label, properties, phase_tag, style,
            sort_order, created_by, created_at, updated_at
        `;
        results.push(parseRow(row!));
      }

      reply.code(201);
      return { data: results, meta: { total: results.length }, error: null };
    },
  );
}

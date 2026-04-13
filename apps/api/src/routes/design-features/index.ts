import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { CreateDesignFeatureInput, UpdateDesignFeatureInput, DesignFeatureSummary, toCamelCase } from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsProjectId = z.object({ projectId: z.string().uuid() });
const ParamsId = z.object({ id: z.string().uuid() });
const ParamsProjectIdType = z.object({
  projectId: z.string().uuid(),
  type: z.enum(['zone', 'structure', 'path', 'point', 'annotation']),
});

function parseRow(row: Record<string, unknown>) {
  return DesignFeatureSummary.parse(toCamelCase(row));
}

export default async function designFeatureRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  /**
   * resolveProjectRoleFromFeature — preHandler for routes where :id is a
   * feature ID, not a project ID. Looks up the feature's project_id first,
   * then delegates to the standard resolveProjectRole logic.
   */
  const resolveProjectRoleFromFeature = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = ParamsId.parse(req.params);
    const [feature] = await db`SELECT project_id FROM design_features WHERE id = ${id}`;
    if (!feature) throw new NotFoundError('DesignFeature', id);
    // Patch params so resolveProjectRole can find the project
    (req.params as Record<string, string>)['id'] = feature.project_id as string;
    await resolveProjectRole(req, reply);
    // Restore the original feature ID
    (req.params as Record<string, string>)['id'] = id;
  };

  // GET /project/:projectId — list all features for a project (any role)
  fastify.get<{ Params: { projectId: string } }>(
    '/project/:projectId',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const { projectId } = ParamsProjectId.parse(req.params);

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

  // GET /project/:projectId/:type — list features by type (any role)
  fastify.get<{ Params: { projectId: string; type: string } }>(
    '/project/:projectId/:type',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const { projectId, type } = ParamsProjectIdType.parse(req.params);

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

  // POST /project/:projectId — create a design feature (owner + designer)
  fastify.post<{ Params: { projectId: string } }>(
    '/project/:projectId',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req, reply) => {
      const { projectId } = ParamsProjectId.parse(req.params);
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

      await logActivity(db, {
        projectId,
        userId: req.userId,
        action: 'feature_created',
        entityType: 'design_feature',
        entityId: row!.id as string,
        metadata: { featureType: body.featureType, label: body.label ?? null },
      });

      // Broadcast to other project members via WebSocket
      fastify.wsBroadcast(projectId, {
        type: 'feature_created',
        payload: parseRow(row!) as unknown as Record<string, unknown>,
        userId: req.userId,
        userName: null,
        timestamp: new Date().toISOString(),
      }, req.userId);

      reply.code(201);
      return { data: parseRow(row!), meta: undefined, error: null };
    },
  );

  // PATCH /:id — update a design feature (owner + designer)
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, resolveProjectRoleFromFeature, requireRole('owner', 'designer')] },
    async (req) => {
      const { id } = ParamsId.parse(req.params);
      const body = UpdateDesignFeatureInput.parse(req.body);

      // Read current values for merge
      const [existing] = await db`
        SELECT df.id, df.subtype, df.label, df.properties, df.phase_tag,
               df.style, df.sort_order,
               ST_AsGeoJSON(df.geometry)::text AS geometry_json
        FROM design_features df
        WHERE df.id = ${id}
      `;
      if (!existing) throw new NotFoundError('DesignFeature', id);

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
      await logActivity(db, {
        projectId: row!.project_id as string,
        userId: req.userId,
        action: 'feature_updated',
        entityType: 'design_feature',
        entityId: id,
        metadata: { label: row!.label ?? null },
      });

      // Broadcast to other project members via WebSocket
      fastify.wsBroadcast(row!.project_id as string, {
        type: 'feature_updated',
        payload: parseRow(row!) as unknown as Record<string, unknown>,
        userId: req.userId,
        userName: null,
        timestamp: new Date().toISOString(),
      }, req.userId);

      return { data: parseRow(row!), meta: undefined, error: null };
    },
  );

  // DELETE /:id — delete a design feature (owner only)
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, resolveProjectRoleFromFeature, requireRole('owner')] },
    async (req, reply) => {
      const { id } = ParamsId.parse(req.params);
      // Look up project_id before deleting for activity log
      const [feat] = await db`SELECT project_id, label FROM design_features WHERE id = ${id}`;
      await db`DELETE FROM design_features WHERE id = ${id}`;

      if (feat) {
        await logActivity(db, {
          projectId: feat.project_id as string,
          userId: req.userId,
          action: 'feature_deleted',
          entityType: 'design_feature',
          entityId: id,
          metadata: { label: feat.label ?? null },
        });

        // Broadcast to other project members via WebSocket
        fastify.wsBroadcast(feat.project_id as string, {
          type: 'feature_deleted',
          payload: { id, label: feat.label ?? null },
          userId: req.userId,
          userName: null,
          timestamp: new Date().toISOString(),
        }, req.userId);
      }

      reply.code(204);
      return '';
    },
  );

  // POST /project/:projectId/bulk — bulk upsert features (owner + designer)
  fastify.post<{ Params: { projectId: string } }>(
    '/project/:projectId/bulk',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req, reply) => {
      const { projectId } = ParamsProjectId.parse(req.params);

      const body = z.object({
        features: z.array(CreateDesignFeatureInput),
      }).parse(req.body);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- postgres.js TransactionSql type loses call signature via Omit
      const results = await db.begin(async (sql: any) => {
        const rows: unknown[] = [];

        for (const feature of body.features) {
          const geomStr = JSON.stringify(feature.geometry);

          const [row] = await sql`
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
          rows.push(parseRow(row!));
        }

        return rows;
      });

      // Broadcast bulk creation to other project members via WebSocket
      fastify.wsBroadcast(projectId, {
        type: 'features_bulk_created',
        payload: { count: results.length, features: results } as unknown as Record<string, unknown>,
        userId: req.userId,
        userName: null,
        timestamp: new Date().toISOString(),
      }, req.userId);

      reply.code(201);
      return { data: results, meta: { total: results.length }, error: null };
    },
  );
}

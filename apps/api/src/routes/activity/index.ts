/**
 * Activity routes — paginated activity feed for a project.
 *
 * Registered at prefix /api/v1/projects (shares prefix with project routes).
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const ParamsId = z.object({ id: z.string().uuid() });
const QueryPagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

export default async function activityRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole } = fastify;

  // GET /:id/activity — paginated activity feed (any role)
  fastify.get<{ Params: { id: string }; Querystring: { limit?: string; offset?: string } }>(
    '/:id/activity',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const { limit, offset } = QueryPagination.parse(req.query);

      const rows = await db`
        SELECT
          pa.id, pa.project_id, pa.user_id, pa.action,
          pa.entity_type, pa.entity_id, pa.metadata, pa.created_at,
          u.display_name AS user_name, u.email AS user_email
        FROM project_activity pa
        LEFT JOIN users u ON u.id = pa.user_id
        WHERE pa.project_id = ${req.projectId}
        ORDER BY pa.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [countRow] = await db`
        SELECT count(*) AS total FROM project_activity WHERE project_id = ${req.projectId}
      `;

      return {
        data: rows.map((r) => ({
          id: r.id,
          projectId: r.project_id,
          userId: r.user_id,
          userName: r.user_name ?? r.user_email ?? null,
          action: r.action,
          entityType: r.entity_type ?? null,
          entityId: r.entity_id ?? null,
          metadata: r.metadata ?? null,
          createdAt: (r.created_at as Date).toISOString(),
        })),
        meta: { total: Number(countRow?.total ?? 0) },
        error: null,
      };
    },
  );
}

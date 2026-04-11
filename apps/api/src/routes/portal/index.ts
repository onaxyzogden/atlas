/**
 * Portal routes (authenticated) — create/update and retrieve portal config.
 *
 * POST /:id/portal — upsert portal config for a project
 * GET  /:id/portal — retrieve portal config for a project
 */

import type { FastifyInstance } from 'fastify';
import { CreatePortalInput } from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';

function mapRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    projectId: row.project_id,
    shareToken: row.share_token,
    isPublished: row.is_published,
    config: row.config,
    dataMaskingLevel: row.data_masking_level,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function portalRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // POST /projects/:id/portal — create or update portal config
  fastify.post<{ Params: { id: string } }>(
    '/:id/portal',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req, reply) => {
      const projectId = req.projectId;

      const body = CreatePortalInput.parse(req.body);

      const [row] = await db`
        INSERT INTO project_portals (
          project_id, is_published, config, data_masking_level,
          published_at
        ) VALUES (
          ${projectId},
          ${body.isPublished},
          ${JSON.stringify(body)},
          ${body.dataMaskingLevel},
          ${body.isPublished ? new Date().toISOString() : null}
        )
        ON CONFLICT (project_id) DO UPDATE SET
          is_published = EXCLUDED.is_published,
          config = EXCLUDED.config,
          data_masking_level = EXCLUDED.data_masking_level,
          published_at = CASE
            WHEN EXCLUDED.is_published AND NOT project_portals.is_published
            THEN now()
            WHEN NOT EXCLUDED.is_published THEN NULL
            ELSE project_portals.published_at
          END,
          updated_at = now()
        RETURNING
          id, project_id, share_token, is_published,
          config, data_masking_level, published_at,
          created_at, updated_at
      `;

      if (!row) throw new NotFoundError('Portal', projectId);

      reply.code(201);
      return {
        data: mapRow(row),
        meta: undefined,
        error: null,
      };
    },
  );

  // GET /projects/:id/portal — retrieve portal config
  fastify.get<{ Params: { id: string } }>(
    '/:id/portal',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const projectId = req.projectId;

      const [row] = await db`
        SELECT
          id, project_id, share_token, is_published,
          config, data_masking_level, published_at,
          created_at, updated_at
        FROM project_portals
        WHERE project_id = ${projectId}
      `;

      if (!row) throw new NotFoundError('Portal config', projectId);

      return {
        data: mapRow(row),
        meta: undefined,
        error: null,
      };
    },
  );
}

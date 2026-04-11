/**
 * Public portal route — serves portal config by share token.
 * No authentication required.
 *
 * GET /:shareToken — return published portal config
 */

import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../lib/errors.js';

export default async function publicPortalRoutes(fastify: FastifyInstance) {
  const { db } = fastify;

  // GET /portal/:shareToken — public portal access
  fastify.get<{ Params: { shareToken: string } }>(
    '/:shareToken',
    async (req) => {
      const { shareToken } = req.params;

      const [row] = await db`
        SELECT
          pp.id, pp.project_id, pp.share_token, pp.is_published,
          pp.config, pp.data_masking_level, pp.published_at,
          pp.created_at, pp.updated_at,
          pr.name AS project_name
        FROM project_portals pp
        JOIN projects pr ON pr.id = pp.project_id
        WHERE pp.share_token = ${shareToken}
          AND pp.is_published = true
      `;

      if (!row) throw new NotFoundError('Portal', shareToken);

      return {
        data: {
          id: row.id,
          projectId: row.project_id,
          shareToken: row.share_token,
          isPublished: row.is_published,
          config: row.config,
          dataMaskingLevel: row.data_masking_level,
          publishedAt: row.published_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          projectName: row.project_name,
        },
        meta: undefined,
        error: null,
      };
    },
  );
}

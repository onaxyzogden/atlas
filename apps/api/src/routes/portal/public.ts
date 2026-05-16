/**
 * Public portal route — serves portal config by share token.
 * No authentication required.
 *
 * GET /:shareToken — return published portal config
 *
 * TODO(launch-readiness): cache + rate-limit gaps before first public URL.
 *   - Every visitor request hits PostgreSQL; a single Hacker News spike
 *     would saturate the API connection pool. Add CDN-cached static
 *     render (ISR or rendered-to-blob) before going live.
 *   - No per-request rate limit. Relies on UUIDv4 share_token secrecy and
 *     `is_published` filter. If a token leaks, `@fastify/rate-limit`
 *     should cap blast radius.
 *   See wiki/decisions/2026-05-04-p4-public-portal-section27-consolidation.md
 *   (D2 + D4 — both deferred to launch-readiness sprint).
 *   Re-confirmed open + gated to "before first public URL" in
 *   wiki/decisions/2026-05-10-deferred-todo-sweep.md.
 */

import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../lib/errors.js';
import { getStorageProvider } from '../../services/storage/StorageProvider.js';

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

  // GET /portal/:shareToken/report.pdf — public, view-only.
  // Streams the frozen capital_partner_summary PDF bytes THROUGH the
  // API. The raw (unsigned, permanent) storage URL is never exposed to
  // the client — the UUIDv4 token + the `reportShare.published` gate are
  // the only access path. Gate is independent of the storytelling
  // `is_published` flag.
  fastify.get<{ Params: { shareToken: string } }>(
    '/:shareToken/report.pdf',
    async (req, reply) => {
      const { shareToken } = req.params;

      const [row] = await db`
        SELECT config ->> 'reportShare' AS report_share
        FROM project_portals
        WHERE share_token = ${shareToken}
      `;

      const reportShare = row?.report_share
        ? (JSON.parse(row.report_share) as {
            published?: boolean;
            storageKey?: string;
          })
        : null;

      if (!reportShare?.published || !reportShare.storageKey) {
        throw new NotFoundError('Report share', shareToken);
      }

      const pdf = await getStorageProvider().download(reportShare.storageKey);

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'inline; filename="report.pdf"')
        .header('Cache-Control', 'private, no-store')
        .send(pdf);
    },
  );
}

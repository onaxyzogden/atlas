/**
 * Public portal route — serves portal config by share token.
 * No authentication required.
 *
 * GET /:shareToken — return published portal config
 *
 * Launch-readiness (2026-06-11, closes the API half of decisions
 * 2026-05-04 D2 + D4): both routes carry per-IP rate limits
 * (PORTAL_PUBLIC_RATE_LIMIT_MAX / PORTAL_PDF_RATE_LIMIT_MAX, 1-minute
 * window) so a leaked token can't saturate the DB pool, and the JSON
 * route is served from a best-effort 5-min Redis cache (invalidated on
 * every portal mutation in ./index.ts). The PDF route is deliberately
 * UNCACHED: it sends `Cache-Control: no-store` because unpublish must be
 * immediate, and the payload is a large binary.
 * Still open from D2: CDN-cached static render (ISR/blob) — a separate
 * launch item, tracked in the 2026-05-04 decision.
 * Per-IP keying: these limits key on `req.ip`, which is only the real
 * client when Fastify `trustProxy` is configured for the deployment's
 * proxy chain. That knob is the `TRUST_PROXY` env (see lib/config.ts and
 * render.yaml); behind a proxy it MUST be set or every visitor shares one
 * bucket. Confirm the hop count against live logs (two client IPs → two
 * independent buckets) before relying on these limits in production.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { errorResponseBuilderContext } from '@fastify/rate-limit';
import { config } from '../../lib/config.js';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { getStorageProvider } from '../../services/storage/StorageProvider.js';
import {
  getCachedPortal,
  setCachedPortal,
} from '../../services/portal/portalCache.js';

// @fastify/rate-limit THROWS the value this builder returns, so it lands in
// the global error handler. Returning an AppError rides the existing
// AppError branch there, producing the standard `{data, error}` envelope
// with the plugin's status code (429, or 403 when banned) instead of the
// plugin's bare default payload.
function rateLimitEnvelope(
  _req: FastifyRequest,
  context: errorResponseBuilderContext,
) {
  return new AppError(
    'RATE_LIMITED',
    `Rate limit exceeded, retry in ${context.after}`,
    context.statusCode,
  );
}

export default async function publicPortalRoutes(fastify: FastifyInstance) {
  const { db } = fastify;

  // GET /portal/:shareToken — public portal access
  fastify.get<{ Params: { shareToken: string } }>(
    '/:shareToken',
    {
      config: {
        rateLimit: {
          max: config.PORTAL_PUBLIC_RATE_LIMIT_MAX,
          timeWindow: '1 minute',
          errorResponseBuilder: rateLimitEnvelope,
        },
      },
    },
    async (req) => {
      const { shareToken } = req.params;

      const cached = await getCachedPortal(fastify.redis, shareToken);
      if (cached) {
        return { data: cached, meta: { cached: true }, error: null };
      }

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

      const data = {
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
      };

      // Fire-and-forget — a cache-write failure must not delay the response.
      void setCachedPortal(fastify.redis, shareToken, data);

      return { data, meta: { cached: false }, error: null };
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
    {
      config: {
        rateLimit: {
          max: config.PORTAL_PDF_RATE_LIMIT_MAX,
          timeWindow: '1 minute',
          errorResponseBuilder: rateLimitEnvelope,
        },
      },
    },
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

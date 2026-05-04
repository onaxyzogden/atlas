import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NotFoundError } from '../../lib/errors.js';

/**
 * Section 29 — Moontrance-Specific Features ([MT])
 *
 * Per-project gating per ADR
 * 2026-05-02-phase-gated-future-routes-scoping (D1, accepted 2026-05-04):
 * the global `ATLAS_MOONTRANCE` env flag still gates the route at the
 * platform level (`requirePhase('MT')`), and we additionally require an
 * opt-in row in `project_moontrance_identity` so a deployment can enable
 * Moontrance for some projects without it leaking onto every project.
 * Missing or disabled row → 404 (not Forbidden) so route existence isn't
 * leaked through the status code, mirroring the env-flag treatment.
 *
 * The matching processor has not landed yet, so the read-path returns
 * the persisted `summary` jsonb (defaults to `{}`).
 */
export default async function moontrance_identityRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole } = fastify;

  const requireMoontranceProject = async (req: FastifyRequest, _reply: FastifyReply) => {
    const [row] = await db<{ enabled: boolean }[]>`
      SELECT enabled FROM project_moontrance_identity
      WHERE project_id = ${req.projectId}
    `;
    if (!row || row.enabled !== true) {
      throw new NotFoundError('Route', req.url);
    }
  };

  fastify.get<{ Params: { projectId: string } }>(
    '/:projectId',
    {
      preHandler: [
        authenticate,
        fastify.requirePhase('MT'),
        resolveProjectRole,
        requireMoontranceProject,
      ],
    },
    async (req) => {
      const [row] = await db<{ summary: Record<string, unknown> }[]>`
        SELECT summary FROM project_moontrance_identity
        WHERE project_id = ${req.projectId}
      `;
      return {
        data: { projectId: req.projectId, summary: row?.summary ?? {} },
        meta: undefined,
        error: null,
      };
    },
  );
}

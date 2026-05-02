import type { FastifyInstance } from 'fastify';
import { MobileFieldworkResponse } from '@ogden/shared';

/**
 * Section 24 — Mobile, Fieldwork & Site Visit Tools ([P2])
 *
 * Read-path returns the typed MobileFieldworkResponse envelope. The matching
 * section processor has not landed yet, so this responds with
 * `status: 'not_ready'` / `reason: 'not_implemented'` — the V3
 * UI consumes the envelope uniformly across all sections and
 * renders a placeholder until the processor populates real data.
 *
 * Replaces the scaffold-section.ts stub as part of Phase 7.1
 * (.claude/plans/few-concerns-shiny-quokka.md).
 */
export default async function mobile_fieldworkRoutes(fastify: FastifyInstance) {
  const { authenticate, resolveProjectRole } = fastify;

  fastify.get<{ Params: { projectId: string } }>(
    '/:projectId',
    { preHandler: [authenticate, fastify.requirePhase('P2'), resolveProjectRole] },
    async (req) => {
      return {
        data: MobileFieldworkResponse.parse({
          status: 'not_ready',
          projectId: req.projectId,
          reason: 'not_implemented',
        }),
        meta: undefined,
        error: null,
      };
    },
  );
}

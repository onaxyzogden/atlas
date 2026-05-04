import type { FastifyInstance } from 'fastify';
import { FutureGeospatialResponse } from '@ogden/shared';

/**
 * Section 28 — Advanced Geospatial / Latent Features ([LATENT])
 *
 * Phase tag renamed FUTURE → LATENT per ADR
 * 2026-05-02-phase-gated-future-routes-scoping (D2, accepted 2026-05-04).
 * The slot is held for tracked-not-built capabilities (LiDAR import,
 * sensor integration, AR/VR walkthrough, etc.); the route stays gated
 * until a candidate graduates to a real phase.
 *
 * Read-path returns the typed FutureGeospatialResponse envelope. The matching
 * section processor has not landed yet, so this responds with
 * `status: 'not_ready'` / `reason: 'not_implemented'` — the V3
 * UI consumes the envelope uniformly across all sections and
 * renders a placeholder until the processor populates real data.
 */
export default async function future_geospatialRoutes(fastify: FastifyInstance) {
  const { authenticate, resolveProjectRole } = fastify;

  fastify.get<{ Params: { projectId: string } }>(
    '/:projectId',
    { preHandler: [authenticate, fastify.requirePhase('LATENT'), resolveProjectRole] },
    async (req) => {
      return {
        data: FutureGeospatialResponse.parse({
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

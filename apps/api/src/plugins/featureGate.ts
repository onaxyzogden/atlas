/**
 * Feature-gate plugin — phase-tag visibility for routes.
 *
 * Reads `ATLAS_PHASE_MAX` env (P1 | P2 | P3 | P4, default P4) and exposes
 * `fastify.requirePhase(tag)` as a preHandler factory. When a request hits a
 * gated route with a phase tag above the configured max, the plugin throws
 * `NotFoundError` — not Forbidden — so the existence of the endpoint is
 * not leaked through the status code.
 *
 * MT (Moontrance) features have their own flag: `ATLAS_MOONTRANCE=1` opens
 * them regardless of the P-tag ceiling; otherwise MT routes 404.
 *
 * Typical usage:
 *
 *   fastify.get('/templates', {
 *     preHandler: [fastify.authenticate, fastify.requirePhase('P2')],
 *     handler: ...,
 *   });
 */

import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { phaseAtMost, type PhaseTag } from '@ogden/shared/manifest';
import { NotFoundError } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    requirePhase: (
      tag: PhaseTag,
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function resolvePhaseMax(): PhaseTag {
  const raw = (process.env.ATLAS_PHASE_MAX ?? 'P4').toUpperCase();
  if (raw === 'P1' || raw === 'P2' || raw === 'P3' || raw === 'P4') return raw;
  return 'P4';
}

function moontranceEnabled(): boolean {
  const raw = process.env.ATLAS_MOONTRANCE;
  return raw === '1' || raw === 'true';
}

function futureEnabled(): boolean {
  const raw = process.env.ATLAS_FUTURE;
  return raw === '1' || raw === 'true';
}

export default fp(async (fastify: FastifyInstance) => {
  const phaseMax = resolvePhaseMax();
  const mtOn = moontranceEnabled();
  const futureOn = futureEnabled();

  fastify.decorate('requirePhase', (tag: PhaseTag) => {
    return async (req: FastifyRequest, _reply: FastifyReply) => {
      if (tag === 'MT') {
        if (!mtOn) throw new NotFoundError('Route', req.url);
        return;
      }
      if (tag === 'FUTURE') {
        if (!futureOn) throw new NotFoundError('Route', req.url);
        return;
      }
      if (!phaseAtMost(tag, phaseMax)) {
        throw new NotFoundError('Route', req.url);
      }
    };
  });

  fastify.log.info(
    { phaseMax, moontrance: mtOn, future: futureOn },
    'featureGate plugin loaded',
  );
});

/**
 * OLOS routes — composer for the per-project record routes.
 *
 * Registered at prefix /api/v1/projects in src/app.ts. The catalogue routes
 * (catalog.ts) mount separately at /api/v1/olos because they are public and
 * not project-scoped.
 *
 * Route map under /api/v1/projects/:id/olos/:
 *   - observations/                    — ObservationRecord
 *   - plan-decisions/                  — PlanDecisionRecord
 *   - handoffs/                        — ActHandoffPackage (POST gated on APPROVED_PLAN_STATUSES)
 *   - tasks/                           — ActTask
 *   - tasks/:taskId/proofs/            — ProofRecord
 *   - tasks/:taskId/verifications/     — VerificationRecord
 *   - escalations/                     — EscalationRecord
 *   - stewardship-routines/            — StewardshipRoutine
 */

import type { FastifyInstance } from 'fastify';
import olosObservationRoutes from './observations.js';
import olosPlanDecisionRoutes from './planDecisions.js';
import olosHandoffRoutes from './handoffs.js';
import olosTaskRoutes from './tasks.js';
import olosProofRoutes from './proofs.js';
import olosVerificationRoutes from './verifications.js';
import olosEscalationRoutes from './escalations.js';
import olosStewardshipRoutineRoutes from './stewardshipRoutines.js';

export default async function olosRoutes(fastify: FastifyInstance) {
  await fastify.register(olosObservationRoutes);
  await fastify.register(olosPlanDecisionRoutes);
  await fastify.register(olosHandoffRoutes);
  await fastify.register(olosTaskRoutes);
  await fastify.register(olosProofRoutes);
  await fastify.register(olosVerificationRoutes);
  await fastify.register(olosEscalationRoutes);
  await fastify.register(olosStewardshipRoutineRoutes);
}

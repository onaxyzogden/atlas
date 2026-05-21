/**
 * Evidence-audit routes — Phase F.4.
 *
 * Fire-and-forget endpoint backing the reproducibility ledger described in
 * migration 033. Each call records a single Evidence emission: the
 * stable-stringified selector inputs, their SHA-256 hash (computed client-
 * side), and the Evidence output the panel rendered. F.4 instruments only
 * `LandVerdictCard`; the other seven Evidence-emitting panels follow once
 * the write path is observed stable.
 *
 * Covenant: appreciation of stewarded land value, not investor yield.
 * See [[fiqh-csra-erased-2026-05-04]].
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const ParamsProjectId = z.object({ projectId: z.string().uuid() });

const LogBody = z.object({
  panelKey: z.string().min(1).max(128),
  // SHA-256 hex (lowercase). 64 chars; charset enforced by the regex.
  inputHash: z.string().regex(/^[0-9a-f]{64}$/i, 'inputHash must be a 64-char hex string'),
  inputPayload: z.unknown(),
  selectorName: z.string().min(1).max(128),
  evidenceOutput: z.unknown(),
});

export default async function evidenceAuditRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole } = fastify;

  // POST /:projectId/evidence-audit/log — any project member (write-only).
  // We intentionally do NOT expose a GET in v1: the table is a passive
  // ledger consulted via the replay tool, not the UI.
  fastify.post<{ Params: { projectId: string } }>(
    '/:projectId/evidence-audit/log',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const { projectId } = ParamsProjectId.parse(req.params);
      const body = LogBody.parse(req.body);
      const userId = (req as unknown as { user?: { sub?: string } }).user?.sub ?? null;

      const [row] = await db`
        INSERT INTO evidence_audit_log (
          project_id, panel_key, input_hash, input_payload,
          selector_name, evidence_output, created_by
        ) VALUES (
          ${projectId},
          ${body.panelKey},
          ${body.inputHash.toLowerCase()},
          ${db.json(body.inputPayload as Parameters<typeof db.json>[0])},
          ${body.selectorName},
          ${db.json(body.evidenceOutput as Parameters<typeof db.json>[0])},
          ${userId}
        )
        RETURNING id
      `;

      return {
        data: { id: row?.['id'] ?? null },
        meta: undefined,
        error: null,
      };
    },
  );
}

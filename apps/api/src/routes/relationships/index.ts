/**
 * Relationship-edge routes — CRUD for the Needs & Yields dependency graph
 * (Phase 3, see ADR wiki/decisions/2026-04-28-needs-yields-dependency-graph.md).
 *
 * Body validation reuses `EdgeSchema` from `@ogden/shared/relationships`
 * so client and server speak the same shape character-for-character.
 *
 * Registered at prefix /api/v1/projects, alongside commentRoutes.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EdgeSchema, type Edge } from '@ogden/shared/relationships';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

// EdgeSchema lives in @ogden/shared, which can resolve a different `zod`
// instance than the api package — `error instanceof ZodError` in the global
// handler then misses. Catch by shape and rethrow as our own ValidationError
// so the response is consistent (422 + structured payload).
function parseEdge(body: unknown) {
  const r = EdgeSchema.safeParse(body);
  if (!r.success) {
    throw new ValidationError(
      'Request validation failed',
      r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return r.data;
}

const ParamsId = z.object({ id: z.string().uuid() });
const ParamsEdgeId = z.object({ id: z.string().uuid(), edgeId: z.string().uuid() });

interface EdgeRow {
  id: string;
  project_id: string;
  from_id: string;
  from_output: string;
  to_id: string;
  to_input: string;
  ratio: string | null;
  created_at: Date;
  created_by: string | null;
}

function mapRow(row: EdgeRow): Edge & { id: string; createdAt: string } {
  return {
    id: row.id,
    fromId: row.from_id,
    fromOutput: row.from_output as Edge['fromOutput'],
    toId: row.to_id,
    toInput: row.to_input as Edge['toInput'],
    ...(row.ratio !== null && { ratio: Number(row.ratio) }),
    createdAt: row.created_at.toISOString(),
  };
}

export default async function relationshipRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/relationships — list all edges for the project (any role)
  fastify.get<{ Params: { id: string } }>(
    '/:id/relationships',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      ParamsId.parse(req.params);
      const rows = await db<EdgeRow[]>`
        SELECT id, project_id, from_id, from_output, to_id, to_input,
               ratio, created_at, created_by
        FROM project_relationships
        WHERE project_id = ${req.projectId}
        ORDER BY created_at ASC
      `;
      return { data: rows.map(mapRow), meta: { total: rows.length }, error: null };
    },
  );

  // POST /:id/relationships — create edge (owner, designer)
  fastify.post<{ Params: { id: string } }>(
    '/:id/relationships',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req, reply) => {
      ParamsId.parse(req.params);
      const edge = parseEdge(req.body);

      const [row] = await db<EdgeRow[]>`
        INSERT INTO project_relationships (
          project_id, created_by, from_id, from_output, to_id, to_input, ratio
        ) VALUES (
          ${req.projectId},
          ${req.userId},
          ${edge.fromId},
          ${edge.fromOutput},
          ${edge.toId},
          ${edge.toInput},
          ${edge.ratio ?? null}
        )
        ON CONFLICT (project_id, from_id, from_output, to_id, to_input)
        DO UPDATE SET ratio = EXCLUDED.ratio
        RETURNING id, project_id, from_id, from_output, to_id, to_input,
                  ratio, created_at, created_by
      `;

      reply.code(201);
      return { data: mapRow(row!), meta: undefined, error: null };
    },
  );

  // DELETE /:id/relationships/:edgeId — remove edge (owner, designer)
  fastify.delete<{ Params: { id: string; edgeId: string } }>(
    '/:id/relationships/:edgeId',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req, reply) => {
      const { edgeId } = ParamsEdgeId.parse(req.params);

      const [existing] = await db`
        SELECT id FROM project_relationships
        WHERE id = ${edgeId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('Relationship', edgeId);

      await db`DELETE FROM project_relationships WHERE id = ${edgeId}`;
      reply.code(204);
      return '';
    },
  );
}

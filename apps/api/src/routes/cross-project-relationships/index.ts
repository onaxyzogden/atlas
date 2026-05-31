/**
 * Cross-project relationship routes — CRUD for the Portfolio Home §5
 * relationships that connect TWO of a steward's projects (shared watershed,
 * adjacent boundary, habitat corridor, same management unit, shared
 * infrastructure). These are display/awareness metadata only and have no
 * effect on Plan, Act, or Observe logic (§5.1, §9.4).
 *
 * Distinct from `relationships/index.ts`, which is the WITHIN-project Needs &
 * Yields resource-flow graph (table `project_relationships`). This module owns
 * the `cross_project_relationships` table (migration 049) and the
 * `/:id/cross-project-relationships` path. Registered at prefix
 * /api/v1/projects alongside relationshipRoutes.
 *
 * Symmetry (§5.3): rows are stored once in canonical project-id order
 * (project_a_id < project_b_id); reads match either column, so both projects
 * see the relationship.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateCrossRelationshipInput,
  type CrossRelationship,
} from '@ogden/shared';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.js';

const ParamsId = z.object({ id: z.string().uuid() });
const ParamsRelId = z.object({ id: z.string().uuid(), relationshipId: z.string().uuid() });

// CreateCrossRelationshipInput lives in @ogden/shared, which can resolve a
// different `zod` instance than the api package — `error instanceof ZodError`
// in the global handler then misses. Catch by shape and rethrow as our own
// ValidationError so the response is consistent (422 + structured payload).
function parseCreate(body: unknown) {
  const r = CreateCrossRelationshipInput.safeParse(body);
  if (!r.success) {
    throw new ValidationError(
      'Request validation failed',
      r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return r.data;
}

interface RelRow {
  id: string;
  project_a_id: string;
  project_b_id: string;
  relationship_type: string;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
  other_project_name: string | null;
}

/**
 * Map a row to the shared `CrossRelationship` shape. `viewerProjectId` is the
 * project the list was requested for; the "other project name" is resolved
 * relative to it for display.
 */
function mapRow(row: RelRow): CrossRelationship {
  return {
    id: row.id,
    projectAId: row.project_a_id,
    projectBId: row.project_b_id,
    relationshipType: row.relationship_type as CrossRelationship['relationshipType'],
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    otherProjectName: row.other_project_name,
  };
}

export default async function crossProjectRelationshipRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/cross-project-relationships — list relationships touching :id
  // (either side). Any role with project access may read. The JOIN resolves
  // the OTHER project's name relative to :id for list display.
  fastify.get<{ Params: { id: string } }>(
    '/:id/cross-project-relationships',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      ParamsId.parse(req.params);
      const viewer = req.projectId;
      const rows = await db<RelRow[]>`
        SELECT
          r.id, r.project_a_id, r.project_b_id, r.relationship_type,
          r.notes, r.created_by, r.created_at,
          other.name AS other_project_name
        FROM cross_project_relationships r
        JOIN projects other
          ON other.id = CASE WHEN r.project_a_id = ${viewer}
                             THEN r.project_b_id ELSE r.project_a_id END
        WHERE r.project_a_id = ${viewer} OR r.project_b_id = ${viewer}
        ORDER BY r.created_at ASC
      `;
      return { data: rows.map(mapRow), meta: { total: rows.length }, error: null };
    },
  );

  // POST /:id/cross-project-relationships — create (owner of BOTH projects).
  // §8: a steward records relationships only among projects they own.
  fastify.post<{ Params: { id: string } }>(
    '/:id/cross-project-relationships',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req, reply) => {
      ParamsId.parse(req.params);
      const input = parseCreate(req.body);
      const thisId = req.projectId;

      if (input.projectBId === thisId) {
        throw new ValidationError('A project cannot relate to itself');
      }

      // Verify the OTHER project exists and the caller owns it. resolveProjectRole
      // already proved ownership of :id (via requireRole('owner')); the second
      // project needs its own access check since the preHandler only resolved one.
      const [other] = await db<{ id: string; owner_id: string }[]>`
        SELECT id, owner_id FROM projects WHERE id = ${input.projectBId}
      `;
      if (!other) throw new NotFoundError('Project', input.projectBId);
      if (other.owner_id !== req.userId) {
        throw new ForbiddenError('You do not own the other project in this relationship');
      }

      // Normalise to canonical order (a < b) so the symmetric pair dedupes and
      // satisfies the DB ordering CHECK regardless of which way it was created.
      const [aId, bId] =
        thisId < input.projectBId ? [thisId, input.projectBId] : [input.projectBId, thisId];

      let row: RelRow | undefined;
      try {
        [row] = await db<RelRow[]>`
          INSERT INTO cross_project_relationships (
            project_a_id, project_b_id, relationship_type, notes, created_by
          ) VALUES (
            ${aId}, ${bId}, ${input.relationshipType}, ${input.notes ?? null}, ${req.userId}
          )
          RETURNING id, project_a_id, project_b_id, relationship_type,
                    notes, created_by, created_at, NULL AS other_project_name
        `;
      } catch (err) {
        // 23505 = unique_violation: this pair already has this relationship type.
        if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
          throw new AppError(
            'CONFLICT',
            'This relationship type already exists between these two projects',
            409,
          );
        }
        throw err;
      }

      reply.code(201);
      return { data: mapRow(row!), meta: undefined, error: null };
    },
  );

  // DELETE /:id/cross-project-relationships/:relationshipId — remove (owner).
  fastify.delete<{ Params: { id: string; relationshipId: string } }>(
    '/:id/cross-project-relationships/:relationshipId',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req, reply) => {
      const { relationshipId } = ParamsRelId.parse(req.params);

      // The row must involve :id on either side, so an owner of one project
      // can dissolve a relationship it participates in.
      const [existing] = await db<{ id: string }[]>`
        SELECT id FROM cross_project_relationships
        WHERE id = ${relationshipId}
          AND (project_a_id = ${req.projectId} OR project_b_id = ${req.projectId})
      `;
      if (!existing) throw new NotFoundError('Cross-project relationship', relationshipId);

      await db`DELETE FROM cross_project_relationships WHERE id = ${relationshipId}`;
      reply.code(204);
      return '';
    },
  );
}

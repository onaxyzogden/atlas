/**
 * Comment routes — CRUD for project comments with optional map coordinates.
 *
 * Registered at prefix /api/v1/projects (shares prefix with project routes).
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateCommentInput, UpdateCommentInput } from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsId = z.object({ id: z.string().uuid() });
const ParamsCommentId = z.object({ id: z.string().uuid(), commentId: z.string().uuid() });

function mapRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    projectId: row.project_id,
    authorId: row.author_id,
    authorName: row.author_name ?? null,
    authorEmail: row.author_email,
    text: row.text,
    location: row.lng != null && row.lat != null ? [row.lng, row.lat] : null,
    featureId: row.feature_id ?? null,
    featureType: row.feature_type ?? null,
    resolved: row.resolved,
    resolvedBy: row.resolved_by ?? null,
    parentId: row.parent_id ?? null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export default async function commentRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/comments — list comments for project (any role)
  fastify.get<{ Params: { id: string }; Querystring: { resolved?: string } }>(
    '/:id/comments',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const resolvedFilter = req.query.resolved;

      let rows;
      if (resolvedFilter === 'true') {
        rows = await db`
          SELECT pc.*, u.display_name AS author_name, u.email AS author_email,
                 ST_X(pc.location::geometry) AS lng, ST_Y(pc.location::geometry) AS lat
          FROM project_comments pc
          JOIN users u ON u.id = pc.author_id
          WHERE pc.project_id = ${req.projectId} AND pc.resolved = true
          ORDER BY pc.created_at DESC
        `;
      } else if (resolvedFilter === 'false') {
        rows = await db`
          SELECT pc.*, u.display_name AS author_name, u.email AS author_email,
                 ST_X(pc.location::geometry) AS lng, ST_Y(pc.location::geometry) AS lat
          FROM project_comments pc
          JOIN users u ON u.id = pc.author_id
          WHERE pc.project_id = ${req.projectId} AND pc.resolved = false
          ORDER BY pc.created_at DESC
        `;
      } else {
        rows = await db`
          SELECT pc.*, u.display_name AS author_name, u.email AS author_email,
                 ST_X(pc.location::geometry) AS lng, ST_Y(pc.location::geometry) AS lat
          FROM project_comments pc
          JOIN users u ON u.id = pc.author_id
          WHERE pc.project_id = ${req.projectId}
          ORDER BY pc.created_at DESC
        `;
      }

      return { data: rows.map(mapRow), meta: { total: rows.length }, error: null };
    },
  );

  // POST /:id/comments — create comment (owner, designer, reviewer)
  fastify.post<{ Params: { id: string } }>(
    '/:id/comments',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer', 'reviewer')] },
    async (req, reply) => {
      const body = CreateCommentInput.parse(req.body);

      const locationExpr = body.location
        ? db`ST_SetSRID(ST_MakePoint(${body.location[0]}, ${body.location[1]}), 4326)`
        : db`NULL`;

      const [row] = await db`
        INSERT INTO project_comments (
          project_id, author_id, text, location, feature_id, feature_type, parent_id
        ) VALUES (
          ${req.projectId},
          ${req.userId},
          ${body.text},
          ${locationExpr},
          ${body.featureId ?? null},
          ${body.featureType ?? null},
          ${body.parentId ?? null}
        )
        RETURNING *
      `;

      // Fetch author info for response
      const [user] = await db`SELECT display_name, email FROM users WHERE id = ${req.userId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'comment_added',
        entityType: 'comment',
        entityId: row!.id as string,
        metadata: { text: body.text.slice(0, 100), hasLocation: !!body.location },
      });

      const result = {
        ...mapRow({ ...row, author_name: user?.display_name, author_email: user?.email }),
      };

      // Override location from input since we know it
      if (body.location) {
        (result as Record<string, unknown>).location = body.location;
      }

      // Broadcast to other project members via WebSocket
      fastify.wsBroadcast(req.projectId, {
        type: 'comment_added',
        payload: result as unknown as Record<string, unknown>,
        userId: req.userId,
        userName: null,
        timestamp: new Date().toISOString(),
      }, req.userId);

      reply.code(201);
      return { data: result, meta: undefined, error: null };
    },
  );

  // PATCH /:id/comments/:commentId — edit text or resolve
  fastify.patch<{ Params: { id: string; commentId: string } }>(
    '/:id/comments/:commentId',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer', 'reviewer')] },
    async (req) => {
      const { commentId } = ParamsCommentId.parse(req.params);
      const body = UpdateCommentInput.parse(req.body);

      const [existing] = await db`
        SELECT id, author_id, resolved FROM project_comments
        WHERE id = ${commentId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('Comment', commentId);

      // Text edits: only author can edit their own text
      if (body.text !== undefined && existing.author_id !== req.userId) {
        throw new ForbiddenError('Only the comment author can edit text');
      }

      // Resolve: owner and designer can resolve any comment; reviewer can resolve their own
      if (body.resolved !== undefined && body.resolved && !existing.resolved) {
        if (req.projectRole === 'reviewer' && existing.author_id !== req.userId) {
          throw new ForbiddenError('Reviewers can only resolve their own comments');
        }
      }

      const [updated] = await db`
        UPDATE project_comments SET
          text        = COALESCE(${body.text ?? null}, text),
          resolved    = COALESCE(${body.resolved ?? null}, resolved),
          resolved_by = ${body.resolved ? req.userId : null},
          resolved_at = ${body.resolved ? db`now()` : body.resolved === false ? null : db`resolved_at`},
          updated_at  = now()
        WHERE id = ${commentId}
        RETURNING *,
          ST_X(location::geometry) AS lng,
          ST_Y(location::geometry) AS lat
      `;

      const [user] = await db`SELECT display_name, email FROM users WHERE id = ${updated!.author_id}`;

      if (body.resolved) {
        await logActivity(db, {
          projectId: req.projectId,
          userId: req.userId,
          action: 'comment_resolved',
          entityType: 'comment',
          entityId: commentId,
        });

        // Broadcast to other project members via WebSocket
        fastify.wsBroadcast(req.projectId, {
          type: 'comment_resolved',
          payload: { commentId },
          userId: req.userId,
          userName: null,
          timestamp: new Date().toISOString(),
        }, req.userId);
      }

      return {
        data: mapRow({
          ...updated,
          author_name: user?.display_name,
          author_email: user?.email,
        }),
        meta: undefined,
        error: null,
      };
    },
  );

  // DELETE /:id/comments/:commentId — delete comment (author or owner)
  fastify.delete<{ Params: { id: string; commentId: string } }>(
    '/:id/comments/:commentId',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req, reply) => {
      const { commentId } = ParamsCommentId.parse(req.params);

      const [existing] = await db`
        SELECT id, author_id FROM project_comments
        WHERE id = ${commentId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('Comment', commentId);

      // Only author or project owner can delete
      if (existing.author_id !== req.userId && req.projectRole !== 'owner') {
        throw new ForbiddenError('Only the comment author or project owner can delete comments');
      }

      await db`DELETE FROM project_comments WHERE id = ${commentId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'comment_deleted',
        entityType: 'comment',
        entityId: commentId,
      });

      // Broadcast to other project members via WebSocket
      fastify.wsBroadcast(req.projectId, {
        type: 'comment_deleted',
        payload: { commentId },
        userId: req.userId,
        userName: null,
        timestamp: new Date().toISOString(),
      }, req.userId);

      reply.code(204);
      return '';
    },
  );
}

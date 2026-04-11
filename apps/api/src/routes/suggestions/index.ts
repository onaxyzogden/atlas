/**
 * Suggested edit routes — reviewers can propose changes for owner/designer approval.
 *
 * Registered at prefix /api/v1/projects (shares prefix with project routes).
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateSuggestedEditInput, ReviewSuggestedEditInput } from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsId = z.object({ id: z.string().uuid() });
const ParamsSuggestionId = z.object({ id: z.string().uuid(), suggestionId: z.string().uuid() });

export default async function suggestionRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/suggestions — list suggestions for project (any role)
  fastify.get<{ Params: { id: string } }>(
    '/:id/suggestions',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const rows = await db`
        SELECT
          se.id, se.project_id, se.author_id, se.feature_id,
          se.comment_id, se.status, se.diff_payload,
          se.reviewed_by, se.reviewed_at, se.created_at,
          u.display_name AS author_name, u.email AS author_email
        FROM suggested_edits se
        JOIN users u ON u.id = se.author_id
        WHERE se.project_id = ${req.projectId}
        ORDER BY se.created_at DESC
      `;

      return {
        data: rows.map((r) => ({
          id: r.id,
          projectId: r.project_id,
          authorId: r.author_id,
          authorName: r.author_name ?? r.author_email,
          featureId: r.feature_id,
          commentId: r.comment_id ?? null,
          status: r.status,
          diffPayload: r.diff_payload,
          reviewedBy: r.reviewed_by ?? null,
          reviewedAt: r.reviewed_at ? (r.reviewed_at as Date).toISOString() : null,
          createdAt: (r.created_at as Date).toISOString(),
        })),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // POST /:id/suggestions — create suggestion (reviewer only)
  fastify.post<{ Params: { id: string } }>(
    '/:id/suggestions',
    { preHandler: [authenticate, resolveProjectRole, requireRole('reviewer')] },
    async (req, reply) => {
      const body = CreateSuggestedEditInput.parse(req.body);

      // Verify feature exists in this project
      const [feature] = await db`
        SELECT id FROM design_features WHERE id = ${body.featureId} AND project_id = ${req.projectId}
      `;
      if (!feature) throw new NotFoundError('DesignFeature', body.featureId);

      // Optionally create a linked comment
      let commentId: string | null = null;
      if (body.comment) {
        const [commentRow] = await db`
          INSERT INTO project_comments (project_id, author_id, text, feature_id, feature_type)
          VALUES (${req.projectId}, ${req.userId}, ${body.comment}, ${body.featureId}, 'design_feature')
          RETURNING id
        `;
        commentId = commentRow!.id as string;
      }

      const [row] = await db`
        INSERT INTO suggested_edits (project_id, author_id, feature_id, comment_id, diff_payload)
        VALUES (
          ${req.projectId},
          ${req.userId},
          ${body.featureId},
          ${commentId},
          ${JSON.stringify(body.diffPayload)}
        )
        RETURNING *
      `;

      const [user] = await db`SELECT display_name, email FROM users WHERE id = ${req.userId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'suggestion_created',
        entityType: 'suggested_edit',
        entityId: row!.id as string,
        metadata: { featureId: body.featureId },
      });

      reply.code(201);
      return {
        data: {
          id: row!.id,
          projectId: row!.project_id,
          authorId: row!.author_id,
          authorName: user?.display_name ?? user?.email ?? null,
          featureId: row!.feature_id,
          commentId: row!.comment_id ?? null,
          status: row!.status,
          diffPayload: row!.diff_payload,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: (row!.created_at as Date).toISOString(),
        },
        meta: undefined,
        error: null,
      };
    },
  );

  // PATCH /:id/suggestions/:suggestionId — approve or reject (owner + designer)
  fastify.patch<{ Params: { id: string; suggestionId: string } }>(
    '/:id/suggestions/:suggestionId',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req) => {
      const { suggestionId } = ParamsSuggestionId.parse(req.params);
      const body = ReviewSuggestedEditInput.parse(req.body);

      const [existing] = await db`
        SELECT id, status, feature_id, diff_payload
        FROM suggested_edits
        WHERE id = ${suggestionId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('SuggestedEdit', suggestionId);
      if (existing.status !== 'pending') {
        throw new ForbiddenError('This suggestion has already been reviewed');
      }

      // Update suggestion status
      await db`
        UPDATE suggested_edits SET
          status = ${body.action},
          reviewed_by = ${req.userId},
          reviewed_at = now()
        WHERE id = ${suggestionId}
      `;

      // If approved, apply the diff to the target feature
      if (body.action === 'approved') {
        const diff = existing.diff_payload as { properties?: { after: Record<string, unknown> }; geometry?: { after: unknown } };

        if (diff.properties?.after) {
          const newProps = JSON.stringify(diff.properties.after);
          await db`
            UPDATE design_features SET properties = ${newProps}::jsonb, updated_at = now()
            WHERE id = ${existing.feature_id}
          `;
        }

        if (diff.geometry?.after) {
          const geomStr = JSON.stringify(diff.geometry.after);
          await db`
            UPDATE design_features SET geometry = ST_GeomFromGeoJSON(${geomStr}), updated_at = now()
            WHERE id = ${existing.feature_id}
          `;
        }
      }

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: body.action === 'approved' ? 'suggestion_approved' : 'suggestion_rejected',
        entityType: 'suggested_edit',
        entityId: suggestionId,
      });

      const [updated] = await db`
        SELECT
          se.id, se.project_id, se.author_id, se.feature_id,
          se.comment_id, se.status, se.diff_payload,
          se.reviewed_by, se.reviewed_at, se.created_at,
          u.display_name AS author_name, u.email AS author_email
        FROM suggested_edits se
        JOIN users u ON u.id = se.author_id
        WHERE se.id = ${suggestionId}
      `;

      return {
        data: {
          id: updated!.id,
          projectId: updated!.project_id,
          authorId: updated!.author_id,
          authorName: updated!.author_name ?? updated!.author_email,
          featureId: updated!.feature_id,
          commentId: updated!.comment_id ?? null,
          status: updated!.status,
          diffPayload: updated!.diff_payload,
          reviewedBy: updated!.reviewed_by ?? null,
          reviewedAt: updated!.reviewed_at ? (updated!.reviewed_at as Date).toISOString() : null,
          createdAt: (updated!.created_at as Date).toISOString(),
        },
        meta: undefined,
        error: null,
      };
    },
  );
}

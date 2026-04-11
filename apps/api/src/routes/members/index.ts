/**
 * Project member routes — invite, list, update role, remove members.
 *
 * Registered at prefix /api/v1/projects (shares prefix with project routes).
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { InviteMemberInput, UpdateMemberRoleInput } from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsId = z.object({ id: z.string().uuid() });
const ParamsIdUserId = z.object({ id: z.string().uuid(), userId: z.string().uuid() });

export default async function memberRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/members — list project members (any role)
  fastify.get<{ Params: { id: string } }>(
    '/:id/members',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      // Include owner as implicit member
      const [ownerRow] = await db`
        SELECT p.owner_id AS user_id, u.email, u.display_name, p.created_at AS joined_at
        FROM projects p
        JOIN users u ON u.id = p.owner_id
        WHERE p.id = ${req.projectId}
      `;

      const memberRows = await db`
        SELECT pm.user_id, u.email, u.display_name, pm.role, pm.joined_at
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = ${req.projectId}
        ORDER BY pm.joined_at
      `;

      const members = [];

      // Owner first
      if (ownerRow) {
        members.push({
          userId: ownerRow.user_id,
          email: ownerRow.email,
          displayName: ownerRow.display_name ?? null,
          role: 'owner' as const,
          joinedAt: (ownerRow.joined_at as Date).toISOString(),
        });
      }

      // Then other members (skip if same as owner — shouldn't happen, but guard)
      for (const r of memberRows) {
        if (r.user_id !== ownerRow?.user_id) {
          members.push({
            userId: r.user_id,
            email: r.email,
            displayName: r.display_name ?? null,
            role: r.role as string,
            joinedAt: (r.joined_at as Date).toISOString(),
          });
        }
      }

      return { data: members, meta: { total: members.length }, error: null };
    },
  );

  // POST /:id/members — invite member by email (owner only)
  fastify.post<{ Params: { id: string } }>(
    '/:id/members',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req, reply) => {
      const body = InviteMemberInput.parse(req.body);

      // Find user by email
      const [targetUser] = await db`SELECT id, email, display_name FROM users WHERE email = ${body.email}`;
      if (!targetUser) {
        throw new NotFoundError('User', body.email);
      }

      // Can't invite yourself
      if (targetUser.id === req.userId) {
        throw new ForbiddenError('Cannot invite yourself to your own project');
      }

      // Check project owner — can't demote owner through members
      const [proj] = await db`SELECT owner_id FROM projects WHERE id = ${req.projectId}`;
      if (targetUser.id === proj?.owner_id) {
        throw new ForbiddenError('The project owner cannot be added as a member');
      }

      // Upsert member
      await db`
        INSERT INTO project_members (project_id, user_id, role, invited_by)
        VALUES (${req.projectId}, ${targetUser.id}, ${body.role}, ${req.userId})
        ON CONFLICT (project_id, user_id) DO UPDATE SET role = ${body.role}
      `;

      const [member] = await db`
        SELECT pm.user_id, u.email, u.display_name, pm.role, pm.joined_at
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = ${req.projectId} AND pm.user_id = ${targetUser.id}
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'member_joined',
        entityType: 'member',
        entityId: targetUser.id as string,
        metadata: { email: body.email, role: body.role },
      });

      reply.code(201);
      return {
        data: {
          userId: member!.user_id,
          email: member!.email,
          displayName: member!.display_name ?? null,
          role: member!.role,
          joinedAt: (member!.joined_at as Date).toISOString(),
        },
        meta: undefined,
        error: null,
      };
    },
  );

  // PATCH /:id/members/:userId — change member role (owner only)
  fastify.patch<{ Params: { id: string; userId: string } }>(
    '/:id/members/:userId',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req) => {
      const { userId: targetUserId } = ParamsIdUserId.parse(req.params);
      const body = UpdateMemberRoleInput.parse(req.body);

      // Can't change owner's role
      const [proj] = await db`SELECT owner_id FROM projects WHERE id = ${req.projectId}`;
      if (targetUserId === proj?.owner_id) {
        throw new ForbiddenError('Cannot change the project owner\'s role');
      }

      const [existing] = await db`
        SELECT user_id FROM project_members
        WHERE project_id = ${req.projectId} AND user_id = ${targetUserId}
      `;
      if (!existing) throw new NotFoundError('Member', targetUserId);

      await db`
        UPDATE project_members SET role = ${body.role}
        WHERE project_id = ${req.projectId} AND user_id = ${targetUserId}
      `;

      const [member] = await db`
        SELECT pm.user_id, u.email, u.display_name, pm.role, pm.joined_at
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = ${req.projectId} AND pm.user_id = ${targetUserId}
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'role_changed',
        entityType: 'member',
        entityId: targetUserId,
        metadata: { newRole: body.role },
      });

      return {
        data: {
          userId: member!.user_id,
          email: member!.email,
          displayName: member!.display_name ?? null,
          role: member!.role,
          joinedAt: (member!.joined_at as Date).toISOString(),
        },
        meta: undefined,
        error: null,
      };
    },
  );

  // DELETE /:id/members/:userId — remove member (owner only)
  fastify.delete<{ Params: { id: string; userId: string } }>(
    '/:id/members/:userId',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req, reply) => {
      const { userId: targetUserId } = ParamsIdUserId.parse(req.params);

      // Can't remove yourself as the owner
      if (targetUserId === req.userId) {
        throw new ForbiddenError('Cannot remove yourself from the project');
      }

      const [existing] = await db`
        SELECT user_id FROM project_members
        WHERE project_id = ${req.projectId} AND user_id = ${targetUserId}
      `;
      if (!existing) throw new NotFoundError('Member', targetUserId);

      await db`
        DELETE FROM project_members
        WHERE project_id = ${req.projectId} AND user_id = ${targetUserId}
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'member_removed',
        entityType: 'member',
        entityId: targetUserId,
      });

      reply.code(204);
      return '';
    },
  );
}

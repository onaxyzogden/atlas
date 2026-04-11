/**
 * Organization routes — CRUD for organizations and their members.
 *
 * Registered at prefix /api/v1/organizations.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateOrganizationInput, InviteOrgMemberInput } from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';

const ParamsId = z.object({ id: z.string().uuid() });
const ParamsIdUserId = z.object({ id: z.string().uuid(), userId: z.string().uuid() });

export default async function organizationRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  /** Verify that req.userId is an owner of the given org */
  async function requireOrgOwner(orgId: string, userId: string) {
    const [row] = await db`
      SELECT role FROM organization_members WHERE org_id = ${orgId} AND user_id = ${userId}
    `;
    if (!row || row.role !== 'owner') {
      throw new ForbiddenError('Only organization owners can perform this action');
    }
  }

  /** Verify that req.userId is a member of the given org */
  async function requireOrgMember(orgId: string, userId: string) {
    const [row] = await db`
      SELECT role FROM organization_members WHERE org_id = ${orgId} AND user_id = ${userId}
    `;
    if (!row) {
      throw new ForbiddenError('You are not a member of this organization');
    }
    return row.role as string;
  }

  // POST / — create organization (creator becomes owner)
  fastify.post('/', { preHandler: [authenticate] }, async (req, reply) => {
    const body = CreateOrganizationInput.parse(req.body);

    const [org] = await db`
      INSERT INTO organizations (name) VALUES (${body.name})
      RETURNING id, name, plan, created_at
    `;

    // Add creator as owner
    await db`
      INSERT INTO organization_members (org_id, user_id, role)
      VALUES (${org!.id}, ${req.userId}, 'owner')
    `;

    reply.code(201);
    return {
      data: {
        id: org!.id,
        name: org!.name,
        plan: org!.plan,
        createdAt: (org!.created_at as Date).toISOString(),
      },
      meta: undefined,
      error: null,
    };
  });

  // GET / — list orgs where user is member
  fastify.get('/', { preHandler: [authenticate] }, async (req) => {
    const rows = await db`
      SELECT o.id, o.name, o.plan, o.created_at
      FROM organizations o
      JOIN organization_members om ON om.org_id = o.id
      WHERE om.user_id = ${req.userId}
      ORDER BY o.name
    `;

    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        plan: r.plan,
        createdAt: (r.created_at as Date).toISOString(),
      })),
      meta: { total: rows.length },
      error: null,
    };
  });

  // GET /:id/members — list org members (must be org member)
  fastify.get<{ Params: { id: string } }>(
    '/:id/members',
    { preHandler: [authenticate] },
    async (req) => {
      const { id: orgId } = ParamsId.parse(req.params);
      await requireOrgMember(orgId, req.userId);

      const rows = await db`
        SELECT om.user_id, u.email, u.display_name, om.role, om.joined_at
        FROM organization_members om
        JOIN users u ON u.id = om.user_id
        WHERE om.org_id = ${orgId}
        ORDER BY om.joined_at
      `;

      return {
        data: rows.map((r) => ({
          userId: r.user_id,
          email: r.email,
          displayName: r.display_name ?? null,
          role: r.role,
          joinedAt: (r.joined_at as Date).toISOString(),
        })),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // POST /:id/members — invite member by email (org owner only)
  fastify.post<{ Params: { id: string } }>(
    '/:id/members',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { id: orgId } = ParamsId.parse(req.params);
      await requireOrgOwner(orgId, req.userId);

      const body = InviteOrgMemberInput.parse(req.body);

      // Find user by email
      const [targetUser] = await db`SELECT id FROM users WHERE email = ${body.email}`;
      if (!targetUser) {
        throw new NotFoundError('User', body.email);
      }

      // Check if already a member
      const [existing] = await db`
        SELECT user_id FROM organization_members WHERE org_id = ${orgId} AND user_id = ${targetUser.id}
      `;
      if (existing) {
        // Update role instead
        await db`
          UPDATE organization_members SET role = ${body.role}
          WHERE org_id = ${orgId} AND user_id = ${targetUser.id}
        `;
      } else {
        await db`
          INSERT INTO organization_members (org_id, user_id, role)
          VALUES (${orgId}, ${targetUser.id}, ${body.role})
        `;
      }

      const [member] = await db`
        SELECT om.user_id, u.email, u.display_name, om.role, om.joined_at
        FROM organization_members om
        JOIN users u ON u.id = om.user_id
        WHERE om.org_id = ${orgId} AND om.user_id = ${targetUser.id}
      `;

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

  // DELETE /:id/members/:userId — remove member (org owner only)
  fastify.delete<{ Params: { id: string; userId: string } }>(
    '/:id/members/:userId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { id: orgId, userId: targetUserId } = ParamsIdUserId.parse(req.params);
      await requireOrgOwner(orgId, req.userId);

      // Can't remove yourself as the sole owner
      if (targetUserId === req.userId) {
        const ownerCount = await db`
          SELECT count(*) AS cnt FROM organization_members
          WHERE org_id = ${orgId} AND role = 'owner'
        `;
        if (Number(ownerCount[0]?.cnt) <= 1) {
          throw new ForbiddenError('Cannot remove the last owner of the organization');
        }
      }

      await db`
        DELETE FROM organization_members WHERE org_id = ${orgId} AND user_id = ${targetUserId}
      `;

      reply.code(204);
      return '';
    },
  );
}

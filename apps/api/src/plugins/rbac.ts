/**
 * RBAC plugin — Role-Based Access Control for project endpoints.
 *
 * After authentication, resolveProjectRole looks up the caller's role on a project:
 *   1. If userId === project.owner_id → role = 'owner'
 *   2. Else look up project_members row → role from row
 *   3. No match → ForbiddenError
 *
 * Decorates:
 *   - req.projectRole  ('owner' | 'designer' | 'reviewer' | 'viewer')
 *   - req.projectId    (resolved UUID)
 *   - fastify.resolveProjectRole  (preHandler)
 *   - fastify.requireRole(...roles) (preHandler factory)
 */

import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ProjectRole } from '@ogden/shared';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    resolveProjectRole: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...allowed: ProjectRole[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    projectRole: ProjectRole;
    projectId: string;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const { db } = fastify;

  // Use null as placeholder — actual values set by resolveProjectRole preHandler
  fastify.decorateRequest('projectRole', null as unknown as ProjectRole);
  fastify.decorateRequest('projectId', null as unknown as string);

  fastify.decorate(
    'resolveProjectRole',
    async (req: FastifyRequest, _reply: FastifyReply) => {
      // Extract projectId from either :id or :projectId param patterns
      const params = req.params as Record<string, string>;
      const projectId = params['id'] ?? params['projectId'];

      if (!projectId) {
        throw new ForbiddenError('No project ID in request');
      }

      // Check project exists and get owner
      const [project] = await db`
        SELECT id, owner_id FROM projects WHERE id = ${projectId}
      `;
      if (!project) throw new NotFoundError('Project', projectId);

      req.projectId = projectId;

      // Owner shortcut
      if (project.owner_id === req.userId) {
        req.projectRole = 'owner';
        return;
      }

      // Check project_members
      const [membership] = await db`
        SELECT role FROM project_members
        WHERE project_id = ${projectId} AND user_id = ${req.userId}
      `;

      if (!membership) {
        throw new ForbiddenError('You do not have access to this project');
      }

      req.projectRole = membership.role as ProjectRole;
    },
  );

  fastify.decorate(
    'requireRole',
    (...allowed: ProjectRole[]) => {
      return async (req: FastifyRequest, _reply: FastifyReply) => {
        if (!allowed.includes(req.projectRole)) {
          throw new ForbiddenError(
            `This action requires one of: ${allowed.join(', ')}. Your role: ${req.projectRole}`,
          );
        }
      };
    },
  );
});

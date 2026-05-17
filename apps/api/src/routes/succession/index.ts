import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  CreateSuccessionMilestoneInput,
  UpdateSuccessionMilestoneInput,
  SuccessionMilestoneSummary,
  toCamelCase,
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

/**
 * Succession-milestone routes — typed-table sync transport for the
 * server-queryable `ogden-act-succession` store (Phase 3 of Full
 * syncService Coverage). Mirrors machinery-items: client-supplied id
 * (`sm-<ts>-<rand>`, not a uuid), create→POST, update→PATCH, delete. Does
 * not touch the design-feature surface (Phase 3 3.3 no double-write).
 */

const ParamsProjectId = z.object({ projectId: z.string().uuid() });
const ParamsId = z.object({ id: z.string().min(1) });

function parseRow(row: Record<string, unknown>) {
  return SuccessionMilestoneSummary.parse(toCamelCase(row));
}

const SELECT_COLS = `
  id, project_id, zone_id, year, phase, observation,
  photo_data_url, created_at, updated_at
`;

export default async function successionRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  const resolveProjectRoleFromItem = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = ParamsId.parse(req.params);
    const [row] = await db`SELECT project_id FROM succession_milestones WHERE id = ${id}`;
    if (!row) throw new NotFoundError('SuccessionMilestone', id);
    (req.params as Record<string, string>)['id'] = row.project_id as string;
    await resolveProjectRole(req, reply);
    (req.params as Record<string, string>)['id'] = id;
  };

  // GET /project/:projectId — list (any role)
  fastify.get<{ Params: { projectId: string } }>(
    '/project/:projectId',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const { projectId } = ParamsProjectId.parse(req.params);
      const rows = await db.unsafe(
        `SELECT ${SELECT_COLS} FROM succession_milestones WHERE project_id = $1 ORDER BY year, created_at`,
        [projectId],
      );
      return { data: rows.map(parseRow), meta: { total: rows.length }, error: null };
    },
  );

  // POST /project/:projectId — create (owner + designer)
  fastify.post<{ Params: { projectId: string } }>(
    '/project/:projectId',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req, reply) => {
      const { projectId } = ParamsProjectId.parse(req.params);
      const body = CreateSuccessionMilestoneInput.parse(req.body);

      const [row] = await db`
        INSERT INTO succession_milestones (
          id, project_id, zone_id, year, phase, observation,
          photo_data_url, created_by
        ) VALUES (
          ${body.id ?? db`gen_random_uuid()::text`},
          ${projectId},
          ${body.zoneId ?? null},
          ${body.year},
          ${body.phase},
          ${body.observation},
          ${body.photoDataUrl ?? null},
          ${req.userId}
        )
        RETURNING
          id, project_id, zone_id, year, phase, observation,
          photo_data_url, created_at, updated_at
      `;

      await logActivity(db, {
        projectId,
        userId: req.userId,
        action: 'succession_created',
        entityType: 'succession_milestone',
        entityId: row!.id as string,
        metadata: { year: body.year, phase: body.phase },
      });

      reply.code(201);
      return { data: parseRow(row!), meta: undefined, error: null };
    },
  );

  // PATCH /:id — update (owner + designer)
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, resolveProjectRoleFromItem, requireRole('owner', 'designer')] },
    async (req) => {
      const { id } = ParamsId.parse(req.params);
      const body = UpdateSuccessionMilestoneInput.parse(req.body);

      const [existing] = await db`SELECT * FROM succession_milestones WHERE id = ${id}`;
      if (!existing) throw new NotFoundError('SuccessionMilestone', id);

      const merged = {
        zone_id: body.zoneId !== undefined ? body.zoneId : existing.zone_id,
        year: body.year ?? existing.year,
        phase: body.phase ?? existing.phase,
        observation: body.observation ?? existing.observation,
        photo_data_url:
          body.photoDataUrl !== undefined ? body.photoDataUrl : existing.photo_data_url,
      };

      const [row] = await db`
        UPDATE succession_milestones SET
          zone_id        = ${merged.zone_id},
          year           = ${merged.year},
          phase          = ${merged.phase},
          observation    = ${merged.observation},
          photo_data_url = ${merged.photo_data_url},
          updated_at     = now()
        WHERE id = ${id}
        RETURNING
          id, project_id, zone_id, year, phase, observation,
          photo_data_url, created_at, updated_at
      `;

      await logActivity(db, {
        projectId: row!.project_id as string,
        userId: req.userId,
        action: 'succession_updated',
        entityType: 'succession_milestone',
        entityId: id,
        metadata: { year: row!.year as number },
      });

      return { data: parseRow(row!), meta: undefined, error: null };
    },
  );

  // DELETE /:id — delete (owner only)
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, resolveProjectRoleFromItem, requireRole('owner')] },
    async (req, reply) => {
      const { id } = ParamsId.parse(req.params);
      const [existing] = await db`SELECT project_id FROM succession_milestones WHERE id = ${id}`;
      await db`DELETE FROM succession_milestones WHERE id = ${id}`;

      if (existing) {
        await logActivity(db, {
          projectId: existing.project_id as string,
          userId: req.userId,
          action: 'succession_deleted',
          entityType: 'succession_milestone',
          entityId: id,
          metadata: {},
        });
      }

      reply.code(204);
      return '';
    },
  );
}

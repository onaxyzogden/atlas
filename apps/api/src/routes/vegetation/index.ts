import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  CreateVegetationPatchInput,
  UpdateVegetationPatchInput,
  VegetationPatchSummary,
  toCamelCase,
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

/**
 * Vegetation-patch routes — typed-table sync transport for the
 * server-queryable `ogden-vegetation` store (Phase 3 of Full syncService
 * Coverage). Mirrors machinery-items: client-supplied id, create→POST,
 * update→PATCH, delete. Geometry-bearing DESIGN elements never travel here
 * — they stay on the design-feature path (this module does not touch it).
 */

const ParamsProjectId = z.object({ projectId: z.string().uuid() });
const ParamsId = z.object({ id: z.string().min(1) });

function parseRow(row: Record<string, unknown>) {
  return VegetationPatchSummary.parse(toCamelCase(row));
}

const SELECT_COLS = `
  id, project_id, geometry, succession_stage, ground_cover,
  label, notes, created_at, updated_at
`;

export default async function vegetationRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  const resolveProjectRoleFromItem = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = ParamsId.parse(req.params);
    const [row] = await db`SELECT project_id FROM vegetation_patches WHERE id = ${id}`;
    if (!row) throw new NotFoundError('VegetationPatch', id);
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
        `SELECT ${SELECT_COLS} FROM vegetation_patches WHERE project_id = $1 ORDER BY created_at`,
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
      const body = CreateVegetationPatchInput.parse(req.body);

      const [row] = await db`
        INSERT INTO vegetation_patches (
          id, project_id, geometry, succession_stage, ground_cover,
          label, notes, created_by, created_at
        ) VALUES (
          ${body.id ?? db`gen_random_uuid()::text`},
          ${projectId},
          ${db.json((body.geometry ?? null) as never)},
          ${body.successionStage},
          ${body.groundCover},
          ${body.label ?? null},
          ${body.notes ?? null},
          ${req.userId},
          COALESCE(${body.createdAt ?? null}, now())
        )
        RETURNING
          id, project_id, geometry, succession_stage, ground_cover,
          label, notes, created_at, updated_at
      `;

      await logActivity(db, {
        projectId,
        userId: req.userId,
        action: 'vegetation_created',
        entityType: 'vegetation_patch',
        entityId: row!.id as string,
        metadata: { successionStage: body.successionStage },
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
      const body = UpdateVegetationPatchInput.parse(req.body);

      const [existing] = await db`SELECT * FROM vegetation_patches WHERE id = ${id}`;
      if (!existing) throw new NotFoundError('VegetationPatch', id);

      const merged = {
        geometry: body.geometry !== undefined ? body.geometry : existing.geometry,
        succession_stage: body.successionStage ?? existing.succession_stage,
        ground_cover: body.groundCover ?? existing.ground_cover,
        label: body.label !== undefined ? body.label : existing.label,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      };

      const [row] = await db`
        UPDATE vegetation_patches SET
          geometry         = ${db.json(merged.geometry as never)},
          succession_stage = ${merged.succession_stage},
          ground_cover     = ${merged.ground_cover},
          label            = ${merged.label},
          notes            = ${merged.notes},
          updated_at       = now()
        WHERE id = ${id}
        RETURNING
          id, project_id, geometry, succession_stage, ground_cover,
          label, notes, created_at, updated_at
      `;

      await logActivity(db, {
        projectId: row!.project_id as string,
        userId: req.userId,
        action: 'vegetation_updated',
        entityType: 'vegetation_patch',
        entityId: id,
        metadata: { successionStage: row!.succession_stage as string },
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
      const [existing] = await db`SELECT project_id FROM vegetation_patches WHERE id = ${id}`;
      await db`DELETE FROM vegetation_patches WHERE id = ${id}`;

      if (existing) {
        await logActivity(db, {
          projectId: existing.project_id as string,
          userId: req.userId,
          action: 'vegetation_deleted',
          entityType: 'vegetation_patch',
          entityId: id,
          metadata: {},
        });
      }

      reply.code(204);
      return '';
    },
  );
}

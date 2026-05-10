import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  CreateMachineryItemInput,
  UpdateMachineryItemInput,
  MachineryItemSummary,
  toCamelCase,
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsProjectId = z.object({ projectId: z.string().uuid() });
const ParamsId = z.object({ id: z.string().uuid() });

function parseRow(row: Record<string, unknown>) {
  return MachineryItemSummary.parse(toCamelCase(row));
}

const SELECT_COLS = `
  id, project_id, name, kind, purpose, frequency, fuel_type,
  required_width_m, required_turn_radius_m, housing_element_id,
  acquisition_year, lifecycle_years_estimate,
  created_at, updated_at
`;

export default async function machineryItemRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  const resolveProjectRoleFromItem = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = ParamsId.parse(req.params);
    const [row] = await db`SELECT project_id FROM machinery_items WHERE id = ${id}`;
    if (!row) throw new NotFoundError('MachineryItem', id);
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
        `SELECT ${SELECT_COLS} FROM machinery_items WHERE project_id = $1 ORDER BY created_at`,
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
      const body = CreateMachineryItemInput.parse(req.body);

      const [row] = await db`
        INSERT INTO machinery_items (
          id, project_id, name, kind, purpose, frequency, fuel_type,
          required_width_m, required_turn_radius_m, housing_element_id,
          acquisition_year, lifecycle_years_estimate
        ) VALUES (
          ${body.id ?? db`gen_random_uuid()`},
          ${projectId},
          ${body.name},
          ${body.kind},
          ${body.purpose},
          ${body.frequency},
          ${body.fuelType},
          ${body.requiredWidthM ?? null},
          ${body.requiredTurnRadiusM ?? null},
          ${body.housingElementId ?? null},
          ${body.acquisitionYear ?? null},
          ${body.lifecycleYearsEstimate ?? null}
        )
        RETURNING
          id, project_id, name, kind, purpose, frequency, fuel_type,
          required_width_m, required_turn_radius_m, housing_element_id,
          acquisition_year, lifecycle_years_estimate,
          created_at, updated_at
      `;

      await logActivity(db, {
        projectId,
        userId: req.userId,
        action: 'machinery_created',
        entityType: 'machinery_item',
        entityId: row!.id as string,
        metadata: { name: body.name, kind: body.kind },
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
      const body = UpdateMachineryItemInput.parse(req.body);

      const [existing] = await db`SELECT * FROM machinery_items WHERE id = ${id}`;
      if (!existing) throw new NotFoundError('MachineryItem', id);

      const merged = {
        name: body.name ?? existing.name,
        kind: body.kind ?? existing.kind,
        purpose: body.purpose ?? existing.purpose,
        frequency: body.frequency ?? existing.frequency,
        fuel_type: body.fuelType ?? existing.fuel_type,
        required_width_m:
          body.requiredWidthM !== undefined ? body.requiredWidthM : existing.required_width_m,
        required_turn_radius_m:
          body.requiredTurnRadiusM !== undefined
            ? body.requiredTurnRadiusM
            : existing.required_turn_radius_m,
        housing_element_id:
          body.housingElementId !== undefined ? body.housingElementId : existing.housing_element_id,
        acquisition_year:
          body.acquisitionYear !== undefined ? body.acquisitionYear : existing.acquisition_year,
        lifecycle_years_estimate:
          body.lifecycleYearsEstimate !== undefined
            ? body.lifecycleYearsEstimate
            : existing.lifecycle_years_estimate,
      };

      const [row] = await db`
        UPDATE machinery_items SET
          name                     = ${merged.name},
          kind                     = ${merged.kind},
          purpose                  = ${merged.purpose},
          frequency                = ${merged.frequency},
          fuel_type                = ${merged.fuel_type},
          required_width_m         = ${merged.required_width_m},
          required_turn_radius_m   = ${merged.required_turn_radius_m},
          housing_element_id       = ${merged.housing_element_id},
          acquisition_year         = ${merged.acquisition_year},
          lifecycle_years_estimate = ${merged.lifecycle_years_estimate},
          updated_at               = now()
        WHERE id = ${id}
        RETURNING
          id, project_id, name, kind, purpose, frequency, fuel_type,
          required_width_m, required_turn_radius_m, housing_element_id,
          acquisition_year, lifecycle_years_estimate,
          created_at, updated_at
      `;

      await logActivity(db, {
        projectId: row!.project_id as string,
        userId: req.userId,
        action: 'machinery_updated',
        entityType: 'machinery_item',
        entityId: id,
        metadata: { name: row!.name as string },
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
      const [existing] = await db`SELECT project_id, name FROM machinery_items WHERE id = ${id}`;
      await db`DELETE FROM machinery_items WHERE id = ${id}`;

      if (existing) {
        await logActivity(db, {
          projectId: existing.project_id as string,
          userId: req.userId,
          action: 'machinery_deleted',
          entityType: 'machinery_item',
          entityId: id,
          metadata: { name: existing.name as string },
        });
      }

      reply.code(204);
      return '';
    },
  );
}

/**
 * OLOS ActTask routes — CRUD + state transitions on olos_act_tasks under
 * /api/v1/projects/:id/olos/tasks.
 *
 * Status is validated via the ActTaskStatus enum. The status CHECK
 * constraint in migration 043 is the DB-side enforcement; valid transitions
 * are taken on trust here — the proof / verify / escalate routes drive the
 * intended graph (assigned → in-progress → completed-pending-verification
 * → verified-complete, with rework / blocked / escalated as side branches).
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  ActTaskStatus,
  ActTaskPriority,
  GeoJSONGeometrySchema,
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsTaskId = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
});

const ListQuery = z.object({
  objectiveId: z.string().optional(),
  handoffPackageId: z.string().uuid().optional(),
  status: ActTaskStatus.optional(),
  assigneeId: z.string().uuid().optional(),
});

const TaskCreateInput = z.object({
  objectiveId: z.string().min(1),
  handoffPackageId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().default(''),
  locationGeometry: GeoJSONGeometrySchema.nullish(),
  assigneeId: z.string().uuid().nullish(),
  roleId: z.string().nullish(),
  dueDate: z.string().datetime().nullish(),
  priority: ActTaskPriority.default('normal'),
  status: ActTaskStatus.default('ready'),
  blockerReason: z.string().nullish(),
});

const TaskPatchInput = TaskCreateInput.partial().omit({
  handoffPackageId: true,
});

type Row = Record<string, unknown>;

function mapRow(row: Row) {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    objectiveId: row.objective_id as string,
    handoffPackageId: row.handoff_package_id as string,
    title: row.title as string,
    description: row.description as string,
    locationGeometry: row.location_geojson ?? null,
    assigneeId: (row.assignee_id ?? null) as string | null,
    roleId: (row.role_id ?? null) as string | null,
    dueDate:
      row.due_date instanceof Date
        ? (row.due_date as Date).toISOString()
        : null,
    priority: row.priority as string,
    status: row.status as string,
    blockerReason: (row.blocker_reason ?? null) as string | null,
    createdBy: (row.created_by ?? null) as string | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export default async function olosTaskRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/olos/tasks
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/:id/olos/tasks',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer', 'reviewer', 'viewer'),
      ],
    },
    async (req) => {
      const q = ListQuery.parse(req.query);
      const rows = await db`
        SELECT t.*, ST_AsGeoJSON(t.location_geometry)::jsonb AS location_geojson
        FROM olos_act_tasks t
        WHERE t.project_id = ${req.projectId}
          AND (${q.objectiveId ?? null}::text       IS NULL OR t.objective_id       = ${q.objectiveId ?? null})
          AND (${q.handoffPackageId ?? null}::uuid  IS NULL OR t.handoff_package_id = ${q.handoffPackageId ?? null}::uuid)
          AND (${q.status ?? null}::text            IS NULL OR t.status             = ${q.status ?? null})
          AND (${q.assigneeId ?? null}::uuid        IS NULL OR t.assignee_id        = ${q.assigneeId ?? null}::uuid)
        ORDER BY t.created_at DESC
      `;
      return {
        data: rows.map(mapRow),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // POST /:id/olos/tasks
  fastify.post<{ Params: { id: string } }>(
    '/:id/olos/tasks',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const body = TaskCreateInput.parse(req.body);

      const [handoff] = await db`
        SELECT id FROM olos_act_handoff_packages
        WHERE id = ${body.handoffPackageId}
          AND project_id = ${req.projectId}
      `;
      if (!handoff) {
        throw new NotFoundError('ActHandoffPackage', body.handoffPackageId);
      }

      const locationExpr = body.locationGeometry
        ? db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(body.locationGeometry)}), 4326)`
        : db`NULL`;

      const [row] = await db`
        INSERT INTO olos_act_tasks (
          project_id, objective_id, handoff_package_id,
          title, description, location_geometry,
          assignee_id, role_id, due_date,
          priority, status, blocker_reason,
          created_by
        ) VALUES (
          ${req.projectId},
          ${body.objectiveId},
          ${body.handoffPackageId},
          ${body.title},
          ${body.description},
          ${locationExpr},
          ${body.assigneeId ?? null},
          ${body.roleId ?? null},
          ${body.dueDate ?? null},
          ${body.priority},
          ${body.status},
          ${body.blockerReason ?? null},
          ${req.userId}
        )
        RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_task_created',
        entityType: 'olos_act_task',
        entityId: row!.id as string,
        metadata: {
          objectiveId: body.objectiveId,
          handoffPackageId: body.handoffPackageId,
          status: body.status,
        },
      });

      reply.code(201);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // GET /:id/olos/tasks/:taskId
  fastify.get<{ Params: { id: string; taskId: string } }>(
    '/:id/olos/tasks/:taskId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer', 'reviewer', 'viewer'),
      ],
    },
    async (req) => {
      const { taskId } = ParamsTaskId.parse(req.params);
      const [row] = await db`
        SELECT t.*, ST_AsGeoJSON(t.location_geometry)::jsonb AS location_geojson
        FROM olos_act_tasks t
        WHERE t.id = ${taskId} AND t.project_id = ${req.projectId}
      `;
      if (!row) throw new NotFoundError('ActTask', taskId);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /:id/olos/tasks/:taskId
  fastify.patch<{ Params: { id: string; taskId: string } }>(
    '/:id/olos/tasks/:taskId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req) => {
      const { taskId } = ParamsTaskId.parse(req.params);
      const body = TaskPatchInput.parse(req.body);

      const [existing] = await db`
        SELECT id FROM olos_act_tasks
        WHERE id = ${taskId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('ActTask', taskId);

      const locationPatch =
        body.locationGeometry === undefined
          ? db`location_geometry`
          : body.locationGeometry === null
            ? db`NULL`
            : db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(body.locationGeometry)}), 4326)`;

      const [updated] = await db`
        UPDATE olos_act_tasks SET
          objective_id     = COALESCE(${body.objectiveId ?? null},    objective_id),
          title            = COALESCE(${body.title ?? null},          title),
          description      = COALESCE(${body.description ?? null},    description),
          location_geometry= ${locationPatch},
          assignee_id      = ${body.assigneeId === undefined ? db`assignee_id` : body.assigneeId ?? null}::uuid,
          role_id          = ${body.roleId === undefined ? db`role_id` : body.roleId ?? null},
          due_date         = ${body.dueDate === undefined ? db`due_date` : body.dueDate ?? null}::timestamptz,
          priority         = COALESCE(${body.priority ?? null},       priority),
          status           = COALESCE(${body.status ?? null},         status),
          blocker_reason   = ${body.blockerReason === undefined ? db`blocker_reason` : body.blockerReason ?? null},
          updated_at       = now()
        WHERE id = ${taskId}
        RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_task_updated',
        entityType: 'olos_act_task',
        entityId: taskId,
        metadata: body.status ? { status: body.status } : undefined,
      });

      return { data: mapRow(updated as Row), meta: undefined, error: null };
    },
  );

  // DELETE /:id/olos/tasks/:taskId
  fastify.delete<{ Params: { id: string; taskId: string } }>(
    '/:id/olos/tasks/:taskId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const { taskId } = ParamsTaskId.parse(req.params);
      const [existing] = await db`
        SELECT id FROM olos_act_tasks
        WHERE id = ${taskId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('ActTask', taskId);

      await db`DELETE FROM olos_act_tasks WHERE id = ${taskId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_task_deleted',
        entityType: 'olos_act_task',
        entityId: taskId,
      });

      reply.code(204);
      return '';
    },
  );
}

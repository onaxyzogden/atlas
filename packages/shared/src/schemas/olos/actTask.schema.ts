// actTask.schema.ts
//
// ActTask — the assignable, executable unit derived from an
// ActHandoffPackage. State transitions are governed by ActTaskStatus
// (status.schema.ts). Each task carries an assignee/role binding, a due
// date, priority, and a blocker reason when paused or blocked.

import { z } from 'zod';
import { ActTaskStatus } from './status.schema.js';
import { GeoJSONGeometrySchema } from './geometry.schema.js';

export const ActTaskPriority = z.enum(['low', 'normal', 'high', 'critical']);
export type ActTaskPriority = z.infer<typeof ActTaskPriority>;

export const ActTaskSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  objectiveId: z.string().min(1),
  handoffPackageId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  locationGeometry: GeoJSONGeometrySchema.optional(),
  assigneeId: z.string().optional(),
  roleId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: ActTaskPriority.default('normal'),
  status: ActTaskStatus,
  blockerReason: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type ActTask = z.infer<typeof ActTaskSchema>;

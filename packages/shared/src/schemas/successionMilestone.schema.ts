/**
 * Succession-milestone schemas — typed-table sync path for
 * `successionStore` (ogden-act-succession), Phase 3 of Full syncService
 * Coverage.
 *
 * The store is server-queryable per-zone / per-year (SuccessionTrackerCard
 * timeline), so it rides a real typed table. Milestone ids are NOT uuids
 * (`sm-<ts>-<rand>`) so the schema accepts an opaque string id and the
 * column is text. `phase` is a small stable enum owned by the store and is
 * mirrored here (3 values, change-rate ~never).
 */

import { z } from 'zod';

export const SuccessionPhase = z.enum(['pioneer', 'mid', 'climax']);
export type SuccessionPhase = z.infer<typeof SuccessionPhase>;

export const CreateSuccessionMilestoneInput = z.object({
  /** Optional client-supplied id (`sm-<ts>-<rand>` — not a uuid). */
  id: z.string().min(1).optional(),
  zoneId: z.string().min(1).optional(),
  year: z.number().int(),
  phase: SuccessionPhase,
  observation: z.string().max(10000),
  /** Optional inline photo data-URL (v1 stores photos inline). */
  photoDataUrl: z.string().optional(),
});
export type CreateSuccessionMilestoneInput = z.infer<typeof CreateSuccessionMilestoneInput>;

export const UpdateSuccessionMilestoneInput = CreateSuccessionMilestoneInput.partial();
export type UpdateSuccessionMilestoneInput = z.infer<typeof UpdateSuccessionMilestoneInput>;

export const SuccessionMilestoneSummary = z.object({
  id: z.string(),
  projectId: z.string().uuid(),
  zoneId: z.string().nullable(),
  year: z.number().int(),
  phase: SuccessionPhase,
  observation: z.string(),
  photoDataUrl: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type SuccessionMilestoneSummary = z.infer<typeof SuccessionMilestoneSummary>;

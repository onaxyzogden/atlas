/**
 * Machinery item schemas — backend persistence for the Plan-stage
 * Machinery & Equipment module. Mirrors the design-feature schema shape.
 */

import { z } from 'zod';

export const MachineryKind = z.enum([
  'tractor',
  'implement',
  'mower',
  'hand-tool',
  'other',
]);
export type MachineryKind = z.infer<typeof MachineryKind>;

export const MachineryFrequency = z.enum([
  'daily',
  'weekly',
  'seasonal',
  'standby',
]);
export type MachineryFrequency = z.infer<typeof MachineryFrequency>;

export const MachineryFuelType = z.enum([
  'diesel',
  'petrol',
  'electric',
  'human-powered',
  'other',
]);
export type MachineryFuelType = z.infer<typeof MachineryFuelType>;

export const CreateMachineryItemInput = z.object({
  /**
   * Optional client-supplied UUID. When set, the server uses this id instead
   * of generating one — lets the local zustand store keep a single id from
   * creation through later updates without a roundtrip swap.
   */
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  kind: MachineryKind,
  purpose: z.string().max(500).default(''),
  frequency: MachineryFrequency,
  fuelType: MachineryFuelType,
  requiredWidthM: z.number().nonnegative().nullable().optional(),
  requiredTurnRadiusM: z.number().nonnegative().nullable().optional(),
  housingElementId: z.string().uuid().nullable().optional(),
  acquisitionYear: z.number().int().nullable().optional(),
  lifecycleYearsEstimate: z.number().int().nonnegative().nullable().optional(),
});
export type CreateMachineryItemInput = z.infer<typeof CreateMachineryItemInput>;

export const UpdateMachineryItemInput = CreateMachineryItemInput.partial();
export type UpdateMachineryItemInput = z.infer<typeof UpdateMachineryItemInput>;

export const MachineryItemSummary = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  kind: MachineryKind,
  purpose: z.string(),
  frequency: MachineryFrequency,
  fuelType: MachineryFuelType,
  requiredWidthM: z.number().nullable(),
  requiredTurnRadiusM: z.number().nullable(),
  housingElementId: z.string().uuid().nullable(),
  acquisitionYear: z.number().int().nullable(),
  lifecycleYearsEstimate: z.number().int().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type MachineryItemSummary = z.infer<typeof MachineryItemSummary>;

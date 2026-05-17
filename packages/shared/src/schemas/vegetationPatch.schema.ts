/**
 * Vegetation-patch schemas — typed-table sync path for `vegetationStore`
 * (ogden-vegetation), Phase 3 of Full syncService Coverage.
 *
 * The store is server-queryable (per-project current land cover, auto-
 * design affinity, dashboard rollups), so it rides a real typed table
 * rather than the opaque versioned-blob transport. Mirrors the
 * machineryItem.schema.ts client-supplied-id idiom so the local zustand
 * store keeps one id from creation through later updates.
 *
 * `successionStage` / `groundCover` are web-store-owned enum vocabularies;
 * the server persists them as opaque text and does NOT enforce the value
 * set (avoids a cross-package coupling + migration every time the web enum
 * grows). `geometry` is `z.unknown()` like designFeature — the typed table
 * stores it verbatim; spatial reasoning is not a Phase-3 concern.
 */

import { z } from 'zod';

export const CreateVegetationPatchInput = z.object({
  /** Optional client-supplied id (vegetation patches use a UUID, but the
   *  column is text — do not require uuid). */
  id: z.string().min(1).optional(),
  geometry: z.unknown(),
  successionStage: z.string().min(1),
  groundCover: z.string().min(1),
  label: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  /** Client-supplied ISO timestamp; server defaults to now() if absent. */
  createdAt: z.string().datetime({ offset: true }).optional(),
});
export type CreateVegetationPatchInput = z.infer<typeof CreateVegetationPatchInput>;

export const UpdateVegetationPatchInput = CreateVegetationPatchInput.partial();
export type UpdateVegetationPatchInput = z.infer<typeof UpdateVegetationPatchInput>;

export const VegetationPatchSummary = z.object({
  id: z.string(),
  projectId: z.string().uuid(),
  geometry: z.unknown(),
  successionStage: z.string(),
  groundCover: z.string(),
  label: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type VegetationPatchSummary = z.infer<typeof VegetationPatchSummary>;

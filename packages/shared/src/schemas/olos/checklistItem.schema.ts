// checklistItem.schema.ts
//
// A ChecklistItem is one ordered step inside an Objective's checklist (dev
// specs §10-25 per stage). Each item has an instruction, an optional linked
// overlay that the item depends on, and a required-input type that drives
// which evidence/proof/decision capture component renders in the workspace.

import { z } from 'zod';
import { OverlayId } from './overlay.schema.js';

export const ChecklistRequiredInputType = z.enum([
  'evidence',
  'decision',
  'proof',
  'verification',
  'reference',
]);
export type ChecklistRequiredInputType = z.infer<
  typeof ChecklistRequiredInputType
>;

export const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  objectiveId: z.string().min(1),
  ordinal: z.number().int().nonnegative(),
  instruction: z.string().min(1),
  linkedOverlayId: OverlayId.optional(),
  requiredInputType: ChecklistRequiredInputType,
  required: z.boolean().default(true),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

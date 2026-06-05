// proofSchema.schema.ts
//
// ProofSchema — the per-task-category minimum-evidence contract. Each
// schema is a list of slots; a slot says "this task needs one photo of the
// before state" or "this task needs a GPS trace of the worked area". The
// seeded catalog lives in constants/fieldAction/proofSchemas.ts and
// covers the categories called out by OLOS Act Command Center Spec v1
// §3.3 (Proof Schema → minimum required proof types per task category).
//
// The UI (Slice 3.4 ProofSlotList) renders a row per slot, fills it from
// the matching ProofItem on the field action, and only enables the
// Submit Task button when every required slot is filled. Stewards can
// attach additional above-minimum proof items via the "Add more evidence"
// drawer; those attach as ProofItems without a slotId and never block
// submission.

import { z } from 'zod';
import { FieldActionProofType } from './proofItem.schema.js';
import { MeasurementBindingSchema } from '../observe/lensMeasurement.schema.js';

/**
 * One required (or optional) evidence slot inside a ProofSchema.
 *
 * `instruction` is the short prompt rendered next to the capture button
 * (kept to ~60 chars so it fits a mobile slot row). `kind` further
 * specialises certain proof types — e.g. a photo slot can carry
 * `kind: 'before' | 'after'` so the catalog can require a four-photo
 * earthworks proof rather than just "four photos of any kind".
 */
export const ProofSchemaSlotSchema = z.object({
  id: z.string().min(1),
  proofType: FieldActionProofType,
  label: z.string().min(1),
  instruction: z.string().optional(),
  required: z.boolean().default(true),
  /** Free-form sub-kind. ASCII only. e.g. 'before', 'after', 'jar-test'. */
  kind: z.string().optional(),
  /** Required unit for measurement slots (e.g. 'm', 'cm', 'pH', 'head'). */
  measurementUnit: z.string().optional(),
  /**
   * Design-time declaration that captures filling this slot feed a specific
   * Observe-lens specialised visualization. Lives on the SLOT (static) rather
   * than the proof item (per-capture) because slotId is not globally unique and
   * the projected ObserveDataPoint carries no proofSchemaId -- the read-side
   * builder resolves slotId -> slot -> binding to route the capture
   * deterministically (see schemas/observe/lensMeasurement.schema.ts).
   */
  measurementBinding: MeasurementBindingSchema.optional(),
});
export type ProofSchemaSlot = z.infer<typeof ProofSchemaSlotSchema>;

export const ProofSchemaSchema = z.object({
  id: z.string().min(1),
  /** Free-form category id matched by FieldAction.proofSchemaId. */
  taskCategory: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  /** Ordered list of evidence slots the UI renders top-down. */
  slots: z.array(ProofSchemaSlotSchema).min(1),
});
export type ProofSchema = z.infer<typeof ProofSchemaSchema>;

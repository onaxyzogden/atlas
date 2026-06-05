/**
 * ProofEvent — the generic field-proof fallback record (Sub-project D4).
 *
 * D4 proves a planned `WorkItem` was executed in the field. When a typed
 * D0 domain event fits (maintenance / livestock-move / nursery), that real
 * event carries the proof via its existing optional `workItemId` back-link.
 * When no typed class fits (`routeProofTarget` → 'generic'), this record is
 * the proof instead. The back-link always lives on the event side, exactly
 * like the 5 D0 domain-event schemas — so the WorkItem spine schema is
 * unchanged (no DB migration, no literal-site churn).
 *
 * Steward/field-authored only — Goal Compass never authors field proof, so
 * there is NO generated-vs-overridden preservation contract.
 *
 * Covenant (D4, binding): strictly operational field-execution proof. No
 * cost, financing, capital, investor, yield-as-return, riba, gharar, salam
 * field or framing — those stay in Scholar-gated Sub-project C.
 */

import { z } from 'zod';

export const ProofEventSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    /** The WorkItem this event proves complete (D0-style back-link). */
    workItemId: z.string().min(1),
    /** Steward / contractor who executed the work. */
    actorWho: z.string().optional(),
    actualStart: z.string().nullable().optional(),
    actualEnd: z.string().nullable().optional(),
    notes: z.string().optional(),
    /** Reference-only evidence — no binary upload (explicit YAGNI). */
    evidence: z
      .object({
        photoRef: z.string(),
        geo: z.tuple([z.number(), z.number()]).optional(),
      })
      .optional(),
    createdAt: z.string(),
  })
  .passthrough();

export type ProofEvent = z.infer<typeof ProofEventSchema>;

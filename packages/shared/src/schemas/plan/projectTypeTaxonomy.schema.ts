import { z } from 'zod';

/**
 * Per-type objective-model taxonomy (OLOS Project-Type + Secondary-Layer
 * Spec v1.2).
 *
 * `ProjectTypeId` is the 14-value catalogue taxonomy — the real types a
 * steward can choose. It is intentionally SEPARATE from the broader
 * `ProjectType` Zod enum in project.schema.ts, which additionally carries the
 * `moontrance` identity sentinel (a historical OGDEN template, kept so legacy
 * projects validate but never offered in the wizard). A sync test asserts
 * every ProjectTypeId is a member of ProjectType.
 *
 * Capability (`canBePrimary` / `canBeSecondary`) is data, carried on the
 * PROJECT_TYPES table in constants/plan/projectTypes.ts — not a separate enum.
 */
export const PROJECT_TYPE_IDS = [
  'homestead',
  'regenerative_farm',
  'market_garden',
  'orchard_food_forest',
  'silvopasture',
  'ecovillage',
  'agritourism',
  'education',
  'conservation',
  'off_grid',
  'wellness',
  'nursery',
  'residential',
  'livestock_operation',
] as const;

export const ProjectTypeId = z.enum(PROJECT_TYPE_IDS);
export type ProjectTypeId = z.infer<typeof ProjectTypeId>;

/**
 * How a secondary layer relates to a primary type's objective set. A single
 * (secondary, primary) pair can be BOTH at once (e.g. Residential + Homestead
 * is 6 additive objectives AND 4 modifying patches), so the resolver tracks
 * these as independent flags; this enum labels an individual objective/patch.
 */
export const SecondaryClass = z.enum(['additive', 'modifying']);
export type SecondaryClass = z.infer<typeof SecondaryClass>;

/**
 * Steward acknowledgement of an advisory design tension. Tensions are never
 * blocking — the wizard surfaces them, the steward checks "I understand,
 * continue," and the choice is recorded here with a timestamp so the wizard
 * and the mid-project reopen modal can show "acknowledged on ...".
 */
export const TensionAck = z.object({
  tensionId: z.string().min(1),
  acknowledgedAt: z.string().datetime(),
});
export type TensionAck = z.infer<typeof TensionAck>;

/**
 * What kind of edit produced a ProjectTypeVersion entry. Optional and absent on
 * pre-existing history (which validates unchanged); set going forward by the
 * wizard and the mid-project secondary-add flow (Plan Navigation Spec v1.1 9).
 * `primary-changed` is stamped by the mid-project primary-type-change flow,
 * which re-derives the whole objective catalogue.
 */
export const ProjectTypeVersionAction = z.enum([
  'wizard-complete',
  'secondary-added',
  'secondary-removed',
  'primary-changed',
]);
export type ProjectTypeVersionAction = z.infer<typeof ProjectTypeVersionAction>;

/**
 * One entry in a project's type-selection history. Stamped on wizard
 * completion and on every later add/remove of a secondary, so provenance for
 * the resolved objective set survives across edits.
 */
export const ProjectTypeVersion = z.object({
  primaryTypeId: ProjectTypeId,
  // <= the 8 secondary-capable types; the wizard enforces a smaller practical
  // limit. Bounded here only as a sanity ceiling.
  secondaryTypeIds: z.array(ProjectTypeId).max(8).default([]),
  changedAt: z.string().datetime(),
  // Free-form note, e.g. "wizard completion" / "added secondary: residential".
  note: z.string().max(500).optional(),
  // Who made the change (e.g. an email). Optional/additive; absent on history
  // written before the v1.1 secondary-add flow.
  actor: z.string().max(200).optional(),
  // Which edit produced this entry. Optional/additive for the same reason.
  action: ProjectTypeVersionAction.optional(),
});
export type ProjectTypeVersion = z.infer<typeof ProjectTypeVersion>;

/**
 * Steward acknowledgement that a mid-project secondary addition reopened one or
 * more previously-complete objectives for review (Plan Navigation Spec v1.1
 * 9). Append-only: one entry per acknowledged reopen event, recording which
 * secondary triggered it and which objectives were affected. Never blocking -
 * the steward clicks "I understand, continue" and the choice is recorded here.
 */
export const ReopeningAck = z.object({
  secondaryTypeId: ProjectTypeId,
  affectedObjectiveIds: z.array(z.string()).default([]),
  acknowledgedAt: z.string().datetime(),
});
export type ReopeningAck = z.infer<typeof ReopeningAck>;

/**
 * The per-project type selection that drives objective resolution. Stored on
 * `ProjectMetadata.projectTypeRecord` (durable draft, written incrementally by
 * Wizard Step 2) and read by the resolution engine at completion to seed the
 * per-project objective set. The wizard only offers compatible can-be-secondary
 * types and never the primary itself.
 */
export const ProjectTypeRecord = z.object({
  primaryTypeId: ProjectTypeId,
  secondaryTypeIds: z.array(ProjectTypeId).max(8).default([]),
  tensionAcknowledgements: z.array(TensionAck).max(50).default([]),
  versionHistory: z.array(ProjectTypeVersion).max(100).default([]),
  // Append-only reopen acknowledgements (Plan Navigation Spec v1.1 9).
  // Additive + Zod-defaulted -> records written before the v1.1 flow validate
  // unchanged.
  reopeningAcknowledgements: z.array(ReopeningAck).max(200).default([]),
});
export type ProjectTypeRecord = z.infer<typeof ProjectTypeRecord>;

// dataPoint.schema.ts
//
// ObserveDataPoint — one observation captured against a universal domain.
// Phase 4 substrate for the Observe Dashboard (Unified Land State, Domain
// Detail, Temporal Layer) and the Plan Revision Banner.
//
// Augments — does NOT replace — the Phase 3 ObserveFeedEntry pathway.
// A data point can be derived from a verified field action (via
// sourceActionId), from a divergence-evidence capture (also via
// sourceActionId), from an existing ObserveFeedEntry projection (via
// sourceFeedEntryId), or from a manual observation captured directly
// against the dashboard surface. A point may additionally carry
// sourceObjectiveId — the Plan objective it was recorded against (set
// by the Act execution panel) — for Plan->Act->Observe provenance.
//
// `cycleId` is a monotonically advancing integer per (project, domain)
// stamped by `cycleAdvance.ts` (Phase 4 Slice 4.5) whenever a Plan
// revision is confirmed or revised. New captures stamp with the current
// cycleId; older captures keep their original cycleId so the Temporal
// Layer can render cycle annotations.
//
// `isSuperseded` / `supersededBy` implement the spec's automatic
// supersession model: a new same-domain capture within 10m of an
// existing active capture flips the older row to superseded. The
// "Not a replacement" CTA round-trips both back to active.
//
// `.passthrough()` keeps the door open for domain-specific measurement
// shapes the spec hasn't finalised — the dashboard reads only the
// fields it knows about.

import { z } from 'zod';
import { UniversalDomain } from '../universalDomain.schema.js';
import { FieldActionProofItemSchema } from '../fieldAction/proofItem.schema.js';

export const ObserveDataPointSourceType = z.enum([
  'task_verification',
  'divergence_evidence',
  'manual_observation',
]);
export type ObserveDataPointSourceType = z.infer<
  typeof ObserveDataPointSourceType
>;

/**
 * Five OLOS Observe status outputs per spec §2.3.
 *
 * - `clear`                   — domain is fit for purpose, no flags.
 * - `unknown`                 — domain not yet observed; field is missing data.
 * - `needs_investigation`     — early signal of a problem; warrants follow-up.
 * - `major_constraint`        — confirmed obstacle to the current plan; Plan
 *                               revision should consider it.
 * - `potential_disqualifier`  — observation that, if confirmed, would force
 *                               the steward to abandon or radically rework
 *                               an objective.
 */
export const ObserveStatusOutput = z.enum([
  'clear',
  'unknown',
  'needs_investigation',
  'major_constraint',
  'potential_disqualifier',
]);
export type ObserveStatusOutput = z.infer<typeof ObserveStatusOutput>;

/**
 * Minimal GeoJSON Point shape — `[lng, lat]` (RFC 7946) on the
 * `coordinates` field. Coordinates are typed `unknown` to keep the
 * schema loose for offline-first capture flows where the array shape
 * may be normalised after the fact; the relationship helpers
 * (`supersession.ts`) gate on shape at read time.
 */
export const ObserveDataPointGeometrySchema = z
  .object({
    type: z.literal('Point'),
    coordinates: z.unknown(),
  })
  .passthrough();
export type ObserveDataPointGeometry = z.infer<
  typeof ObserveDataPointGeometrySchema
>;

/**
 * The four placed Plan feature kinds an as-built deviation can reference.
 * These are the geometry-store entity families a steward can record a
 * divergence against from the Act stage (see `sourceFeatureRef` below and
 * `featureRefDomain.ts` for the kind -> Observe domain mapping).
 */
export const AsBuiltFeatureKind = z.enum([
  'paddock',
  'cropArea',
  'structure',
  'zone',
]);
export type AsBuiltFeatureKind = z.infer<typeof AsBuiltFeatureKind>;

/**
 * Stable reference to the specific Plan feature an as-built deviation
 * concerns. `id` is the geometry-store entity id (paddock/crop/structure/
 * zone). Lets the Plan reconciliation card target the exact feature rather
 * than re-discovering it from geometry proximity.
 */
export const ObserveSourceFeatureRefSchema = z.object({
  kind: AsBuiltFeatureKind,
  id: z.string().min(1),
});
export type ObserveSourceFeatureRef = z.infer<
  typeof ObserveSourceFeatureRefSchema
>;

export const ObserveDataPointSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    domainId: UniversalDomain,
    sourceType: ObserveDataPointSourceType,
    /** Field action id this observation derived from (null = manual). */
    sourceActionId: z.string().nullable().default(null),
    /** Phase 3 ObserveFeedEntry id this observation projected from (null = direct). */
    sourceFeedEntryId: z.string().nullable().default(null),
    /** Plan objective this observation was recorded against (null = not objective-scoped). */
    sourceObjectiveId: z.string().nullable().default(null),
    /** Specific Plan feature this observation references (null = not feature-scoped).
     *  Set by the Act as-built deviation flow so the Plan reconciliation card can
     *  target the exact paddock/crop/structure/zone. */
    sourceFeatureRef: ObserveSourceFeatureRefSchema.nullable().default(null),
    locationGeometry: ObserveDataPointGeometrySchema.nullable().default(null),
    /** Monotonic per (project, domain); advanced by Plan revision confirmation. */
    cycleId: z.number().int().nonnegative().default(0),
    isSuperseded: z.boolean().default(false),
    /** Id of the data point that superseded this one (null when active). */
    supersededBy: z.string().nullable().default(null),
    statusOutput: ObserveStatusOutput,
    /** Domain-specific measurement payload (numbers, ordinal codes, etc.). */
    measurementValue: z.unknown().nullable().default(null),
    proofItems: z.array(FieldActionProofItemSchema).default([]),
    capturedAt: z.string().datetime(),
    capturedBy: z.string().min(1),
  })
  .passthrough();
export type ObserveDataPoint = z.infer<typeof ObserveDataPointSchema>;

/**
 * Typed companion for an as-built deviation's `measurementValue`.
 *
 * `measurementValue` on ObserveDataPoint is `z.unknown()` (intentionally
 * loose), so the as-built flow stamps it with one of these diff shapes and
 * the Plan reconciliation card reads it back through `asAsBuiltDiff`. Two
 * kinds:
 *
 * - `attribute` — a single editable attribute differs (name, species,
 *   status, notes). The card can offer "Apply to design" because applying
 *   is a normal partial-patch on the geometry store.
 * - `geometry`  — reality's shape differs from the drawn polygon. Recorded
 *   as evidence (area delta + free text + optional captured coordinates);
 *   the card renders it read-only in v1 (no in-Act re-draw of Plan geometry).
 */
export const AsBuiltAttributeDiffSchema = z.object({
  kind: z.literal('attribute'),
  /** The feature attribute that diverged (e.g. "name", "species", "status"). */
  field: z.string().min(1),
  /** Optional human label for the field, for display. */
  label: z.string().optional(),
  asPlanned: z.unknown(),
  asBuilt: z.unknown(),
  /**
   * Raw stored values (pre-label-resolution) for "Apply to design". For a
   * select field, `asPlanned`/`asBuilt` hold the human option labels (e.g.
   * "Food forest") for display, while these hold the underlying entity codes
   * (e.g. "food_forest"). Apply writes the raw code so it never corrupts an
   * enum-valued prop; absent for text/number fields (where label === value)
   * and on legacy points, where Apply falls back to `asBuilt`.
   */
  asPlannedRaw: z.unknown().optional(),
  asBuiltRaw: z.unknown().optional(),
});
export type AsBuiltAttributeDiff = z.infer<typeof AsBuiltAttributeDiffSchema>;

export const AsBuiltGeometryDiffSchema = z.object({
  kind: z.literal('geometry'),
  field: z.literal('geometry'),
  asPlanned: z
    .object({
      areaM2: z.number().optional(),
      note: z.string().optional(),
    })
    .passthrough(),
  asBuilt: z
    .object({
      areaM2: z.number().optional(),
      note: z.string().optional(),
      capturedGeometry: z.unknown().optional(),
    })
    .passthrough(),
});
export type AsBuiltGeometryDiff = z.infer<typeof AsBuiltGeometryDiffSchema>;

export const AsBuiltDiffSchema = z.discriminatedUnion('kind', [
  AsBuiltAttributeDiffSchema,
  AsBuiltGeometryDiffSchema,
]);
export type AsBuiltDiff = z.infer<typeof AsBuiltDiffSchema>;

/**
 * Safe read of a data point's `measurementValue` as an `AsBuiltDiff`.
 * Returns `null` for any other measurement shape (e.g. the manual-note
 * `{ label, note }` payload), so callers can branch without throwing.
 */
export function asAsBuiltDiff(value: unknown): AsBuiltDiff | null {
  const parsed = AsBuiltDiffSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

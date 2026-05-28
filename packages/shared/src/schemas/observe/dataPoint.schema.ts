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
// against the dashboard surface.
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

// lensMeasurement.schema.ts
//
// The capture/wire contract that lets a field-captured proof item feed one of
// the six Observe-lens specialised visualizations (wind rose, pH bars,
// infiltration, slope breakdown, capacity, consent, etc.).
//
// Two halves live here:
//
//  1. MeasurementVizField -- a closed union naming every lens viz array a
//     capture can target, keyed 1:1 to the render shapes in
//     apps/web/src/v3/observe/lens/types.ts. A proof SLOT declares which field
//     it feeds via `measurementBinding` (see proofSchema.schema.ts); the
//     read-side builder (apps/web/.../lensData/specialisedBuilders.ts) resolves
//     slotId -> slot -> binding to route the capture deterministically.
//
//  2. One Zod payload schema per vizField -- the structured row a single
//     capture carries in `proofItem.loggedResult` (precedent:
//     compostReading.schema.ts). These are the CAPTURE shapes; presentation-
//     only fields the renderers need (colour, the 0..1 layout `x`, the derived
//     status band, the wind-rose frequency histogram) are computed read-side,
//     NOT captured -- so they are intentionally absent here.
//
// `parseLensMeasurement(vizField, loggedResult)` is the safe-read companion
// (mirrors `asAsBuiltDiff` in dataPoint.schema.ts): it returns the typed row
// for that field or null for any other shape, so the builder branches without
// throwing.

import { z } from 'zod';
import type { ObserveLensId } from '../../constants/observe/lenses.js';

// ── Lens id as a zod enum ───────────────────────────────────────────────────
// `ObserveLensId` is a plain TS union in constants/observe/lenses.ts; we need a
// runtime enum to validate a binding. The compile-time check below fails the
// build if the two ever drift.
export const ObserveLensIdSchema = z.enum([
  'foundation',
  'climate',
  'water',
  'living',
  'human',
  'infrastructure',
]);
type _LensIdMatchesForward = ObserveLensId extends z.infer<
  typeof ObserveLensIdSchema
>
  ? true
  : never;
type _LensIdMatchesBack = z.infer<typeof ObserveLensIdSchema> extends ObserveLensId
  ? true
  : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _LensIdInSync = _LensIdMatchesForward & _LensIdMatchesBack;

// ── The closed catalog of targetable viz arrays ─────────────────────────────
export const MeasurementVizField = z.enum([
  'water.infiltrationData',
  'water.sources',
  'soil.phData',
  'topography.elevationZones',
  'topography.slopeBreakdown',
  'climate.windRose',
  'climate.microclimates',
  'human.capacityBars',
  'human.consentItems',
  'infrastructure.suggestedTasks',
]);
export type MeasurementVizField = z.infer<typeof MeasurementVizField>;

// ── Shared sub-enums ────────────────────────────────────────────────────────
// Named SourceConfidence (not ConfidenceLevel) to avoid colliding with the
// assessment-grade ConfidenceLevel already exported from confidence.schema.ts.
export const SourceConfidence = z.enum(['high', 'medium', 'low']);
export type SourceConfidence = z.infer<typeof SourceConfidence>;

export const CompactionLevel = z.enum(['low', 'moderate', 'high']);
export type CompactionLevel = z.infer<typeof CompactionLevel>;

export const RiskLevel = z.enum(['low', 'medium', 'high']);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const ConsentStatus = z.enum([
  'pending',
  'outstanding',
  'flagged',
  'confirmed',
]);
export type ConsentStatus = z.infer<typeof ConsentStatus>;

export const PriorityLevel = z.enum(['high', 'medium', 'low']);
export type PriorityLevel = z.infer<typeof PriorityLevel>;

/** 8-point compass direction for a wind observation. */
export const WindDirection = z.enum([
  'N',
  'NE',
  'E',
  'SE',
  'S',
  'SW',
  'W',
  'NW',
]);
export type WindDirection = z.infer<typeof WindDirection>;

// ── Per-vizField capture payloads ───────────────────────────────────────────

/** water.infiltrationData -- one infiltration test. `rate` in mm/hr. The
 *  display `status` band and the 0..1 layout `x` are derived read-side. */
export const InfiltrationReadingSchema = z.object({
  zone: z.string().min(1),
  rate: z.number().nonnegative(),
});
export type InfiltrationReading = z.infer<typeof InfiltrationReadingSchema>;

/** water.sources -- one inventoried water source. */
export const WaterSourceReadingSchema = z.object({
  label: z.string().min(1),
  sourceType: z.string().min(1),
  status: z.string().min(1),
  confidence: SourceConfidence.default('medium'),
  divergence: z.boolean().optional(),
});
export type WaterSourceReading = z.infer<typeof WaterSourceReadingSchema>;

/** soil.phData -- one soil test at a zone. `om` (organic matter %) and
 *  `compaction` are optional: a steward may capture pH alone, in which case the
 *  renderer omits those columns (partial degrade). */
export const SoilPhReadingSchema = z.object({
  zone: z.string().min(1),
  ph: z.number().min(0).max(14),
  om: z.number().nonnegative().optional(),
  compaction: CompactionLevel.optional(),
});
export type SoilPhReading = z.infer<typeof SoilPhReadingSchema>;

/** topography.elevationZones -- one surveyed elevation band. `areaM2` also
 *  feeds the slope breakdown's area share when a slope band is recorded. */
export const ElevationZoneReadingSchema = z.object({
  label: z.string().min(1),
  areaM2: z.number().nonnegative(),
  aspect: z.string().min(1),
  use: z.string().min(1),
});
export type ElevationZoneReading = z.infer<typeof ElevationZoneReadingSchema>;

/** topography.slopeBreakdown -- one slope band with its surveyed area. The
 *  read-side builder turns area into a percent-of-total share. */
export const SlopeReadingSchema = z.object({
  band: z.string().min(1),
  areaM2: z.number().nonnegative(),
});
export type SlopeReading = z.infer<typeof SlopeReadingSchema>;

/** climate.windRose -- ONE wind observation. The rose (per-direction frequency
 *  + mean speed) is aggregated read-side over many observations. `speedMs` in
 *  metres/second; the builder converts to km/h for display. */
export const WindObservationSchema = z.object({
  dir: WindDirection,
  speedMs: z.number().nonnegative(),
});
export type WindObservation = z.infer<typeof WindObservationSchema>;

/** climate.microclimates -- one identified microclimate. */
export const MicroclimateReadingSchema = z.object({
  label: z.string().min(1),
  sizeHa: z.number().nonnegative().optional(),
  character: z.string().min(1),
  risk: RiskLevel.default('low'),
});
export type MicroclimateReading = z.infer<typeof MicroclimateReadingSchema>;

/** human.capacityBars -- one readiness/capacity reading, 0..100 percent. */
export const CapacityReadingSchema = z.object({
  label: z.string().min(1),
  pct: z.number().min(0).max(100),
});
export type CapacityReading = z.infer<typeof CapacityReadingSchema>;

/** human.consentItems -- one consent / compliance item. */
export const ConsentReadingSchema = z.object({
  label: z.string().min(1),
  status: ConsentStatus,
  weeks: z.string().optional(),
});
export type ConsentReading = z.infer<typeof ConsentReadingSchema>;

/** infrastructure.suggestedTasks -- one suggested follow-up task. */
export const SuggestedTaskReadingSchema = z.object({
  label: z.string().min(1),
  domain: z.string().min(1),
  priority: PriorityLevel.default('medium'),
});
export type SuggestedTaskReading = z.infer<typeof SuggestedTaskReadingSchema>;

// ── vizField -> payload schema map ──────────────────────────────────────────
// Typed `Record<MeasurementVizField, ...>` so the compiler enforces that every
// vizField has exactly one payload schema (the invariant test asserts the same
// at runtime).
export const VIZ_FIELD_PAYLOAD: Record<MeasurementVizField, z.ZodTypeAny> = {
  'water.infiltrationData': InfiltrationReadingSchema,
  'water.sources': WaterSourceReadingSchema,
  'soil.phData': SoilPhReadingSchema,
  'topography.elevationZones': ElevationZoneReadingSchema,
  'topography.slopeBreakdown': SlopeReadingSchema,
  'climate.windRose': WindObservationSchema,
  'climate.microclimates': MicroclimateReadingSchema,
  'human.capacityBars': CapacityReadingSchema,
  'human.consentItems': ConsentReadingSchema,
  'infrastructure.suggestedTasks': SuggestedTaskReadingSchema,
};

/**
 * The measurement binding a proof SLOT carries to declare which lens viz field
 * its captures feed. Lives on the slot (design-time, static) not the proof item
 * (runtime, per-capture); the proof item points back via `slotId`.
 *
 * - `lens` MUST agree with `getLensForDomain(domain)` of the slot's task -- a
 *   binding can never route a soil capture into the water chart (asserted by
 *   the invariant test).
 * - `vizField` is the deterministic, compiler-checked target.
 * - `zoneKey` groups several captures into one row (e.g. a pH zone).
 * - `dimension` names which sub-field a scalar `measurementValue` fills, for
 *   the scalar-mode slots that do not carry a full `loggedResult` row.
 * - `order` gives a stable sort within a viz (slope bands, capacity bars).
 */
export const MeasurementBindingSchema = z.object({
  lens: ObserveLensIdSchema,
  vizField: MeasurementVizField,
  zoneKey: z.string().optional(),
  dimension: z.string().optional(),
  order: z.number().optional(),
});
export type MeasurementBinding = z.infer<typeof MeasurementBindingSchema>;

/**
 * Safe read of a proof item's `loggedResult` as the typed row for `vizField`.
 * Returns null for any shape that does not match that field's payload schema,
 * so the read-side builder can branch without throwing.
 */
export function parseLensMeasurement(
  vizField: MeasurementVizField,
  loggedResult: unknown,
): Record<string, unknown> | null {
  const schema = VIZ_FIELD_PAYLOAD[vizField];
  const parsed = schema.safeParse(loggedResult);
  return parsed.success ? (parsed.data as Record<string, unknown>) : null;
}

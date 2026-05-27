// proofItem.schema.ts
//
// ProofItem — one piece of field-captured evidence attached to a FieldAction.
// Mirrors OLOS Act Command Center Spec v1 §3.2 (Field Action Object Model →
// proofItems[]). A field action's `proofSchemaId` resolves to a proof slot
// list (see proofSchema.schema.ts); each filled slot persists as one
// ProofItem on the field action.
//
// Per the locked decision recorded in the Phase 3 plan, fieldAction is a
// new, independent entity rather than an extension of WorkItem or
// OLOS ProofRecord. The proofType enum here is snake_case to match the
// spec verbatim and is intentionally narrower than ProofRecord.ProofType:
//   - drops legacy 'receipt' / 'inspection' / 'signature' / 'before-after'
//     / 'video' (not in the Act spec's proof catalog)
//   - adds 'gps_point' / 'gps_trace' / 'logged_result' (capture types
//     the spec calls out by name in §3.3 + §5.4.5)
//
// Geotag uses the existing OLOS ProofGeotag shape so a future migration
// path stays open if we ever want to fold proofRecord + proofItem.

import { z } from 'zod';

export const FieldActionProofType = z.enum([
  'photo',
  'gps_point',
  'gps_trace',
  'measurement',
  'logged_result',
  'note',
  'document',
]);
export type FieldActionProofType = z.infer<typeof FieldActionProofType>;

/**
 * Device-captured geotag attached to the proof item. Mirrors
 * OLOS ProofGeotagSchema so geotag-bearing client code can interop later.
 */
export const FieldActionProofGeotagSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative().optional(),
});
export type FieldActionProofGeotag = z.infer<
  typeof FieldActionProofGeotagSchema
>;

/**
 * Minimal GeoJSON Point shape — `[lng, lat]` (RFC 7946). Used for
 * gps_point proof items where the steward placed an exact pin on the map.
 */
export const FieldActionProofPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
});
export type FieldActionProofPoint = z.infer<typeof FieldActionProofPointSchema>;

/**
 * Minimal GeoJSON LineString shape — used for gps_trace proofs captured by
 * `geolocation.watchPosition`. Each coordinate is `[lng, lat]`.
 */
export const FieldActionProofLineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});
export type FieldActionProofLineString = z.infer<
  typeof FieldActionProofLineStringSchema
>;

/**
 * One captured proof item. `proofType` discriminates which of the
 * type-specific optional fields are meaningful. The proof catalog
 * (`proofSchemas.ts`) is the authority on which fields a given task
 * category requires; this schema validates payload SHAPE, not required-
 * field semantics — that gate lives in the UI submit path.
 *
 * Why optional-fields-on-one-object instead of a Zod discriminated union:
 *   - Stewards may attach extra "above-minimum" evidence with a different
 *     proofType (spec §3.4 "Add more evidence" affordance) and we want a
 *     uniform shape for those rows.
 *   - The persisted store is JSONB-safe and a flat object round-trips
 *     through the versioned-blob path without a custom replacer.
 *   - `.passthrough()` leaves room for future capture types (drone_overlay,
 *     pollinator_count, etc.) without a schema migration.
 */
export const FieldActionProofItemSchema = z
  .object({
    id: z.string().min(1),
    /** The slot id this proof item filled (from the proof catalog). */
    slotId: z.string().optional(),
    proofType: FieldActionProofType,
    capturedAt: z.string().datetime(),
    capturedBy: z.string().optional(),
    captureGeotag: FieldActionProofGeotagSchema.nullable().optional(),

    // --- photo / document ---
    fileUri: z.string().optional(),
    fileMime: z.string().optional(),
    fileSizeBytes: z.number().nonnegative().optional(),
    /** Tracks IDB blob vs CDN upload status (see proofPhotoStore + sync queue). */
    fileSyncStatus: z.enum(['idb-local', 'uploading', 'uploaded']).optional(),

    // --- note ---
    noteText: z.string().optional(),

    // --- measurement ---
    measurementValue: z.number().optional(),
    measurementUnit: z.string().optional(),

    // --- logged_result (schema-driven form) ---
    loggedResult: z.record(z.string(), z.unknown()).optional(),

    // --- gps_point / gps_trace ---
    pointGeometry: FieldActionProofPointSchema.optional(),
    traceGeometry: FieldActionProofLineStringSchema.optional(),
    /** Walk duration in seconds for gps_trace captures. */
    traceDurationSeconds: z.number().nonnegative().optional(),
  })
  .passthrough();
export type FieldActionProofItem = z.infer<typeof FieldActionProofItemSchema>;

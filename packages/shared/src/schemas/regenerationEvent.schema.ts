import { z } from 'zod';

// ─── Enums (mirror CHECK constraints in migration 015) ─────────────────────
//
// These four enum sets are duplicated in
// `apps/api/src/db/migrations/015_regeneration_events.sql` as CHECK
// constraints. Both boundaries must stay character-for-character in
// sync — if one changes, update the other in the same PR.

export const RegenerationEventType = z.enum([
  'observation',
  'intervention',
  'milestone',
  'photo',
]);
export type RegenerationEventType = z.infer<typeof RegenerationEventType>;

/** Mirrors `InterventionType` in apps/api/src/services/terrain/algorithms/soilRegeneration.ts
 *  (+ `other` for free-form events that don't map to a generated
 *  intervention class). */
export const RegenerationInterventionType = z.enum([
  'mulching_priority',
  'compost_application',
  'cover_crop_candidate',
  'silvopasture_candidate',
  'food_forest_candidate',
  'other',
]);
export type RegenerationInterventionType = z.infer<typeof RegenerationInterventionType>;

/** Mirrors `SequencePhase` in apps/api/src/services/terrain/algorithms/soilRegeneration.ts. */
export const RegenerationPhase = z.enum([
  'stabilize_erosion',
  'improve_drainage',
  'build_organic_matter',
  'introduce_perennials',
]);
export type RegenerationPhase = z.infer<typeof RegenerationPhase>;

export const RegenerationProgress = z.enum([
  'planned',
  'in_progress',
  'completed',
  'observed',
]);
export type RegenerationProgress = z.infer<typeof RegenerationProgress>;

// ─── Geometry ──────────────────────────────────────────────────────────────
//
// `location` is Point OR Polygon OR null (site-wide). We validate just
// enough to route through the API; PostGIS does the real work. The
// generic GeoJSON-ish shape keeps us honest without importing a full
// geojson schema library.

const GeoJsonPoint = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
});

const GeoJsonPolygon = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

const RegenerationEventLocation = z.union([GeoJsonPoint, GeoJsonPolygon]);

// ─── Observations ──────────────────────────────────────────────────────────
//
// Free-form structured payload — pH, OM, cover%, compaction index, etc.
// Intentionally permissive because field kits vary. Downstream consumers
// should narrow with their own Zod refinement.

const RegenerationObservations = z.record(z.string(), z.unknown());

// ─── Create / Update payloads ──────────────────────────────────────────────

export const RegenerationEventInput = z.object({
  eventType: RegenerationEventType,
  interventionType: RegenerationInterventionType.nullable().optional(),
  phase: RegenerationPhase.nullable().optional(),
  progress: RegenerationProgress.nullable().optional(),

  title: z.string().min(1).max(200),
  notes: z.string().max(10000).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'),

  location: RegenerationEventLocation.nullable().optional(),
  areaHa: z.number().nonnegative().nullable().optional(),

  observations: RegenerationObservations.optional(),
  mediaUrls: z
    .array(
      z
        .string()
        .min(1)
        .refine(
          (s) => /^https?:\/\//i.test(s) || s.startsWith('/'),
          { message: 'must be an absolute URL or server-relative path' },
        ),
    )
    .max(50)
    .optional(),

  parentEventId: z.string().uuid().nullable().optional(),
});
export type RegenerationEventInput = z.infer<typeof RegenerationEventInput>;

export const RegenerationEventUpdateInput = RegenerationEventInput.partial();
export type RegenerationEventUpdateInput = z.infer<typeof RegenerationEventUpdateInput>;

// ─── Stored record ─────────────────────────────────────────────────────────

export const RegenerationEvent = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  authorId: z.string().uuid(),

  eventType: RegenerationEventType,
  interventionType: RegenerationInterventionType.nullable(),
  phase: RegenerationPhase.nullable(),
  progress: RegenerationProgress.nullable(),

  title: z.string(),
  notes: z.string().nullable(),
  eventDate: z.string(),

  location: RegenerationEventLocation.nullable(),
  areaHa: z.number().nullable(),

  observations: RegenerationObservations,
  mediaUrls: z.array(z.string()),

  parentEventId: z.string().uuid().nullable(),

  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RegenerationEvent = z.infer<typeof RegenerationEvent>;

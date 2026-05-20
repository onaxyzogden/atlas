/**
 * builtEnvironment — unified Built Environment entity schema.
 *
 * Replaces three legacy systems:
 *   - apps/web/src/store/builtEnvironmentStore.ts  (Observe — 8 existing-infra kinds)
 *   - apps/web/src/store/structureStore.ts          (Plan — 20 proposed structure types)
 *   - apps/web/src/store/designElementsStore.ts     (Plan — structure-class design elements)
 *
 * The defining axis is `state: 'existing' | 'proposed'` — the same kind
 * (e.g. `barn`) can be a found-in-the-field structure (Observe) OR a
 * proposed design move (Plan). The schema discriminates by `kind` and
 * carries optional metadata blocks; per-state validation is enforced by
 * helper functions, not by the type system, so additive evolution stays
 * cheap.
 *
 * See:
 *   - wiki/decisions/2026-05-10-atlas-built-environment-unification.md
 *   - packages/shared/src/builtEnvironmentKinds.ts (kind registry)
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────
// State axis
// ─────────────────────────────────────────────────────────────────────────

/** `existing` = found on site (Observe). `proposed` = design move (Plan). */
export const BuiltEnvironmentState = z.enum(['existing', 'proposed']);
export type BuiltEnvironmentState = z.infer<typeof BuiltEnvironmentState>;

// ─────────────────────────────────────────────────────────────────────────
// Geometry
// ─────────────────────────────────────────────────────────────────────────

/**
 * Loose GeoJSON geometry — concrete shape is constrained per-kind by the
 * kind registry (see `geometryType` in builtEnvironmentKinds.ts). We do
 * not narrow at the schema level because Zod's discriminatedUnion does not
 * play nicely with a second discriminator (`geometryType` lives on the
 * kind registry, not on the entity).
 */
/**
 * Coordinates are typed as `number[]` (length 2 expected: [lng, lat]) rather
 * than `[number, number]` to keep interop with GeoJSON's loose `Position`
 * typing in the rest of the codebase. Length is enforced at runtime by Zod's
 * `.length(2)`.
 */
export const BuiltEnvironmentGeometry = z.union([
  z.object({
    type: z.literal('Point'),
    coordinates: z.array(z.number()).length(2),
  }),
  z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.array(z.number()).length(2)).min(2),
  }),
  z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()).length(2)).min(4)).min(1),
  }),
]);
export type BuiltEnvironmentGeometry = z.infer<typeof BuiltEnvironmentGeometry>;

// ─────────────────────────────────────────────────────────────────────────
// Per-state metadata blocks
// ─────────────────────────────────────────────────────────────────────────

/**
 * `existing`-state metadata — descriptive of as-found infrastructure.
 * Mirrors the per-kind fields the legacy Observe `builtEnvironmentStore`
 * carried (subtype on Building, kind on Well/Septic/BuriedUtility/Fence,
 * placement on PowerLine, surface on ExistingDriveway, plus measured
 * areaM2/lengthM/depthM/flowLpm).
 */
export const ExistingMetadata = z.object({
  /** Free-form sub-classification — building subtype, well kind, septic kind,
   *  buried-utility kind, fence kind, driveway surface, etc. Kind-specific
   *  enums live on the per-kind helpers. */
  subtype: z.string().max(64).optional(),
  /** Drilled depth, metres. Wells. */
  depthM: z.number().nonnegative().optional(),
  /** Sustained flow, litres per minute. Wells. */
  flowLpm: z.number().nonnegative().optional(),
  /** Auto-computed via turf for line geometries. */
  lengthM: z.number().nonnegative().optional(),
  /** Auto-computed via turf for polygon geometries. */
  areaM2: z.number().nonnegative().optional(),
  /** Driveway surface — 'gravel' | 'paved' | 'dirt' | 'other'. */
  surface: z.string().max(32).optional(),
  /** PowerLine placement — 'overhead' | 'buried'. */
  placement: z.enum(['overhead', 'buried']).optional(),
  /** Tile feature id of the basemap building this entity was adopted from
   *  (OpenMapTiles `building` source-layer). Set by the "Adopt from map"
   *  tool so the basemap renderer can hide that feature via feature-state,
   *  eliminating z-fight between the basemap extrusion and the project's
   *  own extrusion. Buildings only. */
  adoptedFromBasemapId: z.union([z.string(), z.number()]).optional(),
});
export type ExistingMetadata = z.infer<typeof ExistingMetadata>;

/**
 * `proposed`-state metadata — Plan-stage proposal-economic fields.
 * Mirrors the rich fields the legacy Plan `structureStore` carried.
 */
export const ProposedMetadata = z.object({
  /** Rotation around vertical axis, degrees. Polygon kinds with a "front". */
  rotationDeg: z.number().optional(),
  /** Per-instance scale multiplier applied on top of the kind's default
   *  footprint/height. 1.0 = unchanged. Per ADR 2026-05-11 Phase 5. */
  scaleMul: z.number().positive().optional(),
  /** When `kind === 'custom-glb'`, identifies which uploaded GLB to render
   *  by looking up the id in `customModelStore`. Per ADR 2026-05-11 Phase 6. */
  customModelId: z.string().optional(),
  /** Footprint width, metres. */
  widthM: z.number().positive().optional(),
  /** Footprint depth, metres. */
  depthM: z.number().positive().optional(),
  /** Ridge/eave height, metres. Drives 3D extrusion + shadow estimation. */
  heightM: z.number().nonnegative().optional(),
  /** Habitable stories, integer. Multiplies usable floor area + cost. */
  storiesCount: z.number().int().positive().optional(),
  /** Steward-entered cost estimate, full dollars. */
  costEstimate: z.number().nonnegative().optional(),
  /** Steward-entered labor estimate, person-hours. §15 phasing rollup. */
  laborHoursEstimate: z.number().nonnegative().optional(),
  /** Steward-entered material estimate, metric tons. §15 phasing rollup. */
  materialTonnageEstimate: z.number().nonnegative().optional(),
  /** Daily water demand override, US gal/day. Wins over per-kind defaults. */
  demandWaterGalPerDay: z.number().nonnegative().optional(),
  /** Daily electricity demand override, kWh/day. Wins over per-kind defaults. */
  demandKwhPerDay: z.number().nonnegative().optional(),
  /** Human occupant count for residential kinds. Multiplies demands linearly. */
  occupantCount: z.number().int().nonnegative().optional(),
  /** Required infrastructure (e.g. ['water', 'power']). Free-form tags. */
  infrastructureReqs: z.array(z.string().max(64)).optional(),
  /** §15 — temporary or seasonal structure marker. */
  isTemporary: z.boolean().optional(),
  /** 1-indexed months present (1=Jan, 12=Dec). Meaningful only when isTemporary. */
  seasonalMonths: z.array(z.number().int().min(1).max(12)).optional(),
  /** Yeomans phase tag — 'water'|'access'|'structure'|'subdivision'|'soil'|'tree'|'building'. */
  phase: z.string().max(32).optional(),
  /** Multi-Enterprise — `enterpriseStore` enterprise id this entity belongs to. */
  enterprise: z.string().optional(),
});
export type ProposedMetadata = z.infer<typeof ProposedMetadata>;

// ─────────────────────────────────────────────────────────────────────────
// Unified entity
// ─────────────────────────────────────────────────────────────────────────

/**
 * Common fields on every Built Environment entity. The discriminating
 * `kind` is a free-form string validated against the kind registry
 * (builtEnvironmentKinds.ts) — not an enum here, so adding a kind does
 * not require a schema bump.
 */
export const BuiltEnvironmentEntity = z.object({
  /** Client-generated UUID. Stable across edits. */
  id: z.string().min(1),
  /** Project this entity belongs to. */
  projectId: z.string().min(1),
  /** Canonical kind from `BUILT_ENVIRONMENT_KINDS` (kebab-case). */
  kind: z.string().min(1),
  /** State axis — 'existing' (Observe) or 'proposed' (Plan). */
  state: BuiltEnvironmentState,
  /** Geometry — Point | LineString | Polygon. Concrete shape per-kind. */
  geometry: BuiltEnvironmentGeometry,
  /** Optional human label shown in tooltips + lists. */
  label: z.string().max(200).optional(),
  /** Free-form notes from the steward. */
  notes: z.string().max(4000).optional(),
  /** ISO-8601 timestamp. Set on create. */
  createdAt: z.string().datetime({ offset: true }),
  /** ISO-8601 timestamp. Set on every metadata/geometry update. */
  updatedAt: z.string().datetime({ offset: true }),
  /** Server-assigned UUID after backend sync. Undefined = client-only. */
  serverId: z.string().optional(),
  /** When true, the canvas suppresses this entity. Steward-side display
   *  flag set by the PlacedFeaturesCard visibility toggle; data is
   *  preserved. Optional — undefined / false = shown. */
  hidden: z.boolean().optional(),

  /** State-specific metadata blocks. Both optional — per-kind helpers
   *  enforce required-by-state. The two blocks are NOT mutually exclusive
   *  on the schema; Plan structures may carry inherited descriptive
   *  measurements (lengthM/areaM2 from turf), and existing entities may
   *  acquire proposed-style upgrades over time. */
  existing: ExistingMetadata.optional(),
  proposed: ProposedMetadata.optional(),
});
export type BuiltEnvironmentEntity = z.infer<typeof BuiltEnvironmentEntity>;

// ─────────────────────────────────────────────────────────────────────────
// CRUD payload helpers
// ─────────────────────────────────────────────────────────────────────────

/** Input for `create` — id/createdAt/updatedAt are filled by the store. */
export const CreateBuiltEnvironmentInput = BuiltEnvironmentEntity.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  serverId: true,
});
export type CreateBuiltEnvironmentInput = z.infer<typeof CreateBuiltEnvironmentInput>;

/** Patch for `updateMetadata` / `updateGeometry`. All fields optional;
 *  the store overwrites only what is set and bumps `updatedAt`. */
export const UpdateBuiltEnvironmentInput = z.object({
  geometry: BuiltEnvironmentGeometry.optional(),
  label: z.string().max(200).optional(),
  notes: z.string().max(4000).optional(),
  state: BuiltEnvironmentState.optional(),
  existing: ExistingMetadata.partial().optional(),
  proposed: ProposedMetadata.partial().optional(),
  serverId: z.string().optional(),
});
export type UpdateBuiltEnvironmentInput = z.infer<typeof UpdateBuiltEnvironmentInput>;

// ─────────────────────────────────────────────────────────────────────────
// Convenience type-guards
// ─────────────────────────────────────────────────────────────────────────

export function isExisting(e: BuiltEnvironmentEntity): boolean {
  return e.state === 'existing';
}
export function isProposed(e: BuiltEnvironmentEntity): boolean {
  return e.state === 'proposed';
}

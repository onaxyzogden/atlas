/**
 * builtEnvironmentProjection — pure functions that map a unified
 * `BuiltEnvironmentEntity[]` slice back into the legacy per-store shapes.
 *
 * Phase 3 of the Built Environment unification (see ADR
 * `wiki/decisions/2026-05-10-atlas-built-environment-unification.md`)
 * rewrites the legacy store hooks (`useBuiltEnvironmentStore`,
 * `useStructureStore`, `useDesignElementsStore`) in-place as adapters:
 * passthrough when `FLAGS.BUILT_ENV_V2` is off, projection from v2 when on.
 *
 * These helpers are the inverses of the migration helpers in
 * `apps/web/src/store/builtEnvironmentStoreV2.ts`. They share the canonical
 * kind taxonomy from `builtEnvironmentKinds.ts` so a `barn` placed in either
 * stage round-trips identically.
 *
 * Pure: no I/O, no random ids, no `Date.now()`. Output ordering preserves
 * input ordering (filter only).
 */

import type { BuiltEnvironmentEntity } from './builtEnvironment.js';
import { canonicalizeKind } from './builtEnvironmentKinds.js';

// ─────────────────────────────────────────────────────────────────────────
// Legacy-shape interfaces
//
// Mirrored from `apps/web/src/store/builtEnvironmentStore.ts`,
// `apps/web/src/store/structureStore.ts`, and
// `apps/web/src/store/designElementsStore.ts`. We keep them here (instead of
// importing across the workspace boundary) so `@ogden/shared` stays
// app-independent. The web adapters cast the projected values to their
// authoritative legacy types — these interfaces just enforce shape parity.
// ─────────────────────────────────────────────────────────────────────────

export interface ProjectedBuilding {
  id: string;
  projectId: string;
  geometry: GeoJSON.Polygon;
  subtype: string;
  label?: string;
  notes?: string;
  areaM2?: number;
  createdAt: string;
}

export interface ProjectedWell {
  id: string;
  projectId: string;
  /** [lng, lat] */
  position: [number, number];
  kind: string;
  depthM?: number;
  flowLpm?: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectedSeptic {
  id: string;
  projectId: string;
  geometry: GeoJSON.Polygon;
  kind: string;
  label?: string;
  notes?: string;
  areaM2?: number;
  createdAt: string;
}

export interface ProjectedPowerLine {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  placement: 'overhead' | 'buried';
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectedBuriedUtility {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  kind: string;
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectedFence {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  kind: string;
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectedGate {
  id: string;
  projectId: string;
  /** [lng, lat] */
  position: [number, number];
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectedExistingDriveway {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  surface: string;
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectedStructure {
  id: string;
  projectId: string;
  name: string;
  /** Legacy snake_case StructureType (cabin, prayer_space, ...). */
  type: string;
  /** [lng, lat] — polygon centroid. */
  center: [number, number];
  geometry: GeoJSON.Polygon;
  rotationDeg: number;
  widthM: number;
  depthM: number;
  phase: string;
  costEstimate: number | null;
  heightM?: number;
  storiesCount?: number;
  laborHoursEstimate?: number;
  materialTonnageEstimate?: number;
  infrastructureReqs: string[];
  notes: string;
  isTemporary?: boolean;
  seasonalMonths?: number[];
  demandWaterGalPerDay?: number;
  demandKwhPerDay?: number;
  occupantCount?: number;
  enterprise?: string;
  createdAt: string;
  updatedAt: string;
  serverId?: string;
}

export interface ProjectedDesignElement {
  id: string;
  /** Legacy DesignCategory string — derived from the kind registry category. */
  category: string;
  kind: string;
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
  phase: string;
  label?: string;
  acreage?: number;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/** Tuple-cast a Point's coordinates without copying. */
function tupleFromPoint(p: GeoJSON.Point): [number, number] {
  const [lng, lat] = p.coordinates;
  return [lng ?? 0, lat ?? 0];
}

/** Naive centroid of a Polygon's outer ring (mean of vertices, ignoring the
 *  closing duplicate). Adequate for legacy `Structure.center` which is only
 *  used for floater placement + zoom anchoring. */
function polygonCentroid(p: GeoJSON.Polygon): [number, number] {
  const ring = p.coordinates[0] ?? [];
  // GeoJSON polygon rings repeat the first vertex at the end — drop it.
  const verts = ring.length > 1 ? ring.slice(0, -1) : ring;
  if (verts.length === 0) return [0, 0];
  let sx = 0;
  let sy = 0;
  for (const v of verts) {
    sx += v[0] ?? 0;
    sy += v[1] ?? 0;
  }
  return [sx / verts.length, sy / verts.length];
}

/**
 * Reverse map: canonical kebab-case kind → legacy snake_case StructureType.
 * Only kinds that the Plan structureStore historically authored appear here;
 * other kinds (e.g. `power-line`, `gate`) are Observe-only and never need
 * back-projection to a Structure.
 */
const KIND_TO_LEGACY_STRUCTURE_TYPE: Readonly<Record<string, string>> = Object.freeze({
  cabin: 'cabin',
  yurt: 'yurt',
  pavilion: 'pavilion',
  greenhouse: 'greenhouse',
  barn: 'barn',
  workshop: 'workshop',
  'prayer-pavilion': 'prayer_space',
  bathhouse: 'bathhouse',
  classroom: 'classroom',
  shed: 'storage',
  'animal-shelter': 'animal_shelter',
  compost: 'compost_station',
  'water-pump-house': 'water_pump_house',
  'tent-glamping': 'tent_glamping',
  'fire-circle': 'fire_circle',
  lookout: 'lookout',
  earthship: 'earthship',
  'solar-array': 'solar_array',
  well: 'well',
  'water-tank': 'water_tank',
});

/** Set of canonical kinds that the Plan structureStore authors. */
export const STRUCTURE_KINDS: ReadonlySet<string> = new Set(
  Object.keys(KIND_TO_LEGACY_STRUCTURE_TYPE),
);

/**
 * Set of canonical kinds the structure-class portion of the legacy
 * designElementsStore authored. Mirrors the same name in
 * `builtEnvironmentStoreV2.ts` (kept private there).
 */
export const DESIGN_ELEMENT_STRUCTURE_KINDS: ReadonlySet<string> = new Set([
  'yurt',
  'greenhouse',
  'barn',
  'shed',
  'machinery-shed',
  'fuel-station',
  'equipment-yard',
  'water-tank',
  'parking',
  'prayer-pavilion',
  'fire-circle',
  'compost',
]);

// ─────────────────────────────────────────────────────────────────────────
// Observe projections (state === 'existing')
// ─────────────────────────────────────────────────────────────────────────

/**
 * NB on `state` filtering. Observe historically owned the existing-state
 * surface, so we filter by `state === 'existing'`. After unification, a
 * `barn` placed via Plan with `state === 'proposed'` is intentionally NOT
 * surfaced through Observe slices — it appears via the Structure /
 * DesignElement slices instead. The `kind` filter makes this safe even when
 * future kinds default-on for both states.
 */
export function projectToBuildings(
  entities: readonly BuiltEnvironmentEntity[],
): ProjectedBuilding[] {
  const out: ProjectedBuilding[] = [];
  for (const e of entities) {
    if (e.kind !== 'building' || e.state !== 'existing') continue;
    if (e.geometry.type !== 'Polygon') continue;
    out.push({
      id: e.id,
      projectId: e.projectId,
      geometry: e.geometry,
      subtype: e.existing?.subtype ?? 'other',
      label: e.label,
      notes: e.notes,
      areaM2: e.existing?.areaM2,
      createdAt: e.createdAt,
    });
  }
  return out;
}

export function projectToWells(
  entities: readonly BuiltEnvironmentEntity[],
): ProjectedWell[] {
  const out: ProjectedWell[] = [];
  for (const e of entities) {
    if (e.kind !== 'well' || e.state !== 'existing') continue;
    if (e.geometry.type !== 'Point') continue;
    out.push({
      id: e.id,
      projectId: e.projectId,
      position: tupleFromPoint(e.geometry),
      kind: e.existing?.subtype ?? 'unknown',
      depthM: e.existing?.depthM,
      flowLpm: e.existing?.flowLpm,
      label: e.label,
      notes: e.notes,
      createdAt: e.createdAt,
    });
  }
  return out;
}

export function projectToSeptics(
  entities: readonly BuiltEnvironmentEntity[],
): ProjectedSeptic[] {
  const out: ProjectedSeptic[] = [];
  for (const e of entities) {
    if (e.kind !== 'septic' || e.state !== 'existing') continue;
    if (e.geometry.type !== 'Polygon') continue;
    out.push({
      id: e.id,
      projectId: e.projectId,
      geometry: e.geometry,
      kind: e.existing?.subtype ?? 'other',
      label: e.label,
      notes: e.notes,
      areaM2: e.existing?.areaM2,
      createdAt: e.createdAt,
    });
  }
  return out;
}

export function projectToPowerLines(
  entities: readonly BuiltEnvironmentEntity[],
): ProjectedPowerLine[] {
  const out: ProjectedPowerLine[] = [];
  for (const e of entities) {
    if (e.kind !== 'power-line' || e.state !== 'existing') continue;
    if (e.geometry.type !== 'LineString') continue;
    out.push({
      id: e.id,
      projectId: e.projectId,
      geometry: e.geometry,
      placement: e.existing?.placement ?? 'overhead',
      lengthM: e.existing?.lengthM ?? 0,
      label: e.label,
      notes: e.notes,
      createdAt: e.createdAt,
    });
  }
  return out;
}

export function projectToBuriedUtilities(
  entities: readonly BuiltEnvironmentEntity[],
): ProjectedBuriedUtility[] {
  const out: ProjectedBuriedUtility[] = [];
  for (const e of entities) {
    if (e.kind !== 'buried-utility' || e.state !== 'existing') continue;
    if (e.geometry.type !== 'LineString') continue;
    out.push({
      id: e.id,
      projectId: e.projectId,
      geometry: e.geometry,
      kind: e.existing?.subtype ?? 'other',
      lengthM: e.existing?.lengthM ?? 0,
      label: e.label,
      notes: e.notes,
      createdAt: e.createdAt,
    });
  }
  return out;
}

export function projectToFences(
  entities: readonly BuiltEnvironmentEntity[],
): ProjectedFence[] {
  const out: ProjectedFence[] = [];
  for (const e of entities) {
    if (e.kind !== 'fence' || e.state !== 'existing') continue;
    if (e.geometry.type !== 'LineString') continue;
    out.push({
      id: e.id,
      projectId: e.projectId,
      geometry: e.geometry,
      kind: e.existing?.subtype ?? 'other',
      lengthM: e.existing?.lengthM ?? 0,
      label: e.label,
      notes: e.notes,
      createdAt: e.createdAt,
    });
  }
  return out;
}

export function projectToGates(
  entities: readonly BuiltEnvironmentEntity[],
): ProjectedGate[] {
  const out: ProjectedGate[] = [];
  for (const e of entities) {
    if (e.kind !== 'gate' || e.state !== 'existing') continue;
    if (e.geometry.type !== 'Point') continue;
    out.push({
      id: e.id,
      projectId: e.projectId,
      position: tupleFromPoint(e.geometry),
      label: e.label,
      notes: e.notes,
      createdAt: e.createdAt,
    });
  }
  return out;
}

export function projectToExistingDriveways(
  entities: readonly BuiltEnvironmentEntity[],
): ProjectedExistingDriveway[] {
  const out: ProjectedExistingDriveway[] = [];
  for (const e of entities) {
    if (e.kind !== 'driveway' || e.state !== 'existing') continue;
    if (e.geometry.type !== 'LineString') continue;
    out.push({
      id: e.id,
      projectId: e.projectId,
      geometry: e.geometry,
      surface: e.existing?.surface ?? 'other',
      lengthM: e.existing?.lengthM ?? 0,
      label: e.label,
      notes: e.notes,
      createdAt: e.createdAt,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Plan projections (state === 'proposed')
// ─────────────────────────────────────────────────────────────────────────

/**
 * Project v2 entities to legacy Plan `Structure[]`. Filters to
 * `state === 'proposed'` AND kinds the legacy structureStore historically
 * authored (see `STRUCTURE_KINDS`). Snake_case `type` is restored from the
 * canonical kebab `kind` via `KIND_TO_LEGACY_STRUCTURE_TYPE`.
 */
export function projectToStructures(
  entities: readonly BuiltEnvironmentEntity[],
): ProjectedStructure[] {
  const out: ProjectedStructure[] = [];
  for (const e of entities) {
    if (e.state !== 'proposed') continue;
    const canonical = canonicalizeKind(e.kind) ?? e.kind;
    const legacyType = KIND_TO_LEGACY_STRUCTURE_TYPE[canonical];
    if (!legacyType) continue;
    if (e.geometry.type !== 'Polygon') continue;
    const proposed = e.proposed ?? {};
    out.push({
      id: e.id,
      projectId: e.projectId,
      name: e.label ?? '',
      type: legacyType,
      center: polygonCentroid(e.geometry),
      geometry: e.geometry,
      rotationDeg: proposed.rotationDeg ?? 0,
      widthM: proposed.widthM ?? 0,
      depthM: proposed.depthM ?? 0,
      phase: proposed.phase ?? 'building',
      costEstimate: proposed.costEstimate ?? null,
      heightM: proposed.heightM,
      storiesCount: proposed.storiesCount,
      laborHoursEstimate: proposed.laborHoursEstimate,
      materialTonnageEstimate: proposed.materialTonnageEstimate,
      infrastructureReqs: proposed.infrastructureReqs ?? [],
      notes: e.notes ?? '',
      isTemporary: proposed.isTemporary,
      seasonalMonths: proposed.seasonalMonths,
      demandWaterGalPerDay: proposed.demandWaterGalPerDay,
      demandKwhPerDay: proposed.demandKwhPerDay,
      occupantCount: proposed.occupantCount,
      enterprise: proposed.enterprise,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      serverId: e.serverId,
    });
  }
  return out;
}

/**
 * Project v2 entities to a single project's design-element list, restricted
 * to structure-class kinds (the slice migrated into v2 by Phase 2). Returns
 * an array; the legacy store wraps it under `byProject[projectId]`.
 */
export function projectToDesignElements(
  entities: readonly BuiltEnvironmentEntity[],
  projectId: string,
): ProjectedDesignElement[] {
  const out: ProjectedDesignElement[] = [];
  for (const e of entities) {
    if (e.projectId !== projectId) continue;
    if (e.state !== 'proposed') continue;
    const canonical = canonicalizeKind(e.kind) ?? e.kind;
    if (!DESIGN_ELEMENT_STRUCTURE_KINDS.has(canonical)) continue;
    out.push({
      id: e.id,
      // Legacy DesignCategory mostly mapped 1:1 to the kind's category in
      // v2 (`building`/`agricultural`/`utility`/`amenity`/`machinery`).
      // Adapter callers re-cast to their authoritative type.
      category: 'structure',
      kind: canonical,
      geometry: e.geometry,
      phase: e.proposed?.phase ?? 'building',
      label: e.label,
      createdAt: e.createdAt,
    });
  }
  return out;
}

/**
 * Reduce v2 entities into the legacy `byProject` map (structure-class kinds
 * only). Used by `useDesignElementsStore` adapter when flag-on.
 */
export function projectToDesignElementsByProject(
  entities: readonly BuiltEnvironmentEntity[],
): Record<string, ProjectedDesignElement[]> {
  const byProject: Record<string, ProjectedDesignElement[]> = {};
  for (const e of entities) {
    if (e.state !== 'proposed') continue;
    const canonical = canonicalizeKind(e.kind) ?? e.kind;
    if (!DESIGN_ELEMENT_STRUCTURE_KINDS.has(canonical)) continue;
    const list = byProject[e.projectId] ?? (byProject[e.projectId] = []);
    list.push({
      id: e.id,
      category: 'structure',
      kind: canonical,
      geometry: e.geometry,
      phase: e.proposed?.phase ?? 'building',
      label: e.label,
      createdAt: e.createdAt,
    });
  }
  return byProject;
}

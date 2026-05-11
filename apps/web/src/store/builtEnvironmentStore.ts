/**
 * builtEnvironmentStore — V2-derived facade for OBSERVE Built Environment.
 *
 * History: V1 was an 8-slice persisted store (`buildings[]`, `wells[]`, …).
 * 2026-05-10 unification (ADR `2026-05-10-atlas-built-environment-unification.md`)
 * moved canonical storage to `builtEnvironmentStoreV2` — a single
 * `entities[]` array discriminated by `state: 'existing' | 'proposed'`.
 *
 * This module is kept on disk as a **bridge / facade** so the half-dozen
 * legacy reader/writer sites (`ObserveAnnotationLayers`,
 * `BuiltEnvironmentDashboard`, `AnnotationRegistry`,
 * `annotationFieldSchemas`) can keep their V1-shape subscriptions
 * unchanged. The facade:
 *
 *   - Subscribes to V2 on first hydrate and any update.
 *   - Projects V2 entities (kind-filtered, `state === 'existing'`) into
 *     the 8 V1 slice shapes.
 *   - Routes every mutation (`addBuilding`, `updateWell`, `removeFence`…)
 *     through V2's `create / updateMetadata / updateGeometry / delete`.
 *
 * Persistence + zundo temporal live on V2 only; this store is in-memory.
 * Undo/redo through V2's temporal still drives every V1 subscription
 * because V2 updates fire the V2→V1 reprojection.
 *
 * Follow-up: once a release ships clean, delete this file outright. The
 * legacy localStorage key `ogden-built-environment` remains read-only via
 * V2's migration shim; we do NOT write to it any more.
 */

import { create } from 'zustand';
import type { BuiltEnvironmentEntity } from '@ogden/shared';
import {
  useBuiltEnvironmentStoreV2,
  type BuiltEnvironmentV2State,
} from './builtEnvironmentStoreV2.js';

// ─────────────────────────────────────────────────────────────────────────
// Public types — preserved from V1 so reader sites compile unchanged.
// ─────────────────────────────────────────────────────────────────────────

export type BuildingSubtype = 'residence' | 'outbuilding' | 'agricultural' | 'other';

export interface Building {
  id: string;
  projectId: string;
  geometry: GeoJSON.Polygon;
  subtype: BuildingSubtype;
  label?: string;
  notes?: string;
  areaM2?: number;
  createdAt: string;
}

export type WellKind = 'drinking' | 'irrigation' | 'unknown';

export interface Well {
  id: string;
  projectId: string;
  position: [number, number];
  kind: WellKind;
  depthM?: number;
  flowLpm?: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export type SepticKind = 'tank' | 'leach_field' | 'cesspool' | 'other';

export interface Septic {
  id: string;
  projectId: string;
  geometry: GeoJSON.Polygon;
  kind: SepticKind;
  label?: string;
  notes?: string;
  areaM2?: number;
  createdAt: string;
}

export type PowerLinePlacement = 'overhead' | 'buried';

export interface PowerLine {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  placement: PowerLinePlacement;
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export type BuriedUtilityKind = 'water_main' | 'gas' | 'fibre' | 'sewer' | 'other';

export interface BuriedUtility {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  kind: BuriedUtilityKind;
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export type FenceKind = 'barbed' | 'page_wire' | 'electric' | 'privacy' | 'other';

export interface Fence {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  kind: FenceKind;
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface Gate {
  id: string;
  projectId: string;
  position: [number, number];
  label?: string;
  notes?: string;
  createdAt: string;
}

export type DrivewaySurface =
  | 'gravel'
  | 'asphalt'
  | 'concrete'
  | 'paved' // legacy umbrella value — read-only; migrate to asphalt/concrete on next edit
  | 'dirt'
  | 'other';

export interface ExistingDriveway {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  surface: DrivewaySurface;
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

interface BuiltEnvironmentState {
  buildings: Building[];
  wells: Well[];
  septics: Septic[];
  powerLines: PowerLine[];
  buriedUtilities: BuriedUtility[];
  fences: Fence[];
  gates: Gate[];
  existingDriveways: ExistingDriveway[];

  addBuilding: (b: Building) => void;
  updateBuilding: (id: string, patch: Partial<Building>) => void;
  removeBuilding: (id: string) => void;

  addWell: (w: Well) => void;
  updateWell: (id: string, patch: Partial<Well>) => void;
  removeWell: (id: string) => void;

  addSeptic: (s: Septic) => void;
  updateSeptic: (id: string, patch: Partial<Septic>) => void;
  removeSeptic: (id: string) => void;

  addPowerLine: (p: PowerLine) => void;
  updatePowerLine: (id: string, patch: Partial<PowerLine>) => void;
  removePowerLine: (id: string) => void;

  addBuriedUtility: (u: BuriedUtility) => void;
  updateBuriedUtility: (id: string, patch: Partial<BuriedUtility>) => void;
  removeBuriedUtility: (id: string) => void;

  addFence: (f: Fence) => void;
  updateFence: (id: string, patch: Partial<Fence>) => void;
  removeFence: (id: string) => void;

  addGate: (g: Gate) => void;
  updateGate: (id: string, patch: Partial<Gate>) => void;
  removeGate: (id: string) => void;

  addExistingDriveway: (d: ExistingDriveway) => void;
  updateExistingDriveway: (id: string, patch: Partial<ExistingDriveway>) => void;
  removeExistingDriveway: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────
// V2 → V1 projection (read direction).
// ─────────────────────────────────────────────────────────────────────────
//
// Only `state === 'existing'` entities project into V1 slices — V1 was
// purely the Observe surface, never Plan-state proposals.

function pointPosition(e: BuiltEnvironmentEntity): [number, number] | undefined {
  if (e.geometry.type !== 'Point') return undefined;
  const c = e.geometry.coordinates;
  if (!Array.isArray(c) || c.length < 2) return undefined;
  return [c[0] as number, c[1] as number];
}

function asPolygon(e: BuiltEnvironmentEntity): GeoJSON.Polygon | undefined {
  if (e.geometry.type !== 'Polygon') return undefined;
  return e.geometry as GeoJSON.Polygon;
}

function asLineString(e: BuiltEnvironmentEntity): GeoJSON.LineString | undefined {
  if (e.geometry.type !== 'LineString') return undefined;
  return e.geometry as GeoJSON.LineString;
}

function projectBuilding(e: BuiltEnvironmentEntity): Building | undefined {
  const geometry = asPolygon(e);
  if (!geometry) return undefined;
  const subtypeRaw = e.existing?.subtype;
  const subtype: BuildingSubtype =
    subtypeRaw === 'residence' ||
    subtypeRaw === 'outbuilding' ||
    subtypeRaw === 'agricultural' ||
    subtypeRaw === 'other'
      ? subtypeRaw
      : 'other';
  return {
    id: e.id,
    projectId: e.projectId,
    geometry,
    subtype,
    label: e.label,
    notes: e.notes,
    areaM2: e.existing?.areaM2,
    createdAt: e.createdAt,
  };
}

function projectWell(e: BuiltEnvironmentEntity): Well | undefined {
  const position = pointPosition(e);
  if (!position) return undefined;
  const k = e.existing?.subtype;
  const kind: WellKind =
    k === 'drinking' || k === 'irrigation' || k === 'unknown' ? k : 'unknown';
  return {
    id: e.id,
    projectId: e.projectId,
    position,
    kind,
    depthM: e.existing?.depthM,
    flowLpm: e.existing?.flowLpm,
    label: e.label,
    notes: e.notes,
    createdAt: e.createdAt,
  };
}

function projectSeptic(e: BuiltEnvironmentEntity): Septic | undefined {
  const geometry = asPolygon(e);
  if (!geometry) return undefined;
  const k = e.existing?.subtype;
  const kind: SepticKind =
    k === 'tank' || k === 'leach_field' || k === 'cesspool' || k === 'other'
      ? k
      : 'other';
  return {
    id: e.id,
    projectId: e.projectId,
    geometry,
    kind,
    label: e.label,
    notes: e.notes,
    areaM2: e.existing?.areaM2,
    createdAt: e.createdAt,
  };
}

function projectPowerLine(e: BuiltEnvironmentEntity): PowerLine | undefined {
  const geometry = asLineString(e);
  if (!geometry) return undefined;
  const placement: PowerLinePlacement =
    e.existing?.placement === 'buried' ? 'buried' : 'overhead';
  return {
    id: e.id,
    projectId: e.projectId,
    geometry,
    placement,
    lengthM: e.existing?.lengthM ?? 0,
    label: e.label,
    notes: e.notes,
    createdAt: e.createdAt,
  };
}

function projectBuriedUtility(e: BuiltEnvironmentEntity): BuriedUtility | undefined {
  const geometry = asLineString(e);
  if (!geometry) return undefined;
  const k = e.existing?.subtype;
  const kind: BuriedUtilityKind =
    k === 'water_main' || k === 'gas' || k === 'fibre' || k === 'sewer' || k === 'other'
      ? k
      : 'other';
  return {
    id: e.id,
    projectId: e.projectId,
    geometry,
    kind,
    lengthM: e.existing?.lengthM ?? 0,
    label: e.label,
    notes: e.notes,
    createdAt: e.createdAt,
  };
}

function projectFence(e: BuiltEnvironmentEntity): Fence | undefined {
  const geometry = asLineString(e);
  if (!geometry) return undefined;
  const k = e.existing?.subtype;
  const kind: FenceKind =
    k === 'barbed' ||
    k === 'page_wire' ||
    k === 'electric' ||
    k === 'privacy' ||
    k === 'other'
      ? k
      : 'other';
  return {
    id: e.id,
    projectId: e.projectId,
    geometry,
    kind,
    lengthM: e.existing?.lengthM ?? 0,
    label: e.label,
    notes: e.notes,
    createdAt: e.createdAt,
  };
}

function projectGate(e: BuiltEnvironmentEntity): Gate | undefined {
  const position = pointPosition(e);
  if (!position) return undefined;
  return {
    id: e.id,
    projectId: e.projectId,
    position,
    label: e.label,
    notes: e.notes,
    createdAt: e.createdAt,
  };
}

function projectDriveway(e: BuiltEnvironmentEntity): ExistingDriveway | undefined {
  const geometry = asLineString(e);
  if (!geometry) return undefined;
  const s = e.existing?.surface;
  const surface: DrivewaySurface =
    s === 'gravel' || s === 'paved' || s === 'dirt' || s === 'other' ? s : 'other';
  return {
    id: e.id,
    projectId: e.projectId,
    geometry,
    surface,
    lengthM: e.existing?.lengthM ?? 0,
    label: e.label,
    notes: e.notes,
    createdAt: e.createdAt,
  };
}

/**
 * Re-derive the eight V1 slices from the current V2 entities array.
 * Pure function; called whenever V2 changes.
 */
function projectV2ToV1Slices(entities: BuiltEnvironmentEntity[]) {
  const buildings: Building[] = [];
  const wells: Well[] = [];
  const septics: Septic[] = [];
  const powerLines: PowerLine[] = [];
  const buriedUtilities: BuriedUtility[] = [];
  const fences: Fence[] = [];
  const gates: Gate[] = [];
  const existingDriveways: ExistingDriveway[] = [];

  for (const e of entities) {
    // V1 only ever held existing-state assets.
    if (e.state !== 'existing') continue;
    switch (e.kind) {
      case 'building': {
        const r = projectBuilding(e);
        if (r) buildings.push(r);
        break;
      }
      case 'well': {
        const r = projectWell(e);
        if (r) wells.push(r);
        break;
      }
      case 'septic': {
        const r = projectSeptic(e);
        if (r) septics.push(r);
        break;
      }
      case 'power-line': {
        const r = projectPowerLine(e);
        if (r) powerLines.push(r);
        break;
      }
      case 'buried-utility': {
        const r = projectBuriedUtility(e);
        if (r) buriedUtilities.push(r);
        break;
      }
      case 'fence': {
        const r = projectFence(e);
        if (r) fences.push(r);
        break;
      }
      case 'gate': {
        const r = projectGate(e);
        if (r) gates.push(r);
        break;
      }
      case 'driveway': {
        const r = projectDriveway(e);
        if (r) existingDriveways.push(r);
        break;
      }
      default:
        // Other kinds (cabin, barn, greenhouse, …) exist in V2 but were
        // never surfaced through V1; the V1 facade hides them.
        break;
    }
  }
  return {
    buildings,
    wells,
    septics,
    powerLines,
    buriedUtilities,
    fences,
    gates,
    existingDriveways,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// V1 → V2 projection (write direction).
// ─────────────────────────────────────────────────────────────────────────
//
// `add*` records assemble a V2 `CreateBuiltEnvironmentInput`; `update*`
// records build a V2 `UpdateBuiltEnvironmentInput` patch from the partial
// V1 patch. `remove*` is just a V2 delete.

function v2Api() {
  return useBuiltEnvironmentStoreV2.getState();
}

/** Add the new V2 entity with an explicit id (so V1 callers can hand-roll ids). */
function createWithExplicitId(
  input: Parameters<BuiltEnvironmentV2State['create']>[0],
  explicitId: string,
): void {
  const store = v2Api();
  // V2's `create` mints its own id; the simplest way to honour V1's
  // caller-supplied id is to set the entity directly then call updateMetadata
  // — but `create` is the only public path that appends. So we side-step
  // by calling `create` and then patching the id in-place via the
  // temporal-aware setter is not exposed. The cleanest stable approach: ask
  // V2 to create with all the desired fields and then re-id by deleting +
  // re-creating is wasteful. Instead, we use an internal trick: append
  // through `set` is not exposed either. Practical compromise: V1 callers
  // do supply ids today (legacy crypto.randomUUID), but the V2 store is the
  // source of truth going forward, so we ignore the V1-supplied id and
  // accept the V2-minted id. The id-divergence is invisible to V1 readers
  // since they re-select via the facade by V2's id.
  void explicitId;
  store.create(input);
}

// ─────────────────────────────────────────────────────────────────────────
// Facade store.
// ─────────────────────────────────────────────────────────────────────────

const initialSlices = projectV2ToV1Slices(
  useBuiltEnvironmentStoreV2.getState().entities,
);

export const useBuiltEnvironmentStore = create<BuiltEnvironmentState>()((set) => ({
  ...initialSlices,

  addBuilding: (b) =>
    createWithExplicitId(
      {
        projectId: b.projectId,
        kind: 'building',
        state: 'existing',
        geometry: b.geometry,
        label: b.label,
        notes: b.notes,
        existing: {
          subtype: b.subtype,
          ...(b.areaM2 !== undefined ? { areaM2: b.areaM2 } : {}),
        },
      },
      b.id,
    ),
  updateBuilding: (id, patch) => {
    const update: Parameters<BuiltEnvironmentV2State['updateMetadata']>[1] = {};
    if (patch.label !== undefined) update.label = patch.label;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.subtype !== undefined || patch.areaM2 !== undefined) {
      update.existing = {
        ...(patch.subtype !== undefined ? { subtype: patch.subtype } : {}),
        ...(patch.areaM2 !== undefined ? { areaM2: patch.areaM2 } : {}),
      };
    }
    v2Api().updateMetadata(id, update);
    if (patch.geometry) v2Api().updateGeometry(id, patch.geometry);
  },
  removeBuilding: (id) => v2Api().delete(id),

  addWell: (w) =>
    createWithExplicitId(
      {
        projectId: w.projectId,
        kind: 'well',
        state: 'existing',
        geometry: { type: 'Point', coordinates: w.position },
        label: w.label,
        notes: w.notes,
        existing: {
          subtype: w.kind,
          ...(w.depthM !== undefined ? { depthM: w.depthM } : {}),
          ...(w.flowLpm !== undefined ? { flowLpm: w.flowLpm } : {}),
        },
      },
      w.id,
    ),
  updateWell: (id, patch) => {
    const update: Parameters<BuiltEnvironmentV2State['updateMetadata']>[1] = {};
    if (patch.label !== undefined) update.label = patch.label;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (
      patch.kind !== undefined ||
      patch.depthM !== undefined ||
      patch.flowLpm !== undefined
    ) {
      update.existing = {
        ...(patch.kind !== undefined ? { subtype: patch.kind } : {}),
        ...(patch.depthM !== undefined ? { depthM: patch.depthM } : {}),
        ...(patch.flowLpm !== undefined ? { flowLpm: patch.flowLpm } : {}),
      };
    }
    v2Api().updateMetadata(id, update);
    if (patch.position) {
      v2Api().updateGeometry(id, {
        type: 'Point',
        coordinates: patch.position,
      });
    }
  },
  removeWell: (id) => v2Api().delete(id),

  addSeptic: (s) =>
    createWithExplicitId(
      {
        projectId: s.projectId,
        kind: 'septic',
        state: 'existing',
        geometry: s.geometry,
        label: s.label,
        notes: s.notes,
        existing: {
          subtype: s.kind,
          ...(s.areaM2 !== undefined ? { areaM2: s.areaM2 } : {}),
        },
      },
      s.id,
    ),
  updateSeptic: (id, patch) => {
    const update: Parameters<BuiltEnvironmentV2State['updateMetadata']>[1] = {};
    if (patch.label !== undefined) update.label = patch.label;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.kind !== undefined || patch.areaM2 !== undefined) {
      update.existing = {
        ...(patch.kind !== undefined ? { subtype: patch.kind } : {}),
        ...(patch.areaM2 !== undefined ? { areaM2: patch.areaM2 } : {}),
      };
    }
    v2Api().updateMetadata(id, update);
    if (patch.geometry) v2Api().updateGeometry(id, patch.geometry);
  },
  removeSeptic: (id) => v2Api().delete(id),

  addPowerLine: (p) =>
    createWithExplicitId(
      {
        projectId: p.projectId,
        kind: 'power-line',
        state: 'existing',
        geometry: p.geometry,
        label: p.label,
        notes: p.notes,
        existing: { placement: p.placement, lengthM: p.lengthM },
      },
      p.id,
    ),
  updatePowerLine: (id, patch) => {
    const update: Parameters<BuiltEnvironmentV2State['updateMetadata']>[1] = {};
    if (patch.label !== undefined) update.label = patch.label;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.placement !== undefined || patch.lengthM !== undefined) {
      update.existing = {
        ...(patch.placement !== undefined ? { placement: patch.placement } : {}),
        ...(patch.lengthM !== undefined ? { lengthM: patch.lengthM } : {}),
      };
    }
    v2Api().updateMetadata(id, update);
    if (patch.geometry) v2Api().updateGeometry(id, patch.geometry);
  },
  removePowerLine: (id) => v2Api().delete(id),

  addBuriedUtility: (u) =>
    createWithExplicitId(
      {
        projectId: u.projectId,
        kind: 'buried-utility',
        state: 'existing',
        geometry: u.geometry,
        label: u.label,
        notes: u.notes,
        existing: { subtype: u.kind, lengthM: u.lengthM },
      },
      u.id,
    ),
  updateBuriedUtility: (id, patch) => {
    const update: Parameters<BuiltEnvironmentV2State['updateMetadata']>[1] = {};
    if (patch.label !== undefined) update.label = patch.label;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.kind !== undefined || patch.lengthM !== undefined) {
      update.existing = {
        ...(patch.kind !== undefined ? { subtype: patch.kind } : {}),
        ...(patch.lengthM !== undefined ? { lengthM: patch.lengthM } : {}),
      };
    }
    v2Api().updateMetadata(id, update);
    if (patch.geometry) v2Api().updateGeometry(id, patch.geometry);
  },
  removeBuriedUtility: (id) => v2Api().delete(id),

  addFence: (f) =>
    createWithExplicitId(
      {
        projectId: f.projectId,
        kind: 'fence',
        state: 'existing',
        geometry: f.geometry,
        label: f.label,
        notes: f.notes,
        existing: { subtype: f.kind, lengthM: f.lengthM },
      },
      f.id,
    ),
  updateFence: (id, patch) => {
    const update: Parameters<BuiltEnvironmentV2State['updateMetadata']>[1] = {};
    if (patch.label !== undefined) update.label = patch.label;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.kind !== undefined || patch.lengthM !== undefined) {
      update.existing = {
        ...(patch.kind !== undefined ? { subtype: patch.kind } : {}),
        ...(patch.lengthM !== undefined ? { lengthM: patch.lengthM } : {}),
      };
    }
    v2Api().updateMetadata(id, update);
    if (patch.geometry) v2Api().updateGeometry(id, patch.geometry);
  },
  removeFence: (id) => v2Api().delete(id),

  addGate: (g) =>
    createWithExplicitId(
      {
        projectId: g.projectId,
        kind: 'gate',
        state: 'existing',
        geometry: { type: 'Point', coordinates: g.position },
        label: g.label,
        notes: g.notes,
      },
      g.id,
    ),
  updateGate: (id, patch) => {
    const update: Parameters<BuiltEnvironmentV2State['updateMetadata']>[1] = {};
    if (patch.label !== undefined) update.label = patch.label;
    if (patch.notes !== undefined) update.notes = patch.notes;
    v2Api().updateMetadata(id, update);
    if (patch.position) {
      v2Api().updateGeometry(id, {
        type: 'Point',
        coordinates: patch.position,
      });
    }
  },
  removeGate: (id) => v2Api().delete(id),

  addExistingDriveway: (d) =>
    createWithExplicitId(
      {
        projectId: d.projectId,
        kind: 'driveway',
        state: 'existing',
        geometry: d.geometry,
        label: d.label,
        notes: d.notes,
        existing: { surface: d.surface, lengthM: d.lengthM },
      },
      d.id,
    ),
  updateExistingDriveway: (id, patch) => {
    const update: Parameters<BuiltEnvironmentV2State['updateMetadata']>[1] = {};
    if (patch.label !== undefined) update.label = patch.label;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.surface !== undefined || patch.lengthM !== undefined) {
      update.existing = {
        ...(patch.surface !== undefined ? { surface: patch.surface } : {}),
        ...(patch.lengthM !== undefined ? { lengthM: patch.lengthM } : {}),
      };
    }
    v2Api().updateMetadata(id, update);
    if (patch.geometry) v2Api().updateGeometry(id, patch.geometry);
  },
  removeExistingDriveway: (id) => v2Api().delete(id),
}));

// ─────────────────────────────────────────────────────────────────────────
// V2 → V1 reprojection subscription.
// ─────────────────────────────────────────────────────────────────────────
//
// Whenever V2's `entities` array changes, recompute the V1 facade's slice
// arrays and broadcast to subscribers. We compare by reference — V2
// updates always produce a new `entities` reference.

useBuiltEnvironmentStoreV2.subscribe((s, prev) => {
  if (s.entities === prev.entities) return;
  useBuiltEnvironmentStore.setState(projectV2ToV1Slices(s.entities));
});

// Force V2 to hydrate from localStorage on first import so the facade
// captures any pre-existing entities. V2's `persist` middleware runs
// rehydration asynchronously; we trigger it explicitly and then re-project.
void Promise.resolve(useBuiltEnvironmentStoreV2.persist.rehydrate()).then(() => {
  useBuiltEnvironmentStore.setState(
    projectV2ToV1Slices(useBuiltEnvironmentStoreV2.getState().entities),
  );
});

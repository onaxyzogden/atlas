/**
 * builtEnvironmentStoreV2 — unified Built Environment store keyed by
 * `state: 'existing' | 'proposed'`.
 *
 * Replaces (gate retired 2026-05-12 — V2 is now the unconditional path):
 *   - builtEnvironmentStore.ts          (Observe — 8 existing-infra kinds)
 *   - structureStore.ts                  (Plan — 20 proposed structure types)
 *   - structure-class kinds in
 *     designElementsStore.ts             (Plan — designElements that are
 *                                         buildings/utilities/machinery/amenities)
 *
 * Schema lives in `@ogden/shared`:
 *   - `BuiltEnvironmentEntity` (builtEnvironment.ts)
 *   - `BUILT_ENVIRONMENT_KINDS` registry (builtEnvironmentKinds.ts)
 *
 * See ADR `wiki/decisions/2026-05-10-atlas-built-environment-unification.md`.
 *
 * Persistence: localStorage key `'ogden-built-environment-v2'` version 1.
 * Migration shim runs on first hydrate when the v2 key is absent and any
 * legacy key is present — translates legacy entries into v2 shape, dedupes
 * by id, retains legacy keys read-only for one release for rollback.
 *
 * Undo: zundo `temporal()` middleware with a 200-step limit, matching the
 * other Observe + Plan stores. The undo timeline is cleared on first v2
 * load (documented in the ADR + release notes).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import {
  type BuiltEnvironmentEntity,
  type BuiltEnvironmentState,
  type BuiltEnvironmentGeometry,
  type CreateBuiltEnvironmentInput,
  type UpdateBuiltEnvironmentInput,
  type ExistingMetadata,
  type ProposedMetadata,
  canonicalizeKind,
  getBuiltEnvironmentKind,
} from '@ogden/shared';

// ─────────────────────────────────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────────────────────────────────

export const V2_STORAGE_KEY = 'ogden-built-environment-v2';
export const LEGACY_OBSERVE_KEY = 'ogden-built-environment';
export const LEGACY_STRUCTURE_KEY = 'ogden-structures';
export const LEGACY_DESIGN_ELEMENTS_KEY = 'ogden-atlas-design-elements';

// ─────────────────────────────────────────────────────────────────────────
// Store state + actions
// ─────────────────────────────────────────────────────────────────────────

export interface BuiltEnvironmentV2State {
  entities: BuiltEnvironmentEntity[];

  /** Create a new entity. Generates id + timestamps; returns the new entity. */
  create: (input: CreateBuiltEnvironmentInput) => BuiltEnvironmentEntity;
  /** Replace just the geometry of an entity. Bumps `updatedAt`. */
  updateGeometry: (id: string, geometry: BuiltEnvironmentGeometry) => void;
  /** Patch metadata fields (label, notes, existing/proposed blocks, serverId).
   *  Bumps `updatedAt`. */
  updateMetadata: (id: string, patch: UpdateBuiltEnvironmentInput) => void;
  /** Flip an entity between existing and proposed. */
  setState: (id: string, state: BuiltEnvironmentState) => void;
  /** Hard delete. */
  delete: (id: string) => void;
  /** Test/dev helper — wipe all entities. */
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function genId(): string {
  // crypto.randomUUID is available in modern browsers + Node 18+; fall back
  // to a date-based id if absent (test environments without crypto).
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `be-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Migration shim — translate legacy entries into v2 shape
// ─────────────────────────────────────────────────────────────────────────

/**
 * Structure-class designElement kinds that migrate into v2. Water/grazing
 * polygons (paddock, orchard, silvopasture, pasture-mix, pond, swale,
 * spring) and access lines (path, road, gate, bridge) stay in
 * `designElementsStore` for now — they are not "built environment" in the
 * unified-schema sense.
 */
const DESIGN_ELEMENT_STRUCTURE_KINDS: ReadonlySet<string> = new Set([
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

interface LegacyObserveSnapshot {
  buildings?: Array<Record<string, unknown>>;
  wells?: Array<Record<string, unknown>>;
  septics?: Array<Record<string, unknown>>;
  powerLines?: Array<Record<string, unknown>>;
  buriedUtilities?: Array<Record<string, unknown>>;
  fences?: Array<Record<string, unknown>>;
  gates?: Array<Record<string, unknown>>;
  existingDriveways?: Array<Record<string, unknown>>;
}

interface LegacyStructure {
  id: string;
  projectId: string;
  name?: string;
  type: string;
  center?: [number, number];
  geometry: GeoJSON.Polygon;
  rotationDeg?: number;
  widthM?: number;
  depthM?: number;
  phase?: string;
  costEstimate?: number | null;
  heightM?: number;
  storiesCount?: number;
  laborHoursEstimate?: number;
  materialTonnageEstimate?: number;
  infrastructureReqs?: string[];
  notes?: string;
  isTemporary?: boolean;
  seasonalMonths?: number[];
  demandWaterGalPerDay?: number;
  demandKwhPerDay?: number;
  occupantCount?: number;
  enterprise?: string;
  createdAt?: string;
  updatedAt?: string;
  serverId?: string;
}

interface LegacyDesignElement {
  id: string;
  category: string;
  kind: string;
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
  phase?: string;
  label?: string;
  acreage?: number;
  createdAt?: string;
}

/** Read a top-level zustand-persisted blob and return its `state` slice. */
function readPersistedSlice<T>(key: string): T | undefined {
  if (typeof window === 'undefined' || !window.localStorage) return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { state?: T };
    return parsed.state;
  } catch {
    return undefined;
  }
}

/** Pull a [lng, lat] tuple out of a Point geometry without mutation. */
function pointGeometry(position: [number, number]): GeoJSON.Point {
  return { type: 'Point', coordinates: [position[0], position[1]] };
}

/** Map an Observe Building → v2 entity. */
function migrateObserveBuilding(
  b: Record<string, unknown>,
): BuiltEnvironmentEntity | undefined {
  if (!b['id'] || !b['projectId'] || !b['geometry']) return undefined;
  const existing: ExistingMetadata = {};
  if (typeof b['subtype'] === 'string') existing.subtype = b['subtype'];
  if (typeof b['areaM2'] === 'number') existing.areaM2 = b['areaM2'];
  return {
    id: String(b['id']),
    projectId: String(b['projectId']),
    kind: 'building',
    state: 'existing',
    geometry: b['geometry'] as BuiltEnvironmentGeometry,
    label: typeof b['label'] === 'string' ? b['label'] : undefined,
    notes: typeof b['notes'] === 'string' ? b['notes'] : undefined,
    createdAt: typeof b['createdAt'] === 'string' ? b['createdAt'] : nowIso(),
    updatedAt: typeof b['createdAt'] === 'string' ? b['createdAt'] : nowIso(),
    existing,
  };
}

/** Map an Observe Well → v2 entity. */
function migrateObserveWell(
  w: Record<string, unknown>,
): BuiltEnvironmentEntity | undefined {
  if (!w['id'] || !w['projectId'] || !w['position']) return undefined;
  const existing: ExistingMetadata = {};
  if (typeof w['kind'] === 'string') existing.subtype = w['kind'];
  if (typeof w['depthM'] === 'number') existing.depthM = w['depthM'];
  if (typeof w['flowLpm'] === 'number') existing.flowLpm = w['flowLpm'];
  return {
    id: String(w['id']),
    projectId: String(w['projectId']),
    kind: 'well',
    state: 'existing',
    geometry: pointGeometry(w['position'] as [number, number]),
    label: typeof w['label'] === 'string' ? w['label'] : undefined,
    notes: typeof w['notes'] === 'string' ? w['notes'] : undefined,
    createdAt: typeof w['createdAt'] === 'string' ? w['createdAt'] : nowIso(),
    updatedAt: typeof w['createdAt'] === 'string' ? w['createdAt'] : nowIso(),
    existing,
  };
}

/** Map an Observe Septic → v2 entity. */
function migrateObserveSeptic(
  s: Record<string, unknown>,
): BuiltEnvironmentEntity | undefined {
  if (!s['id'] || !s['projectId'] || !s['geometry']) return undefined;
  const existing: ExistingMetadata = {};
  if (typeof s['kind'] === 'string') existing.subtype = s['kind'];
  if (typeof s['areaM2'] === 'number') existing.areaM2 = s['areaM2'];
  return {
    id: String(s['id']),
    projectId: String(s['projectId']),
    kind: 'septic',
    state: 'existing',
    geometry: s['geometry'] as BuiltEnvironmentGeometry,
    label: typeof s['label'] === 'string' ? s['label'] : undefined,
    notes: typeof s['notes'] === 'string' ? s['notes'] : undefined,
    createdAt: typeof s['createdAt'] === 'string' ? s['createdAt'] : nowIso(),
    updatedAt: typeof s['createdAt'] === 'string' ? s['createdAt'] : nowIso(),
    existing,
  };
}

/** Map an Observe line-geometry kind (PowerLine, BuriedUtility, Fence,
 *  ExistingDriveway) → v2 entity. */
function migrateObserveLine(
  l: Record<string, unknown>,
  kind: 'power-line' | 'buried-utility' | 'fence' | 'driveway',
): BuiltEnvironmentEntity | undefined {
  if (!l['id'] || !l['projectId'] || !l['geometry']) return undefined;
  const existing: ExistingMetadata = {};
  if (typeof l['lengthM'] === 'number') existing.lengthM = l['lengthM'];
  if (kind === 'power-line' && (l['placement'] === 'overhead' || l['placement'] === 'buried')) {
    existing.placement = l['placement'];
  }
  if (kind === 'buried-utility' && typeof l['kind'] === 'string') {
    existing.subtype = l['kind'];
  }
  if (kind === 'fence' && typeof l['kind'] === 'string') {
    existing.subtype = l['kind'];
  }
  if (kind === 'driveway' && typeof l['surface'] === 'string') {
    existing.surface = l['surface'];
  }
  return {
    id: String(l['id']),
    projectId: String(l['projectId']),
    kind,
    state: 'existing',
    geometry: l['geometry'] as BuiltEnvironmentGeometry,
    label: typeof l['label'] === 'string' ? l['label'] : undefined,
    notes: typeof l['notes'] === 'string' ? l['notes'] : undefined,
    createdAt: typeof l['createdAt'] === 'string' ? l['createdAt'] : nowIso(),
    updatedAt: typeof l['createdAt'] === 'string' ? l['createdAt'] : nowIso(),
    existing,
  };
}

/** Map an Observe Gate → v2 entity. */
function migrateObserveGate(
  g: Record<string, unknown>,
): BuiltEnvironmentEntity | undefined {
  if (!g['id'] || !g['projectId'] || !g['position']) return undefined;
  return {
    id: String(g['id']),
    projectId: String(g['projectId']),
    kind: 'gate',
    state: 'existing',
    geometry: pointGeometry(g['position'] as [number, number]),
    label: typeof g['label'] === 'string' ? g['label'] : undefined,
    notes: typeof g['notes'] === 'string' ? g['notes'] : undefined,
    createdAt: typeof g['createdAt'] === 'string' ? g['createdAt'] : nowIso(),
    updatedAt: typeof g['createdAt'] === 'string' ? g['createdAt'] : nowIso(),
    existing: {},
  };
}

/** Translate a legacy Plan structure → v2 entity. Honours kind aliases
 *  (snake_case `prayer_space` → kebab `prayer-pavilion` etc.). */
function migratePlanStructure(s: LegacyStructure): BuiltEnvironmentEntity | undefined {
  const kind = canonicalizeKind(s.type) ?? canonicalizeKind(s.type.replace(/_/g, '-'));
  if (!kind) return undefined;
  const proposed: ProposedMetadata = {};
  if (typeof s.rotationDeg === 'number') proposed.rotationDeg = s.rotationDeg;
  if (typeof s.widthM === 'number') proposed.widthM = s.widthM;
  if (typeof s.depthM === 'number') proposed.depthM = s.depthM;
  if (typeof s.heightM === 'number') proposed.heightM = s.heightM;
  if (typeof s.storiesCount === 'number') proposed.storiesCount = s.storiesCount;
  if (typeof s.costEstimate === 'number') proposed.costEstimate = s.costEstimate;
  if (typeof s.laborHoursEstimate === 'number') proposed.laborHoursEstimate = s.laborHoursEstimate;
  if (typeof s.materialTonnageEstimate === 'number') {
    proposed.materialTonnageEstimate = s.materialTonnageEstimate;
  }
  if (typeof s.demandWaterGalPerDay === 'number') {
    proposed.demandWaterGalPerDay = s.demandWaterGalPerDay;
  }
  if (typeof s.demandKwhPerDay === 'number') proposed.demandKwhPerDay = s.demandKwhPerDay;
  if (typeof s.occupantCount === 'number') proposed.occupantCount = s.occupantCount;
  if (Array.isArray(s.infrastructureReqs)) proposed.infrastructureReqs = s.infrastructureReqs;
  if (typeof s.isTemporary === 'boolean') proposed.isTemporary = s.isTemporary;
  if (Array.isArray(s.seasonalMonths)) proposed.seasonalMonths = s.seasonalMonths;
  if (typeof s.phase === 'string') proposed.phase = s.phase;
  if (typeof s.enterprise === 'string') proposed.enterprise = s.enterprise;
  return {
    id: s.id,
    projectId: s.projectId,
    kind,
    state: 'proposed',
    geometry: s.geometry,
    label: s.name,
    notes: s.notes,
    createdAt: s.createdAt ?? nowIso(),
    updatedAt: s.updatedAt ?? s.createdAt ?? nowIso(),
    serverId: s.serverId,
    proposed,
  };
}

/** Translate a legacy designElement → v2 entity, IFF its kind is a
 *  structure-class kind. Returns undefined for non-structure kinds (which
 *  stay in `designElementsStore`). */
function migrateDesignElement(
  el: LegacyDesignElement,
  projectId: string,
): BuiltEnvironmentEntity | undefined {
  const canonical = canonicalizeKind(el.kind);
  if (!canonical || !DESIGN_ELEMENT_STRUCTURE_KINDS.has(canonical)) return undefined;
  const spec = getBuiltEnvironmentKind(canonical);
  if (!spec) return undefined;
  const proposed: ProposedMetadata = {};
  if (typeof el.phase === 'string') proposed.phase = el.phase;
  return {
    id: el.id,
    projectId,
    kind: canonical,
    state: 'proposed',
    geometry: el.geometry as BuiltEnvironmentGeometry,
    label: el.label,
    createdAt: el.createdAt ?? nowIso(),
    updatedAt: el.createdAt ?? nowIso(),
    proposed,
  };
}

/**
 * Read the three legacy localStorage blobs and return the merged v2 entity
 * list, deduped by id. Idempotent: subsequent calls produce identical
 * output for identical legacy state.
 */
export function migrateLegacyToV2(): BuiltEnvironmentEntity[] {
  const merged = new Map<string, BuiltEnvironmentEntity>();

  // Observe builtEnvironmentStore (v1) — flat per-kind arrays
  const observe = readPersistedSlice<LegacyObserveSnapshot>(LEGACY_OBSERVE_KEY);
  if (observe) {
    for (const b of observe.buildings ?? []) {
      const e = migrateObserveBuilding(b);
      if (e) merged.set(e.id, e);
    }
    for (const w of observe.wells ?? []) {
      const e = migrateObserveWell(w);
      if (e) merged.set(e.id, e);
    }
    for (const s of observe.septics ?? []) {
      const e = migrateObserveSeptic(s);
      if (e) merged.set(e.id, e);
    }
    for (const l of observe.powerLines ?? []) {
      const e = migrateObserveLine(l, 'power-line');
      if (e) merged.set(e.id, e);
    }
    for (const l of observe.buriedUtilities ?? []) {
      const e = migrateObserveLine(l, 'buried-utility');
      if (e) merged.set(e.id, e);
    }
    for (const l of observe.fences ?? []) {
      const e = migrateObserveLine(l, 'fence');
      if (e) merged.set(e.id, e);
    }
    for (const g of observe.gates ?? []) {
      const e = migrateObserveGate(g);
      if (e) merged.set(e.id, e);
    }
    for (const l of observe.existingDriveways ?? []) {
      const e = migrateObserveLine(l, 'driveway');
      if (e) merged.set(e.id, e);
    }
  }

  // Plan structureStore (v2) — single `structures` array
  const structures = readPersistedSlice<{ structures?: LegacyStructure[] }>(
    LEGACY_STRUCTURE_KEY,
  );
  if (structures?.structures) {
    for (const s of structures.structures) {
      const e = migratePlanStructure(s);
      if (e) merged.set(e.id, e);
    }
  }

  // Plan designElementsStore (v1) — `byProject` map of structure-class kinds
  const designElements = readPersistedSlice<{ byProject?: Record<string, LegacyDesignElement[]> }>(
    LEGACY_DESIGN_ELEMENTS_KEY,
  );
  if (designElements?.byProject) {
    for (const [projectId, list] of Object.entries(designElements.byProject)) {
      for (const el of list) {
        const e = migrateDesignElement(el, projectId);
        if (e) merged.set(e.id, e);
      }
    }
  }

  return Array.from(merged.values());
}

// ─────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────

export const useBuiltEnvironmentStoreV2 = create<BuiltEnvironmentV2State>()(
  persist(
    temporal(
      (set, get) => ({
        entities: [],

        create: (input) => {
          const now = nowIso();
          const entity: BuiltEnvironmentEntity = {
            ...input,
            id: genId(),
            createdAt: now,
            updatedAt: now,
          };
          set((s) => ({ entities: [...s.entities, entity] }));
          return entity;
        },

        updateGeometry: (id, geometry) => {
          const now = nowIso();
          set((s) => ({
            entities: s.entities.map((e) =>
              e.id === id ? { ...e, geometry, updatedAt: now } : e,
            ),
          }));
        },

        updateMetadata: (id, patch) => {
          const now = nowIso();
          set((s) => ({
            entities: s.entities.map((e) => {
              if (e.id !== id) return e;
              return {
                ...e,
                ...(patch.geometry ? { geometry: patch.geometry } : {}),
                ...(patch.label !== undefined ? { label: patch.label } : {}),
                ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
                ...(patch.state ? { state: patch.state } : {}),
                ...(patch.serverId !== undefined ? { serverId: patch.serverId } : {}),
                existing: patch.existing
                  ? { ...e.existing, ...patch.existing }
                  : e.existing,
                proposed: patch.proposed
                  ? { ...e.proposed, ...patch.proposed }
                  : e.proposed,
                updatedAt: now,
              };
            }),
          }));
        },

        setState: (id, state) => {
          const now = nowIso();
          set((s) => ({
            entities: s.entities.map((e) =>
              e.id === id ? { ...e, state, updatedAt: now } : e,
            ),
          }));
          // touch get() to keep it referenced (no behaviour change)
          void get;
        },

        delete: (id) => {
          set((s) => ({ entities: s.entities.filter((e) => e.id !== id) }));
        },

        reset: () => set({ entities: [] }),
      }),
      { limit: 200 },
    ),
    {
      name: V2_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ entities: state.entities }),
      onRehydrateStorage: () => (hydrated, error) => {
        if (error) return;
        // First-load migration: if v2 hydrated to empty AND any legacy key
        // is present, translate. We check by absence-of-key on the localStorage
        // blob, not by `entities.length === 0`, so that a deliberate reset()
        // on an existing v2 install does not re-import legacy data.
        if (typeof window === 'undefined' || !window.localStorage) return;
        const v2Raw = window.localStorage.getItem(V2_STORAGE_KEY);
        const alreadyHasV2 = !!v2Raw;
        if (alreadyHasV2 && hydrated && hydrated.entities.length > 0) return;
        const migrated = migrateLegacyToV2();
        if (migrated.length === 0) return;
        useBuiltEnvironmentStoreV2.setState({ entities: migrated });
        // Clear undo timeline — the migrated state is the new baseline.
        const tempApi = (
          useBuiltEnvironmentStoreV2 as unknown as {
            temporal: { getState: () => { clear: () => void } };
          }
        ).temporal;
        tempApi.getState().clear();
      },
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useBuiltEnvironmentStoreV2.persist.rehydrate();

// ─────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────

export function selectByProject(
  state: BuiltEnvironmentV2State,
  projectId: string,
): BuiltEnvironmentEntity[] {
  return state.entities.filter((e) => e.projectId === projectId);
}

export function selectByProjectAndState(
  state: BuiltEnvironmentV2State,
  projectId: string,
  beState: BuiltEnvironmentState,
): BuiltEnvironmentEntity[] {
  return state.entities.filter((e) => e.projectId === projectId && e.state === beState);
}

export function selectByProjectAndKind(
  state: BuiltEnvironmentV2State,
  projectId: string,
  kind: string,
): BuiltEnvironmentEntity[] {
  const canonical = canonicalizeKind(kind) ?? kind;
  return state.entities.filter((e) => e.projectId === projectId && e.kind === canonical);
}

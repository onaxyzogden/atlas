/**
 * designElementsStore — V2-derived facade for PLAN-stage design elements.
 *
 * History: V1 was a single `byProject: Record<projectId, DesignElement[]>`
 * persisted store on `'ogden-atlas-design-elements'` covering ALL design
 * kinds (water polygons, access lines, grazing paddocks, structures,
 * machinery, amenities).
 *
 * 2026-05-10 unification (ADR
 * `2026-05-10-atlas-built-environment-unification.md`) split the store by
 * domain: structure-class kinds (yurt, greenhouse, barn, shed,
 * machinery-shed, fuel-station, equipment-yard, water-tank, parking,
 * prayer-pavilion, fire-circle, compost) moved into
 * `builtEnvironmentStoreV2`. Non-structure kinds (paddock, pond, swale,
 * orchard, path, road, gate, bridge, …) stay in this store.
 *
 * This module is a **bridge / facade** that combines both sources:
 *
 *   - Reads: union of (a) projected V2 structure-class entities, filtered
 *     to the requested project, and (b) the legacy non-structure entries
 *     held in this store's own internal state.
 *   - `add(projectId, el)` routes to V2 if `el.kind` is structure-class,
 *     otherwise to the internal store.
 *   - `remove(projectId, id)` tries V2 first; if id is unknown there,
 *     falls through to the internal store.
 *   - `clear(projectId)` deletes from both sides for the given project.
 *
 * V2 owns persistence + zundo temporal for structure kinds. Non-structure
 * kinds keep their own persist on the original localStorage key. Toggling
 * the design at Phase 6 will collapse non-structure kinds into a separate
 * `landDesignStore` (or similar) so this facade can be deleted.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  canonicalizeKind,
  projectToDesignElementsByProject,
  type BuiltEnvironmentEntity,
  type ProposedMetadata,
} from '@ogden/shared';
import type { DesignCategory } from '../v3/plan/canvas/elementCatalog.js';
import type { PhaseKey } from '../v3/plan/types.js';
import { useBuiltEnvironmentStoreV2 } from './builtEnvironmentStoreV2.js';

export interface DesignElement {
  id: string;
  category: DesignCategory;
  /** Stable element kind (`paddock`, `pond`, `barn`, …) — keys into elementCatalog. */
  kind: string;
  /** Drawn geometry; geometry.type matches the element spec. */
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
  /** Yeomans phase the element belongs to (defaults from catalog). */
  phase: PhaseKey;
  /** Display label, e.g. `Paddock A`. Auto-assigned letter for polygons. */
  label?: string;
  /** Computed once on draw for polygons (acres). */
  acreage?: number;
  createdAt: string;
}

export interface DesignElementsState {
  /** Per-project element lists. Includes both structure-class (sourced
   *  from V2) and non-structure (sourced from the internal persisted
   *  store) elements. */
  byProject: Record<string, DesignElement[]>;
  add: (projectId: string, el: DesignElement) => void;
  remove: (projectId: string, id: string) => void;
  clear: (projectId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────
// Structure-class kind set — must match
// `DESIGN_ELEMENT_STRUCTURE_KINDS` in builtEnvironmentStoreV2.ts and the
// projection helper. Resolves both canonical kebab and known aliases.
// ─────────────────────────────────────────────────────────────────────────

const STRUCTURE_CLASS_KINDS: ReadonlySet<string> = new Set([
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

function isStructureClass(kind: string): boolean {
  const canonical = canonicalizeKind(kind) ?? kind;
  return STRUCTURE_CLASS_KINDS.has(canonical);
}

// ─────────────────────────────────────────────────────────────────────────
// Internal non-structure store — owns the legacy `'ogden-atlas-design-elements'`
// localStorage key. Holds only non-structure kinds going forward.
// ─────────────────────────────────────────────────────────────────────────

interface NonStructureState {
  byProject: Record<string, DesignElement[]>;
  add: (projectId: string, el: DesignElement) => void;
  remove: (projectId: string, id: string) => void;
  clear: (projectId: string) => void;
}

const useNonStructureStore = create<NonStructureState>()(
  persist(
    (set) => ({
      byProject: {},
      add: (projectId, el) =>
        set((s) => {
          const list = s.byProject[projectId] ?? [];
          return { byProject: { ...s.byProject, [projectId]: [...list, el] } };
        }),
      remove: (projectId, id) =>
        set((s) => {
          const list = s.byProject[projectId] ?? [];
          return {
            byProject: {
              ...s.byProject,
              [projectId]: list.filter((e) => e.id !== id),
            },
          };
        }),
      clear: (projectId) =>
        set((s) => {
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    { name: 'ogden-atlas-design-elements', version: 1 },
  ),
);

useNonStructureStore.persist.rehydrate();

// ─────────────────────────────────────────────────────────────────────────
// V2 → DesignElement projection (structure-class kinds only).
// ─────────────────────────────────────────────────────────────────────────

function projectV2StructureElements(
  entities: BuiltEnvironmentEntity[],
): Record<string, DesignElement[]> {
  const projected = projectToDesignElementsByProject(entities);
  const out: Record<string, DesignElement[]> = {};
  for (const [projectId, list] of Object.entries(projected)) {
    out[projectId] = list.map((p) => ({
      id: p.id,
      // Cast: `projectToDesignElementsByProject` returns category as a
      // generic string; the category here is informational only and
      // consumers re-read it from the `elementCatalog`.
      category: 'structure' as DesignCategory,
      kind: p.kind,
      geometry: p.geometry,
      phase: (p.phase as PhaseKey) ?? ('building' as PhaseKey),
      label: p.label,
      createdAt: p.createdAt,
    }));
  }
  return out;
}

function mergeByProject(
  v2: Record<string, DesignElement[]>,
  nonStruct: Record<string, DesignElement[]>,
): Record<string, DesignElement[]> {
  const out: Record<string, DesignElement[]> = {};
  for (const [projectId, list] of Object.entries(nonStruct)) {
    out[projectId] = [...list];
  }
  for (const [projectId, list] of Object.entries(v2)) {
    out[projectId] = [...(out[projectId] ?? []), ...list];
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Facade store.
// ─────────────────────────────────────────────────────────────────────────

const initialMerged = mergeByProject(
  projectV2StructureElements(useBuiltEnvironmentStoreV2.getState().entities),
  useNonStructureStore.getState().byProject,
);

export const useDesignElementsStore = create<DesignElementsState>()((set, get) => ({
  byProject: initialMerged,

  add: (projectId, el) => {
    if (isStructureClass(el.kind)) {
      const proposed: ProposedMetadata = {};
      if (typeof el.phase === 'string') proposed.phase = el.phase;
      const canonical = canonicalizeKind(el.kind) ?? el.kind;
      useBuiltEnvironmentStoreV2.getState().create({
        projectId,
        kind: canonical,
        state: 'proposed',
        geometry: el.geometry,
        label: el.label,
        proposed,
      });
      // V2 subscription will re-merge byProject; nothing else to do.
    } else {
      useNonStructureStore.getState().add(projectId, el);
    }
    void get; // kept for symmetry with future hooks
  },

  remove: (projectId, id) => {
    const v2State = useBuiltEnvironmentStoreV2.getState();
    const inV2 = v2State.entities.some((e) => e.id === id && e.projectId === projectId);
    if (inV2) {
      v2State.delete(id);
    } else {
      useNonStructureStore.getState().remove(projectId, id);
    }
  },

  clear: (projectId) => {
    // Wipe non-structure entries.
    useNonStructureStore.getState().clear(projectId);
    // Wipe structure-class V2 entries for this project.
    const v2 = useBuiltEnvironmentStoreV2.getState();
    const targets = v2.entities.filter(
      (e) =>
        e.projectId === projectId &&
        e.state === 'proposed' &&
        STRUCTURE_CLASS_KINDS.has(canonicalizeKind(e.kind) ?? e.kind),
    );
    for (const t of targets) v2.delete(t.id);
  },
}));

// ─────────────────────────────────────────────────────────────────────────
// Re-merge when either source changes.
// ─────────────────────────────────────────────────────────────────────────

function recomputeMerged(): void {
  const v2Slice = projectV2StructureElements(
    useBuiltEnvironmentStoreV2.getState().entities,
  );
  const nonStruct = useNonStructureStore.getState().byProject;
  useDesignElementsStore.setState({ byProject: mergeByProject(v2Slice, nonStruct) });
}

useBuiltEnvironmentStoreV2.subscribe((s, prev) => {
  if (s.entities === prev.entities) return;
  recomputeMerged();
});

useNonStructureStore.subscribe((s, prev) => {
  if (s.byProject === prev.byProject) return;
  recomputeMerged();
});

// V2's `persist` rehydrates async; trigger explicitly then re-merge.
void Promise.resolve(useBuiltEnvironmentStoreV2.persist.rehydrate()).then(() => {
  recomputeMerged();
});

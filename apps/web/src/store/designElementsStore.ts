/**
 * designElementsStore â€” V2-derived facade for PLAN-stage design elements.
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
 * orchard, path, road, gate, bridge, â€¦) stay in this store.
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
import {
  canonicalizeKind,
  projectToDesignElementsByProject,
  type BuiltEnvironmentEntity,
  type ProposedMetadata,
} from '@ogden/shared';
import type { DesignCategory } from '../v3/plan/canvas/elementCatalog.js';
import type { PhaseKey, PlanView } from '../v3/plan/types.js';
import { useBuiltEnvironmentStoreV2 } from './builtEnvironmentStoreV2.js';
import { useLandDesignStore } from './landDesignStore.js';

export interface DesignElement {
  id: string;
  category: DesignCategory;
  /** Stable element kind (`paddock`, `pond`, `barn`, â€¦) â€” keys into elementCatalog. */
  kind: string;
  /** Drawn geometry; geometry.type matches the element spec. */
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
  /** Yeomans phase the element belongs to (defaults from catalog). */
  phase: PhaseKey;
  /** Display label, e.g. `Paddock A`. Auto-assigned letter for polygons. */
  label?: string;
  /** Computed once on draw for polygons (acres). */
  acreage?: number;
  /**
   * Buried-utility conflicts captured at draw-time when the element's
   * geometry intersected the 3 m buffer around an OBSERVE-recorded
   * BuriedUtility. Persisted with a paired `utilityAcknowledgment`
   * free-text statement from the steward. See ADR
   * `2026-05-10-plan-earthwork-utility-veto.md`.
   *
   * Only carried on non-structure kinds with `earthworkDepthCm > 30`
   * (pond, swale, road today). Structure-class entities route through
   * `builtEnvironmentStoreV2` and don't carry this field today â€”
   * footings are scoped out of the current veto.
   */
  utilityConflicts?: { id: string; kind: string }[];
  utilityAcknowledgment?: string;
  createdAt: string;
  /**
   * Plan view in which this element was authored. Drives per-view visibility
   * and editability:
   *   - `current`: appears (read-only) on every non-Current view too, unless
   *     listed in `hiddenInViews`.
   *   - non-`current`: appears (editable) only on that view.
   *
   * Records persisted before this field existed migrate to `'current'`.
   */
  view?: PlanView;
  /** Non-Current views in which a `view==='current'` element is hidden. */
  hiddenInViews?: PlanView[];
}

export interface DesignElementsState {
  /** Per-project element lists. Includes both structure-class (sourced
   *  from V2) and non-structure (sourced from the internal persisted
   *  store) elements. */
  byProject: Record<string, DesignElement[]>;
  add: (projectId: string, el: DesignElement) => void;
  remove: (projectId: string, id: string) => void;
  clear: (projectId: string) => void;
  /**
   * Patch a non-structure element's mutable fields (geometry, label,
   * hiddenInViews, etc.). Structure-class kinds are owned by
   * `builtEnvironmentStoreV2` and ignored here; edit them through that
   * store directly.
   */
  update: (
    projectId: string,
    id: string,
    patch: Partial<Omit<DesignElement, 'id'>>,
  ) => void;
  /** Convenience: toggle a non-Current view in `hiddenInViews`. No-op for
   *  structure-class kinds. */
  setHiddenInView: (
    projectId: string,
    id: string,
    view: PlanView,
    hidden: boolean,
  ) => void;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Structure-class kind set â€” must match
// `DESIGN_ELEMENT_STRUCTURE_KINDS` in builtEnvironmentStoreV2.ts and the
// projection helper. Resolves both canonical kebab and known aliases.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Internal non-structure store â€” owns the legacy `'ogden-atlas-design-elements'`
// localStorage key. Holds only non-structure kinds going forward.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Non-structure design elements (paddock / pond / swale / orchard / path /
// road / gate / bridge / turnaround) live in `landDesignStore.ts` since
// 2026-05-12. This facade delegates non-structure reads/writes there;
// structure-class kinds route into builtEnvironmentStoreV2.

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// V2 â†’ DesignElement projection (structure-class kinds only).
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      // V2 structure-class entities don't carry a Plan-view origin field
      // yet — they belong to the project's "Current" reality. Per-view
      // editing for these kinds lives in builtEnvironmentStoreV2 and is
      // out of scope for the design-element per-view filter.
      view: 'current' as PlanView,
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Facade store.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const initialMerged = mergeByProject(
  projectV2StructureElements(useBuiltEnvironmentStoreV2.getState().entities),
  useLandDesignStore.getState().byProject,
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
      useLandDesignStore.getState().add(projectId, el);
    }
    void get; // kept for symmetry with future hooks
  },

  remove: (projectId, id) => {
    const v2State = useBuiltEnvironmentStoreV2.getState();
    const inV2 = v2State.entities.some((e) => e.id === id && e.projectId === projectId);
    if (inV2) {
      v2State.delete(id);
    } else {
      useLandDesignStore.getState().remove(projectId, id);
    }
  },

  clear: (projectId) => {
    // Wipe non-structure entries.
    useLandDesignStore.getState().clear(projectId);
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

  update: (projectId, id, patch) => {
    // Structure-class kinds live in V2 and are edited there; the facade
    // patch path only touches non-structure entries today.
    useLandDesignStore.getState().update(projectId, id, patch);
  },

  setHiddenInView: (projectId, id, view, hidden) => {
    const list = useLandDesignStore.getState().byProject[projectId] ?? [];
    const el = list.find((e) => e.id === id);
    if (!el) return;
    const current = el.hiddenInViews ?? [];
    const next = hidden
      ? Array.from(new Set([...current, view]))
      : current.filter((v) => v !== view);
    useLandDesignStore
      .getState()
      .update(projectId, id, { hiddenInViews: next });
  },
}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Re-merge when either source changes.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function recomputeMerged(): void {
  const v2Slice = projectV2StructureElements(
    useBuiltEnvironmentStoreV2.getState().entities,
  );
  const nonStruct = useLandDesignStore.getState().byProject;
  useDesignElementsStore.setState({ byProject: mergeByProject(v2Slice, nonStruct) });
}

useBuiltEnvironmentStoreV2.subscribe((s, prev) => {
  if (s.entities === prev.entities) return;
  recomputeMerged();
});

useLandDesignStore.subscribe((s, prev) => {
  if (s.byProject === prev.byProject) return;
  recomputeMerged();
});

// V2's `persist` rehydrates async; trigger explicitly then re-merge.
void Promise.resolve(useBuiltEnvironmentStoreV2.persist.rehydrate()).then(() => {
  recomputeMerged();
});

/**
 * designElementsStore — persisted Zustand store for Plan-stage design elements
 * (the spatial-design layer for the Vision-Layout canvas).
 *
 * Distinct from siteAnnotationsStore (Observe) on purpose: design elements are
 * proposed-future objects (paddocks, ponds, structures), observations are
 * measured-present findings. Mixing them violates the diagnose-before-design
 * sequence flagged by the Permaculture Scholar 2026-04-28.
 *
 * Persistence: localStorage, namespaced by projectId via the `byProject` map.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DesignCategory } from '../v3/plan/canvas/elementCatalog.js';
import type { PhaseKey } from '../v3/plan/types.js';

export interface DesignElement {
  id: string;
  category: DesignCategory;
  /** Stable element kind (`paddock`, `pond`, ...) — keys into elementCatalog. */
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
  /** Per-project element lists. */
  byProject: Record<string, DesignElement[]>;
  add: (projectId: string, el: DesignElement) => void;
  remove: (projectId: string, id: string) => void;
  clear: (projectId: string) => void;
}

export const useDesignElementsStore = create<DesignElementsState>()(
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
    {
      name: 'ogden-atlas-design-elements',
      version: 1,
    },
  ),
);

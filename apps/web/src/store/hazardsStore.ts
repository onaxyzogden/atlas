/**
 * Hazards store — per-project natural-hazard log for the v3 Macroclimate
 * & Hazards module. Persisted to localStorage; sync with API in a later
 * sprint. Keyed analogously to visionStore so we can ensureDefaults(projectId)
 * on mount and add/update/remove hazards inline from the dashboard.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HazardKind =
  | 'frost'
  | 'storm'
  | 'drought'
  | 'flood'
  | 'fire'
  | 'wind'
  | 'erosion'
  | 'other';

export type HazardRisk = 'low' | 'moderate' | 'high';
export type HazardTrend = 'up' | 'flat' | 'down';
export type HazardStatus = 'monitoring' | 'planned' | 'in_progress' | 'mitigated';

export interface Hazard {
  id: string;
  kind: HazardKind;
  label: string;
  risk: HazardRisk;
  trend: HazardTrend;
  status: HazardStatus;
  /** 0-100 mitigation coverage. */
  mitigationPct: number;
  /** Optional seasonal window like "Apr-Sep". */
  window?: string;
  notes?: string;
  /** Optional lat/lng for hotspot map. */
  lat?: number;
  lng?: number;
  createdAt: number;
  updatedAt: number;
}

export interface HazardsByProject {
  projectId: string;
  hazards: Hazard[];
}

interface HazardsState {
  byProject: HazardsByProject[];

  getHazards: (projectId: string) => Hazard[];
  ensureDefaults: (projectId: string) => void;
  addHazard: (projectId: string, hazard: Hazard) => void;
  updateHazard: (
    projectId: string,
    hazardId: string,
    patch: Partial<Omit<Hazard, 'id' | 'createdAt'>>,
  ) => void;
  removeHazard: (projectId: string, hazardId: string) => void;
}

export const useHazardsStore = create<HazardsState>()(
  persist(
    (set, get) => ({
      byProject: [],

      getHazards: (projectId) =>
        get().byProject.find((p) => p.projectId === projectId)?.hazards ?? [],

      ensureDefaults: (projectId) => {
        const existing = get().byProject.find((p) => p.projectId === projectId);
        if (existing) return;
        set((s) => ({
          byProject: [...s.byProject, { projectId, hazards: [] }],
        }));
      },

      addHazard: (projectId, hazard) =>
        set((s) => ({
          byProject: s.byProject.some((p) => p.projectId === projectId)
            ? s.byProject.map((p) =>
                p.projectId === projectId
                  ? { ...p, hazards: [...p.hazards, hazard] }
                  : p,
              )
            : [...s.byProject, { projectId, hazards: [hazard] }],
        })),

      updateHazard: (projectId, hazardId, patch) =>
        set((s) => ({
          byProject: s.byProject.map((p) =>
            p.projectId === projectId
              ? {
                  ...p,
                  hazards: p.hazards.map((h) =>
                    h.id === hazardId
                      ? { ...h, ...patch, updatedAt: Date.now() }
                      : h,
                  ),
                }
              : p,
          ),
        })),

      removeHazard: (projectId, hazardId) =>
        set((s) => ({
          byProject: s.byProject.map((p) =>
            p.projectId === projectId
              ? { ...p, hazards: p.hazards.filter((h) => h.id !== hazardId) }
              : p,
          ),
        })),
    }),
    {
      name: 'ogden-hazards',
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

useHazardsStore.persist.rehydrate();

export function makeHazardId(): string {
  return `hz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

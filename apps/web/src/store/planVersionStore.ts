/**
 * planVersionStore — per-project, persisted Plan Versions (Plan-Operation
 * Phase 5b). Like `planDecisionStore`, a version is authored whole, so this
 * store owns complete `PlanVersion` records (each wrapping a full
 * `PlanSnapshot`) keyed `byProject[projectId][versionId]`.
 *
 * Scope: this store records version metadata + the captured snapshot. The
 * capture/restore of live store state lives in `planSnapshot.ts`; the
 * advisory approval stamp (Phase 5c) sets `status: 'approved'` + approvedAt/By
 * here without locking any other surface.
 *
 * Size caveat: snapshots serialise all plan geometry into this blob in
 * localStorage — keep only a small N of versions per project.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type {
  PlanVersion,
  PlanVersionStatus,
} from '../v3/plan/versions/planVersion.js';

type VersionsById = Record<string, PlanVersion>;

const PERSIST_KEY = 'ogden-plan-versions';

interface PlanVersionState {
  byProject: Record<string, VersionsById>;

  /** Read one version, or undefined if it doesn't exist. */
  getVersion: (projectId: string, id: string) => PlanVersion | undefined;
  /** Insert an authored version (wrapping a freshly-captured snapshot). */
  create: (projectId: string, version: PlanVersion) => void;
  /** Patch metadata fields (label/note), stamping updatedAt. */
  update: (projectId: string, id: string, patch: Partial<PlanVersion>) => void;
  /** Set lifecycle status; stamps approvedAt + approvedBy on approve. */
  setStatus: (
    projectId: string,
    id: string,
    status: PlanVersionStatus,
    approvedBy?: string,
  ) => void;
  /** Delete a version (UI only offers this for drafts). */
  remove: (projectId: string, id: string) => void;
}

const now = () => new Date().toISOString();

export const usePlanVersionStore = create<PlanVersionState>()(
  persist(
    (set, get) => {
      const setOne = (projectId: string, id: string, version: PlanVersion) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          return {
            byProject: {
              ...s.byProject,
              [projectId]: { ...project, [id]: version },
            },
          };
        });

      return {
        byProject: {},

        getVersion: (projectId, id) => get().byProject[projectId]?.[id],

        create: (projectId, version) =>
          setOne(projectId, version.id, version),

        update: (projectId, id, patch) => {
          const existing = get().byProject[projectId]?.[id];
          if (!existing) return;
          setOne(projectId, id, { ...existing, ...patch, updatedAt: now() });
        },

        setStatus: (projectId, id, status, approvedBy) => {
          const existing = get().byProject[projectId]?.[id];
          if (!existing) return;
          const stamp = now();
          setOne(projectId, id, {
            ...existing,
            status,
            updatedAt: stamp,
            ...(status === 'approved'
              ? { approvedAt: stamp, approvedBy: approvedBy ?? existing.approvedBy }
              : {}),
          });
        },

        remove: (projectId, id) =>
          set((s) => {
            const project = s.byProject[projectId];
            if (!project || !(id in project)) return s;
            const next = { ...project };
            delete next[id];
            return { byProject: { ...s.byProject, [projectId]: next } };
          }),
      };
    },
    {
      name: PERSIST_KEY,
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(usePlanVersionStore);

/**
 * planWorkPackageStore — per-project, persisted Work Packages (Phase 3). Like
 * `planDecisionStore`, a work package is authored whole, so this store owns
 * complete `PlanWorkPackage` records keyed `byProject[projectId][packageId]`.
 *
 * Scope: operational scheduling only — no riba/gharar/CSRA/salam/investor/
 * financing/cost-of-capital semantics. The Plan side authors + dispatches
 * (draft → queued); the Act side advances (queued → in-progress → done).
 * Dispatching does not write to the WorkItem spine or mutate a Plan module.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import {
  type PlanWorkPackage,
  type PlanWorkPackageStatus,
} from '../v3/plan/work-packages/planWorkPackage.js';

type PackagesById = Record<string, PlanWorkPackage>;

const PERSIST_KEY = 'ogden-plan-work-packages';

interface PlanWorkPackageState {
  byProject: Record<string, PackagesById>;

  /** Read one package, or undefined if it doesn't exist. */
  getPackage: (projectId: string, id: string) => PlanWorkPackage | undefined;
  /** Insert an authored package (blank draft or promoted-from-decision). */
  create: (projectId: string, pkg: PlanWorkPackage) => void;
  /** Patch fields on an existing package, stamping updatedAt. */
  update: (
    projectId: string,
    id: string,
    patch: Partial<PlanWorkPackage>,
  ) => void;
  /** Set lifecycle status; stamps dispatchedAt (→queued) / completedAt (→done). */
  setStatus: (
    projectId: string,
    id: string,
    status: PlanWorkPackageStatus,
  ) => void;
  /** Delete a package (UI only offers this for drafts). */
  remove: (projectId: string, id: string) => void;
}

const now = () => new Date().toISOString();

export const usePlanWorkPackageStore = create<PlanWorkPackageState>()(
  persist(
    (set, get) => {
      const setOne = (
        projectId: string,
        id: string,
        pkg: PlanWorkPackage,
      ) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          return {
            byProject: {
              ...s.byProject,
              [projectId]: { ...project, [id]: pkg },
            },
          };
        });

      return {
        byProject: {},

        getPackage: (projectId, id) => get().byProject[projectId]?.[id],

        create: (projectId, pkg) => setOne(projectId, pkg.id, pkg),

        update: (projectId, id, patch) => {
          const existing = get().byProject[projectId]?.[id];
          if (!existing) return;
          setOne(projectId, id, { ...existing, ...patch, updatedAt: now() });
        },

        setStatus: (projectId, id, status) => {
          const existing = get().byProject[projectId]?.[id];
          if (!existing) return;
          const stamp = now();
          setOne(projectId, id, {
            ...existing,
            status,
            updatedAt: stamp,
            ...(status === 'queued' ? { dispatchedAt: stamp } : {}),
            ...(status === 'done' ? { completedAt: stamp } : {}),
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
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(usePlanWorkPackageStore);

/**
 * actHandoffPackageStore — persisted ActHandoffPackage state per project.
 *
 * Packages are derived from approved PlanDecisionRecords. There can be more
 * than one per (projectId, objectiveId) only via the underlying decision id,
 * so this store keys by package id and indexes by project + decision.
 *
 * Phase 1.5 ships local persistence; Phase 2.4 layers API sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActHandoffPackage } from '@ogden/shared';
import { rehydrateWithLogging } from '../persistRehydrate.js';
import { api } from '../../lib/apiClient.js';
import {
  initialSync,
  startSync,
  readySync,
  errorSync,
  type SyncState,
} from './syncState.js';

type PackagesById = Record<string, ActHandoffPackage>;

const PERSIST_KEY = 'ogden-olos-act-handoff-packages';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `ahp-${crypto.randomUUID()}`;
}

/** Local-only ids are prefixed `ahp-…`; server-assigned ids are UUIDs. */
function isLocalId(id: string): boolean {
  return id.startsWith('ahp-');
}

interface ActHandoffPackageState {
  byProject: Record<string, PackagesById>;
  syncByProject: Record<string, SyncState>;

  /** Read one package by id (across projects). Returns the first match. */
  getPackage: (
    projectId: string,
    packageId: string,
  ) => ActHandoffPackage | undefined;
  /** List all packages in a project. */
  listForProject: (projectId: string) => ActHandoffPackage[];
  /** Find packages built from a given plan decision. */
  listForDecision: (
    projectId: string,
    planDecisionRecordId: string,
  ) => ActHandoffPackage[];
  /** Create a new package. */
  createPackage: (
    projectId: string,
    seed: Omit<ActHandoffPackage, 'id' | 'createdAt' | 'projectId'> &
      Partial<Pick<ActHandoffPackage, 'id' | 'createdAt'>>,
  ) => ActHandoffPackage;
  /** Update a package by id. */
  updatePackage: (
    projectId: string,
    packageId: string,
    patch: Partial<ActHandoffPackage>,
  ) => void;
  /** Delete a package. */
  deletePackage: (projectId: string, packageId: string) => void;

  // ── Phase 2.4 API sync ─────────────────────────────────────────────
  /** GET the project's handoff packages from the API and replace local state. */
  pullAll: (projectId: string) => Promise<void>;
  /** POST (local id) or PATCH (UUID) the package upstream. POST may 409 if
   *  the upstream PlanDecisionRecord is not approved. */
  pushOne: (
    pkg: ActHandoffPackage,
  ) => Promise<ActHandoffPackage | null>;
  /** DELETE the package on the server. */
  pushDelete: (projectId: string, packageId: string) => Promise<void>;
  /** Read the sync state for a project. */
  getSyncState: (projectId: string) => SyncState;
}

export const useActHandoffPackageStore = create<ActHandoffPackageState>()(
  persist(
    (set, get) => ({
      byProject: {},
      syncByProject: {},

      getPackage: (projectId, packageId) =>
        get().byProject[projectId]?.[packageId],

      listForProject: (projectId) =>
        Object.values(get().byProject[projectId] ?? {}),

      listForDecision: (projectId, planDecisionRecordId) =>
        Object.values(get().byProject[projectId] ?? {}).filter(
          (pkg) => pkg.planDecisionRecordId === planDecisionRecordId,
        ),

      createPackage: (projectId, seed) => {
        const pkg: ActHandoffPackage = {
          ...seed,
          id: seed.id ?? newId(),
          projectId,
          createdAt: seed.createdAt ?? now(),
        };
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: {
              ...(s.byProject[projectId] ?? {}),
              [pkg.id]: pkg,
            },
          },
        }));
        return pkg;
      },

      updatePackage: (projectId, packageId, partial) =>
        set((s) => {
          const project = s.byProject[projectId];
          const existing = project?.[packageId];
          if (!existing) return s;
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [packageId]: {
                  ...existing,
                  ...partial,
                  id: existing.id,
                  projectId,
                  createdAt: existing.createdAt,
                },
              },
            },
          };
        }),

      deletePackage: (projectId, packageId) =>
        set((s) => {
          const project = s.byProject[projectId];
          if (!project) return s;
          const { [packageId]: _dropped, ...rest } = project;
          return {
            byProject: { ...s.byProject, [projectId]: rest },
          };
        }),

      getSyncState: (projectId) =>
        get().syncByProject[projectId] ?? initialSync(),

      pullAll: async (projectId) => {
        set((s) => ({
          syncByProject: { ...s.syncByProject, [projectId]: startSync() },
        }));
        try {
          const env = await api.olos.handoffs.list(projectId);
          if (env.error) throw new Error(env.error.message);
          const records = env.data ?? [];
          const byId: PackagesById = {};
          for (const r of records) byId[r.id] = r;
          set((s) => ({
            byProject: { ...s.byProject, [projectId]: byId },
            syncByProject: { ...s.syncByProject, [projectId]: readySync() },
          }));
        } catch (err) {
          set((s) => ({
            syncByProject: {
              ...s.syncByProject,
              [projectId]: errorSync(err),
            },
          }));
          throw err;
        }
      },

      pushOne: async (pkg) => {
        try {
          if (isLocalId(pkg.id)) {
            const { id: _id, projectId: _p, createdAt: _c, ...input } = pkg;
            const env = await api.olos.handoffs.create(pkg.projectId, input);
            if (env.error) throw new Error(env.error.message);
            const saved = env.data;
            if (!saved) return null;
            set((s) => ({
              byProject: {
                ...s.byProject,
                [saved.projectId]: {
                  ...(s.byProject[saved.projectId] ?? {}),
                  [saved.id]: saved,
                },
              },
            }));
            return saved;
          }
          const {
            id: _id,
            projectId: _p,
            planDecisionRecordId: _pdr,
            createdAt: _c,
            ...patch
          } = pkg;
          const env = await api.olos.handoffs.update(
            pkg.projectId,
            pkg.id,
            patch,
          );
          if (env.error) throw new Error(env.error.message);
          const saved = env.data;
          if (!saved) return null;
          set((s) => ({
            byProject: {
              ...s.byProject,
              [saved.projectId]: {
                ...(s.byProject[saved.projectId] ?? {}),
                [saved.id]: saved,
              },
            },
          }));
          return saved;
        } catch (err) {
          set((s) => ({
            syncByProject: {
              ...s.syncByProject,
              [pkg.projectId]: errorSync(err),
            },
          }));
          throw err;
        }
      },

      pushDelete: async (projectId, packageId) => {
        if (isLocalId(packageId)) return;
        const env = await api.olos.handoffs.delete(projectId, packageId);
        if (env.error) throw new Error(env.error.message);
      },
    }),
    {
      name: PERSIST_KEY,
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useActHandoffPackageStore);

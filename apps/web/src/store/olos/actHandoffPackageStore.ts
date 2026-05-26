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

type PackagesById = Record<string, ActHandoffPackage>;

const PERSIST_KEY = 'ogden-olos-act-handoff-packages';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `ahp-${crypto.randomUUID()}`;
}

interface ActHandoffPackageState {
  byProject: Record<string, PackagesById>;

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
}

export const useActHandoffPackageStore = create<ActHandoffPackageState>()(
  persist(
    (set, get) => ({
      byProject: {},

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
    }),
    {
      name: PERSIST_KEY,
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useActHandoffPackageStore);

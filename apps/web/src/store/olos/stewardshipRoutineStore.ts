/**
 * stewardshipRoutineStore — persisted StewardshipRoutine state per project.
 *
 * Recurring stewardship work that keeps a Domain healthy after the initial
 * Act tasks complete (cadenced inspections, monitoring, light-touch tasks).
 * Many routines per (projectId, domainId). Keyed by routine id.
 *
 * Phase 1.5 ships local persistence; Phase 2.4 layers API sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  StewardshipRoutine,
  StewardshipFrequency,
  UniversalDomain,
} from '@ogden/shared';
import { rehydrateWithLogging } from '../persistRehydrate.js';

type RoutinesById = Record<string, StewardshipRoutine>;

const PERSIST_KEY = 'ogden-olos-stewardship-routines';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `routine-${crypto.randomUUID()}`;
}

interface StewardshipRoutineState {
  byProject: Record<string, RoutinesById>;

  /** Read a routine by id. */
  getRoutine: (
    projectId: string,
    routineId: string,
  ) => StewardshipRoutine | undefined;
  /** List all routines in a project. */
  listForProject: (projectId: string) => StewardshipRoutine[];
  /** Routines bound to a Domain. */
  listForDomain: (
    projectId: string,
    domain: UniversalDomain,
  ) => StewardshipRoutine[];
  /** Create a new routine. */
  createRoutine: (
    projectId: string,
    seed: Omit<StewardshipRoutine, 'id' | 'createdAt' | 'projectId'> &
      Partial<Pick<StewardshipRoutine, 'id' | 'createdAt' | 'updatedAt'>>,
  ) => StewardshipRoutine;
  /** Update a routine. */
  updateRoutine: (
    projectId: string,
    routineId: string,
    patch: Partial<StewardshipRoutine>,
  ) => void;
  /** Set the cadence. */
  setFrequency: (
    projectId: string,
    routineId: string,
    frequency: StewardshipFrequency,
  ) => void;
  /** Delete a routine. */
  deleteRoutine: (projectId: string, routineId: string) => void;
}

export const useStewardshipRoutineStore = create<StewardshipRoutineState>()(
  persist(
    (set, get) => {
      const mutate = (
        projectId: string,
        routineId: string,
        fn: (existing: StewardshipRoutine) => StewardshipRoutine,
      ) => {
        set((s) => {
          const project = s.byProject[projectId];
          const existing = project?.[routineId];
          if (!existing) return s;
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [routineId]: fn(existing),
              },
            },
          };
        });
      };

      return {
        byProject: {},

        getRoutine: (projectId, routineId) =>
          get().byProject[projectId]?.[routineId],

        listForProject: (projectId) =>
          Object.values(get().byProject[projectId] ?? {}),

        listForDomain: (projectId, domain) =>
          Object.values(get().byProject[projectId] ?? {}).filter(
            (r) => r.domainId === domain,
          ),

        createRoutine: (projectId, seed) => {
          const routine: StewardshipRoutine = {
            ...seed,
            id: seed.id ?? newId(),
            projectId,
            createdAt: seed.createdAt ?? now(),
            updatedAt: seed.updatedAt ?? now(),
          };
          set((s) => ({
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...(s.byProject[projectId] ?? {}),
                [routine.id]: routine,
              },
            },
          }));
          return routine;
        },

        updateRoutine: (projectId, routineId, partial) =>
          mutate(projectId, routineId, (existing) => ({
            ...existing,
            ...partial,
            id: existing.id,
            projectId,
            createdAt: existing.createdAt,
            updatedAt: now(),
          })),

        setFrequency: (projectId, routineId, frequency) =>
          mutate(projectId, routineId, (existing) => ({
            ...existing,
            frequency,
            updatedAt: now(),
          })),

        deleteRoutine: (projectId, routineId) =>
          set((s) => {
            const project = s.byProject[projectId];
            if (!project) return s;
            const { [routineId]: _dropped, ...rest } = project;
            return {
              byProject: { ...s.byProject, [projectId]: rest },
            };
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

rehydrateWithLogging(useStewardshipRoutineStore);

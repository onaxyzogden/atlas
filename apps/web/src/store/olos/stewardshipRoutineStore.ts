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
import { api } from '../../lib/apiClient.js';
import {
  initialSync,
  startSync,
  readySync,
  errorSync,
  type SyncState,
} from './syncState.js';

type RoutinesById = Record<string, StewardshipRoutine>;

const PERSIST_KEY = 'ogden-olos-stewardship-routines';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `routine-${crypto.randomUUID()}`;
}

/** Local-only ids are prefixed `routine-…`; server-assigned ids are UUIDs. */
function isLocalId(id: string): boolean {
  return id.startsWith('routine-');
}

interface StewardshipRoutineState {
  byProject: Record<string, RoutinesById>;
  syncByProject: Record<string, SyncState>;

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

  // ── Phase 2.4 API sync ─────────────────────────────────────────────
  /** GET the project's stewardship routines from the API and replace local state. */
  pullAll: (projectId: string) => Promise<void>;
  /** POST (local id) or PATCH (UUID) the routine upstream. */
  pushOne: (
    routine: StewardshipRoutine,
  ) => Promise<StewardshipRoutine | null>;
  /** DELETE the routine on the server. */
  pushDelete: (projectId: string, routineId: string) => Promise<void>;
  /** Read the sync state for a project. */
  getSyncState: (projectId: string) => SyncState;
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
        syncByProject: {},

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

        getSyncState: (projectId) =>
          get().syncByProject[projectId] ?? initialSync(),

        pullAll: async (projectId) => {
          set((s) => ({
            syncByProject: { ...s.syncByProject, [projectId]: startSync() },
          }));
          try {
            const env = await api.olos.stewardshipRoutines.list(projectId);
            if (env.error) throw new Error(env.error.message);
            const records = env.data ?? [];
            const byId: RoutinesById = {};
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

        pushOne: async (routine) => {
          try {
            if (isLocalId(routine.id)) {
              const {
                id: _id,
                projectId: _p,
                createdAt: _c,
                ...input
              } = routine;
              const env = await api.olos.stewardshipRoutines.create(
                routine.projectId,
                input,
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
            }
            const {
              id: _id,
              projectId: _p,
              createdAt: _c,
              ...patch
            } = routine;
            const env = await api.olos.stewardshipRoutines.update(
              routine.projectId,
              routine.id,
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
                [routine.projectId]: errorSync(err),
              },
            }));
            throw err;
          }
        },

        pushDelete: async (projectId, routineId) => {
          if (isLocalId(routineId)) return;
          const env = await api.olos.stewardshipRoutines.delete(
            projectId,
            routineId,
          );
          if (env.error) throw new Error(env.error.message);
        },
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

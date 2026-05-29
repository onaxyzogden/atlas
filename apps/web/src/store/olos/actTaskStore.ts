/**
 * actTaskStore — persisted ActTask state per project.
 *
 * Tasks are derived from an ActHandoffPackage; one package can spawn many
 * tasks. Tasks transition through the ActTaskStatus state machine and
 * accumulate ProofRecords (proofRecordStore.ts) + VerificationRecords
 * (verificationRecordStore.ts). Keyed by task id.
 *
 * Phase 1.5 ships local persistence; Phase 2.4 layers API sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ActTask,
  ActTaskStatus,
  ActTaskPriority,
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

type TasksById = Record<string, ActTask>;

const PERSIST_KEY = 'ogden-olos-act-tasks';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `task-${crypto.randomUUID()}`;
}

/** Local-only ids are prefixed `task-…`; server-assigned ids are UUIDs. */
function isLocalId(id: string): boolean {
  return id.startsWith('task-');
}

interface ActTaskState {
  byProject: Record<string, TasksById>;
  syncByProject: Record<string, SyncState>;

  /** Read one task. */
  getTask: (projectId: string, taskId: string) => ActTask | undefined;
  /** List all tasks in a project. */
  listForProject: (projectId: string) => ActTask[];
  /** Tasks spawned from a single handoff package. */
  listForPackage: (
    projectId: string,
    handoffPackageId: string,
  ) => ActTask[];
  /** Tasks tied to a given objective. */
  listForObjective: (projectId: string, objectiveId: string) => ActTask[];
  /** Tasks assigned to a given user - the "assigned to me" read primitive. */
  listForAssignee: (projectId: string, assigneeId: string) => ActTask[];
  /** Create a new task. */
  createTask: (
    projectId: string,
    seed: Omit<ActTask, 'id' | 'createdAt' | 'projectId'> &
      Partial<Pick<ActTask, 'id' | 'createdAt' | 'updatedAt'>>,
  ) => ActTask;
  /** Update a task. */
  updateTask: (
    projectId: string,
    taskId: string,
    patch: Partial<ActTask>,
  ) => void;
  /** Set just the task status (and timestamp). */
  setStatus: (
    projectId: string,
    taskId: string,
    status: ActTaskStatus,
    blockerReason?: string,
  ) => void;
  /** Set priority. */
  setPriority: (
    projectId: string,
    taskId: string,
    priority: ActTaskPriority,
  ) => void;
  /** Assign a task to an assignee + role. */
  assign: (
    projectId: string,
    taskId: string,
    assigneeId?: string,
    roleId?: string,
  ) => void;
  /** Delete a task. */
  deleteTask: (projectId: string, taskId: string) => void;

  // ── Phase 2.4 API sync ─────────────────────────────────────────────
  /**
   * GET the project's tasks from the API (addressed by serverId) and replace
   * local state. Each server record's projectId is normalised to the LOCAL id.
   */
  pullAll: (projectId: string, serverId: string) => Promise<void>;
  /** POST (local id) or PATCH (UUID) the task upstream. */
  pushOne: (task: ActTask) => Promise<ActTask | null>;
  /** DELETE the task on the server. */
  pushDelete: (projectId: string, taskId: string) => Promise<void>;
  /** Read the sync state for a project. */
  getSyncState: (projectId: string) => SyncState;
}

export const useActTaskStore = create<ActTaskState>()(
  persist(
    (set, get) => {
      const mutate = (
        projectId: string,
        taskId: string,
        fn: (existing: ActTask) => ActTask,
      ) => {
        set((s) => {
          const project = s.byProject[projectId];
          const existing = project?.[taskId];
          if (!existing) return s;
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [taskId]: fn(existing),
              },
            },
          };
        });
      };

      return {
        byProject: {},
        syncByProject: {},

        getTask: (projectId, taskId) => get().byProject[projectId]?.[taskId],

        listForProject: (projectId) =>
          Object.values(get().byProject[projectId] ?? {}),

        listForPackage: (projectId, handoffPackageId) =>
          Object.values(get().byProject[projectId] ?? {}).filter(
            (t) => t.handoffPackageId === handoffPackageId,
          ),

        listForObjective: (projectId, objectiveId) =>
          Object.values(get().byProject[projectId] ?? {}).filter(
            (t) => t.objectiveId === objectiveId,
          ),

        listForAssignee: (projectId, assigneeId) =>
          Object.values(get().byProject[projectId] ?? {}).filter(
            (t) => t.assigneeId === assigneeId,
          ),

        createTask: (projectId, seed) => {
          const task: ActTask = {
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
                [task.id]: task,
              },
            },
          }));
          return task;
        },

        updateTask: (projectId, taskId, partial) =>
          mutate(projectId, taskId, (existing) => ({
            ...existing,
            ...partial,
            id: existing.id,
            projectId,
            createdAt: existing.createdAt,
            updatedAt: now(),
          })),

        setStatus: (projectId, taskId, status, blockerReason) =>
          mutate(projectId, taskId, (existing) => ({
            ...existing,
            status,
            blockerReason:
              status === 'blocked' || status === 'paused-for-conditions'
                ? blockerReason ?? existing.blockerReason
                : undefined,
            updatedAt: now(),
          })),

        setPriority: (projectId, taskId, priority) =>
          mutate(projectId, taskId, (existing) => ({
            ...existing,
            priority,
            updatedAt: now(),
          })),

        assign: (projectId, taskId, assigneeId, roleId) =>
          mutate(projectId, taskId, (existing) => ({
            ...existing,
            assigneeId,
            roleId,
            status:
              existing.status === 'ready' && (assigneeId || roleId)
                ? 'assigned'
                : existing.status,
            updatedAt: now(),
          })),

        deleteTask: (projectId, taskId) =>
          set((s) => {
            const project = s.byProject[projectId];
            if (!project) return s;
            const { [taskId]: _dropped, ...rest } = project;
            return {
              byProject: { ...s.byProject, [projectId]: rest },
            };
          }),

        getSyncState: (projectId) =>
          get().syncByProject[projectId] ?? initialSync(),

        pullAll: async (projectId, serverId) => {
          set((s) => ({
            syncByProject: { ...s.syncByProject, [projectId]: startSync() },
          }));
          try {
            const env = await api.olos.tasks.list(serverId);
            if (env.error) throw new Error(env.error.message);
            const records = env.data ?? [];
            const byId: TasksById = {};
            // Normalise the server record's projectId to the LOCAL id: the OLOS
            // UI flow keys every store by local projectId; only the API speaks
            // serverId. Without this the store would hold server-keyed records
            // that no UI surface can find.
            for (const r of records) byId[r.id] = { ...r, projectId };
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

        pushOne: async (task) => {
          try {
            if (isLocalId(task.id)) {
              const { id: _id, projectId: _p, createdAt: _c, ...input } = task;
              const env = await api.olos.tasks.create(task.projectId, input);
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
              handoffPackageId: _h,
              createdAt: _c,
              ...patch
            } = task;
            const env = await api.olos.tasks.update(
              task.projectId,
              task.id,
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
                [task.projectId]: errorSync(err),
              },
            }));
            throw err;
          }
        },

        pushDelete: async (projectId, taskId) => {
          if (isLocalId(taskId)) return;
          const env = await api.olos.tasks.delete(projectId, taskId);
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

rehydrateWithLogging(useActTaskStore);

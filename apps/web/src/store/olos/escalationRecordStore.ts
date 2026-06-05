/**
 * escalationRecordStore — persisted EscalationRecord state per project.
 *
 * Escalations are the feedback loop from Act back to Observe / Plan /
 * Risk / Monitoring when a task surfaces a new condition, scope change,
 * incident, or monitoring signal. Routed to a Stage (+ optional Domain).
 * Keyed by escalation id.
 *
 * Phase 1.5 ships local persistence; Phase 2.4 layers API sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  EscalationRecord,
  EscalationStatus,
  Stage,
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

type EscalationsById = Record<string, EscalationRecord>;

const PERSIST_KEY = 'ogden-olos-escalation-records';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `esc-${crypto.randomUUID()}`;
}

/** Local-only ids are prefixed `esc-…`; server-assigned ids are UUIDs. */
function isLocalId(id: string): boolean {
  return id.startsWith('esc-');
}

interface EscalationRecordState {
  byProject: Record<string, EscalationsById>;
  syncByProject: Record<string, SyncState>;

  /** Read an escalation by id. */
  getEscalation: (
    projectId: string,
    escalationId: string,
  ) => EscalationRecord | undefined;
  /** List all escalations in a project. */
  listForProject: (projectId: string) => EscalationRecord[];
  /** Escalations raised from a specific task. */
  listForTask: (projectId: string, taskId: string) => EscalationRecord[];
  /** Open escalations routed to a Stage. */
  listOpenForStage: (
    projectId: string,
    stage: Stage,
    domain?: UniversalDomain,
  ) => EscalationRecord[];
  /** Create a new escalation. */
  createEscalation: (
    projectId: string,
    seed: Omit<EscalationRecord, 'id' | 'raisedAt' | 'projectId'> &
      Partial<Pick<EscalationRecord, 'id' | 'raisedAt'>>,
  ) => EscalationRecord;
  /** Update an escalation. */
  updateEscalation: (
    projectId: string,
    escalationId: string,
    patch: Partial<EscalationRecord>,
  ) => void;
  /** Set the escalation status; records resolvedAt when transitioning to
   *  resolved or dismissed. */
  setStatus: (
    projectId: string,
    escalationId: string,
    status: EscalationStatus,
    resolutionNote?: string,
  ) => void;
  /** Delete an escalation. */
  deleteEscalation: (projectId: string, escalationId: string) => void;

  // ── Phase 2.4 API sync ─────────────────────────────────────────────
  /** GET the project's escalations from the API and replace local state. */
  pullAll: (projectId: string) => Promise<void>;
  /** POST (local id) or PATCH (UUID) the escalation upstream. */
  pushOne: (
    escalation: EscalationRecord,
  ) => Promise<EscalationRecord | null>;
  /** DELETE the escalation on the server. */
  pushDelete: (
    projectId: string,
    escalationId: string,
  ) => Promise<void>;
  /** Read the sync state for a project. */
  getSyncState: (projectId: string) => SyncState;
}

export const useEscalationRecordStore = create<EscalationRecordState>()(
  persist(
    (set, get) => {
      const mutate = (
        projectId: string,
        escalationId: string,
        fn: (existing: EscalationRecord) => EscalationRecord,
      ) => {
        set((s) => {
          const project = s.byProject[projectId];
          const existing = project?.[escalationId];
          if (!existing) return s;
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [escalationId]: fn(existing),
              },
            },
          };
        });
      };

      return {
        byProject: {},
        syncByProject: {},

        getEscalation: (projectId, escalationId) =>
          get().byProject[projectId]?.[escalationId],

        listForProject: (projectId) =>
          Object.values(get().byProject[projectId] ?? {}),

        listForTask: (projectId, taskId) =>
          Object.values(get().byProject[projectId] ?? {}).filter(
            (e) => e.taskId === taskId,
          ),

        listOpenForStage: (projectId, stage, domain) =>
          Object.values(get().byProject[projectId] ?? {}).filter((e) => {
            if (e.routedToStage !== stage) return false;
            if (domain && e.routedToDomain !== domain) return false;
            return e.status === 'open' || e.status === 'acknowledged';
          }),

        createEscalation: (projectId, seed) => {
          const record: EscalationRecord = {
            ...seed,
            id: seed.id ?? newId(),
            projectId,
            raisedAt: seed.raisedAt ?? now(),
          };
          set((s) => ({
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...(s.byProject[projectId] ?? {}),
                [record.id]: record,
              },
            },
          }));
          return record;
        },

        updateEscalation: (projectId, escalationId, partial) =>
          mutate(projectId, escalationId, (existing) => ({
            ...existing,
            ...partial,
            id: existing.id,
            projectId,
            raisedAt: existing.raisedAt,
          })),

        setStatus: (projectId, escalationId, status, resolutionNote) =>
          mutate(projectId, escalationId, (existing) => ({
            ...existing,
            status,
            resolvedAt:
              status === 'resolved' || status === 'dismissed'
                ? existing.resolvedAt ?? now()
                : existing.resolvedAt,
            resolutionNote: resolutionNote ?? existing.resolutionNote,
          })),

        deleteEscalation: (projectId, escalationId) =>
          set((s) => {
            const project = s.byProject[projectId];
            if (!project) return s;
            const { [escalationId]: _dropped, ...rest } = project;
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
            const env = await api.olos.escalations.list(projectId);
            if (env.error) throw new Error(env.error.message);
            const records = env.data ?? [];
            const byId: EscalationsById = {};
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

        pushOne: async (escalation) => {
          try {
            if (isLocalId(escalation.id)) {
              const {
                id: _id,
                projectId: _p,
                raisedAt: _r,
                ...input
              } = escalation;
              const env = await api.olos.escalations.create(
                escalation.projectId,
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
              raisedAt: _r,
              ...patch
            } = escalation;
            const env = await api.olos.escalations.update(
              escalation.projectId,
              escalation.id,
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
                [escalation.projectId]: errorSync(err),
              },
            }));
            throw err;
          }
        },

        pushDelete: async (projectId, escalationId) => {
          if (isLocalId(escalationId)) return;
          const env = await api.olos.escalations.delete(
            projectId,
            escalationId,
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

rehydrateWithLogging(useEscalationRecordStore);

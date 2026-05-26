/**
 * verificationRecordStore — persisted VerificationRecord state per project.
 *
 * A verifier inspects an ActTask + its ProofRecords and issues a
 * VerificationRecord with pass / fail / partial / needs-rework. Multiple
 * verifications can attach to one task (re-verification after rework).
 * Keyed by verification id.
 *
 * Phase 1.5 ships local persistence; Phase 2.4 layers API sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  VerificationRecord,
  VerificationOutcome,
  VerificationCriterionResult,
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

type VerificationsById = Record<string, VerificationRecord>;

const PERSIST_KEY = 'ogden-olos-verification-records';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `verify-${crypto.randomUUID()}`;
}

/** Local-only ids are prefixed `verify-…`; server-assigned ids are UUIDs. */
function isLocalId(id: string): boolean {
  return id.startsWith('verify-');
}

interface VerificationRecordState {
  byProject: Record<string, VerificationsById>;
  syncByProject: Record<string, SyncState>;

  /** Read a verification by id. */
  getVerification: (
    projectId: string,
    verificationId: string,
  ) => VerificationRecord | undefined;
  /** List all verifications in a project. */
  listForProject: (projectId: string) => VerificationRecord[];
  /** Verifications attached to a specific task. */
  listForTask: (projectId: string, taskId: string) => VerificationRecord[];
  /** Create a new verification. */
  createVerification: (
    projectId: string,
    seed: Omit<VerificationRecord, 'id' | 'verifiedAt' | 'projectId'> &
      Partial<Pick<VerificationRecord, 'id' | 'verifiedAt'>>,
  ) => VerificationRecord;
  /** Update a verification (e.g., to attach a new criterion result). */
  updateVerification: (
    projectId: string,
    verificationId: string,
    patch: Partial<VerificationRecord>,
  ) => void;
  /** Append a criterion result. */
  addCriterionResult: (
    projectId: string,
    verificationId: string,
    criterion: VerificationCriterionResult,
  ) => void;
  /** Set the verification outcome. */
  setOutcome: (
    projectId: string,
    verificationId: string,
    outcome: VerificationOutcome,
  ) => void;
  /** Delete a verification. */
  deleteVerification: (projectId: string, verificationId: string) => void;

  // ── Phase 2.4 API sync ─────────────────────────────────────────────
  /** GET the verifications for a single task and merge into local state.
   *  Verifications are scoped under their task on the server, so there is
   *  no project-wide pull. */
  pullForTask: (projectId: string, taskId: string) => Promise<void>;
  /** POST (local id) or PATCH (UUID) the verification upstream. */
  pushOne: (
    verification: VerificationRecord,
  ) => Promise<VerificationRecord | null>;
  /** DELETE the verification on the server. */
  pushDelete: (
    projectId: string,
    taskId: string,
    verificationId: string,
  ) => Promise<void>;
  /** Read the sync state for a project. */
  getSyncState: (projectId: string) => SyncState;
}

export const useVerificationRecordStore = create<VerificationRecordState>()(
  persist(
    (set, get) => {
      const mutate = (
        projectId: string,
        verificationId: string,
        fn: (existing: VerificationRecord) => VerificationRecord,
      ) => {
        set((s) => {
          const project = s.byProject[projectId];
          const existing = project?.[verificationId];
          if (!existing) return s;
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [verificationId]: fn(existing),
              },
            },
          };
        });
      };

      return {
        byProject: {},
        syncByProject: {},

        getVerification: (projectId, verificationId) =>
          get().byProject[projectId]?.[verificationId],

        listForProject: (projectId) =>
          Object.values(get().byProject[projectId] ?? {}),

        listForTask: (projectId, taskId) =>
          Object.values(get().byProject[projectId] ?? {}).filter(
            (v) => v.taskId === taskId,
          ),

        createVerification: (projectId, seed) => {
          const verification: VerificationRecord = {
            ...seed,
            id: seed.id ?? newId(),
            projectId,
            verifiedAt: seed.verifiedAt ?? now(),
          };
          set((s) => ({
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...(s.byProject[projectId] ?? {}),
                [verification.id]: verification,
              },
            },
          }));
          return verification;
        },

        updateVerification: (projectId, verificationId, partial) =>
          mutate(projectId, verificationId, (existing) => ({
            ...existing,
            ...partial,
            id: existing.id,
            projectId,
            verifiedAt: existing.verifiedAt,
          })),

        addCriterionResult: (projectId, verificationId, criterion) =>
          mutate(projectId, verificationId, (existing) => ({
            ...existing,
            criteriaChecked: [...existing.criteriaChecked, criterion],
          })),

        setOutcome: (projectId, verificationId, outcome) =>
          mutate(projectId, verificationId, (existing) => ({
            ...existing,
            outcome,
          })),

        deleteVerification: (projectId, verificationId) =>
          set((s) => {
            const project = s.byProject[projectId];
            if (!project) return s;
            const { [verificationId]: _dropped, ...rest } = project;
            return {
              byProject: { ...s.byProject, [projectId]: rest },
            };
          }),

        getSyncState: (projectId) =>
          get().syncByProject[projectId] ?? initialSync(),

        pullForTask: async (projectId, taskId) => {
          set((s) => ({
            syncByProject: { ...s.syncByProject, [projectId]: startSync() },
          }));
          try {
            const env = await api.olos.verifications.list(projectId, taskId);
            if (env.error) throw new Error(env.error.message);
            const records = env.data ?? [];
            set((s) => {
              const merged: VerificationsById = {
                ...(s.byProject[projectId] ?? {}),
              };
              for (const existing of Object.values(merged)) {
                if (existing.taskId === taskId) delete merged[existing.id];
              }
              for (const r of records) merged[r.id] = r;
              return {
                byProject: { ...s.byProject, [projectId]: merged },
                syncByProject: {
                  ...s.syncByProject,
                  [projectId]: readySync(),
                },
              };
            });
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

        pushOne: async (verification) => {
          try {
            if (isLocalId(verification.id)) {
              const {
                id: _id,
                projectId: _p,
                taskId: _t,
                verifiedAt: _v,
                ...input
              } = verification;
              const env = await api.olos.verifications.create(
                verification.projectId,
                verification.taskId,
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
              taskId: _t,
              ...patch
            } = verification;
            const env = await api.olos.verifications.update(
              verification.projectId,
              verification.taskId,
              verification.id,
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
                [verification.projectId]: errorSync(err),
              },
            }));
            throw err;
          }
        },

        pushDelete: async (projectId, taskId, verificationId) => {
          if (isLocalId(verificationId)) return;
          const env = await api.olos.verifications.delete(
            projectId,
            taskId,
            verificationId,
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

rehydrateWithLogging(useVerificationRecordStore);

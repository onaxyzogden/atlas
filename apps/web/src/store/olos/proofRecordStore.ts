/**
 * proofRecordStore — persisted ProofRecord state per project.
 *
 * A worker can submit multiple ProofRecords against a single ActTask. The
 * record carries a proofType (photo / measurement / note / receipt /
 * inspection / test / signature / before-after / video / document), an
 * optional fileUri / note / measurement value, an optional geotag, and the
 * verification status the verifier sets via VerificationRecord
 * (verificationRecordStore.ts). Keyed by proof id.
 *
 * Phase 1.5 ships local persistence; Phase 2.4 layers API sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ProofRecord,
  ProofVerificationStatus,
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

type ProofsById = Record<string, ProofRecord>;

const PERSIST_KEY = 'ogden-olos-proof-records';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `proof-${crypto.randomUUID()}`;
}

/** Local-only ids are prefixed `proof-…`; server-assigned ids are UUIDs. */
function isLocalId(id: string): boolean {
  return id.startsWith('proof-');
}

interface ProofRecordState {
  byProject: Record<string, ProofsById>;
  syncByProject: Record<string, SyncState>;

  /** Read a proof by id. */
  getProof: (projectId: string, proofId: string) => ProofRecord | undefined;
  /** List all proofs in a project. */
  listForProject: (projectId: string) => ProofRecord[];
  /** Proofs attached to a specific task. */
  listForTask: (projectId: string, taskId: string) => ProofRecord[];
  /** Create a new proof. */
  createProof: (
    projectId: string,
    seed: Omit<ProofRecord, 'id' | 'capturedAt' | 'projectId'> &
      Partial<Pick<ProofRecord, 'id' | 'capturedAt'>>,
  ) => ProofRecord;
  /** Update a proof. */
  updateProof: (
    projectId: string,
    proofId: string,
    patch: Partial<ProofRecord>,
  ) => void;
  /** Set just the verification status. */
  setVerificationStatus: (
    projectId: string,
    proofId: string,
    status: ProofVerificationStatus,
  ) => void;
  /** Delete a proof. */
  deleteProof: (projectId: string, proofId: string) => void;

  // ── Phase 2.4 API sync ─────────────────────────────────────────────
  /** GET the proofs for a single task and merge into local state. Proofs
   *  are scoped under their task on the server, so there is no project-wide
   *  pull; the caller pulls each task's proofs as needed. */
  pullForTask: (projectId: string, taskId: string) => Promise<void>;
  /** POST (local id) or PATCH (UUID) the proof upstream. */
  pushOne: (proof: ProofRecord) => Promise<ProofRecord | null>;
  /** DELETE the proof on the server. */
  pushDelete: (
    projectId: string,
    taskId: string,
    proofId: string,
  ) => Promise<void>;
  /** Read the sync state for a project. */
  getSyncState: (projectId: string) => SyncState;
}

export const useProofRecordStore = create<ProofRecordState>()(
  persist(
    (set, get) => {
      const mutate = (
        projectId: string,
        proofId: string,
        fn: (existing: ProofRecord) => ProofRecord,
      ) => {
        set((s) => {
          const project = s.byProject[projectId];
          const existing = project?.[proofId];
          if (!existing) return s;
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [proofId]: fn(existing),
              },
            },
          };
        });
      };

      return {
        byProject: {},
        syncByProject: {},

        getProof: (projectId, proofId) =>
          get().byProject[projectId]?.[proofId],

        listForProject: (projectId) =>
          Object.values(get().byProject[projectId] ?? {}),

        listForTask: (projectId, taskId) =>
          Object.values(get().byProject[projectId] ?? {}).filter(
            (p) => p.taskId === taskId,
          ),

        createProof: (projectId, seed) => {
          const proof: ProofRecord = {
            ...seed,
            id: seed.id ?? newId(),
            projectId,
            capturedAt: seed.capturedAt ?? now(),
          };
          set((s) => ({
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...(s.byProject[projectId] ?? {}),
                [proof.id]: proof,
              },
            },
          }));
          return proof;
        },

        updateProof: (projectId, proofId, partial) =>
          mutate(projectId, proofId, (existing) => ({
            ...existing,
            ...partial,
            id: existing.id,
            projectId,
            capturedAt: existing.capturedAt,
          })),

        setVerificationStatus: (projectId, proofId, status) =>
          mutate(projectId, proofId, (existing) => ({
            ...existing,
            verificationStatus: status,
          })),

        deleteProof: (projectId, proofId) =>
          set((s) => {
            const project = s.byProject[projectId];
            if (!project) return s;
            const { [proofId]: _dropped, ...rest } = project;
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
            const env = await api.olos.proofs.list(projectId, taskId);
            if (env.error) throw new Error(env.error.message);
            const records = env.data ?? [];
            set((s) => {
              const merged: ProofsById = { ...(s.byProject[projectId] ?? {}) };
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

        pushOne: async (proof) => {
          try {
            if (isLocalId(proof.id)) {
              const {
                id: _id,
                projectId: _p,
                taskId: _t,
                capturedAt: _c,
                ...input
              } = proof;
              const env = await api.olos.proofs.create(
                proof.projectId,
                proof.taskId,
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
            } = proof;
            const env = await api.olos.proofs.update(
              proof.projectId,
              proof.taskId,
              proof.id,
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
                [proof.projectId]: errorSync(err),
              },
            }));
            throw err;
          }
        },

        pushDelete: async (projectId, taskId, proofId) => {
          if (isLocalId(proofId)) return;
          const env = await api.olos.proofs.delete(projectId, taskId, proofId);
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

rehydrateWithLogging(useProofRecordStore);

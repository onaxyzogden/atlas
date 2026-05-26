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

type ProofsById = Record<string, ProofRecord>;

const PERSIST_KEY = 'ogden-olos-proof-records';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `proof-${crypto.randomUUID()}`;
}

interface ProofRecordState {
  byProject: Record<string, ProofsById>;

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

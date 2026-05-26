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

type VerificationsById = Record<string, VerificationRecord>;

const PERSIST_KEY = 'ogden-olos-verification-records';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `verify-${crypto.randomUUID()}`;
}

interface VerificationRecordState {
  byProject: Record<string, VerificationsById>;

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

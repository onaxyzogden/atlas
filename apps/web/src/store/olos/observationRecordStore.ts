/**
 * observationRecordStore — persisted ObservationRecord state per project.
 *
 * One canonical ObservationRecord per (projectId, objectiveId) — Observe
 * objectives carry a single record that the steward iterates on until the
 * status is set and the Plan handoff fires. Keyed
 * `byProject[projectId][objectiveId]` for O(1) lookup from the
 * ObjectiveWorkspace.
 *
 * The catalogue (universal Objectives + checklist text) lives in
 * @ogden/shared/constants/olos; this store only owns the *mutable* slice
 * the steward produces while working.
 *
 * Phase 1.5 ships local persistence; Phase 2.4 layers API sync on top
 * via a one-way `sync(projectId)` action.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ObservationRecord,
  ObservationEvidenceRef,
  ObserveStatus,
} from '@ogden/shared';
import { rehydrateWithLogging } from '../persistRehydrate.js';

type RecordsByObjective = Record<string, ObservationRecord>;

const PERSIST_KEY = 'ogden-olos-observation-records';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `obs-${crypto.randomUUID()}`;
}

interface ObservationRecordState {
  byProject: Record<string, RecordsByObjective>;

  /** Read one record by (projectId, objectiveId), or undefined. */
  getRecord: (
    projectId: string,
    objectiveId: string,
  ) => ObservationRecord | undefined;
  /** List all records in a project. */
  listForProject: (projectId: string) => ObservationRecord[];
  /** Upsert a record for (projectId, objectiveId). */
  upsertRecord: (
    projectId: string,
    objectiveId: string,
    patch: Partial<ObservationRecord>,
  ) => ObservationRecord;
  /** Set just the status, creating a fresh record if none exists. */
  setStatus: (
    projectId: string,
    objectiveId: string,
    status: ObserveStatus,
  ) => void;
  /** Set the summary note. */
  setSummary: (
    projectId: string,
    objectiveId: string,
    summary: string,
  ) => void;
  /** Set constraints / unknowns / flags. */
  setNarrative: (
    projectId: string,
    objectiveId: string,
    fields: Partial<
      Pick<ObservationRecord, 'constraints' | 'unknowns' | 'flags'>
    >,
  ) => void;
  /** Append an evidence ref. */
  addEvidence: (
    projectId: string,
    objectiveId: string,
    evidence: Omit<ObservationEvidenceRef, 'id' | 'capturedAt'> &
      Partial<Pick<ObservationEvidenceRef, 'capturedAt'>>,
  ) => void;
  /** Remove one evidence ref by id. */
  removeEvidence: (
    projectId: string,
    objectiveId: string,
    evidenceId: string,
  ) => void;
  /** Delete the record for (projectId, objectiveId). */
  deleteRecord: (projectId: string, objectiveId: string) => void;
}

function createBase(
  projectId: string,
  objectiveId: string,
  status: ObserveStatus,
): ObservationRecord {
  return {
    id: newId(),
    projectId,
    objectiveId,
    status,
    summary: '',
    constraints: '',
    unknowns: '',
    flags: [],
    evidenceRefs: [],
    recordedAt: now(),
  };
}

export const useObservationRecordStore = create<ObservationRecordState>()(
  persist(
    (set, get) => {
      const patch = (
        projectId: string,
        objectiveId: string,
        fn: (existing: ObservationRecord) => ObservationRecord,
        defaultStatus: ObserveStatus = 'unknown',
      ): ObservationRecord => {
        const current =
          get().byProject[projectId]?.[objectiveId] ??
          createBase(projectId, objectiveId, defaultStatus);
        const next = fn(current);
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: {
              ...(s.byProject[projectId] ?? {}),
              [objectiveId]: next,
            },
          },
        }));
        return next;
      };

      return {
        byProject: {},

        getRecord: (projectId, objectiveId) =>
          get().byProject[projectId]?.[objectiveId],

        listForProject: (projectId) =>
          Object.values(get().byProject[projectId] ?? {}),

        upsertRecord: (projectId, objectiveId, partial) =>
          patch(projectId, objectiveId, (existing) => ({
            ...existing,
            ...partial,
            id: partial.id ?? existing.id,
            projectId,
            objectiveId,
            recordedAt: existing.recordedAt,
          })),

        setStatus: (projectId, objectiveId, status) => {
          patch(
            projectId,
            objectiveId,
            (existing) => ({ ...existing, status }),
            status,
          );
        },

        setSummary: (projectId, objectiveId, summary) => {
          patch(projectId, objectiveId, (existing) => ({
            ...existing,
            summary,
          }));
        },

        setNarrative: (projectId, objectiveId, fields) => {
          patch(projectId, objectiveId, (existing) => ({
            ...existing,
            ...fields,
          }));
        },

        addEvidence: (projectId, objectiveId, evidence) => {
          patch(projectId, objectiveId, (existing) => ({
            ...existing,
            evidenceRefs: [
              ...existing.evidenceRefs,
              {
                ...evidence,
                id: `ev-${crypto.randomUUID()}`,
                capturedAt: evidence.capturedAt ?? now(),
              },
            ],
          }));
        },

        removeEvidence: (projectId, objectiveId, evidenceId) => {
          patch(projectId, objectiveId, (existing) => ({
            ...existing,
            evidenceRefs: existing.evidenceRefs.filter(
              (e) => e.id !== evidenceId,
            ),
          }));
        },

        deleteRecord: (projectId, objectiveId) =>
          set((s) => {
            const project = s.byProject[projectId];
            if (!project) return s;
            const { [objectiveId]: _dropped, ...rest } = project;
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

rehydrateWithLogging(useObservationRecordStore);

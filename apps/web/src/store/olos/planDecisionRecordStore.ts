/**
 * planDecisionRecordStore — persisted PlanDecisionRecord state per project.
 *
 * One canonical PlanDecisionRecord per (projectId, objectiveId) — Plan
 * objectives carry a single decision that the steward iterates until the
 * approval status reaches an Act-emitting state (approved-for-act or
 * conditionally-approved). Keyed `byProject[projectId][objectiveId]`.
 *
 * Phase 1.5 ships local persistence; Phase 2.4 layers API sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PlanDecisionRecord,
  PlanDecisionOption,
  PlanRiskFlag,
  PlanApprovalStatus,
} from '@ogden/shared';
import { rehydrateWithLogging } from '../persistRehydrate.js';

type RecordsByObjective = Record<string, PlanDecisionRecord>;

const PERSIST_KEY = 'ogden-olos-plan-decision-records';

function now(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function placeholderOption(): PlanDecisionOption {
  return {
    id: newId('opt'),
    label: 'Untitled option',
    rationale: '',
    pros: [],
    cons: [],
  };
}

interface PlanDecisionRecordState {
  byProject: Record<string, RecordsByObjective>;

  /** Read one record by (projectId, objectiveId), or undefined. */
  getRecord: (
    projectId: string,
    objectiveId: string,
  ) => PlanDecisionRecord | undefined;
  /** List all records in a project. */
  listForProject: (projectId: string) => PlanDecisionRecord[];
  /** Upsert a record for (projectId, objectiveId). */
  upsertRecord: (
    projectId: string,
    objectiveId: string,
    patch: Partial<PlanDecisionRecord>,
  ) => PlanDecisionRecord;
  /** Set just the approval status. */
  setApprovalStatus: (
    projectId: string,
    objectiveId: string,
    status: PlanApprovalStatus,
  ) => void;
  /** Replace the selected option. */
  setSelectedOption: (
    projectId: string,
    objectiveId: string,
    option: PlanDecisionOption,
  ) => void;
  /** Append a rejected option. */
  addRejectedOption: (
    projectId: string,
    objectiveId: string,
    option: PlanDecisionOption,
  ) => void;
  /** Set narrative fields (rationale, assumptions, constraints, dependencies). */
  setNarrative: (
    projectId: string,
    objectiveId: string,
    fields: Partial<
      Pick<
        PlanDecisionRecord,
        'rationale' | 'assumptions' | 'constraints' | 'dependencies'
      >
    >,
  ) => void;
  /** Append a risk flag. */
  addRiskFlag: (
    projectId: string,
    objectiveId: string,
    flag: Omit<PlanRiskFlag, 'id'> & Partial<Pick<PlanRiskFlag, 'id'>>,
  ) => void;
  /** Remove a risk flag by id. */
  removeRiskFlag: (
    projectId: string,
    objectiveId: string,
    riskFlagId: string,
  ) => void;
  /** Bind upstream ObservationRecord ids that this decision relies on. */
  setUpstreamObservationRecordIds: (
    projectId: string,
    objectiveId: string,
    ids: readonly string[],
  ) => void;
  /** Delete the record. */
  deleteRecord: (projectId: string, objectiveId: string) => void;
}

function createBase(
  projectId: string,
  objectiveId: string,
  approvalStatus: PlanApprovalStatus,
): PlanDecisionRecord {
  return {
    id: newId('pdr'),
    projectId,
    objectiveId,
    selectedOption: placeholderOption(),
    rejectedOptions: [],
    rationale: '',
    assumptions: [],
    constraints: [],
    dependencies: [],
    riskFlags: [],
    upstreamObservationRecordIds: [],
    approvalStatus,
    decidedAt: now(),
  };
}

export const usePlanDecisionRecordStore = create<PlanDecisionRecordState>()(
  persist(
    (set, get) => {
      const patch = (
        projectId: string,
        objectiveId: string,
        fn: (existing: PlanDecisionRecord) => PlanDecisionRecord,
        defaultStatus: PlanApprovalStatus = 'deferred',
      ): PlanDecisionRecord => {
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
            decidedAt: existing.decidedAt,
          })),

        setApprovalStatus: (projectId, objectiveId, status) => {
          patch(
            projectId,
            objectiveId,
            (existing) => ({ ...existing, approvalStatus: status }),
            status,
          );
        },

        setSelectedOption: (projectId, objectiveId, option) => {
          patch(projectId, objectiveId, (existing) => ({
            ...existing,
            selectedOption: option,
          }));
        },

        addRejectedOption: (projectId, objectiveId, option) => {
          patch(projectId, objectiveId, (existing) => ({
            ...existing,
            rejectedOptions: [...existing.rejectedOptions, option],
          }));
        },

        setNarrative: (projectId, objectiveId, fields) => {
          patch(projectId, objectiveId, (existing) => ({
            ...existing,
            ...fields,
          }));
        },

        addRiskFlag: (projectId, objectiveId, flag) => {
          patch(projectId, objectiveId, (existing) => ({
            ...existing,
            riskFlags: [
              ...existing.riskFlags,
              {
                ...flag,
                id: flag.id ?? newId('rf'),
              },
            ],
          }));
        },

        removeRiskFlag: (projectId, objectiveId, riskFlagId) => {
          patch(projectId, objectiveId, (existing) => ({
            ...existing,
            riskFlags: existing.riskFlags.filter((f) => f.id !== riskFlagId),
          }));
        },

        setUpstreamObservationRecordIds: (projectId, objectiveId, ids) => {
          patch(projectId, objectiveId, (existing) => ({
            ...existing,
            upstreamObservationRecordIds: [...ids],
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

rehydrateWithLogging(usePlanDecisionRecordStore);

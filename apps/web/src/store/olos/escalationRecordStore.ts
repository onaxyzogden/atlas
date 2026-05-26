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

type EscalationsById = Record<string, EscalationRecord>;

const PERSIST_KEY = 'ogden-olos-escalation-records';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `esc-${crypto.randomUUID()}`;
}

interface EscalationRecordState {
  byProject: Record<string, EscalationsById>;

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

/**
 * stakeholderRegisterStore - persisted project-level stakeholder register.
 *
 * The Act Tier-0 stakeholders surface (s1-stakeholders, items c1-c6) is the
 * first capture surface whose state is a project-level SHARED register rather
 * than per-item FormValue: builder items (c1/c2/c4) add rows, the cultural item
 * (c3) adds Indigenous/cultural rows, and annotate items (c5/c6) update fields
 * on existing rows. All six items read/write this one register, keyed by
 * stakeholder id under byProject[projectId].
 *
 * Mirrors proofRecordStore's shape and `mutate` helper, MINUS API sync
 * (local-only this pass). Production code may use crypto.randomUUID() /
 * new Date().toISOString() (the Date.now()/Math.random() ban is scripts-only).
 *
 * Reconciled with the operator's olos_stakeholders_mixed_surface.html mockup
 * (Phase C Part 3, sub-project 2): RelationshipStatus carries the mockup's five
 * qualities (incl. 'tension'); comms channels are MULTI-select per stakeholder
 * (commsChannels: string[]); the Indigenous/cultural item (c3) records a
 * single-select status + notes as a per-item completion marker (in
 * StakeholderCapture), NOT register rows -- so this store no longer creates
 * cultural rows. The legacy single commsChannel string is migrated to the
 * array at persist version 2.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';

export type StakeholderType =
  | 'neighbour'
  | 'authority'
  | 'community'
  | 'indigenous'
  | 'other';

export type RelationshipStatus =
  | 'conflict'
  | 'tension'
  | 'neutral'
  | 'goodwill'
  | 'partnership';

export interface StakeholderRecord {
  id: string;
  projectId: string;
  name: string;
  type: StakeholderType | '';
  role: string;
  contactMethod?: string;
  contactDetail?: string;
  isIndigenousOrCultural?: boolean;
  culturalContext?: string;
  /** c5 annotate: a single relationship quality per stakeholder. */
  relationshipStatus?: RelationshipStatus;
  /** c6 annotate: zero or more preferred communication channels. */
  commsChannels?: string[];
  notes?: string;
  createdAt: string;
}

/** Stable frozen empty register used by reactive selectors to avoid
 *  returning a fresh object each render (Zustand v5 snapshot stability). */
export const EMPTY_STAKEHOLDERS_BY_ID: Readonly<Record<string, StakeholderRecord>> =
  Object.freeze({});

type StakeholdersById = Record<string, StakeholderRecord>;

const PERSIST_KEY = 'ogden-stakeholder-register';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `stakeholder-${crypto.randomUUID()}`;
}

interface StakeholderRegisterState {
  byProject: Record<string, StakeholdersById>;

  /** Read one stakeholder by id. */
  getStakeholder: (
    projectId: string,
    stakeholderId: string,
  ) => StakeholderRecord | undefined;
  /** List all stakeholders in a project. */
  listForProject: (projectId: string) => StakeholderRecord[];
  /** Create a new stakeholder row. */
  createStakeholder: (
    projectId: string,
    seed: Omit<StakeholderRecord, 'id' | 'createdAt' | 'projectId'> &
      Partial<Pick<StakeholderRecord, 'id' | 'createdAt'>>,
  ) => StakeholderRecord;
  /** Patch an existing stakeholder (id/projectId/createdAt are preserved). */
  updateStakeholder: (
    projectId: string,
    stakeholderId: string,
    patch: Partial<StakeholderRecord>,
  ) => void;
  /** Delete a stakeholder row. */
  deleteStakeholder: (projectId: string, stakeholderId: string) => void;
}

export const useStakeholderRegisterStore = create<StakeholderRegisterState>()(
  persist(
    (set, get) => {
      const mutate = (
        projectId: string,
        stakeholderId: string,
        fn: (existing: StakeholderRecord) => StakeholderRecord,
      ) => {
        set((s) => {
          const project = s.byProject[projectId];
          const existing = project?.[stakeholderId];
          if (!existing) return s;
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [stakeholderId]: fn(existing),
              },
            },
          };
        });
      };

      return {
        byProject: {},

        getStakeholder: (projectId, stakeholderId) =>
          get().byProject[projectId]?.[stakeholderId],

        listForProject: (projectId) =>
          Object.values(get().byProject[projectId] ?? {}),

        createStakeholder: (projectId, seed) => {
          const record: StakeholderRecord = {
            ...seed,
            id: seed.id ?? newId(),
            projectId,
            createdAt: seed.createdAt ?? now(),
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

        updateStakeholder: (projectId, stakeholderId, patch) =>
          mutate(projectId, stakeholderId, (existing) => ({
            ...existing,
            ...patch,
            id: existing.id,
            projectId,
            createdAt: existing.createdAt,
          })),

        deleteStakeholder: (projectId, stakeholderId) =>
          set((s) => {
            const project = s.byProject[projectId];
            if (!project) return s;
            const { [stakeholderId]: _dropped, ...rest } = project;
            return {
              byProject: { ...s.byProject, [projectId]: rest },
            };
          }),
      };
    },
    {
      name: PERSIST_KEY,
      version: 2,
      partialize: (state) => ({ byProject: state.byProject }),
      // v1 -> v2: the legacy single `commsChannel` string became the multi-select
      // `commsChannels` array (c6 mockup reconciliation). Coerce any persisted
      // record so older snapshots rehydrate without losing the chosen channel.
      migrate: (persisted, version) => {
        const state = persisted as { byProject?: Record<string, StakeholdersById> };
        if (version >= 2 || !state?.byProject) return state;
        const byProject: Record<string, StakeholdersById> = {};
        for (const [projectId, rows] of Object.entries(state.byProject)) {
          const migratedRows: StakeholdersById = {};
          for (const [id, row] of Object.entries(rows ?? {})) {
            const legacy = row as StakeholderRecord & { commsChannel?: string };
            const { commsChannel, ...rest } = legacy;
            migratedRows[id] = {
              ...rest,
              commsChannels:
                rest.commsChannels ?? (commsChannel ? [commsChannel] : undefined),
            };
          }
          byProject[projectId] = migratedRows;
        }
        return { ...state, byProject };
      },
    },
  ),
);

rehydrateWithLogging(useStakeholderRegisterStore);

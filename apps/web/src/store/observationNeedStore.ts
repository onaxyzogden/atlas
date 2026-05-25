/**
 * observationNeedStore — per-project, persisted run state for ObservationNeeds.
 * The static catalog (titles, targets, tools, checklist specs) lives in
 * `seedObservationNeeds.ts`; this store owns only the *mutable* half a steward
 * produces while working: ticked checklist items, captured evidence, the
 * summary note, and the lifecycle status. Keyed `byProject[projectId][needId]`.
 * Mirrors the catalog/run split of the compass evidence model.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import {
  emptyObservationNeedRun,
  type CapturedEvidence,
  type EvidenceKind,
  type ObservationNeedRun,
  type ObservationNeedStatus,
} from '../v3/observation-needs/observationNeed.js';

type RunsByNeed = Record<string, ObservationNeedRun>;

const PERSIST_KEY = 'ogden-observation-needs';
const LEGACY_PERSIST_KEY = 'ogden-field-objectives';

/** Map an old FieldObjective lifecycle status onto the new need lifecycle. */
const LEGACY_STATUS_MAP: Record<string, ObservationNeedStatus> = {
  'not-started': 'open',
  'in-progress': 'in-progress',
  'evidence-submitted': 'in-progress',
  complete: 'recorded',
  'needs-review': 'in-progress',
};

/**
 * One-time port of persisted run state from the old `ogden-field-objectives`
 * key to the new `ogden-observation-needs` key, remapping legacy lifecycle
 * statuses. Runs before the store is created. A zustand `migrate` can't read a
 * *renamed* key, so the port happens at the localStorage level instead.
 */
function portLegacyPersist(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (localStorage.getItem(PERSIST_KEY)) return;
    const raw = localStorage.getItem(LEGACY_PERSIST_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as {
      state?: { byProject?: Record<string, Record<string, ObservationNeedRun>> };
    };
    const byProject = parsed.state?.byProject ?? {};
    for (const runs of Object.values(byProject)) {
      for (const run of Object.values(runs)) {
        run.status = LEGACY_STATUS_MAP[run.status as string] ?? 'open';
      }
    }
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ state: { byProject }, version: 2 }),
    );
  } catch {
    // Corrupt legacy data — skip the port; the store starts fresh.
  }
}

portLegacyPersist();

interface ObservationNeedState {
  byProject: Record<string, RunsByNeed>;

  /** Read a run, falling back to a fresh empty run (never undefined). */
  getRun: (projectId: string, needId: string) => ObservationNeedRun;
  /** Toggle a checklist item; promotes status to in-progress on first touch. */
  toggleCheck: (projectId: string, needId: string, itemId: string) => void;
  /** Append a captured evidence item. */
  addEvidence: (
    projectId: string,
    needId: string,
    evidence: { specId: string; kind: EvidenceKind; value: string },
  ) => void;
  /** Remove one captured evidence item by index. */
  removeEvidence: (projectId: string, needId: string, index: number) => void;
  /** Set the summary note. */
  setSummary: (projectId: string, needId: string, summary: string) => void;
  /** Set the lifecycle status explicitly. */
  setStatus: (
    projectId: string,
    needId: string,
    status: ObservationNeedStatus,
  ) => void;
}

const now = () => new Date().toISOString();

export const useObservationNeedStore = create<ObservationNeedState>()(
  persist(
    (set, get) => {
      /** Apply a mutation to one need's run, stamping updatedAt. */
      const patch = (
        projectId: string,
        needId: string,
        fn: (run: ObservationNeedRun) => ObservationNeedRun,
      ) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          const existing = project[needId] ?? emptyObservationNeedRun();
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [needId]: { ...fn(existing), updatedAt: now() },
              },
            },
          };
        });

      return {
        byProject: {},

        getRun: (projectId, needId) =>
          get().byProject[projectId]?.[needId] ?? emptyObservationNeedRun(),

        toggleCheck: (projectId, needId, itemId) =>
          patch(projectId, needId, (run) => {
            const checked = run.checkedChecklist.includes(itemId)
              ? run.checkedChecklist.filter((id) => id !== itemId)
              : [...run.checkedChecklist, itemId];
            return {
              ...run,
              checkedChecklist: checked,
              status: run.status === 'open' ? 'in-progress' : run.status,
            };
          }),

        addEvidence: (projectId, needId, evidence) =>
          patch(projectId, needId, (run) => {
            const captured: CapturedEvidence = {
              specId: evidence.specId,
              kind: evidence.kind,
              value: evidence.value,
              capturedAt: now(),
            };
            return {
              ...run,
              evidence: [...run.evidence, captured],
              status: run.status === 'open' ? 'in-progress' : run.status,
            };
          }),

        removeEvidence: (projectId, needId, index) =>
          patch(projectId, needId, (run) => ({
            ...run,
            evidence: run.evidence.filter((_, i) => i !== index),
          })),

        setSummary: (projectId, needId, summary) =>
          patch(projectId, needId, (run) => ({
            ...run,
            summary,
            status: run.status === 'open' ? 'in-progress' : run.status,
          })),

        setStatus: (projectId, needId, status) =>
          patch(projectId, needId, (run) => ({ ...run, status })),
      };
    },
    {
      name: PERSIST_KEY,
      version: 2,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useObservationNeedStore);

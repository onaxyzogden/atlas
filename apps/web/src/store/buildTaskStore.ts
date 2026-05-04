/**
 * Build Task store — Phase 6.3.
 *
 * Persists per-task status overrides for the V3 BuildPage. The
 * underlying phase/task structure still ships from the project brief
 * fixture (`project.build.phases[].tasks[]`) — this store records
 * *what changed* on top of that fixture, keyed by
 * `${projectId}:${taskId}` so multiple projects don't collide.
 *
 * Closes the "Mark Phase Complete" half of Phase 6.3 in
 * `.claude/plans/few-concerns-shiny-quokka.md`. A future server-side
 * task table (Phase 7 backend backfill) replaces the localStorage
 * persistence; the call sites here stay stable.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BuildTaskStatus } from "../v3/types.js";

function key(projectId: string, taskId: string): string {
  return `${projectId}::${taskId}`;
}

interface BuildTaskState {
  overrides: Record<string, BuildTaskStatus>;
  setStatus: (projectId: string, taskId: string, status: BuildTaskStatus) => void;
  markPhaseComplete: (projectId: string, taskIds: string[]) => void;
  reset: (projectId: string) => void;
}

export const useBuildTaskStore = create<BuildTaskState>()(
  persist(
    (set) => ({
      overrides: {},

      setStatus: (projectId, taskId, status) =>
        set((s) => ({
          overrides: { ...s.overrides, [key(projectId, taskId)]: status },
        })),

      markPhaseComplete: (projectId, taskIds) =>
        set((s) => {
          const next = { ...s.overrides };
          for (const id of taskIds) next[key(projectId, id)] = "done";
          return { overrides: next };
        }),

      reset: (projectId) =>
        set((s) => {
          const next: Record<string, BuildTaskStatus> = {};
          const prefix = `${projectId}::`;
          for (const [k, v] of Object.entries(s.overrides)) {
            if (!k.startsWith(prefix)) next[k] = v;
          }
          return { overrides: next };
        }),
    }),
    { name: "ogden-build-tasks", version: 1 },
  ),
);

useBuildTaskStore.persist.rehydrate();

/** Read a single override for the given (project, task). */
export function getBuildTaskOverride(
  overrides: Record<string, BuildTaskStatus>,
  projectId: string,
  taskId: string,
): BuildTaskStatus | undefined {
  return overrides[key(projectId, taskId)];
}

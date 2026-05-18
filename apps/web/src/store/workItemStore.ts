/**
 * workItemStore — the canonical operating-loop spine (Sub-project D0).
 *
 * Single source of truth for all planned/schedulable work. Supersedes
 * phaseStore.PhaseTask, fieldTaskStore, maintenanceStore,
 * scheduledLivestockMoveStore, nurseryStore PropagationBatch (see
 * `workItem.schema.ts`). Append-only event-logs link back via `workItemId`.
 *
 * Persistence discipline mirrors `phaseStore` exactly: Zustand + `persist`,
 * key `ogden-work-items`, projectId-tagged, registered in `syncManifest`
 * as `versioned-blob` / `projectId-tagged`. Client-first, no DB migration.
 *
 * Legacy migration runs once, idempotently, on rehydrate — see
 * `workItemStore.migration.ts`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkItem } from '@ogden/shared';
import { runWorkItemMigration } from './workItemStore.migration';

interface WorkItemState {
  items: WorkItem[];
  /** Per-source idempotence guard set by the migration. */
  migratedSources: string[];

  addItem: (item: WorkItem) => void;
  updateItem: (id: string, patch: Partial<WorkItem>) => void;
  deleteItem: (id: string) => void;
  setStatus: (id: string, status: WorkItem['status']) => void;
  /**
   * Execution tracking — flip done/todo. Deliberately does NOT set
   * `overridden`: marking done is execution, not an authoring override, so
   * the Goal-Compass engine may still regenerate the row (mirrors the
   * legacy `phaseStore.toggleTaskDone` contract).
   */
  toggleDone: (id: string) => void;
  addDependency: (id: string, dependsOnId: string) => void;
  removeDependency: (id: string, dependsOnId: string) => void;

  /**
   * Goal Compass — replace all generated work items for a project while
   * preserving steward-edited (`overridden:true`) and `source:'manual'`
   * rows, and never touching non-goal-compass sources. Ports the
   * `phaseStore.replaceGoalCompassRows` override contract 1:1.
   */
  replaceGoalCompassRows: (projectId: string, items: WorkItem[]) => void;
  /**
   * Goal Compass — replace the *seeded* dependency edges (`dependsOnAuto`)
   * for a project. Mirrors the `replaceGoalCompassRows` preservation filter
   * 1:1: writes only on this project's generated, un-overridden goal-compass
   * rows. Manual `dependsOn`, overridden rows, and every other source are
   * never touched. Idempotent (same edge map → same state). D1.
   */
  replaceGoalCompassDependencies: (
    projectId: string,
    edgesByItemId: Map<string, string[]>,
  ) => void;
  /**
   * Annual planting calendar — replace nursery-batch work items carrying a
   * `generatedFromPlantingCalendar` provenance, wholesale. User-authored
   * and Goal-Compass rows untouched. Ports
   * `nurseryStore.replacePlantingCalendarBatches`.
   */
  replacePlantingCalendarBatches: (projectId: string, items: WorkItem[]) => void;

  /**
   * Returns a freshly-allocated array. **Do NOT call inside a Zustand
   * selector** — subscribe to `state.items` raw and derive in `useMemo`.
   * See: wiki/decisions/2026-04-26-zustand-selector-stability.md
   */
  getProjectWorkItems: (projectId: string) => WorkItem[];
  /** Idempotent legacy supersede. Safe to call repeatedly. */
  ensureMigrated: () => void;
}

const now = () => new Date().toISOString();

export const useWorkItemStore = create<WorkItemState>()(
  persist(
    (set, get) => ({
      items: [],
      migratedSources: [],

      addItem: (item) => set((s) => ({ items: [...s.items, item] })),

      updateItem: (id, patch) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id ? { ...it, ...patch, updatedAt: now() } : it,
          ),
        })),

      deleteItem: (id) =>
        set((s) => ({ items: s.items.filter((it) => it.id !== id) })),

      setStatus: (id, status) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id
              ? {
                  ...it,
                  status,
                  doneAt: status === 'done' ? now() : null,
                  updatedAt: now(),
                }
              : it,
          ),
        })),

      toggleDone: (id) =>
        set((s) => ({
          items: s.items.map((it) => {
            if (it.id !== id) return it;
            const done = it.status === 'done';
            return {
              ...it,
              status: done ? 'todo' : 'done',
              doneAt: done ? null : now(),
              updatedAt: now(),
            };
          }),
        })),

      addDependency: (id, dependsOnId) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id && !it.dependsOn.includes(dependsOnId)
              ? { ...it, dependsOn: [...it.dependsOn, dependsOnId], updatedAt: now() }
              : it,
          ),
        })),

      removeDependency: (id, dependsOnId) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id
              ? {
                  ...it,
                  dependsOn: it.dependsOn.filter((d) => d !== dependsOnId),
                  updatedAt: now(),
                }
              : it,
          ),
        })),

      replaceGoalCompassRows: (projectId, items) =>
        set((s) => {
          // Preserve: any row not (this project's generated, un-overridden
          // goal-compass row). That keeps overridden + manual + every other
          // source intact, exactly mirroring phaseStore.
          const remaining = s.items.filter(
            (it) =>
              it.projectId !== projectId ||
              it.source !== 'goal-compass' ||
              it.overridden,
          );
          const incoming = items.filter((it) => it.source === 'goal-compass');
          return { items: [...remaining, ...incoming] };
        }),

      replaceGoalCompassDependencies: (projectId, edgesByItemId) =>
        set((s) => ({
          items: s.items.map((it) => {
            // Same gate as replaceGoalCompassRows: only this project's
            // generated, un-overridden goal-compass rows are engine-owned.
            if (
              it.projectId !== projectId ||
              it.source !== 'goal-compass' ||
              it.overridden
            ) {
              return it;
            }
            const next = edgesByItemId.get(it.id) ?? [];
            const prev = it.dependsOnAuto ?? [];
            // Idempotent: unchanged edge set → same reference (no updatedAt
            // churn), so re-running the seeder is a no-op.
            if (
              prev.length === next.length &&
              prev.every((d, i) => d === next[i])
            ) {
              return it;
            }
            return { ...it, dependsOnAuto: next, updatedAt: now() };
          }),
        })),

      replacePlantingCalendarBatches: (projectId, items) =>
        set((s) => {
          const remaining = s.items.filter(
            (it) =>
              it.projectId !== projectId ||
              it.source !== 'nursery-batch' ||
              !it.generatedFromPlantingCalendar,
          );
          const incoming = items.filter(
            (it) => it.source === 'nursery-batch',
          );
          return { items: [...remaining, ...incoming] };
        }),

      getProjectWorkItems: (projectId) =>
        get().items.filter((it) => it.projectId === projectId),

      ensureMigrated: () => {
        const { items, migratedSources } = get();
        const result = runWorkItemMigration(items, migratedSources);
        if (!result) return; // nothing to migrate
        set({ items: result.items, migratedSources: result.migratedSources });
      },
    }),
    {
      name: 'ogden-work-items',
      version: 1,
      partialize: (state) => ({
        items: state.items,
        migratedSources: state.migratedSources,
      }),
    },
  ),
);

// Hydrate from localStorage (Zustand v5), then run the one-time idempotent
// legacy supersede so the spine is authoritative on first read.
useWorkItemStore.persist.rehydrate();
useWorkItemStore.getState().ensureMigrated();

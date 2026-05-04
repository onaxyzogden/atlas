/**
 * Field Task store — durable steward-authored TODOs against a project.
 *
 * Phase 6.4 (per `.claude/plans/few-concerns-shiny-quokka.md`): supplies
 * a target for the OperatePage "Create Field Task" CTA, which previously
 * had a no-op `onClick`. A FieldTask is a small, dated, optionally
 * located action item — distinct from a `FieldworkEntry` (an
 * *observation* of what's already happened).
 *
 * Persisted to localStorage. No backend mutation today; sync to a
 * server-side task table is part of Phase 7's backend backfill.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FieldTaskCategory =
  | "ops"
  | "weather"
  | "regulation"
  | "team"
  | "education";

export type FieldTaskStatus = "todo" | "in-progress" | "done";

export type FieldTaskPriority = "low" | "normal" | "high";

export interface FieldTask {
  id: string;
  projectId: string;
  title: string;
  category: FieldTaskCategory;
  /** ISO 8601 datetime; required so tasks can sort into the calendar. */
  dueAt: string;
  priority: FieldTaskPriority;
  status: FieldTaskStatus;
  notes: string;
  /** Optional [lng, lat] for tasks tied to a parcel location. */
  location?: [number, number];
  createdAt: string;
  updatedAt: string;
}

interface FieldTaskState {
  tasks: FieldTask[];
  addTask: (task: FieldTask) => void;
  updateTask: (id: string, updates: Partial<FieldTask>) => void;
  deleteTask: (id: string) => void;
  setStatus: (id: string, status: FieldTaskStatus) => void;
}

export const useFieldTaskStore = create<FieldTaskState>()(
  persist(
    (set) => ({
      tasks: [],

      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),

      updateTask: (id, updates) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t,
          ),
        })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      setStatus: (id, status) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, status, updatedAt: new Date().toISOString() }
              : t,
          ),
        })),
    }),
    { name: "ogden-field-tasks", version: 1 },
  ),
);

useFieldTaskStore.persist.rehydrate();

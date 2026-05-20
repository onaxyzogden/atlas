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
import type { WorkItem, MaterialLine, CostRange } from '@ogden/shared';
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
  /**
   * D4 — the SOLE writer of the spine completion fields. Stamps
   * status:'done' + doneAt + actualStart/actualEnd + who on the matching
   * item. Idempotent: if the item is already 'done' it is a no-op and the
   * items array keeps the same reference (no updatedAt churn). Proof-event
   * creation (typed D0 stamp or generic fallback) is orchestrated OUTSIDE
   * this store (fieldProofActions) — this writer never touches any other
   * store, so workItemStore keeps zero app-store dependencies.
   */
  fulfilWorkItem: (
    id: string,
    capture: {
      who?: string;
      actualStart?: string | null;
      actualEnd?: string | null;
      notes?: string;
    },
  ) => void;
  /**
   * D4 — reverse ONLY the spine completion fields (status→'todo',
   * doneAt/actualStart/actualEnd cleared). The immutable proof event is
   * deliberately NOT removed (orphan-by-design audit trail; that lives in
   * proofEventStore / the typed D0 logs).
   */
  unfulfilWorkItem: (id: string) => void;
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
   * Goal Compass — replace the *seeded* resourcing (`equipmentRequiredAuto`
   * / `materialsAuto`) for a project. Mirrors the
   * `replaceGoalCompassDependencies` preservation filter 1:1: writes only on
   * this project's generated, un-overridden goal-compass rows. Manual
   * `equipmentRequired` / `materials`, overridden rows, and every other
   * source are never touched. Idempotent (same input → same state). D2.
   */
  replaceGoalCompassResources: (
    projectId: string,
    resourcesByItemId: Map<
      string,
      { equipment: string[]; materials: MaterialLine[] }
    >,
  ) => void;
  /**
   * Goal Compass — replace the *seeded* planned-cost band (`costRangeAuto`)
   * for a project. Mirrors the `replaceGoalCompassResources` preservation
   * filter 1:1: writes only on this project's generated, un-overridden
   * goal-compass rows. The manual point estimate `costUSD`, overridden rows,
   * and every other source are never touched. Idempotent (same input → same
   * state). Strictly project cost tracking — no financing/capital semantics
   * (Sub-project C, Scholar-gated). D3.
   */
  replaceGoalCompassCosts: (
    projectId: string,
    costsByItemId: Map<string, CostRange>,
  ) => void;
  /**
   * Annual planting calendar — replace nursery-batch work items carrying a
   * `generatedFromPlantingCalendar` provenance, wholesale. User-authored
   * and Goal-Compass rows untouched. Ports
   * `nurseryStore.replacePlantingCalendarBatches`.
   */
  replacePlantingCalendarBatches: (projectId: string, items: WorkItem[]) => void;

  /**
   * B5.2.x.b — replace all `source:'cover-crop'` work items for a project
   * while preserving steward-edited (`overridden:true`) rows and never
   * touching any other source. Mirrors `replaceGoalCompassRows` 1:1.
   */
  replaceCoverCropRows: (projectId: string, items: WorkItem[]) => void;
  /**
   * B5.2.x.b — replace the seeded resourcing (`equipmentRequiredAuto` /
   * `materialsAuto`) for cover-crop rows. Mirrors
   * `replaceGoalCompassResources` preservation filter 1:1 (swap source).
   * Idempotent. D2.
   */
  replaceCoverCropResources: (
    projectId: string,
    resourcesByItemId: Map<
      string,
      { equipment: string[]; materials: MaterialLine[] }
    >,
  ) => void;
  /**
   * B5.2.x.b — replace the seeded planned-cost band (`costRangeAuto`) for
   * cover-crop rows. Mirrors `replaceGoalCompassCosts` 1:1 (swap source).
   * Idempotent. D3. Strictly project cost — no financing/capital semantics.
   */
  replaceCoverCropCosts: (
    projectId: string,
    costsByItemId: Map<string, CostRange>,
  ) => void;

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

      fulfilWorkItem: (id, capture) =>
        set((s) => {
          const it = s.items.find((w) => w.id === id);
          if (!it) return s;
          // Idempotent: already done ⇒ no-op, same reference (no churn).
          if (it.status === 'done') return s;
          return {
            items: s.items.map((w) =>
              w.id === id
                ? {
                    ...w,
                    status: 'done',
                    doneAt: now(),
                    ...(capture.who !== undefined ? { who: capture.who } : {}),
                    ...(capture.actualStart !== undefined
                      ? { actualStart: capture.actualStart }
                      : {}),
                    ...(capture.actualEnd !== undefined
                      ? { actualEnd: capture.actualEnd }
                      : {}),
                    updatedAt: now(),
                  }
                : w,
            ),
          };
        }),

      unfulfilWorkItem: (id) =>
        set((s) => {
          const it = s.items.find((w) => w.id === id);
          if (!it || it.status !== 'done') return s;
          return {
            items: s.items.map((w) =>
              w.id === id
                ? {
                    ...w,
                    status: 'todo',
                    doneAt: null,
                    actualStart: null,
                    actualEnd: null,
                    updatedAt: now(),
                  }
                : w,
            ),
          };
        }),

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

      replaceGoalCompassResources: (projectId, resourcesByItemId) =>
        set((s) => ({
          items: s.items.map((it) => {
            // Same gate as replaceGoalCompassDependencies: only this
            // project's generated, un-overridden goal-compass rows are
            // engine-owned.
            if (
              it.projectId !== projectId ||
              it.source !== 'goal-compass' ||
              it.overridden
            ) {
              return it;
            }
            const seeded = resourcesByItemId.get(it.id);
            const nextEquip = seeded?.equipment ?? [];
            const nextMats = seeded?.materials ?? [];
            const prevEquip = it.equipmentRequiredAuto ?? [];
            const prevMats = it.materialsAuto ?? [];
            const equipSame =
              prevEquip.length === nextEquip.length &&
              prevEquip.every((e, i) => e === nextEquip[i]);
            const matsSame =
              prevMats.length === nextMats.length &&
              prevMats.every((m, i) => {
                const n = nextMats[i]!;
                return (
                  m.label === n.label &&
                  m.unit === n.unit &&
                  m.quantityPerAcre === n.quantityPerAcre &&
                  m.notes === n.notes
                );
              });
            // Idempotent: unchanged → same reference (no updatedAt churn).
            if (equipSame && matsSame) return it;
            return {
              ...it,
              equipmentRequiredAuto: nextEquip,
              materialsAuto: nextMats,
              updatedAt: now(),
            };
          }),
        })),

      replaceGoalCompassCosts: (projectId, costsByItemId) =>
        set((s) => ({
          items: s.items.map((it) => {
            // Same gate as replaceGoalCompassResources: only this project's
            // generated, un-overridden goal-compass rows are engine-owned.
            if (
              it.projectId !== projectId ||
              it.source !== 'goal-compass' ||
              it.overridden
            ) {
              return it;
            }
            const next = costsByItemId.get(it.id);
            const prev = it.costRangeAuto;
            // Idempotent: unchanged band (incl. both-absent) → same
            // reference (no updatedAt churn), so re-seeding is a no-op.
            const same =
              (prev === undefined && next === undefined) ||
              (prev !== undefined &&
                next !== undefined &&
                prev.low === next.low &&
                prev.mid === next.mid &&
                prev.high === next.high);
            if (same) return it;
            return { ...it, costRangeAuto: next, updatedAt: now() };
          }),
        })),

      replaceCoverCropRows: (projectId, items) =>
        set((s) => {
          // Preserve: any row not (this project's generated, un-overridden
          // cover-crop row). Mirrors replaceGoalCompassRows exactly — swap
          // 'goal-compass' for 'cover-crop'. Goal-compass / manual / every
          // other source survives untouched (cross-source preservation gate).
          const remaining = s.items.filter(
            (it) =>
              it.projectId !== projectId ||
              it.source !== 'cover-crop' ||
              it.overridden,
          );
          const incoming = items.filter((it) => it.source === 'cover-crop');
          return { items: [...remaining, ...incoming] };
        }),

      replaceCoverCropResources: (projectId, resourcesByItemId) =>
        set((s) => ({
          items: s.items.map((it) => {
            if (
              it.projectId !== projectId ||
              it.source !== 'cover-crop' ||
              it.overridden
            ) {
              return it;
            }
            const seeded = resourcesByItemId.get(it.id);
            const nextEquip = seeded?.equipment ?? [];
            const nextMats = seeded?.materials ?? [];
            const prevEquip = it.equipmentRequiredAuto ?? [];
            const prevMats = it.materialsAuto ?? [];
            const equipSame =
              prevEquip.length === nextEquip.length &&
              prevEquip.every((e, i) => e === nextEquip[i]);
            const matsSame =
              prevMats.length === nextMats.length &&
              prevMats.every((m, i) => {
                const n = nextMats[i]!;
                return (
                  m.label === n.label &&
                  m.unit === n.unit &&
                  m.quantityPerAcre === n.quantityPerAcre &&
                  m.notes === n.notes
                );
              });
            if (equipSame && matsSame) return it;
            return {
              ...it,
              equipmentRequiredAuto: nextEquip,
              materialsAuto: nextMats,
              updatedAt: now(),
            };
          }),
        })),

      replaceCoverCropCosts: (projectId, costsByItemId) =>
        set((s) => ({
          items: s.items.map((it) => {
            if (
              it.projectId !== projectId ||
              it.source !== 'cover-crop' ||
              it.overridden
            ) {
              return it;
            }
            const next = costsByItemId.get(it.id);
            const prev = it.costRangeAuto;
            const same =
              (prev === undefined && next === undefined) ||
              (prev !== undefined &&
                next !== undefined &&
                prev.low === next.low &&
                prev.mid === next.mid &&
                prev.high === next.high);
            if (same) return it;
            return { ...it, costRangeAuto: next, updatedAt: now() };
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

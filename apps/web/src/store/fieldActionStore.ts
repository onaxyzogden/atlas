/**
 * fieldActionStore — Slice 3.1 substrate for the OLOS Act Command Center
 * (spec §2 Field Action Object Model). Per-project FieldAction records
 * with status-machine-aware mutators that delegate every state change to
 * `computeNextStatus` so the legal-transition table in
 * `@ogden/shared/relationships/fieldActionStatus` is the single source of
 * truth.
 *
 * Coexists with the legacy `workItemStore` per the Phase 3 locked decision
 * ("FieldAction is a new entity, not a WorkItem extension"). The legacy
 * Command Centre (View C / module-bar shell) continues to read workItems;
 * the new Field Action shell reads from here.
 *
 * Persistence:
 *  - Zustand `persist` middleware, key `ogden-field-actions`.
 *  - Registered as `versioned-blob` `byProject` in `syncManifest.ts`
 *    (typed-table backing waits on the server-side fieldAction table).
 *  - Rehydration is instrumented via `rehydrateWithLogging` so a future
 *    silent rehydrate failure surfaces on `[persist:ogden-field-actions]`.
 *
 * `proofItems` mutators normalise on `slotId`: writing a proof item to a
 * slot that already has one REPLACES the previous entry. Stewards can
 * still attach above-minimum evidence without a `slotId`; those rows
 * append.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import {
  computeNextStatus,
  isTerminal,
  routeToObserveFeed,
} from '@ogden/shared/relationships';
import type {
  FieldAction,
  FieldActionStatus,
  FieldActionTaskType,
  FieldActionVerificationMode,
} from '@ogden/shared';
import type { FieldActionProofItem } from '@ogden/shared';
import type { DivergenceFlag } from '@ogden/shared';
import {
  useObserveFeedStore,
  type ObserveFeedEntry,
} from './observeFeedStore.js';
import { useCyclicalReviewStore } from './cyclicalReviewStore.js';

const PERSIST_KEY = 'ogden-field-actions';

type ByProject = Record<string, FieldAction[]>;

const EMPTY_ACTIONS: readonly FieldAction[] = Object.freeze([]);

/** Input for creating a new FieldAction; the store fills timestamps + defaults. */
export interface CreateFieldActionInput {
  id: string;
  projectId: string;
  planObjectiveId: string;
  tierId: string;
  title: string;
  description?: string;
  taskType: FieldActionTaskType;
  proofSchemaId: string;
  verificationMode: FieldActionVerificationMode;
  assignedTo?: string[];
  mapOverlayIds?: string[];
  locationGeometry?: FieldAction['locationGeometry'];
  /**
   * Cycle to stamp on the new action (ADR 2). Defaults to 0 (current cycle
   * of an un-advanced project). Pass 'baseline' for a pre-cycle-0 baseline
   * survey. Immutable after creation.
   */
  cycleId?: FieldAction['cycleId'];
}

/** Pick of FieldAction fields that may be patched directly (no status). */
type PatchableFieldActionFields = Pick<
  FieldAction,
  | 'title'
  | 'description'
  | 'taskType'
  | 'verificationMode'
  | 'assignedTo'
  | 'mapOverlayIds'
  | 'locationGeometry'
  | 'verifierUserId'
  | 'verificationNote'
  | 'observeFeedIds'
  | 'proofItems'
>;

interface FieldActionState {
  byProject: ByProject;

  // --- selectors ---
  getByProject: (projectId: string) => readonly FieldAction[];
  getByObjective: (
    projectId: string,
    planObjectiveId: string,
  ) => readonly FieldAction[];
  getById: (projectId: string, id: string) => FieldAction | undefined;
  /**
   * View B "Next Up" priority order per spec §4.3:
   *   1. in_progress
   *   2. submitted (pending verification, review mode)
   *   3. not_started from the lowest active tier
   * Returns undefined when no eligible action exists.
   */
  getNextUpForProject: (projectId: string) => FieldAction | undefined;

  // --- mutators ---
  createFieldAction: (input: CreateFieldActionInput) => FieldAction;
  updateFieldAction: (
    projectId: string,
    id: string,
    patch: Partial<PatchableFieldActionFields>,
  ) => void;
  /**
   * Add or replace one proof item on the field action. Replacement keys on
   * `slotId` when present; items with no `slotId` always append.
   */
  attachProofItem: (
    projectId: string,
    id: string,
    item: FieldActionProofItem,
  ) => void;
  removeProofItem: (
    projectId: string,
    id: string,
    proofItemId: string,
  ) => void;

  // --- status transitions (delegate to computeNextStatus) ---
  markStarted: (projectId: string, id: string) => void;
  markSubmitted: (projectId: string, id: string) => void;
  markVerified: (
    projectId: string,
    id: string,
    verifierUserId?: string,
  ) => void;
  returnForRevision: (
    projectId: string,
    id: string,
    verificationNote?: string,
  ) => void;
  markDiverged: (
    projectId: string,
    id: string,
    flag: DivergenceFlag,
  ) => void;
  markBlocked: (projectId: string, id: string, reason: string) => void;
  unblock: (projectId: string, id: string) => void;

  // --- maintenance ---
  removeFieldAction: (projectId: string, id: string) => void;
  clearForProject: (projectId: string) => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function setOne(
  byProject: ByProject,
  projectId: string,
  id: string,
  updater: (action: FieldAction) => FieldAction,
): ByProject {
  const list = byProject[projectId];
  if (!list) return byProject;
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return byProject;
  const current = list[idx];
  if (!current) return byProject;
  const next = list.slice();
  next[idx] = updater(current);
  return { ...byProject, [projectId]: next };
}

function makeFeedId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `feed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Side-effect: append an Observe-feed observation for a status transition
 * that crossed into `verified` or `diverged`. Pulls the routing key from the
 * pure helper in `@ogden/shared/relationships` so the routing rule stays the
 * single source of truth.
 */
function appendObserveFeedFor(
  before: FieldAction,
  after: FieldAction,
  sourceType: ObserveFeedEntry['sourceType'],
): void {
  if (before.status === after.status) return;
  const entry: ObserveFeedEntry = {
    id: makeFeedId(),
    projectId: after.projectId,
    feedKey: routeToObserveFeed(after),
    sourceType,
    sourceActionId: after.id,
    sourceActionTitle: after.title,
    divergenceType:
      sourceType === 'diverged' ? after.divergenceFlag?.type : undefined,
    divergenceNote:
      sourceType === 'diverged' ? after.divergenceFlag?.noteText : undefined,
    proofItems:
      sourceType === 'diverged' && after.divergenceFlag?.proofItems?.length
        ? after.divergenceFlag.proofItems
        : after.proofItems,
    capturedAt: new Date().toISOString(),
    capturedBy: after.verifierUserId,
  };
  useObserveFeedStore.getState().appendObservation(entry);
}

function applyTransition(
  action: FieldAction,
  event: Parameters<typeof computeNextStatus>[1],
  patch: Partial<FieldAction> = {},
): FieldAction {
  const nextStatus = computeNextStatus(action, event);
  // computeNextStatus returns the current status on illegal events, so we
  // treat that as a no-op (no timestamp churn).
  const isNoOp = nextStatus === action.status && Object.keys(patch).length === 0;
  if (isNoOp) return action;
  const reachedTerminal = isTerminal(nextStatus) && nextStatus !== action.status;
  return {
    ...action,
    ...patch,
    status: nextStatus,
    updatedAt: nowIso(),
    doneAt: reachedTerminal ? nowIso() : action.doneAt,
  };
}

// ---------------------------------------------------------------------------
// Persistence migration (v1 -> v2): ADR 2 cycleId + ADR 7 Phase 0 fields
// (4-value taskType, observedAt, sourceObjectiveType anchor). The exported
// pieces are pure and unit-tested in __tests__/fieldActionStore.migrate.test.ts;
// the cross-store cycle backfill wiring is covered by the lifecycle test there.
// Pattern mirrors closedLoopStore's same-key migrate() + onRehydrateStorage
// foreign-key fold.
// ---------------------------------------------------------------------------

const OBSERVE_CYCLE_PERSIST_KEY = 'ogden-observe-cycles';

/**
 * Legacy 2-value taskType -> the 4-value taxonomy (ADR 2). Unknown/empty
 * values fall back to the non-field bucket so a stray value never crashes a
 * parse; already-migrated values pass through unchanged (idempotent).
 */
export function remapTaskType(legacy: unknown): FieldActionTaskType {
  switch (legacy) {
    case 'survey':
      return 'field_survey';
    case 'implementation':
      return 'implementation_task';
    case 'field_survey':
    case 'monitoring_task':
    case 'implementation_task':
    case 'administrative_task':
      return legacy;
    default:
      return 'administrative_task';
  }
}

/**
 * persist `migrate` (v1 -> v2). Same-store field transforms ONLY: remap
 * taskType, backfill observedAt (= updatedAt, the best available proxy for
 * when the work happened) and sourceObjectiveType (= null, the ADR 9 anchor).
 * cycleId is deliberately left undefined here — the cross-store backfill needs
 * observeCycleStore, which migrate cannot read; onRehydrateStorage resolves it.
 * Idempotent: v2+ input is returned unchanged.
 */
export function migratePersisted(
  persisted: unknown,
  fromVersion: number,
): FieldActionState {
  if (!persisted || typeof persisted !== 'object') {
    return { byProject: {} } as unknown as FieldActionState;
  }
  const state = persisted as { byProject?: Record<string, unknown[]> };
  const byProject = state.byProject ?? {};
  if (fromVersion >= 2) {
    return { byProject } as unknown as FieldActionState;
  }
  const migrated: ByProject = {};
  for (const [projectId, list] of Object.entries(byProject)) {
    if (!Array.isArray(list)) continue;
    migrated[projectId] = list.map((raw) => {
      const a = (raw ?? {}) as Record<string, unknown>;
      const createdAt =
        typeof a.createdAt === 'string' ? a.createdAt : nowIso();
      const updatedAt =
        typeof a.updatedAt === 'string' ? a.updatedAt : createdAt;
      const observedAt =
        typeof a.observedAt === 'string' ? a.observedAt : updatedAt;
      return {
        ...a,
        taskType: remapTaskType(a.taskType),
        observedAt,
        sourceObjectiveType: a.sourceObjectiveType ?? null,
        // cycleId intentionally omitted -> onRehydrateStorage backfills it.
      } as unknown as FieldAction;
    });
  }
  return { byProject: migrated } as unknown as FieldActionState;
}

/**
 * Resolve every undefined cycleId to the project's current cycle (ADR 2).
 * Pure; returns a new byProject + whether anything changed. Records that
 * already carry a cycleId are left untouched (idempotent). Pre-cycle records
 * adopt the project-wide MAX currentCycleId — FieldAction has no domainId, so
 * the project-wide max is the coarse-but-safe target. DEFERRED REFINEMENT:
 * backfill per-domain once FieldActions carry a domain (ADR 5/6).
 */
export function backfillCycleIds(
  byProject: ByProject,
  currentCycleByProject: Record<string, number>,
): { byProject: ByProject; changed: boolean } {
  let changed = false;
  const next: ByProject = {};
  for (const [projectId, list] of Object.entries(byProject)) {
    const fallback = currentCycleByProject[projectId] ?? 0;
    let listChanged = false;
    const nextList = list.map((a) => {
      const cid = (a as { cycleId?: unknown }).cycleId;
      if (cid === undefined) {
        listChanged = true;
        return { ...a, cycleId: fallback } as FieldAction;
      }
      return a;
    });
    next[projectId] = listChanged ? nextList : list;
    if (listChanged) changed = true;
  }
  return { byProject: next, changed };
}

/**
 * Read another persisted Zustand store's slice straight from localStorage,
 * without importing the store (avoids a module load-order cycle). Mirrors
 * closedLoopStore's foreign-key-fold helper. Returns the persisted `.state`
 * object, or null when absent/unparseable.
 */
function readPersistedSlice<T>(key: string): T | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: T } | null;
    return parsed?.state ?? null;
  } catch {
    return null;
  }
}

/**
 * Per-project current cycle = MAX currentCycleId across the project's domains,
 * read from observeCycleStore's persisted slice (cycles are per-(project,
 * domain); FieldAction has no domainId — see backfillCycleIds).
 */
function readProjectCurrentCycle(): Record<string, number> {
  const slice = readPersistedSlice<{
    byProject?: Record<
      string,
      Record<string, { currentCycleId?: number } | undefined> | undefined
    >;
  }>(OBSERVE_CYCLE_PERSIST_KEY);
  const out: Record<string, number> = {};
  for (const [projectId, perDomain] of Object.entries(slice?.byProject ?? {})) {
    let max = 0;
    for (const domainState of Object.values(perDomain ?? {})) {
      const c = domainState?.currentCycleId;
      if (typeof c === 'number' && c > max) max = c;
    }
    out[projectId] = max;
  }
  return out;
}

/**
 * onRehydrateStorage callback: cross-store cycleId backfill (ADR 2). Runs
 * after migrate has remapped fields; resolves each undefined cycleId to the
 * project's current cycle. Idempotent.
 */
function onRehydrateBackfillCycle(state?: FieldActionState): void {
  if (!state) return;
  const { byProject, changed } = backfillCycleIds(
    state.byProject,
    readProjectCurrentCycle(),
  );
  if (changed) useFieldActionStore.setState({ byProject });
}

export const useFieldActionStore = create<FieldActionState>()(
  persist(
    (set, get) => ({
      byProject: {},

      // --- selectors ---
      getByProject: (projectId) =>
        get().byProject[projectId] ?? EMPTY_ACTIONS,

      getByObjective: (projectId, planObjectiveId) =>
        (get().byProject[projectId] ?? []).filter(
          (a) => a.planObjectiveId === planObjectiveId,
        ),

      getById: (projectId, id) =>
        (get().byProject[projectId] ?? []).find((a) => a.id === id),

      getNextUpForProject: (projectId) => {
        const list = get().byProject[projectId] ?? [];
        if (list.length === 0) return undefined;
        const byStatus = (s: FieldActionStatus) =>
          list.filter((a) => a.status === s);
        const inProgress = byStatus('in_progress');
        if (inProgress.length > 0) return inProgress[0];
        const pendingReview = byStatus('submitted').filter(
          (a) => a.verificationMode === 'review',
        );
        if (pendingReview.length > 0) return pendingReview[0];
        const ready = byStatus('not_started');
        if (ready.length === 0) return undefined;
        // Lowest active tier wins. Tier ids are sortable lexicographically
        // (t0-... < t1-... < ...), which matches the seed convention in
        // packages/shared/src/constants/plan/tierObjectives.ts.
        const sorted = ready.slice().sort((a, b) =>
          a.tierId.localeCompare(b.tierId),
        );
        return sorted[0];
      },

      // --- mutators ---
      createFieldAction: (input) => {
        const now = nowIso();
        const created: FieldAction = {
          id: input.id,
          projectId: input.projectId,
          planObjectiveId: input.planObjectiveId,
          tierId: input.tierId,
          title: input.title,
          description: input.description,
          taskType: input.taskType,
          // Cycle is stamped once at creation and never mutated (ADR 2).
          cycleId: input.cycleId ?? 0,
          // ADR 9 owns population of the source-objective tag; null until then.
          sourceObjectiveType: null,
          status: 'not_started',
          proofSchemaId: input.proofSchemaId,
          proofItems: [],
          verificationMode: input.verificationMode,
          assignedTo: input.assignedTo ?? [],
          divergenceFlag: null,
          observeFeedIds: [],
          locationGeometry: input.locationGeometry ?? null,
          mapOverlayIds: input.mapOverlayIds ?? [],
          blockedReason: null,
          createdAt: now,
          updatedAt: now,
          // observed_at seeds to creation time; later phases advance it on
          // submit/verify. The §6 conflict model (ADR 7 Phase 3) keys on it.
          observedAt: now,
          doneAt: null,
        };
        set((s) => {
          const existing = s.byProject[input.projectId] ?? [];
          // Replace by id if a record with the same id already exists; this
          // keeps `createFieldAction` idempotent under React StrictMode
          // double-effects and across reload races.
          const filtered = existing.filter((a) => a.id !== input.id);
          return {
            byProject: {
              ...s.byProject,
              [input.projectId]: [...filtered, created],
            },
          };
        });
        return created;
      },

      updateFieldAction: (projectId, id, patch) =>
        set((s) => ({
          byProject: setOne(s.byProject, projectId, id, (a) => ({
            ...a,
            ...patch,
            updatedAt: nowIso(),
          })),
        })),

      attachProofItem: (projectId, id, item) =>
        set((s) => ({
          byProject: setOne(s.byProject, projectId, id, (a) => {
            const next = item.slotId
              ? [
                  ...a.proofItems.filter((p) => p.slotId !== item.slotId),
                  item,
                ]
              : [...a.proofItems, item];
            return { ...a, proofItems: next, updatedAt: nowIso() };
          }),
        })),

      removeProofItem: (projectId, id, proofItemId) =>
        set((s) => ({
          byProject: setOne(s.byProject, projectId, id, (a) => ({
            ...a,
            proofItems: a.proofItems.filter((p) => p.id !== proofItemId),
            updatedAt: nowIso(),
          })),
        })),

      // --- status transitions ---
      markStarted: (projectId, id) =>
        set((s) => ({
          byProject: setOne(s.byProject, projectId, id, (a) =>
            applyTransition(a, 'start'),
          ),
        })),

      markSubmitted: (projectId, id) => {
        let before: FieldAction | undefined;
        let after: FieldAction | undefined;
        set((s) => ({
          byProject: setOne(s.byProject, projectId, id, (a) => {
            before = a;
            const next = applyTransition(a, 'submit');
            after = next;
            return next;
          }),
        }));
        // Self-mode submit collapses straight to `verified` per spec §9.4 —
        // emit the verified observation here. Review-mode lands on
        // `submitted` and the Observe feed waits for the verifier to act.
        if (before && after && after.status === 'verified') {
          appendObserveFeedFor(before, after, 'verified');
        }
      },

      markVerified: (projectId, id, verifierUserId) => {
        let before: FieldAction | undefined;
        let after: FieldAction | undefined;
        set((s) => ({
          byProject: setOne(s.byProject, projectId, id, (a) => {
            before = a;
            const next = applyTransition(
              a,
              'verify',
              verifierUserId ? { verifierUserId } : {},
            );
            after = next;
            return next;
          }),
        }));
        if (before && after && after.status === 'verified') {
          appendObserveFeedFor(before, after, 'verified');
        }
      },

      returnForRevision: (projectId, id, verificationNote) =>
        set((s) => ({
          byProject: setOne(s.byProject, projectId, id, (a) =>
            applyTransition(
              a,
              'return_for_revision',
              verificationNote !== undefined ? { verificationNote } : {},
            ),
          ),
        })),

      markDiverged: (projectId, id, flag) => {
        let before: FieldAction | undefined;
        let after: FieldAction | undefined;
        set((s) => ({
          byProject: setOne(s.byProject, projectId, id, (a) => {
            before = a;
            const next = applyTransition(a, 'diverge', { divergenceFlag: flag });
            after = next;
            return next;
          }),
        }));
        if (before && after && after.status === 'diverged') {
          appendObserveFeedFor(before, after, 'diverged');
          // Raise the Plan revision flag on the parent objective so the
          // cyclical-review predicate (`isCyclicalReviewDue`) returns true
          // the next time it runs. This is the Phase 4 hook described in
          // Slice 1.11; until the formal Observe rewire lands, we route
          // through the existing `forceTrigger` mechanism.
          useCyclicalReviewStore
            .getState()
            .forceTrigger(after.projectId, after.planObjectiveId);
        }
      },

      markBlocked: (projectId, id, reason) =>
        set((s) => ({
          byProject: setOne(s.byProject, projectId, id, (a) =>
            applyTransition(a, 'block', { blockedReason: reason }),
          ),
        })),

      unblock: (projectId, id) =>
        set((s) => ({
          byProject: setOne(s.byProject, projectId, id, (a) =>
            applyTransition(a, 'unblock', { blockedReason: null }),
          ),
        })),

      // --- maintenance ---
      removeFieldAction: (projectId, id) =>
        set((s) => {
          const list = s.byProject[projectId];
          if (!list) return s;
          return {
            byProject: {
              ...s.byProject,
              [projectId]: list.filter((a) => a.id !== id),
            },
          };
        }),

      clearForProject: (projectId) =>
        set((s) => {
          if (!(projectId in s.byProject)) return s;
          const { [projectId]: _dropped, ...rest } = s.byProject;
          return { byProject: rest };
        }),
    }),
    {
      name: PERSIST_KEY,
      version: 2,
      partialize: (state) => ({ byProject: state.byProject }),
      migrate: migratePersisted,
      onRehydrateStorage: () => onRehydrateBackfillCycle,
    },
  ),
);

rehydrateWithLogging(useFieldActionStore);

/**
 * Stable accessor for one project's field actions. Returns a frozen empty
 * array when the project has no records yet so React/Zustand selectors
 * keep a stable identity and don't churn.
 */
export function selectFieldActionsForProject(
  state: FieldActionState,
  projectId: string,
): readonly FieldAction[] {
  return state.byProject[projectId] ?? EMPTY_ACTIONS;
}

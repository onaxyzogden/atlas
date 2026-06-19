/**
 * actMandateStore -- persisted steward state for Threshold 3 (The Act Mandate),
 * the final Plan-stage surface after `s7-phasing-resourcing`. This is the one
 * place the steward crosses from designing (Plan) into doing (Act), and that
 * crossing is sealed by a single deliberate action: "Begin Act".
 *
 * One entry per project:
 *   - `mandatedAt`        -- epoch ms when "Begin Act" was pressed; the
 *                            idempotent stamp that arms the mandate. Once set it
 *                            is never re-stamped (the original crossing stands).
 *   - `planReadOnly`      -- project-global lock flag, armed `true` at Begin Act.
 *                            This is the SINGLE operator-authorized exception to
 *                            the standing "soft gate / never block" posture,
 *                            scoped strictly to the Plan->Act transition. It is
 *                            consulted ONLY by the surface-aware seams -- the
 *                            render prop (useObjectivePlanLock) and the route
 *                            loader; the shared stores stay surface-agnostic so
 *                            Act execution is never frozen. No prerequisite,
 *                            threshold, monitoring, or progressTracking logic
 *                            reads it.
 *   - `objectiveOverrides`-- per-objective lift window: objectiveId -> epoch ms
 *                            the lock was lifted (governance approved a concern).
 *                            While an objective is in this map its lock is lifted
 *                            so an amendment can be recorded ALONGSIDE the
 *                            original; `relock` removes it again.
 *
 * `isObjectiveLocked` is the derived predicate the seams consult:
 *   planReadOnly AND the objective is NOT in the lift window.
 *
 * There is NO Amanah touchpoint here -- the store holds only timestamps and
 * booleans (the covenant scan lives on the free-text concern fields in
 * planConcernsStore). Client-only IndexedDB (`ogden-act-mandate`, v1) registered
 * in syncManifest (the coverage guard fails the build if it is not). Mirrors the
 * coherenceCheckStore / realityCheckStore persist/rehydrate idiom exactly.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The whole Threshold-3 record for one project. */
export interface ProjectActMandate {
  /** Epoch ms "Begin Act" was pressed; absent until the steward crosses. */
  mandatedAt?: number;
  /** Project-global Plan lock, armed at Begin Act. */
  planReadOnly: boolean;
  /** objectiveId -> epoch ms its lock was lifted (governance lift window). */
  objectiveOverrides: Record<string, number>;
}

/** Stable empty record returned when a project has no Threshold-3 data yet. */
export const EMPTY_ACT_MANDATE: ProjectActMandate = Object.freeze({
  planReadOnly: false,
  objectiveOverrides: Object.freeze({}) as Record<string, number>,
});

interface ActMandateState {
  /** Threshold-3 record keyed by projectId. */
  byProject: Record<string, ProjectActMandate>;

  /**
   * Cross from Plan into Act: stamp `mandatedAt` and arm `planReadOnly`.
   * IDEMPOTENT: once the mandate is stamped a second call is a no-op (the
   * original crossing time stands), so a double-fired button never re-arms.
   * Defaults `mandatedAt` to now; tests pass an explicit timestamp.
   */
  beginAct(projectId: string, at?: number): void;

  /**
   * Lift the lock for one objective (governance approved a concern against it).
   * Records the lift time in `objectiveOverrides`. No-op if already lifted.
   * Defaults to now; tests pass an explicit timestamp.
   */
  liftLock(projectId: string, objectiveId: string, at?: number): void;

  /** Re-lock one objective (drop it from the lift window). No-op if not lifted. */
  relock(projectId: string, objectiveId: string): void;

  /** Drop the entire Threshold-3 record for a project. */
  reset(projectId: string): void;
}

// ---------------------------------------------------------------------------
// Selectors (pure -- safe in render + unit-testable without the store)
// ---------------------------------------------------------------------------

/** The project-global Plan lock flag for a record. */
export function selectPlanReadOnly(record: ProjectActMandate): boolean {
  return record.planReadOnly;
}

/**
 * Whether ONE objective is locked: the project lock is armed AND the objective
 * is not in the lift window. This is the single predicate every enforcement
 * seam consults; a lifted (override) objective reads `false` so it is writable
 * again just long enough to record an amendment.
 */
export function isObjectiveLocked(
  record: ProjectActMandate,
  objectiveId: string,
): boolean {
  return record.planReadOnly && !(objectiveId in record.objectiveOverrides);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Read a project's record, defaulting to EMPTY_ACT_MANDATE when absent. */
function readRecord(
  byProject: Record<string, ProjectActMandate>,
  projectId: string,
): ProjectActMandate {
  return byProject[projectId] ?? EMPTY_ACT_MANDATE;
}

/** Immutably write a patched record back into byProject. */
function writeRecord(
  byProject: Record<string, ProjectActMandate>,
  projectId: string,
  patch: Partial<ProjectActMandate>,
): Record<string, ProjectActMandate> {
  return {
    ...byProject,
    [projectId]: { ...readRecord(byProject, projectId), ...patch },
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useActMandateStore = create<ActMandateState>()(
  persist(
    (set) => ({
      byProject: {},

      beginAct: (projectId, at) =>
        set((s) => {
          const current = readRecord(s.byProject, projectId);
          if (current.mandatedAt !== undefined) return s; // idempotent -- no-op
          return {
            byProject: writeRecord(s.byProject, projectId, {
              mandatedAt: at ?? Date.now(),
              planReadOnly: true,
            }),
          };
        }),

      liftLock: (projectId, objectiveId, at) =>
        set((s) => {
          const current = readRecord(s.byProject, projectId);
          if (objectiveId in current.objectiveOverrides) return s; // already lifted
          return {
            byProject: writeRecord(s.byProject, projectId, {
              objectiveOverrides: {
                ...current.objectiveOverrides,
                [objectiveId]: at ?? Date.now(),
              },
            }),
          };
        }),

      relock: (projectId, objectiveId) =>
        set((s) => {
          const current = readRecord(s.byProject, projectId);
          if (!(objectiveId in current.objectiveOverrides)) return s; // no-op
          const { [objectiveId]: _removed, ...rest } = current.objectiveOverrides;
          return {
            byProject: writeRecord(s.byProject, projectId, {
              objectiveOverrides: rest,
            }),
          };
        }),

      reset: (projectId) =>
        set((s) => {
          if (!(projectId in s.byProject)) return s; // no-op
          const { [projectId]: _removed, ...rest } = s.byProject;
          return { byProject: rest };
        }),
    }),
    {
      name: 'ogden-act-mandate',
      version: 1,
      // Synced project data lives in IndexedDB like every other byProject store
      // (Node-safe; degrades to localStorage/null). No schema migrate at v1.
      storage: idbPersistStorage,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useActMandateStore);

// ---------------------------------------------------------------------------
// Imperative lock read -- the route-layer lock seam (Stage 6)
// ---------------------------------------------------------------------------

/**
 * Non-React lock read for the Plan-objective route loader (`routes/index.tsx`
 * `beforeLoad`), which injects `planReadOnly` into route context without
 * redirecting (a locked objective stays viewable so a concern can be raised).
 * Reads live store state directly (no subscription), so it is safe to call
 * outside React.
 *
 * `id` is an objectiveId: a governance lift drops it from `objectiveOverrides`,
 * so `isObjectiveLocked` reads false and that objective reopens while the rest
 * of the plan stays frozen; `relock` re-freezes it.
 *
 * DELIBERATELY NOT a store backstop. `planReadOnly` is a SURFACE policy -- the
 * Plan design surfaces are read-only, the Act execution surfaces stay writable.
 * Only the render + route layers know the calling surface; the shared mutators
 * (`planStratumStore.setItemComplete`, `actEvidenceStore.saveVisionForm`, ...)
 * do not, because the Act execution loop (ActTierShell) writes the SAME store
 * with the SAME projectId+objectiveId+itemId keys. A mutator-level guard here
 * could not tell a Plan write from an Act write and would freeze Act execution
 * after Begin Act -- breaking the "Act stays byte-identical" invariant. The lock
 * is therefore enforced where the surface is known (render: `useObjectivePlanLock`;
 * route: this helper) and the stores stay surface-agnostic. See the
 * `*.mandateNeutrality.test.ts` suites, which pin that those mutators keep
 * writing under an armed mandate. One-way edge: nothing this store imports
 * depends on it, so there is no cycle.
 */
export function isObjectivePlanLocked(projectId: string, id: string): boolean {
  return isObjectiveLocked(
    readRecord(useActMandateStore.getState().byProject, projectId),
    id,
  );
}

// ---------------------------------------------------------------------------
// React hook -- the render-layer lock seam (Stage 5)
// ---------------------------------------------------------------------------

/**
 * Subscribe to whether ONE Plan objective is locked under the active mandate.
 * Returns a primitive boolean, so the selector is referentially stable and no
 * memoisation is needed. Absent project record -> false (no mandate, unlocked).
 */
export function useObjectivePlanLock(
  projectId: string,
  objectiveId: string,
): boolean {
  return useActMandateStore((s) =>
    isObjectiveLocked(readRecord(s.byProject, projectId), objectiveId),
  );
}

/**
 * protocolStore — lifecycle state for steward-activated standing protocols.
 *
 * Bridges the Plan-stage ProtocolConfirmationFlow (where protocols are
 * activated/skipped) to the Act-stage TriggeredProtocolsPanel (where they
 * surface as urgent actionable cards when triggered).
 *
 * Evaluation engine (auto-triggering from Observe data) is deferred.
 * Triggering is manual for this slice: call markTriggered() from the
 * browser console or a future evaluation hook.
 *
 * Persist key: 'ogden-protocols', version 1.
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type { ProtocolStatus, ProtocolActivation, ExpectedRate } from '@ogden/shared';

/**
 * Input to `recordActivation`: a ProtocolActivation with the auto-defaulted
 * fields made optional. Callers (the Trigger Recognition sheet) supply the
 * semantic fields; tests may pin `id` / `activatedAt` for determinism.
 */
export type RecordActivationInput = Omit<
  ProtocolActivation,
  'id' | 'activatedAt' | 'triggerContext'
> & {
  id?: string;
  activatedAt?: string;
  triggerContext?: ProtocolActivation['triggerContext'];
};

export interface ActivatedProtocolRecord {
  templateId: string;
  projectId: string;
  /** Subset of ProtocolStatus used for active protocols. */
  status: Extract<ProtocolStatus, 'active' | 'triggered' | 'suspended'>;
  activatedAt: string;
  /** ISO timestamp — hide from panel until this time has passed. */
  deferredUntil?: string;
  /** ISO timestamp — set when the steward logs a response. */
  lastLoggedAt?: string;
}

export interface ProtocolState {
  records: ActivatedProtocolRecord[];

  /**
   * Append-only history of recognised protocol triggers (Object Model Spec
   * v1.1, 9). Never mutated after creation; lives alongside the `records`
   * lifecycle array, which it does not touch.
   */
  activations: ProtocolActivation[];

  /**
   * Template-keyed expected-rate metadata, read by the deviation engine
   * alongside activations. Keyed by projectId -> templateId -> ExpectedRate.
   */
  expectationsByProject: Record<string, Record<string, ExpectedRate>>;

  /**
   * §10.1 instantiation marker. Keyed projectId -> objectiveIds whose protocol
   * approval overlay has ALREADY been auto-surfaced on completion. Gives the
   * trigger exactly-once-per-objective semantics: once an objective's overlay
   * has surfaced, completing/re-rendering it never re-opens it (so a steward who
   * dismissed or deactivated protocols is not nagged). The manual "Approve &
   * instantiate" button bypasses this; `clearObjectiveInstantiation` resets it
   * for an explicit re-instantiate.
   */
  instantiatedObjectiveIds: Record<string, string[]>;

  /**
   * Idempotently record that an objective's instantiation overlay has been
   * surfaced. Adding an already-present (projectId, objectiveId) is a no-op.
   */
  markObjectiveInstantiated: (projectId: string, objectiveId: string) => void;

  /**
   * Clear the instantiation marker for one objective (manual re-instantiate).
   * Idempotent: a no-op when the objective was never marked.
   */
  clearObjectiveInstantiation: (projectId: string, objectiveId: string) => void;

  /**
   * Upsert the expected rate for a (projectId, templateId) pair. Immutable
   * nested spread: does not mutate sibling projects or templates.
   */
  setExpectation: (projectId: string, templateId: string, rate: ExpectedRate) => void;

  /**
   * Append an immutable ProtocolActivation. Defaults id (crypto.randomUUID()),
   * activatedAt (now, ISO) and triggerContext ('act_proof_capture') when the
   * caller omits them. Does NOT change the `records` lifecycle array.
   */
  recordActivation: (input: RecordActivationInput) => void;

  /** Read-time: this project's activations, newest-first. */
  getActivations: (projectId: string) => ProtocolActivation[];

  /**
   * Idempotent activate: upserts a record with status 'active'.
   * Re-activating a skipped/suspended record resets it to 'active'.
   */
  activateProtocol: (projectId: string, templateId: string) => void;

  /**
   * Remove the activated record for this (projectId, templateId) entirely —
   * the inverse of `activateProtocol`, used by the §10.1 confirmation flow's
   * Undo. Idempotent: a no-op when no matching record exists.
   */
  deactivateProtocol: (projectId: string, templateId: string) => void;

  /** Mark a protocol as triggered (condition has fired). */
  markTriggered: (projectId: string, templateId: string) => void;

  /**
   * Record a steward response: sets lastLoggedAt + flips status back to
   * 'active' so the card disappears from the triggered panel.
   */
  logResponse: (projectId: string, templateId: string) => void;

  /** Hide from triggered panel for 24h (or until isoUntil). */
  defer: (projectId: string, templateId: string, isoUntil: string) => void;

  /** Suspend a protocol (still tracked, not triggered). */
  suspendProtocol: (projectId: string, templateId: string) => void;

  /**
   * Returns records for this project that are triggered AND not currently
   * deferred. Deferral is checked at read time — no timer required.
   */
  getTriggered: (projectId: string) => ActivatedProtocolRecord[];
}

function upsert(
  records: ActivatedProtocolRecord[],
  projectId: string,
  templateId: string,
  patch: Partial<ActivatedProtocolRecord>,
): ActivatedProtocolRecord[] {
  const existing = records.find(
    (r) => r.projectId === projectId && r.templateId === templateId,
  );
  if (existing) {
    return records.map((r) =>
      r.projectId === projectId && r.templateId === templateId
        ? { ...r, ...patch }
        : r,
    );
  }
  return [
    ...records,
    {
      templateId,
      projectId,
      status: 'active',
      activatedAt: new Date().toISOString(),
      ...patch,
    } satisfies ActivatedProtocolRecord,
  ];
}

/**
 * Plain selector for a single expected rate. Returns undefined when the
 * (projectId, templateId) pair has not been set. Selecting a primitive /
 * undefined value is referentially stable — no useMemo needed in hooks.
 */
export function selectExpectation(
  state: ProtocolState,
  projectId: string,
  templateId: string,
): ExpectedRate | undefined {
  return state.expectationsByProject[projectId]?.[templateId];
}

/**
 * useExpectation - reactive hook returning the expected rate for a
 * (projectId, templateId) pair, or undefined when unset. Selects a single
 * value (primitive / undefined), which is referentially stable under Zustand
 * v5 — no useMemo required here (contrast with useTriggeredProtocols which
 * derives an array and needs useMemo to avoid an infinite re-render loop).
 */
export function useExpectation(
  projectId: string,
  templateId: string,
): ExpectedRate | undefined {
  return useProtocolStore((state) =>
    selectExpectation(state, projectId, templateId),
  );
}

export const useProtocolStore = create<ProtocolState>()(
  persist(
    (set, get) => ({
      records: [],
      activations: [],
      expectationsByProject: {},
      instantiatedObjectiveIds: {},

      markObjectiveInstantiated: (projectId, objectiveId) =>
        set((s) => {
          const existing = s.instantiatedObjectiveIds[projectId] ?? [];
          if (existing.includes(objectiveId)) return {}; // idempotent no-op
          return {
            instantiatedObjectiveIds: {
              ...s.instantiatedObjectiveIds,
              [projectId]: [...existing, objectiveId],
            },
          };
        }),

      clearObjectiveInstantiation: (projectId, objectiveId) =>
        set((s) => {
          const existing = s.instantiatedObjectiveIds[projectId];
          if (!existing || !existing.includes(objectiveId)) return {}; // no-op
          return {
            instantiatedObjectiveIds: {
              ...s.instantiatedObjectiveIds,
              [projectId]: existing.filter((id) => id !== objectiveId),
            },
          };
        }),

      setExpectation: (projectId, templateId, rate) =>
        set((state) => ({
          expectationsByProject: {
            ...state.expectationsByProject,
            [projectId]: {
              ...(state.expectationsByProject[projectId] ?? {}),
              [templateId]: rate,
            },
          },
        })),

      recordActivation: (input) =>
        set((s) => {
          const activation: ProtocolActivation = {
            id: input.id ?? crypto.randomUUID(),
            projectId: input.projectId,
            templateId: input.templateId,
            severityTier: input.severityTier,
            confirmationStatus: input.confirmationStatus,
            recipeSnapshot: input.recipeSnapshot,
            activatedAt: input.activatedAt ?? new Date().toISOString(),
            triggerContext: input.triggerContext ?? 'act_proof_capture',
            ...(input.season !== undefined ? { season: input.season } : {}),
            ...(input.cycleNumber !== undefined
              ? { cycleNumber: input.cycleNumber }
              : {}),
            ...(input.weatherConditionAtActivation !== undefined
              ? {
                  weatherConditionAtActivation:
                    input.weatherConditionAtActivation,
                }
              : {}),
          };
          // Append-only: never mutate prior activations or `records`.
          return { activations: [...s.activations, activation] };
        }),

      getActivations: (projectId) =>
        get()
          .activations.filter((a) => a.projectId === projectId)
          .slice()
          .sort((a, b) => b.activatedAt.localeCompare(a.activatedAt)),

      activateProtocol: (projectId, templateId) =>
        set((s) => ({
          records: upsert(s.records, projectId, templateId, {
            status: 'active',
            deferredUntil: undefined,
          }),
        })),

      deactivateProtocol: (projectId, templateId) =>
        set((s) => ({
          records: s.records.filter(
            (r) =>
              !(r.projectId === projectId && r.templateId === templateId),
          ),
        })),

      markTriggered: (projectId, templateId) =>
        set((s) => ({
          records: upsert(s.records, projectId, templateId, {
            status: 'triggered',
            deferredUntil: undefined,
          }),
        })),

      logResponse: (projectId, templateId) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.projectId === projectId && r.templateId === templateId
              ? {
                  ...r,
                  status: 'active' as const,
                  lastLoggedAt: new Date().toISOString(),
                }
              : r,
          ),
        })),

      defer: (projectId, templateId, isoUntil) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.projectId === projectId && r.templateId === templateId
              ? { ...r, deferredUntil: isoUntil }
              : r,
          ),
        })),

      suspendProtocol: (projectId, templateId) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.projectId === projectId && r.templateId === templateId
              ? { ...r, status: 'suspended' as const }
              : r,
          ),
        })),

      getTriggered: (projectId) => {
        const now = new Date();
        return get().records.filter(
          (r) =>
            r.projectId === projectId &&
            r.status === 'triggered' &&
            (!r.deferredUntil || new Date(r.deferredUntil) <= now),
        );
      },
    }),
    {
      name: 'ogden-protocols',
      version: 4,
      // v1 -> v2: gain the empty `activations` slice while preserving `records`.
      // v2 -> v3: gain the empty `expectationsByProject` slice while preserving
      // both `records` and `activations`.
      // v3 -> v4: gain the empty `instantiatedObjectiveIds` slice (§10.1
      // instantiation marker) while preserving all prior slices. All migrations
      // are version-aware so prior users are not wiped. Persist re-merges the
      // action functions after migrate runs, so migrate only needs to return the
      // persisted data shape; cast through unknown (the store type includes
      // actions this object intentionally omits).
      migrate: (persisted, fromVersion) => {
        const p = (persisted ?? {}) as Partial<ProtocolState>;
        if (fromVersion < 2) {
          return {
            records: p.records ?? [],
            activations: [],
            expectationsByProject: {},
            instantiatedObjectiveIds: {},
          } as unknown as ProtocolState;
        }
        if (fromVersion < 3) {
          return {
            records: p.records ?? [],
            activations: p.activations ?? [],
            expectationsByProject: {},
            instantiatedObjectiveIds: {},
          } as unknown as ProtocolState;
        }
        if (fromVersion < 4) {
          return {
            records: p.records ?? [],
            activations: p.activations ?? [],
            expectationsByProject: p.expectationsByProject ?? {},
            instantiatedObjectiveIds: {},
          } as unknown as ProtocolState;
        }
        return p as unknown as ProtocolState;
      },
      partialize: (state) => ({
        records: state.records,
        activations: state.activations,
        expectationsByProject: state.expectationsByProject,
        instantiatedObjectiveIds: state.instantiatedObjectiveIds,
      }),
    },
  ),
);

rehydrateWithLogging(useProtocolStore);

/**
 * Stable empty result so consumers with no projectId (or no triggered records)
 * keep a referentially-stable array across renders.
 */
const EMPTY: ActivatedProtocolRecord[] = [];

/**
 * useTriggeredProtocols — reactive hook returning the project's triggered,
 * non-deferred protocol records.
 *
 * IMPORTANT: do NOT call `useProtocolStore((s) => s.getTriggered(id))` directly.
 * `getTriggered` runs `.filter()` and returns a fresh array reference on every
 * call; under Zustand v5 that new snapshot is read as a state change on each
 * render and drives an infinite re-render loop ("Maximum update depth
 * exceeded"). Here we select the reference-stable `records` array and derive the
 * filtered list in `useMemo`, so the result only changes when `records` or
 * `projectId` actually change. (`getTriggered` remains for imperative
 * `getState()` / console use.)
 */
export function useTriggeredProtocols(
  projectId: string | null,
): ActivatedProtocolRecord[] {
  const records = useProtocolStore((s) => s.records);
  return useMemo(() => {
    if (!projectId) return EMPTY;
    const now = new Date();
    return records.filter(
      (r) =>
        r.projectId === projectId &&
        r.status === 'triggered' &&
        (!r.deferredUntil || new Date(r.deferredUntil) <= now),
    );
  }, [records, projectId]);
}

/**
 * Plain selector: has this objective's instantiation overlay already surfaced?
 * Returns a boolean (referentially stable under Zustand v5 — no useMemo needed).
 */
export function selectObjectiveInstantiated(
  state: ProtocolState,
  projectId: string,
  objectiveId: string,
): boolean {
  return (state.instantiatedObjectiveIds[projectId] ?? []).includes(objectiveId);
}

/**
 * useObjectiveInstantiated — reactive hook for the §10.1 instantiation marker.
 * Selects a single boolean, so it is safe to use directly (contrast the array
 * selectors above which need useMemo to avoid a Zustand-v5 re-render loop).
 */
export function useObjectiveInstantiated(
  projectId: string | null,
  objectiveId: string | null,
): boolean {
  return useProtocolStore((s) =>
    projectId && objectiveId
      ? selectObjectiveInstantiated(s, projectId, objectiveId)
      : false,
  );
}

/** Stable empty result for activation consumers with no projectId. */
const EMPTY_ACTIVATIONS: ProtocolActivation[] = [];

/**
 * useProtocolActivations - reactive hook for a project's activations,
 * newest-first. Mirrors `useTriggeredProtocols`: it selects the stable
 * `activations` array and derives the filtered/sorted list in `useMemo`.
 * Do NOT call `useProtocolStore((s) => s.getActivations(id))` directly - that
 * returns a fresh array each render and drives a Zustand-v5 infinite loop
 * ("Maximum update depth exceeded"). `getActivations` remains for imperative
 * `getState()` use.
 */
export function useProtocolActivations(
  projectId: string | null,
): ProtocolActivation[] {
  const activations = useProtocolStore((s) => s.activations);
  return useMemo(() => {
    if (!projectId) return EMPTY_ACTIVATIONS;
    return activations
      .filter((a) => a.projectId === projectId)
      .slice()
      .sort((a, b) => b.activatedAt.localeCompare(a.activatedAt));
  }, [activations, projectId]);
}

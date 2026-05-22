/**
 * Regeneration plan store — steward-authored plans to revive a troubled
 * zone (compacted / barren / disturbed) into productive pasture or
 * silvopasture. One plan per LandZone (1:1).
 *
 * This store is the steward's own truth. It deliberately does NOT write
 * BuildPhase rows: the system-forced barren obligation
 * (regenerationForcing → runAutoDesign) is *adopted* by contributing this
 * plan's zoneId to the existing `acknowledgedRegenerationZoneIds` seam, not
 * duplicated here. Keeping the two models separate is the central
 * architectural decision (see plan with-regards-to-regenerating-*.md).
 *
 * Readiness is decided by the pure shared evaluator
 * (`@ogden/shared/regeneration`), not in this store: the gate is
 * `stewardReadinessConfirmedAt`, with `readinessOverride` as a recorded
 * escape hatch (steward sovereignty — never a hard lock).
 *
 * A zone may carry several plans (alternative pathways / re-plans). Exactly
 * one is *active* per zone (`activePlanIdByZone`); the gate, map overlay,
 * Observe CTA and banner all key on the active plan — the others are
 * scenario/history and never gate. The first plan created for a zone is
 * auto-active, so single-plan stewards see no behavioural change.
 *
 * Mirrors zoneStore.ts: persist(temporal(...)) with localStorage, standalone
 * accessor methods (getProjectPlans / getPlansForZone return fresh arrays —
 * never call them inside a Zustand selector;
 * see wiki/decisions/2026-04-26-zustand-selector-stability.md).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { temporal } from 'zundo';
import type { GroundCoverState, SuccessionStage } from './zoneStore.js';

export type RegenTargetState = 'pasture' | 'silvopasture';

export interface RegenThresholds {
  /** Target ground cover the steward is regenerating toward. */
  groundCover: GroundCoverState;
  /** Minimum successional stage that counts as recovered. */
  minSuccessionStage: SuccessionStage;
}

/**
 * Snapshot of the zone's resolved vegetation at plan creation. Mirrors
 * `ResolvedVegetation` (vegetationResolver) so the steward can always see
 * "where the land started" against where it is now.
 */
export interface RegenerationBaseline {
  groundCover: GroundCoverState | null;
  successionStage: SuccessionStage | null;
  capturedAt: string;
  source: 'override' | 'derived' | 'none';
}

/**
 * Optional silvopasture tree-canopy layer. Decoupled from the readiness
 * gate in v1: canopy is drawn on the timeline but never gates grazing.
 */
export interface SilvopastureCanopyConfig {
  speciesId: string;
  targetCanopyM: number;
  plantingYearOffset: number;
}

export interface RegenerationPlan {
  id: string;
  projectId: string;
  /** The LandZone this plan regenerates. 1:1. */
  zoneId: string;
  targetState: RegenTargetState;
  baseline: RegenerationBaseline;
  thresholds: RegenThresholds;
  /** Ordered ids from REGENERATION_METHODS the steward selected. */
  pathwayMethodIds: string[];
  /** ISO timestamp the pathway was started; anchors the projection. */
  startedAt: string | null;
  silvopastureCanopy?: SilvopastureCanopyConfig;
  /** The gate flip — set when the steward confirms observed readiness. */
  stewardReadinessConfirmedAt: string | null;
  /** Recorded escape hatch: steward placed livestock before confirming. */
  readinessOverride?: { at: string; reason: string };
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_REGEN_THRESHOLDS: RegenThresholds = {
  groundCover: 'thriving-grasses',
  minSuccessionStage: 'mid',
};

export interface CreatePlanInput {
  projectId: string;
  zoneId: string;
  baseline: RegenerationBaseline;
  targetState?: RegenTargetState;
  thresholds?: RegenThresholds;
  pathwayMethodIds?: string[];
}

interface RegenerationPlanState {
  plans: RegenerationPlan[];
  /** zoneId → the id of the plan that gates that zone. */
  activePlanIdByZone: Record<string, string>;

  createPlan: (input: CreatePlanInput) => RegenerationPlan;
  updatePlan: (id: string, updates: Partial<RegenerationPlan>) => void;
  deletePlan: (id: string) => void;

  /** Mark which plan a zone keys on (gate / overlay / Observe / banner). */
  setActivePlan: (zoneId: string, planId: string) => void;

  /** Anchor the projected timeline. Defaults `at` to now. */
  startPathway: (id: string, at?: string) => void;
  /** Flip the steward readiness gate. Defaults `at` to now. */
  confirmReadiness: (id: string, at?: string) => void;
  /** Record the escape hatch (steward placed livestock early). */
  recordOverride: (id: string, reason: string, at?: string) => void;

  /**
   * Returns a freshly-allocated array. **Do NOT call inside a Zustand
   * selector** — new snapshot every render → infinite loop.
   * See: wiki/decisions/2026-04-26-zustand-selector-stability.md
   */
  getProjectPlans: (projectId: string) => RegenerationPlan[];
  /** All plans targeting a zone, in creation order. Fresh array. */
  getPlansForZone: (zoneId: string) => RegenerationPlan[];
  /**
   * The active plan for a zone (the one that gates). Falls back to the
   * most-recently-created plan for the zone when no mapping exists.
   */
  getActivePlanForZone: (zoneId: string) => RegenerationPlan | undefined;
  /** Back-compat alias — resolves to the active plan for a zone. */
  getPlanForZone: (zoneId: string) => RegenerationPlan | undefined;
}

/**
 * Pure persist migration. v1 had no `activePlanIdByZone`; backfill it so
 * every existing (single) plan stays the active plan for its zone — zero
 * behavioural change for current data. Deterministic if a v1 zone somehow
 * held multiple plans: last in creation order wins.
 */
export function migrateRegenPlans(
  persisted: unknown,
  version: number,
): unknown {
  const state = (persisted ?? {}) as {
    plans?: Array<{ id?: unknown; zoneId?: unknown }>;
    activePlanIdByZone?: Record<string, string>;
  };
  const plans = Array.isArray(state.plans) ? state.plans : [];
  if (version >= 2 && state.activePlanIdByZone) {
    return { ...state, plans };
  }
  const activePlanIdByZone: Record<string, string> = {};
  for (const p of plans) {
    if (p && typeof p.zoneId === 'string' && typeof p.id === 'string') {
      activePlanIdByZone[p.zoneId] = p.id;
    }
  }
  return { ...state, plans, activePlanIdByZone };
}

function newId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `regen-${crypto.randomUUID()}`;
  }
  return `regen-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useRegenerationPlanStore = create<RegenerationPlanState>()(
  persist(
    temporal(
      (set, get) => ({
        plans: [],
        activePlanIdByZone: {},

        createPlan: (input) => {
          const now = new Date().toISOString();
          const plan: RegenerationPlan = {
            id: newId(),
            projectId: input.projectId,
            zoneId: input.zoneId,
            targetState: input.targetState ?? 'pasture',
            baseline: input.baseline,
            thresholds: input.thresholds ?? { ...DEFAULT_REGEN_THRESHOLDS },
            pathwayMethodIds: input.pathwayMethodIds ?? [],
            startedAt: null,
            stewardReadinessConfirmedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          set((s) => {
            const hasActive = !!s.activePlanIdByZone[input.zoneId];
            return {
              plans: [...s.plans, plan],
              activePlanIdByZone: hasActive
                ? s.activePlanIdByZone
                : { ...s.activePlanIdByZone, [input.zoneId]: plan.id },
            };
          });
          return plan;
        },

        setActivePlan: (zoneId, planId) =>
          set((s) => ({
            activePlanIdByZone: {
              ...s.activePlanIdByZone,
              [zoneId]: planId,
            },
          })),

        updatePlan: (id, updates) =>
          set((s) => ({
            plans: s.plans.map((p) =>
              p.id === id
                ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                : p,
            ),
          })),

        deletePlan: (id) =>
          set((s) => {
            const target = s.plans.find((p) => p.id === id);
            const plans = s.plans.filter((p) => p.id !== id);
            if (!target) return { plans };
            const zoneId = target.zoneId;
            if (s.activePlanIdByZone[zoneId] !== id) return { plans };
            const map = { ...s.activePlanIdByZone };
            const remaining = plans.filter((p) => p.zoneId === zoneId);
            if (remaining.length === 0) {
              delete map[zoneId];
            } else {
              const mostRecent = remaining.reduce((a, b) =>
                a.createdAt >= b.createdAt ? a : b,
              );
              map[zoneId] = mostRecent.id;
            }
            return { plans, activePlanIdByZone: map };
          }),

        startPathway: (id, at) =>
          set((s) => ({
            plans: s.plans.map((p) =>
              p.id === id
                ? {
                    ...p,
                    startedAt: at ?? new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          })),

        confirmReadiness: (id, at) =>
          set((s) => ({
            plans: s.plans.map((p) =>
              p.id === id
                ? {
                    ...p,
                    stewardReadinessConfirmedAt:
                      at ?? new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          })),

        recordOverride: (id, reason, at) =>
          set((s) => ({
            plans: s.plans.map((p) =>
              p.id === id
                ? {
                    ...p,
                    readinessOverride: {
                      at: at ?? new Date().toISOString(),
                      reason,
                    },
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          })),

        getProjectPlans: (projectId) =>
          get().plans.filter((p) => p.projectId === projectId),

        getPlansForZone: (zoneId) =>
          get().plans.filter((p) => p.zoneId === zoneId),

        getActivePlanForZone: (zoneId) => {
          const s = get();
          const activeId = s.activePlanIdByZone[zoneId];
          if (activeId) {
            const found = s.plans.find(
              (p) => p.id === activeId && p.zoneId === zoneId,
            );
            if (found) return found;
          }
          const forZone = s.plans.filter((p) => p.zoneId === zoneId);
          if (forZone.length === 0) return undefined;
          return forZone.reduce((a, b) =>
            a.createdAt >= b.createdAt ? a : b,
          );
        },

        getPlanForZone: (zoneId) => get().getActivePlanForZone(zoneId),
      }),
      { limit: 200 },
    ),
    {
      name: 'ogden-regen-plans',
      version: 2,
      migrate: (persisted, version) =>
        migrateRegenPlans(persisted, version) as RegenerationPlanState,
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
rehydrateWithLogging(useRegenerationPlanStore);

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenRegenerationPlanStore =
    useRegenerationPlanStore;
}

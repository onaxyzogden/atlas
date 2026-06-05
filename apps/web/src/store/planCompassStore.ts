/**
 * planCompassStore — per-project per-domain per-node evidence state for the
 * Plan Stage Compass (slice 3b+3c: rebased onto UniversalDomain).
 *
 * Mirrors observeCompassStore: the existing planHowChecksStore is a binary
 * checklist toggle; this store adds the evidence-verified gating layer the
 * compass needs (locked → evidence-in → verified) without changing live
 * Plan map behavior.
 *
 * Persist v1→v2: collapses legacy 15-id PlanModule keys to the 16
 * UniversalDomain ids. Three collision groups apply concat-with-offset:
 *   access-circulation   ← dynamic-layering + zone-circulation
 *   built-infrastructure ← structures-subsystems + machinery
 *   ecology              ← regeneration-monitor + habitat-allocation + biodiversity-monitor
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import type { UniversalDomain } from '@ogden/shared';
import { migrateByProjectModuleKeys, type MergeFn } from '@ogden/shared';
import type { PlanModule } from '../v3/plan/types.js';
import type {
  NodeEvidence,
  RawEvidenceMap,
} from '../v3/compass/compassGating.js';

type ModuleEvidence = Partial<Record<PlanModule, RawEvidenceMap>>;

/**
 * HOW-step counts at the moment of the v1→v2 cutover. Plan: every legacy
 * module = 3. Immutable migration constants — must NOT drift if
 * PLAN_MODULE_GUIDANCE.how is edited later.
 */
const HOW_STEP_COUNTS: Record<string, number> = {
  'goal-compass': 3,
  'dynamic-layering': 3,
  'water-management': 3,
  'zone-circulation': 3,
  'structures-subsystems': 3,
  'machinery': 3,
  'livestock': 3,
  'plant-systems': 3,
  'soil-fertility': 3,
  'cross-section-solar': 3,
  'phasing-budgeting': 3,
  'principle-verification': 3,
  'regeneration-monitor': 3,
  'habitat-allocation': 3,
  'biodiversity-monitor': 3,
};

/** Mock starting state — varied so the prototype shows every node state.
 *  Collision domains have legacy seed values concatenated with offset.
 *  - access-circulation: DL{0:V,1:E} + ZC{0:V}+3 = {0:V,1:E,3:V}
 *  - built-infrastructure: SS{0:E} + machinery{}+3 = {0:E}
 *  - ecology: regen{} + habitat{}+3 + biodiv{}+6 = {}
 */
const SEED: Readonly<Record<UniversalDomain, RawEvidenceMap>> = {
  'vision-intent':        { 0: 'verified', 1: 'verified', 2: 'evidence-in' }, // ← goal-compass
  'land-base':            {},
  'climate':              {},                                                  // ← cross-section-solar
  'topography':           {},
  'hydrology':            { 0: 'verified', 1: 'evidence-in' },                // ← water-management
  'soil':                 { 0: 'evidence-in' },                                // ← soil-fertility
  'ecology':              {},
  'plants-food':          { 0: 'verified' },                                   // ← plant-systems
  'animals-livestock':    {},                                                  // ← livestock
  'built-infrastructure': { 0: 'evidence-in' },                                // ← structures-subsystems + machinery
  'access-circulation':   { 0: 'verified', 1: 'evidence-in', 3: 'verified' }, // ← dynamic-layering + zone-circulation
  'energy-resources':     {},
  'people-governance':    {},
  'economics-capacity':   {},                                                  // ← phasing-budgeting
  'risk-compliance':      {},                                                  // ← principle-verification
  'monitoring-records':   {},
};

const EMPTY: RawEvidenceMap = {};

const compassMergeFn: MergeFn<RawEvidenceMap> = (_domain, parts) => {
  const out: RawEvidenceMap = {};
  let offset = 0;
  for (const { moduleId, value } of parts) {
    for (const [idxStr, status] of Object.entries(value)) {
      out[Number(idxStr) + offset] = status as NodeEvidence;
    }
    offset += HOW_STEP_COUNTS[moduleId] ?? 0;
  }
  return out;
};

/** Seed fallback for a domain, for callers computing many objectives at once
 *  (the wheel) without going through the store's per-call `rawFor`. */
export function planSeedFor(module: PlanModule): RawEvidenceMap {
  return SEED[module] ?? EMPTY;
}

export interface PlanCompassState {
  byProject: Record<string, ModuleEvidence>;
  /** Resolved evidence map for a domain — stored override or the SEED fallback. */
  rawFor: (projectId: string, module: PlanModule) => RawEvidenceMap;
  /** Mark a node as evidence-in (only meaningful once it is unlocked). */
  logEvidence: (projectId: string, module: PlanModule, index: number) => void;
  /** Mark a node verified — this is what unlocks the next node. */
  verify: (projectId: string, module: PlanModule, index: number) => void;
  /** Convenience: evidence-in → verified, otherwise → evidence-in. */
  advance: (projectId: string, module: PlanModule, index: number) => void;
  reset: (projectId: string, module?: PlanModule) => void;
}

function currentMap(
  s: PlanCompassState,
  projectId: string,
  module: PlanModule,
): RawEvidenceMap {
  return s.byProject[projectId]?.[module] ?? SEED[module] ?? EMPTY;
}

function write(
  s: PlanCompassState,
  projectId: string,
  module: PlanModule,
  next: RawEvidenceMap,
): Pick<PlanCompassState, 'byProject'> {
  const project = s.byProject[projectId] ?? {};
  return {
    byProject: {
      ...s.byProject,
      [projectId]: { ...project, [module]: next },
    },
  };
}

export const usePlanCompassStore = create<PlanCompassState>()(
  persist(
    (set, get) => ({
      byProject: {},
      rawFor: (projectId, module) => currentMap(get(), projectId, module),
      logEvidence: (projectId, module, index) =>
        set((s) => {
          const map = currentMap(s, projectId, module);
          return write(s, projectId, module, { ...map, [index]: 'evidence-in' });
        }),
      verify: (projectId, module, index) =>
        set((s) => {
          const map = currentMap(s, projectId, module);
          return write(s, projectId, module, { ...map, [index]: 'verified' });
        }),
      advance: (projectId, module, index) =>
        set((s) => {
          const map = currentMap(s, projectId, module);
          const next: NodeEvidence =
            map[index] === 'evidence-in' ? 'verified' : 'evidence-in';
          return write(s, projectId, module, { ...map, [index]: next });
        }),
      reset: (projectId, module) =>
        set((s) => {
          const project = s.byProject[projectId];
          if (!project) return s;
          if (!module) {
            const nextByProject = { ...s.byProject };
            delete nextByProject[projectId];
            return { byProject: nextByProject };
          }
          const nextProject = { ...project };
          delete nextProject[module];
          return { byProject: { ...s.byProject, [projectId]: nextProject } };
        }),
    }),
    {
      name: 'ogden-atlas-plan-compass',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          const migrated = migrateByProjectModuleKeys<RawEvidenceMap>(
            persisted,
            'plan',
            compassMergeFn,
          );
          if (migrated) {
            return {
              ...(persisted as object),
              byProject: migrated.byProject,
            } as PlanCompassState;
          }
          return { byProject: {} } as PlanCompassState;
        }
        return persisted as PlanCompassState;
      },
    },
  ),
);

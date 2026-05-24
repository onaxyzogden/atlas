/**
 * planCompassStore — per-project per-module per-node evidence state for the
 * Plan Stage Compass. Mirrors observeCompassStore: the existing
 * planHowChecksStore is a binary checklist toggle; this store adds the
 * evidence-verified gating layer the compass needs (locked → evidence-in →
 * verified) without changing live Plan map behavior.
 *
 * Prototype: seeded with mock evidence states (SEED) so the wheel reads as a
 * project mid-flight. Unmodified modules fall back to SEED per-module; the
 * first action on a module persists that module's map under the project.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlanModule } from '../v3/plan/types.js';
import type {
  NodeEvidence,
  RawEvidenceMap,
} from '../v3/compass/compassGating.js';

type ModuleEvidence = Partial<Record<PlanModule, RawEvidenceMap>>;

/** Mock starting state — varied so the prototype shows every node state. */
const SEED: Readonly<Record<PlanModule, RawEvidenceMap>> = {
  'goal-compass': { 0: 'verified', 1: 'verified', 2: 'evidence-in' },
  'dynamic-layering': { 0: 'verified', 1: 'evidence-in' },
  'water-management': { 0: 'verified', 1: 'evidence-in' },
  'zone-circulation': { 0: 'verified' },
  'structures-subsystems': { 0: 'evidence-in' },
  machinery: {},
  livestock: {},
  'plant-systems': { 0: 'verified' },
  'soil-fertility': { 0: 'evidence-in' },
  'cross-section-solar': {},
  'phasing-budgeting': {},
  'principle-verification': {},
  'regeneration-monitor': {},
  'habitat-allocation': {},
  'biodiversity-monitor': {},
};

const EMPTY: RawEvidenceMap = {};

/** Seed fallback for a module, for callers computing many objectives at once
 *  (the wheel) without going through the store's per-call `rawFor`. */
export function planSeedFor(module: PlanModule): RawEvidenceMap {
  return SEED[module] ?? EMPTY;
}

export interface PlanCompassState {
  byProject: Record<string, ModuleEvidence>;
  /** Resolved evidence map for a module — stored override or the SEED fallback. */
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
      version: 1,
      migrate: (persisted) => persisted as PlanCompassState,
    },
  ),
);

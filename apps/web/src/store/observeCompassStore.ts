/**
 * observeCompassStore — per-project per-module per-node evidence state for the
 * Stage Compass. The existing observeHowChecksStore is a binary checklist
 * toggle; this store adds the evidence-verified gating layer the compass needs
 * (locked → evidence-in → verified) without changing live map behavior.
 *
 * Prototype: seeded with mock evidence states (SEED) so the wheel reads as a
 * project mid-flight. Unmodified modules fall back to SEED per-module; the
 * first action on a module persists that module's map under the project.
 * Pattern mirrors observeHowChecksStore.ts.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ObserveModule } from '../v3/observe/types.js';
import type {
  NodeEvidence,
  RawEvidenceMap,
} from '../v3/compass/compassGating.js';

type ModuleEvidence = Partial<Record<ObserveModule, RawEvidenceMap>>;

/** Mock starting state — varied so the prototype shows every node state. */
const SEED: Readonly<Record<ObserveModule, RawEvidenceMap>> = {
  'human-context': { 0: 'verified', 1: 'verified', 2: 'evidence-in' },
  'built-environment': { 0: 'verified', 1: 'evidence-in' },
  'macroclimate-hazards': { 0: 'verified' },
  topography: { 0: 'verified', 1: 'evidence-in' },
  'earth-water-ecology': { 0: 'verified', 1: 'verified' },
  'sectors-zones': { 0: 'evidence-in' },
  'swot-synthesis': {},
};

const EMPTY: RawEvidenceMap = {};

/** Seed fallback for a module, for callers computing many objectives at once
 *  (the wheel) without going through the store's per-call `rawFor`. */
export function seedFor(module: ObserveModule): RawEvidenceMap {
  return SEED[module] ?? EMPTY;
}

export interface ObserveCompassState {
  byProject: Record<string, ModuleEvidence>;
  /** Resolved evidence map for a module — stored override or the SEED fallback. */
  rawFor: (projectId: string, module: ObserveModule) => RawEvidenceMap;
  /** Mark a node as evidence-in (only meaningful once it is unlocked). */
  logEvidence: (
    projectId: string,
    module: ObserveModule,
    index: number,
  ) => void;
  /** Mark a node verified — this is what unlocks the next node. */
  verify: (projectId: string, module: ObserveModule, index: number) => void;
  /** Convenience: evidence-in → verified, otherwise → evidence-in. */
  advance: (projectId: string, module: ObserveModule, index: number) => void;
  reset: (projectId: string, module?: ObserveModule) => void;
}

function currentMap(
  s: ObserveCompassState,
  projectId: string,
  module: ObserveModule,
): RawEvidenceMap {
  return s.byProject[projectId]?.[module] ?? SEED[module] ?? EMPTY;
}

function write(
  s: ObserveCompassState,
  projectId: string,
  module: ObserveModule,
  next: RawEvidenceMap,
): Pick<ObserveCompassState, 'byProject'> {
  const project = s.byProject[projectId] ?? {};
  return {
    byProject: {
      ...s.byProject,
      [projectId]: { ...project, [module]: next },
    },
  };
}

export const useObserveCompassStore = create<ObserveCompassState>()(
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
      name: 'ogden-atlas-observe-compass',
      version: 1,
      migrate: (persisted) => persisted as ObserveCompassState,
    },
  ),
);

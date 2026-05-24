/**
 * actCompassStore — per-project per-module per-node evidence state for the
 * Act Stage Compass. Mirrors observeCompassStore / planCompassStore: the
 * existing actHowChecksStore is a binary checklist toggle; this store adds the
 * evidence-verified gating layer the compass needs (locked → evidence-in →
 * verified) without changing live Act map behavior.
 *
 * Prototype: seeded with mock evidence states (SEED) so the wheel reads as a
 * project mid-flight. Unmodified modules fall back to SEED per-module; the
 * first action on a module persists that module's map under the project.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActModule } from '../v3/act/types.js';
import type {
  NodeEvidence,
  RawEvidenceMap,
} from '../v3/compass/compassGating.js';

type ModuleEvidence = Partial<Record<ActModule, RawEvidenceMap>>;

/** Mock starting state — varied so the prototype shows every node state. */
const SEED: Readonly<Record<ActModule, RawEvidenceMap>> = {
  tracker: { 0: 'verified', 1: 'verified', 2: 'evidence-in' },
  build: { 0: 'verified', 1: 'evidence-in' },
  maintain: { 0: 'verified', 1: 'evidence-in' },
  livestock: { 0: 'verified' },
  harvest: { 0: 'evidence-in' },
  review: {},
  network: {},
  schedule: {},
};

const EMPTY: RawEvidenceMap = {};

/** Seed fallback for a module, for callers computing many objectives at once
 *  (the wheel) without going through the store's per-call `rawFor`. */
export function actSeedFor(module: ActModule): RawEvidenceMap {
  return SEED[module] ?? EMPTY;
}

export interface ActCompassState {
  byProject: Record<string, ModuleEvidence>;
  /** Resolved evidence map for a module — stored override or the SEED fallback. */
  rawFor: (projectId: string, module: ActModule) => RawEvidenceMap;
  /** Mark a node as evidence-in (only meaningful once it is unlocked). */
  logEvidence: (projectId: string, module: ActModule, index: number) => void;
  /** Mark a node verified — this is what unlocks the next node. */
  verify: (projectId: string, module: ActModule, index: number) => void;
  /** Convenience: evidence-in → verified, otherwise → evidence-in. */
  advance: (projectId: string, module: ActModule, index: number) => void;
  reset: (projectId: string, module?: ActModule) => void;
}

function currentMap(
  s: ActCompassState,
  projectId: string,
  module: ActModule,
): RawEvidenceMap {
  return s.byProject[projectId]?.[module] ?? SEED[module] ?? EMPTY;
}

function write(
  s: ActCompassState,
  projectId: string,
  module: ActModule,
  next: RawEvidenceMap,
): Pick<ActCompassState, 'byProject'> {
  const project = s.byProject[projectId] ?? {};
  return {
    byProject: {
      ...s.byProject,
      [projectId]: { ...project, [module]: next },
    },
  };
}

export const useActCompassStore = create<ActCompassState>()(
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
      name: 'ogden-atlas-act-compass',
      version: 1,
      migrate: (persisted) => persisted as ActCompassState,
    },
  ),
);

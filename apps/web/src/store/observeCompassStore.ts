/**
 * observeCompassStore — per-project per-domain per-node evidence state for
 * the Stage Compass (slice 3b+3c: rebased onto UniversalDomain).
 *
 * The existing observeHowChecksStore is a binary checklist toggle; this
 * store adds the evidence-verified gating layer the compass needs
 * (locked → evidence-in → verified) without changing live map behavior.
 *
 * Prototype: seeded with mock evidence states (SEED) so the wheel reads as
 * a project mid-flight. Unmodified domains fall back to SEED per-domain;
 * the first action on a domain persists that domain's map under the
 * project.
 *
 * Persist v1→v2: collapses legacy 7-id ObserveModule keys to the 16
 * UniversalDomain ids. Observe is collision-free, so the mergeFn is a
 * pass-through (always called with parts.length === 1; the migration util
 * bypasses mergeFn for single-part inputs).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import type { UniversalDomain } from '@ogden/shared';
import { migrateByProjectModuleKeys, type MergeFn } from '@ogden/shared';
import type { ObserveModule } from '../v3/observe/types.js';
import type {
  NodeEvidence,
  RawEvidenceMap,
} from '../v3/compass/compassGating.js';

type ModuleEvidence = Partial<Record<ObserveModule, RawEvidenceMap>>;

/**
 * HOW-step counts at the moment of the v1→v2 cutover. Immutable migration
 * constants — must NOT drift if MODULE_GUIDANCE.how is edited later.
 */
const HOW_STEP_COUNTS: Record<string, number> = {
  'human-context': 3,
  'built-environment': 4,
  'macroclimate-hazards': 2,
  'topography': 3,
  'earth-water-ecology': 3,
  'sectors-zones': 2,
  'swot-synthesis': 2,
};

/** Mock starting state — varied so the prototype shows every node state. */
const SEED: Readonly<Record<UniversalDomain, RawEvidenceMap>> = {
  'vision-intent':        {},
  'land-base':            {},
  'climate':              { 0: 'verified' },                              // ← macroclimate-hazards
  'topography':           { 0: 'verified', 1: 'evidence-in' },
  'hydrology':            { 0: 'verified', 1: 'verified' },               // ← earth-water-ecology
  'soil':                 {},
  'ecology':              {},
  'plants-food':          {},
  'animals-livestock':    {},
  'built-infrastructure': { 0: 'verified', 1: 'evidence-in' },            // ← built-environment
  'access-circulation':   { 0: 'evidence-in' },                           // ← sectors-zones
  'energy-resources':     {},
  'people-governance':    { 0: 'verified', 1: 'verified', 2: 'evidence-in' }, // ← human-context
  'economics-capacity':   {},
  'risk-compliance':      {},
  'monitoring-records':   {},                                             // ← swot-synthesis
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
export function seedFor(module: ObserveModule): RawEvidenceMap {
  return SEED[module] ?? EMPTY;
}

export interface ObserveCompassState {
  byProject: Record<string, ModuleEvidence>;
  /** Resolved evidence map for a domain — stored override or the SEED fallback. */
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
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          const migrated = migrateByProjectModuleKeys<RawEvidenceMap>(
            persisted,
            'observe',
            compassMergeFn,
          );
          if (migrated) {
            return {
              ...(persisted as object),
              byProject: migrated.byProject,
            } as ObserveCompassState;
          }
          return { byProject: {} } as ObserveCompassState;
        }
        return persisted as ObserveCompassState;
      },
    },
  ),
);

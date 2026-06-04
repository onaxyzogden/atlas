/**
 * actCompassStore — per-project per-domain per-node evidence state for the
 * Act Stage Compass (slice 3b+3c: rebased onto UniversalDomain).
 *
 * Mirrors observeCompassStore / planCompassStore: the existing
 * actHowChecksStore is a binary checklist toggle; this store adds the
 * evidence-verified gating layer the compass needs.
 *
 * Persist v1→v2: collapses legacy 8-id ActModule keys to the 16
 * UniversalDomain ids. Two collision groups apply concat-with-offset:
 *   built-infrastructure ← build + maintain
 *   monitoring-records   ← tracker + review
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import type { UniversalDomain } from '@ogden/shared';
import { migrateByProjectModuleKeys, type MergeFn } from '@ogden/shared';
import type { ActModule } from '../v3/act/types.js';
import type {
  NodeEvidence,
  RawEvidenceMap,
} from '../v3/compass/compassGating.js';

type ModuleEvidence = Partial<Record<ActModule, RawEvidenceMap>>;

/**
 * HOW-step counts at the moment of the v1→v2 cutover. Act: every legacy
 * module = 3. Immutable migration constants.
 */
const HOW_STEP_COUNTS: Record<string, number> = {
  'tracker': 3,
  'build': 3,
  'maintain': 3,
  'livestock': 3,
  'harvest': 3,
  'review': 3,
  'network': 3,
  'schedule': 3,
};

/** Mock starting state — varied so the prototype shows every node state.
 *  Collision domains have legacy seed values concatenated with offset.
 *  - built-infrastructure: build{0:V,1:E} + maintain{0:V,1:E}+3 = {0:V,1:E,3:V,4:E}
 *  - monitoring-records: tracker{0:V,1:V,2:E} + review{}+3 = {0:V,1:V,2:E}
 */
const SEED: Readonly<Record<UniversalDomain, RawEvidenceMap>> = {
  'vision-intent':        {},
  'land-base':            {},
  'climate':              {},
  'topography':           {},
  'hydrology':            {},
  'soil':                 {},
  'ecology':              {},
  'plants-food':          { 0: 'evidence-in' },                                // ← harvest
  'animals-livestock':    { 0: 'verified' },                                    // ← livestock
  'built-infrastructure': { 0: 'verified', 1: 'evidence-in', 3: 'verified', 4: 'evidence-in' }, // ← build + maintain
  'access-circulation':   {},
  'energy-resources':     {},
  'people-governance':    {},                                                   // ← network
  'economics-capacity':   {},                                                   // ← schedule
  'risk-compliance':      {},
  'monitoring-records':   { 0: 'verified', 1: 'verified', 2: 'evidence-in' },  // ← tracker + review
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
export function actSeedFor(module: ActModule): RawEvidenceMap {
  return SEED[module] ?? EMPTY;
}

export interface ActCompassState {
  byProject: Record<string, ModuleEvidence>;
  /** Resolved evidence map for a domain — stored override or the SEED fallback. */
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
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          const migrated = migrateByProjectModuleKeys<RawEvidenceMap>(
            persisted,
            'act',
            compassMergeFn,
          );
          if (migrated) {
            return {
              ...(persisted as object),
              byProject: migrated.byProject,
            } as ActCompassState;
          }
          return { byProject: {} } as ActCompassState;
        }
        return persisted as ActCompassState;
      },
    },
  ),
);

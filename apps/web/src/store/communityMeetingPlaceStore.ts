/**
 * communityMeetingPlaceStore — the steward's explicit communal-meeting-place
 * designation, per ecovillage project.
 *
 * This is the only NEW persisted state introduced by the meeting-marker
 * feature. It is intentionally tiny: a `projectId → CommunityMeetingPlace` map
 * recording where the steward says the community gathers (a reference to an
 * existing gathering structure, or a directly dropped pin). The marker's
 * meetings/decisions themselves come from the existing `communityWorkPlanStore`
 * — this store carries no work, only the place.
 *
 * Persistence mirrors `builtEnvironmentStoreV2`: Zustand + `persist` over the
 * IndexedDB backend (`idbPersistStorage`), key `ogden-community-meeting-place`.
 * Client-first by design — it is deliberately NOT registered in `syncManifest`
 * (server sync of the designation is a documented out-of-scope follow-on, same
 * posture as `builtEnvironmentStoreV2`). No `temporal`/undo: a single-value
 * designation needs no history timeline.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import type { CommunityMeetingPlace } from '../features/community/communityMeetingPlace.js';

export type { CommunityMeetingPlace };

export const COMMUNITY_MEETING_PLACE_STORAGE_KEY =
  'ogden-community-meeting-place';

export interface CommunityMeetingPlaceState {
  /** projectId → the steward's designated meeting place. */
  placesByProject: Record<string, CommunityMeetingPlace>;

  /**
   * Transient (NOT persisted — see `partialize`) "drop a pin" arming flag.
   * Holds the projectId whose next map click designates a point meeting place,
   * or `null` when no placement is armed. The work-panel control arms it; the
   * map-mounted `CommunityMeetingPlaceDrawHandler` consumes it.
   */
  armedProjectId: string | null;

  /** Designate (or replace) the meeting place for a project. */
  setMeetingPlace: (projectId: string, place: CommunityMeetingPlace) => void;
  /** Remove the designation for a project (back to "not set"). */
  clearMeetingPlace: (projectId: string) => void;
  /** Arm "drop a pin" for a project — the next map click sets a point place. */
  armMeetingPinPlacement: (projectId: string) => void;
  /** Cancel an armed "drop a pin". */
  disarmMeetingPinPlacement: () => void;
}

export const useCommunityMeetingPlaceStore =
  create<CommunityMeetingPlaceState>()(
    persist(
      (set) => ({
        placesByProject: {},
        armedProjectId: null,

        setMeetingPlace: (projectId, place) =>
          set((s) => ({
            placesByProject: { ...s.placesByProject, [projectId]: place },
            // Setting a place always disarms any pending pin placement.
            armedProjectId: null,
          })),

        clearMeetingPlace: (projectId) =>
          set((s) => {
            if (!(projectId in s.placesByProject)) return s;
            const next = { ...s.placesByProject };
            delete next[projectId];
            return { placesByProject: next };
          }),

        armMeetingPinPlacement: (projectId) =>
          set({ armedProjectId: projectId }),

        disarmMeetingPinPlacement: () => set({ armedProjectId: null }),
      }),
      {
        name: COMMUNITY_MEETING_PLACE_STORAGE_KEY,
        storage: idbPersistStorage,
        version: 1,
        partialize: (state) => ({ placesByProject: state.placesByProject }),
      },
    ),
  );

rehydrateWithLogging(useCommunityMeetingPlaceStore);

/** Selector: the meeting place for a project, or `undefined` when unset. */
export function selectMeetingPlace(
  state: CommunityMeetingPlaceState,
  projectId: string,
): CommunityMeetingPlace | undefined {
  return state.placesByProject[projectId];
}

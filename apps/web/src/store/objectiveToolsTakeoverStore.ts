/**
 * objectiveToolsTakeoverStore -- generic, objective-scoped "open the map with
 * this objective's tools" focused-mode flag. The shell-agnostic generalization
 * of the two bespoke survey takeovers (slopeSurveyStore / vegetationSurveyStore):
 * any Plan (and, later, Act) draw/place objective whose tool catalog
 * (getObjectiveActTools) resolves to >= 1 MAP tool can flip the shell into a
 * focused map+tools mode via this store, instead of each objective needing its
 * own bespoke takeover store/panel.
 *
 * Ephemeral session UI only -- there is NO persisted slice. The survey stores
 * persist their drawn `byProject` geometry (and register it in syncManifest);
 * this store carries none of that -- only the transient takeover flag -- so it
 * is intentionally NOT wrapped in `persist` and NOT in syncManifest.
 *
 * Mutual exclusion (only one focused mode active at a time): `open` first
 * `close()`s the slope + vegetation survey takeovers. The import is
 * one-directional (this store imports the survey stores; they never import this
 * one), so there is no cycle. The reverse hand-off -- a survey "Open map
 * survey" button closing THIS takeover -- is wired at those call sites
 * (SlopeSurveySummary / VegetationSurveySummary), which already import their
 * survey store and can import this one without a cycle.
 */

import { create } from 'zustand';
import { useSlopeSurveyStore } from './slopeSurveyStore.js';
import { useVegetationSurveyStore } from './vegetationSurveyStore.js';

interface ObjectiveToolsTakeoverState {
  /** Is the generic objective-tools takeover open. */
  active: boolean;
  activeProjectId: string | null;
  activeObjectiveId: string | null;
  /**
   * Open the focused map+tools takeover for a (project, objective). Closes any
   * open survey takeover first so the two never fight over the right rail.
   */
  open: (projectId: string, objectiveId: string) => void;
  /** Close the takeover. Disarming the active map tool is the caller's concern. */
  close: () => void;
}

export const useObjectiveToolsTakeoverStore =
  create<ObjectiveToolsTakeoverState>()((set) => ({
    active: false,
    activeProjectId: null,
    activeObjectiveId: null,

    open: (projectId, objectiveId) => {
      // Mutual exclusion: a bespoke survey takeover and the generic takeover
      // must never be active together (they share the right rail + the armed
      // map tool). Close both survey stores before opening this one.
      useSlopeSurveyStore.getState().close();
      useVegetationSurveyStore.getState().close();
      set({
        active: true,
        activeProjectId: projectId,
        activeObjectiveId: objectiveId,
      });
    },

    close: () =>
      set({ active: false, activeProjectId: null, activeObjectiveId: null }),
  }));

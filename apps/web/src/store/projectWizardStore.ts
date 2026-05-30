/**
 * projectWizardStore — Phase 2 / Slice 2.1.
 *
 * Holds the ephemeral pre-create state captured by Step 1 of the
 * Project Creation Wizard (name, country, units, projectType, draft
 * boundary) BEFORE a real project record exists. The instant Step 1
 * "Next" fires, the draft is promoted via `projectStore.createProject`
 * + `updateProject(boundary)` and this store is cleared — Steps 2/3
 * write straight to `project.metadata` (visionProfile, team) via
 * `updateProject`.
 *
 * Persisted (key `ogden-project-wizard`) so a steward who closes the
 * tab mid-Step-1 can resume at the same fresh URL. Distinct from
 * `planStratumStore` / `cyclicalReviewStore` — different lifetime (pre-
 * create only) and different key namespace.
 *
 * No coupling to `projectStore`: this store knows nothing about
 * `LocalProject`. The Step 1 "Next" handler reads `draft`, calls
 * `createProject` + `updateProject`, then calls `clear()` here.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Country, ParcelBoundaryGeojson, ProjectType } from '@ogden/shared';
import { rehydrateWithLogging } from './persistRehydrate.js';

const PERSIST_KEY = 'ogden-project-wizard';

export type WizardUnits = 'metric' | 'imperial';

export interface ProjectWizardDraft {
  name: string;
  country: Country;
  units: WizardUnits;
  projectType?: ProjectType;
  /** Polygon / FeatureCollection captured in Step 1 (draw or upload). */
  draftBoundary?: ParcelBoundaryGeojson;
}

const EMPTY_DRAFT: ProjectWizardDraft = Object.freeze({
  name: '',
  country: 'US',
  units: 'metric',
});

interface ProjectWizardState {
  draft: ProjectWizardDraft;

  setName: (name: string) => void;
  setCountry: (country: Country) => void;
  setUnits: (units: WizardUnits) => void;
  setProjectType: (projectType: ProjectType | undefined) => void;
  setBoundary: (boundary: ParcelBoundaryGeojson | undefined) => void;
  /** Drop the entire draft (called on Step 1 "Next" after persist). */
  clear: () => void;
}

export const useProjectWizardStore = create<ProjectWizardState>()(
  persist(
    (set) => ({
      draft: EMPTY_DRAFT,

      setName: (name) =>
        set((s) => ({ draft: { ...s.draft, name } })),

      setCountry: (country) =>
        set((s) => ({ draft: { ...s.draft, country } })),

      setUnits: (units) =>
        set((s) => ({ draft: { ...s.draft, units } })),

      setProjectType: (projectType) =>
        set((s) => ({ draft: { ...s.draft, projectType } })),

      setBoundary: (draftBoundary) =>
        set((s) => ({ draft: { ...s.draft, draftBoundary } })),

      clear: () => set({ draft: EMPTY_DRAFT }),
    }),
    {
      name: PERSIST_KEY,
      version: 1,
      partialize: (state) => ({ draft: state.draft }),
    },
  ),
);

rehydrateWithLogging(useProjectWizardStore);

/** Selector that returns the current draft (stable identity when unchanged). */
export function selectWizardDraft(state: ProjectWizardState): ProjectWizardDraft {
  return state.draft;
}

/** True when Step 1 has the minimum to create a real project (name + boundary). */
export function isStep1Ready(draft: ProjectWizardDraft): boolean {
  return draft.name.trim().length > 0 && draft.draftBoundary != null;
}

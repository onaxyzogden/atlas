/**
 * Vision store — manages vision-specific data per project:
 * phase notes, moontrance identity fields, and concept overlay state.
 *
 * Persisted to localStorage. Sprint 3+ will sync with the API.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type PhaseKey = 'year1' | 'years2to3' | 'years4plus';

export interface VisionPhaseNote {
  phaseKey: PhaseKey;
  label: string;
  notes: string;
}

export interface MoontranceIdentity {
  prayerPavilionIntent: string;
  quietZoneDesignation: string;
  hospitalitySequenceNotes: string;
  mensCohortZoneIntent: string;
  waterLandWorshipIntegration: string;
}

export interface Milestone {
  id: string;
  phaseId: string;
  note: string;
  targetDate: string | null;
}

export interface VisionData {
  projectId: string;
  phaseNotes: VisionPhaseNote[];
  moontranceIdentity: MoontranceIdentity | null;
  conceptOverlayVisible: boolean;
  milestones: Milestone[];
}

const DEFAULT_PHASE_NOTES: Omit<VisionPhaseNote, 'notes'>[] = [
  { phaseKey: 'year1', label: 'Year 1' },
  { phaseKey: 'years2to3', label: 'Years 2\u20133' },
  { phaseKey: 'years4plus', label: 'Years 4+' },
];

const EMPTY_MOONTRANCE: MoontranceIdentity = {
  prayerPavilionIntent: '',
  quietZoneDesignation: '',
  hospitalitySequenceNotes: '',
  mensCohortZoneIntent: '',
  waterLandWorshipIntegration: '',
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface VisionState {
  visions: VisionData[];

  /** Returns a stable stored reference (`.find()` on `visions[]`) — SAFE to call
   *  inside a Zustand selector. */
  getVisionData: (projectId: string) => VisionData | undefined;
  ensureDefaults: (projectId: string) => void;
  updatePhaseNote: (projectId: string, phaseKey: PhaseKey, notes: string) => void;
  updateMoontranceField: (
    projectId: string,
    field: keyof MoontranceIdentity,
    value: string,
  ) => void;
  ensureMoontranceIdentity: (projectId: string) => void;
  clearMoontranceIdentity: (projectId: string) => void;
  setConceptOverlayVisible: (projectId: string, visible: boolean) => void;
  addMilestone: (projectId: string, milestone: Milestone) => void;
  updateMilestone: (projectId: string, milestoneId: string, updates: Partial<Omit<Milestone, 'id'>>) => void;
  deleteMilestone: (projectId: string, milestoneId: string) => void;
}

export const useVisionStore = create<VisionState>()(
  persist(
    (set, get) => ({
      visions: [],

      getVisionData: (projectId) =>
        get().visions.find((v) => v.projectId === projectId),

      ensureDefaults: (projectId) => {
        const existing = get().visions.find((v) => v.projectId === projectId);
        if (existing) return;
        set((s) => ({
          visions: [
            ...s.visions,
            {
              projectId,
              phaseNotes: DEFAULT_PHASE_NOTES.map((p) => ({ ...p, notes: '' })),
              moontranceIdentity: null,
              conceptOverlayVisible: false,
              milestones: [],
            },
          ],
        }));
      },

      updatePhaseNote: (projectId, phaseKey, notes) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? {
                  ...v,
                  phaseNotes: v.phaseNotes.map((p) =>
                    p.phaseKey === phaseKey ? { ...p, notes } : p,
                  ),
                }
              : v,
          ),
        })),

      updateMoontranceField: (projectId, field, value) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId && v.moontranceIdentity
              ? {
                  ...v,
                  moontranceIdentity: { ...v.moontranceIdentity, [field]: value },
                }
              : v,
          ),
        })),

      ensureMoontranceIdentity: (projectId) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId && !v.moontranceIdentity
              ? { ...v, moontranceIdentity: { ...EMPTY_MOONTRANCE } }
              : v,
          ),
        })),

      clearMoontranceIdentity: (projectId) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? { ...v, moontranceIdentity: null }
              : v,
          ),
        })),

      setConceptOverlayVisible: (projectId, visible) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? { ...v, conceptOverlayVisible: visible }
              : v,
          ),
        })),

      addMilestone: (projectId, milestone) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? { ...v, milestones: [...v.milestones, milestone] }
              : v,
          ),
        })),

      updateMilestone: (projectId, milestoneId, updates) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? { ...v, milestones: v.milestones.map((m) => m.id === milestoneId ? { ...m, ...updates } : m) }
              : v,
          ),
        })),

      deleteMilestone: (projectId, milestoneId) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? { ...v, milestones: v.milestones.filter((m) => m.id !== milestoneId) }
              : v,
          ),
        })),
    }),
    {
      name: 'ogden-vision',
      version: 2,
      partialize: (state) => ({ visions: state.visions }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { visions: VisionData[] };
        if (version < 2) {
          state.visions = state.visions.map((v) => ({
            ...v,
            milestones: (v as VisionData).milestones ?? [],
          }));
        }
        return state;
      },
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useVisionStore.persist.rehydrate();

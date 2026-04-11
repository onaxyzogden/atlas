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

export interface VisionData {
  projectId: string;
  phaseNotes: VisionPhaseNote[];
  moontranceIdentity: MoontranceIdentity | null;
  conceptOverlayVisible: boolean;
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
    }),
    {
      name: 'ogden-vision',
      version: 1,
      partialize: (state) => ({ visions: state.visions }),
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useVisionStore.persist.rehydrate();

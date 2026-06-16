/**
 * Vision store — manages vision-specific data per project:
 * phase notes, moontrance identity fields, and concept overlay state.
 *
 * Persisted to localStorage. Sprint 3+ will sync with the API.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

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

/**
 * Domain relationship of a steward to the land/project. Distinct from the
 * app-permission `ProjectRole` (owner/designer/reviewer/viewer) carried by
 * `project_members`. A person can be a project `owner` and a `co-steward`,
 * or a `viewer` who is the `lead` steward — the two axes are independent.
 */
export type StewardRelationship = 'lead' | 'co-steward' | 'family' | 'ally' | 'contributor';

/**
 * Per-steward profile OVERLAY — keyed by member `userId` in
 * `VisionData.stewardProfiles`. Identity (name/email/app-role) is NOT stored
 * here; it comes from `memberStore` (the live `project_members` roster). These
 * are the rich human-context fields layered on top per steward. All optional so
 * an in-flight survey can save mid-fill.
 */
export interface StewardProfile {
  /** Domain relationship to the project (distinct from app ProjectRole). */
  relationship?: StewardRelationship;
  age?: number;
  occupation?: string;
  lifestyle?: 'active' | 'sedentary';
  /** Hours/week this steward expects to invest during initial establishment. */
  maintenanceHrsInitial?: number;
  /** Hours/week this steward expects to invest after establishment. */
  maintenanceHrsOngoing?: number;
  /** Free-form budget label (e.g. "$15k/yr", "self-funded"). */
  budget?: string;
  skills?: string[];
  /** Hybrid model: this steward's vision in their own words (personal). */
  personalVision?: string;
  /** Hybrid model: this steward's own experience goals (personal). */
  personalExperienceGoals?: string[];
  /**
   * What this steward needs from the project/land to participate well --
   * support, accommodations, resources, learning. The one explicit steward
   * variable that previously had no home (steward data audit, 2026-06-14).
   */
  needs?: string[];
  /* ---- Structured Team Object fields (Tier-0 / Stratum-1 restructure, ----
   * 2026-06-16). All optional and additive, so existing persisted profiles
   * read them as undefined with NO migration (the `needs?` precedent). The
   * canonical supply baseline (observe/human-context) reads these. */
  /** Residential relationship to the site (drives 0.6 household scope). */
  residentStatus?: 'live-in' | 'off-site' | 'visiting';
  /** Functional team role (s1-steward-c2), distinct from domain `relationship`. */
  teamRole?: string;
  /** Free-form allocated share of the team workload (e.g. "full-time", "40%"). */
  roleAllocation?: string;
  /** Decision-rights level per steward domain (s1-steward-c3). Domain key -> level token. */
  decisionRights?: Record<string, string>;
  /** Capabilities per steward domain (s1-steward-c4). Domain key -> skill labels. */
  capabilityByDomain?: Record<string, string[]>;
  /*
   * NOTE: seasonal labour (s1-steward-c5) lives in the c5 FormValue captured by
   * LabourInventoryCapture -- the canonical labour record -- so it is NOT
   * duplicated here. Capital (s1-steward-c6) lives in the c6 band answerSpec
   * (budget axes) plus the team-level `StewardTeam.fundingSources` (permitted
   * channels), so there is no per-person capital field. Keeping a single source
   * of truth for each avoids drift in the Tier-6 supply baseline.
   */
}

/**
 * SHARED, project-level vision package. The land has one collective vision;
 * individual stewards record their *personal* vision/goals on their
 * StewardProfile (hybrid model). Extracted from the old single-steward shape.
 */
export interface SharedVision {
  /** Collective vision statement in the project's own words. */
  statement?: string;
  coreFunctions?: string[];
  /** Shared experience goals (vs each steward's personalExperienceGoals). */
  experienceGoals?: string[];
  successMetrics?: string[];
  principles?: string[];
  guidingValues?: string[];
  constraints?: string[];
  /** Moodboard uploads — base64 data URLs, kept small (resized client-side). */
  moodboardImages?: MoodboardImage[];
  /** Concept image — single base64 data URL. */
  conceptImageDataUrl?: string;
}

export interface MoodboardImage {
  id: string;
  dataUrl: string;
  caption?: string;
}

/**
 * Project-level Steward/Team Object container (Tier-0 / Stratum-1 restructure,
 * 2026-06-16). Holds team-level declarations that are NOT per-person: the
 * governance framework, the team's identified skill gaps, and the permitted
 * capital funding sources. Per-person capacity/rights/capability live on each
 * `StewardProfile`. Always present ({}-init like `sharedVision`); its fields are
 * optional. The supply baseline reads `stewardProfiles`; this container carries
 * the collective team declarations surfaced alongside it.
 */
export interface StewardTeam {
  /** Team decision-making / governance framework (s1-steward-c8). */
  governance?: string;
  /** Capability gaps the team has identified to resource later (s1-steward-c7). */
  skillGaps?: string[];
  /** Permitted capital funding sources at the team level (s1-steward-c6). */
  fundingSources?: string[];
}

/** Per-steward string-list fields editable via setStewardProfileList. */
export type StewardProfileListField = 'skills' | 'personalExperienceGoals' | 'needs';

/** Shared-vision string-list fields editable via setSharedVisionList. */
export type SharedVisionListField =
  | 'coreFunctions'
  | 'experienceGoals'
  | 'successMetrics'
  | 'principles'
  | 'guidingValues'
  | 'constraints';

/**
 * Indigenous + regional context — Phase 4a. Captures place-name history,
 * cultural challenges/strengths, and the local network registry the Hub
 * surfaces under Module 1.
 */
export interface RegionalContext {
  indigenousNames?: string[];
  culturalChallenges?: string[];
  culturalStrengths?: string[];
  localNetwork?: Array<{ id: string; name: string; type: string; contact?: string }>;
}

export interface VisionData {
  projectId: string;
  phaseNotes: VisionPhaseNote[];
  moontranceIdentity: MoontranceIdentity | null;
  conceptOverlayVisible: boolean;
  milestones: Milestone[];
  /** Phase 4a additions — optional, populated by Regional cards. */
  regional?: RegionalContext;
  /**
   * Multi-steward overlays, keyed by member `userId`. The roster (who the
   * stewards are) lives in `memberStore`; this map holds the rich profile
   * fields per steward. Use `useStewardRoster` to join the two.
   */
  stewardProfiles: Record<string, StewardProfile>;
  /** Project-level shared vision package (hybrid model). */
  sharedVision: SharedVision;
  /** Project-level Steward/Team Object container (governance, skill gaps, funding). */
  stewardTeam: StewardTeam;
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

  // Multi-steward overlays (keyed by member userId)
  updateStewardProfile: (projectId: string, userId: string, patch: Partial<StewardProfile>) => void;
  removeStewardProfile: (projectId: string, userId: string) => void;
  setStewardProfileList: (projectId: string, userId: string, field: StewardProfileListField, items: string[]) => void;

  // Regional context
  updateRegional: (projectId: string, patch: Partial<RegionalContext>) => void;
  addNetworkContact: (projectId: string, contact: { id: string; name: string; type: string; contact?: string }) => void;
  removeNetworkContact: (projectId: string, contactId: string) => void;

  // Shared vision package (project-level) — lists, moodboard, concept image
  updateSharedVision: (projectId: string, patch: Partial<SharedVision>) => void;
  setSharedVisionList: (projectId: string, field: SharedVisionListField, items: string[]) => void;
  addMoodboardImage: (projectId: string, image: MoodboardImage) => void;
  removeMoodboardImage: (projectId: string, imageId: string) => void;
  setConceptImage: (projectId: string, dataUrl: string | undefined) => void;

  // Steward/Team Object container (project-level)
  updateStewardTeam: (projectId: string, patch: Partial<StewardTeam>) => void;
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
              stewardProfiles: {},
              sharedVision: {},
              stewardTeam: {},
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

      updateStewardProfile: (projectId, userId, patch) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? {
                  ...v,
                  stewardProfiles: {
                    ...v.stewardProfiles,
                    [userId]: { ...(v.stewardProfiles[userId] ?? {}), ...patch },
                  },
                }
              : v,
          ),
        })),

      removeStewardProfile: (projectId, userId) =>
        set((s) => ({
          visions: s.visions.map((v) => {
            if (v.projectId !== projectId) return v;
            const next = { ...v.stewardProfiles };
            delete next[userId];
            return { ...v, stewardProfiles: next };
          }),
        })),

      setStewardProfileList: (projectId, userId, field, items) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? {
                  ...v,
                  stewardProfiles: {
                    ...v.stewardProfiles,
                    [userId]: { ...(v.stewardProfiles[userId] ?? {}), [field]: items },
                  },
                }
              : v,
          ),
        })),

      updateRegional: (projectId, patch) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? { ...v, regional: { ...(v.regional ?? {}), ...patch } }
              : v,
          ),
        })),

      addNetworkContact: (projectId, contact) =>
        set((s) => ({
          visions: s.visions.map((v) => {
            if (v.projectId !== projectId) return v;
            const list = v.regional?.localNetwork ?? [];
            return { ...v, regional: { ...(v.regional ?? {}), localNetwork: [...list, contact] } };
          }),
        })),

      removeNetworkContact: (projectId, contactId) =>
        set((s) => ({
          visions: s.visions.map((v) => {
            if (v.projectId !== projectId || !v.regional?.localNetwork) return v;
            return {
              ...v,
              regional: {
                ...v.regional,
                localNetwork: v.regional.localNetwork.filter((c) => c.id !== contactId),
              },
            };
          }),
        })),

      updateSharedVision: (projectId, patch) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? { ...v, sharedVision: { ...v.sharedVision, ...patch } }
              : v,
          ),
        })),

      setSharedVisionList: (projectId, field, items) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? { ...v, sharedVision: { ...v.sharedVision, [field]: items } }
              : v,
          ),
        })),

      addMoodboardImage: (projectId, image) =>
        set((s) => ({
          visions: s.visions.map((v) => {
            if (v.projectId !== projectId) return v;
            const list = v.sharedVision.moodboardImages ?? [];
            return {
              ...v,
              sharedVision: { ...v.sharedVision, moodboardImages: [...list, image] },
            };
          }),
        })),

      removeMoodboardImage: (projectId, imageId) =>
        set((s) => ({
          visions: s.visions.map((v) => {
            if (v.projectId !== projectId || !v.sharedVision.moodboardImages) return v;
            return {
              ...v,
              sharedVision: {
                ...v.sharedVision,
                moodboardImages: v.sharedVision.moodboardImages.filter((m) => m.id !== imageId),
              },
            };
          }),
        })),

      setConceptImage: (projectId, dataUrl) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? { ...v, sharedVision: { ...v.sharedVision, conceptImageDataUrl: dataUrl } }
              : v,
          ),
        })),

      updateStewardTeam: (projectId, patch) =>
        set((s) => ({
          visions: s.visions.map((v) =>
            v.projectId === projectId
              ? { ...v, stewardTeam: { ...v.stewardTeam, ...patch } }
              : v,
          ),
        })),
    }),
    {
      name: 'ogden-vision',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 5,
      partialize: (state) => ({ visions: state.visions }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { visions: Array<Record<string, unknown>> };
        if (version < 2) {
          state.visions = state.visions.map((v) => ({
            ...v,
            milestones: (v.milestones as Milestone[]) ?? [],
          }));
        }
        if (version < 3) {
          // No structural change — new optional fields default to undefined.
        }
        if (version < 4) {
          // Multi-steward reshape. The old single `steward` object is
          // disposable (per the "no migration" decision); we drop it and
          // initialise the new roster-overlay + shared-vision containers.
          state.visions = state.visions.map((v) => {
            const { steward: _drop, ...rest } = v;
            return {
              ...rest,
              stewardProfiles: (v.stewardProfiles as Record<string, StewardProfile>) ?? {},
              sharedVision: (v.sharedVision as SharedVision) ?? {},
            };
          });
        }
        if (version < 5) {
          // Shell-seed the project-level Steward/Team Object container on
          // existing records. The per-person StewardProfile fields added in the
          // same restructure are all-optional and need no migration (they
          // default to undefined); only this always-present container does.
          state.visions = state.visions.map((v) => ({
            ...v,
            stewardTeam: (v.stewardTeam as StewardTeam) ?? {},
          }));
        }
        return state as unknown as { visions: VisionData[] };
      },
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
rehydrateWithLogging(useVisionStore);

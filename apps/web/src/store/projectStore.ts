/**
 * Project store — manages all projects client-side with localStorage persistence.
 * In Sprint 3+ this will sync with the API. For now, everything is local.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type { CreateProjectInput, ProjectMetadata } from '@ogden/shared';
import { cascadeDeleteProject } from './cascadeDelete.js';
import { cascadeCloneProject } from './cascadeClone.js';
import { geodataCache } from '../lib/geodataCache.js';
import { api } from '../lib/apiClient.js';
import {
  seedBuiltinObserveData,
  BUILTIN_PROJECT_NARRATIVE,
} from '../data/builtinSampleObserveData.js';
import { useSiteDataStore } from './siteDataStore.js';
import type { MockLayerResult } from '@ogden/shared/scoring';

// ─── Local project type (extends CreateProjectInput with runtime fields) ───

export interface LocalProject {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'shared' | 'candidate';
  projectType: string | null;
  country: string; // ISO country code — 'US' and 'CA' are the fully-wired jurisdictions; others use Sprint BG global fallbacks (Copernicus DEM, OpenMeteo/WorldClim, ESA WorldCover, WDPA, SoilGrids)
  provinceState: string | null;
  conservationAuthId: string | null;
  address: string | null;
  parcelId: string | null;
  acreage: number | null;
  dataCompletenessScore: number | null;
  hasParcelBoundary: boolean;
  /** True for system-owned builtin sample projects (migration 017). Read-only. */
  isBuiltin?: boolean;
  createdAt: string;
  updatedAt: string;
  // Sprint 2 additions
  parcelBoundaryGeojson: GeoJSON.FeatureCollection | null;
  ownerNotes: string | null;
  zoningNotes: string | null;
  accessNotes: string | null;
  waterRightsNotes: string | null;
  visionStatement: string | null;
  units: 'metric' | 'imperial';
  attachments: ProjectAttachment[];
  // Long-tail intake metadata (projects.metadata jsonb on the server).
  metadata?: ProjectMetadata;
  // Sprint 3 — server-assigned UUID after backend sync (undefined = not yet synced)
  serverId?: string;
  /**
   * Per-project zone reach thresholds, in metres. Defines what counts
   * as Zone-1 (close, ≤ closeM) and Zone-2 (medium, closeM–mediumM)
   * for proximity readouts on this project. Unset on most projects —
   * read via `getZoneThresholds(project)` which falls back to the
   * canonical defaults { closeM: 25, mediumM: 75 }.
   *
   * Project-level rather than card-level because zone reach is a
   * property of the land + the steward's body + the cart they
   * actually use, not a UI preference. A steep hillside has a
   * different Zone-1 than flat ground.
   */
  zoneThresholds?: { closeM: number; mediumM: number };
  /**
   * Anchor date the Goal Compass scheduler uses to place generated
   * phase tasks on concrete calendar dates. Optional — when unset,
   * `scheduleTasksToCalendar` falls back to the first day of the
   * current month at generation time. ISO YYYY-MM-DD.
   */
  startDate?: string | null;
  /**
   * Which Plan-stage shell the steward sees: the new 7-tier spine
   * (OLOS Plan Navigation Spec v1) or the legacy module bar. Per-project
   * so legacy projects with `MTC_SEED` keep their module shape, while
   * new projects open straight into the tier spine. Read via
   * `getPlanShellMode(project)` which applies the defaulting rules.
   */
  planShellMode?: PlanShellMode;
  /**
   * Which Act-stage shell the steward sees: the new field-action
   * dashboard (OLOS Act Command Center Spec v1, Phase 3) or the legacy
   * command-centre module shell. Per-project so existing module-bar
   * projects keep their carousel UX while new projects land on View B.
   * Read via `getActShellMode(project)` which applies the defaulting
   * rules.
   */
  actShellMode?: ActShellMode;
}

/**
 * Which Plan-stage navigation shell a project renders. `tier-spine` is
 * the OLOS Plan Navigation Spec v1 default for new projects; `module-bar`
 * is the legacy module-driven shell preserved behind a toggle so the
 * 52 existing module cards remain reachable during the Phase 1–7
 * migration. Removed in Phase 7 once every card has been folded into
 * a tier objective via `legacyCardSectionId`.
 */
export type PlanShellMode = 'tier-spine' | 'module-bar';

/**
 * Canonical accessor for a project's Plan shell mode. Explicit per-
 * project values win; otherwise builtin samples (MTC, "351 House")
 * default to `module-bar` so their hand-seeded module content keeps
 * rendering, and every other project defaults to `tier-spine`.
 */
export function getPlanShellMode(
  project: Pick<LocalProject, 'planShellMode' | 'isBuiltin'>,
): PlanShellMode {
  if (project.planShellMode) return project.planShellMode;
  if (project.isBuiltin) return 'module-bar';
  return 'tier-spine';
}

/**
 * Which Act-stage navigation shell a project renders. `field-action` is
 * the OLOS Act Command Center Spec v1 default for new projects;
 * `command-centre` is the legacy module-driven shell preserved behind a
 * toggle so existing module-bar carousels remain reachable during the
 * Phase 3 migration. Removed in Phase 7 once every legacy module card
 * has been retired.
 */
export type ActShellMode = 'field-action' | 'command-centre';

/**
 * Canonical accessor for a project's Act shell mode. Explicit per-
 * project values win; otherwise builtin samples (MTC, "351 House")
 * default to `command-centre` so their hand-seeded module content
 * keeps rendering, and every other project defaults to `field-action`.
 */
export function getActShellMode(
  project: Pick<LocalProject, 'actShellMode' | 'isBuiltin'>,
): ActShellMode {
  if (project.actShellMode) return project.actShellMode;
  if (project.isBuiltin) return 'command-centre';
  return 'field-action';
}

/**
 * Canonical default zone reach thresholds for proximity readouts.
 * Centralised so a future steward request to widen the defaults is a
 * one-line change. Per-project overrides via `setZoneThresholds`.
 */
export const DEFAULT_ZONE_THRESHOLDS = {
  closeM: 25,
  mediumM: 75,
} as const;

/**
 * Canonical accessor for a project's zone reach thresholds. Falls
 * back to `DEFAULT_ZONE_THRESHOLDS` when the project hasn't been
 * tuned. Cards that surface Zone-1 / Zone-2 framing should read via
 * this selector so default changes propagate to unmigrated projects.
 */
export function getZoneThresholds(
  project: Pick<LocalProject, 'zoneThresholds'>,
): { closeM: number; mediumM: number } {
  return project.zoneThresholds ?? DEFAULT_ZONE_THRESHOLDS;
}

/**
 * Default steward design-horizon (years). Drives the TemporalScrubSlider's
 * "↺" snap target when no per-project override is set. Centralised so a
 * future change to e.g. 25 years is one line.
 */
export const DEFAULT_DESIGN_HORIZON_YEARS = 20;

/**
 * Canonical accessor for a project's design-horizon. Falls back to
 * DEFAULT_DESIGN_HORIZON_YEARS when the steward hasn't pinned one.
 * Mirrors `getZoneThresholds`.
 */
export function getDesignHorizon(
  project: Pick<LocalProject, 'metadata'>,
): number {
  const v = project.metadata?.designHorizonYears;
  return typeof v === 'number' && v > 0 ? v : DEFAULT_DESIGN_HORIZON_YEARS;
}

/**
 * Needs & Yields graph-edge authoring (Rec #1 closeout, 2026-05-13).
 * `designStatus` defaults to 'draft' until the steward advances it via
 * canAdvanceToReadyForReview. `allowOrphanOutputs` is the per-project
 * escape hatch from the 2026-04-28 ADR — surfaced prominently in the
 * project header when set so it remains a deliberate choice.
 */
export type DesignStatus = 'draft' | 'ready-for-review' | 'approved';
export const DEFAULT_DESIGN_STATUS: DesignStatus = 'draft';

export function getDesignStatus(
  project: Pick<LocalProject, 'metadata'>,
): DesignStatus {
  return project.metadata?.designStatus ?? DEFAULT_DESIGN_STATUS;
}

export function getAllowOrphanOutputs(
  project: Pick<LocalProject, 'metadata'>,
): boolean {
  return project.metadata?.allowOrphanOutputs ?? false;
}

export interface ProjectAttachment {
  id: string;
  filename: string;
  type: 'kml' | 'kmz' | 'geojson' | 'shapefile' | 'photo' | 'document' | 'other';
  size: number;
  addedAt: string;
  /** For geospatial files, the parsed GeoJSON. For photos/docs, a data URL or blob URL. */
  data: unknown | null;
}

interface ProjectState {
  projects: LocalProject[];
  activeProjectId: string | null;

  // Derived
  activeProject: LocalProject | null;

  // Actions
  createProject: (input: CreateProjectInput) => LocalProject;
  updateProject: (id: string, updates: Partial<LocalProject>) => void;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  unarchiveProject: (id: string) => Promise<void>;
  /**
   * Duplicate an existing project — clones the project metadata + parcel
   * boundary + all design-intent entities (zones, structures, paths,
   * utilities, crops, paddocks, phases). Returns the new project, or `null`
   * if the source id is unknown. Spec: §1 "Duplicate project from template".
   */
  duplicateProject: (sourceId: string, overrideName?: string) => LocalProject | null;
  setActiveProject: (id: string | null) => void;
  addAttachment: (projectId: string, attachment: ProjectAttachment) => void;
  removeAttachment: (projectId: string, attachmentId: string) => void;
  /**
   * Set this project's zone reach thresholds. Caller is responsible
   * for validation (closeM ∈ (0, 500], mediumM ∈ (closeM, 500]); the
   * store stores whatever it's given. Pass `clearZoneThresholds` to
   * revert to defaults.
   */
  setZoneThresholds: (
    projectId: string,
    thresholds: { closeM: number; mediumM: number },
  ) => void;
  /** Strip the field so the project falls back to defaults. */
  clearZoneThresholds: (projectId: string) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      get activeProject() {
        const state = get();
        return state.projects.find((p) => p.id === state.activeProjectId) ?? null;
      },

      createProject: (input) => {
        const now = new Date().toISOString();
        const project: LocalProject = {
          id: generateId(),
          name: input.name,
          description: input.description ?? null,
          status: 'active',
          projectType: input.projectType ?? null,
          country: input.country ?? 'US',
          provinceState: input.provinceState ?? null,
          conservationAuthId: null,
          address: input.address ?? null,
          parcelId: input.parcelId ?? null,
          acreage: null,
          dataCompletenessScore: null,
          hasParcelBoundary: false,
          createdAt: now,
          updatedAt: now,
          parcelBoundaryGeojson: null,
          ownerNotes: null,
          zoningNotes: null,
          accessNotes: null,
          waterRightsNotes: null,
          visionStatement: null,
          units: input.units ?? 'metric',
          attachments: [],
          metadata: input.metadata,
        };
        set((state) => ({
          projects: [...state.projects, project],
          activeProjectId: project.id,
        }));
        return project;
      },

      updateProject: (id, updates) => {
        const target = get().projects.find((p) => p.id === id);
        // Builtin sample projects are read-only for narrative content (vision,
        // owner notes, etc.) — but a freshly-drawn parcel boundary is a per-user
        // *map customization*, not a content edit. Carve those fields out so
        // the steward can re-trace the parcel on a builtin sample without the
        // write being silently dropped.
        if (target?.isBuiltin) {
          const allowedKeys: (keyof LocalProject)[] = [
            'parcelBoundaryGeojson',
            'hasParcelBoundary',
            'metadata',
            // UI preference, not narrative content — must be settable
            // on builtin samples too so the steward can flip between
            // tier-spine and module-bar on the demo project.
            'planShellMode',
            // Same rationale as planShellMode — Act shell mode is a
            // per-steward UI choice, not narrative content.
            'actShellMode',
          ];
          const filtered = Object.fromEntries(
            Object.entries(updates).filter(([k]) =>
              allowedKeys.includes(k as keyof LocalProject),
            ),
          ) as Partial<LocalProject>;
          if (Object.keys(filtered).length === 0) return;
          // Boundary FC now persisted directly via zustand persist (see
          // partialize note + ADDENDUM 6). No IDB write here.
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === id
                ? { ...p, ...filtered, updatedAt: new Date().toISOString() }
                : p,
            ),
          }));
          return;
        }
        // Boundary FC now persisted directly via zustand persist (see
        // partialize note + ADDENDUM 6). No IDB write here.
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
          ),
        }));
      },

      deleteProject: async (id) => {
        // Builtin sample projects are read-only — silently no-op on delete.
        const target = get().projects.find((p) => p.id === id);
        if (target?.isBuiltin) return;
        if (target?.serverId) {
          try {
            await api.projects.delete(target.serverId);
          } catch (err) {
            console.warn('[OGDEN] deleteProject API failed, removing locally:', err);
          }
        }
        cascadeDeleteProject(id);
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        }));
      },

      archiveProject: async (id) => {
        const target = get().projects.find((p) => p.id === id);
        if (!target || target.isBuiltin) return;
        if (target.serverId) {
          try {
            await api.projects.archive(target.serverId);
          } catch (err) {
            console.warn('[OGDEN] archiveProject API failed, mutating locally:', err);
          }
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, status: 'archived', updatedAt: new Date().toISOString() }
              : p,
          ),
        }));
      },

      unarchiveProject: async (id) => {
        const target = get().projects.find((p) => p.id === id);
        if (!target || target.isBuiltin) return;
        if (target.serverId) {
          try {
            await api.projects.unarchive(target.serverId);
          } catch (err) {
            console.warn('[OGDEN] unarchiveProject API failed, mutating locally:', err);
          }
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, status: 'active', updatedAt: new Date().toISOString() }
              : p,
          ),
        }));
      },

      duplicateProject: (sourceId, overrideName) => {
        const source = get().projects.find((p) => p.id === sourceId);
        if (!source) return null;
        const now = new Date().toISOString();
        const newId = generateId();
        // Deep-clone metadata. Drop serverId (the new project hasn't synced)
        // and reset attachments — re-uploading parsed blobs would double-fill
        // IndexedDB without the user opting in.
        const {
          id: _sourceIdField,
          serverId: _sourceServerId,
          createdAt: _sourceCreatedAt,
          updatedAt: _sourceUpdatedAt,
          attachments: _sourceAttachments,
          parcelBoundaryGeojson: sourceBoundary,
          ...rest
        } = source;
        const clone: LocalProject = {
          ...rest,
          id: newId,
          name: overrideName ?? `${source.name} (Copy)`,
          status: 'active',
          createdAt: now,
          updatedAt: now,
          attachments: [],
          parcelBoundaryGeojson: sourceBoundary,
          // metadata is a structured object — shallow-copy is enough since
          // it's treated as immutable downstream.
          metadata: source.metadata ? { ...source.metadata } : undefined,
        };
        set((state) => ({
          projects: [...state.projects, clone],
        }));
        // Replicate the boundary blob in IndexedDB under the new id, and
        // clone every design-intent entity scoped to the source.
        if (sourceBoundary) {
          geodataCache.put(`boundary:${newId}`, sourceBoundary).catch((err) => {
            console.warn('[OGDEN] Failed to cache cloned boundary:', err);
          });
        }
        cascadeCloneProject(sourceId, newId);
        return clone;
      },

      setActiveProject: (id) => set({ activeProjectId: id }),

      addAttachment: (projectId, attachment) => {
        // Persist parsed geospatial data to IndexedDB
        if (attachment.data && (attachment.type === 'geojson' || attachment.type === 'kml')) {
          geodataCache.put(`attachment:${projectId}:${attachment.id}`, attachment.data).catch((err) => {
            console.warn('[OGDEN] Failed to cache attachment:', err);
          });
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, attachments: [...p.attachments, attachment], updatedAt: new Date().toISOString() }
              : p,
          ),
        }));
      },

      removeAttachment: (projectId, attachmentId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  attachments: p.attachments.filter((a) => a.id !== attachmentId),
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        })),

      setZoneThresholds: (projectId, thresholds) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, zoneThresholds: thresholds, updatedAt: new Date().toISOString() }
              : p,
          ),
        })),

      clearZoneThresholds: (projectId) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            const { zoneThresholds: _drop, ...rest } = p;
            return { ...rest, updatedAt: new Date().toISOString() } as LocalProject;
          }),
        })),
    }),
    {
      name: 'ogden-projects',
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 3) {
          const projects = (state.projects ?? []) as Record<string, unknown>[];
          state.projects = projects.map((p) => ({
            ...p,
            visionStatement: (p as Record<string, unknown>).visionStatement ?? null,
          }));
        }
        if (version < 4) {
          // No data transform — `zoneThresholds` stays undefined on
          // existing projects and reads canonical defaults via
          // `getZoneThresholds(project)`. Leaving the field absent
          // means future default changes (e.g. 25→30) propagate to
          // unmigrated projects automatically.
        }
        return state;
      },
      // Strip large geospatial blobs (parsed attachments) from localStorage to
      // prevent quota issues. Parcel boundary FCs are small (~1-10 KB) so they
      // ride directly in localStorage like designElementsStore does in PLAN
      // — single source of truth, no IDB-restore race window. See ADDENDUM 6.
      partialize: (state) => ({
        projects: state.projects.map((p) => ({
          ...p,
          attachments: p.attachments.map((a) => ({
            ...a,
            // Parsed geospatial data stored in IndexedDB under key "attachment:<id>"
            data: null,
          })),
        })),
        activeProjectId: state.activeProjectId,
      }),
    },
  ),
);

// On hydration, fetch the public builtin sample(s) from the API and merge
// into the local store. This runs for every visitor — authenticated or not
// — so the home page always shows the canonical "351 House — Atlas Sample"
// even before sign-in. The legacy hard-coded local seed has been removed in
// favour of this single source of truth.
//
// Boundary FCs ride along the rehydrated `projects[]` from localStorage
// directly (see partialize). The previous IDB-restore sequencing (ADDENDA
// 3) is no longer needed — see ADDENDUM 6.
useProjectStore.persist.onFinishHydration(() => {
  seedMtcDemo();
  void hydrateBuiltins();
});

// Moontrance Creek demo project. The Plan and Act stages expose a
// `/v3/project/mtc/...` route whose `projectId` is the literal slug
// `'mtc'` — it predates the builtin-samples pipeline and is not a
// real server project. Seed it on hydrate as an `isBuiltin` row keyed
// by `'mtc'` so `updateProject('mtc', …)` writes route through the
// builtin allowlist (parcel boundary + metadata) instead of silently
// dropping. Idempotent.
export const MTC_SEED: LocalProject = {
  id: 'mtc',
  name: 'Moontrance Creek',
  description: null,
  status: 'active',
  projectType: null,
  country: 'CA',
  provinceState: 'ON',
  conservationAuthId: null,
  address: null,
  parcelId: null,
  acreage: null,
  dataCompletenessScore: null,
  hasParcelBoundary: false,
  isBuiltin: true,
  createdAt: '2026-05-13T00:00:00.000Z',
  updatedAt: '2026-05-13T00:00:00.000Z',
  parcelBoundaryGeojson: null,
  ownerNotes: null,
  zoningNotes: null,
  accessNotes: null,
  waterRightsNotes: null,
  visionStatement: null,
  units: 'metric',
  attachments: [],
};

function seedMtcDemo(): void {
  const existing = useProjectStore.getState().projects.find((p) => p.id === 'mtc');
  if (existing) return;
  useProjectStore.setState((state) => ({
    projects: [...state.projects, MTC_SEED],
  }));
}

// Local fallback used when the API is unreachable (e.g. dev server not
// running, offline). Mirrors the canonical builtin from migration 017 so
// every visitor — including unauthenticated ones with no API — sees a
// populated sample on the home page. Kept in sync by hand.
// Sample parcel polygon — same coordinates as migration 017, wrapped in a
// FeatureCollection so it matches the shape MapView and the rest of the
// app expect from `LocalProject.parcelBoundaryGeojson`.
const LOCAL_BUILTIN_BOUNDARY: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-79.70636, 43.50401],
          [-79.70364, 43.50401],
          [-79.70364, 43.50599],
          [-79.70636, 43.50599],
          [-79.70636, 43.50401],
        ]],
      },
    },
  ],
};

// Snake_case summaries — mirror migration 018's canonical jsonb keys.
// Used only when /projects/builtins is unreachable (e.g. signed-out user
// with the API stopped); the API path always wins when available.
const LOCAL_BUILTIN_FALLBACK_LAYERS: MockLayerResult[] = [
  {
    layerType: 'elevation',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2024-08-15',
    sourceApi: 'NRCan HRDEM',
    attribution: 'Natural Resources Canada (offline fallback)',
    summary: {
      min_elevation_m: 240.1,
      max_elevation_m: 268.4,
      mean_elevation_m: 254.7,
      mean_slope_deg: 4.2,
      max_slope_deg: 11.6,
      predominant_aspect: 'SW',
    },
  },
  {
    layerType: 'climate',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2021-12-31',
    sourceApi: 'ECCC normals 1991–2020',
    attribution: 'Environment and Climate Change Canada (offline fallback)',
    summary: {
      annual_precip_mm: 870,
      growing_season_days: 156,
      growing_degree_days: 2860,
      hardiness_zone: '5b',
      annual_temp_mean_c: 7.8,
      koppen_classification: 'Dfb',
      first_frost_date: '2025-10-15',
      last_frost_date: '2025-05-05',
    },
  },
];

const LOCAL_BUILTIN_FALLBACK = {
  id: '00000000-0000-0000-0000-0000005a3791',
  name: '351 House — Atlas Sample',
  description: 'Halton Hills homestead — regenerative land design for a 12-acre parcel on the Niagara Escarpment edge. Mixed Carolinian forest, agricultural fields, and seasonal creek.',
  status: 'active' as const,
  projectType: 'homestead',
  country: 'CA',
  provinceState: 'ON',
  conservationAuthId: null,
  address: '351 Glenashton Dr, Oakville, ON',
  parcelId: null,
  acreage: 12,
  dataCompletenessScore: null,
  hasParcelBoundary: true,
  parcelBoundaryGeojson: LOCAL_BUILTIN_BOUNDARY,
  isBuiltin: true,
  layers: LOCAL_BUILTIN_FALLBACK_LAYERS,
};

interface BuiltinRow {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'shared' | 'candidate';
  projectType: string | null;
  country: string;
  provinceState: string | null;
  conservationAuthId: string | null;
  address: string | null;
  parcelId: string | null;
  acreage: number | null;
  dataCompletenessScore: number | null;
  hasParcelBoundary: boolean;
  /**
   * Parcel boundary. The API returns a raw GeoJSON geometry (from
   * `ST_AsGeoJSON`); the local fallback ships a FeatureCollection. We
   * normalize to FeatureCollection inside `applyBuiltinsToStore` before
   * writing into the store.
   */
  parcelBoundaryGeojson?:
    | GeoJSON.FeatureCollection
    | GeoJSON.Geometry
    | null;
  isBuiltin: boolean;
  createdAt?: string;
  updatedAt?: string;
  /**
   * Tier-1 layer summaries for this builtin. Populated by the public
   * `/projects/builtins` endpoint (migration 018 canonical snake_case
   * keys preserved by hand-mapping in the API handler — *not* routed
   * through `toCamelCase`). Falls back to `LOCAL_BUILTIN_FALLBACK_LAYERS`
   * when the API is unreachable.
   */
  layers?: MockLayerResult[];
}

function asFeatureCollection(
  raw: GeoJSON.FeatureCollection | GeoJSON.Geometry | null | undefined,
): GeoJSON.FeatureCollection | null {
  if (!raw) return null;
  if ((raw as GeoJSON.FeatureCollection).type === 'FeatureCollection') {
    return raw as GeoJSON.FeatureCollection;
  }
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: raw as GeoJSON.Geometry }],
  };
}

function applyBuiltinsToStore(builtins: BuiltinRow[]): void {
  const now = new Date().toISOString();
  // Snapshot the current store BEFORE we filter/replace so we can preserve
  // local-only state across re-seed: the existing local UUID (so IndexedDB
  // boundary:<id> entries remain reachable) and any user-drawn parcel
  // boundary that diverges from the canonical builtin geometry.
  const existingByServerId = new Map<string, LocalProject>();
  for (const p of useProjectStore.getState().projects) {
    if (p.serverId) existingByServerId.set(p.serverId, p);
  }
  // Build the LocalProject list outside setState so we can re-use the
  // generated local ids when seeding the per-project observe stores.
  const incoming: LocalProject[] = builtins.map((sp) => {
    const apiBoundary = asFeatureCollection(sp.parcelBoundaryGeojson);
    const existing = existingByServerId.get(sp.id);
    // Preserve a user-customized boundary across reloads. We treat ANY
    // non-null in-store FC whose stringified geometry differs from the
    // API's canonical FC as "user-drawn" — JSON equality is good enough
    // (geometries originate from turf/MapboxDraw with stable coord order).
    const userDrew =
      existing?.parcelBoundaryGeojson != null &&
      JSON.stringify(existing.parcelBoundaryGeojson) !== JSON.stringify(apiBoundary);
    const boundary = userDrew ? existing!.parcelBoundaryGeojson : apiBoundary;
    return {
    // Reuse the existing local id when one exists for this serverId so
    // that boundary:<id> entries already in IndexedDB remain valid; only
    // mint a fresh UUID for first-seen builtins.
    id: existing?.id ?? crypto.randomUUID(),
    name: sp.name,
    description: sp.description,
    status: sp.status,
    projectType: sp.projectType,
    country: sp.country,
    provinceState: sp.provinceState,
    conservationAuthId: sp.conservationAuthId,
    address: sp.address,
    parcelId: sp.parcelId,
    acreage: sp.acreage,
    dataCompletenessScore: sp.dataCompletenessScore,
    hasParcelBoundary: sp.hasParcelBoundary || boundary !== null,
    isBuiltin: sp.isBuiltin,
    createdAt: existing?.createdAt ?? sp.createdAt ?? now,
    updatedAt: sp.updatedAt ?? now,
    // Boundary is normalized to FeatureCollection above; ride alongside
    // the in-memory project so MapView and other consumers can render
    // immediately. We also persist to IndexedDB below so subsequent
    // reloads pick it up via `geodataCache` like a user-drawn boundary.
    parcelBoundaryGeojson: boundary,
    // Builtins ship with a hand-authored narrative — the public
    // /projects/builtins endpoint strips notes/visionStatement, so we
    // splice them in client-side. Non-builtin rows (none today via this
    // path, defence-in-depth) keep the previous null behaviour.
    ownerNotes: sp.isBuiltin ? BUILTIN_PROJECT_NARRATIVE.ownerNotes : null,
    zoningNotes: sp.isBuiltin ? BUILTIN_PROJECT_NARRATIVE.zoningNotes : null,
    accessNotes: sp.isBuiltin ? BUILTIN_PROJECT_NARRATIVE.accessNotes : null,
    waterRightsNotes: sp.isBuiltin ? BUILTIN_PROJECT_NARRATIVE.waterRightsNotes : null,
    visionStatement: sp.isBuiltin ? BUILTIN_PROJECT_NARRATIVE.visionStatement : null,
    units: 'metric',
    attachments: [],
    serverId: sp.id,
    // Preserve user-edited project metadata across the builtin re-seed
    // (designStatus, allowOrphanOutputs, designHorizonYears, zone
    // thresholds, etc.). Builtins API doesn't ship a metadata field, so
    // dropping the existing copy here would silently reset every
    // ProjectMetadata write on every reload.
    metadata: existing?.metadata,
  };
  });

  useProjectStore.setState((state) => {
    // Drop (a) any previous local copy keyed by serverId so server is
    // authoritative, and (b) the legacy hard-coded "351 House" seed that
    // earlier builds wrote on first run — it had no serverId and no
    // isBuiltin flag and would otherwise duplicate the builtin sample.
    const filtered = state.projects.filter((p) => {
      if (builtins.some((sp) => sp.id === p.serverId)) return false;
      if (!p.serverId && !p.isBuiltin && p.name === '351 House') return false;
      return true;
    });
    return { projects: [...filtered, ...incoming] };
  });

  // Hydrate the per-project observe stores (vision, hazards, sectors,
  // transects, soil samples, ecology, SWOT) so Stage 1 modules render
  // populated content, and persist the parcel boundary to IndexedDB so
  // map components on subsequent loads pick it up via `geodataCache`
  // — same path used for user-drawn boundaries. Both are idempotent.
  for (let i = 0; i < incoming.length; i++) {
    const lp = incoming[i];
    const sp = builtins[i];
    if (!lp || !sp) continue;
    if (lp.isBuiltin) seedBuiltinObserveData(lp.id);
    // Boundary persists via zustand persist (see partialize + ADDENDUM 6).
    // Stream Tier-1 layer summaries (climate, elevation, etc.) into
    // siteDataStore keyed by the local project id, so Stage 1 modules
    // and the diagnosis report read DB-canonical snake_case values
    // instead of a hand-coded fixture. Falls back to the offline
    // LOCAL_BUILTIN_FALLBACK_LAYERS when the API didn't ship `layers`.
    if (lp.isBuiltin) {
      const apiLayers = sp.layers && sp.layers.length > 0
        ? sp.layers
        : LOCAL_BUILTIN_FALLBACK_LAYERS;
      useSiteDataStore.setState((s) => ({
        dataByProject: {
          ...s.dataByProject,
          [lp.id]: {
            layers: apiLayers,
            isLive: false,
            liveCount: 0,
            fetchedAt: Date.now(),
            status: 'complete',
          },
        },
      }));
    }
  }
}

async function hydrateBuiltins(): Promise<void> {
  try {
    const res = await fetch('/api/v1/projects/builtins');
    if (!res.ok) {
      applyBuiltinsToStore([LOCAL_BUILTIN_FALLBACK]);
      return;
    }
    const envelope = (await res.json()) as {
      data: Array<{
        id: string;
        name: string;
        description: string | null;
        status: 'active' | 'archived' | 'shared' | 'candidate';
        projectType: string | null;
        country: string;
        provinceState: string | null;
        conservationAuthId: string | null;
        address: string | null;
        parcelId: string | null;
        acreage: number | null;
        dataCompletenessScore: number | null;
        hasParcelBoundary: boolean;
        isBuiltin: boolean;
        createdAt: string;
        updatedAt: string;
        parcelBoundaryGeojson?: GeoJSON.Geometry | GeoJSON.FeatureCollection | null;
        layers?: MockLayerResult[];
      }>;
    };
    applyBuiltinsToStore(envelope.data);
  } catch (err) {
    console.warn('[OGDEN] Failed to fetch builtin samples — using local fallback:', err);
    applyBuiltinsToStore([LOCAL_BUILTIN_FALLBACK]);
  }
}

// One-time legacy-data migrator: pre-ADDENDUM-6 builds stored boundary FCs
// in IndexedDB under `boundary:<projectId>`. Now that boundaries persist
// directly via zustand's localStorage, fold any pre-existing IDB blobs
// back into in-memory state for projects whose `parcelBoundaryGeojson`
// is null after rehydrate, then drop the legacy IDB entry. After this
// runs once successfully, no further IDB reads happen.
async function migrateLegacyIdbBoundaries(): Promise<void> {
  const { projects: hydratedProjects } = useProjectStore.getState();
  const restored = await Promise.all(
    hydratedProjects.map(async (hp) => {
      if (!hp.hasParcelBoundary || hp.parcelBoundaryGeojson) return null;
      try {
        const geo = await geodataCache.get<GeoJSON.FeatureCollection>(
          `boundary:${hp.id}`,
        );
        return geo ? { id: hp.id, geo } : null;
      } catch (err) {
        console.warn('[OGDEN] Legacy boundary IDB read failed:', err);
        return null;
      }
    }),
  );
  const hits = restored.filter(
    (r): r is { id: string; geo: GeoJSON.FeatureCollection } => r !== null,
  );
  if (hits.length === 0) return;
  useProjectStore.setState((state) => ({
    projects: state.projects.map((p) => {
      const hit = hits.find((h) => h.id === p.id);
      return hit ? { ...p, parcelBoundaryGeojson: hit.geo } : p;
    }),
  }));
}

// Hydrate from localStorage (Zustand v5 requires explicit rehydrate)
rehydrateWithLogging(useProjectStore);
// After rehydrate completes, run the one-time legacy IDB migrator. This
// is fire-and-forget; if the legacy entry exists it is folded into the
// next zustand persist cycle automatically when state changes.
void migrateLegacyIdbBoundaries();

// Expose store for console/testing access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenProjectStore = useProjectStore;
}

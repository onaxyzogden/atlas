/**
 * Project store — manages all projects client-side with localStorage persistence.
 * In Sprint 3+ this will sync with the API. For now, everything is local.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CreateProjectInput, ProjectMetadata } from '@ogden/shared';
import { cascadeDeleteProject } from './cascadeDelete.js';
import { cascadeCloneProject } from './cascadeClone.js';
import { geodataCache } from '../lib/geodataCache.js';
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
  deleteProject: (id: string) => void;
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
        // Builtin sample projects are read-only — silently no-op on writes.
        const target = get().projects.find((p) => p.id === id);
        if (target?.isBuiltin) return;
        // Persist large GeoJSON to IndexedDB if boundary is being updated
        if (updates.parcelBoundaryGeojson) {
          geodataCache.put(`boundary:${id}`, updates.parcelBoundaryGeojson).catch((err) => {
            console.warn('[OGDEN] Failed to cache boundary:', err);
          });
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
          ),
        }));
      },

      deleteProject: (id) => {
        // Builtin sample projects are read-only — silently no-op on delete.
        const target = get().projects.find((p) => p.id === id);
        if (target?.isBuiltin) return;
        cascadeDeleteProject(id);
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
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
    }),
    {
      name: 'ogden-projects',
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 3) {
          const projects = (state.projects ?? []) as Record<string, unknown>[];
          state.projects = projects.map((p) => ({
            ...p,
            visionStatement: (p as Record<string, unknown>).visionStatement ?? null,
          }));
        }
        return state;
      },
      // Strip large geospatial blobs from localStorage to prevent quota issues.
      // GeoJSON boundaries and parsed file data are cached in IndexedDB via geodataCache.
      partialize: (state) => ({
        projects: state.projects.map((p) => ({
          ...p,
          // Boundary GeoJSON is stored in IndexedDB under key "boundary:<projectId>"
          parcelBoundaryGeojson: null,
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
useProjectStore.persist.onFinishHydration(() => {
  void hydrateBuiltins();
});

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
  // Build the LocalProject list outside setState so we can re-use the
  // generated local ids when seeding the per-project observe stores.
  const incoming: LocalProject[] = builtins.map((sp) => {
    const boundary = asFeatureCollection(sp.parcelBoundaryGeojson);
    return {
    id: crypto.randomUUID(),
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
    createdAt: sp.createdAt ?? now,
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
    if (lp.parcelBoundaryGeojson) {
      geodataCache.put(`boundary:${lp.id}`, lp.parcelBoundaryGeojson).catch((err) => {
        console.warn('[OGDEN] Failed to cache builtin boundary:', err);
      });
    }
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

// Restore boundary GeoJSON from IndexedDB after hydration
useProjectStore.persist.onFinishHydration(() => {
  const { projects: hydratedProjects } = useProjectStore.getState();
  for (const hp of hydratedProjects) {
    if (hp.hasParcelBoundary && !hp.parcelBoundaryGeojson) {
      geodataCache.get<GeoJSON.FeatureCollection>(`boundary:${hp.id}`).then((geo) => {
        if (geo) {
          useProjectStore.setState((state) => ({
            projects: state.projects.map((proj) =>
              proj.id === hp.id ? { ...proj, parcelBoundaryGeojson: geo } : proj,
            ),
          }));
        }
      }).catch((err) => {
        console.warn('[OGDEN] Failed to restore boundary from IndexedDB:', err);
      });
    }
  }
});

// Hydrate from localStorage (Zustand v5 requires explicit rehydrate)
useProjectStore.persist.rehydrate();

// Expose store for console/testing access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenProjectStore = useProjectStore;
}

/**
 * Project store — manages all projects client-side with localStorage persistence.
 * In Sprint 3+ this will sync with the API. For now, everything is local.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CreateProjectInput } from '@ogden/shared';
import { cascadeDeleteProject } from './cascadeDelete.js';
import { geodataCache } from '../lib/geodataCache.js';

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
        };
        set((state) => ({
          projects: [...state.projects, project],
          activeProjectId: project.id,
        }));
        return project;
      },

      updateProject: (id, updates) => {
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
        cascadeDeleteProject(id);
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        }));
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

// Register seed callback BEFORE rehydrate so it fires when hydration completes
useProjectStore.persist.onFinishHydration(() => {
  const { projects, createProject, updateProject } = useProjectStore.getState();
  if (projects.length > 0) return; // Already has projects — don't overwrite

  // Skip seed if user is authenticated — initial sync will populate from server
  try {
    const token = localStorage.getItem('ogden-auth-token');
    if (token) return;
  } catch { /* localStorage unavailable — proceed with seed */ }

  const p = createProject({
    name: '351 House',
    description: 'Halton Hills homestead — regenerative land design for a 12-acre parcel on the Niagara Escarpment edge. Mixed Carolinian forest, agricultural fields, and seasonal creek.',
    address: '351 Glenashton Dr, Oakville, ON',
    projectType: 'homestead',
    country: 'CA',
    provinceState: 'ON',
    units: 'metric',
  });

  updateProject(p.id, {
    acreage: 12,
    ownerNotes: 'Family property since 2019. Previous use: cash crop (corn/soy rotation). Tile-drained. Remnant hedgerow on north boundary. Seasonal creek runs SW to NE through lower field.',
    zoningNotes: 'A (Agricultural) zone — Town of Halton Hills. Permitted: single dwelling, farm operation, home occupation. Conditional: B&B, agritourism, farm winery.',
    waterRightsNotes: 'Conservation Halton regulated area. No water-taking permit currently held. Seasonal creek is mapped watercourse — 30m development setback applies.',
    accessNotes: 'Single access from Glenashton Dr (municipal road). 150m gravel lane to building envelope. Second emergency access possible from north boundary.',
  });
});

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

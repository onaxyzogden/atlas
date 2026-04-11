/**
 * Portal store — public storytelling portal configuration per project.
 * Zustand persist (localStorage) + backend sync via api.portal.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/apiClient.js';

export interface StoryScene {
  id: string;
  title: string;
  narrative: string;
  mapCenter: [number, number];
  mapZoom: number;
  mapStyle: 'satellite' | 'terrain' | 'street';
  phaseFilter: string | null;
  highlightZones: string[];
}

export interface BeforeAfterPair {
  id: string;
  caption: string;
  beforeUrl: string; // data URL or external
  afterUrl: string;
}

export type DataMaskingLevel = 'full' | 'curated' | 'minimal';

export type PortalSection =
  | 'hero'
  | 'mission'
  | 'map'
  | 'stageReveal'
  | 'beforeAfter'
  | 'guidedTour'
  | 'narrative'
  | 'support'
  | 'education';

export interface PortalConfig {
  projectId: string;
  isPublished: boolean;
  slug: string;
  heroTitle: string;
  heroSubtitle: string;
  missionStatement: string;
  sections: PortalSection[];
  donationUrl: string | null;
  inquiryEmail: string | null;
  dataMaskingLevel: DataMaskingLevel;
  curatedHotspots: string[];
  brandColor: string;
  beforeAfterPairs: BeforeAfterPair[];
  storyScenes: StoryScene[];
  createdAt: string;
  updatedAt: string;
  /** Backend-assigned share token (set after first save) */
  shareToken?: string;
}

interface PortalState {
  configs: PortalConfig[];

  getConfig: (projectId: string) => PortalConfig | undefined;
  getBySlug: (slug: string) => PortalConfig | undefined;
  createConfig: (projectId: string, slug: string) => PortalConfig;
  updateConfig: (projectId: string, updates: Partial<PortalConfig>) => void;
  deleteConfig: (projectId: string) => void;
  addStoryScene: (projectId: string, scene: StoryScene) => void;
  removeStoryScene: (projectId: string, sceneId: string) => void;
  reorderSections: (projectId: string, sections: PortalSection[]) => void;

  // Backend sync
  saveToBackend: (projectId: string) => Promise<void>;
  loadFromBackend: (projectId: string) => Promise<void>;
  loadFromShareToken: (shareToken: string) => Promise<PortalConfig | null>;
}

const DEFAULT_SECTIONS: PortalSection[] = [
  'hero', 'mission', 'map', 'stageReveal', 'narrative', 'support',
];

// Debounce timer for backend saves
let saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function debouncedSave(projectId: string, saveFn: () => Promise<void>) {
  if (saveTimers[projectId]) clearTimeout(saveTimers[projectId]);
  saveTimers[projectId] = setTimeout(() => {
    saveFn().catch(() => { /* silent — localStorage is the fallback */ });
  }, 500);
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set, get) => ({
      configs: [],

      getConfig: (projectId) => get().configs.find((c) => c.projectId === projectId),

      getBySlug: (slug) => get().configs.find((c) => c.slug === slug && c.isPublished),

      createConfig: (projectId, slug) => {
        const config: PortalConfig = {
          projectId,
          isPublished: false,
          slug,
          heroTitle: '',
          heroSubtitle: '',
          missionStatement: '',
          sections: [...DEFAULT_SECTIONS],
          donationUrl: null,
          inquiryEmail: null,
          dataMaskingLevel: 'curated',
          curatedHotspots: [],
          brandColor: '#c4a265',
          beforeAfterPairs: [],
          storyScenes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ configs: [...s.configs, config] }));
        return config;
      },

      updateConfig: (projectId, updates) => {
        set((s) => ({
          configs: s.configs.map((c) =>
            c.projectId === projectId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
          ),
        }));
        // Debounced backend sync
        debouncedSave(projectId, () => get().saveToBackend(projectId));
      },

      deleteConfig: (projectId) =>
        set((s) => ({ configs: s.configs.filter((c) => c.projectId !== projectId) })),

      addStoryScene: (projectId, scene) => {
        set((s) => ({
          configs: s.configs.map((c) =>
            c.projectId === projectId
              ? { ...c, storyScenes: [...c.storyScenes, scene], updatedAt: new Date().toISOString() }
              : c,
          ),
        }));
        debouncedSave(projectId, () => get().saveToBackend(projectId));
      },

      removeStoryScene: (projectId, sceneId) => {
        set((s) => ({
          configs: s.configs.map((c) =>
            c.projectId === projectId
              ? { ...c, storyScenes: c.storyScenes.filter((sc) => sc.id !== sceneId), updatedAt: new Date().toISOString() }
              : c,
          ),
        }));
        debouncedSave(projectId, () => get().saveToBackend(projectId));
      },

      reorderSections: (projectId, sections) => {
        set((s) => ({
          configs: s.configs.map((c) =>
            c.projectId === projectId
              ? { ...c, sections, updatedAt: new Date().toISOString() }
              : c,
          ),
        }));
        debouncedSave(projectId, () => get().saveToBackend(projectId));
      },

      // ── Backend sync ────────────────────────────────────────────────────

      saveToBackend: async (projectId) => {
        const config = get().getConfig(projectId);
        if (!config) return;

        try {
          const { data } = await api.portal.save(projectId, {
            slug: config.slug,
            isPublished: config.isPublished,
            heroTitle: config.heroTitle,
            heroSubtitle: config.heroSubtitle,
            missionStatement: config.missionStatement,
            sections: config.sections,
            donationUrl: config.donationUrl,
            inquiryEmail: config.inquiryEmail,
            dataMaskingLevel: config.dataMaskingLevel,
            curatedHotspots: config.curatedHotspots,
            brandColor: config.brandColor,
            beforeAfterPairs: config.beforeAfterPairs,
            storyScenes: config.storyScenes,
          });
          // Update local config with backend-assigned shareToken
          if (data.shareToken) {
            set((s) => ({
              configs: s.configs.map((c) =>
                c.projectId === projectId ? { ...c, shareToken: data.shareToken } : c,
              ),
            }));
          }
        } catch {
          // Silent — localStorage is the fallback
        }
      },

      loadFromBackend: async (projectId) => {
        try {
          const { data } = await api.portal.get(projectId);
          const backendConfig = data.config as Record<string, unknown>;
          set((s) => ({
            configs: s.configs.map((c) =>
              c.projectId === projectId
                ? {
                    ...c,
                    ...backendConfig,
                    projectId,
                    shareToken: data.shareToken,
                    updatedAt: data.updatedAt,
                  }
                : c,
            ),
          }));
        } catch {
          // No backend config — use local only
        }
      },

      loadFromShareToken: async (shareToken) => {
        try {
          const { data } = await api.portal.getPublic(shareToken);
          const backendConfig = data.config as Record<string, unknown>;
          const config: PortalConfig = {
            projectId: data.projectId,
            isPublished: data.isPublished,
            shareToken: data.shareToken,
            slug: (backendConfig.slug as string) ?? '',
            heroTitle: (backendConfig.heroTitle as string) ?? '',
            heroSubtitle: (backendConfig.heroSubtitle as string) ?? '',
            missionStatement: (backendConfig.missionStatement as string) ?? '',
            sections: (backendConfig.sections as PortalSection[]) ?? [],
            donationUrl: (backendConfig.donationUrl as string | null) ?? null,
            inquiryEmail: (backendConfig.inquiryEmail as string | null) ?? null,
            dataMaskingLevel: (backendConfig.dataMaskingLevel as DataMaskingLevel) ?? 'curated',
            curatedHotspots: (backendConfig.curatedHotspots as string[]) ?? [],
            brandColor: (backendConfig.brandColor as string) ?? '#c4a265',
            beforeAfterPairs: (backendConfig.beforeAfterPairs as BeforeAfterPair[]) ?? [],
            storyScenes: (backendConfig.storyScenes as StoryScene[]) ?? [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          return config;
        } catch {
          return null;
        }
      },
    }),
    { name: 'ogden-portal', version: 1 },
  ),
);

// Hydrate from localStorage (Zustand v5)
usePortalStore.persist.rehydrate();

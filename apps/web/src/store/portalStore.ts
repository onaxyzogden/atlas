/**
 * Portal store — public storytelling portal configuration per project.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

const DEFAULT_SECTIONS: PortalSection[] = [
  'hero', 'mission', 'map', 'stageReveal', 'narrative', 'support',
];

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

      updateConfig: (projectId, updates) =>
        set((s) => ({
          configs: s.configs.map((c) =>
            c.projectId === projectId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
          ),
        })),

      deleteConfig: (projectId) =>
        set((s) => ({ configs: s.configs.filter((c) => c.projectId !== projectId) })),

      addStoryScene: (projectId, scene) =>
        set((s) => ({
          configs: s.configs.map((c) =>
            c.projectId === projectId
              ? { ...c, storyScenes: [...c.storyScenes, scene], updatedAt: new Date().toISOString() }
              : c,
          ),
        })),

      removeStoryScene: (projectId, sceneId) =>
        set((s) => ({
          configs: s.configs.map((c) =>
            c.projectId === projectId
              ? { ...c, storyScenes: c.storyScenes.filter((sc) => sc.id !== sceneId), updatedAt: new Date().toISOString() }
              : c,
          ),
        })),

      reorderSections: (projectId, sections) =>
        set((s) => ({
          configs: s.configs.map((c) =>
            c.projectId === projectId
              ? { ...c, sections, updatedAt: new Date().toISOString() }
              : c,
          ),
        })),
    }),
    { name: 'ogden-portal', version: 1 },
  ),
);

// Hydrate from localStorage (Zustand v5)
usePortalStore.persist.rehydrate();

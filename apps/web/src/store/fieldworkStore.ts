/**
 * Fieldwork store — advanced field data collection for site visits.
 * Soil samples, water/structure issues, measurements, walk routes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FieldworkType = 'soil_sample' | 'water_issue' | 'structure_issue' | 'measurement' | 'annotation' | 'observation' | 'question' | 'issue';
export type NoteType = 'observation' | 'question' | 'measurement' | 'issue';

export interface FieldworkEntry {
  id: string;
  projectId: string;
  type: FieldworkType;
  location: [number, number]; // [lng, lat]
  timestamp: string;
  data: Record<string, unknown>;
  notes: string;
  photos: string[]; // data URLs
  verified: boolean;
  audioDataUrl?: string;  // voice memo
  noteType?: NoteType;
}

export interface WalkRoute {
  id: string;
  projectId: string;
  name: string;
  coordinates: [number, number][]; // array of [lng, lat]
  timestamps: string[];
  annotations: { index: number; text: string }[];
  distanceM: number;
  durationMs: number;
  startedAt: string;
  completedAt: string | null;
}

export interface PunchListItem {
  id: string;
  projectId: string;
  featureType: 'zone' | 'structure' | 'paddock' | 'crop' | 'path' | 'utility';
  featureId: string;
  featureName: string;
  status: 'not_checked' | 'verified' | 'discrepancy';
  notes: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

interface FieldworkState {
  entries: FieldworkEntry[];
  walkRoutes: WalkRoute[];
  punchList: PunchListItem[];
  pendingUploads: string[];  // entry IDs waiting for sync

  addEntry: (entry: FieldworkEntry) => void;
  updateEntry: (id: string, updates: Partial<FieldworkEntry>) => void;
  deleteEntry: (id: string) => void;

  addWalkRoute: (route: WalkRoute) => void;
  updateWalkRoute: (id: string, updates: Partial<WalkRoute>) => void;
  deleteWalkRoute: (id: string) => void;

  addPunchListItem: (item: PunchListItem) => void;
  updatePunchListItem: (id: string, updates: Partial<PunchListItem>) => void;
  resetPunchList: (projectId: string) => void;

  addPendingUpload: (entryId: string) => void;
  removePendingUpload: (entryId: string) => void;
}

export const useFieldworkStore = create<FieldworkState>()(
  persist(
    (set) => ({
      entries: [],
      walkRoutes: [],
      punchList: [],
      pendingUploads: [],

      addEntry: (entry) => set((s) => ({ entries: [...s.entries, entry] })),
      updateEntry: (id, updates) =>
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)) })),
      deleteEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      addWalkRoute: (route) => set((s) => ({ walkRoutes: [...s.walkRoutes, route] })),
      updateWalkRoute: (id, updates) =>
        set((s) => ({ walkRoutes: s.walkRoutes.map((r) => (r.id === id ? { ...r, ...updates } : r)) })),
      deleteWalkRoute: (id) => set((s) => ({ walkRoutes: s.walkRoutes.filter((r) => r.id !== id) })),

      addPunchListItem: (item) => set((s) => ({ punchList: [...s.punchList, item] })),
      updatePunchListItem: (id, updates) =>
        set((s) => ({ punchList: s.punchList.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),
      resetPunchList: (projectId) =>
        set((s) => ({ punchList: s.punchList.filter((p) => p.projectId !== projectId) })),

      addPendingUpload: (entryId) => set((s) => ({
        pendingUploads: s.pendingUploads.includes(entryId) ? s.pendingUploads : [...s.pendingUploads, entryId],
      })),
      removePendingUpload: (entryId) => set((s) => ({
        pendingUploads: s.pendingUploads.filter((id) => id !== entryId),
      })),
    }),
    { name: 'ogden-fieldwork', version: 1 },
  ),
);

// Hydrate from localStorage (Zustand v5)
useFieldworkStore.persist.rehydrate();

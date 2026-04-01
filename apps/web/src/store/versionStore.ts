/**
 * Version store — manages auto-save and version snapshots.
 *
 * P1 features from Section 1:
 *   - Auto-save and version snapshots
 *   - Restore previous project state
 *
 * Each snapshot captures the full project state at a point in time.
 * Snapshots are created on significant changes (boundary set, notes updated, zone added).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocalProject } from './projectStore.js';

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  timestamp: string;
  label: string;
  data: LocalProject;
}

interface VersionState {
  snapshots: ProjectSnapshot[];
  maxSnapshots: number;

  createSnapshot: (project: LocalProject, label: string) => void;
  restoreSnapshot: (snapshotId: string) => LocalProject | null;
  getProjectSnapshots: (projectId: string) => ProjectSnapshot[];
  deleteSnapshot: (snapshotId: string) => void;
  pruneOldSnapshots: (projectId: string) => void;
}

export const useVersionStore = create<VersionState>()(
  persist(
    (set, get) => ({
      snapshots: [],
      maxSnapshots: 20,

      createSnapshot: (project, label) => {
        const snapshot: ProjectSnapshot = {
          id: crypto.randomUUID(),
          projectId: project.id,
          timestamp: new Date().toISOString(),
          label,
          data: { ...project },
        };

        set((s) => {
          const existing = s.snapshots.filter((sn) => sn.projectId === project.id);
          let all = [...s.snapshots, snapshot];

          // Prune to max per project
          if (existing.length >= s.maxSnapshots) {
            const oldest = existing[0]!;
            all = all.filter((sn) => sn.id !== oldest.id);
          }

          return { snapshots: all };
        });
      },

      restoreSnapshot: (snapshotId) => {
        const snap = get().snapshots.find((s) => s.id === snapshotId);
        return snap?.data ?? null;
      },

      getProjectSnapshots: (projectId) => {
        return get()
          .snapshots.filter((s) => s.projectId === projectId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      },

      deleteSnapshot: (snapshotId) =>
        set((s) => ({ snapshots: s.snapshots.filter((sn) => sn.id !== snapshotId) })),

      pruneOldSnapshots: (projectId) =>
        set((s) => {
          const projectSnaps = s.snapshots
            .filter((sn) => sn.projectId === projectId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          const keep = new Set(projectSnaps.slice(0, s.maxSnapshots).map((sn) => sn.id));
          return {
            snapshots: s.snapshots.filter((sn) => sn.projectId !== projectId || keep.has(sn.id)),
          };
        }),
    }),
    {
      name: 'ogden-versions',
      version: 1,
      // Limit storage size — strip large attachment data from snapshots
      partialize: (state) => ({
        snapshots: state.snapshots.map((s) => ({
          ...s,
          data: {
            ...s.data,
            attachments: s.data.attachments.map((a) => ({ ...a, data: null })),
            parcelBoundaryGeojson: s.data.parcelBoundaryGeojson, // Keep boundary
          },
        })),
      }),
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useVersionStore.persist.rehydrate();

/**
 * Ecological note store — point-based site annotations for permaculture
 * design intelligence (Plan toolbar Tier B / B5).
 *
 * Notes are lightweight markers stewards drop on the map to capture an
 * observation that doesn't fit into any of the spatial draw types. Each
 * note has a kind drawn from a small enum:
 *   - indicator-species  — wildlife or plant sighting (Conservation #6)
 *   - rest-point         — resting bench / waystation along a journey
 *                          (Educational Farm #4)
 *   - disturbed-ground   — already-impacted area suitable for new
 *                          construction (Conservation #4)
 *   - asset              — existing ecological asset worth ranking
 *                          (Conservation #1)
 *   - hazard             — site-specific risk warranting a marker
 *
 * Lives under `principle-verification` in the PLAN toolbar — flips the
 * cross-check chip from "non-spatial" to "spatial-when-present" for the
 * Holmgren / verification module by virtue of being the first map
 * artifact that module owns.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { temporal } from 'zundo';

export type EcologicalNoteKind =
  | 'indicator-species'
  | 'rest-point'
  | 'disturbed-ground'
  | 'asset'
  | 'hazard';

export interface EcologicalNote {
  id: string;
  projectId: string;
  name: string;
  kind: EcologicalNoteKind;
  geometry: GeoJSON.Point;
  /** Hex colour — defaults to the kind's palette entry but can be overridden. */
  color: string;
  notes: string;
  /** Build-phase id from `phaseStore`. Optional — undefined = unassigned. */
  phase?: string;
  /** Multi-Enterprise tag. Optional — undefined = unassigned. */
  enterprise?: string;
  createdAt: string;
  updatedAt: string;
}

export const NOTE_KIND_CONFIG: Record<
  EcologicalNoteKind,
  { label: string; color: string }
> = {
  'indicator-species': { label: 'Indicator species', color: '#5dd39e' },
  'rest-point':        { label: 'Rest point',        color: '#d4a25a' },
  'disturbed-ground':  { label: 'Disturbed ground',  color: '#a06b48' },
  asset:               { label: 'Asset',             color: '#e6c34a' },
  hazard:              { label: 'Hazard',            color: '#c0463a' },
};

interface EcologicalNoteState {
  notes: EcologicalNote[];

  addNote: (note: EcologicalNote) => void;
  updateNote: (id: string, patch: Partial<EcologicalNote>) => void;
  deleteNote: (id: string) => void;
}

export const useEcologicalNoteStore = create<EcologicalNoteState>()(
  persist(
    temporal(
      (set) => ({
        notes: [],

        addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),

        updateNote: (id, patch) =>
          set((s) => ({
            notes: s.notes.map((n) =>
              n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
            ),
          })),

        deleteNote: (id) =>
          set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      }),
      { limit: 200 },
    ),
    { name: 'ogden-ecological-notes', version: 1, migrate: (persisted) => persisted as never },
  ),
);

rehydrateWithLogging(useEcologicalNoteStore);

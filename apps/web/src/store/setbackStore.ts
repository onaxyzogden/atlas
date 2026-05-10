/**
 * Setback / buffer-ring store — outward polygon offsets around existing
 * Plan features (Plan toolbar Tier B / B2).
 *
 * Stewards drop a ring to express "X metres of clearance around <thing>"
 * — e.g., a 30 m fire setback around a structure, a 5 m biosecurity ring
 * around a paddock (Educational Farm "double fencing"), a 50 m noise
 * buffer around a workshop, a 15 m windbreak setback along a property
 * line. Lives under `zone-circulation` in the PLAN toolbar (rings are
 * "where the steward chooses NOT to put things," matching how zone /
 * circulation logic governs adjacency).
 *
 * Surfaces in:
 *   - Educational Farm #3 (animal interaction with double fencing + handwash)
 *   - Multi-Enterprise #3 (buffer noise / odour / visitor enterprises)
 *
 * The buffer is materialised as a static `geometry` polygon at create
 * time. If the source feature later moves, the ring does NOT
 * auto-recompute — recomputing from a live source would couple every
 * draw store to this one (creates ambiguity if the source is deleted).
 * Stewards re-create the ring instead, which mirrors how survey markers
 * work in the field.
 *
 * `sourceKind` and `sourceId` are kept as a soft pointer for future
 * "show me what this ring is offset from" affordances; they are not
 * load-bearing for rendering.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

export type SetbackPurpose =
  | 'noise'
  | 'odour'
  | 'fire'
  | 'biosecurity'
  | 'visual'
  | 'general';

export type SetbackSourceKind =
  | 'zone'
  | 'crop'
  | 'paddock'
  | 'structure'
  | 'path'
  | 'utility';

export interface SetbackRing {
  id: string;
  projectId: string;
  name: string;
  sourceKind: SetbackSourceKind;
  sourceId: string;
  /** Outward offset distance in metres. Stored positive. */
  distanceM: number;
  purpose: SetbackPurpose;
  /** Materialised offset polygon (or multipolygon when the source has holes). */
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  /** Hex colour — defaults to the purpose palette entry. */
  color: string;
  notes: string;
  phase?: string;
  enterprise?: string;
  createdAt: string;
  updatedAt: string;
}

export const SETBACK_PURPOSE_CONFIG: Record<
  SetbackPurpose,
  { label: string; color: string }
> = {
  noise:       { label: 'Noise',       color: '#a85a3a' },
  odour:       { label: 'Odour',       color: '#8a6a3a' },
  fire:        { label: 'Fire',        color: '#c0463a' },
  biosecurity: { label: 'Biosecurity', color: '#5dd39e' },
  visual:      { label: 'Visual',      color: '#7a6e8c' },
  general:     { label: 'General',     color: '#9a8070' },
};

interface SetbackState {
  rings: SetbackRing[];

  addRing: (ring: SetbackRing) => void;
  updateRing: (id: string, patch: Partial<SetbackRing>) => void;
  deleteRing: (id: string) => void;
}

export const useSetbackStore = create<SetbackState>()(
  persist(
    temporal(
      (set) => ({
        rings: [],

        addRing: (ring) => set((s) => ({ rings: [...s.rings, ring] })),

        updateRing: (id, patch) =>
          set((s) => ({
            rings: s.rings.map((r) =>
              r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r,
            ),
          })),

        deleteRing: (id) => set((s) => ({ rings: s.rings.filter((r) => r.id !== id) })),
      }),
      { limit: 200 },
    ),
    { name: 'ogden-setback-rings', version: 1 },
  ),
);

useSetbackStore.persist.rehydrate();

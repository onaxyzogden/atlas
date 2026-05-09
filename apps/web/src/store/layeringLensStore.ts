/**
 * layeringLensStore — Plan Module 1 (Dynamic Layering) overlay lens.
 *
 * Toggles a colour cast over the `plan-data-*` MapLibre sources.
 *
 * Two modes:
 *   - `yeomans` (default) — every persisted Plan feature is recoloured by
 *     the Yeomans rank it belongs to (rank 3 Water, rank 4 Access —
 *     paths + zones, rank 7 Soil — fertility infra, rank 8 Vegetation —
 *     crops, rank 9 Animals — paddocks). The map-first interpretation of
 *     the Permanence Ladder: the steward can see at-a-glance whether
 *     ranks were authored in the canonical Yeomans order.
 *   - `enterprise` — features are recoloured by the enterprise tag they
 *     carry (one colour per enterprise from `enterpriseStore`). Untagged
 *     features fall back to a neutral grey. Surfaces the multi-enterprise
 *     project type's #1 prompt: "which enterprise does each feature
 *     belong to?" — the answer becomes visually obvious.
 *
 * When `enabled` is false, features keep their per-type fill colours
 * (Water hue / per-zone / per-crop-type etc.) drawn from each tool's
 * palette.
 *
 * Single-instance, persisted so the lens state survives reload.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LayeringLensMode = 'yeomans' | 'enterprise';

interface LayeringLensState {
  enabled: boolean;
  mode: LayeringLensMode;
  toggle: () => void;
  set: (next: boolean) => void;
  setMode: (mode: LayeringLensMode) => void;
}

export const useLayeringLensStore = create<LayeringLensState>()(
  persist(
    (set) => ({
      enabled: false,
      mode: 'yeomans',
      toggle: () => set((s) => ({ enabled: !s.enabled })),
      set: (next) => set({ enabled: next }),
      setMode: (mode) => set({ mode }),
    }),
    { name: 'atlas.v3.plan.layeringLens' },
  ),
);

/**
 * Yeomans rank palette. Cool greys for the unimposed envelope (1, 2),
 * blue for water (3), warm earth for the human-imposed layers
 * (4 Access, 5 Structures, 6 Subsystems), brown for soil (7), green
 * for vegetation (8), amber for fauna (9). 9 ranks → 9 colours.
 */
export const RANK_COLOR: Record<number, string> = {
  1: '#6a7280', // Climate
  2: '#8a8270', // Landform
  3: '#3a8fb7', // Water
  4: '#b07c4a', // Access
  5: '#a06b48', // Structures
  6: '#8a6a3a', // Subsystems
  7: '#6a4a28', // Soil
  8: '#3d8a3d', // Vegetation
  9: '#d4a25a', // Fauna
};

export const RANK_LABEL: Record<number, string> = {
  1: 'Climate',
  2: 'Landform',
  3: 'Water',
  4: 'Access',
  5: 'Structures',
  6: 'Subsystems',
  7: 'Soil',
  8: 'Vegetation',
  9: 'Fauna',
};

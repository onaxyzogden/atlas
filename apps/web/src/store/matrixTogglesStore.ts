/**
 * matrixTogglesStore — three boolean overlays (Topography / Sectors / Zones)
 * surfaced via the V3LifecycleSidebar footer "Matrix Toggles" P0 utility.
 *
 * Persistence: localStorage. The toggles are pure UI state — no server sync,
 * no per-project scoping yet (defer until a real overlay layer consumes them).
 *
 * Naming follows the Permaculture Scholar dialogue
 * (wiki/concepts/atlas-sidebar-permaculture.md, 2026-04-28): the three
 * "matrix" overlays correspond to Permaculture Decision-Making Matrix axes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MatrixTogglesState {
  topography: boolean;
  sectors: boolean;
  zones: boolean;
  toggle: (key: 'topography' | 'sectors' | 'zones') => void;
  setAll: (value: boolean) => void;
}

export const useMatrixTogglesStore = create<MatrixTogglesState>()(
  persist(
    (set) => ({
      topography: false,
      sectors: false,
      zones: false,
      toggle: (key) => set((s) => ({ ...s, [key]: !s[key] })),
      setAll: (value) =>
        set(() => ({ topography: value, sectors: value, zones: value })),
    }),
    {
      name: 'ogden-atlas-matrix-toggles',
      // v3 (2026-04-28): Sectors are now data-backed (suncalc solar arcs).
      // Zones still has no data layer — keep zones force-cleared.
      // v1 → v3: clear both. v2 → v3: clear zones (sectors already false).
      version: 3,
      migrate: (persisted) => {
        const s = (persisted ?? {}) as Partial<MatrixTogglesState>;
        return {
          ...s,
          zones: false,
        } as MatrixTogglesState;
      },
    },
  ),
);

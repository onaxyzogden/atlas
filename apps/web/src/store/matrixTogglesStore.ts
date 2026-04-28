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
      // v4 (2026-04-28): Zones overlay is now data-backed (concentric
      // use-frequency rings). All three toggles are live; the migrate
      // is a no-op pass-through — earlier versions force-cleared zones,
      // which remains a sensible default on upgrade.
      version: 4,
      migrate: (persisted) => persisted as MatrixTogglesState,
    },
  ),
);

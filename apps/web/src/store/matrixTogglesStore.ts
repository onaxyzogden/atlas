/**
 * matrixTogglesStore — four boolean overlays (Topography / Sectors / Zones /
 * Wind) surfaced via the V3LifecycleSidebar footer "Matrix Toggles" P0 utility.
 *
 * Persistence: localStorage. The toggles are pure UI state — no server sync,
 * no per-project scoping yet (defer until a real overlay layer consumes them).
 *
 * Naming follows the Permaculture Scholar dialogue
 * (wiki/concepts/atlas-sidebar-permaculture.md, 2026-04-28): the matrix
 * overlays correspond to Permaculture Decision-Making Matrix axes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MatrixToggleKey = 'topography' | 'sectors' | 'zones' | 'wind';

export interface MatrixTogglesState {
  topography: boolean;
  sectors: boolean;
  zones: boolean;
  wind: boolean;
  toggle: (key: MatrixToggleKey) => void;
  setAll: (value: boolean) => void;
}

export const useMatrixTogglesStore = create<MatrixTogglesState>()(
  persist(
    (set) => ({
      topography: false,
      sectors: false,
      zones: false,
      wind: false,
      toggle: (key) => set((s) => ({ ...s, [key]: !s[key] })),
      setAll: (value) =>
        set(() => ({ topography: value, sectors: value, zones: value, wind: value })),
    }),
    {
      name: 'ogden-atlas-matrix-toggles',
      // v5 (2026-04-28): added wind-prevailing rose toggle. Migrate fills
      // `wind: false` for any v4 persisted state so existing users don't
      // inherit a noisy fourth overlay on first load.
      version: 5,
      migrate: (persisted) => {
        const prev = (persisted ?? {}) as Partial<MatrixTogglesState>;
        return {
          topography: prev.topography ?? false,
          sectors: prev.sectors ?? false,
          zones: prev.zones ?? false,
          wind: prev.wind ?? false,
        } as MatrixTogglesState;
      },
    },
  ),
);

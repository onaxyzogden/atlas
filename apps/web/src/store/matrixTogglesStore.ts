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

export type MatrixToggleKey =
  | 'topography'
  | 'sectors'
  | 'zones'
  | 'wind'
  | 'water'
  | 'hazards'
  | 'views'
  | 'builtEnvironment'
  | 'observeAnnotations'
  | 'sunPath'
  | 'zoneRings';

export interface MatrixTogglesState {
  topography: boolean;
  sectors: boolean;
  zones: boolean;
  wind: boolean;
  water: boolean;
  /** Hazard sectors (fire / noise / wildlife). Split out of `sectors` in v8. */
  hazards: boolean;
  /** Sightline / view sectors. Split out of `sectors` in v8. */
  views: boolean;
  /** Built-environment annotations (buildings, utilities, fences). v9. */
  builtEnvironment: boolean;
  /** OBSERVE annotations master toggle (default on). */
  observeAnnotations: boolean;
  /**
   * PLAN Tier C / C1 — date-driven sun-path overlay (azimuth arcs at
   * solstices + equinox, current-day sun position). Defaults off.
   */
  sunPath: boolean;
  /**
   * PLAN Tier C / C5 — Z-distance ring overlay (30 m / 100 m / 500 m
   * concentric rings around any zone with `permacultureZone === 0`,
   * giving a quick visual on Z1/Z2/Z3 reach). Defaults off.
   */
  zoneRings: boolean;
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
      water: false,
      hazards: false,
      views: false,
      builtEnvironment: false,
      observeAnnotations: true,
      sunPath: false,
      zoneRings: false,
      toggle: (key) => set((s) => ({ ...s, [key]: !s[key] })),
      setAll: (value) =>
        set(() => ({
          topography: value,
          sectors: value,
          zones: value,
          wind: value,
          water: value,
          hazards: value,
          views: value,
          builtEnvironment: value,
          observeAnnotations: value,
          sunPath: value,
          zoneRings: value,
        })),
    }),
    {
      name: 'ogden-atlas-matrix-toggles',
      // v10 (2026-05-09): added Tier C PLAN-stage overlays (sunPath, zoneRings).
      // Both default off so existing stewards don't inherit unfamiliar layers.
      // v9 (2026-05-08): added builtEnvironment toggle for the new
      // Built Environment OBSERVE module (buildings, utilities, fences,
      // gates, driveways, wells, septic). Defaults off.
      // v8 (2026-05-08): split the legacy single `sectors` toggle into four
      // groups (Solar / Wind / Hazard / View). `sectors` keeps its name as
      // the solar sub-toggle for back-compat; new keys `hazards` + `views`
      // default to off.
      // v7 (2026-05-06): added observeAnnotations master toggle (default on)
      // for the OBSERVE-stage annotation layers shipped this session.
      // v6 (2026-04-28): added water (streams + surface water) toggle.
      // v5 added wind-prevailing rose. Migrate seeds default for any
      // missing key so existing users don't inherit unfamiliar overlays.
      version: 10,
      migrate: (persisted) => {
        const prev = (persisted ?? {}) as Partial<MatrixTogglesState>;
        return {
          topography: prev.topography ?? false,
          sectors: prev.sectors ?? false,
          zones: prev.zones ?? false,
          wind: prev.wind ?? false,
          water: prev.water ?? false,
          hazards: prev.hazards ?? false,
          views: prev.views ?? false,
          builtEnvironment: prev.builtEnvironment ?? false,
          observeAnnotations: prev.observeAnnotations ?? true,
          sunPath: prev.sunPath ?? false,
          zoneRings: prev.zoneRings ?? false,
        } as MatrixTogglesState;
      },
    },
  ),
);

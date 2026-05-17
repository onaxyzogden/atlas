/**
 * matrixTogglesStore — boolean visibility switches for the map-overlay layers
 * (solar/wind/hazard/view sectors, zones, water, topography, built environment,
 * observe annotations, sun path, design audit rings, scheduled moves).
 *
 * Surfaced via the BaseMapCard "Overlays" legend — the canonical control,
 * mounted on every Observe / Plan / Act map view. Each key is consumed by the
 * matching overlay layer component, which gates its own visibility on it.
 *
 * Persistence: localStorage. Pure UI state — no server sync, not per-project
 * scoped (a global view preference, not project data; intentionally excluded
 * from the project bundle).
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
  | 'zoneRings'
  | 'seededZones'
  | 'scheduledMoves';

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
  /**
   * PLAN — visibility of generator-seeded ("ring-seed") provisional zones
   * (fill + solid/dashed outline + label) on the shared plan-data layers.
   * Defaults ON so existing stewards keep the current always-visible behavior.
   */
  seededZones: boolean;
  /**
   * PLAN cross-stage surfacing — renders ACT-stage unfulfilled scheduled
   * livestock moves on the Plan-stage map as centroid badges over the
   * destination paddock or structure. Read-only: editing the plan
   * still happens on the Act-stage Rotation Schedule card. Defaults off.
   */
  scheduledMoves: boolean;
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
      seededZones: true,
      scheduledMoves: false,
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
          seededZones: value,
          scheduledMoves: value,
        })),
    }),
    {
      name: 'ogden-atlas-matrix-toggles',
      // v12 (2026-05-17): added seededZones — show/hide for generator-seeded
      //  ("ring-seed") provisional zones on the Plan map. Defaults ON
      //  (unlike the off-by-default overlays) so existing stewards keep the
      //  prior always-visible behavior; no regression.
      // v11 (2026-05-11): added cross-stage Plan-map overlay
      //  (scheduledMoves — surfaces ACT-stage unfulfilled scheduled
      //  livestock moves on the Plan-stage map). Defaults off so
      //  existing stewards don't inherit an unfamiliar layer.
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
      version: 12,
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
          seededZones: prev.seededZones ?? true,
          scheduledMoves: prev.scheduledMoves ?? false,
        } as MatrixTogglesState;
      },
    },
  ),
);

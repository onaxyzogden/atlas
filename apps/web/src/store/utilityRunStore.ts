/**
 * Utility-run store — line-strings representing shared infrastructure
 * runs across the parcel (Plan toolbar Tier B / B1).
 *
 * Stewards drop a run when they want to place a literal pipe / cable /
 * trench between features — e.g., a single trench from cabin cluster to
 * septic field, a power feed from the inverter shed to the barn, a
 * coax/fibre data drop to a teaching pavilion. Lives under
 * `structures-subsystems` in the PLAN toolbar.
 *
 * Surfaces in:
 *   - Retreat Center #4 (cluster accommodations on shared utilities)
 *   - Educational Farm #5 (classroom / barn / restroom shared utility trench)
 *   - Multi-Enterprise #2 (shared infrastructure — water / power / processing)
 *
 * Kinds intentionally minimal for v1 — water / septic / power / data —
 * matched to the four most commonly-shared trench occupants on a small
 * permaculture parcel. New kinds (gas, irrigation-mainline, IT-only) can
 * be added without a schema bump.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import { temporal } from 'zundo';
import type { PlacementAcknowledgment } from '@ogden/shared/placementRules';

export type UtilityRunKind = 'water' | 'septic' | 'power' | 'data';

export interface UtilityRun {
  id: string;
  projectId: string;
  name: string;
  kind: UtilityRunKind;
  /** Hex colour — defaults to the kind's palette entry. */
  color: string;
  geometry: GeoJSON.LineString;
  /** Length in metres derived from the geometry at draw time. */
  lengthM: number;
  notes: string;
  /** Build-phase id from `phaseStore`. Optional; undefined = unassigned. */
  phase?: string;
  /** Multi-Enterprise tag from `enterpriseStore`. Optional. */
  enterprise?: string;
  /** Draw-time placement-gate acknowledgments (warn-severity, steward-confirmed). */
  placementAcknowledgments?: PlacementAcknowledgment[];
  createdAt: string;
  updatedAt: string;
}

export const UTILITY_RUN_CONFIG: Record<
  UtilityRunKind,
  { label: string; color: string; dashArray: number[]; width: number }
> = {
  water:  { label: 'Water',  color: '#4a90d9', dashArray: [],     width: 2.5 },
  septic: { label: 'Septic', color: '#7a6e54', dashArray: [6, 3], width: 2.5 },
  power:  { label: 'Power',  color: '#e6b34a', dashArray: [4, 2], width: 2.5 },
  data:   { label: 'Data',   color: '#5abccc', dashArray: [2, 2], width: 2 },
};

interface UtilityRunState {
  runs: UtilityRun[];

  addRun: (run: UtilityRun) => void;
  updateRun: (id: string, patch: Partial<UtilityRun>) => void;
  deleteRun: (id: string) => void;
}

export const useUtilityRunStore = create<UtilityRunState>()(
  persist(
    temporal(
      (set) => ({
        runs: [],

        addRun: (run) => set((s) => ({ runs: [...s.runs, run] })),

        updateRun: (id, patch) =>
          set((s) => ({
            runs: s.runs.map((r) =>
              r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r,
            ),
          })),

        deleteRun: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),
      }),
      { limit: 200 },
    ),
    { name: 'ogden-utility-runs', storage: idbPersistStorage, version: 1, migrate: (persisted) => persisted as never },
  ),
);

rehydrateWithLogging(useUtilityRunStore);
